"use client";
/**
 * 🔍 HERO QUICK SEARCH BAR WITH VOICE SEARCH — Top Matrimony Signature Component
 * ==============================================================================
 * Instant 5-second match finder directly from the hero section:
 * Gender + Caste + Age Range + Location + 🎙️ Voice Search in Telugu/English.
 */
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "@/lib/lang";

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
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");

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
      for (const c of POPULAR_CASTES) {
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

      // Auto-detect gender
      if (lower.includes("వరుడు") || lower.includes("అబ్బాయి") || lower.includes("groom") || lower.includes("male")) {
        setGender("Groom");
      } else if (lower.includes("వధువు") || lower.includes("అమ్మాయి") || lower.includes("bride") || lower.includes("female")) {
        setGender("Bride");
      }

      // Auto-detect district
      for (const d of POPULAR_DISTRICTS) {
        if (lower.includes(d.toLowerCase())) {
          setDistrict(d);
          break;
        }
      }
      if (lower.includes("హైదరాబాద్") || lower.includes("hyderabad")) setDistrict("Hyderabad");
      if (lower.includes("వరంగల్") || lower.includes("warangal")) setDistrict("Warangal");
      if (lower.includes("వైజాగ్") || lower.includes("విశాఖ") || lower.includes("visakhapatnam")) setDistrict("Visakhapatnam");
      if (lower.includes("విజయవాడ") || lower.includes("vijayawada")) setDistrict("Vijayawada (NTR)");
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
        
        {/* Top Toggle: Looking for Bride or Groom + Voice Search Button */}
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

          <div className="flex items-center gap-2">
            {/* Voice Search Button */}
            <button
              type="button"
              onClick={handleVoiceSearch}
              className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border transition ${
                isListening
                  ? "bg-rose-600 text-white border-rose-700 animate-pulse"
                  : "bg-white text-maroon border-gold/50 hover:bg-gold/10"
              }`}
              title={te ? "వాయిస్ సెర్చ్ (మాట్లాడి వెతకండి)" : "Voice Search (Speak in Telugu/English)"}
            >
              <span className="text-sm">🎙️</span>
              <span>{isListening ? (te ? "వింటున్నాను..." : "Listening...") : (te ? "వాయిస్ సెర్చ్" : "Voice Search")}</span>
            </button>

            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
              ⚡ {te ? "మొదటి 3 సంబంధాలు FREE" : "First 3 Profiles FREE"}
            </span>
          </div>
        </div>

        {voiceTranscript && (
          <div className="text-xs bg-amber-50 border border-gold/30 px-3 py-1.5 rounded-xl text-maroon font-bold animate-fade flex items-center justify-between">
            <span>🗣️ {voiceTranscript}</span>
            <button type="button" onClick={() => setVoiceTranscript("")} className="text-gray-400 hover:text-gray-600 text-xs font-bold">✕</button>
          </div>
        )}

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
