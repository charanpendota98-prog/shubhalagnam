"use client";
/**
 * 🧠 SMART MATCH ASSISTANT
 * ========================
 * Per-user "ఈ రోజు మీ కోసం" digest — top NEW/mutual matches (explainable why),
 * who noticed you (interests received + profile views), profile-completeness
 * nudge, and a prioritized next-steps checklist. Backed by /api/assistant/*.
 *
 * Privacy-safe: server returns safe_user payloads only (no raw phone).
 * Owner-guarded: apiGet attaches X-Tsap-Token; endpoint enforces require_owner.
 */
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiGet, getTsapId } from "@/lib/api";
import { useLang } from "@/lib/lang";

type Row = Record<string, any>;

const gradeColor = (g: string) => {
  const s = String(g || "").toUpperCase();
  if (s.startsWith("A")) return "bg-emerald-100 text-emerald-800 border-emerald-300";
  if (s.startsWith("B")) return "bg-sky-100 text-sky-800 border-sky-300";
  if (s.startsWith("C")) return "bg-amber-100 text-amber-800 border-amber-300";
  return "bg-slate-100 text-slate-600 border-slate-300";
};

const priorityIcon = (p: number) => (p <= 1 ? "🔴" : p === 2 ? "🟠" : p === 3 ? "🟡" : "🟢");

function Avatar({ p }: { p: Row }) {
  const photo = p?.photo_url;
  const name = String(p?.full_name || "?").trim();
  const initial = name.charAt(0).toUpperCase() || "?";
  if (photo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={photo} alt={name} className="h-14 w-14 rounded-xl object-cover ring-2 ring-gold/40" />;
  }
  return (
    <div className="flex h-14 w-14 items-center justify-center rounded-xl maroon-gradient text-xl font-black text-gold ring-2 ring-gold/30">
      {initial}
    </div>
  );
}

