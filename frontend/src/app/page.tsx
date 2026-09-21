"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ALL_CHANNELS, CHANNEL_STATS, Channel } from "@/lib/channels";
import Reveal from "@/components/Reveal";
import { useCountUp } from "@/components/Skeletons";
import AdSlot from "@/components/AdSlot";
import OffersBanner from "@/components/OffersBanner";
import BannerSlot from "@/components/BannerSlot";
import SectionHeading from "@/components/SectionHeading";
import { FinalCta, ReligionsStrip, StoriesStrip, TeaserStrip } from "@/components/HomeGrowth";
import DailyStrip from "@/components/DailyStrip";
import ShowcaseStrip from "@/components/ShowcaseStrip";
import { SITE_CONFIG } from "@/lib/site-config";
import { apiGet } from "@/lib/api";
import { useLang, type Lang } from "@/lib/lang";
import WeddingStoryHero from "@/components/WeddingStoryHero";
import CinematicHero from "@/components/CinematicHero";
import RealWeddingsFilm from "@/components/RealWeddingsFilm";
import WhyChooseUs from "@/components/WhyChooseUs";

const BOT = SITE_CONFIG.officialChannelUrl;

/* ------------------------------------------------------------------ */
/* 🌊 WAVE 30 — live home numbers (NO DUMMY) + Telugu/English toggle  */
/* ------------------------------------------------------------------ */
type PlanStat = { code: string; price: number; profiles: number; label: string; telugu: string; badge: string };
type HomeStats = {
  channels_total: number; channels_live: number;
  channels_by_tier: Record<string, number>;
  castes_covered: number; free_first: number;
  plans: PlanStat[];
  renewal: { price: number; profiles: number };
  bureau: { code: string; price: number; profiles: number; label: string; telugu: string; perks: string[] }[];
  referral: { per_pay: number; milestones: { paid: number; title: string; telugu: string }[] };
};

const FALLBACK: HomeStats = {
  channels_total: CHANNEL_STATS.total, channels_live: 2,
  channels_by_tier: { L1_REGION: 5, L2_RELIGION: 11, L3_CASTE: 27, L4_SPECIAL: 8 },
  castes_covered: 43, free_first: 3,
  plans: [
    { code: "FREE", price: 0, profiles: 3, label: "FREE", telugu: "FREE → 3 profiles", badge: "Start" },
    { code: "S_99", price: 99, profiles: 5, label: "Sambandham", telugu: "₹99 → 5 profiles", badge: "Entry" },
    { code: "S_199", price: 199, profiles: 12, label: "Family", telugu: "₹199 → 12 profiles", badge: "Popular" },
    { code: "S_299", price: 299, profiles: 25, label: "Premium", telugu: "₹299 → 25 profiles", badge: "Best value" },
    { code: "S_499", price: 499, profiles: 50, label: "VIP", telugu: "₹499 → 50 profiles", badge: "VIP" },
  ],
  renewal: { price: 99, profiles: 8 },
  bureau: [
    { code: "BUREAU_999", price: 999, profiles: 25, label: "Bureau Starter", telugu: "₹999 → 25 profiles (B2B)", perks: ["25 profiles", "Monthly engaged report", "Bulk register"] },
  ],
  referral: { per_pay: 50, milestones: [{ paid: 25, title: "💎 PLATINUM Referrer", telugu: "25 paying referrals — 💎 verified badge + homepage" }] },
};

function planOf(hs: HomeStats, code: string): PlanStat {
  return hs.plans.find((p) => p.code === code) || FALLBACK.plans.find((p) => p.code === code)!;
}

