"""
⭐ WAVE 9 — PROFILE QUALITY + TRUST + SAVED SEARCHES + CONSENT LEDGER
====================================================================
  • profile_completeness()  → form lo em miss ayyindo % + Telugu tips (register/complete-profile fix)
  • trust_score()           → verification + activity + completeness composite (badge)
  • saved searches          → "ee filters తో కొత్త profiles వస్తే WhatsApp alert" (advanced feature)
  • consent ledger          → numbers eppudu evariki exchange అయ్యాయి (audit trail, disputes ki)
  • interest templates      → Telugu ready-made messages (users ki easy + spam takkuva)
  • facets                  → search UI chips ki caste/district/education counts
"""
from __future__ import annotations

import json
import os
import re
from datetime import datetime
from typing import Any, Dict, List, Optional

from hardening import clean, req_int, req_text, validation_error

STATE_DIR = os.path.dirname(os.path.abspath(__file__))
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
load_consent_ledger = lambda: _load(CONSENT_STATE_FILE, CONSENT_LEDGER)   # noqa: E731
save_consent_ledger = lambda: _save(CONSENT_STATE_FILE, CONSENT_LEDGER[-5000:])  # noqa: E731


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
    missing = [{"key": f["key"], "label": f["label"], "group": f["group"], "weight": f["w"]}
               for f in COMPLETENESS_FIELDS if not _filled(user, f)]
    important = [m for m in missing if m["weight"] >= 5 and not m.get("optional")][:5]
    if percent >= 90:
        level, telugu = "excellent", "🌟 Excellent — మీ profile complete గా ఉంది, matches ఎక్కువ వస్తాయి"
    elif percent >= 70:
        level, telugu = "good", "✅ Good — konchem fields add చేస్తే ఇంకా మంచి matches"
    elif percent >= 45:
        level, telugu = "average", "🟡 Average — photo + about_myself add చేస్తే 3x responses (matrimony survey)"
    else:
        level, telugu = "low", "🔴 Incomplete — ee profile కి matches తక్కువ వస్తాయి, ippude fill చెయ్యండి"
    return {
        "percent": percent, "level": level, "verdict_telugu": telugu,
        "missing": missing[:12], "missing_count": len(missing),
        "important_telugu": [f"➕ {m['label']} add చెయ్యండి" for m in important],
        "sections": _section_breakdown(user),
        "bonus_telugu": "📸 Photo ఉన్న profiles కి 5x views · ✅ OTP verify ఉంటే trust badge · 📝 about_myself ఉంటే better matches",
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
# 2. TRUST SCORE
# ---------------------------------------------------------------------------
def trust_score(user: Dict[str, Any], interests: Optional[List[Dict[str, Any]]] = None,
                reports_against: int = 0, blocks_against: int = 0) -> Dict[str, Any]:
    """Composite trust: verify + completeness + activity − complaints."""
    u = user or {}
    factors: List[Dict[str, Any]] = []
    score = 0

    verified = bool(u.get("is_verified") or u.get("phone_verified"))
    score += 25 if verified else 0
    factors.append({"key": "phone_verified", "points": 25 if verified else 0, "max": 25,
                    "telugu": "✅ Phone verified" if verified else "❌ Phone verify చెయ్యండి (25 pts)"})

    comp = profile_completeness(u)["percent"]
    comp_points = int(round(comp * 0.25))            # max 25
    score += comp_points
    factors.append({"key": "completeness", "points": comp_points, "max": 25,
                    "telugu": f"📝 Profile completeness {comp}%"})

    has_photo = bool(u.get("photo_urls"))
    score += 15 if has_photo else 0
    factors.append({"key": "photo", "points": 15 if has_photo else 0, "max": 15,
                    "telugu": "📸 Photo ఉంది" if has_photo else "📸 Photo add చెయ్యండి (15 pts)"})

    about = len(str(u.get("about_myself") or ""))
    about_points = 10 if about >= 80 else (6 if about >= 30 else 0)
    score += about_points
    factors.append({"key": "about", "points": about_points, "max": 10,
                    "telugu": "📄 About section బాగుంది" if about_points == 10 else "📄 'మీ gurinchi' kochem రాయండి (10 pts)"})

    src = "site"
    act_points = 0
    if interests is not None:
        replied = [i for i in interests if i.get("status") in ("accepted", "declined")]
        act_points = min(10, 2 * len(replied))
        factors.append({"key": "activity", "points": act_points, "max": 10,
                        "telugu": f"💬 {len(replied)} requests కి reply iccharu"})
    else:
        factors.append({"key": "activity", "points": 0, "max": 10,
                        "telugu": "💬 Requests కి reply isthe trust perugutundi"})
    score += act_points

    penalty = min(20, 5 * int(reports_against or 0) + 3 * int(blocks_against or 0))
    if penalty:
        factors.append({"key": "complaints", "points": -penalty, "max": 0,
                        "telugu": f"⚠️ {reports_against} report / {blocks_against} block — {penalty} pts deduct"})
    score -= penalty

    score = max(0, min(100, score))
    if score >= 80:
        level, badge = "gold", "🥇 High trust — verified + complete profile"
    elif score >= 60:
        level, badge = "silver", "🥈 Good trust profile"
    elif score >= 35:
        level, badge = "bronze", "🥉 Basic — verify + photo add చెయ్యండి"
    else:
        level, badge = "new", "🆕 కొత్త profile — trust peragadaniki steps kinda ఉన్నాయి"
    tips = [f["telugu"] for f in factors if f["max"] and f["points"] < f["max"]]
    return {"score": score, "level": level, "badge_telugu": badge, "factors": factors,
            "next_steps_telugu": tips[:4], "source": src}


# ---------------------------------------------------------------------------
# 3. SAVED SEARCHES (+ new-match alerts)
# ---------------------------------------------------------------------------
FILTER_KEYS = ["gender", "caste", "district", "state", "job", "education", "marital_status", "religion",
               "age_min", "age_max", "salary_min", "salary_max", "height_min", "height_max",
               "verified_only", "photo_only", "dosham", "star", "q", "sort"]


def normalize_filters(raw: Dict[str, Any]) -> Dict[str, Any]:
    out: Dict[str, Any] = {}
    for k in FILTER_KEYS:
        v = (raw or {}).get(k)
        if v in (None, "", [], False):
            continue
        if k in ("age_min", "age_max"):
            out[k] = req_int(v, k, 18, 70, default=18 if k == "age_min" else 70)
        elif k in ("salary_min", "salary_max"):
            out[k] = req_int(v, k, 0, 100_000_000, default=None)
        elif k in ("height_min", "height_max"):
            out[k] = clean(v, 12, k)
        elif k in ("verified_only", "photo_only"):
            out[k] = bool(v)
        else:
            out[k] = clean(v, 60, k)
    if out.get("age_min") and out.get("age_max") and out["age_min"] > out["age_max"]:
        validation_error("age_min", "⚠️ age_min < age_max ఉండాలి")
    if out.get("salary_min") and out.get("salary_max") and out["salary_min"] > out["salary_max"]:
        validation_error("salary_min", "⚠️ salary_min < salary_max ఉండాలి")
    return out


def save_search(tsap_id: str, name: str, filters: Dict[str, Any], alert: bool = True) -> Dict[str, Any]:
    norm = normalize_filters(filters)
    if not norm:
        validation_error("filters", "⚠️ కొన్ని filters పెట్టండి — appudu save cheyyagalam")
    name = req_text(name, "search name", 2, 40, required=False) or "My search"
    sid = f"SRCH-{len(SAVED_SEARCHES) + 1:05d}"
    rec = {"search_id": sid, "tsap_id": tsap_id, "name": name, "filters": norm, "alert": bool(alert),
           "created_at": datetime.utcnow().isoformat(), "last_alert_at": "", "alerts_sent": 0,
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


def matches_filters(user: Dict[str, Any], filters: Dict[str, Any]) -> bool:
    u = user or {}
    f = filters or {}
    def lc(v):
        return str(v or "").lower()
    if f.get("gender") and lc(u.get("gender")) != lc(f["gender"]):
        return False
    if f.get("caste") and lc(f["caste"]) not in lc(u.get("caste")) and lc(f["caste"]) not in lc(u.get("sub_caste")):
        return False
    if f.get("district") and lc(f["district"]) not in lc(u.get("district")) and lc(f["district"]) not in lc(u.get("current_city")):
        return False
    if f.get("state") and str(u.get("state", "")).upper() != str(f["state"]).upper():
        return False
    if f.get("job") and lc(f["job"]) not in lc(u.get("job")) and lc(f["job"]) not in lc(u.get("work_type")):
        return False
    if f.get("education") and lc(f["education"]) not in lc(u.get("education")):
        return False
    if f.get("marital_status") and lc(u.get("marital_status")) != lc(f["marital_status"]):
        return False
    if f.get("religion") and lc(u.get("religion", "Hindu")) != lc(f["religion"]):
        return False
    if f.get("verified_only") and not (u.get("is_verified") or u.get("phone_verified")):
        return False
    if f.get("photo_only") and not u.get("photo_urls"):
        return False
    if f.get("dosham") and lc(u.get("dosham")) != lc(f["dosham"]):
        return False
    if f.get("star") and lc(f["star"]) not in lc(u.get("star")):
        return False
    try:
        age = int(u.get("age") or 0)
    except Exception:
        age = 0
    if f.get("age_min") and age and age < int(f["age_min"]):
        return False
    if f.get("age_max") and age and age > int(f["age_max"]):
        return False
    if f.get("salary_min") or f.get("salary_max"):
        raw = lc(u.get("salary")).replace("l", "00000").replace("k", "000")
        digits = "".join(ch for ch in raw if ch.isdigit())
        sal = int(digits) if digits else 0
        if f.get("salary_min") and sal and sal < int(f["salary_min"]):
            return False
        if f.get("salary_max") and sal and sal > int(f["salary_max"]):
            return False
    if f.get("height_min") or f.get("height_max"):
        cm = _height_cm(u.get("height"))
        if cm:
            if f.get("height_min") and cm < _height_cm(f["height_min"]):
                return False
            if f.get("height_max") and cm > _height_cm(f["height_max"]):
                return False
    if f.get("q"):
        q = lc(f["q"])
        blob = " ".join(lc(u.get(k)) for k in ("full_name", "district", "caste", "job", "education", "current_city"))
        if q not in blob:
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
# 4. CONSENT LEDGER (numbers eppudu exchange అయ్యాయి — audit trail)
# ---------------------------------------------------------------------------
def log_consent(action: str, actor_id: str, other_id: str, request_id: str = "",
                exchanged: bool = False, note: str = "") -> Dict[str, Any]:
    rec = {"at": datetime.utcnow().isoformat(), "action": action, "actor_id": actor_id,
           "other_id": other_id, "request_id": request_id, "numbers_exchanged": bool(exchanged),
           "note": clean(note, 160, "consent_note"), "lawful_basis": "user_consent (both parties)",
           "retention_days": 1095}
    CONSENT_LEDGER.append(rec)
    if len(CONSENT_LEDGER) % 5 == 0:
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
     "text": "Hello, మీ profile nachhindi. Interest ఉంటే accept చెయ్యండి — మన numbers exchange అవుతాయి, తర్వాత matladukundam."},
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
