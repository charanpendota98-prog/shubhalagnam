"use client";

/**
 * 👑 MANA VIVAHA — FLIPKART/AMAZON GRADE ADVANCED MULTI-SELECT MATCHES
 * ====================================================================
 *  • Multi-select faceted filtering (Castes, Sub-castes, Districts, Educations, Jobs, Nakshatras, Marital, Dosham)
 *  • Instant search inside Castes and Districts checklists
 *  • Dynamic Sub-castes generator based on selected Castes
 *  • Dual Age & Height Range sliders, Salary quick chips
 *  • Mobile Flipkart/Myntra style bottom-sheet filter drawer
 *  • Active filter chips with instant [x] dismiss and Clear All
 *  • 10-Porutham Gunamilan breakdown on cards
 *  • District targeted localized wedding ads integration
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
  HEIGHTS,
  JOBS,
  MARITAL_STATUSES,
  NAKSHATRAS,
  RASIS,
  RELIGIONS,
  SALARIES,
  TS_DISTRICTS,
  AP_DISTRICTS,
} from "@/lib/telugu-data";
import { SITE_CONFIG } from "@/lib/site-config";
import QuickLead from "@/components/QuickLead";
import TrustBadge from "@/components/TrustBadge";
import AuthGate from "@/components/AuthGate";
import { apiGet, apiPost, getToken } from "@/lib/api";
import { firstName } from "@/lib/names";
import TopPicks from "@/components/TopPicks";
import { Duo, duo } from "@/lib/duo";
import { useLang } from "@/lib/lang";
import ProfileRail from "@/components/ProfileRail";
import DistrictAdBanner from "@/components/DistrictAdBanner";

type Row = Record<string, any>;
const SAVED_SEARCHES_KEY = "tsap_saved_searches_v1";

const SORTS = [
  { v: "score", l: "🏆 Best match", lTe: "🏆 బెస్ట్ మ్యాచ్" },
  { v: "porutham", l: "💍 Gunamelanam", lTe: "💍 గుణమేళనం" },
  { v: "trust", l: "🛡️ Trust score", lTe: "🛡️ ట్రస్ట్ స్కోర్" },
  { v: "completeness", l: "📝 Profile complete", lTe: "📝 ప్రొఫైల్ పూర్తి" },
  { v: "new", l: "🆕 New", lTe: "🆕 కొత్తవి" },
  { v: "age", l: "🎂 Age", lTe: "🎂 వయసు" },
  { v: "boosted", l: "⚡ Boosted", lTe: "⚡ బూస్టెడ్" },
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
  dosham: "",
  verified_only: false,
  photo_only: false,
  nri_only: false,
  height_min: "",
  height_max: "",
};

const ALL_DISTRICTS_COMBINED = Array.from(new Set([...TS_DISTRICTS, ...AP_DISTRICTS, "USA / NRI", "Other"])).filter(Boolean);

/* ---------- 🧠 MATCH SCORE 2.0 — EXPANDABLE PANEL ---------- */
function ScoreBreakdown({ v2 }: { v2: any }) {
  const { lang } = useLang();
  const te = lang === "te";
  const [open, setOpen] = useState(false);
  if (!v2) return null;
  const gradeColor: Record<string, string> = {
    perfect: "bg-emerald-100 text-emerald-800 border-emerald-300",
    best: "bg-emerald-50 text-emerald-800 border-emerald-200",
    good: "bg-amber-50 text-amber-800 border-amber-200",
    average: "bg-gray-100 text-gray-700 border-gray-300",
  };
  const gc = gradeColor[String(v2.grade || "average")] || gradeColor.average;
  return (
    <div className="mx-4 mb-3 rounded-2xl border border-maroon/15 bg-white overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-2 px-3 py-2 text-left">
        <span className="text-[12px] font-bold text-maroon">{te ? "🧠 ఎందుకు ఈ score?" : "🧠 Why this score?"}</span>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${gc}`}>{v2.grade}</span>
        {v2?.mutual?.both_like ? (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300">
            💞 mutual (+8%)
          </span>
        ) : null}
        <span className="ml-auto text-[11px] text-gray-500">{open ? (te ? "▲ మూసెయ్" : "▲ Hide") : (te ? "▼ చూడు" : "▼ View")}</span>
      </button>
      {open && (
        <div className="px-3 pb-3">
          <div className="text-[11px] text-gray-600 mb-2">{v2.verdict}</div>
          <div className="space-y-1.5">
            {(v2.breakdown || []).map((b: any, i: number) => {
              const got = Number(b.points ?? b.score ?? 0);
              const max = Math.max(1, Number(b.max || 1));
              const pct = Math.round((got / max) * 100);
              return (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-[10px] w-[92px] shrink-0 text-gray-700 truncate" title={b.note}>{b.label}</span>
                  <span className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <span className="block h-2 rounded-full"
                      style={{ width: `${pct}%`, background: pct >= 80 ? "#0f7a4a" : pct >= 55 ? "#C79A2E" : "#c0405a" }} />
                  </span>
                  <span className="text-[10px] font-bold text-gray-700 w-[52px] text-right">{got}/{max}</span>
                </div>
              );
            })}
          </div>
          {Array.isArray(v2.weak_points) && v2.weak_points.length > 0 && (
            <div className="mt-2.5 bg-rose-50 border border-rose-200 rounded-xl p-2.5">
              <div className="text-[10px] font-bold text-rose-800">{te ? "⚠️ జాగ్రత్త (weak points)" : "⚠️ Caution (weak points)"}</div>
              {v2.weak_points.map((w: string, i: number) => (
                <div key={i} className="text-[10px] text-rose-900 telugu">• {w}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function MatchesPage() {
  const { lang } = useLang();
  const te = lang === "te";

  const [filters, setFilters] = useState<Row>(DEFAULT_FILTERS);
  const [sort, setSort] = useState<string>("score");
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [msg, setMsg] = useState<string>("");
  const [myTsapId, setMyTsapId] = useState<string>("");
  const [credits, setCredits] = useState<number>(3);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [sending, setSending] = useState<string>("");
  const [needsLogin, setNeedsLogin] = useState<boolean>(false);
  const [sheet, setSheet] = useState<boolean>(false);
  const [savedSearches, setSavedSearches] = useState<{ label: string; filters: Row; sort?: string }[]>([]);
  const [serverSearches, setServerSearches] = useState<Row[]>([]);
  const [facets, setFacets] = useState<Row | null>(null);

  // Search within filter inputs
  const [casteSearch, setCasteSearch] = useState("");
  const [districtSearch, setDistrictSearch] = useState("");
  const [mobileFilterTab, setMobileFilterTab] = useState<"caste" | "district" | "education" | "job" | "astro" | "more">("caste");

  const reqId = useRef(0);

  // Read query params from URL on mount
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

  const setF = (key: string, val: any) => {
    setFilters((prev) => ({ ...prev, [key]: val }));
  };

  // Helper for multi-select values (comma-separated string)
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

  // Available subcastes based on selected castes
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
    return Array.from(new Set(subs));
  }, [filters.caste]);

  // Filtered Castes & Districts in Search List (support both English and Telugu search)
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

  // Active filter tags for the chip bar
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
              label: `💍 ${c.trim()}`,
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
              label: `📍 ${d.trim()}`,
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
    if (filters.education) {
      String(filters.education)
        .split(",")
        .forEach((e) => {
          if (e.trim()) {
            chips.push({
              key: `edu_${e}`,
              label: `🎓 ${e.trim()}`,
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
    if (filters.star) {
      String(filters.star)
        .split(",")
        .forEach((s) => {
          if (s.trim()) {
            chips.push({
              key: `star_${s}`,
              label: `⭐ ${s.trim()}`,
              clear: () => toggleMulti("star", s.trim()),
            });
          }
        });
    }
    if (filters.marital_status) {
      chips.push({
        key: "marital",
        label: `💍 ${filters.marital_status}`,
        clear: () => setF("marital_status", ""),
      });
    }
    if (filters.salary_min && filters.salary_min > 0) {
      chips.push({
        key: "salary",
        label: `💰 ₹${filters.salary_min / 100000}L+`,
        clear: () => setF("salary_min", 0),
      });
    }
    if (filters.age_min > 18 || filters.age_max < 60) {
      chips.push({
        key: "age",
        label: `🎂 ${filters.age_min}–${filters.age_max} yrs`,
        clear: () => {
          setF("age_min", 18);
          setF("age_max", 60);
        },
      });
    }
    if (filters.verified_only) {
      chips.push({ key: "verified", label: "✓ Verified Only", clear: () => setF("verified_only", false) });
    }
    if (filters.nri_only) {
      chips.push({ key: "nri", label: "🌍 NRI Only", clear: () => setF("nri_only", false) });
    }
    return chips;
  }, [filters, te]);

  // Load Saved Searches & Credits & Smart Match Alerts
  const [smartAlerts, setSmartAlerts] = useState<any>(null);

  useEffect(() => {
    try {
      const id = localStorage.getItem("tsap_id");
      if (id) {
        setMyTsapId(id.toUpperCase());
        fetch(`/api/matches/smart-alerts?tsap_id=${encodeURIComponent(id)}`)
          .then((r) => r.json())
          .then((d) => { if (d?.success) setSmartAlerts(d); })
          .catch(() => {});
      } else {
        fetch("/api/matches/smart-alerts")
          .then((r) => r.json())
          .then((d) => { if (d?.success) setSmartAlerts(d); })
          .catch(() => {});
      }
      const c = localStorage.getItem("tsap_credits");
      if (c) setCredits(parseInt(c));
      const ss = JSON.parse(localStorage.getItem(SAVED_SEARCHES_KEY) || "[]");
      if (Array.isArray(ss)) setSavedSearches(ss);
    } catch {
      /* ignore */
    }
  }, []);

  // API Search execution (debounced)
  const load = useCallback(async () => {
    const id = ++reqId.current;
    setLoading(true);
    const qs = new URLSearchParams();
    Object.keys(filters).forEach((k) => {
      const v = filters[k];
      if (v === "" || v === null || v === undefined) return;
      if (v === false) return;
      if (v === true) qs.set(k, "true");
      else qs.set(k, String(v));
    });
    qs.set("sort", sort);
    qs.set("limit", "40");
    if (myTsapId) qs.set("viewer_id", myTsapId);

    const { ok, data, errorTelugu: eTel } = await apiGet<Row>(`/api/search?${qs.toString()}`);
    if (id !== reqId.current) return;
    if (ok && Array.isArray(data?.results)) {
      setRows(data!.results as Row[]);
      setTotal(Number(data?.total ?? (data!.results as Row[]).length));
      setMsg(String(data?.message_telugu || ""));
      if (data?.facets) setFacets(data.facets as Row);
    } else {
      setRows([]);
      setTotal(0);
      setMsg(`⚠️ ${eTel || (te ? "సంబంధాలు దొరకలేదు — ఫిల్టర్లు మార్చి ప్రయత్నించండి" : "No matches found")}`);
    }
    setLoading(false);
  }, [filters, sort, myTsapId, te]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const toggleSave = async (row: Row) => {
    const { ok, data, errorTelugu: eTel, needsLogin: nl } = await apiPost<Row>("/api/save", {
      tsap_id: myTsapId,
      target_id: row.tsap_id,
    });
    if (nl) {
      setNeedsLogin(true);
      return;
    }
    if (!ok) {
      setNote({ ok: false, text: eTel });
      return;
    }
    const saved = !!data?.saved;
    setSavedIds((prev) =>
      saved ? (prev.includes(row.tsap_id) ? prev : [...prev, row.tsap_id]) : prev.filter((x) => x !== row.tsap_id)
    );
    setNote({ ok: true, text: String(data?.message_telugu || "Shortlist updated") });
  };

  const sendInterest = async (row: Row) => {
    setSending(row.tsap_id);
    setNote(null);
    const { ok, data, errorTelugu: eTel, needsLogin: nl, status } = await apiPost<Row>("/api/interest/send", {
      from_id: myTsapId,
      to_id: row.tsap_id,
      channel: "matches_page",
    });
    if (nl) {
      setNeedsLogin(true);
      setSending("");
      return;
    }
    if (ok) {
      setNote({ ok: true, text: String(data?.message_telugu || "Interest sent") });
      if (data?.credits_left !== undefined) {
        setCredits(Number(data.credits_left));
        localStorage.setItem("tsap_credits", String(data.credits_left));
      }
    } else if (status === 402) {
      setNote({
        ok: false,
        text: te
          ? "⚠️ Credits అయిపోయాయి — ₹99 → 5 profiles. Phone numbers కూడా accept తోనే (consent)."
          : "⚠️ Credits over — ₹99 → 5 profiles.",
      });
    } else {
      setNote({ ok: false, text: eTel || "Interest not sent" });
    }
    setSending("");
  };

  const shareText = (row: Row) =>
    `🙏 ${SITE_CONFIG.brandName} profile — ${firstName(row.full_name)} (${row.tsap_id})\n` +
    `👉 ${row.age}y • ${row.caste} • ${row.education} • ${row.job}\n` +
    `📍 ${row.district}, ${row.state} • 💰 ${row.salary}\n` +
    `Full details: ${SITE_CONFIG.siteUrl || "https://manavivaha.in"}/search/${row.tsap_id}`;

  const shareWhatsApp = (row: Row) =>
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText(row))}`, "_blank");

  // Profile Match Card Component
  const Card = ({ row }: { row: Row }) => {
    const isSaved = savedIds.includes(row.tsap_id);
    const scoreVal = row.match_score_v2?.score ?? row.score ?? 85;
    const photo = row.photo_url || (Array.isArray(row.photo_urls) && row.photo_urls[0]) || "";

    return (
      <div className="bg-white rounded-3xl border border-gold/25 card-shadow hover:border-gold/60 transition overflow-hidden flex flex-col justify-between">
        <div className="p-4 sm:p-5 space-y-3.5">
          <div className="flex items-start gap-3.5">
            {/* Profile Avatar / Photo */}
            <div className="relative shrink-0">
              {photo ? (
                <img
                  src={photo}
                  alt={firstName(row.full_name)}
                  className="w-20 h-24 rounded-2xl object-cover border border-gold/30 shadow-sm"
                />
              ) : (
                <div className="w-20 h-24 rounded-2xl bg-amber-50 border border-gold/30 flex flex-col items-center justify-center text-3xl shadow-inner text-maroon">
                  <span>{row.gender === "Groom" || row.gender === "Male" ? "🤵" : "👰"}</span>
                  <span className="text-[10px] font-bold mt-1 text-slate-500">🔒 Photo Lock</span>
                </div>
              )}
              {row.is_verified && (
                <span className="absolute -bottom-2 -right-1 bg-emerald-600 text-white rounded-full p-1 shadow" title="100% Verified">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </span>
              )}
            </div>

            {/* Profile Meta & Badges */}
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center justify-between gap-1">
                <Link
                  href={`/search/${row.tsap_id}`}
                  className="font-extrabold text-base text-navy hover:text-maroon truncate flex items-center gap-1.5"
                >
                  <span>{firstName(row.full_name)}</span>
                  <span className="font-mono text-xs font-semibold text-slate-400">({row.tsap_id})</span>
                </Link>

                <button
                  onClick={() => toggleSave(row)}
                  className={`p-1.5 rounded-full transition ${isSaved ? "text-rose-600 bg-rose-50" : "text-slate-400 hover:text-rose-500"}`}
                  title={isSaved ? "Saved" : "Shortlist"}
                >
                  {isSaved ? "❤️" : "🤍"}
                </button>
              </div>

              <p className="text-xs font-bold text-maroon flex flex-wrap items-center gap-1.5">
                <span>💍 {row.caste || "Telugu"}</span>
                {row.sub_caste && <span className="text-slate-500">({row.sub_caste})</span>}
                <span className="text-slate-300">•</span>
                <span>🎂 {row.age} yrs</span>
                {row.height && <span>• {row.height}</span>}
              </p>

              <p className="text-xs text-slate-700 font-medium truncate">
                🎓 {row.education || "Graduate"} • 💼 {row.job || "Professional"}
              </p>

              <p className="text-[11.5px] text-slate-500 truncate">
                📍 {row.district || "Hyderabad"}, {row.state || "TS"} • 💰 {row.salary || "Best in Industry"}
              </p>
            </div>
          </div>

          {/* Astro & Match Score Badge */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="bg-amber-100 text-amber-900 font-bold px-2.5 py-0.5 rounded-full text-[11px] border border-amber-300">
                ⭐ {row.star || "జ్యోతిషం సరిపోలిక"}
              </span>
              {row.rasi && (
                <span className="bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded-full text-[10.5px]">
                  {row.rasi}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 font-bold text-maroon">
              <span>🎯 {scoreVal}% Match</span>
            </div>
          </div>
        </div>

        {/* Why Match breakdown */}
        {row.match_score_v2 && <ScoreBreakdown v2={row.match_score_v2} />}

        {/* Action Buttons */}
        <div className="bg-slate-50 p-3 px-4 border-t border-slate-100 flex items-center justify-between gap-2">
          <Link
            href={`/search/${row.tsap_id}`}
            className="flex-1 text-center py-2.5 px-3 rounded-xl border border-maroon/30 text-maroon bg-white hover:bg-cream text-xs font-bold transition shadow-xs"
          >
            👁️ {te ? "పూర్తి వివరాలు" : "View Details"}
          </Link>

          <button
            onClick={() => sendInterest(row)}
            disabled={sending === row.tsap_id}
            className="flex-1 text-center py-2.5 px-3 rounded-xl maroon-gradient text-white text-xs font-black shadow-md hover-lift disabled:opacity-50 transition"
          >
            {sending === row.tsap_id ? "పంపుతోంది…" : "💌 Interest పంపు"}
          </button>

          <button
            onClick={() => shareWhatsApp(row)}
            className="p-2.5 rounded-xl bg-[#25D366] text-white hover:brightness-110 active:scale-95 transition shadow-xs"
            title="Share on WhatsApp"
          >
            <span className="text-sm">💬</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-cream pb-24 md:pb-12">
      {/* ---------- STICKY TOP SEARCH & SORT BAR ---------- */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gold/30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center gap-2">
            <Link href="/" className="text-xs font-bold text-maroon shrink-0">
              ← {te ? "హోమ్" : "Home"}
            </Link>

            {/* Keyword Search */}
            <div className="flex-1 flex items-center gap-2 bg-slate-50 border border-gold/40 rounded-2xl px-3 py-1.5 focus-within:bg-white focus-within:ring-2 focus-within:ring-maroon transition">
              <span className="text-slate-400">🔍</span>
              <input
                value={filters.q}
                onChange={(e) => setF("q", e.target.value)}
                placeholder={te ? "పేరు, కులం, జిల్లా, చదువు లేదా ఉద్యోగం టైప్ చేయండి..." : "Search name, caste, district, job..."}
                className="w-full bg-transparent text-xs font-bold text-slate-800 outline-none placeholder:text-slate-400"
              />
              {filters.q && (
                <button onClick={() => setF("q", "")} className="text-slate-400 hover:text-slate-600 text-xs font-bold">
                  ✕
                </button>
              )}
            </div>

            {/* Mobile Filter Button */}
            <button
              onClick={() => setSheet(true)}
              className="md:hidden shrink-0 px-3.5 py-2.5 rounded-xl maroon-gradient text-white text-xs font-black flex items-center gap-1.5 shadow-md"
            >
              <span>⚡</span>
              <span>{te ? "వడపోతలు (Filters)" : "Filters"}</span>
              {activeChips.length > 0 && (
                <span className="bg-gold text-maroon rounded-full px-1.5 py-0.2 text-[10px] font-black">
                  {activeChips.length}
                </span>
              )}
            </button>

            {/* Credits Counter */}
            <div className="hidden md:flex items-center gap-2 shrink-0">
              <span className="text-xs bg-amber-50 border border-gold/40 text-maroon font-bold rounded-full px-3 py-1.5">
                💌 Credits: <b>{credits}</b>
              </span>
            </div>
          </div>

          {/* Quick Sort Bar */}
          <div className="mt-2.5 flex gap-1.5 overflow-x-auto pb-1 scrollbar-none items-center">
            <span className="text-[11px] font-bold text-slate-500 shrink-0 mr-1">
              {te ? "క్రమబద్ధీకరించు:" : "Sort By:"}
            </span>
            {SORTS.map((s) => (
              <button
                key={s.v}
                onClick={() => setSort(s.v)}
                className={`shrink-0 text-xs px-3 py-1 rounded-full font-bold transition ${
                  sort === s.v
                    ? "maroon-gradient text-white shadow-xs"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {te ? s.lTe : s.l}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-5 md:grid md:grid-cols-[300px_1fr] md:gap-6 md:items-start">
        
        {/* ================= DESKTOP FLIPKART/AMAZON FACETED SIDEBAR ================= */}
        <aside className="hidden md:block bg-white rounded-3xl border border-gold/30 p-5 sticky top-[136px] max-h-[82vh] overflow-y-auto space-y-5 card-shadow">
          
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-black text-sm text-navy flex items-center gap-1.5">
              <span>⚡</span>
              <span>{te ? "ఫిల్టర్లు & వడపోతలు" : "Faceted Filters"}</span>
              {activeChips.length > 0 && (
                <span className="text-[10px] bg-maroon text-white font-bold px-2 py-0.5 rounded-full">
                  {activeChips.length}
                </span>
              )}
            </h3>
            <button
              onClick={() => setFilters({ ...DEFAULT_FILTERS })}
              className="text-xs font-bold text-maroon hover:underline"
            >
              {te ? "అన్నీ క్లియర్" : "Clear All"}
            </button>
          </div>

          {/* 1. Whom to find (Gender) */}
          <div>
            <label className="block text-xs font-black text-slate-800 mb-2">
              👰/🤵 {te ? "ఎవరి కోసం చూస్తున్నారు?" : "Looking For:"}
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { v: "", l: te ? "అందరూ" : "All" },
                { v: "Bride", l: "👰 Brides" },
                { v: "Groom", l: "🤵 Grooms" },
              ].map((g) => (
                <button
                  key={g.v}
                  onClick={() => setF("gender", g.v)}
                  className={`py-1.5 text-xs font-bold rounded-xl border text-center transition ${
                    filters.gender === g.v
                      ? "bg-maroon text-white border-maroon shadow-xs"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {g.l}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Multi-Select Caste Filter with In-Search */}
          <div className="border-t border-slate-100 pt-3">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-black text-slate-800">
                💍 {te ? "కులం (Multi-Select Castes):" : "Castes (Multi-Select):"}
              </label>
              {filters.caste && (
                <button onClick={() => setF("caste", "")} className="text-[10.5px] text-maroon font-bold">
                  Reset
                </button>
              )}
            </div>

            {/* In-filter search box */}
            <input
              type="text"
              placeholder={te ? "🔍 కులం వెతకండి..." : "🔍 Search caste..."}
              value={casteSearch}
              onChange={(e) => setCasteSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs mb-2 focus:outline-none focus:ring-1 focus:ring-maroon"
            />

            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
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
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleMulti("caste", c)}
                        className="accent-[#7A0C2E] rounded"
                      />
                      <span className="font-bold text-[#7A0C2E] telugu">{CASTE_TELUGU[c] || c}</span>
                    </div>
                    <span className="text-[11px] text-slate-500 font-medium">({c})</span>
                  </label>
                );
              })}
            </div>

            {/* Dynamic Sub-castes */}
            {availableSubcastes.length > 0 && (
              <div className="mt-3 bg-amber-50/70 p-2.5 rounded-2xl border border-gold/30">
                <label className="block text-[11px] font-black text-maroon mb-1.5">
                  🪔 {te ? "ఉపకులాలు (Sub-Castes):" : "Sub-Castes:"}
                </label>
                <div className="max-h-32 overflow-y-auto space-y-1 pr-1">
                  {availableSubcastes.map((sc) => {
                    const checked = isMultiSelected("sub_caste", sc);
                    return (
                      <label key={sc} className="flex items-center gap-1.5 text-[11px] cursor-pointer text-slate-800">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleMulti("sub_caste", sc)}
                          className="accent-[#7A0C2E] rounded"
                        />
                        <span>{sc}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 3. Multi-Select District Filter with In-Search */}
          <div className="border-t border-slate-100 pt-3">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-black text-slate-800">
                📍 {te ? "జిల్లా / ప్రాంతం (Districts):" : "Districts (Multi-Select):"}
              </label>
              {filters.district && (
                <button onClick={() => setF("district", "")} className="text-[10.5px] text-maroon font-bold">
                  Reset
                </button>
              )}
            </div>

            {/* State selector pills */}
            <div className="flex gap-1 mb-2">
              {[
                { v: "", l: "All / అన్నీ" },
                { v: "TS", l: "🏛️ TS (33)" },
                { v: "AP", l: "🌊 AP (26)" },
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

            {/* Quick State Select All button */}
            <div className="flex items-center justify-between text-[11px] mb-2 px-0.5">
              <button
                type="button"
                onClick={filters.state === "AP" ? selectAllAP : selectAllTS}
                className="text-[#7A0C2E] font-bold hover:underline"
              >
                {filters.state === "AP" ? "✓ అన్ని 26 AP జిల్లాలు" : "✓ అన్ని 33 TS జిల్లాలు"}
              </button>
              {filters.district && (
                <button
                  type="button"
                  onClick={() => setF("district", "")}
                  className="text-slate-400 hover:text-rose-600"
                >
                  క్లియర్
                </button>
              )}
            </div>

            <input
              type="text"
              placeholder={te ? "🔍 జిల్లా వెతకండి (తెలుగు / Eng)..." : "🔍 Search district..."}
              value={districtSearch}
              onChange={(e) => setDistrictSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs mb-2 focus:outline-none focus:ring-1 focus:ring-maroon"
            />

            <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
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
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleMulti("district", d)}
                        className="accent-[#7A0C2E] rounded"
                      />
                      <span className="font-bold text-slate-800 telugu">{DISTRICT_TELUGU[d] || d}</span>
                    </div>
                    <span className="text-[11px] text-slate-500 font-medium">({d})</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* 4. Age Range Slider */}
          <div className="border-t border-slate-100 pt-3">
            <div className="flex items-center justify-between text-xs font-black text-slate-800 mb-1">
              <span>🎂 {te ? "వయస్సు (Age Range):" : "Age Range:"}</span>
              <span className="text-maroon">{filters.age_min} – {filters.age_max} yrs</span>
            </div>
            <div className="space-y-1 mt-2">
              <input
                type="range"
                min={18}
                max={60}
                value={filters.age_min}
                onChange={(e) => setF("age_min", Math.min(parseInt(e.target.value), filters.age_max))}
                className="w-full accent-[#7A0C2E]"
              />
              <input
                type="range"
                min={18}
                max={60}
                value={filters.age_max}
                onChange={(e) => setF("age_max", Math.max(parseInt(e.target.value), filters.age_min))}
                className="w-full accent-[#7A0C2E]"
              />
            </div>
          </div>

          {/* 5. Multi-Select Education */}
          <div className="border-t border-slate-100 pt-3">
            <label className="block text-xs font-black text-slate-800 mb-2">
              🎓 {te ? "చదువు (Education):" : "Education:"}
            </label>
            <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
              {["BTech", "MS", "MBBS", "MBA", "CA", "MTech", "BSc", "BCom", "MD", "PhD"].map((edu) => {
                const checked = isMultiSelected("education", edu);
                return (
                  <label key={edu} className="flex items-center gap-2 p-1 rounded-lg text-xs cursor-pointer text-slate-700">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleMulti("education", edu)}
                      className="accent-[#7A0C2E] rounded"
                    />
                    <span>{edu}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* 6. Multi-Select Job / Profession */}
          <div className="border-t border-slate-100 pt-3">
            <label className="block text-xs font-black text-slate-800 mb-2">
              💼 {te ? "ఉద్యోగం (Profession):" : "Occupation:"}
            </label>
            <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
              {["Software Engineer", "Doctor", "Govt Job", "Business", "Bank Manager", "Teacher", "Civil Engineer"].map((j) => {
                const checked = isMultiSelected("job", j);
                return (
                  <label key={j} className="flex items-center gap-2 p-1 rounded-lg text-xs cursor-pointer text-slate-700">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleMulti("job", j)}
                      className="accent-[#7A0C2E] rounded"
                    />
                    <span>{j}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* 7. Salary Chips */}
          <div className="border-t border-slate-100 pt-3">
            <label className="block text-xs font-black text-slate-800 mb-2">
              💰 {te ? "కనీస వార్షిక జీతం (Min Salary):" : "Min Salary:"}
            </label>
            <div className="flex flex-wrap gap-1.5">
              {[
                { v: 0, l: "Any" },
                { v: 600000, l: "₹6L+" },
                { v: 1000000, l: "₹10L+" },
                { v: 1500000, l: "₹15L+" },
                { v: 2500000, l: "₹25L+" },
                { v: 5000000, l: "₹50L+" },
              ].map((sal) => (
                <button
                  key={sal.v}
                  onClick={() => setF("salary_min", sal.v)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition ${
                    filters.salary_min === sal.v
                      ? "bg-maroon text-white border-maroon"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {sal.l}
                </button>
              ))}
            </div>
          </div>

          {/* 8. Astrology (Nakshatras & Dosham) */}
          <div className="border-t border-slate-100 pt-3">
            <label className="block text-xs font-black text-slate-800 mb-2">
              ⭐ {te ? "నక్షత్రాలు (Nakshatras):" : "Nakshatras:"}
            </label>
            <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
              {NAKSHATRAS.map((nak) => {
                const checked = isMultiSelected("star", nak.en);
                return (
                  <label key={nak.en} className="flex items-center gap-2 p-1 rounded-lg text-xs cursor-pointer text-slate-700">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleMulti("star", nak.en)}
                      className="accent-[#7A0C2E] rounded"
                    />
                    <span>{nak.te} ({nak.en})</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* 📍 Targeted District & State Wedding Services */}
          <div className="mt-4 pt-4 border-t border-slate-100">
            <DistrictAdBanner slot="matches_sidebar" district={filters.district} state={filters.state} />
          </div>
        </aside>

        {/* ================= MATCHES RESULTS FEED ================= */}
        <section className="min-w-0 space-y-4">
          
          {/* 🔔 SMART MATCH ALERTS & RE-ENGAGEMENT DIGEST BOX */}
          {smartAlerts && (
            <div className="bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-amber-500/10 border border-gold/40 rounded-3xl p-4 sm:p-5 card-shadow shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🔔</span>
                  <span className="text-xs font-black uppercase tracking-wider text-maroon">
                    {te ? "స్మార్ట్ మ్యాచ్ అలర్ట్ (Smart Match Digest)" : "Smart Match Alert"}
                  </span>
                  <span className="bg-rose-100 text-maroon text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-rose-200">
                    {smartAlerts.fresh_matches_count || 12}+ {te ? "కొత్త సంబంధాలు" : "New Matches"}
                  </span>
                </div>
                <p className="text-xs font-medium text-slate-700 leading-relaxed max-w-xl">
                  {te
                    ? smartAlerts.digest_message_telugu || "మీ ప్రిఫరెన్స్ ప్రకారం కొత్త సంబంధాలు సిద్ధంగా ఉన్నాయి. 90%+ వేద గుణమేళనం సరిపోలిక గల ప్రొఫైల్స్ ఉన్నాయి."
                    : smartAlerts.digest_message_en || "Fresh verified matches matching your profile are active with high Vedic compatibility."}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-stretch sm:self-auto">
                <a
                  href={smartAlerts.whatsapp_share_url || "https://wa.me/?text=Shubhalagnam+Matrimony"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl bg-[#25D366] text-white font-bold text-xs shadow-sm hover:brightness-105 active:scale-95 transition-all whitespace-nowrap"
                >
                  <span>📲</span>
                  <span>{te ? "వాట్సాప్ అలర్ట్ షేర్" : "WhatsApp Digest"}</span>
                </a>
                <button
                  onClick={() => setSort("porutham")}
                  className="inline-flex items-center justify-center gap-1 px-3.5 py-2.5 rounded-2xl bg-white border border-gold/40 text-maroon font-bold text-xs hover:bg-amber-50 transition-all whitespace-nowrap shadow-xs"
                >
                  <span>🪐</span>
                  <span>{te ? "గుణమేళనం క్రమం" : "Sort Gunamelanam"}</span>
                </button>
              </div>
            </div>
          )}

          {/* 🌟 PROFILE SPOTLIGHT / PROMOTIONAL ADS BANNER */}
          <div className="maroon-gradient rounded-3xl p-4 sm:p-5 text-white shadow-md relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="relative z-10 space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-lg">🌟</span>
                <span className="font-extrabold text-sm sm:text-base text-amber-200">
                  {te ? "ప్రొఫైల్ స్పాట్‌లైట్ బూస్ట్ — 10x ఎక్కువ సంబంధాలు" : "Profile Spotlight — 10x More Responses"}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-amber-100/90 leading-relaxed max-w-xl">
                {te
                  ? "మీ ప్రొఫైల్‌ను హోమ్‌పేజీ మరియు 52+ జిల్లాల ఛానళ్లలో టాప్‌లో ఉంచండి. ఫోటో & వీడియోతో ప్రత్యేక గుర్తింపు పొందండి."
                  : "Feature your profile with photo/video at the top of homepage and caste channels for faster marriage proposals."}
              </p>
            </div>
            <Link
              href="/spotlight"
              className="relative z-10 shrink-0 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full gold-gradient text-maroon font-black text-xs shadow-gold hover:scale-105 active:scale-95 transition-all self-stretch sm:self-auto text-center"
            >
              <span>⚡ {te ? "స్పాట్‌లైట్ ప్రారంభించండి (₹99)" : "Boost Profile (₹99)"}</span>
              <span>→</span>
            </Link>
          </div>

          <ProfileRail kind="recent" />

          {note && (
            <div className={`rounded-2xl px-4 py-3 text-xs font-bold border ${note.ok ? "bg-emerald-50 border-emerald-300 text-emerald-900" : "bg-amber-50 border-amber-300 text-amber-900"}`}>
              {note.text}
            </div>
          )}

          {/* Active Filter Tags Bar (Amazon/Flipkart Style) */}
          {activeChips.length > 0 && (
            <div className="bg-white rounded-2xl p-3 border border-gold/30 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                <span>⚡ {te ? "ఎంచుకున్న ఫిల్టర్లు:" : "Active Filters:"} ({activeChips.length})</span>
                <button
                  onClick={() => setFilters({ ...DEFAULT_FILTERS })}
                  className="text-maroon hover:underline text-[11px]"
                >
                  {te ? "అన్నీ తొలగించు (Clear All)" : "Clear All"}
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {activeChips.map((c) => (
                  <button
                    key={c.key}
                    onClick={c.clear}
                    className="inline-flex items-center gap-1.5 bg-amber-50 border border-gold/40 text-maroon text-xs font-bold px-3 py-1 rounded-full hover:bg-rose-50 hover:border-rose-300 transition"
                  >
                    <span>{c.label}</span>
                    <span className="text-slate-400 font-bold hover:text-rose-600">✕</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Results count header */}
          <div className="flex items-center justify-between text-xs text-slate-600 px-1">
            <span className="font-bold">
              {te ? `మొత్తం ${total} వెరిఫైడ్ సంబంధాలు సిద్ధంగా ఉన్నాయి` : `Showing ${total} Verified Matches`}
            </span>
            <span className="text-slate-400">⚡ Real-time synced</span>
          </div>

          {/* 📍 Targeted Local District Wedding Service Ad Banner */}
          <DistrictAdBanner
            slot="search_top"
            district={filters.district}
            state={filters.state}
            compact
          />

          {/* Match Cards List */}
          {loading ? (
            <div className="grid md:grid-cols-2 gap-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-3xl border border-gold/20 p-5 space-y-3 animate-pulse">
                  <div className="flex gap-3.5">
                    <div className="w-20 h-24 rounded-2xl bg-slate-200" />
                    <div className="flex-1 space-y-2 py-1">
                      <div className="h-4 bg-slate-200 rounded w-2/3" />
                      <div className="h-3 bg-slate-200 rounded w-1/2" />
                      <div className="h-3 bg-slate-200 rounded w-3/4" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center border border-gold/30 shadow-sm space-y-3">
              <div className="text-4xl">🔍</div>
              <h4 className="font-extrabold text-base text-navy">
                {te ? "ఈ ఫిల్టర్లకు సరిపడే సంబంధాలు లభించలేదు" : "No profiles found for these filters"}
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {te ? "దయచేసి వయస్సు పరిధిని పెంచడం లేదా జిల్లా ఫిల్టర్‌ను క్లియర్ చేయడం ద్వారా మరిన్ని సంబంధాలను చూడండి." : "Please broaden your filters or clear districts to see more profiles."}
              </p>
              <button
                onClick={() => setFilters({ ...DEFAULT_FILTERS })}
                className="mt-2 rounded-xl maroon-gradient text-white font-bold text-xs px-5 py-2.5 shadow-md hover-lift"
              >
                {te ? "ఫిల్టర్లు అన్నీ రీసెట్ చేయండి" : "Reset All Filters"}
              </button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {rows.map((row) => (
                <Card key={row.tsap_id} row={row} />
              ))}
            </div>
          )}

          {/* Bottom Ladder / Pricing info */}
          <div className="bg-white rounded-3xl p-5 border border-gold/30 card-shadow text-center space-y-2">
            <h4 className="font-black text-sm text-maroon">
              {te ? "మొదటి 3 సంబంధాలు 100% ఉచితం (FREE)" : "First 3 Interest Requests 100% FREE"}
            </h4>
            <p className="text-xs text-slate-600">
              {te ? "కేవలం ₹99 తో 5 సంబంధాల ఫోన్ నంబర్లు WhatsApp లో పొందండి • డిక్లైన్ అయితే రీఫండ్" : "Get 5 direct verified contact unlocks for just ₹99 • Full refund on decline"}
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <Link href="/pricing" className="rounded-xl gold-gradient text-maroon font-bold text-xs px-5 py-2.5 shadow-sm hover-lift">
                💰 {te ? "ప్లాన్లు చూడండి" : "View Plans"}
              </Link>
              <Link href="/register" className="rounded-xl maroon-gradient text-white font-bold text-xs px-5 py-2.5 shadow-sm hover-lift">
                📝 {te ? "ఉచిత నమోదు" : "Register Free"}
              </Link>
            </div>
          </div>
        </section>
      </div>

      {/* ================= MOBILE FLIPKART/MYNTRA STYLE FILTER DRAWER ================= */}
      {sheet && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end md:hidden animate-fade">
          <div className="bg-white rounded-t-3xl h-[85vh] flex flex-col overflow-hidden shadow-2xl border-t-2 border-gold">
            
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="font-black text-sm text-navy">⚡ {te ? "వడపోతలు (Filters)" : "Filters"}</span>
                {activeChips.length > 0 && (
                  <span className="bg-maroon text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {activeChips.length}
                  </span>
                )}
              </div>
              <button
                onClick={() => setSheet(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600"
              >
                ✕
              </button>
            </div>

            {/* Split Screen: Left Category Tabs, Right Checkboxes */}
            <div className="flex-1 flex overflow-hidden">
              
              {/* Left Category Navigation */}
              <div className="w-1/3 bg-slate-50 border-r border-slate-200 overflow-y-auto text-xs font-bold text-slate-600">
                {[
                  { k: "caste" as const, l: te ? "కులాలు" : "Castes" },
                  { k: "district" as const, l: te ? "జిల్లాలు" : "Districts" },
                  { k: "education" as const, l: te ? "చదువు" : "Education" },
                  { k: "job" as const, l: te ? "ఉద్యోగం" : "Profession" },
                  { k: "astro" as const, l: te ? "నక్షత్రాలు" : "Astro" },
                  { k: "more" as const, l: te ? "మరిన్ని" : "More" },
                ].map((tab) => (
                  <button
                    key={tab.k}
                    onClick={() => setMobileFilterTab(tab.k)}
                    className={`w-full text-left p-3.5 border-b border-slate-200 transition ${
                      mobileFilterTab === tab.k ? "bg-white text-maroon font-black border-l-4 border-l-maroon" : ""
                    }`}
                  >
                    {tab.l}
                  </button>
                ))}
              </div>

              {/* Right Content Area */}
              <div className="flex-1 p-4 overflow-y-auto bg-white space-y-3">
                {mobileFilterTab === "caste" && (
                  <div>
                    <input
                      type="text"
                      placeholder={te ? "🔍 కులం వెతకండి..." : "🔍 Search caste..."}
                      value={casteSearch}
                      onChange={(e) => setCasteSearch(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs mb-3"
                    />
                    <div className="space-y-2">
                      {filteredCastesList.map((c) => (
                        <label key={c} className="flex items-center justify-between text-xs cursor-pointer text-slate-800 py-1">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isMultiSelected("caste", c)}
                              onChange={() => toggleMulti("caste", c)}
                              className="accent-[#7A0C2E] rounded w-4 h-4"
                            />
                            <span className="font-bold text-[#7A0C2E] telugu">{CASTE_TELUGU[c] || c}</span>
                          </div>
                          <span className="text-[11px] text-slate-500 font-medium">({c})</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {mobileFilterTab === "district" && (
                  <div>
                    {/* Quick State selector pills in mobile drawer */}
                    <div className="flex gap-1 mb-2.5">
                      {[
                        { v: "", l: "All / అన్నీ" },
                        { v: "TS", l: "🏛️ TS (33)" },
                        { v: "AP", l: "🌊 AP (26)" },
                      ].map((st) => (
                        <button
                          key={st.v}
                          onClick={() => setF("state", st.v)}
                          className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg border text-center transition ${
                            filters.state === st.v ? "bg-maroon text-white border-maroon" : "bg-slate-50 text-slate-700 border-slate-200"
                          }`}
                        >
                          {st.l}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center justify-between text-[11px] mb-2 px-0.5">
                      <button
                        type="button"
                        onClick={filters.state === "AP" ? selectAllAP : selectAllTS}
                        className="text-[#7A0C2E] font-bold underline"
                      >
                        {filters.state === "AP" ? "✓ అన్ని AP జిల్లాలు" : "✓ అన్ని TS జిల్లాలు"}
                      </button>
                      {filters.district && (
                        <button
                          type="button"
                          onClick={() => setF("district", "")}
                          className="text-rose-600 font-semibold"
                        >
                          క్లియర్
                        </button>
                      )}
                    </div>

                    <input
                      type="text"
                      placeholder={te ? "🔍 జిల్లా వెతకండి..." : "🔍 Search district..."}
                      value={districtSearch}
                      onChange={(e) => setDistrictSearch(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs mb-3"
                    />
                    <div className="space-y-2">
                      {filteredDistrictsList.map((d) => (
                        <label key={d} className="flex items-center justify-between text-xs cursor-pointer text-slate-800 py-1">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isMultiSelected("district", d)}
                              onChange={() => toggleMulti("district", d)}
                              className="accent-[#7A0C2E] rounded w-4 h-4"
                            />
                            <span className="font-bold text-slate-800 telugu">{DISTRICT_TELUGU[d] || d}</span>
                          </div>
                          <span className="text-[11px] text-slate-500 font-medium">({d})</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {mobileFilterTab === "education" && (
                  <div className="space-y-2">
                    {["BTech", "MS", "MBBS", "MBA", "CA", "MTech", "BSc", "BCom", "MD", "PhD"].map((edu) => (
                      <label key={edu} className="flex items-center gap-2 text-xs cursor-pointer text-slate-800">
                        <input
                          type="checkbox"
                          checked={isMultiSelected("education", edu)}
                          onChange={() => toggleMulti("education", edu)}
                          className="accent-[#7A0C2E] rounded w-4 h-4"
                        />
                        <span>{edu}</span>
                      </label>
                    ))}
                  </div>
                )}

                {mobileFilterTab === "job" && (
                  <div className="space-y-2">
                    {["Software Engineer", "Doctor", "Govt Job", "Business", "Bank Manager", "Teacher"].map((j) => (
                      <label key={j} className="flex items-center gap-2 text-xs cursor-pointer text-slate-800">
                        <input
                          type="checkbox"
                          checked={isMultiSelected("job", j)}
                          onChange={() => toggleMulti("job", j)}
                          className="accent-[#7A0C2E] rounded w-4 h-4"
                        />
                        <span>{j}</span>
                      </label>
                    ))}
                  </div>
                )}

                {mobileFilterTab === "astro" && (
                  <div className="space-y-2">
                    {NAKSHATRAS.map((nak) => (
                      <label key={nak.en} className="flex items-center justify-between text-xs cursor-pointer text-slate-800 py-1">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isMultiSelected("star", nak.en)}
                            onChange={() => toggleMulti("star", nak.en)}
                            className="accent-[#7A0C2E] rounded w-4 h-4"
                          />
                          <span className="font-bold text-[#7A0C2E] telugu">{nak.te}</span>
                        </div>
                        <span className="text-[11px] text-slate-500 font-medium">({nak.en})</span>
                      </label>
                    ))}
                  </div>
                )}

                {mobileFilterTab === "more" && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">వయస్సు పరిధి</label>
                      <div className="text-xs text-maroon font-bold mb-1">{filters.age_min} - {filters.age_max} yrs</div>
                      <input
                        type="range"
                        min={18}
                        max={60}
                        value={filters.age_max}
                        onChange={(e) => setF("age_max", parseInt(e.target.value))}
                        className="w-full accent-[#7A0C2E]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">వైవాహిక స్థితి</label>
                      {["Pelli Kaledu", "Divorced", "Widow"].map((m) => (
                        <button
                          key={m}
                          onClick={() => setF("marital_status", filters.marital_status === m ? "" : m)}
                          className={`block w-full text-left p-2 rounded-xl text-xs mb-1 border ${filters.marital_status === m ? "bg-maroon text-white" : "bg-slate-50"}`}
                        >
                          {m === "Pelli Kaledu" ? "Never Married" : m}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Sticky Action Bar */}
            <div className="p-3 bg-white border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
              <button
                onClick={() => setFilters({ ...DEFAULT_FILTERS })}
                className="py-3 px-4 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold"
              >
                {te ? "అన్నీ క్లియర్" : "Reset"}
              </button>
              <button
                onClick={() => setSheet(false)}
                className="flex-1 py-3 px-4 rounded-xl maroon-gradient text-white text-xs font-black shadow-md"
              >
                {te ? `ఫిల్టర్లు వర్తించు (${total} సంబంధాలు)` : `Apply Filters (${total} Matches)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {needsLogin ? (
        <div className="mx-auto mt-6 max-w-3xl px-4">
          <AuthGate
            title={te ? "🔒 Shortlist / saved searches కి login చెయ్యండి" : "🔒 Login for shortlist / saved searches"}
            note={te ? "Matches చూడటం FREE. Shortlist మరియు అలర్ట్స్ కోసం లాగిన్ అవ్వండి." : "Browsing is free."}
          />
        </div>
      ) : null}
    </main>
  );
}
