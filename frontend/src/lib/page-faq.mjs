/**
 * FAQs and structured data for the site's tool and guide pages.
 *
 * Same discipline as the community landing pages: every answer restates a rule
 * that already exists on the site, nothing is invented, and the JSON-LD a page
 * emits is always the exact list of questions a reader can see. Counts are only
 * produced when the caller supplies them.
 *
 * Pure and dependency-free so the wording can be unit-tested.
 */

import { fact } from "./faq-facts.mjs";

/**
 * Question sets per page. `en` and `te` must carry the same ids in the same
 * order — tests enforce it, because the schema is built from the English set
 * while the reader may be reading Telugu.
 *
 * @type {Record<string, { en: { id: string, q: string, a: string }[], te: { id: string, q: string, a: string }[] }>}
 */
export const PAGE_FAQS = {
  districts: {
    en: [
      { id: "coverage", q: "Which districts are covered?", a: "The directory lists Telangana and Andhra Pradesh districts{districtCount}. Each district page shows the member-submitted profiles that chose it." },
      { id: "search", q: "How do I search inside one district?", a: "Open search and filter by district together with community, age or education. Saved searches can alert you when new matches appear, and shortlists stay private to your account." },
      { id: "verified", q: "Are profiles in a district verified?", a: fact("notVerified") },
      { id: "outside", q: "I live outside Telangana and Andhra Pradesh — can I still join?", a: "Yes. Registration includes an NRI and other-states option. The district directory itself covers TS and AP, so members elsewhere are found through search rather than by district." },
      { id: "cost", q: "What does it cost to contact someone?", a: fact("cost") },
    ],
    te: [
      { id: "coverage", q: "ఏ జిల్లాలు ఉన్నాయి?", a: "తెలంగాణ మరియు ఆంధ్రప్రదేశ్ జిల్లాలు ఈ డైరెక్టరీలో ఉన్నాయి{districtCount}. ప్రతి జిల్లాలో సభ్యులు ఎంచుకున్న ప్రొఫైళ్లు కనిపిస్తాయి." },
      { id: "search", q: "ఒక జిల్లాలో ఎలా వెతకాలి?", a: "Search లో district ఫిల్టర్‌ను community, age లేదా education తో కలిపి వాడండి. Saved searches ద్వారా కొత్త matches వచ్చినప్పుడు అలర్ట్ పొందవచ్చు; shortlists మీ ఖాతాలోనే ప్రైవేట్ గా ఉంటాయి." },
      { id: "verified", q: "జిల్లాలోని ప్రొఫైళ్లు ధృవీకరించబడ్డాయా?", a: fact("notVerified", true) },
      { id: "outside", q: "నేను తెలంగాణ/ఆంధ్రప్రదేశ్ వెలుపల ఉన్నాను — చేరవచ్చా?", a: "అవును. నమోదులో NRI మరియు ఇతర రాష్ట్రాల ఎంపిక ఉంది. జిల్లా డైరెక్టరీ TS మరియు AP కు మాత్రమే; వెలుపల ఉన్న సభ్యులను search ద్వారా వెతకవచ్చు." },
      { id: "cost", q: "సంప్రదించడానికి ఖర్చు ఎంత?", a: fact("cost", true) },
    ],
  },
  second_marriage: {
    en: [
      { id: "who", q: "Who is this page for?", a: "Adults considering remarriage — divorced, widowed or separated. Profiles here are member-submitted; how many are available varies by district and community, so the listing can be short." },
      { id: "verified", q: "Are remarriage profiles verified?", a: fact("notVerified") },
      { id: "contact", q: "When do I get contact details?", a: fact("contact") },
      { id: "plan", q: "Is there a separate plan for second marriage?", a: "No separate plan. Registration is free and includes the first 3 interest requests; paid plans start at ₹99 for 5 requests. Add-ons are priced separately." },
      { id: "guarantee", q: "Do you arrange or guarantee a second marriage?", a: fact("guarantee") },
      { id: "safety", q: "How do I stay safe while meeting someone?", a: fact("safety") },
    ],
    te: [
      { id: "who", q: "ఈ పేజీ ఎవరికి?", a: "పునర్వివాహం ఆలోచిస్తున్న వయోజనులకు — విడాకులు, వైధవ్యం లేదా విడిపోయిన వారు. ఇక్కడి ప్రొఫైళ్లు సభ్యులు అందించినవి; జిల్లా మరియు కమ్యూనిటీని బట్టి లభ్యత మారుతుంది, కాబట్టి జాబితా చిన్నదిగా ఉండవచ్చు." },
      { id: "verified", q: "పునర్వివాహ ప్రొఫైళ్లు ధృవీకరించబడ్డాయా?", a: fact("notVerified", true) },
      { id: "contact", q: "Contact details ఎప్పుడు వస్తాయి?", a: fact("contact", true) },
      { id: "plan", q: "రెండో వివాహానికి ప్రత్యేక ప్లాన్ ఉందా?", a: "ప్రత్యేక ప్లాన్ లేదు. నమోదు ఉచితం, మొదటి 3 interest requests ఉచితం; ₹99 నుంచి 5 requests ప్లాన్లు ఉంటాయి. Add-ons ధరలు విడిగా ఉంటాయి." },
      { id: "guarantee", q: "మీరు రెండో వివాహం కుదురుస్తారా లేదా హామీ ఇస్తారా?", a: fact("guarantee", true) },
      { id: "safety", q: "కలిసేటప్పుడు భద్రంగా ఎలా ఉండాలి?", a: fact("safety", true) },
    ],
  },
  spotlight: {
    en: [
      { id: "what", q: "What is a sponsored placement?", a: "A paid placement that shows a member's profile, with photo or video, at the top of the homepage. It appears only after payment and a profile/media review, and it runs for the display period shown with the plan." },
      { id: "guarantee", q: "Does sponsorship guarantee responses or a match?", a: "No. A sponsored placement is a promotional badge only: it increases visibility and carries no identity, reach, response or match guarantee." },
      { id: "review", q: "What do you check before a placement goes live?", a: "Payment, the profile itself and the photo or video are reviewed, and an approval note is recorded. Availability of any external channel is not checked automatically, and no placement is published without that review." },
      { id: "cost", q: "How much does it cost?", a: "Homepage promotion starts from ₹99. Exact options, display periods and terms are shown on /pricing before you pay." },
      { id: "report", q: "Can I report a sponsored profile?", a: fact("report") },
    ],
    te: [
      { id: "what", q: "స్పాన్సర్డ్ ప్లేస్‌మెంట్ అంటే ఏమిటి?", a: "చెల్లింపు తర్వాత హోమ్‌పేజీ పైన సభ్యుని ప్రొఫైల్‌ను ఫోటో లేదా వీడియోతో చూపే ప్రమోషన్. చెల్లింపు మరియు profile/media review తర్వాత మాత్రమే ఇది కనిపిస్తుంది; ప్లాన్‌లో చూపిన కాలం వరకు నడుస్తుంది." },
      { id: "guarantee", q: "స్పాన్సర్షిప్ స్పందనలకు లేదా సంబంధానికి హామీనా?", a: "కాదు. స్పాన్సర్డ్ ప్లేస్‌మెంట్ కేవలం ప్రమోషనల్ బ్యాడ్జ్: ఇది visibility పెంచుతుంది; గుర్తింపు, reach, స్పందన లేదా సంబంధానికి ఎలాంటి హామీ ఇవ్వదు." },
      { id: "review", q: "ప్రచురణకు ముందు ఏమి పరిశీలిస్తారు?", a: "చెల్లింపు, ప్రొఫైల్ మరియు ఫోటో/వీడియో పరిశీలించి ఒక approval note నమోదు చేస్తాం. బయటి channel availability ఆటోమేటిక్‌గా తనిఖీ చేయము; ఈ review లేకుండా ఏ ప్రచురణా జరగదు." },
      { id: "cost", q: "ధర ఎంత?", a: "హోమ్‌పేజీ ప్రమోషన్ ₹99 నుంచి ప్రారంభం. ఖచ్చితమైన ఎంపికలు, కాలం మరియు నిబంధనలు /pricing లో చెల్లింపుకు ముందు చూపిస్తాం." },
      { id: "report", q: "స్పాన్సర్డ్ ప్రొఫైల్ ను report చేయవచ్చా?", a: fact("report", true) },
    ],
  },
  porutham: {
    en: [
      { id: "what", q: "What does this Porutham reference do?", a: "It applies a traditional Vedic Gunamelanam method (rasi, nakshatra, gana, yoni, rajju, vedha…) to the birth details you enter, and shows the result for you to read. It is informational." },
      { id: "meaning", q: "Does the result decide my marriage?", a: "No. It does not verify a person, judge a relationship, or guarantee any outcome. Families and their own priests decide; treat this as one reference among many." },
      { id: "details", q: "What details do I need?", a: "The birth star (nakshatra) or rasi of both people, exactly as recorded in their horoscope. The result is only as accurate as the details entered — if you are unsure, confirm with your family priest first." },
      { id: "cost", q: "Is it free? Do I need an account?", a: "Yes, it is free and no account is needed. Nothing you type here becomes a profile unless you register separately." },
      { id: "saved", q: "Do you store what I enter?", a: "The reference is calculated for the page you are reading; it is not added to anyone's matrimony profile and is not used to contact anyone." },
    ],
    te: [
      { id: "what", q: "ఈ పొంతన సూచన ఏమి చేస్తుంది?", a: "మీరు ఇచ్చిన జన్మ వివరాలకు సాంప్రదాయ వేద గుణమేళనం (రాశి, నక్షత్రం, గణ, యోని, రజ్జు, వేధ…) అన్వయించి ఫలితాన్ని చూపిస్తుంది. ఇది సమాచారం కోసమే." },
      { id: "meaning", q: "ఈ ఫలితం నా వివాహాన్ని నిర్ణయిస్తుందా?", a: "కాదు. ఇది వ్యక్తిని ధృవీకరించదు, సంబంధాన్ని అంచనా వేయదు, ఫలితానికి హామీ ఇవ్వదు. నిర్ణయం కుటుంబాలు మరియు వారి పురోహితులది; దీన్ని ఒక సూచనగా మాత్రమే తీసుకోండి." },
      { id: "details", q: "నాకు ఏ వివరాలు కావాలి?", a: "ఇద్దరి జన్మ నక్షత్రం లేదా రాశి, వారి జాతకంలో ఉన్నట్టుగా. ఫలితం మీరు ఇచ్చిన వివరాలకే పరిమితం — సందేహం ఉంటే ముందుగా మీ కుటుంబ పురోహితుడితో నిర్ధారించుకోండి." },
      { id: "cost", q: "ఇది ఉచితమా? ఖాతా అవసరమా?", a: "అవును, ఉచితం మరియు ఖాతా అవసరం లేదు. మీరు ప్రత్యేకంగా నమోదు చేసుకుంటే తప్ప ఇక్కడ ఏదీ ప్రొఫైల్ అవదు." },
      { id: "saved", q: "నేను ఇచ్చిన వివరాలు భద్రపరుస్తారా?", a: "ఈ సూచన మీరు చూస్తున్న పేజీ కోసమే లెక్కించబడుతుంది; అది ఎవరి మ్యాట్రిమోనీ ప్రొఫైల్‌కూ చేరదు మరియు ఎవరినీ సంప్రదించడానికి వాడబడదు." },
    ],
  },
  muhurtham: {
    en: [
      { id: "what", q: "What are the listed muhurtham dates?", a: "A month-by-month reference of dates with the thithi, nakshatra and lagnam shown for each, for the season listed on the page." },
      { id: "accuracy", q: "Can I fix my wedding date from this list alone?", a: "No. It is a reference, not a personalised reading: confirm the date, timings and local customs with your family priest and your venue before you book anything." },
      { id: "region", q: "Which calendar and region do these follow?", a: "They follow the Telugu calendar conventions used by the listing. Timings vary by location, so the same date can be read differently in another region." },
      { id: "cost", q: "Do I pay to see the dates?", a: "No, the reference is free and needs no account. Planning services and vendor listings, if you use them, are priced separately." },
    ],
    te: [
      { id: "what", q: "జాబితాలోని ముహూర్త తేదీలు ఏమిటి?", a: "పేజీలో చూపిన సీజన్ కు నెలవారీగా తేదీ, తిథి, నక్షత్రం మరియు లగ్నం వివరాలతో కూడిన సూచిక." },
      { id: "accuracy", q: "ఈ జాబితా ఆధారంగానే పెళ్లి తేదీ ఖరారు చేయవచ్చా?", a: "కాదు. ఇది సూచిక, వ్యక్తిగత జ్యోతిష్య ఫలితం కాదు: తేదీ, సమయాలు మరియు స్థానిక సంప్రదాయాలను మీ కుటుంబ పురోహితుడు, వేదిక వారితో నిర్ధారించుకున్న తర్వాతే ఖరారు చేయండి." },
      { id: "region", q: "ఇవి ఏ క్యాలెండర్ మరియు ప్రాంతానికి చెందినవి?", a: "ఇవి జాబితాలో వాడిన తెలుగు క్యాలెండర్ పద్ధతులను అనుసరిస్తాయి. సమయాలు ప్రాంతాన్ని బట్టి మారుతాయి, కాబట్టి ఒకే తేదీని మరో ప్రాంతంలో వేరే విధంగా చదవవచ్చు." },
      { id: "cost", q: "తేదీలు చూడటానికి చెల్లించాలా?", a: "లేదు, ఈ సూచిక ఉచితం మరియు ఖాతా అవసరం లేదు. ప్లానింగ్ సేవలు, vendor listings వాడితే వాటి ధరలు విడిగా ఉంటాయి." },
    ],
  },
  biodata: {
    en: [
      { id: "what", q: "What does the biodata maker do?", a: "It formats the details you type into a traditional biodata layout you can download or print, and it can prefill from a public profile card when you enter that profile's ID." },
      { id: "stored", q: "Is what I type uploaded or shared?", a: "The layout is built for the page you are editing and the download happens on your device. Entering a profile ID reads that profile's public card — it does not reveal contact details, which stay behind an accepted interest request." },
      { id: "verify", q: "Does a biodata prove the details are true?", a: "No. A biodata is a formatted summary of what was typed, whether by you or pulled from a public card. It verifies nothing, and nothing on it should be read as a check by us." },
      { id: "share", q: "Can I share it with anyone?", a: "Only share it with people you choose. Once a file leaves your device nobody can recall it, so leave out anything you would not want forwarded — phone numbers, addresses and ID details in particular." },
    ],
    te: [
      { id: "what", q: "బయోడేటా మేకర్ ఏమి చేస్తుంది?", a: "మీరు టైప్ చేసిన వివరాలను సాంప్రదాయ బయోడేటా రూపంలో అమర్చి, డౌన్‌లోడ్ లేదా ప్రింట్ చేసుకోవచ్చు. ఒక ప్రొఫైల్ ID ఇస్తే ఆ public card నుంచి వివరాలు నింపుకోవచ్చు." },
      { id: "stored", q: "నేను టైప్ చేసేది అప్‌లోడ్ అవుతుందా లేదా షేర్ అవుతుందా?", a: "రూపం మీరు మారుస్తున్న పేజీ కోసమే తయారవుతుంది మరియు డౌన్‌లోడ్ మీ పరికరంలోనే జరుగుతుంది. ప్రొఫైల్ ID ఇవ్వడం వల్ల ఆ ప్రొఫైల్ public card చదవబడుతుంది — contact details అందులో ఉండవు; అవి accepted interest తర్వాత మాత్రమే లభిస్తాయి." },
      { id: "verify", q: "బయోడేటా వివరాలు నిజమని నిరూపిస్తుందా?", a: "కాదు. బయోడేటా అనేది టైప్ చేసిన వివరాలకు రూపం మాత్రమే — అది మీరు ఇచ్చినా, public card నుంచి వచ్చినా. అది ఏమీ ధృవీకరించదు; దాన్ని మా తనిఖీగా భావించకూడదు." },
      { id: "share", q: "దీన్ని ఎవరితోనైనా షేర్ చేయవచ్చా?", a: "మీరు ఎంచుకున్న వారితో మాత్రమే పంచుకోండి. ఫైల్ మీ పరికరం నుంచి బయటకు వెళ్లాక దాన్ని వెనక్కి తెచ్చుకోలేము; ఫార్వార్డ్ కాకూడనివి — ఫోన్ నంబర్లు, చిరునామాలు, ID వివరాలు — దీనిలో పెట్టవద్దు." },
    ],
  },
  lagna_patrika: {
    en: [
      { id: "what", q: "What is the Lagna Patrika studio?", a: "It lays out a traditional Telugu wedding invitation from the details you type — names, family names, muhurtham and venue — and lets you download the result." },
      { id: "stored", q: "Do you print or post the invitation for me?", a: "No. You download the file yourself and share it however you like; nothing is printed, mailed or published by us." },
      { id: "check", q: "How accurate is the wording and the muhurtham?", a: "Only as accurate as what you type. Check every name, date and venue spelling before you send it, and confirm the muhurtham with your family priest — the studio does not generate or verify it." },
      { id: "cost", q: "Does it cost anything?", a: "No, the studio is free and needs no account. Printing and distribution costs are yours." },
    ],
    te: [
      { id: "what", q: "లగ్న పత్రిక స్టూడియో అంటే ఏమిటి?", a: "మీరు ఇచ్చిన వివరాలు — పేర్లు, ఇంటి పేర్లు, ముహూర్తం, వేదిక — తో సాంప్రదాయ తెలుగు పెళ్లి ఆహ్వాన పత్రికను తయారు చేసి డౌన్‌లోడ్ చేసుకోనిస్తుంది." },
      { id: "stored", q: "పత్రికను మీరు ప్రింట్ చేసి పంపిస్తారా?", a: "కాదు. ఫైల్‌ను మీరే డౌన్‌లోడ్ చేసుకుని మీకు నచ్చిన విధంగా పంచుకోవాలి; ప్రింటింగ్, పోస్టింగ్ లేదా ప్రచురణ మేము చేయము." },
      { id: "check", q: "పదాలు మరియు ముహూర్తం ఎంత ఖచ్చితం?", a: "మీరు టైప్ చేసినంతవరకే. పంపే ముందు ప్రతి పేరు, తేదీ మరియు వేదిక స్పెల్లింగ్ సరిచూసుకోండి; ముహూర్తాన్ని మీ కుటుంబ పురోహితుడితో నిర్ధారించుకోండి — స్టూడియో అది సృష్టించదు లేదా ధృవీకరించదు." },
      { id: "cost", q: "దీనికి ఖర్చు ఉందా?", a: "లేదు, స్టూడియో ఉచితం మరియు ఖాతా అవసరం లేదు. ప్రింటింగ్ మరియు పంపిణీ ఖర్చులు మీవి." },
    ],
  },
  pelli_choopulu: {
    en: [
      { id: "what", q: "What is a Pelli Choopulu?", a: "The first introduction meeting between the two families, usually at the bride's home or a neutral place, where the couple talks briefly before families discuss next steps." },
      { id: "prepare", q: "How should we prepare?", a: "Agree the time and place in advance, keep the group small, and decide beforehand who asks what. Carry nothing you would mind losing, and keep the first meeting short." },
      { id: "questions", q: "What should be asked?", a: "Work, studies, family expectations and where each person wants to live — asked plainly, one at a time. Dowry in any form is illegal; treat any demand for money or gifts as a reason to stop." },
      { id: "safety", q: "How do we meet safely?", a: fact("safety") },
      { id: "after", q: "What happens after the meeting?", a: "Each family says yes or no in its own time; there is no fixed deadline. A no is not an insult, and nothing about the meeting obliges anyone to continue." },
    ],
    te: [
      { id: "what", q: "పెళ్లి చూపులు అంటే ఏమిటి?", a: "రెండు కుటుంబాల మొదటి పరిచయ సమావేశం — సాధారణంగా పెళ్లి కూతురి ఇంట్లో లేదా తటస్థ ప్రదేశంలో. జంట కొద్దిసేపు మాట్లాడుకున్న తర్వాత పెద్దలు తదుపరి అడుగులు చర్చిస్తారు." },
      { id: "prepare", q: "ఎలా సిద్ధం కావాలి?", a: "సమయం మరియు స్థలం ముందుగానే నిర్ణయించుకోండి, వచ్చేవారి సంఖ్య తక్కువగా ఉంచండి, ఎవరు ఏమి అడగాలో ముందే పంచుకోండి. పోగొట్టుకోవడానికి ఇష్టపడనివి తీసుకెళ్లవద్దు; మొదటి సమావేశం క్లుప్తంగా ఉంచండి." },
      { id: "questions", q: "ఏమి అడగాలి?", a: "ఉద్యోగం, చదువు, కుటుంబ అంచనాలు మరియు ఎక్కడ ఉండాలనుకుంటున్నారు — స్పష్టంగా, ఒక్కోటిగా. ఏ రూపంలోనైనా కట్నం చట్టవిరుద్ధం; డబ్బు లేదా కానుకల డిమాండ్ వస్తే అది ఆపడానికి కారణం." },
      { id: "safety", q: "సురక్షితంగా ఎలా కలవాలి?", a: fact("safety", true) },
      { id: "after", q: "సమావేశం తర్వాత ఏమి జరుగుతుంది?", a: "ప్రతి కుటుంబం దాని సమయంలో అవును లేదా కాదు చెబుతుంది; నిర్ణీత గడువు లేదు. 'కాదు' అనడం అవమానం కాదు; సమావేశం వల్ల ఎవరిపైనా కొనసాగాల్సిన బాధ్యత పడదు." },
    ],
  },
  stories: {
    en: [
      { id: "what", q: "What are these stories?", a: "Member-submitted accounts of how a couple met through the platform. Each one is reviewed for publication before it appears — review is not verification." },
      { id: "verified", q: "Are the stories verified?", a: "No. Identity and relationship details are not independently verified, and names are whatever the submitter supplied. Read them as one family's account, not as a checked record." },
      { id: "submit", q: "Can I share my story?", a: "Yes — members can submit one for review. Publication timing is not guaranteed, and a story may be edited for length or held back if details cannot be shown safely." },
      { id: "consent", q: "What about the other person's consent?", a: "Only share names, photos or details the other person has agreed to share. Publish nothing you would not want forwarded, and ask us to remove a story if that changes later." },
      { id: "guarantee", q: "Do stories mean the same will happen for me?", a: "No. They are individual experiences. Nothing on this site guarantees a match, a response or a marriage." },
    ],
    te: [
      { id: "what", q: "ఈ కథలు ఏమిటి?", a: "ఈ వేదిక ద్వారా జంటలు ఎలా కలిసారో సభ్యులు పంపిన వివరాలు. ప్రతి కథ ప్రచురణకు ముందు పరిశీలించబడుతుంది — పరిశీలన ధృవీకరణ కాదు." },
      { id: "verified", q: "కథలు ధృవీకరించబడ్డాయా?", a: "కాదు. గుర్తింపు మరియు సంబంధ వివరాలు స్వతంత్రంగా ధృవీకరించబడవు; పేర్లు సమర్పించిన వారు ఇచ్చినవే. వీటిని ఒక కుటుంబ వివరణగా చదవండి, తనిఖీ చేసిన రికార్డుగా కాదు." },
      { id: "submit", q: "నా కథను పంచుకోవచ్చా?", a: "అవును — సభ్యులు పరిశీలన కోసం ఒక కథ పంపవచ్చు. ప్రచురణ సమయం హామీ కాదు; పొడవు కోసం సవరించవచ్చు లేదా వివరాలు సురక్షితంగా చూపలేకపోతే నిలిపివేయవచ్చు." },
      { id: "consent", q: "ఎదుటి వ్యక్తి సమ్మతి సంగతి?", a: "ఎదుటి వ్యక్తి పంచుకోవడానికి అంగీకరించిన పేర్లు, ఫోటోలు మరియు వివరాలు మాత్రమే ఇవ్వండి. ఫార్వార్డ్ అయ్యేలా ఉండే వివరాలు ప్రచురించవద్దు; తర్వాత అభిప్రాయం మారితే కథను తీసివేయమని అడగవచ్చు." },
      { id: "guarantee", q: "కథలు చూస్తే నాకూ అదే జరుగుతుందా?", a: "కాదు. ఇవి వ్యక్తిగత అనుభవాలు. ఈ సైట్‌లో ఏదీ సంబంధం, స్పందన లేదా వివాహానికి హామీ కాదు." },
    ],
  },
};

