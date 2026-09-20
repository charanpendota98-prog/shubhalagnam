"use client";
/**
 * 🏪 VENDOR ADS & DIRECTORY — మన వివాహ
 * ======================================
 * "Pelli sambandham related vaallaki promotions kooda cheyyali bestga"
 *  • 18 categories (catering, photography, decorations, hall, pandit, makeup...)
 *  • Ad packages ₹149 → ₹3999 (+ add-ons)
 *  • Vendor directory (filter: category/district/search) + WhatsApp CTA
 *  • Own vendor → dashboard (impressions, clicks, enquiries) + promo poster
 */
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Duo, duo } from "@/lib/duo";
import { useLang } from "@/lib/lang";
import { apiFetch } from "@/lib/api";

type Cat = { key: string; en: string; te: string; icon: string; count?: number };
type Vendor = any;

export default function VendorsPage() {
  const { lang } = useLang();
  const te = lang === "te";
  const [data, setData] = useState<any>(null);
  const [pkgs, setPkgs] = useState<any>(null);
  const [cats, setCats] = useState<Cat[]>([]);
  const [cat, setCat] = useState("");
  const [district, setDistrict] = useState("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");
  const [copied, setCopied] = useState("");

  useEffect(() => {
    let alive = true;
    Promise.all([
      apiFetch<{ categories?: Cat[] }>("/api/vendors/categories"),
      apiFetch<any>("/api/vendors/packages"),
    ]).then(([categories, packages]) => {
      if (!alive) return;
      if (categories.ok) setCats(categories.data?.categories || []);
      if (packages.ok) setPkgs(packages.data);
      if (!categories.ok && !packages.ok) setApiError(categories.errorTelugu || "Vendor service unavailable");
    });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      setLoading(true);
      setApiError("");
      const params = new URLSearchParams();
      if (cat) params.set("category", cat);
      if (district) params.set("district", district);
      if (q) params.set("q", q);
      const result = await apiFetch<any>(`/api/vendors?${params.toString()}`, { timeoutMs: 10000, retries: 2 });
      if (!alive) return;
      if (result.ok) setData(result.data);
      else setApiError(result.errorTelugu || "Vendor service unavailable");
      setLoading(false);
    };
    void load();
    return () => { alive = false; };
  }, [cat, district, q]);

  const vendors: Vendor[] = data?.vendors || [];
  const districts = useMemo(() => {
    const set = new Set<string>();
    vendors.forEach((v) => v.district && set.add(v.district));
    return Array.from(set).slice(0, 14);
  }, [vendors]);

  const copy = (t: string, k: string) => {
    navigator.clipboard?.writeText(t);
    setCopied(k);
    setTimeout(() => setCopied(""), 1500);
  };

  return (
    <main className="min-h-screen bg-cream pb-20">
      {/* HERO */}
      <section className="maroon-gradient text-white">
        <div className="max-w-7xl mx-auto px-4 py-9">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold">
                🏪 <Duo en="Wedding Vendors" te="పెళ్లి వెండర్లు" /> — <span className="text-gold">{duo("everything for your wedding, one place", "పెళ్లికి కావాల్సినవన్నీ ఒకేచోట")}</span>
              </h1>
              <p className="text-[13px] opacity-90 mt-2 telugu max-w-3xl">
                Catering • Photography • Decorations • Function Hall • Tent House • Pandit • Jewellery • Makeup •
                Mehendi • DJ/Band • Invitations • Cars • Planners • Cake • Gifts • Honeymoon — 18 categories.
                <br />
                {te ? <><b>మీ business కూడా promote చెయ్యండి — ₹149 నుంచి</b> (52 channels + WhatsApp lanes + leads direct మీ WhatsApp కి).</> : <><b>Promote your business too — from ₹149</b> (52 channels + WhatsApp lanes + leads direct to your WhatsApp).</>}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/vendors/register" className="rounded-full gold-gradient text-maroon px-4 py-2 text-xs font-bold">
                {te ? "🏪 మీ business ని add చెయ్యండి" : "🏪 Add your business"}
              </Link>
              <a href="#packages" className="rounded-full bg-white/10 border border-white/25 px-4 py-2 text-xs font-bold">
                Ad packages 💰
              </a>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
            <span className="px-3 py-1 rounded-full bg-white/10">{cats.length || 18} categories</span>
            <span className="px-3 py-1 rounded-full bg-white/10">{data?.total ?? "…"} vendors listed</span>
            <span className="px-3 py-1 rounded-full bg-[#D4AF37] text-maroon font-bold">Verified badge + rating</span>
            <span className="px-3 py-1 rounded-full bg-white/10">{te ? "Enquiries direct మీ WhatsApp కి" : "Enquiries direct to your WhatsApp"}</span>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4">
        {/* FILTERS */}
        <section className="mt-6 bg-white rounded-3xl border border-gold/30 card-shadow p-4">
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setCat("")}
              className={`px-3 py-1.5 rounded-full text-[12px] font-bold border ${!cat ? "maroon-gradient text-white border-transparent" : "border-maroon/20 text-maroon"}`}>
              {te ? "అన్నీ" : "All"} ({data?.total ?? 0})
            </button>
            {cats.map((c) => (
              <button key={c.key} onClick={() => setCat(cat === c.key ? "" : c.key)}
                className={`px-3 py-1.5 rounded-full text-[12px] font-bold border ${cat === c.key ? "maroon-gradient text-white border-transparent" : "border-maroon/20 text-maroon"}`}>
                {c.icon} {c.en}{c.count ? ` · ${c.count}` : ""}
              </button>
            ))}
          </div>
          <div className="mt-3 grid md:grid-cols-2 gap-3">
            <input value={district} onChange={(e) => setDistrict(e.target.value)}
              placeholder={te ? "District / city (ఉదాహరణ: Warangal, Hyderabad, Guntur)" : "District / city (e.g. Warangal, Hyderabad, Guntur)"}
              className="input-mobile" aria-label="District / city" />
            <input value={q} onChange={(e) => setQ(e.target.value)}
              placeholder={te ? "Search (business పేరు, service, keywords)" : "Search (business name, service, keywords)"}
              className="input-mobile" aria-label="Search vendors" />
          </div>
          {districts.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {districts.map((d) => (
                <button key={d} onClick={() => setDistrict(d)}
                  className="px-2.5 py-1 rounded-full bg-maroon-soft text-maroon text-[11px] font-semibold">📍 {d}</button>
              ))}
            </div>
          )}
        </section>

        {/* DIRECTORY */}
        <section className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-bold text-maroon text-lg min-w-0">
              {cat ? `${cats.find((c) => c.key === cat)?.icon || ""} ${cats.find((c) => c.key === cat)?.en || cat}` : te ? "అన్ని vendors" : "All vendors"} — {vendors.length}
            </h2>
            {loading && <span className="text-[11px] text-gray-500 shrink-0">⏳ {duo("loading…", "లోడ్ అవుతోంది…")}</span>}
          </div>

          {apiError && (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-center text-[12px] text-rose-800" role="alert">
              <div className="font-bold">⚠️ {te ? "Vendor data ఇప్పుడే లోడ్ కాలేదు" : "Vendor data is temporarily unavailable"}</div>
              <div className="mt-1">{apiError}</div>
              <button onClick={() => { setApiError(""); setQ((value) => value + " "); setTimeout(() => setQ((value) => value.trim()), 0); }} className="mt-3 rounded-full bg-rose-700 px-4 py-2 font-bold text-white">{te ? "మళ్లీ ప్రయత్నించండి" : "Try again"}</button>
            </div>
          )}
          {!loading && !apiError && vendors.length === 0 && (
            <div className="mt-4 bg-white rounded-3xl border border-gold/30 p-6 text-center">
              <div className="text-4xl">🔍</div>
              <div className="mt-2 font-bold text-maroon">{te ? "ఈ filter కి vendors దొరకలేదు" : "No vendors for this filter"}</div>
              <div className="text-[12px] text-gray-600 mt-1 telugu">
                {te ? "మీ business ని మొదటిగా add చెయ్యండి — మన team 2 గంటల్లో verify చేసి listing live చేస్తుంది." : "Add your business first — our team verifies in 2 hours and takes the listing live."}
              </div>
              <Link href="/vendors/register" className="mt-3 inline-block gold-gradient text-maroon font-bold text-[12px] px-4 py-2.5 rounded-xl">
                {te ? "🏪 Free గా register చెయ్యండి" : "🏪 Register free"}
              </Link>
            </div>
          )}

          <div className="mt-3 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vendors.map((v) => (
              <div key={v.id} className="bg-white rounded-3xl border border-gold/30 card-shadow overflow-hidden flex flex-col">
                <div className="px-4 pt-4 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-lg">{v.icon}</span>
                      <h3 className="font-bold text-maroon text-[15px] truncate">{v.business_name}</h3>
                    </div>
                    <div className="text-[11px] text-gray-600 mt-0.5">{v.category_te || v.category}</div>
                    <div className="text-[11px] text-gray-500 mt-0.5">📍 {v.city}{v.district && v.district !== v.city ? `, ${v.district}` : ""}</div>
                  </div>
                  <div className="text-right shrink-0">
                    {v.verified && <div className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">✅ Verified</div>}
                    {v.package === "V_PREMIUM" && <div className="mt-1 text-[10px] font-bold text-maroon bg-gold/20 rounded-full px-2 py-0.5">👑 Premium</div>}
                  </div>
                </div>
                {v.about && <div className="px-4 mt-2 text-[12px] text-gray-700 line-clamp-3">{v.about}</div>}
                <div className="px-4 mt-2 flex flex-wrap gap-1.5 text-[11px]">
                  {v.price_range && <span className="px-2 py-0.5 rounded-full bg-cream border border-gold/30 text-maroon font-semibold">💰 {v.price_range}</span>}
                  {v.experience_years && <span className="px-2 py-0.5 rounded-full bg-cream border border-gold/30">⭐ {v.experience_years} yrs</span>}
                </div>
                <div className="mt-auto px-4 py-3 flex flex-wrap gap-2">
                  {v.whatsapp_link && (
                    <a href={v.whatsapp_link} target="_blank" rel="noreferrer"
                      onClick={() => fetch(`/api/vendors/${v.id}/click?source=directory`, { method: "POST" }).catch(() => { })}
                      className="flex-1 text-center bg-green-600 text-white font-bold text-[12px] px-3 py-2.5 rounded-xl">
                      💬 WhatsApp
                    </a>
                  )}
                  <Link href={`/vendors/${v.id}`} className="flex-1 text-center border border-maroon/25 text-maroon font-bold text-[12px] px-3 py-2.5 rounded-xl">
                    Details / Enquiry
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* PACKAGES */}
        <section id="packages" className="mt-10">
          <h2 className="font-bold text-maroon text-xl">💰 <Duo en="Ad Packages — publicity for your business" te="మీ వ్యాపారానికి ప్రచారం" /></h2>
          <p className="text-[12px] text-gray-600 mt-1 telugu">
            {pkgs?.headline || (te ? "మీ business ని మన వివాహ లో promote చెయ్యండి — ₹149 నుంచి" : "Promote your business on మన వివాహ — from ₹149")}
          </p>
          <div className="mt-4 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(pkgs?.packages || []).map((p: any) => (
              <div key={p.code} className={`bg-white rounded-3xl border p-4 card-shadow ${p.popular ? "border-gold ring-2 ring-gold/40" : "border-gold/30"}`}>
                {p.popular && <div className="text-[10px] font-bold gold-gradient text-maroon inline-block px-2 py-0.5 rounded-full mb-1">🔥 MOST POPULAR</div>}
                <div className="font-bold text-maroon text-[15px]">{p.name}</div>
                <div className="mt-1 text-2xl font-extrabold text-maroon">
                  ₹{p.price} <span className="text-[12px] font-semibold text-gray-500">/ {p.days} days</span>
                </div>
                <div className="text-[12px] text-gray-700 mt-1">{p.telugu}</div>
                <ul className="mt-2 space-y-1 text-[11px] text-gray-700">
                  {(p.perks || []).map((x: string) => <li key={x}>✅ {x}</li>)}
                </ul>
                {p.best_for && <div className="mt-2 text-[11px] text-maroon bg-cream rounded-xl px-2 py-1">🎯 {p.best_for}</div>}
                <Link href={`/vendors/register?package=${p.code}`}
                  className="mt-3 block text-center maroon-gradient text-white font-bold text-[12px] px-4 py-2.5 rounded-xl">
                  {te ? "ఈ package తీసుకోండి" : "Take this package"}
                </Link>
              </div>
            ))}
          </div>

          <div className="mt-4 grid md:grid-cols-2 gap-4">
            <div className="bg-white rounded-3xl border border-gold/30 p-4">
              <div className="font-bold text-maroon">{te ? "➕ Add-ons (package తో కలిపి)" : "➕ Add-ons (with package)"}</div>
              <div className="mt-2 space-y-1 text-[12px]">
                {(pkgs?.addons || []).map((a: any) => (
                  <div key={a.code} className="flex items-center justify-between border-b border-gray-100 py-1.5">
                    <span>{a.name}</span><b className="text-maroon">₹{a.price}</b>
                  </div>
                ))}
              </div>
              <div className="mt-2 text-[11px] text-gray-500">{te ? <>Renewal కి {pkgs?.renewal_discount_pct || 15}% discount.</> : <>{pkgs?.renewal_discount_pct || 15}% discount on renewal.</>}</div>
            </div>
            <div className="bg-white rounded-3xl border border-gold/30 p-4">
              <div className="font-bold text-maroon">{te ? "🔄 ఎలా పని చేస్తుంది (5 steps)" : "🔄 How it works (5 steps)"}</div>
              <ol className="mt-2 space-y-1 text-[12px] text-gray-700 list-decimal list-inside">
                {(pkgs?.how_it_works_telugu || []).map((s: string) => <li key={s}>{s.replace(/^\d️⃣\s*/, "")}</li>)}
              </ol>
              <div className="mt-2 text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                {te ? "📊 Impressions / clicks / enquiries అన్నీ మీ dashboard లో live గా కనిపిస్తాయి — ఏది పని చేసిందో తెలుస్తుంది." : "📊 Impressions / clicks / enquiries all live in your dashboard — you\u2019ll know what works."}
              </div>
            </div>
          </div>
        </section>

        {/* WHY */}
        <section className="mt-8 grid md:grid-cols-2 gap-4">
          <div className="bg-white rounded-3xl border border-gold/30 p-5">
            <h3 className="font-bold text-maroon">{te ? "🎯 ఎందుకు మన వివాహ?" : "🎯 Why మన వివాహ?"}</h3>
            <ul className="mt-2 space-y-1 text-[12px] text-gray-700">
              {(pkgs?.why_telugu || []).map((w: string) => <li key={w}>{w}</li>)}
            </ul>
          </div>
          <div className="bg-navy text-white rounded-3xl p-5">
            <h3 className="font-bold">{te ? "📢 మన channels లో మీ promo ఎలా వెళ్తుంది" : "📢 How your promo travels our channels"}</h3>
            <ul className="mt-2 space-y-1 text-[12px] opacity-90">
              <li>{te ? "• Telegram: మీ city/caste channel + 4 main channels (bride/groom TS/AP)" : "• Telegram: your city/caste channel + 4 main channels (bride/groom TS/AP)"}</li>
              <li>{te ? "• WhatsApp: status + groups లో కూడా" : "• WhatsApp: status + groups too"}</li>
              <li>{te ? "• Website: home top banner, /vendors page లో top slot, matches sidebar" : "• Website: home top banner, top slot on /vendors, matches sidebar"}</li>
              <li>{te ? "• Poster with QR — మీ customers direct గా WhatsApp చెయ్యొచ్చు" : "• Poster with QR — your customers can WhatsApp directly"}</li>
            </ul>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href="/vendors/register" className="gold-gradient text-maroon font-bold text-[12px] px-4 py-2.5 rounded-xl">
                {te ? "🏪 ఇప్పుడే join అవ్వండి" : "🏪 Join now"}
              </Link>
              <button onClick={() => copy("https://manavivaha.in/vendors", "link")}
                className="bg-white/10 border border-white/25 font-bold text-[12px] px-4 py-2.5 rounded-xl">
                {copied === "link" ? "copied ✓" : "🔗 link copy"}
              </button>
            </div>
          </div>
        </section>

        <div className="mt-8 text-[11px] text-gray-500 text-center">
{te ? <>⚠️ Vendor listings మన team verify చేస్తుంది (phone + business proof). Customers: advance money ఇవ్వకండి —
          agreement + bill తీసుకోండి. Problem ఉంటే report చెయ్యండి: manavivaha.in/safety</> : <>⚠️ Our team verifies vendor listings (phone + business proof). Customers: don\u2019t pay advance —
          take agreement + bill. Problem? Report: manavivaha.in/safety</>}
        </div>
      </div>
    </main>
  );
}
