// AUTO-GENERATED from backend/channels_config.py — edit registry, run gen_frontend_channels.py
// మన వివాహ | TSAP Matrimony — MASTER CHANNEL REGISTRY

export type Channel = {
  key: string;
  tier: string;
  name: string;
  username: string;
  link: string;
  deepLink: string;
  desc: string;
  hashtags: string[];
  wave: number;
  live: boolean;
};

export const CHANNEL_STATS = {"total": 52, "live": 52, "to_create": 0, "by_tier": {"L0_OFFICIAL": 1, "L1_REGION": 5, "L2_RELIGION": 11, "L4_SPECIAL": 8, "L3_CASTE": 27}, "bot": "@telugumatrimony1_bot", "site": "https://manavivaha.in"} as const;

export const CHANNEL_TIERS = [
  {
    "key": "L0_OFFICIAL",
    "label": "Official Hub",
    "icon": "📢",
    "hint": "Top-3 daily, success stories, safety alerts",
    "count": 1
  },
  {
    "key": "L1_REGION",
    "label": "Main 4 Channels",
    "icon": "📍",
    "hint": "TS Bride • TS Groom • AP Bride • AP Groom (+ NRI)",
    "count": 5
  },
  {
    "key": "L2_RELIGION",
    "label": "Religion",
    "icon": "🕊️",
    "hint": "Hindu, Muslim, Christian, Other, Inter-faith",
    "count": 11
  },
  {
    "key": "L3_CASTE",
    "label": "Caste-wise",
    "icon": "💍",
    "hint": "Caste ప్రకారం — top 18 castes కి bride/groom separate, మిగిలిన 25 castes కి mixed",
    "count": 27
  },
  {
    "key": "L4_SPECIAL",
    "label": "Special",
    "icon": "⭐",
    "hint": "2nd marriage, able, govt, IT, doctors, 35+, bureau",
    "count": 8
  }
] as const;

