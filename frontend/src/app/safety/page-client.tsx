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
import { Duo } from "@/lib/duo";
import { useLang } from "@/lib/lang";
import { apiDisplayMessage, authHeaders, readApiJson } from "@/lib/api";
import Link from "next/link";
import { SITE_CONFIG } from "@/lib/site-config";

type Tip = { icon: string; title: string; title_en?: string; telugu: string; en?: string };
type Cat = { key: string; te: string; en?: string; severity: string; desc: string };

export default function SafetyPage() {
  const { lang } = useLang();
  const te = lang === "te";
  const [tips, setTips] = useState<Tip[]>([]);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [cats, setCats] = useState<Cat[]>([]);
  const [report, setReport] = useState({ target_id: "", category: "fake_profile", detail: "" });
  const [myId, setMyId] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [verify, setVerify] = useState<any>(null);
  const [queue, setQueue] = useState<any>(null);

  const load = useCallback(async () => {
    try {
      const s = await fetch("/api/safety/tips").then((r) => readApiJson(r));
      setTips(s.tips || []); setCats(s.report_categories || []);
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
        fetch(`/api/blocks/${id}`, { headers: authHeaders() }).then((r) => { if (r.status === 401) setNeedsLogin(true); return readApiJson(r); }),
        fetch(`/api/verification/${id}`, { headers: authHeaders() }).then((r) => readApiJson(r)),
        fetch("/api/moderation/queue", { headers: authHeaders(true) }).then((r) => readApiJson(r)),
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
      }).then((r) => readApiJson(r));
      if (d.success) {
        const hiddenNotice = d.auto_hidden
          ? te ? "🚨 సమీక్ష కోసం ప్రొఫైల్ తాత్కాలికంగా దాచబడింది. " : "🚨 The profile was temporarily hidden for review. "
          : "";
        const acknowledgement = apiDisplayMessage(d, te, te
          ? "మీ report సమీక్ష కోసం నమోదు చేయబడింది; సమయం, ఫలితం మారవచ్చు."
          : "Your report was recorded for review; timing and outcomes may vary.");
        setMsg({ ok: true, text: `${hiddenNotice}${acknowledgement}` });
        setReport({ target_id: "", category: "fake_profile", detail: "" });
        loadMine(myId);
      } else {
        setMsg({ ok: false, text: apiDisplayMessage(d, te, te ? "Report పంపలేదు" : "The report could not be sent. Please try again.") });
      }
    } catch { setMsg({ ok: false, text: te ? "Network problem — మళ్లీ try చెయ్యండి" : "Network problem — retry" }); }
    setBusy(false);
  };

  const doBlock = async (blocked: string) => {
    const d = await fetch("/api/block", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ owner: myId, blocked, reason: "safety" }),
    }).then((r) => readApiJson(r));
    setMsg({
      ok: !!d.success,
      text: apiDisplayMessage(d, te, d.success ? (te ? "వినియోగదారుడు బ్లాక్ చేయబడ్డారు." : "Profile blocked.") : (te ? "బ్లాక్ చేయలేకపోయాం." : "Could not block this profile.")),
    });
    loadMine(myId);
  };

  const doUnblock = async (blocked: string) => {
    const d = await fetch("/api/unblock", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ owner: myId, blocked }),
    }).then((r) => readApiJson(r));
    setMsg({
      ok: !!d.success,
      text: apiDisplayMessage(d, te, d.success ? (te ? "బ్లాక్ తొలగించబడింది." : "Block removed.") : (te ? "అన్‌బ్లాక్ చేయలేకపోయాం." : "Could not unblock this profile.")),
    });
    loadMine(myId);
  };



  const sev = (s: string) => s === "high" ? "bg-rose-100 text-rose-800 border-rose-300"
    : s === "medium" ? "bg-amber-100 text-amber-800 border-amber-300" : "bg-gray-100 text-gray-700 border-gray-300";

  return (
    <div className="min-h-dvh bg-cream pb-36">
      <section className="maroon-gradient text-white">
        <div className="max-w-5xl mx-auto px-4 py-9">
          <div lang={te ? "te-IN" : "en-IN"} className="text-[11px] font-bold bg-white/10 border border-white/20 rounded-full px-3 py-1 inline-block">
            {te ? "🛡️ భద్రత • మన వివాహ" : "🛡️ Trust & Safety • Mana Vivaha"}
          </div>
          <h1 className="mt-3 text-2xl md:text-4xl font-bold"><Duo en="Safety tools for safer introductions" te="పరిచయాల కోసం భద్రతా సాధనాలు" /></h1>
          <p lang={te ? "te-IN" : "en-IN"} className={`mt-2 text-[13px] md:text-sm opacity-90 max-w-3xl ${te ? "telugu" : ""}`}>
{te ? <>ఆన్‌లైన్ పరిచయాల్లో జాగ్రత్తగా ఉండండి. Report/block tools ఉపయోగించండి; కనిపించే phone, photo, ID status ఏ check పూర్తయిందో చూపిస్తుంది — అన్ని profiles నిజమైనవని హామీ కాదు. 🚫 Chatting లేదు.</> : <>Stay careful with online introductions. Use report/block tools; displayed phone, photo and ID statuses show which checks are complete, not a guarantee that every profile is genuine. 🚫 No in-app chat.</>}
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-[12px]">
            <span className="bg-white/10 border border-white/20 rounded-full px-3 py-1.5">{te ? "🔒 Report చేసిన వారి వివరాలు profile owner‌కు చూపించము" : "🔒 Reporter identity is not shown to the reported member"}</span>
            <span className="bg-white/10 border border-white/20 rounded-full px-3 py-1.5">{te ? "⏱️ Report review సమయం మారవచ్చు" : "⏱️ Report review time may vary"}</span>
            <span className="bg-white/10 border border-white/20 rounded-full px-3 py-1.5">{te ? "🚫 కొన్ని తీవ్రమైన/పునరావృత reports తాత్కాలిక hide‌కు దారితీయవచ్చు" : "🚫 Some high-severity or repeated reports may temporarily hide a profile"}</span>
            <Link href="/register" className="gold-gradient text-maroon font-bold rounded-full px-3 py-1.5">FREE register</Link>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
        {msg && (
          <div className={`rounded-2xl px-4 py-3 text-[13px] border whitespace-pre-line ${msg.ok ? "bg-emerald-50 border-emerald-200 text-emerald-900" : "bg-rose-50 border-rose-200 text-rose-900"}`} role={msg.ok ? "status" : "alert"}>
            {msg.text}
          </div>
        )}
        {needsLogin && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-900" role="status">
            {te ? "బ్లాక్ జాబితా మరియు తనిఖీ స్థితిని చూడటానికి సైన్ ఇన్ చేయండి." : "Sign in to view your block list and verification status."}{" "}
            <Link href="/login" className="font-bold underline">{te ? "సైన్ ఇన్" : "Sign in"}</Link>
          </div>
        )}

        {/* ---- tips ---- */}
        <div className="bg-white rounded-[1.5rem] border border-gold/25 p-5">
          <div className="font-bold text-maroon text-[16px]">{te ? "💡 భద్రతా సూచనలు" : "💡 Safety guidance"}</div>
          <div className="mt-3 grid md:grid-cols-2 gap-3">
            {tips.map((t) => (
              <div key={t.title_en || t.title} className="bg-cream rounded-2xl p-3 border border-gold/25">
                <div className={`font-bold text-[13px] text-ink ${te ? "telugu" : ""}`} lang={te ? "te-IN" : "en-IN"}>
                  {t.icon} {te ? t.title : t.title_en || "Safety tip"}
                </div>
                <div className={`text-[12px] text-gray-700 mt-1 ${te ? "telugu" : ""}`} lang={te ? "te-IN" : "en-IN"}>
                  {te ? t.telugu : t.en || "An English version of this tip is not available yet."}
                </div>
              </div>
            ))}
            {!tips.length && <div className="text-[12px] text-gray-500">{te ? "Load అవుతుంది…" : "Loading…"}</div>}
          </div>
        </div>

        {/* ---- report form ---- */}
        <div className="bg-white rounded-[1.5rem] border border-rose-200 p-5">
          <div className="font-bold text-rose-800 text-[16px]">{te ? "🚩 ప్రైవేట్‌గా report చేయండి" : "🚩 Submit a private report"}</div>
          <div className="text-[12px] text-gray-600 mt-1">
            {te ? "Fake profile / advance money / harassment / photo misuse — ఏదైనా report చేయండి. మన team పరిశీలించి తగిన చర్య తీసుకుంటుంది." : "Report fake profiles, advance-money demands, harassment or photo misuse. Our team reviews reports and takes appropriate action."}
          </div>
          <div className="mt-4 grid md:grid-cols-3 gap-3">
            <div className="md:col-span-1">
              <label className="text-[12px] font-bold">{te ? "ఎవరిని report? (Profile ID)" : "Whom to report? (Profile ID)"}</label>
              <input value={report.target_id} onChange={(e) => setReport({ ...report, target_id: e.target.value.toUpperCase() })}
                placeholder="Profile ID" className="input-mobile font-mono" aria-label={te ? "Profile ID" : "Profile ID"} />
            </div>
            <div className="md:col-span-1">
              <label className="text-[12px] font-bold">{te ? "మీ Profile ID (optional)" : "Your Profile ID (optional)"}</label>
              <input value={myId} onChange={(e) => { setMyId(e.target.value.toUpperCase()); localStorage.setItem("tsap_id", e.target.value.toUpperCase()); }}
                placeholder="Profile ID (optional)" className="input-mobile font-mono" aria-label={te ? "మీ Profile ID (ఐచ్ఛికం)" : "Your Profile ID (optional)"} />
            </div>
            <div className="md:col-span-1">
              <label className="text-[12px] font-bold">{te ? "వర్గం" : "Category"}</label>
              <select value={report.category} onChange={(e) => setReport({ ...report, category: e.target.value })} className="input-mobile" aria-label={te ? "వర్గం ఎంచుకోండి" : "Select category"}>
                {cats.map((c) => <option key={c.key} value={c.key}>{te ? c.te : apiDisplayMessage({ message_en: c.en }, false, "Other")}</option>)}
              </select>
            </div>
          </div>
          <div className="mt-3">
            <label className="text-[12px] font-bold">{te ? "ఏం జరిగింది? (detail — screenshots proof గా పెట్టుకోండి)" : "What happened? (detail — keep screenshots as proof)"}</label>
            <textarea value={report.detail} onChange={(e) => setReport({ ...report, detail: e.target.value })}
              rows={3} placeholder={te ? "ఏం జరిగింది? వివరించండి." : "Describe what happened."} className={`input-mobile ${te ? "telugu" : ""}`} aria-label={te ? "ఏం జరిగింది" : "What happened"} />
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
                  {te ? c.te : c.en || "Other"} • {c.severity}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ---- verification + blocks ---- */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-white rounded-[1.5rem] border border-gold/25 p-5">
            <div className="font-bold text-maroon text-[15px]">{te ? "✅ నమోదు చేసిన తనిఖీ స్థితి" : "✅ Recorded check status"}</div>
            {verify ? (
              <>
                <div className="mt-2 rounded-xl bg-slate-50 p-3 text-[13px] text-gray-700">
                  <div className={te ? "telugu" : ""} lang={te ? "te-IN" : "en-IN"}>
                    <b>{te ? "పూర్తయిన check:" : "Completed check:"}</b> {te ? verify.telugu : verify.english || "Recorded check status unavailable."}
                  </div>
                  <div className={`mt-1 text-[12px] text-gray-600 ${te ? "telugu" : ""}`} lang={te ? "te-IN" : "en-IN"}>
                    {te ? "తదుపరి దశ:" : "Next step:"} {te ? verify.next_step_telugu : verify.next_step_en || "No further step is available."}
                  </div>
                  <p className="mt-2 text-[11px] text-slate-500">{te ? "ఈ status అదే check‌ను మాత్రమే సూచిస్తుంది; మొత్తం profile లేదా వ్యక్తి గుర్తింపుకు హామీ కాదు." : "This status describes only the named check; it does not verify the whole profile or a person's identity."}</p>
                </div>
              </>
            ) : <div className="text-[12px] text-gray-500 mt-2">{te ? "Profile ID ఇవ్వండి — verification level చూడటానికి" : "Enter Profile ID — to see verification level"}</div>}
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href="/login" className="px-3 py-2 rounded-xl border border-gold/40 text-maroon font-bold text-[12px]">
                {te ? "📱 OTP తో ఫోన్ ధృవీకరించండి" : "📱 Verify phone with OTP"}
              </Link>
              <Link href="/verify" className="px-3 py-2 rounded-xl border border-gold/40 text-maroon font-bold text-[12px]">
                {te ? "📸 ఫోటో/సెల్ఫీ review కోసం upload" : "📸 Upload photo/selfie for review"}
              </Link>
              <span className="px-3 py-2 rounded-xl bg-slate-50 text-slate-600 text-[12px]">
                {te ? "ID badges మాన్యువల్ సమీక్ష తర్వాత మాత్రమే" : "ID badges require manual staff review"}
              </span>
            </div>
            <div className="mt-2 text-[11px] text-gray-500">
              {te ? "ధృవీకరణ స్థితి మాత్రమే చూపుతుంది; match ranking లేదా acceptance కు హామీ కాదు." : "Verification status is informational; it does not guarantee ranking or acceptance."}
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
            <div className={`text-[11px] text-gray-600 mt-1 ${te ? "telugu" : ""}`} lang={te ? "te-IN" : "en-IN"}>
              {apiDisplayMessage(queue, te, te ? "తీవ్రత ఎక్కువగా ఉన్న reports ను ముందుగా పరిశీలించండి." : "Review high-severity reports first.")}
            </div>
            <div className="mt-3 space-y-2">
              {(queue.items || []).slice(0, 8).map((it: any) => (
                <div key={it.report_id} className="bg-cream rounded-2xl p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${sev(it.severity)}`}>{it.severity}</span>
                    <span className="font-mono text-[11px]">{it.report_id}</span>
                    <span className="text-[12px] font-bold">{te ? it.category_telugu : it.category_en || "Other"}</span>
                    <span className="text-[11px] text-gray-600">target: {it.target_id} ({it.reports_on_target} reports)</span>
                    <span className="ml-auto text-[11px] text-maroon font-bold">suggested: {it.suggested_action}</span>
                  </div>
                  {it.detail && (
                    <div className={`text-[11px] text-gray-700 mt-1 ${te ? "telugu" : ""}`} lang={te ? "te-IN" : "en-IN"}>
                      {te ? it.detail : apiDisplayMessage({ message_en: it.detail }, false, "Report details were submitted in another language. Switch to Telugu to review the original text.")}
                    </div>
                  )}
                </div>
              ))}
              {!(queue.items || []).length && <div className="text-[12px] text-gray-500">{te ? "Reports ఏమీ లేవు 👍" : "No reports 👍"}</div>}
            </div>
          </div>
        )}

        <div className="text-[11px] text-gray-600 text-center leading-relaxed">
          {te ? <>తక్షణ ప్రమాదంలో భారత అత్యవసర సేవలకు <b>112</b> కు కాల్ చేయండి. {SITE_CONFIG.supportLink ? <>ఈ deployment‌లో configured <a href={SITE_CONFIG.supportLink} target="_blank" rel="noopener noreferrer" className="font-bold text-emerald-700 underline">WhatsApp support contact</a> కూడా అందుబాటులో ఉంది; బాహ్య సేవ availability హామీ కాదు.</> : <>ఈ deployment‌లో WhatsApp support number configure కాలేదు కాబట్టి ఆ CTA దాచబడింది.</>} Report‌లను పరిశీలిస్తాం; చర్య సమయం మారవచ్చు. Consent లేకుండా contact details పంచుకోము.</>
            : <>For immediate danger in India, call emergency services at <b>112</b>. {SITE_CONFIG.supportLink ? <>This deployment has a configured <a href={SITE_CONFIG.supportLink} target="_blank" rel="noopener noreferrer" className="font-bold text-emerald-700 underline">WhatsApp support contact</a>; external availability is not guaranteed.</> : <>WhatsApp support is not configured for this deployment, so no support number is shown.</>} Reports are reviewed; response/action time may vary. Contact details are not shared without consent.</>}
        </div>
      </div>
    </div>
  );
}
