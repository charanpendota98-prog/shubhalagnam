"""
🎯 WAVE 14 — PERFECT MATCH ENGINE (మన వివాహ)
================================================
1. AGE RULE (sampradayam, DOB-date accurate):
   ammayi (bride) abbayi (groom) kanna thakkuva-vayasu (younger) or SAME DATE ayi undali.
   Ammayi 1 roju pedda ayina → SKIP (suggest vaddu). Same-day puttina → OK.
   Priority: 0–12 months thakkuva (younger) brides FIRST.
2. PROFESSION AFFINITY: Doctor→Doctor, Software→Software, Govt→Govt... same-group FIRST.
   (Score math marchamu — rank/boost layer matrame, topmatch tests safe.)
3. NRI: country/field nunchi is_nri + filters.
4. RELIGION → CASTES (alphabetical): Hindu 43 + Muslim/Christian groups.

DOB lekapothe age-years fallback (equal age → allow + note; bride_age > groom_age → block).
Data rendu lekapothe block kadu (honest unknown) — kani rank low.
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
    """
    Bride younger-or-same-date vs groom? Returns:
    {applicable, blocked, reason, verdict_telugu, gap_days, gap_text, via}
    via: dob (exact) | age_years (fallback) | unknown
    """
    bride, groom = _roles(a, b)
    if not bride:
        return {"applicable": False, "blocked": False, "reason": "same_gender_or_unknown",
                "verdict_telugu": "Age rule Bride×Groom కే (same-gender కి N/A)"}
    bd, gd = parse_dob(bride.get("dob", "")), parse_dob(groom.get("dob", ""))
    if bd and gd:
        gap = (bd - gd).days   # +ve = bride younger by N days
        if gap < 0:
            return {"applicable": True, "blocked": True, "reason": "bride_older",
                    "gap_days": gap, "via": "dob",
                    "verdict_telugu": f"🚫 Ammayi అబ్బాయి kanna {-gap} రోజు పెద్దది — సంప్రదాయం prakaram suggest cheyyamu 🙏"}
        txt = "ఒక్క roje puttaru (same date) 🎉" if gap == 0 else (
            f"అమ్మాయి {gap} rojulu చిన్న" if gap < 365 else f"అమ్మాయి ~{gap // 365}y చిన్న")
        return {"applicable": True, "blocked": False, "reason": "age_ok",
                "gap_days": gap, "gap_text": txt, "via": "dob",
                "verdict_telugu": f"✅ Vayasu set — {txt}"}
    # fallback: age years
    try:
        ba, ga = int(bride.get("age") or 0), int(groom.get("age") or 0)
    except Exception:
        ba, ga = 0, 0
    if ba and ga:
        if ba > ga:
            return {"applicable": True, "blocked": True, "reason": "bride_older",
                    "via": "age_years", "gap_days": None,
                    "verdict_telugu": f"🚫 Ammayi ({ba}) అబ్బాయి ({ga}) kanna పెద్దది — suggest cheyyamu 🙏"}
        return {"applicable": True, "blocked": False, "reason": "age_ok",
                "via": "age_years", "gap_days": None,
                "verdict_telugu": "✅ Vayasu paranga OK (DOB పెడితే date-accurate గా chustham)"}
    return {"applicable": True, "blocked": False, "reason": "age_unknown", "via": "unknown",
            "gap_days": None, "verdict_telugu": "⚠️ DOB/age లేదు — age verify cheyyalekapoyam (rank తక్కువ)"}


def age_priority_key(me: Dict, other: Dict) -> Tuple[int, int]:
    """
    Sort key (chinnadi = FIRST): 0–12 months younger brides first.
    Returns (tier, -gap_days?) — tier: 0 ideal (0–365d younger), 1 older-gap bride-younger,
    2 unknown, 3 fallback-ok. (Blocked pairs filter lo ne pothayi.)
    """
    r = age_rule_check(me, other)
    if r.get("blocked"):
        return (9, 0)
    gap = r.get("gap_days")
    if isinstance(gap, int):
        return (0, -gap) if 0 <= gap <= 365 else (1, -gap)
    if r.get("via") == "age_years":
        return (1, 0)
    return (2, 0)


def filter_age_ok(me: Dict, pool: list) -> Dict:
    kept, skipped = [], []
    for u in (pool or []):
        if (u or {}).get("tsap_id") == (me or {}).get("tsap_id"):
            kept.append(u)
            continue
        (skipped if age_rule_check(me, u).get("blocked") else kept).append(u)
    ids = [u.get("tsap_id") for u in skipped]
    return {"kept": kept, "skipped_ids": ids, "skipped_count": len(ids)}


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
    """Same-group → boost + telugu reason (rank layer కోసం)."""
    ga, gb = job_group(a), job_group(b)
    same = ga == gb and ga != "other"
    both_known = ga != "other" and gb != "other"
    return {"a_group": ga, "b_group": gb, "same_group": same, "both_known": both_known,
            "boost": 12 if same else (4 if both_known else 0),
            "reason_telugu": (f"💼 {GROUP_TE[ga]} × {GROUP_TE[gb]} — okkate rangam, understanding easy!"
                               if same else "")}


def rerank_profession(me: Dict, rows: List[Dict]) -> List[Dict]:
    """
    Rows (each with profile/score) → same-profession FIRST (score order within group).
    Score math marchadu — order + reason matrame.
    """
    def _prof(r):
        return r.get("profile") or {k: r.get(k) for k in
                ("tsap_id", "full_name", "job", "company", "education", "education_detail")}
    scored = []
    for r in (rows or []):
        aff = profession_affinity(me, _prof(r))
        r2 = dict(r)
        r2["profession"] = {"group": aff["b_group"], "group_telugu": GROUP_TE.get(aff["b_group"], ""),
                            "same_group": aff["same_group"]}
        if aff["same_group"]:
            rs = list(r2.get("reasons") or [])
            rs.insert(0, aff["reason_telugu"])
            r2["reasons"] = rs
        scored.append((0 if aff["same_group"] else 1, -(r.get("score", 0) or 0), r2))
    scored.sort(key=lambda x: (x[0], x[1]))
    return [x[2] for x in scored]


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
    """country explicit (India kakapothe NRI) + abroad-city keywords fallback."""
    c = str(country or "").strip()
    hay = f" {work_location or ''} {current_city or ''} ".lower()
    if c and c.lower() not in ("india", "bharat", "bharath", ""):
        return {"is_nri": True, "country": c, "via": "country"}
    hit = next((w for w in ABROAD_WORDS if w in hay), "")
    if hit:
        return {"is_nri": True, "country": c or "Abroad", "via": f"location:{hit}"}
    return {"is_nri": False, "country": c or "India", "via": "india"}


# ---------------------------------------------------------------------------
# 4. RELIGION → CASTES (alphabetical)
# ---------------------------------------------------------------------------
HINDU_CASTES = [
    "Adi Andhra", "Are Katika", "Arya Vysya", "Balija", "Bestha", "Bhatraju", "Bondili", "Boya",
    "Brahmin", "Dasari", "Devanga", "Gandla", "Gavara", "Gond", "Goud", "Intercaste", "Jalari",
    "Jangam", "Jogi", "Kalinga", "Kamma", "Kapu", "Koppula Velama", "Koya", "Kummara", "Kuruba",
    "Lambada", "Lingayat", "Madiga", "Mala", "Mangali", "Medari", "Meru", "Mudiraj", "Munnuru Kapu",
    "Nayee Brahmin", "Padmashali", "Perika", "Rajaka", "Raju", "Reddy", "SC Others", "Srisayana",
    "ST Others", "Telaga", "Togata", "Uppara", "Vadabalija", "Vaddera", "Velama", "Viswabrahmin",
    "Viswakarma", "Vysya", "Yadav", "Yadava"
]
MUSLIM_GROUPS = ["Ansari", "Bohra", "Dudekula", "Khoja", "Labab", "Mapila", "Memons",
                 "Mughal", "Pathan", "Qureshi", "Sheikh", "Syed", "Other Muslim"]
CHRISTIAN_GROUPS = ["Baptist", "CSI", "Lutheran", "Marthoma", "Methodist", "Orthodox",
                    "Pentecostal", "Roman Catholic", "Seventh-day Adventist", "Other Christian"]
SIKH_GROUPS = ["Jat", "Khatri", "Ramgarhia", "Other Sikh"]
JAIN_GROUPS = ["Digambara", "Shwetambara", "Other Jain"]
OTHER_GROUPS = ["Inter-caste", "No caste", "Other"]

RELIGION_CASTES: Dict[str, List[str]] = {
    "Hindu": sorted(HINDU_CASTES),
    "Muslim": sorted(MUSLIM_GROUPS),
    "Christian": sorted(CHRISTIAN_GROUPS),
    "Sikh": sorted(SIKH_GROUPS),
    "Jain": sorted(JAIN_GROUPS),
    "Buddhist": sorted(OTHER_GROUPS),
    "Other": sorted(OTHER_GROUPS),
}
RELIGIONS = ["Hindu", "Muslim", "Christian", "Sikh", "Jain", "Buddhist", "Other"]


def castes_for(religion: str) -> Dict:
    """Religion → alpha-sorted caste/group list (register + filters)."""
    r = str(religion or "").strip().capitalize()
    alias = {"Hindhu": "Hindu", "Muslims": "Muslim", "Islam": "Muslim",
             "Christians": "Christian", "Cristians": "Christian"}
    r = alias.get(r, r)
    if r not in RELIGION_CASTES:
        return {"religion": r or "Hindu", "castes": sorted(HINDU_CASTES),
                "note_telugu": "Religion తెలియదు — Hindu castes chupisthunnam"}
    return {"religion": r, "castes": list(RELIGION_CASTES[r]),
            "note_telugu": f"✅ {r} — {len(RELIGION_CASTES[r])} groups (A–Z order)"}
