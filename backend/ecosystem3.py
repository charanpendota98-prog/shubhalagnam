"""
Mana Vivaha — Ecosystem 3.0 Core Services
=========================================
Production-grade state & domain logic for:
  1. Indian/NRI Salary Bounds Parser (`parse_salary_bounds_inr`)
  2. Multi-Badge Independent Verification (`selfie`, `photo`, `government_id`, `education`, `employment`)
  3. Moderation Appeals Workflow (`submit_appeal`, `resolve_appeal`)
  4. Private Photo Access Requests & Expiring Signed Photo Tokens (`request_photo_access`, `create_signed_photo_token`)
  5. Bucketed FIFO Credit Ledger & Printable Payment Receipts (`grant_credit_bucket`, `consume_credit_fifo`)
  6. Family Collaboration System (`invite_family_member`, `accept_family_invite`, `suggest_match`)
  7. Support Tickets, Structured Vendor Quotes & Verified-Only Vendor Reviews
  8. DPDP Self-Service Member Data Export (`build_member_data_export`)

Persistence:
  Stored atomically inside `MANA_VIVAHA_STATE_DIR/ecosystem3_state.json`, which is
  inside the durable production volume (`/var/lib/manavivaha/state`) and automatically
  included in `backup39` state archives and isolated test roots.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import re
import secrets
import threading
import time
from datetime import datetime, timedelta
from typing import Any, Dict, Iterable, List, Optional, Set, Tuple

from atomic_store import atomic_json_dump
from hardening import clean, sign_token

_LOCK = threading.RLock()


def _resolve_state_file() -> str:
    explicit = os.getenv("MANA_VIVAHA_ECOSYSTEM_FILE", "").strip()
    if explicit:
        return os.path.abspath(explicit)
    state_dir = os.getenv("MANA_VIVAHA_STATE_DIR", "").strip()
    if state_dir:
        return os.path.abspath(os.path.join(state_dir, "ecosystem3_state.json"))
    return os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "ecosystem3_state.json"))


STATE_FILE = _resolve_state_file()

_DEFAULT_STATE: Dict[str, Any] = {
    "version": 1,
    "verification_records": [],
    "moderation_appeals": [],
    "photo_access_grants": [],
    "credit_buckets": {},      # tsap_id -> list of buckets
    "credit_events": [],       # append-only ledger rows (bounded to recent 25k)
    "family_invites": [],
    "family_collaborators": [],
    "family_suggestions": [],
    "family_activity": [],
    "support_tickets": [],
    "vendor_quotes": [],
    "vendor_reviews": [],
}

_LOADED_PATH: Optional[str] = None
_STATE: Dict[str, Any] = json.loads(json.dumps(_DEFAULT_STATE))


def _utc_iso(dt: Optional[datetime] = None) -> str:
    return (dt or datetime.utcnow()).replace(microsecond=0).isoformat()


def _parse_iso(value: Any) -> Optional[datetime]:
    if not value:
        return None
    if isinstance(value, datetime):
        return value
    raw = str(value).strip()
    if not raw:
        return None
    try:
        return datetime.fromisoformat(raw[:19])
    except Exception:
        return None


def _ensure_loaded() -> Dict[str, Any]:
    global STATE_FILE, _LOADED_PATH, _STATE
    current_path = _resolve_state_file()
    with _LOCK:
        STATE_FILE = current_path
        if _LOADED_PATH != current_path:
            fresh = json.loads(json.dumps(_DEFAULT_STATE))
            if os.path.exists(current_path):
                try:
                    with open(current_path, "r", encoding="utf-8") as handle:
                        loaded = json.load(handle)
                    if isinstance(loaded, dict):
                        for key, default_val in _DEFAULT_STATE.items():
                            if key in loaded and type(loaded[key]) is type(default_val):
                                fresh[key] = loaded[key]
                except Exception:
                    pass
            _STATE = fresh
            _LOADED_PATH = current_path
        return _STATE


def save_state() -> bool:
    with _LOCK:
        state = _ensure_loaded()
        state["updated_at"] = _utc_iso()
        if len(state["credit_events"]) > 25000:
            state["credit_events"] = state["credit_events"][-25000:]
        if len(state["family_activity"]) > 10000:
            state["family_activity"] = state["family_activity"][-10000:]
        try:
            atomic_json_dump(STATE_FILE, state, indent=2)
            return True
        except Exception:
            return False


# ============================================================================
# 1. ACCURATE SALARY PARSER (INR ANNUALIZED BOUNDS)
# ============================================================================
_NON_EARNING_TERMS = (
    "not working", "unemployed", "homemaker", "housewife", "student",
    "no income", "nil", "none", "n/a", "ఉద్యోగం లేదు", "గృహిణి",
)
_NUM_TOKEN_RE = re.compile(r"(\d+(?:\.\d+)?)")


def parse_salary_bounds_inr(raw_value: Any) -> Tuple[int, int]:
    """Parse Indian & NRI salary strings into annualized `(min_inr, max_inr)`.

    Examples:
      - "₹8 - 12 Lakhs / year" -> (800000, 1200000)
      - "₹6.5 Lakhs" / "6.5 LPA" -> (650000, 650000)
      - "₹1.2 Crore" -> (12000000, 12000000)
      - "₹50,000 / month" -> (600000, 600000)
      - "₹12,00,000" -> (1200000, 1200000)
      - "Below 3 Lakhs" -> (0, 300000)
      - "" / "—" / "Not working" -> (0, 0)
    """
    if raw_value is None:
        return (0, 0)
    if isinstance(raw_value, (int, float)):
        val = max(0, int(round(float(raw_value))))
        return (val, val)

    text = str(raw_value).strip().lower()
    if not text or text in {"-", "—", "na"}:
        return (0, 0)
    if any(term in text for term in _NON_EARNING_TERMS):
        return (0, 0)

    # Remove Indian/Western thousand commas inside numbers ("12,00,000" -> "1200000", "50,000" -> "50000")
    normalized = re.sub(r"(?<=\d),(?=\d)", "", text)
    normalized = normalized.replace("–", "-").replace("—", "-").replace(" to ", " - ")

    # Detect monthly vs annual multiplier
    is_monthly = any(tok in normalized for tok in (
        "/month", "/ month", "per month", "p.m", " pm", "/mo", "నెలకు", "monthly",
    ))

    # Unit detection
    has_crore = bool(re.search(r"\b(crores?|crs?|cr)\b|కోట్ల|కోటి", normalized))
    has_lakh = bool(re.search(r"\b(lakhs?|lacs?|lpa|lk)\b|(?<=\d)\s*l\b|లక్ష", normalized))
    has_thousand = bool(re.search(r"(?<=\d)\s*k\b|\bthousands?\b|వేలు", normalized))

    numbers = [float(m.group(1)) for m in _NUM_TOKEN_RE.finditer(normalized)]
    if not numbers:
        return (0, 0)

    def _scale(num: float) -> int:
        if has_crore:
            base = num * 10_000_000.0
        elif has_lakh:
            base = num * 100_000.0
        elif has_thousand:
            base = num * 1_000.0
        elif num < 100 and not is_monthly:
            # Bare small numbers in Indian matrimony salary fields (e.g. "12" or "8 - 12") denote Lakhs
            base = num * 100_000.0
        else:
            base = num
        if is_monthly:
            base *= 12.0
        return max(0, int(round(base)))

    is_below = any(tok in normalized for tok in ("below", "under", "upto", "up to", "less than", "<"))
    if len(numbers) == 1:
        amt = _scale(numbers[0])
        if is_below:
            return (0, amt)
        return (amt, amt)

    lo = _scale(numbers[0])
    hi = _scale(numbers[1])
    if lo > hi:
        lo, hi = hi, lo
    return (lo, hi)


# ============================================================================
# 2. MULTI-BADGE INDEPENDENT VERIFICATION
# ============================================================================
BADGE_CATALOG: Dict[str, Dict[str, str]] = {
    "selfie": {
        "en": "Live Selfie Reviewed",
        "te": "సెల్ఫీ సమీక్ష పూర్తయింది",
        "scope_en": "Staff compared a member-submitted selfie against profile photos.",
        "scope_te": "సభ్యుడు పంపిన సెల్ఫీని ప్రొఫైల్ ఫోటోతో బృందం సరిపోల్చింది.",
    },
    "photo": {
        "en": "Profile Photo Approved",
        "te": "ప్రొఫైల్ ఫోటో ఆమోదించబడింది",
        "scope_en": "Profile photo passed manual moderation checks.",
        "scope_te": "ప్రొఫైల్ ఫోటో మాన్యువల్ సమీక్షలో ఆమోదించబడింది.",
    },
    "government_id": {
        "en": "Government ID Reviewed",
        "te": "ప్రభుత్వ ID సమీక్షించబడింది",
        "scope_en": "Staff reviewed a masked government ID document; ID numbers are not stored in plaintext.",
        "scope_te": "మాస్క్ చేసిన ప్రభుత్వ ID పత్రాన్ని బృందం సమీక్షించింది; ID నంబర్లు నిల్వ చేయబడవు.",
    },
    "education": {
        "en": "Education Credential Reviewed",
        "te": "విద్యా అర్హత పత్రం సమీక్షించబడింది",
        "scope_en": "Staff inspected a member-submitted degree/certificate summary.",
        "scope_te": "సభ్యుడు సమర్పించిన విద్యా అర్హత వివరాలను బృందం పరిశీలించింది.",
    },
    "employment": {
        "en": "Profession / Employment Reviewed",
        "te": "ఉద్యోగ / వృత్తి వివరాలు సమీక్షించబడ్డాయి",
        "scope_en": "Staff inspected employment/business proof submitted by the member.",
        "scope_te": "సభ్యుడు సమర్పించిన ఉద్యోగ/వ్యాపార ఆధారాలను బృందం పరిశీలించింది.",
    },
    "phone": {
        "en": "Phone Access Confirmed",
        "te": "ఫోన్ నంబర్ ధృవీకరించబడింది",
        "scope_en": "Phone number access was confirmed on this account.",
        "scope_te": "ఈ ఖాతాలో ఫోన్ నంబర్ యాక్సెస్ ధృవీకరించబడింది.",
    },
}

_SENSITIVE_ID_DIGITS_RE = re.compile(r"\b\d{8,16}\b")


def _redact_id_numbers(text: str) -> str:
    """Ensure full Aadhaar/PAN/ID numbers are never persisted in notes."""
    cleaned = clean(text, 240, "verification_note")
    cleaned = _SENSITIVE_ID_DIGITS_RE.sub(lambda m: ("X" * max(4, len(m.group(0)) - 4)) + m.group(0)[-4:], cleaned)
    cleaned = re.sub(r"\b[A-Z]{5}\d{4}[A-Z]\b", "XXXXX0000X", cleaned, flags=re.IGNORECASE)
    return cleaned


def submit_verification_evidence(
    user: Dict[str, Any], badge_type: str, summary: str = "", document_type: str = "",
) -> Tuple[bool, str, Dict[str, Any]]:
    btype = str(badge_type or "").strip().lower()
    if btype not in ("selfie", "government_id", "education", "employment"):
        return False, "badge_type must be selfie | government_id | education | employment", {}
    tid = str((user or {}).get("tsap_id") or "").strip().upper()
    if not tid:
        return False, "tsap_id required", {}

    safe_summary = _redact_id_numbers(summary)
    safe_doc = clean(document_type, 80, "document_type")
    with _LOCK:
        state = _ensure_loaded()
        records = state["verification_records"]
        existing = next(
            (r for r in records if r.get("tsap_id") == tid and r.get("badge_type") == btype),
            None,
        )
        now = _utc_iso()
        if existing:
            existing.setdefault("history", []).append({
                "previous_status": existing.get("status"),
                "resubmitted_at": now,
            })
            existing["status"] = "pending"
            existing["document_type"] = safe_doc or existing.get("document_type", "")
            existing["detail_summary"] = safe_summary or existing.get("detail_summary", "")
            existing["submitted_at"] = now
            existing["rejection_reason"] = ""
            existing["resubmission_count"] = int(existing.get("resubmission_count", 0)) + 1
            rec = existing
        else:
            rec = {
                "id": f"VER-{datetime.utcnow().strftime('%y%m%d')}-{len(records) + 1:04d}",
                "tsap_id": tid,
                "badge_type": btype,
                "document_type": safe_doc,
                "detail_summary": safe_summary,
                "status": "pending",
                "submitted_at": now,
                "reviewed_at": "",
                "reviewer": "",
                "rejection_reason": "",
                "resubmission_count": 0,
                "history": [],
            }
            records.append(rec)
        if not save_state():
            return False, "Verification submission could not be saved safely.", {}
        return True, "submitted", dict(rec)


def review_verification_evidence(
    record_id: str, decision: str, reviewer: str, rejection_reason: str = "",
    users: Optional[List[Dict[str, Any]]] = None,
) -> Tuple[bool, str, Dict[str, Any]]:
    dec = str(decision or "").strip().lower()
    if dec not in ("approved", "rejected"):
        return False, "decision must be approved | rejected", {}
    with _LOCK:
        state = _ensure_loaded()
        rec = next((r for r in state["verification_records"] if r.get("id") == record_id), None)
        if not rec:
            return False, "Verification record not found", {}
        rec["status"] = dec
        rec["reviewed_at"] = _utc_iso()
        rec["reviewer"] = clean(reviewer or "staff", 60, "reviewer")
        rec["rejection_reason"] = clean(rejection_reason, 240, "rejection_reason") if dec == "rejected" else ""
        rec.setdefault("history", []).append({
            "decision": dec,
            "reviewer": rec["reviewer"],
            "at": rec["reviewed_at"],
            "reason": rec["rejection_reason"],
        })
        if users is not None:
            user = next((u for u in users if str(u.get("tsap_id", "")).upper() == rec.get("tsap_id")), None)
            if user is not None:
                btype = rec.get("badge_type")
                approved = dec == "approved"
                if btype == "government_id":
                    user["id_verified"] = approved
                elif btype == "selfie":
                    user["selfie_verified"] = approved
                    user["selfie_status"] = "approved" if approved else "rejected"
                elif btype == "education":
                    user["education_verified"] = approved
                elif btype == "employment":
                    user["employment_verified"] = approved
        if not save_state():
            return False, "Verification review could not be saved safely.", {}
        return True, dec, dict(rec)


def member_badges(user: Dict[str, Any]) -> Dict[str, Any]:
    """Return independent verification badges without numeric trust scores."""
    u = user or {}
    tid = str(u.get("tsap_id") or "").strip().upper()
    with _LOCK:
        state = _ensure_loaded()
        my_records = [dict(r) for r in state["verification_records"] if r.get("tsap_id") == tid]

    earned: List[Dict[str, Any]] = []
    checks = [
        ("photo", u.get("photo_status") == "approved"),
        ("selfie", bool(u.get("selfie_verified"))),
        ("government_id", bool(u.get("id_verified"))),
        ("education", bool(u.get("education_verified"))),
        ("employment", bool(u.get("employment_verified"))),
        ("phone", bool(u.get("phone_verified"))),
    ]
    by_type = {r.get("badge_type"): r for r in my_records}
    for btype, active in checks:
        rec = by_type.get(btype)
        if active or (rec and rec.get("status") == "approved"):
            meta = BADGE_CATALOG[btype]
            earned.append({
                "badge_type": btype,
                "status": "approved",
                "label_en": meta["en"],
                "label_te": meta["te"],
                "scope_en": meta["scope_en"],
                "scope_te": meta["scope_te"],
                "reviewed_at": (rec or {}).get("reviewed_at", ""),
            })

    pending = [
        {
            "id": r.get("id"),
            "badge_type": r.get("badge_type"),
            "status": r.get("status"),
            "document_type": r.get("document_type", ""),
            "submitted_at": r.get("submitted_at", ""),
            "rejection_reason": r.get("rejection_reason", ""),
        }
        for r in my_records
        if r.get("status") in ("pending", "rejected")
    ]
    return {
        "tsap_id": tid,
        "earned_count": len(earned),
        "badges": earned,
        "submissions": pending,
        "disclaimer_en": "Badges record staff review of submitted items only; families should independently verify personal, career, and family details.",
        "disclaimer_te": "బ్యాడ్జ్‌లు సమర్పించిన ఆధారాల బృంద సమీక్షను మాత్రమే సూచిస్తాయి; కుటుంబాలు స్వతంత్రంగా వివరాలు నిర్ధారించుకోవాలి.",
    }


def list_verification_queue(status_filter: str = "pending") -> List[Dict[str, Any]]:
    with _LOCK:
        state = _ensure_loaded()
        rows = state["verification_records"]
        if status_filter and status_filter != "all":
            rows = [r for r in rows if r.get("status") == status_filter]
        return [dict(r) for r in sorted(rows, key=lambda x: str(x.get("submitted_at", "")), reverse=True)]


# ============================================================================
# 3. MODERATION APPEALS WORKFLOW
# ============================================================================
def submit_appeal(user: Dict[str, Any], reason: str, context_note: str = "") -> Tuple[bool, str, Dict[str, Any]]:
    tid = str((user or {}).get("tsap_id") or "").strip().upper()
    if not tid:
        return False, "tsap_id required", {}
    clean_reason = clean(reason, 600, "reason", allow_newlines=True)
    if len(clean_reason) < 10:
        return False, "Please provide at least 10 characters explaining your appeal.", {}
    with _LOCK:
        state = _ensure_loaded()
        appeals = state["moderation_appeals"]
        open_dup = next((a for a in appeals if a.get("tsap_id") == tid and a.get("status") == "open"), None)
        if open_dup:
            open_dup["reason"] = clean_reason
            open_dup["updated_at"] = _utc_iso()
            save_state()
            return True, "updated", dict(open_dup)
        rec = {
            "id": f"APL-{datetime.utcnow().strftime('%y%m%d')}-{len(appeals) + 1:04d}",
            "tsap_id": tid,
            "full_name": clean((user or {}).get("full_name", ""), 80, "full_name"),
            "hidden_reason": str((user or {}).get("hidden_reason") or ""),
            "reason": clean_reason,
            "context_note": clean(context_note, 240, "context_note"),
            "status": "open",
            "created_at": _utc_iso(),
            "resolved_at": "",
            "reviewer": "",
            "resolution": "",
            "resolution_note": "",
        }
        appeals.append(rec)
        if not save_state():
            return False, "Appeal could not be saved safely.", {}
        return True, "created", dict(rec)


def list_member_appeals(tsap_id: str) -> List[Dict[str, Any]]:
    tid = str(tsap_id or "").strip().upper()
    with _LOCK:
        state = _ensure_loaded()
        return [dict(a) for a in state["moderation_appeals"] if a.get("tsap_id") == tid]


def list_admin_appeals(status_filter: str = "open") -> List[Dict[str, Any]]:
    with _LOCK:
        state = _ensure_loaded()
        rows = state["moderation_appeals"]
        if status_filter and status_filter != "all":
            rows = [a for a in rows if a.get("status") == status_filter]
        return [dict(a) for a in sorted(rows, key=lambda x: str(x.get("created_at", "")), reverse=True)]


def resolve_appeal(
    appeal_id: str, outcome: str, reviewer: str, note: str = "",
    users: Optional[List[Dict[str, Any]]] = None,
) -> Tuple[bool, str, Dict[str, Any]]:
    out = str(outcome or "").strip().lower()
    if out not in ("reinstated", "upheld"):
        return False, "outcome must be reinstated | upheld", {}
    with _LOCK:
        state = _ensure_loaded()
        rec = next((a for a in state["moderation_appeals"] if a.get("id") == appeal_id), None)
        if not rec:
            return False, "Appeal not found", {}
        rec["status"] = "resolved"
        rec["resolution"] = out
        rec["reviewer"] = clean(reviewer or "admin", 60, "reviewer")
        rec["resolution_note"] = clean(note, 300, "resolution_note")
        rec["resolved_at"] = _utc_iso()
        if out == "reinstated" and users is not None:
            user = next((u for u in users if str(u.get("tsap_id", "")).upper() == rec.get("tsap_id")), None)
            if user is not None and not user.get("is_banned"):
                user["is_approved"] = True
                user.pop("hidden_reason", None)
                user["reinstated_at"] = rec["resolved_at"]
        if not save_state():
            return False, "Appeal resolution could not be saved safely.", {}
        return True, out, dict(rec)


# ============================================================================
# 4. PHOTO ACCESS REQUESTS & SIGNED EXPIRING PHOTO TOKENS
# ============================================================================
def _photo_signing_key() -> bytes:
    raw = (os.getenv("TSAP_AUTH_SECRET") or os.getenv("JWT_SECRET") or "mana-vivaha-photo-guard").encode("utf-8")
    return hashlib.sha256(b"photo-access-v1:" + raw).digest()


def create_signed_photo_token(filename: str, viewer_id: str, owner_id: str, ttl_seconds: int = 3600) -> str:
    payload = {
        "fn": str(filename or "").strip(),
        "v": str(viewer_id or "").strip().upper(),
        "o": str(owner_id or "").strip().upper(),
        "exp": int(time.time()) + max(60, min(int(ttl_seconds or 3600), 7 * 86400)),
    }
    body = base64.urlsafe_b64encode(json.dumps(payload, separators=(",", ":")).encode("utf-8")).decode("ascii").rstrip("=")
    sig = hmac.new(_photo_signing_key(), body.encode("ascii"), hashlib.sha256).hexdigest()
    return f"{body}.{sig}"


def verify_signed_photo_token(token: str, filename: str, viewer_id: str, owner_ids: Set[str]) -> bool:
    try:
        parts = str(token or "").strip().split(".")
        if len(parts) != 2:
            return False
        body, sig = parts
        expected = hmac.new(_photo_signing_key(), body.encode("ascii"), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(sig, expected):
            return False
        padded = body + "=" * (-len(body) % 4)
        payload = json.loads(base64.urlsafe_b64decode(padded.encode("ascii")).decode("utf-8"))
        if int(payload.get("exp", 0)) < int(time.time()):
            return False
        if payload.get("fn") != filename:
            return False
        owner_id = str(payload.get("o", "")).upper()
        if owner_id not in owner_ids:
            return False
        token_viewer = str(payload.get("v", "")).upper()
        if viewer_id and token_viewer and viewer_id != token_viewer:
            return False
        # Must still have an active unrevoked grant
        return has_photo_access(token_viewer, owner_id)
    except Exception:
        return False


def has_photo_access(viewer_id: str, owner_id: str) -> bool:
    vid = str(viewer_id or "").strip().upper()
    oid = str(owner_id or "").strip().upper()
    if not vid or not oid:
        return False
    now = datetime.utcnow()
    with _LOCK:
        state = _ensure_loaded()
        for g in state["photo_access_grants"]:
            if g.get("viewer_id") == vid and g.get("owner_id") == oid and g.get("status") == "approved":
                exp = _parse_iso(g.get("expires_at"))
                if exp is None or exp > now:
                    return True
    return False


def request_photo_access(viewer_id: str, owner_id: str, note: str = "") -> Tuple[bool, str, Dict[str, Any]]:
    vid = str(viewer_id or "").strip().upper()
    oid = str(owner_id or "").strip().upper()
    if not vid or not oid or vid == oid:
        return False, "Valid viewer_id and owner_id required", {}
    with _LOCK:
        state = _ensure_loaded()
        grants = state["photo_access_grants"]
        existing = next(
            (g for g in grants if g.get("viewer_id") == vid and g.get("owner_id") == oid and g.get("status") in ("pending", "approved")),
            None,
        )
        if existing:
            return True, str(existing.get("status")), dict(existing)
        rec = {
            "id": f"PHR-{datetime.utcnow().strftime('%y%m%d')}-{len(grants) + 1:04d}",
            "viewer_id": vid,
            "owner_id": oid,
            "note": clean(note, 180, "note"),
            "status": "pending",
            "requested_at": _utc_iso(),
            "responded_at": "",
            "expires_at": "",
        }
        grants.append(rec)
        if not save_state():
            return False, "Photo access request could not be saved.", {}
        return True, "pending", dict(rec)


def respond_photo_access(owner_id: str, grant_id: str, decision: str, days: int = 7) -> Tuple[bool, str, Dict[str, Any]]:
    oid = str(owner_id or "").strip().upper()
    dec = str(decision or "").strip().lower()
    if dec not in ("approved", "declined", "revoked"):
        return False, "decision must be approved | declined | revoked", {}
    with _LOCK:
        state = _ensure_loaded()
        rec = next((g for g in state["photo_access_grants"] if g.get("id") == grant_id and g.get("owner_id") == oid), None)
        if not rec:
            return False, "Photo access request not found", {}
        rec["status"] = dec
        rec["responded_at"] = _utc_iso()
        if dec == "approved":
            rec["expires_at"] = _utc_iso(datetime.utcnow() + timedelta(days=max(1, min(int(days or 7), 30))))
        else:
            rec["expires_at"] = ""
        if not save_state():
            return False, "Photo access update could not be saved.", {}
        return True, dec, dict(rec)


def list_photo_access_for_member(tsap_id: str) -> Dict[str, Any]:
    tid = str(tsap_id or "").strip().upper()
    with _LOCK:
        state = _ensure_loaded()
        incoming = [dict(g) for g in state["photo_access_grants"] if g.get("owner_id") == tid]
        outgoing = [dict(g) for g in state["photo_access_grants"] if g.get("viewer_id") == tid]
    return {"tsap_id": tid, "incoming": incoming, "outgoing": outgoing}


# ============================================================================
# 5. BUCKETED FIFO CREDIT LEDGER & PRINTABLE RECEIPTS
# ============================================================================
def sync_member_credits(user: Dict[str, Any]) -> int:
    """Synchronize `user['credits']` with active non-expired buckets.

    Preserves 100% of existing member balances by seeding a non-expiring
    `legacy_or_free` bucket the first time an existing account enters the ledger.
    """
    if not isinstance(user, dict):
        return 0
    tid = str(user.get("tsap_id") or "").strip().upper()
    raw_balance = max(0, int(user.get("credits", 0) or 0))
    if not tid:
        return raw_balance

    now = datetime.utcnow()
    with _LOCK:
        state = _ensure_loaded()
        buckets_map: Dict[str, List[Dict[str, Any]]] = state["credit_buckets"]
        buckets = buckets_map.get(tid)
        dirty = False
        if buckets is None:
            buckets = []
            if raw_balance > 0:
                buckets.append({
                    "bucket_id": f"BKT-INIT-{tid}",
                    "kind": "legacy_or_free",
                    "plan_code": str(user.get("plan") or "FREE"),
                    "granted": raw_balance,
                    "remaining": raw_balance,
                    "granted_at": _utc_iso(now),
                    "expires_at": "",   # Legacy & free credits never expire retroactively
                    "status": "active",
                })
            buckets_map[tid] = buckets
            dirty = True

        # Sweep expired buckets first
        active_sum = 0
        expired_this_pass = 0
        for b in buckets:
            rem = max(0, int(b.get("remaining", 0) or 0))
            exp_dt = _parse_iso(b.get("expires_at"))
            if rem > 0 and exp_dt is not None and now > exp_dt:
                b["status"] = "expired"
                b["expired_credits"] = rem
                b["remaining"] = 0
                expired_this_pass += rem
                state["credit_events"].append({
                    "id": f"CEV-{len(state['credit_events']) + 1:06d}",
                    "tsap_id": tid,
                    "event": "expired",
                    "delta": -rem,
                    "bucket_id": b.get("bucket_id"),
                    "plan_code": b.get("plan_code", ""),
                    "at": _utc_iso(now),
                    "note": f"Plan credit validity ended ({b.get('expires_at')[:10]}).",
                })
                dirty = True
            elif rem > 0:
                active_sum += rem

        effective_raw = max(0, raw_balance - expired_this_pass)
        # Reconcile if legacy code mutated `user["credits"]` upward (e.g. admin gift / registration 3 free credits)
        if effective_raw > active_sum:
            diff = effective_raw - active_sum
            buckets.append({
                "bucket_id": f"BKT-SYNC-{len(buckets) + 1:03d}-{secrets.token_hex(2)}",
                "kind": "bonus_or_free",
                "plan_code": str(user.get("plan") or "FREE"),
                "granted": diff,
                "remaining": diff,
                "granted_at": _utc_iso(now),
                "expires_at": "",
                "status": "active",
            })
            active_sum += diff
            dirty = True
        elif effective_raw < active_sum:
            # Reconcile downward if direct deduction occurred outside helper
            to_trim = active_sum - effective_raw
            for b in _fifo_order(buckets):
                if to_trim <= 0:
                    break
                rem = int(b.get("remaining", 0) or 0)
                take = min(rem, to_trim)
                b["remaining"] = rem - take
                if b["remaining"] == 0:
                    b["status"] = "depleted"
                to_trim -= take
            active_sum = effective_raw
            dirty = True

        user["credits"] = active_sum
        if dirty:
            save_state()
        return active_sum


def _fifo_order(buckets: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Consume earliest-expiring paid buckets first, non-expiring free/legacy buckets last."""
    active = [b for b in buckets if int(b.get("remaining", 0) or 0) > 0]
    return sorted(
        active,
        key=lambda b: (
            0 if b.get("expires_at") else 1,
            str(b.get("expires_at") or "9999-12-31"),
            str(b.get("granted_at") or ""),
        ),
    )


