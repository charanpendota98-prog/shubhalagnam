"""
WAVE 27 TEST SUITE — 10,000-TESTER ASSAULT (committed subset; full storm = assault27*.py)
  A. money races (payout/commission/attach/register/interest/otp → exactly-once)
  B. register never crashes on genderless users (831 regression)
  C. route fuzz smoke (every route x mutations → never 500)
  D. full journey invariants (credits/wallet/commission math)

Run:  WA_TEST_FAST=1 python3 test_wave27_assault.py   (backend/ nunchi)
"""
import io
import os
import re
import sys
import threading
from datetime import datetime, timedelta

os.environ.setdefault("WA_TEST_FAST", "1")
os.environ.setdefault("OTP_DEV_MODE", "true")
os.environ.setdefault("WA_LONG_PAUSE_CHANCE", "0")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from test_storage import isolate_test_stores  # noqa: E402
isolate_test_stores("wave27")

_PAYMENT_ENV_KEYS = ("PAY_UPI_ID", "RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET", "RAZORPAY_KEY", "RAZORPAY_SECRET")
_PAYMENT_ENV_ORIGINAL = {key: os.environ.get(key) for key in _PAYMENT_ENV_KEYS}
for _key in _PAYMENT_ENV_KEYS:
    os.environ.pop(_key, None)

PASS, FAIL, FAILED = 0, 0, []


def section(t):
    print(f"\n=== {t} ===")


def check(name, cond, extra=None):
    global PASS, FAIL
    if cond:
        PASS += 1
    else:
        FAIL += 1
        FAILED.append(name)
        print(f"  ❌ {name}" + (f"  → {extra}" if extra else ""))


import main as M
import hardening as H
import referral
import paypro as PP
from testutil_client import TestClient

c = TestClient(M.app, raise_server_exceptions=False)
ADMIN = {"X-Admin-Key": H.ADMIN_KEY}

