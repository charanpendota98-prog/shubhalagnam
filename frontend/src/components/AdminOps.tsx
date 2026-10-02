"use client";
/**
 * 🛡️ WAVE 35 — ADMIN OPS (Safety + Ops tabs).
 * Moderation queue · success-story approvals · leads follow-up · publish control.
 * ADMIN ONLY (X-Admin-Key). Prathi action ki backend audit untundi.
 */
import { useEffect, useState } from "react";
import { authHeaders } from "@/lib/api";
import { useLang } from "@/lib/lang";

type Row = Record<string, any>;
const adminToken = () => { try { return localStorage.getItem("tsap_admin_token") || ""; } catch { return ""; } };
const withToken = (url: string) => {
  const tk = adminToken();
  return tk ? `${url}${url.includes("?") ? "&" : "?"}token=${encodeURIComponent(tk)}` : url;
};
const H = () => ({ ...authHeaders(true), "Content-Type": "application/json" });
const ACTION_TE: Record<string, string> = {
  verify: "✅ Verify badge", warn: "⚠️ Warn", hide: "🙈 Hide", ban: "⛔ Ban", dismiss: "❌ Dismiss",
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

  const load = async () => {
    try {
      const d = await fetch(withToken("/api/moderation/queue?limit=50"), { headers: authHeaders(true) }).then((r) => r.json());
      if (d.items) { setItems(d.items); setOpen(d.open ?? d.items.length); if (d.actions?.length) setActions(d.actions); }
      else setFlash(d.detail || (te ? "Load fail — admin key చూడండి" : "Load failed — check admin key"));
    } catch { setFlash(te ? "Network problem" : "Network problem"); }
  };
  useEffect(() => { void load(); }, []);

  const resolve = async (id: string, action: string) => {
    if ((action === "ban" || action === "hide") && !window.confirm(te ? `${id} → ${action}? (profile ${action === "ban" ? "ban" : "hide"} అవుతుంది)` : `${id} → ${action}?`)) return;
    const r = await fetch(withToken(`/api/moderation/resolve/${id}`),
      { method: "POST", headers: H(), body: JSON.stringify({ action, note: note[id] || "" }) });
    const d = await r.json();
    setFlash(d.success ? `✅ ${id} → ${action}` : (d.detail || "done"));
    void load();
  };

  return (
    <div>
      <p className="telugu mt-2 text-xs text-gray-500">
        {te ? "High-severity (scam/harassment) ముందు — suger action follow avvandi. Ban = permanent + channels నుంచి out." : "High-severity first — follow the suggested action. Ban = permanent + out of channels."}
        {" "}({open} open)
      </p>
      {flash && <div className="my-2 rounded-xl bg-[#0F1F3C] p-2 text-xs text-white">{flash}</div>}
      <div className="space-y-2 max-h-[460px] overflow-auto pr-1">
        {items.map((r) => (
          <div key={r.report_id} className="rounded-xl border p-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono font-bold">{r.report_id}</span>
              <span className={`px-2 py-0.5 rounded-full font-bold ${r.severity === "high" ? "bg-red-100 text-red-700" : r.severity === "medium" ? "bg-amber-100 text-amber-800" : "bg-gray-100 text-gray-600"}`}>{r.severity}</span>
              <span className="font-bold">{r.category_telugu || r.category}</span>
              <span className="text-gray-500">×{r.reports_on_target} on target</span>
              <span className="ml-auto text-gray-400">{String(r.at || "").slice(0, 16).replace("T", " ")}</span>
            </div>
            <div className="mt-1 text-gray-600">{r.reporter_id} → <b>{r.target_id}</b>{r.target ? ` (${r.target.full_name || ""} • ${r.target.district || ""} • ${r.target.phone_last4 ? "••" + r.target.phone_last4 : ""})` : ""}</div>
            {r.detail && <div className="mt-1 rounded-lg bg-gray-50 p-2 text-gray-700">{r.detail}</div>}
            <div className="mt-1 text-[11px] font-bold text-[#7A0C2E]">💡 Suggested: {ACTION_TE[r.suggested_action] || r.suggested_action}</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <input value={note[r.report_id] || ""} onChange={(e) => setNote({ ...note, [r.report_id]: e.target.value })}
                placeholder={te ? "admin note (audit)" : "admin note (audit)"} className="min-w-[140px] flex-1 rounded-lg border px-2 py-1.5" aria-label="admin note" />
              {actions.map((a) => (
                <button key={a} onClick={() => void resolve(r.report_id, a)}
                  className={`rounded-full px-3 py-1.5 font-bold ${a === r.suggested_action ? "bg-[#7A0C2E] text-white" : a === "ban" ? "bg-red-100 text-red-700" : "bg-gray-100"}`}>
                  {ACTION_TE[a] || a}
                </button>
              ))}
            </div>
          </div>
        ))}
        {!items.length && <p className="text-xs text-gray-400">{te ? "Open reports లేవు — అన్నీ clean ✅" : "No open reports — all clean ✅"}</p>}
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

  const load = async () => {
    try {
      const d = await fetch(withToken(`/api/admin/stories?status=${st}&limit=50`), { headers: authHeaders(true) }).then((r) => r.json());
      if (d.success) setItems(d.stories || []);
      else setFlash(d.detail || "Load fail");
    } catch { setFlash("Network problem"); }
  };
  useEffect(() => { void load(); }, [st]);

  const act = async (id: string, action: string) => {
    const r = await fetch(withToken(`/api/admin/stories/${id}/action`),
      { method: "POST", headers: H(), body: JSON.stringify({ action, note: note[id] || "" }) });
    const d = await r.json();
    setFlash(d.story ? `✅ ${id} → ${d.story.status}` : (d.detail || "done"));
    if (d.share_text) setShare(d.share_text);
    void load();
  };

  return (
    <div>
      <div className="my-2 flex gap-2">
        {[["pending", te ? "Pending" : "Pending"], ["approved", te ? "Approved" : "Approved"], ["rejected", te ? "Rejected" : "Rejected"]].map(([v, l]) => (
          <button key={v} onClick={() => setSt(v)}
            className={`rounded-full px-3 py-1 text-xs font-bold ${st === v ? "maroon-gradient text-white" : "bg-gray-100"}`}>{l}</button>
        ))}
        <button onClick={() => void load()} className="ml-auto text-xs underline">↻ refresh</button>
      </div>
      {flash && <div className="mb-2 rounded-xl bg-[#0F1F3C] p-2 text-xs text-white">{flash}</div>}
      {share && (
        <div className="mb-2 rounded-xl border border-green-200 bg-green-50 p-2 text-xs">
          <div className="font-bold text-green-800">📢 Approved — ee text channel/WhatsApp లో forward చెయ్యండి:</div>
          <pre className="mt-1 whitespace-pre-wrap">{share}</pre>
          <button onClick={() => { navigator.clipboard?.writeText(share); setFlash("📋 copy అయ్యింది"); }} className="mt-1 rounded-full bg-green-700 px-3 py-1 font-bold text-white">📋 Copy</button>
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
            {s.photo_url && <a href={s.photo_url} target="_blank" rel="noreferrer" className="mt-1 inline-block font-bold text-[#7A0C2E] underline">🖼️ photo →</a>}
            {st === "pending" && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                <input value={note[s.story_id] || ""} onChange={(e) => setNote({ ...note, [s.story_id]: e.target.value })}
                  placeholder={te ? "note (optional)" : "note (optional)"} className="min-w-[140px] flex-1 rounded-lg border px-2 py-1.5" aria-label="note" />
                <button onClick={() => void act(s.story_id, "approve")} className="rounded-full bg-green-600 px-4 py-1.5 font-bold text-white">✅ Approve</button>
                <button onClick={() => void act(s.story_id, "reject")} className="rounded-full bg-red-500 px-4 py-1.5 font-bold text-white">❌ Reject</button>
              </div>
            )}
          </div>
        ))}
        {!items.length && <p className="text-xs text-gray-400">{te ? "Stories లేవు." : "No stories."}</p>}
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

  const load = async () => {
    try {
      const d = await fetch(withToken(`/api/leads${st ? `?status=${st}` : ""}&limit=100`), { headers: authHeaders(true) }).then((r) => r.json());
      if (d.items) { setItems(d.items); setTotal(d.total ?? d.items.length); }
      else setFlash(d.detail || "Load fail");
    } catch { setFlash("Network problem"); }
  };
  useEffect(() => { void load(); }, [st]);

  const followup = async (id: string) => {
    const r = await fetch(withToken(`/api/leads/followup/${id}`), { method: "POST", headers: authHeaders(true) });
    const d = await r.json();
    setFlash(d.success ? `✅ ${id} → contacted (WhatsApp queue)` : (d.detail || "done"));
    void load();
  };

  return (
    <div>
      <p className="telugu mt-2 text-xs text-gray-500">{te ? "కొత్త leads కి 24h లోపు follow-up — response 3x. Call/WhatsApp: number పక్కన link." : "Follow up new leads within 24h — 3x response. Call/WhatsApp via number link."} ({total})</p>
      <div className="my-2 flex gap-2">
        {[["", te ? "అన్నీ" : "all"], ["new", "new"], ["contacted", "contacted"], ["converted", "converted"]].map(([v, l]) => (
          <button key={v} onClick={() => setSt(v)}
            className={`rounded-full px-3 py-1 text-xs font-bold ${st === v ? "maroon-gradient text-white" : "bg-gray-100"}`}>{l}</button>
        ))}
        <button onClick={() => void load()} className="ml-auto text-xs underline">↻ refresh</button>
      </div>
      {flash && <div className="mb-2 rounded-xl bg-[#0F1F3C] p-2 text-xs text-white">{flash}</div>}
      <div className="space-y-2 max-h-[420px] overflow-auto pr-1">
        {items.map((l) => (
          <div key={l.id} className="rounded-xl border p-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold">{l.name || "(no name)"}</span>
              {l.phone && <a href={`https://wa.me/91${l.phone}`} target="_blank" rel="noreferrer" className="font-mono font-bold text-green-700 underline">📞 {l.phone}</a>}
              <span className={`px-2 py-0.5 rounded-full font-bold ${l.status === "converted" ? "bg-green-100 text-green-700" : l.status === "contacted" ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"}`}>{l.status}</span>
              <span className="text-gray-500">{l.gender} {l.age} • {l.district} {l.caste} • {l.source}</span>
              <span className="ml-auto text-gray-400">touches:{l.touches ?? 1} • {String(l.at || "").slice(0, 16).replace("T", " ")}</span>
            </div>
            {l.status !== "converted" && (
              <button onClick={() => void followup(l.id)} className="mt-2 rounded-full bg-green-600 px-4 py-1.5 font-bold text-white">💬 WhatsApp follow-up</button>
            )}
          </div>
        ))}
        {!items.length && <p className="text-xs text-gray-400">{te ? "Leads లేవు." : "No leads."}</p>}
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

  const load = async () => {
    try {
      const d = await fetch(withToken("/api/publish/status"), { headers: authHeaders(true) }).then((r) => r.json());
      if (d.success) setPub(d);
      const w = await fetch(withToken("/api/wa/dead?limit=20"), { headers: authHeaders(true) }).then((r) => r.json());
      if (w.items) { setDead(w.items); setDeadCount(w.count ?? w.items.length); }
      else if (w.detail) setFlash(w.detail);
    } catch { setFlash("Network problem"); }
  };
  useEffect(() => { void load(); }, []);

  const requeue = async () => {
    const r = await fetch(withToken("/api/wa/dead/requeue?limit=20"), { method: "POST", headers: authHeaders(true) });
    const d = await r.json();
    setFlash(d.message_telugu || d.detail || "done");
    void load();
  };
  const republish = async () => {
    if (!tsap.trim()) { setFlash(te ? "Profile ID ఇవ్వండి" : "Give Profile ID"); return; }
    const r = await fetch(withToken(`/api/publish/now/${tsap.trim().toUpperCase()}?score=92`), { method: "POST", headers: authHeaders(true) });
    const d = await r.json();
    setFlash(d.success ? `✅ re-post queued → ${(d.targets || []).length} targets` : (d.detail || "done"));
  };
  const digest = async () => {
    const r = await fetch(withToken("/api/publish/digest"), { method: "POST", headers: authHeaders(true) });
    const d = await r.json();
    setFlash(d.success ? "✅ Digest → Telegram + WhatsApp queue" : (d.detail || "done"));
  };

  return (
    <div>
      {flash && <div className="my-2 rounded-xl bg-[#0F1F3C] p-2 text-xs text-white">{flash}</div>}
      {pub && (
        <div className="grid grid-cols-2 gap-2 text-center text-xs md:grid-cols-4">
          {[["Telegram", pub.telegram?.configured ? (te ? "ready" : "ready") : "dry-run"], ["WA mode", pub.whatsapp?.mode || pub.wa_mode || "—"],
            ["Worker", pub.worker_running ? "▶️" : "⏸️"], ["Dead", deadCount]].map(([l, v]) => (
            <div key={l as string} className="rounded-xl border bg-gray-50 p-2">
              <div className="font-extrabold text-[#7A0C2E]">{String(v ?? "—")}</div>
              <div className="text-[11px] text-gray-500">{l}</div>
            </div>
          ))}
        </div>
      )}
      <div className="my-2 flex flex-wrap items-center gap-2 text-xs">
        <input value={tsap} onChange={(e) => setTsap(e.target.value)} placeholder="RED001"
          className="rounded-lg border px-3 py-1.5 font-mono" aria-label="Profile ID" />
        <button onClick={() => void republish()} className="rounded-full bg-[#7A0C2E] px-4 py-1.5 font-bold text-white">🔁 Re-post profile</button>
        <button onClick={() => void digest()} className="rounded-full bg-[#0F1F3C] px-4 py-1.5 font-bold text-white">🌅 Send digest now</button>
        <button onClick={() => void load()} className="ml-auto underline">↻ refresh</button>
      </div>
      <div className="rounded-xl border p-3 text-xs">
        <div className="flex items-center gap-2">
          <b>💀 Dead letters ({deadCount})</b>
          <button onClick={() => void requeue()} disabled={!dead.length} className="ml-auto rounded-full bg-green-600 px-3 py-1 font-bold text-white disabled:opacity-40">♻️ Requeue all</button>
        </div>
        <p className="mt-1 text-[11px] text-gray-500">{te ? "3 tries fail → bridge/QR fix chesaka requeue." : "Failed after 3 tries → fix bridge/QR, then requeue."}</p>
        <div className="mt-2 max-h-[180px] space-y-1 overflow-auto">
          {dead.map((m: Row, i: number) => (
            <div key={i} className="rounded-lg bg-gray-50 px-2 py-1 font-mono text-[11px]">
              {m.kind || m.phone || ""} → {(m.targets || m.phones || []).join?.(", ") || m.to || ""} • {String(m.error || m.last_error || "").slice(0, 60)}
            </div>
          ))}
          {!dead.length && <p className="text-gray-400">✅ Dead letters లేవు.</p>}
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
      const r = await fetch(withToken("/api/digest/personal/preview"), { headers: authHeaders(true) });
      const d = await r.json();
      if (d.success) setPrev(d);
      else setFlash(d.detail || "load fail");
    } catch { setFlash(te ? "⚠️ API error" : "⚠️ API error"); }
    finally { setBusy(false); }
  };
  useEffect(() => { void load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const run = async () => {
    setBusy(true); setFlash("");
    try {
      const r = await fetch(withToken("/api/digest/personal/run"), { method: "POST", headers: H(), body: JSON.stringify({ lang: te ? "te" : "en" }) });
      const d = await r.json();
      if (d.success) {
        const s = d.send || {};
        setFlash(s.skipped
          ? `📬 Queue సిద్ధం: ${d.queued} మంది · 🔒 Send gated (${s.reason}) — ఏదీ పంపలేదు`
          : `📬 ${d.queued} queued · ✅ sent ${s.sent}`);
        void load();
      } else setFlash(d.detail || "run fail");
    } catch { setFlash(te ? "⚠️ API error" : "⚠️ API error"); }
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
        <b className="text-[#7A0C2E]">📬 Personalized daily digest</b>
        {prev?.send_gated && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-800">
            🔒 {te ? "Send GATED (ఆఫ్)" : "Send GATED (off)"}
          </span>
        )}
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-600">WA: {prev?.wa_mode || "—"}</span>
        <button onClick={() => void load()} disabled={busy} className="ml-auto underline disabled:opacity-40">↻</button>
      </div>
      <p className="mt-1 text-[11px] text-gray-500">
        {te
          ? "ప్రతి user కి వ్యక్తిగత digest (matchbot + saved searches). Generate మాత్రమే — send కి DIGEST_PERSONAL_SEND=1 + WhatsApp on కావాలి (live site కి safe)."
          : "Per-user personalized digest (matchbot + saved searches). Generation only — sending needs DIGEST_PERSONAL_SEND=1 + WhatsApp on (safe for live site)."}
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
              <span className="whitespace-pre-wrap text-gray-700">{String(s.text || "").slice(0, 160)}</span>
            </div>
          ))}
        </div>
      )}
      <div className="mt-2 flex flex-wrap gap-2">
        <button onClick={() => void run()} disabled={busy}
          className="rounded-full bg-[#7A0C2E] px-4 py-1.5 font-bold text-white disabled:opacity-40">
          {te ? "📬 Queue generate చేయండి" : "📬 Generate queue"}
        </button>
      </div>
    </div>
  );
}
