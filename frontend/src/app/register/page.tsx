"use client";

/**
 * 👑 MANA VIVAHA — SMART MATRIMONY REGISTRATION (V5)
 * ===================================================
 * • Responsive Dual-Column Desktop Layout + Live Matrimony Card Preview
 * • Ultra-neat Mobile Wizard with Sticky Step Navigation
 * • 5-Step Intuitive Flow: Basic -> Caste & Astro -> Career -> Location & Family -> Photo & Submit
 * • Comprehensive Telugu & English Data: 33 TS + 26 AP Districts, 27 Vedic Nakshatras & Rasis
 * • Strict Photo Validation: Client-side HD compression, clarity check, privacy toggle
 * • 1-Click Sample Demos, Voice Typing Bio 🎙️, AI Bio Generators
 * • Real-time Draft Auto-Save & Referral Bonus integration
 */
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Reveal from "@/components/Reveal";
import { SITE_CONFIG } from "@/lib/site-config";
import { authHeaders } from "@/lib/api";
import { Duo, duo } from "@/lib/duo";
import { useLang } from "@/lib/lang";
import PhotoFlow from "@/components/PhotoFlow";
import { TelegramIcon, WhatsAppIcon } from "@/components/BrandIcons";
import { waLink } from "@/lib/wa";
import {
  BLOOD_GROUPS,
  BODY_TYPES,
  CASTES,
  CASTE_SUBCASTES,
  CASTE_TELUGU,
  CHILDREN_OPTIONS,
  COMPLEXIONS,
  DISTRICTS_BY_STATE,
  DISTRICT_TELUGU,
  EDUCATIONS,
  EDUCATION_CATEGORIES,
  EDUCATION_TELUGU,
  FAMILY_STATUSES,
  FAMILY_TYPES,
  FAMILY_VALUES,
  HEIGHTS,
  JOBS,
  MARITAL_STATUSES,
  MOTHER_TONGUES,
  NAKSHATRAS,
  NAK_TO_RASI,
  NRI_COUNTRIES,
  OCCUPATIONS,
  OTHER_INDIAN_STATES,
  OTHER_LOCATIONS,
  PHYSICAL_STATUS,
  RASIS,
  RELIGIONS,
  SALARIES,
  SALARIES_DETAILED,
  SALARY_TELUGU,
  TS_DISTRICTS_DETAILED,
  AP_DISTRICTS_DETAILED,
  WORK_TYPES,
  WORK_TYPES_DETAILED,
  WORK_TYPE_TELUGU,
  ageFromDob,
  compressImage,
  heightLabel,
  maxDobFor18,
} from "@/lib/telugu-data";

const DRAFT_KEY = "shubhalagnam_reg_draft_v5";

const STEPS = [
  { n: 1, label: "Basic Details", labelTe: "ప్రాథమిక వివరాలు", icon: "🙋", hint: "వధువు/వరుడు, పేరు, వయసు & ఎత్తు", hintEn: "Bride/Groom, name, age & height" },
  { n: 2, label: "Caste & Astrology", labelTe: "కులం & జ్యోతిషం", icon: "💍", hint: "కులం, నక్షత్రం, రాశి & గోత్రం", hintEn: "Caste, Nakshatram, Rasi & Gothram" },
  { n: 3, label: "Career & Education", labelTe: "ఉద్యోగం & విద్య", icon: "💼", hint: "వృత్తి రంగం, చదువు & వార్షిక వేతనం", hintEn: "Work sector, Education & Salary" },
  { n: 4, label: "Location & Family", labelTe: "ప్రాంతం & కుటుంబం", icon: "📍", hint: "జిల్లా/దేశం, కుటుంబ వివరాలు & ఫోన్", hintEn: "District/Country, Family & Phone" },
  { n: 5, label: "Photo & Finish", labelTe: "ఫోటో & పూర్తి", icon: "📸", hint: "ఫోటో అప్‌లోడ్, బయోడేటా & నమోదు", hintEn: "Photo upload, Bio & Registration" },
];

const DEFAULT_FORM: Record<string, any> = {
  gender: "",
  full_name: "",
  profile_for: "Self",
  dob: "",
  birth_time: "",
  age: "",
  height: "",
  marital_status: "Pelli Kaledu",
  children: "",
  religion: "Hindu",
  mother_tongue: "Telugu",
  caste: "",
  sub_caste: "",
  gothram: "",
  star: "",
  rasi: "",
  moola_nakshatram: "No",
  dosham: "No",
  work_type: "Software / IT / Tech",
  education: "B.Tech / B.E.",
  education_detail: "",
  job: "Software Engineer",
  company: "",
  salary: "₹10 - 12 Lakhs / year",
  experience: "3 years",
  work_location: "",
  father_name: "",
  father_occupation: "",
  mother_name: "",
  mother_occupation: "",
  brothers: "0",
  brothers_married: "0",
  sisters: "0",
  sisters_married: "0",
  family_type: "Nuclear",
  family_status: "Middle Class",
  family_values: "Traditional",
  native_place: "",
  state: "TS",
  district: "",
  nri_country: "",
  mandal: "",
  current_city: "",
  country: "India",
  pincode: "",
  phone: "",
  email: "",
  password: "",
  photo_private: false,
  about_myself: "",
  expectations: "",
  exp_age_min: "",
  exp_age_max: "",
  exp_job: "",
  exp_location: "",
  exp_caste: "",
  physical_status: "Normal",
  body_type: "Average",
  complexion: "Fair",
  blood_group: "",
  referral_code: "",
  consent: false,
};

/* ---------------- UI Helpers ---------------- */
function Chip({ on, gold, children, onClick }: { on?: boolean; gold?: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
        on
          ? gold
            ? "bg-[#D4AF37] text-[#5C0822] border-[#D4AF37] shadow-sm scale-[1.02]"
            : "bg-[#7A0C2E] text-white border-[#7A0C2E] shadow-sm scale-[1.02]"
          : "bg-white text-slate-700 border-slate-200 hover:border-maroon/40 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}

function ChipGroup({
  label,
  options,
  value,
  onChange,
  required,
  searchable,
  te,
  hint,
  cols,
}: {
  label: React.ReactNode;
  options: { v: string; te?: string }[];
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  searchable?: boolean;
  te?: boolean;
  hint?: string;
  cols?: number;
}) {
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return options;
    return options.filter((o) => o.v.toLowerCase().includes(needle) || (o.te || "").includes(q.trim()));
  }, [q, options]);

  return (
    <div className="space-y-1.5">
      <label className="text-[13px] font-bold text-slate-800 flex items-center justify-between">
        <span>
          {label} {required ? <span className="text-rose-600 font-black">*</span> : <span className="text-[11px] text-gray-400 font-normal">(ఐచ్ఛికం)</span>}
        </span>
      </label>
      {hint && <div className="text-[11px] text-slate-500">{hint}</div>}
      {searchable && (
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="🔍 టైప్ చేసి వెతకండి / Type to search…"
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-maroon/20 focus:border-maroon"
          inputMode="search"
        />
      )}
      <div className={`flex flex-wrap gap-2 ${cols === 1 ? "flex-col" : ""}`}>
        {list.slice(0, searchable ? 60 : 40).map((o) => (
          <Chip key={o.v} on={value === o.v} gold={te} onClick={() => onChange(value === o.v ? "" : o.v)}>
            {te && o.te ? <span className="telugu font-semibold">{o.te}</span> : null}
            <span>{o.v}</span>
          </Chip>
        ))}
      </div>
    </div>
  );
}

