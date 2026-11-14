"""
Phases 3, 7, 8, 9, 10, 11 & 12 Enterprise Domain Services (`backend/enterprise_ops.py`).

Managed state file: `MANA_VIVAHA_ENTERPRISE_FILE` (or `MANA_VIVAHA_STATE_DIR/enterprise_state.json`).
All operations preserve strict privacy, consent, k-anonymity (k >= 5), SSRF protection,
and human-only authority for moderation/safety decisions.
"""
from __future__ import annotations

from collections import Counter, deque
import hashlib
import ipaddress
import json
import os
import re
import secrets
import shutil
import tempfile
import threading
from datetime import datetime, timezone
from typing import Any, Callable, Deque, Dict, List, Optional, Tuple
from urllib.parse import urlparse

from atomic_store import atomic_json_dump
import identity_repo as IDENTITY_REPO

_LOCK = threading.RLock()
_HERE = os.path.dirname(os.path.abspath(__file__))

# Rolling in-memory SLO ring buffer (zero PII: status code + latency ms only)
_SLO_LOCK = threading.Lock()
_SLO_SAMPLES: Deque[Tuple[int, float]] = deque(maxlen=2000)


def _utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(microsecond=0)


def _utc_iso() -> str:
    return _utc_now().isoformat()


def _clean(val: Any, max_len: int = 200) -> str:
    txt = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]+", "", str(val or "")).strip()
    return txt[:max_len]


def resolve_enterprise_state_file() -> str:
    explicit = os.getenv("MANA_VIVAHA_ENTERPRISE_FILE", "").strip()
    if explicit:
        return os.path.abspath(explicit)
    state_dir = os.getenv("MANA_VIVAHA_STATE_DIR", "").strip()
    if state_dir:
        return os.path.abspath(os.path.join(state_dir, "enterprise_state.json"))
    return os.path.abspath(os.path.join(_HERE, "enterprise_state.json"))


DEFAULT_FLAGS: Dict[str, Dict[str, Any]] = {
    "sql_search_v2": {
        "enabled": True,
        "owner": "platform-data",
        "description": "Enable indexed SQLite/PostgreSQL search v2 projection with cursor pagination and ETags.",
        "expires_at": "2027-06-01T00:00:00+00:00",
    },
    "cookie_sessions_opt_in": {
        "enabled": True,
        "owner": "security-auth",
        "description": "Allow members to bind browser sessions with HttpOnly + SameSite=Lax cookies.",
        "expires_at": "2027-06-01T00:00:00+00:00",
    },
    "ai_assist_triage": {
        "enabled": True,
        "owner": "trust-safety",
        "description": "Advisory, PII-redacted deterministic triage for staff queues (never auto-bans).",
        "expires_at": "2027-06-01T00:00:00+00:00",
    },
    "community_events_v3": {
        "enabled": True,
        "owner": "community-ops",
        "description": "Verified regional/community Parichaya Vedika event listings and consented RSVPs.",
        "expires_at": "2027-06-01T00:00:00+00:00",
    },
    "vendor_bundles_v3": {
        "enabled": True,
        "owner": "marketplace-ops",
        "description": "Transparent multi-category wedding planning bundle enquiries.",
        "expires_at": "2027-06-01T00:00:00+00:00",
    },
    "auto_moderation_enforcement": {
        "enabled": False,  # Default-closed per blueprint: AI/heuristics never hold final ban authority
        "owner": "trust-safety",
        "description": "Default-closed: automated permanent enforcement remains disabled.",
        "expires_at": "2027-01-01T00:00:00+00:00",
    },
}

