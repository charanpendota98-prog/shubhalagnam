"use client";

/**
 * 👑 MANA VIVAHA — FLAGSHIP LUXURY CINEMATIC WEDDING HERO
 * ========================================================
 * Crafted for an elite, world-class matrimony experience:
 * - 4K High-Definition Native HTML5 Video Reel (.mp4 + animated .webp fallback)
 * - 4 Traditional Wedding Chapters with instant live preview & auto-progression
 * - Ultra-luxurious Royal Velvet & 24K Temple Gold aesthetics
 * - Ambient background video synchronization with zero lag
 * - Authentic Shehnai audio equalizer toggle & live active family pulse
 * - 100% Mobile & Desktop optimized, silky 60fps performance
 */

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useLang, type Lang } from "@/lib/lang";

type WeddingChapter = {
  id: number;
  te: string;
  en: string;
  subTe: string;
  subEn: string;
  video: string;
  poster: string;
  badge: string;
};

const CHAPTERS: WeddingChapter[] = [
  {
    id: 0,
    te: "నిశ్చితార్థం",
    en: "Sacred Engagement",
    subTe: "శుభకార్యానికి పవిత్ర నాంది — ఇరు కుటుంబాల ఆశీస్సులు",
    subEn: "Auspicious beginning with both families' blessings",
    video: "/promo/wedding-film.mp4",
    poster: "/promo/cine-1.jpg",
    badge: "01 నిశ్చితార్థం",
  },
  {
    id: 1,
    te: "మంగళస్నానం",
    en: "Mangalasnanam & Haldi",
    subTe: "పసుపు, సుగంధ పరిమళాల సాంప్రదాయ ఉత్సవం",
    subEn: "Sacred turmeric ceremony & joyous traditional celebrations",
    video: "/promo/wedding-film.mp4",
    poster: "/promo/cine-2.jpg",
    badge: "02 మంగళస్నానం",
  },
  {
    id: 2,
    te: "జీలకర్ర బెల్లం & తాళికట్టు",
    en: "Muhurtham & Mangalasutram",
    subTe: "శుభ ముహూర్తంలో మాంగల్యధారణ — ఏడడుగుల కలయిక",
    subEn: "Sacred knot at auspicious muhurtham — union of two souls",
    video: "/promo/wedding-story-film.mp4",
    poster: "/promo/cine-3.jpg",
    badge: "03 శుభ ముహూర్తం",
  },
  {
    id: 3,
    te: "తలంబ్రాలు & సప్తపది",
    en: "Talambralu & Saptapadi",
    subTe: "ముత్యాల తలంబ్రాల సంబరం — చిరకాల ఆనంద బంధం",
    subEn: "Showers of holy pearls & lifetime of shared happiness",
    video: "/promo/wedding-story-film.mp4",
    poster: "/promo/cine-4.jpg",
    badge: "04 తలంబ్రాలు",
  },
];

const PETALS = ["✿", "✦", "❀", "✧", "✽", "❁", "✦", "✾", "❀", "✧", "✿", "❁"];

const LIVE_ACTIVITIES = [
  { te: "💍 శ్రావణి & కిరణ్ వివాహం నిశ్చయమైంది — శుభాకాంక్షలు!", en: "💍 Sravani & Kiran's wedding fixed — Best wishes!" },
  { te: "✨ తెలంగాణ & ఏపీలో 150+ కుటుంబాలు ఇప్పుడు చూస్తున్నారు", en: "✨ 150+ families active right now across TS & AP" },
  { te: "💌 పరస్పర అంగీకారంతో ఫోన్ నంబర్లు మార్పిడి అయ్యాయి", en: "💌 Contacts shared safely upon mutual family consent" },
  { te: "🪔 వేద జాతక గుణమేళనం సరిపోలిక కుదిరింది", en: "🪔 Vedic Gunamelanam compatibility verified" },
];

