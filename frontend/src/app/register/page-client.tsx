"use client";

/**
 * 👑 MANA VIVAHA — MATRIMONY REGISTRATION & PROFILE ONBOARDING
 * =========================================================================
 * • ⚡ Quick Registration Mode and 🌟 Detailed Registration Mode
 * • 🎁 Auto-Locked Referral Links + Explicit Interest-Request Credits
 * • 100% Progressive Profile Completion Loop with Seamless Handoff to /me
 * • Responsive Dual-Column Desktop Layout + Live Matrimony Card Preview
 * • Strict Photo Validation: Client-side HD compression, clarity check, privacy toggle
 * • No prefilled profile data; users enter and select their own details
 * • Real-time Draft Auto-Save & server-confirmed registration status
 */
import { Suspense, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import Reveal from "@/components/Reveal";
import { SITE_CONFIG } from "@/lib/site-config";
import { getLang, useLang } from "@/lib/lang";
import { apiDisplayMessage, readApiJson } from "@/lib/api";
import { ProfilePhotoError, prepareProfilePhoto, profilePhotoErrorMessage } from "@/lib/photo-upload";
import { stateFullName } from "@/lib/telugu-data";
import PhotoFlow from "@/components/PhotoFlow";
import ProtectedImage from "@/components/ProtectedImage";
import { TelegramIcon, WhatsAppIcon } from "@/components/BrandIcons";
import {
  BLOOD_GROUPS,
  BODY_TYPES,
  CASTE_SUBCASTES,
  CASTE_TELUGU,
  CHILDREN_OPTIONS,
  COMMUNITIES_BY_RELIGION,
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
  MOTHER_TONGUES,
  NAKSHATRAS,
  NAK_TO_RASI,
  NRI_COUNTRIES,
  OCCUPATIONS,
  OTHER_COMMUNITY_OPTION,
  OTHER_INDIAN_STATES,
  OTHER_LOCATIONS,
  PHYSICAL_STATUS,
  RASIS,
  SALARIES,
  SALARIES_DETAILED,
  SALARY_TELUGU,
  TS_DISTRICTS_DETAILED,
  AP_DISTRICTS_DETAILED,
  WORK_TYPES,
  WORK_TYPES_DETAILED,
  WORK_TYPE_TELUGU,
  ageFromDob,
  heightLabel,
  isNeverMarriedStatus,
  maxDobForAge,
  RELIGIONS,
  sortUniqueOptions,
} from "@/lib/telugu-data";

const DRAFT_KEY = "shubhalagnam_reg_draft_v6";

const REGISTRATION_ENGLISH_COPY: Record<string, string> = {
  "(ఐచ్ఛికం)": "(Optional)",
  "🔍 టైప్ చేసి వెతకండి / Type to search…": "🔍 Type to search…",
  "🔍 వెతకండి / Type to filter…": "🔍 Type to filter…",
  "ఎలాంటి ఫలితాలు లేవు": "No options found",
  "ఎంచుకోండి (Select)…": "Select…",
  "మీ పూర్తి పేరు నమోదు చేయండి": "Enter your full name",
  "వయసు పుట్టిన తేదీ నుంచి ఆటోమేటిక్‌గా లెక్కించబడుతుంది": "Age is calculated from the date of birth.",
  "DOB ఎంచుకున్న తర్వాత లెక్కించబడుతుంది": "Calculated after you enter your date of birth",
  "మతం ఎంచుకోండి (Select religion)": "Select a religion",
  "కులం / సంఘం ఎంచుకోండి…": "Select a community…",
  "సంఘాల జాబితా లోడ్ అవుతోంది…": "Loading communities…",
  "ఆఫ్‌లైన్ జాబితా ఉపయోగిస్తున్నాం; జాబితా పూర్తి కాకపోతే ‘Other / self-described’ ఎంచుకోండి.": "Using the local list. Choose ‘Other / self-described’ if your community is not listed.",
  "మతాన్ని బట్టి జాబితా మారుతుంది. జాబితాలో లేకపోతే ‘Other / self-described’ ఎంచుకోండి.": "Options depend on religion. Choose ‘Other / self-described’ if your community is not listed.",
  "మీరు ఉపయోగించే పేరు నమోదు చేయండి": "Enter the name you use",
  "ఉపకులం ఎంచుకోండి…": "Select a subgroup…",
  "ఉపకులాల జాబితా లోడ్ అవుతోంది…": "Loading subgroups…",
  "ఆఫ్‌లైన్ జాబితా ఉపయోగిస్తున్నాం; సరైనది లేకపోతే Other / self-described ఎంచుకోండి.": "Using the local list. Choose ‘Other / self-described’ if the right option is not listed.",
  "ఇది ఐచ్చికం. జాబితాలో సరైన పేరు లేకపోతే Other / self-described ఎంచుకోండి.": "Optional. Choose ‘Other / self-described’ if the right option is not listed.",
  "వర్తిస్తే మీ స్వంత వివరణ నమోదు చేయండి": "Enter your own description, if applicable",
  "ఈ ఐచ్చిక వివరానికి సిద్ధంగా ఉన్న జాబితా లేదు; మీరు స్వయంగా నమోదు చేయవచ్చు.": "No list is available for this optional detail. You can enter your own description.",
  "జిల్లా ఎంచుకోండి…": "Select a district…",
  "ధృవీకరణ & సంబంధాల అప్‌డేట్స్ కోసం": "For verification and match updates",
  "10 అంకెల మొబైల్ నంబర్": "10-digit mobile number",
  "10 అంకెల మొబైల్ (WhatsApp Number)": "Mobile number (10 digits)",
  "10 అంకెల మొబైల్ (WhatsApp No)": "Mobile number (10 digits)",
  "పాస్‌వర్డ్ (Password - Minimum 6 characters)": "Password (minimum 6 characters)",
  "పాస్‌వర్డ్ (Password)": "Password",
  "జిల్లా / నగరం (District / City)": "District / city",
  "జిల్లా (District)": "District",
  "కులం / సంఘం (Caste / Community)": "Community",
  "ఉపకులం (Sub-caste - Optional)": "Sub-community (optional)",
  "ఉపకులం / ఉపసంఘం (Optional)": "Sub-community (optional)",
  "కనీసం 6 అక్షరాలు (min 6 chars)": "At least 6 characters",
  "కనీసం 6 అక్షరాలు": "At least 6 characters",
  "రాష్ట్రం ఎంచుకోండి (Select state)": "Select a state",
  "విద్యార్హత ఎంచుకోండి (Optional)": "Select education (optional)",
  "ఉద్యోగం ఎంచుకోండి (Optional)": "Select an occupation (optional)",
  "కులం / సంఘం": "Community",
  "ఉపకులం": "Sub-community",
  "గోత్రం": "Gothram",
  "జిల్లా": "District",
  "మొబైల్ నంబర్": "Mobile number",
  "ఫోన్ నంబర్": "Phone number",
};

function registrationCopy(value: React.ReactNode, fallback = ""): React.ReactNode {
  if (getLang() !== "en" || typeof value !== "string") return value;
  const text = value.trim();
  if (!text) return text;
  if (REGISTRATION_ENGLISH_COPY[text]) return REGISTRATION_ENGLISH_COPY[text];
  const parenthetical = [...text.matchAll(/\(([^()]*)\)/g)]
    .map((match) => match[1].trim())
    .reverse()
    .find((candidate) => /[A-Za-z]/.test(candidate) && !/[\u0c00-\u0c7f]/.test(candidate));
  if (parenthetical) return parenthetical;
  if (!/[\u0c00-\u0c7f]/.test(text)) return value;
  return fallback;
}
const RELIGION_LABELS: Record<string, string> = {
  Hindu: "హిందూ (Hindu)",
  Muslim: "ముస్లిం (Muslim)",
  Christian: "క్రైస్తవ (Christian)",
  Sikh: "సిక్కు (Sikh)",
  Jain: "జైన (Jain)",
  Buddhist: "బౌద్ధ (Buddhist)",
  Other: "ఇతర మతం (Other)",
};

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
  profile_for: "",
  dob: "",
  birth_time: "",
  age: "",
  height: "",
  marital_status: "",
  children: "",
  religion: "",
  mother_tongue: "",
  caste: "",
  caste_custom: "",
  sub_caste: "",
  sub_caste_custom: "",
  gothram: "",
  star: "",
  rasi: "",
  moola_nakshatram: "",
  dosham: "",
  work_type: "",
  education: "",
  education_detail: "",
  job: "",
  company: "",
  salary: "",
  experience: "",
  work_location: "",
  father_name: "",
  father_occupation: "",
  mother_name: "",
  mother_occupation: "",
  brothers: "",
  brothers_married: "",
  sisters: "",
  sisters_married: "",
  family_type: "",
  family_status: "",
  family_values: "",
  native_place: "",
  state: "",
  district: "",
  nri_country: "",
  mandal: "",
  current_city: "",
  country: "",
  pincode: "",
  phone: "",
  email: "",
  password: "",
  photo_private: true,
  photo_consent_confirmed: false,
  about_myself: "",
  expectations: "",
  exp_age_min: "",
  exp_age_max: "",
  exp_job: "",
  exp_location: "",
  exp_caste: "",
  physical_status: "",
  body_type: "",
  complexion: "",
  blood_group: "",
  referral_code: "",
  consent_confirmed: false,
};

/* ---------------- UI Helpers ---------------- */
function Chip({ on, gold, children, onClick }: { on?: boolean; gold?: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={!!on}
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
  const groupId = useId();
  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return options;
    return options.filter((o) => o.v.toLowerCase().includes(needle) || (o.te || "").includes(q.trim()));
  }, [q, options]);

  return (
    <fieldset aria-required={required} className="min-w-0 space-y-1.5 border-0 p-0">
      <legend id={groupId} className="text-[13px] font-bold text-slate-800">
        {registrationCopy(label, "Details")} {required ? <span className="text-rose-600 font-black">*</span> : <span className="text-[11px] text-gray-400 font-normal">{registrationCopy("(ఐచ్ఛికం)")}</span>}
      </legend>
      {hint && <div className="text-[11px] text-slate-500">{registrationCopy(hint, "")}</div>}
      {searchable && (
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={registrationCopy("🔍 టైప్ చేసి వెతకండి / Type to search…") as string}
          aria-label={getLang() === "te" ? `${String(label)} — ఎంపికలను వెతకండి` : `${String(registrationCopy(label, "Options"))} — search options`}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-maroon/20 focus:border-maroon"
          inputMode="search"
        />
      )}
      <div role="group" aria-labelledby={groupId} className={`flex flex-wrap gap-2 ${cols === 1 ? "flex-col" : ""}`}>
        {list.slice(0, searchable ? 60 : 40).map((o) => (
          <Chip key={o.v} on={value === o.v} gold={te} onClick={() => onChange(value === o.v ? "" : o.v)}>
            {te && o.te ? <span className="telugu font-semibold">{o.te}</span> : null}
            <span>{o.v}</span>
          </Chip>
        ))}
      </div>
    </fieldset>
  );
}

