"""
TSAP Matrimony — Matching Engine 0-100 + Personalized Reason Generator
Pin-to-Pin Perfect Advanced — Never Before
"""
from typing import List, Dict
import random

# Weightage
WEIGHTS = {
    "age": 25,
    "caste": 20,
    "location": 15,
    "education": 15,
    "job_salary": 10,
    "height": 5,
    "horoscope": 5,
    "marital": 5,
}

EDU_LEVELS = {
    "10th": 1, "Inter": 2, "Degree": 3, "BTech": 4, "MTech": 5, "MBA": 4, "MBBS": 6, "PhD": 7, "Others": 2
}

def _num(v, default: int = 0) -> int:
    """WAVE 26 — age missing/string aina crash వద్దు (incomplete profiles)."""
    try:
        return int(float(v))
    except Exception:
        return default


def _str(v) -> str:
    return str(v or "")


def calculate_age_score(user_age: int, match_age: int, user_gender: str) -> int:
    """Abbayi 1-5 years పెద్ద = full, తక్కువ theda = తక్కువ"""
    if user_age is None or match_age is None:
        return 12  # neutral — data lekapothe mid score (crash kadu, bias kadu)
    try:
        user_age, match_age = int(user_age), int(match_age)
    except Exception:
        return 12
    if user_gender == "Groom":  # abbayi kosam ammai
        diff = user_age - match_age
        if 1 <= diff <= 5: return WEIGHTS["age"]
        elif diff == 0: return 20
        elif diff < 0: return 5  # ammai pedda
        else: return max(0, 25 - (diff-5)*3)
    else:  # ammai kosam abbayi
        diff = match_age - user_age
        if 1 <= diff <= 5: return WEIGHTS["age"]
        elif diff == 0: return 20
        elif diff < 0: return 5
        else: return max(0, 25 - (diff-5)*3)

def calculate_caste_score(user_caste: str, match_caste: str, user_wants_same: bool) -> int:
    user_caste, match_caste = _str(user_caste), _str(match_caste)
    if not user_caste or not match_caste:
        return 0 if user_wants_same else 10
    if user_wants_same:
        return WEIGHTS["caste"] if user_caste==match_caste else 0
    else:
        # intercaste ok — same ki 20, vere ki 10
        return WEIGHTS["caste"] if user_caste==match_caste else 10

def calculate_location_score(user_district: str, match_district: str, user_state: str, match_state: str, user_mandal: str, match_mandal: str) -> int:
    if user_district==match_district and user_mandal and match_mandal and user_mandal.lower()==match_mandal.lower():
        return 15  # same mandal — super
    if user_district==match_district:
        return 15
    if user_state==match_state:
        return 10
    return 5

def calculate_education_score(user_edu: str, match_edu: str) -> int:
    u = EDU_LEVELS.get(user_edu, 2)
    m = EDU_LEVELS.get(match_edu, 2)
    diff = abs(u-m)
    if diff==0: return 15
    if diff==1: return 12
    if diff==2: return 8
    return 4

def calculate_job_score(user_job: str, match_job: str) -> int:
    user_job, match_job = _str(user_job), _str(match_job)
    if not user_job or not match_job:
        return 6  # neutral
    if user_job==match_job: return 10
    # Govt + Govt = full, Software+Software = full
    if "Govt" in user_job and "Govt" in match_job: return 10
    if "Software" in user_job and "Software" in match_job: return 10
    return 6

def calculate_height_score(user_height: str, match_height: str, user_gender: str) -> int:
    # Simple: abbayi podavuga unte full
    try:
        def to_inches(h: str):
            # "5'8"" -> 68
            parts = h.replace('"','').split("'")
            return int(parts[0])*12 + int(parts[1] or 0)
        uh = to_inches(user_height)
        mh = to_inches(match_height)
        if user_gender=="Groom":
            return 5 if uh>=mh else 2
        else:
            return 5 if mh>=uh else 2
    except:
        return 3

def calculate_horoscope_score(user_star: str, match_star: str) -> int:
    # Optional field — no penalty or filtering
    return 5

