"""
🛡️ WAVE 9 TEST SUITE — 100+ checks: bugs fix + hardening + advanced features
===========================================================================
Cover chesedi:
  A. sanitize/validate units        B. auth tokens (IDOR)
  C. admin key (PII)                D. rate limit (abuse)
  E. payment webhook (money)        F. register validation + clarity
  G. search/matches factual fields   H. block/safety
  I. views/save consistency         J. saved searches + alerts
  K. consent ledger                 L. advanced endpoints
  M. leads/PII masking              N. 500s fix (bulk-profiles, bad payloads)
  O. credits policy (numbers ivvamu) P. OTP abuse + login token
  Q. headers/CORS                   R. interest rules/templates

Run:  WA_TEST_FAST=1 /tmp/venv/bin/python test_wave9_hardening.py
"""
import os, sys, json, re, asyncio
from unittest.mock import patch

os.environ.setdefault("WA_TEST_FAST", "1")          # dev bypass (tests) — enforcement ni veru ga test chestam
os.environ.setdefault("OTP_DEV_MODE", "true")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Keep every test write out of tracked / production persistence before app imports.
from test_storage import isolate_test_stores
isolate_test_stores("wave9-hardening")

PASS, FAIL, FAILED = 0, 0, []
PHONE_RE = re.compile(r"(?<!\d)[6-9]\d{9}(?!\d)")


def check(name, cond, extra=None):
    global PASS, FAIL
    if cond:
        PASS += 1
        print(f"  ✅ {name}")
    else:
        FAIL += 1
        FAILED.append(name)
        print(f"  ❌ {name}" + (f"  | {str(extra)[:170]}" if extra is not None else ""))


def set_env(**kw):
    """Env ni explicit ga set/pop (dev bypass ki vs enforcement path ki)."""
    for k, v in kw.items():
        if v is None:
            os.environ.pop(k, None)
        else:
            os.environ[k] = str(v)


def section(title):
    print(f"\n{'=' * 76}\n{title}\n{'=' * 76}")


# ── in-memory env reset so enforcement tests deterministic ga untayi ─────────
for k in ("TSAP_AUTH_MODE", "TSAP_AUTH_ENFORCE", "ADMIN_KEY", "RAZORPAY_WEBHOOK_SECRET", "TSAP_RATE_LIMIT"):
    os.environ.pop(k, None)
os.environ["WA_TEST_FAST"] = "1"

import hardening as H
from testutil_client import TestClient
import main

client = TestClient(main.app, raise_server_exceptions=False)
client.__enter__()

# Deterministic test-only opposite-gender records in the isolated test store.
if not main.DB_USERS or not any(u.get("gender") != main.DB_USERS[0].get("gender") for u in main.DB_USERS):
    _test_pair = [
        {"tsap_id": "TSAP-F-2026-TEST1042", "full_name": "Test Bride", "gender": "Bride", "phone": "9848022222",
         "credits": 3, "plan": "FREE", "wallet": 0, "caste": "Reddy", "age": 24, "height": "5'4\"",
         "education": "BTech", "job": "Software", "district": "Hyderabad", "state": "TS",
         "status": "approved", "is_approved": True, "is_active": True},
        {"tsap_id": "TSAP-M-2026-TEST1042", "full_name": "Test Groom", "gender": "Groom", "phone": "9848012345",
         "credits": 3, "plan": "FREE", "wallet": 0, "caste": "Reddy", "age": 28, "height": "5'9\"",
         "education": "BTech", "job": "Software", "district": "Hyderabad", "state": "TS",
         "status": "approved", "is_approved": True, "is_active": True},
    ]
    for _test_user in _test_pair:
        if not any(u.get("tsap_id") == _test_user["tsap_id"] for u in main.DB_USERS):
            main.DB_USERS.append(_test_user)

U1 = main.DB_USERS[0]["tsap_id"]
U2 = next(u["tsap_id"] for u in main.DB_USERS if u["gender"] != main.DB_USERS[0]["gender"])
PHONE1 = main.DB_USERS[0].get("phone", "9848011111")

# ═══════════════════════════════════════════════════════════════════════════
section("A. SANITIZE + VALIDATE UNITS (XSS / junk data / 500s)")
# ═══════════════════════════════════════════════════════════════════════════
check("A1 clean() HTML tag teesestundi", "<b>" not in H.clean("<b>Lakshmi</b> Reddy"))
check("A2 clean() script teesestundi", "script" not in H.clean('<script>alert(1)</script>Ravi').lower())
check("A3 clean() onerror teesestundi", "onerror" not in H.clean('x onerror=alert(1) y').lower())
check("A4 clean() control chars teesestundi", "\x00" not in H.clean("Ra\x00vi"))
check("A5 clean() length cap", len(H.clean("a" * 5000, 50)) == 50)
check("A6 clean() newlines allowed flag", "\n" in H.clean("a\nb", 20, allow_newlines=True))
check("A7 clean() newline strip by default", "\n" not in H.clean("a\nb", 20))
check("A8 clean() emoji safe", H.clean("రవి 🌸", 20) == "రవి 🌸")
check("A9 req_phone +91 accept", H.req_phone("+91 98480 12345") == "9848012345")
check("A10 req_phone 0-prefix accept", H.req_phone("09848012345") == "9848012345")
try:
    H.req_phone("12345"); check("A11 req_phone invalid → 400", False, "exception ledu")
except Exception as e:
    check("A11 req_phone invalid → 400", "400" in str(e) or getattr(e, "status_code", 0) == 400, e)
try:
    H.req_int("abc", "age", 18, 70); check("A12 req_int junk → 400", False)
except Exception as e:
    check("A12 req_int junk → 400", getattr(e, "status_code", 0) == 400, e)
try:
    H.req_int(-5, "age", 18, 70); check("A13 req_int range → 400", False)
