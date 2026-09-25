"use client";

/**
 * 👑 MANA VIVAHA — ASYMMETRIC LUXURY CINEMATIC HERO
 * ==================================================
 * High-end, side-aligned, ultra-modern luxury experience:
 * - Left Side: Regal Typography, Authentic Telugu Branding, 1-Click CTAs & Trust Badges
 * - Right Side: 100% Unobstructed, Crystal-Clear 4K Telugu Wedding Video in all its glory
 * - Gradient mask allows video details (Mangalasutram, Pattu, Flowers) to shine brilliantly
 * - 100% Guaranteed Native Autoplay on all devices
 */

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useLang, type Lang } from "@/lib/lang";

const COPY = {
  te: {
    kicker: "పవిత్ర తెలుగు వివాహ వేదిక · మన వివాహ",
    titleA: "నమ్మకమైన పవిత్ర బంధం,",
    titleB: "ఇక్కడే మొదలవుతుంది",
    sub: "తెలంగాణ & ఆంధ్రప్రదేశ్ కుటుంబాల కొరకు అత్యున్నత విశ్వసనీయ వేదిక — 100% ధృవీకరించిన ప్రొఫైల్స్, సంపూర్ణ ఫోటో గోప్యత మరియు గౌరవప్రదమైన అనుసంధానం.",
    pricePill: "₹99 నుంచి · మొదటి 3 ప్రొఫైల్స్ పూర్తిగా ఉచితం (FREE)",
    ctaReg: "ఉచిత నమోదు",
    ctaBrowse: "ప్రొఫైల్స్ చూడండి",
    trust: [
      { icon: "🛡️", t: "100% OTP & ఆధార్ ధృవీకరణ" },
      { icon: "🔒", t: "సంపూర్ణ ఫోటో గోప్యత" },
      { icon: "👨‍👩‍👧‍👦", t: "నేరుగా కుటుంబాల పరిచయం" },
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
      { icon: "🛡️", t: "100% OTP & Identity Verified" },
      { icon: "🔒", t: "Complete Photo Privacy" },
      { icon: "👨‍👩‍👧‍👦", t: "Direct Family-to-Family Connect" },
    ],
  },
};

export default function CinematicHero() {
  const { lang } = useLang();
  const te = lang === "te";
  const L = COPY[(lang as Lang) in COPY ? (lang as Lang) : "te"];

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);

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
    <section className="relative min-h-[85vh] sm:min-h-[88vh] flex items-center overflow-hidden bg-[#0a0107] text-white" aria-label="Mana Vivaha — Telugu Matrimony">
      
      {/* ================= 1. FULL 4K WEDDING FILM BACKGROUND ================= */}
      <div className="absolute inset-0 overflow-hidden" aria-hidden>
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          poster="/promo/cine-3.jpg"
          className="h-full w-full object-cover object-[75%_center] sm:object-center scale-105 transition-transform duration-1000"
        >
          <source src="/promo/wedding-film.mp4" type="video/mp4" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/promo/wedding-film.webp"
            alt="Telugu wedding ceremony film"
            className="h-full w-full object-cover object-center"
          />
        </video>
      </div>

      {/* ================= 2. ASYMMETRIC LUXURY GRADIENT OVERLAY ================= */}
      {/* Left side is deep velvet black for 100% text readability; Right side fades out so the video is crystal clear! */}
      <div
        className="absolute inset-0 z-[1] pointer-events-none"
        style={{
          background:
            "linear-gradient(90deg, rgba(10,1,7,0.96) 0%, rgba(10,1,7,0.90) 38%, rgba(10,1,7,0.45) 68%, rgba(10,1,7,0.15) 100%)",
        }}
      />
      <div
        className="absolute inset-0 z-[1] pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, rgba(10,1,7,0.7) 0%, transparent 25%, rgba(10,1,7,0.7) 85%, #0a0107 100%)",
        }}
      />

      {/* Auspicious Soft Amber Ambient Light */}
      <div className="pointer-events-none absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-[#f6d98a]/10 blur-[120px]" />

      {/* ================= 3. SIDE-ALIGNED REGAL CONTENT ================= */}
      <div className="relative z-[3] mx-auto w-full max-w-7xl px-5 sm:px-8 py-12 lg:py-20">
        <div className="max-w-2xl text-left space-y-6">
          
          {/* Auspicious Eyebrow Badge */}
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-gold/50 bg-black/50 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-[#f6d98a] backdrop-blur-xl shadow-lg telugu">
              <span className="text-amber-300">🪔</span>
              <span>{L.kicker}</span>
            </span>
          </div>

          {/* Majestic Royal Gold Headline */}
          <h1 className="text-4xl font-black leading-[1.12] tracking-tight text-white drop-shadow-[0_4px_30px_rgba(0,0,0,0.9)] sm:text-5xl md:text-6xl lg:text-[64px] telugu">
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
              <div key={i} className="flex items-center gap-2 text-xs sm:text-sm font-bold text-white/90 drop-shadow-md telugu">
                <span className="text-base sm:text-lg">{t.icon}</span>
                <span>{t.t}</span>
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* ================= 4. FLOATING VIDEO CONTROLS (BOTTOM RIGHT) ================= */}
      <div className="absolute bottom-5 right-5 z-[4] hidden sm:flex items-center gap-2 bg-black/60 border border-gold/40 backdrop-blur-md rounded-full px-3 py-1.5 text-xs text-white/90 shadow-xl">
        <span className="flex items-center gap-1.5 font-bold text-[11px] text-[#f6d98a] border-r border-white/20 pr-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          4K Telugu Wedding Film
        </span>
        <button
          type="button"
          onClick={togglePlay}
          className="hover:text-gold transition px-1.5 py-0.5"
          title={isPlaying ? "Pause Video" : "Play Video"}
        >
          {isPlaying ? "⏸️" : "▶️"}
        </button>
        <button
          type="button"
          onClick={toggleMute}
          className="hover:text-gold transition px-1.5 py-0.5"
          title={isMuted ? "Unmute Audio" : "Mute Audio"}
        >
          {isMuted ? "🔇" : "🔊"}
        </button>
      </div>

    </section>
  );
}
