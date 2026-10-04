// AUTO-GENERATED from backend/channels_config.py — edit registry, run gen_frontend_channels.py
// మన వివాహ | TSAP Matrimony — MASTER CHANNEL REGISTRY

export type Channel = {
  key: string;
  tier: string;
  name: string;
  username: string;
  link: string;
  deepLink: string;
  whatsappLink: string;
  desc: string;
  hashtags: string[];
  wave: number;
  live: boolean;
};

export const CHANNEL_STATS = {"total": 64, "live": 64, "to_create": 0, "by_tier": {"L0_OFFICIAL": 1, "L1_REGION": 5, "L2_RELIGION": 5, "L4_SPECIAL": 8, "L3_CASTE": 45}, "bot": "@telugumatrimony1_bot", "site": "https://manavivaha.in"} as const;

export const CHANNEL_TIERS = [
  {
    "key": "L0_OFFICIAL",
    "label": "Official Hub",
    "icon": "📢",
    "hint": "Announcements and service information",
    "count": 1
  },
  {
    "key": "L1_REGION",
    "label": "Regions",
    "icon": "📍",
    "hint": "Telangana, Andhra Pradesh and NRI directory entries",
    "count": 5
  },
  {
    "key": "L2_RELIGION",
    "label": "Community",
    "icon": "🕊️",
    "hint": "Hindu, Muslim and Christian directory entries",
    "count": 5
  },
  {
    "key": "L3_CASTE",
    "label": "Community-wise",
    "icon": "💍",
    "hint": "Selected community directory entries",
    "count": 45
  },
  {
    "key": "L4_SPECIAL",
    "label": "Special",
    "icon": "⭐",
    "hint": "Additional member-submitted profile categories",
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
    "whatsappLink": "",
    "desc": "మన వివాహ — TS/AP తెలుగు మ్యాట్రిమోని directory and service updates. Profiles are member-submitted; personal details are not independently verified. Check the site for current plans.",
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
    "link": "",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_tsbride",
    "whatsappLink": "",
    "desc": "👰 TS Brides — తెలంగాణ వధువులు. Regional directory for member-submitted profiles. Personal details are not independently verified; availability and posting frequency may vary.",
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
    "whatsappLink": "",
    "desc": "🤵 TS Grooms — తెలంగాణ వరులు. Regional directory for member-submitted profiles. Personal details are not independently verified; availability and posting frequency may vary.",
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
    "whatsappLink": "",
    "desc": "👰 AP Brides — ఆంధ్రా వధువులు. Regional directory for member-submitted profiles. Personal details are not independently verified; availability and posting frequency may vary.",
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
    "link": "",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_apgroom1",
    "whatsappLink": "",
    "desc": "🤵 AP Grooms — ఆంధ్రా వరులు. Regional directory for member-submitted profiles. Personal details are not independently verified; availability and posting frequency may vary.",
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
    "link": "",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_nri",
    "whatsappLink": "",
    "desc": "🌍 NRI Telugu Matrimony — విదేశీ సంబంధాలు. Regional directory for member-submitted profiles. Personal details are not independently verified; availability and posting frequency may vary.",
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
    "link": "",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_hindu",
    "whatsappLink": "",
    "desc": "🕉️ Hindu Matrimony — హిందూ వివాహాలు. వధువులు + వరులు, అన్ని జిల్లాలు. 3 FREE requests, ₹99లో 5.",
    "hashtags": [
      "#Hindu",
      "#TeluguMatrimony"
    ],
    "wave": 1,
    "live": true
  },
  {
    "key": "second_marriage",
    "tier": "L4_SPECIAL",
    "name": "💍 Second Marriage | రెండో పెళ్లి",
    "username": "@manavivaha_second",
    "link": "",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_second",
    "whatsappLink": "",
    "desc": "💍 Second Marriage — రెండో పెళ్లి. Directory for member-submitted profiles in this category. Personal details are not independently verified.",
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
    "link": "",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_able",
    "whatsappLink": "",
    "desc": "♿ Differently-Abled — ప్రత్యేక సామర్థ్యం. Directory for member-submitted profiles in this category. Personal details are not independently verified.",
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
    "link": "",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_govt",
    "whatsappLink": "",
    "desc": "🏛️ Govt Jobs Matrimony — ప్రభుత్వ ఉద్యోగులు. Directory for member-submitted profiles in this category. Personal details are not independently verified.",
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
    "link": "",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_software",
    "whatsappLink": "",
    "desc": "💻 Software Matrimony — సాఫ్ట్‌వేర్ ఉద్యోగులు. Directory for member-submitted profiles in this category. Personal details are not independently verified.",
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
    "link": "",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_professionals",
    "whatsappLink": "",
    "desc": "🩺 Doctors & Teachers Matrimony — వైద్యులు + ఉపాధ్యాయులు. Directory for member-submitted profiles in this category. Personal details are not independently verified.",
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
    "link": "",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_success",
    "whatsappLink": "",
    "desc": "🏆 Success Stories — విజయ గాథలు. Directory for member-submitted profiles in this category. Personal details are not independently verified.",
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
    "link": "",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_alerts",
    "whatsappLink": "",
    "desc": "🚨 Fraud Alerts — మోసం జాగ్రత్త. Directory for member-submitted profiles in this category. Personal details are not independently verified.",
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
    "link": "",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_bureau",
    "whatsappLink": "",
    "desc": "🤝 Bureau / Broker Network — బ్రోకర్ల నెట్‌వర్క్. Directory for member-submitted profiles in this category. Personal details are not independently verified.",
    "hashtags": [
      "#Bureau",
      "#ReferralTerms"
    ],
    "wave": 3,
    "live": true
  },
  {
    "key": "muslim_bride",
    "tier": "L2_RELIGION",
    "name": "👰 Muslim Brides | Muslim వధువులు",
    "username": "@manavivaha_muslim_bride",
    "link": "https://t.me/+e0P4TAGx4XxiMWFl",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_muslim_bride",
    "whatsappLink": "https://whatsapp.com/channel/0029VbEMkZZDDmFUKnTbB31b",
    "desc": "muslim వివాహాలు — వధువులు + వరులు, TS + AP. #Muslim #Bride #TS",
    "hashtags": [
      "#Muslim",
      "#Bride",
      "#TS",
      "#AP"
    ],
    "wave": 1,
    "live": true
  },
  {
    "key": "muslim_groom",
    "tier": "L2_RELIGION",
    "name": "🤵 Muslim Grooms | Muslim వరులు",
    "username": "@manavivaha_muslim_groom",
    "link": "https://t.me/+81zEc2fHMSMxMTBl",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_muslim_groom",
    "whatsappLink": "https://whatsapp.com/channel/0029VbEPpCj0lwgqyXF6vV1a",
    "desc": "muslim వివాహాలు — వధువులు + వరులు, TS + AP. #Muslim #Groom #TS",
    "hashtags": [
      "#Muslim",
      "#Groom",
      "#TS",
      "#AP"
    ],
    "wave": 1,
    "live": true
  },
  {
    "key": "christian_bride",
    "tier": "L2_RELIGION",
    "name": "👰 Christian Brides | Christian వధువులు",
    "username": "@manavivaha_christian_bride",
    "link": "https://t.me/+TVXi2Bzl3F5lMjE9",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_christian_bride",
    "whatsappLink": "https://whatsapp.com/channel/0029Vb8ikeUHgZWViQMiJQ2h",
    "desc": "christian వివాహాలు — వధువులు + వరులు, TS + AP. #Christian #Bride #TS",
    "hashtags": [
      "#Christian",
      "#Bride",
      "#TS",
      "#AP"
    ],
    "wave": 1,
    "live": true
  },
  {
    "key": "christian_groom",
    "tier": "L2_RELIGION",
    "name": "🤵 Christian Grooms | Christian వరులు",
    "username": "@manavivaha_christian_groom",
    "link": "https://t.me/+Fs4NLy-bNu9kYWE1",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_christian_groom",
    "whatsappLink": "https://whatsapp.com/channel/0029Vb9U1HC84OmDO5Q7HM0I",
    "desc": "christian వివాహాలు — వధువులు + వరులు, TS + AP. #Christian #Groom #TS",
    "hashtags": [
      "#Christian",
      "#Groom",
      "#TS",
      "#AP"
    ],
    "wave": 1,
    "live": true
  },
  {
    "key": "c_reddy_bride",
    "tier": "L3_CASTE",
    "name": "👰 Reddy Brides | రెడ్డి వధువులు",
    "username": "@manavivaha_reddy_bride",
    "link": "https://t.me/+DdStvgCtmb83M2Y1",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_reddy_bride",
    "whatsappLink": "https://whatsapp.com/channel/0029VbDpD0N5kg74TpAbIz1R",
    "desc": "రెడ్డి — Reddy (Brides). Sub-castes: Reddy • Pakanati Reddy • Motati Reddy • Gudati Reddy • Deshathi Reddy. Profiles are member-submitted; details are not independently verified.",
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
    "link": "https://t.me/+bvcPm7h34VpmYTU1",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_reddy_groom",
    "whatsappLink": "https://whatsapp.com/channel/0029Vb900wSEFeXrEfkBNQ0S",
    "desc": "రెడ్డి — Reddy (Grooms). Sub-castes: Reddy • Pakanati Reddy • Motati Reddy • Gudati Reddy • Deshathi Reddy. Profiles are member-submitted; details are not independently verified.",
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
    "link": "https://t.me/+oQcIdTKMlINmZWY1",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_kamma_bride",
    "whatsappLink": "https://whatsapp.com/channel/0029VbDlfav2ZjChEwBJTB0g",
    "desc": "కమ్మ — Kamma (Brides). Sub-castes: Kamma • Chowdary • Choudary. Profiles are member-submitted; details are not independently verified.",
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
    "link": "https://t.me/+Y9O_Y8323JA5YjY1",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_kamma_groom",
    "whatsappLink": "https://whatsapp.com/channel/0029Vb8r6ZJFXUueNw3SQU3r",
    "desc": "కమ్మ — Kamma (Grooms). Sub-castes: Kamma • Chowdary • Choudary. Profiles are member-submitted; details are not independently verified.",
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
    "link": "https://t.me/+2ZrBXtORoOo5NTU9",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_kapu_bride",
    "whatsappLink": "https://whatsapp.com/channel/0029VbDyehn30LKVqYhOfn0L",
    "desc": "కాపు • బలిజ • తెలగ — Kapu • Balija • Telaga (Brides). Sub-castes: Kapu • Ontari • Turupu Kapu • Palli Kapu • Balija. Profiles are member-submitted; details are not independently verified.",
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
    "link": "https://t.me/+S6KxwVibmQU0YmZl",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_kapu_groom",
    "whatsappLink": "https://whatsapp.com/channel/0029Vb8le7LLCoX4ClqFvi1J",
    "desc": "కాపు • బలిజ • తెలగ — Kapu • Balija • Telaga (Grooms). Sub-castes: Kapu • Ontari • Turupu Kapu • Palli Kapu • Balija. Profiles are member-submitted; details are not independently verified.",
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
    "link": "https://t.me/+zKQU94Dcl8E2YWY1",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_velama_bride",
    "whatsappLink": "https://whatsapp.com/channel/0029Vb98bMQBFLgUhEG7cq37",
    "desc": "వెలమ — Velama (Brides). Sub-castes: Velama • Padma Velama • Koppula Velama. Profiles are member-submitted; details are not independently verified.",
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
    "link": "https://t.me/+NnMufdM31dc0ZTE1",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_velama_groom",
    "whatsappLink": "https://whatsapp.com/channel/0029Vb9KeAeD38CUvyswkO3O",
    "desc": "వెలమ — Velama (Grooms). Sub-castes: Velama • Padma Velama • Koppula Velama. Profiles are member-submitted; details are not independently verified.",
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
    "link": "https://t.me/+tWfcyC7StAw1ZTU1",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_brahmin_bride",
    "whatsappLink": "https://whatsapp.com/channel/0029VbDba8OLSmbk24oJaf3O",
    "desc": "బ్రాహ్మణ — Brahmin (Brides). Sub-castes: Vaidiki Brahmin • Niyogi Brahmin • Sistla • Dravida Brahmin • Iyer. Profiles are member-submitted; details are not independently verified.",
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
    "link": "https://t.me/+9LByJC4Y-5VmM2Q9",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_brahmin_groom",
    "whatsappLink": "https://whatsapp.com/channel/0029VbEKbbYEgGfQi0Y1ao1g",
    "desc": "బ్రాహ్మణ — Brahmin (Grooms). Sub-castes: Vaidiki Brahmin • Niyogi Brahmin • Sistla • Dravida Brahmin • Iyer. Profiles are member-submitted; details are not independently verified.",
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
    "link": "https://t.me/+ZEoszjmdKmYzMjI1",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_vysya_bride",
    "whatsappLink": "https://whatsapp.com/channel/0029Vb90m6u42DcfPpwvg33K",
    "desc": "వైశ్య • కోమటి — Arya Vysya • Komati (Brides). Sub-castes: Arya Vysya • Komati • Komti • Vaishya • Sadhu Chetty. Profiles are member-submitted; details are not independently verified.",
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
    "link": "https://t.me/+mhviMJhWFTNhZjBl",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_vysya_groom",
    "whatsappLink": "https://whatsapp.com/channel/0029VbDl75K7dmeeZMZA2926",
    "desc": "వైశ్య • కోమటి — Arya Vysya • Komati (Grooms). Sub-castes: Arya Vysya • Komati • Komti • Vaishya • Sadhu Chetty. Profiles are member-submitted; details are not independently verified.",
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
    "name": "👰 Yadava • Golla Brides | యాదవ • గొల్ల వధువులు",
    "username": "@manavivaha_yadava_goud_bride",
    "link": "https://t.me/+kFpsLfat96Y0OWI1",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_yadava_goud_bride",
    "whatsappLink": "https://whatsapp.com/channel/0029Vb8fFvdHVvTcadiqkp2D",
    "desc": "యాదవ • గొల్ల — Yadava • Golla (Brides). Sub-castes: Yadav • Yadava • Golla • Golla (Yadava). Profiles are member-submitted; details are not independently verified.",
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
    "name": "🤵 Yadava • Golla Grooms | యాదవ • గొల్ల వరులు",
    "username": "@manavivaha_yadava_goud_groom",
    "link": "https://t.me/+P4MPYpsRG1Y0Y2U9",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_yadava_goud_groom",
    "whatsappLink": "https://whatsapp.com/channel/0029VbDn2nT7j6g3fdTXgq3A",
    "desc": "యాదవ • గొల్ల — Yadava • Golla (Grooms). Sub-castes: Yadav • Yadava • Golla • Golla (Yadava). Profiles are member-submitted; details are not independently verified.",
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
    "link": "https://t.me/+CCxqPaDSGxUwZjY1",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_mala_bride",
    "whatsappLink": "https://whatsapp.com/channel/0029VbDtETF65yD6fNeGlf2A",
    "desc": "మాల — Mala (Brides). Sub-castes: Mala • Mala Ayawaru • Mala Dasari. Profiles are member-submitted; details are not independently verified.",
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
    "link": "https://t.me/+NLoRFKT5yJE5N2Fl",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_mala_groom",
    "whatsappLink": "https://whatsapp.com/channel/0029Vb8uW65EwEjvgTserz3x",
    "desc": "మాల — Mala (Grooms). Sub-castes: Mala • Mala Ayawaru • Mala Dasari. Profiles are member-submitted; details are not independently verified.",
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
    "link": "https://t.me/+32QEp-PKOBVhODY1",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_madiga_bride",
    "whatsappLink": "https://whatsapp.com/channel/0029Vb94k5RKAwEkRYeW7m1C",
    "desc": "మాదిగ — Madiga (Brides). Sub-castes: Madiga • Madiga Dasu • Mashteen • Madiga Dasari. Profiles are member-submitted; details are not independently verified.",
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
    "link": "https://t.me/+_oenYepHzlQzYjdl",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_madiga_groom",
    "whatsappLink": "https://whatsapp.com/channel/0029VbDwFWs60eBX0hvdW93T",
    "desc": "మాదిగ — Madiga (Grooms). Sub-castes: Madiga • Madiga Dasu • Mashteen • Madiga Dasari. Profiles are member-submitted; details are not independently verified.",
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
    "key": "c_viswabrahmana_bride",
    "tier": "L3_CASTE",
    "name": "👰 Viswabrahmana (Viswakarma) Brides | విశ్వబ్రాహ్మణ వధువులు",
    "username": "@manavivaha_viswabrahmana_bride",
    "link": "https://t.me/+lkhMUXqcHdI4M2M1",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_viswabrahmana_bride",
    "whatsappLink": "https://whatsapp.com/channel/0029Vb8MKAKBA1f7VLuIaX2Y",
    "desc": "విశ్వబ్రాహ్మణ — Viswabrahmana (Viswakarma) (Brides). Sub-castes: Viswakarma • Viswabrahmin • Viswabrahmana • Kamsali • Kammari. Profiles are member-submitted; details are not independently verified.",
    "hashtags": [
      "#Viswabrahmana",
      "#Bride",
      "#TS",
      "#AP"
    ],
    "wave": 2,
    "live": true
  },
  {
    "key": "c_viswabrahmana_groom",
    "tier": "L3_CASTE",
    "name": "🤵 Viswabrahmana (Viswakarma) Grooms | విశ్వబ్రాహ్మణ వరులు",
    "username": "@manavivaha_viswabrahmana_groom",
    "link": "https://t.me/+qBJlaAISvXM4YWU9",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_viswabrahmana_groom",
    "whatsappLink": "https://whatsapp.com/channel/0029VbDdWlb8aKvK4Rddz32k",
    "desc": "విశ్వబ్రాహ్మణ — Viswabrahmana (Viswakarma) (Grooms). Sub-castes: Viswakarma • Viswabrahmin • Viswabrahmana • Kamsali • Kammari. Profiles are member-submitted; details are not independently verified.",
    "hashtags": [
      "#Viswabrahmana",
      "#Groom",
      "#TS",
      "#AP"
    ],
    "wave": 2,
    "live": true
  },
  {
    "key": "c_munnuru_kapu_bride",
    "tier": "L3_CASTE",
    "name": "👰 Munnuru Kapu Brides | మున్నూరు కాపు వధువులు",
    "username": "@manavivaha_munnuru_kapu_bride",
    "link": "https://t.me/+G9i5zZ1AXfJkNzE1",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_munnuru_kapu_bride",
    "whatsappLink": "https://whatsapp.com/channel/0029VbECYss60eBcdKqXag3D",
    "desc": "మున్నూరు కాపు — Munnuru Kapu (Brides). Sub-castes: Munnuru Kapu • Munnuru. Profiles are member-submitted; details are not independently verified.",
    "hashtags": [
      "#MunnuruKapu",
      "#Bride",
      "#TS",
      "#AP"
    ],
    "wave": 2,
    "live": true
  },
  {
    "key": "c_munnuru_kapu_groom",
    "tier": "L3_CASTE",
    "name": "🤵 Munnuru Kapu Grooms | మున్నూరు కాపు వరులు",
    "username": "@manavivaha_munnuru_kapu_groom",
    "link": "https://t.me/+8aF99CIpwwo5M2Fl",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_munnuru_kapu_groom",
    "whatsappLink": "https://whatsapp.com/channel/0029VbD3XJa4CrfknKw76i0e",
    "desc": "మున్నూరు కాపు — Munnuru Kapu (Grooms). Sub-castes: Munnuru Kapu • Munnuru. Profiles are member-submitted; details are not independently verified.",
    "hashtags": [
      "#MunnuruKapu",
      "#Groom",
      "#TS",
      "#AP"
    ],
    "wave": 2,
    "live": true
  },
  {
    "key": "c_raju_kshatriya_bride",
    "tier": "L3_CASTE",
    "name": "👰 Raju • Kshatriya Brides | రాజు • క్షత్రియ వధువులు",
    "username": "@manavivaha_raju_kshatriya_bride",
    "link": "https://t.me/+m5LPLPhkIpw4ZGI9",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_raju_kshatriya_bride",
    "whatsappLink": "https://whatsapp.com/channel/0029VbEEoWhJJhzenO8voU1e",
    "desc": "రాజు • క్షత్రియ — Raju • Kshatriya (Brides). Sub-castes: Raju • Rajulu • Kshatriya • Vanniyar. Profiles are member-submitted; details are not independently verified.",
    "hashtags": [
      "#RajuKshatriya",
      "#Bride",
      "#TS",
      "#AP"
    ],
    "wave": 3,
    "live": true
  },
  {
    "key": "c_raju_kshatriya_groom",
    "tier": "L3_CASTE",
    "name": "🤵 Raju • Kshatriya Grooms | రాజు • క్షత్రియ వరులు",
    "username": "@manavivaha_raju_kshatriya_groom",
    "link": "https://t.me/+szuO6inGJ3MyZTFl",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_raju_kshatriya_groom",
    "whatsappLink": "https://whatsapp.com/channel/0029VbDnKz45q08XGV69LJ0f",
    "desc": "రాజు • క్షత్రియ — Raju • Kshatriya (Grooms). Sub-castes: Raju • Rajulu • Kshatriya • Vanniyar. Profiles are member-submitted; details are not independently verified.",
    "hashtags": [
      "#RajuKshatriya",
      "#Groom",
      "#TS",
      "#AP"
    ],
    "wave": 3,
    "live": true
  },
  {
    "key": "c_padmashali_weavers_bride",
    "tier": "L3_CASTE",
    "name": "👰 Padmashali • Devanga (Weavers) Brides | పద్మశాలి • దేవాంగ వధువులు",
    "username": "@manavivaha_padmashali_weavers_br",
    "link": "https://t.me/+WHy86f07cdFiMDY1",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_padmashali_weavers_br",
    "whatsappLink": "https://whatsapp.com/channel/0029Vb8tDgi8Pgs8bBhmwK3H",
    "desc": "పద్మశాలి • దేవాంగ — Padmashali • Devanga (Weavers) (Brides). Sub-castes: Padmashali • Padmasali • Sali • Pattusali • Thogata. Profiles are member-submitted; details are not independently verified.",
    "hashtags": [
      "#PadmashaliWeavers",
      "#Bride",
      "#TS",
      "#AP"
    ],
    "wave": 3,
    "live": true
  },
  {
    "key": "c_padmashali_weavers_groom",
    "tier": "L3_CASTE",
    "name": "🤵 Padmashali • Devanga (Weavers) Grooms | పద్మశాలి • దేవాంగ వరులు",
    "username": "@manavivaha_padmashali_weavers_gr",
    "link": "https://t.me/+pxZfSVa1rOEzN2Fl",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_padmashali_weavers_gr",
    "whatsappLink": "https://whatsapp.com/channel/0029Vb9ASfp2phHTNpBVIn1U",
    "desc": "పద్మశాలి • దేవాంగ — Padmashali • Devanga (Weavers) (Grooms). Sub-castes: Padmashali • Padmasali • Sali • Pattusali • Thogata. Profiles are member-submitted; details are not independently verified.",
    "hashtags": [
      "#PadmashaliWeavers",
      "#Groom",
      "#TS",
      "#AP"
    ],
    "wave": 3,
    "live": true
  },
  {
    "key": "c_mudiraj_bride",
    "tier": "L3_CASTE",
    "name": "👰 Mudiraj • Tenugollu Brides | ముదిరాజ • తెనుగొల్ల వధువులు",
    "username": "@manavivaha_mudiraj_bride",
    "link": "https://t.me/+XebU3qM_WR84YTdl",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_mudiraj_bride",
    "whatsappLink": "https://whatsapp.com/channel/0029VbD5Jy27Noa6foFiXS40",
    "desc": "ముదిరాజ • తెనుగొల్ల — Mudiraj • Tenugollu (Brides). Sub-castes: Mudiraj • Mudiraju • Mutrasi • Tenugollu. Profiles are member-submitted; details are not independently verified.",
    "hashtags": [
      "#Mudiraj",
      "#Bride",
      "#TS",
      "#AP"
    ],
    "wave": 3,
    "live": true
  },
  {
    "key": "c_mudiraj_groom",
    "tier": "L3_CASTE",
    "name": "🤵 Mudiraj • Tenugollu Grooms | ముదిరాజ • తెనుగొల్ల వరులు",
    "username": "@manavivaha_mudiraj_groom",
    "link": "https://t.me/+BMpylXf9XxcyZDBl",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_mudiraj_groom",
    "whatsappLink": "https://whatsapp.com/channel/0029VbDrXXxATRSsOCpkZD2J",
    "desc": "ముదిరాజ • తెనుగొల్ల — Mudiraj • Tenugollu (Grooms). Sub-castes: Mudiraj • Mudiraju • Mutrasi • Tenugollu. Profiles are member-submitted; details are not independently verified.",
    "hashtags": [
      "#Mudiraj",
      "#Groom",
      "#TS",
      "#AP"
    ],
    "wave": 3,
    "live": true
  },
  {
    "key": "c_goud_bride",
    "tier": "L3_CASTE",
    "name": "👰 Goud Brides | గౌడ వధువులు",
    "username": "@manavivaha_goud_bride",
    "link": "https://t.me/+oF8K9j6BCzE2YjVl",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_goud_bride",
    "whatsappLink": "https://whatsapp.com/channel/0029VbE4EXK42DciVXYopI2h",
    "desc": "గౌడ — Goud (Brides). Sub-castes: Goud • Gouda • Ediga • Gamalla • Idiga. Profiles are member-submitted; details are not independently verified.",
    "hashtags": [
      "#Goud",
      "#Bride",
      "#TS",
      "#AP"
    ],
    "wave": 3,
    "live": true
  },
  {
    "key": "c_goud_groom",
    "tier": "L3_CASTE",
    "name": "🤵 Goud Grooms | గౌడ వరులు",
    "username": "@manavivaha_goud_groom",
    "link": "https://t.me/+HmRI0uILZ-NkY2Y9",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_goud_groom",
    "whatsappLink": "https://whatsapp.com/channel/0029Vb8opZw6hENsqAzGtY3R",
    "desc": "గౌడ — Goud (Grooms). Sub-castes: Goud • Gouda • Ediga • Gamalla • Idiga. Profiles are member-submitted; details are not independently verified.",
    "hashtags": [
      "#Goud",
      "#Groom",
      "#TS",
      "#AP"
    ],
    "wave": 3,
    "live": true
  },
  {
    "key": "c_kuruma_bride",
    "tier": "L3_CASTE",
    "name": "👰 Kuruma Brides | కురుమ వధువులు",
    "username": "@manavivaha_kuruma_bride",
    "link": "https://t.me/+W_8aTJ-3B-hhOGFl",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_kuruma_bride",
    "whatsappLink": "https://whatsapp.com/channel/0029Vb939bo5q08lIoSzFk0B",
    "desc": "కురుమ — Kuruma (Brides). Sub-castes: Kuruma • Kuruba • Kuruba (Golla) • Kuruva • Gorrela. Profiles are member-submitted; details are not independently verified.",
    "hashtags": [
      "#Kuruma",
      "#Bride",
      "#TS",
      "#AP"
    ],
    "wave": 3,
    "live": true
  },
  {
    "key": "c_kuruma_groom",
    "tier": "L3_CASTE",
    "name": "🤵 Kuruma Grooms | కురుమ వరులు",
    "username": "@manavivaha_kuruma_groom",
    "link": "https://t.me/+YOoCmdgS_3thY2Jl",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_kuruma_groom",
    "whatsappLink": "https://whatsapp.com/channel/0029Vb8fDPRGU3BFVKlVOU3X",
    "desc": "కురుమ — Kuruma (Grooms). Sub-castes: Kuruma • Kuruba • Kuruba (Golla) • Kuruva • Gorrela. Profiles are member-submitted; details are not independently verified.",
    "hashtags": [
      "#Kuruma",
      "#Groom",
      "#TS",
      "#AP"
    ],
    "wave": 3,
    "live": true
  },
  {
    "key": "c_rajaka_bride",
    "tier": "L3_CASTE",
    "name": "👰 Rajaka Brides | రజక వధువులు",
    "username": "@manavivaha_rajaka_bride",
    "link": "https://t.me/+uHfkj71Js_c1ZWJl",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_rajaka_bride",
    "whatsappLink": "https://whatsapp.com/channel/0029Vb9UvFM1SWszlk3KXM2U",
    "desc": "రజక — Rajaka (Brides). Sub-castes: Rajaka • Chakali • Vannar. Profiles are member-submitted; details are not independently verified.",
    "hashtags": [
      "#Rajaka",
      "#Bride",
      "#TS",
      "#AP"
    ],
    "wave": 3,
    "live": true
  },
  {
    "key": "c_rajaka_groom",
    "tier": "L3_CASTE",
    "name": "🤵 Rajaka Grooms | రజక వరులు",
    "username": "@manavivaha_rajaka_groom",
    "link": "https://t.me/+4BStez9IoSAyNmQ1",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_rajaka_groom",
    "whatsappLink": "",
    "desc": "రజక — Rajaka (Grooms). Sub-castes: Rajaka • Chakali • Vannar. Profiles are member-submitted; details are not independently verified.",
    "hashtags": [
      "#Rajaka",
      "#Groom",
      "#TS",
      "#AP"
    ],
    "wave": 3,
    "live": true
  },
  {
    "key": "c_kummari_bride",
    "tier": "L3_CASTE",
    "name": "👰 Kummari Brides | కుమ్మరి వధువులు",
    "username": "@manavivaha_kummari_bride",
    "link": "https://t.me/+IilG4JDaWm9iMmE1",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_kummari_bride",
    "whatsappLink": "https://whatsapp.com/channel/0029VbDhazI0wajxHXSCDh1t",
    "desc": "కుమ్మరి — Kummari (Brides). Sub-castes: Kummari • Kummara • Kulala • Kumbhara. Profiles are member-submitted; details are not independently verified.",
    "hashtags": [
      "#Kummari",
      "#Bride",
      "#TS",
      "#AP"
    ],
    "wave": 3,
    "live": true
  },
  {
    "key": "c_kummari_groom",
    "tier": "L3_CASTE",
    "name": "🤵 Kummari Grooms | కుమ్మరి వరులు",
    "username": "@manavivaha_kummari_groom",
    "link": "https://t.me/+Z9UFsOSSY2szMjFl",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_kummari_groom",
    "whatsappLink": "https://whatsapp.com/channel/0029VbDizeQG8l55W64bVj2V",
    "desc": "కుమ్మరి — Kummari (Grooms). Sub-castes: Kummari • Kummara • Kulala • Kumbhara. Profiles are member-submitted; details are not independently verified.",
    "hashtags": [
      "#Kummari",
      "#Groom",
      "#TS",
      "#AP"
    ],
    "wave": 3,
    "live": true
  },
  {
    "key": "c_perika_bride",
    "tier": "L3_CASTE",
    "name": "👰 Perika Brides | పెరిక వధువులు",
    "username": "@manavivaha_perika_bride",
    "link": "https://t.me/+7BHlq1k9R7NhYWQ1",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_perika_bride",
    "whatsappLink": "https://whatsapp.com/channel/0029VbDV28JIyPtYs0DDQ92f",
    "desc": "పెరిక — Perika (Brides). Sub-castes: Perika. Profiles are member-submitted; details are not independently verified.",
    "hashtags": [
      "#Perika",
      "#Bride",
      "#TS",
      "#AP"
    ],
    "wave": 3,
    "live": true
  },
  {
    "key": "c_perika_groom",
    "tier": "L3_CASTE",
    "name": "🤵 Perika Grooms | పెరిక వరులు",
    "username": "@manavivaha_perika_groom",
    "link": "https://t.me/+MXvizI45UNFmOTE1",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_perika_groom",
    "whatsappLink": "https://whatsapp.com/channel/0029Vb8ceI13gvWdFcRSYW3y",
    "desc": "పెరిక — Perika (Grooms). Sub-castes: Perika. Profiles are member-submitted; details are not independently verified.",
    "hashtags": [
      "#Perika",
      "#Groom",
      "#TS",
      "#AP"
    ],
    "wave": 3,
    "live": true
  },
  {
    "key": "c_lambada_banjara_bride",
    "tier": "L3_CASTE",
    "name": "👰 Lambada • Banjara (ST) Brides | లంబాడ • బంజార వధువులు",
    "username": "@manavivaha_lambada_banjara_bride",
    "link": "https://t.me/+T7ybZrw8VYQ5NTRl",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_lambada_banjara_bride",
    "whatsappLink": "https://whatsapp.com/channel/0029VbD3CW6HVvTbgyWWvX3r",
    "desc": "లంబాడ • బంజార — Lambada • Banjara (ST) (Brides). Sub-castes: Lambada • Lambadi • Banjara • Lambani • Sugali. Profiles are member-submitted; details are not independently verified.",
    "hashtags": [
      "#LambadaBanjara",
      "#Bride",
      "#TS",
      "#AP"
    ],
    "wave": 3,
    "live": true
  },
  {
    "key": "c_lambada_banjara_groom",
    "tier": "L3_CASTE",
    "name": "🤵 Lambada • Banjara (ST) Grooms | లంబాడ • బంజార వరులు",
    "username": "@manavivaha_lambada_banjara_groom",
    "link": "https://t.me/+jOPvVBAKURgyY2Fl",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_lambada_banjara_groom",
    "whatsappLink": "https://whatsapp.com/channel/0029Vb902btGE56gSl4iV10H",
    "desc": "లంబాడ • బంజార — Lambada • Banjara (ST) (Grooms). Sub-castes: Lambada • Lambadi • Banjara • Lambani • Sugali. Profiles are member-submitted; details are not independently verified.",
    "hashtags": [
      "#LambadaBanjara",
      "#Groom",
      "#TS",
      "#AP"
    ],
    "wave": 3,
    "live": true
  },
  {
    "key": "c_others_bc_bride",
    "tier": "L3_CASTE",
    "name": "👰 Other BC Communities Brides | ఇతర BC కులాలు వధువులు",
    "username": "@manavivaha_others_bc_bride",
    "link": "https://t.me/+Y4lpZRyN2ZxiNmI1",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_others_bc_bride",
    "whatsappLink": "https://whatsapp.com/channel/0029VbDz6odI7Be7YAuc1e3w",
    "desc": "ఇతర BC కులాలు — Other BC Communities (Brides). Sub-castes: Salivahana • Gandla • Telikula • Uppara • Sagara. Profiles are member-submitted; details are not independently verified.",
    "hashtags": [
      "#OthersBc",
      "#Bride",
      "#TS",
      "#AP"
    ],
    "wave": 3,
    "live": true
  },
  {
    "key": "c_others_bc_groom",
    "tier": "L3_CASTE",
    "name": "🤵 Other BC Communities Grooms | ఇతర BC కులాలు వరులు",
    "username": "@manavivaha_others_bc_groom",
    "link": "https://t.me/+iyf8LbsJyCo3ZGFl",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_others_bc_groom",
    "whatsappLink": "https://whatsapp.com/channel/0029VbE9dOxDDmFZvsPGd31I",
    "desc": "ఇతర BC కులాలు — Other BC Communities (Grooms). Sub-castes: Salivahana • Gandla • Telikula • Uppara • Sagara. Profiles are member-submitted; details are not independently verified.",
    "hashtags": [
      "#OthersBc",
      "#Groom",
      "#TS",
      "#AP"
    ],
    "wave": 3,
    "live": true
  },
  {
    "key": "c_others_sc_bride",
    "tier": "L3_CASTE",
    "name": "👰 Other SC Communities Brides | ఇతర SC కులాలు వధువులు",
    "username": "@manavivaha_others_sc_bride",
    "link": "https://t.me/+UfRB95ZYdSBhZmQ1",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_others_sc_bride",
    "whatsappLink": "https://whatsapp.com/channel/0029Vb8oMp4J93we9t58Sr0m",
    "desc": "ఇతర SC కులాలు — Other SC Communities (Brides). Sub-castes: Adi Andhra • Adi Dravida • Arundhatiya • Relli • Arwa Mala. Profiles are member-submitted; details are not independently verified.",
    "hashtags": [
      "#OthersSc",
      "#Bride",
      "#TS",
      "#AP"
    ],
    "wave": 3,
    "live": true
  },
  {
    "key": "c_others_sc_groom",
    "tier": "L3_CASTE",
    "name": "🤵 Other SC Communities Grooms | ఇతర SC కులాలు వరులు",
    "username": "@manavivaha_others_sc_groom",
    "link": "https://t.me/+3w08vTaC3O42N2U9",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_others_sc_groom",
    "whatsappLink": "https://whatsapp.com/channel/0029VbDNWfI002TDBUfbFp2A",
    "desc": "ఇతర SC కులాలు — Other SC Communities (Grooms). Sub-castes: Adi Andhra • Adi Dravida • Arundhatiya • Relli • Arwa Mala. Profiles are member-submitted; details are not independently verified.",
    "hashtags": [
      "#OthersSc",
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
    "link": "",
    "deepLink": "https://t.me/telugumatrimony1_bot?start=ch_manavivaha_others_st",
    "whatsappLink": "",
    "desc": "ఇతర ST కులాలు — Other ST Communities (Brides + Grooms). Sub-castes: Koya • Koitur • Gond • Rajgond • Naikpod. Profiles are member-submitted; details are not independently verified.",
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

// Hindu-only register form dropdown — registry castes + Open
export const CASTE_OPTIONS: string[] = [
  "Arya Vysya • Komati",
  "Brahmin",
  "Goud",
  "Kamma",
  "Kapu • Balija • Telaga",
  "Kummari",
  "Kuruma",
  "Lambada • Banjara (ST)",
  "Madiga",
  "Mala",
  "Mudiraj • Tenugollu",
  "Munnuru Kapu",
  "Open",
  "Other BC Communities",
  "Other SC Communities",
  "Other ST Communities",
  "Padmashali • Devanga (Weavers)",
  "Perika",
  "Rajaka",
  "Raju • Kshatriya",
  "Reddy",
  "Velama",
  "Viswabrahmana (Viswakarma)",
  "Yadava • Golla"
];
