"use client";

/**
 * 🎬 CINEMATIC VIDEO HERO — top-matrimony feel, motion-first.
 * A full-bleed wedding "film reel": 4 cinematic stills crossfade with slow
 * Ken-Burns zoom (feels like a wedding video), floating petals, an animated
 * gold headline, live floating match cards, and a bottom marquee.
 *
 * Pure CSS motion — no heavy autoplay video, so it stays fast on low-end phones.
 * Fully bilingual (te/en) + reduced-motion safe.
 */

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useLang, type Lang } from "@/lib/lang";
import { SITE_CONFIG } from "@/lib/site-config";

const FRAMES = [
  "/promo/cine-1.jpg",
  "/promo/cine-2.jpg",
  "/promo/cine-3.jpg",
  "/promo/cine-4.jpg",
];

const PETALS = ["✿", "❀", "✽", "❁", "✾", "❀", "✿", "❁", "✽", "✿", "❀", "✾"];

const COPY = {
  te: {
    live: "10,000+ ధృవీకరించిన ప్రొఫైల్స్ · ఇప్పుడు LIVE",
    kicker: "తెలంగాణ & ఆంధ్రప్రదేశ్ · తెలుగు మ్యాట్రిమోని",
    titleA: "నమ్మకమైన సంబంధం",
    titleB: "ఇక్కడ మొదలవుతుంది",
    sub: "ధృవీకరించిన ప్రొఫైల్స్, పూర్తి గోప్యత, గౌరవప్రదమైన విధానం — మీ కుటుంబానికి తగిన జీవిత భాగస్వామిని కనుగొనండి.",
    pricePill: "₹99 నుంచి · మొదటి 3 ప్రొఫైల్స్ ఉచితం",
    ctaReg: "ఉచితంగా నమోదు చేసుకోండి",
    ctaBrowse: "ప్రొఫైల్స్ చూడండి",
    ctaBot: "టెలిగ్రామ్‌లో చేరండి",
    trust: ["OTP ధృవీకరణ", "ఫోటో గోప్యత", "నేరుగా పరిచయం"],
    scroll: "మరింత తెలుసుకోండి",
    matchTitle: "కొత్త మ్యాచ్",
    matchName: "RED001 · 25 సం. · Reddy",
    matchDesc: "Software · హైదరాబాద్ · 97% సరిపోలిక",
    accepted: "ఇంట్రెస్ట్ ఆమోదించబడింది",
    joined: "ధృవీకరించిన ప్రొఫైల్స్",
    stories: "విజయవంతమైన పెళ్లిళ్లు",
    channels: "కమ్యూనిటీ ఛానళ్లు",
  },
  en: {
    live: "10,000+ verified profiles · LIVE now",
    kicker: "Telangana & Andhra Pradesh · Telugu Matrimony",
    titleA: "Trusted matches,",
    titleB: "begin here.",
    sub: "Verified profiles, complete privacy and a respectful process — find the right life partner for your family.",
    pricePill: "From ₹99 · first 3 profiles free",
    ctaReg: "Register for free",
    ctaBrowse: "Browse profiles",
    ctaBot: "Join on Telegram",
    trust: ["OTP verified", "Photo privacy", "Direct introduction"],
    scroll: "Learn more",
    matchTitle: "New match",
    matchName: "RED001 · 25 yrs · Reddy",
    matchDesc: "Software · Hyderabad · 97% match",
    accepted: "Interest accepted",
    joined: "Verified profiles",
    stories: "Successful weddings",
    channels: "Community channels",
  },
};

