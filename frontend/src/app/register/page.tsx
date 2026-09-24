"use client";

/**
 * SHUBHALAGNAM — SMART MATRIMONY REGISTRATION (v4)
 * =================================================
 * • Categorized & Comprehensive Education (B.Tech, MBBS, MD, MS Abroad, MBA, CA...)
 * • Work Type & Profession Sector placed PROMINENTLY at top of Career step
 * • Granular ₹1L, ₹2L, ₹3L... ₹1Cr+ Salary Brackets with Telugu + English
 * • All Top NRI Countries (USA, UK, Australia, Canada, Germany, UAE, Singapore, etc.)
 * • Dynamic 33 Telangana + 26 Andhra Pradesh District Selectors
 * • 27 Vedic Nakshatras & 12 Rasis with Star-to-Rasi Auto-Selection
 * • Tap-friendly pill selectors, client-side photo compression & draft auto-save
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
  BLOOD_GROUPS, BODY_TYPES, CASTES, CASTE_SUBCASTES, CASTE_TELUGU, CHILDREN_OPTIONS, COMPLEXIONS,
  DISTRICTS_BY_STATE, DISTRICT_TELUGU, EDUCATIONS, EDUCATION_CATEGORIES, EDUCATION_TELUGU,
  FAMILY_STATUSES, FAMILY_TYPES, FAMILY_VALUES, HEIGHTS, JOBS, MARITAL_STATUSES, MOTHER_TONGUES,
  NAKSHATRAS, NAK_TO_RASI, NRI_COUNTRIES, OCCUPATIONS, OTHER_INDIAN_STATES, OTHER_LOCATIONS,
  PHYSICAL_STATUS, RASIS, RELIGIONS, SALARIES, SALARIES_DETAILED, SALARY_TELUGU,
  TS_DISTRICTS_DETAILED, AP_DISTRICTS_DETAILED, WORK_TYPES, WORK_TYPES_DETAILED, WORK_TYPE_TELUGU,
  ageFromDob, compressImage, heightLabel, maxDobFor18,
} from "@/lib/telugu-data";

const DRAFT_KEY = "shubhalagnam_reg_draft_v4";
const STEPS = [
  { n: 1, label: "Basic Details", labelTe: "ప్రాథమిక వివరాలు", icon: "🙋", hint: "మీ basic details & age", hintEn: "Your basic details & age" },
  { n: 2, label: "Caste & Astrology", labelTe: "కులం & జ్యోతిషం", icon: "💍", hint: "కులం, నక్షత్రం, రాశి & గోత్రం", hintEn: "Caste, Nakshatram, Rasi & Gothram" },
  { n: 3, label: "Career & Education", labelTe: "ఉద్యోగం & విద్య", icon: "💼", hint: "వృత్తి రంగం, చదువు & వేతనం", hintEn: "Work sector, Education & Salary" },
  { n: 4, label: "Location & Family", labelTe: "ప్రాంతం & కుటుంబం", icon: "📍", hint: "జిల్లా/దేశం, కుటుంబ వివరాలు & ఫోన్", hintEn: "District/Country, Family & Phone" },
  { n: 5, label: "Photo & Finish", labelTe: "ఫోటో & పూర్తి", icon: "📸", hint: "ఫోటో అప్‌లోడ్ & ప్రొఫైల్ సృష్టి", hintEn: "Photo upload & profile finish" },
];

function prettyChannel(raw: string): string {
  let s = String(raw || "").replace(/^@/, "")
    .replace(/^(shubhalagnam|manavivaha|tsap)_/i, "").replace(/_/g, " ")
    .replace(/\d+$/, "").trim().toLowerCase();
  const special: Record<string, string> = {
    tsbride: "TS Brides (Telangana)", tsgroom: "TS Grooms (Telangana)",
    apbride: "AP Brides", apgroom: "AP Grooms",
    matrimony: "Main Channel", hindu: "Hindu Community",
    nri: "NRI / Global (USA/UK/AUS/UAE)", second: "Second Marriage", able: "Differently Abled",
    govt: "Govt Jobs", software: "Software / IT", professionals: "Doctors & Teachers",
    success: "Success Stories", alerts: "Safety Alerts", "35plus": "Age 35+",
    interfaith: "Interfaith", "other religions": "Other Religions",
    "others sc": "SC Community", "others bc": "BC Community", "others st": "ST Community",
  };
  if (special[s]) return special[s];
  s = s.replace(/\bts\b/g, "TS").replace(/\bap\b/g, "AP")
    .replace(/\bbride\b/g, "Brides").replace(/\bgroom\b/g, "Grooms");
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

const DEFAULT_FORM: Record<string, any> = {
  gender: "", full_name: "", dob: "", birth_time: "", age: "", height: "",
  marital_status: "Pelli Kaledu", children: "", religion: "Hindu", mother_tongue: "Telugu",
  caste: "", sub_caste: "", gothram: "", star: "", rasi: "", moola_nakshatram: "No", dosham: "No",
  work_type: "Software / IT / Tech", education: "B.Tech / B.E.", education_detail: "", job: "Software Engineer",
  company: "", salary: "₹10 - 12 Lakhs / year", experience: "3 years", work_location: "",
  father_name: "", father_occupation: "", mother_name: "", mother_occupation: "",
  brothers: "0", brothers_married: "0", sisters: "0", sisters_married: "0",
  family_type: "Nuclear", family_status: "Middle Class", family_values: "Traditional",
  native_place: "", state: "TS", district: "", nri_country: "", mandal: "", current_city: "", country: "India", pincode: "",
  phone: "", email: "", password: "", photo_private: true, about_myself: "",
  expectations: "", exp_age_min: "", exp_age_max: "", exp_job: "", exp_location: "", exp_caste: "",
  physical_status: "Normal", body_type: "Average", complexion: "Fair", blood_group: "",
  referral_code: "", consent: false,
};

/* ---------------- UI Helpers ---------------- */
function Chip({ on, gold, children, onClick }: { on?: boolean; gold?: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`chip ${on ? (gold ? "chip-on-gold" : "chip-on") : ""}`}>
      {children}
    </button>
  );
}

