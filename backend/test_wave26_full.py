"""
WAVE 26 TEST SUITE — ZERO-MISS (no-500 engine + Telugu safety net + money audit)
  A. matching engine None-safe (incomplete profiles → score, never crash)
  B. money rate-limit rules present
  C. global exception → Telugu 500 JSON + ref
  D. /api/health shape (no secrets)
  E. money audit trail (hooks + admin query + 403)
  F. X-Process-Time header + Telugu 404s

Run:  WA_TEST_FAST=1 python3 test_wave26_full.py   (backend/ nunchi)
"""
import asyncio
import os
import sys

os.environ.setdefault("WA_TEST_FAST", "1")
os.environ.setdefault("OTP_DEV_MODE", "true")
os.environ.setdefault("WA_LONG_PAUSE_CHANCE", "0")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from test_storage import isolate_test_stores  # noqa: E402
isolate_test_stores("wave26")

PASS, FAIL, FAILED = 0, 0, []


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


section("A. engine None-safe")
import matching_engine as ME

check("A1 empty users → int score", isinstance(ME.calculate_match_score({}, {}), int))
check("A2 score 0-100", 0 <= ME.calculate_match_score({}, {}) <= 100)
check("A3 None ages → neutral", ME.calculate_age_score(None, None, "") == 12)
check("A4 None jobs → neutral", ME.calculate_job_score(None, None) == 6)
check("A5 reasons minimal → list", isinstance(ME.generate_personalized_reasons({}, {}, 50), list))
check("A6 find_top ageless pool → no crash",
      isinstance(ME.find_top_matches({"tsap_id": "A", "gender": "Groom"},
                                     [{"tsap_id": "B", "gender": "Bride"}]), list))

section("B. money rate rules")
import hardening as H

for route, lim in [("POST /api/pay/order", (20, 600)), ("POST /api/pay/verify", (30, 300)),
                   ("POST /api/pay/claim", (10, 600)), ("POST /api/referral/payout", (10, 3600)),
                   ("POST /api/pay/webhook", (120, 60))]:
    check(f"B {route} limited", H.RL_RULES.get(route) == lim, H.RL_RULES.get(route))

section("C. Telugu 500 net")


class _FakeURL:
    path = "/api/boom"


class _FakeReq:
    url = _FakeURL()


import main as M

resp = asyncio.run(M._telugu_500_handler(_FakeReq(), ValueError("kaboom-test")))
import json as _json

body = _json.loads(resp.body.decode())
check("C1 status 500", resp.status_code == 500)
check("C2 Telugu message", "message_telugu" in body and "ref" in body.get("message_telugu", ""), body)
check("C3 ref code", str(body.get("ref", "")).startswith("ERR-"))
check("C4 no traceback leak", "traceback" not in _json.dumps(body).lower())

section("D. health")
from fastapi.testclient import TestClient

c = TestClient(M.app, raise_server_exceptions=False)
h = c.get("/api/health")
hb = h.json()
check("D1 200 + success", h.status_code == 200 and hb.get("success") is True)
check("D2 counts shape", all(k in hb.get("counts", {}) for k in ("users", "interests", "payments", "orders")))
check("D3 Telugu msg", "message_telugu" in hb)
dump = _json.dumps(hb).lower()
check("D4 no secrets", "secret" not in dump and "admin_key" not in dump, dump[:120])
check("D5 timing header", "x-process-time" in {k.lower() for k in h.headers.keys()}, dict(h.headers))

section("E. money audit")
import money_audit as MAUD

_tmp = "/tmp/w26_audit_test.jsonl"
_oldf = MAUD.AUDIT_FILE
MAUD.AUDIT_FILE = _tmp
if os.path.exists(_tmp):
    os.remove(_tmp)
_users = list(M.DB_USERS)
_pos = list(__import__("paypro").PAY_ORDERS)
_seq = __import__("paypro")._SEQ
try:
    import paypro as PP

    r = MAUD.audit("test_event", "tester", {"x": 1})
    check("E1 audit() returns rec", r.get("event") == "test_event")
    check("E2 file written", os.path.exists(_tmp))
    check("E3 read filter", len(MAUD.read_audit(event="test_event")) == 1)
    u = {"tsap_id": "TSAP-M-2026-1", "full_name": "Audit One", "phone": "9260000001", "credits": 0}
    M.DB_USERS.append(u)
    ah = {"X-Admin-Key": H.ADMIN_KEY}
    o = PP.create_pay_order("TSAP-M-2026-1", "credits", "S_99")
    oid = o["pay_order"]["id"]
    cf = c.post(f"/api/admin/payments/{oid}/confirm", json={"utr": "412626262626"}, headers=ah)
    check("E4 admin confirm ok", cf.status_code == 200, cf.text[:120])
    evs = MAUD.read_audit(event="pay_confirmed")
    check("E5 pay_confirmed logged", len(evs) == 1 and evs[0]["details"].get("order_id") == oid, evs)
    q = c.get("/api/admin/audit?event=pay_confirmed", headers=ah)
    check("E6 admin audit query 200", q.status_code == 200 and q.json().get("count") == 1, q.status_code)
    _wf = os.environ.pop("WA_TEST_FAST", None)
    os.environ["TSAP_AUTH_MODE"] = "prod"
    try:
        q2 = c.get("/api/admin/audit")
        check("E7 audit no-key → 403", q2.status_code == 403, q2.status_code)
    finally:
        if _wf is not None:
            os.environ["WA_TEST_FAST"] = _wf
        os.environ.pop("TSAP_AUTH_MODE", None)
    ap = c.post("/api/admin/approve/TSAP-M-2026-1", headers=ah)
    check("E8 approve ok", ap.status_code == 200, ap.status_code)
    check("E9 approve logged", len(MAUD.read_audit(event="profile_approve")) == 1)
