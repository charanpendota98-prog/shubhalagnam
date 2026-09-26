"use client";
/**
 * 🙋 WAVE 36 — /me MY ACCOUNT (streak + unlocks + boost + voice + jathakam + share).
 * Login unna user ki private hub — anni owner-token tho protect.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import AuthGate from "@/components/AuthGate";
import RasiChart from "@/components/RasiChart";
import PushBell from "@/components/PushBell";
import { apiGet, apiPost, authHeaders } from "@/lib/api";
import { Duo } from "@/lib/duo";
import { useLang } from "@/lib/lang";

type Row = Record<string, any>;
type Tab = "streak" | "unlocks" | "boost" | "voice" | "jathakam" | "share" | "alerts";

const TABS: [Tab, string, string][] = [
  ["streak", "🔥 Streak", "🔥 స్ట్రీక్"],
  ["unlocks", "📋 Unlocks", "📋 అన్‌లాక్‌లు"],
  ["boost", "⚡ Boost", "⚡ బూస్ట్"],
  ["voice", "🎙️ Voice", "🎙️ వాయిస్"],
  ["jathakam", "🪐 Jathakam", "🪐 జాతకం"],
  ["share", "📤 Share", "📤 షేర్"],
  ["alerts", "🔔 Alerts", "🔔 అలర్ట్స్"],
];

export default function MePage() {
  const { lang } = useLang();
  const te = lang === "te";
  const [myId, setMyId] = useState("");
  const [tab, setTab] = useState<Tab>("streak");

  useEffect(() => {
    try { setMyId(localStorage.getItem("tsap_id") || ""); } catch { /* ignore */ }
  }, []);

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-2xl font-extrabold text-[#7A0C2E]">
        <Duo en="🙋 My Account" te="🙋 నా అకౌంట్" />
      </h1>
      {myId ? (
        <p className="font-mono text-[12px] text-slate-500">{myId}</p>
      ) : (
        <div className="mt-4">
          <AuthGate note={te ? "Streak, unlocks, boost — మీ private data కి OTP login కావాలి." : "Streak, unlocks, boost — your private data needs OTP login."} />
        </div>
      )}
      {myId ? (
        <>
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {TABS.map(([v, en, t]) => (
              <button key={v} onClick={() => setTab(v)}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-[13px] font-bold ${tab === v ? "maroon-gradient text-white" : "border border-slate-300 text-slate-700"}`}>
                {te ? t : en}
              </button>
            ))}
          </div>
          <div className="mt-4">
            {tab === "streak" && <StreakPanel myId={myId} />}
            {tab === "unlocks" && <UnlocksPanel myId={myId} />}
            {tab === "boost" && <BoostPanel myId={myId} />}
            {tab === "voice" && <VoicePanel myId={myId} />}
            {tab === "jathakam" && <JathakamPanel myId={myId} />}
            {tab === "share" && <SharePanel myId={myId} />}
            {tab === "alerts" && <AlertsPanel myId={myId} />}
          </div>
        </>
      ) : null}
    </main>
  );
}

function Msg({ m }: { m: { ok: boolean; text: string } | null }) {
  if (!m) return null;
  return (
    <p className={`mt-3 rounded-2xl border p-3 text-sm font-semibold ${m.ok ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-amber-300 bg-amber-50 text-amber-900"}`}>
      {m.text}
    </p>
  );
}

/* ---------------- 🔥 STREAK ---------------- */
function StreakPanel({ myId }: { myId: string }) {
  const { lang } = useLang();
  const te = lang === "te";
  const [st, setSt] = useState<Row | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const { ok, data } = await apiGet<Row>(`/api/streak/${encodeURIComponent(myId)}`);
    if (ok && data) setSt(data);
  }, [myId]);
  useEffect(() => { void load(); }, [load]);
  const claim = async () => {
    setBusy(true);
    const { ok, data, errorTelugu } = await apiPost<Row>("/api/streak/claim", { tsap_id: myId });
    setBusy(false);
    if (ok && data?.success) {
      setMsg({ ok: true, text: String(data.message_telugu || "Claimed") });
      void load();
    } else setMsg({ ok: false, text: String(data?.message_telugu || errorTelugu) });
  };
  return (
    <section className="rounded-3xl border border-rose-200 bg-white p-5 text-center">
      <p className="text-5xl">🔥</p>
      <p className="mt-2 text-4xl font-extrabold text-[#7A0C2E]">{st?.count ?? "—"}</p>
      <p className="text-[12px] text-slate-500">{te ? "రోజుల streak (రోజూ claim చేస్తే పెరుగుతుంది)" : "day streak (claim daily to grow)"}</p>
      <div className="mt-3 flex justify-center gap-3 text-[12px]">
        <span className="rounded-full bg-amber-50 border border-amber-300 px-3 py-1">🏆 Best: {st?.best ?? "—"}</span>
        <span className="rounded-full bg-emerald-50 border border-emerald-300 px-3 py-1">🎁 {te ? "రేపు" : "Next"}: +{st?.next_bonus ?? "?"} credits</span>
      </div>
      <button onClick={() => void claim()} disabled={busy || !!st?.claimed_today}
        className="mt-4 rounded-2xl bg-[#7A0C2E] px-6 py-3 text-sm font-bold text-white disabled:opacity-50">
        {st?.claimed_today ? (te ? "✅ ఈరోజు తీసుకున్నారు" : "✅ Claimed today") : busy ? "…" : te ? "🎁 Daily bonus claim చెయ్యి" : "🎁 Claim daily bonus"}
      </button>
      <Msg m={msg} />
    </section>
  );
}

/* ---------------- 📋 UNLOCKS ---------------- */
function UnlocksPanel({ myId }: { myId: string }) {
  const { lang } = useLang();
  const te = lang === "te";
  const [d, setD] = useState<Row | null>(null);
  useEffect(() => {
    void (async () => {
      const { ok, data } = await apiGet<Row>(`/api/unlocks/${encodeURIComponent(myId)}`);
      if (ok && data) setD(data);
    })();
  }, [myId]);
  const items: Row[] = d?.profiles || [];
  return (
    <section className="rounded-3xl border border-rose-200 bg-white p-5">
      <p className="text-sm font-bold text-[#7A0C2E]">
        {te ? `📋 మీరు unlock చేసిన numbers (${d?.count ?? 0}) • Balance: ${d?.credits ?? 0} credits` : `📋 Numbers you unlocked (${d?.count ?? 0}) • Balance: ${d?.credits ?? 0} credits`}
      </p>
      <div className="mt-3 space-y-2">
        {items.map((p: Row) => (
          <div key={p.tsap_id} className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 p-3 text-[13px]">
            <div className="min-w-[140px] flex-1">
              <p className="font-bold">{p.name_masked} • {p.age}y</p>
              <p className="font-mono text-[11px] text-slate-500">{p.tsap_id}</p>
              <p className="text-[11px] text-slate-500">{p.caste} • {p.district}</p>
            </div>
            <div className="text-right">
              <p className="font-mono font-bold">{p.phone_masked}</p>
              <p className="text-[10px] text-slate-400">{String(p.unlocked_at || "").slice(0, 10)} • {p.via}</p>
            </div>
            <Link href={`/search/${p.tsap_id}`} className="rounded-xl bg-[#7A0C2E] px-3 py-1.5 text-[12px] font-bold text-white">
              {te ? "చూడు" : "View"}
            </Link>
          </div>
        ))}
        {!items.length && <p className="text-[13px] text-slate-500">{te ? "ఇంకా unlock చెయ్యలేదు — interest accept అయితే numbers ఇక్కడ కనిపిస్తాయి." : "No unlocks yet — accepted interests show numbers here."}</p>}
      </div>
    </section>
  );
}

/* ---------------- ⚡ BOOST ---------------- */
function BoostPanel({ myId }: { myId: string }) {
  const { lang } = useLang();
  const te = lang === "te";
  const [packs, setPacks] = useState<Row[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState("");
  const [active, setActive] = useState("");
  useEffect(() => {
    void (async () => {
      const { ok, data } = await apiGet<Row>("/api/boost/packs");
      if (ok && data) setPacks(data.packs || []);
    })();
  }, []);
  const buy = async (code: string) => {
    setBusy(code);
    const { ok, data, errorTelugu } = await apiPost<Row>("/api/boost/buy", { tsap_id: myId, pack: code });
    setBusy("");
    if (ok && data?.success) {
      if (data.boost_until) setActive(String(data.boost_until));
      const o = data.order || {};
      setMsg({
        ok: true,
        text: o.status === "paid"
          ? String(data.message_telugu || "Boost active")
          : `${te ? "Order" : "Order"} ${o.order_id} — ${o.next_step_telugu || ""} (UTR /pricing లో ఇవ్వండి)`,
      });
    } else setMsg({ ok: false, text: String(data?.message_telugu || errorTelugu) });
  };
  return (
    <section className="rounded-3xl border border-amber-300 bg-gradient-to-b from-amber-50 to-white p-5">
      <p className="text-sm font-bold text-[#7A0C2E]">{te ? "⚡ Boost — matches + postings లో మీ profile TOP లో" : "⚡ Boost — your profile on TOP in matches + postings"}</p>
      {active && <p className="mt-1 text-[12px] font-bold text-emerald-700">✅ Active till {active.slice(0, 16).replace("T", " ")}</p>}
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {packs.map((p: Row) => (
          <div key={p.code} className="rounded-2xl border border-amber-300 bg-white p-3 text-center">
            <p className="text-[13px] font-bold">{p.label}</p>
            <p className="mt-1 text-xl font-extrabold text-[#7A0C2E]">₹{p.price}</p>
            <p className="text-[11px] text-slate-500">{p.days} {te ? "రోజులు" : "days"}</p>
            <button onClick={() => void buy(p.code)} disabled={busy === p.code}
              className="mt-2 w-full rounded-xl bg-[#7A0C2E] px-3 py-2 text-[12px] font-bold text-white disabled:opacity-50">
              {busy === p.code ? "…" : te ? "తీసుకో" : "Take"}
            </button>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-slate-500">{te ? "💳 Payment తర్వాత boost automatic ON (UPI: 9394483300@ybl) — UTR ని /pricing లో ఇవ్వండి." : "💳 Boost auto-ON after payment (UPI: 9394483300@ybl) — give UTR in /pricing."}</p>
      <Msg m={msg} />
    </section>
  );
}

/* ---------------- 🎙️ VOICE ---------------- */
function VoicePanel({ myId }: { myId: string }) {
  const { lang } = useLang();
  const te = lang === "te";
  const [v, setV] = useState<Row | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const load = useCallback(async () => {
    const { ok, data } = await apiGet<Row>(`/api/voice/${encodeURIComponent(myId)}`);
    if (ok && data) setV(data);
  }, [myId]);
  useEffect(() => { void load(); }, [load]);
  const upload = async () => {
    const f = fileRef.current?.files?.[0];
    if (!f) { setMsg({ ok: false, text: te ? "ముందు audio file select చెయ్యండి (30 sec, MP3/WAV)" : "Select an audio file first (30 sec, MP3/WAV)" }); return; }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", f);
      fd.append("tsap_id", myId);
      const d = await fetch("/api/voice/upload", { method: "POST", headers: authHeaders(), body: fd }).then((r) => r.json());
      setMsg(d.success ? { ok: true, text: String(d.message_telugu || "Uploaded") } : { ok: false, text: String((d.detail && (d.detail.te || d.detail.message_telugu || d.detail.en || d.detail.reason)) || d.error_telugu || "Upload fail") });
      if (d.success) void load();
    } catch { setMsg({ ok: false, text: te ? "Network problem" : "Network problem" }); }
    setBusy(false);
  };
  return (
    <section className="rounded-3xl border border-rose-200 bg-white p-5">
      <p className="text-sm font-bold text-[#7A0C2E]">{te ? "🎙️ Voice intro (30 sec) — voice ఉన్న profiles కి 3x response" : "🎙️ Voice intro (30 sec) — 3x response for voice profiles"}</p>
      {v?.has_voice ? (
        <div className="mt-3 rounded-2xl bg-slate-50 p-3">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <audio controls src={v.voice_url} className="w-full" />
          <p className="mt-1 text-[11px] text-slate-500">{te ? "పైన మీ voice — matches లో ఇదే వినిపిస్తుంది" : "Your voice above — matches hear this"}</p>
        </div>
      ) : (
        <p className="mt-2 text-[13px] text-slate-500">{te ? "ఇంకా voice లేదు — phone recorder లో 30 sec record చేసి upload చెయ్యండి." : "No voice yet — record 30 sec on phone recorder and upload."}</p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <input ref={fileRef} type="file" accept="audio/*" className="text-[12px]" aria-label="Voice file" />
        <button onClick={() => void upload()} disabled={busy}
          className="rounded-xl bg-[#7A0C2E] px-4 py-2 text-[12px] font-bold text-white disabled:opacity-50">
          {busy ? "…" : te ? "⬆️ Upload" : "⬆️ Upload"}
        </button>
      </div>
      <Msg m={msg} />
    </section>
  );
}

/* ---------------- 🪐 JATHAKAM + DOSHA ---------------- */
function JathakamPanel({ myId }: { myId: string }) {
  const { lang } = useLang();
  const te = lang === "te";
  const [dosha, setDosha] = useState<Row | null>(null);
  const [chart, setChart] = useState<Row | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    void (async () => {
      const a = await apiGet<Row>(`/api/astro/dosha/${encodeURIComponent(myId)}`);
      if (a.ok && a.data) setDosha(a.data);
      const c = await apiGet<Row>(`/api/astro/chart/${encodeURIComponent(myId)}`);
      if (c.ok && c.data) setChart(c.data);
    })();
  }, [myId]);
  const upload = async () => {
    const f = fileRef.current?.files?.[0];
    if (!f) { setMsg({ ok: false, text: te ? "ముందు jathakam photo/PDF select చెయ్యండి" : "Select jathakam photo/PDF first" }); return; }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", f);
      fd.append("tsap_id", myId);
      const d = await fetch("/api/astro/jathakam/upload", { method: "POST", headers: authHeaders(), body: fd }).then((r) => r.json());
      setMsg(d.success ? { ok: true, text: String(d.message_telugu || "Uploaded") } : { ok: false, text: String((d.detail && (d.detail.te || d.detail.message_telugu || d.detail.en || d.detail.reason)) || d.error_telugu || "Upload fail") });
    } catch { setMsg({ ok: false, text: te ? "Network problem" : "Network problem" }); }
    setBusy(false);
  };
  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-rose-200 bg-white p-5">
        <p className="text-sm font-bold text-[#7A0C2E]">{te ? "🔍 Dosha screening — మీ profile కి" : "🔍 Dosha screening — for your profile"}</p>
        {dosha ? (
          <div className="mt-2 text-[13px]">
            <p className={`rounded-2xl border p-3 font-bold ${dosha.level === "clear" ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-amber-300 bg-amber-50 text-amber-900"}`}>
              {dosha.verdict_telugu}
            </p>
            {(dosha.flags || []).map((f: Row, i: number) => (
              <p key={i} className="mt-1 rounded-xl bg-slate-50 p-2 text-[12px]">{f.telugu}</p>
            ))}
            <p className="mt-2 text-[11px] text-slate-500">⭐ {dosha.star} • {dosha.rasi} • Kuja: {dosha.kuja}{dosha.jathakam_verified ? " • 🪐 Pandit verified" : ""}</p>
            <p className="mt-1 text-[11px] text-slate-500">{dosha.note_telugu}</p>
          </div>
        ) : <p className="mt-2 text-[13px] text-slate-500">⏳ …</p>}
      </section>
      <RasiChart houses={chart?.houses} moonHouse={chart?.moon_house} star={chart?.star} rasi={chart?.rasi} note={chart?.note_telugu} title={te ? "🗺️ మీ రాశి చార్ట్" : "🗺️ Your rasi chart"} />
      <section className="rounded-3xl border border-rose-200 bg-white p-5">
        <p className="text-sm font-bold text-[#7A0C2E]">{te ? "📜 జాతకం అప్‌లోడ్ చెయ్యండి (photo/PDF, max 8MB) — మా పండితులు check చేస్తారు" : "📜 Upload your jathakam (photo/PDF, max 8MB) — our pandits will review it"}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" className="text-[12px]" aria-label="Jathakam file" />
          <button onClick={() => void upload()} disabled={busy}
            className="rounded-xl bg-[#7A0C2E] px-4 py-2 text-[12px] font-bold text-white disabled:opacity-50">
            {busy ? "…" : te ? "⬆️ Upload" : "⬆️ Upload"}
          </button>
        </div>
        <Msg m={msg} />
      </section>
    </div>
  );
}

/* ---------------- 🔔 ALERTS (push) ---------------- */
function AlertsPanel({ myId }: { myId: string }) {
  const { lang } = useLang();
  const te = lang === "te";
  return (
    <section className="rounded-3xl border border-rose-200 bg-white p-5">
      <p className="text-sm font-bold text-[#7A0C2E]">{te ? "🔔 Match alerts — browser close చేసినా notification" : "🔔 Match alerts — notification even with browser closed"}</p>
      <div className="mt-3"><PushBell myId={myId} /></div>
    </section>
  );
}

/* ---------------- 📤 SHARE KIT ---------------- */
function SharePanel({ myId }: { myId: string }) {
  const { lang } = useLang();
  const te = lang === "te";
  const [k, setK] = useState<Row | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => {
    void (async () => {
      const { ok, data } = await apiGet<Row>(`/api/share/kit/${encodeURIComponent(myId)}`);
      if (ok && data) setK(data);
    })();
  }, [myId]);
  const copy = (t: string) => {
    try { navigator.clipboard?.writeText(t); setMsg({ ok: true, text: te ? "📋 Copy అయ్యింది" : "📋 Copied" }); }
    catch { setMsg({ ok: false, text: "Copy fail" }); }
  };
  if (!k) return <p className="text-[13px] text-slate-500">⏳ …</p>;
  return (
    <section className="rounded-3xl border border-rose-200 bg-white p-5">
      <p className="text-sm font-bold text-[#7A0C2E]">{te ? "📤 Share kit — WhatsApp status + groups లో reach పెంచండి" : "📤 Share kit — grow reach on WhatsApp status + groups"}</p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={k.card_image} alt="Profile card" className="mt-3 w-full rounded-2xl border" />
      <pre className="mt-3 whitespace-pre-wrap rounded-2xl bg-slate-50 p-3 text-[12px]">{k.caption}</pre>
      <div className="mt-3 flex flex-wrap gap-2">
        <button onClick={() => copy(String(k.caption || ""))} className="rounded-xl bg-[#7A0C2E] px-4 py-2 text-[12px] font-bold text-white">📋 {te ? "Caption copy" : "Copy caption"}</button>
        <a href={k.whatsapp_share} target="_blank" rel="noreferrer" className="rounded-xl bg-green-600 px-4 py-2 text-[12px] font-bold text-white">💬 WhatsApp</a>
        <a href={k.telegram_share} target="_blank" rel="noreferrer" className="rounded-xl bg-sky-600 px-4 py-2 text-[12px] font-bold text-white">✈️ Telegram</a>
      </div>
      <p className="mt-2 text-[11px] text-slate-500">⏰ {k.best_time_to_post}</p>
      <ul className="mt-1 space-y-0.5 text-[11px] text-slate-600">
        {(k.tips_telugu || []).map((t: string, i: number) => <li key={i}>💡 {t}</li>)}
      </ul>
      <Msg m={msg} />
    </section>
  );
}
