"use client";

/**
 * 👑 MANA VIVAHA — SMART MATRIMONY REGISTRATION & 1-MINUTE ONBOARDING (V5.5)
 * =========================================================================
 * • ⚡ 1-Minute Quick Registration Mode vs 🌟 5-Step Detailed Registration Mode
 * • 🎁 Auto-Locked Referral QR Support + Instant Welcome Credit Bonuses
 * • 100% Progressive Profile Completion Loop with Seamless Handoff to /me
 * • Responsive Dual-Column Desktop Layout + Live Matrimony Card Preview
 * • Strict Photo Validation: Client-side HD compression, clarity check, privacy toggle
 * • 1-Click Sample Demos, Voice Typing Bio 🎙️, AI Bio Generators
 * • Real-time Draft Auto-Save & Permanent DB Persistence
 */
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Reveal from "@/components/Reveal";
import { SITE_CONFIG } from "@/lib/site-config";
import { authHeaders } from "@/lib/api";
import { Duo, duo } from "@/lib/duo";
import { useLang } from "@/lib/lang";
import { stateFullName } from "@/lib/telugu-data";
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
  height: "5'5\"",
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
  education: "B.Tech / Graduate",
  education_detail: "",
  job: "Private Sector",
  company: "",
  salary: "₹7 - 10 Lakhs / year",
  experience: "3 years",
  work_location: "Hyderabad",
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
  consent: true,
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
    return options.filter((o) => o.toLowerCase().includes(needle) || (teMap && teMap[o]?.toLowerCase().includes(needle)));
  }, [options, q, teMap]);

  return (
    <div className="space-y-1.5 relative" ref={boxRef}>
      <label className="text-[13px] font-bold text-slate-800 flex items-center justify-between">
        <span>
          {label} {required ? <span className="text-rose-600 font-black">*</span> : <span className="text-[11px] text-gray-400 font-normal">(ఐచ్ఛికం)</span>}
        </span>
      </label>
      {hint && <div className="text-[11px] text-slate-500">{hint}</div>}

      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`w-full text-left bg-white border rounded-xl px-3.5 py-2.5 text-xs font-medium flex items-center justify-between transition ${
          open ? "border-maroon ring-2 ring-maroon/20" : "border-slate-200 hover:border-slate-300"
        }`}
      >
        <span className={value ? "text-slate-900 font-bold" : "text-slate-400"}>
          {value ? (teMap && teMap[value] ? `${teMap[value]} (${value})` : value) : placeholder || "ఎంచుకోండి (Select)…"}
        </span>
        <span className="text-slate-400 text-[10px]">▼</span>
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl p-2 max-h-60 overflow-y-auto space-y-1">
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="🔍 వెతకండి / Type to filter…"
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-maroon mb-1"
          />
          {list.length === 0 ? (
            <div className="p-3 text-center text-xs text-slate-400">ఎలాంటి ఫలితాలు లేవు</div>
          ) : (
            list.map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => {
                  onChange(o);
                  setOpen(false);
                  setQ("");
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs transition flex items-center justify-between ${
                  value === o ? "bg-maroon-soft text-maroon font-bold" : "hover:bg-slate-50 text-slate-700"
                }`}
              >
                <span>{teMap && teMap[o] ? `${teMap[o]} (${o})` : o}</span>
                {value === o && <span className="text-maroon">✓</span>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function PillGroup({
  label,
  options,
  value,
  onChange,
  required,
}: {
  label: React.ReactNode;
  options: { v: string; te?: string; sub?: string }[];
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[13px] font-bold text-slate-800">
        {label} {required && <span className="text-rose-600 font-black">*</span>}
      </label>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o.v}
            type="button"
            onClick={() => onChange(o.v)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
              value === o.v ? "bg-maroon text-white border-maroon shadow-xs" : "bg-white text-slate-700 border-slate-200"
            }`}
          >
            {o.te || o.v}
          </button>
        ))}
      </div>
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
  required,
}: {
  label: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  options: { v: string; l?: string }[];
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[13px] font-bold text-slate-800">
        {label} {required && <span className="text-rose-600 font-black">*</span>}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium"
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.v} value={o.v}>
            {o.l || o.v}
          </option>
        ))}
      </select>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
  required,
  placeholder,
  hint,
  disabled,
  maxLength,
}: {
  label: React.ReactNode;
  value: any;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
  hint?: string;
  disabled?: boolean;
  maxLength?: number;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[13px] font-bold text-slate-800 flex items-center justify-between">
        <span>
          {label} {required ? <span className="text-rose-600 font-black">*</span> : <span className="text-[11px] text-gray-400 font-normal">(ఐచ్ఛికం)</span>}
        </span>
      </label>
      {hint && <div className="text-[11px] text-slate-500">{hint}</div>}
      <input
        type={type}
        disabled={disabled}
        maxLength={maxLength}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-maroon/20 focus:border-maroon disabled:bg-slate-100 disabled:text-slate-400"
      />
    </div>
  );
}

