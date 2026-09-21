"use client";

/**
 * 💐 REAL WEDDINGS — cinematic motion gallery.
 * An auto-scrolling "wedding film reel" of real celebration stills with hover
 * zoom + a caption overlay, framed like a top-matrimony success showcase.
 * Bilingual + reduced-motion safe (marquee pauses via CSS media query).
 */

import Link from "next/link";
import { useLang, type Lang } from "@/lib/lang";

const SHOTS = [
  { src: "/promo/cine-4.jpg", te: "శ్రావణి & కిరణ్ · హైదరాబాద్", en: "Sravani & Kiran · Hyderabad", tag: "Reddy" },
  { src: "/promo/cine-1.jpg", te: "దివ్య & రాజేష్ · వరంగల్", en: "Divya & Rajesh · Warangal", tag: "Kamma" },
  { src: "/promo/cine-2.jpg", te: "అనూష & వంశీ · విజయవాడ", en: "Anusha & Vamsi · Vijayawada", tag: "Kapu" },
  { src: "/promo/cine-3.jpg", te: "మౌనిక & సాయి · గుంటూరు", en: "Mounika & Sai · Guntur", tag: "Balija" },
];

const COPY = {
  te: {
    eyebrow: "నిజమైన పెళ్లిళ్లు",
    title: "ఇక్కడ మొదలై — మంటపం దాకా",
    sub: "మన వివాహలో కలిసిన జంటలు. మీ కథ కూడా ఇక్కడే మొదలవుతుంది.",
    cta: "మీ కథ మొదలుపెట్టండి →",
  },
  en: {
    eyebrow: "Real weddings",
    title: "From a hello here — to the mandapam",
    sub: "Couples who met on Mana Vivaha. Your story begins here too.",
    cta: "Start your story →",
  },
};

export default function RealWeddingsFilm() {
  const { lang } = useLang();
  const L = COPY[(lang as Lang) in COPY ? (lang as Lang) : "te"];
  const reel = [...SHOTS, ...SHOTS];

  return (
    <section className="relative overflow-hidden bg-[#150410] py-14 text-white">
      {/* soft gold ambience */}
      <div className="pointer-events-none absolute -top-24 left-1/4 h-72 w-72 rounded-full bg-[#f6d98a]/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 right-1/4 h-72 w-72 rounded-full bg-[#a0143a]/25 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-5 text-center">
        <p className="text-[11px] font-extrabold uppercase tracking-[.3em] text-[#f6d98a] telugu">{L.eyebrow}</p>
        <h2 className="mt-2 text-3xl font-black leading-tight md:text-5xl telugu">{L.title}</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-white/80 md:text-base telugu">{L.sub}</p>
      </div>

      {/* auto-scrolling film reel */}
      <div className="ticker-mask relative mt-9">
        <div className="ticker-track" style={{ animationDuration: "40s" }}>
          {reel.map((s, i) => (
            <figure
              key={i}
              className="group relative mx-3 h-64 w-[300px] shrink-0 overflow-hidden rounded-3xl border border-white/15 shadow-2xl md:h-80 md:w-[420px]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={s.src}
                alt={lang === "en" ? s.en : s.te}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
              <span className="absolute right-3 top-3 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold backdrop-blur-md">
                {s.tag}
              </span>
              <figcaption className="absolute bottom-3 left-4 right-4 text-left">
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#f6d98a]">💍 Married on Mana Vivaha</div>
                <div className="mt-0.5 text-[15px] font-bold telugu">{lang === "en" ? s.en : s.te}</div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>

      <div className="mt-9 text-center">
        <Link
          href="/register"
          className="inline-flex items-center gap-2 rounded-full gold-gradient px-7 py-3.5 text-sm font-black text-[#5c0821] shadow-gold transition hover:brightness-105"
        >
          {L.cta}
        </Link>
      </div>
    </section>
  );
}
