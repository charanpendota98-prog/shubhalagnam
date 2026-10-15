"""Deterministic synthetic fixtures for isolated unit tests only.
These values are not real members and must never be loaded into or shown by the app.
"""
import random
from datetime import datetime, date, timedelta
from typing import Dict, List

# --------------------------------------------------------------------------- #
#  NAKSHATRAM → RASI (Telugu, 27) — porutham engine ki same mapping
# --------------------------------------------------------------------------- #
NAK_TO_RASI = {
    "Ashwini": "Mesha", "Bharani": "Mesha", "Krittika": "Vrishabha",
    "Rohini": "Vrishabha", "Mrigasira": "Mithuna", "Arudra": "Mithuna",
    "Punarvasu": "Karka", "Pushya": "Karka", "Ashlesha": "Karka",
    "Magha": "Simha", "Pubba": "Simha", "Uttara": "Simha",
    "Hasta": "Kanya", "Chitra": "Kanya", "Swati": "Tula",
    "Visakha": "Tula", "Anuradha": "Vrishchika", "Jyeshtha": "Vrishchika",
    "Moola": "Dhanu", "Purvashadha": "Dhanu", "Uttarashadha": "Dhanu",
    "Sravana": "Makara", "Dhanishta": "Makara", "Shatabhisha": "Kumbha",
    "Purvabhadra": "Kumbha", "Uttarabhadra": "Meena", "Revati": "Meena",
}
GOTHRAMS = ["Bharadwaj", "Kasyapa", "Vasishta", "Kaundinya", "Kaushika", "Srivatsa",
            "Jamadagni", "Gautama", "Atri", "Sankhyayana", "Garga", "Sandyayana",
            "Vishwamitra", "Harita", "Kutsa"]

MALE_NAMES = ["Kiran Kumar", "Rakesh", "Suresh", "Naveen", "Vijay Kumar", "Sai Krishna", "Mahesh",
              "Ravi Teja", "Praveen", "Ganesh", "Anil Kumar", "Srikanth", "Naresh", "Vamshi",
              "Srinivas", "Ramesh", "Karthik", "Rahul", "Abhishek", "Sandeep", "Rajesh",
              "Sudheer", "Phani Kumar", "Chaitanya", "Lokesh", "Bhaskar", "Yadagiri", "Shiva Kumar",
              "Manoj", "Vinod", "Ashok", "Sampath", "Krishna Reddy", "Pradeep", "Sudhakar",
              "Balaji", "Sai Teja", "Harsha Vardhan", "Arun Kumar", "Rohit", "Nithin", "Sagar",
              "Deepak", "Kranthi", "Upender", "Sriram", "Mohan Rao", "Balu", "Gopi", "Sai Charan"]
FEMALE_NAMES = ["Lakshmi", "Sravani", "Divya", "Anusha", "Meghana", "Sandhya", "Swathi", "Gayatri",
                "Sri Lakshmi", "Harika", "Sneha", "Priyanka", "Lavanya", "Deepika", "Ramya",
                "Shirisha", "Keerthi", "Madhavi", "Swarna", "Padma", "Varalakshmi", "Sailaja",
                "Aishwarya", "Bhavani", "Naga Lakshmi", "Sujatha", "Jyothi", "Kalpana", "Reena",
                "Pooja", "Aparna", "Sruthi", "Manasa", "Vandana", "Kavya", "Sowmya", "Chandana",
                "Rekha", "Aruna", "Bhargavi", "Sirisha", "Hima Bindu", "Latha", "Sushma",
                "Rajini", "Vasavi", "Sridevi", "Tanuja", "Anjali", "Nikitha"]

