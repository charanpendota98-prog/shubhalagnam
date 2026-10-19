"""
MANA VIVAHA — REFERRAL PROGRAM 🤝
=================================
The referrer may receive ₹50 once, after a referred user's first qualifying paid
consumer-plan purchase: S_99, S_199, S_299 or S_499, with an eligible payment amount
of at least ₹99. Add-ons, renewals, assisted services, boosts, gifts, complimentary
plans, bureau/B2B plans and other non-consumer payments do not qualify.

Referral registration credits are separate from the cash reward: a valid referral
attachment grants +2 interest-request credits to the referrer and +1 to the new user.
Payouts are requests from the referral wallet, with a ₹50 minimum and manual review;
there is no instant-transfer or fixed settlement-time promise.

Tier thresholds only change the dashboard badge; no extra commission, cash bonus,
priority support, report, or other perk is promised by tier.
"""
from __future__ import annotations
from atomic_store import atomic_json_dump

import hashlib
import copy
import json
import os
import random
import re
import secrets
import string
import threading
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Dict, List, Optional

SITE_URL = os.getenv("SITE_URL", "https://manavivaha.in").rstrip("/")

# ------------------------------------------------------------------ CONFIG
REFERRAL_VERSION = "2.0"

FIRST_PAY_COMMISSION = 50          # ₹50 — first qualifying consumer-plan payment only
MIN_QUALIFYING_AMOUNT = 99         # discounted payments below ₹99 do not qualify
QUALIFYING_PLAN_CODES = frozenset({"S_99", "S_199", "S_299", "S_499"})
REPEAT_COMMISSION_PCT = 0.0        # 🌊 WAVE 25: repeat ki commission LEDU (₹50 first-payment-only)
REPEAT_COMMISSION_CAP = 0          # retired — compat kosam uncham
REFEREE_BONUS_CREDITS = 1          # kotha user ki bonus credit (andariki)
MIN_PAYOUT = 50                    # minimum request from the referral wallet
# Review is manual. Do not expose a fixed payout ETA unless an enforceable SLA is introduced.
DAILY_PAYING_SOFT_CAP = 50         # high volume is flagged for review; not a public earning limit
LIFETIME_SOFT_CAP = 500            # high volume is flagged for review; not a public earning limit
SAME_PHONE_SOFT_LIMIT = 3          # family/shared-phone pattern is flagged for review

TIERS: List[Dict] = [
    {"key": "BRONZE",   "min": 0,  "extra_pct": 0,  "icon": "🥉", "perks": ["BRONZE dashboard badge"]},
    {"key": "SILVER",   "min": 3,  "extra_pct": 0,  "icon": "🥈", "perks": ["SILVER dashboard badge"]},
    {"key": "GOLD",     "min": 10, "extra_pct": 0,  "icon": "🥇", "perks": ["GOLD dashboard badge"]},
    {"key": "PLATINUM", "min": 25, "extra_pct": 0,  "icon": "💎", "perks": ["PLATINUM dashboard badge"]},
    {"key": "ELITE",    "min": 50, "extra_pct": 0,  "icon": "👑", "perks": ["ELITE dashboard badge"]},
]

MILESTONES: List[Dict] = [
    {"paid": 3,  "cash": 0, "credits": 0, "title": "🥈 SILVER Referrer", "telugu": "3 eligible first-plan rewards — SILVER dashboard badge"},
    {"paid": 10, "cash": 0, "credits": 0, "title": "🥇 GOLD Referrer", "telugu": "10 eligible first-plan rewards — GOLD dashboard badge"},
    {"paid": 25, "cash": 0, "credits": 0, "title": "💎 PLATINUM Referrer", "telugu": "25 eligible first-plan rewards — PLATINUM dashboard badge"},
    {"paid": 50, "cash": 0, "credits": 0, "title": "👑 ELITE Referrer", "telugu": "50 eligible first-plan rewards — ELITE dashboard badge"},
]

REFERRAL_TYPES = ("USER", "LADY", "STUDENT", "INFLUENCER", "BROKER", "BUREAU", "PHONE", "NONE")
STATE_FILE = os.environ.get("MANA_VIVAHA_REFERRAL_FILE", os.path.join(os.path.dirname(os.path.abspath(__file__)), "referral_state.json"))

PAYOUTS: List[Dict] = []          # admin queue (PAY-YYMMDD-XXXX)
CLICKS: List[Dict] = []           # /r/<code> clicks (audit + conversion funnel)
_LEDGER_SEQ = {"n": 0}


# ------------------------------------------------------------------ helpers
def _now() -> str:
    return datetime.utcnow().isoformat()


def _today() -> str:
    return datetime.utcnow().strftime("%Y-%m-%d")


def _next_id(prefix: str) -> str:
    _LEDGER_SEQ["n"] += 1
    return "%s-%s-%04d" % (prefix, datetime.utcnow().strftime("%y%m%d%H%M"), _LEDGER_SEQ["n"])


def _code_of(user: Dict) -> str:
    return str(user.get("referral_code") or "").upper().strip()


def qualifying_commission_entries(referral_stats: Dict) -> List[Dict]:
    """Ledger rows that satisfy the current, auditable one-time consumer-plan rule."""
    prices = {"S_99": 99, "S_199": 199, "S_299": 299, "S_499": 499}
    rows = []
    for entry in (referral_stats or {}).get("ledger", []) or []:
        code = str(entry.get("plan_code", "")).strip().upper()
        amount = int(entry.get("plan_amount", 0) or 0)
        if (entry.get("type") == "commission" and not entry.get("reversed")
                and entry.get("first_payment") is True and code in prices
                and MIN_QUALIFYING_AMOUNT <= amount <= prices[code]
                and int(entry.get("amount", 0) or 0) == FIRST_PAY_COMMISSION
                and entry.get("from")):
            rows.append(entry)
    return rows


def stats_of(user: Dict) -> Dict:
    """Referral stats; badge/paid counts derive only from verifiable eligible ledger rows."""
    s = user.setdefault("referral_stats", {})
    s.setdefault("clicks", 0)
    s.setdefault("registrations", s.get("total", 0))
    s.setdefault("total", s.get("registrations", 0))
    s.setdefault("wallet", user.get("wallet", 0))
    s.setdefault("lifetime_earned", s.get("wallet", 0))
    s.setdefault("pending_payout", 0)
    s.setdefault("paid_out", 0)
    s.setdefault("paid_today", 0)
    s.setdefault("paid_today_date", "")
    s.setdefault("milestones_hit", [])
    s.setdefault("flags", [])
    # Older versions counted broad has_paid/any-plan purchases. Do not expose those as
    # eligible ₹50 rewards or use them to advance public referral badges.
    s["paid_count"] = len({str(e.get("from")) for e in qualifying_commission_entries(s)})
    s["tier"] = tier_of(s["paid_count"])["key"]
    user["referral_tier"] = s["tier"]
    return s


def tier_of(paid_count: int) -> Dict:
    t = TIERS[0]
    for row in TIERS:
        if paid_count >= row["min"]:
            t = row
    return t


def next_milestone(paid_count: int) -> Optional[Dict]:
    for m in MILESTONES:
        if paid_count < m["paid"]:
            return {**m, "need": m["paid"] - paid_count}
    return None


def parse_referral_type(code: str) -> str:
    if not code:
        return "NONE"
    c = str(code).strip().upper()
    if c.startswith("BROKER-"):
        return "BROKER"
    if c.startswith("BUREAU-"):
        return "BUREAU"
    if c.isdigit() and len(c) >= 10:
        return "PHONE"
    if c.startswith("TSAP-REF-"):
        return "USER"
    if len(c) in (4, 5) and re.fullmatch(r"[A-Z]{3}[0-9]{1,2}", c):
        return "USER"          # LAK42 / SRI1
    return "USER"


def calculate_commission(referral_type: str, plan_amount: int, is_first_payment: bool = True,
                         tier: str = "BRONZE") -> int:
    """
    Flat ₹50 for the first qualifying consumer-plan payment only; repeat payments get ₹0.
    The caller must validate the S_99/S_199/S_299/S_499 plan code before this amount-only helper.
    """
    amount = int(plan_amount or 0)
    if amount < MIN_QUALIFYING_AMOUNT:
        return 0
    if not is_first_payment:
        return 0
    return int(FIRST_PAY_COMMISSION)


def check_bonus_eligibility(referrer_stats: Dict) -> Dict:
    """Report dashboard badge milestones; tiers add no cash or credits."""
    paid = int(referrer_stats.get("paid_count", 0) or 0)
    tier = tier_of(paid)
    hit = [m for m in MILESTONES if paid >= m["paid"]]
    already = set(referrer_stats.get("milestones_hit", []))
    new_hits = [m for m in hit if m["paid"] not in already]
    cash = sum(m["cash"] for m in new_hits)
    credits = sum(m["credits"] for m in new_hits)
    eligible = bool(new_hits)  # 🌊 WAVE 25: money ledu — badge recognition ke eligible
    return {
        "eligible": eligible, "bonus": cash, "credits": credits, "tier": tier["key"],
        "new_milestones": new_hits, "hit": hit,
        "reward": " + ".join(m["title"] for m in new_hits) if new_hits else "",
        "next": next_milestone(paid),
    }


def generate_short_code(name: str, existing_codes: Optional[list] = None) -> str:
    """Referral code — name first 3 letters (CAPITAL) + 4 digits — CHA0001, CHA0002…
    Per-name sequence (perugutundi), unique gaane untundi — phone lo easy type."""
    existing = {str(c).upper() for c in (existing_codes or [])}
    clean = "".join(c for c in str(name or "") if c.isalpha()).upper()
    base = (clean[:3] or "MVX").ljust(3, "X")
    # aa base tho unna existing codes lo max number → +1 (mistake avvakunda unique)
    nums = []
    for c in existing:
        m = re.fullmatch(r"([A-Z]{3})(\d{2,6})", c)
        if m and m.group(1) == base:
            nums.append(int(m.group(2)))
    n = (max(nums) + 1) if nums else 1
    for _ in range(300):
        code = "%s%04d" % (base, n)
        if code not in existing:
            return code
        n += 1
    return "%s%04d" % (base, random.randint(1000, 9999))


def generate_referral_code(tsap_id: str, existing_codes: Optional[list] = None) -> str:
    """Legacy wrapper — ippudu name-based short code (CHA0001 style) via ensure_referrer_profile."""
    if existing_codes:
        return generate_short_code("MVX", existing_codes)
    try:
        seq = str(tsap_id).split("-")[-1]
        return "%s%s" % (random.choice(["LAK", "RAJ", "SAI", "SRI", "POO", "KAR"]), seq[-2:])
    except Exception:
        return "%s%02d" % (random.choice(["LAK", "RAJ", "SAI"]), random.randint(10, 99))


def generate_broker_code(name: str) -> str:
    return "BROKER-" + generate_short_code(name)


def generate_bureau_code(name: str) -> str:
    clean = "".join(c for c in str(name or "") if c.isalpha()).upper()
    return "BUREAU-" + ((clean[:3] or "BRU") + str(random.randint(1, 9)))


# ------------------------------------------------------------------ state (durability)
def save_state() -> Dict:
    """Wallets / ledger / payouts / clicks → state file (restart aina safe)."""
    try:
        data = {"version": REFERRAL_VERSION, "at": _now(), "payouts": PAYOUTS[-500:],
                "clicks": CLICKS[-2000:]}
        atomic_json_dump(STATE_FILE, data, ensure_ascii=False)
        try:  # 🌊 WAVE 19 — partner wallets/stats kooda persist (attach/process mutates them)
            from refpartners import _save as _partner_save
            if _partner_save() is False:
                return {"ok": False, "reason": "partner_persistence_failed",
                        "error": "partner registry could not be saved"}
        except Exception as exc:
            return {"ok": False, "reason": "partner_persistence_failed", "error": str(exc)[:120]}
        return {"ok": True, "path": STATE_FILE}
    except Exception as e:
        return {"ok": False, "error": str(e)[:120]}


def _restore_dict(target: Dict, snapshot: Dict) -> None:
    """Restore a mutated record in place so callers holding it see the rollback."""
    target.clear()
    target.update(copy.deepcopy(snapshot))