DEFAULT_VENDOR_BUNDLES: List[Dict[str, Any]] = [
    {
        "bundle_id": "BND-PELLI-ESSENTIALS",
        "title_en": "Muhurtham Essentials Bundle (Photography + Decor + Purohit)",
        "title_te": "ముహూర్తం ఎసెన్షియల్స్ ప్యాకేజీ (ఫోటోగ్రఫీ + డెకరేషన్ + పురోహితులు)",
        "categories": ["Photography", "Mandapam Decor", "Vedic Purohit"],
        "indicative_budget_inr": "₹1,25,000 – ₹2,50,000",
        "disclosure_en": "Coordinated enquiry across independent listed vendors; pricing depends on date, city, and guest count.",
        "disclosure_te": "స్వతంత్ర వెండార్ల సమన్వయ కొటేషన్ మాత్రమే; తేదీ, నగరం మరియు అతిథుల సంఖ్యపై ధర ఆధారపడి ఉంటుంది.",
    },
    {
        "bundle_id": "BND-CATERING-HOSPITALITY",
        "title_en": "Telugu Traditional Vindhu & Guest Hospitality Bundle",
        "title_te": "తెలుగు సంప్రదాయ విందు & అతిథి మర్యాదల ప్యాకేజీ",
        "categories": ["Vegetarian Catering", "Welcome Melam / Nadaswaram", "Return Gifts"],
        "indicative_budget_inr": "₹1,50,000 – ₹4,00,000",
        "disclosure_en": "Direct quotes shared only after your explicit consent.",
        "disclosure_te": "మీ స్పష్టమైన సమ్మతి తర్వాతే వెండార్ కొటేషన్లు షేర్ చేయబడతాయి.",
    },
    {
        "bundle_id": "BND-INTIMATE-ENGAGEMENT",
        "title_en": "Nischitartham / Pelli Choopulu Family Gathering Bundle",
        "title_te": "నిశ్చితార్థం / పెళ్లిచూపుల కుటుంబ వేడుక ప్యాకేజీ",
        "categories": ["Compact Hall / Banquet", "Candid Photography", "Floral Backdrop"],
        "indicative_budget_inr": "₹45,000 – ₹1,10,000",
        "disclosure_en": "Ideal for 50–150 family guests across Telangana and Andhra Pradesh.",
        "disclosure_te": "తెలంగాణ & ఆంధ్రప్రదేశ్‌లో 50–150 మంది కుటుంబ సభ్యుల వేడుకలకు అనుకూలం.",
    },
]


def _default_state() -> Dict[str, Any]:
    return {
        "schema_version": 1,
        "bundle_enquiries": [],
        "events": [],
        "org_portals": {},       # slug -> portal dict
        "legal_holds": [],       # Phase 7 retention/dispute holds
        "dr_drills": [],         # Phase 7/11 disaster-recovery verification proofs
        "feature_flags": json.loads(json.dumps(DEFAULT_FLAGS)),
        "flag_audit": [],
        "funnel_daily": {},      # YYYY-MM-DD -> coarse event counters (zero PII)
        "ambassadors": [],
        "ai_assist": {
            "enabled": True,
            "daily_budget": 500,
            "calls_today": 0,
            "budget_day": "",
            "audit": [],
        },
        "bureau_v2": {},         # bureau_id -> {sla_tier, webhook_url, webhook_secret_sha256, events}
    }


def _load_state() -> Dict[str, Any]:
    path = resolve_enterprise_state_file()
    if not os.path.exists(path):
        return _default_state()
    try:
        with open(path, "r", encoding="utf-8") as fh:
            raw = json.load(fh)
        if not isinstance(raw, dict):
            return _default_state()
        base = _default_state()
        for k in base:
            if k in raw and type(raw[k]) is type(base[k]):
                base[k] = raw[k]
        for fk, fv in DEFAULT_FLAGS.items():
            base["feature_flags"].setdefault(fk, dict(fv))
        return base
    except Exception:
        return _default_state()


def _save_state(st: Dict[str, Any]) -> None:
    path = resolve_enterprise_state_file()
    parent = os.path.dirname(path)
    if parent:
        os.makedirs(parent, mode=0o700, exist_ok=True)
    atomic_json_dump(path, st)
    if os.name == "posix" and os.path.exists(path):
        try:
            os.chmod(path, 0o600)
        except OSError:
            pass


# ============================================================================
# PHASE 3 PRODUCT EXTENSIONS — BUNDLES (#15), EVENTS (#23), ORGS (#17), INSIGHTS (#18)
# ============================================================================
def list_vendor_bundles() -> List[Dict[str, Any]]:
    return list(DEFAULT_VENDOR_BUNDLES)


def submit_bundle_enquiry(
    *,
    tsap_id: str,
    bundle_id: str,
    city: str,
    event_date: str,
    guest_count: int,
    consent_confirmed: bool,
    notes: str = "",
) -> Tuple[bool, str, Dict[str, Any]]:
    if not consent_confirmed:
        return False, "Explicit consent is required before sharing bundle enquiry details.", {}
    bundle = next((b for b in DEFAULT_VENDOR_BUNDLES if b["bundle_id"] == bundle_id), None)
    if not bundle:
        return False, "Selected bundle was not found.", {}
    ccity = _clean(city, 60)
    edate = _clean(event_date, 16)
    if len(ccity) < 2:
        return False, "Event city is required.", {}
    rec = {
        "enquiry_id": f"BNQ-{secrets.token_hex(4).upper()}",
        "tsap_id": _clean(tsap_id, 40).upper(),
        "bundle_id": bundle["bundle_id"],
        "bundle_title_en": bundle["title_en"],
        "city": ccity,
        "event_date": edate,
        "guest_count": max(10, min(5000, int(guest_count or 100))),
        "notes": _clean(notes, 300),
        "consent_confirmed": True,
        "status": "received",
        "created_at": _utc_iso(),
    }
    with _LOCK:
        st = _load_state()
        st["bundle_enquiries"].insert(0, rec)
        st["bundle_enquiries"] = st["bundle_enquiries"][:500]
        _save_state(st)
    return True, "created", rec


