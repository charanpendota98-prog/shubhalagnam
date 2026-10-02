"""
WAVE 34 PREMIUM - Razorpay depth + FULL API surface sweep (NO 500s anywhere).
================================================================================
User: "ANNI ADVANCE - PREMIUM LEVEL - RAZORPAY AND ALL THINGS BEST - API END
CHECK NO FAILS - BUILD 100% PERFECT"

P. Payment premium:
   P1 webhook payment.authorized -> pending ONLY (fulfill NEVER), captured -> fulfill
   P2 RAZORPAY_VERIFY_CAPTURE=1 -> uncaptured/amount-mismatch block, captured ok
   P3 /api/pay/order unknown user -> 404 fail-fast (no dangling orders)
   P4 offer consume race-proof (20 threads -> used +20 exact)
   P5 manual refund loop: note-required -> reverse (credits/plan) -> idempotent
   P6 razorpay refund (mocked API): success + reversal
   P7 razorpay refund API fail -> fail-closed (paid stays, credits intact)
   P8 pay_stats refunded count + P9 config leaks no secret + P10 refund audit trail
S. API sweep: EVERY route (GET/POST/PUT/DELETE/PATCH) x authed+noauth -> NEVER 500
   + route-count guard + auth-matrix spot checks + wrong-method 405s.

Run: WA_TEST_FAST=1 TSAP_DB_FILE=/tmp/suite.json /home/user/venv/bin/python test_wave34_premium.py
"""
import os
import sys
import re
import json
import hmac
import hashlib
import threading
import uuid
import random

RUN = uuid.uuid4().hex[:6].upper()  # per-run unique (restored-json collision ban)

os.environ.setdefault("WA_TEST_FAST", "1")
os.environ.setdefault("OTP_DEV_MODE", "true")
os.environ.setdefault("WA_LONG_PAUSE_CHANCE", "0")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

PASS, FAIL, FAILED = 0, 0, []


def check(name, cond, extra=None):
    global PASS, FAIL
    if cond:
        PASS += 1
        print(f"  PASS {name}")
    else:
        FAIL += 1
        FAILED.append(name)
        print(f"  FAIL {name}" + (f"  | {str(extra)[:200]}" if extra is not None else ""))


def section(t):
    print(f"\n{'=' * 76}\n{t}\n{'=' * 76}")


import main
import paypro as PP
from hardening import sign_token, ADMIN_KEY
from fastapi.testclient import TestClient

client = TestClient(main.app, raise_server_exceptions=False)

U1 = {"tsap_id": "TSAP-F-2025-9001", "gender": "Bride", "full_name": "W34 Bride",
      "phone": "9000000001", "credits": 3, "plan": "FREE", "wallet": 0,
      "is_approved": True, "phone_verified": True, "is_verified": True,
      "referral_code": "TSAP-REF-90001", "referred_by": "", "referral_stats": {"total": 0, "paid_count": 0},
      "credit_history": [], "created_at": "2025-01-01T00:00:00", "district": "Hyderabad",
      "state": "TS", "caste": "Reddy", "age": 24, "job": "Software Engineer",
      "education": "BTech", "marital_status": "Pelli Kaledu"}
U2 = dict(U1, tsap_id="TSAP-M-2025-9002", gender="Groom", full_name="W34 Groom",
          phone="9000000002", referral_code="TSAP-REF-90002", age=28)
main.DB_USERS.extend([U1, U2])

H_OWNER1 = {"x-tsap-token": sign_token(U1["tsap_id"])}
H_OWNER2 = {"x-tsap-token": sign_token(U2["tsap_id"])}
H_ADMIN = {"x-admin-key": ADMIN_KEY}
H_BOTH = dict(H_OWNER1, **H_ADMIN)

# ===========================================================================
# P1 - webhook authorized vs captured
# ===========================================================================
section("P1 - payment.authorized NEVER fulfills, captured DOES")
r = client.post("/api/pay/order", json={"tsap_id": U1["tsap_id"], "purpose": "credits", "ref": "S_99"},
                headers=H_OWNER1)
