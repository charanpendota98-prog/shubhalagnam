"use client";

/**
 * Least-privilege worker operations view. It deliberately consumes only the
 * control worker snapshot: no member IDs, phone numbers, message bodies, QR
 * contents, pairing codes, tokens, money, or owner-only configuration actions.
 */
import { useCallback, useEffect, useState } from "react";
import { apiDisplayMessage, readApiJson } from "@/lib/api";
import { Duo } from "@/lib/duo";
import { useLang } from "@/lib/lang";

type Row = Record<string, any>;

function heartbeatLabel(worker: Row, te: boolean): { label: string; className: string } {
  if (!worker?.running) return { label: te ? "⏸️ Worker ఆగి ఉంది" : "⏸️ Worker stopped", className: "bg-rose-100 text-rose-800" };
  const raw = String(worker.heartbeat_at || "");
  const at = Date.parse(raw ? `${raw}${raw.endsWith("Z") ? "" : "Z"}` : "");
  if (!at || Date.now() - at > 120000) return { label: te ? "⚠️ Heartbeat పాతది" : "⚠️ Heartbeat stale", className: "bg-amber-100 text-amber-900" };
  return { label: te ? "🟢 Worker heartbeat healthy" : "🟢 Worker heartbeat healthy", className: "bg-emerald-100 text-emerald-800" };
}

export default function WorkerOpsPanel() {
  const { lang } = useLang();
  const te = lang === "te";
  const [data, setData] = useState<Row | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/control/worker/ops", { credentials: "include", cache: "no-store" });
      const result = await readApiJson(response);
      if (!response.ok || !result.success) throw new Error(apiDisplayMessage(result, te, te ? "Operations స్థితి లోడ్ కాలేదు." : "Could not load worker operations."));
      setData(result);
      setError("");
    } catch (reason: any) {
      setError(reason?.message || (te ? "Operations స్థితి లోడ్ కాలేదు." : "Could not load worker operations."));
    } finally { setLoading(false); }
  }, [te]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 15000);
    return () => window.clearInterval(timer);
  }, [load]);

  const worker = data?.worker || {};
  const queue = data?.queue || {};
  const heartbeat = heartbeatLabel(worker, te);
  const instances: Row[] = data?.instances || [];
  const errors: Row[] = data?.recent_errors || [];

  return (
    <section className="rounded-3xl border border-gold/30 bg-white p-4 shadow-sm sm:p-5" aria-labelledby="worker-ops-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="worker-ops-title" className="text-lg font-black text-[#7A0C2E]">🛠️ <Duo en="Worker operations" te="వర్కర్ ఆపరేషన్స్" /></h2>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-600">{te ? "ఇది least-privilege operational snapshot మాత్రమే: queue depth, heartbeat, retries, dead letters, pause state మరియు safe error categories. Owner money, PII, message bodies, QR, pairing codes లేదా bridge tokens ఇక్కడ ఉండవు." : "Least-privilege operational snapshot only: queue depth, heartbeat, retries, dead letters, pause state, and safe error categories. Owner money, PII, message bodies, QR, pairing codes, and bridge tokens are withheld."}</p>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading} className="min-h-10 rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold disabled:opacity-50">↻ {te ? "రిఫ్రెష్" : "Refresh"}</button>
      </div>
      {error ? <p className="mt-3 rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-800" role="alert">{error}</p> : null}
      {data ? (
        <>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3"><div className="text-xl font-black text-slate-900">{queue.depth ?? 0}</div><div className="text-[11px] font-bold text-slate-500">{te ? "క్యూ లో" : "Queue depth"}</div></div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3"><div className="text-xl font-black text-slate-900">{queue.retrying ?? 0}</div><div className="text-[11px] font-bold text-slate-500">{te ? "Retrying" : "Retrying"}</div></div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3"><div className="text-xl font-black text-slate-900">{data.dead_letters ?? 0}</div><div className="text-[11px] font-bold text-slate-500">{te ? "Dead letters" : "Dead letters"}</div></div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3"><div className="text-xl font-black text-slate-900">{data.failed_total ?? 0}</div><div className="text-[11px] font-bold text-slate-500">{te ? "నమోదైన failures" : "Recorded failures"}</div></div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
            <span className={`rounded-full px-3 py-1 font-bold ${heartbeat.className}`}>{heartbeat.label}</span>
            <span className={`rounded-full px-3 py-1 font-bold ${data.paused ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"}`}>{data.paused ? (te ? "⏸️ WhatsApp sender paused" : "⏸️ WhatsApp sender paused") : (te ? "▶️ Sender active" : "▶️ Sender active")}</span>
            <span className="rounded-full bg-slate-100 px-3 py-1">OTP {queue.otp ?? 0} · channels {queue.channels ?? 0} · personal {queue.personal ?? 0}</span>
            <span className="rounded-full bg-slate-100 px-3 py-1">{te ? "చివరి heartbeat" : "Last heartbeat"}: {worker.heartbeat_at ? String(worker.heartbeat_at).replace("T", " ").slice(0, 19) : "—"}</span>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 p-3">
              <h3 className="text-sm font-black text-slate-800">📱 {te ? "Sender lanes" : "Sender lanes"}</h3>
              <div className="mt-2 space-y-2">
                {instances.map((item) => (
                  <div key={String(item.name)} className="rounded-xl bg-slate-50 p-2 text-xs">
                    <div className="flex flex-wrap items-center gap-2"><b>{String(item.name)}</b><span className="rounded-full bg-white px-2 py-0.5 font-bold">{String(item.lane)}</span><span className="text-slate-500">{String(item.status || "unknown")}</span><span className="ml-auto">cap {item.sent_today ?? 0}/{item.daily_cap ?? 0}</span></div>
                    <div className="mt-1 text-[11px] text-slate-500">{item.paused ? "Paused" : item.available ? "Available locally" : `Cooldown ${item.cooldown_s ?? 0}s`} · auth {String(item.auth_state || "unknown")}</div>
                  </div>
                ))}
                {!instances.length ? <p className="text-xs text-slate-500">{te ? "Configured sender lanes లేవు." : "No configured sender lanes."}</p> : null}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 p-3">
              <h3 className="text-sm font-black text-slate-800">🧯 {te ? "Safe error summaries" : "Safe error summaries"}</h3>
              <div className="mt-2 space-y-2">
                {errors.map((item, index) => <div key={`${String(item.at)}-${index}`} className="rounded-xl bg-slate-50 p-2 text-xs"><span className="font-mono text-[10px] text-slate-400">{String(item.at || "").slice(0, 19)}</span> · <b>{String(item.kind || "operation")}</b> · {item.ok ? "OK" : String(item.error || "Failure category withheld")}</div>)}
                {!errors.length ? <p className="text-xs text-slate-500">{te ? "ఇటీవలి error summaries లేవు." : "No recent error summaries."}</p> : null}
              </div>
            </div>
          </div>
        </>
      ) : !error ? <p className="mt-4 text-sm font-bold text-slate-500">{te ? "స్థితి లోడ్ అవుతోంది…" : "Loading operations status…"}</p> : null}
    </section>
  );
}
