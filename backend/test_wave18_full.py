"""
🌊 WAVE 18 TEST SUITE — PASSWORD AUTH + FREE OTP + TEASERS + BOT REVEAL + GROWTH UI
====================================================================================
  A. password (register/login/lock/forgot/reset)
  B. otp channels (free fallback chain)
  C. home teasers (blur, no PII, approved-only)
  D. bot unlock_ deep-link parse
  E. frontend static (login tabs, password field, growth, reveal buttons)

Run:  WA_TEST_FAST=1 python3 test_wave18_full.py   (backend/ nunchi)
"""
import os
import sys

os.environ.setdefault("WA_TEST_FAST", "1")
os.environ.setdefault("OTP_DEV_MODE", "true")
os.environ.setdefault("WA_LONG_PAUSE_CHANCE", "0")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from test_storage import isolate_test_stores  # noqa: E402
isolate_test_stores("wave18")

PASS, FAIL, FAILED = 0, 0, []
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ABOUT_OK = ("Nenu staff nurse ni, Bhongir lo untanu. Simple family, manchi values. "
            "Life partner kosam chustunnanu.")


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
        print(f"  ❌ {name} :: {str(extra)[:200]}")


from testutil_client import TestClient  # noqa: E402
import main  # noqa: E402
from otp_channels import send_otp, _sms_send, _telegram_send  # noqa: E402
from telegram_bot import parse_start_ref  # noqa: E402
from testutil_paths import src_page  # noqa: E402  # App Router page.tsx + page-client.tsx aware

client = TestClient(main.app, raise_server_exceptions=False)
# Tests use isolated local fixtures only; production demo seeding is intentionally disabled.
BASE = {"height": "5'5\"", "dob": "1999-06-01", "password": "test-profile-password",
        "education": "BTech", "job": "Nurse", "salary": "40k",
        "state": "TS", "district": "Hyderabad", "religion": "Hindu", "caste": "Yadav"}


def reg(name, phone, **over):
    d = dict(BASE, gender="Bride", age="27", phone=phone, full_name=name,
             marital_status="Pelli Kaledu", family_status="Middle Class",
             about_myself=ABOUT_OK)
    d.update(over)
    return client.post("/api/register", data=d)


# ═══════════════════════════════════════════════════════════════════════════
section("A. PASSWORD AUTH")
# ═══════════════════════════════════════════════════════════════════════════
r = reg("Wave Eighteen Pwd One", "9963666601", password="laxmi123")
TID = r.json().get("tsap_id", "")
u = next((x for x in main.DB_USERS if x.get("tsap_id") == TID), {})
check("A1 register+password 200 + pbkdf2 hash", r.status_code == 200 and u.get("password_hash", "").startswith("pbkdf2$"),
      (r.status_code, u.get("password_hash", "")[:20]))
check("A2 plaintext never stored", "laxmi123" not in str(u), "LEAK!")
r = reg("Wave Eighteen Short Pw", "9963666602", password="abc")
check("A3 short password 400", r.status_code == 400, r.status_code)
r = reg("Wave Eighteen No Pw", "9963666603", password="")
check("A4 missing password is rejected", r.status_code == 400, r.status_code)
r = client.post("/api/auth/login-password", json={"phone": "9963666601", "password": "laxmi123"})
check("A5 login-password ok + token", r.status_code == 200 and bool(r.json().get("auth_token")), r.status_code)
r = client.post("/api/auth/login-password", json={"phone": "9963666601", "password": "tappu123"})
check("A6 wrong password 401", r.status_code == 401, r.status_code)
r = client.post("/api/auth/login-password", json={"phone": "9963666603", "password": "emi1234"})
check("A7 no-password account → 401 (OTP vadandi)", r.status_code == 401, r.status_code)
for _ in range(4):
    client.post("/api/auth/login-password", json={"phone": "9963666601", "password": "tappu123"})
r = client.post("/api/auth/login-password", json={"phone": "9963666601", "password": "tappu123"})
check("A8 5 wrong → 429 lock", r.status_code == 429, r.status_code)

# Test-only transport stub: exercise OTP reset without sending to a phone or exposing a code.
_TEST_OTP_CODES = {}
def _capture_test_otp(phone, code, users):
    _TEST_OTP_CODES[str(phone)] = str(code)
    return {"ok": True, "channel": "test-only"}
main.otp_channel_send = _capture_test_otp

r = client.post("/api/auth/forgot", json={"phone": "9963666601"})
j = r.json()
check("A9 forgot → purpose reset + channel", r.status_code == 200 and j.get("purpose") == "reset" and j.get("channel"), j)
code = _TEST_OTP_CODES.get("9963666601", "")
r = client.post("/api/auth/reset", json={"phone": "9963666601", "code": "0000", "new_password": "kotha789"})
check("A10 reset wrong OTP 400", r.status_code == 400, r.status_code)
r = client.post("/api/auth/reset", json={"phone": "9963666601", "code": code, "new_password": "kotha789"})
check("A11 reset ok", r.status_code == 200 and bool(r.json().get("auth_token")), (r.status_code, str(r.json())[:100]))
r = client.post("/api/auth/login-password", json={"phone": "9963666601", "password": "kotha789"})
check("A12 new password works + lock cleared", r.status_code == 200, r.status_code)
r = client.post("/api/auth/reset", json={"phone": "9963000999", "code": "1234", "new_password": "kotha789"})
check("A13 reset without OTP 400", r.status_code == 400, r.status_code)

