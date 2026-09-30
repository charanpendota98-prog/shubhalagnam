"""
💳 WAVE 14 — SAFE PAYMENTS + FESTIVAL OFFERS (మన వివాహ)
==========================================================
SAFETY FIRST (user demand — mistakes/errors vaddu):
  1. Amount SERVER compute chesthundi (client amount nammamu — tamper proof).
  2. Razorpay signature HMAC-SHA256 verify → SUCCESS ayithe MATRAMe fulfill.
  3. Idempotent: replay/double-click → okka sari matrame credit (receipt reuse).
  4. SECRET eppudu expose kadu — /api/pay/config lo key_id (public) matrame.
  5. Keys lekapothe → honest MANUAL-UPI mode (admin UTR confirm → fulfill).

Purposes: credits (S_29..S_499 plan) · assisted (ORD-xxxx) · ads (AD-xxxx) · boost (B_1/3/7).
Offers: festival promo codes (%/flat off, dates, applies_to, usage cap) — ADMIN lone create.
"""
from __future__ import annotations

import hashlib
import hmac
import json
import os
import re
import threading
from collections import defaultdict
from datetime import datetime
from typing import Dict, List, Optional

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PERSIST_FILE = os.path.join(BASE_DIR, "paypro14.json")

PAY_ORDERS: List[Dict] = []

# 🌊 WAVE 25 — PIN-TO-PIN SECURE PAY
ORDER_EXPIRY_HOURS = 24          # pending order 24h lo pay kakapothe expire (stale confirm ban)
UTR_RE = re.compile(r"^\d{12}$")  # UPI ref / bank UTR = 12 digits (PhonePe/GPay statement)
_ORDER_LOCKS: Dict[str, threading.Lock] = defaultdict(threading.Lock)
_OFFER_LOCK = threading.Lock()  # WAVE 34: offer consume race-proof (cap overshoot ban)


def valid_utr(utr: str) -> bool:
    """UTR/UPI-ref = exactly 12 digits (screenshot/statement నుంచి)."""
    return bool(UTR_RE.fullmatch((utr or "").strip()))


def _order_age_hours(po: Dict) -> float:
    try:
        dt = datetime.strptime(str(po.get("created_at", ""))[:19], "%Y-%m-%dT%H:%M:%S")
        return (datetime.utcnow() - dt).total_seconds() / 3600.0
    except Exception:
        return 0.0


def order_expired(po: Dict) -> bool:
    """created/claimed order 24h datithe expire — కొత్త order mandatory (amount/plan drift proof)."""
    if (po.get("status") or "") not in ("created", "claimed"):
        return False
    return _order_age_hours(po) > ORDER_EXPIRY_HOURS


def utr_used_elsewhere(utr: str, exclude_order_id: str = "") -> Optional[str]:
    """Same UTR మళ్లీ vadakudadu — edo order లో paid/claimed ayyinda? → order id."""
    u = (utr or "").strip()
    if not u:
        return None
    for o in PAY_ORDERS:
        if o.get("id") == exclude_order_id:
            continue
        if (o.get("utr") or o.get("claim_utr") or "").strip() == u and                 (o.get("status") in ("paid", "claimed") or o.get("utr")):
            return o.get("id", "")
    return None   # our orders (pay_ord_xxx)
RECEIPTS: Dict[str, Dict] = {}  # razorpay_payment_id → receipt (idempotency)
OFFERS: List[Dict] = []        # festival promo codes
_SEQ = 0


def _now() -> str:
    return datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S")


def _persist() -> None:
    try:
        with open(PERSIST_FILE, "w", encoding="utf-8") as f:
            json.dump({"orders": PAY_ORDERS[-1000:], "offers": OFFERS[-200:]}, f, ensure_ascii=False)
    except Exception:
        pass


def _restore() -> None:
    global _SEQ
    try:
        if os.path.exists(PERSIST_FILE):
            d = json.load(open(PERSIST_FILE, encoding="utf-8")) or {}
            PAY_ORDERS.extend(d.get("orders", []))
            OFFERS.extend(d.get("offers", []))
            for o in PAY_ORDERS:
                try:
                    _SEQ = max(_SEQ, int(str(o.get("id", "pay_ord_0")).split("_")[-1]))
                except Exception:
                    pass
    except Exception:
        pass


_restore()

# ---------------------------------------------------------------------------
# CONFIG (secret eppudu bayataki raadu)
# ---------------------------------------------------------------------------

def pay_config() -> Dict:
    """Public config — key_id matrame (secret NEVER)."""
    key_id = _key_id()
    secret = _secret()
    upi = os.getenv("PAY_UPI_ID", "9394483300@ybl")
    live = bool(key_id and secret)
    return {"mode": "razorpay" if live else "manual_upi",
            "key_id": key_id if live else "",
            "upi_id": upi,
            "note_telugu": ("💳 Online pay ready (Razorpay)" if live
                            else f"💳 UPI manual: {upi} కి pay చేసి UTR పంపండి — admin confirm చేస్తాడు")}


def _key_id() -> str:
    """Razorpay key id - RAZORPAY_KEY_ID primary, RAZORPAY_KEY legacy (.env old style)."""
    return (os.getenv("RAZORPAY_KEY_ID", "").strip()
            or os.getenv("RAZORPAY_KEY", "").strip())


def _secret() -> str:
    """Razorpay secret - RAZORPAY_KEY_SECRET primary, RAZORPAY_SECRET legacy."""
    return (os.getenv("RAZORPAY_KEY_SECRET", "").strip()
            or os.getenv("RAZORPAY_SECRET", "").strip())


