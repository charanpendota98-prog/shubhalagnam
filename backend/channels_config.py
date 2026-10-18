"""
మన వివాహ (TSAP Matrimony) — MASTER CHANNEL REGISTRY + AUTO-ROUTER
====================================================================
Profile routing policy and channel directory registry.
Idi single source of truth: backend, bot, website anni ikkada nunchi chaduvutayi.
Routing is disabled unless an exact Telegram destination is explicitly configured. Registry metadata does not check availability or bot permissions.

LEVELS (CURRENT CHANNEL REGISTRY — 64 listings):
  L0 OFFICIAL   — 1  (brand hub)
  L1 REGION     — 5  (TS, AP and other-region listings)
  L2 RELIGION   — 5  (religion/community directory listings)
  L3 CASTE      — 45 (selected community-specific channel listings)
  L4 SPECIAL    — 8  (additional member/profile categories)
  ---------------------------------------------------------------
  TOTAL         — 64 channels (catalogue includes distinct user-provided community destinations)

IMPORTANT RULES:
  * Only an explicitly configured destination can be used for routing.
  * Blank category usernames are intentional; do not generate or guess replacements.
  * Public-directory exclusions are presentation-only; the owner registry retains their exact configured usernames/invites.
  * Invite links are kept separately from posting destinations; neither link syntax nor routing eligibility proves availability or bot permissions.
  * Max 5 destinations per profile are selected by the router (priority order).
"""

import json
import os
import re
from typing import Dict, List
from urllib.parse import urlparse

def _configured_bot_username() -> str:
    """Return only an explicitly configured Telegram bot username; never guess one."""
    raw = os.getenv("BOT_USERNAME", "").strip().lstrip("@")
    return "@" + raw if re.fullmatch(r"[A-Za-z0-9_]{5,32}", raw) else ""


BOT_USERNAME = _configured_bot_username()
BRAND = "మన వివాహ"
LEGAL_BRAND = "Manavivaha"
SITE = "https://manavivaha.in"

# These category entries remain in the private operator registry so configured
# usernames/invite URLs are preserved, but they are intentionally not part of
# the public channel directory at the owner's request.
# ("c_others_st" used to sit here too: the ST Others community was held back
# until it had enough members. It is published now and split bride/groom like
# the rest, so ST members can find their group from the directory.)
PUBLIC_DIRECTORY_EXCLUDED_KEYS = frozenset({
    "official", "hindu",
    "bureau_network", "differently_abled", "doctors_teachers", "fraud_alerts",
    "govt_jobs", "second_marriage", "software_it", "success_stories",
})

# ---------------------------------------------------------------------------
# CHANNEL REGISTRY
# ---------------------------------------------------------------------------
# key: {
#   "name": Telugu+English display name,
#   "username": explicitly configured public username (blank when not supplied),
#   "desc": channel description to paste in Telegram,
#   "hashtags": always-on hashtags for that channel,
#   "wave": launch wave,
#   "live": derived routing eligibility (never external health or bot permissions),
# }
# ---------------------------------------------------------------------------

