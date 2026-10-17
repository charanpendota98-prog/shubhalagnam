"use client";

/**
 * 💍 VIVAHA MUHURTHAMS 2026-2027 — మన వివాహ వేద పంచాంగ ముహూర్తాలు
 * ====================================================================
 * Reference calendar entries only. Date/time accuracy is not independently
 * validated; users are asked to confirm locally before relying on it.
 */
import { useState, useMemo } from "react";
import Link from "next/link";
import Reveal from "@/components/Reveal";
import VivahaMuhurthamTeaser from "@/components/VivahaMuhurthamTeaser";
import SectionHeading from "@/components/SectionHeading";
import { useLang } from "@/lib/lang";
import { VIVAHA_MUHURTHAMS_2026_2027, MuhurthamDate, formatMuhurthamDate, formatMuhurthamLagnam, formatMuhurthamMonth, formatMuhurthamNakshatra, formatMuhurthamThithi, formatMuhurthamTime } from "@/lib/muhurtham-data";
import { TelegramIcon, WhatsAppIcon } from "@/components/BrandIcons";

const MONTHS_FILTER = [
  { key: "ALL", lTe: "అన్ని ముహూర్తాలు", lEn: "All Dates" },
  { key: "2026-10", lTe: "అక్టోబర్ 2026 (ఆశ్వయుజం)", lEn: "Oct 2026" },
  { key: "2026-11", lTe: "నవంబర్ 2026 (కార్తీకం)", lEn: "Nov 2026" },
  { key: "2026-12", lTe: "డిసెంబర్ 2026 (మార్గశిరం)", lEn: "Dec 2026" },
  { key: "2027-02", lTe: "ఫిబ్రవరి 2027 (మాఘ మాసం)", lEn: "Feb 2027 (Magha)" },
  { key: "2027-03", lTe: "మార్చి 2027 (ఫాల్గుణం)", lEn: "Mar 2027" },
  { key: "2027-04", lTe: "ఏప్రిల్-మే 2027 (చైత్ర/వైశాఖం)", lEn: "Apr-May 2027" },
];

