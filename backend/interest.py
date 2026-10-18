"""
మన వివాహ — INTEREST / REQUEST ENGINE  💌  (CHATTING LEDU — anthe fix)
=======================================================================
Model (in-site chat లేదు):
  1. User profile చూసి "Interest" పంపుతారు (1 request credit).
  2. Owner inbox లో request/profile వివరాలు కనిపిస్తాయి; configured notifications queue కావచ్చు,
     కానీ queue status external delivery proof కాదు.
  3. Owner accept చేసినప్పుడు accepted-request account views లో contact access grant అవుతుంది;
     optional WhatsApp notifications delivery హామీ కాదు.
  4. Decline credit return is controlled by INTEREST_REFUND_ON_DECLINE; expiry policy is separate.

Enduku chatting ledu (mee decision — correct):
  • Chat = time waste + fake accounts + harassment risk + moderation cost (24/7 team kavali)
  • Request + consent = consent-led, safe, report-friendly — Bharat Matrimony "Express Interest" la
  • Chalu: accept ayithe direct WhatsApp/phone — anthe, manam middle lo undakkarledu

Credits (final ladder — ₹/profile prati tier lo thaggutundi):
  FREE  → 3 requests   (modati 3 FREE — register cheyagane)
  ₹99   → 5 interest requests (₹20/request)
  ₹199  → 12 interest requests (about ₹17/request)
  ₹299  → 25 interest requests (about ₹12/request)
  ₹499  → 50 interest requests (₹10/request, 90-day validity)
  ₹299 and ₹499 plans include Who-viewed access while the plan is active.
  Add-ons: ⚡ 1-day Boost ₹49 • 👀 Who-viewed 30 days ₹49 • 📸 Manual photo review request ₹199
  Referral ₹50 may qualify once on the referred user's first qualifying consumer plan (S_99/S_199/S_299/S_499, paid amount ≥₹99); exclusions and manual payout review apply.

Rules (anti-spam + trust):
  • Oka profile ki rendu sarlu request pampalevu (duplicate block)
  • Oka roju max 20 requests (spam/fraud block)
  • Request 7 days valid → auto expire (interest fresh ga untundi)
  • Same-gender / own profile / fake ID → block
  • Decline aithe credit refund (INTEREST_REFUND_ON_DECLINE=true default)
"""
from __future__ import annotations

import os
import random
import re
import threading
from datetime import datetime, timedelta
from urllib.parse import urlsplit
from typing import Dict, List, Optional, Tuple

from models import is_never_married_status

SITE = os.getenv("SITE_URL", "https://manavivaha.in").rstrip("/")
SUPPORT = os.getenv("SUPPORT_WHATSAPP", "").strip()
SUPPORT_SUFFIX = f" • Support: {SUPPORT}" if SUPPORT else ""
SUPPORT_HELP_LINE = f"❓ సహాయం కోసం: {SUPPORT}\n" if SUPPORT else ""

_PUBLIC_PHONE_TEXT = re.compile(r"(?<!\d)(?:\+?91[\s().-]*)?[6-9](?:[\s().-]*\d){9}(?!\d)")
_PUBLIC_EMAIL_TEXT = re.compile(r"(?<![\w.+-])[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}(?![\w-])", re.IGNORECASE)


def sanitize_public_text(value: object) -> str:
    """Hide contact strings accidentally pasted into member-entered public text."""
    text = str(value or "")
    text = _PUBLIC_EMAIL_TEXT.sub("[contact hidden]", text)
    return _PUBLIC_PHONE_TEXT.sub("[contact hidden]", text)


def sanitize_public_payload(value):
    """Recursively sanitize free-text values before member-facing serialization."""
    if isinstance(value, str):
        return sanitize_public_text(value)
    if isinstance(value, dict):
        return {key: sanitize_public_payload(item) for key, item in value.items()}
    if isinstance(value, list):
        return [sanitize_public_payload(item) for item in value]
    if isinstance(value, tuple):
        return tuple(sanitize_public_payload(item) for item in value)
    return value

