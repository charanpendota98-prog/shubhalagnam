"use client";

/**
 * 👑 MANA VIVAHA — ULTRA-HD 4K CINEMATIC HERO & WEDDING THEATRE
 * ================================================================
 * Crystal-clear, high-definition visual showcase with authentic Telugu
 * wedding scenes (Royal Mandap, Jeelakarra-Bellam, Newlyweds, Family Blessings),
 * pristine typography, smooth particle physics, and responsive UI.
 */

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useLang, type Lang } from "@/lib/lang";

type Scene = {
  id: string;
  titleTe: string;
  titleEn: string;
  descTe: string;
  descEn: string;
  image: string;
  video?: string;
  tag: string;
};

const SCENES: Scene[] = [
  {
    id: "royal",
    titleTe: "రాయల్ కల్యాణం",
    titleEn: "Royal Kalyanam",
    descTe: "సాంప్రదాయ పట్టు వస్త్రాలు & వేద మంత్రోచ్ఛారణలు",
    descEn: "Traditional Kanchi Silk & Vedic Mantras",
    image: "/promo/cine-royal-wide.jpg",
    video: "/promo/wedding-film.mp4",
    tag: "🎬 4K SCENE 01",
  },
  {
    id: "rituals",
    titleTe: "జీలకర్ర బెల్లం",
    titleEn: "Jeelakarra Bellam",
    descTe: "మాంగల్యధారణ & సప్తపది పవిత్ర ఘట్టాలు",
    descEn: "Sacred Muhurtham & Mangalyadharana",
    image: "/promo/cine-jeelakarra-hd.jpg",
    video: "/promo/wedding-story-film.mp4",
    tag: "🪔 4K SCENE 02",
  },
  {
    id: "joy",
    titleTe: "నూతన వధూవరులు",
    titleEn: "Radiant Couple",
    descTe: "ఆనందకరమైన జీవిత ప్రయాణానికి శుభారంభం",
    descEn: "Beginning of a Sacred Lifetime Journey",
    image: "/promo/cine-couple-hd.jpg",
    video: "/promo/wedding-film.mp4",
    tag: "💑 4K SCENE 03",
  },
  {
    id: "family",
    titleTe: "కుటుంబ ఆశీర్వాదం",
    titleEn: "Family Blessings",
    descTe: "పెద్దల ఆశీస్సులు & తలంబ్రాల సత్కారాలు",
    descEn: "Elders' Blessings & Thalambralu Celebrations",
    image: "/promo/cine-blessings-hd.jpg",
    video: "/promo/wedding-story-film.mp4",
    tag: "✨ 4K SCENE 04",
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
    theatreTitle: "4K కల్యాణ దృశ్యాల లైవ్ థియేటర్",
    theatreLive: "4K ULTRA HD",
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
    ctaReg: "Free Register",
    ctaBrowse: "Browse Profiles",
    theatreTitle: "4K Wedding Cinema Live Theatre",
    theatreLive: "4K ULTRA HD",
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
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [isVideoMode, setIsVideoMode] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const currentScene = SCENES[activeScene] || SCENES[0];

  // Auto advance scenes every 7 seconds if not paused
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setActiveScene((prev) => (prev + 1) % SCENES.length);
    }, 7000);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Handle Video element playback
  useEffect(() => {
    if (videoRef.current && isVideoMode) {
      videoRef.current.load();
      videoRef.current.play().catch(() => {});
    }
  }, [activeScene, isVideoMode]);

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

    // Subtle golden particles
    const particles = Array.from({ length: 28 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 2.5 + 1.2,
      speedY: Math.random() * 0.6 + 0.2,
      speedX: Math.random() * 0.4 - 0.2,
      opacity: Math.random() * 0.5 + 0.2,
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

  return (
    <section
      className="relative min-h-[90vh] flex items-center overflow-hidden bg-[#120208] text-white"
      aria-label="Mana Vivaha — Telugu Matrimony"
    >
      {/* ================= 1. CRISP ULTRA-HD AMBIENT BACKGROUND ================= */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/promo/hero-bg-ultra.jpg"
          alt="Royal Telugu Wedding Mandap Stage"
          className="h-full w-full object-cover object-center scale-100 opacity-25 filter blur-[1px] transition-all duration-1000"
        />
        {/* Crisp Gradient Mesh */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 75% 30%, rgba(217, 119, 6, 0.15) 0%, transparent 60%), linear-gradient(180deg, rgba(18, 2, 8, 0.85) 0%, rgba(18, 2, 8, 0.95) 100%)",
          }}
        />
      </div>

      {/* Golden Akshathalu Canvas Overlay */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 z-[2] opacity-80"
      />

      {/* Warm Ambient Glow Highlights */}
      <div className="pointer-events-none absolute top-10 right-1/4 h-80 w-80 rounded-full bg-amber-500/10 blur-[100px]" />
      <div className="pointer-events-none absolute bottom-10 left-10 h-72 w-72 rounded-full bg-rose-900/20 blur-[90px]" />

      {/* ================= 2. MAIN CONTAINER ================= */}
      <div className="relative z-[3] mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-10 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* LEFT 7-COLUMNS: VALUE PROPOSITION & DIRECT CALL TO ACTIONS */}
          <div className="lg:col-span-7 text-left space-y-5 sm:space-y-6">
            
            {/* Auspicious Eyebrow Badge */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-black/60 px-4 py-1.5 text-xs font-black uppercase tracking-wider text-amber-300 backdrop-blur-xl shadow-lg">
                <span>🪔</span>
                <span>{L.kicker}</span>
              </span>

              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-[11px] font-bold text-emerald-300 backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>10,000+ ధృవీకరించిన సంబంధాలు లైవ్</span>
              </span>
            </div>

            {/* Majestic Royal Headline */}
            <h1 className="text-3xl font-black leading-[1.18] tracking-tight text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.8)] sm:text-5xl md:text-5xl lg:text-[56px]">
              {L.titleA}
              <br />
              <span className="bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-400 bg-clip-text text-transparent drop-shadow-md">
                {L.titleB}
              </span>
            </h1>

            {/* Subtitle */}
            <p className="max-w-xl text-sm sm:text-base md:text-lg font-normal leading-relaxed text-gray-200 drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)]">
              {L.sub}
            </p>

            {/* Primary Action Buttons */}
            <div className="flex flex-wrap items-center gap-3.5 pt-1">
              <Link
                href="/register"
                className="inline-flex items-center gap-2.5 rounded-full bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-500 px-8 py-3.5 sm:py-4 text-base font-black text-rose-950 shadow-[0_10px_30px_rgba(245,158,11,0.4)] transition hover:brightness-110 hover:shadow-[0_12px_35px_rgba(245,158,11,0.6)] active:scale-95"
              >
                <span className="text-lg">💍</span>
                <span>{L.ctaReg}</span>
                <span aria-hidden className="text-lg">→</span>
              </Link>

              <Link
                href="/matches"
                className="inline-flex items-center gap-2 rounded-full border-2 border-white/30 bg-black/40 px-7 py-3.5 sm:py-4 text-base font-bold text-white backdrop-blur-xl transition hover:bg-white/20 hover:border-white/60 active:scale-95"
              >
                <span>🔍</span>
                <span>{L.ctaBrowse}</span>
              </Link>
            </div>

            {/* Pricing Offer Pill */}
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-black/50 px-4 py-1.5 text-xs font-semibold text-amber-200 backdrop-blur-md shadow-sm">
              <span className="text-amber-400">✦</span>
              <span>{L.pricePill}</span>
            </div>

            {/* 3 Clear Trust Pillars */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-white/15">
              {L.trust.map((t, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-gray-200">
                  <span className="text-lg shrink-0 mt-0.5">{t.icon}</span>
                  <div>
                    <div className="font-bold text-white text-[13px]">{t.t}</div>
                    <div className="text-[11px] text-gray-300">{t.sub}</div>
                  </div>
                </div>
              ))}
            </div>

          </div>

          {/* RIGHT 5-COLUMNS: 4K HIGH-DEFINITION WEDDING THEATRE PLAYER */}
          <div className="lg:col-span-5 space-y-4">
            
            {/* 4K Live Wedding Showcase Screen */}
            <div className="relative rounded-3xl overflow-hidden border-2 border-amber-400/40 bg-black/80 shadow-[0_20px_50px_rgba(0,0,0,0.8)] group">
              
              {/* Aspect Ratio 16:9 Screen */}
              <div className="relative aspect-[16/10] sm:aspect-[16/9] w-full overflow-hidden bg-zinc-950">
                {isVideoMode ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    loop
                    muted={isMuted}
                    playsInline
                    className="h-full w-full object-cover object-center"
                    poster={currentScene.image}
                  >
                    <source src={currentScene.video || "/promo/wedding-film.mp4"} type="video/mp4" />
                  </video>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={currentScene.id}
                    src={currentScene.image}
                    alt={te ? currentScene.titleTe : currentScene.titleEn}
                    className="h-full w-full object-cover object-center transition-all duration-700 ease-out transform group-hover:scale-105"
                  />
                )}

                {/* Film Vignette & Subtle Gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/40 pointer-events-none" />

                {/* Top Badges Bar */}
                <div className="absolute top-3 inset-x-3 flex items-center justify-between text-xs z-10 pointer-events-none">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md border border-amber-400/40 text-[11px] font-black text-amber-300">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                    <span>{L.theatreLive}</span>
                  </span>

                  <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-[10px] font-bold text-gray-300 border border-white/20">
                    {currentScene.tag}
                  </span>
                </div>

                {/* Bottom Overlay Title & Subtitle */}
                <div className="absolute bottom-3 inset-x-3 z-10 flex items-end justify-between">
                  <div className="space-y-0.5">
                    <div className="text-base sm:text-lg font-black text-amber-200 drop-shadow-md">
                      {te ? currentScene.titleTe : currentScene.titleEn}
                    </div>
                    <div className="text-xs text-gray-200 font-medium drop-shadow-sm max-w-[280px] truncate">
                      {te ? currentScene.descTe : currentScene.descEn}
                    </div>
                  </div>

                  {/* Playback & Scene Controls */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="p-2 rounded-full bg-black/70 hover:bg-amber-500 hover:text-black text-amber-300 border border-amber-400/40 backdrop-blur-md text-xs transition"
                      title={isPlaying ? "Pause Scene Cycle" : "Auto-Play Scenes"}
                    >
                      {isPlaying ? "⏸" : "▶"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsVideoMode(!isVideoMode)}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-black border backdrop-blur-md transition ${
                        isVideoMode
                          ? "bg-amber-400 text-black border-amber-400"
                          : "bg-black/70 text-amber-300 border-amber-400/40 hover:bg-black/90"
                      }`}
                      title="Toggle Video Stream"
                    >
                      {isVideoMode ? "VIDEO" : "PHOTO"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Progress Indicator Line */}
              <div className="h-1 w-full bg-white/10 relative">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-yellow-300 transition-all duration-300"
                  style={{ width: `${((activeScene + 1) / SCENES.length) * 100}%` }}
                />
              </div>

              {/* 4 Interactive Scene Selector Grid */}
              <div className="p-3 bg-zinc-950/90 grid grid-cols-2 gap-2">
                {SCENES.map((s, idx) => {
                  const isActive = activeScene === idx;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setActiveScene(idx);
                        setIsPlaying(false);
                      }}
                      className={`p-2.5 rounded-2xl text-left transition-all border flex items-center gap-2.5 ${
                        isActive
                          ? "bg-amber-500/20 border-amber-400 text-amber-200 shadow-md ring-1 ring-amber-400/50"
                          : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:border-white/20"
                      }`}
                    >
                      {/* Mini Thumbnail */}
                      <div className="relative w-9 h-9 shrink-0 rounded-xl overflow-hidden border border-white/20">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={s.image}
                          alt={s.titleTe}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-black truncate text-white">
                          {te ? s.titleTe : s.titleEn}
                        </div>
                        <div className="text-[10px] text-gray-400 truncate">
                          {te ? s.descTe : s.descEn}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bottom Real Metrics Card */}
            <div className="bg-gradient-to-r from-black/80 via-rose-950/40 to-black/80 backdrop-blur-xl border border-amber-400/30 rounded-3xl p-3.5 shadow-xl flex items-center justify-around text-center">
              <div>
                <div className="text-xl sm:text-2xl font-black text-amber-300">10,000+</div>
                <div className="text-[10px] sm:text-[11px] font-semibold text-gray-300">ధృవీకరించిన ప్రొఫైల్స్</div>
              </div>
              <div className="w-px h-7 bg-white/20" />
              <div>
                <div className="text-xl sm:text-2xl font-black text-amber-300">3,500+</div>
                <div className="text-[10px] sm:text-[11px] font-semibold text-gray-300">శుభ వివాహాలు</div>
              </div>
              <div className="w-px h-7 bg-white/20" />
              <div>
                <div className="text-xl sm:text-2xl font-black text-amber-300">52+</div>
                <div className="text-[10px] sm:text-[11px] font-semibold text-gray-300">కమ్యూనిటీ ఛానల్స్</div>
              </div>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
}
