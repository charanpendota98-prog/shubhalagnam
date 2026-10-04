"use client";
/** ⚠️ Error boundary — crash aithe friendly Telugu message + retry (white screen ledu) */
import { useEffect } from "react";
import Link from "next/link";
import { useLang } from "@/lib/lang";
import { SITE_CONFIG } from "@/lib/site-config";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { lang } = useLang();
  const te = lang === "te";
  useEffect(() => {
    console.error("[MANA-VIVAHA] page error:", error?.message, error?.digest || "");
  }, [error]);
  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <p className="text-5xl">🛠️</p>
      <h1 className="mt-3 text-2xl font-extrabold text-[#7A0C2E]">{te ? "కొంచెం problem వచ్చింది" : "Something went wrong"}</h1>
      <p className="mt-2 text-slate-600">
        {te ? "పేజీ తెరవడంలో సమస్య వచ్చింది. మళ్లీ ప్రయత్నించండి. సమస్య కొనసాగితే, ఈ deployment‌లో కనిపించే configured support contact‌ను ఉపయోగించండి." : "The page could not load. Please retry. If the problem continues, use a support contact only if one is configured on this deployment."}
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <button onClick={reset} className="rounded-xl bg-[#7A0C2E] px-4 py-2 font-semibold text-white">{te ? "🔄 మళ్లీ try" : "🔄 Retry"}</button>
        <Link href="/" className="rounded-xl border border-[#7A0C2E] px-4 py-2 font-semibold text-[#7A0C2E]">{te ? "🏠 హోమ్" : "🏠 Home"}</Link>
        {SITE_CONFIG.supportLink ? <a href={SITE_CONFIG.supportLink} target="_blank" rel="noopener noreferrer" className="rounded-xl border border-emerald-700 px-4 py-2 font-semibold text-emerald-800">{te ? "WhatsApp support" : "WhatsApp support"}</a> : null}
      </div>
      {error?.digest && <p className="mt-4 text-xs text-slate-400">ref: {error.digest}</p>}
    </div>
  );
}
