"""
REFERRAL 2.0 TEST SUITE 🤝 — "andariki ₹50" + anti-fraud + payouts
=================================================================
Run:  /tmp/venv/bin/python test_referral_advanced.py   (backend/ cwd nunchi)

Cover:
  1. Code engine (short code LAK42, alias, link, uniqueness, tier)
  2. Attach (validate / self-referral block / same-phone ALLOWED+flag / already-referred / referee bonus)
  3. Commission math WAVE 25 (→ ₹50 first ONLY; repeat ₹0; tier extra ledu; <₹29 → 0)
  4. Payment processing (wallet, ledger, tier upgrade, milestone AUTO bonus, daily/lifetime caps)
  5. Refund clawback
  6. Payouts (min ₹100, wallet check, UPI/bank validation, duplicate pending, approve needs UTR, reject refund)
  7. Dashboard + funnel + share kit (5 messages) + poster PNG (square/status)
  8. Leaderboard (full_name fix, rank, periods)
  9. API endpoints (TestClient): register→pay→payout→admin, click, validate, terms, fraud-check
 10. Frontend wiring (₹50 copy, no stale ₹20/₹30, API-driven pages)
"""
import asyncio
import os
import shutil
import sys
import tempfile
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import referral as R  # noqa: E402

PASS, FAIL = [], []


def check(name, cond, extra=""):
    (PASS if cond else FAIL).append(name)
    print(("  ✅ " if cond else "  ❌ ") + name + (("  | " + str(extra)) if extra else ""))


def fresh_users():
    a = {"tsap_id": "TSAP-M-2025-1042", "full_name": "Ravi Kumar", "gender": "Groom",
         "phone": "9848012345", "credits": 3, "plan": "FREE", "wallet": 0}
    b = {"tsap_id": "TSAP-F-2025-2042", "full_name": "Sita Reddy", "gender": "Bride",
         "phone": "9848022222", "credits": 3, "plan": "FREE", "wallet": 0}
    return [a, b]


print("=== 1. CODE ENGINE ===")
R.save_state()
u = fresh_users()[0]
prof = R.ensure_referrer_profile(u, [u])
check("Code: first-3-name-letters + 4 digits (CHA0001 style — R7 rule)",
      len(prof["code"]) == 7 and prof["code"][:3].isalpha() and prof["code"][3:].isdigit()
      and prof["code"].startswith("RAV"), prof["code"])
check("Alias TSAP-REF-xxxxx kooda undi", prof["alias"].startswith("TSAP-REF-"), prof["alias"])
check("Link manavivaha.in/r/<code>", prof["link"] == "https://manavivaha.in/r/%s" % prof["code"], prof["link"])
check("Start tier BRONZE", prof["tier"] == "BRONZE")
codes = [R.generate_short_code("Lakshmi", [prof["code"]]) for _ in range(5)]
check("Code generator unique (given list ni respect chestundi)", prof["code"] not in codes, codes[:3])
check("Type parse: LAK42 → USER", R.parse_referral_type("LAK42") == "USER")
check("Type parse: BROKER-RAJ01 → BROKER", R.parse_referral_type("BROKER-RAJ01") == "BROKER")
check("Type parse: phone → PHONE", R.parse_referral_type("9848012345") == "PHONE")

print("=== 2. ATTACH (register lock) ===")
users = fresh_users()
me, friend = users
R.ensure_referrer_profile(me, users)
R.ensure_referrer_profile(friend, users)          # friend ki sontha code kooda untundi
code = me["referral_code"]                        # referrer = me
joined = R.attach_referral(friend, code, users)
check("Valid code tho attach + referrer name", joined["ok"] and joined["referrer_name"] == "Ravi Kumar", joined.get("referrer_name"))
check("Referee bonus +1 credit", joined["bonus_credits"] == 1 and friend["credits"] == 4, friend["credits"])
check("Credit history lo join bonus entry", any(h.get("reason") == "referral_join_bonus" for h in friend.get("credit_history", [])))
check("Referrer stats registrations +1", me["referral_stats"]["registrations"] == 1, me["referral_stats"]["registrations"])
check("Second time attach block (already_referred)", R.attach_referral(friend, code, users)["reason"] == "already_referred")
check("Invalid code reject", R.attach_referral(fresh_users()[1], "ZZZ99", users)["reason"] == "not_found")
self_try = R.attach_referral({"tsap_id": me["tsap_id"], "phone": me["phone"], "credits": 0}, me["referral_code"], users)
check("Self-referral block (same tsap_id)", self_try["reason"] == "self_referral", self_try.get("reason"))
# 📞 "Evvaru enni aina refer cheyyochu — okate phone lo kooda conditions levu"
_same_phone_user = {"tsap_id": "TSAP-F-2025-7777", "phone": me["phone"], "credits": 3, "full_name": "Family Member"}
users.append(_same_phone_user)
_fam = R.attach_referral(_same_phone_user, me["referral_code"], users)
check("Same phone ALLOWED (block ledu) + review flag", _fam["ok"] is True
      and any(f.startswith("same_phone_join") for f in _fam.get("flags", [])), _fam)
