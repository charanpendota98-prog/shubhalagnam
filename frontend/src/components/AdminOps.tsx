"use client";
/**
 * 🛡️ WAVE 35 — ADMIN OPS (Safety + Ops tabs).
 * Moderation queue · success-story approvals · leads follow-up · publish control.
 * ADMIN ONLY (X-Admin-Key). Prathi action ki backend audit untundi.
 */
import { useCallback, useEffect, useState } from "react";
import { apiDisplayMessage, authHeaders, readApiJson } from "@/lib/api";
import { useLang } from "@/lib/lang";
import { whatsappPhoneLink } from "@/lib/wa";

type Row = Record<string, any>;
const H = () => ({ ...authHeaders(true), "Content-Type": "application/json" });
const ACTION_LABELS: Record<string, { te: string; en: string }> = {
  verify: { te: "✅ ధృవీకరణ బ్యాడ్జ్", en: "✅ Verify badge" },
  warn: { te: "⚠️ హెచ్చరించండి", en: "⚠️ Warn" },
  hide: { te: "🙈 దాచండి", en: "🙈 Hide" },
  ban: { te: "⛔ నిషేధించండి", en: "⛔ Ban" },
  dismiss: { te: "❌ విస్మరించండి", en: "❌ Dismiss" },
};
const actionLabel = (action: string, te: boolean) => ACTION_LABELS[action]?.[te ? "te" : "en"] || action;
const localizedCode = (value: unknown, te: boolean, fallback: string) => {
  const text = typeof value === "string" ? value.replace(/[_-]+/g, " ").trim() : "";
  if (te) return text || fallback;
  return apiDisplayMessage({ message_en: text }, false, fallback);
};