# ------------------------------------------------------------------ PLANS
# 📊 PUBLIC PRICING LADDER — free requests first, then four paid plans.
#    FREE 3 → ₹99 = 5 → ₹199 = 12 → ₹299 = 25 → ₹499 = 50
PLANS: Dict[str, Dict] = {
    "FREE": {
        "code": "FREE", "price": 0, "profiles": 3, "validity_days": 365,
        "label": "Free Start", "telugu": "మొదటి 3 requests FREE", "badge": "No payment required",
        "per_profile": 0, "perks": ["3 interest requests", "Profile card generation", "No payment required"],
        "perksTe": ["3 ఉచిత interest requests", "ప్రొఫైల్ కార్డ్", "చెల్లింపు అవసరం లేదు"],
    },
    "S_99": {
        "code": "S_99", "price": 99, "profiles": 5, "validity_days": 30,
        "label": "Sambandham", "telugu": "₹99 → 5 interest requests", "badge": "Entry",
        "per_profile": 20, "perks": ["5 interest requests", "30-day credit validity", "Contact access in accepted-request account views after owner acceptance", "Refund policy as shown in your account"],
        "perksTe": ["5 interest requests", "30 రోజుల credit validity", "Owner accept చేసిన తర్వాత accepted-request account views లో contact details కనిపిస్తాయి", "Account లో చూపిన refund policy వర్తిస్తుంది"],
    },
    "S_199": {
        "code": "S_199", "price": 199, "profiles": 12, "validity_days": 45,
        "label": "Family", "telugu": "₹199 → 12 interest requests", "badge": "₹17/request",
        "per_profile": 17, "perks": ["12 interest requests", "45-day credit validity", "Contact access in accepted-request account views after owner acceptance", "Refund policy as shown in your account"],
        "perksTe": ["12 interest requests", "45 రోజుల credit validity", "Owner accept చేసిన తర్వాత accepted-request account views లో contact details కనిపిస్తాయి", "Account లో చూపిన refund policy వర్తిస్తుంది"],
    },
    "S_299": {
        "code": "S_299", "price": 299, "profiles": 25, "validity_days": 60,
        "label": "Premium", "telugu": "₹299 → 25 interest requests", "badge": "₹12/request",
        "per_profile": 12, "perks": ["25 interest requests", "60-day credit validity", "Who-viewed names while this plan is active", "Contact details only after the profile owner accepts", "Refund policy as shown in your account"],
        "perksTe": ["25 interest requests", "60 రోజుల credit validity", "ఈ plan active ఉన్నంతవరకు మీ profile చూసిన వారి పేర్లు", "Owner accept చేసిన తర్వాత accepted-request account views లో contact details కనిపిస్తాయి", "Account లో చూపిన refund policy వర్తిస్తుంది"],
    },
    "S_499": {
        "code": "S_499", "price": 499, "profiles": 50, "validity_days": 90,
        "label": "VIP", "telugu": "₹499 → 50 interest requests", "badge": "VIP",
        "per_profile": 10, "perks": ["50 interest requests", "90-day credit validity", "Who-viewed names while this plan is active", "Contact details only after the profile owner accepts", "Refund policy as shown in your account"],
        "perksTe": ["50 interest requests", "90 రోజుల credit validity", "ఈ plan active ఉన్నంతవరకు మీ profile చూసిన వారి పేర్లు", "Owner accept చేసిన తర్వాత accepted-request account views లో contact details కనిపిస్తాయి", "Account లో చూపిన refund policy వర్తిస్తుంది"],
    },
    "BUREAU_999": {
        "code": "BUREAU_999", "price": 999, "profiles": 25, "validity_days": 30,
        "label": "Bureau Starter", "telugu": "₹999 → 25 requests (B2B)", "badge": "Bureau/Agents",
        "per_profile": 40, "perks": ["25 interest requests", "30-day credit validity"],
        "perksTe": ["25 interest requests", "30 రోజుల credit validity"],
    },
    "BUREAU_2999": {
        "code": "BUREAU_2999", "price": 2999, "profiles": 100, "validity_days": 30,
        "label": "Bureau Pro", "telugu": "₹2999 → 100 requests (B2B)", "badge": "Bureau Pro",
        "per_profile": 30, "perks": ["100 interest requests", "30-day credit validity"],
        "perksTe": ["100 interest requests", "30 రోజుల credit validity"],
    },
}

# 🎁 IMPLEMENTED OPTIONAL ADD-ONS (separate from request-credit plans).
ADDONS: Dict[str, Dict] = {
    "BOOST_49": {"code": "BOOST_49", "price": 49, "label": "Profile Boost (1 day)",
                 "telugu": "ఒక రోజు boost; channel placement availability పై ఆధారపడుతుంది", "kind": "boost", "days": 1, "pack_code": "B_1"},
    "WHOVIEWED_49": {"code": "WHOVIEWED_49", "price": 49, "label": "Who viewed me (30 days)",
                     "telugu": "30 రోజుల పాటు viewer names చూడండి", "kind": "whoviewed", "days": 30},
    "VERIFY_199": {"code": "VERIFY_199", "price": 199, "label": "Manual photo review request",
                   "telugu": "📸 ఫోటోను సమీక్ష కోసం పంపుతుంది; approval లేదా badge హామీ కాదు", "kind": "photo_review", "days": 0},
}

