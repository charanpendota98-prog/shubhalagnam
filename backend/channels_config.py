"""
మన వివాహ (TSAP Matrimony) — MASTER CHANNEL REGISTRY + AUTO-ROUTER
====================================================================
One profile post → automatic ga annni relevant channels lo ki vellali.
Idi single source of truth: backend, bot, website anni ikkada nunchi chaduvutayi.

LEVELS (SMART STRUCTURE — 51 channels, 83 కాదు):
  L0 OFFICIAL   — 1  (brand hub, top-3/day, success stories)
  L1 REGION     — 5  (TS Bride/Groom, AP Bride/Groom, NRI/Other-States)
  L2 RELIGION   — 11 (Muslim ×4 [TS/AP × bride/groom], Christian ×4, Hindu hub, Other, Inter-Faith)
  L3 CASTE      — 27 (Hindu CASTE CLUSTERS — pedda communities ki bride/groom separate,
                      chinna sub-castes (ex: Viswabrahmana 5) okate channel lo kalipamu)
  L4 SPECIAL    — 8  (2nd marriage, differently-abled, govt job, IT, doctors+teachers, success, fraud, bureau)
  ---------------------------------------------------------------
  TOTAL         — 52 channels (wave 1 = 20, wave 2 = 16, wave 3 = 15)

IMPORTANT RULES:
  * Username okkate Telegram lo unique — conflict ayithe FALLBACK list chudu.
  * LIVE channels (ts_bride, ts_groom) already create అయ్యాయి — vaatini never break.
  * Max 5 channels per profile auto-post (spam taggadaniki) — priority order lo.
"""

from typing import Dict, List

BOT_USERNAME = "@telugumatrimony1_bot"
BRAND = "మన వివాహ"
LEGAL_BRAND = "Manavivaha"
SITE = "https://manavivaha.in"

# ---------------------------------------------------------------------------
# CHANNEL REGISTRY
# ---------------------------------------------------------------------------
# key: {
#   "name": Telugu+English display name,
#   "username": Telegram username (without @),
#   "fallbacks": [alternate usernames if taken],
#   "desc": channel description to paste in Telegram,
#   "hashtags": always-on hashtags for that channel,
#   "wave": launch wave,
#   "live": True if already created + bot admin,
# }
# ---------------------------------------------------------------------------

