"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useLang } from "@/lib/lang";
import {
  TS_DISTRICTS_DETAILED,
  AP_DISTRICTS_DETAILED,
  OTHER_LOCATIONS,
  DistrictDetail,
  sortUniqueOptions,
} from "@/lib/telugu-data";

const TS_DISTRICT_COUNT = TS_DISTRICTS_DETAILED.length;
const AP_DISTRICT_COUNT = AP_DISTRICTS_DETAILED.length;
const INDIA_DISTRICT_COUNT = TS_DISTRICT_COUNT + AP_DISTRICT_COUNT;
const OTHER_LOCATION_COUNT = OTHER_LOCATIONS.length;

const REGIONS = [
  {
    id: "hyderabad",
    titleTe: "🏙️ హైదరాబాద్ & సైబరాబాద్ IT హబ్",
    titleEn: "Hyderabad & Cyberabad IT Hub",
    descTe: "Hyderabad, Rangareddy, Medchal, Sangareddy సాఫ్ట్‌వేర్ & ప్రొఫెషనల్ సంబంధాలు",
    descEn: "Software, High-income IT & Corporate matches across Greater Hyderabad",
    districts: sortUniqueOptions(["Hyderabad", "Rangareddy", "Medchal-Malkajgiri", "Sangareddy"]),
    tag: "High Tech & MNCs",
  },
  {
    id: "godavari",
    titleTe: "🌊 గోదావరి & కోస్తా ఆంధ్ర సంబంధాలు",
    titleEn: "Godavari & Coastal Andhra Hub",
    descTe: "East Godavari, West Godavari, Konaseema, Kakinada, Eluru & Krishna",
    descEn: "Traditional, Affluent & Cultured families from Godavari delta & coastal belt",
    districts: sortUniqueOptions(["East Godavari", "West Godavari", "Dr. B.R. Ambedkar Konaseema", "Kakinada", "Eluru", "Krishna", "NTR"]),
    tag: "Auspicious & Cultural",
  },
  {
    id: "rayalaseema",
    titleTe: "🌄 రాయలసీమ రత్నాల సీమ సంబంధాలు",
    titleEn: "Rayalaseema Regional Matrimony",
    descTe: "Tirupati, Chittoor, Kurnool, Nandyal, Ananthapuramu, YSR Kadapa, Annamayya",
    descEn: "Prestigious families, Doctors, Govt Officers & Business alliances",
    districts: sortUniqueOptions(["Tirupati", "Chittoor", "Kurnool", "Nandyal", "Ananthapuramu", "Sri Sathya Sai", "YSR Kadapa", "Annamayya"]),
    tag: "Royal Heritage",
  },
  {
    id: "north_ts",
    titleTe: "🏛️ ఉత్తర & మధ్య తెలంగాణ సంబంధాలు",
    titleEn: "North & Central Telangana Hub",
    descTe: "Warangal, Hanamkonda, Karimnagar, Nizamabad, Khammam, Nalgonda, Siddipet",
    descEn: "Govt employees, Teachers, Businessmen & Agricultural families",
    districts: sortUniqueOptions(["Warangal", "Hanamkonda", "Karimnagar", "Nizamabad", "Khammam", "Nalgonda", "Siddipet", "Jagtial", "Kamareddy", "Suryapet"]),
    tag: "Rich Traditions",
  },
  {
    id: "nri",
    titleTe: "✈️ USA / UK / Australia & Gulf NRI సంబంధాలు",
    titleEn: "Global Telugu NRI Matrimony",
    descTe: "USA (H-1B, Green Card), Canada, UK, Australia, Europe & Gulf NRI తెలుగు వారు",
    descEn: "Global Telugu professionals working abroad looking for authentic roots",
    districts: sortUniqueOptions(["USA / United States", "United Kingdom (UK)", "Canada", "Australia", "UAE / Dubai", "Other Country", "Other Indian State"]),
    tag: "Global Telugu",
  },
];

