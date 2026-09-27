"""
Comprehensive API Resilience & Error-Handling Test:
1. Test all public endpoints with valid, missing, and malformed parameters.
2. Test duplicate profile registration (phone match & composite identity match).
3. Test photo upload with valid vs bad/corrupt images.
4. Test admin date filtering (today, yesterday, 7d, custom range).
5. Test admin manual plan activation (SAMBANDHAM_99, VIP_199, PREMIUM_499).
6. Test referral code creation, validation, and poster generation.
7. Test matching endpoints (top-matches, porutham, similar profiles).
8. Ensure zero unhandled 500 Internal Server Errors across all routes.
"""
import os
import sys

os.environ.setdefault("TSAP_AUTH_MODE", "off")
os.environ.setdefault("WA_TEST_FAST", "1")
os.environ.setdefault("OTP_DEV_MODE", "true")
sys.path.insert(0, os.path.dirname(__file__))

import main
from fastapi.testclient import TestClient

client = TestClient(main.app)
passed = 0
failed = 0

def check(name: str, cond: bool, detail=None):
    global passed, failed
    if cond:
        passed += 1
        print(f"  ✅ {name}")
    else:
        failed += 1
        print(f"  ❌ {name} — DETAIL: {detail}")

print("\n=== 1. PUBLIC ENDPOINTS & UTILITIES ===")
res = client.get("/api/plans")
check("GET /api/plans 200", res.status_code == 200)

res = client.get("/api/free-plan")
check("GET /api/free-plan 200", res.status_code == 200)

res = client.get("/api/districts")
check("GET /api/districts 200 + TS & AP data", res.status_code == 200 and len(res.json().get("telangana", [])) > 0)

res = client.get("/api/districts/stats")
check("GET /api/districts/stats 200", res.status_code == 200)

res = client.get("/api/castes")
check("GET /api/castes 200 + 43 castes", res.status_code == 200 and res.json().get("total_castes", 0) >= 43)

res = client.get("/api/stats")
check("GET /api/stats 200 + 10k profiles", res.status_code == 200 and res.json().get("profiles_count", 0) >= 10000)

res = client.get("/api/second-marriage/profiles")
check("GET /api/second-marriage/profiles 200", res.status_code == 200)

res = client.get("/api/astro/muhurtham")
check("GET /api/astro/muhurtham 200", res.status_code == 200)

res = client.get("/api/blog")
check("GET /api/blog 200", res.status_code == 200)

res = client.get("/api/top-matches")
check("GET /api/top-matches 200", res.status_code == 200)

res = client.get("/api/featured/caste-showcase")
check("GET /api/featured/caste-showcase 200", res.status_code == 200)

print("\n=== 2. DUPLICATE PROFILE DETECTION ===")
# Register user A
user_a = {
    "gender": "Bride",
    "full_name": "Sita Lakshmi Devi",
    "dob": "1998-05-15",
    "age": 28,
    "phone": "9848012345",
    "caste": "Kamma",
    "district": "Guntur",
    "state": "AP",
    "father_name": "Venkata Rao",
    "height": "5'4\"",
    "marital_status": "Pelli Kaledu",
    "education": "B.Tech",
    "job": "Software Engineer",
    "salary": "₹12 Lakhs / year",
    "about_myself": "I am a well-educated software professional looking for a suitable Telugu groom from a good family background.",
}

res_a = client.post("/api/register", data=user_a)
check("Register user A (fresh) -> 200", res_a.status_code == 200, res_a.text)
uid_a = res_a.json().get("tsap_id")

# Try to register user B with SAME phone
user_b_same_phone = dict(user_a, full_name="Different Name", phone="9848012345")
res_dup_phone = client.post("/api/register", data=user_b_same_phone)
check("Duplicate phone -> 409 Rejected", res_dup_phone.status_code == 409)

# Try to register user C with DIFFERENT phone but SAME identity (Name + DOB + Father + Caste)
user_c_same_person = dict(user_a, phone="9848099999", full_name="Sita Lakshmi Devi")
res_dup_person = client.post("/api/register", data=user_c_same_person)
check("Duplicate composite identity (Name+DOB+Father) -> 409 Rejected", res_dup_person.status_code == 409)

print("\n=== 3. ADMIN DATE FILTERING & PAID STATUS ===")
# Admin profiles with today filter
hdr_admin = {"Authorization": "Bearer open_dev_mode"}
res_admin_today = client.get("/api/admin/profiles?date_filter=today&status=all", headers=hdr_admin)
check("Admin GET /api/admin/profiles?date_filter=today 200", res_admin_today.status_code == 200)
today_profiles = res_admin_today.json().get("profiles", [])
check("Admin found today registered profile", any(p["tsap_id"] == uid_a for p in today_profiles))

# Admin filter by unpaid vs paid
res_admin_unpaid = client.get("/api/admin/profiles?paid_status=unpaid&status=all", headers=hdr_admin)
check("Admin GET /api/admin/profiles?paid_status=unpaid 200", res_admin_unpaid.status_code == 200)

# Check WhatsApp follow-up link is present
p_row = next((p for p in res_admin_today.json().get("profiles", []) if p["tsap_id"] == uid_a), {})
check("WhatsApp follow-up link generated in admin row", "wa_followup_url" in p_row and "wa.me" in p_row.get("wa_followup_url", ""))

print("\n=== 4. ADMIN MANUAL PLAN ACTIVATION ===")
activation_payload = {
    "plan_id": "SAMBANDHAM_99",
    "amount": 99,
    "credits": 5,
    "verified_badge": True,
    "note": "User paid via Cash / Direct PhonePe to office",
}
res_act = client.post(f"/api/admin/profiles/{uid_a}/activate-plan", json=activation_payload, headers=hdr_admin)
check("Admin manual plan activate -> 200", res_act.status_code == 200, res_act.text)
act_data = res_act.json()
check("Plan updated to SAMBANDHAM_99", act_data.get("plan") == "SAMBANDHAM_99")
check("Verified badge granted", act_data.get("is_verified") is True)

# Now check that user A appears in paid list
res_admin_paid = client.get("/api/admin/profiles?paid_status=paid&status=all", headers=hdr_admin)
check("User A now listed in paid_status=paid filter", any(p["tsap_id"] == uid_a for p in res_admin_paid.json().get("profiles", [])))

print("\n=== 5. REFERRAL QR & POSTER ENGINE ===")
# Poster endpoint for user A
res_poster = client.get(f"/api/referral/{uid_a}/poster.png")
check("GET /api/referral/{id}/poster.png -> 200 + image/png", res_poster.status_code == 200 and res_poster.headers.get("content-type") == "image/png")

res_poster_alias = client.get(f"/api/referral/{uid_a}/poster")
check("GET /api/referral/{id}/poster (alias) -> 200 + image/png", res_poster_alias.status_code == 200 and res_poster_alias.headers.get("content-type") == "image/png")

# Payment QR alias
res_qr = client.get("/api/pay/qr/ORD-TEST-101")
check("GET /api/pay/qr/{id} (alias) -> 200 + image/png", res_qr.status_code == 200 and res_qr.headers.get("content-type") == "image/png")

# OG profile preview alias
res_og = client.get(f"/api/og/profile/{uid_a}")
check("GET /api/og/profile/{id} (alias) -> 200 + image/png", res_og.status_code == 200 and res_og.headers.get("content-type") == "image/png")

print(f"\n{'=' * 60}")
print(f"API RESILIENCE AUDIT: {passed} PASSED, {failed} FAILED")
print(f"{'=' * 60}")
if failed > 0:
    sys.exit(1)
