"use client";

import { useLang } from "@/lib/lang";

/** Lightweight route skeleton: reserves layout without exposing technical copy. */
export default function Loading() {
  const { lang } = useLang();
  const label = lang === "te" ? "పేజీ సిద్ధమవుతోంది" : "Loading page";
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8" aria-busy="true" aria-label={label}>
      <span className="sr-only">{label}</span>
      <div className="animate-pulse space-y-5" aria-hidden="true">
        <div className="h-7 w-2/3 max-w-md rounded-lg bg-maroon/10" />
        <div className="h-4 w-1/3 max-w-xs rounded bg-gold/10" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-40 rounded-2xl border border-gold/10 bg-white/70" />
          ))}
        </div>
      </div>
    </main>
  );
}