# caste → surnames (records lo kanipinche pattern)
CASTE_SURNAMES = {
    "Reddy": ["Reddy", "Reddy", "Reddy Gari", "Reddy"],
    "Kamma": ["Chowdary", "Naidu", "Prasad", "Varma"],
    "Kapu": ["Naidu", "Chowdary", "Rao"],
    "Telaga": ["Naidu", "Rao"],
    "Balija": ["Naidu", "Setti", "Balija"],
    "Velama": ["Rao", "Dora", "Velama"],
    "Munnuru Kapu": ["Naidu", "Munnuru Kapu"],
    "Vysya": ["Setti", "Chetty", "Vysya", "Sunkara"],
    "Brahmin": ["Sarma", "Sastry", "Somayajulu", "Dikshitulu", "Rao"],
    "Kamma (Chowdary)": ["Chowdary"],
    "Goud": ["Goud", "Gowd"],
    "Yadav": ["Yadav", "Golla"],
    "Mudiraj": ["Mudiraj", "Tenugu"],
    "Padmashali": ["Padmashali", "Sali"],
    "Devanga": ["Devanga", "Sali"],
    "Sale": ["Sale"],
    "Kummari": ["Kummari"],
    "Kamsali": ["Kamsali", "Vishwakarma"],
    "Mangali": ["Mangali"],
    "Rajaka": ["Rajaka", "Chakali"],
    "Vadde": ["Vadde", "Vaddera"],
    "Bestha": ["Bestha", "Gangaputra"],
    "Mala": ["Mala"],
    "Madiga": ["Madiga"],
    "Lambada": ["Naik", "Rathod", "Banjara"],
    "Boya": ["Boya", "Naik"],
    "Valmiki": ["Valmiki"],
    "Yanadi": ["Yanadi"],
    "Nagavamsam": ["Nagavamsam"],
    "Srisayana": ["Srisayana", "Segidi"],
    "Gandla": ["Gandla"],
    "Darzi": ["Darzi"],
    "Dudekula": ["Dudekula"],
    "Arekatika": ["Arekatika"],
    "Panta": ["Panta"],
    "Koya": ["Koya"],
    "Gond": ["Gond"],
    "Chenchu": ["Chenchu"],
}

TS_DISTRICTS = {
    "Hyderabad": ["Gachibowli", "Kukatpally", "LB Nagar", "Secunderabad", "Ameerpet"],
    "Rangareddy": ["Madhapur", "Shamshabad", "Rajendranagar"],
    "Medchal Malkajgiri": ["Kompally", "Alwal", "Quthbullapur"],
    "Nalgonda": ["Miryalaguda", "Suryapet Road", "Nalgonda Town"],
    "Suryapet": ["Kodad", "Suryapet Town"],
    "Warangal": ["Hanamkonda", "Kazipet", "Warangal Town"],
    "Hanamkonda": ["Hanamkonda", "Subedari"],
    "Karimnagar": ["Karimnagar Town", "Jagtial Road"],
    "Khammam": ["Khammam Town", "Kothagudem Road"],
    "Nizamabad": ["Nizamabad Town", "Bodhan"],
    "Medak": ["Sangareddy", "Medak Town"],
    "Sangareddy": ["Sangareddy", "Zaheerabad"],
    "Mahabubnagar": ["Mahabubnagar Town", "Jadcherla"],
    "Mahbubnagar": ["Mahbubnagar Town"],
    "Adilabad": ["Adilabad Town", "Nirmal Road"],
    "Peddapalli": ["Ramagundam", "Peddapalli"],
    "Kamareddy": ["Kamareddy", "Banswada"],
    "Rajanna Sircilla": ["Sircilla", "Vemulawada"],
    "Jagtial": ["Jagtial", "Koratla"],
    "Nirmal": ["Nirmal", "Bhainsa"],
    "Mancherial": ["Mancherial", "Bellampalli"],
    "Wanaparthy": ["Wanaparthy"],
    "Nagarkurnool": ["Nagarkurnool", "Achampet"],
    "Jogulamba Gadwal": ["Gadwal"],
    "Jangaon": ["Jangaon"],
    "Yadadri Bhuvanagiri": ["Bhongir"],
    "Bhadradri Kothagudem": ["Kothagudem", "Palwancha"],
    "Mulugu": ["Mulugu"],
    "Narayanpet": ["Narayanpet"],
    "Vikarabad": ["Vikarabad", "Tandur"],
    "Siddipet": ["Siddipet", "Gajwel"],
    "Medchal": ["Medchal"],
}
AP_DISTRICTS = {
    "Visakhapatnam": ["MVP Colony", "Gajuwaka", "Madhurawada"],
    "Vijayawada": ["Benz Circle", "Gunadala", "Patamata"],
    "Guntur": ["Brodipet", "Lakshmipuram"],
    "Krishna": ["Machilipatnam", "Gudivada"],
    "Kurnool": ["Kurnool Town", "Adoni"],
    "Nellore": ["Nellore Town", "Kavali"],
    "Chittoor": ["Chittoor Town", "Madanapalle"],
    "Tirupati": ["Tirupati", "Renigunta"],
    "Anantapur": ["Anantapur", "Hindupur"],
    "Kadapa": ["Kadapa", "Proddatur"],
    "Prakasam": ["Ongole", "Chirala"],
    "East Godavari": ["Rajahmundry", "Kakinada"],
    "West Godavari": ["Bhimavaram", "Eluru"],
    "Srikakulam": ["Srikakulam", "Palasa"],
    "Vizianagaram": ["Vizianagaram", "Bobbili"],
    "Bapatla": ["Bapatla", "Chirala"],
    "Palnadu": ["Narasaraopet", "Sattenapalli"],
    "Eluru": ["Eluru", "Jangareddygudem"],
    "Konaseema": ["Amalapuram", "Ravulapalem"],
    "NTR": ["Vijayawada Rural", "Ibrahimpatnam"],
}