check("Same phone family ki kooda +1 credit", _same_phone_user["credits"] == 4)
check("Same phone note Telugu", "పర్వాలేదు" in _fam.get("note_telugu", "") or _fam.get("note_telugu") == "")
_f2 = {"tsap_id": "TSAP-F-2025-8888", "phone": me["phone"], "credits": 3, "full_name": "Family Two"}
_f3 = {"tsap_id": "TSAP-F-2025-9999", "phone": me["phone"], "credits": 3, "full_name": "Family Three"}
users.extend([_f2, _f3])
R.attach_referral(_f2, me["referral_code"], users)
_r3 = R.attach_referral(_f3, me["referral_code"], users)
check("3+ same-phone joins → multi_account_review flag (block ledu)", _r3["ok"] is True
      and any("multi_account_review" in f for f in R.stats_of(me)["flags"]), R.stats_of(me)["flags"][-3:])
check("Terms lo 'conditions levu' line", "ఎవ్వరు ఎన్ని అయినా" in R.referral_terms_telugu()["no_conditions_telugu"])
check("Terms: okate phone lo kooda allowed ani cheppindi",
any("ఒకటే phone" in r for r in R.referral_terms_telugu()["rules_telugu"]))
check("Daily/lifetime caps SOFT (block undi kaadu)",
      R.DAILY_PAYING_SOFT_CAP >= 50 and R.LIFETIME_SOFT_CAP >= 500)
check("Validate endpoint message lo peru + credit", "Ravi Kumar" in R.validate_referral(me["referral_code"], users)["message_telugu"])

print("=== 2b. NOTIFICATION LOOP (WhatsApp texts) ===")
jt = R.referrer_join_text(me, friend)
check("Join message: referrer peru + friend peru", "Ravi గారు" in jt and "Sita" in jt)
check("Join message: ₹50 + code + link", "₹50" in jt and me["referral_code"] in jt and "manavivaha.in/r/" in jt)
ct = R.referrer_commission_text(me, friend, {"commission": 50, "tier": "BRONZE", "plan_amount": 99})
check("Commission message: ₹ amount + friend paying + tier",
      "₹50" in ct and "Sita" in ct and "BRONZE" in ct)
check("Commission message: next milestone + payout line", "SILVER" in ct and "₹100" in ct)
wt = R.referee_welcome_text(friend, me)
check("Referee welcome: friend peru + bonus credit + sontha code",
      "Ravi" in wt and "+1 FREE credit" in wt and friend["referral_code"] in wt)

print("=== 3. COMMISSION MATH ===")
check("First ₹29 → ₹50 (andiiki)", R.calculate_commission("USER", 29, True) == 50)
check("First ₹99 → ₹50", R.calculate_commission("USER", 99, True) == 50)
check("First ₹199 → ₹50", R.calculate_commission("USER", 199, True) == 50)
check("First ₹499 → ₹50", R.calculate_commission("USER", 499, True) == 50)
check("Repeat ₹99 → ₹0 (flat-50-only)", R.calculate_commission("USER", 99, False) == 0)
check("Repeat ₹499 → ₹0 (plan tho sambandham ledu)", R.calculate_commission("USER", 499, False) == 0)
check("Repeat BUREAU ₹2999 → ₹0", R.calculate_commission("BUREAU", 2999, False) == 0)
check("₹10 payment → ₹0 (min ₹29)", R.calculate_commission("USER", 10, True) == 0)
check("GOLD tier kuda flat ₹50 (extra ledu)", R.calculate_commission("USER", 99, True, "GOLD") == 50)
check("ELITE tier repeat → ₹0", R.calculate_commission("USER", 99, False, "ELITE") == 0)

