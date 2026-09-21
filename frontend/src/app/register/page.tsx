"use client";

/**
 * MANA VIVAHA — SMART MOBILE REGISTER (v3)
 * ========================================
 * Phone lo 3 nimushalalo complete avvali — adi target. Ela:
 *   • Chip pickers (type cheyyadam kanna tap cheyyadam easy) — caste, star, district, salary…
 *   • DOB ichina age **automatic** ga vastundi (nuvvu age type cheyyakkarledu)
 *   • Star pick chesthe **rasi automatic** ga suggest avutundi
 *   • Auto-save draft (phone refresh/back ayina form poyedu) + "Continue" banner
 *   • Bottom lo thumb-reachable big buttons (Next/Back) + sticky % progress
 *   • Inline Telugu validation — "ee field kavali" ani chepthundi (English errors ledu)
 *   • 📱 OTP verify (dev mode) → number verified badge
 *   • 📸 Photo phone lo ne compress (1200px) → upload → fast on 2G/3G too
 *   • 🎤 Voice input (about_myself) — supported browsers lo
 */
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { CHANNEL_STATS } from "@/lib/channels";
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
  BLOOD_GROUPS, BODY_TYPES, CASTES, CASTE_SUBCASTES, CHILDREN_OPTIONS, COMPLEXIONS, DISTRICTS_BY_STATE, EDUCATIONS, FAMILY_STATUSES,
  FAMILY_TYPES, FAMILY_VALUES, HEIGHTS, JOBS, MARITAL_STATUSES, MOTHER_TONGUES, NAKSHATRAS, NAK_TO_RASI,
  OCCUPATIONS, PHYSICAL_STATUS, RASIS, RELIGIONS, SALARIES, WORK_TYPES,
  ageFromDob, compressImage, heightLabel, maxDobFor18,
} from "@/lib/telugu-data";

const DRAFT_KEY = "tsap_reg_draft_v3";
const STEPS = [
  { n: 1, label: "Basic", labelTe: "ప్రాథమిక", icon: "🙋", hint: "మీ basic details", hintEn: "Your basic details" },
  { n: 2, label: "Caste + Astrology", labelTe: "కులం + జ్యోతిషం", icon: "💍", hint: "Caste + జ్యోతిషం (star, rasi) — card కి కావాలి", hintEn: "Caste + astrology details — needed for card" },
  { n: 3, label: "Education", labelTe: "విద్య", icon: "🎓", hint: "చదువు + ఉద్యోగం", hintEn: "Education + job" },
  { n: 4, label: "Family", labelTe: "కుటుంబం", icon: "👨‍👩‍👧", hint: "Family + contact", hintEn: "Family + contact" },
  { n: 5, label: "Photo", labelTe: "ఫోటో", icon: "📸", hint: "Photo + finish (చివరి details)", hintEn: "Photo + finish (settlement details)" },
];

