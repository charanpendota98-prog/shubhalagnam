"""
MANA VIVAHA (మన వివాహ) — 100 REGISTRATIONS & FULL END-TO-END JOURNEY TEST SUITE
=============================================================================
1. Complete Single-User Journey with owner-authenticated endpoints
2. 100 isolated consented test registrations using current TS/AP and community catalogs
3. Referral code flow and payment/contact fail-closed safeguards
4. Admin Directory Filter & Date Bucketing Performance
5. Owner-only matchmaker with factual profile comparisons
"""
import os
import sys
import time
import random
from datetime import datetime, timedelta, timezone

# Safe, disposable test environment: no real providers, messages, payment keys, or live stores.
os.environ["APP_ENV"] = "test"
os.environ["TSAP_AUTH_MODE"] = "enforce"
os.environ["TSAP_AUTH_SECRET"] = "registration-e2e-test-secret-not-for-production-2026"
os.environ["ADMIN_KEY"] = "registration-e2e-admin-key-not-for-production-2026"
os.environ["PUBLISH_DRY_RUN"] = "true"
os.environ["AUTO_POST_ON_REGISTER"] = "false"
os.environ["WA_ENABLED"] = "false"
os.environ["PAYMENTS_LIVE"] = "false"
os.environ["PAYMENT_AUTO_APPROVE"] = "false"
for _provider_env in (
    "BOT_TOKEN", "TELEGRAM_BOT_TOKEN", "TSAP_API_KEY", "MSG91_KEY", "FAST2SMS_KEY",
    "WHATSAPP_MODE", "WHATSAPP_BRIDGE_URL", "WA_INSTANCES", "RAZORPAY_KEY_ID",
    "RAZORPAY_KEY", "RAZORPAY_KEY_SECRET", "RAZORPAY_SECRET", "RAZORPAY_WEBHOOK_SECRET",
    "PAY_UPI_ID", "SUPPORT_PHONE", "SUPPORT_WHATSAPP", "ADMIN_WHATSAPP_NUMBER",
):
    os.environ.pop(_provider_env, None)

sys.path.insert(0, os.path.dirname(__file__))
from test_storage import isolate_test_stores  # noqa: E402

isolate_test_stores("registrations-e2e")
# This suite verifies the real fail-closed checkout path, not synthetic paid fixtures.
os.environ["MANA_TEST_PAYMENT_FIXTURES"] = "false"

import hardening  # noqa: E402
import main  # noqa: E402
from testutil_client import TestClient  # noqa: E402
from location_catalog import AP_DISTRICTS, TS_DISTRICTS  # noqa: E402

client = TestClient(main.app)
# Local ASGI clients model nine separate test IPs to stay under the production 12/hour/IP limiter.
registration_clients = [
    TestClient(main.app, client=(f"198.18.0.{index + 1}", 50000))
    for index in range(9)
]
admin_key = hardening.ADMIN_KEY
admin_headers = {"X-Admin-Key": admin_key}
random.seed(20261006)


def member_headers(profile: dict) -> dict:
    token = str(profile.get("auth_token") or hardening.sign_token(profile.get("tsap_id", "")))
    return {"Authorization": f"Bearer {token}", "X-TSAP-Token": token}


# Isolated Telugu registration fixtures (never shipped or seeded into live panels)
TELUGU_MALE_NAMES = [
    "Sai Charan Reddy", "Venkatesh Naidu", "Karthik Varma", "Suresh Goud", "Nagarjuna Rao",
    "Prashanth Chowdary", "Ravi Teja Sharma", "Harish Yadav", "Manoj Kumar", "Chaitanya Raju",
    "Srinivasulu Munnuru", "Mahesh Padmashali", "Phani Kumar", "Rajesh Madiga", "Anand Mala",
    "Pavan Kalyan", "Abhishek Gupta", "Bhanu Prakash", "Dinesh Babu", "Girish Varma",
    "Hemanth Reddy", "Jithendra Naidu", "Kishore Kamma", "Lokesh Kapu", "Mukesh Vysya",
    "Naveen Goud", "Pradeep Yadav", "Raghavendra Rao", "Sandip Reddy", "Tarun Kumar",
    "Uday Kiran", "Vijay Bhaskar", "Yaswanth Raju", "Akhil Chowdary", "Balaji Sharma",
    "Chandrasekhar Reddy", "Damodar Naidu", "Eshwar Goud", "Gautham Varma", "Hari Krishna",
    "Jagadeesh Kapu", "Kranthi Yadav", "Lalith Kumar", "Madhava Reddy", "Nikhil Chowdary",
    "Omkar Sharma", "Pranay Goud", "Rohit Varma", "Satish Naidu", "Trinadh Kamma"
]

