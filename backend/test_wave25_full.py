"""
WAVE 25 TEST SUITE — PIN-TO-PIN SECURE PAY + FLAT ₹50 REFERRAL + PAID LIFECYCLE
  A. referral ₹50-only (first=50, repeat=0, tier-extra=0, milestone money=0)
  B. payout approve → ledger PAID + UTR validation + double-approve block
  C. UTR claim flow + reuse fraud-block
  D. order expiry (24h)
  E. concurrent confirm lock (credits once)
  F. Razorpay webhook (bad sig reject, good sig fulfill-once)
  G. pay route auth (401 without token, 200 owner)
  H. frontend wiring (claim UI, rzp order_id, no 10% copy)

Run:  WA_TEST_FAST=1 python3 test_wave25_full.py   (backend/ nunchi)
"""
import hashlib
import hmac
import json
import os
import sys
import threading
from datetime import datetime, timedelta

os.environ.setdefault("WA_TEST_FAST", "1")
os.environ.setdefault("OTP_DEV_MODE", "true")
os.environ.setdefault("WA_LONG_PAUSE_CHANCE", "0")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from test_storage import isolate_test_stores  # noqa: E402
isolate_test_stores("wave25")

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


section("A. flat ₹50-only")
import referral

check("A1 first payment (99) = 50", referral.calculate_commission("USER", 99, True) == 50)
check("A2 first payment (499) = 50 (plan tho sambandham ledu)",
      referral.calculate_commission("USER", 499, True) == 50)
check("A3 GOLD tier kuda 50 (extra ledu)",
      referral.calculate_commission("USER", 99, True, "GOLD") == 50)
check("A4 repeat = 0", referral.calculate_commission("USER", 499, False, "ELITE") == 0)
check("A5 below-min (20) = 0", referral.calculate_commission("USER", 20, True) == 0)
check("A6 tiers extra_pct anni 0", all(t["extra_pct"] == 0 for t in referral.TIERS))
check("A7 milestones money 0 (badge only)",
      all(m["cash"] == 0 and m["credits"] == 0 for m in referral.MILESTONES))

import main as M
import paypro as PP

