/**
 * MANA VIVAHA — COMPREHENSIVE TELUGU MATRIMONIAL TAXONOMY 💍
 * ==========================================================
 * All 33 Telangana Districts + All 26 Andhra Pradesh Districts
 * All Top NRI Countries (USA, UK, Australia, Canada, Germany, UAE, Singapore, etc.)
 * All 50+ Telugu Castes + Authentic Sub-castes
 * 27 Vedic Nakshatras & 12 Rasis with Telugu + English Side-by-Side
 * Categorized Educations, Work Types & Granular ₹1L - ₹1Cr+ Salary Brackets
 */

// =========================================================================
// 🕉️ 27 VEDIC NAKSHATRAS — TELUGU + ENGLISH
// =========================================================================
export interface NakshatraItem {
  te: string;
  en: string;
  display: string;
  rulingPlanet?: string;
}

export const NAKSHATRAS: NakshatraItem[] = [
  { te: "అశ్విని", en: "Ashwini", display: "అశ్విని (Ashwini)", rulingPlanet: "Ketu" },
  { te: "భరణి", en: "Bharani", display: "భరణి (Bharani)", rulingPlanet: "Venus" },
  { te: "కృత్తిక", en: "Krittika", display: "కృత్తిక (Krittika)", rulingPlanet: "Sun" },
  { te: "రోహిణి", en: "Rohini", display: "రోహిణి (Rohini)", rulingPlanet: "Moon" },
  { te: "మృగశిర", en: "Mrigasira", display: "మృగశిర (Mrigasira)", rulingPlanet: "Mars" },
  { te: "ఆరుద్ర", en: "Ardra", display: "ఆరుద్ర (Ardra)", rulingPlanet: "Rahu" },
  { te: "పునర్వసు", en: "Punarvasu", display: "పునర్వసు (Punarvasu)", rulingPlanet: "Jupiter" },
  { te: "పుష్యమి", en: "Pushya", display: "పుష్యమి (Pushya)", rulingPlanet: "Saturn" },
  { te: "ఆశ్లేష", en: "Ashlesha", display: "ఆశ్లేష (Ashlesha)", rulingPlanet: "Mercury" },
  { te: "మఘ", en: "Magha", display: "మఘ (Magha)", rulingPlanet: "Ketu" },
  { te: "పూర్వ ఫల్గుణి / పుబ్బ", en: "Pubba", display: "పూర్వ ఫల్గుణి / పుబ్బ (Pubba)", rulingPlanet: "Venus" },
  { te: "ఉత్తర ఫల్గుణి / ఉత్తర", en: "Uttara", display: "ఉత్తర ఫల్గుణి (Uttara)", rulingPlanet: "Sun" },
  { te: "హస్త", en: "Hasta", display: "హస్త (Hasta)", rulingPlanet: "Moon" },
  { te: "చిత్ర", en: "Chitra", display: "చిత్ర (Chitra)", rulingPlanet: "Mars" },
  { te: "స్వాతి", en: "Swati", display: "స్వాతి (Swati)", rulingPlanet: "Rahu" },
  { te: "విశాఖ", en: "Vishakha", display: "విశాఖ (Vishakha)", rulingPlanet: "Jupiter" },
  { te: "అనూరాధ", en: "Anuradha", display: "అనూరాధ (Anuradha)", rulingPlanet: "Saturn" },
  { te: "జ్యేష్ఠ", en: "Jyeshtha", display: "జ్యేష్ఠ (Jyeshtha)", rulingPlanet: "Mercury" },
  { te: "మూల", en: "Moola", display: "మూల (Moola)", rulingPlanet: "Ketu" },
  { te: "పూర్వాషాఢ", en: "Purvashadha", display: "పూర్వాషాఢ (Purvashadha)", rulingPlanet: "Venus" },
  { te: "ఉత్తరాషాఢ", en: "Uttarashadha", display: "ఉత్తరాషాఢ (Uttarashadha)", rulingPlanet: "Sun" },
  { te: "శ్రవణం", en: "Shravana", display: "శ్రవణం (Shravana)", rulingPlanet: "Moon" },
  { te: "ధనిష్ఠ", en: "Dhanishta", display: "ధనిష్ఠ (Dhanishta)", rulingPlanet: "Mars" },
  { te: "శతభిషం", en: "Shatabhisha", display: "శతభిషం (Shatabhisha)", rulingPlanet: "Rahu" },
  { te: "పూర్వాభాద్ర", en: "Purvabhadra", display: "పూర్వాభాద్ర (Purvabhadra)", rulingPlanet: "Jupiter" },
  { te: "ఉత్తరాభాద్ర", en: "Uttarabhadra", display: "ఉత్తరాభాద్ర (Uttarabhadra)", rulingPlanet: "Saturn" },
  { te: "రేవతి", en: "Revati", display: "రేవతి (Revati)", rulingPlanet: "Mercury" },
];

export const NAK_TO_RASI: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  const rasiOrder = ["Mesha", "Vrishabha", "Mithuna", "Karkataka", "Simha", "Kanya",
    "Tula", "Vrishchika", "Dhanu", "Makara", "Kumbha", "Meena"];
  const idx = [0, 0, 1, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 11];
  NAKSHATRAS.forEach((n, i) => { map[n.en] = rasiOrder[idx[i]]; });
  return map;
})();

// =========================================================================
// 🌙 12 RASIS (VEDIC MOON SIGNS) — TELUGU + ENGLISH
// =========================================================================
export interface RasiItem {
  te: string;
  en: string;
  western: string;
  display: string;
}

export const RASIS: RasiItem[] = [
  { te: "మేషం", en: "Mesha", western: "Aries", display: "మేషం (Mesha / Aries)" },
  { te: "వృషభం", en: "Vrishabha", western: "Taurus", display: "వృషభం (Vrishabha / Taurus)" },
  { te: "మిథునం", en: "Mithuna", western: "Gemini", display: "మిథునం (Mithuna / Gemini)" },
  { te: "కర్కాటకం", en: "Karkataka", western: "Cancer", display: "కర్కాటకం (Karkataka / Cancer)" },
  { te: "సింహం", en: "Simha", western: "Leo", display: "సింహం (Simha / Leo)" },
  { te: "కన్య", en: "Kanya", western: "Virgo", display: "కన్య (Kanya / Virgo)" },
  { te: "తుల", en: "Tula", western: "Libra", display: "తుల (Tula / Libra)" },
  { te: "వృశ్చికం", en: "Vrishchika", western: "Scorpio", display: "వృశ్చికం (Vrishchika / Scorpio)" },
  { te: "ధనుస్సు", en: "Dhanu", western: "Sagittarius", display: "ధనుస్సు (Dhanu / Sagittarius)" },
  { te: "మకరం", en: "Makara", western: "Capricorn", display: "మకరం (Makara / Capricorn)" },
  { te: "కుంభం", en: "Kumbha", western: "Aquarius", display: "కుంభం (Kumbha / Aquarius)" },
  { te: "మీనం", en: "Meena", western: "Pisces", display: "మీనం (Meena / Pisces)" },
];

// =========================================================================
// 🏛️ ALL 33 OFFICIAL DISTRICTS OF TELANGANA (తెలంగాణ సమగ్ర జిల్లాలు)
// =========================================================================
export interface DistrictDetail {
  en: string;
  te: string;
  display: string;
  state: "TS" | "AP" | "Other";
}

