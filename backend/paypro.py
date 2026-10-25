"""
💳 WAVE 14 — SAFE PAYMENTS + FESTIVAL OFFERS (మన వివాహ)
==========================================================
SAFETY FIRST (user demand — mistakes/errors vaddu):
  1. Amount SERVER compute chesthundi (client amount nammamu — tamper proof).
  2. Razorpay signature HMAC-SHA256 verify → SUCCESS ayithe MATRAMe fulfill.
  3. Idempotent: replay/double-click → okka sari matrame credit (receipt reuse).
  4. SECRET eppudu expose kadu — /api/pay/config lo key_id (public) matrame.
  5. Keys lekapothe → honest MANUAL-UPI mode (admin UTR confirm → fulfill).

Purposes: credits (consumer S_99..S_499 / separate bureau plans) · assisted shortlist · ads · boost.
Offers: festival promo codes (%/flat off, dates, applies_to, usage cap) — ADMIN lone create.
"""
from __future__ import annotations
from atomic_store import atomic_json_dump


import hashlib
import secrets
import copy
import hmac
import json
import os
import re
import threading
from collections import defaultdict
from datetime import datetime
from typing import Dict, List, Optional

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PERSIST_FILE = os.environ.get("MANA_VIVAHA_PAYPRO_FILE", os.path.join(BASE_DIR, "paypro14.json"))

PAY_ORDERS: List[Dict] = []
# Durable payment-id index. ``RECEIPTS`` is kept as a fast in-process cache;
# this index is restored from the payment ledger so a restart or a second worker
# cannot reuse one provider payment for another order.
PAYMENT_INDEX: Dict[str, Dict] = {}

# 🌊 WAVE 25 — PIN-TO-PIN SECURE PAY
ORDER_EXPIRY_HOURS = 24          # pending order 24h lo pay kakapothe expire (stale confirm ban)
UTR_RE = re.compile(r"^\d{12}$")  # UPI ref / bank UTR = 12 digits (PhonePe/GPay statement)
_ORDER_LOCKS: Dict[str, threading.Lock] = defaultdict(threading.Lock)
_ORDER_CREATE_LOCK = threading.Lock()  # prevent duplicate sequential IDs under concurrent checkout starts
_PAY_LEDGER_LOCK = threading.RLock()  # serialize atomic snapshots of the shared payment ledger
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


def _persist() -> bool:
    """Persist the payment ledger and report failure instead of claiming success."""
    try:
        with _PAY_LEDGER_LOCK:
            atomic_json_dump(PERSIST_FILE, {
                "orders": PAY_ORDERS[-1000:],
                "offers": OFFERS[-200:],
                # Payment identifiers are an immutable fraud-prevention ledger;
                # unlike display/order history they must not be truncated.
                "payment_index": PAYMENT_INDEX,
            }, ensure_ascii=False)
        return True
    except Exception:
        return False


def _restore() -> None:
    global _SEQ
    try:
        if os.path.exists(PERSIST_FILE):
            with open(PERSIST_FILE, encoding="utf-8") as handle:
                d = json.load(handle) or {}
            PAY_ORDERS.extend(d.get("orders", []))
            OFFERS.extend(d.get("offers", []))
            restored_index = d.get("payment_index", {}) or {}
            if isinstance(restored_index, dict):
                PAYMENT_INDEX.update({str(k): v for k, v in restored_index.items() if isinstance(v, dict)})
            for o in PAY_ORDERS:
                try:
                    _SEQ = max(_SEQ, int(str(o.get("id", "pay_ord_0")).split("_")[-1]))
                except Exception:
                    pass
                payment_id = str(o.get("payment_id") or "").strip()
                receipt = o.get("receipt") if isinstance(o.get("receipt"), dict) else None
                if payment_id and o.get("status") == "paid":
                    PAYMENT_INDEX.setdefault(payment_id, receipt or {
                        "pay_order_id": o.get("id", ""),
                        "payment_id": payment_id,
                        "amount": o.get("final_amount", 0),
                        "tsap_id": o.get("tsap_id", ""),
                    })
            # Rehydrate the hot cache from the durable index.
            RECEIPTS.update(PAYMENT_INDEX)
    except Exception:
        # A malformed payment ledger must not turn into an unsigned fallback;
        # startup/payment configuration should surface the error through the
        # normal health/backup gate instead of silently trusting caller input.
        return


_restore()

# ---------------------------------------------------------------------------
# CONFIG (secret eppudu bayataki raadu)
# ---------------------------------------------------------------------------

def pay_config() -> Dict:
    """Public payment config; never invent a merchant destination or expose secrets."""
    key_id = _key_id()
    secret = _secret()
    upi = os.getenv("PAY_UPI_ID", "").strip()
    live = bool(key_id and secret)
    mode = "razorpay" if live else "manual_upi" if upi else "unconfigured"
    if live:
        note = "Online checkout is configured."
    elif upi:
        note = "Manual UPI is configured; an operator must verify the submitted payment reference."
    else:
        note = "Payment is not configured. Do not send money until an official checkout destination is provided."
    return {"mode": mode, "key_id": key_id if live else "", "upi_id": upi, "note_telugu": note}


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
    """Admin 1-click: bounded preset festival codes activate (dates తో)."""
    try:
        max_uses = int(max_uses)
    except (TypeError, ValueError):
        return {"success": False, "message_telugu": "⚠️ Max uses number గా ఇవ్వండి"}
    if max_uses < 1 or max_uses > 1_000_000:
        return {"success": False, "message_telugu": "⚠️ Max uses 1–1,000,000 మధ్య ఉండాలి"}
    start = str(valid_from or "")[:10]
    end = str(valid_to or "")[:10]
    for label, value in (("valid_from", start), ("valid_to", end)):
        if value:
            try:
                datetime.strptime(value, "%Y-%m-%d")
            except (TypeError, ValueError):
                return {"success": False, "message_telugu": f"⚠️ {label} YYYY-MM-DD format లో ఉండాలి"}
    if start and end and start > end:
        return {"success": False, "message_telugu": "⚠️ Offer end date start date తర్వాత ఉండాలి"}
    added = []
    have = {o.get("code") for o in OFFERS}
    for p in FESTIVAL_PRESETS:
        if p["code"] in have:
            continue
        o = dict(p, valid_from=start, valid_to=end, max_uses=max_uses,
                 used=0, active=True, created_at=_now())
        OFFERS.append(o)
        added.append(o["code"])
    if added and not _persist():
        OFFERS[:] = [offer for offer in OFFERS if offer.get("code") not in added]
        return {"success": False, "reason": "persistence_failed",
                "message_telugu": "⚠️ Festival offers could not be saved safely. Please try again."}
    return {"success": True, "added": added,
            "message_telugu": f"✅ {len(added)} festival offers activate: {', '.join(added) or 'already unnai'}"}