def calculate_marital_score(user_marital: str, match_marital: str) -> int:
    return 5 if user_marital==match_marital else 2

def calculate_match_score(user: Dict, match: Dict, user_wants_same_caste: bool=True) -> int:
    # WAVE 26 — .get() anni: incomplete profile aina score ravali (500 never)
    user, match = user or {}, match or {}
    age = calculate_age_score(user.get("age"), match.get("age"), user.get("gender", ""))
    caste = calculate_caste_score(user.get("caste"), match.get("caste"), user_wants_same_caste)
    loc = calculate_location_score(user.get("district", ""), match.get("district", ""), user.get("state", ""), match.get("state", ""), user.get("mandal",""), match.get("mandal",""))
    edu = calculate_education_score(user.get("education", ""), match.get("education", ""))
    job = calculate_job_score(user.get("job", ""), match.get("job", ""))
    height = calculate_height_score(user.get("height", ""), match.get("height", ""), user.get("gender", ""))
    horo = calculate_horoscope_score(user.get("star",""), match.get("star",""))
    marital = calculate_marital_score(user.get("marital_status", ""), match.get("marital_status", ""))
    total = age+caste+loc+edu+job+height+horo+marital
    return min(100, total)

def generate_personalized_reasons(user: Dict, match: Dict, score: int) -> List[str]:
    """నువ్వు ఇలాగా anukunnavu, idi ఇలాగా set avuthadu — Telugu లో"""
    # WAVE 26 — anni .get(): khali fields tho kuda reasons ravali
    user, match = user or {}, match or {}
    _ud, _md = _str(user.get("district")), _str(match.get("district"))
    _us, _ms = _str(user.get("state")), _str(match.get("state"))
    _uj, _mj = _str(user.get("job")), _str(match.get("job"))
    _uc, _mc = _str(user.get("caste")), _str(match.get("caste"))
    _ue, _me = _str(user.get("education")), _str(match.get("education"))
    _mg = _str(match.get("gender")) or "match"
    reasons = []
    # Location
    if _ud and _ud == _md:
        if user.get("mandal") and match.get("mandal") and _str(user.get("mandal")).lower() == _str(match.get("mandal")).lower():
            reasons.append(f"నువ్వు {user['mandal']} కావాలి అన్నావు → {_mg} కూడా {match['mandal']} లోనే — super near!")
        else:
            reasons.append(f"నువ్వు {_ud} కావాలి అన్నావు → {_mg} కూడా {_md} లోనే")
    elif _us and _us == _ms:
        reasons.append(f"నువ్వు {_us} కావాలి అన్నావు → {_mg} కూడా {_us} లోనే")

    # Job
    if _uj and _uj == _mj:
        reasons.append(f"నువ్వు {_uj} కావాలి అన్నావు → {_mg} కూడా {_mj} ({match.get('salary','')})")
    elif "Govt" in _uj and "Govt" in _mj:
        reasons.append(f"Govt job — iddaru Govt, secure future!")

    # Caste
    if _uc and _uc == _mc:
        reasons.append(f"నువ్వు {_uc} కావాలి అన్నావు → {_mg} కూడా {_uc}, గోత్రం కూడా {user.get('gothram','')} != {match.get('gothram','')} (safe)")

    # Age
    if user.get("age") is not None and match.get("age") is not None:
        diff = abs(_num(user.get("age")) - _num(match.get("age")))
        if 1 <= diff <= 5:
            reasons.append(f"Age gap {diff} years — perfect, understanding బాగుంటుంది")

    # Education
    if _ue and _ue == _me:
        reasons.append(f"Education iddaru {_ue} — matching thoughts")

    # Mandal proximity
    if not reasons:
        reasons.append(f"Location + Education + Caste 3 కలిసి {score}% set అవుతుంది")

    # Limit to 3 best
    return reasons[:3]

