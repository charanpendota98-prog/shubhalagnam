"""
MANA VIVAHA — CHANNEL CONTENT ENGINE (Telugu-first, perfect copy) 📢
====================================================================
Ee module channel ki kavalsina **anni texts** okate chota generate chestundi:

  * perfect_title(key)        → Telegram channel TITLE (Telugu + English keywords, search ki best)
  * perfect_description(key)  → Telegram channel DESCRIPTION (255 chars limit — keyword-rich)
  * pinned_welcome(key)       → 📌 PIN cheyyalsina welcome post (rules + ela use cheyyali)
  * rules_post(key)           → rules post (admin ki, no-spam/money/chatting)
  * posting_schedule()        → roju post times + captions tips
  * share_text(key)           → WhatsApp lo channel promote cheyyadaniki ready text
  * dp_text(key)              → DP image lo render ayye ENGLISH text (server lo Telugu font ledu)

Single source of truth: `channels_config.py` ee module nunchi titles/descriptions teesukuntundi.
"""
from __future__ import annotations

import re
from typing import Dict, List

SITE = "https://manavivaha.in"
BRAND = "మన వివాహ"
LEGAL = "Manavivaha"

TITLE_LIMIT = 128          # Telegram channel title max
DESC_LIMIT = 255           # Telegram channel description max
POST_LIMIT = 4096          # message max

# ------------------------------------------------------------------ caste names
CASTE_TELUGU: Dict[str, str] = {
    "reddy": "రెడ్డి", "kamma": "కమ్మ", "kapu": "కాపు", "velama": "వెలమ", "vysya": "వైశ్య",
    "brahmin": "బ్రాహ్మణ", "raju": "రాజు", "goud": "గౌడ్", "yadav": "యాదవ", "mudiraj": "ముదిరాజ్",
    "padmashali": "పద్మశాలి", "munnuru_kapu": "మున్నూరు కాపు", "balija": "బలిజ", "telaga": "తెలగ",
    "koppula_velama": "కొప్పుల వెలమ", "kalinga": "కళింగ", "boya": "బోయ", "kuruba": "కురుబ",
    "uppara": "ఉప్పర", "vaddera": "వడ్డెర", "rajaka": "రజక", "mangali": "మంగలి",
    "viswakarma": "విశ్వకర్మ", "kummara": "కుమ్మరి", "gandla": "గండ్ల", "devanga": "దేవాంగ",
    "srisayana": "శ్రీసాయన", "jangam": "జంగం", "jogi": "జోగి", "dasari": "దాసరి",
    "bhatraju": "భట్రాజు", "gavara": "గవర", "bestha": "బెస్త", "jalari": "జలరి",
    "vadabalija": "వడబలిజ", "mala": "మాల", "madiga": "మాదిగ", "adi_andhra": "ఆది ఆంధ్ర",
    "sc_others": "SC ఇతరులు", "lambada": "లంబాడ", "koya": "కోయ", "gond": "గోండ్",
    "st_others": "ST ఇతరులు",
    # ---- clusters (wave 8 restructure) ----
    "kapu_family": "కాపు • బలిజ • తెలగ", "yadava_goud": "యాదవ • గొల్ల",
    "goud": "గౌడ", "kuruma": "కురుమ", "rajaka": "రజక", "kummari": "కుమ్మరి", "perika": "పెరిక",
    "viswabrahmana": "విశ్వబ్రహ్మణ", "raju_kshatriya": "రాజు • క్షత్రియ",
    "padmashali_weavers": "పద్మశాలి • దేవాంగ", "mudiraj": "ముదిరాజ • తెనుగొల్ల",
    "lambada_banjara": "లంబాడ • బంజార", "others_bc": "ఇతర BC కులాలు",
    "others_sc": "ఇతర SC కులాలు", "others_st": "ఇతర ST కులాలు",
}

