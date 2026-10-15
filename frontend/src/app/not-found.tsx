"use client";

/** 404 — neat Telugu / clean English via toggle. No fake counts. */
import Link from "next/link";
import { useLang } from "@/lib/lang";

export default function NotFound() {
  const { lang } = useLang();
  const te = lang === "te";
  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <p className="text-5xl">🔍</p>
      <h1 className="mt-3 text-2xl font-extrabold text-[#7A0C2E]">
        {te ? "ఈ page దొరకలేదు (404)" : "This page was not found (404)"}
      </h1>
      <p className="mt-2 text-slate-600">
        {te ? "Link తప్పు ఉండొచ్చు (లేదా profile తీసేశారు). కింద options try చెయ్యండి — రోజూ కొత్త profiles వస్తున్నాయి."
            : "The link may be wrong (or the profile was removed). Try the options below — new profiles arrive daily."}
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link href="/" className="rounded-xl bg-[#7A0C2E] px-4 py-2 font-semibold text-white">
          {te ? "🏠 Home" : "🏠 Home"}
        </Link>
        <Link href="/matches" className="rounded-xl border border-[#7A0C2E] px-4 py-2 font-semibold text-[#7A0C2E]">
          {te ? "💞 Matches" : "💞 Matches"}
        </Link>
        <Link href="/register" className="rounded-xl border border-[#7A0C2E] px-4 py-2 font-semibold text-[#7A0C2E]">
          {te ? "🆓 Register FREE" : "🆓 Register FREE"}
        </Link>
        <Link href="/channels" className="rounded-xl border border-slate-300 px-4 py-2 font-semibold text-slate-700">
          {te ? "📢 Channels" : "📢 Channels"}
        </Link>
      </div>
    </div>
  );
}