_users_snap = list(M.DB_USERS)
_po_snap = list(PP.PAY_ORDERS)
_pay_snap = list(referral.PAYOUTS)
_seq_snap = PP._SEQ
try:
    ref = {"tsap_id": "TSAP-M-2025-1", "full_name": "Ref25", "phone": "9250000001",
           "referral_code": "REF25", "referral_stats": {}}
    M.DB_USERS.append(ref)
    # 3 paying referrals → wallet exactly 150 (milestone money ledu)
    for i in range(3):
        nb = {"tsap_id": f"TSAP-F-2025-{10 + i}", "full_name": f"Join{i}",
              "phone": f"925000001{i}"}
        M.DB_USERS.append(nb)
        referral.attach_referral(nb, "REF25", M.DB_USERS)
        r = referral.process_referral_payment(nb, "REF25", 99, M.DB_USERS, payment_id=f"pay25-{i}", plan_code="S_99")
        assert r.get("success"), r
    st = referral.stats_of(ref)
    check("A8 3 pays → wallet exactly 150", float(st["wallet"]) == 150, st["wallet"])
    check("A9 milestone hit record (badge) undi", 3 in st.get("milestones_hit", []), st.get("milestones_hit"))
    # repeat payment → no commission
    nb0 = M.DB_USERS[1]
    rr = referral.process_referral_payment(nb0, "REF25", 499, M.DB_USERS, payment_id="pay25-repeat", plan_code="S_499")
    check("A10 repeat → success False + reason", rr.get("success") is False
          and rr.get("reason") == "no_repeat_commission", rr)
    check("A11 repeat tarvata wallet 150 ye", float(referral.stats_of(ref)["wallet"]) == 150)
    check("A12 has_paid intact", nb0.get("has_paid") is True)

    section("B. payout PAID lifecycle")
    me = {"tsap_id": "TSAP-M-2025-2", "full_name": "Earner", "phone": "9250000002",
          "referral_code": "ERN25", "referral_stats": {}}
    M.DB_USERS.append(me)
    for i in range(2):
        nb = {"tsap_id": f"TSAP-F-2025-{20 + i}", "full_name": f"Ej{i}", "phone": f"925000002{i}"}
        M.DB_USERS.append(nb)
        referral.attach_referral(nb, "ERN25", M.DB_USERS)
        referral.process_referral_payment(nb, "ERN25", 99, M.DB_USERS, payment_id=f"epay-{i}", plan_code="S_99")
    check("B1 wallet 100 (2x50)", float(referral.stats_of(me)["wallet"]) == 100)
    pr = referral.payout_request(me, 100, method="upi", upi_id="earner@okhdfcbank")
    check("B2 payout request ok", pr.get("ok"), pr)
    check("B3 request time wallet 0 (hold)", float(referral.stats_of(me)["wallet"]) == 0)
    bad = referral.payout_action(pr["request"]["id"], "approve", M.DB_USERS, utr="abc")
    check("B4 malformed UTR → approve BLOCK", bad.get("ok") is False, bad)
    ok = referral.payout_action(pr["request"]["id"], "approve", M.DB_USERS, utr="412889001122")
    check("B5 approve ok", ok.get("ok"), ok)
    st2 = referral.stats_of(me)
    led = st2.get("ledger", [])
    paid_entries = [l for l in led if l.get("type") == "payout_paid"]
    check("B6 ledger lo PAID entry", len(paid_entries) == 1, [l.get("type") for l in led[-3:]])
    check("B7 PAID entry lo UTR", paid_entries and paid_entries[0].get("utr") == "412889001122")
    check("B8 paid_out 100 + pending 0", float(st2["paid_out"]) == 100 and float(st2["pending_payout"]) == 0)
    dbl = referral.payout_action(pr["request"]["id"], "approve", M.DB_USERS, utr="412889001133")
    check("B9 double-approve BLOCK", dbl.get("ok") is False and "already" in str(dbl.get("reason")), dbl)
    # reject path: wallet ki malli
    for i in range(2):
        nb = {"tsap_id": f"TSAP-F-2025-{30 + i}", "full_name": f"Rj{i}", "phone": f"925000003{i}"}
        M.DB_USERS.append(nb)
        referral.attach_referral(nb, "ERN25", M.DB_USERS)
        referral.process_referral_payment(nb, "ERN25", 99, M.DB_USERS, payment_id=f"rpay-{i}", plan_code="S_99")
    pr2 = referral.payout_request(me, 100, method="upi", upi_id="earner@okhdfcbank")
    rj = referral.payout_action(pr2["request"]["id"], "reject", M.DB_USERS, reason="wrong_upi")
    check("B10 reject → wallet malli 100", rj.get("ok") and float(referral.stats_of(me)["wallet"]) == 100)

    section("C. UTR claim + reuse-block")
    payer = {"tsap_id": "TSAP-M-2025-5", "full_name": "Payer", "phone": "9250000005", "credits": 0}
    M.DB_USERS.append(payer)
    o = PP.create_pay_order("TSAP-M-2025-5", "credits", "S_99")
    check("C1 order ok", o.get("success"), o)
    oid = o["pay_order"]["id"]
    c1 = PP.claim_utr(oid, "TSAP-M-2025-5", "123")
    check("C2 bad UTR claim BLOCK", c1.get("success") is False, c1)
    c2 = PP.claim_utr(oid, "TSAP-M-2025-9", "411122223333")
    check("C3 vere vaadi order claim BLOCK", c2.get("success") is False, c2)
    c3 = PP.claim_utr(oid, "TSAP-M-2025-5", "411122223333")
    check("C4 claim ok (status claimed, NOT paid)", c3.get("success") and PP.get_pay_order(oid)["status"] == "claimed")
    check("C5 claim alone credits ivvadu", int(payer.get("credits", 0)) == 0, payer.get("credits"))
    o2 = PP.create_pay_order("TSAP-M-2025-5", "credits", "S_99")
    oid2 = o2["pay_order"]["id"]
    c4 = PP.claim_utr(oid2, "TSAP-M-2025-5", "411122223333")
    check("C6 same UTR second order BLOCK (fraud)", c4.get("success") is False and c4.get("reason") == "utr_reused", c4)
    m1 = PP.confirm_manual(oid, "")
    check("C7 admin confirm (claim UTR auto) → paid", m1.get("success"), m1)
    check("C8 credits added", int(payer.get("credits", 0)) > 0, payer.get("credits"))
    m2 = PP.confirm_manual(oid2, "411122223333")
    check("C9 confirm with used UTR BLOCK", m2.get("success") is False and m2.get("reason") == "utr_reused", m2)

    section("D. expiry")
    oe = PP.create_pay_order("TSAP-M-2025-5", "credits", "S_99")
    oide = oe["pay_order"]["id"]
    PP.get_pay_order(oide)["created_at"] = (datetime.utcnow() - timedelta(hours=25)).strftime("%Y-%m-%dT%H:%M:%S")
    ce = PP.claim_utr(oide, "TSAP-M-2025-5", "422233334444")
    check("D1 expired claim BLOCK", ce.get("success") is False and ce.get("reason") == "expired", ce)
    me2 = PP.confirm_manual(oide, "422233334444")
    check("D2 expired confirm BLOCK", me2.get("success") is False, me2)
    check("D3 status expired mark", PP.get_pay_order(oide)["status"] == "expired")

    section("E. concurrent confirm")
    payer2 = {"tsap_id": "TSAP-M-2025-6", "full_name": "Racer2", "phone": "9250000006", "credits": 0}
    M.DB_USERS.append(payer2)
    oc = PP.create_pay_order("TSAP-M-2025-6", "credits", "S_99")
    oidc = oc["pay_order"]["id"]
    outs = []
    ts = [threading.Thread(target=lambda: outs.append(PP.confirm_manual(oidc, "433344445555"))) for _ in range(2)]
    [t.start() for t in ts]
    [t.join() for t in ts]
    check("E1 both answered", len(outs) == 2)
    check("E2 exactly one fulfill (dup other)", sum(1 for r in outs if not r.get("duplicate")) == 1, outs)
    check("E3 credits = single plan (5)", int(payer2.get("credits", 0)) == 5, payer2.get("credits"))

    section("F. webhook")
    os.environ["RAZORPAY_KEY_SECRET"] = "testsecret25"
    ow = PP.create_pay_order("TSAP-M-2025-6", "credits", "S_99")
    oidw = ow["pay_order"]["id"]
    PP.get_pay_order(oidw)["rzp_order_id"] = "order_TEST25"
    body = json.dumps({"event": "payment.captured",
                       "payload": {"payment": {"entity": {"id": "pay_TEST25", "order_id": "order_TEST25"}}}}).encode()
    check("F1 bad sig reject", PP.verify_webhook_signature(body, "deadbeef") is False)
    good = hmac.new(b"testsecret25", body, hashlib.sha256).hexdigest()
    check("F2 good sig accept", PP.verify_webhook_signature(body, good) is True)
    w1 = PP.handle_razorpay_webhook(json.loads(body.decode()))
    check("F3 webhook fulfill ok", w1.get("ok") is True, w1)
    w2 = PP.handle_razorpay_webhook(json.loads(body.decode()))
    check("F4 webhook replay → duplicate", w2.get("ok") is True and w2.get("duplicate") is True, w2)
    check("F5 credits added once (5+5=10)", int(payer2.get("credits", 0)) == 10, payer2.get("credits"))
    w3 = PP.handle_razorpay_webhook({"event": "refund.created", "payload": {}})
    check("F6 unknown event ignored", w3.get("ok") is True and w3.get("ignored") is True)
    del os.environ["RAZORPAY_KEY_SECRET"]

    section("G. pay route auth")
    from fastapi.testclient import TestClient
    import hardening as H
    _wf = os.environ.pop("WA_TEST_FAST", None)
    os.environ["TSAP_AUTH_MODE"] = "prod"
    try:
        c = TestClient(M.app, raise_server_exceptions=False)
        tok = H.sign_token("TSAP-M-2025-5")
        r1 = c.post("/api/pay/order", json={"tsap_id": "TSAP-M-2025-5", "purpose": "credits", "ref": "S_99"})
        check("G1 order no-token → 401", r1.status_code == 401, r1.status_code)
        r2 = c.post("/api/pay/order", json={"tsap_id": "TSAP-M-2025-5", "purpose": "credits", "ref": "S_99"},
                    headers={"X-TSAP-Token": tok})
        check("G2 order owner-token → 200", r2.status_code == 200, (r2.status_code, r2.text[:100]))
        r3 = c.get(f"/api/pay/status/{oid}")
        check("G3 status no-token → 401/404-guard", r3.status_code == 401, r3.status_code)
        r4 = c.get(f"/api/pay/status/{oid}", headers={"X-TSAP-Token": tok})
        check("G4 status owner → 200 + no secrets", r4.status_code == 200 and "payment_id" not in r4.json().get("order", {}),
              r4.status_code)
        r5 = c.post("/api/pay/claim", json={"order_id": oid2, "utr": "444455556666"})
        check("G5 claim no-token → 401", r5.status_code == 401, r5.status_code)
        r6 = c.post("/api/pay/webhook", content=b"{}", headers={"X-Razorpay-Signature": "nope"})
        check("G6 webhook bad-sig → 401", r6.status_code == 401, r6.status_code)
    finally:
        if _wf is not None:
            os.environ["WA_TEST_FAST"] = _wf
        os.environ.pop("TSAP_AUTH_MODE", None)