CHANNELS = {
    # ===================== LEVEL 0 — OFFICIAL =====================
    "official": {
        "tier": "L0_OFFICIAL",
        "name": "📢 మన వివాహ Official — TS-AP",
        "username": "TSAP_MATRIMONY",
        "desc": ("మన వివాహ — TS & AP Telugu Matrimony 🇮🇳\n"
                 "₹99 సంబంధం • మొదటి 3 FREE\n"
                 "Matrimony updates, approved stories when available, and safety information.\n"
                 "Website: manavivaha.in"),
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
        "desc": ("Telangana ammayilu — అన్నీ kulasthulu.\n"
                 "Directory for member profiles by region and gender. Profile details are member-provided; checks are shown individually.\n"
                 "Register FREE: manavivaha.in/register"),
        "hashtags": ["#TSBride", "#Telangana", "#Ammaayi"],
        "wave": 1,
        "live": True,
        "route": {"state": "TS", "gender": "Bride"},
    },
    "ts_groom": {
        "tier": "L1_REGION",
        "name": "🤵 TS Grooms | తెలంగాణ వరులు",
        "username": "TSGROOM1",
        "desc": ("Telangana abbayilu — అన్నీ kulasthulu.\n"
                 "Directory for member profiles by region and gender. Profile details are member-provided; checks are shown individually.\n"
                 "Register FREE: manavivaha.in/register"),
        "hashtags": ["#TSGroom", "#Telangana", "#Abbaayi"],
        "wave": 1,
        "live": True,
        "route": {"state": "TS", "gender": "Groom"},
    },
    "ap_bride": {
        "tier": "L1_REGION",
        "name": "👰 AP Brides | ఆంధ్రా వధువులు",
        "username": "APBRIDE",
        "desc": ("Andhra Pradesh ammayilu — 28 district options.\n"
                 "Regional directory listing • Register: manavivaha.in/register"),
        "hashtags": ["#APBride", "#AndhraPradesh"],
        "wave": 1,
        "live": True,
        "route": {"state": "AP", "gender": "Bride"},
    },
    "ap_groom": {
        "tier": "L1_REGION",
        "name": "🤵 AP Grooms | ఆంధ్రా వరులు",
        "username": "APGROOM1",
        "desc": ("Andhra Pradesh abbayilu — 28 district options.\n"
                 "Regional directory listing • Register: manavivaha.in/register"),
        "hashtags": ["#APGroom", "#AndhraPradesh"],
        "wave": 1,
        "live": True,
        "route": {"state": "AP", "gender": "Groom"},
    },
    "nri_global": {
        "tier": "L1_REGION",
        "name": "🌍 NRI & Other States | విదేశాల తెలుగు",
        "username": "",
        "desc": ("USA • UK • Canada • Australia • Gulf • Singapore — Telugu NRI matches.\n"
                 "Visa/PR/job status mention చెయ్యండి. manavivaha.in"),
        "hashtags": ["#NRI", "#TeluguAbroad", "#GlobalTelugu"],
        "wave": 2,
        "live": True,
        "route": {"state": "Other"},
    },

    # ===================== LEVEL 2 — RELIGION =====================
    "hindu": {
        "tier": "L2_RELIGION",
        "name": "🕉️ Hindu Matrimony Hub | హిందూ వివాహాలు",
        "username": "",
        "desc": ("Telugu Hindu matrimony directory. Selected community labels and districts are listed; self-description is supported.\n"
                 "Caste-wise channels కూడా ఉంది — profile లో caste filter use చెయ్యండి.\n"
                 "manavivaha.in/register"),
        "hashtags": ["#Hindu", "#TeluguMatrimony"],
        "wave": 1,
        "live": True,
        "route": {"religion": "Hindu"},
    },
    # ===================== LEVEL 3 — HINDU CASTE CLUSTERS (smart groups) =====================
    # 🔑 IDEA: Telugu lo konni castes **okka kula group** laage untayi (ex: Viswabrahmana = 5 sub-castes).
    #         Anduke chinna sub-castes ni okate channel lo kalipamu — create cheyyadam suluvu,
    #         audience kooda oke chota vastundi. Pedda communities ki bride/groom **separate** channels.

    # ===================== LEVEL 4 — SPECIAL (7) =====================
    "second_marriage": {"tier": "L4_SPECIAL", "name": "💔 2nd Marriage | Divorcee & Widow",
                        "username": "",
                        "desc": ("Divorcee • Widow • Widower — 2nd innings కి respect తో platform.\n"
                                 "Optional category for divorcee, widow and widower profiles. Details are member-provided; verify independently.\n"
                                 "manavivaha.in/register"),
                        "hashtags": ["#SecondMarriage", "#Remarriage", "#Respect"], "wave": 2, "live": True,
                        "route": {"flag": "second_marriage"}},
    "differently_abled": {"tier": "L4_SPECIAL", "name": "♿ Differently Abled Matrimony",
                          "username": "",
                          "desc": ("Differently abled brides & grooms — special care, special respect.\n"
                                   "Optional category for differently abled members. Profile details and review status are shown individually. manavivaha.in/register"),
                          "hashtags": ["#DifferentlyAbled", "#SpecialCare"], "wave": 3, "live": True,
                          "route": {"flag": "differently_abled"}},
    "govt_jobs": {"tier": "L4_SPECIAL", "name": "👮 Govt Job Matches | ప్రభుత్వ ఉద్యోగం",
                  "username": "",
                  "desc": "Teacher • Police • Bank • Railway • Group-1/2 • SI • Constable • Nurse — govt job profiles.",
                  "hashtags": ["#GovtJob", "#GovtTeacher"], "wave": 3, "live": True,
                  "route": {"flag": "govt_job"}},
    "software_it": {"tier": "L4_SPECIAL", "name": "💻 Software / IT Matches",
                    "username": "",
                    "desc": "Software • IT • MNC • Product companies — HYD, BLR, PUNE, USA.",
                    "hashtags": ["#Software", "#IT", "#Hyderabad"], "wave": 3, "live": True,
                    "route": {"flag": "software"}},
    "doctors_teachers": {"tier": "L4_SPECIAL", "name": "🩺 Doctors & Teachers Matches",
                         "username": "",
                         "desc": ("MBBS • MD • MS • BDS • Nursing • Pharma • School Teacher • Lecturer • Professor\n"
                                  "Medical + education professionals — ఒకటే chota. manavivaha.in/register"),
                         "hashtags": ["#Doctors", "#Teachers", "#Healthcare"], "wave": 3, "live": True,
                         "route": {"flag": "doctor_teacher"}},
    "success_stories": {"tier": "L4_SPECIAL", "name": "🎉 Success Stories & Reviews",
                        "username": "",
                        "desc": ("Member-submitted stories may appear after review and consent.\n"
                                 "Submit a story for review: manavivaha.in/stories"),
                        "hashtags": ["#SuccessStory", "#ManaVivaha"], "wave": 3, "live": True,
                        "route": "manual"},
    "fraud_alerts": {"tier": "L4_SPECIAL", "name": "⚠️ Fraud Alert & Safety",
                     "username": "",
                     "desc": ("మోసం జాగ్రత్త! Fake profiles, advance money scams, photo theft alerts.\n"
                              "Use the in-service report tools. Reports are reviewed; response time and outcome may vary."),
                     "hashtags": ["#FraudAlert", "#StaySafe"], "wave": 3, "live": True,
                     "route": "manual"},
    "bureau_network": {"tier": "L4_SPECIAL", "name": "🤝 Bureau & Broker Network (B2B)",
                       "username": "",
                       "desc": ("Marriage bureaus • Brokers • Influencers — share a Mana Vivaha referral link.\n"
                                "A ₹50 reward may qualify once on the referee’s first eligible S_99/S_199/S_299/S_499 consumer-plan payment (minimum ₹99); exclusions and manual payout review apply. See manavivaha.in/referral."),
                       "hashtags": ["#Bureau", "#ReferralTerms"], "wave": 3, "live": True,
                       "route": "manual"},
}

