/**
 * MANA VIVAHA — TELUGU PANCHANGAM VIVAHA MUHURTHAMS (2026 - 2027) 💍📅
 * =======================================================================
 * Reference date/time entries. The source has not been independently validated;
 * confirm locally before relying on any date or timing.
 */

export interface MuhurthamDate {
  date: string;         // YYYY-MM-DD
  teluguDate: string;   // e.g. "12 అక్టోబర్ 2026 (సోమవారం)"
  teluguMonth: string;  // e.g. "ఆశ్వయుజ మాసం"
  thithi: string;       // e.g. "శుక్ల పాడ్యమి / విదియ"
  nakshatram: string;   // e.g. "స్వాతి / విశాఖ"
  lagnam: string;       // e.g. "ధనుస్సు లగ్నం"
  timeRange: string;    // e.g. "రాత్రి 08:45 నుండి 09:30 వరకు"
}

export const VIVAHA_MUHURTHAMS_2026_2027: MuhurthamDate[] = [
  // October 2026 (ఆశ్వయుజ / కార్తీక మాసాలు)
  {
    date: "2026-10-18",
    teluguDate: "18 అక్టోబర్ 2026 (ఆదివారం)",
    teluguMonth: "ఆశ్వయుజ మాసం",
    thithi: "శుక్ల అష్టమి",
    nakshatram: "ఉత్తరాషాఢ (Uttarashadha)",
    lagnam: "ధనుస్సు లగ్నం (Dhanu Lagnam)",
    timeRange: "ఉదయం 08:15 నుండి 09:20 వరకు",
  },
  {
    date: "2026-10-24",
    teluguDate: "24 అక్టోబర్ 2026 (శనివారం)",
    teluguMonth: "ఆశ్వయుజ మాసం",
    thithi: "శుక్ల చతుర్దశి",
    nakshatram: "రేవతి (Revati)",
    lagnam: "మీన లగ్నం (Meena Lagnam)",
    timeRange: "రాత్రి 09:10 నుండి 10:25 వరకు",
  },
  {
    date: "2026-10-29",
    teluguDate: "29 అక్టోబర్ 2026 (గురువారం)",
    teluguMonth: "కార్తీక మాసం",
    thithi: "శుక్ల చవితి",
    nakshatram: "మృగశిర (Mrigasira)",
    lagnam: "వృషభ లగ్నం (Vrishabha Lagnam)",
    timeRange: "తెల్లవారుజామున 03:45 నుండి 04:30 వరకు",
  },

  // November 2026 (కార్తీక / మార్గశిర మాసాలు)
  {
    date: "2026-11-04",
    teluguDate: "04 నవంబర్ 2026 (బుధవారం)",
    teluguMonth: "కార్తీక మాసం",
    thithi: "శుక్ల దశమి",
    nakshatram: "ఉత్తర ఫల్గుణి (Uttara)",
    lagnam: "కన్యా లగ్నం (Kanya Lagnam)",
    timeRange: "ఉదయం 07:30 నుండి 08:45 వరకు",
  },
  {
    date: "2026-11-08",
    teluguDate: "08 నవంబర్ 2026 (ఆదివారం)",
    teluguMonth: "కార్తీక మాసం",
    thithi: "శుక్ల త్రయోదశి",
    nakshatram: "హస్త (Hasta)",
    lagnam: "తుల లగ్నం (Tula Lagnam)",
    timeRange: "రాత్రి 08:00 నుండి 09:15 వరకు",
  },
  {
    date: "2026-11-15",
    teluguDate: "15 నవంబర్ 2026 (ఆదివారం)",
    teluguMonth: "కార్తీక మాసం",
    thithi: "శుక్ల సప్తమి",
    nakshatram: "శ్రవణం (Shravana)",
    lagnam: "మకర లగ్నం (Makara Lagnam)",
    timeRange: "ఉదయం 09:20 నుండి 10:35 వరకు",
  },
  {
    date: "2026-11-21",
    teluguDate: "21 నవంబర్ 2026 (శనివారం)",
    teluguMonth: "మార్గశిర మాసం",
    thithi: "శుక్ల ద్వాదశి",
    nakshatram: "అనూరాధ (Anuradha)",
    lagnam: "వృశ్చిక లగ్నం (Vrischika Lagnam)",
    timeRange: "రాత్రి 10:15 నుండి 11:30 వరకు",
  },
  {
    date: "2026-11-27",
    teluguDate: "27 నవంబర్ 2026 (శుక్రవారం)",
    teluguMonth: "మార్గశిర మాసం",
    thithi: "బహుళ పంచమి",
    nakshatram: "పునర్వసు (Punarvasu)",
    lagnam: "మిథున లగ్నం (Mithuna Lagnam)",
    timeRange: "ఉదయం 06:45 నుండి 07:50 వరకు",
  },

  // December 2026 (మార్గశిర / పుష్య మాసాలు)
  {
    date: "2026-12-06",
    teluguDate: "06 డిసెంబర్ 2026 (ఆదివారం)",
    teluguMonth: "మార్గశిర మాసం",
    thithi: "బహుళ ద్వాదశి",
    nakshatram: "స్వాతి (Swati)",
    lagnam: "తుల లగ్నం (Tula Lagnam)",
    timeRange: "ఉదయం 08:30 నుండి 09:40 వరకు",
  },
  {
    date: "2026-12-12",
    teluguDate: "12 డిసెంబర్ 2026 (శనివారం)",
    teluguMonth: "మార్గశిర మాసం",
    thithi: "శుక్ల తదియ",
    nakshatram: "శ్రవణం (Shravana)",
    lagnam: "ధనుస్సు లగ్నం (Dhanu Lagnam)",
    timeRange: "రాత్రి 08:45 నుండి 09:55 వరకు",
  },

  // February 2027 (మాఘ మాసం)
  {
    date: "2027-02-07",
    teluguDate: "07 ఫిబ్రవరి 2027 (ఆదివారం)",
    teluguMonth: "మాఘ మాసం",
    thithi: "శుక్ల పాడ్యమి / విదియ",
    nakshatram: "ధనిష్ఠ (Dhanishta)",
    lagnam: "కుంభ లగ్నం (Kumbha Lagnam)",
    timeRange: "ఉదయం 09:15 నుండి 10:30 వరకు",
  },
  {
    date: "2027-02-14",
    teluguDate: "14 ఫిబ్రవరి 2027 (ఆదివారం)",
    teluguMonth: "మాఘ మాసం",
    thithi: "శుక్ల అష్టమి",
    nakshatram: "రోహిణి (Rohini)",
    lagnam: "వృషభ లగ్నం (Vrishabha Lagnam)",
    timeRange: "రాత్రి 08:20 నుండి 09:40 వరకు",
  },
  {
    date: "2027-02-21",
    teluguDate: "21 ఫిబ్రవరి 2027 (ఆదివారం)",
    teluguMonth: "మాఘ మాసం",
    thithi: "శుక్ల పౌర్ణమి",
    nakshatram: "మఘ (Magha)",
    lagnam: "సింహ లగ్నం (Simha Lagnam)",
    timeRange: "ఉదయం 07:45 నుండి 09:00 వరకు",
  },

  // March 2027 (ఫాల్గుణ మాసం)
  {
    date: "2027-03-05",
    teluguDate: "05 మార్చి 2027 (శుక్రవారం)",
    teluguMonth: "ఫాల్గుణ మాసం",
    thithi: "శుక్ల త్రయోదశి",
    nakshatram: "ఉత్తరాభాద్ర (Uttarabhadra)",
    lagnam: "మీన లగ్నం (Meena Lagnam)",
    timeRange: "ఉదయం 08:30 నుండి 09:45 వరకు",
  },
  {
    date: "2027-03-12",
    teluguDate: "12 మార్చి 2027 (శుక్రవారం)",
    teluguMonth: "ఫాల్గుణ మాసం",
    thithi: "బహుళ పంచమి",
    nakshatram: "అశ్విని (Ashwini)",
    lagnam: "మేష లగ్నం (Mesha Lagnam)",
    timeRange: "ఉదయం 07:15 నుండి 08:30 వరకు",
  },

  // April - May 2027 (చైత్ర / వైశాఖ మాసాలు)
  {
    date: "2027-04-18",
    teluguDate: "18 ఏప్రిల్ 2027 (ఆదివారం)",
    teluguMonth: "చైత్ర మాసం",
    thithi: "శుక్ల ద్వాదశి",
    nakshatram: "ఉత్తర ఫల్గుణి (Uttara)",
    lagnam: "కన్యా లగ్నం (Kanya Lagnam)",
    timeRange: "రాత్రి 09:00 నుండి 10:15 వరకు",
  },
  {
    date: "2027-05-02",
    teluguDate: "02 మే 2027 (ఆదివారం)",
    teluguMonth: "వైశాఖ మాసం",
    thithi: "శుక్ల ఏకాదశి",
    nakshatram: "హస్త (Hasta)",
    lagnam: "తుల లగ్నం (Tula Lagnam)",
    timeRange: "ఉదయం 08:45 నుండి 10:00 వరకు",
  },
  {
    date: "2027-05-16",
    teluguDate: "16 మే 2027 (ఆదివారం)",
    teluguMonth: "వైశాఖ మాసం",
    thithi: "శుక్ల దశమి",
    nakshatram: "స్వాతి (Swati)",
    lagnam: "వృశ్చిక లగ్నం (Vrischika Lagnam)",
    timeRange: "రాత్రి 08:30 నుండి 09:45 వరకు",
  },
];


