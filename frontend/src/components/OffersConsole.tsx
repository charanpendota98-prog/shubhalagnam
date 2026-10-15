"use client";
/**
 * 🎉 WAVE 14 — ADMIN OFFERS CONSOLE
 * Festival promo codes: 1-click seed + create + ON/OFF. ADMIN ONLY.
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

export default function OffersConsole() {
  const { lang } = useLang();
  const te = lang === "te";
  const displayDynamicText = (value: unknown, fallback = "Not available in English") => te
    ? String(value ?? "")
    : apiDisplayMessage({ message_en: value }, false, fallback);
  const [items, setItems] = useState<Row[]>([]);
  const [flash, setFlash] = useState("");
  const [f, setF] = useState<Row>({ code: "", title: "", pct_off: "10", flat_off: "", applies_to: "credits,assisted", valid_from: "", valid_to: "", max_uses: "100", min_amount: "", festival: "" });

  const load = useCallback(async () => {
    try {
      const d = await fetch(withToken("/api/admin/offers"), { headers: authHeaders(true) }).then((r) => readApiJson(r));
      if (d?.success) setItems(d.offers || []);
      else setFlash(apiDisplayMessage(d, te, te ? "ఆఫర్‌లను లోడ్ చేయలేకపోయాం." : "Could not load offers."));
    } catch { setFlash(te ? "నెట్‌వర్క్ సమస్య" : "Network problem. Please try again."); }
  }, [te]);
  useEffect(() => { void load(); }, [load]);

  const seed = async () => {
    const r = await fetch(withToken("/api/admin/offers/seed"), { method: "POST", headers: H(), body: JSON.stringify({}) });
    const d = await readApiJson(r);
    setFlash(apiDisplayMessage(d, te, te ? "చర్య పూర్తయింది." : "Action completed."));
    void load();
  };
  const create = async () => {
    const r = await fetch(withToken("/api/admin/offers"), { method: "POST", headers: H(), body: JSON.stringify({
      code: f.code, title: f.title || f.code, pct_off: Number(f.pct_off || 0), flat_off: Number(f.flat_off || 0),
      applies_to: f.applies_to, valid_from: f.valid_from, valid_to: f.valid_to,
      max_uses: Number(f.max_uses || 100), min_amount: Number(f.min_amount || 0), festival: f.festival,
    }) });
    const d = await readApiJson(r);
    setFlash(apiDisplayMessage(d, te, te ? "చర్య పూర్తయింది." : "Action completed."));
    if (r.ok) { setF({ ...f, code: "", title: "" }); void load(); }
  };
  const del = async (code: string) => {
    if (!confirm(te ? `${code} — promo code ని permanent గా తీసెయ్యాలా?` : `${code} — permanently delete this promo code?`)) return;
    const r = await fetch(withToken(`/api/admin/offers/${encodeURIComponent(code)}`), { method: "DELETE", headers: H() });
    const d = await readApiJson(r);
    setFlash(apiDisplayMessage(d, te, te ? "చర్య పూర్తయింది." : "Action completed."));
    void load();
  };
  const toggle = async (code: string) => {
    const r = await fetch(withToken(`/api/admin/offers/${code}/toggle`), { method: "POST", headers: H() });
    const d = await readApiJson(r);
    setFlash(apiDisplayMessage(d, te, te ? "చర్య పూర్తయింది." : "Action completed."));
    void load();
  };

  return (
    <div>
      <p className="telugu mt-2 text-xs text-gray-500">
        {te
          ? <>పండుగ ఆఫర్ కోడ్‌తో అర్హమైన కొనుగోళ్లకు డిస్కౌంట్ వర్తిస్తుంది. తేదీలు, వినియోగ పరిమితులను సర్వర్ అమలు చేస్తుంది.</>
          : <>Festival offer codes apply the advertised discount to eligible purchases. The server enforces validity dates and usage limits.</>}
      </p>
      <div className="flex gap-2 my-2">
        <button onClick={() => void seed()} className="rounded-xl bg-[#7A0C2E] text-white px-4 py-2 text-xs font-bold">
          🪔 {te ? "పండుగ ఆఫర్‌లను ప్రారంభించండి" : "Enable available festival offers"}
        </button>
        <button onClick={() => void load()} className="text-xs underline ml-auto">↻ refresh</button>
      </div>
      {flash && <div className="mb-2 rounded-xl bg-[#0F1F3C] text-white text-xs p-2">{flash}</div>}
      <div className="rounded-xl border p-3 text-xs space-y-2 bg-rose-50/40">
        <div className="font-bold text-[#7A0C2E]">➕ {te ? "కొత్త ఆఫర్" : "Create an offer"}</div>
        <div className="grid md:grid-cols-4 gap-2">
          <input value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase() })} placeholder="Enter offer code" className="rounded-lg border px-2 py-1.5 font-mono" aria-label="Code" />
          <input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Title (🪔 Diwali Dhamaka)" className="rounded-lg border px-2 py-1.5" aria-label="Title" />
          <input value={f.pct_off} onChange={(e) => setF({ ...f, pct_off: e.target.value })} placeholder="% off" inputMode="numeric" className="rounded-lg border px-2 py-1.5" aria-label="Percent off" />
          <input value={f.flat_off} onChange={(e) => setF({ ...f, flat_off: e.target.value })} placeholder="₹ flat off" inputMode="numeric" className="rounded-lg border px-2 py-1.5" aria-label="Flat off" />
          <input value={f.applies_to} onChange={(e) => setF({ ...f, applies_to: e.target.value })} placeholder="applies: credits,assisted,ads,boost" className="rounded-lg border px-2 py-1.5" aria-label="Applies to" />
          <input value={f.valid_from} onChange={(e) => setF({ ...f, valid_from: e.target.value })} placeholder="from YYYY-MM-DD" className="rounded-lg border px-2 py-1.5" aria-label="Valid from" />
          <input value={f.valid_to} onChange={(e) => setF({ ...f, valid_to: e.target.value })} placeholder="to YYYY-MM-DD" className="rounded-lg border px-2 py-1.5" aria-label="Valid to" />
          <input value={f.max_uses} onChange={(e) => setF({ ...f, max_uses: e.target.value })} placeholder="max uses" inputMode="numeric" className="rounded-lg border px-2 py-1.5" aria-label="Max uses" />
        </div>
        <button onClick={() => void create()} className="rounded-lg bg-green-700 text-white px-4 py-1.5 text-xs font-bold">✅ Create offer</button>
      </div>
      <div className="mt-2 space-y-2">
        {items.map((o) => (
          <div key={o.code} className="rounded-xl border p-2.5 text-xs flex flex-wrap items-center gap-2">
            <span className={`px-2 py-0.5 rounded-full font-bold ${o.active ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-500"}`}>{o.active ? "ON" : "OFF"}</span>
            <span className="font-mono font-bold">{o.code}</span>
            <span>{displayDynamicText(o.title, "Offer title in original language")}</span>
            <span className="text-green-700 font-bold">{o.pct_off ? `${o.pct_off}%` : `₹${o.flat_off}`} OFF</span>
            <span className="text-gray-500">{(o.applies_to || []).join(",")} {o.valid_to ? `• till ${o.valid_to}` : ""} • used {o.used || 0}/{o.max_uses || 0}</span>
            <span className="ml-auto flex gap-1">
              <button onClick={() => void toggle(o.code)} className="rounded-lg bg-gray-800 text-white px-3 py-1 text-[11px] font-bold">ON/OFF</button>
              <button onClick={() => void del(o.code)} className="rounded-lg border border-rose-300 px-2 py-1 text-[11px] font-bold text-rose-700">🗑️</button>
            </span>
          </div>
        ))}
        {!items.length && <p className="text-xs text-gray-400">{te ? "Live offers లేవు — presets ON చెయ్యండి." : "No live offers — turn presets ON."}</p>}
      </div>
    </div>
  );
}
