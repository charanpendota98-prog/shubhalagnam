"use client";
/**
 * 🔍 HERO QUICK SEARCH BAR — Top Matrimony Signature Component
 * ============================================================
 * Instant 5-second match finder directly from the hero section:
 * Gender + Caste + Age Range + Location → 1-Click Search with params.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "@/lib/lang";
import { CASTES, TS_DISTRICTS, AP_DISTRICTS } from "@/lib/telugu-data";

const POPULAR_CASTES = [
  "All Castes",
  "Reddy",
  "Kamma",
  "Kapu",
  "Arya Vysya",
  "Brahmin",
  "Yadava",
  "Velama",
  "Munnuru Kapu",
  "Padmashali",
  "Goud",
  "Mudiraj",
  "Viswabrahmin",
  "Mala",
  "Madiga",
  "Banjara / Lambada",
  "Raju / Kshatriya",
  "OBC (Other BC)",
  "SC (Scheduled Caste)",
  "ST (Scheduled Tribe)",
];

const POPULAR_DISTRICTS = [
  "All Districts",
  "Hyderabad",
  "Rangareddy",
  "Medchal-Malkajgiri",
  "Warangal",
  "Karimnagar",
  "Nizamabad",
  "Nalgonda",
  "Khammam",
  "Vijayawada (NTR)",
  "Visakhapatnam",
  "Guntur",
  "Tirupati",
  "Kakinada",
  "Nellore",
  "Kurnool",
  "Kadapa",
  "Anantapur",
  "NRI (USA/UK/Gulf)",
];

const AGE_RANGES = [
  { label: "21 - 25 Yrs", min: 21, max: 25 },
  { label: "24 - 28 Yrs", min: 24, max: 28 },
  { label: "27 - 32 Yrs", min: 27, max: 32 },
  { label: "30 - 36 Yrs", min: 30, max: 36 },
  { label: "35 - 45 Yrs", min: 35, max: 45 },
  { label: "All Ages (18-60)", min: 18, max: 60 },
];

export default function HeroQuickSearch() {
  const router = useRouter();
  const { lang } = useLang();
  const te = lang === "te";

  const [gender, setGender] = useState<"Bride" | "Groom">("Bride");
  const [caste, setCaste] = useState<string>("All Castes");
  const [ageIdx, setAgeIdx] = useState<number>(1);
  const [district, setDistrict] = useState<string>("All Districts");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (gender) params.set("gender", gender);
    if (caste && caste !== "All Castes") params.set("caste", caste);
    if (district && district !== "All Districts") {
      if (district.includes("NRI")) {
        params.set("nri_only", "true");
      } else {
        params.set("district", district.split(" ")[0]);
      }
    }
    const age = AGE_RANGES[ageIdx];
    if (age) {
      params.set("age_min", String(age.min));
      params.set("age_max", String(age.max));
    }
    router.push(`/matches?${params.toString()}`);
  };

  return (
    <div className="w-full max-w-4xl mx-auto mt-6 bg-white/95 backdrop-blur-md rounded-3xl p-4 sm:p-5 border-2 border-gold/60 shadow-2xl">
      <form onSubmit={handleSearch} className="space-y-3.5">
        
        {/* Top Toggle: Looking for Bride or Groom */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gold/20 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase text-maroon tracking-wide">
              {te ? "నేను వెతుకుతున్నది:" : "Looking for:"}
            </span>
            <div className="inline-flex p-1 bg-amber-50 rounded-2xl border border-gold/40">
              <button
                type="button"
                onClick={() => setGender("Bride")}
                className={`px-4 py-1.5 rounded-xl text-xs font-black transition ${
                  gender === "Bride"
                    ? "maroon-gradient text-white shadow-xs"
                    : "text-gray-700 hover:text-maroon"
                }`}
              >
                👰 {te ? "పెళ్లికూతురు (Bride)" : "Bride"}
              </button>
              <button
                type="button"
                onClick={() => setGender("Groom")}
                className={`px-4 py-1.5 rounded-xl text-xs font-black transition ${
                  gender === "Groom"
                    ? "maroon-gradient text-white shadow-xs"
                    : "text-gray-700 hover:text-maroon"
                }`}
              >
                🤵 {te ? "పెళ్లికొడుకు (Groom)" : "Groom"}
              </button>
            </div>
          </div>

          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
            ⚡ {te ? "మొదటి 3 సంబంధాలు FREE" : "First 3 Profiles FREE"}
          </span>
        </div>

        {/* 4 Form Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
          
          {/* Caste Dropdown */}
          <div>
            <label className="block text-[11px] font-bold text-gray-700 mb-1">
              🪔 {te ? "కులం (Caste):" : "Caste:"}
            </label>
            <select
              value={caste}
              onChange={(e) => setCaste(e.target.value)}
              className="w-full px-3 py-2.5 bg-amber-50/60 border border-gold/40 rounded-xl text-xs font-bold text-navy focus:outline-none focus:ring-2 focus:ring-maroon"
            >
              {POPULAR_CASTES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Age Dropdown */}
          <div>
            <label className="block text-[11px] font-bold text-gray-700 mb-1">
              🎂 {te ? "వయస్సు (Age):" : "Age Range:"}
            </label>
            <select
              value={ageIdx}
              onChange={(e) => setAgeIdx(parseInt(e.target.value, 10))}
              className="w-full px-3 py-2.5 bg-amber-50/60 border border-gold/40 rounded-xl text-xs font-bold text-navy focus:outline-none focus:ring-2 focus:ring-maroon"
            >
              {AGE_RANGES.map((a, i) => (
                <option key={a.label} value={i}>{a.label}</option>
              ))}
            </select>
          </div>

          {/* District Dropdown */}
          <div>
            <label className="block text-[11px] font-bold text-gray-700 mb-1">
              📍 {te ? "ప్రాంతం (District):" : "District / City:"}
            </label>
            <select
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className="w-full px-3 py-2.5 bg-amber-50/60 border border-gold/40 rounded-xl text-xs font-bold text-navy focus:outline-none focus:ring-2 focus:ring-maroon"
            >
              {POPULAR_DISTRICTS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Search CTA Button */}
          <div>
            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-xl gold-gradient text-maroon font-black text-xs shadow-md hover:shadow-lg transition flex items-center justify-center gap-1.5 uppercase tracking-wide cursor-pointer"
            >
              <span>🔍</span>
              <span>{te ? "సంబంధాలు చూడండి" : "Find Matches"}</span>
            </button>
          </div>

        </div>

      </form>
    </div>
  );
}
