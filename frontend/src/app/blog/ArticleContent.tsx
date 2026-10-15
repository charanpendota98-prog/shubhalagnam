"use client";

import Link from "next/link";
import { useLang } from "@/lib/lang";
import type { BlogArticle } from "@/lib/blog";

export default function ArticleContent({ article }: { article: BlogArticle }) {
  const { lang } = useLang();
  const te = lang === "te";
  const sections = te ? article.sections : article.sectionsEn;

  return (
    <div lang={te ? "te-IN" : "en-IN"} className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      <nav className="text-xs text-slate-500" aria-label={te ? "నావిగేషన్ మార్గం" : "Breadcrumb"}>
        <Link href="/" className="rounded-sm hover:text-maroon focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon">
          {te ? "హోమ్" : "Home"}
        </Link>
        <span aria-hidden="true"> / </span>
        <Link href="/blog" className="rounded-sm hover:text-maroon focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon">
          {te ? "సలహాలు" : "Guides"}
        </Link>
      </nav>

      <article className="mt-4 rounded-[2rem] border border-gold/25 bg-white p-5 shadow-sm sm:p-9">
        <header className="border-b border-gold/25 pb-6">
          <p className={`text-xs font-bold text-gold-deep ${te ? "telugu" : ""}`}>
            {te ? `మన వివాహ గైడ్ • ${article.readMinutes} నిమిషాలు` : `Mana Vivaha Guide • ${article.readMinutes}-minute read`}
          </p>
          <h1 className={`mt-2 text-3xl font-extrabold leading-[1.4] text-maroon sm:text-4xl ${te ? "telugu" : ""}`}>
            {te ? article.title : article.titleEn}
          </h1>
          <p className={`mt-4 text-base leading-8 text-slate-700 ${te ? "telugu" : ""}`}>
            {te ? article.intro : article.introEn}
          </p>
          <p className="mt-3 text-[11px] text-slate-400">
            {te ? "తాజా నవీకరణ:" : "Updated:"} {article.updated}
          </p>
        </header>

        <div className="mt-7 space-y-9">
          {sections.map((section) => (
            <section key={section.heading}>
              <h2 className={`text-xl font-extrabold leading-8 text-maroon ${te ? "telugu" : ""}`}>
                {section.heading}
              </h2>
              {section.paragraphs.map((paragraph, index) => (
                <p key={`${section.heading}-${index}`} className={`mt-3 text-[15px] leading-8 text-slate-700 ${te ? "telugu" : ""}`}>
                  {paragraph}
                </p>
              ))}
              {section.tips ? (
                <ul className="mt-4 grid gap-2 rounded-2xl bg-amber-50 p-4 sm:grid-cols-2">
                  {section.tips.map((tip) => <li key={tip} className="text-sm font-semibold text-slate-700">✓ {tip}</li>)}
                </ul>
              ) : null}
            </section>
          ))}
        </div>

        <aside className="mt-10 rounded-2xl bg-maroon p-5 text-center text-white">
          <p className={`font-bold ${te ? "telugu" : ""}`}>
            {te ? "గౌరవంగా, సురక్షితంగా మీ సంబంధం వెతకండి" : "Search for a match with care and respect"}
          </p>
          <p className={`mx-auto mt-2 max-w-xl text-sm leading-6 text-white/80 ${te ? "telugu" : ""}`}>
            {te
              ? "ప్రొఫైల్స్ సభ్యులు అందించిన వివరాలపై ఆధారపడతాయి. వ్యక్తిగతంగా ధృవీకరించండి; ఫలితాలు లేదా స్పందనలకు హామీ లేదు."
              : "Profiles contain member-submitted information. Verify details independently; matches and responses are not guaranteed."}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Link href="/register" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-gold px-4 py-3 text-sm font-bold text-maroon focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
              {te ? "ఉచిత నమోదు" : "Register for free"}
            </Link>
            <Link href="/matches" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/40 px-4 py-3 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
              {te ? "సంబంధాలు చూడండి" : "Browse matches"}
            </Link>
          </div>
        </aside>
      </article>

      <Link href="/blog" className={`mt-6 inline-block rounded-sm text-sm font-bold text-maroon focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon ${te ? "telugu" : ""}`}>
        {te ? "← అన్ని తెలుగు guides" : "← All guides"}
      </Link>
    </div>
  );
}