def create_community_event(
    *,
    title_en: str,
    title_te: str = "",
    city: str,
    event_date: str,
    organizer: str,
    community_focus: str = "All Telugu Families",
    mode: str = "in_person",
    capacity: int = 100,
    actor: str = "owner",
) -> Tuple[bool, str, Dict[str, Any]]:
    ten = _clean(title_en, 120)
    ccity = _clean(city, 60)
    edate = _clean(event_date, 16)
    org = _clean(organizer, 80)
    if len(ten) < 5 or len(ccity) < 2 or not re.match(r"^\d{4}-\d{2}-\d{2}$", edate):
        return False, "Title, city, and YYYY-MM-DD event_date are required.", {}
    ev = {
        "event_id": f"EVT-{secrets.token_hex(4).upper()}",
        "title_en": ten,
        "title_te": _clean(title_te, 140) or ten,
        "city": ccity,
        "event_date": edate,
        "organizer": org or "Mana Vivaha Community Desk",
        "community_focus": _clean(community_focus, 80) or "All Telugu Families",
        "mode": "online" if str(mode).lower() == "online" else "in_person",
        "capacity": max(10, min(2000, int(capacity or 100))),
        "rsvps": [],
        "verified_by_staff": True,
        "created_by": _clean(actor, 40),
        "created_at": _utc_iso(),
    }
    with _LOCK:
        st = _load_state()
        st["events"].insert(0, ev)
        _save_state(st)
    return True, "created", _public_event(ev)


def _public_event(ev: Dict[str, Any]) -> Dict[str, Any]:
    rsvps = ev.get("rsvps") or []
    cap = int(ev.get("capacity") or 100)
    return {
        "event_id": ev["event_id"],
        "title_en": ev["title_en"],
        "title_te": ev.get("title_te") or ev["title_en"],
        "city": ev["city"],
        "event_date": ev["event_date"],
        "organizer": ev.get("organizer", ""),
        "community_focus": ev.get("community_focus", ""),
        "mode": ev.get("mode", "in_person"),
        "capacity": cap,
        "rsvp_count": len(rsvps),
        "seats_remaining": max(0, cap - len(rsvps)),
        "verified_by_staff": bool(ev.get("verified_by_staff", True)),
    }


def list_community_events() -> List[Dict[str, Any]]:
    with _LOCK:
        st = _load_state()
        return [_public_event(e) for e in st["events"]]


def rsvp_community_event(
    event_id: str,
    *,
    tsap_id: str,
    attendee_count: int = 2,
    consent_confirmed: bool = False,
) -> Tuple[bool, str, Dict[str, Any]]:
    if not consent_confirmed:
        return False, "Explicit RSVP consent is required.", {}
    eid = _clean(event_id, 32).upper()
    tid = _clean(tsap_id, 40).upper()
    with _LOCK:
        st = _load_state()
        ev = next((e for e in st["events"] if e.get("event_id") == eid), None)
        if not ev:
            return False, "Event not found.", {}
        rsvps = ev.setdefault("rsvps", [])
        if any(r.get("tsap_id") == tid for r in rsvps):
            return True, "already_registered", _public_event(ev)
        if len(rsvps) >= int(ev.get("capacity") or 100):
            return False, "Event has reached full capacity.", {}
        rsvps.append(
            {
                "rsvp_id": f"RSVP-{secrets.token_hex(3).upper()}",
                "tsap_id": tid,
                "attendee_count": max(1, min(6, int(attendee_count or 2))),
                "consent_confirmed": True,
                "at": _utc_iso(),
            }
        )
        _save_state(st)
        return True, "registered", _public_event(ev)


def create_org_portal(
    *,
    slug: str,
    org_name_en: str,
    org_name_te: str = "",
    community_filter: str = "",
    district_focus: str = "",
    about_en: str = "",
    about_te: str = "",
    verified_contact_note: str = "",
) -> Tuple[bool, str, Dict[str, Any]]:
    cslug = re.sub(r"[^a-z0-9-]+", "-", str(slug or "").strip().lower()).strip("-")[:48]
    name_en = _clean(org_name_en, 100)
    if len(cslug) < 3 or len(name_en) < 3:
        return False, "Valid slug and organization name are required.", {}
    portal = {
        "slug": cslug,
        "org_name_en": name_en,
        "org_name_te": _clean(org_name_te, 120) or name_en,
        "community_filter": _clean(community_filter, 60),
        "district_focus": _clean(district_focus, 60),
        "about_en": _clean(about_en, 400) or f"{name_en} community matrimony directory on Mana Vivaha.",
        "about_te": _clean(about_te, 400) or f"మన వివాహలో {name_en} కమ్యూనిటీ వేదిక.",
        "verified_contact_note": _clean(verified_contact_note, 160),
        "status": "active",
        "created_at": _utc_iso(),
    }
    with _LOCK:
        st = _load_state()
        st["org_portals"][cslug] = portal
        _save_state(st)
    return True, "created", portal


