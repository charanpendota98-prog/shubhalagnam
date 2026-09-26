"use client";

/**
 * 🎛️ ADVANCED CONTROL & ADMIN DASHBOARD — Shubhalagnam Mana Vivaha
 * ====================================================================
 * • ⚡ Smart Matchmaker: Enter ANY Single ID / Phone → Instantly finds all suitable matches with Vedic Gunamelanam & unmasked phones
 * • 📇 Contacts Directory: Search & multi-select verified profiles with full contact details
 * • 📝 Dynamic Floating Notepad: Formats selected profiles as `mounika -- number` with 1-click clipboard copy
 * • 📲 WhatsApp Sharing: 
 *      - Mode A: Privacy Safe (Profiles only - No numbers)
 *      - Mode B: Direct Family Contacts (Profiles + Phone Numbers with names)
 * • 📢 Telegram Broadcast Button & Header WhatsApp Quick Launch
 * • Overview, Profile Queue, Castes, Add Profile, Ads, Vendors, Spotlight, Referrals, Reports, Revenue, Audit
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/lang";
import { BarList, Donut, Sparkline } from "./Charts";
import ChannelsConsole from "@/components/ChannelsConsole";
import WANumbersConsole from "@/components/WANumbersConsole";
import {
  CASTES,
  CASTE_TELUGU,
  TS_DISTRICTS,
  AP_DISTRICTS,
  EDUCATIONS,
  JOBS,
  NAKSHATRAS,
  RASIS,
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
  category?: string; detail?: string; status?: string; severity?: string; count?: number;
};
type SpotlightItem = {
  promo_id: string; tsap_id: string; full_name: string; gender: string; age?: number;
  caste: string; district: string; plan_code: string; amount_paid: number;
  headline: string; pitch_text: string; photo_url?: string; video_url?: string;
  media_type: string; payment_mode: string; payment_ref: string; status: string;
  submitted_at: string; moderator_notes?: string;
};
type PayoutItem = {
  id: string; tsap_id: string; name?: string; amount: number;
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

const ALL_DISTRICTS = [...TS_DISTRICTS, ...AP_DISTRICTS];

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
    | "addProfile"
    | "ads"
    | "vendors"
    | "spotlight"
    | "referrals"
    | "reports"
    | "revenue"
    | "audit"
  >("matchmaker");

  // Queues & Data
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [qStatus, setQStatus] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [spotlights, setSpotlights] = useState<SpotlightItem[]>([]);
  const [spStatus, setSpStatus] = useState<string>("all");
  const [payouts, setPayouts] = useState<PayoutItem[]>([]);
  const [pStatus, setPStatus] = useState<string>("all");
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [castesData, setCastesData] = useState<CasteHubItem[]>([]);
  const [vendorsData, setVendorsData] = useState<VendorItem[]>([]);
  const [adsData, setAdsData] = useState<AdCampaignItem[]>([]);
  const [adFilterLevel, setAdFilterLevel] = useState<string>("all");
  const [toast, setToast] = useState("");
  const [busyId, setBusyId] = useState("");
  const [err, setErr] = useState("");

  // =========================================================================
  // ⚡ 1. SMART MATCHMAKER STATE
  // =========================================================================
  const [lookupQuery, setLookupQuery] = useState("RED001");
  const [candidate, setCandidate] = useState<any>(null);
  const [matchedResults, setMatchedResults] = useState<any[]>([]);
  const [mmLoading, setMmLoading] = useState(false);
  const [mmFilters, setMmFilters] = useState({
    caste: "",
    district: "",
    state: "",
    education: "",
    job: "",
    min_score: 0,
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
  const [grantPlanCode, setGrantPlanCode] = useState<"S_99" | "S_199" | "S_299" | "S_499" | "S_999">("S_99");
  const [grantCredits, setGrantCredits] = useState<number>(5);
  const [grantPayMode, setGrantPayMode] = useState<string>("UPI_QR");
  const [grantUtr, setGrantUtr] = useState<string>("");
  const [grantNotes, setGrantNotes] = useState<string>("");
  const [grantAmount, setGrantAmount] = useState<number>(99);
  const [grantTriggerRef, setGrantTriggerRef] = useState<boolean>(true);

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
    gender: "Bride",
    age: 24,
    height: "5 ft 4 in",
    caste: "Reddy",
    sub_caste: "",
    gothram: "",
    star: "Rohini",
    rasi: "Vrishabha (Taurus)",
    education: "B.Tech",
    job: "Software Engineer",
    salary: "12 LPA",
    state: "TS",
    district: "Hyderabad",
    phone: "",
    photo_url: "",
    about_myself: "",
  });
  const [profSubmitting, setProfSubmitting] = useState(false);

  // New Ad Campaign Form State
  const [newAd, setNewAd] = useState({
    title: "",
    offer: "",
    level: "district",
    state: "TS",
    districts: ["Hyderabad"],
    category: "photography",
    image_url: "",
    link: "",
    phone: "",
    whatsapp: "",
    days: 30,
    slots: ["home_hero", "matches_sidebar", "profile_banner", "search_top"],
  });
  const [adSubmitting, setAdSubmitting] = useState(false);

  // New Vendor State
  const [newVendor, setNewVendor] = useState({
    business_name: "",
    category: "photography",
    contact_person: "",
    phone: "",
    district: "Hyderabad",
    state: "TS",
    price_starting: "₹15,000",
    experience_years: 5,
    about: "",
  });
  const [vendorSubmitting, setVendorSubmitting] = useState(false);

  const owner = me?.role === "owner";
  const gotoLogin = () => { window.location.href = "/control/login"; };

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(""), 3500);
  };

  const loadCore = useCallback(async () => {
    try {
      const u = await jget("/api/control/me");
      setMe(u);
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
      setReports(d.reports || []);
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
    const q = (targetId || lookupQuery || "RED001").trim();
    if (!q) return;
    setMmLoading(true);
    try {
      const qs = new URLSearchParams();
      if (mmFilters.caste) qs.set("caste", mmFilters.caste);
      if (mmFilters.district) qs.set("district", mmFilters.district);
      if (mmFilters.state) qs.set("state", mmFilters.state);
      if (mmFilters.education) qs.set("education", mmFilters.education);
      if (mmFilters.job) qs.set("job", mmFilters.job);
      if (mmFilters.min_score > 0) qs.set("min_score", String(mmFilters.min_score));
      if (mmFilters.age_min > 0) qs.set("age_min", String(mmFilters.age_min));
      if (mmFilters.age_max > 0) qs.set("age_max", String(mmFilters.age_max));
      if (mmFilters.salary_min > 0) qs.set("salary_min", String(mmFilters.salary_min));
      if (mmFilters.photo_only) qs.set("photo_only", "1");
      if (mmFilters.verified_only) qs.set("verified_only", "1");

      const d = await jget(`/api/control/matchmaker/${encodeURIComponent(q)}?${qs.toString()}`);
      if (d.success) {
        setCandidate(d.candidate);
        setMatchedResults(d.results || []);
        flash(`🎯 ${d.candidate?.full_name} (${d.candidate?.tsap_id}) కి ${d.count} సంబంధాలు దొరికాయి`);
      }
    } catch (e: any) {
      flash(e?.message || "సంబంధాలు వెతకడంలో సమస్య ఏర్పడింది");
    } finally {
      setMmLoading(false);
    }
  }, [lookupQuery, mmFilters]);

  // Load Directory with Advanced Dates, Payment Status, Verification & Marital Filters
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
  }, [dirSearch, dirGender, dirCaste, dirDistrict, dirStatus, dirDateRange, dirDateFrom, dirDateTo, dirPayment, dirVerified, dirPhoto, dirMarital]);

  useEffect(() => { loadCore(); }, [loadCore]);
  useEffect(() => { if (tab === "matchmaker") runMatchmaker(); }, [tab, runMatchmaker]);
  useEffect(() => { if (tab === "directory") loadDirectory(); }, [tab, loadDirectory]);
  useEffect(() => { if (tab === "queue") loadQueue(qStatus); }, [tab, qStatus, loadQueue]);
  useEffect(() => { if (tab === "reports") loadReports(); }, [tab, loadReports]);
  useEffect(() => { if (tab === "spotlight") loadSpotlights(spStatus); }, [tab, spStatus, loadSpotlights]);
  useEffect(() => { if (tab === "referrals") loadPayouts(pStatus); }, [tab, pStatus, loadPayouts]);
  useEffect(() => { if (tab === "castes") loadCastes(); }, [tab, loadCastes]);
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
      // Clean lowercase/standard: mounika -- 9848011223
      return selectedProfiles
        .map((p) => {
          const name = (p.full_name || "Profile").toLowerCase();
          const phone = p.phone || "—";
          return `${name} -- ${phone}`;
        })
        .join("\n");
    } else {
      // Detailed: Mounika (TSAP-F-1024 • 24y • Reddy • Software) -- 98480 11223
      return selectedProfiles
        .map((p, idx) => {
          const icon = p.gender === "Bride" ? "👰" : "🤵";
          return `${idx + 1}. ${icon} ${p.full_name} (${p.tsap_id} • ${p.caste || "Telugu"} • ${p.age || 24}y • ${p.job || "Professional"}) -- 📞 ${p.phone || "—"}`;
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
      header += `👤 *అభ్యర్థి:* ${candidate.full_name} (${candidate.tsap_id} • ${candidate.caste} • ${candidate.age}y)\n`;
      header += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
    }

    let body = "";
    if (includeNumbers) {
      // MODE B: Full Profiles WITH PHONE NUMBERS
      body = selectedProfiles
        .map((p, idx) => {
          const icon = p.gender === "Bride" ? "👰" : "🤵";
          let line = `${idx + 1}. ${icon} *${p.full_name}* (${p.tsap_id})\n`;
          line += `   🎂 వయస్సు: ${p.age || 24} సం. | ఎత్తు: ${p.height || "5 ft 4 in"}\n`;
          line += `   💍 కులం: ${p.caste || "తెలుగు"}${p.sub_caste ? ` (${p.sub_caste})` : ""}\n`;
          line += `   🎓 విద్య: ${p.education || "Graduate"} | 💼 ఉద్యోగం: ${p.job || "Professional"}\n`;
          line += `   📍 ప్రాంతం: ${p.district || "Hyderabad"}, ${p.state || "TS"}\n`;
          if (p.gunamelanam) line += `   🪐 వేద గుణమేళనం: ${p.gunamelanam}/10 సరిపోలిక ⭐\n`;
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
          line += `   🎂 వయస్సు: ${p.age || 24} సం. | ఎత్తు: ${p.height || "5 ft 4 in"}\n`;
          line += `   💍 కులం: ${p.caste || "తెలుగు"}${p.sub_caste ? ` (${p.sub_caste})` : ""}\n`;
          line += `   🎓 విద్య: ${p.education || "Graduate"} | 💼 ఉద్యోగం: ${p.job || "Professional"}\n`;
          line += `   📍 ప్రాంతం: ${p.district || "Hyderabad"}, ${p.state || "TS"}\n`;
          if (p.gunamelanam) line += `   🪐 వేద గుణమేళనం: ${p.gunamelanam}/10 సరిపోలిక ⭐\n`;
          line += `   🔗 ప్రొఫైల్ లింక్: https://manavivaha.in/search/${p.tsap_id}\n`;
          return line;
        })
        .join("\n");
    }

    const footer = `\n━━━━━━━━━━━━━━━━━━━━━\n🌐 మన వివాహ (Mana Vivaha) — 100% వెరిఫైడ్ తెలుగు సంబంధాలు\n👉 https://manavivaha.in`;
    const fullMsg = header + body + footer;

    const targetPhone = recipientPhone.replace(/\D/g, "");
    const waUrl = targetPhone
      ? `https://wa.me/91${targetPhone}?text=${encodeURIComponent(fullMsg)}`
      : `https://wa.me/?text=${encodeURIComponent(fullMsg)}`;

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
    const headers = ["Profile_ID", "Full_Name", "Gender", "Age", "Caste", "Sub_Caste", "Education", "Job", "District", "State", "Phone", "Plan", "Verified"];
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

  async function payoutAction(reqId: string, action: "approve" | "reject", utr?: string) {
    if (!me) return;
    setBusyId(reqId);
    try {
      const r = await fetch(`/api/control/payouts/${encodeURIComponent(reqId)}/action`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", "X-Control-CSRF": me.csrf },
        body: JSON.stringify({ action, utr: utr || `UTR-${Date.now().toString().slice(-8)}` }),
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
    setBusyId(id);
    try {
      const r = await fetch(`/api/control/profile/${encodeURIComponent(id)}/action`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", "X-Control-CSRF": me.csrf },
        body: JSON.stringify({ action }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || "fail");
      flash(d.message || L.done);
      setQueue((q) => q.filter((x) => x.tsap_id !== id));
      loadCore();
    } catch { flash(L.failed); }
    finally { setBusyId(""); }
  }

  async function upgradeProfile(
    id: string,
    plan: "S_99" | "S_199" | "S_299" | "S_499" | "S_999" = "S_99",
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

  async function spotlightAction(promoId: string, action: "approve" | "reject" | "close", days?: number) {
    if (!me) return;
    setBusyId(promoId);
    try {
      const r = await fetch(`/api/control/spotlight/${encodeURIComponent(promoId)}/action`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", "X-Control-CSRF": me.csrf },
        body: JSON.stringify({ action, days }),
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

  async function handleCreateAd(e: React.FormEvent) {
    e.preventDefault();
    if (!me) return;
    setAdSubmitting(true);
    try {
      const r = await fetch("/api/control/ads/create", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", "X-Control-CSRF": me.csrf },
        body: JSON.stringify(newAd),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || "Failed to create ad campaign");
      flash("✅ ప్రకటన ప్రచారం విజయవంతంగా సృష్టించబడింది!");
      loadAds();
      setNewAd({
        title: "", offer: "", level: "district", state: "TS",
        districts: ["Hyderabad"], category: "photography", image_url: "",
        link: "", phone: "", whatsapp: "", days: 30,
        slots: ["home_hero", "matches_sidebar", "profile_banner", "search_top"],
      });
    } catch (err: any) {
      flash(err?.message || "Error creating ad");
    } finally {
      setAdSubmitting(false);
    }
  }

  async function handleCreateVendor(e: React.FormEvent) {
    e.preventDefault();
    setVendorSubmitting(true);
    try {
      const r = await fetch("/api/vendors/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_name: newVendor.business_name,
          category: newVendor.category,
          contact_person: newVendor.contact_person,
          phone: newVendor.phone,
          district: newVendor.district,
          state: newVendor.state,
          about: newVendor.about,
          package_code: "silver",
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || "Failed to register vendor");
      flash("✅ వెండర్ విజయవంతంగా నమోదు అయ్యారు!");
      loadVendors();
      setNewVendor({
        business_name: "", category: "photography", contact_person: "",
        phone: "", district: "Hyderabad", state: "TS", price_starting: "₹15,000",
        experience_years: 5, about: "",
      });
    } catch (err: any) {
      flash(err?.message || "Error registering vendor");
    } finally {
      setVendorSubmitting(false);
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
      <main className="min-h-screen bg-cream p-8 text-center">
        <p className="text-rose-700 font-bold">{err}</p>
        <button onClick={loadCore} className="mt-4 rounded-xl maroon-gradient px-4 py-2 text-white font-bold">{L.refresh}</button>
      </main>
    );
  }

  if (!me || !an) {
    return (
      <main className="min-h-screen bg-cream p-12 text-center text-sm font-bold text-slate-500">
        {L.loading}
      </main>
    );
  }

  const t = an.totals;

  const tabs = [
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
    ...(owner ? [{ k: "revenue" as const, label: L.tabRevenue }] : []),
    ...(owner ? [{ k: "audit" as const, label: L.tabAudit }] : []),
  ];

  return (
    <main className="min-h-screen bg-[#FAF6F0] pb-44 text-slate-800">
      
      {/* =========================================================================
          TOP OPERATIONS HEADER (WITH PROMINENT WHATSAPP & TELEGRAM BUTTONS)
          ========================================================================= */}
      <header className="sticky top-0 z-30 border-b border-gold/30 bg-white/95 backdrop-blur shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 gap-3">
          
          {/* Brand & Auth Badge */}
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl maroon-gradient text-white text-xl font-black shadow-md shrink-0">
              👑
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-extrabold text-[#7A0C2E]">
                  మన వివాహ <span className="text-slate-800">అడ్మిన్ పోర్టల్</span>
                </span>
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                  owner ? "bg-amber-100 text-amber-900 border border-amber-300" : "bg-slate-100 text-slate-700"
                }`}>
                  {me.role}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                {L.signedAs} <b>{me.username}</b> • Smart Matchmaker & Multi-Channel Admin
              </p>
            </div>
          </div>

          {/* Quick Action Buttons Header (WhatsApp + Telegram + Live Site + Refresh) */}
          <div className="flex items-center gap-2 flex-wrap justify-end">
            
            {/* 💬 Quick WhatsApp Button */}
            <a
              href="https://wa.me/919876543210?text=Namaste+Admin+Operations+Support"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#25D366] px-3.5 py-2 text-xs font-extrabold text-white shadow-sm hover:brightness-105 active:scale-95 transition-all"
              title="Official WhatsApp Support & Operations"
            >
              <span>💬</span>
              <span className="hidden sm:inline">WhatsApp</span>
            </a>

            {/* 📢 Quick Telegram Button */}
            <a
              href="https://t.me/telugumatrimony1_bot"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#229ED9] px-3.5 py-2 text-xs font-extrabold text-white shadow-sm hover:brightness-105 active:scale-95 transition-all"
              title="Official Telegram Matrimony Channels & Bot"
            >
              <span>📢</span>
              <span className="hidden sm:inline">Telegram</span>
            </a>

            {/* Live Site */}
            <Link
              href="/"
              target="_blank"
              className="inline-flex items-center gap-1 rounded-xl border border-maroon/25 px-3 py-2 text-xs font-bold text-maroon hover:bg-cream transition-all"
            >
              <span>🌐</span>
              <span className="hidden md:inline">Live Site</span>
            </Link>

            {/* Refresh */}
            <button
              onClick={loadCore}
              className="rounded-xl border border-gold/40 px-3 py-2 text-xs font-bold text-maroon hover:bg-cream transition-all"
            >
              🔄
            </button>

            {/* Sign Out */}
            <button
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
        
        {/* =========================================================================
            ⚡ WORKER SHIFT & LIVE WORKSPACE ACTIVITY BAR
            ========================================================================= */}
        <div className="bg-gradient-to-r from-[#170514] via-[#2c0821] to-[#170514] text-white rounded-3xl p-4 sm:p-5 border-2 border-gold/40 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-amber-300">
                  🟢 వర్కర్ కమాండ్ డెస్క్ (Worker Command Center)
                </span>
                <span className="bg-white/10 text-white text-[10px] font-bold px-2 py-0.5 rounded-full border border-white/20">
                  {owner ? "👑 సూపర్ అడ్మిన్" : "👷 వెరిఫికేషన్ స్టాఫ్"}
                </span>
              </div>
              <p className="text-[11px] text-white/80 mt-0.5 telugu">
                లైవ్ మోడరేషన్ డ్యూటీ ఆన్ • 30,000+ ప్రొఫైల్స్ మరియు 1000 మంది వినియోగదారుల హై-స్కేలబిలిటీ వ్యవస్థ
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
            <button
              onClick={exportProfilesCsv}
              className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold px-3 py-1.5 rounded-xl shadow-xs transition flex items-center gap-1.5"
            >
              <span>📥</span>
              <span>CSV ఎగుమతి</span>
            </button>
          </div>
        </div>
        
        {/* =========================================================================
            TAB 1: ⚡ SMART MATCHMAKER (SINGLE PROFILE ID LOOKUP & SUITABLE MATCHES)
            ========================================================================= */}
        {tab === "matchmaker" && (
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
                    ఒక్క Profile ID / Phone / Name ఇవ్వండి — అభ్యర్థి పూర్తి వివరాలు & సరిపోయే అన్ని సంబంధాలు (వేద గుణమేళనం + అన్‌మాస్క్డ్ నంబర్లతో) తక్షణమే వస్తాయి.
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
                      placeholder="TSAP ID / Phone / Name..."
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

              {/* Quick Preset Candidates for Instant 1-Click Testing */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-1.5 text-xs">
                <span className="font-bold text-slate-500 text-[11px]">⚡ త్వరిత డెమో ఐడీలు:</span>
                {[
                  { id: "RED001", label: "👰 RED001 (రెడ్డి వధువు)" },
                  { id: "KAM001", label: "🤵 KAM001 (కమ్మ వరుడు)" },
                  { id: "KAP001", label: "👰 KAP001 (కాపు వధువు)" },
                  { id: "BRA001", label: "👰 BRA001 (బ్రాహ్మణ వధువు)" },
                  { id: "VYS001", label: "🤵 VYS001 (వైశ్య వరుడు)" },
                  { id: "YAD001", label: "👰 YAD001 (యాదవ వధువు)" },
                  { id: "OSC001", label: "🤵 OSC001 (SC వరుడు)" },
                ].map((chip) => (
                  <button
                    key={chip.id}
                    onClick={() => {
                      setLookupQuery(chip.id);
                      runMatchmaker(chip.id);
                    }}
                    className="px-3 py-1 rounded-xl bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-maroon font-bold text-[11px] border border-slate-200 transition-all"
                  >
                    {chip.label}
                  </button>
                ))}
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
                        <span className="absolute -bottom-2 -right-1 bg-emerald-600 text-white rounded-full p-1 shadow" title="Verified">
                          ✓
                        </span>
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-black text-[#7A0C2E]">{candidate.full_name}</span>
                        <span className="font-mono text-xs font-extrabold bg-maroon text-white px-2.5 py-0.5 rounded-full">
                          {candidate.tsap_id}
                        </span>
                        <span className="text-xs font-bold text-slate-500">
                          ({candidate.gender === "Bride" ? "వధువు" : "వరుడు"} • {candidate.age} సం.)
                        </span>
                      </div>

                      <div className="text-xs font-bold text-slate-700 flex flex-wrap gap-x-3 gap-y-1">
                        <span>💍 <b>కులం:</b> {candidate.caste} {candidate.sub_caste ? `(${candidate.sub_caste})` : ""}</span>
                        {candidate.gothram && <span>🪔 <b>గోత్రం:</b> {candidate.gothram}</span>}
                        {candidate.star && <span>⭐ <b>నక్షత్రం:</b> {candidate.star}</span>}
                        {candidate.rasi && <span>🌙 <b>రాశి:</b> {candidate.rasi}</span>}
                      </div>

                      <div className="text-xs text-slate-600 flex flex-wrap gap-x-3 gap-y-1 pt-0.5">
                        <span>🎓 <b>విద్య:</b> {candidate.education || "Graduate"}</span>
                        <span>💼 <b>ఉద్యోగం:</b> {candidate.job || "Professional"}</span>
                        <span>💰 <b>ఆదాయం:</b> {candidate.salary || "—"}</span>
                        <span>📍 <b>ప్రాంతం:</b> {candidate.district}, {candidate.state}</span>
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
                        <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase ${
                          candidate.plan === "S_499" ? "bg-emerald-100 text-emerald-800 border border-emerald-300" :
                          candidate.plan === "S_199" ? "bg-purple-100 text-purple-800 border border-purple-300" :
                          candidate.plan === "S_99" ? "bg-amber-100 text-amber-900 border border-amber-300" :
                          "bg-slate-100 text-slate-700 border border-slate-200"
                        }`}>
                          {candidate.plan === "S_499" ? "💎 VIP Elite" :
                           candidate.plan === "S_199" ? "⭐ Family" :
                           candidate.plan === "S_99" ? "⚡ Sambandham" :
                           "🆓 Free"}
                        </span>
                        <button
                          onClick={() => setUpgradeModal({ open: true, tsapId: candidate.tsap_id, name: candidate.full_name, currentPlan: candidate.plan })}
                          className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 text-white font-extrabold text-[11px] shadow-xs hover:brightness-110 active:scale-95 transition"
                          title="1-Click VIP / ప్లాన్ మార్చు"
                        >
                          👑 ప్లాన్ ఇవ్వండి
                        </button>
                      </div>

                      {candidate.phone && (
                        <>
                          <a
                            href={`https://wa.me/91${candidate.phone.replace(/\D/g, "")}`}
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
                      job: "", min_score: 0, age_min: 0, age_max: 0,
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

                {/* Education */}
                <select
                  value={mmFilters.education}
                  onChange={(e) => setMmFilters({ ...mmFilters, education: e.target.value })}
                  className="px-2.5 py-2 rounded-xl border border-slate-200 bg-slate-50 font-medium"
                >
                  <option value="">🎓 విద్య (All Education)</option>
                  {["BTech", "MS", "MBBS", "MD", "MBA", "CA", "MTech", "BSc", "BCom"].map((ed) => (
                    <option key={ed} value={ed}>{ed}</option>
                  ))}
                </select>

                {/* Job */}
                <select
                  value={mmFilters.job}
                  onChange={(e) => setMmFilters({ ...mmFilters, job: e.target.value })}
                  className="px-2.5 py-2 rounded-xl border border-slate-200 bg-slate-50 font-medium"
                >
                  <option value="">💼 ఉద్యోగం (All Professions)</option>
                  {["Software Engineer", "Doctor", "Govt Job", "Bank Manager", "Business", "Teacher"].map((j) => (
                    <option key={j} value={j}>{j}</option>
                  ))}
                </select>

                {/* Min Score */}
                <select
                  value={mmFilters.min_score}
                  onChange={(e) => setMmFilters({ ...mmFilters, min_score: parseInt(e.target.value) })}
                  className="px-2.5 py-2 rounded-xl border border-slate-200 bg-slate-50 font-medium"
                >
                  <option value={0}>⭐ స్కోర్: అన్నీ (All Scores)</option>
                  <option value={70}>70%+ బెస్ట్ మ్యాచ్</option>
                  <option value={80}>80%+ ఉత్తమ మ్యాచ్</option>
                  <option value={90}>90%+ పర్ఫెక్ట్ మ్యాచ్</option>
                </select>

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
                ✅ అన్‌మాస్క్డ్ ఫోన్ నంబర్లు & వేద గుణమేళనం అందుబాటులో ఉన్నాయి
              </span>
            </div>

            {/* Suitable Matches Cards Grid */}
            {mmLoading ? (
              <div className="grid md:grid-cols-2 gap-4">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-3xl p-5 border border-gold/20 animate-pulse h-40" />
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

                          {/* Avatar */}
                          <div className="relative shrink-0">
                            {row.photo_url ? (
                              <img
                                src={row.photo_url}
                                alt={row.full_name}
                                className="w-16 h-20 rounded-2xl object-cover border border-gold/30 shadow-sm"
                              />
                            ) : (
                              <div className="w-16 h-20 rounded-2xl bg-amber-50 border border-gold/30 flex flex-col items-center justify-center text-2xl text-maroon">
                                <span>{row.gender === "Bride" ? "👰" : "🤵"}</span>
                              </div>
                            )}
                          </div>

                          {/* Profile Details */}
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-extrabold text-sm sm:text-base text-navy truncate">
                                {row.full_name}
                              </span>
                              <span className="font-mono text-[11px] font-black text-maroon bg-amber-100 px-2 py-0.5 rounded-full shrink-0">
                                {row.score || 85}% మ్యాచ్
                              </span>
                            </div>

                            <div className="text-xs font-bold text-maroon flex flex-wrap items-center gap-1.5">
                              <span>🆔 {row.tsap_id}</span>
                              <span>•</span>
                              <span>🎂 {row.age} yrs</span>
                              <span>•</span>
                              <span>💍 {row.caste} {row.sub_caste ? `(${row.sub_caste})` : ""}</span>
                            </div>

                            <div className="text-xs text-slate-600 font-medium truncate">
                              🎓 {row.education || "Graduate"} • 💼 {row.job || "Professional"}
                            </div>

                            <div className="text-xs text-slate-500 font-medium truncate">
                              🏡 {row.district}, {row.state} {row.salary ? `• 💰 ${row.salary}` : ""}
                            </div>
                          </div>
                        </div>

                        {/* Vedic Gunamelanam & Dosha Summary */}
                        <div className="bg-amber-50/80 rounded-2xl p-2.5 border border-gold/30 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5">
                            <span>🪐</span>
                            <span className="font-extrabold text-maroon">
                              వేద గుణమేళనం: <b>{row.gunamelanam ? `${row.gunamelanam}/10` : "8/10"}</b>
                            </span>
                            <span className="text-[11px] text-emerald-700 font-bold ml-1">
                              (రజ్జు శుద్ధి ✅)
                            </span>
                          </div>
                          {row.star && (
                            <span className="text-[11px] text-slate-600 font-medium">
                              ⭐ {row.star}
                            </span>
                          )}
                        </div>

                        {/* Unmasked Contact Number Box */}
                        <div className="bg-slate-50 rounded-2xl p-2.5 border border-slate-200 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-base">📞</span>
                            <div>
                              <span className="text-[10px] text-slate-400 block font-bold uppercase">ఫోన్ నంబర్ (Full Unmasked)</span>
                              <span className="text-xs sm:text-sm font-black text-slate-800 font-mono">
                                {row.phone || "నంబర్ లేదు"}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {row.phone && (
                              <a
                                href={`https://wa.me/91${row.phone.replace(/\D/g, "")}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded-xl bg-[#25D366] text-white hover:brightness-105 shadow-xs"
                                title="Chat on WhatsApp"
                              >
                                💬
                              </a>
                            )}
                            <button
                              onClick={() => toggleSelectProfile(row)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-xs ${
                                isSelected
                                  ? "bg-maroon text-white"
                                  : "bg-white border border-gold text-maroon hover:bg-gold-soft"
                              }`}
                            >
                              {isSelected ? "✓ ఎంపికైంది" : "➕ నోట్‌ప్యాడ్"}
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
        {tab === "directory" && (
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
                  <span>🟢</span> <span>ప్రీమియం / వెరిఫైడ్</span>
                </div>
                <div className="text-2xl font-black text-emerald-950 mt-1">{dirSummary?.paid_count ?? 0}</div>
                <div className="text-[10px] text-emerald-800 font-bold mt-0.5">Paid & Verified Members</div>
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
                    {ALL_DISTRICTS.map((d) => (
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
                                    <span>✓ VERIFIED</span>
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
                                  href={`https://wa.me/91${p.phone.replace(/\D/g, "")}?text=${encodeURIComponent(
                                    isPaid
                                      ? `💐 నమస్కారం ${p.full_name} గారు!\nమన వివాహ (Mana Vivaha) హెల్ప్‌లైన్ నుండి సంప్రదిస్తున్నాం. మీ ప్రొఫైల్ (${p.tsap_id}) కి మ్యాచ్‌ల వివరాలు లేదా ఏదైనా సహాయం కావాలా?`
                                      : `💐 నమస్కారం ${p.full_name} గారు!\n\nమన వివాహ (Mana Vivaha) లో మీ ప్రొఫైల్ (${p.tsap_id}) నమోదైంది. మీకు సరిపోయే పర్ఫెక్ట్ సంబంధాల సంప్రదింపు వివరాలు (ఫోన్ నంబర్లు) నేరుగా అన్‌లాక్ చేసుకోవడానికి & Verified Badge పొందడానికి మా ప్రత్యేక ప్లాన్స్ చూడండి:\nhttps://manavivaha.in/pricing\n\nమీరు QR కోడ్ లేదా PhonePe/GPay ద్వారా చెల్లించాలనుకుంటే మాకు ఇక్కడ రిప్లై ఇవ్వగలరు.`
                                  )}`}
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

                              {/* Manual Plan Activation / Verified Badge Grant */}
                              <button
                                onClick={() => {
                                  setUpgradeModal({
                                    open: true,
                                    tsapId: p.tsap_id,
                                    name: p.full_name,
                                    phone: p.phone,
                                    district: p.district,
                                    caste: p.caste,
                                    currentPlan: p.plan,
                                  });
                                  setGrantPlanCode("S_99");
                                  setGrantCredits(5);
                                  setGrantAmount(99);
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-rose-600 text-white font-bold text-[11px] hover:brightness-110 active:scale-95 transition shadow-xs"
                                title="1-Click VIP / ప్లాన్ ఇవ్వండి & Verified Badge"
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
              {(["pending", "approved", "rejected", "all"] as const).map((s) => (
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
                      <button
                        onClick={() => profileAction(q.tsap_id, "approve")}
                        disabled={busyId === q.tsap_id}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-xs"
                      >
                        ✓ {L.approve}
                      </button>
                      <button
                        onClick={() => profileAction(q.tsap_id, "reject")}
                        disabled={busyId === q.tsap_id}
                        className="px-3 py-1.5 rounded-xl bg-rose-600 text-white font-bold text-xs shadow-xs"
                      >
                        ✕ {L.reject}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Caste Hubs Tab */}
        {tab === "castes" && (
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
        )}

        {/* Telegram & WhatsApp Channels Management */}
        {tab === "channels" && (
          <div className="bg-white rounded-3xl p-6 border border-gold/30 shadow-xs space-y-4">
            <h3 className="font-black text-lg text-[#7A0C2E] flex items-center gap-2">
              <span>📡</span>
              <span>టెలిగ్రామ్ & వాట్సాప్ ఛానెల్స్ మేనేజ్‌మెంట్ (Telegram & WhatsApp Channels Hub)</span>
            </h3>
            <ChannelsConsole />
          </div>
        )}

        {/* WhatsApp & Phone Numbers Management */}
        {tab === "numbers" && (
          <div className="bg-white rounded-3xl p-6 border border-gold/30 shadow-xs space-y-4">
            <h3 className="font-black text-lg text-[#7A0C2E] flex items-center gap-2">
              <span>📱</span>
              <span>అఫీషియల్ వాట్సాప్ & ఫోన్ నంబర్లు (WhatsApp Senders & Support Numbers)</span>
            </h3>
            <WANumbersConsole />
          </div>
        )}

        {/* Add Profile Form Tab */}
        {tab === "addProfile" && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gold/30 max-w-2xl mx-auto shadow-sm">
            <h2 className="text-lg font-black text-[#7A0C2E] mb-4">➕ ప్రొఫైల్ చేర్చండి (Admin Instant Add)</h2>
            <form onSubmit={handleCreateProfile} className="space-y-4 text-xs font-bold">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1">పూర్తి పేరు (Full Name) *</label>
                  <input
                    required
                    value={newProf.full_name}
                    onChange={(e) => setNewProf({ ...newProf, full_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-medium text-sm"
                    placeholder="e.g. Mounika Reddy"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1">లింగం (Gender) *</label>
                  <select
                    value={newProf.gender}
                    onChange={(e) => setNewProf({ ...newProf, gender: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                  >
                    <option value="Bride">👰 వధువు (Bride)</option>
                    <option value="Groom">🤵 వరుడు (Groom)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1">వయస్సు (Age)</label>
                  <input
                    type="number"
                    value={newProf.age}
                    onChange={(e) => setNewProf({ ...newProf, age: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1">కులం (Caste)</label>
                  <select
                    value={newProf.caste}
                    onChange={(e) => setNewProf({ ...newProf, caste: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                  >
                    {CASTES.map((c) => (
                      <option key={c} value={c}>{CASTE_TELUGU[c] || c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 mb-1">జిల్లా (District)</label>
                  <select
                    value={newProf.district}
                    onChange={(e) => setNewProf({ ...newProf, district: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                  >
                    {ALL_DISTRICTS.map((d) => (
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
                  placeholder="9848012345"
                />
              </div>

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
        {tab === "ads" && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex gap-2 text-xs font-bold">
                {(["all", "district", "state"] as const).map((l) => (
                  <button
                    key={l}
                    onClick={() => setAdFilterLevel(l)}
                    className={`px-3 py-1.5 rounded-full capitalize ${
                      adFilterLevel === l ? "maroon-gradient text-white" : "bg-white border text-slate-700"
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {adsData.map((ad) => (
                <div key={ad.id} className="bg-white rounded-3xl p-4 border border-gold/30 shadow-xs flex gap-3">
                  {ad.image_url && (
                    <img src={ad.image_url} alt={ad.title} className="w-24 h-24 rounded-2xl object-cover border shrink-0" />
                  )}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-sm text-navy truncate">{ad.title}</span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                        {ad.status}
                      </span>
                    </div>
                    <p className="text-xs text-maroon font-bold truncate">{ad.offer}</p>
                    <p className="text-[11px] text-slate-500">📍 {ad.level}: {ad.districts?.join(", ") || ad.state || "All"}</p>
                    <div className="text-[10px] text-slate-400 font-mono">
                      👁️ {ad.impressions} Views • 👆 {ad.clicks} Clicks • 🎯 {ad.leads} Leads
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Vendors Tab */}
        {tab === "vendors" && (
          <div className="grid md:grid-cols-3 gap-4">
            {vendorsData.map((v) => (
              <div key={v.id || v.vendor_id} className="bg-white rounded-2xl p-4 border border-gold/30 shadow-xs space-y-2">
                <div className="font-extrabold text-sm text-navy">{v.business_name || v.name}</div>
                <div className="text-xs text-maroon font-bold">📂 {v.category_name || v.category}</div>
                <div className="text-xs text-slate-600">🏡 {v.district}, {v.state}</div>
                <div className="text-xs font-mono text-emerald-800 font-bold">📞 {v.phone || v.phone_masked || "—"}</div>
              </div>
            ))}
          </div>
        )}

        {/* Spotlight Tab */}
        {tab === "spotlight" && (
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              {spotlights.map((sp) => (
                <div key={sp.promo_id} className="bg-white rounded-3xl p-5 border border-gold/30 shadow-xs space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-black text-base text-navy">{sp.full_name} ({sp.tsap_id})</div>
                      <div className="text-xs text-slate-500">{sp.caste} • {sp.district} • {sp.plan_code} (₹{sp.amount_paid})</div>
                    </div>
                    <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-amber-100 text-maroon border border-amber-300">
                      {sp.status}
                    </span>
                  </div>
                  <p className="text-xs italic bg-slate-50 p-2.5 rounded-xl text-slate-700">&ldquo;{sp.pitch_text}&rdquo;</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => spotlightAction(sp.promo_id, "approve")}
                      className="px-4 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-xs"
                    >
                      ✓ Approve
                    </button>
                    <button
                      onClick={() => spotlightAction(sp.promo_id, "reject")}
                      className="px-4 py-1.5 rounded-xl bg-rose-600 text-white font-bold text-xs shadow-xs"
                    >
                      ✕ Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 10: 🤝 REFERRALS & INSTANT UPI PAYOUTS CONSOLE
            ========================================================================= */}
        {tab === "referrals" && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gold/30 shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-[#7A0C2E] flex items-center gap-2">
                    <span>🤝</span>
                    <span>రెఫరల్ భాగస్వాములు & తక్షణ UPI చెల్లింపులు (Payouts Desk)</span>
                  </h2>
                  <p className="text-xs text-slate-600 mt-1">
                    యూజర్లు మరియు వివాహ బ్యూరోల విత్‌డ్రా అభ్యర్థనలు • PhonePe/GPay ద్వారా 1-ట్యాప్ చెల్లింపు & ఆటోమేటిక్ వాట్సాప్ రశీదు.
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
                    const directUpiLink = po.upi_id
                      ? `upi://pay?pa=${encodeURIComponent(po.upi_id)}&pn=${encodeURIComponent(po.name || "ManaVivahaPartner")}&am=${po.amount}&cu=INR&tn=${encodeURIComponent(`ManaVivaha_Payout_${po.id}`)}`
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
                                  const customUtr = prompt("UPI యాప్ నుండి 12-అంకెల UTR నంబర్ ఎంటర్ చేయండి (లేదా నేరుగా Confirm చేయడానికి OK నొక్కండి):", `UTR${Date.now().toString().slice(-8)}`);
                                  if (customUtr !== null) {
                                    payoutAction(po.id, "approve", customUtr.trim());
                                  }
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
                                  const reason = prompt("రిజెక్ట్ చేయడానికి గల కారణం రాయండి (యూజర్ వాలెట్‌కు డబ్బు తిరిగి వెళ్తుంది):", "తప్పుడు UPI ID");
                                  if (reason) payoutAction(po.id, "reject", undefined);
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
                        {isPaid && (
                          <div className="pt-1">
                            <a
                              href={`https://wa.me/91${(po.tsap_id ? directoryProfiles.find((x) => x.tsap_id === po.tsap_id)?.phone : "") || ""}?text=${encodeURIComponent(
                                `🎉 శుభవార్త ${po.name} గారు!\n\nమన వివాహ రెఫరల్ ప్రోగ్రామ్ ద్వారా మీరు సంపాదించిన ₹${po.amount} మీ UPI ఖాతాకు (${po.upi_id || "Bank"}) విజయవంతంగా బదిలీ చేయబడింది! ✅\n\nUTR: ${po.utr || "CONFIRMED"}\n\nమరింత మంది బంధువులు & మిత్రులను ఆహ్వానించి ప్రతి రిఫరల్‌పై ₹50 నగదు సంపాదించండి:\nhttps://manavivaha.in/referral`
                              )}`}
                              target="_blank"
                              rel="noreferrer"
                              className="w-full py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-extrabold text-xs flex items-center justify-center gap-1.5 transition"
                            >
                              <span>💬</span>
                              <span>యూజర్‌కి వాట్సాప్ పేమెంట్ రశీదు పంపండి</span>
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
            {reports.map((r) => (
              <div key={r.report_id || r.id} className="bg-white rounded-2xl p-4 border border-gold/30 shadow-xs flex items-center justify-between">
                <div>
                  <div className="font-black text-sm text-rose-700">🚩 {r.category}</div>
                  <div className="text-xs text-slate-600">{r.detail} (Target: {r.target_id})</div>
                </div>
                <span className="text-xs font-bold text-slate-400">{r.status}</span>
              </div>
            ))}
          </div>
        )}

        {/* Revenue Tab (Owner only) */}
        {tab === "revenue" && owner && an.revenue && (
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
      {selectedProfiles.length > 0 && (
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
                  placeholder="వాట్సాప్ నంబర్: 98480..."
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
                    placeholder="ఉదా: ఈ సంబంధాలు మీ అమ్మాయి ప్రొఫైల్‌కు 90% గుణమేళనంతో మ్యాచ్ అయ్యాయి..."
                    className="w-full p-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 focus:border-maroon focus:outline-none"
                  />
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* 👑 VIP & 1-CLICK PLAN GRANT & MANUAL VERIFICATION MODAL */}
      {upgradeModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border-2 border-amber-400 space-y-4 animate-in fade-in zoom-in duration-200 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">👑</span>
                <div>
                  <h3 className="font-black text-navy text-base">ప్లాన్ యాక్టివేట్ & Verified Badge ఇవ్వండి</h3>
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
                యూజర్ వాట్సాప్ క్యూఆర్ (QR), PhonePe/GPay ద్వారా లేదా నేరుగా నగదు చెల్లించినప్పుడు, ఇక్కడ ప్లాన్ ఎంచుకుని <b>Verified Member</b> గా మార్చవచ్చు.
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
                    <div className="font-black text-xs text-amber-900">🥉 స్వాగతం (Silver)</div>
                    <span className="font-mono font-black text-xs text-amber-950">₹99</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">5 క్రెడిట్స్ • 30 రోజులు • WhatsApp సపోర్ట్</div>
                </button>

                {/* S_199 */}
                <button
                  type="button"
                  onClick={() => { setGrantPlanCode("S_199"); setGrantCredits(15); setGrantAmount(199); }}
                  className={`p-3 rounded-2xl border text-left transition ${
                    grantPlanCode === "S_199" ? "bg-purple-50 border-purple-500 ring-2 ring-purple-400/50" : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-black text-xs text-purple-900">🥈 శుభారంభం (Gold)</div>
                    <span className="font-mono font-black text-xs text-purple-950">₹199</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">15 క్రెడిట్స్ • 60 రోజులు • జాతక పొంతన</div>
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
                    <div className="font-black text-xs text-blue-900">🥇 కళ్యాణం (Platinum)</div>
                    <span className="font-mono font-black text-xs text-blue-950">₹299</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">25 క్రెడిట్స్ • 90 రోజులు • ప్రయారిటీ ర్యాంకింగ్</div>
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
                    <div className="font-black text-xs text-emerald-900">💎 కళ్యాణ వైభోగం</div>
                    <span className="font-mono font-black text-xs text-emerald-950">₹499</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">50 క్రెడిట్స్ • 180 రోజులు • VIP బ్యాడ్జ్</div>
                </button>
              </div>

              {/* S_999 Full Width */}
              <button
                type="button"
                onClick={() => { setGrantPlanCode("S_999"); setGrantCredits(100); setGrantAmount(999); }}
                className={`w-full p-3 rounded-2xl border text-left transition flex items-center justify-between ${
                  grantPlanCode === "S_999" ? "bg-rose-50 border-rose-500 ring-2 ring-rose-400/50" : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <div>
                  <div className="font-black text-xs text-rose-900">👑 మంగళసూత్రం (Royal VIP Assistance)</div>
                  <div className="text-[10px] text-slate-500">100 క్రెడిట్స్ • 365 రోజులు • పర్సనల్ మ్యాచ్‌మేకింగ్ & అసిస్టెన్స్</div>
                </div>
                <span className="font-mono font-black text-sm text-rose-950">₹999</span>
              </button>
            </div>

            {/* Payment Mode Selector */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-bold text-slate-700 block">2. పేమెంట్ విధానం (Payment Source):</label>
              <select
                value={grantPayMode}
                onChange={(e) => setGrantPayMode(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold focus:border-maroon focus:outline-none"
              >
                <option value="UPI_QR">📱 WhatsApp QR / Direct UPI (6304996088)</option>
                <option value="PHONEPE">🟣 PhonePe Transfer</option>
                <option value="GPAY">🔵 Google Pay</option>
                <option value="BANK_TRANSFER">🏦 Direct Bank Transfer / NetBanking</option>
                <option value="CASH">💵 Cash / Offline Office Payment</option>
                <option value="ADMIN_COMPLIMENTARY">🎁 Admin Complimentary (ఉచిత ప్రోత్సాహం)</option>
              </select>
            </div>

            {/* UTR & Notes */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-0.5">UTR / లావాదేవీ నంబర్ (Optional):</label>
                <input
                  type="text"
                  value={grantUtr}
                  onChange={(e) => setGrantUtr(e.target.value)}
                  placeholder="ఉదా: 425619283741"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-mono focus:border-maroon focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-0.5">క్రెడిట్స్ (Credits to grant):</label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={grantCredits}
                  onChange={(e) => setGrantCredits(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-center font-bold text-xs focus:border-maroon focus:outline-none"
                />
              </div>
            </div>

            {/* Referral trigger */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="triggerRef"
                checked={grantTriggerRef}
                onChange={(e) => setGrantTriggerRef(e.target.checked)}
                className="w-4 h-4 rounded accent-[#7A0C2E] cursor-pointer"
              />
              <label htmlFor="triggerRef" className="text-xs font-medium text-slate-700 cursor-pointer">
                రిఫరల్ కమీషన్ విడుదల చేయి (Trigger ₹50 referral credit to referrer)
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
                disabled={busyId === upgradeModal.tsapId}
                onClick={() => upgradeProfile(
                  upgradeModal.tsapId,
                  grantPlanCode,
                  grantCredits,
                  grantTriggerRef,
                  grantPayMode,
                  grantUtr,
                  grantNotes,
                  grantAmount
                )}
                className="flex-1 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-amber-600 to-rose-600 text-white font-extrabold text-xs shadow-md hover:brightness-110 active:scale-98 transition disabled:opacity-50"
              >
                {busyId === upgradeModal.tsapId ? "యాక్టివేట్ అవుతోంది..." : `✓ ప్లాన్ యాక్టివేట్ & Verify చేయి`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🎉 ACTIVATION SUCCESS & WHATSAPP CONFIRMATION DIALOG */}
      {activatedSuccessModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border-2 border-emerald-500 space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="text-center space-y-1">
              <span className="text-4xl inline-block animate-bounce">🎉</span>
              <h3 className="font-black text-navy text-lg">ప్లాన్ విజయవంతంగా యాక్టివేట్ అయ్యింది!</h3>
              <p className="text-xs text-slate-600">
                <b>{activatedSuccessModal.name}</b> ({activatedSuccessModal.tsapId}) కి <b>{activatedSuccessModal.plan}</b> ప్లాన్ & Verified Badge మంజూరైంది.
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
                  href={`https://wa.me/91${activatedSuccessModal.phone.replace(/\D/g, "")}?text=${encodeURIComponent(activatedSuccessModal.waMessage)}`}
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

    </main>
  );
}