check("P1 order created (manual mode)", r.status_code == 200, r.text)
oid = r.json()["pay_order"]["id"]
po = PP.get_pay_order(oid)
po["rzp_order_id"] = "order_W34A" + RUN  # simulate Razorpay-side order id
cr_before = U1["credits"]

w1 = PP.handle_razorpay_webhook({"event": "payment.authorized",
                                 "payload": {"payment": {"entity": {"id": "pay_W34A" + RUN, "order_id": "order_W34A" + RUN}}}})
check("P1 authorized -> pending_capture (not fulfilled)", w1.get("pending_capture") is True, w1)
check("P1 credits unchanged after authorized", U1["credits"] == cr_before, U1["credits"])
check("P1 status still created", po.get("status") == "created", po.get("status"))
check("P1 authorized_at stamped", bool(po.get("authorized_at")), po.get("authorized_at"))

w2 = PP.handle_razorpay_webhook({"event": "payment.captured",
                                 "payload": {"payment": {"entity": {"id": "pay_W34A" + RUN, "order_id": "order_W34A" + RUN}}}})
check("P1 captured -> fulfilled", w2.get("ok") is True and not w2.get("duplicate"), w2)
check("P1 credits added after captured", U1["credits"] == cr_before + 5, U1["credits"])
check("P1 status paid", po.get("status") == "paid", po.get("status"))

# ===========================================================================
# P2 - capture verification gate (mocked Razorpay API, no network)
# ===========================================================================
section("P2 - RAZORPAY_VERIFY_CAPTURE gate")
_old_keys = (os.environ.get("RAZORPAY_KEY_ID"), os.environ.get("RAZORPAY_KEY_SECRET"),
             os.environ.get("RAZORPAY_VERIFY_CAPTURE"))
_old_create = PP._rzp_create_order
_old_status = PP._rzp_payment_status
os.environ["RAZORPAY_KEY_ID"] = "rzp_test_W34"
os.environ["RAZORPAY_KEY_SECRET"] = "sec_W34_test"
os.environ["RAZORPAY_VERIFY_CAPTURE"] = "1"
PP._rzp_create_order = lambda pid, amt, label: {"ok": True, "rzp_order_id": "order_" + pid, "rzp_amount": amt * 100}


def _mk_order():
    rr = client.post("/api/pay/order", json={"tsap_id": U1["tsap_id"], "purpose": "credits", "ref": "S_99"},
                     headers=H_OWNER1)
    assert rr.status_code == 200, rr.text
    return rr.json()["pay_order"]


def _sig(rzp_order, pay):
    return hmac.new(b"sec_W34_test", f"{rzp_order}|{pay}".encode(), hashlib.sha256).hexdigest()


try:
    # case A: authorized (not captured) -> blocked
    oA = _mk_order()
    PP._rzp_payment_status = lambda pid: {"captured": False, "amount": 9900, "status": "authorized"}
    vA = client.post("/api/pay/verify", json={"order_id": oA["id"], "razorpay_order_id": oA["rzp_order_id"],
                                              "razorpay_payment_id": "pay_W34NA" + RUN, "razorpay_signature": _sig(oA["rzp_order_id"], "pay_W34NA" + RUN)},
                     headers=H_OWNER1)
    check("P2 authorized payment blocked", vA.status_code == 400 and "capture" in vA.text, vA.text)
    check("P2 order still created", PP.get_pay_order(oA["id"])["status"] == "created")
    # case B: amount mismatch -> blocked
    oB = _mk_order()
    PP._rzp_payment_status = lambda pid: {"captured": True, "amount": 100, "status": "captured"}
    vB = client.post("/api/pay/verify", json={"order_id": oB["id"], "razorpay_order_id": oB["rzp_order_id"],
                                              "razorpay_payment_id": "pay_W34MM" + RUN, "razorpay_signature": _sig(oB["rzp_order_id"], "pay_W34MM" + RUN)},
                     headers=H_OWNER1)
    check("P2 amount mismatch blocked", vB.status_code == 400 and "order amount" in vB.text, vB.text)
    # case C: captured + exact amount -> paid
    oC = _mk_order()
    cr0 = U1["credits"]
    PP._rzp_payment_status = lambda pid: {"captured": True, "amount": 9900, "status": "captured"}
    vC = client.post("/api/pay/verify", json={"order_id": oC["id"], "razorpay_order_id": oC["rzp_order_id"],
                                              "razorpay_payment_id": "pay_W34OK" + RUN, "razorpay_signature": _sig(oC["rzp_order_id"], "pay_W34OK" + RUN)},
                     headers=H_OWNER1)
    check("P2 captured+exact -> paid", vC.status_code == 200, vC.text)
    check("P2 credits +5", U1["credits"] == cr0 + 5, U1["credits"])