export function formatMuhurthamDate(item: MuhurthamDate, telugu: boolean): string {
  if (telugu) return item.teluguDate;
  return new Date(`${item.date}T00:00:00Z`).toLocaleDateString("en-IN", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric", timeZone: "UTC",
  });
}

export function formatMuhurthamMonth(item: MuhurthamDate, telugu: boolean): string {
  if (telugu) return item.teluguMonth;
  return new Date(`${item.date}T00:00:00Z`).toLocaleDateString("en-IN", {
    month: "long", year: "numeric", timeZone: "UTC",
  });
}

const ENGLISH_NAKSHATRAS: Record<string, string> = {
  "ఉత్తరాషాఢ": "Uttara Ashadha",
  "ఉత్తర ఫల్గుణి": "Uttara Phalguni",
  "రేవతి": "Revati",
  "మృగశిర": "Mrigashira",
  "హస్త": "Hasta",
  "శ్రవణం": "Shravana",
  "అనూరాధ": "Anuradha",
  "పునర్వసు": "Punarvasu",
  "స్వాతి": "Swati",
  "విశాఖ": "Vishakha",
  "ధనిష్ఠ": "Dhanishtha",
  "రోహిణి": "Rohini",
  "మఘ": "Magha",
  "ఉత్తరాభాద్ర": "Uttara Bhadrapada",
  "అశ్విని": "Ashwini",
};