def create_offer(code: str, title: str, pct_off: int = 0, flat_off: int = 0,
                 applies_to: Optional[List[str]] = None, valid_from: str = "",
                 valid_to: str = "", max_uses: int = 100, min_amount: int = 0,
                 festival: str = "", usable_once: bool = True) -> Dict:
    """Create a bounded promotion without allowing a negative/zero checkout amount.

    Offer configuration is money logic, not presentation data. Validate it here
    so a malformed admin request cannot create a promotion that increases the
    price, consumes indefinitely, applies to an unknown purpose, or silently
    crosses its end date.
    """
    code = str(code or "").strip().upper()
    if not re.fullmatch(r"[A-Z0-9][A-Z0-9_-]{2,31}", code):
        return {"success": False, "message_telugu": "⚠️ Code 3–32 chars: A-Z, 0-9, _ లేదా - మాత్రమే"}
    if any(o.get("code") == code for o in OFFERS):
        return {"success": False, "message_telugu": "⚠️ ఈ code already ఉంది"}
    try:
        pct = int(pct_off or 0)
        flat = int(flat_off or 0)
        uses = int(max_uses or 0)
        minimum = int(min_amount or 0)
    except (TypeError, ValueError):
        return {"success": False, "message_telugu": "⚠️ Discount, minimum, max uses numbers గా ఇవ్వండి"}
    if pct < 0 or pct > 100:
        return {"success": False, "message_telugu": "⚠️ Percentage discount 0–100 మధ్య ఉండాలి"}
    if flat < 0 or minimum < 0:
        return {"success": False, "message_telugu": "⚠️ Flat discount/minimum negative గా ఉండకూడదు"}
    if not pct and not flat:
        return {"success": False, "message_telugu": "⚠️ % leda flat discount ఇవ్వండి"}
    if uses < 1 or uses > 1_000_000:
        return {"success": False, "message_telugu": "⚠️ Max uses 1–1,000,000 మధ్య ఉండాలి"}
    allowed_purposes = {"credits", "assisted", "ads", "boost"}
    normalized_applies = sorted({str(item).strip().lower() for item in (applies_to or ["credits"]) if str(item).strip()})
    if not normalized_applies or any(item not in allowed_purposes for item in normalized_applies):
        return {"success": False, "message_telugu": "⚠️ applies_to లో credits/assisted/ads/boost మాత్రమే"}
    for label, value in (("valid_from", valid_from), ("valid_to", valid_to)):
        if value:
            try:
                datetime.strptime(str(value)[:10], "%Y-%m-%d")
            except (TypeError, ValueError):
                return {"success": False, "message_telugu": f"⚠️ {label} YYYY-MM-DD format లో ఉండాలి"}
    start = str(valid_from or "")[:10]
    end = str(valid_to or "")[:10]
    if start and end and start > end:
        return {"success": False, "message_telugu": "⚠️ Offer end date start date తర్వాత ఉండాలి"}
    o = {"code": code, "title": str(title or code).strip()[:160] or code, "pct_off": pct,
         "flat_off": flat, "applies_to": normalized_applies,
         "valid_from": start, "valid_to": end,
         "max_uses": uses, "used": 0, "usable_once": bool(usable_once),
         "used_by": [], "min_amount": minimum,
         "festival": str(festival or "").strip()[:80], "active": True, "created_at": _now()}
    OFFERS.append(o)
    if not _persist():
        OFFERS.remove(o)
        return {"success": False, "reason": "persistence_failed",
                "message_telugu": "⚠️ Offer could not be saved safely. Please try again."}
    return {"success": True, "offer": o, "message_telugu": f"✅ Offer {code} ready"}


def get_offer(code: str) -> Optional[Dict]:
    return next((o for o in OFFERS if o.get("code") == str(code or "").strip().upper()), None)


def delete_offer(code: str) -> Dict:
    """ADMIN: offer/promo delete (used history stays in pay orders)."""
    global OFFERS
    code = (code or "").strip().upper()
    previous = OFFERS
    before = len(OFFERS)
    OFFERS = [o for o in OFFERS if str(o.get("code", "")).upper() != code]
    if len(OFFERS) == before:
        return {"success": False, "message_telugu": "⚠️ Offer code దొరకలేదు"}
    if not _persist():
        OFFERS = previous
        return {"success": False, "reason": "persistence_failed",
                "message_telugu": "⚠️ Offer could not be deleted safely. Please try again."}
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