/** Pages that have a question set. */
export function pageFaqKeys() {
  return Object.keys(PAGE_FAQS);
}

/**
 * Build the FAQ for a page in the reader's language.
 *
 * `{districtCount}` style placeholders are filled from `vars`; a variable that
 * is not supplied removes the clause instead of leaving a blank or a guess.
 *
 * @param {string} key
 * @param {{ te?: boolean, vars?: Record<string, string | number> }} [options]
 * @returns {{ id: string, q: string, a: string }[]}
 */
export function pageFaq(key, options = {}) {
  const set = PAGE_FAQS[String(key || "")];
  if (!set) return [];
  const te = Boolean(options.te);
  const vars = options.vars && typeof options.vars === "object" ? options.vars : {};
  const rows = te ? set.te : set.en;
  return rows.map((row) => ({
    id: row.id,
    q: fill(row.q, vars),
    a: fill(row.a, vars),
  }));
}

/**
 * @param {string} template
 * @param {Record<string, string | number>} vars
 */
function fill(template, vars) {
  return String(template || "").replace(/\{(\w+)\}/g, (match, name) => {
    const value = vars[name];
    if (value === undefined || value === null || value === "") return "";
    return name.toLowerCase().includes("count") ? ` (${value})` : String(value);
  });
}

/**
 * FAQPage structured data. Only what the page renders belongs here.
 * @param {{ id: string, q: string, a: string }[]} items
 */