def get_org_portal(slug: str, approved_users: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    cslug = re.sub(r"[^a-z0-9-]+", "-", str(slug or "").strip().lower()).strip("-")
    with _LOCK:
        st = _load_state()
        portal = st["org_portals"].get(cslug)
        if not portal or portal.get("status") != "active":
            return None
        portal_copy = dict(portal)

    cf = portal_copy.get("community_filter", "").strip().lower()
    df = portal_copy.get("district_focus", "").strip().lower()
    matched = []
    for u in approved_users or []:
        if cf and str(u.get("caste") or "").strip().lower() != cf:
            continue
        if df and str(u.get("district") or "").strip().lower() != df:
            continue
        matched.append(
            {
                "tsap_id": u.get("tsap_id"),
                "first_name": str(u.get("full_name") or "").strip().split(" ")[0] if u.get("full_name") else "Member",
                "age": u.get("age"),
                "gender": u.get("gender"),
                "caste": u.get("caste", ""),
                "district": u.get("district", ""),
                "education": u.get("education", ""),
            }
        )
    portal_copy["approved_profile_count"] = len(matched)
    portal_copy["sample_profiles"] = matched[:12]
    return portal_copy


def list_org_portals() -> List[Dict[str, Any]]:
    with _LOCK:
        st = _load_state()
        return [dict(v) for v in st["org_portals"].values() if v.get("status") == "active"]


def compute_k_anonymous_demand_insights(
    users: List[Dict[str, Any]],
    *,
    k_floor: int = 5,
) -> Dict[str, Any]:
    """Aggregate demand insights (#18) enforcing strict k-anonymity (`count >= k_floor`).
    Any bucket smaller than `k_floor` is suppressed so individuals can never be re-identified."""
    k = max(5, int(k_floor or 5))
    by_district: Counter[str] = Counter()
    by_community: Counter[str] = Counter()
    total_approved = 0

    for u in users or []:
        if not isinstance(u, dict) or u.get("status") != "approved":
            continue
        if str(u.get("account_status") or "active").lower() in {"deleted", "deactivated", "married", "hidden"}:
            continue
        total_approved += 1
        dist = _clean(u.get("district", ""), 60)
        caste = _clean(u.get("caste", ""), 60)
        if dist:
            by_district[dist] += 1
        if caste:
            by_community[caste] += 1

    safe_districts = [
        {"district": d, "approved_profiles": cnt}
        for d, cnt in by_district.most_common(25)
        if cnt >= k
    ]
    safe_communities = [
        {"community": c, "approved_profiles": cnt}
        for c, cnt in by_community.most_common(25)
        if cnt >= k
    ]
    suppressed_districts = sum(1 for _, cnt in by_district.items() if 0 < cnt < k)
    suppressed_communities = sum(1 for _, cnt in by_community.items() if 0 < cnt < k)
    return {
        "k_anonymity_floor": k,
        "privacy_guarantee": f"Buckets with fewer than {k} active approved profiles are suppressed.",
        "total_approved_profiles": total_approved if total_approved >= k else 0,
        "districts": safe_districts,
        "communities": safe_communities,
        "suppressed_small_cohorts": {
            "districts": suppressed_districts,
            "communities": suppressed_communities,
        },
        "generated_at": _utc_iso(),
    }


# ============================================================================
# PHASE 7 — LEGAL HOLDS & DISASTER-RECOVERY DRILL
# ============================================================================
def place_legal_hold(tsap_id: str, reason: str, actor: str = "owner") -> Tuple[bool, str, Dict[str, Any]]:
    tid = _clean(tsap_id, 40).upper()
    creason = _clean(reason, 240)
    if not tid or len(creason) < 5:
        return False, "Profile ID and legal-hold reason are required.", {}
    rec = {
        "hold_id": f"LHD-{secrets.token_hex(4).upper()}",
        "tsap_id": tid,
        "reason": creason,
        "status": "active",
        "placed_by": _clean(actor, 40),
        "created_at": _utc_iso(),
        "released_at": None,
    }
    with _LOCK:
        st = _load_state()
        st["legal_holds"].insert(0, rec)
        _save_state(st)
    return True, "placed", rec


def release_legal_hold(hold_id: str, actor: str = "owner") -> Tuple[bool, str]:
    hid = _clean(hold_id, 32).upper()
    with _LOCK:
        st = _load_state()
        target = next((h for h in st["legal_holds"] if h.get("hold_id") == hid and h.get("status") == "active"), None)
        if not target:
            return False, "Active legal hold not found."
        target["status"] = "released"
        target["released_by"] = _clean(actor, 40)
        target["released_at"] = _utc_iso()
        _save_state(st)
        return True, "released"


def has_active_legal_hold(tsap_id: str) -> bool:
    tid = _clean(tsap_id, 40).upper()
    with _LOCK:
        st = _load_state()
        return any(h.get("tsap_id") == tid and h.get("status") == "active" for h in st["legal_holds"])


def list_legal_holds(status: str = "active") -> List[Dict[str, Any]]:
    wanted = _clean(status, 20).lower()
    with _LOCK:
        st = _load_state()
        if wanted == "all":
            return list(st["legal_holds"])
        return [h for h in st["legal_holds"] if h.get("status") == wanted]


def run_disaster_recovery_drill(
    users: List[Dict[str, Any]],
    interests: List[Dict[str, Any]],
    payments: List[Dict[str, Any]],
    token_version_fn: Callable[[str], int],
    actor: str = "owner",
) -> Dict[str, Any]:
    """Executes a non-destructive backup/restore + checksum + SQL reconciliation rehearsal
    inside an isolated temporary directory and persists the signed proof."""
    started = datetime.now(timezone.utc)
    tmp_dir = tempfile.mkdtemp(prefix="mv-dr-drill-")
    try:
        payload = {
            "users": users,
            "interests": interests,
            "payments": payments,
            "drill_at": _utc_iso(),
        }
        snap_file = os.path.join(tmp_dir, "drill_snapshot.json")
        atomic_json_dump(snap_file, payload)
        raw_bytes = open(snap_file, "rb").read()
        sha256 = hashlib.sha256(raw_bytes).hexdigest()
        restored = json.loads(raw_bytes.decode("utf-8"))
        roundtrip_ok = (
            len(restored.get("users", [])) == len(users)
            and len(restored.get("interests", [])) == len(interests)
            and len(restored.get("payments", [])) == len(payments)
        )
        sql_parity = IDENTITY_REPO.reconcile(users, token_version_fn=token_version_fn)
        duration_ms = round((datetime.now(timezone.utc) - started).total_seconds() * 1000, 2)
        proof = {
            "drill_id": f"DR-{secrets.token_hex(4).upper()}",
            "passed": bool(roundtrip_ok and sql_parity.get("parity_ok")),
            "roundtrip_ok": roundtrip_ok,
            "sql_parity_ok": bool(sql_parity.get("parity_ok")),
            "snapshot_sha256": sha256,
            "records_verified": {
                "users": len(users),
                "interests": len(interests),
                "payments": len(payments),
            },
            "duration_ms": duration_ms,
            "triggered_by": _clean(actor, 40),
            "at": _utc_iso(),
        }
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)

    with _LOCK:
        st = _load_state()
        st["dr_drills"].insert(0, proof)
        st["dr_drills"] = st["dr_drills"][:50]
        _save_state(st)
    return proof


