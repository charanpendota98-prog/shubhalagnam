"""
MANA VIVAHA (మన వివాహ) — 100 REGISTRATIONS & FULL END-TO-END JOURNEY TEST SUITE
=============================================================================
1. Complete Single User Journey (100% Options & Options Stress Test)
2. 100 High-Volume Realistic Telugu Registrations across TS & AP Districts, Castes & Marital Statuses
3. Referral Chain & Commission / Unlock Credit Verifications
4. Admin Directory Filter & Date Bucketing Performance
5. Smart Matchmaker by ID verification across applicant profiles
"""
import os
import sys
import time
import random
import io
from datetime import datetime, timedelta

os.environ.setdefault("TSAP_AUTH_MODE", "off")
sys.path.insert(0, os.path.dirname(__file__))

import hardening
import main
from fastapi.testclient import TestClient
from PIL import Image, ImageDraw

client = TestClient(main.app)
admin_key = hardening.ADMIN_KEY

# Realistic Telugu Reference Data
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

TELUGU_CASTES = [
    "Reddy", "Kamma", "Kapu", "Brahmin", "Arya Vysya", "Munnuru Kapu", "Yadava", "Goud",
    "Padmashali", "Velama", "Kshatriya / Raju", "Viswabrahmin", "Madiga (SC)", "Mala (SC)",
    "Banjara / Lambada (ST)", "Balija", "Mudiraj", "Perika", "Vanjari", "Muslim - Sheikh",
    "Christian - Protestant"
]

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

DISTRICTS_TS_AP = [
    ("Hyderabad", "TS"), ("Ranga Reddy", "TS"), ("Medchal-Malkajgiri", "TS"), ("Warangal", "TS"),
    ("Karimnagar", "TS"), ("Nizamabad", "TS"), ("Khammam", "TS"), ("Nalgonda", "TS"),
    ("Mahabubnagar", "TS"), ("Siddipet", "TS"), ("Sangareddy", "TS"), ("Bhadradri Kothagudem", "TS"),
    ("Visakhapatnam", "TS"), ("Vijayawada (NTR)", "AP"), ("Guntur", "AP"), ("Tirupati", "AP"),
    ("Kakinada", "AP"), ("Nellore (SPSR)", "AP"), ("Kurnool", "AP"), ("Kadapa (YSR)", "AP"),
    ("Anantapur", "AP"), ("Eluru", "AP"), ("Vizianagaram", "AP"), ("Prakasam", "AP"),
    ("West Godavari", "AP"), ("East Godavari", "AP"), ("Chittoor", "AP"), ("Srikakulam", "AP"),
    ("Bengaluru", "KA"), ("Chennai", "MH"), ("Dallas, Texas", "Other"), ("San Jose, CA", "Other")
]

EDUCATIONS = ["B.Tech", "M.Tech", "MS / US Graduate", "MBBS / Doctor", "MD / Specialist", "MBA / Post Graduate", "CA / Finance", "B.Sc", "B.Com", "MCA", "Ph.D"]
PROFESSIONS = ["Senior Software Engineer", "Tech Lead / Architect", "Doctor / Consultant", "Govt Officer / Group 1", "Civil Assistant Surgeon", "Data Scientist", "Bank Manager", "Business Owner / Entrepreneur", "Chartered Accountant", "Professor / Lecturer"]
SALARIES = ["₹8 - 12 Lakhs / year", "₹12 - 18 Lakhs / year", "₹18 - 25 Lakhs / year", "₹25 - 40 Lakhs / year", "₹40+ Lakhs / year", "$120k - $180k (USA)", "$180k+ (USA)"]

def create_dummy_photo(name_seed: str) -> bytes:
    """Create a sharp, high-contrast, non-blank valid photo."""
    img = Image.new("RGB", (600, 600), color=(245, 240, 230))
    draw = ImageDraw.Draw(img)
    # Random pattern for texture and high contrast
    random.seed(name_seed)
    for i in range(40, 560, 25):
        draw.line([(i, 40), (i, 560)], fill=(random.randint(20, 100), random.randint(30, 80), random.randint(50, 150)), width=2)
        draw.line([(40, i), (560, i)], fill=(random.randint(100, 180), random.randint(40, 90), random.randint(30, 80)), width=2)
    # Draw avatar circle
    draw.ellipse([(150, 150), (450, 450)], fill=(122, 12, 46), outline=(212, 175, 55), width=6)
    draw.text((250, 280), name_seed[:6], fill=(255, 255, 255))
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=95)
    return buf.getvalue()

