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
  },
} as const;

const FACTS_ICONS = [ShieldCheck, Users, ShieldCheck] as const;

/**
 * Decorative gold "mandapam base" — drawn in its OWN layout band, below the
 * copy block, never as an overlay across it.
 *
 * The previous version floated a full-width arch inside the stage, which meant
 * the curve swept straight through the Telugu headline and the subtitle at
 * every window size. Line art can never be made safe that way: the copy column
 * moves with the layout, the arc does not. So the ornament now owns reserved
 * space — `.mv-hero__basan` sits in normal flow *after* the content and gets a
 * fixed height — which guarantees real separation (the hero's own bottom
 * padding plus the band's top offset) at 320 → 1920 px, at every animation
 * frame, including the reduced-motion static frame.
 *
 * Everything here is `aria-hidden`, `pointer-events: none`, and animates only
 * `transform`/`opacity`.
 */

/** Garland swag: sampled once so the bead ring sits exactly on the stroke. */
const SWAG_STEPS = 40;
const SWAG = Array.from({ length: SWAG_STEPS + 1 }, (_, i) => {
  const t = i / SWAG_STEPS;
  return {
    // Rounded to 1 decimal so SSR and the client serialise identical strings.
    x: Math.round((-40 + 1280 * t) * 10) / 10,
    y: Math.round((14 + 62 * Math.sin(Math.PI * t)) * 10) / 10,
  };
});

function HeroArt() {
  return (
    <div className="mv-hero__basan" aria-hidden="true">
      <svg
        className="mv-hero__art"
        viewBox="0 0 1200 120"
        preserveAspectRatio="none"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <linearGradient id="mvGoldLine" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#ffe9b0" stopOpacity="0" />
            <stop offset="22%" stopColor="#ffe9b0" stopOpacity="0.5" />
            <stop offset="50%" stopColor="#ffe9b0" stopOpacity="0.8" />
            <stop offset="78%" stopColor="#d4af37" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#ffe9b0" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="mvLampGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffe9b0" stopOpacity="0.9" />
            <stop offset="55%" stopColor="#f0b429" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#f0b429" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Two garland swags, hung between the corner lamps. `none` aspect +
            non-scaling strokes keep the hairlines even at every width. */}
        <polyline
          points={SWAG.map((p) => `${p.x},${p.y}`).join(" ")}
          fill="none"
          stroke="url(#mvGoldLine)"
          strokeWidth="1.4"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        <polyline
          points={SWAG.map((p) => `${p.x},${p.y + 16}`).join(" ")}
          fill="none"
          stroke="url(#mvGoldLine)"
          strokeWidth="1"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          opacity="0.5"
        />

        {/* Beads strung along the swag. */}
        <g fill="#ffe9b0" opacity="0.4">
          {SWAG.filter((_, i) => i % 2 === 0).map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={i % 3 === 0 ? 1.9 : 1.1} />
          ))}
        </g>

        {/* Corner lamps (kuthu vilakku), breathing via .mv-spark. */}
        <circle className="mv-spark" cx="62" cy="42" r="52" fill="url(#mvLampGlow)" opacity="0.55" />
        <circle className="mv-spark" cx="1138" cy="42" r="52" fill="url(#mvLampGlow)" opacity="0.55" />

        {/* Tassels hanging from the swag's ends — the only downward strokes,
            and they stop well inside the band. */}
        <g stroke="url(#mvGoldLine)" strokeWidth="1" vectorEffect="non-scaling-stroke" opacity="0.6">
          <line x1="196" y1="38" x2="196" y2="86" />
          <line x1="1004" y1="38" x2="1004" y2="86" />
        </g>
        <g fill="#ffe9b0" opacity="0.5">
          <circle cx="196" cy="90" r="2.2" />
          <circle cx="1004" cy="90" r="2.2" />
        </g>

        {/* A last, very soft pool of light so the band reads as a lit floor
            rather than a floating line. */}
        <ellipse cx="600" cy="112" rx="520" ry="26" fill="url(#mvLampGlow)" opacity="0.18" />
      </svg>
    </div>
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
        <span className="mv-hero__floor" />
        <span className="mv-hero__grain" />
        <span className="mv-hero__scrim" />
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

      {/* Ornament band: reserved space, strictly below all copy. */}
      <HeroArt />
    </section>
  );
}