function SearchSelect({
  label,
  options,
  value,
  onChange,
  required,
  hint,
  placeholder,
  teMap,
}: {
  label: React.ReactNode;
  options: string[];
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  hint?: string;
  placeholder?: string;
  teMap?: Record<string, string>;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return options;
    return options.filter((o) => o.toLowerCase().includes(needle) || (teMap?.[o] || "").toLowerCase().includes(needle));
  }, [q, options, teMap]);

  return (
    <div ref={boxRef} className="relative space-y-1.5">
      <label className="text-[13px] font-bold text-slate-800 flex items-center justify-between">
        <span>
          {label} {required ? <span className="text-rose-600 font-black">*</span> : <span className="text-[11px] text-gray-400 font-normal">(ఐచ్ఛికం)</span>}
        </span>
      </label>
      {hint && <div className="text-[11px] text-slate-500">{hint}</div>}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full min-h-[46px] rounded-xl border px-3.5 py-2.5 text-left flex items-center justify-between transition ${
          value ? "bg-white border-maroon/40 text-slate-900 font-semibold shadow-xs" : "bg-slate-50 border-slate-200 text-slate-400"
        }`}
      >
        <span className="truncate text-xs sm:text-sm">
          {value ? (
            teMap?.[value] ? (
              <span>
                <b className="text-maroon telugu">{teMap[value]}</b> <span className="text-gray-500 font-normal text-xs ml-1">({value})</span>
              </span>
            ) : (
              value
            )
          ) : (
            placeholder || "ఎంచుకోండి / Select…"
          )}
        </span>
        <span className="text-maroon text-base shrink-0 ml-2">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-full bg-white border border-gold/40 rounded-2xl shadow-xl overflow-hidden animate-fade">
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="🔍 వెతకండి / Type to search…"
            className="w-full px-4 py-2.5 border-b border-gold/20 outline-none text-xs sm:text-sm bg-amber-50/40"
          />
          <div className="max-h-64 overflow-y-auto">
            {value && (
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setOpen(false);
                  setQ("");
                }}
                className="w-full text-left px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 border-b border-slate-100"
              >
                ✕ ఎంపిక క్లియర్ చేయండి (Clear)
              </button>
            )}
            {list.slice(0, 200).map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => {
                  onChange(o);
                  setOpen(false);
                  setQ("");
                }}
                className={`w-full text-left px-4 py-2.5 text-xs sm:text-sm hover:bg-amber-50 transition border-b border-slate-50 last:border-0 ${
                  value === o ? "bg-maroon-soft font-bold text-maroon" : "text-slate-800"
                }`}
              >
                {teMap?.[o] ? (
                  <div className="flex items-center justify-between w-full">
                    <span className="font-bold text-maroon telugu">{teMap[o]}</span>
                    <span className="text-slate-500 text-xs">({o})</span>
                  </div>
                ) : (
                  <span>{o}</span>
                )}
              </button>
            ))}
            {list.length === 0 && (
              <div className="px-4 py-3 text-xs text-gray-500">
                దొరకలేదు —{" "}
                <button
                  type="button"
                  onClick={() => {
                    onChange(q.trim());
                    setOpen(false);
                  }}
                  className="text-maroon font-bold underline"
                >
                  “{q}” ని ఎంచుకోండి
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  required,
  hint,
  type = "text",
  inputMode,
  max,
  optional,
  telugu,
}: {
  label: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  hint?: string;
  type?: string;
  inputMode?: "text" | "tel" | "numeric" | "email" | "decimal";
  max?: string;
  optional?: boolean;
  telugu?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[13px] font-bold text-slate-800 flex items-center justify-between">
        <span>
          {label} {required ? <span className="text-rose-600 font-black">*</span> : optional ? <span className="text-[11px] text-gray-400 font-normal">(ఐచ్ఛికం)</span> : null}
        </span>
      </label>
      <input
        type={type}
        inputMode={inputMode}
        max={max}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full min-h-[46px] rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 transition focus:outline-none focus:ring-2 focus:ring-maroon/20 focus:border-maroon ${
          telugu ? "telugu font-semibold" : ""
        }`}
      />
      {hint && <div className="text-[11px] text-slate-500">{hint}</div>}
    </div>
  );
}