finally:
    PP._rzp_create_order = _old_create
    PP._rzp_payment_status = _old_status
    for k, v in zip(("RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET", "RAZORPAY_VERIFY_CAPTURE"), _old_keys):
        if v is None:
            os.environ.pop(k, None)
        else:
            os.environ[k] = v

# ===========================================================================
# P3 - unknown user order -> 404
# ===========================================================================
section("P3 - order fail-fast for unknown user")
ghost = {"x-tsap-token": sign_token("TSAP-M-2025-9999")}
r3 = client.post("/api/pay/order", json={"tsap_id": "TSAP-M-2025-9999", "purpose": "credits", "ref": "S_99"},
                 headers=ghost)
check("P3 unknown user -> 404", r3.status_code == 404, r3.text)

# ===========================================================================
# P4 - offer consume race-proof
# ===========================================================================
section("P4 - offer consume under lock")
PP.create_offer("W34RACE", "race test", pct_off=10, applies_to=["credits"], max_uses=1000)
o_race = PP.get_offer("W34RACE")
used0 = int(o_race.get("used", 0))
ts = [threading.Thread(target=PP._consume_offer, args=("W34RACE", "U%d" % i)) for i in range(20)]
[t.start() for t in ts]
[t.join() for t in ts]
check("P4 20 threads -> used +20 exact", int(o_race.get("used", 0)) == used0 + 20, o_race.get("used"))

# ===========================================================================
# P5 - manual refund loop via API
# ===========================================================================
section("P5 - manual-UPI refund: note gate + reversal + idempotent")
r5 = client.post("/api/pay/order", json={"tsap_id": U2["tsap_id"], "purpose": "credits", "ref": "S_199"},
                 headers=H_OWNER2)
oid5 = r5.json()["pay_order"]["id"]
c5 = client.post(f"/api/admin/payments/{oid5}/confirm", json={"utr": str(random.randint(600000000000, 999999999999))}, headers=H_ADMIN)
check("P5 paid via admin confirm", c5.status_code == 200, c5.text)
cr5 = U2["credits"]
check("P5 plan S_199 applied", U2.get("plan") == "S_199", U2.get("plan"))
f5a = client.post(f"/api/admin/payments/{oid5}/refund", json={"reason": "test"}, headers=H_ADMIN)
check("P5 manual refund without note -> 400", f5a.status_code == 400 and "note" in f5a.text.lower(), f5a.text)
check("P5 still paid after note-fail", PP.get_pay_order(oid5)["status"] == "paid")
f5b = client.post(f"/api/admin/payments/{oid5}/refund",
                  json={"reason": "test", "note": "returned UTR 999999999999"}, headers=H_ADMIN)
check("P5 refund with note -> success", f5b.status_code == 200, f5b.text)
check("P5 status refunded", PP.get_pay_order(oid5)["status"] == "refunded")
check("P5 credits reversed", U2["credits"] == cr5 - 12, U2["credits"])
check("P5 plan back to FREE", U2.get("plan") == "FREE", U2.get("plan"))
check("P5 via manual_upi", f5b.json().get("via") == "manual_upi", f5b.json())
f5c = client.post(f"/api/admin/payments/{oid5}/refund",
                  json={"reason": "x", "note": "y"}, headers=H_ADMIN)
check("P5 double refund idempotent", f5c.status_code == 200 and f5c.json().get("duplicate") is True, f5c.text)
r5u = client.post("/api/pay/order", json={"tsap_id": U2["tsap_id"], "purpose": "credits", "ref": "S_29"},
                  headers=H_OWNER2)
f5d = client.post(f"/api/admin/payments/{r5u.json()['pay_order']['id']}/refund",
                  json={"reason": "x", "note": "y"}, headers=H_ADMIN)
