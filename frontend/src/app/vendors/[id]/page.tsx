"use client";
/**
 * 🏪 VENDOR DETAIL — poster, promo post, enquiry form, dashboard, similar vendors
 * ==============================================================================
 * Customer: WhatsApp CTA + enquiry (vendor ki instant WhatsApp) + inka options.
 * Owner (vendor_id + dashboard): impressions, clicks, enquiries, days left, upsell.
 */
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useLang } from "@/lib/lang";

export default function VendorDetailPage() {
  const routeParams = useParams();
  const { lang } = useLang();
  const te = lang === "te";
  const id = String(routeParams?.id || "");
  const [data, setData] = useState<any>(null);
  const [dash, setDash] = useState<any>(null);
  const [promo, setPromo] = useState<any>(null);
  const [err, setErr] = useState("");
  const [lead, setLead] = useState({ name: "", phone: "", district: "", event_date: "", budget: "", message: "" });
  const [leadRes, setLeadRes] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState("");
  const [tab, setTab] = useState<"customer" | "owner">("customer");

  const load = useCallback(() => {
    fetch(`/api/vendors/${id}`).then((r) => r.json()).then((d) => d.success ? setData(d) : setErr(d.detail || (te ? "Vendor దొరకలేదు" : "Vendor not found"))).catch(() => setErr(te ? "Server నుంచి data రాలేదు" : "No data from server"));
    // 🐞 FIX: vendor dashboard (impressions/clicks/leads) public ga chupinchakoodadu — vendor token kavali
    let vtok = "";
    try { vtok = localStorage.getItem("tsap_vendor_token") || ""; } catch { /* ignore */ }
    if (vtok) fetch(`/api/vendors/${id}/dashboard`, { headers: { "X-Vendor-Token": vtok } }).then((r) => r.json()).then((d) => d.success && setDash(d)).catch(() => { });
    fetch(`/api/vendors/${id}/promo`).then((r) => r.json()).then((d) => d.success && setPromo(d)).catch(() => { });
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const copy = (t: string, k: string) => { navigator.clipboard?.writeText(t); setCopied(k); setTimeout(() => setCopied(""), 1500); };
  const v = data?.vendor;

  const sendLead = async () => {
    setBusy(true);
    try {
      const r = await fetch(`/api/vendors/${id}/lead`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...lead, phone: lead.phone.replace(/\D/g, ""), source: "vendor_page" }),
      });
      const d = await r.json();
      setLeadRes(d);
    } catch {
      setLeadRes({ success: false, message_telugu: te ? "Server problem — మళ్లీ try చెయ్యండి" : "Server problem — retry" });
    } finally {
      setBusy(false);
    }
  };

  if (err) {
    return (
      <main className="min-h-screen bg-cream flex items-center justify-center px-4">
        <div className="bg-white rounded-3xl border border-gold/30 p-6 text-center max-w-md">
          <div className="text-4xl">🔍</div>
          <div className="mt-2 font-bold text-maroon">⚠️ {err}</div>
          <Link href="/vendors" className="mt-3 inline-block gold-gradient text-maroon font-bold text-[12px] px-4 py-2.5 rounded-xl">
            {te ? "🏪 Vendors list చూడండి" : "🏪 See vendors list"}
          </Link>
        </div>
      </main>
    );
  }

  if (!v) return <main className="min-h-screen bg-cream grid place-items-center"><span className="text-maroon font-bold">⏳ Loading…</span></main>;

  return (
    <main className="min-h-screen bg-cream pb-20">
      <section className="maroon-gradient text-white">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="text-[12px] opacity-90 mb-1"><Link href="/vendors" className="underline">← Vendors</Link></div>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold flex items-center gap-2">
                <span>{v.icon}</span> {v.business_name}
                {v.verified && <span className="text-[11px] font-bold bg-emerald-500/90 text-white px-2 py-0.5 rounded-full">✅ Verified</span>}
              </h1>
              <div className="text-[13px] opacity-90 mt-1">{v.category_te || v.category} · 📍 {v.city}{v.district && v.district !== v.city ? `, ${v.district}` : ""}</div>
              <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                <span className="px-3 py-1 rounded-full bg-white/10">Vendor ID {v.id}</span>
                {v.price_range && <span className="px-3 py-1 rounded-full bg-gold text-maroon font-bold">💰 {v.price_range}</span>}
                {v.experience_years && <span className="px-3 py-1 rounded-full bg-white/10">⭐ {v.experience_years} yrs</span>}
                {v.package && <span className="px-3 py-1 rounded-full bg-white/10">{v.package.replace("V_", "")} listing</span>}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {v.whatsapp_link && (
                <a href={v.whatsapp_link} target="_blank" rel="noreferrer"
                  onClick={() => fetch(`/api/vendors/${id}/click?source=detail_hero`, { method: "POST" }).catch(() => { })}
                  className="bg-green-600 text-white font-bold text-[12px] px-4 py-2.5 rounded-xl">{te ? "💬 WhatsApp చెయ్యండి" : "💬 WhatsApp"}</a>
              )}
              {v.call_link && <a href={v.call_link} className="bg-white/10 border border-white/25 font-bold text-[12px] px-4 py-2.5 rounded-xl">📞 Call</a>}
            </div>
          </div>
          <div className="mt-4 flex gap-2 text-[12px]">
            <button onClick={() => setTab("customer")} className={`px-3 py-1.5 rounded-full font-bold ${tab === "customer" ? "bg-white text-maroon" : "bg-white/10"}`}>{te ? "👰 Customer view" : "👰 Customer view"}</button>
            <button onClick={() => setTab("owner")} className={`px-3 py-1.5 rounded-full font-bold ${tab === "owner" ? "bg-white text-maroon" : "bg-white/10"}`}>📊 Vendor dashboard</button>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {tab === "customer" ? (
          <div className="grid md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-4">
              <div className="bg-white rounded-3xl border border-gold/30 p-5">
                <div className="font-bold text-maroon">About</div>
                <p className="mt-2 text-[13px] text-gray-700">{v.about || (te ? "మన వివాహ verified vendor." : "మన వివాహ verified vendor.")}</p>
                <div className="mt-3 grid sm:grid-cols-2 gap-2 text-[12px]">
                  {v.service_areas && <div className="bg-cream rounded-xl px-3 py-2">🗺️ Service areas: <b>{v.service_areas}</b></div>}
                  {v.price_range && <div className="bg-cream rounded-xl px-3 py-2">💰 Rates: <b>{v.price_range}</b></div>}
                  {v.experience_years && <div className="bg-cream rounded-xl px-3 py-2">⭐ Experience: <b>{v.experience_years} years</b></div>}
                  <div className="bg-cream rounded-xl px-3 py-2">🏷️ Category: <b>{v.category_te}</b></div>
                </div>
                <div className="mt-3 rounded-xl bg-[#FFF8E7] border border-gold/40 p-3 text-[11px] text-maroon">
                  {te ? "🖼️ Promo poster (QR తో) — మీ friends/relatives తో share చెయ్యండి" : "🖼️ Promo poster (with QR) — share with friends/relatives"}
                  <div className="mt-2 flex flex-wrap gap-2">
                    <a href={`/api/vendors/${id}/poster.png?style=square`} download={`${id}-poster.png`}
                      className="gold-gradient text-maroon font-bold text-[11px] px-3 py-2 rounded-xl">⬇️ Poster (square)</a>
                    <a href={`/api/vendors/${id}/poster.png?style=status`} target="_blank" rel="noreferrer"
                      className="border border-maroon/25 text-maroon font-bold text-[11px] px-3 py-2 rounded-xl">📱 Status poster</a>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-gold/30 p-5">
                <div className="font-bold text-maroon">{te ? "📩 Enquiry పంపండి (FREE) — vendor కి వెంటనే WhatsApp వెళ్తుంది" : "📩 Send enquiry (FREE) — vendor gets WhatsApp instantly"}</div>
                {leadRes?.success ? (
                  <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-[12px] text-emerald-900">
                    ✅ {leadRes.message_telugu}
                    {leadRes.compare_telugu && <div className="mt-1">{leadRes.compare_telugu}</div>}
                    {(leadRes.more_options || []).length > 0 && (
                      <div className="mt-2 space-y-1">
                        {(leadRes.more_options || []).map((m: any) => (
                          <div key={m.id} className="flex items-center justify-between bg-white rounded-xl px-3 py-2">
                            <span>{m.icon} {m.business_name} · {m.city}</span>
                            <Link href={`/vendors/${m.id}`} className="text-maroon font-bold underline text-[11px]">{te ? "చూడండి" : "see"}</Link>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="mt-3 grid sm:grid-cols-2 gap-3">
                      <input className="input-mobile" placeholder={te ? "మీ పేరు *" : "Your name *"} value={lead.name} onChange={(e) => setLead({ ...lead, name: e.target.value })} aria-label={te ? "మీ పేరు" : "Your name"} />
                      <input className="input-mobile" placeholder={te ? "మీ mobile (10 digits) *" : "Your mobile (10 digits) *"} value={lead.phone}
                        onChange={(e) => setLead({ ...lead, phone: e.target.value })} inputMode="tel" aria-label={te ? "మీ mobile" : "Your mobile"} />
                      <input className="input-mobile" placeholder="District" value={lead.district} onChange={(e) => setLead({ ...lead, district: e.target.value })} aria-label="District" />
                      <input className="input-mobile" type="date" value={lead.event_date} onChange={(e) => setLead({ ...lead, event_date: e.target.value })} aria-label="Text input" />
                      <input className="input-mobile" placeholder={te ? "Budget (ఉదాహరణ: ₹80,000)" : "Budget (e.g. ₹80,000)"} value={lead.budget} onChange={(e) => setLead({ ...lead, budget: e.target.value })} aria-label="Budget" />
                      <input className="input-mobile" placeholder={te ? "Requirement (ఉదాహరణ: 400 members lunch)" : "Requirement (e.g. 400 members lunch)"} value={lead.message} onChange={(e) => setLead({ ...lead, message: e.target.value })} aria-label={te ? "Requirement" : "Requirement"} />
                    </div>
                    {leadRes?.success === false && <div className="mt-2 text-[12px] text-rose-700">⚠️ {leadRes.message_telugu}</div>}
                    <button onClick={sendLead} disabled={busy}
                      className="mt-3 w-full maroon-gradient text-white font-bold text-[13px] py-3 rounded-2xl disabled:opacity-60">
                      {busy ? (te ? "⏳ పంపిస్తున్నాం…" : "⏳ Sending…") : te ? "📩 Enquiry పంపండి" : "📩 Send enquiry"}
                    </button>
                    <div className="mt-2 text-[11px] text-gray-500">
                      {te ? "మీ number ఈ vendor కే వెళ్తుంది. Chatting లేదు — vendor direct గా call/WhatsApp చేస్తారు." : "Your number goes to this vendor only. No chatting — vendor calls/WhatsApps you directly."}
                    </div>
                  </>
                )}
              </div>

              {(data?.similar || []).length > 0 && (
                <div className="bg-white rounded-3xl border border-gold/30 p-5">
                  <div className="font-bold text-maroon">{te ? "🔄 ఇంకా options (rate compare చెయ్యండి)" : "🔄 More options (compare rates)"}</div>
                  <div className="mt-2 space-y-2">
                    {(data.similar || []).map((s: any) => (
                      <div key={s.id} className="flex items-center justify-between bg-cream rounded-xl px-3 py-2 text-[12px]">
                        <span>{s.icon} {s.business_name} · {s.city} {s.price_range ? `· ${s.price_range}` : ""}</span>
                        <Link href={`/vendors/${s.id}`} className="text-maroon font-bold underline text-[11px]">{te ? "చూడండి" : "see"}</Link>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              {v.whatsapp_link && (
                <div className="bg-green-600 text-white rounded-3xl p-5 text-center">
                  <div className="text-3xl">💬</div>
                  <div className="font-bold mt-1">{v.business_name}</div>
                  <a href={v.whatsapp_link} target="_blank" rel="noreferrer"
                    className="mt-3 block bg-white text-green-700 font-bold text-[13px] px-4 py-3 rounded-2xl">
                    {te ? "WhatsApp లో మాట్లాడండి" : "Chat on WhatsApp"}
                  </a>
                  {v.call_link && <a href={v.call_link} className="mt-2 block bg-green-700/60 border border-white/30 font-bold text-[12px] px-4 py-2.5 rounded-2xl">📞 Call now</a>}
                </div>
              )}
              <div className="bg-white rounded-3xl border border-gold/30 p-5 text-[12px]">
                <div className="font-bold text-maroon">{te ? "🛡️ Safety (మన advice)" : "🛡️ Safety (our advice)"}</div>
                <ul className="mt-2 space-y-1 text-gray-700">
                  <li>{te ? "• Advance money ఇవ్వకండి — 30% వరకే" : "• Don\u2019t pay advance — max 30%"}</li>
                  <li>{te ? "• Agreement + bill తీసుకోండి (GST ఉంటే ఇంకా మంచి)" : "• Take agreement + bill (GST even better)"}</li>
                  <li>{te ? "• Sample work / photos అడిగి చూడండి" : "• Ask for sample work / photos"}</li>
                  <li>{te ? "• Problem ఉంటే report చెయ్యండి: /safety" : "• Problem? Report: /safety"}</li>
                </ul>
              </div>
              <div className="bg-navy text-white rounded-3xl p-5 text-[12px]">
                <div className="font-bold">{te ? "మీ business కూడా?" : "Your business too?"}</div>
                <div className="opacity-90 mt-1">{te ? "₹149 నుంచి promote చెయ్యండి — 52 channels + WhatsApp + website banner." : "Promote from ₹149 — 52 channels + WhatsApp + website banner."}</div>
                <Link href="/vendors/register" className="mt-2 inline-block gold-gradient text-maroon font-bold text-[11px] px-3 py-2 rounded-xl">{te ? "🏪 నా business add చెయ్" : "🏪 Add my business"}</Link>
              </div>
            </div>
          </div>
        ) : (
          /* ---------------- OWNER DASHBOARD ---------------- */
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { l: "Impressions", v: dash?.stats?.impressions ?? 0, i: "👁️" },
                { l: "Clicks", v: dash?.stats?.clicks ?? 0, i: "🖱️" },
                { l: "Enquiries", v: dash?.stats?.leads ?? 0, i: "📩" },
                { l: "Days left", v: dash?.days_left ?? 0, i: "⏳" },
              ].map((s) => (
                <div key={s.l} className="bg-white rounded-3xl border border-gold/30 p-4 text-center">
                  <div className="text-2xl">{s.i}</div>
                  <div className="text-xl font-extrabold text-maroon mt-1">{s.v}</div>
                  <div className="text-[11px] text-gray-500">{s.l}</div>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-3xl border border-gold/30 p-5">
              <div className="font-bold text-maroon">{dash?.message_telugu || (te ? "📊 మీ listing performance" : "📊 Your listing performance")}</div>
              <div className="mt-2 text-[12px] text-gray-700">
                CTR: <b>{dash?.stats?.ctr_pct ?? 0}%</b> · Lead rate: <b>{dash?.stats?.lead_rate_pct ?? 0}%</b>
                {" "}· {dash?.competition?.message_telugu}
              </div>
              <div className="mt-2 text-[12px] text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                {dash?.upsell_telugu}
              </div>
              {promo?.telegram_post && (
                <div className="mt-3">
                  <div className="text-[12px] font-bold text-maroon">{te ? "📝 మీ promo post (channels కి ready)" : "📝 Your promo post (ready for channels)"}</div>
                  <pre className="mt-2 bg-cream rounded-xl p-3 text-[11px] whitespace-pre-wrap">{promo.telegram_post}</pre>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button onClick={() => copy(promo.telegram_post, "tg")} className="gold-gradient text-maroon font-bold text-[11px] px-3 py-2 rounded-xl">
                      {copied === "tg" ? "copied ✓" : "📋 Post copy"}
                    </button>
                    <a href={`/api/vendors/${id}/poster.png?style=square`} download={`${id}-poster.png`}
                      className="border border-maroon/25 text-maroon font-bold text-[11px] px-3 py-2 rounded-xl">⬇️ Poster</a>
                    <Link href="/vendors/register" className="border border-maroon/25 text-maroon font-bold text-[11px] px-3 py-2 rounded-xl">⬆️ Upgrade / renew</Link>
                  </div>
                </div>
              )}
            </div>
            <div className="bg-white rounded-3xl border border-gold/30 p-5">
              <div className="font-bold text-maroon">📩 Recent enquiries</div>
              {(dash?.recent_leads || []).length === 0 && <div className="text-[12px] text-gray-500 mt-2">{te ? "ఇంకా enquiries లేవు — promo post పెట్టండి, leads పెరుగుతాయి." : "No enquiries yet — post the promo, leads will grow."}</div>}
              <div className="mt-2 space-y-2">
                {(dash?.recent_leads || []).map((l: any) => (
                  <div key={l.id} className="bg-cream rounded-xl px-3 py-2 text-[12px] flex flex-wrap items-center justify-between gap-2">
                    <span>{l.name} · {l.district || "-"} {l.event_date ? `· 📅 ${l.event_date}` : ""} {l.budget ? `· 💰 ${l.budget}` : ""}</span>
                    <a href={`https://wa.me/91${l.phone}`} target="_blank" rel="noreferrer" className="text-green-700 font-bold underline text-[11px]">
                      WhatsApp {l.phone}
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