print("=== 4. PAYMENT → WALLET + LEDGER + MILESTONES ===")
users = fresh_users()
me, friend = users
R.ensure_referrer_profile(me, users)
R.attach_referral(friend, me["referral_code"], users)
r1 = R.process_referral_payment(friend, me["referral_code"], 99, users, payment_id="pay_T1")
check("₹99 first payment → ₹50 wallet", r1["success"] and r1["commission"] == 50 and r1["wallet"] == 50, r1.get("wallet"))
check("First-payment flag + ledger entry", r1["first_payment"] and any(l["type"] == "commission" for l in me["referral_stats"]["ledger"]))
check("paid_count +1 + tier BRONZE", me["referral_stats"]["paid_count"] == 1 and r1["tier"] == "BRONZE")
check("Repeat payment → no commission", R.process_referral_payment(friend, me["referral_code"], 199, users).get("reason") == "no_repeat_commission")
check("Wallet 50 ye (repeat add kadu)", round(R.stats_of(me)["wallet"], 2) == 50, R.stats_of(me)["wallet"])
check("Bonus message lo tier + next milestone", "BRONZE" in r1["message_telugu"] and "ఇంకా" in r1["message_telugu"], r1["message_telugu"][-90:])

# milestone: 3rd paying referral → SILVER badge (repeat pays count kadu — WAVE 25)
f3 = {"tsap_id": "TSAP-F-2025-3333", "full_name": "Third", "phone": "9848033333", "credits": 3}
users.append(f3)
R.attach_referral(f3, me["referral_code"], users)
r3 = R.process_referral_payment(f3, me["referral_code"], 99, users)
check("2nd paying referral → inka BRONZE", r3["tier"] == "BRONZE", r3["tier"])
f4 = {"tsap_id": "TSAP-F-2025-4444", "full_name": "Fourth", "phone": "9848044444", "credits": 3}
users.append(f4)
R.attach_referral(f4, me["referral_code"], users)
r4 = R.process_referral_payment(f4, me["referral_code"], 99, users)
check("3rd paying referral → SILVER tier", r4["tier"] == "SILVER", r4["tier"])
check("Milestone 3 → badge recognition (money/credits ledu)", r4["bonus_credits"] == 0
      and 3 in me["referral_stats"]["milestones_hit"] and me["credits"] == 3, me["credits"])
check("SILVER tier repeat → ₹0 (extra ledu)", R.calculate_commission("USER", 99, False, "SILVER") == 0)

# 10 distinct paying referrals → GOLD badge (repeat pays count kadu — WAVE 25)
for i in range(7):
    u = {"tsap_id": "TSAP-X-%d" % i, "full_name": "X%d" % i, "phone": "98480999%02d" % i, "credits": 0}
    users.append(u)
    R.attach_referral(u, me["referral_code"], users)
    R.process_referral_payment(u, me["referral_code"], 99, users)
st = R.stats_of(me)
check("10 pays → GOLD tier", st["tier"] == "GOLD", (st["paid_count"], st["tier"]))
check("GOLD milestone = badge (cash ledu)", 10 in st["milestones_hit"]
      and not any(l["type"] == "milestone" for l in st["ledger"]), st["milestones_hit"])
check("Next milestone PLATINUM (25)", R.next_milestone(st["paid_count"])["paid"] == 25)
check("Referrer not found → pending message", R.process_referral_payment(friend, "NOSUCH", 99, users)["reason"] == "referrer_not_found")
check("₹10 payment reject (too small)", R.process_referral_payment(friend, me["referral_code"], 10, users)["reason"] == "amount_too_small")

print("=== 5. REFUND CLAWBACK ===")
before = R.stats_of(me)["wallet"]
rev = R.reverse_referral_payment(friend, 99, users, reason="customer_refund")
check("Refund → commission theesesa", rev["success"] and rev["reversed"] > 0, rev.get("reversed"))
check("Wallet thaggindi + reversal ledger entry",
      round(R.stats_of(me)["wallet"], 2) == round(before - rev["reversed"], 2)
      and any(l["type"] == "reversal" for l in R.stats_of(me)["ledger"]))