# 🔁 RENEWAL OFFER — pata customer ki ekkuva value (loyalty + repeat revenue)
RENEWALS: Dict[str, Dict] = {
    "RENEW_99": {"code": "RENEW_99", "price": 99, "profiles": 8, "validity_days": 30,
                 "label": "Renewal Bonus", "telugu": "₹99 → 8 profiles (పాత customer special)",
                 "badge": "Renewal • ₹12.4/profile", "per_profile": 12,
                 "perks": ["8 interest requests", "30-day credit validity"]},
}

MAX_PER_DAY = int(os.getenv("INTEREST_MAX_PER_DAY", "20"))
EXPIRY_DAYS = int(os.getenv("INTEREST_EXPIRY_DAYS", "7"))
REFUND_ON_DECLINE = str(os.getenv("INTEREST_REFUND_ON_DECLINE", "true")).lower() in ("1", "true", "yes", "on")
AUTO_EXPIRE_CHECK = True
_EXPIRY_LOCK = threading.RLock()


def plan_list() -> List[Dict]:
    """Purchasable plans (FREE separate ga chupistham)."""
    return [PLANS["S_99"], PLANS["S_199"], PLANS["S_299"], PLANS["S_499"]]


def plan_list_with_free() -> List[Dict]:
    return [PLANS["FREE"]] + plan_list()


def addon_list() -> List[Dict]:
    return list(ADDONS.values())


def renewal_offer() -> Dict:
    return RENEWALS["RENEW_99"]


def bureau_list() -> List[Dict]:
    """B2B bureau plans (pricing page single-source)."""  # WAVE 29: bureau key miss fix
    return [PLANS[k] for k in ("BUREAU_999", "BUREAU_2999") if k in PLANS]


def get_plan(code: str) -> Dict:
    key = (code or "").upper()
    return PLANS.get(key) or ADDONS.get(key) or RENEWALS.get(key) or PLANS["FREE"]


def get_addon(code: str) -> Optional[Dict]:
    return ADDONS.get((code or "").upper())


def is_addon(code: str) -> bool:
    return (code or "").upper() in ADDONS


def get_renewal(code: str = "RENEW_99") -> Optional[Dict]:
    return RENEWALS.get((code or "").upper())


def plan_by_amount(amount: int) -> Dict:
    for p in PLANS.values():
        if p["price"] == amount:
            return p
    return PLANS["FREE"]


def apply_payment(user: Dict, amount: int, plan_code: str = "") -> Dict:
    """Apply a verified plan or implemented add-on; never grant unsupported perks."""
    code = (plan_code or "").upper()
    plan = None
    kind = "plan"
    if code:
        plan = PLANS.get(code)
        if not plan and code in ADDONS:
            plan, kind = ADDONS[code], "addon"
        if not plan and code in RENEWALS:
            plan, kind = RENEWALS[code], "renewal"
    if code and not plan:
        return {"ok": False, "error": "unknown plan/add-on code", "amount": amount, "code": code}
    if not plan:
        # Amount-only fallback is limited to plans; add-on prices can be ambiguous.
        matches = [p for p in PLANS.values() if p["price"] == amount and p["price"] > 0]
        if matches:
            plan = matches[0]
    if not plan:
        return {"ok": False, "error": "amount/plan match avvaledu", "amount": amount, "code": code}

    addon_kind = str(plan.get("kind") or "") if kind == "addon" else ""
    if kind == "addon" and addon_kind not in {"boost", "whoviewed", "photo_review"}:
        return {"ok": False, "error": "This add-on is not available for purchase."}

    profiles = int(plan.get("profiles", 0) or 0)
    if profiles:
        user["credits"] = int(user.get("credits", 0)) + profiles
    if kind in ("plan", "renewal"):
        user["plan"] = plan["code"]
        user["plan_expiry"] = (datetime.utcnow() + timedelta(days=int(plan.get("validity_days", 30)))).isoformat()

    effect = ""
    if addon_kind == "boost":
        import advanced11 as A11
        boost = A11.apply_boost(user, str(plan.get("pack_code") or "B_1"))
        effect = str(boost.get("message_telugu") or "Profile boost applied.")
    elif addon_kind == "whoviewed":
        until = datetime.utcnow() + timedelta(days=int(plan.get("days", 30)))
        user["whoviewed_until"] = until.isoformat()
        effect = "Viewer names unlocked until " + until.strftime("%Y-%m-%d")
    elif addon_kind == "photo_review":
        # Payment requests review; it never sets an approval or identity-verification flag.
        user["photo_review_requested_at"] = datetime.utcnow().isoformat()
        if user.get("photo_url") or user.get("photo_urls") or user.get("selfie_url"):
            user["photo_status"] = "pending"
            effect = "ఫోటో మాన్యువల్ review కోసం queue లో ఉంది; badge approval తర్వాత మాత్రమే"
        else:
            user["photo_review_pending_upload"] = True
            effect = "Review ప్రారంభించడానికి ముందుగా profile photo upload చేయండి"

    user["last_payment"] = {"amount": amount, "plan": plan["code"], "kind": kind,
                            "at": datetime.utcnow().isoformat()}
    return {"ok": True, "kind": kind, "plan": plan,
            "profiles_added": profiles, "credits": user.get("credits", 0),
            "expiry": str(user.get("plan_expiry") or ""), "effect": effect,
            "message_telugu": ("🎉 ₹%d payment success — %s" % (amount, plan.get("telugu", plan.get("label", ""))))
                              + (" • మీ దగ్గర ఇప్పుడు %d requests" % user.get("credits", 0) if profiles else "")
                              + ((" • " + effect) if effect else "")}


