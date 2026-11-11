"use client";

/**
 * 👑 MANA VIVAHA — CINEMATIC SEARCH-FIRST HERO
 * ============================================
 * The hero is a *stage*, not a banner: three parallax depth layers (night
 * sky + halo, aurora veils + perspective floor, garland SVG + light motes)
 * sit behind a single luminous search card. Search is the brightest, largest
 * and highest-contrast element on the page — the profile search is the first
 * thing a visitor can act on.
 *
 * Everything is CSS + inline SVG. No video file, no canvas, no WebGL, no
 * third-party request, no paid asset. Only `transform`/`opacity` animate.
 *
 * Honesty rules kept from the previous hero:
 *  • no member photos or invented profiles anywhere in the artwork
 *  • the pricing line is the published figure (₹99 + first N interests free)
 *  • the trust rail repeats the FAQ wording, never a new promise
 *
 * Accessibility / performance:
 *  • decorative stage is `aria-hidden` and `pointer-events: none`
 *  • the stage pauses when the hero scrolls out of view or the tab is hidden
 *  • prefers-reduced-motion freezes every layer at its first frame
 *  • the only interactive content is the search card + links, in DOM order
 */

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Search, ShieldCheck, Users } from "lucide-react";
import { useLang, type Lang } from "@/lib/lang";
import HomeMatchSearch from "@/components/HomeMatchSearch";

const COPY = {
  te: {
    kicker: "తెలుగు కుటుంబాల కోసం · మన వివాహ",
    titleA: "మీ వివాహ ప్రయాణం,",
    titleB: "ఇక్కడ మొదలవుతుంది",
    lead: "సభ్యులు అందించిన వివరాలను పరిశీలించి, నచ్చినప్పుడు ఆసక్తి తెలియజేయండి.",
    pricePill: "₹99 నుంచి · మొదటి 3 interest requests ఉచితం",
    register: "ఉచిత ప్రొఫైల్ సృష్టించండి",
    viewAll: "అన్ని సంబంధాలు",
    ariaLabel: "మన వివాహ — తెలుగు వివాహ పరిచయ వేదిక",
    facts: [
      "Owner accept తర్వాతే contact వివరాలు",
      "ఫోటో కనిపించడం మీ privacy setting ప్రకారం",
      "ఫోన్ నంబర్ ఉంటే సరిపోదు — వివరాలు స్వయంగా నిర్ధారించండి",
    ],
    disclaimer: "నేపథ్య కళాకృతి సూచన కోసం మాత్రమే — సభ్యుల ప్రొఫైల్ ఫోటోలు కావు.",
    cue: "క్రిందకు స్క్రోల్ చేయండి",
  },
  en: {
    kicker: "For Telugu families · Mana Vivaha",
    titleA: "Your Telugu matrimony journey",
    titleB: "starts here.",
    lead: "Review member-submitted details, then send an interest when a family feels right.",
    pricePill: "From ₹99 · first 3 interest requests free",
    register: "Create your free profile",
    viewAll: "Browse all profiles",
    ariaLabel: "Mana Vivaha — Telugu matrimony search",
    facts: [
      "Contact details only after the profile owner accepts",
      "Photo visibility follows your profile privacy setting",
      "A phone number alone is not proof of identity — verify details yourself",
    ],
    disclaimer: "Background artwork is illustrative only — not member profile photos.",
    cue: "Scroll to explore",
  },
} as const;

const FACTS_ICONS = [ShieldCheck, Users, ShieldCheck] as const;

/** Garland arc + mandapam pillars, drawn once. Purely decorative. */
function HeroArt() {
  return (
    <svg
      className="mv-hero__art"
      viewBox="0 0 1200 720"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="mvGoldLine" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ffe9b0" stopOpacity="0" />
          <stop offset="35%" stopColor="#ffe9b0" stopOpacity="0.75" />
          <stop offset="65%" stopColor="#d4af37" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#ffe9b0" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="mvLampGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffe9b0" stopOpacity="0.95" />
          <stop offset="55%" stopColor="#f0b429" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#f0b429" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* मंडप arch: two fine gold arcs, no fill, in the depth layer */}
      <path
        d="M60 700 C 60 300, 360 120, 600 120 C 840 120, 1140 300, 1140 700"
        fill="none"
        stroke="url(#mvGoldLine)"
        strokeWidth="1.5"
      />
      <path
        d="M170 700 C 170 380, 420 220, 600 220 C 780 220, 1030 380, 1030 700"
        fill="none"
        stroke="url(#mvGoldLine)"
        strokeWidth="1"
        opacity="0.55"
      />

      {/* Mandapam pillars — thin gold rules, deliberately abstract */}
      <g stroke="url(#mvGoldLine)" strokeWidth="1.4" opacity="0.7">
        <line x1="196" y1="300" x2="196" y2="700" />
        <line x1="1004" y1="300" x2="1004" y2="700" />
        <line x1="170" y1="300" x2="222" y2="300" />
        <line x1="978" y1="300" x2="1030" y2="300" />
      </g>

      {/* Two soft lamp glows (kuthu vilakku), breathing via .mv-spark */}
      <g>
        <circle className="mv-spark" cx="196" cy="290" r="52" fill="url(#mvLampGlow)" opacity="0.6" />
        <circle className="mv-spark" cx="1004" cy="290" r="52" fill="url(#mvLampGlow)" opacity="0.6" />
      </g>

      {/* Hanging garland beads along the outer arc */}
      <g fill="#ffe9b0" opacity="0.4">
        {Array.from({ length: 22 }).map((_, index) => {
          const t = index / 21;
          const angle = Math.PI * t;
          // Rounded to 1 decimal: server and client must serialise the exact
          // same string, otherwise React reports a hydration mismatch.
          const x = Math.round((600 - Math.cos(angle) * 540) * 10) / 10;
          const y = Math.round((700 - Math.sin(angle) * 580) * 10) / 10;
          return <circle key={index} cx={x} cy={y} r={index % 3 === 0 ? 2.6 : 1.5} />;
        })}
      </g>
    </svg>
  );
}

