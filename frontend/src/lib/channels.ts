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
  routingEligible: boolean;
  externalStatusChecked: boolean;
};

export const CHANNEL_STATS = {"total": 91, "routing_eligible": 0, "not_routing_eligible": 91, "by_tier": {"L1_REGION": 5, "L2_RELIGION": 12, "L3_CASTE": 74}, "site": "https://manavivaha.in", "external_status_checked": false} as const;

export const CHANNEL_TIERS = [
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
    "hint": "Religion and community directory entries",
    "count": 12
  },
  {
    "key": "L3_CASTE",
    "label": "Community-wise",
    "icon": "💍",
    "hint": "Selected community directory entries",
    "count": 74
  }
] as const;

export const ALL_CHANNELS: Channel[] = [
  {
    "key": "ts_bride",
    "tier": "L1_REGION",
    "name": "👰 TS Brides | తెలంగాణ వధువులు",
    "username": "@TSBRIDE",
    "link": "https://t.me/TSBRIDE",
    "deepLink": "",
    "whatsappLink": "",
    "desc": "👰 TS Brides — తెలంగాణ వధువులు. Regional directory for member-submitted profiles. Personal details are not independently verified; availability and posting frequency may vary.",
    "hashtags": [
      "#TSBride",
      "#Telangana",
      "#Ammaayi"
    ],
    "wave": 1,
    "routingEligible": false,
    "externalStatusChecked": false
  },
  {
    "key": "ts_groom",
    "tier": "L1_REGION",
    "name": "🤵 TS Grooms | తెలంగాణ వరులు",
    "username": "@TSGROOM1",
    "link": "https://t.me/TSGROOM1",
    "deepLink": "",
    "whatsappLink": "",
    "desc": "🤵 TS Grooms — తెలంగాణ వరులు. Regional directory for member-submitted profiles. Personal details are not independently verified; availability and posting frequency may vary.",
    "hashtags": [
      "#TSGroom",
      "#Telangana",
      "#Abbaayi"
    ],
    "wave": 1,
    "routingEligible": false,
    "externalStatusChecked": false
  },
  {
    "key": "ap_bride",
    "tier": "L1_REGION",
    "name": "👰 AP Brides | ఆంధ్రా వధువులు",
    "username": "@APBRIDE",
    "link": "https://t.me/APBRIDE",
    "deepLink": "",
    "whatsappLink": "",
    "desc": "👰 AP Brides — ఆంధ్రా వధువులు. Regional directory for member-submitted profiles. Personal details are not independently verified; availability and posting frequency may vary.",
    "hashtags": [
      "#APBride",
      "#AndhraPradesh"
    ],
    "wave": 1,
    "routingEligible": false,
    "externalStatusChecked": false
  },
  {
    "key": "ap_groom",
    "tier": "L1_REGION",
    "name": "🤵 AP Grooms | ఆంధ్రా వరులు",
    "username": "@APGROOM1",
    "link": "https://t.me/APGROOM1",
    "deepLink": "",
    "whatsappLink": "",
    "desc": "🤵 AP Grooms — ఆంధ్రా వరులు. Regional directory for member-submitted profiles. Personal details are not independently verified; availability and posting frequency may vary.",
    "hashtags": [
      "#APGroom",
      "#AndhraPradesh"
    ],
    "wave": 1,
    "routingEligible": false,
    "externalStatusChecked": false
  },
  {
    "key": "nri_global",
    "tier": "L1_REGION",
    "name": "🌍 NRI Telugu Matrimony | విదేశీ సంబంధాలు",
    "username": "",
    "link": "",
    "deepLink": "",
    "whatsappLink": "",
    "desc": "🌍 NRI Telugu Matrimony — విదేశీ సంబంధాలు. Regional directory for member-submitted profiles. Personal details are not independently verified; availability and posting frequency may vary.",
    "hashtags": [
      "#NRI",
      "#TeluguAbroad",
      "#GlobalTelugu"
    ],
    "wave": 2,
    "routingEligible": false,
    "externalStatusChecked": false
  },
  {
    "key": "muslim_bride",
    "tier": "L2_RELIGION",
    "name": "👰 Muslim Brides | Muslim వధువులు",
    "username": "",
    "link": "https://t.me/+e0P4TAGx4XxiMWFl",
    "deepLink": "",
    "whatsappLink": "https://whatsapp.com/channel/0029VbEMkZZDDmFUKnTbB31b",
    "desc": "muslim వివాహాలు — వధువులు + వరులు, TS + AP. #Muslim #Bride #TS",
    "hashtags": [
      "#Muslim",
      "#Bride",
      "#TS",
      "#AP"
    ],
    "wave": 1,
    "routingEligible": false,
    "externalStatusChecked": false
  },
  {
    "key": "muslim_groom",
    "tier": "L2_RELIGION",
    "name": "🤵 Muslim Grooms | Muslim వరులు",
    "username": "",
    "link": "https://t.me/+81zEc2fHMSMxMTBl",
    "deepLink": "",
    "whatsappLink": "https://whatsapp.com/channel/0029VbEPpCj0lwgqyXF6vV1a",
    "desc": "muslim వివాహాలు — వధువులు + వరులు, TS + AP. #Muslim #Groom #TS",
    "hashtags": [
      "#Muslim",
      "#Groom",
      "#TS",
      "#AP"
    ],
    "wave": 1,
    "routingEligible": false,
    "externalStatusChecked": false
  },
  {
    "key": "christian_bride",
    "tier": "L2_RELIGION",
    "name": "👰 Christian Brides | Christian వధువులు",
    "username": "",
    "link": "https://t.me/+TVXi2Bzl3F5lMjE9",
    "deepLink": "",
    "whatsappLink": "https://whatsapp.com/channel/0029Vb8ikeUHgZWViQMiJQ2h",
    "desc": "christian వివాహాలు — వధువులు + వరులు, TS + AP. #Christian #Bride #TS",
    "hashtags": [
      "#Christian",
      "#Bride",
      "#TS",
      "#AP"
    ],
    "wave": 1,
    "routingEligible": false,
    "externalStatusChecked": false
  },
  {
    "key": "christian_groom",
    "tier": "L2_RELIGION",
    "name": "🤵 Christian Grooms | Christian వరులు",
    "username": "",
    "link": "https://t.me/+Fs4NLy-bNu9kYWE1",
    "deepLink": "",
    "whatsappLink": "https://whatsapp.com/channel/0029Vb9U1HC84OmDO5Q7HM0I",
    "desc": "christian వివాహాలు — వధువులు + వరులు, TS + AP. #Christian #Groom #TS",
    "hashtags": [
      "#Christian",
      "#Groom",
      "#TS",
      "#AP"
    ],
    "wave": 1,
    "routingEligible": false,
    "externalStatusChecked": false
  },
  {
    "key": "sikh_bride",
    "tier": "L2_RELIGION",
    "name": "👰 Sikh Brides | Sikh వధువులు",
    "username": "",
    "link": "",
    "deepLink": "",
    "whatsappLink": "",
    "desc": "sikh వివాహాలు — వధువులు + వరులు, TS + AP. #Sikh #Bride #TS",
    "hashtags": [
      "#Sikh",
      "#Bride",
      "#TS",
      "#AP"
    ],
    "wave": 1,
    "routingEligible": false,
    "externalStatusChecked": false
  },
  {
    "key": "sikh_groom",
    "tier": "L2_RELIGION",
    "name": "🤵 Sikh Grooms | Sikh వరులు",
    "username": "",
    "link": "",
    "deepLink": "",
    "whatsappLink": "",
    "desc": "sikh వివాహాలు — వధువులు + వరులు, TS + AP. #Sikh #Groom #TS",
    "hashtags": [
      "#Sikh",
      "#Groom",
      "#TS",
      "#AP"
    ],
    "wave": 1,
    "routingEligible": false,
    "externalStatusChecked": false
  },
  {
    "key": "jain_bride",
    "tier": "L2_RELIGION",
    "name": "👰 Jain Brides | Jain వధువులు",
    "username": "",
    "link": "",
    "deepLink": "",
    "whatsappLink": "",
    "desc": "jain వివాహాలు — వధువులు + వరులు, TS + AP. #Jain #Bride #TS",
    "hashtags": [
      "#Jain",
      "#Bride",
      "#TS",
      "#AP"
    ],
    "wave": 1,
    "routingEligible": false,
    "externalStatusChecked": false
  },
  {
    "key": "jain_groom",
    "tier": "L2_RELIGION",
    "name": "🤵 Jain Grooms | Jain వరులు",
    "username": "",
    "link": "",
    "deepLink": "",
    "whatsappLink": "",
    "desc": "jain వివాహాలు — వధువులు + వరులు, TS + AP. #Jain #Groom #TS",
    "hashtags": [
      "#Jain",
      "#Groom",
      "#TS",
      "#AP"
    ],
    "wave": 1,
    "routingEligible": false,
    "externalStatusChecked": false
  },
  {
    "key": "buddhist_bride",
    "tier": "L2_RELIGION",
    "name": "👰 Buddhist Brides | Buddhist వధువులు",
    "username": "",
    "link": "",
    "deepLink": "",
    "whatsappLink": "",
    "desc": "buddhist వివాహాలు — వధువులు + వరులు, TS + AP. #Buddhist #Bride #TS",
    "hashtags": [
      "#Buddhist",
      "#Bride",
      "#TS",
      "#AP"
    ],
    "wave": 1,
    "routingEligible": false,
    "externalStatusChecked": false
  },
  {
    "key": "buddhist_groom",
    "tier": "L2_RELIGION",
    "name": "🤵 Buddhist Grooms | Buddhist వరులు",
    "username": "",
    "link": "",
    "deepLink": "",
    "whatsappLink": "",
    "desc": "buddhist వివాహాలు — వధువులు + వరులు, TS + AP. #Buddhist #Groom #TS",
    "hashtags": [
      "#Buddhist",
      "#Groom",
      "#TS",
      "#AP"
    ],
    "wave": 1,
    "routingEligible": false,
    "externalStatusChecked": false
  },
  {
    "key": "other_religion_bride",
    "tier": "L2_RELIGION",
    "name": "👰 Other Religion Brides | Other_Religion వధువులు",
    "username": "",
    "link": "",
    "deepLink": "",
    "whatsappLink": "",
    "desc": "other_religion వివాహాలు — వధువులు + వరులు, TS + AP. #Other #Bride #TS",
    "hashtags": [
      "#Other",
      "#Bride",
      "#TS",
      "#AP"
    ],
    "wave": 1,
    "routingEligible": false,
    "externalStatusChecked": false
  },
  {
    "key": "other_religion_groom",
    "tier": "L2_RELIGION",
    "name": "🤵 Other Religion Grooms | Other_Religion వరులు",
    "username": "",
    "link": "",
    "deepLink": "",
    "whatsappLink": "",
    "desc": "other_religion వివాహాలు — వధువులు + వరులు, TS + AP. #Other #Groom #TS",
    "hashtags": [
      "#Other",
      "#Groom",
      "#TS",
      "#AP"
    ],
    "wave": 1,
    "routingEligible": false,
    "externalStatusChecked": false
  },
  {
    "key": "c_reddy_bride",
    "tier": "L3_CASTE",
    "name": "👰 Reddy Brides | రెడ్డి వధువులు",
    "username": "",
    "link": "https://t.me/+DdStvgCtmb83M2Y1",
    "deepLink": "",
    "whatsappLink": "https://whatsapp.com/channel/0029VbDpD0N5kg74TpAbIz1R",
    "desc": "రెడ్డి — Reddy (Brides). Sub-castes: Reddy • Pakanati Reddy • Motati Reddy • Gudati Reddy • Deshathi Reddy. Profiles are member-submitted; details are not independently verified.",
    "hashtags": [
      "#Reddy",
      "#Bride",
      "#TS",
      "#AP"
    ],
    "wave": 1,
    "routingEligible": false,
    "externalStatusChecked": false
  },
  {
    "key": "c_reddy_groom",
    "tier": "L3_CASTE",
    "name": "🤵 Reddy Grooms | రెడ్డి వరులు",
    "username": "",
    "link": "https://t.me/+bvcPm7h34VpmYTU1",
    "deepLink": "",
    "whatsappLink": "https://whatsapp.com/channel/0029Vb900wSEFeXrEfkBNQ0S",
    "desc": "రెడ్డి — Reddy (Grooms). Sub-castes: Reddy • Pakanati Reddy • Motati Reddy • Gudati Reddy • Deshathi Reddy. Profiles are member-submitted; details are not independently verified.",
    "hashtags": [
      "#Reddy",
      "#Groom",
      "#TS",
      "#AP"
    ],
    "wave": 1,
    "routingEligible": false,
    "externalStatusChecked": false
  },
  {
    "key": "c_kamma_bride",
    "tier": "L3_CASTE",
    "name": "👰 Kamma Brides | కమ్మ వధువులు",
    "username": "",
    "link": "https://t.me/+oQcIdTKMlINmZWY1",
    "deepLink": "",
    "whatsappLink": "https://whatsapp.com/channel/0029VbDlfav2ZjChEwBJTB0g",
    "desc": "కమ్మ — Kamma (Brides). Sub-castes: Kamma • Chowdary • Choudary. Profiles are member-submitted; details are not independently verified.",
    "hashtags": [
      "#Kamma",
      "#Bride",
      "#TS",
      "#AP"
    ],
    "wave": 1,
    "routingEligible": false,
    "externalStatusChecked": false
  },
  {
    "key": "c_kamma_groom",
    "tier": "L3_CASTE",
    "name": "🤵 Kamma Grooms | కమ్మ వరులు",
    "username": "",
    "link": "https://t.me/+Y9O_Y8323JA5YjY1",
    "deepLink": "",
    "whatsappLink": "https://whatsapp.com/channel/0029Vb8r6ZJFXUueNw3SQU3r",
    "desc": "కమ్మ — Kamma (Grooms). Sub-castes: Kamma • Chowdary • Choudary. Profiles are member-submitted; details are not independently verified.",
    "hashtags": [
      "#Kamma",
      "#Groom",
      "#TS",
      "#AP"
    ],
    "wave": 1,
    "routingEligible": false,
    "externalStatusChecked": false
  },
  {
    "key": "c_kapu_bride",
    "tier": "L3_CASTE",
    "name": "👰 Kapu • Balija • Telaga Brides | కాపు • బలిజ • తెలగ వధువులు",
    "username": "",
    "link": "https://t.me/+2ZrBXtORoOo5NTU9",
    "deepLink": "",
    "whatsappLink": "https://whatsapp.com/channel/0029VbDyehn30LKVqYhOfn0L",
    "desc": "కాపు • బలిజ • తెలగ — Kapu • Balija • Telaga (Brides). Sub-castes: Kapu • Ontari • Turupu Kapu • Palli Kapu • Balija. Profiles are member-submitted; details are not independently verified.",
    "hashtags": [
      "#Kapu",
      "#Bride",
      "#TS",
      "#AP"
    ],
    "wave": 1,
    "routingEligible": false,
    "externalStatusChecked": false
  },
  {
    "key": "c_kapu_groom",
    "tier": "L3_CASTE",
    "name": "🤵 Kapu • Balija • Telaga Grooms | కాపు • బలిజ • తెలగ వరులు",
    "username": "",
    "link": "https://t.me/+S6KxwVibmQU0YmZl",
    "deepLink": "",
    "whatsappLink": "https://whatsapp.com/channel/0029Vb8le7LLCoX4ClqFvi1J",
    "desc": "కాపు • బలిజ • తెలగ — Kapu • Balija • Telaga (Grooms). Sub-castes: Kapu • Ontari • Turupu Kapu • Palli Kapu • Balija. Profiles are member-submitted; details are not independently verified.",
    "hashtags": [
      "#Kapu",
      "#Groom",
      "#TS",
      "#AP"
    ],
    "wave": 1,
    "routingEligible": false,
    "externalStatusChecked": false
  },
  {
    "key": "c_velama_bride",
    "tier": "L3_CASTE",
    "name": "👰 Velama Brides | వెలమ వధువులు",
    "username": "",
    "link": "https://t.me/+zKQU94Dcl8E2YWY1",
    "deepLink": "",
    "whatsappLink": "https://whatsapp.com/channel/0029Vb98bMQBFLgUhEG7cq37",
    "desc": "వెలమ — Velama (Brides). Sub-castes: Velama • Padma Velama • Koppula Velama. Profiles are member-submitted; details are not independently verified.",
    "hashtags": [
      "#Velama",
      "#Bride",
      "#TS",
      "#AP"
    ],
    "wave": 2,
    "routingEligible": false,
    "externalStatusChecked": false
  },
  {
    "key": "c_velama_groom",
    "tier": "L3_CASTE",
    "name": "🤵 Velama Grooms | వెలమ వరులు",
    "username": "",
    "link": "https://t.me/+NnMufdM31dc0ZTE1",
    "deepLink": "",
    "whatsappLink": "https://whatsapp.com/channel/0029Vb9KeAeD38CUvyswkO3O",
    "desc": "వెలమ — Velama (Grooms). Sub-castes: Velama • Padma Velama • Koppula Velama. Profiles are member-submitted; details are not independently verified.",
    "hashtags": [
      "#Velama",
      "#Groom",
      "#TS",
      "#AP"
    ],
    "wave": 2,
    "routingEligible": false,
    "externalStatusChecked": false
  },
  {
    "key": "c_brahmin_bride",
    "tier": "L3_CASTE",
    "name": "👰 Brahmin Brides | బ్రాహ్మణ వధువులు",
    "username": "",
    "link": "https://t.me/+tWfcyC7StAw1ZTU1",
    "deepLink": "",
    "whatsappLink": "https://whatsapp.com/channel/0029VbDba8OLSmbk24oJaf3O",
    "desc": "బ్రాహ్మణ — Brahmin (Brides). Sub-castes: Vaidiki Brahmin • Niyogi Brahmin • Sistla • Dravida Brahmin • Iyer. Profiles are member-submitted; details are not independently verified.",
    "hashtags": [
      "#Brahmin",
      "#Bride",
      "#TS",
      "#AP"
    ],
    "wave": 2,
    "routingEligible": false,
    "externalStatusChecked": false
  },
  {
    "key": "c_brahmin_groom",
    "tier": "L3_CASTE",
    "name": "🤵 Brahmin Grooms | బ్రాహ్మణ వరులు",
    "username": "",
    "link": "https://t.me/+9LByJC4Y-5VmM2Q9",
    "deepLink": "",
    "whatsappLink": "https://whatsapp.com/channel/0029VbEKbbYEgGfQi0Y1ao1g",
    "desc": "బ్రాహ్మణ — Brahmin (Grooms). Sub-castes: Vaidiki Brahmin • Niyogi Brahmin • Sistla • Dravida Brahmin • Iyer. Profiles are member-submitted; details are not independently verified.",
    "hashtags": [
      "#Brahmin",
      "#Groom",
      "#TS",
      "#AP"
    ],
    "wave": 2,
    "routingEligible": false,
    "externalStatusChecked": false
  },
  {
    "key": "c_vysya_bride",
    "tier": "L3_CASTE",
    "name": "👰 Arya Vysya • Komati Brides | వైశ్య • కోమటి వధువులు",
    "username": "",
    "link": "https://t.me/+ZEoszjmdKmYzMjI1",
    "deepLink": "",
    "whatsappLink": "https://whatsapp.com/channel/0029Vb90m6u42DcfPpwvg33K",
    "desc": "వైశ్య • కోమటి — Arya Vysya • Komati (Brides). Sub-castes: Arya Vysya • Komati • Komti • Vaishya • Sadhu Chetty. Profiles are member-submitted; details are not independently verified.",
    "hashtags": [
      "#Vysya",
      "#Bride",
      "#TS",
      "#AP"
    ],
    "wave": 2,
    "routingEligible": false,
    "externalStatusChecked": false
  },
  {
    "key": "c_vysya_groom",
    "tier": "L3_CASTE",
    "name": "🤵 Arya Vysya • Komati Grooms | వైశ్య • కోమటి వరులు",
    "username": "",
    "link": "https://t.me/+mhviMJhWFTNhZjBl",
    "deepLink": "",
    "whatsappLink": "https://whatsapp.com/channel/0029VbDl75K7dmeeZMZA2926",
    "desc": "వైశ్య • కోమటి — Arya Vysya • Komati (Grooms). Sub-castes: Arya Vysya • Komati • Komti • Vaishya • Sadhu Chetty. Profiles are member-submitted; details are not independently verified.",
    "hashtags": [
      "#Vysya",
      "#Groom",
      "#TS",
      "#AP"
    ],
    "wave": 2,
    "routingEligible": false,
    "externalStatusChecked": false
  },
  {
    "key": "c_yadava_goud_bride",
    "tier": "L3_CASTE",
    "name": "👰 Yadava • Golla Brides | యాదవ • గొల్ల వధువులు",
    "username": "",
    "link": "https://t.me/+kFpsLfat96Y0OWI1",
    "deepLink": "",
    "whatsappLink": "https://whatsapp.com/channel/0029Vb8fFvdHVvTcadiqkp2D",
    "desc": "యాదవ • గొల్ల — Yadava • Golla (Brides). Sub-castes: Yadav • Yadava • Golla • Golla (Yadava). Profiles are member-submitted; details are not independently verified.",
    "hashtags": [
      "#YadavaGoud",
      "#Bride",
      "#TS",
      "#AP"
    ],
    "wave": 2,
    "routingEligible": false,
    "externalStatusChecked": false
  },
  {
    "key": "c_yadava_goud_groom",
    "tier": "L3_CASTE",
    "name": "🤵 Yadava • Golla Grooms | యాదవ • గొల్ల వరులు",
    "username": "",
    "link": "https://t.me/+P4MPYpsRG1Y0Y2U9",
    "deepLink": "",
    "whatsappLink": "https://whatsapp.com/channel/0029VbDn2nT7j6g3fdTXgq3A",
    "desc": "యాదవ • గొల్ల — Yadava • Golla (Grooms). Sub-castes: Yadav • Yadava • Golla • Golla (Yadava). Profiles are member-submitted; details are not independently verified.",
    "hashtags": [
      "#YadavaGoud",
      "#Groom",
      "#TS",
      "#AP"
    ],
    "wave": 2,
    "routingEligible": false,
    "externalStatusChecked": false
  },
  {
    "key": "c_mala_bride",
    "tier": "L3_CASTE",
    "name": "👰 Mala Brides | మాల వధువులు",
    "username": "",
    "link": "https://t.me/+CCxqPaDSGxUwZjY1",
    "deepLink": "",
    "whatsappLink": "https://whatsapp.com/channel/0029VbDtETF65yD6fNeGlf2A",
    "desc": "మాల — Mala (Brides). Sub-castes: Mala • Mala Ayawaru • Mala Dasari. Profiles are member-submitted; details are not independently verified.",
    "hashtags": [
      "#Mala",
      "#Bride",
      "#TS",
      "#AP"
    ],
    "wave": 2,
    "routingEligible": false,
    "externalStatusChecked": false
  },
  {
    "key": "c_mala_groom",
    "tier": "L3_CASTE",
    "name": "🤵 Mala Grooms | మాల వరులు",
    "username": "",
    "link": "https://t.me/+NLoRFKT5yJE5N2Fl",
    "deepLink": "",
    "whatsappLink": "https://whatsapp.com/channel/0029Vb8uW65EwEjvgTserz3x",
    "desc": "మాల — Mala (Grooms). Sub-castes: Mala • Mala Ayawaru • Mala Dasari. Profiles are member-submitted; details are not independently verified.",
    "hashtags": [
      "#Mala",
      "#Groom",
      "#TS",
      "#AP"
    ],
    "wave": 2,
    "routingEligible": false,
    "externalStatusChecked": false
  },
  {
    "key": "c_madiga_bride",
    "tier": "L3_CASTE",
    "name": "👰 Madiga Brides | మాదిగ వధువులు",
    "username": "",
    "link": "https://t.me/+32QEp-PKOBVhODY1",
    "deepLink": "",
    "whatsappLink": "https://whatsapp.com/channel/0029Vb94k5RKAwEkRYeW7m1C",
    "desc": "మాదిగ — Madiga (Brides). Sub-castes: Madiga • Madiga Dasu • Mashteen • Madiga Dasari. Profiles are member-submitted; details are not independently verified.",
    "hashtags": [
      "#Madiga",
      "#Bride",
      "#TS",
      "#AP"
    ],
    "wave": 2,
    "routingEligible": false,
    "externalStatusChecked": false
  },
  {
    "key": "c_madiga_groom",
    "tier": "L3_CASTE",
    "name": "🤵 Madiga Grooms | మాదిగ వరులు",
    "username": "",
    "link": "https://t.me/+_oenYepHzlQzYjdl",
    "deepLink": "",
    "whatsappLink": "https://whatsapp.com/channel/0029VbDwFWs60eBX0hvdW93T",
    "desc": "మాదిగ — Madiga (Grooms). Sub-castes: Madiga • Madiga Dasu • Mashteen • Madiga Dasari. Profiles are member-submitted; details are not independently verified.",
    "hashtags": [
      "#Madiga",
      "#Groom",
      "#TS",
      "#AP"
    ],
    "wave": 2,
    "routingEligible": false,
    "externalStatusChecked": false
  },
  {
    "key": "c_viswabrahmana_bride",
    "tier": "L3_CASTE",
    "name": "👰 Viswabrahmana (Viswakarma) Brides | విశ్వబ్రాహ్మణ వధువులు",
    "username": "",
    "link": "https://t.me/+lkhMUXqcHdI4M2M1",
    "deepLink": "",
    "whatsappLink": "https://whatsapp.com/channel/0029Vb8MKAKBA1f7VLuIaX2Y",
    "desc": "విశ్వబ్రాహ్మణ — Viswabrahmana (Viswakarma) (Brides). Sub-castes: Viswakarma • Viswabrahmin • Viswabrahmana • Kamsali • Kammari. Profiles are member-submitted; details are not independently verified.",
    "hashtags": [
      "#Viswabrahmana",
      "#Bride",
      "#TS",
      "#AP"
    ],
    "wave": 2,
    "routingEligible": false,
    "externalStatusChecked": false
  },
  {
    "key": "c_viswabrahmana_groom",
    "tier": "L3_CASTE",
    "name": "🤵 Viswabrahmana (Viswakarma) Grooms | విశ్వబ్రాహ్మణ వరులు",
    "username": "",
    "link": "https://t.me/+qBJlaAISvXM4YWU9",
    "deepLink": "",
    "whatsappLink": "https://whatsapp.com/channel/0029VbDdWlb8aKvK4Rddz32k",
    "desc": "విశ్వబ్రాహ్మణ — Viswabrahmana (Viswakarma) (Grooms). Sub-castes: Viswakarma • Viswabrahmin • Viswabrahmana • Kamsali • Kammari. Profiles are member-submitted; details are not independently verified.",
    "hashtags": [
      "#Viswabrahmana",
      "#Groom",
      "#TS",
      "#AP"
    ],
    "wave": 2,
    "routingEligible": false,
    "externalStatusChecked": false
  },
  {
    "key": "c_munnuru_kapu_bride",
    "tier": "L3_CASTE",
    "name": "👰 Munnuru Kapu Brides | మున్నూరు కాపు వధువులు",
    "username": "",
    "link": "https://t.me/+G9i5zZ1AXfJkNzE1",
    "deepLink": "",
    "whatsappLink": "https://whatsapp.com/channel/0029VbECYss60eBcdKqXag3D",
    "desc": "మున్నూరు కాపు — Munnuru Kapu (Brides). Sub-castes: Munnuru Kapu • Munnuru. Profiles are member-submitted; details are not independently verified.",
    "hashtags": [
      "#MunnuruKapu",
      "#Bride",
      "#TS",
      "#AP"
    ],
    "wave": 2,
    "routingEligible": false,
    "externalStatusChecked": false
  },
  {
    "key": "c_munnuru_kapu_groom",
    "tier": "L3_CASTE",
    "name": "🤵 Munnuru Kapu Grooms | మున్నూరు కాపు వరులు",
    "username": "",
    "link": "https://t.me/+8aF99CIpwwo5M2Fl",
    "deepLink": "",
    "whatsappLink": "https://whatsapp.com/channel/0029VbD3XJa4CrfknKw76i0e",
    "desc": "మున్నూరు కాపు — Munnuru Kapu (Grooms). Sub-castes: Munnuru Kapu • Munnuru. Profiles are member-submitted; details are not independently verified.",
    "hashtags": [
      "#MunnuruKapu",
      "#Groom",
      "#TS",
      "#AP"
    ],
    "wave": 2,
    "routingEligible": false,
    "externalStatusChecked": false
  },
  {
    "key": "c_raju_kshatriya_bride",
    "tier": "L3_CASTE",
    "name": "👰 Raju • Kshatriya Brides | రాజు • క్షత్రియ వధువులు",
    "username": "",
    "link": "https://t.me/+m5LPLPhkIpw4ZGI9",
    "deepLink": "",
    "whatsappLink": "https://whatsapp.com/channel/0029VbEEoWhJJhzenO8voU1e",
    "desc": "రాజు • క్షత్రియ — Raju • Kshatriya (Brides). Sub-castes: Raju • Rajulu • Kshatriya • Vanniyar. Profiles are member-submitted; details are not independently verified.",
    "hashtags": [
      "#RajuKshatriya",
      "#Bride",
      "#TS",
      "#AP"
    ],
    "wave": 3,
    "routingEligible": false,
    "externalStatusChecked": false
  },
  {
    "key": "c_raju_kshatriya_groom",
    "tier": "L3_CASTE",
    "name": "🤵 Raju • Kshatriya Grooms | రాజు • క్షత్రియ వరులు",
    "username": "",
    "link": "https://t.me/+szuO6inGJ3MyZTFl",
    "deepLink": "",
    "whatsappLink": "https://whatsapp.com/channel/0029VbDnKz45q08XGV69LJ0f",
    "desc": "రాజు • క్షత్రియ — Raju • Kshatriya (Grooms). Sub-castes: Raju • Rajulu • Kshatriya • Vanniyar. Profiles are member-submitted; details are not independently verified.",
    "hashtags": [
      "#RajuKshatriya",
      "#Groom",
      "#TS",
      "#AP"
    ],
    "wave": 3,
    "routingEligible": false,
    "externalStatusChecked": false
  },
  {
    "key": "c_padmashali_weavers_bride",
    "tier": "L3_CASTE",
    "name": "👰 Padmashali • Devanga (Weavers) Brides | పద్మశాలి • దేవాంగ వధువులు",
    "username": "",
    "link": "https://t.me/+WHy86f07cdFiMDY1",
    "deepLink": "",
    "whatsappLink": "https://whatsapp.com/channel/0029Vb8tDgi8Pgs8bBhmwK3H",
    "desc": "పద్మశాలి • దేవాంగ — Padmashali • Devanga (Weavers) (Brides). Sub-castes: Padmashali • Padmasali • Sali • Pattusali • Thogata. Profiles are member-submitted; details are not independently verified.",
    "hashtags": [
      "#PadmashaliWeavers",
      "#Bride",
      "#TS",
      "#AP"
    ],
    "wave": 3,
    "routingEligible": false,
    "externalStatusChecked": false
  },
  {
    "key": "c_padmashali_weavers_groom",
    "tier": "L3_CASTE",
    "name": "🤵 Padmashali • Devanga (Weavers) Grooms | పద్మశాలి • దేవాంగ వరులు",
    "username": "",
    "link": "https://t.me/+pxZfSVa1rOEzN2Fl",
    "deepLink": "",
    "whatsappLink": "https://whatsapp.com/channel/0029Vb9ASfp2phHTNpBVIn1U",
    "desc": "పద్మశాలి • దేవాంగ — Padmashali • Devanga (Weavers) (Grooms). Sub-castes: Padmashali • Padmasali • Sali • Pattusali • Thogata. Profiles are member-submitted; details are not independently verified.",
    "hashtags": [
      "#PadmashaliWeavers",
      "#Groom",
      "#TS",
      "#AP"
    ],
    "wave": 3,
    "routingEligible": false,
    "externalStatusChecked": false
  },
  {
    "key": "c_mudiraj_bride",
    "tier": "L3_CASTE",
    "name": "👰 Mudiraj • Tenugollu Brides | ముదిరాజ • తెనుగొల్ల వధువులు",
    "username": "",
    "link": "https://t.me/+XebU3qM_WR84YTdl",
    "deepLink": "",
    "whatsappLink": "https://whatsapp.com/channel/0029VbD5Jy27Noa6foFiXS40",
    "desc": "ముదిరాజ • తెనుగొల్ల — Mudiraj • Tenugollu (Brides). Sub-castes: Mudiraj • Mudiraju • Mutrasi • Tenugollu. Profiles are member-submitted; details are not independently verified.",
    "hashtags": [
      "#Mudiraj",
      "#Bride",
      "#TS",
      "#AP"
    ],
    "wave": 3,
    "routingEligible": false,
    "externalStatusChecked": false
  },
  {
    "key": "c_mudiraj_groom",
    "tier": "L3_CASTE",
    "name": "🤵 Mudiraj • Tenugollu Grooms | ముదిరాజ • తెనుగొల్ల వరులు",
    "username": "",
    "link": "https://t.me/+BMpylXf9XxcyZDBl",
    "deepLink": "",
    "whatsappLink": "https://whatsapp.com/channel/0029VbDrXXxATRSsOCpkZD2J",
    "desc": "ముదిరాజ • తెనుగొల్ల — Mudiraj • Tenugollu (Grooms). Sub-castes: Mudiraj • Mudiraju • Mutrasi • Tenugollu. Profiles are member-submitted; details are not independently verified.",
    "hashtags": [
      "#Mudiraj",
      "#Groom",
      "#TS",
      "#AP"
    ],
    "wave": 3,
    "routingEligible": false,
    "externalStatusChecked": false
  },
  {
    "key": "c_goud_bride",
    "tier": "L3_CASTE",
    "name": "👰 Goud Brides | గౌడ వధువులు",
    "username": "",
    "link": "https://t.me/+oF8K9j6BCzE2YjVl",
    "deepLink": "",
    "whatsappLink": "https://whatsapp.com/channel/0029VbE4EXK42DciVXYopI2h",
    "desc": "గౌడ — Goud (Brides). Sub-castes: Goud • Gouda • Ediga • Gamalla • Idiga. Profiles are member-submitted; details are not independently verified.",
    "hashtags": [
      "#Goud",
      "#Bride",
      "#TS",
      "#AP"
    ],
    "wave": 3,
    "routingEligible": false,
    "externalStatusChecked": false
  },
  {
    "key": "c_goud_groom",
    "tier": "L3_CASTE",
    "name": "🤵 Goud Grooms | గౌడ వరులు",
    "username": "",
    "link": "https://t.me/+HmRI0uILZ-NkY2Y9",
    "deepLink": "",
    "whatsappLink": "https://whatsapp.com/channel/0029Vb8opZw6hENsqAzGtY3R",
    "desc": "గౌడ — Goud (Grooms). Sub-castes: Goud • Gouda • Ediga • Gamalla • Idiga. Profiles are member-submitted; details are not independently verified.",
    "hashtags": [
      "#Goud",
      "#Groom",
      "#TS",
      "#AP"
    ],
    "wave": 3,
    "routingEligible": false,
    "externalStatusChecked": false
  },
  {
    "key": "c_kuruma_bride",
    "tier": "L3_CASTE",
    "name": "👰 Kuruma Brides | కురుమ వధువులు",
    "username": "",
    "link": "https://t.me/+W_8aTJ-3B-hhOGFl",
    "deepLink": "",
    "whatsappLink": "https://whatsapp.com/channel/0029Vb939bo5q08lIoSzFk0B",
    "desc": "కురుమ — Kuruma (Brides). Sub-castes: Kuruma • Kuruba • Kuruba (Golla) • Kuruva • Gorrela. Profiles are member-submitted; details are not independently verified.",
    "hashtags": [
      "#Kuruma",
      "#Bride",
      "#TS",
      "#AP"
    ],
    "wave": 3,
    "routingEligible": false,
    "externalStatusChecked": false
  },
  {
    "key": "c_kuruma_groom",
    "tier": "L3_CASTE",
    "name": "🤵 Kuruma Grooms | కురుమ వరులు",
    "username": "",
    "link": "https://t.me/+YOoCmdgS_3thY2Jl",
    "deepLink": "",
    "whatsappLink": "https://whatsapp.com/channel/0029Vb8fDPRGU3BFVKlVOU3X",
    "desc": "కురుమ — Kuruma (Grooms). Sub-castes: Kuruma • Kuruba • Kuruba (Golla) • Kuruva • Gorrela. Profiles are member-submitted; details are not independently verified.",
    "hashtags": [
      "#Kuruma",
      "#Groom",
      "#TS",
      "#AP"
    ],
    "wave": 3,
    "routingEligible": false,
    "externalStatusChecked": false
  },
  {
    "key": "c_rajaka_bride",
    "tier": "L3_CASTE",
    "name": "👰 Rajaka Brides | రజక వధువులు",
    "username": "",
    "link": "https://t.me/+uHfkj71Js_c1ZWJl",
    "deepLink": "",
    "whatsappLink": "https://whatsapp.com/channel/0029Vb9UvFM1SWszlk3KXM2U",
    "desc": "రజక — Rajaka (Brides). Sub-castes: Rajaka • Chakali • Vannar. Profiles are member-submitted; details are not independently verified.",
    "hashtags": [
      "#Rajaka",
      "#Bride",
      "#TS",
      "#AP"
    ],
    "wave": 3,
    "routingEligible": false,
    "externalStatusChecked": false
  },
  {
    "key": "c_rajaka_groom",
    "tier": "L3_CASTE",
    "name": "🤵 Rajaka Grooms | రజక వరులు",
    "username": "",
    "link": "https://t.me/+4BStez9IoSAyNmQ1",
    "deepLink": "",
    "whatsappLink": "",
    "desc": "రజక — Rajaka (Grooms). Sub-castes: Rajaka • Chakali • Vannar. Profiles are member-submitted; details are not independently verified.",
    "hashtags": [
      "#Rajaka",
      "#Groom",
      "#TS",
      "#AP"
    ],
    "wave": 3,
    "routingEligible": false,
    "externalStatusChecked": false
  },
  {
    "key": "c_kummari_bride",
    "tier": "L3_CASTE",
    "name": "👰 Kummari Brides | కుమ్మరి వధువులు",
    "username": "",
    "link": "https://t.me/+IilG4JDaWm9iMmE1",
    "deepLink": "",
    "whatsappLink": "https://whatsapp.com/channel/0029VbDhazI0wajxHXSCDh1t",
    "desc": "కుమ్మరి — Kummari (Brides). Sub-castes: Kummari • Kummara • Kulala • Kumbhara. Profiles are member-submitted; details are not independently verified.",
    "hashtags": [
      "#Kummari",
      "#Bride",
      "#TS",
      "#AP"
    ],
    "wave": 3,
    "routingEligible": false,
    "externalStatusChecked": false
  },
  {
    "key": "c_kummari_groom",
    "tier": "L3_CASTE",
    "name": "🤵 Kummari Grooms | కుమ్మరి వరులు",
    "username": "",
    "link": "https://t.me/+Z9UFsOSSY2szMjFl",
    "deepLink": "",
    "whatsappLink": "https://whatsapp.com/channel/0029VbDizeQG8l55W64bVj2V",
    "desc": "కుమ్మరి — Kummari (Grooms). Sub-castes: Kummari • Kummara • Kulala • Kumbhara. Profiles are member-submitted; details are not independently verified.",
    "hashtags": [
      "#Kummari",
      "#Groom",
      "#TS",
      "#AP"
    ],
    "wave": 3,
    "routingEligible": false,
    "externalStatusChecked": false
  },
  {
    "key": "c_perika_bride",
    "tier": "L3_CASTE",
    "name": "👰 Perika Brides | పెరిక వధువులు",
    "username": "",
    "link": "https://t.me/+7BHlq1k9R7NhYWQ1",
    "deepLink": "",
    "whatsappLink": "https://whatsapp.com/channel/0029VbDV28JIyPtYs0DDQ92f",
    "desc": "పెరిక — Perika (Brides). Sub-castes: Perika. Profiles are member-submitted; details are not independently verified.",
    "hashtags": [
      "#Perika",
      "#Bride",
      "#TS",
      "#AP"
    ],
    "wave": 3,
    "routingEligible": false,
    "externalStatusChecked": false
  },
  {
    "key": "c_perika_groom",
    "tier": "L3_CASTE",
    "name": "🤵 Perika Grooms | పెరిక వరులు",
    "username": "",
    "link": "https://t.me/+MXvizI45UNFmOTE1",
    "deepLink": "",
    "whatsappLink": "https://whatsapp.com/channel/0029Vb8ceI13gvWdFcRSYW3y",
    "desc": "పెరిక — Perika (Grooms). Sub-castes: Perika. Profiles are member-submitted; details are not independently verified.",
    "hashtags": [
      "#Perika",
      "#Groom",
      "#TS",
      "#AP"
    ],
    "wave": 3,
    "routingEligible": false,
    "externalStatusChecked": false
  },
  {
    "key": "c_lambada_banjara_bride",
    "tier": "L3_CASTE",
    "name": "👰 Lambada • Banjara (ST) Brides | లంబాడ • బంజార వధువులు",
    "username": "",
    "link": "https://t.me/+T7ybZrw8VYQ5NTRl",
    "deepLink": "",
    "whatsappLink": "https://whatsapp.com/channel/0029VbD3CW6HVvTbgyWWvX3r",
    "desc": "లంబాడ • బంజార — Lambada • Banjara (ST) (Brides). Sub-castes: Lambada • Lambadi • Banjara • Lambani • Sugali. Profiles are member-submitted; details are not independently verified.",
    "hashtags": [
      "#LambadaBanjara",
      "#Bride",
      "#TS",
      "#AP"
    ],
    "wave": 3,
    "routingEligible": false,
    "externalStatusChecked": false
  },
  {
    "key": "c_lambada_banjara_groom",
    "tier": "L3_CASTE",
    "name": "🤵 Lambada • Banjara (ST) Grooms | లంబాడ • బంజార వరులు",
    "username": "",
    "link": "https://t.me/+jOPvVBAKURgyY2Fl",
    "deepLink": "",
    "whatsappLink": "https://whatsapp.com/channel/0029Vb902btGE56gSl4iV10H",
    "desc": "లంబాడ • బంజార — Lambada • Banjara (ST) (Grooms). Sub-castes: Lambada • Lambadi • Banjara • Lambani • Sugali. Profiles are member-submitted; details are not independently verified.",
    "hashtags": [
      "#LambadaBanjara",
      "#Groom",
      "#TS",
      "#AP"
    ],
    "wave": 3,
    "routingEligible": false,
    "externalStatusChecked": false
  },
  {
    "key": "c_others_bc_bride",
    "tier": "L3_CASTE",
    "name": "👰 Other BC Communities Brides | ఇతర BC కులాలు వధువులు",
    "username": "",
    "link": "https://t.me/+Y4lpZRyN2ZxiNmI1",
    "deepLink": "",
    "whatsappLink": "https://whatsapp.com/channel/0029VbDz6odI7Be7YAuc1e3w",
    "desc": "ఇతర BC కులాలు — Other BC Communities (Brides). Sub-castes: Salivahana • Gandla • Telikula • Uppara • Sagara. Profiles are member-submitted; details are not independently verified.",
    "hashtags": [
      "#OthersBc",
      "#Bride",
      "#TS",
      "#AP"
    ],
    "wave": 3,
    "routingEligible": false,
    "externalStatusChecked": false
  },
  {
    "key": "c_others_bc_groom",
    "tier": "L3_CASTE",
    "name": "🤵 Other BC Communities Grooms | ఇతర BC కులాలు వరులు",
    "username": "",
    "link": "https://t.me/+iyf8LbsJyCo3ZGFl",
    "deepLink": "",
    "whatsappLink": "https://whatsapp.com/channel/0029VbE9dOxDDmFZvsPGd31I",
    "desc": "ఇతర BC కులాలు — Other BC Communities (Grooms). Sub-castes: Salivahana • Gandla • Telikula • Uppara • Sagara. Profiles are member-submitted; details are not independently verified.",
    "hashtags": [
      "#OthersBc",
      "#Groom",
      "#TS",
      "#AP"
    ],
    "wave": 3,
    "routingEligible": false,
    "externalStatusChecked": false
  },
  {
    "key": "c_others_sc_bride",
    "tier": "L3_CASTE",
    "name": "👰 Other SC Communities Brides | ఇతర SC కులాలు వధువులు",
    "username": "",
    "link": "https://t.me/+UfRB95ZYdSBhZmQ1",
    "deepLink": "",
    "whatsappLink": "https://whatsapp.com/channel/0029Vb8oMp4J93we9t58Sr0m",
    "desc": "ఇతర SC కులాలు — Other SC Communities (Brides). Sub-castes: Adi Andhra • Adi Dravida • Arundhatiya • Relli • Arwa Mala. Profiles are member-submitted; details are not independently verified.",
    "hashtags": [
      "#OthersSc",
      "#Bride",
      "#TS",
      "#AP"
    ],
    "wave": 3,
    "routingEligible": false,
    "externalStatusChecked": false
  },
  {
    "key": "c_others_sc_groom",
    "tier": "L3_CASTE",
    "name": "🤵 Other SC Communities Grooms | ఇతర SC కులాలు వరులు",
    "username": "",
    "link": "https://t.me/+3w08vTaC3O42N2U9",
    "deepLink": "",
    "whatsappLink": "https://whatsapp.com/channel/0029VbDNWfI002TDBUfbFp2A",
    "desc": "ఇతర SC కులాలు — Other SC Communities (Grooms). Sub-castes: Adi Andhra • Adi Dravida • Arundhatiya • Relli • Arwa Mala. Profiles are member-submitted; details are not independently verified.",
    "hashtags": [
      "#OthersSc",
      "#Groom",
      "#TS",
      "#AP"
    ],
    "wave": 3,
    "routingEligible": false,
    "externalStatusChecked": false
  },
  {
    "key": "c_boya_valmiki_bride",
    "tier": "L3_CASTE",
    "name": "👰 Boya • Valmiki Brides | బోయ • వాల్మీకి వధువులు",
    "username": "",
    "link": "",
    "deepLink": "",
    "whatsappLink": "",
    "desc": "బోయ • వాల్మీకి — Boya • Valmiki (Brides). Sub-castes: Boya • Boyar • Bedar • Valmiki • Nishadhi. Profiles are member-submitted; details are not independently verified.",
    "hashtags": [
      "#BoyaValmiki",
      "#Bride",
      "#TS",
      "#AP"
    ],
    "wave": 4,
    "routingEligible": false,
    "externalStatusChecked": false
  },
  {
    "key": "c_boya_valmiki_groom",
    "tier": "L3_CASTE",
    "name": "🤵 Boya • Valmiki Grooms | బోయ • వాల్మీకి వరులు",
    "username": "",
    "link": "",
    "deepLink": "",
    "whatsappLink": "",
    "desc": "బోయ • వాల్మీకి — Boya • Valmiki (Grooms). Sub-castes: Boya • Boyar • Bedar • Valmiki • Nishadhi. Profiles are member-submitted; details are not independently verified.",
    "hashtags": [
      "#BoyaValmiki",
      "#Groom",
      "#TS",
      "#AP"
    ],
    "wave": 4,
    "routingEligible": false,
    "externalStatusChecked": false
  },
  {
    "key": "c_vaddera_bride",
    "tier": "L3_CASTE",
    "name": "👰 Vaddera • Odde Brides | వడ్డెర • ఒడ్డె వధువులు",
    "username": "",
    "link": "",
    "deepLink": "",
    "whatsappLink": "",
    "desc": "వడ్డెర • ఒడ్డె — Vaddera • Odde (Brides). Sub-castes: Vaddera • Vaddi • Odde • Oddilu • Vadde. Profiles are member-submitted; details are not independently verified.",
    "hashtags": [
      "#Vaddera",
      "#Bride",
      "#TS",
      "#AP"
    ],
    "wave": 4,
    "routingEligible": false,
    "externalStatusChecked": false
  },
  {
    "key": "c_vaddera_groom",
    "tier": "L3_CASTE",
    "name": "🤵 Vaddera • Odde Grooms | వడ్డెర • ఒడ్డె వరులు",
    "username": "",
    "link": "",
    "deepLink": "",
    "whatsappLink": "",
    "desc": "వడ్డెర • ఒడ్డె — Vaddera • Odde (Grooms). Sub-castes: Vaddera • Vaddi • Odde • Oddilu • Vadde. Profiles are member-submitted; details are not independently verified.",
    "hashtags": [
      "#Vaddera",
      "#Groom",
      "#TS",
      "#AP"
    ],
    "wave": 4,
    "routingEligible": false,
    "externalStatusChecked": false
  },
  {
    "key": "c_nayee_brahmin_bride",
    "tier": "L3_CASTE",
    "name": "👰 Nayee Brahmin • Mangali Brides | నాయీ బ్రాహ్మణ • మంగలి వధువులు",
    "username": "",
    "link": "",
    "deepLink": "",
    "whatsappLink": "",
    "desc": "నాయీ బ్రాహ్మణ • మంగలి — Nayee Brahmin • Mangali (Brides). Sub-castes: Nayee Brahmin • Nayi-Brahmin • Mangali • Mangala • Nhavi. Profiles are member-submitted; details are not independently verified.",
    "hashtags": [
      "#NayeeBrahmin",
      "#Bride",
      "#TS",
      "#AP"
    ],
    "wave": 4,
    "routingEligible": false,
    "externalStatusChecked": false
  },
  {
    "key": "c_nayee_brahmin_groom",
    "tier": "L3_CASTE",
    "name": "🤵 Nayee Brahmin • Mangali Grooms | నాయీ బ్రాహ్మణ • మంగలి వరులు",
    "username": "",
    "link": "",
    "deepLink": "",
    "whatsappLink": "",
    "desc": "నాయీ బ్రాహ్మణ • మంగలి — Nayee Brahmin • Mangali (Grooms). Sub-castes: Nayee Brahmin • Nayi-Brahmin • Mangali • Mangala • Nhavi. Profiles are member-submitted; details are not independently verified.",
    "hashtags": [
      "#NayeeBrahmin",
      "#Groom",
      "#TS",
      "#AP"
    ],
    "wave": 4,
    "routingEligible": false,
    "externalStatusChecked": false
  },
  {
    "key": "c_gandla_telikula_bride",
    "tier": "L3_CASTE",
    "name": "👰 Gandla • Telikula Brides | గాండ్ల • తెలికుల వధువులు",
    "username": "",
    "link": "",
    "deepLink": "",
    "whatsappLink": "",
    "desc": "గాండ్ల • తెలికుల — Gandla • Telikula (Brides). Sub-castes: Gandla • Ganika • Telikula • Telaga (Gandla). Profiles are member-submitted; details are not independently verified.",
    "hashtags": [
      "#GandlaTelikula",
      "#Bride",
      "#TS",
      "#AP"
    ],
    "wave": 4,
    "routingEligible": false,
    "externalStatusChecked": false
  },
  {
    "key": "c_gandla_telikula_groom",
    "tier": "L3_CASTE",
    "name": "🤵 Gandla • Telikula Grooms | గాండ్ల • తెలికుల వరులు",
    "username": "",
    "link": "",
    "deepLink": "",
    "whatsappLink": "",
    "desc": "గాండ్ల • తెలికుల — Gandla • Telikula (Grooms). Sub-castes: Gandla • Ganika • Telikula • Telaga (Gandla). Profiles are member-submitted; details are not independently verified.",
    "hashtags": [
      "#GandlaTelikula",
      "#Groom",
      "#TS",
      "#AP"
    ],
    "wave": 4,
    "routingEligible": false,
    "externalStatusChecked": false
  },
  {
    "key": "c_uppara_sagara_bride",
    "tier": "L3_CASTE",
    "name": "👰 Uppara • Sagara Brides | ఉప్పర • సాగర వధువులు",
    "username": "",
    "link": "",
    "deepLink": "",
    "whatsappLink": "",
    "desc": "ఉప్పర • సాగర — Uppara • Sagara (Brides). Sub-castes: Uppara • Sagara • Uppara (Sagara). Profiles are member-submitted; details are not independently verified.",
    "hashtags": [
      "#UpparaSagara",
      "#Bride",
      "#TS",
      "#AP"
    ],
    "wave": 4,
    "routingEligible": false,
    "externalStatusChecked": false
  },
  {
    "key": "c_uppara_sagara_groom",
    "tier": "L3_CASTE",
    "name": "🤵 Uppara • Sagara Grooms | ఉప్పర • సాగర వరులు",
    "username": "",
    "link": "",
    "deepLink": "",
    "whatsappLink": "",
    "desc": "ఉప్పర • సాగర — Uppara • Sagara (Grooms). Sub-castes: Uppara • Sagara • Uppara (Sagara). Profiles are member-submitted; details are not independently verified.",
    "hashtags": [
      "#UpparaSagara",
      "#Groom",
      "#TS",
      "#AP"
    ],
    "wave": 4,
    "routingEligible": false,
    "externalStatusChecked": false
  },
  {
    "key": "c_bestha_gangaputra_bride",
    "tier": "L3_CASTE",
    "name": "👰 Bestha • Gangaputra Brides | బెస్త • గంగపుత్ర వధువులు",
    "username": "",
    "link": "",
    "deepLink": "",
    "whatsappLink": "",
    "desc": "బెస్త • గంగపుత్ర — Bestha • Gangaputra (Brides). Sub-castes: Bestha • Bestalu • Gangaputra • Gangavar • Jalari (Bestha). Profiles are member-submitted; details are not independently verified.",
    "hashtags": [
      "#BesthaGangaputra",
      "#Bride",
      "#TS",
      "#AP"
    ],
    "wave": 4,
    "routingEligible": false,
    "externalStatusChecked": false
  },
  {
    "key": "c_bestha_gangaputra_groom",
    "tier": "L3_CASTE",
    "name": "🤵 Bestha • Gangaputra Grooms | బెస్త • గంగపుత్ర వరులు",
    "username": "",
    "link": "",
    "deepLink": "",
    "whatsappLink": "",
    "desc": "బెస్త • గంగపుత్ర — Bestha • Gangaputra (Grooms). Sub-castes: Bestha • Bestalu • Gangaputra • Gangavar • Jalari (Bestha). Profiles are member-submitted; details are not independently verified.",
    "hashtags": [
      "#BesthaGangaputra",
      "#Groom",
      "#TS",
      "#AP"
    ],
    "wave": 4,
    "routingEligible": false,
    "externalStatusChecked": false
  },
  {
    "key": "c_gavara_bride",
    "tier": "L3_CASTE",
    "name": "👰 Gavara Brides | గవర వధువులు",
    "username": "",
    "link": "",
    "deepLink": "",
    "whatsappLink": "",
    "desc": "గవర — Gavara (Brides). Sub-castes: Gavara • Gavara (Balija) • Gavara Komati. Profiles are member-submitted; details are not independently verified.",
    "hashtags": [
      "#Gavara",
      "#Bride",
      "#TS",
      "#AP"
    ],
    "wave": 4,
    "routingEligible": false,
    "externalStatusChecked": false
  },
  {
    "key": "c_gavara_groom",
    "tier": "L3_CASTE",
    "name": "🤵 Gavara Grooms | గవర వరులు",
    "username": "",
    "link": "",
    "deepLink": "",
    "whatsappLink": "",
    "desc": "గవర — Gavara (Grooms). Sub-castes: Gavara • Gavara (Balija) • Gavara Komati. Profiles are member-submitted; details are not independently verified.",
    "hashtags": [
      "#Gavara",
      "#Groom",
      "#TS",
      "#AP"
    ],
    "wave": 4,
    "routingEligible": false,
    "externalStatusChecked": false
  },
  {
    "key": "c_jangam_lingayat_bride",
    "tier": "L3_CASTE",
    "name": "👰 Jangam • Lingayat Brides | జంగం • లింగాయత వధువులు",
    "username": "",
    "link": "",
    "deepLink": "",
    "whatsappLink": "",
    "desc": "జంగం • లింగాయత — Jangam • Lingayat (Brides). Sub-castes: Jangam • Jangama • Lingayat • Lingayath • Veerashaiva. Profiles are member-submitted; details are not independently verified.",
    "hashtags": [
      "#JangamLingayat",
      "#Bride",
      "#TS",
      "#AP"
    ],
    "wave": 4,
    "routingEligible": false,
    "externalStatusChecked": false
  },
  {
    "key": "c_jangam_lingayat_groom",
    "tier": "L3_CASTE",
    "name": "🤵 Jangam • Lingayat Grooms | జంగం • లింగాయత వరులు",
    "username": "",
    "link": "",
    "deepLink": "",
    "whatsappLink": "",
    "desc": "జంగం • లింగాయత — Jangam • Lingayat (Grooms). Sub-castes: Jangam • Jangama • Lingayat • Lingayath • Veerashaiva. Profiles are member-submitted; details are not independently verified.",
    "hashtags": [
      "#JangamLingayat",
      "#Groom",
      "#TS",
      "#AP"
    ],
    "wave": 4,
    "routingEligible": false,
    "externalStatusChecked": false
  },
  {
    "key": "c_medari_bride",
    "tier": "L3_CASTE",
    "name": "👰 Medari • Medara Brides | మేదరి • మేదర వధువులు",
    "username": "",
    "link": "",
    "deepLink": "",
    "whatsappLink": "",
    "desc": "మేదరి • మేదర — Medari • Medara (Brides). Sub-castes: Medari • Medara • Medarlu. Profiles are member-submitted; details are not independently verified.",
    "hashtags": [
      "#Medari",
      "#Bride",
      "#TS",
      "#AP"
    ],
    "wave": 4,
    "routingEligible": false,
    "externalStatusChecked": false
  },
  {
    "key": "c_medari_groom",
    "tier": "L3_CASTE",
    "name": "🤵 Medari • Medara Grooms | మేదరి • మేదర వరులు",
    "username": "",
    "link": "",
    "deepLink": "",
    "whatsappLink": "",
    "desc": "మేదరి • మేదర — Medari • Medara (Grooms). Sub-castes: Medari • Medara • Medarlu. Profiles are member-submitted; details are not independently verified.",
    "hashtags": [
      "#Medari",
      "#Groom",
      "#TS",
      "#AP"
    ],
    "wave": 4,
    "routingEligible": false,
    "externalStatusChecked": false
  },
  {
    "key": "c_dasari_bride",
    "tier": "L3_CASTE",
    "name": "👰 Dasari Brides | దాసరి వధువులు",
    "username": "",
    "link": "",
    "deepLink": "",
    "whatsappLink": "",
    "desc": "దాసరి — Dasari (Brides). Sub-castes: Dasari • Dasari (Mala) • Dasari (Madiga). Profiles are member-submitted; details are not independently verified.",
    "hashtags": [
      "#Dasari",
      "#Bride",
      "#TS",
      "#AP"
    ],
    "wave": 4,
    "routingEligible": false,
    "externalStatusChecked": false
  },
  {
    "key": "c_dasari_groom",
    "tier": "L3_CASTE",
    "name": "🤵 Dasari Grooms | దాసరి వరులు",
    "username": "",
    "link": "",
    "deepLink": "",
    "whatsappLink": "",
    "desc": "దాసరి — Dasari (Grooms). Sub-castes: Dasari • Dasari (Mala) • Dasari (Madiga). Profiles are member-submitted; details are not independently verified.",
    "hashtags": [
      "#Dasari",
      "#Groom",
      "#TS",
      "#AP"
    ],
    "wave": 4,
    "routingEligible": false,
    "externalStatusChecked": false
  },
  {
    "key": "c_koya_gond_bride",
    "tier": "L3_CASTE",
    "name": "👰 Koya • Gond Brides | కోయ • గోండ వధువులు",
    "username": "",
    "link": "",
    "deepLink": "",
    "whatsappLink": "",
    "desc": "కోయ • గోండ — Koya • Gond (Brides). Sub-castes: Koya • Koitur • Gond • Rajgond • Dorla. Profiles are member-submitted; details are not independently verified.",
    "hashtags": [
      "#KoyaGond",
      "#Bride",
      "#TS",
      "#AP"
    ],
    "wave": 4,
    "routingEligible": false,
    "externalStatusChecked": false
  },
  {
    "key": "c_koya_gond_groom",
    "tier": "L3_CASTE",
    "name": "🤵 Koya • Gond Grooms | కోయ • గోండ వరులు",
    "username": "",
    "link": "",
    "deepLink": "",
    "whatsappLink": "",
    "desc": "కోయ • గోండ — Koya • Gond (Grooms). Sub-castes: Koya • Koitur • Gond • Rajgond • Dorla. Profiles are member-submitted; details are not independently verified.",
    "hashtags": [
      "#KoyaGond",
      "#Groom",
      "#TS",
      "#AP"
    ],
    "wave": 4,
    "routingEligible": false,
    "externalStatusChecked": false
  },
  {
    "key": "c_adi_andhra_bride",
    "tier": "L3_CASTE",
    "name": "👰 Adi Andhra Brides | ఆది ఆంధ్ర వధువులు",
    "username": "",
    "link": "",
    "deepLink": "",
    "whatsappLink": "",
    "desc": "ఆది ఆంధ్ర — Adi Andhra (Brides). Sub-castes: Adi Andhra • Adi Dravida • Adi Karnataka. Profiles are member-submitted; details are not independently verified.",
    "hashtags": [
      "#AdiAndhra",
      "#Bride",
      "#TS",
      "#AP"
    ],
    "wave": 4,
    "routingEligible": false,
    "externalStatusChecked": false
  },
  {
    "key": "c_adi_andhra_groom",
    "tier": "L3_CASTE",
    "name": "🤵 Adi Andhra Grooms | ఆది ఆంధ్ర వరులు",
    "username": "",
    "link": "",
    "deepLink": "",
    "whatsappLink": "",
    "desc": "ఆది ఆంధ్ర — Adi Andhra (Grooms). Sub-castes: Adi Andhra • Adi Dravida • Adi Karnataka. Profiles are member-submitted; details are not independently verified.",
    "hashtags": [
      "#AdiAndhra",
      "#Groom",
      "#TS",
      "#AP"
    ],
    "wave": 4,
    "routingEligible": false,
    "externalStatusChecked": false
  },
  {
    "key": "c_north_indian_bride",
    "tier": "L3_CASTE",
    "name": "👰 Marwari • Gujarati • Punjabi Brides | మార్వాడీ • గుజరాతీ • పంజాబీ వధువులు",
    "username": "",
    "link": "",
    "deepLink": "",
    "whatsappLink": "",
    "desc": "మార్వాడీ • గుజరాతీ • పంజాబీ — Marwari • Gujarati • Punjabi (Brides). Sub-castes: Marwari • Marwadi • Gujarati • Gujjar • Punjabi. Profiles are member-submitted; details are not independently verified.",
    "hashtags": [
      "#NorthIndian",
      "#Bride",
      "#TS",
      "#AP"
    ],
    "wave": 4,
    "routingEligible": false,
    "externalStatusChecked": false
  },
  {
    "key": "c_north_indian_groom",
    "tier": "L3_CASTE",
    "name": "🤵 Marwari • Gujarati • Punjabi Grooms | మార్వాడీ • గుజరాతీ • పంజాబీ వరులు",
    "username": "",
    "link": "",
    "deepLink": "",
    "whatsappLink": "",
    "desc": "మార్వాడీ • గుజరాతీ • పంజాబీ — Marwari • Gujarati • Punjabi (Grooms). Sub-castes: Marwari • Marwadi • Gujarati • Gujjar • Punjabi. Profiles are member-submitted; details are not independently verified.",
    "hashtags": [
      "#NorthIndian",
      "#Groom",
      "#TS",
      "#AP"
    ],
    "wave": 4,
    "routingEligible": false,
    "externalStatusChecked": false
  },
  {
    "key": "c_other_states_bride",
    "tier": "L3_CASTE",
    "name": "👰 Marathi • Odia • Bengali Brides | మరాఠీ • ఒడియా • బెంగాలీ వధువులు",
    "username": "",
    "link": "",
    "deepLink": "",
    "whatsappLink": "",
    "desc": "మరాఠీ • ఒడియా • బెంగాలీ — Marathi • Odia • Bengali (Brides). Sub-castes: Marathi • Maharashtrian • Odia • Oriya • Bengali. Profiles are member-submitted; details are not independently verified.",
    "hashtags": [
      "#OtherStates",
      "#Bride",
      "#TS",
      "#AP"
    ],
    "wave": 4,
    "routingEligible": false,
    "externalStatusChecked": false
  },
  {
    "key": "c_other_states_groom",
    "tier": "L3_CASTE",
    "name": "🤵 Marathi • Odia • Bengali Grooms | మరాఠీ • ఒడియా • బెంగాలీ వరులు",
    "username": "",
    "link": "",
    "deepLink": "",
    "whatsappLink": "",
    "desc": "మరాఠీ • ఒడియా • బెంగాలీ — Marathi • Odia • Bengali (Grooms). Sub-castes: Marathi • Maharashtrian • Odia • Oriya • Bengali. Profiles are member-submitted; details are not independently verified.",
    "hashtags": [
      "#OtherStates",
      "#Groom",
      "#TS",
      "#AP"
    ],
    "wave": 4,
    "routingEligible": false,
    "externalStatusChecked": false
  },
  {
    "key": "c_neighbour_south_bride",
    "tier": "L3_CASTE",
    "name": "👰 Vokkaliga • Nair • Nadar Brides | వొక్కలిగ • నాయర్ • నాదార్ వధువులు",
    "username": "",
    "link": "",
    "deepLink": "",
    "whatsappLink": "",
    "desc": "వొక్కలిగ • నాయర్ • నాదార్ — Vokkaliga • Nair • Nadar (Brides). Sub-castes: Vokkaliga • Gowda (Vokkaliga) • Nair • Nadar • Nadar (Tamil). Profiles are member-submitted; details are not independently verified.",
    "hashtags": [
      "#NeighbourSouth",
      "#Bride",
      "#TS",
      "#AP"
    ],
    "wave": 4,
    "routingEligible": false,
    "externalStatusChecked": false
  },
  {
    "key": "c_neighbour_south_groom",
    "tier": "L3_CASTE",
    "name": "🤵 Vokkaliga • Nair • Nadar Grooms | వొక్కలిగ • నాయర్ • నాదార్ వరులు",
    "username": "",
    "link": "",
    "deepLink": "",
    "whatsappLink": "",
    "desc": "వొక్కలిగ • నాయర్ • నాదార్ — Vokkaliga • Nair • Nadar (Grooms). Sub-castes: Vokkaliga • Gowda (Vokkaliga) • Nair • Nadar • Nadar (Tamil). Profiles are member-submitted; details are not independently verified.",
    "hashtags": [
      "#NeighbourSouth",
      "#Groom",
      "#TS",
      "#AP"
    ],
    "wave": 4,
    "routingEligible": false,
    "externalStatusChecked": false
  }
];

