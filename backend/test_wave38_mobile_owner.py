"""
WAVE 38 MOBILE+OWNER - Play-Store-ready PWA + push UI + owner dashboard.
===============================================================================
User picked: 1 (mobile app + push) AND 6 (owner dashboard).

M1 PWA files/markers: manifest, sw push handlers, PushBell, /me Alerts tab,
   assetlinks, playstore guide, VAPID env template, /owner page.
M2 push flow: subscribe -> renewed dup -> notify queued -> unsubscribe -> gone.
O1 owner summary shape (sections + int types) with key.
O2 owner auth: enforced noauth/wrong -> 403.
O3 wrong-method 405s + route guard.

Run: WA_TEST_FAST=1 /home/user/venv/bin/python test_wave38_mobile_owner.py
"""
import os
import sys
import uuid

RUN = uuid.uuid4().hex[:6].upper()

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


import main  # noqa: E402
from hardening import sign_token, ADMIN_KEY  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from testutil_paths import src_page  # noqa: E402  # App Router page.tsx + page-client.tsx aware

client = TestClient(main.app, raise_server_exceptions=False)
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
H_ADMIN = {"x-admin-key": ADMIN_KEY}

U1 = {"tsap_id": f"TSAP-F-2026-{RUN}1", "gender": "Bride", "full_name": "W38 Bride",
      "phone": "9300000001", "credits": 0, "plan": "FREE", "is_approved": True,
      "phone_verified": True, "age": 23, "caste": "Kamma", "district": "Guntur"}
main.DB_USERS.append(U1)
H1 = {"x-tsap-token": sign_token(U1["tsap_id"])}
EP = f"https://fcm.googleapis.com/fcm/send/w38-{RUN.lower()}"

# ===========================================================================
# M1 - PWA files/markers
# ===========================================================================
section("M1 - PWA + push + owner files")
mf = src_page("frontend/public/manifest.webmanifest")
check("M1 manifest shortcuts+maskable", '"shortcuts"' in mf and '"maskable"' in mf
      and '"start_url"' in mf)
sw = src_page("frontend/public/sw.js")
check("M1 sw push+click handlers", 'addEventListener("push"' in sw
      and 'addEventListener("notificationclick"' in sw, sw[:80])
check("M1 sw version bumped (v7 — R9)", "mv-v7" in sw)
pb = src_page("frontend/src/components/PushBell.tsx")
check("M1 PushBell wires 3 APIs", "/api/push/subscribe" in pb and "/api/push/unsubscribe" in pb
      and "/api/push/notify/" in pb and "pushManager" in pb)
me = src_page("frontend/src/app/me/page.tsx")
check("M1 /me Alerts tab", '"alerts"' in me and "PushBell" in me)
al = src_page("frontend/public/.well-known/assetlinks.json")
check("M1 assetlinks package", "in.manavivaha.app" in al)
check("M1 playstore guide", os.path.exists(os.path.join(ROOT, "PLAYSTORE-GUIDE-TELUGU.md")))
env = src_page(".env.example")
check("M1 VAPID env template", "VAPID_PUBLIC_KEY" in env and "VAPID_PRIVATE_KEY" in env)
check("M1 /owner page hidden (no nav link)",
      os.path.exists(os.path.join(ROOT, "frontend", "src", "app", "owner", "page.tsx"))
      and 'href="/owner"' not in src_page("frontend/src/components/SiteHeader.tsx"))

# ===========================================================================
# M2 - push flow
# ===========================================================================
section("M2 - push subscribe/notify/unsubscribe")
s1 = client.post("/api/push/subscribe", json={"tsap_id": U1["tsap_id"], "endpoint": EP,
                 "keys": {"p256dh": "k1", "auth": "a1"}, "ua": "w38"}, headers=H1).json()
check("M2 subscribe ok", s1.get("success") and s1.get("sub_id", "").startswith("PUSH-"), s1)
s2 = client.post("/api/push/subscribe", json={"tsap_id": U1["tsap_id"], "endpoint": EP,
                 "keys": {"p256dh": "k1", "auth": "a1"}}, headers=H1).json()
check("M2 duplicate endpoint renewed", s2.get("renewed") is True, s2)
n1 = client.post(f"/api/push/notify/{U1['tsap_id']}",
                 json={"title": "t38", "body": "b38-test-body", "url": "/me"}, headers=H1).json()
check("M2 notify queued", n1.get("success") and n1.get("queued", 0) >= 1
      and n1.get("mode") in ("live", "preview"), n1)
u1 = client.post("/api/push/unsubscribe", json={"tsap_id": U1["tsap_id"], "endpoint": EP},
                 headers=H1).json()
check("M2 unsubscribe removes", u1.get("success") and u1.get("removed", 0) >= 1, u1)
n2 = client.post(f"/api/push/notify/{U1['tsap_id']}",
                 json={"title": "t", "body": "b"}, headers=H1).json()
check("M2 notify after unsub -> no_subscription", n2.get("reason") == "no_subscription", n2)
b1 = client.post("/api/push/subscribe", json={"tsap_id": U1["tsap_id"], "endpoint": "x"},
                 headers=H1)
check("M2 bad endpoint -> 400", b1.status_code == 400, b1.status_code)
v1 = client.get("/api/push/vapid").json()
check("M2 vapid endpoint shape", "vapid_public_key" in v1 and "mode" in v1, v1)

# ===========================================================================
# O1 - owner summary
# ===========================================================================
section("O1 - owner summary")
o1 = client.get("/api/owner/summary", headers=H_ADMIN)
check("O1 200 with key", o1.status_code == 200, o1.status_code)
oj = o1.json()
for sec in ("revenue", "users", "funnel", "engagement", "channels", "referral", "system"):
    check(f"O1 section {sec}", isinstance(oj.get(sec), dict), list(oj.keys()))
check("O1 revenue ints", isinstance(oj["revenue"].get("collected"), int)
      and isinstance(oj["revenue"].get("paid"), int), oj["revenue"])
check("O1 series list", isinstance(oj["revenue"].get("series_7d"), list))
check("O1 users total>=1", oj["users"].get("total", 0) >= 1, oj["users"].get("total"))

# ===========================================================================
# O2 - owner auth + O3 methods/routes
# ===========================================================================
section("O2/O3 - auth + methods")
_wtf = os.environ.get("WA_TEST_FAST")
os.environ["WA_TEST_FAST"] = "0"
os.environ.pop("TSAP_AUTH_MODE", None)
try:
    rn = client.get("/api/owner/summary")
    check("O2 noauth -> 403", rn.status_code == 403, rn.status_code)
    rw = client.get("/api/owner/summary", headers={"x-admin-key": "wrong"})
    check("O2 wrong key -> 403", rw.status_code == 403, rw.status_code)
finally:
    if _wtf is None:
        os.environ.pop("WA_TEST_FAST", None)
    else:
        os.environ["WA_TEST_FAST"] = _wtf
w1 = client.post("/api/owner/summary", json={})
check("O3 POST on summary -> 405", w1.status_code == 405, w1.status_code)
api_n = len([r for r in main.app.routes for m in getattr(r, "methods", set() | set())
             if getattr(r, "path", "").startswith("/api")])
check("O3 api routes >= 228", api_n >= 228, api_n)

print(f"\n{'=' * 76}\nRESULT: {PASS} pass / {FAIL} fail\n{'=' * 76}")
if FAILED:
    print("FAILED:", FAILED)
    sys.exit(1)
print("WAVE38 ALL GREEN")