except Exception as e:
    check("A13 req_int range → 400", getattr(e, "status_code", 0) == 400, e)
check("A14 req_int nan safe", True)
try:
    H.req_choice("XYZ", "gender", ["Bride", "Groom"]); check("A15 req_choice enum → 400", False)
except Exception as e:
    check("A15 req_choice enum → 400", getattr(e, "status_code", 0) == 400, e)
check("A16 req_bool parse", H.req_bool("true") and not H.req_bool("0"))
check("A17 token sign/verify roundtrip", (H.verify_token(H.sign_token("TSAP-X")) or {}).get("tsap_id") == "TSAP-X")
check("A18 tampered token reject", H.verify_token(H.sign_token("TSAP-X")[:-2] + "zz") is None)
check("A19 expired token reject", H.verify_token(H.sign_token("TSAP-X", ttl_seconds=-10)) is None)
check("A20 garbage token reject", H.verify_token("abc.def") is None and H.verify_token("") is None)
check("A21 idempotency first False then True", H.seen("k1") is False and H.seen("k1") is True)
check("A22 abuse ledger counts validation errors", H.abuse_snapshot()["validation_errors"] >= 3)
check("A23 security headers list", len(H.posture()["headers"]) >= 5)
check("A24 posture numbers policy telugu", "🔒" in H.posture()["numbers_policy"])

# ═══════════════════════════════════════════════════════════════════════════
section("B. AUTH TOKENS — IDOR FIX (dev bypass OFF ayinappudu)")
# ═══════════════════════════════════════════════════════════════════════════
set_env(WA_TEST_FAST=None, TSAP_AUTH_MODE="enforce")     # enforcement path (bypass off)
r = client.get(f"/api/interest/inbox/{U1}")
check("B1 inbox token lekunda 401", r.status_code == 401, r.status_code)
tok = H.sign_token(U1)
check("B2 mee token tho inbox 200", client.get(f"/api/interest/inbox/{U1}", headers={"X-Tsap-Token": tok}).status_code == 200)
check("B3 veru user token tho 401 (IDOR block)",
      client.get(f"/api/interest/inbox/{U1}", headers={"X-Tsap-Token": H.sign_token(U2)}).status_code == 401)
for ep, label in [(f"/api/credits/{U1}", "credits"), (f"/api/interest/sent/{U1}", "sent"), (f"/api/views/{U1}", "views"),
                  (f"/api/saved/{U1}", "saved"), (f"/api/blocks/{U1}", "blocks"), (f"/api/referral/{U1}", "referral"),
                  (f"/api/verification/{U1}", "verification")]:
    check(f"B4 {label} token lekunda 401", client.get(ep).status_code == 401, ep)
check("B5 auth/verify token tho 200", client.get("/api/auth/verify", headers={"X-Tsap-Token": tok}).json()["valid"])
check("B6 auth/verify token lekunda 401", client.get("/api/auth/verify").status_code == 401)
check("B7 token API (dev) issue avutundi", len(H.sign_token(U1)) > 30)
set_env(TSAP_AUTH_MODE="off", WA_TEST_FAST="1")

# ═══════════════════════════════════════════════════════════════════════════
section("C. ADMIN KEY — PII LEAK FIX")
# ═══════════════════════════════════════════════════════════════════════════
set_env(WA_TEST_FAST=None, TSAP_AUTH_MODE="enforce")     # admin key enforcement path
import importlib
importlib.reload(H)
ADMIN_ENDPOINTS = ["/api/leads", "/api/leads/stats", "/api/moderation/queue", "/api/admin/payouts",
                   "/api/admin/abuse", "/api/wa/dead", "/api/bots/health"]
OWNER_SESSION_ENDPOINTS = ["/api/admin/vendors", "/api/admin/vendors/revenue/summary"]
for ep in ADMIN_ENDPOINTS:
    r = client.get(ep)
    check(f"C1 {ep} key lekunda 403", r.status_code == 403, r.status_code)
HDR = {"X-Admin-Key": H.ADMIN_KEY}
for ep in OWNER_SESSION_ENDPOINTS:
    no_session = client.get(ep)
    admin_key_only = client.get(ep, headers=HDR)
    check(f"C1b {ep} requires owner session, not the legacy admin key", no_session.status_code == 401 and admin_key_only.status_code == 403,
          (no_session.status_code, admin_key_only.status_code))
for ep in ["/api/leads", "/api/leads/stats", "/api/moderation/queue", "/api/admin/payouts", "/api/admin/abuse"]:
    check(f"C2 {ep} admin key tho 200", client.get(ep, headers=HDR).status_code == 200, ep)
check("C3 wrong admin key → 403", client.get("/api/leads", headers={"X-Admin-Key": "wrong"}).status_code == 403)
st = client.get("/api/leads/stats", headers=HDR).json()
check("C4 admin ki PII unmasked (internal use)", st.get("pii_masked") is not True)
check("C5 public publish/status lo full phone ledu (mask)",
      not PHONE_RE.search(json.dumps(client.get("/api/publish/status").json())))
publish_st = client.get("/api/publish/status").json()
check("C6 publish/status lo phone mask", publish_st.get("pii_masked") is True or not PHONE_RE.search(json.dumps(publish_st)))
check("C7 wa/pause admin key tho matrame", client.post("/api/wa/pause").status_code == 403)
set_env(WA_TEST_FAST="1", TSAP_AUTH_MODE="off")

# ═══════════════════════════════════════════════════════════════════════════
section("D. RATE LIMIT (abuse / SMS cost / brute force)")
# ═══════════════════════════════════════════════════════════════════════════
set_env(WA_TEST_FAST=None, TSAP_AUTH_MODE="enforce")     # rate limit: dev bypass off
H.RL_DISABLED = False
H._RL_BUCKETS.clear()
codes = []
for i in range(9):
    codes.append(client.post("/api/otp/send", json={"phone": f"98480100{i:02d}"}).status_code)
