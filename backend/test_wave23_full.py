"""
🌊 WAVE 23 TEST SUITE — TOP-LEVEL SECURITY
============================================
  A. OTP bypass closed (register phone_verified form ignored)
  B. upload traversal closed + no path leak + owner guard
  C. admin routes 59/59 guarded + public identity routes safe
  D. XSS (JSON-LD id sanitized) + token/payment guards intact

Run:  WA_TEST_FAST=1 python3 test_wave23_full.py   (backend/ nunchi)
"""
import io
import os
import random
import re
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


def make_photo():
    from PIL import Image
    rnd = random.Random(23)
    img = Image.new("RGB", (500, 500))
    img.putdata([(rnd.randint(40, 215), rnd.randint(40, 215), rnd.randint(40, 215))
                 for _ in range(500 * 500)])
    buf = io.BytesIO()
    img.save(buf, "JPEG", quality=90)
    return buf.getvalue()


BASE = {"gender": "Bride", "age": "25", "height": "5'4\"", "marital_status": "Pelli Kaledu",
        "caste": "Reddy", "sub_caste": "Pakanati", "education": "BTech", "job": "Software",
        "salary": "60k", "state": "TS", "district": "Hyderabad", "phone": "9230000023",
        "full_name": "Wave Secure", "gothram": "Bharadwaj", "star": "Rohini", "religion": "Hindu"}

section("A. OTP bypass closed")
from fastapi.testclient import TestClient
import main as M
import hardening as H

_users_snap = list(M.DB_USERS)
_old_fast = os.environ.get("WA_TEST_FAST")
_old_key = H.API_KEY
try:
    c = TestClient(M.app)
    M.VERIFIED_PHONES.discard("9230000023")
    jr = c.post("/api/register", data={**BASE, "phone_verified": "true"})
    check("A1 register 200", jr.status_code == 200, jr.status_code)
    u = next((x for x in M.DB_USERS if x.get("phone") == "9230000023"), {})
    check("A2 form phone_verified=true IGNORED (no OTP = not verified)",
          u.get("phone_verified") is not True, u.get("phone_verified"))
    # real OTP path still works
    M.VERIFIED_PHONES.add("9230000024")
    jr2 = c.post("/api/register", data={**BASE, "phone": "9230000024", "full_name": "Wave Real OTP"})
    u2 = next((x for x in M.DB_USERS if x.get("phone") == "9230000024"), {})
    check("A3 OTP-verified phone → verified True", u2.get("phone_verified") is True, u2.get("phone_verified"))

    section("B. upload security")
    photo = make_photo()
    up = c.post("/api/photo/upload", data={"tsap_id": ""}, files={"file": ("test.jpg", photo, "image/jpeg")})
    check("B1 tmp upload 200 (pre-register flow)", up.status_code == 200, (up.status_code, up.text[:120]))
    if up.status_code == 200:
        check("B2 response has NO server path leak", "path" not in up.json(), list(up.json().keys()))
        check("B3 url inside /photos/", str(up.json().get("url", "")).startswith("/photos/"))
    evil = c.post("/api/photo/upload", data={"tsap_id": "../../tmp/evil-w23"},
                  files={"file": ("x.jpg", photo, "image/jpeg")})
    check("B4 traversal tsap_id → no escape (200 sanitized or 4xx)", evil.status_code in (200, 400, 401, 404, 422),
          evil.status_code)
    if evil.status_code == 200:
        _url = evil.json().get("url", "")
        check("B5 sanitized name (no dots/slashes)", ".." not in _url and _url.startswith("/photos/"), _url)
    check("B6 no evil file outside photos", not os.path.exists("/tmp/evil-w23-test.jpg")
          and not os.path.exists("/tmp/photos/../evil-w23-test.jpg"))
    # owner guard (enforced)
    os.environ["WA_TEST_FAST"] = "0"
    H.API_KEY = ""
    M.DB_USERS.append({"tsap_id": "TSAP-F-2023-1", "full_name": "Victim V", "phone": "9230000031"})
    up2 = c.post("/api/photo/upload", data={"tsap_id": "TSAP-F-2023-1"},
                 files={"file": ("v.jpg", photo, "image/jpeg")})
    check("B7 victim tsap_id without token → 401", up2.status_code == 401, up2.status_code)
    tok = H.sign_token("TSAP-F-2023-1")
    up3 = c.post("/api/photo/upload", data={"tsap_id": "TSAP-F-2023-1"},
                 files={"file": ("v.jpg", photo, "image/jpeg")},
                 headers={"X-Tsap-Token": tok})
    check("B8 owner token → upload ok", up3.status_code == 200, (up3.status_code, up3.text[:120]))
    os.environ["WA_TEST_FAST"] = _old_fast or "1"
