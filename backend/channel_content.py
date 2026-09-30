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
BOT = "@telugumatrimony1_bot"
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
    "kapu_family": "కాపు • బలిజ • తెలగ", "yadava_goud": "యాదవ • గౌడ • గొల్ల",
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
    "success_stories": {"big": "SUCCESS", "mid": "STORIES", "small": "REAL COUPLES"},
    "fraud_alerts": {"big": "FRAUD", "mid": "ALERTS", "small": "STAY SAFE"},
    "bureau_network": {"big": "BUREAU", "mid": "BROKERS", "small": "REFERRAL ₹50"},
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
    tail = "Register FREE: manavivaha.in | Telegram: %s" % BOT
    if key == "official":
        body = ("మన వివాహ — TS/AP తెలుగు మ్యాట్రిమోని. రోజూ టాప్-3 సంబంధాలు, విజయ గాథలు, "
                "మోసం హెచ్చరికలు. 3 requests FREE, ₹99లో 5.")
    elif ch.get("sub") in ("muslim", "christian"):
        sub_te = "ముస్లిం" if ch["sub"] == "muslim" else "క్రైస్తవ"
        st_te = RELIGION_STATE_TE.get(ch.get("state", "TS"), "తెలంగాణ")
        st_en = RELIGION_STATE_EN.get(ch.get("state", "TS"), "TS")
        who = "వధువులు" if ch.get("gender") == "Bride" else "వరులు"
        body = ("%s %s %s — %s. ఫోటో గోప్యం, నిజమైన profiles, 3 requests FREE, ₹99లో 5. %s"
                % (st_te, sub_te, who, st_en, tags))
    elif key.startswith("c_") and ch.get("cluster_en"):
        en, te = ch["cluster_en"], ch["cluster_te"]
        mem = " • ".join((ch.get("members") or [])[:5])
        who = ("Brides" if key.endswith("_bride") else "Grooms" if key.endswith("_groom") else "Brides + Grooms")
        body = ("%s — %s (%s). Sub-castes: %s. నిజమైన profiles, 3 requests FREE, ₹99లో 5."
                % (te, en, who, mem))
    elif key in REGION_TITLE:
        body = ("%s — %s. అన్ని కులాలు, అన్ని జిల్లాలు, రోజూ కొత్త profiles + వేద గుణమేళనం వివరాలు. "
                "3 FREE requests, ₹99లో 5." % (REGION_TITLE[key][0], REGION_TITLE[key][1]))
    elif key in RELIGION_TITLE:
        body = ("%s — %s. వధువులు + వరులు, అన్ని జిల్లాలు. 3 FREE requests, ₹99లో 5."
                % (RELIGION_TITLE[key][0], RELIGION_TITLE[key][1]))
    elif key in SPECIAL_TITLE:
        body = ("%s — %s. ఈ కేటగిరీ ప్రత్యేక profiles మాత్రమే — వేరే ఎక్కడా దొరకవు."
                % (SPECIAL_TITLE[key][0], SPECIAL_TITLE[key][1]))
    else:
        caste = _caste_key_from_channel(key)
        body = ("%s వివాహాలు — వధువులు + వరులు, TS + AP. %s" % (CASTE_TELUGU.get(caste, caste), tags))
    line = "%s %s" % (body, tail)
    return line[:DESC_LIMIT]


