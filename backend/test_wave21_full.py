"""
🌊 WAVE 21 TEST SUITE — WALLET BEST + MANUAL PAY-ZERO + SMART LANES
====================================================================
  A. partner payout approve (mundhu broken → fix)
  B. pay-full (UTR must, wallet→0, guards, user+partner)
  C. joins full name + commission (user dash + partner dash)
  D. smart lanes (otp/personal/channels/photo kinds)
  E. frontend static (wallet UI, pay-full button, queue strip, autofill)

Run:  WA_TEST_FAST=1 python3 test_wave21_full.py   (backend/ nunchi)
"""
import os
import sys

os.environ.setdefault("WA_TEST_FAST", "1")
os.environ.setdefault("OTP_DEV_MODE", "true")
os.environ.setdefault("WA_LONG_PAUSE_CHANCE", "0")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from testutil_paths import src_page  # noqa: E402  # App Router page.tsx + page-client.tsx aware

PASS, FAIL, FAILED = 0, 0, []
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def section(t):
    print(f"\n=== {t} ===")


def check(name, cond, extra=None):
    global PASS, FAIL
    if cond:
        PASS += 1
        print(f"  ✅ {name}")
    else:
        FAIL += 1
        FAILED.append(name)
        print(f"  ❌ {name}" + (f"  → {extra}" if extra else ""))


section("A. partner payout approve")
import referral
import refpartners as RP19

_p_snap = list(RP19.PARTNERS)
_po_snap = list(referral.PAYOUTS)
try:
    r = RP19.register_partner(name="Pay Approve", phone="9210000021", state="TS", district="Suryapet")
    pid = r["partner_id"]
    p = RP19.get_partner(pid)
    st = referral.stats_of(p)
    st["wallet"] = 200
    st["lifetime_earned"] = 200
    q = referral.payout_request(p, 100, method="upi", upi_id="pay@okhdfc")
    check("A1 partner request ok", q.get("ok"), q)
    a = referral.payout_action(q["request"]["id"], "approve", [], utr="412121212101")
    check("A2 partner approve ok (fix)", a.get("ok"), a)
    st2 = referral.stats_of(RP19.get_partner(pid))
    check("A3 paid_out moved + wallet kept 100", st2["paid_out"] == 100 and st2["wallet"] == 100, st2)
    check("A4 UTR audit saved", q["request"]["utr"] == "412121212101" and q["request"]["status"] == "paid")
    # user still works
    u = {"tsap_id": "TSAP-M-2021-9", "full_name": "User Pay", "referral_stats": {}}
    referral.stats_of(u)["wallet"] = 150
    q2 = referral.payout_request(u, 150, method="upi", upi_id="userpay@okhdfc")
    a2 = referral.payout_action(q2["request"]["id"], "approve", [u], utr="412121212102")
    check("A5 user approve ok", a2.get("ok") and referral.stats_of(u)["paid_out"] == 150, a2)
    q3 = referral.payout_request(u, 100, method="upi", upi_id="userpay@okhdfc")
    check("A6 insufficient blocked", not q3.get("ok"), q3)

    section("B. pay-full")
    f = referral.pay_wallet_full(pid, [], utr="412121212121")
    check("B1 pay-full ok + wallet 0", f.get("ok") and f.get("wallet") == 0 and f.get("paid") == 100, f)
    check("B2 paid_out total 200", referral.stats_of(RP19.get_partner(pid))["paid_out"] == 200)
    check("B3 payout record paid+UTR", f["request"]["status"] == "paid" and f["request"]["utr"] == "412121212121")
    check("B4 ledger has manual entry", any(l.get("type") == "payout_manual_full"
          for l in referral.stats_of(RP19.get_partner(pid))["ledger"]))
    f2 = referral.pay_wallet_full(pid, [], utr="412121212103")
    check("B5 empty wallet fails", not f2.get("ok") and f2.get("reason") == "wallet_empty", f2)
    f3 = referral.pay_wallet_full("NOPEXX999", [], utr="412121212103")
    check("B6 unknown code fails", not f3.get("ok"), f3)
    u2 = {"tsap_id": "TSAP-F-2021-8", "full_name": "Full User", "referral_stats": {}}
    referral.stats_of(u2)["wallet"] = 120
    f4 = referral.pay_wallet_full("TSAP-F-2021-8", [u2], utr="")
    check("B7 UTR must (no zero without audit)", not f4.get("ok") and f4.get("reason") == "utr_invalid", f4)
    f5 = referral.pay_wallet_full("TSAP-F-2021-8", [u2], utr="412121212105")
    check("B8 user pay-full zeroes wallet", f5.get("ok") and referral.stats_of(u2)["wallet"] == 0, f5)

    section("C. joins name + commission")
    nb = {"tsap_id": "TSAP-F-2021-7", "full_name": "Commission Join", "phone": "9210000023"}
    referral.attach_referral(nb, pid, [])
    referral.process_referral_payment(nb, pid, 99, [], payment_id="pw21c")
    d = RP19.partner_public(pid, [nb])
    j = d["joins"][0]
    check("C1 partner join first-name only (privacy)", j["name"] == "Commission", j)
    check("C2 partner join commission ₹50", j["paid"] and j["commission"] == 50, j)
    uref = {"tsap_id": "TSAP-M-2021-6", "full_name": "Ref Owner", "phone": "9210000024",
            "referral_code": "ROWN21", "referral_stats": {}}
    nb2 = {"tsap_id": "TSAP-F-2021-5", "full_name": "User Join", "phone": "9210000025"}
    referral.attach_referral(nb2, "ROWN21", [uref])
    referral.process_referral_payment(nb2, "ROWN21", 199, [uref, nb2], payment_id="pw21u")
    dash = referral.referral_dashboard(uref, [uref, nb2])
    rr = dash["recent_registrations"][0]
    check("C3 user dash join name+commission", rr["name"] == "User Join" and rr["commission"] == 50
          and rr["paid"] is True, rr)