export const TS_DISTRICTS_DETAILED: DistrictDetail[] = [
  { en: "Adilabad", te: "ఆదిలాబాద్", display: "ఆదిలాబాద్ (Adilabad)", state: "TS" },
  { en: "Bhadradri Kothagudem", te: "భద్రాద్రి కొత్తగూడెం", display: "భద్రాద్రి కొత్తగూడెం (Bhadradri Kothagudem)", state: "TS" },
  { en: "Hanamkonda", te: "హనుమకొండ", display: "హనుమకొండ (Hanamkonda)", state: "TS" },
  { en: "Hyderabad", te: "హైదరాబాద్", display: "హైదరాబాద్ (Hyderabad)", state: "TS" },
  { en: "Jagtial", te: "జగిత్యాల", display: "జగిత్యాల (Jagtial)", state: "TS" },
  { en: "Jangaon", te: "జనగామ", display: "జనగామ (Jangaon)", state: "TS" },
  { en: "Jayashankar Bhupalpally", te: "జయశంకర్ భూపాలపల్లి", display: "జయశంకర్ భూపాలపల్లి (Jayashankar Bhupalpally)", state: "TS" },
  { en: "Jogulamba Gadwal", te: "జోగులాంబ గద్వాల", display: "జోగులాంబ గద్వాల (Jogulamba Gadwal)", state: "TS" },
  { en: "Kamareddy", te: "కామారెడ్డి", display: "కామారెడ్డి (Kamareddy)", state: "TS" },
  { en: "Karimnagar", te: "కరీంనగర్", display: "కరీంనగర్ (Karimnagar)", state: "TS" },
  { en: "Khammam", te: "ఖమ్మం", display: "ఖమ్మం (Khammam)", state: "TS" },
  { en: "Kumuram Bheem Asifabad", te: "కుమురం భీమ్ ఆసిఫాబాద్", display: "కుమురం భీమ్ ఆసిఫాబాద్ (Kumuram Bheem)", state: "TS" },
  { en: "Mahabubabad", te: "మహబూబాబాద్", display: "మహబూబాబాద్ (Mahabubabad)", state: "TS" },
  { en: "Mahbubnagar", te: "మహబూబ్‌నగర్", display: "మహబూబ్‌నగర్ (Mahbubnagar)", state: "TS" },
  { en: "Mancherial", te: "మంచిర్యాల", display: "మంచిర్యాల (Mancherial)", state: "TS" },
  { en: "Medak", te: "మెదక్", display: "మెదక్ (Medak)", state: "TS" },
  { en: "Medchal-Malkajgiri", te: "మేడ్చల్-మల్కాజ్‌గిరి", display: "మేడ్చల్-మల్కాజ్‌గిరి (Medchal)", state: "TS" },
  { en: "Mulugu", te: "ములుగు", display: "ములుగు (Mulugu)", state: "TS" },
  { en: "Nagarkurnool", te: "నాగర్‌కర్నూల్", display: "నాగర్‌కర్నూల్ (Nagarkurnool)", state: "TS" },
  { en: "Nalgonda", te: "నల్గొండ", display: "నల్గొండ (Nalgonda)", state: "TS" },
  { en: "Narayanpet", te: "నారాయణపేట", display: "నారాయణపేట (Narayanpet)", state: "TS" },
  { en: "Nirmal", te: "నిర్మల్", display: "నిర్మల్ (Nirmal)", state: "TS" },
  { en: "Nizamabad", te: "నిజామాబాద్", display: "నిజామాబాద్ (Nizamabad)", state: "TS" },
  { en: "Peddapalli", te: "పెద్దపల్లి", display: "పెద్దపల్లి (Peddapalli)", state: "TS" },
  { en: "Rajanna Sircilla", te: "రాజన్న సిరిసిల్ల", display: "రాజన్న సిరిసిల్ల (Rajanna Sircilla)", state: "TS" },
  { en: "Rangareddy", te: "రంగారెడ్డి", display: "రంగారెడ్డి (Rangareddy)", state: "TS" },
  { en: "Sangareddy", te: "సంగారెడ్డి", display: "సంగారెడ్డి (Sangareddy)", state: "TS" },
  { en: "Siddipet", te: "సిద్దిపేట", display: "సిద్దిపేట (Siddipet)", state: "TS" },
  { en: "Suryapet", te: "సూర్యాపేట", display: "సూర్యాపేట (Suryapet)", state: "TS" },
  { en: "Vikarabad", te: "వికారాబాద్", display: "వికారాబాద్ (Vikarabad)", state: "TS" },
  { en: "Wanaparthy", te: "వనపర్తి", display: "వనపర్తి (Wanaparthy)", state: "TS" },
  { en: "Warangal", te: "వరంగల్", display: "వరంగల్ (Warangal)", state: "TS" },
  { en: "Yadadri Bhuvanagiri", te: "యాదాద్రి భువనగిరి", display: "యాదాద్రి భువనగిరి (Yadadri Bhuvanagiri)", state: "TS" },
];

export const TS_DISTRICTS: string[] = TS_DISTRICTS_DETAILED.map((d) => d.en);

// =========================================================================
// 🌊 ALL 26 OFFICIAL DISTRICTS OF ANDHRA PRADESH (ఆంధ్రప్రదేశ్ సమగ్ర జిల్లాలు)
// =========================================================================
export const AP_DISTRICTS_DETAILED: DistrictDetail[] = [
  { en: "Alluri Sitharama Raju", te: "అల్లూరి సీతారామరాజు", display: "అల్లూరి సీతారామరాజు (Alluri Sitharama Raju)", state: "AP" },
  { en: "Anakapalli", te: "అనకాపల్లి", display: "అనకాపల్లి (Anakapalli)", state: "AP" },
  { en: "Ananthapuramu", te: "అనంతపురం", display: "అనంతపురం (Ananthapuramu)", state: "AP" },
  { en: "Annamayya", te: "అన్నమయ్య", display: "అన్నమయ్య (Annamayya / Rayachoti)", state: "AP" },
  { en: "Bapatla", te: "బాపట్ల", display: "బాపట్ల (Bapatla)", state: "AP" },
  { en: "Chittoor", te: "చిత్తూరు", display: "చిత్తూరు (Chittoor)", state: "AP" },
  { en: "Dr. B.R. Ambedkar Konaseema", te: "కోనసీమ", display: "కోనసీమ (Dr. BR Ambedkar Konaseema)", state: "AP" },
  { en: "East Godavari", te: "తూర్పు గోదావరి (రాజమండ్రి)", display: "తూర్పు గోదావరి (East Godavari / Rajahmundry)", state: "AP" },
  { en: "Eluru", te: "ఏలూరు", display: "ఏలూరు (Eluru)", state: "AP" },
  { en: "Guntur", te: "గుంటూరు", display: "గుంటూరు (Guntur)", state: "AP" },
  { en: "Kakinada", te: "కాకినాడ", display: "కాకినాడ (Kakinada)", state: "AP" },
  { en: "Krishna", te: "కృష్ణా (మచిలీపట్నం)", display: "కృష్ణా (Krishna / Machilipatnam)", state: "AP" },
  { en: "Kurnool", te: "కర్నూలు", display: "కర్నూలు (Kurnool)", state: "AP" },
  { en: "Nandyal", te: "నంద్యాల", display: "నంద్యాల (Nandyal)", state: "AP" },
  { en: "NTR", te: "ఎన్టీఆర్ (విజయవాడ)", display: "ఎన్టీఆర్ (NTR / Vijayawada)", state: "AP" },
  { en: "Palnadu", te: "పల్నాడు (నరసరావుపేట)", display: "పల్నాడు (Palnadu / Narasaraopet)", state: "AP" },
  { en: "Parvathipuram Manyam", te: "పార్వతీపురం మన్యం", display: "పార్వతీపురం మన్యం (Parvathipuram Manyam)", state: "AP" },
  { en: "Prakasam", te: "ప్రకాశం (ఒంగోలు)", display: "ప్రకాశం (Prakasam / Ongole)", state: "AP" },
  { en: "Sri Potti Sriramulu Nellore", te: "నెల్లూరు", display: "నెల్లూరు (SPS Nellore)", state: "AP" },
  { en: "Sri Sathya Sai", te: "శ్రీ సత్యసాయి (పుట్టపర్తి)", display: "శ్రీ సత్యసాయి (Sri Sathya Sai / Puttaparthi)", state: "AP" },
  { en: "Srikakulam", te: "శ్రీకాకుళం", display: "శ్రీకాకుళం (Srikakulam)", state: "AP" },
  { en: "Tirupati", te: "తిరుపతి", display: "తిరుపతి (Tirupati)", state: "AP" },
  { en: "Visakhapatnam", te: "విశాఖపట్నం", display: "విశాఖపట్నం (Visakhapatnam)", state: "AP" },
  { en: "Vizianagaram", te: "విజయనగరం", display: "విజయనగరం (Vizianagaram)", state: "AP" },
  { en: "West Godavari", te: "పశ్చిమ గోదావరి (భీమవరం)", display: "పశ్చిమ గోదావరి (West Godavari / Bhimavaram)", state: "AP" },
  { en: "YSR Kadapa", te: "వైఎస్సార్ కడప", display: "వైఎస్సార్ కడప (YSR Kadapa)", state: "AP" },
];

