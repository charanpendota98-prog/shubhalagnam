"use client";

/**
 * 👑 MANA VIVAHA — ULTRA-LUXURY CINEMATIC HERO & INTERACTIVE WEDDING FILM
 * =======================================================================
 * World-Class Matrimony Hero Experience:
 * - 4K High-Definition Telugu Wedding Ceremony Film with Native Autoplay
 * - Interactive Scene Selector (రాయల్ కల్యాణం, జీలకర్ర బెల్లం, నూతన వధూవరులు, కుటుంబ ఆశీర్వాదం)
 * - Animated Gold Akshathalu / Petal Canvas Particle System
 * - Glassmorphism Floating Trust Metric Badges (10,000+ Verified, 3,500+ Weddings, 100% Privacy)
 * - Ultra-Dignified Telugu Typography with Shimmering Royal Gold Gradient
 */

import Link from "next/link";
import { useEffect, useRef, useState, useMemo } from "react";
import { useLang, type Lang } from "@/lib/lang";

const SCENES = [
  {
    id: "royal",
    titleTe: "🎬 రాయల్ కల్యాణం",
    titleEn: "Royal Wedding",
    video: "/promo/wedding-film.mp4",
    poster: "/promo/cine-3.jpg",
    descTe: "సాంప్రదాయ పట్టు వస్త్రాలు & వేద మంత్రోచ్ఛారణలు",
  },
  {
    id: "rituals",
    titleTe: "🪔 జీలకర్ర బెల్లం",
    titleEn: "Sacred Rituals",
    video: "/promo/wedding-story-film.mp4",
    poster: "/promo/cine-1.jpg",
    descTe: "మాంగల్యధారణ & సప్తపది పవిత్ర ఘట్టాలు",
  },
  {
    id: "joy",
    titleTe: "💑 నూతన వధూవరులు",
    titleEn: "Bride & Groom Joy",
    video: "/promo/wedding-film.mp4",
    poster: "/promo/cine-2.jpg",
    descTe: "ఆనందకరమైన జీవిత ప్రయాణానికి శుభారంభం",
  },
  {
    id: "family",
    titleTe: "✨ కుటుంబ ఆశీర్వాదం",
    titleEn: "Family Blessings",
    video: "/promo/wedding-story-film.mp4",
    poster: "/promo/cine-4.jpg",
    descTe: "పెద్దల ఆశీస్సులు & బంధుమిత్రుల సత్కారాలు",
  },
];

const COPY = {
  te: {
    kicker: "పవిత్ర తెలుగు వివాహ వేదిక · మన వివాహ",
    titleA: "నమ్మకమైన పవిత్ర బంధం,",
    titleB: "ఇక్కడే మొదలవుతుంది",
    sub: "తెలంగాణ & ఆంధ్రప్రదేశ్ కుటుంబాల కొరకు అత్యున్నత విశ్వసనీయ వేదిక — 100% ధృవీకరించిన ప్రొఫైల్స్, సంపూర్ణ ఫోటో గోప్యత మరియు గౌరవప్రదమైన అనుసంధానం.",
    pricePill: "₹99 నుంచి ప్రారంభం · మొదటి 3 ప్రొఫైల్స్ పూర్తిగా ఉచితం (FREE)",
    ctaReg: "ఉచిత నమోదు",
    ctaBrowse: "సంబంధాలు చూడండి",
    trust: [
      { icon: "🛡️", t: "100% OTP & ఆధార్ ధృవీకరణ", sub: "నకిలీ ప్రొఫైల్స్ నివారణ" },
      { icon: "🔒", t: "సంపూర్ణ ఫోటో గోప్యత", sub: "వాటర్‌మార్క్ భద్రత" },
      { icon: "👨‍👩‍👧‍👦", t: "నేరుగా కుటుంబాల పరిచయం", sub: "చాటింగ్ లేదు • డైరెక్ట్ కనెక్ట్" },
    ],
  },
  en: {
    kicker: "Prestigious Telugu Matrimony · Mana Vivaha",
    titleA: "Sacred, trusted bonds,",
    titleB: "begin right here.",
    sub: "The most trusted matrimonial platform for Telangana & Andhra Pradesh families — 100% verified profiles, complete photo privacy, and dignified family connections.",
    pricePill: "From ₹99 · first 3 profiles completely free",
    ctaReg: "ఉచిత నమోదు",
    ctaBrowse: "Browse Profiles",
    trust: [
      { icon: "🛡️", t: "100% OTP & Identity Verified", sub: "Zero fake profiles" },
      { icon: "🔒", t: "Complete Photo Privacy", sub: "Watermark protected" },
      { icon: "👨‍👩‍👧‍👦", t: "Direct Family-to-Family Connect", sub: "No chatting • Direct numbers" },
    ],
  },
};