/* ---------------- 🛡️ MODERATION QUEUE ---------------- */
export function ModerationQueue() {
  const { lang } = useLang();
  const te = lang === "te";
  const [items, setItems] = useState<Row[]>([]);
  const [open, setOpen] = useState(0);
  const [actions, setActions] = useState<string[]>(["verify", "warn", "hide", "ban", "dismiss"]);
  const [note, setNote] = useState<Record<string, string>>({});
  const [flash, setFlash] = useState("");

  const load = useCallback(async () => {
    try {
      const d = await fetch("/api/moderation/queue?limit=50", { headers: authHeaders(true) }).then((r) => readApiJson(r));
      if (d.items) { setItems(d.items); setOpen(d.open ?? d.items.length); if (d.actions?.length) setActions(d.actions); }
      else setFlash(apiDisplayMessage(d, te, te ? "లోడ్ కాలేదు — admin key తనిఖీ చేయండి." : "Could not load reports. Check your admin key.") || (te ? "లోడ్ కాలేదు." : "Could not load reports."));
    } catch { setFlash(te ? "నెట్‌వర్క్ సమస్య. మళ్లీ ప్రయత్నించండి." : "Network problem. Please try again."); }
  }, [te]);
  useEffect(() => { void load(); }, [load]);

  const resolve = async (id: string, action: string) => {
    if ((action === "ban" || action === "hide") && !window.confirm(te ? `${id} → ${actionLabel(action, true)}?` : `Confirm ${actionLabel(action, false).replace(/^\S+\s/, "").toLowerCase()} for ${id}?`)) return;
    const r = await fetch(`/api/moderation/resolve/${id}`,
      { method: "POST", headers: H(), body: JSON.stringify({ action, note: note[id] || "" }) });
    const d = await readApiJson(r);
    setFlash(d.success ? (te ? `✅ ${id} → ${actionLabel(action, true)}` : `✅ ${id} → ${actionLabel(action, false)}`) : apiDisplayMessage(d, te, te ? "చర్యను పూర్తి చేయలేకపోయాం." : "Could not complete the action."));
    void load();
  };

  return (
    <div>
      <p className="telugu mt-2 text-xs text-gray-500">
        {te ? "అత్యంత తీవ్రమైన నివేదికలను ముందుగా పరిశీలించి, సూచించిన చర్యను అనుసరించండి. నిషేధం శాశ్వతం." : "Review high-severity reports first and follow the suggested action. A ban is permanent."}
        {" "}({open} {te ? "తెరిచి ఉన్నాయి" : "open"})
      </p>
      {flash && <div className="my-2 rounded-xl bg-[#0F1F3C] p-2 text-xs text-white">{flash}</div>}
      <div className="space-y-2 max-h-[460px] overflow-auto pr-1">
        {items.map((r) => (
          <div key={r.report_id} className="rounded-xl border p-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono font-bold">{r.report_id}</span>
              <span className={`px-2 py-0.5 rounded-full font-bold ${r.severity === "high" ? "bg-red-100 text-red-700" : r.severity === "medium" ? "bg-amber-100 text-amber-800" : "bg-gray-100 text-gray-600"}`}>{te ? ({ high: "తీవ్రం", medium: "మధ్యస్థం", low: "తక్కువ" } as Record<string, string>)[r.severity] || r.severity : ({ high: "High", medium: "Medium", low: "Low" } as Record<string, string>)[r.severity] || localizedCode(r.severity, false, "Unspecified")}</span>
              <span className="font-bold">{te
                ? (r.category_telugu || r.category || "నివేదిక")
                : apiDisplayMessage({ message_en: r.category_en, message: String(r.category || "").replace(/_/g, " ") }, false, "Report category")}</span>
              <span className="text-gray-500">×{r.reports_on_target} {te ? "నివేదికలు" : "reports on this profile"}</span>
              <span className="ml-auto text-gray-400">{String(r.at || "").slice(0, 16).replace("T", " ")}</span>
            </div>
            <div className="mt-1 text-gray-600">{r.reporter_id} → <b>{r.target_id}</b>{r.target ? ` (${r.target.full_name || ""} • ${r.target.district || ""} • ${r.target.phone_last4 ? "••" + r.target.phone_last4 : ""})` : ""}</div>
            {r.detail && <div className="mt-1 rounded-lg bg-gray-50 p-2 text-gray-700">{r.detail}</div>}
            <div className="mt-1 text-[11px] font-bold text-[#7A0C2E]">💡 {te ? "సూచించిన చర్య:" : "Suggested action:"} {actionLabel(r.suggested_action, te)}</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <input value={note[r.report_id] || ""} onChange={(e) => setNote({ ...note, [r.report_id]: e.target.value })}
                placeholder={te ? "నిర్వాహక గమనిక (ఆడిట్ కోసం)" : "Admin note (for audit)"} className="min-w-[140px] flex-1 rounded-lg border px-2 py-2 text-base sm:text-sm" aria-label={te ? "నిర్వాహక గమనిక" : "Admin note"} />
              {actions.map((a) => (
                <button type="button" key={a} onClick={() => void resolve(r.report_id, a)}
                  className={`rounded-full px-3 py-1.5 font-bold ${a === r.suggested_action ? "bg-[#7A0C2E] text-white" : a === "ban" ? "bg-red-100 text-red-700" : "bg-gray-100"}`}>
                  {actionLabel(a, te)}
                </button>
              ))}
            </div>
          </div>
        ))}
        {!items.length && <p className="text-xs text-gray-400">{te ? "తెరిచి ఉన్న నివేదికలు లేవు ✅" : "No open reports ✅"}</p>}
      </div>
    </div>
  );
}

