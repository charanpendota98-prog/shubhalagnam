"use client";

/**
 * 👑 MANA VIVAHA — ELEGANT COMPACT CINEMATIC WEDDING HERO
 * ========================================================
 * • Ultra-HD Telugu wedding background video with guaranteed native autoplay.
 * • Clean, compact, refined side typography & action panel.
 * • 100% uncluttered, neat, and perfectly proportioned layout.
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
    ctaReg: "Free Register — FREE",
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

    video.defaultMuted = true;
    video.muted = true;
    video.playsInline = true;
    video.autoplay = true;
    video.loop = true;
    video.setAttribute("playsinline", "true");
    video.setAttribute("webkit-playsinline", "true");
    video.setAttribute("muted", "true");

    const tryPlay = () => {
      if (video.paused) {
        const promise = video.play();
        if (promise !== undefined) {
          promise.then(() => setIsPlaying(true)).catch(() => {});
        }
      }
    };

    tryPlay();
    const timer1 = setTimeout(tryPlay, 100);
    const timer2 = setTimeout(tryPlay, 400);

    video.addEventListener("canplay", tryPlay);
    video.addEventListener("canplaythrough", tryPlay);
    video.addEventListener("loadedmetadata", tryPlay);
    window.addEventListener("touchstart", tryPlay, { once: true, passive: true });
    window.addEventListener("scroll", tryPlay, { once: true, passive: true });
    
    const handleVis = () => {
      if (document.visibilityState === "visible") tryPlay();
    };
    document.addEventListener("visibilitychange", handleVis);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      video.removeEventListener("canplay", tryPlay);
      video.removeEventListener("canplaythrough", tryPlay);
      video.removeEventListener("loadedmetadata", tryPlay);
      document.removeEventListener("visibilitychange", handleVis);
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

    const particles = Array.from({ length: 24 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 2 + 1,
      speedY: Math.random() * 0.6 + 0.2,
      speedX: Math.random() * 0.3 - 0.15,
      opacity: Math.random() * 0.45 + 0.2,
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
        ctx.shadowBlur = 5;
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
      className="relative min-h-[75vh] sm:min-h-[80vh] flex items-center overflow-hidden bg-[#0d0107] text-white"
      aria-label="Mana Vivaha — Telugu Matrimony"
    >
      {/* ================= 1. 4K CINEMATIC WEDDING VIDEO BACKGROUND ================= */}
      <div className="absolute inset-0 overflow-hidden" aria-hidden>
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          poster="/promo/hero-bg-ultra.jpg"
          disablePictureInPicture
          className="h-full w-full object-cover object-center pointer-events-none select-none transition-opacity duration-1000"
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
        className="pointer-events-none absolute inset-0 z-[2] opacity-75"
      />

      {/* Clean Asymmetric Overlay (Allows the video to shine on the right side) */}
      <div
        className="absolute inset-0 z-[1] pointer-events-none"
        style={{
          background:
            "linear-gradient(90deg, rgba(13,1,7,0.92) 0%, rgba(13,1,7,0.78) 45%, rgba(13,1,7,0.35) 75%, rgba(13,1,7,0.15) 100%)",
        }}
      />
      <div
        className="absolute inset-0 z-[1] pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, rgba(13,1,7,0.5) 0%, transparent 30%, rgba(13,1,7,0.6) 80%, #0d0107 100%)",
        }}
      />

      {/* Ambient Lighting Accents */}
      <div className="pointer-events-none absolute top-10 left-10 h-72 w-72 rounded-full bg-amber-500/10 blur-[100px]" />

      {/* ================= 2. MAIN CONTAINER ================= */}
      <div className="relative z-[3] mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
          
          {/* LEFT/SIDE CONTAINER: COMPACT & REFINED LUXURY PANEL */}
          <div className="lg:col-span-7 xl:col-span-6 text-left">
            <div className="bg-black/55 backdrop-blur-xl border border-amber-400/30 rounded-3xl p-5 sm:p-7 shadow-[0_15px_40px_rgba(0,0,0,0.7)] space-y-4 sm:space-y-5">
              
              {/* Auspicious Eyebrow Badge */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/50 bg-black/70 px-3 py-1 text-[11px] sm:text-xs font-black uppercase tracking-wider text-amber-300 shadow-sm">
                  <span>🪔</span>
                  <span>{L.kicker}</span>
                </span>

                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-[10px] sm:text-[11px] font-bold text-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>10,000+ ధృవీకరించిన సంబంధాలు</span>
                </span>
              </div>

              {/* Compact, Refined Royal Gold Headline */}
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-tight tracking-tight text-white drop-shadow-[0_2px_15px_rgba(0,0,0,0.8)]">
                {L.titleA}
                <br />
                <span className="bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-400 bg-clip-text text-transparent">
                  {L.titleB}
                </span>
              </h1>

              {/* Compact Subtitle */}
              <p className="text-xs sm:text-sm font-normal leading-relaxed text-gray-200 drop-shadow-sm">
                {L.sub}
              </p>

              {/* Compact Action Buttons */}
              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-500 px-6 py-2.5 sm:px-7 sm:py-3 text-sm sm:text-base font-black text-rose-950 shadow-[0_8px_25px_rgba(245,158,11,0.4)] transition hover:brightness-110 active:scale-95"
                >
                  <span>💍</span>
                  <span>{L.ctaReg}</span>
                  <span aria-hidden className="text-base">→</span>
                </Link>

                <Link
                  href="/matches"
                  className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/10 hover:bg-white/20 px-5 py-2.5 sm:px-6 sm:py-3 text-sm sm:text-base font-bold text-white backdrop-blur-md transition active:scale-95 shadow-sm"
                >
                  <span>🔍</span>
                  <span>{L.ctaBrowse}</span>
                </Link>
              </div>

              {/* Compact Pricing Offer Pill */}
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/35 bg-black/50 px-3.5 py-1 text-[11px] sm:text-xs font-semibold text-amber-200 backdrop-blur-sm">
                  <span className="text-amber-400">✦</span>
                  <span>{L.pricePill}</span>
                </span>
              </div>

              {/* 3 Compact Trust Pillars */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-3 border-t border-white/15">
                {L.trust.map((t, i) => (
                  <div key={i} className="flex items-start gap-2 p-1 text-[11px] sm:text-xs text-gray-200">
                    <span className="text-base shrink-0 mt-0.5">{t.icon}</span>
                    <div>
                      <div className="font-bold text-white text-[11px] sm:text-xs leading-snug">{t.t}</div>
                      <div className="text-[10px] text-gray-400 leading-tight">{t.sub}</div>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          </div>

          {/* RIGHT SIDE: UNOBSTRUCTED VIDEO SHOWCASE & FLOATING METRICS */}
          <div className="lg:col-span-5 xl:col-span-6 flex flex-col justify-between items-end space-y-4">
            
            {/* Audio Toggle Button */}
            <button
              type="button"
              onClick={toggleSound}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 hover:bg-black/80 border border-amber-400/40 text-amber-300 text-xs backdrop-blur-md transition shadow-lg"
              title={isMuted ? "Unmute Video Sound" : "Mute Video Sound"}
            >
              <span>{isMuted ? "🔇" : "🔊"}</span>
              <span className="text-[11px] font-bold">
                {isMuted ? "సౌండ్ ఆన్" : "మ్యూట్"}
              </span>
            </button>

            {/* Floating Live Metrics Card */}
            <div className="w-full max-w-md bg-black/60 backdrop-blur-xl border border-amber-400/35 rounded-3xl p-3.5 shadow-2xl grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              {L.stats.map((s, idx) => (
                <div key={idx} className="space-y-0.5">
                  <div className="text-lg sm:text-xl font-black text-amber-300">{s.val}</div>
                  <div className="text-[10px] sm:text-[11px] font-semibold text-gray-300 leading-tight">{s.lbl}</div>
                </div>
              ))}
            </div>

          </div>

        </div>
      </div>
    </section>
  );
}
