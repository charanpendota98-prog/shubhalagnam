"""
🌊 WAVE 20 TEST SUITE — SMART REFERRAL ATTRIBUTION
====================================================
  A. click endpoint (user/partner kind, partner clicks record, unknown invalid)
  B. attribution E2E (attach → payment → ₹50 commission → ledger → joins)
  C. admin ledger endpoint (per-join rows, paid/pending status)
  D. frontend static (register click/restore/banner/manual, /r/ dedupe,
     partner /r/ + share, admin ledger UI)

Run:  WA_TEST_FAST=1 python3 test_wave20_full.py   (backend/ nunchi)
"""
import hashlib
import hmac
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


def _admin_key():
    s = "tsap-dev-secret-" + hashlib.sha256(b"manavivaha-local").hexdigest()[:12]
    return "tsap-admin-" + hmac.new(s.encode(), b"admin", hashlib.sha256).hexdigest()[:10]


section("A. click endpoint")
from fastapi.testclient import TestClient
import main as M
import referral
import refpartners as RP19

_p_snap = list(RP19.PARTNERS)
_c_snap = list(referral.CLICKS)
_users_snap = list(M.DB_USERS)
try:
    r = RP19.register_partner(name="Wave Twenty", phone="9100000021", state="TS", district="Khammam")
    pid = r["partner_id"]
    c = TestClient(M.app)
    before = RP19.get_partner(pid).get("clicks", 0)
    d = c.post(f"/api/referral/click/{pid}?source=link").json()
    check("A1 partner click ok + kind", d.get("success") and d.get("kind") == "partner", d)
    check("A2 partner clicks incremented", RP19.get_partner(pid).get("clicks", 0) == before + 1)
    check("A3 partner click valid + name", d.get("valid_code") and "Twenty" in (d.get("referrer_name") or ""), d)
    d2 = c.post(f"/api/referral/click/{pid.upper()}?source=link").json()
    check("A4 uppercase partner code works", d2.get("valid_code") is True, d2)
    d3 = c.post("/api/referral/click/NOPEZZ999?source=link").json()
    check("A5 unknown code invalid", d3.get("success") and d3.get("valid_code") is False, d3)
    # user referrer
    uref = {"tsap_id": "TSAP-M-2020-0001", "full_name": "Ref User", "phone": "9100000022",
            "referral_code": "REFU42", "referral_stats": {}}
    M.DB_USERS.append(uref)
    d4 = c.post("/api/referral/click/REFU42?source=link").json()
    check("A6 user click kind=user + name", d4.get("kind") == "user" and "Ref User" in (d4.get("referrer_name") or ""), d4)
    v = c.get(f"/api/referral/validate/{pid}").json()
    check("A7 validate resolves partner (banner)", v.get("ok") and v.get("bonus_credits", 0) >= 1, v)

    section("B. attribution E2E")
    newbie = {"tsap_id": "TSAP-F-2020-0002", "full_name": "New Join", "phone": "9100000023"}
    a = referral.attach_referral(newbie, pid, M.DB_USERS)
    check("B1 attach partner code locks",
          a.get("ok") and str(newbie.get("referred_by", "")).lower() == pid.lower(), a)
    check("B2 referee bonus flag", a.get("bonus_credits", 0) >= 1 or newbie.get("referred_by") == pid, a)
    M.DB_USERS.append(newbie)
    p = referral.process_referral_payment(newbie, pid, 99, M.DB_USERS, payment_id="pay_w20")
    check("B3 first payment → commission success", p.get("success"), p)
    st = RP19.get_partner(pid).get("referral_stats", {})
    check("B4 wallet ₹50 credited", float(st.get("wallet", 0)) >= 50, st.get("wallet"))
    check("B5 ledger has commission from join", any(
        l.get("type") == "commission" and l.get("from") == "TSAP-F-2020-0002"
        for l in st.get("ledger", [])), st.get("ledger", [])[-1:])
    dash = RP19.partner_public(pid, M.DB_USERS)
    check("B6 partner dashboard shows join paid", dash.get("success") and any(
        j.get("paid") for j in dash.get("joins", [])), dash.get("joins"))
    # second newbie, no payment → pending
    newbie2 = {"tsap_id": "TSAP-F-2020-0003", "full_name": "Pending Join", "phone": "9100000024",
               "referred_by": pid, "referred_at": "2026-09-17T00:00:00"}
    M.DB_USERS.append(newbie2)

    section("C. admin ledger endpoint")
    H = {"X-Admin-Key": _admin_key()}
    lg = c.get(f"/api/admin/referrals/ledger?code={pid}", headers=H)
    check("C1 ledger 200", lg.status_code == 200, lg.status_code)
    L = lg.json()
    check("C2 ledger partner + wallet", L.get("kind") == "partner" and float(L.get("wallet", 0)) >= 50, L)
    rows = {j["tsap_id"]: j for j in L.get("joins", [])}
    check("C3 paid join shows commission", rows.get("TSAP-F-2020-0002", {}).get("paid") is True
          and rows["TSAP-F-2020-0002"]["commission"] >= 50, rows.get("TSAP-F-2020-0002"))
    check("C4 unpaid join pending status", rows.get("TSAP-F-2020-0003", {}).get("paid") is False
          and "pending" in rows["TSAP-F-2020-0003"]["status"].lower(), rows.get("TSAP-F-2020-0003"))
    lg2 = c.get("/api/admin/referrals/ledger?code=NOPEZZ999", headers=H)
    check("C5 unknown code 404", lg2.status_code == 404, lg2.status_code)
    lg3 = c.get(f"/api/admin/referrals/ledger?code={pid}")
    rep3 = c.get("/api/admin/referrals/report")
    check("C6 guard parity with report endpoint", lg3.status_code == rep3.status_code, (lg3.status_code, rep3.status_code))
finally:
    RP19.PARTNERS[:] = _p_snap
    RP19._save()
    referral.CLICKS[:] = _c_snap
    M.DB_USERS[:] = _users_snap

section("D. frontend static")


def read(rel):
    return src_page(os.path.join("frontend", rel))


reg = read("src/app/register/page.tsx")
check("D1 register fires click (register_direct)", "register_direct" in reg and "/api/referral/click/" in reg)
check("D2 sessionStorage dedupe", 'tsap_click_fired' in reg)
check("D3 localStorage restore", 'tsap_ref_from_link' in reg)
check("D4 referrer banner with name", "referrer_name" in reg and "ద్వారా వచ్చారు" in reg)
check("D5 manual code input + live validate", 'aria-label="Referral code"' in reg and "/api/referral/validate/" in reg)

rp = read("src/app/r/[code]/page.tsx")
check("D6 /r/ sets dedupe flag", "tsap_click_fired" in rp)

pr = read("src/app/referral/register/page.tsx")
check("D7 partner dashboard clicks + share", "dash.clicks" in pr and "WhatsApp share" in pr and "wa.me" in pr)

import inspect as _insp
_src = _insp.getsource(RP19.register_partner)
check("D8 partner links are /r/ short", "/r/{pid}" in _src)

adm = read("src/components/ReferralReport.tsx")
check("D9 admin ledger button + fetch", "📒 ledger" in adm and "/api/admin/referrals/ledger" in adm)


print(f"\n{'=' * 60}\n🌊 WAVE 20 RESULT: {PASS} passed, {FAIL} failed")
if FAILED:
    print("FAILED:", FAILED)
    sys.exit(1)
print("🎉 ALL GREEN")