export const AP_DISTRICTS: string[] = AP_DISTRICTS_DETAILED.map((d) => d.en);

// =========================================================================
// ✈️ NRI COUNTRIES & OTHER REGIONS (ప్రధాన విదేశాలు & ఇతర రాష్ట్రాలు)
// =========================================================================
export interface CountryDetail {
  code: string;
  en: string;
  te: string;
  display: string;
  flag: string;
  popular?: boolean;
}

export const NRI_COUNTRIES: CountryDetail[] = [
  { code: "USA", en: "USA / United States", te: "అమెరికా (USA)", display: "🇺🇸 USA / United States (అమెరికా)", flag: "🇺🇸", popular: true },
  { code: "UK", en: "United Kingdom (UK)", te: "యునైటెడ్ కింగ్‌డమ్ (UK / బ్రిటన్)", display: "🇬🇧 UK / United Kingdom (బ్రిటన్)", flag: "🇬🇧", popular: true },
  { code: "AUS", en: "Australia", te: "ఆస్ట్రేలియా (Australia)", display: "🇦🇺 Australia (ఆస్ట్రేలియా)", flag: "🇦🇺", popular: true },
  { code: "CAN", en: "Canada", te: "కెనడా (Canada)", display: "🇨🇦 Canada (కెనడా)", flag: "🇨🇦", popular: true },
  { code: "DEU", en: "Germany", te: "జర్మనీ (Germany)", display: "🇩🇪 Germany (జర్మనీ)", flag: "🇩🇪", popular: true },
  { code: "UAE", en: "UAE / Dubai", te: "దుబాయ్ / యు.ఎ.ఇ (Dubai / UAE)", display: "🇦🇪 UAE / Dubai (దుబాయ్ / ఎమిరేట్స్)", flag: "🇦🇪", popular: true },
  { code: "SGP", en: "Singapore", te: "సింగపూర్ (Singapore)", display: "🇸🇬 Singapore (సింగపూర్)", flag: "🇸🇬", popular: true },
  { code: "SAU", en: "Saudi Arabia", te: "సౌదీ అరేబియా (Saudi Arabia)", display: "🇸🇦 Saudi Arabia (సౌదీ అరేబియా)", flag: "🇸🇦" },
  { code: "QAT", en: "Qatar", te: "ఖతార్ (Qatar)", display: "🇶🇦 Qatar (ఖతార్)", flag: "🇶🇦" },
  { code: "KWT", en: "Kuwait", te: "కువైట్ (Kuwait)", display: "🇰🇼 Kuwait (కువైట్)", flag: "🇰🇼" },
  { code: "OMN", en: "Oman", te: "ఒమన్ (Oman)", display: "🇴🇲 Oman (ఒమన్)", flag: "🇴🇲" },
  { code: "BHR", en: "Bahrain", te: "బహ్రెయిన్ (Bahrain)", display: "🇧🇭 Bahrain (బహ్రెయిన్)", flag: "🇧🇭" },
  { code: "MYS", en: "Malaysia", te: "మలేషియా (Malaysia)", display: "🇲🇾 Malaysia (మలేషియా)", flag: "🇲🇾" },
  { code: "IRL", en: "Ireland", te: "ఐర్లాండ్ (Ireland)", display: "🇮🇪 Ireland (ఐర్లాండ్)", flag: "🇮🇪" },
  { code: "NZL", en: "New Zealand", te: "న్యూజిలాండ్ (New Zealand)", display: "🇳🇿 New Zealand (న్యూజిలాండ్)", flag: "🇳🇿" },
  { code: "NLD", en: "Netherlands", te: "నెదర్లాండ్స్ (Netherlands)", display: "🇳🇱 Netherlands (నెదర్లాండ్స్)", flag: "🇳🇱" },
  { code: "CHE", en: "Switzerland & Europe", te: "స్విట్జర్లాండ్ & యూరప్", display: "🇨🇭 Switzerland / Europe (స్విస్)", flag: "🇨🇭" },
  { code: "JPN", en: "Japan", te: "జపాన్ (Japan)", display: "🇯🇵 Japan (జపాన్)", flag: "🇯🇵" },
  { code: "FRA", en: "France", te: "ఫ్రాన్స్ (France)", display: "🇫🇷 France (ఫ్రాన్స్)", flag: "🇫🇷" },
  { code: "SWE", en: "Sweden & Nordics", te: "స్వీడన్ & నార్డిక్స్", display: "🇸🇪 Sweden / Nordics (నార్డిక్స్)", flag: "🇸🇪" },
  { code: "ZAF", en: "South Africa", te: "దక్షిణాఫ్రికా (South Africa)", display: "🇿🇦 South Africa (దక్షిణాఫ్రికా)", flag: "🇿🇦" },
  { code: "OTH", en: "Other Country", te: "ఇతర విదేశాలు (Other International)", display: "🌐 Other International (ఇతర దేశాలు)", flag: "🌐" },
];

export const OTHER_INDIAN_STATES: DistrictDetail[] = [
  { en: "Bangalore / Karnataka", te: "బెంగళూరు / కర్ణాటక", display: "బెంగళూరు (Bangalore / Karnataka)", state: "Other" },
  { en: "Chennai / Tamil Nadu", te: "చెన్నై / తమిళనాడు", display: "చెన్నై (Chennai / Tamil Nadu)", state: "Other" },
  { en: "Mumbai / Maharashtra", te: "ముంబై / మహారాష్ట్ర", display: "ముంబై / పూణే (Mumbai / Pune)", state: "Other" },
  { en: "Delhi / NCR", te: "ఢిల్లీ / ఎన్‌సీఆర్", display: "ఢిల్లీ / NCR (Delhi)", state: "Other" },
  { en: "Kerala", te: "కేరళ", display: "కేరళ (Kerala)", state: "Other" },
  { en: "Gujarat", te: "గుజరాత్", display: "గుజరాత్ (Gujarat)", state: "Other" },
  { en: "Odisha", te: "ఒడిశా", display: "ఒడిశా (Odisha)", state: "Other" },
  { en: "Other Indian State", te: "ఇతర భారత రాష్ట్రాలు", display: "భారతదేశంలోని ఇతర రాష్ట్రాలు (Other States)", state: "Other" },
];

export const OTHER_LOCATIONS: DistrictDetail[] = [
  ...NRI_COUNTRIES.map((c) => ({
    en: c.en,
    te: c.te,
    display: c.display,
    state: "Other" as const,
  })),
  ...OTHER_INDIAN_STATES,
];

export const DISTRICTS_BY_STATE: Record<string, string[]> = {
  TS: TS_DISTRICTS,
  AP: AP_DISTRICTS,
  Other: OTHER_LOCATIONS.map((l) => l.en),
};

