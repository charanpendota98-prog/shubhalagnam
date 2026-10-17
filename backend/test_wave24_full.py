"""
WAVE 24 TEST SUITE — TOP MATRIMONY STANDARD (commission everywhere, no double-spend)
  A. pay-flow commission (Razorpay-verify path + manual UTR path via fulfill)
  B. unlock double-spend lock (race: 1 credit, 2 threads → charged once)
  C. partner phone as referral code
  D. leaderboard includes partners
  E. worker OTP kind → OTP gaps
  F. DB snapshot caps

Run:  WA_TEST_FAST=1 python3 test_wave24_full.py   (backend/ nunchi)
"""
import os
import sys
import threading

os.environ.setdefault("WA_TEST_FAST", "1")
os.environ.setdefault("OTP_DEV_MODE", "true")
os.environ.setdefault("WA_LONG_PAUSE_CHANCE", "0")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from test_storage import isolate_test_stores  # noqa: E402
isolate_test_stores("wave24")

# 💳 Test-only merchant UPI id: pay-order flows need a configured destination. Manual UPI
# mode still requires an operator to verify the submitted reference — no money moves in tests.
os.environ.setdefault("PAY_UPI_ID", "mana-vivaha-tests@upi")

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


section("A. pay-flow commission")
import main as M
import paypro as PP
import referral
import refpartners as RP19

_users_snap = list(M.DB_USERS)
_p_snap = list(RP19.PARTNERS)
_po_snap = list(PP.PAY_ORDERS)
try:
    ref = {"tsap_id": "TSAP-M-2024-1", "full_name": "Ref Owner24", "phone": "9240000001",
           "referral_code": "OWN24", "referral_stats": {}}
    M.DB_USERS.append(ref)
    nb = {"tsap_id": "TSAP-F-2024-2", "full_name": "Paying Join", "phone": "9240000002",
          "credits": 0}
    M.DB_USERS.append(nb)
    a = referral.attach_referral(nb, "OWN24", M.DB_USERS)
    check("A1 attach ok", a.get("ok"), a)
    # manual UTR path (most common: PhonePe/GPay screenshot + UTR)
    o = PP.create_pay_order("TSAP-F-2024-2", "credits", "S_99")
    check("A2 pay order created", o.get("success"), o)
    oid = o["pay_order"]["id"]
    cm = PP.confirm_manual(oid, "412424242401")
    check("A3 manual confirm ok", cm.get("success"), cm)
    st = referral.stats_of(ref)
    check("A4 commission fired via fulfill (wallet 50)", float(st.get("wallet", 0)) == 50, st.get("wallet"))
    po = PP.get_pay_order(oid)
    check("A5 order carries referral block", (po.get("referral") or {}).get("success") is True, po.get("referral"))
    check("A6 user got credits", int(nb.get("credits", 0)) > 0, nb.get("credits"))
    # unknown referrer → fulfill still ok (commission never breaks pay)
    nb2 = {"tsap_id": "TSAP-F-2024-3", "full_name": "Ghost Ref", "phone": "9240000003",
           "credits": 0, "referred_by": "NOPEXX"}
    M.DB_USERS.append(nb2)
    o2 = PP.create_pay_order("TSAP-F-2024-3", "credits", "S_99")
    cm2 = PP.confirm_manual(o2["pay_order"]["id"], "412424242402")
    check("A7 bad referrer → pay still succeeds", cm2.get("success") is True, cm2)

    section("B. unlock race")
    import smart12 as S12
    _u_snap = {k: dict(v) for k, v in S12.UNLOCKS.items()}
    _r_snap = list(S12.REVEAL_LOG)
    viewer = {"tsap_id": "TSAP-M-2024-9", "full_name": "Racer", "phone": "9240000009", "credits": 1}
    target = {"tsap_id": "TSAP-F-2024-8", "full_name": "Target", "phone": "9240000008"}
    S12.UNLOCKS.pop("TSAP-M-2024-9", None)
    outs = []
    ts = [threading.Thread(target=lambda: outs.append(S12.unlock_number(viewer, target))) for _ in range(2)]
    [t.start() for t in ts]
    [t.join() for t in ts]
    check("B1 both calls answered", len(outs) == 2)
    # 🐞 R13: contact details are consent-only now — a credit can buy an interest request,
    #    never a phone number. So the race must charge nothing at all (no double-spend and
    #    no credit-bypass of owner acceptance).
    check("B2 zero credits charged (phone numbers are never sold)",
          all(int(r.get("charged", 0) or 0) == 0 for r in outs), outs)
    check("B2b both racers got the same consent gate (no partial state)",
          {r.get("reason") for r in outs} == {"consent_required"}, [r.get("reason") for r in outs])
    check("B3 credits untouched and never negative", viewer["credits"] == 1, viewer["credits"])
    S12.UNLOCKS.clear()
    S12.UNLOCKS.update(_u_snap)
    S12.REVEAL_LOG[:] = _r_snap
    S12._persist()

    section("C. partner phone code")
    r = RP19.register_partner(name="Phone Code", phone="9240000024", state="TS", district="Jangaon")
    pid = r["partner_id"]
    f = referral.find_referrer("9240000024", [])
    check("C1 phone resolves partner", isinstance(f, dict) and f.get("partner_id") == pid, f)
    nb3 = {"tsap_id": "TSAP-F-2024-4", "full_name": "Phone Join", "phone": "9240000004"}
    a3 = referral.attach_referral(nb3, "9240000024", [])
    check("C2 attach via phone locks partner", a3.get("ok"), a3)

    section("D. leaderboard partners")
    p = RP19.get_partner(pid)
    pst = referral.stats_of(p)
    pst["paid_count"] = 2
    pst["lifetime_earned"] = 100
    pst["registrations"] = 3
    lb = referral.get_leaderboard([], limit=10)
    check("D1 partner on board", any(x.get("partner_id") == pid for x in lb), lb)
