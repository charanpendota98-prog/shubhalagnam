"""Factual profile comparison and preference-aware candidate ordering.

No compatibility percentage, match grade, mutual-likelihood score, or inferred
"trust" bonus is calculated here. Results describe overlapping member-entered
details and, when a member supplied explicit preferences, whether the available
candidate data meets those preferences. Missing data is left unknown.
"""
from __future__ import annotations

from typing import Any, Dict, Iterable, List, Optional, Tuple

from interest import sanitize_public_payload


# Values shown as profile facts only. Similarity is not a compatibility claim.
PROFILE_FIELDS: Tuple[Tuple[str, str, str], ...] = (
    ("caste", "Community", "కమ్యూనిటీ"),
    ("sub_caste", "Sub-community", "ఉప-కమ్యూనిటీ"),
    ("district", "District", "జిల్లా"),
    ("state", "State", "రాష్ట్రం"),
    ("education", "Education", "విద్య"),
    ("job", "Profession", "వృత్తి"),
    ("marital_status", "Marital status", "వైవాహిక స్థితి"),
    ("religion", "Religion", "మతం"),
    ("mother_tongue", "Mother tongue", "మాతృభాష"),
    ("family_type", "Family type", "కుటుంబ విధానం"),
    ("star", "Birth star (optional)", "నక్షత్రం (ఐచ్ఛికం)"),
)

_MISSING = {"", "—", "-", "none", "null", "unknown", "not specified", "n/a", "na"}


def _text(value: Any) -> str:
    if value is None or isinstance(value, (dict, list, tuple, set)):
        return ""
    raw = str(value).strip()
    return "" if raw.casefold() in _MISSING else raw


def _key(value: Any) -> str:
    return " ".join(_text(value).casefold().split())


def _age(value: Any) -> Optional[int]:
    try:
        n = int(float(str(value).strip()))
        return n if 18 <= n <= 100 else None
    except (TypeError, ValueError, OverflowError):
        return None


def _preference_comparisons(user: Dict[str, Any], candidate: Dict[str, Any]) -> List[Dict[str, str]]:
    """Evaluate only explicit, non-empty saved preferences against supplied data."""
    raw = user.get("exp_filters")
    prefs = raw if isinstance(raw, dict) else {}
    rows: List[Dict[str, str]] = []

    lo_raw = prefs.get("ageMin", prefs.get("age_min", user.get("exp_age_min")))
    hi_raw = prefs.get("ageMax", prefs.get("age_max", user.get("exp_age_max")))
    try:
        parsed_lo = int(lo_raw) if _text(lo_raw) else None
        parsed_hi = int(hi_raw) if _text(hi_raw) else None
        lo = parsed_lo if parsed_lo is not None and 18 <= parsed_lo <= 70 else None
        hi = parsed_hi if parsed_hi is not None and 18 <= parsed_hi <= 70 else None
    except (TypeError, ValueError, OverflowError):
        lo = hi = None
    age = _age(candidate.get("age"))
    if age is not None and (lo is not None or hi is not None):
        met = (lo is None or age >= lo) and (hi is None or age <= hi)
        bound = f"{lo if lo is not None else 'any'}–{hi if hi is not None else 'any'}"
        rows.append({
            "key": "age", "label": "Age range", "status": "met" if met else "not_met",
            "note": f"Candidate age {age} is {'within' if met else 'outside'} the saved range ({bound}).",
        })

    requested_caste = _text(prefs.get("caste", user.get("exp_caste")))
    norm_caste = _key(requested_caste)
    candidate_caste = _key(candidate.get("caste"))
    own_caste = _key(user.get("caste"))
    if norm_caste in {"same", "same caste", "same community"}:
        if candidate_caste and own_caste:
            met = candidate_caste == own_caste
            rows.append({
                "key": "caste", "label": "Community preference", "status": "met" if met else "not_met",
                "note": "Candidate community matches the saved same-community preference." if met
                        else "Candidate community differs from the saved same-community preference.",
            })
    elif norm_caste and norm_caste not in {"any", "no bar", "no preference"} and candidate_caste:
        met = candidate_caste == norm_caste
        rows.append({
            "key": "caste", "label": "Community preference", "status": "met" if met else "not_met",
            "note": "Candidate community matches the saved preference." if met
                    else "Candidate community differs from the saved preference.",
        })

    requested_job = _key(prefs.get("job", user.get("exp_job")))
    candidate_job = _key(candidate.get("job"))
    if requested_job and candidate_job:
        met = requested_job in candidate_job
        rows.append({
            "key": "job", "label": "Profession preference", "status": "met" if met else "not_met",
            "note": "Candidate profession matches the saved preference." if met
                    else "Candidate profession differs from the saved preference.",
        })

    requested_location = _key(prefs.get("location", user.get("exp_location")))
    candidate_locations = [_key(candidate.get(k)) for k in ("district", "state", "work_location", "current_city")]
    candidate_locations = [value for value in candidate_locations if value]
    if requested_location and candidate_locations:
        met = any(requested_location in value or value in requested_location for value in candidate_locations)
        rows.append({
            "key": "location", "label": "Location preference", "status": "met" if met else "not_met",
            "note": "Candidate's listed location matches the saved preference." if met
                    else "Candidate's listed location differs from the saved preference.",
        })
    return rows


