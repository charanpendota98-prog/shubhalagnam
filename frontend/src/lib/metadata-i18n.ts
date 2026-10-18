import { articleBySlug } from "@/lib/blog";
import type { Lang } from "@/lib/lang";

type Copy = { title: string; description: string };
type LocalizedCopy = Record<Lang, Copy>;

const ROUTE_COPY: Record<string, LocalizedCopy> = {
  "/": {
    te: { title: "తెలుగు మ్యాట్రిమోనీ", description: "తెలంగాణ, ఆంధ్రప్రదేశ్ కుటుంబాల కోసం Mana Vivaha మ్యాట్రిమోనీ సేవలు, ప్రొఫైల్ నియంత్రణలు, కమ్యూనిటీ డైరెక్టరీ." },
    en: { title: "Telugu Matrimony & Matchmaking", description: "Explore member-submitted profiles, selected community directories, and privacy controls across Telangana and Andhra Pradesh. Verification status is shown individually; matches and delivery are not guaranteed." },
  },
  "/admin": {
    te: { title: "అడ్మిన్ డాష్‌బోర్డ్", description: "మన వివాహ పరిమిత అడ్మిన్ నిర్వహణ." },
    en: { title: "Admin Dashboard", description: "Restricted administration tools for Mana Vivaha." },
  },
  "/admin/photos": {
    te: { title: "ఫోటో సమీక్ష", description: "సభ్యులు సమర్పించిన ఫోటోలను సమీక్షించండి." },
    en: { title: "Photo Review Queue", description: "Review member-submitted profile photos." },
  },
  "/biodata": {
    te: { title: "వివాహ బయోడేటా", description: "మీరు అందించిన వివరాలతో వివాహ బయోడేటా రూపొందించండి." },
    en: { title: "Marriage Biodata Maker", description: "Create a shareable marriage biodata using the details you provide." },
  },
  "/blog": {
    te: { title: "వివాహ సూచనలు మరియు గైడ్స్", description: "ప్రొఫైల్ తయారీ, ఆన్‌లైన్ భద్రత, వివాహ పరిచయాల కోసం ఆచరణాత్మక మార్గదర్శకాలు." },
    en: { title: "Matrimony Advice & Guides", description: "Practical guides to profile writing, online safety, and thoughtful marriage introductions." },
  },
  "/bureau": {
    te: { title: "మ్యారేజ్ బ్యూరో సేవలు", description: "మ్యారేజ్ బ్యూరోలు మరియు ఏజెంట్ల కోసం వ్యాపార సేవల సమాచారం." },
    en: { title: "Marriage Bureau Services", description: "Business services and listing information for marriage bureaus and agents." },
  },
  "/castes": {
    te: { title: "కమ్యూనిటీ మ్యాట్రిమోనీ డైరెక్టరీ", description: "ఎంపిక చేసిన తెలుగు కమ్యూనిటీ డైరెక్టరీలు, అందుబాటులో ఉన్న ప్రొఫైళ్లు మరియు లిస్టెడ్ ఛానళ్లు చూడండి." },
    en: { title: "Community Matrimony Directory", description: "Browse selected Telugu community directories, available profiles, and listed channels. Community names are not exhaustive and may be self-described." },
  },
  "/channels": {
    te: { title: "ఛానల్ డైరెక్టరీ", description: "ప్రాంతీయ, మత, కమ్యూనిటీ విభాగాల వారీగా లిస్టెడ్ Telegram మరియు WhatsApp ఛానళ్లను చూడండి." },
    en: { title: "Channel Directory", description: "Browse listed Telegram and configured WhatsApp channels by region and community. External link availability and post delivery are not guaranteed." },
  },
  "/compare": {
    te: { title: "సంబంధాల పోలిక", description: "మీరు ఎంచుకున్న ప్రొఫైళ్ల వివరాలను పక్కపక్కన పోల్చండి." },
    en: { title: "Profile Comparison", description: "Compare selected profile details side by side." },
  },
  "/control": {
    te: { title: "కంట్రోల్ ప్యానెల్", description: "అధికారిక నిర్వహణ సాధనాలు." },
    en: { title: "Control Panel", description: "Restricted operational tools for authorized staff." },
  },
  "/control/login": {
    te: { title: "కంట్రోల్ లాగిన్", description: "అధికారిక సిబ్బంది కోసం సురక్షిత లాగిన్." },
    en: { title: "Staff Sign In", description: "Secure sign-in for authorized Mana Vivaha staff." },
  },
  "/control/legacy": {
    te: { title: "పాత కంట్రోల్ ప్యానెల్", description: "పరిమిత అంతర్గత నిర్వహణ పేజీ." },
    en: { title: "Legacy Control Panel", description: "Restricted internal administration page." },
  },
  "/control/workspace": {
    te: { title: "కంట్రోల్ వర్క్‌స్పేస్", description: "అధికారిక సిబ్బంది నిర్వహణ వర్క్‌స్పేస్." },
    en: { title: "Control Workspace", description: "Operational workspace for authorized staff." },
  },
  "/districts": {
    te: { title: "జిల్లాల వారీగా మ్యాట్రిమోనీ", description: "తెలంగాణ మరియు ఆంధ్రప్రదేశ్ జిల్లాల వారీగా సభ్యులు సమర్పించిన ప్రొఫైళ్లను చూడండి." },
    en: { title: "District Matrimony Directory", description: "Browse member-submitted matrimony profiles by district across Telangana and Andhra Pradesh." },
  },
  "/growth": {
    te: { title: "గ్రోత్ వర్క్‌స్పేస్", description: "అధికారిక నిర్వాహకుల కోసం అంతర్గత గ్రోత్ సాధనాలు." },
    en: { title: "Growth Workspace", description: "Restricted internal growth and follow-up tools." },
  },
  "/lagna-patrika": {
    te: { title: "లగ్న పత్రిక స్టూడియో", description: "మీరు అందించిన వివాహ వివరాలతో తెలుగు లగ్న పత్రిక రూపొందించండి." },
    en: { title: "Lagna Patrika Studio", description: "Create a traditional Telugu wedding invitation using the details you provide." },
  },
  "/login": {
    te: { title: "సభ్యుల లాగిన్", description: "మీ ఖాతాలోకి OTP లేదా పాస్‌వర్డ్‌తో సైన్ ఇన్ చేయండి." },
    en: { title: "Member Sign In", description: "Sign in to your account using a one-time password or password." },
  },
  "/matches": {
    te: { title: "వివాహ సంబంధాలు", description: "మీ ఎంపికల ప్రకారం అందుబాటులో ఉన్న సభ్యుల ప్రొఫైళ్లను వెతకండి." },
    en: { title: "Matrimony Matches", description: "Find available member-submitted profiles using your search preferences." },
  },
  "/me": {
    te: { title: "నా ఖాతా", description: "మీ ప్రొఫైల్, ప్రాధాన్యతలు మరియు ఖాతా అభ్యర్థనలను నిర్వహించండి." },
    en: { title: "My Account", description: "Manage your profile, preferences, and account requests." },
  },
  "/muhurtham": {
    te: { title: "వివాహ ముహూర్తాల సూచిక", description: "ముహూర్తాల తేదీలు మరియు సమయాల సూచిక. కార్యక్రమాన్ని ఖరారు చేసే ముందు స్థానిక నిపుణుడితో ధృవీకరించండి." },
    en: { title: "Wedding Muhurtham Dates", description: "Browse an indicative list of wedding muhurtham dates and times. Confirm details with a local practitioner before making arrangements." },
  },
  "/offline": {
    te: { title: "ఆఫ్‌లైన్", description: "ఈ పేజీ ప్రస్తుతం ఆఫ్‌లైన్‌లో అందుబాటులో లేదు." },
    en: { title: "You Are Offline", description: "This page is not currently available offline." },
  },
  "/owner": {
    te: { title: "ఓనర్ డాష్‌బోర్డ్", description: "అధికారిక యజమాని వినియోగం కోసం పరిమిత డాష్‌బోర్డ్." },
    en: { title: "Owner Dashboard", description: "Restricted dashboard for authorized owner use." },
  },
  "/pelli-choopulu": {
    te: { title: "పెళ్లి చూపుల మార్గదర్శిని", description: "మొదటి కుటుంబ పరిచయానికి ముందు, సమయంలో, తర్వాత అడగదగిన ప్రశ్నలు మరియు భద్రతా సూచనలు." },
    en: { title: "Pelli Choopulu Guide", description: "A practical guide to questions, boundaries, and safety before, during, and after a first family introduction." },
  },
  "/porutham": {
    te: { title: "నిజమైన జాతక పత్రం సమీక్ష", description: "Owner-upload చేసిన అసలైన జాతక పత్రం యొక్క review స్థితిని మాత్రమే చూడండి. Star-only score, కల్పిత chart లేదా వివాహ తీర్పు తయారు చేయము." },
    en: { title: "Real Jathakam Evidence Review", description: "Upload an owner-authorised horoscope document and view its review state. No star-only score, fabricated chart, or marriage verdict is generated." },
  },
  "/pricing": {
    te: { title: "ధరలు మరియు ప్లాన్లు", description: "₹99 నుండి ప్రారంభమయ్యే లిస్టింగ్ ఎంపికలు, క్రెడిట్‌లు మరియు ప్రస్తుత ప్లాన్ వివరాలు చూడండి." },
    en: { title: "Pricing & Plans", description: "Review listing options, credits, and current plans starting at ₹99. The one-day share-ready promo kit is separate from directory listings." },
  },
  "/privacy": {
    te: { title: "గోప్యతా విధానం", description: "మీరు అందించే వ్యక్తిగత సమాచారం, గోప్యతా ఎంపికలు మరియు డేటా నిర్వహణ గురించి చదవండి." },
    en: { title: "Privacy Policy", description: "Learn how personal information, privacy choices, and account data are handled." },
  },
  "/r": {
    te: { title: "రిఫరల్ లింక్", description: "Mana Vivaha రిఫరల్ సమాచారం." },
    en: { title: "Referral Link", description: "Referral information for Mana Vivaha." },
  },
  "/referral": {
    te: { title: "రిఫరల్ ప్రోగ్రామ్", description: "రిఫరల్ నిబంధనలు, స్థితి మరియు అందుబాటులో ఉన్న సాధనాల గురించి చదవండి." },
    en: { title: "Referral Program", description: "Review referral terms, status, and available tools." },
  },
  "/referral/register": {
    te: { title: "రిఫరల్ ఖాతా నమోదు", description: "రిఫరల్ ఖాతాను సృష్టించడానికి వివరాలు సమర్పించండి." },
    en: { title: "Referral Account Registration", description: "Submit your details to create a referral account." },
  },
  "/refund": {
    te: { title: "రీఫండ్ మరియు రద్దు విధానం", description: "చెల్లింపులు, రద్దులు, రీఫండ్ అభ్యర్థనలు మరియు అర్హత నిబంధనలను సమీక్షించండి." },
    en: { title: "Refund & Cancellation Policy", description: "Review payment, cancellation, refund-request, and eligibility terms." },
  },
  "/register": {
    te: { title: "ఉచిత సభ్యత్వ నమోదు", description: "మీ వివరాలతో సభ్యుల ప్రొఫైల్‌ను సృష్టించండి; ప్రొఫైల్ వివరాలు సభ్యులే అందిస్తారు." },
    en: { title: "Create a Member Profile", description: "Create a member profile with details you provide. Verification status is shown individually and does not verify every profile detail." },
  },
  "/requests": {
    te: { title: "అభ్యర్థనలు", description: "మీరు పంపిన మరియు అందుకున్న ఆసక్తి అభ్యర్థనలను నిర్వహించండి." },
    en: { title: "Interest Requests", description: "Review and manage the interest requests you have sent and received." },
  },
  "/safety": {
    te: { title: "భద్రత మరియు మోసాల నివారణ", description: "సందేహాస్పద ప్రవర్తనను గుర్తించడం, నివేదించడం మరియు వ్యక్తిగత భద్రత గురించి సూచనలు." },
    en: { title: "Safety & Fraud Prevention", description: "Guidance on recognizing and reporting suspicious behavior and protecting your personal information." },
  },
  "/search": {
    te: { title: "ప్రొఫైల్ ID శోధన", description: "మీకు తెలిసిన ప్రొఫైల్ IDతో సభ్యుల వివరాల కోసం వెతకండి." },
    en: { title: "Search by Profile ID", description: "Look up a member profile using a profile ID you already know." },
  },
  "/second-marriage": {
    te: { title: "మరొక వివాహం కోసం సంబంధాలు", description: "మరొక వివాహాన్ని పరిశీలిస్తున్న పెద్దల కోసం అందుబాటులో ఉన్న సభ్యుల ప్రొఫైళ్లు చూడండి." },
    en: { title: "Second Marriage Matches", description: "Browse available member-submitted profiles for adults considering a second marriage." },
  },
  "/spotlight": {
    te: { title: "పెయిడ్ స్పాన్సర్డ్ ప్రొఫైల్", description: "కాలపరిమితి గల స్పాన్సర్డ్ ప్రొఫైల్ ప్లేస్‌మెంట్‌కు దరఖాస్తు చేయండి. చెల్లింపు, ప్రొఫైల్ మరియు మీడియా సమీక్ష అవసరం." },
    en: { title: "Sponsored Profile Placement", description: "Apply for a time-limited sponsored profile placement. Payment and profile or media review are required; reach, responses, and matches are not guaranteed." },
  },
  "/stories": {
    te: { title: "సభ్యుల కథలు", description: "సభ్యులు పంచుకున్న అనుభవాలు. కథనాలు సమర్పణదారుల అభిప్రాయాలు మాత్రమే." },
    en: { title: "Member Stories", description: "Experiences shared by members. Stories reflect the submitters' own accounts." },
  },
  "/terms": {
    te: { title: "ఉపయోగ నిబంధనలు", description: "సేవ వినియోగం, సభ్యుల బాధ్యతలు, వేదిక పరిమితులు మరియు వివాద పరిష్కార నిబంధనలు." },
    en: { title: "Terms of Use", description: "Review service terms, member responsibilities, platform limitations, and dispute-resolution information." },
  },
  "/vendors": {
    te: { title: "వివాహ సేవల డైరెక్టరీ", description: "వివాహ సేవలను అందించే వ్యాపారాల లిస్టెడ్ వివరాలను చూడండి." },
    en: { title: "Wedding Services Directory", description: "Browse listed businesses offering wedding-related services." },
  },
  "/vendors/campaign": {
    te: { title: "వెండర్ ప్రకటన ప్రచారం", description: "వెండర్ ప్రమోషన్ ప్రచార ఎంపికలను సమీక్షించండి." },
    en: { title: "Vendor Advertising Campaign", description: "Review advertising campaign options for wedding-service vendors." },
  },
  "/vendors/kit": {
    te: { title: "వెండర్ ప్రమోషన్ కిట్", description: "అధికారిక విక్రేతల కోసం ప్రమోషన్ సాధనాలు." },
    en: { title: "Vendor Promotion Kit", description: "Promotion tools for authorized wedding-service vendors." },
  },
  "/vendors/register": {
    te: { title: "వెండర్ నమోదు", description: "వెడ్డింగ్ సర్వీస్ వ్యాపార వివరాలు సమర్పించండి." },
    en: { title: "Vendor Registration", description: "Submit details about a wedding-service business for review." },
  },
  "/verify": {
    te: { title: "సెల్ఫీ సమీక్ష", description: "మీరు సమర్పించే సెల్ఫీ సమీక్ష కోసం పంపండి. ఇది గుర్తింపును లేదా ప్రొఫైల్‌లోని అన్ని వివరాలను నిర్ధారించదు." },
    en: { title: "Selfie Review", description: "Submit a selfie for review. This check does not establish identity or verify every profile detail." },
  },
};