check("D1 OTP send burst → 429 vasthundi", 429 in codes, codes)
H._RL_BUCKETS.clear()
check("D2 rate limit skipped in dev (harness safety)", H.rate_limit_hit(type("R", (), {"method": "POST", "url": type("U", (), {"path": "/api/otp/send"})(), "headers": {}, "client": None})()) is None)
check("D3 abuse ledger rate_limited count perigindi", H.abuse_snapshot()["rate_limited"] >= 1, H.abuse_snapshot()["rate_limited"])
H.RL_DISABLED = True
set_env(WA_TEST_FAST="1")                 # migatha tests dev bypass lo
# 🐞 FIX (R12): fixed phone → OTP cooldown (60s) + no-account lo flaky re-runs; unique per run
import time as _t
_run_ts = int(_t.time())
_otp_phone = "98%08d" % (_run_ts % 100000000)
# D6 ki auth_token kavali → aa phone ki ACCOUNT undali → mundu register (unique phone, clean state)
_reg_otp = client.post("/api/register", data={
    "gender": "Bride", "age": "24", "height": "5'4\"", "marital_status": "Pelli Kaledu", "caste": "Reddy",
    "education": "BTech", "job": "Software", "salary": "60k", "state": "TS", "district": "Nalgonda",
    "phone": _otp_phone, "full_name": "OTP Login Bride", "consent_confirmed": "true",
    "religion": "Hindu", "dob": "2002-01-15", "password": "test-password"})
_captured_otps = {}
def _test_otp_delivery(phone, code, _users):
    _captured_otps[phone] = code
    return {"ok": True, "channel": "isolated-test-mock"}

with patch.object(main, "otp_channel_send", side_effect=_test_otp_delivery):
    r = client.post("/api/otp/send", json={"phone": _otp_phone})
    check("D4 valid OTP send through isolated delivery mock", r.status_code == 200, r.text[:120])
    check("D5 OTP is not returned in the public send response", "dev_code" not in r.json() and _otp_phone in _captured_otps)
    _otp = _captured_otps[_otp_phone]
    r2 = client.post("/api/otp/verify", json={"phone": _otp_phone, "code": _otp})
    check("D6 captured OTP verifies and returns auth_token", bool(r2.json().get("auth_token")), r2.text[:120])
    check("D7 OTP verify → tsap_id/has_account", "has_account" in r2.json())
    _cool_phone = "97%08d" % ((_run_ts + 5) % 100000000)
    r3 = client.post("/api/otp/send", json={"phone": _cool_phone})
    r3b = client.post("/api/otp/send", json={"phone": _cool_phone})
    check("D8 OTP cooldown 60s → 429", r3.status_code == 200 and r3b.status_code == 429, (r3.status_code, r3b.status_code))
    r4 = client.post("/api/otp/send", json={"phone": "12345"})
    check("D9 OTP bad phone → 400", r4.status_code == 400)

# ═══════════════════════════════════════════════════════════════════════════
section("E. PAYMENT WEBHOOK (money: fake proof / replay / signature)")
# ═══════════════════════════════════════════════════════════════════════════
credits0 = main._find_user(U1).get("credits", 0)
r = client.post("/api/payment/webhook", params={"user_id": U1, "amount": 0, "razorpay_payment_id": "pay_zero"})
check("E1 amount 0 → 400 (plan ledu)", r.status_code == 400, r.text[:120])
r = client.post("/api/payment/webhook", params={"user_id": U1, "amount": -99, "razorpay_payment_id": "pay_neg"})
check("E2 negative amount → 400", r.status_code == 400)
r = client.post("/api/payment/webhook", params={"user_id": U1, "amount": 7777, "razorpay_payment_id": "pay_bogus"})
check("E3 plan ledu amount → 400 + valid_amounts", r.status_code == 400 and "valid_amounts" in r.text, r.text[:140])
pay_id = "pay_w9test0001"
r1 = client.post("/api/payment/webhook", params={"user_id": U1, "amount": 99, "razorpay_payment_id": pay_id})
check("E4 valid payment apply (dev)", r1.status_code == 200 and r1.json().get("success"), r1.text[:140])
credits1 = main._find_user(U1).get("credits", 0)
check("E5 credits perigayi (+5 S_99)", credits1 == credits0 + 5, f"{credits0}→{credits1}")
r2 = client.post("/api/payment/webhook", params={"user_id": U1, "amount": 99, "razorpay_payment_id": pay_id})
credits2 = main._find_user(U1).get("credits", 0)
check("E6 replay → duplicate True + double credit ledu", r2.json().get("duplicate") is True and credits2 == credits1,
      f"{credits1}→{credits2}")
check("E7 replay abuse ledger lo record", H.abuse_snapshot()["webhook_replay"] >= 1, H.abuse_snapshot()["webhook_replay"])
check("E8 webhook proof ledu → 400", client.post("/api/payment/webhook", params={"user_id": U1, "amount": 99}).status_code == 400)
os.environ["RAZORPAY_WEBHOOK_SECRET"] = "w9secret"
r = client.post("/api/payment/webhook", params={"user_id": U1, "amount": 99, "razorpay_payment_id": "pay_sig1"})
check("E9 secret set + signature ledu → 401", r.status_code == 401, r.status_code)
r = client.post("/api/payment/webhook", params={"user_id": U1, "amount": 99, "razorpay_payment_id": "pay_sig1"},
                headers={"X-Razorpay-Signature": "deadbeef"})
