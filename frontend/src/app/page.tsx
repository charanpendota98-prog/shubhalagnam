"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ALL_CHANNELS, CHANNEL_STATS, Channel } from "@/lib/channels";
import Reveal from "@/components/Reveal";
import { useCountUp } from "@/components/Skeletons";
import AdSlot from "@/components/AdSlot";
import OffersBanner from "@/components/OffersBanner";
import BannerSlot from "@/components/BannerSlot";
import SectionHeading from "@/components/SectionHeading";
import { FinalCta, StoriesStrip, TeaserStrip } from "@/components/HomeGrowth";
import DailyStrip from "@/components/DailyStrip";
import ShowcaseStrip from "@/components/ShowcaseStrip";
import ProfilesOfTheDay from "@/components/ProfilesOfTheDay";
import { SITE_CONFIG } from "@/lib/site-config";
import { apiGet } from "@/lib/api";
import { useLang, type Lang } from "@/lib/lang";
import CinematicHero from "@/components/CinematicHero";
import CinematicGallery from "@/components/CinematicGallery";
import HomeVendorsShowcase from "@/components/HomeVendorsShowcase";
import HeroQuickSearch from "@/components/HeroQuickSearch";
import WhyChooseUs from "@/components/WhyChooseUs";
import DistrictAdBanner from "@/components/DistrictAdBanner";
import { resolveChannelLinks, useChannelDirectoryLinks } from "@/lib/channel-links";
import { TelegramIcon, WhatsAppIcon } from "@/components/BrandIcons";
import { AP_DISTRICTS, TS_DISTRICTS, COMMUNITIES_BY_RELIGION } from "@/lib/telugu-data";

const BOT = SITE_CONFIG.officialChannelUrl;
const DISTRICT_OPTIONS_COUNT = TS_DISTRICTS.length + AP_DISTRICTS.length;
const HINDU_COMMUNITY_OPTION_COUNT = COMMUNITIES_BY_RELIGION.Hindu.length;
const handleInstallApp = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("tsap:install-show"));
  }
};

/* ------------------------------------------------------------------ */
/* 🌊 WAVE 30 — live home numbers (NO DUMMY) + Telugu/English toggle  */
/* ------------------------------------------------------------------ */
type PlanStat = { code: string; price: number; profiles: number; label: string; telugu: string; badge: string };
type HomeStats = {
  channels_total: number;
  channels_by_tier: Record<string, number>;
  castes_covered: number; free_first: number;
  plans: PlanStat[];
  renewal: { price: number; profiles: number };
  bureau: { code: string; price: number; profiles: number; label: string; telugu: string; perks: string[] }[];
  referral: { per_pay: number; milestones: { paid: number; title: string; telugu: string }[] };
};

const FALLBACK: HomeStats = {
  channels_total: CHANNEL_STATS.total,
  channels_by_tier: { ...CHANNEL_STATS.by_tier },
  castes_covered: HINDU_COMMUNITY_OPTION_COUNT, free_first: 3,
  plans: [
    { code: "FREE", price: 0, profiles: 3, label: "FREE", telugu: "FREE → 3 interest requests", badge: "Start" },
    { code: "S_99", price: 99, profiles: 5, label: "Sambandham", telugu: "₹99 → 5 interest requests", badge: "Entry" },
    { code: "S_199", price: 199, profiles: 12, label: "Family", telugu: "₹199 → 12 interest requests", badge: "Popular" },
    { code: "S_299", price: 299, profiles: 25, label: "Premium", telugu: "₹299 → 25 interest requests", badge: "Best value" },
    { code: "S_499", price: 499, profiles: 50, label: "VIP", telugu: "₹499 → 50 interest requests", badge: "VIP" },
  ],
  renewal: { price: 99, profiles: 8 },
  bureau: [
    { code: "BUREAU_999", price: 999, profiles: 25, label: "Bureau Starter", telugu: "₹999 → 25 requests (B2B)", perks: ["25 request credits", "30-day validity", "B2B plan"] },
  ],
  referral: { per_pay: 50, milestones: [{ paid: 25, title: "💎 PLATINUM Referrer", telugu: "25 paid referrals — recognition on the referral page" }] },
};

function planOf(hs: HomeStats, code: string): PlanStat {
  return hs.plans.find((p) => p.code === code) || FALLBACK.plans.find((p) => p.code === code)!;
}

function channelCommunityLabel(channel: Channel): string {
  return channel.name.replace(/^💍 /, "").replace(" Matrimony", "").replace(" | TS-AP", "").split("|")[0].trim();
}