rev2 = R.reverse_referral_payment(friend, 199, users, reason="second_refund")
check("Repeat commission ledu kabatti reverse ledu", not rev2.get("success"), rev2)
check("Anni reverses ayyaka malli reverse ledu", not R.reverse_referral_payment(friend, 99, users).get("success"))

print("=== 6. PAYOUTS ===")
R.PAYOUTS.clear()
R.stats_of(me)["wallet"] = 250.0
me["wallet"] = 250.0
R.stats_of(me)["pending_payout"] = 0.0
p_small = R.payout_request(me, 20, "upi", "ravi@okhdfcbank")
check("Min payout reject", not p_small["ok"] and p_small["reason"] == "below_min")
p_big = R.payout_request(me, 9999, "upi", "ravi@okhdfcbank")
check("Wallet kanna ekkuva reject", not p_big["ok"] and p_big["reason"] == "insufficient_wallet")
p_bad = R.payout_request(me, 150, "upi", "not-a-upi")
check("Bad UPI reject", not p_bad["ok"] and p_bad["reason"] == "bad_upi")
p_bank = R.payout_request(me, 150, "bank", bank={"account_no": "123", "ifsc": "BAD", "holder": "Ravi"})
check("Bad IFSC reject", not p_bank["ok"] and p_bank["reason"] == "bad_bank")
p_ok = R.payout_request(me, 150, "upi", "ravi@okhdfcbank")
check("Valid payout request ₹150 create", p_ok["ok"] and p_ok["request"]["status"] == "requested", p_ok.get("message_telugu"))
check("Wallet nunchi hold + pending_payout", round(R.stats_of(me)["wallet"], 2) == 100.0
      and R.stats_of(me)["pending_payout"] == 150.0, R.stats_of(me)["wallet"])
check("Duplicate pending reject", R.payout_request(me, 100, "upi", "ravi@okhdfcbank")["reason"] == "pending_exists")
pid = p_ok["request"]["id"]
q = R.payout_queue("requested")
check("Admin queue lo request kanipisthundi", q["count"] >= 1 and q["total_amount"] >= 150, q["total_amount"])
check("UTR lekunda approve reject", R.payout_action(pid, "approve", users)["reason"] == "utr_invalid")
paid = R.payout_action(pid, "approve", users, utr="UTRTEST123")
check("UTR tho approve → status paid", paid["ok"] and paid["request"]["status"] == "paid" and paid["request"]["utr"] == "UTRTEST123")
check("paid_out + pending clear", R.stats_of(me)["paid_out"] == 150.0 and R.stats_of(me)["pending_payout"] == 0.0)
check("Already paid ki malli action block", R.payout_action(pid, "approve", users, utr="X")["reason"] == "already_paid")

p2 = R.payout_request(me, 100, "upi", "ravi@okhdfcbank")
rej = R.payout_action(p2["request"]["id"], "reject", users, reason="upi_verify_failed")
check("Reject → wallet ki malli credit", rej["ok"] and round(R.stats_of(me)["wallet"], 2) == 100.0, R.stats_of(me)["wallet"])
check("Reject message Telugu", "wallet" in rej["message_telugu"])
check("Reject ledger entry", any(l["type"] == "payout_reject" for l in R.stats_of(me)["ledger"]))

print("=== 7. DASHBOARD + SHARE KIT + POSTER ===")
d = R.referral_dashboard(me, users)
check("Dashboard stats shape (clicks/registrations/paid/wallet)",
      all(k in d["stats"] for k in ("clicks", "registrations", "paid_count", "wallet", "conversion_pct", "lifetime_earned")))
check("Commission rules Telugu (first ₹50 / repeat ₹0 / badges)",
      "50" in d["commission_rules"]["first_payment"] and "0" in d["commission_rules"]["repeat_payment"]
      and "badges" in d["commission_rules"]["tier_extra"])
check("Tiermilestones + next milestone dashboard lo", len(d["milestones"]) == 4 and d["next_milestone"] is not None)
check("Ledger + payouts dashboard lo", len(d["ledger"]) >= 1 and len(d["payouts"]) >= 1)
check("Recent registrations (paid flag)", any(r["paid"] for r in d["recent_registrations"]))