export default function DistrictsPage() {
  const { lang } = useLang();
  const te = lang === "te";

  const [activeTab, setActiveTab] = useState<"all" | "TS" | "AP" | "Other">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const allDistricts: DistrictDetail[] = useMemo(() => {
    return [...TS_DISTRICTS_DETAILED, ...AP_DISTRICTS_DETAILED, ...OTHER_LOCATIONS]
      .sort((a, b) => a.en.localeCompare(b.en, "en", { sensitivity: "base" }));
  }, []);

  const filteredDistricts = useMemo(() => {
    return allDistricts.filter((d) => {
      if (activeTab !== "all" && d.state !== activeTab) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesEn = d.en.toLowerCase().includes(q);
        const matchesTe = d.te.toLowerCase().includes(q);
        const matchesDisp = d.display.toLowerCase().includes(q);
        return matchesEn || matchesTe || matchesDisp;
      }
      return true;
    });
  }, [allDistricts, activeTab, searchQuery]);

  return (
    <div className="min-h-dvh bg-[#FFFDF9] pb-24">
      {/* ================= HERO HEADER ================= */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#4A0518] via-[#6B0C27] to-[#8C1438] text-white py-12 px-4 border-b-4 border-gold">
        <div className="max-w-6xl mx-auto text-center space-y-4 relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gold/20 border border-gold/40 text-amber-200 text-xs font-black tracking-wide uppercase shadow-sm">
            <span>🏛️</span>
            <span>తెలంగాణ & ఆంధ్రప్రదేశ్ సమగ్ర జిల్లా వైవాహిక నెట్‌వర్క్</span>
          </div>

          <h1 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight telugu text-white">
            మీ సొంత జిల్లా & మండలంలోనే... <br className="hidden sm:inline" />
            <span className="text-amber-300">పరిపూర్ణ వివాహ సంబంధాలు</span>
          </h1>

          <p className="max-w-3xl mx-auto text-xs sm:text-sm md:text-base text-rose-100/90 leading-relaxed font-medium">
            {te
              ? `తెలంగాణలోని ${TS_DISTRICT_COUNT} జిల్లాలు మరియు ఆంధ్రప్రదేశ్‌లోని ${AP_DISTRICT_COUNT} జిల్లాల ప్రాంతీయ ఎంపికలు; ఇతర నగరాలు, NRI ప్రాంతాలు కూడా అందుబాటులో ఉన్నాయి.`
              : `Browse regional options across ${TS_DISTRICT_COUNT} Telangana and ${AP_DISTRICT_COUNT} Andhra Pradesh districts, plus other Indian and NRI locations.`}
          </p>

          {/* Quick State Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-3">
            {[
              { id: "all", l: te ? `🌟 మొత్తం (${INDIA_DISTRICT_COUNT} జిల్లాలు + NRI)` : `🌟 All (${INDIA_DISTRICT_COUNT} districts + NRI)`, count: INDIA_DISTRICT_COUNT },
              { id: "TS", l: te ? `🔴 తెలంగాణ (${TS_DISTRICT_COUNT} జిల్లాలు)` : `🔴 Telangana (${TS_DISTRICT_COUNT})`, count: TS_DISTRICT_COUNT },
              { id: "AP", l: te ? `🔵 ఆంధ్రప్రదేశ్ (${AP_DISTRICT_COUNT} జిల్లాలు)` : `🔵 Andhra Pradesh (${AP_DISTRICT_COUNT})`, count: AP_DISTRICT_COUNT },
              { id: "Other", l: te ? `✈️ ఇతర ప్రాంతాలు (${OTHER_LOCATION_COUNT})` : `✈️ Other & NRI locations (${OTHER_LOCATION_COUNT})`, count: OTHER_LOCATION_COUNT },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold transition shadow-sm ${
                  activeTab === tab.id
                    ? "gold-gradient text-maroon font-black scale-105"
                    : "bg-white/15 text-white hover:bg-white/25 border border-white/20"
                }`}
              >
                {tab.l}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ================= MAIN CONTENT ================= */}
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        
        {/* Search Bar */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-gold/30 card-shadow flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-96">
            <span className="absolute left-3.5 top-3 text-slate-400">🔍</span>
            <input
              type="text"
              placeholder={te ? "జిల్లా పేరు వెతకండి (ఉదా: హైదరాబాద్, Vizag, Guntur)..." : "Search district (e.g. Hyderabad, Warangal)..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-maroon"
            />
          </div>

          <div className="text-xs font-bold text-slate-600 flex items-center gap-2">
            <span>{te ? "ఫలితాలు:" : "Results:"}</span>
            <span className="bg-amber-100 text-maroon px-3 py-1 rounded-full font-black text-xs border border-gold/40">
              {filteredDistricts.length} {te ? (activeTab === "TS" || activeTab === "AP" ? "జిల్లాలు" : "ప్రాంతాలు") : (activeTab === "TS" || activeTab === "AP" ? "districts" : "locations")}
            </span>
          </div>
        </div>

        {/* 🌟 5 REGIONAL SPOTLIGHT CLUSTERS */}
        {!searchQuery && activeTab === "all" && (
          <div className="space-y-4">
            <h2 className="text-lg sm:text-xl font-black text-navy flex items-center gap-2">
              <span>✨</span>
              <span>{te ? "ప్రముఖ ప్రాంతీయ వివాహ విభాగాలు (Regional Matchmaking Hubs)" : "Regional Matchmaking Hubs"}</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {REGIONS.map((reg) => (
                <div
                  key={reg.id}
                  className="bg-white rounded-3xl p-5 border border-gold/30 card-shadow hover:border-gold hover:shadow-xl transition flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-amber-50 text-maroon border border-gold/40">
                        {reg.tag}
                      </span>
                    </div>
                    <h3 className="font-black text-base text-navy telugu">{reg.titleTe}</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">{reg.descTe}</p>

                    {/* Quick District Pills */}
                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {reg.districts.slice(0, 4).map((d) => (
                        <Link
                          key={d}
                          href={`/matches?district=${encodeURIComponent(d)}`}
                          className="text-[11px] font-semibold bg-slate-50 hover:bg-amber-50 hover:text-maroon border border-slate-200 px-2.5 py-1 rounded-xl text-slate-700 transition"
                        >
                          📍 {d}
                        </Link>
                      ))}
                    </div>
                  </div>

                  <Link
                    href={`/matches?district=${encodeURIComponent(reg.districts.join(","))}`}
                    className="w-full text-center py-2.5 rounded-xl maroon-gradient text-white font-bold text-xs shadow-xs hover:brightness-110 transition flex items-center justify-center gap-1.5"
                  >
                    <span>ఈ ప్రాంత సంబంధాలు చూడండి</span>
                    <span>→</span>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= DISTRICTS INTERACTIVE GRID ================= */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-black text-navy flex items-center gap-2">
              <span>🏛️</span>
              <span>
                {activeTab === "TS"
                  ? te ? `తెలంగాణ జిల్లాలు (${TS_DISTRICT_COUNT})` : `Telangana districts (${TS_DISTRICT_COUNT})`
                  : activeTab === "AP"
                  ? te ? `ఆంధ్రప్రదేశ్ జిల్లాలు (${AP_DISTRICT_COUNT})` : `Andhra Pradesh districts (${AP_DISTRICT_COUNT})`
                  : activeTab === "Other"
                  ? te ? "ఇతర భారతీయ & NRI ప్రాంతాలు" : "Other Indian and NRI locations"
                  : te ? `అన్ని జిల్లాలు & ఇతర ప్రాంతాలు (${INDIA_DISTRICT_COUNT} + NRI)` : `Districts & other locations (${INDIA_DISTRICT_COUNT} + NRI)`}
              </span>
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
            {filteredDistricts.map((d) => (
              <div
                key={d.en}
                className="bg-white rounded-2xl p-4 border border-gold/25 card-shadow hover:border-gold hover:shadow-md transition flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[9.5px] font-black px-2 py-0.5 rounded-full ${
                        d.state === "TS"
                          ? "bg-rose-50 text-rose-800 border border-rose-200"
                          : d.state === "AP"
                          ? "bg-blue-50 text-blue-800 border border-blue-200"
                          : "bg-purple-50 text-purple-800 border border-purple-200"
                      }`}
                    >
                      {d.state === "TS" ? "🔴 తెలంగాణ" : d.state === "AP" ? "🔵 ఆంధ్రప్రదేశ్" : "🌐 NRI / ఇతర"}
                    </span>
                    <span className="text-[10.5px] font-mono text-slate-400">📍 {te ? "ప్రాంతం" : "Location"}</span>
                  </div>

                  <h4 className="font-black text-base text-navy mt-2 telugu">{d.te}</h4>
                  <p className="text-xs font-semibold text-slate-500">{d.en}</p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                  <Link
                    href={`/matches?district=${encodeURIComponent(d.en)}`}
                    className="flex-1 text-center py-2 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-maroon font-bold text-xs border border-gold/40 transition shadow-xs"
                  >
                    💘 సంబంధాలు చూడండి
                  </Link>

                  <Link
                    href={`/register?district=${encodeURIComponent(d.en)}`}
                    className="py-2 px-3 rounded-xl maroon-gradient text-white font-bold text-xs shadow-xs hover:brightness-110 transition"
                    title="Register from this district"
                  >
                    📝 నమోదు
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Banner */}
        <div className="maroon-gradient rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <div className="space-y-1.5">
            <h3 className="text-lg sm:text-xl font-black text-amber-200">
              మీ జిల్లాలో సరైన సంబంధం వెతుకుతున్నారా?
            </h3>
            <p className="text-xs sm:text-sm text-rose-100 max-w-xl">
              ఈరోజే మన వివాహ వేదికపై ఉచితంగా నమోదు చేసుకోండి. మీ కులం, గోత్రం మరియు ప్రాంతానికి సరిపోయే ఉత్తమ సంబంధాలను పొందండి.
            </p>
          </div>

          <Link
            href="/register"
            className="px-6 py-3 rounded-2xl gold-gradient text-maroon font-black text-xs sm:text-sm shadow-lg hover-lift shrink-0"
          >
            📝 ఉచిత నమోదు (Register Free)
          </Link>
        </div>
      </div>
    </div>
  );
}
