"use client";
/** ⚠️ Error boundary — crash aithe friendly Telugu message + retry (white screen ledu) */
import { useEffect } from "react";
import Link from "next/link";
import { useLang } from "@/lib/lang";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { lang } = useLang();
  const te = lang === "te";
  useEffect(() => {
    console.error("[MANA-VIVAHA] page error:", error?.message, error?.digest || "");
  }, [error]);
  return (
    <main className="mx-auto max-w-xl px-4 py-16 text-center">
      <p className="text-5xl">🛠️</p>
      <h1 className="mt-3 text-2xl font-extrabold text-[#7A0C2E]">{te ? "కొంచెం problem వచ్చింది" : "Something went wrong"}</h1>
      <p className="mt-2 text-slate-600">
        {te ? "Page load లో error. మీ data safe — మళ్లీ try చెయ్యండి. Repeat అయితే మన support WhatsApp కి చెప్పండి." : "Error loading page. Your data is safe — retry. If it repeats, tell our support WhatsApp."}
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <button onClick={reset} className="rounded-xl bg-[#7A0C2E] px-4 py-2 font-semibold text-white">{te ? "🔄 మళ్లీ try" : "🔄 Retry"}</button>
        <Link href="/" className="rounded-xl border border-[#7A0C2E] px-4 py-2 font-semibold text-[#7A0C2E]">{te ? "🏠 హోమ్" : "🏠 Home"}</Link>
      </div>
      {error?.digest && <p className="mt-4 text-xs text-slate-400">ref: {error.digest}</p>}
    </main>
  );
}
