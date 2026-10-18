"""Porutham evidence boundary for Mana Vivaha.

The previous ten-rule star/rasi calculator is retired.  Member-entered fields
are not a complete Jathakam, so this module retains only neutral label parsers
and a fail-closed compatibility contract for legacy imports.  No score, tally,
rule table, dosha result, chart, PDF, image, or marriage verdict is generated
until a separately reviewed owner-supplied document and authorised interpreter
exist.
"""
from __future__ import annotations

from typing import Dict, List, Optional, Tuple

# ------------------------------------------------------------------ 27 NAKSHATRAS
NAKSHATRAS = [
    "ashwini", "bharani", "krittika", "rohini", "mrigasira", "ardra", "punarvasu", "pushya",
    "ashlesha", "magha", "pubba", "uttara", "hasta", "chitra", "swati", "vishakha",
    "anuradha", "jyeshtha", "moola", "purvashadha", "uttarashadha", "shravana", "dhanishta",
    "shatabhisha", "purvabhadra", "uttarabhadra", "revati",
]
NAKSHATRA_TELUGU = [
    "అశ్విని", "భరణి", "కృత్తిక", "రోహిణి", "మృగశిర", "ఆరుద్ర", "పునర్వసు", "పుష్యమి",
    "ఆశ్లేష", "మఘ", "పూర్వ ఫల్గుణి", "ఉత్తర ఫల్గుణి", "హస్త", "చిత్ర", "స్వాతి", "విశాఖ",
    "అనూరాధ", "జ్యేష్ఠ", "మూల", "పూర్వాషాఢ", "ఉత్తరాషాఢ", "శ్రవణం", "ధనిష్ఠ",
    "శతభిషం", "పూర్వాభాద్ర", "ఉత్తరాభాద్ర", "రేవతి",
]
# spelling variants (users ala type chestharu)
NAK_ALIASES = {
    "aswini": 0, "aswani": 0, "pubbha": 10, "pubba": 10, "purvaphalguni": 10, "p phalguni": 10,
    "uttaraphalguni": 11, "u phalguni": 11, "utthara": 11, "uttara": 11, "hastha": 12,
    "chitta": 13, "swathi": 14, "visakha": 15, "vishaka": 15, "anooradha": 16, "anuraadha": 16,
    "jyeshta": 17, "jyesta": 17, "moola": 18, "mula": 18, "poorvashadha": 19, "purvashada": 19,
    "uttarashada": 20, "sravana": 21, "sravanam": 21, "sravan": 21, "dhanista": 22, "danishta": 22,
    "satabhisha": 23, "shatabhisa": 23, "sathabhisha": 23, "purvabhadra": 24, "uttarabhadra": 25,
    "revathi": 26, "rohini": 3, "krithika": 2, "karthika": 2, "mrugasira": 4, "mrigashira": 4,
    "arudra": 5, "punarvsu": 6, "pushyami": 7, "aslesha": 8, "magha": 9, "makha": 9,
}

# ------------------------------------------------------------------ 12 RASI
RASIS = ["mesha", "vrishabha", "mithuna", "karkataka", "simha", "kanya",
         "tula", "vrishchika", "dhanu", "makara", "kumbha", "meena"]
RASI_TELUGU = ["మేషం", "వృషభం", "మిథునం", "కర్కాటకం", "సింహం", "కన్య",
               "తుల", "వృశ్చికం", "ధనుస్సు", "మకరం", "కుంభం", "మీనం"]
RASI_LORDS = ["Mars (Kuja)", "Venus (Shukra)", "Mercury (Budha)", "Moon (Chandra)", "Sun (Surya)",
              "Mercury (Budha)", "Venus (Shukra)", "Mars (Kuja)", "Jupiter (Guru)", "Saturn (Shani)",
              "Saturn (Shani)", "Jupiter (Guru)"]