/* ---------------- Main Wizard Component ---------------- */
function Wizard() {
  const { lang } = useLang();
  const te = lang === "te";
  const T = <V,>(a: V, b: V): V => (te ? a : b);
  const params = useSearchParams();

  // Mode: 1-Minute Quick Registration vs 5-Step Detailed Mode
  const [regMode, setRegMode] = useState<"quick" | "full">("quick");
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
  const topRef = useRef<HTMLDivElement>(null);

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

  // Referral param sync & locking
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
    if (!sessionStorage.getItem("tsap_click_fired")) {
      sessionStorage.setItem("tsap_click_fired", "1");
      fetch(`/api/referral/click/${encodeURIComponent(ref)}?source=register_direct`, { method: "POST" })
        .then((r) => r.json())
        .then((d) => {
          if (d?.valid_code && d?.referrer_name) setRefInfo({ ok: true, referrer_name: d.referrer_name, bonus_credits: d.bonus_credits });
        })
        .catch(() => {});
    }
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

  const validateQuick = (): string[] => {
    const e: string[] = [];
    if (!f.gender) e.push(T("వధువు / వరుడు ఎంచుకోండి (Select Bride / Groom)", "Select Bride / Groom"));
    if (!String(f.full_name).trim()) e.push(T("పూర్తి పేరు నమోదు చేయండి (Enter full name)", "Enter full name"));
    if (!f.dob) e.push(T("పుట్టిన తేదీ ఎంచుకోండి (Select date of birth)", "Select date of birth"));
    else if (!ageFromDob(f.dob)) e.push(T("పుట్టిన తేదీ ప్రకారం కనీసం 18 ఏళ్లు ఉండాలి", "DOB must be at least 18 years"));
    if (!f.caste) e.push(T("కులం ఎంచుకోండి (Select caste)", "Select caste"));
    if (!f.district) e.push(T("జిల్లా ఎంచుకోండి (Select district)", "Select district"));
    if (!/^\d{10}$/.test(String(f.phone))) e.push(T("10 అంకెల మొబైల్ నంబర్ ఇవ్వండి (Enter 10-digit mobile number)", "Enter a 10-digit mobile number"));
    if (String(f.password || "").length < 6) e.push(T("Password minimum 6 characters పెట్టండి", "Password minimum 6 characters పెట్టండి"));
    return e;
  };

  const validateStep = (s: number): string[] => {
    const e: string[] = [];
    if (s === 1) {
      if (!f.gender) e.push(T("వధువు / వరుడు ఎంచుకోండి (Select Bride / Groom)", "Select Bride / Groom"));
      if (!String(f.full_name).trim()) e.push(T("పూర్తి పేరు నమోదు చేయండి (Enter full name)", "Enter full name"));
      if (!f.dob) e.push(T("పుట్టిన తేదీ ఎంచుకోండి (Select date of birth)", "Select date of birth"));
      else if (!ageFromDob(f.dob)) e.push(T("పుట్టిన తేదీ సరైనది కాదు — కనీసం 18 ఏళ్లు ఉండాలి", "DOB must be at least 18 years"));
      if (!f.height) e.push(T("ఎత్తు ఎంచుకోండి (Select your height)", "Select your height"));
      if (!f.marital_status) e.push(T("వైవాహిక స్థితి ఎంచుకోండి (Select marital status)", "Select marital status"));
      if (f.marital_status && f.marital_status !== "Pelli Kaledu" && !f.children) {
        e.push(T("పిల్లల సంఖ్య ఎంచుకోండి / Number of children select చెయ్యండి", "Number of children select చెయ్యండి"));
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
      if (String(f.password || "").length < 6) e.push(T("Password minimum 6 characters పెట్టండి", "Password minimum 6 characters పెట్టండి"));
    }
    return e;
  };

  const executeSubmit = async (isQuick = false) => {
    const errsList = isQuick ? validateQuick() : validateStep(step);
    if (errsList.length) {
      setErrs(errsList);
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

      // Auto-fallback defaults if quick mode
      const payload: Record<string, any> = { ...f };
      if (!payload.height) payload.height = "5'5\"";
      if (!payload.marital_status) payload.marital_status = "Pelli Kaledu";
      if (!payload.education) payload.education = "Graduate / Degree";
      if (!payload.job) payload.job = "Private Sector";
      if (!payload.salary) payload.salary = "₹5 - 7 Lakhs / year";
      if (!payload.state) payload.state = "TS";

      strings.forEach((k) => fd.append(k, String(payload[k] ?? "")));
      fd.append("age", String(payload.age || ageFromDob(payload.dob) || ""));
      fd.append("photo_private", String(!!payload.photo_private));
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
          localStorage.setItem("tsap_last_id", String(d.tsap_id || ""));
          const existing = JSON.parse(localStorage.getItem("tsap_profiles") || "[]");
          localStorage.setItem("tsap_profiles", JSON.stringify([{ id: d.tsap_id, name: payload.full_name }, ...existing]));
        }
      } catch {
        /* ignore */
      }
      scrollTop();
    } catch (e: any) {
      setErrs([e?.message || T("నమోదులో సమస్య ఏర్పడింది — దయచేసి మళ్లీ ప్రయత్నించండి", "Problem during registration — please retry")]);
    }
    setBusy(false);
  };

  const next = () => {
    const e = validateStep(step);
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

  const fillSampleDemo = (gender: "Bride" | "Groom") => {
    if (gender === "Bride") {
      setF((prev) => ({
        ...prev,
        gender: "Bride",
        full_name: "Sai Divya",
        dob: "2000-08-14",
        age: "26",
        height: "5'4\"",
        caste: "Reddy",
        sub_caste: "Motati",
        gothram: "Janakula",
        star: "Rohini",
        rasi: "Vrishabha",
        work_type: "Software / IT / Tech",
        education: "B.Tech / B.E.",
        job: "Software Engineer",
        company: "Infosys",
        salary: "₹10 - 12 Lakhs / year",
        state: "TS",
        district: "Hyderabad",
        phone: "9876543210",
        password: "password123",
      }));
    } else {
      setF((prev) => ({
        ...prev,
        gender: "Groom",
        full_name: "Ramesh Reddy",
        dob: "1997-04-10",
        age: "29",
        height: "5'9\"",
        caste: "Reddy",
        sub_caste: "Gudati",
        gothram: "Vishnu",
        star: "Swathi",
        rasi: "Tula",
        work_type: "Software / IT / Tech",
        education: "M.Tech / M.S. (Abroad)",
        job: "Senior Tech Lead",
        company: "Google / Tech",
        salary: "₹25 - 30 Lakhs / year",
        state: "TS",
        district: "Hyderabad",
        phone: "9876543211",
        password: "password123",
      }));
    }
    setErrs([]);
  };

  /* ================= SUCCESS SCREEN ================= */
  if (result) {
    const tsap = result.tsap_id || result.user_id || "";
    const cardUrl = tsap ? result.card_url || `/cards/${tsap}.png` : "";
    return (
      <main className="min-h-dvh py-8 px-4 bg-[#FAF7F2]">
        <div className="max-w-2xl mx-auto bg-white rounded-3xl border border-gold/40 shadow-2xl overflow-hidden animate-fade">
          {/* Header Banner */}
          <div className="maroon-gradient p-6 text-white text-center space-y-2">
            <div className="text-4xl">🎉 💍 🌸</div>
            <h1 className="text-xl sm:text-2xl font-black">
              {T("నమోదు విజయవంతంగా పూర్తయింది!", "Registration Successful!")}
            </h1>
            <p className="text-xs sm:text-sm text-gold-light telugu font-medium">
              {T(`మీ ప్రొఫైల్ ఐడీ: ${tsap} • 100% ఉచితంగా లైవ్ అయ్యింది`, `Your Profile ID: ${tsap} • Active & Live`)}
            </p>
          </div>

          <div className="p-5 sm:p-6 space-y-5">
            {/* ID & Verified Badge */}
            <div className="bg-amber-50/80 border border-gold/50 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 font-bold block">మీ TSAP మ్యాట్రిమోనీ ఐడీ</span>
                <span className="text-2xl font-black text-maroon font-mono">{tsap}</span>
              </div>
              <span className="px-3 py-1.5 bg-emerald-100 text-emerald-800 text-xs font-black rounded-full border border-emerald-300">
                ✅ ధృవీకరించబడింది
              </span>
            </div>

            {/* What you got card */}
            <div className="bg-amber-50/60 border border-gold/30 rounded-2xl p-3.5 text-xs text-slate-700 space-y-1">
              <div className="font-bold text-maroon">🎁 మీ అకౌంట్ వివరాలు & కాంటాక్ట్ స్టేటస్:</div>
              <div><b>3 requests</b> ready • ఫోన్ నంబర్లు <b>numbers 🔒 locked</b> (గోప్యతా రక్షణతో).</div>
            </div>

            {/* Referral confirmation if attached */}
            {(result.joined_with?.ok || refLocked) && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 flex items-center gap-3 text-xs text-emerald-900">
                <span className="text-xl">🎁</span>
                <div>
                  <span className="font-bold">రిఫరల్ బోనస్ యాక్టివేట్ అయ్యింది! </span>
                  <span>మీ ఖాతాకు +{result.joined_with?.bonus_credits || 2} ఉచిత కాంటాక్ట్ క్రెడిట్స్ (bonus_credits) మరియు ప్రత్యేక వెల్‌కమ్ ఆఫర్ జోడించబడ్డాయి.</span>
                </div>
              </div>
            )}

            {/* Referral Dashboard & Poster Card */}
            {(result.referral?.my_code || result.my_referral_code) && (
              <div className="bg-amber-50 border border-gold/40 rounded-2xl p-3.5 text-xs space-y-1">
                <div className="font-bold text-maroon">🎁 మీ రిఫరల్ కోడ్: {result.referral?.my_code || result.my_referral_code}</div>
                <div className="text-slate-600">స్నేహితులకు షేర్ చేసి ప్రతి రిజిస్ట్రేషన్‌కు +2 క్రెడిట్స్ & ₹50 నగదు పొందండి. (poster_url: {result.referral?.poster_url || `/api/referral/${tsap}/poster.png`})</div>
                <Link href={`/referral?id=${tsap}`} className="text-maroon font-bold underline inline-block pt-1">
                  Referral dashboard కి వెళ్లండి →
                </Link>
              </div>
            )}

            {/* Set Partner Preferences Now Card */}
            <div className="bg-gradient-to-r from-amber-500 to-rose-600 rounded-2xl p-4 text-white space-y-2 shadow-md">
              <div className="flex items-center gap-2">
                <span className="text-xl">🎯</span>
                <span className="font-black text-sm">మీకు ఎలాంటి సంబంధం కావాలి? (Partner Preferences)</span>
              </div>
              <p className="text-[11px] text-amber-100">
                మీరు కోరుకునే కులాలు (Castes), వయస్సు, విద్యార్హతలు & జిల్లాలను ఇప్పుడే సెట్ చేసుకోండి. సిస్టమ్ ఆటోమేటిక్‌గా ఆ సంబంధాలనే మీకు చూపిస్తుంది!
              </p>
              <Link
                href="/me"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-[#7A0C2E] font-black text-xs hover:bg-amber-100 transition shadow"
              >
                <span>🎯</span>
                <span>నా ప్రిఫరెన్సెస్ సెట్ చేయండి →</span>
              </Link>
            </div>

            {/* Photo Flow upload */}
            <div className="border border-gold/30 rounded-2xl p-4 bg-white space-y-2">
              <PhotoFlow tsapId={tsap} />
            </div>

            {/* 100% Profile Completeness Loop Banner */}
            <div className="bg-gradient-to-r from-amber-50 via-rose-50 to-amber-50 border-2 border-gold/40 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-black text-slate-900">📊 ప్రొఫైల్ పూర్తి స్థితి: 55%</span>
                <span className="font-bold text-maroon">100% కి పెంచుకోండి</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                <div className="bg-gradient-to-r from-[#D4AF37] to-[#7A0C2E] h-2.5 rounded-full w-[55%]" />
              </div>
              <p className="text-[11px] text-slate-600 telugu">
                💡 జాతకం, ఉద్యోగం, విద్య మరియు కుటుంబ వివరాలు అప్‌డేట్ చేసి 100% పూర్తి చేయండి — 5 రెట్లు ఎక్కువ సంబంధాలు పొందండి!
              </p>
            </div>

            {cardUrl && (
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-700 block">🖼️ మీ వాట్సాప్ స్టేటస్ బయోడేటా కార్డ్:</span>
                <img src={cardUrl} alt="Matrimony card" className="w-full rounded-2xl border border-gold/30 shadow-sm" />
              </div>
            )}

            {/* Action CTA Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <Link
                href="/me"
                className="py-3.5 px-4 rounded-xl gold-gradient text-maroon font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-gold hover:brightness-105 transition"
              >
                <span>✏️</span>
                <span>{T("ఇప్పుడే ప్రొఫైల్ 100% పూర్తి చేయండి", "Complete Profile to 100%")}</span>
              </Link>

              <Link
                href="/matches"
                className="py-3.5 px-4 rounded-xl maroon-gradient text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md hover:brightness-105 transition"
              >
                <span>🔍</span>
                <span>{T("10,000+ సంబంధాలు చూడండి", "View Matching Profiles")}</span>
              </Link>

              <Link
                href="/referral"
                className="py-3 px-4 rounded-xl bg-white border-2 border-gold/60 text-maroon font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-amber-50 transition"
              >
                <span>🏪</span>
                <span>{T("నా షాప్ QR & పోస్టర్ పొందండి", "Get Referral Shop QR")}</span>
              </Link>

              <Link
                href="/biodata"
                className="py-3 px-4 rounded-xl bg-white border-2 border-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-slate-50 transition"
              >
                <span>🎴</span>
                <span>{T("ఉచిత బయోడేటా HD JPG స్టూడియో", "Biodata JPG Studio")}</span>
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const stepMeta = STEPS[step - 1];

  return (
    <main className="min-h-dvh pb-28 sm:pb-36 bg-[#FAF7F2]" ref={topRef}>
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

        {/* Mode Selector Tabs (1-Minute Quick vs 5-Step Detailed) */}
        <div className="max-w-6xl mx-auto px-4 pb-2 pt-1">
          <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <button
              type="button"
              onClick={() => setRegMode("quick")}
              className={`py-2 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 ${
                regMode === "quick"
                  ? "maroon-gradient text-white shadow-sm scale-[1.01]"
                  : "text-slate-700 hover:text-maroon hover:bg-white/60"
              }`}
            >
              <span>⚡</span>
              <span>1-నిమిషం త్వరిత రిజిస్ట్రేషన్ (1-Min Quick)</span>
            </button>
            <button
              type="button"
              onClick={() => setRegMode("full")}
              className={`py-2 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 ${
                regMode === "full"
                  ? "maroon-gradient text-white shadow-sm scale-[1.01]"
                  : "text-slate-700 hover:text-maroon hover:bg-white/60"
              }`}
            >
              <span>🌟</span>
              <span>5-దశల సంపూర్ణ రిజిస్ట్రేషన్ (5-Step Full)</span>
            </button>
          </div>
        </div>

        {/* Stepper Progress Bar (Only in Full Mode) */}
        {regMode === "full" && (
          <div className="max-w-6xl mx-auto px-4 pb-2 pt-1">
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
        )}
      </div>

      {/* ---------- Main Layout ---------- */}
      <div className="max-w-6xl mx-auto px-4 py-4 sm:py-6 space-y-4">
        
        {/* Referral Welcome Banner */}
        {refLocked && (
          <div className="bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 text-[#5C0822] rounded-2xl p-3.5 sm:p-4 shadow-md border-2 border-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl sm:text-3xl">🎁</span>
              <div>
                <div className="font-black text-xs sm:text-sm uppercase tracking-wide">
                  మీరు {refInfo?.referrer_name ? `${refInfo.referrer_name} గారి సిఫార్సు ద్వారా వచ్చారు` : "సిఫార్సు ద్వారా వచ్చారు"} (Referral Active: {refLocked})
                </div>
                <div className="text-[11px] sm:text-xs font-bold mt-0.5 opacity-90">
                  {refInfo?.referrer_name ? `సిఫార్సు చేసినవారు: ${refInfo.referrer_name} • ` : ""}
                  మీకు +2 ఉచిత కాంటాక్ట్ క్రెడిట్స్ మరియు వెల్‌కమ్ బోనస్ లభిస్తాయి!
                </div>
              </div>
            </div>
            <span className="px-3 py-1 bg-[#5C0822] text-white text-[11px] font-black rounded-full self-start sm:self-auto shrink-0 shadow-xs">
              ⚡ +2 క్రెడిట్స్ లాక్ చేయబడ్డాయి
            </span>
          </div>
        )}

        {/* Draft Restore Alert */}
        {draftFound && (
          <div className="bg-amber-50 border border-gold/40 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs">
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
          <div className="bg-rose-50 border border-rose-300 rounded-2xl p-4 space-y-1 shadow-xs animate-shake">
            <div className="text-xs font-black text-rose-800 flex items-center gap-1.5">
              <span>⚠️</span>
              <span>దయచేసి క్రింది వివరాలు సరిచూసుకోండి:</span>
            </div>
            {errs.map((e, idx) => (
              <div key={idx} className="text-xs text-rose-900 telugu font-medium pl-5">
                • {e}
              </div>
            ))}
          </div>
        )}

        {/* ============================================================== */}
        {/* ⚡ MODE 1: 1-MINUTE QUICK REGISTRATION                         */}
        {/* ============================================================== */}
        {regMode === "quick" ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-8 bg-white rounded-3xl border-2 border-gold/40 shadow-xl p-5 sm:p-7 space-y-6">
              {/* Header */}
              <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-black text-maroon flex items-center gap-2">
                    <span>⚡</span>
                    <span>కేవలం 1-నిమిషంలో ఉచిత రిజిస్ట్రేషన్ (1-Minute Quick Mode)</span>
                  </h2>
                  <p className="text-xs text-slate-500 telugu mt-0.5">
                    కేవలం 6 ముఖ్య వివరాలతో వెంటనే నమోదు చేసుకోండి — మిగతా వివరాలు తర్వాత మీ ప్రొఫైల్‌లో పూర్తి చేయవచ్చు!
                  </p>
                </div>

                {/* 1-Click Demo Profile Pill */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => fillSampleDemo("Bride")}
                    className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-800 font-bold text-[11px] border border-rose-200 hover:bg-rose-100"
                  >
                    👰 వధువు డెమో
                  </button>
                  <button
                    type="button"
                    onClick={() => fillSampleDemo("Groom")}
                    className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-800 font-bold text-[11px] border border-indigo-200 hover:bg-indigo-100"
                  >
                    🤵 వరుడు డెమో
                  </button>
                </div>
              </div>

              {/* 1. Gender */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800">
                  ఎవరి కోసం ప్రొఫైల్ నమోదు చేస్తున్నారు? <span className="text-rose-600 font-black">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { v: "Bride", l: "👰 వధువు (Bride)" },
                    { v: "Groom", l: "🤵 వరుడు (Groom)" },
                  ].map((g) => (
                    <button
                      key={g.v}
                      type="button"
                      onClick={() => set("gender", g.v)}
                      className={`rounded-2xl border-2 p-3 text-center transition-all ${
                        f.gender === g.v
                          ? "border-maroon bg-maroon-soft shadow-sm ring-2 ring-maroon/20"
                          : "border-slate-200 bg-white hover:border-maroon/40"
                      }`}
                    >
                      <div className="text-2xl">{g.v === "Bride" ? "👰" : "🤵"}</div>
                      <div className="font-black text-xs text-maroon mt-1 telugu">{g.l}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Full Name */}
              <TextField
                label="పూర్తి పేరు (Full Name)"
                value={f.full_name}
                onChange={(v) => set("full_name", v)}
                required
                placeholder="ఉదా: Sai Divya / Rajesh Reddy"
              />

              {/* 3. DOB & Age */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-slate-700">⚡ పుట్టిన సంవత్సరం త్వరిత ఎంపిక:</div>
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <TextField
                    label="పుట్టిన తేదీ (Date of Birth)"
                    value={f.dob}
                    onChange={(v) => set("dob", v)}
                    required
                    type="date"
                    hint="DOB ప్రకారం వయసు ఆటోమేటిక్‌గా లెక్కించబడుతుంది"
                  />
                  <TextField
                    label="వయసు (Age in Years)"
                    value={f.age}
                    onChange={(v) => set("age", v)}
                    required
                    type="number"
                    disabled
                    placeholder="26"
                  />
                </div>
              </div>

              {/* 4. Caste & Subcaste */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <SearchSelect
                  label="కులం (Caste)"
                  options={casteOpts}
                  value={f.caste}
                  onChange={(v) => set("caste", v)}
                  required
                  teMap={CASTE_TELUGU}
                  placeholder="కులం ఎంచుకోండి…"
                />
                <TextField
                  label="ఉపకులం (Sub-caste - Optional)"
                  value={f.sub_caste}
                  onChange={(v) => set("sub_caste", v)}
                  placeholder="ఉదా: Motati, Pokanati, 6000 Niyogi…"
                />
              </div>

              {/* 4.5. Education & Profession */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50/70 p-3 rounded-2xl border border-slate-200">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800">విద్యార్హత (Education) *</label>
                  <select
                    value={f.education || "B.Tech / Graduate"}
                    onChange={(e) => set("education", e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium"
                  >
                    {EDUCATIONS.map((e) => (
                      <option key={e} value={e}>
                        {e}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800">ఉద్యోగం / హోదా (Job Title) *</label>
                  <select
                    value={f.job || "Private Sector"}
                    onChange={(e) => {
                      const j = e.target.value;
                      set("job", j);
                      if (j.includes("Housewife") || j.includes("Student")) {
                        set("salary", "None / Not Applicable");
                      }
                    }}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium"
                  >
                    <option value="Housewife / Homemaker (గృహిణి)">🏡 Housewife / Homemaker (గృహిణి)</option>
                    <option value="Software Engineer">💻 Software Engineer / IT</option>
                    <option value="Govt Employee (Central / State)">🏛️ Govt Employee / PSU</option>
                    <option value="Bank Officer / PO / Manager">🏦 Bank Officer / Finance</option>
                    <option value="Doctor / Physician">🩺 Doctor / Healthcare</option>
                    <option value="Teacher / School Faculty">🎓 Teacher / Professor</option>
                    <option value="Business Owner / Entrepreneur">💼 Business / Self Employed</option>
                    <option value="Farmer / Farm Owner">🌾 Farmer / Agriculture</option>
                    <option value="Private Sector">🏢 Private Sector Professional</option>
                    <option value="Not Working / Student">📚 Student / Looking for Job</option>
                  </select>
                </div>
              </div>

              {/* 5. State & District */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800">రాష్ట్రం (State) *</label>
                  <select
                    value={f.state || "TS"}
                    onChange={(e) => {
                      set("state", e.target.value);
                      set("district", "");
                    }}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold"
                  >
                    <option value="TS">తెలంగాణ (Telangana)</option>
                    <option value="AP">ఆంధ్రప్రదేశ్ (Andhra Pradesh)</option>
                    <option value="KA">కర్ణాటక (Karnataka / Bengaluru)</option>
                    <option value="MH">మహారాష్ట్ర (Maharashtra / Mumbai)</option>
                    <option value="Other">ఇతర రాష్ట్రం / NRI</option>
                  </select>
                </div>

                <SearchSelect
                  label="జిల్లా / నగరం (District / City)"
                  options={DISTRICTS_BY_STATE[f.state] || DISTRICTS_BY_STATE.TS}
                  value={f.district}
                  onChange={(v) => set("district", v)}
                  required
                  teMap={DISTRICT_TELUGU}
                  placeholder="జిల్లా ఎంచుకోండి…"
                />
              </div>

              {/* 6. Phone & Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <TextField
                  label="10 అంకెల మొబైల్ (WhatsApp Number)"
                  value={f.phone}
                  onChange={(v) => set("phone", v.replace(/\D/g, "").slice(0, 10))}
                  required
                  maxLength={10}
                  placeholder="9876543210"
                  hint="ధృవీకరణ & సంబంధాల అప్‌డేట్స్ కోసం"
                />
                <div className="space-y-1.5 relative">
                  <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                    <span>పాస్‌వర్డ్ (Password - Minimum 6 characters) <span className="text-rose-600 font-black">*</span></span>
                    <button
                      type="button"
                      onClick={() => setShowPw(!showPw)}
                      className="text-[11px] text-maroon font-bold"
                    >
                      {showPw ? "Hide" : "Show"}
                    </button>
                  </label>
                  <input
                    type={showPw ? "text" : "password"}
                    value={f.password || ""}
                    onChange={(e) => set("password", e.target.value)}
                    placeholder="కనీసం 6 అక్షరాలు (min 6 chars)"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-medium focus:outline-none focus:border-maroon"
                  />
                </div>
              </div>

              {/* ₹99 Sambandham Nudge */}
              <div className="text-xs text-slate-600 bg-amber-50/50 border border-gold/20 rounded-xl p-2.5 flex items-center justify-between">
                <span>🌟 <b>₹99 Sambandham</b> ప్లాన్ కోసం ప్రీమియం ఆఫర్స్ ఉన్నాయి</span>
                <Link href="/pricing" className="text-maroon font-bold underline text-xs">
                  ప్లాన్స్ →
                </Link>
              </div>

              {/* Referral Code (Locked or Input) */}
              <div className="bg-amber-50/70 border border-gold/30 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <label className="font-bold text-maroon block">సిఫార్సు కోడ్ (Referral Code):</label>
                  <span className="text-slate-500 text-[11px]">రిఫరల్ కోడ్ ఉంటే +2 ఉచిత క్రెడిట్స్ బోనస్ లభిస్తాయి.</span>
                </div>
                <input
                  aria-label="Referral code"
                  type="text"
                  value={f.referral_code || ""}
                  onChange={(e) => {
                    const code = e.target.value.toUpperCase();
                    set("referral_code", code);
                    if (code.length >= 3) {
                      fetch(`/api/referral/validate/${encodeURIComponent(code)}`)
                        .then((r) => r.json())
                        .then((d) => {
                          if (d?.ok && d?.referrer_name) setRefInfo({ ok: true, referrer_name: d.referrer_name, bonus_credits: d.bonus_credits });
                        })
                        .catch(() => {});
                    }
                  }}
                  placeholder="కోడ్ ఇవ్వండి (ఉదా: CHARAN519)"
                  disabled={!!refLocked}
                  className="w-full sm:w-48 px-3 py-1.5 bg-white border border-gold/40 rounded-xl uppercase font-mono font-bold text-xs"
                />
              </div>

            {/* Free vs Paid Clarity Box */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs text-slate-700 space-y-1.5 clarity">
              <div className="font-black text-navy flex items-center justify-between">
                <span>🔒 ఉచిత రిజిస్ట్రేషన్ & గోప్యతా విధానం (Free vs Paid Clarity)</span>
                <span className="text-[10px] text-slate-500 font-mono">/api/free-plan</span>
              </div>
              <div className="text-slate-600 space-y-1">
                <div><b>FREE లో ఇచ్చేది:</b> ఉచిత రిజిస్ట్రేషన్, 10,000+ సంబంధాల శోధన, 3 ఉచిత కాంటాక్ట్ రిక్వెస్ట్స్.</div>
                <div><b>FREE లో ఇవ్వనిది:</b> డైరెక్ట్ ఫోన్ నంబర్లు <b>ఎవరికీ ఇవ్వము</b> (ఇరువైపులా ఆమోదం పొందిన తర్వాత లేదా ప్లాన్ ఉన్నప్పుడే నంబర్లు మార్పిడి అవుతాయి).</div>
              </div>
            </div>

            {/* Reassurance Banner */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs text-slate-700 space-y-1">
              <div className="font-black text-navy flex items-center gap-1.5">
                <span>💡</span>
                <span>100% ప్రొఫైల్ వివరాలు ఎప్పుడు పూర్తి చేయాలి?</span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                ఇప్పుడే 1-నిమిషంలో ప్రొఫైల్ ఐడీ క్రియేట్ చేసుకోండి. నమోదు పూర్తయిన తర్వాత మీ అకౌంట్ <strong className="text-maroon">&ldquo;Edit Profile&rdquo;</strong> లో చదువు, ఉద్యోగం, జాతక చక్రం, కుటుంబ వివరాలు, ఫోటోను ఎప్పుడైనా 100% పూర్తి చేసుకోవచ్చు.
              </p>
            </div>

              {/* Submit CTA */}
              <button
                type="button"
                onClick={() => executeSubmit(true)}
                disabled={busy}
                className="w-full py-4 rounded-2xl gold-gradient text-maroon font-black text-sm sm:text-base shadow-gold hover:brightness-105 active:scale-98 transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {busy ? (
                  <>
                    <div className="w-5 h-5 border-3 border-maroon border-t-transparent rounded-full animate-spin" />
                    <span>నమోదు జరుగుతోంది…</span>
                  </>
                ) : (
                  <>
                    <span>🚀</span>
                    <span>1-నిమిషంలో నా ప్రొఫైల్ సృష్టించండి (Create Profile in 1-Min)</span>
                  </>
                )}
              </button>
            </div>

            {/* Desktop Preview Column */}
            <div className="hidden lg:block lg:col-span-4 sticky top-28 space-y-4">
              <div className="bg-white rounded-3xl border border-gold/40 shadow-lg p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-black text-maroon flex items-center gap-1.5">
                    <span>✨</span>
                    <span>లైవ్ కార్డ్ నమూనా (Live Preview)</span>
                  </span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                    1-Min Ready
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-20 rounded-2xl bg-amber-50 border border-gold/30 flex items-center justify-center text-3xl shadow-xs overflow-hidden shrink-0">
                      <span>{f.gender === "Bride" ? "👰" : "🤵"}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-extrabold text-sm text-navy truncate">{f.full_name || "మీ పేరు (Your Name)"}</div>
                      <div className="text-xs font-bold text-maroon mt-0.5">
                        {f.gender === "Bride" ? "👰 వధువు" : "🤵 వరుడు"} • {f.age ? `${f.age} సం.` : "26y"}
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                        💍 {f.caste || "కులం"} {f.sub_caste ? `(${f.sub_caste})` : ""}
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-2xl p-3 space-y-1.5 text-xs text-slate-700 border border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <span>📍</span>
                      <span className="font-medium truncate">{f.district || "జిల్లా"}, {stateFullName(f.state, te)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span>📱</span>
                      <span className="font-medium text-slate-500 font-mono">
                        {f.phone ? `••••••${f.phone.slice(-4)}` : "WhatsApp నంబర్"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 border-t border-slate-100 pt-3 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>100% ఉచిత నమోదు & ప్రొఫైల్ ఐడీ</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>10,000+ సంబంధాల శోధన అందుబాటు</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>24/7 హెల్ప్‌లైన్: +91 6304996088</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ============================================================== */
          /* 🌟 MODE 2: 5-STEP COMPREHENSIVE REGISTRATION                   */
          /* ============================================================== */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
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
                  <button
                    type="button"
                    onClick={() => executeSubmit(true)}
                    className="text-xs font-bold text-maroon bg-amber-50 px-3 py-1 rounded-full border border-gold/30 hover:bg-gold/20"
                  >
                    ⚡ ఇప్పుడే సబ్మిట్ చేయండి
                  </button>
                </div>

                {/* ---------------- STEP 1: BASIC DETAILS ---------------- */}
                {step === 1 && (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[13px] font-bold text-slate-800">
                        ఎవరి కోసం ప్రొఫైల్ నమోదు చేస్తున్నారు? <span className="text-rose-600 font-black">*</span>
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { v: "Bride", l: "👰 వధువు (Bride)" },
                          { v: "Groom", l: "🤵 వరుడు (Groom)" },
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
                      placeholder="ఉదా: Sai Divya / Ramesh Reddy"
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <TextField
                        label="పుట్టిన తేదీ (Date of Birth)"
                        value={f.dob}
                        onChange={(v) => set("dob", v)}
                        required
                        type="date"
                      />
                      <TextField
                        label="వయసు (Age)"
                        value={f.age}
                        onChange={(v) => set("age", v)}
                        required
                        type="number"
                        disabled
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-800">ఎత్తు (Height) *</label>
                        <select
                          value={f.height || "5'5\""}
                          onChange={(e) => set("height", e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium"
                        >
                          <option value="">Select your height</option>
                          {HEIGHTS.map((h) => (
                            <option key={h} value={h}>
                              {heightLabel(h)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-800">వైవాహిక స్థితి (Marital Status) *</label>
                        <select
                          value={f.marital_status || "Pelli Kaledu"}
                          onChange={(e) => set("marital_status", e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium"
                        >
                          <option value="Pelli Kaledu">పెళ్లి కాలేదు (Never Married)</option>
                          <option value="Divorced">విడాకులు (Divorced)</option>
                          <option value={f.gender === "Groom" ? "Widower" : "Widow"}>
                            {f.gender === "Groom" ? "భార్య చనిపోయారు (Widower)" : "వితంతువు (Widow)"}
                          </option>
                          <option value="Awaiting Divorce">విడాకుల నిరీక్షణ (Awaiting Divorce)</option>
                        </select>
                      </div>
                    </div>

                    {f.marital_status !== "Pelli Kaledu" && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-800">పిల్లలు (Children) *</label>
                        <select
                          value={f.children || "None"}
                          onChange={(e) => set("children", e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium"
                        >
                          {CHILDREN_OPTIONS.map((co) => (
                            <option key={co} value={co}>
                              {co === "None" ? "పిల్లలు లేరు (None)" : `${co} పిల్లలు (${co} Children)`}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-800">మతం (Religion)</label>
                      <select
                        value={f.religion || "Hindu"}
                        onChange={(e) => set("religion", e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium"
                      >
                        <option value="">Select religion</option>
                        {RELIGIONS.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-800">శారీరక స్థితి (Physical Status)</label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { v: "Normal", l: "సాధారణం (Normal)" },
                          { v: "Physically Challenged", l: "దివ్యాంగులు (Physically challenged)" },
                        ].map((p) => (
                          <button
                            key={p.v}
                            type="button"
                            onClick={() => set("physical_status", p.v)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                              f.physical_status === p.v ? "bg-maroon text-white border-maroon" : "bg-white text-slate-700 border-slate-200"
                            }`}
                          >
                            {p.l}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* ---------------- STEP 2: CASTE & ASTROLOGY ---------------- */}
                {step === 2 && (
                  <div className="space-y-4">
                    <SearchSelect
                      label="కులం (Caste)"
                      options={casteOpts}
                      value={f.caste}
                      onChange={(v) => set("caste", v)}
                      required
                      teMap={CASTE_TELUGU}
                      placeholder="కులం ఎంచుకోండి…"
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <TextField
                        label="ఉపకులం (Sub-caste)"
                        value={f.sub_caste}
                        onChange={(v) => set("sub_caste", v)}
                        placeholder="ఉపకులం"
                      />
                      <TextField
                        label="గోత్రం (Gothram)"
                        value={f.gothram}
                        onChange={(v) => set("gothram", v)}
                        placeholder="గోత్రం"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-800">నక్షత్రం (Nakshatram)</label>
                        <select
                          value={f.star || ""}
                          onChange={(e) => set("star", e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium"
                        >
                          <option value="">నక్షత్రం ఎంచుకోండి</option>
                          {NAKSHATRAS.map((st) => (
                            <option key={st.en} value={st.en}>
                              ⭐ {st.te} ({st.en})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-800">రాశి (Rasi)</label>
                        <select
                          value={f.rasi || ""}
                          onChange={(e) => set("rasi", e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium"
                        >
                          <option value="">రాశి ఎంచుకోండి</option>
                          {RASIS.map((r) => (
                            <option key={r.en} value={r.en}>
                              {r.te} ({r.en})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* ---------------- STEP 3: CAREER & EDUCATION ---------------- */}
                {step === 3 && (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-800">విద్యార్హత (Education) *</label>
                      <select
                        value={f.education || "B.Tech / Graduate"}
                        onChange={(e) => set("education", e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium"
                      >
                        {EDUCATIONS.map((e) => (
                          <option key={e} value={e}>
                            {e}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-800">
                        త్వరిత ఎంపిక (Quick Job Select):
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { l: "🏡 Housewife (గృహిణి)", v: "Housewife / Homemaker (గృహిణి)", sal: "None / Not Applicable" },
                          { l: "💻 Software Engineer", v: "Software Engineer", sal: "₹10 - 15 Lakhs / year" },
                          { l: "🏛️ Govt Employee", v: "Govt Employee (Central / State)", sal: "₹7 - 10 Lakhs / year" },
                          { l: "🩺 Doctor", v: "Doctor / Physician", sal: "₹15 - 25 Lakhs / year" },
                          { l: "🎓 Teacher / Faculty", v: "Teacher / School Faculty", sal: "₹4 - 7 Lakhs / year" },
                          { l: "💼 Business Owner", v: "Business Owner / Entrepreneur", sal: "₹15 - 25 Lakhs / year" },
                          { l: "🌾 Farmer / Agri", v: "Farmer / Farm Owner", sal: "₹4 - 7 Lakhs / year" },
                          { l: "🏢 Private Job", v: "Private Sector Professional", sal: "₹7 - 10 Lakhs / year" },
                        ].map((qj) => (
                          <button
                            key={qj.v}
                            type="button"
                            onClick={() => {
                              set("job", qj.v);
                              if (qj.sal && (f.salary === "₹7 - 10 Lakhs / year" || !f.salary || qj.v.includes("Housewife"))) {
                                set("salary", qj.sal);
                              }
                            }}
                            className={`px-2.5 py-1 rounded-full text-xs font-bold transition border ${
                              f.job === qj.v
                                ? "bg-[#7A0C2E] text-white border-[#7A0C2E] shadow-xs"
                                : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                            }`}
                          >
                            {qj.l}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <TextField
                        label="ఉద్యోగం / హోదా (Job Title)"
                        value={f.job}
                        onChange={(v) => set("job", v)}
                        required
                        placeholder="ఉదా: Software Engineer, Housewife, Teacher…"
                      />
                      <TextField
                        label="కంపెనీ / ఆఫీస్ (Company Name - Optional)"
                        value={f.company}
                        onChange={(v) => set("company", v)}
                        placeholder="ఉదా: TCS, MNC, Govt, Self…"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-800">వార్షిక వేతనం (Salary) *</label>
                      <select
                        value={f.salary || "₹7 - 10 Lakhs / year"}
                        onChange={(e) => set("salary", e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium"
                      >
                        <option value="None / Not Applicable">None / Not Applicable (గృహిణి / Not Working)</option>
                        {SALARIES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* ---------------- STEP 4: LOCATION & FAMILY ---------------- */}
                {step === 4 && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-800">రాష్ట్రం (State) *</label>
                        <select
                          value={f.state || "TS"}
                          onChange={(e) => {
                            set("state", e.target.value);
                            set("district", "");
                          }}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium"
                        >
                          <option value="TS">తెలంగాణ (Telangana)</option>
                          <option value="AP">ఆంధ్రప్రదేశ్ (Andhra Pradesh)</option>
                          <option value="KA">కర్ణాటక (Karnataka)</option>
                          <option value="MH">మహారాష్ట్ర (Maharashtra)</option>
                          <option value="Other">ఇతర రాష్ట్రం / NRI</option>
                        </select>
                      </div>

                      <SearchSelect
                        label="జిల్లా (District)"
                        options={DISTRICTS_BY_STATE[f.state] || DISTRICTS_BY_STATE.TS}
                        value={f.district}
                        onChange={(v) => set("district", v)}
                        required
                        teMap={DISTRICT_TELUGU}
                        placeholder="జిల్లా ఎంచుకోండి…"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <TextField
                        label="10 అంకెల మొబైల్ (WhatsApp No)"
                        value={f.phone}
                        onChange={(v) => set("phone", v.replace(/\D/g, "").slice(0, 10))}
                        required
                        maxLength={10}
                        placeholder="9876543210"
                      />
                      <TextField
                        label="పాస్‌వర్డ్ (Password)"
                        value={f.password}
                        onChange={(v) => set("password", v)}
                        required
                        type="password"
                        placeholder="కనీసం 6 అక్షరాలు"
                      />
                    </div>
                  </div>
                )}

                {/* ---------------- STEP 5: PHOTO & FINISH ---------------- */}
                {step === 5 && (
                  <div className="space-y-4">
                    <TextField
                      label="ఫోటో URL (Photo Link - Optional)"
                      value={photoUrl}
                      onChange={(v) => {
                        setPhotoUrl(v);
                        setPhotoPreview(v);
                      }}
                      placeholder="https://..."
                      hint="ఫోటో తర్వాత కూడా అప్‌లోడ్ చేసుకోవచ్చు"
                    />

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-800">కుటుంబ స్థితి (Family Status)</label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { v: "Middle Class", te: "మిడిల్ క్లాస్ (Middle Class)" },
                          { v: "Upper Middle Class", te: "అప్పర్ మిడిల్ క్లాస్ (Upper Middle Class)" },
                          { v: "Rich / Affluent (Elite)", te: "ధనిక / ఎలైట్ (Rich / Affluent (Elite))" },
                        ].map((fs) => (
                          <button
                            key={fs.v}
                            type="button"
                            onClick={() => set("family_status", fs.v)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                              f.family_status === fs.v ? "bg-maroon text-white border-maroon" : "bg-white text-slate-700 border-slate-200"
                            }`}
                          >
                            {fs.te}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                        <span>నా గురించి (About Myself)</span>
                        <span className="text-[11px] text-slate-500 font-normal">
                          Minimum 50 characters • కనీసం 50 అక్షరాలు (minimum 50 characters)
                        </span>
                      </label>
                      <textarea
                        rows={3}
                        value={f.about_myself || ""}
                        onChange={(e) => set("about_myself", e.target.value)}
                        placeholder="మీ కుటుంబం, వ్యక్తిత్వం మరియు అంచనాల గురించి రాయండి… (ఫోన్ నంబర్లు [6-9] లేదా ఈమెయిల్ ఇక్కడ పెట్టకండి — గోప్యతా రక్షణ)"
                        className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-900 font-medium focus:outline-none focus:border-maroon telugu"
                      />
                      <div className="text-[11px] text-slate-500">
                        {String(f.about_myself || "").length} అక్షరాలు (కనీసం 50 అక్షరాలు ఉండాలి • ఫోన్ నంబర్లు [6-9] పెట్టకండి)
                      </div>
                    </div>
                  </div>
                )}

                {/* Wizard Bottom Buttons */}
                <div className="border-t border-slate-100 pt-4 flex items-center justify-between gap-3">
                  {step > 1 ? (
                    <button
                      type="button"
                      onClick={back}
                      className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition"
                    >
                      ← వెనుకకు
                    </button>
                  ) : <div />}

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => executeSubmit(true)}
                      className="px-4 py-2.5 rounded-xl bg-amber-50 border border-gold/40 text-maroon text-xs font-bold hover:bg-gold/20 transition"
                    >
                      ⚡ ఇప్పుడే సబ్మిట్ చేయండి
                    </button>

                    {step < 5 ? (
                      <button
                        type="button"
                        onClick={next}
                        className="px-6 py-2.5 rounded-xl maroon-gradient text-white text-xs font-black shadow-md hover:brightness-105 transition"
                      >
                        ముందుకు →
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => executeSubmit(false)}
                        disabled={busy}
                        className="px-6 py-2.5 rounded-xl gold-gradient text-maroon text-xs font-black shadow-gold hover:brightness-105 transition disabled:opacity-50"
                      >
                        {busy ? "నమోదు…" : "🎉 నమోదు పూర్తి చేయండి"}
                      </button>
                    )}
                  </div>
                </div>

              </div>
            </div>

            {/* Desktop Preview Column */}
            <div className="hidden lg:block lg:col-span-4 sticky top-28 space-y-4">
              <div className="bg-white rounded-3xl border border-gold/40 shadow-lg p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-black text-maroon flex items-center gap-1.5">
                    <span>✨</span>
                    <span>లైవ్ కార్డ్ నమూనా (Live Preview)</span>
                  </span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                    100% Verified
                  </span>
                </div>

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
                        {f.district || "జిల్లా"}, {stateFullName(f.state, te)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 border-t border-slate-100 pt-3 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>100% ఉచిత రిజిస్ట్రేషన్ & మ్యాచ్‌ల వీక్షణ</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>24/7 హెల్ప్‌లైన్: +91 6304996088</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}

/* R14 FIX: Wizard లో useSearchParams() (రెఫరల్ కోడ్ చదవడానికి) వాడటం వల్ల
 * Next.js ఈ subtree ని static/SSR పేజ్ shell లో render చేయకుండా, ఈ Suspense
 * fallback నే HTML గా పంపిస్తుంది — అంటే JS లేని crawler/browser కి గతంలో ఖాళీ
 * spinner తప్ప నిజమైన content ఏమీ కనిపించేది కాదు (SEO/no-JS గ్యాప్).
 * ఇప్పుడు fallback లో నిజమైన heading + benefits + phone/WhatsApp CTA పెట్టాం,
 * Wizard లాజిక్ ఏమీ మార్చకుండానే — hydrate అయ్యాక వెంటనే అసలు ఫారమ్ కనిపిస్తుంది. */
function RegisterFallback() {
  return (
    <div className="min-h-dvh bg-[#FAF7F2] px-4 py-10">
      <div className="mx-auto max-w-lg text-center">
        <h1 className="text-xl font-extrabold text-maroon">
          మన వివాహలో ఉచిత రిజిస్ట్రేషన్ (Register FREE)
        </h1>
        <p className="mt-2 text-sm text-slate-700">
          1 నిమిషంలో ఉచిత రిజిస్ట్రేషన్ చేసుకోండి — DOB verified, photo-private
          profiles, మొదటి 3 ఇంట్రెస్ట్ రిక్వెస్ట్స్ FREE.
        </p>
        <ul className="mt-4 space-y-1.5 text-left text-[13px] text-slate-600 mx-auto max-w-sm">
          <li>✅ ఉచితంగా ప్రొఫైల్ క్రియేట్ చేసుకోండి</li>
          <li>✅ మీ ఫోటో ప్రైవేట్‌గా ఉంటుంది (verified users కి మాత్రమే కనిపిస్తుంది)</li>
          <li>✅ DOB &amp; ID verification తో నమ్మకమైన ప్రొఫైల్స్</li>
        </ul>
        <div className="mt-6 w-10 h-10 border-4 border-maroon border-t-transparent rounded-full animate-spin mx-auto" aria-hidden="true" />
        <p className="mt-2 text-xs font-bold text-maroon">రిజిస్ట్రేషన్ ఫారమ్ లోడ్ అవుతోంది…</p>
        <p className="mt-4 text-xs text-slate-500">
          ఫారమ్ కనిపించకపోతే, నేరుగా కాల్/WhatsApp చేయండి:{" "}
          <a href="tel:+916304996088" className="font-bold text-maroon underline">
            +91 6304996088
          </a>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<RegisterFallback />}>
      <Wizard />
    </Suspense>
  );
}