# ---------------------------------------------------------------------------
# OFFERS (festival codes — ADMIN lone)
# ---------------------------------------------------------------------------
FESTIVAL_PRESETS = [
    {"code": "DIWALI25", "title": "🪔 Diwali Dhamaka — 25% OFF", "pct_off": 25, "flat_off": 0,
     "applies_to": ["credits", "assisted", "ads", "boost"], "festival": "Diwali"},
    {"code": "SANKRANTI20", "title": "🪁 Sankranti — 20% OFF", "pct_off": 20, "flat_off": 0,
     "applies_to": ["credits", "assisted", "ads"], "festival": "Sankranti"},
    {"code": "UGADI15", "title": "🌾 Ugadi — 15% OFF", "pct_off": 15, "flat_off": 0,
     "applies_to": ["credits", "assisted"], "festival": "Ugadi"},
    {"code": "FIRST50", "title": "🎉 First order — flat ₹50 OFF (₹199+)", "pct_off": 0, "flat_off": 50,
     "applies_to": ["credits", "assisted"], "festival": "Welcome", "min_amount": 199},
]


def seed_festivals(valid_from: str = "", valid_to: str = "", max_uses: int = 1000) -> Dict:
    """Admin 1-click: preset festival codes activate (dates తో)."""
    added = []
    have = {o.get("code") for o in OFFERS}
    for p in FESTIVAL_PRESETS:
        if p["code"] in have:
            continue
        o = dict(p, valid_from=valid_from, valid_to=valid_to, max_uses=max_uses,
                 used=0, active=True, created_at=_now())
        OFFERS.append(o)
        added.append(o["code"])
    _persist()
    return {"success": True, "added": added,
            "message_telugu": f"✅ {len(added)} festival offers activate: {', '.join(added) or 'already unnai'}"}


def create_offer(code: str, title: str, pct_off: int = 0, flat_off: int = 0,
                 applies_to: Optional[List[str]] = None, valid_from: str = "",
                 valid_to: str = "", max_uses: int = 100, min_amount: int = 0,
                 festival: str = "", usable_once: bool = True) -> Dict:
    code = str(code or "").strip().upper()
    if len(code) < 3:
        return {"success": False, "message_telugu": "⚠️ Code 3+ chars ఉండాలి"}
    if any(o.get("code") == code for o in OFFERS):
        return {"success": False, "message_telugu": "⚠️ ఈ code already ఉంది"}
    if not pct_off and not flat_off:
        return {"success": False, "message_telugu": "⚠️ % leda flat discount ఇవ్వండి"}
    o = {"code": code, "title": title or code, "pct_off": int(pct_off or 0),
         "flat_off": int(flat_off or 0), "applies_to": applies_to or ["credits"],
         "valid_from": valid_from or "", "valid_to": valid_to or "",
         "max_uses": int(max_uses or 1), "used": 0, "usable_once": bool(usable_once),
         "used_by": [], "min_amount": int(min_amount or 0),
         "festival": festival or "", "active": True, "created_at": _now()}
    OFFERS.append(o)
    _persist()
    return {"success": True, "offer": o, "message_telugu": f"✅ Offer {code} ready"}


def get_offer(code: str) -> Optional[Dict]:
    return next((o for o in OFFERS if o.get("code") == str(code or "").strip().upper()), None)


def delete_offer(code: str) -> Dict:
    """ADMIN: offer/promo delete (used history stays in pay orders)."""
    global OFFERS
    code = (code or "").strip().upper()
    before = len(OFFERS)
    OFFERS = [o for o in OFFERS if str(o.get("code", "")).upper() != code]
    if len(OFFERS) == before:
        return {"success": False, "message_telugu": "⚠️ Offer code దొరకలేదు"}
    _persist()
    return {"success": True, "message_telugu": f"🗑️ {code} delete అయ్యింది"}


def validate_offer(code: str, purpose: str, amount: int, user_id: str = "") -> Dict:
    """Code valid aa? → {ok, final_amount, discount, reason}."""
    if not code:
        return {"ok": True, "code": "", "final_amount": amount, "discount": 0}
    o = get_offer(code)
    if not o or not o.get("active"):
        return {"ok": False, "reason": "bad_code", "message_telugu": "⚠️ Offer code valid కాదు"}
    today = datetime.utcnow().strftime("%Y-%m-%d")
    if o.get("valid_from") and today < o["valid_from"][:10]:
        return {"ok": False, "reason": "not_started", "message_telugu": "⚠️ Offer ఇంకా start కాలేదు"}
    if o.get("valid_to") and today > o["valid_to"][:10]:
        return {"ok": False, "reason": "expired", "message_telugu": "⚠️ Offer expire అయ్యింది"}
    if int(o.get("used", 0)) >= int(o.get("max_uses", 1)):
        return {"ok": False, "reason": "exhausted", "message_telugu": "⚠️ Offer limit ayipoyindi"}
    if o.get("usable_once", True) and user_id and str(user_id).strip().upper() in [str(x).upper() for x in (o.get("used_by") or [])]:
        return {"ok": False, "reason": "already_used",
                "message_telugu": "⚠️ ఈ code ని మీరు already vadaru (okkasari మాత్రమే)"}
    if purpose not in (o.get("applies_to") or []):
        return {"ok": False, "reason": "not_applicable",
                "message_telugu": f"⚠️ ఈ offer {purpose} కి apply కాదు"}
    if amount < int(o.get("min_amount", 0) or 0):
        return {"ok": False, "reason": "min_amount",
                "message_telugu": f"⚠️ Minimum ₹{o['min_amount']} ఉండాలి"}
    disc = int(amount * int(o.get("pct_off", 0) or 0) / 100) + int(o.get("flat_off", 0) or 0)
    disc = min(disc, amount - 1) if amount > 1 else 0
    return {"ok": True, "code": o["code"], "final_amount": amount - disc, "discount": disc,
            "title": o.get("title", "")}


def active_offers() -> List[Dict]:
    """Public: ippudu live offers (banner + pricing)."""
    today = datetime.utcnow().strftime("%Y-%m-%d")
    out = []
    for o in OFFERS:
        if not o.get("active"):
            continue
        if o.get("valid_from") and today < o["valid_from"][:10]:
            continue
        if o.get("valid_to") and today > o["valid_to"][:10]:
            continue
        if int(o.get("used", 0)) >= int(o.get("max_uses", 1)):
            continue
        out.append({k: o.get(k) for k in
                    ("code", "title", "pct_off", "flat_off", "applies_to", "valid_to", "festival")})
    return out


