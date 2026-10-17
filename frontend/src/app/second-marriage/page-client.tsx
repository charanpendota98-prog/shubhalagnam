"use client";

import { useEffect, useMemo, useState } from "react";
import HomeSecondMarriageSection from "@/components/HomeSecondMarriageSection";
import Link from "next/link";
import { apiDisplayMessage, apiGet } from "@/lib/api";
import { SITE_CONFIG } from "@/lib/site-config";
import { whatsappPhoneLink } from "@/lib/wa";
import { useLang } from "@/lib/lang";
import {
  CASTES,
  CASTE_TELUGU,
  TS_DISTRICTS,
  AP_DISTRICTS,
  DISTRICT_TELUGU,
  DISTRICTS_BY_STATE,
  OTHER_LOCATIONS,
  sortUniqueOptions,
  stateFullName,
  isSecondMarriageStatus,
  normalizeMaritalStatus,
} from "@/lib/telugu-data";

interface ProfileRow {
  tsap_id: string;
  gender: string;
  full_name: string;
  age: number;
  height?: string;
  weight?: string;
  caste?: string;
  sub_caste?: string;
  gothram?: string;
  star?: string;
  rasi?: string;
  education?: string;
  education_detail?: string;
  job?: string;
  company?: string;
  salary?: string;
  work_location?: string;
  district?: string;
  state?: string;
  current_city?: string;
  marital_status?: string;
  children?: string;
  about_myself?: string;
  expectations?: string;
  phone_verified?: boolean;
  photo_verified?: boolean;
  id_verified?: boolean;
  verification_level?: "none" | "phone" | "photo" | "id";
  photo_urls?: string[];
  photo_url?: string;
}

const ALL_DISTRICTS = sortUniqueOptions([
  ...TS_DISTRICTS,
  ...AP_DISTRICTS,
  ...OTHER_LOCATIONS.map((location) => location.en),
  "USA / NRI",
  "Other",
]);

function parseChildrenCount(value?: string | null): number | null {
  const raw = String(value || "").normalize("NFKC").trim().toLowerCase();
  if (["none", "no", "no children", "0", "పిల్లలు లేరు"].includes(raw)) return 0;
  const match = /\d+/.exec(raw);
  return match ? Number(match[0]) : null;
}