finally:
    M.DB_USERS[:] = _users
    PP.PAY_ORDERS[:] = [o for o in _pos]
    PP._SEQ = _seq
    PP._persist()
    MAUD.AUDIT_FILE = _oldf
    if os.path.exists(_tmp):
        os.remove(_tmp)

section("F. Telugu 404s")
n1 = c.get("/api/matches/TSAP-NOPE-1")
check("F1 matches 404 Telugu", n1.status_code == 404 and "దొరకలేదు" in n1.text, n1.text[:80])
# welcome-pack with ageless candidate → 200 (probe 500 class dead)
_users2 = list(M.DB_USERS)
try:
    M.DB_USERS.append({"tsap_id": "TSAP-F-2026-9", "full_name": "No Age", "phone": "9260000009"})
    M.DB_USERS.append({"tsap_id": "TSAP-M-2026-9", "full_name": "Has Age", "phone": "9260000008",
                       "age": 26, "gender": "male"})
    w = c.get("/api/welcome-pack/TSAP-M-2026-9")
    check("F2 welcome-pack ageless pool → 200", w.status_code == 200, w.status_code)
finally:
    M.DB_USERS[:] = _users2


section("G. purchase → save never fails (datetime-safe)")
import db_store as DBS

_users3 = list(M.DB_USERS)
_pos3 = list(__import__("paypro").PAY_ORDERS)
_seq3 = __import__("paypro")._SEQ
_old_db = os.environ.get("TSAP_DB_FILE", "")
_tmpdb = "/tmp/w26_db_test.json"
if os.path.exists(_tmpdb):
    os.remove(_tmpdb)
os.environ["TSAP_DB_FILE"] = _tmpdb
DBS.DB_FILE = _tmpdb
try:
    import paypro as PP3

    u3 = {"tsap_id": "TSAP-M-2026-3", "full_name": "Save Test", "phone": "9260000003", "credits": 0}
    M.DB_USERS.append(u3)
    oo = PP3.create_pay_order("TSAP-M-2026-3", "credits", "S_99")
    PP3.confirm_manual(oo["pay_order"]["id"], "412626262631")
    check("G1 plan_expiry is ISO string", isinstance(u3.get("plan_expiry"), str), u3.get("plan_expiry"))
    ok = DBS.save(DBS.snapshot(M.DB_USERS, M.DB_INTERESTS, M.DB_PAYMENTS, M.DB_OTPS,
                               set(), M.DB_VIEWS, M.DB_SAVES, M.DB_DIGEST), force=True)
    check("G2 snapshot save ok (no datetime crash)", ok is True)
    back = DBS.load()
    uu = next((x for x in back.get("users", []) if x.get("tsap_id") == "TSAP-M-2026-3"), {})
    check("G3 restored user keeps credits", int(uu.get("credits", 0)) == 5, uu.get("credits"))
    import credits as CR3

    check("G4 is_plan_expired works on restored", CR3.is_plan_expired(uu) is False)
finally:
    M.DB_USERS[:] = _users3
    PP3.PAY_ORDERS[:] = [o for o in _pos3]
    PP3._SEQ = _seq3
    PP3._persist()
    if _old_db:
        os.environ["TSAP_DB_FILE"] = _old_db
    else:
        os.environ.pop("TSAP_DB_FILE", None)
    DBS.DB_FILE = _old_db or DBS.DB_FILE
    for f in (_tmpdb, _tmpdb + ".tmp"):
        if os.path.exists(f):
            os.remove(f)


section("H. frontend↔backend contract (404 misses = FAIL)")
import glob as _glob
import re as _re

_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_bsrc = open(os.path.join(_ROOT, "backend/main.py"), encoding="utf-8").read()
_broutes = set()
for _m in _re.finditer(r'@app\.(?:get|post|put|delete)\("([^"]+)"', _bsrc):
    _broutes.add(_re.sub(r"\{[^}]+\}", "*", _m.group(1)))
check("H1 backend routes 200+", len(_broutes) >= 200, len(_broutes))
_miss = []
for _fp in _glob.glob(_ROOT + "/frontend/src/**/*.*", recursive=True):
    if not _fp.endswith((".tsx", ".ts")):
        continue
    _t = open(_fp, encoding="utf-8").read()
    for _m in _re.finditer(r'["\'](/api/[^"\']+)["\']', _t):
        _u = _re.sub(r"\$\{[^}]+\}", "*", _m.group(1).split("?")[0])
        _parts = _u.split("/")
        _hit = any(len(_r.split("/")) == len(_parts)
                   and all(a == "*" or a == b for a, b in zip(_r.split("/"), _parts))
                   for _r in _broutes)
        if not _hit:
            _miss.append((_u, os.path.basename(_fp)))
check("H2 zero frontend 404-misses", not _miss, _miss[:5])
check("H3 health + audit routes exist", "/api/health" in _broutes and "/api/admin/audit" in _broutes)


print(f"\n{'=' * 60}\n🌊 WAVE 26 RESULT: {PASS} passed, {FAIL} failed")
if FAILED:
    print("FAILED:", FAILED)
    sys.exit(1)
print("🎉 ALL GREEN")