# ------------------------------------------------------------------ title parts
REGION_TITLE = {
    "ts_bride": ("👰 TS Brides", "తెలంగాణ వధువులు"),
    "ts_groom": ("🤵 TS Grooms", "తెలంగాణ వరులు"),
    "ap_bride": ("👰 AP Brides", "ఆంధ్రా వధువులు"),
    "ap_groom": ("🤵 AP Grooms", "ఆంధ్రా వరులు"),
    "nri_global": ("🌍 NRI Telugu Matrimony", "విదేశీ సంబంధాలు"),
}
RELIGION_TITLE = {
    "hindu": ("🕉️ Hindu Matrimony", "హిందూ వివాహాలు"),
    "muslim": ("☪️ Muslim Matrimony", "ముస్లిం వివాహాలు"),
    "christian": ("✝️ Christian Matrimony", "క్రైస్తవ వివాహాలు"),
    "other_religion": ("🕊️ Other Religions", "ఇతర మత వివాహాలు"),
    "interfaith": ("💞 Inter-Faith & Love", "ప్రేమ వివాహాలు"),
}
SPECIAL_TITLE = {
    "second_marriage": ("💍 Second Marriage", "రెండో పెళ్లి"),
    "differently_abled": ("♿ Differently-Abled", "ప్రత్యేక సామర్థ్యం"),
    "govt_jobs": ("🏛️ Govt Jobs Matrimony", "ప్రభుత్వ ఉద్యోగులు"),
    "software_it": ("💻 Software Matrimony", "సాఫ్ట్‌వేర్ ఉద్యోగులు"),
    "doctors": ("🩺 Doctors Matrimony", "వైద్యులు"),
    "teachers": ("👩‍🏫 Teachers Matrimony", "ఉపాధ్యాయులు"),
    "doctors_teachers": ("🩺 Doctors & Teachers Matrimony", "వైద్యులు + ఉపాధ్యాయులు"),
    "above_35": ("🎂 35+ Matrimony", "35 ఏళ్ల పైన"),
    "love_register": ("❤️ Love & Register Marriage", "ప్రేమ + రిజిస్టర్ పెళ్లి"),
    "success_stories": ("🏆 Success Stories", "విజయ గాథలు"),
    "fraud_alerts": ("🚨 Fraud Alerts", "మోసం జాగ్రత్త"),
    "bureau_network": ("🤝 Bureau / Broker Network", "బ్రోకర్ల నెట్‌వర్క్"),
}
OFFICIAL_TITLE = ("📢 మన వివాహ Official", "మన వివాహ — TS-AP")


def _caste_key_from_channel(key: str) -> str:
    """c_reddy_bride → reddy | reddy_bride → reddy"""
    core = key[2:] if key.startswith("c_") else key
    for suf in ("_bride", "_groom"):
        if core.endswith(suf):
            core = core[: -len(suf)]
    return core


def _gender_from_channel(key: str) -> str:
    if key.endswith("_groom"):
        return "Groom"
    if key.endswith("_bride"):
        return "Bride"
    return ""


RELIGION_STATE_TE = {"TS": "తెలంగాణ", "AP": "ఆంధ్రా"}
RELIGION_STATE_EN = {"TS": "Telangana", "AP": "AP"}


def religion_title(key: str, ch: Dict) -> str:
    """☪️ Muslim / ✝️ Christian — state × gender channels కి title."""
    sub = ch.get("sub", "")
    st, g = ch.get("state", "TS"), ch.get("gender", "Bride")
    icon = {"muslim": "☪️", "christian": "✝️"}.get(sub, "💍")
    en = "%s %s %s" % (RELIGION_STATE_EN.get(st, st), sub.title(), ("Brides" if g == "Bride" else "Grooms"))
    te = "%s %s %s" % (RELIGION_STATE_TE.get(st, st), ("ముస్లిం" if sub == "muslim" else "క్రైస్తవ"),
                       ("వధువులు" if g == "Bride" else "వరులు"))
    return "%s %s | %s" % (icon, en, te)


def cluster_title(key: str, ch: Dict) -> str:
    """Caste cluster — పెద్ద community (bride/groom separate) + grouped sub-castes."""
    en = ch.get("cluster_en", "")
    te = ch.get("cluster_te", "")
    if key.endswith("_bride"):
        return "👰 %s Brides | %s వధువులు" % (en, te)
    if key.endswith("_groom"):
        return "🤵 %s Grooms | %s వరులు" % (en, te)
    return "💍 %s Matrimony | %s — వధువులు + వరులు" % (en, te)


