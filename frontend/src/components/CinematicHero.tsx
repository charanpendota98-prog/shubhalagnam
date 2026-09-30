"use client";

/**
 * 👑 MANA VIVAHA — ULTRA-MODERN CINEMATIC WEDDING HERO
 * =======================================================
 * • Crystal-clear, full-bleed 4K Telugu wedding video background with guaranteed native autoplay & smooth looping.
 * • Clean, uncluttered, highly-converting Telugu matrimony UI.
 * • No redundant scene text buttons or photo grids.
 * • Pure royal gold typography, particle physics, verified trust metrics, and direct action CTAs.
 */

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useLang, type Lang } from "@/lib/lang";

const COPY = {
  te: {
    kicker: "పవిత్రమైన తెలుగు వివాహ వేదిక · మన వివాహ",
    titleA: "నమ్మకమైన పవిత్ర బంధం,",
    titleB: "ఇక్కడే మొదలవుతుంది",
    sub: "తెలంగాణ & ఆంధ్రప్రదేశ్ కుటుంబాల కొరకు అత్యున్నత విశ్వసనీయ వేదిక — 100% ధృవీకరించిన ప్రొఫైల్స్, సంపూర్ణ ఫోటో గోప్యత మరియు గౌరవప్రదమైన అనుసంధానం.",
    pricePill: "₹99 నుంచి ప్రారంభం · మొదటి 3 ప్రొఫైల్స్ పూర్తిగా ఉచితం (FREE)",
    ctaReg: "ఉచిత నమోదు — FREE",
    ctaBrowse: "సంబంధాలు చూడండి",
    trust: [
      { icon: "🛡️", t: "100% OTP & ఆధార్ ధృవీకరణ", sub: "నకిలీ ప్రొఫైల్స్ నివారణ" },
      { icon: "🔒", t: "సంపూర్ణ ఫోటో గోప్యత", sub: "వాటర్‌మార్క్ భద్రత" },
      { icon: "👨‍👩‍👧‍👦", t: "నేరుగా కుటుంబాల పరిచయం", sub: "చాటింగ్ లేదు • డైరెక్ట్ కనెక్ట్" },
    ],
    stats: [
      { val: "10,000+", lbl: "ధృవీకరించిన ప్రొఫైల్స్" },
      { val: "3,500+", lbl: "శుభ వివాహాలు" },
      { val: "52+", lbl: "కమ్యూనిటీ ఛానల్స్" },
      { val: "100%", lbl: "సురక్షితం & గోప్యత" },
    ],
  },
  en: {
    kicker: "Prestigious Telugu Matrimony · Mana Vivaha",
    titleA: "Sacred, trusted bonds,",
    titleB: "begin right here.",
    sub: "The most trusted matrimonial platform for Telangana & Andhra Pradesh families — 100% verified profiles, complete photo privacy, and dignified family connections.",
    pricePill: "From ₹99 · first 3 profiles completely free (FREE)",
    ctaReg: "Free Register",
    ctaBrowse: "Browse Profiles",
    trust: [
      { icon: "🛡️", t: "100% OTP & Identity Verified", sub: "Zero fake profiles" },
      { icon: "🔒", t: "Complete Photo Privacy", sub: "Watermark protected" },
      { icon: "👨‍👩‍👧‍👦", t: "Direct Family-to-Family Connect", sub: "No chatting • Direct numbers" },
    ],
    stats: [
      { val: "10,000+", lbl: "Verified Profiles" },
      { val: "3,500+", lbl: "Happy Marriages" },
      { val: "52+", lbl: "Community Channels" },
      { val: "100%", lbl: "Safe & Privacy First" },
    ],
  },
};

