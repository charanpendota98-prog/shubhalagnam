"use client";
/**
 * 🏪 HOME VENDORS SHOWCASE — పెళ్లి సేవలు & వెండర్లు
 * ===================================================
 * Replaces any empty gaps with a vibrant, trusted, high-converting
 * Telugu wedding services showcase with verified vendor cards,
 * instant WhatsApp contact buttons, and category chips.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/lang";
import { WhatsAppIcon } from "@/components/BrandIcons";

type Vendor = {
  id: string;
  business_name: string;
  category: string;
  category_te: string;
  icon: string;
  city: string;
  district: string;
  service_areas: string;
  price_range: string;
  about: string;
  experience_years: string;
  verified: boolean;
  package: string;
  whatsapp_link: string;
  call_link: string;
};

const CATEGORY_CHIPS = [
  { key: "all", label_te: "అన్నీ (All)", label_en: "All", icon: "✨" },
  { key: "photography", label_te: "ఫోటోగ్రఫీ", label_en: "Photography", icon: "📸" },
  { key: "catering", label_te: "విందు భోజనం", label_en: "Catering", icon: "🍛" },
  { key: "decorations", label_te: "అలంకరణలు", label_en: "Decorations", icon: "🌸" },
  { key: "makeup", label_te: "మేకప్ & బ్యూటీ", label_en: "Makeup", icon: "💄" },
  { key: "banquet_hall", label_te: "కళ్యాణ మండపం", label_en: "Function Hall", icon: "🏛️" },
  { key: "pandit", label_te: "పండితులు", label_en: "Pandits", icon: "🕉️" },
  { key: "wedding_planner", label_te: "ప్లానర్స్", label_en: "Planners", icon: "📋" },
];

export default function HomeVendorsShowcase() {
  const { lang } = useLang();
  const te = lang === "te";
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [activeCat, setActiveCat] = useState<string>("all");
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetch("/api/vendors?limit=12")
      .then((r) => r.json())
      .then((d) => {
        if (d?.success && Array.isArray(d.vendors)) {
          setVendors(d.vendors);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filteredVendors = activeCat === "all"
    ? vendors.slice(0, 6)
    : vendors.filter((v) => v.category === activeCat);

  return (
    <section className="max-w-7xl mx-auto px-4 py-6">
      <div className="rounded-3xl border border-gold/40 bg-gradient-to-b from-white via-[#FFFDF8] to-[#FFF9EE] p-5 sm:p-7 shadow-sm">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-gold/20 pb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-black uppercase bg-amber-100 text-maroon border border-amber-300">
              <span>🏪</span>
              <span>{te ? "విశ్వసనీయ పెళ్లి సేవలు" : "TRUSTED WEDDING SERVICES"}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-[#7A0C2E] mt-1.5">
              {te ? "మీ ఇంటి శుభకార్యానికి — వెరిఫైడ్ పెళ్లి వెండర్లు" : "Wedding Services & Verified Vendors"}
            </h2>
            <p className="text-xs text-gray-600 mt-0.5">
              {te
                ? "ఫోటోగ్రఫీ, క్యాటరింగ్, అలంకరణలు, మేకప్, కళ్యాణ మండపాలు & పండితులు — నేరుగా వాట్సాప్‌లో మాట్లాడండి."
                : "Photography, Catering, Mandapams, Makeup & Purohits — connect directly on WhatsApp."}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/vendors/campaign"
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-[#7A0C2E] text-xs font-black shadow-xs hover:shadow-md transition whitespace-nowrap"
            >
              📢 {te ? "మీ వ్యాపార ప్రకటన ఇవ్వండి (₹49)" : "Advertise Business (₹49)"}
            </Link>
            <Link
              href="/vendors"
              className="px-4 py-2 rounded-xl border border-maroon/30 hover:bg-maroon-soft text-maroon text-xs font-bold transition whitespace-nowrap"
            >
              {te ? "అన్ని సేవలు చూడండి →" : "View All →"}
            </Link>
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-2 overflow-x-auto py-3 scrollbar-hide">
          {CATEGORY_CHIPS.map((c) => (
            <button
              key={c.key}
              type="button"
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
          {filteredVendors.map((v) => (
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
                        {v.category_te || v.category} · 🏡 {v.city || v.district}
                      </p>
                    </div>
                  </div>

                  {v.verified && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-800 text-[10px] font-bold shrink-0">
                      ✓ Verified
                    </span>
                  )}
                </div>

                <p className="text-xs text-gray-600 mt-2.5 line-clamp-2 leading-relaxed">
                  {v.about}
                </p>

                <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px]">
                  <span className="font-bold text-maroon">
                    💰 {v.price_range || "బడ్జెట్ ధరలు"}
                  </span>
                  <span className="text-gray-500 font-semibold">
                    ⭐ {v.experience_years} సం॥ అనుభవం
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 mt-3 pt-2">
                <a
                  href={v.whatsapp_link || `https://wa.me/919848011101?text=నమస్తే! మన వివాహ లో మీ ${encodeURIComponent(v.business_name)} listing చూశాను`}
                  target="_blank"
                  rel="noreferrer"
                  className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition text-center"
                >
                  <WhatsAppIcon className="w-3.5 h-3.5 fill-current" />
                  <span>వాట్సాప్ విచారణ</span>
                </a>
                <Link
                  href={`/vendors/${v.id}`}
                  className="py-2 px-3 rounded-xl border border-gold/60 hover:bg-amber-50 text-maroon font-bold text-xs text-center transition"
                >
                  వివరాలు చూడండి
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Footer Banner Inside Card */}
        <div className="mt-4 p-3 bg-gradient-to-r from-amber-100/60 via-orange-50 to-amber-100/60 rounded-2xl border border-amber-200/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <p className="text-xs text-[#7A0C2E] font-bold">
            💡 {te ? "మీరు పెళ్లి సేవలు అందించే వ్యాపారస్తులా? రోజుకు కేవలం ₹49 తో వేల మంది కస్టమర్లను పొందండి!" : "Are you a wedding vendor? Reach thousands of families for just ₹49/day!"}
          </p>
          <Link
            href="/vendors/register"
            className="shrink-0 px-3.5 py-1.5 rounded-xl bg-[#7A0C2E] hover:bg-[#5C0822] text-white font-bold text-xs transition"
          >
            {te ? "ఉచితంగా Register అవ్వండి →" : "Register Free →"}
          </Link>
        </div>

      </div>
    </section>
  );
}