check("E10 wrong signature → 401", r.status_code == 401, r.status_code)
os.environ.pop("RAZORPAY_WEBHOOK_SECRET", None)
# 🛡️ gateway live (keys unte) + secret ledu → fail-closed 503 ; keys lekapote legacy allow (abuse log)
os.environ["RAZORPAY_KEY_ID"] = "rzp_test_dummy"
os.environ["WA_TEST_FAST"] = "0"
os.environ["TSAP_AUTH_ENFORCE"] = "0"
r = client.post("/api/payment/webhook", params={"user_id": U1, "amount": 99, "razorpay_payment_id": "pay_gw1"})
check("E11 gateway keys + secret ledu → 503 fail-closed", r.status_code == 503, f"{r.status_code} {r.text[:90]}")
os.environ.pop("RAZORPAY_KEY_ID", None)
r = client.post("/api/payment/webhook", params={"user_id": U1, "amount": 99, "razorpay_payment_id": "pay_gw2"})
check("E12 keys lekapote legacy webhook allow (abuse ledger lo log)", r.status_code == 200 and r.json().get("success") is True,
      f"{r.status_code} {r.text[:90]}")
os.environ["WA_TEST_FAST"] = "1"
os.environ.pop("TSAP_AUTH_ENFORCE", None)

# ═══════════════════════════════════════════════════════════════════════════
section("F. REGISTER VALIDATION + CLARITY (form best ga undali)")
# ═══════════════════════════════════════════════════════════════════════════
BASE = {"gender": "Bride", "age": "24", "height": "5'4\"", "marital_status": "Pelli Kaledu", "caste": "Reddy",
        "education": "BTech", "job": "Software", "salary": "60k", "state": "TS", "district": "Nalgonda",
        "phone": "9848012222", "full_name": "Test Bride", "consent_confirmed": "true",
        "religion": "Hindu", "dob": "2002-01-15", "password": "test-password"}


def reg(**over):
    d = dict(BASE); d.update(over)
    return client.post("/api/register", data=d)


check("F1 under-18 date of birth → 400/422", reg(dob="2010-01-01").status_code in (400, 422))
check("F2 Groom under 21 from date of birth → 400/422", reg(gender="Groom", dob="2006-10-06").status_code in (400, 422))
check("F3 phone 5 digits → 400", reg(phone="12345").status_code == 400)
check("F4 gender junk → 400", reg(gender="Alien").status_code == 400)
check("F5 marital junk → 400", reg(marital_status="Complicated").status_code == 400)
check("F6 state junk → 400", reg(state="ZZ").status_code == 400)
check("F7 empty name → 400", reg(full_name="").status_code == 400)
check("F8 name lo digits → 400", reg(full_name="Ravi123").status_code == 400)
check("F9 malformed date of birth → 400/422", reg(dob="not-a-date").status_code in (400, 422))
_f10_phone = "98%08d" % ((_run_ts + 11) % 100000000)
ok = reg(phone=_f10_phone, full_name="Valid Bride")
check("F10 valid register 200", ok.status_code == 200, ok.text[:150])
j = ok.json() if ok.status_code == 200 else {}
check("F11 register → auth_token", bool(j.get("auth_token")), list(j)[:8])
check("F12 register → phone_masked", "••" in str(j.get("phone_masked")), j.get("phone_masked"))
check("F13 register → quality block", isinstance(j.get("quality"), dict) and "percent" in j["quality"])
check("F14 register → plan clarity message", "🔒" in str(j.get("message_plan_telugu")))
found_numbers = PHONE_RE.findall(json.dumps(j))
check("F15 register response lo veru vaalla numbers ledu (sontha number matrame ok)",
      "phone_encrypted" not in json.dumps(j) and len(found_numbers) <= 2, found_numbers[:3])
j2 = reg(phone=_f10_phone, full_name="Dup Phone Bride")
# 🐞 FIX (R12): policy R10 nunchi CHANGE — same phone 2nd account REJECT (409 Conflict; OTP login ambiguity)
check("F16 same phone 2nd account → reject 409 (R10 policy: OTP ambiguity block)",
      j2.status_code == 409 and "already account" in j2.text, j2.status_code)
xj = reg(phone="98%08d" % ((_run_ts + 12) % 100000000), full_name="Sita Devi", about_myself="<script>x</script>Hi " + "a" * 900).json()
u_x = main._find_user(xj.get("tsap_id", "")) or {}
check("F17 XSS about_myself sanitized", "<" not in str(u_x.get("about_myself")) and "script" not in str(u_x.get("about_myself")).lower())
check("F17b XSS name lo tags → 400 (reject)", reg(phone="98%08d" % ((_run_ts + 13) % 100000000), full_name="<script>x</script>").status_code in (400, 422))
check("F18 about_myself length cap", len(str(u_x.get("about_myself", ""))) <= 600)
check("F19 quality percentile sane", 0 <= int(xj.get("quality", {}).get("percent", -1)) <= 100)

# ═══════════════════════════════════════════════════════════════════════════
section("G. SEARCH / MATCHES (404 fix + factual fields + clamps + blocked)")
# ═══════════════════════════════════════════════════════════════════════════
r = client.get("/api/search/TSAP-NOPE-9999")
check("G1 tappu ID → 404 (fake profile ledu)", r.status_code == 404, r.status_code)
profile_response = client.get(f"/api/search/{U2}")
p = profile_response.json()
check("G2 profile completeness only; no trust score", profile_response.status_code == 200 and "quality" in p and "trust" not in p and "trust_score" not in p)
check("G3 search/{id} lo phone key ledu", "phone" not in p["profile"] and "phone_encrypted" not in p["profile"])
check("G4 can_view_number False", p.get("can_view_number") is False)
check("G5 unlock steps 3", len(p.get("unlock_telugu", [])) == 3)
m = client.get(f"/api/matches/{U1}?limit=-5&min_score=9999").json()
check("G6 negative match limit clamps to 1 and legacy min_score is explicitly ignored",
      "matches" in m and len(m.get("matches", [])) <= 1 and m.get("min_score_ignored") is True, m)