finally:
    M.DB_USERS[:] = _users_snap
    PP.PAY_ORDERS[:] = [o for o in _po_snap]
    PP._SEQ = _seq_snap
    PP._persist()
    referral.PAYOUTS[:] = _pay_snap
    referral.save_state()

section("H. frontend wiring")
with open(os.path.join(ROOT, "frontend/src/components/PayBox.tsx"), encoding="utf-8") as f:
    pb = f.read()
check("H1 PayBox claim API", "/api/pay/claim" in pb)
check("H2 PayBox rzp order_id checkout", "order_id: order.rzp_order_id" in pb)
check("H3 PayBox 12-digit UTR check", "d{12}" in pb)
# App Router split: referral UI lives in page.tsx + referral-client.tsx — read both.
from testutil_paths import src_page  # noqa: E402
rp = src_page("frontend/src/app/referral/page.tsx")
check("H4 no 10% copy", "10%" not in rp)
# 💎 R13: copy is "one-time ₹50" now (flat, never a percentage, never per repeat payment).
check("H5 flat one-time ₹50 copy (no percentage, no repeat)",
      "One-time ₹50" in rp and "10%" not in rp)
check("H6 PAID badge render", "payout_paid" in rp and "✅ PAID" in rp)
with open(os.path.join(ROOT, "frontend/src/components/PayConsole.tsx"), encoding="utf-8") as f:
    pc = f.read()