def grant_credit_bucket(
    user: Dict[str, Any], credits_added: int, plan_code: str = "PAID",
    validity_days: Optional[int] = 30, ref_id: str = "", note: str = "",
) -> Dict[str, Any]:
    """Grant credits into a tracked bucket and update `user['credits']`."""
    n = max(0, int(credits_added or 0))
    if not isinstance(user, dict) or n <= 0:
        return {"ok": False, "credits": int((user or {}).get("credits", 0) or 0)}
    tid = str(user.get("tsap_id") or "").strip().upper()
    now = datetime.utcnow()
    exp_iso = _utc_iso(now + timedelta(days=int(validity_days))) if validity_days and validity_days > 0 else ""

    if not tid:
        user["credits"] = int(user.get("credits", 0) or 0) + n
        return {"ok": True, "credits": user["credits"], "expires_at": exp_iso}

    with _LOCK:
        sync_member_credits(user)
        state = _ensure_loaded()
        buckets = state["credit_buckets"].setdefault(tid, [])
        bkt = {
            "bucket_id": f"BKT-{now.strftime('%y%m%d')}-{len(buckets) + 1:03d}-{secrets.token_hex(2)}",
            "kind": "paid_plan" if exp_iso else "bonus_or_free",
            "plan_code": str(plan_code or "PAID").upper(),
            "granted": n,
            "remaining": n,
            "granted_at": _utc_iso(now),
            "expires_at": exp_iso,
            "ref_id": clean(ref_id, 80, "ref_id"),
            "status": "active",
        }
        buckets.append(bkt)
        user["credits"] = sum(max(0, int(b.get("remaining", 0) or 0)) for b in buckets)
        state["credit_events"].append({
            "id": f"CEV-{len(state['credit_events']) + 1:06d}",
            "tsap_id": tid,
            "event": "granted",
            "delta": n,
            "balance_after": user["credits"],
            "bucket_id": bkt["bucket_id"],
            "plan_code": bkt["plan_code"],
            "expires_at": exp_iso,
            "ref_id": bkt["ref_id"],
            "at": _utc_iso(now),
            "note": clean(note or f"Plan {bkt['plan_code']} credit grant", 160, "note"),
        })
        save_state()
        return {"ok": True, "credits": user["credits"], "bucket": dict(bkt), "expires_at": exp_iso}