check("P5 unpaid order refund -> 400", f5d.status_code == 400 and "Paid" in f5d.text, f5d.text)
_missing = "pay_ord_99991"
while PP.get_pay_order(_missing):
    _missing = "pay_ord_" + str(int(_missing.split("_")[-1]) + 1)
f5e = client.post(f"/api/admin/payments/{_missing}/refund", json={"reason": "x", "note": "y"},
                  headers=H_ADMIN)
check("P5 unknown order refund -> 400", f5e.status_code == 400, f5e.text)

# ===========================================================================
# P6/P7 - razorpay refund (mocked), success + fail-closed
# ===========================================================================
section("P6/P7 - razorpay refund success + fail-closed")
_old_keys2 = (os.environ.get("RAZORPAY_KEY_ID"), os.environ.get("RAZORPAY_KEY_SECRET"))
os.environ["RAZORPAY_KEY_ID"] = "rzp_test_W34"
os.environ["RAZORPAY_KEY_SECRET"] = "sec_W34_test"
PP._rzp_create_order = lambda pid, amt, label: {"ok": True, "rzp_order_id": "order_" + pid, "rzp_amount": amt * 100}
_old_refund = PP.razorpay_refund
try:
    o6 = _mk_order()
    v6 = client.post("/api/pay/verify", json={"order_id": o6["id"], "razorpay_order_id": o6["rzp_order_id"],
                                              "razorpay_payment_id": "pay_W34R6" + RUN, "razorpay_signature": _sig(o6["rzp_order_id"], "pay_W34R6" + RUN)},
                     headers=H_OWNER1)
    check("P6 razorpay order paid", v6.status_code == 200, v6.text)
    cr6 = U1["credits"]
    PP.razorpay_refund = lambda pid, amt, note="": {"ok": True, "refund_id": "rfnd_W34R6", "status": "processed"}
    f6 = client.post(f"/api/admin/payments/{o6['id']}/refund", json={"reason": "test6"}, headers=H_ADMIN)
    check("P6 refund via razorpay API", f6.status_code == 200 and f6.json().get("via") == "razorpay", f6.text)
    check("P6 credits reversed", U1["credits"] == cr6 - 5, U1["credits"])
    check("P6 refund_id stored", PP.get_pay_order(o6["id"]).get("refund_id") == "rfnd_W34R6")
    o7 = _mk_order()
    v7 = client.post("/api/pay/verify", json={"order_id": o7["id"], "razorpay_order_id": o7["rzp_order_id"],
                                              "razorpay_payment_id": "pay_W34R7" + RUN, "razorpay_signature": _sig(o7["rzp_order_id"], "pay_W34R7" + RUN)},
                     headers=H_OWNER1)
    check("P7 second order paid", v7.status_code == 200, v7.text)
    cr7 = U1["credits"]
    PP.razorpay_refund = lambda pid, amt, note="": {"ok": False, "message_telugu": "mock gateway down"}
    f7 = client.post(f"/api/admin/payments/{o7['id']}/refund", json={"reason": "test7"}, headers=H_ADMIN)
    check("P7 API fail -> refund 400", f7.status_code == 400, f7.text)
    check("P7 still paid (fail-closed)", PP.get_pay_order(o7["id"])["status"] == "paid")
    check("P7 credits intact", U1["credits"] == cr7, U1["credits"])
finally:
    PP._rzp_create_order = _old_create
    PP.razorpay_refund = _old_refund
    for k, v in zip(("RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET"), _old_keys2):
        if v is None:
            os.environ.pop(k, None)
        else:
            os.environ[k] = v

# ===========================================================================
# P8/P9/P10 - stats + secret leak + audit
# ===========================================================================
section("P8/P9/P10 - stats, secret-leak, audit")
st = PP.pay_stats()
check("P8 refunded count >= 2", st.get("refunded", 0) >= 2, st)
cfg = client.get("/api/pay/config")
check("P9 config 200", cfg.status_code == 200)
check("P9 no secret leak", "secret" not in cfg.text.lower(), cfg.text[:200])
check("P9 mode key present", "mode" in cfg.json(), cfg.json())
import money_audit as MAUD
trail = MAUD.read_audit(event="pay_refunded", limit=20)
check("P10 refund audit trail", any("pay_ord_" in json.dumps(t) for t in trail), len(trail))