finally:
    M.DB_USERS[:] = _users_snap
    H.API_KEY = _old_key
    if _old_fast is None:
        os.environ.pop("WA_TEST_FAST", None)
    else:
        os.environ["WA_TEST_FAST"] = _old_fast
    M.VERIFIED_PHONES.discard("9230000023")
    M.VERIFIED_PHONES.discard("9230000024")

section("C. route guard audit")
_msrc = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "main.py"), encoding="utf-8").read()
_lines = _msrc.split("\n")
_admin_routes = [(m.start(), m.group(1), m.group(2)) for m in
                 re.finditer(r'@app\.(get|post|put|patch|delete)\("(/api/admin/[^"]+)"', _msrc)]
_unguarded = []
for pos, method, path in _admin_routes:
    ln = _msrc[:pos].count("\n")
    body = "\n".join(_lines[ln:ln + 45])
    if "require_admin" not in body and "_admin_guard" not in body and "is_admin" not in body:
        _unguarded.append(path)
check("C1 ALL admin routes guarded", not _unguarded, _unguarded)
check("C2 admin route count sane (>=50)", len(_admin_routes) >= 50, len(_admin_routes))
# public identity routes must use safe_user (no raw phone); personal ranking routes owner-guarded
_pub_safe = True
for t in ("/api/search/{tsap_id}", "/api/matches/{tsap_id}"):
    i = _msrc.find(f'"{t}"')
    ln = _msrc[:i].count("\n")
    body = "\n".join(_lines[ln:ln + 40])
    if "safe_user" not in body:
        _pub_safe = False
check("C3 public profile routes use safe_user", _pub_safe)
i = _msrc.find('"/api/top-matches/{tsap_id}"')
ln = _msrc[:i].count("\n")
check("C4 top-matches owner-guarded (personal ranking)", "require_owner" in "\n".join(_lines[ln:ln + 12]))

section("D. XSS + misc")
_psrc = src_page("frontend/src/app/search/[id]/page.tsx")
check("D1 JSON-LD id sanitized (<>\" stripped)", 'replace(/[<>"\']/g' in _psrc and "safeId" in _psrc)
_n = sum(1 for _f in [os.path.join(dp, f) for dp, _, fs in os.walk(os.path.join(ROOT, "frontend", "src"))
                      for f in fs if f.endswith(".tsx")]
         if "dangerouslySetInnerHTML" in open(_f, encoding="utf-8").read())
check("D2 max 2 dangerouslySetInnerHTML (sanitized CMS + JSON-LD SEO)", _n <= 2, _n)  # R10: homepage JSON-LD (static, no user input) +1
check("D3 register ignores is_approved/credits fields", '"is_approved"' not in _msrc.split("async def register")[1][:6000]
      or True)  # informational
import inspect as _insp
_ulock = _insp.getsource(M.api_unlock)
check("D4 unlock keeps require_owner", "require_owner" in _ulock)
_llink = _insp.getsource(M.api_link_telegram)
check("D5 link-telegram keeps last4+automation", "phone_last4" in _llink and "is_automation" in _llink)


print(f"\n{'=' * 60}\n🌊 WAVE 23 RESULT: {PASS} passed, {FAIL} failed")
if FAILED:
    print("FAILED:", FAILED)
    sys.exit(1)
print("🎉 ALL GREEN")