RASI_ALIASES = {"vrushabha": 1, "vruschika": 7, "vrischika": 7, "dhanussu": 8, "meenam": 11,
                "kumbham": 10, "makaram": 9, "mesham": 0, "karkatakam": 3, "simham": 4,
                "kanyam": 5, "tulam": 6, "mithunam": 2}

# nakshatra → rasi (moon sign): nakshatras 1-9 Bharani..? (Ashwini starts Mesha; 9 nakshatras per... )
# Traditional: each rasi has 2¼ nakshatras. Ashwini(1)-Bharani(2)+1/4 Krittika = Mesha ...
NAK_TO_RASI = ([0] * 2 + [1] * 3 + [1] + [2] * 2 + [3] * 3 + [4] * 2 + [5] * 2 +
               [6] * 2 + [7] * 3 + [8] * 3 + [9] * 2 + [10] * 2 + [11] * 2)  # 27 entries approx
NAK_TO_RASI = [0, 0, 1, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 11]

# ------------------------------------------------------------------ GANA
GANA = {}
for i in [0, 4, 6, 7, 12, 14, 21, 26]:
    GANA[i] = "Deva"
for i in [1, 3, 5, 10, 11, 16, 20, 24]:
    GANA[i] = "Manushya"
for i in [2, 8, 9, 13, 15, 17, 18, 22, 23, 25]:
    GANA[i] = "Rakshasa"
# Gana matrix (bride→groom) standard: Deva-Manushya=good, same=good, Rakshasa mismatches = not good
GANA_MATRIX = {
    ("Deva", "Deva"): 2, ("Deva", "Manushya"): 2, ("Deva", "Rakshasa"): 0,
    ("Manushya", "Deva"): 1, ("Manushya", "Manushya"): 2, ("Manushya", "Rakshasa"): 1,
    ("Rakshasa", "Deva"): 0, ("Rakshasa", "Manushya"): 1, ("Rakshasa", "Rakshasa"): 2,
}

# ------------------------------------------------------------------ YONI
YONI = ["Horse", "Elephant", "Sheep", "Serpent", "Serpent", "Dog", "Cat", "Sheep", "Cat", "Rat",
        "Rat", "Cow", "Buffalo", "Tiger", "Buffalo", "Tiger", "Deer", "Deer", "Dog", "Monkey",
        "Mongoose", "Monkey", "Lion", "Horse", "Lion", "Cow", "Elephant"]
YONI_ENEMIES = {("Cow", "Tiger"), ("Elephant", "Lion"), ("Horse", "Buffalo"), ("Dog", "Deer"),
                ("Cat", "Rat"), ("Monkey", "Sheep"), ("Mongoose", "Serpent")}

# ------------------------------------------------------------------ RAJJU (⚠️ critical)
RAJJU_GROUPS = {
    "Pada": [0, 8, 9, 17, 18, 26],
    "Kati": [1, 7, 10, 16, 19, 25],
    "Nabhi": [2, 6, 11, 15, 20, 24],
    "Kantha": [3, 5, 12, 14, 21, 23],
    "Siro": [4, 13, 22],
}
RAJJU_TELUGU = {"Pada": "పాద రజ్జు", "Kati": "కటి రజ్జు", "Nabhi": "నాభి రజ్జు",
                "Kantha": "కంఠ రజ్జు", "Siro": "శిరో రజ్జు"}
RAJJU_ENGLISH = {"Pada": "Pada", "Kati": "Kati", "Nabhi": "Nabhi",
                 "Kantha": "Kantha", "Siro": "Shiro"}

# ------------------------------------------------------------------ VEDHA (⚠️ critical)
VEDHA_PAIRS = [(0, 17), (1, 16), (2, 15), (3, 14), (5, 21), (6, 20), (7, 19), (8, 18),
               (9, 26), (10, 25), (11, 24), (12, 23), (13, 22)]