export default function CinematicHero() {
  const { lang } = useLang();
  const te = lang === "te";
  const L = COPY[(lang as Lang) in COPY ? (lang as Lang) : "te"];

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);

  // Guaranteed Native Autoplay & Loop handling
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    video.playsInline = true;
    video.autoplay = true;
    video.loop = true;

    const tryPlay = () => {
      video.play().then(() => setIsPlaying(true)).catch(() => {});
    };

    tryPlay();
    video.addEventListener("canplay", tryPlay);
    video.addEventListener("loadedmetadata", tryPlay);

    return () => {
      video.removeEventListener("canplay", tryPlay);
      video.removeEventListener("loadedmetadata", tryPlay);
    };
  }, []);

  // Floating Golden Akshathalu Particles
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const onResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", onResize);

    const particles = Array.from({ length: 30 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 2.5 + 1.2,
      speedY: Math.random() * 0.7 + 0.3,
      speedX: Math.random() * 0.4 - 0.2,
      opacity: Math.random() * 0.5 + 0.25,
      color: Math.random() > 0.4 ? "#F59E0B" : "#FDE047",
    }));

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      particles.forEach((p) => {
        p.y += p.speedY;
        p.x += p.speedX;
        if (p.y > height) {
          p.y = -10;
          p.x = Math.random() * width;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity;
        ctx.shadowBlur = 6;
        ctx.shadowColor = "#F59E0B";
        ctx.fill();
      });
      animId = requestAnimationFrame(render);
    };
    render();

    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(animId);
    };
  }, []);

  const toggleSound = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  };

  return (
    <section
      className="relative min-h-[85vh] sm:min-h-[88vh] flex items-center justify-center overflow-hidden bg-[#0d0107] text-white"
      aria-label="Mana Vivaha — Telugu Matrimony"
    >
      {/* ================= 1. NATIVE 4K CINEMATIC WEDDING VIDEO BACKGROUND ================= */}
      <div className="absolute inset-0 overflow-hidden" aria-hidden>
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          poster="/promo/hero-bg-ultra.jpg"
          className="h-full w-full object-cover object-center transition-opacity duration-1000"
        >
          <source src="/promo/wedding-film.mp4" type="video/mp4" />
          <source src="/promo/wedding-story-film.mp4" type="video/mp4" />
          {/* Fallback Image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/promo/hero-bg-ultra.jpg"
            alt="Royal Telugu Wedding"
            className="h-full w-full object-cover object-center"
          />
        </video>
      </div>

      {/* Golden Akshathalu Canvas Overlay */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 z-[2] opacity-80"
      />

      {/* ================= 2. CRISP, CLEAN CINEMATIC OVERLAY (NO HEAVY MUDDINESS) ================= */}
      <div
        className="absolute inset-0 z-[1] pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, rgba(13,1,7,0.75) 0%, rgba(13,1,7,0.4) 40%, rgba(13,1,7,0.65) 75%, rgba(13,1,7,0.95) 100%)",
        }}
      />
      <div
        className="absolute inset-0 z-[1] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 30%, rgba(13,1,7,0.7) 100%)",
        }}
      />

      {/* Audio Mute/Unmute Quick Toggle */}
      <button
        type="button"
        onClick={toggleSound}
        className="absolute top-5 right-5 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 hover:bg-black/80 border border-amber-400/40 text-amber-300 text-xs backdrop-blur-md transition shadow-lg"
        title={isMuted ? "Unmute Video Sound" : "Mute Video Sound"}
      >
        <span>{isMuted ? "🔇" : "🔊"}</span>
        <span className="hidden sm:inline text-[11px] font-bold">
          {isMuted ? "సౌండ్ ఆన్" : "మ్యూట్"}
        </span>
      </button>

      {/* ================= 3. HERO CONTENT CONTAINER ================= */}
      <div className="relative z-[3] mx-auto w-full max-w-5xl px-4 sm:px-6 py-12 sm:py-16 text-center space-y-6 sm:space-y-8">
        
        {/* Auspicious Eyebrow Badge */}
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/50 bg-black/70 px-4 py-1.5 text-xs font-black uppercase tracking-wider text-amber-300 backdrop-blur-xl shadow-xl">
            <span className="text-amber-400">🪔</span>
            <span>{L.kicker}</span>
          </span>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-[11px] font-bold text-emerald-300 backdrop-blur-md shadow-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>10,000+ ధృవీకరించిన ప్రొఫైల్స్</span>
          </span>
        </div>

        {/* Majestic Royal Gold Headline */}
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-[64px] font-black leading-[1.15] tracking-tight text-white drop-shadow-[0_4px_30px_rgba(0,0,0,0.9)]">
            {L.titleA}
            <br />
            <span className="bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-400 bg-clip-text text-transparent drop-shadow-[0_4px_25px_rgba(245,158,11,0.5)]">
              {L.titleB}
            </span>
          </h1>
        </div>

        {/* Subtitle */}
        <p className="max-w-2xl mx-auto text-sm sm:text-base md:text-lg font-normal leading-relaxed text-gray-200 drop-shadow-[0_2px_12px_rgba(0,0,0,0.85)]">
          {L.sub}
        </p>

        {/* Action CTAs */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <Link
            href="/register"
            className="inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-500 px-9 py-4 text-base sm:text-lg font-black text-rose-950 shadow-[0_12px_35px_rgba(245,158,11,0.5)] transition hover:brightness-110 hover:shadow-[0_15px_40px_rgba(245,158,11,0.7)] active:scale-95"
          >
            <span className="text-xl">💍</span>
            <span>{L.ctaReg}</span>
            <span aria-hidden className="text-xl">→</span>
          </Link>

          <Link
            href="/matches"
            className="inline-flex items-center gap-2.5 rounded-full border-2 border-white/40 bg-black/50 px-8 py-4 text-base sm:text-lg font-bold text-white backdrop-blur-xl transition hover:bg-white/20 hover:border-white/70 active:scale-95 shadow-lg"
          >
            <span>🔍</span>
            <span>{L.ctaBrowse}</span>
          </Link>
        </div>

        {/* Pricing Offer Pill */}
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-black/60 px-5 py-2 text-xs sm:text-sm font-bold text-amber-200 backdrop-blur-md shadow-md">
            <span className="text-amber-400">✦</span>
            <span>{L.pricePill}</span>
          </span>
        </div>

        {/* 3 Core Trust Pillars */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-6 max-w-3xl mx-auto border-t border-white/20">
          {L.trust.map((t, i) => (
            <div
              key={i}
              className="flex items-center justify-center sm:justify-start gap-2.5 p-2 rounded-2xl bg-black/40 backdrop-blur-sm border border-white/10 text-xs text-gray-200"
            >
              <span className="text-xl shrink-0">{t.icon}</span>
              <div className="text-left">
                <div className="font-bold text-white text-[13px]">{t.t}</div>
                <div className="text-[11px] text-gray-300">{t.sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Floating Live Metrics Bar */}
        <div className="pt-2">
          <div className="max-w-3xl mx-auto bg-gradient-to-r from-black/80 via-rose-950/60 to-black/80 backdrop-blur-xl border border-amber-400/40 rounded-3xl p-4 shadow-2xl grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            {L.stats.map((s, idx) => (
              <div key={idx} className="space-y-0.5">
                <div className="text-xl sm:text-2xl font-black text-amber-300">{s.val}</div>
                <div className="text-[11px] font-semibold text-gray-300">{s.lbl}</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