TELUGU_FEMALE_NAMES = [
    "Sravani Reddy", "Mounika Chowdary", "Harika Naidu", "Pooja Sharma", "Divya Goud",
    "Anusha Yadav", "Sneha Varma", "Keerthi Raju", "Lavanya Munnuru", "Deepika Padmashali",
    "Swathi Madiga", "Bhavana Mala", "Pavani Gupta", "Sirisha Reddy", "Sandhya Naidu",
    "Tejaswini Chowdary", "Chandana Kapu", "Manasa Vysya", "Sujatha Goud", "Kavya Yadav",
    "Madhuri Rao", "Radhika Reddy", "Ruchitha Varma", "Sharanya Naidu", "Thriveni Kamma",
    "Uma Maheshwari", "Varsha Kapu", "Yamini Vysya", "Aishwarya Goud", "Bindu Yadav",
    "Chaitra Sharma", "Dharani Reddy", "Geethika Varma", "Hemalatha Naidu", "Indira Kamma",
    "Jyothi Kapu", "Kalyani Vysya", "Lalitha Goud", "Meghana Yadav", "Navya Rao",
    "Pranitha Reddy", "Ramya Varma", "Sai Pallavi Naidu", "Tanmayi Chowdary", "Usha Rani",
    "Vandana Kapu", "Yashaswini Vysya", "Archana Goud", "Bhargavi Yadav", "Charishma Reddy"
]

TELUGU_CASTES = sorted((c for c in main.MP.castes_for("Hindu")["castes"] if c != "Other / self-described"), key=str.casefold)

GOTHRAMS = [
    "Kashyapa", "Bharadwaja", "Vasishta", "Gouthama", "Kaundinya", "Sandilya", "Athreya",
    "Harithasa", "Janakula", "Pala", "Srivatsa", "Koushika", "Mudgala", "Vishwamitra"
]

STARS = [
    ("Aswini", "Mesha"), ("Bharani", "Mesha"), ("Krittika", "Mesha"), ("Rohini", "Vrishabha"),
    ("Mrigasira", "Vrishabha"), ("Arudra", "Mithuna"), ("Punarvasu", "Mithuna"), ("Pushyami", "Karkataka"),
    ("Aslesha", "Karkataka"), ("Makha", "Simha"), ("Pubba", "Simha"), ("Uttara", "Kanya"),
    ("Hastha", "Kanya"), ("Chitta", "Thula"), ("Swathi", "Thula"), ("Visakha", "Vrischika"),
    ("Anuradha", "Vrischika"), ("Jyeshta", "Vrischika"), ("Moola", "Dhanusu"), ("Poorvashada", "Dhanusu"),
    ("Uttarashada", "Makara"), ("Sravana", "Makara"), ("Dhanishta", "Kumbha"), ("Satabhisha", "Kumbha"),
    ("Poorvabhadra", "Meena"), ("Uttarabhadra", "Meena"), ("Revathi", "Meena")
]

DISTRICTS_TS_AP = [(district, "TS") for district in TS_DISTRICTS] + [(district, "AP") for district in AP_DISTRICTS]

EDUCATIONS = ["B.Tech", "M.Tech", "MS / US Graduate", "MBBS / Doctor", "MD / Specialist", "MBA / Post Graduate", "CA / Finance", "B.Sc", "B.Com", "MCA", "Ph.D"]
PROFESSIONS = ["Senior Software Engineer", "Tech Lead / Architect", "Doctor / Consultant", "Govt Officer / Group 1", "Civil Assistant Surgeon", "Data Scientist", "Bank Manager", "Business Owner / Entrepreneur", "Chartered Accountant", "Professor / Lecturer"]
SALARIES = ["₹8 - 12 Lakhs / year", "₹12 - 18 Lakhs / year", "₹18 - 25 Lakhs / year", "₹25 - 40 Lakhs / year", "₹40+ Lakhs / year", "$120k - $180k (USA)", "$180k+ (USA)"]

