"""
🪐 WAVE 13 — PEDDA ASTROLOGY SYSTEM (మన వివాహ)
=================================================
1. 36-GUNA (Ashtakoota) real vedic math — nakshatra + rasi nunchi:
   Varna 1 · Vashya 2 · Tara 3 · Yoni 2 · Graha-Maitri 5 · Gana 6 · Bhakoot 7 · Nadi 8 = 36
2. DOSHA SCREENING — kuja/self-declared, moola/gandanta, nadi/bhakoot dosha flags.
   (Full jathakam ki birth-chart kavali — screening honest ga "pandit review" cheptundi.)
3. JATHAKAM upload + PANDIT verify queue (admin) → verified badge.

Tables: classical Parashara convention. Unknown star/rasi → honest "data లేదు"
(guess cheyyamu — mistakes vaddu).
"""
from __future__ import annotations

import json
import os
from datetime import datetime
from typing import Dict, List, Optional

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PERSIST_FILE = os.path.join(BASE_DIR, "astro13.json")

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
    """
    Returns {available, total_36, percent, verdict, verdict_telugu, kootas[8],
             doshas[], note}. Star/rasi teliyakapothe available=False (honest).
    """
    bs, br = star_index(bride_star), rasi_index(bride_rasi)
    gs, gr = star_index(groom_star), rasi_index(groom_rasi)
    if bs is None or br is None or gs is None or gr is None:
        missing = []
        if bs is None:
            missing.append("ammayi star")
        if br is None:
            missing.append("ammayi rasi")
        if gs is None:
            missing.append("abbayi star")
        if gr is None:
            missing.append("abbayi rasi")
        return {"available": False, "total_36": 0,
                "verdict_telugu": f"⚠️ {', '.join(missing)} లేదు — profile లో star+రాశి పెడితే 36-guna చూపిస్తాం 🙏",
                "missing": missing}
    B, G = NAKSHATRAS[bs], NAKSHATRAS[gs]
    kootas: List[Dict] = []
    doshas: List[str] = []

    # 1. VARNA (1) — groom varna >= bride varna
    gv, bv = RASI_VARNA[gr], RASI_VARNA[br]
    v_score = 1.0 if gv >= bv else 0.0
    kootas.append({"koota": "Varna", "max": 1, "score": v_score,
                   "detail": f"{RASI_VARNA_NAME[gr]} (అబ్బాయి) vs {RASI_VARNA_NAME[br]} (అమ్మాయి)",
                   "telugu": "✅ వర్ణ గుణమేళనం" if v_score else "⚠️ వర్ణ బలం తక్కువ — పెద్దల సలహా అవసరం"})

    # 2. VASHYA (2) — rasi groups
    gg, bg = RASI_VASHYA[gr], RASI_VASHYA[br]
    if gg == bg:
        va_score = 2.0
    elif {gg, bg} == {"chara", "sthira"}:
        va_score = 1.0
    elif {gg, bg} == {"sthira", "ubhaya"}:
        va_score = 1.0
    else:
        va_score = 0.5
    kootas.append({"koota": "Vashya", "max": 2, "score": va_score,
                   "detail": f"{gg} vs {bg}",
                   "telugu": "✅ వశ్య పొంతన" if va_score >= 1 else "⚠️ వశ్యం తక్కువ"})

    # 3. TARA (3) — ammayi star nunchi abbayi star (9-cycle; 3,5,7 shubha)
    dist = (gs - bs) % 27 + 1
    tara = dist % 9
    t_score = 3.0 if tara in (3, 5, 7) else 0.0
    if tara == 1:
        doshas.append("జన్మ తార దోషం — శాంతి పరిహారం అవసరం")
    kootas.append({"koota": "Tara", "max": 3, "score": t_score,
                   "detail": f"distance {dist} → tara {tara if tara else 9}",
                   "telugu": "✅ తారా బలం (శుభ తార)" if t_score else "⚠️ తారా బలం తక్కువ"})

    # 4. YONI (2) — animals
    yb, yg = B[2], G[2]
    enemy = any({yb, yg} == set(p) for p in YONI_ENEMY)
    if enemy:
        y_score = 0.0
        doshas.append(f"యోని వైర దోషం ({YONI_TE.get(yb, yb)} × {YONI_TE.get(yg, yg)})")
    elif yb == yg:
        y_score = 2.0
    else:
        y_score = 1.0
    kootas.append({"koota": "Yoni", "max": 2, "score": y_score,
                   "detail": f"{YONI_TE.get(yb, yb)} vs {YONI_TE.get(yg, yg)}",
                   "telugu": "✅ యోని పొంతన" if y_score >= 1 else "🚫 యోని వైరం — పురోహితులను సంప్రదించండి"})

    # 5. GRAHA MAITRI (5) — rasi lords friendship
    lb, lg = RASI_LORD[br], RASI_LORD[gr]
    b_f = lg in FRIENDS.get(lb, set())
    g_f = lb in FRIENDS.get(lg, set())
    b_e = lg in ENEMIES.get(lb, set())
    g_e = lb in ENEMIES.get(lg, set())
    if b_f and g_f:
        m_score = 5.0
    elif (b_f or g_f) and not (b_e or g_e):
        m_score = 4.0
    elif not (b_e or g_e):
        m_score = 3.0
    elif (b_e and g_e):
        m_score = 0.0
        doshas.append(f"Graha-vairam ({lb} × {lg})")
    else:
        m_score = 1.0
    kootas.append({"koota": "Graha Maitri", "max": 5, "score": m_score,
                   "detail": f"{lb} (అమ్మాయి రాశి lord) × {lg} (అబ్బాయి రాశి lord)",
                   "telugu": "✅ Graha-maitri బాగుంది" if m_score >= 3 else "⚠️ Graha-maitri తక్కువ"})

    # 6. GANA (6) — temperament
    nb, ng = B[1], G[1]
    if nb == ng:
        n_score = 6.0
    elif {nb, ng} == {"deva", "manushya"}:
        n_score = 5.0
    else:
        n_score = 1.0
        doshas.append(f"Gana dosha ({GANA_TE.get(nb)} × {GANA_TE.get(ng)}) — పరిహారం ఉంది")
    kootas.append({"koota": "Gana", "max": 6, "score": n_score,
                   "detail": f"{GANA_TE.get(nb)} vs {GANA_TE.get(ng)}",
                   "telugu": "✅ గణ మైత్రి" if n_score >= 5 else "⚠️ గణ దోషం — పరిహారం పరిశీలించండి"})

    # 7. BHAKOOT (7) — abbayi rasi ammayi rasi nunchi (6-8, 5-9, 2-12 dosha)
    rdist = (gr - br) % 12 + 1
    if rdist == 7:
        bh_score = 7.0
    elif rdist in (1, 3, 4, 10, 11):
        bh_score = 4.0 if rdist in (3, 4, 10, 11) else 3.0
    else:
        bh_score = 0.0
        kind = {6: "Shashtashtaka (6-8)", 8: "Shashtashtaka (6-8)", 5: "Navama-Panchama (5-9)",
                9: "Navama-Panchama (5-9)", 2: "Dvidwadasha (2-12)", 12: "Dvidwadasha (2-12)"}.get(rdist, "")
        doshas.append(f"Bhakoot dosha {kind} — pandit పరిహారం must")
    kootas.append({"koota": "Bhakoot", "max": 7, "score": bh_score,
                   "detail": f"rasi distance {rdist}",
                   "telugu": "✅ భకూట పొంతన" if bh_score >= 3 else "🚫 భకూట దోషం — పురోహితులను సంప్రదించండి"})

    # 8. NADI (8) — veru nadi must
    db, dg = B[3], G[3]
    if db != dg:
        d_score = 8.0
    else:
        d_score = 0.0
        doshas.append(f"Nadi dosha (రెండు {NADI_TE.get(db)}) — పరిహారం lekunda వద్దు")
    kootas.append({"koota": "Nadi", "max": 8, "score": d_score,
                   "detail": f"{NADI_TE.get(db)} vs {NADI_TE.get(dg)}",
                   "telugu": "✅ నాడీ శుద్ధి (భిన్న నాడి)" if d_score else "🚫 నాడీ దోషం — పురోహితులను సంప్రదించండి"})

    total = round(sum(k["score"] for k in kootas), 1)
    if total >= 32:
        verdict, ved = "uttama", "🌟 ఉత్తమ గుణమేళనం — 32+ గుణాలు! పెళ్లి కి శ్రేష్టమైన పొంతన 💍"
    elif total >= 24:
        verdict, ved = "మంచి", "✅ మంచి గుణమేళనం — ముందుకు వెళ్ళవచ్చు"
    elif total >= 18:
        verdict, ved = "madhyama", "⚠️ మధ్యస్థ గుణమేళనం — పెద్దల ఆశీస్సులు, పరిహారంతో ముందుకు"
    else:
        verdict, ved = "తక్కువ", "🚫 గుణాలు తక్కువ — పురోహితుల సలహా తప్పనిసరి"
    if doshas:
        ved += f" · Doshalu: {len(doshas)} (కింద చూడండి)"
    return {"available": True, "total_36": total, "percent": round(total / 36 * 100, 1),
            "verdict": verdict, "verdict_telugu": ved, "kootas": kootas, "doshas": doshas,
            "bride": {"star": star_name(bs), "rasi": rasi_name(br)},
            "groom": {"star": star_name(gs), "rasi": rasi_name(gr)},
            "note_telugu": "📿 Classical Ashtakoota paddhati — final nirnayam మీ family pandit తో 🙏"}