# ═══════════════════════════════════════════════════════════════════════════
section("B. OTP CHANNELS (FREE CHAIN)")
# ═══════════════════════════════════════════════════════════════════════════
os.environ.pop("WHATSAPP_MODE", None)
os.environ.pop("BOT_TOKEN", None)
os.environ.pop("MSG91_KEY", None)
os.environ.pop("FAST2SMS_KEY", None)
r = send_otp("9963666601", "1234", main.DB_USERS)
check("B1 no configured provider fails closed without returning a code",
      r["channel"] == "none" and r["ok"] is False, r)
check("B2 tried chain recorded", set(r.get("tried", {})) >= {"wa", "telegram", "sms"}, r.get("tried"))
os.environ["WHATSAPP_MODE"] = "bridge"
r = send_otp("9963666601", "1234", main.DB_USERS)
check("B3 bridge on → wa FREE channel", r["ok"] is True and r["channel"] == "wa", r)
os.environ.pop("WHATSAPP_MODE", None)
r = _telegram_send("9963666601", "x", main.DB_USERS)
check("B4 telegram no token → honest detail", r["ok"] is False and "token" in r["detail"], r)
r = _sms_send("9963666601", "x")
check("B5 sms no key → honest detail", r["ok"] is False and "key" in r["detail"].lower(), r)
os.environ["OTP_CHANNELS"] = "sms,wa"
r = send_otp("9963666601", "1234", main.DB_USERS)
check("B6 custom order respected", list(r.get("tried", {})) == ["sms", "wa"], r.get("tried"))
os.environ["OTP_CHANNELS"] = "wa,telegram,sms"
r = client.post("/api/otp/send", json={"phone": "9963666610"})
check("B7 API uses only the test transport in this isolated suite",
      r.status_code == 200 and r.json().get("channel") == "test-only", r.json())

# ═══════════════════════════════════════════════════════════════════════════
section("C–D. TEASERS + BOT PARSE")
# ═══════════════════════════════════════════════════════════════════════════
approved_test_profile = main._find_user(TID)
if approved_test_profile:
    approved_test_profile["is_approved"] = True
NTID = reg("Wave Eighteen Unapproved", "9963666611").json().get("tsap_id", "")
t = client.get("/api/home/teasers?limit=6").json()
ids = [x.get("tsap_id") for x in t.get("teasers", [])]
check("C1 teasers count + blur flag", t.get("count", 0) > 0 and all(x.get("blur") for x in t.get("teasers", [])), t.get("count"))
check("C2 no phone/photo leak", not any((x.get("phone") or x.get("photo_url")) for x in t.get("teasers", [])), "LEAK!")
check("C3 unapproved excluded", NTID not in ids, ids[:4])
check("C4 CTA telugu push", "REGISTER" in t.get("cta_telugu", ""), t.get("cta_telugu"))
check("D1 unlock_ parse", parse_start_ref("/start unlock_TSAP-F-2025-1042") == {
    "raw": "unlock_TSAP-F-2025-1042", "kind": "unlock", "value": "TSAP-F-2025-1042"},
    parse_start_ref("/start unlock_TSAP-F-2025-1042"))
check("D2 old refs intact", parse_start_ref("/start ch_reddy")["kind"] == "channel"
      and parse_start_ref("/start ref_9")["kind"] == "referral"
      and parse_start_ref("/start TSAP-F-1")["kind"] == "profile"
      and parse_start_ref("/start")["kind"] == "plain")

# ═══════════════════════════════════════════════════════════════════════════
section("E. FRONTEND STATIC")
# ═══════════════════════════════════════════════════════════════════════════
F = os.path.join(ROOT, "frontend")
reg_src = src_page("frontend/src/app/register/page.tsx")
check("E1 register password field+show/hide", "Minimum 6 characters" in reg_src and "Show" in reg_src)
check("E2 registration validates password length and submits it",
      "Password must contain at least 6 characters" in reg_src
      and '"password"' in reg_src)
check("E3 99 nudge → pricing", "₹99 Sambandham" in reg_src and 'href="/pricing"' in reg_src)
lg_src = src_page("frontend/src/app/login/page.tsx")
check("E4 login tabs", '"password"' in lg_src and '"otp"' in lg_src and "Member Login" in lg_src)
check("E5 forgot+reset wired", "/api/auth/forgot" in lg_src and "/api/auth/reset" in lg_src
      and "Forgot password" in lg_src)
check("E6 password login wired", "/api/auth/login-password" in lg_src)
pg_src = src_page("frontend/src/app/page.tsx")
spotlight_src = src_page("frontend/src/components/ProfilesOfTheDay.tsx")
check("E7 homepage keeps the selected hero and real spotlight module",
      "CinematicHero" in pg_src and "ProfilesOfTheDay" in pg_src
      and "CinematicGallery" not in pg_src and "WhyChooseUs" not in pg_src)
check("E8 spotlight is live-data-only and hidden when no reviewed placement exists",
      'fetch("/api/spotlight/active?limit=6"' in spotlight_src
      and "profiles.length === 0)) return null" in spotlight_src)
check("E9 homepage does not seed sample spotlight profiles",
      "setProfiles(items.filter" in spotlight_src and "demo" not in spotlight_src.lower())
pv_src = src_page("frontend/src/app/search/[id]/ProfileView.tsx")
check("E10 contact access remains owner-consent-gated; legacy bot unlock links stay absent",
      'apiPost<Row>("/api/interest/send"' in pv_src and "Owner acceptance" in pv_src
      and "unlock_" not in pv_src)

print(f"\n{'=' * 76}\nRESULT: {PASS} pass / {FAIL} fail")
if FAILED:
    print("FAILED:", FAILED)
    sys.exit(1)
