/**
 * MANA VIVAHA — COMPREHENSIVE TELUGU MATRIMONIAL TAXONOMY 💍
 * ==========================================================
 * All 33 Telangana Districts + All 26 Andhra Pradesh Districts + Global / NRI
 * All 48+ Telugu Castes + Authentic Sub-castes
 * 27 Vedic Nakshatras & 12 Rasis with Telugu + English Side-by-Side
 */

// 27 Nakshatras — Telugu + English + Full Bilingual Display
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

// 12 Rasis (Vedic Moon Signs) — Telugu + English + Western
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

export const OTHER_LOCATIONS: DistrictDetail[] = [
  { en: "USA / NRI", te: "అమెరికా / ఎన్ఆర్ఐ", display: "అమెరికా / NRI (USA / Canada / UK)", state: "Other" },
  { en: "Bangalore / Karnataka", te: "బెంగళూరు / కర్ణాటక", display: "బెంగళూరు (Bangalore / Karnataka)", state: "Other" },
  { en: "Chennai / Tamil Nadu", te: "చెన్నై / తమిళనాడు", display: "చెన్నై (Chennai / Tamil Nadu)", state: "Other" },
  { en: "Mumbai / Maharashtra", te: "ముంబై / మహారాష్ట్ర", display: "ముంబై (Mumbai / Maharashtra)", state: "Other" },
  { en: "Delhi / NCR", te: "ఢిల్లీ / ఎన్‌సీఆర్", display: "ఢిల్లీ / NCR (Delhi)", state: "Other" },
  { en: "Gulf / Middle East", te: "గల్ఫ్ / దుబాయ్", display: "గల్ఫ్ / UAE (Dubai / Saudi / Qatar)", state: "Other" },
  { en: "Other Global / States", te: "ఇతర ప్రాంతాలు", display: "ఇతర రాష్ట్రాలు / గ్లోబల్ (Other Global)", state: "Other" },
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
    subcastes: ["Pakanati Reddy", "Motati Reddy", "Gudati Reddy", "Deshathi Reddy", "Pedakanti Reddy", "Ganjam Reddy", "Renati Reddy", "Neravati Reddy", "Chitteti Reddy", "Velnati Reddy", "Pokanati Reddy", "Ayodhyanagar Reddy", "Reddy (Any)"]
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
    subcastes: ["Vaidiki Brahmin", "Niyogi Brahmin", "Sistla", "Dravida Brahmin", "Smartha", "Madhwa", "Sri Vaishnava (Iyengar)", "Iyer", "Karnakammalu", "Prathamasaki", "Golconda Vyapari", "Brahmin (Any)"]
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
    subcastes: ["Gangaputra", "Kabbili", "Gundla", "Bestha (Any)"]
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
    subcastes: ["Puragiri", "Perika (Any)"]
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

export const EDUCATIONS = ["SSC", "Intermediate", "Diploma", "BCom", "BSc", "BA", "BBA", "BTech", "BE",
  "BPharm", "BEd", "MBBS", "BDS", "LLB", "MCom", "MSc", "MA", "MBA", "MTech", "MCA", "MD", "MS",
  "MPharm", "PhD", "CA", "ICWA", "Other"];

export const JOBS = ["Software Engineer", "Doctor", "Govt Job", "Business", "Teacher", "Lecturer",
  "Bank Employee", "Private Job", "Engineer", "Accountant", "Nurse", "Pharmacist", "Lawyer",
  "Agriculture", "Police/Defence", "Driver", "Tailor", "Not Working", "Other"];

export const SALARIES = ["Not specified", "1L - 2L", "2L - 4L", "4L - 6L", "6L - 8L", "8L - 10L",
  "10L - 15L", "15L - 20L", "20L - 30L", "30L+", "50L+", "1Cr+"];

export const WORK_TYPES = ["Private", "Government", "Business", "Self Employed", "Not Working", "Retired"];

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