# ------------------------------------------------------------------ helpers
def _now() -> datetime:
    return datetime.utcnow()


def _id(prefix: str = "REQ") -> str:
    return f"{prefix}-{datetime.utcnow().strftime('%y%m%d')}-{random.randint(1000, 9999)}"


def mask_phone(phone: str) -> str:
    """📱 98•••••45 — free users కి ide కనిపిస్తుంది (chivari 2 digits మాత్రమే)."""
    d = "".join(ch for ch in str(phone or "") if ch.isdigit())
    if len(d) < 4:
        return "🔒 •••••"
    return d[:2] + "•" * max(0, len(d) - 4) + d[-2:]


def _public_photo_path(value: object) -> str:
    """Return only same-site uploaded /photos paths; external and traversal URLs fail closed."""
    raw = str(value or "").strip()
    if not raw or len(raw) > 220 or raw.startswith("//") or "\\" in raw:
        return ""
    try:
        parsed = urlsplit(raw)
    except ValueError:
        return ""
    if parsed.scheme or parsed.netloc or parsed.query or parsed.fragment:
        return ""
    if not re.fullmatch(r"/photos/[A-Za-z0-9._-]{1,180}", parsed.path):
        return ""
    if ".." in parsed.path.split("/"):
        return ""
    return parsed.path


def safe_user(u: Optional[Dict]) -> Dict:
    """
    Contact details teesesi (privacy first) — **numbers ivvamu**.
    Contact details are never included here; an accepted interest is required to reveal them.
    """
    if not u:
        return {}
    phone_verified = bool(u.get("phone_verified"))
    photo_verified = bool(u.get("selfie_verified") or u.get("photo_status") == "approved")
    id_verified = bool(u.get("id_verified"))
    verification_level = "id" if id_verified else "photo" if photo_verified else "phone" if phone_verified else "none"
    private_photo = bool(u.get("photo_private") or u.get("privacy_mode") == "private")
    photo_values = u.get("photo_urls", []) if isinstance(u.get("photo_urls"), list) else []
    raw_photo_url = u.get("photo_url") or (photo_values[0] if photo_values else "")
    public_photo_url = "" if private_photo else _public_photo_path(raw_photo_url)
    public = {
        "tsap_id": u.get("tsap_id"),
        "full_name": u.get("full_name", "—"),
        "age": u.get("age", "—"),
        "gender": u.get("gender", "—"),
        "caste": u.get("caste", "—"),
        "sub_caste": u.get("sub_caste", ""),
        "education": u.get("education", "—"),
        "education_detail": u.get("education_detail", ""),
        "job": u.get("job", "—"),
        "company": u.get("company", ""),
        "salary": u.get("salary", "—"),
        "height": u.get("height", "—"),
        "marital_status": u.get("marital_status", "—"),
        "children": "" if is_never_married_status(u.get("marital_status")) else u.get("children", ""),
        "physical_status": u.get("physical_status", ""),
        "district": u.get("district", "—"),
        "state": u.get("state", ""),
        "work_location": u.get("work_location", ""),
        "gothram": u.get("gothram", ""),
        "star": u.get("star", ""),
        "rasi": u.get("rasi", ""),
        "family_type": u.get("family_type", ""),
        "photo_url": public_photo_url if u.get("photo_status") == "approved" and not private_photo else "",
        # Review state is account-private; public consumers get only whether an approved,
        # privacy-eligible photo is actually available.
        "has_photo": bool(public_photo_url and u.get("photo_status") == "approved"),
        "phone_verified": phone_verified,
        "selfie_verified": bool(u.get("selfie_verified", False)),
        "photo_verified": photo_verified,
        "id_verified": id_verified,
        "verification_level": verification_level,
        # 🔒 CONTACT LOCK — public la kanipinchE prathi profile ki idi untundi
        "phone_masked": mask_phone(u.get("phone", "")),
        "contact_locked": True,
        "contact_note_telugu": "🔒 Public profile లో number చూపించము. Profile owner accept చేసిన తర్వాత accepted-request account views లో contact access వస్తుంది; paid credits consent‌ను bypass చేయవు.",
    }
    # Defense in depth for imported/legacy records: member-entered text fields must not
    # bypass the structured contact lock by embedding a phone number or email address.
    return sanitize_public_payload(public)