# ===========================================================================
# S - FULL API SURFACE SWEEP: no route may 500 (authed + no-auth)
# ===========================================================================
section("S - full API sweep (every route x authed+noauth, never 500)")
PARAM_FILL = {"tsap_id": U1["tsap_id"], "viewer_id": U1["tsap_id"], "buyer_id": U1["tsap_id"],
              "bride": U1["tsap_id"], "groom": U2["tsap_id"], "order_id": "pay_ord_00001",
              "request_id": "REQ-NOPE", "vendor_id": "V-NOPE", "code": "ZZZ9", "story_id": "ST-NOPE",
              "lead_id": "L-NOPE", "report_id": "R-NOPE", "cid": "C-NOPE", "jid": "J-NOPE",
              "key": "official", "slug": "x", "pid": "P-NOPE", "search_id": "S-NOPE", "name": "x"}
VERBS = ("GET", "POST", "PUT", "DELETE", "PATCH")
api_routes = []
for r in main.app.routes:
    if not (hasattr(r, "methods") and hasattr(r, "path")):
        continue
    for m in sorted(r.methods or []):
        if m in VERBS:
            api_routes.append((m, r.path))
api_only = [(m, p) for m, p in api_routes if p.startswith("/api")]
check("S0 total routes >= 227 (none lost + refund new)", len(api_routes) >= 227, len(api_routes))
check("S0 api routes >= 222", len(api_only) >= 222, len(api_only))
check("S0 refund route registered", ("POST", "/api/admin/payments/{order_id}/refund") in api_only, len(api_only))


def _fill(path):
    return re.sub(r"\{(\w+)\}", lambda m: PARAM_FILL.get(m.group(1), "x"), path)


def _is_crash(resp):
    if resp.status_code == 500:
        return True
    try:
        j = resp.json()
    except Exception:
        return False
    return isinstance(j, dict) and j.get("error") == "server_error"


sweep_bad = []
for m, p in api_only:
    path = _fill(p)
    try:
        if m == "GET":
            ra = client.get(path, headers=H_BOTH)
            rb = client.get(path)
        elif m == "DELETE":
            ra = client.request("DELETE", path, headers=H_BOTH)
            rb = client.request("DELETE", path)
        else:
            ra = client.request(m, path, json={}, headers=H_BOTH)
            rb = client.request(m, path, json={})
    except Exception as e:
        sweep_bad.append(f"{m} {p} EXC {e!r}"[:160])
        continue
    for tag, r_ in (("authed", ra), ("noauth", rb)):
        if _is_crash(r_):
            body = r_.text[:120].replace("\n", " ")
            sweep_bad.append(f"{m} {path} [{tag}] -> {r_.status_code} {body}")
check("S1 sweep: 0 crashes across all routes x2", not sweep_bad,
      "; ".join(sweep_bad[:6]) if sweep_bad else f"{len(api_only)} routes x2 ok")
if sweep_bad:
    for b in sweep_bad[:20]:
        print(f"    SWEEP-500: {b}")