# Religion directory entries generated below. These mirror the religions a
# member can select at registration; no Telegram username is assumed for any of
# them, so every entry stays unlinked until an owner configures a destination.
for _key, _religion, _gender, _icon, _te in (
    ("muslim_bride", "Muslim", "Bride", "☪️", "ముస్లిం వధువులు"),
    ("muslim_groom", "Muslim", "Groom", "☪️", "ముస్లిం వరులు"),
    ("christian_bride", "Christian", "Bride", "✝️", "క్రైస్తవ వధువులు"),
    ("christian_groom", "Christian", "Groom", "✝️", "క్రైస్తవ వరులు"),
    ("sikh_bride", "Sikh", "Bride", "🪯", "సిక్కు వధువులు"),
    ("sikh_groom", "Sikh", "Groom", "🪯", "సిక్కు వరులు"),
    ("jain_bride", "Jain", "Bride", "🕉️", "జైన వధువులు"),
    ("jain_groom", "Jain", "Groom", "🕉️", "జైన వరులు"),
    ("buddhist_bride", "Buddhist", "Bride", "☸️", "బౌద్ధ వధువులు"),
    ("buddhist_groom", "Buddhist", "Groom", "☸️", "బౌద్ధ వరులు"),
    ("other_religion_bride", "Other", "Bride", "🕊️", "ఇతర వధువులు"),
    ("other_religion_groom", "Other", "Groom", "🕊️", "ఇతర వరులు"),
):
    _plural = "Brides" if _gender == "Bride" else "Grooms"
    CHANNELS[_key] = {
        "tier": "L2_RELIGION", "religion": _religion, "gender": _gender,
        "name": f"{_icon} {_religion} {_plural} | {_te}",
        "username": "",
        "desc": f"TS & AP {_religion} {_plural} — {_te}.",
        "hashtags": [f"#{_religion}", f"#{_gender}", "#TS", "#AP"],
        "wave": 1, "live": False,
        "route": {"religion": _religion, "gender": _gender},
    }

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
    {"key": "yadava_goud", "en": "Yadava • Golla", "te": "యాదవ • గొల్ల", "category": "BC", "split": True,
     "wave": 2, "members": ["Yadav", "Yadava", "Golla", "Golla (Yadava)"]},
    {"key": "mala", "en": "Mala", "te": "మాల", "category": "SC", "split": True, "wave": 2,
     "members": ["Mala", "Mala Ayawaru", "Mala Dasari"]},
    {"key": "madiga", "en": "Madiga", "te": "మాదిగ", "category": "SC", "split": True, "wave": 2,
     "members": ["Madiga", "Madiga Dasu", "Mashteen", "Madiga Dasari"]},
    {"key": "viswabrahmana", "en": "Viswabrahmana (Viswakarma)", "te": "విశ్వబ్రాహ్మణ", "category": "BC",
     "split": True, "wave": 2,
     "members": ["Viswakarma", "Viswabrahmin", "Viswabrahmana", "Kamsali", "Kammari", "Kanchari", "Vadla",
                 "Ausula", "Silpi", "Shilpi", "Vadrangi", "Achari"]},
    {"key": "munnuru_kapu", "en": "Munnuru Kapu", "te": "మున్నూరు కాపు", "category": "BC", "split": True,
     "wave": 2, "members": ["Munnuru Kapu", "Munnuru"]},
    {"key": "raju_kshatriya", "en": "Raju • Kshatriya", "te": "రాజు • క్షత్రియ", "category": "OC", "split": True,
     "wave": 3, "members": ["Raju", "Rajulu", "Kshatriya", "Vanniyar"]},
    {"key": "padmashali_weavers", "en": "Padmashali • Devanga (Weavers)", "te": "పద్మశాలి • దేవాంగ",
     "category": "BC", "split": True, "wave": 3,
     "members": ["Padmashali", "Padmasali", "Sali", "Pattusali", "Thogata", "Devanga", "Devanga Chettiar"]},
    {"key": "mudiraj", "en": "Mudiraj • Tenugollu", "te": "ముదిరాజ • తెనుగొల్ల", "category": "BC", "split": True,
     "wave": 3, "members": ["Mudiraj", "Mudiraju", "Mutrasi", "Tenugollu"]},
    {"key": "goud", "en": "Goud", "te": "గౌడ", "category": "BC", "split": True,
     "wave": 3, "members": ["Goud", "Gouda", "Ediga", "Gamalla", "Idiga", "Goundla", "Kalalee"]},
    {"key": "kuruma", "en": "Kuruma", "te": "కురుమ", "category": "BC", "split": True,
     "wave": 3, "members": ["Kuruma", "Kuruba", "Kuruba (Golla)", "Kuruva", "Gorrela"]},
    {"key": "rajaka", "en": "Rajaka", "te": "రజక", "category": "BC", "split": True,
     "wave": 3, "members": ["Rajaka", "Chakali", "Vannar"]},
    {"key": "kummari", "en": "Kummari", "te": "కుమ్మరి", "category": "BC", "split": True,
     "wave": 3, "members": ["Kummari", "Kummara", "Kulala", "Kumbhara"]},
    {"key": "perika", "en": "Perika", "te": "పెరిక", "category": "BC", "split": True,
     "wave": 3, "members": ["Perika"]},
    {"key": "lambada_banjara", "en": "Lambada • Banjara (ST)", "te": "లంబాడ • బంజార", "category": "ST",
     "split": True, "wave": 3, "members": ["Lambada", "Lambadi", "Banjara", "Lambani", "Sugali"]},
    {"key": "others_bc", "en": "Other BC Communities", "te": "ఇతర BC కులాలు", "category": "BC", "split": True,
     "wave": 3, "members": ["Salivahana", "Gandla", "Telikula", "Uppara", "Sagara", "Vaddera", "Odde",
                            "Mangali", "Nayi-Brahmin", "Boya", "Valmiki", "Srisayana", "Segidi", "Gavara",
                            "Bestha", "Gangaputra", "Jalari", "Vadabalija", "Jangam", "Jogi", "Dasari",
                            "Bhatraju", "Kalinga", "Bondili", "Meru", "Are Katika", "Nakaralu", "Krishna Balija"]},
    {"key": "others_sc", "en": "Other SC Communities", "te": "ఇతర SC కులాలు", "category": "SC", "split": True,
     "wave": 3, "members": ["Adi Andhra", "Adi Dravida", "Arundhatiya", "Relli", "Arwa Mala", "Samban", "Dandasi"]},
    {"key": "others_st", "en": "Other ST Communities", "te": "ఇతర ST కులాలు", "category": "ST", "split": True,
     "wave": 3, "members": ["Koya", "Koitur", "Gond", "Rajgond", "Naikpod", "Chenchu", "Bagata", "Konda Reddi",
                            "Savara", "Andh"]},
    # ---------------------------------------------------------------------
    # Added so every community offered at registration can reach a group page
    # of its own instead of only the generic directory. No destination links
    # are invented for them — they stay blank until an owner configures one.
    # ---------------------------------------------------------------------
    {"key": "boya_valmiki", "en": "Boya • Valmiki", "te": "బోయ • వాల్మీకి", "category": "ST", "split": True,
     "wave": 4, "members": ["Boya", "Boyar", "Bedar", "Valmiki", "Nishadhi"]},
    {"key": "vaddera", "en": "Vaddera • Odde", "te": "వడ్డెర • ఒడ్డె", "category": "BC", "split": True,
     "wave": 4, "members": ["Vaddera", "Vaddi", "Odde", "Oddilu", "Vadde"]},
    {"key": "nayee_brahmin", "en": "Nayee Brahmin • Mangali", "te": "నాయీ బ్రాహ్మణ • మంగలి", "category": "BC",
     "split": True, "wave": 4, "members": ["Nayee Brahmin", "Nayi-Brahmin", "Mangali", "Mangala", "Nhavi"]},
    {"key": "gandla_telikula", "en": "Gandla • Telikula", "te": "గాండ్ల • తెలికుల", "category": "BC",
     "split": True, "wave": 4, "members": ["Gandla", "Ganika", "Telikula", "Telaga (Gandla)"]},
    {"key": "uppara_sagara", "en": "Uppara • Sagara", "te": "ఉప్పర • సాగర", "category": "BC", "split": True,
     "wave": 4, "members": ["Uppara", "Sagara", "Uppara (Sagara)"]},
    {"key": "bestha_gangaputra", "en": "Bestha • Gangaputra", "te": "బెస్త • గంగపుత్ర", "category": "BC",
     "split": True, "wave": 4, "members": ["Bestha", "Bestalu", "Gangaputra", "Gangavar", "Jalari (Bestha)"]},
    {"key": "gavara", "en": "Gavara", "te": "గవర", "category": "BC", "split": True,
     "wave": 4, "members": ["Gavara", "Gavara (Balija)", "Gavara Komati"]},
    {"key": "jangam_lingayat", "en": "Jangam • Lingayat", "te": "జంగం • లింగాయత", "category": "BC",
     "split": True, "wave": 4, "members": ["Jangam", "Jangama", "Lingayat", "Lingayath", "Veerashaiva"]},
    {"key": "medari", "en": "Medari • Medara", "te": "మేదరి • మేదర", "category": "BC", "split": True,
     "wave": 4, "members": ["Medari", "Medara", "Medarlu"]},
    {"key": "dasari", "en": "Dasari", "te": "దాసరి", "category": "BC", "split": True,
     "wave": 4, "members": ["Dasari", "Dasari (Mala)", "Dasari (Madiga)"]},
    {"key": "koya_gond", "en": "Koya • Gond", "te": "కోయ • గోండ", "category": "ST", "split": True,
     "wave": 4, "members": ["Koya", "Koitur", "Gond", "Rajgond", "Dorla"]},
    {"key": "adi_andhra", "en": "Adi Andhra", "te": "ఆది ఆంధ్ర", "category": "SC", "split": True,
     "wave": 4, "members": ["Adi Andhra", "Adi Dravida", "Adi Karnataka"]},
    # Communities from other regions that members can register under. Grouped
    # by region rather than given thin single-community channels.
    {"key": "north_indian", "en": "Marwari • Gujarati • Punjabi", "te": "మార్వాడీ • గుజరాతీ • పంజాబీ",
     "category": "OC", "split": True, "wave": 4,
     "members": ["Marwari", "Marwadi", "Gujarati", "Gujjar", "Punjabi", "Sikh (Punjabi)"]},
    {"key": "other_states", "en": "Marathi • Odia • Bengali", "te": "మరాఠీ • ఒడియా • బెంగాలీ",
     "category": "OC", "split": True, "wave": 4,
     "members": ["Marathi", "Maharashtrian", "Odia", "Oriya", "Bengali", "Bengali (Bangla)"]},
    {"key": "neighbour_south", "en": "Vokkaliga • Nair • Nadar", "te": "వొక్కలిగ • నాయర్ • నాదార్",
     "category": "OC", "split": True, "wave": 4,
     "members": ["Vokkaliga", "Gowda (Vokkaliga)", "Nair", "Nadar", "Nadar (Tamil)"]},
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
                "username": "",
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
            "username": "",
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

