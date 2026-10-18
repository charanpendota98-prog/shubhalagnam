"use client";

/**
 * 📊 YOUR OWN ACTIVITY (WAVE 43)
 * This account's own request counts and the real time it takes to get an
 * answer here — small samples are labelled as small samples, never as a
 * forecast of what will happen with the next request.
 */
import { useCallback, useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import { useLang } from "@/lib/lang";

type Side = { total?: number; pending?: number; accepted?: number; declined?: number; expired?: number };
type Activity = {
  sent?: Side;
  received?: Side;
  responded?: number;
  response_rate_percent?: number;
  median_response_hours?: number | null;
  oldest_pending_hours?: number | null;
  sample_size?: number;
  small_sample?: boolean;
  note_en?: string;
  note_te?: string;
};

function hours(hoursValue?: number | null): string {
  if (hoursValue === null || typeof hoursValue !== "number") return "-";
  if (hoursValue < 24) return `${Math.round(hoursValue)} h`;
  return `${(hoursValue / 24).toFixed(1)} d`;
}

function Tile({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 text-center">
      <div className="text-lg font-black text-[#7A0C2E]">{value}</div>
      <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
    </div>
  );
}

export default function MemberActivity({ tsapId }: { tsapId: string }) {
  const { lang } = useLang();
  const te = lang === "te";
  const [data, setData] = useState<Activity | null>(null);

  const load = useCallback(async () => {
    if (!tsapId) return;
    const { ok, data: d } = await apiGet<Activity>(`/api/me/${encodeURIComponent(tsapId)}/activity`);
    if (ok && d) setData(d);
  }, [tsapId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!tsapId || !data) return null;

  const sent = data.sent || {};
  const received = data.received || {};

  return (
    <section className="px-4" aria-label={te ? "మీ కార్యకలాపాలు" : "Your activity"}>
      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="text-base font-black text-[#7A0C2E]">
          {te ? "📊 మీ కార్యకలాపాలు" : "📊 Your activity"}
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
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
            <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
              {te ? "సమాధాన రేటు" : "Response rate"}
            </dt>
            <dd className="mt-0.5 text-sm font-black text-slate-900">
              {typeof data.response_rate_percent === "number" ? `${data.response_rate_percent}%` : "-"}
            </dd>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
            <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
              {te ? "సగటు సమాధాన సమయం" : "Typical wait"}
            </dt>
            <dd className="mt-0.5 text-sm font-black text-slate-900">{hours(data.median_response_hours)}</dd>
          </div>
        </dl>

        {data.small_sample && (
          <p className="mt-2 rounded-2xl border border-amber-200 bg-amber-50 p-2.5 text-[11px] font-semibold text-amber-900">
            {te
              ? `ఇది చిన్న నమూనా — ${data.sample_size || 0} request(లు) మాత్రమే. ఇది భవిష్యత్తు అంచనా కాదు.`
              : `Small sample — only ${data.sample_size || 0} request(s) so far. This is not a forecast.`}
          </p>
        )}

        <p className="mt-3 rounded-2xl bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-600">
          {te ? data.note_te : data.note_en}
        </p>
      </div>
    </section>
  );
}
