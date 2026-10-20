"use client";
/* eslint-disable @next/next/no-img-element -- QR is an in-memory data URL rendered only in the owner view. */

/**
 * Owner-only WhatsApp operations console.
 *
 * QR and pairing material is fetched only through the authenticated application
 * boundary. It is held in component memory for the current view; it is never
 * placed in URLs, local storage, analytics, worker responses, or audit metadata.
 */
import { useCallback, useEffect, useState } from "react";
import QRCode from "qrcode";
import { apiDisplayMessage, authHeaders, readApiJson } from "@/lib/api";
import { Duo } from "@/lib/duo";
import { useLang } from "@/lib/lang";

type Row = Record<string, any>;
type AuthState = {
  success?: boolean;
  connected?: boolean;
  registered?: boolean;
  qr_available?: boolean;
  pairing_available?: boolean;
  qr_age_seconds?: number | null;
  state?: string;
  error_code?: string;
};

const LANE_META: Record<string, { icon: string; te: string; en: string }> = {
  otp: { icon: "🔑", te: "OTPలు మాత్రమే (fast 25–60s)", en: "OTP only (fast lane)" },
  channels: { icon: "📢", te: "Channel posts (120–170s gaps)", en: "Channel posts" },
  personal: { icon: "💬", te: "Interest/referral DMs (60–120s)", en: "Interest/referral messages" },
  both: { icon: "🛟", te: "Backup (failover)", en: "Backup (failover)" },
};

function authLabel(auth: AuthState | undefined, te: boolean): string {
  if (!auth) return te ? "ఇంకా తనిఖీ చేయలేదు" : "Not checked yet";
  if (auth.connected) return te ? "✅ WhatsApp authenticated" : "✅ WhatsApp authenticated";
  if (auth.qr_available) return te ? "📷 QR సిద్ధంగా ఉంది" : "📷 QR ready";
  if (auth.state === "logged_out") return te ? "🔒 Logged out" : "🔒 Logged out";
  if (auth.error_code) return te ? "⚠️ Bridge status అందుబాటులో లేదు" : "⚠️ Bridge status unavailable";
  return te ? "⏳ Login అవసరం" : "⏳ Login required";
}

