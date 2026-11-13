"""
Phase 2 — Multi-Seat Bureau Tenants, Elder Profile Review Links,
Saved-Search Opt-In Digest Alerts, and Assisted Matchmaker Appointments.
"""
from __future__ import annotations

import hashlib
import hmac
import json
import os
import re
import secrets
import threading
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

from atomic_store import atomic_json_dump
import safety

_LOCK = threading.RLock()
_HERE = os.path.dirname(os.path.abspath(__file__))


def _utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(microsecond=0)


def _utc_iso() -> str:
    return _utc_now().isoformat()


def _sha256(raw: str) -> str:
    return hashlib.sha256(str(raw or "").encode("utf-8")).hexdigest()


def _clean_text(val: Any, max_len: int = 200) -> str:
    txt = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]+", "", str(val or "")).strip()
    return txt[:max_len]


def resolve_phase2_state_file() -> str:
    explicit = os.getenv("MANA_VIVAHA_PHASE2_FILE", "").strip()
    if explicit:
        return os.path.abspath(explicit)
    state_dir = os.getenv("MANA_VIVAHA_STATE_DIR", "").strip()
    if state_dir:
        return os.path.abspath(os.path.join(state_dir, "phase2_state.json"))
    return os.path.abspath(os.path.join(_HERE, "phase2_state.json"))


def _default_state() -> Dict[str, Any]:
    return {
        "schema_version": 1,
        "bureaus": {},           # bureau_id -> tenant dict
        "review_links": [],      # list of private review link records
        "alert_preferences": {}, # tsap_id -> opt-in alert config
        "appointments": [],      # assisted matchmaker consultation bookings
    }


def _load_state() -> Dict[str, Any]:
    path = resolve_phase2_state_file()
    if not os.path.exists(path):
        return _default_state()
    try:
        with open(path, "r", encoding="utf-8") as fh:
            data = json.load(fh)
        if not isinstance(data, dict):
            return _default_state()
        base = _default_state()
        for k in base:
            if k in data and type(data[k]) is type(base[k]):
                base[k] = data[k]
        return base
    except Exception:
        return _default_state()


def _save_state(state: Dict[str, Any]) -> None:
    path = resolve_phase2_state_file()
    parent = os.path.dirname(path)
    if parent:
        os.makedirs(parent, mode=0o700, exist_ok=True)
    atomic_json_dump(path, state)
    if os.name == "posix" and os.path.exists(path):
        try:
            os.chmod(path, 0o600)
        except OSError:
            pass


# ============================================================================
# 1. MULTI-SEAT BUREAU TENANT ISOLATION (#5, #6)
# ============================================================================
VALID_SEAT_ROLES = {"coordinator", "viewer"}


def create_bureau_tenant(
    business_name: str,
    owner_name: str,
    district: str = "",
    contact_phone: str = "",
) -> Tuple[bool, str, Dict[str, Any]]:
    bname = _clean_text(business_name, 100)
    oname = _clean_text(owner_name, 80)
    dist = _clean_text(district, 60)
    digits = re.sub(r"\D", "", str(contact_phone or ""))
    if len(bname) < 3 or len(oname) < 2:
        return False, "Bureau name and owner name are required.", {}
    if len(digits) < 10:
        return False, "A valid 10-digit contact phone is required.", {}

    with _LOCK:
        st = _load_state()
        bid = f"BUR-{secrets.token_hex(3).upper()}"
        while bid in st["bureaus"]:
            bid = f"BUR-{secrets.token_hex(3).upper()}"
        owner_key = f"bkey_{bid}_{secrets.token_urlsafe(18)}"
        now = _utc_iso()
        tenant = {
            "bureau_id": bid,
            "business_name": bname,
            "owner_name": oname,
            "district": dist,
            "phone_last4": digits[-4:],
            "owner_key_sha256": _sha256(owner_key),
            "seats": [],
            "clients": [],
            "audit": [
                {"at": now, "actor": f"Owner ({oname})", "action": "tenant_created", "detail": bname}
            ],
            "created_at": now,
        }
        st["bureaus"][bid] = tenant
        _save_state(st)
        return True, "created", {
            "bureau_id": bid,
            "business_name": bname,
            "owner_name": oname,
            "district": dist,
            "owner_key": owner_key,
            "note": "Save this owner key securely; only its SHA-256 hash is stored on the server.",
        }


