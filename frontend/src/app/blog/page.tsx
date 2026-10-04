import type { Metadata } from "next";
import Link from "next/link";
import { BLOG_ARTICLES } from "@/lib/blog";

export const metadata: Metadata = {
  title: "తెలుగు వివాహ సలహాలు & మ్యాట్రిమోనీ గైడ్స్",
  description: "తెలుగు మ్యాట్రిమోనీ ప్రొఫైల్, పెళ్లి సంబంధాలు, online safety మరియు కుటుంబ checklist పై నమ్మకమైన తెలుగు articles.",
  alternates: { canonical: "/blog" },
};

export default function BlogPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <header className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-maroon to-[#4d071d] p-6 text-white sm:p-10">
        <p className="text-xs font-bold uppercase tracking-[.2em] text-gold">మన వివాహ మార్గదర్శి</p>
        <h1 className="mt-2 max-w-3xl text-3xl font-extrabold leading-tight telugu sm:text-5xl">తెలుగు వివాహ సలహాలు</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-white/80 telugu">సరైన profile నుంచి safe meeting వరకు — కుటుంబాలకు సులభంగా అర్థమయ్యే, ఉపయోగకరమైన guides.</p>
      </header>
      <div className="mt-8 grid gap-5 md:grid-cols-3">
        {BLOG_ARTICLES.map((a, i) => (
          <article key={a.slug} className="flex flex-col rounded-3xl border border-gold/30 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
            <div className="text-3xl" aria-hidden="true">{["📝", "🛡️", "💍"][i % 3]}</div>
            <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-gold-deep">{a.readMinutes} నిమిషాల చదువు</p>
            <h2 className="mt-2 text-xl font-extrabold leading-8 text-maroon telugu"><Link href={`/blog/${a.slug}`}>{a.title}</Link></h2>
            <p className="mt-3 flex-1 text-sm leading-7 text-slate-600 telugu">{a.description}</p>
            <Link href={`/blog/${a.slug}`} className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-maroon px-4 text-sm font-bold text-white">పూర్తిగా చదవండి →</Link>
          </article>
        ))}
      </div>
    </div>
  );
}
