"""
⭐ PROFILE COMPLETENESS + VERIFICATION FACTS + SAVED SEARCHES + CONSENT LEDGER
====================================================================
  • profile_completeness()  → form lo em miss ayyindo % + Telugu tips (not an identity/trust score)
  • verification evidence  → separate recorded checks; never a numeric trust judgment
  • saved searches          → "ee filters తో కొత్త profiles వస్తే WhatsApp alert" (advanced feature)
  • consent ledger          → owner acceptance/contact-access events (not proof of notification delivery)
  • interest templates      → Telugu ready-made messages (users ki easy + spam takkuva)
  • facets                  → search UI chips ki caste/district/education counts
"""
from __future__ import annotations

import json
import os
import re
from datetime import datetime
from typing import Any, Dict, List, Optional


def _has_verification_evidence(user: Dict[str, Any]) -> bool:
    u = user or {}
    return bool(u.get("phone_verified") or u.get("selfie_verified")
                or u.get("photo_status") == "approved" or u.get("id_verified"))

from hardening import clean, req_int, req_text, validation_error
from matchpro import detect_nri
from models import is_never_married_status

STATE_DIR = os.environ.get("MANA_VIVAHA_STATE_DIR", os.path.dirname(os.path.abspath(__file__)))
SAVED_STATE_FILE = os.path.join(STATE_DIR, "saved_searches_state.json")
CONSENT_STATE_FILE = os.path.join(STATE_DIR, "consent_ledger_state.json")

SAVED_SEARCHES: List[Dict[str, Any]] = []
CONSENT_LEDGER: List[Dict[str, Any]] = []


def _load(path: str, target: List[Dict[str, Any]]) -> None:
    try:
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as fh:
                data = json.load(fh)
            if isinstance(data, list):
                target[:] = data
    except Exception:
        pass


def _save(path: str, data: Any) -> None:
    try:
        with open(path, "w", encoding="utf-8") as fh:
            json.dump(data, fh, ensure_ascii=False)
    except Exception:
        pass


load_saved_searches = lambda: _load(SAVED_STATE_FILE, SAVED_SEARCHES)      # noqa: E731
save_saved_searches = lambda: _save(SAVED_STATE_FILE, SAVED_SEARCHES[-2000:])  # noqa: E731


def load_consent_ledger() -> None:
    _load(CONSENT_STATE_FILE, CONSENT_LEDGER)
    CONSENT_LEDGER[:] = CONSENT_LEDGER[-5000:]


def save_consent_ledger() -> None:
    CONSENT_LEDGER[:] = CONSENT_LEDGER[-5000:]
    _save(CONSENT_STATE_FILE, CONSENT_LEDGER)


