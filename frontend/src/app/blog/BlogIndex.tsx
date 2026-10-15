"use client";

import Link from "next/link";
import { BookOpen, ShieldCheck } from "lucide-react";
import { useLang } from "@/lib/lang";
import { BLOG_ARTICLES } from "@/lib/blog";

export default function BlogIndex() {
  const { lang } = useLang();
  const te = lang === "te";

  return (
    <div lang={te ? "te-IN" : "en-IN"} className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <header className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-maroon to-[#4d071d] p-6 text-white sm:p-10">
        <p className={`text-xs font-bold uppercase tracking-[.2em] text-gold ${te ? "telugu" : ""}`}>
          {te ? "మన వివాహ మార్గదర్శి" : "Mana Vivaha Guides"}
        </p>
        <h1 className={`mt-2 max-w-3xl text-3xl font-extrabold leading-tight sm:text-5xl ${te ? "telugu" : ""}`}>
          {te ? "తెలుగు వివాహ సలహాలు" : "Matrimony & Marriage Guides"}
        </h1>
        <p className={`mt-3 max-w-2xl text-sm leading-7 text-white/80 ${te ? "telugu" : ""}`}>
          {te
            ? "సరైన profile నుంచి safe meeting వరకు — కుటుంబాలకు సులభంగా అర్థమయ్యే, ఉపయోగకరమైన guides."
            : "Practical guidance—from creating a clear profile to meeting safely. Written for individuals and families, without promises of outcomes."}
        </p>
      </header>

      <div className="mt-8 grid gap-5 md:grid-cols-3">
        {BLOG_ARTICLES.map((article, index) => (
          <article key={article.slug} className="flex flex-col rounded-3xl border border-gold/30 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
            <div className="flex items-center justify-between">
              <div className="text-3xl" aria-hidden="true">{["📝", "🛡️", "💍"][index % 3]}</div>
              {index === 1 ? <ShieldCheck className="h-5 w-5 text-emerald-700" aria-hidden="true" /> : <BookOpen className="h-5 w-5 text-maroon/70" aria-hidden="true" />}
            </div>
            <p className={`mt-3 text-[10px] font-bold uppercase tracking-wider text-gold-deep ${te ? "telugu" : ""}`}>
              {te ? `${article.readMinutes} నిమిషాల చదువు` : `${article.readMinutes}-minute read`}
            </p>
            <h2 className={`mt-2 text-xl font-extrabold leading-8 text-maroon ${te ? "telugu" : ""}`}>
              <Link href={`/blog/${article.slug}`} className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon focus-visible:ring-offset-2">
                {te ? article.title : article.titleEn}
              </Link>
            </h2>
            <p className={`mt-3 flex-1 text-sm leading-7 text-slate-600 ${te ? "telugu" : ""}`}>
              {te ? article.description : article.descriptionEn}
            </p>
            <Link href={`/blog/${article.slug}`} className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-maroon px-4 text-sm font-bold text-white transition hover:bg-maroon-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon focus-visible:ring-offset-2">
              {te ? "పూర్తిగా చదవండి →" : "Read the guide →"}
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