EDU_BY_LEVEL = {
    "high": ["BTech", "B.Tech", "MTech", "MCA", "MBA", "MBBS", "MD", "MS", "MSc", "CA", "B.Pharm", "M.Pharm"],
    "mid": ["Degree", "BCom", "BSc", "BA", "BBA", "B.Ed", "Diploma", "GNM Nursing"],
    "low": ["Inter", "10th", "ITI"],
}
JOBS = {
    "Software": ("Software Engineer", ["TCS", "Infosys", "Wipro", "Cognizant", "Accenture", "Tech Mahindra", "Deloitte", "Amazon", "Hyderabad Startup"]),
    "Govt Job": ("Govt Employee", ["TS Govt", "AP Govt", "Railways", "BSNL", "Bank", "Police Dept", "Gurukul Teacher"]),
    "Business": ("Business", ["Own Kirana", "Textile Shop", "Real Estate", "Agri Business", "Furniture Mart"]),
    "Doctor": ("Doctor", ["Apollo", "Yashodha", "Government Hospital", "Own Clinic"]),
    "Engineer": ("Civil Engineer", ["L&T", "MEIL", "NCC Ltd"]),
    "Bank Employee": ("Bank Employee", ["SBI", "HDFC Bank", "Union Bank"]),
    "Teacher": ("Teacher", ["ZP High School", "Private School", "Degree College", "Gurukul"]),
    "Staff Nurse": ("Staff Nurse", ["Yashodha", "KIMS", "Rainbow"]),
    "Pharmacist": ("Pharmacist", ["MedPlus", "Apollo Pharmacy"]),
    "Private Job": ("Private Employee", ["Local Firm", "Showroom", "Hospital"]),
    "Agriculture": ("Agriculture", ["Own Farm"]),
    "Driver": ("Driver", ["Private", "Travels"]),
}
SALARY_BY_JOB = {
    "Software": ["6L", "8L", "10L", "12L", "18L"], "Govt Job": ["6L", "7L", "9L", "11L"],
    "Business": ["5L", "8L", "12L", "15L"], "Doctor": ["12L", "18L", "24L"],
    "Engineer": ["6L", "9L", "12L"], "Bank Employee": ["5L", "7L", "9L"],
    "Teacher": ["3.5L", "5L", "6L"], "Staff Nurse": ["4L", "5L", "6L"],
    "Pharmacist": ["3.5L", "5L"], "Private Job": ["3L", "4.5L", "6L"],
    "Agriculture": ["3L", "5L"], "Driver": ["2.5L", "3.5L"],
}
HEIGHTS = {"Bride": ["5'0\"", "5'2\"", "5'3\"", "5'4\"", "5'5\"", "5'6\""],
           "Groom": ["5'5\"", "5'6\"", "5'7\"", "5'8\"", "5'9\"", "5'10\"", "5'11\"", "6'0\""]}
