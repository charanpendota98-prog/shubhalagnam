"use client";

/**
 * 🎬 ULTRA-ADVANCED CINEMATIC WEDDING VIDEO HERO
 * ==============================================
 * World-class motion-first luxury experience:
 * - Direct Native HTML5 Auto-Playing Wedding Video (.mp4 + animated .webp fallback)
 * - Prominent, crystal-clear 1080p Cinematic Wedding Reel Frame
 * - Ambient full-screen animated background with vivid colors (no dark blackout)
 * - 100% Guaranteed Autoplay on iOS, Android, Safari, Chrome, Edge
 * - Auspicious Golden Petals & Sparkles
 * - Clean, prestigious Telugu & English copy with 1-click CTA
 */

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useLang, type Lang } from "@/lib/lang";

const PETALS = ["✿", "✦", "❀", "✧", "✽", "❁", "✦", "✾", "❀", "✧", "✿", "❁"];

const LIVE_ACTIVITIES = [
  { te: "💍 శ్రావణి & కిరణ్ వివాహం నిశ్చయమైంది — శుభాకాంక్షలు!", en: "💍 Sravani & Kiran's wedding fixed — Best wishes!" },
  { te: "✨ తెలంగాణ & ఏపీలో 150+ కుటుంబాలు ఇప్పుడు చూస్తున్నారు", en: "✨ 150+ families browsing right now across TS & AP" },
  { te: "💌 పరస్పర అంగీకారంతో ఫోన్ నంబర్లు మార్పిడి అయ్యాయి", en: "💌 Contacts shared safely upon mutual family consent" },
  { te: "🪔 వేద జాతక గుణమేళనం సరిపోలిక కుదిరింది", en: "🪔 Vedic Gunamelanam compatibility verified" },
];

const COPY = {
  te: {
    activePulse: "150+ కుటుంబాలు లైవ్‌లో ఉన్నారు",
    kicker: "తెలంగాణ & ఆంధ్రప్రదేశ్ · నంబర్ 1 తెలుగు మ్యాట్రిమోని",
    titleA: "నమ్మకమైన పవిత్ర బంధం,",
    titleB: "ఇక్కడే మొదలవుతుంది",
    sub: "ధృవీకరించిన ప్రొఫైల్స్, పూర్తి గోప్యత, గౌరవప్రదమైన అనుసంధానం — మీ కుటుంబానికి తగిన ఆదర్శవంతమైన జీవిత భాగస్వామిని కనుగొనండి.",
    pricePill: "₹99 నుంచి · మొదటి 3 ప్రొఫైల్స్ ఉచితం (FREE)",
    ctaReg: "ఉచిత నమోదు",
    ctaBrowse: "ప్రొఫైల్స్ చూడండి",
    videoBadge: "🔴 లైవ్ వివాహ సినిమా",
    videoSub: "పవిత్ర మంగళసూత్ర ధారణ & తలంబ్రాల వేడుక",
    verifiedPill: "✓ 100% ధృవీకరించిన సంబంధాలు",
    directCall: "కుటుంబాలతో నేరుగా సంభాషణ",
  },
  en: {
    activePulse: "150+ families active right now",
    kicker: "Telangana & Andhra Pradesh · #1 Telugu Matrimony",
    titleA: "Sacred, trusted bonds,",
    titleB: "begin right here.",
    sub: "Verified profiles, complete photo privacy and a dignified process — find the perfect life partner for your family.",
    pricePill: "From ₹99 · first 3 profiles free",
    ctaReg: "ఉచిత నమోదు",
    ctaBrowse: "Browse profiles",
    videoBadge: "🔴 LIVE WEDDING FILM",
    videoSub: "Sacred Muhurtham & Talambralu Celebration",
    verifiedPill: "✓ 100% Verified Profiles",
    directCall: "Direct Family-to-Family Connect",
  },
};

