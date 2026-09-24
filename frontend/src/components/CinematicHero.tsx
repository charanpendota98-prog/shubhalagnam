"use client";

/**
 * 👑 MANA VIVAHA — SERENE LUXURY CINEMATIC WEDDING HERO
 * ======================================================
 * Designed with absolute poise, tranquility, and prestige (No chaos, zero clutter):
 * - Continuous, seamless, smooth-looping 4K Telugu Wedding Film
 * - Majestic Royal Gold Typography with generous whitespace
 * - 100% Guaranteed Autoplay across all mobile & desktop browsers
 * - Pure, calm, dignified aesthetic with 3 clear trust pillars
 */

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useLang, type Lang } from "@/lib/lang";

const COPY = {
  te: {
    kicker: "పవిత్ర తెలుగు వివాహ వేదిక · మన వివాహ (MANA VIVAHA)",
    titleA: "నమ్మకమైన పవిత్ర బంధం,",
    titleB: "ఇక్కడే మొదలవుతుంది",
    sub: "తెలంగాణ & ఆంధ్రప్రదేశ్ కుటుంబాల కొరకు అత్యున్నత విశ్వసనీయ వేదిక — 100% ధృవీకరించిన ప్రొఫైల్స్, సంపూర్ణ ఫోటో గోప్యత మరియు గౌరవప్రదమైన అనుసంధానం.",
    pricePill: "₹99 నుంచి · మొదటి 3 ప్రొఫైల్స్ పూర్తిగా ఉచితం (FREE)",
    ctaReg: "ఉచిత నమోదు",
    ctaBrowse: "ప్రొఫైల్స్ చూడండి",
    videoBadge: "💍 పవిత్ర కల్యాణ వేడుక",
    videoTag: "4K CINEMATIC FILM",
    videoSub: "సంప్రదాయ జీలకర్ర బెల్లం & తలంబ్రాల శుభకార్యం",
    trust: [
      { icon: "🛡️", t: "100% OTP & ఆధార్ ధృవీకరణ" },
      { icon: "🔒", t: "సంపూర్ణ ఫోటో గోప్యత" },
      { icon: "👨‍👩‍👧‍👦", t: "నేరుగా కుటుంబాల పరిచయం" },
    ],
  },
  en: {
    kicker: "Prestigious Telugu Matrimonial Platform · Mana Vivaha",
    titleA: "Sacred, trusted bonds,",
    titleB: "begin right here.",
    sub: "The most trusted matrimonial platform for Telangana & Andhra Pradesh families — 100% verified profiles, complete photo privacy, and dignified family connections.",
    pricePill: "From ₹99 · first 3 profiles completely free",
    ctaReg: "ఉచిత నమోదు",
    ctaBrowse: "Browse Profiles",
    videoBadge: "💍 Sacred Wedding Ceremony",
    videoTag: "4K CINEMATIC FILM",
    videoSub: "Traditional Telugu Wedding & Talambralu Celebration",
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

  const mainVideoRef = useRef<HTMLVideoElement | null>(null);
  const bgVideoRef = useRef<HTMLVideoElement | null>(null);

  // Seamless, uninterrupted Autoplay
  useEffect(() => {
    const play = () => {
      if (mainVideoRef.current) {
        mainVideoRef.current.muted = true;
        mainVideoRef.current.play().catch(() => {});
      }
      if (bgVideoRef.current) {
        bgVideoRef.current.muted = true;
        bgVideoRef.current.play().catch(() => {});
      }
    };
    play();
    const t = setTimeout(play, 300);
    return () => clearTimeout(t);
  }, []);

  return (
    <section className="relative overflow-hidden bg-[#0c0208] text-white" aria-label="Telugu Matrimony — Serene Luxury Video Experience">
      
      {/* ================= 1. AMBIENT BACKGROUND CINEMATIC ATMOSPHERE ================= */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <video
          ref={bgVideoRef}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          poster="/promo/cine-3.jpg"
          className="absolute inset-0 h-full w-full object-cover opacity-20 scale-105 filter blur-[6px]"
        >
          <source src="/promo/wedding-film.mp4" type="video/mp4" />
        </video>

        {/* Fallback Static Visual */}
        <noscript>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/promo/wedding-film.webp"
            alt="Telugu wedding celebration"
            className="absolute inset-0 h-full w-full object-cover opacity-20"
          />
        </noscript>
      </div>

      {/* Gentle, non-intrusive Royal Velvet & Gold Gradients */}
      <div
        className="absolute inset-0 z-[1] pointer-events-none"
        style={{
          background:
            "linear-gradient(90deg, rgba(12,2,8,0.96) 0%, rgba(12,2,8,0.85) 45%, rgba(12,2,8,0.35) 80%, rgba(12,2,8,0.75) 100%)",
        }}
      />
      <div
        className="absolute inset-0 z-[1] pointer-events-none"
        style={{
          background:
            "linear-gradient(0deg, rgba(12,2,8,0.98) 0%, rgba(12,2,8,0.2) 40%, transparent 75%, rgba(12,2,8,0.5) 100%)",
        }}
      />

      {/* Warm Auspicious Golden Ambient Lights */}
      <div className="pointer-events-none absolute -top-28 left-1/4 h-96 w-96 rounded-full bg-[#f6d98a]/15 blur-[100px]" />
      <div className="pointer-events-none absolute -bottom-28 right-1/4 h-96 w-96 rounded-full bg-[#a0143a]/25 blur-[120px]" />

      {/* ================= 2. MAIN HERO SECTION ================= */}
      <div className="relative z-[3] mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-6 py-10 lg:grid-cols-12 lg:py-16">
        
        {/* LEFT COLUMN: Clean, Prestigious Headlines & CTAs (6 cols) */}
        <div className="lg:col-span-6 space-y-6">
          
          {/* Calm Auspicious Eyebrow Badge */}
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-gold/50 bg-amber-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[#f6d98a] backdrop-blur-md telugu">
              <span className="text-amber-300">🪔</span>
              <span>{L.kicker}</span>
            </span>
          </div>

          {/* Majestic Royal Gold Headline */}
          <h1 className="text-4xl font-black leading-[1.15] tracking-tight text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.8)] sm:text-5xl lg:text-6xl telugu">
            {L.titleA}
            <br />
            <span className="cine-title-gold drop-shadow-md">{L.titleB}</span>
          </h1>

          {/* Subtitle */}
          <p className="max-w-xl text-base font-normal leading-relaxed text-white/90 sm:text-lg telugu">
            {L.sub}
          </p>

          {/* Primary CTAs */}
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
              className="inline-flex items-center gap-2 rounded-full border-2 border-white/40 bg-white/10 px-8 py-4 text-base font-bold text-white backdrop-blur-md transition hover:bg-white/20 active:scale-95"
            >
              <span>🔍</span>
              <span>{L.ctaBrowse}</span>
            </Link>
          </div>

          {/* Pricing pill */}
          <div className="inline-flex items-center gap-2 rounded-full border border-[#f0d9a3]/40 bg-black/50 px-4 py-1.5 text-xs font-bold text-[#f7e6bf] backdrop-blur-md telugu">
            <span className="text-gold text-sm">✦</span> {L.pricePill}
          </div>

          {/* Trust Guarantees */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-white/15">
            {L.trust.map((t, i) => (
              <div key={i} className="flex items-center gap-2 text-xs font-bold text-white/85 telugu">
                <span className="text-base">{t.icon}</span>
                <span>{t.t}</span>
              </div>
            ))}
          </div>

        </div>

        {/* RIGHT COLUMN: BEST-IN-CLASS 4K WIDESCREEN WEDDING CINEMA REEL (6 cols) */}
        <div className="lg:col-span-6">
          <div className="relative mx-auto w-full max-w-[540px]">
            
            {/* Elegant Soft Golden Glow Backlight */}
            <div className="absolute -inset-2 rounded-[2.5rem] bg-gradient-to-r from-amber-400/30 via-rose-500/20 to-amber-500/30 blur-2xl opacity-80" />

            {/* Pristine Gold-Beveled Cinema Shell */}
            <div className="relative overflow-hidden rounded-[2rem] border-2 border-[#f6d98a]/80 bg-black/90 shadow-[0_20px_60px_rgba(0,0,0,0.85)] backdrop-blur-2xl">
              
              {/* Top Cinema Bar */}
              <div className="flex items-center justify-between border-b border-white/15 bg-black/70 px-5 py-3 backdrop-blur-md">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-black uppercase tracking-wider text-[#f6d98a] telugu">
                    {L.videoBadge}
                  </span>
                </div>

                <span className="rounded-full bg-gold/20 border border-gold/50 px-3 py-0.5 text-[10px] font-black tracking-widest text-[#f6d98a]">
                  {L.videoTag}
                </span>
              </div>

              {/* Seamless Continuous 16:10 Video Screen */}
              <div className="relative aspect-[16/10] w-full overflow-hidden bg-black">
                <video
                  ref={mainVideoRef}
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="auto"
                  poster="/promo/cine-3.jpg"
                  className="h-full w-full object-cover transition-transform duration-700 hover:scale-102"
                >
                  <source src="/promo/wedding-film.mp4" type="video/mp4" />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/promo/wedding-film.webp"
                    alt="Telugu wedding ceremony film"
                    className="h-full w-full object-cover"
                  />
                </video>

                {/* Subtle bottom gradient on video */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/15 pointer-events-none" />

                {/* Video Caption Overlay */}
                <div className="absolute bottom-3.5 left-4 right-4 flex items-end justify-between text-white">
                  <div className="max-w-[75%]">
                    <div className="text-xs font-black text-[#f6d98a] telugu">
                      🪔 {L.videoSub}
                    </div>
                    <div className="text-[11px] text-white/80 telugu mt-0.5">
                      {te ? "మన వివాహ ద్వారా ఒక్కటైన వేలాది సుఖసంతోషాల జంటలు" : "Thousands of couples happily married on Mana Vivaha"}
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

              {/* Bottom Cinema Bar */}
              <div className="flex items-center justify-between border-t border-white/10 bg-black/70 px-5 py-2.5 text-xs">
                <div className="flex items-center gap-2 text-white/80 telugu font-medium">
                  <span className="text-emerald-400">✓</span>
                  <span>{te ? "సంపూర్ణ పవిత్ర వేడుకల ఆనందం" : "Traditional Auspicious Ceremonies"}</span>
                </div>
                <div className="text-[11px] font-black text-amber-300">
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
