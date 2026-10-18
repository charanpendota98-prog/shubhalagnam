/**
 * The handful of site rules that show up in FAQs on several pages.
 *
 * One definition per rule, in both languages, so the pricing page, the
 * community landing pages and the tool pages can never drift apart — and so a
 * test can assert the wording stays honest everywhere it is used.
 */

export const FAQ_FACTS = Object.freeze({
  notVerified: {
    en: "Profile details are member-submitted and are not independently verified. A phone OTP, where it is used, only checks access to that phone — it does not verify a person's identity, caste, income or intent. Review details yourself and use the Report button on a profile.",
    te: "ప్రొఫైల్ వివరాలు సభ్యులు అందించినవి; స్వతంత్రంగా ధృవీకరించబడవు. ఎక్కడైనా phone OTP ఉంటే అది ఆ ఫోన్ యాక్సెస్‌ను మాత్రమే చూస్తుంది — వ్యక్తి గుర్తింపు, కులం, ఆదాయం లేదా ఉద్దేశాన్ని నిర్ధారించదు. వివరాలను మీరే పరిశీలించి, profile లోని Report బటన్ వాడండి.",
  },
  contact: {
    en: "Phone numbers are never shown publicly or in search results. After you send an interest request and the profile owner accepts it, contact details appear in your accepted-request account views. A configured WhatsApp notification is not guaranteed to be delivered.",
    te: "ఫోన్ నంబర్లు public గా గానీ search లో గానీ కనిపించవు. మీరు interest పంపి, profile owner accept చేసిన తర్వాత accepted-request account views లో contact details కనిపిస్తాయి. WhatsApp notification delivery హామీ లేదు.",
  },
  cost: {
    en: "Registration is free and includes the first 3 interest requests. Paid plans start at ₹99 for 5 interest requests with 30-day credit validity. One credit is used per request; add-ons are priced separately.",
    te: "నమోదు ఉచితం, మొదటి 3 interest requests ఉచితం. ₹99 ప్లాన్‌లో 5 interest requests, 30 రోజుల credit validity ఉంటాయి. ఒక request కు ఒక credit; add-ons ధరలు విడిగా ఉంటాయి.",
  },
  guarantee: {
    en: "No. This is an introduction platform: you review member-submitted details and send interest. Marriages are arranged by families, not by the site, and no match, score or listing guarantees an outcome.",
    te: "కాదు. ఇది పరిచయ వేదిక: సభ్యులు అందించిన వివరాలు చూసి మీరు interest పంపుతారు. వివాహాలు కుటుంబాలు నిర్ణయిస్తాయి, సైట్ కాదు; ఏ match, score లేదా listing ఫలితానికి హామీ కాదు.",
  },
  noChat: {
    en: "There is no in-site chat. Interest notification delivery is not guaranteed. Owner acceptance grants contact access in accepted-request account views; decline credit returns follow account policy.",
    te: "ఈ సైట్‌లో chatting లేదు. Interest notification delivery హామీ లేదు. Owner accept చేసిన తర్వాత accepted-request account views లో contact details కనిపిస్తాయి; decline అయితే credit return account policy ప్రకారం ఉంటుంది.",
  },
  report: {
    en: "Use the Report button on the profile. Reports are reviewed, but there is no fixed action time and no 100% safety guarantee — profiles that cross a report threshold can be temporarily auto-flagged or hidden while they are checked.",
    te: "Profile లోని Report బటన్ వాడండి. ప్రతి report ను review చేస్తాం కానీ fixed action time లేదా 100% safety guarantee లేదు; కొన్ని report thresholds దాటితే profile తాత్కాలికంగా auto-flag/hide కావచ్చు.",
  },
  safety: {
    en: "Meet in a public place, tell a family member, and never pay anyone who promises a match. Nothing on this site proves identity, and no outcome is guaranteed.",
    te: "బహిరంగ ప్రదేశంలో కలవండి, కుటుంబ సభ్యుడికి చెప్పండి, మరియు సంబంధం ఖాయం అని చెప్పే వారికి డబ్బు చెల్లించవద్దు. ఈ సైట్‌లో ఏదీ గుర్తింపును నిరూపించదు; ఫలితానికి హామీ లేదు.",
  },
});

/**
 * One rule in the reader's language.
 * @param {keyof typeof FAQ_FACTS} key
 * @param {boolean} te
 */
export function fact(key, te = false) {
  const rule = FAQ_FACTS[key];
  if (!rule) return "";
  return te ? rule.te : rule.en;
}
