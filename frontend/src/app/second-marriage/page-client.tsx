"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiGet } from "@/lib/api";
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

export default function SecondMarriagePage() {
  const { lang } = useLang();
  const te = lang === "te";

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
        const filtered = rows.filter((p) =>
          p.marital_status &&
          !["pelli kaledu", "never married", "unmarried", "single"].includes(p.marital_status.toLowerCase().trim())
        );
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
      if (maritalFilter) {
        const m = (p.marital_status || "").toLowerCase();
        if (maritalFilter === "Divorced" && !m.includes("divorc") && !m.includes("విడాకు")) return false;
        if (maritalFilter === "Widow" && !m.includes("widow") && !m.includes("వితంతు") && !m.includes("విధురు")) return false;
        if (maritalFilter === "Awaiting Divorce" && !m.includes("await") && !m.includes("నిరీక్షణ")) return false;
      }

      // Children filter
      if (childrenFilter) {
        const c = (p.children || "None").toLowerCase().trim();
        const hasNoChild = c === "none" || c === "0" || c === "" || c.includes("లేరు");
        if (childrenFilter === "None" && !hasNoChild) return false;
        if (childrenFilter === "with_children" && hasNoChild) return false;
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
    const s = (status || "").toLowerCase();
    if (s.includes("divorc") || s.includes("విడాకు")) {
      return { label: "🕊️ విడాకులు (Divorced)", bg: "bg-rose-50 text-rose-800 border-rose-200" };
    }
    if (s.includes("widow") || s.includes("వితంతు") || s.includes("విధురు")) {
      const isGroom = genderStr === "Groom" || genderStr === "Male";
      return {
        label: isGroom ? "🕊️ విధురుడు (Widower)" : "🕊️ వితంతువు (Widow)",
        bg: "bg-purple-50 text-purple-800 border-purple-200",
      };
    }
    if (s.includes("await") || s.includes("నిరీక్షణ")) {
      return { label: "⏳ విడాకుల నిరీక్షణ (Awaiting Divorce)", bg: "bg-amber-50 text-amber-800 border-amber-200" };
    }
    return { label: "💍 పునర్వివాహం (Second Marriage)", bg: "bg-amber-50 text-maroon border-gold/40" };
  };

  return (
    <div className="min-h-dvh bg-[#FFFDF9] pb-20">
      {/* ================= HERO HEADER ================= */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#4A0518] via-[#660B25] to-[#8C1438] text-white py-12 px-4 border-b-4 border-gold">
        {/* Decorative Background Circles */}
        <div className="absolute -right-16 -top-16 w-80 h-80 rounded-full bg-gold/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-80 h-80 rounded-full bg-rose-500/10 blur-3xl pointer-events-none" />

        <div className="max-w-6xl mx-auto relative z-10 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gold/20 border border-gold/40 text-amber-200 text-xs font-black tracking-wide uppercase shadow-sm">
            <span>💍</span>
            <span>మన వివాహ • పునర్వివాహ ప్రత్యేక వేదిక</span>
          </div>

          <h1 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight telugu text-white">
            మరుజన్మ వంటి కొత్త జీవితానికి... <br className="hidden sm:inline" />
            <span className="text-amber-300">గౌరవప్రదమైన తోడు</span>
          </h1>

          <p className="max-w-3xl mx-auto text-xs sm:text-sm md:text-base text-rose-100/90 leading-relaxed font-medium">
            {te
              ? "విడాకులు పొందినవారు మరియు వితంతువుల కోసం ప్రత్యేక తెలుగు మ్యాట్రిమోనీ వేదిక. సభ్యులు ఇచ్చిన వివరాలను స్వయంగా పరిశీలించండి; privacy settings profile ను బట్టి మారవచ్చు."
              : "A dedicated Telugu matrimony directory for divorced and widowed members. Profiles are member-submitted; verify details independently and review each profile’s privacy settings."}
          </p>

          {/* Recorded profile information and privacy notes */}
          <div className="pt-4 grid grid-cols-2 md:grid-cols-4 gap-2.5 max-w-4xl mx-auto text-left">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15 flex items-center gap-2.5">
              <span className="text-2xl">🔒</span>
              <div>
                <div className="text-xs font-black text-amber-200">Privacy controls</div>
                <div className="text-[10px] text-rose-100">Photo setting is optional; phone masked publicly</div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15 flex items-center gap-2.5">
              <span className="text-2xl">⚖️</span>
              <div>
                <div className="text-xs font-black text-amber-200">Marital status details</div>
                <div className="text-[10px] text-rose-100">Member-provided; ask for documents</div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15 flex items-center gap-2.5">
              <span className="text-2xl">👶</span>
              <div>
                <div className="text-xs font-black text-amber-200">Children’s details</div>
                <div className="text-[10px] text-rose-100">Member-provided information</div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15 flex items-center gap-2.5">
              <span className="text-2xl">👩‍💼</span>
              <div>
                <div className="text-xs font-black text-amber-200">Consent-led contact</div>
                <div className="text-[10px] text-rose-100">Contact details follow acceptance and privacy settings</div>
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
              <span>పునర్వివాహ ఉచిత నమోదు (Register Free)</span>
            </Link>

            {SITE_CONFIG.supportWhatsapp ? (
              <a
                href={whatsappPhoneLink(SITE_CONFIG.supportWhatsapp, "Hello, I have a question about the remarriage listings.") || undefined}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-3 rounded-2xl bg-gradient-to-r from-[#128C4A] to-[#20bd5a] text-white font-bold text-xs sm:text-sm shadow-md transition hover:brightness-105 flex items-center gap-2"
                title={te ? "WhatsApp బాహ్య సేవ; లభ్యతను ఈ సైట్ తనిఖీ చేయదు" : "External WhatsApp link; availability is not checked by this site"}
              >
                <span>💬</span>
                <span>{te ? "WhatsApp support" : "WhatsApp support"}</span>
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
            { id: "all", l: "🌟 అందరూ (All Remarriage)", icon: "💍" },
            { id: "brides", l: "👰 వధువులు (Brides)", icon: "👰" },
            { id: "grooms", l: "🤵 వరులు (Grooms)", icon: "🤵" },
            { id: "no_children", l: "🕊️ పిల్లలు లేనివారు (No Children)", icon: "🕊️" },
            { id: "with_children", l: "👶 పిల్లలు ఉన్నవారు (With Children)", icon: "👶" },
            { id: "divorced", l: "⚖️ విడాకులు (Divorced)", icon: "⚖️" },
            { id: "widow", l: "🌸 వితంతువు / విధురుడు", icon: "🌸" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`whitespace-nowrap px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 border ${
                activeTab === tab.id
                  ? "bg-maroon text-white border-maroon shadow-md"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.l}</span>
            </button>
          ))}
        </div>

        {/* Detailed Search & Filter Bar */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-gold/30 card-shadow space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {/* Search Input */}
            <div>
              <label className="block text-[11px] font-extrabold text-slate-700 mb-1">
                🔍 {te ? "వెతకండి (Search Name/ID/Job)" : "Search keyword / ID"}
              </label>
              <input
                type="text"
                placeholder={te ? "ఉదా: MV2001, Software, Reddy..." : "e.g. MV2001, Doctor, Kamma..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-maroon"
              />
            </div>

            {/* Caste Selection */}
            <div>
              <label className="block text-[11px] font-extrabold text-slate-700 mb-1">
                💍 {te ? "కులం (Caste)" : "Caste"}
              </label>
              <select
                value={selectedCaste}
                onChange={(e) => setSelectedCaste(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-maroon"
              >
                <option value="">{te ? "అన్ని కులాలు (All Castes)" : "All Castes"}</option>
                {CASTES.map((c) => (
                  <option key={c} value={c}>
                    {CASTE_TELUGU[c] ? `${CASTE_TELUGU[c]} (${c})` : c}
                  </option>
                ))}
              </select>
            </div>

            {/* District Selection */}
            <div>
              <label className="block text-[11px] font-extrabold text-slate-700 mb-1">
                📍 {te ? "జిల్లా / నగరం (District / City)" : "District / Location"}
              </label>
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-maroon"
              >
                <option value="">{te ? "అన్ని జిల్లాలు (All Districts)" : "All Districts (TS/AP/NRI)"}</option>
                {ALL_DISTRICTS.map((d) => (
                  <option key={d} value={d}>
                    {DISTRICT_TELUGU[d] ? `${DISTRICT_TELUGU[d]} (${d})` : d}
                  </option>
                ))}
              </select>
            </div>

            {/* Age Range Filter */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[11px] font-extrabold text-slate-700">
                  🎂 {te ? "గరిష్ట వయసు (Max Age)" : "Max Age"}
                </label>
                <span className="text-xs font-black text-maroon">{ageMax} yrs</span>
              </div>
              <input
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
              <span>{te ? "లభించిన పునర్వివాహ సంబంధాలు:" : "Matching Remarriage Profiles:"} </span>
              <span className="text-maroon font-black text-sm">{filteredProfiles.length}</span>
            </div>

            {(gender || maritalFilter || childrenFilter || selectedCaste || selectedDistrict || ageMax < 55 || searchQuery) && (
              <button
                onClick={resetAllFilters}
                className="text-[11px] text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1"
              >
                <span>✕</span>
                <span>{te ? "ఫిల్టర్లు రీసెట్ చేయండి (Reset All)" : "Reset Filters"}</span>
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
                ? (te ? "ప్రస్తుతం ప్రచురించిన పునర్వివాహ profiles లేవు" : "No published second-marriage profiles are currently available")
                : (te ? "మీరు ఎంచుకున్న ఫిల్టర్లతో సంబంధాలు కనిపించలేదు" : "No profiles found matching selected filters")}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {profiles.length === 0
                ? (te ? "నమూనా లేదా కల్పిత profiles చూపించము. తర్వాత మళ్లీ చూడండి." : "We do not substitute sample profiles. Please check again later.")
                : (te ? "ఫిల్టర్లను కాస్త సడలించి మళ్లీ ప్రయత్నించండి." : "Try broadening your filters.")}
            </p>
            <button
              onClick={resetAllFilters}
              className="px-6 py-2.5 rounded-xl maroon-gradient text-white font-bold text-xs shadow-md"
            >
              {te ? "ఫిల్టర్లు రీసెట్ చేయండి" : "Reset All Filters"}
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-5">
            {filteredProfiles.map((row) => {
              const photo = row.photo_url || (Array.isArray(row.photo_urls) && row.photo_urls[0]) || "";
              const maritalBadge = getMaritalBadge(row.marital_status, row.gender);
              const isSaved = savedIds.includes(row.tsap_id);

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

                        {row.children && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200">
                            👶 {row.children === "None" ? "పిల్లలు లేరు (No Children)" : row.children}
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
                            alt={row.full_name}
                            className="w-20 h-24 rounded-2xl object-cover border border-gold/40 shadow-sm"
                          />
                        ) : (
                          <div className="w-20 h-24 rounded-2xl bg-amber-50 border border-gold/30 flex flex-col items-center justify-center text-3xl shadow-inner text-maroon">
                            <span>{row.gender === "Groom" || row.gender === "Male" ? "🤵" : "👰"}</span>
                            <span className="text-[9px] font-bold mt-1 text-slate-500">🔒 Photo Lock</span>
                          </div>
                        )}
                        {(row.phone_verified || row.photo_verified || row.id_verified) && (
                          <div className="absolute -bottom-2 -right-1 flex max-w-[calc(100%-8px)] flex-wrap justify-end gap-1">
                            {row.phone_verified && <span title={te ? "OTP ఈ phone number వినియోగాన్ని మాత్రమే నిర్ధారిస్తుంది" : "OTP confirms access to this phone number only"} className="rounded bg-sky-700 px-1 py-0.5 text-[8px] text-white shadow">Phone OTP</span>}
                            {row.photo_verified && <span title={te ? "Photo review నమోదు; identity లేదా ఇతర వివరాల హామీ కాదు" : "Photo review recorded; not an identity or profile-details guarantee"} className="rounded bg-emerald-700 px-1 py-0.5 text-[8px] text-white shadow">{te ? "ఫోటో సమీక్ష" : "Photo reviewed"}</span>}
                            {row.id_verified && <span title={te ? "ప్రభుత్వ ID సమీక్ష నమోదు; ఇతర వివరాలు నిర్ధారించబడవు" : "Government ID review recorded; other profile details are not verified"} className="rounded bg-blue-700 px-1 py-0.5 text-[8px] text-white shadow">{te ? "ID సమీక్ష" : "ID reviewed"}</span>}
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
                            title={isSaved ? "Saved" : "Shortlist"}
                          >
                            {isSaved ? "❤️" : "🤍"}
                          </button>
                        </div>

                        {(row.caste || row.sub_caste || row.age || row.height) && <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 break-words text-xs font-bold text-maroon">
                          {row.caste && <span>💍 {row.caste}</span>}
                          {row.sub_caste && <span className="text-slate-500">({row.sub_caste})</span>}
                          {row.age && <span>🎂 {row.age} yrs</span>}
                          {row.height && <span>{row.height}</span>}
                        </p>}

                        {(row.education || row.job || row.company) && <p className="break-words text-xs font-medium leading-relaxed text-slate-800">
                          {[row.education, row.job, row.company].filter(Boolean).join(" • ")}
                        </p>}

                        {(row.district || row.state || row.salary) && <p className="break-words text-[11.5px] leading-relaxed text-slate-500">
                          {[row.district ? `📍 ${row.district}` : "", row.state || "", row.salary ? `💰 ${row.salary}` : ""].filter(Boolean).join(" • ")}
                        </p>}

                        <div className="break-words text-[11px] text-slate-500 pt-0.5">
                          🔒 {te ? "సంప్రదింపు వివరాలు గోప్యంగా ఉంచబడ్డాయి" : "Contact details are protected"}
                        </div>
                      </div>
                    </div>

                    {/* About Quote */}
                    {row.about_myself && (
                      <div className="bg-amber-50/50 p-2.5 rounded-2xl border border-gold/20 text-xs text-slate-700 italic leading-relaxed">
                        &quot;{row.about_myself}&quot;
                      </div>
                    )}

                    {/* Horoscope Tags */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {row.star && (
                          <span className="bg-amber-100 text-amber-900 font-bold px-2.5 py-0.5 rounded-full text-[10.5px]">
                            ⭐ {row.star}
                          </span>
                        )}
                        {row.rasi && (
                          <span className="bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded-full text-[10.5px]">
                            {row.rasi}
                          </span>
                        )}
                        {row.gothram && (
                          <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[10.5px]">
                            గోత్రం: {row.gothram}
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
                        href={whatsappPhoneLink(SITE_CONFIG.supportWhatsapp, `Hello, I have a question about listing ${row.tsap_id}.`) || undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 min-w-[130px] text-center py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#128C4A] to-[#20bd5a] text-white text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5"
                        title={te ? "బాహ్య WhatsApp లింక్; లభ్యత తనిఖీ చేయబడదు" : "External WhatsApp link; availability is not checked"}
                      >
                        <span>💬</span>
                        <span>{te ? "లిస్టింగ్ గురించి అడగండి" : "Ask about listing"}</span>
                      </a>
                    ) : null}

                    <Link
                      href={`/biodata?id=${row.tsap_id}&remarriage=true`}
                      className="text-center py-2.5 px-3 rounded-xl border border-gold/40 text-amber-900 bg-amber-50 hover:bg-amber-100 text-xs font-bold transition"
                      title="Generate Remarriage Biodata"
                    >
                      🎴 బయోడేటా
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
                  {te ? "పునర్వివాహ listings గురించి ప్రశ్నలున్నాయా?" : "Questions about remarriage listings?"}
                </h3>
                <p className="text-xs text-slate-600">
                  {te ? "ఇక్కడి వివరాలు సభ్యులు అందించినవి; నిర్ణయానికి ముందు స్వతంత్రంగా నిర్ధారించండి." : "Listings are member-submitted; verify details independently before making decisions."}
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              {te
                ? "అంగీకారం మరియు privacy settings అనుమతించినప్పుడు మాత్రమే contact వివరాలు పంచుకోండి. WhatsApp link అందుబాటులో ఉంటే అది బాహ్య సేవను తెరుస్తుంది; delivery లేదా availability హామీ కాదు."
                : "Share contact details only with consent and subject to privacy settings. A configured WhatsApp link opens an external service; delivery and availability are not guaranteed."}
            </p>
            {SITE_CONFIG.supportWhatsapp ? (
              <a
                href={whatsappPhoneLink(SITE_CONFIG.supportWhatsapp, "Hello, I have a question about the remarriage listings.") || undefined}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-[#128C4A] to-[#20bd5a] px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:brightness-105"
              >
                💬 {te ? "WhatsApp support తెరవండి" : "Open WhatsApp support"}
              </a>
            ) : (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900" role="status">
                {te ? "ఈ deployment లో WhatsApp support contact configure కాలేదు." : "A WhatsApp support contact is not configured for this deployment."}
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
                <span>
                  <b>పరస్పర పారదర్శకత:</b> గత వివాహ వివరాలు, లీగల్ స్టేటస్ మరియు ఆర్థిక విషయాలపై ముందే స్పష్టత ఉండాలి.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 font-bold">✓</span>
                <span>
                  <b>పిల్లల భవిష్యత్తు:</b> పిల్లలు ఉన్నట్లయితే వారి మానసిక స్థైర్యం మరియు బాధ్యతలపై సమాన ప్రాధాన్యత.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 font-bold">✓</span>
                <span>
                  <b>కుటుంబ ఆమోదం:</b> ఇరువైపులా కుటుంబ సభ్యుల పరస్పర గౌరవం మరియు సంప్రదాయాల సమన్వయం.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 font-bold">✓</span>
                <span>
                  <b>గోప్యతా హక్కు:</b> అనవసరమైన విచారణలు లేకుండా పరస్పర గౌరవంతో సంబంధాన్ని ముందుకు తీసుకెళ్లడం.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