def daily_sent_count(interests: List[Dict], from_id: str) -> int:
    today = _now().strftime("%Y-%m-%d")
    return len([i for i in interests
                if i["from_id"] == from_id and str(i.get("created_at", "")).startswith(today)
                and i.get("status") != "withdrawn"])


def existing_request(interests: List[Dict], from_id: str, to_id: str) -> Optional[Dict]:
    for i in interests:
        if i["from_id"] == from_id and i["to_id"] == to_id and i.get("status") in ("pending", "accepted"):
            return i
    return None


def expire_old(interests: List[Dict], users: Optional[List[Dict]] = None) -> int:
    """Expire unanswered requests and return their spent request credit once.

    ``users`` is supplied by the API so the credit is actually restored, not just
    described as refunded in the UI. The record flag makes repeated inbox/sent
    reads idempotent. Legacy callers without a user store still get status-only
    expiry; production API routes always pass the user list.
    """
    if not AUTO_EXPIRE_CHECK:
        return 0
    changed = 0
    limit = _now() - timedelta(days=EXPIRY_DAYS)
    by_id = {str(user.get("tsap_id", "")): user for user in (users or []) if user.get("tsap_id")}
    with _EXPIRY_LOCK:
        for record in interests:
            if record.get("status") not in ("pending", "expired"):
                continue
            try:
                if datetime.fromisoformat(str(record.get("created_at", ""))) >= limit:
                    continue
            except (TypeError, ValueError):
                continue

            record_changed = False
            if record.get("status") == "pending":
                record["status"] = "expired"
                record["status_at"] = _now().isoformat()
                record_changed = True

            requester = by_id.get(str(record.get("from_id", "")))
            if requester is not None and not record.get("credit_refunded"):
                try:
                    spent = max(1, int(record.get("credit_spent", 1) or 1))
                except (TypeError, ValueError):
                    spent = 1
                requester["credits"] = max(0, int(requester.get("credits", 0) or 0)) + spent
                record["credit_refunded"] = True
                record["credit_refund_reason"] = "expired_no_response"
                record["credit_refunded_at"] = _now().isoformat()
                record_changed = True

            if record_changed:
                changed += 1
    return changed


# ------------------------------------------------------------------ core flow
def can_send_interest(frm: Dict, to: Dict, interests: List[Dict]) -> Tuple[bool, str]:
    if not frm or not to:
        return False, "TSAP ID correct గా ఇవ్వండి"
    if frm.get("tsap_id") == to.get("tsap_id"):
        return False, "మీ profile కి మీరు request pampalervu 🙂"
    g1, g2 = (frm.get("gender") or "").lower(), (to.get("gender") or "").lower()
    if g1 and g2 and g1 == g2:
        return False, "Telugu matrimony లో opposite gender కి మాత్రమే interest pampali"
    if existing_request(interests, frm["tsap_id"], to["tsap_id"]):
        return False, "ఈ profile కి already request pampincharu — reply కోసం wait చెయ్యండి"
    if int(frm.get("credits", 0)) <= 0:
        return False, "credits_ledu"
    if daily_sent_count(interests, frm["tsap_id"]) >= MAX_PER_DAY:
        return False, f"Rojuki {MAX_PER_DAY} requests limit — రేపు మళ్లీ try చెయ్యండి (spam block)"
    return True, "ok"