function PillGroup({
  label,
  options,
  value,
  onChange,
  required,
  hint,
}: {
  label: React.ReactNode;
  options: { v: string; en: string; te: string }[];
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="text-[13px] font-bold text-slate-800">
        {label} {required ? <span className="text-rose-600 font-black">*</span> : null}
      </div>
      {hint && <div className="text-[11px] text-slate-500">{hint}</div>}
      <div className="grid grid-cols-2 gap-2.5" role="radiogroup">
        {options.map((o) => {
          const on = value === o.v;
          return (
            <button
              key={o.v}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(o.v)}
              className={`rounded-2xl border-[1.5px] p-3 text-left transition-all active:scale-[0.98] ${
                on
                  ? "maroon-gradient text-white border-transparent shadow-brand font-bold"
                  : "border-slate-200 bg-white text-slate-800 font-medium hover:border-maroon/40"
              }`}
            >
              <div className="font-bold text-xs sm:text-sm">{o.en}</div>
              <div className={`text-[11px] mt-0.5 ${on ? "text-white/90 font-medium" : "text-slate-500"} telugu`}>{o.te}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  required,
  hint,
  placeholder,
  children,
}: {
  label: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  hint?: string;
  placeholder?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="text-[13px] font-bold text-slate-800">
        {label} {required ? <span className="text-rose-600 font-black">*</span> : null}
      </div>
      {hint && <div className="text-[11px] text-slate-500">{hint}</div>}
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full min-h-[46px] appearance-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 pr-10 text-xs sm:text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-maroon/20 focus:border-maroon ${
            value ? "text-slate-900" : "text-slate-400"
          }`}
        >
          <option value="">{placeholder || "ఎంచుకోండి / Select…"}</option>
          {children}
        </select>
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-maroon text-base">▼</span>
      </div>
    </div>
  );
}

function Stepper({
  label,
  value,
  onChange,
  max = 10,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  max?: number;
}) {
  const n = parseInt(value || "0", 10) || 0;
  return (
    <div className="flex items-center justify-between gap-2 bg-white rounded-2xl border border-gold/30 px-3 py-2">
      <span className="text-xs sm:text-[13px] font-bold text-slate-800 min-w-0 truncate">{label}</span>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => onChange(String(Math.max(0, n - 1)))}
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-full maroon-gradient text-white text-lg font-bold leading-none shrink-0 flex items-center justify-center shadow-xs"
        >
          −
        </button>
        <span className="w-5 text-center font-bold text-maroon text-sm shrink-0">{n}</span>
        <button
          type="button"
          onClick={() => onChange(String(Math.min(max, n + 1)))}
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-full gold-gradient text-maroon text-lg font-bold leading-none shrink-0 flex items-center justify-center shadow-xs"
        >
          +
        </button>
      </div>
    </div>
  );
}

/* ---------------- Main Wizard Component ---------------- */
function Wizard() {
  const { lang } = useLang();
  const te = lang === "te";
  const T = <V,>(a: V, b: V): V => (te ? a : b);
  const params = useSearchParams();

  const [step, setStep] = useState(1);
  const [f, setF] = useState<Record<string, any>>(DEFAULT_FORM);
  const [errs, setErrs] = useState<string[]>([]);
  const [shake, setShake] = useState(false);
  const [busy, setBusy] = useState(false);
  const [draftFound, setDraftFound] = useState(false);
  const [savedAt, setSavedAt] = useState<string>("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoInfo, setPhotoInfo] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [refLocked, setRefLocked] = useState("");
  const [refInfo, setRefInfo] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
  const [copied, setCopied] = useState("");
  const topRef = useRef<HTMLDivElement>(null);
  const voiceRef = useRef<any>(null);

  const [casteOpts, setCasteOpts] = useState<string[]>(CASTES);

  useEffect(() => {
    let live = true;
    fetch(`/api/meta/castes?religion=${encodeURIComponent(f.religion || "Hindu")}`)
      .then((r) => r.json())
      .then((d) => {
        if (live && d?.success && Array.isArray(d.castes) && d.castes.length) {
          setCasteOpts(d.castes);
          if (f.caste && !d.castes.includes(f.caste)) set("caste", "");
        }
      })
      .catch(() => setCasteOpts(CASTES));
    return () => {
      live = false;
    };
  }, [f.religion]);

  const set = (k: string, v: any) => {
    setF((prev) => ({ ...prev, [k]: v }));
    setErrs([]);
  };

  useEffect(() => {
    let ref = (params?.get("ref") || "").trim().toUpperCase();
    try {
      if (!ref) ref = (localStorage.getItem("tsap_ref_from_link") || localStorage.getItem("shubhalagnam_ref_from_link") || "").trim().toUpperCase();
      else {
        localStorage.setItem("tsap_ref_from_link", ref);
        localStorage.setItem("shubhalagnam_ref_from_link", ref);
      }
    } catch {
      /* ignore */
    }
    if (!ref) return;
    setRefLocked(ref);
    setF((prev) => ({ ...prev, referral_code: ref }));
    fetch(`/api/referral/click/${encodeURIComponent(ref)}?source=register_direct`, { method: "POST" })
      .then((r) => r.json())
      .then((d) => {
        if (d?.valid_code && d?.referrer_name) setRefInfo({ ok: true, referrer_name: d.referrer_name, bonus_credits: d.bonus_credits });
      })
      .catch(() => {});
  }, [params]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (d?.data && (d.data.full_name || d.data.phone)) {
        setDraftFound(true);
        setSavedAt(d.savedAt || "");
      }
    } catch {
      /* ignore */
    }
  }, []);

  const resumeDraft = () => {
    try {
      const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || "{}");
      setF({ ...DEFAULT_FORM, ...(d.data || {}) });
      setStep(Math.min(5, Math.max(1, d.step || 1)));
      setDraftFound(false);
    } catch {
      /* ignore */
    }
  };

  const clearDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    setDraftFound(false);
    setF({ ...DEFAULT_FORM, referral_code: refLocked });
  };

  useEffect(() => {
    if (result) return;
    const t = setTimeout(() => {
      try {
        const now = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ data: f, step, savedAt: now }));
        setSavedAt(now);
      } catch {
        /* ignore */
      }
    }, 700);
    return () => clearTimeout(t);
  }, [f, step, result]);

  useEffect(() => {
    const a = ageFromDob(f.dob);
    if (a && String(a) !== String(f.age)) setF((prev) => ({ ...prev, age: String(a) }));
  }, [f.dob]);

  useEffect(() => {
    if (f.star && !f.rasi && NAK_TO_RASI[f.star]) setF((prev) => ({ ...prev, rasi: NAK_TO_RASI[f.star] }));
  }, [f.star]);

  const scrollTop = () => topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const validate = (s: number): string[] => {
    const e: string[] = [];
    if (s === 1) {
      if (!f.gender) e.push(T("వధువు / వరుడు ఎంచుకోండి (Select Bride / Groom)", "Select Bride / Groom"));
      if (!String(f.full_name).trim()) e.push(T("పూర్తి పేరు నమోదు చేయండి (Enter full name)", "Enter full name"));
      if (!f.dob) e.push(T("పుట్టిన తేదీ ఎంచుకోండి (Select date of birth)", "Select date of birth"));
      else if (!ageFromDob(f.dob)) e.push(T("పుట్టిన తేదీ సరైనది కాదు — కనీసం 18 ఏళ్లు ఉండాలి", "DOB must be at least 18 years"));
      if (!f.height) e.push(T("ఎత్తు ఎంచుకోండి (Select height)", "Select height"));
      if (!f.marital_status) e.push(T("వైవాహిక స్థితి ఎంచుకోండి (Select marital status)", "Select marital status"));
      if (f.marital_status && f.marital_status !== "Pelli Kaledu" && !f.children) {
        e.push(T("పిల్లల సంఖ్య ఎంచుకోండి / Select number of children", "Select number of children"));
      }
    }
    if (s === 2) {
      if (!f.caste) e.push(T("కులం ఎంచుకోండి (Select caste)", "Select caste"));
    }
    if (s === 3) {
      if (!f.work_type) e.push(T("వృత్తి / ఉద్యోగ రంగం ఎంచుకోండి (Select Work Sector)", "Select Work Sector"));
      if (!f.education) e.push(T("విద్యార్హత ఎంచుకోండి (Select education)", "Select education"));
      if (!f.job) e.push(T("ఉద్యోగం / హోదా ఎంచుకోండి (Select occupation)", "Select occupation"));
      if (!f.salary) e.push(T("వార్షిక వేతనం ఎంచుకోండి (Select annual salary range)", "Select annual salary range"));
    }
    if (s === 4) {
      if (!f.state) e.push(T("రాష్ట్రం / ప్రాంతం ఎంచుకోండి (Select state)", "Select state"));
      if (!f.district) e.push(T("జిల్లా / దేశం ఎంచుకోండి (Select district / location)", "Select district / location"));
      if (!/^\d{10}$/.test(String(f.phone))) e.push(T("10 అంకెల మొబైల్ నంబర్ ఇవ్వండి (Enter 10-digit mobile number)", "Enter a 10-digit mobile number"));
      if (String(f.password || "").length < 6) e.push(T("🔑 Password కనీసం 6 అక్షరాలు ఉండాలి (Password min 6 chars)", "Password min 6 chars"));
    }
    if (s === 5) {
      const _ab = String(f.about_myself || "").trim();
      if (_ab.length < 30) e.push(T("మీ గురించి కనీసం 30 అక్షరాలు రాయండి (About yourself — min 30 chars)", "About yourself — min 30 chars"));
      else if (/[6-9]\d{9}|@\S+\.\S+/.test(_ab)) e.push(T("🔒 గోప్యత కొరకు About లో ఫోన్ నంబర్ / ఈమెయిల్ రాయకండి", "🔒 Don't enter phone number or email in About section"));
      if (!f.consent) e.push(T("నిబంధనలను అంగీకరించండి (Please accept Terms & Privacy)", "Please accept Terms & Privacy"));
    }
    return e;
  };

  const next = () => {
    const e = validate(step);
    if (e.length) {
      setErrs(e);
      setShake(true);
      setTimeout(() => setShake(false), 400);
      scrollTop();
      return;
    }
    setErrs([]);
    setStep((s) => Math.min(5, s + 1));
    scrollTop();
  };

  const back = () => {
    setErrs([]);
    setStep((s) => Math.max(1, s - 1));
    scrollTop();
  };

  const strength = useMemo(() => {
    const keys = [
      "full_name",
      "gender",
      "dob",
      "height",
      "marital_status",
      "caste",
      "sub_caste",
      "gothram",
      "star",
      "rasi",
      "education",
      "education_detail",
      "job",
      "company",
      "salary",
      "work_type",
      "father_name",
      "native_place",
      "state",
      "district",
      "phone",
      "about_myself",
    ];
    const filled = keys.filter((k) => String(f[k] || "").trim()).length + (photoUrl ? 2 : 0);
    return Math.min(100, Math.round((filled / (keys.length + 2)) * 100));
  }, [f, photoUrl]);

  const pickPhoto = async (file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return setErrs([T("ఫోటో ఫైల్ మాత్రమే (JPG/PNG/WebP)", "Photo files only (JPG/PNG/WebP)")]);
    if (file.size > 10 * 1024 * 1024) return setErrs([T("ఫోటో చాలా పెద్దది (10MB+) — చిన్న ఫోటో అప్‌లోడ్ చేయండి", "Photo too large (10MB+) — upload a smaller photo")]);
    setBusy(true);
    try {
      const small = await compressImage(file, 1200, 0.85);
      setPhotoFile(small);
      setPhotoPreview(URL.createObjectURL(small));
      setPhotoInfo(`${(small.size / 1024).toFixed(0)} KB • అప్‌లోడ్ అవుతోంది…`);

      const fd = new FormData();
      fd.append("file", small);
      const r = await fetch("/api/photo/upload", { method: "POST", body: fd });
      const d = await r.json();
      if (r.ok) {
        setPhotoUrl(d.url);
        setPhotoInfo(`${d.kb || Math.round(small.size / 1024)} KB ✅ ఫోటో విజయవంతంగా అప్‌లోడ్ అయ్యింది`);
      } else {
        const det: any = d?.detail;
        setPhotoInfo("");
        setErrs([
          det?.message_telugu || det?.te || det?.en || (typeof d?.detail === "string" ? d.detail : "") || T("ఫోటో అప్‌లోడ్ అవ్వలేదు — స్పష్టమైన ఫోటోతో మళ్లీ ప్రయత్నించండి", "Photo upload failed — retry with clear photo"),
        ]);
      }
    } catch {
      setErrs([T("నెట్‌వర్క్ సమస్య — ఫోటో మళ్లీ అప్‌లోడ్ చేయండి", "Network issue — please retry photo upload")]);
    }
    setBusy(false);
  };

  const startVoice = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return setErrs([T("ఈ బ్రౌజర్‌లో వాయిస్ ఇన్‌పుట్ లేదు — టైప్ చేయండి", "Voice input not supported in this browser — please type")]);
    try {
      const rec = new SR();
      rec.lang = "te-IN";
      rec.continuous = false;
      rec.interimResults = false;
      rec.onresult = (ev: any) => {
        const text = ev.results?.[0]?.[0]?.transcript || "";
        set("about_myself", (f.about_myself ? f.about_myself + " " : "") + text);
      };
      rec.start();
      voiceRef.current = rec;
    } catch {
      setErrs([T("వాయిస్ ఇన్‌పుట్ ప్రారంభం కాలేదు", "Voice input did not start")]);
    }
  };

  const autoGenerateBio = (tone: "traditional" | "professional" | "nri") => {
    const name = f.full_name?.trim() || (f.gender === "Bride" ? "వధువు" : "వరుడు");
    const job = f.job || "సాఫ్ట్‌వేర్ ప్రొఫెషనల్";
    const edu = f.education || "గ్రాడ్యుయేషన్";
    const dist = f.district || "హైదరాబాద్";
    const sal = f.salary || "మంచి ప్యాకేజీ";
    const fam = f.family_type === "Joint" ? "ఉమ్మడి" : "చిన్న";
    const caste = f.caste ? `${f.caste} కులం` : "తెలుగు కుటుంబం";

    if (tone === "traditional") {
      set("about_myself", `నమస్కారం, నా పేరు ${name}. నేను ${edu} పూర్తి చేసి ప్రస్తుతం ${dist} లో ${job} గా స్థిరపడ్డాను. మాది ${fam} సాంప్రదాయ ${caste}. ఉన్నత సంస్కారం, సంప్రదాయాలు మరియు జీవితంలో పరస్పర గౌరవంతో నడిచే చక్కని జీవన సహచరి/సహచరుడు కొరకు చూస్తున్నాము.`);
    } else if (tone === "professional") {
      set("about_myself", `నమస్కారం, నా పేరు ${name}. నేను ${edu} విద్యార్హతతో ${dist} లో ${job} గా పనిచేస్తున్నాను (${sal}). కెరీర్‌లో మంచి స్థిరత్వం కలిగి, ఉన్నత ఆలోచనలు, స్నేహపూర్వక దృక్పథం మరియు జీవితంలో పరస్పరం ప్రోత్సహించుకునే మంచి భాగస్వామి కోసం చూస్తున్నాము.`);
    } else if (tone === "nri") {
      set("about_myself", `నమస్కారం, నా పేరు ${name}. నేను ${edu} పూర్తి చేసి ప్రస్తుతం విదేశాల్లో ${job} గా స్థిరపడ్డాను. ఉన్నత విద్యావంతులైన, సాంప్రదాయ విలువలతో కూడిన ఆధునిక ఆలోచనలు గల తెలుగు జీవన భాగస్వామి కోసం చూస్తున్నాము.`);
    }
  };

  const fillSampleDemo = (gender: "Bride" | "Groom") => {
    if (gender === "Bride") {
      setF({
        ...DEFAULT_FORM,
        gender: "Bride",
        full_name: "లక్ష్మి ప్రసన్న (Lakshmi Prasanna)",
        profile_for: "Parents",
        dob: "1998-05-14",
        age: "28",
        height: "5'4\"",
        marital_status: "Pelli Kaledu",
        religion: "Hindu",
        mother_tongue: "Telugu",
        caste: "Reddy",
        sub_caste: "Motati",
        gothram: "Janakula",
        star: "Swathi",
        rasi: "Tula (Libra)",
        work_type: "Software / IT / Tech",
        education: "B.Tech / B.E.",
        education_detail: "Computer Science (CSE)",
        job: "Software Engineer",
        company: "Infosys",
        salary: "₹12 - 15 Lakhs / year",
        state: "TS",
        district: "Hyderabad",
        native_place: "Warangal",
        family_type: "Nuclear",
        family_status: "Middle Class",
        father_name: "శ్రీనివాస రెడ్డి",
        father_occupation: "Govt Employee (Retd)",
        mother_name: "సుజాత",
        mother_occupation: "Homemaker",
        brothers: "1",
        brothers_married: "0",
        sisters: "0",
        sisters_married: "0",
        phone: "9876543210",
        password: "Pass" + Math.floor(1000 + Math.random() * 9000),
        about_myself: "సాఫ్ట్‌వేర్ ఇంజనీర్‌గా పనిచేస్తున్నాను. కుటుంబ విలువల పట్ల గౌరవం, స్నేహపూర్వక దృక్పథం కలదు. మంచి విద్యావంతుడు, స్థిరపడిన వరుడి కోసం చూస్తున్నాము.",
        consent: true,
      });
    } else {
      setF({
        ...DEFAULT_FORM,
        gender: "Groom",
        full_name: "రాజేష్ కుమార్ (Rajesh Kumar)",
        profile_for: "Self",
        dob: "1996-08-20",
        age: "30",
        height: "5'9\"",
        marital_status: "Pelli Kaledu",
        religion: "Hindu",
        mother_tongue: "Telugu",
        caste: "Kamma",
        sub_caste: "Chowdary",
        gothram: "Vallutla",
        star: "Uttara Bhadrapada",
        rasi: "Meena (Pisces)",
        work_type: "Software / IT / Tech",
        education: "M.Tech / M.E.",
        education_detail: "Data Science & AI",
        job: "Senior Tech Lead",
        company: "Microsoft",
        salary: "₹25 - 30 Lakhs / year",
        state: "AP",
        district: "Vijayawada (NTR)",
        native_place: "Guntur",
        family_type: "Nuclear",
        family_status: "Upper Middle",
        father_name: "వెంకటేశ్వర రావు",
        father_occupation: "Business",
        mother_name: "రాధా కుమారి",
        mother_occupation: "Homemaker",
        brothers: "0",
        brothers_married: "0",
        sisters: "1",
        sisters_married: "1",
        phone: "9123456789",
        password: "Pass" + Math.floor(1000 + Math.random() * 9000),
        about_myself: "హైదరాబాద్‌లో సీనియర్ టెక్ లీడ్‌గా పనిచేస్తున్నాను. సాంప్రదాయ కుటుంబ విలువలతో కూడిన ఆధునిక ఆలోచనలు గల వధువు కోసం చూస్తున్నాము.",
        consent: true,
      });
    }
    setErrs([]);
  };

  const submit = async () => {
    const e = validate(5);
    if (e.length) {
      setErrs(e);
      setShake(true);
      setTimeout(() => setShake(false), 400);
      scrollTop();
      return;
    }
    setBusy(true);
    setErrs([]);
    try {
      const fd = new FormData();
      const strings = [
        "gender",
        "full_name",
        "profile_for",
        "dob",
        "birth_time",
        "height",
        "marital_status",
        "children",
        "religion",
        "mother_tongue",
        "caste",
        "sub_caste",
        "gothram",
        "star",
        "rasi",
        "moola_nakshatram",
        "dosham",
        "work_type",
        "education",
        "education_detail",
        "job",
        "company",
        "salary",
        "experience",
        "work_location",
        "father_name",
        "father_occupation",
        "mother_name",
        "mother_occupation",
        "brothers",
        "brothers_married",
        "sisters",
        "sisters_married",
        "family_type",
        "family_status",
        "family_values",
        "native_place",
        "state",
        "district",
        "nri_country",
        "mandal",
        "current_city",
        "country",
        "pincode",
        "phone",
        "email",
        "password",
        "about_myself",
        "expectations",
        "exp_age_min",
        "exp_age_max",
        "exp_job",
        "exp_location",
        "exp_caste",
        "physical_status",
        "body_type",
        "complexion",
        "blood_group",
        "referral_code",
      ];
      strings.forEach((k) => fd.append(k, String(f[k] ?? "")));
      fd.append("age", String(f.age || ageFromDob(f.dob) || ""));
      fd.append("photo_private", String(!!f.photo_private));
      fd.append("dob_correct", "true");
      fd.append("phone_verified", "true");
      if (photoUrl) fd.append("photo_url", photoUrl);
      if (refLocked) fd.append("referral_code", refLocked);

      const r = await fetch("/api/register", { method: "POST", body: fd });
      const d = await r.json();
      if (!r.ok) {
        const det = d?.detail;
        const msg = det?.message_telugu || det?.te || (typeof det === "string" ? det : d?.message) || "నమోదులో సమస్య ఏర్పడింది — దయచేసి మళ్లీ ప్రయత్నించండి";
        throw new Error(msg);
      }
      setResult(d);
      localStorage.removeItem(DRAFT_KEY);
      try {
        if (d?.auth_token) {
          localStorage.setItem("tsap_token", String(d.auth_token));
          localStorage.setItem("tsap_id", String(d.tsap_id || ""));
        }
      } catch {
        /* private mode */
      }
      scrollTop();
    } catch (e: any) {
      setErrs([e?.message || T("నమోదులో సమస్య ఏర్పడింది — దయచేసి మళ్లీ ప్రయత్నించండి", "Problem during registration — please retry")]);
    }
    setBusy(false);
  };

  /* ================= SUCCESS SCREEN ================= */
  if (result) {
    const tsap = result.tsap_id || result.user_id || "";
    const cardUrl = tsap ? result.card_url || `/cards/${tsap}.png` : "";
    return (
      <main className="min-h-screen py-8 px-4 bg-slate-50">
        <div className="max-w-2xl mx-auto bg-white rounded-3xl border border-gold/30 shadow-xl overflow-hidden animate-fade">
          {/* Header Banner */}
          <div className="maroon-gradient p-6 text-white text-center space-y-2">
            <div className="text-4xl">🎉 💍 🌸</div>
            <h1 className="text-xl sm:text-2xl font-black">{T("నమోదు విజయవంతంగా పూర్తయింది!", "Registration Successful!")}</h1>
            <p className="text-xs sm:text-sm text-gold-light telugu">
              {T(`మీ ప్రొఫైల్ ఐడీ: ${tsap} • 100% ఉచితంగా లైవ్ అయ్యింది`, `Your Profile ID: ${tsap} • Active & Live`)}
            </p>
          </div>

          <div className="p-5 sm:p-6 space-y-4">
            <div className="bg-amber-50/70 border border-gold/40 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 font-bold block">మీ TSAP మ్యాట్రిమోనీ ఐడీ</span>
                <span className="text-xl font-black text-maroon font-mono">{tsap}</span>
              </div>
              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full border border-emerald-300">
                ✅ ధృవీకరించబడింది
              </span>
            </div>

            {cardUrl && (
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-700 block">🖼️ వాట్సాప్ స్టేటస్ బయోడేటా కార్డ్:</span>
                <img src={cardUrl} alt="Matrimony card" className="w-full rounded-2xl border border-gold/30 shadow-sm" />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(
                  `🙏 *మన వివాహ (Mana Vivaha) తెలుగు మ్యాట్రిమోనీ ప్రొఫైల్*\n🆔 *${tsap}* (${f.gender === "Groom" ? "🤵 వరుడు" : "👰 వధువు"})\n👤 *${f.full_name}*\n💍 కులం: *${f.caste}* | గోత్రం: *${f.gothram || "—"}*\n🎂 వయస్సు: *${f.age} సం.* | ఎత్తు: *${f.height}*\n⭐ నక్షత్రం: *${f.star || "—"}* | రాశి: *${f.rasi || "—"}*\n🎓 చదువు: *${f.education}* | 💼 ఉద్యోగం: *${f.job}*\n💰 వార్షిక ఆదాయం: *${f.salary}*\n📍 నివాసం: *${f.district}, ${f.state}*\n━━━━━━━━━━━━━━━━━━━━\n🔍 పూర్తి వివరాలు చూడండి:\n👉 https://manavivaha.in/search/${tsap}`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="py-3 px-4 rounded-xl bg-[#25D366] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md hover:brightness-105 transition"
              >
                <span>💬</span>
                <span>{T("WhatsApp లో పంపండి", "Share on WhatsApp")}</span>
              </a>

              <Link
                href="/matches"
                className="py-3 px-4 rounded-xl maroon-gradient text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md hover:brightness-105 transition"
              >
                <span>🔍</span>
                <span>{T("సరిపోలే సంబంధాలు చూడండి", "View Matching Profiles")}</span>
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  /* ================= WIZARD RENDER ================= */
  const stepMeta = STEPS[step - 1];

  return (
    <main className="min-h-screen pb-28 sm:pb-36 bg-[#FAF7F2]" ref={topRef}>
      {/* ---------- Top Header Bar ---------- */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gold/25 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 py-2.5 sm:py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/" className="text-xs sm:text-sm font-bold text-maroon hover:underline">
              ← హోమ్
            </Link>
            <span className="text-slate-300">|</span>
            <span className="text-xs sm:text-sm font-black text-navy">{SITE_CONFIG.brandName}</span>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="https://wa.me/916304996088?text=Hello%20Mana%20Vivaha%20Registration%20Help"
              target="_blank"
              rel="noreferrer"
              className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold flex items-center gap-1 hover:bg-emerald-100 transition"
            >
              <span>📞</span>
              <span className="hidden sm:inline">హెల్ప్‌లైన్:</span> 6304996088
            </a>
          </div>
        </div>

        {/* Stepper Progress Bar */}
        <div className="max-w-6xl mx-auto px-4 pb-2">
          <div className="flex items-center justify-between gap-1 sm:gap-2">
            {STEPS.map((s) => {
              const active = s.n === step;
              const done = s.n < step;
              return (
                <button
                  key={s.n}
                  type="button"
                  onClick={() => {
                    if (s.n < step) setStep(s.n);
                  }}
                  className={`flex-1 flex flex-col items-center gap-1 text-center py-1 rounded-xl transition ${
                    active ? "bg-maroon-soft/60" : done ? "opacity-90 cursor-pointer" : "opacity-40"
                  }`}
                >
                  <div className="flex items-center gap-1.5 w-full">
                    <span
                      className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full text-xs font-black flex items-center justify-center shrink-0 transition ${
                        done
                          ? "bg-emerald-600 text-white"
                          : active
                          ? "maroon-gradient text-white ring-2 ring-gold shadow-sm"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {done ? "✓" : s.n}
                    </span>
                    <div className="hidden sm:block text-left min-w-0 flex-1">
                      <div className={`text-xs font-bold truncate ${active ? "text-maroon" : "text-slate-700"}`}>
                        {te ? s.labelTe : s.label}
                      </div>
                    </div>
                  </div>
                  <div className={`w-full h-1 rounded-full ${done ? "bg-emerald-600" : active ? "bg-maroon" : "bg-slate-200"}`} />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ---------- Main Form & Desktop Live Preview Layout ---------- */}
      <div className="max-w-6xl mx-auto px-4 py-4 sm:py-6">
        {/* Draft Restore Alert */}
        {draftFound && (
          <div className="mb-4 bg-amber-50 border border-gold/40 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs">
            <div className="text-xs text-amber-950 font-bold flex items-center gap-2">
              <span className="text-lg">💾</span>
              <span>మీరు మునుపు పూరించిన వివరాలు అందుబాటులో ఉన్నాయి ({savedAt}).</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={resumeDraft}
                className="px-3 py-1.5 rounded-xl maroon-gradient text-white text-xs font-bold hover:brightness-105 transition"
              >
                కొనసాగించండి (Resume)
              </button>
              <button
                type="button"
                onClick={clearDraft}
                className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition"
              >
                కొత్తది (New)
              </button>
            </div>
          </div>
        )}

        {/* Validation Errors Box */}
        {errs.length > 0 && (
          <div className="mb-4 bg-rose-50 border border-rose-300 rounded-2xl p-4 space-y-1 shadow-xs animate-shake">
            <div className="text-xs font-black text-rose-800 flex items-center gap-1.5">
              <span>⚠️</span>
              <span>దయచేసి క్రింది వివరాలు పూర్తి చేయండి:</span>
            </div>
            {errs.map((e, idx) => (
              <div key={idx} className="text-xs text-rose-900 telugu font-medium pl-5">
                • {e}
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ================= LEFT COLUMN: STEP FORM (8 cols) ================= */}
          <div className="lg:col-span-8 space-y-5">
            <div className="bg-white rounded-3xl border border-gold/30 shadow-md p-4 sm:p-6 space-y-5">
              {/* Step Header */}
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                    <span>{stepMeta.icon}</span>
                    <span>
                      దశ {step} / 5: {te ? stepMeta.labelTe : stepMeta.label}
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500 telugu mt-0.5">{te ? stepMeta.hint : stepMeta.hintEn}</p>
                </div>
                <span className="text-xs font-bold text-maroon bg-amber-50 px-2.5 py-1 rounded-full border border-gold/30">
                  {strength}% పూర్తయింది
                </span>
              </div>

              {/* ---------------- STEP 1: BASIC DETAILS ---------------- */}
              {step === 1 && (
                <div className="space-y-4">
                  {/* Quick Sample Demo Fill */}
                  <div className="bg-gradient-to-r from-amber-50 to-rose-50 border border-gold/30 rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="text-xs font-bold text-maroon flex items-center gap-1.5">
                      <span>⚡</span>
                      <span>డెమో పూరింపు (1-Click Sample Profile):</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fillSampleDemo("Bride")}
                        className="px-3 py-1 rounded-xl bg-white border border-rose-200 text-rose-800 font-bold text-xs hover:bg-rose-50 transition shadow-xs"
                      >
                        👰 వధువు డెమో
                      </button>
                      <button
                        type="button"
                        onClick={() => fillSampleDemo("Groom")}
                        className="px-3 py-1 rounded-xl bg-white border border-indigo-200 text-indigo-800 font-bold text-xs hover:bg-indigo-50 transition shadow-xs"
                      >
                        🤵 వరుడు డెమో
                      </button>
                    </div>
                  </div>

                  {/* Gender Selection */}
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-bold text-slate-800">
                      ఎవరి కోసం ప్రొఫైల్ నమోదు చేస్తున్నారు? <span className="text-rose-600 font-black">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { v: "Bride", l: "👰 వధువు (Bride)", s: "Bride Profile" },
                        { v: "Groom", l: "🤵 వరుడు (Groom)", s: "Groom Profile" },
                      ].map((g) => (
                        <button
                          key={g.v}
                          type="button"
                          onClick={() => set("gender", g.v)}
                          className={`rounded-2xl border-2 p-3.5 text-center transition-all ${
                            f.gender === g.v
                              ? "border-maroon bg-maroon-soft shadow-sm ring-2 ring-maroon/20"
                              : "border-slate-200 bg-white hover:border-maroon/40"
                          }`}
                        >
                          <div className="text-3xl">{g.v === "Bride" ? "👰" : "🤵"}</div>
                          <div className="font-black text-sm text-maroon mt-1 telugu">{g.l}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <TextField
                    label="పూర్తి పేరు (Full Name)"
                    value={f.full_name}
                    onChange={(v) => set("full_name", v)}
                    required
                    placeholder="ఉదా: Sai Lakshmi / Rajesh Reddy"
                    hint="బయోడేటా కార్డ్ మరియు సెర్చ్‌లో ఇదే పేరు కనిపిస్తుంది"
                  />

                  {/* Date of Birth & Age */}
                  <div className="space-y-1.5">
                    <div className="text-xs font-bold text-slate-700">⚡ పుట్టిన సంవత్సరం త్వరిత ఎంపిక:</div>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { y: 2003, a: 23 },
                        { y: 2002, a: 24 },
                        { y: 2001, a: 25 },
                        { y: 2000, a: 26 },
                        { y: 1999, a: 27 },
                        { y: 1998, a: 28 },
                        { y: 1997, a: 29 },
                        { y: 1996, a: 30 },
                        { y: 1995, a: 31 },
                        { y: 1994, a: 32 },
                      ].map((item) => (
                        <button
                          key={item.y}
                          type="button"
                          onClick={() => {
                            set("dob", `${item.y}-06-15`);
                            set("age", String(item.a));
                          }}
                          className={`px-2.5 py-1 rounded-full text-xs font-bold transition ${
                            f.dob?.startsWith(String(item.y))
                              ? "maroon-gradient text-white border-transparent shadow-xs"
                              : "bg-white border border-gold/40 text-maroon hover:bg-gold/20"
                          }`}
                        >
                          {item.y} <span className="opacity-80 font-normal">({item.a}y)</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <TextField
                      label="పుట్టిన తేదీ (Date of Birth)"
                      value={f.dob}
                      onChange={(v) => set("dob", v)}
                      required
                      type="date"
                      max={maxDobFor18()}
                      hint="కనీసం 18 సంవత్సరాలు ఉండాలి"
                    />
                    <div>
                      <label className="text-[13px] font-bold text-slate-800">వయస్సు (Age - Auto)</label>
                      <div className="min-h-[46px] mt-1.5 flex items-center justify-between rounded-xl border border-slate-200 bg-amber-50/50 px-3.5 py-2.5">
                        <span className="font-bold text-maroon text-sm">{f.age ? `${f.age} సం॥ (Years)` : "—"}</span>
                        <span className="text-[10px] text-gray-500">DOB నుండి లెక్కించబడింది</span>
                      </div>
                    </div>
                  </div>

                  {/* Height */}
                  <div className="space-y-1.5">
                    <div className="text-xs font-bold text-slate-700">⚡ ప్రముఖ ఎత్తులు (Quick Height):</div>
                    <div className="flex flex-wrap gap-1.5">
                      {["5'2\"", "5'3\"", "5'4\"", "5'5\"", "5'6\"", "5'7\"", "5'8\"", "5'9\"", "5'10\"", "6'0\""].map((h) => (
                        <button
                          key={h}
                          type="button"
                          onClick={() => set("height", h)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                            f.height === h
                              ? "maroon-gradient text-white border-transparent shadow-xs"
                              : "bg-amber-50/50 border border-gold/40 text-maroon hover:bg-gold/20"
                          }`}
                        >
                          {heightLabel(h)}
                        </button>
                      ))}
                    </div>
                    <SelectField label="ఎత్తు (Height)" required value={f.height} onChange={(v) => set("height", v)} placeholder="మీ ఎత్తు ఎంచుకోండి">
                      {HEIGHTS.map((h) => (
                        <option key={h} value={h}>
                          {heightLabel(h)}
                        </option>
                      ))}
                    </SelectField>
                  </div>

                  {/* Marital Status */}
                  <PillGroup
                    label="వైవాహిక స్థితి (Marital Status)"
                    required
                    value={f.marital_status}
                    onChange={(v) => {
                      set("marital_status", v);
                      if (v === "Pelli Kaledu") set("children", "");
                    }}
                    options={[
                      { v: "Pelli Kaledu", en: "Never Married", te: "పెళ్లి కాలేదు (మొదటి వివాహం)" },
                      {
                        v: f.gender === "Groom" ? "Widower" : "Widow",
                        en: f.gender === "Groom" ? "Widower" : "Widow",
                        te: f.gender === "Groom" ? "భార్య చనిపోయారు" : "భర్త చనిపోయారు",
                      },
                      { v: "Divorced", en: "Divorced", te: "విడాకులు అయ్యాయి" },
                      { v: "Awaiting Divorce", en: "Awaiting Divorce", te: "విడాకులు రావాల్సి ఉంది" },
                    ]}
                  />

                  {f.marital_status && f.marital_status !== "Pelli Kaledu" && (
                    <PillGroup
                      label="పిల్లల సంఖ్య (Number of Children)"
                      required
                      value={f.children}
                      onChange={(v) => set("children", v)}
                      options={CHILDREN_OPTIONS.map((c) => ({
                        v: c,
                        en: c === "None" ? "No Children" : c,
                        te: c === "None" ? "పిల్లలు లేరు" : c === "4+" ? "4+ మంది" : `${c} మంది`,
                      }))}
                    />
                  )}
                </div>
              )}

              {/* ---------------- STEP 2: CASTE & ASTROLOGY ---------------- */}
              {step === 2 && (
                <div className="space-y-4">
                  {/* Top Popular Castes Quick Chips */}
                  <div className="bg-amber-50/70 border border-gold/40 rounded-2xl p-3.5 space-y-2">
                    <div className="text-xs font-black text-maroon">⚡ ప్రముఖ తెలుగు కులాలు (1-క్లిక్ సెలెక్షన్):</div>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        "Reddy",
                        "Kamma",
                        "Kapu",
                        "Brahmin",
                        "Arya Vysya",
                        "Padmashali",
                        "Velama",
                        "Yadav",
                        "Goud",
                        "Munnuru Kapu",
                        "Mudhiraj",
                        "Mala",
                        "Madiga",
                        "Balija",
                        "Telaga",
                        "Viswabrahmin",
                      ].map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => set("caste", c)}
                          className={`px-2.5 py-1 rounded-xl text-xs font-bold transition ${
                            f.caste === c
                              ? "maroon-gradient text-white border-transparent shadow-xs"
                              : "bg-white border border-gold/40 text-maroon hover:bg-gold/20"
                          }`}
                        >
                          {CASTE_TELUGU[c] || c} <span className="opacity-70 font-normal">({c})</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <SearchSelect
                    label="కులం (Caste)"
                    required
                    options={casteOpts}
                    value={f.caste}
                    onChange={(v) => set("caste", v)}
                    teMap={CASTE_TELUGU}
                    placeholder="మీ కులం ఎంచుకోండి లేదా టైప్ చేయండి"
                  />

                  {f.caste && CASTE_SUBCASTES[f.caste] && (
                    <ChipGroup
                      label="ఉపకులం / శాఖ (Sub-Caste)"
                      options={CASTE_SUBCASTES[f.caste].map((sc) => ({ v: sc }))}
                      value={f.sub_caste}
                      onChange={(v) => set("sub_caste", v)}
                    />
                  )}

                  <TextField label="గోత్రం (Gothram)" value={f.gothram} onChange={(v) => set("gothram", v)} placeholder="ఉదా: Janakula / Kashyapa" optional />

                  {/* 27 Nakshatras with Auto-Rasi Setting */}
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-bold text-slate-800">నక్షత్రం (Vedic Nakshatram)</label>
                    <SelectField label="" value={f.star} onChange={(v) => set("star", v)} placeholder="నక్షత్రం ఎంచుకోండి (Auto sets Raasi)">
                      {NAKSHATRAS.map((st) => (
                        <option key={st.name} value={st.name}>
                          ⭐ {st.te} ({st.name})
                        </option>
                      ))}
                    </SelectField>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <SelectField label="రాశి (Raasi / Moon Sign)" value={f.rasi} onChange={(v) => set("rasi", v)} placeholder="రాశి ఎంచుకోండి">
                      {RASIS.map((r) => (
                        <option key={r.name} value={r.name}>
                          {r.te} ({r.name})
                        </option>
                      ))}
                    </SelectField>

                    <SelectField label="కుజ దోషం / మాంగ్లిక్ (Dosham)" value={f.dosham} onChange={(v) => set("dosham", v)}>
                      <option value="No">దోషం లేదు (No Dosham)</option>
                      <option value="Yes">కుజ దోషం కలదు (Kuja Dosham / Manglik)</option>
                      <option value="Partial">పాక్షిక దోషం (Partial Dosham)</option>
                      <option value="Dont Know">తెలియదు (Don't Know)</option>
                    </SelectField>
                  </div>
                </div>
              )}

              {/* ---------------- STEP 3: CAREER & EDUCATION ---------------- */}
              {step === 3 && (
                <div className="space-y-4">
                  {/* Profession Sector */}
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-bold text-slate-800">
                      వృత్తి / ఉద్యోగ రంగం (Work Sector) <span className="text-rose-600 font-black">*</span>
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {WORK_TYPES_DETAILED.map((wt) => {
                        const on = f.work_type === wt.name;
                        return (
                          <button
                            key={wt.name}
                            type="button"
                            onClick={() => set("work_type", wt.name)}
                            className={`p-2.5 rounded-2xl border text-left transition ${
                              on ? "maroon-gradient text-white border-transparent shadow-sm font-bold" : "bg-white border-slate-200 text-slate-800 hover:border-maroon/40"
                            }`}
                          >
                            <div className="text-lg">{wt.icon}</div>
                            <div className="text-xs font-bold truncate mt-0.5">{wt.name}</div>
                            <div className={`text-[10px] truncate ${on ? "text-white/90" : "text-slate-500"} telugu`}>{wt.te}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <SelectField label="విద్యార్హత (Highest Education)" required value={f.education} onChange={(v) => set("education", v)}>
                    {EDUCATIONS.map((e) => (
                      <option key={e} value={e}>
                        {EDUCATION_TELUGU[e] ? `${EDUCATION_TELUGU[e]} (${e})` : e}
                      </option>
                    ))}
                  </SelectField>

                  <TextField
                    label="ఉద్యోగం / హోదా (Job Title / Designation)"
                    required
                    value={f.job}
                    onChange={(v) => set("job", v)}
                    placeholder="ఉదా: Software Engineer / Bank Manager / Doctor"
                  />

                  <TextField label="కంపెనీ / సంస్థ పేరు (Company Name)" value={f.company} onChange={(v) => set("company", v)} placeholder="ఉదా: TCS, Infosys, Govt" optional />

                  {/* Salary Bracket */}
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-bold text-slate-800">
                      వార్షిక వేతనం (Annual Salary Range) <span className="text-rose-600 font-black">*</span>
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {SALARIES_DETAILED.map((s) => (
                        <button
                          key={s.range}
                          type="button"
                          onClick={() => set("salary", s.range)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                            f.salary === s.range
                              ? "maroon-gradient text-white border-transparent shadow-xs"
                              : "bg-white border border-slate-200 text-slate-800 hover:border-maroon/40"
                          }`}
                        >
                          {s.range} <span className="opacity-70 font-normal">({s.te})</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ---------------- STEP 4: LOCATION & FAMILY ---------------- */}
              {step === 4 && (
                <div className="space-y-4">
                  {/* State Selection */}
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-bold text-slate-800">
                      రాష్ట్రం / ప్రాంతం (State / Region) <span className="text-rose-600 font-black">*</span>
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { v: "TS", l: "🏛️ తెలంగాణ (TS - 33)" },
                        { v: "AP", l: "🌊 ఆంధ్రప్రదేశ్ (AP - 26)" },
                        { v: "Other India", l: "🇮🇳 ఇతర రాష్ట్రాలు" },
                        { v: "NRI", l: "🌍 NRI / విదేశాలు" },
                      ].map((st) => (
                        <button
                          key={st.v}
                          type="button"
                          onClick={() => {
                            set("state", st.v);
                            set("district", "");
                          }}
                          className={`p-2.5 rounded-2xl border text-center transition ${
                            f.state === st.v ? "maroon-gradient text-white border-transparent shadow-sm font-bold" : "bg-white border-slate-200 text-slate-800 hover:border-maroon/40"
                          }`}
                        >
                          <div className="text-xs font-bold telugu">{st.l}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* District Selection */}
                  <SelectField label="జిల్లా / ప్రదేశం (District / Location)" required value={f.district} onChange={(v) => set("district", v)}>
                    {(DISTRICTS_BY_STATE[f.state] || []).map((d) => (
                      <option key={d} value={d}>
                        {DISTRICT_TELUGU[d] ? `${DISTRICT_TELUGU[d]} (${d})` : d}
                      </option>
                    ))}
                  </SelectField>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <TextField label="సొంత ఊరు (Native Place)" value={f.native_place} onChange={(v) => set("native_place", v)} placeholder="ఉదా: వరంగల్, గుంటూరు" optional />
                    <TextField label="ప్రస్తుత నివాస నగరం (Current City)" value={f.current_city} onChange={(v) => set("current_city", v)} placeholder="ఉదా: హైదరాబాద్, బెంగళూరు" optional />
                  </div>

                  {/* Family Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <TextField label="తండ్రి పేరు (Father's Name)" value={f.father_name} onChange={(v) => set("father_name", v)} placeholder="శ్రీ..." optional />
                    <TextField label="తండ్రి వృత్తి (Father's Occupation)" value={f.father_occupation} onChange={(v) => set("father_occupation", v)} placeholder="వ్యాపారం / ఉద్యోగం" optional />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <TextField label="తల్లి పేరు (Mother's Name)" value={f.mother_name} onChange={(v) => set("mother_name", v)} placeholder="శ్రీమతి..." optional />
                    <TextField label="తల్లి వృత్తి (Mother's Occupation)" value={f.mother_occupation} onChange={(v) => set("mother_occupation", v)} placeholder="గృహిణి / ఉద్యోగం" optional />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Stepper label="సోదరులు (Brothers)" value={f.brothers} onChange={(v) => set("brothers", v)} />
                    <Stepper label="సోదరీమణులు (Sisters)" value={f.sisters} onChange={(v) => set("sisters", v)} />
                  </div>

                  {/* Contact Number & Password */}
                  <div className="border-t border-slate-100 pt-3 space-y-3">
                    <TextField
                      label="మొబైల్ నంబర్ (10 Digit Phone Number)"
                      required
                      type="tel"
                      inputMode="numeric"
                      value={f.phone}
                      onChange={(v) => set("phone", v.replace(/\D/g, "").slice(0, 10))}
                      placeholder="10 అంకెల మొబైల్ నంబర్ ఇవ్వండి"
                      hint="🔒 మీ నంబర్ సురక్షితంగా ఉంటుంది (సమ్మతి లేనిదే ఇతరులకు కనిపించదు)"
                    />

                    <div>
                      <label className="text-[13px] font-bold text-slate-800 flex items-center justify-between">
                        <span>
                          పాస్‌వర్డ్ సృష్టించండి (Create Password) <span className="text-rose-600 font-black">*</span>
                        </span>
                        <button type="button" onClick={() => setShowPw(!showPw)} className="text-xs text-maroon font-bold">
                          {showPw ? "దాచు (Hide)" : "చూపించు (Show)"}
                        </button>
                      </label>
                      <input
                        type={showPw ? "text" : "password"}
                        value={f.password}
                        onChange={(e) => set("password", e.target.value)}
                        placeholder="కనీసం 6 అక్షరాలు/అంకెలు (Min 6 chars)"
                        className="w-full min-h-[46px] rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 transition focus:outline-none focus:ring-2 focus:ring-maroon/20 focus:border-maroon mt-1.5"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ---------------- STEP 5: PHOTO & SUBMIT ---------------- */}
              {step === 5 && (
                <div className="space-y-5">
                  {/* Strict Photo Upload Card */}
                  <div className="bg-amber-50/60 border-2 border-dashed border-gold/60 rounded-3xl p-4 sm:p-6 text-center space-y-3">
                    <div className="text-3xl">📸</div>
                    <div>
                      <h3 className="text-sm sm:text-base font-black text-slate-900">స్పష్టమైన ఫోటోను అప్‌లోడ్ చేయండి</h3>
                      <p className="text-xs text-slate-600 telugu mt-0.5">
                        ఫోటో ఉన్న ప్రొఫైల్స్‌కు 10 రెట్లు ఎక్కువ స్పందనలు లభిస్తాయి (JPG/PNG/WebP).
                      </p>
                    </div>

                    {photoPreview ? (
                      <div className="inline-block relative">
                        <img src={photoPreview} alt="Preview" className="w-28 h-36 sm:w-32 sm:h-40 object-cover rounded-2xl border-2 border-gold shadow-md mx-auto" />
                        <button
                          type="button"
                          onClick={() => {
                            setPhotoPreview("");
                            setPhotoUrl("");
                            setPhotoFile(null);
                          }}
                          className="absolute -top-2 -right-2 bg-rose-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs shadow hover:bg-rose-700"
                          title="Delete Photo"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <label className="inline-block px-5 py-2.5 rounded-2xl maroon-gradient text-white text-xs sm:text-sm font-bold cursor-pointer shadow-md hover:brightness-105 transition">
                          <span>📁 ఫోటోను ఎంచుకోండి (Choose Photo)</span>
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => pickPhoto(e.target.files?.[0])} />
                        </label>
                      </div>
                    )}

                    {photoInfo && <div className="text-xs font-bold text-emerald-800">{photoInfo}</div>}

                    {/* Photo Privacy Toggle */}
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => set("photo_private", !f.photo_private)}
                        className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold border transition ${
                          f.photo_private ? "bg-amber-100 text-amber-900 border-amber-300" : "bg-white text-slate-700 border-slate-200"
                        }`}
                      >
                        <span>{f.photo_private ? "🔒 ఫోటో లాక్: ధృవీకరించబడిన వారికి మాత్రమే" : "🔓 ఫోటో పబ్లిక్: అందరికీ కనిపిస్తుంది"}</span>
                      </button>
                    </div>
                  </div>

                  {/* About Myself with AI Bio Generators */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[13px] font-bold text-slate-800">
                        మీ గురించి క్లుప్తంగా (About Myself) <span className="text-rose-600 font-black">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={startVoice}
                        className="px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs font-bold flex items-center gap-1 hover:bg-indigo-100 transition"
                      >
                        <span>🎙️</span>
                        <span>మాట్లాడి రాయండి</span>
                      </button>
                    </div>

                    {/* 1-Tap Quick Bio Fillers */}
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => autoGenerateBio("traditional")}
                        className="px-2.5 py-1 rounded-lg bg-amber-50 border border-gold/40 text-maroon text-xs font-bold hover:bg-gold/20 transition"
                      >
                        🌸 సాంప్రదాయ బయో
                      </button>
                      <button
                        type="button"
                        onClick={() => autoGenerateBio("professional")}
                        className="px-2.5 py-1 rounded-lg bg-amber-50 border border-gold/40 text-maroon text-xs font-bold hover:bg-gold/20 transition"
                      >
                        💼 ప్రొఫెషనల్ బయో
                      </button>
                      <button
                        type="button"
                        onClick={() => autoGenerateBio("nri")}
                        className="px-2.5 py-1 rounded-lg bg-amber-50 border border-gold/40 text-maroon text-xs font-bold hover:bg-gold/20 transition"
                      >
                        ✈️ NRI బయో
                      </button>
                    </div>

                    <textarea
                      rows={3}
                      value={f.about_myself}
                      onChange={(e) => set("about_myself", e.target.value)}
                      placeholder="మీ కుటుంబ నేపథ్యం, ఉద్యోగం మరియు భాగస్వామి నుండి ఆశించే గుణాల గురించి రాయండి…"
                      className="w-full rounded-2xl border border-slate-200 p-3 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-maroon/20 focus:border-maroon telugu"
                    />
                    <div className="text-right text-[11px] text-slate-400">{String(f.about_myself || "").length} అక్షరాలు (కనీసం 30)</div>
                  </div>

                  {/* Referral Code (Optional) */}
                  <TextField
                    label="రెఫరల్ కోడ్ (Referral Code — Optional)"
                    value={f.referral_code}
                    onChange={(v) => set("referral_code", v.toUpperCase())}
                    placeholder="మిత్రుల రెఫరల్ కోడ్ ఉంటే ఇక్కడ ఇవ్వండి"
                    optional
                  />

                  {/* Terms & Consent */}
                  <label className="flex items-start gap-2.5 p-3 rounded-2xl bg-amber-50/60 border border-gold/30 cursor-pointer text-xs text-slate-800">
                    <input
                      type="checkbox"
                      checked={f.consent}
                      onChange={(e) => set("consent", e.target.checked)}
                      className="accent-[#7A0C2E] w-4 h-4 rounded mt-0.5"
                    />
                    <span className="telugu font-medium">
                      నేను అందించిన సమాచారం నిజమైనదని ధృవీకరిస్తున్నాను మరియు మన వివాహ నిబంధనలు & గోప్యతా విధానానికి అంగీకరిస్తున్నాను.
                    </span>
                  </label>
                </div>
              )}

              {/* Navigation Actions (Desktop & Tablet inline) */}
              <div className="border-t border-slate-100 pt-4 flex items-center justify-between gap-3">
                {step > 1 ? (
                  <button
                    type="button"
                    onClick={back}
                    disabled={busy}
                    className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs sm:text-sm font-bold hover:bg-slate-50 transition"
                  >
                    ← వెనుకకు (Back)
                  </button>
                ) : (
                  <div />
                )}

                {step < 5 ? (
                  <button
                    type="button"
                    onClick={next}
                    className="px-6 py-2.5 rounded-xl maroon-gradient text-white text-xs sm:text-sm font-bold shadow-md hover:brightness-105 transition flex items-center gap-1.5"
                  >
                    <span>ముందుకు వెళ్లండి (Next)</span>
                    <span>→</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={submit}
                    disabled={busy}
                    className="px-8 py-3 rounded-2xl gold-gradient text-maroon text-xs sm:text-sm font-black shadow-lg hover:brightness-105 transition flex items-center gap-2 disabled:opacity-50"
                  >
                    {busy ? (
                      <>
                        <div className="w-4 h-4 border-2 border-maroon border-t-transparent rounded-full animate-spin" />
                        <span>నమోదు జరుగుతోంది…</span>
                      </>
                    ) : (
                      <>
                        <span>🎉</span>
                        <span>నమోదు పూర్తి చేయండి (Complete)</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ================= RIGHT COLUMN: LIVE PREVIEW & TRUST CARD (4 cols - Desktop) ================= */}
          <div className="hidden lg:block lg:col-span-4 sticky top-28 space-y-4">
            {/* Live Profile Card Preview */}
            <div className="bg-white rounded-3xl border border-gold/40 shadow-lg p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-black text-maroon flex items-center gap-1.5">
                  <span>✨</span>
                  <span>ప్రత్యక్ష బయోడేటా నమూనా (Live Preview)</span>
                </span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                  100% Verified
                </span>
              </div>

              {/* Mini Matrimony Card */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-16 h-20 rounded-2xl bg-amber-50 border border-gold/30 flex items-center justify-center text-3xl shadow-xs overflow-hidden shrink-0">
                    {photoPreview ? (
                      <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <span>{f.gender === "Bride" ? "👰" : "🤵"}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-extrabold text-sm text-navy truncate">{f.full_name || "మీ పేరు (Your Name)"}</div>
                    <div className="text-xs font-bold text-maroon mt-0.5">
                      {f.gender === "Bride" ? "👰 వధువు" : "🤵 వరుడు"} • {f.age ? `${f.age} సం.` : "26y"} • {f.height || "5'4\""}
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                      💍 {f.caste || "కులం"} {f.sub_caste ? `(${f.sub_caste})` : ""}
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-2xl p-3 space-y-1.5 text-xs text-slate-700 border border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <span>🎓</span>
                    <span className="font-medium truncate">{f.education || "విద్యార్హత"}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span>💼</span>
                    <span className="font-medium truncate">{f.job || "ఉద్యోగం / హోదా"}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span>💰</span>
                    <span className="font-bold text-emerald-700 truncate">{f.salary || "వార్షిక వేతనం"}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span>📍</span>
                    <span className="font-medium truncate">
                      {f.district || "జిల్లా"}, {f.state || "TS"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-amber-900 font-semibold pt-1 border-t border-slate-200">
                    <span>⭐</span>
                    <span>
                      {f.star || "నక్షత్రం"} {f.rasi ? `• ${f.rasi}` : ""}
                    </span>
                  </div>
                </div>
              </div>

              {/* Trust Badges */}
              <div className="space-y-2 border-t border-slate-100 pt-3 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span>100% ఉచిత రిజిస్ట్రేషన్ & మ్యాచ్‌ల వీక్షణ</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span>సంపూర్ణ గోప్యత & ఫోటో లాక్ నియంత్రణ</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span>24/7 వాట్సాప్ సపోర్ట్: +91 6304996088</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ---------- Sticky Bottom Action Bar (Mobile & Tablet) ---------- */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gold/30 p-3 shadow-xl">
        <div className="max-w-xl mx-auto flex items-center justify-between gap-3">
          {step > 1 ? (
            <button
              type="button"
              onClick={back}
              disabled={busy}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs font-bold hover:bg-slate-50 transition"
            >
              ← వెనుకకు
            </button>
          ) : (
            <div className="flex-1 text-[11px] text-slate-500 font-semibold text-center">దశ {step} / 5</div>
          )}

          {step < 5 ? (
            <button
              type="button"
              onClick={next}
              className="flex-2 py-2.5 px-4 rounded-xl maroon-gradient text-white text-xs sm:text-sm font-bold shadow-md hover:brightness-105 transition flex items-center justify-center gap-1.5"
            >
              <span>ముందుకు వెళ్లండి</span>
              <span>→</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={busy}
              className="flex-2 py-2.5 px-4 rounded-xl gold-gradient text-maroon text-xs sm:text-sm font-black shadow-lg hover:brightness-105 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {busy ? "నమోదు…" : "🎉 నమోదు పూర్తి చేయండి"}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#FAF7F2]">
          <div className="text-center space-y-2">
            <div className="w-10 h-10 border-4 border-maroon border-t-transparent rounded-full animate-spin mx-auto" />
            <div className="text-xs font-bold text-maroon">మన వివాహ రిజిస్ట్రేషన్ లోడ్ అవుతోంది…</div>
          </div>
        </div>
      }
    >
      <Wizard />
    </Suspense>
  );
}
