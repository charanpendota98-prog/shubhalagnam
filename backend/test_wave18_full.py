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


from fastapi.testclient import TestClient  # noqa: E402
import main  # noqa: E402
from otp_channels import send_otp, _sms_send, _telegram_send  # noqa: E402
from telegram_bot import parse_start_ref  # noqa: E402
from testutil_paths import src_page  # noqa: E402  # App Router page.tsx + page-client.tsx aware

client = TestClient(main.app, raise_server_exceptions=False)
client.post("/api/demo/seed")
BASE = {"height": "5'5\"", "education": "BTech", "job": "Nurse", "salary": "40k",
        "state": "TS", "district": "Bhongir", "religion": "Hindu", "caste": "Yadav"}


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
r = reg("Wave Eighteen No Pw", "9963666603")
check("A4 no password still ok (API compat)", r.status_code == 200, r.status_code)
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
r = client.post("/api/auth/forgot", json={"phone": "9963666601"})
j = r.json()
check("A9 forgot → purpose reset + channel", r.status_code == 200 and j.get("purpose") == "reset" and j.get("channel"), j)
code = (main.DB_OTPS.get("9963666601") or {}).get("code", "")
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
check("B1 nothing configured → dev fallback", r["channel"] == "dev" and r["ok"] is False, r)
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
check("B7 otp_send returns channel", r.status_code == 200 and r.json().get("channel") == "dev", r.json())

# ═══════════════════════════════════════════════════════════════════════════
section("C–D. TEASERS + BOT PARSE")
# ═══════════════════════════════════════════════════════════════════════════
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
check("E2 register password validation+submit", "Password minimum 6 characters పెట్టండి" in reg_src
      and '"password"' in reg_src)
check("E3 99 nudge → pricing", "₹99 Sambandham" in reg_src and 'href="/pricing"' in reg_src)
lg_src = src_page("frontend/src/app/login/page.tsx")
check("E4 login tabs", '"password"' in lg_src and '"otp"' in lg_src and "Member Login" in lg_src)
check("E5 forgot+reset wired", "/api/auth/forgot" in lg_src and "/api/auth/reset" in lg_src
      and "Forgot password" in lg_src)
check("E6 password login wired", "/api/auth/login-password" in lg_src)
hg_src = src_page("frontend/src/components/HomeGrowth.tsx")
pg_src = src_page("frontend/src/app/page.tsx")
check("E7 growth strips", "TeaserStrip" in pg_src and "StoriesStrip" in pg_src
      and "ReligionsStrip" in pg_src and "FinalCta" in pg_src)
check("E8 blur+lock+CTA", "blur-[6px]" in hg_src and "Photo locked" in hg_src and "View full profile" in hg_src)
check("E9 religions 3 only", all(x in hg_src for x in ('"Hindu"', '"Muslim"', '"Christian"')))
cfg_src = src_page("frontend/src/lib/site-config.ts")
mp_src = src_page("frontend/src/app/matches/page.tsx")
pv_src = src_page("frontend/src/app/search/[id]/ProfileView.tsx")
check("E10 reveal deep-links", "unlock_" in cfg_src and "unlockBot(row.tsap_id)" in mp_src
      and "Full details + Number" in mp_src and "unlockBot(profile.tsap_id)" in pv_src)

print(f"\n{'=' * 76}\nRESULT: {PASS} pass / {FAIL} fail")
if FAILED:
    print("FAILED:", FAILED)
    sys.exit(1)