def create_interest(frm: Dict, to: Dict, note: str = "", score: Optional[int] = None,
                    reasons: Optional[List[str]] = None, channel: str = "website",
                    observations: Optional[List[str]] = None) -> Dict:
    """Create a consent request; legacy scores are ignored and factual details stay neutral."""
    factual_observations = observations if observations is not None else reasons
    rec = {
        "request_id": _id("REQ"),
        "from_id": frm["tsap_id"],
        "to_id": to["tsap_id"],
        "from_name": frm.get("full_name", ""),
        "to_name": to.get("full_name", ""),
        "note": (note or "").strip()[:280],
        "observations": (factual_observations or [])[:4],
        "status": "pending",           # pending | accepted | declined | expired | withdrawn
        "channel": channel,
        "credit_spent": 1,
        "credit_refunded": False,
        "contact_shared": False,
        "created_at": _now().isoformat(),
        "status_at": _now().isoformat(),
        "expires_at": (_now() + timedelta(days=EXPIRY_DAYS)).isoformat(),
    }
    return rec


def respond_interest(rec: Dict, owner: Dict, requester: Dict, action: str) -> Dict:
    """Owner accept/decline; acceptance grants in-service contact access."""
    action = (action or "").lower()
    if rec.get("status") != "pending":
        return {"success": False, "message": f"ఈ request already {rec.get('status')} — ఇంకా action లేదు"}
    rec["status_at"] = _now().isoformat()
    out = {"success": True, "request_id": rec["request_id"], "action": action}
    if action == "accept":
        rec["status"] = "accepted"
        rec["contact_shared"] = True
        out["owner_phone"] = owner.get("phone", "")
        out["requester_phone"] = requester.get("phone", "")
        out["contact_access_granted"] = True
        out["message"] = "✅ Accept అయ్యింది — accepted-request account views లో contact access అందుబాటులో ఉంది; notification delivery నిర్ధారించబడలేదు."
    elif action == "decline":
        rec["status"] = "declined"
        if REFUND_ON_DECLINE:
            rec["credit_refunded"] = True
            out["refund"] = 1
        out["message"] = "Request decline అయ్యింది" + (" — మీ credit refund అయ్యింది ✅" if REFUND_ON_DECLINE else "")
    elif action == "withdraw":
        rec["status"] = "withdrawn"
        out["message"] = "Request withdraw అయ్యింది"
    else:
        return {"success": False, "message": "action = accept | decline | withdraw"}
    return out


# ------------------------------------------------------------------ WhatsApp texts
def interest_to_owner_text(requester: Dict, owner: Dict, rec: Dict) -> str:
    """Owner కి message — requester profile (idi user adigina 'profile share')."""
    r = safe_user(requester)
    observations = "\n".join(f"  • {x}" for x in (rec.get("observations") or [])[:3])
    verification_fact = {
        "phone": "📱 Phone OTP check recorded",
        "photo": "📷 Photo review recorded",
        "id": "🪪 ID review recorded",
    }.get(str(r.get("verification_level") or ""), "")
    return (
        f"💌 *MANA VIVAHA — మీ ప్రొఫైల్‌కు INTEREST వచ్చింది!*\n"
        f"━━━━━━━━━━━━━━━━\n"
        f"మీ ప్రొఫైల్ వివరాలు చూసి క్రింది వారు సంబంధం కోసం ఆసక్తి (Interest) తెలిపారు 👇\n\n"
        f"👤 *{r['full_name']}*  ({r['age']} సం.)\n"
        f"🆔 {r['tsap_id']}{f'  • {verification_fact}' if verification_fact else ''}\n"
        f"🎓 {r['education']} {r['education_detail']}\n"
        f"💼 {r['job']} {r['company']}\n"
        f"💰 {r['salary']}  |  📏 {r['height']}\n"
        f"📍 {r['district']}, {r['state']}{'  •  💼 ' + r['work_location'] if r['work_location'] else ''}\n"
        f"💍 {r['caste']}{' / ' + r['sub_caste'] if r['sub_caste'] else ''}"
        f"{'  |  గోత్రం: ' + r['gothram'] if r['gothram'] else ''}\n"
        f"🌟 నక్షత్రం / రాశి (సభ్యుడు నమోదు చేసినవి; verify అయిన జాతకం కాదు): {r['star'] or '—'}  |  {r['rasi'] or '—'}\n"
        + (f"📝 *చూడటానికి profile వివరాలు (match verdict కాదు):*\n{observations}\n" if observations else "")
        + (f"📝 *సందేశం:* \"{rec['note']}\"\n" if rec.get("note") else "")
        + f"━━━━━━━━━━━━━━━━\n"
        f"📸 ఫోటో & పూర్తి వివరాలు: {SITE}/search/{r['tsap_id']}\n\n"
        f"👉 *1-క్లిక్‌తో ఆమోదించడానికి (Accept / Decline):*\n"
        f"🔗 {SITE}/requests?id={owner.get('tsap_id','')}\n\n"
        f"✅ *Accept* చేస్తే → accepted-request account views లో ఇరువైపుల contact details అందుబాటులోకి వస్తాయి.\n"
        f"ℹ️ Configured WhatsApp notification queue కావచ్చు; delivery హామీ లేదు.\n"
        f"❌ *Decline* చేస్తే → మర్యాదపూర్వకంగా తెలియజేయబడుతుంది.\n"
        f"🚫 Chatting లేదు — *డైరెక్ట్ ఫ్యామిలీ కాంటాక్ట్ మాత్రమే* (Direct Contact Only).\n"
        f"🆔 Request ID: {rec['request_id']}  •  ⏳ 7 రోజులు చెల్లుబాటు అవుతుంది\n"
        f"⚠️ మన వివాహ ఎప్పుడూ ముందస్తు అడ్వాన్స్ డబ్బులు అడగదు{SUPPORT_SUFFIX}"
    )


