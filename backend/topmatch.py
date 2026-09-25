"""
MANA VIVAHA — MATCH SCORE 2.0 (advanced, explainable, mutual)
============================================================
Top matrimony sites lo score "black box" — manam **explainable** ga istam:
prathi point ekkada nunchi vachindo Telugu lo cheptham (trust + clarity).

Differences vs v1 (`matching_engine.calculate_match_score`):
  1. **Partner preferences** respect chestundi (`exp_filters`: age/job/location/caste)
  2. **Weights** — 11 components, each 0..1 → weighted /100
  3. **Mutual score** — vaallu kooda ninnu ishtapaduthunnara? (iddari prefs match = 8% bonus)
  4. **Trust bonus** — verified (phone/photo/ID) profile ki extra points
  5. **Horoscope** — 10-porutham engine tho kalipi (stars unte)
  6. **Breakdown + Telugu verdict** — UI lo "ఎందుకు ee score?" ani chupinchadaniki

Usage:
    from topmatch import score_match_v2, find_top_matches_v2
    res = score_match_v2(me, other)     # {"score": 87, "breakdown": [...], "mutual": {...}}
"""
from __future__ import annotations

from typing import Dict, List, Optional

try:
    from porutham import compute_porutham
except Exception:                                    # engine lekapoyina score pani chestundi
    compute_porutham = None

WEIGHTS: Dict[str, int] = {
    "age": 13, "caste": 13, "location": 12, "education": 9, "job": 10,
    "salary": 8, "height": 5, "horoscope": 10, "family": 8, "lifestyle": 7, "trust": 5,
}
LABELS = {
    "age": ("Age match", "వయస్సు"),
    "caste": ("Caste / community", "కులం"),
    "location": ("Location", "స్థలం"),
    "education": ("Education", "చదువు"),
    "job": ("Job / profession", "ఉద్యోగం"),
    "salary": ("Income", "ఆదాయం"),
    "height": ("Height match", "ఎత్తు"),
    "horoscope": ("Gunamelanam", "గుణమేళనం"),
    "family": ("Family background", "కుటుంబం"),
    "lifestyle": ("Lifestyle habits", "జీవనశైలి"),
    "trust": ("Verification / trust", "విశ్వాసం"),
}
_EDU_TIER = {"high": ["btech", "b.tech", "mtech", "m.tech", "mba", "mbbs", "md", "ms", "msc", "mca",
                      "ca", "phd", "b.pharm", "m.pharm", "degree", "llb"],
             "mid": ["bcom", "b.com", "bsc", "b.sc", "ba", "b.a", "bba", "b.ed", "polytechnic", "diploma",
                     "nursing", "gnm", "inter", "12th", "iti", "10th"]}
_PREMIUM_JOBS = ["doctor", "software", "govt", "bank", "engineer", "lecturer", "professor", "ca", "ias", "teacher"]


def _num(v, default=0):
    try:
        return float(str(v).replace(",", "").strip())
    except Exception:
        return default


def _salary_rank(value) -> int:
    """'8L' / '60k' / '40L' / '2L+/mo' → annual rupees (approx)."""
    s = str(value or "").lower().replace(" ", "")
    if not s:
        return 0
    per_month = "/mo" in s or "month" in s
    digits = ""
    for ch in s:
        if ch.isdigit() or ch == ".":
            digits += ch
        elif ch in "lk":
            break
    if not digits:
        return 0
    n = float(digits)
    if "l" in s:
        n *= 100000
    elif "k" in s:
        n *= 1000
    else:
        n *= 1000 if n < 1000 else 1
    if per_month:
        n *= 12
    return int(n)


def _age_pref(user: Dict, match: Dict) -> (float, str):
    exp = (user or {}).get("exp_filters") or {}
    lo, hi = _num(exp.get("ageMin"), 0), _num(exp.get("ageMax"), 0)
    a = int(match.get("age", 0) or 0)
    if lo and hi and lo <= a <= hi:
        return 1.0, "మీ expectation (%d-%d) లో ఉన్నారు" % (int(lo), int(hi))
    if lo and hi:
        gap = min(abs(a - lo), abs(a - hi))
        if gap <= 2:
            return 0.75, "expectation కి %d yr దూరం లో" % gap
        return 0.35, "expectation (%d-%d) బయట ఉన్నారు" % (int(lo), int(hi))
    ua = int((user or {}).get("age", 0) or 0)
    diff = abs(a - ua)
    if diff == 0:
        return 1.0, "same age"
    if diff <= 4:
        return 1.0, "%d yr gap — ideal" % diff
    if diff <= 8:
        return 0.7, "%d yr gap — ok" % diff
    return 0.3, "%d yr gap — పెద్ద difference" % diff