def perfect_title(key: str, ch: Dict | None = None) -> str:
    """Telegram title — keyword-first (Telegram search లో top వస్తుంది) + Telugu (trust)."""
    if key == "official":
        return "%s | %s" % (OFFICIAL_TITLE[0], OFFICIAL_TITLE[1])
    if key in REGION_TITLE:
        return "%s | %s" % REGION_TITLE[key]
    if key in RELIGION_TITLE:
        return "%s | %s" % RELIGION_TITLE[key]
    if key in SPECIAL_TITLE:
        return "%s | %s" % SPECIAL_TITLE[key]
    ch = ch or {}
    if ch.get("sub") in ("muslim", "christian"):
        return religion_title(key, ch)
    if key.startswith("c_") and ch.get("cluster_en"):
        return cluster_title(key, ch)
    caste = _caste_key_from_channel(key)
    tel = CASTE_TELUGU.get(caste, caste.title())
    g = _gender_from_channel(key)
    if g == "Bride":
        return "👰 %s Brides | %s వధువులు" % (caste.replace("_", " ").title(), tel)
    if g == "Groom":
        return "🤵 %s Grooms | %s వరులు" % (caste.replace("_", " ").title(), tel)
    return "💍 %s Matrimony | %s వివాహాలు" % (caste.replace("_", " ").title(), tel)


DP_OVERRIDE: Dict[str, Dict[str, str]] = {
    "nri_global": {"big": "NRI", "mid": "TELUGU", "small": "USA • UK • GULF • CAN"},
    "hindu": {"big": "HINDU", "mid": "MATRIMONY", "small": "TS • AP TELUGU"},
    "other_religion": {"big": "OTHER", "mid": "RELIGIONS", "small": "TS • AP TELUGU"},
    "interfaith": {"big": "INTER", "mid": "CASTE • FAITH", "small": "LOVE & REGISTER"},
    "second_marriage": {"big": "2ND", "mid": "MARRIAGE", "small": "DIVORCEE • WIDOW"},
    "govt_jobs": {"big": "GOVT", "mid": "JOBS", "small": "TEACHER • POLICE • BANK"},
    "software_it": {"big": "SOFTWARE", "mid": "IT JOBS", "small": "HYD • BLR • USA"},
    "doctors_teachers": {"big": "DOCTORS", "mid": "TEACHERS", "small": "MEDICAL • EDU"},
    "success_stories": {"big": "COMMUNITY", "mid": "STORIES", "small": "MANAVIVAHA"},
    "fraud_alerts": {"big": "FRAUD", "mid": "ALERTS", "small": "STAY SAFE"},
    "bureau_network": {"big": "BUREAU", "mid": "BROKERS", "small": "₹50 IF ELIGIBLE"},
}


def _fit_words(text: str, limit: int) -> tuple:
    """Whole words తో fit — 'KAPU BALIJA TELA' la mid-word cut raakunda."""
    words, line, rest = text.split(), [], []
    for w in words:
        if sum(len(x) + 1 for x in line) + len(w) <= limit:
            line.append(w)
        else:
            rest.append(w)
    return " ".join(line), " ".join(rest)


