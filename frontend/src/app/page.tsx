"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Reveal from "@/components/Reveal";
import SectionHeading from "@/components/SectionHeading";
import ProfilesOfTheDay from "@/components/ProfilesOfTheDay";
import HomeVendorsShowcase from "@/components/HomeVendorsShowcase";
import CinematicHero from "@/components/CinematicHero";
import { SITE_CONFIG } from "@/lib/site-config";
import { serializeJsonLd } from "@/lib/safe-json-ld";
import { apiGet } from "@/lib/api";
import { useLang, type Lang } from "@/lib/lang";

type PlanStat = { code: string; price: number; profiles: number };
type HomeStats = { free_first: number; plans: PlanStat[] };

const FALLBACK: HomeStats = {
  free_first: 3,
  plans: [
    { code: "S_99", price: 99, profiles: 5 },
    { code: "S_199", price: 199, profiles: 12 },
    { code: "S_299", price: 299, profiles: 25 },
    { code: "S_499", price: 499, profiles: 50 },
  ],
};

const PLAN_CODES = ["S_99", "S_199", "S_299", "S_499"] as const;

function planOf(stats: HomeStats, code: string): PlanStat {
  return stats.plans.find((plan) => plan.code === code) ?? FALLBACK.plans.find((plan) => plan.code === code)!;
}