# ---------------------------------------------------------------------------
# 1. PROFILE COMPLETENESS
# ---------------------------------------------------------------------------
# (field, weight, telugu label, group)
COMPLETENESS_FIELDS: List[Dict[str, Any]] = [
    {"key": "full_name", "w": 8, "label": "పూర్తి పేరు", "group": "basic"},
    {"key": "gender", "w": 6, "label": "Bride/Groom", "group": "basic"},
    {"key": "age", "w": 6, "label": "వయస్సు", "group": "basic"},
    {"key": "dob", "w": 5, "label": "పుట్టిన తేదీ", "group": "basic"},
    {"key": "height", "w": 4, "label": "ఎత్తు", "group": "basic"},
    {"key": "marital_status", "w": 4, "label": "Marital status", "group": "basic"},
    {"key": "photo_urls", "w": 10, "label": "ఫోటో (1-2 clear photos)", "group": "photo", "is_list": True},
    {"key": "caste", "w": 6, "label": "కులం / Community", "group": "community"},
    {"key": "sub_caste", "w": 3, "label": "Sub caste", "group": "community"},
    {"key": "gothram", "w": 3, "label": "gothram", "group": "community"},
    {"key": "star", "w": 3, "label": "నక్షత్రం", "group": "astro"},
    {"key": "rasi", "w": 2, "label": "rasi", "group": "astro"},
    {"key": "education", "w": 6, "label": "చదువు", "group": "career"},
    {"key": "college", "w": 3, "label": "College / University", "group": "career"},
    {"key": "job", "w": 6, "label": "ఉద్యోగం / వ్యాపారం", "group": "career"},
    {"key": "company", "w": 3, "label": "Company", "group": "career"},
    {"key": "salary", "w": 5, "label": "ఆదాయం", "group": "career"},
    {"key": "work_location", "w": 3, "label": "Work location", "group": "career"},
    {"key": "father_name", "w": 3, "label": "తండ్రి పేరు", "group": "family"},
    {"key": "mother_name", "w": 3, "label": "తల్లి పేరు", "group": "family"},
    {"key": "father_occupation", "w": 2, "label": "తండ్రి వృత్తి", "group": "family"},
    {"key": "mother_occupation", "w": 2, "label": "తల్లి వృత్తి", "group": "family"},
    {"key": "brothers", "w": 2, "label": "అన్నదమ్ములు", "group": "family"},
    {"key": "sisters", "w": 2, "label": "అక్కచెల్లెళ్లు", "group": "family"},
    {"key": "native_place", "w": 3, "label": "సొంత ఊరు", "group": "family"},
    {"key": "about_myself", "w": 6, "label": "మీ గురించి (2-3 lines)", "group": "about"},
    {"key": "about_family", "w": 4, "label": "కుటుంబం గురించి", "group": "about"},
    {"key": "expectations", "w": 4, "label": "ఏం కోరుకుంటున్నారు", "group": "about"},
    {"key": "state", "w": 2, "label": "రాష్ట్రం", "group": "location"},
    {"key": "district", "w": 3, "label": "జిల్లా", "group": "location"},
    {"key": "current_city", "w": 3, "label": "ప్రస్తుత నగరం", "group": "location"},
    {"key": "email", "w": 2, "label": "Email (optional)", "group": "contact", "optional": True},
    {"key": "phone_verified", "w": 5, "label": "Phone verify (OTP)", "group": "contact"},
]

COMPLETENESS_LABELS_EN = {
    "full_name": "Full name", "gender": "Bride or groom", "age": "Age", "dob": "Date of birth",
    "height": "Height", "marital_status": "Marital status", "photo_urls": "Profile photos",
    "caste": "Community", "sub_caste": "Sub-community", "gothram": "Gothram", "star": "Nakshatram",
    "rasi": "Rasi", "education": "Education", "college": "College or university", "job": "Occupation",
    "company": "Company", "salary": "Income range", "work_location": "Work location",
    "father_name": "Father's name", "mother_name": "Mother's name", "father_occupation": "Father's occupation",
    "mother_occupation": "Mother's occupation", "brothers": "Brothers", "sisters": "Sisters",
    "native_place": "Native place", "about_myself": "About you", "about_family": "About your family",
    "expectations": "Partner preferences", "state": "State", "district": "District",
    "current_city": "Current city", "email": "Email (optional)", "phone_verified": "Phone verification (OTP)",
}

TOTAL_WEIGHT = sum(f["w"] for f in COMPLETENESS_FIELDS)


def _filled(user: Dict[str, Any], field: Dict[str, Any]) -> bool:
    val = (user or {}).get(field["key"])
    if field.get("is_list"):
        return bool(val)
    if isinstance(val, bool):
        return val
    if isinstance(val, (int, float)):
        return bool(val) or field["key"] in ("brothers", "sisters")
    return bool(str(val or "").strip()) and str(val).strip() not in ("—", "-", "NA")