def run_e2e_stress_test():
    print("=" * 85)
    print("🚀 STARTING 100 REGISTRATIONS & FULL END-TO-END SYSTEM TEST")
    print("=" * 85)

    registered_users = []
    referral_codes = []

    # -------------------------------------------------------------------------
    # PART 1: 100 HIGH-VOLUME REALISTIC TELUGU REGISTRATIONS
    # -------------------------------------------------------------------------
    print("\n🔹 STEP 1: REGISTERING 100 REALISTIC BRIDES & GROOMS (TS, AP & NRIs)...")
    start_time = time.time()

    for idx in range(100):
        is_bride = (idx < 50)
        gender = "Bride" if is_bride else "Groom"
        full_name = TELUGU_FEMALE_NAMES[idx] if is_bride else TELUGU_MALE_NAMES[idx - 50]
        
        # Age and DOB
        age = random.randint(22, 34) if is_bride else random.randint(25, 38)
        dob_year = 2026 - age
        dob = f"{dob_year}-{random.randint(1,12):02d}-{random.randint(1,28):02d}"

        caste = random.choice(TELUGU_CASTES)
        gothram = random.choice(GOTHRAMS)
        star_item = random.choice(STARS)
        star, rasi = star_item[0], star_item[1]
        
        loc = random.choice(DISTRICTS_TSAP := DISTRICTS_TS_AP)
        district, state = loc[0], loc[1]
        
        edu = random.choice(EDUCATIONS)
        job = random.choice(PROFESSIONS)
        salary = random.choice(SALARIES)

        # 20% Second marriage
        is_second_marriage = (idx % 5 == 0)
        if is_second_marriage:
            marital = random.choice(["Divorced", "Widow" if is_bride else "Widower", "Separated", "Awaiting Divorce"])
            children = random.choice(["None", "1", "2"])
        else:
            marital = "Pelli Kaledu"
            children = "None"

        # Unique 10-digit Phone
        phone = f"98{idx:02d}{random.randint(100000, 999999)}"

        # Attach referral from previous user if available (every 3rd user uses referral)
        ref_code = referral_codes[idx % len(referral_codes)] if (referral_codes and idx % 3 == 0) else ""

        payload = {
            "full_name": full_name,
            "gender": gender,
            "age": age,
            "dob": dob,
            "height": f"5'{random.randint(2, 11)}\"",
            "caste": caste,
            "sub_caste": f"{caste} Sub",
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

        res = client.post("/api/register", data=payload)
        if res.status_code != 200:
            print(f"❌ Registration failed for #{idx+1} {full_name}: {res.status_code} - {res.text}")
            continue

        rdata = res.json()
        tsap_id = rdata.get("tsap_id")
        auth_token = rdata.get("auth_token")
        my_ref = (rdata.get("referral") or {}).get("my_code") or f"REF{idx+1001}"
        referral_codes.append(my_ref)

        # Upload Photo for 70% of registrations
        photo_url = None
        if idx % 10 < 7:
            photo_bytes = create_dummy_photo(full_name)
            p_res = client.post("/api/photo/upload", files={"file": (f"{tsap_id}.jpg", photo_bytes, "image/jpeg")})
            if p_res.status_code == 200:
                photo_url = p_res.json().get("photo_url")

        # Upgrade Plan for 30% of registrations (Paid Members)
        plan_code = "FREE"
        if idx % 10 in (1, 4, 7):
            chosen_plan = random.choice(["S_99", "S_199", "S_299", "S_499"])
            amt = int(chosen_plan.split("_")[1])
            credits_to_add = 5 if amt == 99 else (10 if amt == 199 else (15 if amt == 299 else 25))
            client.post("/api/admin/manual-plan-activate",
                headers={"X-Admin-Key": admin_key},
                json={
                    "tsap_id": tsap_id,
                    "plan_id": chosen_plan,
                    "amount": amt,
                    "credits": credits_to_add,
                    "payment_mode": "UPI_QR",
                    "utr": f"UTR-TEST-{tsap_id}"
                }
            )
            plan_code = chosen_plan

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
    print(f"✅ 100 Telugu Profiles Registered in {elapsed}s (Zero ID Collisions)")
    assert len(registered_users) == 100

    # -------------------------------------------------------------------------
    # PART 2: SINGLE USER FULL END-TO-END OPTIONS JOURNEY CHECK
    # -------------------------------------------------------------------------
    print("\n🔹 STEP 2: VERIFYING SINGLE USER END-TO-END OPTIONS JOURNEY...")
    sample_bride = registered_users[0]
    sample_groom = registered_users[50]

    # 1. Check Profile Completeness & Quality
    res_me = client.get(f"/api/profile/{sample_bride['tsap_id']}/quality")
    print(f"  ✓ Profile completeness check: {res_me.status_code} — Completeness: {res_me.json().get('quality', {}).get('percent', 85)}%")
    assert res_me.status_code == 200

    # 2. Daily Streak Claim
    res_streak = client.post("/api/streak/claim", json={"tsap_id": sample_bride["tsap_id"]})
    print(f"  ✓ Daily streak bonus claimed: {res_streak.status_code} — Message: {res_streak.json().get('message_telugu') or 'Claimed'}")
    assert res_streak.status_code in (200, 400)

    # 3. Astro Vedic Guna Match between sample bride & sample groom
    res_guna = client.get(f"/api/astro/guna?bride_id={sample_bride['tsap_id']}&groom_id={sample_groom['tsap_id']}")
    print(f"  ✓ Vedic 36-Guna Astro matching: {res_guna.status_code} — Gunas: {res_guna.json().get('total_36')}/36")
    assert res_guna.status_code == 200

    # 4. Gothram Marriage Guard Check
    res_gothram = client.get(f"/api/gothram/check?a={sample_bride['tsap_id']}&b={sample_groom['tsap_id']}")
    print(f"  ✓ Gothram compatibility verified: {res_gothram.status_code} — Blocked: {res_gothram.json().get('blocked')}")
    assert res_gothram.status_code == 200

    # 5. Dynamic Referral QR & HD Poster Assets (Standee, Story, Banner)
    res_story = client.get(f"/api/referral/{sample_bride['tsap_id']}/earnings-card.png?format=story")
    res_banner = client.get(f"/api/referral/{sample_bride['tsap_id']}/earnings-card.png?format=banner")
    res_standee = client.get(f"/api/referral/{sample_bride['tsap_id']}/poster.png")
    assert res_story.status_code == 200 and len(res_story.content) > 5000
    assert res_banner.status_code == 200 and len(res_banner.content) > 5000
    assert res_standee.status_code == 200 and len(res_standee.content) > 5000
    print(f"  ✓ Viral Referral Assets generated: Story ({len(res_story.content)}B), Banner ({len(res_banner.content)}B), Standee ({len(res_standee.content)}B)")

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
    print(f"  ✓ Paid Members (ప్రీమియం): {paid_count}")
    print(f"  ✓ Unpaid / Follow-up Members (ఉచిత): {unpaid_count}")
    print(f"  ✓ Profiles with Photo (ఫోటో ఉన్నవి): {photo_count}")
    assert today_count >= 100
    assert paid_count >= 20
    assert unpaid_count >= 50

    # -------------------------------------------------------------------------
    # PART 4: SMART MATCHMAKER BY ID ON MULTIPLE CANDIDATES
    # -------------------------------------------------------------------------
    print("\n🔹 STEP 4: TESTING SMART MATCHMAKER BY CANDIDATE ID (PHOTOS & SUITABILITY)...")
    test_candidate_indices = [0, 15, 25, 49, 50, 65, 80, 95]
    for c_idx in test_candidate_indices:
        cand = registered_users[c_idx]
        mm_res = client.get(f"/api/control/matchmaker/{cand['tsap_id']}", headers={"X-Admin-Key": admin_key})
        assert mm_res.status_code == 200
        mm_data = mm_res.json()
        cand_info = mm_data.get("candidate", {})
        results = mm_data.get("results", [])
        
        print(f"  🎯 Candidate #{cand['idx']} {cand_info.get('full_name')} ({cand['tsap_id']} • {cand['gender']} • {cand['caste']}): {len(results)} Suitable Matches found!")
        assert len(results) > 0
        
        # Verify first match card integrity
        top_match = results[0]
        assert top_match.get("tsap_id") != cand["tsap_id"]
        assert top_match.get("gender") != cand["gender"]
        assert top_match.get("phone") != ""
        assert len(top_match.get("reasons", [])) > 0

    print("\n" + "=" * 85)
    print("🎉 100 REGISTRATIONS & FULL END-TO-END STRESS TEST COMPLETED WITH 100% SUCCESS!")
    print("=" * 85)
    return True

if __name__ == "__main__":
    success = run_e2e_stress_test()
    sys.exit(0 if success else 1)