export const DISTRICT_TELUGU: Record<string, string> = (() => {
  const map: Record<string, string> = {
    "Vijayawada (NTR)": "విజయవాడ",
    "Rajahmundry": "రాజమండ్రి",
    "Bhimavaram": "భీమవరం",
    "Ongole": "ఒంగోలు",
    "Machilipatnam": "మచిలీపట్నం",
    "Nellore": "నెల్లూరు",
    "Kadapa": "కడప",
    "Anantapur": "అనంతపురం",
  };
  TS_DISTRICTS_DETAILED.forEach((d) => { map[d.en] = d.te; });
  AP_DISTRICTS_DETAILED.forEach((d) => { map[d.en] = d.te; });
  OTHER_LOCATIONS.forEach((d) => { map[d.en] = d.te; });
  return map;
})();

// =========================================================================
// 💼 WORK TYPES & PROFESSION SECTORS (వృత్తి / ఉద్యోగ రకం)
// =========================================================================
export interface WorkTypeItem {
  id: string;
  en: string;
  te: string;
  display: string;
  icon: string;
  popular?: boolean;
}

export const WORK_TYPES_DETAILED: WorkTypeItem[] = [
  { id: "Software", en: "Software / IT / Tech", te: "సాఫ్ట్‌వేర్ / ఐటీ రంగం", display: "💻 సాఫ్ట్‌వేర్ / IT (Software / Tech)", icon: "💻", popular: true },
  { id: "Government", en: "Govt / Public Sector / PSU", te: "ప్రభుత్వ ఉద్యోగం (Govt Job)", display: "🏛️ ప్రభుత్వ ఉద్యోగం (Govt / PSU)", icon: "🏛️", popular: true },
  { id: "Doctor", en: "Doctor / Healthcare / Medical", te: "డాక్టర్ / వైద్యరంగం (Healthcare)", display: "🩺 డాక్టర్ / వైద్యం (Doctor / Medical)", icon: "🩺", popular: true },
  { id: "Business", en: "Business / Entrepreneur", te: "వ్యాపారం / బిజినెస్ / సొంత సంస్థ", display: "🏪 వ్యాపారం (Business / Owner)", icon: "🏪", popular: true },
  { id: "Banking", en: "Banking / Financial Services", te: "బ్యాంకింగ్ / ఫైనాన్స్ రంగం", display: "🏦 బ్యాంకింగ్ / ఫైనాన్స్ (Banking)", icon: "🏦", popular: true },
  { id: "NRI", en: "NRI / Working Abroad", te: "ఎన్ఆర్ఐ / విదేశీ ఉద్యోగం", display: "✈️ విదేశీ ఉద్యోగం (NRI / Abroad)", icon: "✈️", popular: true },
  { id: "Teaching", en: "Teacher / Lecturer / Professor", te: "బోధన / ప్రొఫెసర్ / లెక్చరర్", display: "📚 బోధన / లెక్చరర్ (Teaching)", icon: "📚" },
  { id: "Defence", en: "Civil Services / Defense / Police", te: "సివిల్స్ / రక్షణ దళాలు / పోలీస్", display: "🇮🇳 సివిల్స్ / పోలీస్ / రక్షణ", icon: "🇮🇳" },
  { id: "Lawyer", en: "Legal / Lawyer / Advocate", te: "న్యాయవాది / లీగల్ ప్రాక్టీస్", display: "⚖️ లాయర్ / న్యాయవాది (Legal)", icon: "⚖️" },
  { id: "Agriculture", en: "Agriculture / Farm Owner", te: "వ్యవసాయం / వ్యవసాయదారుడు", display: "🌾 వ్యవసాయం (Agriculture)", icon: "🌾" },
  { id: "Private", en: "Private Corporate / MNC", te: "ప్రైవేట్ కంపెనీ / కార్పొరేట్", display: "🏢 ప్రైవేట్ జాబ్ (Private Sector)", icon: "🏢" },
  { id: "Self Employed", en: "Self Employed / Consultant", te: "స్వయం ఉపాధి / కన్సల్టెంట్", display: "💼 స్వయం ఉపాధి (Self Employed)", icon: "💼" },
  { id: "Student", en: "Student / Preparing for Exams", te: "చదువుకుంటున్నారు / పోటీ పరీక్షలు", display: "🎓 విద్యార్థి / స్టూడెంట్ (Student)", icon: "🎓" },
  { id: "Not Working", en: "Homemaker / Not Working", te: "గృహిణి / ప్రస్తుతం చేయడం లేదు", display: "🏡 గృహిణి (Homemaker / None)", icon: "🏡" },
];

export const WORK_TYPES: string[] = WORK_TYPES_DETAILED.map((w) => w.en);

export const WORK_TYPE_TELUGU: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  WORK_TYPES_DETAILED.forEach((w) => {
    map[w.en] = w.te;
    map[w.id] = w.te;
  });
  return map;
})();

// =========================================================================
// 💰 GRANULAR SALARY RANGES IN LAKHS & CRORES (లక్షలు & కోట్లలో వేతనం)
// =========================================================================
export interface SalaryItem {
  id: string;
  en: string;
  te: string;
  display: string;
  minLakhs: number;
}

export const SALARIES_DETAILED: SalaryItem[] = [
  { id: "1L - 2L", en: "₹1 - 2 Lakhs / year", te: "₹1 - 2 లక్షలు / సం॥", display: "₹1 - 2 Lakhs / yr (₹1 - 2 లక్షలు)", minLakhs: 1 },
  { id: "2L - 3L", en: "₹2 - 3 Lakhs / year", te: "₹2 - 3 లక్షలు / సం॥", display: "₹2 - 3 Lakhs / yr (₹2 - 3 లక్షలు)", minLakhs: 2 },
  { id: "3L - 4L", en: "₹3 - 4 Lakhs / year", te: "₹3 - 4 లక్షలు / సం॥", display: "₹3 - 4 Lakhs / yr (₹3 - 4 లక్షలు)", minLakhs: 3 },
  { id: "4L - 5L", en: "₹4 - 5 Lakhs / year", te: "₹4 - 5 లక్షలు / సం॥", display: "₹4 - 5 Lakhs / yr (₹4 - 5 లక్షలు)", minLakhs: 4 },
  { id: "5L - 6L", en: "₹5 - 6 Lakhs / year", te: "₹5 - 6 లక్షలు / సం॥", display: "₹5 - 6 Lakhs / yr (₹5 - 6 లక్షలు)", minLakhs: 5 },
  { id: "6L - 7L", en: "₹6 - 7 Lakhs / year", te: "₹6 - 7 లక్షలు / సం॥", display: "₹6 - 7 Lakhs / yr (₹6 - 7 లక్షలు)", minLakhs: 6 },
  { id: "7L - 8L", en: "₹7 - 8 Lakhs / year", te: "₹7 - 8 లక్షలు / సం॥", display: "₹7 - 8 Lakhs / yr (₹7 - 8 లక్షలు)", minLakhs: 7 },
  { id: "8L - 10L", en: "₹8 - 10 Lakhs / year", te: "₹8 - 10 లక్షలు / సం॥", display: "₹8 - 10 Lakhs / yr (₹8 - 10 లక్షలు)", minLakhs: 8 },
  { id: "10L - 12L", en: "₹10 - 12 Lakhs / year", te: "₹10 - 12 లక్షలు / సం॥", display: "₹10 - 12 Lakhs / yr (₹10 - 12 లక్షలు)", minLakhs: 10 },
  { id: "12L - 15L", en: "₹12 - 15 Lakhs / year", te: "₹12 - 15 లక్షలు / సం॥", display: "₹12 - 15 Lakhs / yr (₹12 - 15 లక్షలు)", minLakhs: 12 },
  { id: "15L - 20L", en: "₹15 - 20 Lakhs / year", te: "₹15 - 20 లక్షలు / సం॥", display: "₹15 - 20 Lakhs / yr (₹15 - 20 లక్షలు)", minLakhs: 15 },
  { id: "20L - 25L", en: "₹20 - 25 Lakhs / year", te: "₹20 - 25 లక్షలు / సం॥", display: "₹20 - 25 Lakhs / yr (₹20 - 25 లక్షలు)", minLakhs: 20 },
  { id: "25L - 30L", en: "₹25 - 30 Lakhs / year", te: "₹25 - 30 లక్షలు / సం॥", display: "₹25 - 30 Lakhs / yr (₹25 - 30 లక్షలు)", minLakhs: 25 },
  { id: "30L - 40L", en: "₹30 - 40 Lakhs / year", te: "₹30 - 40 లక్షలు / సం॥", display: "₹30 - 40 Lakhs / yr (₹30 - 40 లక్షలు)", minLakhs: 30 },
  { id: "40L - 50L", en: "₹40 - 50 Lakhs / year", te: "₹40 - 50 లక్షలు / సం॥", display: "₹40 - 50 Lakhs / yr (₹40 - 50 లక్షలు)", minLakhs: 40 },
  { id: "50L - 75L", en: "₹50 - 75 Lakhs / year", te: "₹50 - 75 లక్షలు / సం॥", display: "₹50 - 75 Lakhs / yr (₹50 - 75 లక్షలు)", minLakhs: 50 },
  { id: "75L - 1Cr", en: "₹75 Lakhs - ₹1 Crore / year", te: "₹75 లక్షలు - ₹1 కోటి / సం॥", display: "₹75 Lakhs - 1 Cr (₹75లక్షలు - 1కోటి)", minLakhs: 75 },
  { id: "1Cr - 1.5Cr", en: "₹1 Crore - ₹1.5 Crore / year", te: "₹1 - 1.5 కోట్లు / సం॥", display: "₹1 - 1.5 Cr / yr (₹1 - 1.5 కోట్లు)", minLakhs: 100 },
  { id: "1.5Cr - 2Cr", en: "₹1.5 Crore - ₹2 Crore / year", te: "₹1.5 - 2 కోట్లు / సం॥", display: "₹1.5 - 2 Cr / yr (₹1.5 - 2 కోట్లు)", minLakhs: 150 },
  { id: "2Cr+", en: "₹2 Crore+ / year", te: "₹2 కోట్లకు పైగా / సం॥", display: "₹2 Crore+ / yr (₹2 కోట్లకు పైగా)", minLakhs: 200 },
  { id: "Under 1L", en: "Under ₹1 Lakh / Not Disclosed", te: "రూ. 1 లక్ష లోపు / వర్తించదు", display: "రూ. 1 లక్ష లోపు / వర్తించదు (Under 1L)", minLakhs: 0 },
];

