/**
 * MANA VIVAHA — TELUGU PANCHANGAM VIVAHA MUHURTHAMS (2026 - 2027) 💍📅
 * =======================================================================
 * Authentic Telugu Marriage Dates, Auspicious Lagnams, Nakshatras & Thithis
 * for Telugu families planning upcoming weddings.
 */

export interface MuhurthamDate {
  date: string;         // YYYY-MM-DD
  teluguDate: string;   // e.g. "12 అక్టోబర్ 2026 (సోమవారం)"
  teluguMonth: string;  // e.g. "ఆశ్వయుజ మాసం"
  season: string;       // e.g. "శరద్ రుతువు"
  thithi: string;       // e.g. "శుక్ల పాడ్యమి / విదియ"
  nakshatram: string;   // e.g. "స్వాతి / విశాఖ"
  lagnam: string;       // e.g. "ధనుస్సు లగ్నం"
  timeRange: string;    // e.g. "రాత్రి 08:45 నుండి 09:30 వరకు"
  isAmruthaGadiya: boolean;
  notes: string;
}

export const VIVAHA_MUHURTHAMS_2026_2027: MuhurthamDate[] = [
  // October 2026 (ఆశ్వయుజ / కార్తీక మాసాలు)
  {
    date: "2026-10-18",
    teluguDate: "18 అక్టోబర్ 2026 (ఆదివారం)",
    teluguMonth: "ఆశ్వయుజ మాసం",
    season: "శరద్ రుతువు",
    thithi: "శుక్ల అష్టమి",
    nakshatram: "ఉత్తరాషాఢ (Uttarashadha)",
    lagnam: "ధనుస్సు లగ్నం (Dhanu Lagnam)",
    timeRange: "ఉదయం 08:15 నుండి 09:20 వరకు",
    isAmruthaGadiya: true,
    notes: "అత్యంత శుభప్రదమైన ముహూర్తం — సర్వతోభద్ర లగ్న శుద్ధి."
  },
  {
    date: "2026-10-24",
    teluguDate: "24 అక్టోబర్ 2026 (శనివారం)",
    teluguMonth: "ఆశ్వయుజ మాసం",
    season: "శరద్ రుతువు",
    thithi: "శుక్ల చతుర్దశి",
    nakshatram: "రేవతి (Revati)",
    lagnam: "మీన లగ్నం (Meena Lagnam)",
    timeRange: "రాత్రి 09:10 నుండి 10:25 వరకు",
    isAmruthaGadiya: true,
    notes: "అమృత ఘడియలతో కూడిన రేవతి నక్షత్ర ముహూర్తం."
  },
  {
    date: "2026-10-29",
    teluguDate: "29 అక్టోబర్ 2026 (గురువారం)",
    teluguMonth: "కార్తీక మాసం",
    season: "శరద్ రుతువు",
    thithi: "శుక్ల చవితి",
    nakshatram: "మృగశిర (Mrigasira)",
    lagnam: "వృషభ లగ్నం (Vrishabha Lagnam)",
    timeRange: "తెల్లవారుజామున 03:45 నుండి 04:30 వరకు",
    isAmruthaGadiya: true,
    notes: "కార్తీక శుద్ధ చవితి అమృత లగ్నం."
  },

  // November 2026 (కార్తీక / మార్గశిర మాసాలు - Peak Wedding Season)
  {
    date: "2026-11-04",
    teluguDate: "04 నవంబర్ 2026 (బుధవారం)",
    teluguMonth: "కార్తీక మాసం",
    season: "హేమంత రుతువు",
    thithi: "శుక్ల దశమి",
    nakshatram: "ఉత్తర ఫల్గుణి (Uttara)",
    lagnam: "కన్యా లగ్నం (Kanya Lagnam)",
    timeRange: "ఉదయం 07:30 నుండి 08:45 వరకు",
    isAmruthaGadiya: true,
    notes: "లక్ష్మీనారాయణ యోగంతో కూడిన వివాహ ముహూర్తం."
  },
  {
    date: "2026-11-08",
    teluguDate: "08 నవంబర్ 2026 (ఆదివారం)",
    teluguMonth: "కార్తీక మాసం",
    season: "హేమంత రుతువు",
    thithi: "శుక్ల త్రయోదశి",
    nakshatram: "హస్త (Hasta)",
    lagnam: "తుల లగ్నం (Tula Lagnam)",
    timeRange: "రాత్రి 08:00 నుండి 09:15 వరకు",
    isAmruthaGadiya: true,
    notes: "హస్తా నక్షత్ర అమృత యోగ ముహూర్తం."
  },
  {
    date: "2026-11-15",
    teluguDate: "15 నవంబర్ 2026 (ఆదివారం)",
    teluguMonth: "కార్తీక మాసం",
    season: "హేమంత రుతువు",
    thithi: "శుక్ల సప్తమి",
    nakshatram: "శ్రవణం (Shravana)",
    lagnam: "మకర లగ్నం (Makara Lagnam)",
    timeRange: "ఉదయం 09:20 నుండి 10:35 వరకు",
    isAmruthaGadiya: true,
    notes: "శ్రవణా నక్షత్ర సుముహూర్తం."
  },
  {
    date: "2026-11-21",
    teluguDate: "21 నవంబర్ 2026 (శనివారం)",
    teluguMonth: "మార్గశిర మాసం",
    season: "హేమంత రుతువు",
    thithi: "శుక్ల ద్వాదశి",
    nakshatram: "అనూరాధ (Anuradha)",
    lagnam: "వృశ్చిక లగ్నం (Vrischika Lagnam)",
    timeRange: "రాత్రి 10:15 నుండి 11:30 వరకు",
    isAmruthaGadiya: true,
    notes: "వైకుంఠ ద్వాదశి సమీప మార్గశిర ముహూర్తం."
  },
  {
    date: "2026-11-27",
    teluguDate: "27 నవంబర్ 2026 (శుక్రవారం)",
    teluguMonth: "మార్గశిర మాసం",
    season: "హేమంత రుతువు",
    thithi: "బహుళ పంచమి",
    nakshatram: "పునర్వసు (Punarvasu)",
    lagnam: "మిథున లగ్నం (Mithuna Lagnam)",
    timeRange: "ఉదయం 06:45 నుండి 07:50 వరకు",
    isAmruthaGadiya: true,
    notes: "గురు పాలిత పునర్వసు ముహూర్తం."
  },

  // December 2026 (మార్గశిర / పుష్య మాసాలు)
  {
    date: "2026-12-06",
    teluguDate: "06 డిసెంబర్ 2026 (ఆదివారం)",
    teluguMonth: "మార్గశిర మాసం",
    season: "హేమంత రుతువు",
    thithi: "బహుళ ద్వాదశి",
    nakshatram: "స్వాతి (Swati)",
    lagnam: "తుల లగ్నం (Tula Lagnam)",
    timeRange: "ఉదయం 08:30 నుండి 09:40 వరకు",
    isAmruthaGadiya: true,
    notes: "వాయు దేవుని స్వాతి నక్షత్ర వివాహ లగ్నం."
  },
  {
    date: "2026-12-12",
    teluguDate: "12 డిసెంబర్ 2026 (శనివారం)",
    teluguMonth: "మార్గశిర మాసం",
    season: "హేమంత రుతువు",
    thithi: "శుక్ల తదియ",
    nakshatram: "శ్రవణం (Shravana)",
    lagnam: "ధనుస్సు లగ్నం (Dhanu Lagnam)",
    timeRange: "రాత్రి 08:45 నుండి 09:55 వరకు",
    isAmruthaGadiya: true,
    notes: "సంపూర్ణ గుణ సంపన్న శుభ లగ్నం."
  },

  // February 2027 (మాఘ మాసం - Golden Auspicious Season)
  {
    date: "2027-02-07",
    teluguDate: "07 ఫిబ్రవరి 2027 (ఆదివారం)",
    teluguMonth: "మాఘ మాసం",
    season: "శిశిర రుతువు",
    thithi: "శుక్ల పాడ్యమి / విదియ",
    nakshatram: "ధనిష్ఠ (Dhanishta)",
    lagnam: "కుంభ లగ్నం (Kumbha Lagnam)",
    timeRange: "ఉదయం 09:15 నుండి 10:30 వరకు",
    isAmruthaGadiya: true,
    notes: "మాఘ శుద్ధ దివ్య వివాహ ముహూర్తం — సర్వజన సమ్మతం."
  },
  {
    date: "2027-02-14",
    teluguDate: "14 ఫిబ్రవరి 2027 (ఆదివారం)",
    teluguMonth: "మాఘ మాసం",
    season: "శిశిర రుతువు",
    thithi: "శుక్ల అష్టమి",
    nakshatram: "రోహిణి (Rohini)",
    lagnam: "వృషభ లగ్నం (Vrishabha Lagnam)",
    timeRange: "రాత్రి 08:20 నుండి 09:40 వరకు",
    isAmruthaGadiya: true,
    notes: "రోహిణీ నక్షత్ర అమృత ఘడియల వివాహ లగ్నం."
  },
  {
    date: "2027-02-21",
    teluguDate: "21 ఫిబ్రవరి 2027 (ఆదివారం)",
    teluguMonth: "మాఘ మాసం",
    season: "శిశిర రుతువు",
    thithi: "శుక్ల పౌర్ణమి",
    nakshatram: "మఘ (Magha)",
    lagnam: "సింహ లగ్నం (Simha Lagnam)",
    timeRange: "ఉదయం 07:45 నుండి 09:00 వరకు",
    isAmruthaGadiya: true,
    notes: "మాఘ పౌర్ణమి దివ్య కల్యాణ మహోత్సవ ముహూర్తం."
  },

  // March 2027 (ఫాల్గుణ మాసం)
  {
    date: "2027-03-05",
    teluguDate: "05 మార్చి 2027 (శుక్రవారం)",
    teluguMonth: "ఫాల్గుణ మాసం",
    season: "శిశిర రుతువు",
    thithi: "శుక్ల త్రయోదశి",
    nakshatram: "ఉత్తరాభాద్ర (Uttarabhadra)",
    lagnam: "మీన లగ్నం (Meena Lagnam)",
    timeRange: "ఉదయం 08:30 నుండి 09:45 వరకు",
    isAmruthaGadiya: true,
    notes: "ఫాల్గుణ శుద్ధ అమృత ముహూర్తం."
  },
  {
    date: "2027-03-12",
    teluguDate: "12 మార్చి 2027 (శుక్రవారం)",
    teluguMonth: "ఫాల్గుణ మాసం",
    season: "వసంత రుతువు",
    thithi: "బహుళ పంచమి",
    nakshatram: "అశ్విని (Ashwini)",
    lagnam: "మేష లగ్నం (Mesha Lagnam)",
    timeRange: "ఉదయం 07:15 నుండి 08:30 వరకు",
    isAmruthaGadiya: true,
    notes: "వసంతాగమన అశ్వినీ నక్షత్ర శుభ ముహూర్తం."
  },

  // April - May 2027 (చైత్ర / వైశాఖ మాసాలు)
  {
    date: "2027-04-18",
    teluguDate: "18 ఏప్రిల్ 2027 (ఆదివారం)",
    teluguMonth: "చైత్ర మాసం",
    season: "వసంత రుతువు",
    thithi: "శుక్ల ద్వాదశి",
    nakshatram: "ఉత్తర ఫల్గుణి (Uttara)",
    lagnam: "కన్యా లగ్నం (Kanya Lagnam)",
    timeRange: "రాత్రి 09:00 నుండి 10:15 వరకు",
    isAmruthaGadiya: true,
    notes: "శ్రీరామ నవమి పర్వదిన మాస దివ్య ముహూర్తం."
  },
  {
    date: "2027-05-02",
    teluguDate: "02 మే 2027 (ఆదివారం)",
    teluguMonth: "వైశాఖ మాసం",
    season: "వసంత రుతువు",
    thithi: "శుక్ల ఏకాదశి",
    nakshatram: "హస్త (Hasta)",
    lagnam: "తుల లగ్నం (Tula Lagnam)",
    timeRange: "ఉదయం 08:45 నుండి 10:00 వరకు",
    isAmruthaGadiya: true,
    notes: "వైశాఖ శుద్ధ మోహినీ ఏకాదశి కల్యాణ లగ్నం."
  },
  {
    date: "2027-05-16",
    teluguDate: "16 మే 2027 (ఆదివారం)",
    teluguMonth: "వైశాఖ మాసం",
    season: "వసంత రుతువు",
    thithi: "శుక్ల దశమి",
    nakshatram: "స్వాతి (Swati)",
    lagnam: "వృశ్చిక లగ్నం (Vrischika Lagnam)",
    timeRange: "రాత్రి 08:30 నుండి 09:45 వరకు",
    isAmruthaGadiya: true,
    notes: "వైశాఖ మాస అత్యుత్తమ వివాహ సుముహూర్తం."
  },
];