export function getLocalizedPageMetadata(pathname: string, lang: Lang): { title: string; description: string } | null {
  const path = pathname.replace(/\/+$/, "") || "/";
  let copy = ROUTE_COPY[path]?.[lang];

  const articleMatch = path.match(/^\/blog\/([^/]+)$/);
  if (articleMatch) {
    const article = articleBySlug(decodeURIComponent(articleMatch[1]));
    if (article) {
      copy = lang === "en"
        ? { title: article.titleEn, description: article.descriptionEn }
        : { title: article.title, description: article.description };
    }
  }

  if (!copy && /^\/r\/[^/]+$/.test(path)) copy = ROUTE_COPY["/r"][lang];

  if (!copy && /^\/castes\/[^/]+$/.test(path)) {
    copy = lang === "en"
      ? { title: "Community Match Directory", description: "Browse available member-submitted profiles for a selected community and location. Community labels are not exhaustive; profile details are not independently verified." }
      : { title: "కమ్యూనిటీ సంబంధాల డైరెక్టరీ", description: "ఎంపిక చేసిన కమ్యూనిటీ మరియు ప్రాంతానికి అందుబాటులో ఉన్న సభ్యుల ప్రొఫైళ్లను చూడండి. కమ్యూనిటీ పేర్లు పూర్తి జాబితా కావు." };
  }

  if (!copy && /^\/vendors\/[^/]+$/.test(path)) {
    copy = lang === "en"
      ? { title: "Wedding Service Listing", description: "Review a listed wedding-service business and its public contact options." }
      : { title: "వివాహ సేవల లిస్టింగ్", description: "వివాహ సేవల వ్యాపార వివరాలు మరియు అందుబాటులో ఉన్న సంప్రదింపు ఎంపికలను చూడండి." };
  }

  if (!copy) return null;
  const brand = lang === "en" ? "Mana Vivaha (మన వివాహ)" : "మన వివాహ (Mana Vivaha)";
  return { title: `${copy.title} | ${brand}`, description: copy.description };
}