def _normalize_telegram_destination(value: object) -> str:
    """Validate one exact operator-supplied Telegram username or channel ID."""
    raw = str(value or "").strip()
    if re.fullmatch(r"@[A-Za-z0-9_]{5,32}", raw):
        return raw
    if re.fullmatch(r"[A-Za-z0-9_]{5,32}", raw):
        return "@" + raw
    if re.fullmatch(r"-100[0-9]{5,20}", raw):
        return raw
    return ""


def _load_explicit_channel_destinations() -> Dict[str, str]:
    """Read only explicitly mapped destinations; malformed config fails closed."""
    raw = os.getenv("TELEGRAM_CHANNEL_DESTINATIONS_JSON", "").strip()
    if not raw:
        return {}
    try:
        payload = json.loads(raw)
    except (TypeError, ValueError):
        return {}
    if not isinstance(payload, dict):
        return {}
    configured = {}
    for key, value in payload.items():
        channel_key = str(key or "").strip()
        if channel_key not in CHANNELS:
            continue
        destination = _normalize_telegram_destination(value)
        if destination:
            configured[channel_key] = destination
    return configured


def _apply_explicit_routing_configuration() -> None:
    """Disable routing unless an exact primary or per-key destination is configured."""
    requested = {
        value.strip().lstrip("@").casefold()
        for value in os.getenv("CHANNELS", "").split(",")
        if value.strip()
    }
    mapped = _load_explicit_channel_destinations()
    for key, channel in CHANNELS.items():
        username = str(channel.get("username") or "").strip().lstrip("@")
        destination = mapped.get(key, "")
        if not destination and username and (key.casefold() in requested or username.casefold() in requested):
            destination = _normalize_telegram_destination(username)
        channel["routing_destination"] = destination
        # `live` is retained for compatibility but now means an exact configured
        # routing destination only; it never means reachability or bot permissions.
        channel["live"] = bool(destination)


_apply_explicit_routing_configuration()


def is_public_channel(key: str) -> bool:
    """Whether this operator-registry entry is intentionally visible in the public directory."""
    return str(key or "").strip() in CHANNELS and str(key or "").strip() not in PUBLIC_DIRECTORY_EXCLUDED_KEYS


def public_channels(tier: str | None = None) -> list:
    """Return only public directory entries; internal setup/routing keeps the full registry."""
    return [{"key": key, **channel} for key, channel in CHANNELS.items()
            if is_public_channel(key) and (not tier or channel.get("tier") == tier)]


def public_channel_stats() -> dict:
    """Directory counts only; does not imply external availability or bot permissions."""
    rows = public_channels()
    by_tier: Dict[str, int] = {}
    for row in rows:
        tier = str(row.get("tier") or "OTHER")
        by_tier[tier] = by_tier.get(tier, 0) + 1
    routing_eligible = sum(1 for row in rows if _routing_is_explicit(row))
    return {
        "total": len(rows),
        "routing_eligible": routing_eligible,
        "not_routing_eligible": len(rows) - routing_eligible,
        "by_tier": by_tier,
        "external_status_checked": False,
    }


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
    "goud": "goud", "gouda": "goud", "ediga": "goud", "gamalla": "goud", "idiga": "goud",
    "goundla": "goud", "kalalee": "goud",
    "yadav": "yadava_goud", "yadava": "yadava_goud", "golla": "yadava_goud", "golla(yadava)": "yadava_goud",
    "settibalija": "yadava_goud",
    "kuruma": "kuruma", "kuruba": "kuruma", "kuruba(golla)": "kuruma", "kuruva": "kuruma", "gorrela": "kuruma",
    "viswakarma": "viswabrahmana", "viswabrahmin": "viswabrahmana", "viswabrahmana": "viswabrahmana",
    "kamsali": "viswabrahmana", "kammari": "viswabrahmana", "kanchari": "viswabrahmana",
    "vadla": "viswabrahmana", "ausula": "viswabrahmana", "silpi": "viswabrahmana", "shilpi": "viswabrahmana",
    "vadrangi": "viswabrahmana", "achari": "viswabrahmana", "vishwakarma": "viswabrahmana",
    "padmashali": "padmashali_weavers", "padmasali": "padmashali_weavers", "sali": "padmashali_weavers",
    "pattusali": "padmashali_weavers", "thogata": "padmashali_weavers", "thogata sali": "padmashali_weavers",
    "devanga": "padmashali_weavers", "devanga chettiar": "padmashali_weavers",
    "mudiraj": "mudiraj", "mudiraju": "mudiraj", "mutrasi": "mudiraj", "tenugollu": "mudiraj",
    "kummari": "kummari", "kummara": "kummari", "kulala": "kummari", "salivahana": "kummari", "kumbhara": "kummari",
    "rajaka": "rajaka", "chakali": "rajaka", "vannar": "rajaka", "perika": "perika",
    "gandla": "others_bc", "telikula": "others_bc", "devathilakula": "others_bc",
    "uppara": "others_bc", "sagara": "others_bc", "sagari": "others_bc", "uppari": "others_bc",
    "vaddera": "others_bc", "vaddelu": "others_bc", "odde": "others_bc", "oddilu": "others_bc",
    "vadde": "others_bc",
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


def _routing_is_explicit(channel: dict) -> bool:
    """A route is eligible only when both the enable flag and exact target exist."""
    return bool(channel.get("live") and str(channel.get("routing_destination") or "").strip())