export const SALARIES: string[] = SALARIES_DETAILED.map((s) => s.en);

export const SALARY_TELUGU: Record<string, string> = (() => {
  const map: Record<string, string> = {
    "Not specified": "వర్తించదు / పేర్కొనలేదు",
    "1L - 2L": "₹1 - 2 లక్షలు / సం॥",
    "2L - 4L": "₹2 - 4 లక్షలు / సం॥",
    "4L - 6L": "₹4 - 6 లక్షలు / సం॥",
    "6L - 8L": "₹6 - 8 లక్షలు / సం॥",
    "8L - 10L": "₹8 - 10 లక్షలు / సం॥",
    "10L - 15L": "₹10 - 15 లక్షలు / సం॥",
    "15L - 20L": "₹15 - 20 లక్షలు / సం॥",
    "20L - 30L": "₹20 - 30 లక్షలు / సం॥",
    "30L+": "₹30 లక్షల పైగా",
    "50L+": "₹50 లక్షల పైగా",
    "1Cr+": "₹1 కోటి పైగా",
  };
  SALARIES_DETAILED.forEach((s) => {
    map[s.en] = s.te;
    map[s.id] = s.te;
  });
  return map;
})();

// =========================================================================
// 🎓 CATEGORIZED & COMPREHENSIVE EDUCATIONS (సమగ్ర విద్యా వివరాలు)
// =========================================================================
export interface EducationCategory {
  category: string;
  categoryTe: string;
  items: { code: string; en: string; te: string; display: string }[];
}