const TEXT = {
  te: {
    howEyebrow: "ఎలా పనిచేస్తుంది",
    howTitle: "పరిచయం ప్రారంభించడానికి 3 దశలు",
    howSub: "సభ్యులు అందించిన వివరాలను పరిశీలించి Interest పంపండి. Owner accept తర్వాత account views లో contact details కనిపిస్తాయి; WhatsApp delivery నిర్ధారణ కాదు.",
    howSteps: () => [
      { n: "01", t: "ప్రొఫైల్ నమోదు", d: "మీ ప్రాథమిక వివరాలు, ఫోటో గోప్యతా ఎంపికను నమోదు చేయండి.", icon: "📝" },
      { n: "02", t: "వివరాలు పరిశీలించండి", d: "సభ్యులు అందించిన ప్రొఫైల్ సమాచారం, చూపించిన review స్థితులను స్వతంత్రంగా పరిశీలించండి.", icon: "🔎" },
      { n: "03", t: "ఆసక్తి తెలియజేయండి", d: "Owner accept తర్వాత accepted-request account views లో contact details కనిపిస్తాయి; WhatsApp delivery హామీ లేదు.", icon: "💌" },
    ],
    pricingEyebrow: "ప్లాన్‌లు",
    pricingTitle: (price: number) => `పారదర్శక ధరలు — ₹${price} నుంచి`,
    planNames: ["సంబంధం", "ఫ్యామిలీ", "ప్రీమియం", "విఐపి"],
    planCredits: (p99: PlanStat, p199: PlanStat, p299: PlanStat, p499: PlanStat) => [
      `${p99.profiles} interest requests`,
      `${p199.profiles} interest requests`,
      `${p299.profiles} interest requests`,
      `${p499.profiles} interest requests`,
    ],
    pricingFree: (free: number) => `నమోదు ఉచితం. మొదటి ${free} interest requests కూడా ఉచితం.`,
    pricingLink: "పూర్తి ధరలు, add-ons మరియు నిబంధనలు చూడండి",
    faqEyebrow: "సహాయం",
    faqTitle: "తరచుగా అడిగే ప్రశ్నలు",
    faq: (free: number, p99: PlanStat, p199: PlanStat, p299: PlanStat, p499: PlanStat) => [
      { q: "నమోదుకు ఎంత ఖర్చు?", a: `నమోదు ఉచితం; మొదటి ${free} interest requests కూడా ఉచితం. తర్వాత ₹${p99.price}కి ${p99.profiles}, ₹${p199.price}కి ${p199.profiles}, ₹${p299.price}కి ${p299.profiles}, లేదా ₹${p499.price}కి ${p499.profiles} requests ఉన్న ప్లాన్‌లు అందుబాటులో ఉన్నాయి.` },
      { q: "Contact వివరాలు ఎప్పుడు లభిస్తాయి?", a: "Owner accept చేసిన తర్వాత accepted-request account views లో contact details కనిపిస్తాయి; configured WhatsApp notification లో ఉండవచ్చు, కానీ delivery/read నిర్ధారణ కాదు." },
      { q: "Phone OTP లేదా review badge ఏమి నిర్ధారిస్తుంది?", a: "Phone OTP ఆ నంబర్‌కు access‌ను మాత్రమే సూచిస్తుంది. Photo review, ID review వేర్వేరు checks; ఏదీ వ్యక్తి గుర్తింపుకు హామీ కాదు. వివరాలను స్వతంత్రంగా నిర్ధారించండి." },
      { q: "నా ఫోటోను ఎవరు చూడగలరు?", a: "ఫోటో కనిపించడం మీ profile privacy setting‌పై ఆధారపడి ఉంటుంది. ఫోటోను జోడించే ముందు ఆ setting‌ను పరిశీలించండి; online‌లో పంచిన చిత్రాల కాపీలను పూర్తిగా నియంత్రించడం సాధ్యం కాదు." },
    ],
    safety: "Phone OTP ఫోన్ నంబర్‌కు access‌ను మాత్రమే సూచిస్తుంది; వ్యక్తి గుర్తింపును కాదు. Owner acceptance తర్వాత account views లో contact access వస్తుంది; notification delivery/read నిర్ధారణ కాదు.",
    safetyLink: "భద్రతా మార్గదర్శిని",
    ctaTitle: "మీ వివాహ పరిచయం ఇక్కడ ప్రారంభించండి",
    ctaSub: "ఉచితంగా నమోదు చేసి, సభ్యులు అందించిన ప్రొఫైల్ వివరాలను మీరే పరిశీలించండి.",
    register: "ఉచితంగా నమోదు",
    browse: "సంబంధాలు చూడండి",
  },
  en: {
    howEyebrow: "How it works",
    howTitle: "Three steps to make an introduction",
    howSub: "Review member-submitted details and send an interest. After owner acceptance, account views show contact details; WhatsApp delivery is not confirmed.",
    howSteps: () => [
      { n: "01", t: "Create a profile", d: "Add your basic details and choose your photo-privacy setting.", icon: "📝" },
      { n: "02", t: "Review the details", d: "Review member-submitted profile information and any separately recorded checks.", icon: "🔎" },
      { n: "03", t: "Send an interest", d: "After owner acceptance, contact details appear in accepted-request account views; WhatsApp delivery is not confirmed.", icon: "💌" },
    ],
    pricingEyebrow: "Plans",
    pricingTitle: (price: number) => `Clear pricing — from ₹${price}`,
    planNames: ["Sambandham", "Family", "Premium", "VIP"],
    planCredits: (p99: PlanStat, p199: PlanStat, p299: PlanStat, p499: PlanStat) => [
      `${p99.profiles} interest requests`,
      `${p199.profiles} interest requests`,
      `${p299.profiles} interest requests`,
      `${p499.profiles} interest requests`,
    ],
    pricingFree: (free: number) => `Registration is free and includes the first ${free} interest requests.`,
    pricingLink: "View full pricing, add-ons and terms",
    faqEyebrow: "Help",
    faqTitle: "Frequently asked questions",
    faq: (free: number, p99: PlanStat, p199: PlanStat, p299: PlanStat, p499: PlanStat) => [
      { q: "How much does registration cost?", a: `Registration is free and includes the first ${free} interest requests. Paid plans include ${p99.profiles} requests for ₹${p99.price}, ${p199.profiles} for ₹${p199.price}, ${p299.profiles} for ₹${p299.price}, or ${p499.profiles} for ₹${p499.price}.` },
      { q: "When do I get contact access?", a: "After owner acceptance, contact details appear in accepted-request account views. A configured WhatsApp notification may include them; queue/send status does not confirm delivery or reading." },
      { q: "What does phone OTP or a review badge confirm?", a: "Phone OTP indicates access to that number only. Photo review and ID review are separate checks; none guarantees a person’s identity. Verify details independently." },
      { q: "Who can see my photo?", a: "Photo visibility depends on your profile privacy setting. Review that setting before adding a photo; copies shared online cannot be fully controlled." },
    ],
    safety: "Phone OTP indicates access to a phone number, not identity. Owner acceptance grants contact access in account views; notification delivery or reading is not confirmed.",
    safetyLink: "Safety guide",
    ctaTitle: "Start your matrimony introduction",
    ctaSub: "Register for free and review member-submitted profile details at your own pace.",
    register: "Register free",
    browse: "Browse profiles",
  },
};