def consume_credit_fifo(user: Dict[str, Any], reason: str = "interest_request", ref_id: str = "") -> Dict[str, Any]:
    """Sweep expired buckets, then spend 1 credit from the earliest-expiring active bucket."""
    if not isinstance(user, dict):
        return {"ok": False, "credits": 0}
    tid = str(user.get("tsap_id") or "").strip().upper()
    if not tid:
        cur = int(user.get("credits", 0) or 0)
        if cur <= 0:
            return {"ok": False, "credits": 0}
        user["credits"] = cur - 1
        return {"ok": True, "credits": user["credits"]}

    with _LOCK:
        avail = sync_member_credits(user)
        if avail <= 0:
            return {"ok": False, "credits": 0}
        state = _ensure_loaded()
        buckets = state["credit_buckets"].get(tid, [])
        ordered = _fifo_order(buckets)
        if not ordered:
            user["credits"] = 0
            return {"ok": False, "credits": 0}
        chosen = ordered[0]
        chosen["remaining"] = max(0, int(chosen.get("remaining", 0) or 0) - 1)
        if chosen["remaining"] == 0:
            chosen["status"] = "depleted"
        user["credits"] = sum(max(0, int(b.get("remaining", 0) or 0)) for b in buckets)
        state["credit_events"].append({
            "id": f"CEV-{len(state['credit_events']) + 1:06d}",
            "tsap_id": tid,
            "event": "spent",
            "delta": -1,
            "balance_after": user["credits"],
            "bucket_id": chosen.get("bucket_id", ""),
            "plan_code": chosen.get("plan_code", ""),
            "ref_id": clean(ref_id, 80, "ref_id"),
            "at": _utc_iso(),
            "note": clean(reason, 160, "reason"),
        })
        save_state()
        return {"ok": True, "credits": user["credits"], "bucket_id": chosen.get("bucket_id", "")}