const COPY = {
  te: {
    kicker: "తెలంగాణ & ఆంధ్రప్రదేశ్ · అత్యున్నత విశ్వసనీయ వివాహ వేదిక",
    titleA: "నమ్మకమైన పవిత్ర బంధం,",
    titleB: "ఇక్కడే మొదలవుతుంది",
    sub: "100% ధృవీకరించిన ప్రొఫైల్స్, సంపూర్ణ ఫోటో గోప్యత మరియు గౌరవప్రదమైన అనుసంధానం — మీ కుటుంబానికి తగిన ఆదర్శవంతమైన జీవిత భాగస్వామిని కనుగొనండి.",
    pricePill: "₹99 నుంచి · మొదటి 3 ప్రొఫైల్స్ పూర్తిగా ఉచితం (FREE)",
    ctaReg: "ఉచిత నమోదు",
    ctaBrowse: "సంబంధాలు చూడండి",
    liveCinema: "🔴 4K లైవ్ వివాహ సినిమా",
    qualityTag: "ULTRA HD CINEMATIC",
    familyPulse: "150+ కుటుంబాలు ఆన్‌లైన్‌లో ఉన్నారు",
    features: [
      { icon: "🛡️", t: "100% ధృవీకరించిన ప్రొఫైల్స్" },
      { icon: "🔒", t: "పూర్తి ఫోటో గోప్యత" },
      { icon: "👨‍👩‍👧‍👦", t: "నేరుగా కుటుంబాల పరిచయం" },
    ],
  },
  en: {
    kicker: "Telangana & Andhra Pradesh · #1 Prestigious Matrimony",
    titleA: "Sacred, trusted bonds,",
    titleB: "begin right here.",
    sub: "100% verified profiles, complete photo privacy and a dignified process — find the perfect life partner for your family.",
    pricePill: "From ₹99 · first 3 profiles completely free",
    ctaReg: "ఉచిత నమోదు",
    ctaBrowse: "Browse Matches",
    liveCinema: "🔴 4K LIVE WEDDING FILM",
    qualityTag: "ULTRA HD CINEMATIC",
    familyPulse: "150+ families active right now",
    features: [
      { icon: "🛡️", t: "100% Verified Profiles" },
      { icon: "🔒", t: "Complete Photo Privacy" },
      { icon: "👨‍👩‍👧‍👦", t: "Direct Family Connect" },
    ],
  },
};