def _consume_offer(code: str, user_id: str = "") -> None:
    with _OFFER_LOCK:  # 🌊 WAVE 34: concurrent verify → cap overshoot ban
        o = get_offer(code) if code else None
        if o:
            o["used"] = int(o.get("used", 0)) + 1
            if user_id and str(user_id).strip().upper() not in [str(x).upper() for x in (o.get("used_by") or [])]:
                o.setdefault("used_by", []).append(str(user_id).strip().upper())
            _persist()


# ---------------------------------------------------------------------------
# ORDERS (amount SERVER compute — client amount nammamu)
# ---------------------------------------------------------------------------
def _expected_amount(purpose: str, ref: str) -> Dict:
    """Purpose + ref → server-side amount (single money truth)."""
    from interest import get_plan  # lazy
    purpose = (purpose or "").lower()
    if purpose == "credits":
        plan = get_plan(ref)
        if (plan.get("code") or "FREE") == "FREE":
            return {"ok": False, "message_telugu": "⚠️ Plan code S_29/S_99/S_199/S_299/S_499 మాత్రమే"}
        return {"ok": True, "amount": int(plan["price"]), "label": plan.get("telugu", plan.get("label", ref)),
                "credits": int(plan.get("profiles", 0))}
    if purpose == "assisted":
        import smart12 as S12  # lazy
        o = S12.get_order(ref)
        if not o:
            return {"ok": False, "message_telugu": "⚠️ Assist order దొరకలేదు"}
        if o.get("status") not in ("requested",):
            return {"ok": False, "message_telugu": f"⚠️ Order already {o.get('status')} — మళ్లీ pay వద్దు"}
        return {"ok": True, "amount": int(o.get("amount", 500)), "label": f"Assisted {ref} (₹500 service)"}
    if purpose == "ads":
        import ads as ADS  # lazy
        c = ADS.get_campaign(ref)
        if not c:
            return {"ok": False, "message_telugu": "⚠️ Campaign దొరకలేదు"}
        if c.get("status") not in ("pending",):
            return {"ok": False, "message_telugu": f"⚠️ Campaign already {c.get('status')}"}
        return {"ok": True, "amount": int(c.get("amount", 0)), "label": f"Ad campaign {ref}"}
    if purpose == "boost":
        import advanced11 as A11  # lazy
        pack = A11.BOOST_PACKS.get(str(ref).upper())
        if not pack:
            return {"ok": False, "message_telugu": "⚠️ Boost pack B_1/B_3/B_7 మాత్రమే"}
        return {"ok": True, "amount": int(pack["price"]), "label": pack.get("label", ref)}
    return {"ok": False, "message_telugu": "⚠️ purpose: credits/assisted/ads/boost మాత్రమే"}


def _rzp_create_order(pay_order_id: str, amount_rs: int, label: str) -> Dict:
    """🌊 WAVE 25 — Razorpay Order SERVER creates (secret backend lone).
    Frontend ki order_id matrame → checkout → signature verify → fulfill.
    Frontend amount/order trust CHEYYAM — anni server-side."""
    import requests  # lazy
    key_id = _key_id()
    secret = _secret()
    if not key_id or not secret:
        return {"ok": False, "message_telugu": "⚠️ Online pay configure కాలేదు (keys లేదు) — UPI manual తో try చెయ్యండి"}
    try:
        r = requests.post(
            "https://api.razorpay.com/v1/orders",
            auth=(key_id, secret),
            json={"amount": int(amount_rs) * 100, "currency": "INR",
                  "receipt": pay_order_id[:40], "notes": {"pay_order": pay_order_id, "label": label[:100]}},
            timeout=15)
        if r.status_code not in (200, 201):
            return {"ok": False, "message_telugu": "⚠️ Razorpay order create fail — మళ్లీ try చెయ్యండి (డబ్బులు cut avvavu)"}
        j = r.json()
        if not j.get("id") or int(j.get("amount", 0)) != int(amount_rs) * 100:
            return {"ok": False, "message_telugu": "⚠️ Razorpay amount mismatch — order create కాలేదు (safe abort)"}
        return {"ok": True, "rzp_order_id": j["id"], "rzp_amount": int(j["amount"])}
    except Exception:
        return {"ok": False, "message_telugu": "⚠️ Razorpay reach avvatledu — network/మళ్లీ try (UPI manual కూడా ఉంది)"}