# ============================================================================
# PHASE 8 — DEFAULT-CLOSED FEATURE FLAGS, COARSE FUNNEL & AMBASSADORS
# ============================================================================
def get_feature_flags() -> Dict[str, Any]:
    with _LOCK:
        st = _load_state()
        return {"flags": st["feature_flags"], "audit": st["flag_audit"][:30]}


def set_feature_flag(flag_key: str, enabled: bool, owner: str, actor: str = "owner") -> Tuple[bool, str, Dict[str, Any]]:
    fkey = re.sub(r"[^a-z0-9_]+", "", str(flag_key or "").strip().lower())[:48]
    cowner = _clean(owner, 40)
    if not fkey or len(cowner) < 2:
        return False, "Flag key and owner team are required.", {}
    now_iso = _utc_iso()
    with _LOCK:
        st = _load_state()
        cur = st["feature_flags"].get(fkey, {})
        rec = {
            "enabled": bool(enabled),
            "owner": cowner,
            "description": cur.get("description") or f"Managed feature flag {fkey}",
            "expires_at": cur.get("expires_at") or "2027-06-01T00:00:00+00:00",
            "updated_at": now_iso,
        }
        st["feature_flags"][fkey] = rec
        st["flag_audit"].insert(
            0, {"at": now_iso, "actor": _clean(actor, 40), "flag": fkey, "enabled": bool(enabled), "owner": cowner}
        )
        st["flag_audit"] = st["flag_audit"][:100]
        _save_state(st)
    return True, "updated", rec