CHANNELS = {
    # ===================== LEVEL 0 — OFFICIAL =====================
    "official": {
        "tier": "L0_OFFICIAL",
        "name": "📢 మన వివాహ Official — TS-AP",
        "username": "TSAP_MATRIMONY",
        "fallbacks": ["manavivaha", "manavivaha_official", "manavivaha_hub"],
        "desc": ("మన వివాహ — TS & AP Telugu Matrimony 🇮🇳\n"
                 "₹99 సంబంధం • మొదటి 3 FREE\n"
                 "Daily Top-3 matches, success stories, మోసం జాగ్రత్త alerts.\n"
                 "Website: manavivaha.in • Bot: @telugumatrimony1_bot"),
        "hashtags": ["#ManaVivaha", "#TSAPMatrimony", "#99keSambandham"],
        "wave": 1,
        "live": True,
        "route": "digest",  # only top-3/day, not every profile
    },

    # ===================== LEVEL 1 — REGION =====================
    "ts_bride": {
        "tier": "L1_REGION",
        "name": "👰 TS Brides | తెలంగాణ వధువులు",
        "username": "TSBRIDE",
        "fallbacks": ["manavivaha_ts_bride", "tsbrides"],
        "desc": ("Telangana ammayilu — అన్నీ kulasthulu.\n"
                 "Daily 10+ కొత్త profiles • Photo verified • ID search.\n"
                 "Register FREE: manavivaha.in/register • Bot: @telugumatrimony1_bot"),
        "hashtags": ["#TSBride", "#Telangana", "#Ammaayi"],
        "wave": 1,
        "live": True,
        "route": {"state": "TS", "gender": "Bride"},
    },
    "ts_groom": {
        "tier": "L1_REGION",
        "name": "🤵 TS Grooms | తెలంగాణ వరులు",
        "username": "TSGROOM1",
        "fallbacks": ["manavivaha_ts_groom", "tsgroom"],
        "desc": ("Telangana abbayilu — అన్నీ kulasthulu.\n"
                 "Daily 10+ కొత్త profiles • Photo verified • ID search.\n"
                 "Register FREE: manavivaha.in/register • Bot: @telugumatrimony1_bot"),
        "hashtags": ["#TSGroom", "#Telangana", "#Abbaayi"],
        "wave": 1,
        "live": True,
        "route": {"state": "TS", "gender": "Groom"},
    },
    "ap_bride": {
        "tier": "L1_REGION",
        "name": "👰 AP Brides | ఆంధ్రా వధువులు",
        "username": "APBRIDE",
        "fallbacks": ["manavivaha_ap_bride", "apbride1", "manavivaha_apbride"],
        "desc": ("Andhra Pradesh ammayilu — 26 districts cover.\n"
                 "Daily కొత్త profiles • Register FREE: manavivaha.in/register"),
        "hashtags": ["#APBride", "#AndhraPradesh"],
        "wave": 1,
        "live": True,
        "route": {"state": "AP", "gender": "Bride"},
    },
    "ap_groom": {
        "tier": "L1_REGION",
        "name": "🤵 AP Grooms | ఆంధ్రా వరులు",
        "username": "APGROOM1",
        "fallbacks": ["manavivaha_ap_groom", "apgroom", "manavivaha_apgroom"],
        "desc": ("Andhra Pradesh abbayilu — 26 districts cover.\n"
                 "Daily కొత్త profiles • Register FREE: manavivaha.in/register"),
        "hashtags": ["#APGroom", "#AndhraPradesh"],
        "wave": 1,
        "live": True,
        "route": {"state": "AP", "gender": "Groom"},
    },
    "nri_global": {
        "tier": "L1_REGION",
        "name": "🌍 NRI & Other States | విదేశాల తెలుగు",
        "username": "manavivaha_nri",
        "fallbacks": ["manavivaha_global", "manavivaha_usa"],
        "desc": ("USA • UK • Canada • Australia • Gulf • Singapore — Telugu NRI matches.\n"
                 "Visa/PR/job status mention చెయ్యండి. manavivaha.in • @telugumatrimony1_bot"),
        "hashtags": ["#NRI", "#TeluguAbroad", "#GlobalTelugu"],
        "wave": 2,
        "live": True,
        "route": {"state": "Other"},
    },

    # ===================== LEVEL 2 — RELIGION =====================
    "hindu": {
        "tier": "L2_RELIGION",
        "name": "🕉️ Hindu Matrimony Hub | హిందూ వివాహాలు",
        "username": "manavivaha_hindu",
        "fallbacks": ["manavivaha_hindus", "tsap_hindu"],
        "desc": ("Hindu Telugu matches — అన్నీ kulasthulu, అన్నీ districts.\n"
                 "Caste-wise channels కూడా ఉంది — profile లో caste filter use చెయ్యండి.\n"
                 "manavivaha.in/register • Bot: @telugumatrimony1_bot"),
        "hashtags": ["#Hindu", "#TeluguMatrimony"],
        "wave": 1,
        "live": True,
        "route": {"religion": "Hindu"},
    },
    # ---- MUSLIM (4 — TS/AP × bride/groom; Sheikh/Syed/Pathan antha same channel) ----
    "muslim_ts_bride": {
        "tier": "L2_RELIGION", "sub": "muslim", "state": "TS", "gender": "Bride",
        "religion": "Muslim", "name": "", "desc": "",
        "username": "manavivaha_muslim_ts_bride",
        "fallbacks": ["tsmuslimbride", "mv_muslim_ts_brd", "manavivaha_muslim_ts_brd"],
        "hashtags": ["#Muslim", "#Bride", "#Telangana", "#Nikah"],
        "wave": 1, "live": True, "route": {"religion": "Muslim", "state": "TS", "gender": "Bride"},
    },
    "muslim_ts_groom": {
        "tier": "L2_RELIGION", "sub": "muslim", "state": "TS", "gender": "Groom",
        "religion": "Muslim", "name": "", "desc": "",
        "username": "manavivaha_muslim_ts_groom",
        "fallbacks": ["tsmuslimgroom", "mv_muslim_ts_grm", "manavivaha_muslim_ts_grm"],
        "hashtags": ["#Muslim", "#Groom", "#Telangana", "#Nikah"],
        "wave": 1, "live": True, "route": {"religion": "Muslim", "state": "TS", "gender": "Groom"},
    },
    "muslim_ap_bride": {
        "tier": "L2_RELIGION", "sub": "muslim", "state": "AP", "gender": "Bride",
        "religion": "Muslim", "name": "", "desc": "",
        "username": "manavivaha_muslim_ap_bride",
        "fallbacks": ["apmuslimbride", "mv_muslim_ap_brd", "manavivaha_muslim_ap_brd"],
        "hashtags": ["#Muslim", "#Bride", "#AndhraPradesh", "#Nikah"],
        "wave": 1, "live": True, "route": {"religion": "Muslim", "state": "AP", "gender": "Bride"},
    },
    "muslim_ap_groom": {
        "tier": "L2_RELIGION", "sub": "muslim", "state": "AP", "gender": "Groom",
        "religion": "Muslim", "name": "", "desc": "",
        "username": "manavivaha_muslim_ap_groom",
        "fallbacks": ["apmuslimgroom", "mv_muslim_ap_grm", "manavivaha_muslim_ap_grm"],
        "hashtags": ["#Muslim", "#Groom", "#AndhraPradesh", "#Nikah"],
        "wave": 1, "live": True, "route": {"religion": "Muslim", "state": "AP", "gender": "Groom"},
    },
    # ---- CHRISTIAN (4 — TS/AP × bride/groom; Catholic/CSI/Baptist antha same channel) ----
    "christian_ts_bride": {
        "tier": "L2_RELIGION", "sub": "christian", "state": "TS", "gender": "Bride",
        "religion": "Christian", "name": "", "desc": "",
        "username": "manavivaha_christian_ts_bride",
        "fallbacks": ["tschristianbride", "mv_christ_ts_brd", "manavivaha_christ_ts_brd"],
        "hashtags": ["#Christian", "#Bride", "#Telangana", "#Wedding"],
        "wave": 1, "live": True, "route": {"religion": "Christian", "state": "TS", "gender": "Bride"},
    },
    "christian_ts_groom": {
        "tier": "L2_RELIGION", "sub": "christian", "state": "TS", "gender": "Groom",
        "religion": "Christian", "name": "", "desc": "",
        "username": "manavivaha_christian_ts_groom",
        "fallbacks": ["tschristiangroom", "mv_christ_ts_grm", "manavivaha_christ_ts_grm"],
        "hashtags": ["#Christian", "#Groom", "#Telangana", "#Wedding"],
        "wave": 1, "live": True, "route": {"religion": "Christian", "state": "TS", "gender": "Groom"},
    },
    "christian_ap_bride": {
        "tier": "L2_RELIGION", "sub": "christian", "state": "AP", "gender": "Bride",
        "religion": "Christian", "name": "", "desc": "",
        "username": "manavivaha_christian_ap_bride",
        "fallbacks": ["apchristianbride", "mv_christ_ap_brd", "manavivaha_christ_ap_brd"],
        "hashtags": ["#Christian", "#Bride", "#AndhraPradesh", "#Wedding"],
        "wave": 1, "live": True, "route": {"religion": "Christian", "state": "AP", "gender": "Bride"},
    },
    "christian_ap_groom": {
        "tier": "L2_RELIGION", "sub": "christian", "state": "AP", "gender": "Groom",
        "religion": "Christian", "name": "", "desc": "",
        "username": "manavivaha_christian_ap_groom",
        "fallbacks": ["apchristiangroom", "mv_christ_ap_grm", "manavivaha_christ_ap_grm"],
        "hashtags": ["#Christian", "#Groom", "#AndhraPradesh", "#Wedding"],
        "wave": 1, "live": True, "route": {"religion": "Christian", "state": "AP", "gender": "Groom"},
    },
    "other_religion": {
        "tier": "L2_RELIGION",
        "name": "🕊️ Other Religions | ఇతర మతాలు",
        "username": "manavivaha_other_religions",
        "fallbacks": ["manavivaha_others", "manavivaha_minority"],
        "desc": ("Sikh • Jain • Buddhist • Parsi • Jewish • No-caste/No-religion — Telugu matches.\n"
                 "Respectful, private, verified. manavivaha.in/register"),
        "hashtags": ["#OtherReligions", "#Respect"],
        "wave": 2, "live": True, "route": {"religion": "Other"},
    },
    "interfaith": {
        "tier": "L2_RELIGION",
        "name": "💞 Inter-Caste & Inter-Faith | ప్రేమ వివాహం",
        "username": "manavivaha_interfaith",
        "fallbacks": ["manavivaha_intercaste", "manavivaha_mixedmarriage"],
        "desc": ("Inter-caste • Inter-religion • Love & Register marriage.\n"
                 "No-caste filter • Full privacy • Couple corner.\n"
                 "manavivaha.in/register • Height secret maintain చేస్తాం 🤝"),
        "hashtags": ["#Intercaste", "#LoveMarriage", "#RegisterMarriage"],
        "wave": 3, "live": True, "route": {"flag": "interfaith"},
    },

    # ===================== LEVEL 3 — HINDU CASTE CLUSTERS (smart groups) =====================
    # 🔑 IDEA: Telugu lo konni castes **okka kula group** laage untayi (ex: Viswabrahmana = 5 sub-castes).
    #         Anduke chinna sub-castes ni okate channel lo kalipamu — create cheyyadam suluvu,
    #         audience kooda oke chota vastundi. Pedda communities ki bride/groom **separate** channels.

    # ===================== LEVEL 4 — SPECIAL (7) =====================
    "second_marriage": {"tier": "L4_SPECIAL", "name": "💔 2nd Marriage | Divorcee & Widow",
                        "username": "manavivaha_second", "fallbacks": ["tsap_second", "manavivaha_remarriage"],
                        "desc": ("Divorcee • Widow • Widower — 2nd innings కి respect తో platform.\n"
                                 "100% privacy • Judge చెయ్యరు • Serious matches మాత్రమే.\n"
                                 "manavivaha.in/register"),
                        "hashtags": ["#SecondMarriage", "#Remarriage", "#Respect"], "wave": 2, "live": True,
                        "route": {"flag": "second_marriage"}},
    "differently_abled": {"tier": "L4_SPECIAL", "name": "♿ Differently Abled Matrimony",
                          "username": "manavivaha_able",
                          "fallbacks": ["tsap_handicapped", "manavivaha_differentlyabled"],
                          "desc": ("Differently abled brides & grooms — special care, special respect.\n"
                                   "Family support + verified profiles only. manavivaha.in/register"),
                          "hashtags": ["#DifferentlyAbled", "#SpecialCare"], "wave": 3, "live": True,
                          "route": {"flag": "differently_abled"}},
    "govt_jobs": {"tier": "L4_SPECIAL", "name": "👮 Govt Job Matches | ప్రభుత్వ ఉద్యోగం",
                  "username": "manavivaha_govt", "fallbacks": ["tsap_govt", "manavivaha_govtjobs"],
                  "desc": "Teacher • Police • Bank • Railway • Group-1/2 • SI • Constable • Nurse — govt job profiles.",
                  "hashtags": ["#GovtJob", "#GovtTeacher"], "wave": 3, "live": True,
                  "route": {"flag": "govt_job"}},
    "software_it": {"tier": "L4_SPECIAL", "name": "💻 Software / IT Matches",
                    "username": "manavivaha_software", "fallbacks": ["tsap_software", "manavivaha_it"],
                    "desc": "Software • IT • MNC • Product companies — HYD, BLR, PUNE, USA.",
                    "hashtags": ["#Software", "#IT", "#Hyderabad"], "wave": 3, "live": True,
                    "route": {"flag": "software"}},
    "doctors_teachers": {"tier": "L4_SPECIAL", "name": "🩺 Doctors & Teachers Matches",
                         "username": "manavivaha_professionals",
                         "fallbacks": ["manavivaha_doctors", "tsap_doctors", "manavivaha_teachers"],
                         "desc": ("MBBS • MD • MS • BDS • Nursing • Pharma • School Teacher • Lecturer • Professor\n"
                                  "Medical + education professionals — ఒకటే chota. manavivaha.in/register"),
                         "hashtags": ["#Doctors", "#Teachers", "#Healthcare"], "wave": 3, "live": True,
                         "route": {"flag": "doctor_teacher"}},
    "success_stories": {"tier": "L4_SPECIAL", "name": "🎉 Success Stories & Reviews",
                        "username": "manavivaha_success", "fallbacks": ["tsap_success"],
                        "desc": ("మన వివాహ తో పెళ్లి అయిన couples stories + photos (permission తో).\n"
                                 "Trust = Growth. Me story పంపండి: manavivaha.in/success"),
                        "hashtags": ["#SuccessStory", "#ManaVivaha"], "wave": 3, "live": True,
                        "route": "manual"},
    "fraud_alerts": {"tier": "L4_SPECIAL", "name": "⚠️ Fraud Alert & Safety",
                     "username": "manavivaha_alerts", "fallbacks": ["tsap_alerts"],
                     "desc": ("మోసం జాగ్రత్త! Fake profiles, advance money scams, photo theft alerts.\n"
                              "Report: manavivaha.in/report • 24h లో action. Family safety first."),
                     "hashtags": ["#FraudAlert", "#StaySafe"], "wave": 3, "live": True,
                     "route": "manual"},
    "bureau_network": {"tier": "L4_SPECIAL", "name": "🤝 Bureau & Broker Network (B2B)",
                       "username": "manavivaha_bureau", "fallbacks": ["tsap_bureau", "manavivaha_brokers"],
                       "desc": ("Marriage bureaus • Brokers • Influencers — referral ₹50/profile.\n"
                                "Bulk upload • Dashboard • Leaderboard. manavivaha.in/bureau"),
                       "hashtags": ["#Bureau", "#Referral50"], "wave": 3, "live": True,
                       "route": "manual"},
}