def authenticate_bureau(bureau_id: str, raw_key: str) -> Tuple[bool, str, str]:
    """Returns (authorized, role: 'owner'|'coordinator'|'viewer'|'', actor_label).
    Strictly scoped to the single requested `bureau_id` — cross-tenant keys always fail."""
    bid = _clean_text(bureau_id, 32).upper()
    key = str(raw_key or "").strip()
    if not bid or not key:
        return False, "", ""
    key_hash = _sha256(key)
    with _LOCK:
        st = _load_state()
        tenant = st["bureaus"].get(bid)
        if not tenant:
            return False, "", ""
        if hmac.compare_digest(str(tenant.get("owner_key_sha256") or ""), key_hash):
            return True, "owner", f"Owner ({tenant.get('owner_name', '')})"
        for seat in tenant.get("seats", []):
            if seat.get("status") == "active" and hmac.compare_digest(str(seat.get("key_sha256") or ""), key_hash):
                role = str(seat.get("role") or "viewer")
                return True, role, f"Seat {seat.get('seat_id')} ({seat.get('name', '')})"
    return False, "", ""


def add_bureau_seat(
    bureau_id: str,
    seat_name: str,
    role: str = "coordinator",
    actor_label: str = "Owner",
) -> Tuple[bool, str, Dict[str, Any]]:
    bid = _clean_text(bureau_id, 32).upper()
    sname = _clean_text(seat_name, 80)
    srole = _clean_text(role, 24).lower()
    if srole not in VALID_SEAT_ROLES:
        return False, "Role must be coordinator or viewer.", {}
    if len(sname) < 2:
        return False, "Seat operator name is required.", {}

    with _LOCK:
        st = _load_state()
        tenant = st["bureaus"].get(bid)
        if not tenant:
            return False, "Bureau tenant not found.", {}
        active_seats = [s for s in tenant.get("seats", []) if s.get("status") == "active"]
        if len(active_seats) >= 20:
            return False, "Maximum active seats (20) reached for this tenant.", {}
        seat_id = f"SEAT-{secrets.token_hex(3).upper()}"
        seat_key = f"skey_{bid}_{secrets.token_urlsafe(16)}"
        now = _utc_iso()
        seat_rec = {
            "seat_id": seat_id,
            "name": sname,
            "role": srole,
            "status": "active",
            "key_sha256": _sha256(seat_key),
            "created_at": now,
            "revoked_at": None,
        }
        tenant.setdefault("seats", []).append(seat_rec)
        tenant.setdefault("audit", []).insert(
            0, {"at": now, "actor": actor_label, "action": "seat_added", "detail": f"{seat_id} ({sname}, {srole})"}
        )
        tenant["audit"] = tenant["audit"][:100]
        _save_state(st)
        return True, "seat_created", {
            "seat_id": seat_id,
            "name": sname,
            "role": srole,
            "seat_key": seat_key,
            "created_at": now,
        }


def revoke_bureau_seat(bureau_id: str, seat_id: str, actor_label: str = "Owner") -> Tuple[bool, str]:
    bid = _clean_text(bureau_id, 32).upper()
    sid = _clean_text(seat_id, 32).upper()
    with _LOCK:
        st = _load_state()
        tenant = st["bureaus"].get(bid)
        if not tenant:
            return False, "Bureau tenant not found."
        target = next((s for s in tenant.get("seats", []) if s.get("seat_id") == sid), None)
        if not target:
            return False, "Seat not found."
        target["status"] = "revoked"
        target["revoked_at"] = _utc_iso()
        tenant.setdefault("audit", []).insert(
            0, {"at": target["revoked_at"], "actor": actor_label, "action": "seat_revoked", "detail": sid}
        )
        _save_state(st)
        return True, "revoked"