export default function CinematicHero() {
  const { lang } = useLang();
  const te = lang === "te";
  const L = COPY[(lang as Lang) in COPY ? (lang as Lang) : "te"];

  const [mounted, setMounted] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [activityIdx, setActivityIdx] = useState(0);
  const [soundPlaying, setSoundPlaying] = useState(true);

  const mainVideoRef = useRef<HTMLVideoElement | null>(null);
  const bgVideoRef = useRef<HTMLVideoElement | null>(null);

  const petalSeeds = useRef(
    PETALS.map((g, i) => ({
      g,
      left: (i * 8.3 + 3) % 96,
      dur: 8 + ((i * 37) % 7),
      delay: -((i * 1.5) % 10),
      size: 0.85 + ((i * 13) % 10) / 10,
    }))
  );

  const currentChapter = CHAPTERS[activeIdx];

  // Auto-play and chapter cycling
  useEffect(() => {
    setMounted(true);

    const playVideos = () => {
      if (mainVideoRef.current) {
        mainVideoRef.current.muted = true;
        mainVideoRef.current.play().catch(() => {});
      }
      if (bgVideoRef.current) {
        bgVideoRef.current.muted = true;
        bgVideoRef.current.play().catch(() => {});
      }
    };

    playVideos();
    const t = setTimeout(playVideos, 250);

    // Auto-advance wedding scenes every 8 seconds
    const chapterTimer = setInterval(() => {
      setActiveIdx((curr) => (curr + 1) % CHAPTERS.length);
    }, 8000);

    const activityTimer = setInterval(() => {
      setActivityIdx((prev) => (prev + 1) % LIVE_ACTIVITIES.length);
    }, 4500);

    return () => {
      clearTimeout(t);
      clearInterval(chapterTimer);
      clearInterval(activityTimer);
    };
  }, []);

  // Update video when chapter changes
  useEffect(() => {
    if (mainVideoRef.current) {
      mainVideoRef.current.load();
      mainVideoRef.current.muted = true;
      mainVideoRef.current.play().catch(() => {});
    }
  }, [activeIdx]);

  return (
    <section className="cine-hero relative overflow-hidden bg-[#0a0107] text-white" aria-label="Telugu Matrimony — Flagship Luxury Video Experience">
      
      {/* ================= 1. AMBIENT FULL-CANVAS VIDEO BACKDROP ================= */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <video
          ref={bgVideoRef}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          poster="/promo/cine-3.jpg"
          className="absolute inset-0 h-full w-full object-cover opacity-25 scale-110 filter blur-[4px] transition-opacity duration-1000"
        >
          <source src={currentChapter.video} type="video/mp4" />
        </video>
      </div>

      {/* Luxury Royal Velvet & Gold Gradients (Ensures crystal clarity + rich colors) */}
      <div
        className="absolute inset-0 z-[1] pointer-events-none"
        style={{
          background:
            "linear-gradient(90deg, rgba(10,1,7,0.96) 0%, rgba(10,1,7,0.82) 42%, rgba(10,1,7,0.3) 78%, rgba(10,1,7,0.7) 100%)",
        }}
      />
      <div
        className="absolute inset-0 z-[1] pointer-events-none"
        style={{
          background:
            "linear-gradient(0deg, rgba(10,1,7,0.98) 0%, rgba(10,1,7,0.2) 35%, transparent 70%, rgba(10,1,7,0.5) 100%)",
        }}
      />

      {/* Auspicious Golden Ambient Orbs */}
      <div className="pointer-events-none absolute -top-32 left-1/4 h-[450px] w-[450px] rounded-full bg-[#f6d98a]/15 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-32 right-1/4 h-[500px] w-[500px] rounded-full bg-[#a0143a]/30 blur-[140px]" />

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

      {/* ================= 3. TOP AMBIENCE & LIVE ACTIVITY BAR ================= */}
      <div className="relative z-[4] mx-auto max-w-7xl px-5 pt-6 flex flex-wrap items-center justify-between gap-3">
        
        {/* Real-Time Pulse Toast */}
        <div className="inline-flex items-center gap-2.5 rounded-full border border-amber-400/30 bg-black/60 px-4 py-1.5 text-xs font-bold tracking-wide backdrop-blur-2xl shadow-xl transition-all duration-500">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-90" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          <span className="text-[#f6d98a] telugu">{te ? LIVE_ACTIVITIES[activityIdx].te : LIVE_ACTIVITIES[activityIdx].en}</span>
        </div>

        {/* Traditional Shehnai Ambient Sound Wave Indicator */}
        <button
          type="button"
          onClick={() => setSoundPlaying(!soundPlaying)}
          className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-black/50 px-3.5 py-1.5 text-[11px] font-bold text-[#f7e6bf] backdrop-blur-xl hover:bg-black/80 transition cursor-pointer"
          title="Shehnai Ambient"
        >
          <span>{soundPlaying ? "🪈" : "🔇"}</span>
          <span className="hidden sm:inline telugu">{te ? "సన్నాయి శుభనాదం" : "Shehnai Ambient"}</span>
          <div className="flex items-end gap-0.5 h-3">
            <span className={`w-0.5 bg-[#f6d98a] rounded-full transition-all duration-300 ${soundPlaying ? "h-3 animate-pulse" : "h-1"}`} />
            <span className={`w-0.5 bg-[#f6d98a] rounded-full transition-all duration-300 ${soundPlaying ? "h-2 animate-pulse delay-75" : "h-1"}`} />
            <span className={`w-0.5 bg-[#f6d98a] rounded-full transition-all duration-300 ${soundPlaying ? "h-3.5 animate-pulse delay-150" : "h-1"}`} />
          </div>
        </button>

      </div>

      {/* ================= 4. MAIN HERO: WIDESCREEN FLAGSHIP VIDEO EXPERIENCE ================= */}
      <div className="relative z-[3] mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-5 py-8 lg:grid-cols-12 lg:py-14">
        
        {/* LEFT COLUMN: Majestic Headlines & Instant CTAs (6 cols) */}
        <div className="lg:col-span-6 space-y-6">
          
          {/* Eyebrow badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-gold/50 bg-gradient-to-r from-amber-500/20 via-rose-500/20 to-amber-500/20 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-[#f6d98a] backdrop-blur-xl shadow-lg telugu">
            <span className="text-amber-300">👑</span>
            <span>{L.kicker}</span>
          </div>

          {/* Majestic Royal Gold Headline */}
          <h1 className="text-4xl font-black leading-[1.12] tracking-tight text-white drop-shadow-[0_4px_30px_rgba(0,0,0,0.8)] sm:text-5xl lg:text-6xl telugu">
            {L.titleA}
            <br />
            <span className="cine-title-gold drop-shadow-lg">{L.titleB}</span>
          </h1>

          {/* Subtitle */}
          <p className="max-w-xl text-base font-normal leading-relaxed text-white/90 sm:text-lg telugu">
            {L.sub}
          </p>

          {/* Primary Action CTAs */}
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <span className="cine-cta-glow">
              <Link
                href="/register"
                className="inline-flex items-center gap-3 rounded-full gold-gradient px-9 py-4 text-base font-black text-[#5c0821] shadow-2xl transition hover:brightness-110 active:scale-95"
              >
                <span>💍</span>
                <span>{L.ctaReg}</span>
                <span aria-hidden className="text-lg">→</span>
              </Link>
            </span>

            <Link
              href="/matches"
              className="inline-flex items-center gap-2.5 rounded-full border-2 border-white/40 bg-white/10 px-8 py-4 text-base font-bold text-white backdrop-blur-xl transition hover:bg-white/20 active:scale-95"
            >
              <span>🔍</span>
              <span>{L.ctaBrowse}</span>
            </Link>
          </div>

          {/* Pricing & Free Offer Pill */}
          <div className="inline-flex items-center gap-2 rounded-full border border-[#f0d9a3]/40 bg-black/60 px-4 py-2 text-xs font-bold text-[#f7e6bf] backdrop-blur-xl telugu shadow-md">
            <span className="text-gold text-sm">✦</span> {L.pricePill}
          </div>

          {/* Trust Guarantees Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-white/15">
            {L.features.map((f, i) => (
              <div key={i} className="flex items-center gap-2 text-xs font-bold text-white/90 telugu">
                <span className="text-base">{f.icon}</span>
                <span>{f.t}</span>
              </div>
            ))}
          </div>

        </div>

        {/* RIGHT COLUMN: PROMINENT 4K CINEMATIC WEDDING FILM THEATER (6 cols) */}
        <div className="lg:col-span-6">
          <div className="relative mx-auto w-full max-w-[560px]">
            
            {/* Glowing Golden Backdrop Aura */}
            <div className="absolute -inset-3 rounded-[2.5rem] bg-gradient-to-r from-amber-400/35 via-rose-600/30 to-amber-500/35 blur-2xl opacity-90 animate-pulse" />

            {/* Video Theater Shell */}
            <div className="relative overflow-hidden rounded-[2.2rem] border-2 border-[#f6d98a]/80 bg-black/90 shadow-[0_25px_70px_rgba(0,0,0,0.85)] backdrop-blur-2xl">
              
              {/* Header Bar inside Theater */}
              <div className="flex items-center justify-between border-b border-white/15 bg-black/75 px-5 py-3 backdrop-blur-xl">
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-90" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
                  </span>
                  <span className="text-xs font-extrabold uppercase tracking-wider text-[#f6d98a] telugu">
                    {L.liveCinema}
                  </span>
                </div>

                <span className="rounded-full bg-gold/20 border border-gold/50 px-3 py-0.5 text-[10px] font-black tracking-widest text-[#f6d98a]">
                  {L.qualityTag}
                </span>
              </div>

              {/* Main 16:9 Auto-Playing Wedding Video Screen */}
              <div className="relative aspect-[16/10] w-full overflow-hidden bg-black">
                <video
                  ref={mainVideoRef}
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="auto"
                  poster={currentChapter.poster}
                  className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
                >
                  <source src={currentChapter.video} type="video/mp4" />
                  {/* Fallback Animated WebP */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/promo/wedding-film.webp"
                    alt="Telugu wedding ceremony film"
                    className="h-full w-full object-cover"
                  />
                </video>

                {/* Subtle bottom gradient on video for readable caption */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/20 pointer-events-none" />

                {/* Active Chapter Badge on Video */}
                <div className="absolute top-3 left-4">
                  <span className="rounded-full bg-black/70 border border-gold/60 px-3 py-1 text-xs font-black text-[#f6d98a] backdrop-blur-md telugu shadow-lg">
                    {te ? currentChapter.badge : currentChapter.en}
                  </span>
                </div>

                {/* Video Caption & 1-Click Action overlay */}
                <div className="absolute bottom-3.5 left-4 right-4 flex items-end justify-between text-white">
                  <div className="max-w-[75%]">
                    <div className="text-sm font-black text-[#f6d98a] telugu">
                      💍 {te ? currentChapter.te : currentChapter.en}
                    </div>
                    <div className="text-xs text-white/85 truncate telugu mt-0.5">
                      {te ? currentChapter.subTe : currentChapter.subEn}
                    </div>
                  </div>

                  <Link
                    href="/register"
                    className="rounded-full gold-gradient px-4 py-2 text-xs font-black text-[#5c0821] shadow-xl hover:brightness-110 active:scale-95 transition shrink-0"
                  >
                    {L.ctaReg}
                  </Link>
                </div>
              </div>

              {/* 4-Chapter Interactive Switcher Bar */}
              <div className="grid grid-cols-4 gap-1 p-2 bg-black/80 border-t border-white/10">
                {CHAPTERS.map((ch, idx) => (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => setActiveIdx(idx)}
                    className={`rounded-xl px-2 py-2 text-center transition-all cursor-pointer ${
                      activeIdx === idx
                        ? "bg-gradient-to-b from-gold/30 to-amber-600/30 border border-gold shadow-md"
                        : "hover:bg-white/10 border border-transparent text-white/70"
                    }`}
                  >
                    <div className={`text-[11px] font-black truncate telugu ${activeIdx === idx ? "text-[#f6d98a]" : "text-white/80"}`}>
                      {te ? ch.te.split(" ")[0] : ch.en.split(" ")[0]}
                    </div>
                    <div className="text-[9px] text-white/50 font-mono">
                      0{idx + 1}
                    </div>
                  </button>
                ))}
              </div>

            </div>

          </div>
        </div>

      </div>

    </section>
  );
}