finally:
    RP19.PARTNERS[:] = _p_snap
    RP19._save()
    referral.PAYOUTS[:] = _po_snap

section("D. smart lanes")
import publisher as PUB

check("D1 otp kind → otp lane", PUB._wa_lane({"kind": "otp"}) == "otp")
check("D2 channel_post → channels", PUB._wa_lane({"kind": "channel_post", "priority": 1}) == "channels")
check("D3 post priority1 → channels", PUB._wa_lane({"kind": "post", "priority": 1}) == "channels")
check("D4 interest kinds → personal", all(
    PUB._wa_lane({"kind": k, "priority": 0}) == "personal"
    for k in ("interest_to_owner", "interest_accepted", "interest_declined")))
check("D5 referral/welcome/vendor → personal", all(
    PUB._wa_lane({"kind": k, "priority": 0}) == "personal"
    for k in ("referral_join", "referral_commission", "namaste_welcome", "vendor_lead", "lead_followup")))
check("D6 saved_search_alert → personal (fix)", PUB._wa_lane({"kind": "saved_search_alert", "priority": 1}) == "personal")
check("D7 photo kinds exist (send-image)", "send-image" in open(
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "publisher.py"), encoding="utf-8").read())

section("E. frontend static")


def read(rel):
    return src_page(os.path.join("frontend", rel))


rp = read("src/app/referral/page.tsx")
check("E1 joins show full name + commission", "r.name" in rp and "r.commission" in rp and "⏳ pay pending" in rp)
pp = read("src/app/referral/register/page.tsx")
check("E2 partner joins name + commission", "j.commission" in pp and "⏳ pending" in pp)
ar = read("src/components/ReferralReport.tsx")
check("E3 admin pay-full button + endpoint", "Pay ₹" in ar and "zero" in ar and "/api/admin/referrals/pay-full" in ar)
wc = read("src/components/WANumbersConsole.tsx")
check("E4 WA queue strip (live/queue/sent/gaps)", all(k in wc for k in ("sender live", "sent_total", "failed_total", "min_gap_otp")))
reg = read("src/app/register/page.tsx")
check("E5 autofill chain intact", all(k in reg for k in ("register_direct", "tsap_ref_from_link", "tsap_click_fired")))
import inspect as _insp
import main as M
_routes = {getattr(x, "path", "") for x in M.app.routes}
check("E6 pay-full route live", "/api/admin/referrals/pay-full" in _routes)
_psrc = _insp.getsource(M.api_admin_poster)
check("E7 poster exposes otp gaps", "min_gap_otp" in _psrc)


print(f"\n{'=' * 60}\n🌊 WAVE 21 RESULT: {PASS} passed, {FAIL} failed")
if FAILED:
    print("FAILED:", FAILED)
    sys.exit(1)
print("🎉 ALL GREEN")
