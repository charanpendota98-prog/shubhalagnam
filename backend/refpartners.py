"""
🤝🌊 WAVE 19 — REFERRAL PARTNERS (agents/brokers with own ID + link + sheet)
===============================================================================
Website → Refer → profile create (name, phone, PhonePe number, address, state, district)
 → ID generate (ex: charan108) + link (/r/charan108 — short, click-tracked)
 → link tho open chesthe register daggara referral code AUTO-FILL (existing ?ref= flow)
 → one-time ₹50 reward only on the referee's first qualifying paid S_99/S_199/S_299/S_499 consumer plan (₹99 minimum); wallet + reviewed payouts
 → anni data manaki: JSON + **referral_partners.csv SHEET** + admin report.

Partner dict = referrer-compatible (referral_code/stats/wallet) → find_referrer/
attach_referral/process_referral_payment anni automatic ga pani chestayi.
"""
from __future__ import annotations
from atomic_store import atomic_json_dump

import csv
import json
import os
import random
import re
from datetime import datetime
from typing import Any, Dict, List, Optional

BASE = os.path.dirname(os.path.abspath(__file__))
JSON_FILE = os.environ.get("MANA_VIVAHA_REF_PARTNERS_FILE", os.path.join(BASE, "refpartners19.json"))
CSV_FILE = os.environ.get("MANA_VIVAHA_REF_PARTNERS_CSV", os.path.join(BASE, "referral_partners.csv"))
CSV_HEADER = ["partner_id", "name", "phone", "phonepe", "address", "state", "district",
              "link", "created_at", "registrations", "paid_count", "wallet", "paid_out"]

PARTNERS: List[Dict[str, Any]] = []
_STATES = {"TS", "AP", "KA", "MH", "Other"}


def _now() -> str:
    return datetime.utcnow().isoformat()


def _load() -> None:
    global PARTNERS
    try:
        if os.path.exists(JSON_FILE):
            PARTNERS = json.load(open(JSON_FILE, encoding="utf-8")) or []
    except Exception:
        PARTNERS = []


def _save() -> bool:
    try:
        atomic_json_dump(JSON_FILE, PARTNERS, ensure_ascii=False, indent=1)
        return True
    except Exception:
        return False


def _csv_append(p: Dict[str, Any]) -> None:
    try:
        new = not os.path.exists(CSV_FILE)
        with open(CSV_FILE, "a", newline="", encoding="utf-8") as f:
            w = csv.writer(f)
            if new:
                w.writerow(CSV_HEADER)
            st = p.get("referral_stats", {})
            w.writerow([p.get("partner_id", ""), p.get("name", ""), p.get("phone", ""),
                        p.get("phonepe", ""), p.get("address", ""), p.get("state", ""),
                        p.get("district", ""), p.get("link", ""), p.get("created_at", ""),
                        st.get("registrations", 0), st.get("paid_count", 0),
                        st.get("wallet", 0), st.get("paid_out", 0)])
    except Exception:
        pass


def _gen_id(name: str) -> str:
    """Partner/referral code — name first 3 letters (CAPITAL) + 4 digits — CHA0001, CHA0002… (unique, perugutundi)."""
    base = re.sub(r"[^a-z]", "", (name or "").strip().lower().split()[0] if (name or "").strip() else "ref")[:3]
    base = (base or "REF").upper().ljust(3, "X")
    nums = []
    for p in PARTNERS:
        m = re.fullmatch(r"([A-Z]{3})(\d{2,6})", str(p.get("partner_id", "")))
        if m and m.group(1) == base:
            nums.append(int(m.group(2)))
    n = (max(nums) + 1) if nums else 1
    for _ in range(200):
        pid = f"{base}{n:04d}"
        if not any(p.get("partner_id", "").lower() == pid.lower() for p in PARTNERS):
            return pid
        n += 1
    return f"{base}{random.randint(10000, 99999)}"


def get_partner(pid: str) -> Optional[Dict[str, Any]]:
    p = (pid or "").strip().lower()
    return next((x for x in PARTNERS if str(x.get("partner_id", "")).lower() == p), None)


def find_partner_by_code(code: str) -> Optional[Dict[str, Any]]:
    """referral.find_referrer fallback — partner ID/code/phone tho match.
    WAVE 24 GAP: phone number chepthe kuda attach avvali (verbal share)."""
    if not code:
        return None
    p = get_partner(code)
    if p:
        return p
    digits = "".join(ch for ch in str(code) if ch.isdigit())
    if len(digits) >= 10:
        for x in PARTNERS:
            if "".join(ch for ch in str(x.get("phone", "")) if ch.isdigit()).endswith(digits[-10:]):
                return x
    return None