WEIGHTS = {"Bride": ["45kg", "48kg", "50kg", "52kg", "54kg", "56kg", "58kg"],
           "Groom": ["60kg", "65kg", "68kg", "72kg", "75kg", "78kg", "82kg"]}
BLOOD = ["A+", "B+", "O+", "AB+", "A-", "O-"]
ABOUT = [
    "Simple Telugu family. పెళ్లి తర్వాత కుటుంబం తో కలిసి ఉండడం ఇష్టం. Godu భక్తి + pani మీద నమ్మకం.",
    "Software job చేస్తున్నాను, weekends లో ఇంట్లో family తో time. చదువు కి ఎక్కువ importance ఇస్తాను.",
    "Traditional values + modern thinking. Photography and cooking ఇష్టం. Family తో bond బాగుంటుంది.",
    "Godu భక్తి, శ్రద్ధ, మంచి మనస్తత్వం — ఇవి నా strength. Job stable, ఇప్పుడు పెళ్లి చేసుకోవాలని ఉంది.",
    "కుటుంబం లో అందరూ కలిసి ఉంటాం. నేను మంచి cooking చేస్తాను, music వింటాం ఇష్టం.",
    "Business చేస్తున్నాను. Hard working family background. పెళ్లికి ready గా ఉన్నానని, మంచి పోరి/అబ్బాయి కోసం చూస్తున్నాం.",
    "Job + freelance చేస్తున్నాను. Travel ఇష్టం, books chadavatam ఇష్టం. Family first always.",
    "Govt job లో ఉన్నాను. Simple life, godu భక్తి, మంచి సంబంధం కోరుకుంటున్నాం.",
]
EXPECT = [
    "మంచి కుటుంబం నుంచి వచ్చిన, pani మీద నమ్మకం ఉన్న సంబంధం కావాలి.",
    "Education + stable job ఉన్న partner కావాలి. Family values important.",
    "పెళ్లికి ready గా ఉన్న మంచి మనస్తత్వం ఉన్న partner కావాలి. గోత్రం match అవ్వాలి.",
    "Job చేసే partner కావాలి — Hyderabad/Bangalore లో work చేస్తే better.",
    "Traditional family, మంచి ఆచార సంప్రదాయాలు ఉన్న ఇంటి నుంచి సంబంధం కావాలి.",
]


def _dob_from_age(age: int, rnd: random.Random) -> str:
    """Age → realistic DOB (జన్మ రోజు random month/day)."""
    today = date(2026, 9, 14)
    days_extra = rnd.randint(0, 364)
    d = today - timedelta(days=age * 365 + days_extra)
    return d.isoformat()


