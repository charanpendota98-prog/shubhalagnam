"use client";

/**
 * Visible FAQ list for a page.
 *
 * The same items the server emitted as FAQPage JSON-LD are passed in both
 * languages, so what a crawler reads and what a person reads cannot drift.
 * Uses native <details> so it works without JavaScript.
 */

import { useLang } from "@/lib/lang";

export type FaqItem = { id: string; q: string; a: string };

export default function FaqBlock({
  itemsEn,
  itemsTe,
  headingEn = "Questions people ask",
  headingTe = "తరచుగా అడిగే ప్రశ్నలు",
  noteEn,
  noteTe,
}: {
  itemsEn: FaqItem[];
  itemsTe?: FaqItem[];
  headingEn?: string;
  headingTe?: string;
  noteEn?: string;
  noteTe?: string;
}) {
  const { lang } = useLang();
  const te = lang === "te";
  const items = (te ? itemsTe ?? itemsEn : itemsEn).filter((item) => item?.q && item?.a);
  if (items.length === 0) return null;

  return (
    <section className="mx-auto w-full max-w-3xl px-4 pb-12 pt-4" aria-label={te ? headingTe : headingEn}>
      <div className="rounded-2xl border border-[#B8860B]/25 bg-white/90 p-5 shadow-sm">
        <h2 className={`text-lg font-bold text-[#5c0821] ${te ? "telugu" : ""}`}>{te ? headingTe : headingEn}</h2>
        <div className="mt-3 divide-y divide-[#B8860B]/15">
          {items.map((item) => (
            <details key={item.id} className="group py-3">
              <summary className="flex min-h-11 cursor-pointer list-none items-start justify-between gap-3 text-[13px] font-semibold text-slate-900">
                <span className={te ? "telugu" : ""}>{item.q}</span>
                <span className="shrink-0 text-[#B8860B] transition group-open:rotate-45" aria-hidden="true">
                  +
                </span>
              </summary>
              <p className={`mt-2 text-[13px] leading-relaxed text-slate-600 ${te ? "telugu" : ""}`}>{item.a}</p>
            </details>
          ))}
        </div>
        {noteEn ? (
          <p className={`mt-3 text-[11px] leading-relaxed text-slate-500 ${te ? "telugu" : ""}`}>
            {te ? noteTe ?? noteEn : noteEn}
          </p>
        ) : null}
      </div>
    </section>
  );
}