# >>> LIVE_KEYS_EXTRA (setup_channels.py --mark-live idi auto-manage chestundi)
LIVE_KEYS_EXTRA = [
]
# <<< LIVE_KEYS_EXTRA

# ---------------------------------------------------------------------------
# ⭐ CASTE CLUSTERS — "caste prakaram" smart ga (bride/groom + grouped sub-castes)
# ---------------------------------------------------------------------------
# members       : ee channel lo cover ayye sub-castes (pinned post + description lo kanipisthundi)
# split         : True ayithe bride/groom separate channels, False ayithe single (both + hashtag filter)
# category      : OC / BC / SC / ST (coverage report ki)
CASTE_CLUSTERS: List[Dict] = [
    {"key": "reddy", "en": "Reddy", "te": "రెడ్డి", "category": "OC", "split": True, "wave": 1,
     "members": ["Reddy", "Pakanati Reddy", "Motati Reddy", "Gudati Reddy", "Deshathi Reddy"]},
    {"key": "kamma", "en": "Kamma", "te": "కమ్మ", "category": "OC", "split": True, "wave": 1,
     "members": ["Kamma", "Chowdary", "Choudary"]},
    {"key": "kapu", "en": "Kapu • Balija • Telaga", "te": "కాపు • బలిజ • తెలగ", "category": "OC", "split": True, "wave": 1,
     "members": ["Kapu", "Ontari", "Turupu Kapu", "Palli Kapu", "Balija", "Gajula Balija", "Setti Balija",
                 "Surya Balija", "Telaga", "Telagu"]},
    {"key": "velama", "en": "Velama", "te": "వెలమ", "category": "OC", "split": True, "wave": 2,
     "members": ["Velama", "Padma Velama", "Koppula Velama"]},
    {"key": "brahmin", "en": "Brahmin", "te": "బ్రాహ్మణ", "category": "OC", "split": True, "wave": 2,
     "members": ["Vaidiki Brahmin", "Niyogi Brahmin", "Sistla", "Dravida Brahmin", "Iyer"]},
    {"key": "vysya", "en": "Arya Vysya • Komati", "te": "వైశ్య • కోమటి", "category": "OC", "split": True, "wave": 2,
     "members": ["Arya Vysya", "Komati", "Komti", "Vaishya", "Sadhu Chetty"]},
    {"key": "yadava_goud", "en": "Yadava • Goud • Golla", "te": "యాదవ • గౌడ • గొల్ల", "category": "BC", "split": True,
     "wave": 2, "members": ["Yadav", "Yadava", "Golla", "Kuruma", "Kuruba", "Goud", "Gouda", "Ediga",
                            "Gamalla", "Idiga", "Settibalija"]},
    {"key": "mala", "en": "Mala", "te": "మాల", "category": "SC", "split": True, "wave": 2,
     "members": ["Mala", "Mala Ayawaru", "Mala Dasari"]},
    {"key": "madiga", "en": "Madiga", "te": "మాదిగ", "category": "SC", "split": True, "wave": 2,
     "members": ["Madiga", "Madiga Dasu", "Mashteen", "Madiga Dasari"]},
    {"key": "viswabrahmana", "en": "Viswabrahmana (Viswakarma)", "te": "విశ్వబ్రాహ్మణ", "category": "BC",
     "split": False, "wave": 2,
     "members": ["Viswakarma", "Viswabrahmin", "Viswabrahmana", "Kamsali", "Kammari", "Kanchari", "Vadla",
                 "Ausula", "Silpi", "Shilpi", "Vadrangi", "Achari"]},
    {"key": "munnuru_kapu", "en": "Munnuru Kapu", "te": "మున్నూరు కాపు", "category": "BC", "split": False,
     "wave": 2, "members": ["Munnuru Kapu", "Munnuru"]},
    {"key": "raju_kshatriya", "en": "Raju • Kshatriya", "te": "రాజు • క్షత్రియ", "category": "OC", "split": False,
     "wave": 3, "members": ["Raju", "Rajulu", "Kshatriya", "Vanniyar"]},
    {"key": "padmashali_weavers", "en": "Padmashali • Devanga (Weavers)", "te": "పద్మశాలి • దేవాంగ",
     "category": "BC", "split": False, "wave": 3,
     "members": ["Padmashali", "Padmasali", "Sali", "Pattusali", "Thogata", "Devanga", "Devanga Chettiar"]},
    {"key": "mudiraj", "en": "Mudiraj • Tenugollu", "te": "ముదిరాజ • తెనుగొల్ల", "category": "BC", "split": False,
     "wave": 3, "members": ["Mudiraj", "Mudiraju", "Mutrasi", "Tenugollu"]},
    {"key": "lambada_banjara", "en": "Lambada • Banjara (ST)", "te": "లంబాడ • బంజార", "category": "ST",
     "split": False, "wave": 3, "members": ["Lambada", "Lambadi", "Banjara", "Lambani", "Sugali"]},
    {"key": "others_bc", "en": "Other BC Communities", "te": "ఇతర BC కులాలు", "category": "BC", "split": False,
     "wave": 3, "members": ["Kummara", "Kulala", "Salivahana", "Gandla", "Telikula", "Uppara", "Sagara",
                            "Vaddera", "Odde", "Rajaka", "Chakali", "Mangali", "Nayi-Brahmin", "Boya", "Valmiki",
                            "Srisayana", "Segidi", "Gavara", "Bestha", "Gangaputra", "Jalari", "Vadabalija",
                            "Jangam", "Jogi", "Dasari", "Bhatraju", "Kalinga"]},
    {"key": "others_sc", "en": "Other SC Communities", "te": "ఇతర SC కులాలు", "category": "SC", "split": False,
     "wave": 3, "members": ["Adi Andhra", "Adi Dravida", "Arundhatiya", "Relli", "Arwa Mala", "Samban", "Dandasi"]},
    {"key": "others_st", "en": "Other ST Communities", "te": "ఇతర ST కులాలు", "category": "ST", "split": False,
     "wave": 3, "members": ["Koya", "Koitur", "Gond", "Rajgond", "Naikpod", "Chenchu", "Bagata", "Konda Reddi",
                            "Savara", "Andh"]},
]

