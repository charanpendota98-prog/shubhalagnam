"""
మన వివాహ — 10-PORUTHAM REFERENCE ENGINE 🔮
==========================================
This module implements ten rule-based traditional reference checks from supplied star details.
It does not predict compatibility, marriage outcomes, or user suitability.

Ee module: ten rule-based traditional Porutham checks with item-level outcomes.
It does not assign a compatibility score, percentage, star rating, or match verdict.

10 PORUTHAMS (traditional order):
  1. Rasi Porutham        — 6/8 (shashtashtaka) dosham check
  2. Nakshatra Porutham   — nakshatra gana/distance rules
  3. Gana Porutham        — Deva / Manushya / Rakshasa matrix
  4. Yoni Porutham        — animal symbol compatibility (27 nakshatras)
  5. Rajju Porutham       — same rajju = dosham (⚠️ critical)
  6. Vedha Porutham       — vedha pairs (⚠️ critical)
  7. Mahendra Porutham    — count 4,7,10,13,16,19,22,25
  8. Stree Deergha        — groom nunchi bride count ≥ 13
  9. Vashya Porutham      — rasi vashya groups
 10. Rasi Adhipathi       — rasi lord relation

⚠️ Idi traditional tables batti *approximate* calculation (software estimate).
   Final ga purohit / panchangam tho confirm cheyyandi — mana site lo ala ne cheptham (honest).
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
    """
    Bride + groom (star/rasi fields unna profiles) → ten check outcomes.
    Returns per-item pass/review facts and dosha flags, not an overall score or verdict.
    """
    b_star_raw, g_star_raw = bride.get("star") or bride.get("moola_nakshatram") or "", \
        groom.get("star") or groom.get("moola_nakshatram") or ""
    b_star, g_star = norm_nakshatra(b_star_raw), norm_nakshatra(g_star_raw)
    b_rasi_raw, g_rasi_raw = bride.get("rasi") or "", groom.get("rasi") or ""
    b_rasi, g_rasi = norm_rasi(b_rasi_raw), norm_rasi(g_rasi_raw)
    if b_rasi is None and b_star is not None:
        b_rasi = NAK_TO_RASI[b_star]
    if g_rasi is None and g_star is not None:
        g_rasi = NAK_TO_RASI[g_star]

    items: List[Dict] = []
    if b_star is None or g_star is None:
        return {
            "available": False,
            "reason": "నక్షత్రం (Star) వివరాలు ప్రొఫైల్స్‌లో లేవు — గుణమేళనం లెక్కించలేదు",
            "reason_en": "Required nakshatra details are missing from one or both profiles; no Porutham checks were calculated.",
            "passed_checks": None, "total_checks": 10,
            "items": [], "doshas": [], "doshas_en": [],
            "advice_telugu": "రెండు ప్రొఫైల్స్‌లో అవసరమైన నక్షత్ర వివరాలు నమోదు చేసిన తర్వాత మాత్రమే ఈ సాంప్రదాయ checks లెక్కించవచ్చు.",
            "advice_en": "These ten traditional rules can be calculated only after the required nakshatra details are available for both profiles.",
        }

    # 1. Rasi (shashtashtaka 6/8 dosham)
    dist = ((b_rasi - g_rasi) % 12) + 1
    rasi_ok = dist not in (6, 8)
    items.append({"no": 1, "name": "రాశి పొంతన", "name_en": "Rasi compatibility", "telugu": "రాశి పొంతన", "pass": rasi_ok,
                  "note": ("రాశుల మధ్య దూరం బాగుంది (షష్టాష్టక దోషం లేదు)" if rasi_ok else
                           f"రాశి {dist}వ స్థానం — షష్టాష్టక (6/8) దోషం, పరిహారం అవసరం"),
                  "note_en": ("The rasi distance does not fall in the listed 6/8 positions." if rasi_ok else
                              f"The rasi distance is {dist}; this falls in the listed 6/8-position Shashtashtaka rule.")})

    # 2. Nakshatra / Dina
    nak_count = _count(g_star, b_star)
    nak_ok = not _vedha(b_star, g_star)
    items.append({"no": 2, "name": "నక్షత్ర / దిన గుణం", "name_en": "Nakshatra / Dina", "telugu": "దిన గుణం", "pass": nak_ok,
                  "note": (f"నక్షత్ర దూరం {nak_count} — అనుకూలం" if nak_ok else "నక్షత్ర వేధ ఉంది (క్రింద చూడండి)"),
                  "note_en": (f"Nakshatra distance: {nak_count}; no listed Vedha pair was found." if nak_ok else
                              "A listed nakshatra Vedha pair was found.")})

    # 3. Gana
    bg, gg = GANA.get(b_star, "Manushya"), GANA.get(g_star, "Manushya")
    gana_score = GANA_MATRIX.get((bg, gg), 1)
    items.append({"no": 3, "name": "గణ మైత్రి", "name_en": "Gana compatibility", "telugu": "గణ మైత్రి", "pass": gana_score >= 1,
                  "note": f"వధువు: {bg} • వరుడు: {gg} — " + ("బాగుంది" if gana_score == 2 else
                                                            ("పర్వాలేదు" if gana_score == 1 else "రాక్షస గణం — సరిపోదు")),
                  "note_en": f"Bride: {bg} • Groom: {gg} — " + ("marked favorable by this rule." if gana_score == 2 else
                                                                  ("mixed under this rule." if gana_score == 1 else "not marked favorable by this rule."))})

    # 4. Yoni
    by, gy = YONI[b_star], YONI[g_star]
    enemy = (by, gy) in YONI_ENEMIES or (gy, by) in YONI_ENEMIES
    yoni_ok = not enemy
    items.append({"no": 4, "name": "యోని పొంతన", "name_en": "Yoni compatibility", "telugu": "యోని పొంతన", "pass": yoni_ok,
                  "note": f"{by} ↔ {gy}" + (" — శత్రు యోనులు (కలహం రిస్క్)" if enemy else " — అనుకూలం"),
                  "note_en": f"{by} ↔ {gy} — " + ("listed as an opposing yoni pair." if enemy else "not listed as an opposing yoni pair.")})

    # 5. Rajju (critical)
    br, gr = _rajju(b_star), _rajju(g_star)
    rajju_ok = br != gr
    items.append({"no": 5, "name": "రజ్జు శుద్ధి", "name_en": "Rajju", "telugu": "రజ్జు శుద్ధి", "pass": rajju_ok,
                  "note": (f"{RAJJU_TELUGU.get(br, br)} ≠ {RAJJU_TELUGU.get(gr, gr)} — రజ్జు శుద్ధి ఉంది ✅" if rajju_ok
                           else f"ఇద్దరికీ {RAJJU_TELUGU.get(br, br)} — రజ్జు దోషం ⚠️ (పురోహితులను సంప్రదించండి)"),
                  "note_en": (f"The profiles fall in different Rajju groups: {RAJJU_ENGLISH.get(br, br)} and {RAJJU_ENGLISH.get(gr, gr)}." if rajju_ok else
                              f"Both profiles fall in the {RAJJU_ENGLISH.get(br, br)} Rajju group; consult a qualified family adviser if this tradition is relevant to you.")})

    # 6. Vedha (critical)
    vedha = _vedha(b_star, g_star)
    items.append({"no": 6, "name": "వేధ పరిశీలన", "name_en": "Vedha", "telugu": "వేధ పరిశీలన", "pass": not vedha,
                  "note": ("వేధ లేదు — శుభప్రదం ✅" if not vedha else
                           f"{NAKSHATRA_TELUGU[b_star]} ↔ {NAKSHATRA_TELUGU[g_star]} — వేధ దోషం ఉంది ⚠️"),
                  "note_en": ("No listed Vedha pair was found." if not vedha else
                              f"The listed Vedha pair is {NAKSHATRAS[b_star].title()} ↔ {NAKSHATRAS[g_star].title()}.")})

    # 7. Mahendra
    m_count = _count(b_star, g_star)
    mahendra_ok = m_count in (4, 7, 10, 13, 16, 19, 22, 25)
    items.append({"no": 7, "name": "మాహేంద్ర పొంతన", "name_en": "Mahendra", "telugu": "మాహేంద్ర పొంతన", "pass": mahendra_ok,
                  "note": f"Count {m_count} — " + ("అనుకూలం (సంతాన భాగ్యం & ఐశ్వర్యం)" if mahendra_ok else "సాధారణం"),
                  "note_en": f"Count {m_count} — " + ("meets the distance values listed for this rule." if mahendra_ok else "does not meet the distance values listed for this rule.")})

    # 8. Stree Deergha
    sd_count = _count(g_star, b_star)
    sd_ok = sd_count >= 13
    items.append({"no": 8, "name": "స్త్రీ దీర్ఘం", "name_en": "Stree Deergha", "telugu": "స్త్రీ దీర్ఘం", "pass": sd_ok,
                  "note": f"Count {sd_count} — " + ("అనుకూలం (దీర్ఘ సుమంగళి)" if sd_ok else "13+ ఉండాలి — సాధారణం"),
                  "note_en": f"Count {sd_count} — " + ("meets the listed 13-or-more criterion." if sd_ok else "does not meet the listed 13-or-more criterion.")})

    # 9. Vashya
    bv = VASHYA_BY_RASI.get(b_rasi, [])
    gv = VASHYA_BY_RASI.get(g_rasi, [])
    vashya_ok = bool(set(bv) & set(gv)) or any((a, c) in VASHYA_FRIENDS or (c, a) in VASHYA_FRIENDS
                                              for a in bv for c in gv)
    items.append({"no": 9, "name": "వశ్య పొంతన", "name_en": "Vashya", "telugu": "వశ్య పొంతన", "pass": vashya_ok,
                  "note": f"{RASI_TELUGU[b_rasi]} ↔ {RASI_TELUGU[g_rasi]} — "
                          + ("అనుకూలం" if vashya_ok else "సాధారణం"),
                  "note_en": f"{RASIS[b_rasi].title()} ↔ {RASIS[g_rasi].title()} — "
                            + ("the listed Vashya groups overlap or are paired as friends." if vashya_ok else
                               "the listed Vashya groups are not marked as overlapping or friendly.")})

    # 10. Rasi Adhipathi
    b_lord = RASI_LORDS[b_rasi] if b_rasi is not None else "?"
    g_lord = RASI_LORDS[g_rasi] if g_rasi is not None else "?"
    friends = {("Mars (Kuja)", "Sun (Surya)"), ("Sun (Surya)", "Mars (Kuja)"),
               ("Jupiter (Guru)", "Sun (Surya)"), ("Sun (Surya)", "Jupiter (Guru)"),
               ("Venus (Shukra)", "Saturn (Shani)"), ("Saturn (Shani)", "Venus (Shukra)"),
               ("Mercury (Budha)", "Venus (Shukra)"), ("Venus (Shukra)", "Mercury (Budha)"),
               ("Moon (Chandra)", "Sun (Surya)"), ("Sun (Surya)", "Moon (Chandra)")}
    lord_ok = b_lord == g_lord or (b_lord, g_lord) in friends
    items.append({"no": 10, "name": "రాశ్యాధిపతి మైత్రి", "name_en": "Rasi lord relationship", "telugu": "రాశ్యాధిపతి మైత్రి", "pass": lord_ok,
                  "note": f"{b_lord} ↔ {g_lord} — " + ("మిత్ర గ్రహాలు ✅" if lord_ok else "శత్రు/సమ గ్రహాలు"),
                  "note_en": f"{b_lord} ↔ {g_lord} — " + ("listed as friendly in the rule table." if lord_ok else "not listed as friendly in the rule table.")})

    passed_checks = sum(1 for item in items if item["pass"] is True)
    doshas = [i["name"] for i in items if not i["pass"] and i["no"] in (5, 6)]
    critical_miss = bool([i for i in items if not i["pass"] and i["no"] in (5, 6)])

    return {
        "available": True,
        "bride_star": NAKSHATRA_TELUGU[b_star], "groom_star": NAKSHATRA_TELUGU[g_star],
        "bride_star_en": NAKSHATRAS[b_star].title(), "groom_star_en": NAKSHATRAS[g_star].title(),
        "bride_rasi": RASI_TELUGU[b_rasi], "groom_rasi": RASI_TELUGU[g_rasi],
        "bride_rasi_en": RASIS[b_rasi].title(), "groom_rasi_en": RASIS[g_rasi].title(),
        "passed_checks": passed_checks, "total_checks": len(items),
        "items": items,
        "doshas": doshas,
        "doshas_en": [item["name_en"] for item in items if not item["pass"] and item["no"] in (5, 6)],
        "advice_telugu": (
            "ఇవి అందించిన నక్షత్ర వివరాలపై ఈ అమరిక లెక్కించిన పది నియమాల ఫలితాలు మాత్రమే; పూర్తి జాతకం లేదా వివాహ సిఫార్సు కాదు. ప్రతి అంశాన్ని విడిగా పరిశీలించి, సంప్రదాయం గురించి అర్హులైన సలహాదారుతో చర్చించండి."
            + (" రజ్జు/వేధ అంశాలను విడిగా సమీక్షించండి." if critical_miss else "")
        ),
        "advice_en": (
            "These are outcomes from ten listed rules applied to the supplied nakshatra details. This is not a complete horoscope or a marriage recommendation. Review each item separately and consult a qualified adviser if these traditions are relevant to you."
            + (" Rajju or Vedha items are marked for review." if critical_miss else "")
        ),
    }


def porutham_line(bride: Dict, groom: Dict) -> str:
    """One factual summary line; never call check counts a compatibility score."""
    result = compute_porutham(bride, groom)
    if not result.get("available"):
        return "🔮 Porutham checks లెక్కించలేదు — అవసరమైన నక్షత్ర వివరాలు అందుబాటులో లేవు."
    return (f"🔮 {result['passed_checks']} of {result['total_checks']} Porutham checks marked pass; "
            "review each item separately (not a compatibility verdict).")


if __name__ == "__main__":  # demo: python porutham.py
    b = {"star": "Rohini", "rasi": "Vrishabha"}
    g = {"star": "Mrigasira", "rasi": "Vrishabha"}
    import json
    print(json.dumps(compute_porutham(b, g), ensure_ascii=False, indent=2))