export default function MatchAssistant() {
  const { lang } = useLang();
  const te = lang !== "en";
  const [data, setData] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    const id = getTsapId();
    if (!id) {
      setLoading(false);
      setErr(te ? "🔒 ముందుగా login అవ్వండి" : "🔒 Please login first");
      return;
    }
    setLoading(true);
    setErr("");
    const r = await apiGet<Row>(`/api/assistant/briefing/${encodeURIComponent(id)}?limit=3`);
    if (r.ok && r.data) setData(r.data as Row);
    else setErr(r.errorTelugu || (te ? "⚠️ లోడ్ చేయలేకపోయాము" : "⚠️ Could not load"));
    setLoading(false);
  }, [te]);

  useEffect(() => {
    void load();
  }, [load]);

  const matches: Row[] = (data?.matches as Row[]) || [];
  const mutual: Row = (data?.mutual as Row) || {};
  const nudge: Row = (data?.nudge as Row) || {};
  const tips: Row[] = (data?.tips as Row[]) || [];
  const recv = Number(mutual?.interests_received || 0);
  const views = Number(mutual?.profile_views || 0);
  const pct = Number(nudge?.percent || 0);

  return (
    <section className="rounded-2xl border border-gold/30 bg-white shadow-gold overflow-hidden">
      {/* header */}
      <div className="maroon-gradient px-4 py-3 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-black text-gold leading-tight">
            🧠 {te ? "ఈ రోజు మీ కోసం" : "Your Smart Match Briefing"}
          </h2>
          <p className="text-[11px] text-rose-100/90 font-medium mt-0.5">
            {te ? "AI వ్యక్తిగత సిఫార్సులు + మ్యూచువల్ అలర్ట్‌లు" : "AI personalized picks + mutual alerts"}
          </p>
        </div>
        <button
          onClick={() => void load()}
          disabled={loading}
          className="shrink-0 rounded-full border border-gold/50 bg-white/10 px-3 py-1.5 text-[11px] font-bold text-gold hover:bg-white/20 transition disabled:opacity-50"
          aria-label="refresh"
        >
          {loading ? "…" : "↻"}
        </button>
      </div>

      <div className="p-4 space-y-4">
        {loading && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        )}

        {!loading && err && (
          <p className="rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-sm font-bold text-rose-700">{err}</p>
        )}

        {!loading && !err && data && (
          <>
            {/* summary */}
            <p className="text-sm font-bold text-[#7A0C2E]">{te ? data.summary_telugu : data.summary_en}</p>

            {/* mutual alert banner */}
            {(recv > 0 || views > 0) && (
              <div className="rounded-xl bg-gradient-to-r from-rose-50 to-amber-50 border border-rose-200 px-3 py-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                {recv > 0 && (
                  <span className="text-xs font-bold text-rose-700">
                    🔥 {recv} {te ? "మంది interest పంపారు" : "sent you interest"}
                  </span>
                )}
                {views > 0 && (
                  <span className="text-xs font-bold text-amber-700">
                    👀 {views} {te ? "ప్రొఫైల్ వ్యూస్" : "profile views"}
                  </span>
                )}
                <Link href="/requests" className="ml-auto text-xs font-black text-[#7A0C2E] underline hover:no-underline">
                  {te ? "స్పందించండి →" : "Respond →"}
                </Link>
              </div>
            )}

            {/* matches */}
            {matches.length > 0 ? (
              <div className="space-y-2.5">
                {matches.map((m) => {
                  const p = (m.profile || {}) as Row;
                  return (
                    <div key={m.tsap_id} className="rounded-xl border border-slate-200 p-3 flex gap-3 hover:border-gold/60 hover:shadow-gold transition">
                      <Avatar p={p} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-black text-slate-800">
                              {p.full_name}
                              {p.age && p.age !== "—" ? <span className="font-bold text-slate-500">, {p.age}</span> : null}
                            </p>
                            <p className="truncate text-[11px] font-medium text-slate-500">
                              {[p.caste, p.district, p.height, p.education].filter((x) => x && x !== "—").join(" · ")}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <span className="inline-block rounded-lg bg-[#7A0C2E] px-2 py-0.5 text-xs font-black text-gold">
                              {m.score}%
                            </span>
                            {m.grade && (
                              <span className={`ml-1 inline-block rounded border px-1.5 py-0.5 text-[10px] font-black ${gradeColor(m.grade)}`}>
                                {m.grade}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {m.is_mutual && (
                            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-black text-rose-700">💞 {te ? "మ్యూచువల్" : "Mutual"}</span>
                          )}
                          {m.is_new && (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-700">✨ {te ? "కొత్తది" : "New"}</span>
                          )}
                          {(m.why || []).slice(0, 3).map((w: string, i: number) => (
                            <span key={i} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                              {w}
                            </span>
                          ))}
                        </div>

                        <div className="mt-2 flex items-center justify-between gap-2">
                          <span className="truncate text-[11px] font-medium text-slate-500">{m.action}</span>
                          <Link
                            href={`/search/${encodeURIComponent(m.tsap_id)}`}
                            className="shrink-0 rounded-full gold-gradient px-3 py-1 text-[11px] font-black text-maroon hover:brightness-105 transition"
                          >
                            {te ? "చూడండి →" : "View →"}
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-3 text-center text-xs font-medium text-slate-500">
                {te ? "ఇంకా కొత్త మ్యాచ్‌లు లేవు — ప్రొఫైల్ పూర్తి చేస్తే ఎక్కువ కనబడతారు 👇" : "No new matches yet — complete your profile to see more 👇"}
              </p>
            )}

            {/* completeness nudge */}
            {pct < 100 && (
              <div className="rounded-xl border border-slate-200 p-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>{te ? "📈 ప్రొఫైల్ పూర్తి" : "📈 Profile completeness"}</span>
                  <span className="text-[#7A0C2E]">{pct}%</span>
                </div>
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full gold-gradient transition-all" style={{ width: `${Math.max(4, pct)}%` }} />
                </div>
                {nudge.verdict_telugu && <p className="mt-1.5 text-[11px] font-medium text-slate-500">{nudge.verdict_telugu}</p>}
              </div>
            )}

            {/* tips checklist */}
            {tips.length > 0 && (
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                <p className="mb-2 text-xs font-black text-slate-700">
                  {te ? "✅ మీ తదుపరి అడుగులు" : "✅ Your next steps"}
                </p>
                <ul className="space-y-1.5">
                  {tips.map((t, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-0.5 text-xs">{priorityIcon(Number(t.priority || 3))}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] font-medium leading-snug text-slate-700">{te ? t.telugu : t.en}</p>
                      </div>
                      {t.cta && (
                        <Link
                          href={String(t.cta)}
                          className="shrink-0 rounded-full border border-[#7A0C2E]/30 px-2.5 py-0.5 text-[10px] font-black text-[#7A0C2E] hover:bg-rose-50 transition"
                        >
                          {te ? "వెళ్ళండి" : "Go"}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
