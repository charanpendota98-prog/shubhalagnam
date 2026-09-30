"use client";
/**
 * 🏪 VENDOR REGISTER — mee business ni మన వివాహ lo promote cheyyandi
 * ==================================================================
 * 18 categories (catering, photography, decorations, hall, pandit...) + ad packages ₹149 → ₹3999.
 * Register → payment (UPI/PhonePe) → admin verify (2 గంటల్లో) → listing ACTIVE + promo post + poster.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/lang";

type Cat = { key: string; en: string; te: string; icon: string; kw: string };
type Pkg = { code: string; name: string; price: number; days: number; telugu: string; perks: string[]; popular?: boolean };

const EMPTY = {
  business_name: "", owner_name: "", category: "", phone: "", whatsapp: "", city: "", district: "",
  state: "TS", service_areas: "", price_range: "", about: "", experience_years: "", photo_url: "",
  package: "V_STANDARD", source: "website",
};

export default function VendorRegisterPage() {
  const { lang } = useLang();
  const te = lang === "te";
  const [cats, setCats] = useState<Cat[]>([]);
  const [pkgs, setPkgs] = useState<Pkg[]>([]);
  const [f, setF] = useState<any>({ ...EMPTY });
  const [busy, setBusy] = useState(false);
  const [errs, setErrs] = useState<string[]>([]);
  const [res, setRes] = useState<any>(null);
  const [copied, setCopied] = useState("");

  useEffect(() => {
    fetch("/api/vendors/categories").then((r) => r.json()).then((d) => setCats(d.categories || [])).catch(() => { });
    fetch("/api/vendors/packages").then((r) => r.json()).then((d) => {
      setPkgs(d.packages || []);
      const q = new URLSearchParams(window.location.search).get("package");
      if (q) setF((p: any) => ({ ...p, package: q.toUpperCase() }));
      // default: popular package
      const pop = (d.packages || []).find((p: Pkg) => p.popular);
      if (pop && !q) setF((p: any) => ({ ...p, package: pop.code }));
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
        body: JSON.stringify({ ...f, phone: f.phone.replace(/\D/g, ""), whatsapp: (f.whatsapp || f.phone).replace(/\D/g, "") }),
      });
      const d = await r.json();
      if (!r.ok || !d.success) setErrs(d.problems || [d.message_telugu || (te ? "Register అవ్వలేదు — మళ్లీ try చెయ్యండి" : "Register failed — retry")]);
      else setRes(d);
    } catch {
      setErrs([te ? "Server problem — కొంచెం తర్వాత మళ్లీ try చెయ్యండి" : "Server problem — retry after some time"]);
    } finally {
      setBusy(false);
    }
  };

  const selectedPkg = pkgs.find((p) => p.code === f.package);
  const copy = (t: string, k: string) => { navigator.clipboard?.writeText(t); setCopied(k); setTimeout(() => setCopied(""), 1500); };

  /* ---------------- SUCCESS ---------------- */
  if (res) {
    const v = res.vendor;
    return (
      <main className="min-h-dvh bg-cream pb-20">
        <section className="maroon-gradient text-white">
          <div className="max-w-3xl mx-auto px-4 py-9 text-center">
            <div className="text-5xl">🎉</div>
            <h1 className="mt-2 text-2xl font-bold">{te ? "మీ vendor request వచ్చింది!" : "Vendor request received!"}</h1>
            <div className="mt-3 inline-flex flex-wrap items-center gap-2 justify-center bg-white/10 border border-white/25 rounded-2xl px-4 py-3">
              <span className="font-mono text-lg font-bold">{v.id}</span>
              <button onClick={() => copy(v.id, "id")} className="text-[11px] font-bold gold-gradient text-maroon px-3 py-1.5 rounded-full">
                {copied === "id" ? "copied ✓" : "ID copy"}
              </button>
              <span className="text-[12px] opacity-90">{v.business_name} · {v.category_te}</span>
            </div>
          </div>
        </section>

        <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
          <div className="bg-white rounded-3xl border border-gold/30 p-5">
            <div className="font-bold text-maroon text-[15px]">{te ? <>💰 ఇప్పుడు payment చెయ్యండి — ₹{res.amount}</> : <>💰 Pay now — ₹{res.amount}</>}</div>
            <div className="text-[12px] text-gray-600 mt-1">
              {te ? <>Package: <b>{res.package.name}</b> ({res.package.days} days). Payment verify అయ్యగానే listing ACTIVE అవుతుంది (2 గంటల్లో).</> : <>Package: <b>{res.package.name}</b> ({res.package.days} days). Listing goes ACTIVE once payment verifies (within 2 hours).</>}
            </div>
            <ol className="mt-3 space-y-1 text-[12px] text-gray-700 list-decimal list-inside">
              {(res.steps_telugu || []).map((s: string) => <li key={s}>{s.replace(/^\d️⃣\s*/, "")}</li>)}
            </ol>
            <div className="mt-3 flex flex-wrap gap-2">
              {res.phonepe_link && (
                <a href={res.phonepe_link} className="gold-gradient text-maroon font-bold text-[12px] px-4 py-2.5 rounded-xl">
                  {te ? "📱 PhonePe / UPI తో pay చెయ్యండి" : "📱 Pay with PhonePe / UPI"}
                </a>
              )}
              <button onClick={() => copy(String(res.vendor_id), "ref")}
                className="border border-maroon/25 text-maroon font-bold text-[12px] px-4 py-2.5 rounded-xl">
                {copied === "ref" ? "copied ✓" : (te ? "📋 Reference copy (payment note లో పెట్టండి)" : "📋 Copy reference (put in payment note)")}
              </button>
            </div>
            {res.upi_id && <div className="mt-2 text-[12px] text-gray-600">UPI ID: <b>{res.upi_id}</b></div>}
          </div>

          <div className="bg-cream border border-gold/40 rounded-3xl p-5">
            <div className="font-bold text-maroon">{te ? "✅ Payment తర్వాత ఏం అవుతుంది?" : "✅ What happens after payment?"}</div>
            <ul className="mt-2 space-y-1 text-[12px] text-gray-700">
              <li>1️⃣ {te ? "Admin verify (2 గంటల్లో) → listing ACTIVE + ✅ Verified badge" : "Admin verifies (within 2 hours) → listing ACTIVE + ✅ Verified badge"}</li>
              <li>2️⃣ {te ? "Telugu promo post ready — మీ city/caste channel + 4 main channels లో" : "Telugu promo post ready — your city/caste channel + 4 main channels"}</li>
              <li>3️⃣ {te ? "QR తో poster (square + status) — మీ WhatsApp groups లో పెట్టుకోండి" : "Poster with QR (square + status) — post in your WhatsApp groups"}</li>
              <li>4️⃣ {te ? "Enquiries direct మీ WhatsApp కి + dashboard లో impressions/clicks/leads" : "Enquiries direct to your WhatsApp + impressions/clicks/leads in dashboard"}</li>
            </ul>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href={`/vendors/${v.id}`} className="maroon-gradient text-white font-bold text-[12px] px-4 py-2.5 rounded-xl">
                {te ? "📊 మీ vendor page (dashboard)" : "📊 Your vendor page (dashboard)"}
              </Link>
              <Link href="/vendors" className="border border-maroon/25 text-maroon font-bold text-[12px] px-4 py-2.5 rounded-xl">
                🏪 Vendors directory
              </Link>
            </div>
          </div>
          <div className="text-[11px] text-gray-500 text-center">
            {te ? <>Support: మన WhatsApp number కి screenshot పంపండి — reference <b>{v.id}</b></> : <>Support: send screenshot to our WhatsApp number — reference <b>{v.id}</b></>}
          </div>
        </div>
      </main>
    );
  }

  /* ---------------- FORM ---------------- */
  return (
    <main className="min-h-dvh bg-cream pb-24">
      <section className="maroon-gradient text-white">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="text-[12px] opacity-90 mb-1">
            <Link href="/vendors" className="underline">← Vendors</Link>
          </div>
          <h1 className="text-2xl font-extrabold">{te ? "🏪 మీ business ని మన వివాహ లో add చెయ్యండి" : "🏪 Add your business to మన వివాహ"}</h1>
          <p className="text-[13px] opacity-90 mt-2 telugu">
            Catering, photography, decorations, hall, tent, pandit, jewellery, makeup, DJ, invitations, cars, planner —
            {te ? <>2 నిమిషాల్లో register. <b>Enquiries direct మీ WhatsApp కి.</b> ₹149 నుంచి.</> : <>Register in 2 minutes. <b>Enquiries direct to your WhatsApp.</b> From ₹149.</>}
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
            <span className="px-3 py-1 rounded-full bg-white/10">✅ 2 నిమిషాల form</span>
            <span className="px-3 py-1 rounded-full bg-white/10">📢 52 channels + WhatsApp</span>
            <span className="px-3 py-1 rounded-full bg-gold text-maroon font-bold">{te ? "📞 Leads direct మీ number కి" : "📞 Leads direct to your number"}</span>
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
                <div className="text-[10px] text-gray-500 telugu">{c.te}</div>
              </button>
            ))}
          </div>
        </div>

        {/* BUSINESS */}
        <div className="bg-white rounded-3xl border border-gold/30 p-4 space-y-3">
          <div className="text-[13px] font-bold text-ink">2. Business details</div>
          <input className="input-mobile" placeholder={te ? "Business పేరు * (ఉదాహరణ: Sri Lakshmi Catering)" : "Business name * (e.g. Sri Lakshmi Catering)"}
            value={f.business_name} onChange={(e) => set("business_name", e.target.value)} aria-label="Business name" />
          <div className="grid sm:grid-cols-2 gap-3">
            <input className="input-mobile" placeholder={te ? "Owner పేరు" : "Owner name"} value={f.owner_name} onChange={(e) => set("owner_name", e.target.value)} aria-label={te ? "Owner పేరు" : "Owner name"} />
            <input className="input-mobile" placeholder="Experience (years)" value={f.experience_years} onChange={(e) => set("experience_years", e.target.value.replace(/\D/g, "").slice(0, 2))} inputMode="numeric" aria-label="Experience (years)" />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <input className="input-mobile" placeholder="Mobile number * (10 digits)" value={f.phone}
              onChange={(e) => set("phone", e.target.value.replace(/\D/g, "").slice(0, 10))} inputMode="numeric" aria-label="Mobile number * (10 digits)" />
            <input className="input-mobile" placeholder={te ? "WhatsApp number (వేరు ఉంటే)" : "WhatsApp number (if different)"} value={f.whatsapp}
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
          <input className="input-mobile" placeholder={te ? "Service areas (ఉదాహరణ: Warangal, Hanamkonda, Kazipet)" : "Service areas (e.g. Warangal, Hanamkonda, Kazipet)"}
            value={f.service_areas} onChange={(e) => set("service_areas", e.target.value)} aria-label="Service areas" />
          <input className="input-mobile" placeholder={te ? "Rate range (ఉదాహరణ: ₹250-450 per plate / ₹40,000 నుంచి)" : "Rate range (e.g. ₹250-450 per plate / from ₹40,000)"}
            value={f.price_range} onChange={(e) => set("price_range", e.target.value)} aria-label="Rate range" />
          <textarea className="input-mobile min-h-[90px]" placeholder={te ? "మీ business గురించి 3-4 lines (Telugu/English) — customers కి ఇదే కనిపిస్తుంది" : "3-4 lines about your business (Telugu/English) — customers see this"}
            value={f.about} onChange={(e) => set("about", e.target.value)} aria-label="Text area" />
          <input className="input-mobile" placeholder={te ? "Photo/logo URL (optional — తర్వాత WhatsApp లో పంపొచ్చు)" : "Photo/logo URL (optional — can send later on WhatsApp)"}
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
                  <div className="font-bold text-maroon text-[13px]">{p.name} {p.popular ? "🔥" : ""}</div>
                  <div className="font-extrabold text-maroon">₹{p.price} <span className="text-[10px] font-semibold text-gray-500">/ {p.days}d</span></div>
                </div>
                <div className="text-[11px] text-gray-600 mt-0.5">{p.telugu}</div>
                <ul className="mt-1 grid sm:grid-cols-2 gap-x-3 text-[10px] text-gray-600">
                  {(p.perks || []).slice(0, 4).map((x) => <li key={x}>✅ {x}</li>)}
                </ul>
              </button>
            ))}
          </div>
          {selectedPkg && (
            <div className="mt-2 text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
{te ? <>Selected: <b>{selectedPkg.name}</b> — ₹{selectedPkg.price} / {selectedPkg.days} days.
              Payment verify అయ్యగానే listing + promo post live.</> : <>Selected: <b>{selectedPkg.name}</b> — ₹{selectedPkg.price} / {selectedPkg.days} days.
              Listing + promo post go live once payment verifies.</>}
            </div>
          )}
        </div>

        <div className="bg-cream border border-gold/40 rounded-2xl px-4 py-3 text-[11px] text-gray-700">
{te ? <>🔒 మీ number public గా కనిపిస్తుంది (customers WhatsApp చెయ్యడానికి) — వేరే వాళ్లకి ఇవ్వము.
          Fake listings remove చేస్తాం. Terms: manavivaha.in/terms</> : <>🔒 Your number shows publicly (so customers can WhatsApp) — we never share it elsewhere.
          Fake listings get removed. Terms: manavivaha.in/terms</>}
        </div>

        <button onClick={submit} disabled={busy}
          className="w-full maroon-gradient text-white font-bold text-[15px] py-4 rounded-2xl disabled:opacity-60">
          {busy ? (te ? "⏳ Submit అవుతుంది…" : "⏳ Submitting…") : te ? "🏪 Vendor request పంపండి (free signup)" : "🏪 Send vendor request (free signup)"}
        </button>
      </div>
    </main>
  );
}
