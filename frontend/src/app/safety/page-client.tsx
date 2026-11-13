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
  const [badges, setBadges] = useState<any[]>([]);
  const [appeals, setAppeals] = useState<any[]>([]);
  const [appealReason, setAppealReason] = useState("");

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
      const [b, v, bg, ap]: any[] = await Promise.all([
        fetch(`/api/blocks/${encodeURIComponent(id)}`, { headers: authHeaders(), credentials: "same-origin" }).then((r) => {
          if (r.status === 401) setNeedsLogin(true);
          return r.ok ? r.json() : {};
        }),
        fetch(`/api/verification/${encodeURIComponent(id)}`, { headers: authHeaders(), credentials: "same-origin" }).then((r) => r.ok ? r.json() : {}),
        fetch(`/api/verification/${encodeURIComponent(id)}/badges`, { headers: authHeaders(), credentials: "same-origin" }).then((r) => r.ok ? r.json() : {}),
        fetch(`/api/safety/appeals/${encodeURIComponent(id)}`, { headers: authHeaders(), credentials: "same-origin" }).then((r) => r.ok ? r.json() : {}),
      ]);
      setBlocks(b.items || []);
      setVerify(v.level ? v : null);
      setBadges(bg.badges || []);
      setAppeals(ap.appeals || ap.items || []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { if (myId) loadMine(myId); }, [myId, loadMine]);

  const submitReport = async () => {
    if (!myId) {
      setNeedsLogin(true);
      setMsg({ ok: false, text: te ? "Report పంపడానికి ముందు మీ ఖాతాలో లాగిన్ అవ్వండి." : "Please sign in to your account before submitting a report." });
      return;
    }
    if (!report.target_id.trim()) { setMsg({ ok: false, text: te ? "ఎవరిని report చెయ్యాలి — Profile ID ఇవ్వండి" : "Whom to report — enter Profile ID" }); return; }
    setBusy(true);
    try {
      const r = await fetch("/api/report", {
        method: "POST",
        headers: authHeaders(),
        credentials: "same-origin",
        body: JSON.stringify({ ...report, reporter_id: myId }),
      });
      if (r.status === 401) { setNeedsLogin(true); setBusy(false); return; }
      const d = await r.json();
      if (d.success) {
        setMsg({ ok: true, text: (d.auto_hidden ? "🚨 Multi-reporter safety hold triggered for review. " : "") + (d.ack_telugu || "Report recorded for review.") });
        setReport({ target_id: "", category: "fake_profile", detail: "" });
        loadMine(myId);
      } else {
        setMsg({ ok: false, text: d.detail || (te ? "Report పంపలేదు" : "Report not sent") });
      }
    } catch { setMsg({ ok: false, text: te ? "Network problem — మళ్లీ try చెయ్యండి" : "Network problem — retry" }); }
    setBusy(false);
  };

  const doBlock = async (blocked: string) => {
    if (!myId) { setNeedsLogin(true); return; }
    const r = await fetch("/api/block", {
      method: "POST",
      headers: authHeaders(),
      credentials: "same-origin",
      body: JSON.stringify({ owner: myId, blocked, reason: "safety" }),
    });
    if (r.status === 401) { setNeedsLogin(true); return; }
    const d = await r.json();
    setMsg({ ok: !!d.success, text: d.message_telugu || d.detail || "" });
    loadMine(myId);
  };

  const doUnblock = async (blocked: string) => {
    if (!myId) { setNeedsLogin(true); return; }
    const r = await fetch("/api/unblock", {
      method: "POST",
      headers: authHeaders(),
      credentials: "same-origin",
      body: JSON.stringify({ owner: myId, blocked }),
    });
    if (r.status === 401) { setNeedsLogin(true); return; }
    const d = await r.json();
    setMsg({ ok: !!d.success, text: d.message_telugu || "" });
    loadMine(myId);
  };

  const requestVerify = async (kind: string) => {
    if (!myId) { setNeedsLogin(true); return; }
    const r = await fetch("/api/verify/request", {
      method: "POST",
      headers: authHeaders(),
      credentials: "same-origin",
      body: JSON.stringify({ tsap_id: myId, kind }),
    });
    if (r.status === 401) { setNeedsLogin(true); return; }
    const d = await r.json();
    setMsg({ ok: !!d.success, text: d.message_telugu || d.detail || "" });
    loadMine(myId);
  };

  const submitAppeal = async () => {
    if (!myId) { setNeedsLogin(true); return; }
    if (appealReason.trim().length < 10) {
      setMsg({ ok: false, text: te ? "కనీసం 10 అక్షరాలలో వివరాలు రాయండి." : "Please describe your appeal in at least 10 characters." });
      return;
    }
    setBusy(true);
    try {
      const r = await fetch("/api/safety/appeal", {
        method: "POST",
        headers: authHeaders(),
        credentials: "same-origin",
        body: JSON.stringify({ tsap_id: myId, reason: appealReason }),
      });
      if (r.status === 401) { setNeedsLogin(true); setBusy(false); return; }
      const d = await r.json();
      if (r.ok && d.success) {
        setAppealReason("");
        setMsg({ ok: true, text: te ? d.message_telugu : d.message_en });
        loadMine(myId);
      } else {
        setMsg({ ok: false, text: d.detail || "Appeal could not be submitted." });
      }
    } catch {
      setMsg({ ok: false, text: "Network problem — retry" });
    }
    setBusy(false);
  };

  const sev = (s: string) => s === "high" ? "bg-rose-100 text-rose-800 border-rose-300"
    : s === "medium" ? "bg-amber-100 text-amber-800 border-amber-300" : "bg-gray-100 text-gray-700 border-gray-300";

  return (
    <main className="min-h-dvh bg-cream pb-36">
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
            <span className="bg-white/10 border border-white/20 rounded-full px-3 py-1.5">🔒 Confidential reports</span>
            <span className="bg-white/10 border border-white/20 rounded-full px-3 py-1.5">{te ? "👮 మాన్యువల్ సమీక్ష" : "👮 Human moderation review"}</span>
            <span className="bg-white/10 border border-white/20 rounded-full px-3 py-1.5">{te ? "🛡️ Multi-reporter భద్రత" : "🛡️ Multi-reporter anti-abuse"}</span>
            <Link href="/verify" className="gold-gradient text-maroon font-bold rounded-full px-3 py-1.5">{te ? "ప్రొఫైల్ ధృవీకరణ →" : "Verify Profile →"}</Link>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
        {needsLogin && (
          <AuthGate note={te ? "Report, Block, మరియు Moderation Appeal కోసం లాగిన్ అవసరం." : "Sign in to report, block, or submit a moderation appeal."} />
        )}
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
            {te ? "Fake profile / advance money / harassment / photo misuse — మీ ఖాతాలో లాగిన్ అయి report చెయ్యండి. మా బృందం పరిశీలించి చర్య తీసుకుంటుంది." : "Fake profile / advance money / harassment / photo misuse — sign in to submit a confidential report for human moderation review."}
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
            <button type="button" onClick={submitReport} disabled={busy}
              className="px-5 py-3 rounded-2xl bg-rose-700 text-white font-bold text-[13px] disabled:opacity-60">
              {busy ? (te ? "పంపిస్తున్నాం…" : "Sending…") : te ? "🚩 Report పంపు" : "🚩 Send report"}
            </button>
            <button type="button" onClick={() => doBlock(report.target_id)} disabled={!report.target_id || !myId}
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
            <div className="font-bold text-maroon text-[15px]">{te ? "✅ మీ ధృవీకరణ బ్యాడ్జ్‌లు" : "✅ Your verification badges"}</div>
            {verify ? (
              <>
                <div className="mt-2 text-[13px] text-gray-700">
                  {te ? "ప్రస్తుత స్థితి:" : "Recorded status:"} <b>{te ? verify.telugu : (verify.english || verify.telugu)}</b>
                </div>
                <div className="mt-1 text-[12px] text-gray-600 telugu">
                  {te ? `తదుపరి అడుగు: ${verify.next_step_telugu}` : `Next step: ${verify.next_step_en || verify.next_step_telugu}`}
                </div>
                {badges.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {badges.map((b: any) => (
                      <span key={b.badge_type} className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-[11px] font-bold text-emerald-900">
                        ✓ {te ? b.label_te : b.label_en}
                      </span>
                    ))}
                  </div>
                )}
              </>
            ) : <div className="text-[12px] text-gray-500 mt-2">{te ? "మీ ఖాతాలో లాగిన్ అయితే నమోదైన ధృవీకరణ బ్యాడ్జ్‌లు ఇక్కడ కనిపిస్తాయి." : "Sign in to view recorded verification badges on your profile."}</div>}
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href="/verify" className="px-4 py-2 rounded-xl bg-maroon text-white font-bold text-[12px]">
                {te ? "🤳 సెల్ఫీ / విద్య / ఉద్యోగ ధృవీకరణ →" : "🤳 Submit Selfie / Education / Employment →"}
              </Link>
              {levels.filter((l) => l.level !== "none" && l.level !== "phone").map((l) => (
                <button key={l.level} type="button" onClick={() => requestVerify(l.level)} disabled={!myId}
                  className="px-3 py-2 rounded-xl border border-gold/40 text-maroon font-bold text-[12px] disabled:opacity-50">
                  {l.telugu}
                </button>
              ))}
            </div>
            <div className="mt-2 text-[11px] text-gray-500">
              {te ? "బ్యాడ్జ్‌లు సమర్పించిన ఆధారాల బృంద సమీక్షను మాత్రమే సూచిస్తాయి; ఇవి numeric trust score లేదా identity హామీ కావు." : "Badges reflect staff review of submitted evidence only; they are not a numeric trust score or identity guarantee."}
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
                  <button type="button" onClick={() => doUnblock(b.blocked)} className="text-[11px] font-bold text-maroon underline">unblock</button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ---- Member Moderation Appeal ---- */}
        <div className="bg-white rounded-[1.5rem] border border-gold/25 p-5">
          <div className="font-bold text-maroon text-[15px]">
            ⚖️ {te ? "మాడరేషన్ అప్పీల్ (ప్రొఫైల్ తాత్కాలికంగా దాచబడితే)" : "Moderation Appeal (if your profile was paused for review)"}
          </div>
          <p className="mt-1 text-[12px] text-gray-600">
            {te
              ? "మీ ప్రొఫైల్ పొరపాటున review కోసం దాచబడిందని భావిస్తే, ఇక్కడ వివరాలు పంపండి. మా బృందం మాన్యువల్‌గా పరిశీలిస్తుంది."
              : "If your profile was placed under review and you want a human moderator to re-check your account, submit an appeal below."}
          </p>
          <div className="mt-3 flex flex-col sm:flex-row gap-2">
            <input
              value={appealReason}
              onChange={(e) => setAppealReason(e.target.value)}
              placeholder={te ? "మీ అప్పీల్ వివరాలు రాయండి…" : "Explain why your profile should be reinstated…"}
              aria-label={te ? "మాడరేషన్ అప్పీల్ వివరణ" : "Moderation appeal reason"}
              className="input-mobile flex-1"
            />
            <button type="button" onClick={submitAppeal} disabled={busy || !myId}
              className="px-4 py-2.5 rounded-xl bg-maroon text-white font-bold text-[12px] disabled:opacity-50 shrink-0">
              {te ? "అప్పీల్ పంపండి" : "Submit Appeal"}
            </button>
          </div>
          {appeals.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {appeals.map((ap: any) => (
                <div key={ap.id} className="rounded-xl bg-cream px-3 py-2 text-[12px] flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono font-bold text-maroon">{ap.id}</span>
                  <span className="text-gray-700 flex-1">{ap.reason}</span>
                  <span className="rounded-full border border-gold/40 bg-white px-2.5 py-0.5 text-[11px] font-bold">
                    {ap.status}{ap.resolution ? ` • ${ap.resolution}` : ""}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="text-[11px] text-gray-500 text-center">
{te ? <>Emergency / police case అయితే వెంటనే 100 కి call చెయ్యండి • మన support: మన WhatsApp (profile లో) •
          🚫 Chatting లేదు — అందుకే మనం middle లో ఉండం, direct మీరు మాట్లాడుకోవచ్చు (consent తో).</> : <>In emergency / police case call 100 immediately • Our support: our WhatsApp (in profile) •
          🚫 No chatting — so we stay out of the middle, you talk directly (with consent).</>}
        </div>
      </div>
    </main>
  );
}