/* ---------------- Telugu / English copy (ONE language at a time) ---------------- */
const TEXT = {
  te: {
    liveBadge: (_live: number, total: number) => `మీ profile కోసం ${total} configured channel destinations`,
    heroTitle: "మీ ఇంటి దగ్గరే సంబంధాలు",
    heroSubA: "తెలంగాణ + ఆంధ్రప్రదేశ్ తెలుగు మ్యాట్రిమోనీ",
    heroSubB: (communities: number, total: number) => `Region • Religion • ${communities} Hindu community labels (catalog non-exhaustive; self-description available) • Special. ${total} channel destinations configured; profile review తర్వాత సంబంధిత destinations కు route చేస్తాం, delivery guarantee లేదు.`,
    heroSubC: (free: number) => `₹99 కే సంబంధం — మొదటి ${free} interest requests ఉచితం.`,
    registerCta: "ఉచిత నమోదు — FREE",
    botCta: "Telegram లో చేరండి",
    installApp: "App లాగా install చేసుకోండి",
    vibeTitle: "మీ కుటుంబం కోసం ప్రొఫైళ్లను స్వయంగా పరిశీలించండి",
    trust: ["ఫోన్ OTP స్థితి", "అడ్మిన్ సమీక్ష తర్వాత ప్రొఫైల్ ఆమోదం", "ఫోటో గోప్యతా నియంత్రణలు", "అంగీకారం తర్వాత సంప్రదింపు"],
    idSearchPh: "Profile ID నమోదు చేసి వెతకండి",
    idSearchBtn: "వెతకండి",
    cardWhy: "ప్రొఫైల్‌లో అందుబాటులో ఉన్న వివరాలు",
    cardTags: ["విద్య", "ప్రాంతం", "ప్రాధాన్యతలు"],
    cardWhy1: "✓ మీరు ఎంచుకున్న కమ్యూనిటీ ప్రాధాన్యతలు",
    cardWhy2: "✓ ప్రొఫైల్‌లో నమోదు చేసిన విద్య / ఉద్యోగ సమాచారం",
    cardWhy3: "✓ అందుబాటులో ఉన్న ప్రాంత వివరాలు",
    cardInterest: "❤️ Interest పంపు",
    cardNumber: "📞 Contact after acceptance",
    ticker: (total: number, communities: number, free: number) => [
      `${total} configured channels — Region • Religion • Community • Special`,
      `₹99 plan — మొదటి ${free} interest requests ఉచితం`,
      "Optional photo privacy • profile details సభ్యులు అందిస్తారు",
      "Configured messaging destinations మాత్రమే; బాహ్య లింకుల లభ్యత హామీ కాదు",
      `${communities} Hindu community labels; జాబితా సంపూర్ణం కాదు, self-description అందుబాటులో ఉంది`,
      "Configured community destinations profile approval తర్వాత చూపబడతాయి",
      "Referral — అర్హమైన first consumer-plan payment పై ఒక్కసారి ₹50 ఉండవచ్చు (నియమాలు వర్తిస్తాయి)",
    ],
    statChannels: "Channels (network)",
    statChannelsSub: (t: Record<string, number>) => `${t.L1_REGION ?? 5} Region • ${t.L2_RELIGION ?? 5} Religion • ${t.L3_CASTE ?? 33} Community • ${t.L4_SPECIAL ?? 8} Special`,
    statCastes: "హిందూ కమ్యూనిటీ లేబుళ్లు",
    statCastesSub: "ఎంపిక చేసిన జాబితా • స్వయంగా పేరు నమోదు చేయవచ్చు",
    statChat: "No chatting",
    statChatT: "In-app chat లేదు — acceptance తర్వాత contact sharing",
    statChatS: "Contact details may be shared after acceptance, subject to privacy settings",
    statPrice: (p99: PlanStat) => `₹${p99.price}→${p99.profiles} requests`,
    statPriceL: (p199: PlanStat, p299: PlanStat) => `Requests (₹${p199.price}→${p199.profiles}, ₹${p299.price}→${p299.profiles})`,
    statPriceS: (free: number) => `మొదటి ${free} requests FREE`,
    howEyebrow: "ఎలా పనిచేస్తుంది",
    howTitle: "పరిచయం ప్రారంభించడానికి 4 దశలు",
    howSub: "మీ profile ని team review చేసిన తర్వాత, configured destinations కి route చేస్తాం. Channel availability/delivery ను హామీ ఇవ్వలేము.",
    howSteps: (total: number) => [
      { n: "01", t: "Register", d: "Personal, family, caste/astro, education, location + photo. 5 easy steps, mobile లోనే.", icon: "📝" },
      { n: "02", t: "Card + ID ready", d: "Profile card ఆటోమేటిక్‌గా generate అవుతుంది — అన్ని details, QR, watermark తో.", icon: "🎴" },
      { n: "03", t: "సంబంధిత destinations కు route", d: `Profile approval తర్వాత caste + state + job ఆధారంగా configured destinations లో ఎంపిక చేస్తాం.`, icon: "📢" },
      { n: "04", t: "Interest పంపండి → సమ్మతితో సంప్రదింపు", d: "Interest పంపితే notification availability service configuration పై ఆధారపడుతుంది. Accept తర్వాత privacy settings ప్రకారం contact వివరాలు పంచుకోవచ్చు; delivery హామీ కాదు.", icon: "💌" },
    ],
    reqEyebrow: "సమ్మతితో సంప్రదింపు",
    reqTitle: "గౌరవప్రదమైన అనుసంధానం • Interest → సమ్మతితో contact sharing",
    reqSub: "మీరు interest పంపిన తర్వాత అవతలి profile owner accept చేస్తేనే contact details share అవుతాయి. Online పరిచయాల్లో మీరే due diligence చేయండి.",
    reqAction: "💌 రిక్వెస్ట్‌లు",
    reqSteps: (free: number, p99: PlanStat) => [
      { i: "💌", t: "1. Interest పంపండి (1 credit)", d: `ప్రొఫైల్ చూసి "Interest పంపు" ఎంచుకోండి — మొదటి ${free} రిక్వెస్ట్‌లు ఉచితం, తర్వాత ₹${p99.price} → ${p99.profiles} interest requests.` },
      { i: "📲", t: "2. Interest notification", d: `లభ్యమైన notification channel ద్వారా మీ interest మరియు profile details అవతలి వ్యక్తికి పంపబడతాయి.` },
      { i: "✅", t: "3. Owner accept చేస్తే contact sharing", d: "అంగీకారం తర్వాత privacy settings ప్రకారం contact వివరాలు పంచుకోవచ్చు; వివరాలను స్వతంత్రంగా నిర్ధారించండి." },
      { i: "↩️", t: "4. Decline credit policy", d: "Declined requests are handled according to the credit-refund policy shown in your account." },
    ],
    reqChips: ["🚫 0 chatting", "🔒 Consent first", "↩️ Decline credit policy applies", "ℹ️ Verify details yourself"],
    priceStrip: (p: PlanStat, tag: string) => ({ p: `₹${p.price}`, n: `${p.profiles} requests`, s: tag }),
    priceTags: ["₹20/request — entry", "₹16.6/request — 12 requests", "₹12/request — 25 requests"],
    chEyebrow: "ఛానల్ నెట్‌వర్క్",
    chTitle: (total: number) => `${total} configured channel listings`,
    chSub: "Region + Religion + Caste + Special. Profile approval తర్వాత సంబంధిత configured destinations కు route అవుతుంది; live availability check లేదు.",
    chAction: (total: number) => `అన్ని ${total} ఛానళ్లు`,
    flowTitle: "📢 Profile approval తర్వాత channel routing",
    flow: [
      { t: "1. మీ వివరాలు", d: "5 సులభమైన స్టెప్స్ + ఫోటో" },
      { t: "2. సరైన destination ఎంపిక", d: "కులం × రాష్ట్రం × వృత్తి బట్టి" },
      { t: "3. Configured channel కు route", d: "Reachability అందుబాటుపై ఆధారపడుతుంది" },
      { t: "4. నోటిఫికేషన్", d: "Notification configuration మరియు delivery timing మారవచ్చు" },
    ],
    casteEyebrow: "కమ్యూనిటీ ఛానల్స్",
    casteTitle: (n: number) => `${n} కమ్యూనిటీ channel listings`,
    casteSub: "ఇక్కడ channel listings మాత్రమే చూపిస్తాం; profile availability, routing మరియు external destination access మారవచ్చు.",
    casteAction: "కులాల జాబితా",
    casteMore: (n: number) => `+ ఇంకా ${n} కమ్యూనిటీ channel listings —`,
    casteFull: "పూర్తి జాబితా చూడండి",
    spEyebrow: "ప్రత్యేక విభాగం",
    spTitle: "ప్రతి ఒక్కరికీ సముచిత గౌరవం — ప్రత్యేక వేదిక",
    spSub: "పునర్వివాహం, దివ్యాంగులు, 35+ వయస్సు, ప్రభుత్వ ఉద్యోగులు, డాక్టర్లు, విదేశీ NRI — ప్రతి ఒక్కరికీ ప్రత్యేకమైన గౌరవప్రదమైన ఛానల్స్.",
    pricingEyebrow: "సభ్యత్వ ప్యాకేజీలు",
    pricingTitle: "పారదర్శక ధరలు — ₹99 కే సంబంధాల వివరాలు",
    pricingSub: (free: number, p99: PlanStat, p199: PlanStat, p299: PlanStat, p499: PlanStat) =>
      `నమోదు ఉచితం. మొదటి ${free} interest requests ఉచితం. ఆ తర్వాత ₹${p99.price} → ${p99.profiles} requests, ₹${p199.price} → ${p199.profiles}, ₹${p299.price} → ${p299.profiles}, ₹${p499.price} → ${p499.profiles}. Contact sharing acceptance తర్వాతే; decline కు account refund policy వర్తిస్తుంది.`,
    planTags: ["ప్రారంభ ప్లాన్", "5 requests • ₹20/request", "12 requests • ₹17/request", "25 requests • ₹12/request", "50 requests • ₹10/request"],
    planNames: ["ఉచిత ప్లాన్", "సంబంధం ప్లాన్", "ఫ్యామిలీ ప్లాన్", "ప్రీమియం ప్లాన్", "విఐపి ప్లాన్"],
    planCredits: (free: number, p99: PlanStat, p199: PlanStat, p299: PlanStat, p499: PlanStat) => [
      `మొదటి ${free} interest requests ఉచితం`, `${p99.profiles} requests • 30 రోజులు`, `${p199.profiles} requests • 45 రోజులు`,
      `${p299.profiles} requests • 60 రోజులు`, `${p499.profiles} requests • 90 రోజులు`,
    ],
    planFeatures: [
      ["3 interest requests", "Notification సేవ configuration పై ఆధారపడుతుంది", "Review తర్వాత configured destinations కి మాత్రమే routing", "Profile search", "Optional privacy settings పరిశీలించండి"],
      ["5 interest requests", "30 రోజుల credit validity", "Consent మరియు privacy settings ప్రకారం contact sharing", "Credit-refund policy account లో చూపినట్లు వర్తిస్తుంది"],
      ["12 interest requests", "45 రోజుల credit validity", "అదనపు tools లభ్యత వేరుగా చూపిస్తాం", "Match లేదా response guarantee లేదు"],
      ["25 interest requests", "60 రోజుల credit validity", "Plan active ఉన్నంతవరకు Who viewed పేర్లు", "Contact sharing owner acceptance తర్వాతే"],
      ["50 interest requests", "90 రోజుల credit validity", "Plan active ఉన్నంతవరకు Who viewed పేర్లు", "Contact sharing owner acceptance తర్వాతే"],
    ],
    planCtaFree: "ఉచితంగా ప్రారంభించండి",
    planCtaPay: (price: string) => `${price} తో ప్లాన్ ప్రారంభించండి`,
    planSecure: "Checkout లో చూపించే payment options మరియు వర్తించే refund policy",
    addonTitle: "🎁 అదనపు సేవలు (Add-ons)",
    addonTag: "ఎప్పుడైనా ఎంచుకోవచ్చు",
    renewalLine: (r: { price: number; profiles: number }, b: { price: number; profiles: number }) =>
      `🔁 రెన్యూవల్ ఆఫర్: ప్రస్తుత సభ్యులకు ₹${r.price} → ${r.profiles} interest requests • 🏢 బ్యూరో ప్లాన్: ₹${b.price}/30 రోజులు → ${b.profiles} request credits`,
    addonCta1: "ప్లాన్లు & సర్వీసులు ఎంచుకోండి →",
    addonCta2: "👀 ప్రొఫైల్ వీక్షకుల జాబితా",
    refTitle: "🏆 రెఫరల్ ప్రోగ్రామ్",
    refSub: (per: number) => `Valid referral attach పై referrer కు +2, కొత్త user కు +1 interest-request credits వస్తాయి (cash కాదు). Referrer కు ₹${per} ఒక్కసారి మాత్రమే అర్హత ఉండవచ్చు: referee మొదటి S_99/S_199/S_299/S_499 consumer-plan payment కనీసం ₹99 కావాలి. Add-ons, assisted service, boosts, gifts, renewals, complimentary మరియు B2B/non-consumer payments మినహాయింపు.`,
    refCards: (per: number, _ms: string) => [{ k: "ఒక్కసారి అర్హత ఉండవచ్చు", v: `₹${per}` }, { k: "25 అర్హమైన చెల్లింపులు", v: "ప్లాటినం గుర్తింపు మాత్రమే" }, { k: "చెల్లింపు", v: "మాన్యువల్ సమీక్ష • నిర్ణీత సమయం లేదు" }],
    refCta1: "నా రెఫరల్ కోడ్ →",
    refCta2: "🎁 ఇప్పుడే ప్రారంభించండి",
    burTitle: "🏢 మ్యారేజ్ బ్యూరో & బ్రోకర్ భాగస్వామ్యం (B2B)",
    burSub: "మీరు ఇప్పటికే మ్యారేజ్ బ్యూరో నిర్వహిస్తున్నారా? Member-submitted profiles ను మీ clients కోసం browse చేసి, ప్రతి వివరాన్ని స్వయంగా నిర్ధారించండి.",
    burName: (b: { label: string; price: number }) => `${b.label} — ₹${b.price}/నెలకి`,
    burOpen: "B2B భాగస్వామ్యం అందుబాటులో ఉంది",
    burDash: "బ్యూరో డాష్‌బోర్డ్ →",
    faqEyebrow: "సందేహాలు & సమాధానాలు",
    faqTitle: "తరచూ అడిగే ప్రశ్నలు — పూర్తి వివరణ",
    ctaTitle: "ఈరోజే ఉచితంగా నమోదు చేసుకోండి",
    ctaSub: (total: number, free: number, p99: PlanStat, p199: PlanStat, p299: PlanStat, p499: PlanStat) =>
      `ఉచిత నమోదు → ప్రొఫైల్ సమీక్ష → configured destinations కు routing (లభ్యత/డెలివరీ హామీ కాదు) → మొదటి ${free} interest requests ఉచితం. ఆ తర్వాత ₹${p99.price} నుండి ₹${p499.price} వరకు plans అందుబాటులో ఉన్నాయి.`,
    ctaReg: "ఉచిత ప్రారంభ నమోదు",
    ctaBot: "టెలిగ్రామ్ ఛానల్‌లో చేరండి",
    vendorEyebrow: "పెళ్లి వెండర్లు",
    vendorTitle: "🏪 పెళ్లికి కావాల్సినవన్నీ — ఒకేచోట",
    vendorSub: "Catering • Photography • Decorations • Function Hall • Tent House • Pandit • Jewellery • Makeup • DJ • Invitations • Cars • Planner. Directory listings are not business or identity verification; confirm details before booking.",
    vendorAll: "అన్ని 18 categories →",
    vendorPromoT: "మీ business కూడా promote చెయ్యాలనుందా? 🏪",
    vendorPromoS: (_total: number) => `₹149 నుంచి — listing and promotional placements are subject to channel availability.`,
    vendorPromoC: "Advertise చెయ్యండి →",
    faq: (total: number, p99: PlanStat, p199: PlanStat, p299: PlanStat, p499: PlanStat) => [
      { q: "నమోదు చేసుకోవడానికి ఏమైనా రుసుము చెల్లించాలా?", a: `నమోదు ఉచితం; మొదటి 3 interest requests కూడా ఉచితం. తర్వాత అవసరాన్ని బట్టి ₹${p99.price} నుండి ₹${p499.price} వరకు ప్లాన్లు ఉన్నాయి.` },
      { q: "సంప్రదింపుల విధానం ఎలా ఉంటుంది?", a: `In-app chat లేదు. "💌 Interest" పంపండి; అవతలి profile owner accept లేదా decline చేయవచ్చు. Acceptance తర్వాత privacy settings ప్రకారం contact వివరాలు పంచుకోవచ్చు. Declined requests కు account లో చూపిన credit-refund policy వర్తిస్తుంది.` },
      { q: "ఫోన్ నంబర్లు నేరుగా అందరికీ కనిపిస్తాయా?", a: "Public browsing లో contact వివరాలు mask అవుతాయి. Interest accept అయిన తర్వాత privacy settings ప్రకారం contact వివరాలు పంచుకోవచ్చు. ఇది exposure తగ్గిస్తుంది కానీ spam లేదా fraud ను పూర్తిగా నివారించదు." },
      { q: "ఫోటోల privacy ఎలా పనిచేస్తుంది?", a: "Photo privacy profile లో ఐచ్ఛిక setting. Generated cards లో watermark ఉండవచ్చు; అది screenshots లేదా copying ను అడ్డుకోదు. Upload చేసే ముందు privacy setting పరిశీలించండి." },
      { q: "ప్రొఫైల్ ఏయే ఛానళ్లకు route అవుతుంది?", a: `Profile review తర్వాత వివరాల ఆధారంగా configured destinations ఎంచుకోవచ్చు. Routing లేదా external availability హామీ కాదు; listed destinations కోసం channel directory చూడండి.` },
      { q: "నకిలీ ప్రొఫైల్స్ మరియు verification ఎలా ఉంటాయి?", a: "Phone OTP, profile approval, photo review, manual ID review వేర్వేరు checks. DOB సభ్యుడు ఇచ్చిన వివరమే. ఏ badge కూడా profile genuine అని హామీ ఇవ్వదు; కలవడానికి ముందు వివరాలు స్వయంగా నిర్ధారించండి. Report చేసిన వాటిపై చర్య సమయం మారవచ్చు." },
      { q: "WhatsApp notification వస్తుందా?", a: "Notification లేదా channel post configured WhatsApp destination ఉంటే దాని ద్వారా వెళ్లవచ్చు. Delivery హామీ లేదు; ప్రస్తుత స్థితి కోసం account లోని వివరాలు చూడండి." },
    ],
  },
  en: {
    liveBadge: (_live: number, total: number) => `${total} configured channel destinations for profile routing`,
    heroTitle: "Explore Telugu profiles, at your pace",
    heroSubA: "Telangana + Andhra Pradesh Telugu Matrimony",
    heroSubB: (communities: number, total: number) => `Region • Religion • ${communities} Hindu community labels (not exhaustive; self-description available) • Special — ${total} channel destinations configured. Profiles are routed after review; availability/delivery is not guaranteed.`,
    heroSubC: (free: number) => `₹99 Sambandham — first ${free} interest requests are free.`,
    registerCta: "Register FREE",
    botCta: "Join on Telegram",
    installApp: "Install as app",
    vibeTitle: "Review profiles for your family, at your pace",
    trust: ["Phone OTP status", "Profile review before approval", "Photo privacy controls", "Contact after acceptance"],
    idSearchPh: "Search by Profile ID",
    idSearchBtn: "Search",
    cardWhy: "Profile details available for review",
    cardTags: ["Education", "Location", "Preferences"],
    cardWhy1: "✓ Community preferences you selected",
    cardWhy2: "✓ Education / work details supplied in profiles",
    cardWhy3: "✓ Location details where available",
    cardInterest: "❤️ Send Interest",
    cardNumber: "📞 Contact after acceptance",
    ticker: (total: number, communities: number, free: number) => [
      `${total} configured channels — Region • Religion • Community • Special`,
      `₹99 plan — first ${free} interest requests are included free`,
      "Optional photo privacy • profile details are supplied by members",
      "Configured messaging destinations only; external availability is not monitored",
      `${communities} Hindu community labels; catalogue is not exhaustive and self-description is available`,
      "Community-specific destinations are shown where configured",
      "Referral — possible one-time ₹50 on an eligible first consumer-plan payment (terms apply)",
    ],
    statChannels: "Channels (network)",
    statChannelsSub: (t: Record<string, number>) => `${t.L1_REGION ?? 5} Region • ${t.L2_RELIGION ?? 5} Religion • ${t.L3_CASTE ?? 33} Community • ${t.L4_SPECIAL ?? 8} Special`,
    statCastes: "Hindu community labels",
    statCastesSub: "Selected options • self-description available",
    statChat: "No chatting",
    statChatT: "No in-app chat — contact sharing may follow acceptance",
    statChatS: "Contact details may be shared after acceptance, subject to privacy settings",
    statPrice: (p99: PlanStat) => `₹${p99.price}→${p99.profiles} requests`,
    statPriceL: (p199: PlanStat, p299: PlanStat) => `Requests (₹${p199.price}→${p199.profiles}, ₹${p299.price}→${p299.profiles})`,
    statPriceS: (free: number) => `First ${free} requests FREE`,
    howEyebrow: "How it works",
    howTitle: "4 steps to begin a connection",
    howSub: "After staff review, your profile is routed to configured destinations. Channel availability and delivery are not monitored or guaranteed.",
    howSteps: (total: number) => [
      { n: "01", t: "Register", d: "Personal, family, caste/astro, education, location + photo. 5 easy steps on mobile.", icon: "📝" },
      { n: "02", t: "Card + ID ready", d: "Profile card is auto-generated — all details, QR and watermark.", icon: "🎴" },
      { n: "03", t: "Route to matching destinations", d: `After profile approval, routing selects configured destinations based on your details.`, icon: "📢" },
      { n: "04", t: "Send interest → consent-based contact sharing", d: "Notification availability depends on service configuration. After acceptance, contact details may be shared subject to privacy settings; delivery is not guaranteed.", icon: "💌" },
    ],
    reqEyebrow: "Consent-Driven Matchmaking",
    reqTitle: "Dignified connection — Interest → consent-based contact sharing",
    reqSub: "Contact details may be shared after the other profile owner accepts, subject to privacy settings. Please verify details independently before making decisions.",
    reqAction: "💌 Requests",
    reqSteps: (free: number, p99: PlanStat) => [
      { i: "💌", t: "1. Send Interest (1 credit)", d: `Choose a matching profile and tap "Send Interest" — first ${free} requests are FREE, then ₹${p99.price} → ${p99.profiles} matches.` },
      { i: "📲", t: "2. Interest notification", d: `Your interest and profile details are sent through the available notification channel.` },
      { i: "✅", t: "3. Owner accepts → contact sharing", d: "Contact details may be shared after acceptance, subject to privacy settings. Verify details independently." },
      { i: "↩️", t: "4. Decline credit policy", d: "Declined requests are handled according to the credit-refund policy shown in your account." },
    ],
    reqChips: ["🚫 0 chatting", "🔒 Consent first", "↩️ Decline credit policy applies", "ℹ️ Verify details yourself"],
    priceStrip: (p: PlanStat, tag: string) => ({ p: `₹${p.price}`, n: `${p.profiles} requests`, s: tag }),
    priceTags: ["₹20/request — entry", "₹16.6/request — 12 requests", "₹12/request — 25 requests"],
    chEyebrow: "Channel network",
    chTitle: (total: number) => `${total} configured channel listings`,
    chSub: "Region + Religion + Caste + Special. Profile approval starts routing to relevant configured destinations; reachability is not checked.",
    chAction: (total: number) => `All ${total} channels`,
    flowTitle: "📢 Channel routing after profile approval",
    flow: [
      { t: "1. Your details", d: "5 easy steps + photo" },
      { t: "2. Matching destination selected", d: "Based on caste × state × occupation" },
      { t: "3. Route to configured channel", d: "Reachability depends on platform availability" },
      { t: "4. Notifications", d: "Availability and delivery timing depend on service configuration" },
    ],
    casteEyebrow: "Community channels",
    casteTitle: (n: number) => `${n} community channel listings`,
    casteSub: "This directory lists channel destinations; profile availability, routing and external access may vary.",
    casteAction: "See caste list",
    casteMore: (n: number) => `+ ${n} more community channel listings —`,
    casteFull: "see full list",
    spEyebrow: "Special respect",
    spTitle: "A separate space for everyone — with dignity",
    spSub: "2nd marriage, differently abled, 35+, govt jobs, doctors, NRI — a dedicated channel for each.",
    pricingEyebrow: "Pricing",
    pricingTitle: "Simple — ₹99 Sambandham",
    pricingSub: (free: number, p99: PlanStat, p199: PlanStat, p299: PlanStat, p499: PlanStat) =>
      `Register FREE. First ${free} interest requests FREE. Then ₹${p99.price} → ${p99.profiles} requests, ₹${p199.price} → ${p199.profiles}, ₹${p299.price} → ${p299.profiles}, ₹${p499.price} → ${p499.profiles}. Contact sharing follows acceptance; declines follow the refund policy in your account.`,
    planTags: ["Start here", "5 requests • ₹20/request", "12 requests • ₹17/request", "25 requests • ₹12/request", "50 requests • ₹10/request"],
    planNames: ["FREE", "Sambandham", "Family", "Premium", "VIP"],
    planCredits: (free: number, p99: PlanStat, p199: PlanStat, p299: PlanStat, p499: PlanStat) => [
      `First ${free} interest requests free`, `${p99.profiles} requests • 30 days`, `${p199.profiles} requests • 45 days`,
      `${p299.profiles} requests • 60 days`, `${p499.profiles} requests • 90 days`,
    ],
    planFeatures: [
      ["3 interest requests", "Notification availability depends on configuration", "Routing only to configured destinations after review", "Profile search", "Review optional privacy controls"],
      ["5 interest requests", "30-day credit validity", "Consent-based contact sharing", "Credit-refund policy as displayed"],
      ["12 interest requests", "45-day credit validity", "Any additional tools are listed separately", "No match or response guarantee"],
      ["25 interest requests", "60-day credit validity", "Who-viewed names while this plan is active", "Contact sharing requires owner acceptance"],
      ["50 interest requests", "90-day credit validity", "Who-viewed names while this plan is active", "Contact sharing requires owner acceptance"],
    ],
    planCtaFree: "Start FREE",
    planCtaPay: (price: string) => `Pay ${price} & start`,
    planSecure: "Payment options appear at checkout when configured; review the applicable refund policy",
    addonTitle: "🎁 Add-ons — extra value beyond credits",
    addonTag: "per-item • anytime",
    renewalLine: (r: { price: number; profiles: number }, b: { price: number; profiles: number }) =>
      `🔁 Renewal offer: existing customers ₹${r.price} → ${r.profiles} requests (first-time ₹99 → 5) • 🏢 Bureau plan: ₹${b.price}/30 days → ${b.profiles} request credits`,
    addonCta1: "Buy plans + add-ons →",
    addonCta2: "👀 See who viewed you",
    refTitle: "🏆 Referral Program",
    refSub: (per: number) => `A valid referral attachment grants +2 interest-request credits to the referrer and +1 to the new user (not cash). The referrer may qualify for ₹${per} once if the referee's first paid S_99/S_199/S_299/S_499 consumer plan costs at least ₹99. Add-ons, assisted services, boosts, gifts, renewals, complimentary grants and B2B/non-consumer payments are excluded.`,
    refCards: (per: number, ms: string) => [{ k: "Possible one-time reward", v: `₹${per}` }, { k: "25 qualifying rewards", v: `${ms} badge only` }, { k: "Payout", v: "Manual review • no fixed timing" }],
    refCta1: "My referral code →",
    refCta2: "🎁 Join now",
    burTitle: "🏢 Bureau / Broker B2B",
    burSub: "Already running a marriage bureau? Share our profiles + earn commission.",
    burName: (b: { label: string; price: number }) => `${b.label} — ₹${b.price}/mo`,
    burOpen: "B2B open",
    burDash: "Bureau dashboard →",
    faqEyebrow: "Questions",
    faqTitle: "Frequently asked — clear answers",
    ctaTitle: "Start now — it's FREE",
    ctaSub: (total: number, free: number, p99: PlanStat, p199: PlanStat, p299: PlanStat, p499: PlanStat) =>
      `Register FREE → profile review → routing to configured destinations (availability/delivery not guaranteed) → first ${free} interest requests FREE. Then ₹${p99.price} → ${p99.profiles}, ₹${p199.price} → ${p199.profiles}, ₹${p299.price} → ${p299.profiles}, ₹${p499.price} → ${p499.profiles}.`,
    ctaReg: "Register FREE",
    ctaBot: "Join on Telegram",
    vendorEyebrow: "Wedding Vendors",
    vendorTitle: "🏪 Everything for your wedding — one place",
    vendorSub: "Catering • Photography • Decorations • Function Hall • Tent House • Pandit • Jewellery • Makeup • DJ • Invitations • Cars • Planner. Directory listings are not business or identity verification; confirm details before booking.",
    vendorAll: "All 18 categories →",
    vendorPromoT: "Want to promote your business too? 🏪",
    vendorPromoS: (_total: number) => `From ₹149 — listing and promotional placements are subject to channel availability.`,
    vendorPromoC: "Advertise →",
    faq: (total: number, p99: PlanStat, p199: PlanStat, p299: PlanStat, p499: PlanStat) => [
      { q: "How much money to register?", a: `Registration is free and includes 3 interest requests. Then ₹${p99.price} for ${p99.profiles} requests, ₹${p199.price} for ${p199.profiles}, ₹${p299.price} for ${p299.profiles}, or ₹${p499.price} for ${p499.profiles}.` },
      { q: "Is there chatting? How do we talk?", a: `No in-app chat. Send "💌 Interest" (1 credit) to a profile you like. The owner can accept or decline. Contact details may be shared after acceptance, subject to privacy settings. Declined requests follow the credit-refund policy shown in your account.` },
      { q: "When is the number visible? Do you share directly?", a: "Contact details stay masked while an interest is pending and may be shared after the recipient accepts, subject to privacy settings. Consent-based sharing reduces exposure but cannot prevent all spam or fraud." },
      { q: "Is my photo visible in public?", a: "Photo privacy is an optional profile setting and is not enabled by default. Generated cards may include a watermark, but that does not prevent screenshots or copying. Review your privacy setting before uploading." },
      { q: "Which channels will my profile be posted to?", a: `Configured destinations may be selected based on profile details. Routing and external availability are not guaranteed; check the channel directory for listed destinations.` },
      { q: "Does it come on WhatsApp too?", a: "Notifications or channel posts may use configured WhatsApp destinations where available. Delivery is not guaranteed; check your account for current status." },
      { q: "What about fraud/fake profiles?", a: "Phone OTP, profile approval, photo review, and manual ID review are separate checks. DOB is member-provided, and no badge guarantees a genuine profile. Report suspicious conduct and verify details independently; response times may vary." },
    ],
  },
};