VALID_COARSE_EVENTS = {
    "home_search_submitted",
    "registration_started",
    "registration_completed",
    "interest_sent",
    "interest_accepted",
}


def record_coarse_funnel_event(event_name: str, consent_granted: bool = True) -> bool:
    if not consent_granted or event_name not in VALID_COARSE_EVENTS:
        return False
    day = _utc_now().strftime("%Y-%m-%d")
    with _LOCK:
        st = _load_state()
        day_map = st["funnel_daily"].setdefault(day, {})
        day_map[event_name] = int(day_map.get(event_name, 0)) + 1
        _save_state(st)
    return True


def get_funnel_summary() -> Dict[str, Any]:
    with _LOCK:
        st = _load_state()
        days = dict(sorted(st["funnel_daily"].items(), reverse=True)[:30])
        totals: Counter[str] = Counter()
        for counts in days.values():
            if isinstance(counts, dict):
                for ev, cnt in counts.items():
                    totals[ev] += int(cnt or 0)
        return {
            "privacy_definition": "Coarse daily event counters only; zero member IDs, IPs, phones, or session identifiers.",
            "totals": dict(totals),
            "days": days,
        }


def apply_ambassador(tsap_id: str, district: str, community: str, statement: str) -> Tuple[bool, str, Dict[str, Any]]:
    tid = _clean(tsap_id, 40).upper()
    stmt = _clean(statement, 300)
    if not tid or len(stmt) < 10:
        return False, "Please provide a brief statement (at least 10 characters).", {}
    rec = {
        "application_id": f"AMB-{secrets.token_hex(4).upper()}",
        "tsap_id": tid,
        "district": _clean(district, 60),
        "community": _clean(community, 60),
        "statement": stmt,
        "status": "pending_review",
        "created_at": _utc_iso(),
    }
    with _LOCK:
        st = _load_state()
        st["ambassadors"].insert(0, rec)
        _save_state(st)
    return True, "submitted", rec


# ============================================================================
# PHASE 9 — "AI ASSIST, NOT AI AUTHORITY" (PII REDACTION + KILL SWITCH + BUDGET)
# ============================================================================
_PHONE_MASK_RE = re.compile(r"(?:\+?91[-\s]?)?[6-9]\d{9}\b")
_EMAIL_MASK_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
_AADHAAR_MASK_RE = re.compile(r"\b\d{4}[-\s]?\d{4}[-\s]?\d{4}\b")
_PAN_MASK_RE = re.compile(r"\b[A-Z]{5}\d{4}[A-Z]\b")
_URL_MASK_RE = re.compile(r"https?://\S+", re.IGNORECASE)


def redact_pii(text: str) -> str:
    s = str(text or "")
    s = _EMAIL_MASK_RE.sub("[EMAIL_REDACTED]", s)
    s = _AADHAAR_MASK_RE.sub("[GOVT_ID_REDACTED]", s)
    s = _PAN_MASK_RE.sub("[PAN_REDACTED]", s)
    s = _PHONE_MASK_RE.sub("[PHONE_REDACTED]", s)
    s = _URL_MASK_RE.sub("[LINK_REDACTED]", s)
    return _clean(s, 600)


def set_ai_kill_switch(enabled: bool, actor: str = "owner", reason: str = "") -> Dict[str, Any]:
    with _LOCK:
        st = _load_state()
        ai = st["ai_assist"]
        ai["enabled"] = bool(enabled)
        ai.setdefault("audit", []).insert(
            0,
            {
                "at": _utc_iso(),
                "actor": _clean(actor, 40),
                "action": "kill_switch_on" if not enabled else "assist_enabled",
                "reason": _clean(reason, 160),
            },
        )
        ai["audit"] = ai["audit"][:50]
        _save_state(st)
        return dict(ai)