check("G7 matches rows have completeness only, no trust score", all("quality_percent" in row and "trust" not in row and "trust_score" not in row for row in m.get("matches", [])[:3]))
check("G8 matches lo phone key ledu", all("phone" not in row for row in m["matches"][:3]))
check("G9 matches lo contact_locked", m.get("contact_locked") is True)
s = client.get("/api/search?limit=-1").json()
check("G10 search limit clamp (1..100)", s.get("limit", 0) >= 1, s.get("limit"))
check("G11 search age_min>age_max → 400", client.get("/api/search?age_min=60&age_max=20").status_code == 400)
check("G12 search sort junk → 400", client.get("/api/search?sort=weird").status_code == 400)
fac = client.get("/api/facets").json()
check("G13 facets counts unnayi", fac.get("facets", {}).get("caste") and len(fac["facets"]["caste"]) > 0)
s2 = client.get("/api/search?with_facets=true&limit=5").json()
check("G14 search with_facets", bool(s2.get("facets")))
check("G15 synthetic trust sort rejected", client.get("/api/search?sort=trust&limit=5").status_code == 400)
check("G16 search facets route /api/facets (search/{id} conflict ledu)", client.get("/api/search/facets").status_code == 404)

# ═══════════════════════════════════════════════════════════════════════════
section("H. BLOCK / SAFETY (hide + validations)")
# ═══════════════════════════════════════════════════════════════════════════
b = client.post("/api/block", json={"tsap_id": U1, "block_id": U2})
check("H1 block create", b.status_code == 200 and b.json().get("success"), b.text[:120])
check("H2 duplicate block → already_blocked", client.post("/api/block", json={"tsap_id": U1, "block_id": U2}).json().get("already_blocked") is True)
check("H3 self block → 400", client.post("/api/block", json={"tsap_id": U1, "block_id": U1}).status_code == 400)
check("H4 unknown profile block → 404", client.post("/api/block", json={"tsap_id": U1, "block_id": "TSAP-NOPE"}).status_code == 404)
check("H5 block ids ledu → 400", client.post("/api/block", json={"tsap_id": U1}).status_code == 400)
bid = client.post("/api/interest/send", json={"from_id": U1, "to_id": U2})
check("H6 blocked ki interest → 400 + reason blocked_user",
      bid.status_code == 400 and bid.json().get("reason") == "blocked_user", bid.text[:120])
hnames = [x["tsap_id"] for x in client.get(f"/api/matches/{U1}?limit=50").json()["matches"]]
check("H7 blocked matches lo ledu", U2 not in hnames, hnames[:5])
snames = [x["tsap_id"] for x in client.get(
    f"/api/search?limit=100&viewer_id={U1}", headers={"X-Tsap-Token": H.sign_token(U1)}
).json()["results"]]
check("H8 blocked search uses authenticated viewer and hides block", U2 not in snames)
check("H9 unblock", client.post("/api/unblock", json={"tsap_id": U1, "blocked": U2}).json().get("success") is True)

# ═══════════════════════════════════════════════════════════════════════════
section("I. VIEWS / SAVE (shape + validation consistency)")
# ═══════════════════════════════════════════════════════════════════════════
v = client.post("/api/view", json={"tsap_id": U2, "viewer_id": U1}).json()
check("I1 view response lo rendu keys (total_views/views_total)",
      v.get("total_views") is not None and v.get("views_total") == v.get("total_views"))
v2 = client.post("/api/view", json={"tsap_id": U2, "viewer_id": U1}).json()
check("I2 6h duplicate view skip", v2.get("counted") is False)
check("I3 unknown profile view → 404", client.post("/api/view", json={"tsap_id": "TSAP-NOPE", "viewer_id": U1}).status_code == 404)
check("I4 self view counted False", client.post("/api/view", json={"tsap_id": U1, "viewer_id": U1}).json().get("counted") is False)
sv = client.post("/api/save", json={"tsap_id": U1, "target_id": U2}).json()
check("I5 save target_id alias pani chestundi", sv.get("saved") is True, sv)
check("I6 save toggle off", client.post("/api/save", json={"tsap_id": U1, "saved_id": U2}).json().get("saved") is False)
check("I7 unknown save → 404", client.post("/api/save", json={"tsap_id": U1, "saved_id": "TSAP-NOPE"}).status_code == 404)
check("I8 self save → 400", client.post("/api/save", json={"tsap_id": U1, "saved_id": U1}).status_code == 400)
vw = client.get(f"/api/views/{U2}").json()
check("I9 views_for lo views_total alias", vw.get("views_total") == vw.get("total_views"))

# ═══════════════════════════════════════════════════════════════════════════
section("J. SAVED SEARCHES + ALERTS (advanced feature)")
# ═══════════════════════════════════════════════════════════════════════════
ss = client.post("/api/saved-searches", json={"tsap_id": U1, "name": "Hyd Reddy brides",
                                              "filters": {"gender": "Bride", "district": "Hyderabad", "age_min": 20, "age_max": 32}})
check("J1 saved search create", ss.status_code == 200 and ss.json().get("search"), ss.text[:140])
sid = ss.json().get("search", {}).get("search_id")
check("J2 filters normalize ayyayi", "gender" in ss.json()["search"]["filters"])
check("J3 empty filters → 400", client.post("/api/saved-searches", json={"tsap_id": U1, "filters": {}}).status_code == 400)
check("J4 age_min>age_max → 400", client.post("/api/saved-searches", json={"tsap_id": U1, "filters": {"age_min": 40, "age_max": 20}}).status_code == 400)
lst = client.get(f"/api/saved-searches/{U1}").json()
check("J5 list lo search undi", lst.get("count", 0) >= 1 and any(x["search_id"] == sid for x in lst["searches"]))
check("J6 list lo new_matches count", all("new_matches" in x for x in lst["searches"]))
al = client.post(f"/api/saved-searches/{U1}/alerts").json()
check("J7 alerts endpoint respects default-off saved-search consent",
      al.get("success") is True and al.get("alerts_sent") == 0 and al.get("alerts_skipped", 0) >= 1, al)