def refund_credit_bucket(user: Dict[str, Any], reason: str = "interest_refund", ref_id: str = "") -> Dict[str, Any]:
    """Refund 1 credit into a non-expired active bucket (or a fresh refund bucket)."""
    if not isinstance(user, dict):
        return {"ok": False, "credits": 0}
    tid = str(user.get("tsap_id") or "").strip().upper()
    if not tid:
        user["credits"] = int(user.get("credits", 0) or 0) + 1
        return {"ok": True, "credits": user["credits"]}

    with _LOCK:
        sync_member_credits(user)
        state = _ensure_loaded()
        buckets = state["credit_buckets"].setdefault(tid, [])
        now = datetime.utcnow()
        target_bkt = next(
            (b for b in reversed(buckets)
             if not b.get("expires_at") or (_parse_iso(b.get("expires_at")) or now) > now),
            None,
        )
        if target_bkt is not None:
            target_bkt["remaining"] = int(target_bkt.get("remaining", 0) or 0) + 1
            target_bkt["status"] = "active"
        else:
            target_bkt = {
                "bucket_id": f"BKT-RFD-{now.strftime('%y%m%d')}-{secrets.token_hex(2)}",
                "kind": "refund",
                "plan_code": "REFUND",
                "granted": 1,
                "remaining": 1,
                "granted_at": _utc_iso(now),
                "expires_at": "",
                "status": "active",
            }
            buckets.append(target_bkt)
        user["credits"] = sum(max(0, int(b.get("remaining", 0) or 0)) for b in buckets)
        state["credit_events"].append({
            "id": f"CEV-{len(state['credit_events']) + 1:06d}",
            "tsap_id": tid,
            "event": "refunded",
            "delta": 1,
            "balance_after": user["credits"],
            "bucket_id": target_bkt.get("bucket_id", ""),
            "ref_id": clean(ref_id, 80, "ref_id"),
            "at": _utc_iso(now),
            "note": clean(reason, 160, "reason"),
        })
        save_state()
        return {"ok": True, "credits": user["credits"]}