_users = list(M.DB_USERS)
_pays = list(PP.PAY_ORDERS)
_seq = PP._SEQ
_pouts = list(referral.PAYOUTS)
try:
    section("A. money races")
    # A1 payout race
    earner = {"tsap_id": "TSAP-M-2711-1", "full_name": "Race Earn", "phone": "9271100001",
              "referral_stats": {}}
    M.DB_USERS.append(earner)
    referral.stats_of(earner)["wallet"] = 300.0
    earner["wallet"] = 300.0
    outs = []
    ts = [threading.Thread(target=lambda i=i: outs.append(
        referral.payout_request(earner, 100, "upi", f"race{i}@okhdfc"))) for i in range(6)]
    [t.start() for t in ts]
    [t.join() for t in ts]
    check("A1 payout exactly-once", sum(1 for r in outs if r.get("ok")) == 1, outs)
    check("A2 single hold", float(referral.stats_of(earner)["wallet"]) == 200.0)
    # A3 commission race
    ref = {"tsap_id": "TSAP-M-2711-2", "full_name": "Race Ref", "phone": "9271100002",
           "referral_code": "RACE2", "referral_stats": {}}
    nb = {"tsap_id": "TSAP-F-2711-3", "full_name": "Race Join", "phone": "9271100003"}
    M.DB_USERS.extend([ref, nb])
    referral.attach_referral(nb, "RACE2", M.DB_USERS)
    outs2 = []
    ts = [threading.Thread(target=lambda i=i: outs2.append(
        referral.process_referral_payment(nb, "RACE2", 99, M.DB_USERS, payment_id=f"rc-{i}", plan_code="S_99")))
        for i in range(6)]
    [t.start() for t in ts]
    [t.join() for t in ts]
    check("A3 commission exactly-once", sum(1 for r in outs2 if r.get("success")) == 1)
    check("A4 wallet 50", float(referral.stats_of(ref)["wallet"]) == 50.0)
    # A5 attach race
    u3 = {"tsap_id": "TSAP-M-2711-4", "full_name": "Race Att", "phone": "9271100004", "credits": 0}
    M.DB_USERS.append(u3)
    outs3 = []
    ts = [threading.Thread(target=lambda: outs3.append(referral.attach_referral(u3, "RACE2", M.DB_USERS)))
          for _ in range(6)]
    [t.start() for t in ts]
    [t.join() for t in ts]
    check("A5 attach exactly-once", sum(1 for r in outs3 if r.get("ok")) == 1)
    check("A6 bonus once", int(u3.get("credits", 0)) == referral.REFEREE_BONUS_CREDITS)
    # A7 register race → unique IDs
    def _form(ph, full_name="Race Reg", gender="Groom"):
        return {"gender": gender, "age": 27, "dob": "1999-01-15", "password": "test-profile-password",
                "height": "5'8\"", "marital_status": "Pelli Kaledu", "religion": "Hindu",
                "caste": "Reddy", "education": "BTech", "job": "Software", "salary": "10L",
                "state": "TS", "district": "Hyderabad", "phone": ph, "full_name": full_name}
    import random as _random27
    _r27 = _random27.randint(10, 99)  # R10: per-run unique phone space (persisted phones = correct 409 dup-phone)
    regs = []
    ts = [threading.Thread(target=lambda i=i: regs.append(
        c.post("/api/register", data=_form(f"9271{_r27}{i:04d}", full_name=f"Race Reg Candidate {chr(65 + i)}")))) for i in range(6)]  # 10 digits total
    [t.start() for t in ts]
    [t.join() for t in ts]
    rids = [r.json().get("tsap_id") for r in regs if r.status_code == 200]
    check("A7 all registered", len(rids) == 6,
          [(r.status_code, r.text[:120]) for r in regs])
    check("A8 IDs unique", len(set(rids)) == 6, rids)
    # A9 interest race → single deduct
    frm_response = c.post("/api/register", data=_form("9282700005", "Race Frm", "Groom"))
    tot_response = c.post("/api/register", data=_form("9282700006", "Race To", "Bride"))
    frm = M._find_user(frm_response.json().get("tsap_id", "")) or {}
    tot = M._find_user(tot_response.json().get("tsap_id", "")) or {}
    frm.update({"is_approved": True, "is_active": True, "status": "approved", "credits": 3})
    tot.update({"is_approved": True, "is_active": True, "status": "approved"})
    check("A9 setup registered approved profiles", frm_response.status_code == 200
          and tot_response.status_code == 200 and bool(frm.get("tsap_id")) and bool(tot.get("tsap_id")))
    t5 = H.sign_token(frm["tsap_id"])
    outs5 = []
    ts = [threading.Thread(target=lambda: outs5.append(c.post(
        "/api/interest/send", json={"from_id": frm["tsap_id"], "to_id": tot["tsap_id"]},
        headers={"X-TSAP-Token": t5}))) for _ in range(4)]
    [t.start() for t in ts]
    [t.join() for t in ts]
    check("A9 interest exactly-once", sum(1 for r in outs5 if r.status_code == 200) == 1,
          [r.status_code for r in outs5])
    check("A10 single deduct", int(frm.get("credits", -1)) == 2, frm.get("credits"))
    # A11 otp race
    otp_phone = "9271100099"
    M.DB_OTPS[otp_phone] = {"code_hash": M._otp_digest("7777"),
                            "expires": (datetime.utcnow() + timedelta(minutes=10)).isoformat(),
                            "tries": 0, "sent_at": datetime.utcnow().isoformat(),
                            "purpose": "login", "history": []}
    outs6 = []
    ts = [threading.Thread(target=lambda: outs6.append(c.post(
        "/api/otp/verify", json={"phone": "9271100099", "code": "7777"}))) for _ in range(4)]
    [t.start() for t in ts]
    [t.join() for t in ts]
    check("A11 otp exactly-once", sum(1 for r in outs6 if r.status_code == 200) == 1)

    section("B. no-crash data shapes")
    M.DB_USERS.append({"tsap_id": "TSAP-X-NOGENDER", "full_name": "No Gender"})
    r = c.post("/api/register", data=_form("9282700100", "No Gender Registration"))
    check("B1 register with genderless user in DB → 200", r.status_code == 200,
          (r.status_code, r.text[:100]))
    M.DB_USERS[:] = [u for u in M.DB_USERS if u.get("tsap_id") != "TSAP-X-NOGENDER"]

    section("C. fuzz smoke (all routes)")
    src = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "main.py"),
               encoding="utf-8").read()
    routes = [(m.group(1), m.group(2)) for m in
              re.finditer(r'@app\.(get|post|put|delete)\("([^"]+)"', src)]
    tok = H.sign_token("TSAP-M-2711-5")
    HD = {"X-TSAP-Token": tok}
    n500 = []
    n = 0
    for method, path in routes:
        h = ADMIN if path.startswith("/api/admin") else HD
        p = re.sub(r"\{[^}]+\}", "1", path)
        variants = []
        if method == "get":
            variants = [(p, None), (p + "?limit=-1", None),
                        (re.sub(r"\{[^}]+\}", "..", path), None)]
        else:
            if "upload" in path:
                continue
            variants = [(p, {}), (p, {"tsap_id": None, "x": "A" * 3000})]
        for url, body in variants:
            n += 1
            try:
                if method == "get":
                    rr = c.get(url, headers=h)
                else:
                    rr = c.request(method.upper(), url, json=body, headers=h)
                if rr.status_code == 500:
                    n500.append(f"{method.upper()} {path}")
            except Exception as e:
                n500.append(f"{method.upper()} {path} EXC {e}")
    check(f"C1 {n} probes, zero 500", not n500, n500[:5])

    section("D. journey invariants")
    a = {"tsap_id": "TSAP-M-2711-7", "full_name": "J Ref", "phone": "9271100007",
         "referral_code": "JR7", "referral_stats": {}, "credits": 5}
    b = {"tsap_id": "TSAP-F-2711-8", "full_name": "J Join", "phone": "9271100008", "credits": 0}
    M.DB_USERS.extend([a, b])
    check("D1 attach", referral.attach_referral(b, "JR7", M.DB_USERS).get("ok"))
    order_count_before = len(PP.PAY_ORDERS)
    o = PP.create_pay_order(b["tsap_id"], "credits", "S_199")
    check("D2 order fails closed without a real provider or merchant destination",
          o.get("success") is False and "unavailable" in o.get("message_telugu", "").lower()
          and len(PP.PAY_ORDERS) == order_count_before, o)
    claim = PP.claim_utr("missing-order", b["tsap_id"], "")
    confirm = PP.confirm_manual("missing-order", "")
    check("D3 unconfigured order cannot be claimed or manually confirmed",
          claim.get("success") is False and confirm.get("success") is False)
    check("D4 referral join bonus is retained without adding payment credits",
          int(b.get("credits", 0)) == referral.REFEREE_BONUS_CREDITS, b.get("credits"))
    check("D5 unpaid join earns no payment commission", float(referral.stats_of(a)["wallet"]) == 0.0)
    check("D6 never negative", int(a.get("credits", 0)) >= 0 and int(b.get("credits", 0)) >= 0
          and float(referral.stats_of(a)["wallet"]) >= 0)
finally:
    M.DB_USERS[:] = _users
    PP.PAY_ORDERS[:] = [o for o in _pays]
    PP._SEQ = _seq
    PP._persist()
    referral.PAYOUTS[:] = _pouts
    referral.save_state()
    for _key, _value in _PAYMENT_ENV_ORIGINAL.items():
        if _value is None:
            os.environ.pop(_key, None)
        else:
            os.environ[_key] = _value

print(f"\n{'=' * 60}\n🌊 WAVE 27 RESULT: {PASS} passed, {FAIL} failed")
if FAILED:
    print("FAILED:", FAILED)
    sys.exit(1)
print("🎉 ALL GREEN")