def _caste_pref(user: Dict, match: Dict) -> (float, str):
    exp = str(((user or {}).get("exp_filters") or {}).get("caste", "")).lower()
    same = str(user.get("caste", "")).strip().lower() == str(match.get("caste", "")).strip().lower()
    wants = ("same" in exp) or (not exp) or ("no bar" not in exp and "any" not in exp)
    if same and wants:
        return 1.0, "same caste — channels/relatives కి easy"
    if same:
        return 0.8, "same caste (మీరు caste-no-bar అన్నారు)"
    if not wants:
        return 0.7, "veera caste — meeru caste no bar"
    return 0.35, "veera caste — మీ expectation same caste"


def _location_pref(user: Dict, match: Dict) -> (float, str):
    d1, d2 = str(user.get("district", "")).lower(), str(match.get("district", "")).lower()
    s1, s2 = str(user.get("state", "")).upper(), str(match.get("state", "")).upper()
    m1, m2 = str(user.get("mandal", "")).lower(), str(match.get("mandal", "")).lower()
    if m1 and m1 == m2:
        return 1.0, "same mandal/area — chala convenient"
    if d1 and d1 == d2:
        return 0.9, "same district"
    if s1 and s1 == s2:
        return 0.7, "same state"
    w1, w2 = str(user.get("work_location", "")).lower(), str(match.get("work_location", "")).lower()
    if w1 and w1 == w2:
        return 0.8, "work location same (%s)" % match.get("work_location")
    return 0.35, "different state — travel కావాలి"


def _edu_pref(user: Dict, match: Dict) -> (float, str):
    a, b = str(user.get("education", "")).lower(), str(match.get("education", "")).lower()
    if a and a == b:
        return 1.0, "same education"
    ta, tb = _tier(a), _tier(b)
    if ta and ta == tb:
        return 1.0, "same education level (%s)" % tb
    if "high" in (ta, tb):
        return 0.75, "education levels close"
    return 0.5, "education levels different"


def _tier(edu: str) -> str:
    for tier, keys in _EDU_TIER.items():
        if any(k in edu for k in keys):
            return tier
    return ""


def _job_pref(user: Dict, match: Dict) -> (float, str):
    exp_job = str(((user or {}).get("exp_filters") or {}).get("job", "")).lower()
    a, b = str(user.get("job", "")).lower(), str(match.get("job", "")).lower()
    if exp_job and exp_job and (exp_job in b or b in exp_job):
        return 1.0, "మీ job preference (%s) match" % match.get("job")
    if a and a == b:
        return 1.0, "same profession"
    if any(k in b for k in _PREMIUM_JOBS):
        return 0.85, "stable profession (%s)" % match.get("job")
    if (a and b) and (a.split()[0] == b.split()[0]):
        return 0.8, "similar profession"
    return 0.5, "different profession"


def _salary_pref(user: Dict, match: Dict) -> (float, str):
    mine, theirs = _salary_rank(user.get("salary")), _salary_rank(match.get("salary"))
    if not theirs:
        return 0.5, "salary pettaledu"
    if not mine:
        return 0.8, "income info లేదు (మీది)"
    ratio = theirs / max(1, mine)
    if ratio >= 1.0:
        return 1.0, "income మీ కన్నా ఎక్కువ/same"
    if ratio >= 0.8:
        return 0.8, "income close"
    return 0.5, "income mee kanna thakkuva"


def _height_pref(user: Dict, match: Dict) -> (float, str):
    def inches(v):
        s = str(v or "").replace("\"", "").strip()
        if "'" in s:
            try:
                ft, inch = s.split("'")
                return int(ft) * 12 + int(inch or 0)
            except Exception:
                return 0
        return 0
    hu, hm = inches(user.get("height")), inches(match.get("height"))
    if not hu or not hm:
        return 0.6, "height info లేదు"
    g = str(user.get("gender", ""))
    diff = hm - hu if g == "Bride" else hu - hm   # groom taller = positive
    if 1 <= diff <= 8:
        return 1.0, "height match బాగుంది (%d inch)" % diff
    if diff == 0:
        return 0.8, "same height"
    if -3 <= diff < 0:
        return 0.7, "height close"
    return 0.4, "height match weak"