def live_channels() -> list:
    """Compatibility name: these are configured routing targets, not externally live channels."""
    return [{"key": k, **v} for k, v in CHANNELS.items() if _routing_is_explicit(v)]


def pending_channels() -> list:
    return [{"key": k, **v} for k, v in CHANNELS.items() if not _routing_is_explicit(v)]


def channel_chat_id(key: str, only_routing_eligible: bool = True) -> str | None:
    """Return only an explicitly configured destination; external health is unchecked."""
    ch = CHANNELS.get(key)
    if not ch:
        return None
    if only_routing_eligible and not _routing_is_explicit(ch):
        return None
    destination = str(ch.get("routing_destination") or "").strip()
    return destination or None


def post_targets(profile: dict, only_routing_eligible: bool = True) -> dict:
    """Return registry routing candidates only; no external health/delivery is checked."""
    routed = route_profile(profile)
    candidates, not_eligible = [], []
    for key in routed["keys"]:
        destination = channel_chat_id(key, only_routing_eligible=only_routing_eligible)
        if destination:
            candidates.append(destination)
        else:
            not_eligible.append(key)
    return {"routing_candidates": candidates, "not_routing_eligible": not_eligible,
            "external_status_checked": False, "keys": routed["keys"],
            "hashtags": routed["hashtags"], "reasons": routed["reasons"], "notes": routed["notes"]}


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
                     "name": ch.get("name"), "username": ch.get("username") or "",
                     "routing_eligible": _routing_is_explicit(ch),
                     "destination_configured": bool(ch.get("routing_destination")),
                     "external_status_checked": False,
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
        bride_destination = channel_chat_id(SPLIT_MAP[cl["key"]]["Bride"])
        groom_destination = channel_chat_id(SPLIT_MAP[cl["key"]]["Groom"])
        row = {"cluster": cl["key"], "name": cl["en"], "telugu": cl["te"], "category": cl.get("category", ""),
               "split": bool(cl["split"]), "members": len(cl["members"]),
               "channel": bride_destination or ""}
        if cl["split"]:
            row["bride"] = bride_destination or ""
            row["groom"] = groom_destination or ""
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
    """Registry counts only; eligibility is not external availability or permission."""
    tiers = channels_by_tier()
    return {
        "total": len(CHANNELS),
        "routing_eligible": len(live_channels()),
        "not_routing_eligible": len(pending_channels()),
        "by_tier": {t: len(v) for t, v in tiers.items()},
        "bot": BOT_USERNAME,
        "site": SITE,
        "external_status_checked": False,
    }


def resolve_religion(raw: str) -> str:
    value = str(raw or "").strip().lower()
    if not value:
        return ""
    return RELIGION_ALIASES.get(value, "Other")


def resolve_state(raw: str) -> str:
    value = str(raw or "").strip().lower()
    if not value:
        return ""
    return STATE_ALIASES.get(value, "Other")


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
    """Explain the configured destination category; never imply compatibility or reach."""
    gender_raw = str((profile or {}).get("gender") or "").strip().lower()
    gender = "bride" if gender_raw.startswith(("b", "f")) else "groom" if gender_raw.startswith(("g", "m")) else ""
    state = resolve_state((profile or {}).get("state"))
    labels = {
        "ts_bride": "Telangana bride category selected from the member-provided location and gender.",
        "ts_groom": "Telangana groom category selected from the member-provided location and gender.",
        "ap_bride": "Andhra Pradesh bride category selected from the member-provided location and gender.",
        "ap_groom": "Andhra Pradesh groom category selected from the member-provided location and gender.",
        "nri_global": "Other-state / NRI directory category selected from the entered location.",
        "hindu": "Hindu directory category selected from the member-provided religion.",
        "muslim_bride": "Muslim bride directory category selected from the member-provided religion and gender.",
        "muslim_groom": "Muslim groom directory category selected from the member-provided religion and gender.",
        "christian_bride": "Christian bride directory category selected from the member-provided religion and gender.",
        "christian_groom": "Christian groom directory category selected from the member-provided religion and gender.",
        "other_religion": "Other-religion directory category selected from the member-provided religion.",
        "interfaith": "Inter-community category selected in the profile.",
        "second_marriage": "Remarriage category selected from the member-provided marital-status details.",
        "differently_abled": "Accessibility category selected from the member-provided profile details.",
        "govt_jobs": "Government/public-service occupation category found in the profile text.",
        "software_it": "Software/IT occupation category found in the profile text.",
        "doctors_teachers": "Healthcare/education occupation category found in the profile text.",
    }
    if key in labels:
        return labels[key]
    ch = CHANNELS.get(key, {})
    if ch.get("tier") == "L3_CASTE":
        community = str((profile or {}).get("caste") or ch.get("cluster_en") or "community").strip()
        return f"Community category selected from the member-provided label: {community}."
    return "Configured directory category; external channel availability is not checked here."


MAX_POSTS = 5  # spam control — maximum number of destination categories per profile