def profile_completeness(user: Dict[str, Any]) -> Dict[str, Any]:
    """% + ఏం miss ayyindo + Telugu tips (register clarity + profile improve fix)."""
    got = sum(f["w"] for f in COMPLETENESS_FIELDS if _filled(user, f))
    percent = int(round(got * 100 / TOTAL_WEIGHT)) if TOTAL_WEIGHT else 0
    missing = [{"key": f["key"], "label": f["label"],
                "label_en": COMPLETENESS_LABELS_EN.get(f["key"], f["key"].replace("_", " ").title()),
                "group": f["group"], "weight": f["w"]}
               for f in COMPLETENESS_FIELDS if not _filled(user, f)]
    important = [m for m in missing if m["weight"] >= 5 and not m.get("optional")][:5]
    if percent >= 90:
        level, telugu, english = "excellent", "✅ Profile‌లోని చాలా వివరాలు నింపబడ్డాయి; member-entered వివరాలను స్వతంత్రంగా నిర్ధారించండి.", "✅ Most profile fields are complete. Independently verify member-provided details."
    elif percent >= 70:
        level, telugu, english = "good", "📝 Profile‌ను మరింత పూర్తి చేయడానికి చూపించిన ఖాళీ fields పరిశీలించండి.", "📝 Review the suggested fields to complete your profile further."
    elif percent >= 45:
        level, telugu, english = "average", "📝 Profile వివరాలు ఇంకా జోడించవచ్చు; ఫలితాలు లేదా responses‌కు హామీ లేదు.", "📝 You can add more profile details. Outcomes or responses are not guaranteed."
    else:
        level, telugu, english = "low", "📝 Profile వివరాలు నింపడానికి చూపించిన fields‌ను పరిశీలించండి.", "📝 Review the suggested fields to add more profile details."
    return {
        "percent": percent, "level": level, "verdict_telugu": telugu, "verdict_en": english,
        "missing": missing[:12], "missing_count": len(missing),
        "missing_en": [{**m, "label": m["label_en"]} for m in missing[:12]],
        "important_telugu": [f"➕ {m['label']} add చెయ్యండి" for m in important],
        "important_en": [f"➕ Add {m['label_en']} to your profile." for m in important],
        "sections": _section_breakdown(user),
        "bonus_telugu": "📸 Photo visibility privacy settings పై ఆధారపడి ఉంటుంది. Phone OTP ఆ number access‌ను మాత్రమే నిర్ధారిస్తుంది; profile వివరాలు సభ్యుడు అందిస్తారు.",
        "bonus_en": "📸 Photo visibility depends on your privacy settings. Phone OTP confirms access to the number only; profile details are supplied by the member.",
    }


def _section_breakdown(user: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
    out: Dict[str, Dict[str, Any]] = {}
    for f in COMPLETENESS_FIELDS:
        sec = out.setdefault(f["group"], {"done": 0, "total": 0, "percent": 0})
        sec["total"] += f["w"]
        if _filled(user, f):
            sec["done"] += f["w"]
    for sec in out.values():
        sec["percent"] = int(round(sec["done"] * 100 / sec["total"])) if sec["total"] else 0
    return out


# ---------------------------------------------------------------------------
# 2. LEGACY TRUST-SCORE SHIM
# ---------------------------------------------------------------------------
def trust_score(user: Dict[str, Any], interests: Optional[List[Dict[str, Any]]] = None,
                reports_against: int = 0, blocks_against: int = 0) -> Dict[str, Any]:
    """Deprecated compatibility shim: expose verification/completeness facts only.

    Verification, profile completeness, activity, reports, and blocks are not
    collapsed into a numeric trustworthiness judgment.
    """
    u = user or {}
    return {
        "calculated": False,
        "verification_evidence": {
            "phone_verified": bool(u.get("phone_verified")),
            "photo_reviewed": bool(u.get("selfie_verified") or u.get("photo_status") == "approved"),
            "id_reviewed": bool(u.get("id_verified")),
        },
        "profile_completeness_percent": profile_completeness(u).get("percent", 0),
        "notice": "No trust score is calculated. Verify identity and member-provided details independently.",
    }


# ---------------------------------------------------------------------------
# 3. SAVED SEARCHES (+ new-match alerts)
# ---------------------------------------------------------------------------
FILTER_KEYS = [
    "gender", "caste", "sub_caste", "district", "state", "job", "education",
    "marital_status", "children", "religion", "age_min", "age_max", "salary_min",
    "salary_max", "height_min", "height_max", "verified_only", "photo_only", "nri_only",
    "dosham", "star", "rasi", "q",
]
MULTI_FILTER_KEYS = {
    "caste", "sub_caste", "district", "state", "job", "education", "marital_status",
    "religion", "star", "rasi", "dosham",
}
BOOLEAN_FILTER_KEYS = {"verified_only", "photo_only", "nri_only"}


def _filter_bool(value: Any, field: str) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, int) and value in (0, 1):
        return bool(value)
    text = str(value or "").strip().lower()
    if text in ("1", "true", "yes", "on"):
        return True
    if text in ("0", "false", "no", "off", ""):
        return False
    validation_error(field, "⚠️ Filter value must be true or false")


