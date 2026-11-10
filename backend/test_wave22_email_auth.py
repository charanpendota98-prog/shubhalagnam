"""
🌊 WAVE 22 EMAIL AUTH TEST SUITE
================================
Tests for register (with email), receive code, verify email, login, forgot/recover password.
"""
import os
import sys

os.environ.setdefault("WA_TEST_FAST", "1")
os.environ.setdefault("EMAIL_MODE", "mock")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from test_storage import isolate_test_stores  # noqa: E402
_TEST_STORE = isolate_test_stores("wave22-email-auth")

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

section("A. Email Authentication User Journey")
from fastapi.testclient import TestClient
import main as M
import email_channel
import db_store

c = TestClient(M.app)

# Mock _email_otp_issue and _email_otp_check since we are testing endpoints 
# But wait! We should test the actual endpoints. The patch sets EMAIL_MODE to "mock" by default (we set it via env var, or mock the email sending).
# Let's intercept email_channel.send_email to capture the code
CAPTURED_EMAILS = []
def _mock_send_email(to, subject, text):
    CAPTURED_EMAILS.append({"to": to, "subject": subject, "text": text})
    return {"ok": True, "channel": "email", "detail": "mock_sent"}
email_channel.send_email = _mock_send_email
email_channel.EMAIL_MODE = "mock"

# 1. Register with email
payload = {
    "gender": "Groom", "religion": "Hindu", "state": "TS", "district": "Hyderabad", "marital_status": "Never Married", "full_name": "Test User", "profile_for": "Myself",
    "dob": "1995-01-01", "height": "5ft 6in", "caste": "Reddy",
    "phone": "9876543210", "password": "password123", "email": "test@manavivaha.com",
    "photo_private": "true", "consent_confirmed": "true", "photo_consent_confirmed": "true"
}
from testutil_photos import TEST_PROFILE_PHOTO
r1 = c.post("/api/register", data=payload, files={"photo_file": ("test.jpg", TEST_PROFILE_PHOTO, "image/jpeg")})
check("1. Register with email -> 200", r1.status_code == 200, r1.text[:100])
r1_data = r1.json()
tsap_id = r1_data.get("tsap_id")
check("1a. Returns tsap_id", bool(tsap_id))
check("1b. email_verify is in response", "email_verify" in r1_data and r1_data["email_verify"]["sent"] is True, r1_data.get("email_verify"))

# Extract code from captured email
check("2. Email was sent", len(CAPTURED_EMAILS) == 1)
sent_email = CAPTURED_EMAILS.pop()
check("2a. Correct recipient", sent_email["to"] == "test@manavivaha.com")
# Code is 8 digits
import re
code_match = re.search(r"\b(\d{8})\b", sent_email["text"])
check("2b. Email contains 8-digit code", bool(code_match), sent_email["text"])
verify_code = code_match.group(1) if code_match else "00000000"

# 3. Verify Email
r2 = c.post("/api/auth/verify-email", json={"tsap_id": tsap_id, "code": verify_code})
check("3. Verify Email endpoint -> 200", r2.status_code == 200, r2.text[:100])
check("3a. success: True", r2.json().get("success") is True)

# Check user is verified in DB
u = next((x for x in M.DB_USERS if x.get("tsap_id") == tsap_id), None)
check("3b. User email_verified is True in DB", u and u.get("email_verified") is True)

# 4. Login with phone (as email login wasn't added)
r3 = c.post("/api/auth/login-password", json={"phone": "9876543210", "password": "password123"})
check("4. Phone + Password Login -> 200", r3.status_code == 200)

# 5. Forgot Password with Email
r4 = c.post("/api/auth/forgot-email", json={"email": "test@manavivaha.com"})
check("5. Forgot password via verified email -> 200", r4.status_code == 200, r4.text[:100])
check("5a. Email was sent for forgot password", len(CAPTURED_EMAILS) == 1)

reset_email = CAPTURED_EMAILS.pop()
reset_code_match = re.search(r"\b(\d{8})\b", reset_email["text"])
check("5b. Reset Email contains 8-digit code", bool(reset_code_match), reset_email["text"])
reset_code = reset_code_match.group(1) if reset_code_match else "00000000"

# 6. Reset Password with Email
r5 = c.post("/api/auth/reset-email", json={
    "email": "test@manavivaha.com",
    "code": reset_code,
    "new_password": "newpassword456"
})
check("6. Reset password via email -> 200", r5.status_code == 200, r5.text[:100])

# 7. Login with new password
r6 = c.post("/api/auth/login-password", json={"phone": "9876543210", "password": "newpassword456"})
check("7. Login with new password -> 200", r6.status_code == 200)

print(f"\n{'=' * 60}\n🌊 EMAIL AUTH RESULT: {PASS} passed, {FAIL} failed")
if FAILED:
    print("FAILED:", FAILED)
    sys.exit(1)
print("🎉 ALL GREEN")