def add_bureau_client(
    bureau_id: str,
    *,
    client_tsap_id: str,
    client_label: str = "",
    notes: str = "",
    consent_confirmed: bool = False,
    actor_label: str = "Owner",
    member_exists: bool = True,
) -> Tuple[bool, str, Dict[str, Any]]:
    if not consent_confirmed:
        return False, "Explicit family/member consent confirmation is required.", {}
    if not member_exists:
        return False, "Member Profile ID was not found.", {}
    bid = _clean_text(bureau_id, 32).upper()
    cid = _clean_text(client_tsap_id, 40).upper()
    clabel = _clean_text(client_label, 80)
    cnote = _clean_text(notes, 240)

    with _LOCK:
        st = _load_state()
        tenant = st["bureaus"].get(bid)
        if not tenant:
            return False, "Bureau tenant not found.", {}
        existing = next((c for c in tenant.get("clients", []) if c.get("client_tsap_id") == cid), None)
        now = _utc_iso()
        if existing:
            existing["notes"] = cnote or existing.get("notes", "")
            existing["updated_at"] = now
            rec = dict(existing)
        else:
            rec = {
                "entry_id": f"BCL-{secrets.token_hex(3).upper()}",
                "client_tsap_id": cid,
                "client_label": clabel,
                "notes": cnote,
                "consent_confirmed": True,
                "added_by": actor_label,
                "created_at": now,
                "updated_at": now,
            }
            tenant.setdefault("clients", []).insert(0, rec)
        tenant.setdefault("audit", []).insert(
            0, {"at": now, "actor": actor_label, "action": "client_recorded", "detail": cid}
        )
        tenant["audit"] = tenant["audit"][:100]
        _save_state(st)
        return True, "recorded", rec


def get_bureau_workspace(bureau_id: str, viewer_role: str = "owner") -> Optional[Dict[str, Any]]:
    bid = _clean_text(bureau_id, 32).upper()
    with _LOCK:
        st = _load_state()
        tenant = st["bureaus"].get(bid)
        if not tenant:
            return None
        safe_seats = [
            {
                "seat_id": s.get("seat_id"),
                "name": s.get("name"),
                "role": s.get("role"),
                "status": s.get("status"),
                "created_at": s.get("created_at"),
                "revoked_at": s.get("revoked_at"),
            }
            for s in tenant.get("seats", [])
        ]
        return {
            "bureau_id": tenant["bureau_id"],
            "business_name": tenant["business_name"],
            "owner_name": tenant["owner_name"],
            "district": tenant.get("district", ""),
            "viewer_role": viewer_role,
            "seats": safe_seats,
            "clients": list(tenant.get("clients", [])),
            "audit": list(tenant.get("audit", []))[:40],
            "privacy_notice": (
                "Bureau workspaces isolate client notes per bureau tenant and never expose raw member phone numbers "
                "or bypass profile-owner acceptance."
            ),
        }


