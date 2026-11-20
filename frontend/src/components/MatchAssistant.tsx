"use client";
/**
 * 🧠 SMART MATCH ASSISTANT
 * ========================
 * Per-user digest — recently added approved profiles, factual detail notes, and actual interest/view counts,
 * who noticed you (interests received + profile views), profile-completeness
 * nudge, and a prioritized next-steps checklist. Backed by /api/assistant/*.
 *
 * Privacy-safe: server returns safe_user payloads only (no raw phone).
 * Owner-guarded: apiGet attaches X-Tsap-Token; endpoint enforces require_owner.
 */
import { useCallback, useEffect, useState } from "react";
import { ChartNoAxesCombined, Check, Compass, Eye, Flame, RefreshCw, Sparkles } from "lucide-react";
import Link from "next/link";
import { apiDisplayMessage, apiGet, getTsapId } from "@/lib/api";
import { useLang } from "@/lib/lang";

type Row = Record<string, any>;

const priorityColor = (p: number) => (p <= 1 ? "bg-rose-600" : p === 2 ? "bg-orange-500" : p === 3 ? "bg-amber-500" : "bg-emerald-600");

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
  const displayValue = (value: unknown, fallback = "") => {
    if (te) return value == null ? "" : String(value);
    if (typeof value === "number") return String(value);
    return apiDisplayMessage({ message_en: value }, false, fallback);
  };
  const [data, setData] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    const id = getTsapId();
    if (!id) {
      setLoading(false);
      setErr(te ? "ముందుగా లాగిన్ అవ్వండి" : "Please login first");
      return;
    }
    setLoading(true);
    setErr("");
    const r = await apiGet<Row>(`/api/assistant/briefing/${encodeURIComponent(id)}?limit=3`);
    if (r.ok && r.data) setData(r.data as Row);
    else setErr(r.error || (te ? "వివరాలు రాలేదు. మళ్లీ ప్రయత్నించండి." : "Could not load"));
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
    <section className="mv-surface mv-card overflow-hidden">
      {/* header */}
      <div className="mv-surface__head">
        <div className="min-w-0">
          <h2 className="mv-surface__title">
            <Compass aria-hidden="true" className="inline-block h-[1em] w-[1em] shrink-0 align-middle" /> {te ? "పరిశీలించడానికి ప్రొఫైళ్లు" : "Profiles to review"}
          </h2>
          <p className="mv-surface__sub">
            {te ? "ఇటీవల ఆమోదించిన ప్రొఫైళ్లు · అందిన అభ్యర్థనలు, ప్రొఫైల్‌ను చూసినవారి సంఖ్య" : "Recently approved profiles · actual interests and profile views"}
          </p>
        </div>
        <button type="button"
          onClick={() => void load()}
          disabled={loading}
          className="mv-surface__chip focus-brand"
          aria-label={te ? "రిఫ్రెష్ చేయండి" : "Refresh match briefing"}
        >
          {loading ? "…" : <RefreshCw aria-hidden="true" className="h-4 w-4" />}
        </button>
      </div>

      <div className="mv-surface__body space-y-4">
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
            <p className="text-sm font-bold text-[#7A0C2E]">{displayValue(te ? data.summary_telugu : data.summary_en, te ? "మీ మ్యాచ్ సమాచారం సిద్ధంగా ఉంది." : "Your match briefing is ready.")}</p>

            {/* mutual alert banner */}
            {(recv > 0 || views > 0) && (
              <div className="mv-note flex flex-wrap items-center gap-x-3 gap-y-1">
                {recv > 0 && (
                  <span className="mv-note__hot text-xs font-bold">
                    <Flame aria-hidden="true" className="inline-block h-[1em] w-[1em]" /> {recv} {te ? "మంది ఆసక్తి తెలిపారు" : "sent you interest"}
                  </span>
                )}
                {views > 0 && (
                  <span className="mv-note__cool text-xs font-bold">
                    <Eye aria-hidden="true" className="inline-block h-[1em] w-[1em]" /> {views} {te ? "సార్లు మీ ప్రొఫైల్‌ను చూశారు" : "profile views"}
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
                    <div key={m.tsap_id} className="mv-row flex gap-3">
                      <Avatar p={p} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-black text-slate-800">
                              {p.full_name}
                              {p.age && p.age !== "—" ? <span className="font-bold text-slate-500">, {p.age}</span> : null}
                            </p>
                            <p className="truncate text-[11px] font-medium text-slate-500">
                              {[p.caste, p.district, p.height, p.education].map((value) => displayValue(value)).filter((value) => value && value !== "—").join(" · ")}
                            </p>
                          </div>

                        </div>

                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {m.is_new && (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700"><Sparkles aria-hidden="true" className="inline-block h-[1em] w-[1em]" /> {te ? "ఇటీవల జోడించారు" : "Recently added"}</span>
                          )}
                        </div>

                        {(m.observations || []).length > 0 && (
                          <div className="mt-2 rounded-lg bg-slate-50 px-2.5 py-2 text-[10px] leading-relaxed text-slate-600">
                            <span className="font-bold">{te ? "ప్రొఫైళ్లలో ఉన్న వివరాలు (నిర్ణయం కాదు): " : "Details listed across profiles (not a verdict): "}</span>
                            {(m.observations as string[]).slice(0, 2).map((value) => displayValue(value)).filter(Boolean).join(" · ")}
                          </div>
                        )}

                        <div className="mt-2 flex items-center justify-between gap-2">
                          <span className="truncate text-[11px] font-medium text-slate-500">{displayValue(te ? m.action_telugu : m.action_en, te ? "సంబంధ వివరాలను పరిశీలించండి." : "Review the profile details.")}</span>
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
              <p className="mv-empty-inline">
                {te ? "ఇటీవల జోడించిన ప్రొఫైళ్లు లేవు. తర్వాత మళ్లీ చూడండి. ప్రొఫైల్ వివరాలు పూర్తి చేసినంత మాత్రాన సంబంధం కుదురుతుందని హామీ లేదు." : "No recently added profiles are available. Please check again later; profile completeness does not guarantee results."}
              </p>
            )}

            {/* completeness nudge */}
            {pct < 100 && (
              <div className="mv-rowblock">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span><ChartNoAxesCombined aria-hidden="true" className="inline-block h-[1em] w-[1em]" /> {te ? "ప్రొఫైల్‌లో నింపిన వివరాలు" : "Profile completeness"}</span>
                  <span className="text-[#7A0C2E]">{pct}%</span>
                </div>
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full gold-gradient transition-all" style={{ width: `${Math.max(4, pct)}%` }} />
                </div>
                {(te ? nudge.verdict_telugu : nudge.verdict_en) && (
                  <p className="mt-1.5 text-[11px] font-medium text-slate-500">
                    {displayValue(te ? nudge.verdict_telugu : nudge.verdict_en, te ? "మీ ప్రొఫైల్ వివరాలను సమీక్షించండి." : "Review your profile details.")}
                  </p>
                )}
              </div>
            )}

            {/* tips checklist */}
            {tips.length > 0 && (
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                <p className="mb-2 text-xs font-black text-slate-700">
                  <Check aria-hidden="true" className="inline-block h-[1em] w-[1em]" /> {te ? "మీ తదుపరి అడుగులు" : "Your next steps"}
                </p>
                <ul className="space-y-1.5">
                  {tips.map((t, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span aria-hidden="true" className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${priorityColor(Number(t.priority || 3))}`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] font-medium leading-snug text-slate-700">{displayValue(te ? t.telugu : t.en, te ? "మీ ప్రొఫైల్ వివరాలను సమీక్షించండి." : "Review your profile details.")}</p>
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