def normalize_filters(raw: Dict[str, Any]) -> Dict[str, Any]:
    """Keep saved-search filters typed, bounded, and aligned with /api/search."""
    raw = raw if isinstance(raw, dict) else {}
    out: Dict[str, Any] = {}
    for key in FILTER_KEYS:
        value = raw.get(key)
        if value is None or value == "" or value == []:
            continue
        if key in BOOLEAN_FILTER_KEYS:
            enabled = _filter_bool(value, key)
            if enabled:
                out[key] = True
            continue
        if key in ("age_min", "age_max"):
            out[key] = req_int(value, key, 18, 70, default=18 if key == "age_min" else 70)
        elif key in ("salary_min", "salary_max"):
            amount = req_int(value, key, 0, 100_000_000, default=None)
            if amount:
                out[key] = amount
        elif key in ("height_min", "height_max"):
            cleaned = clean(value, 12, key)
            if cleaned:
                out[key] = cleaned
        else:
            max_length = 500 if key in MULTI_FILTER_KEYS else 80 if key == "dosham" else 60
            cleaned = clean(value, max_length, key)
            if cleaned:
                out[key] = cleaned
    if int(out.get("age_min", 18)) > int(out.get("age_max", 60)):
        validation_error("age_min", "⚠️ age_min < age_max ఉండాలి")
    if out.get("salary_min") and out.get("salary_max") and out["salary_min"] > out["salary_max"]:
        validation_error("salary_min", "⚠️ salary_min < salary_max ఉండాలి")
    return out


def save_search(tsap_id: str, name: str, filters: Dict[str, Any], alert: bool = False) -> Dict[str, Any]:
    norm = normalize_filters(filters)
    if not norm:
        validation_error("filters", "⚠️ కొన్ని filters పెట్టండి — appudu save cheyyagalam")
    if len(saved_for(tsap_id)) >= 20:
        validation_error("searches", "⚠️ ఒక ఖాతాకు గరిష్ఠంగా 20 saved searches మాత్రమే ఉంచవచ్చు")
    name = req_text(name, "search name", 2, 40, required=False) or "My search"
    existing_ids = set()
    for saved in SAVED_SEARCHES:
        try:
            existing_ids.add(int(str(saved.get("search_id", "")).removeprefix("SRCH-")))
        except (TypeError, ValueError):
            continue
    sid = f"SRCH-{max(existing_ids, default=0) + 1:05d}"
    alert_enabled = _filter_bool(alert, "alert")
    consent_at = datetime.utcnow().isoformat() if alert_enabled else ""
    rec = {"search_id": sid, "tsap_id": tsap_id, "name": name, "filters": norm, "alert": alert_enabled,
           "alert_consent_at": consent_at, "created_at": datetime.utcnow().isoformat(),
           "last_alert_at": "", "alerts_sent": 0,
           "last_seen_ids": []}
    SAVED_SEARCHES.append(rec)
    save_saved_searches()
    return rec


def saved_for(tsap_id: str) -> List[Dict[str, Any]]:
    return [s for s in SAVED_SEARCHES if s.get("tsap_id") == tsap_id]


def delete_search(tsap_id: str, search_id: str) -> bool:
    before = len(SAVED_SEARCHES)
    SAVED_SEARCHES[:] = [s for s in SAVED_SEARCHES
                         if not (s.get("tsap_id") == tsap_id and s.get("search_id") == search_id)]
    changed = len(SAVED_SEARCHES) != before
    if changed:
        save_saved_searches()
    return changed


def set_search_alert(tsap_id: str, search_id: str, alert: Any) -> Optional[Dict[str, Any]]:
    enabled = _filter_bool(alert, "alert")
    rec = next((row for row in SAVED_SEARCHES
                if row.get("tsap_id") == tsap_id and row.get("search_id") == search_id), None)
    if rec is None:
        return None
    rec["alert"] = enabled
    rec["alert_consent_at"] = datetime.utcnow().isoformat() if enabled else ""
    save_saved_searches()
    return rec


def _height_cm(value: Any) -> int:
    """'5.6' / 5'6" / '168 cm' → cm (unknown = 0)."""
    s = str(value or "").strip().lower()
    if not s:
        return 0
    m = re.search(r"(\d+)\s*cm", s)
    if m:
        return int(m.group(1))
    m = re.match(r"^(\d)[.']\s*(\d{1,2})", s)
    if m:
        return int(round((int(m.group(1)) * 12 + int(m.group(2))) * 2.54))
    m = re.match(r"^(\d)[.](\d)$", s)          # 5.6 feet.inches (matrimony style)
    if m:
        return int(round((int(m.group(1)) * 12 + int(m.group(2))) * 2.54))
    m = re.search(r"(\d)", s)
    return int(m.group(1)) * 30 if m else 0