# ---------------------------------------------------------------------------
# DOSHA SCREENING — profile-level (dosham unda/leda)
# ---------------------------------------------------------------------------
def _norm_dosham(v: str) -> str:
    return str(v or "").strip().lower()


def dosha_screening(profile: Dict) -> Dict:
    """
    Profile ki dosha unda/leda — honest screening:
      • self-declared dosham field (Kuja/Manglik/Chevvai/No...)
      • Moola star / gandanta stars (Ashlesha, Magha, Mula, Jyeshtha-tail...) — flag
      • birth_time lekapothe kuja confirm cheyyalem → pandit review
    """
    p = profile or {}
    flags: List[Dict] = []
    decl = _norm_dosham(p.get("dosham", ""))
    if decl and decl not in ("no", "no dosham", "none", "nill", "ledhu", "ledu", "—", "-"):
        flags.append({"dosha": "declared", "level": "high",
                      "telugu": f"🚫 Profile లో దోషం ఉంది ({p.get('dosham')}) — పరిహారం details అడగండి"})
    si = star_index(p.get("star", ""))
    sname = star_name(si) if si is not None else ""
    if sname == "Mula":
        flags.append({"dosha": "moola", "level": "high",
                      "telugu": "⚠️ Moola nakshatram (gandanta) — pandit పరిహారం salaha must"})
    elif sname in ("Ashlesha", "Magha", "Jyeshtha", "Revati"):
        flags.append({"dosha": "gandanta_watch", "level": "medium",
                      "telugu": f"⚠️ {sname} — gandanta zone star, jathakam full గా చూడండి"})
    if str(p.get("moola_nakshatram", "No")).lower() in ("yes", "true", "1", "avunu"):
        flags.append({"dosha": "moola_declared", "level": "high",
                      "telugu": "⚠️ Moola-nakshatram (declared) — pandit confirm చెయ్యాలి"})
    kuja_status = "unknown"
    if any(k in decl for k in ("kuja", "manglik", "chevvai", "mangal")):
        kuja_status = "declared"
    elif not p.get("birth_time"):
        kuja_status = "needs_chart"
    level = "clear" if not flags else ("high" if any(f["level"] == "high" for f in flags) else "medium")
    return {"level": level, "flags": flags, "kuja": kuja_status,
            "star": sname or str(p.get("star", "—")), "rasi": str(p.get("rasi", "—")),
            "verdict_telugu": ("✅ Dosha emi kanipinchaledu (screening)" if level == "clear"
                               else f"⚠️ {len(flags)} dosha flag(s) — కింద చూడండి + pandit verify"),
            "jathakam_verified": bool(p.get("jathakam_verified")),
            "note_telugu": "📿 Idi screening మాత్రమే — పెళ్లి nirnayam కి full jathakam + pandit must 🙏"}


# ---------------------------------------------------------------------------
# JATHAKAM upload + PANDIT queue (admin verify)
# ---------------------------------------------------------------------------
JATHAKAMS: List[Dict] = []   # {id, tsap_id, file, kind, status, note, at, verified_at}
_J_SEQ = 0


def _now() -> str:
    return datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S")


def _persist() -> None:
    try:
        with open(PERSIST_FILE, "w", encoding="utf-8") as f:
            json.dump({"jathakams": JATHAKAMS[-500:]}, f, ensure_ascii=False)
    except Exception:
        pass


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
    _persist()
    return j


def verify_jathakam(jid: str, ok: bool, note: str = "") -> Dict:
    j = next((x for x in JATHAKAMS if x.get("id") == jid), None)
    if not j:
        return {"success": False, "message_telugu": "⚠️ Jathakam దొరకలేదు"}
    j["status"] = "verified" if ok else "rejected"
    j["note"] = note
    j["verified_at"] = _now()
    _persist()
    return {"success": True, "jathakam": j,
            "message_telugu": ("✅ Jathakam verify అయ్యింది — profile కి 🪐 badge" if ok
                               else "❌ Jathakam reject — మళ్లీ upload cheyamani చెప్పండి")}


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
