"""Referral regression E2E — no projected future rewards:
1. Referrer registers → receives a referral code
2. Friend visits the tracked link and registers with the code
3. Before payment, dashboard may show a registration count but no projected money
4. A confirmed qualifying first consumer-plan payment records one ₹50 wallet reward
5. Leaderboard totals include recorded qualifying rewards only
Admin key computed in-process (never printed).
"""
import hashlib
import hmac
import json
import os
import sys
import time
import urllib.request
import urllib.parse

# This E2E writes test members to a running API. Require an explicit opt-in and
# point it only at a disposable local/test database; never run it against live data.
if os.getenv("MANA_VIVAHA_ALLOW_LIVE_TEST_WRITES", "").strip().lower() not in {"1", "true", "yes"}:
    raise SystemExit("Refusing to create E2E member profiles. Set MANA_VIVAHA_ALLOW_LIVE_TEST_WRITES=1 only for a disposable test backend.")

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from testutil_photos import TEST_PROFILE_PHOTO  # noqa: E402

BASE = os.getenv("MANA_VIVAHA_API_BASE", "http://localhost:8000").rstrip("/")
PASS, FAIL = [], []


def check(name, cond, extra=""):
    (PASS if cond else FAIL).append(name)
    print(("  ✅ " if cond else "  ❌ ") + name + (("  | " + str(extra)) if extra else ""))


def req(method, path, data=None, headers=None, form=False, files=None):
    url = BASE + path
    body = None
    h = dict(headers or {})
    if data is not None:
        if form and files:
            boundary = "----ManaVivahaE2E" + str(time.time_ns())
            chunks = []
            for name, value in data.items():
                chunks.append((
                    f"--{boundary}\r\nContent-Disposition: form-data; name=\"{name}\"\r\n\r\n{value}\r\n"
                ).encode())
            for name, (filename, content, content_type) in files.items():
                chunks.append((
                    f"--{boundary}\r\nContent-Disposition: form-data; name=\"{name}\"; filename=\"{filename}\"\r\n"
                    f"Content-Type: {content_type}\r\n\r\n"
                ).encode())
                chunks.append(bytes(content))
                chunks.append(b"\r\n")
            chunks.append(f"--{boundary}--\r\n".encode())
            body = b"".join(chunks)
            h["Content-Type"] = f"multipart/form-data; boundary={boundary}"
        elif form:
            body = urllib.parse.urlencode(data).encode()
            h["Content-Type"] = "application/x-www-form-urlencoded"
        else:
            body = json.dumps(data).encode()
            h["Content-Type"] = "application/json"
    r = urllib.request.Request(url, data=body, method=method, headers=h)
    try:
        with urllib.request.urlopen(r, timeout=30) as resp:
            return resp.status, json.loads(resp.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read().decode() or "{}")
        except Exception:
            return e.code, {}


# --- admin key (derive, never print) ---
import os
SECRET = os.environ.get("TSAP_AUTH_SECRET") or os.environ.get("JWT_SECRET") or ("tsap-dev-secret-" + hashlib.sha256(b"manavivaha-local").hexdigest()[:12])
ADMIN_KEY = "tsap-admin-" + hmac.new(SECRET.encode(), b"admin", hashlib.sha256).hexdigest()[:10]
AH = {"X-Admin-Key": ADMIN_KEY}

run = str(int(time.time()) % 100000)
print("=== 1. REFERRER REGISTER ===")
st, r1 = req("POST", "/api/register", form=True, data={
    "gender": "Groom", "age": 29, "dob": "1997-01-01", "password": "test-profile-password",
    "height": "5'9\"", "marital_status": "Pelli Kaledu", "religion": "Hindu",
    "caste": "Reddy", "district": "Rangareddy", "state": "TS",
    "full_name": "Rajesh Kumar", "phone": "98%08d" % (int(time.time()) % 100000000),
    "job": "Business", "education": "MBA", "salary": "60k",
    "consent_confirmed": "true", "photo_consent_confirmed": "true", "photo_private": "true"},
    files={"photo_file": ("test-profile.jpg", TEST_PROFILE_PHOTO, "image/jpeg")})
check("Referrer register 200", st == 200, st)
ref_id = r1.get("tsap_id", "")
ref_code = (r1.get("referral") or {}).get("my_code", "")
check("Referrer code CHA-style (RAJ####)", len(ref_code) == 7 and ref_code.startswith("RAJ"), ref_code)

print("=== 2. FRIEND VIA /r/CODE → CLICK + REGISTER (auto-fill simulation) ===")
st, cl = req("POST", f"/api/referral/click/{ref_code}?source=link")
check("Link click tracked", cl.get("success") and cl.get("clicks_total", 0) >= 1)
st, val = req("GET", f"/api/referral/validate/{ref_code}")
check("Validate code (register page auto-fill API)", val.get("ok") and val.get("bonus_credits") == 1)
st, r2 = req("POST", "/api/register", form=True, data={
    "gender": "Bride", "age": 25, "dob": "2001-01-01", "password": "test-profile-password",
    "height": "5'3\"", "marital_status": "Pelli Kaledu", "religion": "Hindu",
    "caste": "Reddy", "district": "Hyderabad", "state": "TS",
    "full_name": "Delayed Pay Divya", "phone": "97%08d" % ((int(time.time()) + 7) % 100000000),
    "job": "Software", "education": "B.Tech", "salary": "80k", "referral_code": ref_code,
    "consent_confirmed": "true", "photo_consent_confirmed": "true", "photo_private": "true"},
    files={"photo_file": ("test-profile.jpg", TEST_PROFILE_PHOTO, "image/jpeg")})