def create_pay_order(tsap_id: str, purpose: str, ref: str, offer_code: str = "") -> Dict:
    """Pay order create — amount server-side + offer apply + Razorpay/manual mode."""
    global _SEQ
    exp = _expected_amount(purpose, ref)
    if not exp.get("ok"):
        return {"success": False, "message_telugu": exp.get("message_telugu")}
    off = validate_offer(offer_code, purpose.lower(), exp["amount"], tsap_id)
    if not off.get("ok"):
        return {"success": False, "message_telugu": off.get("message_telugu")}
    _SEQ += 1
    cfg = pay_config()
    po = {"id": f"pay_ord_{_SEQ:05d}", "tsap_id": tsap_id, "purpose": purpose.lower(),
          "ref": ref, "amount": exp["amount"], "final_amount": off["final_amount"],
          "discount": off["discount"], "offer_code": off.get("code", ""),
          "label": exp["label"], "mode": cfg["mode"], "status": "created",
          "rzp_order_id": "", "rzp_amount": 0, "payment_id": "", "utr": "",
          "claim_utr": "", "claimed_at": "", "created_at": _now(),
          "paid_at": "", "receipt": None}
    if cfg["mode"] == "razorpay":
        # 🌊 WAVE 25: RZP order server-side MUST succeed — lekapothe dangling order vaddu
        rz = _rzp_create_order(po["id"], po["final_amount"], po["label"])
        if not rz.get("ok"):
            _SEQ -= 1
            return {"success": False, "message_telugu": rz.get("message_telugu")}
        po["rzp_order_id"] = rz["rzp_order_id"]
        po["rzp_amount"] = rz["rzp_amount"]
    PAY_ORDERS.append(po)
    _persist()
    out = {"success": True, "pay_order": {k: po[k] for k in
           ("id", "purpose", "ref", "amount", "final_amount", "discount", "offer_code",
            "label", "mode", "status")},
           "message_telugu": (f"✅ Order {po['id']} — ₹{po['final_amount']} pay చెయ్యండి"
                               + (f" (offer {off['code']}: -₹{off['discount']})" if off.get("code") else ""))}
    if cfg["mode"] == "razorpay":
        # 🌊 WAVE 25: frontend checkout ee order_id tho — verify lo signature + id + amount match
        out["pay_order"]["key_id"] = cfg["key_id"]
        out["pay_order"]["rzp_order_id"] = po["rzp_order_id"]
        out["pay_order"]["checkout_amount_paise"] = po["final_amount"] * 100
        out["next_telugu"] = "💳 Razorpay checkout లో pay చేసి → /api/pay/verify కి పంపండి"
    else:
        out["pay_order"]["upi_id"] = cfg["upi_id"]
        out["next_telugu"] = f"💳 {cfg['upi_id']} కి ₹{po['final_amount']} pay చేసి UTR admin కి పంపండి"
    return out


def get_pay_order(pid: str) -> Optional[Dict]:
    return next((o for o in PAY_ORDERS if o.get("id") == pid), None)


# ---------------------------------------------------------------------------
# VERIFY + FULFILL (signature OK ayithe MATRAMe credits — idempotent)
# ---------------------------------------------------------------------------
def _hmac_ok(rzp_order_id: str, payment_id: str, signature: str) -> bool:
    secret = _secret()
    if not secret or not rzp_order_id or not payment_id or not signature:
        return False
    msg = f"{rzp_order_id}|{payment_id}".encode()
    good = hmac.new(secret.encode(), msg, hashlib.sha256).hexdigest()
    return hmac.compare_digest(good, str(signature))


def _capture_check_enabled() -> bool:
    """🌊 WAVE 34 PREMIUM: Razorpay-side capture confirm (prod recommended).
    HMAC matrame authorized (not captured) payment ki kooda valid — kabatti
    RAZORPAY_VERIFY_CAPTURE=1 ayithe /v1/payments/{id} lo captured+amount verify."""
    return os.getenv("RAZORPAY_VERIFY_CAPTURE", "").strip().lower() in ("1", "true", "yes", "on")


def _rzp_payment_status(payment_id: str) -> Dict:
    """Razorpay payment live status (secret backend lone). Fail-closed dict."""
    import requests  # lazy
    key_id = _key_id()
    secret = _secret()
    if not key_id or not secret or not payment_id:
        return {"captured": False, "amount": 0, "status": "", "error": "no_keys"}
    try:
        r = requests.get("https://api.razorpay.com/v1/payments/%s" % payment_id,
                         auth=(key_id, secret), timeout=12)
        j = r.json() if r.status_code == 200 else {}
        if not j.get("id"):
            return {"captured": False, "amount": 0, "status": "",
                    "error": str((j.get("error") or {}).get("description") or "fetch_fail")[:120]}
        return {"captured": (j.get("status") == "captured"),
                "amount": int(j.get("amount", 0) or 0), "status": str(j.get("status", ""))}
    except Exception as e:
        return {"captured": False, "amount": 0, "status": "", "error": str(e)[:100]}


def _fire_referral_commission(user: Dict, po: Dict, payment_id: str) -> None:
    """WAVE 24 — GAP FIX: pay/order flow (Razorpay verify + manual UTR) lo commission
    padatledu! Fulfill success ayina ventane referrer ki Rs50/10% (rules engine vare)."""
    try:
        if not user.get("referred_by"):
            return
        import main as MAIN  # lazy
        from referral import process_referral_payment
        try:
            amt = int(po.get("final_amount", 0) or 0)
        except Exception:
            amt = 0
        res = process_referral_payment(user, user["referred_by"], amt, MAIN.DB_USERS,
                                       payment_id=payment_id or po.get("utr", ""))
        po["referral"] = {"success": bool(res.get("success")),
                          "commission": res.get("commission", 0),
                          "reason": res.get("reason", "")}
    except Exception as e:
        # commission eppudu fulfill ni break cheyyakudadu — log + continue
        try:
            po["referral"] = {"success": False, "reason": "error", "error": str(e)[:100]}
        except Exception:
            pass