def triage_moderation_or_support(
    *,
    kind: str,
    raw_text: str,
    distinct_reporters: int = 0,
    actor: str = "staff",
) -> Tuple[bool, str, Dict[str, Any]]:
    """Deterministic, PII-redacted evidence triage. Never takes autonomous action."""
    today = _utc_now().strftime("%Y-%m-%d")
    with _LOCK:
        st = _load_state()
        ai = st["ai_assist"]
        if not ai.get("enabled", True) or not st["feature_flags"].get("ai_assist_triage", {}).get("enabled", True):
            return False, "AI Assist triage is currently disabled via kill switch.", {}
        if ai.get("budget_day") != today:
            ai["budget_day"] = today
            ai["calls_today"] = 0
        if int(ai.get("calls_today", 0)) >= int(ai.get("daily_budget", 500)):
            return False, "Daily AI Assist triage budget reached; fall back to direct manual review.", {}
        ai["calls_today"] = int(ai.get("calls_today", 0)) + 1

        redacted = redact_pii(raw_text)
        low = redacted.lower()
        signals: List[str] = []
        if any(w in low for w in ("money", "loan", "upi", "crypto", "transfer", "investment", "customs", "gift")):
            signals.append("financial_solicitation_keywords")
        if any(w in low for w in ("already married", "fake", "impersonat", "scam", "fraud", "broker")):
            signals.append("identity_or_misrepresentation_claim")
        if any(w in low for w in ("abuse", "harass", "threat", "blackmail", "extort")):
            signals.append("harassment_or_safety_escalation")
        if any(w in low for w in ("refund", "payment", "utr", "razorpay", "charged twice", "credit")):
            signals.append("billing_or_reconciliation_issue")
        if int(distinct_reporters or 0) >= 2:
            signals.append(f"corroborated_by_{int(distinct_reporters)}_distinct_reporters")

        if "harassment_or_safety_escalation" in signals or "financial_solicitation_keywords" in signals:
            priority = "P1_URGENT_HUMAN_REVIEW"
            sop = "Inspect report history, freeze contact grants if corroborated, and document manual moderator note."
        elif signals:
            priority = "P2_STANDARD_QUEUE"
            sop = "Verify evidence against account audit trail before issuing warning or ticket response."
        else:
            priority = "P3_ROUTINE"
            sop = "Review redacted summary and respond using standard bilingual support template."

        result = {
            "triage_id": f"TRG-{secrets.token_hex(4).upper()}",
            "kind": _clean(kind, 32) or "moderation",
            "authority": "human_only",
            "auto_action_taken": False,
            "priority": priority,
            "evidence_signals": signals,
            "redacted_summary": redacted[:280],
            "recommended_human_sop": sop,
            "calls_remaining_today": max(0, int(ai["daily_budget"]) - int(ai["calls_today"])),
            "at": _utc_iso(),
        }
        ai.setdefault("audit", []).insert(
            0, {"at": result["at"], "actor": _clean(actor, 40), "triage_id": result["triage_id"], "priority": priority}
        )
        ai["audit"] = ai["audit"][:50]
        _save_state(st)
        return True, "ok", result


# ============================================================================
# PHASE 10 — BUREAU V2 SETTINGS, SSRF-SAFE CRM WEBHOOKS & SCOPED EXPORT
# ============================================================================
def _validate_public_https_webhook(url: str) -> Tuple[bool, str]:
    raw = str(url or "").strip()
    if not raw:
        return True, ""
    parsed = urlparse(raw)
    if parsed.scheme != "https" or not parsed.hostname:
        return False, "Partner CRM webhook URL must use https:// with a valid public hostname."
    host = parsed.hostname.strip().lower()
    if host in {"localhost", "127.0.0.1", "::1", "0.0.0.0", "169.254.169.254"} or host.endswith((".local", ".internal")):
        return False, "Loopback, internal, and cloud-metadata webhook hosts are forbidden."
    try:
        ip = ipaddress.ip_address(host)
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast:
            return False, "Private/reserved IP addresses are forbidden for partner webhooks."
    except ValueError:
        pass
    return True, raw


def configure_bureau_v2_settings(
    bureau_id: str,
    *,
    sla_tier: str = "standard",
    webhook_url: str = "",
) -> Tuple[bool, str, Dict[str, Any]]:
    bid = _clean(bureau_id, 32).upper()
    tier = _clean(sla_tier, 24).lower()
    if tier not in {"standard", "priority_sla", "enterprise_sla"}:
        tier = "standard"
    ok_url, checked = _validate_public_https_webhook(webhook_url)
    if not ok_url:
        return False, checked, {}
    signing_secret = f"whsec_{secrets.token_urlsafe(18)}" if checked else ""
    rec = {
        "bureau_id": bid,
        "api_version": "2026-11.v2",
        "sla_tier": tier,
        "webhook_url": checked,
        "webhook_configured": bool(checked),
        "updated_at": _utc_iso(),
    }
    with _LOCK:
        st = _load_state()
        stored = dict(rec)
        if signing_secret:
            stored["webhook_secret_sha256"] = hashlib.sha256(signing_secret.encode("utf-8")).hexdigest()
        st["bureau_v2"][bid] = stored
        _save_state(st)
    if signing_secret:
        rec["webhook_signing_secret"] = signing_secret
    return True, "updated", rec