SPLIT_MAP: Dict[str, Dict[str, str]] = {}      # cluster key -> {"Bride": key, "Groom": key}
CASTE_TO_CLUSTER: Dict[str, str] = {}          # alias/caste → cluster key

for _cl in CASTE_CLUSTERS:
    _ck, _en, _te = _cl["key"], _cl["en"], _cl["te"]
    _slug = _ck
    if _cl["split"]:
        _pair = {}
        for _gender, _suffix, _fb in (("Bride", "bride", "brd"), ("Groom", "groom", "grm")):
            _key = "c_%s_%s" % (_ck, _suffix)
            CHANNELS[_key] = {
                "tier": "L3_CASTE", "cluster": _ck, "cluster_en": _en, "cluster_te": _te,
                "category": _cl.get("category", ""), "members": list(_cl["members"]),
                "name": "", "desc": "",
                "username": ("manavivaha_%s_%s" % (_slug, _suffix))[:32],
                "fallbacks": ["tsap_%s_%s" % (_slug, _suffix), "mv_%s_%s" % (_slug, _fb)],
                "hashtags": ["#%s" % _slug.title().replace("_", ""), "#%s" % _suffix.title(), "#TS", "#AP"],
                "wave": _cl["wave"], "live": True,
                "route": {"caste": _en, "gender": _gender, "cluster": _ck},
            }
            _pair[_gender] = _key
        SPLIT_MAP[_ck] = _pair
    else:
        _key = "c_%s" % _ck
        CHANNELS[_key] = {
            "tier": "L3_CASTE", "cluster": _ck, "cluster_en": _en, "cluster_te": _te,
            "category": _cl.get("category", ""), "members": list(_cl["members"]),
            "name": "", "desc": "",
            "username": ("manavivaha_%s" % _slug)[:32],
            "fallbacks": ["tsap_%s" % _slug, "manavivaha_%s_community" % _slug],
            "hashtags": ["#%s" % _slug.title().replace("_", ""), "#Bride", "#Groom", "#TS", "#AP"],
            "wave": _cl["wave"], "live": True,
            "route": {"caste": _en, "cluster": _ck},
        }
        SPLIT_MAP[_ck] = {"Bride": _key, "Groom": _key}

# alias → cluster (sub-caste names antha okate channel ki)
for _cl in CASTE_CLUSTERS:
    CASTE_TO_CLUSTER[_cl["key"]] = _cl["key"]
    for _m in _cl["members"]:
        CASTE_TO_CLUSTER[_m.strip().lower()] = _cl["key"]

# ---------------------------------------------------------------------------
# PERFECT CONTENT — title/description anni channel ki (Telugu-first, search-optimised)
# ---------------------------------------------------------------------------
from channel_content import perfect_title as _pt, perfect_description as _pd  # noqa: E402

for _k, _ch in CHANNELS.items():
    _ch["name"] = _pt(_k, _ch)
    _ch["desc"] = _pd(_k, _ch)
    if _k in LIVE_KEYS_EXTRA:          # setup_channels.py --mark-live tho verify ayyavi
        _ch["live"] = True