def dp_text(key: str, ch: Dict | None = None) -> Dict[str, str]:
    """DP image లో render ayye text (English — server లో Telugu font లేదు)."""
    ch = ch or {}
    if key == "official":
        return {"big": "TSAP", "mid": "MATRIMONY", "small": "TS • AP TELUGU"}
    if key in DP_OVERRIDE:
        return dict(DP_OVERRIDE[key])
    if ch.get("sub") in ("muslim", "christian"):
        st = {"TS": "TELANGANA", "AP": "AP"}.get(ch.get("state", "TS"), "TS")
        return {"big": ch["sub"].upper(),
                "mid": "%s %s" % (st, "BRIDES" if ch.get("gender") == "Bride" else "GROOMS"),
                "small": "TS • AP TELUGU"}
    if key.startswith("c_") and ch.get("cluster_en"):
        label = "BRIDES" if key.endswith("_bride") else ("GROOMS" if key.endswith("_groom") else "MATRIMONY")
        if ch.get("cluster", "").startswith("others_"):
            return {"big": "OTHER", "mid": "%s CASTES" % ch.get("category", ""), "small": "TS • AP TELUGU"}
        parts = [x.strip() for x in re.sub(r"\([^)]*\)", "", ch["cluster_en"]).split("•") if x.strip()]
        big, overflow = _fit_words(parts[0].upper(), 13)
        extra = " ".join([overflow] + [p.upper() for p in parts[1:]]).strip()
        small, _drop = _fit_words(extra, 20)
        return {"big": big or parts[0][:12].upper(), "mid": label,
                "small": small or "TS • AP TELUGU"}
    core = key
    for suf, label in (("_bride", "BRIDES"), ("_groom", "GROOMS")):
        if core.endswith(suf):
            core = core[: -len(suf)]
            name = core[2:] if core.startswith("c_") else core
            return {"big": name.replace("_", " ").upper(), "mid": label, "small": "TS • AP TELUGU"}
    if key in ("ts_bride",):
        return {"big": "TS", "mid": "BRIDES", "small": "తెలంగాణ"}
    return {"big": core.replace("_", " ").upper()[:14], "mid": "", "small": "TS • AP TELUGU"}


def perfect_description(key: str, ch: Dict | None = None) -> str:
    """Telegram description (≤255 chars) — Telugu + keywords + pricing + links."""
    ch = ch or {}
    tags = " ".join((ch.get("hashtags") or [])[:3])
    tail = "Register FREE: manavivaha.in"
    if key == "official":
        body = ("మన వివాహ — TS/AP తెలుగు మ్యాట్రిమోని directory and service updates. Profiles are member-submitted; "
                "personal details are not independently verified. Check the site for current plans.")
    elif ch.get("sub") in ("muslim", "christian"):
        sub_te = "ముస్లిం" if ch["sub"] == "muslim" else "క్రైస్తవ"
        st_te = RELIGION_STATE_TE.get(ch.get("state", "TS"), "తెలంగాణ")
        st_en = RELIGION_STATE_EN.get(ch.get("state", "TS"), "TS")
        who = "వధువులు" if ch.get("gender") == "Bride" else "వరులు"
        body = ("%s %s %s — %s. Member-submitted profiles; details are not independently verified. Confirm them yourself. %s"
                % (st_te, sub_te, who, st_en, tags))
    elif key.startswith("c_") and ch.get("cluster_en"):
        en, te = ch["cluster_en"], ch["cluster_te"]
        mem = " • ".join((ch.get("members") or [])[:5])
        who = ("Brides" if key.endswith("_bride") else "Grooms" if key.endswith("_groom") else "Brides + Grooms")
        body = ("%s — %s (%s). Sub-castes: %s. Profiles are member-submitted; details are not independently verified."
                % (te, en, who, mem))
    elif key in REGION_TITLE:
        body = ("%s — %s. Regional directory for member-submitted profiles. Personal details are not independently verified; "
                "availability and posting frequency may vary." % (REGION_TITLE[key][0], REGION_TITLE[key][1]))
    elif key in RELIGION_TITLE:
        body = ("%s — %s. వధువులు + వరులు, అన్ని జిల్లాలు. 3 FREE requests, ₹99లో 5."
                % (RELIGION_TITLE[key][0], RELIGION_TITLE[key][1]))
    elif key in SPECIAL_TITLE:
        body = ("%s — %s. Directory for member-submitted profiles in this category. Personal details are not independently verified."
                % (SPECIAL_TITLE[key][0], SPECIAL_TITLE[key][1]))
    else:
        caste = _caste_key_from_channel(key)
        body = ("%s వివాహాలు — వధువులు + వరులు, TS + AP. %s" % (CASTE_TELUGU.get(caste, caste), tags))
    # Keep the configured site URL intact when long community labels meet
    # Telegram's 255-character limit; never slice the destination URL.
    budget = DESC_LIMIT - len(tail) - 1
    if len(body) > budget:
        shortened = body[: max(0, budget - 1)]
        boundary = shortened.rfind(" ")
        if boundary >= budget // 2:
            shortened = shortened[:boundary]
        body = shortened.rstrip(" ,.;:") + "…"
    return "%s %s" % (body, tail)