check("Friend register 200 with ref code", st == 200, st)
friend_id = r2.get("tsap_id", "")
jw = (r2.get("referral") or {}).get("joined_with") or {}
check("Referral locked (joined_with ok)", jw.get("ok") is True, jw.get("reason"))
check("Friend referee bonus credit (3+1)", (r2.get("credits") or 0) >= 4, r2.get("credits"))

print("=== 3. BEFORE PAYMENT — PENDING PIPELINE ===")
st, dash = req("GET", f"/api/referral/{ref_id}", headers={"X-Tsap-Token": __import__("hardening").sign_token(ref_id) if False else {}}) if False else (None, None)
# proper: sign token via API login (OTP test mode) — simpler: use admin automation key on public? No — use OTP login
st, otp = req("POST", "/api/auth/otp", data={"phone": r1.get("_phone", "")})
# NOTE: we don't have referrer phone in response (privacy) — use admin key header for dashboard? require_owner allows admin
st, dash = req("GET", f"/api/referral/{ref_id}", headers=AH)
check("Referrer dashboard (admin view)", st == 200 and dash.get("ok"), st)
ds = dash.get("stats", {})
check("Referral registration count: 1 friend without recorded reward", ds.get("pending_friends") == 1, ds.get("pending_friends"))
check("No projected pending reward value is returned", "pending_value" not in ds, ds.get("pending_value"))
check("Registrations=1, paid=0", ds.get("registrations") == 1 and ds.get("paid_count") == 0)

print("=== 4. LEADERBOARD BEFORE PAYMENT (alive board) ===")
st, lb = req("GET", "/api/referral/leaderboard?period=all&limit=10")
row_me = next((b for b in lb.get("leaderboard", []) if b.get("code") == ref_code), None)
check("💎 Referrer board lo visible (paid=0, refers=1 — alive!)", row_me is not None and row_me["refers"] == 1,
      row_me and (row_me["name"], row_me["refers"], row_me["paid"]))
st, lbme = req("GET", f"/api/referral/leaderboard?period=all&limit=10&me={ref_id}")
check("💎 me= param → you rank", (lbme.get("you") or {}).get("code") == ref_code, lbme.get("you"))

print("=== 5. '3 DAYS LATER' — FRIEND PAYS ₹99 (manual UPI admin confirm) ===")
st, order = req("POST", "/api/pay/order", data={"tsap_id": friend_id, "purpose": "credits", "ref": "S_99"}, headers=AH)
oid = (order.get("pay_order") or {}).get("id", "")
check("Pay order ₹99 created", order.get("success") and oid, oid)
st, conf = req("POST", f"/api/admin/payments/{oid}/confirm", data={"utr": "12%010d" % (int(time.time()) % 10000000000)}, headers=AH)
check("Admin confirmed payment (friend paid ₹99)", conf.get("success"), conf.get("message_telugu") if not conf.get("success") else "")

print("=== 6. AFTER PAYMENT — ₹50 CREDITED TO REFERRER (delayed commission) ===")
st, dash2 = req("GET", f"/api/referral/{ref_id}", headers=AH)
ds2 = dash2.get("stats", {})
check("💰 Wallet +₹50 (3-days-later payment kuda credit!)", ds2.get("wallet") == 50, ds2.get("wallet"))
check("paid_count=1", ds2.get("paid_count") == 1)
check("💎 Pending pipeline now 0", ds2.get("pending_friends") == 0, ds2.get("pending_friends"))
check("lifetime_earned ₹50", ds2.get("lifetime_earned") == 50)

print("=== 7. LEADERBOARD AFTER PAYMENT — LIVE ₹50 ===")
st, lb2 = req("GET", "/api/referral/leaderboard?period=all&limit=10")
row2 = next((b for b in lb2.get("leaderboard", []) if b.get("code") == ref_code), None)
check("🏆 Board lo ₹50 earned + rank", row2 and row2["earned"] == 50 and row2["rank"] >= 1,
      row2 and (row2["name"], row2["earned"], row2["rank"]))
st, lbw = req("GET", "/api/referral/leaderboard?period=week&limit=10")
roww = next((b for b in lbw.get("leaderboard", []) if b.get("code") == ref_code), None)
check("Week period lo kuda visible (payment ee week)", roww and roww["earned"] == 50)

print("=== 8. PAYOUT FLOW (amount send cheyyali) ===")
st, po = req("POST", f"/api/referral/payout?tsap_id={ref_id}&amount=100&method=upi&upi_id=rajesh@okhdfcbank", headers=AH)
check("Wallet ₹50 < min ₹100 → payout block (correct)",
      (po.get("ok") is False and po.get("reason") == "below_min") or po.get("success") is False,
      po.get("reason") or po.get("message_telugu"))

print()
print("=== RESULT: %d pass / %d fail ===" % (len(PASS), len(FAIL)))
for f in FAIL:
    print("  FAILED:", f)