export default function CinematicHero() {
  const { lang } = useLang();
  const L = COPY[(lang as Lang) in COPY ? (lang as Lang) : "te"];
  const heroRef = useRef<HTMLElement | null>(null);
  const [inView, setInView] = useState(true);

  // Pause the decorative stage whenever it is off-screen or the tab is hidden.
  // `animation-play-state` is the only thing that changes, so there is no
  // layout/paint work on scroll — just a compositor pause.
  useEffect(() => {
    const node = heroRef.current;
    if (!node) return;
    if (!("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(
      ([entry]) => setInView(Boolean(entry?.isIntersecting)),
      { rootMargin: "120px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={heroRef}
      className="cinematic-hero mv-hero"
      data-inview={inView ? "true" : "false"}
      aria-label={L.ariaLabel}
    >
      {/* ---- decorative depth stage (never announced, never hit-tested) ---- */}
      <div className="mv-hero__stage" aria-hidden="true">
        <span className="mv-hero__halo" />
        <span className="mv-hero__veil mv-hero__veil--a" />
        <span className="mv-hero__veil mv-hero__veil--b" />
        <HeroArt />
        <span className="mv-hero__floor" />
        <span className="mv-hero__grain" />
        {Array.from({ length: 9 }).map((_, index) => (
          <span key={index} className="mv-hero__motif" />
        ))}
      </div>

      <div className="mv-hero__inner">
        <div className="mv-hero__grid">
          {/* ---------- copy column ---------- */}
          <div className="min-w-0">
            <p className="mv-hero__kicker anim-hero">
              <span aria-hidden="true">🪔</span>
              <span>{L.kicker}</span>
            </p>

            <h1 className="mv-hero__title anim-hero-1" lang={lang === "te" ? "te-IN" : "en-IN"}>
              {L.titleA}
              <br />
              <span className="mv-hero__title-gold">{L.titleB}</span>
            </h1>

            <div className="mv-hero__rule anim-hero-2" aria-hidden="true" />

            <p className={`mv-hero__lead anim-hero-2 ${lang === "te" ? "telugu" : ""}`}>{L.lead}</p>

            <p className="mv-hero__price anim-hero-2">
              <span aria-hidden="true" className="text-[#f6d98a]">✦</span> {L.pricePill}
            </p>

            {/* Account creation stays reachable without scrolling on a phone
                (asserted by tests/visual.spec.ts). On wide screens it sits in
                the support rail, under the facts. */}
            <div className="mv-hero__actions mt-3 flex flex-wrap items-center gap-2.5 anim-hero-3 lg:hidden">
              <a href="/register" className="pill pill--on-gold mv-sheen min-h-11 px-5 text-sm">
                {L.register}
                <ArrowRight size={16} aria-hidden="true" />
              </a>
            </div>
          </div>

          {/* ---------- SEARCH: the brightest object on the page ---------- */}
          <div className="mv-hero__search anim-hero-2 min-w-0 p-0.5">
            <HomeMatchSearch />
          </div>

          {/* ---------- supporting column: secondary actions + honest facts ---------- */}
          <div className="mv-hero__support min-w-0 lg:col-start-1 lg:row-start-2">
            <div className="hidden flex-wrap items-center gap-2.5 lg:flex">
              <a href="/register" className="pill pill--on-gold mv-sheen min-h-11 px-5 text-sm">
                {L.register}
                <ArrowRight size={16} aria-hidden="true" />
              </a>
              <a href="/matches" className="pill min-h-11 px-5 text-sm text-white/90" style={{ border: "1px solid rgba(255,255,255,.34)" }}>
                <Search size={15} aria-hidden="true" />
                {L.viewAll}
              </a>
            </div>
            <ul className="mv-hero__facts">
              {L.facts.map((fact, index) => {
                const Icon = FACTS_ICONS[index] ?? ShieldCheck;
                return (
                  <li key={fact}>
                    <Icon size={13} strokeWidth={2.2} aria-hidden="true" />
                    <span className={lang === "te" ? "telugu" : ""}>{fact}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <p className="mt-4 text-[11px] leading-relaxed text-white/55">{L.disclaimer}</p>
      </div>

      <p className="mv-hero__cue" aria-hidden="true">
        <span>{L.cue}</span>
        <span aria-hidden="true">↓</span>
      </p>
    </section>
  );
}
