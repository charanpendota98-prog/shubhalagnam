"use client";

/**
 * 📱🌊 WAVE 19 — ADMIN WA numbers: OTP + Channels + Personal (+backup).
 * Add / pause / resume / delete + live health (caps, cooldowns, orders).
 */
import { useCallback, useEffect, useState } from "react";
import { apiDisplayMessage, authHeaders, readApiJson } from "@/lib/api";
import { Duo } from "@/lib/duo";
import { useLang } from "@/lib/lang";

type Row = Record<string, any>;
const adminToken = () => { try { return localStorage.getItem("tsap_admin_token") || ""; } catch { return ""; } };
const withToken = (url: string) => {
  const tk = adminToken();
  return tk ? `${url}${url.includes("?") ? "&" : "?"}token=${encodeURIComponent(tk)}` : url;
};
const H = () => ({ ...authHeaders(true), "Content-Type": "application/json" });

const LANE_META: Record<string, { icon: string; te: string; en: string }> = {
  otp: { icon: "🔑", te: "OTPలు మాత్రమే (fast 25–60s)", en: "OTP only (fast lane)" },
  channels: { icon: "📢", te: "Channel posts (120–170s gaps)", en: "Channel posts" },
  personal: { icon: "💬", te: "Interest/referral DMs (60–120s)", en: "Interest/referral messages" },
  both: { icon: "🛟", te: "Backup (failover)", en: "Backup (failover)" },
};