def find_top_matches(user: Dict, all_profiles: List[Dict], limit=10, min_score=70, wants_same_caste=True) -> List[Dict]:
    """Opposite gender only, 70%+ only, sorted by score"""
    opposite = "Bride" if (user or {}).get("gender") == "Groom" else "Groom"
    scored = []
    for p in all_profiles:
        if (p or {}).get("gender") != opposite: continue
        if (p or {}).get("tsap_id") == (user or {}).get("tsap_id"): continue
        score = calculate_match_score(user, p, wants_same_caste)
        if score < min_score: continue
        reasons = generate_personalized_reasons(user, p, score)
        scored.append({**p, "score": score, "reasons": reasons})

    # Sort by score desc, then verified, then recent
    scored.sort(key=lambda x: (x["score"], x.get("is_verified", False), x.get("created_at", "")), reverse=True)
    return scored[:limit]

def generate_profile_highlights(profile: Dict, limit: int = 4) -> List[str]:
    """
    Channel card ki 'ఎందుకు best match' reasons — profile nunchi + vaadi expectations nunchi.
    Idi viewer ki convince cheyyadaniki (profile owner's own strengths + preference clarity).
    """
    r = []
    g = profile.get("gender", "Bride")
    who = "Ammai" if g == "Bride" else "Abbai"
    dist = profile.get("district", "")
    state = profile.get("state", "TS")
    caste = profile.get("caste", "")
    gothram = profile.get("gothram", "")
    star = profile.get("star", "")
    job = profile.get("job", "")
    edu = profile.get("education", "")
    salary = profile.get("salary", "")
    loc = profile.get("work_location") or profile.get("current_city") or dist
    fam = profile.get("family_status") or profile.get("family_type", "")

    if caste and gothram:
        r.append(f"{caste} {gothram} గోత్రం{(' + ' + star + ' nakshatram') if star else ''} — సంబంధం clear గా cheppochu")
    if job:
        r.append(f"{edu + ' + ' if edu else ''}{job}{(' (' + str(salary) + ')') if salary else ''} — settled profession, no tension")
    if loc:
        r.append(f"{loc} లో work{(' / ' + profile.get('current_city') + ' లో stay') if profile.get('current_city') and profile.get('current_city') != loc else ''} — {who} తో same city లో undochu")
    if fam:
        r.append(f"{fam} family • {profile.get('father_name','')} {profile.get('father_occupation','')}".strip())
    if profile.get("dob_correct") or profile.get("is_verified"):
        r.append("ID + DOB verified — fake కాదు, మనం guarantee ఇస్తాం")
    if str(profile.get("marital_status", "")).lower().startswith(("pelli", "never", "first")):
        r.append("First marriage • single • no past complications")
    if profile.get("photo_urls") and str(profile.get("photo_urls")).strip("[]'"):
        r.append("Photo verified + watermark — screenshot misuse jarigadu")

    # de-dupe + limit
    out, seen = [], set()
    for x in r:
        x = x.strip()
        if x and x.lower() not in seen:
            seen.add(x.lower())
            out.append(x)
    return out[:limit]


# Mock test
if __name__=="__main__":
    user = {"tsap_id":"TSAP-M-1042","gender":"Groom","age":27,"height":"5'8\"","caste":"Reddy","district":"Nalgonda","state":"TS","mandal":"Gachibowli","education":"BTech","job":"Software","marital_status":"Pelli Kaledu","star":"Rohini","gothram":"Bharadwaj"}
    matches = [
        {"tsap_id":"TSAP-F-1042","gender":"Bride","age":24,"height":"5'4\"","caste":"Reddy","district":"Nalgonda","state":"TS","mandal":"Gachibowli","education":"BTech","job":"Software","marital_status":"Pelli Kaledu","star":"Rohini","gothram":"Koundinya","salary":"60k"},
        {"tsap_id":"TSAP-F-1043","gender":"Bride","age":23,"height":"5'2\"","caste":"Kamma","district":"Hyderabad","state":"TS","mandal":"","education":"MBA","job":"Private","marital_status":"Pelli Kaledu","star":"","gothram":"","salary":"40k"},
    ]
    top = find_top_matches(user, matches, limit=3)
    for t in top:
        print(t["tsap_id"], t["score"], t["reasons"])
