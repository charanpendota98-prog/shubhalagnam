"use client";
import "@/components/trust-workspace.css";

/**
 * /safety — TRUST & SAFETY CENTER (Telugu)
 * ========================================
 * 1. Safety tips (advance money scam, public meeting, video call verify)
 * 2. 🚩 Report form (fake profile / advance money / harassment / wrong photo / married / spam)
 * 3. 🚫 Block list manage
 * 4. ✅ Verification levels (phone → photo → ID) + next step
 * 5. Moderation queue preview (admin) — high severity mundu
 */
import { useCallback, useEffect, useRef, useState } from "react";
import AuthGate from "@/components/AuthGate";
import { Duo, duo } from "@/lib/duo";
import { useLang } from "@/lib/lang";
import { authHeaders } from "@/lib/api";
import { useSession } from "@/lib/auth";
import Link from "@/components/LocaleLink";
import ScamGuide from "@/components/ScamGuide";
import { VerificationIcon, verificationLabel } from "@/components/VerificationIcon";
import { Flag, Ban, ShieldCheck, LockKeyhole, UserRoundCheck, Lightbulb, CircleCheck, Camera, Scale, ThumbsUp, Banknote, House, Smartphone, FileText } from "lucide-react";

const TIP_ICONS = { "💰": Banknote, "📸": Camera, "🏠": House, "📱": Smartphone, "📄": FileText, "🚫": Ban };
function TipIcon({ icon }: { icon: string }) {
  const Icon = TIP_ICONS[icon as keyof typeof TIP_ICONS] || ShieldCheck;
  return <Icon className="inline-block h-4 w-4 align-text-bottom mr-1" aria-hidden="true" focusable="false" />;
}

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
  const { tsapId, authenticated, ready: sessionReady } = useSession();
  const myId = authenticated ? tsapId : "";
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [blockBusy, setBlockBusy] = useState(false);
  const blockPending = useRef(false);
  const [blockList, setBlockList] = useState<{ owner: string; state: "loading" | "ready" | "error"; items: { blocked: string; at?: string }[] }>({ owner: "", state: "loading", items: [] });
  const blockReadSequence = useRef(0);
  const accountRef = useRef(myId);
  const blocks = blockList.owner === myId ? blockList.items : [];
  const blockReadState = blockList.owner === myId ? blockList.state : "loading";
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
    const t = new URLSearchParams(window.location.search).get("target");
    if (t) setReport((r) => ({ ...r, target_id: t.toUpperCase() }));
  }, [load]);

  const loadBlocks = useCallback(async (id: string) => {
    const sequence = ++blockReadSequence.current;
    setBlockList((previous) => ({ owner: id, state: "loading", items: previous.owner === id ? previous.items : [] }));
    const current = () => sequence === blockReadSequence.current && accountRef.current === id;
    try {
      const response = await fetch(`/api/blocks/${encodeURIComponent(id)}`, { headers: authHeaders(), credentials: "same-origin", cache: "no-store" });
      if (response.status === 401 && current()) setNeedsLogin(true);
      if (!response.ok) throw new Error("Block list unavailable");
      const data = await response.json();
      if (!data || !Array.isArray(data.items) || !data.items.every((item: unknown) => typeof item === "object" && item !== null && "blocked" in item && typeof item.blocked === "string" && item.blocked.trim().length > 0)) throw new Error("Invalid block list");
      if (current()) { setNeedsLogin(false); setBlockList({ owner: id, state: "ready", items: data.items }); }
    } catch {
      if (current()) setBlockList((previous) => ({ owner: id, state: "error", items: previous.owner === id ? previous.items : [] }));
    }
  }, []);

  const loadMine = useCallback(async (id: string) => {
    if (!id) return;
    const blockRequest = loadBlocks(id);
    try {
      const [v, bg, ap]: any[] = await Promise.all([
        fetch(`/api/verification/${encodeURIComponent(id)}`, { headers: authHeaders(), credentials: "same-origin" }).then((r) => r.ok ? r.json() : {}),
        fetch(`/api/verification/${encodeURIComponent(id)}/badges`, { headers: authHeaders(), credentials: "same-origin" }).then((r) => r.ok ? r.json() : {}),
        fetch(`/api/safety/appeals/${encodeURIComponent(id)}`, { headers: authHeaders(), credentials: "same-origin" }).then((r) => r.ok ? r.json() : {}),
      ]);
      if (accountRef.current !== id) return;
      setVerify(v.level ? v : null);
      setBadges(bg.badges || []);
      setAppeals(ap.appeals || ap.items || []);
    } catch { /* Other panels must not hide the independent block-list result. */ }
    finally { await blockRequest; }
  }, [loadBlocks]);

  useEffect(() => {
    accountRef.current = myId;
    if (myId) { setNeedsLogin(false); void loadMine(myId); }
    else { ++blockReadSequence.current; setBlockList({ owner: "", state: "loading", items: [] }); }
    return () => { accountRef.current = ""; ++blockReadSequence.current; };
  }, [myId, loadMine]);

  const submitReport = async () => {
    if (!sessionReady) return;
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

  const changeBlock = async (blocked: string, remove: boolean) => {
    if (!sessionReady) return;
    if (!myId) { setNeedsLogin(true); return; }
    if (blockPending.current) return;
    blockPending.current = true; setBlockBusy(true); setMsg(null);
    try {
      const r = await fetch(remove ? "/api/unblock" : "/api/block", {
        method: "POST", headers: authHeaders(), credentials: "same-origin",
        body: JSON.stringify({ owner: myId, blocked, ...(remove ? {} : { reason: "safety" }) }),
      });
      if (r.status === 401) { setNeedsLogin(true); return; }
      const d = await r.json();
      const ok = r.ok && d.success === true;
      const fallback = remove
        ? (te ? "Unblock మార్పు సేవ్ కాలేదు. మళ్లీ ప్రయత్నించండి." : "Could not save the unblock. Please retry.")
        : (te ? "Block మార్పు సేవ్ కాలేదు. మళ్లీ ప్రయత్నించండి." : "Could not save the block. Please retry.");
      setMsg({ ok, text: ok ? (d.message_telugu || (remove ? "Profile unblocked." : "Profile blocked.")) : (typeof d.detail === "string" ? d.detail : fallback) });
      if (ok) await loadMine(myId);
    } catch {
      setMsg({ ok: false, text: te ? "Block మార్పును నిర్ధారించలేకపోయాం. మళ్లీ ప్రయత్నించండి." : "Could not confirm the block change. Please retry." });
    } finally { blockPending.current = false; setBlockBusy(false); }
  };
  const doBlock = (blocked: string) => changeBlock(blocked, false);
  const doUnblock = (blocked: string) => changeBlock(blocked, true);

  const requestVerify = async (kind: string) => {
    if (!sessionReady) return;
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
    if (!sessionReady) return;
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
    <div className="mv-trust-workspace min-h-dvh bg-cream pb-36">
      <section className="maroon-gradient text-white">
        <div className="max-w-5xl mx-auto px-4 py-9">
          <div className="text-[11px] font-bold bg-white/10 border border-white/20 rounded-full px-3 py-1 inline-block">
            <ShieldCheck className="inline-block h-3 w-3 align-text-bottom mr-1" aria-hidden="true" focusable="false" />Trust & Safety • మన వివాహ
          </div>
          <h1 className="mt-3 text-2xl md:text-4xl font-bold"><Duo en="Your safety is our responsibility" te="మీ భద్రత మా బాధ్యత" /></h1>
          <p className="mt-2 text-[13px] md:text-sm opacity-90 telugu max-w-3xl">
{te ? <>సందేహాస్పద ప్రొఫైల్‌ను report చేయండి లేదా block చేయండి. Badges నమోదైన review వివరాలను మాత్రమే చూపిస్తాయి; వ్యక్తి నిజమైనవారని హామీ ఇవ్వవు. In-app chat లేదు; spam లేదా మోసం జరగవని హామీ ఇవ్వలేం.</> : <>Report or block a profile if something seems wrong. Badges show recorded review evidence, not a guarantee that a person is genuine. There is no in-app chat; spam or fraud can still occur.</>}
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-[12px]">
            <span className="bg-white/10 border border-white/20 rounded-full px-3 py-1.5"><LockKeyhole className="inline-block h-3 w-3 align-text-bottom mr-1" aria-hidden="true" focusable="false" />Confidential reports</span>
            <span className="bg-white/10 border border-white/20 rounded-full px-3 py-1.5"><UserRoundCheck className="inline-block h-4 w-4 shrink-0 align-text-bottom mr-1" aria-hidden="true" focusable="false" />{te ? "మాన్యువల్ సమీక్ష" : "Human moderation review"}</span>
            <span className="bg-white/10 border border-white/20 rounded-full px-3 py-1.5"><ShieldCheck className="inline-block h-4 w-4 shrink-0 align-text-bottom mr-1" aria-hidden="true" focusable="false" />{te ? "Multi-reporter భద్రత" : "Multi-reporter anti-abuse"}</span>
            <Link href="/verify" className="gold-gradient text-maroon font-bold rounded-full px-3 py-1.5">{te ? "ప్రొఫైల్ ధృవీకరణ →" : "Verify Profile →"}</Link>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
        {needsLogin && (
          <AuthGate note={te ? "Report, Block, మరియు Moderation Appeal కోసం లాగిన్ అవసరం." : "Sign in to report, block, or submit a moderation appeal."} />
        )}
        {msg && (
          <div role="status" aria-live="polite" className={`rounded-2xl px-4 py-3 text-[13px] border whitespace-pre-line ${msg.ok ? "bg-emerald-50 border-emerald-200 text-emerald-900" : "bg-rose-50 border-rose-200 text-rose-900"}`}>
            {msg.text}
          </div>
        )}

        {/* ---- tips ---- */}
        <div className="bg-white rounded-[1.5rem] border border-gold/25 p-5">
          <div className="font-bold text-maroon text-[16px]"><Lightbulb className="inline-block h-4 w-4 shrink-0 align-text-bottom mr-1" aria-hidden="true" focusable="false" />{te ? "Safety tips (Telugu లో చదవండి — 2 నిమిషాలు)" : "Safety tips (read in Telugu — 2 minutes)"}</div>
          <div className="mt-3 grid md:grid-cols-2 gap-3">
            {tips.map((t) => (
              <div key={t.title} className="bg-cream rounded-2xl p-3 border border-gold/25">
                <div className="font-bold text-[13px] text-ink"><TipIcon icon={t.icon} />{t.title}</div>
                <div className="text-[12px] text-gray-700 mt-1 telugu">{t.telugu}</div>
              </div>
            ))}
            {!tips.length && <div className="text-[12px] text-gray-500">{te ? "Load అవుతుంది…" : "Loading…"}</div>}
          </div>
        </div>

        <ScamGuide />

        {/* ---- report form ---- */}
        <div className="bg-white rounded-[1.5rem] border border-rose-200 p-5">
          <div className="font-bold text-rose-800 text-[16px] flex items-center gap-2" data-testid="safety-report-title"><Flag className="h-4 w-4 shrink-0" aria-hidden="true" focusable="false" />{te ? "గోప్యంగా రిపోర్ట్ చేయండి" : "Submit a confidential report"}</div>
          <div className="text-[12px] text-gray-600 mt-1">
            {te ? "Fake profile / advance money / harassment / photo misuse — మీ ఖాతాలో లాగిన్ అయి report చేయండి. సమీక్ష కోసం report మీ ఖాతా Profile ID తో నమోదవుతుంది; ఇది anonymous submission కాదు." : "Fake profile / advance money / harassment / photo misuse — sign in to report. Your account Profile ID is recorded with the report for moderation review; this is not an anonymous submission."}
          </div>
          <div className="mt-4 grid md:grid-cols-3 gap-3">
            <div className="md:col-span-1">
              <label htmlFor="safety-target-id" className="text-[12px] font-bold">{te ? "ఎవరిని report? (Profile ID)" : "Whom to report? (Profile ID)"}</label>
              <input id="safety-target-id" value={report.target_id} onChange={(e) => setReport({ ...report, target_id: e.target.value.toUpperCase() })}
                placeholder="RED001" className="input-mobile font-mono" aria-label={te ? "ఎవరిని report? (Profile ID)" : "Whom to report? (Profile ID)"} />
            </div>
            <div className="md:col-span-1">
              <label htmlFor="safety-account-id" className="text-[12px] font-bold">{te ? "మీ ఖాతా Profile ID" : "Your account Profile ID"}</label>
              <input id="safety-account-id" value={myId} readOnly
                placeholder={sessionReady ? (te ? "ముందు login అవ్వండి" : "Sign in first") : (te ? "ఖాతా తనిఖీ అవుతోంది…" : "Checking account…")} className="input-mobile font-mono" />
            </div>
            <div className="md:col-span-1">
              <label htmlFor="safety-category" className="text-[12px] font-bold">Category</label>
              <select id="safety-category" value={report.category} onChange={(e) => setReport({ ...report, category: e.target.value })} className="input-mobile" aria-label="Category">
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
            <button type="button" onClick={submitReport} disabled={busy || !sessionReady}
              className="px-5 py-3 rounded-2xl inline-flex items-center gap-2 bg-rose-700 text-white font-bold text-[13px] disabled:opacity-60">
              {!busy && <Flag className="h-4 w-4 shrink-0" aria-hidden="true" focusable="false" />}{busy ? (te ? "పంపిస్తున్నాం…" : "Sending…") : te ? "Report పంపు" : "Send report"}
            </button>
            <button type="button" onClick={() => doBlock(report.target_id)} disabled={!report.target_id || !myId || blockBusy || !sessionReady}
              className="px-5 py-3 rounded-2xl border border-rose-300 text-rose-700 font-bold text-[13px] disabled:opacity-50">
              <Ban className="inline-block h-4 w-4 shrink-0 align-text-bottom mr-1" aria-hidden="true" focusable="false" />{te ? "Block చెయ్యి (వెంటనే)" : "Block now"}
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
            <div className="font-bold text-maroon text-[15px]"><CircleCheck className="inline-block h-4 w-4 shrink-0 align-text-bottom mr-1" aria-hidden="true" focusable="false" />{te ? "మీ ధృవీకరణ బ్యాడ్జ్‌లు" : "Your verification badges"}</div>
            {verify ? (
              <>
                <div className="mt-2 text-[13px] text-gray-700">
                  {te ? "ప్రస్తుత స్థితి:" : "Recorded status:"} <b><VerificationIcon name={verify.level} />{verificationLabel(te ? verify.telugu : (verify.english || verify.telugu))}</b>
                </div>
                <div className="mt-1 text-[12px] text-gray-600 telugu">
                  {te ? `తదుపరి అడుగు: ${verify.next_step_telugu}` : `Next step: ${verify.next_step_en || verify.next_step_telugu}`}
                </div>
                {badges.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {badges.map((b: any) => (
                      <span key={b.badge_type} className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-[11px] font-bold text-emerald-900">
                        <VerificationIcon name={b.badge_type} />{verificationLabel(te ? b.label_te : b.label_en)}
                      </span>
                    ))}
                  </div>
                )}
              </>
            ) : <div className="text-[12px] text-gray-500 mt-2">{te ? "మీ ఖాతాలో లాగిన్ అయితే నమోదైన ధృవీకరణ బ్యాడ్జ్‌లు ఇక్కడ కనిపిస్తాయి." : "Sign in to view recorded verification badges on your profile."}</div>}
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href="/verify" className="px-4 py-2 rounded-xl bg-maroon text-white font-bold text-[12px]">
                <Camera className="inline-block h-4 w-4 shrink-0 align-text-bottom mr-1" aria-hidden="true" focusable="false" />{te ? "సెల్ఫీ / విద్య / ఉద్యోగ ధృవీకరణ →" : "Submit Selfie / Education / Employment →"}
              </Link>
              {levels.filter((l) => l.level !== "none" && l.level !== "phone").map((l) => (
                <button key={l.level} type="button" onClick={() => requestVerify(l.level)} disabled={!myId || !sessionReady}
                  className="px-3 py-2 rounded-xl border border-gold/40 text-maroon font-bold text-[12px] disabled:opacity-50">
                  <VerificationIcon name={l.level} />{verificationLabel(l.telugu)}
                </button>
              ))}
            </div>
            <div className="mt-2 text-[11px] text-gray-500">
              {te ? "బ్యాడ్జ్‌లు సమర్పించిన ఆధారాల బృంద సమీక్షను మాత్రమే సూచిస్తాయి; ఇవి numeric trust score లేదా identity హామీ కావు." : "Badges reflect staff review of submitted evidence only; they are not a numeric trust score or identity guarantee."}
            </div>
          </div>

          <div className="bg-white rounded-[1.5rem] border border-gold/25 p-5">
            <div data-testid="safety-block-list">
            <div className="font-bold text-maroon text-[15px]"><Ban className="inline-block h-4 w-4 shrink-0 align-text-bottom mr-1" aria-hidden="true" focusable="false" />{te ? "మీ block list" : "Your block list"}{myId && blockReadState === "ready" ? ` (${blocks.length})` : ""}</div>
            {!myId ? <div className="text-[12px] text-gray-500 mt-2">{te ? "మీ block list చూడటానికి login అవ్వండి." : "Sign in to view your block list."}</div> : <>
              {blockReadState === "loading" && <div role="status" className="text-[12px] text-gray-600 mt-2">{te ? "Block list లోడ్ అవుతోంది…" : "Loading your block list…"}</div>}
              {blockReadState === "error" && <div role="alert" className="text-[12px] text-rose-800 mt-2">{te ? "మీ block list లోడ్ కాలేదు. మళ్లీ ప్రయత్నించండి." : "Your block list could not be loaded. Please retry."}{blocks.length > 0 && <div>{te ? "ఇది ఇంతకు ముందు లోడ్ అయిన list. ప్రస్తుత స్థితి కోసం మళ్లీ ప్రయత్నించండి." : "Showing the last loaded list. Retry to confirm its current state."}</div>}</div>}
              {blockReadState === "ready" && blocks.length === 0 && <div className="text-[12px] text-gray-500 mt-2">{te ? "ఎవరూ block చెయ్యలేదు" : "Nobody blocked"} <ThumbsUp className="inline-block h-3 w-3 align-text-bottom" aria-hidden="true" focusable="false" /></div>}
              <button type="button" onClick={() => void loadBlocks(myId)} disabled={blockReadState === "loading" || blockBusy} className="mt-2 px-3 py-2 rounded-xl border border-gold/40 text-maroon font-bold text-[12px] disabled:opacity-50">{blockReadState === "error" ? (te ? "Block list మళ్లీ ప్రయత్నించండి" : "Retry block list") : (te ? "Block list మళ్లీ లోడ్ చెయ్యి" : "Refresh block list")}</button>
            </>}
            <div className="mt-2 space-y-2">
              {blocks.map((b) => (
                <div key={b.blocked} className="flex items-center gap-2 bg-cream rounded-xl px-3 py-2">
                  <span className="font-mono text-[12px] flex-1">{b.blocked}</span>
                  <span className="text-[10px] text-gray-500">{String(b.at).slice(0, 10)}</span>
                  <button type="button" onClick={() => doUnblock(b.blocked)} disabled={blockBusy || blockReadState !== "ready" || !myId} className="text-[11px] font-bold text-maroon underline disabled:opacity-50 disabled:no-underline">unblock</button>
                </div>
              ))}
            </div>
            </div>
          </div>
        </div>

        {/* ---- Member Moderation Appeal ---- */}
        <div className="bg-white rounded-[1.5rem] border border-gold/25 p-5">
          <div className="font-bold text-maroon text-[15px]">
            <Scale className="inline-block h-4 w-4 align-text-bottom mr-1" aria-hidden="true" focusable="false" />{te ? "మాడరేషన్ అప్పీల్ (ప్రొఫైల్ తాత్కాలికంగా దాచబడితే)" : "Moderation Appeal (if your profile was paused for review)"}
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
            <button type="button" onClick={submitAppeal} disabled={busy || !myId || !sessionReady}
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
          <Ban className="inline-block h-3 w-3 align-text-bottom mr-1" aria-hidden="true" focusable="false" />Chatting లేదు — అందుకే మనం middle లో ఉండం, direct మీరు మాట్లాడుకోవచ్చు (consent తో).</> : <>In emergency / police case call 100 immediately • Our support: our WhatsApp (in profile) •
          <Ban className="inline-block h-3 w-3 align-text-bottom mr-1" aria-hidden="true" focusable="false" />No chatting — so we stay out of the middle, you talk directly (with consent).</>}
        </div>
      </div>
    </div>
  );
}