def member_credit_ledger(user: Dict[str, Any]) -> Dict[str, Any]:
    tid = str((user or {}).get("tsap_id") or "").strip().upper()
    balance = sync_member_credits(user)
    with _LOCK:
        state = _ensure_loaded()
        buckets = [dict(b) for b in state["credit_buckets"].get(tid, [])]
        events = [dict(e) for e in state["credit_events"] if e.get("tsap_id") == tid][-100:]
    events.reverse()
    expiring_soon = [
        b for b in buckets
        if int(b.get("remaining", 0) or 0) > 0 and b.get("expires_at")
    ]
    return {
        "tsap_id": tid,
        "available_credits": balance,
        "buckets": buckets,
        "expiring_buckets": expiring_soon,
        "events": events,
        "policy_en": "Paid plan credits follow their 30/45/60/90-day plan validity in FIFO order. Registration free credits do not expire.",
        "policy_te": "కొనుగోలు చేసిన ప్లాన్ క్రెడిట్స్ 30/45/60/90 రోజుల గడువు ప్రకారం FIFO క్రమంలో వాడబడతాయి. ఉచిత రిజిస్ట్రేషన్ క్రెడిట్స్ గడువు ముగియవు.",
    }


def build_member_receipts(
    user: Dict[str, Any], db_payments: Iterable[Dict[str, Any]], paypro_orders: Iterable[Dict[str, Any]] = (),
) -> List[Dict[str, Any]]:
    tid = str((user or {}).get("tsap_id") or "").strip().upper()
    seen_refs: Set[str] = set()
    receipts: List[Dict[str, Any]] = []

    for row in db_payments or []:
        if str(row.get("tsap_id", "")).upper() != tid:
            continue
        status = str(row.get("status", "paid") or "paid").lower()
        if status not in ("paid", "approved", "captured", "success"):
            continue
        ref = str(row.get("order_id") or row.get("payment_id") or row.get("utr") or row.get("at") or "")
        if ref and ref in seen_refs:
            continue
        if ref:
            seen_refs.add(ref)
        receipts.append({
            "receipt_no": f"MV-RCPT-{hashlib.sha1((tid + ':' + ref).encode('utf-8')).hexdigest()[:8].upper()}",
            "tsap_id": tid,
            "member_name": user.get("full_name", ""),
            "amount_inr": int(row.get("amount", 0) or 0),
            "plan": str(row.get("plan") or row.get("purpose") or "CREDITS"),
            "payment_ref": str(row.get("payment_id") or row.get("utr") or row.get("order_id") or "RECORDED"),
            "via": str(row.get("via") or row.get("mode") or "verified"),
            "paid_at": str(row.get("paid_at") or row.get("at") or ""),
            "status": "paid",
            "note_en": "Application-recorded payment receipt for Mana Vivaha digital matrimony services.",
        })

    for po in paypro_orders or []:
        if str(po.get("tsap_id", "")).upper() != tid or str(po.get("status", "")).lower() != "paid":
            continue
        ref = str(po.get("order_id") or "")
        if ref and ref in seen_refs:
            continue
        if ref:
            seen_refs.add(ref)
        receipts.append({
            "receipt_no": f"MV-RCPT-{hashlib.sha1((tid + ':' + ref).encode('utf-8')).hexdigest()[:8].upper()}",
            "tsap_id": tid,
            "member_name": user.get("full_name", ""),
            "amount_inr": int(po.get("final_amount") or po.get("amount") or 0),
            "plan": str(po.get("ref") or po.get("purpose") or "CREDITS"),
            "payment_ref": str(po.get("rzp_payment_id") or po.get("utr") or ref),
            "via": str(po.get("mode") or "paypro"),
            "paid_at": str(po.get("paid_at") or po.get("created_at") or ""),
            "status": "paid",
            "note_en": "Application-recorded payment receipt for Mana Vivaha digital matrimony services.",
        })

    receipts.sort(key=lambda r: str(r.get("paid_at", "")), reverse=True)
    return receipts


