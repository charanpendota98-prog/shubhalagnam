export type BlogArticle = {
  slug: string; title: string; description: string; published: string; updated: string;
  readMinutes: number; keywords: string[]; intro: string; sections: { heading: string; paragraphs: string[]; tips?: string[] }[];
};

export const BLOG_ARTICLES: BlogArticle[] = [
  {
    slug: "telugu-matrimony-profile-ela-create-cheyali",
    title: "మంచి మ్యాట్రిమోనీ ప్రొఫైల్ ఎలా తయారు చేయాలి?",
    description: "తెలుగు మ్యాట్రిమోనీ ప్రొఫైల్‌లో ఫోటో, చదువు, ఉద్యోగం, కుటుంబ వివరాలు ఎలా స్పష్టంగా రాయాలో పూర్తి గైడ్.",
    published: "2026-09-19", updated: "2026-09-19", readMinutes: 7,
    keywords: ["Telugu matrimony profile", "మ్యాట్రిమోనీ ప్రొఫైల్", "marriage profile Telugu"],
    intro: "మంచి సంబంధం రావడానికి మొదటి అడుగు నిజమైన, స్పష్టమైన ప్రొఫైల్. ఎక్కువ మాటలు కాకుండా కుటుంబానికి అవసరమైన సమాచారం సరిగ్గా ఇవ్వడం ముఖ్యం.",
    sections: [
      { heading: "1. ప్రొఫైల్ ఫోటో ఎలా ఉండాలి?", paragraphs: ["సహజమైన వెలుతురులో, ముఖం స్పష్టంగా కనిపించే తాజా ఫోటో పెట్టండి. ఎక్కువ filters, sunglasses లేదా group photo వాడకండి.", "Photo-private mode ఎంచుకుంటే మీ అనుమతి లేకుండా పూర్తి ఫోటో చూపించము."], tips: ["6 నెలల్లో తీసిన ఫోటో", "ముఖం స్పష్టంగా", "సాదా background", "కనీసం రెండు photos"] },
      { heading: "2. చదువు, ఉద్యోగం, ఆదాయం", paragraphs: ["Degree పేరు, ప్రస్తుతం చేసే పని, పని చేసే నగరం స్పష్టంగా రాయండి. ఆదాయం range ఇవ్వొచ్చు; తప్పు సమాచారం ఇవ్వకండి.", "Work location సరైనదైతే దగ్గర ప్రాంతాల matches మరింత relevant గా వస్తాయి."] },
      { heading: "3. కుటుంబం మరియు అంచనాలు", paragraphs: ["కుటుంబ రకం, స్వస్థలం, తల్లిదండ్రుల వివరాలు సంక్షిప్తంగా ఇవ్వండి. Partner గురించి తప్పనిసరి విషయాలు మాత్రమే expectations లో రాయండి.", "గౌరవంగా, positive గా రాసిన profile కి responses ఎక్కువగా వచ్చే అవకాశం ఉంటుంది."] },
      { heading: "4. నమ్మకం పెంచే verification", paragraphs: ["Phone OTP, selfie/photo review మరియు admin manual ID review వేర్వేరు checks. Government ID review label ఉంటే ఆ document ను team పరిశీలించినట్లు మాత్రమే; ఇది ఇతర profile వివరాలను నిర్ధారించదు. ID number public గా store లేదా display చేయము."] },
    ],
  },
  {
    slug: "online-matrimony-safety-telugu",
    title: "ఆన్‌లైన్ మ్యాట్రిమోనీలో మోసాల నుంచి ఎలా రక్షించుకోవాలి?",
    description: "Matrimony fraud safety tips Telugu: డబ్బు అడిగితే ఏం చేయాలి, identity verify చేయడం, safe meeting మరియు reporting guide.",
    published: "2026-09-19", updated: "2026-09-19", readMinutes: 8,
    keywords: ["matrimony fraud Telugu", "online marriage safety", "మ్యాట్రిమోనీ మోసం"],
    intro: "Online matrimony ఉపయోగకరమే, కానీ తొందరపడి నమ్మకూడదు. కుటుంబంతో కలిసి verify చేసి, పరస్పర సమ్మతి తర్వాతే contact కొనసాగించండి.",
    sections: [
      { heading: "డబ్బు అడిగితే వెంటనే ఆపండి", paragraphs: ["Emergency, visa, travel, hospital, gift లేదా investment పేరుతో డబ్బు అడగడం పెద్ద red flag. ఒక్క రూపాయి కూడా పంపకుండా profile ని report చేయండి."], tips: ["UPI transfer చేయకండి", "OTP లేదా bank PIN చెప్పకండి", "Screenshots భద్రపరచండి", "Support కి report చేయండి"] },
      { heading: "Identity ని మూడు దశల్లో verify చేయండి", paragraphs: ["మొదట phone verification badge చూడండి. తర్వాత video call లో మాట్లాడండి. serious stage లో కుటుంబ సభ్యుల సమక్షంలో ID మరియు ఉద్యోగ వివరాలు పరిశీలించండి.", "Badge ఒక్కటే పెళ్లికి హామీ కాదు; అది trust signal మాత్రమే."] },
      { heading: "మొదటి meeting safe గా", paragraphs: ["Public place లో పగటి సమయంలో కలవండి. కుటుంబ సభ్యుడికి location, time చెప్పండి. మీ స్వంత transport వాడండి; private room లేదా దూర ప్రాంతానికి వెళ్లకండి."] },
      { heading: "మన వివాహ privacy model", paragraphs: ["Phone number public profile లో ఉండదు. Interest accept అయిన తర్వాతే consent తో contact exchange. Block మరియు report options ప్రతి profile లో అందుబాటులో ఉన్నాయి."] },
    ],
  },
  {
    slug: "telugu-pelli-sambandham-checklist",
    title: "తెలుగు పెళ్లి సంబంధం చూసేటప్పుడు కుటుంబ Checklist",
    description: "తెలుగు వివాహ సంబంధం నిర్ణయించే ముందు కుటుంబం మాట్లాడుకోవాల్సిన విలువలు, ఆరోగ్యం, ఉద్యోగం, ఆర్థికం, జాతకం మరియు consent checklist.",
    published: "2026-09-19", updated: "2026-09-19", readMinutes: 9,
    keywords: ["Telugu pelli sambandham", "పెళ్లి checklist", "Telugu marriage tips"],
    intro: "Profile నచ్చడం ప్రారంభం మాత్రమే. నిర్ణయం ముందు ఇద్దరి అభిప్రాయాలు, కుటుంబ విలువలు, జీవన లక్ష్యాలు ప్రశాంతంగా మాట్లాడుకోవాలి.",
    sections: [
      { heading: "ఇద్దరి సమ్మతి మొదట", paragraphs: ["Bride, groom ఇద్దరికీ స్వతంత్రంగా మాట్లాడే అవకాశం ఇవ్వాలి. కుటుంబ ఒత్తిడి లేకుండా ‘అవును’ లేదా ‘కాదు’ చెప్పే స్వేచ్ఛ ఉండాలి."] },
      { heading: "జీవన లక్ష్యాలు", paragraphs: ["Career కొనసాగించాలా, ఏ నగరంలో ఉండాలి, విదేశీ అవకాశాలు, పిల్లల గురించి అభిప్రాయం వంటి విషయాలు ముందే చర్చించండి."], tips: ["Career plans", "Location", "Family responsibilities", "Children", "Lifestyle"] },
      { heading: "ఆర్థిక స్పష్టత", paragraphs: ["జీతం మాత్రమే కాదు; అప్పులు, savings habits, కుటుంబ బాధ్యతలు కూడా గౌరవంగా మాట్లాడుకోవాలి. కట్నం అడగడం చట్టవిరుద్ధం మరియు అంగీకరించరానిది."] },
      { heading: "ఆరోగ్యం మరియు జాతకం", paragraphs: ["ముఖ్యమైన ఆరోగ్య విషయాలను దాచకుండా పరస్పరం చెప్పుకోవాలి. జాతకం కుటుంబ విశ్వాసానికి ఉపయోగపడొచ్చు, కానీ medical advice లేదా ఇద్దరి consent కి ప్రత్యామ్నాయం కాదు."] },
      { heading: "Final verification", paragraphs: ["చిరునామా, ఉద్యోగం, విద్య మరియు కుటుంబ పరిచయాలను independently verify చేయండి. Government ID సమీక్ష నమోదు చేసిన profile అయితే ఆ నిర్దిష్ట తనిఖీని మాత్రమే గుర్తించండి; అయినా మీ స్వంత due diligence తప్పనిసరి."] },
    ],
  },
];

export const articleBySlug = (slug: string) => BLOG_ARTICLES.find((a) => a.slug === slug);