export default function SecondMarriagePage() {
  const { lang } = useLang();
  const te = lang === "te";
  const profileText = (value: unknown, fallback = "") => {
    const text = String(value ?? "").trim();
    return te ? (text || fallback) : apiDisplayMessage({ message_en: text }, false, fallback);
  };

  // Filter states
  const [gender, setGender] = useState<string>("");
  const [maritalFilter, setMaritalFilter] = useState<string>("");
  const [childrenFilter, setChildrenFilter] = useState<string>("");
  const [selectedCaste, setSelectedCaste] = useState<string>("");
  const [selectedDistrict, setSelectedDistrict] = useState<string>("");
  const [ageMax, setAgeMax] = useState<number>(55);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("all");

  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [savedIds, setSavedIds] = useState<string[]>([]);

  // Load profiles from API with second_marriage flag
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    apiGet<{ results?: ProfileRow[]; total?: number }>("/api/search?second_marriage=true&limit=60")
      .then(({ ok, data }) => {
        if (!isMounted) return;
        const rows = ok && Array.isArray(data?.results) ? data.results : [];
        // Never-married rows are excluded; API failures/empty results stay empty, not fabricated.
        const filtered = rows.filter((p) => isSecondMarriageStatus(p.marital_status));
        setProfiles(filtered);
      })
      .catch(() => {
        if (isMounted) setProfiles([]);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Quick preset tab change handler
  const handleTabClick = (tab: string) => {
    setActiveTab(tab);
    if (tab === "all") {
      setGender("");
      setChildrenFilter("");
      setMaritalFilter("");
    } else if (tab === "brides") {
      setGender("Bride");
      setChildrenFilter("");
    } else if (tab === "grooms") {
      setGender("Groom");
      setChildrenFilter("");
    } else if (tab === "no_children") {
      setGender("");
      setChildrenFilter("None");
    } else if (tab === "with_children") {
      setGender("");
      setChildrenFilter("with_children");
    } else if (tab === "divorced") {
      setMaritalFilter("Divorced");
    } else if (tab === "widow") {
      setMaritalFilter("Widow");
    }
  };

  // Filtered profile list
  const filteredProfiles = useMemo(() => {
    return profiles.filter((p) => {
      // Gender filter
      if (gender && p.gender?.toLowerCase() !== gender.toLowerCase()) return false;

      // Marital status filter
      if (maritalFilter && normalizeMaritalStatus(p.marital_status) !== normalizeMaritalStatus(maritalFilter)) return false;

      // Children filter
      if (childrenFilter) {
        const count = parseChildrenCount(p.children);
        if (childrenFilter === "None" && count !== 0) return false;
        if (childrenFilter === "with_children" && (count === null || count <= 0)) return false;
      }

      // Caste filter
      if (selectedCaste) {
        const cVal = (p.caste || "").toLowerCase();
        if (!cVal.includes(selectedCaste.toLowerCase())) return false;
      }

      // District filter
      if (selectedDistrict) {
        const dVal = ((p.district || "") + " " + (p.current_city || "")).toLowerCase();
        if (!dVal.includes(selectedDistrict.toLowerCase())) return false;
      }

      // Age filter
      if (p.age > ageMax) return false;

      // Text query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const fullTxt = `${p.full_name} ${p.tsap_id} ${p.caste} ${p.job} ${p.education} ${p.district} ${p.about_myself}`.toLowerCase();
        if (!fullTxt.includes(q)) return false;
      }

      return true;
    });
  }, [profiles, gender, maritalFilter, childrenFilter, selectedCaste, selectedDistrict, ageMax, searchQuery]);

  const toggleSave = (id: string) => {
    setSavedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const resetAllFilters = () => {
    setGender("");
    setMaritalFilter("");
    setChildrenFilter("");
    setSelectedCaste("");
    setSelectedDistrict("");
    setAgeMax(55);
    setSearchQuery("");
    setActiveTab("all");
  };

  const getMaritalBadge = (status?: string, genderStr?: string) => {
    const category = normalizeMaritalStatus(status);
    if (category === "divorced") {
      return { label: te ? "🕊️ విడాకులు పొందినవారు" : "🕊️ Divorced", bg: "bg-rose-50 text-rose-800 border-rose-200" };
    }
    if (category === "widowed") {
      const isGroom = genderStr === "Groom" || genderStr === "Male";
      return {
        label: te ? (isGroom ? "🕊️ విధురుడు" : "🕊️ వితంతువు") : (isGroom ? "🕊️ Widower" : "🕊️ Widow"),
        bg: "bg-purple-50 text-purple-800 border-purple-200",
      };
    }
    if (category === "awaiting divorce") {
      return { label: te ? "⏳ విడాకుల ప్రక్రియలో" : "⏳ Awaiting divorce", bg: "bg-amber-50 text-amber-800 border-amber-200" };
    }
    return { label: te ? "💍 పునర్వివాహం" : "💍 Second marriage", bg: "bg-amber-50 text-maroon border-gold/40" };
  };

  return (
    <div className="min-h-dvh bg-[#FFFDF9] pb-20">

      {/* Community guidance section for second-marriage introductions. */}
      <HomeSecondMarriageSection />
      {/* ================= HERO HEADER ================= */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#4A0518] via-[#660B25] to-[#8C1438] text-white py-12 px-4 border-b-4 border-gold">
        {/* Decorative Background Circles */}
        <div className="absolute -right-16 -top-16 w-80 h-80 rounded-full bg-gold/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-80 h-80 rounded-full bg-rose-500/10 blur-3xl pointer-events-none" />

        <div className="max-w-6xl mx-auto relative z-10 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gold/20 border border-gold/40 text-amber-200 text-xs font-black tracking-wide uppercase shadow-sm">
            <span>💍</span>
            <span>{te ? "మన వివాహ • పునర్వివాహ పరిచయాలు" : "Mana Vivaha · Second-marriage introductions"}</span>
          </div>

          <h1 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight text-white">
            {te ? <>కొత్త జీవిత అధ్యాయానికి... <br className="hidden sm:inline" /><span className="text-amber-300">గౌరవప్రదమైన పరిచయం</span></> : <>A new chapter, with<br className="hidden sm:inline" /> <span className="text-amber-300">a thoughtful introduction</span></>}
          </h1>

          <p className="max-w-3xl mx-auto text-xs sm:text-sm md:text-base text-rose-100/90 leading-relaxed font-medium">
            {te
              ? "విడాకులు పొందినవారు మరియు వితంతువుల కోసం తెలుగు మ్యాట్రిమోనీ డైరెక్టరీ. వివరాలు సభ్యులు అందించినవి; ఫోటో కనిపించడం మీ గోప్యతా సెట్టింగ్‌పై ఆధారపడి ఉంటుంది."
              : "A Telugu matrimony directory for divorced and widowed members. Profiles are member-submitted; verify details independently and review the available private-photo setting."}
          </p>

          {/* Recorded profile information and privacy notes */}
          <div className="pt-4 grid grid-cols-2 md:grid-cols-4 gap-2.5 max-w-4xl mx-auto text-left">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15 flex items-center gap-2.5">
              <span className="text-2xl">🔒</span>
              <div>
                <div className="text-xs font-black text-amber-200">{te ? "గోప్యతా నియంత్రణలు" : "Privacy controls"}</div>
                <div className="text-[10px] text-rose-100">{te ? "ఫోటో సెట్టింగ్ ఐచ్ఛికం; పబ్లిక్‌గా ఫోన్ దాచబడుతుంది" : "Photo setting is optional; phone is masked publicly"}</div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15 flex items-center gap-2.5">
              <span className="text-2xl">⚖️</span>
              <div>
                <div className="text-xs font-black text-amber-200">{te ? "వైవాహిక స్థితి వివరాలు" : "Marital status details"}</div>
                <div className="text-[10px] text-rose-100">{te ? "సభ్యులు అందించిన వివరాలు; అవసరమైతే పత్రాలు అడగండి" : "Member-provided; request documents when appropriate"}</div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15 flex items-center gap-2.5">
              <span className="text-2xl">👶</span>
              <div>
                <div className="text-xs font-black text-amber-200">{te ? "పిల్లల వివరాలు" : "Children’s details"}</div>
                <div className="text-[10px] text-rose-100">{te ? "సభ్యులు అందించిన సమాచారం" : "Member-provided information"}</div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15 flex items-center gap-2.5">
              <span className="text-2xl">👩‍💼</span>
              <div>
                <div className="text-xs font-black text-amber-200">{te ? "సమ్మతి తర్వాత సంప్రదింపు" : "Consent-led contact"}</div>
                <div className="text-[10px] text-rose-100">{te ? "యజమాని అంగీకారం తర్వాత accepted-request account views లో వివరాలు కనిపిస్తాయి" : "Owner acceptance grants contact access in accepted-request account views"}</div>
              </div>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
            <Link
              href="/register"
              className="px-6 py-3 rounded-2xl gold-gradient text-maroon font-black text-xs sm:text-sm shadow-lg hover-lift flex items-center gap-2"
            >
              <span>📝</span>
              <span>{te ? "పునర్వివాహానికి ఉచితంగా నమోదు" : "Register free for remarriage"}</span>
            </Link>

            {SITE_CONFIG.supportWhatsapp ? (
              <a
                href={whatsappPhoneLink(SITE_CONFIG.supportWhatsapp, te ? "నమస్కారం, పునర్వివాహ సంబంధాల జాబితా గురించి నాకు ప్రశ్న ఉంది." : "Hello, I have a question about the remarriage listings.") || undefined}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-3 rounded-2xl bg-gradient-to-r from-[#128C4A] to-[#20bd5a] text-white font-bold text-xs sm:text-sm shadow-md transition hover:brightness-105 flex items-center gap-2"
                title={te ? "WhatsApp బాహ్య సేవ; లభ్యతను ఈ సైట్ తనిఖీ చేయదు" : "External WhatsApp link; availability is not checked by this site"}
              >
                <span>💬</span>
                <span>{te ? "WhatsApp సహాయం" : "WhatsApp support"}</span>
              </a>
            ) : null}
          </div>
        </div>
      </section>

      {/* ================= MAIN CONTENT CONTAINER ================= */}
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* Quick Filter Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {[
            { id: "all", te: "🌟 అన్ని పునర్వివాహ సంబంధాలు", en: "🌟 All remarriage profiles" },
            { id: "brides", te: "👰 వధువులు", en: "👰 Brides" },
            { id: "grooms", te: "🤵 వరులు", en: "🤵 Grooms" },
            { id: "no_children", te: "🕊️ పిల్లలు లేనివారు", en: "🕊️ No children" },
            { id: "with_children", te: "👶 పిల్లలు ఉన్నవారు", en: "👶 With children" },
            { id: "divorced", te: "⚖️ విడాకులు పొందినవారు", en: "⚖️ Divorced" },
            { id: "widow", te: "🌸 వితంతువు / విధురుడు", en: "🌸 Widowed" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              aria-pressed={activeTab === tab.id}
              className={`whitespace-nowrap px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 border ${
                activeTab === tab.id
                  ? "bg-maroon text-white border-maroon shadow-md"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              <span>{te ? tab.te : tab.en}</span>
            </button>
          ))}
        </div>

        {/* Detailed Search & Filter Bar */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-gold/30 card-shadow space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {/* Search Input */}
            <div>
              <label htmlFor="remarriage-search" className="block text-[11px] font-extrabold text-slate-700 mb-1">
                🔍 {te ? "పేరు / ID / ఉద్యోగం వెతకండి" : "Search by name, ID, or occupation"}
              </label>
              <input
                id="remarriage-search"
                type="text"
                placeholder={te ? "పేరు, ప్రొఫైల్ ID లేదా వృత్తి" : "Name, profile ID, or occupation"}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-maroon"
              />
            </div>

            {/* Caste Selection */}
            <div>
              <label htmlFor="remarriage-caste" className="block text-[11px] font-extrabold text-slate-700 mb-1">
                💍 {te ? "కులం" : "Community"}
              </label>
              <select
                id="remarriage-caste"
                value={selectedCaste}
                onChange={(e) => setSelectedCaste(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-maroon"
              >
                <option value="">{te ? "అన్ని కులాలు" : "All communities"}</option>
                {CASTES.map((c) => (
                  <option key={c} value={c}>
                    {te && CASTE_TELUGU[c] ? `${CASTE_TELUGU[c]} (${c})` : c}
                  </option>
                ))}
              </select>
            </div>

            {/* District Selection */}
            <div>
              <label htmlFor="remarriage-district" className="block text-[11px] font-extrabold text-slate-700 mb-1">
                📍 {te ? "జిల్లా / నగరం" : "District / location"}
              </label>
              <select
                id="remarriage-district"
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-maroon"
              >
                <option value="">{te ? "అన్ని జిల్లాలు / ప్రాంతాలు" : "All locations (TS, AP, and NRI)"}</option>
                {ALL_DISTRICTS.map((d) => (
                  <option key={d} value={d}>
                    {te && DISTRICT_TELUGU[d] ? `${DISTRICT_TELUGU[d]} (${d})` : d}
                  </option>
                ))}
              </select>
            </div>

            {/* Age Range Filter */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="remarriage-age" className="text-[11px] font-extrabold text-slate-700">
                  🎂 {te ? "గరిష్ట వయస్సు" : "Maximum age"}
                </label>
                <span className="text-xs font-black text-maroon">{ageMax} {te ? "సం." : "years"}</span>
              </div>
              <input
                id="remarriage-age"
                type="range"
                min={22}
                max={60}
                value={ageMax}
                onChange={(e) => setAgeMax(parseInt(e.target.value))}
                className="w-full accent-[#7A0C2E] cursor-pointer"
              />
            </div>
          </div>

          {/* Active Filter Summary and Clear Button */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
            <div className="text-slate-600 font-bold">
              <span>{te ? "సరిపోలిన పునర్వివాహ సంబంధాలు:" : "Matching Remarriage Profiles:"} </span>
              <span className="text-maroon font-black text-sm">{filteredProfiles.length}</span>
            </div>

            {(gender || maritalFilter || childrenFilter || selectedCaste || selectedDistrict || ageMax < 55 || searchQuery) && (
              <button
                onClick={resetAllFilters}
                className="text-[11px] text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1"
              >
                <span>✕</span>
                <span>{te ? "అన్ని వడపోతలను తొలగించండి" : "Reset Filters"}</span>
              </button>
            )}
          </div>
        </div>

        {/* ================= PROFILE CARDS GRID ================= */}
        {loading ? (
          <div className="grid md:grid-cols-2 gap-5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-3xl p-6 border border-slate-200 animate-pulse space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-24 bg-slate-200 rounded-2xl" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-200 rounded w-1/2" />
                    <div className="h-3 bg-slate-200 rounded w-3/4" />
                    <div className="h-3 bg-slate-200 rounded w-2/3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredProfiles.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center border border-gold/30 card-shadow space-y-4">
            <div className="text-4xl">🔍</div>
            <h3 className="text-lg font-bold text-navy">
              {profiles.length === 0
                ? (te ? "ప్రస్తుతం ప్రచురించిన పునర్వివాహ ప్రొఫైళ్లు లేవు" : "No published second-marriage profiles are currently available")
                : (te ? "ఎంచుకున్న ఫిల్టర్లకు సరిపోయే సంబంధాలు కనిపించలేదు" : "No profiles found matching selected filters")}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {profiles.length === 0
                ? (te ? "నమూనా లేదా కల్పిత ప్రొఫైళ్లు చూపించము. తర్వాత మళ్లీ చూడండి." : "We do not substitute sample profiles. Please check again later.")
                : (te ? "వడపోతలను సడలించి మళ్లీ ప్రయత్నించండి." : "Try broadening your filters.")}
            </p>
            <button
              onClick={resetAllFilters}
              className="px-6 py-2.5 rounded-xl maroon-gradient text-white font-bold text-xs shadow-md"
            >
              {te ? "వడపోతలను తొలగించండి" : "Reset All Filters"}
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-5">
            {filteredProfiles.map((row) => {
              const photo = row.photo_url || (Array.isArray(row.photo_urls) && row.photo_urls[0]) || "";
              const maritalBadge = getMaritalBadge(row.marital_status, row.gender);
              const isSaved = savedIds.includes(row.tsap_id);
              const caste = te ? (CASTE_TELUGU[row.caste || ""] || row.caste || "") : profileText(row.caste);
              const subCaste = profileText(row.sub_caste);
              const height = profileText(row.height);
              const children = profileText(row.children);
              const education = profileText(row.education);
              const job = profileText(row.job);
              const company = profileText(row.company);
              const district = te ? (DISTRICT_TELUGU[row.district || ""] || row.district || "") : profileText(row.district);
              const salary = profileText(row.salary);
              const about = profileText(row.about_myself, te ? "" : "Profile description is not available in English.");
              const star = profileText(row.star);
              const rasi = profileText(row.rasi);
              const gothram = profileText(row.gothram);

              return (
                <div
                  key={row.tsap_id}
                  className="bg-white rounded-3xl border border-gold/30 card-shadow hover:border-gold hover:shadow-xl transition overflow-hidden flex flex-col justify-between"
                >
                  <div className="p-4 sm:p-5 space-y-3.5">
                    {/* Top Remarriage Special Strip */}
                    <div className="flex flex-wrap items-center justify-between gap-1.5 pb-2.5 border-b border-slate-100">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[10.5px] font-black px-2.5 py-0.5 rounded-full border ${maritalBadge.bg}`}>
                          {maritalBadge.label}
                        </span>

                        {children && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200">
                            👶 {children === "None" ? (te ? "పిల్లలు లేరు" : "No children") : children}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[9.5px] font-black px-2 py-0.5 rounded-full bg-navy text-white whitespace-nowrap">
                          🏛️ {stateFullName(row.state, te)}
                        </span>
                        <span className="text-[11px] font-mono font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-lg">
                          ID: {row.tsap_id}
                        </span>
                      </div>
                    </div>

                    {/* Profile Avatar & Details */}
                    <div className="flex items-start gap-4">
                      {/* Photo Container */}
                      <div className="relative shrink-0">
                        {photo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={photo}
                            alt={row.full_name || (te ? "సభ్యుడి ప్రొఫైల్ ఫోటో" : "Member profile photo")}
                            className="w-20 h-24 rounded-2xl object-cover border border-gold/40 shadow-sm"
                          />
                        ) : (
                          <div className="w-20 h-24 rounded-2xl bg-amber-50 border border-gold/30 flex flex-col items-center justify-center text-3xl shadow-inner text-maroon">
                            <span>{row.gender === "Groom" || row.gender === "Male" ? "🤵" : "👰"}</span>
                            <span className="text-[9px] font-bold mt-1 text-slate-500">🔒 {te ? "ఫోటో చూపబడలేదు" : "Photo not shown"}</span>
                          </div>
                        )}
                        {(row.phone_verified || row.photo_verified || row.id_verified) && (
                          <div className="absolute -bottom-2 -right-1 flex max-w-[calc(100%-8px)] flex-wrap justify-end gap-1">
                            {row.phone_verified && <span title={te ? "OTP ఈ ఫోన్ నంబర్‌కు ప్రాప్యతను మాత్రమే నిర్ధారిస్తుంది" : "OTP confirms access to this phone number only"} className="rounded bg-sky-700 px-1 py-0.5 text-[8px] text-white shadow">Phone OTP</span>}
                            {row.photo_verified && <span title={te ? "ఫోటో సమీక్ష నమోదు; ఇది గుర్తింపు లేదా ఇతర వివరాల ధృవీకరణ కాదు" : "Photo review recorded; not an identity or profile-details guarantee"} className="rounded bg-emerald-700 px-1 py-0.5 text-[8px] text-white shadow">{te ? "ఫోటో సమీక్ష" : "Photo reviewed"}</span>}
                            {row.id_verified && <span title={te ? "ప్రభుత్వ గుర్తింపు పత్ర సమీక్ష నమోదు; ఇతర వివరాలు నిర్ధారించబడవు" : "Government ID review recorded; other profile details are not verified"} className="rounded bg-blue-700 px-1 py-0.5 text-[8px] text-white shadow">{te ? "ID సమీక్ష" : "ID reviewed"}</span>}
                          </div>
                        )}
                      </div>

                      {/* Bio Meta */}
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-1">
                          {/* 📱💻 FIX: min-w-0 lekapothe peru (name) phone/laptop lo truncate
                              avvakunda push ayyi kanipinchakunda (missing) potundi */}
                          <Link
                            href={`/search/${row.tsap_id}`}
                            className="min-w-0 flex-1 break-words font-black text-base text-navy hover:text-maroon"
                          >
                            {row.full_name || row.tsap_id}
                          </Link>

                          <button
                            onClick={() => toggleSave(row.tsap_id)}
                            className={`shrink-0 p-1.5 rounded-full transition ${
                              isSaved ? "text-rose-600 bg-rose-50" : "text-slate-400 hover:text-rose-500"
                            }`}
                            title={isSaved ? (te ? "సేవ్ చేయబడింది" : "Saved") : (te ? "ఎంపికల జాబితా" : "Shortlist")}
                          >
                            {isSaved ? "❤️" : "🤍"}
                          </button>
                        </div>

                        {(caste || subCaste || row.age || height) && <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 break-words text-xs font-bold text-maroon">
                          {caste && <span>💍 {caste}</span>}
                          {subCaste && <span className="text-slate-500">({subCaste})</span>}
                          {row.age && <span>🎂 {row.age} {te ? "సం." : "years"}</span>}
                          {height && <span>{height}</span>}
                        </p>}

                        {(education || job || company) && <p className="break-words text-xs font-medium leading-relaxed text-slate-800">
                          {[education, job, company].filter(Boolean).join(" • ")}
                        </p>}

                        {(district || row.state || salary) && <p className="break-words text-[11.5px] leading-relaxed text-slate-500">
                          {[district ? `📍 ${district}` : "", row.state ? stateFullName(row.state, te) : "", salary ? `💰 ${salary}` : ""].filter(Boolean).join(" • ")}
                        </p>}

                        <div className="break-words text-[11px] text-slate-500 pt-0.5">
                          🔒 {te ? "సంప్రదింపు వివరాలు బహిరంగంగా చూపించబడవు" : "Contact details are protected"}
                        </div>
                      </div>
                    </div>

                    {/* About Quote */}
                    {about && (
                      <div className="bg-amber-50/50 p-2.5 rounded-2xl border border-gold/20 text-xs text-slate-700 italic leading-relaxed">
                        &quot;{about}&quot;
                      </div>
                    )}

                    {/* Horoscope Tags */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {star && (
                          <span className="bg-amber-100 text-amber-900 font-bold px-2.5 py-0.5 rounded-full text-[10.5px]">
                            ⭐ {star}
                          </span>
                        )}
                        {rasi && (
                          <span className="bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded-full text-[10.5px]">
                            {rasi}
                          </span>
                        )}
                        {gothram && (
                          <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[10.5px]">
                            {te ? "గోత్రం" : "Gothram"}: {gothram}
                          </span>
                        )}
                      </div>

                    </div>
                  </div>

                  {/* Action Buttons Footer */}
                  <div className="bg-slate-50 p-3 px-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    <Link
                      href={`/search/${row.tsap_id}`}
                      className="flex-1 min-w-[90px] text-center py-2.5 px-3 rounded-xl border border-maroon/30 text-maroon bg-white hover:bg-cream text-xs font-bold transition shadow-xs"
                    >
                      👁️ {te ? "పూర్తి వివరాలు" : "View Profile"}
                    </Link>

                    {SITE_CONFIG.supportWhatsapp ? (
                      <a
                        href={whatsappPhoneLink(SITE_CONFIG.supportWhatsapp, te ? `నమస్కారం, ${row.tsap_id} జాబితా గురించి నాకు ప్రశ్న ఉంది.` : `Hello, I have a question about listing ${row.tsap_id}.`) || undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 min-w-[130px] text-center py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#128C4A] to-[#20bd5a] text-white text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5"
                        title={te ? "బాహ్య WhatsApp లింక్; లభ్యత తనిఖీ చేయబడదు" : "External WhatsApp link; availability is not checked"}
                      >
                        <span>💬</span>
                        <span>{te ? "జాబితా గురించి అడగండి" : "Ask about listing"}</span>
                      </a>
                    ) : null}

                    <Link
                      href={`/biodata?id=${row.tsap_id}&remarriage=true`}
                      className="text-center py-2.5 px-3 rounded-xl border border-gold/40 text-amber-900 bg-amber-50 hover:bg-amber-100 text-xs font-bold transition"
                      title="Generate Remarriage Biodata"
                    >
                      🎴 {te ? "బయోడేటా రూపొందించండి" : "Create biodata"}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ================= COUNSELING & FAQ SECTION ================= */}
        <div className="grid md:grid-cols-2 gap-6 pt-6">
          {/* Service contact: only use an explicitly configured WhatsApp destination. */}
          <div className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-amber-50 p-6 card-shadow space-y-4">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-[#128C4A] to-[#20bd5a] text-2xl text-white shadow-md">
                💬
              </div>
              <div>
                <h3 className="font-black text-base text-maroon">
                  {te ? "పునర్వివాహ సంబంధాల గురించి ప్రశ్నలున్నాయా?" : "Questions about remarriage listings?"}
                </h3>
                <p className="text-xs text-slate-600">
                  {te ? "ఇక్కడి వివరాలను సభ్యులు అందించారు; నిర్ణయం తీసుకునే ముందు స్వతంత్రంగా నిర్ధారించండి." : "Listings are member-submitted; verify details independently before making decisions."}
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              {te
                ? "సంభాషణను కొనసాగించాలా వద్దా మీరే నిర్ణయించండి. యజమాని అంగీకారం తర్వాత అంగీకరించిన అభ్యర్థనల ఖాతా వీక్షణల్లో సంప్రదింపు వివరాలు కనిపిస్తాయి. అమలులో ఉన్న WhatsApp నోటిఫికేషన్‌లో అవి ఉండవచ్చు; పంపిణీ లేదా చదివిన స్థితి నిర్ధారించబడదు."
                : "Choose whether to continue the conversation. Owner acceptance grants contact access in account views; a configured WhatsApp notification may include the details, but delivery/read status is not confirmed."}
            </p>
            {SITE_CONFIG.supportWhatsapp ? (
              <a
                href={whatsappPhoneLink(SITE_CONFIG.supportWhatsapp, te ? "నమస్కారం, పునర్వివాహ సంబంధాల జాబితా గురించి నాకు ప్రశ్న ఉంది." : "Hello, I have a question about the remarriage listings.") || undefined}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-[#128C4A] to-[#20bd5a] px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:brightness-105"
              >
                💬 {te ? "WhatsApp సహాయాన్ని తెరవండి" : "Open WhatsApp support"}
              </a>
            ) : (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900" role="status">
                {te ? "ఈ సేవకు WhatsApp సహాయ సంప్రదింపు ఇంకా అమర్చబడలేదు." : "A WhatsApp support contact is not configured for this deployment."}
              </p>
            )}
          </div>

          {/* Remarriage Guiding Principles */}
          <div className="bg-white rounded-3xl p-6 border border-gold/30 card-shadow space-y-3.5">
            <h3 className="font-black text-base text-navy flex items-center gap-2">
              <span>🪔</span>
              <span>{te ? "పునర్వివాహంలో ముఖ్యమైన సూత్రాలు" : "Guiding Principles for Remarriage"}</span>
            </h3>

            <ul className="space-y-2.5 text-xs text-slate-700">
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 font-bold">✓</span>
                <span><b>{te ? "పరస్పర పారదర్శకత:" : "Mutual transparency:"}</b> {te ? "గత వివాహం, ప్రస్తుత చట్టపరమైన స్థితి మరియు ఆర్థిక విషయాల గురించి స్పష్టంగా మాట్లాడండి." : "Discuss the previous marriage, current legal status, and finances openly."}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 font-bold">✓</span>
                <span><b>{te ? "పిల్లల శ్రేయస్సు:" : "Children’s wellbeing:"}</b> {te ? "పిల్లలు ఉంటే, వారి అవసరాలు మరియు బాధ్యతల గురించి జాగ్రత్తగా చర్చించండి." : "If children are involved, discuss their needs and responsibilities with care."}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 font-bold">✓</span>
                <span><b>{te ? "కుటుంబ సంభాషణ:" : "Family communication:"}</b> {te ? "ఇరు కుటుంబాల సరిహద్దులు, గౌరవం మరియు ఆచారాల గురించి పరస్పరం మాట్లాడండి." : "Discuss boundaries, respect, and traditions with both families."}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 font-bold">✓</span>
                <span><b>{te ? "గోప్యత మరియు గౌరవం:" : "Privacy and respect:"}</b> {te ? "అనవసరమైన ప్రశ్నలు అడగకుండా, పరస్పర గౌరవంతో ముందుకు సాగండి." : "Avoid intrusive questions and share information with mutual respect."}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