# ============================================================================
# 6. FAMILY COLLABORATION SYSTEM (PARENT / SIBLING / GUARDIAN)
# ============================================================================
FAMILY_RELATIONS = {"father", "mother", "parent", "brother", "sister", "sibling", "guardian", "relative"}


def invite_family_member(
    owner: Dict[str, Any], collaborator_name: str, relation: str,
    can_shortlist: bool = True, can_suggest: bool = True, can_draft_preferences: bool = False,
) -> Tuple[bool, str, Dict[str, Any]]:
    tid = str((owner or {}).get("tsap_id") or "").strip().upper()
    rel = str(relation or "parent").strip().lower()
    if rel not in FAMILY_RELATIONS:
        rel = "parent"
    cname = clean(collaborator_name, 60, "collaborator_name")
    if len(cname) < 2:
        return False, "Collaborator name required (2-60 characters).", {}

    with _LOCK:
        state = _ensure_loaded()
        active_collabs = [
            c for c in state["family_collaborators"]
            if c.get("owner_tsap_id") == tid and c.get("status") == "active"
        ]
        if len(active_collabs) >= 5:
            return False, "Maximum 5 active family collaborators per profile.", {}
        code = f"FAM-{secrets.token_hex(3).upper()}-{secrets.token_hex(3).upper()}"
        now = _utc_iso()
        inv = {
            "invite_id": f"FINV-{len(state['family_invites']) + 1:04d}",
            "invite_code": code,
            "owner_tsap_id": tid,
            "collaborator_name": cname,
            "relation": rel,
            "permissions": {
                "can_shortlist": bool(can_shortlist),
                "can_suggest": bool(can_suggest),
                "can_draft_preferences": bool(can_draft_preferences),
                "can_unlock_contacts": False,   # Strictly owner-only
                "can_delete_account": False,    # Strictly owner-only
            },
            "status": "pending",
            "created_at": now,
            "expires_at": _utc_iso(datetime.utcnow() + timedelta(days=7)),
        }
        state["family_invites"].append(inv)
        state["family_activity"].append({
            "owner_tsap_id": tid,
            "actor": f"{owner.get('full_name', tid)} (Owner)",
            "action": "invite_created",
            "detail": f"Invited {cname} ({rel}) to collaborate.",
            "at": now,
        })
        if not save_state():
            return False, "Family invite could not be saved.", {}
        return True, "invited", dict(inv)