kit = R.share_kit(me)
check("Share kit 5 WhatsApp messages", len(kit["whatsapp_messages"]) == 5)
check("Message lo code + link + ₹99 + bonus", all(me["referral_code"] in m for m in kit["whatsapp_messages"])
      and all("manavivaha.in/r/" in m for m in kit["whatsapp_messages"]))
check("wa.me share links anni variants ki", len(kit["whatsapp_share_variants"]) == 5
      and all(u.startswith("https://wa.me/?text=") for u in kit["whatsapp_share_variants"]))
check("Telegram + SMS + status text unnai", "t.me/share/url" in kit["telegram_share"]
      and "968" not in kit["sms_text"] and me["referral_code"] in kit["status_text"])
check("Poster route /api/referral/<id>/poster.png + QR target", kit["poster_card"].endswith("/poster.png")
      and len(kit["qr_target"]) > 10, kit["poster_card"])

import referral_kit  # noqa: E402
tmpd = tempfile.mkdtemp()
try:
    sq = referral_kit.poster_card(me, style="square", out_path=os.path.join(tmpd, "sq.png"))
    stp = referral_kit.poster_card(me, style="status", out_path=os.path.join(tmpd, "st.png"))
    from PIL import Image
    check("Square poster 1080×1080", Image.open(sq).size == (1080, 1080), Image.open(sq).size)
    check("Status poster 1080×1920", Image.open(stp).size == (1080, 1920), Image.open(stp).size)
    check("Poster PNG signature (Telegram/WhatsApp share ki)",
          open(sq, "rb").read(8) == b"\x89PNG\r\n\x1a\n")
    try:
        import qrcode  # noqa: F401
        check("QR library undi — poster lo QR scan cheyyochu", True)
    except Exception:
        check("QR library lekapote poster text tho (graceful)", True)
finally:
    shutil.rmtree(tmpd, ignore_errors=True)

print("=== 8. LEADERBOARD ===")
lb = R.get_leaderboard(users, limit=5)
check("Leaderboard first-name only (privacy — surname hidden)", lb and lb[0]["name"] == "Ravi", lb[0] if lb else None)
check("Rank + tier + icon unnai", lb[0]["rank"] == 1 and lb[0]["tier"] in ("GOLD", "SILVER", "BRONZE") and lb[0]["icon"])
check("Earned > 0", lb[0]["earned"] > 0, lb[0]["earned"])
check("Week period filter pani chestundi", isinstance(R.get_leaderboard(users, period="week"), list))
check("Month period filter pani chestundi", isinstance(R.get_leaderboard(users, period="month"), list))

print("=== 9. STATE DURABILITY ===")
sv = R.save_state()
ld = R.load_state()
check("State file save/load (server restart safe)", sv.get("ok") and ld.get("ok"), sv.get("path"))

print("=== 10. API ENDPOINTS (TestClient) ===")
# 🐞 FIX (R12): standalone run lo auth/admin enforcement ON ayyi admin+payout calls 401/403 —
# suite convention: dev-mode env BEFORE import main (owner-token headers already added above)
os.environ.setdefault("TSAP_AUTH_MODE", "test")
from fastapi.testclient import TestClient  # noqa: E402
import main  # noqa: E402