def _consume_offer(code: str, user_id: str = "") -> bool:
    with _OFFER_LOCK:  # 🌊 WAVE 34: concurrent verify → cap overshoot ban
        o = get_offer(code) if code else None
        if not o:
            return True
        used_by = [str(x).upper() for x in (o.get("used_by") or [])]
        normalized_user = str(user_id or "").strip().upper()
        if int(o.get("used", 0) or 0) >= int(o.get("max_uses", 1) or 1):
            return False
        if o.get("usable_once", True) and normalized_user and normalized_user in used_by:
            return False
        previous = copy.deepcopy(o)
        o["used"] = int(o.get("used", 0)) + 1
        if normalized_user:
            o.setdefault("used_by", []).append(normalized_user)
        if not _persist():
            o.clear()
            o.update(previous)
            return False
        return True


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
            return {"ok": False, "message_telugu": "⚠️ Plan code S_99/S_199/S_299/S_499 మాత్రమే"}
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
    cfg = pay_config()
    if cfg.get("mode") == "unconfigured":
        return {"success": False, "message_telugu": "Payment is unavailable until a real checkout provider or merchant UPI ID is configured."}
    # ID allocation is separate from persistence/network work. Never decrement
    # the sequence on a failed attempt: another concurrent checkout may already
    # have taken the next number, and gaps are safer than duplicate order IDs.
    with _ORDER_CREATE_LOCK:
        _SEQ += 1
        order_id = f"pay_ord_{_SEQ:05d}"
    po = {"id": order_id, "tsap_id": tsap_id, "purpose": purpose.lower(),
          "ref": ref, "amount": exp["amount"], "final_amount": off["final_amount"],
          "discount": off["discount"], "offer_code": off.get("code", ""),
          "label": exp["label"], "mode": cfg["mode"], "status": "created",
          "rzp_order_id": "", "rzp_amount": 0, "payment_id": "", "utr": "",
          "claim_utr": "", "claimed_at": "", "created_at": _now(),
          # High-entropy capability for the QR image; order IDs alone are not
          # sufficient to disclose a merchant amount/order reference.
          "qr_token": secrets.token_urlsafe(32),
          "paid_at": "", "receipt": None}
    if cfg["mode"] == "razorpay":
        # 🌊 WAVE 25: RZP order server-side MUST succeed — lekapothe dangling order vaddu
        rz = _rzp_create_order(po["id"], po["final_amount"], po["label"])
        if not rz.get("ok"):
            return {"success": False, "message_telugu": rz.get("message_telugu")}
        po["rzp_order_id"] = rz["rzp_order_id"]
        po["rzp_amount"] = rz["rzp_amount"]
    # The payment ledger is a single-process JSON store. Serialize the
    # append+snapshot boundary as well as ID allocation so concurrent checkout
    # starts cannot overwrite one another's order.
    with _ORDER_CREATE_LOCK:
        PAY_ORDERS.append(po)
        saved = _persist()
        if not saved:
            PAY_ORDERS.remove(po)
    if not saved:
        return {"success": False, "reason": "persistence_failed",
                "message_telugu": "⚠️ Payment order could not be saved safely. Please try again."}
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
        out["pay_order"]["qr_token"] = po["qr_token"]
        out["next_telugu"] = f"💳 {cfg['upi_id']} కి ₹{po['final_amount']} pay చేసి UTR admin కి పంపండి"
    return out


def get_pay_order(pid: str) -> Optional[Dict]:
    return next((o for o in PAY_ORDERS if o.get("id") == pid), None)


def _payment_id_owner(payment_id: str) -> str:
    """Return the durable order that owns a provider payment ID, if any."""
    key = str(payment_id or "").strip()
    if not key:
        return ""
    indexed = PAYMENT_INDEX.get(key)
    if isinstance(indexed, dict):
        return str(indexed.get("pay_order_id") or indexed.get("order_id") or "")
    # Migration compatibility for ledgers written before PAYMENT_INDEX existed.
    for order in PAY_ORDERS:
        if str(order.get("payment_id") or "").strip() == key:
            return str(order.get("id") or "")
        receipt = order.get("receipt") if isinstance(order.get("receipt"), dict) else {}
        if str(receipt.get("payment_id") or "").strip() == key:
            return str(order.get("id") or "")
    return ""


def _remember_payment_receipt(payment_id: str, receipt: Dict) -> None:
    key = str(payment_id or "").strip()
    if key and isinstance(receipt, dict):
        PAYMENT_INDEX[key] = copy.deepcopy(receipt)
        RECEIPTS[key] = copy.deepcopy(receipt)


def _restore_payment_receipt(payment_id: str, previous: Optional[Dict]) -> None:
    key = str(payment_id or "").strip()
    if not key:
        return
    if previous is None:
        RECEIPTS.pop(key, None)
        PAYMENT_INDEX.pop(key, None)
    else:
        RECEIPTS[key] = copy.deepcopy(previous)
        PAYMENT_INDEX[key] = copy.deepcopy(previous)


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
    """Require provider-side captured+amount confirmation for online payments.

    Production defaults to the safe behavior even when an operator forgot the
    optional variable. Explicit ``0`` is still available for a deliberately
    isolated non-production test setup; it must never be the implicit default.
    """
    raw = os.getenv("RAZORPAY_VERIFY_CAPTURE", "").strip().lower()
    production = os.getenv("APP_ENV", "").strip().lower() in {"prod", "production", "live"}
    if production:
        return True
    if raw:
        return raw in ("1", "true", "yes", "on")
    return False


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
    """Pay a referral reward only for a qualifying paid consumer request plan."""
    try:
        plan_code = str(po.get("ref") or "").strip().upper()
        if po.get("purpose") != "credits" or plan_code not in {"S_99", "S_199", "S_299", "S_499"}:
            return
        if not user.get("referred_by"):
            return
        import main as MAIN  # lazy
        from referral import process_referral_payment
        try:
            amt = int(po.get("final_amount", 0) or 0)
        except Exception:
            amt = 0
        res = process_referral_payment(
            user, user["referred_by"], amt, MAIN.DB_USERS,
            payment_id=payment_id or po.get("utr", ""), plan_code=plan_code,
        )
        po["referral"] = {"success": bool(res.get("success")),
                          "commission": res.get("commission", 0),
                          "reason": res.get("reason", "")}
    except Exception as e:
        # Referral accounting must not break already-verified fulfillment; keep an audit note.
        try:
            po["referral"] = {"success": False, "reason": "error", "error": str(e)[:100]}
        except Exception:
            pass