export function pageFaqSchema(items) {
  const rows = Array.isArray(items) ? items : [];
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: rows
      .filter((row) => row && String(row.q || "").trim() && String(row.a || "").trim())
      .map((row) => ({
        "@type": "Question",
        name: String(row.q).trim(),
        acceptedAnswer: { "@type": "Answer", text: String(row.a).trim() },
      })),
  };
}

/**
 * BreadcrumbList for any page.
 * @param {{ siteUrl?: string, path?: string, trail?: { en: string, te?: string }[] }} [options]
 */
export function pageBreadcrumb(options = {}) {
  const siteUrl = String(options.siteUrl || "https://manavivaha.in").replace(/\/+$/, "");
  const path = String(options.path || "");
  const trail = Array.isArray(options.trail) ? options.trail : [];
  const crumbs = [{ en: "Home", url: `${siteUrl}/` }];
  for (const crumb of trail) {
    if (!crumb || !crumb.en) continue;
    const href = crumb.url || (crumb.path ? `${siteUrl}${crumb.path}` : "");
    crumbs.push({ en: crumb.en, url: href });
  }
  if (path) {
    const last = crumbs[crumbs.length - 1];
    if (last && !last.url) last.url = `${siteUrl}${path}`;
  }
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs
      .filter((crumb) => crumb.url)
      .map((crumb, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: crumb.en,
        item: crumb.url,
      })),
  };
}
