"use client";

import "@/components/partner-workspace.css";

import { apiDisplayMessage, readApiJson } from "@/lib/api";
/**
 * 📢 WAVE 13 — VENDOR CAMPAIGN (ad create + live quote)
 * Vendor ID + token tho campaign request → UTR pay → admin approve → LIVE.
 */
import { useEffect, useState, useRef } from "react";
import Link from "@/components/LocaleLink";
import { useLang } from "@/lib/lang";

const DISTRICTS = ["Hyderabad", "Rangareddy", "Medchal", "Warangal", "Nizamabad", "Karimnagar", "Khammam",
  "Vijayawada", "Guntur", "Visakhapatnam", "Nellore", "Tirupati", "Rajahmundry", "Kurnool"];

export default function VendorCampaignPage() {
  const { lang } = useLang();
  const te = lang === "te";
  const [vendorId, setVendorId] = useState("");
  const [vToken, setVToken] = useState("");
  const [rates, setRates] = useState<any>(null);
  const [f, setF] = useState({ title: "", level: "district", days: 7, districts: [] as string[],
    state: "TS", slots: ["matches_sidebar"], image_url: "", banner_url: "", video_url: "", offer: "", link: "" });
  const [quote, setQuote] = useState<any>(null);
  const [msg, setMsg] = useState("");
  const [mine, setMine] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const quoteVersion = useRef(0);
  const updateForm = (next: typeof f) => { quoteVersion.current++; setF(next); setQuote(null); setMsg(""); };


  useEffect(() => {
    fetch("/api/ads/rates").then((r) => readApiJson(r)).then((d) => d.success && setRates(d.rates)).catch(() => {});
    try {
      setVendorId(localStorage.getItem("tsap_vendor_id") || "");
      setVToken(localStorage.getItem("tsap_vendor_token") || "");
    } catch { /* ignore */ }
  }, []);

  const vHeaders = () => {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (vToken.trim()) h["X-Vendor-Token"] = vToken.trim();
    return h;
  };

  const getQuote = async () => {
    const version = quoteVersion.current;
    setMsg(""); setQuote(null); setBusy(true);
    try {
      const r = await fetch("/api/ads/quote", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level: f.level, days: f.days, districts: f.districts, slots: f.slots, video_url: f.video_url }) });
      const d = await readApiJson(r);
      if (version !== quoteVersion.current) return;
      if (!r.ok || !d.success || !Number.isFinite(d.total)) throw new Error("Unavailable");
      setQuote(d); setMsg(te ? "ధర అంచనా సిద్ధంగా ఉంది. ఇది payment కాదు." : "Your quote is ready. This is not a payment.");
    } catch { if (version === quoteVersion.current) setMsg(te ? "ధర అంచనా నిర్ధారించలేకపోయాం. మళ్లీ ప్రయత్నించండి." : "The quote could not be confirmed. Please retry."); }
    finally { setBusy(false); }
  };

  const create = async () => {
    if (!vendorId.trim()) { setMsg(te ? "Vendor ID ఇవ్వండి." : "Enter your Vendor ID."); return; }
    setBusy(true); setMsg("");
    try {
      const r = await fetch(`/api/vendors/${encodeURIComponent(vendorId.trim())}/campaigns`, { method: "POST", headers: vHeaders(), body: JSON.stringify({ ...f, vendor_id: undefined }) });
      const d = await readApiJson(r);
      if (!r.ok || !d.success || !d.campaign) throw new Error("Unavailable");
      setMsg(apiDisplayMessage(d, te, te ? "ప్రచార అభ్యర్థన నమోదు అయింది." : "Campaign request recorded.") + ` (ID: ${d.campaign.id} - ₹${d.campaign.amount})`);
      try { localStorage.setItem("tsap_vendor_id", vendorId.trim()); if (vToken.trim()) localStorage.setItem("tsap_vendor_token", vToken.trim()); } catch {}
      void loadMine();
    } catch { setMsg(te ? "ప్రచార అభ్యర్థన నిర్ధారించలేకపోయాం. మళ్లీ ప్రయత్నించే ముందు campaigns జాబితాను చూడండి." : "The campaign request could not be confirmed. Check your campaigns before retrying."); }
    finally { setBusy(false); }
  };

  const loadMine = async () => {
    if (!vendorId.trim()) { setMsg(te ? "Vendor ID ఇవ్వండి." : "Enter your Vendor ID."); return; }
    setMine([]); setBusy(true);
    try {
      const r = await fetch(`/api/vendors/${encodeURIComponent(vendorId.trim())}/campaigns`, { headers: vHeaders() });
      const d = await readApiJson(r);
      if (!r.ok || !d.success || !Array.isArray(d.campaigns)) throw new Error("Unavailable");
      setMine(d.campaigns); if (!d.campaigns.length) setMsg(te ? "Campaigns లేవు." : "No campaigns found.");
    } catch { setMsg(te ? "Campaigns నిర్ధారించలేకపోయాం. ఖాళీ జాబితా కాదు." : "Campaigns could not be confirmed. This is not an empty result."); }
    finally { setBusy(false); }
  };

  const toggle = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  return (
    <div className="mv-partner-workspace mx-auto max-w-3xl px-4 py-6">
      <Link href="/vendors" className="text-[12px] font-bold text-[#7A0C2E]">← Vendors</Link>
      <h1 className="mt-2 text-2xl font-extrabold text-[#7A0C2E]">{te ? "📢 Ad Campaign — మీ business, correct audience కే" : "📢 Ad Campaign — your business, to the right audience"}</h1>
      <p className="mt-1 text-[13px] text-gray-600">
{te ? <>District level → ఆ districts వాళ్లకే · State → TS/AP మొత్తం · Photo/banner + video + offer ·
        Days అయిపోతే auto-expire · Views/clicks track.</> : <>District level → only those districts · State → all TS/AP · Photo/banner + video + offer ·
        Auto-expires after days · Views/clicks tracked.</>}
      </p>
      {rates ? (
        <div className="mt-3 rounded-2xl bg-[#FFF8E7] p-3 text-[12px] text-[#7A0C2E]">
          💰 Base ₹{rates.base_per_day}/day · +₹{rates.per_district_per_day}/district/day · State ₹{rates.state_per_day}/day · All ₹{rates.all_per_day}/day · 🎬+₹{rates.video_plus_per_day} · 🏠 hero +₹{rates.hero_plus_per_day}
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 rounded-3xl border bg-white p-4">
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="text-xs font-bold">Vendor ID*<input value={vendorId} onChange={(e) => { setVendorId(e.target.value); setMine([]); }}
            placeholder="Your registered vendor ID" aria-label="Vendor ID" className="mt-1 w-full rounded-xl border px-3 py-2 font-mono" /></label>
          <label className="text-xs font-bold">Vendor access code (dashboard)<input value={vToken} onChange={(e) => { setVToken(e.target.value); setMine([]); }}
            placeholder="Access code from your vendor registration" aria-label="Vendor access code" className="mt-1 w-full rounded-xl border px-3 py-2 font-mono" /></label>
        </div>
        <label className="text-xs font-bold">Ad title*<input value={f.title} onChange={(e) => updateForm({ ...f, title: e.target.value })}
          placeholder="Enter a concise campaign title" aria-label="Title" className="mt-1 w-full rounded-xl border px-3 py-2" /></label>
        <label className="text-xs font-bold">🎁 Offer text<input value={f.offer} onChange={(e) => updateForm({ ...f, offer: e.target.value })}
          placeholder="Describe your offer" aria-label="Offer" className="mt-1 w-full rounded-xl border px-3 py-2" /></label>
        <div className="grid gap-2 sm:grid-cols-3">
          <label className="text-xs font-bold">Scope*<select value={f.level} onChange={(e) => updateForm({ ...f, level: e.target.value })}
            aria-label="Scope" className="mt-1 w-full rounded-xl border px-3 py-2">
            <option value="district">📍 District(s)</option><option value="state">🗺️ State (TS/AP)</option><option value="all">🌐 All (TS+AP)</option>
          </select></label>
          <label className="text-xs font-bold">Days (3–90)*<input type="number" min={3} max={90} value={f.days}
            onChange={(e) => updateForm({ ...f, days: Number(e.target.value) })} aria-label="Days" className="mt-1 w-full rounded-xl border px-3 py-2" /></label>
          {f.level === "state" ? (
            <label className="text-xs font-bold">State<select value={f.state} onChange={(e) => updateForm({ ...f, state: e.target.value })}
              aria-label="State" className="mt-1 w-full rounded-xl border px-3 py-2"><option>TS</option><option>AP</option></select></label>
          ) : <label className="text-xs font-bold">Link (WhatsApp/site)<input value={f.link} onChange={(e) => updateForm({ ...f, link: e.target.value })}
            placeholder="Verified HTTPS destination (optional)" aria-label="Link" className="mt-1 w-full rounded-xl border px-3 py-2" /></label>}
        </div>
        {f.level === "district" ? (
          <div>
            <p className="text-xs font-bold">Districts* (tap to select)</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {DISTRICTS.map((d) => (
                <button type="button" key={d} aria-pressed={f.districts.includes(d)} onClick={() => updateForm({ ...f, districts: toggle(f.districts, d) })}
                  className={`rounded-full px-3 py-1 text-[12px] font-bold ${f.districts.includes(d) ? "bg-[#7A0C2E] text-white" : "bg-gray-100"}`}>{d}</button>
              ))}
            </div>
          </div>
        ) : null}
        <div>
          <p className="text-xs font-bold">Slots</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {[["matches_sidebar", "💞 Matches"], ["home_hero", "🏠 Home hero (rate from quote)"], ["profile_banner", "👤 Profile"], ["search_top", "🔎 Search"]].map(([v, l]) => (
              <button type="button" key={v} aria-pressed={f.slots.includes(v)} onClick={() => updateForm({ ...f, slots: toggle(f.slots, v) })}
                className={`rounded-full px-3 py-1 text-[12px] font-bold ${f.slots.includes(v) ? "bg-[#7A0C2E] text-white" : "bg-gray-100"}`}>{l}</button>
            ))}
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="text-xs font-bold">🖼️ Photo/banner URL<input value={f.image_url} onChange={(e) => updateForm({ ...f, image_url: e.target.value })}
            placeholder="Image URL (optional)" aria-label="Image" className="mt-1 w-full rounded-xl border px-3 py-2" /></label>
          <label className="text-xs font-bold">🎬 Video URL (YouTube)<input value={f.video_url} onChange={(e) => updateForm({ ...f, video_url: e.target.value })}
            placeholder="YouTube video URL (optional)" aria-label="Video" className="mt-1 w-full rounded-xl border px-3 py-2" /></label>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={busy} onClick={() => void getQuote()} className="rounded-xl border border-[#7A0C2E] px-5 py-2.5 text-sm font-bold text-[#7A0C2E]">{te ? "💰 Quote చూడు" : "💰 See quote"}</button>
          <button type="button" disabled={busy} onClick={() => void create()} className="rounded-xl bg-[#7A0C2E] px-5 py-2.5 text-sm font-bold text-white">🚀 Campaign request</button>
          <button type="button" disabled={busy} onClick={() => void loadMine()} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700">{te ? "📋 నా campaigns" : "📋 My campaigns"}</button>
        </div>
        {msg ? <p role="status" className="rounded-2xl bg-[#0F1F3C] p-3 text-[13px] text-white">{msg}</p> : null}
        {quote ? (
          <div className="rounded-2xl bg-emerald-50 p-3 text-sm font-bold text-emerald-900">
            💰 {quote.days} days × ₹{quote.per_day}/day = ₹{quote.total} ({quote.level})
          </div>
        ) : null}
      </div>

      {mine.length ? (
        <div className="mt-4 rounded-3xl border bg-white p-4">
          <h2 className="font-bold text-[#7A0C2E]">{te ? <>📋 నా campaigns ({mine.length})</> : <>📋 My campaigns ({mine.length})</>}</h2>
          <div className="mt-2 space-y-2">
            {mine.map((c: any) => (
              <div key={c.id} className="rounded-2xl bg-gray-50 p-3 text-xs">
                <div className="flex flex-wrap justify-between gap-2">
                  <b>{te ? c.title : apiDisplayMessage({ message_en: c.title }, false, "Campaign title unavailable in English")}</b>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] ${c.status === "active" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>{c.status}</span>
                </div>
                <div className="mt-1 text-gray-600">{c.id} · {c.level} {(c.districts || []).map((district: string) => te ? district : apiDisplayMessage({ message_en: district }, false, "")).filter(Boolean).join(", ")} {c.state} · {c.days}d · ₹{c.amount} · 👁️ {c.impressions} · 🖱️ {c.clicks}</div>
                {c.status === "pending" ? <div className="mt-1 text-amber-800">{te ? <>⏳ ₹{c.amount} pay చేసి UTR admin కి పంపండి → LIVE చేస్తారు</> : <>⏳ Pay ₹{c.amount} and send UTR to admin → they make it LIVE</>}</div> : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