export default function Home() {
  const { lang } = useLang();
  const L = TEXT[lang as Lang];
  const te = lang === "te";
  const [stats, setStats] = useState<HomeStats>(FALLBACK);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    let mounted = true;
    void apiGet<{ free_first?: unknown; plans?: unknown }>("/api/meta/home-stats").then(({ ok, data }) => {
      if (!mounted || !ok || !data || !Array.isArray(data.plans)) return;
      const incoming = new Map<string, PlanStat>();
      for (const raw of data.plans) {
        if (!raw || typeof raw !== "object") continue;
        const candidate = raw as Record<string, unknown>;
        const code = String(candidate.code ?? "");
        const price = Number(candidate.price);
        const profiles = Number(candidate.profiles ?? candidate.credits);
        if (PLAN_CODES.includes(code as (typeof PLAN_CODES)[number])
          && Number.isFinite(price) && price >= 0
          && Number.isFinite(profiles) && profiles >= 0) {
          incoming.set(code, { code, price, profiles });
        }
      }
      const plans = FALLBACK.plans.map((fallback) => incoming.get(fallback.code) ?? fallback);
      const freeFirstRaw = Number(data.free_first);
      const free_first = Number.isInteger(freeFirstRaw) && freeFirstRaw >= 0 && freeFirstRaw <= 50
        ? freeFirstRaw
        : FALLBACK.free_first;
      setStats({ free_first, plans });
    });
    return () => { mounted = false; };
  }, []);

  const p99 = planOf(stats, "S_99");
  const p199 = planOf(stats, "S_199");
  const p299 = planOf(stats, "S_299");
  const p499 = planOf(stats, "S_499");
  const planCredits = L.planCredits(p99, p199, p299, p499);
  const paidPlans = [p99, p199, p299, p499].map((plan, index) => ({
    ...plan,
    name: L.planNames[index],
    credits: planCredits[index],
  }));
  const FAQs = L.faq(stats.free_first, p99, p199, p299, p499);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_CONFIG.siteUrl}/#org`,
        name: te ? "మన వివాహ" : "Mana Vivaha",
        alternateName: te ? "Mana Vivaha" : "మన వివాహ",
        url: SITE_CONFIG.siteUrl,
        logo: `${SITE_CONFIG.siteUrl}/icons/icon-512.png`,
        ...(SITE_CONFIG.supportEmail ? { email: SITE_CONFIG.supportEmail } : {}),
        knowsLanguage: ["te", "en"],
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_CONFIG.siteUrl}/#site`,
        url: SITE_CONFIG.siteUrl,
        name: te ? "మన వివాహ — తెలుగు మ్యాట్రిమోనీ" : "Mana Vivaha — Telugu Matrimony",
        inLanguage: te ? "te-IN" : "en-IN",
        publisher: { "@id": `${SITE_CONFIG.siteUrl}/#org` },
        potentialAction: {
          "@type": "SearchAction",
          target: { "@type": "EntryPoint", urlTemplate: `${SITE_CONFIG.siteUrl}/search/{search_term_string}` },
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "FAQPage",
        mainEntity: FAQs.map((item) => ({
          "@type": "Question",
          name: item.q,
          acceptedAnswer: { "@type": "Answer", text: item.a },
        })),
      },
    ],
  };

  return (
    <div className="home-page bg-cream">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />

      <CinematicHero />
      <ProfilesOfTheDay />

      <section className="mx-auto max-w-7xl px-4 py-8" aria-label={L.howTitle}>
        <Reveal>
          <SectionHeading
            eyebrow={L.howEyebrow}
            title={L.howTitle}
            subtitle={L.howSub}
            telugu={te}
          />
        </Reveal>
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {L.howSteps().map((step, index) => (
            <Reveal key={step.n} delay={index * 60}>
              <article className="h-full rounded-3xl border border-gold/25 bg-white p-5 shadow-sm sm:p-6">
                <div className="text-2xl" aria-hidden="true">{step.icon}</div>
                <p className="mt-2 text-[11px] font-bold tracking-widest text-gold-deep">{te ? "దశ" : "STEP"} {step.n}</p>
                <h3 className="mt-1 text-base font-bold text-maroon">{step.t}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-gray-600">{step.d}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      {SITE_CONFIG.features.showPricing && (
        <section className="mx-auto max-w-7xl px-4 py-8" aria-label={te ? "ధరల సారాంశం" : "Pricing summary"}>
          <Reveal>
            <div className="mx-auto max-w-3xl">
              <SectionHeading
                eyebrow={L.pricingEyebrow}
                title={L.pricingTitle(p99.price)}
                subtitle={L.pricingFree(stats.free_first)}
                telugu={te}
                align="center"
              />
            </div>
          </Reveal>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {paidPlans.map((plan, index) => (
              <Reveal key={plan.code} delay={index * 45}>
                <article className="h-full rounded-3xl border border-gold/30 bg-white p-5 text-center shadow-sm sm:p-6">
                  <h3 className="text-base font-bold text-maroon">{plan.name}</h3>
                  <p className="mt-2 text-2xl font-extrabold text-maroon">₹{plan.price}</p>
                  <p className="mt-1 text-sm leading-relaxed text-gray-600">{plan.credits}</p>
                </article>
              </Reveal>
            ))}
          </div>
          <div className="mt-4 flex justify-center">
            <Link href="/pricing" className="inline-flex min-h-11 items-center justify-center rounded-full border border-maroon/30 bg-white px-5 py-2.5 text-center text-sm font-bold text-maroon transition hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon focus-visible:ring-offset-2">
              {L.pricingLink} <span aria-hidden="true" className="ml-1">→</span>
            </Link>
          </div>
        </section>
      )}

      {SITE_CONFIG.features.showFaq && (
        <section className="mx-auto max-w-4xl px-4 py-8" aria-label={L.faqTitle}>
          <Reveal>
            <SectionHeading eyebrow={L.faqEyebrow} title={L.faqTitle} align="center" />
          </Reveal>
          <div className="mt-5 space-y-2.5">
            {FAQs.map((item, index) => (
              <Reveal key={item.q} delay={index * 35}>
                <article className="overflow-hidden rounded-2xl border border-gold/25 bg-white shadow-sm">
                  <h3>
                    <button
                      type="button"
                      onClick={() => setOpenFaq(openFaq === index ? null : index)}
                      aria-expanded={openFaq === index}
                      className="flex min-h-12 w-full items-center justify-between gap-3 px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-maroon sm:px-5"
                    >
                      <span className="text-sm font-bold text-maroon">{item.q}</span>
                      <span aria-hidden="true" className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full maroon-gradient text-sm text-white transition-transform ${openFaq === index ? "rotate-45" : ""}`}>+</span>
                    </button>
                  </h3>
                  {openFaq === index && (
                    <p className="px-4 pb-4 text-sm leading-relaxed text-gray-700 sm:px-5">{item.a}</p>
                  )}
                </article>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-4 py-3" aria-label={te ? "భద్రత మరియు గోప్యత" : "Safety and privacy"}>
        <div className="flex flex-col gap-3 rounded-2xl border border-rose-200 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <p className="max-w-4xl text-sm leading-relaxed text-slate-700">{L.safety}</p>
          <Link href="/safety" className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full border border-maroon/25 px-4 py-2 text-xs font-bold text-maroon transition hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon focus-visible:ring-offset-2">
            {L.safetyLink} <span aria-hidden="true" className="ml-1">→</span>
          </Link>
        </div>
      </section>

      {/* The optional vendor marketplace follows the member trust/pricing journey rather than interrupting it. */}
      <HomeVendorsShowcase />

      <section className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl maroon-gradient p-5 text-white sm:p-8">
            <div className="pointer-events-none absolute -right-10 -top-14 h-48 w-48 rounded-full bg-gold/20 blur-3xl" aria-hidden="true" />
            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="max-w-2xl">
                <h2 className="text-xl font-extrabold leading-snug sm:text-2xl">{L.ctaTitle}</h2>
                <p className="mt-2 text-sm leading-relaxed text-white/90">{L.ctaSub}</p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Link href="/register" className="inline-flex min-h-11 items-center justify-center rounded-full gold-gradient px-5 py-2.5 text-sm font-bold text-maroon shadow-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-maroon">
                  {L.register} <span aria-hidden="true" className="ml-1">→</span>
                </Link>
                <Link href="/matches" className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/50 bg-white/10 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-maroon">
                  {L.browse}
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
