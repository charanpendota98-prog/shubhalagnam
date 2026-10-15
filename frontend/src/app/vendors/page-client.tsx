"use client";

import { apiDisplayMessage, readApiJson } from "@/lib/api";
/**
 * 🏪 VENDOR DIRECTORY — మన వివాహ
 * ================================
 *  • Vendor categories and searchable business listings
 *  • Paid listing/placement packages with prices from the API
 *  • Vendor enquiries, owner dashboard, and share-ready promo assets
 *  • External channel posting and WhatsApp delivery are not implied by a listing
 */
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Duo, duo } from "@/lib/duo";
import { useLang } from "@/lib/lang";
import { safeWhatsAppPhoneLink } from "@/lib/wa";

type Cat = { key: string; en: string; te: string; icon: string; count?: number };
type Vendor = any;
const EMPTY_VENDOR_LIST: Vendor[] = [];

export default function VendorsPage() {
  const { lang } = useLang();
  const te = lang === "te";
  const englishText = (value: unknown, fallback = "") => typeof value === "number"
    ? String(value)
    : apiDisplayMessage({ message_en: value }, false, fallback);
  const [data, setData] = useState<any>(null);
  const [pkgs, setPkgs] = useState<any>(null);
  const [cats, setCats] = useState<Cat[]>([]);
  const [cat, setCat] = useState("");
  const [district, setDistrict] = useState("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState("");

  useEffect(() => {
    fetch("/api/vendors/categories").then((r) => readApiJson(r)).then((d) => setCats(d.categories || [])).catch(() => { });
    fetch("/api/vendors/packages").then((r) => readApiJson(r)).then(setPkgs).catch(() => { });
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (cat) params.set("category", cat);
    if (district) params.set("district", district);
    if (q) params.set("q", q);
    fetch(`/api/vendors?${params.toString()}`)
      .then((r) => readApiJson(r))
      .then(setData)
      .catch(() => { })
      .finally(() => setLoading(false));
  }, [cat, district, q]);

  const vendors: Vendor[] = data?.vendors ?? EMPTY_VENDOR_LIST;
  const promoKit = (pkgs?.packages || []).find((p: any) => p.code === "V_SINGLE_POST");
  const listingPrices = (pkgs?.packages || []).filter((p: any) => !["V_SINGLE_POST", "V_STATUS_BLAST"].includes(p.code)).map((p: any) => Number(p.price)).filter((price: number) => Number.isFinite(price));
  const promoKitPrice = Number(promoKit?.price) || 149;
  const listingStart = listingPrices.length ? Math.min(...listingPrices) : 499;
  const districts = useMemo(() => {
    const set = new Set<string>();
    vendors.forEach((v) => v.district && set.add(v.district));
    return Array.from(set).sort((a, b) => a.localeCompare(b)).slice(0, 14);
  }, [vendors]);
  const visibleDistricts = te ? districts : districts.filter((value) => englishText(value));
  const categoryName = (item: Cat) => te
    ? item.te || item.en
    : englishText(item.en, item.key.replace(/_/g, " "));

  const copy = (t: string, k: string) => {
    navigator.clipboard?.writeText(t);
    setCopied(k);
    setTimeout(() => setCopied(""), 1500);
  };

  return (
    <div className="min-h-dvh bg-cream pb-36">
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
                {te ? <><b>Promo kit మరియు listing packages వేర్వేరు.</b> ₹{promoKitPrice} one-day private share-ready kit (approval తర్వాత 1 రోజు access; listing కాదు); directory-listing package ₹{listingStart} నుంచి. External posting లేదా reach హామీ లేదు.</> : <><b>Promotion kits and listing packages are different.</b> The ₹{promoKitPrice} one-day private share-ready kit includes access for one day after approval and is not a directory listing; directory-listing packages start at ₹{listingStart}. External posting or reach is not guaranteed.</>}
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
            <span className="px-3 py-1 rounded-full bg-white/10">{te ? "చెల్లింపు listing review ≠ identity verification" : "Payment/listing review is not identity verification"}</span>
            <span className="px-3 py-1 rounded-full bg-white/10">{te ? "Enquiries dashboard లో నమోదు అవుతాయి" : "Enquiries are recorded in the dashboard"}</span>
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
                {c.icon} {categoryName(c)}{c.count ? ` · ${c.count}` : ""}
              </button>
            ))}
          </div>
          <div className="mt-3 grid md:grid-cols-2 gap-3">
            <input value={district} onChange={(e) => setDistrict(e.target.value)}
              placeholder={te ? "జిల్లా లేదా నగరం వెతకండి" : "Search by district or city"}
              className="input-mobile" aria-label={te ? "జిల్లా లేదా నగరం" : "District or city"} />
            <input value={q} onChange={(e) => setQ(e.target.value)}
              placeholder={te ? "Search (business పేరు, service, keywords)" : "Search (business name, service, keywords)"}
              className="input-mobile" aria-label="Search vendors" />
          </div>
          {districts.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {visibleDistricts.map((d) => (
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
              {cat ? `${cats.find((c) => c.key === cat)?.icon || ""} ${cats.find((c) => c.key === cat) ? categoryName(cats.find((c) => c.key === cat)!) : cat.replace(/_/g, " ")}` : te ? "అన్ని vendors" : "All vendors"} — {vendors.length}
            </h2>
            {loading && <span className="text-[11px] text-gray-500 shrink-0">⏳ {duo("loading…", "లోడ్ అవుతోంది…")}</span>}
          </div>

          {!loading && vendors.length === 0 && (
            <div className="mt-4 bg-white rounded-3xl border border-gold/30 p-6 text-center">
              <div className="text-4xl">🔍</div>
              <div className="mt-2 font-bold text-maroon">{te ? "ఈ filter కి vendors దొరకలేదు" : "No vendors for this filter"}</div>
              <div className="text-[12px] text-gray-600 mt-1 telugu">
                {te ? "మీ business ను directory లో జోడించండి. Payment review listing placement కోసం మాత్రమే; ఇది business లేదా identity verification కాదు." : "Add your business to the directory. Payment review is for listing placement only; it does not verify the business or its identity."}
              </div>
              <Link href="/vendors/register" className="mt-3 inline-block gold-gradient text-maroon font-bold text-[12px] px-4 py-2.5 rounded-xl">
                {te ? "🏪 Free గా register చెయ్యండి" : "🏪 Register free"}
              </Link>
            </div>
          )}

          <div className="mt-3 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vendors.map((v) => {
              const category = te ? (v.category_te || v.category || "") : englishText(v.category_en, String(v.category || "Wedding service").replace(/_/g, " "));
              const city = te ? v.city : englishText(v.city);
              const districtName = te ? v.district : englishText(v.district);
              const about = te ? v.about : englishText(v.about, v.about ? "Description not available in English." : "");
              const priceRange = te ? v.price_range : englishText(v.price_range);
              const experience = te ? v.experience_years : englishText(v.experience_years);
              return (
              <div key={v.id} className="bg-white rounded-3xl border border-gold/30 card-shadow overflow-hidden flex flex-col">
                <div className="px-4 pt-4 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-lg">{v.icon}</span>
                      <h3 className="font-bold text-maroon text-[15px] truncate">{v.business_name}</h3>
                    </div>
                    <div className="text-[11px] text-gray-600 mt-0.5">{category}</div>
                    <div className="text-[11px] text-gray-500 mt-0.5">{[city, districtName && districtName !== city ? districtName : ""].filter(Boolean).length ? `📍 ${[city, districtName && districtName !== city ? districtName : ""].filter(Boolean).join(", ")}` : ""}</div>
                  </div>
                  <div className="text-right shrink-0">
                    {v.listing_details_reviewed && <div title={te ? "సమర్పించిన listing వివరాలను staff సమీక్షించారు; ఇది వ్యాపార గుర్తింపు, లైసెన్స్ లేదా సేవా నాణ్యతకు హామీ కాదు." : "Staff reviewed the submitted listing details; this does not certify business identity, licensing, or service quality."} className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">✓ {te ? "Listing వివరాల సమీక్ష" : "Listing details reviewed"}</div>}
                    {v.package === "V_PREMIUM" && <div className="mt-1 text-[10px] font-bold text-maroon bg-gold/20 rounded-full px-2 py-0.5">👑 Premium</div>}
                  </div>
                </div>
                {about && <div className="px-4 mt-2 text-[12px] text-gray-700 line-clamp-3">{about}</div>}
                <div className="px-4 mt-2 flex flex-wrap gap-1.5 text-[11px]">
                  {priceRange && <span className="px-2 py-0.5 rounded-full bg-cream border border-gold/30 text-maroon font-semibold">💰 {priceRange}</span>}
                  {experience && <span className="px-2 py-0.5 rounded-full bg-cream border border-gold/30">⭐ {experience} yrs</span>}
                </div>
                <div className="mt-auto px-4 py-3 flex flex-wrap gap-2">
                  {safeWhatsAppPhoneLink(te ? (v.whatsapp_link_te || v.whatsapp_link) : v.whatsapp_link_en) && (
                    <a href={safeWhatsAppPhoneLink(te ? (v.whatsapp_link_te || v.whatsapp_link) : v.whatsapp_link_en)} target="_blank" rel="noopener noreferrer"
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
              );
            })}
          </div>
        </section>

        {/* PACKAGES */}
        <section id="packages" className="mt-10">
          <h2 className="font-bold text-maroon text-xl">💰 <Duo en="Promotion Kits & Listing Packages" te="ప్రచార సామగ్రి & లిస్టింగ్ packages" /></h2>
          <p className="text-[12px] text-gray-600 mt-1 telugu">
            {(te ? pkgs?.headline_te : englishText(pkgs?.headline_en)) || (te
              ? "Promo kit మరియు listing package terms వేర్వేరు. External posting లేదా reach హామీ లేదు."
              : "Promotion-kit and listing terms differ. External posting or reach is not guaranteed.")}
          </p>
          <div className="mt-4 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(pkgs?.packages || []).map((p: any) => (
              <div key={p.code} className="bg-white rounded-3xl border border-gold/30 p-4 card-shadow">
                <div className="font-bold text-maroon text-[15px]">{te ? p.name : englishText(p.name, p.code || "Package")}</div>
                <div className="mt-1 text-2xl font-extrabold text-maroon">
                  ₹{p.price} <span className="text-[12px] font-semibold text-gray-500">{p.code === "V_SINGLE_POST" ? (te ? "· 1 రోజు private kit access" : "· 1-day private kit access") : p.code === "V_STATUS_BLAST" ? (te ? "· ఒక్కసారి kit" : "· one-time kit") : `/ ${p.days} days`}</span>
                </div>
                <div className="text-[12px] text-gray-700 mt-1">{te ? p.telugu : englishText(p.description_en, englishText(p.perks?.[0], "Package details are provided in the selected plan."))}</div>
                <ul className="mt-2 space-y-1 text-[11px] text-gray-700">
                  {(p.perks || []).map((x: string) => te ? x : englishText(x, "")).filter(Boolean).map((x: string) => <li key={x}>✅ {x}</li>)}
                </ul>
                {(te ? p.best_for : englishText(p.best_for_en)) && <div className="mt-2 text-[11px] text-maroon bg-cream rounded-xl px-2 py-1">🎯 {te ? p.best_for : englishText(p.best_for_en)}</div>}
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
                  <div key={a.code} className="flex flex-wrap items-center justify-between gap-1 border-b border-gray-100 py-1.5">
                    <span>{te ? a.name : englishText(a.name, "Add-on")}</span>
                    <span className="text-right"><b className="text-maroon">Reference ₹{a.price}</b><span className="block text-[10px] text-gray-500">{te ? "ప్రస్తుతం online లో అందుబాటులో లేదు — చెల్లించవద్దు" : "Not currently available online — do not pay"}</span></span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-3xl border border-gold/30 p-4">
              <div className="font-bold text-maroon">{te ? "🔄 ఎలా పని చేస్తుంది (5 steps)" : "🔄 How it works (5 steps)"}</div>
              <ol className="mt-2 space-y-1 text-[12px] text-gray-700 list-decimal list-inside">
                {(te ? (pkgs?.how_it_works_telugu || []) : (pkgs?.how_it_works_en || []).map((step: string) => englishText(step)).filter(Boolean)).map((s: string, index: number) => <li key={`${index}-${s}`}>{s.replace(/^\d️⃣?\.?\s*/, "")}</li>)}
              </ol>
              <div className="mt-2 text-[11px] text-gray-700 bg-cream border border-gold/30 rounded-xl px-3 py-2">
                {te ? "📊 Website నమోదు చేసిన impressions, clicks, enquiries dashboard లో కనిపిస్తాయి. బాహ్య reach లేదా delivery దీనితో నిర్ధారితం కాదు." : "📊 Site-recorded impressions, clicks, and enquiries appear in the dashboard. This does not verify external reach or delivery."}
              </div>
            </div>
          </div>
        </section>

        {/* WHY */}
        <section className="mt-8 grid md:grid-cols-2 gap-4">
          <div className="bg-white rounded-3xl border border-gold/30 p-5">
            <h3 className="font-bold text-maroon">{te ? "🎯 ఎందుకు మన వివాహ?" : "🎯 Why Mana Vivaha?"}</h3>
            <ul className="mt-2 space-y-1 text-[12px] text-gray-700">
              {(te ? (pkgs?.why_telugu || []) : (pkgs?.why_en || []).map((item: string) => englishText(item)).filter(Boolean)).map((w: string, index: number) => <li key={`${index}-${w}`}>{w}</li>)}
            </ul>
          </div>
          <div className="bg-navy text-white rounded-3xl p-5">
            <h3 className="font-bold">{te ? "📢 ప్రచార సామగ్రి & delivery" : "📢 Promotion assets & delivery"}</h3>
            <ul className="mt-2 space-y-1 text-[12px] opacity-90">
              <li>{te ? "• Promo text/poster tools share చేయడానికి material తయారు చేస్తాయి; channel కి post చేయవు." : "• Promo tools generate share-ready text/posters; they do not post to channels."}</li>
              <li>{te ? "• Website ad-slot placement ఉన్న packages లో మాత్రమే; impressions లేదా ranking హామీ కాదు." : "• Website ad-slot placement applies only to eligible packages; impressions or rank are not guaranteed."}</li>
              <li>{te ? "• Enquiry form వివరాలు vendor dashboard లో నమోదు అవుతాయి." : "• Enquiry form submissions are recorded in the vendor dashboard."}</li>
              <li>{te ? "• WhatsApp contact vendor స్వయంగా number అందిస్తేనే చూపబడుతుంది; notification setup/delivery మీద ఆధారపడి ఉంటుంది." : "• A WhatsApp button appears only when the vendor provides that number; notifications depend on setup and delivery."}</li>
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
          {te ? <>⚠️ Listing/payment review business identity, service quality లేదా safety ని ధృవీకరించదు. లావాదేవీకి ముందు వివరాలు, రాతపూర్వక terms స్వయంగా తనిఖీ చేయండి. సమస్య ఉంటే: <Link href="/safety" className="underline">/safety</Link></> : <>⚠️ Listing/payment review does not verify business identity, service quality, or safety. Check details and written terms before a transaction. Report concerns at <Link href="/safety" className="underline">/safety</Link>.</>}
        </div>
      </div>
    </div>
  );
}