def _filter_terms(value: Any) -> List[str]:
    if isinstance(value, (list, tuple, set)):
        raw = [str(item or "") for item in value]
    else:
        raw = str(value or "").split(",")
    seen = set()
    result = []
    for item in raw:
        term = item.strip().casefold()
        if term and term not in seen:
            seen.add(term)
            result.append(term)
    return result


def _salary_amount(user: Dict[str, Any]) -> int:
    raw = str((user or {}).get("salary") or "").casefold().replace("l", "00000").replace("k", "000")
    digits = "".join(ch for ch in raw if ch.isdigit())
    try:
        return int(digits) if digits else 0
    except Exception:
        return 0


def _matches_marital_filter(profile_status: Any, selected: str) -> bool:
    actual = str(profile_status or "").strip().casefold()
    if is_never_married_status(selected):
        return is_never_married_status(actual)
    if is_never_married_status(actual):
        return False
    if selected in ("divorced", "vidakuulu"):
        return any(term in actual for term in ("divorc", "vidak", "విడాకు"))
    if selected in ("widow", "widower", "widowed", "vidhava", "vidhurudu"):
        return any(term in actual for term in ("widow", "vidh", "వితంతు", "విధురు"))
    if selected in ("awaiting divorce", "separated"):
        return any(term in actual for term in ("awaiting", "separat", "విడాకుల", "నిరీక్షణ"))
    return bool(selected and selected in actual)


def _children_count(value: Any) -> Optional[int]:
    raw = str(value or "").strip().casefold()
    if raw in ("none", "no", "no children", "0", "పిల్లలు లేరు"):
        return 0
    match = re.search(r"\d+", raw)
    return int(match.group()) if match else None