/* raw channel handle (@manavivaha_kamma_bride) → neat name (Kamma Brides) — user ki clarify avvadam */
function prettyChannel(raw: string): string {
  let s = String(raw || "").replace(/^@/, "")
    .replace(/^(manavivaha|tsap)_/i, "").replace(/_/g, " ")
    .replace(/\d+$/, "").trim().toLowerCase();
  const special: Record<string, string> = {
    tsbride: "TS Brides (Telangana)", tsgroom: "TS Grooms (Telangana)",
    apbride: "AP Brides", apgroom: "AP Grooms",
    matrimony: "Main Channel", hindu: "Hindu Community",
    nri: "NRI / Abroad", second: "Second Marriage", able: "Differently Abled",
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
  education: "", education_detail: "", job: "", company: "", salary: "",
  experience: "", work_type: "", work_location: "",
  father_name: "", father_occupation: "", mother_name: "", mother_occupation: "",
  brothers: "0", brothers_married: "0", sisters: "0", sisters_married: "0",
  family_type: "Nuclear", family_status: "Middle Class", family_values: "Traditional",
  native_place: "", state: "TS", district: "", mandal: "", current_city: "", country: "India", pincode: "",
  phone: "", email: "", password: "", photo_private: true, about_myself: "",
  expectations: "", exp_age_min: "", exp_age_max: "", exp_job: "", exp_location: "", exp_caste: "",
  physical_status: "Normal", body_type: "Average", complexion: "Fair", blood_group: "",
  referral_code: "", consent: false,
};

/* ---------------------------------------------------------------- UI atoms */
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
  label: string; options: { v: string; te?: string }[]; value: string; onChange: (v: string) => void;
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
          value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔍 Type chesi vethakandi…"
          className="input-mobile mt-2" inputMode="search"
        />
      )}
      <div className={`mt-2 flex flex-wrap gap-2 ${cols === 1 ? "flex-col" : ""}`}>
        {list.slice(0, searchable ? 60 : 40).map((o) => (
          <Chip key={o.v} on={value === o.v} gold={te} onClick={() => onChange(value === o.v ? "" : o.v)}>
            {te && o.te ? <span className="telugu">{o.te}</span> : null}
            <span>{o.v}</span>
          </Chip>
        ))}
        {list.length === 0 && (
          <div className="text-[12px] text-gray-500">
            Dorakaledu — <button type="button" onClick={() => onChange(q.trim())} className="text-maroon font-bold underline">“{q}” ni alane pettu</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* 🔎 SearchSelect — pro searchable dropdown (replaces chip-soup for long lists: caste/education/job/district) */
function SearchSelect({
  label, options, value, onChange, required, hint, placeholder, teMap,
}: {
  label: string; options: string[]; value: string; onChange: (v: string) => void;
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
    return options.filter((o) => o.toLowerCase().includes(needle) || (teMap?.[o] || "").includes(q.trim()));
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
          {value ? (teMap?.[value] ? <span>{value} <span className="telugu text-gray-500">({teMap[value]})</span></span> : value) : (placeholder || "Select…")}
        </span>
        <span className="text-maroon text-lg shrink-0 ml-2">{open ? "▲" : "⌄"}</span>
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-gold/40 rounded-2xl shadow-lg overflow-hidden">
          <input
            autoFocus value={q} onChange={(e) => setQ(e.target.value)}
            placeholder={duo("🔍 Type to search…", "🔍 Type చేసి వెతకండి…")}
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
                className={`w-full text-left px-4 py-2.5 text-[14px] hover:bg-cream ${value === o ? "bg-maroon-soft font-bold text-maroon" : "text-ink"}`}>
                {o} {teMap?.[o] ? <span className="telugu text-gray-500 text-[12px]">({teMap[o]})</span> : null}
              </button>
            ))}
            {list.length === 0 && (
              <div className="px-4 py-3 text-[12px] text-gray-500">
                Dorakaledu — <button type="button" onClick={() => { onChange(q.trim()); setOpen(false); }} className="text-maroon font-bold underline">“{q}” ni alane pettu</button>
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
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean;
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

/* 🌊 WAVE 16 — pro pills + dropdown (screenshot-standard, Duo bilingual) */
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
      <div className="mt-2 grid grid-cols-2 gap-2.5" role="radiogroup" aria-label={typeof label === "string" ? label : "options"}>
        {options.map((o) => {
          const on = value === o.v;
          return (
            <button key={o.v} type="button" role="radio" aria-checked={on} onClick={() => onChange(o.v)}
              className={`rounded-full border-[1.5px] px-4 py-3 text-[14px] transition-all active:scale-[0.98] ${
                on ? "maroon-gradient text-white border-transparent shadow-brand font-bold"
                   : "border-gray-300 bg-white text-ink font-medium hover:border-maroon/50"}`}>
              <div>{o.en}</div>
              <div className={`text-[11px] font-semibold ${on ? "text-white/85" : "text-gray-500"} telugu`}>{o.te}</div>
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
      <div className="relative mt-2">
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

/* ---------------------------------------------------------------- main */
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
  // 🎁 WAVE 10 — "register avvagane WhatsApp ki 3 profiles + caste channel links"
  const [packResend, setPackResend] = useState<{ busy: boolean; msg: string }>({ busy: false, msg: "" });
  const [clarity, setClarity] = useState<any>(null);
  const [copied, setCopied] = useState("");
  const topRef = useRef<HTMLDivElement>(null);
  const voiceRef = useRef<any>(null);

    // 🌊 WAVE 14 — religion → castes (A–Z) backend nunchi (fallback: static CASTES)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f.religion]);

const set = (k: string, v: any) => {
    setF((prev) => ({ ...prev, [k]: v }));
    setErrs([]);
  };

  /* ---------- 🆓 FREE vs PAID clarity (numbers rule) — /api/free-plan ---------- */
  useEffect(() => {
    fetch("/api/free-plan").then((r) => r.json()).then(setClarity).catch(() => { });
  }, []);

  /* ---------- 🤝🌊 WAVE 20 — smart referral: ?ref → backup restore → click → validate ---------- */
  useEffect(() => {
    let ref = (params?.get("ref") || "").trim().toUpperCase();
    try {
      // backup: /r/ nunchi vachi malli vachina — code povatledu (30 days memory)
      if (!ref) ref = (localStorage.getItem("tsap_ref_from_link") || "").trim().toUpperCase();
      else localStorage.setItem("tsap_ref_from_link", ref);
    } catch { /* ignore */ }
    if (!ref) return;
    setRefLocked(ref);
    setF((prev) => ({ ...prev, referral_code: ref }));
    // click funnel: /r/ already track chesunte malli kaadu (session dedupe)
    try {
      if (sessionStorage.getItem("tsap_click_fired") === ref) {
        fetch(`/api/referral/validate/${encodeURIComponent(ref)}`).then((r) => r.json())
          .then((d) => { if (d?.ok) setRefInfo(d); }).catch(() => { });
        return;
      }
      sessionStorage.setItem("tsap_click_fired", ref);
    } catch { /* ignore */ }
    fetch(`/api/referral/click/${encodeURIComponent(ref)}?source=register_direct`, { method: "POST" })
      .then((r) => r.json())
      .then((d) => {
        if (d?.valid_code && d?.referrer_name) setRefInfo({ ok: true, referrer_name: d.referrer_name, bonus_credits: d.bonus_credits });
      }).catch(() => { });
  }, [params]);

  // manual code type → live validate (debounced)
  useEffect(() => {
    const code = (f.referral_code || "").trim().toUpperCase();
    if (!code || code === refLocked) return;
    const t = setTimeout(() => {
      fetch(`/api/referral/validate/${encodeURIComponent(code)}`).then((r) => r.json())
        .then((d) => {
          if (d?.ok) { setRefLocked(code); setRefInfo(d); try { localStorage.setItem("tsap_ref_from_link", code); } catch { /* ignore */ } }
          else setRefInfo({ ok: false, message_telugu: d?.message_telugu });
        }).catch(() => { });
    }, 600);
    return () => clearTimeout(t);
  }, [f.referral_code]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- draft resume ---------- */
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

  /* ---------- auto-save (debounced) ---------- */
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

  /* ---------- age from DOB ---------- */
  useEffect(() => {
    const a = ageFromDob(f.dob);
    if (a && String(a) !== String(f.age)) setF((prev) => ({ ...prev, age: String(a) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f.dob]);

  /* ---------- star → rasi auto ---------- */
  useEffect(() => {
    if (f.star && !f.rasi && NAK_TO_RASI[f.star]) setF((prev) => ({ ...prev, rasi: NAK_TO_RASI[f.star] }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f.star]);

  const scrollTop = () => topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  /* ---------- validation per step ---------- */
  const validate = (s: number): string[] => {
    const e: string[] = [];
    if (s === 1) {
      if (!f.gender) e.push(T("Bride / Groom select చెయ్యండి", "Select Bride / Groom"));
      if (!String(f.full_name).trim()) e.push(T("Full name type చెయ్యండి", "Type your full name"));
      if (!f.dob) e.push(T("Date of birth select చెయ్యండి", "Select date of birth"));
      else if (!ageFromDob(f.dob)) e.push(T("DOB correct గా లేదు", "DOB is not valid"));
      if (!f.height) e.push(T("Height select చెయ్యండి", "Select height"));
      if (!f.marital_status) e.push(T("Marital status select చెయ్యండి", "Select marital status"));
      if (f.marital_status && f.marital_status !== "Pelli Kaledu" && !f.children)
        e.push(T("Number of children select చెయ్యండి (None అయినా సరే)", "Select number of children (even if None)"));
    }
    if (s === 2) {
      if (!f.caste) e.push(T("Caste select చెయ్యండి (channels కి కావాలి)", "Select caste (needed for channels)"));
    }
    if (s === 3) {
      if (!f.education) e.push(T("Education select చెయ్యండి", "Select education"));
      if (!f.job) e.push(T("Job / ఉద్యోగం select చెయ్యండి", "Select job / occupation"));
      if (!f.salary) e.push(T("Salary range select చెయ్యండి", "Select salary range"));
    }
    if (s === 4) {
      if (!f.state) e.push(T("State select చెయ్యండి", "Select state"));
      if (!f.district) e.push(T("District select చెయ్యండి", "Select district"));
      if (!/^\d{10}$/.test(String(f.phone))) e.push(T("10 digit mobile number ఇవ్వండి", "Enter a 10-digit mobile number"));
      if (String(f.password || "").length < 6) e.push(T("🔑 Password minimum 6 characters పెట్టండి", "🔑 Set a password of minimum 6 characters"));
    }
    if (s === 5) {
      const _ab = String(f.about_myself || "").trim();
      if (_ab.length < 50) e.push(T("About yourself — minimum 50 characters (మీ గురించి రాయండి)", "About yourself — minimum 50 characters"));
      else if (/[6-9]\d{9}|@\S+\.\S+/.test(_ab)) e.push(T("🔒 About లో phone number / email పెట్టకండి — privacy కోసం", "🔒 Don\u2019t put phone number / email in About — for privacy"));
      if (!f.consent) e.push(T("Terms + privacy accept చెయ్యండి (కింద checkbox)", "Accept Terms + Privacy (checkbox below)"));
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

  /* ---------- profile strength ---------- */
  const strength = useMemo(() => {
    const keys = ["full_name", "gender", "dob", "height", "marital_status", "caste", "sub_caste",
      "gothram", "star", "rasi", "education", "education_detail", "job", "company", "salary",
      "experience", "work_type", "work_location", "father_name", "father_occupation", "mother_name",
      "native_place", "state", "district", "mandal", "current_city", "pincode", "phone", "about_myself",
      "body_type", "complexion", "blood_group"];
    const filled = keys.filter((k) => String(f[k] || "").trim()).length + (photoUrl ? 2 : 0);
    return Math.min(100, Math.round((filled / (keys.length + 2)) * 100));
  }, [f, photoUrl]);

  /* ---------- photo pick + compress ---------- */
  const pickPhoto = async (file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return setErrs([T("Photo file మాత్రమే (JPG/PNG/WebP)", "Photo file only (JPG/PNG/WebP)")]);
    if (file.size > 8 * 1024 * 1024) return setErrs([T("Photo చాలా పెద్దది (8MB+) — చిన్న photo పెట్టండి", "Photo too large (8MB+) — upload a smaller photo")]);
    setBusy(true);
    const small = await compressImage(file, 1200, 0.85);
    setPhotoFile(small);
    setPhotoPreview(URL.createObjectURL(small));
    setPhotoInfo(`${(small.size / 1024).toFixed(0)} KB${small.size < file.size ? ` (${(file.size / 1024).toFixed(0)} KB → compress)` : ""} • upload chesthunnam…`);
    try {
      const fd = new FormData();
      fd.append("file", small);
      const r = await fetch("/api/photo/upload", { method: "POST", body: fd });
      const d = await r.json();
      if (r.ok) {
        setPhotoUrl(d.url);
        setPhotoInfo(`${d.kb} KB ✅ uploaded — card lo mee photo vasthundi`);
      } else {
        const det: any = d?.detail;
        setPhotoInfo("");
        setErrs([det?.message_telugu || det?.te || det?.en ||
                 (typeof d?.detail === "string" ? d.detail : "") ||
                 T("Photo upload అవ్వలేదు — clear photo తీసి మళ్లీ try చెయ్యండి", "Photo upload failed — take a clear photo and retry")]);
      }
    } catch {
      setErrs([T("Network problem — photo మళ్లీ try చెయ్యండి", "Network problem — retry photo upload")]);
    }
    setBusy(false);
  };

  /* ---------- OTP ---------- */
  const sendOtp = async () => {
    if (!/^\d{10}$/.test(f.phone)) return setErrs([T("ముందు 10 digit number ఇవ్వండి", "Enter your 10-digit number first")]);
    setBusy(true);
    try {
      const d = await fetch("/api/otp/send", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: f.phone }),
      }).then((r) => r.json());
      setOtpSent(true);
      setOtpMsg(d.message_telugu || T("OTP పంపించాం", "OTP sent"));
      if (d.dev_code) setOtpCode(d.dev_code);
    } catch {
      setErrs([T("OTP పంపలేదు — మళ్లీ try చెయ్యండి", "OTP not sent — retry")]);
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
        setOtpMsg(d.message_telugu);
      } else {
        setOtpMsg(d.message_telugu || "OTP tappu");
      }
    } catch {
      setOtpMsg(T("Verify అవ్వలేదు — మళ్లీ try చెయ్యండి", "Not verified — retry"));
    }
    setBusy(false);
  };

  /* ---------- voice input (about_myself) ---------- */
  const startVoice = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return setErrs([T("ఈ browser లో voice input లేదు — type చెయ్యండి", "No voice input in this browser — please type")]);
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
      setErrs([T("Voice input start అవ్వలేదు", "Voice input did not start")]);
    }
  };

  /* ---------- submit ---------- */
  /** backend error → human-readable Telugu/English (FastAPI 422 arrays, {detail:{te}}, string — anni) */
  const readableError = (d: any, te: boolean): string => {
    const fallback = te ? "Register అవ్వలేదు — fields అన్నీ fill చేసి మళ్లీ try చెయ్యండి" : "Registration failed — please fill all fields and retry";
    const det = d?.detail;
    if (!det) return d?.message_telugu || d?.te || fallback;
    if (typeof det === "string") return det;
    if (Array.isArray(det)) {
      const fields = det.map((x: any) => x?.loc?.[x.loc.length - 1]).filter(Boolean);
      if (fields.length) {
        return te
          ? `ఈ fields సరిగ్గా ఇవ్వండి: ${fields.join(", ")}`
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
      // 🔐 WAVE 9 — auth token save (private API: inbox/credits/views/saved ki) + demo login ready
      try {
        if (d?.auth_token) { localStorage.setItem("tsap_token", String(d.auth_token)); localStorage.setItem("tsap_id", String(d.tsap_id || "")); }
      } catch { /* private mode */ }
      // 🤝 Referral page + requests lo ide user kanipinchali (demo ID kaadu)
      try {
        const newId = d.tsap_id || d.user_id || "";
        if (newId) {
          localStorage.setItem("tsap_last_id", newId);
          const list = JSON.parse(localStorage.getItem("tsap_profiles") || "[]");
          localStorage.setItem("tsap_profiles", JSON.stringify(
            [{ id: newId, name: f.full_name, gender: f.gender, at: Date.now() },
              ...list.filter((p: any) => (p?.id || p?.tsap_id) !== newId)].slice(0, 5)));
        }
      } catch { /* private mode: localStorage may be blocked — fine */ }
      scrollTop();
    } catch (e: any) {
      setErrs([e?.message || T("Register లో problem — మళ్లీ try చెయ్యండి", "Problem in registration — please retry")]);
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
            <div className="text-5xl">🎉</div>
            <h1 className="mt-2 text-2xl font-bold">{T("Profile ready అయ్యింది!", "Profile ready!")}</h1>
            <p className="text-[13px] opacity-90 mt-1 telugu">{T("మీ ID + card కింద ఉంది — WhatsApp status లో share చెయ్యండి, reach double అవుతుంది.", "Your ID + card are below — share on WhatsApp status, reach doubles.")}</p>
            <div className="mt-4 inline-flex max-w-full flex-col items-center gap-1.5 bg-white/10 border border-gold/40 rounded-2xl px-4 sm:px-6 py-4 shadow-brandLg">
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">{T("మీ ప్రొఫైల్ ID", "Your Profile ID")}</span>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <span className="font-mono text-lg sm:text-2xl font-extrabold tracking-wide text-gold break-all">{tsap}</span>
                <button onClick={() => copy(tsap, "id")} className="shrink-0 text-[11px] font-bold gold-gradient text-maroon px-3 py-1.5 rounded-full">
                  {copied === "id" ? "✓" : "📋"}
                </button>
              </div>
              <span className="text-[10px] opacity-70 text-center">{T("ఈ ID తో మీ ప్రొఫైల్ ఎప్పుడైనా వెతకవచ్చు", "Search your profile anytime with this ID")}</span>
            </div>
          </div>
        </section>

        <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
          {result.publish_targets?.length ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
              <div className="font-bold text-emerald-900 text-[15px]">📢 {T("మీ ప్రొఫైల్ ఇక్కడ post అవుతుంది", "Your profile is posted here")}</div>
              <div className="text-[12px] text-emerald-800 mt-1 telugu">
                {T("మీ కులం/ప్రాంతం బట్టి ఈ ఛానళ్లలో + WhatsApp లో మీ ప్రొఫైల్ కనిపిస్తుంది — రోజూ కొత్త సంబంధాలు చూడాలంటే join అవ్వండి:", "Based on your caste/region your profile shows in these channels + WhatsApp — join them to see new matches every day:")}
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
                  {T("Telegram లో join అవ్వండి", "Join on Telegram")}
                </a>
                {waLink("official") ? (
                  <a href={waLink("official")} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#25D366] text-white font-bold text-[12px] px-4 py-2.5 shadow-soft hover:brightness-110 active:scale-[0.97] transition">
                    <WhatsAppIcon className="w-4 h-4" mono />
                    {T("WhatsApp లో join అవ్వండి", "Join on WhatsApp")}
                  </a>
                ) : null}
              </div>
            </div>
          ) : null}

          <PhotoFlow tsapId={tsap} />

          <div className="rounded-2xl maroon-gradient text-white p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-bold text-[15px]">{T("🔓 3 profiles FULL unlock — ₹99 సంబంధం", "🔓 3 profiles FULL unlock — ₹99 Sambandham")}</div>
              <div className="text-[12px] opacity-90 telugu">{T("Register అయ్యాక 3 matches FREE చూశారు — full details + numbers కోసం ₹99 (5 profiles + boost, 30 days).", "After register you saw 3 matches FREE — ₹99 for full details + numbers (5 profiles + boost, 30 days).")}</div>
            </div>
            <a href="/pricing" className="gold-gradient text-maroon font-bold text-[13px] px-5 py-2.5 rounded-xl whitespace-nowrap">
              ₹99 Unlock →
            </a>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-gold/30 card-shadow">
            <div className="font-bold text-maroon text-[15px]">{T("🎁 మీ account కి ఏంటి వచ్చింది", "🎁 What your account got")}</div>
            <div className="mt-2 grid sm:grid-cols-3 gap-2 text-[12px]">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-emerald-900">
                <b>{result.credits ?? 3} requests</b> ready<br /><span className="text-[11px]">(FREE 3 + referral bonus {result.referral?.joined_with?.ok ? "+1" : ""})</span>
              </div>
              <div className="bg-cream border border-gold/40 rounded-xl p-3 text-maroon">
                <b>3 profiles</b> {T("చూడొచ్చు", "to see")}<br /><span className="text-[11px]">numbers 🔒 locked</span>
              </div>
              <div className="bg-navy text-white rounded-xl p-3">
                <b>{T("Numbers ఎప్పుడు?", "Numbers when?")}</b><br /><span className="text-[11px] opacity-90">{T("interest పంపి వాళ్లు accept చేస్తే (లేదా ₹99 plan తో ఎక్కువ profiles)", "when you send interest and they accept (or more profiles with ₹99 plan)")}</span>
              </div>
            </div>
            {result.quality ? (
              <div className="mt-2 rounded-xl border border-gold/40 bg-white p-3 text-[12px]">
                <div className="font-bold text-maroon">📝 {T("మీ profile — quality check", "Your profile — quality check")}</div>
                <div className="mt-1 text-gray-600">
                  {result.quality.verdict_telugu}
                  {Array.isArray(result.quality.important_telugu) && result.quality.important_telugu.length
                    ? ` · ${result.quality.important_telugu.slice(0, 2).join(" · ")}` : ""}
                </div>
                <div className="mt-1 text-[11px] text-emerald-700">
                  {T("✅ మీరు ఇప్పుడు login అయ్యారు — మీ inbox/credits/shortlist ఇప్పుడు safe గా ఉన్నాయి", "✅ You're now logged in — your inbox/credits/shortlist are safe and ready")} ({result.phone_masked ? `number: ${result.phone_masked}` : "number masked"})
                </div>
              </div>
            ) : null}
            {result.welcome_pack ? (
              <div className="mt-2 rounded-xl border-2 border-emerald-300 bg-emerald-50 p-3">
                <div className="font-bold text-emerald-900 text-[13px]">
                  {T("📲 మీ WhatsApp కి పంపినాం — 3 profiles + మీ caste channel links", "📲 Sent to your WhatsApp — 3 profiles + your caste channel links")}
                </div>
                <div className="mt-1 text-[11px] text-emerald-800">
                  {result.welcome_pack.queue?.queued
                    ? (te ? `✅ WhatsApp లో వెళ్లింది — మీ number ${result.phone_masked || ""} కి` : `✅ Sent on WhatsApp — to your number ${result.phone_masked || ""}`)
                    : T("🕒 WhatsApp కి కొద్ది సేపట్లో వెళ్తుంది — కానీ ఈ 3 profiles ఇక్కడే చూడండి:", "🕒 On its way to your WhatsApp shortly — but see these 3 profiles here:")}
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  {(result.welcome_pack.profiles || []).map((pf: any, i: number) => (
                    <Link key={pf.tsap_id} href={`/search/${pf.tsap_id}`}
                      className="block bg-white border border-gold/40 rounded-xl p-2.5 hover:bg-cream">
                      <div className="text-[12px] font-bold text-maroon">{["1️⃣","2️⃣","3️⃣"][i]} {pf.name}</div>
                      <div className="text-[11px] text-gray-700">{pf.age} yrs • {pf.caste} • {pf.district}</div>
                      <div className="text-[10px] text-gray-500">{pf.education} • {pf.job}</div>
                      <div className="text-[10px] text-emerald-700">⭐ {pf.score}% match • 🔒 number locked</div>
                    </Link>
                  ))}
                </div>
                {(result.welcome_pack.channels || []).length > 0 && (
                  <div className="mt-3 bg-white rounded-xl border border-gold/40 p-3">
                    <div className="text-[13px] font-bold text-maroon">📢 {T("మీ కులం/ప్రాంతానికి సంబంధించిన సంబంధాలు ఇక్కడ వస్తాయి — Join అవ్వండి", "New matches for your caste/region come here — Join now")}</div>
                    <div className="mt-2 space-y-1.5">
                      {(result.welcome_pack.channels || []).map((ch: any) => (
                        <div key={ch.key} className="flex items-center justify-between gap-2 rounded-xl bg-cream/70 border border-gold/25 px-3 py-2">
                          <span className="text-[12px] font-bold text-maroon truncate">{ch.name}</span>
                          <div className="flex gap-1.5 shrink-0">
                            {ch.telegram && <a className="rounded-full bg-sky-600 text-white text-[10px] font-bold px-2.5 py-1" href={ch.telegram} target="_blank" rel="noopener noreferrer">✈️ Telegram</a>}
                            {ch.whatsapp && <a className="rounded-full bg-emerald-600 text-white text-[10px] font-bold px-2.5 py-1" href={ch.whatsapp} target="_blank" rel="noopener noreferrer">🟢 WhatsApp</a>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button
                    onClick={async () => {
                      setPackResend({ busy: true, msg: "" });
                      try {
                        const r = await fetch(`/api/welcome-pack/${tsap}/resend`, { method: "POST", headers: authHeaders() });
                        const d = await r.json();
                        setPackResend({ busy: false, msg: d.message_telugu || (r.ok ? T("✅ మళ్లీ పంపినాం", "✅ Sent again") : T("⚠️ పంపలేదు", "⚠️ Not sent")) });
                      } catch { setPackResend({ busy: false, msg: T("⚠️ Server తో connect అవ్వలేదు", "⚠️ Could not reach server") }); }
                    }}
                    disabled={packResend.busy}
                    className="rounded-xl border border-emerald-600 text-emerald-800 font-bold text-[11px] px-3 py-2 disabled:opacity-60">
                    {packResend.busy ? T("పంపిస్తున్నాం…", "Sending…") : T("📲 మళ్లీ WhatsApp కి పంపు (3 profiles + channels)", "📲 Resend to WhatsApp (3 profiles + channels)")}
                  </button>
                  <a href={SITE_CONFIG.supportLink} target="_blank" rel="noopener noreferrer"
                    className="rounded-xl border border-maroon/25 text-maroon font-bold text-[11px] px-3 py-2">
                    {T("💬 WhatsApp channel link కావాలా? Support కి ping", "💬 Need WhatsApp channel link? Ping support")}
                  </a>
                  {packResend.msg && <span className="text-[11px] text-emerald-800">{packResend.msg}</span>}
                </div>
                <div className="mt-1 text-[10px] text-emerald-800">
                  {T("🔒 Numbers ఎప్పుడూ message లో పెట్టము — profile link + channel links మాత్రమే (consent తోనే number exchange).", "🔒 Numbers never go in messages — profile link + channel links only (number exchange only with consent).")}
                </div>
              </div>
            ) : null}
            <div className="mt-2 flex flex-wrap gap-2">
              <Link href={`/matches?id=${tsap}`} className="maroon-gradient text-white font-bold text-[12px] px-4 py-2.5 rounded-xl">
                {T("🔎 మీ 3 profiles చూడండి (FREE)", "🔎 See your 3 profiles (FREE)")}
              </Link>
              <Link href={`/requests?id=${tsap}`} className="border border-maroon/25 text-maroon font-bold text-[12px] px-4 py-2.5 rounded-xl">
                💌 Interests pampandi
              </Link>
              <Link href="/pricing" className="gold-gradient text-maroon font-bold text-[12px] px-4 py-2.5 rounded-xl">
                💰 ₹99 → 5 profiles + boost
              </Link>
            </div>
          </div>

          {result.referral?.my_code ? (
            <div className="bg-gradient-to-br from-maroon to-[#5b1030] text-white rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div className="font-bold text-[15px]">🤝 Mee referral code ready</div>
                <span className="text-[11px] font-bold gold-gradient text-maroon px-2.5 py-1 rounded-full">
                  ₹{result.referral.commission_offer || 50}/friend
                </span>
              </div>
              {result.referral.joined_with?.ok ? (
                <div className="mt-2 bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-[12px]">
                  {T(<>🤝 <b>{result.referral.joined_with.referrer_name} గారు</b> ద్వారా వచ్చారు — మీకు{" "}
                  <b>+{result.referral.joined_with.bonus_credits} FREE credit</b> వచ్చింది (code {result.referral.joined_with.referrer_code}).
                  వాళ్లకి కూడా మీ first payment తో ₹50 వెళ్తుంది 🙌</>, <>🤝 You came via <b>{result.referral.joined_with.referrer_name} garu</b> — you got{" "}
                  <b>+{result.referral.joined_with.bonus_credits} FREE credit</b> (code {result.referral.joined_with.referrer_code}).
                  They also get ₹50 on your first payment 🙌</>)}
                </div>
              ) : result.referral.joined_with?.reason && result.referral.joined_with.reason !== "no_code" ? (
                <div className="mt-2 bg-amber-400/20 border border-amber-200/40 rounded-xl px-3 py-2 text-[11px]">
                  ℹ️ {result.referral.joined_with.message_telugu || "Referral code lock అవ్వలేదు"} {T("— పర్వాలేదు, మీ సొంత code తో ఇప్పుడు start చెయ్యండి.", "— no problem, start now with your own code.")}
                </div>
              ) : null}
              <div className="mt-3 bg-white/10 border border-white/20 rounded-xl px-3 py-2 flex flex-wrap items-center gap-2">
                <span className="font-mono text-base font-bold break-all">{result.referral.my_code}</span>
                <button onClick={() => copy(String(result.referral.my_code), "refcode")}
                  className="shrink-0 text-[11px] font-bold gold-gradient text-maroon px-2.5 py-1 rounded-full">
                  {copied === "refcode" ? "copied ✓" : "code copy"}
                </button>
                <button onClick={() => copy(String(result.referral.my_link), "reflink")}
                  className="shrink-0 text-[11px] font-bold bg-white/15 border border-white/25 px-2.5 py-1 rounded-full">
                  {copied === "reflink" ? "copied ✓" : "link copy"}
                </button>
              </div>
              <div className="mt-1 text-[11px] opacity-90 break-all font-mono">{result.referral.my_link}</div>
              <div className="mt-2 text-[12px] opacity-95 telugu">{result.referral.earn_telugu}</div>
              <div className="mt-3 flex flex-wrap gap-2">
                <a href={`https://wa.me/?text=${encodeURIComponent(String(result.referral.share_message || ""))}`}
                  target="_blank" rel="noreferrer"
                  className="bg-green-600 text-white font-bold text-[12px] px-4 py-2.5 rounded-xl">
                  {T("📲 WhatsApp group కి పంపు", "📲 Send to WhatsApp group")}
                </a>
                <a href={result.referral.poster_url} download={`${result.referral.my_code}-manavivaha-referral.png`}
                  className="gold-gradient text-maroon font-bold text-[12px] px-4 py-2.5 rounded-xl">
                  ⬇️ Poster (QR tho)
                </a>
                <a href={result.referral.poster_status_url} target="_blank" rel="noreferrer"
                  className="bg-white/10 border border-white/25 text-white font-bold text-[12px] px-4 py-2.5 rounded-xl">
                  📱 Status poster
                </a>
                <Link href={`${result.referral.dashboard || "/referral"}?id=${tsap}`}
                  className="bg-white/10 border border-white/25 text-white font-bold text-[12px] px-4 py-2.5 rounded-xl">
                  📊 Referral dashboard
                </Link>
              </div>
              <ul className="mt-2 space-y-0.5 text-[11px] opacity-85 list-disc list-inside">
                {(result.referral.rule_telugu || []).map((t: string) => <li key={t}>{t}</li>)}
              </ul>
            </div>
          ) : null}

          {result.namaste_queued ? (
            <div className="bg-cream border border-gold/40 rounded-2xl p-4">
              <div className="font-bold text-maroon text-[14px]">🙏 Namaste message mee WhatsApp ki pampam</div>
              <div className="text-[12px] text-gray-700 mt-1 telugu">
                {T("మన side నుంచి మీ profile card + full details + next steps మీ number కి వెళ్తాయి (chatting లేదు — spam ఉండదు).", "Your profile card + full details + next steps come to your number from us (no chatting — no spam).")}
                {result.welcome_status?.manual_text ? T(" ఇది కొద్ది సేపట్లో మీకు వెళ్తుంది; అవసరమైతే మా support team కూడా పంపిస్తుంది.", " This reaches you shortly; our support team can also send it if needed.") : ""}
              </div>
              {result.welcome_status?.manual_text ? (
                <button onClick={() => copy(String(result.welcome_status.manual_text), "namaste")}
                  className="mt-2 text-[11px] font-bold gold-gradient text-maroon px-3 py-2 rounded-xl">
                  {copied === "namaste" ? "copied ✓" : "📋 Namaste message copy (support ki)"}
                </button>
              ) : null}
            </div>
          ) : null}

          {result.share_kit ? (
            <div className="bg-white rounded-2xl p-4 border border-gold/25 card-shadow">
              <div className="font-bold text-maroon text-[14px]">{T("🎴 Share kit — reach పెంచండి", "🎴 Share kit — boost reach")}</div>
              <div className="text-[12px] text-gray-600 mt-1 telugu">
                {T(<>Card image + caption ready. Status లో పెట్టండి — {result.share_kit.best_time_to_post}.</>, <>Card image + caption ready. Put on status — {result.share_kit.best_time_to_post}.</>)}
              </div>
              <pre className="mt-2 bg-cream rounded-xl p-3 text-[11px] whitespace-pre-wrap telugu">{result.share_kit.caption_short}</pre>
              <div className="mt-2 flex flex-wrap gap-2">
                <a href={result.share_kit.whatsapp_share} target="_blank" rel="noreferrer"
                  className="bg-green-600 text-white font-bold text-[12px] px-4 py-2.5 rounded-xl">WhatsApp status ki</a>
                <a href={result.share_kit.telegram_share} target="_blank" rel="noreferrer"
                  className="bg-blue-500 text-white font-bold text-[12px] px-4 py-2.5 rounded-xl">Telegram ki</a>
                <button onClick={() => copy(String(result.share_kit.caption), "kit")}
                  className="border border-maroon/25 text-maroon font-bold text-[12px] px-4 py-2.5 rounded-xl">
                  {copied === "kit" ? "copied ✓" : "📋 Caption copy"}
                </button>
                <a href={result.share_kit.card_image} download={`${tsap}-manavivaha-card.png`}
                  className="gold-gradient text-maroon font-bold text-[12px] px-4 py-2.5 rounded-xl">⬇️ Card image</a>
              </div>
              <ul className="mt-2 space-y-0.5">
                {(result.share_kit.tips_telugu || []).map((t: string) => (
                  <li key={t} className="text-[11px] text-gray-600">• {t}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="bg-white rounded-2xl p-4 card-shadow border border-gold/25">
            <div className="font-bold text-maroon text-[15px]">🎴 Mee profile card</div>
            {cardUrl ? (
              <img src={cardUrl} alt={`${tsap} profile card`} className="mt-3 w-full rounded-2xl border border-gold/30" />
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              <a href={cardUrl} download={`${tsap}-manavivaha-card.png`} className="maroon-gradient text-white font-bold text-[13px] px-4 py-2.5 rounded-xl">
                ⬇️ Download card
              </a>
              <a href={cardUrl} target="_blank" rel="noreferrer" className="border border-maroon/30 text-maroon font-bold text-[13px] px-4 py-2.5 rounded-xl">
                🔍 Full size
              </a>
              <button onClick={() => copy(share, "share")} className="gold-gradient text-maroon font-bold text-[13px] px-4 py-2.5 rounded-xl">
                {copied === "share" ? "copied ✓" : "📋 Share text copy"}
              </button>
              <a href={`https://wa.me/?text=${encodeURIComponent(share)}`} target="_blank" rel="noreferrer"
                className="bg-green-600 text-white font-bold text-[13px] px-4 py-2.5 rounded-xl">{T("WhatsApp లో పంపు", "Send on WhatsApp")}</a>
            </div>
          </div>

          <div className="bg-navy text-white rounded-2xl p-4">
            <div className="font-bold text-[14px]">{T("ఇప్పుడు ఏం చెయ్యాలి? (2 steps)", "What to do now? (2 steps)")}</div>
            <ol className="mt-2 text-[12px] space-y-1 opacity-90 list-decimal list-inside">
              <li>{T(`మీ profile మీ caste channel కి వెళ్తుంది (4 main + caste-wise)`, `Your profile goes to your caste channel (4 main + caste-wise)`)}</li>
              <li>{T(<>Matches చూసి <b>💌 Interest పంపు</b> — మొదటి 3 FREE, వాళ్లకి WhatsApp లో మీ profile వెళ్తుంది</>, <>See matches, <b>💌 send Interest</b> — first 3 FREE, they get your profile on WhatsApp</>)}</li>
            </ol>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href={`/requests?id=${tsap}`} className="gold-gradient text-maroon font-bold text-[13px] px-4 py-2.5 rounded-xl">💌 Requests dashboard</Link>
              <Link href={`/search/${tsap}`} className="bg-white/10 border border-white/25 text-white font-bold text-[13px] px-4 py-2.5 rounded-xl">{T("మీ profile చూడు", "See your profile")}</Link>
            </div>
          </div>

          <div className="text-[11px] text-gray-500 text-center">
            {T("⚠️ Photos/numbers watermark + log తో ఉంటాయి • Advance money అడిగితే report చెయ్యండి:", "⚠️ Photos/numbers stay with watermark + log • Report advance-money demands:")} {SITE_CONFIG.supportPhoneDisplay}
          </div>
        </div>
      </main>
    );
  }

  /* ================= WIZARD ================= */
  const pct = Math.round(((step - 1) / 5) * 100);
  const stepMeta = STEPS[step - 1];
  const distList = DISTRICTS_BY_STATE[f.state] || [];

  return (
    <main className="min-h-screen pb-32" ref={topRef}>
      {/* ---------- sticky progress ---------- */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-gold/25 safe-top shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-[12px] font-bold text-maroon shrink-0">← Home</Link>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="grid place-items-center w-8 h-8 rounded-full maroon-gradient text-white text-sm shrink-0 shadow-soft">{stepMeta.icon}</span>
                <div className="min-w-0">
                  <div className="text-[13px] font-bold text-ink truncate">
                    Step {step} <span className="opacity-40">/ 5</span> — <Duo en={stepMeta.label} te={stepMeta.labelTe || ""} />
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
                className={`group relative flex-1 flex items-center ${i === 0 ? "" : ""}`}>
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
          <div className="mt-1.5 flex items-center justify-end text-[10px] text-gray-500">
            <span>{savedAt ? T(`💾 draft save ${savedAt}`, `💾 draft saved ${savedAt}`) : "💾 auto-save ON"}</span>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-5">
        {/* 🆓 FREE vs PAID — step 1 lo matrame, collapsible (clutter తగ్గించడానికి) */}
        {step === 1 && (
          <details className="mb-4 bg-white rounded-2xl border border-gold/40 card-shadow p-4 group">
            <summary className="font-bold text-maroon text-[14px] cursor-pointer list-none flex items-center justify-between">
              <span>{T("🆓 Register 100% FREE — ఏంటి వస్తుంది, ఏంటి రాదు", "🆓 Register 100% FREE — what you get / don\u2019t")}</span>
              <span className="text-[11px] font-normal text-gray-400 group-open:hidden">{T("చూడండి →", "View →")}</span>
            </summary>
            <div className="mt-2 grid sm:grid-cols-2 gap-3 text-[12px]">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                <div className="font-bold text-emerald-900">{T("FREE లో ఇచ్చేది", "What FREE gives")}</div>
                <ul className="mt-1 space-y-0.5 text-emerald-900">
                  <li>✅ <b>{(clarity?.free?.profiles ?? 3)} profiles</b> {T("చూడొచ్చు (full details)", "you can see (full details)")}</li>
                  <li>✅ <b>{(clarity?.free?.requests ?? 3)} interests</b> {T("పంపొచ్చు", "you can send")}</li>
                  <li>✅ {T("Profile card FREE + channel post", "Profile card FREE + channel post")}</li>
                </ul>
              </div>
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3">
                <div className="font-bold text-rose-900">{T("FREE లో ఇవ్వనిది (🔒)", "What FREE doesn\u2019t give (🔒)")}</div>
                <ul className="mt-1 space-y-0.5 text-rose-900">
                  <li>🔒 {T("Phone number — accept అయ్యాకే", "Phone number — only after accept")}</li>
                  <li>🚫 {T("Chatting లేదు", "No chatting")}</li>
                </ul>
                <div className="mt-1 text-[11px]">{T(<>3 FREE తర్వాత: <b>₹99 → 5 profiles</b> · ₹499 → 50</>, <>After 3 FREE: <b>₹99 → 5 profiles</b> · ₹499 → 50</>)}</div>
              </div>
            </div>
            <div className="mt-2 text-[11px] text-gray-600">
              <a href="/pricing" className="underline font-bold text-maroon">Pricing</a> · <a href="/safety" className="underline font-bold text-maroon">Safety</a>
            </div>
          </details>
        )}

        {/* draft banner */}
        {draftFound && (
          <div className="mb-4 bg-cream border border-gold/40 rounded-2xl p-4">
            <div className="font-bold text-maroon text-[14px]">{T("💾 మీ పాత form దొరికింది", "💾 Found your saved form")}{draftSavedLabel(savedAt, te)}</div>
            <div className="text-[12px] text-gray-600 mt-1">{T("ఎక్కడ ఆగిపోయిందో అక్కడ నుంచి continue చెయ్యొచ్చు — మళ్లీ type చెయ్యక్కర్లేదు.", "Continue where you left off — no need to type again.")}</div>
            <div className="mt-3 flex gap-2">
              <button onClick={resumeDraft} className="maroon-gradient text-white font-bold text-[13px] px-4 py-2.5 rounded-xl">{T("▶️ కొనసాగించండి", "▶️ Continue")}</button>
              <button onClick={clearDraft} className="border border-maroon/25 text-maroon font-bold text-[13px] px-4 py-2.5 rounded-xl">{T("కొత్తగా start", "Start fresh")}</button>
            </div>
          </div>
        )}

        {refLocked && (
          <div className="mb-4 bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 text-[12px] text-emerald-900">
            {T(<>🤝 <b>{refInfo?.referrer_name ? `${refInfo.referrer_name} గారు` : "మీ friend"}</b> ద్వారా వచ్చారు
            (<b>{refLocked}</b> lock ✅) — వాళ్లకి ₹50 + మీకు <b>+{refInfo?.bonus_credits || 1} credit FREE</b>.
            {" "}Register FREE (3 profiles free) — తర్వాత మీ ₹99 plan తీసుకుంటే ఆ ₹50 వాళ్ల wallet కి వెళ్తుంది.</>, <>🤝 You came via <b>{refInfo?.referrer_name ? `${refInfo.referrer_name} garu` : "your friend"}</b>
            (<b>{refLocked}</b> locked ✅) — ₹50 for them + <b>+{refInfo?.bonus_credits || 1} credit FREE</b> for you.
            {" "}Register FREE (3 profiles free) — when you take your ₹99 plan, that ₹50 goes to their wallet.</>)}
          </div>
        )}
        {refInfo && refInfo.ok === false && (
          <div className="mb-4 bg-amber-50 border border-amber-300 rounded-2xl px-4 py-3 text-[12px] text-amber-900">
            ⚠️ {refInfo.message_telugu || T("ఈ code దొరకలేదు", "Code not found")} — {T("code లేకుండా register అవ్వొచ్చు, లేదా కింద సరి code వెయ్యండి.", "you can register without a code, or enter the correct code below.")}
          </div>
        )}

        {errs.length > 0 && (
          <div className={`mb-4 bg-rose-50 border border-rose-200 rounded-2xl px-4 py-3 ${shake ? "shake" : ""}`}>
            <div className="font-bold text-rose-800 text-[13px]">{T("ఇవి సరిచెయ్యాలి:", "Please fix these:")}</div>
            <ul className="mt-1 text-[12px] text-rose-700 list-disc list-inside">
              {errs.slice(0, 5).map((e) => <li key={e}>{e}</li>)}
            </ul>
          </div>
        )}

        <div key={step} className="step-slide bg-white rounded-3xl border border-gold/25 card-shadow p-4 sm:p-6 space-y-5">
          {/* ---------------- STEP 1 ---------------- */}
          {step === 1 && (
            <>
              <div>
                <label className="text-[13px] font-bold text-ink">{T("ఎవరు register చేస్తున్నారు?", "Who is registering?")} <span className="req-star">*</span></label>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  {[{ v: "Bride", l: T("👰 పెళ్లి కూతురు", "👰 Bride"), s: "Bride" }, { v: "Groom", l: T("🤵 పెళ్లి కొడుకు", "🤵 Groom"), s: "Groom" }].map((g) => (
                    <button key={g.v} type="button" onClick={() => set("gender", g.v)}
                      className={`rounded-2xl border-2 p-4 text-center transition-all active:scale-[0.98] ${f.gender === g.v ? "border-maroon bg-maroon-soft shadow-soft" : "border-gold/30 bg-white hover:border-maroon/40"}`}>
                      <div className="text-2xl">{g.v === "Bride" ? "👰" : "🤵"}</div>
                      <div className="font-bold text-[14px] text-maroon mt-1 telugu">{g.l}</div>
                      <div className="text-[11px] text-gray-500">{g.s}</div>
                    </button>
                  ))}
                </div>
              </div>

              <TextField label="Full name" value={f.full_name} onChange={(v) => set("full_name", v)} required
                placeholder="Lakshmi Reddy" hint={T("Card + channels లో ఇదే పేరు కనిపిస్తుంది", "This name shows on card + channels")} />

              <div className="grid grid-cols-2 gap-3">
                <TextField label="Date of birth" value={f.dob} onChange={(v) => set("dob", v)} required
                  type="date" max={maxDobFor18()} hint={T("Age automatic వస్తుంది", "Age comes automatically")} />
                <div>
                  <label className="text-[13px] font-bold text-ink">Age (auto)</label>
                  <div className="input-mobile mt-1 flex items-center justify-between bg-cream">
                    <span className="font-bold text-maroon">{f.age || "—"}</span>
                    <span className="text-[10px] text-gray-500">{T("DOB నుంచి", "from DOB")}</span>
                  </div>
                </div>
              </div>

              <SelectField label={<Duo en="Height" te="ఎత్తు" />} required value={f.height}
                onChange={(v) => set("height", v)} placeholder={duo("Select your height", "మీ ఎత్తు ఎంచుకోండి")}>
                {HEIGHTS.map((h) => (<option key={h} value={h}>{heightLabel(h)}</option>))}
              </SelectField>
              <PillGroup label={<Duo en="Your marital status" te="మీ వైవాహిక స్థితి" />} required
                value={f.marital_status}
                onChange={(v) => { set("marital_status", v); if (v === "Pelli Kaledu") set("children", ""); }}
                options={[
                  { v: "Pelli Kaledu", en: "Never married", te: "పెళ్లి కాలేదు" },
                  { v: f.gender === "Groom" ? "Widower" : "Widow",
                    en: f.gender === "Groom" ? "Widower" : "Widow",
                    te: f.gender === "Groom" ? "భార్య చనిపోయారు" : "భర్త చనిపోయారు" },
                  { v: "Awaiting Divorce", en: "Awaiting divorce", te: "విడాకులు రావాల్సి ఉంది" },
                  { v: "Divorced", en: "Divorced", te: "విడాకులు అయ్యాయి" },
                ]} />
              {f.marital_status && f.marital_status !== "Pelli Kaledu" ? (
                <PillGroup label={<Duo en="Number of children" te="పిల్లల సంఖ్య" />} required
                  value={f.children} onChange={(v) => set("children", v)}
                  options={CHILDREN_OPTIONS.map((c) => ({
                    v: c, en: c === "None" ? "None" : c,
                    te: c === "None" ? "లేరు" : (c === "4+" ? "4+ మంది" : `${c} మంది`),
                  }))} />
              ) : null}
              <SelectField label={<Duo en="Religion" te="మతం" />} value={f.religion}
                onChange={(v) => set("religion", v)} placeholder={duo("Select religion", "మతం ఎంచుకోండి")}>
                {RELIGIONS.map((r) => (<option key={r} value={r}>{r}</option>))}
              </SelectField>
              <ChipGroup label="Mother tongue" options={MOTHER_TONGUES.map((m) => ({ v: m }))} value={f.mother_tongue}
                onChange={(v) => set("mother_tongue", v)} />
            </>
          )}

          {/* ---------------- STEP 2 ---------------- */}
          {step === 2 && (
            <>
              <SearchSelect label={`Caste — ${f.religion || "Hindu"}`} required
                options={casteOpts} value={f.caste}
                onChange={(v) => { set("caste", v); set("sub_caste", ""); }}
                placeholder={T("Caste ఎంచుకోండి — search చెయ్యండి", "Select caste — type to search")}
                hint={T(`${f.religion || "Hindu"} కులాలు A–Z — మీ caste channel లో profile post అవుతుంది`, `${f.religion || "Hindu"} castes A–Z — profile posts to your caste channel`)} />
              {f.caste && (CASTE_SUBCASTES[f.caste]?.length ? (
                <SearchSelect label="Sub caste"
                  options={CASTE_SUBCASTES[f.caste]} value={f.sub_caste}
                  onChange={(v) => set("sub_caste", v)}
                  placeholder={T("Sub caste ఎంచుకోండి (ఉంటే)", "Select sub caste (if any)")}
                  hint={T("ఉంటే select చెయ్యండి — లేకపోతే వదిలేయండి", "Select if applicable — otherwise skip")} />
              ) : (
                <TextField label="Sub caste" optional value={f.sub_caste} onChange={(v) => set("sub_caste", v)}
                  placeholder="Pakanati / Deshathi / Telaga…" />
              ))}
              <div className="pt-1 pb-0.5 flex items-center gap-2">
                <span className="text-[12px] font-extrabold text-maroon">🕉️ {T("జ్యోతిషం (Astrology)", "Astrology (Jyothishyam)")}</span>
                <span className="h-px flex-1 bg-gold/40" />
                <span className="text-[10px] text-gray-500">{T("పొరుతం కి కావాలి", "needed for porutham")}</span>
              </div>
              <TextField label="Gothram" optional value={f.gothram} onChange={(v) => set("gothram", v)}
                placeholder="Bharadwaj" hint={T("Porutham report కి కావాలి", "Needed for porutham report")} />
              <SearchSelect label="Star / Nakshatram" options={NAKSHATRAS.map((n) => n.en)} value={f.star}
                teMap={Object.fromEntries(NAKSHATRAS.map((n) => [n.en, n.te]))}
                onChange={(v) => set("star", v)}
                placeholder={T("Star ఎంచుకోండి", "Select star")}
                hint={T("Star select చేస్తే rasi automatic వస్తుంది (porutham 10/10)", "Select star — rasi auto-suggests (porutham 10/10)")} />
              <SearchSelect label="Rasi" options={RASIS.map((r) => r.en)} value={f.rasi}
                teMap={Object.fromEntries(RASIS.map((r) => [r.en, r.te]))}
                onChange={(v) => set("rasi", v)} placeholder={T("Rasi ఎంచుకోండి", "Select rasi")} />
              <PillGroup label={T("మూలా నక్షత్రమా?", "Moola nakshatram?")} options={[{ v: "No", en: "No", te: "లేదు" }, { v: "Yes", en: "Yes", te: "ఉంది" }]} value={f.moola_nakshatram}
                onChange={(v) => set("moola_nakshatram", v)} />
              <PillGroup label={T("దోషం ఉందా?", "Any dosham?")} options={[{ v: "No", en: "No", te: "లేదు" }, { v: "Yes", en: "Yes", te: "ఉంది" }, { v: "Not Sure", en: "Not sure", te: "తెలియదు" }]} value={f.dosham}
                onChange={(v) => set("dosham", v)} />
            </>
          )}

          {/* ---------------- STEP 3 ---------------- */}
          {step === 3 && (
            <>
              <SearchSelect label="Education" required options={EDUCATIONS}
                value={f.education} onChange={(v) => set("education", v)}
                placeholder={T("Education ఎంచుకోండి", "Select education")} />
              <TextField label="Education detail" optional value={f.education_detail} onChange={(v) => set("education_detail", v)}
                placeholder="CSE / Finance / Nursing…" />
              <SearchSelect label="Job / Udyogam" required options={JOBS}
                value={f.job} onChange={(v) => set("job", v)}
                placeholder={T("Job ఎంచుకోండి", "Select job / occupation")} />
              <TextField label="Company" optional value={f.company} onChange={(v) => set("company", v)} placeholder="TCS / Govt / Own business" />
              <TextField label="Experience" optional value={f.experience} onChange={(v) => set("experience", v)}
                inputMode="numeric" placeholder="3 years" />
              <div className="grid grid-cols-2 gap-3">
                <ChipGroup label="Work type" options={WORK_TYPES.map((w) => ({ v: w }))} value={f.work_type}
                  onChange={(v) => set("work_type", v)} />
              </div>
              <ChipGroup label="Salary" required options={SALARIES.map((s) => ({ v: s }))} value={f.salary}
                onChange={(v) => set("salary", v)} hint={T("Approximate range చాలు — exact number వదలాల్సిన అవసరం లేదు", "Approximate range is enough — no need for exact number")} />
              <TextField label="Work location" optional value={f.work_location} onChange={(v) => set("work_location", v)}
                placeholder="Hyderabad / Gachibowli / USA" />
            </>
          )}

          {/* ---------------- STEP 4 ---------------- */}
          {step === 4 && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <ChipGroup label="State" required options={[{ v: "TS" }, { v: "AP" }, { v: "Other" }]} value={f.state}
                  onChange={(v) => { set("state", v); set("district", ""); }} />
              </div>
              <SearchSelect label="District" required options={distList}
                value={f.district} onChange={(v) => set("district", v)}
                placeholder={T("District ఎంచుకోండి", "Select district")}
                hint={T("District channel + local matches కి కావాలి", "Needed for district channel + local matches")} />
              <div className="grid grid-cols-1 gap-3">
                <TextField label="Mandal / Area" optional value={f.mandal} onChange={(v) => set("mandal", v)} placeholder="Miryalaguda" />
                <TextField label="Current city" optional value={f.current_city} onChange={(v) => set("current_city", v)} placeholder="Hyderabad" />
                <TextField label="Country" optional value={f.country} onChange={(v) => set("country", v)} placeholder="India / USA / UK / UAE…" hint={T("🌍 India కాకపోతే NRI ✈️ — NRI section లో కూడా కనిపిస్తారు", "🌍 Non-India = NRI ✈️ — also shows in NRI section")} />
                <TextField label="Pincode" optional value={f.pincode} onChange={(v) => set("pincode", v)} inputMode="numeric" placeholder="500032" />
                <TextField label="Native place" optional value={f.native_place} onChange={(v) => set("native_place", v)} placeholder="Nalgonda" />
              </div>

              <div className="bg-white rounded-2xl border border-gold/30 p-4 space-y-3">
                <div className="font-bold text-maroon text-[14px]">📱 Mobile number (verification)</div>
                <TextField label="WhatsApp / Mobile" required value={f.phone} onChange={(v) => set("phone", v.replace(/\D/g, "").slice(0, 10))}
                  type="tel" inputMode="tel" placeholder="98480 12345"
                  hint={T("మీ number ఎవరికీ కనిపించదు — interest accept అయ్యాకే exchange అవుతుంది", "Your number shows to nobody — exchanged only after interest accept")} />
                {!phoneOk ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <button type="button" onClick={sendOtp} disabled={busy || f.phone.length !== 10}
                      className="maroon-gradient text-white font-bold text-[13px] px-4 py-2.5 rounded-xl disabled:opacity-50">
                      {otpSent ? T("OTP మళ్లీ పంపు", "Resend OTP") : T("OTP పంపు", "Send OTP")}
                    </button>
                    {otpSent && (
                      <>
                        <input value={otpCode} onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                          inputMode="numeric" placeholder="4 digit OTP"
                          className="input-mobile w-32 text-center tracking-[0.4em] font-bold" />
                        <button type="button" onClick={verifyOtp} disabled={busy || otpCode.length !== 4}
                          className="gold-gradient text-maroon font-bold text-[13px] px-4 py-2.5 rounded-xl disabled:opacity-50">✅ Verify</button>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="text-[12px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                    {T("✅ Number verify అయ్యింది — verified badge profile కి వస్తుంది", "✅ Number verified — verified badge on your profile")}
                  </div>
                )}
                {otpMsg && <div className="text-[11px] text-gray-600">{otpMsg}</div>}
                <TextField label="Email" optional value={f.email} onChange={(v) => set("email", v)} inputMode="email" placeholder="name@gmail.com" />
                <div>
                  <label className="text-[13px] font-bold text-ink">🔑 Password <span className="text-maroon">*</span></label>
                  <div className="relative mt-1">
                    <input type={showPw ? "text" : "password"} value={f.password}
                      onChange={(e) => set("password", e.target.value.slice(0, 72))}
                      placeholder="Minimum 6 characters" autoComplete="new-password"
                      className="input-mobile pr-16" />
                    <button type="button" onClick={() => setShowPw(!showPw)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[12px] font-bold text-maroon px-2 py-1">
                      {showPw ? "🙈 Hide" : "👁️ Show"}
                    </button>
                  </div>
                  <div className="hint mt-1">Login ki number + password (OTP tho kooda login avvachu) · Marichipothe OTP tho reset ✅</div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <TextField label="Father name" optional value={f.father_name} onChange={(v) => set("father_name", v)} />
                <ChipGroup label="Father occupation" options={OCCUPATIONS.map((o) => ({ v: o }))} value={f.father_occupation}
                  onChange={(v) => set("father_occupation", v)} />
                <TextField label="Mother name" optional value={f.mother_name} onChange={(v) => set("mother_name", v)} />
                <ChipGroup label="Mother occupation" options={OCCUPATIONS.map((o) => ({ v: o }))} value={f.mother_occupation}
                  onChange={(v) => set("mother_occupation", v)} />
              </div>

              <Stepper label="Brothers" value={f.brothers} onChange={(v) => set("brothers", v)} />
              <Stepper label="Brothers (married)" value={f.brothers_married} onChange={(v) => set("brothers_married", v)} />
              <Stepper label="Sisters" value={f.sisters} onChange={(v) => set("sisters", v)} />
              <Stepper label="Sisters (married)" value={f.sisters_married} onChange={(v) => set("sisters_married", v)} />
              <ChipGroup label="Family type" options={FAMILY_TYPES.map((x) => ({ v: x }))} value={f.family_type}
                onChange={(v) => set("family_type", v)} />
              <PillGroup label={duo("Select family status", "కుటుంబ స్థాయి ఎంచుకోండి")}
                options={[
                  { v: "Middle Class", en: "Middle class", te: "మధ్య తరగతి" },
                  { v: "Upper Middle Class", en: "Upper middle class", te: "ఎగువ మధ్య తరగతి" },
                  { v: "Rich / Affluent (Elite)", en: "Rich / Affluent (Elite)", te: "ధనిక (ఎలైట్)" },
                ]}
                value={f.family_status} onChange={(v) => set("family_status", v)} />
              <ChipGroup label="Family values" options={FAMILY_VALUES.map((x) => ({ v: x }))} value={f.family_values}
                onChange={(v) => set("family_values", v)} />
            </>
          )}

          {/* ---------------- STEP 5 ---------------- */}
          {step === 5 && (
            <>
              <div className="bg-white rounded-2xl border border-gold/30 p-4">
                <div className="font-bold text-maroon text-[15px]">{T("📸 Photo (3x ఎక్కువ matches వస్తాయి)", "📸 Photo (3x more matches)")}</div>
                <div className="hint">{T("Phone gallery / camera నుంచి తీసుకోండి. Photo automatic గా compress అవుతుంది (fast upload). Watermark + private mode తో safe.", "Pick from phone gallery / camera. Photo auto-compresses (fast upload). Safe with watermark + private mode.")}</div>
                <div className="mt-3 flex items-center gap-3">
                  <label className="cursor-pointer">
                    <input type="file" accept="image/*" className="hidden"
                      onChange={(e) => pickPhoto(e.target.files?.[0])} />
                    <span className="inline-block maroon-gradient text-white font-bold text-[13px] px-4 py-3 rounded-xl">
                      {photoPreview ? "Photo marchu" : "📷 Photo select / camera"}
                    </span>
                  </label>
                  {photoPreview && (
                    <div className="relative">
                      <img src={photoPreview} alt="preview" className="w-20 h-20 rounded-2xl object-cover border-2 border-gold" />
                      <button type="button"
                        onClick={() => { setPhotoFile(null); setPhotoPreview(""); setPhotoUrl(""); setPhotoInfo(""); }}
                        className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-white border border-rose-300 text-rose-600 font-bold text-xs">✕</button>
                    </div>
                  )}
                </div>
                {photoInfo && <div className="hint mt-2">{photoInfo}</div>}
              </div>

              <Toggle label="🔒 Photo-private mode" sub={T("Public లో blur గా కనిపిస్తుంది — interest accept అయ్యాకే clear", "Shows blurred in public — clear only after interest accept")}
                value={!!f.photo_private} onChange={(v) => set("photo_private", v)} />

              <div>
                <label className="text-[13px] font-bold text-ink">{duo("A few words about myself", "నా గురించి కొన్ని మాటలు")} <span className="text-maroon">*</span></label>
                <textarea value={f.about_myself} onChange={(e) => set("about_myself", e.target.value.slice(0, 600))}
                  rows={4} placeholder="Nenu simple family, software engineer… (Telugu lo kooda rayochu)"
                  className="input-mobile mt-1 telugu" />
                <div className="mt-2 flex items-center gap-2">
                  <button type="button" onClick={startVoice}
                    className="border border-maroon/30 text-maroon font-bold text-[12px] px-3 py-2 rounded-xl">🎤 Voice tho cheppu</button>
                  <span className={`text-[10px] font-bold ${f.about_myself.trim().length >= 50 ? "text-emerald-600" : "text-gray-500"}`}>
                    {f.about_myself.trim().length >= 50 ? "✓ " : ""}{f.about_myself.length}/600 · {duo("Minimum 50 characters", "కనీసం 50 అక్షరాలు")}
                  </span>
                </div>
              </div>

              <ChipGroup label="Body type" options={BODY_TYPES.map((x) => ({ v: x }))} value={f.body_type}
                onChange={(v) => set("body_type", v)} />
              <ChipGroup label="Complexion" options={COMPLEXIONS.map((x) => ({ v: x }))} value={f.complexion}
                onChange={(v) => set("complexion", v)} />
              <ChipGroup label="Blood group" options={BLOOD_GROUPS.map((x) => ({ v: x }))} value={f.blood_group}
                onChange={(v) => set("blood_group", v)} />
              <PillGroup label={<Duo en="Your physical status" te="మీ ఆరోగ్య స్థితి" />}
                value={f.physical_status} onChange={(v) => set("physical_status", v)}
                options={[
                  { v: "Normal", en: "Normal", te: "సాధారణ" },
                  { v: "Physically Challenged", en: "Physically challenged", te: "దివ్యాంగులు" },
                ]} />

              <div className="bg-cream rounded-2xl border border-gold/30 p-4 space-y-3">
                <div className="font-bold text-maroon text-[14px]">💞 Mee expectations (matches filter ki)</div>
                <div className="grid grid-cols-2 gap-3">
                  <TextField label="Age from" optional value={f.exp_age_min} onChange={(v) => set("exp_age_min", v.replace(/\D/g, "").slice(0, 2))}
                    inputMode="numeric" placeholder="22" />
                  <TextField label="Age to" optional value={f.exp_age_max} onChange={(v) => set("exp_age_max", v.replace(/\D/g, "").slice(0, 2))}
                    inputMode="numeric" placeholder="30" />
                </div>
                <ChipGroup label="Job preference" options={JOBS.slice(0, 12).map((j) => ({ v: j }))} value={f.exp_job}
                  onChange={(v) => set("exp_job", v)} />
                <TextField label="Location preference" optional value={f.exp_location} onChange={(v) => set("exp_location", v)}
                  placeholder="Hyderabad / USA" />
                <ChipGroup label="Caste preference" options={[{ v: "Same caste" }, { v: "Any caste" }, { v: "Caste no bar" }]}
                  value={f.exp_caste} onChange={(v) => set("exp_caste", v)} />
                <TextField label="Free text expectations" optional value={f.expectations} onChange={(v) => set("expectations", v)}
                  placeholder="Govt job / business / respects elders…" />
              </div>

              <div className="bg-emerald-50/60 rounded-2xl border border-emerald-200 p-4">
                <label className="text-[13px] font-bold text-emerald-900">🤝 Referral code (friend/partner ichara?)</label>
                <input value={f.referral_code}
                  onChange={(e) => set("referral_code", e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 20))}
                  placeholder="Ex: CHA0001 (optional)"
                  aria-label="Referral code"
                  className="input-mobile mt-2 font-mono tracking-wide" />
                <div className="hint mt-1">
                  {refLocked
                    ? <>{T(<>✅ <b>{refLocked}</b> lock అయ్యింది — మీకు +{refInfo?.bonus_credits || 1} credit FREE 🎁</>, <>✅ <b>{refLocked}</b> locked — +{refInfo?.bonus_credits || 1} credit FREE for you 🎁</>)}</>
                    : T("Code ఉంటే మీకు +1 credit FREE + వాళ్లకి ₹50. Link తో వచ్చుంటే automatic fill అవుతుంది.", "With a code: +1 credit FREE for you + ₹50 for them. Auto-fills if you came via link.")}
                </div>
              </div>

              <label className="flex items-start gap-3 bg-white rounded-2xl border border-gold/30 p-4">
                <input type="checkbox" checked={!!f.consent} onChange={(e) => set("consent", e.target.checked)}
                  className="mt-1 w-5 h-5 accent-[#7A0C2E]" />
                <span className="text-[12px] text-gray-700">
{T(<>నా details <b>నిజం</b> అని confirm చేస్తున్నాను. <b>మన వివాహ</b> terms + privacy policy accept చేస్తున్నాను —
                  details channels లో post అవుతాయి, number accept అయ్యాకే share అవుతుంది.</>, <>I confirm my details are <b>true</b>. I accept <b>మన వివాహ</b> terms + privacy policy —
                  details post in channels, number shared only after accept.</>)}
                </span>
              </label>
            </>
          )}
        </div>

        {/* ---------------- trust strip ---------------- */}
        <div className="mt-6 grid grid-cols-2 gap-2 text-[11px] text-gray-600">
          {T(["🔒 Number ఎవరికీ ఇవ్వము", "🛡️ Watermark + log", "↩️ Decline అయితే refund", "🚫 Chatting లేదు"], ["🔒 Number never shared", "🛡️ Watermark + log", "↩️ Refund on decline", "🚫 No chatting"]).map((t) => (
            <div key={t} className="bg-white border border-gold/25 rounded-xl px-3 py-2">{t}</div>
          ))}
        </div>
      </div>

      {/* ---------------- sticky action bar ---------------- */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/97 backdrop-blur border-t border-gold/30 safe-bottom">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          {step > 1 && (
            <button onClick={back} className="px-5 py-3.5 rounded-2xl border border-maroon/25 text-maroon font-bold text-[14px]">
              ← {duo("Back", "వెనక్కి")}
            </button>
          )}
          <div className="flex-1 text-[10px] text-gray-500">
            {step < 5 ? `Next: ${duo(STEPS[step].label, STEPS[step].labelTe || "")}` : duo("Last step — submit", "చివరి దశ — సబ్మిట్ చేయండి")}
          </div>
          {step < 5 ? (
            <button onClick={next} className="px-7 py-3.5 rounded-2xl maroon-gradient text-white font-bold text-[15px]">
              {duo("Next", "తర్వాత")} →
            </button>
          ) : (
            <button onClick={submit} disabled={busy}
              className="px-6 py-3.5 rounded-2xl gold-gradient text-maroon font-bold text-[15px] disabled:opacity-60">
              {busy ? duo("Registering…", "నమోదు అవుతోంది…") : `✅ ${duo("Register now", "నమోదు చేయండి")}`}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

function draftSavedLabel(savedAt: string, te = true) {
  return savedAt ? (te ? ` (${savedAt} కి save అయ్యింది)` : ` (saved ${savedAt})`) : "";
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center text-gray-500 text-sm">
          {duo("Loading register form…", "Register form load అవుతుంది…")}
        </div>
      }
    >
      <Wizard />
    </Suspense>
  );
}