function ChipGroup({
  label, options, value, onChange, required, searchable, te, hint, cols,
}: {
  label: React.ReactNode; options: { v: string; te?: string }[]; value: string; onChange: (v: string) => void;
  required?: boolean; searchable?: boolean; te?: boolean; hint?: string; cols?: number;
}) {
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return options;
    return options.filter((o) => o.v.toLowerCase().includes(needle) || (o.te || "").includes(q.trim()));
  }, [q, options]);
  return (
    <div>
      <label className="text-[13px] font-bold text-ink">
        {label} {required ? <span className="req-star">*</span> : <span className="text-[10px] text-gray-400">(optional)</span>}
      </label>
      {hint && <div className="hint">{hint}</div>}
      {searchable && (
        <input
          value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔍 టైప్ చేసి వెతకండి / Type to search…"
          className="input-mobile mt-2" inputMode="search"
        />
      )}
      <div className={`mt-2 flex flex-wrap gap-2 ${cols === 1 ? "flex-col" : ""}`}>
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
  label, options, value, onChange, required, hint, placeholder, teMap,
}: {
  label: React.ReactNode; options: string[]; value: string; onChange: (v: string) => void;
  required?: boolean; hint?: string; placeholder?: string; teMap?: Record<string, string>;
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
    <div ref={boxRef} className="relative">
      <label className="text-[13px] font-bold text-ink">
        {label} {required ? <span className="req-star">*</span> : <span className="text-[10px] text-gray-400">(optional)</span>}
      </label>
      {hint && <div className="hint">{hint}</div>}
      <button type="button" onClick={() => setOpen((v) => !v)}
        className={`input-mobile mt-1 flex items-center justify-between text-left ${value ? "text-ink font-semibold" : "text-gray-400"}`}>
        <span className="truncate">
          {value ? (teMap?.[value] ? <span><b className="text-maroon telugu">{teMap[value]}</b> <span className="text-gray-600 font-normal text-xs ml-1">({value})</span></span> : value) : (placeholder || "Select…")}
        </span>
        <span className="text-maroon text-lg shrink-0 ml-2">{open ? "▲" : "⌄"}</span>
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-gold/40 rounded-2xl shadow-xl overflow-hidden">
          <input
            autoFocus value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="🔍 Type to search / వెతకండి…"
            className="w-full px-4 py-3 border-b border-gold/20 outline-none text-[14px]"
          />
          <div className="max-h-64 overflow-y-auto">
            {value && (
              <button type="button" onClick={() => { onChange(""); setOpen(false); setQ(""); }}
                className="w-full text-left px-4 py-2.5 text-[13px] text-rose-600 hover:bg-rose-50 border-b border-gray-100">
                ✕ Clear selection
              </button>
            )}
            {list.slice(0, 200).map((o) => (
              <button key={o} type="button" onClick={() => { onChange(o); setOpen(false); setQ(""); }}
                className={`w-full text-left px-4 py-2.5 text-[14px] hover:bg-cream transition ${value === o ? "bg-maroon-soft font-bold text-maroon" : "text-ink"}`}>
                {teMap?.[o] ? (
                  <div className="flex items-center justify-between w-full">
                    <span className="font-bold text-maroon telugu text-[14px]">{teMap[o]}</span>
                    <span className="text-gray-500 text-[12px] font-semibold">({o})</span>
                  </div>
                ) : (
                  <span>{o}</span>
                )}
              </button>
            ))}
            {list.length === 0 && (
              <div className="px-4 py-3 text-[12px] text-gray-500">
                దొరకలేదు — <button type="button" onClick={() => { onChange(q.trim()); setOpen(false); }} className="text-maroon font-bold underline">“{q}” ని అలానే ఉంచు</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function TextField({
  label, value, onChange, placeholder, required, hint, type = "text", inputMode, max, optional, telugu,
}: {
  label: React.ReactNode; value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean;
  hint?: string; type?: string; inputMode?: "text" | "tel" | "numeric" | "email" | "decimal";
  max?: string; optional?: boolean; telugu?: boolean;
}) {
  const invalid = required && !String(value || "").trim();
  return (
    <div>
      <label className="text-[13px] font-bold text-ink">
        {label} {required ? <span className="req-star">*</span> : (optional ? <span className="text-[10px] text-gray-400">(optional)</span> : null)}
      </label>
      <input
        type={type} inputMode={inputMode} max={max} value={value} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={invalid ? "true" : "false"}
        className={`input-mobile mt-1 ${telugu ? "telugu" : ""}`}
      />
      {hint && <div className="hint">{hint}</div>}
    </div>
  );
}

function PillGroup({
  label, options, value, onChange, required, hint,
}: {
  label: React.ReactNode; options: { v: string; en: string; te: string }[];
  value: string; onChange: (v: string) => void; required?: boolean; hint?: string;
}) {
  return (
    <div>
      <div className="text-[13px] font-extrabold text-ink">
        {label} {required ? <span className="req-star">*</span> : null}
      </div>
      {hint && <div className="hint">{hint}</div>}
      <div className="mt-2 grid grid-cols-2 gap-2.5" role="radiogroup">
        {options.map((o) => {
          const on = value === o.v;
          return (
            <button key={o.v} type="button" role="radio" aria-checked={on} onClick={() => onChange(o.v)}
              className={`rounded-2xl border-[1.5px] px-3.5 py-2.5 text-[13px] text-left transition-all active:scale-[0.98] ${
                on ? "maroon-gradient text-white border-transparent shadow-brand font-bold"
                   : "border-gray-200 bg-white text-ink font-medium hover:border-maroon/50"}`}>
              <div className="font-semibold">{o.en}</div>
              <div className={`text-[11px] ${on ? "text-white/90" : "text-gray-500"} telugu`}>{o.te}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SelectField({
  label, value, onChange, required, hint, placeholder, children,
}: {
  label: React.ReactNode; value: string; onChange: (v: string) => void;
  required?: boolean; hint?: string; placeholder?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-[13px] font-extrabold text-ink">
        {label} {required ? <span className="req-star">*</span> : null}
      </div>
      {hint && <div className="hint">{hint}</div>}
      <div className="relative mt-1">
        <select value={value} onChange={(e) => onChange(e.target.value)}
          className={`input-mobile appearance-none pr-10 font-medium ${value ? "text-ink" : "text-gray-400"}`}>
          <option value="">{placeholder || "Select…"}</option>
          {children}
        </select>
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-maroon text-lg">⌄</span>
      </div>
    </div>
  );
}

function Stepper({ label, value, onChange, max = 10 }: { label: string; value: string; onChange: (v: string) => void; max?: number }) {
  const n = parseInt(value || "0", 10) || 0;
  return (
    <div className="flex items-center justify-between gap-2 bg-white rounded-2xl border border-gold/30 px-3 py-2">
      <span className="text-[13px] font-bold text-ink min-w-0 truncate">{label}</span>
      <div className="flex items-center gap-2 shrink-0">
        <button type="button" onClick={() => onChange(String(Math.max(0, n - 1)))}
          className="w-10 h-10 rounded-full maroon-gradient text-white text-xl font-bold leading-none shrink-0">−</button>
        <span className="w-6 text-center font-bold text-maroon shrink-0">{n}</span>
        <button type="button" onClick={() => onChange(String(Math.min(max, n + 1)))}
          className="w-10 h-10 rounded-full gold-gradient text-maroon text-xl font-bold leading-none shrink-0">+</button>
      </div>
    </div>
  );
}

function Toggle({ label, sub, value, onChange }: { label: string; sub?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!value)}
      className="w-full flex items-center gap-3 bg-white rounded-2xl border border-gold/30 p-3 text-left">
      <span className={`w-14 h-8 rounded-full p-1 transition ${value ? "bg-maroon" : "bg-gray-300"}`}>
        <span className={`block w-6 h-6 bg-white rounded-full transition ${value ? "translate-x-6" : ""}`} />
      </span>
      <span className="min-w-0">
        <span className="block text-[13px] font-bold text-ink">{label}</span>
        {sub && <span className="block text-[11px] text-gray-500">{sub}</span>}
      </span>
    </button>
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
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [otpMsg, setOtpMsg] = useState("");
  const [phoneOk, setPhoneOk] = useState(false);
  const [refLocked, setRefLocked] = useState("");
  const [refInfo, setRefInfo] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
  const [packResend, setPackResend] = useState<{ busy: boolean; msg: string }>({ busy: false, msg: "" });
  const [clarity, setClarity] = useState<any>(null);
  const [copied, setCopied] = useState("");
  const topRef = useRef<HTMLDivElement>(null);
  const voiceRef = useRef<any>(null);

  const [casteOpts, setCasteOpts] = useState<string[]>(CASTES);
  useEffect(() => {
    let live = true;
    fetch(`/api/meta/castes?religion=${encodeURIComponent(f.religion || "Hindu")}`)
      .then((r) => r.json()).then((d) => {
        if (live && d?.success && Array.isArray(d.castes) && d.castes.length) {
          setCasteOpts(d.castes);
          if (f.caste && !d.castes.includes(f.caste)) set("caste", "");
        }
      }).catch(() => setCasteOpts(CASTES));
    return () => { live = false; };
  }, [f.religion]);

  const set = (k: string, v: any) => {
    setF((prev) => ({ ...prev, [k]: v }));
    setErrs([]);
  };

  useEffect(() => {
    fetch("/api/free-plan").then((r) => r.json()).then(setClarity).catch(() => { });
  }, []);

  useEffect(() => {
    let ref = (params?.get("ref") || "").trim().toUpperCase();
    try {
      if (!ref) ref = (localStorage.getItem("tsap_ref_from_link") || localStorage.getItem("shubhalagnam_ref_from_link") || "").trim().toUpperCase();
      else {
        localStorage.setItem("tsap_ref_from_link", ref);
        localStorage.setItem("shubhalagnam_ref_from_link", ref);
      }
    } catch { /* ignore */ }
    if (!ref) return;
    setRefLocked(ref);
    setF((prev) => ({ ...prev, referral_code: ref }));
    try {
      if (sessionStorage.getItem("tsap_click_fired") === ref || sessionStorage.getItem("shubhalagnam_click_fired") === ref) {
        fetch(`/api/referral/validate/${encodeURIComponent(ref)}`).then((r) => r.json())
          .then((d) => { if (d?.ok) setRefInfo(d); }).catch(() => { });
        return;
      }
      sessionStorage.setItem("tsap_click_fired", ref);
      sessionStorage.setItem("shubhalagnam_click_fired", ref);
    } catch { /* ignore */ }
    fetch(`/api/referral/click/${encodeURIComponent(ref)}?source=register_direct`, { method: "POST" })
      .then((r) => r.json())
      .then((d) => {
        if (d?.valid_code && d?.referrer_name) setRefInfo({ ok: true, referrer_name: d.referrer_name, bonus_credits: d.bonus_credits });
      }).catch(() => { });
  }, [params]);

  useEffect(() => {
    const code = (f.referral_code || "").trim().toUpperCase();
    if (!code || code === refLocked) return;
    const t = setTimeout(() => {
      fetch(`/api/referral/validate/${encodeURIComponent(code)}`).then((r) => r.json())
        .then((d) => {
          if (d?.ok) {
            setRefLocked(code);
            setRefInfo(d);
            try {
              localStorage.setItem("tsap_ref_from_link", code);
              localStorage.setItem("shubhalagnam_ref_from_link", code);
            } catch { /* ignore */ }
          }
          else setRefInfo({ ok: false, message_telugu: d?.message_telugu });
        }).catch(() => { });
    }, 600);
    return () => clearTimeout(t);
  }, [f.referral_code]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (d?.data && (d.data.full_name || d.data.phone)) {
        setDraftFound(true);
        setSavedAt(d.savedAt || "");
      }
    } catch { /* ignore */ }
  }, []);

  const resumeDraft = () => {
    try {
      const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || "{}");
      setF({ ...DEFAULT_FORM, ...(d.data || {}) });
      setStep(Math.min(5, Math.max(1, d.step || 1)));
      setDraftFound(false);
    } catch { /* ignore */ }
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
      } catch { /* ignore */ }
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
        e.push(T("పిల్లల సంఖ్య ఎంచుకోండి / Number of children select చెయ్యండి", "Number of children select చెయ్యండి"));
      }
    }
    if (s === 2) {
      if (!f.caste) e.push(T("కులం ఎంచుకోండి (Select caste)", "Select caste"));
    }
    if (s === 3) {
      if (!f.work_type) e.push(T("వృత్తి / ఉద్యోగ రంగం ఎంచుకోండి (Select Work Type / Sector)", "Select Work Type / Sector"));
      if (!f.education) e.push(T("విద్యార్హత ఎంచుకోండి (Select education)", "Select education"));
      if (!f.job) e.push(T("ఉద్యోగం / హోదా ఎంచుకోండి (Select occupation)", "Select occupation"));
      if (!f.salary) e.push(T("వార్షిక వేతనం ఎంచుకోండి (Select annual salary range)", "Select annual salary range"));
    }
    if (s === 4) {
      if (!f.state) e.push(T("రాష్ట్రం / ప్రాంతం ఎంచుకోండి (Select state)", "Select state"));
      if (!f.district) e.push(T("జిల్లా / దేశం ఎంచుకోండి (Select district / location)", "Select district / location"));
      if (!/^\d{10}$/.test(String(f.phone))) e.push(T("10 అంకెల మొబైల్ నంబర్ ఇవ్వండి (Enter 10-digit mobile number)", "Enter a 10-digit mobile number"));
      if (String(f.password || "").length < 6) e.push(T("🔑 Password minimum 6 characters పెట్టండి (Password minimum 6 characters)", "Password minimum 6 characters"));
    }
    if (s === 5) {
      const _ab = String(f.about_myself || "").trim();
      if (_ab.length < 50) e.push(T("మీ గురించి కనీసం 50 అక్షరాలు రాయండి (About yourself — minimum 50 characters)", "About yourself — minimum 50 characters"));
      else if (/[6-9]\d{9}|@\S+\.\S+/.test(_ab)) e.push(T("🔒 గోప్యత కోసం About లో ఫోన్ నంబర్ / ఈమెయిల్ పెట్టకండి", "🔒 Don't enter phone number or email in About section"));
      if (!f.consent) e.push(T("నిబంధనలను అంగీకరించండి (Accept Terms & Privacy below)", "Accept Terms & Privacy below"));
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
    const keys = ["full_name", "gender", "dob", "height", "marital_status", "caste", "sub_caste",
      "gothram", "star", "rasi", "education", "education_detail", "job", "company", "salary",
      "experience", "work_type", "work_location", "father_name", "father_occupation", "mother_name",
      "native_place", "state", "district", "mandal", "current_city", "pincode", "phone", "about_myself",
      "body_type", "complexion", "blood_group"];
    const filled = keys.filter((k) => String(f[k] || "").trim()).length + (photoUrl ? 2 : 0);
    return Math.min(100, Math.round((filled / (keys.length + 2)) * 100));
  }, [f, photoUrl]);

  const pickPhoto = async (file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return setErrs([T("ఫోటో ఫైల్ మాత్రమే (JPG/PNG/WebP)", "Photo files only (JPG/PNG/WebP)")]);
    if (file.size > 8 * 1024 * 1024) return setErrs([T("ఫోటో చాలా పెద్దది (8MB+) — చిన్న ఫోటో అప్‌లోడ్ చేయండి", "Photo too large (8MB+) — upload a smaller photo")]);
    setBusy(true);
    const small = await compressImage(file, 1200, 0.85);
    setPhotoFile(small);
    setPhotoPreview(URL.createObjectURL(small));
    setPhotoInfo(`${(small.size / 1024).toFixed(0)} KB${small.size < file.size ? ` (${(file.size / 1024).toFixed(0)} KB → కంప్రెస్ అయ్యింది)` : ""} • అప్‌లోడ్ అవుతోంది…`);
    try {
      const fd = new FormData();
      fd.append("file", small);
      const r = await fetch("/api/photo/upload", { method: "POST", body: fd });
      const d = await r.json();
      if (r.ok) {
        setPhotoUrl(d.url);
        setPhotoInfo(`${d.kb} KB ✅ ఫోటో విజయవంతంగా అప్‌లోడ్ అయ్యింది`);
      } else {
        const det: any = d?.detail;
        setPhotoInfo("");
        setErrs([det?.message_telugu || det?.te || det?.en ||
                 (typeof d?.detail === "string" ? d.detail : "") ||
                 T("ఫోటో అప్‌లోడ్ అవ్వలేదు — స్పష్టమైన ఫోటోతో మళ్లీ ప్రయత్నించండి", "Photo upload failed — retry with clear photo")]);
      }
    } catch {
      setErrs([T("నెట్‌వర్క్ సమస్య — ఫోటో మళ్లీ అప్‌లోడ్ చేయండి", "Network issue — please retry photo upload")]);
    }
    setBusy(false);
  };

  const sendOtp = async () => {
    if (!/^\d{10}$/.test(f.phone)) return setErrs([T("ముందుగా 10 అంకెల మొబైల్ నంబర్ ఇవ్వండి", "Enter 10-digit mobile number first")]);
    setBusy(true);
    try {
      const d = await fetch("/api/otp/send", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: f.phone }),
      }).then((r) => r.json());
      setOtpSent(true);
      setOtpMsg(d.message_telugu || T("OTP పంపించాం", "OTP sent successfully"));
      if (d.dev_code) setOtpCode(d.dev_code);
    } catch {
      setErrs([T("OTP పంపడం వీలుకాలేదు — మళ్లీ ప్రయత్నించండి", "Failed to send OTP — retry")]);
    }
    setBusy(false);
  };

  const verifyOtp = async () => {
    setBusy(true);
    try {
      const r = await fetch("/api/otp/verify", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: f.phone, code: otpCode }),
      });
      const d = await r.json();
      if (r.ok && d.success) {
        setPhoneOk(true);
        setOtpMsg(d.message_telugu || "ఫోన్ నంబర్ ధృవీకరించబడింది ✅");
      } else {
        setOtpMsg(d.message_telugu || "OTP తప్పుగా ఉంది");
      }
    } catch {
      setOtpMsg(T("ధృవీకరణ విఫలమైంది — మళ్లీ ప్రయత్నించండి", "Verification failed — retry"));
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

  const readableError = (d: any, te: boolean): string => {
    const fallback = te ? "నమోదు విఫలమైంది — ఫీల్డ్‌లు అన్నీ నింపి మళ్లీ ప్రయత్నించండి" : "Registration failed — please fill all fields and retry";
    const det = d?.detail;
    if (!det) return d?.message_telugu || d?.te || fallback;
    if (typeof det === "string") return det;
    if (Array.isArray(det)) {
      const fields = det.map((x: any) => x?.loc?.[x.loc.length - 1]).filter(Boolean);
      if (fields.length) {
        return te
          ? `ఈ వివరాలు సరిగ్గా ఇవ్వండి: ${fields.join(", ")}`
          : `Please check these fields: ${fields.join(", ")}`;
      }
      return det.map((x: any) => x?.msg).filter(Boolean).join(", ") || fallback;
    }
    if (typeof det === "object") return det.te || det.message_telugu || det.en || det.reason || fallback;
    return fallback;
  };

  const submit = async () => {
    const all = [1, 2, 3, 4, 5].flatMap(validate);
    if (all.length) {
      setErrs(all);
      setShake(true);
      setTimeout(() => setShake(false), 400);
      return;
    }
    setBusy(true);
    setErrs([]);
    try {
      const fd = new FormData();
      const strings = [
        "gender", "full_name", "dob", "birth_time", "height", "weight", "marital_status", "children", "religion",
        "mother_tongue", "caste", "sub_caste", "gothram", "star", "rasi", "moola_nakshatram", "dosham",
        "education", "education_detail", "college", "job", "company", "salary", "experience", "work_type",
        "work_location", "father_name", "father_occupation", "mother_name", "mother_occupation", "brothers",
        "brothers_married", "sisters", "sisters_married", "family_type", "family_status", "family_values",
        "native_place", "state", "district", "mandal", "current_city", "country", "pincode", "phone", "email", "password",
        "about_myself", "expectations", "exp_age_min", "exp_age_max", "exp_job", "exp_location", "exp_caste",
        "physical_status", "body_type", "complexion", "blood_group", "referral_code",
      ];
      strings.forEach((k) => fd.append(k, String(f[k] ?? "")));
      fd.append("age", String(f.age || ageFromDob(f.dob) || ""));
      fd.append("photo_private", String(!!f.photo_private));
      fd.append("dob_correct", "true");
      fd.append("phone_verified", String(phoneOk));
      if (photoUrl) fd.append("photo_url", photoUrl);
      if (refLocked) fd.append("referral_code", refLocked);

      const r = await fetch("/api/register", { method: "POST", body: fd });
      const d = await r.json();
      if (!r.ok) throw new Error(readableError(d, te));
      setResult(d);
      localStorage.removeItem(DRAFT_KEY);
      try {
        if (d?.auth_token) { localStorage.setItem("tsap_token", String(d.auth_token)); localStorage.setItem("tsap_id", String(d.tsap_id || "")); }
      } catch { /* private mode */ }
      try {
        const newId = d.tsap_id || d.user_id || "";
        if (newId) {
          localStorage.setItem("tsap_last_id", newId);
          const list = JSON.parse(localStorage.getItem("tsap_profiles") || "[]");
          localStorage.setItem("tsap_profiles", JSON.stringify(
            [{ id: newId, name: f.full_name, gender: f.gender, at: Date.now() },
              ...list.filter((p: any) => (p?.id || p?.tsap_id) !== newId)].slice(0, 5)));
        }
      } catch { /* private mode */ }
      scrollTop();
    } catch (e: any) {
      setErrs([e?.message || T("నమోదులో సమస్య ఏర్పడింది — దయచేసి మళ్లీ ప్రయత్నించండి", "Problem during registration — please retry")]);
    }
    setBusy(false);
  };

  const copy = (text: string, tag: string) => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(tag);
      setTimeout(() => setCopied(""), 1600);
    });
  };

  /* ================= SUCCESS SCREEN ================= */
  if (result) {
    const tsap = result.tsap_id || result.user_id || "";
    const cardUrl = tsap ? (result.card_url || `/cards/${tsap}.png`) : "";
    const share = result.share_text || `${SITE_CONFIG.brandName} profile ${tsap}`;
    return (
      <main className="min-h-screen">
        <section className="maroon-gradient text-white">
          <div className="max-w-3xl mx-auto px-4 py-9 text-center">
            <div className="text-5xl animate-bounce">🎉</div>
            <h1 className="mt-2 text-2xl font-bold">{T("ప్రొఫైల్ విజయవంతంగా సిద్ధమైంది!", "Profile Ready Successfully!")}</h1>
            <p className="text-[13px] opacity-90 mt-1 telugu">{T("మీ ప్రొఫైల్ ID & కార్డ్ కింద ఉన్నాయి. WhatsApp లో షేర్ చేయడం ద్వారా ఎక్కువ సంబంధాలు అందుకోవచ్చు.", "Your ID & Card are below. Share on WhatsApp status to get instant responses.")}</p>
            <div className="mt-4 inline-flex max-w-full flex-col items-center gap-1.5 bg-white/10 border border-gold/40 rounded-2xl px-4 sm:px-6 py-4 shadow-brandLg">
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">{T("మీ ప్రొఫైల్ ID", "Your Profile ID")}</span>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <span className="font-mono text-lg sm:text-2xl font-extrabold tracking-wide text-gold break-all">{tsap}</span>
                <button onClick={() => copy(tsap, "id")} className="shrink-0 text-[11px] font-bold gold-gradient text-maroon px-3 py-1.5 rounded-full">
                  {copied === "id" ? "✓" : "📋 కాపీ"}
                </button>
              </div>
              <span className="text-[10px] opacity-70 text-center">{T("ఈ ID తో ఎవరైనా మిమ్మల్ని నేరుగా వెతకవచ్చు", "Anyone can find your profile with this ID")}</span>
            </div>
          </div>
        </section>

        <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
          {result.publish_targets?.length ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
              <div className="font-bold text-emerald-900 text-[15px]">📢 {T("మీ ప్రొఫైల్ ఇక్కడ పోస్ట్ చేయబడుతుంది", "Your profile is posted here")}</div>
              <div className="text-[12px] text-emerald-800 mt-1 telugu">
                {T("మీ కులం & ప్రాంతం ప్రకారం ఈ ఛానళ్లలో మరియు WhatsApp లో మీ ప్రొఫైల్ పోస్ట్ అవుతుంది — రోజూ కొత్త సంబంధాలు చూడటానికి Join అవ్వండి:", "Based on your caste & region, your profile appears in these channels — join to see daily new matches:")}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {result.publish_targets.map((t: string) => (
                  <span key={t} className="inline-flex items-center rounded-full bg-white border border-emerald-300 text-emerald-900 font-bold text-[11px] px-2.5 py-1">📢 {prettyChannel(t)}</span>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <a href={SITE_CONFIG.officialChannelUrl} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#229ED9] text-white font-bold text-[12px] px-4 py-2.5 shadow-soft hover:brightness-110 active:scale-[0.97] transition">
                  <TelegramIcon className="w-4 h-4" mono />
                  {T("Telegram ఛానల్‌లో Join అవ్వండి", "Join Telegram Channel")}
                </a>
                {waLink("official") ? (
                  <a href={waLink("official")} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#25D366] text-white font-bold text-[12px] px-4 py-2.5 shadow-soft hover:brightness-110 active:scale-[0.97] transition">
                    <WhatsAppIcon className="w-4 h-4" mono />
                    {T("WhatsApp కమ్యూనిటీలో Join అవ్వండి", "Join WhatsApp Community")}
                  </a>
                ) : null}
              </div>
            </div>
          ) : null}

          <PhotoFlow tsapId={tsap} />

          <div className="bg-white rounded-2xl p-4 border border-gold/30 card-shadow">
            <div className="font-bold text-maroon text-[15px]">{T("🎁 మీ ఉచిత ఖాతా వివరాలు", "🎁 Your Free Matrimony Benefits")}</div>
            <div className="mt-2 grid sm:grid-cols-3 gap-2 text-[12px]">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-emerald-900">
                <b>{result.credits ?? 3} requests</b> ready<br /><span className="text-[11px]">(3 ఉచితం {result.referral?.joined_with?.ok ? "+ 1 రెఫరల్ బోనస్" : ""})</span>
              </div>
              <div className="bg-cream border border-gold/40 rounded-xl p-3 text-maroon">
                <b>3 Profiles</b> viewable<br /><span className="text-[11px]">numbers 🔒 locked — అంగీకరించాకే అన్‌లాక్</span>
              </div>
              <div className="bg-navy text-white rounded-xl p-3">
                <b>{T("ఫోన్ నంబర్లు ఎప్పుడు?", "Contact Numbers When?")}</b><br /><span className="text-[11px] opacity-90">{T("ఇంట్రెస్ట్ పంపి వాళ్లు అంగీకరించినప్పుడు", "When interest is sent and accepted")}</span>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href={`/matches?id=${tsap}`} className="maroon-gradient text-white font-bold text-[13px] px-5 py-2.5 rounded-xl shadow-brand">
                {T("🔎 సరిపోలే సంబంధాలు చూడండి (Matches)", "🔎 View Matching Profiles")}
              </Link>
              <Link href={`/requests?id=${tsap}`} className="border border-maroon/25 text-maroon font-bold text-[13px] px-4 py-2.5 rounded-xl">
                💌 ఇంట్రెస్ట్‌లు పంపండి
              </Link>
              <Link href="/pricing" className="gold-gradient text-maroon font-bold text-[13px] px-4 py-2.5 rounded-xl">
                💰 ₹99 Sambandham (ప్రీమియం ప్లాన్)
              </Link>
            </div>
          </div>

          {/* 🤝 Referral Card & Earnings Link */}
          {result?.referral && (
            <div className="bg-gradient-to-r from-emerald-500/10 via-amber-500/10 to-emerald-500/10 rounded-2xl p-4 border-2 border-emerald-400 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-emerald-950 text-sm">
                    🎁 మీ ప్రత్యేక రెఫరల్ కోడ్: <span className="font-mono text-base font-black text-emerald-700">{result.referral?.my_code}</span>
                  </h4>
                  <p className="text-xs text-emerald-800">
                    మీ కోడ్‌తో స్నేహితులు చేరితే వారికి +1 ఉచిత క్రెడిట్, వాళ్లు ప్లాన్ తీసుకుంటే మీకు ₹50 క్యాష్ రివార్డ్ లభిస్తుంది!
                  </p>
                </div>
                <Link
                  href={`/referral?id=${tsap}`}
                  className="px-3 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-xs hover:bg-emerald-700 shrink-0"
                >
                  Referral dashboard →
                </Link>
              </div>
              {result.referral?.poster_url && (
                <div className="pt-1 flex items-center gap-2">
                  <a href={result.referral.poster_url} target="_blank" rel="noreferrer" className="text-xs font-bold text-emerald-800 underline">
                    🖼️ మీ రెఫరల్ పోస్టర్ చూడండి
                  </a>
                </div>
              )}
            </div>
          )}

          {/* 🎴 Luxury Matrimonial Biodata Template Card */}
          <div className="bg-white rounded-3xl p-6 card-shadow border-2 border-gold/40 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-maroon block">
                  {T("అధికారిక వివాహ బయోడేటా టెంప్లేట్", "Official Wedding Biodata Template")}
                </span>
                <h3 className="font-black text-maroon text-lg">
                  🎴 {T("మీ డిజిటల్ ప్రొఫైల్ కార్డ్ & వివరాలు", "Your Digital Profile Card & Template")}
                </h3>
              </div>
              <span className="bg-amber-100 text-maroon border border-gold font-mono font-bold text-xs px-3 py-1 rounded-full">
                ID: {tsap}
              </span>
            </div>

            {/* Structured Biodata Template Preview */}
            <div className="bg-[#FFFDF9] rounded-2xl p-5 border border-gold/30 space-y-4">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                {photoUrl ? (
                  <img src={photoUrl} alt={f.full_name} className="w-24 h-28 rounded-2xl object-cover border-2 border-gold shadow-md shrink-0" />
                ) : (
                  <div className="w-24 h-28 rounded-2xl bg-amber-100/70 border-2 border-gold/40 flex flex-col items-center justify-center text-3xl shadow-inner shrink-0 text-maroon">
                    <span>{f.gender === "Groom" ? "🤵" : "👰"}</span>
                    <span className="text-[10px] font-bold text-slate-500 mt-1">Photo Locked</span>
                  </div>
                )}

                <div className="min-w-0 flex-1 text-center sm:text-left space-y-1">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <h4 className="font-black text-lg text-navy">{f.full_name}</h4>
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                      ✓ 100% {T("ధృవీకరించబడింది", "Verified")}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-maroon">
                    💍 {f.caste} {f.sub_caste ? `(${f.sub_caste})` : ""} • 🎂 {f.age || ageFromDob(f.dob)} yrs {f.height ? `• ${f.height}` : ""}
                  </p>
                  <p className="text-xs text-slate-700 font-medium">
                    🎓 {f.education} {f.education_detail ? `(${f.education_detail})` : ""} • 💼 {f.job}
                  </p>
                  <p className="text-xs text-slate-600 font-medium">
                    💰 {f.salary} • 📍 {f.district || f.native_place}, {f.state}
                  </p>
                </div>
              </div>

              {/* Astro & Family Highlights Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-3 border-t border-gold/20 text-xs">
                <div className="bg-white p-2.5 rounded-xl border border-gold/20">
                  <span className="text-[10px] text-slate-500 font-bold block">గోత్రం (Gothram)</span>
                  <span className="font-extrabold text-navy">{f.gothram || "—"}</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-gold/20">
                  <span className="text-[10px] text-slate-500 font-bold block">నక్షత్రం (Star)</span>
                  <span className="font-extrabold text-navy">⭐ {f.star || "—"}</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-gold/20">
                  <span className="text-[10px] text-slate-500 font-bold block">రాశి (Moon Sign)</span>
                  <span className="font-extrabold text-navy">{f.rasi || "—"}</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-gold/20">
                  <span className="text-[10px] text-slate-500 font-bold block">తండ్రి (Father)</span>
                  <span className="font-extrabold text-navy truncate block">{f.father_name || "—"}</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-gold/20">
                  <span className="text-[10px] text-slate-500 font-bold block">తల్లి (Mother)</span>
                  <span className="font-extrabold text-navy truncate block">{f.mother_name || "—"}</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-gold/20">
                  <span className="text-[10px] text-slate-500 font-bold block">కుటుంబ నేపథ్యం</span>
                  <span className="font-extrabold text-navy">{f.family_type} • {f.family_status}</span>
                </div>
              </div>
            </div>

            {/* Generated Image Card */}
            {cardUrl ? (
              <div className="pt-2">
                <span className="text-xs font-bold text-slate-600 mb-1.5 block">
                  🖼️ {T("వాట్సాప్ స్టేటస్ కార్డ్ (HD Image):", "WhatsApp Status Card (HD Image):")}
                </span>
                <img src={cardUrl} alt={`${tsap} profile card`} className="w-full rounded-2xl border-2 border-gold/40 shadow-sm" />
              </div>
            ) : null}

            {/* 1-Click Actions */}
            <div className="flex flex-wrap gap-2.5 pt-2">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`🙏 *శుభలగ్నం తెలుగు మ్యాట్రిమోనీ ప్రొఫైల్*\n🆔 *${tsap}* (${f.gender === "Groom" ? "🤵 వరుడు" : "👰 వధువు"})\n👤 *${f.full_name}*\n💍 కులం: *${f.caste}* ${f.sub_caste ? `(${f.sub_caste})` : ""} | గోత్రం: *${f.gothram || "—"}*\n🎂 వయస్సు: *${f.age || ageFromDob(f.dob)} సం.* | ఎత్తు: *${f.height}*\n⭐ నక్షత్రం: *${f.star || "—"}* | రాశి: *${f.rasi || "—"}*\n🎓 చదువు: *${f.education}* | 💼 ఉద్యోగం: *${f.job}*\n💰 వార్షిక ఆదాయం: *${f.salary}*\n📍 నివాసం: *${f.district || f.native_place}, ${f.state}*\n━━━━━━━━━━━━━━━━━━━━\n🔍 పూర్తి వివరాలు & సరిపోలిక చూడండి:\n👉 https://manavivaha.in/search/${tsap}`)}`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-3 px-4 rounded-2xl bg-[#25D366] hover:brightness-105 active:scale-95 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md transition"
              >
                <span>💬</span>
                <span>{T("WhatsApp లో బయోడేటా పంపు", "Share Biodata on WhatsApp")}</span>
              </a>

              {cardUrl && (
                <a
                  href={cardUrl}
                  download={`${tsap}-shubhalagnam-card.png`}
                  className="py-3 px-5 rounded-2xl maroon-gradient text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md hover:brightness-105 transition"
                >
                  <span>⬇️</span>
                  <span>{T("HD కార్డ్ డౌన్‌లోడ్", "Download HD Card")}</span>
                </a>
              )}
            </div>
          </div>
        </div>
      </main>
    );
  }

  /* ================= WIZARD ================= */
  const stepMeta = STEPS[step - 1];
  const distList = DISTRICTS_BY_STATE[f.state] || [];

  return (
    <main className="min-h-screen pb-36" ref={topRef}>
      {/* ---------- Sticky Progress Bar ---------- */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-gold/25 safe-top shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-[12px] font-bold text-maroon shrink-0">← హోమ్</Link>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="grid place-items-center w-8 h-8 rounded-full maroon-gradient text-white text-sm shrink-0 shadow-soft">{stepMeta.icon}</span>
                <div className="min-w-0">
                  <div className="text-[13px] font-bold text-ink truncate">
                    దశ {step} <span className="opacity-40">/ 5</span> — <Duo en={stepMeta.label} te={stepMeta.labelTe || ""} />
                  </div>
                  <div className="text-[10px] text-gray-500 telugu truncate">{te ? stepMeta.hint : (stepMeta.hintEn || stepMeta.hint)}</div>
                </div>
              </div>
            </div>
            <div className="relative w-11 h-11 shrink-0" aria-label="step progress">
              <svg viewBox="0 0 40 40" className="w-11 h-11 -rotate-90">
                <circle cx="20" cy="20" r="16.5" fill="none" stroke="#f1e6cf" strokeWidth="4" />
                <circle cx="20" cy="20" r="16.5" fill="none" stroke="#7A0C2E" strokeWidth="4" strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 16.5} strokeDashoffset={2 * Math.PI * 16.5 * (1 - strength / 100)}
                  style={{ transition: "stroke-dashoffset 0.4s ease" }} />
              </svg>
              <span className="absolute inset-0 grid place-items-center text-[10px] font-extrabold text-maroon">{step}/5</span>
            </div>
          </div>
          <div className="mt-2.5 flex items-center gap-1">
            {STEPS.map((s, i) => (
              <button key={s.n} onClick={() => { if (s.n < step) setStep(s.n); }}
                aria-label={`Step ${s.n}`}
                className={`group relative flex-1 flex items-center`}>
                <span className={`grid place-items-center w-5 h-5 rounded-full text-[9px] font-extrabold shrink-0 transition-all ${
                  s.n < step ? "maroon-gradient text-white" : s.n === step ? "bg-white border-2 border-maroon text-maroon shadow-soft scale-110" : "bg-gray-200 text-gray-400"
                }`}>
                  {s.n < step ? "✓" : s.n}
                </span>
                {i < STEPS.length - 1 && (
                  <span className={`h-[3px] flex-1 rounded-full mx-0.5 ${s.n < step ? "maroon-gradient" : "bg-gray-200"}`} />
                )}
              </button>
            ))}
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[10px] text-gray-500">
            <span className="text-emerald-700 font-semibold">🔒 100% ఉచిత నమోదు & గోప్యత రక్షణ</span>
            <span>{savedAt ? T(`💾 ఆటో-సేవ్ అయ్యింది ${savedAt}`, `💾 Auto-saved ${savedAt}`) : "💾 ఆటో-సేవ్ ఆన్"}</span>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-5">
        {/* Referral Invitation Welcome Banner */}
        {refLocked && (
          <div className="mb-4 bg-emerald-50 border-2 border-emerald-400 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-sm animate-fade">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎁</span>
              <div>
                <div className="font-extrabold text-sm text-emerald-950">
                  {refInfo?.referrer_name
                    ? (te ? `🎉 మీ మిత్రులు ${refInfo.referrer_name} సిఫార్సుతో మీరు నమోదు చేసుకుంటున్నారు!` : `🎉 You are registering via ${refInfo.referrer_name}'s invitation!`)
                    : (te ? `🎉 రెఫరల్ కోడ్ (${refLocked}) వర్తించబడింది!` : `🎉 Referral Code (${refLocked}) Applied!`)}
                </div>
                <div className="text-xs text-emerald-800 font-medium mt-0.5">
                  {te
                    ? `మీకు సాధారణ 3 రిక్వెస్ట్‌లతో పాటు +${refInfo?.bonus_credits || 1} అదనపు ఉచిత క్రెడిట్ బోనస్ లభిస్తుంది ✨`
                    : `You get +${refInfo?.bonus_credits || 1} Extra Free Request bonus on registration ✨`}
                </div>
              </div>
            </div>
            <span className="bg-emerald-600 text-white font-mono font-black text-xs px-3 py-1 rounded-xl shrink-0 shadow-xs">
              {refLocked}
            </span>
          </div>
        )}

        {/* Draft resume banner */}
        {draftFound && (
          <div className="mb-4 bg-cream border border-gold/40 rounded-2xl p-4">
            <div className="font-bold text-maroon text-[14px]">💾 {T("మీరు గతంలో నింపిన వివరాలు ఉన్నాయి", "Found your previously saved form")}</div>
            <div className="text-[12px] text-gray-600 mt-1">{T("ఆగిన చోటు నుండి సులభంగా కొనసాగించండి — మళ్లీ టైప్ చేయనవసరం లేదు.", "Continue where you left off — no need to type again.")}</div>
            <div className="mt-3 flex gap-2">
              <button onClick={resumeDraft} className="maroon-gradient text-white font-bold text-[13px] px-4 py-2.5 rounded-xl">{T("▶️ కొనసాగించండి (Continue)", "▶️ Continue")}</button>
              <button onClick={clearDraft} className="border border-maroon/25 text-maroon font-bold text-[13px] px-4 py-2.5 rounded-xl">{T("కొత్తగా ప్రారంభించండి", "Start fresh")}</button>
            </div>
          </div>
        )}

        {errs.length > 0 && (
          <div className={`mb-4 bg-rose-50 border border-rose-200 rounded-2xl px-4 py-3 ${shake ? "shake" : ""}`}>
            <div className="font-bold text-rose-800 text-[13px]">⚠️ {T("ఈ క్రింది వివరాలను సరిచూడండి:", "Please fix the following:")}</div>
            <ul className="mt-1 text-[12px] text-rose-700 list-disc list-inside">
              {errs.slice(0, 5).map((e) => <li key={e}>{e}</li>)}
            </ul>
          </div>
        )}

        <div key={step} className="step-slide bg-white rounded-3xl border border-gold/25 card-shadow p-4 sm:p-6 space-y-5">
          {/* ---------------- STEP 1: BASIC DETAILS ---------------- */}
          {step === 1 && (
            <>
              <div>
                <label className="text-[13px] font-bold text-ink">{T("ఎవరి కోసం ప్రొఫైల్ నమోదు చేస్తున్నారు?", "Who is registering?")} <span className="req-star">*</span></label>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  {[{ v: "Bride", l: "👰 పెళ్లి కూతురు (Bride)", s: "Bride Profile" }, { v: "Groom", l: "🤵 పెళ్లి కొడుకు (Groom)", s: "Groom Profile" }].map((g) => (
                    <button key={g.v} type="button" onClick={() => set("gender", g.v)}
                      className={`rounded-2xl border-2 p-4 text-center transition-all active:scale-[0.98] ${f.gender === g.v ? "border-maroon bg-maroon-soft shadow-soft" : "border-gold/30 bg-white hover:border-maroon/40"}`}>
                      <div className="text-3xl">{g.v === "Bride" ? "👰" : "🤵"}</div>
                      <div className="font-bold text-[14px] text-maroon mt-1 telugu">{g.l}</div>
                      <div className="text-[11px] text-gray-500">{g.s}</div>
                    </button>
                  ))}
                </div>
              </div>

              <TextField label={<Duo en="Full Name" te="పూర్తి పేరు" />} value={f.full_name} onChange={(v) => set("full_name", v)} required
                placeholder="Ex: Sai Lakshmi / Rajesh Reddy" hint={T("కార్డ్ మరియు ఛానళ్లలో ఇదే పేరు ప్రదర్శించబడుతుంది", "This name shows on profile card & search")} />

              <div className="grid grid-cols-2 gap-3">
                <TextField label={<Duo en="Date of Birth" te="పుట్టిన తేదీ" />} value={f.dob} onChange={(v) => set("dob", v)} required
                  type="date" max={maxDobFor18()} hint={T("వయస్సు ఆటోమేటిక్‌గా లెక్కించబడుతుంది", "Age is calculated automatically")} />
                <div>
                  <label className="text-[13px] font-bold text-ink">వయస్సు (Age - Auto)</label>
                  <div className="input-mobile mt-1 flex items-center justify-between bg-cream">
                    <span className="font-bold text-maroon">{f.age ? `${f.age} సం॥ (Years)` : "—"}</span>
                    <span className="text-[10px] text-gray-500">{T("DOB నుండి", "from DOB")}</span>
                  </div>
                </div>
              </div>

              <SelectField label={<Duo en="Height" te="ఎత్తు (Height)" />} required value={f.height}
                onChange={(v) => set("height", v)} placeholder="మీ ఎత్తు ఎంచుకోండి / Select your height">
                {HEIGHTS.map((h) => (<option key={h} value={h}>{heightLabel(h)}</option>))}
              </SelectField>

              <PillGroup label={<Duo en="Marital Status" te="వైవాహిక స్థితి" />} required
                value={f.marital_status}
                onChange={(v) => { set("marital_status", v); if (v === "Pelli Kaledu") set("children", ""); }}
                options={[
                  { v: "Pelli Kaledu", en: "Never Married", te: "పెళ్లి కాలేదు (Unmarried)" },
                  { v: f.gender === "Groom" ? "Widower" : "Widow",
                    en: f.gender === "Groom" ? "Widower" : "Widow",
                    te: f.gender === "Groom" ? "భార్య చనిపోయారు" : "భర్త చనిపోయారు" },
                  { v: "Divorced", en: "Divorced", te: "విడాకులు అయ్యాయి" },
                  { v: "Awaiting Divorce", en: "Awaiting Divorce", te: "విడాకులు రావాల్సి ఉంది" },
                ]} />

              {f.marital_status && f.marital_status !== "Pelli Kaledu" ? (
                <PillGroup label={<Duo en="Number of Children" te="పిల్లల సంఖ్య" />} required
                  value={f.children} onChange={(v) => set("children", v)}
                  options={CHILDREN_OPTIONS.map((c) => ({
                    v: c, en: c === "None" ? "No Children" : c,
                    te: c === "None" ? "పిల్లలు లేరు" : (c === "4+" ? "4+ మంది" : `${c} మంది`),
                  }))} />
              ) : null}

              <SelectField label={<Duo en="Religion" te="మతం" />} value={f.religion}
                onChange={(v) => set("religion", v)} placeholder="మతం ఎంచుకోండి / Select religion">
                {RELIGIONS.map((r) => (<option key={r} value={r}>{r}</option>))}
              </SelectField>

              <ChipGroup label={<Duo en="Mother Tongue" te="మాతృభాష" />} options={MOTHER_TONGUES.map((m) => ({ v: m }))} value={f.mother_tongue}
                onChange={(v) => set("mother_tongue", v)} />
            </>
          )}

          {/* ---------------- STEP 2: CASTE & ASTROLOGY ---------------- */}
          {step === 2 && (
            <>
              <SearchSelect label={`కులం / Caste (${f.religion || "Hindu"})`} required
                options={casteOpts} value={f.caste}
                teMap={CASTE_TELUGU}
                onChange={(v) => { set("caste", v); set("sub_caste", ""); }}
                placeholder="కులం ఎంచుకోండి — 50+ Telugu Castes"
                hint={T("మీ కులం కమ్యూనిటీ ఛానల్‌లో ప్రొఫైల్ పోస్ట్ అవుతుంది", "Profile will be featured in your community group")} />

              {f.caste && (CASTE_SUBCASTES[f.caste]?.length ? (
                <SearchSelect label="ఉపకులం / Sub-caste"
                  options={CASTE_SUBCASTES[f.caste]} value={f.sub_caste}
                  onChange={(v) => set("sub_caste", v)}
                  placeholder="ఉపకులం ఎంచుకోండి (ఉంటే)"
                  hint="వర్తిస్తే ఎంచుకోండి లేదా వదిలేయండి" />
              ) : (
                <TextField label="ఉపకులం / Sub-caste (Optional)" optional value={f.sub_caste} onChange={(v) => set("sub_caste", v)}
                  placeholder="Ex: Pakanati / Chowdary / Motati / Ontari…" />
              ))}

              <div className="pt-2 pb-1 flex items-center gap-2">
                <span className="text-[13px] font-extrabold text-maroon">🕉️ వేద జ్యోతిష వివరాలు (Vedic Kundli Details)</span>
                <span className="h-px flex-1 bg-gold/40" />
                <span className="text-[10px] text-gray-500">వేద గుణమేళనం కి అవసరం</span>
              </div>

              <TextField label="గోత్రం / Gothram" optional value={f.gothram} onChange={(v) => set("gothram", v)}
                placeholder="Ex: Kasyapa / Bharadwaja / Shiva / Janakula…" hint="గోత్ర మైత్రి & వివాహ సరిపోలిక కొరకు" />

              <SearchSelect label="నక్షత్రం / Nakshatram (27 Stars)" options={NAKSHATRAS.map((n) => n.en)} value={f.star}
                teMap={Object.fromEntries(NAKSHATRAS.map((n) => [n.en, n.te]))}
                onChange={(v) => set("star", v)}
                placeholder="నక్షత్రం ఎంచుకోండి (27 Nakshatras)"
                hint="నక్షత్రం ఎంచుకోగానే రాశి ఆటోమేటిక్‌గా సూచించబడుతుంది (వేద గుణమేళనం)" />

              <SearchSelect label="రాశి / Rasi (12 Vedic Moon Signs)" options={RASIS.map((r) => r.en)} value={f.rasi}
                teMap={Object.fromEntries(RASIS.map((r) => [r.en, r.te]))}
                onChange={(v) => set("rasi", v)} placeholder="రాశి ఎంచుకోండి (12 Moon Signs)" />

              <div className="grid grid-cols-2 gap-3">
                <PillGroup label="మూలా నక్షత్రమా?" options={[{ v: "No", en: "No", te: "లేదు" }, { v: "Yes", en: "Yes", te: "ఉంది" }]} value={f.moola_nakshatram}
                  onChange={(v) => set("moola_nakshatram", v)} />
                <PillGroup label="దోషం ఏదైనా ఉందా?" options={[{ v: "No", en: "No Dosham", te: "లేదు" }, { v: "Yes", en: "Kuja/Other", te: "ఉంది" }, { v: "Not Sure", en: "Not Sure", te: "తెలియదు" }]} value={f.dosham}
                  onChange={(v) => set("dosham", v)} />
              </div>
            </>
          )}

          {/* ---------------- STEP 3: CAREER & EDUCATION (WORK TYPE PROMINENTLY AT TOP) ---------------- */}
          {step === 3 && (
            <>
              {/* 🌟 1. WORK TYPE / PROFESSION SECTOR AT THE VERY TOP */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[14px] font-extrabold text-ink flex items-center gap-1.5">
                    💼 వృత్తి / ఉద్యోగ రంగం (Work Type / Sector) <span className="req-star">*</span>
                  </label>
                  <span className="text-[10px] font-bold text-maroon bg-cream px-2 py-0.5 rounded-full border border-gold/40">ముఖ్యమైనది</span>
                </div>
                <div className="hint mb-2.5">మీరు పని చేస్తున్న రంగం లేదా వృత్తి ఎంచుకోండి:</div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {WORK_TYPES_DETAILED.map((w) => {
                    const isSelected = f.work_type === w.en || f.work_type === w.id;
                    return (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => set("work_type", w.en)}
                        className={`p-3 rounded-2xl border text-left transition-all duration-150 active:scale-[0.98] ${
                          isSelected
                            ? "maroon-gradient text-white border-maroon shadow-brand font-bold ring-2 ring-gold/40"
                            : "bg-white border-gray-200 text-ink hover:border-maroon/50 hover:bg-cream/40"
                        }`}
                      >
                        <div className="text-xl mb-1">{w.icon}</div>
                        <div className="text-[13px] font-bold leading-tight line-clamp-1">{w.en.split("/")[0].trim()}</div>
                        <div className={`text-[11px] telugu mt-0.5 ${isSelected ? "text-white/90 font-semibold" : "text-gray-500"}`}>{w.te.split("(")[0].trim()}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 🌟 2. CATEGORIZED & COMPREHENSIVE EDUCATION */}
              <div className="pt-2 border-t border-gold/20">
                <div className="mb-2">
                  <label className="text-[13px] font-bold text-ink">
                    🎓 విద్యార్హత (Education Qualification) <span className="req-star">*</span>
                  </label>
                  <div className="hint">అత్యున్నత విద్యా అర్హతను ఎంచుకోండి:</div>
                </div>

                {/* Popular Quick Pills */}
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {[
                    { label: "B.Tech / B.E.", te: "బి.టెక్" },
                    { label: "MS in USA / Abroad", te: "MS విదేశాలు" },
                    { label: "MBBS", te: "డాక్టర్" },
                    { label: "MD / MS (Medical Specialist)", te: "స్పెషలిస్ట్" },
                    { label: "MBA / PGDM", te: "MBA" },
                    { label: "CA (Chartered Accountant)", te: "CA" },
                    { label: "M.Tech / M.E.", te: "ఎం.టెక్" },
                    { label: "MCA", te: "MCA" },
                    { label: "B.Sc Nursing / Allied Health", te: "నర్సింగ్" },
                    { label: "B.Pharm / M.Pharm / Pharm.D", te: "ఫార్మసీ" },
                    { label: "LLB / BL (Law)", te: "లాయర్" },
                    { label: "Ph.D / Doctorate", te: "డాక్టరేట్" },
                  ].map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => set("education", p.label)}
                      className={`px-3 py-1.5 rounded-full text-[11px] border font-semibold transition ${
                        f.education === p.label
                          ? "maroon-gradient text-white border-transparent shadow-sm"
                          : "bg-cream border-gold/40 text-maroon hover:bg-gold/15"
                      }`}
                    >
                      {p.label} <span className="opacity-75 font-normal">({p.te})</span>
                    </button>
                  ))}
                </div>

                <SearchSelect
                  label="అన్ని విద్యా కోర్సులు (All Educations A–Z)"
                  required
                  options={EDUCATIONS}
                  teMap={EDUCATION_TELUGU}
                  value={f.education}
                  onChange={(v) => set("education", v)}
                  placeholder="విద్యార్హత ఎంచుకోండి / Select qualification"
                />

                <TextField
                  label="స్పెషలైజేషన్ / బ్రాంచ్ (Education Specialization)"
                  optional
                  value={f.education_detail}
                  onChange={(v) => set("education_detail", v)}
                  placeholder="Ex: CSE, AI/ML, Cardiology, Structural Engg, Corporate Law…"
                />
              </div>

              {/* 🌟 3. JOB / OCCUPATION */}
              <div className="pt-2 border-t border-gold/20">
                <SearchSelect
                  label="ఉద్యోగం / హోదా (Job / Occupation)"
                  required
                  options={JOBS}
                  value={f.job}
                  onChange={(v) => set("job", v)}
                  placeholder="ఉద్యోగం ఎంచుకోండి / Select occupation"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  <TextField
                    label="కంపెనీ / సంస్థ పేరు (Company / Organization)"
                    optional
                    value={f.company}
                    onChange={(v) => set("company", v)}
                    placeholder="Ex: Google, TCS, Govt Hospital, Self-owned…"
                  />
                  <TextField
                    label="అనుభవం (Experience in Years)"
                    optional
                    value={f.experience}
                    onChange={(v) => set("experience", v)}
                    placeholder="Ex: 3 Years / 5+ Years"
                  />
                </div>
              </div>

              {/* 🌟 4. GRANULAR SALARY DROPDOWN (1L, 2L, 3L... 1Cr+) */}
              <div className="pt-2 border-t border-gold/20">
                <label className="text-[13px] font-bold text-ink flex items-center justify-between">
                  <span>💰 వార్షిక వేతనం / ఆదాయం (Annual Salary) <span className="req-star">*</span></span>
                  <span className="text-[10px] text-gray-500 font-normal">లక్షలు & కోట్లలో</span>
                </label>
                <div className="hint mb-1.5">సంవత్సరానికి సుమారు ఆదాయ పరిధిని ఎంచుకోండి (Approximate CTC):</div>

                <SelectField
                  label=""
                  required
                  value={f.salary}
                  onChange={(v) => set("salary", v)}
                  placeholder="వార్షిక వేతనం ఎంచుకోండి / Select salary range"
                >
                  {SALARIES_DETAILED.map((s) => (
                    <option key={s.id} value={s.en}>
                      {s.display} — {s.te}
                    </option>
                  ))}
                </SelectField>

                <div className="mt-3">
                  <TextField
                    label="ఉద్యోగ ప్రదేశం (Work Location / City)"
                    optional
                    value={f.work_location}
                    onChange={(v) => set("work_location", v)}
                    placeholder="Ex: Hyderabad, Bengaluru, Dallas (USA), London, Dubai…"
                    hint="ప్రస్తుతం ఉద్యోగం చేస్తున్న ఊరు లేదా విదేశం"
                  />
                </div>
              </div>
            </>
          )}

          {/* ---------------- STEP 4: LOCATION, NRI COUNTRIES & FAMILY ---------------- */}
          {step === 4 && (
            <>
              {/* Location & NRI Selection */}
              <div>
                <label className="text-[13px] font-bold text-ink">
                  నివాస రాష్ట్రం / ప్రాంతం (State / Country) <span className="req-star">*</span>
                </label>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <button type="button" onClick={() => { set("state", "TS"); set("district", ""); set("country", "India"); }}
                    className={`p-3 rounded-2xl border text-center transition ${f.state === "TS" ? "maroon-gradient text-white font-bold shadow-brand" : "bg-white border-gray-200 text-gray-700 hover:border-maroon"}`}>
                    <div className="text-base font-extrabold">🏛️ TS</div>
                    <div className="text-[11px] opacity-90 telugu font-medium">తెలంగాణ (33 జిల్లాలు)</div>
                  </button>
                  <button type="button" onClick={() => { set("state", "AP"); set("district", ""); set("country", "India"); }}
                    className={`p-3 rounded-2xl border text-center transition ${f.state === "AP" ? "maroon-gradient text-white font-bold shadow-brand" : "bg-white border-gray-200 text-gray-700 hover:border-maroon"}`}>
                    <div className="text-base font-extrabold">🌊 AP</div>
                    <div className="text-[11px] opacity-90 telugu font-medium">ఆంధ్రప్రదేశ్ (26 జిల్లాలు)</div>
                  </button>
                  <button type="button" onClick={() => { set("state", "Other"); set("district", ""); }}
                    className={`p-3 rounded-2xl border text-center transition ${f.state === "Other" ? "maroon-gradient text-white font-bold shadow-brand" : "bg-white border-gray-200 text-gray-700 hover:border-maroon"}`}>
                    <div className="text-base font-extrabold">✈️ NRI / Other</div>
                    <div className="text-[11px] opacity-90 telugu font-medium">విదేశాలు / ఇతర రాష్ట్రాలు</div>
                  </button>
                </div>
              </div>

              {/* NRI Top Country Quick Pills when NRI is picked */}
              {f.state === "Other" && (
                <div className="bg-cream/70 border border-gold/40 rounded-2xl p-3.5 space-y-2">
                  <div className="text-[12px] font-bold text-maroon flex items-center justify-between">
                    <span>✈️ ప్రధాన విదేశాలు (Top NRI Destinations)</span>
                    <span className="text-[10px] text-gray-500">1-క్లిక్ సెలెక్షన్</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {NRI_COUNTRIES.slice(0, 8).map((c) => (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => {
                          set("district", c.en);
                          set("country", c.en.split("/")[0].trim());
                          if (!f.work_location) set("work_location", c.en);
                        }}
                        className={`px-3 py-1.5 rounded-full text-[12px] border font-bold transition ${
                          f.district === c.en
                            ? "maroon-gradient text-white border-transparent shadow-sm"
                            : "bg-white border-gold/30 text-ink hover:bg-gold/20"
                        }`}
                      >
                        {c.flag} {c.en.split("/")[0].trim()} <span className="font-normal text-[10px] opacity-80 telugu">({c.te.split("(")[0].trim()})</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <SearchSelect
                label={
                  f.state === "TS"
                    ? "జిల్లా / District (తెలంగాణ సమగ్ర 33 జిల్లాలు)"
                    : f.state === "AP"
                    ? "జిల్లా / District (ఆంధ్రప్రదేశ్ సమగ్ర 26 జిల్లాలు)"
                    : "విదేశీ దేశం / ఇతర రాష్ట్రం (NRI Country / State)"
                }
                required
                options={distList}
                teMap={DISTRICT_TELUGU}
                value={f.district}
                onChange={(v) => {
                  set("district", v);
                  if (f.state === "Other") {
                    set("country", v.split("/")[0].trim());
                  }
                }}
                placeholder={
                  f.state === "TS"
                    ? "తెలంగాణ జిల్లా ఎంచుకోండి (33 జిల్లాలు)"
                    : f.state === "AP"
                    ? "ఆంధ్రప్రదేశ్ జిల్లా ఎంచుకోండి (26 జిల్లాలు)"
                    : "విదేశీ దేశం లేదా రాష్ట్రాన్ని ఎంచుకోండి"
                }
                hint="స్థానిక మ్యాచ్‌లు మరియు జిల్లా సంబంధాల కొరకు"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <TextField label="మండలం / ప్రాంతం (Mandal / Area)" optional value={f.mandal} onChange={(v) => set("mandal", v)} placeholder="Ex: Miryalaguda / Gachibowli / Tenali…" />
                <TextField label="ప్రస్తుత నగరం (Current City)" optional value={f.current_city} onChange={(v) => set("current_city", v)} placeholder="Ex: Hyderabad / Vijayawada / Dallas…" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <TextField label="స్వస్థలం (Native Place / Village)" optional value={f.native_place} onChange={(v) => set("native_place", v)} placeholder="Ex: Nalgonda / Eluru / Ongole…" />
                <TextField label="పిన్‌కోడ్ (Pincode)" optional value={f.pincode} onChange={(v) => set("pincode", v)} inputMode="numeric" placeholder="500032" />
              </div>

              {/* Mobile Verification & Password Box */}
              <div className="bg-white rounded-2xl border-2 border-gold/40 p-4 space-y-3 shadow-sm">
                <div className="font-bold text-maroon text-[14px] flex items-center justify-between">
                  <span>📱 మొబైల్ నంబర్ & లాగిన్ పాస్‌వర్డ్</span>
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">100% ప్రైవేట్</span>
                </div>

                <TextField label="WhatsApp / మొబైల్ నంబర్" required value={f.phone} onChange={(v) => set("phone", v.replace(/\D/g, "").slice(0, 10))}
                  type="tel" inputMode="tel" placeholder="98480 12345"
                  hint={T("మీ నంబర్ ఎవరికీ బహిర్గతం కాదు — ఇరువైపులా ఇష్టపడితేనే మార్పిడి జరుగుతుంది", "Your number stays hidden — exchanged only upon mutual consent")} />

                {!phoneOk ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <button type="button" onClick={sendOtp} disabled={busy || f.phone.length !== 10}
                      className="maroon-gradient text-white font-bold text-[13px] px-4 py-2.5 rounded-xl disabled:opacity-50">
                      {otpSent ? T("OTP మళ్లీ పంపు (Resend)", "Resend OTP") : T("OTP పంపండి (Send OTP)", "Send OTP")}
                    </button>
                    {otpSent && (
                      <>
                        <input value={otpCode} onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                          inputMode="numeric" placeholder="4 అంకెల OTP"
                          className="input-mobile w-32 text-center tracking-[0.4em] font-bold" />
                        <button type="button" onClick={verifyOtp} disabled={busy || otpCode.length !== 4}
                          className="gold-gradient text-maroon font-bold text-[13px] px-4 py-2.5 rounded-xl disabled:opacity-50">✅ ధృవీకరించు</button>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="text-[12px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                    {T("✅ మొబైల్ నంబర్ ధృవీకరించబడింది — మీ ప్రొఫైల్‌కు వెరిఫైడ్ బ్యాడ్జ్ వస్తుంది", "✅ Number verified — Verified trust badge added to profile")}
                  </div>
                )}
                {otpMsg && <div className="text-[11px] text-gray-600">{otpMsg}</div>}

                <TextField label="ఈమెయిల్ (Email Address)" optional value={f.email} onChange={(v) => set("email", v)} inputMode="email" placeholder="name@gmail.com" />

                <div>
                  <label className="text-[13px] font-bold text-ink">🔑 ఖాతా పాస్‌వర్డ్ (Password) <span className="text-maroon">*</span></label>
                  <div className="relative mt-1">
                    <input type={showPw ? "text" : "password"} value={f.password}
                      onChange={(e) => set("password", e.target.value.slice(0, 72))}
                      placeholder="కనీసం 6 అక్షరాలు (Minimum 6 characters)" autoComplete="new-password"
                      className="input-mobile pr-16" />
                    <button type="button" onClick={() => setShowPw(!showPw)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[12px] font-bold text-maroon px-2 py-1">
                      {showPw ? "🙈 దాచు" : "👁️ చూపు"}
                    </button>
                  </div>
                  <div className="hint mt-1">లాగిన్ కొరకు మీ ఫోన్ నంబర్ + ఈ పాస్‌వర్డ్ ఉపయోగించవచ్చు</div>
                </div>
              </div>

              {/* Family Details */}
              <div className="pt-2 border-t border-gold/20 space-y-3">
                <div className="font-bold text-maroon text-[14px]">👨‍👩‍👧 కుటుంబ వివరాలు (Family Details)</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <TextField label="తండ్రి పేరు (Father Name)" optional value={f.father_name} onChange={(v) => set("father_name", v)} />
                  <ChipGroup label="తండ్రి వృత్తి (Father Occupation)" options={OCCUPATIONS.map((o) => ({ v: o }))} value={f.father_occupation}
                    onChange={(v) => set("father_occupation", v)} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <TextField label="తల్లి పేరు (Mother Name)" optional value={f.mother_name} onChange={(v) => set("mother_name", v)} />
                  <ChipGroup label="తల్లి వృత్తి (Mother Occupation)" options={OCCUPATIONS.map((o) => ({ v: o }))} value={f.mother_occupation}
                    onChange={(v) => set("mother_occupation", v)} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Stepper label="సోదరులు (Brothers)" value={f.brothers} onChange={(v) => set("brothers", v)} />
                  <Stepper label="పెళ్లైన సోదరులు (Married)" value={f.brothers_married} onChange={(v) => set("brothers_married", v)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Stepper label="సోదరీమణులు (Sisters)" value={f.sisters} onChange={(v) => set("sisters", v)} />
                  <Stepper label="పెళ్లైన సోదరీమణులు (Married)" value={f.sisters_married} onChange={(v) => set("sisters_married", v)} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <PillGroup label="కుటుంబ రకం (Family Type)"
                    options={[
                      { v: "Nuclear", en: "Nuclear Family", te: "చిన్న కుటుంబం" },
                      { v: "Joint", en: "Joint Family", te: "ఉమ్మడి కుటుంబం" },
                    ]}
                    value={f.family_type} onChange={(v) => set("family_type", v)} />
                  <PillGroup label="కుటుంబ స్థాయి (Family Status)"
                    options={[
                      { v: "Middle Class", en: "Middle Class", te: "మధ్య తరగతి" },
                      { v: "Upper Middle Class", en: "Upper Middle", te: "ఎగువ మధ్య తరగతి" },
                      { v: "Rich / Affluent (Elite)", en: "Affluent / Elite", te: "ధనిక (ఎలైట్)" },
                    ]}
                    value={f.family_status} onChange={(v) => set("family_status", v)} />
                </div>
              </div>
            </>
          )}

          {/* ---------------- STEP 5: PHOTO & FINISH ---------------- */}
          {step === 5 && (
            <>
              <div className="bg-white rounded-2xl border border-gold/30 p-4">
                <div className="font-bold text-maroon text-[15px]">{T("📸 ప్రొఫైల్ ఫోటో (3x ఎక్కువ సంబంధాలు వస్తాయి)", "📸 Profile Photo (3x More Matches)")}</div>
                <div className="hint">{T("మీ గ్యాలరీ లేదా కెమెరా నుండి ఫోటో తీసుకోండి. ఫోటో స్వయంచాలకంగా కంప్రెస్ అవుతుంది. వాటర్‌మార్క్ మరియు ప్రైవేట్ మోడ్‌తో పూర్తి రక్షణ.", "Upload clear photo. Watermarked & protected.")}</div>
                <div className="mt-3 flex items-center gap-3">
                  <label className="cursor-pointer">
                    <input type="file" accept="image/*" className="hidden"
                      onChange={(e) => pickPhoto(e.target.files?.[0])} />
                    <span className="inline-block maroon-gradient text-white font-bold text-[13px] px-4 py-3 rounded-xl shadow-brand">
                      {photoPreview ? "ఫోటో మార్చండి (Change)" : "📷 ఫోటో ఎంచుకోండి (Select Photo)"}
                    </span>
                  </label>
                  {photoPreview && (
                    <div className="relative">
                      <img src={photoPreview} alt="preview" className="w-20 h-20 rounded-2xl object-cover border-2 border-gold shadow-md" />
                      <button type="button"
                        onClick={() => { setPhotoFile(null); setPhotoPreview(""); setPhotoUrl(""); setPhotoInfo(""); }}
                        className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-white border border-rose-300 text-rose-600 font-bold text-xs shadow-sm">✕</button>
                    </div>
                  )}
                </div>
                {photoInfo && <div className="hint mt-2 text-emerald-800 font-medium">{photoInfo}</div>}
              </div>

              <Toggle label="🔒 ఫోటో ప్రైవేట్ మోడ్ (Photo-Private Mode)" sub={T("పబ్లిక్ సెర్చ్‌లో బ్లర్‌గా కనిపిస్తుంది — ఇరువైపులా అంగీకారం కుదిరాకే స్పష్టంగా చూపిస్తాం", "Shows blurred until mutual interest accept")}
                value={!!f.photo_private} onChange={(v) => set("photo_private", v)} />

              <div>
                <label className="text-[13px] font-bold text-ink">{duo("A few words about myself", "నా గురించి కొన్ని మాటలు")} <span className="text-maroon">*</span></label>
                <textarea value={f.about_myself} onChange={(e) => set("about_myself", e.target.value.slice(0, 600))}
                  rows={4} placeholder="నేను సాధారణ కుటుంబానికి చెందిన వ్యక్తిని, సాఫ్ట్‌వేర్ ఇంజనీర్‌గా పనిచేస్తున్నాను… (తెలుగు లేదా English లో రాయవచ్చు)"
                  className="input-mobile mt-1 telugu" />
                <div className="mt-2 flex items-center justify-between">
                  <button type="button" onClick={startVoice}
                    className="border border-maroon/30 text-maroon font-bold text-[12px] px-3 py-1.5 rounded-xl bg-cream hover:bg-gold/20">🎤 వాయిస్‌తో చెప్పండి</button>
                  <span className={`text-[11px] font-bold ${f.about_myself.trim().length >= 50 ? "text-emerald-600" : "text-gray-500"}`}>
                    {f.about_myself.trim().length >= 50 ? "✓ " : ""}{f.about_myself.length}/600 · {duo("Minimum 50 characters", "కనీసం 50 అక్షరాలు")}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <ChipGroup label="శరీర తత్వం (Body Type)" options={BODY_TYPES.map((x) => ({ v: x }))} value={f.body_type}
                  onChange={(v) => set("body_type", v)} />
                <ChipGroup label="రంగు (Complexion)" options={COMPLEXIONS.map((x) => ({ v: x }))} value={f.complexion}
                  onChange={(v) => set("complexion", v)} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <ChipGroup label="రక్త గ్రూప్ (Blood Group)" options={BLOOD_GROUPS.map((x) => ({ v: x }))} value={f.blood_group}
                  onChange={(v) => set("blood_group", v)} />
                <PillGroup label="ఆరోగ్య స్థితి (Physical Status)"
                  value={f.physical_status} onChange={(v) => set("physical_status", v)}
                  options={[
                    { v: "Normal", en: "Normal", te: "సాధారణ" },
                    { v: "Physically challenged", en: "Physically challenged", te: "దివ్యాంగులు" },
                  ]} />
              </div>

              {/* Expectations Box */}
              <div className="bg-cream rounded-2xl border border-gold/30 p-4 space-y-3">
                <div className="font-bold text-maroon text-[14px]">💞 మీ ఆకాంక్షలు & ప్రాధాన్యతలు (Partner Expectations)</div>
                <div className="grid grid-cols-2 gap-3">
                  <TextField label="వయస్సు నుండి (Min Age)" optional value={f.exp_age_min} onChange={(v) => set("exp_age_min", v.replace(/\D/g, "").slice(0, 2))}
                    inputMode="numeric" placeholder="21" />
                  <TextField label="వయస్సు వరకు (Max Age)" optional value={f.exp_age_max} onChange={(v) => set("exp_age_max", v.replace(/\D/g, "").slice(0, 2))}
                    inputMode="numeric" placeholder="30" />
                </div>
                <ChipGroup label="ఉద్యోగ ప్రాధాన్యత (Preferred Profession)" options={JOBS.slice(0, 10).map((j) => ({ v: j }))} value={f.exp_job}
                  onChange={(v) => set("exp_job", v)} />
                <TextField label="ప్రాంత ప్రాధాన్యత (Preferred Location)" optional value={f.exp_location} onChange={(v) => set("exp_location", v)}
                  placeholder="Ex: Hyderabad / Bengaluru / USA / Coastal AP…" />
                <ChipGroup label="కుల ప్రాధాన్యత (Caste Preference)" options={[{ v: "Same caste" }, { v: "Any caste" }, { v: "Caste no bar" }]}
                  value={f.exp_caste} onChange={(v) => set("exp_caste", v)} />
              </div>

              {/* Referral Code */}
              <div className="bg-emerald-50/70 rounded-2xl border border-emerald-200 p-4 space-y-2">
                <label className="text-[13px] font-bold text-emerald-900">🤝 రెఫరల్ కోడ్ (Referral Code - Optional)</label>
                {refInfo?.referrer_name && (
                  <div className="bg-emerald-100/80 border border-emerald-300 rounded-xl p-2.5 text-xs font-bold text-emerald-900">
                    🎁 <b>{refInfo.referrer_name}</b> ద్వారా వచ్చారు (Referred by {refInfo.referrer_name}) — మీకు +1 ఉచిత రిక్వెస్ట్ బోనస్!
                  </div>
                )}
                <input value={f.referral_code}
                  aria-label="Referral code"
                  onChange={(e) => set("referral_code", e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 20))}
                  placeholder="Ex: CHA0001 (స్నేహితుడు ఇచ్చిన కోడ్ ఉంటే)"
                  className="input-mobile mt-2 font-mono tracking-wide" />
                <div className="hint mt-1">
                  {refLocked
                    ? <>{T(<>✅ <b>{refLocked}</b> లాక్ అయ్యింది — మీకు +{refInfo?.bonus_credits || 1} ఉచిత అభ్యర్థన లభిస్తుంది 🎁</>, <>✅ <b>{refLocked}</b> locked — +{refInfo?.bonus_credits || 1} free request for you 🎁</>)}</>
                    : T("స్నేహితుని కోడ్ ఉంటే మీకు +1 ఉచిత రిక్వెస్ట్ మరియు వారికి ₹50 లభిస్తాయి.", "Enter friend's code to get +1 free request.")}
                </div>
              </div>

              {/* Privacy & Free-vs-Paid Clarity Box */}
              <div className="bg-slate-50 border border-gold/30 rounded-2xl p-4 text-xs space-y-2">
                <div className="font-extrabold text-navy text-sm">🔒 ఉచిత నమోదు స్పష్టత (Free Plan Privacy):</div>
                <div className="text-slate-700 leading-relaxed">
                  <b>FREE లో ఇచ్చేది:</b> మొదటి 3 ప్రొఫైల్స్ పూర్తి వివరాలు + ఛానెల్ పోస్టింగ్. మీ అనుమతి లేకుండా మీ ఫోన్ నంబర్ <b>ఎవరికీ ఇవ్వము</b> (ఇరువైపులా ఇంట్రెస్ట్ అంగీకరించాకే అన్‌లాక్ అవుతుంది).
                </div>
              </div>

              <label className="flex items-start gap-3 bg-white rounded-2xl border border-gold/30 p-4">
                <input type="checkbox" checked={!!f.consent} onChange={(e) => set("consent", e.target.checked)}
                  className="mt-1 w-5 h-5 accent-[#7A0C2E]" />
                <span className="text-[12px] text-gray-700">
                  {T(<>నేను అందించిన వివరాలన్నీ <b>వాస్తవమైనవి</b> అని ధృవీకరిస్తున్నాను. <b>శుభలగ్నం</b> నిబంధనలు మరియు గోప్యతా విధానాన్ని అంగీకరిస్తున్నాను — వివరాలు కమ్యూనిటీ ఛానళ్లలో పోస్ట్ చేయబడతాయి, ఫోన్ నంబర్ ఇరువైపులా అంగీకారం కుదిరాకే పంచుకోబడుతుంది.</>,
                  <>I confirm all details are <b>true and authentic</b>. I accept <b>Shubhalagnam</b> terms & privacy policy — phone numbers shared only upon mutual consent.</>)}
                </span>
              </label>
            </>
          )}
        </div>

        {/* Trust Badges */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-gray-700 text-center font-medium">
          <div className="bg-white border border-gold/25 rounded-xl px-3 py-2 shadow-sm">🔒 నంబర్ పూర్తి గోప్యత</div>
          <div className="bg-white border border-gold/25 rounded-xl px-3 py-2 shadow-sm">🛡️ వాటర్‌మార్క్ రక్షణ</div>
          <div className="bg-white border border-gold/25 rounded-xl px-3 py-2 shadow-sm">🕉️ వేద గుణమేళనం</div>
          <div className="bg-white border border-gold/25 rounded-xl px-3 py-2 shadow-sm">🚫 స్పామ్ లేని సేవలు</div>
        </div>
      </div>

      {/* Sticky Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/97 backdrop-blur border-t border-gold/30 safe-bottom shadow-lg">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          {step > 1 && (
            <button onClick={back} className="px-5 py-3.5 rounded-2xl border border-maroon/25 text-maroon font-bold text-[14px] hover:bg-cream active:scale-95 transition">
              ← {duo("Back", "వెనక్కి")}
            </button>
          )}
          <div className="flex-1 text-[11px] text-gray-600 font-medium">
            {step < 5 ? `తదుపరి: ${duo(STEPS[step].label, STEPS[step].labelTe || "")}` : duo("Final step — submit profile", "చివరి దశ — ప్రొఫైల్ నమోదు")}
          </div>
          {step < 5 ? (
            <button onClick={next} className="px-7 py-3.5 rounded-2xl maroon-gradient text-white font-bold text-[15px] shadow-brand hover:brightness-110 active:scale-95 transition">
              {duo("Next", "తర్వాత")} →
            </button>
          ) : (
            <button onClick={submit} disabled={busy}
              className="px-6 py-3.5 rounded-2xl gold-gradient text-maroon font-extrabold text-[15px] shadow-brand hover:brightness-110 active:scale-95 transition disabled:opacity-60">
              {busy ? duo("Registering…", "నమోదు అవుతోంది…") : `✅ ఉచిత నమోదు (Register Free)`}
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
        <div className="min-h-[60vh] flex items-center justify-center text-gray-500 text-sm">
          {duo("Loading registration form…", "నమోదు ఫారం లోడ్ అవుతోంది…")}
        </div>
      }
    >
      <Wizard />
    </Suspense>
  );
}