def matches_filters(user: Dict[str, Any], filters: Dict[str, Any]) -> bool:
    """Match one profile using the same user-visible semantics as /api/search."""
    u = user or {}
    f = filters or {}

    gender = str(f.get("gender") or "").strip().casefold()
    if gender:
        gender = {"male": "groom", "female": "bride"}.get(gender, gender)
        actual_gender = {"male": "groom", "female": "bride"}.get(
            str(u.get("gender") or "").strip().casefold(), str(u.get("gender") or "").strip().casefold()
        )
        if actual_gender != gender:
            return False

    caste_terms = _filter_terms(f.get("caste"))
    if caste_terms and not any(
        term in str(u.get("caste") or "").casefold() or term in str(u.get("sub_caste") or "").casefold()
        for term in caste_terms
    ):
        return False
    sub_caste_terms = _filter_terms(f.get("sub_caste"))
    if sub_caste_terms and not any(term in str(u.get("sub_caste") or "").casefold() for term in sub_caste_terms):
        return False
    district_terms = _filter_terms(f.get("district"))
    if district_terms and not any(
        term in str(u.get("district") or "").casefold() or term in str(u.get("current_city") or "").casefold()
        for term in district_terms
    ):
        return False
    state_terms = {term.upper() for term in _filter_terms(f.get("state"))}
    if state_terms and str(u.get("state") or "").strip().upper() not in state_terms:
        return False

    job_terms = _filter_terms(f.get("job"))
    if job_terms:
        job = str(u.get("job") or "").casefold()
        work_type = str(u.get("work_type") or "").casefold()
        homemaker_terms = ("housewife", "homemaker", "గృహిణి", "not working")
        if not any(
            term in job or term in work_type or (
                any(alias in term for alias in homemaker_terms)
                and (not job.strip() or any(alias in job for alias in (*homemaker_terms, "student", "none", "no job")))
            )
            for term in job_terms
        ):
            return False
    education_terms = _filter_terms(f.get("education"))
    if education_terms and not any(term in str(u.get("education") or "").casefold() for term in education_terms):
        return False

    marital_terms = _filter_terms(f.get("marital_status"))
    second_marriage_markers = ("second_marriage", "second marriage", "remarriage", "punarvivaham", "punar vivaham")
    second_marriage = any(marker in term for term in marital_terms for marker in second_marriage_markers)
    if second_marriage:
        if is_never_married_status(u.get("marital_status")) or not str(u.get("marital_status") or "").strip():
            return False
    elif marital_terms and not any(_matches_marital_filter(u.get("marital_status"), term) for term in marital_terms):
        return False

    religion_terms = _filter_terms(f.get("religion"))
    if religion_terms and str(u.get("religion") or "").strip().casefold() not in religion_terms:
        return False
    if f.get("verified_only") and not _has_verification_evidence(u):
        return False
    if f.get("photo_only"):
        photos = u.get("photo_urls") if isinstance(u.get("photo_urls"), list) else []
        photos = list(photos) + [u.get("photo_url")]
        has_photo = any(str(photo or "").strip() for photo in photos)
        if (u.get("photo_status") != "approved" or u.get("photo_private")
                or u.get("privacy_mode") == "private" or not has_photo):
            return False
    if f.get("nri_only"):
        nri = bool(u.get("is_nri")) or bool(detect_nri(
            str(u.get("country") or ""), str(u.get("work_location") or ""),
            str(u.get("current_city") or ""), str(u.get("state") or ""),
        ).get("is_nri"))
        if not nri:
            return False

    dosham_terms = _filter_terms(f.get("dosham"))
    if dosham_terms and not any(term in str(u.get("dosham") or "").casefold() for term in dosham_terms):
        return False
    star_terms = _filter_terms(f.get("star"))
    if star_terms and not any(term in str(u.get("star") or "").casefold() for term in star_terms):
        return False
    rasi_terms = _filter_terms(f.get("rasi"))
    if rasi_terms and not any(term in str(u.get("rasi") or "").casefold() for term in rasi_terms):
        return False

    children_terms = _filter_terms(f.get("children"))
    children_ignored = bool(marital_terms) and all(is_never_married_status(term) for term in marital_terms)
    if children_terms and not children_ignored:
        raw_children = str(u.get("children") or "").strip().casefold()
        child_count = _children_count(raw_children)
        if is_never_married_status(u.get("marital_status")):
            return False
        def _children_match(selected: str) -> bool:
            if selected in ("none", "no", "no children", "0", "పిల్లలు లేరు"):
                return child_count == 0
            if selected in ("with_children", "has_children", "yes", "పిల్లలు ఉన్నారు"):
                return child_count is not None and child_count > 0
            if selected.endswith("+") and selected[:-1].isdigit():
                return child_count is not None and child_count >= int(selected[:-1])
            if selected.isdigit():
                return child_count == int(selected)
            return selected in raw_children
        if not any(_children_match(term) for term in children_terms):
            return False

    try:
        age = int(u.get("age") or 0)
    except Exception:
        age = 0
    age_min = int(f.get("age_min", 18) or 18)
    age_max = int(f.get("age_max", 60) or 60)
    if not age or age < age_min or age > age_max:
        return False

    salary_min, salary_max = int(f.get("salary_min") or 0), int(f.get("salary_max") or 0)
    if salary_min or salary_max:
        salary = _salary_amount(u)
        if not salary or (salary_min and salary < salary_min) or (salary_max and salary > salary_max):
            return False
    if f.get("height_min") or f.get("height_max"):
        cm = _height_cm(u.get("height"))
        if not cm or (f.get("height_min") and cm < _height_cm(f["height_min"])) or (
                f.get("height_max") and cm > _height_cm(f["height_max"])):
            return False

    if f.get("q"):
        query = str(f["q"]).strip().casefold()
        blob = " ".join(str(u.get(key) or "").casefold() for key in (
            "tsap_id", "full_name", "district", "current_city", "caste", "sub_caste",
            "job", "education", "gothram",
        ))
        if query and query not in blob:
            return False
    return True


def new_matches_for(rec: Dict[str, Any], users: List[Dict[str, Any]], exclude: Optional[List[str]] = None,
                    limit: int = 10) -> List[Dict[str, Any]]:
    """Saved search కి ఇప్పుడు match ayye profiles (alert కి)."""
    seen_ids = set(rec.get("last_seen_ids") or [])
    excl = set(exclude or []) | {rec.get("tsap_id")}
    out = []
    for u in users:
        tid = str(u.get("tsap_id"))
        if tid in excl or tid in seen_ids:
            continue
        if matches_filters(u, rec.get("filters") or {}):
            out.append(u)
        if len(out) >= limit:
            break
    return out