def fulfill_order(po: Dict, payment_id: str, via: str) -> Dict:
    """Apply one verified benefit and make its owning store durable before success."""
    import main as MAIN  # lazy: circles avoid (paypro ← main import, runtime only)
    user = MAIN._find_user(po.get("tsap_id", ""))
    if not user:
        return {"ok": False, "message_telugu": "⚠️ User దొరకలేదు — amount hold (admin refund/credit)"}
    purpose, ref = po.get("purpose"), po.get("ref")

    before_payments = copy.deepcopy(MAIN.DB_PAYMENTS)

    def persist_core_or_restore(before_users: List[Dict], before_refs: List[Dict]) -> bool:
        if MAIN._persist_core_state():
            return True
        _restore_main_users(MAIN, before_users, before_refs)
        MAIN.DB_PAYMENTS[:] = before_payments
        return False

    if purpose == "credits":
        before_refs = list(MAIN.DB_USERS)
        before_users = copy.deepcopy(MAIN.DB_USERS)
        from interest import apply_payment
        expected = _expected_amount("credits", ref)
        if not expected.get("ok"):
            return {"ok": False, "message_telugu": "⚠️ Plan apply fail — admin chusthadu"}
        applied = apply_payment(user, expected["amount"], ref)
        if not applied.get("ok"):
            return {"ok": False, "message_telugu": "⚠️ Plan apply fail — admin chusthadu"}
        _fire_referral_commission(user, po, payment_id)
        _upsert_core_payment_record(po, payment_id=payment_id, via=via)
        if not persist_core_or_restore(before_users, before_refs):
            return {"ok": False, "reason": "persistence_failed",
                    "message_telugu": "⚠️ Payment benefit could not be saved safely. Please contact support; no duplicate credit was issued."}
        return {"ok": True, "credits": user.get("credits", 0), "plan": user.get("plan"),
                "referral": po.get("referral"),
                "message_telugu": f"✅ ₹{po['final_amount']} success — {applied.get('profiles_added', 0)} credits add! Balance: {user.get('credits', 0)} 🎉"}
    if purpose == "assisted":
        import smart12 as S12
        r = S12.mark_order_paid(ref, payment_id or po.get("utr", "") or "RZPAY")
        if not r.get("success"):
            return {"ok": False, "message_telugu": r.get("message_telugu")}
        _upsert_core_payment_record(po, payment_id=payment_id, via=via)
        if not MAIN._persist_core_state():
            return {"ok": False, "reason": "persistence_failed",
                    "message_telugu": "⚠️ Assisted payment record could not be saved safely. Please try again."}
        return {"ok": True,
                "message_telugu": f"✅ Assisted {ref} PAID — admin profiles select చేసి personal గా pampisthadu 🙏"}
    if purpose == "ads":
        import ads as ADS
        r = ADS.approve_campaign(ref, payment_id or po.get("utr", "") or "RZPAY")
        if not r.get("success"):
            return {"ok": False, "message_telugu": r.get("message_telugu")}
        _upsert_core_payment_record(po, payment_id=payment_id, via=via)
        if not MAIN._persist_core_state():
            return {"ok": False, "reason": "persistence_failed",
                    "message_telugu": "⚠️ Ad payment record could not be saved safely. Please try again."}
        return {"ok": True,
                "message_telugu": f"✅ Campaign {ref} LIVE — {r['campaign']['days']} days 🎉"}
    if purpose == "boost":
        before_refs = list(MAIN.DB_USERS)
        before_users = copy.deepcopy(MAIN.DB_USERS)
        import advanced11 as A11
        eff = A11.apply_boost(user, str(ref).upper())
        _upsert_core_payment_record(po, payment_id=payment_id, via=via)
        if not persist_core_or_restore(before_users, before_refs):
            return {"ok": False, "reason": "persistence_failed",
                    "message_telugu": "⚠️ Boost could not be saved safely. Please try again."}
        return {"ok": True,
                "message_telugu": f"✅ Boost ON! {eff.get('message_telugu', '')} ⚡"}
    return {"ok": False, "message_telugu": "⚠️ Unknown purpose"}


def _restore_main_users(main_module, before_values: List[Dict], before_refs: Optional[List[Dict]] = None) -> None:
    """Restore user dicts in place so request/test references cannot retain a grant."""
    refs = before_refs if before_refs is not None else []
    if refs and len(refs) == len(before_values):
        for ref, previous in zip(refs, before_values):
            ref.clear()
            ref.update(previous)
        main_module.DB_USERS[:] = refs
    else:
        main_module.DB_USERS[:] = before_values
    if hasattr(main_module, "_reindex_users"):
        main_module._reindex_users()


def _snapshot_fulfillment_state(po: Dict) -> Dict:
    """Capture every in-process store a payment fulfillment can touch."""
    state: Dict = {}
    try:
        import main as MAIN
        state["main_user_refs"] = list(MAIN.DB_USERS)
        state["main_users"] = copy.deepcopy(MAIN.DB_USERS)
        state["main_payments"] = copy.deepcopy(MAIN.DB_PAYMENTS)
    except Exception:
        state["main_users"] = None
    if po.get("purpose") == "ads":
        try:
            import ads as ADS
            state["ads_campaigns"] = copy.deepcopy(ADS.CAMPAIGNS)
            state["ads_seq"] = ADS._AD_SEQ
        except Exception:
            pass
    if po.get("purpose") == "assisted":
        try:
            import smart12 as S12
            state["assist_orders"] = copy.deepcopy(S12.ORDERS)
            state["assist_seq"] = S12._ORDER_SEQ
        except Exception:
            pass
    return state


