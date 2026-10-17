"use client";
/**
 * 📡 WAVE 15 — ADMIN CHANNEL MAPPER + SMART POSTER
 * Links map (telegram/whatsapp) + bulk import + coverage gaps + poster jitter.
 * ADMIN ONLY.
 */
import { useCallback, useEffect, useState } from "react";
import { apiDisplayMessage, authHeaders, readApiJson } from "@/lib/api";
import { useLang } from "@/lib/lang";

type Row = Record<string, any>;
const adminToken = () => { try { return localStorage.getItem("tsap_admin_token") || ""; } catch { return ""; } };
const withToken = (url: string) => {
  const tk = adminToken();
  return tk ? `${url}${url.includes("?") ? "&" : "?"}token=${encodeURIComponent(tk)}` : url;
};
const H = () => ({ ...authHeaders(true), "Content-Type": "application/json" });
const audienceLabel = (c: Row, te: boolean) => c.audience === "bride"
  ? (te ? "👰 వధువు" : "👰 Bride")
  : c.audience === "groom" ? (te ? "🤵 వరుడు" : "🤵 Groom") : (te ? "👥 వధువు + వరుడు" : "👥 Bride + Groom");
const channelLabel = (c: Row, te: boolean) => {
  const fallback = `${c.cluster || c.key}${c.gender ? ` — ${c.gender}` : ""}`;
  if (te) return c.name || fallback;
  const label = String(c.name_en || c.name || fallback);
  return /[\u0c00-\u0c7f]/.test(label) ? fallback.replace(/_/g, " ") : label;
};
const importLabel = (item: Row, te: boolean) => te
  ? String(item.label || item.key || "తెలియని ఛానెల్")
  : apiDisplayMessage({ message_en: item.label_en || item.label || item.key }, false, "Channel label not available in English.");
const importHint = (item: Row, te: boolean) => te
  ? String(item.hint || "మాన్యువల్‌గా పరిశీలించండి")
  : apiDisplayMessage({ message_en: item.hint_en || item.hint }, false, "Review the channel label and add or update its links in the directory.");