def fulfill_order(po: Dict, payment_id: str, via: str) -> Dict:
    """Actual fulfill (main.py users/callbacks తో — Users list inject via param? no: lazy main)."""
    import main as MAIN  # lazy: circles avoid (paypro ← main import, runtime only)
    user = MAIN._find_user(po.get("tsap_id", ""))
    if not user:
        return {"ok": False, "message_telugu": "⚠️ User దొరకలేదు — amount hold (admin refund/credit)"}
    purpose, ref = po.get("purpose"), po.get("ref")
    if purpose == "credits":
        from interest import apply_payment
        applied = apply_payment(user, _expected_amount("credits", ref)["amount"], ref)
        if not applied.get("ok"):
            return {"ok": False, "message_telugu": "⚠️ Plan apply fail — admin chusthadu"}
        _fire_referral_commission(user, po, payment_id)
        return {"ok": True, "credits": user.get("credits", 0), "plan": user.get("plan"),
                "referral": po.get("referral"),
                "message_telugu": f"✅ ₹{po['final_amount']} success — {applied.get('profiles_added', 0)} credits add! Balance: {user.get('credits', 0)} 🎉"}
    if purpose == "assisted":
        import smart12 as S12
        r = S12.mark_order_paid(ref, payment_id or po.get("utr", "") or "RZPAY")
        if not r.get("success"):
            return {"ok": False, "message_telugu": r.get("message_telugu")}
        _fire_referral_commission(user, po, payment_id)
        return {"ok": True, "referral": po.get("referral"),
                "message_telugu": f"✅ Assisted {ref} PAID — admin profiles select చేసి personal గా pampisthadu 🙏"}
    if purpose == "ads":
        import ads as ADS
        r = ADS.approve_campaign(ref, payment_id or po.get("utr", "") or "RZPAY")
        if not r.get("success"):
            return {"ok": False, "message_telugu": r.get("message_telugu")}
        _fire_referral_commission(user, po, payment_id)
        return {"ok": True, "referral": po.get("referral"),
                "message_telugu": f"✅ Campaign {ref} LIVE — {r['campaign']['days']} days 🎉"}
    if purpose == "boost":
        import advanced11 as A11
        eff = A11.apply_boost(user, str(ref).upper())
        _fire_referral_commission(user, po, payment_id)
        return {"ok": True, "referral": po.get("referral"),
                "message_telugu": f"✅ Boost ON! {eff.get('message_telugu', '')} ⚡"}
    return {"ok": False, "message_telugu": "⚠️ Unknown purpose"}


def verify_payment(pay_order_id: str, rzp_order_id: str, payment_id: str,
                   signature: str) -> Dict:
    """
    Razorpay checkout response verify:
      signature OK + pay_order match + rzp_order match + amount sane → fulfill ONCE.
      replay → old receipt (double credit NEVER).
    """
    with _ORDER_LOCKS[str(pay_order_id or "")]:
        return _verify_payment_locked(pay_order_id, rzp_order_id, payment_id, signature)