# ============================================================================
# 2. PRIVATE SHAREABLE ELDER PROFILE REVIEW LINKS (#21)
# ============================================================================
def _elder_safe_projection(user: Dict[str, Any]) -> Dict[str, Any]:
    """Strict allowlist projection for private family/elder review links.
    NEVER includes phone, email, address, tokens, password_hash, or private photos."""
    photo_private = bool(user.get("photo_private") or user.get("privacy_mode") == "private")
    photo_ok = user.get("photo_status") == "approved" and not photo_private
    return {
        "tsap_id": user.get("tsap_id"),
        "first_name": str(user.get("full_name") or "").strip().split(" ")[0] if user.get("full_name") else "Member",
        "gender": user.get("gender", ""),
        "age": user.get("age"),
        "height": user.get("height", ""),
        "marital_status": user.get("marital_status", ""),
        "religion": user.get("religion", ""),
        "caste": user.get("caste", ""),
        "sub_caste": user.get("sub_caste", ""),
        "mother_tongue": user.get("mother_tongue", ""),
        "gothram": user.get("gothram", ""),
        "star": user.get("star", ""),
        "rasi": user.get("rasi", ""),
        "dosham": user.get("dosham", ""),
        "education": user.get("education", ""),
        "education_detail": user.get("education_detail", ""),
        "job": user.get("job", ""),
        "salary": user.get("salary", ""),
        "district": user.get("district", ""),
        "state": user.get("state", ""),
        "country": user.get("country", ""),
        "family_type": user.get("family_type", ""),
        "family_status": user.get("family_status", ""),
        "about_myself": _clean_text(user.get("about_myself", ""), 500),
        "photo_url": user.get("photo_url") if photo_ok else None,
        "photo_private": photo_private,
        "disclaimer_en": "Member-submitted biodata shared privately by the profile owner for family review. Contact details are withheld.",
        "disclaimer_te": "కుటుంబ పెద్దల పరిశీలన కోసం ప్రొఫైల్ యజమాని షేర్ చేసిన బయోడేటా. ఫోన్ నంబర్లు దాచబడ్డాయి.",
    }


def create_review_link(
    owner_user: Dict[str, Any],
    *,
    label: str = "Family Elder Review",
    ttl_hours: int = 72,
    max_views: int = 15,
) -> Dict[str, Any]:
    tid = str(owner_user.get("tsap_id") or "").strip().upper()
    clabel = _clean_text(label, 80) or "Family Elder Review"
    hours = max(1, min(336, int(ttl_hours or 72)))
    cap = max(1, min(100, int(max_views or 15)))
    raw_token = f"rv_{secrets.token_urlsafe(20)}"
    link_id = f"RVL-{secrets.token_hex(4).upper()}"
    now_dt = _utc_now()
    exp_dt = now_dt + timedelta(hours=hours)

    rec = {
        "link_id": link_id,
        "tsap_id": tid,
        "label": clabel,
        "token_sha256": _sha256(raw_token),
        "created_at": now_dt.isoformat(),
        "expires_at": exp_dt.isoformat(),
        "max_views": cap,
        "view_count": 0,
        "status": "active",
        "revoked_at": None,
        "feedback": [],
    }
    with _LOCK:
        st = _load_state()
        st["review_links"].insert(0, rec)
        st["review_links"] = st["review_links"][:500]
        _save_state(st)

    return {
        "link_id": link_id,
        "label": clabel,
        "token": raw_token,
        "share_path": f"/review/{raw_token}",
        "expires_at": exp_dt.isoformat(),
        "max_views": cap,
        "status": "active",
    }


def list_review_links(tsap_id: str) -> List[Dict[str, Any]]:
    tid = _clean_text(tsap_id, 40).upper()
    now_iso = _utc_iso()
    with _LOCK:
        st = _load_state()
        out = []
        for r in st["review_links"]:
            if r.get("tsap_id") != tid:
                continue
            expired = str(r.get("expires_at") or "") <= now_iso or int(r.get("view_count") or 0) >= int(r.get("max_views") or 15)
            eff_status = "revoked" if r.get("status") == "revoked" else ("expired" if expired else "active")
            out.append(
                {
                    "link_id": r["link_id"],
                    "label": r.get("label", ""),
                    "created_at": r.get("created_at"),
                    "expires_at": r.get("expires_at"),
                    "view_count": int(r.get("view_count") or 0),
                    "max_views": int(r.get("max_views") or 15),
                    "status": eff_status,
                    "feedback": list(r.get("feedback") or []),
                }
            )
        return out


