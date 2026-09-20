"use client";

/**
 * MANA VIVAHA — ADVANCED MATCHES (v3)
 * ===================================
 * Real backend /api/search only — NO demo rows (Wave 31: demo fallback deleted).
 *  • 13 filters: gender, age range (slider), caste, district, state, job, education,
 *    salary_min, marital, religion, verified only, photo only, keyword
 *  • 5 sorts: Best match (score) / New / Age / Porutham 10/10 / Boosted
 *  • Why-match reasons + 10-porutham badge per card (viewer tho compare chesi)
 *  • Active filter chips (✕ remove) + saved searches (🔔 local) + share-search link
 *  • Phone lo: bottom-sheet filters, thumb buttons, sticky search
 *  • API fail aithe demo data fallback (site eppudu khali ga kanipinchadu)
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CASTES, CHILDREN_OPTIONS, DISTRICTS_BY_STATE, EDUCATIONS, JOBS, MARITAL_STATUSES, RELIGIONS, SALARIES } from "@/lib/telugu-data";
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

type Row = Record<string, any>;
const SAVED_SEARCHES_KEY = "tsap_saved_searches_v1";
const SORTS = [
  { v: "score", l: "🏆 Best match", lTe: "🏆 బెస్ట్ మ్యాచ్" },
  { v: "porutham", l: "💍 Porutham (10)", lTe: "💍 పొరుతం (10)" },
  { v: "trust", l: "🛡️ Trust score", lTe: "🛡️ ట్రస్ట్ స్కోర్" },
  { v: "completeness", l: "📝 Profile complete", lTe: "📝 ప్రొఫైల్ పూర్తి" },
  { v: "new", l: "🆕 New", lTe: "🆕 కొత్తవి" },
  { v: "age", l: "🎂 Age", lTe: "🎂 వయసు" },
  { v: "boosted", l: "⚡ Boosted", lTe: "⚡ బూస్టెడ్" },
];
const DEFAULT_FILTERS: Row = {
  gender: "", q: "", caste: "", district: "", state: "", job: "", education: "",
  salary_min: 0, salary_max: 0, marital_status: "", children: "", religion: "", age_min: 18, age_max: 60,
  verified_only: false, photo_only: false,
  nri_only: false, profession_first: false,   // 🌊 WAVE 14 — NRI + profession-first
  // 🆕 WAVE 9 advanced filters
  height_min: "", height_max: "", dosham: "", min_completeness: 0,
  exclude_viewed: false, exclude_interested: false,
};


/* ---------- 🧠 MATCH SCORE 2.0 — "enduku ee score?" expandable panel ---------- */
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
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-2 px-3 py-2.5 text-left">
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
          {v2.how_to_improve && (
            <div className="mt-2 bg-emerald-50 border border-emerald-200 rounded-xl p-2.5">
              <div className="text-[10px] font-bold text-emerald-800">{te ? "📈 Score పెంచడానికి" : "📈 To improve score"}</div>
              {(Array.isArray(v2.how_to_improve) ? v2.how_to_improve : [v2.how_to_improve]).map((w: string, i: number) => (
                <div key={i} className="text-[10px] text-emerald-900 telugu">• {w}</div>
              ))}
            </div>
          )}
          {v2?.mutual?.note && (
            <div className="mt-2 text-[10px] text-gray-600 telugu">💞 {v2.mutual.note}</div>
          )}
        </div>
      )}
    </div>
  );
}