# ---------------------------------------------------------------------------
# CASTE ALIASES — user free-text ni channel key ki map chesthundi
# ---------------------------------------------------------------------------
CASTE_ALIASES = {
    # ---- OC ----
    "reddy": "reddy", "reddi": "reddy", "pakanati": "reddy", "motati": "reddy",
    "gudati": "reddy", "deshathi": "reddy", "pakanati reddy": "reddy", "reddy(golla)": "reddy",
    "kamma": "kamma", "kammas": "kamma", "chowdary": "kamma", "choudary": "kamma", "kamma chowdary": "kamma",
    "kapu": "kapu", "ontari": "kapu", "turupu kapu": "kapu", "palli kapu": "kapu", "munnuru": "munnuru_kapu",
    "munnuru kapu": "munnuru_kapu", "munnurukapu": "munnuru_kapu",
    "balija": "kapu", "gajula balija": "kapu", "surya balija": "kapu", "setti balija": "kapu",
    "sadhu balija": "kapu", "telaga": "kapu", "telagu": "kapu",
    "velama": "velama", "vellama": "velama", "padma velama": "velama", "koppula velama": "velama",
    "koppula": "velama", "velama(kamma)": "velama",
    "vysya": "vysya", "arya vysya": "vysya", "aryavysya": "vysya", "komati": "vysya", "komti": "vysya",
    "vaishya": "vysya", "vaishya(arya)": "vysya", "sadhu chetty": "vysya",
    "brahmin": "brahmin", "telugu brahmin": "brahmin", "vaidiki": "brahmin", "vaidiki brahmin": "brahmin",
    "niyogi": "brahmin", "niyogi brahmin": "brahmin", "sistla": "brahmin", "dravida brahmin": "brahmin",
    "iyer": "brahmin", "iyengar": "brahmin", "smartha": "brahmin", "srivaishnava": "brahmin",
    "raju": "raju_kshatriya", "rajulu": "raju_kshatriya", "kshatriya": "raju_kshatriya",
    "vanniyar": "raju_kshatriya", "raju(kshatriya)": "raju_kshatriya",
    # ---- BC ----
    "goud": "yadava_goud", "gouda": "yadava_goud", "ediga": "yadava_goud", "gamalla": "yadava_goud",
    "idiga": "yadava_goud", "settibalija": "yadava_goud", "goundla": "yadava_goud", "kalalee": "yadava_goud",
    "yadav": "yadava_goud", "yadava": "yadava_goud", "golla": "yadava_goud", "golla(yadava)": "yadava_goud",
    "kuruma": "yadava_goud", "kuruba": "yadava_goud", "kuruba(golla)": "yadava_goud", "kuruva": "yadava_goud",
    "gorrela": "yadava_goud",
    "viswakarma": "viswabrahmana", "viswabrahmin": "viswabrahmana", "viswabrahmana": "viswabrahmana",
    "kamsali": "viswabrahmana", "kammari": "viswabrahmana", "kanchari": "viswabrahmana",
    "vadla": "viswabrahmana", "ausula": "viswabrahmana", "silpi": "viswabrahmana", "shilpi": "viswabrahmana",
    "vadrangi": "viswabrahmana", "achari": "viswabrahmana", "vishwakarma": "viswabrahmana",
    "padmashali": "padmashali_weavers", "padmasali": "padmashali_weavers", "sali": "padmashali_weavers",
    "pattusali": "padmashali_weavers", "thogata": "padmashali_weavers", "thogata sali": "padmashali_weavers",
    "devanga": "padmashali_weavers", "devanga chettiar": "padmashali_weavers",
    "mudiraj": "mudiraj", "mudiraju": "mudiraj", "mutrasi": "mudiraj", "tenugollu": "mudiraj",
    "kummara": "others_bc", "kulala": "others_bc", "salivahana": "others_bc", "kumbhara": "others_bc",
    "gandla": "others_bc", "telikula": "others_bc", "devathilakula": "others_bc",
    "uppara": "others_bc", "sagara": "others_bc", "sagari": "others_bc", "uppari": "others_bc",
    "vaddera": "others_bc", "vaddelu": "others_bc", "odde": "others_bc", "oddilu": "others_bc",
    "vadde": "others_bc", "rajaka": "others_bc", "chakali": "others_bc", "vannar": "others_bc",
    "agnikulakshatriya": "others_bc", "mangali": "others_bc", "mangala": "others_bc", "nayi": "others_bc",
    "nai": "others_bc", "nayi-brahmin": "others_bc", "bhajanthri": "others_bc",
    "boya": "others_bc", "valmiki": "others_bc", "boya bedar": "others_bc", "nishadi": "others_bc",
    "yellapu": "others_bc", "kirataka": "others_bc",
    "srisayana": "others_bc", "segidi": "others_bc", "jangam": "others_bc", "jangalu": "others_bc",
    "beda jangam": "others_bc", "jogi": "others_bc", "jogula": "others_bc", "dasari": "others_bc",
    "bhatraju": "others_bc", "bhatrajulu": "others_bc", "gavara": "others_bc",
    "kalinga": "others_bc", "kinthala kalinga": "others_bc", "buragam kalinga": "others_bc",
    "bestha": "others_bc", "gangaputra": "others_bc", "gangavar": "others_bc", "jalari": "others_bc",
    "vadabalija": "others_bc",
    # ---- SC ----
    "mala": "mala", "sc-mala": "mala", "sc mala": "mala", "mala ayawaru": "mala", "mala dasari": "mala",
    "madiga": "madiga", "sc-madiga": "madiga", "sc madiga": "madiga", "madiga dasu": "madiga",
    "mashteen": "madiga", "madiga dasari": "madiga",
    "adi andhra": "others_sc", "adi-andhra": "others_sc", "adi dravida": "others_sc",
    "arundhatiya": "others_sc", "sc-others": "others_sc", "sc others": "others_sc",
    "reli": "others_sc", "relli": "others_sc", "arwa mala": "others_sc", "samban": "others_sc",
    "dandasi": "others_sc",
    # ---- ST ----
    "lambada": "lambada_banjara", "lambadi": "lambada_banjara", "st-lambadi": "lambada_banjara",
    "st lambadi": "lambada_banjara", "banjara": "lambada_banjara", "lambani": "lambada_banjara",
    "sugali": "lambada_banjara",
    "koya": "others_st", "koitur": "others_st", "gond": "others_st", "rajgond": "others_st",
    "naikpod": "others_st", "st-others": "others_st", "st others": "others_st", "chenchu": "others_st",
    "andh": "others_st", "bagata": "others_st", "konda reddi": "others_st", "savara": "others_st",
    # ---- Open / no caste ----
    "open": None, "other": None, "others": None, "oc": None, "no caste": None, "caste no bar": None,
}

RELIGION_ALIASES = {
    "hindu": "Hindu", "hindhu": "Hindu",
    "muslim": "Muslim", "muslims": "Muslim", "musalman": "Muslim", "islam": "Muslim",
    "sheikh": "Muslim", "shaik": "Muslim", "syed": "Muslim", "pathan": "Muslim",
    "khan": "Muslim", "momin": "Muslim", "qureshi": "Muslim", "labbai": "Muslim",
    "dudekula": "Muslim", "pinjari": "Muslim", "noorbash": "Muslim", "asraf": "Muslim",
    "christian": "Christian", "christians": "Christian", "catholic": "Christian",
    "roman catholic": "Christian", "csi": "Christian", "baptist": "Christian",
    "pentecost": "Christian", "born again": "Christian", "methodist": "Christian",
    "salvation army": "Christian", "lutheran": "Christian",
    "sikh": "Other", "jain": "Other", "buddhist": "Other", "parsi": "Other",
    "jewish": "Other", "atheist": "Other", "no religion": "Other",
}

STATE_ALIASES = {
    "ts": "TS", "telangana": "TS", "తెలంగాణ": "TS", "telengana": "TS",
    "ap": "AP", "andhra": "AP", "andhra pradesh": "AP", "ఆంధ్ర": "AP",
    "ఆంధ్రప్రదేశ్": "AP", "ap-2": "AP",
    "usa": "Other", "uk": "Other", "gulf": "Other", "dubai": "Other",
    "canada": "Other", "australia": "Other", "singapore": "Other", "nri": "Other",
    "other": "Other", "others": "Other", "bangalore": "Other", "bengaluru": "Other",
    "chennai": "Other", "pune": "Other", "mumbai": "Other",
}

BLOCK_SOFTWARE = ("software", "it ", " it", "developer", "engineer", "programmer", "devops",
                  "data scientist", "testing", "qa", "product manager", "cloud")
BLOCK_GOVT = ("govt", "government", "teacher", "police", "bank", "railway", "group", "si ",
              "constable", "nurse", "postal", "defence", "army", "navy", "air force", "psu", "sachivalayam")
BLOCK_DOCTOR = ("doctor", "mbbs", "md ", "ms ", "surgeon", "dental", "bds", "nursing", "pharmacy",
                "physio", "veterinary", "bams", "bhms")
BLOCK_TEACHER = ("teacher", "lecturer", "professor", "principal", "anganwadi", "guruji", "trainer")