def pinned_welcome(key: str, ch: Dict | None = None) -> str:
    """Pinned welcome text with website-only actions and no assumed bot access."""
    ch = ch or {}
    title = perfect_title(key, ch)
    tags = " ".join(ch.get("hashtags") or [])
    caste_or_type = ""
    if key.startswith("c_"):
        caste_or_type = ch.get("cluster_te") or CASTE_TELUGU.get(_caste_key_from_channel(key), "")
    members_line = ""
    if ch.get("members"):
        members_line = "👥 ఈ channel categories: *%s*\n\n" % " • ".join(ch["members"][:14])
    if ch.get("sub"):
        members_line = ("👥 %s %s — %s\n\n"
                        % (RELIGION_STATE_EN.get(ch.get("state", "TS"), ""), ch["sub"].title(),
                           ("Catholic • CSI • Baptist • Pentecost • Born Again" if ch["sub"] == "christian"
                            else "Sheikh • Syed • Pathan • Momin • Qureshi • Labbai")))
    return (
        f"🙏 *{title}*\n"
        "━━━━━━━━━━━━━━━━━━\n"
        f"{('*%s*' % caste_or_type) if caste_or_type else 'Telugu Matrimony — TS + AP'}\n"
        f"{members_line}"
        "ఇక్కడ ఏం దొరుకుతుంది:\n"
        "ℹ️ Members అందించిన profile వివరాలు — వ్యక్తిగత వివరాలను స్వయంగా ధృవీకరించుకోండి\n"
        "🔒 ఫోటో visibility privacy settings మీద ఆధారపడి ఉంటుంది\n"
        "ℹ️ *వేద గుణమేళనం* ఒక జ్యోతిష్య గణన మాత్రమే; వివాహ నిర్ణయానికి హామీ కాదు\n"
        "✅ Owner accept చేసిన తర్వాత accepted-request account views లో contact access వస్తుంది; notification delivery హామీ లేదు\n\n"
        "ఎలా use చేయాలి:\n"
        f"1️⃣ Profile details చూడడానికి {SITE}/search లో member ID వెతకండి.\n"
        f"2️⃣ Website లో sign in చేసి, profile page నుంచి interest request పంపండి: {SITE}/matches\n"
        "3️⃣ Profile owner accept చేసిన తర్వాత contact details accepted-request account views లో అందుబాటులోకి వస్తాయి; వివరాలను independently verify చేయండి.\n\n"
        "🆓 *మొదటి 3 requests FREE* • తర్వాత ₹99లో 5, ₹199లో 12\n\n"
        "⚠️ *భద్రత:*\n"
        "🚫 In-site chatting లేదు; unsolicited money requests పట్ల జాగ్రత్తగా ఉండండి\n"
        "💰 Advance/visa డబ్బు అడిగితే independently verify చేసి అవసరమైతే report చేయండి\n"
        f"🚨 Report: {SITE}/safety\n\n"
        f"🌐 Register: {SITE}/register\n"
        f"📢 Configured channel listings: {SITE}/channels\n"
        f"{tags}"
    )


def rules_post(key: str) -> str:
    return (
        "📜 *CHANNEL RULES — %s*\n"
        "━━━━━━━━━━━━━━━━━━\n"
        "1️⃣ Channel posting, comments, moderation and response may vary; no timing is promised\n"
        "2️⃣ Profile కోసం website లో register చేయండి; phone/photo ను public channel లో పెట్టొద్దు\n"
        "3️⃣ ఎవరికీ *advance money* పంపొద్దు — డబ్బు అడిగితే screenshot భద్రపరచి report చేయండి\n"
        "4️⃣ Personal abuse కనిపిస్తే report చేయండి; review తర్వాత చర్య ఉండవచ్చు\n"
        "5️⃣ బయట links, promos లేదా unsolicited business ads ను report చేయండి\n"
        "6️⃣ నంబర్లు channel లో పెట్టొద్దు; accepted-request account views లో contact access owner acceptance తర్వాతే వస్తుంది\n"
        "7️⃣ Interest request కోసం website లో sign in చేసి profile page లోని సూచనలను అనుసరించండి\n\n"
        "🙏 గౌరవంగా ఉండండి. Scam అనుమానం ఉంటే independently verify చేసి report చేయండి: %s/safety"
        % (perfect_title(key), SITE)
    )