def revoke_review_link(tsap_id: str, link_id: str) -> bool:
    tid = _clean_text(tsap_id, 40).upper()
    lid = _clean_text(link_id, 40).upper()
    with _LOCK:
        st = _load_state()
        for r in st["review_links"]:
            if r.get("tsap_id") == tid and r.get("link_id") == lid:
                r["status"] = "revoked"
                r["revoked_at"] = _utc_iso()
                _save_state(st)
                return True
    return False


def resolve_review_link(
    raw_token: str,
    find_user_fn,
    *,
    increment_view: bool = True,
) -> Tuple[bool, str, Dict[str, Any]]:
    tok = str(raw_token or "").strip()
    if not tok:
        return False, "Review link is invalid.", {}
    tok_hash = _sha256(tok)
    now_iso = _utc_iso()

    with _LOCK:
        st = _load_state()
        target = next(
            (r for r in st["review_links"] if hmac.compare_digest(str(r.get("token_sha256") or ""), tok_hash)),
            None,
        )
        if not target:
            return False, "Review link not found or expired.", {}
        if target.get("status") == "revoked":
            return False, "This review link was revoked by the profile owner.", {}
        if str(target.get("expires_at") or "") <= now_iso:
            return False, "This review link has expired.", {}
        if int(target.get("view_count") or 0) >= int(target.get("max_views") or 15):
            return False, "This review link has reached its view limit.", {}

        owner = find_user_fn(target.get("tsap_id")) if find_user_fn else None
        if not owner or str(owner.get("account_status") or "active") in {"deleted", "deactivated", "married"}:
            return False, "Profile is no longer available for review.", {}

        if increment_view:
            target["view_count"] = int(target.get("view_count") or 0) + 1
            _save_state(st)

        return True, "ok", {
            "link_id": target["link_id"],
            "label": target.get("label", ""),
            "expires_at": target.get("expires_at"),
            "views_remaining": max(0, int(target.get("max_views") or 15) - int(target.get("view_count") or 0)),
            "profile": _elder_safe_projection(owner),
        }


def submit_elder_feedback(
    raw_token: str,
    *,
    reviewer_name: str,
    relation: str = "Family Elder",
    note: str = "",
) -> Tuple[bool, str]:
    tok = str(raw_token or "").strip()
    rname = _clean_text(reviewer_name, 60)
    rel = _clean_text(relation, 40) or "Family Elder"
    rnote = _clean_text(note, 300)
    if not tok or len(rname) < 2 or len(rnote) < 3:
        return False, "Please enter your name and a brief note."
    tok_hash = _sha256(tok)
    now_iso = _utc_iso()

    with _LOCK:
        st = _load_state()
        target = next(
            (r for r in st["review_links"] if hmac.compare_digest(str(r.get("token_sha256") or ""), tok_hash)),
            None,
        )
        if not target or target.get("status") == "revoked" or str(target.get("expires_at") or "") <= now_iso:
            return False, "Review link is no longer active."
        fb_list = target.setdefault("feedback", [])
        if len(fb_list) >= 25:
            return False, "Feedback limit reached for this link."
        fb_list.insert(
            0,
            {
                "id": f"EFB-{secrets.token_hex(3).upper()}",
                "reviewer_name": rname,
                "relation": rel,
                "note": rnote,
                "at": now_iso,
            },
        )
        _save_state(st)
        return True, "saved"


# ============================================================================
# 3. SAVED SEARCH OPT-IN ALERTS & DIGEST (#19)
# ============================================================================
def get_alert_preferences(tsap_id: str) -> Dict[str, Any]:
    tid = _clean_text(tsap_id, 40).upper()
    with _LOCK:
        st = _load_state()
        existing = st["alert_preferences"].get(tid)
        if existing:
            return dict(existing)
    return {
        "tsap_id": tid,
        "enabled": False,  # Strict privacy default: NEVER enabled without explicit member opt-in
        "frequency": "off",
        "quiet_hours_start": "21:00",
        "quiet_hours_end": "08:00",
        "timezone": "Asia/Kolkata",
        "updated_at": None,
    }