def accept_family_invite(invite_code: str) -> Tuple[bool, str, Dict[str, Any]]:
    code = str(invite_code or "").strip().upper()
    now = datetime.utcnow()
    with _LOCK:
        state = _ensure_loaded()
        inv = next((i for i in state["family_invites"] if i.get("invite_code") == code), None)
        if not inv:
            return False, "Invalid family invite code.", {}
        if inv.get("status") != "pending":
            return False, f"Invite already {inv.get('status')}.", {}
        exp = _parse_iso(inv.get("expires_at"))
        if exp and now > exp:
            inv["status"] = "expired"
            save_state()
            return False, "Family invite code has expired.", {}
        inv["status"] = "accepted"
        collab_id = f"FCOL-{len(state['family_collaborators']) + 1:04d}"
        collab = {
            "collaborator_id": collab_id,
            "owner_tsap_id": inv["owner_tsap_id"],
            "name": inv["collaborator_name"],
            "relation": inv["relation"],
            "permissions": dict(inv["permissions"]),
            "status": "active",
            "joined_at": _utc_iso(now),
        }
        state["family_collaborators"].append(collab)
        state["family_activity"].append({
            "owner_tsap_id": inv["owner_tsap_id"],
            "actor": f"{collab['name']} ({collab['relation']})",
            "action": "invite_accepted",
            "detail": f"{collab['name']} joined as family collaborator.",
            "at": _utc_iso(now),
        })
        save_state()
        family_token = sign_token(f"family:{inv['owner_tsap_id']}:{collab_id}", scope="family")
        return True, "accepted", {"collaborator": collab, "family_token": family_token}


def revoke_family_member(owner_tsap_id: str, collaborator_id: str) -> Tuple[bool, str]:
    tid = str(owner_tsap_id or "").strip().upper()
    cid = str(collaborator_id or "").strip().upper()
    with _LOCK:
        state = _ensure_loaded()
        collab = next(
            (c for c in state["family_collaborators"]
             if c.get("owner_tsap_id") == tid and str(c.get("collaborator_id", "")).upper() == cid),
            None,
        )
        if not collab:
            return False, "Collaborator not found."
        collab["status"] = "revoked"
        collab["revoked_at"] = _utc_iso()
        state["family_activity"].append({
            "owner_tsap_id": tid,
            "actor": "Profile Owner",
            "action": "collaborator_revoked",
            "detail": f"Revoked access for {collab.get('name')} ({collab.get('relation')}).",
            "at": _utc_iso(),
        })
        save_state()
        return True, "revoked"


def suggest_match_for_family(
    owner_tsap_id: str, candidate_tsap_id: str, actor_label: str, note: str = "",
) -> Tuple[bool, str, Dict[str, Any]]:
    tid = str(owner_tsap_id or "").strip().upper()
    cid = str(candidate_tsap_id or "").strip().upper()
    if not tid or not cid or tid == cid:
        return False, "Valid owner and candidate TSAP IDs required.", {}
    with _LOCK:
        state = _ensure_loaded()
        now = _utc_iso()
        rec = {
            "id": f"FSUG-{len(state['family_suggestions']) + 1:04d}",
            "owner_tsap_id": tid,
            "candidate_tsap_id": cid,
            "suggested_by": clean(actor_label, 80, "actor_label"),
            "note": clean(note, 240, "note"),
            "member_decision": "pending",
            "at": now,
        }
        state["family_suggestions"].append(rec)
        state["family_activity"].append({
            "owner_tsap_id": tid,
            "actor": rec["suggested_by"],
            "action": "match_suggested",
            "detail": f"Suggested profile {cid}" + (f": {rec['note']}" if rec["note"] else ""),
            "at": now,
        })
        save_state()
        return True, "suggested", dict(rec)


def family_hub_snapshot(owner_tsap_id: str) -> Dict[str, Any]:
    tid = str(owner_tsap_id or "").strip().upper()
    with _LOCK:
        state = _ensure_loaded()
        collabs = [dict(c) for c in state["family_collaborators"] if c.get("owner_tsap_id") == tid]
        invites = [dict(i) for i in state["family_invites"] if i.get("owner_tsap_id") == tid and i.get("status") == "pending"]
        suggestions = [dict(s) for s in state["family_suggestions"] if s.get("owner_tsap_id") == tid][-50:]
        activity = [dict(a) for a in state["family_activity"] if a.get("owner_tsap_id") == tid][-50:]
    suggestions.reverse()
    activity.reverse()
    return {
        "owner_tsap_id": tid,
        "collaborators": collabs,
        "pending_invites": invites,
        "suggestions": suggestions,
        "activity": activity,
    }


# ============================================================================
# 7. SUPPORT TICKETS & VERIFIED VENDOR QUOTES / REVIEWS
# ============================================================================
TICKET_CATEGORIES = {"billing", "verification", "privacy_dpdp", "safety_appeal", "technical", "general"}


def create_support_ticket(
    user: Dict[str, Any], category: str, subject: str, message: str,
) -> Tuple[bool, str, Dict[str, Any]]:
    tid = str((user or {}).get("tsap_id") or "").strip().upper()
    cat = str(category or "general").strip().lower()
    if cat not in TICKET_CATEGORIES:
        cat = "general"
    subj = clean(subject, 120, "subject")
    msg = clean(message, 1000, "message", allow_newlines=True)
    if len(subj) < 4 or len(msg) < 10:
        return False, "Subject (4+ chars) and message (10+ chars) are required.", {}
    now = _utc_iso()
    with _LOCK:
        state = _ensure_loaded()
        tickets = state["support_tickets"]
        rec = {
            "ticket_id": f"TKT-{datetime.utcnow().strftime('%y%m%d')}-{len(tickets) + 1:04d}",
            "tsap_id": tid,
            "member_name": clean((user or {}).get("full_name", ""), 80, "member_name"),
            "category": cat,
            "subject": subj,
            "status": "open",
            "created_at": now,
            "updated_at": now,
            "messages": [
                {"sender": "member", "author": tid, "text": msg, "at": now}
            ],
        }
        tickets.append(rec)
        if not save_state():
            return False, "Support ticket could not be saved.", {}
        return True, "created", dict(rec)


def list_member_tickets(tsap_id: str) -> List[Dict[str, Any]]:
    tid = str(tsap_id or "").strip().upper()
    with _LOCK:
        state = _ensure_loaded()
        rows = [dict(t) for t in state["support_tickets"] if t.get("tsap_id") == tid]
    rows.sort(key=lambda t: str(t.get("updated_at", "")), reverse=True)
    return rows


def list_admin_tickets(status_filter: str = "open") -> List[Dict[str, Any]]:
    with _LOCK:
        state = _ensure_loaded()
        rows = state["support_tickets"]
        if status_filter and status_filter != "all":
            rows = [t for t in rows if t.get("status") == status_filter]
        return [dict(t) for t in sorted(rows, key=lambda t: str(t.get("updated_at", "")), reverse=True)]


def reply_support_ticket(ticket_id: str, reply_text: str, responder: str, status: str = "answered") -> Tuple[bool, str, Dict[str, Any]]:
    txt = clean(reply_text, 1000, "reply_text", allow_newlines=True)
    if len(txt) < 3:
        return False, "Reply text required.", {}
    st = str(status or "answered").strip().lower()
    if st not in ("open", "answered", "closed"):
        st = "answered"
    with _LOCK:
        state = _ensure_loaded()
        rec = next((t for t in state["support_tickets"] if t.get("ticket_id") == ticket_id), None)
        if not rec:
            return False, "Support ticket not found.", {}
        now = _utc_iso()
        rec["status"] = st
        rec["updated_at"] = now
        rec.setdefault("messages", []).append({
            "sender": "staff",
            "author": clean(responder or "support", 60, "responder"),
            "text": txt,
            "at": now,
        })
        save_state()
        return True, st, dict(rec)