def register_partner(name: str, phone: str, phonepe: str = "", address: str = "",
                     state: str = "", district: str = "", site: str = "") -> Dict[str, Any]:
    name = re.sub(r"\s+", " ", (name or "").strip())[:60]
    if len(name) < 2:
        return {"success": False, "reason": "bad_name",
                "message_telugu": "⚠️ Name ఇవ్వండి (min 2 letters)"}
    phone = "".join(ch for ch in str(phone or "") if ch.isdigit())
    if len(phone) != 10 or phone[0] not in "6789":
        return {"success": False, "reason": "bad_phone",
                "message_telugu": "⚠️ 10-digit mobile number ఇవ్వండి (6/7/8/9 తో start)"}
    if any(p.get("phone") == phone for p in PARTNERS):
        ex = next(p for p in PARTNERS if p.get("phone") == phone)
        return {"success": True, "already": True, "partner_id": ex["partner_id"],
                "link": ex.get("link", ""),
                "message_telugu": f"ℹ️ ఈ number తో already partner ID ఉంది: {ex['partner_id']}"}
    # Kept as an ignored compatibility parameter; payout details are provided only
    # through the partner's authenticated payout request, never a PhonePe phone field.
    phonepe_d = ""
    state = (state or "").strip()
    if state not in _STATES:
        return {"success": False, "reason": "bad_state",
                "message_telugu": "⚠️ State select చెయ్యండి (TS/AP/KA/MH/Other)"}
    district = re.sub(r"\s+", " ", (district or "").strip())[:40]
    if len(district) < 2:
        return {"success": False, "reason": "bad_district",
                "message_telugu": "⚠️ District select/type చెయ్యండి"}
    pid = _gen_id(name)
    base_url = (site or os.getenv("SITE_URL", "https://manavivaha.in")).rstrip("/")
    p = {"partner_id": pid, "name": name, "full_name": name, "phone": phone,
         "phonepe": phonepe_d, "address": (address or "").strip()[:200],
         "state": state, "district": district,
         "referral_code": pid, "link": f"{base_url}/r/{pid}",
         "created_at": _now(), "clicks": 0, "wallet": 0,
         "referral_stats": {"clicks": 0, "registrations": 0, "total": 0, "paid_count": 0,
                            "wallet": 0, "lifetime_earned": 0, "pending_payout": 0,
                            "paid_out": 0, "ledger": [], "flags": []}}
    PARTNERS.append(p)
    if not _save():
        PARTNERS.remove(p)
        return {"success": False, "reason": "persistence_failed",
                "message_telugu": "⚠️ Partner registration could not be saved safely. Please try again."}
    _csv_append(p)
    return {"success": True, "partner_id": pid, "link": p["link"],
            "message_telugu": f"🎉 Partner ID ready: {pid}. Referral reward ₹50 ఒక్కసారి మాత్రమే: referred user first qualifying S_99/S_199/S_299/S_499 consumer-plan payment (minimum ₹99) పై. Add-ons, renewals, assisted services, boosts, gifts, complimentary grants, B2B/non-consumer payments అర్హం కావు. Payout admin review లో ఉంటుంది."}


def record_click(pid: str) -> bool:
    p = get_partner(pid)
    if not p:
        return False
    previous = {"clicks": p.get("clicks", 0),
                "stats_clicks": (p.get("referral_stats") or {}).get("clicks", 0)}
    p["clicks"] = int(p.get("clicks", 0)) + 1
    p.setdefault("referral_stats", {})["clicks"] = p["clicks"]
    if not _save():
        p["clicks"] = previous["clicks"]
        p.setdefault("referral_stats", {})["clicks"] = previous["stats_clicks"]
        return False
    return True