def _horoscope_pref(user: Dict, match: Dict) -> (float, str):
    if not compute_porutham:
        return 0.5, "గుణమేళనం అందుబాటులో లేదు"
    b, g = (user, match) if user.get("gender") == "Bride" else (match, user)
    try:
        r = compute_porutham(b, g)
    except Exception:
        r = {"available": False}
    if not r.get("available"):
        return 0.5, "నక్షత్ర వివరాలు లేవు (నక్షత్రం నమోదు చేస్తే గుణమేళనం వస్తుంది)"
    sc = float(r.get("score", 0) or 0)
    return (sc / 10.0), "గుణమేళనం %s/10 — %s" % (sc, str(r.get("verdict", ""))[:40])


def _family_pref(user: Dict, match: Dict) -> (float, str):
    pts, notes = 0.0, []
    if str(user.get("family_type", "")).lower() == str(match.get("family_type", "")).lower():
        pts += 0.4; notes.append("family type same")
    else:
        pts += 0.2
    if str(user.get("family_values", "")).lower() == str(match.get("family_values", "")).lower():
        pts += 0.35; notes.append("family values same")
    else:
        pts += 0.15
    if str(user.get("family_status", "")).lower() == str(match.get("family_status", "")).lower():
        pts += 0.25; notes.append("family status similar")
    else:
        pts += 0.1
    return min(1.0, pts), ", ".join(notes) or "family background different"


def _lifestyle_pref(user: Dict, match: Dict) -> (float, str):
    pts, notes = 0.0, []
    um, mm = str(user.get("marital_status", "")), str(match.get("marital_status", ""))
    if um and um == mm:
        pts += 0.4
    elif "కాలేదు" in um.lower() and "కాలేదు" in mm.lower():
        pts += 0.4
    else:
        pts += 0.1; notes.append("marital status different")
    if str(user.get("mother_tongue", "")).lower() == str(match.get("mother_tongue", "")).lower():
        pts += 0.3; notes.append("mother tongue same")
    else:
        pts += 0.1
    if str(user.get("religion", "")).lower() == str(match.get("religion", "")).lower():
        pts += 0.3; notes.append("same religion")
    else:
        pts += 0.05
    return min(1.0, pts), ", ".join(notes) or "lifestyle matching"


def _trust_score(match: Dict) -> (float, str):
    verified = bool(match.get("is_verified")) or bool(match.get("phone_verified"))
    level = str(match.get("verification_level", "") or "")
    boost = bool(match.get("boost_until"))
    pts = 0.4
    notes = []
    if verified:
        pts += 0.3; notes.append("verified")
    if level in ("photo", "id"):
        pts += 0.2; notes.append("photo/ID verified")
    if match.get("photo_urls"):
        pts += 0.1; notes.append("photo ఉంది")
    if boost:
        notes.append("boosted (active user)")
    return min(1.0, pts), ", ".join(notes) or "verification pending"


COMPONENTS = [
    ("age", _age_pref), ("caste", _caste_pref), ("location", _location_pref),
    ("education", _edu_pref), ("job", _job_pref), ("salary", _salary_pref),
    ("height", _height_pref), ("horoscope", _horoscope_pref), ("family", _family_pref),
    ("lifestyle", _lifestyle_pref), ("trust", lambda u, m: _trust_score(m)),
]


GRADE_TELUGU = {"perfect": "అద్భుతం (perfect)", "best": "చాలా మంచిది (best)",
                "good": "మంచిది (good)", "average": "సాధారణం (average)", "low": "తక్కువ (low)"}


def _grade(score: int) -> (str, str):
    """Grade + **Telugu-first** verdict (mass users Telugu లోనే chaduvutaru)."""
    if score >= 85:
        return "perfect", "⭐ అద్భుత పొంతన — ఇప్పుడే interest పంపండి! (perfect match)"
    if score >= 75:
        return "best", "✅ చాలా మంచి పొంతన — మాట్లాడటానికి worth (best match)"
    if score >= 65:
        return "good", "👍 మంచి పొంతన — కొన్ని విషయాలు మాట్లాడుకోవాలి (good match)"
    if score >= 50:
        return "average", "🔸 సాధారణం — కొన్ని అంశాలు కలవలేదు (average)"
    return "low", "🔻 తక్కువ పొంతన — వేరే profiles చూడండి (low match)"