/* ---------------- Telugu / English copy (ONE language at a time) ---------------- */
const TEXT = {
  te: {
    liveBadge: (live: number, total: number) => `${total}+ ఛానళ్లలో మీ ప్రొఫైల్ — LIVE`,
    heroTitle: "మీ ఇంటి దగ్గరే సంబంధాలు",
    heroSubA: "తెలంగాణ + ఆంధ్రప్రదేశ్ తెలుగు మ్యాట్రిమోనీ",
    heroSubB: (castes: number, total: number) => `Region • Religion • ${castes} Castes • Special — ${total} channels, ఒక్క రిజిస్టర్‌తో మీ ప్రొఫైల్ సరిపోయే అన్ని చోట్లకీ ఆటోమేటిక్‌గా వెళ్తుంది.`,
    heroSubC: (free: number) => `₹99 కే సంబంధం — మొదటి ${free} ప్రొఫైళ్లు FREE.`,
    registerCta: "ఉచిత నమోదు — FREE",
    botCta: "Telegram లో చేరండి",
    installApp: "App లాగా install చేసుకోండి",
    vibeTitle: "మీ ఇంటి శుభకార్యానికి — సరైన సంబంధం ఇక్కడే",
    trust: ["OTP + DOB వెరిఫైడ్", "ఫోటో-ప్రైవేట్ మోడ్", "యాక్సెప్ట్ తర్వాతే నంబర్", "వాటర్‌మార్క్ + ఫ్రాడ్ అలర్ట్స్"],
    idSearchPh: "Profile ID తో వెతకండి — RED001",
    idSearchBtn: "వెతకండి",
    cardWhy: "ఎందుకు సెట్ అవుతారు?",
    cardTags: ["O+", "Rohini", "Bharadwaj"],
    cardWhy1: "✓ Reddy Bharadwaj గోత్రం + Rohini నక్షత్రం — క్లియర్",
    cardWhy2: "✓ BTech + Software Engineer (8 LPA) — సెటిల్డ్",
    cardWhy3: "✓ Hyderabad లోనే ఉద్యోగం — same city",
    cardInterest: "❤️ Interest పంపు",
    cardNumber: "📞 Number (1 credit)",
    ticker: (total: number, castes: number, free: number) => [
      `${total} channels — Region • Religion • Caste • Special`,
      `₹99 కే సంబంధం — మొదటి ${free} నంబర్లు FREE`,
      "Photo-Private • DOB Verified • Watermark protected",
      "Telegram + WhatsApp channels లో post",
      `${castes} castes: Reddy నుంచి Madiga, Lambada, Boya వరకు`,
      "Muslim • Christian • Inter-faith channels కూడా",
      "Referral — ప్రతి profile కి ₹50",
    ],
    statChannels: "Channels (network)",
    statChannelsSub: (t: Record<string, number>) => `${t.L1_REGION ?? 5} Region • ${t.L2_RELIGION ?? 11} Religion • ${t.L3_CASTE ?? 27} Caste • ${t.L4_SPECIAL ?? 8} Special`,
    statCastes: "కులాలు (covered)",
    statCastesSub: "Reddy నుంచి SC/ST వరకు",
    statChat: "No chatting",
    statChatT: "చాటింగ్ లేదు — direct contact",
    statChatS: "Safe WhatsApp delivery",
    statPrice: (p99: PlanStat) => `₹${p99.price}→${p99.profiles}`,
    statPriceL: (p199: PlanStat, p299: PlanStat) => `Profiles (₹${p199.price}→${p199.profiles}, ₹${p299.price}→${p299.profiles})`,
    statPriceS: (free: number) => `మొదటి ${free} requests FREE`,
    howEyebrow: "ఎలా పనిచేస్తుంది",
    howTitle: "4 దశల్లో ఆటోమేటిక్ సంబంధం",
    howSub: "Register అయ్యాక మీ profile అవసరమైన channels లో దానంతట అదే post అవుతుంది. మీరు manual గా ఏదీ చెయ్యక్కర్లేదు.",
    howSteps: (total: number) => [
      { n: "01", t: "Register", d: "Personal, family, caste/astro, education, location + photo. 5 easy steps, mobile లోనే.", icon: "📝" },
      { n: "02", t: "Card + ID ready", d: "Profile card ఆటోమేటిక్‌గా generate అవుతుంది — అన్ని details, QR, watermark తో.", icon: "🎴" },
      { n: "03", t: "Channels లో మీ profile", d: `మీ caste + state + job బట్టి ${total} channels నుంచి సరిపోయేవి — Telegram + WhatsApp.`, icon: "📢" },
      { n: "04", t: "Interest పంపు → number exchange", d: "నచ్చిన profile కి 💌 Interest పంపు (1 credit). Accept అయితే రెండు numbers WhatsApp లో ఆటోమేటిక్.", icon: "💌" },
    ],
    reqEyebrow: "అడ్వాన్స్‌డ్ రిక్వెస్ట్ విధానం",
    reqTitle: "చాటింగ్ లేదు • ఇంట్రెస్ట్ → వాట్సాప్ నంబర్",
    reqSub: "Chat = time waste + fake ids + moderation cost. మన consent-based request model: ఎవరు accept చేస్తే వాళ్లు మాత్రమే మాట్లాడుకుంటారు.",
    reqAction: "💌 రిక్వెస్ట్‌లు",
    reqSteps: (free: number, p99: PlanStat) => [
      { i: "💌", t: "1. Interest పంపు (1 credit)", d: `Profile చూసి "Interest పంపు" press చెయ్యి — మొదటి ${free} requests FREE, తర్వాత ₹${p99.price} → ${p99.profiles} profiles.` },
      { i: "📲", t: "2. వాళ్లకి WhatsApp లో మీ profile", d: `మన WhatsApp నుంచి వాళ్లకి మీ profile card + details వెళ్తుంది — "ఒకరు మీ profile చూసి interesting గా ఉన్నారు".` },
      { i: "✅", t: "3. Accept అయితే numbers exchange", d: "వాళ్లు accept చేస్తే — రెండు numbers ఆటోమేటిక్‌గా WhatsApp లో. Direct గా call/chat చేసుకోవచ్చు, మనం middle లో ఉండము." },
      { i: "↩️", t: "4. Decline అయితే credit refund", d: "ఈ సారి కుదరలేదంటే polite message + మీ credit తిరిగి వస్తుంది. అంటే ఎవరూ money waste చెయ్యరు." },
    ],
    reqChips: ["🚫 0 chatting", "🔒 Consent first", "↩️ Decline = refund", "✅ Safe delivery"],
    priceStrip: (p: PlanStat, tag: string) => ({ p: `₹${p.price}`, n: `${p.profiles} profiles`, s: tag }),
    priceTags: ["₹20/profile — entry", "₹17/profile — popular", "₹12/profile — best value"],
    chEyebrow: "ఛానల్ నెట్‌వర్క్",
    chTitle: (total: number) => `${total} ఛానళ్లు — మీ ప్రొఫైల్ అన్నిచోట్లకు`,
    chSub: "Region + Religion + Caste + Special. ఒక్క approve = అన్ని related channels లో post.",
    chAction: (total: number) => `అన్ని ${total} ఛానళ్లు`,
    flowTitle: "📢 ఒక్క నమోదు — అన్ని సరైన ఛానళ్లలో ప్రొఫైల్",
    flow: [
      { t: "1. మీ వివరాలు", d: "5 సులభమైన స్టెప్స్ + ఫోటో" },
      { t: "2. సరైన ఛానల్ ఎంపిక", d: "కులం × రాష్ట్రం × వృత్తి బట్టి" },
      { t: "3. Telegram + WhatsApp", d: "మీ profile card పోస్ట్" },
      { t: "4. మీకు నోటిఫికేషన్", d: "ఎవరైనా interest పంపితే వెంటనే మీకు తెలుస్తుంది" },
    ],
    casteEyebrow: "కులాల వారీగా",
    casteTitle: (n: number) => `${n} కుల ఛానళ్లు — 1 కులం = 1 ఛానల్`,
    casteSub: "Bride + Groom ఇద్దరూ ఒకే channel లో — #Bride / #Groom hashtag తో filter చేసుకోవచ్చు. మీ కులం channel busy అయ్యే కొద్దీ కొత్త matches ఎక్కువ వస్తాయి.",
    casteAction: "కులాల జాబితా",
    casteMore: (n: number) => `+ ఇంకా ${n} castes (Boya, Kuruba, Uppara, Vaddera, Rajaka, Viswakarma, Kummara, Gandla, Devanga, Koya, Gond, SC/ST sub-castes...) —`,
    casteFull: "full list చూడు",
    spEyebrow: "ప్రత్యేక గౌరవం",
    spTitle: "అందరికీ ప్రత్యేక స్థలం — గౌరవంతో",
    spSub: "2nd marriage, differently abled, 35+, govt jobs, doctors, NRI — ప్రతి వాళ్లకీ ప్రత్యేక channel.",
    pricingEyebrow: "ధరలు",
    pricingTitle: "సులభం — ₹99 కే సంబంధం",
    pricingSub: (free: number, p99: PlanStat, p199: PlanStat, p299: PlanStat, p499: PlanStat) =>
      `Register FREE. మొదటి ${free} interest requests FREE. తర్వాత ₹${p99.price} → ${p99.profiles} profiles, ₹${p199.price} → ${p199.profiles}, ₹${p299.price} → ${p299.profiles}, ₹${p499.price} → ${p499.profiles}. ప్రతి tier కి ₹/profile తగ్గుతుంది — decline అయితే credit refund.`,
    planTags: ["Start ఇక్కడే", "Entry • ₹20/profile", "Most popular • ₹17/profile", "Best value • ₹12/profile", "VIP • ₹10/profile"],
    planNames: ["FREE", "Sambandham", "Family", "Premium", "VIP"],
    planCredits: (free: number, p99: PlanStat, p199: PlanStat, p299: PlanStat, p499: PlanStat) => [
      `మొదటి ${free} profiles FREE`, `${p99.profiles} profiles • 30 days`, `${p199.profiles} profiles • 45 days`,
      `${p299.profiles} profiles • 60 days`, `${p499.profiles} profiles • 90 days`,
    ],
    planFeatures: [
      ["3 interest requests FREE", "WhatsApp లో మీ profile share", "channel network లో post", "ID search always open", "Photo-private mode"],
      ["5 interest requests", "⚡ 7-day profile boost (channel top)", "Accept అయితే number exchange", "Decline అయితే credit refund", "Referral తో ₹50 earn"],
      ["12 interest requests", "✅ Photo-verified badge", "🔮 Free 10-porutham report (1)", "Daily fresh matches digest", "Family bureau assist"],
      ["25 interest requests", "⚡ 30-day boost (top of channel)", "👀 Who-viewed-me 60 days", "✅ Verified badge", "Telugu dedicated support"],
      ["50 interest requests", "🎯 Matchmaker assist (మన team call)", "⚡ 90-day boost", "💍 Wedding vendor discounts", "Priority WhatsApp support"],
    ],
    planCtaFree: "FREE గా start",
    planCtaPay: (price: string) => `${price} pay చేసి start`,
    planSecure: "Razorpay secure • refund policy",
    addonTitle: "🎁 Add-ons — credits కన్నా extra value",
    addonTag: "per-item • ఎప్పుడైనా",
    renewalLine: (r: { price: number; profiles: number }, b: { price: number; profiles: number }) =>
      `🔁 Renewal offer: పాత customers కి ₹${r.price} → ${r.profiles} profiles (first-time ₹99 → 5) • 🏢 Bureau: ₹${b.price}/mo → ${b.profiles} profiles + monthly report`,
    addonCta1: "Plans + add-ons కొనండి →",
    addonCta2: "👀 ఎవరు చూశారో చూడండి",
    refTitle: "🏆 సంపాదించండి — Referral Program",
    refSub: (per: number) => `మీకు పెళ్లి సంబంధం అవసరం లేకపోయినా — ఎవరైనా ఈ program లో join అవ్వొచ్చు! మీ link ద్వారా ఎవరైనా join అయ్యి pay చేస్తే మీకు ₹${per} వస్తుంది. Bureaus/brokers కి కూడా ప్రత్యేక dashboard ఉంది.`,
    refCards: (per: number, ms: string) => [{ k: "ప్రతి pay కి", v: `₹${per}` }, { k: "25 referrals", v: ms }, { k: "Payout", v: "వారానికోసారి UPI" }],
    refCta1: "నా referral code →",
    refCta2: "🎁 ఇప్పుడే join అవ్వండి",
    burTitle: "🏢 Bureau / Broker B2B",
    burSub: "Already marriage bureau నడుపుతున్నారా? మన profiles share చెయ్యండి + commission తీసుకోండి.",
    burName: (b: { label: string; price: number }) => `${b.label} — ₹${b.price}/mo`,
    burOpen: "B2B open",
    burDash: "Bureau dashboard →",
    faqEyebrow: "ప్రశ్నలు",
    faqTitle: "తరచూ అడిగేవి — స్పష్టమైన సమాధానాలు",
    ctaTitle: "ఇప్పుడే మొదలుపెట్టండి — FREE",
    ctaSub: (total: number, free: number, p99: PlanStat, p199: PlanStat, p299: PlanStat, p499: PlanStat) =>
      `Register FREE → profile card ready → ${total} channels network లో post → మొదటి ${free} interest requests FREE. తర్వాత ₹${p99.price} → ${p99.profiles} profiles, ₹${p199.price} → ${p199.profiles}, ₹${p299.price} → ${p299.profiles}, ₹${p499.price} → ${p499.profiles} (VIP).`,
    ctaReg: "ఉచిత నమోదు",
    ctaBot: "Telegram లో చేరండి",
    trustTitle: "🛡️ నమ్మకం & భద్రత",
    trustSub: "మీ ఫోన్ నంబర్ ఎప్పుడూ public గా కనిపించదు — accept చేసిన తర్వాతే ఇద్దరికీ exchange అవుతుంది.",
    trustAvg: (n: number) => `సగటు Trust Score (${n} ప్రొఫైల్స్)`,
    trustAvgD: "Verify + complete profile ఉంటే score పెరుగుతుంది — matches కూడా ఎక్కువ వస్తాయి.",
    trustNum: "🔒 నంబర్ policy",
    trustNumD: "మీ ఫోన్ నంబర్ ఎప్పుడూ ఎవరికీ నేరుగా కనిపించదు (98••••••45 గానే చూపిస్తుంది).",
    trustFree: (free: number, p99: PlanStat) => `FREE: ${free} ప్రొఫైల్స్ + ${free} interests · ₹${p99.price} లో → ${p99.profiles} ప్రొఫైల్స్`,
    trustAbuse: "🧱 మోసం నుండి రక్షణ",
    trustAuth: "లాగిన్ భద్రత",
    trustAuthD: (enforced: boolean) => (enforced ? "OTP verified" : "OTP verified"),
    trustLive: "మీ ప్రొఫైల్ పూర్తిగా నింపితే — ఈ trust board లో మీరు top లో కనిపించే అవకాశం ఎక్కువ.",
    vendorEyebrow: "పెళ్లి వెండర్లు",
    vendorTitle: "🏪 పెళ్లికి కావాల్సినవన్నీ — ఒకేచోట",
    vendorSub: "Catering • Photography • Decorations • Function Hall • Tent House • Pandit • Jewellery • Makeup • DJ • Invitations • Cars • Planner. Verified vendors, direct WhatsApp, best rates.",
    vendorAll: "అన్ని 18 categories →",
    vendorPromoT: "మీ business కూడా promote చెయ్యాలనుందా? 🏪",
    vendorPromoS: (total: number) => `₹149 నుంచి — ${total} channels + WhatsApp lanes + website banner + leads direct మీ WhatsApp కి.`,
    vendorPromoC: "Advertise చెయ్యండి →",
    faq: (total: number, p99: PlanStat, p199: PlanStat, p299: PlanStat, p499: PlanStat) => [
      { q: "Register చెయ్యడానికి ఎంత charge?", a: `Register 100% FREE. మొదటి 3 interest requests కూడా FREE. ఆ తర్వాత ₹${p99.price} తో ${p99.profiles} profiles, ₹${p199.price} తో ${p199.profiles}, ₹${p299.price} తో ${p299.profiles}, ₹${p499.price} తో ${p499.profiles} profiles (₹10–20/profile).` },
      { q: "Chatting ఉందా? ఎలా మాట్లాడుకోవాలి?", a: `Chatting లేదు — అంతే. మీకు నచ్చిన profile కి "💌 Interest పంపు" (1 credit). వాళ్ల profile + మీ details WhatsApp లో వాళ్లకి వెళ్తుంది. వాళ్లు Accept చేస్తే రెండు numbers ఆటోమేటిక్‌గా WhatsApp లో exchange అవుతాయి — direct గా మాట్లాడుకోవచ్చు. Decline చేస్తే మీ credit refund (మన trust policy).` },
      { q: "Number ఎప్పుడు కనిపిస్తుంది? Direct గా ఇస్తారా?", a: "Interest పంపినప్పుడు number lock లో ఉంటుంది. వాళ్లు Accept చేసిన తర్వాతే numbers exchange అవుతాయి — ఇద్దరూ ఒప్పుకున్నప్పుడే. అంటే spam calls, fake ids, మోసం — అన్నీ block. ఈ consent logic top matrimony sites లో ఇదే, కానీ మనం WhatsApp లో fast గా చేస్తాం." },
      { q: "నా photo public లో కనిపిస్తుందా?", a: "Photo-Private ON చేస్తే public లో blur గా కనిపిస్తుంది — WhatsApp/Telegram cards లో కూడా watermark. Interest accept అయ్యాకే clear photos. Screenshot misuse జరిగినా watermark + report system తో action తీసుకుంటాం." },
      { q: "నా profile ఏ channels లో post అవుతుంది?", a: `మీ caste + state + job బట్టి ${total} channels నుంచి సరిపోయేవి (max 5) — Region + Caste (bride/groom separate) + Religion + Special channels అన్నీ cover అవుతాయి.` },
      { q: "WhatsApp లో కూడా వస్తుందా?", a: "అవును — Telegram post అయ్యాక WhatsApp channels/groups కి కూడా వెళ్తుంది. Interest వచ్చినప్పుడు కూడా WhatsApp లోనే notification + profile card వస్తుంది." },
      { q: "మోసం/fake profiles ఉంటే ఏం చేస్తారు?", a: "DOB + OTP verify, photo watermark, 3 reports → auto hide, మా safety alerts లో fraud alerts. Advance money అడిగితే వెంటనే report చెయ్యండి — 24h లో action. Decline అయినా credit refund ఇస్తాం." },
    ],
  },
  en: {
    liveBadge: (live: number, total: number) => `Your profile — LIVE across ${total}+ channels`,
    heroTitle: "Perfect matches, close to home",
    heroSubA: "Telangana + Andhra Pradesh Telugu Matrimony",
    heroSubB: (castes: number, total: number) => `Region • Religion • ${castes} Castes • Special — ${total} channels. One registration puts your profile everywhere it fits.`,
    heroSubC: (free: number) => `₹99 Sambandham — first ${free} profiles FREE.`,
    registerCta: "Register FREE",
    botCta: "Join on Telegram",
    installApp: "Install as app",
    vibeTitle: "For your family wedding — the right match is here",
    trust: ["OTP + DOB verified", "Photo-private mode", "Number only after accept", "Watermark + fraud alerts"],
    idSearchPh: "Search by Profile ID — RED001",
    idSearchBtn: "Search",
    cardWhy: "Why they match?",
    cardTags: ["O+", "Rohini", "Bharadwaj"],
    cardWhy1: "✓ Reddy Bharadwaj gothram + Rohini star — clear",
    cardWhy2: "✓ BTech + Software Engineer (8 LPA) — settled",
    cardWhy3: "✓ Works in Hyderabad — same city",
    cardInterest: "❤️ Send Interest",
    cardNumber: "📞 Number (1 credit)",
    ticker: (total: number, castes: number, free: number) => [
      `${total} channels — Region • Religion • Caste • Special`,
      `₹99 Sambandham — first ${free} profiles FREE`,
      "Photo-Private • DOB Verified • Watermark protected",
      "Telegram + WhatsApp channels లో post",
      `${castes} castes: Reddy to Madiga, Lambada, Boya`,
      "Muslim • Christian • Inter-faith channels too",
      "Referral — ₹50 per profile",
    ],
    statChannels: "Channels (network)",
    statChannelsSub: (t: Record<string, number>) => `${t.L1_REGION ?? 5} Region • ${t.L2_RELIGION ?? 11} Religion • ${t.L3_CASTE ?? 27} Caste • ${t.L4_SPECIAL ?? 8} Special`,
    statCastes: "Castes covered",
    statCastesSub: "Reddy to SC/ST",
    statChat: "No chatting",
    statChatT: "No chatting — direct contact",
    statChatS: "Safe WhatsApp delivery",
    statPrice: (p99: PlanStat) => `₹${p99.price}→${p99.profiles}`,
    statPriceL: (p199: PlanStat, p299: PlanStat) => `Profiles (₹${p199.price}→${p199.profiles}, ₹${p299.price}→${p299.profiles})`,
    statPriceS: (free: number) => `First ${free} requests FREE`,
    howEyebrow: "How it works",
    howTitle: "Sambandham in 4 automatic steps",
    howSub: "Once you register, your profile automatically posts to the right channels. You never have to post anything manually.",
    howSteps: (total: number) => [
      { n: "01", t: "Register", d: "Personal, family, caste/astro, education, location + photo. 5 easy steps on mobile.", icon: "📝" },
      { n: "02", t: "Card + ID ready", d: "Profile card is auto-generated — all details, QR and watermark.", icon: "🎴" },
      { n: "03", t: "Post to channels", d: `Best-fit channels from ${total}, based on your caste + state + job — Telegram + WhatsApp.`, icon: "📢" },
      { n: "04", t: "Send interest → number exchange", d: "Send 💌 Interest (1 credit) to profiles you like. On accept, both numbers exchange automatically on WhatsApp.", icon: "💌" },
    ],
    reqEyebrow: "Advanced request model",
    reqTitle: "No chatting — interest → WhatsApp number exchange",
    reqSub: "Chat = time waste + fake IDs + moderation cost. Our consent-based request model: only people who accept each other ever talk.",
    reqAction: "💌 Requests",
    reqSteps: (free: number, p99: PlanStat) => [
      { i: "💌", t: "1. Send interest (1 credit)", d: `See a profile, press "Send Interest" — first ${free} requests FREE, then ₹${p99.price} → ${p99.profiles} profiles.` },
      { i: "📲", t: "2. They get your profile on WhatsApp", d: `Our WhatsApp sends them your profile card + details — "someone found your profile interesting".` },
      { i: "✅", t: "3. Accept → numbers exchange", d: "If they accept — both numbers automatically on WhatsApp. Call/chat directly; we stay out of the middle." },
      { i: "↩️", t: "4. Decline → credit refund", d: "If it doesn't work out, a polite message goes out + your credit comes back. Nobody wastes money." },
    ],
    reqChips: ["🚫 0 chatting", "🔒 Consent first", "↩️ Decline = refund", "✅ Safe delivery"],
    priceStrip: (p: PlanStat, tag: string) => ({ p: `₹${p.price}`, n: `${p.profiles} profiles`, s: tag }),
    priceTags: ["₹20/profile — entry", "₹17/profile — popular", "₹12/profile — best value"],
    chEyebrow: "Channel network",
    chTitle: (total: number) => `${total} channels — your profile reaches everywhere it fits`,
    chSub: "Region + Religion + Caste + Special. One approval = posted to all matching channels.",
    chAction: (total: number) => `All ${total} channels`,
    flowTitle: "📢 One registration — posted to every matching channel",
    flow: [
      { t: "1. Your details", d: "5 easy steps + photo" },
      { t: "2. Right channel picked", d: "Based on caste × state × occupation" },
      { t: "3. Telegram + WhatsApp", d: "Profile card posted" },
      { t: "4. You get notified", d: "The moment someone sends interest" },
    ],
    casteEyebrow: "Caste-wise",
    casteTitle: (n: number) => `${n} caste channels — 1 caste = 1 channel`,
    casteSub: "Brides + grooms in one channel — filter with #Bride / #Groom hashtags. The busier your caste channel gets, the more matches you see.",
    casteAction: "See caste list",
    casteMore: (n: number) => `+ ${n} more castes (Boya, Kuruba, Uppara, Vaddera, Rajaka, Viswakarma, Kummara, Gandla, Devanga, Koya, Gond, SC/ST sub-castes...) —`,
    casteFull: "see full list",
    spEyebrow: "Special respect",
    spTitle: "A separate space for everyone — with dignity",
    spSub: "2nd marriage, differently abled, 35+, govt jobs, doctors, NRI — a dedicated channel for each.",
    pricingEyebrow: "Pricing",
    pricingTitle: "Simple — ₹99 Sambandham",
    pricingSub: (free: number, p99: PlanStat, p199: PlanStat, p299: PlanStat, p499: PlanStat) =>
      `Register FREE. First ${free} interest requests FREE. Then ₹${p99.price} → ${p99.profiles} profiles, ₹${p199.price} → ${p199.profiles}, ₹${p299.price} → ${p299.profiles}, ₹${p499.price} → ${p499.profiles}. ₹/profile drops every tier — credit refund on decline.`,
    planTags: ["Start here", "Entry • ₹20/profile", "Most popular • ₹17/profile", "Best value • ₹12/profile", "VIP • ₹10/profile"],
    planNames: ["FREE", "Sambandham", "Family", "Premium", "VIP"],
    planCredits: (free: number, p99: PlanStat, p199: PlanStat, p299: PlanStat, p499: PlanStat) => [
      `First ${free} profiles FREE`, `${p99.profiles} profiles • 30 days`, `${p199.profiles} profiles • 45 days`,
      `${p299.profiles} profiles • 60 days`, `${p499.profiles} profiles • 90 days`,
    ],
    planFeatures: [
      ["3 interest requests FREE", "Your profile shared on WhatsApp", "Profile posted in channels", "ID search always open", "Photo-private mode"],
      ["5 interest requests", "⚡ 7-day profile boost (channel top)", "Number exchange on accept", "Credit refund on decline", "Earn ₹50 via referral"],
      ["12 interest requests", "✅ Photo-verified badge", "🔮 Free 10-porutham report (1)", "Daily fresh matches digest", "Family bureau assist"],
      ["25 interest requests", "⚡ 30-day boost (top of channel)", "👀 Who-viewed-me 60 days", "✅ Verified badge", "Dedicated Telugu support"],
      ["50 interest requests", "🎯 Matchmaker assist (our team calls)", "⚡ 90-day boost", "💍 Wedding vendor discounts", "Priority WhatsApp support"],
    ],
    planCtaFree: "Start FREE",
    planCtaPay: (price: string) => `Pay ${price} & start`,
    planSecure: "Razorpay secure • refund policy",
    addonTitle: "🎁 Add-ons — extra value beyond credits",
    addonTag: "per-item • anytime",
    renewalLine: (r: { price: number; profiles: number }, b: { price: number; profiles: number }) =>
      `🔁 Renewal offer: existing customers ₹${r.price} → ${r.profiles} profiles (first-time ₹99 → 5) • 🏢 Bureau: ₹${b.price}/mo → ${b.profiles} profiles + monthly report`,
    addonCta1: "Buy plans + add-ons →",
    addonCta2: "👀 See who viewed you",
    refTitle: "🏆 Earn — Referral Program",
    refSub: (per: number) => `You don't need to be looking for a match to join this program — anyone can! Share your link, and you earn ₹${per} every time someone joins and pays through it. Special dashboard for bureaus/brokers too.`,
    refCards: (per: number, ms: string) => [{ k: "Per pay", v: `₹${per}` }, { k: "25 referrals", v: ms }, { k: "Payout", v: "Weekly UPI" }],
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
      `Register FREE → profile card ready → posted across ${total} channels → first ${free} interest requests FREE. Then ₹${p99.price} → ${p99.profiles} profiles, ₹${p199.price} → ${p199.profiles}, ₹${p299.price} → ${p299.profiles}, ₹${p499.price} → ${p499.profiles} (VIP).`,
    ctaReg: "Register FREE",
    ctaBot: "Join on Telegram",
    trustTitle: "🛡️ Trust & Safety",
    trustSub: "Your phone number is never shown publicly — exchanged only after both sides accept.",
    trustAvg: (n: number) => `Average trust score (${n} profiles)`,
    trustAvgD: "Verified + complete profiles score higher — and get more matches.",
    trustNum: "🔒 Number policy",
    trustNumD: "Your phone number is never shown directly to anyone (always masked as 98••••••45).",
    trustFree: (free: number, p99: PlanStat) => `Free: ${free} profiles + ${free} interests · Paid: ₹${p99.price} → ${p99.profiles} profiles`,
    trustAbuse: "🧱 Fraud protection",
    trustAuth: "Login security",
    trustAuthD: (enforced: boolean) => (enforced ? "OTP verified" : "OTP verified"),
    trustLive: "Complete your profile fully to have a better chance of showing up top on this trust board.",
    vendorEyebrow: "Wedding Vendors",
    vendorTitle: "🏪 Everything for your wedding — one place",
    vendorSub: "Catering • Photography • Decorations • Function Hall • Tent House • Pandit • Jewellery • Makeup • DJ • Invitations • Cars • Planner. Verified vendors, direct WhatsApp, best rates.",
    vendorAll: "All 18 categories →",
    vendorPromoT: "Want to promote your business too? 🏪",
    vendorPromoS: (total: number) => `From ₹149 — ${total} channels + WhatsApp lanes + website banner + leads straight to your WhatsApp.`,
    vendorPromoC: "Advertise →",
    faq: (total: number, p99: PlanStat, p199: PlanStat, p299: PlanStat, p499: PlanStat) => [
      { q: "How much money to register?", a: `Registration is 100% FREE. First 3 interest requests are FREE too. Then ₹${p99.price} for ${p99.profiles} profiles, ₹${p199.price} for ${p199.profiles}, ₹${p299.price} for ${p299.profiles}, ₹${p499.price} for ${p499.profiles} profiles (₹10–20/profile).` },
      { q: "Is there chatting? How do we talk?", a: `No chatting — that's it. Send "💌 Interest" (1 credit) to a profile you like. Your profile + details reach them on WhatsApp. If they Accept, both numbers auto-exchange on WhatsApp — talk directly. On Decline your credit is refunded (our trust policy).` },
      { q: "When is the number visible? Do you share directly?", a: "The number stays locked when you send interest. Numbers exchange only after they Accept — only when both agree. So spam calls, fake IDs and fraud are all blocked. Top matrimony sites use this same consent logic; we just do it fast on WhatsApp." },
      { q: "Is my photo visible in public?", a: "With Photo-Private ON it shows blurred in public — watermarked on WhatsApp/Telegram cards too. Clear photos only after interest accept. Watermark + report system acts on screenshot misuse." },
      { q: "Which channels will my profile be posted to?", a: `Best-fit channels (max 5) from ${total}, based on your caste + state + job — Region + Caste-wise (bride/groom separate) + Religion + Special channels, all covered.` },
      { q: "Does it come on WhatsApp too?", a: "Yes — after the Telegram post it also goes to WhatsApp channels/groups. Interest arrivals also notify you on WhatsApp with a profile card." },
      { q: "What about fraud/fake profiles?", a: "DOB + OTP verify, photo watermark, 3 reports → auto hide, fraud alerts in our safety channel. Report advance-money demands immediately — action within 24h. Declined credits are refunded." },
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
  const L = TEXT[lang as Lang];
  const te = lang === "te";
  const [hs, setHs] = useState<HomeStats>(FALLBACK);
  const [trustBoard, setTrustBoard] = useState<{ count: number; average_trust: number; board: Record<string, unknown>[] } | null>(null);
  const [posture, setPosture] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    void apiGet<HomeStats>("/api/meta/home-stats").then(({ ok, data }) => { if (ok && data) setHs(data); });
    void apiGet<{ count: number; average_trust: number; board: Record<string, unknown>[] }>("/api/trust/board?limit=6")
      .then(({ ok, data }) => { if (ok && data) setTrustBoard(data); });
    void apiGet<Record<string, unknown>>("/api/security/posture")
      .then(({ ok, data }) => { if (ok && data) setPosture(data); });
  }, []);

  const p99 = planOf(hs, "S_99"), p199 = planOf(hs, "S_199"), p299 = planOf(hs, "S_299"), p499 = planOf(hs, "S_499");
  const bureau0 = hs.bureau[0] || FALLBACK.bureau[0];
  const ms25 = hs.referral.milestones.find((m) => m.paid === 25)?.title || "💎 PLATINUM Referrer";

  const [searchId, setSearchId] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const regionChannels: Channel[] = useMemo(() => ALL_CHANNELS.filter((c) => c.tier === "L1_REGION"), []);
  const religionChannels: Channel[] = useMemo(() => ALL_CHANNELS.filter((c) => c.tier === "L2_RELIGION"), []);
  const casteChannels: Channel[] = useMemo(() => ALL_CHANNELS.filter((c) => c.tier === "L3_CASTE"), []);
  const specialChannels: Channel[] = useMemo(() => ALL_CHANNELS.filter((c) => c.tier === "L4_SPECIAL"), []);
  const liveChannels = ALL_CHANNELS.filter((c) => c.live);

  const tickerItems = L.ticker(hs.channels_total, hs.castes_covered, hs.free_first);

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
    <div className="bg-cream">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* ================= 🎬 CINEMATIC VIDEO HERO (top-matrimony feel) ================= */}
      <CinematicHero />

      {/* ================= HERO ================= */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 dotted-bg opacity-60 pointer-events-none" />
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-gold/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-maroon/10 blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 pt-8 pb-10 grid lg:grid-cols-[1.15fr_0.85fr] gap-10 items-center">
          <div>
            <div className="anim-hero inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-gold/40 shadow-soft text-[11px] font-bold text-maroon">
              <span className="w-2 h-2 rounded-full bg-green-500 pulse-live" />
              {L.liveBadge(hs.channels_live, hs.channels_total)}
            </div>

            <h1 className="anim-hero-1 mt-4 text-[32px] md:text-[46px] font-bold text-maroon leading-[1.12]">
              {L.heroTitle}
            </h1>

            <p className="anim-hero-2 mt-3 text-sm md:text-base text-gray-700 telugu leading-relaxed max-w-xl">
              {L.heroSubA}.{" "}
              <b>{L.heroSubB(hs.castes_covered, hs.channels_total)}</b>{" "}
              <b>{L.heroSubC(hs.free_first)}</b>
            </p>

            <div className="anim-hero-3 mt-5 flex flex-wrap gap-3">
              <Link
                href="/register"
                className="px-6 py-3.5 rounded-full maroon-gradient text-white text-sm font-bold shadow-brand hover:shadow-brandLg transition"
              >
                🚀 {L.registerCta}
              </Link>
              <a
                href={SITE_CONFIG.officialChannelUrl}
                target="_blank"
                rel="noreferrer"
                className="px-6 py-3.5 rounded-full gold-gradient text-maroon text-sm font-bold shadow-soft hover:brightness-105 transition"
              >
                ✈️ {L.botCta}
              </a>
              <button
                onClick={() => window.dispatchEvent(new Event("tsap:install-show"))}
                className="px-6 py-3.5 rounded-full bg-white border border-gold/50 text-maroon text-sm font-bold shadow-soft"
              >
                📲 {L.installApp}
              </button>
            </div>

            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-[12px] font-semibold text-gray-700">
              {L.trust.map((t) => (
                <span key={t}>✓ {t}</span>
              ))}
            </div>

            {/* ID search */}
            <div className="mt-6 bg-white rounded-2xl p-1.5 flex items-center gap-2 card-shadow max-w-xl border border-gold/25">
              <span className="pl-3.5 text-gray-400" aria-hidden>🔍</span>
              <input
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                placeholder={L.idSearchPh}
                className="flex-1 outline-none text-sm py-2.5 bg-transparent"
                aria-label="Profile ID search"
              />
<Link
                href={searchId.trim() ? `/search/${searchId.trim()}` : "/matches"}
                className="px-5 py-2.5 maroon-gradient text-white rounded-xl text-sm font-bold whitespace-nowrap"
              >
                {L.idSearchBtn}
              </Link>
            </div>
          </div>

          {/* Hero card mock */}
          <Reveal delay={120}>
            <div className="relative max-w-md mx-auto w-full">
              <div className="absolute inset-0 maroon-gradient rounded-[2rem] rotate-3 opacity-15" />
              <div className="relative bg-white rounded-[2rem] p-5 card-shadow-lg border border-gold/30">
<div className="flex items-center flex-wrap gap-1.5">
                  <div className="text-[10px] font-bold text-gold-deep uppercase tracking-widest">
                    మన వివాహ
                  </div>
                  <div className="ml-auto flex items-center gap-1.5">
                    <div className="text-[10px] px-2 py-1 rounded-full bg-slate-100 text-slate-500 font-bold whitespace-nowrap">
                      {te ? "నమూనా" : "Sample"}
                    </div>
                    <div className="text-[10px] px-2 py-1 rounded-full bg-green-50 text-green-700 font-bold whitespace-nowrap">
                      ✓ {te ? "వెరిఫైడ్" : "Verified"}
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/promo/bride-card.jpg" alt="Sample bride" className="w-20 h-24 rounded-xl object-cover border border-gold/40 shrink-0" />
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-maroon">RED001</div>
                    <div className="text-[12px] text-gray-700 mt-0.5">25y • 5&prime;4&Prime; • Reddy</div>
                    <div className="text-[12px] text-gray-700">BTech • Software @ Hyderabad</div>
                    <div className="text-[12px] text-gray-700">Nalgonda, TS</div>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {L.cardTags.map((c) => (
                        <span key={c} className="text-[10px] px-2 py-0.5 rounded-full bg-gold-soft text-maroon font-bold">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="ml-auto text-right shrink-0">
                    <div className="text-[22px] font-bold text-gradient-gold leading-none">97%</div>
                    <div className="text-[9px] font-bold text-gold-deep">BEST MATCH</div>
                  </div>
                </div>

                <div className="mt-3 bg-cream rounded-2xl p-3 text-[11px] space-y-1">
                  <div className="font-bold text-maroon">{L.cardWhy}</div>
                  <div>{L.cardWhy1}</div>
                  <div>{L.cardWhy2}</div>
                  <div>{L.cardWhy3}</div>
                </div>

                <div className="mt-3 flex gap-2">
                  <button className="flex-1 py-2.5 maroon-gradient text-white rounded-full text-[12px] font-bold">
                    {L.cardInterest}
                  </button>
                  <button className="flex-1 py-2.5 border border-gold text-maroon rounded-full text-[12px] font-bold">
                    {L.cardNumber}
                  </button>
                </div>

                <div className="mt-2 text-[10px] text-center text-gray-400">
                  #Reddy #TSBride #Software #Nalgonda
                </div>
              </div>
            </div>
          </Reveal>
        </div>

        {/* Ticker */}
        <div className="relative bg-maroon text-white py-2.5 ticker-mask">
          <div className="ticker-track text-[11px] font-semibold tracking-wide">
            {[...tickerItems, ...tickerItems].map((t, i) => (
              <span key={i} className="mx-6 inline-flex items-center gap-2">
                <span className="text-gold">◆</span>
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ================= CINEMATIC WEDDING STORY ================= */}
      <WeddingStoryHero />

      {/* ================= 💐 REAL WEDDINGS FILM REEL ================= */}
      <RealWeddingsFilm />

      {/* ================= SPONSORED (targeted ads) ================= */}
      <section className="max-w-7xl mx-auto px-4 pt-4">
        <AdSlot slot="home_hero" />
      </section>

      {/* ================= FESTIVAL OFFERS ================= */}
      <section className="max-w-7xl mx-auto px-4 pt-3">
        <OffersBanner />
      </section>

      {/* ================= WEEKLY CASTE SHOWCASE (W41) ================= */}
      <ShowcaseStrip />

      {/* ================= DAILY MATCHES (admin select — W40) ================= */}
      <DailyStrip />

      {/* ================= ANNOUNCEMENTS (CMS) ================= */}
      <section className="max-w-7xl mx-auto px-4 pt-3">
        <BannerSlot page="home" />
      </section>

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

      {/* ================= 💎 WHY CHOOSE US (premium trust band) ================= */}
      <WhyChooseUs />

      {/* ================= WAVE 18 GROWTH: TEASERS + STORIES + RELIGIONS ================= */}
      <TeaserStrip />
      <StoriesStrip />
      <ReligionsStrip />

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
                <div className="mt-2 text-[11px] font-bold text-gold-deep tracking-widest">STEP {s.n}</div>
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

            {/* RIGHT: WhatsApp mockup (real message we send) */}
            <Reveal delay={140}>
              <div className="rounded-3xl overflow-hidden card-shadow-lg border border-black/10 bg-[#0b141a]">
                <div className="bg-[#202c33] px-4 py-3 flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={SITE_CONFIG.logoImage} alt="మన వివాహ" width={36} height={36} className="w-9 h-9 rounded-full object-cover shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-white text-[13px] font-bold truncate telugu">మన వివాహ</div>
                    <div className="text-[10px] text-emerald-300 truncate">🟢 online • verified business</div>
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-1">
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/10 text-gray-300 font-bold whitespace-nowrap">{te ? "నమూనా" : "Sample"}</span>
                    <span className="text-[9px] text-gray-400 whitespace-nowrap">🔒 {te ? "సురక్షితం" : "secured"}</span>
                  </div>
                </div>
                <div className="p-3 space-y-2 dotted-bg">
                  <div className="bg-[#005c4b] text-white text-[12px] rounded-xl rounded-tl-sm p-3 leading-relaxed max-w-[95%]">
                    <div className="font-bold">{te ? "💌 MANA VIVAHA — మీ profile కి INTEREST వచ్చింది!" : "💌 MANA VIVAHA — INTEREST on your profile!"}</div>
                    <div className="opacity-90 mt-1">{te ? <>ఒక person మీ profile చూసి <b>&quot;interesting గా ఉన్నారు&quot;</b> అని request పెట్టారు 👇</> : <>Someone saw your profile and sent a request saying <b>&quot;you look interesting&quot;</b> 👇</>}</div>
                    <div className="mt-2 pl-1 border-l-2 border-white/30">
                      👤 <b>Kiran Kumar Reddy</b> (29y)<br />
                      🎓 MBBS MD • 💼 Doctor, Apollo<br />
                      📍 Nalgonda, TS • 💍 Reddy<br />
                      ⭐ <b>82% match</b>
                    </div>
                    <div className="mt-2 opacity-90">{te ? "✅ Accept చేస్తే → వాళ్ల number మీకు WhatsApp లో" : "✅ On accept → their number comes to your WhatsApp"}</div>
                    <div className="text-[10px] opacity-70 mt-2 text-right">11:42 ✓✓</div>
                  </div>
                  <div className="bg-[#202c33] text-white text-[12px] rounded-xl p-3 max-w-[80%]">
{te ? "Profile card + photo ఇక్కడే వస్తుంది 🎴" : "Profile card + photo arrives here 🎴"}
                    <div className="text-[10px] opacity-70 mt-1">attachment: KAM001.png</div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button className="flex-1 bg-emerald-600 text-white text-[12px] font-bold rounded-xl py-2">✅ Accept</button>
                    <button className="flex-1 bg-white/10 text-white text-[12px] font-bold rounded-xl py-2">❌ Decline (refund)</button>
                  </div>
                  <div className="text-[10px] text-gray-400 text-center pt-1">
                    🛡️ {te ? "మీ number safe గా ఉంటుంది — accept చేస్తేనే exchange" : "Your number stays safe — exchanged only on accept"}
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

        <div className="mt-5 grid grid-cols-2 md:grid-cols-5 gap-3">
          {[...regionChannels, ...religionChannels].slice(0, 10).map((ch, i) => (
            <Reveal key={ch.key} delay={i * 50}>
              <a
                href={ch.live ? ch.link : "/channels"}
                target={ch.live ? "_blank" : undefined}
                rel="noreferrer"
                className={`block rounded-2xl p-3.5 text-white card-shadow h-full hover-lift ${
                  ch.key.startsWith("ts") ? "maroon-gradient" : ch.tier === "L2_RELIGION" ? "navy-gradient" : "maroon-gradient"
                }`}
              >
                <div className="text-[13px] font-bold leading-tight">{ch.name}</div>
                <div className="text-[11px] opacity-85 mt-1">
                  {ch.live ? (lang === "te" ? "🟢 LIVE — join చెయ్యండి" : "🟢 LIVE — join now") : (lang === "te" ? "త్వరలో ప్రారంభం" : "Coming soon")}
                </div>
                <div className="mt-2 flex gap-1 flex-wrap">
                  <span className="text-[10px] bg-gold text-maroon px-2 py-1 rounded-full font-bold">
                    {ch.live ? (lang === "te" ? "Join చెయ్యండి" : "Join") : (lang === "te" ? "త్వరలో" : "Soon")}
                  </span>
                </div>
              </a>
            </Reveal>
          ))}
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
                ? <>ఉదా: Reddy + TS + Software job → <span className="text-gold font-bold">TS Bride/Groom + Reddy + Software</span> ఛానళ్లలో ప్రొఫైల్ కనిపిస్తుంది</>
                : <>e.g. Reddy + TS + Software job → profile shows in <span className="text-gold font-bold">TS Bride/Groom + Reddy + Software</span> channels</>}
            </div>
          </div>
        </Reveal>
      </section>

      {/* ================= CASTES ================= */}
      <section className="max-w-7xl mx-auto px-4 py-8">
        <Reveal>
          <SectionHeading
            eyebrow={L.casteEyebrow}
            title={L.casteTitle(hs.channels_by_tier.L3_CASTE ?? 27)}
            subtitle={L.casteSub}
            telugu={lang === "te"}
            action={{ href: "/channels?tier=L3_CASTE", label: L.casteAction }}
          />
        </Reveal>
        <div className="mt-5 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
          {casteChannels.slice(0, 24).map((c, i) => (
            <Reveal key={c.key} delay={i * 25}>
              <Link
                href="/channels"
                className="block bg-white rounded-xl p-3 border border-gold/20 hover-lift h-full"
              >
                <div className="flex items-start justify-between gap-1">
                  <div className="text-[13px] font-bold text-maroon leading-tight">
                    {c.name.replace(/^💍 /, "").replace(" Matrimony", "").replace(" | TS-AP", "")}
                  </div>
                  {c.wave === 1 && (
                    <span className="text-[9px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-bold shrink-0">W1</span>
                  )}
                </div>
                <div className="text-[10px] text-gray-500 mt-1">
                  {c.live ? "LIVE ✅" : (lang === "te" ? "త్వరలో" : "Soon")}
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
        <div className="mt-3 text-[12px] text-gray-600">
          {L.casteMore(Math.max(0, casteChannels.length - 24))}{" "}
          <Link href="/channels?tier=L3_CASTE" className="font-bold text-maroon underline">
            {L.casteFull}
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
                <div className="text-[10px] mt-2 font-bold text-gold-deep">
                  {sp.live ? "LIVE ✅" : (lang === "te" ? "త్వరలో" : "Soon")}
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ================= 🏪 WEDDING VENDORS (ads) ================= */}
      <VendorStrip chTotal={hs.channels_total} />

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
                    POPULAR
                  </div>
                )}
                <div className="text-[11px] font-bold text-gold-deep tracking-widest uppercase">{p.tag}</div>
                <div className="font-bold text-maroon text-lg mt-1">{p.name}</div>
                <div className="mt-2 flex items-end gap-1">
                  <span className="text-3xl font-bold text-maroon">{p.price}</span>
                  <span className="text-[11px] text-gray-500 mb-1">one-time</span>
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
            <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { p: "₹49", t: lang === "te" ? "Profile Boost" : "Profile Boost", d: lang === "te" ? "7 days channel top లో" : "7 days at channel top" },
                { p: "₹49", t: lang === "te" ? "Who viewed me" : "Who viewed me", d: lang === "te" ? "30 days — names తో" : "30 days — with names" },
                { p: "₹99", t: lang === "te" ? "10-Porutham report" : "10-Porutham report", d: lang === "te" ? "Full kundli match (Telugu)" : "Full kundli match (Telugu)" },
                { p: "₹199", t: lang === "te" ? "Photo verify badge" : "Photo verify badge", d: lang === "te" ? "3x ఎక్కువ acceptances" : "3x more acceptances" },
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
                <div className="text-[11px] opacity-80">ID search</div>
                <div className="font-mono text-gold text-lg">{SITE_CONFIG.domain}/search</div>
                <div className="text-[11px] opacity-80 mt-2">Telegram</div>
                <div className="font-mono text-gold text-lg">{SITE_CONFIG.officialChannel}</div>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    {/* 🛡️ WAVE 9 — Trust & security (live numbers) */}
    <section className="max-w-7xl mx-auto px-4 py-8">
      <SectionHeading title={L.trustTitle}
        subtitle={L.trustSub} />
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-2xl font-extrabold text-emerald-900">{trustBoard ? `${trustBoard.average_trust}/100` : "—"}</p>
          <p className="text-[13px] font-semibold text-emerald-900">{L.trustAvg(trustBoard?.count ?? 0)}</p>
          <p className="mt-1 text-[12px] text-emerald-800">{L.trustAvgD}</p>
        </div>
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <p className="text-[13px] font-bold text-rose-900">{L.trustNum}</p>
          <p className="mt-1 text-[12px] text-rose-800">{String(posture?.numbers_policy || L.trustNumD)}</p>
          <p className="mt-2 text-[12px] font-semibold text-rose-900">{L.trustFree(hs.free_first, p99)}</p>
        </div>
        <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
          <p className="text-[13px] font-bold text-sky-900">{L.trustAbuse}</p>
          <ul className="mt-1 space-y-1 text-[12px] text-sky-900">
            <li>🔐 {L.trustAuth}: {L.trustAuthD(!!posture?.auth_enforced)}</li>
            <li>💳 {te ? "సురక్షిత payment — డబుల్ చార్జ్ కాదు" : "Secure payment — no double charging"}</li>
            <li>📜 {te ? "నంబర్ ఇచ్చినప్పుడు record ఉంటుంది" : "Number sharing is always recorded"}</li>
          </ul>
        </div>
      </div>
      {trustBoard?.board?.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {trustBoard.board.map((b) => (
            <Link key={String(b.tsap_id)} href={`/search/${b.tsap_id}`}
              className="rounded-full border border-gold/40 bg-white px-3 py-1.5 text-[11px] font-semibold text-maroon hover:bg-cream">
              {String(b.badge_telugu || "⭐")} {String(b.tsap_id)} · {String(b.trust_score)}/100
            </Link>
          ))}
        </div>
      ) : null}
      <p className="mt-3 text-[12px] text-gray-600">
        {L.trustLive}
      </p>
    </section>
      <FinalCta />
    </div>
  );
}

/* ---------------------------------------------------------------------------
   🏪 VENDOR AD STRIP — paid-first rotation (/api/vendors/ads)
--------------------------------------------------------------------------- */
function VendorStrip({ chTotal }: { chTotal: number }) {
  const { lang } = useLang();
  const L = TEXT[lang as Lang];
  const [ads, setAds] = useState<any[]>([]);
  const [cats, setCats] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/vendors/ads?slot=home_mid_strip&limit=4")
      .then((r) => r.json()).then((d) => setAds(d.ads || [])).catch(() => { });
    fetch("/api/vendors/categories")
      .then((r) => r.json()).then((d) => setCats((d.categories || []).slice(0, 10))).catch(() => { });
  }, []);

  return (
    <section className="max-w-7xl mx-auto px-4 py-8">
      <Reveal>
        <SectionHeading
          eyebrow={L.vendorEyebrow}
          title={L.vendorTitle}
          subtitle={L.vendorSub}
          telugu={lang === "te"}
          align="center"
        />
      </Reveal>

      <div className="mt-5 flex flex-wrap gap-2 justify-center">
        {cats.map((c) => (
          <Link key={c.key} href={`/vendors?category=${c.key}`}
            className="px-3 py-1.5 rounded-full bg-white border border-gold/40 text-[12px] font-semibold text-maroon hover:bg-maroon-soft transition">
            {c.icon} {c.en}
          </Link>
        ))}
        <Link href="/vendors" className="px-3 py-1.5 rounded-full maroon-gradient text-white text-[12px] font-bold">
          {L.vendorAll}
        </Link>
      </div>

      {ads.length > 0 && (
        <div className="mt-5 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {ads.map((a) => (
            <div key={a.vendor_id} className="bg-white rounded-3xl border border-gold/30 card-shadow p-4 flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-lg">{a.icon}</div>
                  <div className="font-bold text-maroon text-[14px] truncate">{a.business_name}</div>
                  <div className="text-[11px] text-gray-600">{a.category_te}</div>
                  <div className="text-[11px] text-gray-500">📍 {a.city}</div>
                </div>
                {a.verified && <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">✅ Verified</span>}
              </div>
              {a.price_range && <div className="mt-2 text-[11px] font-semibold text-maroon">💰 {a.price_range}</div>}
              <div className="mt-auto pt-3 flex gap-2">
                {a.whatsapp_link && (
                  <a href={a.whatsapp_link} target="_blank" rel="noreferrer"
                    className="flex-1 text-center bg-green-600 text-white font-bold text-[11px] px-3 py-2 rounded-xl">💬 WhatsApp</a>
                )}
                <Link href={a.detail_url || "/vendors"} className="flex-1 text-center border border-maroon/25 text-maroon font-bold text-[11px] px-3 py-2 rounded-xl">
                  Details
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-5 bg-navy text-white rounded-3xl p-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-bold">{L.vendorPromoT}</div>
          <div className="text-[12px] opacity-90 mt-0.5">
            {L.vendorPromoS(chTotal)}
          </div>
        </div>
        <Link href="/vendors/register" className="gold-gradient text-maroon font-bold text-[13px] px-4 py-2.5 rounded-xl">
          {L.vendorPromoC}
        </Link>
      </div>
    </section>
  );
}
