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
    sub: "లక్షలాది తెలుగు కుటుంబాలు నమ్మిన వేదిక. మీ వివరాలు సురక్షితం, మీ ఎంపిక మీ చేతిలో.",
    features: [
      { icon: "🛡️", t: "ధృవీకరించిన ప్రొఫైల్స్", d: "OTP + వయసు ధృవీకరణ — నకిలీ ప్రొఫైల్స్‌కి చోటు లేదు." },
      { icon: "🔒", t: "ఫోటో గోప్యత", d: "మీ ఫోటోలు మీ అనుమతితోనే కనిపిస్తాయి — వాటర్‌మార్క్ రక్షణ." },
      { icon: "🤝", t: "నేరుగా పరిచయం", d: "చాటింగ్ లేదు. రెండు వైపులా ఇష్టపడితేనే నంబర్ ఇచ్చిపుచ్చుకోవడం." },
      { icon: "💰", t: "సరసమైన ధరలు", d: "₹99 నుంచి · మొదటి 3 ప్రొఫైల్స్ ఉచితం · దాచిన ఛార్జీలు లేవు." },
    ],
    cta: "ఇప్పుడే మొదలుపెట్టండి",
    badge: "10,000+ కుటుంబాల నమ్మకం",
  },
  en: {
    eyebrow: "Why Mana Vivaha",
    title: "Trust, privacy and respect — all in one place",
    sub: "A platform trusted by lakhs of Telugu families. Your details stay safe, your choice stays yours.",
    features: [
      { icon: "🛡️", t: "Verified profiles", d: "OTP + age verification — no room for fake profiles." },
      { icon: "🔒", t: "Photo privacy", d: "Your photos show only with your consent — watermark protected." },
      { icon: "🤝", t: "Direct introduction", d: "No chatting. Numbers exchange only when both sides agree." },
      { icon: "💰", t: "Fair pricing", d: "From ₹99 · first 3 profiles free · no hidden charges." },
    ],
    cta: "Get started now",
    badge: "Trusted by 10,000+ families",
  },
};

export default function WhyChooseUs() {
  const { lang } = useLang();
  const L = COPY[(lang as Lang) in COPY ? (lang as Lang) : "te"];

  return (
    <section className="mx-auto max-w-7xl px-4 py-10">
      <div className="grid items-center gap-8 lg:grid-cols-2">
        {/* image side */}
        <Reveal>
          <div className="relative">
            <div className="absolute -inset-3 rounded-[2.2rem] bg-gradient-to-tr from-maroon/10 via-gold/20 to-transparent blur-xl" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/promo/app-couple.jpg"
              alt={lang === "en" ? "A happy Telugu couple using Mana Vivaha" : "మన వివాహ వాడుతున్న సంతోషకరమైన జంట"}
              className="relative w-full rounded-[2rem] border border-gold/30 object-cover shadow-brandLg"
              loading="lazy"
            />
            <div className="absolute -bottom-4 left-4 flex items-center gap-2 rounded-2xl bg-white/95 px-4 py-2.5 shadow-brand backdrop-blur">
              <span className="text-lg">💞</span>
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