def _verify_payment_locked(pay_order_id: str, rzp_order_id: str, payment_id: str,
                           signature: str) -> Dict:
    po = get_pay_order(pay_order_id)
    if not po:
        return {"success": False, "message_telugu": "⚠️ Order దొరకలేదు"}
    if po.get("status") == "paid":
        return {"success": True, "duplicate": True, "receipt": po.get("receipt"),
                "message_telugu": "✅ ఈ order already paid — double charge లేదు (idempotent) 🙂"}
    if order_expired(po):
        po["status"] = "expired"
        _persist()
        return {"success": False, "reason": "expired",
                "message_telugu": "⚠️ Order expire అయ్యింది (24h) — కొత్త order create చెయ్యండి"}
    if payment_id and payment_id in RECEIPTS:
        old = RECEIPTS[payment_id]
        return {"success": True, "duplicate": True, "receipt": old,
                "message_telugu": "✅ ఈ payment already use అయ్యింది — మళ్లీ credit ఇవ్వము 🙂"}
    if pay_config()["mode"] != "razorpay":
        return {"success": False, "message_telugu": "⚠️ Online verify off (manual-UPI mode) — admin confirm చేస్తాడు"}
    if po.get("rzp_order_id") and rzp_order_id != po["rzp_order_id"]:
        return {"success": False, "reason": "order_mismatch",
                "message_telugu": "🚫 ఈ payment vere order di — మన order తో match avvaledu (support కి payment ID పంపండి)"}
    if not _hmac_ok(rzp_order_id, payment_id, signature):
        return {"success": False, "reason": "bad_signature",
                "message_telugu": "🚫 Payment verify FAIL — signature mismatch (amount cut అయితే 5-7 days లో auto-refund, leda support కి payment ID పంపండి)"}
    if _capture_check_enabled():
        # WAVE 34: uncaptured (authorized/failed) payment ki credits NEVER
        cap = _rzp_payment_status(payment_id)
        if not cap.get("captured"):
            po["last_capture_check"] = {"at": _now(), "status": cap.get("status", ""),
                                        "error": cap.get("error", "")}
            _persist()
            return {"success": False, "reason": "not_captured",
                    "rzp_status": cap.get("status", ""),
                    "message_telugu": "\u23F3 Payment inka bank side capture \u0C05\u0C35\u0C4D\u0C35\u0C32\u0C47\u0C26\u0C41 (status: %s) \u2014 2 \u0C28\u0C3F\u0C2E\u0C3F\u0C37\u0C3E\u0C32\u0C32\u0C4B \u0C2E\u0C33\u0C4D\u0C32\u0C40 try \u0C1A\u0C46\u0C2F\u0C4D\u0C2F\u0C02\u0C21\u0C3F (\u0C21\u0C2C\u0C4D\u0C2C\u0C41\u0C32\u0C41 safe, credits capture \u0C05\u0C2F\u0C4D\u0C2F\u0C3E\u0C15\u0C47 add)" % (cap.get("status") or "pending")}
        if int(cap.get("amount", 0)) != int(po.get("final_amount", 0) or 0) * 100:
            return {"success": False, "reason": "amount_mismatch",
                    "message_telugu": "\U0001F6AB Razorpay amount (\u20B9%s) \u2260 order amount (\u20B9%s) \u2014 safe abort (support \u0C15\u0C3F payment ID \u0C2A\u0C02\u0C2A\u0C02\u0C21\u0C3F)" % (
                        int(cap.get("amount", 0)) // 100, po.get("final_amount", 0))}
    po["rzp_order_id"] = rzp_order_id
    po["payment_id"] = payment_id
    done = fulfill_order(po, payment_id, "razorpay")
    if not done.get("ok"):
        _persist()
        return {"success": False, "message_telugu": done.get("message_telugu")}
    po["status"] = "paid"
    po["paid_at"] = _now()
    receipt = {"pay_order_id": po["id"], "payment_id": payment_id, "amount": po["final_amount"],
               "purpose": po["purpose"], "ref": po["ref"], "tsap_id": po["tsap_id"],
               "paid_at": po["paid_at"], "detail": done.get("message_telugu")}
    po["receipt"] = receipt
    RECEIPTS[payment_id] = receipt
    if po.get("offer_code"):
        _consume_offer(po["offer_code"], po.get("tsap_id", ""))
    _persist()
    return {"success": True, "receipt": receipt, "message_telugu": receipt["detail"]}


def verify_webhook_signature(raw_body: bytes, signature: str) -> bool:
    """🌊 WAVE 25 — Razorpay webhook auth = HMAC-SHA256(raw_body, secret).
    Signature lekunda/tappu ayithe webhook REJECT (fake fulfill ban)."""
    secret = _secret()
    if not secret or not raw_body or not signature:
        return False
    mac = hmac.new(secret.encode(), raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(mac, str(signature).strip())


def handle_razorpay_webhook(event: Dict) -> Dict:
    """payment.captured/order.paid → auto-fulfill ONCE (idempotent).
    Unknown events → ignore (200)."""
    try:
        name = str((event or {}).get("event", ""))
        ent = ((event or {}).get("payload", {}) or {}).get("payment", {}) or {}
        ent = (ent.get("entity", {}) or {}) if isinstance(ent, dict) else {}
        rzp_order = str(ent.get("order_id", "") or "")
        payment_id = str(ent.get("id", "") or "")
        if name not in ("payment.captured", "payment.authorized", "order.paid") or not rzp_order:
            return {"ok": True, "ignored": True}
        po = next((o for o in PAY_ORDERS if o.get("rzp_order_id") == rzp_order), None)
        if not po:
            return {"ok": True, "ignored": True, "reason": "unknown_order"}
        with _ORDER_LOCKS[po["id"]]:
            if po.get("status") == "paid":
                return {"ok": True, "duplicate": True, "receipt": po.get("receipt")}
            if payment_id and payment_id in RECEIPTS:
                return {"ok": True, "duplicate": True, "receipt": RECEIPTS[payment_id]}
            if name == "payment.authorized":
                # 🌊 WAVE 34 PREMIUM: authorized ≠ captured — డబ్బులు inka bank దగ్గరే!
                # Fulfill CHEYYAM (capture webhook / verify daggara fulfill avutundi).
                po["payment_id"] = payment_id or po.get("payment_id", "")
                po["authorized_at"] = _now()
                _persist()
                return {"ok": True, "pending_capture": True, "pay_order_id": po["id"],
                        "message_telugu": "⏳ Payment authorized — capture webhook kosam wait (credits capture అయ్యాకే)"}
            if order_expired(po):
                po["status"] = "expired"
                _persist()
                return {"ok": False, "reason": "expired"}
            po["payment_id"] = payment_id
            done = fulfill_order(po, payment_id, "razorpay_webhook")
            if not done.get("ok"):
                _persist()
                return {"ok": False, "message_telugu": done.get("message_telugu")}
            po["status"] = "paid"
            po["paid_at"] = _now()
            receipt = {"pay_order_id": po["id"], "payment_id": payment_id, "amount": po["final_amount"],
                       "purpose": po["purpose"], "ref": po["ref"], "tsap_id": po["tsap_id"],
                       "paid_at": po["paid_at"], "detail": done.get("message_telugu"), "via": "webhook"}
            po["receipt"] = receipt
            RECEIPTS[payment_id] = receipt
            if po.get("offer_code"):
                _consume_offer(po["offer_code"], po.get("tsap_id", ""))
            _persist()
            return {"ok": True, "receipt": receipt}
    except Exception as e:
        return {"ok": False, "reason": "error", "error": str(e)[:100]}


def claim_utr(pay_order_id: str, tsap_id: str, utr: str) -> Dict:
    """🌊 WAVE 25 — USER submits UTR in-app (NOT self-confirm!):
    status → claimed → admin queue lo chusi bank statement match chesi confirm.
    Owner route nunchi matrame (mee order ke)."""
    po = get_pay_order(pay_order_id)
    if not po:
        return {"success": False, "message_telugu": "⚠️ Order దొరకలేదు"}
    if str(po.get("tsap_id", "")).upper() != str(tsap_id or "").upper():
        return {"success": False, "reason": "not_yours",
                "message_telugu": "⚠️ ఈ order meedi కాదు"}
    if po.get("status") == "paid":
        return {"success": True, "duplicate": True,
                "message_telugu": "✅ Already paid — credits vachayi 🙂"}
    if order_expired(po):
        po["status"] = "expired"
        _persist()
        return {"success": False, "reason": "expired",
                "message_telugu": "⚠️ Order expire అయ్యింది — కొత్త order చెయ్యండి"}
    if po.get("status") not in ("created", "claimed"):
        return {"success": False, "message_telugu": "⚠️ ఈ order confirm cheyyalem (status: %s)" % po.get("status")}
    if not valid_utr(utr):
        return {"success": False, "reason": "utr_invalid",
                "message_telugu": "⚠️ UTR = 12 digits (GPay/PhonePe statement నుంచి copy చెయ్యండి)"}
    dup = utr_used_elsewhere(utr, exclude_order_id=po["id"])
    if dup:
        return {"success": False, "reason": "utr_reused",
                "message_telugu": "🚫 ఈ UTR already vere order (%s) లో use అయ్యింది" % dup}
    po["claim_utr"] = utr.strip()
    po["claimed_at"] = _now()
    po["status"] = "claimed"
    _persist()
    return {"success": True, "order_id": po["id"],
            "message_telugu": "✅ UTR వచ్చింది! Admin bank statement verify చేసి confirm చేస్తాడు (thwaralone credits add) 🙏"}


def confirm_manual(pay_order_id: str, utr: str) -> Dict:
    """Admin: UPI payment vachhindi (UTR) → fulfill ONCE.
    🌊 WAVE 25: lock + expiry + 12-digit UTR + reuse-block + amount sanity."""
    with _ORDER_LOCKS[str(pay_order_id or "")]:
        return _confirm_manual_locked(pay_order_id, utr)


def _confirm_manual_locked(pay_order_id: str, utr: str) -> Dict:
    po = get_pay_order(pay_order_id)
    if not po:
        return {"success": False, "message_telugu": "⚠️ Order దొరకలేదు"}
    if po.get("status") == "paid":
        return {"success": True, "duplicate": True, "receipt": po.get("receipt"),
                "message_telugu": "✅ Already paid — double credit ఇవ్వము"}
    if order_expired(po):
        po["status"] = "expired"
        _persist()
        return {"success": False, "reason": "expired",
                "message_telugu": "⚠️ Order expire అయ్యింది — user కొత్త order చెయ్యాలి"}
    if po.get("status") not in ("created", "claimed"):
        return {"success": False, "message_telugu": "⚠️ ఈ order confirm cheyyalem (status: %s)" % po.get("status")}
    utr = (utr or "").strip() or (po.get("claim_utr") or "")
    if po.get("status") == "claimed" and not (utr or "").strip():
        utr = po.get("claim_utr", "")
    if not valid_utr(utr):
        return {"success": False, "reason": "utr_invalid",
                "message_telugu": "⚠️ UTR 12 digits ఉండాలి (statement నుంచి verify చెయ్యండి)"}
    dup = utr_used_elsewhere(utr, exclude_order_id=po["id"])
    if dup:
        return {"success": False, "reason": "utr_reused",
                "message_telugu": "🚫 FRAUD BLOCK: ee UTR already %s లో use అయ్యింది!" % dup}
    if int(po.get("final_amount", 0) or 0) <= 0:
        return {"success": False, "reason": "bad_amount",
                "message_telugu": "⚠️ Order amount tappu — కొత్త order చెయ్యండి"}
    po["utr"] = utr.strip()
    done = fulfill_order(po, "", "manual_utr")
    if not done.get("ok"):
        _persist()
        return {"success": False, "message_telugu": done.get("message_telugu")}
    po["status"] = "paid"
    po["paid_at"] = _now()
    receipt = {"pay_order_id": po["id"], "utr": po["utr"], "amount": po["final_amount"],
               "purpose": po["purpose"], "ref": po["ref"], "tsap_id": po["tsap_id"],
               "paid_at": po["paid_at"], "detail": done.get("message_telugu")}
    po["receipt"] = receipt
    if po.get("offer_code"):
        _consume_offer(po["offer_code"], po.get("tsap_id", ""))
    _persist()
    return {"success": True, "receipt": receipt, "message_telugu": receipt["detail"]}


def pay_stats() -> Dict:
    paid = [o for o in PAY_ORDERS if o.get("status") == "paid"]
    return {"orders": len(PAY_ORDERS), "paid": len(paid),
            "pending": len([o for o in PAY_ORDERS if o.get("status") == "created"]),
            "refunded": len([o for o in PAY_ORDERS if o.get("status") == "refunded"]),
            "collected": sum(int(o.get("final_amount", 0) or 0) for o in paid),
            "offers_live": len(active_offers())}


# ---------------------------------------------------------------------------
# WAVE 34 PREMIUM - REAL REFUNDS (Razorpay API + fulfillment reversal)
# ---------------------------------------------------------------------------
def razorpay_refund(payment_id: str, amount_rs: int, note: str = "") -> Dict:
    """Server-side Razorpay refund (secret backend lone - frontend ki never).
    Full amount only (partial refunds policy lo levu - simple + safe)."""
    import requests  # lazy
    key_id = _key_id()
    secret = _secret()
    if not key_id or not secret:
        return {"ok": False, "message_telugu": "\u26a0\ufe0f Razorpay keys \u0c32\u0c47\u0c26\u0c41 - manual-UPI refund (admin out-of-band return) \u0c35\u0c3e\u0c21\u0c02\u0c21\u0c3f"}
    if not payment_id or int(amount_rs or 0) <= 0:
        return {"ok": False, "message_telugu": "\u26a0\ufe0f payment_id + amount \u0c15\u0c3e\u0c35\u0c3e\u0c32\u0c3f"}
    try:
        r = requests.post("https://api.razorpay.com/v1/payments/%s/refund" % payment_id,
                          auth=(key_id, secret),
                          json={"amount": int(amount_rs) * 100, "speed": "normal",
                                "notes": {"reason": (note or "customer refund")[:100]}},
                          timeout=20)
        j = r.json() if r.headers.get("content-type", "").startswith("application/json") else {}
        if r.status_code in (200, 201) and j.get("id"):
            return {"ok": True, "refund_id": j["id"], "status": str(j.get("status", "")),
                    "message_telugu": "\u2705 Refund raise \u0c05\u0c2f\u0c4d\u0c2f\u0c3f\u0c02\u0c26\u0c3f (%s) - 5-7 working days \u0c32\u0c4b customer account \u0c15\u0c3f" % j["id"]}
        desc = str((j.get("error") or {}).get("description") or "")[:160]
        if "already" in desc.lower() and "refund" in desc.lower():
            return {"ok": True, "duplicate": True, "refund_id": "",
                    "message_telugu": "\u2705 \u0c08 payment \u0c15\u0c3f refund already raise \u0c05\u0c2f\u0c4d\u0c2f\u0c3f\u0c02\u0c26\u0c3f"}
        return {"ok": False, "message_telugu": "\u26a0\ufe0f Razorpay refund fail: %s" % (desc or ("HTTP " + str(r.status_code)))}
    except Exception as e:
        return {"ok": False, "message_telugu": "\u26a0\ufe0f Razorpay reach \u0c05\u0c35\u0c4d\u0c35\u0c32\u0c47\u0c26\u0c41 - \u0c2e\u0c33\u0c4d\u0c32\u0c40 try \u0c1a\u0c46\u0c2f\u0c4d\u0c2f\u0c02\u0c21\u0c3f (%s)" % str(e)[:80]}


def _reverse_fulfillment(po: Dict) -> Dict:
    """Paid benefits venakki (credits deduct / boost off / campaign pause / assist mark).
    Best-effort per purpose - em fail aina kooda record + continue."""
    out = {"reversed": [], "notes": []}
    try:
        import main as MAIN  # lazy
        user = MAIN._find_user(po.get("tsap_id", ""))
    except Exception:
        user = None
    purpose, ref = po.get("purpose"), po.get("ref")
    try:
        if purpose == "credits" and user is not None:
            exp = _expected_amount("credits", ref)
            n = int(exp.get("credits", 0) or 0) if exp.get("ok") else 0
            if n > 0:
                user["credits"] = max(0, int(user.get("credits", 0) or 0) - n)
                out["reversed"].append("credits -%d (balance %d)" % (n, user["credits"]))
            try:
                from interest import get_plan
                _code = str(get_plan(ref).get("code", ""))
                if _code and _code != "FREE" and user.get("plan") == _code:
                    user["plan"] = "FREE"
                    out["reversed"].append("plan -> FREE")
            except Exception as e:
                out["notes"].append("plan_keep: %s" % str(e)[:60])
        elif purpose == "boost" and user is not None:
            if user.get("boost_until"):
                user["boost_until"] = ""
                out["reversed"].append("boost OFF")
        elif purpose == "ads":
            try:
                import ads as ADS  # lazy
                r = ADS.campaign_action(ref, "pause", "refund %s" % po.get("id", ""))
                out["reversed" if r.get("success") else "notes"].append(
                    "campaign %s paused" % ref if r.get("success") else "campaign: %s" % r.get("message_telugu", "")[:60])
            except Exception as e:
                out["notes"].append("campaign_err: %s" % str(e)[:60])
        elif purpose == "assisted":
            try:
                import smart12 as S12  # lazy
                o = S12.get_order(ref)
                if o:
                    o["status"] = "refunded"
                    o["refund_note"] = "pay %s refund" % po.get("id", "")
                    S12._persist()
                    out["reversed"].append("assisted %s -> refunded" % ref)
            except Exception as e:
                out["notes"].append("assisted_err: %s" % str(e)[:60])
    except Exception as e:
        out["notes"].append("reverse_err: %s" % str(e)[:80])
    return out


def refund_order(pay_order_id: str, reason: str = "", admin_note: str = "") -> Dict:
    """ADMIN ONLY (caller gates): paid order -> money back + benefits reverse.
    Razorpay mode: API refund MUST succeed (fail-closed).
    Manual-UPI mode: admin out-of-band return confirm chesaka (note mandatory - audit)."""
    with _ORDER_LOCKS[str(pay_order_id or "")]:
        return _refund_order_locked(pay_order_id, reason, admin_note)


def _refund_order_locked(pay_order_id: str, reason: str, admin_note: str) -> Dict:
    po = get_pay_order(pay_order_id)
    if not po:
        return {"success": False, "message_telugu": "\u26a0\ufe0f Order \u0c26\u0c4a\u0c30\u0c15\u0c32\u0c47\u0c26\u0c41"}
    if po.get("status") == "refunded":
        return {"success": True, "duplicate": True, "order_id": po["id"],
                "refund_id": po.get("refund_id", ""),
                "message_telugu": "\u2705 \u0c08 order \u0c15\u0c3f refund already \u0c05\u0c2f\u0c4d\u0c2f\u0c3f\u0c02\u0c26\u0c3f (double refund \u0c32\u0c47\u0c26\u0c41)"}
    if po.get("status") != "paid":
        return {"success": False, "reason": "not_paid",
                "message_telugu": "\u26a0\ufe0f Paid orders \u0c15\u0c3f \u0c2e\u0c3e\u0c24\u0c4d\u0c30\u0c2e\u0c47 refund (status: %s)" % po.get("status")}
    reason = (reason or "").strip()[:200] or "customer_request"
    refund_id, via = "", ""
    if po.get("mode") == "razorpay" and po.get("payment_id") and pay_config()["mode"] == "razorpay":
        rr = razorpay_refund(po["payment_id"], int(po.get("final_amount", 0) or 0), reason)
        if not rr.get("ok"):
            return {"success": False, "message_telugu": rr.get("message_telugu")}
        refund_id, via = rr.get("refund_id", ""), "razorpay"
    else:
        if not (admin_note or "").strip():
            return {"success": False, "reason": "note_required",
                    "message_telugu": "\u26a0\ufe0f Manual refund \u0c15\u0c3f note mandatory (return UTR / proof - audit \u0c15\u0c4b\u0c38\u0c02)"}
        refund_id, via = "MANUAL:" + (admin_note.strip()[:60]), "manual_upi"
    rev = _reverse_fulfillment(po)
    claw = {}
    try:
        import main as MAIN  # lazy
        from referral import reverse_referral_payment
        user = MAIN._find_user(po.get("tsap_id", ""))
        if user is not None and user.get("referred_by"):
            claw = reverse_referral_payment(user, int(po.get("final_amount", 0) or 0),
                                            MAIN.DB_USERS, reason="refund:" + po["id"])
    except Exception as e:
        claw = {"success": False, "error": str(e)[:80]}
    po["status"] = "refunded"
    po["refunded_at"] = _now()
    po["refund_reason"] = reason
    po["refund_id"] = refund_id
    po["refund_via"] = via
    po["refund_reversal"] = rev
    po["refund_clawback"] = {"success": bool((claw or {}).get("success")),
                             "reversed": (claw or {}).get("reversed", 0)}
    _persist()
    return {"success": True, "order_id": po["id"], "refund_id": refund_id, "via": via,
            "reversed": rev.get("reversed", []), "clawback": po["refund_clawback"],
            "message_telugu": "\u2705 %s refund \u0c05\u0c2f\u0c4d\u0c2f\u0c3f\u0c02\u0c26\u0c3f (\u20b9%s, %s) - benefits reverse + commission clawback done" % (
                po["id"], po.get("final_amount", 0), "Razorpay (5-7 days)" if via == "razorpay" else "manual return")}
