"use client";
/**
 * 📢 WAVE 13 — ADMIN ADS CONSOLE
 * Campaign queue (UTR approve → LIVE) + pause/reject + revenue stats.
 */
import { useEffect, useState } from "react";
import { apiDisplayMessage, authHeaders, readApiJson } from "@/lib/api";
import { useLang } from "@/lib/lang";

type Row = Record<string, any>;

export default function AdsConsole() {
  const { lang } = useLang();
  const te = lang === "te";
  const displayDynamicText = (value: unknown, fallback = "Not available in English") => te
    ? String(value ?? "")
    : apiDisplayMessage({ message_en: value }, false, fallback);
  const [items, setItems] = useState<Row[]>([]);
  const [status, setStatus] = useState("pending");
  const [stats, setStats] = useState<Row | null>(null);
  const [utr, setUtr] = useState<Record<string, string>>({});
  const [flash, setFlash] = useState("");
  const [editing, setEditing] = useState<string>("");
  const [ed, setEd] = useState<Row>({});

  const load = async (st: string) => {
    try {
      const d = await fetch(`/api/admin/ads${st ? `?status=${st}` : ""}`, { headers: authHeaders(true) }).then((r) => readApiJson(r));
      if (d.success) setItems(d.campaigns || []);
      const s = await fetch("/api/admin/ads/stats", { headers: authHeaders(true) }).then((r) => readApiJson(r));
      if (s.success) setStats(s);
    } catch { /* ignore */ }
  };
  useEffect(() => { void load(status); }, [status]);

  const approve = async (id: string) => {
    const u = (utr[id] || "").trim();
    if (!u) { setFlash(te ? "⚠️ UTR లేకుండా approve చెయ్యకూడదు" : "⚠️ Cannot approve without UTR"); return; }
    const r = await fetch(`/api/admin/ads/${id}/approve`,
      { method: "POST", headers: { ...authHeaders(true), "Content-Type": "application/json" },
        body: JSON.stringify({ utr: u }) });
    const d = await readApiJson(r);
    setFlash(d.message_telugu || d.detail || "done");
    void load(status);
  };
  const startEdit = (c: Row) => {
    setEditing(c.id);
    setEd({ title: c.title || "", offer: c.offer || "", days: String(c.days || ""),
      districts: (c.districts || []).join(","), state: c.state || "",
      slots: (c.slots || []).join(","), start: String(c.start || "").slice(0, 10),
      end: String(c.end || "").slice(0, 10), link: c.link || "" });
  };
  const saveEdit = async (id: string) => {
    const body: Row = { title: ed.title, offer: ed.offer, link: ed.link, state: ed.state };
    if (ed.days) body.days = Number(ed.days);
    if (ed.districts !== undefined) body.districts = String(ed.districts || "").split(",").map((x: string) => x.trim()).filter(Boolean);
    if (ed.slots !== undefined) body.slots = String(ed.slots || "").split(",").map((x: string) => x.trim()).filter(Boolean);
    if (ed.start) body.start = ed.start;
    if (ed.end) body.end = ed.end;
    const r = await fetch(`/api/admin/ads/${id}/update`,
      { method: "POST", headers: { ...authHeaders(true), "Content-Type": "application/json" },
        body: JSON.stringify(body) });
    const d = await readApiJson(r);
    setFlash(d.message_telugu || d.detail || "done");
    if (r.ok) setEditing("");
    void load(status);
  };
  const act = async (id: string, action: string) => {
    const r = await fetch(`/api/admin/ads/${id}/action`,
      { method: "POST", headers: { ...authHeaders(true), "Content-Type": "application/json" },
        body: JSON.stringify({ action }) });
    const d = await readApiJson(r);
    setFlash(d.message_telugu || d.detail || "done");
    void load(status);
  };

  return (
    <div>
      <p className="telugu mt-2 text-xs text-gray-500">
{te ? <>Vendor (photo/decor/mall...) campaign → payment verify → <b>approve</b> చేస్తే district/state scope లో LIVE.
        Days అయిపోతే auto-expire · impressions/clicks auto-track.</> : <>Vendor (photo/decor/mall...) campaign → payment verify → <b>approve</b> to go LIVE in district/state scope.
        Auto-expires after days · impressions/clicks auto-tracked.</>}
      </p>
      {stats ? (
        <div className="mt-3 grid grid-cols-2 gap-3 text-center md:grid-cols-6">
          {[
            { l: "Campaigns", v: stats.total }, { l: "🟢 Live", v: stats.live },
            { l: "⏳ Pending", v: stats.pending }, { l: "💰 Collected ₹", v: stats.collected },
            { l: "👁️ Views", v: stats.impressions }, { l: "🖱️ Clicks", v: stats.clicks },
          ].map((x) => (
            <div key={x.l} className="rounded-2xl bg-gray-50 p-3">
              <div className="text-xl font-bold text-[#7A0C2E]">{x.v}</div>
              <div className="text-[11px] text-gray-500">{x.l}</div>
            </div>
          ))}
        </div>
      ) : null}
      {flash ? <div className="mt-2 rounded-xl bg-[#0F1F3C] p-2 text-xs text-white">{flash}</div> : null}
      <div className="mt-2 flex gap-2">
        <select value={status} onChange={(e) => setStatus(e.target.value)}
          aria-label="Status" className="rounded-full border px-3 py-1.5 text-xs">
          <option value="pending">pending</option><option value="active">active</option>
          <option value="paused">paused</option><option value="expired">expired</option>
          <option value="rejected">{te ? "తిరస్కరించబడింది" : "Rejected"}</option><option value="">{te ? "అన్నీ" : "All statuses"}</option>
        </select>
      </div>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full text-xs">
          <thead><tr className="border-b text-left text-gray-500">
            <th className="p-2">Campaign</th><th>Scope</th><th>Media/Slots</th><th>₹/Days</th><th>Stats</th><th>UTR / Action</th>
          </tr></thead>
          <tbody>
            {items.length === 0 ? <tr><td colSpan={6} className="p-4 text-center text-gray-500">{te ? "ఈ status లో campaigns లేవు 🙂" : "No campaigns in this status 🙂"}</td></tr> : null}
            {items.map((c) => (
              <tr key={c.id} className="border-b align-top">
                <td className="p-2">
                  <div className="font-bold">{apiDisplayMessage({ message_en: c.title_en, message: c.title }, te, te ? "శీర్షిక లేదు" : "Campaign title not available in English")}</div>
                  <div className="font-mono text-[10px] text-gray-500">{c.id} · vendor {c.vendor_id}</div>
                  {c.offer ? <div className="text-[11px] text-green-700">🎁 {apiDisplayMessage({ message_en: c.offer_en, message: c.offer }, te, te ? "వివరాలు లేవు" : "Offer details not available in English")}</div> : null}
                  <div className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] ${c.status === "active" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>{c.status}{c.end ? ` → ${String(c.end).slice(0, 10)}` : ""}</div>
                </td>
                <td className="p-2">
                  <b>{c.level}</b>
                  <div className="text-[10px] text-gray-500">{c.level === "district" ? (c.districts || []).map((district: unknown) => displayDynamicText(district, "Location in original language")).join(", ") : c.level === "state" ? displayDynamicText(c.state, "Location in original language") : "TS+AP"}</div>
                </td>
                <td className="p-2 text-[10px]">
                  <div>{c.image_url || c.banner_url ? "🖼️ photo/banner" : "—"} {c.video_url ? "🎬 video" : ""}</div>
                  <div className="text-gray-500">{(c.slots || []).join(", ")}</div>
                </td>
                <td className="p-2"><b className="text-[#7A0C2E]">₹{c.amount}</b><div className="text-[10px] text-gray-500">{c.days}d · ₹{c.per_day}/d</div></td>
                <td className="p-2 text-[10px]">👁️ {c.impressions} · 🖱️ {c.clicks}</td>
                <td className="p-2">
                  <button type="button" onClick={() => (editing === c.id ? setEditing("") : startEdit(c))}
                    className="mb-1 rounded-full bg-blue-600 px-3 py-1 text-white">✏️ Edit</button>
                  {editing === c.id ? (
                    <div className="mb-2 rounded-xl border bg-blue-50/50 p-2 space-y-1 min-w-[220px]">
                      <input value={ed.title || ""} onChange={(e) => setEd({ ...ed, title: e.target.value })} placeholder="Title" aria-label="Title" className="w-full rounded border px-2 py-1" />
                      <input value={ed.offer || ""} onChange={(e) => setEd({ ...ed, offer: e.target.value })} placeholder="Offer" aria-label="Offer" className="w-full rounded border px-2 py-1" />
                      <div className="flex gap-1">
                        <input value={ed.days || ""} onChange={(e) => setEd({ ...ed, days: e.target.value })} placeholder="days" aria-label="Days" inputMode="numeric" className="w-16 rounded border px-2 py-1" />
                        <input value={ed.state || ""} onChange={(e) => setEd({ ...ed, state: e.target.value })} placeholder="state" aria-label="State" className="w-16 rounded border px-2 py-1" />
                      </div>
                      <input value={ed.districts || ""} onChange={(e) => setEd({ ...ed, districts: e.target.value })} placeholder="districts (csv)" aria-label="Districts" className="w-full rounded border px-2 py-1" />
                      <input value={ed.slots || ""} onChange={(e) => setEd({ ...ed, slots: e.target.value })} placeholder="slots (csv)" aria-label="Slots" className="w-full rounded border px-2 py-1" />
                      <div className="flex gap-1">
                        <input value={ed.start || ""} onChange={(e) => setEd({ ...ed, start: e.target.value })} placeholder="start YYYY-MM-DD" aria-label="Start" className="w-full rounded border px-2 py-1" />
                        <input value={ed.end || ""} onChange={(e) => setEd({ ...ed, end: e.target.value })} placeholder="end YYYY-MM-DD" aria-label="End" className="w-full rounded border px-2 py-1" />
                      </div>
                      <input value={ed.link || ""} onChange={(e) => setEd({ ...ed, link: e.target.value })} placeholder="link" aria-label="Link" className="w-full rounded border px-2 py-1" />
                      <button type="button" onClick={() => void saveEdit(c.id)} className="rounded-full bg-green-600 px-3 py-1 text-white">💾 Save</button>
                    </div>
                  ) : null}
                  {c.status === "pending" ? (
                    <div className="flex flex-col gap-1">
                      <input value={utr[c.id] || ""} onChange={(e) => setUtr({ ...utr, [c.id]: e.target.value })}
                        placeholder="UTR" aria-label="UTR" className="w-28 rounded-lg border px-2 py-1" />
                      <div className="flex gap-1">
                        <button type="button" onClick={() => void approve(c.id)} className="rounded-full bg-green-600 px-3 py-1 text-white">✅ Live</button>
                        <button type="button" aria-label={te ? "ప్రకటనను తిరస్కరించండి" : "Reject campaign"} onClick={() => void act(c.id, "reject")} className="rounded-full bg-red-500 px-3 py-1 text-white">❌</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-1">
                      {c.status === "active"
                        ? <button type="button" aria-label={te ? "ప్రకటనను నిలిపివేయండి" : "Pause campaign"} onClick={() => void act(c.id, "pause")} className="rounded-full bg-gray-200 px-3 py-1">⏸️</button>
                        : <button type="button" aria-label={te ? "ప్రకటనను పునఃప్రారంభించండి" : "Resume campaign"} onClick={() => void act(c.id, "resume")} className="rounded-full bg-green-600 px-3 py-1 text-white">▶️</button>}
                      <button type="button" aria-label={te ? "ప్రకటనను ముగించండి" : "Expire campaign"} onClick={() => void act(c.id, "expire")} className="rounded-full bg-gray-200 px-3 py-1">⏳</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