export const ALL_CHANNELS: Channel[] = [
  {
    "key": "official",
    "tier": "L0_OFFICIAL",
    "name": "📢 మన వివాహ Official | మన వివాహ — TS-AP",
    "username": "@TSAP_MATRIMONY",
    "link": "https://t.me/TSAP_MATRIMONY",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_tsap_matrimony",
    "desc": "మన వివాహ — TS/AP తెలుగు మ్యాట్రిమోని. రోజూ టాప్-3 సంబంధాలు, విజయ గాథలు, మోసం హెచ్చరికలు. 3 requests FREE, ₹99లో 5.",
    "hashtags": [
      "#ManaVivaha",
      "#TSAPMatrimony",
      "#99keSambandham"
    ],
    "wave": 1,
    "live": true
  },
  {
    "key": "ts_bride",
    "tier": "L1_REGION",
    "name": "👰 TS Brides | తెలంగాణ వధువులు",
    "username": "@TSBRIDE",
    "link": "https://t.me/TSBRIDE",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_tsbride",
    "desc": "👰 TS Brides — తెలంగాణ వధువులు. అన్ని కులాలు, అన్ని జిల్లాలు, రోజూ కొత్త profiles + గుణమేళనం వివరాలు. 3 FREE requests, ₹99లో 5.",
    "hashtags": [
      "#TSBride",
      "#Telangana",
      "#Ammaayi"
    ],
    "wave": 1,
    "live": true
  },
  {
    "key": "ts_groom",
    "tier": "L1_REGION",
    "name": "🤵 TS Grooms | తెలంగాణ వరులు",
    "username": "@TSGROOM1",
    "link": "https://t.me/TSGROOM1",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_tsgroom1",
    "desc": "🤵 TS Grooms — తెలంగాణ వరులు. అన్ని కులాలు, అన్ని జిల్లాలు, రోజూ కొత్త profiles + గుణమేళనం వివరాలు. 3 FREE requests, ₹99లో 5.",
    "hashtags": [
      "#TSGroom",
      "#Telangana",
      "#Abbaayi"
    ],
    "wave": 1,
    "live": true
  },
  {
    "key": "ap_bride",
    "tier": "L1_REGION",
    "name": "👰 AP Brides | ఆంధ్రా వధువులు",
    "username": "@APBRIDE",
    "link": "https://t.me/APBRIDE",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_apbride",
    "desc": "👰 AP Brides — ఆంధ్రా వధువులు. అన్ని కులాలు, అన్ని జిల్లాలు, రోజూ కొత్త profiles + గుణమేళనం వివరాలు. 3 FREE requests, ₹99లో 5.",
    "hashtags": [
      "#APBride",
      "#AndhraPradesh"
    ],
    "wave": 1,
    "live": true
  },
  {
    "key": "ap_groom",
    "tier": "L1_REGION",
    "name": "🤵 AP Grooms | ఆంధ్రా వరులు",
    "username": "@APGROOM1",
    "link": "https://t.me/APGROOM1",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_apgroom1",
    "desc": "🤵 AP Grooms — ఆంధ్రా వరులు. అన్ని కులాలు, అన్ని జిల్లాలు, రోజూ కొత్త profiles + గుణమేళనం వివరాలు. 3 FREE requests, ₹99లో 5.",
    "hashtags": [
      "#APGroom",
      "#AndhraPradesh"
    ],
    "wave": 1,
    "live": true
  },
  {
    "key": "nri_global",
    "tier": "L1_REGION",
    "name": "🌍 NRI Telugu Matrimony | విదేశీ సంబంధాలు",
    "username": "@manavivaha_nri",
    "link": "https://t.me/manavivaha_nri",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_nri",
    "desc": "🌍 NRI Telugu Matrimony — విదేశీ సంబంధాలు. అన్ని కులాలు, అన్ని జిల్లాలు, రోజూ కొత్త profiles + గుణమేళనం వివరాలు. 3 FREE requests, ₹99లో 5.",
    "hashtags": [
      "#NRI",
      "#TeluguAbroad",
      "#GlobalTelugu"
    ],
    "wave": 2,
    "live": true
  },
  {
    "key": "hindu",
    "tier": "L2_RELIGION",
    "name": "🕉️ Hindu Matrimony | హిందూ వివాహాలు",
    "username": "@manavivaha_hindu",
    "link": "https://t.me/manavivaha_hindu",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_hindu",
    "desc": "🕉️ Hindu Matrimony — హిందూ వివాహాలు. వధువులు + వరులు, అన్ని జిల్లాలు. 3 FREE requests, ₹99లో 5.",
    "hashtags": [
      "#Hindu",
      "#TeluguMatrimony"
    ],
    "wave": 1,
    "live": true
  },
  {
    "key": "muslim_ts_bride",
    "tier": "L2_RELIGION",
    "name": "☪️ Telangana Muslim Brides | తెలంగాణ ముస్లిం వధువులు",
    "username": "@manavivaha_muslim_ts_bride",
    "link": "https://t.me/manavivaha_muslim_ts_bride",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_muslim_ts_bride",
    "desc": "తెలంగాణ ముస్లిం వధువులు — Telangana. ఫోటో గోప్యం, నిజమైన profiles, 3 requests FREE, ₹99లో 5. #Muslim #Bride #Telangana",
    "hashtags": [
      "#Muslim",
      "#Bride",
      "#Telangana",
      "#Nikah"
    ],
    "wave": 1,
    "live": true
  },
  {
    "key": "muslim_ts_groom",
    "tier": "L2_RELIGION",
    "name": "☪️ Telangana Muslim Grooms | తెలంగాణ ముస్లిం వరులు",
    "username": "@manavivaha_muslim_ts_groom",
    "link": "https://t.me/manavivaha_muslim_ts_groom",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_muslim_ts_groom",
    "desc": "తెలంగాణ ముస్లిం వరులు — Telangana. ఫోటో గోప్యం, నిజమైన profiles, 3 requests FREE, ₹99లో 5. #Muslim #Groom #Telangana",
    "hashtags": [
      "#Muslim",
      "#Groom",
      "#Telangana",
      "#Nikah"
    ],
    "wave": 1,
    "live": true
  },
  {
    "key": "muslim_ap_bride",
    "tier": "L2_RELIGION",
    "name": "☪️ AP Muslim Brides | ఆంధ్రా ముస్లిం వధువులు",
    "username": "@manavivaha_muslim_ap_bride",
    "link": "https://t.me/manavivaha_muslim_ap_bride",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_muslim_ap_bride",
    "desc": "ఆంధ్రా ముస్లిం వధువులు — AP. ఫోటో గోప్యం, నిజమైన profiles, 3 requests FREE, ₹99లో 5. #Muslim #Bride #AndhraPradesh",
    "hashtags": [
      "#Muslim",
      "#Bride",
      "#AndhraPradesh",
      "#Nikah"
    ],
    "wave": 1,
    "live": true
  },
  {
    "key": "muslim_ap_groom",
    "tier": "L2_RELIGION",
    "name": "☪️ AP Muslim Grooms | ఆంధ్రా ముస్లిం వరులు",
    "username": "@manavivaha_muslim_ap_groom",
    "link": "https://t.me/manavivaha_muslim_ap_groom",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_muslim_ap_groom",
    "desc": "ఆంధ్రా ముస్లిం వరులు — AP. ఫోటో గోప్యం, నిజమైన profiles, 3 requests FREE, ₹99లో 5. #Muslim #Groom #AndhraPradesh",
    "hashtags": [
      "#Muslim",
      "#Groom",
      "#AndhraPradesh",
      "#Nikah"
    ],
    "wave": 1,
    "live": true
  },
  {
    "key": "christian_ts_bride",
    "tier": "L2_RELIGION",
    "name": "✝️ Telangana Christian Brides | తెలంగాణ క్రైస్తవ వధువులు",
    "username": "@manavivaha_christian_ts_bride",
    "link": "https://t.me/manavivaha_christian_ts_bride",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_christian_ts_bride",
    "desc": "తెలంగాణ క్రైస్తవ వధువులు — Telangana. ఫోటో గోప్యం, నిజమైన profiles, 3 requests FREE, ₹99లో 5. #Christian #Bride #Telangana",
    "hashtags": [
      "#Christian",
      "#Bride",
      "#Telangana",
      "#Wedding"
    ],
    "wave": 1,
    "live": true
  },
  {
    "key": "christian_ts_groom",
    "tier": "L2_RELIGION",
    "name": "✝️ Telangana Christian Grooms | తెలంగాణ క్రైస్తవ వరులు",
    "username": "@manavivaha_christian_ts_groom",
    "link": "https://t.me/manavivaha_christian_ts_groom",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_christian_ts_groom",
    "desc": "తెలంగాణ క్రైస్తవ వరులు — Telangana. ఫోటో గోప్యం, నిజమైన profiles, 3 requests FREE, ₹99లో 5. #Christian #Groom #Telangana",
    "hashtags": [
      "#Christian",
      "#Groom",
      "#Telangana",
      "#Wedding"
    ],
    "wave": 1,
    "live": true
  },
  {
    "key": "christian_ap_bride",
    "tier": "L2_RELIGION",
    "name": "✝️ AP Christian Brides | ఆంధ్రా క్రైస్తవ వధువులు",
    "username": "@manavivaha_christian_ap_bride",
    "link": "https://t.me/manavivaha_christian_ap_bride",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_christian_ap_bride",
    "desc": "ఆంధ్రా క్రైస్తవ వధువులు — AP. ఫోటో గోప్యం, నిజమైన profiles, 3 requests FREE, ₹99లో 5. #Christian #Bride #AndhraPradesh",
    "hashtags": [
      "#Christian",
      "#Bride",
      "#AndhraPradesh",
      "#Wedding"
    ],
    "wave": 1,
    "live": true
  },
  {
    "key": "christian_ap_groom",
    "tier": "L2_RELIGION",
    "name": "✝️ AP Christian Grooms | ఆంధ్రా క్రైస్తవ వరులు",
    "username": "@manavivaha_christian_ap_groom",
    "link": "https://t.me/manavivaha_christian_ap_groom",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_christian_ap_groom",
    "desc": "ఆంధ్రా క్రైస్తవ వరులు — AP. ఫోటో గోప్యం, నిజమైన profiles, 3 requests FREE, ₹99లో 5. #Christian #Groom #AndhraPradesh",
    "hashtags": [
      "#Christian",
      "#Groom",
      "#AndhraPradesh",
      "#Wedding"
    ],
    "wave": 1,
    "live": true
  },
  {
    "key": "other_religion",
    "tier": "L2_RELIGION",
    "name": "🕊️ Other Religions | ఇతర మత వివాహాలు",
    "username": "@manavivaha_other_religions",
    "link": "https://t.me/manavivaha_other_religions",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_other_religions",
    "desc": "🕊️ Other Religions — ఇతర మత వివాహాలు. వధువులు + వరులు, అన్ని జిల్లాలు. 3 FREE requests, ₹99లో 5.",
    "hashtags": [
      "#OtherReligions",
      "#Respect"
    ],
    "wave": 2,
    "live": true
  },
  {
    "key": "interfaith",
    "tier": "L2_RELIGION",
    "name": "💞 Inter-Faith & Love | ప్రేమ వివాహాలు",
    "username": "@manavivaha_interfaith",
    "link": "https://t.me/manavivaha_interfaith",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_interfaith",
    "desc": "💞 Inter-Faith & Love — ప్రేమ వివాహాలు. వధువులు + వరులు, అన్ని జిల్లాలు. 3 FREE requests, ₹99లో 5.",
    "hashtags": [
      "#Intercaste",
      "#LoveMarriage",
      "#RegisterMarriage"
    ],
    "wave": 3,
    "live": true
  },
  {
    "key": "second_marriage",
    "tier": "L4_SPECIAL",
    "name": "💍 Second Marriage | రెండో పెళ్లి",
    "username": "@manavivaha_second",
    "link": "https://t.me/manavivaha_second",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_second",
    "desc": "💍 Second Marriage — రెండో పెళ్లి. ఈ కేటగిరీ ప్రత్యేక profiles మాత్రమే — వేరే ఎక్కడా దొరకవు.",
    "hashtags": [
      "#SecondMarriage",
      "#Remarriage",
      "#Respect"
    ],
    "wave": 2,
    "live": true
  },
  {
    "key": "differently_abled",
    "tier": "L4_SPECIAL",
    "name": "♿ Differently-Abled | ప్రత్యేక సామర్థ్యం",
    "username": "@manavivaha_able",
    "link": "https://t.me/manavivaha_able",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_able",
    "desc": "♿ Differently-Abled — ప్రత్యేక సామర్థ్యం. ఈ కేటగిరీ ప్రత్యేక profiles మాత్రమే — వేరే ఎక్కడా దొరకవు.",
    "hashtags": [
      "#DifferentlyAbled",
      "#SpecialCare"
    ],
    "wave": 3,
    "live": true
  },
  {
    "key": "govt_jobs",
    "tier": "L4_SPECIAL",
    "name": "🏛️ Govt Jobs Matrimony | ప్రభుత్వ ఉద్యోగులు",
    "username": "@manavivaha_govt",
    "link": "https://t.me/manavivaha_govt",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_govt",
    "desc": "🏛️ Govt Jobs Matrimony — ప్రభుత్వ ఉద్యోగులు. ఈ కేటగిరీ ప్రత్యేక profiles మాత్రమే — వేరే ఎక్కడా దొరకవు.",
    "hashtags": [
      "#GovtJob",
      "#GovtTeacher"
    ],
    "wave": 3,
    "live": true
  },
  {
    "key": "software_it",
    "tier": "L4_SPECIAL",
    "name": "💻 Software Matrimony | సాఫ్ట్‌వేర్ ఉద్యోగులు",
    "username": "@manavivaha_software",
    "link": "https://t.me/manavivaha_software",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_software",
    "desc": "💻 Software Matrimony — సాఫ్ట్‌వేర్ ఉద్యోగులు. ఈ కేటగిరీ ప్రత్యేక profiles మాత్రమే — వేరే ఎక్కడా దొరకవు.",
    "hashtags": [
      "#Software",
      "#IT",
      "#Hyderabad"
    ],
    "wave": 3,
    "live": true
  },
  {
    "key": "doctors_teachers",
    "tier": "L4_SPECIAL",
    "name": "🩺 Doctors & Teachers Matrimony | వైద్యులు + ఉపాధ్యాయులు",
    "username": "@manavivaha_professionals",
    "link": "https://t.me/manavivaha_professionals",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_professionals",
    "desc": "🩺 Doctors & Teachers Matrimony — వైద్యులు + ఉపాధ్యాయులు. ఈ కేటగిరీ ప్రత్యేక profiles మాత్రమే — వేరే ఎక్కడా దొరకవు.",
    "hashtags": [
      "#Doctors",
      "#Teachers",
      "#Healthcare"
    ],
    "wave": 3,
    "live": true
  },
  {
    "key": "success_stories",
    "tier": "L4_SPECIAL",
    "name": "🏆 Success Stories | విజయ గాథలు",
    "username": "@manavivaha_success",
    "link": "https://t.me/manavivaha_success",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_success",
    "desc": "🏆 Success Stories — విజయ గాథలు. ఈ కేటగిరీ ప్రత్యేక profiles మాత్రమే — వేరే ఎక్కడా దొరకవు.",
    "hashtags": [
      "#SuccessStory",
      "#ManaVivaha"
    ],
    "wave": 3,
    "live": true
  },
  {
    "key": "fraud_alerts",
    "tier": "L4_SPECIAL",
    "name": "🚨 Fraud Alerts | మోసం జాగ్రత్త",
    "username": "@manavivaha_alerts",
    "link": "https://t.me/manavivaha_alerts",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_alerts",
    "desc": "🚨 Fraud Alerts — మోసం జాగ్రత్త. ఈ కేటగిరీ ప్రత్యేక profiles మాత్రమే — వేరే ఎక్కడా దొరకవు.",
    "hashtags": [
      "#FraudAlert",
      "#StaySafe"
    ],
    "wave": 3,
    "live": true
  },
  {
    "key": "bureau_network",
    "tier": "L4_SPECIAL",
    "name": "🤝 Bureau / Broker Network | బ్రోకర్ల నెట్‌వర్క్",
    "username": "@manavivaha_bureau",
    "link": "https://t.me/manavivaha_bureau",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_bureau",
    "desc": "🤝 Bureau / Broker Network — బ్రోకర్ల నెట్‌వర్క్. ఈ కేటగిరీ ప్రత్యేక profiles మాత్రమే — వేరే ఎక్కడా దొరకవు.",
    "hashtags": [
      "#Bureau",
      "#Referral50"
    ],
    "wave": 3,
    "live": true
  },
  {
    "key": "c_reddy_bride",
    "tier": "L3_CASTE",
    "name": "👰 Reddy Brides | రెడ్డి వధువులు",
    "username": "@manavivaha_reddy_bride",
    "link": "https://t.me/manavivaha_reddy_bride",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_reddy_bride",
    "desc": "రెడ్డి — Reddy (Brides). Sub-castes: Reddy • Pakanati Reddy • Motati Reddy • Gudati Reddy • Deshathi Reddy. నిజమైన profiles, 3 requests FREE, ₹99లో 5.",
    "hashtags": [
      "#Reddy",
      "#Bride",
      "#TS",
      "#AP"
    ],
    "wave": 1,
    "live": true
  },
  {
    "key": "c_reddy_groom",
    "tier": "L3_CASTE",
    "name": "🤵 Reddy Grooms | రెడ్డి వరులు",
    "username": "@manavivaha_reddy_groom",
    "link": "https://t.me/manavivaha_reddy_groom",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_reddy_groom",
    "desc": "రెడ్డి — Reddy (Grooms). Sub-castes: Reddy • Pakanati Reddy • Motati Reddy • Gudati Reddy • Deshathi Reddy. నిజమైన profiles, 3 requests FREE, ₹99లో 5.",
    "hashtags": [
      "#Reddy",
      "#Groom",
      "#TS",
      "#AP"
    ],
    "wave": 1,
    "live": true
  },
  {
    "key": "c_kamma_bride",
    "tier": "L3_CASTE",
    "name": "👰 Kamma Brides | కమ్మ వధువులు",
    "username": "@manavivaha_kamma_bride",
    "link": "https://t.me/manavivaha_kamma_bride",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_kamma_bride",
    "desc": "కమ్మ — Kamma (Brides). Sub-castes: Kamma • Chowdary • Choudary. నిజమైన profiles, 3 requests FREE, ₹99లో 5.",
    "hashtags": [
      "#Kamma",
      "#Bride",
      "#TS",
      "#AP"
    ],
    "wave": 1,
    "live": true
  },
  {
    "key": "c_kamma_groom",
    "tier": "L3_CASTE",
    "name": "🤵 Kamma Grooms | కమ్మ వరులు",
    "username": "@manavivaha_kamma_groom",
    "link": "https://t.me/manavivaha_kamma_groom",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_kamma_groom",
    "desc": "కమ్మ — Kamma (Grooms). Sub-castes: Kamma • Chowdary • Choudary. నిజమైన profiles, 3 requests FREE, ₹99లో 5.",
    "hashtags": [
      "#Kamma",
      "#Groom",
      "#TS",
      "#AP"
    ],
    "wave": 1,
    "live": true
  },
  {
    "key": "c_kapu_bride",
    "tier": "L3_CASTE",
    "name": "👰 Kapu • Balija • Telaga Brides | కాపు • బలిజ • తెలగ వధువులు",
    "username": "@manavivaha_kapu_bride",
    "link": "https://t.me/manavivaha_kapu_bride",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_kapu_bride",
    "desc": "కాపు • బలిజ • తెలగ — Kapu • Balija • Telaga (Brides). Sub-castes: Kapu • Ontari • Turupu Kapu • Palli Kapu • Balija. నిజమైన profiles, 3 requests FREE, ₹99లో 5.",
    "hashtags": [
      "#Kapu",
      "#Bride",
      "#TS",
      "#AP"
    ],
    "wave": 1,
    "live": true
  },
  {
    "key": "c_kapu_groom",
    "tier": "L3_CASTE",
    "name": "🤵 Kapu • Balija • Telaga Grooms | కాపు • బలిజ • తెలగ వరులు",
    "username": "@manavivaha_kapu_groom",
    "link": "https://t.me/manavivaha_kapu_groom",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_kapu_groom",
    "desc": "కాపు • బలిజ • తెలగ — Kapu • Balija • Telaga (Grooms). Sub-castes: Kapu • Ontari • Turupu Kapu • Palli Kapu • Balija. నిజమైన profiles, 3 requests FREE, ₹99లో 5.",
    "hashtags": [
      "#Kapu",
      "#Groom",
      "#TS",
      "#AP"
    ],
    "wave": 1,
    "live": true
  },
  {
    "key": "c_velama_bride",
    "tier": "L3_CASTE",
    "name": "👰 Velama Brides | వెలమ వధువులు",
    "username": "@manavivaha_velama_bride",
    "link": "https://t.me/manavivaha_velama_bride",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_velama_bride",
    "desc": "వెలమ — Velama (Brides). Sub-castes: Velama • Padma Velama • Koppula Velama. నిజమైన profiles, 3 requests FREE, ₹99లో 5.",
    "hashtags": [
      "#Velama",
      "#Bride",
      "#TS",
      "#AP"
    ],
    "wave": 2,
    "live": true
  },
  {
    "key": "c_velama_groom",
    "tier": "L3_CASTE",
    "name": "🤵 Velama Grooms | వెలమ వరులు",
    "username": "@manavivaha_velama_groom",
    "link": "https://t.me/manavivaha_velama_groom",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_velama_groom",
    "desc": "వెలమ — Velama (Grooms). Sub-castes: Velama • Padma Velama • Koppula Velama. నిజమైన profiles, 3 requests FREE, ₹99లో 5.",
    "hashtags": [
      "#Velama",
      "#Groom",
      "#TS",
      "#AP"
    ],
    "wave": 2,
    "live": true
  },
  {
    "key": "c_brahmin_bride",
    "tier": "L3_CASTE",
    "name": "👰 Brahmin Brides | బ్రాహ్మణ వధువులు",
    "username": "@manavivaha_brahmin_bride",
    "link": "https://t.me/manavivaha_brahmin_bride",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_brahmin_bride",
    "desc": "బ్రాహ్మణ — Brahmin (Brides). Sub-castes: Vaidiki Brahmin • Niyogi Brahmin • Sistla • Dravida Brahmin • Iyer. నిజమైన profiles, 3 requests FREE, ₹99లో 5.",
    "hashtags": [
      "#Brahmin",
      "#Bride",
      "#TS",
      "#AP"
    ],
    "wave": 2,
    "live": true
  },
  {
    "key": "c_brahmin_groom",
    "tier": "L3_CASTE",
    "name": "🤵 Brahmin Grooms | బ్రాహ్మణ వరులు",
    "username": "@manavivaha_brahmin_groom",
    "link": "https://t.me/manavivaha_brahmin_groom",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_brahmin_groom",
    "desc": "బ్రాహ్మణ — Brahmin (Grooms). Sub-castes: Vaidiki Brahmin • Niyogi Brahmin • Sistla • Dravida Brahmin • Iyer. నిజమైన profiles, 3 requests FREE, ₹99లో 5.",
    "hashtags": [
      "#Brahmin",
      "#Groom",
      "#TS",
      "#AP"
    ],
    "wave": 2,
    "live": true
  },
  {
    "key": "c_vysya_bride",
    "tier": "L3_CASTE",
    "name": "👰 Arya Vysya • Komati Brides | వైశ్య • కోమటి వధువులు",
    "username": "@manavivaha_vysya_bride",
    "link": "https://t.me/manavivaha_vysya_bride",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_vysya_bride",
    "desc": "వైశ్య • కోమటి — Arya Vysya • Komati (Brides). Sub-castes: Arya Vysya • Komati • Komti • Vaishya • Sadhu Chetty. నిజమైన profiles, 3 requests FREE, ₹99లో 5.",
    "hashtags": [
      "#Vysya",
      "#Bride",
      "#TS",
      "#AP"
    ],
    "wave": 2,
    "live": true
  },
  {
    "key": "c_vysya_groom",
    "tier": "L3_CASTE",
    "name": "🤵 Arya Vysya • Komati Grooms | వైశ్య • కోమటి వరులు",
    "username": "@manavivaha_vysya_groom",
    "link": "https://t.me/manavivaha_vysya_groom",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_vysya_groom",
    "desc": "వైశ్య • కోమటి — Arya Vysya • Komati (Grooms). Sub-castes: Arya Vysya • Komati • Komti • Vaishya • Sadhu Chetty. నిజమైన profiles, 3 requests FREE, ₹99లో 5.",
    "hashtags": [
      "#Vysya",
      "#Groom",
      "#TS",
      "#AP"
    ],
    "wave": 2,
    "live": true
  },
  {
    "key": "c_yadava_goud_bride",
    "tier": "L3_CASTE",
    "name": "👰 Yadava • Goud • Golla Brides | యాదవ • గౌడ • గొల్ల వధువులు",
    "username": "@manavivaha_yadava_goud_bride",
    "link": "https://t.me/manavivaha_yadava_goud_bride",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_yadava_goud_bride",
    "desc": "యాదవ • గౌడ • గొల్ల — Yadava • Goud • Golla (Brides). Sub-castes: Yadav • Yadava • Golla • Kuruma • Kuruba. నిజమైన profiles, 3 requests FREE, ₹99లో 5.",
    "hashtags": [
      "#YadavaGoud",
      "#Bride",
      "#TS",
      "#AP"
    ],
    "wave": 2,
    "live": true
  },
  {
    "key": "c_yadava_goud_groom",
    "tier": "L3_CASTE",
    "name": "🤵 Yadava • Goud • Golla Grooms | యాదవ • గౌడ • గొల్ల వరులు",
    "username": "@manavivaha_yadava_goud_groom",
    "link": "https://t.me/manavivaha_yadava_goud_groom",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_yadava_goud_groom",
    "desc": "యాదవ • గౌడ • గొల్ల — Yadava • Goud • Golla (Grooms). Sub-castes: Yadav • Yadava • Golla • Kuruma • Kuruba. నిజమైన profiles, 3 requests FREE, ₹99లో 5.",
    "hashtags": [
      "#YadavaGoud",
      "#Groom",
      "#TS",
      "#AP"
    ],
    "wave": 2,
    "live": true
  },
  {
    "key": "c_mala_bride",
    "tier": "L3_CASTE",
    "name": "👰 Mala Brides | మాల వధువులు",
    "username": "@manavivaha_mala_bride",
    "link": "https://t.me/manavivaha_mala_bride",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_mala_bride",
    "desc": "మాల — Mala (Brides). Sub-castes: Mala • Mala Ayawaru • Mala Dasari. నిజమైన profiles, 3 requests FREE, ₹99లో 5.",
    "hashtags": [
      "#Mala",
      "#Bride",
      "#TS",
      "#AP"
    ],
    "wave": 2,
    "live": true
  },
  {
    "key": "c_mala_groom",
    "tier": "L3_CASTE",
    "name": "🤵 Mala Grooms | మాల వరులు",
    "username": "@manavivaha_mala_groom",
    "link": "https://t.me/manavivaha_mala_groom",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_mala_groom",
    "desc": "మాల — Mala (Grooms). Sub-castes: Mala • Mala Ayawaru • Mala Dasari. నిజమైన profiles, 3 requests FREE, ₹99లో 5.",
    "hashtags": [
      "#Mala",
      "#Groom",
      "#TS",
      "#AP"
    ],
    "wave": 2,
    "live": true
  },
  {
    "key": "c_madiga_bride",
    "tier": "L3_CASTE",
    "name": "👰 Madiga Brides | మాదిగ వధువులు",
    "username": "@manavivaha_madiga_bride",
    "link": "https://t.me/manavivaha_madiga_bride",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_madiga_bride",
    "desc": "మాదిగ — Madiga (Brides). Sub-castes: Madiga • Madiga Dasu • Mashteen • Madiga Dasari. నిజమైన profiles, 3 requests FREE, ₹99లో 5.",
    "hashtags": [
      "#Madiga",
      "#Bride",
      "#TS",
      "#AP"
    ],
    "wave": 2,
    "live": true
  },
  {
    "key": "c_madiga_groom",
    "tier": "L3_CASTE",
    "name": "🤵 Madiga Grooms | మాదిగ వరులు",
    "username": "@manavivaha_madiga_groom",
    "link": "https://t.me/manavivaha_madiga_groom",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_madiga_groom",
    "desc": "మాదిగ — Madiga (Grooms). Sub-castes: Madiga • Madiga Dasu • Mashteen • Madiga Dasari. నిజమైన profiles, 3 requests FREE, ₹99లో 5.",
    "hashtags": [
      "#Madiga",
      "#Groom",
      "#TS",
      "#AP"
    ],
    "wave": 2,
    "live": true
  },
  {
    "key": "c_viswabrahmana",
    "tier": "L3_CASTE",
    "name": "💍 Viswabrahmana (Viswakarma) Matrimony | విశ్వబ్రాహ్మణ — వధువులు + వరులు",
    "username": "@manavivaha_viswabrahmana",
    "link": "https://t.me/manavivaha_viswabrahmana",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_viswabrahmana",
    "desc": "విశ్వబ్రాహ్మణ — Viswabrahmana (Viswakarma) (Brides + Grooms). Sub-castes: Viswakarma • Viswabrahmin • Viswabrahmana • Kamsali • Kammari. నిజమైన profiles, 3 requests FREE, ₹99లో 5.",
    "hashtags": [
      "#Viswabrahmana",
      "#Bride",
      "#Groom",
      "#TS",
      "#AP"
    ],
    "wave": 2,
    "live": true
  },
  {
    "key": "c_munnuru_kapu",
    "tier": "L3_CASTE",
    "name": "💍 Munnuru Kapu Matrimony | మున్నూరు కాపు — వధువులు + వరులు",
    "username": "@manavivaha_munnuru_kapu",
    "link": "https://t.me/manavivaha_munnuru_kapu",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_munnuru_kapu",
    "desc": "మున్నూరు కాపు — Munnuru Kapu (Brides + Grooms). Sub-castes: Munnuru Kapu • Munnuru. నిజమైన profiles, 3 requests FREE, ₹99లో 5.",
    "hashtags": [
      "#MunnuruKapu",
      "#Bride",
      "#Groom",
      "#TS",
      "#AP"
    ],
    "wave": 2,
    "live": true
  },
  {
    "key": "c_raju_kshatriya",
    "tier": "L3_CASTE",
    "name": "💍 Raju • Kshatriya Matrimony | రాజు • క్షత్రియ — వధువులు + వరులు",
    "username": "@manavivaha_raju_kshatriya",
    "link": "https://t.me/manavivaha_raju_kshatriya",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_raju_kshatriya",
    "desc": "రాజు • క్షత్రియ — Raju • Kshatriya (Brides + Grooms). Sub-castes: Raju • Rajulu • Kshatriya • Vanniyar. నిజమైన profiles, 3 requests FREE, ₹99లో 5.",
    "hashtags": [
      "#RajuKshatriya",
      "#Bride",
      "#Groom",
      "#TS",
      "#AP"
    ],
    "wave": 3,
    "live": true
  },
  {
    "key": "c_padmashali_weavers",
    "tier": "L3_CASTE",
    "name": "💍 Padmashali • Devanga (Weavers) Matrimony | పద్మశాలి • దేవాంగ — వధువులు + వరులు",
    "username": "@manavivaha_padmashali_weavers",
    "link": "https://t.me/manavivaha_padmashali_weavers",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_padmashali_weavers",
    "desc": "పద్మశాలి • దేవాంగ — Padmashali • Devanga (Weavers) (Brides + Grooms). Sub-castes: Padmashali • Padmasali • Sali • Pattusali • Thogata. నిజమైన profiles, 3 requests FREE, ₹99లో 5.",
    "hashtags": [
      "#PadmashaliWeavers",
      "#Bride",
      "#Groom",
      "#TS",
      "#AP"
    ],
    "wave": 3,
    "live": true
  },
  {
    "key": "c_mudiraj",
    "tier": "L3_CASTE",
    "name": "💍 Mudiraj • Tenugollu Matrimony | ముదిరాజ • తెనుగొల్ల — వధువులు + వరులు",
    "username": "@manavivaha_mudiraj",
    "link": "https://t.me/manavivaha_mudiraj",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_mudiraj",
    "desc": "ముదిరాజ • తెనుగొల్ల — Mudiraj • Tenugollu (Brides + Grooms). Sub-castes: Mudiraj • Mudiraju • Mutrasi • Tenugollu. నిజమైన profiles, 3 requests FREE, ₹99లో 5.",
    "hashtags": [
      "#Mudiraj",
      "#Bride",
      "#Groom",
      "#TS",
      "#AP"
    ],
    "wave": 3,
    "live": true
  },
  {
    "key": "c_lambada_banjara",
    "tier": "L3_CASTE",
    "name": "💍 Lambada • Banjara (ST) Matrimony | లంబాడ • బంజార — వధువులు + వరులు",
    "username": "@manavivaha_lambada_banjara",
    "link": "https://t.me/manavivaha_lambada_banjara",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_lambada_banjara",
    "desc": "లంబాడ • బంజార — Lambada • Banjara (ST) (Brides + Grooms). Sub-castes: Lambada • Lambadi • Banjara • Lambani • Sugali. నిజమైన profiles, 3 requests FREE, ₹99లో 5.",
    "hashtags": [
      "#LambadaBanjara",
      "#Bride",
      "#Groom",
      "#TS",
      "#AP"
    ],
    "wave": 3,
    "live": true
  },
  {
    "key": "c_others_bc",
    "tier": "L3_CASTE",
    "name": "💍 Other BC Communities Matrimony | ఇతర BC కులాలు — వధువులు + వరులు",
    "username": "@manavivaha_others_bc",
    "link": "https://t.me/manavivaha_others_bc",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_others_bc",
    "desc": "ఇతర BC కులాలు — Other BC Communities (Brides + Grooms). Sub-castes: Kummara • Kulala • Salivahana • Gandla • Telikula. నిజమైన profiles, 3 requests FREE, ₹99లో 5.",
    "hashtags": [
      "#OthersBc",
      "#Bride",
      "#Groom",
      "#TS",
      "#AP"
    ],
    "wave": 3,
    "live": true
  },
  {
    "key": "c_others_sc",
    "tier": "L3_CASTE",
    "name": "💍 Other SC Communities Matrimony | ఇతర SC కులాలు — వధువులు + వరులు",
    "username": "@manavivaha_others_sc",
    "link": "https://t.me/manavivaha_others_sc",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_others_sc",
    "desc": "ఇతర SC కులాలు — Other SC Communities (Brides + Grooms). Sub-castes: Adi Andhra • Adi Dravida • Arundhatiya • Relli • Arwa Mala. నిజమైన profiles, 3 requests FREE, ₹99లో 5.",
    "hashtags": [
      "#OthersSc",
      "#Bride",
      "#Groom",
      "#TS",
      "#AP"
    ],
    "wave": 3,
    "live": true
  },
  {
    "key": "c_others_st",
    "tier": "L3_CASTE",
    "name": "💍 Other ST Communities Matrimony | ఇతర ST కులాలు — వధువులు + వరులు",
    "username": "@manavivaha_others_st",
    "link": "https://t.me/manavivaha_others_st",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_others_st",
    "desc": "ఇతర ST కులాలు — Other ST Communities (Brides + Grooms). Sub-castes: Koya • Koitur • Gond • Rajgond • Naikpod. నిజమైన profiles, 3 requests FREE, ₹99లో 5.",
    "hashtags": [
      "#OthersSt",
      "#Bride",
      "#Groom",
      "#TS",
      "#AP"
    ],
    "wave": 3,
    "live": true
  }
];

// Register form dropdown — registry nunchi (43 castes + Muslim/Christian/Open)
export const CASTE_OPTIONS: string[] = [
  "Reddy",
  "Kamma",
  "Kapu • Balija • Telaga",
  "Velama",
  "Brahmin",
  "Arya Vysya • Komati",
  "Yadava • Goud • Golla",
  "Mala",
  "Madiga",
  "Viswabrahmana (Viswakarma)",
  "Munnuru Kapu",
  "Raju • Kshatriya",
  "Padmashali • Devanga (Weavers)",
  "Mudiraj • Tenugollu",
  "Lambada • Banjara (ST)",
  "Other BC Communities",
  "Other SC Communities",
  "Other ST Communities",
  "Muslim",
  "Christian",
  "Open"
];