def update_alert_preferences(
    tsap_id: str,
    *,
    enabled: bool,
    frequency: str = "weekly",
    quiet_hours_start: str = "21:00",
    quiet_hours_end: str = "08:00",
) -> Dict[str, Any]:
    tid = _clean_text(tsap_id, 40).upper()
    freq = _clean_text(frequency, 16).lower()
    if not enabled or freq not in {"daily", "weekly"}:
        enabled = False
        freq = "off"
    q_start = _clean_text(quiet_hours_start, 8) or "21:00"
    q_end = _clean_text(quiet_hours_end, 8) or "08:00"
    now = _utc_iso()
    rec = {
        "tsap_id": tid,
        "enabled": bool(enabled),
        "frequency": freq,
        "quiet_hours_start": q_start,
        "quiet_hours_end": q_end,
        "timezone": "Asia/Kolkata",
        "consent_recorded_at": now if enabled else None,
        "updated_at": now,
    }
    with _LOCK:
        st = _load_state()
        st["alert_preferences"][tid] = rec
        _save_state(st)
    return rec


def compute_saved_search_digest(
    member_user: Dict[str, Any],
    saved_searches: List[Dict[str, Any]],
    all_users: List[Dict[str, Any]],
    blocks: Dict[str, Any],
) -> Dict[str, Any]:
    tid = str(member_user.get("tsap_id") or "").strip().upper()
    my_gender = str(member_user.get("gender") or "").strip().lower()
    opp_is_bride = my_gender in {"male", "groom", "m"}

    eligible: List[Dict[str, Any]] = []
    for cand in all_users or []:
        cid = str(cand.get("tsap_id") or "").strip().upper()
        if not cid or cid == tid:
            continue
        if cand.get("status") != "approved":
            continue
        if str(cand.get("account_status") or "active").lower() in {"deleted", "deactivated", "married", "hidden"}:
            continue
        if cand.get("hidden") or cand.get("privacy_mode") == "hidden":
            continue
        if safety.is_blocked(tid, cid, blocks):
            continue
        cg = str(cand.get("gender") or "").strip().lower()
        if my_gender:
            if opp_is_bride and cg not in {"female", "bride", "f"}:
                continue
            if not opp_is_bride and cg not in {"male", "groom", "m"}:
                continue
        eligible.append(cand)

    eligible.sort(key=lambda x: str(x.get("created_at") or ""), reverse=True)

    digests: List[Dict[str, Any]] = []
    for ss in (saved_searches or [])[:15]:
        flt = ss.get("filters") if isinstance(ss.get("filters"), dict) else {}
        matched = []
        for u in eligible:
            age = int(u.get("age") or 0)
            amin = int(flt.get("age_min") or 18)
            amax = int(flt.get("age_max") or 60)
            if age and not (amin <= age <= amax):
                continue
            if flt.get("caste"):
                wanted = {x.strip().lower() for x in str(flt["caste"]).split(",") if x.strip()}
                if wanted and str(u.get("caste") or "").strip().lower() not in wanted:
                    continue
            if flt.get("district"):
                wanted_d = {x.strip().lower() for x in str(flt["district"]).split(",") if x.strip()}
                if wanted_d and str(u.get("district") or "").strip().lower() not in wanted_d:
                    continue
            if flt.get("state") and str(u.get("state") or "").strip().upper() != str(flt["state"]).strip().upper():
                continue
            matched.append(
                {
                    "tsap_id": u.get("tsap_id"),
                    "first_name": str(u.get("full_name") or "").strip().split(" ")[0] if u.get("full_name") else "Member",
                    "age": u.get("age"),
                    "caste": u.get("caste", ""),
                    "district": u.get("district", ""),
                    "education": u.get("education", ""),
                    "job": u.get("job", ""),
                }
            )
        digests.append(
            {
                "search_id": ss.get("search_id") or ss.get("id") or "",
                "name": ss.get("name") or "Saved search",
                "match_count": len(matched),
                "sample_profiles": matched[:6],
            }
        )

    return {
        "tsap_id": tid,
        "preferences": get_alert_preferences(tid),
        "saved_search_count": len(digests),
        "digests": digests,
        "generated_at": _utc_iso(),
    }


