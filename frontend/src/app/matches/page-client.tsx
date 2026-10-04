"use client";

/**
 * 👑 MANA VIVAHA — FLIPKART/AMAZON GRADE ADVANCED MULTI-SELECT MATCHES (V5)
 * =========================================================================
 * • Multi-select faceted filtering (Castes, Sub-castes, Districts, Educations, Jobs, Nakshatras, Marital, Dosham)
 * • Instant search inside Castes and Districts checklists (Telugu & English)
 * • Dynamic Sub-castes generator based on selected Castes
 * • Dual Age & Height Range sliders, Salary quick chips
 * • Mobile Flipkart/Myntra style bottom-sheet filter drawer with category tabs
 * • Active filter chips with instant [x] dismiss and Clear All
 * • Member-entered profile details with no synthetic compatibility percentage
 * • Consent-gated contact flow; support destinations appear only when configured
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  CASTES,
  CASTE_SUBCASTES,
  CASTE_TELUGU,
  DISTRICTS_BY_STATE,
  DISTRICT_TELUGU,
  EDUCATIONS,
  EDUCATION_TELUGU,
  HEIGHTS,
  JOBS,
  MARITAL_STATUSES,
  NAKSHATRAS,
  RASIS,
  RELIGIONS,
  SALARIES,
  TS_DISTRICTS,
  AP_DISTRICTS,
  WORK_TYPES,
  heightLabel,
  stateFullName,
  isSecondMarriageStatus,
  secondMarriageLabel,
  sortUniqueOptions,
} from "@/lib/telugu-data";
import { SITE_CONFIG } from "@/lib/site-config";
import QuickLead from "@/components/QuickLead";
import AuthGate from "@/components/AuthGate";
import { apiGet, apiPost, getToken, authHeaders } from "@/lib/api";
import { firstName } from "@/lib/names";
import TopPicks from "@/components/TopPicks";
import { Duo, duo } from "@/lib/duo";
import { useLang } from "@/lib/lang";
import ProfileRail from "@/components/ProfileRail";
import DistrictAdBanner from "@/components/DistrictAdBanner";
import QuickUnlockModal from "@/components/QuickUnlockModal";
import WhatsAppProposalModal from "@/components/WhatsAppProposalModal";

type Row = Record<string, any>;
const SAVED_SEARCHES_KEY = "tsap_saved_searches_v5";

const SORTS = [
  { v: "new", l: "🆕 Recently added", lTe: "🆕 ఇటీవల జోడించినవి" },
  { v: "age", l: "🎂 Age (low to high)", lTe: "🎂 వయసు (తక్కువ నుండి)" },
  { v: "boosted", l: "📣 Promoted", lTe: "📣 ప్రమోట్ చేసినవి" },
];

const DEFAULT_FILTERS: Row = {
  gender: "",
  q: "",
  caste: "",
  sub_caste: "",
  district: "",
  state: "",
  job: "",
  education: "",
  salary_min: 0,
  salary_max: 0,
  marital_status: "",
  children: "",
  religion: "",
  age_min: 18,
  age_max: 60,
  star: "",
  rasi: "",
  dosham: "",
  verified_only: false,
  photo_only: false,
  nri_only: false,
  height_min: "",
  height_max: "",
};

const ALL_DISTRICTS_COMBINED = sortUniqueOptions([
  ...TS_DISTRICTS,
  ...AP_DISTRICTS,
  ...(DISTRICTS_BY_STATE.Other || []),
  "USA / NRI",
  "Other",
]);

// 🏛️💍 state full-name (Telangana/Andhra Pradesh) badge + second-marriage-only
// badge helpers ippudu @/lib/telugu-data lo shared (matches + second-marriage +
// search/profile pages anni consistent ga fix avvadaniki).
const stateLabel = (stateRaw: string | undefined | null, te: boolean) => stateFullName(stateRaw, te);
const isSecondMarriage = isSecondMarriageStatus;

export default function MatchesPage() {
  const { lang } = useLang();
  const te = lang === "te";
  const unlockBot = (id: string) => SITE_CONFIG.unlockBot(id);

  const [filters, setFilters] = useState<Row>(DEFAULT_FILTERS);
  const [sort, setSort] = useState<string>("new");
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [requestError, setRequestError] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [myTsapId, setMyTsapId] = useState<string>("");
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [sheet, setSheet] = useState<boolean>(false);
  const [unlockTarget, setUnlockTarget] = useState<Row | null>(null);
  const [proposalTarget, setProposalTarget] = useState<Row | null>(null);

  // In-filter search state
  const [casteSearch, setCasteSearch] = useState("");
  const [districtSearch, setDistrictSearch] = useState("");
  const [mobileFilterTab, setMobileFilterTab] = useState<"basic" | "caste" | "location" | "career" | "astro">("basic");

  const reqId = useRef(0);

  // Read URL query params on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    const initial: Row = { ...DEFAULT_FILTERS };
    sp.forEach((v, k) => {
      if (k === "age_min" || k === "age_max" || k === "salary_min") {
        initial[k] = parseInt(v) || initial[k];
      } else if (k === "verified_only" || k === "photo_only" || k === "nri_only") {
        initial[k] = v === "true";
      } else {
        initial[k] = v;
      }
    });
    setFilters(initial);
  }, []);

  const [prefLoading, setPrefLoading] = useState(false);
  const [prefApplied, setPrefApplied] = useState(false);

  const applySavedPreferences = async () => {
    try {
      const myId = typeof window !== "undefined" ? (localStorage.getItem("tsap_id") || localStorage.getItem("tsap_last_id") || "") : "";
      if (!myId) {
        alert("మీరు మీ ప్రిఫరెన్సెస్ లోడ్ చేయడానికి ముందుగా లాగిన్ అవ్వండి లేదా రిజిస్టర్ అవ్వండి.");
        return;
      }
      setPrefLoading(true);
      // 🛡️ P0 security fix: /api/profile/preferences now requires the owner's token.
      const res = await fetch(`/api/profile/preferences?tsap_id=${encodeURIComponent(myId)}`, { headers: authHeaders() });
      const data = await res.json();
      if (res.ok && data?.preferences) {
        const p = data.preferences;
        setFilters((prev) => ({
          ...prev,
          caste: p.caste_no_bar ? "" : (p.castes || []).join(","),
          sub_caste: (p.sub_castes || []).join(","),
          education: (p.educations || []).join(","),
          job: (p.jobs || []).join(","),
          district: (p.districts || []).join(","),
          age_min: p.age_min || 18,
          age_max: p.age_max || 60,
          marital_status: (p.marital_statuses || []).join(","),
        }));
        setPrefApplied(true);
      }
    } catch {
      /* ignore */
    } finally {
      setPrefLoading(false);
    }
  };

  const setF = (key: string, val: any) => {
    setFilters((prev) => ({ ...prev, [key]: val }));
  };

  const isMultiSelected = (field: string, val: string) => {
    const current = String(filters[field] || "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    return current.includes(val.trim().toLowerCase());
  };

  const toggleMulti = (field: string, val: string) => {
    const current = String(filters[field] || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const exists = current.some((x) => x.toLowerCase() === val.toLowerCase());
    let updated: string[];
    if (exists) {
      updated = current.filter((x) => x.toLowerCase() !== val.toLowerCase());
    } else {
      updated = [...current, val];
    }
    setF(field, updated.join(","));
  };

  // Subcastes based on selected castes
  const availableSubcastes = useMemo(() => {
    const selectedCastes = String(filters.caste || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!selectedCastes.length) return [];
    const subs: string[] = [];
    selectedCastes.forEach((c) => {
      const match = Object.keys(CASTE_SUBCASTES).find((k) => k.toLowerCase() === c.toLowerCase());
      if (match && CASTE_SUBCASTES[match]) {
        subs.push(...CASTE_SUBCASTES[match]);
      }
    });
    return sortUniqueOptions(subs);
  }, [filters.caste]);

  // Filtered Castes & Districts in Search List
  const filteredCastesList = useMemo(() => {
    if (!casteSearch) return CASTES;
    const q = casteSearch.trim().toLowerCase();
    return CASTES.filter((c) => c.toLowerCase().includes(q) || (CASTE_TELUGU[c] || "").toLowerCase().includes(q));
  }, [casteSearch]);

  const filteredDistrictsList = useMemo(() => {
    const base = filters.state ? DISTRICTS_BY_STATE[filters.state] || ALL_DISTRICTS_COMBINED : ALL_DISTRICTS_COMBINED;
    if (!districtSearch) return base;
    const q = districtSearch.trim().toLowerCase();
    return base.filter((d) => d.toLowerCase().includes(q) || (DISTRICT_TELUGU[d] || "").toLowerCase().includes(q));
  }, [filters.state, districtSearch]);

  const selectAllTS = () => {
    setF("state", "TS");
    setF("district", TS_DISTRICTS.join(","));
  };

  const selectAllAP = () => {
    setF("state", "AP");
    setF("district", AP_DISTRICTS.join(","));
  };

  // Active filter tags for chip bar
  const activeChips = useMemo(() => {
    const chips: { key: string; label: string; clear: () => void }[] = [];
    if (filters.gender) {
      chips.push({
        key: "gender",
        label: filters.gender === "Bride" ? (te ? "👰 వధువులు" : "👰 Brides") : (te ? "🤵 వరులు" : "🤵 Grooms"),
        clear: () => setF("gender", ""),
      });
    }
    if (filters.caste) {
      String(filters.caste)
        .split(",")
        .forEach((c) => {
          if (c.trim()) {
            chips.push({
              key: `caste_${c}`,
              label: `💍 ${CASTE_TELUGU[c.trim()] || c.trim()}`,
              clear: () => toggleMulti("caste", c.trim()),
            });
          }
        });
    }
    if (filters.sub_caste) {
      String(filters.sub_caste)
        .split(",")
        .forEach((sc) => {
          if (sc.trim()) {
            chips.push({
              key: `sub_${sc}`,
              label: `🪔 ${sc.trim()}`,
              clear: () => toggleMulti("sub_caste", sc.trim()),
            });
          }
        });
    }
    if (filters.district) {
      String(filters.district)
        .split(",")
        .forEach((d) => {
          if (d.trim()) {
            chips.push({
              key: `dist_${d}`,
              label: `📍 ${DISTRICT_TELUGU[d.trim()] || d.trim()}`,
              clear: () => toggleMulti("district", d.trim()),
            });
          }
        });
    }
    if (filters.state) {
      chips.push({
        key: "state",
        label: `🏛️ ${filters.state === "TS" ? "Telangana" : filters.state === "AP" ? "Andhra Pradesh" : "Other"}`,
        clear: () => setF("state", ""),
      });
    }
    if (filters.marital_status) {
      chips.push({
        key: "marital_status",
        label: `💍 ${filters.marital_status}`,
        clear: () => setF("marital_status", ""),
      });
    }
    if (filters.education) {
      String(filters.education)
        .split(",")
        .forEach((e) => {
          if (e.trim()) {
            chips.push({
              key: `edu_${e}`,
              label: `🎓 ${EDUCATION_TELUGU[e.trim()] || e.trim()}`,
              clear: () => toggleMulti("education", e.trim()),
            });
          }
        });
    }
    if (filters.job) {
      String(filters.job)
        .split(",")
        .forEach((j) => {
          if (j.trim()) {
            chips.push({
              key: `job_${j}`,
              label: `💼 ${j.trim()}`,
              clear: () => toggleMulti("job", j.trim()),
            });
          }
        });
    }
    if (filters.verified_only) {
      chips.push({
        key: "verified",
        label: te ? "తనిఖీ నమోదు చేసినవి" : "With a recorded check",
        clear: () => setF("verified_only", false),
      });
    }
    if (filters.photo_only) {
      chips.push({
        key: "photo",
        label: "📸 With Photo Only",
        clear: () => setF("photo_only", false),
      });
    }
    if (filters.nri_only) {
      chips.push({
        key: "nri",
        label: "🌍 NRI Only",
        clear: () => setF("nri_only", false),
      });
    }
    if (filters.age_min > 18 || filters.age_max < 60) {
      chips.push({
        key: "age",
        label: `🎂 ${filters.age_min} - ${filters.age_max} yrs`,
        clear: () => {
          setF("age_min", 18);
          setF("age_max", 60);
        },
      });
    }
    if (filters.salary_min > 0) {
      chips.push({
        key: "salary",
        label: `💰 ₹${filters.salary_min}L+`,
        clear: () => setF("salary_min", 0),
      });
    }
    return chips;
  }, [filters, te]);

  // Fetch matches from API
  const fetchMatches = useCallback(async () => {
    const curId = ++reqId.current;
    setLoading(true);
    setRequestError(false);
    try {
      const q = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== "" && v !== null && v !== undefined && v !== false && v !== 0) {
          q.set(k, String(v));
        }
      });
      q.set("sort", sort);
      q.set("limit", "100");

      const r = await fetch(`/api/search?${q.toString()}`, { headers: authHeaders() });
      if (!r.ok) throw new Error("Failed to fetch matches");
      const data = await r.json();
      const results = Array.isArray(data.results)
        ? data.results
        : Array.isArray(data.profiles)
          ? data.profiles
          : [];
      if (curId === reqId.current) {
        setRows(results);
        setTotal(typeof data.total === "number" ? data.total : results.length);
      }
    } catch {
      if (curId === reqId.current) {
        // Never substitute invented/demo profiles for real search results.
        setRows([]);
        setTotal(0);
        setRequestError(true);
      }
    }
    if (curId === reqId.current) setLoading(false);
  }, [filters, sort]);

  useEffect(() => {
    const t = setTimeout(fetchMatches, 300);
    return () => clearTimeout(t);
  }, [fetchMatches]);

  const clearAllFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  const toggleSave = (row: Row) => {
    const id = row.tsap_id;
    setSavedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const shareText = (row: Row) =>
    `🙏 ${SITE_CONFIG.brandName} profile — ${firstName(row.full_name)} (${row.tsap_id})\n` +
    `👉 ${row.age}y • ${row.caste} • ${row.education} • ${row.job}\n` +
    `📍 ${row.district}, ${stateFullName(row.state, te)} • 💰 ${row.salary}\n` +
    `Full details: ${SITE_CONFIG.siteUrl || "https://manavivaha.in"}/search/${row.tsap_id}`;

  const shareWhatsApp = (row: Row) => window.open(`https://wa.me/?text=${encodeURIComponent(shareText(row))}`, "_blank");

  /* ---------- Profile Card Component ---------- */
  const Card = ({ row }: { row: Row }) => {
    const isSaved = savedIds.includes(row.tsap_id);
    const photo = row.photo_url || (Array.isArray(row.photo_urls) && row.photo_urls[0]) || "";

    return (
      <div className="relative bg-white rounded-3xl border border-gold/30 shadow-sm hover:border-gold/60 hover:shadow-md transition overflow-hidden flex flex-col justify-between">
        {/* 🏛️ TOP-RIGHT BADGES: state (Telangana/Andhra Pradesh) neatga + 2nd Marriage (only if applicable) */}
        <div className="absolute top-2.5 right-2.5 z-10 flex flex-col items-end gap-1">
          <span className="text-[9.5px] font-black px-2 py-0.5 rounded-full bg-navy/90 text-white shadow-sm backdrop-blur-sm whitespace-nowrap">
            🏛️ {stateLabel(row.state, te)}
          </span>
          {isSecondMarriage(row.marital_status) && (
            <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-rose-600 text-white shadow-sm whitespace-nowrap">
              {te ? "💍 2వ వివాహం" : "💍 2nd Marriage"}
            </span>
          )}
        </div>
        <div className="p-4 sm:p-5 space-y-3.5">
          <div className="flex items-start gap-3.5">
            {/* Avatar / Photo */}
            <div className="relative shrink-0">
              {photo ? (
                <img src={photo} alt={firstName(row.full_name)} className="w-20 h-24 sm:w-24 sm:h-28 rounded-2xl object-cover border border-gold/40 shadow-xs" />
              ) : (
                <div className="w-20 h-24 sm:w-24 sm:h-28 rounded-2xl bg-amber-50/80 border border-gold/40 flex flex-col items-center justify-center text-3xl shadow-inner text-maroon">
                  <span>{row.gender === "Groom" || row.gender === "Male" ? "🤵" : row.gender === "Bride" || row.gender === "Female" ? "👰" : "💍"}</span>
                  <span className="text-[10px] font-bold mt-1 text-slate-500">🔒 Photo Lock</span>
                </div>
              )}
              {row.is_verified && (
                <span role="img" aria-label={te ? "ఒక verification check నమోదు చేయబడింది" : "A verification check is recorded"} className="absolute -bottom-1.5 -right-1 bg-emerald-600 text-white rounded-full p-1 shadow" title={te ? "నమోదైన తనిఖీ మాత్రమే; అన్ని profile వివరాలను ధృవీకరించదు" : "A recorded check only; it does not verify all profile details"}>
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </span>
              )}
            </div>

            {/* Meta & Badges */}
            {/* 📱💻 FIX: name "miss/cut" avvadam bug — Link ki min-w-0 lekapothe flex truncate
                pani cheyyadu (parent overflow ki compute avvakunda content pedda size teesukuntundi,
                phone lo ID/heart button push ayyi peru kanipinchakunda potundi). Ippudu peru eppudu
                neatga (…) tho truncate avuthundi, ID + heart eppudu kanipistayi (shrink-0). */}
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center justify-between gap-1 pr-16 sm:pr-20">
                <Link href={`/search/${row.tsap_id}`} className="min-w-0 flex-1 break-words font-extrabold text-sm sm:text-base text-navy hover:text-maroon flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                  <span className="break-words">{firstName(row.full_name) || row.tsap_id}</span>
                  <span className="break-all font-mono text-[10px] font-semibold text-slate-400">({row.tsap_id})</span>
                </Link>

                <button
                  onClick={() => toggleSave(row)}
                  className={`shrink-0 p-1.5 rounded-full transition ${isSaved ? "text-rose-600 bg-rose-50" : "text-slate-400 hover:text-rose-500"}`}
                  title={isSaved ? "Saved" : "Shortlist"}
                >
                  {isSaved ? "❤️" : "🤍"}
                </button>
              </div>

              {(row.caste || row.sub_caste || row.age || row.height) && (
                <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 break-words text-xs font-bold text-maroon">
                  {row.caste && <span>💍 {CASTE_TELUGU[row.caste] || row.caste}</span>}
                  {row.sub_caste && <span className="text-slate-500">({row.sub_caste})</span>}
                  {row.age && <span>🎂 {row.age} yrs</span>}
                  {row.height && <span>{row.height}</span>}
                </p>
              )}

              {/* 💍 Second Marriage detail (ONLY for genuine 2nd marriage profiles — 1st marriage
                  / Pelli Kaledu / Never Married ki idi ఎప్పుడూ కనిపించదు) */}
              {isSecondMarriage(row.marital_status) && (
                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200">
                    {secondMarriageLabel(row.marital_status, te)}
                  </span>
                  {row.children && row.children !== "None" && (
                    <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200">
                      👶 {row.children}
                    </span>
                  )}
                </div>
              )}

              {(row.education || row.job) && (
                <p className="break-words text-xs font-medium leading-relaxed text-slate-700">
                  {[row.education, row.job].filter(Boolean).join(" • ")}
                </p>
              )}

              {(row.district || row.state || row.salary) && (
                <p className="break-words text-[11.5px] leading-relaxed text-slate-500">
                  {[row.district ? `📍 ${DISTRICT_TELUGU[row.district] || row.district}` : "", row.state ? stateFullName(row.state, te) : "", row.salary ? `💰 ${row.salary}` : ""].filter(Boolean).join(" • ")}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-1.5 break-words pt-0.5 font-mono text-[11px] text-slate-500">
                <span>🔒 {te ? "నంబర్:" : "Contact:"}</span>
                <span className="rounded-lg bg-slate-100 px-2 py-0.5 font-bold text-slate-700">{row.phone_masked || (te ? "గోప్యంగా ఉంచబడింది" : "Hidden for privacy")}</span>
              </div>
            </div>
          </div>

          {/* Optional profile details: factual only, never a compatibility percentage */}
          <div className="border-t border-slate-100 pt-2 text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              {row.star && <span className="rounded-full border border-amber-300 bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-900">⭐ {row.star}</span>}
              {row.rasi && <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10.5px] font-semibold text-slate-700">{row.rasi}</span>}
            </div>
            {Array.isArray(row.observations) && row.observations.length > 0 ? (
              <div className="mt-2">
                <p className="text-[10px] font-bold text-slate-500">{te ? "రెండు profiles లో నమోదు చేసిన వివరాలు (స్వతంత్రంగా నిర్ధారించండి)" : "Details listed by both profiles (verify independently)"}</p>
                <ul className="mt-1 space-y-1 text-[11px] leading-5 text-slate-600">
                  {row.observations.slice(0, 3).map((item: string, i: number) => <li key={i}>• {item}</li>)}
                </ul>
              </div>
            ) : null}
            {Array.isArray(row.preference_checks) && row.preference_checks.length > 0 ? (
              <div className="mt-2 rounded-lg bg-slate-50 p-2">
                <p className="text-[10px] font-bold text-slate-500">{te ? "మీరు సేవ్ చేసిన preference checks (compatibility verdict కాదు)" : "Your saved preference checks (not a compatibility verdict)"}</p>
                <ul className="mt-1 space-y-1 text-[11px] leading-5 text-slate-600">
                  {row.preference_checks.slice(0, 2).map((item: any, i: number) => <li key={`${item.key}-${i}`}>• {item.note}</li>)}
                </ul>
              </div>
            ) : null}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-slate-50 p-3 px-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <Link
            href={`/search/${row.tsap_id}`}
            className="flex-1 min-w-[70px] text-center py-2.5 px-2 rounded-xl border border-maroon/30 text-maroon bg-white hover:bg-cream text-xs font-bold transition shadow-xs"
          >
            👁️ వివరాలు
          </Link>

          <Link
            href={`/biodata?id=${row.tsap_id}`}
            className="py-2.5 px-2.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-maroon text-xs font-black transition shadow-xs flex items-center justify-center shrink-0"
            title="HD కలర్ బయోడేటా డౌన్‌లోడ్"
          >
            🎴 బయోడేటా
          </Link>

          <button
            onClick={() => setUnlockTarget(row)}
            className="flex-1 min-w-[100px] text-center py-2.5 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md hover-lift transition"
          >
            📞 సంప్రదించండి
          </button>
          <a href={unlockBot(row.tsap_id)} target="_blank" rel="noreferrer" className="hidden" aria-hidden="true">
            Full details + Number
          </a>

          <button
            onClick={() => setProposalTarget(row)}
            className="w-10 h-10 rounded-xl bg-[#25D366] text-white flex items-center justify-center text-base hover:brightness-105 transition shadow-xs shrink-0"
            title="WhatsApp లో సంబంధం వివరాలు షేర్ చేయండి"
          >
            💬
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-dvh bg-[#FAF7F2] pb-24 sm:pb-28">
      {/* ---------- Sticky Top Quick-Pill Bar ---------- */}
      <div className="sticky top-16 z-30 bg-white/95 backdrop-blur-md border-b border-gold/25 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 py-2.5">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            {/* Quick Presets */}
            <button
              onClick={() => setF("verified_only", !filters.verified_only)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition flex items-center gap-1 border ${
                filters.verified_only ? "bg-emerald-600 text-white border-emerald-600 shadow-xs" : "bg-white text-slate-700 border-slate-200 hover:border-emerald-600"
              }`}
            >
              <span>👑</span>
              <span>{te ? "తనిఖీ నమోదు చేసినవి" : "Recorded check"}</span>
            </button>

            <button
              onClick={() => setF("photo_only", !filters.photo_only)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition flex items-center gap-1 border ${
                filters.photo_only ? "bg-amber-500 text-white border-amber-500 shadow-xs" : "bg-white text-slate-700 border-slate-200 hover:border-amber-500"
              }`}
            >
              <span>📸</span>
              <span>With Photo</span>
            </button>

            <button
              onClick={applySavedPreferences}
              disabled={prefLoading}
              className={`px-3.5 py-1.5 rounded-full text-xs font-black shrink-0 transition flex items-center gap-1.5 ${
                prefApplied
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-gradient-to-r from-amber-500 to-rose-600 text-white shadow-xs hover:brightness-105"
              }`}
            >
              <span>🎯</span>
              <span>{prefLoading ? "లోడ్ అవుతోంది…" : prefApplied ? "✓ నా ప్రిఫరెన్సెస్ అప్లై అయ్యాయి" : "🎯 నా సేవ్ చేసిన ప్రిఫరెన్సెస్"}</span>
            </button>

            <button
              onClick={() => setF("gender", filters.gender === "Bride" ? "" : "Bride")}
              className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition flex items-center gap-1 border ${
                filters.gender === "Bride" ? "bg-rose-700 text-white border-rose-700 shadow-xs" : "bg-white text-slate-700 border-slate-200 hover:border-rose-700"
              }`}
            >
              <span>👰</span>
              <span>వధువులు (Brides)</span>
            </button>

            <button
              onClick={() => setF("gender", filters.gender === "Groom" ? "" : "Groom")}
              className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition flex items-center gap-1 border ${
                filters.gender === "Groom" ? "bg-indigo-700 text-white border-indigo-700 shadow-xs" : "bg-white text-slate-700 border-slate-200 hover:border-indigo-700"
              }`}
            >
              <span>🤵</span>
              <span>వరులు (Grooms)</span>
            </button>

            <button
              onClick={() => setF("marital_status", filters.marital_status === "Pelli Kaledu" ? "" : "Pelli Kaledu")}
              className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition border ${
                filters.marital_status === "Pelli Kaledu" ? "bg-maroon text-white border-maroon shadow-xs" : "bg-white text-slate-700 border-slate-200 hover:border-maroon"
              }`}
            >
              💍 Never Married
            </button>

            <button
              onClick={() => setF("marital_status", filters.marital_status === "Divorced" ? "" : "Divorced")}
              className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition border ${
                filters.marital_status === "Divorced" ? "bg-rose-700 text-white border-rose-700 shadow-xs" : "bg-white text-slate-700 border-slate-200 hover:border-rose-700"
              }`}
            >
              ❤️ Second Marriage
            </button>

            <button
              onClick={() => toggleMulti("job", "Housewife / Homemaker (గృహిణి)")}
              className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition flex items-center gap-1 border ${
                isMultiSelected("job", "Housewife / Homemaker (గృహిణి)")
                  ? "bg-rose-700 text-white border-rose-700 shadow-xs"
                  : "bg-white text-slate-700 border-slate-200 hover:border-rose-700"
              }`}
            >
              <span>🏡</span>
              <span>Housewife / గృహిణి</span>
            </button>

            <button
              onClick={() => toggleMulti("job", "Software / IT / Tech")}
              className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition border ${
                isMultiSelected("job", "Software / IT / Tech") ? "bg-navy text-white border-navy shadow-xs" : "bg-white text-slate-700 border-slate-200 hover:border-navy"
              }`}
            >
              💻 Software / IT
            </button>

            <button
              onClick={() => toggleMulti("job", "Govt / PSU")}
              className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition border ${
                isMultiSelected("job", "Govt / PSU") ? "bg-maroon text-white border-maroon shadow-xs" : "bg-white text-slate-700 border-slate-200 hover:border-maroon"
              }`}
            >
              🏛️ Govt Jobs
            </button>

            <button
              onClick={() => setF("state", filters.state === "TS" ? "" : "TS")}
              className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition border ${
                filters.state === "TS" ? "bg-maroon text-white border-maroon shadow-xs" : "bg-white text-slate-700 border-slate-200"
              }`}
            >
              📍 Telangana ({TS_DISTRICTS.length})
            </button>

            <button
              onClick={() => setF("state", filters.state === "AP" ? "" : "AP")}
              className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition border ${
                filters.state === "AP" ? "bg-maroon text-white border-maroon shadow-xs" : "bg-white text-slate-700 border-slate-200"
              }`}
            >
              🌊 Andhra Pradesh ({AP_DISTRICTS.length})
            </button>

            <button
              onClick={() => setF("nri_only", !filters.nri_only)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition border ${
                filters.nri_only ? "bg-indigo-700 text-white border-indigo-700 shadow-xs" : "bg-white text-slate-700 border-slate-200"
              }`}
            >
              🌍 NRI Profiles
            </button>

            {activeChips.length > 0 && (
              <button onClick={clearAllFilters} className="px-3 py-1.5 rounded-full text-xs font-bold shrink-0 text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition">
                ✕ Clear All
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4 sm:py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ================= DESKTOP FILTER SIDEBAR (4 cols) ================= */}
          <div className="hidden lg:block lg:col-span-4 sticky top-20 bg-white rounded-3xl border border-gold/30 shadow-md p-5 space-y-4 max-h-[calc(100vh-100px)] overflow-y-auto scrollbar-thin">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="font-black text-sm text-slate-900 flex items-center gap-1.5">
                <span>🌪️</span>
                <span>అధునాతన ఫిల్టర్లు (Filters)</span>
                {activeChips.length > 0 && (
                  <span className="bg-maroon text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
                    {activeChips.length}
                  </span>
                )}
              </div>
              {activeChips.length > 0 && (
                <button onClick={clearAllFilters} className="text-xs font-bold text-rose-600 hover:underline">
                  రీసెట్ (Reset All)
                </button>
              )}
            </div>

            {/* Children Filter */}
            {filters.marital_status && filters.marital_status !== "Pelli Kaledu" && (
              <div className="border-t border-slate-100 pt-3 space-y-1.5">
                <label className="text-xs font-black text-slate-800">👶 పిల్లలు (Children):</label>
                <select
                  value={filters.children || ""}
                  onChange={(e) => setF("children", e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold"
                >
                  <option value="">అన్నీ (All)</option>
                  <option value="None">పిల్లలు లేరు (None)</option>
                  <option value="1">1 బాబు / పాప (1 Child)</option>
                  <option value="2">2 పిల్లలు (2 Children)</option>
                  <option value="3+">3+ పిల్లలు (3+ Children)</option>
                </select>
              </div>
            )}

            {/* Keyword Search */}
            <div>
              <label className="block text-xs font-black text-slate-800 mb-1">🔍 పేరు / ఐడీ / కీవర్డ్:</label>
              <input
                type="text"
                placeholder="TSAP ID, Name, Gothram..."
                value={filters.q}
                onChange={(e) => setF("q", e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-maroon/20 focus:border-maroon"
              />
            </div>

            {/* Gender Toggle */}
            <div className="border-t border-slate-100 pt-3">
              <label className="block text-xs font-black text-slate-800 mb-1.5">వధువు / వరుడు (Gender):</label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { v: "", l: "అన్నీ (All)" },
                  { v: "Bride", l: "👰 వధువు" },
                  { v: "Groom", l: "🤵 వరుడు" },
                ].map((g) => (
                  <button
                    key={g.v}
                    onClick={() => setF("gender", g.v)}
                    className={`py-1.5 rounded-xl text-xs font-bold border text-center transition ${
                      filters.gender === g.v ? "bg-maroon text-white border-maroon shadow-xs" : "bg-slate-50 text-slate-700 border-slate-200 hover:border-maroon/30"
                    }`}
                  >
                    {g.l}
                  </button>
                ))}
              </div>
            </div>

            {/* Caste Multi-Select with Search */}
            <div className="border-t border-slate-100 pt-3 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-800">💍 కులం (Caste):</label>
                {filters.caste && (
                  <button onClick={() => setF("caste", "")} className="text-[11px] text-maroon font-bold">
                    క్లియర్
                  </button>
                )}
              </div>

              {/* Popular Caste Quick Buttons */}
              <div className="flex flex-wrap gap-1">
                {["Reddy", "Kamma", "Kapu", "Brahmin", "Arya Vysya", "Padmashali", "Velama", "Yadav", "Goud"].map((c) => {
                  const on = isMultiSelected("caste", c);
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => toggleMulti("caste", c)}
                      className={`px-2 py-0.5 rounded-lg text-[10.5px] font-bold border transition ${
                        on ? "bg-maroon text-white border-maroon" : "bg-amber-50/70 border-gold/40 text-maroon hover:bg-gold/20"
                      }`}
                    >
                      {CASTE_TELUGU[c] || c}
                    </button>
                  );
                })}
              </div>

              <input
                type="text"
                placeholder="🔍 కులం వెతకండి (Telugu / Eng)..."
                value={casteSearch}
                onChange={(e) => setCasteSearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-maroon"
              />

              <div className="max-h-40 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
                {filteredCastesList.map((c) => {
                  const checked = isMultiSelected("caste", c);
                  return (
                    <label
                      key={c}
                      className={`flex items-center justify-between gap-2 p-1.5 rounded-xl text-xs cursor-pointer transition ${
                        checked ? "bg-amber-50 text-maroon font-black" : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked={checked} onChange={() => toggleMulti("caste", c)} className="accent-[#7A0C2E] rounded" />
                        <span className="font-bold text-maroon telugu">{CASTE_TELUGU[c] || c}</span>
                      </div>
                      <span className="text-[11px] text-slate-500 font-medium">({c})</span>
                    </label>
                  );
                })}
              </div>

              {/* Subcastes */}
              {availableSubcastes.length > 0 && (
                <div className="bg-amber-50/70 p-2.5 rounded-2xl border border-gold/30">
                  <label className="block text-[11px] font-black text-maroon mb-1">🪔 ఉపకులాలు (Sub-Castes):</label>
                  <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
                    {availableSubcastes.map((sc) => {
                      const checked = isMultiSelected("sub_caste", sc);
                      return (
                        <label key={sc} className="flex items-center gap-1.5 text-[11px] cursor-pointer text-slate-800">
                          <input type="checkbox" checked={checked} onChange={() => toggleMulti("sub_caste", sc)} className="accent-[#7A0C2E] rounded" />
                          <span>{sc}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* District Multi-Select */}
            <div className="border-t border-slate-100 pt-3 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-800">📍 జిల్లా / ప్రాంతం (District):</label>
                {filters.district && (
                  <button onClick={() => setF("district", "")} className="text-[11px] text-maroon font-bold">
                    క్లియర్
                  </button>
                )}
              </div>

              {/* State switch */}
              <div className="flex gap-1">
                {[
                  { v: "", l: "అన్నీ" },
                  { v: "TS", l: `🏛️ TS (${TS_DISTRICTS.length})` },
                  { v: "AP", l: `🌊 AP (${AP_DISTRICTS.length})` },
                ].map((st) => (
                  <button
                    key={st.v}
                    onClick={() => setF("state", st.v)}
                    className={`flex-1 py-1 text-[10.5px] font-bold rounded-lg border text-center transition ${
                      filters.state === st.v ? "bg-maroon text-white border-maroon" : "bg-slate-50 text-slate-700 border-slate-200"
                    }`}
                  >
                    {st.l}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between text-[11px]">
                <button type="button" onClick={filters.state === "AP" ? selectAllAP : selectAllTS} className="text-[#7A0C2E] font-bold hover:underline">
                  {filters.state === "AP"
                    ? `✓ ${te ? "అన్ని" : "All"} ${AP_DISTRICTS.length} AP ${te ? "జిల్లాలు" : "districts"}`
                    : `✓ ${te ? "అన్ని" : "All"} ${TS_DISTRICTS.length} TS ${te ? "జిల్లాలు" : "districts"}`}
                </button>
              </div>

              <input
                type="text"
                placeholder="🔍 జిల్లా వెతకండి..."
                value={districtSearch}
                onChange={(e) => setDistrictSearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-maroon"
              />

              <div className="max-h-40 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
                {filteredDistrictsList.map((d) => {
                  const checked = isMultiSelected("district", d);
                  return (
                    <label
                      key={d}
                      className={`flex items-center justify-between gap-2 p-1.5 rounded-xl text-xs cursor-pointer transition ${
                        checked ? "bg-amber-50 text-maroon font-black" : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked={checked} onChange={() => toggleMulti("district", d)} className="accent-[#7A0C2E] rounded" />
                        <span className="font-bold text-slate-800 telugu">{DISTRICT_TELUGU[d] || d}</span>
                      </div>
                      <span className="text-[11px] text-slate-500 font-medium">({d})</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Age Range Slider */}
            <div className="border-t border-slate-100 pt-3 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-black text-slate-800">🎂 వయస్సు (Age Range):</span>
                <span className="font-bold text-maroon">
                  {filters.age_min} - {filters.age_max} yrs
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="18"
                  max="60"
                  value={filters.age_min}
                  onChange={(e) => setF("age_min", Math.min(Number(e.target.value), filters.age_max))}
                  className="flex-1 accent-[#7A0C2E]"
                />
                <input
                  type="range"
                  min="18"
                  max="60"
                  value={filters.age_max}
                  onChange={(e) => setF("age_max", Math.max(Number(e.target.value), filters.age_min))}
                  className="flex-1 accent-[#7A0C2E]"
                />
              </div>
            </div>
          </div>

          {/* ================= RIGHT COLUMN: MATCHES LIST (8 cols) ================= */}
          <div className="lg:col-span-8 space-y-4">
            {/* Header / Summary Bar */}
            <div className="bg-white rounded-2xl border border-gold/30 p-3.5 sm:p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-base sm:text-lg font-black text-slate-900">
                  🔍 {loading
                    ? (te ? "వెతుకుతున్నాము…" : "Searching…")
                    : requestError
                      ? (te ? "ప్రొఫైళ్లను లోడ్ చేయలేకపోయాం" : "Could not load profiles")
                      : (te ? `${total} సరిపోలే ప్రొఫైల్స్ లభించాయి` : `${total} matching profiles found`)}
                </h1>
                <p className="text-xs text-slate-500">
                  {filters.verified_only
                    ? (te ? "కనీసం ఒక verification check నమోదు చేసిన profiles" : "Profiles with at least one recorded verification check")
                    : (te ? "మీ ప్రాధాన్యతలకు సరిపోయే ప్రొఫైల్స్" : "Profiles matching your preferences")}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {/* Mobile Filter Trigger Button */}
                <button
                  onClick={() => setSheet(true)}
                  className="lg:hidden px-3.5 py-2 rounded-xl maroon-gradient text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <span>🌪️ ఫిల్టర్లు</span>
                  {activeChips.length > 0 && <span className="bg-gold text-maroon px-1.5 rounded-full text-[10px] font-black">{activeChips.length}</span>}
                </button>

                {/* Sort dropdown */}
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-maroon"
                >
                  {SORTS.map((s) => (
                    <option key={s.v} value={s.v}>
                      {te ? s.lTe : s.l}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Active Filter Chips Bar */}
            {activeChips.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                {activeChips.map((chip) => (
                  <span
                    key={chip.key}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-maroon border border-gold/40 shadow-xs"
                  >
                    <span>{chip.label}</span>
                    <button onClick={chip.clear} className="hover:text-rose-600 ml-1 font-bold">
                      ✕
                    </button>
                  </span>
                ))}
                <button onClick={clearAllFilters} className="text-xs font-bold text-rose-600 underline ml-2">
                  అన్నీ తొలగించు (Clear All)
                </button>
              </div>
            )}

            {/* Clarity Banner - Numbers ivvamu */}
            <div className="bg-gradient-to-r from-amber-50 to-rose-50 border border-gold/40 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">🔒</span>
                <div>
                  <span className="font-bold text-maroon">ఫోన్ నంబర్ల గోప్యతా నియమం: </span>
                  <span className="text-slate-700">మొదటి 3 కాంటాక్ట్ రిక్వెస్ట్స్ ఉచితం. డైరెక్ట్ నంబర్లు ఇవ్వము (ఇరువైపులా అంగీకారం లేదా ప్లాన్ ఉన్నప్పుడే నంబర్లు లభిస్తాయి — ₹99 → 5 profiles).</span>
                </div>
              </div>
              <Link href="/pricing" className="px-3.5 py-1.5 rounded-xl gold-gradient text-maroon font-bold text-xs shrink-0 self-start sm:self-auto shadow-xs">
                ప్లాన్స్ చూడండి →
              </Link>
            </div>

            {/* Matches Cards Grid */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="bg-white rounded-3xl border border-gold/20 p-5 space-y-4 animate-pulse">
                    <div className="flex gap-4">
                      <div className="w-20 h-24 bg-slate-200 rounded-2xl" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-slate-200 rounded w-3/4" />
                        <div className="h-3 bg-slate-200 rounded w-1/2" />
                        <div className="h-3 bg-slate-200 rounded w-5/6" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : requestError ? (
              <div role="alert" className="bg-white rounded-3xl border border-rose-200 p-8 text-center space-y-3">
                <div className="text-4xl">📡</div>
                <h3 className="text-base font-black text-slate-900">{te ? "సంబంధాలను లోడ్ చేయడంలో సమస్య" : "We couldn't load profiles"}</h3>
                <p className="text-xs text-slate-600">{te ? "మీ కనెక్షన్‌ను తనిఖీ చేసి మళ్లీ ప్రయత్నించండి." : "Check your connection and try again."}</p>
                <button onClick={() => void fetchMatches()} className="px-5 py-2.5 rounded-xl maroon-gradient text-white text-xs font-bold shadow-md">
                  {te ? "మళ్లీ ప్రయత్నించండి" : "Try again"}
                </button>
              </div>
            ) : rows.length === 0 ? (
              <div className="bg-white rounded-3xl border border-gold/30 p-8 text-center space-y-3">
                <div className="text-4xl">🔍 💍</div>
                <h3 className="text-base font-black text-slate-900">మీ ఫిల్టర్లకు సరిపోయే ప్రొఫైల్స్ ప్రస్తుతానికి లేవు</h3>
                <p className="text-xs text-slate-600 telugu">
                  దయచేసి కులం లేదా జిల్లా ఫిల్టర్లను కాస్త సడలించి మళ్లీ ప్రయత్నించండి.
                </p>
                <button onClick={clearAllFilters} className="px-5 py-2.5 rounded-xl maroon-gradient text-white text-xs font-bold shadow-md">
                  అన్ని ఫిల్టర్లను రీసెట్ చేయండి
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {rows.map((row) => (
                  <Card key={row.tsap_id || row.id} row={row} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ---------- Mobile Filter Bottom-Sheet Modal ---------- */}
      {sheet && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end justify-center lg:hidden animate-fade">
          <div className="bg-white w-full max-h-[85vh] rounded-t-3xl flex flex-col shadow-2xl overflow-hidden animate-slideUp">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="font-black text-sm text-slate-900 flex items-center gap-1.5">
                <span>🌪️</span>
                <span>అధునాతన ఫిల్టర్లు (Advanced Filters)</span>
              </div>
              <button onClick={() => setSheet(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-bold">
                ✕
              </button>
            </div>

            {/* Tabbed Navigation */}
            <div className="flex border-b border-slate-100 overflow-x-auto no-scrollbar bg-slate-50">
              {[
                { k: "basic", l: "ప్రాథమిక (Basic)" },
                { k: "caste", l: "కులం (Caste)" },
                { k: "location", l: "ప్రాంతం (Location)" },
                { k: "career", l: "ఉద్యోగం (Career)" },
                { k: "astro", l: "జ్యోతిషం (Astro)" },
              ].map((t) => (
                <button
                  key={t.k}
                  onClick={() => setMobileFilterTab(t.k as any)}
                  className={`px-4 py-2.5 text-xs font-bold shrink-0 border-b-2 transition ${
                    mobileFilterTab === t.k ? "border-maroon text-maroon bg-white" : "border-transparent text-slate-600"
                  }`}
                >
                  {t.l}
                </button>
              ))}
            </div>

            {/* Modal Tab Content */}
            <div className="p-4 overflow-y-auto flex-1 space-y-4">
              {mobileFilterTab === "basic" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">వధువు / వరుడు:</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { v: "", l: "అన్నీ (All)" },
                        { v: "Bride", l: "👰 వధువు" },
                        { v: "Groom", l: "🤵 వరుడు" },
                      ].map((g) => (
                        <button
                          key={g.v}
                          onClick={() => setF("gender", g.v)}
                          className={`py-2 rounded-xl text-xs font-bold border text-center ${
                            filters.gender === g.v ? "bg-maroon text-white border-maroon" : "bg-slate-50 text-slate-700 border-slate-200"
                          }`}
                        >
                          {g.l}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">వైవాహిక స్థితి:</label>
                    <div className="grid grid-cols-2 gap-2">
                      {["Pelli Kaledu", "Divorced", "Widow", "Widower"].map((ms) => (
                        <button
                          key={ms}
                          onClick={() => setF("marital_status", filters.marital_status === ms ? "" : ms)}
                          className={`py-2 px-3 rounded-xl text-xs font-bold border text-center ${
                            filters.marital_status === ms ? "bg-maroon text-white border-maroon" : "bg-slate-50 text-slate-700 border-slate-200"
                          }`}
                        >
                          {ms === "Pelli Kaledu" ? "Never Married" : ms}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span>వయస్సు పరిధి:</span>
                      <span className="text-maroon">
                        {filters.age_min} - {filters.age_max} yrs
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="18"
                        max="60"
                        value={filters.age_min}
                        onChange={(e) => setF("age_min", Number(e.target.value))}
                        className="flex-1 accent-[#7A0C2E]"
                      />
                      <input
                        type="range"
                        min="18"
                        max="60"
                        value={filters.age_max}
                        onChange={(e) => setF("age_max", Number(e.target.value))}
                        className="flex-1 accent-[#7A0C2E]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {mobileFilterTab === "caste" && (
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="🔍 కులం వెతకండి..."
                    value={casteSearch}
                    onChange={(e) => setCasteSearch(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                  />
                  <div className="max-h-60 overflow-y-auto space-y-1">
                    {filteredCastesList.map((c) => {
                      const checked = isMultiSelected("caste", c);
                      return (
                        <label key={c} className="flex items-center justify-between p-2 rounded-xl text-xs bg-slate-50 cursor-pointer">
                          <div className="flex items-center gap-2">
                            <input type="checkbox" checked={checked} onChange={() => toggleMulti("caste", c)} className="accent-[#7A0C2E] rounded" />
                            <span className="font-bold text-slate-800">{CASTE_TELUGU[c] || c}</span>
                          </div>
                          <span className="text-slate-500 text-[11px]">({c})</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {mobileFilterTab === "location" && (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    {[
                      { v: "", l: "అన్నీ" },
                      { v: "TS", l: `🏛️ TS (${TS_DISTRICTS.length})` },
                      { v: "AP", l: `🌊 AP (${AP_DISTRICTS.length})` },
                    ].map((st) => (
                      <button
                        key={st.v}
                        onClick={() => setF("state", st.v)}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-xl border text-center ${
                          filters.state === st.v ? "bg-maroon text-white border-maroon" : "bg-slate-50 text-slate-700 border-slate-200"
                        }`}
                      >
                        {st.l}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    placeholder="🔍 జిల్లా వెతకండి..."
                    value={districtSearch}
                    onChange={(e) => setDistrictSearch(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                  />
                  <div className="max-h-60 overflow-y-auto space-y-1">
                    {filteredDistrictsList.map((d) => {
                      const checked = isMultiSelected("district", d);
                      return (
                        <label key={d} className="flex items-center justify-between p-2 rounded-xl text-xs bg-slate-50 cursor-pointer">
                          <div className="flex items-center gap-2">
                            <input type="checkbox" checked={checked} onChange={() => toggleMulti("district", d)} className="accent-[#7A0C2E] rounded" />
                            <span className="font-bold text-slate-800">{DISTRICT_TELUGU[d] || d}</span>
                          </div>
                          <span className="text-slate-500 text-[11px]">({d})</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {mobileFilterTab === "career" && (
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-800">వృత్తి / ఉద్యోగ రంగం:</label>
                  <div className="grid grid-cols-2 gap-2">
                    {["Housewife / Homemaker (గృహిణి)", "Not Working / Student", ...WORK_TYPES].map((wt) => {
                      const checked = isMultiSelected("job", wt);
                      return (
                        <label key={wt} className="flex items-center gap-2 p-2 rounded-xl text-xs bg-slate-50 cursor-pointer">
                          <input type="checkbox" checked={checked} onChange={() => toggleMulti("job", wt)} className="accent-[#7A0C2E] rounded" />
                          <span className="truncate">{wt}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {mobileFilterTab === "astro" && (
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-800">నక్షత్రం ఎంచుకోండి:</label>
                  <div className="max-h-60 overflow-y-auto space-y-1">
                    {NAKSHATRAS.map((st) => {
                      const checked = isMultiSelected("star", st.en);
                      return (
                        <label key={st.en} className="flex items-center gap-2 p-2 rounded-xl text-xs bg-slate-50 cursor-pointer">
                          <input type="checkbox" checked={checked} onChange={() => toggleMulti("star", st.en)} className="accent-[#7A0C2E] rounded" />
                          <span>
                            ⭐ {st.te} ({st.en})
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Bottom Actions */}
            <div className="p-4 border-t border-slate-100 flex items-center gap-3 bg-white">
              <button onClick={clearAllFilters} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold">
                రీసెట్ చేయండి
              </button>
              <button onClick={() => setSheet(false)} className="flex-2 py-3 rounded-xl maroon-gradient text-white text-xs font-bold shadow-md">
                ఫిల్టర్లు వర్తింపజేయండి ({total})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Instant Contact Unlock Modal */}
      {unlockTarget && (unlockTarget.tsap_id || unlockTarget.id) && (
        <QuickUnlockModal
          isOpen={!!unlockTarget}
          target={{
            tsap_id: String(unlockTarget.tsap_id || unlockTarget.id),
            full_name: unlockTarget.full_name,
            gender: unlockTarget.gender,
            age: unlockTarget.age,
            caste: unlockTarget.caste,
            district: unlockTarget.district,
            job: unlockTarget.job,
            photo_url: unlockTarget.photo_url,
          }}
          onClose={() => setUnlockTarget(null)}
          onUnlocked={() => {
            setUnlockTarget(null);
            fetchMatches();
          }}
        />
      )}

      {/* Instant WhatsApp Proposal Modal */}
      {proposalTarget && (proposalTarget.tsap_id || proposalTarget.id) && (
        <WhatsAppProposalModal
          isOpen={!!proposalTarget}
          profile={{
            tsap_id: String(proposalTarget.tsap_id || proposalTarget.id),
            full_name: proposalTarget.full_name,
            gender: proposalTarget.gender,
            age: proposalTarget.age,
            height: proposalTarget.height,
            caste: proposalTarget.caste,
            sub_caste: proposalTarget.sub_caste,
            gothram: proposalTarget.gothram,
            star: proposalTarget.star,
            rasi: proposalTarget.rasi,
            education: proposalTarget.education,
            job: proposalTarget.job,
            company: proposalTarget.company,
            salary: proposalTarget.salary,
            district: proposalTarget.district,
            state: proposalTarget.state,
            marital_status: proposalTarget.marital_status,
            photo_url: proposalTarget.photo_url,
          }}
          onClose={() => setProposalTarget(null)}
        />
      )}
    </div>
  );
}