export default function WANumbersConsole({ controlCsrf = "" }: { controlCsrf?: string }) {
  const { lang } = useLang();
  const te = lang === "te";
  const [data, setData] = useState<Row | null>(null);
  const [queue, setQueue] = useState<Row | null>(null);
  const [authByName, setAuthByName] = useState<Record<string, AuthState>>({});
  const [qrByName, setQrByName] = useState<Record<string, string>>({});
  const [pairingByName, setPairingByName] = useState<Record<string, string>>({});
  const [phoneByName, setPhoneByName] = useState<Record<string, string>>({});
  const [authBusy, setAuthBusy] = useState<Record<string, boolean>>({});
  const [flash, setFlash] = useState("");
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ name: "", url: "", lane: "both", daily_cap: "60", token: "", number: "" });

  const headers = useCallback(() => ({
    ...authHeaders(true),
    "Content-Type": "application/json",
    ...(controlCsrf ? { "X-Control-CSRF": controlCsrf } : {}),
  }), [controlCsrf]);

  const instanceUrl = (name: string, suffix: string) =>
    `/api/admin/wa/numbers/${encodeURIComponent(name)}/auth${suffix}`;

  const loadAuth = useCallback(async (name: string) => {
    try {
      const response = await fetch(instanceUrl(name, ""), { headers: authHeaders(true), credentials: "include", cache: "no-store" });
      const result = await readApiJson(response);
      setAuthByName((current) => ({ ...current, [name]: result }));
      if (result?.connected) {
        setQrByName((current) => { const next = { ...current }; delete next[name]; return next; });
        setPairingByName((current) => { const next = { ...current }; delete next[name]; return next; });
      }
      return result as AuthState;
    } catch {
      const result = { success: false, error_code: "unavailable" };
      setAuthByName((current) => ({ ...current, [name]: result }));
      return result;
    }
  }, []);

  const load = useCallback(async () => {
    try {
      const d = await fetch("/api/admin/wa/numbers", { headers: authHeaders(true), credentials: "include", cache: "no-store" }).then((r) => readApiJson(r));
      if (d?.success) {
        setData(d);
        setFlash("");
        const names = (d.instances || []).map((item: Row) => String(item.name));
        await Promise.all(names.map((name: string) => loadAuth(name)));
      } else {
        setFlash(apiDisplayMessage(d, te, te ? "నంబర్ జాబితాను లోడ్ చేయలేకపోయాం." : "Could not load the number list."));
      }
      const qst = await fetch("/api/admin/poster", { headers: authHeaders(true), credentials: "include", cache: "no-store" }).then((r) => readApiJson(r));
      if (qst?.success) setQueue(qst);
    } catch {
      setFlash(te ? "API లోపం. మళ్లీ ప్రయత్నించండి." : "API error. Please try again.");
    }
  }, [loadAuth, te]);
  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 30000);
    return () => window.clearInterval(timer);
  }, [load]);

  const act = async (method: string, url: string, body?: Row) => {
    setBusy(true); setFlash("");
    try {
      const r = await fetch(url, { method, headers: headers(), credentials: "include", body: body ? JSON.stringify(body) : undefined });
      const d = await readApiJson(r);
      if (d?.success && url === "/api/admin/wa/numbers") setF((current) => ({ ...current, token: "" }));
      setFlash(apiDisplayMessage(d, te, d.success
        ? (te ? "✅ పని పూర్తయింది." : "✅ Action completed.")
        : (te ? "⚠️ చర్య విఫలమైంది." : "⚠️ The action failed.")));
      await load();
    } catch { setFlash(te ? "API లోపం. మళ్లీ ప్రయత్నించండి." : "API error. Please try again."); }
    setBusy(false);
  };

  const showQr = async (name: string) => {
    setAuthBusy((current) => ({ ...current, [name]: true }));
    try {
      const r = await fetch(instanceUrl(name, "/qr"), { headers: authHeaders(true), credentials: "include", cache: "no-store" });
      const d = await readApiJson(r);
      if (d.success && d.qr) {
        const image = await QRCode.toDataURL(d.qr, { width: 260, margin: 2, errorCorrectionLevel: "M" });
        setQrByName((current) => ({ ...current, [name]: image }));
        setFlash(te ? "📷 QR చూపిస్తున్నాం. WhatsApp Linked Devices లో scan చేయండి." : "📷 QR shown. Scan it from WhatsApp Linked Devices.");
      } else {
        setFlash(apiDisplayMessage(d, te, te ? "QR ఇంకా సిద్ధంగా లేదు." : "QR is not ready yet."));
      }
      await loadAuth(name);
    } catch { setFlash(te ? "QR లోడ్ కాలేదు." : "Could not load the QR."); }
    finally { setAuthBusy((current) => ({ ...current, [name]: false })); }
  };

  const requestPairing = async (name: string) => {
    const phone = String(phoneByName[name] || "").trim();
    if (!/^\+?[1-9][0-9]{7,14}$/.test(phone)) {
      setFlash(te ? "Country code తో authorized phone number ఇవ్వండి (ఉదా: +9198...)." : "Enter an authorized phone number with country code, for example +9198... .");
      return;
    }
    setAuthBusy((current) => ({ ...current, [name]: true }));
    setPairingByName((current) => ({ ...current, [name]: "" }));
    try {
      const r = await fetch(instanceUrl(name, "/pairing-code"), {
        method: "POST", headers: headers(), credentials: "include", body: JSON.stringify({ phone }), cache: "no-store",
      });
      const d = await readApiJson(r);
      if (d.success && d.pairing_code) {
        // Deliberately keep the code only in React memory for this open admin view.
        setPairingByName((current) => ({ ...current, [name]: String(d.pairing_code) }));
        setFlash(te ? "🔐 Pairing code సిద్ధంగా ఉంది. WhatsApp లో వెంటనే నమోదు చేయండి." : "🔐 Pairing code ready. Enter it in WhatsApp promptly.");
      } else {
        setFlash(apiDisplayMessage(d, te, te ? "Pairing code ఇవ్వలేకపోయాం." : "Could not request a pairing code."));
      }
      await loadAuth(name);
    } catch { setFlash(te ? "Pairing code అభ్యర్థన విఫలమైంది." : "Pairing-code request failed."); }
    finally { setAuthBusy((current) => ({ ...current, [name]: false })); }
  };

  const inst: Row[] = data?.instances || [];
  return (
    <div className="mt-4 rounded-2xl border border-gold/30 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-bold text-[#7A0C2E]">📱 <Duo en="WhatsApp Operations Console" te="వాట్సాప్ ఆపరేషన్స్ కన్సోల్" /></h3>
          <p className="mt-0.5 text-[11px] text-slate-500">{te ? "OTP, channels, personal/referral మరియు optional backup lanes విడిగా నిర్వహించండి." : "Operate isolated OTP, channels, personal/referral, and optional backup lanes."}</p>
        </div>
        <button type="button" onClick={() => void load()} className="min-h-10 rounded-lg px-3 text-xs font-bold underline">↻ {te ? "రిఫ్రెష్" : "Refresh"}</button>
      </div>
      <p className="text-[11px] leading-relaxed text-gray-600">{te ? "ఈ owner-only panel authenticated application boundary ద్వారా మాత్రమే QR/pairing state తెస్తుంది. Bridge ports‌ను publicగా expose చేయాల్సిన అవసరం లేదు. ఇది local sender state మాత్రమే; WhatsApp reachability, recipient delivery లేదా చదివినట్లు నిర్ధారణ కాదు." : "This owner-only panel retrieves QR and pairing state only through the authenticated application boundary; bridge ports do not need to be public. It shows local sender state only, not WhatsApp reachability, recipient delivery, or reading."}</p>
      {flash ? <p className="mt-1 text-[12px] font-medium text-maroon" role="status">{flash}</p> : null}
      {queue ? (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
          <span className={`rounded-full px-2.5 py-1 font-bold ${queue.paused ? "bg-rose-100 text-rose-700" : queue.queue?.worker_running === false ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
            {queue.paused ? (te ? "⏸️ sender pause లో ఉంది" : "⏸️ Sender paused") : queue.queue?.worker_running === false ? (te ? "⚠️ Worker ఆగి ఉంది" : "⚠️ Worker stopped") : (te ? "🟢 Worker నడుస్తోంది" : "🟢 Worker running")}
          </span>
          <span className="rounded-full bg-slate-100 px-2.5 py-1">📮 queue <b>{queue.queue?.queued ?? 0}</b> · personal {queue.queue?.queued_interest ?? 0} · channels {queue.queue?.queued_channel ?? 0}</span>
          <span className="rounded-full bg-slate-100 px-2.5 py-1">✅ recorded sends <b>{queue.queue?.sent_total ?? 0}</b> · ❌ failed <b>{queue.queue?.failed_total ?? 0}</b></span>
          <span className="rounded-full bg-slate-100 px-2.5 py-1">⏱️ OTP {queue.gaps?.min_gap_otp ?? 25}–{queue.gaps?.max_gap_otp ?? 60}s · DM {queue.gaps?.min_gap_interest ?? 60}–{queue.gaps?.max_gap_interest ?? 120}s · post {queue.gaps?.min_gap ?? 120}–{queue.gaps?.max_gap ?? 170}s</span>
          <button type="button" disabled={busy} onClick={() => void act("POST", "/api/wa/pause?reason=admin_console")} className="min-h-9 rounded-lg border border-rose-300 px-2.5 font-bold text-rose-700 disabled:opacity-50">⏸️ {te ? "అన్నీ pause" : "Pause sender"}</button>
          <button type="button" disabled={busy} onClick={() => void act("POST", "/api/wa/resume")} className="min-h-9 rounded-lg border border-emerald-300 px-2.5 font-bold text-emerald-700 disabled:opacity-50">▶️ {te ? "Resume" : "Resume sender"}</button>
        </div>
      ) : null}

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {inst.map((n) => {
          const name = String(n.name);
          const meta = LANE_META[String(n.lane)] || LANE_META.both;
          const auth = authByName[name];
          const qr = qrByName[name];
          const pairing = pairingByName[name];
          const isBusy = busy || Boolean(authBusy[name]);
          return (
            <div key={name} className={`rounded-xl border p-3 text-[12px] ${n.paused ? "border-slate-300 bg-slate-50 opacity-70" : "border-gold/30"}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <b>{meta.icon} {name}</b>
                  <span className="ml-1 font-mono text-[11px] text-gray-500">· {String(n.lane)} · {String(n.number_masked || "")}</span>
                  <div className="mt-1 text-[11px] text-slate-600">{te ? "లేన్ ఉద్దేశ్యం" : "Lane purpose"}: {te ? meta.te : meta.en}</div>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${auth?.connected ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                  {authLabel(auth, te)}{auth?.qr_available && auth.qr_age_seconds != null ? ` · ${auth.qr_age_seconds}s` : ""}
                </span>
              </div>
              <div className="mt-1 text-gray-600">
                Sent today <b>{n.sent_today}/{n.daily_cap}</b> · total {n.total_sent} · fails {n.failures} · cooldown {n.cooldown_s || 0}s
                {n.last_error ? <span className="text-rose-700"> · {String(n.last_error).slice(0, 70)}</span> : null}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" disabled={isBusy} onClick={() => void loadAuth(name)} className="min-h-10 rounded-lg border border-slate-300 px-3 py-1.5 font-bold">🔎 {te ? "Auth స్థితి" : "Check auth"}</button>
                <button type="button" disabled={isBusy || Boolean(auth?.connected)} onClick={() => void showQr(name)} className="min-h-10 rounded-lg border border-indigo-300 px-3 py-1.5 font-bold text-indigo-800 disabled:opacity-40">📷 {te ? "QR చూపించు" : "Show QR"}</button>
                <button type="button" disabled={busy} onClick={() => void act("POST", `/api/admin/wa/numbers/${encodeURIComponent(name)}`, { paused: !n.paused })} className="min-h-10 rounded-lg border border-slate-300 px-3 py-1.5 font-bold">
                  {n.paused ? "▶️ Resume" : "⏸️ Pause"}
                </button>
                <button type="button" aria-label={te ? `${name} నంబర్‌ను తొలగించండి` : `Remove ${name}`} disabled={busy} onClick={() => { if (confirm(te ? `${name} తీసెయ్యాలా?` : `Remove ${name}?`)) void act("DELETE", `/api/admin/wa/numbers/${encodeURIComponent(name)}`); }} className="min-h-10 rounded-lg border border-rose-300 px-3 py-1.5 font-bold text-rose-700">🗑️</button>
              </div>
              {!auth?.connected && !n.paused ? (
                <div className="mt-2 rounded-lg border border-indigo-100 bg-indigo-50/60 p-2">
                  <div className="text-[11px] font-bold text-indigo-900">🔐 {te ? "QR లేదా pairing-code login" : "QR or pairing-code login"}</div>
                  <div className="mt-1 flex flex-wrap gap-2">
                    <input type="tel" inputMode="tel" autoComplete="off" value={phoneByName[name] || ""} onChange={(e) => setPhoneByName((current) => ({ ...current, [name]: e.target.value }))} placeholder={te ? "+91... authorized number" : "+countrycode authorized number"} aria-label={te ? `${name} pairing phone` : `${name} pairing phone`} className="min-h-10 min-w-[180px] flex-1 rounded-lg border border-indigo-200 px-2 text-base sm:text-xs" />
                    <button type="button" disabled={isBusy} onClick={() => void requestPairing(name)} className="min-h-10 rounded-lg bg-indigo-700 px-3 py-1.5 font-bold text-white disabled:opacity-50">🔢 {te ? "Code అడగండి" : "Request code"}</button>
                  </div>
                  {pairing ? <div className="mt-2 rounded-lg bg-white p-2 text-center"><span className="text-[10px] text-slate-500">{te ? "ఈ viewలో మాత్రమే code" : "Code shown only in this view"}</span><output className="mt-0.5 block font-mono text-xl font-black tracking-[0.3em] text-indigo-900" aria-live="polite">{pairing}</output><button type="button" onClick={() => { void navigator.clipboard?.writeText(pairing); setFlash(te ? "📋 Code కాపీ అయింది; historyలో నిల్వ చేయలేదు." : "📋 Code copied; it is not stored in history."); }} className="mt-1 min-h-9 rounded-lg border border-indigo-200 px-3 text-xs font-bold">📋 {te ? "కాపీ" : "Copy"}</button></div> : null}
                </div>
              ) : null}
              {qr ? <div className="mt-2 rounded-lg border border-indigo-100 bg-white p-2 text-center"><img src={qr} alt={te ? `${name} WhatsApp login QR` : `${name} WhatsApp login QR`} className="mx-auto h-52 w-52" /><p className="mt-1 text-[10px] text-slate-500">{te ? "Scan పూర్తయ్యే వరకు refresh చేయండి." : "Refresh auth status after scanning."}</p></div> : null}
            </div>
          );
        })}
      </div>
      {data ? <div className="mt-2 text-[11px] text-gray-600">🔑 OTP: {(data.otp_order || []).join(" → ") || "—"} · 📢 Channels: {(data.channels_order || []).join(" → ") || "—"} · 💬 Personal: {(data.personal_order || []).join(" → ") || "—"}</div> : null}

      <div className="mt-3 rounded-xl border border-gold/20 bg-cream/60 p-3">
        <div className="text-[12px] font-bold text-maroon">+ <Duo en="Add authorized bridge instance" te="అధికారిక bridge instance జోడించండి" /></div>
        <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-3">
          <input aria-label={te ? "Instance పేరు" : "Instance name"} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder={te ? "Instance పేరు" : "Instance name"} className="min-h-10 rounded-lg border border-slate-300 px-2 py-1.5 text-base sm:text-xs" />
          <input aria-label={te ? "అధికారిక bridge endpoint URL" : "Authorized bridge endpoint URL"} value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} placeholder={te ? "internal bridge URL" : "internal bridge URL"} className="col-span-2 min-h-10 rounded-lg border border-slate-300 px-2 py-1.5 text-base sm:text-xs" />
          <select aria-label={te ? "లేన్" : "Lane"} value={f.lane} onChange={(e) => setF({ ...f, lane: e.target.value })} className="min-h-10 rounded-lg border border-slate-300 px-2 py-1.5 text-base sm:text-xs">
            {(["otp", "channels", "personal", "both"] as const).map((l) => <option key={l} value={l}>{LANE_META[l].icon} {te ? LANE_META[l].te : LANE_META[l].en}</option>)}
          </select>
          <input aria-label={te ? "రోజువారీ పరిమితి" : "Daily cap"} value={f.daily_cap} onChange={(e) => setF({ ...f, daily_cap: e.target.value })} placeholder={te ? "రోజువారీ పరిమితి" : "Daily cap"} inputMode="numeric" className="min-h-10 rounded-lg border border-slate-300 px-2 py-1.5 text-base sm:text-xs" />
          <input aria-label={te ? "అధికారిక WhatsApp నంబర్" : "Authorized WhatsApp number with country code"} value={f.number} onChange={(e) => setF({ ...f, number: e.target.value })} placeholder={te ? "+countrycode number" : "+countrycode number"} inputMode="tel" className="min-h-10 rounded-lg border border-slate-300 px-2 py-1.5 text-base sm:text-xs" />
          <input type="password" aria-label="bridge token" value={f.token} onChange={(e) => setF({ ...f, token: e.target.value })} placeholder="bridge token (never returned)" autoComplete="new-password" spellCheck={false} className="col-span-2 min-h-10 rounded-lg border border-slate-300 px-2 py-1.5 text-base sm:text-xs" />
          <button type="button" disabled={busy} onClick={() => void act("POST", "/api/admin/wa/numbers", { ...f, daily_cap: Number(f.daily_cap) || 60 })} className="min-h-10 rounded-lg maroon-gradient px-3 py-1.5 text-[12px] font-bold text-white disabled:opacity-50">✅ {te ? "జోడించండి" : "Add instance"}</button>
        </div>
        <p className="mt-1 text-[10px] text-slate-500">{te ? "Productionలో bridge token తప్పనిసరి; token browser responseలో తిరిగి రాదు." : "Production bridges must use a token; the token is never returned to the browser."}</p>
      </div>
    </div>
  );
}