def load_state() -> Dict:
    """Server start లో payouts + clicks మళ్లీ load. Users' wallets main.DB నుంచి (user dict లో)."""
    global PAYOUTS, CLICKS
    try:
        if not os.path.exists(STATE_FILE):
            return {"ok": True, "loaded": False}
        with open(STATE_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        PAYOUTS = list(data.get("payouts", []))
        CLICKS = list(data.get("clicks", []))
        return {"ok": True, "loaded": True, "payouts": len(PAYOUTS), "clicks": len(CLICKS)}
    except Exception as e:
        return {"ok": False, "error": str(e)[:120]}


# ------------------------------------------------------------------ referrer profile
def ensure_referrer_profile(user: Dict, all_users: Optional[List[Dict]] = None,
                            name_hint: str = "") -> Dict:
    """Prathi user కి referral code + link (register appude set అవుతుంది, leda ఇక్కడ)."""
    all_users = all_users if all_users is not None else []
    # ee user ni vadilisi, migilina vaalla codes (unique check ki)
    others = [_code_of(u) for u in all_users if u is not user and _code_of(u)]
    current = _code_of(user)
    if current.startswith("TSAP-REF-"):          # purathana deterministic alias → short code ki marchi,
        user["referral_alias"] = user.get("referral_alias") or current   # alias ni save cheyyadam (rendu pani chestayi)
        user["referral_code"] = ""
        current = ""
    # 🚨 DUPLICATE FIX: okate code rendu mandiki unte (seed data lo jarigindi) — kotha unique code istham
    if current and current in others:
        user["referral_code"] = ""
        current = ""
    if not current:
        short = generate_short_code(name_hint or user.get("full_name") or user.get("name") or "MV",
                                    others + [_code_of(user)])
        user["referral_code"] = short
    # pretty alias (TSAP-REF-xxxx) — purathana format kooda pani chestundi
    if not user.get("referral_alias"):
        digits = "".join(ch for ch in str(user.get("tsap_id", "")) if ch.isdigit())[-5:] or "%05d" % random.randint(1, 99999)
        alias = "TSAP-REF-" + digits
        taken = {str(u.get("referral_alias", "")).upper() for u in all_users if u is not user}
        if alias.upper() in taken:                  # alias kooda unique ga undali
            alias = "TSAP-REF-%s-%s" % (digits, user.get("tsap_id", "")[-2:] or "X")
        user["referral_alias"] = alias
    u = _code_of(user)
    _alias = str(user.get("referral_alias", "")).upper()
    if _alias and any(str(o.get("referral_alias", "")).upper() == _alias for o in all_users if o is not user):
        user["referral_alias"] = "TSAP-REF-%s" % u
    user["referral_link"] = "https://manavivaha.in/r/%s" % u
    user["referral_stats"] = stats_of(user)
    user["referral_tier"] = tier_of(user["referral_stats"]["paid_count"])["key"]
    return {"code": u, "alias": user["referral_alias"], "link": user["referral_link"],
            "tier": user["referral_tier"]}


def find_referrer(code: str, all_users: List[Dict]) -> Optional[Dict]:
    """Code / alias / phone / tsap_id — edi ichina referrer ని pattukuntundi."""
    if not code:
        return None
    probe = str(code).strip()
    p_up = probe.upper()
    for u in all_users:
        if _code_of(u) == p_up:
            return u
    for u in all_users:
        if str(u.get("referral_alias", "")).upper() == p_up or str(u.get("tsap_id", "")).upper() == p_up:
            return u
    if p_up.isdigit() and len(p_up) >= 10:      # phone referral
        for u in all_users:
            if str(u.get("phone", "")).strip() == p_up:
                return u
    # 🌊 WAVE 19 — referral partners (charan108 style IDs)
    try:
        from refpartners import find_partner_by_code
        return find_partner_by_code(probe)
    except Exception:
        return None


def validate_referral(code: str, all_users: List[Dict]) -> Dict:
    """Landing page / register form లో validate — 'ee code pani chestunda?'"""
    code = (code or "").strip()
    if not code:
        return {"ok": False, "valid_code": False, "reason": "code_missing", "message_telugu": "Referral code ఇవ్వలేదు"}
    ref = find_referrer(code, all_users)
    if not ref:
        return {"ok": False, "valid_code": False, "reason": "not_found", "code": code,
                "message_telugu": "⚠️ ఈ code దొరకలేదు — code సరిగా చూసుకోండి (లేదా code లేకుండా register అవ్వొచ్చు)"}
    st = stats_of(ref)
    name = ref.get("full_name") or ref.get("name") or "మన వివాహ member"
    return {"ok": True, "valid_code": True, "code": _code_of(ref), "alias": ref.get("referral_alias", ""),
            "referrer_name": name, "referrer_id": ref.get("tsap_id"),
            "tier": tier_of(st["paid_count"])["key"], "paid_count": st["paid_count"],
            "bonus_credits": REFEREE_BONUS_CREDITS, "commission_offer": FIRST_PAY_COMMISSION,
            "message_telugu": "✅ %s గారు ద్వారా వచ్చారు — valid referral attach అయితే మీకు +%d interest-request credit వస్తుంది. ₹50 reward వేరే అర్హతలపై ఆధారపడి ఉంటుంది." % (name, REFEREE_BONUS_CREDITS)}


def attach_referral(user: Dict, code: str, all_users: List[Dict]) -> Dict:
    """
    Register time lo referral ni **lock** chestundi + referee bonus credit isthundi.
    Guards: self-referral (same phone / same tsap), already-referred lock, code invalid.

    The lock covers both sides of the ledger. Locking only the new user allowed
    concurrent friends to overwrite one referrer's credit/stat increment.
    """
    normalized_code = str(code or "").strip().upper()
    ref = find_referrer(normalized_code, all_users or [])
    user_key = "user:" + _ref_lock_key(user)
    ref_key = "ref:" + (_code_of(ref) if ref else "invalid:" + normalized_code)
    keys = sorted({"attach:" + user_key, "attach:" + ref_key})
    locks = [_REF_LOCKS[key] for key in keys]
    for lock in locks:
        lock.acquire()
    try:
        return _attach_referral_locked(user, normalized_code, all_users)
    finally:
        for lock in reversed(locks):
            lock.release()


def _attach_referral_locked(user: Dict, code: str, all_users: List[Dict]) -> Dict:
    code = (code or "").strip()
    if not code:
        return {"ok": False, "reason": "no_code"}
    ref = find_referrer(code, all_users)
    if not ref:
        return {"ok": False, "reason": "not_found",
                "message_telugu": "⚠️ Referral code దొరకలేదు — code లేకుండా continue అవుతున్నారు"}
    # 🚨 SELF-REFERRAL block (same person / same phone)
    if ref.get("tsap_id") == user.get("tsap_id"):
        return {"ok": False, "reason": "self_referral",
                "message_telugu": "🚫 మీ సొంత code వాడుకోవద్దు — self-referral allowed లేదు"}
    # 📞 Same phone => BLOCK LEDU (okka phone lo family members kooda refer cheyyochu).
    #    Kaani audit ki flag pedatham — 3+ accounts aithe review (+ admin refund possible).
    _family_same_phone = bool(user.get("phone") and ref.get("phone") and str(user["phone"]) == str(ref["phone"]))
    if user.get("referred_by"):
        return {"ok": False, "reason": "already_referred", "referred_by": user.get("referred_by"),
                "message_telugu": "ℹ️ మీ account కి already ఒక referral lock అయ్యింది"}
    # ✅ lock + stats
    user_before = copy.deepcopy(user)
    ref_before = copy.deepcopy(ref)
    user["referred_by"] = _code_of(ref)
    user["referred_by_name"] = ref.get("full_name") or ref.get("name") or ""
    user["referred_at"] = _now()
    st = stats_of(ref)
    st["registrations"] = int(st.get("registrations", 0)) + 1
    _soft_flags = []
    if _family_same_phone:
        st["same_phone_joins"] = int(st.get("same_phone_joins", 0)) + 1
        _soft_flags.append("same_phone_join:%d" % st["same_phone_joins"])
        if st["same_phone_joins"] >= SAME_PHONE_SOFT_LIMIT:
            _soft_flags.append("multi_account_review:%d" % st["same_phone_joins"])
    for _f in _soft_flags:
        if _f not in st["flags"]:
            st["flags"].append(_f)
    if _family_same_phone:
        st.setdefault("ledger", []).append(
            {"id": _next_id("RJ"), "at": _now(), "type": "join_event", "amount": 0,
             "from": user.get("tsap_id"), "from_name": user.get("full_name") or user.get("name", ""),
             "note": "same phone నుంచి join (family) — flag only, block లేదు"})
    # Referral credits are interest-request credits, separate from the ₹50 cash reward.
    REFERRER_REG_CREDITS = 2
    ref["credits"] = int(ref.get("credits", 0) or 0) + REFERRER_REG_CREDITS
    ref.setdefault("credit_history", []).append(
        {"at": _now(), "change": REFERRER_REG_CREDITS, "reason": "referral_friend_registered",
         "by": user.get("tsap_id"), "note": f"మీ referral తో {user.get('full_name', 'కొత్త సభ్యులు')} చేరారు (+{REFERRER_REG_CREDITS} ఉచిత క్రెడిట్స్)"}
    )
    st["credits_earned"] = int(st.get("credits_earned", 0) or 0) + REFERRER_REG_CREDITS
    st["total"] = st["registrations"]
    ref["referral_stats"] = st
    # 💎 If this registration came from a per-person invite link, close that loop
    # so the referrer can see "sent → opened → joined" for one named person.
    try:
        invite_mark_join(_code_of(ref), user.get("referral_invite_token", ""),
                         user.get("tsap_id", ""), all_users)
    except Exception:
        pass
    # 🎁 referee (kotha user) bonus — andariki
    user["credits"] = int(user.get("credits", 0) or 0) + REFEREE_BONUS_CREDITS
    user.setdefault("credit_history", []).append(
        {"at": _now(), "change": REFEREE_BONUS_CREDITS, "reason": "referral_join_bonus",
         "by": _code_of(ref), "note": "Referral తో register — bonus credit"})
    saved = save_state()
    if not saved.get("ok"):
        _restore_dict(ref, ref_before)
        _restore_dict(user, user_before)
        return {"ok": False, "reason": "persistence_failed",
                "message_telugu": "⚠️ Referral registration could not be saved safely. Please try again."}
    return {"ok": True, "referrer_code": _code_of(ref), "referrer_id": ref.get("tsap_id"),
            "referrer_name": ref.get("full_name") or ref.get("name") or "", "bonus_credits": REFEREE_BONUS_CREDITS,
            "referrer_bonus_credits": REFERRER_REG_CREDITS,
            "referee_credits": user.get("credits", 0), "commission_offer": FIRST_PAY_COMMISSION,
            "flags": _soft_flags,
            "note_telugu": ("ℹ️ మీ code తో ఒకటే phone నుంచి ఇంకా ఒకరు join అయ్యారు — పర్వాలేదు, "
                            "కానీ మన team verify చేస్తుంది" if _family_same_phone else ""),
            "message_telugu": "🎉 Referral lock అయ్యింది (%s) — మీకు +%d interest-request credit వచ్చింది. ఈ credits, referrer కు వచ్చే షరతులతో కూడిన ₹50 reward కి వేరు."
                              % (_code_of(ref), REFEREE_BONUS_CREDITS)}


# ------------------------------------------------------------------ payment → commission
def _fraud_flags(referrer: Dict, referred_user: Dict, all_users: List[Dict]) -> List[str]:
    st = stats_of(referrer)
    flags = []
    if st.get("paid_today_date") != _today():
        return flags
    if int(st.get("paid_today", 0)) >= DAILY_PAYING_SOFT_CAP:
        flags.append("daily_soft_cap:%d" % st["paid_today"])
    if int(st.get("paid_count", 0)) >= LIFETIME_SOFT_CAP:
        flags.append("lifetime_soft_cap")
    if referred_user.get("phone") and str(referred_user["phone"]).startswith(("000", "111")):
        flags.append("test_phone")
    if referrer.get("phone") and referred_user.get("phone") and \
            str(referrer["phone"]) == str(referred_user["phone"]):
        flags.append("same_phone_family")      # block ledu — review flag matrame
    return flags


def process_referral_payment(referred_user: Dict, referrer_code: str, plan_amount: int,
                             all_users: List[Dict], payment_id: str = "", plan_code: str = "") -> Dict:
    """Credit a referrer only for the referee's first qualifying consumer-plan payment."""
    ref = find_referrer(str(referrer_code or "").strip(), all_users or [])
    keys = sorted({
        "commission:user:" + _ref_lock_key(referred_user),
        "commission:ref:" + (_code_of(ref) if ref else "invalid:" + str(referrer_code or "").strip().upper()),
    })
    locks = [_REF_LOCKS[key] for key in keys]
    for lock in locks:
        lock.acquire()
    try:
        return _process_referral_payment_locked(referred_user, referrer_code, plan_amount,
                                                all_users, payment_id, plan_code)
    finally:
        for lock in reversed(locks):
            lock.release()


def _process_referral_payment_locked(referred_user: Dict, referrer_code: str, plan_amount: int,
                                     all_users: List[Dict], payment_id: str = "", plan_code: str = "") -> Dict:
    """
    ₹50 flat once, on a paid S_99/S_199/S_299/S_499 consumer plan.
    Add-ons, renewals, bureau packs, assisted services, boosts, gifts, and other payment
    types are ineligible. A repeat qualifying-plan purchase earns no additional commission.
    """
    code = str(plan_code or "").strip().upper()
    if code not in QUALIFYING_PLAN_CODES:
        return {"success": False, "reason": "ineligible_plan", "plan_code": code,
                "message_telugu": "ℹ️ Referral reward S_99/S_199/S_299/S_499 consumer plan payment కి మాత్రమే వర్తిస్తుంది"}
    amount = int(plan_amount or 0)
    expected_plan_price = {"S_99": 99, "S_199": 199, "S_299": 299, "S_499": 499}[code]
    if amount <= 0 or amount > expected_plan_price:
        return {"success": False, "reason": "amount_mismatch", "amount": amount, "plan_code": code,
                "message_telugu": "⚠️ Referral reward కోసం paid amount plan ధరతో సరిపోవాలి"}
    ref = find_referrer(referrer_code, all_users)
    if not ref:
        return {"success": False, "reason": "referrer_not_found", "code": referrer_code,
                "message_telugu": "⚠️ Referrer దొరకలేదు — admin verify చేస్తాడు (commission pending)"}
    if amount < MIN_QUALIFYING_AMOUNT:
        return {"success": False, "reason": "amount_too_small", "amount": amount,
                "message_telugu": "ℹ️ ₹%d payments కి referral bonus లేదు (min ₹%d)" % (amount, MIN_QUALIFYING_AMOUNT)}

    ref_before = copy.deepcopy(ref)
    referred_before = copy.deepcopy(referred_user)
    st = stats_of(ref)
    flags = _fraud_flags(ref, referred_user, all_users)
    if flags:
        flag = "fraud_review:" + ",".join(flags)
        if flag not in st["flags"]:
            st["flags"].append(flag)
        # 🚦 SOFT mode: commission ippude wallet lo pothundi (aapemu) — admin review flag matrame.
        #    Fraud proof ayithe /api/admin/refund tho clawback chestham.

    # First *qualifying consumer-plan* payment: persist a referee marker as well as
    # checking the referrer's ledger so a retry/restart cannot issue a second reward.
    has_prior_reward = bool(referred_user.get("referral_first_qualifying_plan_paid_at")) or any(
        l.get("from") == referred_user.get("tsap_id")
        for l in qualifying_commission_entries(st)
    )
    first = not has_prior_reward
    tier = tier_of(st["paid_count"])["key"]
    commission = calculate_commission(parse_referral_type(referrer_code), amount, first, tier)
    if commission <= 0:
        if not first:
            referred_user["has_paid"] = True
            referred_user.setdefault("first_paid_at", _now())
            if not save_state().get("ok"):
                _restore_dict(ref, ref_before)
                _restore_dict(referred_user, referred_before)
                return {"success": False, "reason": "persistence_failed",
                        "message_telugu": "⚠️ Referral payment status could not be saved safely."}
        return {"success": False, "reason": "no_repeat_commission" if not first else "zero_commission",
                "amount": amount, "first_payment": first,
                "message_telugu": ("ℹ️ Repeat payment — referral commission ఒక్కసారి మాత్రమే (₹50 already ఇచ్చాం 🙂)"
                                   if not first else "ℹ️ ఈ payment కి referral commission లేదు")}

    # 👛 wallet credit
    st["wallet"] = round(float(st.get("wallet", 0)) + commission, 2)
    st["lifetime_earned"] = round(float(st.get("lifetime_earned", 0)) + commission, 2)
    ref["wallet"] = st["wallet"]
    st["paid_count"] = int(st.get("paid_count", 0)) + 1
    # 🌊 WAVE 20 — join paid-ness source of truth (dashboards + ledger anni ikkadi nunchi)
    referred_user["has_paid"] = True
    referred_user.setdefault("first_paid_at", _now())
    referred_user["referral_first_qualifying_plan_paid_at"] = _now()
    referred_user["referral_first_qualifying_plan_code"] = code
    referred_user["referral_first_qualifying_payment_id"] = payment_id or ""
    if st.get("paid_today_date") != _today():
        st["paid_today_date"] = _today()
        st["paid_today"] = 0
    st["paid_today"] = int(st.get("paid_today", 0)) + 1
    st["last_paid_at"] = _now()
    st.setdefault("ledger", []).append({
        "id": _next_id("RC"), "at": _now(), "type": "commission", "amount": commission,
        "from": referred_user.get("tsap_id"), "from_name": referred_user.get("full_name") or referred_user.get("name", ""),
        "plan_amount": amount, "plan_code": code, "first_payment": first, "tier": tier, "payment_id": payment_id,
        "note": ("మొదటి payment bonus ₹%d (flat)" % FIRST_PAY_COMMISSION),
    })

    # Tier thresholds update dashboard badges only; milestone cash and credit rewards are disabled.
    bonus = check_bonus_eligibility(st)
    bonus_credits_added = 0
    if bonus["credits"]:
        ref["credits"] = int(ref.get("credits", 0) or 0) + bonus["credits"]
        bonus_credits_added = bonus["credits"]
        ref.setdefault("credit_history", []).append(
            {"at": _now(), "change": bonus["credits"], "reason": "referral_milestone",
             "note": " + ".join(m["title"] for m in bonus["new_milestones"])})
    if bonus["bonus"]:
        st["wallet"] = round(float(st["wallet"]) + bonus["bonus"], 2)
        st["lifetime_earned"] = round(float(st["lifetime_earned"]) + bonus["bonus"], 2)
        ref["wallet"] = st["wallet"]
        st["ledger"].append({"id": _next_id("MB"), "at": _now(), "type": "milestone",
                             "amount": bonus["bonus"], "note": bonus["reward"]})
    for m in bonus["new_milestones"]:
        st["milestones_hit"].append(m["paid"])
    new_tier = tier_of(st["paid_count"])
    st["tier"] = new_tier["key"]
    ref["referral_tier"] = new_tier["key"]
    # 💎 Per-person invite stage → rewarded (same one-time rule, one row).
    try:
        invite_mark_paid(str(referred_user.get("tsap_id", "")), commission, all_users)
    except Exception:
        pass

    # referee ki thank-you + referrer ki notification (Telugu)
    # 💎 Next badge line: "ఇంకా N eligible rewards" — recognition mathi, cash promise kaadu.
    _nxt = bonus.get("next") or {}
    _nxt_line = ("ఇంకా %d eligible reward%s వస్తే %s badge వస్తుంది (badge మాత్రమే — అదనపు cash/credits లేవు). "
                 % (_nxt.get("need", 0), "s" if int(_nxt.get("need", 0) or 0) != 1 else "",
                    _nxt.get("title", ""))) if _nxt.get("need") else ""
    msg_ref = ("✅ Eligible first consumer-plan payment record అయింది: %s (₹%s). "
               "మీ referral wallet కు ఒక్కసారి ₹%s జమైంది. Balance: ₹%s | Dashboard tier: %s %s. "
               "Tier badges వల్ల అదనపు cash లేదా credits రావు. %s"
               % (referred_user.get("tsap_id", "friend"), _money(amount), _money(commission),
                  _money(st["wallet"]), new_tier["icon"], new_tier["key"], _nxt_line)).strip()
    if not save_state().get("ok"):
        _restore_dict(ref, ref_before)
        _restore_dict(referred_user, referred_before)
        return {"success": False, "reason": "persistence_failed",
                "message_telugu": "⚠️ Referral reward could not be saved safely. Please try again."}
    return {
        "success": True, "referrer_id": ref.get("tsap_id"), "referrer_code": _code_of(ref),
        "referrer_name": ref.get("full_name") or ref.get("name", ""),
        "commission": commission, "first_payment": first, "tier": new_tier["key"],
        "tier_icon": new_tier["icon"], "bonus": bonus["bonus"], "bonus_credits": bonus_credits_added,
        "milestones": [m["title"] for m in bonus["new_milestones"]],
        "wallet": st["wallet"], "lifetime_earned": st["lifetime_earned"],
        "paid_count": st["paid_count"], "next_milestone": bonus["next"],
        "referrer_new_credits": ref.get("credits", 0),
        "message_telugu": msg_ref,
        "referee_message_telugu": ("🙏 మీ payment success. మీ referral code వాడినందుకు referrer కు ఈ first eligible consumer-plan payment పై ఒకసారి ₹%d reward wallet లో నమోదు అయింది. మీకు వచ్చే referral benefit అనేది valid attachment పై +1 interest-request credit మాత్రమే; cash కాదు." % commission),
    }


def reverse_referral_payment(referred_user: Dict, plan_amount: int, all_users: List[Dict],
                             reason: str = "refund") -> Dict:
    """Payment refund/chargeback అయితే — referrer wallet నుంచి commission తీసేస్తాం (clawback)."""
    code = referred_user.get("referred_by")
    ref = find_referrer(code or "", all_users)
    if not ref:
        return {"success": False, "reason": "referrer_not_found"}
    ref_before = copy.deepcopy(ref)
    referred_before = copy.deepcopy(referred_user)
    st = stats_of(ref)
    def _candidates():
        return [e for e in qualifying_commission_entries(st)
                if e.get("from") == referred_user.get("tsap_id")]
    cands = _candidates()
    if not cands:
        return {"success": False, "reason": "no_commission_found"}
    # The refund amount is part of the accounting identity. Never fall back to
    # the latest commission when an operator omitted it or supplied a different
    # plan amount: that can reverse an unrelated reward.
    try:
        requested_amount = int(plan_amount)
    except (TypeError, ValueError):
        requested_amount = 0
    if requested_amount <= 0:
        return {"success": False, "reason": "amount_required",
                "message_telugu": "⚠️ Refund reversal కి original paid amount తప్పనిసరి"}
    exact = [e for e in cands if int(e.get("plan_amount", 0)) == requested_amount]
    if not exact:
        return {"success": False, "reason": "no_commission_for_amount",
                "message_telugu": "⚠️ ఈ amount కి matching commission దొరకలేదు — ఏ commission reverse కాలేదు"}
    target = exact[-1]
    paid_back = int(target.get("amount", 0))
    target["reversed"] = True
    target["reversed_at"] = _now()
    target["reversed_reason"] = reason
    if not paid_back:
        return {"success": False, "reason": "no_commission_found"}
    st["wallet"] = round(float(st.get("wallet", 0)) - paid_back, 2)
    st["lifetime_earned"] = round(float(st.get("lifetime_earned", 0)) - paid_back, 2)
    ref["wallet"] = st["wallet"]
    st["paid_count"] = max(0, int(st.get("paid_count", 0)) - 1)
    st.setdefault("ledger", []).append({"id": _next_id("RV"), "at": _now(), "type": "reversal",
                                        "amount": -paid_back, "from": referred_user.get("tsap_id"),
                                        "note": "Refund clawback — %s" % reason})
    if not save_state().get("ok"):
        ref.clear()
        ref.update(ref_before)
        referred_user.clear()
        referred_user.update(referred_before)
        return {"success": False, "reason": "persistence_failed",
                "message_telugu": "⚠️ Referral clawback could not be saved safely. Please try again."}
    return {"success": True, "reversed": paid_back, "wallet": st["wallet"],
            "message_telugu": "↩️ Refund జరిగింది — ₹%d commission wallet నుంచి తీసేశాం" % paid_back}


# ------------------------------------------------------------------ payouts
UPI_RE = re.compile(r"^[a-zA-Z0-9._-]{2,64}@[a-zA-Z]{2,32}$")
IFSC_RE = re.compile(r"^[A-Z]{4}0[A-Z0-9]{6}$")
# 🌊 WAVE 25 — payout UTR/reference: UPI 12-digit ref / bank UTR (audit must be traceable)
PAYOUT_UTR_RE = re.compile(r"^[A-Za-z0-9_-]{6,30}$")
_PAYOUT_LOCKS: Dict[str, threading.Lock] = defaultdict(threading.Lock)
# 🌊 WAVE 27 — race locks: concurrent request/commission/attach → double-money ban
_REF_LOCKS: Dict[str, threading.Lock] = defaultdict(threading.Lock)


def _ref_lock_key(user: Dict) -> str:
    return str((user or {}).get("tsap_id") or (user or {}).get("partner_id") or "anon")


def valid_payout_utr(utr: str) -> bool:
    """Admin payout reference — khali/malformed UTR తో approve cheyyakudadu."""
    u = (utr or "").strip()
    if not PAYOUT_UTR_RE.fullmatch(u):
        return False
    if u.strip("0") == "":
        return False
    return True


def payout_request(user: Dict, amount: int, method: str = "upi", upi_id: str = "",
                   bank: Optional[Dict] = None, note: str = "") -> Dict:
    """Create a manual-review payout request from the referral wallet (₹50 minimum)."""
    with _REF_LOCKS["payreq:" + _ref_lock_key(user)]:
        return _payout_request_locked(user, amount, method, upi_id, bank, note)


def _payout_request_locked(user: Dict, amount: int, method: str = "upi", upi_id: str = "",
                           bank: Optional[Dict] = None, note: str = "") -> Dict:
    st = stats_of(user)
    method = (method or "upi").lower()
    try:
        amount = int(amount)
    except Exception:
        return {"ok": False, "reason": "bad_amount", "message_telugu": "⚠️ Amount సరిగా ఇవ్వండి", "message_en": "Enter a valid payout amount."}
    if method not in ("upi", "bank"):
        return {"ok": False, "reason": "bad_method", "message_telugu": "⚠️ upi లేదా bank మాత్రమే", "message_en": "Choose UPI or bank transfer."}
    if amount < MIN_PAYOUT:
        return {"ok": False, "reason": "below_min", "min": MIN_PAYOUT,
                "message_telugu": "ℹ️ Minimum ₹%d నుంచి payout అడగొచ్చు — మీ wallet ₹%s" % (MIN_PAYOUT, st["wallet"]),
                "message_en": "The minimum payout request is ₹%d. Your wallet balance is ₹%s." % (MIN_PAYOUT, st["wallet"])}
    if amount > float(st.get("wallet", 0)):
        return {"ok": False, "reason": "insufficient_wallet", "wallet": st["wallet"],
                "message_telugu": "⚠️ Wallet లో ₹%s మాత్రమే ఉంది — ₹%d అడగలేరు" % (st["wallet"], amount),
                "message_en": "Your wallet balance is ₹%s, which is less than the requested ₹%d." % (st["wallet"], amount)}
    _me = user.get("tsap_id") or user.get("partner_id")
    if any((p.get("tsap_id") or p.get("partner_id")) == _me and p.get("status") == "requested" for p in PAYOUTS):
        return {"ok": False, "reason": "pending_exists",
                "message_telugu": "⏳ మీ పాత payout request ఇంకా process లో ఉంది — అది అయ్యాక మళ్లీ అడగండి",
                "message_en": "A previous payout request is still pending. Please wait for it to be reviewed."}
    if method == "upi":
        if not UPI_RE.fullmatch((upi_id or "").strip()):
            return {"ok": False, "reason": "bad_upi",
                    "message_telugu": "⚠️ UPI ID తప్పులా ఉంది (ఉదాహరణ: name@okhdfcbank)",
                    "message_en": "Enter a valid UPI ID (for example, name@okhdfcbank)."}
    else:
        bank = bank or {}
        if not (str(bank.get("account_no", "")).strip() and IFSC_RE.fullmatch(str(bank.get("ifsc", "")).strip().upper())
                and str(bank.get("holder", "")).strip()):
            return {"ok": False, "reason": "bad_bank",
                    "message_telugu": "⚠️ Bank details సరిగా ఇవ్వండి (holder + account no + IFSC)",
                    "message_en": "Enter the account holder, account number, and a valid IFSC code."}
    req = {
        "id": _next_id("PAY"), "tsap_id": user.get("tsap_id"), "partner_id": user.get("partner_id", ""),
        "name": user.get("full_name") or user.get("name", ""),
        "code": _code_of(user), "amount": amount, "method": method,
        "upi_id": (upi_id or "").strip() if method == "upi" else "",
        "bank": {k: str(v).strip() for k, v in (bank or {}).items()} if method == "bank" else {},
        "status": "requested", "requested_at": _now(), "utr": "", "note": note,
        "tier": st.get("tier", "BRONZE"),
    }
    user_before = copy.deepcopy(user)
    PAYOUTS.append(req)
    st["wallet"] = round(float(st.get("wallet", 0)) - amount, 2)
    st["pending_payout"] = round(float(st.get("pending_payout", 0)) + amount, 2)
    user["wallet"] = st["wallet"]
    st.setdefault("ledger", []).append({"id": _next_id("PR"), "at": _now(), "type": "payout_request",
                                        "amount": -amount, "note": "%s → %s" % (req["id"], upi_id or "bank")})
    if not save_state().get("ok"):
        if req in PAYOUTS:
            PAYOUTS.remove(req)
        user.clear()
        user.update(user_before)
        return {"ok": False, "reason": "persistence_failed",
                "message_telugu": "⚠️ Payout request could not be saved safely. Please try again."}
    return {"ok": True, "request": req, "wallet": st["wallet"],
            "message_telugu": "✅ Payout request అందింది (%s • ₹%d). ఇది admin review కోసం queue లో ఉంది. Fixed processing time హామీ లేదు; dashboard లో status చూడండి."
                              % (req["id"], amount),
            "message_en": "Payout request %s for ₹%d was received and queued for manual review. Processing time is not guaranteed; check the dashboard for status."
                              % (req["id"], amount)}


def payout_action(request_id: str, action: str, all_users: List[Dict], utr: str = "",
                  reason: str = "") -> Dict:
    """Admin: payout approve (UTR తో) / reject (wallet కి మళ్లీ credit)."""
    # 🌊 WAVE 25 — per-request lock: double-click approve double-pay avvakudadu
    with _PAYOUT_LOCKS[str(request_id or "")]:
        return _payout_action_locked(request_id, action, all_users, utr=utr, reason=reason)


def _payout_action_locked(request_id: str, action: str, all_users: List[Dict], utr: str = "",
                          reason: str = "") -> Dict:
    req = next((p for p in PAYOUTS if p["id"] == request_id), None)
    if not req:
        return {"ok": False, "reason": "not_found", "message_telugu": "⚠️ ఈ payout request దొరకలేదు"}
    if req["status"] != "requested":
        return {"ok": False, "reason": "already_%s" % req["status"]}
    user = next((u for u in all_users if u.get("tsap_id") == req["tsap_id"]), None)
    if not user and req.get("partner_id"):
        # 🌊 WAVE 21 — partner payout: user table lo undadu, partner registry lo
        try:
            from refpartners import get_partner
            user = get_partner(req["partner_id"])
        except Exception:
            user = None
    if not user:
        return {"ok": False, "reason": "user_not_found"}
    user_before = copy.deepcopy(user)
    req_before = copy.deepcopy(req)
    st = stats_of(user)
    action = (action or "").lower()
    if action in ("approve", "paid"):
        if not valid_payout_utr(utr):
            return {"ok": False, "reason": "utr_invalid",
                    "message_telugu": "⚠️ Valid UTR/reference ఇవ్వండి (6-30 letters/digits, only-zero కాదు) — audit కి mandatory"}
        utr = utr.strip()
        if float(st.get("pending_payout", 0)) < float(req["amount"]):
            return {"ok": False, "reason": "pending_mismatch",
                    "message_telugu": "⚠️ Pending amount mismatch — data repair తర్వాత approve చెయ్యండి"}
        req.update({"status": "paid", "utr": utr, "paid_at": _now(), "paid_by": "admin"})
        st["pending_payout"] = round(float(st.get("pending_payout", 0)) - float(req["amount"]), 2)
        st["paid_out"] = round(float(st.get("paid_out", 0)) + float(req["amount"]), 2)
        # 🌊 WAVE 25 — TRANSACTION LIST lo PAID: user wallet nunchi debit appude ayyindi
        # (request time), ippudu PAID confirmation entry (UTR tho) — user adi chusthadu ✅
        st.setdefault("ledger", []).append({"id": _next_id("PD"), "at": _now(), "type": "payout_paid",
                                            "amount": 0, "paid": True, "utr": utr,
                                            "note": "✅ PAID ₹%s • UTR %s" % (req["amount"], utr)})
        msg = "🎉 ₹%d మీ %s కి pampinchi — UTR: %s. Thank you!" % (
            req["amount"], "UPI" if req["method"] == "upi" else "bank", utr)
    elif action in ("reject", "cancel"):
        req.update({"status": "rejected", "reason": reason or "admin_reject", "rejected_at": _now()})
        st["wallet"] = round(float(st.get("wallet", 0)) + float(req["amount"]), 2)
        st["pending_payout"] = round(float(st.get("pending_payout", 0)) - float(req["amount"]), 2)
        user["wallet"] = st["wallet"]
        st.setdefault("ledger", []).append({"id": _next_id("PB"), "at": _now(), "type": "payout_reject",
                                            "amount": float(req["amount"]),
                                            "note": "Reject (%s) → wallet కి మళ్లీ" % (reason or "admin")})
        msg = "ℹ️ Payout %s reject అయ్యింది (%s) — ₹%d మళ్లీ మీ wallet లో add చేశాం." % (
            req["id"], reason or "admin", req["amount"])
    else:
        return {"ok": False, "reason": "bad_action"}
    user["referral_stats"] = st
    if not save_state().get("ok"):
        req.clear()
        req.update(req_before)
        user.clear()
        user.update(user_before)
        return {"ok": False, "reason": "persistence_failed",
                "message_telugu": "⚠️ Payout action could not be saved safely. Please try again."}
    return {"ok": True, "request": req, "wallet": st.get("wallet"), "message_telugu": msg}


def pay_wallet_full(code: str, all_users: List[Dict], utr: str = "",
                    method: str = "upi", note: str = "") -> Dict:
    """🌊 WAVE 21 — ADMIN manual pay: PhonePe/bank lo amount pampaka → wallet 0.
    Full wallet ni paid_out ki move + ledger + payout record (UTR audit). User + partner."""
    # 🌊 WAVE 25 — lock + strict UTR (double admin-click double-zero avvakudadu)
    with _PAYOUT_LOCKS["full:" + str(code or "").strip().upper()]:
        return _pay_wallet_full_locked(code, all_users, utr=utr, method=method, note=note)


def _pay_wallet_full_locked(code: str, all_users: List[Dict], utr: str = "",
                            method: str = "upi", note: str = "") -> Dict:
    if not valid_payout_utr(utr):
        return {"ok": False, "reason": "utr_invalid",
                "message_telugu": "⚠️ Valid UTR/reference ఇవ్వండి (6-30 letters/digits) — audit కి mandatory"}
    utr = utr.strip()
    ref = find_referrer(code, all_users)
    if not ref:
        return {"ok": False, "reason": "referrer_not_found",
                "message_telugu": "⚠️ Referrer దొరకలేదు"}
    st = stats_of(ref)
    amt = round(float(st.get("wallet", 0) or 0), 2)
    if amt <= 0:
        return {"ok": False, "reason": "wallet_empty",
                "message_telugu": "ℹ️ Wallet already ₹0 — pay చెయ్యడానికి ఏమీ లేదు"}
    me = ref.get("tsap_id") or ref.get("partner_id")
    if any((x.get("tsap_id") or x.get("partner_id")) == me and x.get("status") == "requested" for x in PAYOUTS):
        return {"ok": False, "reason": "pending_exists",
                "message_telugu": "⏳ Payout request already pending లో ఉంది — దాన్నే approve/reject చెయ్యండి"}
    ref_before = copy.deepcopy(ref)
    req = {"id": _next_id("PAY"), "tsap_id": ref.get("tsap_id"), "partner_id": ref.get("partner_id", ""),
           "name": ref.get("full_name") or ref.get("name", ""),
           "code": _code_of(ref), "amount": amt, "method": (method or "upi").lower(),
           "upi_id": "", "bank": {}, "status": "paid", "requested_at": _now(),
           "utr": utr.strip(), "paid_at": _now(), "paid_by": "admin",
           "note": ("admin_pay_full:" + str(note or "")).strip(":"),
           "eta_days": 0, "tier": st.get("tier", "BRONZE")}
    PAYOUTS.append(req)
    st["wallet"] = 0
    ref["wallet"] = 0
    st["paid_out"] = round(float(st.get("paid_out", 0)) + amt, 2)
    st.setdefault("ledger", []).append({"id": _next_id("PA"), "at": _now(), "type": "payout_manual_full",
                                        "amount": -amt, "note": "%s → UTR %s (wallet 0)" % (req["id"], utr.strip())})
    ref["referral_stats"] = st
    if not save_state().get("ok"):
        if req in PAYOUTS:
            PAYOUTS.remove(req)
        ref.clear()
        ref.update(ref_before)
        return {"ok": False, "reason": "persistence_failed",
                "message_telugu": "⚠️ Manual payout could not be saved safely. Please try again."}
    return {"ok": True, "request": req, "wallet": 0, "paid": amt,
            "message_telugu": "✅ ₹%s manual pay (UTR %s) — wallet ₹0 అయ్యింది" % (amt, utr.strip())}


def payout_queue(status: str = "requested") -> Dict:
    rows = [p for p in PAYOUTS if (not status or p.get("status") == status)]
    total = sum(float(p.get("amount", 0)) for p in rows)
    return {"count": len(rows), "total_amount": round(total, 2), "items": sorted(rows, key=lambda p: p.get("requested_at", "")),
            "message_telugu": "💰 %d payout requests — ₹%s pending. UTR తో approve చెయ్యండి." % (len(rows), total)}


# ------------------------------------------------------------------ clicks + funnel
def track_click(code: str, source: str = "link", dedupe_key: str = "") -> Dict:
    """Record a bounded referral click, once per request/window identity.

    Landing pages are frequently refreshed by crawlers, previews, and mobile
    retries.  A stable dedupe key prevents those replays from inflating funnel
    counts while preserving genuine clicks from different request windows.
    """
    c = (code or "").strip().upper()
    if not re.fullmatch(r"[A-Z0-9_-]{1,80}", c):
        return {"ok": False, "reason": "invalid_code",
                "message_telugu": "⚠️ Referral code format is invalid."}
    raw_source = str(source or "link").strip().lower()[:40] or "link"
    source_value = raw_source if raw_source in {
        "link", "telegram", "whatsapp", "channel", "share", "register_direct", "invite", "website", "test"
    } else "other"
    now = _now()
    dedupe = str(dedupe_key or "").strip()[:128]
    if dedupe:
        # Keep the ledger bounded: keys older than ten minutes cannot suppress a
        # new click, and only the key digest is durable.
        digest = hashlib.sha256(dedupe.encode("utf-8")).hexdigest()
        try:
            current = datetime.fromisoformat(now)
        except ValueError:
            current = datetime.utcnow()
        for prior in reversed(CLICKS):
            if prior.get("dedupe_hash") != digest or prior.get("code") != c:
                continue
            try:
                age = (current - datetime.fromisoformat(str(prior.get("at")))).total_seconds()
            except (TypeError, ValueError):
                age = 0
            if 0 <= age <= 600:
                return {"ok": True, "code": c,
                        "clicks_total": sum(1 for x in CLICKS if x.get("code") == c),
                        "duplicate": True}
            break
    click = {"at": now, "code": c, "source": source_value}
    if dedupe:
        click["dedupe_hash"] = hashlib.sha256(dedupe.encode("utf-8")).hexdigest()
    CLICKS.append(click)
    if not save_state().get("ok"):
        CLICKS.remove(click)
        return {"ok": False, "reason": "persistence_failed",
                "message_telugu": "⚠️ Referral click could not be recorded safely."}
    return {"ok": True, "code": c,
            "clicks_total": sum(1 for x in CLICKS if x.get("code") == c),
            "duplicate": False}


def click_stats(code: str) -> Dict:
    c = (code or "").strip().upper()
    return {"clicks": sum(1 for x in CLICKS if x["code"] == c),
            "today": sum(1 for x in CLICKS if x["code"] == c and x["at"][:10] == _today())}


# ------------------------------------------------------------------ dashboard
def referral_dashboard(user: Dict, all_users: List[Dict], limit_recent: int = 10) -> Dict:
    """Referrer dashboard — link, stats, funnel, tier, next milestone, ledger, payouts."""
    ensure_referrer_profile(user, all_users)
    st = stats_of(user)
    payouts_mine = [p for p in PAYOUTS if p.get("tsap_id") == user.get("tsap_id")]
    regs = [u for u in all_users if str(u.get("referred_by", "")).upper() == _code_of(user)]
    eligible_entries = qualifying_commission_entries(st)
    paid_ids = {str(e.get("from")) for e in eligible_entries}
    reversed_ids = {str(e.get("from")) for e in st.get("ledger", []) or []
                    if e.get("type") == "commission" and e.get("reversed") and e.get("from")}
    paid_regs = [u for u in regs if str(u.get("tsap_id", "")) in paid_ids]
    # This is a registration count only; it is never converted into projected money.
    pending_friends = max(0, len(regs) - len(paid_regs))
    tier = tier_of(st["paid_count"])
    nxt = next_milestone(st["paid_count"])
    cstats = click_stats(_code_of(user))
    conv = round((st["paid_count"] / cstats["clicks"] * 100), 1) if cstats["clicks"] else 0.0

    def _registration_summary(u: Dict) -> Dict:
        uid = str(u.get("tsap_id", ""))
        reward = next((e for e in eligible_entries if str(e.get("from")) == uid), None)
        reversed_reward = uid in reversed_ids and reward is None
        return {
            "tsap_id": u.get("tsap_id"),
            "name": u.get("full_name") or u.get("name", "Friend"),
            "gender": u.get("gender") or "Groom",
            "caste": u.get("caste") or "All",
            "district": u.get("district") or "AP/TS",
            "joined": u.get("referred_at") or u.get("created_at", ""),
            "paid": bool(reward),
            "commission": FIRST_PAY_COMMISSION if reward else 0,
            "status_text_te": ("✅ అర్హమైన first-plan reward wallet లో జమైంది" if reward else
                                "↩️ Refund/chargeback తర్వాత referral reward reverse అయింది" if reversed_reward else
                                "⏳ నమోదు అయింది; అర్హత ఉన్న first consumer-plan payment కోసం వేచి ఉంది"),
            "status_text_en": ("✅ Eligible first-plan reward credited to wallet" if reward else
                               "↩️ Referral reward reversed after refund/chargeback" if reversed_reward else
                               "⏳ Registered; waiting for a qualifying first consumer-plan payment"),
        }

    return {
        "ok": True,
        "code": _code_of(user), "alias": user.get("referral_alias"), "link": user.get("referral_link"),
        "referrer_name": user.get("full_name") or user.get("name", ""),
        "tier": tier, "tier_icon": tier["icon"],
        "stats": {
            "clicks": cstats["clicks"], "clicks_today": cstats["today"],
            "registrations": st["registrations"], "paid_count": st["paid_count"],
            "wallet": st["wallet"], "lifetime_earned": st["lifetime_earned"],
            "pending_payout": st["pending_payout"], "paid_out": st["paid_out"],
            "pending_friends": pending_friends,
            "qualifying_rewards_total": len(paid_ids) * FIRST_PAY_COMMISSION,
            "conversion_pct": conv, "reward_per_qualifying_payment": FIRST_PAY_COMMISSION,
        },
        "commission_rules": {
            "first_payment": "₹%d once on the first eligible paid S_99/S_199/S_299/S_499 consumer plan (payment amount at least ₹%d)." % (FIRST_PAY_COMMISSION, MIN_QUALIFYING_AMOUNT),
            "qualifying_plan_codes": sorted(QUALIFYING_PLAN_CODES),
            "excluded_payment_types": ["add-ons", "assisted services", "boosts", "gifts", "renewals", "complimentary grants", "B2B/bureau plans", "other non-consumer payments"],
            "repeat_payment": "₹0 — only one reward per referred user, on their first qualifying consumer-plan payment.",
            "tier_extra": "Dashboard badge only; no extra commission or cash bonus.",
            "referrer_registration_credits": "+2 interest-request credits after a valid referral attachment; not cash.",
            "referee_bonus": "+%d interest-request credit to the new user after a valid referral attachment; not cash." % REFEREE_BONUS_CREDITS,
            "min_payout": MIN_PAYOUT,
            "payout_processing": "Manual admin review; timing is not guaranteed.",
        },
        "next_milestone": nxt,
        "milestones_hit": st["milestones_hit"],
        "milestones": MILESTONES,
        "tiers": TIERS,
        "recent_registrations": [_registration_summary(u) for u in regs[-limit_recent:]][::-1],
        "all_referred_count": len(regs),
        "ledger": list(reversed(st.get("ledger", [])))[:30],
        "payouts": [mask_payout(p) for p in list(reversed(payouts_mine))[:10]],
        "wallet_can_withdraw": float(st.get("wallet", 0)) >= MIN_PAYOUT,
        "message_telugu": ("💰 మీ wallet ₹%s — %s" % (st["wallet"],
                           "payout అడగొచ్చు (min ₹%d)" % MIN_PAYOUT if float(st.get("wallet", 0)) >= MIN_PAYOUT
                           else "ఇంకా ₹%d కావాలి payout కి" % (MIN_PAYOUT - float(st.get("wallet", 0))))),
    }


# ------------------------------------------------------------------ share kit
def share_kit(user: Dict) -> Dict:
    """Localized, policy-accurate referral copy plus the user's poster and QR target."""
    ensure_referrer_profile(user, [])
    code = _code_of(user)
    link = user.get("referral_link") or (f"{SITE_URL}/r/{code}" if code else f"{SITE_URL}/register")
    name = user.get("full_name") or user.get("name")
    name_en = str(name).strip() if name else "a Mana Vivaha member"
    name_te = str(name).strip() if name else "మన వివాహ సభ్యుడు"
    rules_link = f"{SITE_URL}/referral"

    reward_rule_en = (
        f"A referrer may receive ₹{FIRST_PAY_COMMISSION} once if a referred user makes their first eligible "
        "paid S_99/S_199/S_299/S_499 consumer-plan purchase (payment amount at least ₹99). "
        "Add-ons, assisted services, boosts, gifts, renewals, complimentary grants and B2B plans are excluded. "
        "Eligibility and manual review apply; this is not a guaranteed payout."
    )
    reward_rule_te = (
        f"రిఫరర్‌కు ₹{FIRST_PAY_COMMISSION} బహుమతి ఒక్కసారి మాత్రమే లభించవచ్చు: పరిచయం చేసిన సభ్యుడి మొదటి అర్హత కలిగిన "
        "S_99/S_199/S_299/S_499 వినియోగదారు ప్లాన్ చెల్లింపు కనీసం ₹99 ఉండాలి. యాడ్-ఆన్‌లు, సహాయక సేవలు, "
        "బూస్ట్‌లు, బహుమతులు, పునరుద్ధరణలు, ఉచిత క్రెడిట్‌లు, B2B ప్లాన్‌లు మినహాయింపు. అర్హత మరియు మాన్యువల్ సమీక్ష వర్తిస్తాయి; "
        "చెల్లింపు హామీ కాదు."
    )
    credit_rule_en = (
        "A valid referral grants +1 interest-request credit to the new member and +2 to the referrer; "
        "these credits are separate from the possible cash reward."
    )
    credit_rule_te = (
        "చెల్లుబాటు అయ్యే referral ద్వారా కొత్త సభ్యుడికి +1, రిఫరర్‌కు +2 ఆసక్తి అభ్యర్థన క్రెడిట్‌లు వస్తాయి; "
        "ఈ క్రెడిట్‌లు నగదు బహుమతికి వేరు."
    )

    variants_en = [
        f"Hello! {name_en} is sharing a Mana Vivaha referral link with you: {link}\n\n"
        f"Free registration includes 3 interest requests. Consumer plans start at ₹99.\n{credit_rule_en}\n"
        f"{reward_rule_en}\nTerms: {rules_link}",
        f"Looking for Telugu matrimony profiles? Join Mana Vivaha.\n\n"
        f"Free registration includes 3 interest requests; consumer plans start at ₹99.\n"
        f"My referral code: {code}\nMy link: {link}\n{reward_rule_en}\nTerms: {rules_link}",
        f"You are invited to join Mana Vivaha.\nFree registration • 3 interest requests • plans from ₹99.\n"
        f"Referral code: {code}\nOpen my link: {link}\n{credit_rule_en}\nTerms: {rules_link}",
        f"Share this Mana Vivaha registration link with your family: {link}\n"
        f"Registration is free and includes 3 interest requests. Referral credits and any cash reward have separate eligibility rules.\n"
        f"Details: {rules_link}",
        f"Mana Vivaha referral\nCode: {code}\nLink: {link}\n"
        f"Free registration • 3 interest requests • consumer plans from ₹99.\n"
        f"A possible ₹{FIRST_PAY_COMMISSION} reward is subject to first-payment eligibility and manual review. Terms: {rules_link}",
    ]
    variants_te = [
        f"నమస్కారం! {name_te} గారు మన వివాహ (Mana Vivaha) నమోదు లింక్‌ను మీతో పంచుకుంటున్నారు: {link}\n\n"
        f"ఉచిత నమోదుతో 3 ఆసక్తి అభ్యర్థనలు లభిస్తాయి. వినియోగదారు ప్లాన్‌లు ₹99 నుంచి ప్రారంభమవుతాయి.\n"
        f"{credit_rule_te}\n{reward_rule_te}\nనిబంధనలు: {rules_link}",
        f"తెలుగు వివాహ ప్రొఫైల్ కోసం చూస్తున్నారా? మన వివాహలో చేరండి.\n\n"
        f"ఉచిత నమోదుతో 3 ఆసక్తి అభ్యర్థనలు; వినియోగదారు ప్లాన్‌లు ₹99 నుంచి.\n"
        f"నా referral code: {code}\nనా లింక్: {link}\n{reward_rule_te}\nనిబంధనలు: {rules_link}",
        f"మన వివాహలో చేరండి.\nఉచిత నమోదు • 3 ఆసక్తి అభ్యర్థనలు • ప్లాన్‌లు ₹99 నుంచి.\n"
        f"Referral code: {code}\nనా లింక్ తెరవండి: {link}\n{credit_rule_te}\nనిబంధనలు: {rules_link}",
        f"మీ కుటుంబంతో మన వివాహ నమోదు లింక్‌ను పంచుకోండి: {link}\n"
        f"నమోదు ఉచితం; 3 ఆసక్తి అభ్యర్థనలు లభిస్తాయి. Referral credits మరియు నగదు బహుమతికి వేర్వేరు అర్హత నియమాలు ఉన్నాయి.\n"
        f"వివరాలు: {rules_link}",
        f"మన వివాహ referral\nCode: {code}\nలింక్: {link}\n"
        f"ఉచిత నమోదు • 3 ఆసక్తి అభ్యర్థనలు • వినియోగదారు ప్లాన్‌లు ₹99 నుంచి.\n"
        f"₹{FIRST_PAY_COMMISSION} బహుమతి మొదటి చెల్లింపు అర్హత మరియు మాన్యువల్ సమీక్షకు లోబడి ఉంటుంది. నిబంధనలు: {rules_link}",
    ]

    video_kit_en = [
        {"style": "15-second informational video", "script": (
            f"Join Mana Vivaha with free registration and three included interest requests. "
            f"Consumer plans start at ninety-nine rupees. Use my referral link: {link}. "
            f"Any referral reward depends on eligibility and manual review. Terms: {rules_link}."
        )},
        {"style": "30-second informational video", "script": (
            f"Looking for a Telugu matrimony profile? Create a profile on Mana Vivaha. "
            f"Registration is free and includes three interest requests. Review plan prices, validity, and contact-consent rules before you choose. "
            f"My referral link is {link}. A valid referral adds one interest-request credit for the new member and two for the referrer; "
            f"these are separate from a possible one-time fifty-rupee reward. The reward is only for the first qualifying consumer-plan payment, "
            f"subject to exclusions and manual review. Terms: {rules_link}."
        )},
    ]
    video_kit_te = [
        {"style": "15-second informational video", "script": (
            f"మన వివాహలో ఉచితంగా నమోదు చేసుకోండి. నమోదుతో 3 ఆసక్తి అభ్యర్థనలు లభిస్తాయి; వినియోగదారు ప్లాన్‌లు ₹99 నుంచి. "
            f"నా referral link: {link}. ఏదైనా బహుమతి అర్హత మరియు మాన్యువల్ సమీక్షకు లోబడి ఉంటుంది. నిబంధనలు: {rules_link}."
        )},
        {"style": "30-second informational video", "script": (
            f"తెలుగు వివాహ ప్రొఫైల్ కోసం చూస్తున్నారా? మన వివాహలో మీ ప్రొఫైల్ నమోదు చేసుకోండి. నమోదు ఉచితం; 3 ఆసక్తి అభ్యర్థనలు లభిస్తాయి. "
            f"ప్లాన్ ధరలు, చెల్లుబాటు మరియు సంప్రదింపు అనుమతి నియమాలు ముందుగా పరిశీలించండి. నా లింక్ {link}. "
            f"చెల్లుబాటు అయ్యే referral ద్వారా కొత్త సభ్యుడికి +1, రిఫరర్‌కు +2 ఆసక్తి అభ్యర్థన క్రెడిట్‌లు వస్తాయి; "
            f"ఇవి ఒక్కసారి లభించే సంభావ్య ₹{FIRST_PAY_COMMISSION} నగదు బహుమతికి వేరు. బహుమతి మొదటి అర్హత కలిగిన వినియోగదారు ప్లాన్ చెల్లింపుపై మాత్రమే; "
            f"మినహాయింపులు మరియు మాన్యువల్ సమీక్ష వర్తిస్తాయి. నిబంధనలు: {rules_link}."
        )},
    ]

    telegram_text_en = f"Mana Vivaha referral code {code} — free registration and 3 interest requests. Terms: {rules_link}"
    telegram_text_te = f"మన వివాహ referral code {code} — ఉచిత నమోదు మరియు 3 ఆసక్తి అభ్యర్థనలు. నిబంధనలు: {rules_link}"
    sms_text_en = f"Mana Vivaha — free registration, 3 interest requests. My referral code: {code}. Link: {link}. Terms: {rules_link}"
    sms_text_te = f"మన వివాహ — ఉచిత నమోదు, 3 ఆసక్తి అభ్యర్థనలు. నా referral code: {code}. లింక్: {link}. నిబంధనలు: {rules_link}"
    poster_text_en = f"MANA VIVAHA • మన వివాహ\nFree registration • 3 interest requests\nCode: {code}\nReferral terms: {rules_link}"
    poster_text_te = f"మన వివాహ • Mana Vivaha\nఉచిత నమోదు • 3 ఆసక్తి అభ్యర్థనలు\nCode: {code}\nReferral నిబంధనలు: {rules_link}"
    status_text_en = f"Mana Vivaha — free registration and 3 interest requests. My referral code: {code}. Link: {link}. Terms: {rules_link}"
    status_text_te = f"మన వివాహ — ఉచిత నమోదు మరియు 3 ఆసక్తి అభ్యర్థనలు. నా referral code: {code}. లింక్: {link}. నిబంధనలు: {rules_link}"
    telegram_share_en = "https://t.me/share/url?url=%s&text=%s" % (_urlenc(link), _urlenc(telegram_text_en))
    telegram_share_te = "https://t.me/share/url?url=%s&text=%s" % (_urlenc(link), _urlenc(telegram_text_te))

    # Keep legacy keys for existing integrations; the page selects explicit language fields.
    return {
        "code": code, "link": link, "alias": user.get("referral_alias"),
        "whatsapp_messages": variants_te,
        "whatsapp_messages_te": variants_te,
        "whatsapp_messages_en": variants_en,
        "whatsapp_share": "https://wa.me/?text=" + _urlenc(variants_te[0]),
        "whatsapp_share_variants": ["https://wa.me/?text=" + _urlenc(v) for v in variants_te],
        "whatsapp_share_variants_te": ["https://wa.me/?text=" + _urlenc(v) for v in variants_te],
        "whatsapp_share_variants_en": ["https://wa.me/?text=" + _urlenc(v) for v in variants_en],
        "telegram_share": telegram_share_te,
        "telegram_share_te": telegram_share_te,
        "telegram_share_en": telegram_share_en,
        "sms_text": sms_text_te,
        "sms_text_te": sms_text_te,
        "sms_text_en": sms_text_en,
        "poster_text": poster_text_te,
        "poster_text_te": poster_text_te,
        "poster_text_en": poster_text_en,
        "poster_card": "/api/referral/%s/poster.png" % _tsap_or_code(user),
        "qr_target": link,
        "status_text": status_text_te,
        "status_text_te": status_text_te,
        "status_text_en": status_text_en,
        "video_kit": video_kit_te,
        "video_kit_te": video_kit_te,
        "video_kit_en": video_kit_en,
        "message_telugu": "📲 వాట్సాప్ సందేశాలు మరియు సమాచార వీడియో స్క్రిప్ట్‌లు సిద్ధంగా ఉన్నాయి. ప్రతి సందేశంలో referral నిబంధనల లింక్ ఉంది.",
        "message_en": "WhatsApp messages and informational video scripts are ready. Each message links to the referral terms.",
    }


def _tsap_or_code(user: Dict) -> str:
    return user.get("tsap_id") or _code_of(user)


def _urlenc(text: str) -> str:
    from urllib.parse import quote
    return quote(text, safe="")


# ------------------------------------------------------------------ leaderboard
def get_leaderboard(all_users: List[Dict], limit: int = 10, period: str = "all",
                    me: str = "", full: bool = False):
    """Top referrers — full_name use (pata bug fix), period: all | week | month.
    WAVE 24 — partners kuda board lo (same rules).
    💎 R12 — alive board: registrations unna vadu kuda kanipistadu (paid ledu ante rank
    down, kani board empty ga undadu). me=TSAP-ID iste (full=True) 'you' dict kuda return.
    Backward compat: me/full ivvakapothe LIST matrame (pata tests safe)."""
    cutoff = None
    if period == "week":
        cutoff = (datetime.utcnow() - timedelta(days=7)).isoformat()
    elif period == "month":
        cutoff = (datetime.utcnow() - timedelta(days=30)).isoformat()
    rows = []
    for u in all_users:
        st = u.get("referral_stats") or {}
        refers = int(st.get("registrations", st.get("total", 0)) or 0)
        entries = qualifying_commission_entries(st)
        if cutoff:
            entries = [entry for entry in entries if str(entry.get("at", "")) >= cutoff]
        paid = len({str(entry.get("from")) for entry in entries})
        earned = paid * FIRST_PAY_COMMISSION
        # Registrations can be shown, but no future earnings are projected.
        if not paid and not refers:
            continue
        if cutoff and not paid:
            continue
        rows.append({
            "name": str(u.get("full_name") or u.get("name") or "మన వివాహ member").split()[0],
            "code": _code_of(u), "tsap_id": u.get("tsap_id"),
            "refers": refers,
            "paid": paid,
            "earned": earned,
            "tier": tier_of(paid)["key"],
            "icon": tier_of(paid)["icon"],
        })
    try:
        from refpartners import PARTNERS as _P19
        for u in _P19:
            st = u.get("referral_stats") or {}
            refers = int(st.get("registrations", 0) or 0)
            entries = qualifying_commission_entries(st)
            if cutoff:
                entries = [entry for entry in entries if str(entry.get("at", "")) >= cutoff]
            paid = len({str(entry.get("from")) for entry in entries})
            earned = paid * FIRST_PAY_COMMISSION
            if not paid and not refers:
                continue
            if cutoff and not paid:
                continue
            rows.append({
                "name": str(u.get("name") or "Partner").split()[0],
                "code": u.get("partner_id", ""), "tsap_id": "",
                "partner_id": u.get("partner_id", ""),
                "refers": refers,
                "paid": paid,
                "earned": earned,
                "tier": tier_of(paid)["key"],
                "icon": tier_of(paid)["icon"],
            })
    except Exception:
        pass
    rows.sort(key=lambda r: (r["paid"], r["earned"], r["refers"]), reverse=True)
    for i, r in enumerate(rows, 1):
        r["rank"] = i
    # 💎 R12 — "me" rank: user board lo top-N lo lekka, lopala unna rank ichhestam
    if full:
        you = None
        if me:
            me_key = str(me).strip().upper()
            for r in rows:
                if str(r.get("tsap_id", "")).upper() == me_key or str(r.get("code", "")).upper() == me_key:
                    r["is_me"] = True
                    you = r
                    break
        return rows[:limit], you
    return rows[:limit]


# ------------------------------------------------------------------ terms
def referral_terms_telugu() -> Dict:
    return {
        "version": REFERRAL_VERSION,
        "headline": "అర్హత ఉన్న first consumer-plan payment పై ఒక్కసారి ₹50",
        "headline_en": "A possible one-time ₹50 reward on the first qualifying consumer-plan payment",
        "rules_en": [
            "Registration is free and includes 3 interest-request credits; these do not unlock contact details.",
            "A referrer may receive ₹50 once if the referred member's first qualifying paid S_99, S_199, S_299, or S_499 consumer plan has a payment amount of at least ₹99.",
            "Add-ons, assisted services, boosts, gifts, renewals, complimentary grants, bureau/B2B plans, and other non-consumer payments are excluded.",
            "A valid referral attachment grants +2 interest-request credits to the referrer and +1 to the new member. These credits are separate from any cash reward.",
            "Only the first qualifying consumer-plan payment for each referred member may qualify; repeat payments and renewals do not earn another commission.",
            "Dashboard tier badges change at 3, 10, 25, and 50 qualifying rewards. A tier adds no cash, commission, credits, support, reports, or other benefit.",
            f"Payout requests require a minimum of ₹{MIN_PAYOUT} in the wallet and receive manual admin review. Instant UPI transfer and fixed processing times are not guaranteed.",
            "High-volume, duplicate, self-referral, fake-payment, chargeback, or spam patterns may be reviewed. There is no fixed referral-count cap, but eligibility and review rules apply.",
            "A reward may be reversed if its eligible payment is refunded or charged back.",
            "The dashboard reports registrations, qualifying rewards, wallet balance, and payout status. Pending registrations are not future income or a guarantee.",
        ],
        "rules_telugu": [
            "🆓 నమోదు ఉచితం. ఉచితంగా 3 interest-request credits ఉంటాయి; అవి 3 profile/contact unlocks కావు.",
            "💰 Referrer కు ₹50 ఒక్కసారి మాత్రమే: కొత్త referred user చేసిన మొదటి qualifying paid consumer plan S_99, S_199, S_299 లేదా S_499 అయి ఉండాలి; eligible payment మొత్తం కనీసం ₹99 కావాలి.",
            "🚫 Add-ons, assisted services, boosts, gifts, renewals, complimentary grants, bureau/B2B plans మరియు ఇతర non-consumer payments కు ₹50 reward లేదు.",
            "🎁 Valid referral attachment అయినప్పుడు referrer కు +2 interest-request credits, కొత్త user కు +1 interest-request credit వస్తాయి. ఇవి cash reward కాదు; వేర్వేరు credits.",
            "🔁 ఒక్క referred user పై first qualifying consumer-plan payment కు మాత్రమే reward. తర్వాతి plan payments/renewals పై మళ్లీ commission లేదు.",
            "🏅 3 / 10 / 25 / 50 qualifying rewards వద్ద dashboard tier badge మారుతుంది. Tier వల్ల అదనపు cash, commission, support, report లేదా ఇతర perk లేదు.",
            f"💸 Payout request కనీసం ₹{MIN_PAYOUT}. Wallet నుంచి request చేసిన తర్వాత admin review ఉంటుంది; auto/instant UPI transfer లేదా fixed processing time హామీ లేదు. Status/settlement వివరాలు dashboard లో చూడండి.",
            "🔎 High-volume, duplicate, self-referral, fake-payment, chargeback లేదా spam నమూనాలు review చేయబడవచ్చు. No fixed referral-count cap ఉన్నా, reward eligibility మరియు review నియమాలు వర్తిస్తాయి.",
            "↩️ Eligible payment refund/chargeback అయితే సంబంధిత reward wallet నుంచి reverse చేయబడవచ్చు.",
            "📊 Dashboard లో నమోదు, qualifying rewards, wallet మరియు payout status చూపబడతాయి. Pending registrations ను భవిష్యత్ ఆదాయంగా లేదా హామీగా లెక్కించము.",
        ],
        "not_allowed": ["Self-referral or fake/duplicate registrations", "Fake payments or chargeback abuse",
                        "Bulk unsolicited messages or spam", "Referral reward claims for excluded payment types",
                        "Fake profiles or misleading marketing"],
        "no_conditions_telugu": "నిర్దిష్ట referral-count cap లేదు. కానీ ప్రతి ₹50 reward కు first qualifying consumer-plan payment నియమాలు వర్తిస్తాయి; duplicate, fake, self-referral లేదా spam patterns review చేయబడవచ్చు.",
        "no_conditions_en": "There is no fixed referral-count cap. Each possible ₹50 reward still depends on first qualifying consumer-plan payment rules; duplicate, fake, self-referral, or spam patterns may be reviewed.",
        "reward_amount": FIRST_PAY_COMMISSION,
        "qualifying_plan_codes": sorted(QUALIFYING_PLAN_CODES),
        "min_qualifying_amount": MIN_QUALIFYING_AMOUNT,
        "min_payout": MIN_PAYOUT,
        "payout_processing": "Manual admin review; timing is not guaranteed.",
        "reward_exclusions": ["add-ons", "assisted services", "boosts", "gifts", "renewals", "complimentary grants", "B2B/bureau plans", "other non-consumer payments"],
    }


# ------------------------------------------------------------------ util (compat)
def generate_bureau_white_label_card(original_card_path: str, bureau_name: str, bureau_code: str,
                                     output_path: str) -> str:
    """Bureau card మీద 'Via <bureau>' overlay (PIL ఉంటే nijamga, lekapote path + note)."""
    try:
        from PIL import Image, ImageDraw
        img = Image.open(original_card_path).convert("RGB")
        d = ImageDraw.Draw(img)
        d.rectangle([0, img.height - 46, img.width, img.height], fill=(15, 31, 60))
        d.text((16, img.height - 34), "Via %s | %s" % (bureau_name, bureau_code), fill=(212, 175, 55))
        img.save(output_path)
        return output_path
    except Exception:
        return output_path

# ---------------------------------------------------------------------------
# 🔔 Referral notifications (queued by the caller; delivery timing depends on the channel)
#    Ee functions text matrame return chesthayi; queue main.py lo jarugutundi.
# ---------------------------------------------------------------------------
def _name_of(u, fallback="Friend"):
    return (u.get("full_name") or u.get("name") or fallback).split()[0]


def referrer_join_text(referrer, referee):
    """Notify the referrer of a registration without promising a cash commission."""
    ref_name = _name_of(referrer, "గారు")
    friend_name = _name_of(referee, "స్నేహితుడు")
    code = _code_of(referrer)
    link = referrer.get("referral_link") or f"{SITE_URL}/r/{code}"
    return (
        f"🎉 నమస్కారం {ref_name} గారు! *{friend_name}* గారు మీ referral code తో మన వివాహలో నమోదు చేసుకున్నారు.\n\n"
        "ఈ valid referral attachment కు మీకు +2 interest-request credits వచ్చాయి; అవి cash కావు.\n"
        f"మీ కోడ్: {code}\nమీ లింక్: {link}\n\n"
        f"₹50 referral reward వేరుగా ఉంటుంది: వారు మొదటిసారి కనీసం ₹99 చెల్లించి S_99/S_199/S_299/S_499 consumer plan తీసుకుంటే మాత్రమే ఒకసారి అర్హత ఉండవచ్చు. "
        f"Add-ons, assisted service, boosts, gifts, renewals, complimentary grants మరియు B2B plans అర్హం కావు. నియమాలు: {SITE_URL}/referral"
    )


def referrer_commission_text(referrer, referee, result):
    """Notify the referrer when an eligible ₹50 wallet commission was actually recorded."""
    amt = int(result.get("commission", 0) or 0)
    st = stats_of(referrer)
    tier = result.get("tier") or st.get("tier", "BRONZE")
    milestone = result.get("milestone") or {}
    ref_name = _name_of(referrer, "గారు")
    friend_name = _name_of(referee, "స్నేహితుడు")
    lines = [
        f"🎉 శుభవార్త {ref_name} గారు! *{friend_name}* గారి మొదటి eligible consumer-plan payment పై ₹{amt} referral reward మీ wallet లో నమోదు అయింది.",
        f"ఇది bank/UPI payout కాదు. ప్రస్తుత wallet: ₹{_money(st.get('wallet', 0))}.",
        f"Tier: {tier} ({st.get('paid_count', 0)} qualifying referrals); tier label కు అదనపు cash లేదా commission లేదు.",
        f"Payout కోసం కనీసం ₹{MIN_PAYOUT} wallet balance తో request పెట్టండి. Request admin review లో ఉంటుంది; fixed processing time హామీ లేదు.",
        f"నియమాలు: {SITE_URL}/referral",
    ]
    if milestone.get("title"):
        lines.insert(2, f"Dashboard badge update: {milestone['title']} — అదనపు cash/credits లేవు.")
    nxt = next_milestone(st.get("paid_count", 0))
    if nxt:
        lines.append(f"తదుపరి dashboard badge: {nxt['title']} కోసం ఇంకా {nxt['need']} eligible rewards.")
    return "\n".join(lines)


def referee_welcome_text(referee, referrer):
    """Welcome the referred user; keep request credits distinct from the cash reward."""
    friend_name = _name_of(referrer, "స్నేహితుడు")
    return (
        f"🤝 మీ friend {friend_name} ఇచ్చిన referral code నమోదు సమయంలో attach అయింది — "
        "మీకు +1 interest-request credit వచ్చింది. "
        "మీరు కూడా మీ code share చేస్తే valid referral attachment పై referrer కి +2 request credits రావచ్చు. "
        f"ఇవి ₹50 cash reward కి వేరు. మీ code: {_code_of(referee)}. "
        "Referrer కు ₹50 ఒక్కసారి మాత్రమే, మీ first eligible S_99/S_199/S_299/S_499 consumer-plan payment పై అర్హత ఉండవచ్చు; add-ons, renewals, assisted services, boosts, gifts, complimentary మరియు B2B payments అర్హం కావు. "
        f"Rules: {SITE_URL}/referral"
    )

def mask_payout(rec: Dict) -> Dict:
    """🔒 Public dashboard ki payout record (UPI/bank details masked).
    Admin queue (payout_queue) lo FULL details untayi — pay cheyyadaniki avasaram."""
    r = dict(rec or {})
    upi = str(r.get("upi_id", "") or "")
    if upi:
        name, _, host = upi.partition("@")
        r["upi_id"] = (_mask_mid(name, 2) + "@" + _mask_mid(host, 2)) if host else _mask_mid(name, 2)
    bank = dict(r.get("bank") or {})
    if bank:
        acc = str(bank.get("account_no", ""))
        bank["account_no"] = ("•" * max(0, len(acc) - 4)) + acc[-4:] if acc else ""
        if bank.get("holder"):
            bank["holder"] = _mask_mid(str(bank["holder"]), 1)
        r["bank"] = bank
    r["masked"] = True
    return r


def _mask_mid(text: str, keep: int) -> str:
    """ravi@okhdfcbank → ra***@okh*** style (మొదటి `keep` chars మాత్రమే kanipistayi)."""
    t = str(text or "")
    if len(t) <= keep:
        return t[:1] + "***" if t else ""
    return t[:keep] + "***"


# ═══════════════════════════════════════════════════════════════════════════
# 💎 ADVANCED REFERRAL SUITE
# ---------------------------------------------------------------------------
# Four things a referrer keeps asking for, answered only from their own data:
#
#   1. wallet_statement()  — a real statement: every entry, a running balance,
#      and an identity check (earned − reversed − pending − paid = wallet).
#   2. earnings_explainer() — per-friend "why": what stage each referral is at,
#      what it earned, and exactly what would have to happen next.
#   3. invites              — one tracked invite per person you send to, with
#      its own link, its own message, and its own stage (sent → clicked →
#      joined → rewarded). Nothing is sent by the server: the app hands back a
#      wa.me/telegram/sms link and the member presses send.
#   4. insights             — which channel and message actually worked for
#      this member, who to follow up with, and what to do next. Small samples
#      are labelled as indicative, never dressed up as a forecast.
# ═══════════════════════════════════════════════════════════════════════════

INVITE_CHANNELS = ("whatsapp", "telegram", "sms", "copy")
INVITE_TOKEN_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
INVITE_TOKEN_LEN = 8
MAX_INVITES_PER_DAY = 40          # anti-spam: a person cannot be mass-mailed from one wallet
INVITE_FOLLOWUP_DAYS = 3         # "sent, no click, 3 days" → worth a gentle re-send
INVITE_DEDUPE_HOURS = 24         # same phone within a day returns the same invite
_PHONE_SALT = os.environ.get("MANA_VIVAHA_REFERRAL_SALT", "mana-vivaha-referral-v1")

LEDGER_LABELS = {
    "commission":     ("First-plan referral reward", "మొదటి ప్లాన్ రిఫరల్ రివార్డ్"),
    "milestone":      ("Milestone reward", "మైల్‌స్టోన్ రివార్డ్"),
    "reversal":       ("Refund / chargeback clawback", "రిఫండ్ క్లాబ్యాక్"),
    "payout_request": ("Payout requested (review)", "పేఅవుట్ అభ్యర్థన (సమీక్ష)"),
    "payout_paid":    ("Payout paid", "పేఅవుట్ చెల్లించబడింది"),
    "payout_reject":  ("Payout returned to wallet", "పేఅవుట్ వాలెట్‌కు తిరిగి"),
}


def _phone_digits(value: str) -> str:
    return re.sub(r"\D", "", str(value or ""))


def _phone_key(digits: str) -> str:
    if not digits:
        return ""
    return hashlib.sha256((_PHONE_SALT + digits).encode("utf-8")).hexdigest()[:20]


def mask_phone(digits: str) -> str:
    """9876543210 → 98•••••10 (we never hand a full number back to a browser)."""
    d = _phone_digits(digits)
    if len(d) < 6:
        return "•" * len(d)
    return d[:2] + "•" * (len(d) - 4) + d[-2:]


def _invite_token(existing: Optional[set] = None) -> str:
    for _ in range(12):
        tok = "".join(secrets.choice(INVITE_TOKEN_ALPHABET) for _ in range(INVITE_TOKEN_LEN))
        if not existing or tok not in existing:
            return tok
    return "".join(secrets.choice(INVITE_TOKEN_ALPHABET) for _ in range(INVITE_TOKEN_LEN + 4))


def _invites_of(user: Dict) -> List[Dict]:
    st = stats_of(user)
    return st.setdefault("invites", [])


def _invite_stage(inv: Dict) -> str:
    if inv.get("paid_at"):
        return "rewarded"
    if inv.get("joined_tsap"):
        return "joined"
    if int(inv.get("clicks", 0) or 0) > 0:
        return "clicked"
    return "sent"


def _invite_label(inv: Dict) -> Dict[str, str]:
    stage = _invite_stage(inv)
    labels = {
        "sent":     ("Link ready — not opened yet", "లింక్ సిద్ధం — ఇంకా తెరవలేదు"),
        "clicked":  ("Opened the link", "లింక్ తెరిచారు"),
        "joined":   ("Registered — waiting for a qualifying plan", "నమోదు అయ్యారు — అర్హమైన ప్లాన్ కోసం వేచి ఉంది"),
        "rewarded": ("Rewarded — first qualifying plan paid", "రివార్డ్ వచ్చింది — మొదటి అర్హమైన ప్లాన్ చెల్లింపు"),
    }
    en, te = labels[stage]
    return {"stage": stage, "stage_en": en, "stage_te": te}


def _invite_next(inv: Dict) -> Dict[str, str]:
    stage = _invite_stage(inv)
    if stage == "sent":
        return {"next_en": "Send the message, or share the link again after a few days.",
                "next_te": "సందేశం పంపండి; కొన్ని రోజుల తర్వాత లింక్ మళ్లీ పంచుకోండి."}
    if stage == "clicked":
        return {"next_en": "They opened the link but have not registered. A short reminder helps.",
                "next_te": "లింక్ తెరిచారు కానీ నమోదు కాలేదు. చిన్న రిమైండర్ సాయం చేస్తుంది."}
    if stage == "joined":
        return {"next_en": "Registered. A reward needs their first eligible S_99/S_199/S_299/S_499 plan payment — nothing is earned before that.",
                "next_te": "నమోదు అయ్యారు. రివార్డ్ కు వారి మొదటి అర్హమైన S_99/S_199/S_299/S_499 ప్లాన్ చెల్లింపు అవసరం — అంతకు ముందు ఏదీ లభించదు."}
    return {"next_en": "Done. Refer someone new — one reward per person, once.",
            "next_te": "పూర్తి. కొత్తవారిని పరిచయం చేయండి — ఒక్కొక్కరికి ఒక్కసారి మాత్రమే."}


def _invite_link(code: str, token: str) -> str:
    return f"{SITE_URL}/r/{code}?inv={token}" if token else f"{SITE_URL}/r/{code}"


def _public_invite(inv: Dict) -> Dict:
    """Browser-safe invite row: no stored phone digits, just a masked hint."""
    row = dict(inv)
    row.pop("phone_key", None)
    row["phone_masked"] = mask_phone(inv.get("phone_last4_hint", "") or inv.get("phone", ""))
    row.pop("phone", None)
    row.pop("phone_last4_hint", None)
    row.update(_invite_label(inv))
    row.update(_invite_next(inv))
    row["sent_days_ago"] = _days_since(inv.get("sent_at", ""))
    row["needs_followup"] = (_invite_stage(inv) == "sent"
                             and (row["sent_days_ago"] or 0) >= INVITE_FOLLOWUP_DAYS)
    return row


def _money(value) -> str:
    """50.0 → "50", 12.5 → "12.5" — statements read as money, not as floats."""
    try:
        v = round(float(value or 0), 2)
    except Exception:
        return "0"
    return str(int(v)) if float(v).is_integer() else str(v)


def _days_since(stamp: str) -> Optional[int]:
    try:
        then = datetime.fromisoformat(str(stamp).replace("Z", ""))
    except Exception:
        return None
    return max(0, (datetime.utcnow() - then).days)


def invite_create(user: Dict, name: str, phone: str = "", channel: str = "whatsapp",
                  variant: int = 0, all_users: Optional[List[Dict]] = None) -> Dict:
    """Create one tracked invite for one named person.

    Nothing is delivered by the server. The caller gets a ready wa.me /
    telegram / sms link with a personalised, policy-accurate message and a
    link carrying this invite's own token, so the funnel can be shown back to
    the referrer per person.
    """
    ensure_referrer_profile(user, all_users or [])
    st = stats_of(user)
    invites = _invites_of(user)

    friend = " ".join(str(name or "").split()).strip()
    if len(friend) < 2 or len(friend) > 40:
        return {"ok": False, "reason": "bad_name",
                "message_en": "Enter the name you want on the message (2–40 characters).",
                "message_telugu": "సందేశంలో ఉండే పేరు ఇవ్వండి (2–40 అక్షరాలు)."}
    if not re.fullmatch(r"[^\x00-\x1f<>{}]{2,40}", friend):
        return {"ok": False, "reason": "bad_name",
                "message_en": "That name has characters we cannot put in a message.",
                "message_telugu": "ఈ పేరులో సందేశానికి పనికిరాని అక్షరాలు ఉన్నాయి."}

    digits = _phone_digits(phone)
    if digits and len(digits) != 10:
        return {"ok": False, "reason": "bad_phone",
                "message_en": "Enter a 10-digit mobile number, or leave it empty to send by name.",
                "message_telugu": "10 అంకెల మొబైల్ నంబర్ ఇవ్వండి, లేదా ఖాళీగా వదిలి పేరుతో పంపండి."}

    today = _today()
    sent_today = sum(1 for i in invites if str(i.get("sent_at", ""))[:10] == today)
    if sent_today >= MAX_INVITES_PER_DAY:
        return {"ok": False, "reason": "daily_limit", "limit": MAX_INVITES_PER_DAY,
                "message_en": f"You can create up to {MAX_INVITES_PER_DAY} invites a day. Try again tomorrow.",
                "message_telugu": f"ఒక రోజులో గరిష్ఠం {MAX_INVITES_PER_DAY} ఆహ్వానాలు. రేపు మళ్లీ ప్రయత్నించండి."}

    key = _phone_key(digits)
    if key:
        for inv in invites:
            age_days = _days_since(inv.get("sent_at", ""))
            # `age_days` is 0 for "sent today" — compare explicitly, never with
            # `or`, which would turn today's 0 into a fallback value.
            if inv.get("phone_key") == key and age_days is not None and age_days < 1:
                invite_before = copy.deepcopy(inv)
                inv["send_count"] = int(inv.get("send_count", 1) or 1) + 1
                inv["last_sent_at"] = _now()
                if not save_state().get("ok"):
                    _restore_dict(inv, invite_before)
                    return {"ok": False, "reason": "persistence_failed",
                            "message_en": "The invite could not be saved safely. Please try again.",
                            "message_telugu": "ఆహ్వానాన్ని సురక్షితంగా సేవ్ చేయలేకపోయాం. మళ్లీ ప్రయత్నించండి."}
                return {"ok": True, "invite": _public_invite(inv), "resent": True,
                        "share": _invite_share_links(inv),
                        "message_en": "That number already has an invite today — the same link is ready to send again.",
                        "message_telugu": "ఈ నంబర్‌కు ఈ రోజు ఇప్పటికే ఆహ్వానం ఉంది — అదే లింక్ మళ్లీ పంపవచ్చు."}

    channel = str(channel or "whatsapp").lower()
    if channel not in INVITE_CHANNELS:
        return {"ok": False, "reason": "bad_channel",
                "message_en": "Choose WhatsApp, Telegram, SMS or copy-link.",
                "message_telugu": "WhatsApp, Telegram, SMS లేదా లింక్ కాపీ ఎంచుకోండి."}

    kit = share_kit(user)
    try:
        variant = int(variant or 0)
    except Exception:
        variant = 0
    variants_te = kit.get("whatsapp_messages_te") or []
    variants_en = kit.get("whatsapp_messages_en") or []
    if not variants_te:
        variant = 0
    else:
        variant = max(0, min(variant, len(variants_te) - 1))

    token = _invite_token({str(i.get("token")) for i in invites})
    code = _code_of(user)
    link = _invite_link(code, token)
    # Personalisation is a greeting only — the policy lines inside the variant
    # are left exactly as the share kit generated them.
    msg_te = f"{friend} గారు,\n\n" + (variants_te[variant] if variants_te else link)
    msg_en = f"Hi {friend},\n\n" + (variants_en[variant] if variants_en else link)

    inv = {
        "token": token,
        "name": friend,
        "phone_key": key,
        "phone_last4_hint": digits[-4:] if digits else "",
        "channel": channel,
        "variant": variant,
        "link": link,
        "message_te": msg_te,
        "message_en": msg_en,
        "sent_at": _now(),
        "last_sent_at": _now(),
        "send_count": 1,
        "clicks": 0,
        "clicked_at": "",
        "joined_tsap": "",
        "joined_at": "",
        "paid_at": "",
        "reward": 0,
    }
    invites.append(inv)
    if not save_state().get("ok"):
        invites.remove(inv)
        return {"ok": False, "reason": "persistence_failed",
                "message_en": "The invite could not be saved safely. Please try again.",
                "message_telugu": "ఆహ్వానాన్ని సురక్షితంగా సేవ్ చేయలేకపోయాం. మళ్లీ ప్రయత్నించండి."}
    return {"ok": True, "invite": _public_invite(inv), "resent": False,
            "share": _invite_share_links(inv),
            "daily_used": sent_today + 1, "daily_limit": MAX_INVITES_PER_DAY,
            "message_en": "Invite ready. Open the WhatsApp/Telegram link and press send — we never message anyone on your behalf.",
            "message_telugu": "ఆహ్వానం సిద్ధం. WhatsApp/Telegram లింక్ తెరిచి మీరే పంపండి — మీ తరపున మేము ఎవరికీ సందేశం పంపము."}


def _invite_share_links(inv: Dict) -> Dict:
    """Delivery is the member's own tap; these links only pre-fill their app."""
    from urllib.parse import quote
    link = inv.get("link", "")
    msg_te = inv.get("message_te", "")
    msg_en = inv.get("message_en", "")
    hint = inv.get("phone_last4_hint", "")
    base = {}
    if hint:
        # A full number is never stored, so this cannot be a direct send: the
        # member still picks the contact in their own WhatsApp.
        base["whatsapp_te"] = "https://wa.me/?text=" + quote(msg_te, safe="")
        base["whatsapp_en"] = "https://wa.me/?text=" + quote(msg_en, safe="")
    else:
        base["whatsapp_te"] = "https://wa.me/?text=" + quote(msg_te, safe="")
        base["whatsapp_en"] = "https://wa.me/?text=" + quote(msg_en, safe="")
    base["telegram_te"] = "https://t.me/share/url?url=%s&text=%s" % (quote(link, safe=""), quote(msg_te, safe=""))
    base["telegram_en"] = "https://t.me/share/url?url=%s&text=%s" % (quote(link, safe=""), quote(msg_en, safe=""))
    base["sms_te"] = "sms:?&body=" + quote(msg_te, safe="")
    base["sms_en"] = "sms:?&body=" + quote(msg_en, safe="")
    base["link"] = link
    return base


def invite_list(user: Dict, limit: int = 100) -> Dict:
    """Every invite with its stage, age and the honest next step."""
    invites = _invites_of(user)
    rows = [_public_invite(i) for i in invites]
    rows.sort(key=lambda r: str(r.get("sent_at", "")), reverse=True)
    rows = rows[:max(1, min(int(limit or 100), 300))]
    counts = {"sent": 0, "clicked": 0, "joined": 0, "rewarded": 0}
    for r in rows:
        counts[r["stage"]] = counts.get(r["stage"], 0) + 1
    return {"success": True, "invites": rows, "total": len(invites), "counts": counts,
            "followups": [r for r in rows if r.get("needs_followup")][:5],
            "daily_limit": MAX_INVITES_PER_DAY,
            "note_en": "Invites are tracked per person. Stages come from real link opens and registrations — nothing is assumed.",
            "note_te": "ఆహ్వానాలు ఒక్కొక్కరికి వేర్వేరుగా ట్రాక్ అవుతాయి. దశలు నిజమైన లింక్ ఓపెన్‌లు మరియు నమోదుల ఆధారంగా ఉంటాయి."}


def invite_find(code: str, token: str, all_users: List[Dict]) -> Optional[Dict]:
    tok = str(token or "").strip().upper()
    if not tok:
        return None
    ref = find_referrer(str(code or ""), all_users or [])
    if not ref:
        return None
    for inv in _invites_of(ref):
        if str(inv.get("token", "")).upper() == tok:
            return inv
    return None


def invite_record_click(code: str, token: str, all_users: List[Dict]) -> bool:
    inv = invite_find(code, token, all_users)
    if not inv:
        return False
    before = copy.deepcopy(inv)
    inv["clicks"] = int(inv.get("clicks", 0) or 0) + 1
    inv["clicked_at"] = _now()
    if not save_state().get("ok"):
        _restore_dict(inv, before)
        return False
    return True


def invite_mark_join(code: str, token: str, tsap_id: str, all_users: List[Dict]) -> bool:
    inv = invite_find(code, token, all_users)
    if not inv:
        return False
    before = copy.deepcopy(inv)
    inv["joined_tsap"] = str(tsap_id or "")
    inv["joined_at"] = _now()
    if not save_state().get("ok"):
        _restore_dict(inv, before)
        return False
    return True


def invite_mark_paid(tsap_id: str, amount: float, all_users: List[Dict]) -> bool:
    """Called when a referred member's first qualifying payment is rewarded."""
    uid = str(tsap_id or "")
    if not uid:
        return False
    for ref in (all_users or []):
        invites = (ref.get("referral_stats") or {}).get("invites") or []
        for inv in invites:
            if str(inv.get("joined_tsap", "")) == uid and not inv.get("paid_at"):
                before = copy.deepcopy(inv)
                inv["paid_at"] = _now()
                inv["reward"] = round(float(amount or 0), 2)
                if not save_state().get("ok"):
                    _restore_dict(inv, before)
                    return False
                return True
    # A join can also arrive without an invite token (shared code only), in
    # which case there is simply nothing per-person to update.
    return False


# ------------------------------------------------------------------ statement
def wallet_statement(user: Dict, types: Optional[List[str]] = None,
                     limit: int = 100) -> Dict:
    """Wallet as a statement: every entry, running balance, and a check.

    The identity `earned − reversed − pending − paid_out = wallet` is computed
    and returned as `reconciles`. If it is ever false, the UI says so instead
    of quietly showing a number nobody can explain.
    """
    st = stats_of(user)
    want = {str(t) for t in (types or [])} if types else None
    rows = []
    balance = 0.0
    for entry in (st.get("ledger", []) or []):
        kind = str(entry.get("type", ""))
        signed = float(entry.get("amount", 0) or 0)
        if want and kind not in want:
            continue
        balance = round(balance + signed, 2)
        label_en, label_te = LEDGER_LABELS.get(kind, (kind.title() or "Entry", kind))
        rows.append({
            "id": entry.get("id", ""),
            "at": entry.get("at", ""),
            "type": kind,
            "label_en": label_en,
            "label_te": label_te,
            "amount": round(signed, 2),
            "balance_after": balance,
            "from": entry.get("from", ""),
            "from_name": entry.get("from_name", ""),
            "plan_code": entry.get("plan_code", ""),
            "plan_amount": entry.get("plan_amount", ""),
            "utr": entry.get("utr", ""),
            "note": entry.get("note", ""),
        })

    rows.reverse()                      # newest first
    rows = rows[:max(1, min(int(limit or 100), 500))]

    ledger = st.get("ledger", []) or []
    earned = round(sum(float(e.get("amount", 0) or 0) for e in ledger
                       if e.get("type") in ("commission", "milestone")
                       and not e.get("reversed")), 2)
    reversed_total = round(sum(float(e.get("amount", 0) or 0) for e in ledger
                               if e.get("type") == "commission" and e.get("reversed")), 2)
    returned = round(sum(float(e.get("amount", 0) or 0) for e in ledger
                         if e.get("type") == "payout_reject"), 2)
    pending = round(float(st.get("pending_payout", 0) or 0), 2)
    paid_out = round(float(st.get("paid_out", 0) or 0), 2)
    wallet = round(float(st.get("wallet", 0) or 0), 2)
    expected = round(earned + returned - reversed_total - pending - paid_out, 2)

    return {
        "success": True,
        "wallet": wallet,
        "entries": rows,
        "totals": {
            "earned": earned, "reversed": -reversed_total, "returned": returned,
            "pending_payout": pending, "paid_out": paid_out,
            "lifetime_earned": round(float(st.get("lifetime_earned", 0) or 0), 2),
        },
        "identity": {
            "formula_en": f"₹{_money(earned)} earned − ₹{_money(reversed_total)} reversed + ₹{_money(returned)} returned "
                          f"− ₹{_money(pending)} requested − ₹{_money(paid_out)} paid out = ₹{_money(expected)}",
            "formula_te": f"₹{_money(earned)} సంపాదన − ₹{_money(reversed_total)} రివర్స్ + ₹{_money(returned)} తిరిగి "
                          f"− ₹{_money(pending)} అభ్యర్థన − ₹{_money(paid_out)} చెల్లింపు = ₹{_money(expected)}",
            "expected_wallet": expected,
            "actual_wallet": wallet,
            "reconciles": abs(expected - wallet) <= 0.01,
        },
        "min_payout": MIN_PAYOUT,
        "can_request_payout": wallet >= MIN_PAYOUT,
        "note_en": "Manual admin review applies to every payout; processing time is not guaranteed.",
        "note_te": "ప్రతి పేఅవుట్‌కు మాన్యువల్ సమీక్ష వర్తిస్తుంది; సమయం హామీ కాదు.",
    }


# ------------------------------------------------------------------ explainer
def earnings_explainer(user: Dict, all_users: List[Dict]) -> Dict:
    """Per-friend earnings story: what happened, what it earned, what is next."""
    st = stats_of(user)
    code = _code_of(user)
    eligible = qualifying_commission_entries(st)
    by_friend = {str(e.get("from")): e for e in eligible if e.get("from")}
    reversed_rows = [e for e in (st.get("ledger", []) or [])
                     if e.get("type") == "commission" and e.get("reversed")]

    rows = []
    for u in (all_users or []):
        if str(u.get("referred_by", "") or "").upper() != code:
            continue
        uid = str(u.get("tsap_id", ""))
        entry = by_friend.get(uid)
        reversed_entry = next((e for e in reversed_rows if str(e.get("from")) == uid), None)
        if entry:
            stage = "rewarded"
            why_en = (f"First eligible {entry.get('plan_code', 'consumer')} plan payment of "
                      f"₹{entry.get('plan_amount', '')} — the one-time ₹{FIRST_PAY_COMMISSION} reward was credited.")
            why_te = (f"మొదటి అర్హమైన {entry.get('plan_code', 'consumer')} ప్లాన్ చెల్లింపు "
                      f"₹{entry.get('plan_amount', '')} — ఒకసారి ₹{FIRST_PAY_COMMISSION} రివార్డ్ జమైంది.")
            next_en = "Nothing more from this friend — repeat payments earn no additional commission."
            next_te = "ఈ స్నేహితుడి నుంచి ఇంకేమీ లేదు — మళ్లీ చెల్లింపులకు అదనపు కమిషన్ ఉండదు."
            reward = FIRST_PAY_COMMISSION
            credited_at = entry.get("at", "")
        elif reversed_entry:
            stage = "reversed"
            why_en = f"The reward was reversed after a refund/chargeback ({reversed_entry.get('reversed_reason', 'refund')})."
            why_te = f"రిఫండ్/ఛార్జ్‌బ్యాక్ తర్వాత రివార్డ్ రివర్స్ అయింది ({reversed_entry.get('reversed_reason', 'refund')})."
            next_en = "Only a fresh eligible first-plan payment can qualify again; nothing is owed now."
            next_te = "మళ్లీ కొత్త అర్హమైన మొదటి ప్లాన్ చెల్లింపే అర్హత ఇస్తుంది; ఇప్పుడు ఏదీ రాదు."
            reward = 0
            credited_at = ""
        else:
            stage = "waiting"
            why_en = "Registered, but no eligible first consumer-plan payment yet."
            why_te = "నమోదు అయ్యారు, కానీ ఇంకా అర్హమైన మొదటి వినియోగదారు ప్లాన్ చెల్లింపు లేదు."
            next_en = ("A reward needs their first paid S_99/S_199/S_299/S_499 plan "
                       f"(₹{MIN_QUALIFYING_AMOUNT}+). Add-ons, boosts, renewals and B2B plans do not qualify.")
            next_te = (f"రివార్డ్ కు వారి మొదటి S_99/S_199/S_299/S_499 ప్లాన్ చెల్లింపు (₹{MIN_QUALIFYING_AMOUNT}+) అవసరం. "
                       "యాడ్-ఆన్‌లు, బూస్ట్‌లు, పునరుద్ధరణలు, B2B ప్లాన్‌లు అర్హం కావు.")
            reward = 0
            credited_at = ""
        rows.append({
            "tsap_id": uid,
            "name": u.get("full_name") or u.get("name", "Friend"),
            "stage": stage,
            "reward": reward,
            "credited_at": credited_at,
            "joined_at": u.get("referred_at") or u.get("created_at", ""),
            "plan_code": entry.get("plan_code", "") if entry else "",
            "plan_amount": entry.get("plan_amount", "") if entry else "",
            "why_en": why_en, "why_te": why_te,
            "next_en": next_en, "next_te": next_te,
            "timeline": [
                {"at": u.get("referred_at") or u.get("created_at", ""),
                 "label_en": "Registered with your code", "label_te": "మీ కోడ్‌తో నమోదు"},
                {"at": credited_at,
                 "label_en": f"Eligible first-plan payment → ₹{FIRST_PAY_COMMISSION}",
                 "label_te": f"అర్హమైన మొదటి ప్లాన్ చెల్లింపు → ₹{FIRST_PAY_COMMISSION}"},
            ] if stage == "rewarded" else [
                {"at": u.get("referred_at") or u.get("created_at", ""),
                 "label_en": "Registered with your code", "label_te": "మీ కోడ్‌తో నమోదు"},
                {"at": "", "label_en": "Waiting for an eligible first plan payment",
                 "label_te": "అర్హమైన మొదటి ప్లాన్ చెల్లింపు కోసం వేచి ఉంది"},
            ] if stage == "waiting" else [
                {"at": u.get("referred_at") or u.get("created_at", ""),
                 "label_en": "Registered with your code", "label_te": "మీ కోడ్‌తో నమోదు"},
                {"at": (reversed_entry or {}).get("reversed_at", ""),
                 "label_en": "Reward reversed after refund", "label_te": "రిఫండ్ తర్వాత రివార్డ్ రివర్స్"},
            ],
        })

    # Invites that never became registrations are part of the story too.
    for inv in _invites_of(user):
        if inv.get("joined_tsap"):
            continue
        rows.append({
            "tsap_id": "", "name": inv.get("name", "Invite"),
            "stage": "invited",
            "reward": 0, "credited_at": "", "joined_at": "",
            "plan_code": "", "plan_amount": "",
            "why_en": f"Invite {inv.get('token', '')} was {'opened' if int(inv.get('clicks', 0)) else 'not opened yet'}.",
            "why_te": f"ఆహ్వానం {inv.get('token', '')} {'తెరిచారు' if int(inv.get('clicks', 0)) else 'ఇంకా తెరవలేదు'}.",
            "next_en": "Registration is required before anything can be earned.",
            "next_te": "ఏదైనా రావాలంటే ముందు నమోదు అవ్వాలి.",
            "timeline": [{"at": inv.get("sent_at", ""),
                          "label_en": "Invite created", "label_te": "ఆహ్వానం సృష్టించబడింది"}],
        })

    rows.sort(key=lambda r: (r.get("stage") != "waiting", str(r.get("credited_at", ""))), reverse=True)

    gross = len(eligible) * FIRST_PAY_COMMISSION
    wallet = round(float(st.get("wallet", 0) or 0), 2)
    pending = round(float(st.get("pending_payout", 0) or 0), 2)
    paid_out = round(float(st.get("paid_out", 0) or 0), 2)
    reversed_total = round(sum(float(e.get("amount", 0) or 0) for e in reversed_rows), 2)
    return {
        "success": True,
        "rows": rows,
        "counts": {
            "registered": sum(1 for r in rows if r["stage"] in ("waiting", "rewarded", "reversed")),
            "rewarded": len(eligible),
            "waiting": sum(1 for r in rows if r["stage"] == "waiting"),
            "reversed": len(reversed_rows),
            "invited_only": sum(1 for r in rows if r["stage"] == "invited"),
        },
        "totals": {
            "reward_per_friend": FIRST_PAY_COMMISSION,
            "rewards_count": len(eligible),
            "gross_earned": gross,
            "reversed": -reversed_total,
            "pending_payout": pending,
            "paid_out": paid_out,
            "wallet": wallet,
        },
        "formula_en": (f"{len(eligible)} × ₹{FIRST_PAY_COMMISSION} = ₹{_money(gross)} earned"
                       + (f" · −₹{_money(reversed_total)} reversed" if reversed_total else "")
                       + f" · ₹{_money(pending)} payout requested · ₹{_money(paid_out)} paid out · wallet ₹{_money(wallet)}"),
        "formula_te": (f"{len(eligible)} × ₹{FIRST_PAY_COMMISSION} = ₹{_money(gross)} సంపాదన"
                       + (f" · −₹{_money(reversed_total)} రివర్స్" if reversed_total else "")
                       + f" · ₹{_money(pending)} పేఅవుట్ అభ్యర్థన · ₹{_money(paid_out)} చెల్లించారు · వాలెట్ ₹{_money(wallet)}"),
        "note_en": ("Only realised rewards are counted. Registrations alone are never shown as "
                    "money you will receive — a reward needs that person's first eligible paid plan."),
        "note_te": ("నిజంగా వచ్చిన రివార్డ్‌లే లెక్కలోకి వస్తాయి. నమోదులను రాబోయే డబ్బుగా చూపము — "
                    "రివార్డ్ కు ఆ వ్యక్తి మొదటి అర్హమైన ప్లాన్ చెల్లింపు అవసరం."),
    }


# ------------------------------------------------------------------ insights
def referral_insights(user: Dict, all_users: List[Dict]) -> Dict:
    """What actually worked for this member — from their own numbers only."""
    st = stats_of(user)
    invites = _invites_of(user)
    explainer = earnings_explainer(user, all_users)
    cstats = click_stats(_code_of(user))

    by_channel: Dict[str, Dict[str, int]] = {}
    for inv in invites:
        row = by_channel.setdefault(str(inv.get("channel", "copy")),
                                    {"sent": 0, "clicked": 0, "joined": 0, "rewarded": 0})
        row["sent"] += 1
        if int(inv.get("clicks", 0) or 0):
            row["clicked"] += 1
        if inv.get("joined_tsap"):
            row["joined"] += 1
        if inv.get("paid_at"):
            row["rewarded"] += 1
    channels = [{"channel": k, **v} for k, v in sorted(by_channel.items(),
                                                       key=lambda kv: (-kv[1]["joined"], -kv[1]["clicked"]))]

    best_channel = None
    if channels and (channels[0]["joined"] or channels[0]["clicked"]):
        top = channels[0]
        best_channel = {
            "channel": top["channel"],
            "reason_en": f"{top['clicked']} of {top['sent']} invites sent by {top['channel']} were opened "
                         f"and {top['joined']} led to a registration.",
            "reason_te": f"{top['channel']} ద్వారా పంపిన {top['sent']} ఆహ్వానాల్లో {top['clicked']} తెరిచారు, "
                         f"{top['joined']} నమోదుకు దారితీశాయి.",
        }

    clicks = int(cstats.get("clicks", 0) or 0)
    regs = int(st.get("registrations", 0) or 0)
    paid_count = len({str(e.get("from")) for e in qualifying_commission_entries(st)})
    small_sample = clicks < 10 or regs < 5
    conversion = {
        "clicks": clicks,
        "registrations": regs,
        "rewarded": paid_count,
        "click_to_join_pct": round(regs / clicks * 100, 1) if clicks else None,
        "join_to_reward_pct": round(paid_count / regs * 100, 1) if regs else None,
        "sample_size_note_en": ("Small sample — treat these percentages as indicative, not as a forecast."
                                if small_sample else
                                "Based on your own tracked clicks and registrations."),
        "sample_size_note_te": ("చిన్న సాంపుల్ — ఈ శాతాలు సూచిక మాత్రమే, అంచనా కాదు."
                                if small_sample else
                                "మీ ట్రాక్ అయిన క్లిక్‌లు మరియు నమోదుల ఆధారంగా."),
        "small_sample": small_sample,
    }

    followups = []
    for inv in invites:
        if _invite_stage(inv) != "sent":
            continue
        days = _days_since(inv.get("sent_at", "")) or 0
        if days >= INVITE_FOLLOWUP_DAYS:
            followups.append({
                "token": inv.get("token", ""),
                "name": inv.get("name", ""),
                "days": days,
                "share": _invite_share_links(inv),
                "reason_en": f"Sent {days} days ago and not opened yet.",
                "reason_te": f"{days} రోజుల క్రితం పంపారు, ఇంకా తెరవలేదు.",
            })
    followups.sort(key=lambda f: -int(f.get("days", 0)))
    followups = followups[:5]

    actions: List[Dict] = []
    if followups:
        actions.append({
            "title_en": "Re-send the invites that were never opened",
            "title_te": "తెరవని ఆహ్వానాలను మళ్లీ పంపండి",
            "why_en": f"{len(followups)} invite(s) are older than {INVITE_FOLLOWUP_DAYS} days with no open.",
            "why_te": f"{len(followups)} ఆహ్వానాలు {INVITE_FOLLOWUP_DAYS} రోజుల కంటే పాతవి, తెరవలేదు.",
            "href": "/referral",
        })
    if explainer["counts"]["waiting"]:
        actions.append({
            "title_en": "Explain the plan to friends who registered but have not paid",
            "title_te": "నమోదైనా చెల్లింపు చేయని వారికి ప్లాన్ వివరించండి",
            "why_en": f"{explainer['counts']['waiting']} friend(s) are registered. A reward needs their first eligible plan payment — never promise one.",
            "why_te": f"{explainer['counts']['waiting']} మంది నమోదు అయ్యారు. రివార్డ్ కు వారి మొదటి అర్హమైన ప్లాన్ చెల్లింపు అవసరం — హామీ ఇవ్వకండి.",
            "href": "/pricing",
        })
    if float(st.get("wallet", 0) or 0) >= MIN_PAYOUT:
        actions.append({
            "title_en": "Your wallet is above the payout minimum",
            "title_te": "మీ వాలెట్ పేఅవుట్ కనిష్ఠం దాటింది",
            "why_en": f"₹{st.get('wallet')} available; the minimum request is ₹{MIN_PAYOUT}. Review is manual and timing is not guaranteed.",
            "why_te": f"₹{st.get('wallet')} అందుబాటులో ఉంది; కనిష్ఠం ₹{MIN_PAYOUT}. సమీక్ష మాన్యువల్, సమయం హామీ కాదు.",
            "href": "/referral",
        })
    opened_not_joined = sum(1 for inv in invites
                            if _invite_stage(inv) == "clicked" and not inv.get("joined_tsap"))
    if opened_not_joined:
        actions.append({
            "title_en": "Remind the people who opened your link but have not registered",
            "title_te": "లింక్ తెరిచినా నమోదు కాని వారికి గుర్తు చేయండి",
            "why_en": f"{opened_not_joined} invite(s) were opened without a registration — a short, pressure-free reminder is all that is warranted.",
            "why_te": f"{opened_not_joined} ఆహ్వానాలు తెరిచారు కానీ నమోదు కాలేదు — ఒత్తిడి లేని చిన్న గుర్తుచేత సరిపోతుంది.",
            "href": "/referral",
        })
    if not invites:
        actions.append({
            "title_en": "Send your first tracked invite",
            "title_te": "మీ మొదటి ట్రాక్ అయిన ఆహ్వానం పంపండి",
            "why_en": "Per-person invites show who opened your link and who joined — far more useful than a broadcast.",
            "why_te": "ఒక్కొక్కరికి పంపిన ఆహ్వానాలతో ఎవరు తెరిచారు, ఎవరు చేరారు తెలుస్తుంది.",
            "href": "/referral",
        })
    if not actions:
        # Never leave the panel empty: a referrer with invites but no signal yet
        # still has something honest to do.
        actions.append({
            "title_en": "Put your QR poster where families gather",
            "title_te": "కుటుంబాలు కలిసే చోట మీ QR పోస్టర్ ఉంచండి",
            "why_en": "A poster reaches people you would not message directly. Download one from the poster tab — no numbers, no promises.",
            "why_te": "నేరుగా సందేశం పంపని వారికి పోస్టర్ చేరుతుంది. పోస్టర్ ట్యాబ్ నుంచి డౌన్‌లోడ్ చేయండి — ఎటువంటి హామీలు లేవు.",
            "href": "/referral",
        })

    return {
        "success": True,
        "channels": channels,
        "best_channel": best_channel,
        "conversion": conversion,
        "followups": followups,
        "next_actions": actions,
        "invite_counts": invite_list(user, limit=300)["counts"],
        "note_en": "Everything here is computed from your own tracked invites. No other member's data is used.",
        "note_te": "ఇవన్నీ మీ ఆహ్వానాల డేటా నుంచే లెక్కించబడ్డాయి. ఇతరుల డేటా వాడలేదు.",
    }