def score_match_v2(user: Dict[str, Any], match: Dict[str, Any], include_mutual: bool = False) -> Dict[str, Any]:
    """Legacy name retained for callers; returns facts and never returns a score.

    ``include_mutual`` is intentionally ignored: profile fields cannot establish
    whether another member likes or would accept someone.
    """
    user = user if isinstance(user, dict) else {}
    match = match if isinstance(match, dict) else {}
    observations: List[str] = []
    differences: List[str] = []
    breakdown: List[Dict[str, str]] = []

    for key, label, te_label in PROFILE_FIELDS:
        a, b = _text(user.get(key)), _text(match.get(key))
        if not a or not b:
            continue
        same = _key(a) == _key(b)
        if same:
            note = f"Both profiles list {a} for {label.lower()}."
            observations.append(note)
        else:
            note = f"Profiles list different {label.lower()} values: {a} and {b}."
            differences.append(note)
        breakdown.append({
            "key": key, "label": label, "telugu": te_label,
            "status": "same" if same else "different", "note": note,
        })

    age_a, age_b = _age(user.get("age")), _age(match.get("age"))
    if age_a is not None and age_b is not None:
        gap = abs(age_a - age_b)
        note = f"Member-entered ages are {age_a} and {age_b}; the difference is {gap} year(s). Verify dates independently."
        observations.append(note)
        breakdown.append({"key": "age", "label": "Age", "telugu": "వయస్సు", "status": "listed", "note": note})

    preferences = _preference_comparisons(user, match)
    preference_notes = [row["note"] for row in preferences]
    return sanitize_public_payload({
        "notice": "Member-entered profile details and explicit preference comparisons only; not a compatibility or identity verdict.",
        "notice_telugu": "సభ్యులు నమోదు చేసిన వివరాలు, మీరు స్పష్టంగా సేవ్ చేసిన preferences పోలిక మాత్రమే; compatibility లేదా identity verdict కాదు.",
        "breakdown": breakdown,
        "observations": observations,
        "differences": differences,
        "preferences": preferences,
        "preference_notes": preference_notes,
        "mutual": {},
    })


def find_top_matches_v2(
    user: Dict[str, Any], profiles: Iterable[Dict[str, Any]], limit: int = 10,
    min_score: Optional[int] = None,
) -> List[Dict[str, Any]]:
    """Return opposite-gender approved profiles, newest first, with factual comparisons.

    ``min_score`` is accepted for backwards compatibility and ignored because no
    compatibility score or preference-count rank is produced.
    """
    user = user if isinstance(user, dict) else {}
    gender = _key(user.get("gender"))
    if gender in {"groom", "male", "man"}:
        opposite = {"bride", "female", "woman"}
    elif gender in {"bride", "female", "woman"}:
        opposite = {"groom", "male", "man"}
    else:
        return []
    try:
        max_rows = max(0, min(100, int(limit)))
    except (TypeError, ValueError, OverflowError):
        max_rows = 10

    ranked: List[Tuple[str, str, Dict[str, Any]]] = []
    for profile in profiles or []:
        if not isinstance(profile, dict) or _key(profile.get("gender")) not in opposite:
            continue
        if profile.get("is_approved") is False or profile.get("is_banned"):
            continue
        if profile.get("is_active") is False or profile.get("deleted_at") or profile.get("married_fixed"):
            continue
        if profile.get("tsap_id") and profile.get("tsap_id") == user.get("tsap_id"):
            continue
        comparison = score_match_v2(user, profile)
        created = _text(profile.get("created_at"))
        profile_id = _text(profile.get("tsap_id"))
        ranked.append((created, profile_id, {
            "profile": profile,
            "observations": comparison["observations"],
            "differences": comparison["differences"],
            "preferences": comparison["preferences"],
        }))
    # No preference tally or compatibility proxy influences ordering.
    ranked.sort(key=lambda row: (row[0], row[1]), reverse=True)
    return [row[2] for row in ranked[:max_rows]]


