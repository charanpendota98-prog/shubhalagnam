"use client";

/**
 * 💍 THE TELUGU WEDDING, STEP BY STEP
 * ===================================
 * Replaces the old scroll-through AI-photo film (12 MB of promo imagery plus a
 * 696 KB background video) with an honest, content-first section:
 *
 *  • original SVG art drawn here (mandapam, thali, talambralu, garlands),
 *    no photographs, so nothing can be mistaken for a member profile;
 *  • the real ritual sequence, each step linked to the page that already
 *    covers it (muhurtham, porutham, lagna-patrika, pelli-choopulu, pricing);
 *  • empty states are not needed — this section is editorial content, not
 *    user-generated, and it never claims to be anyone's story.
 *
 * Motion: the four scene cards enter with one shared, staggered fade/rise,
 * driven by an IntersectionObserver so nothing animates off-screen. Layered
 * SVG "depth" (soft glow + arc + beads) gives the section the same cinematic
 * language as the hero without any media weight.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useLang } from "@/lib/lang";

const COPY = {
  en: {
    eyebrow: "The Telugu wedding",
    title: "Four moments every family plans for",
    lead: "Mana Vivaha helps families find each other first. Understanding the ceremony makes those first conversations easier — here is the sequence, and where each planning tool lives.",
    note: "Artwork on this page is original illustration, not member photographs.",
    steps: [
      {
        n: "01",
        title: "Pelli choopulu",
        body: "The first meeting between the two families. Keep the conversation about the details each person has actually shared.",
        href: "/pelli-choopulu",
        link: "How the first meeting works",
      },
      {
        n: "02",
        title: "Porutham & muhurtham",
        body: "Families compare horoscopes in the way they choose, then agree a date. Tools here show the entered details; they never issue a verdict.",
        href: "/porutham",
        link: "Compare porutham",
      },
      {
        n: "03",
        title: "Lagna patrika",
        body: "The invitation is written. Our studio arranges the details you enter into a printable patrika layout.",
        href: "/lagna-patrika",
        link: "Open the patrika studio",
      },
      {
        n: "04",
        title: "The mandapam",
        body: "Thali, talambralu, garlands — the ceremony itself, with the vendors a family books around it.",
        href: "/vendors",
        link: "Browse wedding services",
      },
    ],
  },
  te: {
    eyebrow: "తెలుగు వివాహం",
    title: "ప్రతి కుటుంబం ప్లాన్ చేసే నాలుగు దశలు",
    lead: "మన వివాహ మొదట కుటుంబాలను కలిపే వేదిక. వివాహ ఆచారాలను తెలుసుకోవడం మొదటి సంభాషణను సులభం చేస్తుంది — క్రమం ఇక్కడ, ప్రతి దశకు సంబంధిత సాధనం కూడా.",
    note: "ఇక్కడ చూపిన చిత్రాలు మా స్వంత బొమ్మలు — సభ్యుల ఫోటోలు కావు.",
    steps: [
      {
        n: "01",
        title: "పెళ్లి చూపులు",
        body: "రెండు కుటుంబాల మొదటి పరిచయం. ఒకరు నమోదు చేసిన వివరాల గురించే మాట్లాడండి.",
        href: "/pelli-choopulu",
        link: "మొదటి పరిచయం ఎలా",
      },
      {
        n: "02",
        title: "పొరుతం & ముహూర్తం",
        body: "కుటుంబాలు తమ పద్ధతిలో జాతకాలను పోల్చుకుని ముహూర్తం నిర్ణయించుకుంటాయి. ఇక్కడి సాధనాలు నమోదు చేసిన వివరాలను మాత్రమే చూపుతాయి; తీర్పు ఇవ్వవు.",
        href: "/porutham",
        link: "పొరుతం చూడండి",
      },
      {
        n: "03",
        title: "లగ్న పత్రిక",
        body: "పిలుపు పత్రిక రాయడం మొదలవుతుంది. మీరు ఇచ్చిన వివరాలతో ముద్రించదగిన పత్రిక లేఅవుట్‌ను సిద్ధం చేస్తాం.",
        href: "/lagna-patrika",
        link: "పత్రిక స్టూడియో",
      },
      {
        n: "04",
        title: "మండపం",
        body: "మంగళసూత్రం, తలంబ్రాలు, పూలమాలలు — వేడుక, దానికి కావాల్సిన పెళ్లి సేవలతో సహా.",
        href: "/vendors",
        link: "పెళ్లి సేవలు చూడండి",
      },
    ],
  },
} as const;

type StepArt = 0 | 1 | 2 | 3;

/** Four small original illustrations — 96×96 viewBox, currentColor + gold. */
function StepIcon({ index }: { index: StepArt }) {
  const common = {
    viewBox: "0 0 96 96",
    width: 44,
    height: 44,
    fill: "none" as const,
    "aria-hidden": true as const,
    focusable: "false" as const,
  };
  if (index === 0) {
    // Two houses meeting: peacock feather / flower motif simplified.
    return (
      <svg {...common}>
        <path d="M10 62 L30 40 L50 62" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
        <path d="M46 62 L66 40 L86 62" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
        <path d="M30 62v20h20V62M66 62v20" stroke="currentColor" strokeWidth="1.6" opacity="0.65" />
        <circle cx="48" cy="30" r="5.5" stroke="#D4AF37" strokeWidth="2" />
        <path d="M40 30h-6M62 30h-6" stroke="#D4AF37" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  if (index === 1) {
    // Two horoscope squares side by side.
    return (
      <svg {...common}>
        <rect x="8" y="26" width="36" height="36" rx="4" stroke="currentColor" strokeWidth="2" />
        <rect x="52" y="26" width="36" height="36" rx="4" stroke="currentColor" strokeWidth="2" />
        <path d="M26 26v36M8 44h36M70 26v36M52 44h36" stroke="currentColor" strokeWidth="1.2" opacity="0.55" />
        <circle cx="48" cy="44" r="4" fill="#D4AF37" />
      </svg>
    );
  }
  if (index === 2) {
    // Invitation card with a gold corner flourish.
    return (
      <svg {...common}>
        <rect x="20" y="16" width="56" height="66" rx="5" stroke="currentColor" strokeWidth="2" />
        <path d="M30 34h36M30 44h36M30 54h22" stroke="currentColor" strokeWidth="1.6" opacity="0.6" strokeLinecap="round" />
        <path d="M64 62c6 0 10 4 10 10" stroke="#D4AF37" strokeWidth="2" strokeLinecap="round" />
        <circle cx="64" cy="62" r="2.6" fill="#D4AF37" />
      </svg>
    );
  }
  // Mandapam with a lamp.
  return (
    <svg {...common}>
      <path d="M14 42C14 26 30 14 48 14s34 12 34 28" stroke="currentColor" strokeWidth="2.2" />
      <path d="M20 42v34M76 42v34" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M12 42h16M68 42h16" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M38 76c0-8 4-12 10-12s10 4 10 12" stroke="currentColor" strokeWidth="1.6" opacity="0.6" />
      <circle cx="48" cy="56" r="4.6" fill="#D4AF37" />
    </svg>
  );
}

export default function WeddingStorySection() {
  const { lang } = useLang();
  const te = lang === "te";
  const L = te ? COPY.te : COPY.en;
  const ref = useRef<HTMLElement | null>(null);
  const [lit, setLit] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (!("IntersectionObserver" in window)) {
      setLit(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setLit(true);
          observer.disconnect();
        }
      },
      { threshold: 0.18 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className="hp-shell hp-section mv-story"
      data-lit={lit ? "true" : "false"}
      aria-labelledby="mv-story-title"
    >
      <div className="mv-story__card">
        <div className="mv-story__glow" aria-hidden="true" />

        <div className="relative">
          <p className="mv-story__eyebrow">{L.eyebrow}</p>
          <h2 id="mv-story-title" className={`hp-title !mt-1.5 ${te ? "telugu" : ""}`}>
            {L.title}
          </h2>
          <p className={`hp-sub ${te ? "telugu" : ""}`}>{L.lead}</p>
        </div>

        <ol className="mv-story__steps">
          {L.steps.map((step, index) => (
            <li key={step.n} className="mv-story__step" style={{ animationDelay: `${index * 90}ms` }}>
              <span className="mv-story__icon" aria-hidden="true">
                <StepIcon index={index as StepArt} />
              </span>
              <span className="mv-story__num" aria-hidden="true">{step.n}</span>
              <div className="min-w-0">
                <h3 className={`mv-story__title ${te ? "telugu" : ""}`}>{step.title}</h3>
                <p className={`mv-story__body ${te ? "telugu" : ""}`}>{step.body}</p>
                <Link href={step.href} className="mv-story__link">
                  {step.link}
                  <ArrowRight size={13} aria-hidden="true" />
                </Link>
              </div>
            </li>
          ))}
        </ol>

        <p className="mv-story__note">{L.note}</p>
      </div>
    </section>
  );
}
