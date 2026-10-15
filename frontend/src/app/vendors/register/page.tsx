"use client";

import { apiDisplayMessage, readApiJson } from "@/lib/api";
/**
 * 🏪 VENDOR REGISTER — mee business ni మన వివాహ lo promote cheyyandi
 * ==================================================================
 * 18 categories (catering, photography, decorations, hall, pandit...) + ad packages ₹149 → ₹3999.
 * Registration requests a paid listing. External channel distribution is not included unless separately confirmed.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/lang";
import { whatsappPhoneLink } from "@/lib/wa";

type Cat = { key: string; en: string; te: string; icon: string; kw: string };
type Pkg = { code: string; name: string; price: number; days: number; telugu: string; description_en?: string; perks: string[] };

const EMPTY = {
  business_name: "", owner_name: "", category: "", phone: "", whatsapp: "", city: "", district: "",
  state: "TS", service_areas: "", price_range: "", about: "", experience_years: "", photo_url: "",
  package: "V_STANDARD", source: "website",
};

export default function VendorRegisterPage() {
  const { lang } = useLang();
  const te = lang === "te";
  const englishText = (value: unknown, fallback = "") => apiDisplayMessage({ message_en: value }, false, fallback);
  const [cats, setCats] = useState<Cat[]>([]);
  const [pkgs, setPkgs] = useState<Pkg[]>([]);
  const [f, setF] = useState<any>({ ...EMPTY });
  const [busy, setBusy] = useState(false);
  const [errs, setErrs] = useState<string[]>([]);
  const [res, setRes] = useState<any>(null);
  const [copied, setCopied] = useState("");
  const [supportWhatsapp, setSupportWhatsapp] = useState("");

  useEffect(() => {
    fetch("/api/vendors/categories").then((r) => readApiJson(r)).then((d) => setCats(d.categories || [])).catch(() => { });
      fetch("/api/vendors/packages").then((r) => readApiJson(r)).then((d) => {
      setPkgs(d.packages || []);
      setSupportWhatsapp(typeof d.contact_whatsapp === "string" ? d.contact_whatsapp : "");
      const q = new URLSearchParams(window.location.search).get("package");
      if (q) setF((p: any) => ({ ...p, package: q.toUpperCase() }));

    }).catch(() => { });
  }, []);

  const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));

  const validate = () => {
    const e: string[] = [];
    if ((f.business_name || "").trim().length < 3) e.push(te ? "Business పేరు ఇవ్వండి (3+ అక్షరాలు)" : "Enter business name (3+ letters)");
    if (!f.category) e.push(te ? "మీ category select చెయ్యండి" : "Select your category");
    if (!/^\d{10}$/.test((f.phone || "").replace(/\D/g, ""))) e.push(te ? "10 digit mobile number ఇవ్వండి" : "Enter a 10-digit mobile number");
    if (!f.city.trim()) e.push(te ? "City/town ఇవ్వండి" : "Enter city/town");
    if (!f.package) e.push(te ? "Package select చెయ్యండి" : "Select a package");
    return e;
  };

  const submit = async () => {
    const e = validate();
    setErrs(e);
    if (e.length) { window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    setBusy(true);
    try {
      const r = await fetch("/api/vendors/register", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, phone: f.phone.replace(/\D/g, ""), whatsapp: f.whatsapp.replace(/\D/g, "") }),
      });
      const d = await readApiJson(r);
      if (!r.ok || !d.success) {
        const rawMessages = te
          ? (d.problems || [d.message_telugu || "నమోదు విఫలమైంది. వివరాలను పరిశీలించి మళ్లీ ప్రయత్నించండి."])
          : (d.problems_en || [d.message_en || "Registration failed. Review the details and try again."]);
        const messages = (Array.isArray(rawMessages) ? rawMessages : [rawMessages])
          .map((message: unknown) => te ? String(message || "") : apiDisplayMessage({ message_en: message }, false, "Review this field and try again."))
          .filter(Boolean);
        setErrs(messages.length ? messages : [te ? "నమోదు విఫలమైంది. మళ్లీ ప్రయత్నించండి." : "Registration failed. Review the details and try again."]);
      }
      else {
        setRes(d);
        try {
          localStorage.setItem("tsap_vendor_id", String(d.vendor_id || d.vendor?.id || ""));
          if (d.vendor_token) localStorage.setItem("tsap_vendor_token", String(d.vendor_token));
        } catch { /* the access code remains available to copy below */ }
      }
    } catch {
      setErrs([te ? "Server problem — కొంచెం తర్వాత మళ్లీ try చెయ్యండి" : "Server problem — retry after some time"]);
    } finally {
      setBusy(false);
    }
  };

  const selectedPkg = pkgs.find((p) => p.code === f.package);
  const supportWhatsappLink = whatsappPhoneLink(supportWhatsapp);
  const promoKit = pkgs.find((p) => p.code === "V_SINGLE_POST");
  const listingPrices = pkgs.filter((p) => !["V_SINGLE_POST", "V_STATUS_BLAST"].includes(p.code)).map((p) => p.price);
  const promoKitPrice = promoKit?.price ?? 149;
  const listingStart = listingPrices.length ? Math.min(...listingPrices) : 499;
  const copy = (t: string, k: string) => { navigator.clipboard?.writeText(t); setCopied(k); setTimeout(() => setCopied(""), 1500); };

  /* ---------------- SUCCESS ---------------- */
  if (res) {
    const v = res.vendor;
    const categoryLabelEn = englishText(cats.find((category) => category.key === v.category)?.en)
      || englishText(res.package?.category_en)
      || englishText(String(v.category || "").replace(/_/g, " ").replace(/\b\w/g, (letter: string) => letter.toUpperCase()), "Vendor");
    const isShareKitPackage = ["V_SINGLE_POST", "V_STATUS_BLAST"].includes(res.package?.code || f.package);
    const packageName = te ? res.package?.name : englishText(res.package?.name_en || res.package?.name, res.package?.code || "Selected package");
    const paymentSteps = te
      ? (res.steps_telugu || [])
      : (res.steps_en || []).map((step: string) => englishText(step)).filter(Boolean);
    return (
      <div className="min-h-dvh bg-cream pb-20">
        <section className="maroon-gradient text-white">
          <div className="max-w-3xl mx-auto px-4 py-9 text-center">
            <div className="text-5xl">🎉</div>
            <h1 className="mt-2 text-2xl font-bold">{te ? "మీ vendor request వచ్చింది!" : "Vendor request received!"}</h1>
            <div className="mt-3 inline-flex flex-wrap items-center gap-2 justify-center bg-white/10 border border-white/25 rounded-2xl px-4 py-3">
              <span className="font-mono text-lg font-bold">{v.id}</span>
              <button onClick={() => copy(v.id, "id")} className="text-[11px] font-bold gold-gradient text-maroon px-3 py-1.5 rounded-full">
                {copied === "id" ? "copied ✓" : "ID copy"}
              </button>
              <span className="text-[12px] opacity-90">{v.business_name} · {te ? v.category_te : categoryLabelEn}</span>
            </div>
          </div>
        </section>

        <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
          <div className="bg-white rounded-3xl border border-gold/30 p-5">
            <div className="font-bold text-maroon text-[15px]">{res.checkout_available
              ? (te ? <>💰 Payment instructions — ₹{res.amount}</> : <>💰 Payment instructions — ₹{res.amount}</>)
              : (te ? "⏸️ Checkout configure కాలేదు — payment చేయవద్దు" : "⏸️ Checkout is not configured — do not pay yet")}</div>
            <div className="text-[12px] text-gray-600 mt-1">
              {isShareKitPackage
                ? (te ? <>Package: <b>{res.package.name}</b> (₹{res.amount}). ఇది share-ready promotional material మాత్రమే; directory listing కాదు. Payment-reference మరియు business-details review తర్వాత private kit access నిర్ణయిస్తారు.</>
                  : <>Package: <b>{packageName}</b> (₹{res.amount}). This is a share-ready promotional-material package, not a directory listing. Private kit access follows payment-reference and business-details review.</>)
                : (te ? <>Package: <b>{res.package.name}</b> ({res.package.days} days). Payment reference review తర్వాత listing activation నిర్ణయిస్తారు; payment business లేదా identity ను verify చేయదు.</>
                  : <>Package: <b>{packageName}</b> ({res.package.days} days). Listing activation follows payment-reference review; payment does not verify the business or its identity.</>)}
            </div>
            <ol className="mt-3 space-y-1 text-[12px] text-gray-700 list-decimal list-inside">
              {paymentSteps.map((s: string, index: number) => <li key={`${index}-${s}`}>{s.replace(/^\d️⃣?\.?\s*/, "")}</li>)}
            </ol>
            <div className="mt-3 flex flex-wrap gap-2">
              {res.phonepe_link && (
                <a href={res.phonepe_link} className="gold-gradient text-maroon font-bold text-[12px] px-4 py-2.5 rounded-xl">
                  {te ? "📱 PhonePe / UPI తో pay చెయ్యండి" : "📱 Pay with PhonePe / UPI"}
                </a>
              )}
              {res.checkout_available && <button onClick={() => copy(String(res.vendor_id), "ref")}
                className="border border-maroon/25 text-maroon font-bold text-[12px] px-4 py-2.5 rounded-xl">
                {copied === "ref" ? "copied ✓" : (te ? "📋 Payment note కోసం ID copy" : "📋 Copy ID for payment note")}
              </button>}
            </div>
            {res.upi_id && <div className="mt-2 text-[12px] text-gray-600">UPI ID: <b>{res.upi_id}</b></div>}
          </div>

          <div className="bg-cream border border-gold/40 rounded-3xl p-5">
            <div className="font-bold text-maroon">{te ? "✅ Payment తర్వాత ఏం అవుతుంది?" : "✅ What happens after payment?"}</div>
            <ul className="mt-2 space-y-1 text-[12px] text-gray-700">
              {isShareKitPackage ? <>
                <li>1️⃣ {te ? "చెల్లింపు రిఫరెన్స్ మరియు business details review తర్వాతే private share kit సిద్ధంగా ఉంటుంది." : "The private share kit becomes available only after payment-reference and business-details review."}</li>
                <li>2️⃣ {te ? "ఇందులో directory listing, website placement లేదా external channel posting/reach హామీ ఉండదు." : "This package does not include a directory listing, website placement, or guaranteed external posting or reach."}</li>
                <li>3️⃣ {te ? "మీరు materials స్వయంగా review చేసి share చేయవచ్చు; పంపిణీ లేదా delivery ను ఈ site చేయదు." : "Review and share the materials yourself; this site does not distribute them or confirm delivery."}</li>
              </> : <>
                <li>1️⃣ {te ? "Payment reference review తర్వాత listing activation; ఇది business/identity verification కాదు" : "Listing activation after payment-reference review; this is not business or identity verification"}</li>
                <li>2️⃣ {te ? "Promo text/poster tools share-ready material తయారు చేస్తాయి; external channels కి automatic post ఉండదు." : "Promo text/poster tools provide share-ready material; there is no automatic external channel post."}</li>
                <li>3️⃣ {te ? "Website నమోదు చేసిన impressions, clicks, enquiries మాత్రమే dashboard లో కనిపిస్తాయి." : "The dashboard shows impressions, clicks, and enquiries recorded by this site."}</li>
                <li>4️⃣ {te ? "WhatsApp notification, valid WhatsApp number మరియు delivery setup ఉంటేనే ప్రయత్నిస్తాం; delivery/time హామీ కాదు." : "A WhatsApp notification is attempted only with an explicitly supplied number and configured delivery; delivery and response time are not guaranteed."}</li>
              </>}
            </ul>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href={isShareKitPackage ? "/vendors/kit" : `/vendors/${v.id}`} className="maroon-gradient text-white font-bold text-[12px] px-4 py-2.5 rounded-xl">
                {isShareKitPackage
                  ? (te ? "🧰 Private promo kit (review తర్వాత)" : "🧰 Private promo kit (after review)")
                  : (te ? "📊 మీ vendor page (dashboard)" : "📊 Your vendor page (dashboard)")}
              </Link>
              <Link href="/vendors" className="border border-maroon/25 text-maroon font-bold text-[12px] px-4 py-2.5 rounded-xl">
                🏪 Vendors directory
              </Link>
            </div>
          </div>
          {res.vendor_token && <div className="bg-white rounded-2xl border border-gold/30 p-4 text-[12px]">
            <div className="font-bold text-maroon">{te ? "🔐 Owner dashboard access" : "🔐 Owner dashboard access"}</div>
            <p className="mt-1 text-gray-600">{te ? "Private enquiries చూడటానికి ఈ access code అవసరం. ఇది ఈ browser లో save అయింది; మీ business owner తో మాత్రమే share చేయండి." : "This access code is required to view private enquiries. It was saved in this browser; share it only with the business owner."}</p>
            <button onClick={() => copy(String(res.vendor_token), "vendor-token")}
              className="mt-2 border border-maroon/25 text-maroon font-bold text-[12px] px-4 py-2.5 rounded-xl">
              {copied === "vendor-token" ? "Copied ✓" : (te ? "🔑 Access code copy" : "🔑 Copy access code")}
            </button>
          </div>}
          {supportWhatsappLink && <div className="text-[11px] text-gray-500 text-center">
            <a href={supportWhatsappLink} target="_blank" rel="noopener noreferrer" className="underline">
              {te ? "Vendor support కి WhatsApp చేయండి" : "Message vendor support on WhatsApp"}
            </a>
          </div>}
        </div>
      </div>
    );
  }

  /* ---------------- FORM ---------------- */
  return (
    <div className="min-h-dvh bg-cream pb-24">
      <section className="maroon-gradient text-white">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="text-[12px] opacity-90 mb-1">
            <Link href="/vendors" className="underline">← Vendors</Link>
          </div>
          <h1 className="text-2xl font-extrabold">{te ? "🏪 మీ business ని మన వివాహ లో add చెయ్యండి" : "🏪 Add your business to మన వివాహ"}</h1>
          <p className="text-[13px] opacity-90 mt-2 telugu">
            Catering, photography, decorations, hall, tent, pandit, jewellery, makeup, DJ, invitations, cars, planner —
            {te ? <>Package బట్టి deliverables, duration మారతాయి: ₹{promoKitPrice} one-day private share-ready kit (approval తర్వాత 1 రోజు access; directory listing కాదు); directory-listing packages ₹{listingStart} నుంచి. Enquiries dashboard లో నమోదు అవుతాయి; WhatsApp notification మీ explicit WhatsApp number మరియు delivery setup మీద ఆధారపడి ఉంటుంది.</> : <>Deliverables and terms depend on the package: the ₹{promoKitPrice} one-day private share-ready kit includes access for one day after approval and is not a directory listing; directory-listing packages start at ₹{listingStart}. Enquiries are recorded in your dashboard; WhatsApp notifications require your explicitly supplied number and configured delivery.</>}
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
            <span className="px-3 py-1 rounded-full bg-white/10">{te ? "✅ రెండు నిమిషాల ఫారం" : "✅ Two-minute form"}</span>
            <span className="px-3 py-1 rounded-full bg-white/10">{te ? "Promo material share-ready" : "Share-ready promo material"}</span>
            <span className="px-3 py-1 rounded-full bg-gold text-maroon font-bold">{te ? "Enquiries dashboard లో" : "Enquiries in dashboard"}</span>
          </div>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-4 py-5 space-y-4">
        {errs.length > 0 && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl px-4 py-3">
            <div className="font-bold text-rose-800 text-[13px]">{te ? "ఇవి సరిచెయ్యాలి:" : "Please fix these:"}</div>
            <ul className="mt-1 text-[12px] text-rose-700 list-disc list-inside">
              {errs.slice(0, 6).map((e) => <li key={e}>{e}</li>)}
            </ul>
          </div>
        )}

        {/* CATEGORY */}
        <div className="bg-white rounded-3xl border border-gold/30 p-4">
          <label className="text-[13px] font-bold text-ink">1. {te ? "మీ category" : "Your category"} <span className="text-maroon">*</span></label>
          <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
            {cats.map((c) => (
              <button key={c.key} type="button" onClick={() => set("category", c.key)}
                className={`rounded-2xl border-2 p-2.5 text-left text-[12px] font-semibold ${f.category === c.key ? "border-maroon bg-maroon-soft" : "border-gold/30 bg-white"}`}>
                <div className="text-lg">{c.icon}</div>
                <div className="text-maroon">{c.en}</div>
                {te && <div className="text-[10px] text-gray-500 telugu">{c.te}</div>}
              </button>
            ))}
          </div>
        </div>

        {/* BUSINESS */}
        <div className="bg-white rounded-3xl border border-gold/30 p-4 space-y-3">
          <div className="text-[13px] font-bold text-ink">2. Business details</div>
          <input className="input-mobile" placeholder={te ? "నమోదు చేసిన వ్యాపార పేరు *" : "Registered business name *"}
            value={f.business_name} onChange={(e) => set("business_name", e.target.value)} aria-label="Business name" />
          <div className="grid sm:grid-cols-2 gap-3">
            <input className="input-mobile" placeholder={te ? "Owner పేరు" : "Owner name"} value={f.owner_name} onChange={(e) => set("owner_name", e.target.value)} aria-label={te ? "Owner పేరు" : "Owner name"} />
            <input className="input-mobile" placeholder="Experience (years)" value={f.experience_years} onChange={(e) => set("experience_years", e.target.value.replace(/\D/g, "").slice(0, 2))} inputMode="numeric" aria-label="Experience (years)" />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <input className="input-mobile" placeholder="Mobile number * (10 digits)" value={f.phone}
              onChange={(e) => set("phone", e.target.value.replace(/\D/g, "").slice(0, 10))} inputMode="numeric" aria-label="Mobile number * (10 digits)" />
            <input className="input-mobile" placeholder={te ? "WhatsApp number (optional; ఖాళీగా ఉంటే button చూపదు)" : "WhatsApp number (optional; leave blank to hide WhatsApp button)"} value={f.whatsapp}
              onChange={(e) => set("whatsapp", e.target.value.replace(/\D/g, "").slice(0, 10))} inputMode="numeric" aria-label="WhatsApp number" />
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <input className="input-mobile" placeholder="City / town *" value={f.city} onChange={(e) => set("city", e.target.value)} aria-label="City / town *" />
            <input className="input-mobile" placeholder="District" value={f.district} onChange={(e) => set("district", e.target.value)} aria-label="District" />
            <select className="input-mobile" value={f.state} onChange={(e) => set("state", e.target.value)} aria-label="Select option">
              <option value="TS">Telangana</option>
              <option value="AP">Andhra Pradesh</option>
              <option value="KA">Karnataka</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <input className="input-mobile" placeholder={te ? "సేవలు అందించే నగరాలు, జిల్లాలు నమోదు చేయండి" : "List the cities and districts you serve"}
            value={f.service_areas} onChange={(e) => set("service_areas", e.target.value)} aria-label="Service areas" />
          <input className="input-mobile" placeholder={te ? "ధరల పరిధి మరియు ధర నిర్ణయించే విధానం" : "Describe your price range and pricing basis"}
            value={f.price_range} onChange={(e) => set("price_range", e.target.value)} aria-label="Rate range" />
          <textarea className="input-mobile min-h-[90px]" placeholder={te ? "మీ సేవలు, అనుభవం గురించి సంక్షిప్తంగా రాయండి" : "Describe your services and experience"}
            value={f.about} onChange={(e) => set("about", e.target.value)} aria-label="Text area" />
          <input className="input-mobile" placeholder={te ? "Photo/logo URL (optional)" : "Photo/logo URL (optional)"}
            value={f.photo_url} onChange={(e) => set("photo_url", e.target.value)} aria-label="Photo/logo URL" />
        </div>

        {/* PACKAGE */}
        <div className="bg-white rounded-3xl border border-gold/30 p-4">
          <label className="text-[13px] font-bold text-ink">3. Ad package <span className="text-maroon">*</span></label>
          <div className="mt-2 space-y-2">
            {pkgs.map((p) => (
              <button key={p.code} type="button" onClick={() => set("package", p.code)}
                className={`w-full text-left rounded-2xl border-2 p-3 ${f.package === p.code ? "border-maroon bg-maroon-soft" : "border-gold/30 bg-white"}`}>
                <div className="flex items-center justify-between">
                  <div className="font-bold text-maroon text-[13px]">{te ? p.name : englishText((p as any).name_en || p.name, p.code)}</div>
                  <div className="font-extrabold text-maroon">₹{p.price} <span className="text-[10px] font-semibold text-gray-500">{p.code === "V_SINGLE_POST" ? (te ? "· 1 రోజు private kit" : "· 1-day private kit") : p.code === "V_STATUS_BLAST" ? (te ? "· ఒక్కసారి kit" : "· one-time kit") : `/ ${p.days}d`}</span></div>
                </div>
                <div className="text-[11px] text-gray-600 mt-0.5">{te ? p.telugu : englishText(p.description_en || p.perks?.[0], "Package details are available after selection.")}</div>
                <ul className="mt-1 grid sm:grid-cols-2 gap-x-3 text-[10px] text-gray-600">
                  {(p.perks || []).slice(0, 4).map((perk) => te ? perk : englishText(perk, "")).filter(Boolean).map((perk) => <li key={perk}>✅ {perk}</li>)}
                </ul>
              </button>
            ))}
          </div>
          {selectedPkg && (
            <div className="mt-2 text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
{te ? <>Selected: <b>{selectedPkg.name}</b> — ₹{selectedPkg.price}{selectedPkg.code === "V_SINGLE_POST" ? " · 1 రోజు private kit access" : selectedPkg.code === "V_STATUS_BLAST" ? " · one-time share kit" : ` / ${selectedPkg.days} days`}. Review తర్వాత package access/activation నిర్ణయం; external posting లేదా reach హామీ లేదు.</> : <>Selected: <b>{englishText((selectedPkg as any).name_en || selectedPkg.name, selectedPkg.code)}</b> — ₹{selectedPkg.price}{selectedPkg.code === "V_SINGLE_POST" ? " · 1-day private kit access" : selectedPkg.code === "V_STATUS_BLAST" ? " · one-time share kit" : ` / ${selectedPkg.days} days`}. Package access or listing activation follows review; external posting or reach is not guaranteed.</>}
            </div>
          )}
        </div>

        <div className="bg-cream border border-gold/40 rounded-2xl px-4 py-3 text-[11px] text-gray-700">
{te ? <>🔒 మీరు ఇచ్చిన business phone listing లో Call contact గా కనిపించవచ్చు. WhatsApp button కోసం వేరే WhatsApp number ఇవ్వండి; అది ఖాళీగా ఉంటే button ఉండదు. Customer enquiry లోని contact details ఎంపిక చేసిన vendor కి మరియు అవసరమైన site operations కోసం పంపబడవచ్చు. Terms: manavivaha.in/terms</> : <>🔒 The supplied business phone may appear as a call contact. Provide a separate WhatsApp number for a WhatsApp button; if blank, no button is shown. Contact details from an enquiry are sent to the selected vendor and may be processed for site operations. Terms: manavivaha.in/terms</>}
        </div>

        <button onClick={submit} disabled={busy}
          className="w-full maroon-gradient text-white font-bold text-[15px] py-4 rounded-2xl disabled:opacity-60">
          {busy ? (te ? "⏳ Submit అవుతుంది…" : "⏳ Submitting…") : te ? "🏪 Vendor request పంపండి (free signup)" : "🏪 Send vendor request (free signup)"}
        </button>
      </div>
    </div>
  );
}
