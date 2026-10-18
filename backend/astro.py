"""Astrology evidence boundary for Mana Vivaha.

Member-entered star/rasi fields are retained as unverified profile metadata.
The former star-only 36-guna and dosha calculators are intentionally disabled:
no total, koota table, dosha flag, percentage, chart, or verdict is produced
without an owner-supplied Jathakam and an appropriate recorded review.

This module still owns the neutral label tables, evidence upload/review queue,
and admin distribution counts. Those records are not an interpretation or a
marriage recommendation.
"""
from __future__ import annotations
from atomic_store import atomic_json_dump


import json
import os
from datetime import datetime
from typing import Dict, List, Optional

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PERSIST_FILE = os.environ.get("MANA_VIVAHA_ASTRO_FILE", os.path.join(BASE_DIR, "astro13.json"))

# ---------------------------------------------------------------------------
# 27 NAKSHATRAS — index 0..26 (Ashwini start)
# gana: deva/manushya/rakshasa · nadi: adi/madhya/antya (standard 9-9-9)
# ---------------------------------------------------------------------------
NAKSHATRAS = [
    # (name, gana, yoni, nadi)
    ("Ashwini", "deva", "horse", "adi"),
    ("Bharani", "manushya", "elephant", "madhya"),
    ("Krittika", "rakshasa", "goat", "antya"),
    ("Rohini", "manushya", "serpent", "antya"),
    ("Mrigasira", "deva", "serpent", "madhya"),
    ("Ardra", "manushya", "dog", "adi"),
    ("Punarvasu", "deva", "cat", "adi"),
    ("Pushya", "deva", "goat", "madhya"),
    ("Ashlesha", "rakshasa", "cat", "antya"),
    ("Magha", "rakshasa", "rat", "antya"),
    ("Purva Phalguni", "manushya", "rat", "madhya"),
    ("Uttara Phalguni", "manushya", "cow", "adi"),
    ("Hasta", "deva", "buffalo", "adi"),
    ("Chitra", "rakshasa", "tiger", "madhya"),
    ("Swati", "deva", "buffalo", "antya"),
    ("Vishakha", "rakshasa", "tiger", "antya"),
    ("Anuradha", "deva", "deer", "madhya"),
    ("Jyeshtha", "rakshasa", "deer", "adi"),
    ("Mula", "rakshasa", "dog", "adi"),
    ("Purvashadha", "manushya", "monkey", "madhya"),
    ("Uttarashadha", "manushya", "mongoose", "antya"),
    ("Shravana", "deva", "monkey", "antya"),
    ("Dhanishta", "rakshasa", "lion", "madhya"),
    ("Shatabhisha", "rakshasa", "horse", "adi"),
    ("Purvabhadrapada", "manushya", "lion", "adi"),
    ("Uttarabhadrapada", "manushya", "cow", "madhya"),
    ("Revati", "deva", "elephant", "antya"),
]
NAK_INDEX = {n[0].lower(): i for i, n in enumerate(NAKSHATRAS)}

# Common spelling variants (English + Telugu transliteration)
STAR_ALIASES = {
    "aswini": 0, "ashwini": 0, "asvini": 0,
    "bharani": 1,
    "krittika": 2, "karthika": 2, "krithika": 2, "kartika": 2,
    "rohini": 3,
    "mrigasira": 4, "mrigashira": 4, "mrigasheersha": 4, "mrgasira": 4,
    "ardra": 5, "arudra": 5, "thiruvathirai": 5,
    "punarvasu": 6, "punarpoosam": 6,
    "pushya": 7, "pushyami": 7, "poosam": 7, "pusya": 7,
    "ashlesha": 8, "aslesha": 8, "ayilyam": 8,
    "magha": 9, "makha": 9, "makam": 9,
    "purvaphalguni": 10, "pubba": 10, "poorvaphalguni": 10, "puram": 10,
    "uttaraphalguni": 11, "uttara": 11, "uthiram": 11,
    "hasta": 12, "hastam": 12, "atham": 12, "hastham": 12,
    "chitra": 13, "chitta": 13, "chithirai": 13,
    "swati": 14, "swathi": 14, "chothy": 14,
    "vishakha": 15, "visakha": 15, "visakam": 15,
    "anuradha": 16, "anusham": 16, "anizham": 16,
    "jyeshtha": 17, "jyestha": 17, "jyesta": 17, "kettai": 17, "triketta": 17,
    "mula": 18, "moola": 18, "moolam": 18,
    "purvashadha": 19, "poorvashada": 19, "pooradam": 19,
    "uttarashadha": 20, "uttarashada": 20, "uthradam": 20,
    "shravana": 21, "sravana": 21, "thiruvonam": 21,
    "dhanishta": 22, "dhanista": 22, "avittam": 22,
    "shatabhisha": 23, "satabhisha": 23, "chathayam": 23,
    "purvabhadrapada": 24, "poorvabhadra": 24, "pururuttathi": 24,
    "uttarabhadrapada": 25, "uttarabhadra": 25, "uthrattathi": 25,
    "revati": 26, "revathi": 26,
}