export default function MuhurthamPage() {
  const { lang } = useLang();
  const te = lang === "te";
  const [selectedMonth, setSelectedMonth] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return VIVAHA_MUHURTHAMS_2026_2027.filter((m) => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        m.teluguDate.toLowerCase().includes(q) ||
        formatMuhurthamDate(m, false).toLowerCase().includes(q) ||
        formatMuhurthamNakshatra(m, te).toLowerCase().includes(q) ||
        formatMuhurthamLagnam(m, te).toLowerCase().includes(q) ||
        formatMuhurthamThithi(m, te).toLowerCase().includes(q) ||
        formatMuhurthamMonth(m, te).toLowerCase().includes(q) ||
        m.teluguMonth.toLowerCase().includes(q);
      const matchesMonth =
        selectedMonth === "ALL" ||
        (selectedMonth === "2027-04" ? (m.date.startsWith("2027-04") || m.date.startsWith("2027-05")) : m.date.startsWith(selectedMonth));
      return matchesSearch && matchesMonth;
    });
  }, [selectedMonth, search, te]);

  const shareWa = (m: MuhurthamDate) => {
    const text = te
      ? `💍 మన వివాహ — ముహూర్త తేదీ సూచిక 📅\n🗓️ తేదీ: ${formatMuhurthamDate(m, true)}\n🌙 మాసం: ${formatMuhurthamMonth(m, true)}\n⭐ నక్షత్రం: ${m.nakshatram}\n👑 లగ్నం: ${m.lagnam}\n⏰ సమయం: ${formatMuhurthamTime(m, true)}\n⚠️ ఇది reference సమాచారం మాత్రమే; booking ముందు స్థానికంగా నిర్ధారించండి.\n\nప్రొఫైళ్లు: ${window.location.origin}/matches`
      : `💍 Mana Vivaha (మన వివాహ) — Muhurtham date reference 📅\nDate: ${formatMuhurthamDate(m, false)}\nMonth: ${formatMuhurthamMonth(m, false)}\nNakshatra: ${formatMuhurthamNakshatra(m, false)}\nAscendant: ${formatMuhurthamLagnam(m, false)}\nThithi: ${formatMuhurthamThithi(m, false)}\nTime: ${formatMuhurthamTime(m, false)}\n⚠️ Reference information only; confirm locally before booking.\n\nProfiles: ${window.location.origin}/matches`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  };

  const printDates = () => {
    window.print();
  };

  return (
    <div className="min-h-dvh bg-[#FCFBF8] pb-36">
      {/* HERO SECTION */}
      <section className="maroon-gradient text-white border-b-4 border-gold/40">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <Reveal>
            <div className="inline-flex items-center gap-2 bg-white/15 border border-white/25 rounded-full px-4 py-1.5 text-xs font-bold shadow-sm">
              👑 {te ? "వివాహ ముహూర్తాల సూచిక క్యాలెండర్" : "Muhurtham reference calendar"} • 2026-2027
            </div>

            <h1 className="mt-4 text-3xl md:text-5xl font-black tracking-tight telugu">
              {te ? "వివాహ ముహూర్తాల సూచిక క్యాలెండర్ (2026-2027)" : "Vivaha Muhurtham Reference Calendar (2026-2027)"}
            </h1>

            <p className="mt-3 text-sm md:text-base opacity-95 telugu max-w-3xl leading-relaxed">
              {te ? (
                <>ఈ పేజీలోని తేదీలు, సమయాలు reference సమాచారం మాత్రమే; ఈ క్యాలెండర్‌ను మేము స్వతంత్రంగా నిర్ధారించలేదు. ప్రాంతం, పంచాంగం, కుటుంబ ఆచారాల ప్రకారం మారవచ్చు — నిర్ణయం లేదా booking ముందు స్థానిక నిపుణుడితో నిర్ధారించండి.</>
              ) : (
                <>Reference dates and times only; this calendar has not been independently validated. Panchangam details can vary by location and family tradition—confirm locally before making plans or bookings.</>
              )}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <button type="button"
                onClick={printDates}
                className="gold-gradient text-maroon font-bold px-5 py-3 rounded-2xl text-xs hover-lift shadow-md flex items-center gap-2"
              >
                <span>🖨️</span>
                <span>{te ? "ముహూర్తాల పత్రం ప్రింట్ / PDF" : "Print / Save PDF"}</span>
              </button>
              <Link
                href="/matches"
                className="bg-white/15 hover:bg-white/25 border border-white/30 text-white font-bold px-5 py-3 rounded-2xl text-xs transition flex items-center gap-2"
              >
                <span>🔍</span>
                <span>{te ? "సంబంధాలు చూడండి" : "Explore Matching Profiles"}</span>
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* MAIN CONTENT AREA */}
      <div className="max-w-6xl mx-auto px-4 py-10">
        <SectionHeading
          eyebrow={te ? "సూచిక తేదీల జాబితా" : "Reference date list"}
          title={te ? "2026-2027 ముహూర్త తేదీల సూచిక" : "2026-2027 Muhurtham Reference Dates"}
          subtitle={te ? "నెలవారీగా తేదీ, తిథి, నక్షత్రం, లగ్న వివరాలు చూడండి. ఉపయోగించే ముందు స్థానికంగా నిర్ధారించండి." : "View the listed date, thithi, nakshatra, and lagnam by month. Confirm locally before relying on them."}
          telugu
        />

        {/* Month Filter Tabs */}
        <div className="mt-6 flex flex-wrap gap-2 items-center print:hidden">
          {MONTHS_FILTER.map((m) => (
            <button type="button"
              key={m.key}
              onClick={() => setSelectedMonth(m.key)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all ${
                selectedMonth === m.key
                  ? "maroon-gradient text-white shadow-brand scale-105"
                  : "bg-white border border-gray-300 text-slate-700 hover:border-maroon/50 hover:bg-amber-50/40"
              }`}
            >
              {te ? m.lTe : m.lEn}
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="mt-4 print:hidden max-w-md">
          <input aria-label={te ? "🔍 నక్షత్రం, లగ్నం లేదా నెలను వెతకండి" : "🔍 Search by nakshatra, lagnam, or month"}
            type="text"
            placeholder={te ? "🔍 నక్షత్రం, లగ్నం లేదా నెలను వెతకండి" : "🔍 Search by nakshatra, lagnam, or month"}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-gold/30 rounded-2xl px-4 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-maroon"
          />
        </div>

        {/* MUHURTHAM CARDS GRID */}
        <div className="mt-8 grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((m, i) => (
            <Reveal key={m.date} delay={(i % 6) * 35}>
              <div className="bg-white rounded-3xl p-5 border border-gold/30 hover:border-gold shadow-md hover:shadow-xl transition-all duration-300 h-full flex flex-col justify-between">
                <div>
                  {/* Top Badge & Month */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-black text-maroon bg-amber-50 border border-gold/30 px-3 py-1 rounded-full telugu">
                      🌙 {formatMuhurthamMonth(m, te)}
                    </span>
                  </div>

                  {/* Date Title */}
                  <div className="mt-3">
                    <h3 className="text-[17px] font-black text-slate-900 telugu">
                      🗓️ {formatMuhurthamDate(m, te)}
                    </h3>
                  </div>

                  {/* Muhurtham Details Grid */}
                  <div className="mt-4 space-y-2 bg-[#FFFDF9] p-3.5 rounded-2xl border border-gold/20 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-500 font-bold">{te ? "⭐ నక్షత్రం:" : "⭐ Nakshatra:"}</span>
                      <span className="font-extrabold text-[#7A0C2E] text-right">{formatMuhurthamNakshatra(m, te)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-500 font-bold">{te ? "👑 లగ్నం:" : "👑 Ascendant:"}</span>
                      <span className="font-extrabold text-slate-800 text-right">{formatMuhurthamLagnam(m, te)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-500 font-bold">{te ? "📜 తిథి:" : "📜 Thithi:"}</span>
                      <span className="font-bold text-slate-700 text-right">{formatMuhurthamThithi(m, te)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 border-t border-gold/20 pt-2 mt-1">
                      <span className="text-slate-500 font-bold">{te ? "⏰ సమయం:" : "⏰ Time:"}</span>
                      <span className="font-extrabold text-emerald-700 text-right">{formatMuhurthamTime(m, te)}</span>
                    </div>
                  </div>

                </div>

                {/* Card Action Buttons */}
                <div className="mt-5 flex items-center gap-2 print:hidden">
                  <button type="button"
                    onClick={() => shareWa(m)}
                    className="flex-1 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold py-2.5 px-3 rounded-xl text-xs shadow-soft hover-lift flex items-center justify-center gap-1.5 transition"
                  >
                    <WhatsAppIcon className="w-3.5 h-3.5" mono />
                    <span>{te ? "WhatsApp లో పంపు" : "Share on WhatsApp"}</span>
                  </button>
                  <Link
                    href={`/matches?star=${encodeURIComponent(m.nakshatram.split("(")[0].trim())}`}
                    className="bg-amber-100/70 hover:bg-amber-100 text-maroon font-bold py-2.5 px-3 rounded-xl text-xs border border-gold/40 transition"
                    title={te ? "ఈ నక్షత్ర సంబంధాలు" : "Profiles with this nakshatra"}
                  >
                    {te ? "🔍 సంబంధాలు" : "🔍 Browse profiles"}
                  </Link>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Empty Search State */}
        {filtered.length === 0 && (
          <div className="mt-10 text-center p-10 bg-white rounded-3xl border border-gray-200 card-shadow">
            <div className="text-4xl">🗓️</div>
            <div className="font-extrabold text-gray-800 text-lg mt-3 telugu">
              {te ? "ముహూర్తాలు దొరకలేదు" : "No muhurthams matched"}
            </div>
            <p className="text-xs text-gray-500 mt-1 telugu">
              {te ? "దయచేసి వేరొక నెలను ఎంచుకోండి లేదా సెర్చ్ పదాన్ని మార్చండి." : "Please select another month or clear search."}
            </p>
          </div>
        )}

        {/* Astrological Note & Consultation Strip */}
        <div className="mt-12 p-6 bg-white rounded-3xl border border-gold/40 shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <div className="text-base font-extrabold text-[#7A0C2E] telugu flex items-center gap-2">
              <span>🕉️</span>
              <span>{te ? "వ్యక్తిగత జాతక పరిశీలన" : "Individual horoscope review"}</span>
            </div>
            <p className="text-xs text-slate-600 mt-1 telugu leading-relaxed max-w-2xl">
              {te ? "ఇవి reference తేదీలు/సమయాలు మాత్రమే; ఈ సేవ వాటిని స్వతంత్రంగా నిర్ధారించలేదు. ప్రాంతం, స్థానిక పంచాంగం, కుటుంబ సంప్రదాయం ప్రకారం మారవచ్చు. booking ముందు మీ కుటుంబ నిపుణుడితో నిర్ధారించండి." : "Reference dates and times only; this service has not independently validated them. Local panchangam and family tradition may differ. Confirm with your family astrologer before booking."}
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5 shrink-0">
            <Link
              href="/porutham"
              className="maroon-gradient text-white font-bold px-5 py-3 rounded-2xl text-xs hover-lift shadow-md"
            >
              💍 {te ? "సూచిక గుణాల లెక్క" : "Reference guna calculation"}
            </Link>
          </div>
        </div>

        {/* Reference-date teaser — the same published calendar, compact. */}
        <VivahaMuhurthamTeaser />

      </div>
    </div>
  );
}