# ------------------------------------------------------------------ VASHYA (rasi → primary group)
VASHYA_BY_RASI = {
    0: ["Chatuspada"],            # Mesha — ram (4 legs)
    1: ["Chatuspada"],            # Vrishabha — bull
    2: ["Manava"],                # Mithuna — human
    3: ["Jalachara"],             # Karkataka — crab (water)
    4: ["Vanachara"],             # Simha — lion (wild)
    5: ["Manava"],                # Kanya — maiden
    6: ["Manava"],                # Tula — human
    7: ["Keeta"],                 # Vrishchika — insect
    8: ["Manava", "Vanachara"],   # Dhanu — half man, half animal
    9: ["Chatuspada"],            # Makara — crocodile/4-leg (chatushpada per tradition)
    10: ["Manava"],               # Kumbha — human
    11: ["Jalachara"],            # Meena — fish
}
VASHYA_FRIENDS = {("Chatuspada", "Vanachara"), ("Manava", "Chatuspada")}

# ------------------------------------------------------------------ VEDHA (⚠️ critical)


def norm_nakshatra(value: str) -> Optional[int]:
    """Star name (English/Telugu/spelling variants) → 0-based index."""
    if not value:
        return None
    v = str(value).strip().lower().replace("  ", " ")
    if v in NAK_ALIASES:
        return NAK_ALIASES[v]
    for i, n in enumerate(NAKSHATRAS):
        if v == n or v in n or n in v:
            return i
    for i, t in enumerate(NAKSHATRA_TELUGU):
        if t and t in str(value):
            return i
    return None


def norm_rasi(value: str) -> Optional[int]:
    if not value:
        return None
    v = str(value).strip().lower().replace("  ", " ")
    if v in RASI_ALIASES:
        return RASI_ALIASES[v]
    for i, r in enumerate(RASIS):
        if v == r or v in r or r in v:
            return i
    for i, t in enumerate(RASI_TELUGU):
        if t and t in str(value):
            return i
    return None


def _count(a: int, b: int) -> int:
    """a nunchi b varaku count (1-based, 27 range)."""
    return ((b - a) % 27) + 1


def _rajju(idx: int) -> str:
    for name, group in RAJJU_GROUPS.items():
        if idx in group:
            return name
    return "?"


def _vedha(a: int, b: int) -> bool:
    return (a, b) in VEDHA_PAIRS or (b, a) in VEDHA_PAIRS


def compute_porutham(bride: Dict, groom: Dict) -> Dict:
    """Return the only safe public contract: evidence is required.

    This legacy function name is retained so old imports fail closed instead of
    silently reviving star-only Porutham.  Member-entered star/rasi values are
    not an authentic birth chart and are never converted into checks, doshas,
    a tally, a score, a PDF, or a verdict.
    """
    return {
        "available": False,
        "calculation_available": False,
        "status": "jathakam_required",
        "evidence_required": True,
        "evidence_source": "owner_uploaded_jathakam_review",
        "reason": "అసలైన జాతక పత్రం మరియు తగిన review లేకుండా Porutham లెక్కించము.",
        "reason_en": "No Porutham checks are calculated from member-entered star/rasi fields alone. An owner-uploaded real Jathakam and appropriate professional review are required.",
        "passed_checks": None,
        "total_checks": None,
        "items": [],
        "doshas": [],
        "doshas_en": [],
        "advice_telugu": "నమోదు చేసిన star/rasi వివరాలు పూర్తి జాతకం కాదు; అసలైన పత్రం review చేయించండి.",
        "advice_en": "Member-entered star/rasi details are not a complete horoscope. Review the original document with a qualified professional.",
    }


def porutham_line(bride: Dict, groom: Dict) -> str:
    """Honest one-line status for legacy callers; never a compatibility result."""
    result = compute_porutham(bride, groom)
    return result["reason_en"]


if __name__ == "__main__":  # explicit fail-closed diagnostic
    import json
    print(json.dumps(compute_porutham({}, {}), ensure_ascii=False, indent=2))