# 12 Rasis + lord + varna + vashya group
RASIS = ["Mesha", "Vrishabha", "Mithuna", "Kataka", "Simha", "Kanya",
         "Tula", "Vrischika", "Dhanu", "Makara", "Kumbha", "Meena"]
RASI_ALIASES = {
    "mesha": 0, "mesham": 0, "aries": 0,
    "vrishabha": 1, "rishabha": 1, "taurus": 1,
    "mithuna": 2, "midhuna": 2, "gemini": 2,
    "kataka": 3, "karkataka": 3, "kadaka": 3, "cancer": 3,
    "simha": 4, "simham": 4, "leo": 4,
    "kanya": 5, "kanni": 5, "virgo": 5,
    "tula": 6, "thula": 6, "libra": 6,
    "vrischika": 7, "vrichika": 7, "scorpio": 7,
    "dhanu": 8, "dhanus": 8, "dhanussu": 8, "sagittarius": 8,
    "makara": 9, "makaram": 9, "capricorn": 9,
    "kumbha": 10, "kumbham": 10, "aquarius": 10,
    "meena": 11, "meenam": 11, "pisces": 11,
}
RASI_LORD = ["Mars", "Venus", "Mercury", "Moon", "Sun", "Mercury",
             "Venus", "Mars", "Jupiter", "Saturn", "Saturn", "Jupiter"]
# Varna rank (high→low): Brahmin 4, Kshatriya 3, Vaishya 2, Shudra 1
RASI_VARNA = [3, 2, 1, 4, 3, 2, 1, 4, 3, 2, 1, 4]
RASI_VARNA_NAME = ["Kshatriya", "Vaishya", "Shudra", "Brahmin", "Kshatriya", "Vaishya",
                   "Shudra", "Brahmin", "Kshatriya", "Vaishya", "Shudra", "Brahmin"]
# Vashya group: chara / sthira / ubhaya
RASI_VASHYA = ["chara", "sthira", "ubhaya", "chara", "sthira", "ubhaya",
               "chara", "sthira", "ubhaya", "chara", "sthira", "ubhaya"]

# Natural planetary friendship (classical)
FRIENDS = {
    "Sun": {"Moon", "Mars", "Jupiter"},
    "Moon": {"Sun", "Mercury"},
    "Mars": {"Sun", "Moon", "Jupiter"},
    "Mercury": {"Sun", "Venus"},
    "Jupiter": {"Sun", "Moon", "Mars"},
    "Venus": {"Mercury", "Saturn"},
    "Saturn": {"Mercury", "Venus"},
}
ENEMIES = {
    "Sun": {"Venus", "Saturn"},
    "Moon": set(),
    "Mars": {"Mercury"},
    "Mercury": {"Moon"},
    "Jupiter": {"Mercury", "Venus"},
    "Venus": {"Sun", "Moon"},
    "Saturn": {"Sun", "Moon", "Mars"},
}
# Yoni enemy pairs (classical)
YONI_ENEMY = [("cow", "tiger"), ("elephant", "lion"), ("horse", "buffalo"),
              ("dog", "deer"), ("cat", "rat"), ("goat", "monkey"),
              ("serpent", "mongoose")]

GANA_TE = {"deva": "Deva", "manushya": "Manushya", "rakshasa": "Rakshasa"}
NADI_TE = {"adi": "Adi (Vata)", "madhya": "Madhya (Pitta)", "antya": "Antya (Kapha)"}
YONI_TE = {"horse": "Gurram 🐴", "elephant": "Enugu 🐘", "goat": "Meka 🐐",
           "serpent": "Pamu 🐍", "dog": "Kukka 🐕", "cat": "Pilli 🐈", "rat": "Eluka 🐀",
           "cow": "Aavu 🐄", "buffalo": "Barre 🐃", "tiger": "Puli 🐯", "deer": "Jinka 🦌",
           "monkey": "Kothi 🐒", "mongoose": "Mungisa", "lion": "Simham 🦁"}


def _norm_key(s: str) -> str:
    return "".join(ch for ch in str(s or "").lower() if ch.isalnum())


