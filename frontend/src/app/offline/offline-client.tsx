"use client";

/** 📡 Offline fallback — neat Telugu / clean English via toggle. */
import Link from "next/link";
import { useLang } from "@/lib/lang";
import { SITE_CONFIG } from "@/lib/site-config";

export default function OfflinePage() {
  const { lang } = useLang();
  const te = lang === "te";
  return (
    <div className="min-h-dvh bg-cream flex items-center justify-center px-4">
      <div className="bg-white rounded-[2rem] border border-gold/30 p-7 max-w-md w-full text-center card-shadow">
        <div className="text-5xl">📡</div>
        <h1 className="mt-3 text-xl font-bold text-maroon">
          {te ? "Internet లేదు అనుకుంటా…" : "Looks like there's no internet…"}
        </h1>
        <p className="mt-2 text-[13px] text-gray-700 telugu">
          {te ? (
            <>ఇంటర్నెట్ తిరిగి వచ్చిన తర్వాత మళ్లీ ప్రయత్నించండి. ముందుగా cache అయిన కొన్ని పేజీలు మాత్రమే ఆఫ్‌లైన్‌లో తెరుచుకోవచ్చు; profiles, తాజా సమాచారం మరియు actions‌కు internet అవసరం.</>
          ) : (
            <>Try again when you are back online. Only some previously cached pages may open offline; profiles, fresh data, and actions require an internet connection.</>
          )}
        </p>
        <div className="mt-4 flex flex-col gap-2">
          <Link href="/" className="py-3 rounded-2xl maroon-gradient text-white font-bold text-[13px]">
            {te ? "🏠 Home కి వెళ్లు" : "🏠 Go home"}
          </Link>
          <Link href="/matches" className="py-3 rounded-2xl border border-maroon/25 text-maroon font-bold text-[13px]">
            {te ? "🔎 Matches చూడండి" : "🔎 See matches"}
          </Link>
          <Link href="/porutham" className="py-3 rounded-2xl border border-maroon/25 text-maroon font-bold text-[13px]">
            {te ? "🪐 జాతక పత్రం review" : "🪐 Jathakam document review"}
          </Link>
        </div>
        {SITE_CONFIG.supportLink ? (
          <a href={SITE_CONFIG.supportLink} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white focus-brand">
            {te ? "WhatsApp support తెరవండి (configured contact)" : "Open WhatsApp support (configured contact)"}
          </a>
        ) : (
          <p className="mt-4 text-[11px] text-gray-500">
            {te ? "ఈ deployment‌లో WhatsApp support contact configure కాలేదు." : "WhatsApp support is not configured for this deployment."}
          </p>
        )}
      </div>
    </div>
  );
}