export const EDUCATION_CATEGORIES: EducationCategory[] = [
  {
    category: "Engineering & Technology",
    categoryTe: "ఇంజనీరింగ్ & సాంకేతిక విద్య",
    items: [
      { code: "BTech", en: "B.Tech / B.E.", te: "బి.టెక్ / బి.ఇ", display: "B.Tech / B.E. (బి.టెక్)" },
      { code: "MTech", en: "M.Tech / M.E.", te: "ఎం.టెక్ / ఎం.ఇ", display: "M.Tech / M.E. (ఎం.టెక్)" },
      { code: "MS Abroad", en: "MS in USA / Abroad", te: "ఎం.ఎస్ (విదేశాల్లో చదువు)", display: "MS Abroad (ఎం.ఎస్ విదేశాలు)" },
      { code: "MCA", en: "MCA", te: "ఎం.సి.ఎ", display: "MCA (ఎం.సి.ఎ)" },
      { code: "BCA", en: "BCA / B.Sc Computer Science", te: "బి.సి.ఎ / కంప్యూటర్స్", display: "BCA / Computers (బి.సి.ఎ)" },
      { code: "Diploma", en: "Polytechnic / Diploma", te: "పాలిటెక్నిక్ / డిప్లొమా", display: "Polytechnic / Diploma (డిప్లొమా)" },
    ],
  },
  {
    category: "Medicine & Healthcare",
    categoryTe: "వైద్య & హెల్త్‌కేర్ విద్య",
    items: [
      { code: "MBBS", en: "MBBS", te: "ఎం.బి.బి.ఎస్ (డాక్టర్)", display: "MBBS (డాక్టర్)" },
      { code: "MD/MS", en: "MD / MS (Medical Specialist)", te: "ఎం.డి / ఎం.ఎస్ (స్పెషలిస్ట్)", display: "MD / MS Specialist (స్పెషలిస్ట్ డాక్టర్)" },
      { code: "DM/MCh", en: "DM / M.Ch (Super Specialist)", te: "సూపర్ స్పెషలిస్ట్ డాక్టర్", display: "DM / M.Ch Super Specialist" },
      { code: "BDS", en: "BDS (Dental)", te: "బి.డి.ఎస్ (దంత వైద్యం)", display: "BDS (దంత వైద్యం)" },
      { code: "MDS", en: "MDS (Dental Specialist)", te: "ఎం.డి.ఎస్ (డెంటల్ స్పెషలిస్ట్)", display: "MDS (డెంటల్ స్పెషలిస్ట్)" },
      { code: "BPharm", en: "B.Pharm / M.Pharm / Pharm.D", te: "ఫార్మసీ / ఫార్మ్ డి", display: "B.Pharm / Pharm.D (ఫార్మసీ)" },
      { code: "Nursing", en: "B.Sc Nursing / Allied Health", te: "నర్సింగ్ / హెల్త్‌కేర్", display: "B.Sc Nursing (నర్సింగ్)" },
      { code: "Physio", en: "BPT / MPT (Physiotherapy)", te: "ఫిజియోథెరపీ", display: "BPT / MPT Physiotherapy" },
      { code: "Ayush", en: "BAMS / BHMS (Ayurveda/Homeo)", te: "ఆయుర్వేద / హోమియోపతి", display: "BAMS / BHMS (ఆయుర్వేద/హోమియో)" },
    ],
  },
  {
    category: "Management, Finance & Commerce",
    categoryTe: "మేనేజ్‌మెంట్ & కామర్స్ / ఫైనాన్స్",
    items: [
      { code: "MBA", en: "MBA / PGDM", te: "ఎం.బి.ఎ / పి.జి.డి.ఎం", display: "MBA / PGDM (మేనేజ్‌మెంట్)" },
      { code: "CA", en: "CA (Chartered Accountant)", te: "సి.ఎ (చార్టర్డ్ అకౌంటెంట్)", display: "CA (చార్టర్డ్ అకౌంటెంట్)" },
      { code: "CMA/ICWA", en: "CMA / ICWA", te: "సి.ఎం.ఎ / ఐ.సి.డబ్ల్యు.ఎ", display: "CMA / ICWA (కాస్ట్ అకౌంటెంట్)" },
      { code: "CS", en: "CS (Company Secretary)", te: "కంపెనీ సెక్రటరీ (CS)", display: "CS (కంపెనీ సెక్రటరీ)" },
      { code: "CFA/CPA", en: "CFA / CPA / US CMA", te: "సి.ఎఫ్.ఎ / సి.పి.ఎ", display: "CFA / CPA (గ్లోబల్ ఫైనాన్స్)" },
      { code: "BCom", en: "B.Com / B.Com (Computers)", te: "బి.కాం / కంప్యూటర్స్", display: "B.Com (బి.కాం)" },
      { code: "MCom", en: "M.Com", te: "ఎం.కాం", display: "M.Com (ఎం.కాం)" },
      { code: "BBA", en: "BBA / BBM", te: "బి.బి.ఎ / బి.బి.ఎం", display: "BBA / BBM" },
    ],
  },
  {
    category: "Law, Civil Services & Professional",
    categoryTe: "న్యాయ & వృత్తి విద్యా కోర్సులు",
    items: [
      { code: "LLB", en: "LLB / BL (Law)", te: "ఎల్.ఎల్.బి / న్యాయవాది", display: "LLB / Law (న్యాయవాది)" },
      { code: "LLM", en: "LLM (Master of Law)", te: "ఎల్.ఎల్.ఎం (మాస్టర్స్ ఇన్ లా)", display: "LLM (మాస్టర్స్ ఇన్ లా)" },
      { code: "CivilServices", en: "IAS / IPS / IFS / Group-1", te: "సివిల్ సర్వీసెస్ / గ్రూప్-1", display: "Civil Services / Group 1 (సివిల్స్)" },
      { code: "BArch", en: "B.Arch / M.Arch (Architecture)", te: "ఆర్కిటెక్చర్", display: "B.Arch / Architecture" },
      { code: "Design", en: "Design / Fashion (NIFT / NID)", te: "ఫ్యాషన్ & డిజైనింగ్", display: "NIFT / NID Fashion Design" },
      { code: "Aviation", en: "Pilot / Aviation / Hotel Mgmt", te: "పైలట్ / హోటల్ మేనేజ్మెంట్", display: "Pilot / Aviation / Hotel Mgmt" },
    ],
  },
  {
    category: "Science, Arts, Teaching & Ph.D",
    categoryTe: "సైన్స్, ఆర్ట్స్, టీచింగ్ & పరిశోధన",
    items: [
      { code: "PhD", en: "Ph.D / Doctorate", te: "పిహెచ్.డి (డాక్టరేట్)", display: "Ph.D / Doctorate (డాక్టరేట్)" },
      { code: "PostDoc", en: "Post Doctorate", te: "పోస్ట్ డాక్టరేట్ రీసెర్చ్", display: "Post Doctorate (పరిశోధన)" },
      { code: "BSc", en: "B.Sc (Sciences)", te: "బి.ఎస్సీ", display: "B.Sc (బి.ఎస్సీ)" },
      { code: "MSc", en: "M.Sc (Sciences)", te: "ఎం.ఎస్సీ", display: "M.Sc (ఎం.ఎస్సీ)" },
      { code: "BA", en: "B.A (Arts / Humanities)", te: "బి.ఎ", display: "B.A (బి.ఎ)" },
      { code: "MA", en: "M.A (Master of Arts)", te: "ఎం.ఎ", display: "M.A (ఎం.ఎ)" },
      { code: "BEd", en: "B.Ed / M.Ed", te: "బి.ఇడి / ఎం.ఇడి (టీచర్ విద్య)", display: "B.Ed / M.Ed (ఉపాధ్యాయ విద్య)" },
    ],
  },
  {
    category: "Schooling & Intermediate",
    categoryTe: "పాఠశాల & ఇంటర్మీడియట్",
    items: [
      { code: "Intermediate", en: "Intermediate / 10+2", te: "ఇంటర్మీడియట్ (10+2)", display: "Intermediate / +2 (ఇంటర్)" },
      { code: "SSC", en: "10th / SSC", te: "10వ తరగతి (ఎస్.ఎస్.సి)", display: "10th / SSC (10వ తరగతి)" },
      { code: "Other", en: "Other Education", te: "ఇతర విద్యాభ్యాసం", display: "Other Education (ఇతర విద్య)" },
    ],
  },
];

export const EDUCATIONS: string[] = EDUCATION_CATEGORIES.flatMap((c) => c.items.map((i) => i.en));

export const EDUCATION_TELUGU: Record<string, string> = (() => {
  const map: Record<string, string> = {
    "BTech": "బి.టెక్ / బి.ఇ",
    "BE": "బి.ఇ",
    "MTech": "ఎం.టెక్",
    "MBBS": "డాక్టర్ (MBBS)",
    "BCom": "బి.కాం",
    "BSc": "బి.ఎస్సీ",
    "BA": "బి.ఎ",
    "BBA": "బి.బి.ఎ",
    "BEd": "బి.ఇడి",
    "BPharm": "ఫార్మసీ",
    "BDS": "డెంటల్ (BDS)",
    "LLB": "న్యాయవాది (LLB)",
    "MCom": "ఎం.కాం",
    "MSc": "ఎం.ఎస్సీ",
    "MA": "ఎం.ఎ",
    "MBA": "ఎం.బి.ఎ",
    "MCA": "ఎం.సి.ఎ",
    "MD": "స్పెషలిస్ట్ డాక్టర్ (MD)",
    "MS": "స్పెషలిస్ట్ డాక్టర్ (MS)",
    "MPharm": "ఎం.ఫార్మసీ",
    "PhD": "డాక్టరేట్ (PhD)",
    "CA": "చార్టర్డ్ అకౌంటెంట్ (CA)",
    "ICWA": "ఐ.సి.డబ్ల్యు.ఎ",
    "Diploma": "డిప్లొమా / పాలిటెక్నిక్",
    "Intermediate": "ఇంటర్మీడియట్",
    "SSC": "10వ తరగతి",
    "Other": "ఇతర విద్యార్హత",
  };
  EDUCATION_CATEGORIES.forEach((cat) => {
    cat.items.forEach((item) => {
      map[item.en] = item.te;
      map[item.code] = item.te;
    });
  });
  return map;
})();

// =========================================================================
// 💼 JOBS & OCCUPATIONS
// =========================================================================
export const JOBS = [
  "Software Engineer", "Software Architect / Lead", "Data Scientist / AI Engineer", "Engineering Manager",
  "Doctor / Physician", "Surgeon / Medical Specialist", "Dentist", "Pharmacist", "Staff Nurse / Healthcare",
  "Govt Employee (Central / State)", "IAS / IPS / Group 1 Officer", "Bank Officer / PO / Manager",
  "Teacher / School Faculty", "Lecturer / Assistant Professor", "Professor / Dean",
  "Chartered Accountant (CA)", "Financial Analyst / Auditor", "Business Owner / Entrepreneur",
  "Civil Engineer / Builder", "Mechanical / Electrical Engineer", "Lawyer / Legal Advisor",
  "Police Officer / Defence / Army", "Architect / Interior Designer", "Graphic / UI/UX Designer",
  "HR / Marketing / Sales Manager", "Customer Support / Operations", "Farmer / Farm Owner",
  "Driver / Logistics", "Self Employed / Freelancer", "Not Working / Student", "Other Occupation"
];

// =========================================================================
// 💍 COMPREHENSIVE CASTES & SUB-CASTES DIRECTORY (సమగ్ర కులాలు & ఉపకులాలు)
// =========================================================================
export interface CasteInfo {
  en: string;
  te: string;
  display: string;
  subcastes: string[];
}