def route_profile(profile: dict, max_posts: int = MAX_POSTS) -> dict:
    """Select configured channel categories only when the corresponding profile data exists."""
    profile = profile or {}
    gender_raw = str(profile.get("gender") or "").strip().lower()
    gender = "Bride" if gender_raw.startswith(("b", "f")) else "Groom" if gender_raw.startswith(("g", "m")) else ""
    state = resolve_state(profile.get("state"))
    religion = resolve_religion(profile.get("religion"))
    caste_key = resolve_caste_key(profile.get("caste", ""))

    def enabled(value) -> bool:
        return value is True or str(value or "").strip().lower() in ("1", "true", "yes", "on")

    try:
        age = int(str(profile.get("age", "0")).split("-")[0] or 0)
    except (TypeError, ValueError):
        age = 0

    marital = str(profile.get("marital_status") or "").strip().lower()
    physical = str(profile.get("physical_status") or "").strip().lower()
    job = f"{profile.get('job', '')} {profile.get('occupation', '')}"
    education = f"{profile.get('education', '')} {profile.get('education_detail', '')}"
    ordered = []
    notes = []

    # Region-specific groups need explicit, usable location and gender fields.
    if state in ("TS", "AP") and gender:
        ordered.append((f"{state.lower()}_{gender.lower()}", "region_and_gender"))
    elif state == "Other":
        ordered.append(("nri_global", "other_region"))
    elif not state:
        notes.append("Location not provided or not recognized; no regional destination selected.")
    if state in ("TS", "AP") and not gender:
        notes.append("Gender not provided or not recognized; gender-specific regional destination skipped.")

    # Religion/community groups are chosen only from an explicit religion field.
    if religion == "Hindu":
        if caste_key:
            if enabled(profile.get("top_match")):
                # Legacy flag is not a match score and cannot trigger a promotional claim.
                notes.append("Legacy top_match flag ignored for channel routing.")
            cluster_routes = SPLIT_MAP.get(caste_key, {})
            if gender and cluster_routes.get(gender):
                ordered.append((cluster_routes[gender], f"community_{caste_key}_{gender.lower()}"))
            elif cluster_routes.get("Bride") == cluster_routes.get("Groom") and cluster_routes.get("Bride"):
                ordered.append((cluster_routes["Bride"], f"community_{caste_key}"))
            elif gender:
                ordered.append(("c_others_bc", f"community_other_{gender.lower()}"))
            else:
                notes.append("Gender missing; gender-specific community destination skipped.")
            notes.append("Community-specific routing used; broad Hindu destination is not duplicated.")
        else:
            ordered.append(("hindu", "hindu_directory"))
    elif religion in ("Muslim", "Christian"):
        if gender:
            ordered.append((f"{religion.lower()}_{gender.lower()}", f"{religion.lower()}_{gender.lower()}_directory"))
        else:
            notes.append("Gender missing; religion destination is gender-specific and was skipped.")
    elif religion == "Other":
        ordered.append(("other_religion", "other_religion_directory"))
    else:
        notes.append("Religion not provided; religion/community-specific destinations were skipped.")

    if enabled(profile.get("interfaith")) or enabled(profile.get("love_marriage")) or enabled(profile.get("caste_no_bar")):
        if "interfaith" in CHANNELS:
            ordered.append(("interfaith", "intercommunity_option_selected"))
        else:
            notes.append("No configured intercommunity destination; no alternate was guessed.")

    if marital and marital not in ("pelli kaledu", "never married", "first marriage", "unmarried", "single"):
        ordered.append(("second_marriage", "member_provided_marital_status"))
    if physical and physical not in ("normal", "none", "not specified"):
        ordered.append(("differently_abled", "member_provided_accessibility_details"))
    if _flag_job(job, BLOCK_GOVT):
        ordered.append(("govt_jobs", "occupation_category"))
    if _flag_job(job, BLOCK_SOFTWARE):
        ordered.append(("software_it", "occupation_category"))
    if _flag_job(job + " " + education, BLOCK_DOCTOR) or _flag_job(job, BLOCK_TEACHER):
        ordered.append(("doctors_teachers", "occupation_category"))

    wants_nri = enabled(profile.get("wants_nri")) or enabled(profile.get("is_nri"))
    if wants_nri and state != "Other":
        ordered.append(("nri_global", "member_selected_nri_category"))

    seen, keys, reasons = set(), [], []
    for key, why in ordered:
        if key in seen:
            continue
        if not is_public_channel(key):
            notes.append("Some category routes are not listed publicly and were not selected.")
            continue
        destination = channel_chat_id(key)
        if not destination:
            notes.append(f"No explicit Telegram destination configured for {key}; no alternate was guessed.")
            continue
        if len(keys) >= max(0, int(max_posts)):
            notes.append(f"Destination limit {max_posts} reached; additional configured categories were not selected.")
            continue
        seen.add(key)
        keys.append(key)
        reasons.append({"key": key, "why": why, "telugu": why_telugu(key, profile),
                        "destination": destination, "username": destination})

    destinations = [reason["destination"] for reason in reasons]
    hashtags = build_hashtags(profile, keys)
    return {"keys": keys, "usernames": destinations, "destinations": destinations, "reasons": reasons,
            "hashtags": hashtags, "notes": notes, "count": len(keys)}


def build_hashtags(profile: dict, keys: list | None = None) -> str:
    """Advanced hashtag builder — channel + caste + state + gender + age + district + job."""
    tags = []
    for k in (keys or []):
        tags += CHANNELS.get(k, {}).get("hashtags", [])[:1]
    caste = str(profile.get("caste", "")).strip().replace(" ", "").replace("-", "")
    if caste and caste.lower() not in ("open", "others", "other", "oc"):
        tags.append("#" + caste)
    state = resolve_state(profile.get("state"))
    if state:
        tags.append({"TS": "#Telangana", "AP": "#AndhraPradesh", "Other": "#OtherRegion"}[state])
    gender_raw = str(profile.get("gender") or "").strip().lower()
    if gender_raw.startswith(("b", "f")):
        tags.append("#Bride")
    elif gender_raw.startswith(("g", "m")):
        tags.append("#Groom")
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


def build_caption(profile: dict, tsap_id: str = "", score: int | None = None) -> str:
    """Build a member-detail teaser without invented IDs or compatibility claims."""
    from smart12 import build_masked_caption  # lazy: cycle-safe
    return build_masked_caption(profile or {}, tsap_id, score)


# ═══════════════════════════════════════════════════════════════════════════
# 📢 CHANNEL LINKS (Telegram + WhatsApp) — "caste channels vadi caste related"
# ═══════════════════════════════════════════════════════════════════════════
# Directory invite URLs come only from explicitly configured links (not reachability-checked).
# WhatsApp channel/community links use configured IDs from defaults or env; Telegram links use the analogous TELEGRAM_CHANNEL_LINKS:
#   WA_CHANNEL_LINKS = {"c_reddy_bride": "https://whatsapp.com/channel/XXXX", ...}
#   (leda per-channel: WA_CHANNEL_C_REDDY_BRIDE=https://whatsapp.com/channel/XXXX)
# Configure avvakapote aa channel ki whatsapp="" — message lo Telegram link matrame velthundi.
import json as _json
import os as _os


def _valid_telegram_url(value: str) -> bool:
    """Accept only HTTPS Telegram channel/usernames and Telegram invite URLs."""
    try:
        url = urlparse(str(value or "").strip())
        if url.scheme.lower() != "https" or url.username or url.password or url.port or url.fragment:
            return False
        if (url.hostname or "").lower().rstrip(".") not in {"t.me", "telegram.me"}:
            return False
        path = url.path.strip("/")
        return bool(re.fullmatch(r"(?:[A-Za-z0-9_]{5,32}|\+[A-Za-z0-9_-]{6,128}|joinchat/[A-Za-z0-9_-]{6,128}|c/\d+/\d+)", path))
    except (TypeError, ValueError):
        return False


def _valid_whatsapp_url(value: str) -> bool:
    """Accept only HTTPS URLs on official WhatsApp hosts with a channel/invite path.

    This validates URL shape only; it does not prove that an invite is active.
    """
    try:
        url = urlparse(str(value or "").strip())
        if url.scheme.lower() != "https" or url.username or url.password or url.port:
            return False
        host = (url.hostname or "").lower().rstrip(".")
        if url.fragment:
            return False
        path = url.path.strip("/")
        if host in {"whatsapp.com", "www.whatsapp.com"}:
            return bool(re.fullmatch(r"channel/[A-Za-z0-9_-]{12,128}", path))
        if host == "chat.whatsapp.com":
            return bool(re.fullmatch(r"[A-Za-z0-9_-]{12,128}", path))
        # wa.me/<phone> and message links are support chats, not channel invites.
        return False
    except (TypeError, ValueError):
        return False


