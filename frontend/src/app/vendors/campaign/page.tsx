"use client";

import { apiDisplayMessage, readApiJson } from "@/lib/api";
/**
 * 📢 WAVE 13 — VENDOR CAMPAIGN (ad create + live quote)
 * Vendor ID + token tho campaign request → UTR pay → admin approve → LIVE.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
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
    setMsg("");
    const r = await fetch("/api/ads/quote", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ level: f.level, days: f.days, districts: f.districts, slots: f.slots, video_url: f.video_url }) });
    const d = await readApiJson(r);
    if (d.success) {
      setQuote(d);
      setMsg(apiDisplayMessage(d, te, te ? "ధర అంచనా సిద్ధంగా ఉంది." : "Your price quote is ready."));
    } else {
      setQuote(null);
      setMsg(apiDisplayMessage(d, te, te ? "ధర అంచనా పొందలేకపోయాం. ఎంపికలను పరిశీలించండి." : "Could not calculate the quote. Review your selections."));
    }
  };

  const create = async () => {
    if (!vendorId.trim()) { setMsg(te ? "⚠️ Vendor ID ఇవ్వండి (register అయ్యాక వచ్చింది)" : "⚠️ Enter Vendor ID (you got it after register)"); return; }
    const r = await fetch(`/api/vendors/${encodeURIComponent(vendorId.trim())}/campaigns`,
      { method: "POST", headers: vHeaders(), body: JSON.stringify({ ...f, vendor_id: undefined }) });
    const d = await readApiJson(r);
    if (d.success) {
      const status = apiDisplayMessage(d, te, te ? "ప్రచార అభ్యర్థన నమోదు అయింది." : "Campaign request recorded.");
      setMsg(`✅ ${status} (ID: ${d.campaign.id} — ₹${d.campaign.amount})`);
      try {
        localStorage.setItem("tsap_vendor_id", vendorId.trim());
        if (vToken.trim()) localStorage.setItem("tsap_vendor_token", vToken.trim());
      } catch { /* ignore */ }
      void loadMine();
    } else setMsg(apiDisplayMessage(d, te, te ? "ప్రచార అభ్యర్థన పంపలేకపోయాం." : "Could not submit the campaign request."));
  };

  const loadMine = async () => {
    if (!vendorId.trim()) return;
    const r = await fetch(`/api/vendors/${encodeURIComponent(vendorId.trim())}/campaigns`, { headers: vHeaders() });
    const d = await readApiJson(r);
    if (d.success) setMine(d.campaigns || []);
  };

  const toggle = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
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
          <label className="text-xs font-bold">Vendor ID*<input value={vendorId} onChange={(e) => setVendorId(e.target.value)}
            placeholder="Your registered vendor ID" aria-label="Vendor ID" className="mt-1 w-full rounded-xl border px-3 py-2 font-mono" /></label>
          <label className="text-xs font-bold">Vendor access code (dashboard)<input value={vToken} onChange={(e) => setVToken(e.target.value)}
            placeholder="Access code from your vendor registration" aria-label="Vendor access code" className="mt-1 w-full rounded-xl border px-3 py-2 font-mono" /></label>
        </div>
        <label className="text-xs font-bold">Ad title*<input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })}
          placeholder="Enter a concise campaign title" aria-label="Title" className="mt-1 w-full rounded-xl border px-3 py-2" /></label>
        <label className="text-xs font-bold">🎁 Offer text<input value={f.offer} onChange={(e) => setF({ ...f, offer: e.target.value })}
          placeholder="Describe your offer" aria-label="Offer" className="mt-1 w-full rounded-xl border px-3 py-2" /></label>
        <div className="grid gap-2 sm:grid-cols-3">
          <label className="text-xs font-bold">Scope*<select value={f.level} onChange={(e) => setF({ ...f, level: e.target.value })}
            aria-label="Scope" className="mt-1 w-full rounded-xl border px-3 py-2">
            <option value="district">📍 District(s)</option><option value="state">🗺️ State (TS/AP)</option><option value="all">🌐 All (TS+AP)</option>
          </select></label>
          <label className="text-xs font-bold">Days (3–90)*<input type="number" min={3} max={90} value={f.days}
            onChange={(e) => setF({ ...f, days: Number(e.target.value) })} aria-label="Days" className="mt-1 w-full rounded-xl border px-3 py-2" /></label>
          {f.level === "state" ? (
            <label className="text-xs font-bold">State<select value={f.state} onChange={(e) => setF({ ...f, state: e.target.value })}
              aria-label="State" className="mt-1 w-full rounded-xl border px-3 py-2"><option>TS</option><option>AP</option></select></label>
          ) : <label className="text-xs font-bold">Link (WhatsApp/site)<input value={f.link} onChange={(e) => setF({ ...f, link: e.target.value })}
            placeholder="Verified HTTPS destination (optional)" aria-label="Link" className="mt-1 w-full rounded-xl border px-3 py-2" /></label>}
        </div>
        {f.level === "district" ? (
          <div>
            <p className="text-xs font-bold">Districts* (tap to select)</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {DISTRICTS.map((d) => (
                <button key={d} onClick={() => setF({ ...f, districts: toggle(f.districts, d) })}
                  className={`rounded-full px-3 py-1 text-[12px] font-bold ${f.districts.includes(d) ? "bg-[#7A0C2E] text-white" : "bg-gray-100"}`}>{d}</button>
              ))}
            </div>
          </div>
        ) : null}
        <div>
          <p className="text-xs font-bold">Slots</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {[["matches_sidebar", "💞 Matches"], ["home_hero", "🏠 Home hero (+₹99/d)"], ["profile_banner", "👤 Profile"], ["search_top", "🔎 Search"]].map(([v, l]) => (
              <button key={v} onClick={() => setF({ ...f, slots: toggle(f.slots, v) })}
                className={`rounded-full px-3 py-1 text-[12px] font-bold ${f.slots.includes(v) ? "bg-[#7A0C2E] text-white" : "bg-gray-100"}`}>{l}</button>
            ))}
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="text-xs font-bold">🖼️ Photo/banner URL<input value={f.image_url} onChange={(e) => setF({ ...f, image_url: e.target.value })}
            placeholder="Image URL (optional)" aria-label="Image" className="mt-1 w-full rounded-xl border px-3 py-2" /></label>
          <label className="text-xs font-bold">🎬 Video URL (YouTube)<input value={f.video_url} onChange={(e) => setF({ ...f, video_url: e.target.value })}
            placeholder="YouTube video URL (optional)" aria-label="Video" className="mt-1 w-full rounded-xl border px-3 py-2" /></label>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => void getQuote()} className="rounded-xl border border-[#7A0C2E] px-5 py-2.5 text-sm font-bold text-[#7A0C2E]">{te ? "💰 Quote చూడు" : "💰 See quote"}</button>
          <button onClick={() => void create()} className="rounded-xl bg-[#7A0C2E] px-5 py-2.5 text-sm font-bold text-white">🚀 Campaign request</button>
          <button onClick={() => void loadMine()} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700">{te ? "📋 నా campaigns" : "📋 My campaigns"}</button>
        </div>
        {msg ? <p className="rounded-2xl bg-[#0F1F3C] p-3 text-[13px] text-white">{msg}</p> : null}
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