# ---------------------------------------------------------------------------
# HELPERS
# ---------------------------------------------------------------------------
def get_channel(key: str) -> dict:
    return CHANNELS.get(key, {})


def all_channels(tier: str | None = None) -> list:
    """Returns list of (key, channel_dict) — tier filter optional."""
    out = []
    for key, ch in CHANNELS.items():
        if tier and ch.get("tier") != tier:
            continue
        out.append({"key": key, **ch})
    return out


def channels_by_tier() -> dict:
    tiers = {}
    for key, ch in CHANNELS.items():
        tiers.setdefault(ch.get("tier", "OTHER"), []).append({"key": key, **ch})
    return tiers


def live_channels() -> list:
    return [{"key": k, **v} for k, v in CHANNELS.items() if v.get("live")]


def pending_channels() -> list:
    return [{"key": k, **v} for k, v in CHANNELS.items() if not v.get("live")]


def channel_chat_id(key: str, only_live: bool = True) -> str | None:
    """Bot post చెయ్యడానికి chat id/username. only_live=True అయితే created channels మాత్రమే."""
    ch = CHANNELS.get(key)
    if not ch:
        return None
    if only_live and not ch.get("live"):
        return None
    return "@" + ch["username"]


def post_targets(profile: dict, only_live: bool = True) -> list:
    """
    Router + live filter → bot e channels lo actually post cheyyali.
    Create kaani channels ni skip chestundi (429/400 error raakunda) + pending list istundi.
    """
    r = route_profile(profile)
    ready, pending = [], []
    for key in r["keys"]:
        if channel_chat_id(key, only_live=True):
            ready.append("@" + CHANNELS[key]["username"])
        else:
            pending.append(key)
    return {"ready": ready, "pending": pending, "keys": r["keys"],
            "hashtags": r["hashtags"], "reasons": r["reasons"], "notes": r["notes"]}


# ---------------------------------------------------------------------------
# SETUP PLAN — "e channels create cheyyali, e order lo" (setup_channels.py idi use chestundi)
# ---------------------------------------------------------------------------
TIER_PRIORITY = {"L0_OFFICIAL": 0, "L1_REGION": 1, "L3_CASTE": 2, "L2_RELIGION": 3, "L4_SPECIAL": 4}


def setup_plan(wave: int | None = None) -> list:
    """Wave → tier → caste order లో channels (create చెయ్యడానికి)."""
    rows = []
    for key, ch in CHANNELS.items():
        if wave and ch.get("wave") != wave:
            continue
        rows.append({"key": key, "tier": ch.get("tier"), "wave": ch.get("wave"),
                     "name": ch.get("name"), "username": ch.get("username"),
                     "fallbacks": ch.get("fallbacks", []), "live": bool(ch.get("live")),
                     "hashtags": ch.get("hashtags", []), "desc": ch.get("desc")})
    rows.sort(key=lambda r: (r["wave"], TIER_PRIORITY.get(r["tier"], 9), r["key"]))
    return rows


def caste_split_report() -> dict:
    """Cluster coverage report — enni communities కి separate channels, enni sub-castes cover."""
    by_wave: Dict[int, list] = {}
    by_category: Dict[str, int] = {}
    members_total = 0
    for cl in sorted(CASTE_CLUSTERS, key=lambda c: (c["wave"], c["key"])):
        members_total += len(cl["members"])
        by_category[cl.get("category", "?")] = by_category.get(cl.get("category", "?"), 0) + 1
        row = {"cluster": cl["key"], "name": cl["en"], "telugu": cl["te"], "category": cl.get("category", ""),
               "split": bool(cl["split"]), "members": len(cl["members"]),
               "channel": "@" + CHANNELS[SPLIT_MAP[cl["key"]]["Bride"]]["username"]}
        if cl["split"]:
            row["bride"] = "@" + CHANNELS[SPLIT_MAP[cl["key"]]["Bride"]]["username"]
            row["groom"] = "@" + CHANNELS[SPLIT_MAP[cl["key"]]["Groom"]]["username"]
        by_wave.setdefault(cl["wave"], []).append(row)
    split_n = sum(1 for c in CASTE_CLUSTERS if c["split"])
    single_n = len(CASTE_CLUSTERS) - split_n
    return {
        "clusters": len(CASTE_CLUSTERS),
        "split_clusters": split_n, "single_clusters": single_n,
        "caste_gender_channels": split_n * 2,          # bride/groom separate unna channels
        "mixed_caste_channels": single_n,               # single channel (both + hashtag filter)
        "cluster_channels": split_n * 2 + single_n,
        "sub_castes_covered": members_total,
        "by_category": by_category,
        "by_wave": by_wave,
        # backward-compat (frontend/test lu ivi kooda chustayi)
        "split_castes": split_n,
    }


def channel_health_report() -> list:
    """Emanna channel config లో problem unda (setup ముందు)."""
    from channel_content import channel_health
    out = []
    for key, ch in CHANNELS.items():
        probs = channel_health(key, ch)
        if probs:
            out.append({"key": key, "problems": probs})
    return out

def channel_stats() -> dict:
    tiers = channels_by_tier()
    return {
        "total": len(CHANNELS),
        "live": len(live_channels()),
        "to_create": len(pending_channels()),
        "by_tier": {t: len(v) for t, v in tiers.items()},
        "bot": BOT_USERNAME,
        "site": SITE,
    }


def resolve_religion(raw: str) -> str:
    if not raw:
        return "Hindu"
    return RELIGION_ALIASES.get(str(raw).strip().lower(), "Hindu")


def resolve_state(raw: str) -> str:
    if not raw:
        return "TS"
    return STATE_ALIASES.get(str(raw).strip().lower(), "TS")


def resolve_caste_key(raw: str) -> str | None:
    """Caste free-text / dropdown value → channel key (or None if Open/Others)."""
    if not raw:
        return None
    text = str(raw).strip().lower().replace("_", " ").replace("-", " ")
    text = " ".join(text.split())
    text_dash = str(raw).strip().lower()
    for probe in (text_dash, text):
        if probe in CASTE_ALIASES:
            return CASTE_ALIASES[probe]
    # partial match — "reddy (pakanati)" etc.
    for alias, key in CASTE_ALIASES.items():
        if alias and alias in text:
            return key
    return None


def _flag_job(text: str, words: tuple) -> bool:
    t = f" {str(text).lower()} "
    return any(w in t for w in words)


