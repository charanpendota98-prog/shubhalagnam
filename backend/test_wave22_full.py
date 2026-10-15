"""
🌊 WAVE 22 TEST SUITE — DB PERSISTENCE + UNLOCK AUTH + LINK HIJACK FIX + CORS
==============================================================================
  A. db_store (roundtrip, atomic, corrupt-proof, verified set)
  B. CORS (PUT/PATCH/DELETE allowed)
  C. unlock auth and consent (409 before accepted interest; owner/bot unlock only after consent)
  D. link-telegram (last4 must match, unknown 404)
  E. bot headers (5 sites send X-Api-Key) + startup warn

Run:  WA_TEST_FAST=1 python3 test_wave22_full.py   (backend/ nunchi)
"""
import os
import sys

os.environ.setdefault("WA_TEST_FAST", "1")
os.environ.setdefault("OTP_DEV_MODE", "true")
os.environ.setdefault("WA_LONG_PAUSE_CHANCE", "0")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from test_storage import isolate_test_stores  # noqa: E402
_TEST_STORE = isolate_test_stores("wave22-consent")

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


section("A. db_store")
import db_store as DBS

snap = DBS.snapshot([{"tsap_id": "X1"}], [{"request_id": "R1"}], [{"id": "P1"}],
                    {"999": {"code": "1234"}}, {"999"}, [], [], [])
check("A1 snapshot shape", snap["users"][0]["tsap_id"] == "X1" and snap["verified_phones"] == ["999"])
_real_file = DBS.DB_FILE
DBS.DB_FILE = "/tmp/w22_test_db.json"
try:
    if os.path.exists("/tmp/w22_test_db.json"):
        os.remove("/tmp/w22_test_db.json")
    check("A2 missing file → empty (no crash)", DBS.load() == {})
    DBS.save(snap, force=True)
    back = DBS.load()
    check("A3 roundtrip users+phones", back["users"] == [{"tsap_id": "X1"}] and back["verified_phones"] == ["999"], back)
    check("A4 no tmp leftover (atomic)", not os.path.exists("/tmp/w22_test_db.json.tmp"))
    open("/tmp/w22_test_db.json", "w").write("{broken json!!!")
    check("A5 corrupt file → empty (no crash)", DBS.load() == {})
finally:
    DBS.DB_FILE = _real_file
    if os.path.exists("/tmp/w22_test_db.json"):
        os.remove("/tmp/w22_test_db.json")

section("B. CORS")
from fastapi.testclient import TestClient
import main as M

_cors = [m for m in M.app.user_middleware if "CORSMiddleware" in str(getattr(m, "cls", ""))]
check("B1 CORSMiddleware present", bool(_cors))
if _cors:
    _opts = _cors[0].kwargs or {}
    _methods = [m.upper() for m in (_opts.get("allow_methods") or [])]
    for _m in ("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"):
        check(f"B2 CORS allows {_m}", _m in _methods, _methods)

section("C. unlock auth")
import hardening as H