def posting_schedule() -> List[Dict[str, str]]:
    """Optional draft cadence; times are suggestions, not measured reach or engagement."""
    return [
        {"time": "7:30 AM", "what": "☀️ Optional morning profile post", "why": "Suggested test slot; performance not measured"},
        {"time": "12:30 PM", "what": "🍛 Optional midday update", "why": "Suggested test slot; performance not measured"},
        {"time": "6:00 PM", "what": "🌆 Optional evening update", "why": "Suggested test slot; performance not measured"},
        {"time": "9:00 PM", "what": "🌙 Optional evening reminder", "why": "Suggested test slot; performance not measured"},
        {"time": "Sunday 10 AM", "what": "📊 Optional weekly directory summary", "why": "Suggested test slot; performance not measured"},
    ]


def share_text(key: str, ch: Dict | None = None, telegram_link: str = "") -> str:
    """Copy for an external share; only an explicitly supplied link is advertised."""
    ch = ch or {}
    title = perfect_title(key, ch)
    # A caller-supplied runtime/public link is authoritative. Do not reconstruct
    # a destination from a username when an operator may have intentionally
    # disabled or replaced that link.
    link = str(telegram_link or "").strip()
    if link:
        destination_line = "👉 Listed Telegram link (availability not checked): %s\n" % link
    else:
        destination_line = "👉 See configured channel links in the directory: %s/channels\n" % SITE
    return (
        "💍 *%s*\n"
        "TS + AP Telugu matrimony directory. Member-submitted profile details are not independently verified.\n\n"
        "• First 3 interest requests are free; check the website for current plans.\n"
        "• Photo visibility follows the member's privacy settings.\n"
        "• Contact details become available in accepted-request account views after owner acceptance; external notification delivery is not guaranteed.\n"
        "• Jathakam review is evidence-only: no star-only Gunamelanam calculation, match score, or marriage guarantee is provided.\n\n"
        "%s"
        "🌐 Register: %s\n\n"
        "#ManaVivaha #TeluguMatrimony #PelliChoopulu"
        % (title, destination_line, SITE)
    )


def channel_health(key: str, ch: Dict) -> List[str]:
    """Channel config లో ఏం miss ayyindo (setup ముందు check)."""
    problems = []
    if not ch.get("name"):
        problems.append("name ledu")
    if not ch.get("desc"):
        problems.append("desc లేదు")
    if len(ch.get("desc", "")) > DESC_LIMIT:
        problems.append("desc > %d chars" % DESC_LIMIT)
    if len(perfect_title(key, ch)) > TITLE_LIMIT:
        problems.append("title > %d chars" % TITLE_LIMIT)
    u = str(ch.get("username", "") or "").strip().lstrip("@")
    if u and not re.fullmatch(r"[A-Za-z0-9_]{5,32}", u):
        problems.append("username invalid: %s" % u)
    if not ch.get("hashtags"):
        problems.append("hashtags లేవు")
    if not ch.get("wave"):
        problems.append("wave లేదు")
    return problems


def content_stats() -> Dict:
    from channels_config import CHANNELS  # late import (circular safe)
    return {"channels": len(CHANNELS), "titles_ok": sum(
        1 for k, c in CHANNELS.items() if len(perfect_title(k, c)) <= TITLE_LIMIT),
        "descs_ok": sum(1 for k, c in CHANNELS.items() if len(perfect_description(k, c)) <= DESC_LIMIT),
        "caste_telugu": len(CASTE_TELUGU)}