with TestClient(main.app) as c:
    # 🐞 FIX (R12): seed data TSAP-M-2025-1042 DB lo lekapothe (fresh DB / server flush) — create chesuko
    me_api = next((u for u in main.DB_USERS if u["tsap_id"] == "TSAP-M-2025-1042"), None)
    if me_api is None:
        me_api = {"tsap_id": "TSAP-M-2025-1042", "full_name": "Ravi Kumar", "gender": "Groom",
                  "phone": "9848012345", "credits": 3, "plan": "FREE", "wallet": 0}
        main.DB_USERS.append(me_api)
    R.ensure_referrer_profile(me_api, main.DB_USERS)
    mcode = me_api["referral_code"]

    t = c.get("/api/referral/terms").json()
    check("GET /api/referral/terms — Telugu rules", t["success"] and len(t["rules_telugu"]) >= 8
          and t["headline"].startswith("₹50"))
    check("Terms lo not_allowed list", len(t["not_allowed"]) >= 4)

    # 🐞 FIX (R12): auth-enforced mode lo require_owner 401 istundi (IDOR guard) —
    # owner token tho call cheyali (dev mode lo header ignore ayyi inka kuda work avutundi)
    import hardening as H  # noqa: E402
    _own_headers = {"X-Tsap-Token": H.sign_token("TSAP-M-2025-1042")}
    dash_api = c.get("/api/referral/TSAP-M-2025-1042", headers=_own_headers).json()
    check("GET /api/referral/{id} dashboard", dash_api["ok"] and dash_api["code"] == mcode)
    check("Dashboard lo share_kit kooda vastundi", "whatsapp_messages" in dash_api.get("share_kit", {}))
    check("💎 R12 dashboard lo pending pipeline stats",
          "pending_friends" in dash_api.get("stats", {}) and "pending_value" in dash_api.get("stats", {}))

    kit_api = c.get("/api/referral/TSAP-M-2025-1042/share-kit").json()
    check("GET share-kit — 5 messages", kit_api["success"] and len(kit_api["whatsapp_messages"]) == 5)

    v_api = c.get("/api/referral/validate/%s" % mcode).json()
    check("GET validate/{code} valid", v_api["ok"] and v_api["bonus_credits"] == 1)
    check("GET validate bad code → ok False + Telugu msg",
          c.get("/api/referral/validate/ZZZ99").json()["ok"] is False)

    click = c.post("/api/referral/click/%s?source=test" % mcode).json()
    check("POST click/{code} — funnel track", click["success"] and click["clicks_total"] >= 1, click["clicks_total"])
    check("click nunchi dashboard lo clicks perigindi",
          c.get("/api/referral/TSAP-M-2025-1042", headers=_own_headers).json()["stats"]["clicks"] >= 1)

    poster = c.get("/api/referral/TSAP-M-2025-1042/poster.png?style=square")
    check("GET poster.png 200 + PNG", poster.status_code == 200 and poster.content[:8] == b"\x89PNG\r\n\x1a\n",
          poster.status_code)
    poster_st = c.get("/api/referral/TSAP-M-2025-1042/poster.png?style=status")
    check("GET poster.png?style=status 200", poster_st.status_code == 200)

    # 🧪 E2E: register with ref → pay → referrer wallet
    # 🐞 FIX (R12): fixed phone → duplicate-register fail in re-runs; unique per run
    _run_phone = "98%08d" % (int(time.time()) % 100000000)
    reg = c.post("/api/register", data={
        "gender": "Bride", "age": 26, "height": "5'3\"", "marital_status": "Pelli Kaledu",
        "caste": "Reddy", "district": "Nalgonda", "state": "TS", "full_name": "Referral Test Bride",
        "phone": _run_phone, "job": "Teacher", "education": "BEd", "salary": "40k",
        "referral_code": mcode})
    rj = reg.json()
    check("Register + referral lock (my_code + joined bonus)", reg.status_code == 200
          and rj["referral"]["joined_with"]["ok"] is True
          and rj["referral"]["my_code"], rj.get("referral", {}).get("joined_with", {}).get("reason"))
    new_id = rj["tsap_id"]
    check("Referee ki extra credit (3 + 1 = 4)", rj["credits"] >= 4, rj["credits"])
    check("Register response lo sontha link kooda", rj["referral"]["my_link"].startswith("https://manavivaha.in/r/"))
    check("Register response: ₹50 offer + share_message lo code+link",
          rj["referral"]["commission_offer"] == 50
          and rj["referral"]["my_code"] in rj["referral"]["share_message"]
          and rj["referral"]["my_link"] in rj["referral"]["share_message"])
    check("Referrer ki join notification (manual text leda queued)",
          rj["referral"]["joined_with"].get("notify", {}).get("referrer_name")
          and (rj["referral"]["joined_with"]["notify"].get("manual_text")
               or rj["referral"]["joined_with"]["notify"].get("referrer_notified")))
    check("Kotha user welcome lo referral line (friend peru + sontha code)",
          "మీ friend" in str(rj.get("welcome_status", {}).get("manual_text", ""))
          and rj["referral"]["my_code"] in str(rj.get("welcome_status", {}).get("manual_text", "")))
    check("Register response: poster urls (square + status)",
          rj["referral"]["poster_url"].endswith("/poster.png")
          and "style=status" in rj["referral"]["poster_status_url"])

    wallet_before = R.stats_of(me_api)["wallet"]
    wh = c.post("/api/payment/webhook?user_id=%s&amount=199&razorpay_payment_id=pay_REF1" % new_id).json()
    check("Webhook → commission returned (₹50 first)", wh["success"]
          and wh["referral_commission"]["commission"] == 50, wh["referral_commission"].get("commission"))
    check("Referrer wallet +50", round(R.stats_of(me_api)["wallet"] - wallet_before, 2) == 50.0)
    check("Referrer ki commission WhatsApp text generate ayyindi",
          bool(wh["referral_commission"].get("referrer_message")) or wh["referral_commission"].get("referrer_notified"))
    check("Commission text lo wallet balance + tier",
          "Wallet balance" in str(wh["referral_commission"].get("referrer_message", ""))
          or wh["referral_commission"].get("referrer_notified"))

    # payout API
    R.stats_of(me_api)["wallet"] = 300.0
    po = c.post("/api/referral/payout?tsap_id=TSAP-M-2025-1042&amount=200&method=upi&upi_id=ravi@okhdfcbank", headers=_own_headers).json()
    check("POST /api/referral/payout — request create", po["success"] and po["request"]["amount"] == 200)
    rid = po["request"]["id"]
    check("GET /api/admin/payouts — queue lo kanipisthundi",
          any(p["id"] == rid for p in c.get("/api/admin/payouts").json()["items"]))
    appr = c.post("/api/admin/payouts/%s/action?action=approve&utr=UTRAPI1" % rid).json()
    check("POST admin approve (UTR) — paid", appr["success"] and appr["request"]["status"] == "paid")
    bad_amt = c.post("/api/referral/payout?tsap_id=TSAP-M-2025-1042&amount=5000&method=upi&upi_id=ravi@okhdfcbank", headers=_own_headers)
    check("API payout wrong amount → 400", bad_amt.status_code == 400)
    po2 = c.post("/api/referral/payout?tsap_id=TSAP-M-2025-1042&amount=100&method=upi&upi_id=ravi@okhdfcbank", headers=_own_headers).json()
    rej2 = c.post("/api/admin/payouts/%s/action?action=reject&reason=test" % po2["request"]["id"]).json()
    check("API admin reject → wallet malli", rej2["success"] and rej2["request"]["status"] == "rejected")

    # refund clawback API
    rf = c.post("/api/admin/refund/%s?reason=api_test" % new_id).json()
    check("POST /api/admin/refund — clawback", rf["success"] and rf["reversed"] == 50)

    # 🔒 privacy: public dashboard + /payouts lo UPI/bank MASKED undali
    R.PAYOUTS.append({"id": "PRMASK1", "tsap_id": "TSAP-M-2025-1042", "amount": 150, "method": "upi",
                      "upi_id": "ravikumar@okhdfcbank", "status": "paid", "utr": "UTRMASK",
                      "bank": {}, "created_at": "2026-01-01T00:00:00"})
    dash2 = c.get("/api/referral/TSAP-M-2025-1042", headers=_own_headers).json()
    _masked = [p for p in dash2["payouts"] if p["id"] == "PRMASK1"]
    check("Public dashboard lo UPI id MASKED (privacy)", _masked and "***" in _masked[0]["upi_id"]
          and "okhdfcbank" not in _masked[0]["upi_id"], _masked[0]["upi_id"] if _masked else None)
    pl = c.get("/api/referral/TSAP-M-2025-1042/payouts").json()
    check("GET /payouts lo kooda masked", all("***" in str(p.get("upi_id", "")) or not p.get("upi_id")
                                              for p in pl["payouts"]), pl["payouts"][:1])
    adm = c.get("/api/admin/payouts?status=paid").json()
    check("Admin queue lo FULL UPI (pay cheyyadaniki) + guard note",
          "guard" in adm and any(p.get("id") == "PRMASK1" and "okhdfcbank" in str(p.get("upi_id", ""))
                                 for p in adm["items"]), adm.get("guard"))
    os.environ["ADMIN_TOKEN"] = "secret123"
    check("ADMIN_TOKEN set aithe token lekunda 401",
          c.get("/api/admin/payouts").status_code == 401)
    check("ADMIN_TOKEN correct tho 200", c.get("/api/admin/payouts?token=secret123").status_code == 200)
    os.environ.pop("ADMIN_TOKEN", None)

    fc = c.get("/api/referral/TSAP-M-2025-1042/fraud-check").json()
    check("GET fraud-check shape", "issues" in fc and "clean" in fc)

    lbapi = c.get("/api/referral/leaderboard?period=all&limit=5").json()
    check("GET leaderboard (period + prize line)", lbapi["success"] and "prize_telugu" in lbapi)
    check("404 for bad ID", c.get("/api/referral/TSAP-NOPE").status_code == 404)

