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
    live: "ఇప్పుడు LIVE — వేల మంది తెలుగు వధూవరులు",
    kicker: "తెలంగాణ + ఆంధ్రప్రదేశ్ · నం.1 తెలుగు మ్యాట్రిమోనీ",
    titleA: "మీ జీవిత భాగస్వామి",
    titleB: "ఇక్కడే మొదలవుతుంది",
    sub: "ఒక్క రిజిస్టర్‌తో మీ ప్రొఫైల్ సరిపోయే అన్ని ఛానళ్లకూ ఆటోమేటిక్‌గా. ₹99 కే సంబంధం — మొదటి 3 ప్రొఫైళ్లు FREE.",
    ctaReg: "ఉచిత నమోదు — FREE",
    ctaBrowse: "ప్రొఫైల్స్ చూడండి →",
    ctaBot: "Telegram లో చేరండి",
    trust: ["OTP వెరిఫైడ్", "ఫోటో-ప్రైవేట్", "చాటింగ్ లేదు"],
    scroll: "కథ చూడటానికి స్క్రోల్ చేయండి",
    matchTitle: "కొత్త మ్యాచ్",
    matchName: "RED001 · 25y · Reddy",
    matchDesc: "Software @ Hyderabad · 97% మ్యాచ్",
    joined: "ఈ వారం చేరినవారు",
    stories: "పెళ్లిళ్లు కుదిరాయి",
    channels: "ఛానళ్లు",
  },
  en: {
    live: "LIVE now — thousands of Telugu brides & grooms",
    kicker: "Telangana + Andhra Pradesh · No.1 Telugu Matrimony",
    titleA: "Your life partner",
    titleB: "story begins here",
    sub: "One registration puts your profile in every channel it fits — automatically. ₹99 Sambandham, first 3 profiles FREE.",
    ctaReg: "Register free — FREE",
    ctaBrowse: "Browse profiles →",
    ctaBot: "Join on Telegram",
    trust: ["OTP verified", "Photo-private", "No chatting"],
    scroll: "Scroll to see the story",
    matchTitle: "New match",
    matchName: "RED001 · 25y · Reddy",
    matchDesc: "Software @ Hyderabad · 97% match",
    joined: "Joined this week",
    stories: "Weddings fixed",
    channels: "Channels",
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
      {/* ---- Film reel: crossfading wedding stills ---- */}
      <div className="absolute inset-0" aria-hidden>
        {FRAMES.map((src) => (
          <div key={src} className="cine-frame" style={{ backgroundImage: `url('${src}')` }} />
        ))}
      </div>
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
      <div className="relative z-[3] mx-auto flex min-h-[100svh] max-w-7xl flex-col justify-center px-5 py-24 md:py-0">
        <div className="max-w-2xl">
          {/* live badge */}
          <div className="anim-hero inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3.5 py-1.5 text-[11px] font-bold text-white backdrop-blur-md telugu">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-70" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-400" />
            </span>
            {L.live}
          </div>

          <p className="anim-hero-1 mt-5 text-[11px] font-extrabold uppercase tracking-[.28em] text-[#f6d98a] telugu">
            {L.kicker}
          </p>

          <h1 className="anim-hero-2 mt-3 text-[38px] font-black leading-[1.08] text-white drop-shadow-[0_4px_20px_rgba(0,0,0,.5)] md:text-[68px] telugu">
            {L.titleA}
            <br />
            <span className="cine-title-gold">{L.titleB}</span>
          </h1>

          <p className="anim-hero-3 mt-5 max-w-xl text-[15px] leading-relaxed text-white/90 md:text-[17px] telugu">
            {L.sub}
          </p>

          {/* CTAs */}
          <div className="anim-hero-3 mt-7 flex flex-wrap items-center gap-3">
            <span className="cine-cta-glow">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-full gold-gradient px-7 py-4 text-[15px] font-black text-[#5c0821] shadow-2xl transition hover:brightness-105"
              >
                💍 {L.ctaReg}
              </Link>
            </span>
            <Link
              href="/matches"
              className="rounded-full border border-white/50 bg-white/10 px-6 py-4 text-[15px] font-bold text-white backdrop-blur-md transition hover:bg-white/20"
            >
              {L.ctaBrowse}
            </Link>
            <a
              href={SITE_CONFIG.officialChannelUrl}
              target="_blank"
              rel="noreferrer"
              className="hidden rounded-full border border-white/20 px-5 py-4 text-[14px] font-bold text-white/90 transition hover:bg-white/10 sm:inline-flex"
            >
              ✈️ {L.ctaBot}
            </a>
          </div>

          {/* trust chips */}
          <div className="anim-hero-3 mt-6 flex flex-wrap gap-4 text-[12.5px] font-semibold text-white/85 telugu">
            {L.trust.map((t) => (
              <span key={t} className="inline-flex items-center gap-1.5">
                <span className="text-green-400">✓</span>
                {t}
              </span>
            ))}
          </div>

          {/* live mini stats */}
          <div className="anim-hero-3 mt-8 flex max-w-md items-center gap-6">
            <Stat value="12,400+" label={L.joined} lang={lang as Lang} />
            <span className="h-8 w-px bg-white/20" />
            <Stat value="3,900+" label={L.stories} lang={lang as Lang} />
            <span className="h-8 w-px bg-white/20" />
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
            {lang === "en" ? "Interest accepted" : "ఇంట్రెస్ట్ యాక్సెప్ట్ అయింది"}
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
      <div className="text-xl font-black text-white md:text-2xl">{value}</div>
      <div className={`text-[10.5px] font-semibold text-white/70 ${lang === "te" ? "telugu" : ""}`}>{label}</div>
    </div>
  );
}