def why_telugu(key: str, profile: dict) -> str:
    """Channel key → caption లో chupinchE Telugu reason (personalized)."""
    gender_word = "అమ్మాయి" if str(profile.get("gender", "Bride")).lower().startswith("b") else "అబ్బాయి"
    state = resolve_state(profile.get("state", "TS"))
    state_word = {"TS": "Telangana", "AP": "Andhra", "Other": "NRI/Abroad"}[state]
    dist = profile.get("district", "")
    caste = profile.get("caste", "")
    age = str(profile.get("age", "")).split("-")[0]
    reasons = {
        "ts_bride": f"{state_word} {gender_word} — TS Brides channel లో daily చూసేవాళ్లకి reach",
        "ts_groom": f"{state_word} {gender_word} — TS Grooms channel లో direct reach",
        "ap_bride": f"{state_word} {gender_word} — AP Brides channel లో first page",
        "ap_groom": f"{state_word} {gender_word} — AP Grooms channel లో direct reach",
        "nri_global": "NRI/Abroad matches కోరుకునే families కి idi first choice",
        "hindu": "Hindu community matches — caste channel కూడా కలిపి reach",
        "muslim": "Muslim community — Sheikh/Syed/Pathan/Momin అన్నీ sub-sects కి reach",
        "christian": "Christian community — Catholic/CSI/Baptist అన్నీ denominations కి reach",
        "other_religion": "Other religions — respectful + private matches",
        "interfaith": "Inter-caste / Love marriage కోరుకునే couples కి safe space",
        "second_marriage": "2nd innings — divorcee/widow కి respect తో matches",
        "differently_abled": "Differently abled — special care + special respect channel",
        "govt_jobs": "Govt job profile — ee channel లో demand చాలా ఎక్కువ 🔥",
        "software_it": "Software/IT job — HYD, BLR, USA matches కి best",
        "doctors": "Medical profession — doctor matches కి separate channel",
        "teachers": "Teacher/Lecturer matches — education field families కి",
        "above_35": f"Age {age} — 35+ channel లో late marriage కి కూడా best సంబంధం",
        "love_register": "Love/Register marriage support — parents oppuka తో",
    }
    if key in reasons:
        return reasons[key]
    ch = CHANNELS.get(key, {})
    if ch.get("tier") == "L3_CASTE":
        return f"{caste} caste channel — {dist or state_word} లో {caste} సంబంధాలు okkate chota"
    return ch.get("desc", key)[:90]


# ---------------------------------------------------------------------------
# THE ROUTER — one profile → all relevant channels
# ---------------------------------------------------------------------------
MAX_POSTS = 5  # spam control — max 5 channels per profile


def route_profile(profile: dict, max_posts: int = MAX_POSTS) -> dict:
    """
    profile keys (all optional, sane defaults):
      gender: "Bride" | "Groom"
      state: "TS" | "AP" | "Other"
      religion: "Hindu" | "Muslim" | "Christian" | "Other"
      caste: "Reddy" | "SC-Mala" | ...   (free text ok)
      age: int or "24"
      marital_status: "Pelli Kaledu" | "Divorcee" | "Widow" | ...
      physical_status: "Normal" | "Handicapped" | ...
      job: "Software Engineer" / "Govt Teacher"
      education: "MBBS" / "BTech"
      interfaith: bool  (couple opted for inter-caste channel)
      wants_nri: bool   (profile is NRI / abroad)

    returns: {"keys": [...], "usernames": [...], "hashtags": "...", "notes": [...]}
    """
    gender = profile.get("gender", "Bride")
    if str(gender).lower().startswith("g"):
        gender = "Groom"
    else:
        gender = "Bride"
    state = resolve_state(profile.get("state", "TS"))
    religion = resolve_religion(profile.get("religion") or profile.get("caste", ""))
    caste_key = resolve_caste_key(profile.get("caste", ""))

    try:
        age = int(str(profile.get("age", "0")).split("-")[0] or 0)
    except Exception:
        age = 0

    marital = str(profile.get("marital_status", "Pelli Kaledu")).lower()
    physical = str(profile.get("physical_status", "Normal")).lower()
    job = f"{profile.get('job','')} {profile.get('occupation','')}"
    education = str(profile.get("education", "")) + " " + str(profile.get("education_detail", ""))

    ordered = []   # (key, reason)
    notes = []

    # L1 — region (always)
    if state == "TS":
        ordered.append(("ts_bride" if gender == "Bride" else "ts_groom", "region+gender"))
    elif state == "AP":
        ordered.append(("ap_bride" if gender == "Bride" else "ap_groom", "region+gender"))
    else:
        ordered.append(("nri_global", "region=Other/NRI"))
    # 🌊 WAVE 14 — NRI (TS/AP abroad): home-state channel + NRI global hub kooda.
    try:
        from matchpro import detect_nri as _detect_nri
        _nri = _detect_nri(str(profile.get("country", "")), str(profile.get("work_location", "")),
                           str(profile.get("current_city", "")), state)
        if (_nri.get("is_nri") or profile.get("is_nri")) and state in ("TS", "AP"):
            ordered.append(("nri_global", "NRI member"))
    except Exception:
        pass

    # L2 — religion + L3 caste
    if religion == "Hindu":
        if caste_key:
            # Caste channel already covers the community → general Hindu channel ki
            # duplicate pettaku. Slot save chesi specialty channel ki vadukuntam.
            # Exception: TOP MATCH (score>=90) ayithe Hindu hub lo kooda vestham (digest value).
            if profile.get("top_match"):
                ordered.append(("hindu", "top-match digest"))
            else:
                notes.append("Caste channel ఉంది → general Hindu hub skip (duplication avoid, slot save)")
            # ⭐ CLUSTER channel — pedda community ayithe bride/groom separate, chinna vi single
            ck = SPLIT_MAP.get(caste_key, {}).get(gender, "c_%s" % caste_key if "c_" + caste_key in CHANNELS else None)
            if ck and ck in CHANNELS:
                split = bool(SPLIT_MAP.get(caste_key, {}).get("Bride") != SPLIT_MAP.get(caste_key, {}).get("Groom"))
                ordered.append((ck, "cluster=%s + %s%s" % (caste_key, gender,
                                                           "" if split else " (single channel — #%s filter)" % gender)))
            else:
                ordered.append(("c_others_bc", "caste=%s → Other communities channel" % profile.get("caste")))
        else:
            ordered.append(("hindu", "religion (caste Open/Others)"))
            notes.append("Caste 'Open/Others' — caste channel skip (hashtag #Open)")
    elif religion in ("Muslim", "Christian"):
        # ☪️✝️ religion × state × gender = 4 channels (Sheikh/Syed/Catholic/CSI ante okate channel)
        _s = state if state in ("TS", "AP") else "TS"
        ordered.append(("%s_%s_%s" % (religion.lower(), _s.lower(), gender.lower()),
                        "religion=%s + %s + %s" % (religion, _s, gender)))
    else:
        ordered.append(("other_religion", "religion=Other"))

    # L2b — interfaith / love / no-caste-bar (optional flag)
    if profile.get("interfaith") or profile.get("love_marriage") or profile.get("caste_no_bar"):
        ordered.append(("interfaith", "inter-caste / love / caste-no-bar flag"))

    # L4 — special flags
    if marital and marital not in ("pelli kaledu", "never married", "first marriage", "", "unmarried"):
        ordered.append(("second_marriage", f"marital={profile.get('marital_status')}"))
    if physical and physical not in ("normal", "", "none"):
        ordered.append(("differently_abled", f"physical={profile.get('physical_status')}"))
    if _flag_job(job, BLOCK_GOVT):
        ordered.append(("govt_jobs", "govt job"))
    if _flag_job(job, BLOCK_SOFTWARE):
        ordered.append(("software_it", "software/IT job"))
    if _flag_job(job + " " + education, BLOCK_DOCTOR) or _flag_job(job, BLOCK_TEACHER):
        ordered.append(("doctors_teachers", "medical/teaching profession"))
    if profile.get("wants_nri") or state == "Other":
        ordered.append(("nri_global", "NRI/abroad"))

    # de-dupe, keep order, apply cap
    seen, keys, reasons = set(), [], []
    for key, why in ordered:
        if key in seen or key not in CHANNELS:
            continue
        if len(keys) >= max_posts:
            notes.append(f"cap {max_posts} reach — '{key}' skipped (priority taggindi)")
            continue
        seen.add(key)
        keys.append(key)
        reasons.append({"key": key, "why": why, "telugu": why_telugu(key, profile),
                        "username": "@" + CHANNELS[key]["username"]})

    usernames = ["@" + CHANNELS[k]["username"] for k in keys]
    hashtags = build_hashtags(profile, keys)
    return {"keys": keys, "usernames": usernames, "reasons": reasons,
            "hashtags": hashtags, "notes": notes, "count": len(keys)}