def star_index(star: str) -> Optional[int]:
    """'Rohini'/'rohini '/'Aswini' → 0..26 · teliyakapothe None (guess వద్దు)."""
    k = _norm_key(star)
    if not k:
        return None
    if k in NAK_INDEX:
        return NAK_INDEX[k]
    nospace = k.replace(" ", "")
    return STAR_ALIASES.get(nospace)


def rasi_index(rasi: str) -> Optional[int]:
    k = _norm_key(rasi)
    if not k:
        return None
    return RASI_ALIASES.get(k)


def star_name(i: int) -> str:
    return NAKSHATRAS[i][0] if i is not None and 0 <= i < 27 else "—"


def rasi_name(i: int) -> str:
    return RASIS[i] if i is not None and 0 <= i < 12 else "—"


# ---------------------------------------------------------------------------
# ASHTAKOOTA — 36 guna (bride nak/rasi × groom nak/rasi)
# ---------------------------------------------------------------------------
def guna_milan(bride_star: str, bride_rasi: str, groom_star: str, groom_rasi: str) -> Dict:
    """Fail closed: profile star/rasi fields are not a Jathakam.

    The old rule calculator is intentionally not available through this legacy
    import.  A future provider may add a separately authenticated, reviewed
    chart interpretation path; until then no 36-guna total, percentage, koota,
    dosha, or verdict is fabricated.
    """
    return {
        "available": False,
        "calculation_available": False,
        "status": "jathakam_review_required",
        "evidence_required": True,
        "evidence_source": "owner_uploaded_jathakam_review",
        "total_36": None,
        "percent": None,
        "kootas": [],
        "doshas": [],
        "reason_en": "No 36-guna result is calculated from member-entered star/rasi fields.",
        "reason_telugu": "సభ్యుడు నమోదు చేసిన star/rasi వివరాల నుంచి 36-guna ఫలితం లెక్కించము.",
    }


# ---------------------------------------------------------------------------
# DOSHA SCREENING — profile-level (dosham unda/leda)
# ---------------------------------------------------------------------------
def _norm_dosham(v: str) -> str:
    return str(v or "").strip().lower()


def dosha_screening(profile: Dict) -> Dict:
    """Return evidence status only; never screen a dosha from profile fields."""
    p = profile or {}
    return {
        "available": False,
        "calculation_available": False,
        "status": "jathakam_review_required",
        "evidence_required": True,
        "level": "unavailable",
        "flags": [],
        "kuja": "unavailable",
        "star": "—",
        "rasi": "—",
        "verdict_telugu": "ఆధారం verify అయ్యే వరకు dosha ఫలితం చూపించము.",
        "reason_en": "No dosha screening is generated from unverified profile fields. A real chart and qualified review are required.",
        "reason_telugu": "Verify కాని profile వివరాల నుంచి dosha screening తయారు చేయము. నిజమైన chart మరియు qualified review అవసరం.",
        "jathakam_verified": bool(p.get("jathakam_verified")),
    }


# ---------------------------------------------------------------------------
# JATHAKAM upload + PANDIT queue (admin verify)
# ---------------------------------------------------------------------------
JATHAKAMS: List[Dict] = []   # {id, tsap_id, file, kind, status, note, at, verified_at}
_J_SEQ = 0


def _now() -> str:
    return datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S")


def _persist() -> bool:
    try:
        atomic_json_dump(PERSIST_FILE, {"jathakams": JATHAKAMS[-500:]}, ensure_ascii=False)
        return True
    except Exception:
        return False


def _restore() -> None:
    global _J_SEQ
    try:
        if os.path.exists(PERSIST_FILE):
            for j in (json.load(open(PERSIST_FILE, encoding="utf-8")) or {}).get("jathakams", []):
                JATHAKAMS.append(j)
                try:
                    _J_SEQ = max(_J_SEQ, int(str(j.get("id", "J-0")).split("-")[-1]))
                except Exception:
                    pass
    except Exception:
        pass


_restore()


def submit_jathakam(tsap_id: str, filename: str, kind: str = "photo") -> Dict:
    global _J_SEQ
    _J_SEQ += 1
    j = {"id": f"J-{_J_SEQ:04d}", "tsap_id": tsap_id, "file": filename, "kind": kind,
         "status": "pending", "note": "", "at": _now(), "verified_at": ""}
    JATHAKAMS.append(j)
    if not _persist():
        JATHAKAMS.pop()
        _J_SEQ -= 1
        return {"success": False, "message_telugu": "Jathakam could not be saved safely; please try again."}
    return {"success": True, **j}