# User-provided public invite URLs. Shape is validated; availability is not probed.
DEFAULT_WA_LINKS: Dict[str, str] = {
    "c_reddy_bride": "https://whatsapp.com/channel/0029VbDpD0N5kg74TpAbIz1R",
    "c_reddy_groom": "https://whatsapp.com/channel/0029Vb900wSEFeXrEfkBNQ0S",
    "c_kamma_bride": "https://whatsapp.com/channel/0029VbDlfav2ZjChEwBJTB0g",
    "c_kamma_groom": "https://whatsapp.com/channel/0029Vb8r6ZJFXUueNw3SQU3r",
    "c_kapu_bride": "https://whatsapp.com/channel/0029VbDyehn30LKVqYhOfn0L",
    "c_kapu_groom": "https://whatsapp.com/channel/0029Vb8le7LLCoX4ClqFvi1J",
    "c_munnuru_kapu_bride": "https://whatsapp.com/channel/0029VbECYss60eBcdKqXag3D",
    "c_munnuru_kapu_groom": "https://whatsapp.com/channel/0029VbD3XJa4CrfknKw76i0e",
    "c_velama_bride": "https://whatsapp.com/channel/0029Vb98bMQBFLgUhEG7cq37",
    "c_velama_groom": "https://whatsapp.com/channel/0029Vb9KeAeD38CUvyswkO3O",
    "c_brahmin_bride": "https://whatsapp.com/channel/0029VbDba8OLSmbk24oJaf3O",
    "c_brahmin_groom": "https://whatsapp.com/channel/0029VbEKbbYEgGfQi0Y1ao1g",
    "c_vysya_bride": "https://whatsapp.com/channel/0029Vb90m6u42DcfPpwvg33K",
    "c_vysya_groom": "https://whatsapp.com/channel/0029VbDl75K7dmeeZMZA2926",
    "c_yadava_goud_bride": "https://whatsapp.com/channel/0029Vb8fFvdHVvTcadiqkp2D",
    "c_yadava_goud_groom": "https://whatsapp.com/channel/0029VbDn2nT7j6g3fdTXgq3A",
    "c_viswabrahmana_bride": "https://whatsapp.com/channel/0029Vb8MKAKBA1f7VLuIaX2Y",
    "c_viswabrahmana_groom": "https://whatsapp.com/channel/0029VbDdWlb8aKvK4Rddz32k",
    "c_raju_kshatriya_bride": "https://whatsapp.com/channel/0029VbEEoWhJJhzenO8voU1e",
    "c_raju_kshatriya_groom": "https://whatsapp.com/channel/0029VbDnKz45q08XGV69LJ0f",
    "c_mala_bride": "https://whatsapp.com/channel/0029VbDtETF65yD6fNeGlf2A",
    "c_mala_groom": "https://whatsapp.com/channel/0029Vb8uW65EwEjvgTserz3x",
    "c_madiga_bride": "https://whatsapp.com/channel/0029Vb94k5RKAwEkRYeW7m1C",
    "c_madiga_groom": "https://whatsapp.com/channel/0029VbDwFWs60eBX0hvdW93T",
    "c_lambada_banjara_bride": "https://whatsapp.com/channel/0029VbD3CW6HVvTbgyWWvX3r",
    "c_lambada_banjara_groom": "https://whatsapp.com/channel/0029Vb902btGE56gSl4iV10H",
    "c_others_bc_bride": "https://whatsapp.com/channel/0029VbDz6odI7Be7YAuc1e3w",
    "c_others_bc_groom": "https://whatsapp.com/channel/0029VbE9dOxDDmFZvsPGd31I",
    "c_others_sc_bride": "https://whatsapp.com/channel/0029Vb8oMp4J93we9t58Sr0m",
    "c_others_sc_groom": "https://whatsapp.com/channel/0029VbDNWfI002TDBUfbFp2A",
    "c_mudiraj_bride": "https://whatsapp.com/channel/0029VbD5Jy27Noa6foFiXS40",
    "c_mudiraj_groom": "https://whatsapp.com/channel/0029VbDrXXxATRSsOCpkZD2J",
    "muslim_groom": "https://whatsapp.com/channel/0029VbEPpCj0lwgqyXF6vV1a",
    "muslim_bride": "https://whatsapp.com/channel/0029VbEMkZZDDmFUKnTbB31b",
    "christian_groom": "https://whatsapp.com/channel/0029Vb9U1HC84OmDO5Q7HM0I",
    "christian_bride": "https://whatsapp.com/channel/0029Vb8ikeUHgZWViQMiJQ2h",
    "c_padmashali_weavers_bride": "https://whatsapp.com/channel/0029Vb8tDgi8Pgs8bBhmwK3H",
    "c_padmashali_weavers_groom": "https://whatsapp.com/channel/0029Vb9ASfp2phHTNpBVIn1U",
    "c_goud_bride": "https://whatsapp.com/channel/0029VbE4EXK42DciVXYopI2h",
    "c_goud_groom": "https://whatsapp.com/channel/0029Vb8opZw6hENsqAzGtY3R",
    "c_kuruma_bride": "https://whatsapp.com/channel/0029Vb939bo5q08lIoSzFk0B",
    "c_kuruma_groom": "https://whatsapp.com/channel/0029Vb8fDPRGU3BFVKlVOU3X",
    "c_rajaka_bride": "https://whatsapp.com/channel/0029Vb9UvFM1SWszlk3KXM2U",
    "c_kummari_bride": "https://whatsapp.com/channel/0029VbDhazI0wajxHXSCDh1t",
    "c_kummari_groom": "https://whatsapp.com/channel/0029VbDizeQG8l55W64bVj2V",
    "c_perika_bride": "https://whatsapp.com/channel/0029VbDV28JIyPtYs0DDQ92f",
    "c_perika_groom": "https://whatsapp.com/channel/0029Vb8ceI13gvWdFcRSYW3y",
}