function FilterSheet({
  open, onClose, filters, setF, reset, onApply, resultsInfo, facets,
}: {
  open: boolean; onClose: () => void; filters: Row; setF: (k: string, v: any) => void;
  reset: () => void; onApply: () => void; resultsInfo: string; facets?: Row | null;
}) {
  const { lang } = useLang();
  const te = lang === "te";
  const districts: string[] = filters.state ? (DISTRICTS_BY_STATE[filters.state] || []) : [];
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/45" onClick={onClose} />
      <div className="relative w-full md:max-w-2xl max-h-[88vh] overflow-y-auto bg-cream rounded-t-[2rem] md:rounded-[2rem] p-4 step-slide">
        <div className="flex items-center justify-between sticky top-0 bg-cream pb-2 -mt-1 pt-1">
          <div className="font-bold text-maroon text-[16px]">🔎 Advanced filters</div>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-white border border-gold/40 font-bold">✕</button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-[13px] font-bold text-ink">{te ? "ఎవరిని చూస్తున్నారు?" : "Looking for?"}</label>
            <div className="mt-2 flex gap-2">
              {[{ v: "", l: te ? "అందరూ" : "Everyone" }, { v: "Bride", l: "👰 Brides" }, { v: "Groom", l: "🤵 Grooms" }].map((g) => (
                <button key={g.v} onClick={() => setF("gender", g.v)}
                  className={`chip ${filters.gender === g.v ? "chip-on" : ""}`}>{g.l}</button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gold/30 p-3">
            <div className="flex items-center justify-between text-[13px] font-bold text-ink">
              <span>Age range</span><span className="text-maroon">{filters.age_min} – {filters.age_max} yrs</span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <input type="range" min={18} max={60} value={filters.age_min}
                onChange={(e) => setF("age_min", Math.min(parseInt(e.target.value), filters.age_max))} className="accent-[#7A0C2E]" aria-label="Text input" />
              <input type="range" min={18} max={60} value={filters.age_max}
                onChange={(e) => setF("age_max", Math.max(parseInt(e.target.value), filters.age_min))} className="accent-[#7A0C2E]" aria-label="Text input" />
            </div>
          </div>

          <div>
            <label className="text-[13px] font-bold text-ink">State</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {[{ v: "", l: te ? "అన్నీ" : "All" }, { v: "TS", l: "Telangana" }, { v: "AP", l: "Andhra Pradesh" }, { v: "Other", l: te ? "ఇతర రాష్ట్రాలు" : "Other states" }].map((s) => (
                <button key={s.v} onClick={() => { setF("state", s.v); setF("district", ""); }}
                  className={`chip ${filters.state === s.v ? "chip-on" : ""}`}>{s.l}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[13px] font-bold text-ink">District {filters.state ? "" : te ? "(ముందు state ఎంచుకోండి)" : "(select state first)"}</label>
            <div className="mt-2 flex flex-wrap gap-2 max-h-44 overflow-y-auto">
              {districts.map((d) => (
                <button key={d} onClick={() => setF("district", filters.district === d ? "" : d)}
                  className={`chip ${filters.district === d ? "chip-on" : ""}`}>{d}</button>
              ))}
              {!districts.length && <span className="text-[12px] text-gray-500">{te ? "State select చెయ్యండి — districts వస్తాయి" : "Select state — districts will load"}</span>}
            </div>
          </div>

          <div>
            <label className="text-[13px] font-bold text-ink">Caste ({CASTES.length} options)</label>
            <div className="mt-2 flex flex-wrap gap-2 max-h-48 overflow-y-auto">
              {CASTES.map((c) => (
                <button key={c} onClick={() => setF("caste", filters.caste === c ? "" : c)}
                  className={`chip ${filters.caste === c ? "chip-on" : ""}`}>{c}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[13px] font-bold text-ink">Job</label>
            <div className="mt-2 flex flex-wrap gap-2 max-h-40 overflow-y-auto">
              {JOBS.slice(0, 24).map((j) => (
                <button key={j} onClick={() => setF("job", filters.job === j ? "" : j)}
                  className={`chip ${filters.job === j ? "chip-on" : ""}`}>{j}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[13px] font-bold text-ink">Education</label>
            <div className="mt-2 flex flex-wrap gap-2 max-h-40 overflow-y-auto">
              {EDUCATIONS.slice(0, 24).map((e) => (
                <button key={e} onClick={() => setF("education", filters.education === e ? "" : e)}
                  className={`chip ${filters.education === e ? "chip-on" : ""}`}>{e}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[13px] font-bold text-ink">Salary (min)</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {[{ v: 0, l: "Any" }].concat(SALARIES.map((s) => ({ v: Number(String(s).replace(/[^\d]/g, "").slice(0, 2)) * 100000, l: s }))).slice(0, 10).map((s) => (
                <button key={String(s.v)} onClick={() => setF("salary_min", s.v)}
                  className={`chip ${filters.salary_min === s.v ? "chip-on" : ""}`}>{s.l}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[13px] font-bold text-ink">Marital status</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {MARITAL_STATUSES.map((m) => (
                <button key={m} onClick={() => setF("marital_status", filters.marital_status === m ? "" : m)}
                  className={`chip ${filters.marital_status === m ? "chip-on" : ""}`}>{m}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[13px] font-bold text-ink">{duo("Children", "పిల్లలు")}</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {CHILDREN_OPTIONS.map((c) => (
                <button key={c} onClick={() => setF("children", filters.children === c ? "" : c)}
                  className={`chip ${filters.children === c ? "chip-on" : ""}`}>{c}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[13px] font-bold text-ink">Religion</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {RELIGIONS.map((r) => (
                <button key={r} onClick={() => setF("religion", filters.religion === r ? "" : r)}
                  className={`chip ${filters.religion === r ? "chip-on" : ""}`}>{r}</button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setF("verified_only", !filters.verified_only)}
              className={`chip justify-center ${filters.verified_only ? "chip-on" : ""}`}>✅ Verified only</button>
            <button onClick={() => setF("photo_only", !filters.photo_only)}
              className={`chip justify-center ${filters.photo_only ? "chip-on" : ""}`}>📸 Photo unnavi</button>
            <button onClick={() => setF("nri_only", !filters.nri_only)}
              className={`chip justify-center ${filters.nri_only ? "chip-on" : ""}`}>✈️ NRI only</button>
            <button onClick={() => setF("profession_first", !filters.profession_first)}
              className={`chip justify-center ${filters.profession_first ? "chip-on" : ""}`}>💼 Naa profession first</button>
          </div>

          {/* 🆕 WAVE 9 — advanced filters (height / max salary / dosham / completeness / exclude) */}
          <div className="rounded-2xl border border-gold/30 bg-white/70 p-3">
            <p className="text-[12px] font-bold text-maroon">🆕 Advanced filters (WAVE 9)</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <label className="text-[11px] font-semibold text-gray-700">
                📏 ఎత్తు min
                <input value={filters.height_min} onChange={(e) => setF("height_min", e.target.value)} placeholder="5.2"
                  className="mt-1 w-full rounded-lg border border-gold/40 px-2 py-1.5 text-[12px]" aria-label="5.2" />
              </label>
              <label className="text-[11px] font-semibold text-gray-700">
                📏 ఎత్తు max
                <input value={filters.height_max} onChange={(e) => setF("height_max", e.target.value)} placeholder="6.0"
                  className="mt-1 w-full rounded-lg border border-gold/40 px-2 py-1.5 text-[12px]" aria-label="6.0" />
              </label>
            </div>
            <div className="mt-2">
              <p className="text-[11px] font-semibold text-gray-700">{te ? "💰 ఆదాయం (max — ఎక్కువ ఉన్నవి తీసెయ్)" : "💰 Income (max — exclude higher)"}</p>
              <div className="mt-1 flex flex-wrap gap-2">
                {[{ v: 0, l: "Any" }, { v: 500000, l: "≤5L" }, { v: 1000000, l: "≤10L" }, { v: 2000000, l: "≤20L" }].map((x) => (
                  <button key={x.v} onClick={() => setF("salary_max", x.v)}
                    className={`chip ${Number(filters.salary_max) === x.v ? "chip-on" : ""}`}>{x.l}</button>
                ))}
              </div>
            </div>
            <div className="mt-2">
              <p className="text-[11px] font-semibold text-gray-700">🧿 Dosham</p>
              <div className="mt-1 flex flex-wrap gap-2">
                {["", "Yes", "No"].map((d) => (
                  <button key={d || "any"} onClick={() => setF("dosham", d)}
                    className={`chip ${String(filters.dosham) === d ? "chip-on" : ""}`}>{d || "Any"}</button>
                ))}
              </div>
            </div>
            <div className="mt-2">
              <p className="text-[11px] font-semibold text-gray-700">
                📝 Profile completeness {filters.min_completeness ? `· ${filters.min_completeness}%+` : "· any"}
              </p>
              <div className="mt-1 flex flex-wrap gap-2">
                {[0, 50, 70, 90].map((v) => (
                  <button key={v} onClick={() => setF("min_completeness", v)}
                    className={`chip ${Number(filters.min_completeness) === v ? "chip-on" : ""}`}>{v ? `${v}%+` : "Any"}</button>
                ))}
              </div>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button onClick={() => setF("exclude_viewed", !filters.exclude_viewed)}
                className={`chip justify-center ${filters.exclude_viewed ? "chip-on" : ""}`}>{te ? "🙈 చూసిన వాళ్లు తీసెయ్" : "🙈 Hide viewed"}</button>
              <button onClick={() => setF("exclude_interested", !filters.exclude_interested)}
                className={`chip justify-center ${filters.exclude_interested ? "chip-on" : ""}`}>{te ? "💌 Interest పంపిన వాళ్లు తీసెయ్" : "💌 Hide contacted"}</button>
            </div>
            {facets?.caste?.length ? (
              <div className="mt-3">
                <p className="text-[11px] font-semibold text-gray-700">🔥 Top castes (live counts)</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  {(facets.caste as { value: string; count: number }[]).slice(0, 8).map((f) => (
                    <button key={f.value} onClick={() => setF("caste", filters.caste === f.value ? "" : f.value)}
                      className={`chip ${filters.caste === f.value ? "chip-on" : ""}`}>{f.value} ({f.count})</button>
                  ))}
                </div>
              </div>
            ) : null}
            {facets?.district?.length ? (
              <div className="mt-2">
                <p className="text-[11px] font-semibold text-gray-700">📍 Top districts (live counts)</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  {(facets.district as { value: string; count: number }[]).slice(0, 8).map((f) => (
                    <button key={f.value} onClick={() => setF("district", filters.district === f.value ? "" : f.value)}
                      className={`chip ${filters.district === f.value ? "chip-on" : ""}`}>{f.value} ({f.count})</button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="sticky bottom-0 bg-cream pt-3 pb-1 safe-bottom">
          <div className="text-[11px] text-gray-600 mb-2">{resultsInfo}</div>
          <div className="flex gap-2">
            <button onClick={reset} className="px-5 py-3 rounded-2xl border border-maroon/25 text-maroon font-bold text-[14px]">{te ? "రీసెట్" : "Reset"}</button>
            <button onClick={onApply} className="flex-1 py-3 rounded-2xl maroon-gradient text-white font-bold text-[15px]">
              {resultsInfo.includes("—") ? (te ? "Results చూడు" : "See results") : (te ? "Apply చెయ్" : "Apply")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MatchesAdvanced() {
  const { lang } = useLang();
  const te = lang === "te";
  const [filters, setFilters] = useState<Row>({ ...DEFAULT_FILTERS });
  const [sort, setSort] = useState("score");
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [sheet, setSheet] = useState(false);
  const [myTsapId, setMyTsapId] = useState("KAM001");
  const [credits, setCredits] = useState(3);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [sending, setSending] = useState("");
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [savedSearches, setSavedSearches] = useState<any[]>([]);
  const [myPhone, setMyPhone] = useState("");   // 🐞 FIX (F06): fake "98480xxxxx" placeholder chupinche — ippudu nijamaina masked number matrame
  const [needsLogin, setNeedsLogin] = useState(false);
  const [facets, setFacets] = useState<Row | null>(null);
  const [serverSearches, setServerSearches] = useState<Row[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const reqId = useRef(0);

  const setF = useCallback((k: string, v: any) => setFilters((p) => ({ ...p, [k]: v })), []);

  /* ---------- viewer + credits + saved shortlist + saved searches ---------- */
  useEffect(() => {
    const id = localStorage.getItem("tsap_id");
    if (id) setMyTsapId(id.toUpperCase());
    const c = localStorage.getItem("tsap_credits");
    if (c) setCredits(parseInt(c));
    try {
      const ss = JSON.parse(localStorage.getItem(SAVED_SEARCHES_KEY) || "[]");
      if (Array.isArray(ss)) setSavedSearches(ss);
    } catch { /* ignore */ }
  }, []);

  const loadSaved = useCallback(async () => {
    if (!myTsapId) return;
    const { ok, data, needsLogin: nl } = await apiGet<Row>(`/api/saved/${myTsapId}`);
    if (!ok) { if (nl) setNeedsLogin(true); return; }
    const rows = (data?.items || data?.saved || []) as Row[];
    setSavedIds(rows.map((x) => x.profile?.tsap_id || x.saved_id).filter(Boolean));
  }, [myTsapId]);

  useEffect(() => { void loadSaved(); }, [loadSaved]);

  /* ---------- facets (chips counts) + server saved searches ---------- */
  useEffect(() => {
    void apiGet<Row>("/api/facets?limit=10").then(({ ok, data }) => { if (ok) setFacets((data?.facets as Row) || null); });
  }, []);

  const loadServerSearches = useCallback(async () => {
    if (!myTsapId || !getToken()) return;
    setLoadingSaved(true);
    const { ok, data } = await apiGet<Row>(`/api/saved-searches/${myTsapId}`);
    setLoadingSaved(false);
    if (ok && Array.isArray(data?.searches)) setServerSearches(data.searches as Row[]);
  }, [myTsapId]);

  useEffect(() => { void loadServerSearches(); }, [loadServerSearches]);

  /* ---------- fetch (debounced) ---------- */
  const load = useCallback(async () => {
    const id = ++reqId.current;
    setLoading(true);
    const qs = new URLSearchParams();
    const skip: Row = { age_min: 18, age_max: 60, salary_min: 0, verified_only: false, photo_only: false, nri_only: false, profession_first: false };
    Object.keys(filters).forEach((k) => {
      const v = filters[k];
      if (v === "" || v === null || v === undefined) return;
      if (v === false) { if (skip[k]) return; }
      if (v === true) qs.set(k, "true");
      else if (typeof v === "number") { if (skip[k] === v) return; qs.set(k, String(v)); }
      else if (k in skip && String(skip[k]) === String(v)) return;
      else qs.set(k, String(v));
    });
    qs.set("sort", sort);
    qs.set("limit", "30");
    if (myTsapId) qs.set("viewer_id", myTsapId);
    const { ok, data, errorTelugu: eTel } = await apiGet<Row>(`/api/search?${qs.toString()}`);
    if (id !== reqId.current) return;
    if (ok && Array.isArray(data?.results)) {
      setRows(data!.results as Row[]);
      setTotal(Number(data?.total ?? (data!.results as Row[]).length));
      setMsg(String(data?.message_telugu || ""));
      if (data?.facets && Object.keys(data.facets as Row).length) setFacets(data.facets as Row);
    } else {
      setRows([]);
      setTotal(0);
      setMsg(`⚠️ ${eTel || (te ? "Results రాలేదు — filters మార్చి మళ్లీ try చెయ్యండి" : "No results found — change filters and retry")}`);
    }
    setLoading(false);
  }, [filters, sort, myTsapId, te]);

  useEffect(() => {
    const t = setTimeout(load, 320);
    return () => clearTimeout(t);
  }, [load]);

  /* ---------- actions ---------- */
  const toggleSave = async (row: Row) => {
    const { ok, data, errorTelugu: eTel, needsLogin: nl } = await apiPost<Row>("/api/save", { tsap_id: myTsapId, target_id: row.tsap_id });
    if (nl) { setNeedsLogin(true); return; }
    if (!ok) { setNote({ ok: false, text: eTel }); return; }
    const saved = !!data?.saved;
    setSavedIds((prev) => (saved ? (prev.includes(row.tsap_id) ? prev : [...prev, row.tsap_id])
                                 : prev.filter((x) => x !== row.tsap_id)));
    setNote({ ok: true, text: String(data?.message_telugu || (te ? "Shortlist update అయ్యింది" : "Shortlist updated")) });
  };

  const sendInterest = async (row: Row, templateId?: string) => {
    setSending(row.tsap_id);
    setNote(null);
    const { ok, data, errorTelugu: eTel, needsLogin: nl, status } = await apiPost<Row>("/api/interest/send",
      { from_id: myTsapId, to_id: row.tsap_id, channel: "matches_page", ...(templateId ? { template_id: templateId } : {}) });
    if (nl) { setNeedsLogin(true); setSending(""); return; }
    if (ok) {
      setNote({ ok: true, text: String(data?.message_telugu || (te ? "Interest పంపించారు" : "Interest sent")) });
      if (data?.credits_left !== undefined) {
        setCredits(Number(data.credits_left));
        localStorage.setItem("tsap_credits", String(data.credits_left));
      }
    } else if (status === 402) {
      setNote({ ok: false, text: te ? "⚠️ Credits అయిపోయాయి — ₹99 → 5 profiles. Phone numbers కూడా accept తోనే (consent)." : "⚠️ Credits over — ₹99 → 5 profiles. Phone numbers also only with accept (consent)." });
    } else {
      setNote({ ok: false, text: eTel || (te ? "Interest పంపలేదు" : "Interest not sent") });
    }
    setSending("");
  };

  const shareText = (row: Row) =>
    `🙏 ${SITE_CONFIG.brandName} profile — ${firstName(row.full_name)} (${row.tsap_id})\n` +
    `👉 ${row.age}y • ${row.caste} • ${row.education} • ${row.job}${row.company ? " @ " + row.company : ""}\n` +
    `📍 ${row.district}, ${row.state} • 💰 ${row.salary} • ⭐ ${row.star || "—"}\n` +
    `Full details: ${SITE_CONFIG.siteUrl || "https://manavivaha.in"}/search/${row.tsap_id}`;

  const shareWhatsApp = (row: Row) =>
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText(row))}`, "_blank");
  const shareTelegram = (row: Row) =>
    window.open(`https://t.me/share/url?url=${encodeURIComponent((SITE_CONFIG.siteUrl || "https://manavivaha.in") + "/search/" + row.tsap_id)}&text=${encodeURIComponent(shareText(row))}`, "_blank");

  const copySearchLink = () => {
    const url = `${window.location.origin}/matches?${new URLSearchParams(
      Object.keys(filters).filter((k) => filters[k] !== "" && filters[k] !== false).map((k) => [k, String(filters[k])] as [string, string])
    ).toString()}`;
    navigator.clipboard?.writeText(url);
    setNote({ ok: true, text: te ? "🔗 Search link copy అయ్యింది — WhatsApp group లో పెట్టండి (వాళ్లు కూడా ఈ filters తో చూస్తారు)" : "🔗 Search link copied — share in WhatsApp group (they see with these filters)" });
  };

  const saveSearch = async () => {
    const active = activeChips;
    if (!active.length) { setNote({ ok: false, text: te ? "మొదట filters select చెయ్యండి" : "Select filters first" }); return; }
    const label = active.map((c) => c.label).join(" • ");
    // 1) server lo save (kotha match alert WhatsApp tho vastundi)
    if (getToken()) {
      const serverFilters: Row = {};
      Object.keys(filters).forEach((k) => {
        const v = filters[k];
        if (v === "" || v === null || v === undefined || v === false || v === 0) return;
        if (k === "age_min" && v === 18) return;
        if (k === "age_max" && v === 60) return;
        serverFilters[k] = v;
      });
      const { ok, data, errorTelugu: eTel, needsLogin: nl } = await apiPost<Row>("/api/saved-searches",
        { tsap_id: myTsapId, name: label.slice(0, 40), filters: serverFilters, alert: true });
      if (nl) { setNeedsLogin(true); return; }
      if (ok) {
        setServerSearches((p) => [data?.search as Row, ...p].filter(Boolean));
        setNote({ ok: true, text: te ? `🔔 Saved! "${label}" — కొత్త profiles వస్తే WhatsApp alert వస్తుంది` : `🔔 Saved! "${label}" — WhatsApp alert for new matches` });
        return;
      }
      setNote({ ok: false, text: eTel || (te ? "Save అవ్వలేదు" : "Save failed") });
      return;
    }
    // 2) login ledu → local save (browser lo)
    const next = [{ label, filters: { ...filters }, sort }, ...savedSearches.filter((s) => s.label !== label)].slice(0, 8);
    setSavedSearches(next);
    localStorage.setItem(SAVED_SEARCHES_KEY, JSON.stringify(next));
    setNote({ ok: true, text: te ? `🔔 Search save అయ్యింది: ${label} — WhatsApp alerts కి OTP login చెయ్యండి` : `🔔 Search saved: ${label} — OTP login for WhatsApp alerts` });
  };

  /** Kotha matches ni WhatsApp ki pampu (saved search alerts) */
  const sendAlerts = async () => {
    if (!getToken()) { setNeedsLogin(true); return; }
    const { ok, data, errorTelugu: eTel } = await apiPost<Row>(`/api/saved-searches/${myTsapId}/alerts`, {});
    setNote(ok ? { ok: true, text: String(data?.message_telugu || (te ? "Alerts ఆన్ చేసాం" : "Alerts turned on")) }
               : { ok: false, text: eTel });
    if (ok) void loadServerSearches();
  };

  const removeServerSearch = async (searchId: string) => {
    const { ok } = await apiPost(`/api/saved-searches/${myTsapId}/${searchId}`, {});
    if (ok) setServerSearches((p) => p.filter((x) => x.search_id !== searchId));
  };

  /* ---------- active filter chips ---------- */
  const activeChips = useMemo(() => {
    const out: { key: string; label: string; clear: () => void }[] = [];
    const add = (key: string, label: string, v: any) => out.push({ key, label, clear: () => setF(key, v) });
    if (filters.gender) add("gender", filters.gender === "Bride" ? "👰 Brides" : "🤵 Grooms", "");
    if (filters.q) add("q", `🔍 "${filters.q}"`, "");
    if (filters.state) add("state", filters.state === "TS" ? "Telangana" : filters.state === "AP" ? "Andhra" : filters.state, "");
    if (filters.district) add("district", filters.district, "");
    if (filters.caste) add("caste", filters.caste, "");
    if (filters.job) add("job", filters.job, "");
    if (filters.education) add("education", filters.education, "");
    if (filters.marital_status) add("marital_status", filters.marital_status, "");
    if (filters.children) add("children", `👶 ${filters.children}`, "");
    if (filters.religion) add("religion", filters.religion, "");
    if (filters.salary_min) add("salary_min", `💰 ${filters.salary_min / 100000}L+`, 0);
    if (filters.age_min !== 18 || filters.age_max !== 60) add("age_min", `🎂 ${filters.age_min}–${filters.age_max}y`, 18);
    if (filters.verified_only) add("verified_only", "✅ Verified", false);
    if (filters.photo_only) add("photo_only", "📸 Photo", false);
    if (filters.nri_only) add("nri_only", "✈️ NRI", false);
    if (filters.profession_first) add("profession_first", "💼 Profession-first", false);
    if (filters.salary_max) add("salary_max", `💰 ≤${Number(filters.salary_max) / 100000}L`, 0);
    if (filters.height_min || filters.height_max) add("height_min", `📏 ${filters.height_min || "any"}–${filters.height_max || "any"}`, "");
    if (filters.dosham) add("dosham", `🧿 Dosham: ${filters.dosham}`, "");
    if (filters.min_completeness) add("min_completeness", `📝 ${filters.min_completeness}%+ complete`, 0);
    if (filters.exclude_viewed) add("exclude_viewed", te ? "🙈 చూసిన వాళ్లు తీసెయ్" : "🙈 Hide viewed", false);
    if (filters.exclude_interested) add("exclude_interested", te ? "💌 Interest పంపిన వాళ్లు తీసెయ్" : "💌 Hide contacted", false);
    return out;
  }, [filters, setF]);

  const resultsInfo = loading ? (te ? "⏳ వెతుకుతున్నాం…" : "⏳ Searching…") : te ? `${total} profiles దొరికాయి` : `${total} profiles found`;

  /* ---------- card ---------- */
  const Card = ({ row }: { row: Row }) => {
    const saved = savedIds.includes(row.tsap_id);
    const initial = String(row.full_name || "?").trim().charAt(0).toUpperCase();
    return (
      <div className="bg-white rounded-[1.5rem] border border-gold/25 card-shadow overflow-hidden">
        <div className="flex gap-3 p-4">
          <Link href={`/search/${row.tsap_id}`} className="shrink-0">
            {row.photo_url || row.has_photo ? (
              <img src={row.photo_url || `/photos/${row.tsap_id}_1.jpg`} alt={row.full_name}
                className="w-[84px] h-[104px] rounded-2xl object-cover border border-gold/40" />
            ) : (
              <div className="w-[84px] h-[104px] rounded-2xl maroon-gradient text-white flex flex-col items-center justify-center border border-gold/40">
                <span className="text-3xl font-bold telugu">{initial}</span>
                <span className="text-[9px] mt-1 opacity-90">{te ? "photo లేదు" : "no photo"}</span>
              </div>
            )}
          </Link>

          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <div className="font-bold text-[15px] text-ink truncate">
                  {firstName(row.full_name)}
                  {row.verification === "id" || row.id_verified ? <span className="ml-1 text-[11px]" title="ID verified — full trust">🏅</span>
                    : row.verification === "photo" || row.photo_verified ? <span className="ml-1 text-[11px]" title="Photo verified">📸✅</span>
                    : (row.phone_verified || row.verification === "phone") ? <span className="ml-1 text-[11px] text-emerald-700" title="Phone verified">✅</span> : null}
                  {row.selfie_verified ? <span className="ml-1 text-[11px]" title="Selfie verified">🤳</span> : null}
                  {row.boosted ? <span className="ml-1 text-[11px]">⚡</span> : null}
                </div>
                <div className="text-[11px] text-gray-500 font-mono">{row.tsap_id}</div>
              </div>
              {row.score ? (
                <div className="shrink-0 text-center">
                  <div className="w-12 h-12 rounded-full gold-gradient text-maroon font-bold flex items-center justify-center text-[15px]">
                    {row.score}
                  </div>
                  <div className="text-[9px] text-gray-500 mt-0.5">{te ? "మ్యాచ్ %" : "match %"}</div>
                </div>
              ) : null}
            </div>

            <div className="mt-1.5 text-[12px] text-gray-700 leading-relaxed">
              {row.age}y • {row.height || "—"} • <b>{row.caste}</b>{row.sub_caste ? ` (${row.sub_caste})` : ""}<br />
              🎓 {row.education}{row.education_detail ? ` ${row.education_detail}` : ""} • 💼 {row.job}{row.company ? ` @ ${row.company}` : ""}<br />
              {row.is_nri ? <span className="inline-block text-[11px] font-bold bg-sky-100 text-sky-800 px-2 py-0.5 rounded-full mr-1">✈️ NRI{row.country && row.country !== "India" ? ` • ${row.country}` : ""}</span> : null}
              {row.profession_label ? <span className="inline-block text-[11px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">{row.profession_label}</span> : null}<br />
              📍 {row.district}, {row.state}{row.work_location ? ` • work: ${row.work_location}` : ""} • 💰 {row.salary}
            </div>

            <div className="mt-1.5 flex flex-wrap gap-1.5 text-[10px]">
              <span className="bg-cream border border-gold/30 rounded-full px-2 py-0.5">⭐ {row.star || "—"} / {row.rasi || "—"}</span>
              <span className="bg-cream border border-gold/30 rounded-full px-2 py-0.5">🕉️ {row.gothram || "—"}</span>
              <span className="bg-cream border border-gold/30 rounded-full px-2 py-0.5">💍 {row.marital_status || "—"}</span>
              {row.children && row.children !== "None" ? <span className="bg-cream border border-gold/30 rounded-full px-2 py-0.5">👶 {row.children} {duo("children", "పిల్లలు")}</span> : null}
              {row.verification_telugu ? (
                <span className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-full px-2 py-0.5">
                  🛡️ {row.verification_telugu}
                </span>
              ) : null}
              {row.porutham?.score ? (
                <span className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-full px-2 py-0.5">
                  🧮 {row.porutham.score}/{row.porutham.max} — {row.porutham.verdict}
                </span>
              ) : null}
              {/* ⚡ WAVE 11: boosted badge */}
              {row.boosted ? (
                <span className="bg-amber-50 border border-amber-300 text-amber-800 rounded-full px-2 py-0.5">
                  ⚡ Boosted (top)
                </span>
              ) : null}
              <TrustBadge trust={row.trust} completeness={row.quality_percent} />
              {/* 🔒 Numbers ivvamu — interest pampi accept ayithe matrame exchange */}
              <span className="bg-rose-50 border border-rose-200 text-rose-800 rounded-full px-2 py-0.5"
                title={te ? "Numbers ఎప్పుడూ public గా కనిపించవు" : "Numbers never show publicly"}>
                🔒 Number: {row.phone_masked || "•••••"} (locked)
              </span>
            </div>
            {/* 🎙️ WAVE 11: voice intro player */}
            {(row.voice_url || row.has_voice) ? (
              <div className="mt-2 flex items-center gap-2 rounded-xl bg-violet-50 border border-violet-200 px-2 py-1.5">
                <span className="text-[11px] font-bold text-violet-800 whitespace-nowrap">🎙️ Voice</span>
                <audio controls preload="none" src={row.voice_url} className="h-8 flex-1 min-w-0" />
              </div>
            ) : null}
          </div>
        </div>

        <ScoreBreakdown v2={row.match_v2} />

        {Array.isArray(row.reasons) && row.reasons.length > 0 && (
          <div className="mx-4 mb-3 bg-cream rounded-2xl p-3">
            <div className="text-[11px] font-bold text-maroon">💡 Enduku match avutharu?</div>
            <ul className="mt-1 space-y-0.5">
              {row.reasons.slice(0, 4).map((r: string, i: number) => (
                <li key={i} className="text-[11px] text-gray-700">✔️ {r}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="px-4 pb-4 flex flex-wrap gap-2">
          <Link href={`/search/${row.tsap_id}`} className="flex-1 min-w-[92px] py-2.5 rounded-xl border border-maroon/25 text-center text-[12px] font-bold text-maroon">
            👁️ Profile
          </Link>
          <button onClick={() => sendInterest(row)} disabled={sending === row.tsap_id}
            className="flex-1 min-w-[140px] py-2.5 rounded-xl maroon-gradient text-white text-[12px] font-bold disabled:opacity-60">
            {sending === row.tsap_id ? duo("Sending…", "పంపిస్తున్నాం…") : `💌 ${duo("Interest (1 credit)", "ఇంట్రెస్ట్ (1 క్రెడిట్)")}`}
          </button>
          <a href={SITE_CONFIG.unlockBot(row.tsap_id)} target="_blank" rel="noreferrer"
            title={duo("Opens on Telegram — number for 1 credit", "టెలిగ్రామ్‌లో ఓపెన్ అవుతుంది — 1 క్రెడిట్‌తో నంబర్ వస్తుంది")}
            className="flex-1 min-w-[140px] py-2.5 rounded-xl gold-gradient text-maroon text-[12px] font-bold text-center">
            📞 {duo("Full details + Number", "పూర్తి వివరాలు + నంబర్")}
          </a>
          <button onClick={() => toggleSave(row)}
            className={`py-2.5 px-3 rounded-xl text-[12px] font-bold border ${saved ? "border-rose-300 bg-rose-50 text-rose-700" : "border-maroon/25 text-maroon"}`}>
            {saved ? `❤️ ${duo("Saved", "సేవ్ అయింది")}` : `🤍 ${duo("Save", "సేవ్")}`}
          </button>
          <button onClick={() => shareWhatsApp(row)} className="py-2.5 px-3 rounded-xl bg-green-600 text-white text-[12px] font-bold">WhatsApp</button>
          <button onClick={() => shareTelegram(row)} className="py-2.5 px-3 rounded-xl bg-blue-500 text-white text-[12px] font-bold">Telegram</button>
          <Link href={`/safety?target=${row.tsap_id}`} title="Report / Block"
            className="py-2.5 px-3 rounded-xl border border-rose-300 text-rose-700 text-[12px] font-bold">🚩</Link>
        </div>
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-cream pb-24 md:pb-10">
      {/* ---------- sticky header ---------- */}
      <div className="sticky top-0 z-30 bg-cream/95 backdrop-blur border-b border-gold/25 safe-top">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center gap-2">
            <Link href="/" className="text-[12px] font-bold text-maroon shrink-0">← {duo("Home", "హోమ్")}</Link>
            <div className="flex-1 flex items-center gap-2 bg-white border border-gold/40 rounded-2xl px-3">
              <span className="text-[15px]">🔍</span>
              <input value={filters.q} onChange={(e) => setF("q", e.target.value)} placeholder={duo("Name / caste / district / job…", "పేరు / కులం / జిల్లా / ఉద్యోగం…")}
                className="flex-1 py-3 bg-transparent outline-none text-[14px]" aria-label="Peru / caste / district / job…" />
            </div>
            <button onClick={() => setSheet(true)} className="md:hidden shrink-0 px-3 py-3 rounded-2xl maroon-gradient text-white text-[12px] font-bold">
              Filters{activeChips.length ? ` ${activeChips.length}` : ""}
            </button>
            <div className="hidden md:flex items-center gap-2 shrink-0">
              <input value={myTsapId} onChange={(e) => { const v = e.target.value.toUpperCase(); setMyTsapId(v); localStorage.setItem("tsap_id", v); }}
                className="text-[11px] font-mono bg-white border border-gold/40 rounded-full px-3 py-2 w-44" title={te ? "మీ Profile ID" : "Your Profile ID"} aria-label="Text input" />
              <span className="text-[11px] bg-white border border-gold/40 rounded-full px-3 py-2">credits <b>{credits}</b></span>
            </div>
          </div>

          <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
            {SORTS.map((s) => (
              <button key={s.v} onClick={() => setSort(s.v)}
                className={`chip shrink-0 ${sort === s.v ? "chip-on" : ""}`}>{te ? s.lTe : s.l}</button>
            ))}
            <button onClick={saveSearch} className="chip shrink-0">🔔 {duo("Save search", "సేవ్ చేయండి")}</button>
            <button onClick={() => void sendAlerts()} className="chip shrink-0" title={te ? "Saved searches కి కొత్త matches WhatsApp లో" : "New matches for saved searches on WhatsApp"}>
              📨 {duo("New-match alerts", "కొత్త సంబంధాలు")} {serverSearches.length ? `(${serverSearches.length})` : ""}
            </button>
            <button onClick={copySearchLink} className="chip shrink-0">🔗 {duo("Share search", "షేర్ చేయండి")}</button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-4 md:grid md:grid-cols-[280px_1fr] md:gap-5 md:items-start">
        {/* ---------- desktop filter sidebar ---------- */}
        <aside className="hidden md:block bg-white rounded-[1.5rem] border border-gold/25 p-4 sticky top-[132px] max-h-[76vh] overflow-y-auto">
          <div className="font-bold text-maroon text-[14px]">🔎 <Duo en="Filters" te="వడపోతలు" /> ({activeChips.length})</div>
          <button onClick={() => { setFilters({ ...DEFAULT_FILTERS }); setSort("score"); }}
            className="mt-2 w-full py-2 rounded-xl border border-maroon/20 text-[12px] font-bold text-maroon">♻️ {duo("Reset all", "అన్నీ రీసెట్")}</button>
          <div className="mt-3">
            <div className="text-[11px] font-bold text-ink"><Duo en="Whom to find?" te="ఎవరిని?" /></div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {[{ v: "", l: te ? "అందరూ" : "Everyone" }, { v: "Bride", l: "👰 Brides" }, { v: "Groom", l: "🤵 Grooms" }].map((g) => (
                <button key={g.v} onClick={() => setF("gender", g.v)} className={`chip ${filters.gender === g.v ? "chip-on" : ""}`}>{g.l}</button>
              ))}
            </div>
          </div>
          <div className="mt-3">
            <div className="text-[11px] font-bold text-ink">Age: <span className="text-maroon">{filters.age_min}–{filters.age_max}</span></div>
            <input type="range" min={18} max={60} value={filters.age_min} onChange={(e) => setF("age_min", Math.min(parseInt(e.target.value), filters.age_max))} className="w-full accent-[#7A0C2E]" aria-label="Text input" />
            <input type="range" min={18} max={60} value={filters.age_max} onChange={(e) => setF("age_max", Math.max(parseInt(e.target.value), filters.age_min))} className="w-full accent-[#7A0C2E]" aria-label="Text input" />
          </div>
          <div className="mt-3">
            <div className="text-[11px] font-bold text-ink">State</div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {["", "TS", "AP", "Other"].map((s) => (
                <button key={s || "all"} onClick={() => { setF("state", s); setF("district", ""); }}
                  className={`chip ${filters.state === s ? "chip-on" : ""}`}>{s === "TS" ? "Telangana" : s === "AP" ? "Andhra Pradesh" : s === "Other" ? (te ? "ఇతర" : "Other") : (te ? "అన్నీ" : "All")}</button>
              ))}
            </div>
          </div>
          {filters.state ? (
            <div className="mt-3">
              <div className="text-[11px] font-bold text-ink">District</div>
              <div className="mt-1.5 flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                {(DISTRICTS_BY_STATE[filters.state] || []).map((d) => (
                  <button key={d} onClick={() => setF("district", filters.district === d ? "" : d)}
                    className={`chip ${filters.district === d ? "chip-on" : ""}`}>{d}</button>
                ))}
              </div>
            </div>
          ) : null}
          <div className="mt-3">
            <div className="text-[11px] font-bold text-ink">Caste</div>
            <div className="mt-1.5 flex flex-wrap gap-1.5 max-h-44 overflow-y-auto">
              {CASTES.slice(0, 20).map((c) => (
                <button key={c} onClick={() => setF("caste", filters.caste === c ? "" : c)}
                  className={`chip ${filters.caste === c ? "chip-on" : ""}`}>{c}</button>
              ))}
            </div>
          </div>
          <div className="mt-3">
            <div className="text-[11px] font-bold text-ink">Job</div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {JOBS.slice(0, 10).map((j) => (
                <button key={j} onClick={() => setF("job", filters.job === j ? "" : j)}
                  className={`chip ${filters.job === j ? "chip-on" : ""}`}>{j}</button>
              ))}
            </div>
          </div>
          <button onClick={() => setSheet(true)} className="mt-3 w-full py-2.5 rounded-xl gold-gradient text-maroon text-[12px] font-bold">
            {te ? "➕ ఇంకా ఎక్కువ filters (caste 43, edu, salary…)" : "➕ More filters (43 castes, edu, salary…)"}
          </button>
          {/* Matrimony search stays distraction-free: sponsored promotions are not shown inside match results. */}
        </aside>

        <TopPicks />

        {/* ---------- results ---------- */}
        <section className="min-w-0">
          <ProfileRail kind="recent" />
          {note && (
            <div className={`mb-3 rounded-2xl px-4 py-3 text-[13px] border ${note.ok ? "bg-emerald-50 border-emerald-200 text-emerald-900" : "bg-amber-50 border-amber-200 text-amber-900"}`}>
              {note.text}{!note.ok && <> <Link href="/requests" className="underline font-bold">Requests page →</Link></>}
            </div>
          )}

          <div className="mb-3"><QuickLead source="matches_page" /></div>
          {/* Mobile match results also remain ad-free. */}

          <div className="maroon-gradient text-white rounded-[1.5rem] p-4">
            <div className="font-bold text-[14px] telugu">{te ? "🚫 Chatting లేదు — 💌 Interest పంపు, accept అయితే WhatsApp లో numbers exchange" : "🚫 No chatting — 💌 send Interest, numbers exchange on WhatsApp after accept"}</div>
            <div className="text-[12px] opacity-90 mt-1 telugu">
              {te ? <>మొదటి 3 interest requests <b>FREE</b> • 1 request = 1 credit • Decline అయితే credit refund.</> : <>First 3 interest requests <b>FREE</b> • 1 request = 1 credit • Credit refund on decline.</>}
            </div>
          </div>

          {activeChips.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {activeChips.map((c) => (
                <button key={c.key} onClick={c.clear} className="chip">
                  {c.label} <span className="text-maroon font-bold">✕</span>
                </button>
              ))}
              <button onClick={() => setFilters({ ...DEFAULT_FILTERS })} className="chip">{te ? "♻️ అన్నీ clear" : "♻️ Clear all"}</button>
            </div>
          )}

          {savedSearches.length > 0 && (
            <div className="mt-3">
              <div className="text-[11px] font-bold text-ink mb-1.5">{te ? "🔔 మీ saved searches" : "🔔 Your saved searches"}</div>
              <div className="flex flex-wrap gap-1.5">
                {savedSearches.map((s, i) => (
                  <button key={i} onClick={() => { setFilters({ ...DEFAULT_FILTERS, ...s.filters }); setSort(s.sort || "score"); }} className="chip">
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-3 flex items-center justify-between">
            <div className="text-[12px] text-gray-600">{msg || resultsInfo}</div>
            <div className="text-[11px] text-gray-500 md:hidden">credits <b className="text-maroon">{credits}</b></div>
          </div>

          {/* 🔒 Numbers rule — crystal clear (free lo 3 profiles, numbers ivvamu) */}
          <div className="mt-2 rounded-2xl bg-white border border-gold/40 px-3 py-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
            <span className="font-bold text-maroon">{te ? "🔒 Numbers ఇవ్వము:" : "🔒 No numbers here:"}</span>
            <span className="text-gray-700">{te ? "profiles + full details FREE గా చూడొచ్చు — కానీ phone numbers lock." : "profiles + full details FREE to see — but phone numbers stay locked."}</span>
            <span className="text-gray-700">{te ? <>💌 Interest పంపండి → వాళ్లు <b>accept</b> చేస్తే రెండు numbers WhatsApp లో exchange.</> : <>💌 Send Interest → if they <b>accept</b>, both numbers exchange on WhatsApp.</>}</span>
            <Link href="/pricing" className="ml-auto font-bold text-maroon underline">
              ₹99 → 5 profiles + boost
            </Link>
          </div>

          {loading ? (
            <div className="mt-3 grid md:grid-cols-2 gap-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-[1.5rem] border border-gold/20 p-4" aria-hidden>
                  <div className="flex gap-3">
                    <div className="w-[84px] h-[104px] rounded-2xl skeleton-bar" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 skeleton-bar w-2/3" />
                      <div className="h-3 skeleton-bar w-1/3" />
                      <div className="h-3 skeleton-bar w-5/6" />
                      <div className="h-3 skeleton-bar w-3/4" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="mt-4 bg-white rounded-[1.5rem] p-8 text-center border border-gold/25">
              <div className="text-4xl">🔍</div>
              <div className="font-bold text-ink mt-2">{te ? "ఈ filters కి profiles దొరకలేదు" : "No profiles for these filters"}</div>
              <div className="text-[12px] text-gray-500 mt-1">{te ? "Try చెయ్యండి: age range పెంచండి, district remove చెయ్యండి, salary తగ్గించండి." : "Try: widen age range, remove district, lower salary."}</div>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                <button onClick={() => setFilters({ ...DEFAULT_FILTERS })} className="chip">{te ? "♻️ అన్ని filters clear" : "♻️ Clear all filters"}</button>
                <button onClick={() => setF("age_max", 60)} className="chip">{te ? "🎂 Age 60 వరకు" : "🎂 Age up to 60"}</button>
                <button onClick={() => { setF("district", ""); setF("salary_min", 0); }} className="chip">📍 District + 💰 salary remove</button>
              </div>
            </div>
          ) : (
            <div className="mt-3 grid md:grid-cols-2 gap-4">
              {rows.map((row) => <Card key={row.tsap_id} row={row} />)}
            </div>
          )}

          {/* ---------- pricing strip (new ladder) ---------- */}
          <div className="mt-6 bg-white rounded-[1.5rem] p-4 border border-gold/25 text-center">
            <div className="text-[14px] font-bold text-maroon">1 credit = 1 interest request</div>
            <div className="text-[12px] text-gray-600 mt-1">
              FREE 3 • ₹99 → 5 • ₹199 → 12 • ₹299 → 25 • ₹499 → 50 (VIP) —
              <span className="text-maroon font-bold"> pedda tier lo ₹/profile thaggutundi</span>
            </div>
            <div className="text-[11px] text-gray-500 mt-1">Add-ons: ⚡ Boost ₹49 • 👀 Who-viewed ₹49 • 🧮 Porutham ₹99 • ✅ Verify badge ₹199</div>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <Link href="/requests" className="px-5 py-2 gold-gradient rounded-full text-[13px] font-bold text-maroon">💌 Credits teesukondi</Link>
              <Link href="/register" className="px-5 py-2 maroon-gradient rounded-full text-[13px] font-bold text-white">📝 Free profile create</Link>
            </div>
          </div>
        </section>
      </div>

      <FilterSheet
        open={sheet} onClose={() => setSheet(false)} filters={filters} setF={setF}
        reset={() => setFilters({ ...DEFAULT_FILTERS })} onApply={() => setSheet(false)} resultsInfo={resultsInfo}
        facets={facets}
      />

      {needsLogin ? (
        <div className="mx-auto mt-6 max-w-3xl px-4">
          <AuthGate title={te ? "🔒 Shortlist / saved searches కి login చెయ్యండి" : "🔒 Login for shortlist / saved searches"}
            note={te ? "Matches చూడటం FREE (login అక్కర్లేదు). కానీ మీ shortlist, కొత్త-match alerts, inbox — ఈ private data కి OTP login కావాలి (మీ privacy కోసం)." : "Browsing matches is FREE (no login). But your shortlist, new-match alerts, inbox — this private data needs OTP login (for your privacy)."} />
        </div>
      ) : null}

      {serverSearches.length > 0 ? (
        <div className="mx-auto mt-6 max-w-3xl px-4">
          <div className="rounded-2xl border border-gold/40 bg-white p-3">
            <p className="text-[12px] font-bold text-maroon">{te ? `🔔 మీ saved searches (${serverSearches.length}) — కొత్త matches WhatsApp alerts` : `🔔 Your saved searches (${serverSearches.length}) — new matches on WhatsApp`}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {serverSearches.map((sr) => (
                <span key={String(sr.search_id)} className="inline-flex items-center gap-1 rounded-full bg-cream border border-gold/30 px-3 py-1 text-[11px]">
                  {String(sr.name || "search")}
                  {Number(sr.new_matches) > 0 ? <b className="text-emerald-700"> · {Number(sr.new_matches)} new</b> : null}
                  <button onClick={() => void removeServerSearch(String(sr.search_id))} title="Delete"
                    className="ml-1 text-rose-600 font-bold">✕</button>
                </span>
              ))}
            </div>
            <button onClick={() => void sendAlerts()} className="mt-2 rounded-xl bg-[#7A0C2E] px-3 py-2 text-[11px] font-bold text-white">
              {te ? "📨 ఇప్పుడే కొత్త matches WhatsApp కి పంపు" : "📨 Send new matches to WhatsApp now"}
            </button>
          </div>
        </div>
      ) : null}

      {myPhone ? (
        <div className="fixed bottom-20 right-3 z-20 md:hidden">
          <Link href="/requests" className="bg-white border border-gold/40 rounded-full px-4 py-2.5 text-[11px] font-bold text-maroon card-shadow">
            💌 Requests
          </Link>
        </div>
      ) : null}
    </main>
  );
}
