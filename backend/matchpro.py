"""Optional filtering helpers for explicit age rules and NRI data.

These helpers do not infer compatibility from profession categories. Ranking of
profiles must use saved member preferences and actual recency only.
"""
from __future__ import annotations

from datetime import date
from typing import Dict, List, Optional, Tuple

# ---------------------------------------------------------------------------
# 1. AGE RULE
# ---------------------------------------------------------------------------

def parse_dob(dob: str) -> Optional[date]:
    """'YYYY-MM-DD' → date · junk → None (crash ledu)."""
    try:
        y, m, d = str(dob or "").strip().split("-")
        return date(int(y), int(m), int(d))
    except Exception:
        return None


def _roles(a: Dict, b: Dict) -> Tuple[Optional[Dict], Optional[Dict]]:
    """(bride, groom) — same gender/unknown → (None, None)."""
    ga, gb = (a or {}).get("gender"), (b or {}).get("gender")
    if ga == "Bride" and gb == "Groom":
        return a, b
    if ga == "Groom" and gb == "Bride":
        return b, a
    return None, None


def age_rule_check(a: Dict, b: Dict) -> Dict:
    """Report available age facts only; never exclude or rank a pair by gendered age rules."""
    bride, groom = _roles(a, b)
    if not bride:
        return {"applicable": False, "blocked": False, "reason": "roles_unknown",
                "note_telugu": "వయస్సు పోలికకు Bride/Groom వివరాలు రెండూ అందుబాటులో లేవు."}
    bd, gd = parse_dob(bride.get("dob", "")), parse_dob(groom.get("dob", ""))
    if bd and gd:
        gap = (bd - gd).days
        return {"applicable": True, "blocked": False, "reason": "age_details_available",
                "gap_days": gap, "via": "dob",
                "note_telugu": f"సభ్యులు నమోదు చేసిన పుట్టిన తేదీల మధ్య {abs(gap)} రోజుల తేడా ఉంది; తేదీలను స్వతంత్రంగా నిర్ధారించండి."}
    try:
        ba, ga = int(bride.get("age") or 0), int(groom.get("age") or 0)
    except (TypeError, ValueError, OverflowError):
        ba, ga = 0, 0
    if 18 <= ba <= 100 and 18 <= ga <= 100:
        gap = abs(ba - ga)
        return {"applicable": True, "blocked": False, "reason": "age_details_available",
                "gap_years": gap, "via": "age_years",
                "note_telugu": f"సభ్యులు నమోదు చేసిన వయస్సుల మధ్య {gap} సంవత్సరాల తేడా ఉంది; పుట్టిన తేదీలను స్వతంత్రంగా నిర్ధారించండి."}
    return {"applicable": True, "blocked": False, "reason": "age_unknown", "via": "unknown",
            "note_telugu": "వయస్సు వివరాలు అందుబాటులో లేవు; ఎలాంటి age-based exclusion చేయలేదు."}


def age_priority_key(me: Dict, other: Dict) -> Tuple[int, int]:
    """Neutral compatibility helper; ages do not affect ranking."""
    return (0, 0)


def filter_age_ok(me: Dict, pool: list) -> Dict:
    """Legacy name: return candidates unchanged; age suitability is member-led."""
    return {"kept": list(pool or []), "skipped_ids": [], "skipped_count": 0}


# ---------------------------------------------------------------------------
# 2. PROFESSION AFFINITY (job-first ranking)
# ---------------------------------------------------------------------------
# group → keywords (job + company + education_detail text lo match)
JOB_GROUPS: Dict[str, List[str]] = {
    "doctor": ["doctor", "mbbs", "md ", " ms ", "surgeon", "physician", "ayurveda", "homeopathy",
               "dentist", "pharma", "nurse", "hospital", "apollo", "kims", "yashoda", "medical"],
    "software": ["software", "developer", "engineer - software", " it ", "programmer", "data scientist",
                 "data analyst", "tcs", "infosys", "wipro", "google", "amazon", "microsoft", "startup"],
    "govt": ["government", "govt", "ias", "ips", "upsc", "group-", "group ", "teacher-govt", "rtc",
             "railway", "bank po", "sbi ", "police constable", "army", "navy", "defence"],
    "teacher": ["teacher", "lecturer", "professor", "tutor", "school", "college faculty", "principal"],
    "engineer": ["engineer", "civil", "mechanical", "electrical", "site engineer", "contractor"],
    "police": ["police", "constable", "sub-inspector", "si ", "circle inspector"],
    "business": ["business", "shop", "trader", "dealer", "distributor", "own business", "entrepreneur",
                 "boutique", "hotel owner", "real estate"],
    "accounts": ["accountant", "accounts", "ca ", "auditor", "bank clerk", "finance"],
    "farmer": ["farmer", "agriculture", "rythu", "vyavasayam"],
    "private": ["private", "company", "executive", "manager", "sales", "marketing", "hr ", "clerk",
                "technician", "driver", "operator"],
}
GROUP_TE = {"doctor": "🩺 Doctor/Medical", "software": "💻 Software/IT", "govt": "🏛️ Govt job",
            "teacher": "📚 Teacher", "engineer": "🏗️ Engineer", "police": "🚔 Police/Defence",
            "business": "🏪 Business", "accounts": "🧾 Accounts/Bank", "farmer": "🌾 Farmer",
            "private": "🏢 Private job", "other": "💼 Other"}