DEFAULT_TELEGRAM_LINKS: Dict[str, str] = {
    # Exact primary usernames retained from the operator configuration. These are
    # public-directory links only; they do not enable posting or prove availability.
    "official": "https://t.me/TSAP_MATRIMONY",
    "ts_bride": "https://t.me/TSBRIDE",
    "ts_groom": "https://t.me/TSGROOM1",
    "ap_bride": "https://t.me/APBRIDE",
    "ap_groom": "https://t.me/APGROOM1",
    "c_reddy_bride": "https://t.me/+DdStvgCtmb83M2Y1",
    "c_reddy_groom": "https://t.me/+bvcPm7h34VpmYTU1",
    "c_kamma_bride": "https://t.me/+oQcIdTKMlINmZWY1",
    "c_kamma_groom": "https://t.me/+Y9O_Y8323JA5YjY1",
    "c_kapu_bride": "https://t.me/+2ZrBXtORoOo5NTU9",
    "c_kapu_groom": "https://t.me/+S6KxwVibmQU0YmZl",
    "c_munnuru_kapu_bride": "https://t.me/+G9i5zZ1AXfJkNzE1",
    "c_munnuru_kapu_groom": "https://t.me/+8aF99CIpwwo5M2Fl",
    "c_velama_bride": "https://t.me/+zKQU94Dcl8E2YWY1",
    "c_velama_groom": "https://t.me/+NnMufdM31dc0ZTE1",
    "c_brahmin_bride": "https://t.me/+tWfcyC7StAw1ZTU1",
    "c_brahmin_groom": "https://t.me/+9LByJC4Y-5VmM2Q9",
    "c_vysya_bride": "https://t.me/+ZEoszjmdKmYzMjI1",
    "c_vysya_groom": "https://t.me/+mhviMJhWFTNhZjBl",
    "c_yadava_goud_bride": "https://t.me/+kFpsLfat96Y0OWI1",
    "c_yadava_goud_groom": "https://t.me/+P4MPYpsRG1Y0Y2U9",
    "c_viswabrahmana_bride": "https://t.me/+lkhMUXqcHdI4M2M1",
    "c_viswabrahmana_groom": "https://t.me/+qBJlaAISvXM4YWU9",
    "c_raju_kshatriya_bride": "https://t.me/+m5LPLPhkIpw4ZGI9",
    "c_raju_kshatriya_groom": "https://t.me/+szuO6inGJ3MyZTFl",
    "c_mala_bride": "https://t.me/+CCxqPaDSGxUwZjY1",
    "c_mala_groom": "https://t.me/+NLoRFKT5yJE5N2Fl",
    "c_madiga_bride": "https://t.me/+32QEp-PKOBVhODY1",
    "c_madiga_groom": "https://t.me/+_oenYepHzlQzYjdl",
    "c_lambada_banjara_bride": "https://t.me/+T7ybZrw8VYQ5NTRl",
    "c_lambada_banjara_groom": "https://t.me/+jOPvVBAKURgyY2Fl",
    "c_others_bc_bride": "https://t.me/+Y4lpZRyN2ZxiNmI1",
    "c_others_bc_groom": "https://t.me/+iyf8LbsJyCo3ZGFl",
    "c_others_sc_bride": "https://t.me/+UfRB95ZYdSBhZmQ1",
    "c_others_sc_groom": "https://t.me/+3w08vTaC3O42N2U9",
    "c_mudiraj_groom": "https://t.me/+BMpylXf9XxcyZDBl",
    "c_mudiraj_bride": "https://t.me/+XebU3qM_WR84YTdl",
    "muslim_groom": "https://t.me/+81zEc2fHMSMxMTBl",
    "muslim_bride": "https://t.me/+e0P4TAGx4XxiMWFl",
    "christian_groom": "https://t.me/+Fs4NLy-bNu9kYWE1",
    "christian_bride": "https://t.me/+TVXi2Bzl3F5lMjE9",
    "c_padmashali_weavers_bride": "https://t.me/+WHy86f07cdFiMDY1",
    "c_padmashali_weavers_groom": "https://t.me/+pxZfSVa1rOEzN2Fl",
    "c_goud_bride": "https://t.me/+oF8K9j6BCzE2YjVl",
    "c_goud_groom": "https://t.me/+HmRI0uILZ-NkY2Y9",
    "c_kuruma_bride": "https://t.me/+W_8aTJ-3B-hhOGFl",
    "c_kuruma_groom": "https://t.me/+YOoCmdgS_3thY2Jl",
    "c_rajaka_bride": "https://t.me/+uHfkj71Js_c1ZWJl",
    "c_rajaka_groom": "https://t.me/+4BStez9IoSAyNmQ1",
    "c_kummari_bride": "https://t.me/+IilG4JDaWm9iMmE1",
    "c_kummari_groom": "https://t.me/+Z9UFsOSSY2szMjFl",
    "c_perika_bride": "https://t.me/+7BHlq1k9R7NhYWQ1",
    "c_perika_groom": "https://t.me/+MXvizI45UNFmOTE1",
}

def _links_from_env(variable: str, prefix: str, defaults: Dict[str, str], validator) -> Dict[str, str]:
    out: Dict[str, str] = dict(defaults)
    raw = (_os.getenv(variable) or "").strip()
    if raw:
        try:
            obj = _json.loads(raw)
            if isinstance(obj, dict):
                for key, value in obj.items():
                    normalized_key = str(key).strip().lower()
                    link = str(value or "").strip()
                    if normalized_key not in CHANNELS:
                        continue
                    if not link:
                        out.pop(normalized_key, None)
                    elif validator(link):
                        out[normalized_key] = link
        except Exception:
            pass
    for key in CHANNELS:
        value = (_os.getenv(prefix + key.upper()) or "").strip()
        if validator(value):
            out[key.lower()] = value
    return out


WA_CHANNEL_LINKS: Dict[str, str] = _links_from_env("WA_CHANNEL_LINKS", "WA_CHANNEL_", DEFAULT_WA_LINKS, _valid_whatsapp_url)
TELEGRAM_CHANNEL_LINKS: Dict[str, str] = _links_from_env("TELEGRAM_CHANNEL_LINKS", "TELEGRAM_CHANNEL_", DEFAULT_TELEGRAM_LINKS, _valid_telegram_url)
# Configured official WhatsApp channel (not externally reachability-checked).
_WA_OFFICIAL_OVERRIDE = (_os.getenv("WA_OFFICIAL_CHANNEL") or "").strip()
WA_OFFICIAL_LINK = _WA_OFFICIAL_OVERRIDE if _valid_whatsapp_url(_WA_OFFICIAL_OVERRIDE) else WA_CHANNEL_LINKS.get("official", "")



def wa_channel_link(key: str) -> str:
    """Return only an exact, configured WhatsApp destination; never construct a URL."""
    k = (key or "").lower().strip()
    if not k:
        return ""
    return WA_CHANNEL_LINKS.get(k, "")


def channel_links(key: str) -> Dict[str, object]:
    """Return explicitly configured invite URLs; syntax validation is not an uptime check."""
    c = CHANNELS.get(key) or {}
    return {
        "key": key,
        "name": c.get("name", key),
        "tier": c.get("tier", ""),
        "routing_eligible": _routing_is_explicit(c),
        "external_status_checked": False,
        "telegram": TELEGRAM_CHANNEL_LINKS.get(str(key or "").lower(), ""),
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


def caste_channel_links(profile: Dict, limit: int = 5,
                         directory_links: Dict[str, Dict[str, object]] | None = None) -> List[Dict[str, object]]:
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
        if not is_public_channel(k):
            continue
        link = channel_links(k)
        if directory_links is not None:
            # When a runtime directory map is supplied it is authoritative: an
            # omitted/inactive entry must not fall back to a hidden base URL.
            mapped = directory_links.get(k)
            if not isinstance(mapped, dict):
                continue
            link["telegram"] = str(mapped.get("telegram") or "")
            link["whatsapp"] = str(mapped.get("whatsapp") or "")
        if not link.get("telegram") and not link.get("whatsapp"):
            continue
        out.append(link)
        if len(out) >= max(1, limit):
            break
    return out