def submit_vendor_quote_request(
    member: Dict[str, Any], vendor: Dict[str, Any], event_date: str, city: str,
    guest_count: int = 0, budget_range: str = "", notes: str = "",
) -> Tuple[bool, str, Dict[str, Any]]:
    tid = str((member or {}).get("tsap_id") or "").strip().upper()
    vid = str((vendor or {}).get("id") or "").strip().upper()
    if not tid or not vid:
        return False, "Authenticated member and active vendor required.", {}
    now = _utc_iso()
    with _LOCK:
        state = _ensure_loaded()
        quotes = state["vendor_quotes"]
        rec = {
            "quote_id": f"VQ-{datetime.utcnow().strftime('%y%m%d')}-{len(quotes) + 1:04d}",
            "vendor_id": vid,
            "vendor_name": str(vendor.get("business_name", "")),
            "tsap_id": tid,
            "member_name": clean(member.get("full_name", ""), 80, "member_name"),
            "event_date": clean(event_date, 30, "event_date"),
            "city": clean(city, 60, "city"),
            "guest_count": max(0, min(int(guest_count or 0), 50000)),
            "budget_range": clean(budget_range, 60, "budget_range"),
            "notes": clean(notes, 400, "notes", allow_newlines=True),
            "status": "sent",
            "created_at": now,
        }
        quotes.append(rec)
        if not save_state():
            return False, "Quote request could not be saved.", {}
        return True, "created", dict(rec)


def submit_verified_vendor_review(
    member: Dict[str, Any], vendor_id: str, rating: int, review_text: str,
    vendor_leads: Iterable[Dict[str, Any]] = (),
) -> Tuple[bool, str, Dict[str, Any]]:
    """Only members with a recorded quote request or vendor lead can submit a review."""
    tid = str((member or {}).get("tsap_id") or "").strip().upper()
    vid = str(vendor_id or "").strip().upper()
    stars = int(rating or 0)
    if stars < 1 or stars > 5:
        return False, "Rating must be an integer between 1 and 5.", {}
    txt = clean(review_text, 500, "review_text", allow_newlines=True)
    if len(txt) < 10:
        return False, "Review must be at least 10 characters.", {}

    member_phone = "".join(ch for ch in str((member or {}).get("phone", "")) if ch.isdigit())[-10:]
    with _LOCK:
        state = _ensure_loaded()
        has_quote = any(
            q.get("vendor_id") == vid and q.get("tsap_id") == tid
            for q in state["vendor_quotes"]
        )
        has_lead = any(
            str(l.get("vendor_id", "")).upper() == vid and (
                str(l.get("tsap_id", "")).upper() == tid
                or (member_phone and "".join(ch for ch in str(l.get("phone", "")) if ch.isdigit())[-10:] == member_phone)
            )
            for l in (vendor_leads or [])
        )
        if not (has_quote or has_lead):
            return False, "Only members with a recorded quote inquiry or lead for this vendor can post a review.", {}

        dup = next(
            (r for r in state["vendor_reviews"] if r.get("vendor_id") == vid and r.get("tsap_id") == tid),
            None,
        )
        now = _utc_iso()
        if dup:
            dup["rating"] = stars
            dup["review_text"] = txt
            dup["updated_at"] = now
            save_state()
            return True, "updated", dict(dup)
        rec = {
            "review_id": f"VRV-{len(state['vendor_reviews']) + 1:04d}",
            "vendor_id": vid,
            "tsap_id": tid,
            "reviewer_first_name": str((member or {}).get("full_name", "Member")).split()[0][:30],
            "rating": stars,
            "review_text": txt,
            "verified_inquiry": True,
            "status": "published",
            "created_at": now,
        }
        state["vendor_reviews"].append(rec)
        save_state()
        return True, "created", dict(rec)


def list_vendor_reviews(vendor_id: str) -> Dict[str, Any]:
    vid = str(vendor_id or "").strip().upper()
    with _LOCK:
        state = _ensure_loaded()
        rows = [
            {
                "review_id": r.get("review_id"),
                "reviewer": r.get("reviewer_first_name", "Member"),
                "rating": r.get("rating"),
                "review_text": r.get("review_text"),
                "verified_inquiry": True,
                "created_at": r.get("created_at"),
            }
            for r in state["vendor_reviews"]
            if r.get("vendor_id") == vid and r.get("status") == "published"
        ]
    avg = round(sum(int(r["rating"]) for r in rows) / len(rows), 1) if rows else None
    return {
        "vendor_id": vid,
        "count": len(rows),
        "average_rating": avg,
        "reviews": rows,
        "policy_en": "Only signed-in members with a recorded inquiry for this vendor can submit a review.",
    }


# ============================================================================
# 8. DPDP SELF-SERVICE DATA EXPORT
# ============================================================================
_SENSITIVE_PROFILE_KEYS = {"password_hash", "password_salt", "passkeys", "totp_secret", "reset_token"}


def build_member_data_export(
    user: Dict[str, Any],
    interests: Iterable[Dict[str, Any]],
    payments: Iterable[Dict[str, Any]],
    saved_searches: Iterable[Dict[str, Any]],
    consent_ledger: Iterable[Dict[str, Any]],
    blocks: Iterable[Dict[str, Any]],
) -> Dict[str, Any]:
    """Build a member-owned JSON portability export without leaking other members' private PII."""
    tid = str((user or {}).get("tsap_id") or "").strip().upper()
    own_profile = {
        k: v for k, v in (user or {}).items()
        if k not in _SENSITIVE_PROFILE_KEYS and not str(k).startswith("_")
    }
    my_interests = []
    for row in interests or []:
        if row.get("from_id") == tid or row.get("to_id") == tid:
            my_interests.append({
                "request_id": row.get("request_id"),
                "direction": "sent" if row.get("from_id") == tid else "received",
                "counterparty_tsap_id": row.get("to_id") if row.get("from_id") == tid else row.get("from_id"),
                "status": row.get("status"),
                "created_at": row.get("created_at"),
                "status_at": row.get("status_at", ""),
                "contact_shared": bool(row.get("contact_shared")),
            })

    my_consents = [
        dict(c) for c in (consent_ledger or [])
        if c.get("owner_id") == tid or c.get("actor_id") == tid or c.get("target_id") == tid or c.get("tsap_id") == tid
    ]
    my_saved = [dict(s) for s in (saved_searches or []) if str(s.get("tsap_id", "")).upper() == tid]
    my_blocks = [dict(b) for b in (blocks or []) if (b.get("owner") or b.get("tsap_id")) == tid]

    return {
        "export_format": "mana-vivaha-member-data-export-v1",
        "exported_at": _utc_iso(),
        "tsap_id": tid,
        "profile": own_profile,
        "verification": member_badges(user),
        "credits_ledger": member_credit_ledger(user),
        "receipts": build_member_receipts(user, payments),
        "interests": my_interests,
        "saved_searches": my_saved,
        "consent_history": my_consents,
        "photo_access": list_photo_access_for_member(tid),
        "family_collaboration": family_hub_snapshot(tid),
        "support_tickets": list_member_tickets(tid),
        "moderation_appeals": list_member_appeals(tid),
        "blocked_profiles": my_blocks,
    }
