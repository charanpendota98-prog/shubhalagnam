"use client";
/**
 * 🏪 VENDOR DETAIL — poster, promo post, enquiry form, dashboard, similar vendors
 * ==============================================================================
 * Customer: vendor-provided contact options + enquiry form + similar listings.
 * Owner: private dashboard requires the registration access code; APIs still authorize every request.
 */
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useLang } from "@/lib/lang";
import { apiDisplayMessage, readApiJson} from "@/lib/api";
import { safeWhatsAppPhoneLink, whatsappPhoneLink } from "@/lib/wa";

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
  const [ownerCode, setOwnerCode] = useState("");
  const [ownerError, setOwnerError] = useState("");
  const [ownerBusy, setOwnerBusy] = useState(false);
  const [leadConsent, setLeadConsent] = useState(false);

  const load = useCallback(() => {
    fetch(`/api/vendors/${id}`).then((r) => readApiJson(r)).then((d) => d.success
      ? setData(d)
      : setErr(apiDisplayMessage(d, te, te ? "Vendor దొరకలేదు" : "Vendor not found")))
      .catch(() => setErr(te ? "Server నుంచి data రాలేదు" : "No data from server"));
    // 🐞 FIX: vendor dashboard (impressions/clicks/leads) public ga chupinchakoodadu — vendor token kavali
    let vtok = "";
    try { vtok = localStorage.getItem("tsap_vendor_token") || ""; } catch { /* ignore */ }
    if (vtok) {
      setOwnerCode(vtok);
      fetch(`/api/vendors/${id}/dashboard`, { headers: { "X-Vendor-Token": vtok } })
        .then((r) => readApiJson(r))
        .then((d) => {
          if (d.success) { setDash(d); setOwnerError(""); }
          else { setDash(null); setOwnerError(apiDisplayMessage(d, te, te ? "Access code సరిపోలలేదు" : "Access code was not accepted")); }
        })
        .catch(() => setOwnerError(te ? "Dashboard data లోడ్ కాలేదు" : "Could not load the private dashboard"));
    }
    fetch(`/api/vendors/${id}/promo`).then((r) => readApiJson(r)).then((d) => d.success && setPromo(d)).catch(() => { });
  }, [id, te]);

  useEffect(() => { load(); }, [load]);

  const copy = (t: string, k: string) => { navigator.clipboard?.writeText(t); setCopied(k); setTimeout(() => setCopied(""), 1500); };
  const v = data?.vendor;
  const englishValue = (value: unknown, fallback = "") => typeof value === "number"
    ? String(value)
    : apiDisplayMessage({ message_en: value }, false, fallback);
  const displayCategory = te
    ? (v?.category_te || v?.category || "")
    : englishValue(v?.category_en || v?.category, "Wedding service");
  const packageLabels: Record<string, { te: string; en: string }> = {
    V_SINGLE_POST: { te: "ఒకరోజు promo kit", en: "One-day promo kit" },
    V_STATUS_BLAST: { te: "Status promo kit", en: "Status promo kit" },
    V_BASIC: { te: "Basic listing", en: "Basic listing" },
    V_STANDARD: { te: "Standard listing", en: "Standard listing" },
    V_SPOTLIGHT: { te: "Spotlight placement", en: "Spotlight placement" },
    V_PREMIUM: { te: "Premium placement", en: "Premium placement" },
  };
  const displayPackage = packageLabels[String(v?.package || "").toUpperCase()]?.[te ? "te" : "en"] || "";
  const displayCity = te ? (v?.city || "") : englishValue(v?.city);
  const displayDistrict = te ? (v?.district || "") : englishValue(v?.district);
  const displayLocation = [displayCity, displayDistrict && displayDistrict !== displayCity ? displayDistrict : ""].filter(Boolean).join(", ");
  const displayAbout = te
    ? (v?.about || "మన వివాహ wedding vendor directory listing.")
    : englishValue(v?.about, v?.about ? "Vendor description is not available in English." : "Wedding vendor listing on Mana Vivaha (మన వివాహ).");
  const displayServiceAreas = te ? (v?.service_areas || "") : englishValue(v?.service_areas);
  const displayPriceRange = te ? (v?.price_range || "") : englishValue(v?.price_range);
  const displayExperience = te ? (v?.experience_years || "") : englishValue(v?.experience_years);
  const vendorWhatsApp = safeWhatsAppPhoneLink(te ? (v?.whatsapp_link_te || v?.whatsapp_link || "") : (v?.whatsapp_link_en || ""));
  const leadCompareMessage = te
    ? String(leadRes?.compare_telugu || "")
    : apiDisplayMessage({ message_en: leadRes?.compare_en, message: leadRes?.compare }, false, "");
  const dashboardMessage = te
    ? (dash?.message_telugu || "📊 మీ listing performance")
    : apiDisplayMessage({ message_en: dash?.message_en, message: dash?.message_telugu }, false, "📊 Your listing performance");
  const competitionMessage = te
    ? String(dash?.competition?.message_telugu || "")
    : apiDisplayMessage({ message_en: dash?.competition?.message_en, message: dash?.competition?.message }, false, "");
  const upsellMessage = te
    ? String(dash?.upsell_telugu || "")
    : apiDisplayMessage({ message_en: dash?.upsell_en, message: dash?.upsell }, false, "");
  const promoDraft = te
    ? String(promo?.telegram_post_te || "")
    : apiDisplayMessage({ message_en: promo?.telegram_post_en }, false, "English promo copy is not available.");

  const connectOwnerDashboard = async () => {
    const token = ownerCode.trim();
    if (!token) {
      setOwnerError(te ? "రిజిస్ట్రేషన్ సమయంలో వచ్చిన access code ఇవ్వండి" : "Enter the access code returned at registration");
      return;
    }
    setOwnerBusy(true);
    setOwnerError("");
    try {
      const response = await fetch(`/api/vendors/${id}/dashboard`, {
        headers: { "X-Vendor-Token": token },
      });
      const result = await readApiJson(response);
      if (!response.ok || !result.success) {
        setDash(null);
        setOwnerError(apiDisplayMessage(result, te, te ? "Access code సరిపోలలేదు" : "Access code was not accepted"));
        return;
      }
      try {
        localStorage.setItem("tsap_vendor_id", id);
        localStorage.setItem("tsap_vendor_token", token);
      } catch { /* dashboard remains usable in this view */ }
      setDash(result);
    } catch {
      setOwnerError(te ? "Dashboard data పొందలేకపోయాం" : "Could not load the private dashboard");
    } finally {
      setOwnerBusy(false);
    }
  };

  const sendLead = async () => {
    if (!leadConsent) {
      setLeadRes({ success: false, message_display: te ? "ముందుగా వివరాలు share చేయడానికి సమ్మతి ఇవ్వండి" : "Please consent before sharing your enquiry details" });
      return;
    }
    setBusy(true);
    try {
      const r = await fetch(`/api/vendors/${id}/lead`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...lead, phone: lead.phone.replace(/\D/g, ""), consent: leadConsent, source: "vendor_page" }),
      });
      const d = await readApiJson(r);
      setLeadRes({
        ...d,
        message_display: apiDisplayMessage(d, te, d.success
          ? (te ? "మీ విచారణ నమోదు అయింది." : "Your enquiry was recorded.")
          : (te ? "విచారణను పంపలేకపోయాం. మళ్లీ ప్రయత్నించండి." : "Your enquiry could not be sent. Please try again.")),
      });
    } catch {
      setLeadRes({ success: false, message_display: te ? "Server problem — మళ్లీ try చెయ్యండి" : "A server problem occurred. Please retry." });
    } finally {
      setBusy(false);
    }
  };

  if (err) {
    return (
      <div className="min-h-dvh bg-cream flex items-center justify-center px-4">
        <div className="bg-white rounded-3xl border border-gold/30 p-6 text-center max-w-md">
          <div className="text-4xl">🔍</div>
          <div className="mt-2 font-bold text-maroon">⚠️ {err}</div>
          <Link href="/vendors" className="mt-3 inline-block gold-gradient text-maroon font-bold text-[12px] px-4 py-2.5 rounded-xl">
            {te ? "🏪 Vendors list చూడండి" : "🏪 See vendors list"}
          </Link>
        </div>
      </div>
    );
  }

  if (!v) return <div className="min-h-dvh bg-cream grid place-items-center"><span className="text-maroon font-bold">⏳ Loading…</span></div>;

  return (
    <div className="min-h-dvh bg-cream pb-20">
      <section className="maroon-gradient text-white">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="text-[12px] opacity-90 mb-1"><Link href="/vendors" className="underline">← Vendors</Link></div>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold flex items-center gap-2">
                <span>{v.icon}</span> {v.business_name}
                {v.listing_details_reviewed && <span title={te ? "సమర్పించిన listing వివరాలను staff సమీక్షించారు; ఇది వ్యాపార గుర్తింపు, లైసెన్స్ లేదా సేవా నాణ్యతకు హామీ కాదు." : "Staff reviewed the submitted listing details; this does not certify business identity, licensing, or service quality."} className="text-[11px] font-bold bg-emerald-500/90 text-white px-2 py-0.5 rounded-full">✓ {te ? "Listing వివరాలు సమీక్షించారు" : "Listing details reviewed"}</span>}
              </h1>
              <div className="text-[13px] opacity-90 mt-1">{displayCategory}{displayLocation ? ` · 📍 ${displayLocation}` : ""}</div>
              <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                <span className="px-3 py-1 rounded-full bg-white/10">Vendor ID {v.id}</span>
                {displayPriceRange && <span className="px-3 py-1 rounded-full bg-gold text-maroon font-bold">💰 {displayPriceRange}</span>}
                {displayExperience && <span className="px-3 py-1 rounded-full bg-white/10">⭐ {displayExperience} yrs</span>}
                {displayPackage && <span className="px-3 py-1 rounded-full bg-white/10">{displayPackage}</span>}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {vendorWhatsApp && (
                <a href={vendorWhatsApp} target="_blank" rel="noreferrer"
                  onClick={() => fetch(`/api/vendors/${id}/click?source=detail_hero`, { method: "POST" }).catch(() => { })}
                  className="bg-green-600 text-white font-bold text-[12px] px-4 py-2.5 rounded-xl">{te ? "💬 WhatsApp చెయ్యండి" : "💬 WhatsApp"}</a>
              )}
              {v.call_link && <a href={v.call_link} className="bg-white/10 border border-white/25 font-bold text-[12px] px-4 py-2.5 rounded-xl">📞 Call</a>}
            </div>
          </div>
          <div className="mt-4 flex gap-2 text-[12px]">
            <button type="button" onClick={() => setTab("customer")} className={`px-3 py-1.5 rounded-full font-bold ${tab === "customer" ? "bg-white text-maroon" : "bg-white/10"}`}>{te ? "👰 Customer view" : "👰 Customer view"}</button>
            <button type="button" onClick={() => setTab("owner")} className={`px-3 py-1.5 rounded-full font-bold ${tab === "owner" ? "bg-white text-maroon" : "bg-white/10"}`}>📊 Vendor dashboard</button>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {tab === "customer" ? (
          <div className="grid md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-4">
              <div className="bg-white rounded-3xl border border-gold/30 p-5">
                <div className="font-bold text-maroon">About</div>
                <p className="mt-2 text-[13px] text-gray-700">{displayAbout}</p>
                <div className="mt-3 grid sm:grid-cols-2 gap-2 text-[12px]">
                  {displayServiceAreas && <div className="bg-cream rounded-xl px-3 py-2">🗺️ {te ? "సేవా ప్రాంతాలు:" : "Service areas:"} <b>{displayServiceAreas}</b></div>}
                  {displayPriceRange && <div className="bg-cream rounded-xl px-3 py-2">💰 {te ? "ధరలు:" : "Rates:"} <b>{displayPriceRange}</b></div>}
                  {displayExperience && <div className="bg-cream rounded-xl px-3 py-2">⭐ {te ? "అనుభవం:" : "Experience:"} <b>{displayExperience} {te ? "సంవత్సరాలు" : "years"}</b></div>}
                  <div className="bg-cream rounded-xl px-3 py-2">🏷️ {te ? "వర్గం:" : "Category:"} <b>{displayCategory}</b></div>
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
                <div className="font-bold text-maroon">{te ? "📩 Enquiry పంపండి" : "📩 Send an enquiry"}</div>
                {leadRes?.success ? (
                  <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-[12px] text-emerald-900">
                    ✅ {leadRes.message_display}
                    <div className="mt-1 text-[11px]">{leadRes.vendor_notification_queued
                      ? (te ? "WhatsApp notification queue లో చేర్చబడింది; delivery నిర్ధారణ కాదు." : "WhatsApp notification was queued; this does not confirm delivery.")
                      : (te ? "Enquiry dashboard లో నమోదు అయింది; WhatsApp notification queue కాలేదు." : "The enquiry was recorded in the dashboard; no WhatsApp notification was queued.")}</div>
                    {leadCompareMessage && <div className="mt-1">{leadCompareMessage}</div>}
                    {(leadRes.more_options || []).length > 0 && (
                      <div className="mt-2 space-y-1">
                        {(leadRes.more_options || []).map((m: any) => {
                          const city = te ? m.city : englishValue(m.city);
                          return (
                          <div key={m.id} className="flex items-center justify-between bg-white rounded-xl px-3 py-2">
                            <span>{m.icon} {m.business_name}{city ? ` · ${city}` : ""}</span>
                            <Link href={`/vendors/${m.id}`} className="text-maroon font-bold underline text-[11px]">{te ? "చూడండి" : "View"}</Link>
                          </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="mt-3 grid sm:grid-cols-2 gap-3">
                      <input className="input-mobile" placeholder={te ? "మీ పేరు *" : "Your name *"} value={lead.name} onChange={(e) => setLead({ ...lead, name: e.target.value })} aria-label={te ? "మీ పేరు" : "Your name"} />
                      <input className="input-mobile" placeholder={te ? "మీ mobile (10 digits) *" : "Your mobile (10 digits) *"} value={lead.phone}
                        onChange={(e) => setLead({ ...lead, phone: e.target.value })} inputMode="tel" aria-label={te ? "మీ mobile" : "Your mobile"} />
                      <input className="input-mobile" placeholder={te ? "జిల్లా" : "District"} value={lead.district} onChange={(e) => setLead({ ...lead, district: e.target.value })} aria-label={te ? "జిల్లా" : "District"} />
                      <input className="input-mobile" type="date" value={lead.event_date} onChange={(e) => setLead({ ...lead, event_date: e.target.value })} aria-label={te ? "కార్యక్రమ తేదీ" : "Event date"} />
                      <input className="input-mobile" placeholder={te ? "బడ్జెట్ పరిధి (ఐచ్ఛికం)" : "Budget range (optional)"} value={lead.budget} onChange={(e) => setLead({ ...lead, budget: e.target.value })} aria-label={te ? "బడ్జెట్ పరిధి" : "Budget range"} />
                      <input className="input-mobile" placeholder={te ? "మీ అవసరాన్ని వివరించండి" : "Describe what you need"} value={lead.message} onChange={(e) => setLead({ ...lead, message: e.target.value })} aria-label={te ? "మీ అవసరం" : "Your requirements"} />
                    </div>
                    {leadRes?.success === false && <div className="mt-2 text-[12px] text-rose-700">⚠️ {leadRes.message_display}</div>}
                    <button type="button" onClick={sendLead} disabled={busy}
                      className="mt-3 w-full maroon-gradient text-white font-bold text-[13px] py-3 rounded-2xl disabled:opacity-60">
                      {busy ? (te ? "⏳ పంపిస్తున్నాం…" : "⏳ Sending…") : te ? "📩 Enquiry పంపండి" : "📩 Send enquiry"}
                    </button>
                    <label className="mt-3 flex items-start gap-2 text-[11px] leading-5 text-gray-600">
                      <input type="checkbox" checked={leadConsent} onChange={(e) => setLeadConsent(e.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-[#7A0C2E]" />
                      <span>{te ? "నా పేరు, phone, enquiry వివరాలను ఈ vendor కి పంపడానికి అంగీకరిస్తున్నాను. Site operations కోసం కూడా ఈ వివరాలు process కావచ్చు. Vendor స్పందన లేదా WhatsApp delivery సమయం హామీ కాదు." : "I agree to send my name, phone, and enquiry details to this vendor. The site may also process these details for operations. Vendor response and WhatsApp delivery times are not guaranteed."}</span>
                    </label>
                  </>
                )}
              </div>

              {(data?.similar || []).length > 0 && (
                <div className="bg-white rounded-3xl border border-gold/30 p-5">
                  <div className="font-bold text-maroon">{te ? "🔄 ఇంకా options (rate compare చెయ్యండి)" : "🔄 More options (compare rates)"}</div>
                  <div className="mt-2 space-y-2">
                    {(data.similar || []).map((s: any) => {
                      const city = te ? s.city : englishValue(s.city);
                      const price = te ? s.price_range : englishValue(s.price_range);
                      return (
                      <div key={s.id} className="flex items-center justify-between bg-cream rounded-xl px-3 py-2 text-[12px]">
                        <span>{s.icon} {s.business_name}{city ? ` · ${city}` : ""} {price ? `· ${price}` : ""}</span>
                        <Link href={`/vendors/${s.id}`} className="text-maroon font-bold underline text-[11px]">{te ? "చూడండి" : "View"}</Link>
                      </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              {vendorWhatsApp && (
                <div className="bg-green-600 text-white rounded-3xl p-5 text-center">
                  <div className="text-3xl">💬</div>
                  <div className="font-bold mt-1">{v.business_name}</div>
                  <a href={vendorWhatsApp} target="_blank" rel="noreferrer"
                    className="mt-3 block bg-white text-green-700 font-bold text-[13px] px-4 py-3 rounded-2xl">
                    {te ? "WhatsApp లో మాట్లాడండి" : "Chat on WhatsApp"}
                  </a>
                  {v.call_link && <a href={v.call_link} className="mt-2 block bg-green-700/60 border border-white/30 font-bold text-[12px] px-4 py-2.5 rounded-2xl">📞 Call now</a>}
                </div>
              )}
              <div className="bg-white rounded-3xl border border-gold/30 p-5 text-[12px]">
                <div className="font-bold text-maroon">{te ? "🛡️ Safety (మన advice)" : "🛡️ Safety (our advice)"}</div>
                <ul className="mt-2 space-y-1 text-gray-700">
                  <li>{te ? "• చెల్లింపుకు ముందు మొత్తం, తేదీలు, refund terms రాతపూర్వకంగా నిర్ధారించండి." : "• Agree the amount, dates, and refund terms in writing before paying."}</li>
                  <li>{te ? "• Vendor వివరాలు, పాత పనుల నమూనాలు స్వయంగా తనిఖీ చేయండి." : "• Independently check vendor details and work samples."}</li>
                  <li>{te ? "• OTPలు లేదా banking passwords ఎవరితోనూ పంచుకోకండి." : "• Never share OTPs or banking passwords."}</li>
                  <li>{te ? "• Problem ఉంటే report చెయ్యండి: /safety" : "• Problem? Report: /safety"}</li>
                </ul>
              </div>
              <div className="bg-navy text-white rounded-3xl p-5 text-[12px]">
                <div className="font-bold">{te ? "మీ business కూడా?" : "Your business too?"}</div>
                <div className="opacity-90 mt-1">{te ? "Package ప్రకారం deliverables, duration, listing/placement eligibility మారుతాయి. Promo assets మీరే share చేయాలి; external post లేదా reach హామీ లేదు." : "Deliverables, duration, and listing or placement eligibility vary by package. You share promotional assets yourself; external posting or reach is not guaranteed."}</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Link href="/vendors#packages" className="inline-flex items-center rounded-xl border border-white/30 px-3 py-2 text-[11px] font-bold underline underline-offset-2">{te ? "Packages, ధరలు చూడండి" : "View packages & pricing"}</Link>
                  <Link href="/vendors/register" className="inline-flex items-center rounded-xl gold-gradient px-3 py-2 text-[11px] font-bold text-maroon">{te ? "🏪 నా business add చెయ్" : "🏪 Add my business"}</Link>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ---------------- OWNER DASHBOARD ---------------- */
          <div className="space-y-4">
            {!dash && <div className="bg-white rounded-3xl border border-gold/30 p-5">
              <h2 className="font-bold text-maroon">{te ? "🔐 Private vendor dashboard" : "🔐 Private vendor dashboard"}</h2>
              <p className="mt-1 text-[12px] text-gray-600">{te ? "Private enquiries, performance data కోసం registration లో వచ్చిన vendor access code అవసరం. Server ప్రతి request ను ధృవీకరిస్తుంది." : "Use the vendor access code returned during registration to view private enquiries and performance. The server verifies every request."}</p>
              <label className="mt-3 block text-[12px] font-semibold text-gray-700">
                {te ? "Vendor access code" : "Vendor access code"}
                <input type="password" autoComplete="off" value={ownerCode} onChange={(e) => setOwnerCode(e.target.value)} className="input-mobile mt-1 w-full" aria-label={te ? "Vendor access code" : "Vendor access code"} />
              </label>
              {ownerError && <div role="alert" className="mt-2 text-[12px] text-rose-700">{ownerError}</div>}
              <button type="button" onClick={connectOwnerDashboard} disabled={ownerBusy} className="mt-3 min-h-11 rounded-xl maroon-gradient px-4 py-2.5 text-[12px] font-bold text-white disabled:opacity-60">
                {ownerBusy ? (te ? "⏳ తనిఖీ చేస్తున్నాం…" : "⏳ Checking…") : (te ? "Dashboard తెరవండి" : "Open dashboard")}
              </button>
            </div>}
            {dash && <>
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
              <div className="font-bold text-maroon">{dashboardMessage}</div>
              <div className="mt-2 text-[12px] text-gray-700">
                CTR: <b>{dash?.stats?.ctr_pct ?? 0}%</b> · Lead rate: <b>{dash?.stats?.lead_rate_pct ?? 0}%</b>
                {competitionMessage ? <> · {competitionMessage}</> : null}
              </div>
              <div className="mt-2 text-[12px] text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                {upsellMessage}
              </div>
              {promoDraft && (
                <div className="mt-3">
                  <div className="text-[12px] font-bold text-maroon">{te ? "📝 Share-ready promo draft (ఇక్కడి నుంచి post కాదు)" : "📝 Share-ready promo draft (not posted by this site)"}</div>
                  <pre className="mt-2 bg-cream rounded-xl p-3 text-[11px] whitespace-pre-wrap" lang={te ? "te-IN" : "en-IN"}>{promoDraft}</pre>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button type="button" onClick={() => copy(promoDraft, "tg")} className="gold-gradient text-maroon font-bold text-[11px] px-3 py-2 rounded-xl">
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
              {(dash?.recent_leads || []).length === 0 && <div className="text-[12px] text-gray-500 mt-2">{te ? "ఇంకా enquiries నమోదు కాలేదు." : "No enquiries have been recorded yet."}</div>}
              <div className="mt-2 space-y-2">
                {(dash?.recent_leads || []).map((l: any) => {
                  const district = te ? l.district : englishValue(l.district);
                  const budget = te ? l.budget : englishValue(l.budget);
                  return (
                  <div key={l.id} className="bg-cream rounded-xl px-3 py-2 text-[12px] flex flex-wrap items-center justify-between gap-2">
                    <span>{l.name}{district ? ` · ${district}` : ""} {l.event_date ? `· 📅 ${l.event_date}` : ""} {budget ? `· 💰 ${budget}` : ""}</span>
                    {whatsappPhoneLink(l.phone) ? <a href={whatsappPhoneLink(l.phone) || undefined} target="_blank" rel="noopener noreferrer" className="text-green-700 font-bold underline text-[11px]">
                      WhatsApp {l.phone}
                    </a> : null}
                  </div>
                  );
                })}
              </div>
            </div>
            </>}
          </div>
        )}
      </div>
    </div>
  );
}