def build_profiles(count: int = 360, seed: int = 42, gender: str = "") -> List[Dict]:
    rnd = random.Random(seed)
    castes = list(CASTE_SURNAMES.keys())
    out: List[Dict] = []
    n_bride = count // 2 if not gender else (count if gender.lower().startswith("b") else 0)
    if gender:
        n_groom = count - n_bride
    else:
        n_groom = count - n_bride

    for idx in range(count):
        g = "Bride" if idx < n_bride else "Groom"
        age = rnd.randint(22, 30) if g == "Bride" else rnd.randint(26, 36)
        state = rnd.choices(["TS", "AP"], weights=[62, 38])[0]
        district_map = TS_DISTRICTS if state == "TS" else AP_DISTRICTS
        district = rnd.choice(list(district_map.keys()))
        mandal = rnd.choice(district_map[district])
        level = rnd.choices(["high", "mid", "low"], weights=[38, 45, 17])[0]
        education = rnd.choice(EDU_BY_LEVEL[level])
        job_key = rnd.choices(list(JOBS.keys()),
                             weights=[16, 14, 12, 6, 6, 6, 9, 6, 4, 10, 8, 3])[0]
        job, companies = JOBS[job_key]
        company = rnd.choice(companies)
        salary = rnd.choice(SALARY_BY_JOB[job_key])
        if job_key in ("Agriculture", "Driver"):
            salary = "3L"
        caste = rnd.choice(castes)
        surname = rnd.choice(CASTE_SURNAMES[caste])
        first = rnd.choice(MALE_NAMES if g == "Groom" else FEMALE_NAMES)
        full_name = ("%s %s" % (first, surname)).strip() if rnd.random() > 0.25 else first
        star = rnd.choice(list(NAK_TO_RASI.keys()))
        marital = "పెళ్లి కాలేదు" if age < 30 or rnd.random() > 0.12 else rnd.choice(
            ["పెళ్లి Ayyindi (Vidhava/Vidhurudu)", "Divorce Ayyindi"])
        tsap = "TSAP-%s-2025-%s" % ("F" if g == "Bride" else "M", 5000 + idx)
        out.append({
            "tsap_id": tsap, "gender": g, "full_name": full_name, "age": age,
            "dob": _dob_from_age(age, rnd), "height": rnd.choice(HEIGHTS[g]),
            "weight": rnd.choice(WEIGHTS[g]), "caste": caste,
            "sub_caste": rnd.choice(["", "", "", "Pakanati", "Deshathi", "Telaga", "Arya Vysya", "Vaidiki"]),
            "gothram": rnd.choice(GOTHRAMS), "star": star, "rasi": NAK_TO_RASI[star],
            "moola_nakshatram": rnd.choices(["No", "Yes"], weights=[88, 12])[0],
            "dosham": rnd.choices(["No", "Yes", "Not Sure"], weights=[70, 10, 20])[0],
            "religion": "Hindu", "mother_tongue": "Telugu",
            "education": education, "education_detail": rnd.choice(["", "CSE", "ECE", "Finance", "Nursing", "Commerce"]),
            "job": job, "company": company, "salary": salary,
            "experience": "%d years" % max(0, age - 22), "work_type": rnd.choice(["Private Job", "Govt Job", "Business", "Not Working"]),
            "work_location": district if rnd.random() > 0.3 else rnd.choice(["Hyderabad", "Bangalore", "Chennai", "USA", "Dubai"]),
            "father_name": rnd.choice(MALE_NAMES).split()[0] + " " + surname,
            "father_occupation": rnd.choice(["Agriculture", "Business", "Retired Govt", "Private Job"]),
            "mother_name": rnd.choice(FEMALE_NAMES).split()[0] + " " + surname,
            "mother_occupation": rnd.choice(["Housewife", "Teacher", "Agriculture", "Private Job"]),
            "brothers": str(rnd.randint(0, 3)), "brothers_married": str(rnd.randint(0, 2)),
            "sisters": str(rnd.randint(0, 3)), "sisters_married": str(rnd.randint(0, 2)),
            "family_type": rnd.choice(["Nuclear", "Joint"]),
            "family_status": rnd.choice(["Middle Class", "Upper Middle", "Rich", "Lower Middle"]),
            "family_values": rnd.choice(["Traditional", "Moderate", "Modern"]),
            "native_place": district, "state": state, "district": district, "mandal": mandal,
            "current_city": district if rnd.random() > 0.25 else "Hyderabad",
            "pincode": str(rnd.randint(500001, 535001)),
            "marital_status": marital, "physical_status": "Normal",
            "body_type": rnd.choice(["Slim", "Average", "Athletic", "Heavy"]),
            "complexion": rnd.choice(["Fair", "Very Fair", "Wheatish", "Dark"]),
            "blood_group": rnd.choice(BLOOD),
            "about_myself": rnd.choice(ABOUT), "expectations": rnd.choice(EXPECT),
            "phone": "9" + str(rnd.randint(100000000, 999999999)),
            "email": "", "photo_private": rnd.random() > 0.4,
            "phone_verified": rnd.random() > 0.35, "is_verified": rnd.random() > 0.5,
            "is_approved": True, "plan": "FREE", "credits": 3,
            "seed_source": "launch_inventory",
            "created_at": datetime.utcnow().isoformat(),
        })
    return out
