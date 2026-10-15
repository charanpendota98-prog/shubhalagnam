"""
TSAP Matrimony — Credits System
Pin-to-Pin Perfect Advanced
FREE 3 requests; paid credits follow the public ₹99/₹199/₹299/₹499 ladder.
"""
from datetime import datetime, timedelta
from typing import Dict

PLANS = {
    # ✅ WAVE-9: amounts/credits **interest.py PLANS tho exact ga same** (single pricing truth).
    # Legacy plan lookup retained for compatibility; paid credits fund interest requests.
    "FREE": {"price": 0, "credits": 3, "daily": 0, "validity_days": 365, "name_telugu": "Free — 3 requests FREE"},
    "S_99": {"price": 99, "credits": 5, "daily": 2, "validity_days": 30, "name_telugu": "సంబంధం — 5 interest requests"},
    "S_199": {"price": 199, "credits": 12, "daily": 3, "validity_days": 45, "name_telugu": "Family — 12 interest requests"},
    "S_299": {"price": 299, "credits": 25, "daily": 5, "validity_days": 60, "name_telugu": "Premium — 25 interest requests"},
    "S_499": {"price": 499, "credits": 50, "daily": 8, "validity_days": 90, "name_telugu": "VIP — 50 interest requests"},
    "BUREAU_999": {"price": 999, "credits": 25, "daily": 5, "validity_days": 30, "name_telugu": "Bureau Starter"},
    "BUREAU_2999": {"price": 2999, "credits": 100, "daily": 10, "validity_days": 30, "name_telugu": "Bureau Pro"},
    # 🕰️ legacy aliases (purathana code/tests break avvakunda) — kotha prices ki map
    "TRIAL_99": {"price": 99, "credits": 5, "daily": 2, "validity_days": 30, "name_telugu": "సంబంధం (legacy TRIAL_99)"},
    "PREMIUM_299": {"price": 299, "credits": 25, "daily": 5, "validity_days": 60, "name_telugu": "Premium (legacy PREMIUM_299)"},
    "VIP_999": {"price": 499, "credits": 50, "daily": 8, "validity_days": 90, "name_telugu": "VIP (legacy VIP_999 → ₹499)"},
}

def get_plan_details(plan_key: str) -> Dict:
    return PLANS.get(str(plan_key or "").strip().upper(), PLANS["FREE"])

def can_view_number(user_credits: int) -> bool:
    """Legacy compatibility helper. Request credits never grant contact access."""
    return False

def deduct_credit(user: Dict) -> Dict:
    """Spend one credit to send an interest request; contact sharing remains consent-based."""
    if user["credits"] <= 0:
        return {"success": False, "message_telugu": "⚠️ Credits అయిపోయాయి. Interest requests కోసం ₹99 plan లో 5 credits ఉన్నాయి.", "credits": 0}
    user["credits"] -= 1
    # log transaction
    return {"success": True, "credits": user["credits"], "message_telugu": f"✅ Interest request credit వాడబడింది. మిగిలిన credits: {user['credits']}"}

def add_credits(user: Dict, plan_key: str, payment_verified: bool = True) -> Dict:
    if not payment_verified:
        return {"success": False, "message": "Payment not verified"}
    code = str(plan_key or "").strip().upper()
    plan = PLANS.get(code)
    if not plan or code == "FREE":
        return {"success": False, "message": "Invalid paid plan code"}
    user["credits"] = int(user.get("credits", 0)) + plan["credits"]
    user["plan"] = code
    # 🌊 WAVE 26 — ISO string (datetime object → JSON save fail + restore TypeError)
    user["plan_expiry"] = (datetime.utcnow() + timedelta(days=plan["validity_days"])).isoformat()
    return {"success": True, "credits": user["credits"], "plan": code, "expiry": user["plan_expiry"], "message_telugu": f"🎉 {plan['credits']} credits add అయ్యాయి! Plan: {plan['name_telugu']}"}

def add_referral_bonus(user: Dict, bonus_credits: int = 1) -> Dict:
    user["credits"] += bonus_credits
    return {"success": True, "credits": user["credits"], "message_telugu": f"🎉 Referral bonus! మీకు {bonus_credits} free credits vachayi"}

def add_admin_gift(user: Dict, gift_credits: int = 10) -> Dict:
    user["credits"] += gift_credits
    return {"success": True, "credits": user["credits"],
            "message_telugu": f"🎁 Admin gift: {gift_credits} interest-request credits added. Contact access still requires owner acceptance."}

def is_plan_expired(user: Dict) -> bool:
    exp = user.get("plan_expiry")
    if not exp:
        return False
    try:
        exp_dt = exp if isinstance(exp, datetime) else datetime.fromisoformat(str(exp)[:19])
        return datetime.utcnow() > exp_dt
    except Exception:
        return False

def get_daily_quota(plan_key: str) -> int:
    return get_plan_details(plan_key).get("daily", 0)

# ID Search — always allowed even if credits 0, but number needs credit
def can_search_id(user: Dict, search_id: str) -> Dict:
    """ID search is open; credits pay for requests, not contact disclosure."""
    return {
        "can_view_profile": True,
        "can_view_number": False,
        "is_photo_blur": user.get("plan", "FREE") == "FREE" and not user.get("is_paid", False),
        "message": "Contact details require an accepted interest; credits cannot bypass consent."
    }