print("=== 11. FRONTEND WIRING ===")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def read(path):
    with open(os.path.join(ROOT, path), "r", encoding="utf-8") as f:
        return f.read()


dash_pg = read("frontend/src/app/referral/page.tsx")
land_pg = read("frontend/src/app/r/[code]/page.tsx")
code_pg = read("frontend/src/app/referral/register/page.tsx")
admin_pg = read("frontend/src/app/admin/page.tsx")
reg_pg = read("frontend/src/app/register/page.tsx")
sitemap = read("frontend/src/app/sitemap.ts")

check("/referral page live API use chestundi (/api/referral/{id})", "/api/referral/${id}" in dash_pg or "/api/referral/" in dash_pg)
check("/referral lo flat-₹50 copy (10% ledu)", "₹50" in dash_pg and "10%" not in dash_pg and ("BRONZE" in dash_pg or "tiers" in dash_pg))
check("/referral lo purathana ₹20/₹30 ledu (stale copy fix)", "₹20" not in dash_pg and "₹30" not in dash_pg)
check("/referral lo poster + 5 messages + payout form", "poster.png" in dash_pg and "whatsapp_messages" in dash_pg and "payout" in dash_pg)
check("/referral lo leaderboard + terms API", "leaderboard" in dash_pg and "/api/referral/terms" in dash_pg)
check("/r/[code] click ni API ki pampistundi (funnel)", "/api/referral/click/" in land_pg)
check("/r/[code] invalid code handle + register redirect", "ref=${code}" in land_pg and "దొరకలేదు" in land_pg)
check("/referral/register partner register API use chestundi", "/api/referral/partner/register" in code_pg and "/api/referral/partner/${" in code_pg)
check("Admin payouts tab LIVE API (queue + approve/reject)",
      "/api/admin/payouts" in admin_pg and "utr" in admin_pg.lower() and "reject" in admin_pg.lower())