def score_match_v2(user: Dict, match: Dict, include_mutual: bool = True) -> Dict:
    """Weighted 100-point score + component breakdown + mutual check + Telugu verdict."""
    user, match = user or {}, match or {}
    breakdown, total = [], 0.0
    for key, fn in COMPONENTS:
        try:
            ratio, note = fn(user, match)
        except Exception as e:
            ratio, note = 0.5, "check skip (%s)" % str(e)[:40]
        ratio = max(0.0, min(1.0, float(ratio)))
        w = WEIGHTS[key]
        pts = round(ratio * w, 1)
        total += pts
        breakdown.append({"key": key, "label": LABELS[key][0], "telugu": LABELS[key][1],
                          "points": pts, "max": w, "ratio": round(ratio, 2), "note": note})
    score = int(round(total))
    raw_score = score                      # mutual bonus ki mundu score (transparency)
    grade, verdict = _grade(score)

    mutual = {}
    if include_mutual:
        try:
            rev = score_match_v2(match, user, include_mutual=False)
            rscore = int(rev["score"])
            mutual = {"their_score": rscore, "both_like": rscore >= 65 and score >= 65,
                      "note": ("💞 Mutual match — iddariki score 65+ (చాలా rare, వెంటనే పంపండి)"
                               if (rscore >= 65 and score >= 65) else
                               "వాళ్ల side నుంచి score %d" % rscore)}
            if mutual["both_like"]:
                bonus = round(total * 0.08, 1)
                total += bonus
                score = int(round(total))
                grade, verdict = _grade(score)
                breakdown.append({"key": "mutual", "label": "Mutual interest bonus", "telugu": "పరస్పరం",
                                  "points": bonus, "max": round(bonus), "ratio": 1.0,
                                  "note": "iddari expectations కూడా match — 8% bonus"})
        except Exception:
            mutual = {}

    top = sorted([b for b in breakdown if b["key"] != "mutual"], key=lambda x: -x["points"])[:4]
    weak = sorted([b for b in breakdown if b["key"] != "mutual"], key=lambda x: x["ratio"])[:2]
    return {
        "score": score, "raw_score": raw_score, "grade": grade, "grade_telugu": GRADE_TELUGU[grade],
        "verdict": verdict, "verdict_telugu": verdict,
        "breakdown": breakdown, "mutual": mutual,
        "strengths": ["%s — %s" % (b["label"], b["note"]) for b in top],
        "weak_points": ["%s — %s" % (b["label"], b["note"]) for b in weak if b["ratio"] < 0.6],
        "explain_telugu": "ఈ %d score ఎలా వచ్చింది: %s" % (
            score, ", ".join("%s %s/%s" % (b["label"], b["points"], b["max"]) for b in top)),
        "how_to_improve": ("Profile లో star + రాశి, photo, verification add cheste score penchochu"
                           if score < 80 else "మీ profile already strong — interest పంపండి!"),
    }


def find_top_matches_v2(user: Dict, profiles: List[Dict], limit: int = 10, min_score: int = 65) -> List[Dict]:
    """Opposite gender + min score + mutual-ranked list (blocked/excluded caller handle chestadu)."""
    opp = "Bride" if user.get("gender") == "Groom" else "Groom"
    out = []
    for p in profiles:
        if p.get("gender") != opp or p.get("tsap_id") == user.get("tsap_id"):
            continue
        if p.get("is_approved") is False:
            continue
        try:
            res = score_match_v2(user, p)
        except Exception:
            continue
        if res["score"] < min_score:
            continue
        out.append({"profile": p, "tsap_id": p.get("tsap_id"), "score": res["score"],
                    "grade": res["grade"], "verdict_telugu": res["verdict_telugu"],
                    "mutual": res["mutual"], "strengths": res["strengths"],
                    "breakdown": res["breakdown"]})
    out.sort(key=lambda x: (-x["score"], -int(bool(x["mutual"].get("both_like")))))
    return out[:limit]