# auth matrix spot checks (dev gates open by design -> enforce like prod, then restore)
section("S2 - auth matrix + wrong-method")
_wtf = os.environ.get("WA_TEST_FAST")
os.environ["WA_TEST_FAST"] = "0"
os.environ.pop("TSAP_AUTH_MODE", None)
try:
    a1 = client.get("/api/admin/payments")
    check("S2 admin route noauth -> 403", a1.status_code == 403, a1.status_code)
    a2 = client.get("/api/admin/payments", headers=H_ADMIN)
    check("S2 admin route with key -> 200", a2.status_code == 200, a2.text[:150])
    # 🔐 Phase-14 token versioning interaction (fixed this round):
    # the S1 sweep above POSTs {} to *every* route, which includes
    # /api/auth/logout-everywhere and /api/admin/users/{id}/force-logout. Those
    # legitimately call revoke_all_tokens(), so H_OWNER1 (signed at import time)
    # is stale by design once we get here. Revoke-before-this-moment must fail,
    # a freshly signed token must work — assert both instead of tripping over it.
    o0 = client.get(f"/api/credits/{U1['tsap_id']}", headers=H_OWNER1)
    check("S2 token issued before a revoke -> 401 (logout-everywhere works)",
          o0.status_code == 401, o0.status_code)
    H_OWNER1_FRESH = {"x-tsap-token": sign_token(U1["tsap_id"])}
    o1 = client.get(f"/api/credits/{U2['tsap_id']}", headers=H_OWNER1_FRESH)
    check("S2 owner route wrong-owner -> 401", o1.status_code == 401, o1.status_code)
    o1b = client.get(f"/api/credits/{U1['tsap_id']}")
    check("S2 owner route no-token -> 401", o1b.status_code == 401, o1b.status_code)
    o2 = client.get(f"/api/credits/{U1['tsap_id']}", headers=H_OWNER1_FRESH)
    check("S2 owner route self -> 200", o2.status_code == 200, o2.text[:150])
    f5z = client.post(f"/api/admin/payments/{oid5}/refund", json={"reason": "x", "note": "y"})
    check("S2 refund noauth (enforced) -> 403", f5z.status_code == 403, f5z.status_code)
finally:
    if _wtf is None:
        os.environ.pop("WA_TEST_FAST", None)
    else:
        os.environ["WA_TEST_FAST"] = _wtf
w1 = client.get("/api/pay/order")
check("S2 GET on POST-only -> 405", w1.status_code == 405, w1.status_code)
w2 = client.post("/api/plans", json={})
check("S2 POST on GET-only -> 405", w2.status_code == 405, w2.status_code)
j1 = client.post("/api/otp/send", content="not-json{{{", headers={"Content-Type": "application/json"})
check("S2 malformed JSON -> 4xx not 500", j1.status_code in (400, 422), j1.status_code)

# P11 - key env fallback (W37: old .env style RAZORPAY_KEY/SECRET kooda pani cheyyali)
section("P11 - razorpay key env fallback")
_envbak = {k: os.environ.get(k) for k in ("RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET",
                                         "RAZORPAY_KEY", "RAZORPAY_SECRET")}
try:
    for k in _envbak:
        os.environ.pop(k, None)
    check("P11 no keys -> manual_upi", PP.pay_config()["mode"] == "manual_upi", PP.pay_config())
    c0 = client.get("/api/pay/config").json()
    check("P11 config route manual + secret-free", c0.get("mode") == "manual_upi"
          and c0.get("key_id") in ("", None) and "secret" not in str(c0).lower(), c0)
    os.environ["RAZORPAY_KEY"] = "rzp_test_LEGACY"
    os.environ["RAZORPAY_SECRET"] = "secLEGACY"
    check("P11 legacy pair -> razorpay", PP.pay_config()["mode"] == "razorpay"
          and PP.pay_config()["key_id"] == "rzp_test_LEGACY", PP.pay_config())
    c1 = client.get("/api/pay/config").json()
    check("P11 config route razorpay (legacy)", c1.get("mode") == "razorpay"
          and c1.get("key_id") == "rzp_test_LEGACY" and "secLEGACY" not in str(c1), c1)
    os.environ["RAZORPAY_KEY_ID"] = "rzp_test_PRIMARY"
    os.environ["RAZORPAY_KEY_SECRET"] = "secPRIMARY"
    check("P11 primary wins over legacy", PP.pay_config()["key_id"] == "rzp_test_PRIMARY",
          PP.pay_config())
    os.environ.pop("RAZORPAY_KEY_ID", None)
    os.environ.pop("RAZORPAY_KEY_SECRET", None)
    check("P11 primary removed -> legacy again", PP.pay_config()["key_id"] == "rzp_test_LEGACY")
finally:
    for k, v in _envbak.items():
        if v is None:
            os.environ.pop(k, None)
        else:
            os.environ[k] = v

print(f"\n{'=' * 76}\nRESULT: {PASS} pass / {FAIL} fail\n{'=' * 76}")
if FAILED:
    print("FAILED:", FAILED)
    sys.exit(1)
print("WAVE34 ALL GREEN")
