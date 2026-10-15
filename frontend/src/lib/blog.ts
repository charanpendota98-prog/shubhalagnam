export type BlogSection = {
  heading: string;
  paragraphs: string[];
  tips?: string[];
};

export type BlogArticle = {
  slug: string;
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;
  published: string;
  updated: string;
  readMinutes: number;
  keywords: string[];
  intro: string;
  introEn: string;
  sections: BlogSection[];
  sectionsEn: BlogSection[];
};

export const BLOG_ARTICLES: BlogArticle[] = [
  {
    slug: "telugu-matrimony-profile-ela-create-cheyali",
    title: "మంచి మ్యాట్రిమోనీ ప్రొఫైల్ ఎలా తయారు చేయాలి?",
    titleEn: "How to Create a Clear, Helpful Matrimony Profile",
    description: "తెలుగు మ్యాట్రిమోనీ ప్రొఫైల్‌లో ఫోటో, చదువు, ఉద్యోగం, కుటుంబ వివరాలు ఎలా స్పష్టంగా రాయాలో పూర్తి గైడ్.",
    descriptionEn: "A practical guide to profile photos, education, work, family details, privacy settings, and accurately describing verification.",
    published: "2026-09-19",
    updated: "2026-09-19",
    readMinutes: 7,
    keywords: ["Telugu matrimony profile", "మ్యాట్రిమోనీ ప్రొఫైల్", "marriage profile Telugu"],
    intro: "మంచి సంబంధం రావడానికి మొదటి అడుగు నిజమైన, స్పష్టమైన ప్రొఫైల్. ఎక్కువ మాటలు కాకుండా కుటుంబానికి అవసరమైన సమాచారం సరిగ్గా ఇవ్వడం ముఖ్యం.",
    introEn: "A useful profile starts with honest, clear information. Share the details a prospective match and family need; accuracy matters more than lengthy claims.",
    sections: [
      {
        heading: "1. ప్రొఫైల్ ఫోటో ఎలా ఉండాలి?",
        paragraphs: [
          "సహజమైన వెలుతురులో, ముఖం స్పష్టంగా కనిపించే తాజా ఫోటో పెట్టండి. ఎక్కువ filters, sunglasses లేదా group photo వాడకండి.",
          "Photo-private mode ఎంచుకుంటే మీ అనుమతి లేకుండా పూర్తి ఫోటో చూపించము.",
        ],
        tips: ["6 నెలల్లో తీసిన ఫోటో", "ముఖం స్పష్టంగా", "సాదా background", "కనీసం రెండు photos"],
      },
      {
        heading: "2. చదువు, ఉద్యోగం, ఆదాయం",
        paragraphs: [
          "Degree పేరు, ప్రస్తుతం చేసే పని, పని చేసే నగరం స్పష్టంగా రాయండి. ఆదాయం range ఇవ్వొచ్చు; తప్పు సమాచారం ఇవ్వకండి.",
          "Work location సరైనదైతే దగ్గర ప్రాంతాల matches మరింత relevant గా వస్తాయి.",
        ],
      },
      {
        heading: "3. కుటుంబం మరియు అంచనాలు",
        paragraphs: [
          "కుటుంబ రకం, స్వస్థలం, తల్లిదండ్రుల వివరాలు సంక్షిప్తంగా ఇవ్వండి. Partner గురించి తప్పనిసరి విషయాలు మాత్రమే expectations లో రాయండి.",
          "గౌరవంగా, positive గా రాసిన profile కి responses ఎక్కువగా వచ్చే అవకాశం ఉంటుంది.",
        ],
      },
      {
        heading: "4. నమ్మకం పెంచే verification",
        paragraphs: [
          "Phone OTP, selfie/photo review మరియు admin manual ID review వేర్వేరు checks. Government ID review label ఉంటే ఆ document ను team పరిశీలించినట్లు మాత్రమే; ఇది ఇతర profile వివరాలను నిర్ధారించదు. ID number public గా store లేదా display చేయము.",
        ],
      },
    ],
    sectionsEn: [
      {
        heading: "1. Choose a recent, clear profile photo",
        paragraphs: [
          "Use a recent photo taken in natural light, with your face clearly visible. Avoid heavy filters, sunglasses, and group photos.",
          "If you choose photo-private mode, the full photo is not shown without your permission.",
        ],
        tips: ["Taken within the last six months", "Face clearly visible", "Simple background", "At least two photos"],
      },
      {
        heading: "2. Describe education, work, and income accurately",
        paragraphs: [
          "List your degree, current work, and work city clearly. You may provide an income range; do not add information that is not accurate.",
          "A correct work location can make nearby search results more relevant.",
        ],
      },
      {
        heading: "3. Share family details and expectations",
        paragraphs: [
          "Briefly describe your family, hometown, and parents. Include only the expectations that genuinely matter to you in a prospective partner.",
          "A respectful, positive profile may help families understand you; responses are never guaranteed.",
        ],
      },
      {
        heading: "4. Understand what verification means",
        paragraphs: [
          "Phone OTP, selfie or photo review, and manual ID review are separate checks. A Government ID review label means only that the specified document was reviewed; it does not verify other profile details or guarantee identity. The ID number is not displayed publicly.",
        ],
      },
    ],
  },
  {
    slug: "online-matrimony-safety-telugu",
    title: "ఆన్‌లైన్ మ్యాట్రిమోనీలో మోసాల నుంచి ఎలా రక్షించుకోవాలి?",
    titleEn: "How to Stay Safe from Online Matrimony Scams",
    description: "Matrimony fraud safety tips Telugu: డబ్బు అడిగితే ఏం చేయాలి, identity verify చేయడం, safe meeting మరియు reporting guide.",
    descriptionEn: "Practical safety guidance on money requests, identity checks, first meetings, privacy, and reporting suspicious activity.",
    published: "2026-09-19",
    updated: "2026-09-19",
    readMinutes: 8,
    keywords: ["matrimony fraud Telugu", "online marriage safety", "మ్యాట్రిమోనీ మోసం"],
    intro: "Online matrimony ఉపయోగకరమే, కానీ తొందరపడి నమ్మకూడదు. కుటుంబంతో కలిసి verify చేసి, పరస్పర సమ్మతి తర్వాతే contact కొనసాగించండి.",
    introEn: "Online matrimony can help people connect, but take time to verify information. Involve trusted family members if you wish, and continue contact only with mutual consent.",
    sections: [
      {
        heading: "డబ్బు అడిగితే వెంటనే ఆపండి",
        paragraphs: [
          "Emergency, visa, travel, hospital, gift లేదా investment పేరుతో డబ్బు అడగడం పెద్ద red flag. ఒక్క రూపాయి కూడా పంపకుండా profile ని report చేయండి.",
        ],
        tips: ["UPI transfer చేయకండి", "OTP లేదా bank PIN చెప్పకండి", "Screenshots భద్రపరచండి", "Support కి report చేయండి"],
      },
      {
        heading: "Identity ని మూడు దశల్లో verify చేయండి",
        paragraphs: [
          "మొదట phone verification badge చూడండి. తర్వాత video call లో మాట్లాడండి. serious stage లో కుటుంబ సభ్యుల సమక్షంలో ID మరియు ఉద్యోగ వివరాలు పరిశీలించండి.",
          "Badge ఒక్కటే పెళ్లికి హామీ కాదు; అది trust signal మాత్రమే.",
        ],
      },
      {
        heading: "మొదటి meeting safe గా",
        paragraphs: [
          "Public place లో పగటి సమయంలో కలవండి. కుటుంబ సభ్యుడికి location, time చెప్పండి. మీ స్వంత transport వాడండి; private room లేదా దూర ప్రాంతానికి వెళ్లకండి.",
        ],
      },
      {
        heading: "మన వివాహ privacy model",
        paragraphs: [
          "Phone number public profile/search లో ఉండదు. Profile owner Interest accept చేసిన తర్వాత contact details accepted-request account views లో కనిపిస్తాయి; notification delivery హామీ లేదు. Profile pages లో అందుబాటులో ఉన్న report/block controls ను ఉపయోగించండి.",
        ],
      },
    ],
    sectionsEn: [
      {
        heading: "Stop if someone asks you for money",
        paragraphs: [
          "Requests for money for an emergency, visa, travel, hospital bill, gift, or investment are serious warning signs. Do not send money; report the profile instead.",
        ],
        tips: ["Do not transfer money by UPI", "Never share an OTP or bank PIN", "Keep relevant screenshots", "Report the profile"],
      },
      {
        heading: "Verify information in more than one way",
        paragraphs: [
          "Review the specific phone-verification status shown on the profile, then consider a video call. If you are both comfortable moving forward, independently check identity and work details through appropriate, consent-based means.",
          "A badge records a particular check; it is not a guarantee of identity, character, or a successful marriage.",
        ],
      },
      {
        heading: "Plan a safer first meeting",
        paragraphs: [
          "Choose a public place and a daytime meeting. Tell someone you trust where you are going and when. Arrange your own transport, and avoid isolated locations or private rooms.",
        ],
      },
      {
        heading: "How Mana Vivaha handles contact details",
        paragraphs: [
          "Phone numbers are not shown on public profiles or search results. After the profile owner accepts an interest request, contact details may appear in the relevant account views. A queued notification does not guarantee delivery. Use report and block controls where available.",
        ],
      },
    ],
  },
  {
    slug: "telugu-pelli-sambandham-checklist",
    title: "తెలుగు పెళ్లి సంబంధం చూసేటప్పుడు కుటుంబ Checklist",
    titleEn: "A Family Checklist for Considering a Marriage Match",
    description: "తెలుగు వివాహ సంబంధం నిర్ణయించే ముందు కుటుంబం మాట్లాడుకోవాల్సిన విలువలు, ఆరోగ్యం, ఉద్యోగం, ఆర్థికం, జాతకం మరియు consent checklist.",
    descriptionEn: "A thoughtful checklist for conversations about consent, values, health, work, finances, family responsibilities, and horoscope traditions.",
    published: "2026-09-19",
    updated: "2026-09-19",
    readMinutes: 9,
    keywords: ["Telugu pelli sambandham", "పెళ్లి checklist", "Telugu marriage tips"],
    intro: "Profile నచ్చడం ప్రారంభం మాత్రమే. నిర్ణయం ముందు ఇద్దరి అభిప్రాయాలు, కుటుంబ విలువలు, జీవన లక్ష్యాలు ప్రశాంతంగా మాట్లాడుకోవాలి.",
    introEn: "Liking a profile is only a starting point. Before making a decision, take time to discuss each person’s views, family values, and life goals calmly and respectfully.",
    sections: [
      {
        heading: "ఇద్దరి సమ్మతి మొదట",
        paragraphs: ["Bride, groom ఇద్దరికీ స్వతంత్రంగా మాట్లాడే అవకాశం ఇవ్వాలి. కుటుంబ ఒత్తిడి లేకుండా ‘అవును’ లేదా ‘కాదు’ చెప్పే స్వేచ్ఛ ఉండాలి."],
      },
      {
        heading: "జీవన లక్ష్యాలు",
        paragraphs: ["Career కొనసాగించాలా, ఏ నగరంలో ఉండాలి, విదేశీ అవకాశాలు, పిల్లల గురించి అభిప్రాయం వంటి విషయాలు ముందే చర్చించండి."],
        tips: ["Career plans", "Location", "Family responsibilities", "Children", "Lifestyle"],
      },
      {
        heading: "ఆర్థిక స్పష్టత",
        paragraphs: ["జీతం మాత్రమే కాదు; అప్పులు, savings habits, కుటుంబ బాధ్యతలు కూడా గౌరవంగా మాట్లాడుకోవాలి. కట్నం అడగడం చట్టవిరుద్ధం మరియు అంగీకరించరానిది."],
      },
      {
        heading: "ఆరోగ్యం మరియు జాతకం",
        paragraphs: ["ముఖ్యమైన ఆరోగ్య విషయాలను దాచకుండా పరస్పరం చెప్పుకోవాలి. జాతకం కుటుంబ విశ్వాసానికి ఉపయోగపడొచ్చు, కానీ medical advice లేదా ఇద్దరి consent కి ప్రత్యామ్నాయం కాదు."],
      },
      {
        heading: "Final verification",
        paragraphs: ["చిరునామా, ఉద్యోగం, విద్య మరియు కుటుంబ పరిచయాలను independently verify చేయండి. Government ID సమీక్ష నమోదు చేసిన profile అయితే ఆ నిర్దిష్ట తనిఖీని మాత్రమే గుర్తించండి; అయినా మీ స్వంత due diligence తప్పనిసరి."],
      },
    ],
    sectionsEn: [
      {
        heading: "Start with each person’s consent",
        paragraphs: ["Give both prospective partners a private opportunity to speak. Each person should be free to say yes or no without pressure from family or anyone else."],
      },
      {
        heading: "Discuss life goals",
        paragraphs: ["Talk early about continuing a career, where you may live, possible relocation, and views about children and day-to-day life."],
        tips: ["Career plans", "Location and relocation", "Family responsibilities", "Views about children", "Lifestyle"],
      },
      {
        heading: "Be clear about finances",
        paragraphs: ["Discuss income, debts, savings habits, and family responsibilities respectfully. Dowry demands are illegal in India and should not be accepted."],
      },
      {
        heading: "Health and horoscope traditions",
        paragraphs: ["Share important health information honestly and respectfully. Horoscope matching may matter to a family’s beliefs, but it is not medical advice and cannot replace the consent of both people."],
      },
      {
        heading: "Verify important details independently",
        paragraphs: ["Where appropriate and with consent, check address, work, education, and family references independently. A Government ID review records only that particular document check; your own due diligence is still important."],
      },
    ],
  },
];

export const articleBySlug = (slug: string) => BLOG_ARTICLES.find((article) => article.slug === slug);
