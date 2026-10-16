"use client";

/**
 * Member stories on the homepage — real proof, honestly labelled.
 *
 * Only approved stories are shown, and only through `storyCards()` so no
 * profile identifier can reach the markup. When there is nothing approved the
 * section disappears completely rather than showing invented testimonials.
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { Heart, Quote, Sparkles } from "lucide-react";

import Reveal from "@/components/Reveal";
import SectionHeading from "@/components/SectionHeading";
import { CardSkeletonList } from "@/components/Skeletons";
import { useLang } from "@/lib/lang";
import { serializeJsonLd } from "@/lib/safe-json-ld";
import { duo } from "@/lib/duo";
import { storyCards, storyDisclaimer } from "@/lib/story-cards.mjs";

type StoryCard = {
  id: string;
  names: string;
  district: string;
  text: string;
  excerpt: string;
  photo: string;
  likes: number;
  date: string;
};

export default function HomeStories() {
  const { lang } = useLang();
  const te = lang === "te";
  const [cards, setCards] = useState<StoryCard[] | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/stories?limit=6", { cache: "no-store", signal: controller.signal })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("stories"))))
      .then((data) => {
        const rows = Array.isArray(data?.stories) ? data.stories : [];
        setCards(storyCards(rows, { limit: 6, max: 190 }).filter((card): card is StoryCard => Boolean(card)));
      })
      .catch((error) => {
        if (error?.name !== "AbortError") setCards([]);
      });
    return () => controller.abort();
  }, []);

    if (cards === null) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10" aria-busy="true">
        <CardSkeletonList n={3} />
      </div>
    );
  }
  if (cards.length === 0) return null;

  return (
    <section
      className="relative mx-auto max-w-7xl px-4 py-10"
      aria-label={te ? "సభ్యుల వివాహ కథలు" : "Member wedding stories"}
    >
      <Reveal>
        <SectionHeading
          eyebrow={duo("💑 Real member stories", "💑 నిజమైన సభ్యుల కథలు")}
          title={duo("Couples who met here", "ఇక్కడ కలిసిన జంటలు")}
          subtitle={duo(
            "Stories are published when a member submits them and they pass moderation. They are moments, not promises — every match depends on the two people in it.",
            "కథలు సభ్యులు సమర్పించి, మోడరేషన్ దాటిన తర్వాత ప్రచురితమవుతాయి. ఇవి హామీలు కావు — ప్రతి సంబంధం ఆ ఇద్దరిపై ఆధారపడి ఉంటుంది.",
          )}
          telugu
        />
      </Reveal>

      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card, index) => (
          <li key={card.id || index}>
            <Reveal delay={index * 50}>
              <article className="flex h-full flex-col rounded-2xl border border-[#B8860B]/25 bg-white/90 p-5 shadow-sm transition hover:shadow-md">
                <span className="text-2xl leading-none text-[#B8860B]" aria-hidden="true">
                  <Quote className="inline" size={20} />
                </span>
                <p className={`mt-3 flex-1 text-sm leading-relaxed text-slate-700 ${te ? "telugu" : ""}`}>
                  {card.excerpt}
                </p>
                <footer className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                  <span className="text-xs font-semibold text-[#5c0821]">
                    {card.names || (te ? "సభ్యుడు" : "Member")}
                    {card.district ? <span className="font-normal text-slate-500"> · {card.district}</span> : null}
                  </span>
                  {card.likes > 0 && (
                    <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                      <Heart size={12} aria-hidden="true" />
                      {card.likes}
                      <span className="sr-only">{te ? "లైక్లు" : "likes"}</span>
                    </span>
                  )}
                </footer>
              </article>
            </Reveal>
          </li>
        ))}
      </ul>

      <p className={`mt-4 text-[11px] leading-relaxed text-slate-500 ${te ? "telugu" : ""}`}>
        {storyDisclaimer(te)}
      </p>

      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          href="/stories"
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#B8860B]/40 gold-gradient px-5 py-2.5 text-sm font-black text-[#5c0821] shadow-gold transition hover:brightness-105 active:scale-[.98]"
        >
          <Sparkles size={15} aria-hidden="true" />
          {te ? "అన్ని కథలు చూడండి" : "Read all stories"}
        </Link>
        <Link
          href="/stories#share"
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-[#B8860B]/50 hover:text-[#5c0821]"
        >
          {te ? "మీ కథ పంపండి" : "Share your story"}
        </Link>
      </div>

      <script
        type="application/ld+json"
        // Approved stories only — no identifiers, no invented names or ratings.
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd({
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: te ? "మన వివాహ సభ్యుల కథలు" : "Mana Vivaha member stories",
            numberOfItems: cards.length,
            itemListElement: cards.map((card, index) => ({
              "@type": "ListItem",
              position: index + 1,
              item: {
                "@type": "CreativeWork",
                name: card.names || (te ? "సభ్యుడి కథ" : "Member story"),
                text: card.excerpt,
                ...(card.district ? { about: card.district } : {}),
              },
            })),
          }),
        }}
      />
    </section>
  );
}
