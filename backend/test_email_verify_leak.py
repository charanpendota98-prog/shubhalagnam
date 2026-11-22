"""
REGRESSION — register email_verify must never echo unexpected exceptions.
========================================================================
Run:  /tmp/venv/bin/python test_email_verify_leak.py   (backend/ cwd nunchi)

Cover:
  1. Generic Exception from _email_otp_issue -> fixed bilingual retry hint,
     exception payload never appears in the response, sent stays False,
     registration itself still succeeds.
  2. HTTPException from _email_otp_issue -> server-crafted detail still echoed
     (cooldown/429/503 messages are intentional member-facing copy).
"""
import os
import sys

os.environ.setdefault("WA_TEST_FAST", "1")
os.environ.setdefault("EMAIL_MODE", "mock")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from test_storage import isolate_test_stores  # noqa: E402
_TEST_STORE = isolate_test_stores("email-verify-leak")

PASS, FAIL, FAILED = 0, 0, []


def check(name, cond, extra=None):
    global PASS, FAIL
    if cond:
        PASS += 1
        print(f"  ✅ {name}")
    else:
        FAIL += 1
        FAILED.append(name)
        print(f"  ❌ {name}" + (f"  → {extra}" if extra else ""))


from fastapi.testclient import TestClient  # noqa: E402
from fastapi import HTTPException  # noqa: E402
import main as M  # noqa: E402
import email_channel  # noqa: E402

email_channel.send_email = lambda to, subject, text: {"ok": True, "channel": "email", "detail": "mock_sent"}
email_channel.EMAIL_MODE = "mock"
c = TestClient(M.app)

from testutil_photos import TEST_PROFILE_PHOTO  # noqa: E402

SECRET = "resend-api-key-re_9f8d7c6b-internal-trace-/home/ubuntu/releases"
FIXED_HINT = "send-verify-email"


def _payload(phone, email="leak-test@manavivaha.com", name="Leak Test", dob="1995-01-01"):
    return {
        "gender": "Groom", "religion": "Hindu", "state": "TS", "district": "Hyderabad",
        "marital_status": "Never Married", "full_name": name, "profile_for": "Self",
        "dob": dob, "height": "5ft 6in", "caste": "Reddy",
        "phone": phone, "password": "password123", "email": email,
        "photo_private": "true", "consent_confirmed": "true", "photo_consent_confirmed": "true",
    }


def _register(phone, email="leak-test@manavivaha.com", name="Leak Test", dob="1995-01-01"):
    return c.post("/api/register", data=_payload(phone, email, name, dob),
                  files={"photo_file": ("test.jpg", TEST_PROFILE_PHOTO, "image/jpeg")})


# --- 1. Generic exception: no leak, fixed hint, registration still succeeds ---
orig_issue = M._email_otp_issue
M._email_otp_issue = lambda *a, **k: (_ for _ in ()).throw(Exception(SECRET))
try:
    r1 = _register("9811111111")
finally:
    M._email_otp_issue = orig_issue
check("1. Register still 200 when email send crashes", r1.status_code == 200, r1.status_code)
d1 = r1.json()
ev1 = d1.get("email_verify", {})
check("1a. sent stays False", ev1.get("sent") is False, ev1)
check("1b. required True (email given)", ev1.get("required") is True, ev1)
check("1c. exception payload NOT in response body", SECRET not in r1.text)
check("1d. fixed retry hint present", FIXED_HINT in str(ev1.get("detail", "")), ev1.get("detail"))
check("1e. tsap_id issued (no duplicate-account retry trap)", bool(d1.get("tsap_id")))

# --- 2. HTTPException: server-crafted detail still passes through ---
CRAFTED = "చాలా సార్లు ప్రయత్నించారు — కొద్దిసేపు ఆగండి"
M._email_otp_issue = lambda *a, **k: (_ for _ in ()).throw(HTTPException(429, CRAFTED))
try:
    r2 = _register("9822222222", "leak-test-2@manavivaha.com", "Leak Test Two", "1996-02-02")
finally:
    M._email_otp_issue = orig_issue
check("2. Register 200 on HTTPException path", r2.status_code == 200, r2.status_code)
ev2 = r2.json().get("email_verify", {})
check("2a. server-crafted detail echoed", str(ev2.get("detail", "")).startswith(CRAFTED[:20]), ev2.get("detail"))

print(f"\n=== RESULT: {PASS} passed, {FAIL} failed ===")
if FAILED:
    print("FAILED:", FAILED)
    sys.exit(1)