check("H7 admin claimed filter + claim UTR", '"claimed"' in pc and "claim_utr" in pc)


section("I. API sweep guards")
import interest as INT

_users2 = list(M.DB_USERS)
try:
    u1 = {"tsap_id": "TSAP-M-2025-7", "full_name": "Sweep One Reddy", "phone": "9250000007"}
    u2 = {"tsap_id": "TSAP-F-2025-8", "full_name": "Sweep Two Rao", "phone": "9250000008"}
    M.DB_USERS.extend([u1, u2])
    rec = INT.create_interest(u1, u2, note="secret note", score=80)
    M.DB_INTERESTS.append(rec)
    lb = referral.get_leaderboard([{"tsap_id": "X", "full_name": "Ramesh Kumar Reddy",
                                    "referral_stats": {"paid_count": 1, "lifetime_earned": 50,
                                                       "registrations": 1}}])
    check("I1 leaderboard first-name only", lb and lb[0]["name"] == "Ramesh", lb)
    import refpartners as RP19B
    _pp = list(RP19B.PARTNERS)
    rrp = RP19B.register_partner(name=" sweep partner", phone="9250000099", state="TS", district="Hyd")
    u1["referred_by"] = rrp["partner_id"]
    u1["has_paid"] = True
    pub = RP19B.partner_public(rrp["partner_id"], [u1])
    jn = (pub.get("joins") or [{}])[0]
    # 🔒 R13: public partner feed is anonymous — no names on an unauthenticated endpoint.
    check("I2 partner joins feed is anonymous (no name/phone/ID leaked)",
          jn.get("join_no") == 1 and not any(k in jn for k in ("name", "phone", "tsap_id")), jn)
    RP19B.PARTNERS[:] = _pp
    RP19B._save()
    from fastapi.testclient import TestClient as TC2
    _wf2 = os.environ.pop("WA_TEST_FAST", None)
    os.environ["TSAP_AUTH_MODE"] = "prod"
    try:
        cc = TC2(M.app, raise_server_exceptions=False)
        a1 = cc.post("/api/admin/approve/TSAP-M-2025-7")
        check("I3 admin approve no-key → 403", a1.status_code == 403, a1.status_code)
        s1 = cc.get(f"/api/interest/status/{rec['request_id']}")
        check("I4 interest status no-token → 401", s1.status_code == 401, s1.status_code)
        import hardening as H2
        t1 = H2.sign_token("TSAP-M-2025-7")
        s2 = cc.get(f"/api/interest/status/{rec['request_id']}", headers={"X-TSAP-Token": t1})
        check("I5 sender token → 200", s2.status_code == 200, s2.status_code)
        v1 = cc.get("/api/vendors?include_inactive=true")
        vv = v1.json()
        check("I6 public vendors active-only", v1.status_code == 200
              and all(x.get("status") == "active" for x in vv.get("vendors", vv.get("items", []))), v1.status_code)
    finally:
        if _wf2 is not None:
            os.environ["WA_TEST_FAST"] = _wf2
        os.environ.pop("TSAP_AUTH_MODE", None)
finally:
    M.DB_USERS[:] = _users2


print(f"\n{'=' * 60}\n🌊 WAVE 25 RESULT: {PASS} passed, {FAIL} failed")
if FAILED:
    print("FAILED:", FAILED)
    sys.exit(1)
print("🎉 ALL GREEN")