export const CASTES_DETAILED: CasteInfo[] = [
  {
    en: "Reddy", te: "రెడ్డి", display: "రెడ్డి (Reddy)",
    subcastes: ["Pakanati Reddy", "Motati Reddy", "Gudati Reddy", "Deshathi Reddy", "Pedakanti Reddy", "Ganjam Reddy", "Renati Reddy", "Neravati Reddy", "Chitteti Reddy", "Velnati Reddy", "Pokanati Reddy", "Konda Reddy", "Ayodhyanagar Reddy", "Reddy (Any)"]
  },
  {
    en: "Kamma", te: "కమ్మ", display: "కమ్మ (Kamma)",
    subcastes: ["Chowdary", "Choudary", "Pedda Kamma", "Chinna Kamma", "Godachati Kamma", "Gampa Kamma", "Illuvellani Kamma", "Kamma (Any)"]
  },
  {
    en: "Kapu", te: "కాపు", display: "కాపు (Kapu)",
    subcastes: ["Ontari", "Turupu Kapu", "Palli Kapu", "Kapu (Telangana)", "Kapu (Coastal AP)", "Kapu (Rayalaseema)", "Kapu (Any)"]
  },
  {
    en: "Arya Vysya", te: "ఆర్య వైశ్య", display: "ఆర్య వైశ్య (Arya Vysya)",
    subcastes: ["Arya Vysya", "Komati", "Kanyaka Parameswari", "Beri Vysya", "Trivarnika Vysya", "Kalinga Vysya", "Sadhu Chetty", "Vysya (Any)"]
  },
  {
    en: "Brahmin", te: "బ్రాహ్మణ", display: "బ్రాహ్మణ (Brahmin)",
    subcastes: ["Vaidiki Brahmin (Velanadu)", "Vaidiki Brahmin (Venginadu)", "Vaidiki Brahmin (Mulakanadu)", "Vaidiki Brahmin (Telaganya)", "Vaidiki Brahmin (Kasalanadu)", "Niyogi Brahmin (Aruvela)", "Niyogi Brahmin (Nandavarika)", "Niyogi Brahmin (Prathamasaki)", "Golconda Vyapari", "Sistla", "Dravida Brahmin", "Smartha", "Madhwa", "Sri Vaishnava (Iyengar)", "Iyer", "Karnakammalu", "Brahmin (Any)"]
  },
  {
    en: "Padmashali", te: "పద్మశాలి", display: "పద్మశాలి (Padmashali)",
    subcastes: ["Padmasali", "Sali", "Pattusali", "Thogata", "Senapathula", "Karna Bhakthulu", "Swakula Sali", "Padmashali (Any)"]
  },
  {
    en: "Yadava", te: "యాదవ", display: "యాదవ (Yadava / Golla)",
    subcastes: ["Golla", "Kuruma", "Yerra Golla", "Puja Golla", "Karna Golla", "Ala Golla", "Gopala", "Yadava (Any)"]
  },
  {
    en: "Goud", te: "గౌడ్", display: "గౌడ్ (Goud / Ediga)",
    subcastes: ["Ediga", "Gamalla", "Idiga", "Gouda", "Settibalija Goud", "Kavali", "Kalalee", "Goud (Any)"]
  },
  {
    en: "Mudiraj", te: "ముదిరాజ్", display: "ముదిరాజ్ (Mudiraj)",
    subcastes: ["Mudiraju", "Mutrasi", "Tenugollu", "Bant", "Palegarlu", "Mudiraj (Any)"]
  },
  {
    en: "Velama", te: "వెలమ", display: "వెలమ (Velama)",
    subcastes: ["Padma Velama", "Adi Velama", "Koppula Velama", "Velama Dora", "Velama (Any)"]
  },
  {
    en: "Munnuru Kapu", te: "మున్నూరు కాపు", display: "మున్నూరు కాపు (Munnuru Kapu)",
    subcastes: ["Munnuru", "Munnurukapu Patel", "Munnuru Kapu (Any)"]
  },
  {
    en: "Balija", te: "బలిజ", display: "బలిజ (Balija)",
    subcastes: ["Gajula Balija", "Setti Balija", "Surya Balija", "Sadhu Balija", "Lingadhari Balija", "Raju Balija", "Balija (Any)"]
  },
  {
    en: "Telaga", te: "తెలగ", display: "తెలగ (Telaga)",
    subcastes: ["Telaga", "Kamma Telaga", "Penta Telaga", "Telaga (Any)"]
  },
  {
    en: "Viswabrahmin", te: "విశ్వబ్రాహ్మణ", display: "విశ్వబ్రాహ్మణ (Viswabrahmin / Viswakarma)",
    subcastes: ["Kamsali (Gold)", "Kammari (Blacksmith)", "Kanchari (Bronze)", "Vadla / Vadrangi (Carpenter)", "Ausula / Silpi (Sculptor)", "Viswabrahmana", "Achari", "Viswakarma (Any)"]
  },
  {
    en: "Raju", te: "రాజు", display: "రాజు (Raju / Kshatriya)",
    subcastes: ["Kshatriya", "Rajulu", "Surya Vamsam", "Chandra Vamsam", "Vanniyar Raju", "Raju (Any)"]
  },
  {
    en: "Koppula Velama", te: "కొప్పుల వెలమ", display: "కొప్పుల వెలమ (Koppula Velama)",
    subcastes: ["Koppula Velama", "Velama (Any)"]
  },
  {
    en: "Kalinga", te: "కాళింగ", display: "కాళింగ (Kalinga)",
    subcastes: ["Buragam Kalinga", "Pandava Kalinga", "Kalinga (Any)"]
  },
  {
    en: "Boya", te: "బోయ", display: "బోయ (Boya / Valmiki)",
    subcastes: ["Valmiki", "Boya", "Nayak", "Talari", "Boya (Any)"]
  },
  {
    en: "Kuruba", te: "కురుబ", display: "కురుబ (Kuruba / Kuruva)",
    subcastes: ["Kuruva", "Gorrela Kuruba", "Hattikankana", "Unnikankana", "Kuruba (Any)"]
  },
  {
    en: "Vaddera", te: "వడ్డెర", display: "వడ్డెర (Vaddera)",
    subcastes: ["Odde", "Bandi Vaddera", "Rathi Vaddera", "Uppu Vaddera", "Vaddera (Any)"]
  },
  {
    en: "Rajaka", te: "రజక", display: "రజక (Rajaka / Chakali)",
    subcastes: ["Chakali", "Dhobi", "Madivala", "Rajaka (Any)"]
  },
  {
    en: "Nayee Brahmin", te: "నాయీ బ్రాహ్మణ", display: "నాయీ బ్రాహ్మణ (Nayee Brahmin / Mangali)",
    subcastes: ["Mangali", "Nayi-Brahmin", "Dhanujaya", "Nayee Brahmin (Any)"]
  },
  {
    en: "Kummara", te: "కుమ్మర", display: "కుమ్మర (Kummara / Salivahana)",
    subcastes: ["Kulala", "Salivahana", "Kumbhar", "Kummara (Any)"]
  },
  {
    en: "Devanga", te: "దేవాంగ", display: "దేవాంగ (Devanga)",
    subcastes: ["Devanga Chettiar", "Hatagar", "Devanga (Any)"]
  },
  {
    en: "Gandla", te: "గాండ్ల", display: "గాండ్ల (Gandla / Telikula)",
    subcastes: ["Telikula", "Vaniyan", "Gandla (Any)"]
  },
  {
    en: "Uppara", te: "ఉప్పర", display: "ఉప్పర (Uppara / Sagara)",
    subcastes: ["Sagara", "Chetti Uppara", "Uppara (Any)"]
  },
  {
    en: "Srisayana", te: "శ్రీశయన", display: "శ్రీశయన (Srisayana / Segidi)",
    subcastes: ["Segidi", "Srisayana (Any)"]
  },
  {
    en: "Bestha", te: "బెస్త", display: "బెస్త (Bestha / Gangaputra)",
    subcastes: ["Gangaputra", "Kabbili", "Gundla", "Jalari", "Bestha (Any)"]
  },
  {
    en: "Gavara", te: "గవర", display: "గవర (Gavara)",
    subcastes: ["Gavara", "Gavara Komati", "Gavara (Any)"]
  },
  {
    en: "Bhatraju", te: "భట్రాజు", display: "భట్రాజు (Bhatraju)",
    subcastes: ["Bhatraju", "Raju (Any)"]
  },
  {
    en: "Perika", te: "పెరిక", display: "పెరిక (Perika / Puragiri Kshatriya)",
    subcastes: ["Puragiri Kshatriya", "Perika (Any)"]
  },
  {
    en: "Togata", te: "తొగట", display: "తొగట (Togata / Togataveera)",
    subcastes: ["Togataveera", "Togata Kshatriya", "Togata (Any)"]
  },
  {
    en: "Jangam", te: "జంగం", display: "జంగం (Jangam)",
    subcastes: ["Veerasaiva Jangam", "Silavanth", "Jangam (Any)"]
  },
  {
    en: "Lingayat", te: "లింగాయత్", display: "లింగాయత్ (Lingayat / Veerasaiva)",
    subcastes: ["Veerasaiva Lingayat", "Panchamasali", "Banajiga", "Sadar", "Lingayat (Any)"]
  },
  {
    en: "Are Katika", te: "ఆరే కటిక", display: "ఆరే కటిక (Are Katika / Katika)",
    subcastes: ["Suryavamsi Katika", "Are Katika", "Katika (Any)"]
  },
  {
    en: "Meru", te: "మేరు", display: "మేరు (Meru / Darji / Tailor)",
    subcastes: ["Meru Darji", "Shimpi", "Namdev Darji", "Meru (Any)"]
  },
  {
    en: "Medari", te: "మేదరి", display: "మేదరి (Medari / Mahendra)",
    subcastes: ["Medari", "Mahendra", "Medara (Any)"]
  },
  {
    en: "Bondili", te: "బొందిలి", display: "బొందిలి (Bondili / Rajput)",
    subcastes: ["Bondili Rajput", "Bondili (Any)"]
  },
  {
    en: "Mala", te: "మాల", display: "మాల (Mala)",
    subcastes: ["Mala Ayawaru", "Mala Dasari", "Mala Jangam", "Reddi Mala", "Sarindla", "Mala (Any)"]
  },
  {
    en: "Madiga", te: "మాదిగ", display: "మాదిగ (Madiga)",
    subcastes: ["Madiga Dasu", "Mashteen", "Madiga Dasari", "Bavuri", "Sindhollu", "Madiga (Any)"]
  },
  {
    en: "Adi Andhra", te: "ఆది ఆంధ్ర", display: "ఆది ఆంధ్ర (Adi Andhra / Adi Dravida)",
    subcastes: ["Adi Dravida", "Arundhatiya", "Relli", "Arwa Mala", "Adi Andhra (Any)"]
  },
  {
    en: "Lambada", te: "లంబాడా", display: "లంబాడా (Lambada / Banjara)",
    subcastes: ["Banjara", "Lambadi", "Lambani", "Sugali", "Gor", "Lambada (Any)"]
  },
  {
    en: "Koya", te: "కోయ", display: "కోయ (Koya)",
    subcastes: ["Koitur", "Gutti Koya", "Raja Koya", "Koya (Any)"]
  },
  {
    en: "Gond", te: "గోండ్", display: "గోండ్ (Gond / Rajgond)",
    subcastes: ["Rajgond", "Naikpod", "Muria", "Gond (Any)"]
  },
  {
    en: "SC Others", te: "ఎస్సీ ఇతర", display: "ఎస్సీ ఇతర కులాలు (SC Others)",
    subcastes: ["Samban", "Dandasi", "Bindla", "Chamar", "SC Others (Any)"]
  },
  {
    en: "ST Others", te: "ఎస్టీ ఇతర", display: "ఎస్టీ ఇతర తెగలు (ST Others)",
    subcastes: ["Chenchu", "Bagata", "Konda Reddi", "Savara", "Andh", "Yanadi", "Yerukula", "ST Others (Any)"]
  },
  {
    en: "Intercaste", te: "కుల పట్టింపు లేదు", display: "కుల పట్టింపు లేదు (Caste No Bar / Intercaste)",
    subcastes: ["Caste No Bar", "Intercaste", "Any"]
  },
];

