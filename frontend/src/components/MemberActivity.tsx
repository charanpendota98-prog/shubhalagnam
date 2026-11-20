"use client";

/**
 * 📊 YOUR OWN ACTIVITY (WAVE 43)
 * This account's own request counts and the real time it takes to get an
 * answer here — small samples are labelled as small samples, never as a
 * forecast of what will happen with the next request.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { ChartNoAxesColumnIncreasing } from "lucide-react";
import { apiGet } from "@/lib/api";
import { useLang } from "@/lib/lang";

type Side = { total: number; pending: number; accepted: number; declined?: number; expired?: number };
type Activity = {
  tsap_id: string; sent: Side; received: Side; responded: number;
  response_rate_percent: number; median_response_hours: number | null;
  oldest_pending_hours: number | null; sample_size: number; small_sample: boolean;
  note_en: string; note_te: string;
};

function validActivity(value: unknown, owner: string): value is Activity {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const d = value as Activity;
  const count = (n: unknown): n is number => typeof n === "number" && Number.isSafeInteger(n) && n >= 0;
  const duration = (n: unknown) => n === null || (typeof n === "number" && Number.isFinite(n) && n >= 0);
  if (d.tsap_id !== owner || !d.sent || !d.received) return false;
  const s = d.sent, r = d.received;
  if (![s.total, s.pending, s.accepted, s.declined, s.expired, r.total, r.pending, r.accepted,
      d.responded, d.sample_size].every(count)) return false;
  if (s.pending + s.accepted + s.declined! + s.expired! > s.total || r.pending + r.accepted > r.total ||
      d.responded !== s.accepted + s.declined! || d.sample_size !== s.total ||
      d.small_sample !== (d.sample_size < 5)) return false;
  const rate = s.total ? Math.round(1000 * d.responded / s.total) / 10 : 0;
  return typeof d.response_rate_percent === "number" && Number.isFinite(d.response_rate_percent) &&
    Math.abs(d.response_rate_percent - rate) < 0.051 && duration(d.median_response_hours) &&
    duration(d.oldest_pending_hours) && typeof d.note_en === "string" && !!d.note_en.trim() &&
    typeof d.note_te === "string" && !!d.note_te.trim();
}

function hours(hoursValue?: number | null): string {
  if (hoursValue === null || typeof hoursValue !== "number") return "-";
  if (hoursValue < 24) return `${Math.round(hoursValue)} h`;
  return `${(hoursValue / 24).toFixed(1)} d`;
}

function Tile({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="mv-rowblock text-center">
      <div className="text-lg font-black text-[#7A0C2E]">{value}</div>
      <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
    </div>
  );
}

export default function MemberActivity({ tsapId }: { tsapId: string }) {
  const { lang } = useLang();
  const te = lang === "te";
  const [data, setData] = useState<Activity | null>(null);
  const [read, setRead] = useState<"loading" | "ready" | "error">("loading");
  const epoch = useRef(0);

  const load = useCallback(async () => {
    const current = ++epoch.current;
    setData(null); setRead("loading");
    if (!tsapId) return;
    try {
      const { ok, data: result } = await apiGet<unknown>(`/api/me/${encodeURIComponent(tsapId)}/activity`);
      if (current !== epoch.current) return;
      if (!ok || !validActivity(result, tsapId)) throw new Error("Activity unavailable");
      setData(result); setRead("ready");
    } catch { if (current === epoch.current) setRead("error"); }
  }, [tsapId]);

  useEffect(() => {
    const readEpoch = epoch;
    void load();
    return () => { readEpoch.current++; };
  }, [load]);

  if (!tsapId) return null;
  if (read !== "ready" || !data) return (
    <section className="px-4" aria-label={te ? "మీ కార్యకలాపాలు" : "Your activity"}>
      <div className="mv-surface mv-surface__body space-y-3">
        <h2 className="mv-surface__title mv-surface__title--ink"><ChartNoAxesColumnIncreasing aria-hidden="true" className="inline-block h-[1em] w-[1em]" /> {te ? "మీ కార్యకలాపాలు" : "Your activity"}</h2>
        {read === "loading" ? <p role="status" className="text-sm text-slate-600">{te ? "మీ కార్యకలాపాల వివరాలు తెస్తున్నాం…" : "Loading your activity…"}</p> : <>
          <p role="alert" className="text-sm text-rose-700">{te ? "మీ కార్యకలాపాల వివరాలు రాలేదు. ఇవి సున్నా అని కాదు." : "Your activity could not be loaded. This does not mean there is no activity."}</p>
          <button type="button" className="min-h-11 rounded-xl border border-maroon/30 px-3 py-2 text-sm font-bold text-maroon" onClick={() => void load()}>{te ? "కార్యకలాపాల వివరాలు మళ్లీ తెప్పించండి" : "Retry activity"}</button>
        </>}
      </div>
    </section>
  );

  const sent = data.sent || {};
  const received = data.received || {};

  return (
    <section className="px-4" aria-label={te ? "మీ కార్యకలాపాలు" : "Your activity"}>
      <div className="mv-surface mv-surface__body">
        <h2 className="mv-surface__title mv-surface__title--ink">
          <ChartNoAxesColumnIncreasing aria-hidden="true" className="inline-block h-[1em] w-[1em]" /> {te ? "మీ కార్యకలాపాలు" : "Your activity"}
        </h2>

        <p className="mt-1 text-[11px] text-slate-600">
          {te ? "మీరు పంపినవి" : "Sent"} {sent.total || 0} · {te ? "అందినవి" : "Received"} {received.total || 0}
        </p>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Tile value={sent.pending || 0} label={te ? "వేచి ఉన్నవి" : "Pending sent"} />
          <Tile value={sent.accepted || 0} label={te ? "అంగీకారం" : "Accepted"} />
          <Tile value={received.pending || 0} label={te ? "సమాధానం ఇవ్వాలి" : "Awaiting you"} />
          <Tile value={sent.expired || 0} label={te ? "గడువు ముగిసినవి" : "Expired"} />
        </div>

        <dl className="mt-3 grid grid-cols-2 gap-2">
          <div className="mv-rowblock bg-[#fffaf3]">
            <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
              {te ? "సమాధాన రేటు" : "Response rate"}
            </dt>
            <dd className="mt-0.5 text-sm font-black text-slate-900">
              {typeof data.response_rate_percent === "number" ? `${data.response_rate_percent}%` : "-"}
            </dd>
          </div>
          <div className="mv-rowblock bg-[#fffaf3]">
            <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
              {te ? "సగటు సమాధాన సమయం" : "Typical wait"}
            </dt>
            <dd className="mt-0.5 text-sm font-black text-slate-900">{hours(data.median_response_hours)}</dd>
          </div>
        </dl>

        {data.small_sample && (
          <p className="mv-note mt-2 text-[11px] font-semibold text-[#6b4a12]">
            {te
              ? `ఇప్పటివరకు ${data.sample_size} అభ్యర్థనలు మాత్రమే ఉన్నాయి. ఇవి తక్కువ వివరాలు; భవిష్యత్తు అంచనా కాదు.`
              : `Small sample, only ${data.sample_size || 0} request(s) so far. This is not a forecast.`}
          </p>
        )}

        <p className="mt-3 rounded-xl bg-[#fffaf3] p-3 text-[11px] leading-relaxed text-slate-600">
          {te ? data.note_te : data.note_en}
        </p>
      </div>
    </section>
  );
}