def build_hashtags(profile: dict, keys: list | None = None) -> str:
    """Advanced hashtag builder — channel + caste + state + gender + age + district + job."""
    tags = []
    for k in (keys or []):
        tags += CHANNELS.get(k, {}).get("hashtags", [])[:1]
    caste = str(profile.get("caste", "")).strip().replace(" ", "").replace("-", "")
    if caste and caste.lower() not in ("open", "others", "other", "oc"):
        tags.append("#" + caste)
    state = resolve_state(profile.get("state", "TS"))
    tags.append({"TS": "#Telangana", "AP": "#AndhraPradesh", "Other": "#NRI"}[state])
    gender = "Bride" if str(profile.get("gender", "Bride")).lower().startswith("b") else "Groom"
    tags.append("#" + gender)
    dist = str(profile.get("district", "")).strip().replace(" ", "")
    if dist:
        tags.append("#" + dist)
    age = str(profile.get("age", "")).split("-")[0].strip()
    if age.isdigit():
        tags.append(f"#Age{age}")
    edu = str(profile.get("education", "")).strip().replace(" ", "")
    if edu:
        tags.append("#" + edu)
    if profile.get("photo_private"):
        tags.append("#PhotoPrivate")
    # de-dupe preserve order
    seen, out = set(), []
    for t in tags:
        if t and t.lower() not in seen:
            seen.add(t.lower())
            out.append(t)
    return " ".join(out)


def build_caption(profile: dict, tsap_id: str = "TSAP-F-2025-XXXX", score: int = 92) -> str:
    """Ready-to-post Telegram caption — 🔒 WAVE 12 MASKED (number ❌ full-name ❌ surname ❌).

    Teaser matrame + unlock CTA. Full number: bot /unlock (1 credit) leda ₹500 assisted.
    NOTE: ID/score/bot/register/safety substrings intact (old tests green).
    """
    from smart12 import build_masked_caption  # lazy: cycle-safe
    return build_masked_caption(profile or {}, tsap_id, score)


# ═══════════════════════════════════════════════════════════════════════════
# 📢 CHANNEL LINKS (Telegram + WhatsApp) — "caste channels vadi caste related"
# ═══════════════════════════════════════════════════════════════════════════
# Telegram link eppudu automatic (username nunchi). WhatsApp channel/community
# links ki real id kavali — kabatti **env** nunchi:
#   WA_CHANNEL_LINKS = {"c_reddy_bride": "https://whatsapp.com/channel/XXXX", ...}
#   (leda per-channel: WA_CHANNEL_C_REDDY_BRIDE=https://whatsapp.com/channel/XXXX)
# Configure avvakapote aa channel ki whatsapp="" — message lo Telegram link matrame velthundi.
import json as _json
import os as _os


def _wa_links_from_env() -> Dict[str, str]:
    out: Dict[str, str] = {}
    raw = (_os.getenv("WA_CHANNEL_LINKS") or "").strip()
    if raw:
        try:
            obj = _json.loads(raw)
            if isinstance(obj, dict):
                for k, v in obj.items():
                    link = str(v or "").strip()
                    if link:
                        out[str(k).strip().lower()] = link
        except Exception:
            pass
    for key in CHANNELS:
        env_key = "WA_CHANNEL_" + key.upper()
        val = (_os.getenv(env_key) or "").strip()
        if val:
            out[key.lower()] = val
    return out


WA_CHANNEL_LINKS: Dict[str, str] = _wa_links_from_env()
# official WhatsApp channel (iva anni messages lo pettadaniki)
WA_OFFICIAL_LINK = (_os.getenv("WA_OFFICIAL_CHANNEL") or "").strip() or WA_CHANNEL_LINKS.get("official", "")


def telegram_link(username: str) -> str:
    u = (username or "").strip().lstrip("@")
    return f"https://t.me/{u}" if u else ""


def wa_channel_link(key: str) -> str:
    """
    WhatsApp channel/community link.
      1) WA_CHANNEL_LINKS / WA_CHANNEL_<KEY> env (exact link)
      2) WA_CHANNEL_PATTERN env (ex: "https://whatsapp.com/channel/{key}") tho auto-generate
    Lekapote '' (message lo Telegram link matrame veltundi + support note vastundi).
    """
    k = (key or "").lower()
    if not k:
        return ""
    exact = WA_CHANNEL_LINKS.get(k)
    if exact:
        return exact
    pattern = (_os.getenv("WA_CHANNEL_PATTERN") or "").strip()
    if pattern and ("{key}" in pattern or "{username}" in pattern):
        c = CHANNELS.get(k) or {}
        try:
            return pattern.format(key=k, username=str(c.get("username", "")).lstrip("@"))
        except Exception:
            return ""
    return ""


def channel_links(key: str) -> Dict[str, object]:
    """ఒక్క channel కి telegram + whatsapp + name + tier."""
    c = CHANNELS.get(key) or {}
    return {
        "key": key,
        "name": c.get("name", key),
        "tier": c.get("tier", ""),
        "live": bool(c.get("live")),
        "telegram": telegram_link(c.get("username", "")),
        "whatsapp": wa_channel_link(key),
        "hashtags": c.get("hashtags", []),
    }


def _gender_word(profile: Dict) -> str:
    g = str((profile or {}).get("gender", "") or "").lower()
    if g.startswith("bride") or "bride" in g or g in ("f", "female", "ammayi", "అమ్మాయి"):
        return "bride"
    if g.startswith("groom") or "groom" in g or g in ("m", "male", "abbaayi", "abbayi", "అబ్బాయి"):
        return "groom"
    return ""


def caste_channel_links(profile: Dict, limit: int = 5) -> List[Dict[str, object]]:
    """
    🔎 Caste-related channel links (caste mundu, tarvata region → religion → official).
    Order: caste(gender) → region(gender) → religion → official → special/job
    """
    profile = profile or {}
    keys: List[str] = []
    ck = resolve_caste_key(str(profile.get("caste", "") or "") + " " + str(profile.get("sub_caste", "") or ""))
    gw = _gender_word(profile)
    if ck:
        for cand in (f"c_{ck}_{gw}" if gw else "", f"c_{ck}"):
            if cand and cand in CHANNELS and cand not in keys:
                keys.append(cand)
    try:
        route = route_profile(profile, max_posts=6)
        for k in route.get("keys", []):
            if k not in keys:
                keys.append(k)
    except Exception:
        pass
    for k in ("official",):
        if k in CHANNELS and k not in keys:
            keys.append(k)
    out: List[Dict[str, object]] = []
    for k in keys:
        if k not in CHANNELS:
            continue
        link = channel_links(k)
        # telegram lekapote (chinna channels ki username untundi but link empty) skip
        if not link.get("telegram") and not link.get("whatsapp"):
            continue
        out.append(link)
        if len(out) >= max(1, limit):
            break
    return out