export default function ChannelsConsole() {
  const { lang } = useLang();
  const te = lang === "te";
  const [items, setItems] = useState<Row[]>([]);
  const [cov, setCov] = useState<Row | null>(null);
  const [q, setQ] = useState("");
  const [flash, setFlash] = useState("");
  const [editing, setEditing] = useState<string>("");
  const [ed, setEd] = useState<Row>({});
  const [bulk, setBulk] = useState("");
  const [preview, setPreview] = useState<Row | null>(null);
  const [poster, setPoster] = useState<Row | null>(null);
  const [gaps, setGaps] = useState({ min_gap: "120", max_gap: "170" });
  const [audience, setAudience] = useState("all");
  const [tier, setTier] = useState("all");

  const load = useCallback(async (searchQuery: string) => {
    try {
      const d = await fetch(withToken(`/api/admin/channels/map${searchQuery ? `?q=${encodeURIComponent(searchQuery)}` : ""}`),
        { headers: authHeaders(true) }).then((r) => readApiJson(r));
      if (d?.success) setItems(d.channels || []);
      const c = await fetch(withToken("/api/admin/channels/coverage"), { headers: authHeaders(true) }).then((r) => readApiJson(r));
      if (c?.success) setCov(c);
      const p = await fetch(withToken("/api/admin/poster"), { headers: authHeaders(true) }).then((r) => readApiJson(r));
      if (p?.success) {
        setPoster(p);
        if (p.gaps) setGaps({ min_gap: String(p.gaps.min_gap ?? 120), max_gap: String(p.gaps.max_gap ?? 170) });
      }
    } catch { setFlash(te ? "నెట్‌వర్క్ సమస్య. మళ్లీ ప్రయత్నించండి." : "Network problem. Please try again."); }
  }, [te]);
  useEffect(() => { void load(""); }, [load]);

  const save = async (key: string) => {
    const r = await fetch(withToken("/api/admin/channels/link"), { method: "POST", headers: H(), body: JSON.stringify({ key, ...ed }) });
    const d = await readApiJson(r);
    setFlash(apiDisplayMessage(d, te, r.ok ? (te ? "పరివర్తన పూర్తయింది." : "Action completed.") : (te ? "లింక్‌ను సేవ్ చేయలేకపోయాం." : "Could not save the links.")));
    if (r.ok) { setEditing(""); void load(q); }
  };
  const doImport = async (auto: boolean) => {
    const r = await fetch(withToken("/api/admin/channels/import"), { method: "POST", headers: H(), body: JSON.stringify({ text: bulk, auto_apply: auto }) });
    const d = await readApiJson(r);
    setFlash(apiDisplayMessage(d, te, r.ok ? (te ? "పరివర్తన పూర్తయింది." : "Import completed.") : (te ? "ఇంపోర్ట్ చేయలేకపోయాం." : "Could not import the channel links.")));
    if (d?.success) { setPreview(d); if (auto) { setBulk(""); void load(q); } }
  };
  const pauseResume = async (pause: boolean) => {
    const r = await fetch(withToken(pause ? "/api/wa/pause?reason=admin-console" : "/api/wa/resume"), { method: "POST", headers: authHeaders(true) });
    const d = await readApiJson(r);
    setFlash(d.ok
      ? (pause ? (te ? "⏸️ పోస్టర్ పంపిణీ నిలిపివేయబడింది." : "⏸️ Posting paused.") : (te ? "▶️ పోస్టింగ్ మళ్లీ ప్రారంభమైంది." : "▶️ Posting resumed."))
      : apiDisplayMessage(d, te, te ? "పోస్టర్ స్థితిని మార్చలేకపోయాం." : "Could not update posting status."));
    void load(q);
  };
  const saveGaps = async () => {
    const r = await fetch(withToken("/api/admin/poster/gaps"), { method: "POST", headers: H(), body: JSON.stringify({ min_gap: gaps.min_gap, max_gap: gaps.max_gap }) });
    const d = await readApiJson(r);
    setFlash(apiDisplayMessage(d, te, r.ok ? (te ? "పరివర్తన పూర్తయింది." : "Settings saved.") : (te ? "సెట్టింగ్‌లను సేవ్ చేయలేకపోయాం." : "Could not save the settings.")));
    void load(q);
  };

  return (
    <div>
      <p className="telugu mt-2 text-xs text-gray-500">
        {te ? "Telegram/WhatsApp directory links ఇక్కడ map చెయ్యండి — URL host/format validate అవుతుంది; external availability తనిఖీ చేయబడదు." : "Map Telegram/WhatsApp directory links here — URL host/format is validated; external availability is not checked."}
        Bulk paste → preview → apply.
      </p>
      {flash && <div className="my-2 rounded-xl bg-[#0F1F3C] text-white text-xs p-2">{flash}</div>}

      {cov && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 my-2">
          {[["Channel listings", cov.total], ["Routing-eligible flags", cov.routing_eligible], ["WhatsApp URLs listed (unchecked)", cov.with_whatsapp],
            ["✏️ Customized", cov.customized]].map(([l, v]) => (
            <div key={l as string} className="rounded-xl bg-rose-50 border border-rose-100 p-2 text-center">
              <div className="text-lg font-extrabold text-[#7A0C2E]">{String(v ?? 0)}</div>
              <div className="text-[11px] text-gray-500">{l}</div>
            </div>
          ))}
          <div className={`rounded-xl border p-2 text-center ${(cov.critical_gaps || []).length ? "bg-amber-50 border-amber-200" : "bg-green-50 border-green-200"}`}>
            <div className="text-[11px] font-bold">{(cov.critical_gaps || []).length ? `⚠️ Not flagged routing-eligible: ${(cov.critical_gaps || []).join(", ")}` : "Registry flags present; external status unchecked"}</div>
          </div>
        </div>
      )}

      {/* poster */}
      {poster && (
        <div className="rounded-xl border p-3 text-xs my-2 bg-blue-50/40">
          <div className="font-bold text-[#0F1F3C]">
            📮 Smart Poster — {poster.paused ? "⏸️ PAUSED" : "▶️ RUNNING"} • random gap {poster.gaps?.min_gap}–{poster.gaps?.max_gap}s + jitter + coffee-breaks
          </div>
          <div className="mt-2 flex flex-wrap gap-2 items-center">
            <input value={gaps.min_gap} onChange={(e) => setGaps({ ...gaps, min_gap: e.target.value })} className="w-20 rounded-lg border px-2 py-1" aria-label="Min gap" inputMode="numeric" />
            <span>–</span>
            <input value={gaps.max_gap} onChange={(e) => setGaps({ ...gaps, max_gap: e.target.value })} className="w-20 rounded-lg border px-2 py-1" aria-label="Max gap" inputMode="numeric" />
            <span className="text-gray-500">sec</span>
            <button type="button" onClick={() => void saveGaps()} className="rounded-lg bg-blue-700 text-white px-3 py-1 font-bold">💾 Gaps</button>
            {poster.paused
              ? <button type="button" onClick={() => void pauseResume(false)} className="rounded-lg bg-green-700 text-white px-3 py-1 font-bold">▶️ Resume</button>
              : <button type="button" onClick={() => void pauseResume(true)} className="rounded-lg bg-gray-700 text-white px-3 py-1 font-bold">⏸️ Pause</button>}
          </div>
        </div>
      )}

      {/* bulk import */}
      <div className="rounded-xl border p-3 text-xs space-y-2 my-2">
        <div className="font-bold text-[#7A0C2E]">📋 Bulk import — <span className="font-mono">Label | tg-link | wa-link</span> (one per line)</div>
        <textarea value={bulk} onChange={(e) => setBulk(e.target.value)} rows={3} placeholder={"Label | https://t.me/<owner-provided-username> | https://whatsapp.com/channel/<owner-provided-channel-id>\nPaste verified, owner-provided links only; leave unknown destinations blank."}
          className="w-full rounded-lg border px-2 py-1.5 font-mono" aria-label="Bulk import" />
        <div className="flex gap-2">
          <button type="button" onClick={() => void doImport(false)} className="rounded-lg bg-blue-600 text-white px-4 py-1.5 font-bold">🔍 Preview match</button>
          <button type="button" onClick={() => void doImport(true)} className="rounded-lg bg-green-700 text-white px-4 py-1.5 font-bold">✅ Apply all matched</button>
        </div>
        {preview && (
          <div className="grid md:grid-cols-2 gap-2">
            <div className="rounded-lg bg-green-50 p-2">
              <div className="font-bold text-green-800">✅ Matched ({preview.matched?.length || 0})</div>
              {(preview.matched || []).slice(0, 12).map((m: Row) => (
                <div key={m.key + m.label} className="text-[11px]">{importLabel(m, te)} → <b className="font-mono">{m.key}</b> ({m.score})</div>
              ))}
            </div>
            <div className="rounded-lg bg-amber-50 p-2">
              <div className="font-bold text-amber-800">⚠️ Manual ({preview.unmatched?.length || 0})</div>
              {(preview.unmatched || []).slice(0, 12).map((m: Row, i: number) => (
                <div key={i} className="text-[11px]">{importLabel(m, te)} <span className="text-gray-500">— {importHint(m, te)}</span></div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* table */}
      <div className="flex flex-wrap gap-2 my-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void load(q)}
          placeholder="Search caste / channel…" className="min-w-[180px] flex-1 rounded-full border px-4 py-1.5 text-xs" aria-label="Search" />
        <select value={audience} onChange={e => setAudience(e.target.value)} className="rounded-full border px-3 py-1.5 text-xs" aria-label="Audience">
          <option value="all">{te ? "అన్ని ప్రేక్షకులు" : "All audiences"}</option><option value="bride">{te ? "👰 వధువులు" : "👰 Brides"}</option><option value="groom">{te ? "🤵 వరులు" : "🤵 Grooms"}</option><option value="both">{te ? "👥 ఉమ్మడి" : "👥 Shared"}</option>
        </select>
        <select value={tier} onChange={e => setTier(e.target.value)} className="rounded-full border px-3 py-1.5 text-xs" aria-label="Tier">
          <option value="all">All groups</option><option value="L1_REGION">Regions</option><option value="L2_RELIGION">Religion</option><option value="L3_CASTE">Caste</option><option value="L4_SPECIAL">Special</option>
        </select>
        <button type="button" aria-label={te ? "వెతకండి" : "Search channels"} onClick={() => void load(q)} className="rounded-full bg-[#7A0C2E] text-white px-4 py-1.5 text-xs font-bold">🔍</button>
      </div>
      <p className="mb-2 text-[11px] text-gray-500">{items.filter(c => (audience === "all" || c.audience === audience) && (tier === "all" || c.tier === tier)).length}{te ? " channels shown · ప్రతి community/gender channel ను విడిగా గుర్తించాం." : " channels shown · each community and gender split is labelled separately."}</p>
      <div className="space-y-1.5 max-h-[420px] overflow-auto pr-1">
        {items.filter(c => (audience === "all" || c.audience === audience) && (tier === "all" || c.tier === tier)).slice(0, 120).map((c) => (
          <div key={c.key} className="rounded-xl border p-2.5 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono font-bold">{c.key}</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${c.routing_eligible ? "bg-sky-100 text-sky-700" : "bg-gray-100 text-gray-500"}`}>{c.routing_eligible ? "ROUTING ELIGIBLE" : "NOT MARKED"}</span>
              {!c.active && <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">OFF</span>}
              {c.customized && <span className="text-[10px] text-blue-700">✏️</span>}
              <span className="text-gray-600 truncate max-w-[220px]">{channelLabel(c, te)}</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold">{audienceLabel(c, te)}</span>
              <span className="ml-auto flex gap-1">
                {c.telegram && <a href={c.telegram} target="_blank" rel="noreferrer" className="rounded-lg bg-sky-600 text-white px-2.5 py-1 text-[11px] font-bold">✈️ Telegram</a>}
                {c.whatsapp && <a href={c.whatsapp} target="_blank" rel="noreferrer" className="rounded-lg bg-green-600 text-white px-2.5 py-1 text-[11px] font-bold">💬 WhatsApp</a>}
                <button type="button" onClick={() => { setEditing(editing === c.key ? "" : c.key); setEd({ telegram: c.telegram, whatsapp: c.whatsapp, active: c.active, note: c.note }); }}
                  className="rounded-lg bg-blue-600 text-white px-3 py-1 text-[11px] font-bold">✏️ Links</button>
              </span>
            </div>
            <div className="mt-0.5 text-[11px] text-gray-500 truncate">
              TG: {c.telegram || "—"} • WA: {c.whatsapp || "—"}
            </div>
            {c.members?.length > 0 && <div className="mt-0.5 text-[10px] text-gray-400 truncate">Communities: {c.members.join(" • ")}</div>}
            {editing === c.key && (
              <div className="mt-2 rounded-lg bg-blue-50/60 p-2 space-y-1.5">
                <input value={ed.telegram || ""} onChange={(e) => setEd({ ...ed, telegram: e.target.value })} placeholder="https://t.me/..." className="w-full rounded border px-2 py-1" aria-label="Telegram" />
                <input value={ed.whatsapp || ""} onChange={(e) => setEd({ ...ed, whatsapp: e.target.value })} placeholder="https://whatsapp.com/channel/..." className="w-full rounded border px-2 py-1" aria-label="WhatsApp" />
                <div className="flex gap-2 items-center">
                  <label className="flex items-center gap-1 text-[11px]">
                    <input type="checkbox" checked={!!ed.active} onChange={(e) => setEd({ ...ed, active: e.target.checked })} /> Active
                  </label>
                  <input value={ed.note || ""} onChange={(e) => setEd({ ...ed, note: e.target.value })} placeholder="note" className="flex-1 rounded border px-2 py-1" aria-label="Note" />
                  <button type="button" aria-label={te ? "ఛానెల్ సేవ్ చేయండి" : "Save channel"} onClick={() => void save(c.key)} className="rounded-lg bg-green-700 text-white px-3 py-1 font-bold">💾</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
