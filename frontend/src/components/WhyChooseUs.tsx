"use client";

/**
 * 💎 WHY CHOOSE US — premium animated trust band.
 * Real lifestyle image + animated feature list. Bilingual (te/en), reveal-on-scroll.
 */

import Link from "next/link";
import Reveal from "@/components/Reveal";
import { useLang, type Lang } from "@/lib/lang";

const COPY = {
  te: {
    eyebrow: "ఎందుకు మన వివాహ",
    title: "నమ్మకం, గోప్యత, గౌరవం — మూడూ ఒకేచోట",
    sub: "తెలంగాణ & ఆంధ్రప్రదేశ్ కుటుంబాల కోసం. Phone OTP status, సభ్యులు అందించిన profile వివరాలు, మరియు contact-sharing controls‌ను స్పష్టంగా చూపిస్తాం. పరిచయాల వివరాలను స్వతంత్రంగా నిర్ధారించుకోండి.",
    features: [
      { icon: "📱", t: "Phone OTP status", d: "OTP ఆ phone number‌కు access‌ను నిర్ధారిస్తుంది; వ్యక్తి గుర్తింపును కాదు." },
      { icon: "🔒", t: "ఫోటో గోప్యత", d: "Photo visibility‌ను మీరు ఎంచుకోండి; బయట share చేసిన కాపీలను service నియంత్రించలేదు." },
      { icon: "🤝", t: "సమ్మతితో contact sharing", d: "In-app chat లేదు. Request acceptance మరియు privacy settings ప్రకారం contact details చూపిస్తాం." },
      { icon: "💰", t: "స్పష్టమైన ధరలు", d: "ఉచిత ప్లాన్‌లో 3 interest requests + profile card; paid plans ₹99 నుంచి. Add-ons వేరు కావచ్చు." },
    ],
    cta: "ఇప్పుడే మొదలుపెట్టండి",
    badge: "సభ్యుల సమ్మతితో పరిచయాలు",
  },
  en: {
    eyebrow: "Why Mana Vivaha",
    title: "Trust, privacy and respect — all in one place",
    sub: "For families in Telangana and Andhra Pradesh. We show phone OTP status, member-provided profile details, and contact-sharing controls. Independently verify people you meet.",
    features: [
      { icon: "📱", t: "Phone OTP status", d: "OTP confirms access to a phone number, not a person’s identity." },
      { icon: "🔒", t: "Photo privacy", d: "Choose photo visibility; copies shared outside the service are beyond our control." },
      { icon: "🤝", t: "Consent-based contact sharing", d: "No in-app chat. Contact details follow request acceptance and privacy settings." },
      { icon: "💰", t: "Clear pricing", d: "Free plan: 3 interest requests + profile card. Paid plans start at ₹99; add-ons may cost extra." },
    ],
    cta: "Get started now",
    badge: "Introductions with member consent",
  },
};

export default function WhyChooseUs() {
  const { lang } = useLang();
  const L = COPY[(lang as Lang) in COPY ? (lang as Lang) : "te"];

  return (
    <section className="mx-auto max-w-7xl px-4 py-10">
      <div className="grid items-center gap-8 lg:grid-cols-2">
        {/* Illustrative privacy panel; do not imply that stock/generated people are members. */}
        <Reveal>
          <div className="relative">
            <div className="absolute -inset-3 rounded-[2.2rem] bg-gradient-to-tr from-maroon/10 via-gold/20 to-transparent blur-xl" />
            <div className="relative min-h-[300px] overflow-hidden rounded-[2rem] border border-gold/40 bg-gradient-to-br from-[#7A0C2E] via-[#4a0826] to-[#17223c] p-5 text-white shadow-brandLg sm:min-h-[400px] sm:p-8">
              <div className="pointer-events-none absolute -right-10 -top-12 h-48 w-48 rounded-full bg-amber-300/20 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-16 -left-12 h-48 w-48 rounded-full bg-rose-300/15 blur-3xl" />
              <div className="relative flex items-center gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-2xl border border-white/20 bg-white/10 text-2xl">💍</span>
                <div>
                  <div className="font-bold">Mana Vivaha</div>
                  <div className="text-xs text-amber-100">మన వివాహ · Matrimony</div>
                </div>
              </div>
              <div className="relative mx-auto my-8 flex max-w-sm items-center justify-center gap-3 sm:my-10 sm:gap-5" aria-hidden="true">
                <div className="grid h-16 w-16 place-items-center rounded-2xl border border-white/25 bg-white/10 text-3xl shadow-lg sm:h-20 sm:w-20">👤</div>
                <div className="text-2xl text-amber-200">♡</div>
                <div className="grid h-16 w-16 place-items-center rounded-2xl border border-white/25 bg-white/10 text-3xl shadow-lg sm:h-20 sm:w-20">👤</div>
              </div>
              <div className="relative rounded-2xl border border-white/15 bg-black/15 p-4 sm:p-5">
                <div className="text-lg font-bold sm:text-xl">{lang === "en" ? "You choose what to share" : "ఏమి పంచుకోవాలో మీరే ఎంచుకోండి"}</div>
                <p className="mt-1 text-sm leading-relaxed text-white/80">{lang === "en" ? "Review profile details and privacy settings before accepting an introduction." : "పరిచయాన్ని ఆమోదించే ముందు profile వివరాలు, privacy settings‌ను పరిశీలించండి."}</p>
              </div>
            </div>
            <div className="absolute -bottom-4 left-4 flex items-center gap-2 rounded-2xl bg-white/95 px-4 py-2.5 shadow-brand">
              <span className="text-lg">🤝</span>
              <span className="text-[12px] font-bold text-maroon telugu">{L.badge}</span>
            </div>
          </div>
        </Reveal>

        {/* copy side */}
        <div>
          <Reveal>
            <p className="text-[11px] font-extrabold uppercase tracking-[.28em] text-gold-deep telugu">{L.eyebrow}</p>
            <h2 className="mt-2 text-2xl font-bold leading-snug text-maroon md:text-[32px] telugu">{L.title}</h2>
            <p className="mt-3 max-w-lg text-[14px] leading-relaxed text-gray-600 telugu">{L.sub}</p>
          </Reveal>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {L.features.map((f, i) => (
              <Reveal key={f.t} delay={i * 90}>
                <div className="group flex h-full gap-3 rounded-2xl border border-gold/20 bg-white p-4 card-shadow transition hover:-translate-y-1 hover:shadow-brand">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-maroon-soft text-xl transition group-hover:scale-110">
                    {f.icon}
                  </div>
                  <div>
                    <div className="text-[14px] font-bold text-ink telugu">{f.t}</div>
                    <div className="mt-0.5 text-[12px] leading-relaxed text-gray-600 telugu">{f.d}</div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={200}>
            <Link
              href="/register"
              className="mt-6 inline-flex items-center gap-2 rounded-full maroon-gradient px-7 py-3.5 text-sm font-bold text-white shadow-brand transition hover:shadow-brandLg"
            >
              {L.cta} <span aria-hidden>→</span>
            </Link>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
