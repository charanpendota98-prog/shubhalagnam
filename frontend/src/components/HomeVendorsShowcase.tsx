"use client";

import { apiDisplayMessage, readApiJson } from "@/lib/api";
/**
 * 🏪 HOME VENDORS SHOWCASE — పెళ్లి సేవలు & వెండర్లు
 * ===================================================
 * Shows only vendors returned by the directory API; never substitutes fabricated businesses.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/lang";
import { WhatsAppIcon } from "@/components/BrandIcons";
import { safeWhatsAppPhoneLink } from "@/lib/wa";
import { Button, EmptyState } from "@/components/ui";
import { CardSkeletonList } from "@/components/Skeletons";

type Vendor = {
  id: string;
  business_name: string;
  category: string;
  category_te: string;
  category_en?: string;
  icon: string;
  city: string;
  district: string;
  service_areas: string;
  price_range: string;
  about: string;
  experience_years: string;
  listing_details_reviewed: boolean;
  package: string;
  whatsapp_link: string;
  whatsapp_link_en?: string;
  whatsapp_link_te?: string;
  call_link: string;
};

const CATEGORY_LABELS_EN: Record<string, string> = {
  catering: "Catering", photography: "Photography", videography: "Videography",
  decorations: "Decorations & flowers", banquet_hall: "Function hall / banquet",
  tent_house: "Tent house", pandit: "Pandit / priest", jewellery: "Jewellery",
  bridal_wear: "Bridal & groom wear", makeup: "Makeup & beautician",
  mehendi: "Mehendi artist", music_dj: "DJ & band", invitations: "Invitations & printing",
  cars_travel: "Cars & travel", wedding_planner: "Wedding planner / event",
  bakery_cake: "Bakery & cake", gifts_hampers: "Gifts & hampers", honeymoon_travel: "Honeymoon packages",
};

function categoryLabel(vendor: Vendor, te: boolean): string {
  if (te) return vendor.category_te || CATEGORY_LABELS_EN[vendor.category] || vendor.category;
  const englishCategory = apiDisplayMessage({ message_en: vendor.category_en }, false, "");
  const fallback = CATEGORY_LABELS_EN[vendor.category]
    || String(vendor.category || "").replace(/_/g, " ").replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
  return englishCategory || apiDisplayMessage({ message_en: fallback }, false, "Wedding service");
}

const CATEGORY_CHIPS = [
  { key: "all", label_te: "అన్నీ (All)", label_en: "All", icon: "✨" },
  { key: "photography", label_te: "ఫోటోగ్రఫీ", label_en: "Photography", icon: "📸" },
  { key: "catering", label_te: "విందు భోజనం", label_en: "Catering", icon: "🍛" },
  { key: "decorations", label_te: "అలంకరణలు", label_en: "Decorations", icon: "🌸" },
  { key: "makeup", label_te: "మేకప్ & బ్యూటీ", label_en: "Makeup", icon: "💄" },
  { key: "banquet_hall", label_te: "కళ్యాణ మండపం", label_en: "Function Hall", icon: "🏛️" },
  { key: "wedding_planner", label_te: "ప్లానర్స్", label_en: "Planners", icon: "📋" },
];

export default function HomeVendorsShowcase() {
  const { lang } = useLang();
  const te = lang === "te";
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCat, setActiveCat] = useState<string>("all");

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        const response = await fetch("/api/vendors?limit=12", { signal: controller.signal, cache: "no-store" });
        if (!response.ok) return;
        const data = await readApiJson(response);
        if (!controller.signal.aborted && data?.success && Array.isArray(data.vendors)) setVendors(data.vendors);
      } catch {
        // API/offline: keep the empty state; never fabricate vendor cards.
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, []);

  const filteredVendors = (activeCat === "all"
    ? vendors
    : vendors.filter((v) => v.category === activeCat)).slice(0, 3);

  return (
    <section className="max-w-7xl mx-auto px-4 py-4">
      <div className="rounded-3xl border border-gold/40 bg-gradient-to-b from-white via-[#FFFDF8] to-[#FFF9EE] p-5 sm:p-7 shadow-sm">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-gold/20 pb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-black uppercase bg-amber-100 text-maroon border border-amber-300">
              <span>🏪</span>
              <span>{te ? "పెళ్లి సేవల డైరెక్టరీ" : "WEDDING SERVICES DIRECTORY"}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-[#7A0C2E] mt-1.5">
              {te ? "మీ శుభకార్యానికి పెళ్లి సేవలు" : "Wedding Services & Vendors"}
            </h2>
            <p className="text-xs text-gray-600 mt-0.5">
              {te
                ? "ఫోటోగ్రఫీ, క్యాటరింగ్, అలంకరణలు, మేకప్, కళ్యాణ మండపాలు & పండితులు — అందుబాటులో ఉన్న contact options‌ను చూడండి."
                : "Photography, catering, decorations, makeup and function halls — see the contact options each vendor has provided."}
            </p>
            <p className="mt-1.5 max-w-3xl text-[11px] leading-relaxed text-gray-600">
              {te
                ? "₹149 ప్యాకేజ్ ఒకరోజు private share-ready promo kit మాత్రమే; directory listing కాదు. మొదటి directory-listing ప్లాన్ Basic ₹499 నుంచి. External post లేదా reach హామీ లేదు."
                : "The ₹149 option is a one-day private share-ready promo kit, not a directory listing. The first directory-listing plan is Basic at ₹499. No external post or reach is guaranteed."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 md:justify-end">
            <Link
              href="/vendors/campaign"
              className="inline-flex min-h-10 items-center justify-center px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-[#7A0C2E] text-xs font-black shadow-xs hover:shadow-md transition whitespace-nowrap"
            >
              📢 {te ? "ప్రచార options చూడండి" : "Explore promotion options"}
            </Link>
            <Link
              href="/vendors"
              className="inline-flex min-h-10 items-center justify-center px-4 py-2 rounded-xl border border-maroon/30 hover:bg-maroon-soft text-maroon text-xs font-bold transition whitespace-nowrap"
            >
              {te ? "అన్ని సేవలు →" : "View All →"}
            </Link>
          </div>
        </div>

        {/* Category Filters */}
        <div role="group" aria-label={te ? "వెండర్ category filters" : "Vendor category filters"}
          tabIndex={0}
          className="flex items-center gap-2 overflow-x-auto py-3 scrollbar-hide focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7A0C2E] focus-visible:ring-offset-2">
          {CATEGORY_CHIPS.map((c) => (
            <button
              key={c.key}
              type="button"
              aria-pressed={activeCat === c.key}
              onClick={() => setActiveCat(c.key)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
                activeCat === c.key
                  ? "maroon-gradient text-white shadow-soft"
                  : "bg-white text-gray-700 hover:bg-amber-50 border border-gold/30"
              }`}
            >
              <span>{c.icon}</span>
              <span>{te ? c.label_te : c.label_en}</span>
            </button>
          ))}
        </div>

        {/* Vendors Grid */}
        {loading ? <CardSkeletonList n={3} />
          : filteredVendors.length === 0 ? (
            <EmptyState
              icon="🏪"
              title={te ? "ప్రస్తుతం listing ఏదీ లేదు" : "No vendor listings right now"}
              description={te ? "డైరెక్టరీని చూడండి లేదా మీ business జోడించండి." : "View the full directory, or add your own business."}
              action={
                <Button href="/vendors" variant="outline">
                  {te ? "అన్ని సేవలు చూడండి" : "View all services"}
                </Button>
              }
            />
          )
          : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
          {filteredVendors.map((v) => {
            const englishValue = (value: unknown) => apiDisplayMessage({ message_en: value }, false, "");
            const location = te ? (v.city || v.district) : englishValue(v.city || v.district);
            const about = te ? v.about : englishValue(v.about);
            const priceRange = te ? v.price_range : englishValue(v.price_range);
            const experience = te ? v.experience_years : englishValue(v.experience_years);
            return (
            <div
              key={v.id}
              className="rounded-2xl border border-gold/30 bg-white p-4 shadow-xs hover:shadow-md transition flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="w-10 h-10 rounded-xl bg-amber-50 border border-gold/40 flex items-center justify-center text-xl shrink-0">
                      {v.icon || "🏪"}
                    </span>
                    <div>
                      <h3 className="font-extrabold text-sm text-[#0F1F3C] group-hover:text-maroon transition line-clamp-1">
                        {v.business_name}
                      </h3>
                      <p className="text-[11px] text-gray-500 font-semibold">
                        {categoryLabel(v, te)}{location ? ` · 🏡 ${location}` : ""}
                      </p>
                    </div>
                  </div>

                  {v.listing_details_reviewed && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-800 text-[10px] font-bold shrink-0" title={te ? "సమర్పించిన listing వివరాలపై staff review మాత్రమే; గుర్తింపు, లైసెన్స్ లేదా సేవా నాణ్యతకు హామీ కాదు." : "Staff reviewed the submitted listing details only; this does not certify identity, licensing, or service quality."}>
                      {te ? "Listing వివరాలు సమీక్షించారు" : "Listing details reviewed"}
                    </span>
                  )}
                </div>

                {about && <p className="text-xs text-gray-600 mt-2.5 line-clamp-2 leading-relaxed">{about}</p>}

                {(priceRange || experience) && (
                  <div className="mt-2.5 pt-2 border-t border-gray-100 flex flex-wrap items-center justify-between gap-1 text-[11px]">
                    {priceRange && <span className="break-words font-bold text-maroon">💰 {priceRange}</span>}
                    {experience && <span className="break-words text-gray-500 font-semibold">{te ? "వెండర్ తెలిపిన అనుభవం" : "Vendor-reported experience"}: {experience}</span>}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 mt-3 pt-2">
                {safeWhatsAppPhoneLink(String(te ? (v.whatsapp_link_te || v.whatsapp_link || "") : (v.whatsapp_link_en || ""))) ? (
                  <a href={safeWhatsAppPhoneLink(String(te ? (v.whatsapp_link_te || v.whatsapp_link || "") : (v.whatsapp_link_en || ""))) || ""} target="_blank" rel="noopener noreferrer"
                    aria-label={te ? `${v.business_name} కు WhatsApp enquiry పంపండి` : `Send a WhatsApp enquiry to ${v.business_name}`}
                    className="min-h-10 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition text-center">
                    <WhatsAppIcon className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
                    <span>{te ? "వాట్సాప్ విచారణ" : "WhatsApp enquiry"}</span>
                  </a>
                ) : <span className="min-h-10 py-2 px-3 rounded-xl bg-gray-100 text-gray-500 text-xs text-center flex items-center justify-center">{te ? "సంప్రదింపు అందుబాటులో లేదు" : "Contact unavailable"}</span>}
                <Link
                  href={`/vendors/${v.id}`}
                  className="min-h-10 py-2 px-3 rounded-xl border border-gold/60 hover:bg-amber-50 text-maroon font-bold text-xs text-center transition flex items-center justify-center"
                >
                  {te ? "వివరాలు చూడండి" : "View details"}
                </Link>
              </div>
            </div>
            );
          })}
        </div>}

        <p className="mt-3 text-center text-[11px] leading-relaxed text-gray-500">
          {te ? "వెండర్లు సమర్పించిన listings. వివరాల సమీక్ష గుర్తింపు, లైసెన్స్ లేదా సేవా నాణ్యతకు హామీ కాదు; బుకింగ్‌కు ముందు స్వయంగా నిర్ధారించండి." : "Vendor-submitted listings. A details review does not certify identity, licensing, or service quality; confirm independently before booking."}
        </p>

        {/* Footer Banner Inside Card */}
        <div className="mt-4 p-3 bg-gradient-to-r from-amber-100/60 via-orange-50 to-amber-100/60 rounded-2xl border border-amber-200/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <p className="text-xs text-[#7A0C2E] font-bold">
            💡 {te ? "మీరు పెళ్లి సేవలు అందించే వ్యాపారస్తులా? Vendor packages, ధరలు మరియు eligibility చూడండి." : "Are you a wedding vendor? Review the available packages, pricing and eligibility."}
          </p>
          <Link
            href="/vendors/register"
            className="shrink-0 px-3.5 py-1.5 rounded-xl bg-[#7A0C2E] hover:bg-[#5C0822] text-white font-bold text-xs transition"
          >
            {te ? "Vendor packages చూడండి →" : "View vendor packages →"}
          </Link>
        </div>

      </div>
    </section>
  );
}