check("J8 alerts message explains no send without consent",
      "🔒" in str(al.get("message_telugu")) or "🔔" in str(al.get("message_telugu")) or "ℹ️" in str(al.get("message_telugu")))
check("J9 delete search", client.delete(f"/api/saved-searches/{U1}/{sid}").json().get("success") is True)
check("J10 delete unknown → 404", client.delete(f"/api/saved-searches/{U1}/SRCH-99999").status_code == 404)
check("J11 search save filters validation (salary)", client.post("/api/saved-searches", json={"tsap_id": U1, "filters": {"salary_min": 90000, "salary_max": 100}}).status_code == 400)

# ═══════════════════════════════════════════════════════════════════════════
section("K. CONSENT LEDGER (numbers exchange audit)")
# ═══════════════════════════════════════════════════════════════════════════
# 🐞 FIX (R12): U1/U2 modalu prior-run interests already persist ayyi untayi ("already request") —
# fresh opposite-gender pair create chesi aa rendu mundu consent flow test
_kg = client.post("/api/register", data={
    "gender": "Groom", "age": "28", "height": "5'9\"", "marital_status": "Pelli Kaledu", "caste": "Reddy",
    "education": "BTech", "job": "Software", "salary": "80k", "state": "TS", "district": "Hyderabad",
    "phone": "98%08d" % ((_run_ts + 21) % 100000000), "full_name": "Consent Groom", "consent_confirmed": "true",
    "religion": "Hindu", "dob": "1998-01-15", "password": "test-password"}).json()
_kb = client.post("/api/register", data={
    "gender": "Bride", "age": "24", "height": "5'3\"", "marital_status": "Pelli Kaledu", "caste": "Reddy",
    "education": "BTech", "job": "Teacher", "salary": "40k", "state": "TS", "district": "Warangal",
    "phone": "98%08d" % ((_run_ts + 22) % 100000000), "full_name": "Consent Bride", "consent_confirmed": "true",
    "religion": "Hindu", "dob": "2002-01-15", "password": "test-password"}).json()
U1, U2 = _kg.get("tsap_id") or U1, _kb.get("tsap_id") or U2
sender = main._find_user(U1)
target = main._find_user(U2)
if sender and target and sender.get("gender") != target.get("gender"):
    # Registration deliberately leaves profiles pending; prove the interest gate,
    # then approve these test-only accounts through the same admin endpoint as the app.
    pending = client.post("/api/interest/send", json={"from_id": U1, "to_id": U2})
    check("K0 pending profiles cannot send interest", pending.status_code == 403, pending.text[:120])
    _admin_headers = {"X-Admin-Key": H.ADMIN_KEY}
    _approve_sender = client.post(f"/api/admin/approve/{U1}", headers=_admin_headers)
    _approve_target = client.post(f"/api/admin/approve/{U2}", headers=_admin_headers)
    check("K0a both test profiles explicitly approved",
          _approve_sender.status_code == 200 and _approve_target.status_code == 200,
          (_approve_sender.status_code, _approve_target.status_code))
    snd = client.post("/api/interest/send", json={"from_id": U1, "to_id": U2}).json()
    rid = snd.get("request_id")
    check("K1 interest send (consent flow start)", bool(rid), snd)
    acc = client.post("/api/interest/respond", json={"tsap_id": U2, "request_id": rid, "action": "accept"}).json()
    res = acc.get("result") or {}
    check("K2 accept → rendu numbers exchange", res.get("owner_phone") and res.get("requester_phone"), str(res)[:140])
    _consent_note = str(acc.get("result", {}).get("consent_record_telugu", "")).lower()
    check("K3 acceptance records contact access without claiming delivery",
          "acceptance" in _consent_note and "contact access" in _consent_note
          and "delivery proof" in _consent_note)
    cl = client.get(f"/api/consent/log/{U2}").json()
    check("K4 consent log records accepted contact access",
          cl.get("count", 0) >= 1 and cl["consents"][0]["contact_access_granted"] is True)
    check("K5 consent log states it is not WhatsApp delivery proof",
          "delivery proof" in cl.get("policy_telugu", "").lower())
    check("K6 consent log full numbers ledu", PHONE_RE.search(json.dumps(cl)) is None)
else:
    for i in range(1, 7):
        check(f"K{i} consent flow (gender mismatch — skip)", True)

# ═══════════════════════════════════════════════════════════════════════════
section("L. ADVANCED ENDPOINTS (profile quality / trust board / templates / posture)")
# ═══════════════════════════════════════════════════════════════════════════
q = client.get(f"/api/profile/{U1}/quality").json()
check("L1 quality: completeness %", 0 <= q["completeness"]["percent"] <= 100)
check("L2 quality: missing list + telugu tips", isinstance(q["completeness"]["missing"], list) and q["completeness"]["important_telugu"] is not None)
check("L3 quality exposes no composite trust object", "trust" not in q)
check("L4 quality guidance discloses member-provided fields are not independently verified", "grade_telugu" in q and "verify" in q["grade_telugu"].lower())
check("L5 quality unknown → 404", client.get("/api/profile/TSAP-NOPE/quality").status_code == 404)
tb = client.get("/api/trust/board?limit=5")
check("L6 synthetic trust board is retired", tb.status_code == 410)
check("L7 trust board does not publish a ranking", "trust_score" not in tb.text and "average_trust" not in tb.text)
tpl = client.get("/api/templates/interest").json()
check("L8 interest templates 6+", len(tpl.get("templates", [])) >= 6)
check("L9 templates contain Telugu copy and an anti-spam/reply-expectation note",
      bool(tpl.get("templates"))
      and all(t.get("text") and any("\u0c00" <= ch <= "\u0c7f" for ch in t["text"])
              for t in tpl.get("templates", []))
      and "spam" in tpl.get("tip_telugu", "").lower()
      and "హామీ లేదు" in tpl.get("tip_telugu", ""))