def jathakam_status(tsap_id: str) -> Dict:
    """Return an owner-safe evidence state, never a chart or astrology result.

    A submitted document is evidence that a document was supplied, not proof of
    identity or correctness.  Keeping this state separate from member-entered
    star/rasi fields prevents an incomplete profile from becoming a fabricated
    horoscope result in a client or a future integration.
    """
    owner = str(tsap_id or "").strip().upper()
    rows = [row for row in JATHAKAMS if str(row.get("tsap_id", "")).strip().upper() == owner]
    rows = list(reversed(rows))
    latest = rows[0] if rows else None
    if not latest:
        state = "unavailable"
        message_en = "No horoscope document has been submitted for this profile."
        message_telugu = "ఈ ప్రొఫైల్‌కు జాతక పత్రం ఇంకా సమర్పించలేదు."
    elif latest.get("status") == "pending":
        state = "pending_review"
        message_en = "The horoscope document was received and is pending review. No chart or compatibility result is available."
        message_telugu = "జాతక పత్రం అందింది; review పెండింగ్‌లో ఉంది. Chart లేదా compatibility ఫలితం అందుబాటులో లేదు."
    elif latest.get("status") == "verified":
        state = "review_recorded"
        message_en = "A document review status is recorded. It is not an authenticity certificate and does not generate a complete chart."
        message_telugu = "పత్రం review స్థితి నమోదు అయింది. ఇది authenticity certificate కాదు; పూర్తి chart ను తయారు చేయదు."
    else:
        state = "rejected"
        message_en = "The submitted horoscope document was rejected for review; no astrology result was generated."
        message_telugu = "సమర్పించిన జాతక పత్రం review కు తిరస్కరించబడింది; ఏ జ్యోతిష్య ఫలితమూ తయారు చేయలేదు."

    public_records = [
        {"id": row.get("id"), "kind": row.get("kind"), "status": row.get("status"),
         "at": row.get("at"), "verified_at": row.get("verified_at"), "note": row.get("note", "")}
        for row in rows[:10]
    ]
    return {
        "success": True,
        "tsap_id": owner,
        "state": state,
        "calculation_available": False,
        "records": public_records,
        "message_en": message_en,
        "message_telugu": message_telugu,
        "note_en": "Only an appropriately reviewed real chart may support a professional interpretation; missing data is never guessed.",
        "note_telugu": "తగిన review పొందిన అసలైన chart మాత్రమే professional interpretation కు ఆధారం కావచ్చు; లేని వివరాలను ఊహించము.",
    }


def verify_jathakam(jid: str, ok: bool, note: str = "") -> Dict:
    j = next((x for x in JATHAKAMS if x.get("id") == jid), None)
    if not j:
        return {"success": False, "message_telugu": "⚠️ Jathakam దొరకలేదు"}
    previous = dict(j)
    j["status"] = "verified" if ok else "rejected"
    j["note"] = str(note or "")[:500]
    j["verified_at"] = _now()
    if not _persist():
        j.clear()
        j.update(previous)
        return {"success": False, "message_telugu": "Jathakam status could not be saved safely; try again."}
    return {"success": True, "jathakam": j,
            "message_telugu": ("✅ Jathakam review status recorded" if ok
                               else "❌ Jathakam review rejected — re-upload if requested")}


def astro_stats(users: List[Dict]) -> Dict:
    """Admin dashboard: dosha/star/rasi distribution."""
    stars: Dict[str, int] = {}
    rasis: Dict[str, int] = {}
    dosha_n = 0
    moola_n = 0
    jver_n = 0
    for u in (users or []):
        si = star_index(u.get("star", ""))
        stars[star_name(si) if si is not None else "—"] = stars.get(star_name(si) if si is not None else "—", 0) + 1
        ri = rasi_index(u.get("rasi", ""))
        rasis[rasi_name(ri) if ri is not None else "—"] = rasis.get(rasi_name(ri) if ri is not None else "—", 0) + 1
        d = _norm_dosham(u.get("dosham", ""))
        if d and d not in ("no", "no dosham", "none", "ledu", "—", "-"):
            dosha_n += 1
        if str(u.get("moola_nakshatram", "No")).lower() in ("yes", "true", "1", "avunu"):
            moola_n += 1
        if u.get("jathakam_verified"):
            jver_n += 1
    pend = len([j for j in JATHAKAMS if j.get("status") == "pending"])
    return {"total": len(users or []), "dosha_declared": dosha_n, "moola": moola_n,
            "jathakam_verified": jver_n, "jathakam_pending": pend,
            "top_stars": sorted(stars.items(), key=lambda x: -x[1])[:8],
            "top_rasis": sorted(rasis.items(), key=lambda x: -x[1])[:6]}
