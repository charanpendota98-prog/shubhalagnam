"use client";

/**
 * /safety — TRUST & SAFETY CENTER (Telugu)
 * ========================================
 * 1. Safety tips (advance money scam, public meeting, video call verify)
 * 2. 🚩 Report form (fake profile / advance money / harassment / wrong photo / married / spam)
 * 3. 🚫 Block list manage
 * 4. ✅ Verification levels (phone → photo → ID) + next step
 * 5. Moderation queue preview (admin) — high severity mundu
 */
import { useCallback, useEffect, useState } from "react";
import AuthGate from "@/components/AuthGate";
import { Duo, duo } from "@/lib/duo";
import { useLang } from "@/lib/lang";
import { authHeaders } from "@/lib/api";
import Link from "next/link";

type Tip = { icon: string; title: string; telugu: string };
type Cat = { key: string; te: string; severity: string; desc: string };

export default function SafetyPage() {
  const { lang } = useLang();
  const te = lang === "te";
  const [tips, setTips] = useState<Tip[]>([]);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [cats, setCats] = useState<Cat[]>([]);
  const [levels, setLevels] = useState<{ level: string; telugu: string }[]>([]);
  const [report, setReport] = useState({ target_id: "", category: "fake_profile", detail: "" });
  const [myId, setMyId] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [verify, setVerify] = useState<any>(null);
  const [queue, setQueue] = useState<any>(null);

  const load = useCallback(async () => {
    try {
      const s = await fetch("/api/safety/tips").then((r) => r.json());
      setTips(s.tips || []); setCats(s.report_categories || []); setLevels(s.verify_levels || []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    load();
    const id = (localStorage.getItem("tsap_id") || "").toUpperCase();
    if (id) setMyId(id);
    const t = new URLSearchParams(window.location.search).get("target");
    if (t) setReport((r) => ({ ...r, target_id: t.toUpperCase() }));
  }, [load]);

  const loadMine = useCallback(async (id: string) => {
    if (!id) return;
    try {
      const [b, v, q] = await Promise.all([
        fetch(`/api/blocks/${id}`, { headers: authHeaders() }).then((r) => { if (r.status === 401) setNeedsLogin(true); return r.json(); }),
        fetch(`/api/verification/${id}`, { headers: authHeaders() }).then((r) => r.json()),
        fetch("/api/moderation/queue", { headers: authHeaders(true) }).then((r) => r.json()),
      ]);
      setBlocks(b.items || []); setVerify(v.level ? v : null); setQueue(q);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { if (myId) loadMine(myId); }, [myId, loadMine]);

  const submitReport = async () => {
    if (!report.target_id.trim()) { setMsg({ ok: false, text: te ? "ఎవరిని report చెయ్యాలి — Profile ID ఇవ్వండి" : "Whom to report — enter Profile ID" }); return; }
    setBusy(true);
    try {
      const d = await fetch("/api/report", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...report, reporter_id: myId || "anonymous" }),
      }).then((r) => r.json());
      if (d.success) {
        setMsg({ ok: true, text: (d.auto_hidden ? "🚨 Auto-flag: profile hide chesam review ki. " : "") + (d.ack_telugu || "Report andinai") });
        setReport({ target_id: "", category: "fake_profile", detail: "" });
        loadMine(myId);
      } else {
        setMsg({ ok: false, text: d.detail || (te ? "Report పంపలేదు" : "Report not sent") });
      }
    } catch { setMsg({ ok: false, text: te ? "Network problem — మళ్లీ try చెయ్యండి" : "Network problem — retry" }); }
    setBusy(false);
  };

  const doBlock = async (blocked: string) => {
    const d = await fetch("/api/block", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ owner: myId, blocked, reason: "safety" }),
    }).then((r) => r.json());
    setMsg({ ok: !!d.success, text: d.message_telugu || d.detail || "" });
    loadMine(myId);
  };

  const doUnblock = async (blocked: string) => {
    const d = await fetch("/api/unblock", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ owner: myId, blocked }),
    }).then((r) => r.json());
    setMsg({ ok: !!d.success, text: d.message_telugu || "" });
    loadMine(myId);
  };

  const requestVerify = async (kind: string) => {
    const d = await fetch("/api/verify/request", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tsap_id: myId, kind }),
    }).then((r) => r.json());
    setMsg({ ok: !!d.success, text: d.message_telugu || d.detail || "" });
    loadMine(myId);
  };

  const sev = (s: string) => s === "high" ? "bg-rose-100 text-rose-800 border-rose-300"
    : s === "medium" ? "bg-amber-100 text-amber-800 border-amber-300" : "bg-gray-100 text-gray-700 border-gray-300";

  return (
    <main className="min-h-screen bg-cream pb-36">
      <section className="maroon-gradient text-white">
        <div className="max-w-5xl mx-auto px-4 py-9">
          <div className="text-[11px] font-bold bg-white/10 border border-white/20 rounded-full px-3 py-1 inline-block">
            🛡️ Trust & Safety • మన వివాహ
          </div>
          <h1 className="mt-3 text-2xl md:text-4xl font-bold"><Duo en="Your safety is our responsibility" te="మీ భద్రత మా బాధ్యత" /></h1>
          <p className="mt-2 text-[13px] md:text-sm opacity-90 telugu max-w-3xl">
{te ? <>Matrimony లో అందరూ మంచి వాళ్లు కారు — కాబట్టి మనం ముందు జాగ్రత్త. Report/block 2 clicks లో,
            verification badge తో నిజమైన profiles మాత్రమే ముందు కనిపిస్తాయి. 🚫 Chatting లేదు — spam కి చోటు లేదు.</> : <>Not everyone in matrimony is genuine — so we stay careful first. Report/block in 2 clicks,
            verified-badge profiles show first. 🚫 No chatting — no room for spam.</>}
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-[12px]">
            <span className="bg-white/10 border border-white/20 rounded-full px-3 py-1.5">🔒 Reports anonymous</span>
            <span className="bg-white/10 border border-white/20 rounded-full px-3 py-1.5">{te ? "⏱️ 24h లో action" : "⏱️ Action in 24h"}</span>
            <span className="bg-white/10 border border-white/20 rounded-full px-3 py-1.5">🚫 3 reports → auto-hide</span>
            <Link href="/register" className="gold-gradient text-maroon font-bold rounded-full px-3 py-1.5">FREE register</Link>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
        {msg && (
          <div className={`rounded-2xl px-4 py-3 text-[13px] border whitespace-pre-line ${msg.ok ? "bg-emerald-50 border-emerald-200 text-emerald-900" : "bg-rose-50 border-rose-200 text-rose-900"}`}>
            {msg.text}
          </div>
        )}

        {/* ---- tips ---- */}
        <div className="bg-white rounded-[1.5rem] border border-gold/25 p-5">
          <div className="font-bold text-maroon text-[16px]">{te ? "💡 Safety tips (Telugu లో చదవండి — 2 నిమిషాలు)" : "💡 Safety tips (read in Telugu — 2 minutes)"}</div>
          <div className="mt-3 grid md:grid-cols-2 gap-3">
            {tips.map((t) => (
              <div key={t.title} className="bg-cream rounded-2xl p-3 border border-gold/25">
                <div className="font-bold text-[13px] text-ink">{t.icon} {t.title}</div>
                <div className="text-[12px] text-gray-700 mt-1 telugu">{t.telugu}</div>
              </div>
            ))}
            {!tips.length && <div className="text-[12px] text-gray-500">{te ? "Load అవుతుంది…" : "Loading…"}</div>}
          </div>
        </div>

        {/* ---- report form ---- */}
        <div className="bg-white rounded-[1.5rem] border border-rose-200 p-5">
          <div className="font-bold text-rose-800 text-[16px]">{te ? "🚩 Report చెయ్యండి (100% anonymous)" : "🚩 Report (100% anonymous)"}</div>
          <div className="text-[12px] text-gray-600 mt-1">
            {te ? "Fake profile / advance money / harassment / photo misuse — ఏదైనా report చెయ్యండి. మన team 24h లో చూసి action తీసుకుంటుంది." : "Fake profile / advance money / harassment / photo misuse — report anything. Our team reviews in 24h and acts."}
          </div>
          <div className="mt-4 grid md:grid-cols-3 gap-3">
            <div className="md:col-span-1">
              <label className="text-[12px] font-bold">{te ? "ఎవరిని report? (Profile ID)" : "Whom to report? (Profile ID)"}</label>
              <input value={report.target_id} onChange={(e) => setReport({ ...report, target_id: e.target.value.toUpperCase() })}
                placeholder="RED001" className="input-mobile font-mono" aria-label="KAM001" />
            </div>
            <div className="md:col-span-1">
              <label className="text-[12px] font-bold">{te ? "మీ Profile ID (optional)" : "Your Profile ID (optional)"}</label>
              <input value={myId} onChange={(e) => { setMyId(e.target.value.toUpperCase()); localStorage.setItem("tsap_id", e.target.value.toUpperCase()); }}
                placeholder="RED001" className="input-mobile font-mono" aria-label="RED001" />
            </div>
            <div className="md:col-span-1">
              <label className="text-[12px] font-bold">Category</label>
              <select value={report.category} onChange={(e) => setReport({ ...report, category: e.target.value })} className="input-mobile" aria-label="Select option">
                {cats.map((c) => <option key={c.key} value={c.key}>{c.te} — {c.desc.slice(0, 40)}</option>)}
              </select>
            </div>
          </div>
          <div className="mt-3">
            <label className="text-[12px] font-bold">{te ? "ఏం జరిగింది? (detail — screenshots proof గా పెట్టుకోండి)" : "What happened? (detail — keep screenshots as proof)"}</label>
            <textarea value={report.detail} onChange={(e) => setReport({ ...report, detail: e.target.value })}
              rows={3} placeholder={te ? "ఉదా: advance ₹5,000 అడిగారు, registration fee అని చెప్పారు…" : "E.g. asked ₹5,000 advance as registration fee…"} className="input-mobile telugu" aria-label={te ? "ఏం జరిగింది" : "What happened"} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={submitReport} disabled={busy}
              className="px-5 py-3 rounded-2xl bg-rose-700 text-white font-bold text-[13px] disabled:opacity-60">
              {busy ? (te ? "పంపిస్తున్నాం…" : "Sending…") : te ? "🚩 Report పంపు" : "🚩 Send report"}
            </button>
            <button onClick={() => doBlock(report.target_id)} disabled={!report.target_id || !myId}
              className="px-5 py-3 rounded-2xl border border-rose-300 text-rose-700 font-bold text-[13px] disabled:opacity-50">
              {te ? "🚫 Block చెయ్యి (వెంటనే)" : "🚫 Block now"}
            </button>
          </div>
          {cats.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {cats.map((c) => (
                <span key={c.key} className={`text-[10px] font-bold px-2 py-1 rounded-full border ${sev(c.severity)}`}>
                  {c.te} • {c.severity}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ---- verification + blocks ---- */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-white rounded-[1.5rem] border border-gold/25 p-5">
            <div className="font-bold text-maroon text-[15px]">{te ? "✅ మీ verification level" : "✅ Your verification level"}</div>
            {verify ? (
              <>
                <div className="mt-2 text-[13px] text-gray-700">
                  Level: <b>{verify.telugu}</b> • trust score <b>{verify.trust_score}/100</b>
                </div>
                <div className="mt-1 text-[12px] text-gray-600 telugu">Next step: {verify.next_step_telugu}</div>
                <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-2 gold-gradient" style={{ width: `${verify.trust_score}%` }} />
                </div>
              </>
            ) : <div className="text-[12px] text-gray-500 mt-2">{te ? "Profile ID ఇవ్వండి — verification level చూడటానికి" : "Enter Profile ID — to see verification level"}</div>}
            <div className="mt-3 flex flex-wrap gap-2">
              {levels.filter((l) => l.level !== "none").map((l) => (
                <button key={l.level} onClick={() => requestVerify(l.level)} disabled={!myId}
                  className="px-3 py-2 rounded-xl border border-gold/40 text-maroon font-bold text-[12px] disabled:opacity-50">
                  {l.telugu}
                </button>
              ))}
            </div>
            <div className="mt-2 text-[11px] text-gray-500">
              {te ? <>Photo/ID verify చేస్తే మీ profile <b>top లో</b> కనిపిస్తుంది + interest acceptance rate పెంచుతుంది.</> : <>Verifying photo/ID puts your profile <b>on top</b> + raises interest acceptance rate.</>}
            </div>
          </div>

          <div className="bg-white rounded-[1.5rem] border border-gold/25 p-5">
            <div className="font-bold text-maroon text-[15px]">{te ? <>🚫 మీ block list ({blocks.length})</> : <>🚫 Your block list ({blocks.length})</>}</div>
            {blocks.length === 0 && <div className="text-[12px] text-gray-500 mt-2">{te ? "ఎవరూ block చెయ్యలేదు 👍" : "Nobody blocked 👍"}</div>}
            <div className="mt-2 space-y-2">
              {blocks.map((b) => (
                <div key={b.blocked} className="flex items-center gap-2 bg-cream rounded-xl px-3 py-2">
                  <span className="font-mono text-[12px] flex-1">{b.blocked}</span>
                  <span className="text-[10px] text-gray-500">{String(b.at).slice(0, 10)}</span>
                  <button onClick={() => doUnblock(b.blocked)} className="text-[11px] font-bold text-maroon underline">unblock</button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ---- moderation queue (admin view only) ---- */}
        {queue && Array.isArray(queue.items) && (
          <div className="bg-white rounded-[1.5rem] border border-gold/25 p-5">
            <div className="flex items-center justify-between">
              <div className="font-bold text-maroon text-[15px]">{te ? <>👮 రిపోర్ట్‌ల నిర్వహణ — {queue.open} pending</> : <>👮 Report management — {queue.open} pending</>}</div>
              <div className="text-[11px] text-gray-500">{te ? <>high severity ముందు: {queue.items?.filter((i: any) => i.severity === "high").length || 0}</> : <>high severity first: {queue.items?.filter((i: any) => i.severity === "high").length || 0}</>}</div>
            </div>
            <div className="text-[11px] text-gray-600 mt-1 telugu">{queue.message_telugu}</div>
            <div className="mt-3 space-y-2">
              {(queue.items || []).slice(0, 8).map((it: any) => (
                <div key={it.report_id} className="bg-cream rounded-2xl p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${sev(it.severity)}`}>{it.severity}</span>
                    <span className="font-mono text-[11px]">{it.report_id}</span>
                    <span className="text-[12px] font-bold">{it.category_telugu}</span>
                    <span className="text-[11px] text-gray-600">target: {it.target_id} ({it.reports_on_target} reports)</span>
                    <span className="ml-auto text-[11px] text-maroon font-bold">suggested: {it.suggested_action}</span>
                  </div>
                  {it.detail && <div className="text-[11px] text-gray-700 mt-1 telugu">{it.detail}</div>}
                </div>
              ))}
              {!(queue.items || []).length && <div className="text-[12px] text-gray-500">{te ? "Reports ఏమీ లేవు 👍" : "No reports 👍"}</div>}
            </div>
          </div>
        )}

        <div className="text-[11px] text-gray-500 text-center">
{te ? <>Emergency / police case అయితే వెంటనే 100 కి call చెయ్యండి • మన support: మన WhatsApp (profile లో) •
          🚫 Chatting లేదు — అందుకే మనం middle లో ఉండం, direct మీరు మాట్లాడుకోవచ్చు (consent తో).</> : <>In emergency / police case call 100 immediately • Our support: our WhatsApp (in profile) •
          🚫 No chatting — so we stay out of the middle, you talk directly (with consent).</>}
        </div>
      </div>
    </main>
  );
}