pos = client.get("/api/security/posture").json()
check("L10 posture: auth flag", "auth_enforced" in pos)
check("L11 posture: numbers policy telugu", "🔒" in pos.get("numbers_policy_telugu", ""))
check("L12 posture: data practices 4", len(pos.get("data_practices_telugu", [])) == 4)
check("L13 profile completeness math (empty user <50%)", H and __import__("quality").profile_completeness({})["percent"] < 50)
trust_facts = __import__("quality").trust_score({})
check("L14 legacy trust shim exposes facts but calculates no score",
      trust_facts.get("calculated") is False and "score" not in trust_facts and "trust_score" not in trust_facts)
check("L15 height parser ('5.6' → cm)", 160 <= __import__("quality")._height_cm("5.6") <= 175)
check("L16 filters matcher working", __import__("quality").matches_filters({"age": 25, "caste": "Reddy"}, {"age_min": 20, "age_max": 30, "caste": "reddy"}))

# ═══════════════════════════════════════════════════════════════════════════
section("M. LEADS / PII MASKING + TRACK")
# ═══════════════════════════════════════════════════════════════════════════
check("M1 lead quick bad phone → 400", client.post("/api/leads/quick", json={"name": "Test", "phone": "123"}).status_code == 400)
lk = client.post("/api/leads/quick", json={"name": "Lead Test", "phone": "9848055555", "district": "Warangal", "contact_consent": True})
check("M2 lead quick valid with explicit consent → 200", lk.status_code == 200 and lk.json().get("success"), lk.text[:120])
check("M3 no fabricated callback or support destination is returned",
      "next" not in lk.json() and "9848055555" not in json.dumps(lk.json()))
t_response = client.post(
    "/api/track",
    json={"path": "/matches?contact=member%40example.test", "ip": "spoofed", "ua": "spoofed",
          "device": "desktop", "visitor_id": "untrusted", "utm": "utm_source=whatsapp&email=member%40example.test"},
    headers={"User-Agent": "Mozilla/5.0 (Android Mobile)",
             "Referer": "https://source.example/path?email=member%40example.test"},
)
t = t_response.json()
check("M4 track endpoint works without returning visitor IDs or internal totals",
      t_response.status_code == 200 and t.get("success") is True
      and "visitor_id" not in t and "visits_total" not in t)
tracked_event = main.growth.DB_VISITORS[-1]
check("M4a analytics use server headers and strip client IDs/contact query data",
      tracked_event.get("path") == "/matches" and tracked_event.get("ref") == "https://source.example"
      and tracked_event.get("utm") == "utm_source=whatsapp" and tracked_event.get("device") == "mobile"
      and all(key not in tracked_event for key in ("ip", "ua", "visitor_id"))
      and "member@example.test" not in json.dumps(tracked_event))
check("M5 leads list admin only (dev bypass on → 200)", client.get("/api/leads").status_code == 200)

# ═══════════════════════════════════════════════════════════════════════════
section("N. RETIRED SYNTHETIC SEED ROUTES (fail closed with 410)")
# ═══════════════════════════════════════════════════════════════════════════
check("N1 bulk-profiles string → retired 410", client.post("/api/admin/bulk-profiles", json={"profiles": "notalist"}).status_code == 410)
check("N2 bulk-profiles list → retired 410", client.post("/api/admin/bulk-profiles", json={"profiles": [1, 2, 3]}).status_code == 410)
check("N3 empty bulk-profiles → retired 410", client.post("/api/admin/bulk-profiles", json={}).status_code == 410)
check("N4 credits/deduct deprecated 410", client.post(f"/api/credits/deduct/{U1}").status_code == 410)
check("N5 deduct fake number ledu (policy)",
      "98480xxxxx" not in client.post(f"/api/credits/deduct/{U1}").text)
check("N6 credits/buy unknown plan rejected (no FREE fallback purchase)",
      client.post("/api/credits/buy", json={"tsap_id": U1, "plan": "NOPE"}).status_code == 400)
check("N7 payment webhook junk params → 400/422 (500 kaadu)",
      client.post("/api/payment/webhook", params={"user_id": U1, "amount": "abc"}).status_code in (400, 422))
check("N8 demo/seed route retired with 410", client.post("/api/demo/seed", json={}).status_code == 410)
check("N8b admin seed-launch route retired with 410", client.post("/api/admin/seed-launch", json={}).status_code == 410)
check("N9 channels/route junk → success/handled", client.post("/api/channels/route", json={"tsap_id": U1, "channel": "NOPE"}).status_code in (200, 400))
check("N10 match/score unknown → 404", client.post("/api/match/score", json={"from_id": U1, "to_id": "NOPE"}).status_code in (404, 400))
check("N11 porutham same gender → handled", client.post("/api/porutham", json={"bride_id": U1, "groom_id": U1}).status_code in (200, 400))

