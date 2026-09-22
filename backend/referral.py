"""
MANA VIVAHA — REFERRAL 2.0 (Advanced) 🤝
========================================
Rule (user's words): **"referral bonus laga iddam andariki bestga — ₹99 kabatti first time
vallu manaku pay chestharu, kabatti manam ₹50 istham referal vallaki."**

Design goals:
  * ఎవరికైనా ₹50 — referred friend **modati payment** (₹29/₹99/₹199/₹299/₹499 — edaina) chesthe
  * Referee (kotha user) ki kooda **bonus credits** — "అందరికీ bestga"
  * Repeat payments ki commission LEDU — ₹50 okkasari matrame (first payment) — WAVE 25 rule
  * Tiers (BRONZE → ELITE): BADGES matrame (extra % ledu) — recognition kosam
  * Milestones: 3 / 10 / 25 / 50 paying referrals → cash + credits (AUTO credit — manual ledu)
  * Anti-fraud: self-referral block, one-referral-lock, daily cap, duplicate phone/UPI, refund clawback
  * Payouts: wallet → ₹100 min → UPI/bank request → admin approve → UTR (audit trail)
  * Durability: state file (backend/referral_state.json) — server restart aina wallets/ledger safe

Backward compatible: generate_referral_code / calculate_commission / check_bonus_eligibility /
process_referral_payment / get_leaderboard — purathana calls break avvavu (signature defaults).
"""
from __future__ import annotations

import json
import os
import random
import re
import string
import threading
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Dict, List, Optional

# ------------------------------------------------------------------ CONFIG
REFERRAL_VERSION = "2.0"

FIRST_PAY_COMMISSION = 50          # ₹50 — modati payment (edi aina) ki flat
MIN_QUALIFYING_AMOUNT = 29         # ₹29 kanna thakkuva unte count cheyyadu
REPEAT_COMMISSION_PCT = 0.0        # 🌊 WAVE 25: repeat ki commission LEDU (₹50 first-payment-only)
REPEAT_COMMISSION_CAP = 0          # retired — compat kosam uncham
REFEREE_BONUS_CREDITS = 1          # kotha user ki bonus credit (andariki)
MIN_PAYOUT = 100                   # payout minimum ₹100
PAYOUT_SLA_DAYS = 3                # request → 3 working days lo pay
# 🚦 SOFT tripwires (BLOCK ledu — "evvaru enni aina refer cheyyochu"):
#    ee numbers dhaatithe commission AUTO hold avvadu, admin review ki flag matrame vastundi.
DAILY_PAYING_SOFT_CAP = 50         # okka roju lo ee number paying referrals dhaatithe → review flag
LIFETIME_SOFT_CAP = 500            # lifetime ee number dhaatithe → review flag
SAME_PHONE_SOFT_LIMIT = 3          # okate phone number nunchi intha mandi accounts → review flag (block ledu)

TIERS: List[Dict] = [
    {"key": "BRONZE",   "min": 0,  "extra_pct": 0,  "icon": "🥉", "perks": ["₹50 per paying referral", "Daily 10 cap"]},
    {"key": "SILVER",   "min": 3,  "extra_pct": 0,  "icon": "🥈", "perks": ["🥈 Silver Referrer badge", "Priority support"]},
    {"key": "GOLD",     "min": 10, "extra_pct": 0, "icon": "🥇", "perks": ["🥇 Gold Referrer badge", "Free 1 porutham report", "Channel shout-out"]},
    {"key": "PLATINUM", "min": 25, "extra_pct": 0, "icon": "💎", "perks": ["💎 Verified Referrer badge", "Homepage recognise"]},
    {"key": "ELITE",    "min": 50, "extra_pct": 0, "icon": "👑", "perks": ["👑 Elite badge + VIP support", "Top referrer wall"]},
]

MILESTONES: List[Dict] = [
    {"paid": 3,  "cash": 0,    "credits": 0,  "title": "🥈 SILVER Referrer", "telugu": "3 paying referrals — 🥈 badge + priority support"},
    {"paid": 10, "cash": 0,  "credits": 0,  "title": "🥇 GOLD Referrer", "telugu": "10 paying referrals — 🥇 badge + free పొరుతం report"},
    {"paid": 25, "cash": 0,  "credits": 0, "title": "💎 PLATINUM Referrer", "telugu": "25 paying referrals — 💎 verified badge + homepage"},
    {"paid": 50, "cash": 0, "credits": 0, "title": "👑 ELITE Referrer", "telugu": "50 paying referrals — 👑 elite badge + VIP support"},
]