export default function CinematicHero() {
  const { lang } = useLang();
  const L = COPY[(lang as Lang) in COPY ? (lang as Lang) : "te"];
  const [mounted, setMounted] = useState(false);
  const petalSeeds = useRef(
    PETALS.map((g, i) => ({
      g,
      left: (i * 8.3 + 4) % 96,
      dur: 9 + ((i * 37) % 8),
      delay: -((i * 1.7) % 12),
      size: 0.8 + ((i * 13) % 10) / 10,
    }))
  );

  useEffect(() => setMounted(true), []);

  return (
    <section className="cine-hero" aria-label="Telugu matrimony — your wedding story">
      {/* ---- Film reel: crossfading wedding stills (instant-load base layer) ---- */}
      <div className="absolute inset-0" aria-hidden>
        {FRAMES.map((src) => (
          <div key={src} className="cine-frame" style={{ backgroundImage: `url('${src}')` }} />
        ))}
      </div>

      {/* ---- 🎬 Real animated wedding FILM (Ken-Burns + crossfade), autoplays & loops ---- */}
      {mounted && (
        <img
          src="/promo/wedding-film.webp"
          alt=""
          aria-hidden
          className="cine-film absolute inset-0 h-full w-full object-cover"
        />
      )}

      <div className="cine-grade" aria-hidden />
      <div className="cine-vignette" aria-hidden />
      <div className="cine-grain" aria-hidden />

      {/* ---- Floating petals ---- */}
      {mounted && (
        <div className="absolute inset-0 z-[2] overflow-hidden" aria-hidden>
          {petalSeeds.current.map((p, i) => (
            <span
              key={i}
              className="cine-petal text-[#ffd88a]"
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

      {/* ---- Content ---- */}
      <div className="relative z-[3] mx-auto flex min-h-[100svh] max-w-7xl flex-col justify-center px-5 py-28 md:py-0">
        <div className="max-w-2xl">
          {/* eyebrow / live */}
          <div className="anim-hero flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-[11px] font-semibold tracking-wide text-white backdrop-blur-md telugu">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              {L.live}
            </span>
          </div>

          <p className="anim-hero-1 mt-6 text-[12px] font-semibold uppercase tracking-[.3em] text-[#f0d9a3] telugu">
            {L.kicker}
          </p>

          <h1 className="anim-hero-2 mt-4 text-[40px] font-bold leading-[1.06] tracking-tight text-white drop-shadow-[0_4px_24px_rgba(0,0,0,.55)] md:text-[72px] telugu">
            {L.titleA}
            <br />
            <span className="cine-title-gold">{L.titleB}</span>
          </h1>

          <p className="anim-hero-3 mt-6 max-w-xl text-[15.5px] font-light leading-relaxed text-white/85 md:text-[18px] telugu">
            {L.sub}
          </p>

          {/* CTAs */}
          <div className="anim-hero-3 mt-8 flex flex-wrap items-center gap-3">
            <span className="cine-cta-glow">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-full gold-gradient px-8 py-4 text-[15px] font-bold text-[#5c0821] shadow-xl transition hover:brightness-105"
              >
                {L.ctaReg}
                <span aria-hidden>→</span>
              </Link>
            </span>
            <Link
              href="/matches"
              className="rounded-full border border-white/40 bg-white/5 px-7 py-4 text-[15px] font-semibold text-white backdrop-blur-md transition hover:bg-white/15"
            >
              {L.ctaBrowse}
            </Link>
          </div>

          {/* price pill — subtle, premium */}
          <div className="anim-hero-3 mt-5">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#f0d9a3]/40 bg-[#f0d9a3]/10 px-4 py-2 text-[12.5px] font-medium text-[#f7e6bf] telugu">
              <span aria-hidden>◆</span> {L.pricePill}
            </span>
          </div>

          {/* trust row */}
          <div className="anim-hero-3 mt-7 flex flex-wrap items-center gap-x-6 gap-y-2 text-[12.5px] font-medium text-white/75 telugu">
            {L.trust.map((t) => (
              <span key={t} className="inline-flex items-center gap-1.5">
                <span className="text-emerald-400">✓</span>
                {t}
              </span>
            ))}
          </div>

          {/* stats */}
          <div className="anim-hero-3 mt-9 flex max-w-lg items-center gap-7 border-t border-white/15 pt-6">
            <Stat value="10,000+" label={L.joined} lang={lang as Lang} />
            <span className="h-9 w-px bg-white/15" />
            <Stat value="3,900+" label={L.stories} lang={lang as Lang} />
            <span className="h-9 w-px bg-white/15" />
            <Stat value="51" label={L.channels} lang={lang as Lang} />
          </div>
        </div>
      </div>

      {/* ---- Floating live "match" card (desktop) ---- */}
      <div className="pointer-events-none absolute right-6 top-1/2 z-[3] hidden -translate-y-1/2 lg:block">
        <div className="cine-float-card pointer-events-auto w-[268px] rounded-3xl border border-white/25 bg-white/12 p-4 text-white shadow-2xl backdrop-blur-xl">
          <div className="flex items-center gap-2 text-[11px] font-bold text-[#f6d98a]">
            <span className="h-2 w-2 rounded-full bg-green-400" /> {L.matchTitle}
          </div>
          <div className="mt-3 flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/promo/bride-card.jpg"
              alt=""
              className="h-16 w-16 rounded-2xl border border-white/30 object-cover"
            />
            <div className="min-w-0">
              <div className="text-[13px] font-bold">{L.matchName}</div>
              <div className="mt-0.5 text-[11px] text-white/80 telugu">{L.matchDesc}</div>
            </div>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/20">
            <div className="h-full w-[97%] rounded-full bg-gradient-to-r from-[#f6d98a] to-white" />
          </div>
        </div>
        <div className="cine-float-card cine-float-card--slow pointer-events-auto mt-4 ml-10 w-[210px] rounded-2xl border border-white/25 bg-white/12 p-3 text-white shadow-2xl backdrop-blur-xl">
          <div className="flex items-center gap-2 text-[12px] font-semibold telugu">
            <span className="text-lg">💌</span>
            {L.accepted}
          </div>
        </div>
      </div>

      {/* ---- Film-reel progress bars ---- */}
      <div className="absolute bottom-16 left-1/2 z-[3] flex w-44 -translate-x-1/2 gap-2 md:left-5 md:translate-x-0">
        {FRAMES.map((_, i) => (
          <span key={i} className="cine-bar flex-1">
            <i />
          </span>
        ))}
      </div>

      {/* ---- Scroll cue ---- */}
      <div className="absolute bottom-5 left-1/2 z-[3] flex -translate-x-1/2 flex-col items-center gap-1 text-white/70">
        <span className="text-[10px] font-semibold uppercase tracking-widest telugu">{L.scroll}</span>
        <span className="cine-scroll-cue text-lg">↓</span>
      </div>
    </section>
  );
}

function Stat({ value, label, lang }: { value: string; label: string; lang: Lang }) {
  return (
    <div>
      <div className="text-2xl font-bold tracking-tight text-white md:text-[28px]">{value}</div>
      <div className={`mt-0.5 text-[11px] font-medium text-white/60 ${lang === "te" ? "telugu" : ""}`}>{label}</div>
    </div>
  );
}
