"use client";

/**
 * 💐 REAL WEDDINGS FILM & MANDAPAM STORIES — LUXURY CINEMATIC SHOWCASE
 * ===================================================================
 * Auto-scrolling "Wedding Film Reel" with interactive Theater Lightbox:
 * - Hover & Click to view high-res celebration stills + heartfelt story
 * - Verified wedding badge with Muhurtham date, caste, city, and quote
 * - Gold shimmer frames + reduced-motion safe
 */

import { useState } from "react";
import Link from "next/link";
import { useLang, type Lang } from "@/lib/lang";

type WeddingStory = {
  src: string;
  te: string;
  en: string;
  tag: string;
  cityTe: string;
  cityEn: string;
  muhurtham: string;
  quoteTe: string;
  quoteEn: string;
  storyTe: string;
  storyEn: string;
};

const SHOTS: WeddingStory[] = [
  {
    src: "/promo/cine-4.jpg",
    te: "శ్రావణి & కిరణ్",
    en: "Sravani & Kiran",
    tag: "Reddy",
    cityTe: "హైదరాబాద్ & నల్గొండ",
    cityEn: "Hyderabad & Nalgonda",
    muhurtham: "ఫిబ్రవరి 18, 2026",
    quoteTe: "“మన వివాహలో కేవలం 45 రోజుల్లో మా ఇరు కుటుంబాల ఆలోచనలు కుదిరాయి — ఇప్పుడు మేము సంతోషకరమైన వైవాహిక జీవితంలో ఉన్నాము.”",
    quoteEn: "“Within 45 days on Mana Vivaha, both our families connected effortlessly — we are so happily married now.”",
    storyTe: "శ్రావణి (సాఫ్ట్‌వేర్ ఇంజనీర్) మరియు కిరణ్ (డాక్టర్) మన వివాహ ద్వారా వేద జాతక సరిపోలిక చూసుకుని ఒక్కటయ్యారు.",
    storyEn: "Sravani (Software Engineer) and Kiran (Doctor) matched with 98% Vedic Gunamelanam compatibility.",
  },
  {
    src: "/promo/cine-1.jpg",
    te: "దివ్య & రాజేష్",
    en: "Divya & Rajesh",
    tag: "Kamma",
    cityTe: "వరంగల్ & ఖమ్మం",
    cityEn: "Warangal & Khammam",
    muhurtham: "మార్చి 12, 2026",
    quoteTe: "“ఫేక్ ప్రొఫైల్స్ లేకుండా, డైరెక్ట్‌గా కుటుంబాలతో మాట్లాడే విధానం మాకు ఎంతో నచ్చింది.”",
    quoteEn: "“No fake profiles, direct family-to-family connection made everything so transparent and peaceful.”",
    storyTe: "రాజేష్ యూఎస్ నుండి ఇండియా వచ్చినప్పుడు మన వివాహ ద్వారా సంబంధం కుదిరి ఘనంగా పెళ్లి జరిగింది.",
    storyEn: "Rajesh (NRI USA) connected with Divya through verified community matching.",
  },
  {
    src: "/promo/cine-2.jpg",
    te: "అనూష & వంశీ",
    en: "Anusha & Vamsi",
    tag: "Kapu",
    cityTe: "విజయవాడ & గుంటూరు",
    cityEn: "Vijayawada & Guntur",
    muhurtham: "జనవరి 24, 2026",
    quoteTe: "“ఖచ్చితమైన నక్షత్ర పొంతన, నమ్మకమైన ప్రొఫైల్స్ — మాకు సరైన జోడీ దొరికింది.”",
    quoteEn: "“Accurate Nakshatra compatibility and verified profiles gave us our dream life partner.”",
    storyTe: "ఇరు కుటుంబాల సమక్షంలో అంగరంగ వైభవంగా జరిగిన శుభ వివాహం.",
    storyEn: "A magnificent traditional Telugu wedding celebrated with both families' blessings.",
  },
  {
    src: "/promo/cine-3.jpg",
    te: "మౌనిక & సాయి",
    en: "Mounika & Sai",
    tag: "Balija",
    cityTe: "గుంటూరు & తిరుపతి",
    cityEn: "Guntur & Tirupati",
    muhurtham: "మే 06, 2026",
    quoteTe: "“మొదటి 3 ప్రొఫైల్స్ ఉచితంగా చూశాం, సరైన సంబంధం కుదిరిన వెంటనే రిజిస్ట్రేషన్ పూర్తి చేసుకున్నాం.”",
    quoteEn: "“We tried the first 3 free profiles, found the exact match, and completed our sacred wedding.”",
    storyTe: "తిరుమల శ్రీవారి సన్నిధిలో జరిగిన పవిత్ర పాణిగ్రహణం.",
    storyEn: "Sacred wedding ceremony performed at Tirumala Tirupati.",
  },
];