REFERRAL_TYPES = ("USER", "LADY", "STUDENT", "INFLUENCER", "BROKER", "BUREAU", "PHONE", "NONE")
STATE_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "referral_state.json")

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


def stats_of(user: Dict) -> Dict:
    """Referrer stats — pata format తో backward compatible."""
    s = user.setdefault("referral_stats", {})
    s.setdefault("clicks", 0)
    s.setdefault("registrations", s.get("total", 0))
    s.setdefault("total", s.get("registrations", 0))
    s.setdefault("paid_count", 0)
    s.setdefault("wallet", user.get("wallet", 0))
    s.setdefault("lifetime_earned", s.get("wallet", 0))
    s.setdefault("pending_payout", 0)
    s.setdefault("paid_out", 0)
    s.setdefault("paid_today", 0)
    s.setdefault("paid_today_date", "")
    s.setdefault("tier", "BRONZE")
    s.setdefault("milestones_hit", [])
    s.setdefault("flags", [])
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
    🌊 WAVE 25 — FLAT ₹50 ONLY: referred user MODATI payment (≥ ₹29) ki ₹50.
    Repeat payments ki ₹0. Tier extra LEDU (tiers = badges matrame).
    """
    amount = int(plan_amount or 0)
    if amount < MIN_QUALIFYING_AMOUNT:
        return 0
    if not is_first_payment:
        return 0
    return int(FIRST_PAY_COMMISSION)


def check_bonus_eligibility(referrer_stats: Dict) -> Dict:
    """Milestone + tier status — bonus cash/credits **auto credit** అవుతాయి (process లో)."""
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
        with open(STATE_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False)
        try:  # 🌊 WAVE 19 — partner wallets/stats kooda persist (attach/process mutates them)
            from refpartners import _save as _partner_save
            _partner_save()
        except Exception:
            pass
        return {"ok": True, "path": STATE_FILE}
    except Exception as e:
        return {"ok": False, "error": str(e)[:120]}


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
            "message_telugu": "✅ %s గారు ద్వారా వచ్చారు — మీ registration కి +%d FREE credit!" % (name, REFEREE_BONUS_CREDITS)}


def attach_referral(user: Dict, code: str, all_users: List[Dict]) -> Dict:
    """
    Register time lo referral ni **lock** chestundi + referee bonus credit isthundi.
    Guards: self-referral (same phone / same tsap), already-referred lock, code invalid.
    """
    with _REF_LOCKS["attach:" + _ref_lock_key(user)]:
        return _attach_referral_locked(user, code, all_users)


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
    st["total"] = st["registrations"]
    ref["referral_stats"] = st
    # 🎁 referee (kotha user) bonus — andariki
    user["credits"] = int(user.get("credits", 0) or 0) + REFEREE_BONUS_CREDITS
    user.setdefault("credit_history", []).append(
        {"at": _now(), "change": REFEREE_BONUS_CREDITS, "reason": "referral_join_bonus",
         "by": _code_of(ref), "note": "Referral తో register — bonus credit"})
    save_state()
    return {"ok": True, "referrer_code": _code_of(ref), "referrer_id": ref.get("tsap_id"),
            "referrer_name": ref.get("full_name") or ref.get("name") or "", "bonus_credits": REFEREE_BONUS_CREDITS,
            "referee_credits": user.get("credits", 0), "commission_offer": FIRST_PAY_COMMISSION,
            "flags": _soft_flags,
            "note_telugu": ("ℹ️ మీ code తో ఒకటే phone నుంచి ఇంకా ఒకరు join అయ్యారు — పర్వాలేదు, "
                            "కానీ మన team verify చేస్తుంది" if _family_same_phone else ""),
            "message_telugu": "🎉 Referral lock అయ్యింది (%s) — మీ account కి +%d FREE credit వచ్చింది!"
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
                             all_users: List[Dict], payment_id: str = "") -> Dict:
    with _REF_LOCKS["commission:" + _ref_lock_key(referred_user)]:
        return _process_referral_payment_locked(referred_user, referrer_code, plan_amount,
                                                all_users, payment_id)


def _process_referral_payment_locked(referred_user: Dict, referrer_code: str, plan_amount: int,
                                     all_users: List[Dict], payment_id: str = "") -> Dict:
    """
    Referred friend pay chesaka → referrer ki ₹50 wallet (FLAT, first payment only).
    · First payment  → ₹50 flat — "అందరికీ ₹50, anthe" (WAVE 25)
    · Repeat payment → ₹0 (no commission)
    · Milestone hit  → badge recognition matrame (cash/credits ledu)
    """
    amount = int(plan_amount or 0)
    ref = find_referrer(referrer_code, all_users)
    if not ref:
        return {"success": False, "reason": "referrer_not_found", "code": referrer_code,
                "message_telugu": "⚠️ Referrer దొరకలేదు — admin verify చేస్తాడు (commission pending)"}
    if amount < MIN_QUALIFYING_AMOUNT:
        return {"success": False, "reason": "amount_too_small", "amount": amount,
                "message_telugu": "ℹ️ ₹%d payments కి referral bonus లేదు (min ₹%d)" % (amount, MIN_QUALIFYING_AMOUNT)}

    st = stats_of(ref)
    flags = _fraud_flags(ref, referred_user, all_users)
    if flags:
        flag = "fraud_review:" + ",".join(flags)
        if flag not in st["flags"]:
            st["flags"].append(flag)
        # 🚦 SOFT mode: commission ippude wallet lo pothundi (aapemu) — admin review flag matrame.
        #    Fraud proof ayithe /api/admin/refund tho clawback chestham.

    # first payment? (ee user ki ee varaku commission ivvaledu)
    first = not any(l.get("type") == "commission" and l.get("from") == referred_user.get("tsap_id")
                    for l in reversed(st.get("ledger", [])))
    tier = tier_of(st["paid_count"])["key"]
    commission = calculate_commission(parse_referral_type(referrer_code), amount, first, tier)
    if commission <= 0:
        if not first:
            referred_user["has_paid"] = True
            referred_user.setdefault("first_paid_at", _now())
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
    if st.get("paid_today_date") != _today():
        st["paid_today_date"] = _today()
        st["paid_today"] = 0
    st["paid_today"] = int(st.get("paid_today", 0)) + 1
    st["last_paid_at"] = _now()
    st.setdefault("ledger", []).append({
        "id": _next_id("RC"), "at": _now(), "type": "commission", "amount": commission,
        "from": referred_user.get("tsap_id"), "from_name": referred_user.get("full_name") or referred_user.get("name", ""),
        "plan_amount": amount, "first_payment": first, "tier": tier, "payment_id": payment_id,
        "note": ("మొదటి payment bonus ₹%d (flat)" % FIRST_PAY_COMMISSION),
    })

    # 🏆 milestone + tier bonus (auto credit — cash + credits)
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

    # referee ki thank-you + referrer ki notification (Telugu)
    msg_ref = ("🎉 Congrats! %s (₹%d) pay చేశాడు — మీకు ₹%d wallet లో వచ్చింది%s. "
               "Balance: ₹%s | Tier: %s %s"
               % (referred_user.get("tsap_id", "friend"), amount, commission,
                  (" + %d credits" % bonus_credits_added) if bonus_credits_added else "",
                  st["wallet"], new_tier["icon"], new_tier["key"]))
    if bonus["reward"]:
        msg_ref += " 🏆 %s" % bonus["reward"]
    if bonus["next"]:
        msg_ref += " | ఇంకా %d pays అయితే %s" % (bonus["next"]["need"], bonus["next"]["title"])
    save_state()
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
        "referee_message_telugu": ("🙏 Thank you! మీ payment success. మీ friend %s కి ₹%d bonus వెళ్లింది — "
                                   "మీ profile ఇప్పుడు channels లో active!" % (_code_of(ref), commission)),
    }


def reverse_referral_payment(referred_user: Dict, plan_amount: int, all_users: List[Dict],
                             reason: str = "refund") -> Dict:
    """Payment refund/chargeback అయితే — referrer wallet నుంచి commission తీసేస్తాం (clawback)."""
    code = referred_user.get("referred_by")
    ref = find_referrer(code or "", all_users)
    if not ref:
        return {"success": False, "reason": "referrer_not_found"}
    st = stats_of(ref)
    def _candidates():
        return [e for e in st.get("ledger", [])
                if e.get("type") == "commission" and e.get("from") == referred_user.get("tsap_id")
                and not e.get("reversed")]
    cands = _candidates()
    if not cands:
        return {"success": False, "reason": "no_commission_found"}
    # 🎯 Same amount (ee payment ki sambandhinchina commission) ni mundu reverse cheyyadam —
    #    ₹99 refund ki ₹99 commission, ₹199 refund ki ₹199 commission (audit correct ga)
    exact = [e for e in cands if int(e.get("plan_amount", 0)) == int(plan_amount or 0)]
    target = (exact or cands)[-1]
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
    save_state()
    return {"success": True, "reversed": paid_back, "wallet": st["wallet"],
            "message_telugu": "↩️ Refund జరిగింది — ₹%d commission wallet నుంచి తీసేశాం" % paid_back}


# ------------------------------------------------------------------ payouts
UPI_RE = re.compile(r"^[a-zA-Z0-9._-]{2,64}@[a-zA-Z]{2,32}$")
IFSC_RE = re.compile(r"^[A-Z]{4}0[A-Z0-9]{6}$")
# 🌊 WAVE 25 — payout UTR/reference: UPI 12-digit ref / bank UTR (audit must be traceable)
PAYOUT_UTR_RE = re.compile(r"^[A-Za-z0-9]{6,30}$")
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
    """Wallet → payout request (₹100 min). UPI id validate + duplicate pending guard."""
    with _REF_LOCKS["payreq:" + _ref_lock_key(user)]:
        return _payout_request_locked(user, amount, method, upi_id, bank, note)


def _payout_request_locked(user: Dict, amount: int, method: str = "upi", upi_id: str = "",
                           bank: Optional[Dict] = None, note: str = "") -> Dict:
    st = stats_of(user)
    method = (method or "upi").lower()
    try:
        amount = int(amount)
    except Exception:
        return {"ok": False, "reason": "bad_amount", "message_telugu": "⚠️ Amount సరిగా ఇవ్వండి"}
    if method not in ("upi", "bank"):
        return {"ok": False, "reason": "bad_method", "message_telugu": "⚠️ upi లేదా bank మాత్రమే"}
    if amount < MIN_PAYOUT:
        return {"ok": False, "reason": "below_min", "min": MIN_PAYOUT,
                "message_telugu": "ℹ️ Minimum ₹%d నుంచి payout అడగొచ్చు — మీ wallet ₹%s" % (MIN_PAYOUT, st["wallet"])}
    if amount > float(st.get("wallet", 0)):
        return {"ok": False, "reason": "insufficient_wallet", "wallet": st["wallet"],
                "message_telugu": "⚠️ Wallet లో ₹%s మాత్రమే ఉంది — ₹%d అడగలేరు" % (st["wallet"], amount)}
    _me = user.get("tsap_id") or user.get("partner_id")
    if any((p.get("tsap_id") or p.get("partner_id")) == _me and p.get("status") == "requested" for p in PAYOUTS):
        return {"ok": False, "reason": "pending_exists",
                "message_telugu": "⏳ మీ పాత payout request ఇంకా process లో ఉంది — అది అయ్యాక మళ్లీ అడగండి"}
    if method == "upi":
        if not UPI_RE.fullmatch((upi_id or "").strip()):
            return {"ok": False, "reason": "bad_upi",
                    "message_telugu": "⚠️ UPI ID తప్పులా ఉంది (ఉదాహరణ: name@okhdfcbank)"}
    else:
        bank = bank or {}
        if not (str(bank.get("account_no", "")).strip() and IFSC_RE.fullmatch(str(bank.get("ifsc", "")).strip().upper())
                and str(bank.get("holder", "")).strip()):
            return {"ok": False, "reason": "bad_bank",
                    "message_telugu": "⚠️ Bank details సరిగా ఇవ్వండి (holder + account no + IFSC)"}
    req = {
        "id": _next_id("PAY"), "tsap_id": user.get("tsap_id"), "partner_id": user.get("partner_id", ""),
        "name": user.get("full_name") or user.get("name", ""),
        "code": _code_of(user), "amount": amount, "method": method,
        "upi_id": (upi_id or "").strip() if method == "upi" else "",
        "bank": {k: str(v).strip() for k, v in (bank or {}).items()} if method == "bank" else {},
        "status": "requested", "requested_at": _now(), "utr": "", "note": note,
        "eta_days": PAYOUT_SLA_DAYS, "tier": st.get("tier", "BRONZE"),
    }
    PAYOUTS.append(req)
    st["wallet"] = round(float(st.get("wallet", 0)) - amount, 2)
    st["pending_payout"] = round(float(st.get("pending_payout", 0)) + amount, 2)
    user["wallet"] = st["wallet"]
    st.setdefault("ledger", []).append({"id": _next_id("PR"), "at": _now(), "type": "payout_request",
                                        "amount": -amount, "note": "%s → %s" % (req["id"], upi_id or "bank")})
    save_state()
    return {"ok": True, "request": req, "wallet": st["wallet"],
            "message_telugu": "✅ Payout request వచ్చింది (%s • ₹%d). %d working days లో మీ %s కి వెళ్తుంది."
                              % (req["id"], amount, PAYOUT_SLA_DAYS, "UPI" if method == "upi" else "bank account")}


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
    try:
        if user.get("partner_id"):
            from refpartners import _save as _partner_save
            _partner_save()
    except Exception:
        pass
    save_state()
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
    try:
        if ref.get("partner_id"):
            from refpartners import _save as _partner_save
            _partner_save()
    except Exception:
        pass
    save_state()
    return {"ok": True, "request": req, "wallet": 0, "paid": amt,
            "message_telugu": "✅ ₹%s manual pay (UTR %s) — wallet ₹0 అయ్యింది" % (amt, utr.strip())}


def payout_queue(status: str = "requested") -> Dict:
    rows = [p for p in PAYOUTS if (not status or p.get("status") == status)]
    total = sum(float(p.get("amount", 0)) for p in rows)
    return {"count": len(rows), "total_amount": round(total, 2), "items": sorted(rows, key=lambda p: p.get("requested_at", "")),
            "message_telugu": "💰 %d payout requests — ₹%s pending. UTR తో approve చెయ్యండి." % (len(rows), total)}


# ------------------------------------------------------------------ clicks + funnel
def track_click(code: str, source: str = "link") -> Dict:
    """ /r/<code> click — funnel (clicks → registrations → payments) కి కావాలి. """
    c = (code or "").strip().upper()
    CLICKS.append({"at": _now(), "code": c, "source": source})
    save_state()
    return {"ok": True, "code": c, "clicks_total": sum(1 for x in CLICKS if x["code"] == c)}


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
    paid_regs = [u for u in regs if any(l.get("type") == "commission" and l.get("from") == u.get("tsap_id")
                                        for l in st.get("ledger", []))]
    # 💎 R12 — pending pipeline: register ayyi, inka pay cheyani friends (commission future lo vastundi)
    pending_friends = len(regs) - len(paid_regs)
    if pending_friends < 0:
        pending_friends = 0
    tier = tier_of(st["paid_count"])
    nxt = next_milestone(st["paid_count"])
    cstats = click_stats(_code_of(user))
    conv = round((st["paid_count"] / cstats["clicks"] * 100), 1) if cstats["clicks"] else 0.0
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
            "pending_value": round(pending_friends * FIRST_PAY_COMMISSION, 2),
            "credits_earned": sum(int(h.get("change", 0)) for h in user.get("credit_history", [])
                                  if h.get("reason") == "referral_milestone"),
            "conversion_pct": conv, "per_paying_user": FIRST_PAY_COMMISSION,
        },
        "commission_rules": {
            "first_payment": "₹%d (ఏది అయిన plan — ₹%d నుంచి)" % (FIRST_PAY_COMMISSION, MIN_QUALIFYING_AMOUNT),
            "repeat_payment": "₹0 — commission ఒక్కసారి మాత్రమే (first payment)",
            "tier_extra": "badges మాత్రమే (extra % లేదు)",
            "referee_bonus": "+%d credit to the new user" % REFEREE_BONUS_CREDITS,
            "min_payout": MIN_PAYOUT, "payout_sla_days": PAYOUT_SLA_DAYS,
        },
        "next_milestone": nxt,
        "milestones_hit": st["milestones_hit"],
        "milestones": MILESTONES,
        "tiers": TIERS,
        "recent_registrations": [{"tsap_id": u.get("tsap_id"),
                                  "name": u.get("full_name") or u.get("name", "Friend"),
                                  "gender": u.get("gender") or "Groom",
                                  "caste": u.get("caste") or "All",
                                  "district": u.get("district") or "AP/TS",
                                  "joined": u.get("referred_at") or u.get("created_at", ""),
                                  "paid": u in paid_regs,
                                  "commission": round(sum(float(l.get("amount", 0) or 0) for l in st.get("ledger", [])
                                                        if l.get("type") == "commission" and l.get("from") == u.get("tsap_id")), 2) or (FIRST_PAY_COMMISSION if u in paid_regs else 0),
                                  "status_text_te": "✅ ₹50 వాలెట్‌కు జమైంది" if u in paid_regs else "⏳ రిజిస్టర్డ్ (మొదటి పేమెంట్ పెండింగ్)",
                                  "status_text_en": "✅ ₹50 Credited to Wallet" if u in paid_regs else "⏳ Registered (Payment Pending)"}
                                 for u in regs[-limit_recent:]][::-1],
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
    """WhatsApp/Telegram లో share చెయ్యడానికి ready texts (Telugu) + poster + QR link."""
    ensure_referrer_profile(user, [])
    code = _code_of(user)
    link = user.get("referral_link") or ("https://manavivaha.in/r/%s" % code)
    name = user.get("full_name") or user.get("name") or "మన వివాహ"
    wa = ("🙏 నమస్తే! నేను %s.\n\n"
          "మన వివాహ (TS-AP Telugu Matrimony) — ₹99 సంబంధం, మొదటి 3 requests FREE.\n"
          "✅ నిజమైన profiles • ఫోటో గోప్యం • 52 Telegram channels\n"
          "✅ మీ సొంత code %s తో register చేస్తే +1 credit EXTRA FREE!\n\n"
          "👉 %s\n"
          "🔗 ఛానెల్: https://t.me/TSAP_MATRIMONY") % (name, code, link)
    variants = [
        wa,
        ("💍 పెళ్లి చూసుకుంటున్నారా? మన వివాహ — TS/AP Telugu matrimony.\n"
         "₹99 → 5 profiles • మొదటి 3 FREE • numbers రెండు వైపులా ok అయ్యాకే.\n"
         "నా code *%s* తో register చేస్తే మీకు +1 credit FREE 🎁\n%s") % (code, link),
        ("👰🤵 మన వివాహ లో రోజూ కొత్త profiles (Reddy, Kamma, Kapu, Mala, Madiga... caste-wise channels).\n"
         "నా code: %s → %s\n+1 credit FREE (నా referral)!") % (code, link),
        ("🔔 నమస్తే! మీ ఇంట్లో/relative circle లో పెళ్లి చూసుకుంటున్న వాళ్లకి ఈ link పంపండి:\n%s\n"
         "మన వివాహ — 3 requests FREE, ₹99 కి 5 profiles. నా code *%s* (bonus credit ఉంది).") % (link, code),
        ("🙏 %s గారు, మన వివాహ లో register చెయ్యండి — photo private, fraud జాగ్రత్త, Telugu support.\n"
         "%s\nCode: *%s* (+1 credit FREE)") % (name, link, code),
    ]
    tg = "💍 మన వివాహ — TS/AP Telugu Matrimony\n₹99 సంబంధం • మొదటి 3 FREE\nనా code: %s\n%s" % (code, link)
    # 🎬 WAVE 40 — VIDEO KIT: promoters వీడియో చేసుకుని promote చేయడానికి ready scripts
    video_kit = [
        {"style": "15-sec reel (Instagram/YouTube Shorts)",
         "script": ("[0-3s] క్లోజ్-అప్: 'పెళ్లి సంబంధాలు వెతుకుతున్నారా?'\n"
                    "[3-8s] స్క్రీన్ రికార్డింగ్: మన వివాహ site — profiles, ₹99 plan\n"
                    "[8-12s] 'మొదటి 3 సంబంధాలు FREE! నా code %s తో register చెయ్యండి'\n"
                    "[12-15s] లింక్ చూపించండి: %s + 'లైక్ షేర్ చెయ్యండి!'") % (code, link)},
        {"style": "30-sec talking video (WhatsApp Status)",
         "script": ("'నమస్తే! మీ ఇంట్లో, ఫ్రెండ్స్ లో పెళ్లి సంబంధాలు వెతుకుతున్న వాళ్లు ఉన్నారా? "
                    "మన వివాహ అనే Telugu matrimony site చూడండి — నిజమైన profiles, ఫోటో ప్రైవసీ, "
                    "కులం వారీగా ఛానళ్లు. మొదటి 3 సంబంధాలు FREE. నా code %s తో register చేస్తే bonus కూడా ఉంది. "
                    "లింక్ బయోలో ఉంది — షేర్ చేయండి!'") % code},
        {"style": "Testimonial (ఎవరైనా match అయ్యాక)",
         "script": ("'మా ఫ్రెండ్ కి మన వివాహ ద్వారా సంబంధం కుదిరింది — నేను refer చేసి ₹%d సంపాదించాను! "
                    "మీకు కూడా పరిచయాలు ఉంటే ఇది చూడండి — %s'") % (FIRST_PAY_COMMISSION, link)},
    ]
    return {
        "code": code, "link": link, "alias": user.get("referral_alias"),
        "whatsapp_messages": variants, "whatsapp_share": "https://wa.me/?text=" + _urlenc(variants[0]),
        "whatsapp_share_variants": ["https://wa.me/?text=" + _urlenc(v) for v in variants],
        "telegram_share": "https://t.me/share/url?url=%s&text=%s" % (_urlenc(link), _urlenc("మన వివాహ — నా code %s" % code)),
        "sms_text": "మన వివాహ Telugu Matrimony — నా code %s తో register చెయ్యండి (+1 credit FREE): %s" % (code, link),
        "poster_text": "💰 ₹50 per paying referral\nCode: %s\n%s" % (code, link),
        "poster_card": "/api/referral/%s/poster.png" % _tsap_or_code(user),
        "qr_target": link,
        "status_text": "Manavivaha.in/r/%s — నా code తో register చేస్తే +1 credit free 🎁" % code,
        "video_kit": video_kit,
        "message_telugu": "📲 Share చెయ్యడానికి 5 ready messages (WhatsApp), Telegram link, poster, వీడియో scripts — అన్నీ ఇక్కడే!",
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
        paid = int(st.get("paid_count", 0) or 0)
        # 💎 R12: paid OR register-chesina someone unte board lo (0-activity users skip)
        if not paid and not refers:
            continue
        earned = float(st.get("lifetime_earned", u.get("wallet", 0)) or 0)
        if cutoff:
            entries = [l for l in st.get("ledger", [])
                       if l.get("type") in ("commission", "milestone") and str(l.get("at", "")) >= cutoff]
            if not entries:
                continue
            earned = sum(float(l.get("amount", 0)) for l in entries)
        rows.append({
            # WAVE 25 — public board: FIRST name matrame (surname hidden — W13 rule)
            "name": str(u.get("full_name") or u.get("name") or "మన వివాహ member").split()[0],
            "code": _code_of(u), "tsap_id": u.get("tsap_id"),
            "refers": refers,
            "paid": paid,
            "earned": round(earned, 2),
            "tier": tier_of(paid)["key"],
            "icon": tier_of(paid)["icon"],
        })
    try:
        from refpartners import PARTNERS as _P19
        for u in _P19:
            st = u.get("referral_stats") or {}
            refers = int(st.get("registrations", 0) or 0)
            paid = int(st.get("paid_count", 0) or 0)
            if not paid and not refers:
                continue
            earned = float(st.get("lifetime_earned", 0) or 0)
            if cutoff:
                entries = [l for l in st.get("ledger", [])
                           if l.get("type") in ("commission", "milestone") and str(l.get("at", "")) >= cutoff]
                if not entries:
                    continue
                earned = sum(float(l.get("amount", 0)) for l in entries)
            rows.append({
                "name": str(u.get("name") or "Partner").split()[0],
                "code": u.get("partner_id", ""), "tsap_id": "",
                "partner_id": u.get("partner_id", ""),
                "refers": refers,
                "paid": paid,
                "earned": round(earned, 2),
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
        "headline": "₹50 per paying referral — అందరికీ",
        "rules_telugu": [
            "🆓 Register FREE — **3 matches/profiles FREE**. ఆ తర్వాత friend ₹99 (లేదా ₹29+ ఏదైనా plan) pay చేస్తే —",
            "💰 **మీ wallet కి ₹50** (ఏదైనా plan, మొదటి payment — అందరికీ ఒకటే)",
            "👥 **ఎవ్వరు ఎన్ని అయినా refer చెయ్యొచ్చు — limit లేదు, conditions లేవు** (bride/groom/brother/parents/friend/broker/vendor — ఎవ్వరైనా)",
            "📞 **ఒకటే phone లో కూడా పర్వాలేదు** — ఇంట్లో అందరూ ఒకటే number వాడుకుంటున్నా, అందరూ refer చెయ్యొచ్చు",
            "🎁 కొత్త user కి (referee) **+1 credit FREE** + free 3 profiles — వాళ్లకి కూడా లాభం",
            "🔁 Friend తర్వాత మళ్లీ pay చేస్తే (renewal/add-on) — commission **లేదు** (₹50 ఒక్కసారి మాత్రమే — అంతే)",
            "🏆 Tiers: SILVER 3 → GOLD 10 → PLATINUM 25 → ELITE 50 paying referrals — **badges + recognition** (extra money లేదు)",
            "💸 Payout: wallet ₹100 దాటితే UPI/bank కి request పెట్టండి — 3 working days లో credit. మనం pay చేశాక wallet నుంచి తీసేస్తాం + transaction list లో **PAID (UTR తో)** కనిపిస్తుంది ✅",
            "✅ మన team spam/fake patterns (bot registrations, fake payments) ని review చేస్తుంది — నిజమైన referrals కి ఏ problem లేదు",
            "↩️ Customer refund అడిగితే ఆ commission wallet నుంచి తీసేస్తాం (clawback) — double profit లేదు",
            "📊 Dashboard లో clicks, registrations, payments, wallet, tier — అన్నీ live గా కనిపిస్తాయి",
        ],
        "not_allowed": ["Fake/duplicate registrations (bot accounts)", "Fake payments / chargeback fraud",
                        "Bulk spam / unsolicited bulk messages", "Refund చేసిన payments కి commission claim", "Fake profiles create చెయ్యడం"],
        "no_conditions_telugu": "ఎవ్వరు ఎన్ని అయినా refer చెయ్యొచ్చు — ఒకటే phone, ఒకటే family, ఒకటే village — అన్నీ allowed. Limit లేదు.",
        "support": "manavivaha.in • WhatsApp support • care@manavivaha.in",
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
# 🔔 WhatsApp NOTIFICATIONS (referrer ki instant update — loop closed)
#    Ee functions text matrame return chesthayi; queue main.py lo jarugutundi.
# ---------------------------------------------------------------------------
def _name_of(u, fallback="Friend"):
    return (u.get("full_name") or u.get("name") or fallback).split()[0]


def referrer_join_text(referrer, referee):
    """Friend register ayyinappudu referrer కి pampE message."""
    return (
        "🎉 %s గారు, మీ referral link నుంచి *%s* join అయ్యారు!\n\n"
        "వాళ్లు మొదటి payment (₹99/₹199...) చెయ్యగానే మీకు *₹50* మీ wallet లో వెళ్తుంది.\n"
        "మీ code: %s | మీ link: %s\n\n"
        "ఇంకా మందికి పంపండి — ప్రతి paying friend కి ₹50 (limit లేదు) 💰\n"
        "— మన వివాహ · /referral లో మీ dashboard"
        % (_name_of(referrer, "Garu"), _name_of(referee), _code_of(referrer),
           referrer.get("referral_link") or "https://manavivaha.in/r/%s" % _code_of(referrer)))


def referrer_commission_text(referrer, referee, result):
    """Payment vachhi commission credit ayyinappudu referrer కి pampE message (Status image link తో)."""
    amt = result.get("commission", 0)
    st = stats_of(referrer)
    tier = result.get("tier") or st.get("tier", "BRONZE")
    milestone = result.get("milestone")
    ref_code = _code_of(referrer)
    ref_name = _name_of(referrer, "Partner")
    site = SITE_URL
    card_url = f"{site}/api/referral/earnings-card?code={ref_code}&amount={amt}&name={ref_name}&format=story"

    lines = [
        "💰 *₹%d వచ్చింది!*" % amt,
        "మీ friend %s ₹%s pay చేశారు — commission మీ referral wallet లో credit అయ్యింది ✅." % (
            _name_of(referee), result.get("plan_amount", "")),
        "",
        "👛 Wallet balance: ₹%s" % st.get("wallet", 0),
        "🏅 Tier: %s (%d paying referrals)" % (tier, st.get("paid_count", 0)),
    ]
    if milestone:
        _bits = []
        if milestone.get("cash"):
            _bits.append("₹%s wallet" % milestone["cash"])
        if milestone.get("credits"):
            _bits.append("%s credits" % milestone["credits"])
        lines.append("🎁 %s — %s" % (milestone.get("title", "Milestone bonus"), " + ".join(_bits) or "bonus credited"))
    nxt = next_milestone(st.get("paid_count", 0))
    if nxt:
        lines.append("➡️ ఇంకా %d paying referrals → %s" % (nxt["need"], nxt["title"]))
    lines.append("")
    lines.append("🖼️ *మీ WhatsApp Status Earnings Card (1-Click Download/Share):*")
    lines.append(card_url)
    lines.append("✨ దీన్ని మీ WhatsApp Status లో పెడితే మీ స్నేహితులు చూసి చేరతారు — ప్రతి ఒక్కరికీ ₹50 గ్యారెంటీ! 🚀")
    lines.append("")
    lines.append("🏦 Payout ₹100 నుంచి (UPI లో తక్షణమే) — %s/referral లో request పెట్టండి" % site)
    lines.append("— మన వివాహ TS-AP Matrimony")
    return "\n".join(lines)


def referee_welcome_text(referee, referrer):
    """Referral తో వచ్చిన కొత్త user కి (నమస్తే message కి add-on line)."""
    return ("🤝 మీ friend %s గారు referral code తో వచ్చారు — మీకు *+1 FREE credit* bonus! "
            "Total %s credits ready. మీ సొంత code: %s (friend pay చేస్తే మీకు ₹50)"
            % (_name_of(referrer, "Friend"), referee.get("credits", 3), _code_of(referee)))

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