def job_group(profile: Dict) -> str:
    """Profile → 1 group (first keyword hit; order = priority)."""
    hay = " ".join(str((profile or {}).get(k, "")) for k in ("job", "company", "education_detail", "education")).lower()
    hay = f" {hay} "
    for grp, kws in JOB_GROUPS.items():
        for kw in kws:
            if kw.strip() and kw.strip() in hay:
                return grp
    return "other"


def profession_affinity(a: Dict, b: Dict) -> Dict:
    """Describe an exact same-job entry only; job categories do not affect ranking."""
    job_a = str((a or {}).get("job") or "").strip()
    job_b = str((b or {}).get("job") or "").strip()
    same = bool(job_a and job_b and job_a.casefold() == job_b.casefold())
    return {"a_group": job_group(a), "b_group": job_group(b), "same_group": same,
            "both_known": bool(job_a and job_b), "boost": 0,
            "reason_telugu": f"రెండు profiles‌లోనూ వృత్తిగా {job_a} నమోదు చేశారు." if same else ""}


def rerank_profession(me: Dict, rows: List[Dict]) -> List[Dict]:
    """Legacy no-op: profession or education categories never alter candidate order."""
    return list(rows or [])

# ---------------------------------------------------------------------------
# 3. NRI
# ---------------------------------------------------------------------------
ABROAD_WORDS = ["usa", "america", "united states", "uk", "london", "canada", "toronto",
                "australia", "sydney", "melbourne", "dubai", "uae", "sharjah", "qatar", "doha",
                "kuwait", "saudi", "muscat", "oman", "singapore", "malaysia", "germany",
                "france", "netherlands", "ireland", "new zealand", "japan", "abroad", "nri",
                "gulf", "bahrain"]


def detect_nri(country: str = "", work_location: str = "", current_city: str = "",
               state: str = "") -> Dict:
    """Use an explicit country or member-entered location; leave unknown country blank."""
    c = str(country or "").strip()
    hay = f" {work_location or ''} {current_city or ''} ".casefold()
    if c and c.casefold() not in ("india", "bharat", "bharath"):
        return {"is_nri": True, "country": c, "via": "country"}
    if c:
        return {"is_nri": False, "country": c, "via": "country"}
    hit = next((w for w in ABROAD_WORDS if w in hay), "")
    if hit:
        return {"is_nri": True, "country": "", "via": f"member_location:{hit}"}
    return {"is_nri": False, "country": "", "via": "unknown"}


# ---------------------------------------------------------------------------
# 4. RELIGION → CASTES (alphabetical)
# ---------------------------------------------------------------------------
HINDU_CASTES = [
    "Adi Andhra", "Are Katika", "Arya Vysya", "Balija", "Bestha", "Bhatraju", "Bondili", "Boya",
    "Brahmin", "Dasari", "Devanga", "Gandla", "Gavara", "Gond", "Goud", "Intercaste", "Jalari",
    "Jangam", "Jogi", "Kalinga", "Kamma", "Kapu", "Koppula Velama", "Koya", "Kummara", "Kuruba",
    "Lambada", "Lingayat", "Madiga", "Mala", "Mangali", "Medari", "Meru", "Mudiraj", "Munnuru Kapu",
    "Nayee Brahmin", "Other / self-described", "Padmashali", "Perika", "Rajaka", "Raju", "Reddy",
    "SC Others", "Srisayana", "ST Others", "Telaga", "Togata", "Uppara", "Vadabalija", "Vaddera",
    "Velama", "Viswabrahmin", "Viswakarma", "Vysya", "Yadav", "Yadava",
]
MUSLIM_GROUPS = ["Ansari", "Bohra", "Dudekula", "Khoja", "Labab", "Mapila", "Memons",
                 "Mughal", "Pathan", "Qureshi", "Sheikh", "Syed", "Other Muslim", "Other / self-described"]
CHRISTIAN_GROUPS = ["Baptist", "CSI", "Lutheran", "Marthoma", "Methodist", "Orthodox",
                    "Pentecostal", "Roman Catholic", "Seventh-day Adventist", "Other Christian", "Other / self-described"]
SIKH_GROUPS = ["Jat", "Khatri", "Ramgarhia", "Other Sikh", "Other / self-described"]
JAIN_GROUPS = ["Digambara", "Shwetambara", "Other Jain", "Other / self-described"]
OTHER_GROUPS = ["Inter-caste", "No caste", "Other", "Other / self-described"]

def _alpha_unique(values: List[str]) -> List[str]:
    return sorted(set(values), key=lambda value: (value.casefold(), value))


RELIGION_CASTES: Dict[str, List[str]] = {
    "Hindu": _alpha_unique(HINDU_CASTES),
    "Muslim": _alpha_unique(MUSLIM_GROUPS),
    "Christian": _alpha_unique(CHRISTIAN_GROUPS),
    "Sikh": _alpha_unique(SIKH_GROUPS),
    "Jain": _alpha_unique(JAIN_GROUPS),
    "Buddhist": _alpha_unique(OTHER_GROUPS),
    "Other": _alpha_unique(OTHER_GROUPS),
}
RELIGIONS = ["Hindu", "Muslim", "Christian", "Sikh", "Jain", "Buddhist", "Other"]


def castes_for(religion: str) -> Dict:
    """Supported religion → alpha-sorted caste/community list."""
    r = str(religion or "Hindu").strip().capitalize()
    r = {"Hindhu": "Hindu", "Islam": "Muslim", "Muslims": "Muslim",
         "Christians": "Christian"}.get(r, r)
    if r not in RELIGIONS:
        r = "Other"
    return {"religion": r, "castes": list(RELIGION_CASTES[r]),
            "note_telugu": f"✅ {r} — {len(RELIGION_CASTES[r])} groups (A–Z order)"}