finally:
    M.DB_USERS[:] = _users_snap
    RP19.PARTNERS[:] = _p_snap
    RP19._save()
    PP.PAY_ORDERS[:] = [o for o in _po_snap]
    PP._persist()

section("E. worker OTP kind")
import inspect as _insp
import publisher as PUB

_wsrc = _insp.getsource(PUB._wa_worker_loop)
check("E1 worker passes kind to record_send", 'kind=item.get("kind", "")' in _wsrc)
import wa_antiban as AB
_gsrc = _insp.getsource(AB.WhatsAppAntiban._current_gap)
check("E2 otp kind → min_gap_otp branch", '== "otp"' in _gsrc and "min_gap_otp" in _gsrc)
check("E3 cfg otp defaults 25/60", "25.0" in _insp.getsource(AB.WhatsAppAntiban.cfg)
      and "60.0" in _insp.getsource(AB.WhatsAppAntiban.cfg))

section("F. DB caps")
import db_store as DBS

snap = DBS.snapshot([{"a": 1}], [], [], {}, set(), [{"v": i} for i in range(6000)],
                    [{"s": i} for i in range(6000)], [{"d": i} for i in range(3000)])
check("F1 views capped 5000", len(snap["views"]) == 5000, len(snap["views"]))
check("F2 saves capped 5000", len(snap["saves"]) == 5000)
check("F3 digest capped 2000", len(snap["digest"]) == 2000)
check("F4 users untouched", snap["users"] == [{"a": 1}])
check("F5 keeps most recent", snap["views"][-1] == {"v": 5999} and snap["digest"][0] == {"d": 1000})


print(f"\n{'=' * 60}\n🌊 WAVE 24 RESULT: {PASS} passed, {FAIL} failed")
if FAILED:
    print("FAILED:", FAILED)
    sys.exit(1)
print("🎉 ALL GREEN")