def _restore_fulfillment_state(state: Dict) -> None:
    """Restore a failed cross-store fulfillment best-effort, preserving list identity."""
    try:
        import main as MAIN
        if state.get("main_users") is not None:
            _restore_main_users(MAIN, state["main_users"], state.get("main_user_refs"))
            if state.get("main_payments") is not None:
                MAIN.DB_PAYMENTS[:] = state["main_payments"]
            MAIN._persist_core_state()
    except Exception:
        pass
    try:
        import ads as ADS
        if "ads_campaigns" in state:
            ADS.CAMPAIGNS[:] = state["ads_campaigns"]
            ADS._AD_SEQ = state["ads_seq"]
            ADS._persist()
    except Exception:
        pass
    try:
        import smart12 as S12
        if "assist_orders" in state:
            S12.ORDERS[:] = state["assist_orders"]
            S12._ORDER_SEQ = state["assist_seq"]
            S12._persist()
    except Exception:
        pass


def _upsert_core_payment_record(po: Dict, payment_id: str = "", via: str = "") -> Dict:
    """Keep the durable core payment history in step with the pay-order ledger.

    ``PAY_ORDERS`` is the checkout state machine, while ``DB_PAYMENTS`` powers
    finance analytics, CSV exports, and backup/restore. Previously online and
    manual PayBox orders could fulfill credits without ever entering the core
    payment history, so revenue and exports silently under-counted real money.
    """
    import main as MAIN

    order_id = str(po.get("id", ""))
    existing = next((row for row in MAIN.DB_PAYMENTS
                     if str(row.get("pay_order_id") or row.get("order_id") or "") == order_id), None)
    record = {
        "order_id": order_id,
        "pay_order_id": order_id,
        "user_id": po.get("tsap_id", ""),
        "tsap_id": po.get("tsap_id", ""),
        "amount": int(po.get("final_amount", 0) or 0),
        "original_amount": int(po.get("amount", 0) or 0),
        "discount": int(po.get("discount", 0) or 0),
        "purpose": po.get("purpose", ""),
        "kind": po.get("purpose", ""),
        "plan": po.get("ref", "") if po.get("purpose") == "credits" else "",
        "ref": po.get("ref", ""),
        "status": "paid",
        "method": po.get("mode", ""),
        "paid_via": via or po.get("mode", ""),
        "payment_id": payment_id or po.get("payment_id", ""),
        "utr": po.get("utr", ""),
        "offer_code": po.get("offer_code", ""),
        "created_at": po.get("created_at", ""),
        "paid_at": po.get("paid_at", "") or _now(),
        "fulfilled": True,
        "source": "paypro",
    }
    if existing is None:
        MAIN.DB_PAYMENTS.append(record)
    else:
        existing.update(record)
        record = existing
    return record


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
        previous = copy.deepcopy(po)
        po["status"] = "expired"
        if not _persist():
            po.clear()
            po.update(previous)
            return {"success": False, "reason": "persistence_failed",
                    "message_telugu": "⚠️ Order expiry could not be saved safely. Please try again."}
        return {"success": False, "reason": "expired",
                "message_telugu": "⚠️ Order expire అయ్యింది (24h) — కొత్త order create చెయ్యండి"}
    payment_owner = _payment_id_owner(payment_id)
    if payment_owner and payment_owner != str(po.get("id", "")):
        return {"success": False, "reason": "payment_already_used",
                "message_telugu": "🚫 ఈ provider payment ఇప్పటికే మరో order కు జత అయింది."}
    if payment_owner == str(po.get("id", "")) and payment_id:
        old = PAYMENT_INDEX.get(payment_id) or RECEIPTS.get(payment_id)
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
            previous = copy.deepcopy(po)
            po["last_capture_check"] = {"at": _now(), "status": cap.get("status", ""),
                                        "error": cap.get("error", "")}
            if not _persist():
                po.clear()
                po.update(previous)
                return {"success": False, "reason": "persistence_failed",
                        "message_telugu": "⚠️ Capture status could not be saved safely. Please try again."}
            return {"success": False, "reason": "not_captured",
                    "rzp_status": cap.get("status", ""),
                    "message_telugu": "\u23F3 Payment inka bank side capture \u0C05\u0C35\u0C4D\u0C35\u0C32\u0C47\u0C26\u0C41 (status: %s) \u2014 2 \u0C28\u0C3F\u0C2E\u0C3F\u0C37\u0C3E\u0C32\u0C32\u0C4B \u0C2E\u0C33\u0C4D\u0C32\u0C40 try \u0C1A\u0C46\u0C2F\u0C4D\u0C2F\u0C02\u0C21\u0C3F (\u0C21\u0C2C\u0C4D\u0C2C\u0C41\u0C32\u0C41 safe, credits capture \u0C05\u0C2F\u0C4D\u0C2F\u0C3E\u0C15\u0C47 add)" % (cap.get("status") or "pending")}
        if int(cap.get("amount", 0)) != int(po.get("final_amount", 0) or 0) * 100:
            return {"success": False, "reason": "amount_mismatch",
                    "message_telugu": "\U0001F6AB Razorpay amount (\u20B9%s) \u2260 order amount (\u20B9%s) \u2014 safe abort (support \u0C15\u0C3F payment ID \u0C2A\u0C02\u0C2A\u0C02\u0C21\u0C3F)" % (
                        int(cap.get("amount", 0)) // 100, po.get("final_amount", 0))}
    po_before = copy.deepcopy(po)
    fulfillment_before = _snapshot_fulfillment_state(po)
    receipt_before = RECEIPTS.get(payment_id)
    offer_before = copy.deepcopy(get_offer(po.get("offer_code", ""))) if po.get("offer_code") else None
    po["rzp_order_id"] = rzp_order_id
    po["payment_id"] = payment_id
    done = fulfill_order(po, payment_id, "razorpay")
    if not done.get("ok"):
        po.clear()
        po.update(po_before)
        _restore_fulfillment_state(fulfillment_before)
        _persist()
        return {"success": False, "reason": done.get("reason", "fulfillment_failed"),
                "message_telugu": done.get("message_telugu")}
    po["status"] = "paid"
    po["paid_at"] = _now()
    receipt = {"pay_order_id": po["id"], "payment_id": payment_id, "amount": po["final_amount"],
               "purpose": po["purpose"], "ref": po["ref"], "tsap_id": po["tsap_id"],
               "paid_at": po["paid_at"], "detail": done.get("message_telugu")}
    po["receipt"] = receipt
    _remember_payment_receipt(payment_id, receipt)
    if po.get("offer_code") and not _consume_offer(po["offer_code"], po.get("tsap_id", "")):
        po.clear()
        po.update(po_before)
        _restore_payment_receipt(payment_id, receipt_before)
        _restore_fulfillment_state(fulfillment_before)
        if offer_before is not None:
            offer = get_offer(offer_before.get("code", ""))
            if offer is not None:
                offer.clear()
                offer.update(offer_before)
        _persist()
        return {"success": False, "reason": "persistence_failed",
                "message_telugu": "⚠️ Payment promotion could not be recorded safely. Please contact support before retrying."}
    if not _persist():
        po.clear()
        po.update(po_before)
        _restore_payment_receipt(payment_id, receipt_before)
        _restore_fulfillment_state(fulfillment_before)
        if offer_before is not None:
            offer = get_offer(offer_before.get("code", ""))
            if offer is not None:
                offer.clear()
                offer.update(offer_before)
        _persist()
        return {"success": False, "reason": "persistence_failed",
                "message_telugu": "⚠️ Payment could not be saved safely. Please contact support before retrying."}
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
        payload = (event or {}).get("payload", {}) or {}
        payment_wrapper = payload.get("payment", {}) or {}
        payment_ent = (payment_wrapper.get("entity", {}) or {}) if isinstance(payment_wrapper, dict) else {}
        order_wrapper = payload.get("order", {}) or {}
        order_ent = (order_wrapper.get("entity", {}) or {}) if isinstance(order_wrapper, dict) else {}
        # Razorpay's `order.paid` payload is order-centric while captured and
        # authorized events are payment-centric. Accept either shape, but never
        # fulfill without a concrete payment ID and the provider order ID.
        ent = payment_ent or order_ent
        rzp_order = str(ent.get("order_id", "") or order_ent.get("id", "") or "")
        payment_id = str(payment_ent.get("id", "") or "")
        if name not in ("payment.captured", "payment.authorized", "order.paid") or not rzp_order:
            return {"ok": True, "ignored": True}
        if not payment_id:
            return {"ok": False, "reason": "payment_id_missing",
                    "message_telugu": "⚠️ Razorpay payment ID లేని webhook ను fulfill చేయలేదు"}
        po = next((o for o in PAY_ORDERS if o.get("rzp_order_id") == rzp_order), None)
        if not po:
            return {"ok": True, "ignored": True, "reason": "unknown_order"}
        # A signed webhook proves origin, not that the amount/currency matches
        # this order. Check both when the provider supplies them. Production
        # payloads always contain amount; test-only fixtures may omit it.
        supplied_amount = payment_ent.get("amount", order_ent.get("amount"))
        if supplied_amount is None and os.getenv("APP_ENV", "").lower() in {"prod", "production"}:
            return {"ok": False, "reason": "amount_missing",
                    "message_telugu": "⚠️ Payment amount లేని webhook ను safe గా accept చేయలేదు"}
        if supplied_amount is not None:
            try:
                if int(supplied_amount) != int(po.get("final_amount", 0) or 0) * 100:
                    return {"ok": False, "reason": "amount_mismatch",
                            "message_telugu": "🚫 Razorpay webhook amount ఈ order amount తో match కాలేదు"}
            except (TypeError, ValueError):
                return {"ok": False, "reason": "amount_invalid",
                        "message_telugu": "⚠️ Razorpay webhook amount చెల్లదు"}
        supplied_currency = str(payment_ent.get("currency", order_ent.get("currency", "")) or "").upper()
        production = os.getenv("APP_ENV", "").strip().lower() in {"prod", "production", "live"}
        if not supplied_currency and production:
            return {"ok": False, "reason": "currency_missing",
                    "message_telugu": "⚠️ Payment currency లేని webhook ను safe గా accept చేయలేదు"}
        if supplied_currency and supplied_currency != "INR":
            return {"ok": False, "reason": "currency_mismatch",
                    "message_telugu": "🚫 INR కాని payment ను fulfill చేయలేదు"}
        provider_status = str(payment_ent.get("status", order_ent.get("status", "")) or "").lower()
        if name == "payment.captured" and provider_status and provider_status != "captured":
            return {"ok": False, "reason": "not_captured",
                    "message_telugu": "⏳ Payment captured status లేదు — credits add చేయలేదు"}
        if name == "order.paid" and provider_status and provider_status not in {"paid", "captured"}:
            return {"ok": False, "reason": "order_not_paid",
                    "message_telugu": "⏳ Razorpay order paid status లేదు — credits add చేయలేదు"}
        with _ORDER_LOCKS[po["id"]]:
            if po.get("status") == "paid":
                return {"ok": True, "duplicate": True, "receipt": po.get("receipt")}
            payment_owner = _payment_id_owner(payment_id)
            if payment_owner and payment_owner != str(po.get("id", "")):
                return {"ok": False, "reason": "payment_already_used",
                        "message_telugu": "🚫 ఈ provider payment ఇప్పటికే మరో order కు జత అయింది."}
            if payment_owner == str(po.get("id", "")) and payment_id:
                return {"ok": True, "duplicate": True,
                        "receipt": PAYMENT_INDEX.get(payment_id) or RECEIPTS.get(payment_id)}
            if name == "payment.authorized":
                # 🌊 WAVE 34 PREMIUM: authorized ≠ captured — డబ్బులు inka bank దగ్గరే!
                # Fulfill CHEYYAM (capture webhook / verify daggara fulfill avutundi).
                previous = copy.deepcopy(po)
                po["payment_id"] = payment_id or po.get("payment_id", "")
                po["authorized_at"] = _now()
                if not _persist():
                    po.clear()
                    po.update(previous)
                    return {"ok": False, "reason": "persistence_failed",
                            "message_telugu": "⚠️ Payment authorization could not be saved safely."}
                return {"ok": True, "pending_capture": True, "pay_order_id": po["id"],
                        "message_telugu": "⏳ Payment authorized — capture webhook kosam wait (credits capture అయ్యాకే)"}
            if order_expired(po):
                previous = copy.deepcopy(po)
                po["status"] = "expired"
                if not _persist():
                    po.clear()
                    po.update(previous)
                    return {"ok": False, "reason": "persistence_failed",
                            "message_telugu": "⚠️ Order expiry could not be saved safely."}
                return {"ok": False, "reason": "expired"}
            po_before = copy.deepcopy(po)
            fulfillment_before = _snapshot_fulfillment_state(po)
            receipt_before = RECEIPTS.get(payment_id)
            offer_before = copy.deepcopy(get_offer(po.get("offer_code", ""))) if po.get("offer_code") else None
            po["payment_id"] = payment_id
            done = fulfill_order(po, payment_id, "razorpay_webhook")
            if not done.get("ok"):
                po.clear()
                po.update(po_before)
                _restore_fulfillment_state(fulfillment_before)
                _persist()
                return {"ok": False, "reason": done.get("reason", "fulfillment_failed"),
                        "message_telugu": done.get("message_telugu")}
            po["status"] = "paid"
            po["paid_at"] = _now()
            receipt = {"pay_order_id": po["id"], "payment_id": payment_id, "amount": po["final_amount"],
                       "purpose": po["purpose"], "ref": po["ref"], "tsap_id": po["tsap_id"],
                       "paid_at": po["paid_at"], "detail": done.get("message_telugu"), "via": "webhook"}
            po["receipt"] = receipt
            _remember_payment_receipt(payment_id, receipt)
            if po.get("offer_code") and not _consume_offer(po["offer_code"], po.get("tsap_id", "")):
                po.clear()
                po.update(po_before)
                _restore_payment_receipt(payment_id, receipt_before)
                _restore_fulfillment_state(fulfillment_before)
                if offer_before is not None:
                    offer = get_offer(offer_before.get("code", ""))
                    if offer is not None:
                        offer.clear(); offer.update(offer_before)
                _persist()
                return {"ok": False, "reason": "persistence_failed",
                        "message_telugu": "⚠️ Payment promotion could not be recorded safely."}
            if not _persist():
                po.clear()
                po.update(po_before)
                _restore_payment_receipt(payment_id, receipt_before)
                _restore_fulfillment_state(fulfillment_before)
                if offer_before is not None:
                    offer = get_offer(offer_before.get("code", ""))
                    if offer is not None:
                        offer.clear(); offer.update(offer_before)
                _persist()
                return {"ok": False, "reason": "persistence_failed",
                        "message_telugu": "⚠️ Payment could not be saved safely."}
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
        previous = copy.deepcopy(po)
        po["status"] = "expired"
        if not _persist():
            po.clear()
            po.update(previous)
            return {"success": False, "reason": "persistence_failed",
                    "message_telugu": "⚠️ Order expiry could not be saved safely. Please try again."}
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
    previous = copy.deepcopy(po)
    po["claim_utr"] = utr.strip()
    po["claimed_at"] = _now()
    po["status"] = "claimed"
    if not _persist():
        po.clear()
        po.update(previous)
        return {"success": False, "reason": "persistence_failed",
                "message_telugu": "⚠️ Payment claim could not be saved safely. Please try again."}
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
        previous = copy.deepcopy(po)
        po["status"] = "expired"
        if not _persist():
            po.clear()
            po.update(previous)
            return {"success": False, "reason": "persistence_failed",
                    "message_telugu": "⚠️ Order expiry could not be saved safely. Please try again."}
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
    po_before = copy.deepcopy(po)
    fulfillment_before = _snapshot_fulfillment_state(po)
    receipt_before = None
    offer_before = copy.deepcopy(get_offer(po.get("offer_code", ""))) if po.get("offer_code") else None
    po["utr"] = utr.strip()
    done = fulfill_order(po, "", "manual_utr")
    if not done.get("ok"):
        po.clear()
        po.update(po_before)
        _restore_fulfillment_state(fulfillment_before)
        _persist()
        return {"success": False, "reason": done.get("reason", "fulfillment_failed"),
                "message_telugu": done.get("message_telugu")}
    po["status"] = "paid"
    po["paid_at"] = _now()
    receipt = {"pay_order_id": po["id"], "utr": po["utr"], "amount": po["final_amount"],
               "purpose": po["purpose"], "ref": po["ref"], "tsap_id": po["tsap_id"],
               "paid_at": po["paid_at"], "detail": done.get("message_telugu")}
    po["receipt"] = receipt
    if po.get("offer_code") and not _consume_offer(po["offer_code"], po.get("tsap_id", "")):
        po.clear()
        po.update(po_before)
        _restore_fulfillment_state(fulfillment_before)
        if offer_before is not None:
            offer = get_offer(offer_before.get("code", ""))
            if offer is not None:
                offer.clear(); offer.update(offer_before)
        _persist()
        return {"success": False, "reason": "persistence_failed",
                "message_telugu": "⚠️ Payment promotion could not be recorded safely."}
    if not _persist():
        po.clear()
        po.update(po_before)
        _restore_fulfillment_state(fulfillment_before)
        if offer_before is not None:
            offer = get_offer(offer_before.get("code", ""))
            if offer is not None:
                offer.clear(); offer.update(offer_before)
        _persist()
        return {"success": False, "reason": "persistence_failed",
                "message_telugu": "⚠️ Payment could not be saved safely. Please try again."}
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
    """Reverse the paid benefit and durably commit its owning store before success."""
    out = {"reversed": [], "notes": [], "ok": True}
    try:
        import main as MAIN  # lazy
        user = MAIN._find_user(po.get("tsap_id", ""))
    except Exception:
        MAIN, user = None, None
    purpose, ref = po.get("purpose"), po.get("ref")
    main_refs = list(MAIN.DB_USERS) if MAIN is not None else None
    main_before = copy.deepcopy(MAIN.DB_USERS) if MAIN is not None else None
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
            if MAIN is None or not MAIN._persist_core_state():
                out["ok"] = False
                out["notes"].append("core_persistence_failed")
        elif purpose == "boost" and user is not None:
            if user.get("boost_until"):
                user["boost_until"] = ""
                out["reversed"].append("boost OFF")
            if MAIN is None or not MAIN._persist_core_state():
                out["ok"] = False
                out["notes"].append("core_persistence_failed")
        elif purpose == "ads":
            try:
                import ads as ADS  # lazy
                r = ADS.campaign_action(ref, "pause", "refund %s" % po.get("id", ""))
                if r.get("success"):
                    out["reversed"].append("campaign %s paused" % ref)
                else:
                    out["ok"] = False
                    out["notes"].append("campaign: %s" % r.get("message_telugu", "")[:60])
            except Exception as e:
                out["ok"] = False
                out["notes"].append("campaign_err: %s" % str(e)[:60])
        elif purpose == "assisted":
            try:
                import smart12 as S12  # lazy
                o = S12.get_order(ref)
                if o:
                    previous = copy.deepcopy(o)
                    o["status"] = "refunded"
                    o["refund_note"] = "pay %s refund" % po.get("id", "")
                    if not S12._persist():
                        o.clear()
                        o.update(previous)
                        out["ok"] = False
                        out["notes"].append("assisted_persistence_failed")
                    else:
                        out["reversed"].append("assisted %s -> refunded" % ref)
            except Exception as e:
                out["ok"] = False
                out["notes"].append("assisted_err: %s" % str(e)[:60])
    except Exception as e:
        out["ok"] = False
        out["notes"].append("reverse_err: %s" % str(e)[:80])
    if not out["ok"] and MAIN is not None and main_before is not None:
        _restore_main_users(MAIN, main_before, main_refs)
        # A failed persistence boundary is deliberately surfaced to the caller;
        # do not claim that the rollback itself was durably written.
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
    po_before = copy.deepcopy(po)
    fulfillment_before = _snapshot_fulfillment_state(po)
    rev = _reverse_fulfillment(po)
    if not rev.get("ok"):
        _restore_fulfillment_state(fulfillment_before)
        return {"success": False, "reason": "reversal_persistence_failed", "refund_id": refund_id,
                "message_telugu": "⚠️ Refund was not recorded because the benefit reversal could not be saved safely. Please retry after storage is healthy."}
    claw = {}
    try:
        import main as MAIN  # lazy
        from referral import reverse_referral_payment
        user = MAIN._find_user(po.get("tsap_id", ""))
        if user is not None and user.get("referred_by"):
            claw = reverse_referral_payment(user, int(po.get("final_amount", 0) or 0),
                                            MAIN.DB_USERS, reason="refund:" + po["id"])
            if claw.get("success") and not MAIN._persist_core_state():
                raise OSError("core persistence failed after referral clawback")
    except Exception as e:
        _restore_fulfillment_state(fulfillment_before)
        return {"success": False, "reason": "clawback_persistence_failed", "refund_id": refund_id,
                "message_telugu": "⚠️ Refund was not recorded because the referral reversal could not be saved safely. Please retry after storage is healthy."}
    po["status"] = "refunded"
    po["refunded_at"] = _now()
    po["refund_reason"] = reason
    po["refund_id"] = refund_id
    po["refund_via"] = via
    po["refund_reversal"] = rev
    po["refund_clawback"] = {"success": bool((claw or {}).get("success")),
                             "reversed": (claw or {}).get("reversed", 0)}
    # Mark the core finance history as refunded as well as the checkout ledger.
    # Older orders may predate the core mirror, so upsert them here.
    try:
        import main as MAIN
        core_record = _upsert_core_payment_record(po, payment_id=po.get("payment_id", ""), via=via)
        core_record.update({
            "status": "refunded", "refunded_at": po["refunded_at"],
            "refund_id": refund_id, "refund_via": via,
            "refund_reason": reason, "fulfilled": False,
        })
        if not MAIN._persist_core_state():
            po["reconciliation_required"] = True
            po["reconciliation_reason"] = "core_payment_history_save_failed"
    except Exception:
        po["reconciliation_required"] = True
        po["reconciliation_reason"] = "core_payment_history_update_failed"
    if not _persist():
        po.clear()
        po.update(po_before)
        # The external refund may already exist; keep the local benefit reversal
        # durable and surface a reconciliation state rather than claiming success.
        return {"success": False, "reason": "persistence_failed", "refund_id": refund_id,
                "message_telugu": "⚠️ Money refund was submitted, but the local refund ledger could not be saved. Do not retry blindly; reconcile this refund after storage is healthy."}
    return {"success": True, "order_id": po["id"], "refund_id": refund_id, "via": via,
            "reversed": rev.get("reversed", []), "clawback": po["refund_clawback"],
            "message_telugu": "\u2705 %s refund \u0c05\u0c2f\u0c4d\u0c2f\u0c3f\u0c02\u0c26\u0c3f (\u20b9%s, %s) - benefits reverse + commission clawback done" % (
                po["id"], po.get("final_amount", 0), "Razorpay (5-7 days)" if via == "razorpay" else "manual return")}
