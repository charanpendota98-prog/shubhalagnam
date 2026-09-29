"use client";

/** 📡 Offline fallback — neat Telugu / clean English via toggle. */
import Link from "next/link";
import { useLang } from "@/lib/lang";

export default function OfflinePage() {
  const { lang } = useLang();
  const te = lang === "te";
  return (
    <main className="min-h-screen bg-cream flex items-center justify-center px-4">
      <div className="bg-white rounded-[2rem] border border-gold/30 p-7 max-w-md w-full text-center card-shadow">
        <div className="text-5xl">📡</div>
        <h1 className="mt-3 text-xl font-bold text-maroon">
          {te ? "Internet లేదు అనుకుంటా…" : "Looks like there's no internet…"}
        </h1>
        <p className="mt-2 text-[13px] text-gray-700 telugu">
          {te ? (
            <>సిగ్నల్ రాగానే మళ్లీ ప్రయత్నించండి. మీరు చూసిన పేజీలు ఆఫ్‌లైన్‌లో కూడా అందుబాటులో ఉంటాయి
              (సంబంధాలు, వేద గుణమేళనం రిపోర్ట్, భద్రతా సూచనలు).</>
          ) : (
            <>Try again once the signal is back. Pages you already visited open offline too
              (matches, Gunamelanam report, safety tips).</>
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
            {te ? "💍 వేద గుణమేళనం" : "💍 Gunamelanam report"}
          </Link>
        </div>
        <div className="mt-4 text-[11px] text-gray-500">
          {te ? "Offline లో కూడా మీ WhatsApp number + card ready ఉంటాయి — మన support కి message పెట్టండి."
              : "Your WhatsApp number + card stay ready offline too — message our support."}
        </div>
      </div>
    </main>
  );
}