/** 📊 stat value — number ayithe count-up animation (suspense/attention) */
function StatValue({ value, countUp }: { value: string | number; countUp: boolean }) {
  const n = typeof value === "number" ? value : parseInt(String(value).replace(/\D/g, ""), 10) || 0;
  const animated = useCountUp(countUp ? n : 0, 900);
  if (!countUp || !n) return <>{value}</>;
  return <>{animated}</>;
}

export default function Home() {
  const { lang } = useLang();
  const channelDirectory = useChannelDirectoryLinks();
  const L = TEXT[lang as Lang];
  const te = lang === "te";
  const [hs, setHs] = useState<HomeStats>(FALLBACK);
  useEffect(() => {
    void apiGet<HomeStats>("/api/meta/home-stats").then(({ ok, data }) => { if (ok && data) setHs(data); });
  }, []);

  const p99 = planOf(hs, "S_99"), p199 = planOf(hs, "S_199"), p299 = planOf(hs, "S_299"), p499 = planOf(hs, "S_499");
  const bureau0 = hs.bureau[0] || FALLBACK.bureau[0];
  const ms25 = hs.referral.milestones.find((m) => m.paid === 25)?.title || "💎 PLATINUM Referrer";

  const [searchId, setSearchId] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const regionChannels: Channel[] = useMemo(() => ALL_CHANNELS.filter((c) => c.tier === "L1_REGION"), []);
  const religionChannels: Channel[] = useMemo(() => ALL_CHANNELS.filter((c) => c.tier === "L2_RELIGION"), []);
  const casteChannels: Channel[] = useMemo(
    () => ALL_CHANNELS.filter((c) => c.tier === "L3_CASTE").sort((a, b) =>
      channelCommunityLabel(a).localeCompare(channelCommunityLabel(b), "en", { sensitivity: "base" })
    ),
    []
  );
  const specialChannels: Channel[] = useMemo(() => ALL_CHANNELS.filter((c) => c.tier === "L4_SPECIAL"), []);
  const listedChannels = ALL_CHANNELS;


  const PLANS = [
    { name: L.planNames[0], price: "₹0", tag: L.planTags[0], credits: L.planCredits(hs.free_first, p99, p199, p299, p499)[0], features: (L.planFeatures[0] as string[]).map((f) => f.replace("channel network లో post", `${hs.channels_total} channel network`).replace("channel network", `${hs.channels_total} channels`)) },
    { name: L.planNames[1], price: `₹${p99.price}`, tag: L.planTags[1], credits: L.planCredits(hs.free_first, p99, p199, p299, p499)[1], features: L.planFeatures[1] as string[] },
    { name: L.planNames[2], price: `₹${p199.price}`, tag: L.planTags[2], popular: true, credits: L.planCredits(hs.free_first, p99, p199, p299, p499)[2], features: L.planFeatures[2] as string[] },
    { name: L.planNames[3], price: `₹${p299.price}`, tag: L.planTags[3], credits: L.planCredits(hs.free_first, p99, p199, p299, p499)[3], features: L.planFeatures[3] as string[] },
    { name: L.planNames[4], price: `₹${p499.price}`, tag: L.planTags[4], credits: L.planCredits(hs.free_first, p99, p199, p299, p499)[4], features: L.planFeatures[4] as string[] },
  ];

  const FAQS = L.faq(hs.channels_total, p99, p199, p299, p499);

  /* 🔎 JSON-LD — Google rich results (Organization + WebSite search + FAQ) */
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_CONFIG.siteUrl}/#org`,
        name: SITE_CONFIG.brandName,
        alternateName: SITE_CONFIG.legalName,
        url: SITE_CONFIG.siteUrl,
        logo: `${SITE_CONFIG.siteUrl}/icons/icon-512.png`,
        email: SITE_CONFIG.supportEmail,
        areaServed: ["Telangana", "Andhra Pradesh"],
        knowsLanguage: ["te", "en"],
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_CONFIG.siteUrl}/#site`,
        url: SITE_CONFIG.siteUrl,
        name: `${SITE_CONFIG.brandName} — Telugu Matrimony`,
        inLanguage: ["te", "en"],
        publisher: { "@id": `${SITE_CONFIG.siteUrl}/#org` },
        potentialAction: {
          "@type": "SearchAction",
          target: { "@type": "EntryPoint", urlTemplate: `${SITE_CONFIG.siteUrl}/search/{search_term_string}` },
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "FAQPage",
        mainEntity: FAQS.slice(0, 8).map((f: { q: string; a: string }) => ({
          "@type": "Question", name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ],
  };

  return (
    <div className="home-page bg-cream">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* ================= 🎬 CINEMATIC VIDEO HERO (top-matrimony feel) ================= */}
      <CinematicHero />

      {/* ================= 🔍 QUICK MATCH FINDER + LIVE PULSE ================= */}
      <section className="relative -mt-6 z-10 max-w-6xl mx-auto px-4">
        <HeroQuickSearch />
      </section>



      {/* Local promotional film and gallery are explicitly labeled as illustrative. */}
      <CinematicGallery />

      {/* ================= 🌟 PROFILES OF THE DAY (SPOTLIGHT) ================= */}
      <ProfilesOfTheDay />

      {/* ================= 🌸 NEXT-GEN TELUGU MATRIMONY STUDIOS & TOOLS ================= */}
      <section className="max-w-7xl mx-auto px-4 py-8">
        <Reveal>
          <div className="text-center max-w-3xl mx-auto mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gold/20 border border-gold/40 text-maroon text-xs font-bold mb-2">
              {lang === "te" ? "✨ తెలుగు వివాహ డిజిటల్ సాధనాలు" : "✨ Telugu wedding tools & studios"}
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-maroon">
              {lang === "te" ? "వివాహ ప్రయాణానికి అవసరమైన సమగ్ర సాధనాలు" : "Authentic Telugu Matrimony & Wedding Studios"}
            </h2>
            <p className="text-xs sm:text-sm text-gray-700 mt-2">
              {lang === "te"
                ? "లగ్న పత్రిక తయారీ నుండి సంబంధాల పోలిక, పెళ్లి చూపుల గైడ్ మరియు ఉచిత బయోడేటా వరకు ప్రతిదీ ఒకేచోట అందుబాటులో ఉంది."
                : "From royal Lagna Patrika creation and side-by-side match comparison to Pelli Choopulu etiquette and HD biodatas."}
            </p>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Card 1: Lagna Patrika */}
          <Reveal delay={50}>
            <Link
              href="/lagna-patrika"
              className="group block bg-white rounded-3xl p-6 shadow-md hover:shadow-xl border-2 border-gold/30 hover:border-maroon/60 transition duration-300 relative overflow-hidden"
            >
              <div className="text-3xl mb-3">📜</div>
              <div className="inline-block px-2.5 py-0.5 rounded-full bg-amber-100 text-maroon font-bold text-[10px] uppercase tracking-wider mb-2">
                {lang === "te" ? "4 సంప్రదాయ థీమ్స్ • HD JPG" : "4 traditional themes • HD JPG"}
              </div>
              <h3 className="text-lg font-bold text-maroon group-hover:text-maroon-dark">
                {lang === "te" ? "శుభ లగ్న పత్రిక స్టూడియో" : "Lagna Patrika Studio"}
              </h3>
              <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                {lang === "te"
                  ? "సంస్కృత శ్లోకాలు, ముహూర్తం వివరాలు, ఇరువైపుల పెద్దల పేర్లతో రాయల్ తెలుగు లగ్న పత్రిక ఉచితంగా తయారు చేసుకోండి."
                  : "Create a traditional Telugu Lagna Patrika with Sanskrit slokas; download or share it using options available on your device."}
              </p>
              <div className="mt-4 text-xs font-bold text-maroon flex items-center gap-1 group-hover:translate-x-1 transition">
                <span>{lang === "te" ? "లగ్న పత్రిక సృష్టించండి" : "Create a Lagna Patrika"}</span>
                <span>→</span>
              </div>
            </Link>
          </Reveal>

          {/* Card 2: Profile Compare Studio */}
          <Reveal delay={100}>
            <Link
              href="/compare"
              className="group block bg-white rounded-3xl p-6 shadow-md hover:shadow-xl border-2 border-gold/30 hover:border-maroon/60 transition duration-300 relative overflow-hidden"
            >
              <div className="text-3xl mb-3">⚖️</div>
              <div className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] uppercase tracking-wider mb-2">
                {lang === "te" ? "పక్కపక్కన పోలిక" : "Side-by-side comparison"}
              </div>
              <h3 className="text-lg font-bold text-maroon group-hover:text-maroon-dark">
                {lang === "te" ? "సంబంధాల పోలిక స్టూడియో" : "Profile Comparison Matrix"}
              </h3>
              <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                {lang === "te"
                  ? "2 లేదా 3 సంబంధాల ప్రొఫైల్ వివరాలను పక్కపక్కనే పరిశీలించి కుటుంబంతో షేర్ చేయండి. అందుబాటులో ఉన్న వివరాలు మాత్రమే పోల్చబడతాయి."
                  : "Compare up to three candidate profiles side by side across available details; share or download the comparison using your device options."}
              </p>
              <div className="mt-4 text-xs font-bold text-maroon flex items-center gap-1 group-hover:translate-x-1 transition">
                <span>{lang === "te" ? "సంబంధాలు పోల్చండి" : "Compare profiles"}</span>
                <span>→</span>
              </div>
            </Link>
          </Reveal>

          {/* Card 3: Pelli Choopulu Guide */}
          <Reveal delay={150}>
            <Link
              href="/pelli-choopulu"
              className="group block bg-white rounded-3xl p-6 shadow-md hover:shadow-xl border-2 border-gold/30 hover:border-maroon/60 transition duration-300 relative overflow-hidden"
            >
              <div className="text-3xl mb-3">☕</div>
              <div className="inline-block px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-[10px] uppercase tracking-wider mb-2">
                {lang === "te" ? "ఆచారాలు & ప్రశ్నలు" : "Traditions & questions"}
              </div>
              <h3 className="text-lg font-bold text-maroon group-hover:text-maroon-dark">
                {lang === "te" ? "పెళ్లి చూపుల సమగ్ర గైడ్" : "Pelli Choopulu Etiquette Guide"}
              </h3>
              <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                {lang === "te"
                  ? "పెళ్లి చూపుల సాంప్రదాయ మర్యాదలు, పెద్దల చెక్‌లిస్ట్, అభ్యర్థుల ప్రైవేట్ 1-on-1 సంభాషణ ప్రశ్నలు మరియు సలహాలు."
                  : "Traditional Telugu Pelli Choopulu protocols, hospitality tips, parent talking points, and candidate 1-on-1 questions."}
              </p>
              <div className="mt-4 text-xs font-bold text-maroon flex items-center gap-1 group-hover:translate-x-1 transition">
                <span>{lang === "te" ? "గైడ్ చదవండి" : "Read the guide"}</span>
                <span>→</span>
              </div>
            </Link>
          </Reveal>

          {/* Card 4: Biodata Maker */}
          <Reveal delay={200}>
            <Link
              href="/biodata"
              className="group block bg-white rounded-3xl p-6 shadow-md hover:shadow-xl border-2 border-gold/30 hover:border-maroon/60 transition duration-300 relative overflow-hidden"
            >
              <div className="text-3xl mb-3">🎴</div>
              <div className="inline-block px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 font-bold text-[10px] uppercase tracking-wider mb-2">
                {lang === "te" ? "1 నిమిషంలో • ఉచిత HD JPG" : "Free HD JPG in about 1 minute"}
              </div>
              <h3 className="text-lg font-bold text-maroon group-hover:text-maroon-dark">
                {lang === "te" ? "తెలుగు బయోడేటా మేకర్" : "Telugu Marriage Biodata Studio"}
              </h3>
              <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                {lang === "te"
                  ? "సులభంగా మీ జాతకం, కుటుంబ వివరాలు, ఫోటోతో కూడిన HD వివాహ బయోడేటా కార్డ్ తయారు చేసుకోండి."
                  : "Create a Telugu biodata card with an optional profile QR; download it or share it using options available on your device."}
              </p>
              <div className="mt-4 text-xs font-bold text-maroon flex items-center gap-1 group-hover:translate-x-1 transition">
                <span>{lang === "te" ? "బయోడేటా రూపొందించండి" : "Create a biodata"}</span>
                <span>→</span>
              </div>
            </Link>
          </Reveal>

          {/* Card 5: TS & AP Districts Hub */}
          <Reveal delay={250}>
            <Link
              href="/districts"
              className="group block bg-white rounded-3xl p-6 shadow-md hover:shadow-xl border-2 border-gold/30 hover:border-maroon/60 transition duration-300 relative overflow-hidden"
            >
              <div className="text-3xl mb-3">🏛️</div>
              <div className="inline-block px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold text-[10px] uppercase tracking-wider mb-2">
                {lang === "te" ? `TS & AP లో ${DISTRICT_OPTIONS_COUNT} జిల్లాలు` : `${DISTRICT_OPTIONS_COUNT} districts • TS & AP`}
              </div>
              <h3 className="text-lg font-bold text-maroon group-hover:text-maroon-dark">
                {lang === "te" ? "జిల్లా సమగ్ర సంబంధాల హబ్" : "TS & AP Districts Hub"}
              </h3>
              <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                {lang === "te"
                  ? `హైదరాబాద్, విజయవాడ, వైజాగ్, వరంగల్ సహా రెండు తెలుగు రాష్ట్రాల ${DISTRICT_OPTIONS_COUNT} జిల్లాల సంబంధాలను నేరుగా వెతకండి.`
                  : "Browse profiles across Telangana and Andhra Pradesh, with district filters to narrow your search."}
              </p>
              <div className="mt-4 text-xs font-bold text-maroon flex items-center gap-1 group-hover:translate-x-1 transition">
                <span>{lang === "te" ? "జిల్లాల వారీగా చూడండి" : "Browse by district"}</span>
                <span>→</span>
              </div>
            </Link>
          </Reveal>

          {/* Card 6: Muhurtham Calendar */}
          <Reveal delay={300}>
            <Link
              href="/muhurtham"
              className="group block bg-white rounded-3xl p-6 shadow-md hover:shadow-xl border-2 border-gold/30 hover:border-maroon/60 transition duration-300 relative overflow-hidden"
            >
              <div className="text-3xl mb-3">🗓️</div>
              <div className="inline-block px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold text-[10px] uppercase tracking-wider mb-2">
                {lang === "te" ? "2026–2027 పంచాంగం" : "2026–2027 Panchangam"}
              </div>
              <h3 className="text-lg font-bold text-maroon group-hover:text-maroon-dark">
                {lang === "te" ? "వివాహ శుభ ముహూర్తాలు" : "Vivaha Muhurtham Calendar"}
              </h3>
              <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                {lang === "te"
                  ? "తెలుగు సంవత్సరం మరియు మాసాల వారీగా సుముహూర్తాలు, తిథి, నక్షత్రాలు, లగ్న వివరాలు ఒకేచోట చూడండి."
                  : "Explore auspicious Telugu marriage dates, thithi, nakshatram, and lagna timings for 2026-2027."}
              </p>
              <div className="mt-4 text-xs font-bold text-maroon flex items-center gap-1 group-hover:translate-x-1 transition">
                <span>{lang === "te" ? "ముహూర్తాలు చూడండి" : "View auspicious dates"}</span>
                <span>→</span>
              </div>
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ================= 💎 WHY CHOOSE US (premium trust band) ================= */}
      <WhyChooseUs />

      {/* ================= STATS (LIVE) ================= */}
      <section className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { v: hs.channels_total, l: L.statChannels, s: L.statChannelsSub(hs.channels_by_tier), num: true },
            { v: hs.castes_covered, l: L.statCastes, s: L.statCastesSub, num: true },
            { v: L.statChat, l: L.statChatT, s: L.statChatS, num: false },
            { v: L.statPrice(p99), l: L.statPriceL(p199, p299), s: L.statPriceS(hs.free_first), num: false },
          ].map((s, i) => (
            <Reveal key={s.l} delay={i * 80}>
              <div className="bg-white rounded-2xl p-4 card-shadow border border-gold/20 h-full">
                <div className="text-2xl md:text-3xl font-bold text-maroon"><StatValue value={s.v} countUp={s.num} /></div>
                <div className="text-[13px] font-bold text-ink mt-1">{s.l}</div>
                <div className="text-[11px] text-gray-500 mt-0.5">{s.s}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ================= HOW IT WORKS ================= */}
      <section className="max-w-7xl mx-auto px-4 py-8">
        <Reveal>
          <SectionHeading
            eyebrow={L.howEyebrow}
            title={L.howTitle}
            subtitle={L.howSub}
            telugu={lang === "te"}
          />
        </Reveal>
        <div className="mt-6 grid md:grid-cols-4 gap-4">
          {L.howSteps(hs.channels_total).map((s, i) => (
            <Reveal key={s.n} delay={i * 90}>
              <div className="relative bg-white rounded-2xl p-5 card-shadow border border-gold/20 h-full hover-lift">
                <div className="text-3xl" aria-hidden>{s.icon}</div>
                <div className="mt-2 text-[11px] font-bold text-gold-deep tracking-widest">{te ? "దశ" : "STEP"} {s.n}</div>
                <div className="font-bold text-maroon text-[15px] mt-1">{s.t}</div>
                <div className="text-[12px] text-gray-600 mt-1.5 leading-relaxed">{s.d}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ================= REQUEST MODEL (CHATTING LEDU) ================= */}
      <section className="max-w-7xl mx-auto px-4 py-8">
        <div className="rounded-3xl cream-gradient border border-gold/30 p-5 md:p-8">
          <Reveal>
            <SectionHeading
              eyebrow={L.reqEyebrow}
              title={L.reqTitle}
              subtitle={L.reqSub}
              telugu={lang === "te"}
              action={{ href: "/requests", label: L.reqAction }}
            />
          </Reveal>

          <div className="mt-6 grid md:grid-cols-2 gap-5 items-start">
            {/* LEFT: 4 steps */}
            <div className="space-y-3">
              {L.reqSteps(hs.free_first, p99).map((x, i) => (
                <Reveal key={x.t} delay={i * 80}>
                  <div className="bg-white rounded-2xl p-4 card-shadow border border-gold/20 flex gap-3 hover-lift">
                    <div className="text-2xl leading-none" aria-hidden>{x.i}</div>
                    <div>
                      <div className="font-bold text-maroon text-[14px]">{x.t}</div>
                      <div className="text-[12px] text-gray-600 mt-1 leading-relaxed">{x.d}</div>
                    </div>
                  </div>
                </Reveal>
              ))}
              <Reveal delay={320}>
                <div className="flex flex-wrap gap-2 text-[11px] font-bold">
                  {L.reqChips.map((chip, i) => (
                    <span key={chip} className={`px-3 py-1 rounded-full ${i === 0 ? "bg-maroon text-white" : i === 3 ? "bg-gold text-maroon" : "bg-white text-maroon border border-maroon/30"}`}>{chip}</span>
                  ))}
                </div>
              </Reveal>
            </div>

            {/* RIGHT: illustrative notification preview; not proof of delivery */}
            <Reveal delay={140}>
              <div className="rounded-3xl overflow-hidden card-shadow-lg border border-black/10 bg-[#0b141a]">
                <div className="bg-[#202c33] px-4 py-3 flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={SITE_CONFIG.logoImage} alt="మన వివాహ" width={36} height={36} className="w-9 h-9 rounded-full object-cover shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-white text-[13px] font-bold truncate telugu">మన వివాహ</div>
                    <div className="text-[10px] text-emerald-300 truncate">{te ? "నమూనా notification preview" : "Sample notification preview"}</div>
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-1">
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/10 text-gray-300 font-bold whitespace-nowrap">{te ? "నమూనా" : "Sample"}</span>
                    <span className="text-[9px] text-gray-400 whitespace-nowrap">{te ? "ఉదాహరణ మాత్రమే" : "illustrative only"}</span>
                  </div>
                </div>
                <div className="p-3 space-y-2 dotted-bg">
                  <div className="bg-[#005c4b] text-white text-[12px] rounded-xl rounded-tl-sm p-3 leading-relaxed max-w-[95%]">
                    <div className="font-bold">{te ? "💌 MANA VIVAHA — Interest notification ఉదాహరణ" : "💌 MANA VIVAHA — illustrative interest notification"}</div>
                    <div className="opacity-90 mt-1">{te ? "Interest request వివరాలు service configuration మీద ఆధారపడతాయి; ఇది sample layout మాత్రమే." : "Interest notification details depend on service configuration; this is a sample layout only."}</div>
                    <div className="mt-2 pl-1 border-l-2 border-white/30">
                      👤 <b>{te ? "సభ్యుల వివరాలు" : "Member details"}</b><br />
                      🎓 {te ? "ప్రొఫైల్‌లో అందించిన వివరాలు మాత్రమే" : "Only details supplied in the profile"}<br />
                      📍 {te ? "అందుబాటులో ఉన్న సమాచారం మాత్రమే" : "Only information made available"}<br />
                      ⭐ {te ? "సరిపోలిక విశ్లేషణ ఉంటే మాత్రమే" : "Match insights only when available"}
                    </div>
                    <div className="mt-2 opacity-90">{te ? "✅ Accept చేస్తే, privacy settings ప్రకారం contact వివరాలు share కావచ్చు." : "✅ If accepted, contact details may be shared according to privacy settings."}</div>
                    <div className="text-[10px] opacity-70 mt-2 text-right">{te ? "ప్రివ్యూ" : "Preview"}</div>
                  </div>
                  <div className="bg-[#202c33] text-white text-[12px] rounded-xl p-3 max-w-[80%]">
{te ? "ప్రొఫైల్ కార్డ్ ఉదాహరణ 🎴" : "Illustrative profile-card preview 🎴"}
                    <div className="text-[10px] opacity-70 mt-1">{te ? "వాస్తవ నోటిఫికేషన్ కాదు" : "Not an actual delivery"}</div>
                  </div>
                  <div className="flex gap-2 pt-1" aria-hidden="true">
                    <span className="flex-1 rounded-xl bg-emerald-600 py-2 text-center text-[12px] font-bold text-white">✅ {te ? "అంగీకరించండి" : "Accept"}</span>
                    <span className="flex-1 rounded-xl bg-white/10 py-2 text-center text-[12px] font-bold text-white">❌ {te ? "తిరస్కరించండి" : "Decline"}</span>
                  </div>
                  <div className="text-[10px] text-gray-400 text-center pt-1">
                    ℹ️ {te ? "నోటిఫికేషన్ delivery హామీ కాదు; contact sharing privacy settings పై ఆధారపడుతుంది." : "Notification delivery is not guaranteed; contact sharing depends on privacy settings."}
                  </div>
                </div>
              </div>
            </Reveal>
          </div>

          {/* Pricing strip (LIVE) */}
          <div className="mt-6 grid grid-cols-3 gap-3">
            {[L.priceStrip(p99, L.priceTags[0]), L.priceStrip(p199, L.priceTags[1]), L.priceStrip(p299, L.priceTags[2])].map((x, i) => (
              <Reveal key={x.p} delay={i * 70}>
                <div className="bg-white rounded-2xl p-3 text-center card-shadow border border-gold/25">
                  <div className="text-xl font-bold text-maroon">{x.p}</div>
                  <div className="text-[12px] font-bold text-ink">{x.n}</div>
                  <div className="text-[10px] text-gray-500">{x.s}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ================= CHANNELS: REGION + RELIGION ================= */}
      <section className="max-w-7xl mx-auto px-4 py-8">
        <Reveal>
          <SectionHeading
            eyebrow={L.chEyebrow}
            title={L.chTitle(hs.channels_total)}
            subtitle={L.chSub}
            telugu={lang === "te"}
            action={{ href: "/channels", label: L.chAction(hs.channels_total) }}
          />
        </Reveal>

        <div className="mt-5 grid grid-cols-1 min-[420px]:grid-cols-2 md:grid-cols-5 gap-3">
          {[...regionChannels, ...religionChannels].slice(0, 10).map((ch, i) => {
            const destinations = resolveChannelLinks(ch, channelDirectory);
            return (
              <Reveal key={ch.key} delay={i * 50}>
                <article
                  className={`flex h-full min-h-[154px] flex-col justify-between rounded-2xl p-3.5 text-white shadow-[0_12px_30px_rgba(44,8,25,.18)] ring-1 ring-white/15 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(44,8,25,.24)] ${
                    ch.tier === "L2_RELIGION" ? "navy-gradient" : "maroon-gradient"
                  }`}
                >
                  <div>
                    <div className="flex items-start gap-2.5">
                      <Image
                        src={SITE_CONFIG.logoImage}
                        alt=""
                        width={36}
                        height={36}
                        sizes="36px"
                        className="h-9 w-9 shrink-0 rounded-xl border border-white/40 bg-white object-cover shadow-sm"
                      />
                      <div className="min-w-0">
                        <div className="text-[9px] font-extrabold uppercase tracking-[.16em] text-amber-200">Mana Vivaha</div>
                        <div className="mt-0.5 break-words text-[13px] font-bold leading-tight">{ch.name}</div>
                      </div>
                    </div>
                    <div className="mt-2 text-[10px] leading-relaxed text-white/75">
                      {lang === "te" ? "నమోదు చేసిన channel link • availability తనిఖీ చేయలేదు" : "Listed channel link • availability not checked"}
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-white/20 pt-2">
                    {destinations.telegram && (
                      <a
                        href={destinations.telegram}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={te ? `${ch.name} Telegram లిస్టింగ్ తెరవండి` : `Open the listed Telegram destination for ${ch.name}`}
                        className="inline-flex min-h-8 flex-1 items-center justify-center gap-1 rounded-xl bg-[#229ED9] px-2 py-1.5 text-[10px] font-bold text-white shadow-soft transition hover:brightness-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                        title={te ? "బాహ్య Telegram link; availability తనిఖీ చేయబడదు" : "External Telegram link; availability is not checked"}
                      >
                        <TelegramIcon className="h-3 w-3" mono />
                        <span>Telegram</span>
                      </a>
                    )}
                    {destinations.whatsapp ? (
                      <a
                        href={destinations.whatsapp}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={destinations.whatsappIsDirect
                          ? (te ? `${ch.name} WhatsApp channel తెరవండి` : `Open the listed WhatsApp channel for ${ch.name}`)
                          : (te ? `${ch.name} గురించి WhatsApp support ని అడగండి` : `Ask WhatsApp support about ${ch.name}`)}
                        className="inline-flex min-h-8 flex-1 items-center justify-center gap-1 rounded-xl bg-[#0b7d46] px-2 py-1.5 text-[10px] font-bold text-white shadow-soft transition hover:brightness-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                        title={te ? "బాహ్య WhatsApp link; availability తనిఖీ చేయబడదు" : "External WhatsApp link; availability is not checked"}
                      >
                        <WhatsAppIcon className="h-3 w-3" mono />
                        <span>{destinations.whatsappIsDirect ? "WhatsApp" : (te ? "సహాయం" : "Support")}</span>
                      </a>
                    ) : (
                      <span
                        className="inline-flex min-h-8 flex-1 items-center justify-center gap-1 rounded-xl border border-white/20 bg-white/10 px-2 py-1.5 text-[9px] font-semibold text-white/70"
                        title={te ? "ఈ destination కోసం WhatsApp link ఇవ్వలేదు" : "No WhatsApp invite or support contact is configured for this destination"}
                      >
                        <WhatsAppIcon className="h-3 w-3" mono />
                        <span>{te ? "లింక్ లేదు" : "No WA link"}</span>
                      </span>
                    )}
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>

        {/* Channel post flow explainer */}
        <Reveal>
          <div className="mt-5 bg-white rounded-2xl p-5 card-shadow border border-gold/25">
            <div className="font-bold text-maroon text-[15px]">{L.flowTitle}</div>
            <div className="mt-3 grid md:grid-cols-4 gap-3 text-[12px]">
              {L.flow.map((f) => (
                <div key={f.t} className="bg-cream rounded-xl p-3">
                  <div className="font-bold text-maroon">{f.t}</div>
                  <div className="text-gray-600 mt-1">{f.d}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 bg-navy text-white rounded-xl p-3 text-[11px]">
              {te
                ? <>ఉదా: Reddy + TS + Software job → <span className="text-gold font-bold">TS Bride/Groom + Reddy + Software</span> destinations కు routing ఎంపిక కావచ్చు; configuration/availability పై ఆధారపడి ఉంటుంది</>
                : <>e.g. Reddy + TS + Software job → routing may select <span className="text-gold font-bold">TS Bride/Groom + Reddy + Software</span> destinations, subject to configuration and availability</>}
            </div>
          </div>
        </Reveal>
      </section>

      {/* ================= CASTES ================= */}
      <section className="max-w-7xl mx-auto px-4 py-8">
        <Reveal>
          <SectionHeading
            eyebrow={L.casteEyebrow}
            title={L.casteTitle(hs.channels_by_tier.L3_CASTE ?? CHANNEL_STATS.by_tier.L3_CASTE)}
            subtitle={L.casteSub}
            telugu={lang === "te"}
            action={{ href: "/castes", label: L.casteAction }}
          />
        </Reveal>
        <div className="mt-5 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {casteChannels.slice(0, 24).map((c, i) => {
            const cleanName = channelCommunityLabel(c);
            return (
              <Reveal key={c.key} delay={i * 20}>
                <Link
                  href={`/matches?caste=${encodeURIComponent(cleanName.split("•")[0].trim())}`}
                  className="block bg-white rounded-2xl p-3.5 border border-gold/25 hover:border-gold hover-lift h-full shadow-sm transition"
                >
                  <div className="flex items-start justify-between gap-1">
                    <div className="text-[13px] font-bold text-[#7A0C2E] leading-tight">
                      {cleanName}
                    </div>
                  </div>
                  <div className="text-[10px] text-emerald-700 font-bold mt-2 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {lang === "te" ? "చానల్ directory లో listed" : "Listed in channel directory"}
                  </div>
                </Link>
              </Reveal>
            );
          })}
        </div>
        <div className="mt-4 text-[13px] text-gray-700 flex items-center justify-between flex-wrap gap-2">
          <span>{L.casteMore(Math.max(0, casteChannels.length - 24))}</span>
          <Link href="/castes" className="font-extrabold text-[#7A0C2E] underline underline-offset-4 hover:text-[#9B1138]">
            {L.casteFull} →
          </Link>
        </div>
      </section>

      {/* ================= SPECIAL CATEGORIES ================= */}
      <section className="max-w-7xl mx-auto px-4 py-8">
        <Reveal>
          <SectionHeading
            eyebrow={L.spEyebrow}
            title={L.spTitle}
            subtitle={L.spSub}
            telugu={lang === "te"}
          />
        </Reveal>
        <div className="mt-5 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {specialChannels.map((sp, i) => (
            <Reveal key={sp.key} delay={i * 40}>
              <Link
                href="/channels?tier=L4_SPECIAL"
                className="block bg-white rounded-2xl p-4 card-shadow border border-gold/20 h-full hover-lift"
              >
                <div className="text-xl" aria-hidden>{sp.name.split(" ")[0]}</div>
                <div className="font-bold text-[13px] text-maroon mt-1.5">
                  {sp.name.replace(/^[^\s]+\s/, "")}
                </div>
                <div className="text-[11px] text-gray-600 mt-1 line-clamp-2">{sp.desc}</div>
                <div className="text-[10px] mt-2 font-bold text-emerald-700">
                  {lang === "te" ? "ఛానల్ డైరెక్టరీ" : "Channel directory"}
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ================= 🪔 TRADITIONAL LAGNA PATRIKA STUDIO ================= */}
      <section className="max-w-7xl mx-auto px-4 py-6">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#FFFDF0] via-[#FFF9D6] to-[#FFE6A7] border-2 border-gold/40 p-6 sm:p-10 shadow-xl">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              <div className="md:col-span-8 space-y-3">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-maroon/10 border border-maroon/30 text-maroon text-xs font-bold">
                  <span>🪔</span>
                  <span>{te ? "ఉచిత డిజిటల్ లగ్న పత్రిక స్టూడియో" : "100% Free Traditional Lagna Patrika"}</span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-maroon">
                  {te ? "💍 శుభ లగ్న పత్రికను 1 నిమిషంలో తయారుచేసుకోండి" : "Generate Auspicious Lagna Patrika in 1 Minute"}
                </h3>
                <p className="text-xs sm:text-sm text-gray-700 leading-relaxed max-w-xl">
                  {te
                    ? "పెళ్లి కుదిరిన జంటల కొరకు వేద మంత్రాలు, శుభ ముహూర్తం, రాశి-నక్షత్రం మరియు వేదిక వివరాలతో కూడిన సాంప్రదాయ ఆహ్వాన పత్రిక. మీ device లో అందుబాటులో ఉన్న share options తో పంచుకోండి."
                    : "Create a Telugu Lagna Patrika with Sanskrit slokas and muhurtham details; download or share it using options available on your device."}
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <Link
                    href="/lagna-patrika"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-maroon hover:bg-maroon-dark text-white rounded-full text-xs font-bold shadow-lg hover-lift transition"
                  >
                    <span>📜 {te ? "లగ్న పత్రిక తయారుచేయండి" : "Open Lagna Patrika Studio"}</span>
                  </Link>
                  <Link
                    href="/biodata"
                    className="inline-flex items-center gap-2 px-5 py-3 bg-white/90 hover:bg-white border border-gold/40 text-maroon rounded-full text-xs font-bold shadow-sm transition"
                  >
                    <span>🎴 {te ? "ఉచిత వివాహ బయోడేటా" : "Free Biodata Maker"}</span>
                  </Link>
                </div>
              </div>

              <div className="md:col-span-4 text-center">
                <div className="inline-block p-4 bg-white/90 rounded-2xl shadow-lg border border-gold/40 transform md:rotate-2 hover:rotate-0 transition duration-300">
                  <div className="text-3xl mb-1">🪔 📜 💍</div>
                  <div className="text-sm font-extrabold text-maroon">{te ? "॥ శ్రీరస్తు • శుభమస్తు ॥" : "Auspicious beginnings"}</div>
                  <div className="text-[11px] text-gray-600 mt-1">{te ? "4 సంప్రదాయ గోల్డ్ థీమ్స్ • HD డౌన్‌లోడ్" : "4 traditional gold themes • HD download"}</div>
                  <div className="mt-3 px-3 py-1 bg-gold/20 text-maroon rounded-full text-[10px] font-bold">
                    {te ? "మీ device లో share చేయండి" : "Share using your device options"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ================= 💐 REAL WEDDINGS FILM REEL & STORIES ================= */}

      {/* ================= SPONSORED PROMO & FESTIVAL OFFERS ================= */}
      <section className="max-w-7xl mx-auto px-4 py-2">
        <OffersBanner />
      </section>

      {/* ================= 🏪 WEDDING SERVICES & VERIFIED VENDORS (VendorStrip /api/vendors/ads) ================= */}
      <HomeVendorsShowcase />

      {/* ================= PRICING ================= */}
      {SITE_CONFIG.features.showPricing && (
      <section className="max-w-7xl mx-auto px-4 py-8">
        <Reveal>
          <SectionHeading
            eyebrow={L.pricingEyebrow}
            title={L.pricingTitle}
            subtitle={L.pricingSub(hs.free_first, p99, p199, p299, p499)}
            telugu={lang === "te"}
            align="center"
          />
        </Reveal>
        <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {PLANS.map((p, i) => (
            <Reveal key={p.name} delay={i * 90}>
              <div
                className={`relative rounded-3xl p-5 h-full ${
                  (p as { popular?: boolean }).popular
                    ? "bg-white border-2 border-gold card-shadow-lg"
                    : "bg-white border border-gold/20 card-shadow"
                }`}
              >
                {(p as { popular?: boolean }).popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] gold-gradient text-maroon px-3 py-1 rounded-full font-bold shadow-gold">
                    {te ? "ప్రజాదరణ" : "POPULAR"}
                  </div>
                )}
                <div className="text-[11px] font-bold text-gold-deep tracking-widest uppercase">{p.tag}</div>
                <div className="font-bold text-maroon text-lg mt-1">{p.name}</div>
                <div className="mt-2 flex items-end gap-1">
                  <span className="text-3xl font-bold text-maroon">{p.price}</span>
                  <span className="text-[11px] text-gray-500 mb-1">{te ? "ఒక్కసారి" : "one-time"}</span>
                </div>
                <div className="text-[11px] text-gray-600 mt-1">{p.credits}</div>
                <div className="mt-3 space-y-1.5">
                  {p.features.map((f) => (
                    <div key={f} className="text-[12px] flex gap-2">
                      <span className="text-green-600 font-bold">✓</span>
                      <span className="text-gray-700">{f}</span>
                    </div>
                  ))}
                </div>
                <Link
                  href="/register"
                  className={`block text-center mt-4 py-3 rounded-full text-[13px] font-bold ${
                    (p as { popular?: boolean }).popular ? "gold-gradient text-maroon" : "maroon-gradient text-white"
                  }`}
                >
                  {p.price === "₹0" ? L.planCtaFree : L.planCtaPay(p.price)}
                </Link>
                <div className="mt-2 text-[10px] text-center text-gray-400">{L.planSecure}</div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* 🎁 ADD-ONS */}
        <Reveal delay={120}>
          <div className="mt-6 rounded-3xl bg-white border border-gold/30 card-shadow p-5">
            <div className="flex flex-wrap items-center gap-2">
              <div className="font-bold text-maroon">{L.addonTitle}</div>
              <span className="text-[10px] font-bold bg-cream border border-gold/40 px-2 py-0.5 rounded-full">{L.addonTag}</span>
            </div>
            <div className="mt-3 grid grid-cols-1 min-[420px]:grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { p: "₹49", t: lang === "te" ? "ప్రొఫైల్ బూస్ట్" : "Profile Boost", d: lang === "te" ? "1 రోజు బూస్ట్; చూపించే స్థానం configuration పై ఆధారపడుతుంది" : "1-day boost; placement depends on configuration" },
                { p: "₹49", t: lang === "te" ? "నా ప్రొఫైల్‌ను చూసినవారు" : "Who viewed me", d: lang === "te" ? "అర్హత సదుపాయం active ఉన్నప్పుడు 30 రోజులు" : "30 days when the entitlement is active" },
                { p: "₹199", t: lang === "te" ? "ఫోటో సమీక్ష అభ్యర్థన" : "Manual photo review request", d: lang === "te" ? "మాన్యువల్ సమీక్ష అభ్యర్థన మాత్రమే; స్వయంచాలక ధృవీకరణ కాదు" : "A manual review request only; it does not automatically verify a profile" },
              ].map((a) => (
                <div key={a.t} className="rounded-2xl bg-cream border border-gold/25 p-3">
                  <div className="text-lg font-bold text-maroon">{a.p}</div>
                  <div className="text-[12px] font-bold text-ink">{a.t}</div>
                  <div className="text-[10px] text-gray-600">{a.d}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 text-[11px] text-gray-600">
              {L.renewalLine(hs.renewal, bureau0)}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href="/requests" className="text-[12px] font-bold maroon-gradient text-white px-4 py-2 rounded-full">{L.addonCta1}</Link>
              <Link href="/requests" className="text-[12px] font-bold border border-maroon/30 text-maroon px-4 py-2 rounded-full">{L.addonCta2}</Link>
            </div>
          </div>
        </Reveal>
      </section>
      )}

      {/* ================= REFERRAL + BUREAU ================= */}
      <section className="max-w-7xl mx-auto px-4 py-8 grid md:grid-cols-2 gap-5">
        <Reveal>
          <div className="bg-white rounded-3xl p-6 card-shadow border border-gold/20 h-full">
            <div className="font-bold text-maroon text-[16px]">{L.refTitle}</div>
            <div className="text-[12px] text-gray-600 mt-1.5 telugu">
              {L.refSub(hs.referral.per_pay)}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2.5 text-center">
              {L.refCards(hs.referral.per_pay, ms25).map((x) => (
                <div key={x.k} className="bg-cream rounded-xl p-3">
                  <div className="font-bold text-maroon text-[15px]">{x.v}</div>
                  <div className="text-[10px] text-gray-500 mt-0.5">{x.k}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <Link href="/referral" className="px-4 py-2.5 maroon-gradient text-white rounded-full text-[12px] font-bold">
                {L.refCta1}
              </Link>
              <Link href="/referral/register" className="px-4 py-2.5 border border-gold text-maroon rounded-full text-[12px] font-bold">
                {L.refCta2}
              </Link>
            </div>
          </div>
        </Reveal>

        <Reveal delay={100}>
          <div className="navy-gradient rounded-3xl p-6 text-white h-full">
            <div className="font-bold text-gold text-[16px]">{L.burTitle}</div>
            <div className="text-[12px] opacity-85 mt-1.5 telugu">
              {L.burSub}
            </div>
            <div className="mt-4 bg-white/10 rounded-2xl p-4">
              <div className="font-bold text-[15px]">{L.burName(bureau0)}</div>
              <div className="text-[12px] opacity-85 mt-1.5 space-y-1">
                {bureau0.perks.map((perk) => (
                  <div key={perk}>✓ {perk}</div>
                ))}
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/bureau" className="px-4 py-2.5 bg-white text-navy rounded-full text-[12px] font-bold">
                {L.burDash}
              </Link>
              <span className="px-4 py-2.5 bg-gold text-navy rounded-full text-[12px] font-bold">
                {L.burOpen}
              </span>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ================= FAQ ================= */}
      {SITE_CONFIG.features.showFaq && (
      <section className="max-w-4xl mx-auto px-4 py-8">
        <Reveal>
          <SectionHeading
            eyebrow={L.faqEyebrow}
            title={L.faqTitle}
            align="center"
          />
        </Reveal>
        <div className="mt-6 space-y-3">
          {FAQS.map((f, i) => (
            <Reveal key={f.q} delay={i * 40}>
              <div className="bg-white rounded-2xl border border-gold/20 card-shadow overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  aria-expanded={openFaq === i}
                  className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left focus-brand"
                >
                  <span className="font-bold text-[13.5px] text-maroon">{f.q}</span>
                  <span
                    className={`w-7 h-7 shrink-0 rounded-full maroon-gradient text-white flex items-center justify-center text-sm transition-transform ${
                      openFaq === i ? "rotate-45" : ""
                    }`}
                    aria-hidden
                  >
                    +
                  </span>
                </button>
                <div className={`faq-body px-5 ${openFaq === i ? "open" : ""}`}>
                  <div className="pb-4 text-[12.5px] text-gray-700 leading-relaxed telugu">{f.a}</div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>
      )}

      {/* ================= FINAL CTA ================= */}
      <section className="max-w-7xl mx-auto px-4 py-10">
        <Reveal>
          <div className="maroon-gradient rounded-[2rem] p-8 md:p-10 text-white relative overflow-hidden">
            <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-gold/20 blur-3xl" />
            <div className="relative md:flex items-center justify-between gap-6">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold leading-snug">
                  {L.ctaTitle}
                </h2>
                <p className="mt-2 text-[13px] opacity-90 telugu max-w-xl">
                  {L.ctaSub(hs.channels_total, hs.free_first, p99, p199, p299, p499)}
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link
                    href="/register"
                    className="px-6 py-3.5 rounded-full gold-gradient text-maroon text-sm font-bold shadow-gold"
                  >
                    🚀 {L.ctaReg}
                  </Link>
                  <a
                    href={BOT}
                    target="_blank"
                    rel="noreferrer"
                    className="px-6 py-3.5 rounded-full bg-white/15 border border-white/30 text-white text-sm font-bold"
                  >
                    ✈️ {L.ctaBot}
                  </a>
                </div>
              </div>
              <div className="mt-6 md:mt-0 text-center shrink-0">
                <div className="text-[11px] opacity-80">{te ? "ID ద్వారా వెతకండి" : "Profile ID search"}</div>
                <div className="font-mono text-gold text-lg">{SITE_CONFIG.domain}/search</div>
                <div className="text-[11px] opacity-80 mt-2">{te ? "టెలిగ్రామ్ ఛానల్" : "Telegram channel"}</div>
                <div className="font-mono text-gold text-lg">{SITE_CONFIG.officialChannel}</div>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    <section aria-label={te ? "భద్రత మరియు గోప్యత" : "Safety and privacy"} className="max-w-7xl mx-auto px-4 py-8">
      <SectionHeading
        title={te ? "🛡️ మీ భద్రత, మీ నిర్ణయం" : "🛡️ Your safety, your decision"}
        subtitle={te ? "ఏ verification check ఏమి చెబుతుందో తెలుసుకోండి; profile వివరాలను స్వతంత్రంగా పరిశీలించండి." : "Know what each verification check covers, and review profile details independently."}
      />
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50 to-white p-5">
          <h3 className="font-bold text-rose-950">{te ? "🔒 Contact sharing" : "🔒 Contact sharing"}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-700">{te ? "Contact వివరాలు దాచబడతాయి. ప్రొఫైల్ యజమాని request‌ను అంగీకరించి, privacy settings అనుమతించిన తర్వాతే పంచుకోవచ్చు. Credits consent‌ను దాటవేయవు." : "Contact details stay hidden. They may be shared only after the profile owner accepts and privacy settings allow it. Credits do not bypass consent."}</p>
        </article>
        <article className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5">
          <h3 className="font-bold text-amber-950">{te ? "✅ Checks పరిమితులు" : "✅ Know what checks mean"}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-700">{te ? "Phone OTP ఆ number‌కు access‌ను మాత్రమే నిర్ధారిస్తుంది. Photo, ID reviews వేర్వేరు checks; member ఇచ్చిన వివరాలను స్వతంత్రంగా verify చేయండి." : "Phone OTP confirms access to that number only. Photo and ID reviews are separate checks; verify member-provided details independently."}</p>
        </article>
        <article className="rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 to-white p-5">
          <h3 className="font-bold text-sky-950">{te ? "🚩 Report / block" : "🚩 Report or block"}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-700">{te ? "సందేహాస్పద profile లేదా ప్రవర్తన కనిపిస్తే report చేయండి. మీ account నుంచి profiles‌ను block చేయవచ్చు." : "Report suspicious profiles or conduct. You can block profiles from your account."}</p>
        </article>
      </div>
      <div className="mt-5 flex justify-center">
        <Link href="/safety" className="inline-flex min-h-11 items-center justify-center rounded-full border border-maroon/20 bg-white px-5 py-2.5 text-sm font-bold text-maroon shadow-sm transition hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon focus-visible:ring-offset-2">
          {te ? "Safety & Privacy మార్గదర్శిని చూడండి →" : "Open safety & privacy guide →"}
        </Link>
      </div>
    </section>
      <FinalCta />
    </div>
  );
}
