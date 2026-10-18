"use client";

import Link from "next/link";
import { useLang } from "@/lib/lang";

/**
 * Kept as a compatibility-safe component for older page compositions.
 * It intentionally has no star selectors, score, sample result, or fake chart.
 */
export default function HomePoruthamWidget() {
  const { lang } = useLang();
  const te = lang === "te";
  return (
    <section className="mx-auto max-w-7xl px-4 py-8" aria-labelledby="home-jathakam-title">
      <div className="rounded-[2rem] border border-amber-200 bg-white p-6 shadow-[0_15px_50px_rgba(122,12,46,.08)] sm:p-8">
        <p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-[#8b5364]">🪐 {te ? "నిజమైన ఆధారం అవసరం" : "Real evidence required"}</p>
        <h2 id="home-jathakam-title" className="mt-2 text-xl font-black text-[#5c0822] sm:text-2xl">
          {te ? "జాతకం కోసం అసలైన పత్రాన్ని సమర్పించండి" : "A real Jathakam starts with a real document"}
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          {te
            ? "కేవలం నక్షత్రం ఆధారంగా score లేదా fabricated chart చూపించము. మీ స్వంత profile లో నిజమైన జాతక PDF/ఫోటోను upload చేసి review స్థితిని మాత్రమే చూడండి."
            : "We do not show a star-only score or fabricate a chart. Upload the real horoscope PDF/photo from your own profile and see only its review state."}
        </p>
        <Link href="/porutham" className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#7a0c2e] px-4 py-2.5 text-sm font-bold text-white">
          {te ? "జాతక review తెరవండి" : "Open Jathakam review"} →
        </Link>
      </div>
    </section>
  );
}