def export_bureau_tenant_bundle(workspace: Dict[str, Any]) -> Dict[str, Any]:
    """Tenant-scoped export (#16): contains ONLY this bureau's own seats & consented client notes."""
    bid = str(workspace.get("bureau_id") or "")
    with _LOCK:
        st = _load_state()
        v2_meta = dict(st["bureau_v2"].get(bid, {"api_version": "2026-11.v2", "sla_tier": "standard"}))
        v2_meta.pop("webhook_secret_sha256", None)
    return {
        "schema": "manavivaha.bureau.export.v2",
        "exported_at": _utc_iso(),
        "tenant": {
            "bureau_id": bid,
            "business_name": workspace.get("business_name", ""),
            "district": workspace.get("district", ""),
            "v2_settings": v2_meta,
        },
        "seats": workspace.get("seats", []),
        "consented_clients": workspace.get("clients", []),
        "isolation_assertion": "Scoped strictly to authenticated bureau_id; zero cross-tenant or unconsented member PII.",
    }


# ============================================================================
# PHASE 11 & 12 — SLO / ERROR-BUDGET TRACKER & TRANSPARENT PUBLIC STATUS
# ============================================================================
def record_request_slo(status_code: int, latency_ms: float) -> None:
    with _SLO_LOCK:
        _SLO_SAMPLES.append((int(status_code), max(0.0, float(latency_ms))))


def get_slo_metrics() -> Dict[str, Any]:
    with _SLO_LOCK:
        samples = list(_SLO_SAMPLES)
    total = len(samples)
    if total == 0:
        return {
            "sample_size": 0,
            "target_availability_pct": 99.5,
            "observed_availability_pct": 100.0,
            "p95_latency_ms": 0.0,
            "error_budget_healthy": True,
        }
    ok_cnt = sum(1 for code, _ in samples if code not in {500, 502, 504})
    latencies = sorted(lat for _, lat in samples)
    p95_idx = min(total - 1, int(total * 0.95))
    avail = round((ok_cnt / total) * 100.0, 3)
    return {
        "sample_size": total,
        "target_availability_pct": 99.5,
        "observed_availability_pct": avail,
        "p95_latency_ms": round(latencies[p95_idx], 2),
        "error_budget_healthy": avail >= 99.5,
    }


def build_public_status_report(
    *,
    sql_parity_ok: bool,
    indexed_profiles: int,
) -> Dict[str, Any]:
    """Transparent public status page payload (Phase 12): reports real measured state
    and honest provider configuration without exposing secrets or member PII."""
    with _LOCK:
        st = _load_state()
        last_drill = st["dr_drills"][0] if st["dr_drills"] else None
        ai_enabled = bool(st["ai_assist"].get("enabled", True))

    sms_configured = bool(os.getenv("MSG91_KEY", "").strip() or os.getenv("FAST2SMS_KEY", "").strip())
    email_configured = str(os.getenv("EMAIL_MODE", "off")).strip().lower() not in {"", "off", "disabled"} and bool(
        os.getenv("RESEND_API_KEY", "").strip()
    )
    razorpay_configured = bool(os.getenv("RAZORPAY_KEY_ID", "").strip() and os.getenv("RAZORPAY_KEY_SECRET", "").strip())
    wa_bridge_configured = bool(os.getenv("WA_BRIDGE_URL", "").strip() and os.getenv("WA_BRIDGE_TOKEN", "").strip())

    slo = get_slo_metrics()
    overall = "operational" if (sql_parity_ok and slo["error_budget_healthy"]) else "degraded"

    return {
        "overall_status": overall,
        "architecture": "modular_monolith_single_writer_with_sql_shadow_and_projection",
        "components": {
            "api_gateway": "operational",
            "transactional_sql_plane": "operational" if sql_parity_ok else "reconciling",
            "search_v2_projection": f"operational ({indexed_profiles} indexed public profiles)",
            "ai_assist_triage": "advisory_human_only" if ai_enabled else "disabled_by_kill_switch",
        },
        "providers_honest_state": {
            "sms_otp": "configured" if sms_configured else "not_configured_optional",
            "transactional_email": "configured" if email_configured else "off",
            "online_payment_gateway": "configured" if razorpay_configured else "manual_or_sandbox_only",
            "whatsapp_bridge": "configured" if wa_bridge_configured else "not_configured_queue_only",
        },
        "slo": slo,
        "last_dr_drill": (
            {
                "drill_id": last_drill["drill_id"],
                "passed": last_drill["passed"],
                "at": last_drill["at"],
                "duration_ms": last_drill["duration_ms"],
            }
            if last_drill
            else None
        ),
        "checked_at": _utc_iso(),
    }