/* ---------------- 💑 SUCCESS-STORY APPROVALS ---------------- */
export function StoriesQueue() {
  const { lang } = useLang();
  const te = lang === "te";
  const [items, setItems] = useState<Row[]>([]);
  const [st, setSt] = useState("pending");
  const [note, setNote] = useState<Record<string, string>>({});
  const [flash, setFlash] = useState("");
  const [share, setShare] = useState("");

  const load = useCallback(async () => {
    try {
      const d = await fetch(`/api/admin/stories?status=${st}&limit=50`, { headers: authHeaders(true) }).then((r) => readApiJson(r));
      if (d.success) setItems(d.stories || []);
      else setFlash(apiDisplayMessage(d, te, te ? "కథలను లోడ్ చేయలేకపోయాం." : "Could not load stories."));
    } catch { setFlash(te ? "నెట్‌వర్క్ సమస్య. మళ్లీ ప్రయత్నించండి." : "Network problem. Please try again."); }
  }, [st, te]);
  useEffect(() => { void load(); }, [load]);

  const act = async (id: string, action: string) => {
    const r = await fetch(`/api/admin/stories/${id}/action`,
      { method: "POST", headers: H(), body: JSON.stringify({ action, note: note[id] || "" }) });
    const d = await readApiJson(r);
    const statusLabel = d.story?.status === "approved" ? (te ? "ఆమోదించబడింది" : "approved") : d.story?.status === "rejected" ? (te ? "తిరస్కరించబడింది" : "rejected") : d.story?.status;
    setFlash(d.story ? `✅ ${id} → ${statusLabel}` : apiDisplayMessage(d, te, te ? "చర్యను పూర్తి చేయలేకపోయాం." : "Could not complete the action."));
    if (d.share_text) setShare(d.share_text);
    void load();
  };

  return (
    <div>
      <div className="my-2 flex gap-2">
        {[["pending", te ? "పెండింగ్" : "Pending"], ["approved", te ? "ఆమోదించబడినవి" : "Approved"], ["rejected", te ? "తిరస్కరించబడినవి" : "Rejected"]].map(([v, l]) => (
          <button type="button" key={v} onClick={() => setSt(v)}
            className={`rounded-full px-3 py-1 text-xs font-bold ${st === v ? "maroon-gradient text-white" : "bg-gray-100"}`}>{l}</button>
        ))}
        <button type="button" onClick={() => void load()} className="ml-auto min-h-10 px-2 text-xs underline">↻ {te ? "రిఫ్రెష్" : "Refresh"}</button>
      </div>
      {flash && <div className="mb-2 rounded-xl bg-[#0F1F3C] p-2 text-xs text-white">{flash}</div>}
      {share && (
        <div className="mb-2 rounded-xl border border-green-200 bg-green-50 p-2 text-xs">
          <div className="font-bold text-green-800">{te ? "📢 ఆమోదించబడింది — ఈ పాఠ్యాన్ని సమ్మతితో మాత్రమే పంచుకోండి:" : "📢 Approved — share this copy only with consent:"}</div>
          <pre className="mt-1 whitespace-pre-wrap">{share}</pre>
          <button type="button" onClick={() => { navigator.clipboard?.writeText(share); setFlash(te ? "📋 కాపీ అయింది" : "📋 Copied"); }} className="mt-1 rounded-full bg-green-700 px-3 py-1 font-bold text-white">📋 {te ? "కాపీ చేయండి" : "Copy"}</button>
        </div>
      )}
      <div className="space-y-2 max-h-[420px] overflow-auto pr-1">
        {items.map((s) => (
          <div key={s.story_id} className="rounded-xl border p-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono font-bold">{s.story_id}</span>
              <span className="font-bold">{s.couple_names}</span>
              <span className="text-gray-500">{s.tsap_id}{s.partner_id ? ` + ${s.partner_id}` : ""} • {s.district}</span>
              <span className="ml-auto text-gray-400">{String(s.created_at || "").slice(0, 10)}</span>
            </div>
            <div className="mt-1 text-gray-700">{s.text}</div>
            {s.photo_url && <a href={s.photo_url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block font-bold text-[#7A0C2E] underline">🖼️ {te ? "ఫోటో చూడండి" : "View photo"} →</a>}
            {st === "pending" && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                <input value={note[s.story_id] || ""} onChange={(e) => setNote({ ...note, [s.story_id]: e.target.value })}
                  placeholder={te ? "గమనిక (ఐచ్ఛికం)" : "Note (optional)"} className="min-w-[140px] flex-1 rounded-lg border px-2 py-2 text-base sm:text-sm" aria-label={te ? "గమనిక" : "Note"} />
                <button type="button" onClick={() => void act(s.story_id, "approve")} className="min-h-10 rounded-full bg-green-600 px-4 py-1.5 font-bold text-white">✅ {te ? "ఆమోదించండి" : "Approve"}</button>
                <button type="button" onClick={() => void act(s.story_id, "reject")} className="min-h-10 rounded-full bg-red-500 px-4 py-1.5 font-bold text-white">❌ {te ? "తిరస్కరించండి" : "Reject"}</button>
              </div>
            )}
          </div>
        ))}
        {!items.length && <p className="text-xs text-gray-400">{te ? "కథలు లేవు." : "No stories."}</p>}
      </div>
    </div>
  );
}

/* ---------------- 📈 LEADS + FOLLOW-UP ---------------- */
export function LeadsPanel() {
  const { lang } = useLang();
  const te = lang === "te";
  const [items, setItems] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [st, setSt] = useState("");
  const [flash, setFlash] = useState("");

  const load = useCallback(async () => {
    try {
      const d = await fetch(`/api/leads${st ? `?status=${st}` : ""}&limit=100`, { headers: authHeaders(true) }).then((r) => readApiJson(r));
      if (d.items) { setItems(d.items); setTotal(d.total ?? d.items.length); }
      else setFlash(apiDisplayMessage(d, te, te ? "లీడ్స్‌ను లోడ్ చేయలేకపోయాం." : "Could not load leads."));
    } catch { setFlash(te ? "నెట్‌వర్క్ సమస్య. మళ్లీ ప్రయత్నించండి." : "Network problem. Please try again."); }
  }, [st, te]);
  useEffect(() => { void load(); }, [load]);

  const followup = async (id: string) => {
    const r = await fetch(`/api/leads/followup/${id}`, { method: "POST", headers: authHeaders(true) });
    const d = await readApiJson(r);
    setFlash(d.success ? (te ? `✅ ${id} → WhatsApp క్యూలో సంప్రదింపు నమోదు అయింది.` : `✅ ${id} → follow-up added to the WhatsApp queue.`) : apiDisplayMessage(d, te, te ? "ఫాలో-అప్‌ను జోడించలేకపోయాం." : "Could not add the follow-up."));
    void load();
  };

  return (
    <div>
      <p className="telugu mt-2 text-xs text-gray-500">{te ? "కొత్త లీడ్స్‌ను పరిశీలించి ఫాలో-అప్ స్థితిని నమోదు చేయండి. ఫోన్/WhatsApp లింక్ అందుబాటులో ఉన్నప్పుడే చూపబడుతుంది." : "Review new leads and record follow-up status. Phone and WhatsApp links appear only when available."} ({total})</p>
      <div className="my-2 flex gap-2">
        {[["", te ? "అన్నీ" : "All"], ["new", te ? "కొత్తవి" : "New"], ["contacted", te ? "సంప్రదించినవి" : "Contacted"], ["converted", te ? "మార్చబడినవి" : "Converted"]].map(([v, l]) => (
          <button type="button" key={v} onClick={() => setSt(v)}
            className={`rounded-full px-3 py-1 text-xs font-bold ${st === v ? "maroon-gradient text-white" : "bg-gray-100"}`}>{l}</button>
        ))}
        <button type="button" onClick={() => void load()} className="ml-auto min-h-10 px-2 text-xs underline">↻ {te ? "రిఫ్రెష్" : "Refresh"}</button>
      </div>
      {flash && <div className="mb-2 rounded-xl bg-[#0F1F3C] p-2 text-xs text-white">{flash}</div>}
      <div className="space-y-2 max-h-[420px] overflow-auto pr-1">
        {items.map((l) => (
          <div key={l.id} className="rounded-xl border p-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold">{l.name || (te ? "పేరు ఇవ్వలేదు" : "Name not provided")}</span>
              {l.phone && whatsappPhoneLink(l.phone) && <a href={whatsappPhoneLink(l.phone) || undefined} target="_blank" rel="noopener noreferrer" className="font-mono font-bold text-green-700 underline">📞 {l.phone}</a>}
              <span className={`px-2 py-0.5 rounded-full font-bold ${l.status === "converted" ? "bg-green-100 text-green-700" : l.status === "contacted" ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"}`}>{te ? ({ new: "కొత్తది", contacted: "సంప్రదించారు", converted: "మార్చబడింది" } as Record<string, string>)[l.status] || l.status : ({ new: "New", contacted: "Contacted", converted: "Converted" } as Record<string, string>)[l.status] || localizedCode(l.status, false, "Unknown")}</span>
              <span className="text-gray-500">{l.gender} {l.age} • {l.district} {l.caste} • {l.source}</span>
              <span className="ml-auto text-gray-400">{te ? "ఫాలో-అప్‌లు:" : "Follow-ups:"} {l.touches ?? 1} • {String(l.at || "").slice(0, 16).replace("T", " ")}</span>
            </div>
            {l.status !== "converted" && (
              <button type="button" onClick={() => void followup(l.id)} className="mt-2 min-h-10 rounded-full bg-green-600 px-4 py-1.5 font-bold text-white">💬 {te ? "WhatsApp ఫాలో-అప్" : "WhatsApp follow-up"}</button>
            )}
          </div>
        ))}
        {!items.length && <p className="text-xs text-gray-400">{te ? "లీడ్స్ లేవు." : "No leads."}</p>}
      </div>
    </div>
  );
}

/* ---------------- 📮 PUBLISH CONTROL + DEAD LETTERS ---------------- */
export function PublishPanel() {
  const { lang } = useLang();
  const te = lang === "te";
  const [pub, setPub] = useState<Row | null>(null);
  const [dead, setDead] = useState<Row[]>([]);
  const [deadCount, setDeadCount] = useState(0);
  const [tsap, setTsap] = useState("");
  const [flash, setFlash] = useState("");

  const load = useCallback(async () => {
    try {
      const d = await fetch("/api/publish/status", { headers: authHeaders(true) }).then((r) => readApiJson(r));
      if (d.success) setPub(d);
      const w = await fetch("/api/wa/dead?limit=20", { headers: authHeaders(true) }).then((r) => readApiJson(r));
      if (w.items) { setDead(w.items); setDeadCount(w.count ?? w.items.length); }
      else if (w.detail) setFlash(apiDisplayMessage(w, te, te ? "విఫలమైన సందేశాలను లోడ్ చేయలేకపోయాం." : "Could not load failed messages."));
    } catch { setFlash(te ? "నెట్‌వర్క్ సమస్య. మళ్లీ ప్రయత్నించండి." : "Network problem. Please try again."); }
  }, [te]);
  useEffect(() => { void load(); }, [load]);

  const requeue = async () => {
    const r = await fetch("/api/wa/dead/requeue?limit=20", { method: "POST", headers: authHeaders(true) });
    const d = await readApiJson(r);
    setFlash(apiDisplayMessage(d, te, te ? "మళ్లీ queue చేయడం పూర్తయింది; delivery నిర్ధారించబడలేదు." : "Requeue completed; message delivery is not confirmed."));
    void load();
  };
  const republish = async () => {
    if (!tsap.trim()) { setFlash(te ? "ప్రొఫైల్ ID నమోదు చేయండి." : "Enter a profile ID."); return; }
    const r = await fetch(`/api/publish/now/${tsap.trim().toUpperCase()}`, { method: "POST", headers: authHeaders(true) });
    const d = await readApiJson(r);
    setFlash(d.success
      ? (te ? `✅ మళ్లీ పోస్ట్ క్యూలో చేర్చాం → ${(d.targets || []).length} లక్ష్యాలు` : `✅ Repost queued for ${(d.targets || []).length} destinations.`)
      : apiDisplayMessage(d, te, te ? "ప్రొఫైల్‌ను మళ్లీ పోస్ట్ చేయలేకపోయాం." : "Could not queue the profile repost."));
  };
  const digest = async () => {
    const r = await fetch("/api/publish/digest", { method: "POST", headers: authHeaders(true) });
    const d = await readApiJson(r);
    setFlash(d.success
      ? (te ? "✅ డైజెస్ట్ Telegram + WhatsApp క్యూలో చేర్చబడింది." : "✅ Digest added to the Telegram and WhatsApp queues.")
      : apiDisplayMessage(d, te, te ? "డైజెస్ట్‌ను క్యూలో చేర్చలేకపోయాం." : "Could not queue the digest."));
  };

  return (
    <div>
      {flash && <div className="my-2 rounded-xl bg-[#0F1F3C] p-2 text-xs text-white">{flash}</div>}
      {pub && (
        <div className="grid grid-cols-2 gap-2 text-center text-xs md:grid-cols-4">
          {[["Telegram", pub.telegram?.configured ? (te ? "సిద్ధం" : "Ready") : (te ? "పరీక్షా మోడ్" : "Dry run")], [te ? "WhatsApp మోడ్" : "WhatsApp mode", localizedCode(pub.whatsapp?.mode || pub.wa_mode, te, te ? "తెలియదు" : "Unknown")],
            [te ? "వర్కర్" : "Worker", pub.worker_running ? (te ? "▶️ నడుస్తోంది" : "▶️ Running") : (te ? "⏸️ నిలిపివేయబడింది" : "⏸️ Paused")], [te ? "విఫలమైనవి" : "Failed", deadCount]].map(([l, v]) => (
            <div key={l as string} className="rounded-xl border bg-gray-50 p-2">
              <div className="font-extrabold text-[#7A0C2E]">{String(v ?? "—")}</div>
              <div className="text-[11px] text-gray-500">{l}</div>
            </div>
          ))}
        </div>
      )}
      <div className="my-2 flex flex-wrap items-center gap-2 text-xs">
        <input value={tsap} onChange={(e) => setTsap(e.target.value)} placeholder={te ? "ప్రొఫైల్ ID" : "Enter profile ID"}
          className="min-h-10 rounded-lg border px-3 py-2 text-base font-mono sm:text-sm" aria-label={te ? "ప్రొఫైల్ ID" : "Profile ID"} />
        <button type="button" onClick={() => void republish()} className="min-h-10 rounded-full bg-[#7A0C2E] px-4 py-1.5 font-bold text-white">🔁 {te ? "ప్రొఫైల్‌ను మళ్లీ పోస్ట్ చేయండి" : "Repost profile"}</button>
        <button type="button" onClick={() => void digest()} className="min-h-10 rounded-full bg-[#0F1F3C] px-4 py-1.5 font-bold text-white">🌅 {te ? "డైజెస్ట్ పంపండి" : "Send digest now"}</button>
        <button type="button" onClick={() => void load()} className="ml-auto min-h-10 px-2 underline">↻ {te ? "రిఫ్రెష్" : "Refresh"}</button>
      </div>
      <div className="rounded-xl border p-3 text-xs">
        <div className="flex items-center gap-2">
          <b>💀 {te ? "విఫలమైన సందేశాలు" : "Failed messages"} ({deadCount})</b>
          <button type="button" onClick={() => void requeue()} disabled={!dead.length} className="ml-auto min-h-10 rounded-full bg-green-600 px-3 py-1 font-bold text-white disabled:opacity-40">♻️ {te ? "అన్నింటినీ మళ్లీ క్యూలో పెట్టండి" : "Requeue all"}</button>
        </div>
        <p className="mt-1 text-[11px] text-gray-500">{te ? "మూడు ప్రయత్నాల తర్వాత విఫలమైతే, bridge/QR సమస్యను సరిచేసి మళ్లీ క్యూలో పెట్టండి." : "After three failed attempts, fix the bridge or QR connection before requeuing."}</p>
        <div className="mt-2 max-h-[180px] space-y-1 overflow-auto">
          {dead.map((m: Row, i: number) => (
            <div key={i} className="rounded-lg bg-gray-50 px-2 py-1 font-mono text-[11px]">
              {localizedCode(m.kind, te, te ? "సందేశం" : "Message")} {m.phone ? `· ${m.phone}` : ""} → {(m.targets || m.phones || []).join?.(", ") || m.to || ""} • {apiDisplayMessage({ message_en: m.error_en || m.last_error_en, error: m.error || m.last_error, message_telugu: m.error || m.last_error }, te, te ? "తెలియని లోపం" : "Error details unavailable").slice(0, 60)}
            </div>
          ))}
          {!dead.length && <p className="text-gray-400">{te ? "✅ విఫలమైన సందేశాలు లేవు." : "✅ No failed messages."}</p>}
        </div>
      </div>
    </div>
  );
}

export function PersonalizedDigestPanel() {
  const { lang } = useLang();
  const te = lang !== "en";
  const [prev, setPrev] = useState<Row | null>(null);
  const [flash, setFlash] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setBusy(true);
    try {
      const r = await fetch(`/api/digest/personal/preview?lang=${te ? "te" : "en"}`, { headers: authHeaders(true) });
      const d = await readApiJson(r);
      if (d.success) setPrev(d);
      else setFlash(apiDisplayMessage(d, te, te ? "ప్రివ్యూను లోడ్ చేయలేకపోయాం." : "Could not load the preview."));
    } catch { setFlash(te ? "⚠️ APIకి కనెక్ట్ కాలేదు. మళ్లీ ప్రయత్నించండి." : "⚠️ Could not connect to the API. Please try again."); }
    finally { setBusy(false); }
  };
  useEffect(() => { void load(); }, [te]); // eslint-disable-line react-hooks/exhaustive-deps

  const run = async () => {
    setBusy(true); setFlash("");
    try {
      const r = await fetch("/api/digest/personal/run", { method: "POST", headers: H(), body: JSON.stringify({ lang: te ? "te" : "en" }) });
      const d = await readApiJson(r);
      if (d.success) {
        const s = d.send || {};
        setFlash(te
          ? (s.skipped
            ? `📬 Queue సిద్ధం: ${d.queued} మంది · 🔒 Send gated (${s.reason}) — ఏదీ పంపలేదు`
            : `📬 ${d.queued} queued · ✅ sent ${s.sent}`)
          : (s.skipped
            ? `📬 Queue prepared for ${d.queued} recipients · 🔒 Sending is disabled (${localizedCode(s.reason, false, "not configured")}); nothing was sent.`
            : `📬 ${d.queued} queued · ✅ ${s.sent} sent`));
        void load();
      } else setFlash(apiDisplayMessage(d, te, te ? "డైజెస్ట్‌ను రూపొందించలేకపోయాం." : "Could not generate the digest."));
    } catch { setFlash(te ? "⚠️ APIకి కనెక్ట్ కాలేదు. మళ్లీ ప్రయత్నించండి." : "⚠️ Could not connect to the API. Please try again."); }
    finally { setBusy(false); }
  };

  const c = (prev?.counts || {}) as Row;
  const chips: [string, any][] = [
    [te ? "మొత్తం" : "Total", c.total], [te ? "పంపుతారు" : "Sendable", c.sendable],
    [te ? "ఆప్ట్-అవుట్" : "Opted-out", c.opted_out], [te ? "ఫోన్ లేదు" : "No phone", c.no_phone],
    [te ? "యాక్టివ్ కాదు" : "Not engaged", c.not_engaged], [te ? "కొత్తది లేదు" : "No new", c.no_new_content],
  ];

  return (
    <div className="rounded-xl border p-3 text-xs">
      <div className="flex flex-wrap items-center gap-2">
        <b className="text-[#7A0C2E]">📬 {te ? "వ్యక్తిగత రోజువారీ డైజెస్ట్" : "Personalized daily digest"}</b>
        {prev?.send_gated && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-800">
            🔒 {te ? "పంపడం నిలిపివేయబడింది" : "Sending disabled"}
          </span>
        )}
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-600">{te ? "WhatsApp మోడ్" : "WhatsApp mode"}: {localizedCode(prev?.wa_mode, te, te ? "తెలియదు" : "Unknown")}</span>
        <button type="button" onClick={() => void load()} disabled={busy} className="ml-auto min-h-10 px-2 underline disabled:opacity-40" aria-label={te ? "ప్రివ్యూను రిఫ్రెష్ చేయండి" : "Refresh preview"}>↻ {te ? "రిఫ్రెష్" : "Refresh"}</button>
      </div>
      <p className="mt-1 text-[11px] text-gray-500">
        {te
          ? "ప్రతి వినియోగదారునికి matchbot మరియు సేవ్ చేసిన శోధనల ఆధారంగా డైజెస్ట్ రూపొందుతుంది. ఇది క్యూను మాత్రమే సృష్టిస్తుంది; పంపడానికి DIGEST_PERSONAL_SEND=1 మరియు WhatsApp పంపిణీ ప్రారంభం కావాలి."
          : "Creates a digest for each user from match suggestions and saved searches. This only builds the queue; sending requires DIGEST_PERSONAL_SEND=1 and WhatsApp delivery to be enabled."}
      </p>
      {flash && <div className="my-2 rounded-lg bg-[#0F1F3C] p-2 text-[11px] text-white">{flash}</div>}
      <div className="mt-2 grid grid-cols-3 gap-1.5 md:grid-cols-6">
        {chips.map(([l, v]) => (
          <div key={l as string} className="rounded-lg border bg-gray-50 p-1.5 text-center">
            <div className="font-extrabold text-[#7A0C2E]">{String(v ?? 0)}</div>
            <div className="text-[10px] text-gray-500">{l}</div>
          </div>
        ))}
      </div>
      {(prev?.samples || []).length > 0 && (
        <div className="mt-2 space-y-1">
          {(prev!.samples as Row[]).map((s, i) => (
            <div key={i} className="rounded-lg bg-gray-50 px-2 py-1 text-[11px]">
              <span className="font-mono text-[10px] text-gray-400">{s.tsap_id}: </span>
              <span className="whitespace-pre-wrap text-gray-700">{te ? String(s.text || "") .slice(0, 160) : apiDisplayMessage({ message_en: String(s.text || "") }, false, "English preview text is unavailable.").slice(0, 160)}</span>
            </div>
          ))}
        </div>
      )}
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" onClick={() => void run()} disabled={busy}
          className="rounded-full bg-[#7A0C2E] px-4 py-1.5 font-bold text-white disabled:opacity-40">
          {te ? "📬 డైజెస్ట్ క్యూను రూపొందించండి" : "📬 Generate digest queue"}
        </button>
      </div>
    </div>
  );
}