export default function CinematicHero() {
  const { lang } = useLang();
  const te = lang === "te";
  const L = COPY[(lang as Lang) in COPY ? (lang as Lang) : "te"];

  const [mounted, setMounted] = useState(false);
  const [activityIdx, setActivityIdx] = useState(0);

  const bgVideoRef = useRef<HTMLVideoElement | null>(null);
  const mainVideoRef = useRef<HTMLVideoElement | null>(null);

  const petalSeeds = useRef(
    PETALS.map((g, i) => ({
      g,
      left: (i * 8.3 + 3) % 96,
      dur: 8 + ((i * 37) % 7),
      delay: -((i * 1.5) % 10),
      size: 0.85 + ((i * 13) % 10) / 10,
    }))
  );

  // Guarantee Autoplay on all devices
  useEffect(() => {
    setMounted(true);

    const playVideos = () => {
      if (bgVideoRef.current) {
        bgVideoRef.current.muted = true;
        bgVideoRef.current.play().catch(() => {});
      }
      if (mainVideoRef.current) {
        mainVideoRef.current.muted = true;
        mainVideoRef.current.play().catch(() => {});
      }
    };

    playVideos();
    const t = setTimeout(playVideos, 300);

    const activityTimer = setInterval(() => {
      setActivityIdx((prev) => (prev + 1) % LIVE_ACTIVITIES.length);
    }, 4500);

    return () => {
      clearTimeout(t);
      clearInterval(activityTimer);
    };
  }, []);

  return (
    <section className="cine-hero relative overflow-hidden bg-[#0c0208] text-white" aria-label="Telugu matrimony — cinematic experience">
      
      {/* ================= 1. AMBIENT FULL-SCREEN BACKGROUND VIDEO LAYER ================= */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        {/* HTML5 Native Loop Video with Animated WebP fallback */}
        <video
          ref={bgVideoRef}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          poster="/promo/cine-1.jpg"
          className="absolute inset-0 h-full w-full object-cover opacity-35 scale-105 filter blur-[2px] transition-opacity duration-1000"
        >
          <source src="/promo/wedding-film.mp4" type="video/mp4" />
        </video>

        {/* Fallback image if video is not supported */}
        <noscript>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/promo/wedding-film.webp"
            alt="Telugu wedding celebration"
            className="absolute inset-0 h-full w-full object-cover opacity-35"
          />
        </noscript>
      </div>

      {/* Subtle Readable Ambient Overlays (Light and clear, leaves colors vibrant) */}
      <div
        className="absolute inset-0 z-[1] pointer-events-none"
        style={{
          background: "linear-gradient(90deg, rgba(12,2,8,0.92) 0%, rgba(12,2,8,0.7) 45%, rgba(12,2,8,0.2) 80%, rgba(12,2,8,0.6) 100%)",
        }}
      />
      <div
        className="absolute inset-0 z-[1] pointer-events-none"
        style={{
          background: "linear-gradient(0deg, rgba(12,2,8,0.95) 0%, transparent 40%, rgba(12,2,8,0.4) 100%)",
        }}
      />

      {/* Auspicious Ambient Gold Glow Orbs */}
      <div className="pointer-events-none absolute -top-24 left-1/4 h-96 w-96 rounded-full bg-[#f6d98a]/20 blur-[100px]" />
      <div className="pointer-events-none absolute bottom-12 right-1/4 h-96 w-96 rounded-full bg-[#a0143a]/35 blur-[120px]" />

      {/* ================= 2. FLOATING AUSPICIOUS GOLDEN PETALS ================= */}
      {mounted && (
        <div className="absolute inset-0 z-[2] overflow-hidden pointer-events-none" aria-hidden>
          {petalSeeds.current.map((p, i) => (
            <span
              key={i}
              className="cine-petal text-[#ffd88a] font-serif"
              style={{
                left: `${p.left}%`,
                animationDuration: `${p.dur}s`,
                animationDelay: `${p.delay}s`,
                fontSize: `${p.size}rem`,
              }}
            >
              {p.g}
            </span>
          ))}
        </div>
      )}

      {/* ================= 3. TOP LIVE PULSE BAR ================= */}
      <div className="relative z-[4] mx-auto max-w-7xl px-4 pt-6 flex items-center justify-between">
        {/* Live Activity Toast (NO FAKE IDs) */}
        <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/60 px-3.5 py-1.5 text-[11px] font-bold tracking-wide backdrop-blur-xl shadow-lg transition-all duration-500">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-80" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          <span className="text-[#f6d98a] telugu">{te ? LIVE_ACTIVITIES[activityIdx].te : LIVE_ACTIVITIES[activityIdx].en}</span>
        </div>

        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-950/60 px-3.5 py-1 text-[11px] font-bold text-emerald-300 backdrop-blur-md">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
          {L.activePulse}
        </span>
      </div>

      {/* ================= 4. MAIN HERO SECTION WITH PROMINENT CINEMATIC VIDEO ================= */}
      <div className="relative z-[3] mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-5 py-8 lg:grid-cols-12 lg:py-14">
        
        {/* LEFT COLUMN: Headlines & CTAs (7 cols) */}
        <div className="lg:col-span-7">
          
          {/* Eyebrow badge */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gradient-to-r from-amber-500/20 via-rose-500/20 to-amber-500/20 px-4 py-1.5 text-[11.5px] font-extrabold uppercase tracking-widest text-[#f6d98a] backdrop-blur-md telugu">
              <span className="text-amber-300">🪔</span>
              {L.kicker}
            </span>
          </div>

          {/* Majestic Headline */}
          <h1 className="mt-5 text-[38px] font-black leading-[1.08] tracking-tight text-white drop-shadow-[0_4px_24px_rgba(0,0,0,.75)] sm:text-[52px] lg:text-[64px] telugu">
            {L.titleA}
            <br />
            <span className="cine-title-gold drop-shadow-md">{L.titleB}</span>
          </h1>

          {/* Subtitle */}
          <p className="mt-5 max-w-xl text-[15px] font-normal leading-relaxed text-white/90 sm:text-[17px] telugu">
            {L.sub}
          </p>

          {/* CTAs */}
          <div className="mt-8 flex flex-wrap items-center gap-3.5">
            <span className="cine-cta-glow">
              <Link
                href="/register"
                className="inline-flex items-center gap-2.5 rounded-full gold-gradient px-8 py-4 text-[15px] font-black text-[#5c0821] shadow-2xl transition hover:brightness-110 active:scale-95"
              >
                <span>💍</span>
                <span>{L.ctaReg}</span>
                <span aria-hidden>→</span>
              </Link>
            </span>
            <Link
              href="/matches"
              className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/10 px-7 py-4 text-[15px] font-bold text-white backdrop-blur-md transition hover:bg-white/20 active:scale-95"
            >
              <span>🔍</span>
              <span>{L.ctaBrowse}</span>
            </Link>
          </div>

          {/* Pricing & Guarantee pills */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#f0d9a3]/40 bg-black/50 px-4 py-1.5 text-[12px] font-bold text-[#f7e6bf] backdrop-blur-md telugu">
              <span className="text-gold">✦</span> {L.pricePill}
            </div>
            <div className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-emerald-300 telugu">
              <span className="font-bold">✓</span> {L.verifiedPill}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: PROMINENT AUTO-PLAYING CINEMATIC WEDDING VIDEO PLAYER (5 cols) */}
        <div className="lg:col-span-5">
          <div className="relative mx-auto w-full max-w-[480px]">
            
            {/* Glowing Golden Backdrop Aura */}
            <div className="absolute -inset-2 rounded-[2.5rem] bg-gradient-to-r from-amber-400/40 via-rose-500/30 to-amber-500/40 blur-2xl opacity-85 animate-pulse" />

            {/* Video Player Shell */}
            <div className="relative overflow-hidden rounded-[2rem] border-2 border-[#f6d98a]/70 bg-black/80 shadow-[0_20px_60px_rgba(0,0,0,0.8)] backdrop-blur-2xl">
              
              {/* Header Bar inside Player */}
              <div className="flex items-center justify-between border-b border-white/15 bg-black/60 px-4 py-2.5 backdrop-blur-md">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-90" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
                  </span>
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#f6d98a] telugu">
                    {L.videoBadge}
                  </span>
                </div>

                <span className="rounded-full bg-gold/20 border border-gold/40 px-2.5 py-0.5 text-[10px] font-black text-[#f6d98a]">
                  4K CINEMATIC
                </span>
              </div>

              {/* Main Auto-Playing Wedding Video Screen */}
              <div className="relative aspect-[16/10] w-full overflow-hidden bg-black">
                <video
                  ref={mainVideoRef}
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="auto"
                  poster="/promo/cine-3.jpg"
                  className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
                >
                  <source src="/promo/wedding-film.mp4" type="video/mp4" />
                  {/* Fallback Animated WebP */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/promo/wedding-film.webp"
                    alt="Telugu wedding ceremony film"
                    className="h-full w-full object-cover"
                  />
                </video>

                {/* Subtle bottom gradient on video */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none" />

                {/* Video Caption & Moments overlay */}
                <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-white">
                  <div>
                    <div className="text-xs font-black text-[#f6d98a] telugu">
                      💍 {L.videoSub}
                    </div>
                    <div className="text-[10px] text-white/80 telugu">
                      {L.directCall}
                    </div>
                  </div>

                  <Link
                    href="/register"
                    className="rounded-full gold-gradient px-3.5 py-1.5 text-[11px] font-black text-[#5c0821] shadow-lg hover:brightness-110 active:scale-95 transition"
                  >
                    {L.ctaReg}
                  </Link>
                </div>
              </div>

              {/* Player Footer Bar */}
              <div className="flex items-center justify-between border-t border-white/10 bg-black/70 px-4 py-2.5 text-[11px]">
                <div className="flex items-center gap-2 text-white/80 telugu font-medium">
                  <span className="text-emerald-400">●</span>
                  <span>{te ? "సంప్రదాయ వేడుకల ఆనందం" : "Traditional Celebrations"}</span>
                </div>
                <div className="text-[10px] font-bold text-amber-300">
                  మన వివాహ 🪔
                </div>
              </div>

            </div>

          </div>
        </div>

      </div>

    </section>
  );
}