def mark_alerted(rec: Dict[str, Any], ids: List[str]) -> None:
    rec["last_alert_at"] = datetime.utcnow().isoformat()
    rec["alerts_sent"] = int(rec.get("alerts_sent", 0)) + 1
    rec["last_seen_ids"] = list(dict.fromkeys(list(rec.get("last_seen_ids") or []) + list(ids)))[-200:]
    save_saved_searches()


# ---------------------------------------------------------------------------
# 4. CONSENT LEDGER (owner acceptance/contact-access events; not delivery proof)
# ---------------------------------------------------------------------------
def log_consent(action: str, actor_id: str, other_id: str, request_id: str = "",
                contact_access_granted: bool = False, note: str = "") -> Dict[str, Any]:
    rec = {"at": datetime.utcnow().isoformat(), "action": action, "actor_id": actor_id,
           "other_id": other_id, "request_id": request_id,
           "contact_access_granted": bool(contact_access_granted),
           "note": clean(note, 160, "consent_note")}
    CONSENT_LEDGER.append(rec)
    save_consent_ledger()
    return rec


def consent_for(tsap_id: str) -> List[Dict[str, Any]]:
    rows = [c for c in CONSENT_LEDGER if tsap_id in (c.get("actor_id"), c.get("other_id"))]
    return sorted(rows, key=lambda r: r.get("at", ""), reverse=True)


# ---------------------------------------------------------------------------
# 5. INTEREST TEMPLATES (Telugu ready-made — spam takkuva, response ekkuva)
# ---------------------------------------------------------------------------
TEMPLATES: List[Dict[str, str]] = [
    {"id": "traditional", "label": "🙏 Traditional / Family తో matladataniki",
     "text": "నమస్తే, మీ profile chusam — మన kutumbaalu matladukovadam start cheddam. మా vaipu నుంచి full details pampistham."},
    {"id": "professional", "label": "💼 Job / City match",
     "text": "Hello, మేము కూడా same city లో job చేస్తున్నాం — మన interests/lifestyle match avutunnayi. Matladataniki interest ఉంది."},
    {"id": "horoscope", "label": "⭐ Jatakam / Porutham",
     "text": "నమస్తే, మీ జాతక వివరాలు చూసి గుణమేళనం & పొంతన బాగుంది అనిపించింది — మన ఇంట్లో పెద్దవాళ్లకు చెప్పడానికి ముందు మీరు ఆసక్తిగా ఉన్నారో లేదో తెలుపగలరు."},
    {"id": "second_marriage", "label": "🔄 Second marriage / Vidakuulu",
     "text": "నమస్తే, మేము కూడా life లో second innings start cheddamani chustunnam. మీ profile chusi hope వచ్చింది — matladocha?"},
    {"id": "parents", "label": "👨‍👩‍👧 Parents tarvupuna (మీ ఇంట్లో వాళ్లకి చెప్పండి)",
     "text": "నమస్తే, మేము మీ కోసం chustunnam (parents side నుంచి) — మీ ఇంట్లో andaritho matladi చెప్పండి, తర్వాత direct matladukovachu."},
    {"id": "simple", "label": "✍️ Simple / straight forward",
     "text": "Hello, మీ profile నచ్చింది. Interest request పంపాను; మీరు accept చేస్తే contact details మీ accepted-request account view లో కనిపిస్తాయి. Message delivery నిర్ధారణ కాదు."},
]


def templates() -> List[Dict[str, str]]:
    return [dict(t, note_telugu="Copy చేసి edit cheskovachu — మీ style లో రాయండి") for t in TEMPLATES]


# ---------------------------------------------------------------------------
# 6. FACETS (search UI chips)
# ---------------------------------------------------------------------------
def facets(users: List[Dict[str, Any]], top: int = 12) -> Dict[str, List[Dict[str, Any]]]:
    def count(key: str) -> List[Dict[str, Any]]:
        tally: Dict[str, int] = {}
        for u in users:
            for val in str(u.get(key) or "").split(","):
                v = val.strip()
                if v and v not in ("—", "-"):
                    tally[v] = tally.get(v, 0) + 1
        return [{"value": k, "count": v} for k, v in sorted(tally.items(), key=lambda x: -x[1])[:top]]

    return {"caste": count("caste"), "district": count("district"), "education": count("education"),
            "job": count("job"), "marital_status": count("marital_status"), "state": count("state"),
            "star": count("star")}
