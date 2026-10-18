"use client";
/**
 * 🔍 SEARCH WITH STATE FILTER, SEARCHABLE COMMUNITY CHOICES & DISTRICTS
 * ======================================================================
 * Telangana and Andhra Pradesh district options plus common NRI locations
 * Searchable Caste & District dropdowns with live filtering
 * 100% Mobile & Desktop friendly
 */
import { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "@/lib/lang";
import {
  CASTES,
  CASTE_TELUGU,
  TS_DISTRICTS_DETAILED,
  AP_DISTRICTS_DETAILED,
  NRI_COUNTRIES,
  DISTRICT_TELUGU,
  sortUniqueOptions,
} from "@/lib/telugu-data";

type DistrictRegion = "TS" | "AP" | "NRI";
type DistrictOption = { en: string; te: string; state: DistrictRegion };

function districtRegionLabel(region: DistrictRegion, te: boolean) {
  if (region === "TS") return te ? "తెలంగాణ (TS)" : "Telangana";
  if (region === "AP") return te ? "ఆంధ్రప్రదేశ్ (AP)" : "Andhra Pradesh";
  return te ? "NRI / గ్లోబల్" : "NRI / International";
}

const QUICK_CHIPS = [
  { label: "Housewife", te: "🏡 గృహిణి" },
  { label: "Software", te: "💻 సాఫ్ట్‌వేర్" },
  { label: "Govt", te: "🏛️ గవర్నమెంట్ జాబ్" },
  { label: "Second Marriage", te: "💍 పునర్వివాహం" },
  { label: "Reddy", te: "రెడ్డి" },
  { label: "Kamma", te: "కమ్మ" },
  { label: "Kapu", te: "కాపు" },
  { label: "Arya Vysya", te: "ఆర్య వైశ్య" },
  { label: "Brahmin", te: "బ్రాహ్మణ" },
  { label: "Yadava", te: "యాదవ" },
  { label: "Munnuru Kapu", te: "మున్నూరు కాపు" },
  { label: "Padmashali", te: "పద్మశాలి" },
  { label: "Goud", te: "గౌడ్" },
  { label: "Mudiraj", te: "ముదిరాజ్" },
  { label: "NRI", te: "NRI సంబంధాలు" },
];

const AGE_RANGES = [
  { label: "21–25 years", te: "21–25 సంవత్సరాలు", min: 21, max: 25 },
  { label: "24–28 years", te: "24–28 సంవత్సరాలు", min: 24, max: 28 },
  { label: "27–32 years", te: "27–32 సంవత్సరాలు", min: 27, max: 32 },
  { label: "30–36 years", te: "30–36 సంవత్సరాలు", min: 30, max: 36 },
  { label: "35–45 years", te: "35–45 సంవత్సరాలు", min: 35, max: 45 },
  { label: "All ages (18–60)", te: "అన్ని వయస్సులు (18–60)", min: 18, max: 60 },
];

export default function HeroQuickSearch() {
  const router = useRouter();
  const { lang } = useLang();
  const te = lang === "te";

  const [gender, setGender] = useState<"Bride" | "Groom">("Bride");
  const [stateFilter, setStateFilter] = useState<"ALL" | "TS" | "AP" | "NRI">("ALL");
  const [caste, setCaste] = useState<string>("All Castes");
  const [district, setDistrict] = useState<string>("All Districts");
  // Start broad; users can narrow this without silently losing valid matches.
  const [ageIdx, setAgeIdx] = useState<number>(5);

  // Search dropdown states
  const [casteSearchOpen, setCasteSearchOpen] = useState(false);
  const [casteQuery, setCasteQuery] = useState("");
  const [districtSearchOpen, setDistrictSearchOpen] = useState(false);
  const [districtQuery, setDistrictQuery] = useState("");

  const casteRef = useRef<HTMLDivElement>(null);
  const districtRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (casteRef.current && !casteRef.current.contains(e.target as Node)) {
        setCasteSearchOpen(false);
      }
      if (districtRef.current && !districtRef.current.contains(e.target as Node)) {
        setDistrictSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Filtered Caste List
  const filteredCastes = useMemo(() => {
    const q = casteQuery.trim().toLowerCase();
    const list = ["All Castes", ...sortUniqueOptions(CASTES)];
    if (!q) return list;
    return list.filter((c) => {
      const teName = CASTE_TELUGU[c] || "";
      return c.toLowerCase().includes(q) || teName.toLowerCase().includes(q);
    });
  }, [casteQuery]);

  // Dynamic district and NRI location list based on the selected region
  const availableDistricts = useMemo(() => {
    let list: DistrictOption[] = [];

    if (stateFilter === "ALL" || stateFilter === "TS") {
      list = [...list, ...TS_DISTRICTS_DETAILED.map((d) => ({ en: d.en, te: d.te, state: "TS" as const }))];
    }
    if (stateFilter === "ALL" || stateFilter === "AP") {
      list = [...list, ...AP_DISTRICTS_DETAILED.map((d) => ({ en: d.en, te: d.te, state: "AP" as const }))];
    }
    if (stateFilter === "ALL" || stateFilter === "NRI") {
      list = [...list, ...NRI_COUNTRIES.map((c) => ({ en: c.en, te: c.te, state: "NRI" as const }))];
    }
    return list.sort((a, b) => a.en.localeCompare(b.en, "en", { sensitivity: "base" }));
  }, [stateFilter]);

  const filteredDistricts = useMemo(() => {
    const q = districtQuery.trim().toLowerCase();
    if (!q) return availableDistricts;
    return availableDistricts.filter((d) => {
      const region = districtRegionLabel(d.state, te).toLowerCase();
      return d.en.toLowerCase().includes(q) || (te && d.te.toLowerCase().includes(q)) || region.includes(q);
    });
  }, [availableDistricts, districtQuery, te]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (gender) params.set("gender", gender);
    if (caste && caste !== "All Castes") params.set("caste", caste);
    if (stateFilter !== "ALL") params.set("state", stateFilter);
    if (stateFilter === "NRI") params.set("nri_only", "true");
    if (district && district !== "All Districts") {
      if (stateFilter === "NRI") params.set("country", district);
      else params.set("district", district);
    }
    const age = AGE_RANGES[ageIdx];
    if (age) {
      params.set("age_min", String(age.min));
      params.set("age_max", String(age.max));
    }
    router.push(`/matches?${params.toString()}`);
  };

  const selectQuickChip = (chipLabel: string) => {
    if (chipLabel === "Housewife") {
      // 🏡 The chip is only rendered for Bride searches, so it never has to
      // silently flip the gender the visitor picked.
      setGender("Bride");
      router.push("/matches?gender=Bride&job=Housewife%20%2F%20Homemaker%20(%E0%B0%97%E0%B1%83%E0%B0%B9%E0%B0%BF%E0%B0%A3%E0%B0%BF)");
    } else if (chipLabel === "Software") {
      router.push("/matches?job=Software%20%2F%20IT%20%2F%20Tech");
    } else if (chipLabel === "Govt") {
      router.push("/matches?job=Govt%20%2F%20PSU");
    } else if (chipLabel === "Second Marriage") {
      router.push("/second-marriage");
    } else if (chipLabel === "NRI") {
      setStateFilter("NRI");
      setDistrict("All Districts");
      setCaste("All Castes");
    } else if (chipLabel === "SC / ST") {
      setCaste("Mala");
    } else {
      setCaste(chipLabel);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-gold/50 shadow-[0_18px_55px_rgba(78,12,35,0.14)]">
      <form onSubmit={handleSearch} className="space-y-4">
        
        {/* Top Control Bar: Looking for Gender + State Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gold/30 pb-4">
          
          {/* Gender Selector */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <span className="text-xs font-black uppercase text-[#7A0C2E] tracking-wider telugu">
              {te ? "సంబంధం:" : "Looking for:"}
            </span>
            <div className="inline-flex p-1 bg-amber-50/80 rounded-2xl border border-gold/50 shadow-inner">
              <button
                type="button"
                onClick={() => setGender("Bride")}
                className={`px-4 py-1.5 sm:py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                  gender === "Bride"
                    ? "maroon-gradient text-white shadow-md"
                    : "text-gray-700 hover:text-maroon"
                }`}
              >
                👰 {te ? "వధువు" : "Bride"}
              </button>
              <button
                type="button"
                onClick={() => setGender("Groom")}
                className={`px-4 py-1.5 sm:py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                  gender === "Groom"
                    ? "maroon-gradient text-white shadow-md"
                    : "text-gray-700 hover:text-maroon"
                }`}
              >
                🤵 {te ? "వరుడు" : "Groom"}
              </button>
            </div>
          </div>

          {/* State Filter Buttons */}
          <div className="flex max-w-full items-center gap-1 overflow-x-auto scrollbar-hide p-1 bg-slate-100 rounded-xl border border-gray-200" role="group" aria-label={te ? "ప్రాంతం" : "Region"}>
            <button
              type="button"
              onClick={() => { setStateFilter("ALL"); setDistrict("All Districts"); }}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-black transition cursor-pointer ${
                stateFilter === "ALL" ? "bg-white text-maroon shadow-xs" : "text-gray-600 hover:text-black"
              }`}
            >
              {te ? "అన్ని ప్రాంతాలు" : "All States"}
            </button>
            <button
              type="button"
              onClick={() => { setStateFilter("TS"); setDistrict("All Districts"); }}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-black transition cursor-pointer ${
                stateFilter === "TS" ? "bg-[#7A0C2E] text-white shadow-xs" : "text-gray-600 hover:text-black"
              }`}
            >
              {te ? `తెలంగాణ (${TS_DISTRICTS_DETAILED.length})` : `TS (${TS_DISTRICTS_DETAILED.length} Dist)`}
            </button>
            <button
              type="button"
              onClick={() => { setStateFilter("AP"); setDistrict("All Districts"); }}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-black transition cursor-pointer ${
                stateFilter === "AP" ? "bg-[#7A0C2E] text-white shadow-xs" : "text-gray-600 hover:text-black"
              }`}
            >
              {te ? `ఆంధ్రప్రదేశ్ (${AP_DISTRICTS_DETAILED.length})` : `AP (${AP_DISTRICTS_DETAILED.length} Dist)`}
            </button>
            <button
              type="button"
              onClick={() => { setStateFilter("NRI"); setDistrict("All Districts"); }}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-black transition cursor-pointer ${
                stateFilter === "NRI" ? "bg-amber-500 text-maroon shadow-xs" : "text-gray-600 hover:text-black"
              }`}
            >
              ✈️ NRI
            </button>
          </div>

          <span className="hidden sm:inline-flex items-center text-[11px] font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-300 px-3 py-2 rounded-xl">
            ✓ {te ? "మొదటి 3 ఇంట్రెస్ట్‌లు ఉచితం" : "First 3 interests free"}
          </span>
        </div>



        {/* 4 Form Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 items-end">
          
          {/* 1. Searchable Caste Dropdown */}
          <div className="relative" ref={casteRef}>
            <label className="block text-[11px] font-extrabold text-gray-800 mb-1.5 telugu">
              🪔 {te ? "కులం" : "Community"}
            </label>
            
            <button
              type="button"
              onClick={() => setCasteSearchOpen(!casteSearchOpen)}
              aria-expanded={casteSearchOpen}
              aria-haspopup="listbox"
              className="w-full px-3.5 py-3 bg-amber-50/60 border border-gold/50 rounded-xl text-xs font-bold text-navy text-left flex items-center justify-between focus:ring-2 focus:ring-maroon cursor-pointer shadow-xs"
            >
              <span className="truncate">
                {caste === "All Castes"
                  ? (te ? "అన్ని కులాలు" : "All communities")
                  : (te && CASTE_TELUGU[caste] ? `${CASTE_TELUGU[caste]} (${caste})` : caste)}
              </span>
              <span className="text-gray-400 text-xs">▼</span>
            </button>

            {/* Dropdown Popover */}
            {casteSearchOpen && (
              <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white rounded-2xl border-2 border-gold shadow-2xl p-2 max-h-64 flex flex-col animate-fade">
                <input aria-label={te ? "🔍 కులం లేదా ఉపకులం వెతకండి" : "🔍 Search communities or sub-communities"}
                  type="text"
                  placeholder={te ? "🔍 కులం లేదా ఉపకులం వెతకండి" : "🔍 Search communities or sub-communities"}
                  value={casteQuery}
                  onChange={(e) => setCasteQuery(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-maroon mb-2"
                  autoFocus
                />
                <div className="overflow-y-auto space-y-1 flex-1">
                  {filteredCastes.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        setCaste(c);
                        setCasteSearchOpen(false);
                        setCasteQuery("");
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                        caste === c ? "bg-[#7A0C2E] text-white" : "hover:bg-amber-50 text-navy"
                      }`}
                    >
                      <span>{c === "All Castes" ? (te ? "అన్ని కులాలు" : "All communities") : c}</span>
                      {te && c !== "All Castes" && CASTE_TELUGU[c] && (
                        <span className={`text-[11px] ${caste === c ? "text-amber-200" : "text-gray-500"}`}>
                          {CASTE_TELUGU[c]}
                        </span>
                      )}
                    </button>
                  ))}
                  {filteredCastes.length === 0 && (
                    <div className="p-3 text-center text-xs text-gray-500">
                      {te ? "ఫలితాలు లేవు — 'All Castes' ఎంచుకోండి" : "No matches found"}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 2. Age Range Selector */}
          <div>
            <label className="block text-[11px] font-extrabold text-gray-800 mb-1.5 telugu">
              🎂 {te ? "వయస్సు" : "Age range"}
            </label>
            <select aria-label={te ? "వయస్సు" : "Age"}
              value={ageIdx}
              onChange={(e) => setAgeIdx(parseInt(e.target.value, 10))}
              className="w-full px-3.5 py-3 bg-amber-50/60 border border-gold/50 rounded-xl text-xs font-bold text-navy focus:outline-none focus:ring-2 focus:ring-maroon cursor-pointer shadow-xs"
            >
              {AGE_RANGES.map((a, i) => (
                <option key={a.label} value={i}>{te ? a.te : a.label}</option>
              ))}
            </select>
          </div>

          {/* 3. Searchable district and NRI location dropdown */}
          <div className="relative" ref={districtRef}>
            <label className="block text-[11px] font-extrabold text-gray-800 mb-1.5 telugu">
              📍 {te ? "జిల్లా లేదా నగరం" : "District or city"}
            </label>
            
            <button
              type="button"
              onClick={() => setDistrictSearchOpen(!districtSearchOpen)}
              aria-expanded={districtSearchOpen}
              aria-haspopup="listbox"
              className="w-full px-3.5 py-3 bg-amber-50/60 border border-gold/50 rounded-xl text-xs font-bold text-navy text-left flex items-center justify-between focus:ring-2 focus:ring-maroon cursor-pointer shadow-xs"
            >
              <span className="truncate">
                {district === "All Districts"
                  ? (te ? "అన్ని జిల్లాలు" : "All districts")
                  : (te && DISTRICT_TELUGU[district] ? `${DISTRICT_TELUGU[district]} (${district})` : district)}
              </span>
              <span className="text-gray-400 text-xs">▼</span>
            </button>

            {/* Dropdown Popover */}
            {districtSearchOpen && (
              <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white rounded-2xl border-2 border-gold shadow-2xl p-2 max-h-64 flex flex-col animate-fade">
                <input aria-label={te ? "🔍 జిల్లా పేరు టైప్ చేయండి..." : "🔍 Search district / city..."}
                  type="text"
                  placeholder={te ? "🔍 జిల్లా పేరు టైప్ చేయండి..." : "🔍 Search district / city..."}
                  value={districtQuery}
                  onChange={(e) => setDistrictQuery(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-maroon mb-2"
                  autoFocus
                />
                <div className="overflow-y-auto space-y-1 flex-1">
                  <button
                    type="button"
                    onClick={() => {
                      setDistrict("All Districts");
                      setDistrictSearchOpen(false);
                      setDistrictQuery("");
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                      district === "All Districts" ? "bg-[#7A0C2E] text-white" : "hover:bg-amber-50 text-navy"
                    }`}
                  >
                    <span>{te ? "అన్ని జిల్లాలు (All Districts)" : "All Districts"}</span>
                  </button>

                  {filteredDistricts.map((d) => (
                    <button
                      key={d.en}
                      type="button"
                      onClick={() => {
                        setDistrict(d.en);
                        setDistrictSearchOpen(false);
                        setDistrictQuery("");
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                        district === d.en ? "bg-[#7A0C2E] text-white" : "hover:bg-amber-50 text-navy"
                      }`}
                    >
                      <div>
                        <span>{te ? d.te : d.en}</span>{te && <span className="text-gray-400 text-[10px]"> ({d.en})</span>}
                      </div>
                      <span className={`text-[10px] ${district === d.en ? "text-amber-200" : "text-gray-400"}`}>
                        {districtRegionLabel(d.state, te)}
                      </span>
                    </button>
                  ))}
                  {filteredDistricts.length === 0 && (
                    <div className="p-3 text-center text-xs text-gray-500">
                      {te ? "ఫలితాలు లేవు" : "No districts found"}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 4. Find Matches CTA Button */}
          <div>
            <button
              type="submit"
              className="w-full py-3 px-5 rounded-xl gold-gradient text-[#5c0821] font-black text-xs shadow-gold hover:brightness-110 active:scale-95 transition flex items-center justify-center gap-2 uppercase tracking-wide cursor-pointer"
            >
              <span className="text-sm">🔍</span>
              <span className="telugu">{te ? "సంబంధాలు చూడండి" : "Find Matches"}</span>
            </button>
          </div>

        </div>

        {/* Quick Filter Caste Chips */}
        <div className="pt-2 flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-bold text-gray-500 telugu">{te ? "త్వరిత ఎంపిక:" : "Quick Filter:"}</span>
          {QUICK_CHIPS
            .filter((qc) => !(gender === "Groom" && qc.label === "Housewife"))
            .map((qc) => (
            <button
              key={qc.label}
              type="button"
              onClick={() => selectQuickChip(qc.label)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition cursor-pointer ${
                caste === qc.label || (qc.label === "NRI" && stateFilter === "NRI")
                  ? "bg-maroon text-white border-maroon shadow-xs"
                  : "bg-white border-gold/40 text-maroon hover:bg-gold/10"
              }`}
            >
              {te ? qc.te : qc.label}
            </button>
          ))}
        </div>

      </form>
    </div>
  );
}