# ============================================================================
# 4. ASSISTED MATCHMAKER APPOINTMENTS (#14)
# ============================================================================
VALID_APPT_SLOTS = {"morning_10_12", "afternoon_14_16", "evening_17_19"}
VALID_APPT_STATUSES = {"requested", "confirmed", "completed", "cancelled"}


def book_appointment(
    member_user: Dict[str, Any],
    *,
    preferred_date: str,
    preferred_slot: str = "evening_17_19",
    language: str = "te",
    topic: str = "profile_shortlist_guidance",
    family_notes: str = "",
) -> Tuple[bool, str, Dict[str, Any]]:
    tid = str(member_user.get("tsap_id") or "").strip().upper()
    pdate = _clean_text(preferred_date, 16)
    slot = _clean_text(preferred_slot, 32).lower()
    if not re.match(r"^\d{4}-\d{2}-\d{2}$", pdate):
        return False, "Preferred date must be in YYYY-MM-DD format.", {}
    if slot not in VALID_APPT_SLOTS:
        slot = "evening_17_19"
    lang_code = "te" if str(language).lower().startswith("te") else "en"
    ctopic = _clean_text(topic, 60) or "profile_shortlist_guidance"
    notes = _clean_text(family_notes, 300)

    now = _utc_iso()
    rec = {
        "appointment_id": f"APT-{secrets.token_hex(4).upper()}",
        "tsap_id": tid,
        "member_name": _clean_text(member_user.get("full_name", ""), 80),
        "preferred_date": pdate,
        "preferred_slot": slot,
        "language": lang_code,
        "topic": ctopic,
        "family_notes": notes,
        "status": "requested",
        "staff_note": "",
        "created_at": now,
        "updated_at": now,
    }
    with _LOCK:
        st = _load_state()
        open_for_member = [
            a for a in st["appointments"]
            if a.get("tsap_id") == tid and a.get("status") in {"requested", "confirmed"}
        ]
        if len(open_for_member) >= 3:
            return False, "You already have 3 active appointment requests.", {}
        st["appointments"].insert(0, rec)
        st["appointments"] = st["appointments"][:1000]
        _save_state(st)
    return True, "booked", rec


def list_member_appointments(tsap_id: str) -> List[Dict[str, Any]]:
    tid = _clean_text(tsap_id, 40).upper()
    with _LOCK:
        st = _load_state()
        return [dict(a) for a in st["appointments"] if a.get("tsap_id") == tid]


def list_admin_appointments(status: str = "all") -> List[Dict[str, Any]]:
    wanted = _clean_text(status, 20).lower()
    with _LOCK:
        st = _load_state()
        if not wanted or wanted == "all":
            return [dict(a) for a in st["appointments"][:100]]
        return [dict(a) for a in st["appointments"] if a.get("status") == wanted][:100]


def update_appointment_status(
    appointment_id: str,
    *,
    status: str,
    staff_note: str = "",
    actor: str = "staff",
) -> Tuple[bool, str, Dict[str, Any]]:
    aid = _clean_text(appointment_id, 32).upper()
    st_val = _clean_text(status, 24).lower()
    if st_val not in VALID_APPT_STATUSES:
        return False, "Invalid appointment status.", {}
    with _LOCK:
        st = _load_state()
        target = next((a for a in st["appointments"] if a.get("appointment_id") == aid), None)
        if not target:
            return False, "Appointment not found.", {}
        target["status"] = st_val
        target["staff_note"] = _clean_text(staff_note, 240)
        target["handled_by"] = _clean_text(actor, 40)
        target["updated_at"] = _utc_iso()
        _save_state(st)
        return True, "updated", dict(target)