const ENGLISH_ASCENDANTS: Record<string, string> = {
  "ధనుస్సు": "Sagittarius",
  "మీన": "Pisces",
  "వృషభ": "Taurus",
  "కన్యా": "Virgo",
  "తుల": "Libra",
  "మకర": "Capricorn",
  "వృశ్చిక": "Scorpio",
  "మిథున": "Gemini",
  "కుంభ": "Aquarius",
  "సింహ": "Leo",
  "మేష": "Aries",
};

const ENGLISH_THITHIS: Record<string, string> = {
  "శుక్ల అష్టమి": "Shukla Ashtami",
  "శుక్ల చతుర్దశి": "Shukla Chaturdashi",
  "శుక్ల చవితి": "Shukla Chaturthi",
  "శుక్ల దశమి": "Shukla Dashami",
  "శుక్ల త్రయోదశి": "Shukla Trayodashi",
  "శుక్ల సప్తమి": "Shukla Saptami",
  "శుక్ల ద్వాదశి": "Shukla Dwadashi",
  "బహుళ పంచమి": "Bahula Panchami",
  "బహుళ ద్వాదశి": "Bahula Dwadashi",
  "శుక్ల తదియ": "Shukla Tritiya",
  "శుక్ల పాడ్యమి": "Shukla Pratipada",
  "విదియ": "Dwitiya",
  "శుక్ల పౌర్ణమి": "Shukla Purnima",
  "శుక్ల ఏకాదశి": "Shukla Ekadashi",
};

function englishTerm(value: string, dictionary: Record<string, string>, fallback: string): string {
  const cleaned = value.trim().replace(/\s*\([^()]*\)\s*/g, "").trim();
  const mapped = dictionary[cleaned];
  if (mapped) return mapped;
  const transliteration = value.match(/\(([^()]*)\)/)?.[1]?.trim();
  if (transliteration && !/[\u0c00-\u0c7f]/.test(transliteration)) return transliteration;
  return /[\u0c00-\u0c7f]/.test(cleaned) ? fallback : cleaned;
}

export function formatMuhurthamNakshatra(item: MuhurthamDate, telugu: boolean): string {
  if (telugu) return item.nakshatram;
  return item.nakshatram.split("/").map((part) => englishTerm(part, ENGLISH_NAKSHATRAS, "Not listed in English")).join(" / ");
}

export function formatMuhurthamLagnam(item: MuhurthamDate, telugu: boolean): string {
  if (telugu) return item.lagnam;
  const source = item.lagnam.replace(/\s*లగ్నం/g, "").trim();
  const term = englishTerm(source, ENGLISH_ASCENDANTS, "Ascendant not listed in English");
  return /not listed/i.test(term) ? term : `${term} ascendant`;
}

export function formatMuhurthamThithi(item: MuhurthamDate, telugu: boolean): string {
  if (telugu) return item.thithi;
  return item.thithi.split("/").map((part) => englishTerm(part, ENGLISH_THITHIS, "Not listed in English")).join(" / ");
}

export function formatMuhurthamTime(item: MuhurthamDate, telugu: boolean): string {
  if (telugu) return item.timeRange;
  return item.timeRange
    .replace(/^తెల్లవారుజామున/, "Early morning")
    .replace(/^ఉదయం/, "Morning")
    .replace(/^రాత్రి/, "Night")
    .replace(" నుండి ", "–")
    .replace(" వరకు", "");
}
