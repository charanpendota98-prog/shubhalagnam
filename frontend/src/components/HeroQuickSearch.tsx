"use client";
/**
 * 🔍 ULTRA-ADVANCED SEARCH WITH STATE FILTER, ALL 59+ DISTRICTS & SEARCHABLE CASTE SELECTOR
 * =========================================================================================
 * Full 33 TS Districts + 26 AP Districts + NRI
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
} from "@/lib/telugu-data";

const QUICK_CHIPS = [
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
  { label: "SC / ST", te: "SC / ST" },
  { label: "NRI", te: "NRI సంబంధాలు" },
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
  const [stateFilter, setStateFilter] = useState<"ALL" | "TS" | "AP" | "NRI">("ALL");
  const [caste, setCaste] = useState<string>("All Castes");
  const [district, setDistrict] = useState<string>("All Districts");
  const [ageIdx, setAgeIdx] = useState<number>(1);
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");

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
    const list = ["All Castes", ...CASTES];
    if (!q) return list;
    return list.filter((c) => {
      const teName = CASTE_TELUGU[c] || "";
      return c.toLowerCase().includes(q) || teName.toLowerCase().includes(q);
    });
  }, [casteQuery]);

  // Dynamic Districts List based on State Filter (33 TS + 26 AP + NRI)
  const availableDistricts = useMemo(() => {
    let list: { en: string; te: string; state: string }[] = [];

    if (stateFilter === "ALL" || stateFilter === "TS") {
      list = [...list, ...TS_DISTRICTS_DETAILED.map((d) => ({ en: d.en, te: d.te, state: "తెలంగాణ (TS)" }))];
    }
    if (stateFilter === "ALL" || stateFilter === "AP") {
      list = [...list, ...AP_DISTRICTS_DETAILED.map((d) => ({ en: d.en, te: d.te, state: "ఆంధ్రప్రదేశ్ (AP)" }))];
    }
    if (stateFilter === "ALL" || stateFilter === "NRI") {
      list = [...list, ...NRI_COUNTRIES.map((c) => ({ en: c.en, te: c.te, state: "NRI / గ్లోబల్" }))];
    }
    return list;
  }, [stateFilter]);

  const filteredDistricts = useMemo(() => {
    const q = districtQuery.trim().toLowerCase();
    if (!q) return availableDistricts;
    return availableDistricts.filter(
      (d) => d.en.toLowerCase().includes(q) || d.te.toLowerCase().includes(q) || d.state.toLowerCase().includes(q)
    );
  }, [availableDistricts, districtQuery]);

  const handleVoiceSearch = () => {
    if (typeof window === "undefined") return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert(te ? "మీ బ్రౌజర్‌లో వాయిస్ సెర్చ్ సపోర్ట్ లేదు." : "Voice search is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = te ? "te-IN" : "en-IN";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
      setVoiceTranscript(te ? "వింటున్నాను... మాట్లాడండి..." : "Listening... speak now...");
    };

    recognition.onresult = (event: any) => {
      const speech = event.results[0][0].transcript;
      setVoiceTranscript(`"${speech}"`);
      setIsListening(false);

      const lower = speech.toLowerCase();
      // Auto-detect caste
      for (const c of CASTES) {
        if (lower.includes(c.toLowerCase())) {
          setCaste(c);
          break;
        }
      }
      if (lower.includes("రెడ్డి") || lower.includes("reddy")) setCaste("Reddy");
      if (lower.includes("కమ్మ") || lower.includes("kamma")) setCaste("Kamma");
      if (lower.includes("కాపు") || lower.includes("kapu")) setCaste("Kapu");
      if (lower.includes("వైశ్య") || lower.includes("vysya")) setCaste("Arya Vysya");
      if (lower.includes("బ్రాహ్మణ") || lower.includes("brahmin")) setCaste("Brahmin");
      if (lower.includes("యాదవ") || lower.includes("yadav")) setCaste("Yadava");
      if (lower.includes("పద్మశాలి") || lower.includes("padmashali")) setCaste("Padmashali");
      if (lower.includes("గౌడ్") || lower.includes("goud")) setCaste("Goud");
      if (lower.includes("ముదిరాజ్") || lower.includes("mudiraj")) setCaste("Mudiraj");

      // Auto-detect gender
      if (lower.includes("వరుడు") || lower.includes("అబ్బాయి") || lower.includes("groom") || lower.includes("male")) {
        setGender("Groom");
      } else if (lower.includes("వధువు") || lower.includes("అమ్మాయి") || lower.includes("bride") || lower.includes("female")) {
        setGender("Bride");
      }

      // Auto-detect district
      for (const d of availableDistricts) {
        if (lower.includes(d.en.toLowerCase()) || lower.includes(d.te.toLowerCase())) {
          setDistrict(d.en);
          break;
        }
      }
      if (lower.includes("హైదరాబాద్") || lower.includes("hyderabad")) setDistrict("Hyderabad");
      if (lower.includes("వరంగల్") || lower.includes("warangal")) setDistrict("Warangal");
      if (lower.includes("వైజాగ్") || lower.includes("విశాఖ") || lower.includes("visakhapatnam")) setDistrict("Visakhapatnam");
      if (lower.includes("విజయవాడ") || lower.includes("vijayawada")) setDistrict("NTR");
      if (lower.includes("గుంటూరు") || lower.includes("guntur")) setDistrict("Guntur");
    };

    recognition.onerror = () => {
      setIsListening(false);
      setVoiceTranscript("");
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (gender) params.set("gender", gender);
    if (caste && caste !== "All Castes") params.set("caste", caste);
    if (stateFilter !== "ALL") params.set("state", stateFilter);
    if (district && district !== "All Districts") {
      if (district.includes("USA") || district.includes("UK") || district.includes("NRI")) {
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

  const selectQuickChip = (casteName: string) => {
    if (casteName === "NRI") {
      setStateFilter("NRI");
      setDistrict("All Districts");
      setCaste("All Castes");
    } else if (casteName === "SC / ST") {
      setCaste("Mala");
    } else {
      setCaste(casteName);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto bg-white/95 backdrop-blur-2xl rounded-[2rem] p-5 sm:p-7 border-2 border-gold/70 shadow-[0_20px_70px_rgba(122,12,46,0.18)]">
      <form onSubmit={handleSearch} className="space-y-4">
        
        {/* Top Control Bar: Looking for Gender + State Switcher + Voice Search */}
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
                👰 {te ? "వధువు (Bride)" : "Bride"}
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
                🤵 {te ? "వరుడు (Groom)" : "Groom"}
              </button>
            </div>
          </div>

          {/* State Filter Buttons */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl border border-gray-300">
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
              {te ? "తెలంగాణ (33)" : "TS (33 Dist)"}
            </button>
            <button
              type="button"
              onClick={() => { setStateFilter("AP"); setDistrict("All Districts"); }}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-black transition cursor-pointer ${
                stateFilter === "AP" ? "bg-[#7A0C2E] text-white shadow-xs" : "text-gray-600 hover:text-black"
              }`}
            >
              {te ? "ఆంధ్రప్రదేశ్ (26)" : "AP (26 Dist)"}
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

          {/* Voice Search Button */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleVoiceSearch}
              className={`flex items-center gap-1.5 text-xs font-black px-3.5 py-2 rounded-xl border transition-all cursor-pointer ${
                isListening
                  ? "bg-rose-600 text-white border-rose-700 animate-pulse shadow-lg"
                  : "bg-amber-50 text-maroon border-gold/60 hover:bg-gold/20 shadow-xs"
              }`}
              title={te ? "వాయిస్ సెర్చ్ — మాట్లాడి వెతకండి" : "Voice Search (Speak in Telugu/English)"}
            >
              <span className="text-sm">🎙️</span>
              <span className="telugu">{isListening ? (te ? "వింటున్నాను..." : "Listening...") : (te ? "వాయిస్ సెర్చ్" : "Voice Search")}</span>
            </button>

            <span className="hidden sm:inline-block text-[11px] font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-300 px-3 py-1.5 rounded-full shadow-xs">
              ⚡ {te ? "మొదటి 3 నంబర్లు FREE" : "First 3 FREE"}
            </span>
          </div>
        </div>

        {voiceTranscript && (
          <div className="text-xs bg-amber-50 border border-gold/40 px-3.5 py-2 rounded-xl text-maroon font-bold animate-fade flex items-center justify-between">
            <span>🗣️ {voiceTranscript}</span>
            <button type="button" onClick={() => setVoiceTranscript("")} className="text-gray-400 hover:text-gray-600 text-xs font-bold">✕</button>
          </div>
        )}

        {/* 4 Form Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 items-end">
          
          {/* 1. Searchable Caste Dropdown */}
          <div className="relative" ref={casteRef}>
            <label className="block text-[11px] font-extrabold text-gray-800 mb-1.5 telugu">
              🪔 {te ? "కులం (Caste — సెర్చ్ చేయండి):" : "Caste (Searchable):"}
            </label>
            
            <button
              type="button"
              onClick={() => setCasteSearchOpen(!casteSearchOpen)}
              className="w-full px-3.5 py-3 bg-amber-50/60 border border-gold/50 rounded-xl text-xs font-bold text-navy text-left flex items-center justify-between focus:ring-2 focus:ring-maroon cursor-pointer shadow-xs"
            >
              <span className="truncate">
                {caste === "All Castes"
                  ? (te ? "అన్ని కులాలు (All Castes)" : "All Castes")
                  : `${CASTE_TELUGU[caste] ? `${CASTE_TELUGU[caste]} · ` : ""}${caste}`}
              </span>
              <span className="text-gray-400 text-xs">▼</span>
            </button>

            {/* Dropdown Popover */}
            {casteSearchOpen && (
              <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white rounded-2xl border-2 border-gold shadow-2xl p-2 max-h-64 flex flex-col animate-fade">
                <input
                  type="text"
                  placeholder={te ? "🔍 కులాన్ని వెతకండి (ఉదా: రెడ్డి, కమ్మ, కాపు...)" : "🔍 Type to search caste..."}
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
                      <span>{c === "All Castes" ? (te ? "అన్ని కులాలు (All Castes)" : "All Castes") : c}</span>
                      {c !== "All Castes" && CASTE_TELUGU[c] && (
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
              🎂 {te ? "వయస్సు (Age Range):" : "Age Range:"}
            </label>
            <select
              value={ageIdx}
              onChange={(e) => setAgeIdx(parseInt(e.target.value, 10))}
              className="w-full px-3.5 py-3 bg-amber-50/60 border border-gold/50 rounded-xl text-xs font-bold text-navy focus:outline-none focus:ring-2 focus:ring-maroon cursor-pointer shadow-xs"
            >
              {AGE_RANGES.map((a, i) => (
                <option key={a.label} value={i}>{a.label}</option>
              ))}
            </select>
          </div>

          {/* 3. Searchable District Dropdown (All 33 TS + 26 AP + NRI) */}
          <div className="relative" ref={districtRef}>
            <label className="block text-[11px] font-extrabold text-gray-800 mb-1.5 telugu">
              📍 {te ? "జిల్లా / నగరం (59 జిల్లాలు):" : "District / City (All 59 Dist):"}
            </label>
            
            <button
              type="button"
              onClick={() => setDistrictSearchOpen(!districtSearchOpen)}
              className="w-full px-3.5 py-3 bg-amber-50/60 border border-gold/50 rounded-xl text-xs font-bold text-navy text-left flex items-center justify-between focus:ring-2 focus:ring-maroon cursor-pointer shadow-xs"
            >
              <span className="truncate">
                {district === "All Districts"
                  ? (te ? "అన్ని జిల్లాలు (All Districts)" : "All Districts")
                  : `${DISTRICT_TELUGU[district] ? `${DISTRICT_TELUGU[district]} · ` : ""}${district}`}
              </span>
              <span className="text-gray-400 text-xs">▼</span>
            </button>

            {/* Dropdown Popover */}
            {districtSearchOpen && (
              <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white rounded-2xl border-2 border-gold shadow-2xl p-2 max-h-64 flex flex-col animate-fade">
                <input
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
                        <span>{d.te}</span> <span className="text-gray-400 text-[10px]">({d.en})</span>
                      </div>
                      <span className={`text-[10px] ${district === d.en ? "text-amber-200" : "text-gray-400"}`}>
                        {d.state}
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
          {QUICK_CHIPS.map((qc) => (
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
