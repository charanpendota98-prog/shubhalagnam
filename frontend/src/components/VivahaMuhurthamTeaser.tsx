"use client";

/**
 * 🗓️ VIVAHA MUHURTHAM TEASER — reference calendar entries
 * ====================================================================
 * Reference calendar entries for 2026-2027; date/time accuracy is not
 * independently validated here. Encourage local confirmation before use.
 */
import Link from "next/link";
import { useEffect, useState } from "react";
import { useLang } from "@/lib/lang";
import { VIVAHA_MUHURTHAMS_2026_2027, MuhurthamDate, formatMuhurthamDate, formatMuhurthamMonth, formatMuhurthamTime } from "@/lib/muhurtham-data";

export default function VivahaMuhurthamTeaser() {
  const { lang } = useLang();
  const te = lang === "te";

  // Use the viewer's local date after hydration to avoid server/client timezone mismatch.
  const [today, setToday] = useState("");
  useEffect(() => {
    const now = new Date();
    setToday(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`);
  }, []);
  const upcomingDates = VIVAHA_MUHURTHAMS_2026_2027.filter((m) => !today || m.date >= today).slice(0, 4);

  const shareWa = (m: MuhurthamDate) => {
    const text = te
      ? `💍 మన వివాహ — ముహూర్త తేదీ సూచిక 📅\n🗓️ తేదీ: ${formatMuhurthamDate(m, true)}\n🌙 మాసం: ${formatMuhurthamMonth(m, true)}\n⭐ నక్షత్రం: ${m.nakshatram}\n👑 లగ్నం: ${m.lagnam}\n⏰ సమయం: ${formatMuhurthamTime(m, true)}\n⚠️ ఇది reference సమాచారం మాత్రమే; booking ముందు స్థానికంగా నిర్ధారించండి.\n\nప్రొఫైళ్లు: ${window.location.origin}/matches`
      : `💍 Mana Vivaha — Muhurtham date reference 📅\nDate: ${formatMuhurthamDate(m, false)}\nMonth: ${formatMuhurthamMonth(m, false)}\nNakshatra: ${m.nakshatram}\nLagnam: ${m.lagnam}\nTime: ${formatMuhurthamTime(m, false)}\n⚠️ Reference information only; confirm locally before booking.\n\nProfiles: ${window.location.origin}/matches`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  };

  return (
    <section className="max-w-7xl mx-auto px-4 py-6" aria-label={te ? "వివాహ ముహూర్త సూచిక తేదీలు" : "Muhurtham reference dates"}>
      <div className="relative rounded-[2.5rem] bg-gradient-to-r from-[#7A0C2E] via-[#5c0822] to-[#3b0415] text-white p-6 sm:p-9 shadow-2xl border-2 border-gold/40 overflow-hidden">
        
        {/* Background Ambient Gold Sparkles */}
        <div className="pointer-events-none absolute -top-16 -right-16 w-64 h-64 rounded-full bg-gold/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-amber-500/15 blur-3xl" />

        {/* Header */}
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/20 pb-5">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-[11px] font-black uppercase bg-gold/20 text-[#f6d98a] border border-gold/40 backdrop-blur-md">
              <span>🪔</span>
              <span>{te ? "వివాహ ముహూర్తాల సూచిక క్యాలెండర్ 2026-2027" : "VIVAHA MUHURTHAM REFERENCE · 2026-2027"}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white mt-2 telugu">
              {te ? "రాబోయే ముహూర్త తేదీలు 💍" : "Upcoming Muhurtham Dates 💍"}
            </h2>
            <p className="text-xs sm:text-sm text-white/80 mt-1 max-w-2xl leading-relaxed telugu">
              {te
                ? "ఇవి reference తేదీలు/సమయాలు మాత్రమే; ఈ క్యాలెండర్‌ను మేము స్వతంత్రంగా నిర్ధారించలేదు. ప్రదేశం, పంచాంగం, కుటుంబ ఆచారాల ప్రకారం మారవచ్చు — booking ముందు స్థానిక నిపుణుడితో నిర్ధారించండి."
                : "Reference dates and times only; this calendar has not been independently validated. They can vary by place, panchangam, and family tradition—confirm locally before booking."}
            </p>
          </div>

          <Link
            href="/muhurtham"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl gold-gradient text-maroon text-xs sm:text-sm font-black shadow-gold hover:brightness-110 active:scale-95 transition whitespace-nowrap self-start md:self-auto"
          >
            <span>🗓️</span>
            <span className="telugu">{te ? "అన్ని ముహూర్తాల క్యాలెండర్ →" : "View Full Calendar →"}</span>
          </Link>
        </div>

        {/* Muhurtham Cards Grid */}
        <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {upcomingDates.map((m) => (
            <div
              key={m.date}
              className="group relative rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 hover:border-gold/60 p-4 backdrop-blur-md shadow-lg transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                {/* Month & Season Pill */}
                <div className="flex items-center text-[11px] font-bold text-[#f6d98a]">
                  <span>🌙 {formatMuhurthamMonth(m, te)}</span>
                </div>

                {/* Gregorian & Telugu Date */}
                <div className="mt-2 text-lg font-black text-white telugu">
                  {formatMuhurthamDate(m, te)}
                </div>

                {/* Lagnam & Nakshatram */}
                <div className="mt-3 space-y-1.5 text-xs text-white/90">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#f6d98a]">{te ? "👑 లగ్నం:" : "👑 Lagnam:"}</span>
                    <span className="font-bold">{m.lagnam}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#f6d98a]">{te ? "⭐ నక్షత్రం:" : "⭐ Nakshatra:"}</span>
                    <span className="font-bold">{m.nakshatram}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-white/70">
                    <span>{te ? "⏰ సమయం:" : "⏰ Time:"}</span>
                    <span>{formatMuhurthamTime(m, te)}</span>
                  </div>
                </div>
              </div>

              {/* Card Footer: WhatsApp Share button */}
              <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between gap-2">
                <span className="text-[10px] text-amber-100/90">{te ? "స్థానికంగా నిర్ధారించండి" : "Confirm locally"}</span>
                <button
                  type="button"
                  onClick={() => shareWa(m)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1 shadow-sm transition active:scale-95 cursor-pointer"
                  title="Share Muhurtham on WhatsApp"
                >
                  <span>💬</span>
                  <span>{te ? "షేర్" : "Share"}</span>
                </button>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
