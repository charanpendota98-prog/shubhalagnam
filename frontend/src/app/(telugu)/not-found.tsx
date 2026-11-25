"use client";

/** 404 — neat Telugu / clean English via toggle. No fake counts. */
import Link from "@/components/LocaleLink";
import { FileQuestion, Heart, Home, Megaphone, UserPlus } from "lucide-react";
import "@/components/private-fallback.css";
import "./resilience.css";
import { useLang } from "@/lib/lang";

export default function NotFound() {
  const { lang } = useLang();
  const te = lang === "te";
  return (
    <div className="mv-private-fallback mv-missing-page mx-auto max-w-xl px-4 py-16 pb-24 text-center">
      <FileQuestion aria-hidden="true" className="mx-auto h-12 w-12 text-maroon" />
      <h1 className="mt-3 text-2xl font-extrabold text-[#7A0C2E]">
        {te ? "ఈ పేజీ దొరకలేదు (404)" : "This page was not found (404)"}
      </h1>
      <p className="mt-2 text-slate-600">
        {te ? "ఈ చిరునామాలో పేజీ అందుబాటులో లేదు. లింక్‌ను పరిశీలించండి లేదా కింది ఎంపికలను ఉపయోగించండి."
            : "No page is available at this address. Check the link or use the options below."}
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link href="/" className="rounded-xl bg-[#7A0C2E] px-4 py-2 font-semibold text-white">
          <Home aria-hidden="true" className="mr-2 h-4 w-4 shrink-0" />{te ? "హోమ్" : "Home"}
        </Link>
        <Link href="/matches" className="rounded-xl border border-[#7A0C2E] px-4 py-2 font-semibold text-[#7A0C2E]">
          <Heart aria-hidden="true" className="mr-2 h-4 w-4 shrink-0" />{te ? "సంబంధాలు" : "Matches"}
        </Link>
        <Link href="/register" className="rounded-xl border border-[#7A0C2E] px-4 py-2 font-semibold text-[#7A0C2E]">
          <UserPlus aria-hidden="true" className="mr-2 h-4 w-4 shrink-0" />{te ? "ఉచితంగా నమోదు చేయండి" : "Register FREE"}
        </Link>
        <Link href="/channels" className="rounded-xl border border-slate-300 px-4 py-2 font-semibold text-slate-700">
          <Megaphone aria-hidden="true" className="mr-2 h-4 w-4 shrink-0" />{te ? "ఛానళ్లు" : "Channels"}
        </Link>
      </div>
    </div>
  );
}