def interest_accepted_text(requester: Dict, owner: Dict, rec: Dict) -> str:
    """Requester notification; contact access comes from acceptance, delivery is not implied."""
    o = safe_user(owner)
    phone = str(owner.get("phone", "") or "").strip()
    phone_line = f"📞 *{phone}*" if phone else f"📞 మీ accepted request చూడండి: {SITE}/requests?id={requester.get('tsap_id','')}"
    return (
        f"🎉 *మన వివాహ (MANA VIVAHA) — శుభవార్త! మీ interest ఆమోదించబడింది!*\n"
        f"━━━━━━━━━━━━━━━━\n"
        f"👤 *{o['full_name']}* ({o['tsap_id']}) మీ request ను accept చేశారు ✅\n\n"
        f"📞 *వారి contact:* {phone_line}\n"
        f"📍 *ప్రాంతం:* {o['district']}, {o['state']}  |  💍 *కమ్యూనిటీ:* {o['caste']}\n"
        f"🎓 *విద్య:* {o['education']}  |  💼 *వృత్తి:* {o['job']}\n\n"
        f"Accepted request లో మీ account ద్వారా contact details చూడవచ్చు. ఈ WhatsApp message queue/notification మాత్రమే; delivery నిర్ధారించబడలేదు.\n"
        f"💐 *మన వివాహ బృందం తరఫున శుభాకాంక్షలు!*\n"
        f"{SUPPORT_HELP_LINE}"
        f"⚠️ ముందస్తు అడ్వాన్స్ డబ్బులు / బంగారం అడిగితే independently verify చేసి report చేయండి."
    )


def interest_accepted_owner_text(owner: Dict, requester: Dict, rec: Dict) -> str:
    """Owner notification; explicitly identifies the requester's contact after acceptance."""
    r = safe_user(requester)
    phone = str(requester.get("phone", "") or "").strip()
    phone_line = f"📞 *{phone}*" if phone else f"📞 మీ accepted request చూడండి: {SITE}/requests?id={owner.get('tsap_id','')}"
    return (
        f"✅ *మన వివాహ — మీరు interest ను accept చేశారు*\n"
        f"━━━━━━━━━━━━━━━━\n"
        f"👤 *Request చేసినవారు:* {r['full_name']} ({r['tsap_id']})\n"
        f"📞 *వారి contact:* {phone_line}\n\n"
        f"Accepted request లో requester contact మీ account view లో కూడా అందుబాటులో ఉంటుంది.\n"
        f"ఈ WhatsApp message queue/notification మాత్రమే; delivery నిర్ధారించబడలేదు.\n"
        f"⚠️ ముందస్తు అడ్వాన్స్ డబ్బులు / బంగారం అడిగితే independently verify చేసి report చేయండి."
    )


