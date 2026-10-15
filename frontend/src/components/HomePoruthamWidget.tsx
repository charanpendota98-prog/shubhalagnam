"use client";


import { readApiJson } from "@/lib/api";
import { useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/lang";
import { NAKSHATRAS } from "@/lib/telugu-data";
import { whatsappShareLink } from "@/lib/wa";

type Result = {
  available?: boolean;
  passed_checks?: number;
  total_checks?: number;
  items?: Array<{ no?: number; name?: string; name_en?: string; telugu?: string; pass?: boolean; note?: string; note_en?: string }>;
  advice_telugu?: string;
  advice_en?: string;
  reason?: string;
  reason_en?: string;
};

export default function HomePoruthamWidget() {
  const { lang } = useLang();
  const te = lang === "te";
  const [bStar, setBStar] = useState("");
  const [gStar, setGStar] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const calculate = async () => {
    setError("");
    setResult(null);
    if (!bStar || !gStar) {
      setError(te ? "వధువు మరియు వరుని నక్షత్రాలను ఎంచుకోండి." : "Select both bride and groom stars.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/porutham", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bride_star: bStar, groom_star: gStar }),
      });
      const data = await readApiJson(response);
      if (!response.ok) throw new Error(data?.detail || data?.message_telugu || "Could not calculate the result.");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : (te ? "నెట్‌వర్క్ సమస్య — మళ్లీ ప్రయత్నించండి." : "Network issue — please try again."));
    } finally {
      setLoading(false);
    }
  };

  const shareText = result?.available
    ? [
        te ? "మన వివాహ — సాంప్రదాయ Porutham checks" : "Mana Vivaha — traditional Porutham checks",
        `${te ? "వధువు" : "Bride"}: ${bStar}`,
        `${te ? "వరుడు" : "Groom"}: ${gStar}`,
        `${te ? "Pass గా గుర్తించిన checks" : "Checks marked pass"}: ${result.passed_checks ?? 0} of ${result.total_checks ?? 10}`,
        te ? "ప్రతి అంశాన్ని విడిగా పరిశీలించండి. ఇది compatibility score, వివాహ సిఫార్సు లేదా ఫలిత హామీ కాదు." : "Review each item separately. This is not a compatibility score, marriage recommendation, or outcome prediction.",
        "https://manavivaha.in/porutham",
      ].filter(Boolean).join("\n")
    : "";

  return (
    <section className="mx-auto max-w-7xl px-4 py-8" aria-labelledby="home-porutham-title">
      <div className="overflow-hidden rounded-[2rem] border border-amber-200 bg-gradient-to-br from-[#fffaf0] via-white to-rose-50 shadow-[0_15px_50px_rgba(122,12,46,.08)]">
        <div className="flex flex-col gap-4 bg-gradient-to-r from-maroon via-[#8c1238] to-[#b47b08] p-6 text-white sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-100">🪔 {te ? "సూచన మాత్రమే" : "Reference only"}</div>
            <h2 id="home-porutham-title" className="mt-2 text-xl font-black sm:text-2xl">
              {te ? "సాంప్రదాయ Porutham checks" : "Traditional Porutham reference checks"}
            </h2>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-white/85 sm:text-sm">
              {te
                ? "నక్షత్ర వివరాల ఆధారంగా 10 నియమ-ఆధారిత checks ను లెక్కించండి. ఇది పూర్తి జాతక విశ్లేషణ లేదా వివాహ ఫలిత హామీ కాదు."
                : "Calculate ten rule-based checks from the supplied star details. This is not a complete horoscope or a prediction of marriage outcomes."}
            </p>
          </div>
          <Link href="/porutham" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2 text-xs font-bold text-white transition hover:bg-white/20">
            📜 {te ? "వివరమైన నివేదిక" : "Detailed report"} →
          </Link>
        </div>

        <div className="grid gap-5 p-5 lg:grid-cols-2 lg:p-7">
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block rounded-2xl border border-rose-200 bg-rose-50/70 p-4 text-xs font-bold text-maroon">
                👰 {te ? "వధువు నక్షత్రం" : "Bride star"}
                <select value={bStar} onChange={(event) => { setBStar(event.target.value); setResult(null); }} className="mt-2 min-h-11 w-full rounded-xl border border-rose-200 bg-white px-3 text-sm text-slate-800 focus-brand">
                  <option value="">— {te ? "ఎంచుకోండి" : "Select"} —</option>
                  {NAKSHATRAS.map((star) => <option key={star.en} value={star.en}>{te ? `${star.te} (${star.en})` : star.en}</option>)}
                </select>
              </label>
              <label className="block rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-xs font-bold text-maroon">
                🤵 {te ? "వరుని నక్షత్రం" : "Groom star"}
                <select value={gStar} onChange={(event) => { setGStar(event.target.value); setResult(null); }} className="mt-2 min-h-11 w-full rounded-xl border border-amber-200 bg-white px-3 text-sm text-slate-800 focus-brand">
                  <option value="">— {te ? "ఎంచుకోండి" : "Select"} —</option>
                  {NAKSHATRAS.map((star) => <option key={star.en} value={star.en}>{te ? `${star.te} (${star.en})` : star.en}</option>)}
                </select>
              </label>
            </div>
            <button type="button" onClick={() => void calculate()} disabled={loading} className="min-h-12 w-full rounded-2xl bg-gradient-to-r from-maroon via-[#91143c] to-[#b47b08] px-4 py-3 text-sm font-black text-white shadow-md transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60">
              {loading ? (te ? "లెక్కిస్తోంది…" : "Calculating…") : (te ? "🔮 Porutham checks లెక్కించండి" : "🔮 Calculate Porutham checks")}
            </button>
            {error ? <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">{error}</p> : null}
          </div>

          <div className="min-w-0 rounded-2xl border border-amber-200 bg-white p-4 sm:p-5">
            {result?.available ? (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-amber-800">{te ? "లెక్కించిన ఫలితం" : "Calculated result"}</p>
                    <h3 className="mt-1 break-words text-base font-extrabold text-maroon">{te ? "Porutham checks ఫలితం" : "Porutham checks calculated"}</h3>
                  </div>
                  <div className="shrink-0 rounded-2xl bg-gradient-to-br from-maroon to-[#9b1644] px-4 py-3 text-center text-white">
                    <div className="text-lg font-black">{result.passed_checks ?? 0} of {result.total_checks ?? 10}</div>
                    <div className="text-[10px] font-semibold text-white/80">{te ? "checks pass గా గుర్తింపు" : "checks marked pass"}</div>
                  </div>
                </div>
                {Array.isArray(result.items) && result.items.length ? (
                  <ol className="mt-4 grid gap-2 sm:grid-cols-2">
                    {result.items.map((item, index) => (
                      <li key={`${item.no ?? index}-${item.name ?? "check"}`} className={`rounded-xl border p-3 ${item.pass ? "border-emerald-200 bg-emerald-50/70" : "border-amber-200 bg-amber-50/70"}`}>
                        <div className="flex items-start gap-2 text-xs font-bold text-slate-800">
                          <span aria-hidden="true">{item.pass ? "✓" : "•"}</span>
                          <span className="break-words">{item.no ? `${item.no}. ` : ""}{te ? item.telugu || item.name : item.name_en || "Porutham check"}</span>
                        </div>
                        {(te ? item.note : item.note_en) ? <p className="mt-1 text-[11px] leading-relaxed text-slate-600">{te ? item.note : item.note_en}</p> : null}
                      </li>
                    ))}
                  </ol>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  <a href={whatsappShareLink(shareText)} target="_blank" rel="noopener noreferrer" title={te ? "బాహ్య WhatsApp share; లభ్యత తనిఖీ చేయబడదు" : "External WhatsApp share; availability is not checked"} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-[#128C4A] to-[#20bd5a] px-4 py-2 text-xs font-bold text-white focus-brand">
                    💬 {te ? "ఫలితాన్ని share చేయండి" : "Share result"}
                  </a>
                  <Link href={`/porutham?bride=${encodeURIComponent(bStar)}&groom=${encodeURIComponent(gStar)}`} className="inline-flex min-h-10 items-center rounded-xl border border-maroon/20 px-4 py-2 text-xs font-bold text-maroon hover:bg-rose-50">
                    {te ? "పూర్తి నివేదిక →" : "Full report →"}
                  </Link>
                </div>
              </>
            ) : result ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-900" role="status">
                {te
                  ? result.reason || result.advice_telugu || "తగిన నక్షత్ర వివరాలు లేవు; Porutham checks లెక్కించలేదు."
                  : result.reason_en || result.advice_en || "Not enough star details; Porutham checks were not calculated."}
              </div>
            ) : (
              <div className="grid min-h-48 place-items-center rounded-xl border border-dashed border-amber-200 bg-gradient-to-br from-amber-50 to-rose-50 p-5 text-center">
                <div>
                  <div className="text-4xl" aria-hidden="true">🪔</div>
                  <p className="mt-2 text-sm font-extrabold text-maroon">{te ? "రెండు నక్షత్రాలు ఎంచుకోండి" : "Choose both stars to begin"}</p>
                  <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-slate-600">{te ? "తగిన వివరాలు ఉన్నప్పుడు మాత్రమే ఫలితం చూపిస్తాం; sample score చూపించము." : "A result appears only when data is available; no sample score is filled in."}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