function ConsentNotice({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 space-y-1.5">
      <label htmlFor="registration-consent" className="flex items-start gap-2.5 cursor-pointer">
        <input
          id="registration-consent"
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-[#7A0C2E]"
        />
        <span>{getLang() === "te"
          ? "ఈ ప్రొఫైల్ నాది లేదా దాని వివరాలను సమర్పించడానికి నాకు అనుమతి ఉంది. సేవా నిబంధనలు మరియు గోప్యతా విధానం ప్రకారం వివరాలను ప్రాసెస్ చేయడానికి నేను అంగీకరిస్తున్నాను."
          : "I confirm that this profile is mine or that I have permission to submit it. I consent to processing under the Terms and Privacy Policy."}</span>
      </label>
      <div className="pl-6 text-[11px]">
        {getLang() === "te" ? "చదవండి: " : "Read: "}<Link href="/terms" className="font-bold text-maroon underline">{getLang() === "te" ? "సేవా నిబంధనలు" : "Terms of Service"}</Link> · <Link href="/privacy" className="font-bold text-maroon underline">{getLang() === "te" ? "గోప్యతా విధానం" : "Privacy Policy"}</Link>
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
  disabled,
}: {
  label: React.ReactNode;
  options: string[];
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  hint?: string;
  placeholder?: string;
  teMap?: Record<string, string>;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const fieldId = useId();
  const optionsId = `${fieldId}-options`;
  const boxRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onDoc = (e: PointerEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDoc);
    return () => document.removeEventListener("pointerdown", onDoc);
  }, []);

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return options;
    return options.filter((o) => o.toLowerCase().includes(needle) || (teMap && teMap[o]?.toLowerCase().includes(needle)));
  }, [options, q, teMap]);

  return (
    <div className="space-y-1.5 relative" ref={boxRef}>
      <label htmlFor={fieldId} id={`${fieldId}-label`} className="text-[13px] font-bold text-slate-800 flex items-center justify-between">
        <span>
          {registrationCopy(label, "Details")} {required ? <><span aria-hidden="true" className="text-rose-600 font-black">*</span><span className="sr-only">{getLang() === "te" ? "తప్పనిసరి" : "Required"}</span></> : <span className="text-[11px] text-gray-400 font-normal">{registrationCopy("(ఐచ్ఛికం)")}</span>}
        </span>
      </label>
      {hint && <div className="text-[11px] text-slate-500">{registrationCopy(hint, "")}</div>}

      <button
        ref={triggerRef}
        id={fieldId}
        type="button"
        aria-labelledby={`${fieldId}-label ${fieldId}-value`}
        aria-expanded={open}
        aria-controls={optionsId}
        aria-disabled={disabled || undefined}
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className={`w-full text-left bg-white border rounded-xl px-3.5 py-2.5 text-xs font-medium flex items-center justify-between transition ${
          disabled ? "cursor-not-allowed bg-slate-50 text-slate-400" : open ? "border-maroon ring-2 ring-maroon/20" : "border-slate-200 hover:border-slate-300"
        }`}
      >
        <span id={`${fieldId}-value`} className={value ? "text-slate-900 font-bold" : "text-slate-400"}>
          {value ? (getLang() === "te" && teMap && teMap[value] ? `${teMap[value]} (${value})` : value) : registrationCopy(placeholder || "ఎంచుకోండి (Select)…", "Select…")}
        </span>
        <span className="text-slate-400 text-[10px]">▼</span>
      </button>

      {open && (
        <div
          id={optionsId}
          className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl p-2 max-h-60 overflow-y-auto space-y-1"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              setOpen(false);
              triggerRef.current?.focus();
            }
          }}
        >
          <input
            autoFocus
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label={getLang() === "te" ? "అందుబాటులో ఉన్న ఎంపికలను వెతకండి" : "Search available options"}
            placeholder={registrationCopy("🔍 వెతకండి / Type to filter…") as string}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-maroon mb-1"
          />
          {list.length === 0 ? (
            <div className="p-3 text-center text-xs text-slate-400">{registrationCopy("ఎలాంటి ఫలితాలు లేవు")}</div>
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
                <span>{getLang() === "te" && teMap && teMap[o] ? `${teMap[o]} (${o})` : o}</span>
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
  const groupId = useId();
  return (
    <fieldset aria-required={required} className="min-w-0 space-y-1.5 border-0 p-0">
      <legend id={groupId} className="text-[13px] font-bold text-slate-800">
        {label} {required && <span className="text-rose-600 font-black">*</span>}
      </legend>
      <div role="group" aria-labelledby={groupId} className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o.v}
            type="button"
            onClick={() => onChange(o.v)}
            aria-pressed={value === o.v}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
              value === o.v ? "bg-maroon text-white border-maroon shadow-xs" : "bg-white text-slate-700 border-slate-200"
            }`}
          >
            {getLang() === "te" ? (o.te || o.v) : o.v}
          </button>
        ))}
      </div>
    </fieldset>
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
  const fieldId = useId();
  return (
    <div className="space-y-1.5">
      <label htmlFor={fieldId} className="text-[13px] font-bold text-slate-800">
        {registrationCopy(label, "Details")} {required && <span className="text-rose-600 font-black">*</span>}
      </label>
      <select
        id={fieldId}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium"
      >
        {placeholder && <option value="">{registrationCopy(placeholder, "Select…")}</option>}
        {options.map((o) => (
          <option key={o.v} value={o.v}>
            {registrationCopy(o.l || o.v, "Option")}
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
  max,
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
  max?: string;
}) {
  const fieldId = useId();
  return (
    <div className="space-y-1.5">
      <label htmlFor={fieldId} className="text-[13px] font-bold text-slate-800 flex items-center justify-between">
        <span>
          {registrationCopy(label, "Details")} {required ? <span className="text-rose-600 font-black">*</span> : <span className="text-[11px] text-gray-400 font-normal">{registrationCopy("(ఐచ్ఛికం)")}</span>}
        </span>
      </label>
      {hint && <div className="text-[11px] text-slate-500">{registrationCopy(hint, "")}</div>}
      <input
        id={fieldId}
        aria-required={required}
        type={type}
        disabled={disabled}
        maxLength={maxLength}
        max={max}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={registrationCopy(placeholder, "Enter a value") as string}
        className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-maroon/20 focus:border-maroon disabled:bg-slate-100 disabled:text-slate-400"
      />
    </div>
  );
}

function RequiredProfilePhoto({
  file,
  preview,
  info,
  error,
  preparing,
  submitting,
  photoPrivate,
  photoConsent,
  onChoose,
  onPrivacyChange,
  onPhotoConsentChange,
}: {
  file: File | null;
  preview: string;
  info: string;
  error: string;
  preparing: boolean;
  submitting: boolean;
  photoPrivate: boolean;
  photoConsent: boolean;
  onChoose: (file?: File) => void;
  onPrivacyChange: (isPrivate: boolean) => void;
  onPhotoConsentChange: (confirmed: boolean) => void;
}) {
  const { lang } = useLang();
  const te = lang === "te";
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const privacyId = useId();
  const consentId = useId();

  return (
    <section aria-labelledby={`${privacyId}-title`} className="overflow-hidden rounded-3xl border border-[#D4AF37]/50 bg-gradient-to-br from-white via-amber-50/70 to-rose-50/60 shadow-sm">
      <div className="flex flex-col gap-4 p-4 sm:p-5 md:flex-row md:items-start">
        <div className="flex min-w-0 flex-1 gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#7A0C2E] text-2xl text-white shadow-md" aria-hidden="true">📸</div>
          <div className="min-w-0">
            <h3 id={`${privacyId}-title`} className={`text-sm font-black text-slate-900 ${te ? "telugu" : ""}`}>
              {te ? "ప్రొఫైల్ ఫోటో తప్పనిసరి" : "Profile photo required"} <span className="text-rose-700" aria-hidden="true">*</span>
              <span className="sr-only">{te ? " తప్పనిసరి" : " required"}</span>
            </h3>
            <p className={`mt-1 text-xs leading-relaxed text-slate-600 ${te ? "telugu" : ""}`}>
              {te
                ? "ఈ ప్రొఫైల్‌లో ఉన్న వ్యక్తి ఇటీవల తీసిన స్పష్టమైన portrait ఎంచుకోండి. ముఖం స్పష్టంగా, సహజ కాంతిలో ఉండాలి. Group photo, screenshot, heavy filter, text లేదా watermark వద్దు."
                : "Choose a recent, clear portrait of the person represented by this profile. Keep the face unobstructed and use natural light. No group photos, screenshots, heavy filters, text, or watermarks."}
            </p>
          </div>
        </div>

        <div className="flex w-full shrink-0 flex-col gap-2 sm:flex-row md:w-auto md:flex-col lg:flex-row">
          <input
            ref={cameraRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            capture="user"
            className="hidden"
            aria-label={te ? "కెమెరాతో ప్రొఫైల్ ఫోటో తీయండి" : "Take a profile photo with your camera"}
            onChange={(event) => {
              onChoose(event.currentTarget.files?.[0]);
              event.currentTarget.value = "";
            }}
          />
          <input
            ref={galleryRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            className="hidden"
            aria-label={te ? "గ్యాలరీ నుంచి ఫోటో ఎంచుకోండి" : "Choose a photo from your gallery"}
            onChange={(event) => {
              onChoose(event.currentTarget.files?.[0]);
              event.currentTarget.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            disabled={preparing || submitting}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#7A0C2E] px-4 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-[#5E0824] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7A0C2E] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
          >
            <span aria-hidden="true">📷</span>{te ? "కెమెరా" : "Use camera"}
          </button>
          <button
            type="button"
            onClick={() => galleryRef.current?.click()}
            disabled={preparing || submitting}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#7A0C2E]/25 bg-white px-4 py-2.5 text-xs font-black text-[#7A0C2E] transition hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7A0C2E] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
          >
            <span aria-hidden="true">🖼️</span>{te ? "గ్యాలరీ" : "Choose photo"}
          </button>
        </div>
      </div>

      {preparing || file ? (
        <div className="mx-4 mb-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/90 p-3 sm:mx-5 sm:flex-row sm:items-center">
          <div className="h-24 w-20 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
            {preview ? <Image src={preview} alt={te ? "ప్రొఫైల్ ఫోటో preview" : "Profile photo preview"} width={80} height={96} unoptimized className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-2xl" aria-hidden="true">📷</div>}
          </div>
          <div className="min-w-0 flex-1">
            <div className={`text-xs font-extrabold text-slate-800 ${te ? "telugu" : ""}`} aria-live="polite">
              {preparing
                ? (te ? "ఫోటో సిద్ధం చేస్తున్నాం…" : "Preparing your photo…")
                : (te ? "ఫోటో ఎంపికైంది" : "Photo selected")}
            </div>
            {file ? <div className="mt-0.5 truncate text-[11px] text-slate-500">{file.name} · {(file.size / (1024 * 1024)).toFixed(1)} MB</div> : null}
            {info && !preparing ? <p className={`mt-1 text-[11px] leading-relaxed text-emerald-800 ${te ? "telugu" : ""}`} role="status">{info}</p> : null}
          </div>
          {file ? (
            <button type="button" onClick={() => galleryRef.current?.click()} disabled={preparing || submitting} className="min-h-10 shrink-0 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7A0C2E] disabled:opacity-60">
              {te ? "ఫోటో మార్చండి" : "Change photo"}
            </button>
          ) : null}
        </div>
      ) : null}

      {error ? <p className={`mx-4 mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800 sm:mx-5 ${te ? "telugu" : ""}`} role="alert">{error}</p> : null}

      <div className="mx-4 mb-4 rounded-2xl border border-slate-200/80 bg-white/75 p-3 sm:mx-5">
        <label htmlFor={privacyId} className="flex cursor-pointer items-start gap-2.5">
          <input
            id={privacyId}
            type="checkbox"
            checked={photoPrivate}
            onChange={(event) => onPrivacyChange(event.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-[#7A0C2E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7A0C2E] focus-visible:ring-offset-2"
          />
          <span className="min-w-0">
            <span className={`block text-xs font-extrabold text-slate-800 ${te ? "telugu" : ""}`}>{te ? "నా ఫోటోను ప్రైవేట్‌గా ఉంచండి (సిఫార్సు)" : "Keep my photo private (recommended)"}</span>
            <span className={`mt-0.5 block text-[11px] leading-relaxed text-slate-600 ${te ? "telugu" : ""}`}>
              {te
                ? "ఇది default ఎంపిక. టిక్ తీసేస్తే, photo మరియు profile review ఆమోదం తర్వాత మీ ఫోటో public profile/search పేజీల్లో కనిపించవచ్చు; ఆ పేజీ చూడగల ఎవరైనా చూడగలరు. ఫోటో సమీక్ష identity verification కాదు."
                : "This is on by default. If unchecked, your photo may appear on public profile/search pages after photo and profile review; anyone who can access the page may view it. Photo review is not identity verification."}
            </span>
          </span>
        </label>
        <label htmlFor={consentId} className="mt-3 flex cursor-pointer items-start gap-2.5 border-t border-slate-100 pt-3">
          <input
            id={consentId}
            type="checkbox"
            aria-required="true"
            checked={photoConsent}
            onChange={(event) => onPhotoConsentChange(event.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-[#7A0C2E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7A0C2E] focus-visible:ring-offset-2"
          />
          <span className="min-w-0">
            <span className={`block text-xs font-extrabold text-slate-800 ${te ? "telugu" : ""}`}>
              {te ? "ఈ ఫోటోను అప్‌లోడ్ చేయడానికి నాకు అనుమతి ఉంది" : "I have permission to upload this photo"} <span className="text-rose-700" aria-hidden="true">*</span>
              <span className="sr-only">{te ? " తప్పనిసరి" : " required"}</span>
            </span>
            <span className={`mt-0.5 block text-[11px] leading-relaxed text-slate-600 ${te ? "telugu" : ""}`}>
              {te
                ? "ఈ ప్రొఫైల్‌లో ఉన్న వ్యక్తి అనుమతితో ఫోటోను సమర్పిస్తున్నానని నిర్ధారిస్తున్నాను. వేరొకరి కోసం నమోదు చేస్తే, ముందుగా వారి అనుమతి పొందండి."
                : "I confirm that the person represented by this profile has given permission for this photo to be submitted. If registering for someone else, obtain their consent first."}
            </span>
          </span>
        </label>
      </div>

      <p className={`px-4 pb-4 text-[11px] leading-relaxed text-slate-500 sm:px-5 ${te ? "telugu" : ""}`}>
        {te
          ? "JPEG, PNG లేదా WebP · HEIC‌ను browser చదవగలిగితే ఉపయోగించవచ్చు · గరిష్ఠం 25 MB original · అప్‌లోడ్‌కు ముందు compress అవుతుంది. Server format, resolution, brightness, sharpness‌ను తనిఖీ చేస్తుంది; suitability‌ను సిబ్బంది సమీక్షిస్తారు."
          : "JPEG, PNG, or WebP; HEIC works only if your browser can read it · up to 25 MB original · compressed before upload. The server checks file integrity, dimensions, brightness, and sharpness; staff review photo suitability."}
      </p>
    </section>
  );
}

/* ---------------- Main Wizard Component ---------------- */
function Wizard() {
  const { lang } = useLang();
  const te = lang === "te";
  const T = <V,>(a: V, b: V): V => (te ? a : b);
  const params = useSearchParams();

  // Quick Registration vs Detailed Registration mode
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
  const [photoInfo, setPhotoInfo] = useState("");
  const [photoError, setPhotoError] = useState("");
  const [photoPreparing, setPhotoPreparing] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [refLocked, setRefLocked] = useState("");
  const [refInfo, setRefInfo] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
  const topRef = useRef<HTMLDivElement>(null);

  const [casteOpts, setCasteOpts] = useState<string[]>([]);
  const [casteLoading, setCasteLoading] = useState(false);
  const [casteListOffline, setCasteListOffline] = useState(false);
  const [subcasteOpts, setSubcasteOpts] = useState<string[]>([]);
  const [subcasteLoading, setSubcasteLoading] = useState(false);
  const [subcasteListOffline, setSubcasteListOffline] = useState(false);

  const set = (k: string, v: any) => {
    setF((prev) => ({ ...prev, [k]: v }));
    setErrs([]);
  };

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreview("");
      return;
    }
    const previewUrl = URL.createObjectURL(photoFile);
    setPhotoPreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [photoFile]);

  const selectProfilePhoto = async (file?: File) => {
    if (!file) return;
    setPhotoPreparing(true);
    setPhotoError("");
    setPhotoInfo("");
    setPhotoFile(null);
    try {
      const prepared = await prepareProfilePhoto(file);
      setPhotoFile(prepared);
      setPhotoInfo(T(
        "అప్‌లోడ్‌కు సిద్ధంగా ఉంది. Serverలో ఫైల్, resolution, clarity తనిఖీ చేసిన తర్వాత సిబ్బంది సమీక్షిస్తారు.",
        "Ready to submit. The server checks the file, dimensions, and clarity before staff review.",
      ));
      setErrs((current) => current.filter((message) => !/(add a clear profile photo|profile photo is required|photo is still being prepared|ప్రొఫైల్ ఫోటోను జోడించండి|ఫోటో సిద్ధమవుతోంది)/i.test(message)));
    } catch (error) {
      const code = error instanceof ProfilePhotoError ? error.code : "encode";
      setPhotoError(profilePhotoErrorMessage(code, te));
    } finally {
      setPhotoPreparing(false);
    }
  };

  const setReligion = (religion: string) => {
    setF((prev) => ({
      ...prev,
      religion,
      caste: "",
      caste_custom: "",
      sub_caste: "",
      sub_caste_custom: "",
    }));
    setErrs([]);
  };

  const setCaste = (caste: string) => {
    setF((prev) => ({
      ...prev,
      caste,
      caste_custom: caste === "Other / self-described" ? prev.caste_custom : "",
      sub_caste: "",
      sub_caste_custom: "",
    }));
    setErrs([]);
  };

  const setSubcaste = (sub_caste: string) => {
    setF((prev) => ({
      ...prev,
      sub_caste,
      sub_caste_custom: sub_caste === "Other / self-described" ? prev.sub_caste_custom : "",
    }));
    setErrs([]);
  };

  useEffect(() => {
    const religion = String(f.religion || "");
    let live = true;
    if (!religion) {
      setCasteOpts([]);
      setCasteLoading(false);
      setCasteListOffline(false);
      return () => { live = false; };
    }

    const local = COMMUNITIES_BY_RELIGION[religion] || [];
    setCasteOpts(sortUniqueOptions([...local, OTHER_COMMUNITY_OPTION]));
    setCasteLoading(true);
    setCasteListOffline(false);
    fetch(`/api/meta/castes?religion=${encodeURIComponent(religion)}`)
      .then((r) => {
        if (!r.ok) throw new Error("Community list request failed");
        return readApiJson(r);
      })
      .then((d) => {
        if (!live) return;
        if (!d?.success || !Array.isArray(d.castes)) throw new Error("Invalid community list response");
        const apiOptions = (d.castes as unknown[])
          .map((value) => String(value || "").trim())
          .filter(Boolean);
        setCasteOpts(sortUniqueOptions([...apiOptions, ...local, OTHER_COMMUNITY_OPTION]));
        setCasteLoading(false);
      })
      .catch(() => {
        if (!live) return;
        setCasteOpts(sortUniqueOptions([...local, OTHER_COMMUNITY_OPTION]));
        setCasteListOffline(true);
        setCasteLoading(false);
      });

    return () => { live = false; };
  }, [f.religion]);

  useEffect(() => {
    const religion = String(f.religion || "");
    const caste = String(f.caste || "");
    let live = true;
    if (!religion || !caste || caste === "Other / self-described") {
      setSubcasteOpts([]);
      setSubcasteLoading(false);
      setSubcasteListOffline(false);
      return () => { live = false; };
    }

    const local = religion === "Hindu" ? (CASTE_SUBCASTES[caste] || []) : [];
    const withSelfDescription = (values: string[]) =>
      sortUniqueOptions([...values, OTHER_COMMUNITY_OPTION]);
    setSubcasteOpts(withSelfDescription(local));
    setSubcasteLoading(true);
    setSubcasteListOffline(false);

    fetch(`/api/meta/subcastes?religion=${encodeURIComponent(religion)}&caste=${encodeURIComponent(caste)}`)
      .then((response) => {
        if (!response.ok) throw new Error("Sub-community request failed");
        return readApiJson(response);
      })
      .then((data) => {
        if (!live) return;
        if (!data?.success || !Array.isArray(data.subcastes)) throw new Error("Invalid sub-community list response");
        setSubcasteOpts(withSelfDescription([...data.subcastes, ...local]));
        setSubcasteLoading(false);
      })
      .catch(() => {
        if (!live) return;
        setSubcasteOpts(withSelfDescription(local));
        setSubcasteListOffline(true);
        setSubcasteLoading(false);
      });

    return () => { live = false; };
  }, [f.religion, f.caste]);

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
        .then((r) => readApiJson(r))
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
      const draftData = d.data && typeof d.data === "object" ? d.data : {};
      const draftNeverMarried = isNeverMarriedStatus(draftData.marital_status);
      setF({
        ...DEFAULT_FORM,
        ...draftData,
        marital_status: draftNeverMarried ? "Pelli Kaledu" : draftData.marital_status || "",
        children: draftNeverMarried ? "" : draftData.children || "",
        password: "",
        consent_confirmed: false,
        photo_consent_confirmed: false,
      });
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
    setPhotoFile(null);
    setPhotoInfo("");
    setPhotoError("");
  };

  useEffect(() => {
    if (result) return;
    const t = setTimeout(() => {
      try {
        const now = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
        const draftData = { ...f, password: "", consent_confirmed: false, photo_consent_confirmed: false };
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ data: draftData, step, savedAt: now }));
        setSavedAt(now);
      } catch {
        /* ignore */
      }
    }, 700);
    return () => clearTimeout(t);
  }, [f, step, result]);

  useEffect(() => {
    const age = ageFromDob(f.dob);
    const nextAge = age === null ? "" : String(age);
    setF((prev) => prev.age === nextAge ? prev : ({ ...prev, age: nextAge }));
  }, [f.dob]);

  useEffect(() => {
    if (f.star && !f.rasi && NAK_TO_RASI[f.star]) setF((prev) => ({ ...prev, rasi: NAK_TO_RASI[f.star] }));
  }, [f.star, f.rasi]);

  const scrollTop = () => topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const validateQuick = (): string[] => {
    const e: string[] = [];
    if (!f.gender) e.push(T("వధువు / వరుడు ఎంచుకోండి (Select Bride / Groom)", "Select Bride / Groom"));
    if (!String(f.full_name).trim()) e.push(T("పూర్తి పేరు నమోదు చేయండి (Enter full name)", "Enter full name"));
    if (!f.dob) e.push(T("పుట్టిన తేదీ ఎంచుకోండి (Select date of birth)", "Select date of birth"));
    else if ((ageFromDob(f.dob) ?? 0) < (f.gender === "Groom" ? 21 : 18)) e.push(T("చట్టబద్ధమైన కనీస వయసు నెరవేరే సరైన DOB ఇవ్వండి", "Enter a DOB meeting the minimum legal age (21 for Groom, 18 for Bride)"));
    if (!f.religion) e.push(T("మతం ఎంచుకోండి (Select religion)", "Select religion"));
    if (!f.caste) e.push(T("కులం / సంఘం ఎంచుకోండి (Select caste / community)", "Select caste / community"));
    if (f.caste === "Other / self-described" && !String(f.caste_custom || "").trim()) e.push(T("మీ కులం / సంఘం పేరు నమోదు చేయండి", "Enter your community name"));
    if (f.sub_caste === "Other / self-described" && !String(f.sub_caste_custom || "").trim()) e.push(T("మీ ఉపకులం / ఉపసంఘం పేరు నమోదు చేయండి", "Enter your subgroup name"));
    if (!f.state) e.push(T("రాష్ట్రం / ప్రాంతం ఎంచుకోండి (Select state / region)", "Select state / region"));
    if (!f.district) e.push(T("జిల్లా / నగరం ఎంచుకోండి (Select district / city)", "Select district / city"));
    if (!/^\d{10}$/.test(String(f.phone))) e.push(T("10 అంకెల మొబైల్ నంబర్ ఇవ్వండి (Enter 10-digit mobile number)", "Enter a 10-digit mobile number"));
    if (String(f.password || "").length < 6) e.push(T("పాస్‌వర్డ్ కనీసం 6 అక్షరాలు ఉండాలి", "Password must contain at least 6 characters"));
    if (!photoFile) e.push(T("కొనసాగించే ముందు స్పష్టమైన ప్రొఫైల్ ఫోటోను జోడించండి", "Add a clear profile photo before continuing"));
    if (!f.photo_consent_confirmed) e.push(T("ఈ ఫోటోను అప్‌లోడ్ చేయడానికి అనుమతి ఉన్నట్లు నిర్ధారించండి", "Confirm you have permission to upload this photo"));
    if (photoPreparing) e.push(T("ఫోటో సిద్ధమవుతోంది — పూర్తయ్యే వరకు వేచి ఉండండి", "Your photo is still being prepared; please wait"));
    return e;
  };

  const validateStep = (s: number): string[] => {
    const e: string[] = [];
    if (s === 1) {
      if (!f.gender) e.push(T("వధువు / వరుడు ఎంచుకోండి (Select Bride / Groom)", "Select Bride / Groom"));
      if (!String(f.full_name).trim()) e.push(T("పూర్తి పేరు నమోదు చేయండి (Enter full name)", "Enter full name"));
      if (!f.dob) e.push(T("పుట్టిన తేదీ ఎంచుకోండి (Select date of birth)", "Select date of birth"));
      else if ((ageFromDob(f.dob) ?? 0) < (f.gender === "Groom" ? 21 : 18)) e.push(T("చట్టబద్ధమైన కనీస వయసు నెరవేరే సరైన DOB ఇవ్వండి", "Enter a DOB meeting the minimum legal age (21 for Groom, 18 for Bride)"));
      if (!f.height) e.push(T("ఎత్తు ఎంచుకోండి (Select your height)", "Select your height"));
      if (!f.marital_status) e.push(T("వైవాహిక స్థితి ఎంచుకోండి (Select marital status)", "Select marital status"));
      if (!f.religion) e.push(T("మతం ఎంచుకోండి (Select religion)", "Select religion"));
      if (f.marital_status && !isNeverMarriedStatus(f.marital_status) && !f.children) {
        e.push(T("పిల్లల సంఖ్య ఎంచుకోండి", "Select the number of children"));
      }
    }
    if (s === 2) {
      if (!f.religion) e.push(T("మతం ఎంచుకోండి (Select religion)", "Select religion"));
      if (!f.caste) e.push(T("కులం / సంఘం ఎంచుకోండి (Select caste / community)", "Select caste / community"));
      if (f.caste === "Other / self-described" && !String(f.caste_custom || "").trim()) e.push(T("మీ కులం / సంఘం పేరు నమోదు చేయండి", "Enter your community name"));
      if (f.sub_caste === "Other / self-described" && !String(f.sub_caste_custom || "").trim()) e.push(T("మీ ఉపకులం / ఉపసంఘం పేరు నమోదు చేయండి", "Enter your subgroup name"));
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
      if (String(f.password || "").length < 6) e.push(T("పాస్‌వర్డ్ కనీసం 6 అక్షరాలు ఉండాలి", "Password must contain at least 6 characters"));
    }
    if (s === 5) {
      if (!photoFile) e.push(T("నమోదుకు ముందు తప్పనిసరిగా స్పష్టమైన ప్రొఫైల్ ఫోటోను జోడించండి", "A clear profile photo is required before registration"));
      if (!f.photo_consent_confirmed) e.push(T("ఈ ఫోటోను అప్‌లోడ్ చేయడానికి అనుమతి ఉన్నట్లు నిర్ధారించండి", "Confirm you have permission to upload this photo"));
      if (photoPreparing) e.push(T("ఫోటో సిద్ధమవుతోంది — పూర్తయ్యే వరకు వేచి ఉండండి", "Your photo is still being prepared; please wait"));
      const about = String(f.about_myself || "").trim();
      if (about && about.length < 50) e.push(T("నా గురించి కనీసం 50 అక్షరాలు రాయండి", "If you add an About section, enter at least 50 characters"));
      if (about && (/(?:\+?91[\s-]?)?[6-9]\d{9}/.test(about) || /[^\s@]+@[^\s@]+\.[^\s@]+/.test(about))) {
        e.push(T("నా గురించి విభాగంలో ఫోన్ / ఈమెయిల్ ఇవ్వకండి", "Do not include a phone number or email in About"));
      }
    }
    if (s === 5) {
      const about = String(f.about_myself || "").trim();
      if (about && about.length < 50) e.push(T("నా గురించి కనీసం 50 అక్షరాలు రాయండి", "If you add an About section, enter at least 50 characters"));
      if (about && (/(?:\+?91[\s-]?)?[6-9]\d{9}/.test(about) || /[^\s@]+@[^\s@]+\.[^\s@]+/.test(about))) {
        e.push(T("నా గురించి విభాగంలో ఫోన్ / ఈమెయిల్ ఇవ్వకండి", "Do not include a phone number or email in About"));
      }
    }
    return e;
  };

  const executeSubmit = async (isQuick = false) => {
    const errsList = isQuick
      ? validateQuick()
      : step === 5
        ? [1, 2, 3, 4, 5].flatMap((stepNumber) => validateStep(stepNumber))
        : validateStep(step);
    if (!f.consent_confirmed) errsList.push(T("దయచేసి సమ్మతి ఇచ్చినట్లు నిర్ధారించండి", "Please confirm consent before creating the profile"));
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

      const payload: Record<string, any> = { ...f };

      strings.forEach((k) => fd.append(k, String(payload[k] ?? "")));
      fd.append("caste_custom", String(payload.caste_custom ?? ""));
      fd.append("sub_caste_custom", String(payload.sub_caste_custom ?? ""));
      fd.append("age", String(ageFromDob(payload.dob) ?? ""));
      fd.append("photo_private", String(!!payload.photo_private));
      fd.append("photo_consent_confirmed", String(!!payload.photo_consent_confirmed));
      fd.append("consent_confirmed", String(!!payload.consent_confirmed));
      if (!photoFile) throw new Error(T("నమోదుకు ముందు స్పష్టమైన ప్రొఫైల్ ఫోటోను జోడించండి", "A clear profile photo is required before registration"));
      fd.append("photo_file", photoFile, photoFile.name);
      if (refLocked) fd.append("referral_code", refLocked);

      const r = await fetch("/api/register", { method: "POST", body: fd });
      const d = await readApiJson(r);
      if (!r.ok) {
        const msg = apiDisplayMessage(d, te, te
          ? "నమోదులో సమస్య ఏర్పడింది — దయచేసి మళ్లీ ప్రయత్నించండి"
          : "Registration could not be completed. Review your entries and try again.");
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



  /* ================= SUCCESS SCREEN ================= */
  if (result) {
    const tsap = result.tsap_id || result.user_id || "";
    const cardUrl = tsap ? result.card_url || `/cards/${tsap}.png` : "";
    const phoneVerified = result.phone_verified === true;
    const profileApproved = result.is_approved === true;
    return (
      <div className="min-h-dvh py-8 px-4 bg-[#FAF7F2]">
        <div className="max-w-2xl mx-auto bg-white rounded-3xl border border-gold/40 shadow-2xl overflow-hidden animate-fade">
          {/* Header Banner */}
          <div className="maroon-gradient p-6 text-white text-center space-y-2">
            <div className="text-4xl">🎉 💍 🌸</div>
            <h1 className="text-xl sm:text-2xl font-black">
              {T("నమోదు విజయవంతంగా పూర్తయింది!", "Registration Successful!")}
            </h1>
            <p className="text-xs sm:text-sm text-gold-light font-medium" lang={te ? "te-IN" : "en-IN"}>
              {T(
                `మీ ప్రొఫైల్ ఐడీ: ${tsap} • ${profileApproved ? "ఆమోదించబడింది" : "సమీక్ష కోసం సమర్పించబడింది"}`,
                `Profile ID: ${tsap} • ${profileApproved ? "Approved" : "Submitted for review"}`,
              )}
            </p>
          </div>

          <div className="p-5 sm:p-6 space-y-5">
            {/* Profile ID plus the actual approval and phone-verification state. */}
            <div className="bg-amber-50/80 border border-gold/50 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="text-xs text-slate-500 font-bold block">{T("మీ TSAP మ్యాట్రిమోనీ ఐడీ", "Your TSAP profile ID")}</span>
                <span className="break-all text-lg sm:text-2xl font-black text-maroon font-mono">{tsap}</span>
              </div>
              <div className="flex flex-col items-start sm:items-end gap-1.5">
                <span className={`px-3 py-1.5 text-xs font-black rounded-full border ${profileApproved ? "bg-emerald-100 text-emerald-800 border-emerald-300" : "bg-amber-100 text-amber-900 border-amber-300"}`}>
                  {profileApproved ? T("✓ ప్రొఫైల్ ఆమోదించబడింది", "✓ Profile approved") : T("సమీక్ష కోసం వేచి ఉంది", "Review pending")}
                </span>
                <span className={`px-3 py-1.5 text-xs font-bold rounded-full border ${phoneVerified ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-slate-100 text-slate-700 border-slate-200"}`}>
                  {phoneVerified ? T("✓ ఫోన్ OTP ధృవీకరించబడింది", "✓ Phone OTP verified") : T("ఫోన్ OTP ధృవీకరణ పెండింగ్", "Phone OTP verification pending")}
                </span>
              </div>
            </div>

            {/* What you got card */}
            <div className="bg-amber-50/60 border border-gold/30 rounded-2xl p-3.5 text-xs text-slate-700 space-y-1">
              <div className="font-bold text-maroon">🎁 {T("మీ అకౌంట్ వివరాలు & కాంటాక్ట్ స్టేటస్:", "Your account and contact status:")}</div>
              <div>{T(<><b>3 requests</b> సిద్ధంగా ఉన్నాయి • phone numbers <b>🔒 locked</b> (గోప్యతా రక్షణతో).</>, <><b>3 requests</b> are ready • phone numbers are <b>🔒 locked</b> for privacy.</>)}</div>
            </div>

            {/* Referral confirmation if attached */}
            {(result.joined_with?.ok || refLocked) && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 flex items-center gap-3 text-xs text-emerald-900">
                <span className="text-xl">🎁</span>
                <div>
                  <span className="font-bold">{T("రిఫరల్ బోనస్ యాక్టివేట్ అయ్యింది! ", "Referral bonus activated! ")}</span>
                  <span>{T(
                    `మీకు +${result.joined_with?.bonus_credits ?? 1} interest-request credit జోడించబడింది. ఇది cash కాదు, contact unlock కూడా కాదు; referrer కు వచ్చే షరతులతో కూడిన ₹50 reward వేరు.`,
                    `You received +${result.joined_with?.bonus_credits ?? 1} interest-request credit. It is not cash or a contact unlock; the referrer's separate ₹50 reward is conditional.`,
                  )}</span>
                </div>
              </div>
            )}

            {/* Referral Dashboard & Poster Card */}
            {(result.referral?.my_code || result.my_referral_code) && (
              <div className="bg-amber-50 border border-gold/40 rounded-2xl p-3.5 text-xs space-y-1">
                <div className="font-bold text-maroon">🎁 {T("మీ రిఫరల్ కోడ్:", "Your referral code:")} {result.referral?.my_code || result.my_referral_code}</div>
                <div className="text-slate-600">{T(
                  "Valid referral attach పై referrer కు +2, కొత్త user కు +1 interest-request credits వస్తాయి; ఇవి cash కావు. Referrer కు ₹50 ఒక్కసారి మాత్రమే అర్హత ఉండవచ్చు—referee మొదటి S_99/S_199/S_299/S_499 consumer-plan payment కనీసం ₹99 అయితే; exclusions మరియు payout manual review వర్తిస్తాయి.",
                  "A valid referral adds +2 interest-request credits for the referrer and +1 for the new member; credits are not cash. The referrer may qualify for a one-time ₹50 reward only if the new member's first eligible consumer-plan payment is at least ₹99. Exclusions and manual payout review apply.",
                )}</div>
                <Link href={`/referral?id=${tsap}`} className="text-maroon font-bold underline inline-block pt-1">
                  {T("Referral dashboard కి వెళ్లండి →", "Open referral dashboard →")}
                </Link>
                <a href={result.referral?.poster_url || `/api/referral/${tsap}/poster.png`} target="_blank" rel="noreferrer"
                  className="ml-3 text-maroon font-bold underline inline-block pt-1">{T("Referral QR poster →", "Referral QR poster →")}</a>
              </div>
            )}

            {/* Set Partner Preferences Now Card */}
            <div className="bg-gradient-to-r from-amber-500 to-rose-600 rounded-2xl p-4 text-white space-y-2 shadow-md">
              <div className="flex items-center gap-2">
                <span className="text-xl">🎯</span>
                <span className="font-black text-sm">{T("మీకు ఎలాంటి సంబంధం కావాలి? (Partner Preferences)", "Set your partner preferences")}</span>
              </div>
              <p className="text-[11px] text-amber-100">
                {T(
                  "మీకు నచ్చిన కమ్యూనిటీలు, వయస్సు, విద్యార్హతలు మరియు జిల్లాలను ఎంచుకోండి. ఈ ప్రాధాన్యతలు మీ శోధనకు సహాయపడతాయి; సరిపోలికలకు హామీ కాదు.",
                  "Choose preferred communities, age range, education, and districts. These preferences guide your search; matches are not guaranteed.",
                )}
              </p>
              <Link
                href="/me"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-[#7A0C2E] font-black text-xs hover:bg-amber-100 transition shadow"
              >
                <span>🎯</span>
                <span>{T("నా ప్రిఫరెన్సెస్ సెట్ చేయండి →", "Set my preferences →")}</span>
              </Link>
            </div>

            {/* Photo Flow upload */}
            <div className="border border-gold/30 rounded-2xl p-4 bg-white space-y-2">
              <PhotoFlow tsapId={tsap} />
            </div>

            {/* Profile details can be completed later; no sample progress or response promise. */}
            <div className="rounded-2xl border border-gold/40 bg-gradient-to-r from-amber-50 via-rose-50 to-amber-50 p-4">
              <div className="font-bold text-slate-900">📊 {T("ప్రొఫైల్ వివరాలు తర్వాత కూడా పూర్తి చేయవచ్చు", "You can complete profile details later")}</div>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
                {T("నమోదు తర్వాత My Profile లో మీ వివరాలు ఎప్పుడైనా సవరించండి. ఎక్కువ వివరాలు ఇవ్వడం వల్ల search స్థానం లేదా స్పందనలకు హామీ ఉండదు.", "After registration, update your details any time in My Profile. Adding details does not guarantee search placement or responses.")}
              </p>
            </div>

            {cardUrl && (
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-700 block">🖼️ {T("మీ వాట్సాప్ స్టేటస్ బయోడేటా కార్డ్:", "Your WhatsApp status biodata card:")}</span>
                <ProtectedImage src={cardUrl} alt="Matrimony card preview unavailable" className="w-full rounded-2xl border border-gold/30 shadow-sm" />
              </div>
            )}

            {/* Action CTA Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <Link
                href="/me"
                className="py-3.5 px-4 rounded-xl gold-gradient text-maroon font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-gold hover:brightness-105 transition"
              >
                <span>✏️</span>
                <span>{T("ప్రొఫైల్ వివరాలను పూర్తి చేయండి", "Complete your profile")}</span>
              </Link>

              <Link
                href="/matches"
                className="py-3.5 px-4 rounded-xl maroon-gradient text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md hover:brightness-105 transition"
              >
                <span>🔍</span>
                <span>{T("అందుబాటులో ఉన్న ప్రొఫైళ్లను చూడండి", "Browse available profiles")}</span>
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
      </div>
    );
  }

  const stepMeta = STEPS[step - 1];

  return (
    <div className="min-h-dvh pb-28 sm:pb-36 bg-[#FAF7F2]" ref={topRef}>
      {/* ---------- Top Header Bar ---------- */}
      <div className="sticky top-16 z-30 bg-white/95 backdrop-blur-md border-b border-gold/25 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 py-2.5 sm:py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/" className="text-xs sm:text-sm font-bold text-maroon hover:underline">
              ← {T("హోమ్", "Home")}
            </Link>
            <span className="text-slate-300">|</span>
            <span className="text-xs sm:text-sm font-black text-navy">{SITE_CONFIG.brandName}</span>
          </div>

          {SITE_CONFIG.supportLink ? (
            <a
              href={SITE_CONFIG.supportLink}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={T("WhatsApp support తెరవండి", "Open WhatsApp support")}
              title={T("బాహ్య WhatsApp సేవ లభ్యతను ఈ సైట్ తనిఖీ చేయదు", "External WhatsApp availability is not checked by this site")}
              className="px-2.5 py-2 rounded-full bg-gradient-to-r from-emerald-600 to-green-500 border border-emerald-300 text-white text-[11px] font-bold flex items-center gap-1 hover:brightness-105 transition"
            >
              <span>💬</span>
              <span>{T("WhatsApp సహాయం", "WhatsApp support")}</span>
            </a>
          ) : null}
        </div>

        {/* Mode Selector Tabs (Quick vs Detailed) */}
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
              <span>{T("1-నిమిషం త్వరిత నమోదు", "1-minute quick registration")}</span>
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
              <span>{T("5-దశల పూర్తి నమోదు", "5-step full registration")}</span>
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
                  {te ? (refInfo?.ok && refInfo?.referrer_name ? `${refInfo.referrer_name} గారి సిఫార్సు` : "రిఫరల్ కోడ్ అందింది") : (refInfo?.ok && refInfo?.referrer_name ? `Referred by ${refInfo.referrer_name}` : "Referral code received")}
                </div>
                <div className="text-[11px] sm:text-xs font-bold mt-0.5 opacity-90">
                  {refInfo?.ok
                    ? te ? `సర్వర్ referral code ను ధృవీకరించింది${refInfo?.referrer_name ? `: ${refInfo.referrer_name}` : ""}. Valid attachment పై మీకు +${Number(refInfo?.bonus_credits ?? 1)} interest-request credit వస్తుంది; ఇది cash లేదా contact unlock కాదు.` : `The server verified this referral code. You will receive +${Number(refInfo?.bonus_credits ?? 1)} interest-request credit when the referral is attached. Credits are not cash and do not unlock contact details.`
                    : te ? "Referral eligibility is checked by the server when you register." : "The server checks referral-code and request-credit eligibility when you register."}
                </div>
              </div>
            </div>
            <span className="px-3 py-1 bg-[#5C0822] text-white text-[11px] font-black rounded-full self-start sm:self-auto shrink-0 shadow-xs">
              {refInfo?.ok ? (te ? `✓ +${Number(refInfo?.bonus_credits ?? 1)} request credit అర్హత` : `✓ Eligible for +${Number(refInfo?.bonus_credits ?? 1)} request credit`) : te ? "పరిశీలనలో" : "Pending review"}
            </span>
          </div>
        )}

        {/* Draft Restore Alert */}
        {draftFound && (
          <div className="bg-amber-50 border border-gold/40 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs">
            <div className="text-xs text-amber-950 font-bold flex items-center gap-2">
              <span className="text-lg">💾</span>
              <span>
                <span>{T(`మీరు మునుపు పూరించిన వివరాలు అందుబాటులో ఉన్నాయి (${savedAt}).`, `A saved draft is available (${savedAt}).`)}</span>
                <span className="block mt-0.5 text-[10px] font-medium">{T("వివరాలు ఈ పరికరంలో మాత్రమే సేవ్ అవుతాయి. ఫోటో ఫైల్, పాస్‌వర్డ్, సమ్మతి సేవ్ కావు; కొనసాగించేటప్పుడు ఫోటోను మళ్లీ ఎంచుకుని అనుమతిని నిర్ధారించండి.", "Details are saved on this device only. Photo files, passwords, and consent are not saved; reselect your photo and confirm permission when you resume.")}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={resumeDraft}
                className="px-3 py-1.5 rounded-xl maroon-gradient text-white text-xs font-bold hover:brightness-105 transition"
              >
                {T("కొనసాగించండి", "Resume")}
              </button>
              <button
                type="button"
                onClick={clearDraft}
                className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition"
              >
                {T("కొత్తగా ప్రారంభించండి", "Start new")}
              </button>
            </div>
          </div>
        )}
        <p className="text-[10px] text-slate-500">{T("ఆటో-సేవ్ వివరాలు ఈ పరికరంలోని browser లో మాత్రమే ఉంటాయి. ఫోటో ఫైల్, పాస్‌వర్డ్, సమ్మతి నిల్వ చేయబడవు; మళ్లీ తెరిచినప్పుడు ఫోటోను ఎంచుకుని అనుమతిని నిర్ధారించండి.", "Draft details stay in this browser on this device. Photo files, passwords, and consent choices are not saved; reselect your photo and confirm permission when you resume.")}</p>

        {/* Validation Errors Box */}
        {errs.length > 0 && (
          <div className="bg-rose-50 border border-rose-300 rounded-2xl p-4 space-y-1 shadow-xs animate-shake">
            <div className="text-xs font-black text-rose-800 flex items-center gap-1.5">
              <span>⚠️</span>
              <span>{T("దయచేసి క్రింది వివరాలు సరిచూసుకోండి:", "Please review the following details:")}</span>
            </div>
            {errs.map((e, idx) => (
              <div key={idx} className="text-xs text-rose-900 telugu font-medium pl-5">
                • {e}
              </div>
            ))}
          </div>
        )}

        {/* ============================================================== */}
        {/* ⚡ MODE 1: QUICK REGISTRATION                                  */}
        {/* ============================================================== */}
        {regMode === "quick" ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-8 bg-white rounded-3xl border-2 border-gold/40 shadow-xl p-5 sm:p-7 space-y-6">
              {/* Header */}
              <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-black text-maroon flex items-center gap-2">
                    <span>⚡</span>
                    <span>{T("ఉచిత త్వరిత నమోదు", "Free quick registration")}</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {T("6 ముఖ్య వివరాలు మరియు ఒక స్పష్టమైన ప్రొఫైల్ ఫోటోతో నమోదు చేసుకోండి. మిగతా వివరాలను తర్వాత పూర్తి చేయవచ్చు.", "Create your profile with six key details and one clear required photo. You can add other details later.")}
                  </p>
                </div>

              </div>

              {/* 1. Gender */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800">
                  {T("ఎవరి కోసం ప్రొఫైల్ నమోదు చేస్తున్నారు?", "Who is this profile for?")} <span className="text-rose-600 font-black">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { v: "Bride", l: te ? "👰 వధువు" : "👰 Bride" },
                    { v: "Groom", l: te ? "🤵 వరుడు" : "🤵 Groom" },
                  ].map((g) => (
                    <button
                      key={g.v}
                      type="button"
                      onClick={() => set("gender", g.v)}
                      aria-pressed={f.gender === g.v}
                      className={`rounded-2xl border-2 p-3 text-center transition-all ${
                        f.gender === g.v
                          ? "border-maroon bg-maroon-soft shadow-sm ring-2 ring-maroon/20"
                          : "border-slate-200 bg-white hover:border-maroon/40"
                      }`}
                    >
                      <div className="text-2xl">{g.v === "Bride" ? "👰" : "🤵"}</div>
                      <div className="font-black text-xs text-maroon mt-1">{g.l}</div>
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
                placeholder="మీ పూర్తి పేరు నమోదు చేయండి"
              />

              {/* 3. DOB & Age — age is calculated from the chosen date, never guessed. */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <TextField
                  label="పుట్టిన తేదీ (Date of Birth)"
                  value={f.dob}
                  onChange={(v) => set("dob", v)}
                  required
                  type="date"
                  max={maxDobForAge(f.gender === "Groom" ? 21 : 18)}
                  hint="వయసు పుట్టిన తేదీ నుంచి ఆటోమేటిక్‌గా లెక్కించబడుతుంది"
                />
                <TextField
                  label="వయసు (Age in Years)"
                  value={f.age}
                  onChange={(v) => set("age", v)}
                  type="number"
                  disabled
                  placeholder="DOB ఎంచుకున్న తర్వాత లెక్కించబడుతుంది"
                />
              </div>

              {/* 4. Religion, community & sub-community */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="quick-religion" className="text-xs font-bold text-slate-800">{T("మతం", "Religion")} *</label>
                  <select
                    id="quick-religion"
                    required
                    value={f.religion}
                    onChange={(e) => setReligion(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium"
                  >
                    <option value="">{T("మతం ఎంచుకోండి", "Select a religion")}</option>
                    {RELIGIONS.map((religion) => <option key={religion} value={religion}>{te ? RELIGION_LABELS[religion] : religion}</option>)}
                  </select>
                </div>
                <SearchSelect
                  label="కులం / సంఘం (Caste / Community)"
                  options={casteOpts}
                  value={f.caste}
                  onChange={setCaste}
                  required
                  disabled={!f.religion}
                  teMap={CASTE_TELUGU}
                  placeholder="కులం / సంఘం ఎంచుకోండి…"
                  hint={casteLoading ? "సంఘాల జాబితా లోడ్ అవుతోంది…" : casteListOffline ? "ఆఫ్‌లైన్ జాబితా ఉపయోగిస్తున్నాం; జాబితా పూర్తి కాకపోతే ‘Other / self-described’ ఎంచుకోండి." : "మతాన్ని బట్టి జాబితా మారుతుంది. జాబితాలో లేకపోతే ‘Other / self-described’ ఎంచుకోండి."}
                />
              </div>
              {f.caste === "Other / self-described" && (
                <TextField
                  label="మీ కులం / సంఘం పేరు (Enter community name)"
                  value={f.caste_custom}
                  onChange={(v) => set("caste_custom", v)}
                  required
                  maxLength={100}
                  placeholder="మీరు ఉపయోగించే పేరు నమోదు చేయండి"
                />
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {subcasteOpts.length ? (
                  <SearchSelect
                    label="ఉపకులం (Sub-caste - Optional)"
                    options={subcasteOpts}
                    value={f.sub_caste}
                    onChange={setSubcaste}
                    placeholder="ఉపకులం ఎంచుకోండి…"
                    hint={subcasteLoading ? "ఉపకులాల జాబితా లోడ్ అవుతోంది…" : subcasteListOffline ? "ఆఫ్‌లైన్ జాబితా ఉపయోగిస్తున్నాం; సరైనది లేకపోతే Other / self-described ఎంచుకోండి." : "ఇది ఐచ్చికం. జాబితాలో సరైన పేరు లేకపోతే Other / self-described ఎంచుకోండి."}
                  />
                ) : (
                  <TextField
                    label="ఉపకులం / ఉపసంఘం (Optional)"
                    value={f.sub_caste}
                    onChange={(v) => set("sub_caste", v)}
                    maxLength={100}
                    placeholder="వర్తిస్తే మీ స్వంత వివరణ నమోదు చేయండి"
                    hint="ఈ ఐచ్చిక వివరానికి సిద్ధంగా ఉన్న జాబితా లేదు; మీరు స్వయంగా నమోదు చేయవచ్చు."
                  />
                )}
                {f.sub_caste === "Other / self-described" && (
                  <TextField
                    label="ఉపకులం / ఉపసంఘం పేరు (Enter subgroup name)"
                    value={f.sub_caste_custom}
                    onChange={(v) => set("sub_caste_custom", v)}
                    required
                    maxLength={100}
                    placeholder="మీరు ఉపయోగించే పేరు నమోదు చేయండి"
                  />
                )}
              </div>

              {/* 4.5. Education & Profession */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50/70 p-3 rounded-2xl border border-slate-200">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800">{T("విద్యార్హత", "Education")} (Optional)</label>
                  <select
                    value={f.education}
                    onChange={(e) => set("education", e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium"
                  >
                    <option value="">{T("విద్యార్హత ఎంచుకోండి", "Select education")} (Optional)</option>
                    {EDUCATIONS.map((e) => (
                      <option key={e} value={e}>
                        {e}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800">{T("ఉద్యోగం / హోదా", "Job title")} (Optional)</label>
                  <select
                    value={f.job}
                    onChange={(e) => set("job", e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium"
                  >
                    <option value="">{T("ఉద్యోగం ఎంచుకోండి", "Select occupation")} (Optional)</option>
                    <option value="Housewife / Homemaker (గృహిణి)">{te ? "🏡 గృహిణి" : "🏡 Housewife / homemaker"}</option>
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
                  <label className="text-xs font-bold text-slate-800">{T("రాష్ట్రం", "State")} *</label>
                  <select
                    value={f.state}
                    onChange={(e) => {
                      set("state", e.target.value);
                      set("district", "");
                    }}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold"
                  >
                    <option value="">{T("రాష్ట్రం ఎంచుకోండి", "Select state")}</option>
                    <option value="TS">{T("తెలంగాణ", "Telangana")}</option>
                    <option value="AP">{T("ఆంధ్రప్రదేశ్", "Andhra Pradesh")}</option>
                    <option value="Other">{T("ఇతర రాష్ట్రం / NRI", "Other state or NRI location")}</option>
                  </select>
                </div>

                <SearchSelect
                  label="జిల్లా / నగరం (District / City)"
                  options={DISTRICTS_BY_STATE[f.state] || []}
                  value={f.district}
                  onChange={(v) => set("district", v)}
                  required
                  disabled={!f.state}
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
                  placeholder="10 అంకెల మొబైల్ నంబర్"
                  hint="ధృవీకరణ & సంబంధాల అప్‌డేట్స్ కోసం"
                />
                <div className="space-y-1.5 relative">
                  <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                    <span>{T("పాస్‌వర్డ్ (కనీసం 6 అక్షరాలు)", "Password (minimum 6 characters)")} <span className="text-rose-600 font-black">*</span></span>
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
                <span>{T(<>🌟 <b>₹99 Sambandham</b> ప్లాన్ కోసం ఆఫర్లు అందుబాటులో ఉన్నాయి</>, <>🌟 Offers are available for the <b>₹99 Sambandham</b> plan</>)}</span>
                <Link href="/pricing" className="text-maroon font-bold underline text-xs">
                  {T("ప్లాన్లు →", "Plans →")}
                </Link>
              </div>

              {/* Referral Code (Locked or Input) */}
              <div className="bg-amber-50/70 border border-gold/30 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <label className="font-bold text-maroon block">{T("సిఫార్సు కోడ్", "Referral code")}:</label>
                  <span className="text-slate-500 text-[11px]">{T("చెల్లుబాటు అయ్యే referral ద్వారా కొత్త సభ్యుడికి +1 interest-request credit వస్తుంది; ఇది నగదు కాదు.", "A valid referral gives the new member +1 interest-request credit; it is not cash.")}</span>
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
                        .then((r) => readApiJson(r))
                        .then((d) => {
                          if (d?.ok && d?.referrer_name) setRefInfo({ ok: true, referrer_name: d.referrer_name, bonus_credits: d.bonus_credits });
                        })
                        .catch(() => {});
                    }
                  }}
                  placeholder={T("Referral code ఇవ్వండి (ఐచ్ఛికం)", "Enter a referral code (optional)")}
                  disabled={!!refLocked}
                  className="w-full sm:w-48 px-3 py-1.5 bg-white border border-gold/40 rounded-xl uppercase font-mono font-bold text-xs"
                />
              </div>

            {/* Free vs Paid Clarity Box */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs text-slate-700 space-y-1.5 clarity">
              <div className="font-black text-navy flex items-center justify-between">
                <span>{T("🔒 ఉచిత నమోదు & గోప్యత", "🔒 Free registration and privacy")}</span>
                <span className="text-[10px] text-slate-500 font-mono">/api/free-plan</span>
              </div>
              <div className="text-slate-600 space-y-1">
                <div><b>{T("FREE లో ఇచ్చేది:", "Included with FREE:")}</b> {T("ఉచిత రిజిస్ట్రేషన్, సభ్యులు అందించిన ప్రొఫైల్‌ల శోధన, 3 ఉచిత interest requests.", "Free registration, search across member-submitted profiles, and 3 free interest requests.")}</div>
                <div><b>{T("FREE లో ఇవ్వనిది:", "Not included:")}</b> {T("Public profile/search లో phone నంబర్లు చూపించము. Profile owner accept చేసిన తర్వాత accepted-request account views లో contact details అందుబాటులోకి వస్తాయి; WhatsApp notification delivery హామీ లేదు. Paid plan consent‌ను దాటవేయదు.", "Phone numbers are not shown in public profile/search. After the profile owner accepts, contact details appear in accepted-request account views; WhatsApp notification delivery is not guaranteed. A paid plan does not bypass consent.")}</div>
              </div>
            </div>

            {/* Reassurance Banner */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs text-slate-700 space-y-1">
              <div className="font-black text-navy flex items-center gap-1.5">
                <span>💡</span>
                <span>{T("ప్రొఫైల్ వివరాలు ఎప్పుడు పూర్తి చేయాలి?", "When can I complete my profile details?")}</span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                {T(<>ఇప్పుడే ప్రాథమిక నమోదు పూర్తి చేయండి. తర్వాత మీ అకౌంట్‌లో <strong className="text-maroon">&ldquo;My Profile&rdquo;</strong> ద్వారా చదువు, ఉద్యోగం, జాతకం, కుటుంబ వివరాలు పూర్తి చేయవచ్చు. మీ ఫోటో ఇప్పుడు సమర్పించబడుతుంది; చూపించే ముందు సమీక్షిస్తారు.</>, <>Complete the basic registration now. Later, use <strong className="text-maroon">&ldquo;My Profile&rdquo;</strong> to add education, work, horoscope, and family details. Your photo is submitted now and reviewed before it may be shown.</>)}
              </p>
            </div>

              <RequiredProfilePhoto
                file={photoFile}
                preview={photoPreview}
                info={photoInfo}
                error={photoError}
                preparing={photoPreparing}
                submitting={busy}
                photoPrivate={!!f.photo_private}
                photoConsent={!!f.photo_consent_confirmed}
                onChoose={selectProfilePhoto}
                onPrivacyChange={(isPrivate) => set("photo_private", isPrivate)}
                onPhotoConsentChange={(confirmed) => set("photo_consent_confirmed", confirmed)}
              />

              <ConsentNotice checked={!!f.consent_confirmed} onChange={(checked) => set("consent_confirmed", checked)} />

              {/* Submit CTA */}
              <button
                type="button"
                onClick={() => executeSubmit(true)}
                disabled={busy || photoPreparing}
                className="w-full py-4 rounded-2xl gold-gradient text-maroon font-black text-sm sm:text-base shadow-gold hover:brightness-105 active:scale-98 transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {busy || photoPreparing ? (
                  <>
                    <div className="w-5 h-5 border-3 border-maroon border-t-transparent rounded-full animate-spin" />
                    <span>{photoPreparing ? T("ఫోటో సిద్ధం చేస్తోంది…", "Preparing photo…") : T("ఫోటోతో నమోదు జరుగుతోంది…", "Submitting photo and creating your profile…")}</span>
                  </>
                ) : (
                  <>
                    <span>🚀</span>
                    <span>{T("1 నిమిషంలో నా ప్రొఫైల్ సృష్టించండి", "Create my profile in 1 minute")}</span>
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
                    <span>{T("లైవ్ కార్డ్ నమూనా", "Live preview")}</span>
                  </span>
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                    Preview
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-20 rounded-2xl bg-amber-50 border border-gold/30 flex items-center justify-center text-3xl shadow-xs overflow-hidden shrink-0">
                      {photoPreview ? (
                        <Image src={photoPreview} alt={te ? "ఫోటో preview" : "Profile photo preview"} width={64} height={80} unoptimized className="w-full h-full object-cover" />
                      ) : (
                        <span>{f.gender === "Bride" ? "👰" : f.gender === "Groom" ? "🤵" : "👤"}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-extrabold text-sm text-navy truncate">{f.full_name || T("మీ పేరు", "Your name")}</div>
                      <div className="text-xs font-bold text-maroon mt-0.5">
                        {f.gender === "Bride" ? (te ? "👰 వధువు" : "👰 Bride") : f.gender === "Groom" ? (te ? "🤵 వరుడు" : "🤵 Groom") : T("ప్రొఫైల్", "Profile")} • {f.age ? (te ? `${f.age} సం.` : `${f.age} years`) : T("DOB తర్వాత వయసు", "Age after date of birth")}
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                        💍 {f.caste || T("కులం", "Community")} {f.sub_caste ? `(${f.sub_caste})` : ""}
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-2xl p-3 space-y-1.5 text-xs text-slate-700 border border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <span>📍</span>
                      <span className="font-medium truncate">{f.district || T("ప్రాంతం", "Location")}{f.state ? `, ${stateFullName(f.state, te)}` : ""}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span>📱</span>
                      <span className="font-medium text-slate-500 font-mono">
                        {f.phone ? `••••••${f.phone.slice(-4)}` : T("ఫోన్ నంబర్", "Phone number")}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 border-t border-slate-100 pt-3 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>{T("ఉచిత నమోదు & ప్రొఫైల్ ఐడీ", "Free registration and profile ID")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>{T("సంబంధాల శోధన అందుబాటులో ఉంది", "Search member-submitted profiles")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>{T("సంప్రదింపు వివరాలు పరస్పర సమ్మతి తర్వాతే పంచబడతాయి.", "Contact details are shared only after mutual consent.")}</span>
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
                        {T(`దశ ${step} / 5: ${stepMeta.labelTe}`, `Step ${step} of 5: ${stepMeta.label}`)}
                      </span>
                    </h2>
                    <p className="text-xs text-slate-500 telugu mt-0.5">{te ? stepMeta.hint : stepMeta.hintEn}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => executeSubmit(true)}
                    className="text-xs font-bold text-maroon bg-amber-50 px-3 py-1 rounded-full border border-gold/30 hover:bg-gold/20"
                  >
                    {T("⚡ ఇప్పుడే సబ్మిట్ చేయండి", "⚡ Submit now")}
                  </button>
                </div>

                {/* ---------------- STEP 1: BASIC DETAILS ---------------- */}
                {step === 1 && (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[13px] font-bold text-slate-800">
                        {T("ఎవరి కోసం ప్రొఫైల్ నమోదు చేస్తున్నారు?", "Who is this profile for?")} <span className="text-rose-600 font-black">*</span>
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { v: "Bride", l: te ? "👰 వధువు" : "👰 Bride" },
                          { v: "Groom", l: te ? "🤵 వరుడు" : "🤵 Groom" },
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
                      placeholder="మీ పూర్తి పేరు నమోదు చేయండి"
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <TextField
                        label="పుట్టిన తేదీ (Date of Birth)"
                        value={f.dob}
                        onChange={(v) => set("dob", v)}
                        required
                        type="date"
                        max={maxDobForAge(f.gender === "Groom" ? 21 : 18)}
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
                        <label className="text-xs font-bold text-slate-800">{T("ఎత్తు", "Height")} *</label>
                        <select
                          value={f.height}
                          onChange={(e) => set("height", e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium"
                        >
                          <option value="">{T("ఎత్తు ఎంచుకోండి", "Select height")}</option>
                          {HEIGHTS.map((h) => (
                            <option key={h} value={h}>
                              {heightLabel(h)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-800">{T("వైవాహిక స్థితి", "Marital status")} *</label>
                        <select
                          value={f.marital_status}
                          onChange={(e) => {
                            setF((prev) => ({ ...prev, marital_status: e.target.value, children: "" }));
                            setErrs([]);
                          }}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium"
                        >
                          <option value="">{T("వైవాహిక స్థితి ఎంచుకోండి", "Select marital status")}</option>
                          <option value="Pelli Kaledu">{T("పెళ్లి కాలేదు", "Never married")}</option>
                          <option value="Divorced">{T("విడాకులు", "Divorced")}</option>
                          <option value={f.gender === "Groom" ? "Widower" : "Widow"}>
                            {f.gender === "Groom" ? T("భార్య మరణించారు", "Widower") : T("భర్త మరణించారు", "Widow")}
                          </option>
                          <option value="Awaiting Divorce">{T("విడాకుల కోసం ఎదురుచూస్తున్నారు", "Awaiting divorce")}</option>
                          <option value="Separated">{T("విడిగా ఉంటున్నారు", "Separated")}</option>
                        </select>
                      </div>
                    </div>

                    {f.marital_status && !isNeverMarriedStatus(f.marital_status) && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-800">{T("పిల్లలు", "Children")} *</label>
                        <select
                          value={f.children}
                          onChange={(e) => set("children", e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium"
                        >
                          <option value="">{T("పిల్లల సంఖ్య ఎంచుకోండి", "Select number of children")}</option>
                          {CHILDREN_OPTIONS.map((co) => (
                            <option key={co} value={co}>
                              {co === "None" ? T("పిల్లలు లేరు", "No children") : T(`${co} పిల్లలు`, `${co} ${Number(co) === 1 ? "child" : "children"}`)}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label htmlFor="full-religion" className="text-xs font-bold text-slate-800">{T("మతం", "Religion")} *</label>
                      <select
                        id="full-religion"
                        required
                        value={f.religion}
                        onChange={(e) => setReligion(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium"
                      >
                        <option value="">{T("మతం ఎంచుకోండి", "Select a religion")}</option>
                        {RELIGIONS.map((religion) => <option key={religion} value={religion}>{te ? RELIGION_LABELS[religion] : religion}</option>)}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-800">{T("శారీరక స్థితి", "Physical status")}</label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { v: "Normal", l: te ? "సాధారణం" : "Normal" },
                          { v: "Physically Challenged", l: te ? "దివ్యాంగులు" : "Physically challenged" },
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
                      label="కులం / సంఘం (Caste / Community)"
                      options={casteOpts}
                      value={f.caste}
                      onChange={setCaste}
                      required
                      disabled={!f.religion}
                      teMap={CASTE_TELUGU}
                      placeholder="కులం / సంఘం ఎంచుకోండి…"
                      hint={casteLoading ? "సంఘాల జాబితా లోడ్ అవుతోంది…" : casteListOffline ? "ఆఫ్‌లైన్ జాబితా ఉపయోగిస్తున్నాం; జాబితా పూర్తి కాకపోతే ‘Other / self-described’ ఎంచుకోండి." : "మతాన్ని బట్టి జాబితా మారుతుంది. జాబితాలో లేకపోతే ‘Other / self-described’ ఎంచుకోండి."}
                    />
                    {f.caste === "Other / self-described" && (
                      <TextField
                        label="మీ కులం / సంఘం పేరు (Enter community name)"
                        value={f.caste_custom}
                        onChange={(v) => set("caste_custom", v)}
                        required
                        maxLength={100}
                        placeholder="మీరు ఉపయోగించే పేరు నమోదు చేయండి"
                      />
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {subcasteOpts.length ? (
                        <SearchSelect
                          label="ఉపకులం (Sub-caste - Optional)"
                          options={subcasteOpts}
                          value={f.sub_caste}
                          onChange={setSubcaste}
                          placeholder="ఉపకులం ఎంచుకోండి…"
                          hint={subcasteLoading ? "ఉపకులాల జాబితా లోడ్ అవుతోంది…" : subcasteListOffline ? "ఆఫ్‌లైన్ జాబితా ఉపయోగిస్తున్నాం; సరైనది లేకపోతే Other / self-described ఎంచుకోండి." : "ఇది ఐచ్చికం. జాబితాలో సరైన పేరు లేకపోతే Other / self-described ఎంచుకోండి."}
                        />
                      ) : (
                        <TextField
                          label="ఉపకులం / ఉపసంఘం (Optional)"
                          value={f.sub_caste}
                          onChange={(v) => set("sub_caste", v)}
                          maxLength={100}
                          placeholder="వర్తిస్తే మీ స్వంత వివరణ నమోదు చేయండి"
                          hint="ఈ ఐచ్చిక వివరానికి సిద్ధంగా ఉన్న జాబితా లేదు; మీరు స్వయంగా నమోదు చేయవచ్చు."
                        />
                      )}
                      {f.sub_caste === "Other / self-described" && (
                        <TextField
                          label="ఉపకులం / ఉపసంఘం పేరు (Enter subgroup name)"
                          value={f.sub_caste_custom}
                          onChange={(v) => set("sub_caste_custom", v)}
                          required
                          maxLength={100}
                          placeholder="మీరు ఉపయోగించే పేరు నమోదు చేయండి"
                        />
                      )}
                      <TextField
                        label="గోత్రం (Gothram)"
                        value={f.gothram}
                        onChange={(v) => set("gothram", v)}
                        placeholder="గోత్రం"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-800">{T("నక్షత్రం", "Nakshatram")}</label>
                        <select
                          value={f.star || ""}
                          onChange={(e) => set("star", e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium"
                        >
                          <option value="">{T("నక్షత్రం ఎంచుకోండి", "Select nakshatram")}</option>
                          {NAKSHATRAS.map((st) => (
                            <option key={st.en} value={st.en}>
                              {te ? `⭐ ${st.te} (${st.en})` : `⭐ ${st.en}`}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-800">{T("రాశి", "Rasi")}</label>
                        <select
                          value={f.rasi || ""}
                          onChange={(e) => set("rasi", e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium"
                        >
                          <option value="">{T("రాశి ఎంచుకోండి", "Select rasi")}</option>
                          {RASIS.map((r) => (
                            <option key={r.en} value={r.en}>
                              {te ? `${r.te} (${r.en})` : r.en}
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
                      <label className="text-xs font-bold text-slate-800">{T("విద్యార్హత", "Education")} *</label>
                      <select
                        value={f.education}
                        onChange={(e) => set("education", e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium"
                      >
                        <option value="">{T("విద్యార్హత ఎంచుకోండి", "Select education")}</option>
                        {EDUCATIONS.map((e) => (
                          <option key={e} value={e}>
                            {e}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-800">
                        {T("త్వరిత ఎంపిక", "Quick job picks")}:
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { l: te ? "🏡 గృహిణి" : "🏡 Housewife / homemaker", v: "Housewife / Homemaker (గృహిణి)" },
                          { l: "💻 Software Engineer", v: "Software Engineer" },
                          { l: "🏛️ Govt Employee", v: "Govt Employee (Central / State)" },
                          { l: "🩺 Doctor", v: "Doctor / Physician" },
                          { l: "🎓 Teacher / Faculty", v: "Teacher / School Faculty" },
                          { l: "💼 Business Owner", v: "Business Owner / Entrepreneur" },
                          { l: "🌾 Farmer / Agri", v: "Farmer / Farm Owner" },
                          { l: "🏢 Private Job", v: "Private Sector Professional" },
                        ].map((qj) => (
                          <button
                            key={qj.v}
                            type="button"
                            onClick={() => set("job", qj.v)}
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
                        label={T("ఉద్యోగం / హోదా", "Occupation / job title")}
                        value={f.job}
                        onChange={(v) => set("job", v)}
                        required
                        placeholder={T("మీ వృత్తి లేదా ఉద్యోగ హోదా నమోదు చేయండి", "Enter your occupation or job title")}
                      />
                      <TextField
                        label={T("కంపెనీ / కార్యాలయం", "Company / employer")}
                        value={f.company}
                        onChange={(v) => set("company", v)}
                        placeholder={T("కంపెనీ లేదా యజమాని పేరు నమోదు చేయండి", "Enter a company or employer name")}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-800">{T("వార్షిక వేతనం", "Annual salary")} *</label>
                      <select
                        value={f.salary}
                        onChange={(e) => set("salary", e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium"
                      >
                        <option value="">{T("వార్షిక వేతనం ఎంచుకోండి", "Select salary range")}</option>
                        <option value="None / Not Applicable">{T("వర్తించదు", "Not applicable")}</option>
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
                        <label className="text-xs font-bold text-slate-800">{T("రాష్ట్రం", "State")} *</label>
                        <select
                          value={f.state}
                          onChange={(e) => {
                            set("state", e.target.value);
                            set("district", "");
                          }}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium"
                        >
                          <option value="">{T("రాష్ట్రం ఎంచుకోండి", "Select state")}</option>
                          <option value="TS">{T("తెలంగాణ", "Telangana")}</option>
                          <option value="AP">{T("ఆంధ్రప్రదేశ్", "Andhra Pradesh")}</option>
                          <option value="Other">{T("ఇతర రాష్ట్రం / NRI", "Other state or NRI location")}</option>
                        </select>
                      </div>

                      <SearchSelect
                        label="జిల్లా (District)"
                        options={DISTRICTS_BY_STATE[f.state] || []}
                        value={f.district}
                        onChange={(v) => set("district", v)}
                        required
                        disabled={!f.state}
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
                        placeholder="10 అంకెల మొబైల్ నంబర్"
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
                    <RequiredProfilePhoto
                      file={photoFile}
                      preview={photoPreview}
                      info={photoInfo}
                      error={photoError}
                      preparing={photoPreparing}
                      submitting={busy}
                      photoPrivate={!!f.photo_private}
                      photoConsent={!!f.photo_consent_confirmed}
                      onChoose={selectProfilePhoto}
                      onPrivacyChange={(isPrivate) => set("photo_private", isPrivate)}
                      onPhotoConsentChange={(confirmed) => set("photo_consent_confirmed", confirmed)}
                    />

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-800">{T("కుటుంబ ఆర్థిక స్థితి", "Family financial status")}</label>
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
                            {te ? fs.te : fs.v}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                        <span>{T("నా గురించి", "About myself")}</span>
                        <span className="text-[11px] text-slate-500 font-normal">
                          {T("కనీసం 50 అక్షరాలు", "Minimum 50 characters")}
                        </span>
                      </label>
                      <textarea
                        rows={3}
                        value={f.about_myself || ""}
                        onChange={(e) => set("about_myself", e.target.value)}
                        placeholder={te ? "మీ కుటుంబం, వ్యక్తిత్వం మరియు అంచనాల గురించి రాయండి… (ఫోన్ నంబర్లు లేదా ఈమెయిల్ ఇవ్వకండి)" : "Describe your family, personality, and expectations. Do not include phone numbers or email addresses."}
                        className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-900 font-medium focus:outline-none focus:border-maroon telugu"
                      />
                      <div className="text-[11px] text-slate-500">
                        {te ? `${String(f.about_myself || "").length} అక్షరాలు (కనీసం 50 అక్షరాలు ఉండాలి; ఫోన్ నంబర్లు ఇవ్వకండి)` : `${String(f.about_myself || "").length} characters (minimum 50; do not include phone numbers)`}
                      </div>
                    </div>
                  </div>
                )}

                <ConsentNotice checked={!!f.consent_confirmed} onChange={(checked) => set("consent_confirmed", checked)} />

                {/* Wizard Bottom Buttons */}
                <div className="border-t border-slate-100 pt-4 flex items-center justify-between gap-3">
                  {step > 1 ? (
                    <button
                      type="button"
                      onClick={back}
                      className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition"
                    >
                      {T("← వెనుకకు", "← Back")}
                    </button>
                  ) : <div />}

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => executeSubmit(true)}
                      className="px-4 py-2.5 rounded-xl bg-amber-50 border border-gold/40 text-maroon text-xs font-bold hover:bg-gold/20 transition"
                    >
                      {T("⚡ ఇప్పుడే సబ్మిట్ చేయండి", "⚡ Submit now")}
                    </button>

                    {step < 5 ? (
                      <button
                        type="button"
                        onClick={next}
                        className="px-6 py-2.5 rounded-xl maroon-gradient text-white text-xs font-black shadow-md hover:brightness-105 transition"
                      >
                        {T("ముందుకు →", "Next →")}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => executeSubmit(false)}
                        disabled={busy || photoPreparing}
                        className="px-6 py-2.5 rounded-xl gold-gradient text-maroon text-xs font-black shadow-gold hover:brightness-105 transition disabled:opacity-50"
                      >
                        {busy ? T("ఫోటోతో నమోదు జరుగుతోంది…", "Submitting photo and profile…") : photoPreparing ? T("ఫోటో సిద్ధమవుతోంది…", "Preparing photo…") : T("🎉 నమోదు పూర్తి చేయండి", "🎉 Complete registration")}
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
                    <span>{T("లైవ్ కార్డ్ నమూనా", "Live preview")}</span>
                  </span>
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                    Preview
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-20 rounded-2xl bg-amber-50 border border-gold/30 flex items-center justify-center text-3xl shadow-xs overflow-hidden shrink-0">
                      {photoPreview ? (
                        <Image src={photoPreview} alt="Preview" width={64} height={80} unoptimized className="w-full h-full object-cover" />
                      ) : (
                        <span>{f.gender === "Bride" ? "👰" : f.gender === "Groom" ? "🤵" : "👤"}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-extrabold text-sm text-navy truncate">{f.full_name || T("మీ పేరు", "Your name")}</div>
                      <div className="text-xs font-bold text-maroon mt-0.5">
                        {f.gender === "Bride" ? (te ? "👰 వధువు" : "👰 Bride") : f.gender === "Groom" ? (te ? "🤵 వరుడు" : "🤵 Groom") : T("ప్రొఫైల్", "Profile")} • {f.age ? (te ? `${f.age} సం.` : `${f.age} years`) : T("DOB తర్వాత వయసు", "Age after date of birth")} • {f.height || T("ఎత్తు", "Height")}
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                        💍 {f.caste === "Other / self-described" ? (f.caste_custom || T("కులం", "Community")) : (f.caste || T("కులం", "Community"))} {f.sub_caste ? `(${f.sub_caste === "Other / self-described" ? f.sub_caste_custom : f.sub_caste})` : ""}
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-2xl p-3 space-y-1.5 text-xs text-slate-700 border border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <span>🎓</span>
                      <span className="font-medium truncate">{f.education || T("విద్యార్హత", "Education")}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span>💼</span>
                      <span className="font-medium truncate">{f.job || T("ఉద్యోగం / హోదా", "Occupation")}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span>💰</span>
                      <span className="font-bold text-emerald-700 truncate">{f.salary || T("వార్షిక వేతనం", "Annual salary")}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span>📍</span>
                      <span className="font-medium truncate">
                        {f.district || T("ప్రాంతం", "Location")}{f.state ? `, ${stateFullName(f.state, te)}` : ""}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 border-t border-slate-100 pt-3 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>{T("ఉచిత నమోదు & ప్రొఫైల్‌ల వీక్షణ", "Free registration and profile browsing")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>{T("సంప్రదింపు వివరాలు పరస్పర సమ్మతి తర్వాతే పంచబడతాయి.", "Contact details are shared only after mutual consent.")}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

/* R14: Keep the loading shell honest. It does not promise verification, privacy
 * defaults, or a support destination that has not been configured. */
function RegisterFallback() {
  return (
    <div className="min-h-dvh bg-[#FAF7F2] px-4 py-10">
      <div className="mx-auto max-w-lg text-center">
        <h1 className="text-xl font-extrabold text-maroon">
          {getLang() === "te" ? "మన వివాహలో ఉచిత నమోదు" : "Free registration with Mana Vivaha"}
        </h1>
        <p className="mt-2 text-sm text-slate-700">
          {getLang() === "te" ? "మీకు సౌకర్యంగా ఉన్న వివరాలతో ఉచితంగా ప్రొఫైల్ సృష్టించండి. ఫోటో గోప్యతా ఎంపికలను సమీక్షించండి; ప్రొఫైల్ యజమాని అంగీకరించిన తర్వాతే సంప్రదింపు వివరాలు అందుబాటులో ఉంటాయి." : "Create a profile for free using the details you choose to share. Review photo privacy options; contact details are available only after the profile owner accepts."}
        </p>
        <ul className="mt-4 space-y-1.5 text-left text-[13px] text-slate-600 mx-auto max-w-sm">
          {getLang() === "te" ? <>
            <li>✅ నమోదు ఉచితం</li>
            <li>✅ ప్రొఫైల్ వివరాలు సభ్యులు అందించినవి; స్వతంత్రంగా నిర్ధారించండి</li>
            <li>✅ వ్యక్తిగత వివరాలు పంచుకునే ముందు గోప్యతా నియంత్రణలను సమీక్షించండి</li>
          </> : <>
            <li>✅ Profile registration is free</li>
            <li>✅ Profile details are member-submitted; verify them independently</li>
            <li>✅ Review privacy controls before sharing personal information</li>
          </>}
        </ul>
        <div className="mt-6 w-10 h-10 border-4 border-maroon border-t-transparent rounded-full animate-spin mx-auto" aria-hidden="true" />
        <p className="mt-2 text-xs font-bold text-maroon">{getLang() === "te" ? "నమోదు ఫారమ్ లోడ్ అవుతోంది…" : "Loading the registration form…"}</p>
        <p className="mt-4 text-xs text-slate-500">{getLang() === "te" ? "ఫారమ్ కనిపించకపోతే పేజీని మళ్లీ లోడ్ చేయండి." : "If the form does not appear, reload the page."}</p>
        {SITE_CONFIG.supportLink ? (
          <p className="mt-2 text-xs text-slate-500">
            <a href={SITE_CONFIG.supportLink} target="_blank" rel="noopener noreferrer" className="font-bold text-maroon underline">
              {getLang() === "te" ? "WhatsApp సహాయం" : "WhatsApp support link"}
            </a>
            <span>{getLang() === "te" ? " — బాహ్య సేవ లభ్యతను ఈ పేజీ నిర్ధారించదు." : " — External service availability is not checked by this page."}</span>
          </p>
        ) : null}
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