export default function CinematicHero() {
  const { lang } = useLang();
  const te = lang === "te";
  const L = COPY[(lang as Lang) in COPY ? (lang as Lang) : "te"];

  const [activeScene, setActiveScene] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);

  // Switch Scene
  const currentScene = SCENES[activeScene] || SCENES[0];

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.load();
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  }, [activeScene]);

  // Guaranteed Native Autoplay
  useEffect(() => {
    const playVideo = () => {
      if (videoRef.current) {
        videoRef.current.muted = isMuted;
        videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      }
    };
    playVideo();
    const timer = setTimeout(playVideo, 250);
    return () => clearTimeout(timer);
  }, [isMuted]);

  // Gold Particle / Akshathalu Canvas Animation
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

    // Particles: golden akshathalu & soft floral petals
    const particles = Array.from({ length: 32 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 3 + 1.5,
      speedY: Math.random() * 0.8 + 0.3,
      speedX: Math.random() * 0.5 - 0.25,
      opacity: Math.random() * 0.6 + 0.2,
      color: Math.random() > 0.4 ? "#D4AF37" : "#FFD700",
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
        ctx.shadowBlur = 8;
        ctx.shadowColor = "#D4AF37";
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

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  };

  return (
    <section
      className="relative min-h-[88vh] sm:min-h-[92vh] flex items-center overflow-hidden bg-[#0a0107] text-white"
      aria-label="Mana Vivaha — Telugu Matrimony"
    >
      {/* ================= 1. FULL 4K WEDDING FILM BACKGROUND ================= */}
      <div className="absolute inset-0 overflow-hidden" aria-hidden>
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          poster={currentScene.poster}
          className="h-full w-full object-cover object-[75%_center] sm:object-center scale-105 transition-transform duration-1000"
        >
          <source src={currentScene.video} type="video/mp4" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={currentScene.poster}
            alt="Telugu wedding ceremony film"
            className="h-full w-full object-cover object-center"
          />
        </video>
      </div>

      {/* Gold Particle Canvas Overlay */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 z-[2] opacity-70"
      />

      {/* ================= 2. ASYMMETRIC LUXURY GRADIENT OVERLAY ================= */}
      <div
        className="absolute inset-0 z-[1] pointer-events-none"
        style={{
          background:
            "linear-gradient(90deg, rgba(10,1,7,0.96) 0%, rgba(10,1,7,0.92) 40%, rgba(10,1,7,0.55) 70%, rgba(10,1,7,0.2) 100%)",
        }}
      />
      <div
        className="absolute inset-0 z-[1] pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, rgba(10,1,7,0.7) 0%, transparent 20%, rgba(10,1,7,0.6) 80%, #0a0107 100%)",
        }}
      />

      {/* Auspicious Soft Amber Ambient Light */}
      <div className="pointer-events-none absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-[#f6d98a]/15 blur-[130px]" />

      {/* ================= 3. SIDE-ALIGNED REGAL CONTENT & FLOATING CARDS ================= */}
      <div className="relative z-[3] mx-auto w-full max-w-7xl px-5 sm:px-8 py-12 lg:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* LEFT 7-COLUMNS: MAIN TYPOGRAPHY & CTA */}
          <div className="lg:col-span-7 text-left space-y-6">
            
            {/* Auspicious Eyebrow Badge */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-gold/50 bg-black/60 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-[#f6d98a] backdrop-blur-xl shadow-lg telugu">
                <span className="text-amber-300">🪔</span>
                <span>{L.kicker}</span>
              </span>

              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-[11px] font-bold text-emerald-300 backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>10,000+ ధృవీకరించిన సంబంధాలు లైవ్</span>
              </span>
            </div>

            {/* Majestic Royal Gold Headline */}
            <h1 className="text-4xl font-black leading-[1.12] tracking-tight text-white drop-shadow-[0_4px_30px_rgba(0,0,0,0.9)] sm:text-5xl md:text-6xl lg:text-[62px] telugu">
              {L.titleA}
              <br />
              <span className="cine-title-gold drop-shadow-xl">{L.titleB}</span>
            </h1>

            {/* Subtitle */}
            <p className="max-w-xl text-base font-normal leading-relaxed text-white/90 drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)] sm:text-lg telugu">
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
                className="inline-flex items-center gap-2.5 rounded-full border-2 border-white/40 bg-black/40 px-8 py-4 text-base font-bold text-white backdrop-blur-xl transition hover:bg-white/20 active:scale-95"
              >
                <span>🔍</span>
                <span>{L.ctaBrowse}</span>
              </Link>
            </div>

            {/* Pricing & Free Offer Pill */}
            <div className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-black/60 px-4 py-1.5 text-xs font-bold text-[#f7e6bf] backdrop-blur-xl telugu shadow-md">
              <span className="text-gold text-sm">✦</span> {L.pricePill}
            </div>

            {/* 3 Clear Trust Pillars */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-white/20">
              {L.trust.map((t, i) => (
                <div key={i} className="flex items-start gap-2.5 text-xs text-white/90 drop-shadow-md telugu">
                  <span className="text-xl shrink-0 mt-0.5">{t.icon}</span>
                  <div>
                    <div className="font-bold text-white">{t.t}</div>
                    <div className="text-[10px] text-gray-300">{t.sub}</div>
                  </div>
                </div>
              ))}
            </div>

          </div>

          {/* RIGHT 5-COLUMNS: FLOATING STATS & SCENE SELECTOR */}
          <div className="lg:col-span-5 space-y-4">
            
            {/* Interactive Wedding Film Scene Switcher */}
            <div className="bg-black/60 backdrop-blur-xl border border-gold/40 rounded-3xl p-4 shadow-2xl space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-[#f6d98a] border-b border-white/10 pb-2">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>4K కల్యాణ దృశ్యాలు (Cinematic Scenes)</span>
                </span>
                <span className="text-[10px] text-gray-400">లైవ్ ప్లేయర్</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {SCENES.map((s, idx) => (
                  <button
                    key={s.id}
                    onClick={() => setActiveScene(idx)}
                    className={`p-2.5 rounded-2xl text-left transition border ${
                      activeScene === idx
                        ? "bg-gold/25 border-gold text-gold shadow-md"
                        : "bg-white/5 border-white/10 hover:bg-white/10 text-gray-300"
                    }`}
                  >
                    <div className="text-xs font-extrabold">{s.titleTe}</div>
                    <div className="text-[10px] opacity-75 truncate mt-0.5">{s.descTe}</div>
                  </button>
                ))}
              </div>

              {/* Video Controls Bar */}
              <div className="flex items-center justify-between pt-1 text-xs text-gray-300">
                <span className="text-[11px] font-semibold text-[#f7e6bf]">
                  {currentScene.titleTe} · {currentScene.descTe}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={togglePlay}
                    className="p-1 hover:text-gold transition text-sm"
                    title={isPlaying ? "Pause" : "Play"}
                  >
                    {isPlaying ? "⏸️" : "▶️"}
                  </button>
                  <button
                    onClick={toggleMute}
                    className="p-1 hover:text-gold transition text-sm"
                    title={isMuted ? "Unmute" : "Mute"}
                  >
                    {isMuted ? "🔇" : "🔊"}
                  </button>
                </div>
              </div>
            </div>

            {/* Floating Live Metrics Card */}
            <div className="bg-gradient-to-r from-black/70 to-maroon/60 backdrop-blur-xl border border-gold/30 rounded-3xl p-4 shadow-2xl flex items-center justify-around text-center">
              <div>
                <div className="text-2xl font-extrabold text-[#f6d98a]">10,000+</div>
                <div className="text-[10px] font-semibold text-gray-300">ధృవీకరించిన ప్రొఫైల్స్</div>
              </div>
              <div className="w-px h-8 bg-white/20" />
              <div>
                <div className="text-2xl font-extrabold text-[#f6d98a]">3,500+</div>
                <div className="text-[10px] font-semibold text-gray-300">శుభ వివాహాలు</div>
              </div>
              <div className="w-px h-8 bg-white/20" />
              <div>
                <div className="text-2xl font-extrabold text-[#f6d98a]">52+</div>
                <div className="text-[10px] font-semibold text-gray-300">కమ్యూనిటీ ఛానల్స్</div>
              </div>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
}