// Hindu-only register form dropdown — registry castes + Open
export const CASTE_OPTIONS: string[] = [
  "Adi Andhra",
  "Arya Vysya • Komati",
  "Bestha • Gangaputra",
  "Boya • Valmiki",
  "Brahmin",
  "Dasari",
  "Gandla • Telikula",
  "Gavara",
  "Goud",
  "Jangam • Lingayat",
  "Kamma",
  "Kapu • Balija • Telaga",
  "Koya • Gond",
  "Kummari",
  "Kuruma",
  "Lambada • Banjara (ST)",
  "Madiga",
  "Mala",
  "Marathi • Odia • Bengali",
  "Marwari • Gujarati • Punjabi",
  "Medari • Medara",
  "Mudiraj • Tenugollu",
  "Munnuru Kapu",
  "Nayee Brahmin • Mangali",
  "Open",
  "Other BC Communities",
  "Other SC Communities",
  "Other ST Communities",
  "Padmashali • Devanga (Weavers)",
  "Perika",
  "Rajaka",
  "Raju • Kshatriya",
  "Reddy",
  "Uppara • Sagara",
  "Vaddera • Odde",
  "Velama",
  "Viswabrahmana (Viswakarma)",
  "Vokkaliga • Nair • Nadar",
  "Yadava • Golla"
];