def partner_public(pid: str, users: Optional[List[Dict]] = None) -> Dict[str, Any]:
    """Return public referral counts only; names, identities and financials stay private."""
    p = get_partner(pid)
    if not p:
        return {"success": False, "reason": "not_found",
                "message_telugu": "⚠️ Partner ID దొరకలేదు"}
    st = p.get("referral_stats", {})
    ledger = st.get("ledger", []) or []
    from referral import qualifying_commission_entries
    eligible = qualifying_commission_entries(st)
    rewarded_ids = {str(entry.get("from")) for entry in eligible}
    reversed_ids = {str(entry.get("from")) for entry in ledger
                    if entry.get("type") == "commission" and entry.get("reversed") and entry.get("from")}
    activity = []
    if users is not None:
        for user in users:
            if str(user.get("referred_by", "")).lower() == p["partner_id"].lower():
                uid = str(user.get("tsap_id", ""))
                rewarded = uid in rewarded_ids
                # This unauthenticated activity feed is anonymous: no name, phone,
                # TSAP ID, exact registration date, or per-referral cash amount.
                activity.append({"join_no": len(activity) + 1,
                                 "paid": rewarded,
                                 "reward_reversed": uid in reversed_ids and not rewarded})
    return {"success": True, "partner_id": p["partner_id"],
            "link": p.get("link", ""), "clicks": p.get("clicks", 0),
            "registrations": st.get("registrations", 0),
            "paid_count": len(rewarded_ids), "joins": activity[-50:]}


def partner_private(pid: str, users: Optional[List[Dict]] = None) -> Dict[str, Any]:
    """Financial dashboard; callers must authenticate the partner before using this."""
    public = partner_public(pid, users)
    if not public.get("success"):
        return public
    p = get_partner(pid)
    st = p.get("referral_stats", {})
    from referral import FIRST_PAY_COMMISSION
    qualifying_total = int(public.get("paid_count", 0)) * FIRST_PAY_COMMISSION
    public.update({"name": p.get("name", ""),
                   "qualifying_rewards_total": qualifying_total,
                   "wallet": st.get("wallet", 0),
                   "lifetime_earned": qualifying_total,
                   "pending_payout": st.get("pending_payout", 0),
                   "paid_out": st.get("paid_out", 0)})
    return public


def admin_report(users: List[Dict]) -> Dict[str, Any]:
    """Admin: ఎవరికీ entha ravali + evari referral లో ఎవరు (partners + users)."""
    from referral import qualifying_commission_entries, FIRST_PAY_COMMISSION
    rows = []
    for p in PARTNERS:
        st = p.get("referral_stats", {})
        who = [u.get("tsap_id", "") for u in users
               if str(u.get("referred_by", "")).lower() == p["partner_id"].lower()]
        paid_count = len({str(entry.get("from")) for entry in qualifying_commission_entries(st)})
        rows.append({"kind": "partner", "id": p["partner_id"], "name": p["name"],
                     "phone_masked": (p.get("phone", "")[:2] + "••••••" + p.get("phone", "")[-2:]) if p.get("phone") else "",
                     "phonepe": p.get("phonepe", ""), "state": p.get("state", ""),
                     "district": p.get("district", ""), "registrations": st.get("registrations", 0),
                     "paid_count": paid_count, "qualifying_rewards_total": paid_count * FIRST_PAY_COMMISSION,
                     "wallet": st.get("wallet", 0), "lifetime_earned": paid_count * FIRST_PAY_COMMISSION,
                     "pending_payout": st.get("pending_payout", 0), "paid_out": st.get("paid_out", 0),
                     "joined_ids": who})
    for u in (users or []):
        st = u.get("referral_stats") or {}
        if st.get("registrations", 0) or st.get("wallet", 0):
            who = [x.get("tsap_id", "") for x in users
                   if str(x.get("referred_by", "")).upper() == str(u.get("referral_code", "")).upper()]
            paid_count = len({str(entry.get("from")) for entry in qualifying_commission_entries(st)})
            rows.append({"kind": "user", "id": u.get("tsap_id", ""), "name": u.get("full_name", ""),
                         "phone_masked": "", "phonepe": "", "state": u.get("state", ""),
                         "district": u.get("district", ""), "registrations": st.get("registrations", 0),
                         "paid_count": paid_count, "qualifying_rewards_total": paid_count * FIRST_PAY_COMMISSION,
                         "wallet": st.get("wallet", 0), "lifetime_earned": paid_count * FIRST_PAY_COMMISSION,
                         "pending_payout": st.get("pending_payout", 0), "paid_out": st.get("paid_out", 0),
                         "joined_ids": who})
    rows.sort(key=lambda r: (r["lifetime_earned"], r["registrations"]), reverse=True)
    return {"success": True, "count": len(rows), "rows": rows,
            "total_wallet": round(sum(float(r["wallet"] or 0) for r in rows), 2),
            "total_earned": round(sum(float(r["lifetime_earned"] or 0) for r in rows), 2)}


_load()