def pinned_welcome(key: str, ch: Dict | None = None) -> str:
    """📌 Pin cheyyalsina welcome post — channel open చేసిన prathi okkadu idi chustadu."""
    ch = ch or {}
    title = perfect_title(key, ch)
    tags = " ".join(ch.get("hashtags") or [])
    caste_or_type = ""
    if key.startswith("c_"):
        caste_or_type = ch.get("cluster_te") or CASTE_TELUGU.get(_caste_key_from_channel(key), "")
    members_line = ""
    if ch.get("members"):
        members_line = ("👥 ఈ channel లో: *%s*\n\n" % " • ".join(ch["members"][:14]))
    if ch.get("sub"):   # Muslim / Christian
        members_line = ("👥 %s %s — %s\n\n"
                        % (RELIGION_STATE_EN.get(ch.get("state", "TS"), ""), ch["sub"].title(),
                           ("Catholic • CSI • Baptist • Pentecost • Born Again" if ch["sub"] == "christian"
                            else "Sheikh • Syed • Pathan • Momin • Qureshi • Labbai — antha ఒకటే channel")))
    return (
        "🙏 *%s*\n"
        "━━━━━━━━━━━━━━━━━━\n"
        "%s\n"
        "%s"
        "ఇక్కడ ఏం దొరుకుతుంది:\n"
        "✅ రోజూ కొత్త *నిజమైన profiles* (ఫోటో గోప్యం — చూడాలంటే site లో)\n"
        "✅ విద్య • ఉద్యోగం • జీతం • జిల్లా • జాతకం వివరాలతో full details\n"
        "✅ *వేద గుణమేళనం* (కుండలి match) స్కోరు + రజ్జు/వేధ దోషం హెచ్చరిక\n"
        "✅ ఫోన్ నంబర్ — రెండు వైపులా ఒప్పుకున్న తర్వాతే share అవుతుంది\n\n"
        "ఎలా use చేయాలి (3 steps):\n"
        "1️⃣ మీకు నచ్చిన profile చూడండి (ID ఉంటుంది: TSAP-F-2025-1042)\n"
        "2️⃣ %s కి *ID పంపండి* → మా WhatsApp నుంచి మీ profile వాళ్లకి వెళ్తుంది\n"
        "3️⃣ వాళ్లు OK అంటే నంబర్లు exchange — తర్వాత మీరే మాట్లాడుకోవచ్చు\n\n"
        "🆓 *మొదటి 3 requests FREE* • తర్వాత ₹99లో 5, ₹199లో 12\n\n"
        "⚠️ *చట్టాలు (తప్పక చదవండి):*\n"
        "🚫 ఇక్కడ *chatting లేదు* — spam, మోసం, డబ్బు అడగడం కూడా లేదు\n"
        "💰 Advance/registration/visa డబ్బు ఎవరు అడిగినా *100%% మోసం* → వెంటనే report చేయండి\n"
        "🚫 బయట numbers/business promos పెట్టొద్దు → remove + ban\n"
        "🚨 మోసం జరిగితే: /safety లో report (మీ పేరు ఎక్కడా కనిపించదు)\n\n"
        "🌐 Register FREE (3 నిమిషాలు): %s\n"
        "🔗 మా website: %s\n"
        "📢 Official: @TSAP_MATRIMONY | All channels: %s/channels\n"
        "%s"
        % (title, ("*%s*" % caste_or_type) if caste_or_type else "Telugu Matrimony — TS + AP",
           members_line, BOT, SITE, SITE, tags, "")
    )


def rules_post(key: str) -> str:
    return (
        "📜 *CHANNEL RULES — %s*\n"
        "━━━━━━━━━━━━━━━━━━\n"
        "1️⃣ Only మన వివాహ admin posts — members message చెయ్యకుండా చూడగలరు\n"
        "2️⃣ Profile details upload చెయ్యాలి అంటే *%s* కి phone/photo పంపండి\n"
        "3️⃣ ఎవరికీ *advance money* పంపొద్దు — డబ్బు అడిగితే వెంటనే screenshot → report\n"
        "4️⃣ Caste/religion గురించి discriminative comments, personal abuses → instant ban\n"
        "5️⃣ బయట links, promos, business ads → delete + ban\n"
        "6️⃣ నంబర్లు channel లో పెట్టొద్దు (privacy) — accept అయ్యాక WhatsApp లో వస్తుంది\n"
        "7️⃣ Chatting లేదు — comment లో 'interest' అని అనొద్దు, %s కి ID పంపండి\n\n"
        "🙏 మనం ఒక కుటుంబం లాంటి వాళ్ళం — గౌరవంగా ఉందాం. Report: %s/safety"
        % (perfect_title(key), BOT, BOT, SITE)
    )


def posting_schedule() -> List[Dict[str, str]]:
    """Daily posting plan — Telegram లో అందరికీ reach avvadaniki best times (IST)."""
    return [
        {"time": "7:30 AM", "what": "☀️ Morning profile (bride)", "why": "Office/పెళ్లి chusetappudu scroll peak"},
        {"time": "12:30 PM", "what": "🍛 Lunch profile (groom)", "why": "Lunch break లో views ఎక్కువ"},
        {"time": "6:00 PM", "what": "🌆 Evening profile + వేద గుణమేళనం score", "why": "Intlo అందరూ కలిసి chustaru"},
        {"time": "9:00 PM", "what": "🌙 Night profile + success story (Vara/Somvara)", "why": "Ratri 8–10 views highest"},
        {"time": "Sunday 10 AM", "what": "📊 Weekly digest (top-10 profiles + new channels)", "why": "Sunday planning time"},
    ]


def share_text(key: str, ch: Dict | None = None) -> str:
    """WhatsApp status/group లో ee channel promote చెయ్యడానికి ready text."""
    ch = ch or {}
    title = perfect_title(key, ch)
    link = "https://t.me/%s" % ch.get("username", "")
    return (
        "💍 *%s*\n"
        "TS + AP తెలుగు మ్యాట్రిమోని — రోజూ కొత్త సంబంధాలు\n\n"
        "✅ 3 requests FREE\n"
        "✅ ఫోటో గోప్యం (privacy guaranteed)\n"
        "✅ ఫోన్ నంబర్ — రెండు వైపులు ఒప్పుకున్న తర్వాతే\n"
        "✅ వేద గుణమేళనం స్కోరు ప్రతి profile కి\n\n"
        "👉 Join: %s\n"
        "🌐 Register FREE: %s\n\n"
        "#ManaVivaha #TeluguMatrimony #PelliChoopulu"
        % (title, link, SITE)
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
    u = str(ch.get("username", ""))
    import re
    if not re.fullmatch(r"[A-Za-z0-9_]{5,32}", u):
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