def interest_declined_text(requester: Dict, owner: Dict, rec: Dict) -> str:
    o = safe_user(owner)
    credits_left = requester.get("credits", 0)
    caste_filter = f"?caste={o.get('caste', '')}" if o.get("caste") else ""
    refund_line = (
        f"మీ account కు 1 request credit తిరిగి వచ్చింది (credits: {credits_left}); ఇది cash refund కాదు."
        if REFUND_ON_DECLINE and rec.get("credit_refunded") else
        "ఈ decline పై request credit తిరిగి రాలేదు; account లోని refund policy చూడండి."
    )
    return (
        f"🙏 *మన వివాహ (MANA VIVAHA) — సంబంధం అప్‌డేట్*\n"
        f"━━━━━━━━━━━━━━━━\n"
        f"👤 *{o['full_name']}* ({o['tsap_id']}) ఈ interest request ను accept చేయలేదు.\n\n"
        f"{refund_line}\n\n"
        f"💚 *ఇతర profiles ను పరిశీలించండి:*\n"
        f"జాబితాలోని వివరాలు సభ్యులు అందించినవి; మీకు అవసరమైన వివరాలను స్వతంత్రంగా నిర్ధారించండి 👇\n"
        f"🔗 {SITE}/matches{caste_filter}\n\n"
        f"💡 స్పందన సమయం recipient పై ఆధారపడుతుంది; హామీ లేదు.\n"
        f"🆔 Request ID: {rec['request_id']}"
    )


def interest_notify_text(requester: Dict, owner: Dict, rec: Dict) -> str:
    """Requester కి confirmation (మన WhatsApp నుంచి)."""
    o = safe_user(owner)
    return (
        f"✅ *మన వివాహ — సంబంధం ఆసక్తి (Interest) విజయవంతంగా పంపబడింది!*\n"
        f"━━━━━━━━━━━━━━━━\n"
        f"👤 ఎవరికి: *{o['full_name']}* ({o['tsap_id']}) — {o['district']}, {o['caste']}\n"
        f"🆔 Request ID: {rec['request_id']}\n"
        f"⏳ వారి స్పందన ఎప్పుడు వస్తుందో recipient పై ఆధారపడి ఉంటుంది; response సమయానికి హామీ లేదు.\n"
        f"📊 మిగిలిన క్రెడిట్స్: {requester.get('credits', 0)}\n"
        f"📸 వారి ప్రొఫైల్: {SITE}/search/{o['tsap_id']}\n\n"
        f"🔒 *భద్రతా విధానం:* వారు ఆమోదించిన వెంటనే మాత్రమే వారి ఫోన్ నంబర్ మీకు అందించబడుతుంది.\n"
        f"{('💡 సహాయం కోసం: ' + SUPPORT) if SUPPORT else '💡 సహాయం కోసం మీ account dashboard చూడండి.'}"
    )


# ------------------------------------------------------------------ inbox views
def inbox_for(user: Dict, users: List[Dict], interests: List[Dict]) -> Dict:
    """Received requests — contact owner accept చేసిన తర్వాత మాత్రమే కనిపిస్తుంది."""
    me = user["tsap_id"]
    recv = [i for i in interests if i["to_id"] == me]
    recv.sort(key=lambda x: (x.get("status") != "pending", x.get("created_at", "")), reverse=False)
    out = []
    for i in recv:
        req_user = next((u for u in users if u["tsap_id"] == i["from_id"]), None)
        item = dict(i)
        # Strip old numeric match/trust fields and generated reasons from persisted requests.
        for key in ("score", "match_score", "compatibility_score", "trust_score", "grade", "reasons"):
            item.pop(key, None)
        item["requester"] = safe_user(req_user)
        item["requester_phone"] = (req_user or {}).get("phone", "") if i.get("contact_shared") else "🔒 accept చెయ్యండి"
        item["actions"] = ["accept", "decline"] if i.get("status") == "pending" else []
        out.append(item)
    return {
        "tsap_id": me,
        "pending": len([x for x in out if x["status"] == "pending"]),
        "accepted": len([x for x in out if x["status"] == "accepted"]),
        "declined": len([x for x in out if x["status"] == "declined"]),
        "expired": len([x for x in out if x["status"] == "expired"]),
        "received": out,
    }


def sent_for(user: Dict, users: List[Dict], interests: List[Dict]) -> Dict:
    me = user["tsap_id"]
    sent = [i for i in interests if i["from_id"] == me]
    sent.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    out = []
    for i in sent:
        to_user = next((u for u in users if u["tsap_id"] == i["to_id"]), None)
        item = dict(i)
        # Do not surface legacy score labels or unreviewed generated reasons.
        # Factual observations on newly-created requests are neutral and explicit.
        for key in ("score", "match_score", "compatibility_score", "trust_score", "grade", "reasons"):
            item.pop(key, None)
        item["profile"] = safe_user(to_user)
        item["contact"] = (to_user or {}).get("phone", "") if i.get("status") == "accepted" else "🔒 accept అయ్యాక"
        out.append(item)
    return {
        "tsap_id": me,
        "pending": len([x for x in out if x["status"] == "pending"]),
        "accepted": len([x for x in out if x["status"] == "accepted"]),
        "sent": out,
    }
