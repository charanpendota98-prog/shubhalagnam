"use client";

/**
 * 🎛️ ADVANCED CONTROL & ADMIN DASHBOARD — Shubhalagnam Mana Vivaha
 * ====================================================================
 * • ⚡ Smart Matchmaker: Enter ANY Single ID / Phone → Instantly finds all suitable matches with Vedic Gunamelanam & unmasked phones
 * • 📇 Contacts Directory: Search & multi-select profiles with owner-consented contact details
 * • 📝 Dynamic Floating Notepad: Formats only selected, permission-appropriate profile details
 * • 📲 WhatsApp Sharing: 
 *      - Mode A: Privacy Safe (Profiles only - No numbers)
 *      - Mode B: Direct Family Contacts (Profiles + Phone Numbers with names)
 * • 📢 Telegram Broadcast Button & Header WhatsApp Quick Launch
 * • Overview, Profile Queue, Castes, Add Profile, Ads, Vendors, Spotlight, Referrals, Reports, Revenue, Audit
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/lang";
import { SITE_CONFIG } from "@/lib/site-config";
import { whatsappPhoneLink, whatsappShareLink } from "@/lib/wa";
import { BarList, Donut, Sparkline } from "./Charts";
import ChannelsConsole from "@/components/ChannelsConsole";
import WANumbersConsole from "@/components/WANumbersConsole";
import {
  CASTES,
  CASTE_SUBCASTES,
  CASTE_TELUGU,
  COMMUNITIES_BY_RELIGION,
  OTHER_LOCATIONS,
  RELIGIONS,
  TS_DISTRICTS,
  AP_DISTRICTS,
  EDUCATIONS,
  JOBS,
  NAKSHATRAS,
  RASIS,
  sortUniqueOptions,
} from "@/lib/telugu-data";

type Me = { role: string; username: string; csrf: string };
type Totals = {
  profiles: number; pending: number; approved: number; rejected: number;
  with_photo: number; verified: number; males: number; females: number;
  open_reports: number; photos_pending: number; interests: number; posts: number;
};
type Analytics = {
  role: string;
  totals: Totals;
  signups: { today: number; last_7d: number; series: { date: string; count: number }[] };
  top_castes: { label: string; count: number }[];
  top_states: { label: string; count: number }[];
  top_districts: { label: string; count: number }[];
  revenue?: { total: number; payments: number; attempts: number; plan_split: { label: string; count: number }[] };
  audit?: { at: string; action: string; actor: string; ip: string; meta: Record<string, string> }[];
};
type QueueItem = {
  tsap_id: string; full_name: string; gender: string; age?: number;
  district: string; status: string; photo_status: string; created_at: string;
};
type ReportItem = {
  report_id?: string; id?: string; target_id?: string; reporter_id?: string;
  category?: string; category_telugu?: string; detail?: string; status?: string;
  severity?: string; reports_on_target?: number; suggested_action?: string; at?: string;
  target?: { tsap_id?: string; full_name?: string; district?: string; is_approved?: boolean; verification?: string } | null;
};
type SpotlightItem = {
  promo_id: string; tsap_id: string; full_name: string; gender: string; age?: number;
  caste: string; district: string; plan_code: string; amount_paid?: number;
  headline: string; pitch_text: string; photo_url?: string; video_url?: string;
  media_type?: string; payment_mode?: string; payment_ref?: string; payment_status?: string; status: string;
  amount_due?: number; payment_verified_at?: string; submitted_at: string; moderator_notes?: string;
};
type PayoutItem = {
  id: string; tsap_id: string; partner_id?: string; name?: string; amount: number;
  method: string; upi_id?: string; account?: string; ifsc?: string;
  status: string; requested_at: string; utr?: string;
};
type CasteHubItem = {
  key: string; en: string; te: string; category: string; members: string[];
  split: boolean; males: number; females: number; total: number; live: boolean;
  channel_bride?: string; channel_groom?: string;
};
type VendorItem = {
  id?: string; vendor_id?: string; name?: string; business_name?: string;
  category: string; category_name?: string; phone_masked?: string;
  phone?: string; district: string; state?: string; rating?: number;
  package_name?: string; verified?: boolean;
};
type AdCampaignItem = {
  id: string; vendor_id?: string; title: string; offer?: string;
  level: "district" | "state" | "all"; districts?: string[]; state?: string;
  slots?: string[]; image_url?: string; banner_url?: string; video_url?: string;
  link?: string; phone?: string; whatsapp?: string; category?: string;
  days: number; per_day?: number; amount: number;
  status: "active" | "pending" | "paused" | "expired" | "rejected";
  utr?: string; start?: string; end?: string;
  impressions: number; clicks: number; leads: number; created_at: string;
};

const T = {
  te: {
    ops: "అడ్మిన్ & ఆపరేషన్స్ హబ్", dash: "డాష్‌బోర్డ్", signedAs: "సైన్ ఇన్",
    signout: "సైన్ అవుట్", refresh: "రిఫ్రెష్", loading: "లోడ్ అవుతోంది…",
    tabMatchmaker: "⚡ స్మార్ట్ మ్యాచ్ మేకర్",
    tabDirectory: "📇 డైరెక్టరీ & కాంటాక్ట్స్",
    tabOverview: "📊 అవలోకనం", tabQueue: "👥 ప్రొఫైల్ క్యూ", tabCastes: "🏛️ కులాలు & కమ్యూనిటీలు",
    tabAddProfile: "➕ ప్రొఫైల్ చేర్చండి", tabAds: "📢 జిల్లా & రాష్ట్ర ప్రకటనలు",
    tabVendors: "🏪 పెళ్లి సేవలు & వెండర్లు",
    tabSpotlight: "🌟 స్పాట్‌లైట్ / Profiles of Day", tabReferrals: "🤝 రెఫరల్స్ & పేఅవుట్స్", tabReports: "🚩 రిపోర్ట్‌లు",
    tabRevenue: "💰 రాబడి", tabAudit: "📝 ఆడిట్ లాగ్",
    tabChannels: "📡 టెలిగ్రామ్ & వాట్సాప్ ఛానెల్స్", tabNumbers: "📱 వాట్సాప్ & ఫోన్ నంబర్లు",
    profilesTot: "మొత్తం ప్రొఫైళ్లు", pendingTot: "పరిశీలనలో ఉన్నవి", approvedTot: "ఆమోదించినవి",
    verifiedTot: "ధృవీకరించినవి", withPhotoTot: "ఫోటో ఉన్నవి", malesTot: "పురుషులు (వరులు)",
    femalesTot: "స్త్రీలు (వధువులు)", reportsTot: "ఓపెన్ రిపోర్ట్‌లు", interestsTot: "పంపిన సంబంధాలు",
    postsTot: "ఛానల్ పోస్ట్‌లు", signupsToday: "నేటి రిజిస్ట్రేషన్లు", signups7d: "గత 7 రోజుల రిజిస్ట్రేషన్లు",
    topCastes: "అగ్ర కులాలు", topStates: "రాష్ట్రాలు", topDistricts: "అగ్ర జిల్లాలు",
    planSplit: "ప్లాన్‌ల వారీగా రాబడి", recentAudit: "ఇటీవలి ఆడిట్ చర్యలు",
    emptyQueue: "పరిశీలనలో ప్రొఫైళ్లు లేవు", emptyReports: "ఓపెన్ రిపోర్ట్‌లు లేవు",
    emptySpotlight: "స్పాట్‌లైట్ అభ్యర్థనలు లేవు", emptyPayouts: "పెండింగ్ పేఅవుట్‌లు లేవు",
    approve: "ఆమోదించు", reject: "తిరస్కరించు", pending: "పెండింగ్", all: "అన్నీ",
    active: "యాక్టివ్", paused: "పాజ్ చేయబడింది", expired: "గడువు ముగిసింది",
    done: "విజయవంతమైంది", failed: "విఫలమైంది",
  },
  en: {
    ops: "Admin & Operations Hub", dash: "Dashboard", signedAs: "Signed in as",
    signout: "Sign out", refresh: "Refresh", loading: "Loading…",
    tabMatchmaker: "⚡ Smart Matchmaker",
    tabDirectory: "📇 Directory & Contacts",
    tabOverview: "📊 Overview", tabQueue: "👥 Profile Queue", tabCastes: "🏛️ Caste Hubs",
    tabAddProfile: "➕ Add Profile", tabAds: "📢 Targeted Ads",
    tabVendors: "🏪 Wedding Vendors",
    tabSpotlight: "🌟 Spotlight / Profiles of Day", tabReferrals: "🤝 Referrals & Payouts", tabReports: "🚩 Reports",
    tabRevenue: "💰 Revenue", tabAudit: "📝 Audit Log",
    tabChannels: "📡 Channels (TG/WA)", tabNumbers: "📱 WhatsApp & Phone Numbers",
    profilesTot: "Total Profiles", pendingTot: "Pending Approval", approvedTot: "Approved",
    verifiedTot: "Verified", withPhotoTot: "With Photo", malesTot: "Grooms",
    femalesTot: "Brides", reportsTot: "Open Reports", interestsTot: "Interest Requests",
    postsTot: "Channel Posts", signupsToday: "Signups Today", signups7d: "Signups (7d)",
    topCastes: "Top Castes", topStates: "States", topDistricts: "Top Districts",
    planSplit: "Revenue by Plan", recentAudit: "Recent Audit Events",
    emptyQueue: "No profiles in this queue", emptyReports: "No open reports",
    emptySpotlight: "No spotlight submissions", emptyPayouts: "No pending payouts",
    approve: "Approve", reject: "Reject", pending: "Pending", all: "All",
    active: "Active", paused: "Paused", expired: "Expired",
    done: "Done", failed: "Failed",
  },
};

const ALL_DISTRICTS = sortUniqueOptions([
  ...TS_DISTRICTS,
  ...AP_DISTRICTS,
  ...OTHER_LOCATIONS.map((location) => location.en),
  "USA / NRI",
  "Other",
]);

async function jget(url: string) {
  const r = await fetch(url, { credentials: "include" });
  if (r.status === 401) throw new Error("401");
  if (!r.ok) throw new Error("load");
  return r.json();
}

export default function Dashboard() {
  const { lang } = useLang();
  const te = lang === "te";
  const L = T[(lang as "te" | "en") in T ? (lang as "te" | "en") : "te"];
  const [me, setMe] = useState<Me | null>(null);
  const [an, setAn] = useState<Analytics | null>(null);
  const [tab, setTab] = useState<
    | "matchmaker"
    | "directory"
    | "overview"
    | "queue"
    | "castes"
    | "channels"
    | "numbers"
    | "addProfile"
    | "ads"
    | "vendors"
    | "spotlight"
    | "referrals"
    | "reports"
    | "revenue"
    | "audit"
  >("overview");

  // Queues & Data
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [qStatus, setQStatus] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [spotlights, setSpotlights] = useState<SpotlightItem[]>([]);
  const [spStatus, setSpStatus] = useState<string>("all");
  const [spPaymentNotes, setSpPaymentNotes] = useState<Record<string, string>>({});
  const [payouts, setPayouts] = useState<PayoutItem[]>([]);
  const [pStatus, setPStatus] = useState<string>("all");
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [castesData, setCastesData] = useState<CasteHubItem[]>([]);
  const [vendorsData, setVendorsData] = useState<VendorItem[]>([]);
  const [adsData, setAdsData] = useState<AdCampaignItem[]>([]);
  const [adFilterLevel, setAdFilterLevel] = useState<string>("all");
  const [adDraft, setAdDraft] = useState({
    vendor_id: "", title: "", level: "district" as "district" | "state" | "all",
    days: "3", districts: "", state: "", offer: "", image_url: "", link: "",
    slots: ["matches_sidebar"],
  });
  const [adQuote, setAdQuote] = useState<{ total?: number; per_day?: number; message_telugu?: string } | null>(null);
  const [adQuoteLoading, setAdQuoteLoading] = useState(false);
  const [adDraftBusy, setAdDraftBusy] = useState(false);
  const [adUtrById, setAdUtrById] = useState<Record<string, string>>({});
  const [adReasonById, setAdReasonById] = useState<Record<string, string>>({});
  const [toast, setToast] = useState("");
  const [busyId, setBusyId] = useState("");
  const [err, setErr] = useState("");

  // =========================================================================
  // ⚡ 1. SMART MATCHMAKER STATE
  // =========================================================================
  const [lookupQuery, setLookupQuery] = useState("");
  const [candidate, setCandidate] = useState<any>(null);
  const [matchedResults, setMatchedResults] = useState<any[]>([]);
  const [mmLoading, setMmLoading] = useState(false);
  const [mmFilters, setMmFilters] = useState({
    caste: "",
    district: "",
    state: "",
    education: "",
    job: "",
    age_min: 0,
    age_max: 0,
    salary_min: 0,
    photo_only: false,
    verified_only: false,
  });

  // =========================================================================
  // 📇 2. DIRECTORY STATE & ADVANCED FILTERS
  // =========================================================================
  const [dirSearch, setDirSearch] = useState("");
  const [dirGender, setDirGender] = useState("");
  const [dirCaste, setDirCaste] = useState("");
  const [dirDistrict, setDirDistrict] = useState("");
  const [dirStatus, setDirStatus] = useState("all");
  const [dirDateRange, setDirDateRange] = useState("all");
  const [dirDateFrom, setDirDateFrom] = useState("");
  const [dirDateTo, setDirDateTo] = useState("");
  const [dirPayment, setDirPayment] = useState("all");
  const [dirVerified, setDirVerified] = useState("all");
  const [dirPhoto, setDirPhoto] = useState("all");
  const [dirMarital, setDirMarital] = useState("all");
  const [dirProfession, setDirProfession] = useState("all");
  const [dirSummary, setDirSummary] = useState<any>(null);
  const [directoryProfiles, setDirectoryProfiles] = useState<any[]>([]);
  const [dirTotal, setDirTotal] = useState(0);
  const [dirLoading, setDirLoading] = useState(false);

  // =========================================================================
  // 📝 3. MULTI-SELECTION & DYNAMIC NOTEPAD DOCK STATE
  // =========================================================================
  const [selectedProfiles, setSelectedProfiles] = useState<any[]>([]);
  const [notepadFormat, setNotepadFormat] = useState<"simple" | "detailed">("simple");
  const [notepadNote, setNotepadNote] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [isNotepadMinimized, setIsNotepadMinimized] = useState(false);

  // 💌 Dynamic WhatsApp Proposal Batch Generator State
  const [proposalBatchModal, setProposalBatchModal] = useState<{
    open: boolean;
    candidate: any;
    targetMatches: any[];
    recipientName: string;
    recipientPhone: string;
    templateType: "parents" | "direct" | "vip";
    customNote: string;
  } | null>(null);

  // 🖨️ Printable Candidate Sheet Modal State
  const [printSheetModal, setPrintSheetModal] = useState<{
    open: boolean;
    title: string;
    profiles: any[];
  } | null>(null);

  // 📞 Counselor & CRM Activity Log State
  const [counselorModal, setCounselorModal] = useState<{
    open: boolean;
    tsapId: string;
    name: string;
    phone?: string;
    currentStage: string;
    notes: any[];
    newStage: string;
    newNote: string;
    callbackAt: string;
    loading: boolean;
  } | null>(null);

  // 🪔 Vedic Astro Compatibility Calculator State
  const [astroCheckModal, setAstroCheckModal] = useState<{
    open: boolean;
    boyId: string;
    girlId: string;
    loading: boolean;
    result: any;
  } | null>(null);

  // 📊 Caste Demand & Supply Matrix State
  const [demandMatrixData, setDemandMatrixData] = useState<any[]>([]);

  // VIP / Plan Grant Modal State
  const [upgradeModal, setUpgradeModal] = useState<{
    open: boolean;
    tsapId: string;
    name: string;
    phone?: string;
    district?: string;
    caste?: string;
    currentPlan?: string;
  } | null>(null);

  // Photo Preview Modal State
  const [previewPhotoModal, setPreviewPhotoModal] = useState<{
    open: boolean;
    url: string;
    name: string;
    tsapId: string;
  } | null>(null);

  const [grantPlanCode, setGrantPlanCode] = useState<"" | "S_99" | "S_199" | "S_299" | "S_499">("");
  const [grantCredits, setGrantCredits] = useState<number>(0);
  const [grantPayMode, setGrantPayMode] = useState<string>("");
  const [grantUtr, setGrantUtr] = useState<string>("");
  const [grantNotes, setGrantNotes] = useState<string>("");
  const [grantAmount, setGrantAmount] = useState<number>(0);
  const [grantTriggerRef, setGrantTriggerRef] = useState<boolean>(false);

  // Success Activation Modal
  const [activatedSuccessModal, setActivatedSuccessModal] = useState<{
    tsapId: string;
    name: string;
    phone: string;
    plan: string;
    credits: number;
    waMessage: string;
  } | null>(null);

  // New Profile Form State
  const [newProf, setNewProf] = useState({
    full_name: "",
    gender: "",
    age: "",
    height: "",
    religion: "",
    caste: "",
    caste_custom: "",
    sub_caste: "",
    sub_caste_custom: "",
    gothram: "",
    star: "",
    rasi: "",
    education: "",
    job: "",
    salary: "",
    state: "",
    district: "",
    phone: "",
    photo_url: "",
    about_myself: "",
    consent_confirmed: false,
  });
  const [profSubmitting, setProfSubmitting] = useState(false);
  const [adminCasteOpts, setAdminCasteOpts] = useState<string[]>([]);
  const [adminCasteLoading, setAdminCasteLoading] = useState(false);
  const [adminCasteOffline, setAdminCasteOffline] = useState(false);

  const owner = me?.role === "owner";
  const financeAccess = owner || me?.role === "finance";
  const gotoLogin = () => { window.location.href = "/control/login"; };
  const resetGrantForm = () => {
    setGrantPlanCode("");
    setGrantCredits(0);
    setGrantPayMode("");
    setGrantUtr("");
    setGrantNotes("");
    setGrantAmount(0);
    setGrantTriggerRef(false);
  };

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(""), 3500);
  };

  const loadCore = useCallback(async () => {
    try {
      const u = await jget("/api/control/me");
      setMe(u);
      setTab("overview");
      const a = await jget("/api/control/analytics");
      setAn(a);
      setErr("");
    } catch (e: any) {
      if (e?.message === "401") gotoLogin();
      else setErr(e?.message || "Error loading control data");
    }
  }, []);

  const loadQueue = useCallback(async (st: string) => {
    try {
      const d = await jget(`/api/control/profile-queue?status=${st}`);
      setQueue(d.items || []);
    } catch { setQueue([]); }
  }, []);

  const loadReports = useCallback(async () => {
    try {
      const d = await jget("/api/control/reports");
      setReports(d.items || []);
    } catch { setReports([]); }
  }, []);

  const loadSpotlights = useCallback(async (st: string) => {
    try {
      const d = await jget(`/api/control/spotlight/queue?status=${st}`);
      setSpotlights(d.items || []);
    } catch { setSpotlights([]); }
  }, []);

  const loadPayouts = useCallback(async (st: string) => {
    try {
      const d = await jget(`/api/control/payouts/queue?status=${st}`);
      setPayouts(d.items || []);
    } catch { setPayouts([]); }
  }, []);

  const loadCastes = useCallback(async () => {
    try {
      const d = await jget("/api/control/castes");
      setCastesData(d.castes || []);
    } catch { setCastesData([]); }
  }, []);

  const loadVendors = useCallback(async () => {
    try {
      const d = await jget("/api/vendors/list?limit=100");
      setVendorsData(d.vendors || []);
    } catch { setVendorsData([]); }
  }, []);

  const loadAds = useCallback(async () => {
    try {
      const d = await jget("/api/control/ads");
      setAdsData(d.campaigns || []);
    } catch { setAdsData([]); }
  }, []);

  // Run Smart Matchmaker Search
  const runMatchmaker = useCallback(async (targetId?: string) => {
    const q = String(targetId || lookupQuery || "").trim();
    if (!q) return;
    setMmLoading(true);
    try {
      const qs = new URLSearchParams();
      if (mmFilters.caste) qs.set("caste", mmFilters.caste);
      if (mmFilters.district) qs.set("district", mmFilters.district);
      if (mmFilters.state) qs.set("state", mmFilters.state);
      if (mmFilters.education) qs.set("education", mmFilters.education);
      if (mmFilters.job) qs.set("job", mmFilters.job);
      if (mmFilters.age_min > 0) qs.set("age_min", String(mmFilters.age_min));
      if (mmFilters.age_max > 0) qs.set("age_max", String(mmFilters.age_max));
      if (mmFilters.salary_min > 0) qs.set("salary_min", String(mmFilters.salary_min));
      if (mmFilters.photo_only) qs.set("photo_only", "1");
      if (mmFilters.verified_only) qs.set("verified_only", "1");

      const d = await jget(`/api/control/matchmaker/${encodeURIComponent(q)}?${qs.toString()}`);
      if (d.success) {
        setCandidate(d.candidate);
        setMatchedResults(d.results || []);
        flash(`ℹ️ ${d.candidate?.full_name} (${d.candidate?.tsap_id}) కోసం ${d.count} profiles — filters apply అయ్యాయి; score లెక్కించలేదు`);
      }
    } catch (e: any) {
      flash(e?.message || "సంబంధాలు వెతకడంలో సమస్య ఏర్పడింది");
    } finally {
      setMmLoading(false);
    }
  }, [lookupQuery, mmFilters]);

  // Load Directory with Advanced Dates, Payment Status, Verification, Marital & Profession Filters
  const loadDirectory = useCallback(async () => {
    setDirLoading(true);
    try {
      const qs = new URLSearchParams();
      if (dirSearch) qs.set("q", dirSearch);
      if (dirGender) qs.set("gender", dirGender);
      if (dirCaste) qs.set("caste", dirCaste);
      if (dirDistrict) qs.set("district", dirDistrict);
      if (dirStatus) qs.set("status", dirStatus);
      if (dirDateRange) qs.set("date_range", dirDateRange);
      if (dirDateFrom) qs.set("date_from", dirDateFrom);
      if (dirDateTo) qs.set("date_to", dirDateTo);
      if (dirPayment) qs.set("payment_status", dirPayment);
      if (dirVerified) qs.set("verification_status", dirVerified);
      if (dirPhoto) qs.set("photo_filter", dirPhoto);
      if (dirMarital) qs.set("marital_filter", dirMarital);
      if (dirProfession && dirProfession !== "all") qs.set("profession_filter", dirProfession);
      qs.set("limit", "200");

      const d = await jget(`/api/control/directory?${qs.toString()}`);
      if (d.success) {
        setDirectoryProfiles(d.profiles || []);
        setDirTotal(d.total || 0);
        if (d.summary) setDirSummary(d.summary);
      }
    } catch {
      setDirectoryProfiles([]);
    } finally {
      setDirLoading(false);
    }
  }, [dirSearch, dirGender, dirCaste, dirDistrict, dirStatus, dirDateRange, dirDateFrom, dirDateTo, dirPayment, dirVerified, dirPhoto, dirMarital, dirProfession]);

  // 💌 Dynamic WhatsApp Proposal Text Generator
  const buildProposalText = (
    cand: any,
    matches: any[],
    tmpl: "parents" | "direct" | "vip",
    note: string
  ) => {
    if (!cand) return "";
    const genderLabel = cand.gender === "Bride"
      ? "వధువు (Bride)"
      : cand.gender === "Groom" ? "వరుడు (Groom)" : "ప్రొఫైల్ (Profile)";
    const candidateName = cand.full_name || cand.tsap_id || "ప్రొఫైల్ (Profile)";
    const candidateDetails = [cand.tsap_id, cand.caste, cand.district]
      .filter((value) => String(value || "").trim())
      .join(" • ");

    let header = "";
    if (tmpl === "parents") {
      header = `🙏 *నమస్కారం అండి!*\n\n*మన వివాహ (Mana Vivaha)* నుండి ${genderLabel} *${candidateName}*${candidateDetails ? ` (${candidateDetails})` : ""} కోసం అందుబాటులో ఉన్న ప్రొఫైల్ సూచనలను పంచుకుంటున్నాం. వివరాలు సభ్యులు అందించినవి; దయచేసి స్వతంత్రంగా నిర్ధారించండి:`;
    } else if (tmpl === "vip") {
      header = `👑 *ప్రొఫైల్ సూచనలు*\n\n*మన వివాహ (Mana Vivaha)* లోని *${candidateName}*${candidateDetails ? ` (${candidateDetails})` : ""} కోసం ఎంపిక చేసిన ప్రొఫైల్ వివరాలు:`;
    } else {
      header = `💐 *నమస్కారం ${candidateName} గారు!*\n\nమీ ప్రొఫైల్ ప్రాధాన్యతలకు సరిపోలవచ్చని చూపబడిన కొన్ని ప్రొఫైల్ వివరాలు ఇవి. సరిపోలిక హామీ కాదు; సభ్యులు అందించిన వివరాలను స్వతంత్రంగా నిర్ధారించండి:`;
    }

    let matchLines = "";
    if (matches && matches.length > 0) {
      matchLines = matches
        .map((m, idx) => {
          const mName = m.full_name || m.name || m.tsap_id || "Profile";
          const details = [
            m.age != null && String(m.age).trim() ? `${m.age} సం.` : "",
            m.height || "",
            m.caste ? `${m.caste}${m.sub_caste ? ` (${m.sub_caste})` : ""}` : "",
            m.education || "",
            m.job || "",
            m.salary || "",
            m.district || "",
          ].filter((value) => String(value || "").trim());
          const bio = m.tsap_id
            ? `\n   🎴 ప్రొఫైల్ వివరాలు: https://manavivaha.in/search/${encodeURIComponent(String(m.tsap_id))}` : "";
          return `\n*${idx + 1}. ${mName}${m.tsap_id && mName !== m.tsap_id ? ` (${m.tsap_id})` : ""}*${details.length ? `\n   📌 ${details.join(" • ")}` : ""}${bio}`;
        })
        .join("\n");
    } else {
      matchLines = "\n(ప్రొఫైల్ వివరాలు జతచేయలేదు)";
    }

    const notePart = note ? `\n\n📝 *గమనిక:* ${note}` : "";
    const footer = `\n\n🌐 manavivaha.in — సభ్యులు అందించిన వివరాలను, గుర్తింపును మరియు సంప్రదింపు సమాచారాన్ని స్వతంత్రంగా నిర్ధారించండి.\n\n_మన వివాహ • తెలుగు వివాహ పరిచయ వేదిక_`;

    return `${header}\n${matchLines}${notePart}${footer}`;
  };

  // 📞 Open Counselor CRM Modal & Fetch Notes
  const openCounselorModal = async (p: any) => {
    setCounselorModal({
      open: true,
      tsapId: p.tsap_id,
      name: p.full_name || p.name,
      phone: p.phone,
      currentStage: p.crm_stage || "new_lead",
      notes: p.counselor_notes || [],
      newStage: p.crm_stage || "spoke_interested",
      newNote: "",
      callbackAt: "",
      loading: true,
    });
    try {
      const d = await jget(`/api/control/profile/${encodeURIComponent(p.tsap_id)}/counselor-notes`);
      if (d.success) {
        setCounselorModal((prev: any) => prev ? { ...prev, notes: d.notes || [], currentStage: d.crm_stage, loading: false } : null);
      }
    } catch {
      setCounselorModal((prev: any) => prev ? { ...prev, loading: false } : null);
    }
  };

  // 💾 Save Counselor Note
  const saveCounselorNote = async () => {
    if (!counselorModal || !me) return;
    setBusyId(counselorModal.tsapId);
    try {
      const r = await fetch(`/api/control/profile/${encodeURIComponent(counselorModal.tsapId)}/counselor-note`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", "X-Control-CSRF": me.csrf },
        body: JSON.stringify({
          stage: counselorModal.newStage,
          note: counselorModal.newNote,
          callback_at: counselorModal.callbackAt,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || "Failed to save note");
      flash("✅ కౌన్సిలర్ నోట్ నమోదైంది!");
      setCounselorModal((prev: any) => prev ? {
        ...prev,
        notes: d.notes || [...prev.notes, d.entry],
        currentStage: counselorModal.newStage,
        newNote: "",
      } : null);
      loadDirectory();
    } catch (e: any) {
      flash(e?.message || "సేవ్ చేయడంలో సమస్య ఏర్పడింది");
    } finally {
      setBusyId("");
    }
  };

  // 🪔 Run Astro Porutham Check between Boy ID & Girl ID
  const runAstroCheck = async (boyId: string, girlId: string) => {
    if (!boyId || !girlId) return;
    setAstroCheckModal((prev: any) => prev ? { ...prev, loading: true } : null);
    try {
      const d = await jget(`/api/control/astro-check?boy_id=${encodeURIComponent(boyId)}&girl_id=${encodeURIComponent(girlId)}`);
      if (d.success) {
        setAstroCheckModal((prev: any) => prev ? { ...prev, result: d, loading: false } : null);
      }
    } catch (e: any) {
      flash(e?.message || "జాతక గుణమేళనం లెక్కించడంలో సమస్య ఏర్పడింది");
      setAstroCheckModal((prev: any) => prev ? { ...prev, loading: false } : null);
    }
  };

  // 📊 Load Caste Demand & Supply Matrix
  const loadDemandMatrix = useCallback(async () => {
    try {
      const d = await jget("/api/control/demand-matrix");
      if (d.success) {
        setDemandMatrixData(d.matrix || []);
      }
    } catch {
      setDemandMatrixData([]);
    }
  }, []);

  useEffect(() => { loadCore(); }, [loadCore]);
  useEffect(() => {
    const religion = newProf.religion;
    let live = true;
    if (!religion) {
      setAdminCasteOpts([]);
      setAdminCasteLoading(false);
      setAdminCasteOffline(false);
      return () => { live = false; };
    }
    const local = COMMUNITIES_BY_RELIGION[religion] || [];
    const order = (values: string[]) => sortUniqueOptions([...values, "Other / self-described"]);
    setAdminCasteOpts(order(local));
    setAdminCasteLoading(true);
    setAdminCasteOffline(false);
    fetch(`/api/meta/castes?religion=${encodeURIComponent(religion)}`)
      .then((r) => { if (!r.ok) throw new Error("Community list unavailable"); return r.json(); })
      .then((d) => {
        if (!live) return;
        if (!d?.success || !Array.isArray(d.castes)) throw new Error("Invalid community list");
        setAdminCasteOpts(order([...d.castes, ...local]));
        setAdminCasteLoading(false);
      })
      .catch(() => {
        if (!live) return;
        setAdminCasteOpts(order(local));
        setAdminCasteOffline(true);
        setAdminCasteLoading(false);
      });
    return () => { live = false; };
  }, [newProf.religion]);
  const adminSubcasteOpts = useMemo(() => {
    if (!newProf.religion || !newProf.caste || newProf.caste === "Other / self-described") return [];
    const known = newProf.religion === "Hindu" ? (CASTE_SUBCASTES[newProf.caste] || []) : [];
    return sortUniqueOptions([...known, "Other / self-described"]);
  }, [newProf.religion, newProf.caste]);
  useEffect(() => { if (tab === "matchmaker") runMatchmaker(); }, [tab, runMatchmaker]);
  useEffect(() => { if (tab === "directory") loadDirectory(); }, [tab, loadDirectory]);
  useEffect(() => { if (tab === "queue") loadQueue(qStatus); }, [tab, qStatus, loadQueue]);
  useEffect(() => { if (tab === "reports") loadReports(); }, [tab, loadReports]);
  useEffect(() => { if (tab === "spotlight") loadSpotlights(spStatus); }, [tab, spStatus, loadSpotlights]);
  useEffect(() => { if (tab === "referrals") loadPayouts(pStatus); }, [tab, pStatus, loadPayouts]);
  useEffect(() => { if (tab === "castes") { loadCastes(); loadDemandMatrix(); } }, [tab, loadCastes, loadDemandMatrix]);
  useEffect(() => { if (tab === "vendors") loadVendors(); }, [tab, loadVendors]);
  useEffect(() => { if (tab === "ads") loadAds(); }, [tab, loadAds]);

  // Profile Selection for Dynamic Notepad
  const toggleSelectProfile = (p: any) => {
    setSelectedProfiles((prev) => {
      const exists = prev.some((x) => x.tsap_id === p.tsap_id);
      if (exists) return prev.filter((x) => x.tsap_id !== p.tsap_id);
      return [...prev, p];
    });
  };

  const selectAllMatches = () => {
    if (selectedProfiles.length === matchedResults.length) {
      setSelectedProfiles([]);
    } else {
      setSelectedProfiles([...matchedResults]);
    }
  };

  const isProfileSelected = (id: string) => selectedProfiles.some((x) => x.tsap_id === id);

  // Dynamic Notepad Content Generator
  const generatedNotepadText = useMemo(() => {
    if (selectedProfiles.length === 0) return "";
    if (notepadFormat === "simple") {
      // Simple one-line format; values come only from the selected records.
      return selectedProfiles
        .map((p) => {
          const name = (p.full_name || "Profile").toLowerCase();
          const phone = p.phone || "—";
          return `${name} -- ${phone}`;
        })
        .join("\n");
    } else {
      // Detailed format; no static member examples are embedded.
      return selectedProfiles
        .map((p, idx) => {
          const icon = p.gender === "Bride" ? "👰" : "🤵";
          const details = [p.tsap_id, p.caste, p.age ? `${p.age}y` : "", p.job].filter(Boolean).join(" • ");
          return `${idx + 1}. ${icon} ${p.full_name} (${details}) -- 📞 ${p.phone || "—"}`;
        })
        .join("\n");
    }
  }, [selectedProfiles, notepadFormat]);

  const copyNotepadToClipboard = () => {
    const textToCopy = notepadNote ? `${notepadNote}\n\n${generatedNotepadText}` : generatedNotepadText;
    if (!textToCopy) return;
    navigator.clipboard?.writeText(textToCopy);
    flash("📋 నోట్‌ప్యాడ్ కాపీ అయ్యింది! (Copied to Clipboard)");
  };

  // WhatsApp Share Generator
  const shareWhatsApp = (includeNumbers: boolean) => {
    if (selectedProfiles.length === 0) {
      flash("⚠️ దయచేసి కనీసం ఒక ప్రొఫైల్‌ను ఎంచుకోండి");
      return;
    }

    let header = `💍 *మన వివాహ (Mana Vivaha) — సంబంధాల వివరాలు*\n\n`;
    if (candidate) {
      const candidateDetails = [candidate.tsap_id, candidate.caste, candidate.age ? `${candidate.age}y` : ""].filter(Boolean).join(" • ");
      header += `👤 *అభ్యర్థి:* ${candidate.full_name} (${candidateDetails})\n`;
      header += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
    }

    let body = "";
    if (includeNumbers) {
      // MODE B: Full Profiles WITH PHONE NUMBERS
      body = selectedProfiles
        .map((p, idx) => {
          const icon = p.gender === "Bride" ? "👰" : "🤵";
          let line = `${idx + 1}. ${icon} *${p.full_name}* (${p.tsap_id})\n`;
          const ageHeight = [p.age ? `వయస్సు: ${p.age} సం.` : "", p.height ? `ఎత్తు: ${p.height}` : ""].filter(Boolean).join(" | ");
          if (ageHeight) line += `   🎂 ${ageHeight}\n`;
          if (p.caste) line += `   💍 కులం: ${p.caste}${p.sub_caste ? ` (${p.sub_caste})` : ""}\n`;
          const educationJob = [p.education ? `విద్య: ${p.education}` : "", p.job ? `ఉద్యోగం: ${p.job}` : ""].filter(Boolean).join(" | ");
          if (educationJob) line += `   🎓 ${educationJob}\n`;
          const location = [p.district, p.state].filter(Boolean).join(", ");
          if (location) line += `   📍 ప్రాంతం: ${location}\n`;
          if (p.ashtakoota_total_36 != null) line += `   🪐 36-guna Ashtakoota reference total: ${p.ashtakoota_total_36}/36 — traditional calculation only, not a marriage verdict\n`;
          if (p.porutham_checks_passed != null) line += `   🪔 Porutham checks marked pass: ${p.porutham_checks_passed} of ${p.porutham_checks_total} — review each item; not a compatibility score\n`;
          line += `   📞 *ఫోన్ నంబర్:* ${p.phone || "అందుబాటులో లేదు"}\n`;
          return line;
        })
        .join("\n");
    } else {
      // MODE A: Privacy Safe (NO PHONE NUMBERS)
      body = selectedProfiles
        .map((p, idx) => {
          const icon = p.gender === "Bride" ? "👰" : "🤵";
          let line = `${idx + 1}. ${icon} *${p.full_name}* (${p.tsap_id})\n`;
          const ageHeight = [p.age ? `வయస్సు: ${p.age} సం.` : "", p.height ? `ఎత్తు: ${p.height}` : ""].filter(Boolean).join(" | ");
          if (ageHeight) line += `   🎂 ${ageHeight}\n`;
          if (p.caste) line += `   💍 కులం: ${p.caste}${p.sub_caste ? ` (${p.sub_caste})` : ""}\n`;
          const educationJob = [p.education ? `విద్య: ${p.education}` : "", p.job ? `ఉద్యోగం: ${p.job}` : ""].filter(Boolean).join(" | ");
          if (educationJob) line += `   🎓 ${educationJob}\n`;
          const location = [p.district, p.state].filter(Boolean).join(", ");
          if (location) line += `   📍 ప్రాంతం: ${location}\n`;
          if (p.ashtakoota_total_36 != null) line += `   🪐 36-guna Ashtakoota reference total: ${p.ashtakoota_total_36}/36 — traditional calculation only, not a marriage verdict\n`;
          if (p.porutham_checks_passed != null) line += `   🪔 Porutham checks marked pass: ${p.porutham_checks_passed} of ${p.porutham_checks_total} — review each item; not a compatibility score\n`;
          line += `   🔗 ప్రొఫైల్ లింక్: https://manavivaha.in/search/${p.tsap_id}\n`;
          return line;
        })
        .join("\n");
    }

    const footer = `\n━━━━━━━━━━━━━━━━━━━━━\n🌐 మన వివాహ (Mana Vivaha) — member-submitted profiles; please verify details independently.\n👉 https://manavivaha.in`;
    const fullMsg = header + body + footer;

    const waUrl = whatsappPhoneLink(recipientPhone, fullMsg) || whatsappShareLink(fullMsg);

    window.open(waUrl, "_blank");
  };

  // Telegram Share Generator
  const shareTelegram = () => {
    if (selectedProfiles.length === 0) return;
    const msg = `💍 *మన వివాహ (Mana Vivaha) — సరిపోలే సంబంధాలు*\n\n` +
      selectedProfiles
        .map((p, i) => `${i + 1}. ${p.full_name} (${p.tsap_id}) — ${p.caste} • ${p.age}y • ${p.district}\n📞 ${p.phone}`)
        .join("\n\n") +
      `\n\n🌐 https://manavivaha.in`;

    window.open(`https://t.me/share/url?url=${encodeURIComponent("https://manavivaha.in")}&text=${encodeURIComponent(msg)}`, "_blank");
  };

  const exportProfilesCsv = () => {
    const list = directoryProfiles.length > 0 ? directoryProfiles : matchedResults;
    if (list.length === 0) {
      flash("⚠️ ఎగుమతి చేయడానికి ప్రొఫైళ్లు ఏవీ లేవు");
      return;
    }
    const headers = ["Profile_ID", "Full_Name", "Gender", "Age", "Caste", "Sub_Caste", "Education", "Job", "District", "State", "Phone", "Plan", "Verification_Check_Recorded"];
    const rows = list.map((p) => [
      `"${p.tsap_id || ""}"`,
      `"${(p.full_name || "").replace(/"/g, '""')}"`,
      `"${p.gender || ""}"`,
      `"${p.age || ""}"`,
      `"${(p.caste || "").replace(/"/g, '""')}"`,
      `"${(p.sub_caste || "").replace(/"/g, '""')}"`,
      `"${(p.education || "").replace(/"/g, '""')}"`,
      `"${(p.job || "").replace(/"/g, '""')}"`,
      `"${(p.district || "").replace(/"/g, '""')}"`,
      `"${p.state || ""}"`,
      `"${p.phone || ""}"`,
      `"${p.plan || "Free"}"`,
      `"${p.is_verified ? "Yes" : "No"}"`,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `mana-vivaha-profiles-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    flash("📥 ప్రొఫైల్స్ CSV విజయవంతంగా డౌన్‌లోడ్ అయ్యింది!");
  };

  async function payoutAction(reqId: string, action: "approve" | "reject", utr = "", reason = "") {
    if (!me) return;
    if (action === "approve" && !utr.trim()) {
      flash("చెల్లింపు నిర్ధారణకు నిజమైన UTR అవసరం.");
      return;
    }
    if (action === "reject" && !reason.trim()) {
      flash("తిరస్కరణకు కారణం నమోదు చేయండి.");
      return;
    }
    setBusyId(reqId);
    try {
      const r = await fetch(`/api/control/payouts/${encodeURIComponent(reqId)}/action`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", "X-Control-CSRF": me.csrf },
        body: JSON.stringify({ action, utr: utr.trim(), reason: reason.trim() }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || d.reason || "fail");
      flash(d.message_telugu || L.done);
      loadPayouts(pStatus);
      loadCore();
    } catch (e: any) { flash(e?.message || L.failed); }
    finally { setBusyId(""); }
  }

  async function profileAction(id: string, action: "approve" | "reject" | "pending") {
    if (!me) return;
    const note = action === "reject" ? window.prompt("Enter a specific rejection reason:")?.trim() || "" : "";
    if (action === "reject" && !note) return;
    setBusyId(id);
    try {
      const r = await fetch(`/api/control/profile/${encodeURIComponent(id)}/action`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", "X-Control-CSRF": me.csrf },
        body: JSON.stringify({ action, note }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || "fail");
      flash(d.message || L.done);
      setQueue((q) => q.filter((x) => x.tsap_id !== id));
      loadCore();
    } catch { flash(L.failed); }
    finally { setBusyId(""); }
  }

  async function resolveReport(reportId: string, action: "warn" | "hide" | "ban" | "dismiss") {
    if (!me) return;
    if ((action === "hide" || action === "ban") && !window.confirm(`Confirm ${action} for the reported profile?`)) return;
    const note = window.prompt("Enter the review reason:")?.trim() || "";
    if (!note) return;
    setBusyId(reportId);
    try {
      const r = await fetch(`/api/control/reports/${encodeURIComponent(reportId)}/resolve`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", "X-Control-CSRF": me.csrf },
        body: JSON.stringify({ action, note }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || "Could not resolve report");
      flash(d.action || L.done);
      await loadReports();
      await loadCore();
    } catch (e: any) {
      flash(e?.message || L.failed);
    } finally {
      setBusyId("");
    }
  }

  async function upgradeProfile(
    id: string,
    plan: "S_99" | "S_199" | "S_299" | "S_499" = "S_99",
    credits?: number,
    triggerRef: boolean = true,
    payMode: string = "UPI_QR",
    utrNum: string = "",
    noteText: string = "",
    amtVal?: number
  ) {
    if (!me) return;
    setBusyId(id);
    try {
      const r = await fetch(`/api/control/profile/${encodeURIComponent(id)}/upgrade`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", "X-Control-CSRF": me.csrf },
        body: JSON.stringify({
          plan,
          credits,
          trigger_referral: triggerRef,
          payment_mode: payMode,
          utr: utrNum,
          notes: noteText,
          amount: amtVal,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || d.message_telugu || "Failed");
      flash(d.message_telugu || `👑 ${id} విజయవంతంగా ${plan} కి అప్‌గ్రేడ్ చేయబడింది!`);
      loadDirectory();
      if (candidate?.tsap_id === id) {
        setCandidate((c: any) => c ? { ...c, plan: d.plan, credits: d.credits, is_premium: true } : c);
      }
      const targetProf = directoryProfiles.find((x) => x.tsap_id === id);
      setUpgradeModal(null);
      if (d.wa_message) {
        setActivatedSuccessModal({
          tsapId: id,
          name: d.full_name || id,
          phone: targetProf?.phone || "",
          plan: d.plan_title || plan,
          credits: d.credits,
          waMessage: d.wa_message,
        });
      }
    } catch (e: any) {
      flash(e?.message || "ప్లాన్ యాక్టివేషన్ విఫలమైంది");
    } finally {
      setBusyId("");
    }
  }

  async function spotlightAction(promoId: string, action: "verify_payment" | "approve" | "reject" | "close", days?: number) {
    if (!me) return;
    const notes = (spPaymentNotes[promoId] || "").trim();
    if (action === "verify_payment") {
      if (notes.length < 8) {
        flash("Add an audit note describing how the UTR was matched to the bank statement.");
        return;
      }
      if (!window.confirm("Confirm you personally matched this UTR and amount against the merchant bank statement. This does not activate the profile.")) return;
    }
    setBusyId(promoId);
    try {
      const r = await fetch(`/api/control/spotlight/${encodeURIComponent(promoId)}/action`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", "X-Control-CSRF": me.csrf },
        body: JSON.stringify({ action, days, notes }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || "fail");
      flash(d.message || L.done);
      loadSpotlights(spStatus);
      loadCore();
    } catch (e: any) { flash(e?.message || L.failed); }
    finally { setBusyId(""); }
  }

  async function handleAdAction(cid: string, action: string, extra?: any) {
    if (!me) return;
    if (action === "approve") {
      const utr = (adUtrById[cid] || "").trim();
      if (!/^[A-Za-z0-9/-]{6,64}$/.test(utr)) {
        flash("Enter the actual payment reference before approval.");
        return;
      }
      if (!window.confirm("Confirm that you reviewed the payment receipt and matched this UTR to the campaign amount.")) return;
      extra = { ...extra, utr };
    }
    if (action === "reject") {
      const reason = (adReasonById[cid] || "").trim();
      if (reason.length < 5) {
        flash("Add a clear reason before rejecting this campaign.");
        return;
      }
      extra = { ...extra, reason };
    }
    setBusyId(cid);
    try {
      const r = await fetch(`/api/control/ads/${encodeURIComponent(cid)}/action`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", "X-Control-CSRF": me.csrf },
        body: JSON.stringify({ action, ...extra }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || d.message_telugu || "Failed");
      flash(d.message_telugu || "Action completed!");
      loadAds();
    } catch (err: any) {
      flash(err?.message || "Failed to update ad");
    } finally {
      setBusyId("");
    }
  }

  function updateAdDraft(patch: Partial<typeof adDraft>) {
    setAdDraft((current) => ({ ...current, ...patch }));
    setAdQuote(null);
  }

  async function previewAdQuote() {
    setAdQuoteLoading(true);
    setAdQuote(null);
    try {
      const districts = adDraft.districts.split(/[;,\\n]/).map((value) => value.trim()).filter(Boolean);
      const r = await fetch("/api/ads/quote", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level: adDraft.level, days: Number(adDraft.days), districts, slots: adDraft.slots }),
      });
      const data = await r.json();
      if (!r.ok || !data.success) throw new Error(data.detail || data.message_telugu || "Unable to calculate quote");
      setAdQuote(data);
    } catch (error: any) {
      flash(error?.message || "Unable to calculate campaign quote");
    } finally {
      setAdQuoteLoading(false);
    }
  }

  async function handleCreateAd(e: React.FormEvent) {
    e.preventDefault();
    if (!me) return;
    setAdDraftBusy(true);
    try {
      const districts = adDraft.districts.split(/[;,\\n]/).map((value) => value.trim()).filter(Boolean);
      const r = await fetch("/api/control/ads/create", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", "X-Control-CSRF": me.csrf },
        body: JSON.stringify({ ...adDraft, days: Number(adDraft.days), districts }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.detail || data.message_telugu || "Campaign could not be created");
      flash("Campaign request created as pending. It is not live until payment is reviewed and approved.");
      setAdDraft((current) => ({ ...current, title: "", offer: "", image_url: "", link: "" }));
      setAdQuote(null);
      loadAds();
    } catch (error: any) {
      flash(error?.message || "Campaign could not be created");
    } finally {
      setAdDraftBusy(false);
    }
  }

  async function handleCreateProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!me) return;
    setProfSubmitting(true);
    try {
      const r = await fetch("/api/control/profiles/add", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", "X-Control-CSRF": me.csrf },
        body: JSON.stringify(newProf),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || "Failed to create profile");
      flash(`✅ Profile created: ${d.tsap_id}`);
      loadCore();
      setLookupQuery(d.tsap_id);
      runMatchmaker(d.tsap_id);
      setTab("matchmaker");
    } catch (err: any) {
      flash(err?.message || "Error creating profile");
    } finally {
      setProfSubmitting(false);
    }
  }

  async function signout() {
    if (!me) return;
    try {
      await fetch("/api/control/logout", {
        method: "POST", credentials: "include",
        headers: { "X-Control-CSRF": me.csrf },
      });
    } finally { gotoLogin(); }
  }

  if (err) {
    return (
      <main className="min-h-dvh bg-cream p-8 text-center">
        <p className="text-rose-700 font-bold">{err}</p>
        <button onClick={loadCore} className="mt-4 rounded-xl maroon-gradient px-4 py-2 text-white font-bold">{L.refresh}</button>
      </main>
    );
  }

  if (!me || !an) {
    return (
      <main className="min-h-dvh bg-cream p-8 text-center text-sm font-bold text-slate-600">
        {err ? (
          <div role="alert" className="mx-auto max-w-lg rounded-2xl border border-rose-200 bg-white p-6">
            <p>{err === "401" ? "Your control session has expired. Please sign in again." : "Control data could not be loaded. No member records are shown."}</p>
            <button type="button" onClick={() => err === "401" ? gotoLogin() : void loadCore()} className="mt-4 rounded-xl bg-[#7A0C2E] px-4 py-2 text-white">{err === "401" ? "Sign in" : "Retry"}</button>
          </div>
        ) : L.loading}
      </main>
    );
  }

  const t = an.totals;
  const safeWorkerTabs = [
    { k: "overview" as const, label: L.tabOverview },
    { k: "queue" as const, label: `${L.tabQueue} (${t.pending})` },
    { k: "reports" as const, label: `${L.tabReports} (${t.open_reports})` },
  ];
  const financeTabs = [
    { k: "overview" as const, label: L.tabOverview },
    { k: "referrals" as const, label: L.tabReferrals },
    { k: "revenue" as const, label: L.tabRevenue },
  ];
  const ownerTabs = [
    { k: "matchmaker" as const, label: "⚡ స్మార్ట్ మ్యాచ్ మేకర్" },
    { k: "directory" as const, label: `📇 డైరెక్టరీ & కాంటాక్ట్స్ (${t.profiles})` },
    { k: "overview" as const, label: L.tabOverview },
    { k: "queue" as const, label: `${L.tabQueue} (${t.pending})` },
    { k: "castes" as const, label: L.tabCastes },
    { k: "channels" as const, label: L.tabChannels },
    { k: "numbers" as const, label: L.tabNumbers },
    { k: "addProfile" as const, label: L.tabAddProfile },
    { k: "ads" as const, label: L.tabAds },
    { k: "vendors" as const, label: L.tabVendors },
    { k: "spotlight" as const, label: L.tabSpotlight },
    { k: "referrals" as const, label: L.tabReferrals },
    { k: "reports" as const, label: `${L.tabReports} (${t.open_reports})` },
    { k: "revenue" as const, label: L.tabRevenue },
    { k: "audit" as const, label: L.tabAudit },
  ];
  const tabs = owner ? ownerTabs : financeAccess ? financeTabs : safeWorkerTabs;

  return (
    <main className="min-h-dvh bg-[#FAF6F0] pb-44 text-slate-800">
      
      {/* =========================================================================
          TOP OPERATIONS HEADER (WITH PROMINENT WHATSAPP & TELEGRAM BUTTONS)
          ========================================================================= */}
      <header className="sticky top-0 z-30 border-b border-gold/30 bg-white/95 backdrop-blur shadow-sm">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          
          {/* Brand & Auth Badge */}
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl maroon-gradient text-white text-xl font-black shadow-md shrink-0">
              👑
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-extrabold text-[#7A0C2E]">
                  మన వివాహ <span className="text-slate-800">{owner ? "అడ్మిన్ పోర్టల్" : financeAccess ? "ఫైనాన్స్ డెస్క్" : "మోడరేషన్ వర్క్‌స్పేస్"}</span>
                </span>
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                  owner ? "bg-amber-100 text-amber-900 border border-amber-300" : "bg-slate-100 text-slate-700"
                }`}>
                  {me.role}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                {L.signedAs} <b>{me.username}</b> • {owner ? "All owner operations" : financeAccess ? "Finance operations" : "Profile review and report moderation"}
              </p>
            </div>
          </div>

          {/* Quick Action Buttons Header (WhatsApp + Telegram + Live Site + Refresh) */}
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            {owner && SITE_CONFIG.supportWhatsapp && (
              <a
                href={whatsappPhoneLink(SITE_CONFIG.supportWhatsapp, "Namaste Operations Support") || undefined}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#25D366] px-3.5 py-2 text-xs font-extrabold text-white shadow-sm hover:brightness-105 active:scale-95 transition-all"
                title="Configured WhatsApp contact; availability is not monitored"
              >
                <span aria-hidden="true">💬</span>
                <span>WhatsApp</span>
              </a>
            )}
            {owner && SITE_CONFIG.botUrl && (
              <a
                href={SITE_CONFIG.botUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#229ED9] px-3.5 py-2 text-xs font-extrabold text-white shadow-sm hover:brightness-105 active:scale-95 transition-all"
                title="Open configured Telegram bot"
              >
                <span aria-hidden="true">📢</span>
                <span>Telegram</span>
              </a>
            )}
            <Link
              href="/"
              target="_blank"
              className="inline-flex items-center gap-1 rounded-xl border border-maroon/25 px-3 py-2 text-xs font-bold text-maroon hover:bg-cream transition-all"
            >
              <span aria-hidden="true">🌐</span>
              <span>Live Site</span>
            </Link>
            <button
              type="button"
              onClick={() => void loadCore()}
              aria-label={L.refresh}
              className="rounded-xl border border-gold/40 px-3 py-2 text-xs font-bold text-maroon hover:bg-cream transition-all"
            >
              <span aria-hidden="true">🔄</span>
            </button>
            <button
              type="button"
              onClick={signout}
              className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 transition-all"
            >
              {L.signout}
            </button>
          </div>
        </div>

        {/* Tab Strip */}
        <div className="mx-auto flex max-w-7xl gap-1.5 overflow-x-auto px-4 pb-2.5 pt-1 scrollbar-none">
          {tabs.map((x) => (
            <button
              key={x.k}
              onClick={() => setTab(x.k)}
              className={`shrink-0 rounded-2xl px-4 py-2 text-xs font-black transition-all ${
                tab === x.k
                  ? "maroon-gradient text-white shadow-md scale-[1.02]"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-maroon"
              }`}
            >
              {x.label}
            </button>
          ))}
        </div>
      </header>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-20 right-4 z-50 rounded-2xl border border-amber-300 bg-amber-50 px-5 py-3 text-xs font-black text-maroon shadow-xl flex items-center gap-2 animate-bounce">
          <span>🔔</span>
          <span>{toast}</span>
        </div>
      )}

      {/* Main Content View */}
      <div className="mx-auto max-w-7xl px-4 pt-4 space-y-4">
        
        <div className="bg-gradient-to-r from-[#170514] via-[#2c0821] to-[#170514] text-white rounded-3xl p-4 sm:p-5 border border-gold/40 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-3.5 w-3.5 shrink-0 rounded-full bg-amber-300" aria-hidden="true" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-amber-300">
                  {owner ? "ఆపరేషన్స్ డెస్క్" : financeAccess ? "ఫైనాన్స్ డెస్క్" : "ప్రొఫైల్ సమీక్ష వర్క్‌స్పేస్"}
                </span>
                <span className="bg-white/10 text-white text-[10px] font-bold px-2 py-0.5 rounded-full border border-white/20">
                  {owner ? "Owner" : financeAccess ? "Finance" : "Moderation"}
                </span>
              </div>
              <p className="text-[11px] text-white/80 mt-0.5 telugu">
                సిస్టమ్‌లో ప్రస్తుతం ఉన్న లెక్కలు మాత్రమే; ప్రొఫైల్ సమాచారం సభ్యులు అందించినది.
              </p>
            </div>
          </div>

          {/* Key Quick Shift Metrics */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
            <div className="bg-white/10 px-3 py-1.5 rounded-xl border border-white/15 flex items-center gap-1.5">
              <span>👥</span>
              <span className="font-bold">{t.profiles} ప్రొఫైళ్లు</span>
            </div>
            <div className="bg-white/10 px-3 py-1.5 rounded-xl border border-white/15 flex items-center gap-1.5">
              <span>📸</span>
              <span className="font-bold text-amber-300">{t.with_photo} ఫోటోలు</span>
            </div>
            <div className="bg-white/10 px-3 py-1.5 rounded-xl border border-white/15 flex items-center gap-1.5">
              <span>💌</span>
              <span className="font-bold text-emerald-300">{t.interests} మ్యాచ్‌లు</span>
            </div>
            {owner && (
              <button
                type="button"
                onClick={exportProfilesCsv}
                className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold px-3 py-1.5 rounded-xl shadow-xs transition flex items-center gap-1.5"
              >
                <span aria-hidden="true">📥</span>
                <span>CSV ఎగుమతి</span>
              </button>
            )}
          </div>
        </div>
        
        {/* =========================================================================
            TAB 1: ⚡ SMART MATCHMAKER (SINGLE PROFILE ID LOOKUP & SUITABLE MATCHES)
            ========================================================================= */}
        {tab === "matchmaker" && owner && (
          <div className="space-y-6">
            
            {/* Header / Instructions */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gold/30 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-[#7A0C2E] flex items-center gap-2">
                    <span>⚡</span>
                    <span>స్మార్ట్ మ్యాచ్ మేకర్ & జాతక సరిపోలిక (1-Click Matchmaker)</span>
                  </h2>
                  <p className="text-xs text-slate-600 mt-1">
                    నమోదు చేసిన ఖచ్చితమైన Profile ID ఇవ్వండి. ఫలితాలు అందుబాటులో ఉన్న వివరాల ఆధారంగా ర్యాంక్ అవుతాయి; జాతక గుణమేళనం మార్గదర్శకం మాత్రమే.
                  </p>
                </div>

                {/* Single ID Search Bar */}
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <div className="relative flex-1 md:w-80">
                    <input
                      type="text"
                      value={lookupQuery}
                      onChange={(e) => setLookupQuery(e.target.value.toUpperCase())}
                      onKeyDown={(e) => { if (e.key === "Enter") runMatchmaker(); }}
                      placeholder="Enter an existing profile ID"
                      aria-label="Existing profile ID"
                      className="w-full px-4 py-2.5 rounded-2xl border-2 border-gold/50 text-sm font-bold font-mono focus:border-maroon focus:outline-none bg-amber-50/40"
                    />
                  </div>
                  <button
                    onClick={() => runMatchmaker()}
                    disabled={mmLoading}
                    className="px-5 py-2.5 rounded-2xl maroon-gradient text-white font-extrabold text-xs shadow-md hover-lift disabled:opacity-50 whitespace-nowrap"
                  >
                    {mmLoading ? "వెతుకుతోంది…" : "🔍 సంబంధాలు శోధించండి"}
                  </button>
                </div>
              </div>

            </div>

            {/* Candidate Card (The Target Buyer / Applicant) */}
            {candidate && (
              <div className="bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-amber-500/10 rounded-3xl p-5 border-2 border-gold/40 shadow-md">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  
                  {/* Left: Avatar & Main Attributes */}
                  <div className="flex items-start gap-4">
                    <div className="relative shrink-0">
                      {candidate.photo_url ? (
                        <img
                          src={candidate.photo_url}
                          alt={candidate.full_name}
                          className="w-20 h-24 rounded-2xl object-cover border-2 border-gold/60 shadow-md"
                        />
                      ) : (
                        <div className="w-20 h-24 rounded-2xl bg-white border-2 border-gold/40 flex flex-col items-center justify-center text-3xl shadow-sm text-maroon">
                          <span>{candidate.gender === "Bride" ? "👰" : "🤵"}</span>
                        </div>
                      )}
                      {candidate.is_verified && (
                        <span className="absolute -bottom-2 -right-1 bg-emerald-600 text-white rounded-full p-1 shadow" title="Verification evidence is recorded; this is not an identity guarantee">
                          ✓
                        </span>
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-lg font-black text-[#7A0C2E]">{candidate.full_name}</span>
                        <span className="font-mono text-xs font-extrabold bg-maroon text-white px-2.5 py-0.5 rounded-full">
                          {candidate.tsap_id}
                        </span>
                        <span className="text-xs font-bold text-slate-500">
                          {candidate.gender === "Bride" ? "వధువు" : "వరుడు"}{candidate.age ? ` • ${candidate.age} సం.` : ""}
                        </span>
                      </div>

                      <div className="text-xs font-bold text-slate-700 flex flex-wrap gap-x-3 gap-y-1">
                        {candidate.caste && <span>💍 <b>కమ్యూనిటీ:</b> {candidate.caste} {candidate.sub_caste ? `(${candidate.sub_caste})` : ""}</span>}
                        {candidate.gothram && <span>🪔 <b>గోత్రం:</b> {candidate.gothram}</span>}
                        {candidate.star && <span>⭐ <b>నక్షత్రం:</b> {candidate.star}</span>}
                        {candidate.rasi && <span>🌙 <b>రాశి:</b> {candidate.rasi}</span>}
                      </div>

                      <div className="text-xs text-slate-600 flex flex-wrap gap-x-3 gap-y-1 pt-0.5">
                        {candidate.education && <span>🎓 <b>విద్య:</b> {candidate.education}</span>}
                        {candidate.job && <span>💼 <b>వృత్తి:</b> {candidate.job}</span>}
                        {candidate.salary && <span>💰 <b>ఆదాయం:</b> {candidate.salary}</span>}
                        {(candidate.district || candidate.state) && <span>📍 <b>ప్రాంతం:</b> {[candidate.district, candidate.state].filter(Boolean).join(", ")}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Right: Unmasked Direct Phone & Quick Actions */}
                  <div className="bg-white/90 rounded-2xl p-3.5 border border-gold/40 shadow-xs flex flex-col sm:items-end gap-2 w-full md:w-auto">
                    <div className="text-right">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">📞 డైరెక్ట్ కాంటాక్ట్ నంబర్:</span>
                      <span className="text-base font-black text-emerald-800 font-mono tracking-wide">
                        {candidate.phone || "నంబర్ లేదు"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      {/* Plan Badge & Fast Upgrade Button */}
                      <div className="flex items-center gap-1.5">
                        <span className="px-2.5 py-1 rounded-xl text-[10px] font-black bg-slate-100 text-slate-700 border border-slate-200">
                          ప్లాన్: {candidate.plan || "స్థితి అందుబాటులో లేదు"}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            resetGrantForm();
                            setUpgradeModal({ open: true, tsapId: candidate.tsap_id, name: candidate.full_name, currentPlan: candidate.plan });
                          }}
                          className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 text-white font-extrabold text-[11px] shadow-xs hover:brightness-110 active:scale-95 transition"
                          title="Manually grant a plan; this does not verify identity or approve the profile"
                        >
                          ప్లాన్ మంజూరు
                        </button>
                      </div>

                      {candidate.phone && (
                        <>
                          <a
                            href={whatsappPhoneLink(candidate.phone) || undefined}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-xl bg-[#25D366] text-white font-extrabold text-[11px] shadow-xs flex items-center gap-1"
                          >
                            <span>💬</span>
                            <span>WhatsApp</span>
                          </a>
                          <a
                            href={`tel:${candidate.phone}`}
                            className="px-3 py-1.5 rounded-xl bg-slate-800 text-white font-extrabold text-[11px] shadow-xs flex items-center gap-1"
                          >
                            <span>📞</span>
                            <span>Call</span>
                          </a>
                        </>
                      )}
                      <button
                        onClick={() => {
                          setProposalBatchModal({
                            open: true,
                            candidate: candidate,
                            targetMatches: matchedResults.slice(0, 3),
                            recipientName: candidate.full_name,
                            recipientPhone: candidate.phone || "",
                            templateType: "parents",
                            customNote: "",
                          });
                        }}
                        className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-extrabold text-[11px] shadow-xs flex items-center gap-1 hover:brightness-105 active:scale-95 transition"
                        title="WhatsApp ప్రపోజల్ మెసేజ్ బిల్డ్ చేయండి"
                      >
                        <span>💌</span>
                        <span>WhatsApp ప్రపోజల్</span>
                      </button>

                      <button
                        onClick={() => {
                          setPrintSheetModal({
                            open: true,
                            title: `${candidate.full_name} (${candidate.tsap_id}) — మ్యాచ్ షీట్`,
                            profiles: [candidate, ...matchedResults],
                          });
                        }}
                        className="px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-800 text-white font-extrabold text-[11px] shadow-xs flex items-center gap-1 transition"
                        title="మ్యాచ్‌ల వివరాలు ప్రింట్ చేయండి"
                      >
                        <span>🖨️</span>
                        <span>ప్రింట్ షీట్</span>
                      </button>

                      <button
                        onClick={() => {
                          const topMatch = matchedResults[0];
                          const isBride = candidate.gender === "Bride";
                          const bId = isBride ? (topMatch?.tsap_id || "") : candidate.tsap_id;
                          const gId = isBride ? candidate.tsap_id : (topMatch?.tsap_id || "");
                          setAstroCheckModal({
                            open: true,
                            boyId: bId,
                            girlId: gId,
                            loading: false,
                            result: null,
                          });
                          if (bId && gId) {
                            runAstroCheck(bId, gId);
                          }
                        }}
                        className="px-3 py-1.5 rounded-xl bg-purple-50 text-purple-900 border border-purple-200 font-extrabold text-[11px] shadow-xs flex items-center gap-1 hover:bg-purple-100 transition"
                        title="వేద జాతక గుణమేళనం లెక్కించండి"
                      >
                        <span>🪔</span>
                        <span>జాతక చెకర్</span>
                      </button>

                      <button
                        onClick={() => openCounselorModal(candidate)}
                        className="px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-900 border border-indigo-200 font-extrabold text-[11px] shadow-xs flex items-center gap-1 hover:bg-indigo-100 transition"
                        title="కౌన్సిలర్ నోట్స్ & కాల్ లాగ్స్"
                      >
                        <span>📝</span>
                        <span>CRM నోట్స్</span>
                      </button>

                      <button
                        onClick={() => toggleSelectProfile(candidate)}
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition ${
                          isProfileSelected(candidate.tsap_id)
                            ? "bg-maroon text-white border-maroon"
                            : "bg-white text-maroon border-gold/40 hover:bg-cream"
                        }`}
                      >
                        {isProfileSelected(candidate.tsap_id) ? "✓ నోట్‌ప్యాడ్‌లో ఉంది" : "➕ నోట్‌ప్యాడ్‌కు జోడించు"}
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* Advanced Filters Bar for Matches */}
            <div className="bg-white rounded-3xl p-4 border border-gold/30 shadow-xs space-y-3">
              <div className="flex items-center justify-between text-xs font-black text-slate-700">
                <span>🎯 సరిపోయే సంబంధాల వడపోతలు (Filter Matches):</span>
                <button
                  onClick={() => {
                    setMmFilters({
                      caste: "", district: "", state: "", education: "",
                      job: "", age_min: 0, age_max: 0,
                      salary_min: 0, photo_only: false, verified_only: false,
                    });
                    runMatchmaker();
                  }}
                  className="text-maroon hover:underline font-bold"
                >
                  అన్నీ రీసెట్
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-xs">
                {/* Caste Select */}
                <select
                  value={mmFilters.caste}
                  onChange={(e) => {
                    setMmFilters({ ...mmFilters, caste: e.target.value });
                  }}
                  className="px-2.5 py-2 rounded-xl border border-slate-200 bg-slate-50 font-medium"
                >
                  <option value="">💍 అన్ని కులాలు (All Castes)</option>
                  {CASTES.map((c) => (
                    <option key={c} value={c}>{CASTE_TELUGU[c] || c} ({c})</option>
                  ))}
                </select>

                {/* District Select */}
                <select
                  value={mmFilters.district}
                  onChange={(e) => setMmFilters({ ...mmFilters, district: e.target.value })}
                  className="px-2.5 py-2 rounded-xl border border-slate-200 bg-slate-50 font-medium"
                >
                  <option value="">🏡 అన్ని జిల్లాలు (All Districts)</option>
                  {ALL_DISTRICTS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>

                <input
                  value={mmFilters.education}
                  onChange={(e) => setMmFilters({ ...mmFilters, education: e.target.value })}
                  aria-label="Filter by education"
                  placeholder="🎓 Education filter"
                  className="min-w-0 px-2.5 py-2 rounded-xl border border-slate-200 bg-slate-50 font-medium"
                />

                <input
                  value={mmFilters.job}
                  onChange={(e) => setMmFilters({ ...mmFilters, job: e.target.value })}
                  aria-label="Filter by occupation"
                  placeholder="💼 Occupation filter"
                  className="min-w-0 px-2.5 py-2 rounded-xl border border-slate-200 bg-slate-50 font-medium"
                />

                {/* Filter Apply Action */}
                <button
                  onClick={() => runMatchmaker()}
                  className="px-3 py-2 rounded-xl maroon-gradient text-white font-extrabold text-xs shadow-xs"
                >
                  ⚡ ఫిల్టర్ వర్తింపు
                </button>
              </div>
            </div>

            {/* Results Grid Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-navy">
                  🎯 సరిపోయే సంబంధాల జాబితా ({matchedResults.length})
                </span>
                {matchedResults.length > 0 && (
                  <button
                    onClick={selectAllMatches}
                    className="text-xs font-bold text-maroon hover:underline ml-2"
                  >
                    {selectedProfiles.length === matchedResults.length ? "అన్నీ తీసివేయి (Deselect All)" : "అన్నీ ఎంచుకో (Select All)"}
                  </button>
                )}
              </div>

              <span className="text-xs text-slate-500 font-medium">
                సభ్యుడు పంచుకున్న వివరాలు మాత్రమే చూపబడతాయి; స్వతంత్రంగా ధృవీకరించండి
              </span>
            </div>

            {/* Suitable Matches Cards Grid */}
            {mmLoading ? (
              <div className="grid md:grid-cols-2 gap-4">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-3xl p-5 border border-gold/20 animate-pulse h-48" />
                ))}
              </div>
            ) : matchedResults.length === 0 ? (
              <div className="bg-white rounded-3xl p-10 text-center border border-gold/30 shadow-sm space-y-2">
                <div className="text-4xl">🔍</div>
                <h4 className="font-extrabold text-base text-navy">
                  సరిపోయే సంబంధాలు ఏవీ దొరకలేదు
                </h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  దయచేసి పైన వేరే Profile ID ఇవ్వండి లేదా ఫిల్టర్లను సడలించి మళ్లీ ప్రయత్నించండి.
                </p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {matchedResults.map((row) => {
                  const isSelected = isProfileSelected(row.tsap_id);
                  const isPaid = row.is_premium || (row.plan && row.plan !== "FREE");
                  
                  const profileUrl = `${SITE_CONFIG.siteUrl.replace(/\/$/, "")}/search/${encodeURIComponent(String(row.tsap_id || ""))}`;
                  const shareDetails = [
                    row.age ? `🎂 వయస్సు: ${row.age}` : "",
                    row.height ? `📏 ఎత్తు: ${row.height}` : "",
                    row.caste ? `💍 కమ్యూనిటీ: ${row.caste}${row.sub_caste ? ` (${row.sub_caste})` : ""}` : "",
                    row.star || row.rasi ? `⭐ నక్షత్రం / రాశి: ${row.star || "—"} / ${row.rasi || "—"}` : "",
                    row.education ? `🎓 విద్య: ${row.education}` : "",
                    row.job ? `💼 వృత్తి: ${row.job}` : "",
                    row.salary ? `💰 ఆదాయం: ${row.salary}` : "",
                    row.district || row.state ? `🏡 స్థానం: ${[row.district, row.state].filter(Boolean).join(", ")}` : "",
                    `🔍 ప్రొఫైల్: ${profileUrl}`,
                  ].filter(Boolean);
                  const waShareText = candidate?.phone
                    ? [`నమస్కారం ${candidate.full_name || ""} గారు,`, `మీ ప్రొఫైల్ (${candidate.tsap_id}) కోసం ఒక సంబంధ వివరాన్ని పంపిస్తున్నాం.`, "", row.full_name || row.tsap_id, ...shareDetails, "", "ప్రొఫైల్ వివరాలు సభ్యులు అందించినవి; కుటుంబంతో చర్చించి స్వతంత్రంగా నిర్ధారించండి."].join("\n")
                    : "";

                  return (
                    <div
                      key={row.tsap_id}
                      className={`bg-white rounded-3xl p-4 sm:p-5 border-2 transition-all flex flex-col justify-between shadow-sm hover:shadow-md ${
                        isSelected ? "border-maroon ring-2 ring-maroon/20 bg-rose-50/20" : "border-gold/25 hover:border-gold/60"
                      }`}
                    >
                      <div className="space-y-3">
                        
                        {/* Top: Checkbox + Avatar + Basic Details */}
                        <div className="flex items-start gap-3.5">
                          
                          {/* Selection Checkbox */}
                          <div className="pt-1 shrink-0">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectProfile(row)}
                              className="w-5 h-5 rounded accent-[#7A0C2E] cursor-pointer"
                            />
                          </div>

                          {/* Avatar with click to enlarge */}
                          <div className="relative shrink-0 group">
                            {row.photo_url ? (
                              <div
                                onClick={() => setPreviewPhotoModal({ open: true, url: row.photo_url, name: row.full_name, tsapId: row.tsap_id })}
                                className="cursor-pointer relative overflow-hidden rounded-2xl"
                              >
                                <img
                                  src={row.photo_url}
                                  alt={row.full_name}
                                  className="w-20 h-24 rounded-2xl object-cover border-2 border-gold/40 shadow-sm group-hover:scale-105 transition duration-300"
                                />
                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition">
                                  🔍 పెద్దది
                                </div>
                              </div>
                            ) : (
                              <div className="w-20 h-24 rounded-2xl bg-amber-50 border-2 border-gold/30 flex flex-col items-center justify-center text-3xl text-maroon shadow-xs">
                                <span>{row.gender === "Bride" ? "👰" : "🤵"}</span>
                              </div>
                            )}
                              {row.is_verified && (
                              <span className="absolute -bottom-1 -right-1 bg-emerald-600 text-white rounded-full p-0.5 text-[9px] shadow" title="Verification evidence recorded; this is not an identity guarantee">
                                ✓
                              </span>
                            )}
                          </div>

                          {/* Profile Details */}
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-extrabold text-sm sm:text-base text-navy truncate">
                                {row.full_name}
                              </span>
                            </div>

                            <div className="text-xs font-bold text-maroon flex flex-wrap items-center gap-1.5">
                              <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">🆔 {row.tsap_id}</span>
                              {row.age && <span>🎂 {row.age} yrs</span>}
                              {row.caste && <span>💍 {row.caste} {row.sub_caste ? `(${row.sub_caste})` : ""}</span>}
                            </div>

                            {/* Astrological & Community details */}
                            <div className="text-xs text-slate-700 flex flex-wrap gap-x-2 gap-y-0.5 font-medium">
                              {row.gothram && <span>🪔 {row.gothram}</span>}
                              {row.star && <span>⭐ {row.star}</span>}
                              {row.rasi && <span>🌙 {row.rasi}</span>}
                            </div>

                            {(row.education || row.job) && (
                              <div className="text-xs text-slate-600 font-medium truncate">
                                {row.education && <>🎓 {row.education}</>}{row.education && row.job ? " • " : ""}{row.job && <>💼 {row.job}</>}
                              </div>
                            )}

                            {(row.district || row.state || row.salary) && (
                              <div className="text-xs text-slate-500 font-medium truncate">
                                {(row.district || row.state) && <>🏡 {[row.district, row.state].filter(Boolean).join(", ")}</>}{row.salary && <> • 💰 {row.salary}</>}
                              </div>
                            )}
                          </div>
                        </div>

                        {Array.isArray(row.observations) && row.observations.length > 0 && (
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-2.5 text-xs">
                            <div className="mb-1 flex items-center gap-1.5 font-extrabold text-slate-700">
                              <span aria-hidden="true">ℹ️</span>
                              <span>వివరాలు రెండు profiles లో నమోదు అయ్యాయి (ఇది match verdict కాదు)</span>
                            </div>
                            <ul className="list-disc space-y-0.5 pl-5 text-[11px] leading-relaxed font-medium text-slate-700">
                              {row.observations.slice(0, 4).map((item: string, itemIndex: number) => <li key={itemIndex}>{item}</li>)}
                            </ul>
                          </div>
                        )}

                        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-2.5 text-[11px] text-slate-700">
                          Profiles are shown after the selected filters. Details are member-provided; please verify them directly.
                        </div>

                        {/* Unmasked Contact Number Box & Quick Actions */}
                        <div className="bg-slate-50 rounded-2xl p-2.5 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-base">📞</span>
                            <div>
                              <span className="text-[9px] text-slate-400 block font-bold uppercase">డైరెక్ట్ ఫోన్ నంబర్</span>
                              <span className="text-xs sm:text-sm font-black text-slate-800 font-mono tracking-wide">
                                {row.phone || "నంబర్ లేదు"}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 flex-wrap justify-end">
                            {row.phone && (
                              <>
                                <a
                                  href={`tel:${row.phone}`}
                                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 text-white font-bold text-[11px] hover:bg-slate-900 shadow-xs flex items-center gap-1"
                                  title="Call Match"
                                >
                                  <span>📞</span>
                                  <span>Call</span>
                                </a>
                                <a
                                  href={whatsappPhoneLink(row.phone) || undefined}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2.5 py-1.5 rounded-xl bg-[#25D366] text-white font-bold text-[11px] hover:brightness-105 shadow-xs flex items-center gap-1"
                                  title="WhatsApp Chat with Match"
                                >
                                  <span>💬</span>
                                  <span>Chat</span>
                                </a>
                              </>
                            )}

                            {/* Share this match to candidate directly */}
                            {candidate?.phone && (
                              <a
                                href={whatsappPhoneLink(candidate.phone, waShareText) || undefined}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 text-white font-black text-[11px] hover:brightness-110 shadow-xs flex items-center gap-1"
                                title="ఈ సంబంధం వివరాలు అభ్యర్థికి WhatsApp లో పంపండి"
                              >
                                <span>💌</span>
                                <span>అభ్యర్థికి పంపు</span>
                              </a>
                            )}

                            <button
                              onClick={() => toggleSelectProfile(row)}
                              className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition shadow-xs ${
                                isSelected
                                  ? "bg-maroon text-white"
                                  : "bg-white border border-gold text-maroon hover:bg-gold-soft"
                              }`}
                            >
                              {isSelected ? "✓ నోట్‌ప్యాడ్‌లో ఉంది" : "➕ నోట్‌ప్యాడ్"}
                            </button>
                          </div>
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        )}

        {/* =========================================================================
            TAB 2: 📇 FULL DIRECTORY & CONTACTS (UNMASKED SEARCH & BULK ACTIONS)
            ========================================================================= */}
        {tab === "directory" && owner && (
          <div className="space-y-6">
            {/* Top Metric Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <button
                type="button"
                onClick={() => { setDirDateRange("all"); setDirPayment("all"); setDirVerified("all"); setDirPhoto("all"); }}
                className={`p-4 rounded-2xl border text-left transition ${
                  dirDateRange === "all" && dirPayment === "all" ? "bg-maroon text-white border-maroon shadow-md" : "bg-white border-slate-200 hover:border-gold"
                }`}
              >
                <div className="text-xs font-bold opacity-80">మొత్తం ప్రొఫైళ్లు</div>
                <div className="text-2xl font-black mt-1">{dirSummary?.total_all ?? dirTotal}</div>
                <div className="text-[10px] opacity-75 mt-0.5">రిజిస్టర్ అయినవి</div>
              </button>

              <button
                type="button"
                onClick={() => { setDirDateRange("today"); setDirPayment("all"); }}
                className={`p-4 rounded-2xl border text-left transition ${
                  dirDateRange === "today" ? "bg-amber-500 text-white border-amber-600 shadow-md ring-2 ring-amber-300" : "bg-amber-50/70 border-amber-200 hover:bg-amber-100/70"
                }`}
              >
                <div className="text-xs font-bold text-amber-950 flex items-center gap-1">
                  <span>🌟</span> <span>ఈరోజు రిజిస్ట్రేషన్లు</span>
                </div>
                <div className="text-2xl font-black text-amber-950 mt-1">{dirSummary?.today_count ?? 0}</div>
                <div className="text-[10px] text-amber-900 font-bold mt-0.5">Today Registered</div>
              </button>

              <button
                type="button"
                onClick={() => { setDirDateRange("yesterday"); setDirPayment("all"); }}
                className={`p-4 rounded-2xl border text-left transition ${
                  dirDateRange === "yesterday" ? "bg-slate-700 text-white border-slate-800 shadow-md" : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <div className="text-xs font-bold text-slate-700">📅 నిన్నటివి (Yesterday)</div>
                <div className="text-2xl font-black text-navy mt-1">{dirSummary?.yesterday_count ?? 0}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">నిన్నటి ప్రొఫైళ్లు</div>
              </button>

              <button
                type="button"
                onClick={() => { setDirPayment("unpaid"); setDirDateRange("all"); }}
                className={`p-4 rounded-2xl border text-left transition ${
                  dirPayment === "unpaid" ? "bg-rose-600 text-white border-rose-700 shadow-md ring-2 ring-rose-300" : "bg-rose-50/70 border-rose-200 hover:bg-rose-100/70"
                }`}
              >
                <div className="text-xs font-bold text-rose-950 flex items-center gap-1">
                  <span>🟡</span> <span>ఇంకా చెల్లించని వారు</span>
                </div>
                <div className="text-2xl font-black text-rose-950 mt-1">{dirSummary?.unpaid_count ?? 0}</div>
                <div className="text-[10px] text-rose-800 font-bold mt-0.5">Free / Call Follow-up</div>
              </button>

              <button
                type="button"
                onClick={() => { setDirPayment("paid"); setDirDateRange("all"); }}
                className={`p-4 rounded-2xl border text-left transition ${
                  dirPayment === "paid" ? "bg-emerald-700 text-white border-emerald-800 shadow-md" : "bg-emerald-50/70 border-emerald-200 hover:bg-emerald-100/70"
                }`}
              >
                <div className="text-xs font-bold text-emerald-950 flex items-center gap-1">
                  <span>🟢</span> <span>Paid plan members</span>
                </div>
                <div className="text-2xl font-black text-emerald-950 mt-1">{dirSummary?.paid_count ?? 0}</div>
                <div className="text-[10px] text-emerald-800 font-bold mt-0.5">Identity / photo review is separate</div>
              </button>

              <button
                type="button"
                onClick={() => { setDirPhoto("with_photo"); }}
                className={`p-4 rounded-2xl border text-left transition ${
                  dirPhoto === "with_photo" ? "bg-indigo-700 text-white border-indigo-800 shadow-md" : "bg-indigo-50/70 border-indigo-200 hover:bg-indigo-100/70"
                }`}
              >
                <div className="text-xs font-bold text-indigo-950">📸 ఫోటో ఉన్నవి</div>
                <div className="text-2xl font-black text-indigo-950 mt-1">{dirSummary?.photo_count ?? 0}</div>
                <div className="text-[10px] text-indigo-800 font-bold mt-0.5">With Photo</div>
              </button>
            </div>

            {/* Filter Card */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gold/30 shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-[#7A0C2E] flex items-center gap-2">
                    <span>📇</span>
                    <span>డైరెక్టరీ & సంప్రదింపు నంబర్లు (All Registered Profiles)</span>
                  </h2>
                  <p className="text-xs text-slate-600 mt-1">
                    నమోదైన మొత్తం {dirTotal} ప్రొఫైళ్లు • తేదీ, పేమెంట్ మరియు వెరిఫికేషన్ వారీగా శోధించండి.
                  </p>
                </div>

                {/* Keyword Search & CSV Export */}
                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    type="text"
                    value={dirSearch}
                    onChange={(e) => setDirSearch(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") loadDirectory(); }}
                    placeholder="పేరు, ఫోన్ నంబర్, ID, కులం..."
                    className="px-4 py-2 rounded-2xl border border-slate-300 text-xs font-bold focus:border-maroon focus:outline-none w-52 sm:w-64"
                  />
                  <button
                    onClick={() => loadDirectory()}
                    className="px-4 py-2 rounded-2xl maroon-gradient text-white font-extrabold text-xs shadow-md"
                  >
                    🔍 శోధించు
                  </button>
                  <button
                    onClick={() => {
                      setPrintSheetModal({
                        open: true,
                        title: `మన వివాహ (Mana Vivaha) — రిజిస్టర్డ్ ప్రొఫైల్స్ డైరెక్టరీ షీట్ (${directoryProfiles.length} మంది)`,
                        profiles: directoryProfiles,
                      });
                    }}
                    className="px-3.5 py-2 rounded-2xl bg-slate-700 hover:bg-slate-800 text-white font-extrabold text-xs shadow-sm flex items-center gap-1.5 transition active:scale-95"
                    title="Print directory profiles sheet"
                  >
                    <span>🖨️</span>
                    <span>ప్రింట్ షీట్</span>
                  </button>
                  <button
                    onClick={exportProfilesCsv}
                    className="px-3.5 py-2 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs shadow-sm flex items-center gap-1.5 transition active:scale-95"
                    title="Export all directory profiles to CSV"
                  >
                    <span>📥</span>
                    <span>CSV ఎగుమతి</span>
                  </button>
                </div>
              </div>

              {/* Date Filter Quick Pills */}
              <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-500 mr-1">📅 నమోదు తేదీ:</span>
                {[
                  { id: "all", label: "అన్ని తేదీలు (All)" },
                  { id: "today", label: "🌟 ఈరోజు (Today)" },
                  { id: "yesterday", label: "📅 నిన్న (Yesterday)" },
                  { id: "7days", label: "🗓️ గత 7 రోజులు" },
                  { id: "month", label: "📆 ఈ నెల (This Month)" },
                  { id: "custom", label: "🔍 కస్టమ్ తేదీ (Custom)" },
                ].map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setDirDateRange(d.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      dirDateRange === d.id
                        ? "bg-[#7A0C2E] text-white shadow-xs"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}

                {dirDateRange === "custom" && (
                  <div className="flex items-center gap-2 ml-2 flex-wrap">
                    <input
                      type="date"
                      value={dirDateFrom}
                      onChange={(e) => setDirDateFrom(e.target.value)}
                      className="px-2.5 py-1 text-xs border border-slate-300 rounded-lg"
                    />
                    <span className="text-xs text-slate-400">నుండి</span>
                    <input
                      type="date"
                      value={dirDateTo}
                      onChange={(e) => setDirDateTo(e.target.value)}
                      className="px-2.5 py-1 text-xs border border-slate-300 rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => loadDirectory()}
                      className="px-2.5 py-1 bg-maroon text-white text-xs font-bold rounded-lg"
                    >
                      ఫిల్టర్ చేయి
                    </button>
                  </div>
                )}
              </div>

              {/* Profession & Category Quick Pills */}
              <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-500 mr-1">💼 ఉద్యోగం / వర్గం:</span>
                {[
                  { id: "all", label: "అన్ని రంగాలు (All)" },
                  { id: "housewife", label: "🏡 గృహిణి (Housewife / Homemaker)" },
                  { id: "it_software", label: "💻 సాఫ్ట్‌వేర్ / IT" },
                  { id: "govt", label: "🏛️ ప్రభుత్వ ఉద్యోగం (Govt Job)" },
                  { id: "business", label: "🏢 బిజినెస్ / వ్యాపారం" },
                ].map((prof) => (
                  <button
                    key={prof.id}
                    type="button"
                    onClick={() => setDirProfession(prof.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      dirProfession === prof.id
                        ? "bg-amber-600 text-white shadow-xs ring-1 ring-amber-400"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {prof.label}
                  </button>
                ))}
              </div>

              {/* Granular Filters Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 text-xs pt-2 border-t border-slate-100">
                {/* Payment Status Filter */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-0.5">💰 పేమెంట్ హోదా:</label>
                  <select
                    value={dirPayment}
                    onChange={(e) => setDirPayment(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 font-medium"
                  >
                    <option value="all">అందరూ (All)</option>
                    <option value="unpaid">🟡 ఇంకా చెల్లించని వారు (Unpaid/Free)</option>
                    <option value="paid">🟢 ప్రీమియం చెల్లించిన వారు (Paid)</option>
                  </select>
                </div>

                {/* Verification Filter */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-0.5">✅ వెరిఫికేషన్:</label>
                  <select
                    value={dirVerified}
                    onChange={(e) => setDirVerified(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 font-medium"
                  >
                    <option value="all">అందరూ (All)</option>
                    <option value="verified">✓ Verified Members</option>
                    <option value="unverified">Unverified Members</option>
                  </select>
                </div>

                {/* Marital Status Filter */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-0.5">💍 వివాహ రకం:</label>
                  <select
                    value={dirMarital}
                    onChange={(e) => setDirMarital(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 font-medium"
                  >
                    <option value="all">అందరూ (All)</option>
                    <option value="first_marriage">మొదటి వివాహం (First Marriage)</option>
                    <option value="second_marriage">పునర్వివాహం (Second Marriage)</option>
                  </select>
                </div>

                {/* Photo Filter */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-0.5">📸 ఫోటో:</label>
                  <select
                    value={dirPhoto}
                    onChange={(e) => setDirPhoto(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 font-medium"
                  >
                    <option value="all">అందరూ (All)</option>
                    <option value="with_photo">📸 ఫోటో ఉన్నవి</option>
                    <option value="no_photo">ఫోటో లేనివి</option>
                  </select>
                </div>

                {/* Gender Filter */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-0.5">👰/🤵 లింగం:</label>
                  <select
                    value={dirGender}
                    onChange={(e) => setDirGender(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 font-medium"
                  >
                    <option value="">అందరూ (All)</option>
                    <option value="Bride">👰 వధువులు (Brides)</option>
                    <option value="Groom">🤵 వరులు (Grooms)</option>
                  </select>
                </div>

                {/* District Filter */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-0.5">🏡 జిల్లా:</label>
                  <select
                    value={dirDistrict}
                    onChange={(e) => setDirDistrict(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 font-medium"
                  >
                    <option value="">అన్ని జిల్లాలు (All)</option>
                    {(newProf.state === "TS" ? TS_DISTRICTS : newProf.state === "AP" ? AP_DISTRICTS : []).map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Profiles Table */}
            <div className="bg-white rounded-3xl border border-gold/30 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold uppercase tracking-wider">
                    <tr>
                      <th className="p-3.5 text-center">ఎంపిక</th>
                      <th className="p-3.5">ID / పేరు</th>
                      <th className="p-3.5">నమోదు తేదీ</th>
                      <th className="p-3.5">ప్లాన్ & హోదా</th>
                      <th className="p-3.5">లింగం / వయస్సు</th>
                      <th className="p-3.5">కులం & గోత్రం</th>
                      <th className="p-3.5">ఉద్యోగం / చదువు</th>
                      <th className="p-3.5">జిల్లా / ఊరు</th>
                      <th className="p-3.5">📞 ఫోన్ నంబర్</th>
                      <th className="p-3.5 text-right">చర్యలు & ప్లాన్</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dirLoading ? (
                      <tr>
                        <td colSpan={10} className="p-8 text-center text-slate-400 font-bold">
                          లోడ్ అవుతోంది…
                        </td>
                      </tr>
                    ) : directoryProfiles.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="p-8 text-center text-slate-400 font-bold">
                          ఎంచుకున్న ఫిల్టర్లతో ప్రొఫైళ్లు ఏవీ లభించలేదు
                        </td>
                      </tr>
                    ) : (
                      directoryProfiles.map((p) => {
                        const isSelected = isProfileSelected(p.tsap_id);
                        const isPaid = p.is_premium || (p.plan && p.plan !== "FREE");
                        const regDateStr = p.created_at ? String(p.created_at).slice(0, 10) : "—";
                        const isToday = regDateStr === new Date().toISOString().slice(0, 10);
                        
                        return (
                          <tr key={p.tsap_id} className={`hover:bg-amber-50/40 transition ${isSelected ? "bg-rose-50/40" : ""}`}>
                            <td className="p-3.5 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelectProfile(p)}
                                className="w-4 h-4 rounded accent-[#7A0C2E] cursor-pointer"
                              />
                            </td>
                            <td className="p-3.5 font-bold">
                              <div className="text-navy flex items-center gap-1.5">
                                <span>{p.full_name}</span>
                                {p.marital_status && p.marital_status !== "Pelli Kaledu" && (
                                  <span className="px-1.5 py-0.2 bg-purple-100 text-purple-800 text-[9px] font-black rounded">
                                    పునర్వివాహం
                                  </span>
                                )}
                              </div>
                              <div className="font-mono text-[10px] text-maroon flex items-center gap-1">
                                <span>{p.tsap_id}</span>
                                {p.photo_url ? (
                                  <span className="text-[10px]" title="Photo Uploaded">📸</span>
                                ) : (
                                  <span className="text-[9px] text-slate-400 font-sans">నో ఫోటో</span>
                                )}
                              </div>
                            </td>
                            <td className="p-3.5 font-medium whitespace-nowrap">
                              <div className={`font-mono text-[11px] ${isToday ? "text-amber-800 font-black" : "text-slate-600"}`}>
                                {isToday ? `🌟 ఈరోజు` : regDateStr}
                              </div>
                            </td>
                            <td className="p-3.5 font-medium">
                              <div className="space-y-1">
                                {isPaid ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                                    <span>👑 {p.plan_name || p.plan}</span>
                                    <span>✓ PLAN ACTIVE</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-amber-100 text-amber-900 border border-amber-300">
                                    <span>🟡 ఉచిత సభ్యులు (Unpaid)</span>
                                  </span>
                                )}
                                <div className="text-[10px] text-slate-500 font-mono">
                                  🪙 {p.credits || 0} క్రెడిట్స్
                                </div>
                              </div>
                            </td>
                            <td className="p-3.5 font-medium">
                              <div>{p.gender === "Bride" ? "👰 వధువు" : "🤵 వరుడు"}</div>
                              <div className="text-slate-500">{p.age} సం.</div>
                            </td>
                            <td className="p-3.5 font-medium">
                              <div>{p.caste} {p.sub_caste ? `(${p.sub_caste})` : ""}</div>
                              <div className="text-slate-500">{p.gothram || "—"}</div>
                            </td>
                            <td className="p-3.5 font-medium">
                              <div className="font-semibold text-slate-800">{p.job || "—"}</div>
                              <div className="text-slate-500">{p.education || "—"}</div>
                            </td>
                            <td className="p-3.5 font-medium">
                              <div>{p.district}</div>
                              <div className="text-slate-500">{p.state}</div>
                            </td>
                            <td className="p-3.5 font-bold font-mono text-emerald-800 whitespace-nowrap">
                              {p.phone || "—"}
                            </td>
                            <td className="p-3.5 text-right space-x-1 whitespace-nowrap">
                              {/* Direct Call Link */}
                              {p.phone && (
                                <a
                                  href={`tel:${p.phone}`}
                                  className="inline-block p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                                  title="Call Member"
                                >
                                  📞
                                </a>
                              )}

                              {/* WhatsApp Follow-up */}
                              {p.phone && (
                                <a
                                  href={whatsappPhoneLink(p.phone, isPaid
                                    ? `నమస్కారం ${p.full_name} గారు! మన వివాహ నుంచి సంప్రదిస్తున్నాం. మీ profile (${p.tsap_id}) గురించి సహాయం కావాలంటే వివరాలు చెప్పండి.`
                                    : `నమస్కారం ${p.full_name} గారు! మన వివాహలో మీ profile (${p.tsap_id}) నమోదు అయింది. ప్రస్తుత సేవలు, ధరల వివరాలకు https://manavivaha.in/pricing చూడండి. Profile approval లేదా verification హామీ కాదు; చెల్లింపులు website లోని అధికారిక విధానం ద్వారానే చేయండి.`) || undefined}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-block p-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white transition font-bold"
                                  title={isPaid ? "WhatsApp Chat" : "WhatsApp Follow-up (కాల్/మెసేజ్ పంపండి)"}
                                >
                                  💬
                                </a>
                              )}

                              {/* Matchmaker */}
                              <button
                                onClick={() => {
                                  setLookupQuery(p.tsap_id);
                                  runMatchmaker(p.tsap_id);
                                  setTab("matchmaker");
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-amber-100 text-maroon font-bold text-[11px] hover:bg-amber-200 transition"
                                title="మ్యాచ్‌లు చూడు"
                              >
                                ⚡ మ్యాచ్‌లు
                              </button>

                              {/* WhatsApp Proposal Generator */}
                              <button
                                onClick={() => {
                                  setProposalBatchModal({
                                    open: true,
                                    candidate: p,
                                    targetMatches: [],
                                    recipientName: p.full_name,
                                    recipientPhone: p.phone || "",
                                    templateType: "parents",
                                    customNote: "",
                                  });
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-300 font-bold text-[11px] hover:bg-emerald-100 transition shadow-xs"
                                title="WhatsApp ప్రపోజల్ బిల్డర్"
                              >
                                💌 ప్రపోజల్
                              </button>

                              {/* Counselor CRM Call Notes */}
                              <button
                                onClick={() => openCounselorModal(p)}
                                className="px-2.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-900 border border-indigo-200 font-bold text-[11px] hover:bg-indigo-100 transition shadow-xs"
                                title="కౌన్సిలర్ కాల్ నోట్స్ & CRM హిస్టరీ"
                              >
                                📝 CRM
                              </button>

                              {/* Manual plan-credit activation; approval and verification remain separate. */}
                              <button
                                onClick={() => {
                                  resetGrantForm();
                                  setUpgradeModal({
                                    open: true,
                                    tsapId: p.tsap_id,
                                    name: p.full_name,
                                    phone: p.phone,
                                    district: p.district,
                                    caste: p.caste,
                                    currentPlan: p.plan,
                                  });
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-rose-600 text-white font-bold text-[11px] hover:brightness-110 active:scale-95 transition shadow-xs"
                                title="Activate a current interest-request plan"
                              >
                                👑 ప్లాన్ ఇవ్వండి
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            OTHER EXISTING TABS (OVERVIEW, QUEUE, CASTES, ADD PROFILE, ADS, VENDORS, ETC.)
            ========================================================================= */}
        {tab === "overview" && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: L.profilesTot, val: t.profiles, icon: "👥" },
                { label: L.pendingTot, val: t.pending, icon: "⏳", alert: t.pending > 0 },
                { label: L.approvedTot, val: t.approved, icon: "✅" },
                { label: L.verifiedTot, val: t.verified, icon: "🛡️" },
                { label: L.withPhotoTot, val: t.with_photo, icon: "📸" },
                { label: L.reportsTot, val: t.open_reports, icon: "🚩", alert: t.open_reports > 0 },
              ].map((k) => (
                <div key={k.label} className="bg-white rounded-2xl p-4 border border-gold/25 shadow-xs">
                  <div className="flex items-center justify-between text-slate-400 text-sm">
                    <span>{k.icon}</span>
                    {k.alert && <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />}
                  </div>
                  <div className="text-2xl font-black text-navy mt-2">{k.val}</div>
                  <div className="text-[11px] font-bold text-slate-600 mt-0.5">{k.label}</div>
                </div>
              ))}
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="bg-white rounded-3xl p-5 border border-gold/30 shadow-xs space-y-3">
                <h3 className="font-extrabold text-sm text-navy">{L.topCastes}</h3>
                <BarList items={an.top_castes} />
              </div>
              <div className="bg-white rounded-3xl p-5 border border-gold/30 shadow-xs space-y-3">
                <h3 className="font-extrabold text-sm text-navy">{L.topDistricts}</h3>
                <BarList items={an.top_districts} />
              </div>
              <div className="bg-white rounded-3xl p-5 border border-gold/30 shadow-xs space-y-3">
                <h3 className="font-extrabold text-sm text-navy">{L.topStates}</h3>
                <Donut items={an.top_states} />
              </div>
            </div>
          </div>
        )}

        {/* Profile Approval Queue Tab */}
        {tab === "queue" && (
          <div className="space-y-4">
            <div className="flex gap-2">
              {(owner ? (["pending", "approved", "rejected", "all"] as const) : (["pending"] as const)).map((s) => (
                <button
                  key={s}
                  onClick={() => setQStatus(s)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold capitalize transition ${
                    qStatus === s ? "maroon-gradient text-white shadow-xs" : "bg-white border border-slate-200 text-slate-700"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="grid md:grid-cols-2 gap-3">
              {queue.length === 0 ? (
                <div className="col-span-2 bg-white rounded-3xl p-8 text-center text-slate-500 font-bold">
                  {L.emptyQueue}
                </div>
              ) : (
                queue.map((q) => (
                  <div key={q.tsap_id} className="bg-white rounded-2xl p-4 border border-gold/30 shadow-xs flex items-center justify-between gap-3">
                    <div>
                      <div className="font-extrabold text-sm text-navy">{q.full_name}</div>
                      <div className="text-xs text-slate-500 font-mono">{q.tsap_id} • {q.gender} • {q.district}</div>
                    </div>
                    <div className="flex gap-1.5">
                      {q.status === "pending" ? (
                        <>
                          <button
                            type="button"
                            onClick={() => profileAction(q.tsap_id, "approve")}
                            disabled={busyId === q.tsap_id}
                            aria-label={`${L.approve} ${q.full_name}`}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-xs disabled:opacity-50"
                          >
                            ✓ {L.approve}
                          </button>
                          <button
                            type="button"
                            onClick={() => profileAction(q.tsap_id, "reject")}
                            disabled={busyId === q.tsap_id}
                            aria-label={`${L.reject} ${q.full_name}`}
                            className="px-3 py-1.5 rounded-xl bg-rose-600 text-white font-bold text-xs shadow-xs disabled:opacity-50"
                          >
                            ✕ {L.reject}
                          </button>
                        </>
                      ) : <span className="text-xs font-bold capitalize text-slate-500">{q.status}</span>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Caste Hubs & Demand Matrix Tab */}
        {tab === "castes" && owner && (
          <div className="space-y-6">
            {/* Enterprise Demand & Supply Matrix */}
            <div className="bg-white rounded-3xl p-5 border border-gold/30 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-black text-maroon text-base flex items-center gap-2">
                    <span>📊</span>
                    <span>కమ్యూనిటీ డిమాండ్ & సప్లై విశ్లేషణ (Caste Demand & Supply Balance Matrix)</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    ప్రతి కులంలో వధూవరుల నిష్పత్తి (Ratio), డిమాండ్ హెల్త్ మరియు వెరిఫైడ్ మెంబర్స్ స్థితి.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={loadDemandMatrix}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
                >
                  🔄 రీఫ్రెష్
                </button>
              </div>

              {demandMatrixData.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-slate-700 font-extrabold uppercase border-b border-slate-200">
                      <tr>
                        <th className="p-3">కులం (Community)</th>
                        <th className="p-3 text-center">మొత్తం ప్రొఫైళ్లు</th>
                        <th className="p-3 text-center">👰 వధువులు</th>
                        <th className="p-3 text-center">🤵 వరులు</th>
                        <th className="p-3 text-center">వధువు/వరుడు నిష్పత్తి</th>
                        <th className="p-3 text-center">డిమాండ్ స్థితి (Status)</th>
                        <th className="p-3 text-center">వెరిఫైడ్</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {demandMatrixData.map((row) => (
                        <tr key={row.caste} className="hover:bg-amber-50/40 transition">
                          <td className="p-3 font-bold text-navy">{row.caste}</td>
                          <td className="p-3 text-center font-bold font-mono">{row.total}</td>
                          <td className="p-3 text-center text-rose-800 font-bold font-mono">{row.brides}</td>
                          <td className="p-3 text-center text-blue-800 font-bold font-mono">{row.grooms}</td>
                          <td className="p-3 text-center font-bold font-mono">{row.ratio} : 1</td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                              row.health === "balanced"
                                ? "bg-emerald-100 text-emerald-800"
                                : row.health === "high_groom_demand"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-purple-100 text-purple-800"
                            }`}>
                              {row.health_telugu}
                            </span>
                          </td>
                          <td className="p-3 text-center font-mono font-bold text-emerald-700">{row.verified}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Telegram Broadcast Channels */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {castesData.map((c) => (
                <div key={c.key} className="bg-white rounded-2xl p-4 border border-gold/30 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-sm text-maroon">{c.te}</span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                      {c.total} Profiles
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600">
                    👰 {c.females} Brides • 🤵 {c.males} Grooms
                  </div>
                  <div className="pt-1 flex gap-1">
                    <a
                      href={`https://t.me/${c.channel_bride || "manavivaha"}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-1 text-center text-[10px] font-bold bg-[#229ED9] text-white rounded-lg"
                    >
                      📢 Brides Channel
                    </a>
                    <a
                      href={`https://t.me/${c.channel_groom || "manavivaha"}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-1 text-center text-[10px] font-bold bg-[#229ED9] text-white rounded-lg"
                    >
                      📢 Grooms Channel
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Telegram & WhatsApp Channels Management */}
        {tab === "channels" && owner && (
          <div className="bg-white rounded-3xl p-6 border border-gold/30 shadow-xs space-y-4">
            <h3 className="font-black text-lg text-[#7A0C2E] flex items-center gap-2">
              <span>📡</span>
              <span>టెలిగ్రామ్ & వాట్సాప్ ఛానెల్స్ మేనేజ్‌మెంట్ (Telegram & WhatsApp Channels Hub)</span>
            </h3>
            <ChannelsConsole />
          </div>
        )}

        {/* WhatsApp & Phone Numbers Management */}
        {tab === "numbers" && owner && (
          <div className="bg-white rounded-3xl p-6 border border-gold/30 shadow-xs space-y-4">
            <h3 className="font-black text-lg text-[#7A0C2E] flex items-center gap-2">
              <span>📱</span>
              <span>అఫీషియల్ వాట్సాప్ & ఫోన్ నంబర్లు (WhatsApp Senders & Support Numbers)</span>
            </h3>
            <WANumbersConsole />
          </div>
        )}

        {/* Add Profile Form Tab */}
        {tab === "addProfile" && owner && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gold/30 max-w-2xl mx-auto shadow-sm">
            <h2 className="text-lg font-black text-[#7A0C2E] mb-2">➕ ప్రొఫైల్ చేర్చండి (Staff-entered profile)</h2>
            <p className="mb-4 text-xs leading-relaxed text-slate-600">సభ్యుని స్పష్టమైన సమ్మతి తీసుకున్న తర్వాత మాత్రమే వివరాలు నమోదు చేయండి. ప్రతి సమాచారం సభ్యుడు అందించినది; staff entry, phone OTP లేదా profile approval identity verification కాదు. Review పూర్తయ్యే వరకు profile ప్రచురించబడదు.</p>
            <form onSubmit={handleCreateProfile} className="space-y-4 text-xs font-bold">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1">పూర్తి పేరు (Full Name) *</label>
                  <input
                    required
                    value={newProf.full_name}
                    onChange={(e) => setNewProf({ ...newProf, full_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-medium text-sm"
                    placeholder="Enter member's name"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1">లింగం (Gender) *</label>
                  <select
                    required
                    value={newProf.gender}
                    onChange={(e) => setNewProf({ ...newProf, gender: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                  >
                    <option value="" disabled>Choose gender / లింగం ఎంచుకోండి</option>
                    <option value="Bride">👰 వధువు (Bride)</option>
                    <option value="Groom">🤵 వరుడు (Groom)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1">వయస్సు (Age - Optional)</label>
                  <input
                    type="number"
                    min={newProf.gender === "Groom" ? 21 : 18}
                    max={100}
                    value={newProf.age}
                    onChange={(e) => setNewProf({ ...newProf, age: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                    placeholder="Member-provided age"
                    inputMode="numeric"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1">మతం (Religion) *</label>
                  <select
                    required
                    value={newProf.religion}
                    onChange={(e) => setNewProf({ ...newProf, religion: e.target.value, caste: "", caste_custom: "", sub_caste: "", sub_caste_custom: "" })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                  >
                    <option value="">మతం ఎంచుకోండి (Select religion)</option>
                    {RELIGIONS.map((religion) => <option key={religion} value={religion}>{religion}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 mb-1">కులం / సంఘం (Caste / Community) *</label>
                  <select
                    required
                    disabled={!newProf.religion}
                    value={newProf.caste}
                    onChange={(e) => setNewProf({ ...newProf, caste: e.target.value, caste_custom: "", sub_caste: "", sub_caste_custom: "" })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm disabled:bg-slate-100"
                  >
                    <option value="">సంఘం ఎంచుకోండి (Select community)</option>
                    {adminCasteOpts.map((c) => <option key={c} value={c}>{CASTE_TELUGU[c] || c}</option>)}
                  </select>
                  <p className="mt-1 text-[10px] text-slate-500">{adminCasteLoading ? "జాబితా లోడ్ అవుతోంది…" : adminCasteOffline ? "ఆఫ్‌లైన్ జాబితా; అవసరమైతే Other / self-described వాడండి." : "ప్రతి మతానికి వేరు జాబితా; జాబితాలో లేనిది స్వయంగా నమోదు చేయండి."}</p>
                </div>
                {newProf.caste === "Other / self-described" && (
                  <div>
                    <label className="block text-slate-700 mb-1">సభ్యుడు తెలిపిన కులం / సంఘం *</label>
                    <input required maxLength={100} value={newProf.caste_custom} onChange={(e) => setNewProf({ ...newProf, caste_custom: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm" placeholder="Member-provided community name" />
                  </div>
                )}
                <div>
                  <label className="block text-slate-700 mb-1">ఉపకులం / ఉపసంఘం (Optional)</label>
                  {adminSubcasteOpts.length ? (
                    <select value={newProf.sub_caste} onChange={(e) => setNewProf({ ...newProf, sub_caste: e.target.value, sub_caste_custom: "" })} className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm">
                      <option value="">ఎంచుకోండి (Optional)</option>
                      {adminSubcasteOpts.map((sub) => <option key={sub} value={sub}>{sub}</option>)}
                    </select>
                  ) : (
                    <input maxLength={100} value={newProf.sub_caste} onChange={(e) => setNewProf({ ...newProf, sub_caste: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm" placeholder="Optional member-provided subgroup" />
                  )}
                  {newProf.sub_caste === "Other / self-described" && <input required maxLength={100} value={newProf.sub_caste_custom} onChange={(e) => setNewProf({ ...newProf, sub_caste_custom: e.target.value })} className="mt-2 w-full px-3 py-2 rounded-xl border border-slate-300 text-sm" placeholder="Member-provided subgroup name" />}
                </div>
                <div>
                  <label className="block text-slate-700 mb-1">రాష్ట్రం / ప్రాంతం (State / Region) *</label>
                  <select
                    required
                    value={newProf.state}
                    onChange={(e) => setNewProf({ ...newProf, state: e.target.value, district: "" })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                  >
                    <option value="">ప్రాంతం ఎంచుకోండి (Select region)</option>
                    <option value="TS">Telangana</option>
                    <option value="AP">Andhra Pradesh</option>
                    <option value="Other">Other Indian state / NRI</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 mb-1">జిల్లా / స్థానం (District / Location) *</label>
                  <select
                    required
                    disabled={!newProf.state}
                    value={newProf.district}
                    onChange={(e) => setNewProf({ ...newProf, district: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm disabled:bg-slate-100"
                  >
                    <option value="">స్థానం ఎంచుకోండి (Select location)</option>
                    {(newProf.state === "TS" ? TS_DISTRICTS : newProf.state === "AP" ? AP_DISTRICTS : newProf.state === "Other" ? OTHER_LOCATIONS.map((location) => location.en) : []).map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1">విద్య (Education)</label>
                  <input
                    value={newProf.education}
                    onChange={(e) => setNewProf({ ...newProf, education: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-medium"
                    placeholder="B.Tech, MBBS..."
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1">ఉద్యోగం (Job)</label>
                  <input
                    value={newProf.job}
                    onChange={(e) => setNewProf({ ...newProf, job: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-medium"
                    placeholder="Software Engineer..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 mb-1">📞 ఫోన్ నంబర్ (Phone Number) *</label>
                <input
                  required
                  value={newProf.phone}
                  onChange={(e) => setNewProf({ ...newProf, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono"
                  placeholder="10-digit member phone"
                />
              </div>

              <label className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-medium leading-relaxed text-slate-700">
                <input
                  type="checkbox"
                  required
                  checked={newProf.consent_confirmed}
                  onChange={(e) => setNewProf({ ...newProf, consent_confirmed: e.target.checked })}
                  className="mt-0.5"
                />
                <span>సభ్యుని స్పష్టమైన సమ్మతి తీసుకున్నాను; వివరాలు ఆయన/ఆమె అందించినవే. I confirm the member consented to this entry and supplied these details.</span>
              </label>
              <button
                type="submit"
                disabled={profSubmitting}
                className="w-full py-3 rounded-2xl maroon-gradient text-white font-black text-sm shadow-md hover-lift disabled:opacity-50"
              >
                {profSubmitting ? "సేవ్ చేస్తున్నారు…" : "🚀 ప్రొఫైల్ సృష్టించి మ్యాచ్‌లు శోధించండి"}
              </button>
            </form>
          </div>
        )}

        {/* Targeted Ads Tab */}
        {tab === "ads" && owner && (
          <div className="space-y-5">
            <section className="rounded-3xl border border-gold/30 bg-white p-4 shadow-sm sm:p-6">
              <div className="mb-5">
                <h2 className="text-lg font-black text-navy">Create a campaign request</h2>
                <p className="mt-1 text-sm leading-5 text-slate-600">
                  Use an existing active vendor ID. New requests stay pending; approval requires reviewing the payment receipt and entering its actual reference. No payment or vendor details are generated here.
                </p>
              </div>
              <form onSubmit={handleCreateAd} className="space-y-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <label className="text-sm font-semibold text-slate-700">
                    Registered vendor ID
                    <input required maxLength={40} value={adDraft.vendor_id} onChange={(e) => updateAdDraft({ vendor_id: e.target.value.trim() })} className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 px-3 font-mono text-sm" placeholder="Enter an existing vendor ID" />
                  </label>
                  <label className="text-sm font-semibold text-slate-700 sm:col-span-1 lg:col-span-2">
                    Campaign title
                    <input required maxLength={120} value={adDraft.title} onChange={(e) => updateAdDraft({ title: e.target.value })} className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm" placeholder="Campaign title" />
                  </label>
                  <label className="text-sm font-semibold text-slate-700">
                    Target scope
                    <select value={adDraft.level} onChange={(e) => updateAdDraft({ level: e.target.value as "district" | "state" | "all" })} className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm">
                      <option value="district">District</option><option value="state">State</option><option value="all">All regions</option>
                    </select>
                  </label>
                  <label className="text-sm font-semibold text-slate-700">
                    Duration (days)
                    <input required type="number" min={3} max={90} step={1} value={adDraft.days} onChange={(e) => updateAdDraft({ days: e.target.value })} className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm" />
                  </label>
                  {adDraft.level === "district" && (
                    <label className="text-sm font-semibold text-slate-700">
                      Districts (comma separated)
                      <input required value={adDraft.districts} onChange={(e) => updateAdDraft({ districts: e.target.value })} className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm" placeholder="Enter target districts" />
                    </label>
                  )}
                  {adDraft.level === "state" && (
                    <label className="text-sm font-semibold text-slate-700">
                      State
                      <select required value={adDraft.state} onChange={(e) => updateAdDraft({ state: e.target.value })} className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm">
                        <option value="">Choose a state</option><option value="TS">Telangana</option><option value="AP">Andhra Pradesh</option>
                      </select>
                    </label>
                  )}
                  <label className="text-sm font-semibold text-slate-700">
                    Offer (optional)
                    <input maxLength={160} value={adDraft.offer} onChange={(e) => updateAdDraft({ offer: e.target.value })} className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm" placeholder="Optional offer text" />
                  </label>
                  <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
                    Image URL (optional)
                    <input maxLength={500} type="url" value={adDraft.image_url} onChange={(e) => updateAdDraft({ image_url: e.target.value })} className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm" placeholder="https://…" />
                  </label>
                  <label className="text-sm font-semibold text-slate-700 sm:col-span-2 lg:col-span-3">
                    Destination URL (optional; HTTPS only)
                    <input maxLength={500} type="url" value={adDraft.link} onChange={(e) => updateAdDraft({ link: e.target.value })} className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm" placeholder="https://…" />
                  </label>
                </div>
                <fieldset>
                  <legend className="mb-2 text-sm font-semibold text-slate-700">Placements</legend>
                  <div className="flex flex-wrap gap-x-5 gap-y-2">
                    {[["matches_sidebar", "Matches"], ["search_top", "Search"], ["profile_banner", "Profile"], ["home_hero", "Homepage hero"]].map(([value, label]) => (
                      <label key={value} className="inline-flex min-h-9 items-center gap-2 text-sm text-slate-700">
                        <input type="checkbox" checked={adDraft.slots.includes(value)} onChange={(e) => updateAdDraft({ slots: e.target.checked ? [...adDraft.slots, value] : adDraft.slots.filter((slot) => slot !== value) })} className="h-4 w-4 accent-[#7A0C2E]" />
                        {label}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" onClick={() => void previewAdQuote()} disabled={adQuoteLoading} className="min-h-10 rounded-xl border border-maroon/30 px-4 py-2 text-sm font-bold text-maroon hover:bg-maroon/5 disabled:opacity-60">
                    {adQuoteLoading ? "Calculating…" : "Preview server quote"}
                  </button>
                  <button type="submit" disabled={adDraftBusy} className="min-h-10 rounded-xl bg-maroon px-4 py-2 text-sm font-bold text-white hover:bg-maroon-dark disabled:opacity-60">
                    {adDraftBusy ? "Submitting…" : "Create pending campaign"}
                  </button>
                  {adQuote && <span role="status" className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800">Estimated total: ₹{adQuote.total} · ₹{adQuote.per_day}/day</span>}
                </div>
                <p className="text-xs leading-5 text-slate-500">A quote is an estimate, not a payment record. Creating a campaign never marks payment as received or makes it live.</p>
              </form>
            </section>

            <section className="space-y-4" aria-labelledby="ads-list-heading">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 id="ads-list-heading" className="text-lg font-black text-navy">Campaigns and review queue</h2>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Filter campaigns by targeting scope">
                  {(["all", "district", "state"] as const).map((level) => (
                    <button key={level} type="button" onClick={() => setAdFilterLevel(level)} aria-pressed={adFilterLevel === level} className={`min-h-9 rounded-full px-3 py-1.5 text-xs font-bold capitalize ${adFilterLevel === level ? "maroon-gradient text-white" : "border bg-white text-slate-700"}`}>
                      {level === "all" ? "All scopes" : level}
                    </button>
                  ))}
                </div>
              </div>
              {adsData.filter((ad) => adFilterLevel === "all" || ad.level === adFilterLevel).length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">No campaigns in this view. Member data and campaign records are not fabricated.</div>
              ) : (
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  {adsData.filter((ad) => adFilterLevel === "all" || ad.level === adFilterLevel).map((ad) => (
                    <article key={ad.id} className="min-w-0 rounded-3xl border border-gold/30 bg-white p-4 shadow-sm sm:p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="break-words font-extrabold text-navy">{ad.title}</h3>
                          <p className="mt-1 text-xs text-slate-500">Campaign {ad.id} · Vendor {ad.vendor_id || "—"}</p>
                        </div>
                        <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold capitalize text-slate-700">{ad.status}</span>
                      </div>
                      {ad.offer && <p className="mt-2 break-words text-sm font-semibold text-maroon">{ad.offer}</p>}
                      <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-slate-600 sm:grid-cols-2">
                        <p>Target: {ad.level === "district" ? ad.districts?.join(", ") || "Not specified" : ad.level === "state" ? ad.state || "Not specified" : "All regions"}</p>
                        <p>Duration: {ad.days} days · Amount: ₹{ad.amount}</p>
                        <p>Views: {ad.impressions} · Clicks: {ad.clicks} · Leads: {ad.leads}</p>
                        <p>Payment reference: {ad.utr || "Not recorded"}</p>
                      </div>
                      {ad.status === "pending" && (
                        <div className="mt-4 space-y-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-3">
                          <p className="text-xs font-semibold leading-5 text-amber-900">Review the receipt and amount before approval. The submitted reference is recorded as supplied; this system cannot verify payment with a bank.</p>
                          <label className="block text-xs font-bold text-slate-700" htmlFor={`ad-utr-${ad.id}`}>Actual payment reference / UTR
                            <input id={`ad-utr-${ad.id}`} maxLength={64} value={adUtrById[ad.id] || ""} onChange={(e) => setAdUtrById((current) => ({ ...current, [ad.id]: e.target.value }))} className="mt-1.5 min-h-10 w-full rounded-xl border border-slate-300 bg-white px-3 font-mono text-sm" placeholder="Enter reference from verified receipt" />
                          </label>
                          <label className="block text-xs font-bold text-slate-700" htmlFor={`ad-reason-${ad.id}`}>Rejection reason (required to reject)
                            <input id={`ad-reason-${ad.id}`} maxLength={500} value={adReasonById[ad.id] || ""} onChange={(e) => setAdReasonById((current) => ({ ...current, [ad.id]: e.target.value }))} className="mt-1.5 min-h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm" placeholder="Write a clear reason" />
                          </label>
                          <div className="flex flex-wrap gap-2">
                            <button type="button" disabled={busyId === ad.id} onClick={() => void handleAdAction(ad.id, "approve")} className="min-h-10 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">Approve after receipt review</button>
                            <button type="button" disabled={busyId === ad.id} onClick={() => void handleAdAction(ad.id, "reject")} className="min-h-10 rounded-xl bg-rose-700 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">Reject with reason</button>
                          </div>
                        </div>
                      )}
                      {ad.status === "active" && <button type="button" disabled={busyId === ad.id} onClick={() => void handleAdAction(ad.id, "pause")} className="mt-4 min-h-10 rounded-xl border border-amber-300 px-4 py-2 text-xs font-bold text-amber-900 disabled:opacity-50">Pause campaign</button>}
                      {ad.status === "paused" && <div className="mt-4 flex flex-wrap gap-2"><button type="button" disabled={busyId === ad.id} onClick={() => void handleAdAction(ad.id, "resume")} className="min-h-10 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">Resume</button><button type="button" disabled={busyId === ad.id} onClick={() => void handleAdAction(ad.id, "expire")} className="min-h-10 rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 disabled:opacity-50">Expire</button></div>}
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {/* Vendors Tab */}
        {tab === "vendors" && owner && (
          <div className="grid md:grid-cols-3 gap-4">
            {vendorsData.map((v) => (
              <div key={v.id || v.vendor_id} className="bg-white rounded-2xl p-4 border border-gold/30 shadow-xs space-y-2">
                <div className="font-extrabold text-sm text-navy">{v.business_name || v.name}</div>
                <div className="text-[11px] font-mono text-slate-500">Vendor ID: {v.id || v.vendor_id || "Not available"}</div>
                <div className="text-xs text-maroon font-bold">📂 {v.category_name || v.category}</div>
                <div className="text-xs text-slate-600">🏡 {v.district}, {v.state}</div>
                <div className="text-xs font-mono text-emerald-800 font-bold">📞 {v.phone || v.phone_masked || "—"}</div>
              </div>
            ))}
          </div>
        )}

        {/* Spotlight Tab */}
        {tab === "spotlight" && owner && (
          <div className="space-y-4">
            {spotlights.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gold/40 bg-white p-8 text-center text-sm text-slate-600">
                {te ? "సమీక్షించాల్సిన స్పాట్‌లైట్ దరఖాస్తులు లేవు." : "No spotlight applications need review."}
              </div>
            ) : (
              <div className="grid min-w-0 gap-4 xl:grid-cols-2">
                {spotlights.map((sp) => {
                  const paymentVerified = sp.payment_status === "verified";
                  return (
                    <article key={sp.promo_id} className="min-w-0 space-y-3 rounded-3xl border border-gold/30 bg-white p-4 shadow-xs sm:p-5">
                      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="break-words font-black text-base text-navy">{sp.full_name || (te ? "పేరు ఇవ్వలేదు" : "Name not provided")}</div>
                          <div className="break-all font-mono text-xs text-slate-500">{sp.tsap_id} · {sp.promo_id}</div>
                          <div className="mt-1 break-words text-xs text-slate-600">{[sp.caste, sp.district, sp.plan_code].filter(Boolean).join(" · ") || "—"} · ₹{sp.amount_due ?? sp.amount_paid ?? 0}</div>
                        </div>
                        <span className="w-fit shrink-0 rounded-full border border-amber-300 bg-amber-100 px-2.5 py-1 text-[10px] font-black uppercase text-maroon">
                          {sp.status} · {sp.payment_status || (te ? "చెల్లింపు స్థితి లేదు" : "payment status unavailable")}
                        </span>
                      </div>
                      <p className="break-words rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-700">{sp.headline || "—"}<br />{sp.pitch_text || "—"}</p>
                      {sp.photo_url && <a className="break-all text-xs font-bold text-maroon underline" href={sp.photo_url} target="_blank" rel="noopener noreferrer">{te ? "ఫోటో చూడండి" : "Review photo"}</a>}
                      {sp.video_url && <a className="ml-3 break-all text-xs font-bold text-maroon underline" href={sp.video_url} target="_blank" rel="noopener noreferrer">{te ? "వీడియో చూడండి" : "Review video"}</a>}
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
                        <div className="font-bold text-slate-700">{te ? "చెల్లింపు UTR" : "Payment UTR"}</div>
                        <div className="mt-1 break-all font-mono">{sp.payment_ref || (te ? "సమర్పించలేదు" : "Not submitted")}</div>
                        <div className="mt-1 text-slate-600">{te ? "ధృవీకరించిన మొత్తం" : "Verified amount"}: ₹{sp.amount_paid || 0}</div>
                      </div>
                      {!paymentVerified && sp.status === "pending_review" && (
                        <div className="space-y-2">
                          <label htmlFor={`spotlight-audit-${sp.promo_id}`} className="block text-xs font-bold text-slate-700">
                            {te ? "బ్యాంక్ స్టేట్‌మెంట్‌తో సరిపోల్చిన వివరాలను audit note లో నమోదు చేయండి" : "Record how you matched this UTR to the bank statement"}
                          </label>
                          <textarea id={`spotlight-audit-${sp.promo_id}`} value={spPaymentNotes[sp.promo_id] || ""}
                            onChange={(e) => setSpPaymentNotes((prev) => ({ ...prev, [sp.promo_id]: e.target.value.slice(0, 300) }))}
                            rows={2} maxLength={300} className="w-full min-w-0 resize-y rounded-xl border border-slate-300 px-3 py-2 text-xs leading-relaxed" />
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                        {!paymentVerified && sp.status === "pending_review" && (
                          <button type="button" onClick={() => spotlightAction(sp.promo_id, "verify_payment")} disabled={busyId === sp.promo_id}
                            className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
                            {te ? "UTR ధృవీకరించు" : "Verify UTR"}
                          </button>
                        )}
                        {paymentVerified && sp.status === "pending_review" && (
                          <button type="button" onClick={() => spotlightAction(sp.promo_id, "approve")} disabled={busyId === sp.promo_id}
                            className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
                            {te ? "మీడియా ఆమోదించి ప్రచురించు" : "Approve media & publish"}
                          </button>
                        )}
                        {(sp.status === "pending_review" || sp.status === "active") && (
                          <button type="button" onClick={() => spotlightAction(sp.promo_id, sp.status === "active" ? "close" : "reject")} disabled={busyId === sp.promo_id}
                            className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
                            {sp.status === "active" ? (te ? "ముగించు" : "Close") : (te ? "తిరస్కరించు" : "Reject")}
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB 10: 🤝 REFERRAL PAYOUT REVIEW CONSOLE
            ========================================================================= */}
        {tab === "referrals" && financeAccess && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gold/30 shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-[#7A0C2E] flex items-center gap-2">
                    <span>🤝</span>
                    <span>రెఫరల్ భాగస్వాములు & payout అభ్యర్థనల సమీక్ష (Payout Review Desk)</span>
                  </h2>
                  <p className="text-xs text-slate-600 mt-1">
                    యూజర్లు మరియు భాగస్వాముల payout అభ్యర్థనలు • UPI వివరాలు పరిశీలించి, settlement తర్వాత UTR నమోదు చేసి status update చేయండి. WhatsApp సందేశం వేరుగా పంపాలి.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500">ఫిల్టర్:</span>
                  {[
                    { id: "all", label: "అన్నీ (All)" },
                    { id: "requested", label: "⏳ పెండింగ్ (Pending)" },
                    { id: "paid", label: "✅ చెల్లించినవి (Paid)" },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => { setPStatus(s.id); loadPayouts(s.id); }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                        pStatus === s.id
                          ? "bg-[#7A0C2E] text-white shadow-xs"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Payouts Grid */}
            <div className="space-y-3">
              {payouts.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center text-slate-400 font-bold border border-gold/20">
                  <span className="text-3xl block mb-2">🤝</span>
                  <span>ప్రస్తుతం ఎటువంటి విత్‌డ్రా అభ్యర్థనలు లేవు</span>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {payouts.map((po) => {
                    const isPending = po.status === "requested";
                    const isPaid = po.status === "paid";
                    const recipientPhone = po.tsap_id ? directoryProfiles.find((x) => x.tsap_id === po.tsap_id)?.phone || "" : "";
                    const payoutMessage = `🎉 శుభవార్త ${po.name} గారు!\n\nమన వివాహ referral ప్రోగ్రామ్ ద్వారా ₹${po.amount} payout మీ UPI ఖాతాకు process చేయబడింది.\n${po.utr ? `UTR: ${po.utr}\n` : ""}\nReferral వివరాలు: https://manavivaha.in/referral`;
                    const payoutWaLink = whatsappPhoneLink(recipientPhone, payoutMessage);
                    const directUpiLink = po.upi_id
                      ? `upi://pay?pa=${encodeURIComponent(po.upi_id)}&pn=${encodeURIComponent(po.name || "")}&am=${po.amount}&cu=INR&tn=${encodeURIComponent(`ManaVivaha_Payout_${po.id}`)}`
                      : "";

                    return (
                      <div
                        key={po.id}
                        className={`bg-white rounded-3xl p-5 border-2 transition shadow-sm space-y-3 ${
                          isPending ? "border-amber-300 bg-amber-50/20" : isPaid ? "border-emerald-300" : "border-slate-200"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-black text-sm text-navy">{po.name || po.tsap_id}</span>
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                                isPending ? "bg-amber-100 text-amber-900 border border-amber-300" :
                                isPaid ? "bg-emerald-100 text-emerald-800 border border-emerald-300" :
                                "bg-rose-100 text-rose-800"
                              }`}>
                                {isPending ? "⏳ Pending Review" : isPaid ? "✅ Paid / Settled" : "Rejected"}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 font-mono mt-0.5">
                              ID: {po.tsap_id || po.partner_id} • Req: {po.id}
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-xl font-black text-emerald-700">₹{po.amount}</div>
                            <div className="text-[10px] text-slate-400">{String(po.requested_at || "").slice(0, 10)}</div>
                          </div>
                        </div>

                        {/* UPI / Bank Details Box */}
                        <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 font-bold">చెల్లింపు విధానం:</span>
                            <span className="font-bold text-slate-800 uppercase font-mono">{po.method || "UPI"}</span>
                          </div>
                          {po.upi_id && (
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500 font-bold">UPI ID:</span>
                              <span className="font-bold text-emerald-800 font-mono select-all bg-white px-2 py-0.5 rounded border border-slate-200">{po.upi_id}</span>
                            </div>
                          )}
                          {po.utr && (
                            <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                              <span className="text-slate-500 font-bold">UTR / Bank Ref:</span>
                              <span className="font-bold text-slate-800 font-mono">{po.utr}</span>
                            </div>
                          )}
                        </div>

                        {/* Action Buttons for Pending Requests */}
                        {isPending && (
                          <div className="space-y-2 pt-1 border-t border-slate-100">
                            <div className="flex gap-2">
                              {/* 1-Tap Mobile UPI App Deep-Link */}
                              {directUpiLink && (
                                <a
                                  href={directUpiLink}
                                  className="flex-1 py-2 px-3 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-sm transition active:scale-95"
                                  title="Open in PhonePe / Google Pay with prefilled amount"
                                >
                                  <span>📲</span>
                                  <span>PhonePe/GPay లో పే చేయి (₹{po.amount})</span>
                                </a>
                              )}
                            </div>

                            <div className="flex gap-2">
                              {/* Approve & Settle Payout */}
                              <button
                                onClick={() => {
                                  const customUtr = prompt("వాస్తవ బ్యాంక్ / UPI రసీదులో ఉన్న UTR నమోదు చేయండి. ధృవీకరించని చెల్లింపును మార్క్ చేయవద్దు:", "");
                                  if (customUtr?.trim()) payoutAction(po.id, "approve", customUtr.trim());
                                }}
                                disabled={busyId === po.id}
                                className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-sm transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1"
                              >
                                <span>✓</span>
                                <span>చెల్లించినట్లు మార్క్ చేయి (Approve Payout)</span>
                              </button>

                              {/* Reject Button */}
                              <button
                                onClick={() => {
                                  const reason = prompt("తిరస్కరణకు నిజమైన కారణం నమోదు చేయండి:", "");
                                  if (reason?.trim()) payoutAction(po.id, "reject", "", reason.trim());
                                }}
                                disabled={busyId === po.id}
                                className="px-3 py-2 rounded-xl border border-rose-300 text-rose-700 hover:bg-rose-50 font-bold text-xs transition"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        )}

                        {/* WhatsApp Notification Button for Paid Requests */}
                        {isPaid && payoutWaLink && (
                          <div className="pt-1">
                            <a
                              href={payoutWaLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-extrabold text-xs flex items-center justify-center gap-1.5 transition"
                            >
                              <span>💬</span>
                              <span>యూజర్‌కి వాట్సాప్ payout సమాచారం పంపండి</span>
                            </a>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Reports Tab */}
        {tab === "reports" && (
          <div className="space-y-3">
            {reports.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-600">{L.emptyReports}</div>
            ) : reports.map((r) => {
              const reportId = r.report_id || r.id || "";
              return (
                <article key={reportId} className="rounded-2xl border border-gold/30 bg-white p-4 shadow-xs">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-black text-sm text-rose-700">🚩 {r.category_telugu || r.category}</h3>
                        <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold uppercase text-rose-800">{r.severity || "unrated"}</span>
                        <span className="text-[10px] text-slate-500">Allegation under review</span>
                      </div>
                      <p className="break-words text-xs text-slate-700">{r.detail || "No additional details were provided."}</p>
                      <p className="text-[11px] text-slate-500">
                        Report ID: {reportId} • Target: {r.target?.full_name || r.target_id || "Unknown"}
                        {r.target?.district ? ` • ${r.target.district}` : ""}
                        {r.reports_on_target && r.reports_on_target > 1 ? ` • ${r.reports_on_target} open reports for this target` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
                      <button type="button" onClick={() => resolveReport(reportId, "warn")} disabled={busyId === reportId} className="rounded-xl border border-amber-300 px-3 py-2 text-xs font-bold text-amber-900 disabled:opacity-50">Warn</button>
                      <button type="button" onClick={() => resolveReport(reportId, "hide")} disabled={busyId === reportId} className="rounded-xl border border-rose-300 px-3 py-2 text-xs font-bold text-rose-800 disabled:opacity-50">Hide profile</button>
                      {owner && <button type="button" onClick={() => resolveReport(reportId, "ban")} disabled={busyId === reportId} className="rounded-xl bg-rose-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Ban</button>}
                      <button type="button" onClick={() => resolveReport(reportId, "dismiss")} disabled={busyId === reportId} className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 disabled:opacity-50">Dismiss</button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* Revenue Tab (Owner only) */}
        {tab === "revenue" && financeAccess && an.revenue && (
          <div className="bg-white rounded-3xl p-6 border border-gold/30 space-y-4">
            <h3 className="font-black text-lg text-[#7A0C2E]">💰 రాబడి వివరాలు (Total Revenue: ₹{an.revenue.total})</h3>
            <div className="grid md:grid-cols-2 gap-5">
              <Donut items={an.revenue.plan_split} />
              <BarList items={an.revenue.plan_split} />
            </div>
          </div>
        )}

        {/* Audit Tab (Owner only) */}
        {tab === "audit" && owner && an.audit && (
          <div className="bg-white rounded-3xl p-6 border border-gold/30 space-y-3">
            <h3 className="font-black text-base text-navy">📝 ఇటీవలి ఆడిట్ లాగ్</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {an.audit.map((a, i) => (
                <div key={i} className="text-xs p-2 rounded-xl bg-slate-50 border border-slate-100 flex justify-between">
                  <div><b>{a.action}</b> by {a.actor}</div>
                  <div className="text-slate-400 font-mono">{a.at}</div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* =========================================================================
          📝 DYNAMIC FLOATING / DOCKED NOTEPAD (ALWAYS VISIBLE WHEN PROFILES SELECTED)
          ========================================================================= */}
      {owner && selectedProfiles.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/98 backdrop-blur-md border-t-2 border-gold shadow-2xl safe-bottom transition-all">
          <div className="mx-auto max-w-7xl px-4 py-3">
            
            {/* Notepad Dock Header Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              
              {/* Left: Selected Counter & Format Switcher */}
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-maroon text-white shadow-xs">
                  <span>📝</span>
                  <span>{selectedProfiles.length} సంబంధాలు ఎంపికయ్యాయి</span>
                </span>

                <div className="flex items-center bg-slate-100 rounded-xl p-0.5 text-[11px] font-bold">
                  <button
                    onClick={() => setNotepadFormat("simple")}
                    className={`px-2.5 py-1 rounded-lg transition ${
                      notepadFormat === "simple" ? "bg-white text-maroon shadow-xs" : "text-slate-600"
                    }`}
                  >
                    Name -- Number (సాధారణం)
                  </button>
                  <button
                    onClick={() => setNotepadFormat("detailed")}
                    className={`px-2.5 py-1 rounded-lg transition ${
                      notepadFormat === "detailed" ? "bg-white text-maroon shadow-xs" : "text-slate-600"
                    }`}
                  >
                    వివరాలతో (Detailed)
                  </button>
                </div>

                <button
                  onClick={() => setIsNotepadMinimized(!isNotepadMinimized)}
                  className="text-xs text-slate-500 hover:text-maroon underline font-bold"
                >
                  {isNotepadMinimized ? "🔼 నోట్‌ప్యాడ్ చూపించు" : "🔽 దాచు"}
                </button>
              </div>

              {/* Right: WhatsApp Phone Input & 1-Click Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                
                {/* Recipient WhatsApp Phone Input */}
                <input
                  type="text"
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  placeholder="స్వీకర్త WhatsApp నంబర్"
                  className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-mono font-bold focus:border-maroon focus:outline-none w-44"
                />

                {/* 1. Copy Notepad List Button */}
                <button
                  onClick={copyNotepadToClipboard}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 text-white font-extrabold text-xs shadow-xs hover:bg-slate-900 active:scale-95 transition flex items-center gap-1"
                  title="Copy formatted contact list to clipboard"
                >
                  <span>📋</span>
                  <span>కాపీ చేసుకోండి</span>
                </button>

                {/* 2. WhatsApp Button: Profiles ONLY (Privacy Safe) */}
                <button
                  onClick={() => shareWhatsApp(false)}
                  className="px-3.5 py-2 rounded-xl bg-amber-500 text-white font-extrabold text-xs shadow-xs hover:bg-amber-600 active:scale-95 transition flex items-center gap-1"
                  title="Share profile cards without exposing phone numbers"
                >
                  <span>📲</span>
                  <span>వాట్సాప్ (గోప్యత)</span>
                </button>

                {/* 3. WhatsApp Button: Profiles + PHONE NUMBERS */}
                <button
                  onClick={() => shareWhatsApp(true)}
                  className="px-3.5 py-2 rounded-xl bg-[#25D366] text-white font-black text-xs shadow-xs hover:brightness-105 active:scale-95 transition flex items-center gap-1.5"
                  title="Share profile cards WITH full phone numbers"
                >
                  <span>💬</span>
                  <span>వాట్సాప్ + నంబర్లు</span>
                </button>

                {/* 4. Telegram Share Button */}
                <button
                  onClick={shareTelegram}
                  className="px-3 py-2 rounded-xl bg-[#229ED9] text-white font-extrabold text-xs shadow-xs hover:brightness-105 active:scale-95 transition"
                  title="Broadcast to Telegram Channel"
                >
                  📢
                </button>

                {/* Clear Selection */}
                <button
                  onClick={() => setSelectedProfiles([])}
                  className="px-2.5 py-2 rounded-xl border border-slate-300 text-slate-500 font-bold text-xs hover:bg-slate-100"
                  title="Clear selected list"
                >
                  ✕
                </button>
              </div>

            </div>

            {/* Expandable Live Notepad Textarea Box */}
            {!isNotepadMinimized && (
              <div className="mt-3 pt-3 border-t border-slate-200 grid md:grid-cols-3 gap-3">
                <div className="md:col-span-2 space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                    <span>📝 నోట్‌ప్యాడ్ ప్రివ్యూ (Live Contact List):</span>
                    <span className="font-mono text-emerald-700">✅ Edit / Copy / WhatsApp కి సిద్ధం</span>
                  </div>
                  <textarea
                    rows={3}
                    readOnly
                    value={generatedNotepadText}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs text-slate-800 focus:outline-none select-all"
                  />
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 block">✍️ అదనపు గమనిక (Custom Note):</span>
                  <textarea
                    rows={3}
                    value={notepadNote}
                    onChange={(e) => setNotepadNote(e.target.value)}
                    placeholder="ఉదా: సభ్యులు ఇచ్చిన వివరాలను కుటుంబంతో పరిశీలించండి; జాతక సూచిక ఉంటే విడిగా నిర్ధారించండి..."
                    className="w-full p-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 focus:border-maroon focus:outline-none"
                  />
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* 👑 VIP & 1-CLICK PLAN GRANT & MANUAL VERIFICATION MODAL */}
      {owner && upgradeModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border-2 border-amber-400 space-y-4 animate-in fade-in zoom-in duration-200 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">👑</span>
                <div>
                  <h3 className="font-black text-navy text-base">ప్లాన్ క్రెడిట్స్ యాక్టివేట్ చేయండి</h3>
                  <p className="text-xs text-slate-500 font-mono">
                    {upgradeModal.name} • <span className="text-maroon font-bold">{upgradeModal.tsapId}</span> • 📞 {upgradeModal.phone || "—"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setUpgradeModal(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            <div className="bg-amber-50 rounded-2xl p-3 border border-amber-200 text-xs text-amber-950 flex items-start gap-2">
              <span className="text-base shrink-0">💡</span>
              <p className="leading-relaxed">
                సరైన payment source / UTR నమోదు చేసి ప్లాన్ యాక్టివేట్ చేయండి. ఇది request credits మాత్రమే జోడిస్తుంది — profile approval, photo review లేదా identity verification వేరుగా ఉంటాయి. Complimentary grants కు referral reward వర్తించదు.
              </p>
            </div>

            {/* Plan selection cards */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">1. ప్లాన్ ఎంచుకోండి (Select Membership Plan):</label>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* S_99 */}
                <button
                  type="button"
                  onClick={() => { setGrantPlanCode("S_99"); setGrantCredits(5); setGrantAmount(99); }}
                  className={`p-3 rounded-2xl border text-left transition ${
                    grantPlanCode === "S_99" ? "bg-amber-50 border-amber-500 ring-2 ring-amber-400/50" : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-black text-xs text-amber-900">🥉 Sambandham</div>
                    <span className="font-mono font-black text-xs text-amber-950">₹99</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">5 interest requests • 30 రోజులు</div>
                </button>

                {/* S_199 */}
                <button
                  type="button"
                  onClick={() => { setGrantPlanCode("S_199"); setGrantCredits(12); setGrantAmount(199); }}
                  className={`p-3 rounded-2xl border text-left transition ${
                    grantPlanCode === "S_199" ? "bg-purple-50 border-purple-500 ring-2 ring-purple-400/50" : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-black text-xs text-purple-900">🥈 Family</div>
                    <span className="font-mono font-black text-xs text-purple-950">₹199</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">12 interest requests • 45 రోజులు</div>
                </button>

                {/* S_299 */}
                <button
                  type="button"
                  onClick={() => { setGrantPlanCode("S_299"); setGrantCredits(25); setGrantAmount(299); }}
                  className={`p-3 rounded-2xl border text-left transition ${
                    grantPlanCode === "S_299" ? "bg-blue-50 border-blue-500 ring-2 ring-blue-400/50" : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-black text-xs text-blue-900">🥇 Premium</div>
                    <span className="font-mono font-black text-xs text-blue-950">₹299</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">25 interest requests • 60 రోజులు • Who-viewed names while active</div>
                </button>

                {/* S_499 */}
                <button
                  type="button"
                  onClick={() => { setGrantPlanCode("S_499"); setGrantCredits(50); setGrantAmount(499); }}
                  className={`p-3 rounded-2xl border text-left transition ${
                    grantPlanCode === "S_499" ? "bg-emerald-50 border-emerald-500 ring-2 ring-emerald-400/50" : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-black text-xs text-emerald-900">💎 VIP</div>
                    <span className="font-mono font-black text-xs text-emerald-950">₹499</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">50 interest requests • 90 రోజులు • Who-viewed names while active</div>
                </button>
              </div>


            </div>

            {/* Payment Mode Selector */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-bold text-slate-700 block">2. పేమెంట్ విధానం (Payment Source):</label>
              <select
                value={grantPayMode}
                onChange={(e) => {
                  const mode = e.target.value;
                  setGrantPayMode(mode);
                  if (mode === "ADMIN_COMPLIMENTARY") {
                    setGrantAmount(0);
                    setGrantTriggerRef(false);
                  } else if (grantPlanCode) {
                    setGrantAmount(({ S_99: 99, S_199: 199, S_299: 299, S_499: 499 } as Record<string, number>)[grantPlanCode] || 0);
                  }
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold focus:border-maroon focus:outline-none"
              >
                <option value="">పేమెంట్ విధానం ఎంచుకోండి (Select payment source)</option>
                <option value="UPI_QR">📱 UPI / QR ద్వారా చెల్లింపు</option>
                <option value="PHONEPE">🟣 PhonePe Transfer</option>
                <option value="GPAY">🔵 Google Pay</option>
                <option value="BANK_TRANSFER">🏦 Direct Bank Transfer / NetBanking</option>
                <option value="CASH">💵 Cash / Offline Office Payment</option>
                <option value="ADMIN_COMPLIMENTARY">🎁 Admin Complimentary (ఉచిత ప్రోత్సాహం)</option>
              </select>
            </div>

            {/* UTR & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-0.5">UTR / లావాదేవీ నంబర్ (Optional):</label>
                  <input
                    type="text"
                    value={grantUtr}
                    onChange={(e) => setGrantUtr(e.target.value)}
                    placeholder="చెల్లింపు రిఫరెన్స్ ఉంటే నమోదు చేయండి"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-mono focus:border-maroon focus:outline-none"
                  />
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-700">
                  Interest-request credits: <b>{grantCredits || "Choose a plan"}</b> · fixed by plan
                </div>
              </div>

            {/* Referral trigger */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="triggerRef"
                checked={grantTriggerRef}
                disabled={grantPayMode === "ADMIN_COMPLIMENTARY"}
                onChange={(e) => setGrantTriggerRef(e.target.checked)}
                className="w-4 h-4 rounded accent-[#7A0C2E] cursor-pointer"
              />
              <label htmlFor="triggerRef" className="text-xs font-medium text-slate-700 cursor-pointer">
                Eligible first paid plan మాత్రమే: ₹50 referral wallet reward (complimentary grant / repeat payment కి కాదు)
              </label>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setUpgradeModal(null)}
                className="flex-1 py-2.5 rounded-2xl border border-slate-300 font-bold text-xs text-slate-600 hover:bg-slate-100 transition"
              >
                రద్దు చేయి (Cancel)
              </button>
              <button
                type="button"
                disabled={busyId === upgradeModal.tsapId || !grantPlanCode || !grantPayMode || grantCredits < 1 || (grantPayMode !== "ADMIN_COMPLIMENTARY" && grantAmount <= 0)}
                onClick={() => {
                  if (!grantPlanCode) return;
                  void upgradeProfile(
                    upgradeModal.tsapId,
                    grantPlanCode,
                    grantCredits,
                    grantTriggerRef,
                    grantPayMode,
                    grantUtr,
                    grantNotes,
                    grantAmount
                  );
                }}
                className="flex-1 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-amber-600 to-rose-600 text-white font-extrabold text-xs shadow-md hover:brightness-110 active:scale-98 transition disabled:opacity-50"
              >
                {busyId === upgradeModal.tsapId ? "యాక్టివేట్ అవుతోంది..." : `✓ ప్లాన్ క్రెడిట్స్ యాక్టివేట్ చేయి`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🎉 ACTIVATION SUCCESS & WHATSAPP CONFIRMATION DIALOG */}
      {owner && activatedSuccessModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border-2 border-emerald-500 space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="text-center space-y-1">
              <span className="text-4xl inline-block animate-bounce">🎉</span>
              <h3 className="font-black text-navy text-lg">ప్లాన్ విజయవంతంగా యాక్టివేట్ అయ్యింది!</h3>
              <p className="text-xs text-slate-600">
                <b>{activatedSuccessModal.name}</b> ({activatedSuccessModal.tsapId}) కి <b>{activatedSuccessModal.plan}</b> plan credits జోడించబడ్డాయి. Profile approval / verification వేరుగా ఉంటాయి.
              </p>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>📲 యూజర్‌కి వాట్సాప్ కన్ఫర్మేషన్ మెసేజ్:</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(activatedSuccessModal.waMessage);
                    flash("✅ వాట్సాప్ మెసేజ్ కాపీ అయ్యింది!");
                  }}
                  className="text-emerald-700 hover:text-emerald-800 text-[11px] font-black underline"
                >
                  కాపీ చేయి (Copy)
                </button>
              </div>
              <textarea
                rows={5}
                readOnly
                value={activatedSuccessModal.waMessage}
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 font-sans leading-relaxed focus:outline-none"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setActivatedSuccessModal(null)}
                className="flex-1 py-2.5 rounded-2xl border border-slate-300 font-bold text-xs text-slate-600 hover:bg-slate-100 transition"
              >
                ముగించు (Close)
              </button>
              {activatedSuccessModal.phone && (
                <a
                  href={whatsappPhoneLink(activatedSuccessModal.phone, activatedSuccessModal.waMessage) || undefined}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setActivatedSuccessModal(null)}
                  className="flex-1 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md text-center transition flex items-center justify-center gap-1.5"
                >
                  <span>💬</span>
                  <span>WhatsApp లో పంపు</span>
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 🖼️ Large HD Photo Preview Modal */}
      {owner && previewPhotoModal?.open && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreviewPhotoModal(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border-2 border-gold/40 animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative bg-slate-950 flex items-center justify-center min-h-[350px] max-h-[500px]">
              <img
                src={previewPhotoModal.url}
                alt={previewPhotoModal.name}
                className="max-w-full max-h-[500px] object-contain"
              />
              <button
                type="button"
                onClick={() => setPreviewPhotoModal(null)}
                className="absolute top-3 right-3 bg-black/60 hover:bg-black text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold backdrop-blur-xs transition"
              >
                ✕
              </button>
            </div>
            <div className="p-4 bg-white flex items-center justify-between">
              <div>
                <h4 className="font-extrabold text-sm text-navy">{previewPhotoModal.name}</h4>
                <p className="text-xs font-mono font-bold text-maroon">{previewPhotoModal.tsapId}</p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewPhotoModal(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
              >
                క్లోజ్ చేయి (Close)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 💌 DYNAMIC WHATSAPP PROPOSAL BATCH GENERATOR MODAL */}
      {owner && proposalBatchModal?.open && (
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border-2 border-emerald-500 space-y-4 animate-in fade-in zoom-in duration-200 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">💌</span>
                <div>
                  <h3 className="font-black text-navy text-base">WhatsApp ప్రపోజల్ డిస్పాచర్ (Proposal Builder)</h3>
                  <p className="text-xs text-slate-500">
                    {proposalBatchModal.candidate?.full_name} ({proposalBatchModal.candidate?.tsap_id}) కోసం సంబంధాల వివరాలు
                  </p>
                </div>
              </div>
              <button
                onClick={() => setProposalBatchModal(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            {/* Template Selector Pills */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">1. ప్రపోజల్ టెంప్లేట్ ఎంచుకోండి:</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "parents" as const, label: "👨‍👩‍👧 తల్లిదండ్రుల కోసం (Parents)" },
                  { id: "direct" as const, label: "💍 డైరెక్ట్ మ్యాచ్ షీట్ (Direct)" },
                  { id: "vip" as const, label: "👑 VIP ప్రత్యేక సంబంధం (VIP)" },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setProposalBatchModal({ ...proposalBatchModal, templateType: t.id })}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold text-center transition ${
                      proposalBatchModal.templateType === t.id
                        ? "bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-300"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Recipient Phone & Custom Note */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">📞 పంపాల్సిన WhatsApp నంబర్:</label>
                <input
                  type="text"
                  value={proposalBatchModal.recipientPhone}
                  onChange={(e) => setProposalBatchModal({ ...proposalBatchModal, recipientPhone: e.target.value })}
                  placeholder="సభ్యుడు అందించిన 10 అంకెల నంబర్"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono font-bold focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">📝 ప్రత్యేక సూచనలు / గమనిక (Optional):</label>
                <input
                  type="text"
                  value={proposalBatchModal.customNote}
                  onChange={(e) => setProposalBatchModal({ ...proposalBatchModal, customNote: e.target.value })}
                  placeholder="ఉదా: జాతకం కలిసింది, వెంటనే సంప్రదించండి"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:border-emerald-600 focus:outline-none"
                />
              </div>
            </div>

            {/* Generated Live Proposal Message Preview */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>📲 సిద్ధమైన WhatsApp ప్రపోజల్ మెసేజ్:</span>
                <button
                  type="button"
                  onClick={() => {
                    const text = buildProposalText(
                      proposalBatchModal.candidate,
                      proposalBatchModal.targetMatches,
                      proposalBatchModal.templateType,
                      proposalBatchModal.customNote
                    );
                    navigator.clipboard.writeText(text);
                    flash("✅ ప్రపోజల్ మెసేజ్ కాపీ అయ్యింది!");
                  }}
                  className="text-emerald-700 hover:text-emerald-800 text-[11px] font-black underline flex items-center gap-1"
                >
                  <span>📋</span>
                  <span>కాపీ చేయి (Copy)</span>
                </button>
              </div>
              <textarea
                rows={9}
                readOnly
                value={buildProposalText(
                  proposalBatchModal.candidate,
                  proposalBatchModal.targetMatches,
                  proposalBatchModal.templateType,
                  proposalBatchModal.customNote
                )}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 font-sans leading-relaxed focus:outline-none whitespace-pre-wrap select-all"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setProposalBatchModal(null)}
                className="flex-1 py-2.5 rounded-2xl border border-slate-300 font-bold text-xs text-slate-600 hover:bg-slate-100 transition"
              >
                రద్దు చేయి (Cancel)
              </button>
              <button
                type="button"
                onClick={() => {
                  const text = buildProposalText(
                    proposalBatchModal.candidate,
                    proposalBatchModal.targetMatches,
                    proposalBatchModal.templateType,
                    proposalBatchModal.customNote
                  );
                  navigator.clipboard.writeText(text);
                  flash("✅ ప్రపోజల్ టెక్స్ట్ కాపీ అయ్యింది!");
                }}
                className="py-2.5 px-4 rounded-2xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs shadow-xs transition"
              >
                📋 టెక్స్ట్ కాపీ
              </button>
              <a
                href={whatsappPhoneLink(proposalBatchModal.recipientPhone,
                  buildProposalText(
                    proposalBatchModal.candidate,
                    proposalBatchModal.targetMatches,
                    proposalBatchModal.templateType,
                    proposalBatchModal.customNote
                  )
                ) || undefined}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md text-center transition flex items-center justify-center gap-1.5"
              >
                <span>💬</span>
                <span>WhatsApp లో పంపు</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* 🖨️ PRINTABLE CANDIDATE & MATCH SHEET STUDIO */}
      {owner && printSheetModal?.open && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 shadow-2xl border-2 border-gold/40 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 print:hidden">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🖨️</span>
                <div>
                  <h3 className="font-black text-navy text-base">మన వివాహ — ప్రింట్ షీట్ స్టూడియో (Print Studio)</h3>
                  <p className="text-xs text-slate-500">{printSheetModal.title}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-maroon text-white font-extrabold text-xs shadow-md hover:brightness-110 transition flex items-center gap-1.5"
                >
                  <span>🖨️</span>
                  <span>ప్రింట్ చేయి (Print / PDF)</span>
                </button>
                <button
                  onClick={() => setPrintSheetModal(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Printable Content Area */}
            <div className="space-y-4 bg-white p-4 border border-slate-200 rounded-2xl text-slate-900 print:border-none print:p-0">
              <div className="flex items-center justify-between border-b-2 border-maroon pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-maroon text-white flex items-center justify-center text-xl font-black">
                    వి
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-maroon">మన వివాహ (Mana Vivaha)</h2>
                    <p className="text-[10px] text-slate-500 font-bold">తెలుగు వివాహ పరిచయ వేదిక</p>
                  </div>
                </div>
                <div className="text-right text-xs">
                  {SITE_CONFIG.supportPhoneDisplay ? <div className="font-bold text-slate-700">Support: {SITE_CONFIG.supportPhoneDisplay}</div> : null}
                  <div className="text-[10px] text-slate-500">తేదీ: {new Date().toLocaleDateString("te-IN")}</div>
                </div>
              </div>

              <div className="text-center">
                <h3 className="text-sm font-black text-navy">{printSheetModal.title}</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">మొత్తం ప్రొఫైళ్లు: {printSheetModal.profiles.length}</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px] border-collapse border border-slate-300">
                  <thead className="bg-slate-100 text-slate-800 font-bold">
                    <tr>
                      <th className="border border-slate-300 p-2 text-center">క్ర.సం.</th>
                      <th className="border border-slate-300 p-2">TSAP ID / పేరు</th>
                      <th className="border border-slate-300 p-2">లింగం / వయసు</th>
                      <th className="border border-slate-300 p-2">కులం & గోత్రం</th>
                      <th className="border border-slate-300 p-2">చదువు & ఉద్యోగం</th>
                      <th className="border border-slate-300 p-2">ఆదాయం / ప్రాంతం</th>
                      <th className="border border-slate-300 p-2">ఫోన్ నంబర్</th>
                      <th className="border border-slate-300 p-2 text-center">హోదా</th>
                    </tr>
                  </thead>
                  <tbody>
                    {printSheetModal.profiles.map((p, idx) => (
                      <tr key={p.tsap_id || idx} className="border-b border-slate-200">
                        <td className="border border-slate-300 p-2 text-center font-bold">{idx + 1}</td>
                        <td className="border border-slate-300 p-2">
                          <div className="break-words font-bold text-slate-900">{p.full_name || p.name || "—"}</div>
                          <div className="text-[9px] font-mono text-maroon font-bold">{p.tsap_id}</div>
                        </td>
                        <td className="border border-slate-300 p-2">
                          <div>{p.gender === "Bride" ? "👰 వధువు" : p.gender === "Groom" ? "🤵 వరుడు" : "—"}</div>
                          <div className="text-slate-500">{p.age ? `${p.age} సం.` : "—"}</div>
                        </td>
                        <td className="border border-slate-300 p-2">
                          <div className="font-medium">{p.caste} {p.sub_caste ? `(${p.sub_caste})` : ""}</div>
                          <div className="text-slate-500">{p.gothram || "—"}</div>
                        </td>
                        <td className="border border-slate-300 p-2">
                          <div className="break-words font-medium">{p.job || "—"}</div>
                          <div className="break-words text-slate-500">{p.education || "—"}</div>
                        </td>
                        <td className="border border-slate-300 p-2">
                          <div>{p.salary || "—"}</div>
                          <div className="text-slate-500">{p.district}, {p.state}</div>
                        </td>
                        <td className="border border-slate-300 p-2 font-mono font-bold text-emerald-800">
                          {p.phone || "—"}
                        </td>
                        <td className="border border-slate-300 p-2 text-center">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            p.is_premium || (p.plan && p.plan !== "FREE")
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-slate-100 text-slate-700"
                          }`}>
                            {p.is_premium || (p.plan && p.plan !== "FREE") ? "Paid plan" : "Free plan"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="text-center text-[10px] text-slate-400 pt-2 border-t border-slate-100">
                ఈ సమాచారం కేవలం వివాహ సంబంధాల పరిశీలన కోసం మాత్రమే. గోప్యత పాటించగలరు • మన వివాహ © 2026
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 print:hidden">
              <button
                type="button"
                onClick={() => setPrintSheetModal(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 font-bold text-xs text-slate-600 hover:bg-slate-100 transition"
              >
                ముగించు (Close)
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2 rounded-xl bg-maroon text-white font-extrabold text-xs shadow-md hover:brightness-110 transition flex items-center gap-1.5"
              >
                <span>🖨️</span>
                <span>ప్రింట్ చేయి (Print / Save PDF)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📞 COUNSELOR CRM & CALL LOG MODAL */}
      {owner && counselorModal?.open && (
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border-2 border-indigo-400 space-y-4 animate-in fade-in zoom-in duration-200 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">📝</span>
                <div>
                  <h3 className="font-black text-navy text-base">కౌన్సిలర్ CRM & కాల్ ట్రాకర్ (Counselor Log)</h3>
                  <p className="text-xs text-slate-500 font-mono">
                    {counselorModal.name} • <span className="text-maroon font-bold">{counselorModal.tsapId}</span> • 📞 {counselorModal.phone || "—"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCounselorModal(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            {/* Quick WhatsApp Nudge Buttons */}
            {counselorModal.phone && (
              <div className="space-y-1.5 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <span className="text-[11px] font-bold text-slate-600 block">⚡ తక్షణ WhatsApp నడ్జ్ టెంప్లేట్స్:</span>
                <div className="flex flex-wrap gap-1.5">
                  <a
                    href={whatsappPhoneLink(counselorModal.phone, `💐 నమస్కారం ${counselorModal.name} గారు!\nమన వివాహ (Mana Vivaha) హెల్ప్‌లైన్ నుండి సంప్రదిస్తున్నాం. మీ ప్రొఫైల్ కి మంచి రెస్పాన్స్ రావడానికి దయచేసి స్పష్టమైన ఫోటోను అప్‌లోడ్ చేయండి:\nhttps://manavivaha.in/me`) || undefined}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 text-[11px] font-bold flex items-center gap-1 transition"
                  >
                    <span>📸</span> <span>ఫోటో రిమైండర్</span>
                  </a>

                  <a
                    href={whatsappPhoneLink(counselorModal.phone, `💐 నమస్కారం ${counselorModal.name} గారు!\nమీ జాతక పొంతన (Kundali Match) సరిగ్గా లెక్కించడానికి మీ నక్షత్రం, రాశి మరియు గోత్రం వివరాలను ఇక్కడ అప్‌డేట్ చేసుకోండి:\nhttps://manavivaha.in/me`) || undefined}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-900 text-[11px] font-bold flex items-center gap-1 transition"
                  >
                    <span>🪔</span> <span>జాతకం వివరాల నడ్జ్</span>
                  </a>

                  <a
                    href={whatsappPhoneLink(counselorModal.phone, `💐 నమస్కారం ${counselorModal.name} గారు!\nప్రస్తుత ప్లాన్స్ వివరాలు ఇక్కడ చూడండి. Contact access consent మరియు సేవా నియమాలకు లోబడి ఉంటుంది; match లేదా verification హామీ కాదు:\nhttps://manavivaha.in/pricing`) || undefined}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-900 text-[11px] font-bold flex items-center gap-1 transition"
                  >
                    <span>👑</span> <span>₹99 ప్లాన్ ఆఫర్</span>
                  </a>

                  <a
                    href={whatsappPhoneLink(counselorModal.phone, `💐 నమస్కారం ${counselorModal.name} గారు!\nమీకు చూపిన matches పరిశీలించడానికి ఇక్కడ చూడండి:\nhttps://manavivaha.in/matches`) || undefined}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-900 text-[11px] font-bold flex items-center gap-1 transition"
                  >
                    <span>💍</span> <span>మ్యాచ్ అలర్ట్</span>
                  </a>
                </div>
              </div>
            )}

            {/* Stage Selector */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">1. కస్టమర్ స్టేజ్ (Pipeline Stage):</label>
              <select
                value={counselorModal.newStage}
                onChange={(e) => setCounselorModal({ ...counselorModal, newStage: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold focus:border-indigo-600 focus:outline-none"
              >
                <option value="new_lead">🌟 New Lead (కొత్త రిజిస్ట్రేషన్)</option>
                <option value="call_scheduled">📞 Call Scheduled (కాల్ షెడ్యూల్ చేయబడింది)</option>
                <option value="spoke_interested">💬 Spoke with Parent — Interested (మాట్లాడాం - ఆసక్తి ఉంది)</option>
                <option value="proposal_sent">💌 Proposal Sent (సంబంధాల ప్రపోజల్ పంపించాం)</option>
                <option value="negotiation">🤝 Plan Negotiation (ప్లాన్ డిస్కషన్ లో ఉంది)</option>
                <option value="paid_vip">👑 Paid VIP (ప్రీమియం మెంబర్)</option>
                <option value="matched_married">💍 Matched & Married! (సంబంధం కుదిరింది!)</option>
                <option value="not_interested">❌ Not Interested (ఆసక్తి లేదు)</option>
              </select>
            </div>

            {/* Note & Callback Date */}
            <div className="space-y-2">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">2. కౌన్సిలర్ సంభాషణ వివరాలు (Call Notes):</label>
                <textarea
                  rows={3}
                  value={counselorModal.newNote}
                  onChange={(e) => setCounselorModal({ ...counselorModal, newNote: e.target.value })}
                  placeholder="ఉదా: తండ్రి గారితో మాట్లాడాము. సాఫ్ట్‌వేర్ లేదా గవర్నమెంట్ ఉద్యోగం సంబంధాలు కోరుతున్నారు. రేపు మధ్యాహ్నం 3 గంటలకు ప్రపోజల్ పంపాలి..."
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs focus:border-indigo-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-0.5">📅 తదుపరి ఫాలో-అప్ సమయం (Next Callback Date/Time):</label>
                <input
                  type="text"
                  value={counselorModal.callbackAt}
                  onChange={(e) => setCounselorModal({ ...counselorModal, callbackAt: e.target.value })}
                  placeholder="ఉదా: రేపు సాయంత్రం 5:00 PM లేదా 2026-10-02"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs focus:border-indigo-600 focus:outline-none"
                />
              </div>
            </div>

            {/* Previous History Timeline */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-700 block">📜 గత సంభాషణల చరిత్ర (Activity Trail):</span>
              <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
                {counselorModal.notes && counselorModal.notes.length > 0 ? (
                  counselorModal.notes.map((n, i) => (
                    <div key={n.id || i} className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-slate-500">
                        <span className="font-bold text-indigo-900">👤 {n.operator || "Staff"}</span>
                        <span>{String(n.at || "").replace("T", " ").slice(0, 16)}</span>
                      </div>
                      <div className="font-medium text-slate-800">{n.note || "—"}</div>
                      {n.callback_at && (
                        <div className="text-[10px] text-amber-800 font-bold">⏰ ఫాలో-అప్: {n.callback_at}</div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 italic py-2 text-center">ఇంకా ఎలాంటి గత నోట్స్ లేవు.</p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCounselorModal(null)}
                className="flex-1 py-2.5 rounded-2xl border border-slate-300 font-bold text-xs text-slate-600 hover:bg-slate-100 transition"
              >
                ముగించు (Close)
              </button>
              <button
                type="button"
                disabled={busyId === counselorModal.tsapId || !counselorModal.newNote.trim()}
                onClick={saveCounselorNote}
                className="flex-1 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-md transition disabled:opacity-50"
              >
                {busyId === counselorModal.tsapId ? "నమోదవుతోంది..." : "💾 నోట్ నమోదు చేయి (Save Note)"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🪔 VEDIC ASTRO & KUNDALI MATCH CALCULATOR MODAL */}
      {owner && astroCheckModal?.open && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border-2 border-purple-400 space-y-4 animate-in fade-in zoom-in duration-200 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🪔</span>
                <div>
                  <h3 className="font-black text-navy text-base">సాంప్రదాయ Porutham సూచిక (Traditional Reference)</h3>
                  <p className="text-xs text-slate-500">
                    IDలతో నమోదు చేసిన నక్షత్ర వివరాలపై Porutham checks; డేటా లేనప్పుడు స్కోరు సృష్టించదు
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAstroCheckModal(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            {/* Boy & Girl ID Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-purple-50/50 p-3.5 rounded-2xl border border-purple-200">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">🤵 వరుడు (Groom) TSAP ID:</label>
                <input
                  type="text"
                  value={astroCheckModal.boyId}
                  onChange={(e) => setAstroCheckModal({ ...astroCheckModal, boyId: e.target.value.toUpperCase() })}
                  placeholder="ఇప్పటికే ఉన్న వరుడు ప్రొఫైల్ ID"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold focus:border-purple-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">👰 వధువు (Bride) TSAP ID:</label>
                <input
                  type="text"
                  value={astroCheckModal.girlId}
                  onChange={(e) => setAstroCheckModal({ ...astroCheckModal, girlId: e.target.value.toUpperCase() })}
                  placeholder="ఇప్పటికే ఉన్న వధువు ప్రొఫైల్ ID"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold focus:border-purple-600 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2 pt-1">
                <button
                  type="button"
                  disabled={astroCheckModal.loading || !astroCheckModal.boyId || !astroCheckModal.girlId}
                  onClick={() => runAstroCheck(astroCheckModal.boyId, astroCheckModal.girlId)}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-700 to-indigo-800 hover:brightness-110 text-white font-extrabold text-xs shadow-md transition disabled:opacity-50"
                >
                  {astroCheckModal.loading ? "Porutham లెక్కిస్తోంది..." : "⚡ Porutham reference లెక్కించు"}
                </button>
              </div>
            </div>

            {/* Traditional astrology reference results — missing inputs stay visibly unavailable. */}
            {astroCheckModal.result && (
              <div className="space-y-3 animate-in fade-in duration-200">
                {(() => {
                  const porutham = astroCheckModal.result.porutham;
                  const available = porutham?.available === true && porutham?.passed_checks != null;
                  return (
                    <>
                      <div className="bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-indigo-500/10 p-4 rounded-2xl border border-purple-200">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                          <div className="min-w-0 space-y-1">
                            <span className="text-[10px] font-bold uppercase text-slate-500 block">సాంప్రదాయ Porutham సూచిక · వివాహ తీర్పు కాదు</span>
                            <h4 className="text-base font-black text-[#7A0C2E]">
                              {available
                                ? `ఈ implementation లో ${porutham.passed_checks} of ${porutham.total_checks ?? 10} checks pass గా గుర్తించబడ్డాయి.`
                                : (porutham?.reason || "అవసరమైన నక్షత్ర వివరాలు లేవు; Porutham లెక్కించలేదు.")}
                            </h4>
                            <p className="text-xs text-slate-600 leading-relaxed">
                              వరుడు: <b>{astroCheckModal.result.boy?.full_name || astroCheckModal.result.boy?.tsap_id || "—"}</b>
                              {" "}({astroCheckModal.result.boy?.star || "—"} · {astroCheckModal.result.boy?.rasi || "—"})
                              {" "}↔ వధువు: <b>{astroCheckModal.result.girl?.full_name || astroCheckModal.result.girl?.tsap_id || "—"}</b>
                              {" "}({astroCheckModal.result.girl?.star || "—"} · {astroCheckModal.result.girl?.rasi || "—"})
                            </p>
                          </div>
                          {available ? (
                            <div className="sm:text-right shrink-0 rounded-xl bg-white/80 px-3 py-2 border border-purple-100">
                              <div className="text-2xl font-black text-purple-900 font-mono">
                                {porutham.passed_checks} / {porutham.total_checks ?? 10}
                              </div>
                              <div className="text-[10px] text-slate-600 font-bold">checks marked pass</div>
                            </div>
                          ) : (
                            <span className="self-start rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] font-bold text-amber-900">
                              లెక్కించలేదు
                            </span>
                          )}
                        </div>
                        <p className="mt-3 border-t border-purple-100 pt-2 text-[11px] leading-relaxed text-slate-600">
                          ఇది ప్రొఫైల్‌లో నమోదు చేసిన నక్షత్ర వివరాలపై ఆధారపడిన సాంప్రదాయ సూచిక మాత్రమే. వ్యక్తుల అనుకూలత, భవిష్యత్తు లేదా వివాహ ఫలితానికి హామీ/తీర్పు కాదు; వివరాలను సంబంధిత సభ్యులతో నిర్ధారించండి.
                        </p>
                      </div>

                      {astroCheckModal.result.same_gothram === true ? (
                        <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-950 flex items-start gap-2">
                          <span aria-hidden="true">ℹ️</span>
                          <span>ఇద్దరు ప్రొఫైళ్లలో ఇచ్చిన గోత్ర వివరాలు ఒకేలా ఉన్నాయి ({astroCheckModal.result.boy?.gothram || "—"}). ఇది సమాచార గమనిక మాత్రమే; కుటుంబ సంప్రదాయాన్ని స్వయంగా పరిశీలించండి.</span>
                        </div>
                      ) : astroCheckModal.result.same_gothram === false ? (
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 flex items-start gap-2">
                          <span aria-hidden="true">ℹ️</span>
                          <span>ప్రొఫైళ్లలో ఇచ్చిన గోత్ర వివరాలు వేర్వేరుగా ఉన్నాయి. ఇది ఇతర అనుకూలత లేదా వివాహ సిఫార్సు కాదు.</span>
                        </div>
                      ) : (
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 flex items-start gap-2">
                          <span aria-hidden="true">ℹ️</span>
                          <span>రెండు గోత్ర వివరాలు అందుబాటులో లేనందున గోత్ర పోలిక చేయలేదు.</span>
                        </div>
                      )}

                      {available && Array.isArray(porutham.items) && porutham.items.length > 0 && (
                        <div className="max-h-52 overflow-y-auto rounded-xl border border-slate-200">
                          <table className="w-full text-[11px] text-left">
                            <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0">
                              <tr>
                                <th className="p-2">Porutham అంశం</th>
                                <th className="p-2 text-center">లెక్కింపు</th>
                                <th className="p-2">సాంప్రదాయ గమనిక</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {porutham.items.map((it: any, index: number) => (
                                <tr key={it.no ?? it.name ?? index}>
                                  <td className="p-2 font-bold text-slate-800">{it.telugu || it.name || "—"}</td>
                                  <td className="p-2 text-center">
                                    {it.pass
                                      ? <span className="text-emerald-700 font-bold">✓ నియమం సరిపడింది</span>
                                      : <span className="text-slate-600">నియమం సరిపోలలేదు</span>}
                                  </td>
                                  <td className="p-2 text-slate-600 text-[10px]">{it.note || "—"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {porutham?.advice_telugu && (
                        <p className="rounded-xl bg-indigo-50 border border-indigo-100 p-3 text-xs text-indigo-900 leading-relaxed">
                          {porutham.advice_telugu}
                        </p>
                      )}
                    </>
                  );
                })()}

                {/* WhatsApp share contains the same factual report; the link is a share sheet, not support. */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between gap-2 text-xs font-bold text-slate-700">
                    <span>📲 WhatsApp లో పంచుకునే Porutham నివేదిక:</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(astroCheckModal.result.wa_report_text || "");
                        flash("✅ నివేదిక కాపీ అయ్యింది!");
                      }}
                      className="text-purple-700 hover:text-purple-800 text-[11px] font-black underline flex items-center gap-1"
                    >
                      <span>📋</span>
                      <span>కాపీ చేయి</span>
                    </button>
                  </div>
                  <textarea
                    rows={6}
                    readOnly
                    value={astroCheckModal.result.wa_report_text || ""}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-sans leading-relaxed focus:outline-none whitespace-pre-wrap select-all"
                  />
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setAstroCheckModal(null)}
                className="flex-1 py-2.5 rounded-2xl border border-slate-300 font-bold text-xs text-slate-600 hover:bg-slate-100 transition"
              >
                ముగించు (Close)
              </button>
              {astroCheckModal.result && (
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(astroCheckModal.result.wa_report_text)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md text-center transition flex items-center justify-center gap-1.5"
                >
                  <span>💬</span>
                  <span>WhatsApp లో పంపు</span>
                </a>
              )}
            </div>
          </div>
        </div>
      )}

    </main>
  );
}
