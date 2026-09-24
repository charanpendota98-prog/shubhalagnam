"use client";
/**
 * 🔍 ULTRA-ADVANCED HERO QUICK SEARCH & VOICE MATCH FINDER
 * ========================================================
 * Instant 5-second match finder:
 * - Gender toggle with luxury active gradient
 * - Speech-to-text Web Speech API Voice Search in Telugu & English
 * - 1-Touch Popular Community Quick Filter Chips
 * - Instant direct redirect to filtered /matches
 */
import { useState } from "react";
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

const QUICK_CHIPS = [
  { label: "Reddy", te: "రెడ్డి" },
  { label: "Kamma", te: "కమ్మ" },
  { label: "Kapu", te: "కాపు" },
  { label: "Arya Vysya", te: "ఆర్య వైశ్య" },
  { label: "Brahmin", te: "బ్రాహ్మణ" },
  { label: "Yadava", te: "యాదవ" },
  { label: "Padmashali", te: "పద్మశాలి" },
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

  const selectQuickChip = (casteName: string) => {
    if (casteName === "NRI") {
      setDistrict("NRI (USA/UK/Gulf)");
      setCaste("All Castes");
    } else if (casteName === "SC / ST") {
      setCaste("SC (Scheduled Caste)");
    } else {
      setCaste(casteName);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto bg-white/95 backdrop-blur-2xl rounded-[2rem] p-5 sm:p-7 border-2 border-gold/70 shadow-[0_20px_70px_rgba(122,12,46,0.18)]">
      <form onSubmit={handleSearch} className="space-y-4">
        
        {/* Top Control Bar: Looking for Gender + Voice Search Button */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gold/30 pb-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-black uppercase text-[#7A0C2E] tracking-wider telugu">
              {te ? "నేను వెతుకుతున్న సంబంధం:" : "I am looking for:"}
            </span>
            <div className="inline-flex p-1 bg-amber-50/80 rounded-2xl border border-gold/50 shadow-inner">
              <button
                type="button"
                onClick={() => setGender("Bride")}
                className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
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
                className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                  gender === "Groom"
                    ? "maroon-gradient text-white shadow-md"
                    : "text-gray-700 hover:text-maroon"
                }`}
              >
                🤵 {te ? "వరుడు (Groom)" : "Groom"}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Voice Search Button with Aura Pulse */}
            <button
              type="button"
              onClick={handleVoiceSearch}
              className={`flex items-center gap-2 text-xs font-black px-3.5 py-2 rounded-xl border transition-all cursor-pointer ${
                isListening
                  ? "bg-rose-600 text-white border-rose-700 animate-pulse shadow-lg"
                  : "bg-amber-50 text-maroon border-gold/60 hover:bg-gold/20 shadow-xs"
              }`}
              title={te ? "వాయిస్ సెర్చ్ — మాట్లాడి వెతకండి" : "Voice Search (Speak in Telugu/English)"}
            >
              <span className="text-sm">🎙️</span>
              <span className="telugu">{isListening ? (te ? "వింటున్నాను..." : "Listening...") : (te ? "మాట్లాడి వెతకండి" : "Voice Search")}</span>
            </button>

            <span className="text-[11px] font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-300 px-3 py-1.5 rounded-full shadow-xs">
              ⚡ {te ? "మొదటి 3 నంబర్లు FREE" : "First 3 Profiles FREE"}
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
          
          {/* Caste Dropdown */}
          <div>
            <label className="block text-[11px] font-extrabold text-gray-800 mb-1.5 telugu">
              🪔 {te ? "కులం (Caste):" : "Caste:"}
            </label>
            <select
              value={caste}
              onChange={(e) => setCaste(e.target.value)}
              className="w-full px-3.5 py-3 bg-amber-50/50 border border-gold/50 rounded-xl text-xs font-bold text-navy focus:outline-none focus:ring-2 focus:ring-maroon cursor-pointer shadow-xs"
            >
              {POPULAR_CASTES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Age Dropdown */}
          <div>
            <label className="block text-[11px] font-extrabold text-gray-800 mb-1.5 telugu">
              🎂 {te ? "వయస్సు (Age Range):" : "Age Range:"}
            </label>
            <select
              value={ageIdx}
              onChange={(e) => setAgeIdx(parseInt(e.target.value, 10))}
              className="w-full px-3.5 py-3 bg-amber-50/50 border border-gold/50 rounded-xl text-xs font-bold text-navy focus:outline-none focus:ring-2 focus:ring-maroon cursor-pointer shadow-xs"
            >
              {AGE_RANGES.map((a, i) => (
                <option key={a.label} value={i}>{a.label}</option>
              ))}
            </select>
          </div>

          {/* District Dropdown */}
          <div>
            <label className="block text-[11px] font-extrabold text-gray-800 mb-1.5 telugu">
              📍 {te ? "ప్రాంతం (District / NRI):" : "District / City:"}
            </label>
            <select
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className="w-full px-3.5 py-3 bg-amber-50/50 border border-gold/50 rounded-xl text-xs font-bold text-navy focus:outline-none focus:ring-2 focus:ring-maroon cursor-pointer shadow-xs"
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
                caste === qc.label || (qc.label === "NRI" && district.includes("NRI"))
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
