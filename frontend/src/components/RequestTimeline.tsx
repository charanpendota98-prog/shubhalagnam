"use client";

/**
 * 🕒 REQUEST TIMELINE (WAVE 43)
 * Only steps that are actually recorded, with the time they were recorded.
 * Nothing is drawn as delivered, read, or replied unless it happened.
 */
import { useCallback, useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import { useLang } from "@/lib/lang";

type Step = {
  key: string;
  label_en: string;
  label_te: string;
  icon: string;
  state: "completed" | "waiting" | "not_recorded";
  at?: string | null;
  note_en: string;
  note_te: string;
};

type Timeline = {
  status?: string;
  created_at?: string | null;
  expires_at?: string | null;
  steps?: Step[];
  completed_steps?: number;
  total_steps?: number;
  note_en?: string;
  note_te?: string;
};

function when(value?: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

export default function RequestTimeline({ requestId }: { requestId: string }) {
  const { lang } = useLang();
  const te = lang === "te";
  const [data, setData] = useState<Timeline | null>(null);
  const [visible, setVisible] = useState(false);

  const load = useCallback(async () => {
    if (!requestId) return;
    const { ok, data: d } = await apiGet<Timeline>(`/api/interest/${encodeURIComponent(requestId)}/timeline`);
    if (ok && d) {
      setData(d);
      setVisible(true);
    }
  }, [requestId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!requestId || !data || !visible) return null;

  return (
    <section
      className="mx-auto mt-3 max-w-3xl px-4"
      aria-label={te ? "Request టైమ్‌లైన్" : "Request timeline"}
    >
      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-black text-[#7A0C2E]">
            {te ? "🕒 Request టైమ్‌లైన్" : "🕒 Request timeline"}
          </h2>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700">
            {data.completed_steps ?? 0}/{data.total_steps ?? 0} {te ? "నమోదైన దశలు" : "recorded steps"}
          </span>
        </div>

        {data.created_at && (
          <p className="mt-2 text-[11px] text-slate-600">
            {te ? "పంపినది: " : "Sent: "}
            {when(data.created_at)}
            {data.expires_at ? (
              <>
                {" · "}
                {te ? "గడువు: " : "Expires: "}
                {when(data.expires_at)}
              </>
            ) : null}
          </p>
        )}

        <ol className="mt-3 space-y-2">
          {(data.steps || []).map((step) => (
            <li
              key={step.key}
              className={`rounded-2xl border p-3 ${
                step.state === "completed" ? "border-emerald-200 bg-emerald-50/60" : "border-slate-200 bg-slate-50/70"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-[12px] font-extrabold text-slate-900">
                  <span aria-hidden="true">{step.icon}</span> {te ? step.label_te : step.label_en}
                </p>
                <span className="shrink-0 text-[10px] font-bold text-slate-500">{when(step.at)}</span>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-600">{te ? step.note_te : step.note_en}</p>
            </li>
          ))}
        </ol>

        <p className="mt-3 rounded-2xl bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-600">
          {te ? data.note_te : data.note_en}
        </p>
      </div>
    </section>
  );
}
