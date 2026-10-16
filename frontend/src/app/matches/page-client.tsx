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
import Image from "next/image";
import {
  CASTES,
  CASTE_SUBCASTES,
  CASTE_TELUGU,
  DISTRICTS_BY_STATE,
  DISTRICT_TELUGU,
  EDUCATIONS,
  EDUCATION_TELUGU,
  HEIGHTS,
  MARITAL_STATUS_FILTER_OPTIONS,
  CHILDREN_FILTER_OPTIONS,
  isNeverMarriedStatus,
  NAKSHATRAS,
  RASIS,
  RELIGIONS,
  SALARIES_DETAILED,
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
import { DEFAULT_MATCH_FILTERS, parseMatchFilters } from "@/lib/match-filter-query.mjs";
import { REASON_DISCLAIMER, matchReasons, relaxSuggestions, widenedAgeLabel } from "@/lib/match-reasons.mjs";
import { summarizeSavedSearch } from "@/lib/saved-search-summary.mjs";
import ProfileRail from "@/components/ProfileRail";
import { mergeMatchPages } from "@/lib/match-results.mjs";
import QuickLead from "@/components/QuickLead";
import { useSession } from "@/lib/auth";
import { apiDisplayMessage, apiFetch, apiGet, apiPost, authHeaders, readApiJson } from "@/lib/api";
import { firstName } from "@/lib/names";
import TopPicks from "@/components/TopPicks";
import { Duo, duo } from "@/lib/duo";
import { useLang } from "@/lib/lang";
import DistrictAdBanner from "@/components/DistrictAdBanner";
import QuickUnlockModal from "@/components/QuickUnlockModal";
import WhatsAppProposalModal from "@/components/WhatsAppProposalModal";

type Row = Record<string, any>;
type SaveNotice = { tone: "success" | "error"; text: string; needsLogin?: boolean; canRetry?: boolean; showShortlist?: boolean };
type SavedSearchItem = { search_id: string; name: string; filters: Row; alert?: boolean; alert_consent_at?: string; new_matches?: number; created_at?: string };
type SavedSearchNotice = { tone: "success" | "error"; text: string; canRetry?: boolean };

function maritalFilterValues(value: unknown): string[] {
  return String(value ?? "").split(",").map((status) => status.trim()).filter(Boolean);
}

function hasChildrenRelevantMaritalFilter(value: unknown): boolean {
  return maritalFilterValues(value).some((status) => !isNeverMarriedStatus(status));
}

function isMaritalFilterOptionSelected(selected: unknown, optionValue: string): boolean {
  const values = maritalFilterValues(selected);
  return isNeverMarriedStatus(optionValue)
    ? values.some(isNeverMarriedStatus)
    : values.some((status) => status.toLowerCase() === optionValue.toLowerCase());
}

function recordedCheckBadge(profile: Row, te: boolean) {
  const raw = String(profile?.verification || profile?.verification_level || "").toLowerCase();
  const level = ["phone", "photo", "id"].includes(raw)
    ? raw
    : profile?.id_verified ? "id" : profile?.photo_verified ? "photo" : profile?.phone_verified ? "phone" : "";
  if (level === "phone") return { icon: "📱", label: te ? "ఫోన్ OTP" : "Phone OTP", title: te ? "OTP ఈ phone number వినియోగాన్ని మాత్రమే నిర్ధారిస్తుంది." : "OTP confirms access to this phone number only." };
  if (level === "photo") return { icon: "📷", label: te ? "ఫోటో review" : "Photo review", title: te ? "సమర్పించిన ఫోటో review మాత్రమే; identity లేదా liveness check కాదు." : "Review of the submitted photo only; not an identity or liveness check." };
  if (level === "id") return { icon: "🪪", label: te ? "ID review" : "ID review", title: te ? "ప్రభుత్వ ID review status మాత్రమే; ఇతర profile వివరాలు నిర్ధారించబడవు." : "Government ID review status only; other profile details are not verified." };
  return null;
}
const MATCH_PAGE_SIZE = 24;
const SALARY_CEILING_FILTERS = [
  { value: 0, en: "Any", te: "ఏదైనా" },
  { value: 500_000, en: "Up to ₹5 Lakhs", te: "₹5 లక్షల వరకు" },
  { value: 1_000_000, en: "Up to ₹10 Lakhs", te: "₹10 లక్షల వరకు" },
  { value: 2_000_000, en: "Up to ₹20 Lakhs", te: "₹20 లక్షల వరకు" },
  { value: 5_000_000, en: "Up to ₹50 Lakhs", te: "₹50 లక్షల వరకు" },
  { value: 10_000_000, en: "Up to ₹1 Crore", te: "₹1 కోటి వరకు" },
] as const;

function salaryAmountLabel(amount: number, te: boolean): string {
  if (amount <= 0) return te ? "ఏదైనా" : "Any";
  const lakhs = amount / 100_000;
  if (lakhs >= 100) {
    const crores = lakhs / 100;
    const formatted = Number.isInteger(crores) ? String(crores) : crores.toFixed(1);
    return `₹${formatted}${te ? " కోట్లు" : "Cr"}`;
  }
  const formatted = Number.isInteger(lakhs) ? String(lakhs) : lakhs.toFixed(1);
  return `₹${formatted}${te ? " లక్షలు" : "L"}`;
}

const SORTS = [
  { v: "new", l: "🆕 Recently added", lTe: "🆕 ఇటీవల జోడించినవి" },
  { v: "age", l: "🎂 Age (low to high)", lTe: "🎂 వయసు (తక్కువ నుండి)" },
  { v: "boosted", l: "📣 Promoted", lTe: "📣 ప్రమోట్ చేసినవి" },
];

const DEFAULT_FILTERS: Row = DEFAULT_MATCH_FILTERS;

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
  const { tsapId: myTsapId, token: sessionToken, ready: sessionReady } = useSession();
  const displayProfileValue = (value: unknown) => {
    const text = String(value ?? "").trim();
    return te ? text : apiDisplayMessage({ message_en: text }, false, "");
  };
  const displayMaritalStatus = (value: unknown) => {
    const normalized = String(value ?? "").trim().toLowerCase();
    if (!te) {
      if (["pelli kaledu", "never married", "single"].includes(normalized)) return "Never married";
      if (["vivaha bandham", "married"].includes(normalized)) return "Married";
      if (["widow", "widower", "widowed", "vithanthuvu", "vidava"].includes(normalized)) return "Widowed";
      if (["awaiting divorce", "divorce pending"].includes(normalized)) return "Divorce pending";
      if (["divorced", "separated"].includes(normalized)) return normalized.replace(/^\\w/, (letter) => letter.toUpperCase());
    }
    return displayProfileValue(value);
  };

  const [filters, setFilters] = useState<Row>(DEFAULT_FILTERS);
  const [sort, setSort] = useState<string>("new");
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [nextOffset, setNextOffset] = useState(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchPending, setSearchPending] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState(false);
  const [requestError, setRequestError] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [savedLoaded, setSavedLoaded] = useState(false);
  const [savedLoadAttempt, setSavedLoadAttempt] = useState(0);
  const [savingId, setSavingId] = useState("");
  const [saveNotice, setSaveNotice] = useState<SaveNotice | null>(null);
  const [savedSearches, setSavedSearches] = useState<SavedSearchItem[]>([]);
  const [savedSearchesLoaded, setSavedSearchesLoaded] = useState(false);
  const [savedSearchesLoadError, setSavedSearchesLoadError] = useState(false);
  const [savedSearchLoadAttempt, setSavedSearchLoadAttempt] = useState(0);
  const [savedSearchPanelOpen, setSavedSearchPanelOpen] = useState(false);
  const [saveSearchDialogOpen, setSaveSearchDialogOpen] = useState(false);
  const [saveSearchName, setSaveSearchName] = useState("");
  const [savingSearch, setSavingSearch] = useState(false);
  const [savedSearchNotice, setSavedSearchNotice] = useState<SavedSearchNotice | null>(null);
  const [confirmDeleteSearchId, setConfirmDeleteSearchId] = useState("");
  const [deletingSearchId, setDeletingSearchId] = useState("");
  const [turningOffAlertId, setTurningOffAlertId] = useState("");
  const [sheet, setSheet] = useState<boolean>(false);
  const [unlockTarget, setUnlockTarget] = useState<Row | null>(null);
  const [proposalTarget, setProposalTarget] = useState<Row | null>(null);

  // In-filter search state
  const [casteSearch, setCasteSearch] = useState("");
  const [districtSearch, setDistrictSearch] = useState("");
  const [educationSearch, setEducationSearch] = useState("");
  const [mobileFilterTab, setMobileFilterTab] = useState<"basic" | "caste" | "location" | "career" | "astro">("basic");

  const reqId = useRef(0);
  const matchesAbortRef = useRef<AbortController | null>(null);

  // Hydrate every supported filter from the submitted search URL on mount.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const initial: Row = parseMatchFilters(window.location.search);
    if (!hasChildrenRelevantMaritalFilter(initial.marital_status)) initial.children = "";
    setFilters(initial);
  }, []);

  // Shortlist state belongs to the authenticated account, never localStorage.
  // This avoids a heart icon that only looked saved until navigation/reload and
  // keeps private member preferences out of a second browser-side data store.
  useEffect(() => {
    if (!sessionReady) return;
    let active = true;
    if (!myTsapId || !sessionToken) {
      setSavedIds([]);
      setSaveNotice(null);
      setSavedLoaded(true);
      return () => { active = false; };
    }

    setSavedLoaded(false);
    setSaveNotice(null);
    apiGet<{ saved?: Array<{ profile?: { tsap_id?: string } }> }>(
      `/api/saved/${encodeURIComponent(myTsapId)}`,
    ).then(({ ok, data, needsLogin }) => {
      if (!active) return;
      if (!ok || !Array.isArray(data?.saved)) {
        setSaveNotice({
          tone: "error",
          text: needsLogin
            ? (te ? "మీ shortlist చూడటానికి మళ్లీ login చేయండి." : "Sign in again to load your shortlist.")
            : (te ? "Shortlist లోడ్ కాలేదు. మళ్లీ ప్రయత్నించండి." : "Could not load your shortlist. Please retry."),
          needsLogin,
          canRetry: !needsLogin,
        });
        return;
      }
      setSavedIds(data.saved.map((item) => String(item.profile?.tsap_id || "").trim()).filter(Boolean));
      setSavedLoaded(true);
    }).catch(() => {
      if (!active) return;
      setSaveNotice({
        tone: "error",
        text: te ? "Shortlist లోడ్ కాలేదు. మళ్లీ ప్రయత్నించండి." : "Could not load your shortlist. Please retry.",
        canRetry: true,
      });
    });

    return () => { active = false; };
  }, [myTsapId, savedLoadAttempt, sessionReady, sessionToken, te]);

  useEffect(() => {
    if (!sessionReady) return;
    let active = true;
    if (!myTsapId || !sessionToken) {
      setSavedSearches([]);
      setSavedSearchesLoaded(true);
      setSavedSearchesLoadError(false);
      setSavedSearchNotice(null);
      return () => { active = false; };
    }

    setSavedSearchesLoaded(false);
    setSavedSearchesLoadError(false);
    setSavedSearches([]);
    setSavedSearchNotice(null);
    apiGet<{ searches?: SavedSearchItem[] }>(`/api/saved-searches/${encodeURIComponent(myTsapId)}`)
      .then(({ ok, data, needsLogin, errorTelugu }) => {
        if (!active) return;
        if (!ok || !Array.isArray(data?.searches)) {
          setSavedSearchesLoadError(true);
          setSavedSearchNotice({
            tone: "error",
            text: errorTelugu || (needsLogin
              ? (te ? "సేవ్ చేసిన searches చూడటానికి మళ్లీ login చేయండి." : "Sign in again to load saved searches.")
              : (te ? "Saved searches లోడ్ కాలేదు. మళ్లీ ప్రయత్నించండి." : "Could not load saved searches. Please retry.")),
            canRetry: !needsLogin,
          });
          return;
        }
        setSavedSearchesLoadError(false);
        setSavedSearches(data.searches);
      })
      .catch(() => {
        if (!active) return;
        setSavedSearchesLoadError(true);
        setSavedSearchNotice({
          tone: "error",
          text: te ? "Saved searches లోడ్ కాలేదు. మళ్లీ ప్రయత్నించండి." : "Could not load saved searches. Please retry.",
          canRetry: true,
        });
      })
      .finally(() => { if (active) setSavedSearchesLoaded(true); });

    return () => { active = false; };
  }, [myTsapId, savedSearchLoadAttempt, sessionReady, sessionToken, te]);

  const [prefLoading, setPrefLoading] = useState(false);
  const [prefApplied, setPrefApplied] = useState(false);

  const applySavedPreferences = async () => {
    try {
      const myId = myTsapId;
      if (!sessionReady || !sessionToken || !myId) {
        alert(te ? "మీరు సేవ్ చేసిన ప్రాధాన్యతలను లోడ్ చేయడానికి ముందుగా లాగిన్ అవ్వండి లేదా నమోదు చేసుకోండి." : "Sign in or register to load your saved preferences.");
        return;
      }
      setPrefLoading(true);
      // 🛡️ P0 security fix: /api/profile/preferences now requires the owner's token.
      const res = await fetch(`/api/profile/preferences?tsap_id=${encodeURIComponent(myId)}`, { headers: authHeaders() });
      const data = await readApiJson(res);
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
          children: "",
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
    setFilters((prev) => {
      if (key === "marital_status") {
        return {
          ...prev,
          marital_status: val,
          ...(hasChildrenRelevantMaritalFilter(val) ? {} : { children: "" }),
        };
      }
      return { ...prev, [key]: val };
    });
  };

  const setRangeFilter = (key: "salary_min" | "salary_max" | "height_min" | "height_max", value: number | string) => {
    setFilters((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "salary_min" || key === "salary_max") {
        const min = Number(next.salary_min || 0);
        const max = Number(next.salary_max || 0);
        if (min > 0 && max > 0 && min > max) {
          if (key === "salary_min") next.salary_max = 0;
          else next.salary_min = 0;
        }
      } else {
        const minIndex = HEIGHTS.indexOf(String(next.height_min || ""));
        const maxIndex = HEIGHTS.indexOf(String(next.height_max || ""));
        if (minIndex >= 0 && maxIndex >= 0 && minIndex > maxIndex) {
          if (key === "height_min") next.height_max = value;
          else next.height_min = value;
        }
      }
      return next;
    });
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

  const visibleSubcastes = useMemo(() => {
    const selected = String(filters.sub_caste || "").split(",").map((value) => value.trim()).filter(Boolean);
    return sortUniqueOptions([...availableSubcastes, ...selected]);
  }, [availableSubcastes, filters.sub_caste]);

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

  const filteredEducationsList = useMemo(() => {
    if (!educationSearch) return EDUCATIONS;
    const q = educationSearch.trim().toLowerCase();
    return EDUCATIONS.filter((education) =>
      education.toLowerCase().includes(q) || (EDUCATION_TELUGU[education] || "").toLowerCase().includes(q),
    );
  }, [educationSearch]);

  const selectAllTS = () => {
    setF("state", "TS");
    setF("district", TS_DISTRICTS.join(","));
  };

  const selectAllAP = () => {
    setF("state", "AP");
    setF("district", AP_DISTRICTS.join(","));
  };

  // Active filter tags for chip bar
  const activeChips = (() => {
    const chips: { key: string; label: string; clear: () => void }[] = [];
    if (filters.gender) {
      chips.push({
        key: "gender",
        label: filters.gender === "Bride" ? (te ? "👰 వధువులు" : "👰 Brides") : (te ? "🤵 వరులు" : "🤵 Grooms"),
        clear: () => setF("gender", ""),
      });
    }
    if (filters.q) {
      chips.push({
        key: "keyword",
        label: `🔍 ${String(filters.q).trim()}`,
        clear: () => setF("q", ""),
      });
    }
    if (filters.religion) {
      chips.push({
        key: "religion",
        label: `${te ? "🕊️ మతం" : "🕊️ Religion"}: ${filters.religion}`,
        clear: () => setF("religion", ""),
      });
    }
    if (filters.caste) {
      String(filters.caste)
        .split(",")
        .forEach((c) => {
          if (c.trim()) {
            chips.push({
              key: `caste_${c}`,
              label: `💍 ${te ? (CASTE_TELUGU[c.trim()] || c.trim()) : c.trim()}`,
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
              label: `📍 ${te ? (DISTRICT_TELUGU[d.trim()] || d.trim()) : d.trim()}`,
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
    if (filters.children) {
      chips.push({
        key: "children",
        label: `👶 ${filters.children}`,
        clear: () => setF("children", ""),
      });
    }
    if (filters.education) {
      String(filters.education)
        .split(",")
        .forEach((e) => {
          if (e.trim()) {
            chips.push({
              key: `edu_${e}`,
              label: `🎓 ${te ? (EDUCATION_TELUGU[e.trim()] || e.trim()) : e.trim()}`,
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
        label: te ? "ఫోన్ OTP / ఫోటో / ID సమీక్ష నమోదు" : "Phone OTP, photo or government ID review recorded",
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
        key: "salary_min",
        label: `💰 ${salaryAmountLabel(Number(filters.salary_min), te)}+`,
        clear: () => setF("salary_min", 0),
      });
    }
    if (filters.salary_max > 0) {
      chips.push({
        key: "salary_max",
        label: `💰 ${te ? "వరకు" : "Up to"} ${salaryAmountLabel(Number(filters.salary_max), te)}`,
        clear: () => setF("salary_max", 0),
      });
    }
    if (filters.height_min || filters.height_max) {
      chips.push({
        key: "height",
        label: `📏 ${filters.height_min ? heightLabel(String(filters.height_min)) : (te ? "ఏదైనా" : "Any")} – ${filters.height_max ? heightLabel(String(filters.height_max)) : (te ? "ఏదైనా" : "Any")}`,
        clear: () => { setF("height_min", ""); setF("height_max", ""); },
      });
    }
    if (filters.rasi) {
      const rasiNames = String(filters.rasi).split(",").map((value) => RASIS.find((item) => item.en.toLowerCase() === value.trim().toLowerCase())?.display || value.trim());
      chips.push({
        key: "rasi",
        label: `🌙 ${rasiNames.join(", ")}`,
        clear: () => setF("rasi", ""),
      });
    }
    if (filters.star) {
      String(filters.star).split(",").forEach((star) => {
        if (star.trim()) {
          const match = NAKSHATRAS.find((item) => item.en.toLowerCase() === star.trim().toLowerCase());
          chips.push({
            key: `star_${star}`,
            label: `⭐ ${te && match ? `${match.te} (${match.en})` : star.trim()}`,
            clear: () => toggleMulti("star", star.trim()),
          });
        }
      });
    }
    if (filters.dosham) {
      chips.push({
        key: "dosham",
        label: `🪔 ${te ? "దోషం" : "Dosham"}: ${filters.dosham}`,
        clear: () => setF("dosham", ""),
      });
    }
    return chips;
  })();

  const hasSearchCriteria = Object.entries(filters).some(([key, value]) => {
    if (key === "age_min" || key === "age_max") return value !== DEFAULT_FILTERS[key];
    if (typeof value === "boolean") return value;
    return value !== "" && value !== null && value !== undefined && value !== 0;
  });

  // Fetch a small first page so mobile does not render a wall of 100 profile cards.
  // Additional pages are requested only when the member asks to continue.
  const fetchMatches = useCallback(async (offset = 0, append = false) => {
    const curId = ++reqId.current;
    matchesAbortRef.current?.abort();
    const controller = new AbortController();
    matchesAbortRef.current = controller;
    const timeoutId = setTimeout(() => controller.abort(), 15_000);
    if (append) {
      setLoadingMore(true);
      setLoadMoreError(false);
    } else {
      setLoading(true);
      setSearchPending(true);
      setLoadingMore(false);
      setLoadMoreError(false);
      setRequestError(false);
      setRows([]);
      setTotal(0);
      setNextOffset(0);
    }

    try {
      const q = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== "" && v !== null && v !== undefined && v !== false && v !== 0) {
          q.set(k, String(v));
        }
      });
      q.set("sort", sort);
      q.set("limit", String(MATCH_PAGE_SIZE));
      q.set("offset", String(offset));

      const r = await fetch(`/api/search?${q.toString()}`, { headers: authHeaders(), signal: controller.signal });
      if (!r.ok) throw new Error("Failed to fetch matches");
      const data = await readApiJson(r);
      const results = Array.isArray(data.results)
        ? data.results
        : Array.isArray(data.profiles)
          ? data.profiles
          : [];
      const resultTotal = typeof data.total === "number" ? data.total : offset + results.length;
      if (curId === reqId.current) {
        setRows((previous) => append ? mergeMatchPages(previous, results) : results);
        setTotal(resultTotal);
        setNextOffset(results.length === 0 ? resultTotal : offset + results.length);
      }
    } catch {
      if (curId === reqId.current) {
        if (append) {
          setLoadMoreError(true);
        } else {
          // Never substitute invented/demo profiles for real search results.
          setRows([]);
          setTotal(0);
          setNextOffset(0);
          setRequestError(true);
        }
      }
    } finally {
      clearTimeout(timeoutId);
      if (curId === reqId.current) {
        if (!append) {
          setLoading(false);
          setSearchPending(false);
        }
        setLoadingMore(false);
        if (matchesAbortRef.current === controller) matchesAbortRef.current = null;
      }
    }
  }, [filters, sort]);

  useEffect(() => {
    setSearchPending(true);
    setLoadingMore(false);
    setLoadMoreError(false);
    const t = setTimeout(() => { void fetchMatches(0, false); }, 300);
    return () => {
      clearTimeout(t);
      reqId.current += 1;
      matchesAbortRef.current?.abort();
      matchesAbortRef.current = null;
    };
  }, [fetchMatches]);

  const clearAllFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  // One-tap widening from the empty state: merging the patch is enough,
  // the debounced fetch effect re-runs on the new filter state.
  const applyFilterPatch = (patch: Record<string, string | number | boolean>) => {
    setFilters((previous) => ({ ...previous, ...patch }));
  };

  const beginSaveSearch = () => {
    if (!sessionReady || !myTsapId || !sessionToken) return;
    setSavedSearchNotice(null);
    setSaveSearchName(`${te ? "నా శోధన" : "My search"} ${savedSearches.length + 1}`);
    setSaveSearchDialogOpen(true);
  };

  const saveCurrentSearch = async () => {
    const name = saveSearchName.trim();
    if (!name || name.length < 2) {
      setSavedSearchNotice({ tone: "error", text: te ? "పేరును కనీసం 2 అక్షరాలతో నమోదు చేయండి." : "Enter a search name with at least 2 characters." });
      return;
    }
    if (savedSearches.length >= 20) {
      setSavedSearchNotice({ tone: "error", text: te ? "గరిష్ఠంగా 20 saved searches మాత్రమే ఉంచవచ్చు." : "You can keep up to 20 saved searches." });
      return;
    }
    if (!sessionReady || !myTsapId || !sessionToken) {
      setSavedSearchNotice({ tone: "error", text: te ? "ఈ search‌ను save చేయడానికి login చేయండి." : "Sign in to save this search." });
      return;
    }

    setSavingSearch(true);
    setSavedSearchNotice(null);
    try {
      const { ok, data, needsLogin, errorTelugu } = await apiFetch<{ success?: boolean; search?: SavedSearchItem }>("/api/saved-searches", {
        method: "POST",
        retries: 0,
        body: {
          tsap_id: myTsapId,
          name,
          filters,
          alert: false,
        },
      });
      if (!ok || !data?.success || !data.search?.search_id) {
        setSavedSearchNotice({
          tone: "error",
          text: errorTelugu || (needsLogin
            ? (te ? "మళ్లీ login చేసి ప్రయత్నించండి." : "Sign in again and retry.")
            : apiDisplayMessage(data, te, te ? "Search‌ను save చేయలేకపోయాం." : "Could not save this search.")),
        });
        return;
      }
      setSavedSearches((current) => [data.search!, ...current.filter((item) => item.search_id !== data.search!.search_id)]);
      setSaveSearchDialogOpen(false);
      setSavedSearchPanelOpen(true);
      setSavedSearchNotice({
        tone: "success",
        text: te ? "Search మీ ఖాతాలో మాత్రమే save అయ్యింది. Notifications ఆఫ్‌లో ఉన్నాయి." : "Search saved privately to your account. Notifications are off.",
      });
    } catch {
      setSavedSearchNotice({ tone: "error", text: te ? "Search‌ను save చేయలేకపోయాం. మళ్లీ ప్రయత్నించండి." : "Could not save this search. Please try again." });
    } finally {
      setSavingSearch(false);
    }
  };

  const applySavedSearch = useCallback((savedSearch: SavedSearchItem) => {
    const params = new URLSearchParams();
    Object.entries(savedSearch.filters || {}).forEach(([key, value]) => {
      if (Object.prototype.hasOwnProperty.call(DEFAULT_FILTERS, key) && value !== null && value !== undefined && value !== "") {
        params.set(key, String(value));
      }
    });
    const next = parseMatchFilters(params) as Row;
    if (!hasChildrenRelevantMaritalFilter(next.marital_status)) next.children = "";
    setFilters(next);
    setSort("new");
    setSavedSearchPanelOpen(false);
    setConfirmDeleteSearchId("");
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams();
      Object.entries(next).forEach(([key, value]) => {
        if (value === "" || value === null || value === undefined || value === false || value === 0) return;
        if ((key === "age_min" || key === "age_max") && value === DEFAULT_FILTERS[key]) return;
        urlParams.set(key, String(value));
      });
      const query = urlParams.toString();
      window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`);
    }
  }, []);

  // 🔔 Deep link from a WhatsApp alert or the saved-search workspace:
  // /matches?search=<id> applies that saved search once, then drops the param.
  const [deepLinkApplied, setDeepLinkApplied] = useState("");
  useEffect(() => {
    if (!savedSearchesLoaded || deepLinkApplied) return;
    if (typeof window === "undefined") return;
    const requested = new URLSearchParams(window.location.search).get("search");
    if (!requested) return;
    setDeepLinkApplied(requested);
    const match = savedSearches.find((row) => String(row.search_id) === requested);
    if (match) {
      applySavedSearch(match);
      setSavedSearchNotice({
        tone: "success",
        text: `${te ? "మీ saved search వర్తించబడింది" : "Applied your saved search"}: ${match.name || (te ? "సేవ్ చేసిన శోధన" : "Saved search")}`,
      });
    } else {
      setSavedSearchNotice({
        tone: "error",
        text: te ? "ఆ saved search ఇక లేదు — మీ saved searches నుంచి ఒకటి ఎంచుకోండి." : "That saved search no longer exists — pick one from your saved searches.",
      });
    }
  }, [savedSearchesLoaded, savedSearches, deepLinkApplied, te, applySavedSearch]);

  const turnOffSavedSearchAlerts = async (savedSearch: SavedSearchItem) => {
    if (!myTsapId || !sessionToken || !savedSearch.search_id) return;
    setTurningOffAlertId(savedSearch.search_id);
    setSavedSearchNotice(null);
    try {
      const { ok, data, errorTelugu } = await apiFetch<{ alert_enabled?: boolean }>(
        `/api/saved-searches/${encodeURIComponent(myTsapId)}/${encodeURIComponent(savedSearch.search_id)}`,
        { method: "PUT", body: { alert: false } },
      );
      if (!ok || data?.alert_enabled !== false) {
        setSavedSearchNotice({ tone: "error", text: errorTelugu || (te ? "Notifications ఆఫ్ చేయలేకపోయాం." : "Could not turn off notifications.") });
        return;
      }
      setSavedSearches((current) => current.map((item) => item.search_id === savedSearch.search_id ? { ...item, alert: false } : item));
      setSavedSearchNotice({ tone: "success", text: te ? "ఈ search‌కు notifications ఆఫ్ చేశారు." : "Notifications are off for this search." });
    } catch {
      setSavedSearchNotice({ tone: "error", text: te ? "Notifications ఆఫ్ చేయలేకపోయాం. మళ్లీ ప్రయత్నించండి." : "Could not turn off notifications. Please retry." });
    } finally {
      setTurningOffAlertId("");
    }
  };

  const deleteSavedSearch = async (savedSearch: SavedSearchItem) => {
    if (!myTsapId || !sessionToken || !savedSearch.search_id) return;
    if (confirmDeleteSearchId !== savedSearch.search_id) {
      setConfirmDeleteSearchId(savedSearch.search_id);
      return;
    }
    setDeletingSearchId(savedSearch.search_id);
    setSavedSearchNotice(null);
    try {
      const { ok, data, errorTelugu } = await apiFetch<{ success?: boolean }>(
        `/api/saved-searches/${encodeURIComponent(myTsapId)}/${encodeURIComponent(savedSearch.search_id)}`,
        { method: "DELETE", retries: 0 },
      );
      if (!ok || !data?.success) {
        setSavedSearchNotice({ tone: "error", text: errorTelugu || (te ? "Search‌ను delete చేయలేకపోయాం." : "Could not delete this search.") });
        return;
      }
      setSavedSearches((current) => current.filter((item) => item.search_id !== savedSearch.search_id));
      setConfirmDeleteSearchId("");
      setSavedSearchNotice({ tone: "success", text: te ? "Saved search తొలగించబడింది." : "Saved search deleted." });
    } catch {
      setSavedSearchNotice({ tone: "error", text: te ? "Search‌ను delete చేయలేకపోయాం. మళ్లీ ప్రయత్నించండి." : "Could not delete this search. Please retry." });
    } finally {
      setDeletingSearchId("");
    }
  };

  const toggleSave = async (row: Row) => {
    const id = String(row.tsap_id || "").trim();
    if (!id) return;
    if (!sessionReady || !myTsapId || !sessionToken) {
      setSaveNotice({
        tone: "error",
        text: te ? "ప్రొఫైల్‌ను shortlist చేయడానికి ముందుగా login చేయండి." : "Sign in to add profiles to your shortlist.",
        needsLogin: true,
      });
      return;
    }
    if (!savedLoaded) {
      setSaveNotice({
        tone: "error",
        text: te ? "మీ shortlist ఇంకా సిద్ధంగా లేదు. మళ్లీ ప్రయత్నించండి." : "Your shortlist is still loading. Please retry.",
        canRetry: true,
      });
      return;
    }

    setSavingId(id);
    setSaveNotice(null);
    try {
      const { ok, data, needsLogin, errorTelugu } = await apiPost<Row>("/api/save", {
        tsap_id: myTsapId,
        target_id: id,
      });
      if (needsLogin) {
        setSaveNotice({
          tone: "error",
          text: te ? "Shortlist నవీకరించడానికి మళ్లీ login చేయండి." : "Sign in again to update your shortlist.",
          needsLogin: true,
        });
        return;
      }
      if (!ok || !data?.success || typeof data.saved !== "boolean") {
        setSaveNotice({
          tone: "error",
          text: errorTelugu || apiDisplayMessage(data, te, te ? "Shortlist నవీకరించలేకపోయాం." : "Could not update your shortlist."),
        });
        return;
      }

      setSavedIds((previous) => data.saved
        ? (previous.includes(id) ? previous : [...previous, id])
        : previous.filter((savedId) => savedId !== id));
      setSaveNotice({
        tone: "success",
        text: apiDisplayMessage(data, te, te ? "Shortlist నవీకరించబడింది." : "Shortlist updated."),
        showShortlist: true,
      });
    } catch {
      setSaveNotice({
        tone: "error",
        text: te ? "Shortlist నవీకరించలేకపోయాం. మళ్లీ ప్రయత్నించండి." : "Could not update your shortlist. Please try again.",
      });
    } finally {
      setSavingId("");
    }
  };

  const shareText = (row: Row) => {
    const details = [
      row.age ? `${row.age} ${te ? "సం." : "years"}` : "",
      displayProfileValue(row.caste),
      displayProfileValue(row.education),
      displayProfileValue(row.job),
      displayProfileValue(row.district),
      row.state ? stateFullName(row.state, te) : "",
      displayProfileValue(row.salary),
    ].filter(Boolean);
    const brand = te ? "మన వివాహ (Mana Vivaha)" : "Mana Vivaha (మన వివాహ)";
    return [
      `🙏 ${brand} ${te ? "ప్రొఫైల్" : "profile"} — ${firstName(row.full_name)} (${row.tsap_id})`,
      details.join(" • "),
      te ? "సభ్యులు అందించిన వివరాలు; స్వతంత్రంగా నిర్ధారించండి." : "Member-submitted details; verify independently.",
      `${te ? "పూర్తి వివరాలు" : "Full details"}: ${SITE_CONFIG.siteUrl}/search/${row.tsap_id}`,
    ].filter(Boolean).join("\n");
  };

  const shareWhatsApp = (row: Row) => window.open(`https://wa.me/?text=${encodeURIComponent(shareText(row))}`, "_blank");

  /* ---------- Profile Card Component ---------- */
  const Card = ({ row }: { row: Row }) => {
    const profileId = String(row.tsap_id || "");
    const isSaved = savedIds.includes(profileId);
    const isSaving = savingId === profileId;
    const photo = row.photo_url || (Array.isArray(row.photo_urls) && row.photo_urls[0]) || "";
    const caste = te ? (CASTE_TELUGU[row.caste] || row.caste || "") : displayProfileValue(row.caste);
    const subCaste = displayProfileValue(row.sub_caste);
    const education = displayProfileValue(row.education);
    const job = displayProfileValue(row.job);
    const district = te ? (DISTRICT_TELUGU[row.district] || row.district || "") : displayProfileValue(row.district);
    const salary = displayProfileValue(row.salary);
    const maritalStatus = displayMaritalStatus(row.marital_status);
    const children = displayProfileValue(row.children);
    const star = displayProfileValue(row.star);
    const rasi = displayProfileValue(row.rasi);

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
                <Image src={photo} alt={firstName(row.full_name)} width={96} height={112} unoptimized className="w-20 h-24 sm:w-24 sm:h-28 rounded-2xl object-cover border border-gold/40 shadow-xs" />
              ) : (
                <div className="w-20 h-24 sm:w-24 sm:h-28 rounded-2xl bg-amber-50/80 border border-gold/40 flex flex-col items-center justify-center text-3xl shadow-inner text-maroon">
                  <span>{row.gender === "Groom" || row.gender === "Male" ? "🤵" : row.gender === "Bride" || row.gender === "Female" ? "👰" : "💍"}</span>
                  <span className="text-[10px] font-bold mt-1 text-slate-500">🔒 Photo Lock</span>
                </div>
              )}
              {row.is_verified && (() => { const check = recordedCheckBadge(row, te); return check ? (
                <span aria-label={check.label} className="absolute -bottom-1.5 left-1 max-w-[calc(100%-0.5rem)] truncate rounded-full bg-slate-900/90 px-1.5 py-0.5 text-[8px] font-bold text-white shadow" title={check.title}>
                  {check.icon} {check.label}
                </span>
              ) : null; })()}
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
                  type="button"
                  onClick={() => { void toggleSave(row); }}
                  disabled={!sessionReady || (!!sessionToken && !savedLoaded) || !!savingId}
                  aria-label={isSaving
                    ? (te ? "Shortlist నవీకరిస్తున్నాము" : "Updating shortlist")
                    : !sessionReady || (!!sessionToken && !savedLoaded)
                      ? (te ? "Shortlist స్థితి లోడ్ అవుతోంది" : "Loading shortlist status")
                      : !sessionToken || !myTsapId
                        ? (te ? "ప్రొఫైల్‌ను shortlist చేయడానికి login చేయండి" : "Log in to save this profile")
                        : (te ? "ఈ ప్రొఫైల్‌ను shortlist చేయండి" : "Shortlist profile")}
                  aria-pressed={isSaved}
                  aria-busy={isSaving || (!!sessionToken && !savedLoaded)}
                  title={isSaved ? (te ? "Shortlist‌లో ఉంది" : "In shortlist") : (te ? "Shortlist‌లో చేర్చండి" : "Add to shortlist")}
                  className={`inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full text-lg transition disabled:cursor-wait disabled:opacity-60 ${isSaved ? "bg-rose-50 text-rose-600" : "text-slate-400 hover:bg-rose-50 hover:text-rose-500"}`}
                >
                  {isSaving || (!!sessionToken && !savedLoaded) ? "…" : isSaved ? "❤️" : "🤍"}
                </button>
              </div>

              {(caste || subCaste || row.age || displayProfileValue(row.height)) && (
                <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 break-words text-xs font-bold text-maroon">
                  {caste && <span>💍 {caste}</span>}
                  {subCaste && <span className="text-slate-500">({subCaste})</span>}
                  {row.age && <span>🎂 {row.age} {te ? "సం." : "years"}</span>}
                  {displayProfileValue(row.height) && <span>{displayProfileValue(row.height)}</span>}
                </p>
              )}
              {(() => {
                // Facts only: each chip restates a filter this member set and
                // the value the profile actually carries. No score, no guess.
                const reasons = matchReasons(row, filters, { limit: 2 });
                if (reasons.length === 0) return null;
                return (
                  <ul className="mt-1 flex flex-wrap gap-1" aria-label={te ? "ఈ ప్రొఫైల్ ఎందుకు కనిపిస్తుంది" : "Why this profile appears"}>
                    {reasons.map((reason) => (
                      <li key={reason.id} className="max-w-full">
                        <span
                          title={te ? reason.te : reason.en}
                          className="inline-flex max-w-full items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-maroon ring-1 ring-gold/40"
                        >
                          <span aria-hidden="true">{reason.icon}</span>
                          <span className="truncate">{te ? reason.te : reason.en}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                );
              })()}

              {/* 💍 Second Marriage detail (ONLY for genuine 2nd marriage profiles — 1st marriage
                  / Pelli Kaledu / Never Married ki idi ఎప్పుడూ కనిపించదు) */}
              {isSecondMarriage(row.marital_status) && (
                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200">
                    {te ? secondMarriageLabel(row.marital_status, true) : secondMarriageLabel(maritalStatus, false)}
                  </span>
                  {children && children !== "None" && (
                    <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200">
                      👶 {children}
                    </span>
                  )}
                </div>
              )}

              {(education || job) && (
                <p className="break-words text-xs font-medium leading-relaxed text-slate-700">
                  {[education, job].filter(Boolean).join(" • ")}
                </p>
              )}

              {(district || row.state || salary) && (
                <p className="break-words text-[11.5px] leading-relaxed text-slate-500">
                  {[district ? `📍 ${district}` : "", row.state ? stateFullName(row.state, te) : "", salary ? `💰 ${salary}` : ""].filter(Boolean).join(" • ")}
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
              {star && <span className="rounded-full border border-amber-300 bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-900">⭐ {star}</span>}
              {rasi && <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10.5px] font-semibold text-slate-700">{rasi}</span>}
            </div>
            {Array.isArray(row.observations) && row.observations.length > 0 ? (
              <div className="mt-2">
                <p className="text-[10px] font-bold text-slate-500">{te ? "రెండు profiles లో నమోదు చేసిన వివరాలు (స్వతంత్రంగా నిర్ధారించండి)" : "Details listed by both profiles (verify independently)"}</p>
                <ul className="mt-1 space-y-1 text-[11px] leading-5 text-slate-600">
                  {row.observations.slice(0, 3).map((item: string, i: number) => <li key={i}>• {te ? item : apiDisplayMessage({ message_en: item }, false, "This detail is not available in English.")}</li>)}
                </ul>
              </div>
            ) : null}
            {Array.isArray(row.preference_checks) && row.preference_checks.length > 0 ? (
              <div className="mt-2 rounded-lg bg-slate-50 p-2">
                <p className="text-[10px] font-bold text-slate-500">{te ? "మీరు సేవ్ చేసిన preference checks (compatibility verdict కాదు)" : "Your saved preference checks (not a compatibility verdict)"}</p>
                <ul className="mt-1 space-y-1 text-[11px] leading-5 text-slate-600">
                  {row.preference_checks.slice(0, 2).map((item: any, i: number) => <li key={`${item.key}-${i}`}>• {te ? (item.note_te || item.note) : apiDisplayMessage({ message_en: item.note_en, message: item.note }, false, "Saved preference details are not available in English.")}</li>)}
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
            {te ? "👁️ వివరాలు" : "👁️ View profile"}
          </Link>

          <Link
            href={`/biodata?id=${row.tsap_id}`}
            className="py-2.5 px-2.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-maroon text-xs font-black transition shadow-xs flex items-center justify-center shrink-0"
            title={te ? "HD కలర్ బయోడేటా డౌన్‌లోడ్" : "Download a high-resolution biodata card"}
          >
            {te ? "🎴 బయోడేటా" : "🎴 Biodata"}
          </Link>

          <button
            onClick={() => setUnlockTarget(row)}
            className="flex-1 min-w-[100px] text-center py-2.5 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md hover-lift transition"
          >
            {te ? "📞 సంప్రదించండి" : "📞 Contact"}
          </button>

          <button
            onClick={() => setProposalTarget(row)}
            className="w-10 h-10 rounded-xl bg-[#25D366] text-white flex items-center justify-center text-base hover:brightness-105 transition shadow-xs shrink-0"
            title={te ? "WhatsApp లో సంబంధం వివరాలు షేర్ చేయండి" : "Share profile details on WhatsApp"}
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
              <span>{te ? "ఫోన్ OTP / ఫోటో / ID సమీక్ష" : "Phone, photo or government ID check"}</span>
            </button>

            <button
              onClick={() => setF("photo_only", !filters.photo_only)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition flex items-center gap-1 border ${
                filters.photo_only ? "bg-amber-500 text-white border-amber-500 shadow-xs" : "bg-white text-slate-700 border-slate-200 hover:border-amber-500"
              }`}
            >
              <span>📸</span>
              <span>{te ? "ఫోటో ఉన్నవి" : "With photo"}</span>
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
              <span>{prefLoading ? (te ? "లోడ్ అవుతోంది…" : "Loading…") : prefApplied ? (te ? "✓ నా ప్రిఫరెన్సెస్ అప్లై అయ్యాయి" : "✓ Preferences applied") : (te ? "🎯 నా సేవ్ చేసిన ప్రిఫరెన్సెస్" : "🎯 Apply saved preferences")}</span>
            </button>

            <button
              onClick={() => setF("gender", filters.gender === "Bride" ? "" : "Bride")}
              className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition flex items-center gap-1 border ${
                filters.gender === "Bride" ? "bg-rose-700 text-white border-rose-700 shadow-xs" : "bg-white text-slate-700 border-slate-200 hover:border-rose-700"
              }`}
            >
              <span>👰</span>
              <span>{te ? "వధువులు" : "Brides"}</span>
            </button>

            <button
              onClick={() => setF("gender", filters.gender === "Groom" ? "" : "Groom")}
              className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition flex items-center gap-1 border ${
                filters.gender === "Groom" ? "bg-indigo-700 text-white border-indigo-700 shadow-xs" : "bg-white text-slate-700 border-slate-200 hover:border-indigo-700"
              }`}
            >
              <span>🤵</span>
              <span>{te ? "వరులు" : "Grooms"}</span>
            </button>

            <button
              onClick={() => setF("marital_status", isMaritalFilterOptionSelected(filters.marital_status, "Pelli Kaledu") ? "" : "Pelli Kaledu")}
              className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition border ${
                isMaritalFilterOptionSelected(filters.marital_status, "Pelli Kaledu") ? "bg-maroon text-white border-maroon shadow-xs" : "bg-white text-slate-700 border-slate-200 hover:border-maroon"
              }`}
            >
              {te ? "💍 పెళ్లి కాలేదు" : "💍 Never married"}
            </button>

            <button
              onClick={() => setF("marital_status", filters.marital_status === "Divorced" ? "" : "Divorced")}
              className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition border ${
                filters.marital_status === "Divorced" ? "bg-rose-700 text-white border-rose-700 shadow-xs" : "bg-white text-slate-700 border-slate-200 hover:border-rose-700"
              }`}
            >
              {te ? "❤️ రెండో వివాహం" : "❤️ Second marriage"}
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
              <span>{te ? "గృహిణి" : "Homemaker"}</span>
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
                <span>{te ? "అధునాతన ఫిల్టర్లు" : "Filters"}</span>
                {activeChips.length > 0 && (
                  <span className="bg-maroon text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
                    {activeChips.length}
                  </span>
                )}
              </div>
              {activeChips.length > 0 && (
                <button onClick={clearAllFilters} className="text-xs font-bold text-rose-600 hover:underline">
                  {te ? "రీసెట్" : "Reset all"}
                </button>
              )}
            </div>

            {/* Children Filter */}
            {hasChildrenRelevantMaritalFilter(filters.marital_status) && (
              <div className="border-t border-slate-100 pt-3 space-y-1.5">
                <label className="text-xs font-black text-slate-800">👶 {te ? "పిల్లలు" : "Children"}:</label>
                <select
                  value={filters.children || ""}
                  onChange={(e) => setF("children", e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold"
                >
                  {CHILDREN_FILTER_OPTIONS.map((option) => (
                    <option key={option.value || "all"} value={option.value}>{te ? option.te : option.en}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Keyword Search */}
            <div>
              <label className="block text-xs font-black text-slate-800 mb-1">🔍 {te ? "పేరు / ఐడీ / కీవర్డ్" : "Name / ID / keyword"}:</label>
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
              <label className="block text-xs font-black text-slate-800 mb-1.5">{te ? "వధువు / వరుడు" : "Gender"}:</label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { v: "", l: te ? "అన్నీ" : "All" },
                  { v: "Bride", l: te ? "👰 వధువు" : "👰 Bride" },
                  { v: "Groom", l: te ? "🤵 వరుడు" : "🤵 Groom" },
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

            <div className="border-t border-slate-100 pt-3 space-y-1">
              <label htmlFor="desktop-religion-filter" className="block text-xs font-black text-slate-800">🕊️ {te ? "మతం" : "Religion"}</label>
              <select
                id="desktop-religion-filter"
                value={filters.religion || ""}
                onChange={(e) => setF("religion", e.target.value)}
                className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm"
              >
                <option value="">{te ? "అన్ని మతాలు" : "All religions"}</option>
                {RELIGIONS.map((religion) => <option key={religion} value={religion}>{religion}</option>)}
              </select>
            </div>

            {/* Caste Multi-Select with Search */}
            <div className="border-t border-slate-100 pt-3 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-800">💍 {te ? "కులం" : "Caste"}:</label>
                {filters.caste && (
                  <button onClick={() => setF("caste", "")} className="text-[11px] text-maroon font-bold">
                    {te ? "క్లియర్" : "Clear"}
                  </button>
                )}
              </div>

              {/* Caste Quick Filters */}
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
                      {te ? (CASTE_TELUGU[c] || c) : c}
                    </button>
                  );
                })}
              </div>

              <input
                type="text"
                placeholder={te ? "🔍 కులం వెతకండి..." : "🔍 Search communities..."}
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
                        <span className="font-bold text-maroon telugu">{te ? (CASTE_TELUGU[c] || c) : c}</span>
                      </div>
                      {te && <span className="text-[11px] text-slate-500 font-medium">({c})</span>}
                    </label>
                  );
                })}
              </div>

              {/* Subcastes */}
              {availableSubcastes.length > 0 && (
                <div className="bg-amber-50/70 p-2.5 rounded-2xl border border-gold/30">
                  <label className="block text-[11px] font-black text-maroon mb-1">🪔 {te ? "ఉపకులాలు" : "Sub-castes"}:</label>
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
                <label className="text-xs font-black text-slate-800">📍 {te ? "జిల్లా / ప్రాంతం" : "District / area"}:</label>
                {filters.district && (
                  <button onClick={() => setF("district", "")} className="text-[11px] text-maroon font-bold">
                    {te ? "క్లియర్" : "Clear"}
                  </button>
                )}
              </div>

              {/* State switch */}
              <div className="flex gap-1">
                {[
                  { v: "", l: te ? "అన్నీ" : "All" },
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
                placeholder={te ? "🔍 జిల్లా వెతకండి..." : "🔍 Search districts..."}
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
                        <span className="font-bold text-slate-800 telugu">{te ? (DISTRICT_TELUGU[d] || d) : d}</span>
                      </div>
                      {te && <span className="text-[11px] text-slate-500 font-medium">({d})</span>}
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-slate-100 pt-3 space-y-3">
              <h3 className="text-xs font-black text-slate-800">💼 {te ? "వృత్తి & విద్య" : "Career & education"}</h3>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {["Housewife / Homemaker (గృహిణి)", "Not Working / Student", ...WORK_TYPES].map((workType) => {
                  const checked = isMultiSelected("job", workType);
                  return (
                    <label key={workType} className="flex min-h-11 items-center gap-2 rounded-lg px-2 text-xs hover:bg-slate-50 cursor-pointer">
                      <input type="checkbox" checked={checked} onChange={() => toggleMulti("job", workType)} className="accent-[#7A0C2E] rounded" />
                      <span>{workType === "Housewife / Homemaker (గృహిణి)" ? (te ? "గృహిణి" : "Housewife / homemaker") : workType}</span>
                    </label>
                  );
                })}
              </div>
              <input
                type="search"
                value={educationSearch}
                onChange={(e) => setEducationSearch(e.target.value)}
                placeholder={te ? "విద్యార్హతను వెతకండి..." : "Search education..."}
                className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm"
              />
              <div className="max-h-32 overflow-y-auto space-y-1">
                {filteredEducationsList.map((education) => {
                  const checked = isMultiSelected("education", education);
                  return (
                    <label key={education} className="flex min-h-11 items-center gap-2 rounded-lg px-2 text-xs hover:bg-slate-50 cursor-pointer">
                      <input type="checkbox" checked={checked} onChange={() => toggleMulti("education", education)} className="accent-[#7A0C2E] rounded" />
                      <span>{te ? (EDUCATION_TELUGU[education] || education) : education}</span>
                    </label>
                  );
                })}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label className="block space-y-1 text-[11px] font-bold text-slate-700">
                  <span>{te ? "కనీస వార్షిక ఆదాయం" : "Minimum annual income"}</span>
                  <select value={String(filters.salary_min || 0)} onChange={(e) => setRangeFilter("salary_min", Number(e.target.value))} className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-2 text-xs">
                    <option value="0">{te ? "పరిమితి లేదు" : "No minimum"}</option>
                    {SALARIES_DETAILED.filter((salary) => salary.minLakhs > 0).map((salary) => <option key={salary.id} value={String(Math.round(salary.minLakhs * 100_000))}>{te ? salary.te : salary.en}</option>)}
                  </select>
                </label>
                <label className="block space-y-1 text-[11px] font-bold text-slate-700">
                  <span>{te ? "గరిష్ఠ వార్షిక ఆదాయం" : "Maximum annual income"}</span>
                  <select value={String(filters.salary_max || 0)} onChange={(e) => setRangeFilter("salary_max", Number(e.target.value))} className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-2 text-xs">
                    {SALARY_CEILING_FILTERS.map((option) => <option key={option.value} value={option.value}>{te ? option.te : option.en}</option>)}
                  </select>
                </label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label className="block space-y-1 text-[11px] font-bold text-slate-700">
                  <span>{te ? "కనీస ఎత్తు" : "Minimum height"}</span>
                  <select value={filters.height_min || ""} onChange={(e) => setRangeFilter("height_min", e.target.value)} className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-2 text-xs">
                    <option value="">{te ? "పరిమితి లేదు" : "No minimum"}</option>
                    {HEIGHTS.map((height) => <option key={height} value={height}>{heightLabel(height)}</option>)}
                  </select>
                </label>
                <label className="block space-y-1 text-[11px] font-bold text-slate-700">
                  <span>{te ? "గరిష్ఠ ఎత్తు" : "Maximum height"}</span>
                  <select value={filters.height_max || ""} onChange={(e) => setRangeFilter("height_max", e.target.value)} className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-2 text-xs">
                    <option value="">{te ? "పరిమితి లేదు" : "No maximum"}</option>
                    {HEIGHTS.map((height) => <option key={height} value={height}>{heightLabel(height)}</option>)}
                  </select>
                </label>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-3 space-y-3">
              <h3 className="text-xs font-black text-slate-800">🌙 {te ? "జ్యోతిష్య వివరాలు (ఐచ్ఛికం)" : "Astrology details (optional)"}</h3>
              <label className="block space-y-1 text-xs font-bold text-slate-700">
                <span>{te ? "రాశి" : "Rasi"}</span>
                <select value={filters.rasi || ""} onChange={(e) => setF("rasi", e.target.value)} className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm">
                  <option value="">{te ? "అన్ని రాశులు" : "All rasis"}</option>
                  {RASIS.map((rasi) => <option key={rasi.en} value={rasi.en}>{te ? `${rasi.te} (${rasi.en})` : rasi.display}</option>)}
                </select>
              </label>
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">{te ? "నక్షత్రం" : "Nakshatra"}</label>
                <div className="max-h-32 overflow-y-auto space-y-1 rounded-xl border border-slate-100 p-2">
                  {NAKSHATRAS.map((star) => (
                    <label key={star.en} className="flex min-h-9 items-center gap-2 text-xs cursor-pointer">
                      <input type="checkbox" checked={isMultiSelected("star", star.en)} onChange={() => toggleMulti("star", star.en)} className="accent-[#7A0C2E] rounded" />
                      <span>{te ? `${star.te} (${star.en})` : star.en}</span>
                    </label>
                  ))}
                </div>
              </div>
              <label className="block space-y-1 text-xs font-bold text-slate-700">
                <span>{te ? "దోషం (సభ్యుడు నమోదు చేసిన పదం)" : "Dosham (member-entered text)"}</span>
                <input type="text" maxLength={80} value={filters.dosham || ""} onChange={(e) => setF("dosham", e.target.value)} placeholder={te ? "ప్రొఫైల్‌లో ఉన్న పదాన్ని నమోదు చేయండి" : "Enter text shown in a profile"} className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm" />
              </label>
              <p className="rounded-xl bg-amber-50 p-2.5 text-[10px] leading-relaxed text-amber-900">
                {te ? "ఇవి సభ్యులు ఇచ్చిన వివరాలు మాత్రమే; అనుకూలత స్కోరు లేదా ఫలిత సూచన కాదు. తెలియని వివరాలను 'లేదు'గా పరిగణించము." : "Member-provided details only; not a compatibility score or prediction. Unknown details are not treated as 'none'."}
              </p>
            </div>

            {/* Age Range Slider */}
            <div className="border-t border-slate-100 pt-3 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-black text-slate-800">🎂 {te ? "వయస్సు పరిధి" : "Age range"}:</span>
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
                <h1 aria-live="polite" aria-atomic="true" className="text-base sm:text-lg font-black text-slate-900">
                  🔍 {loading || searchPending
                    ? (te ? "వెతుకుతున్నాము…" : "Searching…")
                    : requestError
                      ? (te ? "ప్రొఫైళ్లను లోడ్ చేయలేకపోయాం" : "Could not load profiles")
                      : rows.length > 0 && rows.length < total
                        ? (te ? `${total} ప్రొఫైల్స్‌లో ${rows.length} చూపిస్తున్నాం` : `Showing ${rows.length} of ${total} matching profiles`)
                        : (te ? `${total} సరిపోలే ప్రొఫైల్స్ లభించాయి` : `${total} matching profiles found`)}
                </h1>
                <p className="text-xs text-slate-500">
                  {filters.verified_only
                    ? (te ? "ఫోన్ OTP, ఫోటో review లేదా ప్రభుత్వ ID review లో కనీసం ఒకటి నమోదు అయింది" : "At least one phone OTP, photo review or government-ID review is recorded")
                    : (te ? "మీ ప్రాధాన్యతలకు సరిపోయే ప్రొఫైల్స్" : "Profiles matching your preferences")}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {/* Mobile Filter Trigger Button */}
                <button
                  onClick={() => setSheet(true)}
                  className="lg:hidden flex min-h-11 items-center gap-1.5 rounded-xl maroon-gradient px-3.5 py-2 text-xs font-bold text-white shadow-sm"
                >
                  <span>🌪️ {te ? "ఫిల్టర్లు" : "Filters"}</span>
                  {activeChips.length > 0 && <span className="bg-gold text-maroon px-1.5 rounded-full text-[10px] font-black">{activeChips.length}</span>}
                </button>

                {/* Sort dropdown */}
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="min-h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-maroon"
                >
                  {SORTS.map((s) => (
                    <option key={s.v} value={s.v}>
                      {te ? s.lTe : s.l}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {saveNotice && (
              <div
                role={saveNotice.tone === "error" ? "alert" : "status"}
                aria-live={saveNotice.tone === "error" ? "assertive" : "polite"}
                className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-sm ${saveNotice.tone === "error" ? "border-amber-200 bg-amber-50 text-amber-950" : "border-emerald-200 bg-emerald-50 text-emerald-950"}`}
              >
                <span className="min-w-0 flex-1">{saveNotice.text}</span>
                <div className="flex flex-wrap items-center gap-2">
                  {saveNotice.needsLogin && (
                    <Link href="/login" className="rounded-lg border border-current px-3 py-1.5 text-xs font-bold underline-offset-2 hover:underline">
                      {te ? "Login" : "Log in"}
                    </Link>
                  )}
                  {saveNotice.showShortlist && (
                    <Link href="/shortlist" className="rounded-lg border border-current px-3 py-1.5 text-xs font-bold underline-offset-2 hover:underline">
                      {te ? "Shortlist చూడండి" : "View shortlist"}
                    </Link>
                  )}
                  {saveNotice.canRetry && (
                    <button
                      type="button"
                      onClick={() => { setSaveNotice(null); setSavedLoadAttempt((attempt) => attempt + 1); }}
                      className="rounded-lg border border-current px-3 py-1.5 text-xs font-bold underline-offset-2 hover:underline"
                    >
                      {te ? "మళ్లీ ప్రయత్నించండి" : "Retry"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSaveNotice(null)}
                    aria-label={te ? "సందేశాన్ని మూసివేయండి" : "Dismiss message"}
                    className="grid min-h-11 min-w-11 place-items-center rounded-full hover:bg-black/5"
                  >
                    ×
                  </button>
                </div>
              </div>
            )}

            <section aria-labelledby="saved-searches-heading" className="rounded-2xl border border-indigo-100 bg-white p-3.5 shadow-xs sm:p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h2 id="saved-searches-heading" className="text-sm font-black text-slate-900">🔖 {te ? "సేవ్ చేసిన శోధనలు" : "Saved searches"}</h2>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">
                    {te ? "మీ ఖాతాకు మాత్రమే. కొత్త saved searches‌కు notifications స్వయంగా ఆన్ కావు." : "Private to your account. Notifications are never enabled for a new saved search."}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {!sessionReady ? (
                    <button type="button" disabled className="min-h-11 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-400">
                      {te ? "ఖాతా లోడ్ అవుతోంది…" : "Loading account…"}
                    </button>
                  ) : myTsapId && sessionToken ? (
                    <button
                      type="button"
                      onClick={beginSaveSearch}
                      disabled={!hasSearchCriteria || savingSearch || savedSearches.length >= 20}
                      title={!hasSearchCriteria ? (te ? "ముందుగా కనీసం ఒక ఫిల్టర్ ఎంచుకోండి" : "Choose at least one filter first") : undefined}
                      className="min-h-11 rounded-xl maroon-gradient px-3.5 text-xs font-bold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {te ? "ప్రస్తుత శోధనను సేవ్ చేయండి" : "Save current search"}
                    </button>
                  ) : (
                    <Link href="/login?next=%2Fmatches" className="inline-flex min-h-11 items-center rounded-xl border border-maroon/30 px-3.5 text-xs font-bold text-maroon">
                      {te ? "సేవ్ చేయడానికి login" : "Sign in to save"}
                    </Link>
                  )}
                  <button
                    type="button"
                    aria-expanded={savedSearchPanelOpen}
                    aria-controls="saved-search-panel"
                    onClick={() => setSavedSearchPanelOpen((open) => !open)}
                    className="min-h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-bold text-slate-800"
                  >
                    {savedSearchPanelOpen ? (te ? "మూసివేయండి" : "Hide") : (te ? "నా searches" : "Manage")}
                    {sessionReady && myTsapId && sessionToken ? ` (${savedSearches.length}/20)` : ""}
                  </button>
                </div>
              </div>

              {savedSearchNotice && (
                <div role={savedSearchNotice.tone === "error" ? "alert" : "status"} aria-live={savedSearchNotice.tone === "error" ? "assertive" : "polite"} className={`mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-xs ${savedSearchNotice.tone === "error" ? "border-amber-200 bg-amber-50 text-amber-950" : "border-emerald-200 bg-emerald-50 text-emerald-950"}`}>
                  <span className="min-w-0 flex-1">{savedSearchNotice.text}</span>
                  {savedSearchNotice.canRetry && (
                    <button type="button" onClick={() => { setSavedSearchNotice(null); setSavedSearchLoadAttempt((attempt) => attempt + 1); }} className="min-h-11 rounded-lg border border-current px-3 font-bold">
                      {te ? "మళ్లీ ప్రయత్నించండి" : "Retry"}
                    </button>
                  )}
                </div>
              )}

              {savedSearchPanelOpen && (
                <div id="saved-search-panel" className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                  {!sessionReady || !savedSearchesLoaded ? (
                    <p role="status" className="text-sm text-slate-500">{te ? "Saved searches లోడ్ అవుతున్నాయి…" : "Loading saved searches…"}</p>
                  ) : !myTsapId || !sessionToken ? (
                    <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                      <p>{te ? "Saved searches మీ ఖాతాలోనే ఉంటాయి. వాటిని చూడటానికి login చేయండి." : "Saved searches are private to your account. Sign in to view them."}</p>
                      <Link href="/login?next=%2Fmatches" className="mt-2 inline-flex min-h-11 items-center font-bold text-maroon underline">{te ? "Login" : "Sign in"}</Link>
                    </div>
                  ) : savedSearchesLoadError ? (
                    <p role="alert" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-950">{te ? "Saved searches లోడ్ కాలేదు. పై Retry బటన్ ఉపయోగించండి." : "Saved searches could not be loaded. Use the Retry button above."}</p>
                  ) : savedSearches.length === 0 ? (
                    <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{te ? "ఇంకా saved searches లేవు. ప్రస్తుత ఫిల్టర్లను సేవ్ చేయవచ్చు." : "No saved searches yet. Save the current filters to return to them later."}</p>
                  ) : (<>
                    <Link href="/saved-searches" className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-800">
                      {te ? "🔔 Alerts, కొత్తవి నిర్వహించండి" : "🔔 Manage alerts and what is new"}
                    </Link>
                    {savedSearches.map((savedSearch) => {
                    const legacyAlertNeedsConsent = savedSearch.alert === true && !savedSearch.alert_consent_at;
                    const alertsEnabled = savedSearch.alert === true && Boolean(savedSearch.alert_consent_at);
                    const previewCount = Math.max(0, Number(savedSearch.new_matches) || 0);
                    const previewText = alertsEnabled
                      ? (te ? `${previewCount} కొత్త matches` : `${previewCount} new matches`)
                      : (previewCount >= 5 ? (te ? "5+ ప్రొఫైల్స్ సరిపోతున్నాయి" : "5+ matching profiles") : (te ? `${previewCount} ప్రొఫైల్స్ సరిపోతున్నాయి` : `${previewCount} matching profiles`));
                    return (
                      <article key={savedSearch.search_id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <h3 className="break-words text-sm font-bold text-slate-900">{savedSearch.name}</h3>
                            <p className="mt-1 text-xs leading-relaxed text-slate-600">{summarizeSavedSearch(savedSearch.filters || {}, te)}</p>
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                              <span className="rounded-full bg-white px-2.5 py-1 font-semibold text-slate-700">{previewText}</span>
                              <span className={`rounded-full px-2.5 py-1 font-bold ${alertsEnabled ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-900"}`}>
                                {alertsEnabled
                                  ? (te ? "Notifications ఆన్" : "Notifications on")
                                  : legacyAlertNeedsConsent
                                    ? (te ? "సమ్మతి ధృవీకరణ వరకు alerts నిలిపివేశారు" : "Alerts paused pending recorded consent")
                                    : (te ? "Notifications ఆఫ్" : "Notifications off")}
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <button type="button" onClick={() => applySavedSearch(savedSearch)} className="min-h-11 rounded-lg bg-indigo-700 px-3 text-xs font-bold text-white">{te ? "వర్తింపజేయి" : "Apply"}</button>
                            {savedSearch.alert === true && (
                              <button type="button" onClick={() => void turnOffSavedSearchAlerts(savedSearch)} disabled={turningOffAlertId === savedSearch.search_id} className="min-h-11 rounded-lg border border-amber-300 bg-white px-3 text-xs font-bold text-amber-900 disabled:opacity-50">
                                {turningOffAlertId === savedSearch.search_id
                                  ? (te ? "ఆఫ్ చేస్తోంది…" : "Turning off…")
                                  : alertsEnabled
                                    ? (te ? "Alerts ఆఫ్" : "Turn off alerts")
                                    : (te ? "పాత alert సెట్టింగ్ తొలగించండి" : "Clear legacy alert setting")}
                              </button>
                            )}
                            <button type="button" onClick={() => void deleteSavedSearch(savedSearch)} disabled={deletingSearchId === savedSearch.search_id} className="min-h-11 rounded-lg border border-rose-200 bg-white px-3 text-xs font-bold text-rose-700 disabled:opacity-50">
                              {deletingSearchId === savedSearch.search_id ? (te ? "తొలగిస్తోంది…" : "Deleting…") : confirmDeleteSearchId === savedSearch.search_id ? (te ? "తొలగింపు నిర్ధారించండి" : "Confirm delete") : (te ? "తొలగించు" : "Delete")}
                            </button>
                          </div>
                        </div>
                        {confirmDeleteSearchId === savedSearch.search_id && (
                          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-rose-100 bg-white p-2 text-xs text-slate-700">
                            <span>{alertsEnabled
                              ? (te ? "తొలగిస్తే ఈ saved search‌కు వచ్చే alerts కూడా ఆగుతాయి." : "Deleting also stops future alerts for this saved search.")
                              : legacyAlertNeedsConsent
                                ? (te ? "ఈ పాత search‌కు స్పష్టమైన alert సమ్మతి నమోదు కాలేదు; search మాత్రమే తొలగించబడుతుంది." : "No explicit alert consent is recorded for this legacy search; this search will be deleted.")
                                : (te ? "ఈ saved search మాత్రమే తొలగించబడుతుంది." : "Only this saved search will be deleted.")}</span>
                            <button type="button" onClick={() => setConfirmDeleteSearchId("")} className="min-h-11 rounded-lg px-3 font-bold text-slate-700 underline">{te ? "రద్దు" : "Cancel"}</button>
                          </div>
                        )}
                      </article>
                    );
                      })}
                    </>)}
                </div>
              )}
            </section>

            {/* Active Filter Chips Bar */}
            {activeChips.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                {activeChips.map((chip) => (
                  <span
                    key={chip.key}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-maroon border border-gold/40 shadow-xs"
                  >
                    <span>{chip.label}</span>
                    <button
                      type="button"
                      onClick={chip.clear}
                      aria-label={te ? `${chip.label} ఫిల్టర్ తొలగించండి` : `Remove ${chip.label} filter`}
                      className="ml-1 inline-flex min-h-11 min-w-11 items-center justify-center rounded-full font-bold hover:text-rose-600"
                    >
                      ✕
                    </button>
                  </span>
                ))}
                <button onClick={clearAllFilters} className="text-xs font-bold text-rose-600 underline ml-2">
                  {te ? "అన్నీ తొలగించు" : "Clear all"}
                </button>
              </div>
            )}

            {/* Clarity Banner - Numbers ivvamu */}
            <div className="bg-gradient-to-r from-amber-50 to-rose-50 border border-gold/40 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">🔒</span>
                <div>
                  <span className="font-bold text-maroon">{te ? "ఫోన్ నంబర్ల గోప్యతా నియమం: " : "Phone privacy: "}</span>
                  <span className="text-slate-700">{te ? "మొదటి 3 కాంటాక్ట్ అభ్యర్థనలు ఉచితం. నేరుగా నంబర్లు చూపించము; యజమాని సమ్మతి మరియు ప్లాన్ నియమాలు వర్తిస్తాయి." : "The first 3 contact requests are free. Phone numbers are not shown directly; sharing follows the profile owner’s consent and plan rules."}</span>
                </div>
              </div>
              <Link href="/pricing" className="px-3.5 py-1.5 rounded-xl gold-gradient text-maroon font-bold text-xs shrink-0 self-start sm:self-auto shadow-xs">
                {te ? "ప్లాన్లు చూడండి →" : "View plans →"}
              </Link>
            </div>

            {/* Signed-in members can pick up where they left off. Private to the account. */}
            {!!sessionToken && !!myTsapId && !loading && (
              <ProfileRail kind="recent" viewerId={myTsapId} />
            )}

            {/* Matches Cards Grid */}
            {!loading && !searchPending && !requestError && rows.length > 0 && (
              <p className="rounded-2xl border border-gold/30 bg-white/70 px-3.5 py-2 text-[11px] leading-relaxed text-slate-600">
                <span className="font-bold text-maroon">{te ? "ఎందుకు ఇవి: " : "Why these: "}</span>
                <span className="telugu">{te ? REASON_DISCLAIMER.te : REASON_DISCLAIMER.en}</span>
              </p>
            )}
            {loading || searchPending ? (
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
              <div className="bg-white rounded-3xl border border-gold/30 p-6 text-center space-y-4 sm:p-8">
                <div className="text-4xl">🔍 💍</div>
                <h3 className="text-base font-black text-slate-900">{te ? "మీ ఫిల్టర్లకు సరిపోయే ప్రొఫైల్స్ ప్రస్తుతం లేవు" : "No profiles match your filters yet"}</h3>
                <p className="text-xs text-slate-600">
                  {te ? "కింది వాటిలో ఒక ఫిల్టర్‌ను సడలించి మళ్లీ ప్రయత్నించండి." : "Relax one filter below and try again."}
                </p>
                {(() => {
                  const suggestions = relaxSuggestions(filters, { limit: 3 });
                  if (suggestions.length === 0) return null;
                  return (
                    <div className="space-y-2">
                      <p className="text-[11px] font-bold text-maroon">{te ? "ఒక్క నొక్కుతో సడలించండి" : "One tap to widen"}</p>
                      <div className="flex flex-wrap justify-center gap-2">
                        {suggestions.map((suggestion) => (
                          <button
                            key={suggestion.id}
                            type="button"
                            onClick={() => applyFilterPatch(suggestion.patch)}
                            className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-gold/50 bg-amber-50 px-3.5 py-2 text-xs font-bold text-maroon transition hover:bg-amber-100"
                          >
                            <span aria-hidden="true">{suggestion.icon}</span>
                            <span>{te ? suggestion.te : suggestion.en}</span>
                            {suggestion.id === "age" && <span className="font-mono">({widenedAgeLabel(filters)})</span>}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })()}
                <button onClick={clearAllFilters} className="px-5 py-2.5 rounded-xl maroon-gradient text-white text-xs font-bold shadow-md">
                  {te ? "అన్ని ఫిల్టర్లను రీసెట్ చేయండి" : "Reset all filters"}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {rows.map((row) => (
                  <Card key={row.tsap_id || row.id} row={row} />
                ))}
              </div>
            )}

            {!loading && !searchPending && !requestError && rows.length > 0 && nextOffset < total && (
              <div className="flex flex-col items-center gap-2 py-2 text-center">
                {loadMoreError && (
                  <p role="alert" className="text-sm text-rose-700">
                    {te ? "మరిన్ని ప్రొఫైల్స్ లోడ్ కాలేదు." : "More profiles could not be loaded."}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => { void fetchMatches(nextOffset, true); }}
                  disabled={loadingMore}
                  aria-busy={loadingMore}
                  className="min-h-12 min-w-48 rounded-xl border border-maroon/25 bg-white px-5 py-3 text-sm font-bold text-maroon shadow-sm transition hover:bg-rose-50 disabled:cursor-wait disabled:opacity-60"
                >
                  {loadingMore
                    ? (te ? "లోడ్ అవుతోంది…" : "Loading more…")
                    : loadMoreError
                      ? (te ? "మళ్లీ ప్రయత్నించండి" : "Retry loading more")
                      : (te ? `మరిన్ని ${Math.min(MATCH_PAGE_SIZE, total - nextOffset)} ప్రొఫైల్స్` : `Load ${Math.min(MATCH_PAGE_SIZE, total - nextOffset)} more profiles`)}
                </button>
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
                <span>{te ? "అధునాతన ఫిల్టర్లు" : "Advanced filters"}</span>
              </div>
              <button
                type="button"
                onClick={() => setSheet(false)}
                aria-label={te ? "ఫిల్టర్ ప్యానెల్ మూసివేయండి" : "Close filter panel"}
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full bg-slate-100 font-bold text-slate-700"
              >
                ✕
              </button>
            </div>

            {/* Tabbed Navigation */}
            <div className="flex border-b border-slate-100 overflow-x-auto no-scrollbar bg-slate-50">
              {[
                { k: "basic", l: te ? "ప్రాథమిక" : "Basics" },
                { k: "caste", l: te ? "కులం" : "Community" },
                { k: "location", l: te ? "ప్రాంతం" : "Location" },
                { k: "career", l: te ? "ఉద్యోగం" : "Career" },
                { k: "astro", l: te ? "జ్యోతిషం" : "Astrology" },
              ].map((t) => (
                <button
                  key={t.k}
                  onClick={() => setMobileFilterTab(t.k as any)}
                  className={`min-h-11 shrink-0 border-b-2 px-4 py-2.5 text-xs font-bold transition ${
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
                    <label className="block text-xs font-bold text-slate-800 mb-1">{te ? "వధువు / వరుడు" : "Gender"}:</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { v: "", l: te ? "అన్నీ" : "All" },
                        { v: "Bride", l: te ? "👰 వధువు" : "👰 Bride" },
                        { v: "Groom", l: te ? "🤵 వరుడు" : "🤵 Groom" },
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
                    <label className="block text-xs font-bold text-slate-800 mb-1">{te ? "వైవాహిక స్థితి" : "Marital status"}:</label>
                    <div className="grid grid-cols-2 gap-2">
                      {MARITAL_STATUS_FILTER_OPTIONS.map((option) => {
                        const selected = isMaritalFilterOptionSelected(filters.marital_status, option.value);
                        return (
                          <button
                            key={option.value}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => setF("marital_status", selected ? "" : option.value)}
                            className={`min-h-11 py-2 px-3 rounded-xl text-xs font-bold border text-center ${
                              selected ? "bg-maroon text-white border-maroon" : "bg-slate-50 text-slate-700 border-slate-200"
                            }`}
                          >
                            {te ? option.te : option.en}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span>{te ? "వయస్సు పరిధి" : "Age range"}:</span>
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
                  <label className="block space-y-1">
                    <span className="block text-xs font-bold text-slate-800">{te ? "మతం" : "Religion"}</span>
                    <select
                      value={filters.religion || ""}
                      onChange={(e) => setF("religion", e.target.value)}
                      className="min-h-11 w-full bg-white border border-slate-200 rounded-xl px-3 text-sm"
                    >
                      <option value="">{te ? "అన్ని మతాలు" : "All religions"}</option>
                      {RELIGIONS.map((religion) => <option key={religion} value={religion}>{religion}</option>)}
                    </select>
                  </label>
                  <input
                    type="text"
                    placeholder={te ? "🔍 కులం వెతకండి..." : "🔍 Search communities..."}
                    value={casteSearch}
                    onChange={(e) => setCasteSearch(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                  />
                  <div className="max-h-60 overflow-y-auto space-y-1">
                    {filteredCastesList.map((c) => {
                      const checked = isMultiSelected("caste", c);
                      return (
                        <label key={c} className="flex min-h-11 items-center justify-between p-2 rounded-xl text-xs bg-slate-50 cursor-pointer">
                          <div className="flex items-center gap-2">
                            <input type="checkbox" checked={checked} onChange={() => toggleMulti("caste", c)} className="accent-[#7A0C2E] rounded" />
                            <span className="font-bold text-slate-800">{te ? (CASTE_TELUGU[c] || c) : c}</span>
                          </div>
                          <span className="text-slate-500 text-[11px]">({c})</span>
                        </label>
                      );
                    })}
                  </div>
                  {visibleSubcastes.length > 0 && (
                    <div className="space-y-2 border-t border-slate-100 pt-3">
                      <label className="block text-xs font-bold text-slate-800">{te ? "ఉపకులం" : "Sub-caste"}</label>
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {visibleSubcastes.map((subCaste) => {
                          const checked = isMultiSelected("sub_caste", subCaste);
                          return (
                            <label key={subCaste} className="flex min-h-11 items-center gap-2 rounded-xl bg-slate-50 p-2 text-xs cursor-pointer">
                              <input type="checkbox" checked={checked} onChange={() => toggleMulti("sub_caste", subCaste)} className="accent-[#7A0C2E] rounded" />
                              <span className="font-medium text-slate-800">{subCaste}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {mobileFilterTab === "location" && (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    {[
                      { v: "", l: te ? "అన్నీ" : "All" },
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
                    placeholder={te ? "🔍 జిల్లా వెతకండి..." : "🔍 Search districts..."}
                    value={districtSearch}
                    onChange={(e) => setDistrictSearch(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                  />
                  <div className="max-h-60 overflow-y-auto space-y-1">
                    {filteredDistrictsList.map((d) => {
                      const checked = isMultiSelected("district", d);
                      return (
                        <label key={d} className="flex min-h-11 items-center justify-between p-2 rounded-xl text-xs bg-slate-50 cursor-pointer">
                          <div className="flex items-center gap-2">
                            <input type="checkbox" checked={checked} onChange={() => toggleMulti("district", d)} className="accent-[#7A0C2E] rounded" />
                            <span className="font-bold text-slate-800">{te ? (DISTRICT_TELUGU[d] || d) : d}</span>
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
                  <label className="block text-xs font-bold text-slate-800">{te ? "వృత్తి / ఉద్యోగ రంగం" : "Occupation / industry"}:</label>
                  <div className="grid grid-cols-2 gap-2">
                    {["Housewife / Homemaker (గృహిణి)", "Not Working / Student", ...WORK_TYPES].map((wt) => {
                      const checked = isMultiSelected("job", wt);
                      return (
                        <label key={wt} className="flex min-h-11 items-center gap-2 p-2 rounded-xl text-xs bg-slate-50 cursor-pointer">
                          <input type="checkbox" checked={checked} onChange={() => toggleMulti("job", wt)} className="accent-[#7A0C2E] rounded" />
                          <span className="truncate">{wt === "Housewife / Homemaker (గృహిణి)" ? (te ? "గృహిణి" : "Housewife / homemaker") : wt}</span>
                        </label>
                      );
                    })}
                  </div>
                  <div className="space-y-2 border-t border-slate-100 pt-3">
                    <label className="block text-xs font-bold text-slate-800">{te ? "విద్యార్హత" : "Education"}</label>
                    <input
                      type="search"
                      value={educationSearch}
                      onChange={(e) => setEducationSearch(e.target.value)}
                      placeholder={te ? "విద్యార్హతను వెతకండి..." : "Search education..."}
                      className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                    />
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {filteredEducationsList.map((education) => {
                        const checked = isMultiSelected("education", education);
                        return (
                          <label key={education} className="flex min-h-11 items-center gap-2 rounded-xl bg-slate-50 p-2 text-xs cursor-pointer">
                            <input type="checkbox" checked={checked} onChange={() => toggleMulti("education", education)} className="accent-[#7A0C2E] rounded" />
                            <span>{te ? (EDUCATION_TELUGU[education] || education) : education}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border-t border-slate-100 pt-3">
                    <label className="block space-y-1 text-xs font-bold text-slate-800">
                      <span>{te ? "కనీస వార్షిక ఆదాయం" : "Minimum annual income"}</span>
                      <select
                        value={String(filters.salary_min || 0)}
                        onChange={(e) => setRangeFilter("salary_min", Number(e.target.value))}
                        className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium"
                      >
                        <option value="0">{te ? "పరిమితి లేదు" : "No minimum"}</option>
                        {SALARIES_DETAILED.filter((salary) => salary.minLakhs > 0).map((salary) => (
                          <option key={salary.id} value={String(Math.round(salary.minLakhs * 100_000))}>
                            {te ? salary.te : salary.en}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block space-y-1 text-xs font-bold text-slate-800">
                      <span>{te ? "గరిష్ఠ వార్షిక ఆదాయం" : "Maximum annual income"}</span>
                      <select
                        value={String(filters.salary_max || 0)}
                        onChange={(e) => setRangeFilter("salary_max", Number(e.target.value))}
                        className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium"
                      >
                        {SALARY_CEILING_FILTERS.map((option) => (
                          <option key={option.value} value={option.value}>{te ? option.te : option.en}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border-t border-slate-100 pt-3">
                    <label className="block space-y-1 text-xs font-bold text-slate-800">
                      <span>{te ? "కనీస ఎత్తు" : "Minimum height"}</span>
                      <select
                        value={filters.height_min || ""}
                        onChange={(e) => setRangeFilter("height_min", e.target.value)}
                        className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium"
                      >
                        <option value="">{te ? "పరిమితి లేదు" : "No minimum"}</option>
                        {HEIGHTS.map((height) => <option key={height} value={height}>{heightLabel(height)}</option>)}
                      </select>
                    </label>
                    <label className="block space-y-1 text-xs font-bold text-slate-800">
                      <span>{te ? "గరిష్ఠ ఎత్తు" : "Maximum height"}</span>
                      <select
                        value={filters.height_max || ""}
                        onChange={(e) => setRangeFilter("height_max", e.target.value)}
                        className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium"
                      >
                        <option value="">{te ? "పరిమితి లేదు" : "No maximum"}</option>
                        {HEIGHTS.map((height) => <option key={height} value={height}>{heightLabel(height)}</option>)}
                      </select>
                    </label>
                  </div>
                </div>
              )}

              {mobileFilterTab === "astro" && (
                <div className="space-y-3">
                  <label className="block space-y-1 text-xs font-bold text-slate-800">
                    <span>{te ? "రాశి" : "Rasi"}</span>
                    <select
                      value={filters.rasi || ""}
                      onChange={(e) => setF("rasi", e.target.value)}
                      className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium"
                    >
                      <option value="">{te ? "అన్ని రాశులు" : "All rasis"}</option>
                      {RASIS.map((rasi) => <option key={rasi.en} value={rasi.en}>{te ? `${rasi.te} (${rasi.en})` : rasi.display}</option>)}
                    </select>
                  </label>
                  <label className="block space-y-1 text-xs font-bold text-slate-800">
                    <span>{te ? "దోషం (ప్రొఫైల్‌లో నమోదు చేసిన పదం)" : "Dosham (member-entered text)"}</span>
                    <input
                      type="text"
                      maxLength={80}
                      value={filters.dosham || ""}
                      onChange={(e) => setF("dosham", e.target.value)}
                      placeholder={te ? "ప్రొఫైల్‌లో ఉన్న పదాన్ని నమోదు చేయండి" : "Enter text shown in a profile"}
                      className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium"
                    />
                  </label>
                  <p className="rounded-xl bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-900">
                    {te
                      ? "ఈ వివరాలు సభ్యులు స్వయంగా ఇచ్చినవి. ఇవి అనుకూలత స్కోరు లేదా వివాహ ఫలితాన్ని సూచించవు."
                      : "These are member-provided details, not a compatibility score or prediction. Missing information remains unknown."}
                  </p>
                  <label className="block text-xs font-bold text-slate-800">{te ? "నక్షత్రం ఎంచుకోండి" : "Select a nakshatra"}:</label>
                  <div className="max-h-60 overflow-y-auto space-y-1">
                    {NAKSHATRAS.map((st) => {
                      const checked = isMultiSelected("star", st.en);
                      return (
                        <label key={st.en} className="flex min-h-11 items-center gap-2 p-2 rounded-xl text-xs bg-slate-50 cursor-pointer">
                          <input type="checkbox" checked={checked} onChange={() => toggleMulti("star", st.en)} className="accent-[#7A0C2E] rounded" />
                          <span>
                            ⭐ {te ? `${st.te} (${st.en})` : st.en}
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
                {te ? "రీసెట్ చేయండి" : "Reset"}
              </button>
              <button onClick={() => setSheet(false)} className="flex-2 py-3 rounded-xl maroon-gradient text-white text-xs font-bold shadow-md">
                {te ? `ఫిల్టర్లు వర్తింపజేయండి (${total})` : `Apply filters (${total})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {saveSearchDialogOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/55 p-0 sm:items-center sm:p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="save-search-dialog-title" className="w-full max-w-md rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="save-search-dialog-title" className="text-lg font-black text-slate-900">{te ? "ఈ శోధనను సేవ్ చేయండి" : "Save this search"}</h2>
                <p className="mt-1 text-sm text-slate-600">{te ? "ఈ పేరు మీ ఖాతాలో ప్రైవేట్‌గా ఉంటుంది." : "This name and its filters are saved privately to your account."}</p>
              </div>
              <button type="button" onClick={() => setSaveSearchDialogOpen(false)} aria-label={te ? "మూసివేయండి" : "Close dialog"} className="grid min-h-11 min-w-11 place-items-center rounded-full bg-slate-100 text-lg">×</button>
            </div>
            <form
              className="mt-4 space-y-4"
              onSubmit={(event) => { event.preventDefault(); void saveCurrentSearch(); }}
            >
              <label className="block space-y-1.5 text-sm font-bold text-slate-800">
                <span>{te ? "శోధన పేరు" : "Search name"}</span>
                <input
                  type="text"
                  required
                  minLength={2}
                  maxLength={40}
                  autoFocus
                  value={saveSearchName}
                  onChange={(event) => setSaveSearchName(event.target.value)}
                  placeholder={te ? "ఉదా: హైదరాబాద్‌లో ఉద్యోగులు" : "e.g. Professionals in Hyderabad"}
                  className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-maroon/30"
                />
              </label>
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-xs leading-relaxed text-emerald-950">
                {te
                  ? "ఈ saved search మీ ఖాతాలో మాత్రమే ఉంటుంది. Notifications, WhatsApp సందేశాలు లేదా ఇతర alerts పంపబడవు."
                  : "This saved search stays in your account. It will not enable notifications, WhatsApp messages, or other alerts."}
              </div>
              {savedSearchNotice?.tone === "error" && (
                <p role="alert" className="text-sm font-semibold text-rose-700">{savedSearchNotice.text}</p>
              )}
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setSaveSearchDialogOpen(false)} disabled={savingSearch} className="min-h-11 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-700 disabled:opacity-50">
                  {te ? "రద్దు" : "Cancel"}
                </button>
                <button type="submit" disabled={savingSearch || !saveSearchName.trim() || savedSearches.length >= 20} className="min-h-11 rounded-xl maroon-gradient px-4 text-sm font-bold text-white disabled:opacity-50">
                  {savingSearch ? (te ? "సేవ్ చేస్తోంది…" : "Saving…") : (te ? "ప్రైవేట్‌గా సేవ్ చేయండి" : "Save privately")}
                </button>
              </div>
            </form>
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