def categorize_matches_v3(
    user: Dict[str, Any],
    profiles: Iterable[Dict[str, Any]],
    saved_searches: Optional[Iterable[Dict[str, Any]]] = None,
    per_category_limit: int = 12,
) -> Dict[str, Any]:
    """Build 6 transparent, explainable match categories without synthetic scores.

    Distinguishes Hard Filters (opposite gender, active, approved, non-blocked)
    from Soft Preferences (saved `exp_filters`, shared location, shared background).
    Never emits forbidden score/grade/percent keys.
    """
    base_rows = find_top_matches_v2(user, profiles, limit=100)
    cap = max(1, min(30, int(per_category_limit or 12)))

    strong_pref: List[Dict[str, Any]] = []
    location_matches: List[Dict[str, Any]] = []
    similar_background: List[Dict[str, Any]] = []
    saved_search_matches: List[Dict[str, Any]] = []

    user_loc_tokens = {
        _key(user.get(k))
        for k in ("district", "state", "current_city", "work_location")
        if _key(user.get(k))
    }

    my_searches = [s for s in (saved_searches or []) if isinstance(s, dict)]

    for item in base_rows:
        cand = item["profile"]
        prefs = item["preferences"]
        met_prefs = [p for p in prefs if p.get("status") == "met"]
        unmet_prefs = [p for p in prefs if p.get("status") == "not_met"]

        if met_prefs and not unmet_prefs:
            strong_pref.append(item)

        cand_locs = {
            _key(cand.get(k))
            for k in ("district", "state", "current_city", "work_location")
            if _key(cand.get(k))
        }
        if user_loc_tokens and (user_loc_tokens & cand_locs):
            location_matches.append(item)

        if len(item["observations"]) >= 2:
            similar_background.append(item)

        for ss in my_searches:
            f = ss.get("filters") if isinstance(ss.get("filters"), dict) else ss
            ss_caste = _key(f.get("caste"))
            ss_dist = _key(f.get("district"))
            if ss_caste and ss_caste not in ("any", "") and _key(cand.get("caste")) != ss_caste:
                continue
            if ss_dist and ss_dist not in ("any", "") and _key(cand.get("district")) != ss_dist:
                continue
            if ss_caste or ss_dist:
                saved_search_matches.append(item)
                break

    return sanitize_public_payload({
        "notice": "Categorized using explicit preferences and member-entered facts only; no synthetic compatibility scores.",
        "notice_telugu": "మీరు సేవ్ చేసిన preferences మరియు సభ్యులు ఇచ్చిన వాస్తవ వివరాల ఆధారంగా మాత్రమే విభజించబడింది; కృత్రిమ స్కోర్లు లేవు.",
        "filter_model": {
            "hard_filters_en": "Opposite gender, approved & active status, not blocked or hidden.",
            "soft_preferences_en": "Saved age, community, profession, and location preferences shown transparently as met or differs.",
        },
        "categories": {
            "strong_preference": {
                "title_en": "Matches Your Saved Preferences",
                "title_te": "మీరు సేవ్ చేసిన ప్రాధాన్యతలకు సరిపోయేవి",
                "count": len(strong_pref[:cap]),
                "items": strong_pref[:cap],
            },
            "recently_joined": {
                "title_en": "Recently Joined Profiles",
                "title_te": "ఇటీవల చేరిన ప్రొఫైల్స్",
                "count": len(base_rows[:cap]),
                "items": base_rows[:cap],
            },
            "location_matches": {
                "title_en": "Same District / State / City",
                "title_te": "మీ జిల్లా / రాష్ట్రం / నగరంలోని ప్రొఫైల్స్",
                "count": len(location_matches[:cap]),
                "items": location_matches[:cap],
            },
            "similar_preferences": {
                "title_en": "Shared Community & Background Details",
                "title_te": "ఒకే కమ్యూనిటీ / నేపథ్య వివరాలు ఉన్నవి",
                "count": len(similar_background[:cap]),
                "items": similar_background[:cap],
            },
            "saved_search_matches": {
                "title_en": "Matching Your Saved Searches",
                "title_te": "మీ సేవ్డ్ సెర్చ్ ఫిల్టర్లకు సరిపోయేవి",
                "count": len(saved_search_matches[:cap]),
                "items": saved_search_matches[:cap],
            },
        },
    })