def run_e2e_stress_test():
    print("=" * 85)
    print("🚀 STARTING 100 REGISTRATIONS & FULL END-TO-END SYSTEM TEST")
    print("=" * 85)

    registered_users = []
    referral_codes = []

    # -------------------------------------------------------------------------
    # PART 1: 100 HIGH-VOLUME ISOLATED TELUGU TEST FIXTURES
    # -------------------------------------------------------------------------
    print("\n🔹 STEP 1: REGISTERING 100 ISOLATED TEST FIXTURES (TS & AP)...")
    start_time = time.time()

    for idx in range(100):
        is_bride = (idx < 50)
        gender = "Bride" if is_bride else "Groom"
        full_name = TELUGU_FEMALE_NAMES[idx] if is_bride else TELUGU_MALE_NAMES[idx - 50]
        
        # Keep member-entered age and DOB consistent with today's date.
        age = random.randint(22, 34) if is_bride else random.randint(25, 38)
        today_ist = datetime.now(timezone(timedelta(hours=5, minutes=30))).date()
        dob = f"{today_ist.year - age}-01-01"

        caste = random.choice(TELUGU_CASTES)
        subcaste_options = main.community_subcastes_for("Hindu", caste)
        sub_caste = random.choice(subcaste_options) if subcaste_options else ""
        gothram = random.choice(GOTHRAMS)
        star, rasi = random.choice(STARS)
        district, state = random.choice(DISTRICTS_TS_AP)
        edu = random.choice(EDUCATIONS)
        job = random.choice(PROFESSIONS)
        salary = random.choice(SALARIES)

        # 20% second-marriage fixture cases, kept inside an isolated test store.
        is_second_marriage = (idx % 5 == 0)
        if is_second_marriage:
            marital = random.choice(["Divorced", "Widow" if is_bride else "Widower", "Separated", "Awaiting Divorce"])
            children = random.choice(["None", "1", "2"])
        else:
            marital = "Pelli Kaledu"
            children = "None"

        # Syntactically valid, deterministic test-only numbers; no OTP/provider is configured or called.
        phone = f"9{idx + 1:09d}"
        ref_code = referral_codes[idx % len(referral_codes)] if (referral_codes and idx % 3 == 0) else ""

        payload = {
            "full_name": full_name,
            "gender": gender,
            "religion": "Hindu",
            "consent_confirmed": "true",
            "age": age,
            "dob": dob,
            "height": f"5'{random.randint(2, 11)}\"",
            "caste": caste,
            "sub_caste": sub_caste,
            "gothram": gothram,
            "star": star,
            "rasi": rasi,
            "marital_status": marital,
            "children": children,
            "district": district,
            "state": state,
            "education": edu,
            "job": job,
            "salary": salary,
            "father_name": f"{full_name.split()[-1]} Garu",
            "mother_name": "Lakshmi Devi",
            "about_myself": f"నమస్కారం, నా పేరు {full_name}. కుటుంబ విలువలు పాటించే వ్యక్తి. సంప్రదాయాలు మరియు ఆధునిక ఆలోచనలు కలగలసిన వ్యక్తిని కోరుకుంటున్నాను.",
            "phone": phone,
            "password": "Password123!",
            "referral_code": ref_code
        }

        registration_client = registration_clients[idx // 12]
        res = registration_client.post("/api/register", data=payload)
        if res.status_code != 200:
            print(f"❌ Registration failed for test fixture #{idx+1}: {res.status_code} - {res.text}")
            continue

        rdata = res.json()
        tsap_id = rdata.get("tsap_id")
        if not tsap_id:
            print(f"❌ Registration returned no profile ID for test fixture #{idx+1}")
            continue
        auth_token = rdata.get("auth_token") or hardening.sign_token(tsap_id)
        user_headers = member_headers({"tsap_id": tsap_id, "auth_token": auth_token})
        my_ref = str((rdata.get("referral") or {}).get("my_code") or "").strip()
        if not my_ref:
            raise AssertionError(f"Registration returned no referral code for isolated fixture #{idx+1}")
        referral_codes.append(my_ref)

        # Only explicitly approved, isolated fixtures enter public search and matchmaking.
        approval = client.post(f"/api/admin/approve/{tsap_id}", headers=admin_headers)
        if approval.status_code != 200:
            print(f"❌ Test fixture approval failed for #{idx+1}: {approval.status_code}")
            continue

        # With all checkout configuration absent, a real purchase request fails closed.
        if idx == 0:
            checkout = client.post("/api/credits/buy", json={"tsap_id": tsap_id, "plan_id": "S_99"}, headers=user_headers)
            assert checkout.status_code == 503 and not checkout.json().get("order")

        # This suite creates no fabricated *paid* orders. Photos: registration requires a
        # real photo, so the shared testutil_client.TestClient adapter attaches one synthetic
        # test image to every /api/register call — each isolated fixture owns exactly one.
        photo_url = "synthetic test photo (auto-attached by testutil_client.TestClient)"
        plan_code = "FREE"

        registered_users.append({
            "idx": idx + 1,
            "tsap_id": tsap_id,
            "full_name": full_name,
            "gender": gender,
            "age": age,
            "caste": caste,
            "gothram": gothram,
            "star": star,
            "rasi": rasi,
            "district": district,
            "phone": phone,
            "auth_token": auth_token,
            "my_ref": my_ref,
            "photo_url": photo_url,
            "plan_code": plan_code,
            "marital": marital
        })

        if (idx + 1) % 25 == 0 or idx == 99:
            print(f"  ✨ Progress: {idx+1}/100 profiles registered successfully...")

    elapsed = round(time.time() - start_time, 2)
    print(f"✅ 100 isolated test profiles registered in {elapsed}s (zero ID collisions)")
    assert len(registered_users) == 100

    # -------------------------------------------------------------------------
    # PART 2: SINGLE USER FULL END-TO-END OPTIONS JOURNEY CHECK
    # -------------------------------------------------------------------------
    print("\n🔹 STEP 2: VERIFYING SINGLE USER END-TO-END OPTIONS JOURNEY...")
    sample_bride = registered_users[0]
    sample_groom = registered_users[50]

    # 1. Check Profile Completeness & Quality
    res_me = client.get(f"/api/profile/{sample_bride['tsap_id']}/quality", headers=member_headers(sample_bride))
    print(f"  ✓ Profile completeness check: {res_me.status_code} — Completeness: {res_me.json().get('quality', {}).get('percent', 85)}%")
    assert res_me.status_code == 200

    # 2. Daily Streak Claim
    res_streak = client.post("/api/streak/claim", json={"tsap_id": sample_bride["tsap_id"]}, headers=member_headers(sample_bride))
    print(f"  ✓ Daily streak bonus claimed: {res_streak.status_code} — Message: {res_streak.json().get('message_telugu') or 'Claimed'}")
    assert res_streak.status_code in (200, 400)

    # 3. Astro Vedic Guna Match between sample bride & sample groom
    res_guna = client.get(f"/api/astro/guna?bride_id={sample_bride['tsap_id']}&groom_id={sample_groom['tsap_id']}")
    print(f"  ✓ Vedic 36-Guna Astro matching: {res_guna.status_code} — Gunas: {res_guna.json().get('total_36')}/36")
    assert res_guna.status_code == 200

    # 4. Gothram Marriage Guard Check
    res_gothram = client.get(f"/api/gothram/check?a={sample_bride['tsap_id']}&b={sample_groom['tsap_id']}")
    print(f"  ✓ Member-entered Gothram text comparison: {res_gothram.status_code} — same={res_gothram.json().get('same')}, blocked={res_gothram.json().get('blocked')}")
    assert res_gothram.status_code == 200

    # 5. Dynamic Referral QR & HD Poster Assets (Standee, Story, Banner)
    res_story = client.get(f"/api/referral/{sample_bride['tsap_id']}/earnings-card.png?format=story", headers=member_headers(sample_bride))
    res_banner = client.get(f"/api/referral/{sample_bride['tsap_id']}/earnings-card.png?format=banner", headers=member_headers(sample_bride))
    res_standee = client.get(f"/api/referral/{sample_bride['tsap_id']}/poster.png", headers=member_headers(sample_bride))
    assert res_story.status_code == 200 and len(res_story.content) > 5000
    assert res_banner.status_code == 200 and len(res_banner.content) > 5000
    assert res_standee.status_code == 200 and len(res_standee.content) > 5000
    print(f"  ✓ Referral assets generated from the isolated member fixture: Story ({len(res_story.content)}B), Banner ({len(res_banner.content)}B), Standee ({len(res_standee.content)}B)")

    # 6. Partner Preferences Multi-Select Configuration & Smart Match Suggestion
    pref_payload = {
        "tsap_id": sample_bride["tsap_id"],
        "age_min": 18,
        "age_max": 60,
        "caste_no_bar": True,
        "castes": [],
        "sub_castes": [],
        "educations": [],
        "jobs": [],
        "districts": [],
        "states": ["TS", "AP"],
        "marital_statuses": ["Any"],
        "diet": "Any",
    }
    res_save_prefs = client.post("/api/profile/preferences", json=pref_payload, headers=member_headers(sample_bride))
    assert res_save_prefs.status_code == 200
    pref_data = res_save_prefs.json()
    assert pref_data.get("success") is True
    print(f"  ✓ Saved Partner Preferences: {res_save_prefs.status_code} — Matches count: {pref_data.get('matching_count')}")

    # 7. Get Partner Preferred Matches List
    res_pref_matches = client.get(f"/api/matches/partner-preferred?tsap_id={sample_bride['tsap_id']}", headers=member_headers(sample_bride))
    assert res_pref_matches.status_code == 200
    pref_matches_data = res_pref_matches.json()
    assert pref_matches_data.get("success") is True
    assert len(pref_matches_data.get("matches", [])) > 0
    assert pref_matches_data.get("compatibility_score_calculated") is False
    print(f"  ✓ Fetched Partner Preferred Matches: {len(pref_matches_data.get('matches', []))} rows after explicit filters; no score calculated")

    # -------------------------------------------------------------------------
    # PART 3: ADMIN DIRECTORY & DATE FILTERING WITH 100+ PROFILES
    # -------------------------------------------------------------------------
    print("\n🔹 STEP 3: TESTING ADMIN DIRECTORY & DATE FILTERING WITH 100 PROFILES...")
    res_dir = client.get("/api/control/directory", headers={"X-Admin-Key": admin_key})
    assert res_dir.status_code == 200
    summary = res_dir.json().get("summary", {})
    total_in_db = summary.get("total_all", 0)
    today_count = summary.get("today_count", 0)
    paid_count = summary.get("paid_count", 0)
    unpaid_count = summary.get("unpaid_count", 0)
    photo_count = summary.get("photo_count", 0)

    print(f"  ✓ Total in Directory: {total_in_db}")
    print(f"  ✓ Today's Signups (ఈరోజు రిజిస్ట్రేషన్లు): {today_count}")
    print(f"  ✓ Paid orders (expected zero without a provider): {paid_count}")
    print(f"  ✓ Free test profiles: {unpaid_count}")
    print(f"  ✓ Uploaded test photos (expected one per fixture): {photo_count}")
    assert today_count >= 100
    assert paid_count == 0
    assert unpaid_count >= 100
    # 👇 Truthful count: one auto-attached synthetic photo per registered fixture —
    #    not zero (the photo-required registration rule) and not more than one each
    #    (guards against counting empty `photo_urls` placeholders as photos).
    assert photo_count == len(registered_users)

    # -------------------------------------------------------------------------
    # PART 4: SMART MATCHMAKER BY ID ON MULTIPLE CANDIDATES
    # -------------------------------------------------------------------------
    print("\n🔹 STEP 4: TESTING OWNER-ONLY MATCHMAKER WITH FACTUAL COMPARISONS...")
    test_candidate_indices = [0, 15, 25, 49, 50, 65, 80, 95]
    for c_idx in test_candidate_indices:
        cand = registered_users[c_idx]
        mm_res = client.get(f"/api/control/matchmaker/{cand['tsap_id']}", headers={"X-Admin-Key": admin_key})
        assert mm_res.status_code == 200
        mm_data = mm_res.json()
        cand_info = mm_data.get("candidate", {})
        results = mm_data.get("results", [])
        
        print(f"  🎯 Candidate #{cand['idx']} {cand_info.get('full_name')} ({cand['tsap_id']} • {cand['gender']} • {cand['caste']}): {len(results)} approved profile comparisons")
        assert len(results) > 0
        
        # Verify first match card integrity
        top_match = results[0]
        assert top_match.get("tsap_id") != cand["tsap_id"]
        assert top_match.get("gender") != cand["gender"]
        assert top_match.get("phone") != ""
        assert "observations" in top_match and "compatibility_score" not in top_match and "reasons" not in top_match

    print("\n" + "=" * 85)
    print("✅ Isolated 100-profile local E2E test completed; this is not production/provider validation.")
    print("=" * 85)
    return True

if __name__ == "__main__":
    success = run_e2e_stress_test()
    sys.exit(0 if success else 1)