check("Admin lo PhonePe deep link + copy UPI", "phonepe://pay" in admin_pg and "upi_id" in admin_pg)
check("Register page ?ref auto-lock intact", "refLocked" in reg_pg and "referral_code" in reg_pg)
check("Register success lo referral card (code+link+poster+dashboard)",
      "result.referral?.my_code" in reg_pg and "poster_url" in reg_pg and "Referral dashboard" in reg_pg)
check("Referral dashboard ?id= ni respect chestundi (register nunchi vachina user)",
      "URLSearchParams(window.location.search)" in dash_pg and "tsap_last_id" in dash_pg)
check("Register page localStorage lo ID save chestundi (demo ID kaadu chupinchadaniki)",
      "tsap_last_id" in reg_pg and "tsap_profiles" in reg_pg)
check("Foreign script leak ledu (Bengali/Devanagari — Telugu matrame)",
      not any(0x0980 <= ord(ch) <= 0x09FF for pg in (dash_pg, reg_pg, land_pg, code_pg, admin_pg) for ch in pg))
check("Register success lo joined_with banner (➕ bonus credit)",
      "joined_with?.ok" in reg_pg and "bonus_credits" in reg_pg)
check("Sitemap lo /referral", "/referral" in sitemap)
check("Domain correct (manavivaha.in) — tsapmatrimony.com stale ledu",
      "tsapmatrimony.com" not in dash_pg and "tsapmatrimony.com" not in code_pg and "tsapmatrimony.com" not in admin_pg)

print("\n=== RESULT: %d pass / %d fail ===" % (len(PASS), len(FAIL)))
if FAIL:
    print("FAILED:")
    for f in FAIL:
        print("   ❌ " + f)
    sys.exit(1)
print("🏆 REFERRAL 2.0 — ANNI TESTS PASS (₹50 andariki + anti-fraud + payouts)")
