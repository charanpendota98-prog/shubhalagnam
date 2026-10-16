"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Reveal from "@/components/Reveal";
import { Badge, Button, Card, CardBody } from "@/components/ui";
import ProfilesOfTheDay from "@/components/ProfilesOfTheDay";
import HomeVendorsShowcase from "@/components/HomeVendorsShowcase";
import CinematicHero from "@/components/CinematicHero";
import { SITE_CONFIG } from "@/lib/site-config";
import { serializeJsonLd } from "@/lib/safe-json-ld";
import { apiGet } from "@/lib/api";
import { useLang, type Lang } from "@/lib/lang";
import { ArrowRight, EyeOff, Gift, ShieldCheck, UserCheck } from "lucide-react";

/** Trust-rail icons — decorative only; the copy below states the actual rules. */
const TRUST_ICONS = [Gift, UserCheck, EyeOff, ShieldCheck] as const;

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
    trust: (free: number) => [
      `నమోదు ఉచితం — మొదటి ${free} interest requests ఉచితం`,
      "Profile owner accept చేసిన తర్వాతే contact వివరాలు",
      "ఫోటో గోప్యత — మీ privacy setting ప్రకారం",
      "Phone OTP అంటే నంబర్‌కు access; గుర్తింపు హామీ కాదు",
    ],
    perRequest: (value: number) => `ఒక్కో request ≈ ₹${value}`,
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
    trust: (free: number) => [
      `Registration is free — first ${free} interest requests included`,
      "Contact details only after the profile owner accepts",
      "Photo visibility follows your privacy setting",
      "Phone OTP shows access to a number, not proof of identity",
    ],
    perRequest: (value: number) => `≈ ₹${value} per request`,
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
  const trustItems = L.trust(stats.free_first);

  // Derived from the same plan figures shown above — an arithmetic rounding of
  // published prices, not a new claim or a price promise.
  const perRequest = (plan: PlanStat): number | null => {
    if (!(plan.profiles > 0) || !(plan.price > 0)) return null;
    const value = plan.price / plan.profiles;
    return Number.isFinite(value) ? Math.round(value) : null;
  };

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

  const tg = te ? "telugu" : "";

  return (
    <div className="home-page bg-cream">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />

      <CinematicHero />

      {/* The same rules the FAQ states, repeated where a first-time visitor
          actually looks — no new numbers, no new promises. */}
      <section className="hp-shell" aria-label={te ? "ముఖ్య నిబంధనలు" : "Key terms at a glance"}>
        <ul className="hp-trust">
          {trustItems.map((item, index) => {
            const Icon = TRUST_ICONS[index] ?? ShieldCheck;
            return (
              <li key={item} className="hp-trust__item">
                <span className="hp-trust__icon" aria-hidden="true">
                  <Icon strokeWidth={2} />
                </span>
                <span className={`hp-trust__text ${tg}`}>{item}</span>
              </li>
            );
          })}
        </ul>
      </section>

      <ProfilesOfTheDay />

      <section className="hp-shell hp-section" aria-label={L.howTitle}>
        <Reveal>
          <Badge>{L.howEyebrow}</Badge>
          <h2 className={`hp-title ${tg}`}>{L.howTitle}</h2>
          <p className={`hp-sub ${tg}`}>{L.howSub}</p>
        </Reveal>
        <div className="hp-steps">
          {L.howSteps().map((step, index) => (
            <Reveal key={step.n} delay={index * 60}>
              <Card as="article" tone="brand" interactive className="hp-stretch">
                <CardBody>
                  <div className="hp-step__top">
                    <span className="hp-step__icon" aria-hidden="true">{step.icon}</span>
                    <span className="hp-step__num">{te ? "దశ" : "STEP"} {step.n}</span>
                  </div>
                  <h3 className={`hp-step__title ${tg}`}>{step.t}</h3>
                  <p className={`hp-step__text ${tg}`}>{step.d}</p>
                </CardBody>
              </Card>
            </Reveal>
          ))}
        </div>
      </section>

      {SITE_CONFIG.features.showPricing && (
        <section className="hp-shell hp-section" aria-label={te ? "ధరల సారాంశం" : "Pricing summary"}>
          <Reveal>
            <div className="hp-center">
              <Badge>{L.pricingEyebrow}</Badge>
              <h2 className={`hp-title ${tg}`}>{L.pricingTitle(p99.price)}</h2>
              <p className={`hp-sub ${tg}`}>{L.pricingFree(stats.free_first)}</p>
            </div>
          </Reveal>
          <div className="hp-price-grid">
            {paidPlans.map((plan, index) => {
              const unit = perRequest(plan);
              return (
                <Reveal key={plan.code} delay={index * 45}>
                  <Card as="article" tone="brand" interactive className="hp-stretch hp-price">
                    <CardBody>
                      <h3 className={`hp-price__name ${tg}`}>{plan.name}</h3>
                      <p className="hp-price__amount">₹{plan.price}</p>
                      <p className="hp-price__credits">{plan.credits}</p>
                      {unit !== null && <p className="hp-price__unit">{L.perRequest(unit)}</p>}
                    </CardBody>
                  </Card>
                </Reveal>
              );
            })}
          </div>
          <div className="mt-6 flex justify-center">
            <Button href="/pricing" variant="outline" iconRight={<ArrowRight size={15} aria-hidden="true" />}>
              {L.pricingLink}
            </Button>
          </div>
        </section>
      )}

      {SITE_CONFIG.features.showFaq && (
        <section className="hp-shell hp-section" aria-label={L.faqTitle}>
          <Reveal>
            <div className="hp-center">
              <Badge>{L.faqEyebrow}</Badge>
              <h2 className={`hp-title ${tg}`}>{L.faqTitle}</h2>
            </div>
          </Reveal>
          <div className="hp-faq">
            {FAQs.map((item, index) => (
              <Reveal key={item.q} delay={index * 35}>
                <article className="hp-faq__item" data-open={openFaq === index}>
                  <h3>
                    <button
                      type="button"
                      onClick={() => setOpenFaq(openFaq === index ? null : index)}
                      aria-expanded={openFaq === index}
                      className="hp-faq__q"
                    >
                      <span>{item.q}</span>
                      <span className="hp-faq__icon" aria-hidden="true">+</span>
                    </button>
                  </h3>
                  {openFaq === index && (
                    <p className="hp-faq__a">{item.a}</p>
                  )}
                </article>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      <section className="hp-shell hp-section--tight" aria-label={te ? "భద్రత మరియు గోప్యత" : "Safety and privacy"}>
        <div className="hp-safety">
          <div className="hp-safety__lead">
            <span className="hp-safety__icon" aria-hidden="true">
              <ShieldCheck strokeWidth={2} />
            </span>
            <p className={`hp-safety__text ${tg}`}>{L.safety}</p>
          </div>
          <Button href="/safety" variant="outline" className="shrink-0" iconRight={<ArrowRight size={15} aria-hidden="true" />}>
            {L.safetyLink}
          </Button>
        </div>
      </section>

      {/* The optional vendor marketplace follows the member trust/pricing journey rather than interrupting it. */}
      <HomeVendorsShowcase />

      <section className="hp-shell hp-section--tight pb-4">
        <Reveal>
          <div className="hp-cta">
            <div className="hp-cta__dots" aria-hidden="true" />
            <div className="hp-cta__glow" aria-hidden="true" />
            <div className="hp-cta__inner">
              <div className="min-w-0">
                <h2 className={`hp-cta__title ${tg}`}>{L.ctaTitle}</h2>
                <p className={`hp-cta__sub ${tg}`}>{L.ctaSub}</p>
              </div>
              <div className="hp-cta__actions">
                <Button
                  href="/register"
                  variant="primary"
                  size="lg"
                  iconRight={<ArrowRight size={16} aria-hidden="true" />}
                >
                  {L.register}
                </Button>
                <Button href="/matches" variant="light" size="lg">
                  {L.browse}
                </Button>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