export const CASTES: string[] = CASTES_DETAILED.map((c) => c.en);

export const CASTE_TELUGU: Record<string, string> = (() => {
  const map: Record<string, string> = {
    "Vysya": "ఆర్య వైశ్య",
    "Viswakarma": "విశ్వబ్రాహ్మణ",
    "Yadav": "యాదవ",
    "Mangali": "నాయీ బ్రాహ్మణ",
  };
  CASTES_DETAILED.forEach((c) => { map[c.en] = c.te; });
  return map;
})();

export const CASTE_SUBCASTES: Record<string, string[]> = (() => {
  const map: Record<string, string[]> = {};
  CASTES_DETAILED.forEach((c) => { map[c.en] = c.subcastes; });
  // backwards compat aliases
  map["Vysya"] = map["Arya Vysya"];
  map["Viswakarma"] = map["Viswabrahmin"];
  map["Yadav"] = map["Yadava"];
  map["Mangali"] = map["Nayee Brahmin"];
  return map;
})();

export const RELIGIONS = ["Hindu", "Muslim", "Christian", "Sikh", "Jain", "Buddhist", "Other"];

export const MOTHER_TONGUES = ["Telugu", "Urdu", "Hindi", "Tamil", "Kannada", "English", "Other"];

export const HEIGHTS = [
  '4\'8"', '4\'9"', '4\'10"', '4\'11"', '5\'0"', '5\'1"', '5\'2"', '5\'3"', '5\'4"', '5\'5"',
  '5\'6"', '5\'7"', '5\'8"', '5\'9"', '5\'10"', '5\'11"', '6\'0"', '6\'1"', '6\'2"', '6\'3"',
  '6\'4"', '6\'5"', '6\'6"',
];

export const WEIGHTS = Array.from({ length: 61 }, (_, i) => `${40 + i}kg`);

export const MARITAL_STATUSES = ["Pelli Kaledu", "Widow", "Widower", "Divorced", "Awaiting Divorce", "Separated"];
export const CHILDREN_OPTIONS = ["None", "1", "2", "3", "4+"];

export function heightLabel(h: string): string {
  const m = /^(\d)'(\d{1,2})"?$/.exec((h || "").trim());
  if (!m) return h;
  const cm = Math.round(Number(m[1]) * 30.48 + Number(m[2]) * 2.54);
  return `${m[1]} ft ${m[2]} in (${cm} cm)`;
}

export const FAMILY_TYPES = ["Nuclear", "Joint"];
export const FAMILY_STATUSES = ["Middle Class", "Upper Middle Class", "Rich / Affluent (Elite)"];
export const FAMILY_VALUES = ["Traditional", "Moderate", "Liberal"];
export const BODY_TYPES = ["Slim", "Average", "Athletic", "Heavy"];
export const COMPLEXIONS = ["Very Fair", "Fair", "Wheatish", "Wheatish Brown", "Dark"];
export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];
export const PHYSICAL_STATUS = ["Normal", "Physically Challenged"];
export const OCCUPATIONS = ["Farmer", "Business", "Govt Employee", "Private Employee", "Teacher",
  "Housewife", "Retired", "Daily Wage", "Driver", "Other"];

export function ageFromDob(dob: string): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  const diff = Date.now() - d.getTime();
  const age = Math.floor(diff / (365.25 * 24 * 3600 * 1000));
  return age > 0 && age < 100 ? age : null;
}

export function maxDobFor18(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 18);
  return d.toISOString().slice(0, 10);
}

export async function compressImage(file: File, maxDim = 1200, quality = 0.85): Promise<File> {
  try {
    if (!file.type.startsWith("image/") || typeof document === "undefined") return file;
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, "image/jpeg", quality));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}