_users_snap = list(M.DB_USERS)
_interests_snap = list(M.DB_INTERESTS)
_old_fast = os.environ.get("WA_TEST_FAST")
_old_key = H.API_KEY
try:
    M.DB_USERS.append({"tsap_id": "TSAP-M-2022-1", "full_name": "Viewer V", "phone": "9220000001",
                       "credits": 5, "gender": "Groom"})
    M.DB_USERS.append({"tsap_id": "TSAP-F-2022-2", "full_name": "Target T", "phone": "9220000002",
                       "credits": 0, "gender": "Bride"})
    tok = H.sign_token("TSAP-M-2022-1")
    c = TestClient(M.app)
    # Test mode may relax request authentication, but never profile-owner consent.
    r0 = c.post("/api/unlock", json={"viewer_id": "TSAP-M-2022-1", "target_id": "TSAP-F-2022-2"})
    check("C1 test-mode unlock still requires accepted-interest consent",
          r0.status_code == 409 and r0.json().get("reason") == "consent_required"
          and "phone" not in r0.json(), (r0.status_code, r0.json()))
    M.DB_INTERESTS.append({"from_id": "TSAP-M-2022-1", "to_id": "TSAP-F-2022-2", "status": "accepted"})
    # Enforced mode verifies identity in addition to the independent consent gate.
    os.environ["WA_TEST_FAST"] = "0"
    H.API_KEY = "w22testkey"
    check("C2 enforced now on", H.auth_enforced() is True)
    r1 = c.post("/api/unlock", json={"viewer_id": "TSAP-M-2022-1", "target_id": "TSAP-F-2022-2"})
    check("C3 no token → 401 (IDOR closed)", r1.status_code == 401, r1.status_code)
    r2 = c.post("/api/unlock", json={"viewer_id": "TSAP-M-2022-1", "target_id": "TSAP-F-2022-2"},
                headers={"X-Tsap-Token": tok})
    check("C4 owner token + accepted interest → 200",
          r2.status_code == 200 and r2.json().get("success") is True, (r2.status_code, r2.text[:120]))
    r3 = c.post("/api/unlock", json={"viewer_id": "TSAP-M-2022-1", "target_id": "TSAP-F-2022-2"},
                headers={"X-Api-Key": "w22testkey"})
    check("C5 automation key + accepted interest → 200 (bot path)",
          r3.status_code == 200 and r3.json().get("success") is True, (r3.status_code, r3.text[:120]))
    r4 = c.get("/api/unlocks/TSAP-M-2022-1")
    check("C6 unlocks list no token → 401", r4.status_code == 401, r4.status_code)
    r5 = c.get("/api/unlocks/TSAP-M-2022-1", headers={"X-Tsap-Token": tok})
    check("C7 unlocks list owner → 200", r5.status_code == 200, r5.status_code)
finally:
    M.DB_USERS[:] = _users_snap
    M.DB_INTERESTS[:] = _interests_snap
    if _old_fast is None:
        os.environ.pop("WA_TEST_FAST", None)
    else:
        os.environ["WA_TEST_FAST"] = _old_fast
    H.API_KEY = _old_key

section("D. link-telegram")
try:
    M.DB_USERS.append({"tsap_id": "TSAP-F-2022-3", "full_name": "Link L", "phone": "9220000033"})
    c = TestClient(M.app)
    lk1 = c.post("/api/link-telegram", json={"tsap_id": "TSAP-F-2022-3", "chat_id": "111", "phone_last4": "9999"})
    check("D1 wrong last4 → 400", lk1.status_code == 400, (lk1.status_code, lk1.text[:100]))
    lk2 = c.post("/api/link-telegram", json={"tsap_id": "TSAP-F-2022-3", "chat_id": "111", "phone_last4": "0033"})
    check("D2 right last4 → link ok", lk2.status_code == 200 and lk2.json().get("success") is True, lk2.text[:100])
    lk3 = c.post("/api/link-telegram", json={"tsap_id": "TSAP-X-0000", "chat_id": "1"})
    check("D3 unknown ID → 404", lk3.status_code == 404, lk3.status_code)
finally:
    M.DB_USERS[:] = _users_snap

section("E. bot + startup static")
_src = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "telegram_bot.py"), encoding="utf-8").read()
check("E1 _api_headers helper", "def _api_headers" in _src and "X-Api-Key" in _src)
check("E2 all 5 API sites send headers", _src.count("headers=_api_headers()") >= 5, _src.count("headers=_api_headers()"))
check("E3 /link explains the registered phone's last four digits",
      "last 4" in _src.lower() and "phone_last4" in _src)
_msrc = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "main.py"), encoding="utf-8").read()
check("E4 startup warns without TSAP_API_KEY", "TSAP_API_KEY" in _msrc and "bot automation" in _msrc)
check("E5 middleware autosave wired", "DBSTORE.save(DBSTORE.snapshot" in _msrc)
check("E6 startup restore wired", "restored %d users" in _msrc)


print(f"\n{'=' * 60}\n🌊 WAVE 22 RESULT: {PASS} passed, {FAIL} failed")
if FAILED:
    print("FAILED:", FAILED)
    sys.exit(1)
print("🎉 ALL GREEN")