export default function WANumbersConsole() {
  const { lang } = useLang();
  const te = lang === "te";
  const [data, setData] = useState<Row | null>(null);
  const [queue, setQueue] = useState<Row | null>(null);
  const [flash, setFlash] = useState("");
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ name: "", url: "", lane: "both", daily_cap: "60", token: "", number: "" });

  const load = useCallback(async () => {
    try {
      const d = await fetch(withToken("/api/admin/wa/numbers"), { headers: authHeaders(true) }).then((r) => readApiJson(r));
      if (d?.success) { setData(d); setFlash(""); }
      else setFlash(apiDisplayMessage(d, te, te ? "నంబర్ జాబితాను లోడ్ చేయలేకపోయాం." : "Could not load the number list."));
      const qst = await fetch(withToken("/api/admin/poster"), { headers: authHeaders(true) }).then((r) => readApiJson(r));
      if (qst?.success) setQueue(qst);
      else setFlash(apiDisplayMessage(qst, te, te ? "Queue స్థితిని లోడ్ చేయలేకపోయాం." : "Could not load queue status."));
    } catch { setFlash(te ? "API లోపం. మళ్లీ ప్రయత్నించండి." : "API error. Please try again."); }
  }, [te]);
  useEffect(() => { void load(); }, [load]);

  const act = async (method: string, url: string, body?: Row) => {
    setBusy(true); setFlash("");
    try {
      const r = await fetch(withToken(url), { method, headers: H(), body: body ? JSON.stringify(body) : undefined });
      const d = await readApiJson(r);
      setFlash(apiDisplayMessage(d, te, d.success
        ? (te ? "✅ పని పూర్తయింది." : "✅ Action completed.")
        : (te ? "⚠️ చర్య విఫలమైంది." : "⚠️ The action failed.")));
      await load();
    } catch { setFlash(te ? "API లోపం. మళ్లీ ప్రయత్నించండి." : "API error. Please try again."); }
    setBusy(false);
  };

  const inst: Row[] = data?.instances || [];
  return (
    <div className="mt-4 rounded-2xl border border-gold/30 bg-white p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-[#7A0C2E]">📱 <Duo en="WhatsApp Numbers (OTP / Channels / Personal)" te="వాట్సాప్ నంబర్లు" /></h3>
        <button onClick={() => void load()} className="text-xs underline">↻ refresh</button>
      </div>
      <p className="text-[11px] text-gray-600 telugu">{te ? "ఇక్కడ చూపేది local sender configuration / worker queue స్థితి మాత్రమే; WhatsApp reachability, channel admin హక్కులు లేదా సందేశం చేరిందని ఇది పరీక్షించదు. మీకు అధికారం ఉన్న business numbers, bridge endpoints మాత్రమే నమోదు చేయండి." : "This panel shows local sender configuration and worker/queue state only; it does not test WhatsApp reachability, channel admin rights, or message delivery. Add only business numbers and bridge endpoints you are authorized to use."}</p>
      {flash ? <p className="mt-1 text-[12px] font-medium text-maroon">{flash}</p> : null}
      {queue ? (
        <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
          <span className={`rounded-full px-2.5 py-1 font-bold ${queue.paused ? "bg-rose-100 text-rose-700" : queue.queue?.worker_running === false ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
            {queue.paused ? (te ? "⏸️ స్థానిక sender pause లో ఉంది" : "⏸️ Local sender paused") : queue.queue?.worker_running === false ? (te ? "⚠️ Worker ఆగి ఉంది" : "⚠️ Worker stopped") : (te ? "🟢 Worker నడుస్తోంది · delivery check కాలేదు" : "🟢 Worker running · delivery not checked")}
          </span>
          <span className="rounded-full bg-slate-100 px-2.5 py-1">📮 queue <b>{queue.queue?.queued ?? 0}</b> (personal {queue.queue?.queued_interest ?? 0} · channels {queue.queue?.queued_channel ?? 0})</span>
          <span className="rounded-full bg-slate-100 px-2.5 py-1" title={te ? "ఇవి local sender report చేసిన ఫలితాలు; recipient అందుకున్నారని లేదా చదివారని నిర్ధారణ కాదు." : "Local sender results only; they do not confirm recipient delivery or reading."}>✅ {te ? "నమోదైన send ఫలితాలు" : "Recorded send results"} <b>{queue.queue?.sent_total ?? 0}</b></span>
          <span className="rounded-full bg-slate-100 px-2.5 py-1">❌ failed <b>{queue.queue?.failed_total ?? 0}</b></span>
          <span className="rounded-full bg-slate-100 px-2.5 py-1">⏱️ gaps OTP {queue.gaps?.min_gap_otp ?? 25}–{queue.gaps?.max_gap_otp ?? 60}s · DM {queue.gaps?.min_gap_interest ?? 60}–{queue.gaps?.max_gap_interest ?? 120}s · post {queue.gaps?.min_gap ?? 120}–{queue.gaps?.max_gap ?? 170}s</span>
        </div>
      ) : null}

      <div className="mt-3 grid md:grid-cols-2 gap-2">
        {inst.map((n) => {
          const meta = LANE_META[String(n.lane)] || LANE_META.both;
          return (
            <div key={String(n.name)} className={`rounded-xl border p-3 text-[12px] ${n.paused ? "border-slate-300 bg-slate-50 opacity-70" : "border-gold/30"}`}>
              <div className="flex items-center justify-between">
                <b>{meta.icon} {String(n.name)} <span className="font-mono text-[11px] text-gray-500">· {String(n.lane)} · {String(n.number_masked || "")}</span></b>
                <span className={`px-2 py-0.5 rounded-full font-bold ${n.available ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                  {n.paused ? (te ? "⏸️ నిలిపివేశారు" : "⏸️ Paused") : n.available ? (te ? "✅ స్థానికంగా సిద్ధం" : "✅ Ready locally") : `⏳ ${n.cooldown_s || 0}s`}
                </span>
              </div>
              <div className="mt-1 text-gray-600">
                Sent today <b>{n.sent_today}/{n.daily_cap}</b> · total {n.total_sent} · fails {n.failures}
                {n.last_error ? <span className="text-rose-700"> · {(te ? String(n.last_error) : apiDisplayMessage({ message_en: n.last_error }, false, "Error details are not available in English.")).slice(0, 60)}</span> : null}
              </div>
              <div className="mt-2 flex gap-2">
                <button disabled={busy} onClick={() => void act("POST", `/api/admin/wa/numbers/${n.name}`, { paused: !n.paused })}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 font-bold">
                  {n.paused ? "▶️ Resume" : "⏸️ Pause"}
                </button>
                <button disabled={busy} onClick={() => { if (confirm(te ? `${n.name} తీసెయ్యాలా?` : `Remove ${n.name}?`)) void act("DELETE", `/api/admin/wa/numbers/${n.name}`); }}
                  className="rounded-lg border border-rose-300 px-3 py-1.5 font-bold text-rose-700">🗑️</button>
              </div>
            </div>
          );
        })}
      </div>
      {data ? (
        <div className="mt-2 text-[11px] text-gray-600">
          OTP: {(data.otp_order || []).join(" → ") || "—"} · Channels: {(data.channels_order || []).join(" → ") || "—"} · Personal: {(data.personal_order || []).join(" → ") || "—"}
        </div>
      ) : null}

      <div className="mt-3 rounded-xl bg-cream/60 border border-gold/20 p-3">
        <div className="text-[12px] font-bold text-maroon">+ {` `}<Duo en="Add number" te="నంబర్ జోడించండి" /></div>
        <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2">
          <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder={te ? "Instance పేరు" : "Instance name"}
            className="rounded-lg border border-slate-300 px-2 py-1.5 text-[12px]" />
          <input value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} placeholder={te ? "అధికారిక bridge endpoint URL" : "Authorized bridge endpoint URL"}
            className="rounded-lg border border-slate-300 px-2 py-1.5 text-[12px] col-span-2" />
          <select value={f.lane} onChange={(e) => setF({ ...f, lane: e.target.value })}
            className="rounded-lg border border-slate-300 px-2 py-1.5 text-[12px]">
            {(["otp", "channels", "personal", "both"] as const).map((l) => (
              <option key={l} value={l}>{LANE_META[l].icon} {te ? LANE_META[l].te : LANE_META[l].en}</option>
            ))}
          </select>
          <input value={f.daily_cap} onChange={(e) => setF({ ...f, daily_cap: e.target.value })} placeholder={te ? "రోజువారీ పరిమితి" : "Daily cap"}
            inputMode="numeric" className="rounded-lg border border-slate-300 px-2 py-1.5 text-[12px]" />
          <input value={f.number} onChange={(e) => setF({ ...f, number: e.target.value })} placeholder={te ? "మీకు అధికారం ఉన్న WhatsApp నంబర్ (country code తో)" : "Authorized WhatsApp number with country code"}
            inputMode="numeric" className="rounded-lg border border-slate-300 px-2 py-1.5 text-[12px]" />
          <input value={f.token} onChange={(e) => setF({ ...f, token: e.target.value })} placeholder="bridge token (optional)"
            className="rounded-lg border border-slate-300 px-2 py-1.5 text-[12px] col-span-2" />
          <button disabled={busy} onClick={() => void act("POST", "/api/admin/wa/numbers", { ...f, daily_cap: Number(f.daily_cap) || 60 })}
            className="rounded-lg maroon-gradient text-white px-3 py-1.5 text-[12px] font-bold disabled:opacity-50">
            ✅ Add
          </button>
        </div>
      </div>
    </div>
  );
}
