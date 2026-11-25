"use client";

/** 📡 Offline fallback — neat Telugu / clean English via toggle. */
import "@/components/private-fallback.css";
import "../resilience.css";

import Link from "@/components/LocaleLink";
import { FileCheck, Heart, Home, WifiOff } from "lucide-react";
import { useLang } from "@/lib/lang";
import { SITE_CONFIG } from "@/lib/site-config";

export default function OfflinePage() {
  const { lang } = useLang();
  const te = lang === "te";
  return (
    <div className="mv-private-fallback mv-offline-page min-h-dvh bg-cream flex items-center justify-center px-4 py-10 pb-24">
      <div className="bg-white rounded-[2rem] border border-gold/30 p-7 max-w-md w-full text-center card-shadow">
        <WifiOff aria-hidden="true" className="mx-auto h-12 w-12 text-maroon" />
        <h1 className="mt-3 text-xl font-bold text-maroon">
          {te ? "ఇంటర్నెట్ కనెక్షన్ అందుబాటులో లేనట్లుంది…" : "Looks like there's no internet…"}
        </h1>
        <p className="mt-2 text-[13px] text-gray-700 telugu">
          {te ? (
            <>ఇంటర్నెట్ తిరిగి వచ్చిన తర్వాత మళ్లీ ప్రయత్నించండి. ముందుగా సేవ్ అయిన కొన్ని పేజీలు మాత్రమే ఇంటర్నెట్ లేకుండా తెరుచుకోవచ్చు. ప్రొఫైళ్లు, తాజా సమాచారం మరియు ఇతర చర్యలకు ఇంటర్నెట్ అవసరం.</>
          ) : (
            <>Try again when you are back online. Only some previously cached pages may open offline; profiles, fresh data, and actions require an internet connection.</>
          )}
        </p>
        <div className="mt-4 flex flex-col gap-2">
          <Link href="/" className="py-3 rounded-2xl maroon-gradient text-white font-bold text-[13px]">
            <Home aria-hidden="true" className="mr-2 h-4 w-4 shrink-0" />{te ? "హోమ్‌కు వెళ్ళండి" : "Go home"}
          </Link>
          <Link href="/matches" className="py-3 rounded-2xl border border-maroon/25 text-maroon font-bold text-[13px]">
            <Heart aria-hidden="true" className="mr-2 h-4 w-4 shrink-0" />{te ? "సంబంధాలు చూడండి" : "See matches"}
          </Link>
          <Link href="/porutham" className="py-3 rounded-2xl border border-maroon/25 text-maroon font-bold text-[13px]">
            <FileCheck aria-hidden="true" className="mr-2 h-4 w-4 shrink-0" />{te ? "జాతక పత్రాల పరిశీలన" : "Jathakam document review"}
          </Link>
        </div>
        {SITE_CONFIG.supportLink ? (
          <LocaleAnchor href={SITE_CONFIG.supportLink} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white focus-brand">
            {te ? "వాట్సాప్ సహాయం తెరవండి" : "Open WhatsApp support (configured contact)"}
          </LocaleAnchor>
        ) : (
          <p className="mt-4 text-[11px] text-gray-500">
            {te ? "ఈ వెబ్‌సైట్‌లో వాట్సాప్ సహాయ సంప్రదింపు వివరాలు అందుబాటులో లేవు." : "WhatsApp support is not configured for this deployment."}
          </p>
        )}
      </div>
    </div>
  );
}

import LocaleAnchor from "@/components/LocaleAnchor";