const COPY = {
  te: {
    eyebrow: "నిజమైన తెలుగు శుభకార్యాలు",
    title: "ఇక్కడ పరిచయమై — కల్యాణ మంటపం దాకా",
    sub: "మన వివాహ ద్వారా ఒక్కటైన వేలాది సుఖసంతోషాల జంటలు. మీ పవిత్ర వివాహ కథ కూడా ఇక్కడే మొదలవుతుంది.",
    cta: "మీ కథ మొదలుపెట్టండి (ఉచిత నమోదు) →",
    modalClose: "మూసివేయి ✕",
    modalTag: "💍 మన వివాహ సక్సెస్ స్టోరీ",
    modalMuhurtham: "కల్యాణ ముహూర్తం:",
    modalPlace: "ప్రాంతం:",
  },
  en: {
    eyebrow: "Real Telugu Weddings",
    title: "From a First Hello — To The Sacred Mandapam",
    sub: "Thousands of happy couples who found their soulmate on Mana Vivaha. Your sacred story begins here too.",
    cta: "Begin Your Story (Free Register) →",
    modalClose: "Close ✕",
    modalTag: "💍 Mana Vivaha Success Story",
    modalMuhurtham: "Muhurtham Date:",
    modalPlace: "Location:",
  },
};

export default function RealWeddingsFilm() {
  const { lang } = useLang();
  const te = lang === "te";
  const L = COPY[(lang as Lang) in COPY ? (lang as Lang) : "te"];
  const [selectedStory, setSelectedStory] = useState<WeddingStory | null>(null);

  const reel = [...SHOTS, ...SHOTS];

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#12040e] via-[#1a0515] to-[#12040e] py-16 text-white" aria-label="Real Weddings Film Reel">
      
      {/* Soft Auspicious Gold & Maroon Ambience Orbs */}
      <div className="pointer-events-none absolute -top-24 left-1/4 h-80 w-80 rounded-full bg-[#f6d98a]/15 blur-[90px]" />
      <div className="pointer-events-none absolute -bottom-24 right-1/4 h-80 w-80 rounded-full bg-[#a0143a]/25 blur-[100px]" />

      {/* Header Section */}
      <div className="relative mx-auto max-w-7xl px-5 text-center">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-white/10 px-3.5 py-1 text-[11px] font-extrabold uppercase tracking-[.25em] text-[#f6d98a] backdrop-blur-md telugu">
          <span>💍</span>
          <span>{L.eyebrow}</span>
        </div>
        <h2 className="mt-3 text-3xl font-black leading-tight sm:text-4xl md:text-5xl telugu">
          {L.title}
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-white/80 md:text-base leading-relaxed telugu">
          {L.sub}
        </p>
      </div>

      {/* Auto-Scrolling Film Reel (Pauses on Hover) */}
      <div className="ticker-mask relative mt-10">
        <div className="ticker-track flex items-center hover:[animation-play-state:paused]" style={{ animationDuration: "36s" }}>
          {reel.map((s, i) => (
            <figure
              key={i}
              onClick={() => setSelectedStory(s)}
              className="group relative mx-3.5 h-72 w-[310px] sm:h-84 sm:w-[380px] md:h-96 md:w-[440px] shrink-0 overflow-hidden rounded-3xl border-2 border-gold/30 bg-black/40 shadow-2xl transition-all duration-500 hover:border-gold hover:scale-[1.02] cursor-pointer"
            >
              {/* Wedding Still Image */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={s.src}
                alt={te ? s.te : s.en}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              
              {/* Cinematic Vignette Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/25 to-transparent transition-opacity duration-300" />
              
              {/* Caste & Community Pill */}
              <span className="absolute right-3.5 top-3.5 rounded-full border border-white/20 bg-black/60 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[#f6d98a] backdrop-blur-md">
                {s.tag}
              </span>

              {/* View Story Hint on Hover */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <span className="rounded-full bg-gold px-4 py-2 text-xs font-black text-[#5c0821] shadow-2xl flex items-center gap-1.5 transform scale-95 group-hover:scale-100 transition-transform">
                  <span>🎬</span>
                  <span>{te ? "కథ చూడండి" : "View Story"}</span>
                </span>
              </div>

              {/* Caption Overlay */}
              <figcaption className="absolute bottom-4 left-5 right-5 text-left">
                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[#f6d98a]">
                  <span>✨</span>
                  <span>Married on Mana Vivaha</span>
                </div>
                <div className="mt-1 text-lg font-black text-white sm:text-xl telugu">
                  {te ? s.te : s.en}
                </div>
                <div className="text-xs text-white/70 telugu">
                  📍 {te ? s.cityTe : s.cityEn}
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>

      {/* CTA Button */}
      <div className="mt-10 text-center">
        <Link
          href="/register"
          className="inline-flex items-center gap-2 rounded-full gold-gradient px-8 py-4 text-sm font-black text-[#5c0821] shadow-gold transition hover:brightness-110 active:scale-95"
        >
          <span>✨</span>
          <span>{L.cta}</span>
        </Link>
      </div>

      {/* ================= LIGHTBOX MODAL: FULL STORY THEATER ================= */}
      {selectedStory && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xl animate-fade"
          onClick={() => setSelectedStory(null)}
        >
          <div
            className="relative max-w-xl w-full rounded-3xl border-2 border-gold/70 bg-[#170514] p-6 text-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setSelectedStory(null)}
              className="absolute top-4 right-4 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/20 transition cursor-pointer"
            >
              {L.modalClose}
            </button>

            {/* Header Stamp */}
            <div className="inline-flex items-center gap-1 text-[11px] font-black text-[#f6d98a] uppercase tracking-wider">
              <span>🪔</span>
              <span>{L.modalTag}</span>
            </div>

            {/* Photo & Details */}
            <div className="mt-4 flex flex-col sm:flex-row gap-4 items-center sm:items-start">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedStory.src}
                alt={te ? selectedStory.te : selectedStory.en}
                className="w-36 h-44 rounded-2xl object-cover border-2 border-gold/50 shrink-0 shadow-lg"
              />
              <div className="text-left space-y-1.5">
                <h3 className="text-2xl font-black text-white telugu">
                  {te ? selectedStory.te : selectedStory.en}
                </h3>
                <div className="text-xs text-amber-300 font-bold">
                  {L.modalMuhurtham} <span className="text-white">{selectedStory.muhurtham}</span>
                </div>
                <div className="text-xs text-white/80">
                  {L.modalPlace} <span className="font-semibold">{te ? selectedStory.cityTe : selectedStory.cityEn}</span>
                </div>
                <div className="mt-2 text-xs text-white/90 leading-relaxed italic bg-white/10 p-3 rounded-xl border border-white/15 telugu">
                  {te ? selectedStory.quoteTe : selectedStory.quoteEn}
                </div>
              </div>
            </div>

            {/* Story Paragraph */}
            <p className="mt-4 text-xs text-white/80 leading-relaxed border-t border-white/15 pt-3 telugu">
              {te ? selectedStory.storyTe : selectedStory.storyEn}
            </p>

            {/* Modal CTA */}
            <div className="mt-5 flex gap-3">
              <Link
                href="/register"
                className="flex-1 py-3 text-center rounded-xl gold-gradient text-maroon font-black text-xs shadow-md hover:brightness-105 transition"
              >
                💍 {te ? "మీ సంబంధం వెతకండి" : "Find Your Partner"}
              </Link>
              <button
                type="button"
                onClick={() => setSelectedStory(null)}
                className="px-4 py-3 rounded-xl border border-white/30 text-white text-xs font-bold hover:bg-white/10 transition"
              >
                {te ? "క్లోజ్ చేయండి" : "Close"}
              </button>
            </div>

          </div>
        </div>
      )}

    </section>
  );
}
