"use client";

/**
 * 🗓️ VIVAHA MUHURTHAM TEASER STRIP — మన వివాహ వేద పంచాంగ ముహూర్తాలు
 * ====================================================================
 * Auspicious Telugu Vivaha Muhurthams 2026-2027 showcase:
 * - Upcoming peak marriage muhurtham dates with Lagnam & Nakshatram
 * - 1-Click WhatsApp sharing & Full Muhurtham calendar link
 */
import Link from "next/link";
import { useLang } from "@/lib/lang";
import { VIVAHA_MUHURTHAMS_2026_2027, MuhurthamDate } from "@/lib/muhurtham-data";

export default function VivahaMuhurthamTeaser() {
  const { lang } = useLang();
  const te = lang === "te";

  // Take the next 4 peak muhurthams
  const peakDates = VIVAHA_MUHURTHAMS_2026_2027.filter((m) => m.notes.includes("శ్రేష్టం") || m.notes.includes("అత్యుత్తమం")).slice(0, 4);

  const shareWa = (m: MuhurthamDate) => {
    const text = `💍 శుభలగ్నం — వివాహ సుముహూర్తం 📅\n` +
      `🗓️ తేదీ: ${m.teluguDate}\n` +
      `🌙 మాసం: ${m.teluguMonth}\n` +
      `⭐ నక్షత్రం: ${m.nakshatram}\n` +
      `👑 లగ్నం: ${m.lagnam}\n` +
      `⏰ సమయం: ${m.timeRange}\n` +
      `✨ విశేషం: ${m.notes}\n\n` +
      `మన వివాహ సంబంధాల కోసం: ${window.location.origin}/matches`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <section className="max-w-7xl mx-auto px-4 py-6" aria-label="Auspicious Vivaha Muhurthams">
      <div className="relative rounded-[2.5rem] bg-gradient-to-r from-[#7A0C2E] via-[#5c0822] to-[#3b0415] text-white p-6 sm:p-9 shadow-2xl border-2 border-gold/40 overflow-hidden">
        
        {/* Background Ambient Gold Sparkles */}
        <div className="pointer-events-none absolute -top-16 -right-16 w-64 h-64 rounded-full bg-gold/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-amber-500/15 blur-3xl" />

        {/* Header */}
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/20 pb-5">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-[11px] font-black uppercase bg-gold/20 text-[#f6d98a] border border-gold/40 backdrop-blur-md">
              <span>🪔</span>
              <span>{te ? "వేద పంచాంగ వివాహ ముహూర్తాలు 2026-2027" : "VEDIC VIVAHA MUHURTHAMS 2026-2027"}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white mt-2 telugu">
              {te ? "రాబోయే పవిత్ర వివాహ సుముహూర్తాలు 💍" : "Upcoming Auspicious Marriage Muhurthams 💍"}
            </h2>
            <p className="text-xs sm:text-sm text-white/80 mt-1 max-w-2xl leading-relaxed telugu">
              {te
                ? "శ్రీ క్రోధి & విశ్వావసు నామ సంవత్సరాల వేద పంచాంగ వివాహ ముహూర్తాలు — శుభ లగ్నాలు, అనుకూల నక్షత్రాలు మరియు తిథులు."
                : "Vedic Panchangam marriage dates — auspicious lagnams, nakshatras and thithis verified by Vedic scholars."}
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
          {peakDates.map((m) => (
            <div
              key={m.id}
              className="group relative rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 hover:border-gold/60 p-4 backdrop-blur-md shadow-lg transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                {/* Month & Season Pill */}
                <div className="flex items-center justify-between text-[11px] font-bold text-[#f6d98a]">
                  <span>🌙 {m.teluguMonth}</span>
                  <span className="bg-emerald-500/30 text-emerald-300 border border-emerald-400/30 text-[10px] px-2 py-0.5 rounded-full">
                    {m.season}
                  </span>
                </div>

                {/* Gregorian & Telugu Date */}
                <div className="mt-2 text-lg font-black text-white telugu">
                  {m.teluguDate}
                </div>

                {/* Lagnam & Nakshatram */}
                <div className="mt-3 space-y-1.5 text-xs text-white/90">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#f6d98a]">👑 లగ్నం:</span>
                    <span className="font-bold">{m.lagnam}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#f6d98a]">⭐ నక్షత్రం:</span>
                    <span className="font-bold">{m.nakshatram}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-white/70">
                    <span>⏰ సమయం:</span>
                    <span>{m.timeRange}</span>
                  </div>
                </div>
              </div>

              {/* Card Footer: WhatsApp Share button */}
              <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between">
                <span className="text-[10px] text-amber-200/80 truncate max-w-[140px]">
                  ✨ {m.notes}
                </span>
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