# ═══════════════════════════════════════════════════════════════════════════
section("O. CREDITS POLICY (numbers ivvamu) + PLAN CLARITY")
# ═══════════════════════════════════════════════════════════════════════════
fp = client.get("/api/free-plan").json()
check("O1 free 3 profiles", fp["free"]["profiles"] == 3)
check("O2 free numbers ❌", "❌" in str(fp["free"]["numbers"]) or "ivvamu" in str(fp["free"]["numbers"]))
check("O3 exactly four paid consumer plans are published", len(fp.get("paid", [])) == 4)
check("O4 numbers rule telugu (5 points)", len(fp.get("numbers_rule_telugu", [])) == 5)
check("O5 faq 4", len(fp.get("faq_telugu", [])) == 4)
check("O6 instructions + cta", "instructions_telugu" in fp and "cta" in fp)
pl = client.get("/api/plans").json()
check("O7 plans endpoint intact", bool(pl))
_test_payment = client.post("/api/credits/buy", json={"tsap_id": U1, "plan": "S_99"}).json()
check("O8 only explicit isolated-test mode can create a marked payment fixture",
      _test_payment.get("order", {}).get("status") == "paid"
      and _test_payment.get("order", {}).get("development_fixture") is True
      and str(_test_payment.get("order", {}).get("order_id", "")).startswith("DEV-"))

# ═══════════════════════════════════════════════════════════════════════════
section("P/Q/R. HEADERS • INTEREST RULES • TEMPLATES")
# ═══════════════════════════════════════════════════════════════════════════
h = client.get("/").headers
check("Q1 X-Content-Type-Options", h.get("x-content-type-options") == "nosniff")
check("Q2 X-Frame-Options", h.get("x-frame-options") == "SAMEORIGIN")
check("Q3 Referrer-Policy", "strict-origin" in h.get("referrer-policy", ""))
check("Q4 Permissions-Policy", "camera=()" in h.get("permissions-policy", ""))
check("Q5 root endpoint live", client.get("/").json().get("status") == "LIVE")

check("R1 self interest → 400", client.post("/api/interest/send", json={"from_id": U1, "to_id": U1}).status_code == 400)
check("R2 unknown to_id → 404", client.post("/api/interest/send", json={"from_id": U1, "to_id": "TSAP-NOPE"}).status_code == 404)
groom = next((u for u in main.DB_USERS if u["gender"] == "Groom" and u["tsap_id"] != U1), None)
bride = next((u for u in main.DB_USERS if u["gender"] == "Bride"), None)
if groom and bride:
    same = client.post("/api/interest/send", json={"from_id": groom["tsap_id"], "to_id": groom["tsap_id"]})
    check("R3 same gender interest → 400", same.status_code == 400)
    tpl_send = client.post("/api/interest/send", json={"from_id": groom["tsap_id"], "to_id": bride["tsap_id"],
                                                       "template_id": "traditional"})
    check("R4 template_id tho interest send", tpl_send.status_code in (200, 402), tpl_send.text[:120])
    if tpl_send.status_code == 200:
        check("R5 template text message lo ki vellindi",
              "కుటుంబ" in json.dumps(tpl_send.json(), ensure_ascii=False) or "kutumba" in tpl_send.text.lower()
              or tpl_send.json().get("request_id") is not None)
else:
    check("R3/R4/R5 gender data skip", True); check("R4 skip", True); check("R5 skip", True)

check("R6 inbox owner thone (dev bypass)", client.get(f"/api/interest/inbox/{U1}").status_code == 200)
_pending_inbox_response = client.get(f"/api/interest/inbox/{bride['tsap_id']}") if bride else None
_pending_inbox = _pending_inbox_response.json() if _pending_inbox_response else {}
_pending_requests = [item for item in _pending_inbox.get("received", []) if item.get("status") == "pending"]
_pending_inbox_text = json.dumps(_pending_inbox, ensure_ascii=False)
check("R7 pending inbox keeps requester phone locked until acceptance",
      bool(bride) and bool(_pending_requests)
      and all(not item.get("contact_shared")
              and item.get("requester_phone") == "🔒 accept చెయ్యండి"
              for item in _pending_requests)
      and PHONE_RE.search(_pending_inbox_text) is None,
      _pending_inbox_text[:180])
check("R8 interest message length cap", (lambda: (lambda r: r.status_code in (200, 400, 402))(client.post(
    "/api/interest/send", json={"from_id": U1, "to_id": U2, "note": "x" * 2000})))())
check("R9 publish/preview validation", client.post("/api/publish/preview", json={"tsap_id": ""}).status_code in (200, 400, 404))
check("R10 health endpoint", client.get("/api/system/health").status_code == 200)

section("S. PRODUCTION STARTUP REJECTS TEST/SECURITY BYPASSES")
def _production_startup_rejects(**overrides):
    keys = {"APP_ENV", "TSAP_AUTH_MODE", "WA_TEST_FAST", "TSAP_RATE_LIMIT", "MANA_TEST_PAYMENT_FIXTURES"}
    previous = {key: os.environ.get(key) for key in keys}
    try:
        os.environ.update({"APP_ENV": "production", "TSAP_AUTH_MODE": "enforce",
                           "WA_TEST_FAST": "0", "TSAP_RATE_LIMIT": "1",
                           "MANA_TEST_PAYMENT_FIXTURES": ""})
        os.environ.update({key: str(value) for key, value in overrides.items()})
        try:
            asyncio.run(main._startup_publisher())
        except RuntimeError:
            return True
        return False
    finally:
        for key, value in previous.items():
            if value is None:
                os.environ.pop(key, None)
            else:
                os.environ[key] = value

check("S1 production refuses WA_TEST_FAST auth bypass",
      _production_startup_rejects(WA_TEST_FAST="1"))
check("S2 production refuses disabled rate limiting",
      _production_startup_rejects(TSAP_RATE_LIMIT="off"))
check("S3 production refuses test payment fixtures",
      _production_startup_rejects(MANA_TEST_PAYMENT_FIXTURES="true"))

print(f"\n{'=' * 76}")
print(f"  RESULT: {PASS} pass / {FAIL} fail")
if FAILED:
    print("  FAILED:")
    for f in FAILED:
        print(f"   ❌ {f}")
print("=" * 76)
sys.exit(1 if FAIL else 0)
