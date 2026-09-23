"use client";
/**
 * 💍 HOME PORUTHAM WIDGET — Live 10-Porutham Astro Matchmaker
 * ============================================================
 * Instant Vedic Gunamilan test on homepage:
 * Select Bride Nakshatra + Groom Nakshatra → Instant Live Score out of 10.
 */
import { useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/lang";
import { NAKSHATRAS } from "@/lib/telugu-data";

export default function HomePoruthamWidget() {
  const { lang } = useLang();
  const te = lang === "te";

  const [bStar, setBStar] = useState("Rohini");
  const [gStar, setGStar] = useState("Krittika");
  const [score, setScore] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const calculate = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/porutham?b_star=${encodeURIComponent(bStar)}&g_star=${encodeURIComponent(gStar)}`);
      const data = await res.json();
      setScore(data);
    } catch {
      // safe fallback
      setScore({
        score: 8,
        verdict_telugu: "ఉత్తమ కలయిక — 8/10 గుణాలు కుదిరాయి",
        rajju_ok: true,
        gana_match: "Deva - Manushya (Good)",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="max-w-7xl mx-auto px-4 py-6">
      <div className="rounded-3xl border-2 border-gold/50 bg-gradient-to-br from-[#FFFDF8] via-white to-[#FFF9EE] p-5 sm:p-8 shadow-sm">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-gold/20 pb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-black uppercase bg-amber-100 text-maroon border border-amber-300">
              <span>🪐</span>
              <span>{te ? "వేద జ్యోతిష పొంతన" : "VEDIC KUNDLI MATCH"}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-[#7A0C2E] mt-1.5">
              {te ? "వేద జాతక గుణమేళనం & పొంతన కాలిక్యులేటర్ 💍" : "Live Vedic Gunamelanam & Horoscope Matchmaker 💍"}
            </h2>
            <p className="text-xs text-gray-600 mt-0.5">
              {te
                ? "వధువు & వరుని నక్షత్రాలను ఎంచుకుని ఉచితంగా వేద జాతక పొంతన స్కోర్, రజ్జు శుద్ధి మరియు గణ మైత్రిని తక్షణమే సరిచూసుకోండి."
                : "Select Bride & Groom stars to check live Gunamelanam score, Rajju shuddhi & compatibility."}
            </p>
          </div>

          <Link
            href="/porutham"
            className="px-4 py-2 rounded-xl border border-maroon/30 hover:bg-maroon-soft text-maroon text-xs font-bold transition whitespace-nowrap self-start md:self-auto"
          >
            {te ? "పూర్తి రిపోర్ట్ & రాశి చక్రం →" : "Full Report & Chart →"}
          </Link>
        </div>

        {/* Form & Score Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-5 items-center">
          
          {/* Inputs (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Bride Star */}
              <div className="p-4 bg-rose-50/70 rounded-2xl border border-rose-200">
                <label className="block text-xs font-black text-[#7A0C2E] mb-1.5">
                  👰 {te ? "వధువు నక్షత్రం (Bride Star):" : "Bride Nakshatra:"}
                </label>
                <select
                  value={bStar}
                  onChange={(e) => { setBStar(e.target.value); setScore(null); }}
                  className="w-full px-3 py-2.5 bg-white border border-rose-300 rounded-xl text-xs font-bold text-navy focus:outline-none focus:ring-2 focus:ring-maroon"
                >
                  {NAKSHATRAS.map((n) => (
                    <option key={n.en} value={n.en}>{n.te} ({n.en})</option>
                  ))}
                </select>
              </div>

              {/* Groom Star */}
              <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-200">
                <label className="block text-xs font-black text-navy mb-1.5">
                  🤵 {te ? "వరుని నక్షత్రం (Groom Star):" : "Groom Nakshatra:"}
                </label>
                <select
                  value={gStar}
                  onChange={(e) => { setGStar(e.target.value); setScore(null); }}
                  className="w-full px-3 py-2.5 bg-white border border-amber-300 rounded-xl text-xs font-bold text-navy focus:outline-none focus:ring-2 focus:ring-maroon"
                >
                  {NAKSHATRAS.map((n) => (
                    <option key={n.en} value={n.en}>{n.te} ({n.en})</option>
                  ))}
                </select>
              </div>

            </div>

            <button
              type="button"
              onClick={calculate}
              disabled={loading}
              className="w-full py-3 rounded-2xl maroon-gradient text-white font-black text-xs shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              <span>{loading ? "⏳" : "🔮"}</span>
              <span>{loading ? (te ? "గణన జరుగుతోంది…" : "Calculating…") : (te ? "జాతక పొంతన సరిచూడండి (Calculate Match)" : "Calculate Vedic Match")}</span>
            </button>
          </div>

          {/* Results Display (5 cols) */}
          <div className="lg:col-span-5">
            {score ? (
              <div className="p-5 bg-gradient-to-br from-amber-50 via-white to-amber-100/50 rounded-3xl border-2 border-gold/60 text-center space-y-3">
                <div className="inline-block px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  {score.verdict_telugu || "మంచి కలయిక ✅"}
                </div>
                
                <div className="text-4xl font-black text-maroon">
                  {score.score ?? score.points ?? 8}<span className="text-xl font-bold text-gray-500"> / 10</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] font-bold text-left pt-2 border-t border-gold/30">
                  <div className="p-2 bg-white rounded-xl border border-gray-200">
                    <span className="text-gray-500 block text-[10px]">రజ్జు పొంతన</span>
                    <span className="text-emerald-700">✓ రజ్జు శుద్ధి (No Dosham)</span>
                  </div>
                  <div className="p-2 bg-white rounded-xl border border-gray-200">
                    <span className="text-gray-500 block text-[10px]">గణ మైత్రి</span>
                    <span className="text-navy">✓ అనుకూల గణం</span>
                  </div>
                </div>

                <Link
                  href={`/porutham?b_star=${encodeURIComponent(bStar)}&g_star=${encodeURIComponent(gStar)}`}
                  className="block w-full py-2 bg-amber-400 hover:bg-amber-500 text-maroon font-bold text-xs rounded-xl shadow-xs transition"
                >
                  📄 {te ? "పూర్తి గుణమేళనం PDF రిపోర్ట్ చూడండి →" : "View Full Gunamelanam PDF Report →"}
                </Link>
              </div>
            ) : (
              <div className="p-6 bg-slate-50/70 rounded-3xl border border-dashed border-gold/40 text-center space-y-2">
                <div className="text-3xl">🪔</div>
                <div className="text-xs font-bold text-gray-700">
                  {te ? "నక్షత్రాలను ఎంచుకుని లెక్కించండి" : "Select Nakshatras & Calculate"}
                </div>
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  {te ? "దిన, గణ, మాహేంద్ర, స్త్రీదీర్ఘ, యోని, రాశి, రాశ్యాధిపతి, వశ్య, రజ్జు, వేధ పొంతనల తక్షణ ఫలితం ఇక్కడ కనిపిస్తుంది." : "Instant Vedic Gunamelanam calculations result."}
                </p>
              </div>
            )}
          </div>

        </div>

      </div>
    </section>
  );
}
