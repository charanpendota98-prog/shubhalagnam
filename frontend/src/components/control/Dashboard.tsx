"use client";

/**
 * 🎛️ ADVANCED CONTROL & ADMIN DASHBOARD — Shubhalagnam Mana Vivaha
 * ====================================================================
 * • ⚡ Matchmaker: Apply explicit filters and compare member-entered facts; no compatibility verdict is calculated
 * • 📇 Contacts Directory: Search profiles; contact details follow owner consent and privacy settings
 * • 📝 Dynamic Floating Notepad: Formats only selected, permission-appropriate profile details
 * • 📲 WhatsApp Sharing: 
 *      - Mode A: Privacy Safe (Profiles only - No numbers)
 *      - Mode B: Direct Family Contacts (Profiles + Phone Numbers with names)
 * • 📢 Telegram Broadcast Button & Header WhatsApp Quick Launch
 * • Overview, Profile Queue, Castes, Add Profile, Ads, Vendors, Spotlight, Referrals, Reports, Revenue, Audit
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useLang } from "@/lib/lang";
import { apiDisplayMessage, readApiJson} from "@/lib/api";
import { SITE_CONFIG } from "@/lib/site-config";
import { whatsappPhoneLink, whatsappShareLink } from "@/lib/wa";
import { BarList, Donut, Sparkline } from "./Charts";
import OpsInsights from "./OpsInsights";
import ChannelCoverage from "./ChannelCoverage";
import ChannelsConsole from "@/components/ChannelsConsole";
import WANumbersConsole from "@/components/WANumbersConsole";
import ReferralReport from "@/components/ReferralReport";
import DataTools from "@/components/DataTools";
import DailyMatches from "@/components/DailyMatches";
import AdsConsole from "@/components/AdsConsole";
import AstroConsole from "@/components/AstroConsole";
import ContentConsole from "@/components/ContentConsole";
import OffersConsole from "@/components/OffersConsole";
import PayConsole from "@/components/PayConsole";
import MatchSend from "@/components/MatchSend";
import Showcase from "@/components/Showcase";
import {
  ModerationQueue,
  StoriesQueue,
  LeadsPanel,
  PublishPanel,
  PersonalizedDigestPanel,
} from "@/components/AdminOps";
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

type RecordedCheckBadge = { icon: string; label: string; title: string };
function recordedCheckBadge(profile: any, telugu: boolean): RecordedCheckBadge | null {
  const raw = String(profile?.verification_level || profile?.verification || "").toLowerCase();
  const level = ["phone", "photo", "id"].includes(raw)
    ? raw
    : profile?.id_verified ? "id" : profile?.photo_verified ? "photo" : profile?.phone_verified ? "phone" : "";
  if (level === "phone") return {
    icon: "📱", label: telugu ? "ఫోన్ OTP" : "Phone OTP",
    title: telugu ? "OTP ఈ phone number వినియోగాన్ని మాత్రమే నిర్ధారిస్తుంది." : "OTP confirms access to this phone number only.",
  };
  if (level === "photo") return {
    icon: "📷", label: telugu ? "ఫోటో review" : "Photo review",
    title: telugu ? "సమర్పించిన ఫోటోపై review మాత్రమే; identity లేదా liveness check కాదు." : "Review of the submitted photo only; not an identity or liveness check.",
  };
  if (level === "id") return {
    icon: "🪪", label: telugu ? "ప్రభుత్వ ID review" : "Government ID review",
    title: telugu ? "ప్రభుత్వ ID review status మాత్రమే; ఇతర profile వివరాలు నిర్ధారించబడవు." : "Government ID review status only; other profile details are not verified.",
  };
  return null;
}
type Totals = {
  profiles: number; pending: number; approved: number; rejected: number;
  with_photo: number; recorded_checks: number; males: number; females: number;
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
  category?: string; category_telugu?: string; category_en?: string; detail?: string; detail_en?: string; status?: string;
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
/** Member story in the moderation queue (admin payload: identifiers included). */
type StoryItem = {
  story_id: string; tsap_id?: string; couple_names?: string; text?: string;
  photo_url?: string; district?: string; status: string; likes?: number;
  created_at?: string; reviewed_at?: string; review_note?: string;
};
type PayoutItem = {
  id: string; tsap_id: string; partner_id?: string; name?: string; amount: number;
  method: string; upi_id?: string; account?: string; ifsc?: string;
  status: string; requested_at: string; utr?: string;
};
type CasteHubItem = {
  key: string; en: string; te: string; category: string; members: string[];
  split: boolean; males: number; females: number; total: number; routing_eligible?: boolean;
  channel_bride?: string; channel_groom?: string;
};
type VendorItem = {
  id?: string; vendor_id?: string; name?: string; business_name?: string;
  category: string; category_name?: string; phone_masked?: string;
  phone?: string; district: string; state?: string;
  package?: string; package_name?: string; package_price?: number; package_days?: number;
  status?: string; payment_ref?: string; created_at?: string; expires_at?: string;
  listing_details_reviewed?: boolean;
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
    tabSpotlight: "🌟 స్పాట్‌లైట్ / Profiles of Day", tabStories: "💑 సభ్యుల కథలు",
    tabReferrals: "🤝 రెఫరల్స్ & పేఅవుట్స్", tabReports: "🚩 రిపోర్ట్‌లు",
    tabRevenue: "💰 రాబడి", tabAudit: "📝 ఆడిట్ లాగ్",
    tabChannels: "📡 టెలిగ్రామ్ & వాట్సాప్ ఛానెల్స్", tabNumbers: "📱 వాట్సాప్ & ఫోన్ నంబర్లు",
    photoQueue: "📸 ఫోటో సమీక్ష", profilesTot: "మొత్తం ప్రొఫైళ్లు", pendingTot: "పరిశీలనలో ఉన్నవి", approvedTot: "ఆమోదించినవి",
    recordedChecksTot: "ఫోన్ OTP / ఫోటో / ID సమీక్ష", withPhotoTot: "ఫోటో ఉన్నవి", malesTot: "పురుషులు (వరులు)",
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
    tabSpotlight: "🌟 Spotlight / Profiles of Day", tabStories: "💑 Member Stories",
    tabReferrals: "🤝 Referrals & Payouts", tabReports: "🚩 Reports",
    tabRevenue: "💰 Revenue", tabAudit: "📝 Audit Log",
    tabChannels: "📡 Channels (TG/WA)", tabNumbers: "📱 WhatsApp & Phone Numbers",
    photoQueue: "📸 Photo review", profilesTot: "Total Profiles", pendingTot: "Pending Approval", approvedTot: "Approved",
    recordedChecksTot: "Recorded phone, photo or government ID checks", withPhotoTot: "With Photo", malesTot: "Grooms",
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
  return readApiJson(r);
}

export default function Dashboard() {
  const router = useRouter();
  const { lang } = useLang();
  const te = lang === "te";
  const L = T[(lang as "te" | "en") in T ? (lang as "te" | "en") : "te"];
  const tr = <T,>(telugu: T, english: T): T => (te ? telugu : english);
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
    | "tools"
    | "consoles"
    | "ads"
    | "vendors"
    | "spotlight"
    | "stories"
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
  const [storyQueue, setStoryQueue] = useState<StoryItem[]>([]);
  const [storyStatus, setStoryStatus] = useState<string>("pending");
  const [storyNotes, setStoryNotes] = useState<Record<string, string>>({});
  const [spPaymentNotes, setSpPaymentNotes] = useState<Record<string, string>>({});
  const [spMediaNotes, setSpMediaNotes] = useState<Record<string, string>>({});
  const [payouts, setPayouts] = useState<PayoutItem[]>([]);
  const [pStatus, setPStatus] = useState<string>("all");
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [castesData, setCastesData] = useState<CasteHubItem[]>([]);
  const [vendorsData, setVendorsData] = useState<VendorItem[]>([]);
  const [vendorStatus, setVendorStatus] = useState("pending");
  const [vendorRevenue, setVendorRevenue] = useState<{ active?: number; pending?: number; collected?: number; pipeline?: number } | null>(null);
  const [vendorUtrById, setVendorUtrById] = useState<Record<string, string>>({});
  const [vendorReasonById, setVendorReasonById] = useState<Record<string, string>>({});
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
  const [dirCheckStatus, setDirCheckStatus] = useState("all");
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

  // 🪐 Jathakam evidence-review modal state; it never calculates astrology.
  const [showJathakamReview, setShowJathakamReview] = useState(false);

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
  const gotoLogin = useCallback(() => router.push("/control/login"), [router]);
  const resetGrantForm = () => {
    setGrantPlanCode("");
    setGrantCredits(0);
    setGrantPayMode("");
    setGrantUtr("");
    setGrantNotes("");
    setGrantAmount(0);
    setGrantTriggerRef(false);
  };

  const flash = useCallback((message: string) => {
    const displayMessage = te
      ? message
      : apiDisplayMessage(message, false, "The server response is not available in English. Check the updated status.");
    setToast(displayMessage);
    setTimeout(() => setToast(""), 3500);
  }, [te]);

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
      else setErr(te
        ? (e?.message || "కంట్రోల్ డేటా లోడ్ కాలేదు")
        : apiDisplayMessage(e?.message || "", false, "Unable to load control data. Please try again."));
    }
  }, [gotoLogin, te]);

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

  const loadStories = useCallback(async (st: string) => {
    try {
      const d = await jget(`/api/control/stories?status=${st}`);
      setStoryQueue(d.stories || []);
    } catch { setStoryQueue([]); }
  }, []);

  const storyAction = async (story: StoryItem, action: "approve" | "reject") => {
    if (!me) return;
    const note = (storyNotes[story.story_id] || "").trim();
    if (action === "reject" && !note) {
      flash(te ? "తిరస్కరణకు ఒక కారణం రాయండి." : "Write a reason before rejecting a story.");
      return;
    }
    if (action === "approve" && !window.confirm(
      te ? "ఈ కథను ప్రచురించాలని నిర్ధారించండి. ఇది గుర్తింపు లేదా సంబంధ ధృవీకరణ కాదు."
         : "Confirm publishing this story. This is not identity or relationship verification.",
    )) return;
    setBusyId(story.story_id);
    try {
      const r = await fetch(`/api/control/stories/${encodeURIComponent(story.story_id)}/action`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", "X-Control-CSRF": me.csrf },
        body: JSON.stringify({ action, note }),
      });
      const d = await readApiJson(r);
      if (!r.ok) throw new Error(d.detail || "fail");
      flash(d.message || L.done);
      setStoryNotes((current) => ({ ...current, [story.story_id]: "" }));
      loadStories(storyStatus);
    } catch (e: any) { flash(e?.message || L.failed); }
    finally { setBusyId(""); }
  };

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
      const [queue, revenue] = await Promise.all([
        jget(`/api/control/vendors?status=${encodeURIComponent(vendorStatus)}`),
        jget("/api/control/vendors/revenue"),
      ]);
      setVendorsData(queue.items || []);
      setVendorRevenue(revenue);
    } catch {
      setVendorsData([]);
      setVendorRevenue(null);
    }
  }, [vendorStatus]);

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
        flash(te
          ? `ℹ️ ${d.candidate?.full_name} (${d.candidate?.tsap_id}) కోసం ${d.count} ప్రొఫైళ్లు — ఫిల్టర్‌లు వర్తింపజేశాం; సరిపోలిక స్కోర్ లెక్కించలేదు.`
          : `ℹ️ ${d.count} profiles found for ${d.candidate?.full_name} (${d.candidate?.tsap_id}). Filters applied; no compatibility score was calculated.`);
      }
    } catch (e: any) {
      flash(te ? (e?.message || "సంబంధాలను వెతకడంలో సమస్య ఏర్పడింది") : apiDisplayMessage(e?.message || "", false, "Could not search profiles. Please try again."));
    } finally {
      setMmLoading(false);
    }
  }, [lookupQuery, mmFilters, flash, te]);

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
      if (dirCheckStatus) qs.set("verification_status", dirCheckStatus);
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
  }, [dirSearch, dirGender, dirCaste, dirDistrict, dirStatus, dirDateRange, dirDateFrom, dirDateTo, dirPayment, dirCheckStatus, dirPhoto, dirMarital, dirProfession]);

  // 💌 Dynamic WhatsApp Proposal Text Generator
  const buildProposalText = (
    cand: any,
    matches: any[],
    tmpl: "parents" | "direct" | "vip",
    note: string
  ) => {
    if (!cand) return "";
    const genderLabel = cand.gender === "Bride"
      ? (te ? "వధువు" : "bride")
      : cand.gender === "Groom" ? (te ? "వరుడు" : "groom") : (te ? "ప్రొఫైల్" : "profile");
    const candidateName = cand.full_name || cand.tsap_id || (te ? "ప్రొఫైల్" : "profile");
    const candidateDetails = [cand.tsap_id, cand.caste, cand.district]
      .filter((value) => String(value || "").trim())
      .join(" • ");

    let header = "";
    if (tmpl === "parents") {
      header = te
        ? `🙏 *నమస్కారం అండి!*\n\n*మన వివాహ (Mana Vivaha)* నుండి ${genderLabel} *${candidateName}*${candidateDetails ? ` (${candidateDetails})` : ""} కోసం అందుబాటులో ఉన్న ప్రొఫైల్ సూచనలను పంచుకుంటున్నాం. వివరాలు సభ్యులు అందించినవి; దయచేసి స్వతంత్రంగా నిర్ధారించండి:`
        : `🙏 *Hello!*\n\nWe are sharing profile suggestions available through *Mana Vivaha* for ${genderLabel} *${candidateName}*${candidateDetails ? ` (${candidateDetails})` : ""}. Details are member-submitted; please verify them independently:`;
    } else if (tmpl === "vip") {
      header = te
        ? `👑 *ప్రొఫైల్ సూచనలు*\n\n*మన వివాహ (Mana Vivaha)* లోని *${candidateName}*${candidateDetails ? ` (${candidateDetails})` : ""} కోసం ఎంపిక చేసిన ప్రొఫైల్ వివరాలు:`
        : `👑 *Profile suggestions*\n\nSelected profile details for *${candidateName}*${candidateDetails ? ` (${candidateDetails})` : ""} on *Mana Vivaha*:`;
    } else {
      header = te
        ? `💐 *నమస్కారం ${candidateName} గారు!*\n\nమీ ప్రొఫైల్ ప్రాధాన్యతలకు సరిపోలవచ్చని చూపబడిన కొన్ని ప్రొఫైల్ వివరాలు ఇవి. సరిపోలిక హామీ కాదు; సభ్యులు అందించిన వివరాలను స్వతంత్రంగా నిర్ధారించండి:`
        : `💐 *Hello ${candidateName},*\n\nHere are a few profiles that may fit your stated preferences. This is not a match guarantee; please verify member-submitted details independently:`;
    }

    let matchLines = "";
    if (matches && matches.length > 0) {
      matchLines = matches
        .map((m, idx) => {
          const mName = m.full_name || m.name || m.tsap_id || (te ? "ప్రొఫైల్" : "Profile");
          const details = [
            m.age != null && String(m.age).trim() ? `${m.age} ${te ? "సం." : "years"}` : "",
            m.height || "",
            m.caste ? `${m.caste}${m.sub_caste ? ` (${m.sub_caste})` : ""}` : "",
            m.education || "",
            m.job || "",
            m.salary || "",
            m.district || "",
          ].filter((value) => String(value || "").trim());
          const bio = m.tsap_id
            ? `\n   🎴 ${te ? "ప్రొఫైల్ వివరాలు" : "Profile"}: https://manavivaha.in/search/${encodeURIComponent(String(m.tsap_id))}` : "";
          return `\n*${idx + 1}. ${mName}${m.tsap_id && mName !== m.tsap_id ? ` (${m.tsap_id})` : ""}*${details.length ? `\n   📌 ${details.join(" • ")}` : ""}${bio}`;
        })
        .join("\n");
    } else {
      matchLines = te ? "\n(ప్రొఫైల్ వివరాలు జతచేయలేదు)" : "\n(No profile details were attached.)";
    }

    const notePart = note ? `\n\n📝 *${te ? "గమనిక" : "Note"}:* ${note}` : "";
    const footer = te
      ? `\n\n🌐 manavivaha.in — సభ్యులు అందించిన వివరాలను, గుర్తింపును మరియు సంప్రదింపు సమాచారాన్ని స్వతంత్రంగా నిర్ధారించండి.\n\n_మన వివాహ • తెలుగు వివాహ పరిచయ వేదిక_`
      : `\n\n🌐 manavivaha.in — Profiles and contact details are member-submitted. Please verify all information independently.\n\n_Mana Vivaha • Telugu Matrimony_`;

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
      const d = await readApiJson(r);
      if (!r.ok) throw new Error(d.detail || "Failed to save note");
      flash(tr("✅ కౌన్సిలర్ గమనిక సేవ్ అయింది.", "✅ Counsellor note saved."));
      setCounselorModal((prev: any) => prev ? {
        ...prev,
        notes: d.notes || [...prev.notes, d.entry],
        currentStage: counselorModal.newStage,
        newNote: "",
      } : null);
      loadDirectory();
    } catch (e: any) {
      flash(te ? (e?.message || "గమనికను సేవ్ చేయడంలో సమస్య ఏర్పడింది") : apiDisplayMessage(e?.message || "", false, "Could not save the note. Please try again."));
    } finally {
      setBusyId("");
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
      .then((r) => { if (!r.ok) throw new Error("Community list unavailable"); return readApiJson(r); })
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
  useEffect(() => { if (tab === "stories") loadStories(storyStatus); }, [tab, storyStatus, loadStories]);
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
    flash(te ? "📋 నోట్‌ప్యాడ్ కాపీ అయింది!" : "📋 Notepad copied to clipboard.");
  };

  // WhatsApp share text follows the selected language; profile values stay member-entered.
  const shareWhatsApp = (includeNumbers: boolean) => {
    if (selectedProfiles.length === 0) {
      flash(tr("⚠️ కనీసం ఒక ప్రొఫైల్‌ను ఎంచుకోండి.", "⚠️ Select at least one profile."));
      return;
    }

    let header = tr("💍 *మన వివాహ (Mana Vivaha) — సంబంధాల వివరాలు*\n\n", "💍 *Mana Vivaha — Profile suggestions*\n\n");
    if (candidate) {
      const candidateDetails = [candidate.tsap_id, candidate.caste, candidate.age ? `${candidate.age}y` : ""].filter(Boolean).join(" • ");
      header += `${tr("👤 *అభ్యర్థి:*", "👤 *Candidate:")} ${candidate.full_name} (${candidateDetails})\n`;
      header += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
    }

    const body = selectedProfiles
      .map((p, idx) => {
        const icon = p.gender === "Bride" ? "👰" : "🤵";
        let line = `${idx + 1}. ${icon} *${p.full_name}* (${p.tsap_id})\n`;
        const ageHeight = [
          p.age ? `${tr("వయస్సు", "Age")}: ${p.age} ${tr("సం.", "years")}` : "",
          p.height ? `${tr("ఎత్తు", "Height")}: ${p.height}` : "",
        ].filter(Boolean).join(" | ");
        if (ageHeight) line += `   🎂 ${ageHeight}\n`;
        if (p.caste) line += `   💍 ${tr("కమ్యూనిటీ", "Community")}: ${p.caste}${p.sub_caste ? ` (${p.sub_caste})` : ""}\n`;
        const educationJob = [p.education ? `${tr("విద్య", "Education")}: ${p.education}` : "", p.job ? `${tr("వృత్తి", "Occupation")}: ${p.job}` : ""].filter(Boolean).join(" | ");
        if (educationJob) line += `   🎓 ${educationJob}\n`;
        const location = [p.district, p.state].filter(Boolean).join(", ");
        if (location) line += `   📍 ${tr("ప్రాంతం", "Location")}: ${location}\n`;
        if (p.jathakam_status && p.jathakam_status !== "reviewed") line += `   🪐 Jathakam evidence: ${p.jathakam_status} — no chart or compatibility result generated\n`;
        if (includeNumbers) line += `   📞 *${tr("ఫోన్ నంబర్", "Phone number")}:* ${p.phone || tr("అందుబాటులో లేదు", "Not available")}\n`;
        else line += `   🔗 ${tr("ప్రొఫైల్ లింక్", "Profile link")}: https://manavivaha.in/search/${encodeURIComponent(String(p.tsap_id || ""))}\n`;
        return line;
      })
      .join("\n");

    const footer = tr(
      `\n━━━━━━━━━━━━━━━━━━━━━\n🌐 మన వివాహ (Mana Vivaha) — సభ్యులు అందించిన ప్రొఫైల్ వివరాలు; దయచేసి స్వతంత్రంగా నిర్ధారించండి.\n👉 https://manavivaha.in`,
      `\n━━━━━━━━━━━━━━━━━━━━━\n🌐 Mana Vivaha — Profile details are member-submitted; please verify all information independently.\n👉 https://manavivaha.in`,
    );
    const fullMsg = header + body + footer;
    const waUrl = whatsappPhoneLink(recipientPhone, fullMsg) || whatsappShareLink(fullMsg);
    window.open(waUrl, "_blank", "noopener,noreferrer");
  };

  // Telegram Share Generator
  const shareTelegram = () => {
    if (selectedProfiles.length === 0) return;
    const title = tr("💍 *మన వివాహ (Mana Vivaha) — సరిపోలే సంబంధాలు*", "💍 *Mana Vivaha — Profile suggestions*");
    const msg = title + "\n\n" + selectedProfiles
      .map((p, i) => `${i + 1}. ${p.full_name} (${p.tsap_id}) — ${p.caste} • ${p.age}y • ${p.district}\n🔗 ${tr("ప్రొఫైల్", "Profile")}: https://manavivaha.in/search/${encodeURIComponent(String(p.tsap_id || ""))}`)
      .join("\n\n") + "\n\n🌐 https://manavivaha.in";

    window.open(`https://t.me/share/url?url=${encodeURIComponent("https://manavivaha.in")}&text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
  };

  const exportProfilesCsv = () => {
    const list = directoryProfiles.length > 0 ? directoryProfiles : matchedResults;
    if (list.length === 0) {
      flash(te ? "⚠️ ఎగుమతి చేయడానికి ప్రొఫైళ్లు లేవు." : "⚠️ There are no profiles to export.");
      return;
    }
    const headers = ["Profile_ID", "Full_Name", "Gender", "Age", "Caste", "Sub_Caste", "Education", "Job", "District", "State", "Phone", "Plan", "Recorded_Check_Type"];
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
      `"${(recordedCheckBadge(p, false)?.label || "None recorded").replace(/"/g, '""')}"`,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `mana-vivaha-profiles-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    flash(te ? "📥 ప్రొఫైల్‌ల CSV డౌన్‌లోడ్ అయింది." : "📥 Profile CSV downloaded.");
  };

  async function payoutAction(reqId: string, action: "approve" | "reject", utr = "", reason = "") {
    if (!me) return;
    if (action === "approve" && !utr.trim()) {
      flash(te ? "చెల్లింపును నిర్ధారించడానికి నిజమైన UTR అవసరం." : "A valid UTR is required to confirm payment.");
      return;
    }
    if (action === "reject" && !reason.trim()) {
      flash(te ? "తిరస్కరణకు కారణం నమోదు చేయండి." : "Enter a reason for rejecting this payout.");
      return;
    }
    setBusyId(reqId);
    try {
      const r = await fetch(`/api/control/payouts/${encodeURIComponent(reqId)}/action`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", "X-Control-CSRF": me.csrf },
        body: JSON.stringify({ action, utr: utr.trim(), reason: reason.trim() }),
      });
      const d = await readApiJson(r);
      if (!r.ok) throw new Error(d.detail || d.reason || "fail");
      flash(apiDisplayMessage(d, te, te ? L.done : "Payout updated."));
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
      const d = await readApiJson(r);
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
      const d = await readApiJson(r);
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
      const d = await readApiJson(r);
      if (!r.ok) throw new Error(d.detail || d.message_telugu || "Failed");
      flash(apiDisplayMessage(d, te, te
        ? `👑 ${id} కి ${d.plan_title || plan} ప్లాన్ యాక్టివేట్ అయింది.`
        : `👑 Plan ${d.plan_title || plan} was activated for ${id}.`));
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
          waMessage: te
            ? (d.wa_message || "")
            : (d.wa_message_en || `Hello ${d.full_name || id}, your ${d.plan_title || plan} plan has been activated. ${d.credits_added ?? credits ?? 0} interest-request credits were added. Plan activation does not approve your profile or verify identity. Contact details require profile-owner acceptance.`),
        });
      }
    } catch (e: any) {
      flash(te ? (e?.message || "ప్లాన్ యాక్టివేషన్ విఫలమైంది") : apiDisplayMessage(e?.message || "", false, "Plan activation failed. Please try again."));
    } finally {
      setBusyId("");
    }
  }

  async function spotlightAction(promoId: string, action: "verify_payment" | "approve" | "reject" | "close", days?: number) {
    if (!me) return;
    const paymentNote = (spPaymentNotes[promoId] || "").trim();
    const mediaNote = (spMediaNotes[promoId] || "").trim();
    const notes = action === "approve" ? mediaNote : paymentNote;
    if (action === "verify_payment") {
      if (paymentNote.length < 8) {
        flash("Add an audit note describing how the UTR was matched to the bank statement.");
        return;
      }
      if (!window.confirm("Confirm you personally matched this UTR and amount against the merchant bank statement. This does not activate the profile.")) return;
    }
    if (action === "approve") {
      if (mediaNote.length < 8) {
        flash("Add an audit note describing the profile and media review.");
        return;
      }
      if (!window.confirm("Confirm you reviewed the submitted profile and media. This is not identity verification.")) return;
    }
    setBusyId(promoId);
    try {
      const r = await fetch(`/api/control/spotlight/${encodeURIComponent(promoId)}/action`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", "X-Control-CSRF": me.csrf },
        body: JSON.stringify({ action, days, notes }),
      });
      const d = await readApiJson(r);
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
      const d = await readApiJson(r);
      if (!r.ok) throw new Error(d.detail || d.message_telugu || "Failed");
      flash(d.message_telugu || "Action completed!");
      loadAds();
    } catch (err: any) {
      flash(err?.message || "Failed to update ad");
    } finally {
      setBusyId("");
    }
  }

  async function handleVendorAction(vendorId: string, action: "approve" | "reject" | "expire") {
    if (!me) return;
    const utr = (vendorUtrById[vendorId] || "").trim();
    const reason = (vendorReasonById[vendorId] || "").trim();
    if (action === "approve") {
      if (!/^[A-Za-z0-9/-]{6,64}$/.test(utr)) {
        flash("Enter the actual payment reference from the reviewed receipt.");
        return;
      }
      if (!window.confirm("Confirm that you reviewed the receipt and matched the reference and amount. Payment does not verify business identity.")) return;
    }
    if (action === "reject" && reason.length < 5) {
      flash("Add a clear reason before rejecting this vendor.");
      return;
    }
    if (action === "expire" && !window.confirm("Expire this vendor listing?")) return;
    setBusyId(vendorId);
    try {
      const r = await fetch(`/api/control/vendors/${encodeURIComponent(vendorId)}/action`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", "X-Control-CSRF": me.csrf },
        body: JSON.stringify({ action, ...(action === "approve" ? { utr } : {}), ...(action === "reject" ? { reason } : {}) }),
      });
      const data = await readApiJson(r);
      if (!r.ok) throw new Error(data.detail || data.message_telugu || "Vendor review failed");
      flash(data.message_telugu || "Vendor listing updated.");
      await Promise.all([loadVendors(), loadCore()]);
    } catch (error: any) {
      flash(error?.message || "Vendor review failed.");
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
      const data = await readApiJson(r);
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
      const data = await readApiJson(r);
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
      const d = await readApiJson(r);
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
        <button type="button" onClick={loadCore} className="mt-4 rounded-xl maroon-gradient px-4 py-2 text-white font-bold">{L.refresh}</button>
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
    { k: "matchmaker" as const, label: tr("⚡ స్మార్ట్ మ్యాచ్ మేకర్", "⚡ Smart Matchmaker") },
    { k: "directory" as const, label: `📇 డైరెక్టరీ & కాంటాక్ట్స్ (${t.profiles})` },
    { k: "overview" as const, label: L.tabOverview },
    { k: "queue" as const, label: `${L.tabQueue} (${t.pending})` },
    { k: "castes" as const, label: L.tabCastes },
    { k: "channels" as const, label: L.tabChannels },
    { k: "numbers" as const, label: L.tabNumbers },
    { k: "addProfile" as const, label: L.tabAddProfile },
    { k: "tools" as const, label: tr("🧰 డేటా టూల్స్ & డైలీ మ్యాచ్‌లు", "🧰 Data tools & daily matches") },
    { k: "consoles" as const, label: tr("🎛️ కన్సోల్స్", "🎛️ Consoles") },
    { k: "ads" as const, label: L.tabAds },
    { k: "vendors" as const, label: L.tabVendors },
    { k: "spotlight" as const, label: L.tabSpotlight },
    { k: "stories" as const, label: L.tabStories },
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
                  {te ? "మన వివాహ" : "Mana Vivaha"} <span className="text-slate-800">{owner ? tr("అడ్మిన్ పోర్టల్", "Admin Portal") : financeAccess ? tr("ఫైనాన్స్ డెస్క్", "Finance Desk") : tr("మోడరేషన్ వర్క్‌స్పేస్", "Moderation Workspace")}</span>
                </span>
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                  owner ? "bg-amber-100 text-amber-900 border border-amber-300" : "bg-slate-100 text-slate-700"
                }`}>
                  {me.role}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                {L.signedAs} <b>{me.username}</b> • {owner ? tr("యజమాని కార్యకలాపాలు", "Owner operations") : financeAccess ? tr("ఆర్థిక కార్యకలాపాలు", "Finance operations") : tr("ప్రొఫైల్ సమీక్ష మరియు రిపోర్ట్‌ల నిర్వహణ", "Profile review and report moderation")}
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
            {owner ? (
              <Link
                href="/admin/photos"
                className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-[#7A0C2E]/25 bg-rose-50 px-3 py-2 text-xs font-extrabold text-[#7A0C2E] hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7A0C2E] focus-visible:ring-offset-2"
                aria-label={`${L.photoQueue}, ${t.photos_pending} pending`}
              >
                <span aria-hidden="true">📸</span>
                <span>{L.photoQueue}</span>
                <span className="rounded-full bg-white px-1.5 py-0.5 text-[10px] font-black">{t.photos_pending}</span>
              </Link>
            ) : null}
            <Link
              href="/"
              target="_blank"
              rel="noopener noreferrer"
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
            <button type="button"
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
                  {owner ? tr("ఆపరేషన్స్ డెస్క్", "Operations Desk") : financeAccess ? tr("ఫైనాన్స్ డెస్క్", "Finance Desk") : tr("ప్రొఫైల్ సమీక్ష వర్క్‌స్పేస్", "Profile Review Workspace")}
                </span>
                <span className="bg-white/10 text-white text-[10px] font-bold px-2 py-0.5 rounded-full border border-white/20">
                  {owner ? "Owner" : financeAccess ? "Finance" : "Moderation"}
                </span>
              </div>
              <p className="text-[11px] text-white/80 mt-0.5 telugu">
                {tr("సిస్టమ్‌లో ప్రస్తుతం ఉన్న లెక్కలు మాత్రమే; ప్రొఫైల్ సమాచారం సభ్యులు అందించినది.", "Live system counts only. Profile information is provided by members.")}
              </p>
            </div>
          </div>

          {/* Key Quick Shift Metrics */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
            <div className="bg-white/10 px-3 py-1.5 rounded-xl border border-white/15 flex items-center gap-1.5">
              <span>👥</span>
              <span className="font-bold">{t.profiles} {tr("ప్రొఫైళ్లు", "profiles")}</span>
            </div>
            <div className="bg-white/10 px-3 py-1.5 rounded-xl border border-white/15 flex items-center gap-1.5">
              <span>📸</span>
              <span className="font-bold text-amber-300">{t.with_photo} {tr("ఫోటోలు", "with photos")}</span>
            </div>
            <div className="bg-white/10 px-3 py-1.5 rounded-xl border border-white/15 flex items-center gap-1.5">
              <span>💌</span>
              <span className="font-bold text-emerald-300">{t.interests} {tr("సంబంధాలు", "interest requests")}</span>
            </div>
            {owner && (
              <button
                type="button"
                onClick={exportProfilesCsv}
                className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold px-3 py-1.5 rounded-xl shadow-xs transition flex items-center gap-1.5"
              >
                <span aria-hidden="true">📥</span>
                <span>{tr("CSV ఎగుమతి", "Export CSV")}</span>
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
                    <span>{tr("స్మార్ట్ మ్యాచ్ మేకర్ & జాతక సరిపోలిక", "Smart Matchmaker")}</span>
                  </h2>
                  <p className="text-xs text-slate-600 mt-1">
                    {tr("నమోదైన ఖచ్చితమైన ప్రొఫైల్ ID ఇవ్వండి. అందుబాటులో ఉన్న సభ్యులు అందించిన వివరాల ఆధారంగా మాత్రమే ప్రొఫైల్‌లు ఫిల్టర్ అవుతాయి; జాతక score లేదా matching ఫలితం తయారు చేయము.", "Enter an exact, registered profile ID. Results use member-submitted details only; no horoscope score or matching result is generated.")}
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
                  <button type="button"
                    onClick={() => runMatchmaker()}
                    disabled={mmLoading}
                    className="px-5 py-2.5 rounded-2xl maroon-gradient text-white font-extrabold text-xs shadow-md hover-lift disabled:opacity-50 whitespace-nowrap"
                  >
                    {mmLoading ? tr("వెతుకుతోంది…", "Searching…") : tr("🔍 సంబంధాలను శోధించండి", "🔍 Search profiles")}
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
                        <Image
                          src={candidate.photo_url}
                          alt={candidate.full_name}
                          width={80}
                          height={96}
                          unoptimized
                          className="w-20 h-24 rounded-2xl object-cover border-2 border-gold/60 shadow-md"
                        />
                      ) : (
                        <div className="w-20 h-24 rounded-2xl bg-white border-2 border-gold/40 flex flex-col items-center justify-center text-3xl shadow-sm text-maroon">
                          <span>{candidate.gender === "Bride" ? "👰" : "🤵"}</span>
                        </div>
                      )}
                      {(() => { const check = recordedCheckBadge(candidate, te); return check ? (
                        <span className="absolute -bottom-1 left-1 max-w-[calc(100%-0.5rem)] truncate rounded-full bg-slate-900/90 px-1.5 py-0.5 text-[8px] font-bold text-white shadow" title={check.title}>
                          {check.icon} {check.label}
                        </span>
                      ) : null; })()}
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-lg font-black text-[#7A0C2E]">{candidate.full_name}</span>
                        <span className="font-mono text-xs font-extrabold bg-maroon text-white px-2.5 py-0.5 rounded-full">
                          {candidate.tsap_id}
                        </span>
                        <span className="text-xs font-bold text-slate-500">
                          {candidate.gender === "Bride" ? tr("వధువు", "Bride") : tr("వరుడు", "Groom")}{candidate.age ? ` • ${candidate.age} ${tr("సం.", "years")}` : ""}
                        </span>
                      </div>

                      <div className="text-xs font-bold text-slate-700 flex flex-wrap gap-x-3 gap-y-1">
                        {candidate.caste && <span>💍 <b>{tr("కమ్యూనిటీ:", "Community:")}</b> {candidate.caste} {candidate.sub_caste ? `(${candidate.sub_caste})` : ""}</span>}
                        {candidate.gothram && <span>🪔 <b>{tr("గోత్రం:", "Gothram:")}</b> {candidate.gothram}</span>}
                        {candidate.star && <span>⭐ <b>{tr("నక్షత్రం:", "Nakshatram:")}</b> {candidate.star}</span>}
                        {candidate.rasi && <span>🌙 <b>{tr("రాశి:", "Rasi:")}</b> {candidate.rasi}</span>}
                      </div>

                      <div className="text-xs text-slate-600 flex flex-wrap gap-x-3 gap-y-1 pt-0.5">
                        {candidate.education && <span>🎓 <b>{tr("విద్య:", "Education:")}</b> {candidate.education}</span>}
                        {candidate.job && <span>💼 <b>{tr("వృత్తి:", "Occupation:")}</b> {candidate.job}</span>}
                        {candidate.salary && <span>💰 <b>{tr("ఆదాయం:", "Income:")}</b> {candidate.salary}</span>}
                        {(candidate.district || candidate.state) && <span>📍 <b>{tr("ప్రాంతం:", "Location:")}</b> {[candidate.district, candidate.state].filter(Boolean).join(", ")}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Right: Unmasked Direct Phone & Quick Actions */}
                  <div className="bg-white/90 rounded-2xl p-3.5 border border-gold/40 shadow-xs flex flex-col sm:items-end gap-2 w-full md:w-auto">
                    <div className="text-right">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">📞 {tr("నేరుగా సంప్రదించాల్సిన నంబర్:", "Direct contact number:")}</span>
                      <span className="text-base font-black text-emerald-800 font-mono tracking-wide">
                        {candidate.phone || tr("నంబర్ లేదు", "No number available")}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      {/* Plan Badge & Fast Upgrade Button */}
                      <div className="flex items-center gap-1.5">
                        <span className="px-2.5 py-1 rounded-xl text-[10px] font-black bg-slate-100 text-slate-700 border border-slate-200">
                          {tr("ప్లాన్:", "Plan:")} {candidate.plan || tr("స్థితి అందుబాటులో లేదు", "Status unavailable")}
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
                          {tr("ప్లాన్ మంజూరు", "Grant plan")}
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
                      <button type="button"
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
                        title={tr("WhatsApp ప్రపోజల్ మెసేజ్ బిల్డ్ చేయండి", "Build WhatsApp proposal message")}
                      >
                        <span>💌</span>
                        <span>{tr("WhatsApp ప్రపోజల్", "WhatsApp proposal")}</span>
                      </button>

                      <button type="button"
                        onClick={() => {
                          setPrintSheetModal({
                            open: true,
                            title: `${candidate.full_name} (${candidate.tsap_id}) — ${tr("మ్యాచ్ షీట్", "Match sheet")}`,
                            profiles: [candidate, ...matchedResults],
                          });
                        }}
                        className="px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-800 text-white font-extrabold text-[11px] shadow-xs flex items-center gap-1 transition"
                        title={tr("మ్యాచ్‌ల వివరాలు ప్రింట్ చేయండి", "Print match details")}
                      >
                        <span>🖨️</span>
                        <span>{tr("ప్రింట్ షీట్", "Print sheet")}</span>
                      </button>

                      <button type="button"
                        onClick={() => setShowJathakamReview(true)}
                        className="px-3 py-1.5 rounded-xl bg-purple-50 text-purple-900 border border-purple-200 font-extrabold text-[11px] shadow-xs flex items-center gap-1 hover:bg-purple-100 transition"
                        title={tr("నిజమైన జాతక పత్రం review చూడండి", "Open real Jathakam document review")}
                      >
                        <span>🪐</span>
                        <span>{tr("జాతక పత్రం review", "Jathakam review")}</span>
                      </button>

                      <button type="button"
                        onClick={() => openCounselorModal(candidate)}
                        className="px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-900 border border-indigo-200 font-extrabold text-[11px] shadow-xs flex items-center gap-1 hover:bg-indigo-100 transition"
                        title={tr("కౌన్సిలర్ నోట్స్ & కాల్ లాగ్స్", "Counsellor notes and call log")}
                      >
                        <span>📝</span>
                        <span>{tr("CRM నోట్స్", "CRM notes")}</span>
                      </button>

                      <button type="button"
                        onClick={() => toggleSelectProfile(candidate)}
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition ${
                          isProfileSelected(candidate.tsap_id)
                            ? "bg-maroon text-white border-maroon"
                            : "bg-white text-maroon border-gold/40 hover:bg-cream"
                        }`}
                      >
                        {isProfileSelected(candidate.tsap_id) ? tr("✓ నోట్‌ప్యాడ్‌లో ఉంది", "✓ Added to notepad") : tr("➕ నోట్‌ప్యాడ్‌కు జోడించు", "➕ Add to notepad")}
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* Advanced Filters Bar for Matches */}
            <div className="bg-white rounded-3xl p-4 border border-gold/30 shadow-xs space-y-3">
              <div className="flex items-center justify-between text-xs font-black text-slate-700">
                <span>{tr("🎯 సరిపోయే సంబంధాల ఫిల్టర్‌లు", "🎯 Match filters")}</span>
                <button type="button"
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
                  {tr("అన్నీ రీసెట్ చేయండి", "Reset all")}
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-xs">
                {/* Caste Select */}
                <select aria-label={tr("సంఘం", "Community")}
                  value={mmFilters.caste}
                  onChange={(e) => {
                    setMmFilters({ ...mmFilters, caste: e.target.value });
                  }}
                  className="px-2.5 py-2 rounded-xl border border-slate-200 bg-slate-50 font-medium"
                >
                  <option value="">💍 {tr("అన్ని కమ్యూనిటీలు", "All communities")}</option>
                  {CASTES.map((c) => (
                    <option key={c} value={c}>{te ? `${CASTE_TELUGU[c] || c} (${c})` : c}</option>
                  ))}
                </select>

                {/* District Select */}
                <select aria-label={tr("జిల్లా", "District")}
                  value={mmFilters.district}
                  onChange={(e) => setMmFilters({ ...mmFilters, district: e.target.value })}
                  className="px-2.5 py-2 rounded-xl border border-slate-200 bg-slate-50 font-medium"
                >
                  <option value="">🏡 {tr("అన్ని జిల్లాలు", "All districts")}</option>
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
                <button type="button"
                  onClick={() => runMatchmaker()}
                  className="px-3 py-2 rounded-xl maroon-gradient text-white font-extrabold text-xs shadow-xs"
                >
                  ⚡ {tr("ఫిల్టర్‌లు వర్తింపజేయండి", "Apply filters")}
                </button>
              </div>
            </div>

            {/* Results Grid Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-navy">
                  🎯 {tr("సరిపోలిన ప్రొఫైళ్లు", "Filtered profiles")} ({matchedResults.length})
                </span>
                {matchedResults.length > 0 && (
                  <button type="button"
                    onClick={selectAllMatches}
                    className="text-xs font-bold text-maroon hover:underline ml-2"
                  >
                    {selectedProfiles.length === matchedResults.length ? tr("అన్నింటినీ తీసివేయండి", "Deselect all") : tr("అన్నింటినీ ఎంచుకోండి", "Select all")}
                  </button>
                )}
              </div>

              <span className="text-xs text-slate-500 font-medium">
                {tr("సభ్యులు అందించిన వివరాలు మాత్రమే; దయచేసి స్వతంత్రంగా నిర్ధారించండి.", "Member-submitted details only; please verify independently.")}
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
                  {tr("ప్రొఫైల్‌లు ఏవీ కనుగొనబడలేదు", "No profiles found")}
                </h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  {tr("మరొక ప్రొఫైల్ ID ప్రయత్నించండి లేదా ఫిల్టర్‌లను సడలించండి.", "Try another profile ID or broaden the filters.")}
                </p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {matchedResults.map((row) => {
                  const isSelected = isProfileSelected(row.tsap_id);
                  const isPaid = row.is_premium || (row.plan && row.plan !== "FREE");
                  
                  const profileUrl = `${SITE_CONFIG.siteUrl.replace(/\/$/, "")}/search/${encodeURIComponent(String(row.tsap_id || ""))}`;
                  const shareDetails = [
                    row.age ? `🎂 ${tr("వయస్సు", "Age")}: ${row.age}` : "",
                    row.height ? `📏 ${tr("ఎత్తు", "Height")}: ${row.height}` : "",
                    row.caste ? `💍 కమ్యూనిటీ: ${row.caste}${row.sub_caste ? ` (${row.sub_caste})` : ""}` : "",
                    row.star || row.rasi ? `⭐ ${tr("నక్షత్రం / రాశి", "Nakshatram / rasi")}: ${row.star || "—"} / ${row.rasi || "—"}` : "",
                    row.education ? `🎓 ${tr("విద్య", "Education")}: ${row.education}` : "",
                    row.job ? `💼 ${tr("వృత్తి", "Occupation")}: ${row.job}` : "",
                    row.salary ? `💰 ${tr("ఆదాయం", "Income")}: ${row.salary}` : "",
                    row.district || row.state ? `🏡 ${tr("ప్రాంతం", "Location")}: ${[row.district, row.state].filter(Boolean).join(", ")}` : "",
                    `🔍 ${tr("ప్రొఫైల్", "Profile")}: ${profileUrl}`,
                  ].filter(Boolean);
                  const waShareText = candidate?.phone
                    ? [
                        tr(`నమస్కారం ${candidate.full_name || ""} గారు,`, `Hello ${candidate.full_name || ""},`),
                        tr(`మీ ప్రొఫైల్ (${candidate.tsap_id}) కోసం ఒక సంబంధ వివరాన్ని పంపిస్తున్నాం.`, `Here is a profile suggestion for your profile (${candidate.tsap_id}).`),
                        "", row.full_name || row.tsap_id, ...shareDetails, "",
                        tr("ప్రొఫైల్ వివరాలు సభ్యులు అందించినవి; కుటుంబంతో చర్చించి స్వతంత్రంగా నిర్ధారించండి.", "Profile details are member-submitted; discuss with your family and verify independently."),
                      ].join("\n")
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
                              aria-label={tr("ప్రొఫైల్ ఎంచుకోండి", "Select profile")}
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
                                <Image
                                  src={row.photo_url}
                                  alt={row.full_name}
                                  width={80}
                                  height={96}
                                  unoptimized
                                  className="w-20 h-24 rounded-2xl object-cover border-2 border-gold/40 shadow-sm group-hover:scale-105 transition duration-300"
                                />
                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition">
                                  🔍 {tr("పెద్దగా చూడండి", "View larger")}
                                </div>
                              </div>
                            ) : (
                              <div className="w-20 h-24 rounded-2xl bg-amber-50 border-2 border-gold/30 flex flex-col items-center justify-center text-3xl text-maroon shadow-xs">
                                <span>{row.gender === "Bride" ? "👰" : "🤵"}</span>
                              </div>
                            )}
                              {(() => { const check = recordedCheckBadge(row, te); return check ? (
                                <span className="absolute -bottom-1 left-1 max-w-[calc(100%-0.5rem)] truncate rounded-full bg-slate-900/90 px-1.5 py-0.5 text-[8px] font-bold text-white shadow" title={check.title}>
                                  {check.icon} {check.label}
                                </span>
                              ) : null; })()}
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
                              <span>{tr("ఈ వివరాలు రెండు ప్రొఫైళ్లలో నమోదు అయ్యాయి; ఇది సరిపోలిక తీర్పు కాదు.", "These details are present in both profiles; this is not a match verdict.")}</span>
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
                              <span className="text-[9px] text-slate-400 block font-bold uppercase">{tr("నేరుగా సంప్రదించాల్సిన ఫోన్ నంబర్", "Direct phone number")}</span>
                              <span className="text-xs sm:text-sm font-black text-slate-800 font-mono tracking-wide">
                                {row.phone || tr("నంబర్ లేదు", "No number available")}
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
                                title={tr("ఈ సంబంధం వివరాలను అభ్యర్థికి WhatsApp ద్వారా పంపండి", "Send these profile details to the candidate on WhatsApp")}
                              >
                                <span>💌</span>
                                <span>{tr("అభ్యర్థికి పంపండి", "Send to candidate")}</span>
                              </a>
                            )}

                            <button type="button"
                              onClick={() => toggleSelectProfile(row)}
                              className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition shadow-xs ${
                                isSelected
                                  ? "bg-maroon text-white"
                                  : "bg-white border border-gold text-maroon hover:bg-gold-soft"
                              }`}
                            >
                              {isSelected ? tr("✓ నోట్‌ప్యాడ్‌లో ఉంది", "✓ In notepad") : tr("➕ నోట్‌ప్యాడ్‌కు జోడించండి", "➕ Add to notepad")}
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
                onClick={() => { setDirDateRange("all"); setDirPayment("all"); setDirCheckStatus("all"); setDirPhoto("all"); }}
                className={`p-4 rounded-2xl border text-left transition ${
                  dirDateRange === "all" && dirPayment === "all" ? "bg-maroon text-white border-maroon shadow-md" : "bg-white border-slate-200 hover:border-gold"
                }`}
              >
                <div className="text-xs font-bold opacity-80">{tr("మొత్తం ప్రొఫైళ్లు", "Total profiles")}</div>
                <div className="text-2xl font-black mt-1">{dirSummary?.total_all ?? dirTotal}</div>
                <div className="text-[10px] opacity-75 mt-0.5">{tr("నమోదైనవి", "Registered")}</div>
              </button>

              <button
                type="button"
                onClick={() => { setDirDateRange("today"); setDirPayment("all"); }}
                className={`p-4 rounded-2xl border text-left transition ${
                  dirDateRange === "today" ? "bg-amber-500 text-white border-amber-600 shadow-md ring-2 ring-amber-300" : "bg-amber-50/70 border-amber-200 hover:bg-amber-100/70"
                }`}
              >
                <div className="text-xs font-bold text-amber-950 flex items-center gap-1">
                  <span>🌟</span> <span>{tr("ఈరోజు నమోదైనవి", "Registered today")}</span>
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
                <div className="text-xs font-bold text-slate-700">📅 {tr("నిన్న", "Yesterday")}</div>
                <div className="text-2xl font-black text-navy mt-1">{dirSummary?.yesterday_count ?? 0}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">{tr("నిన్న నమోదైనవి", "Profiles registered yesterday")}</div>
              </button>

              <button
                type="button"
                onClick={() => { setDirPayment("unpaid"); setDirDateRange("all"); }}
                className={`p-4 rounded-2xl border text-left transition ${
                  dirPayment === "unpaid" ? "bg-rose-600 text-white border-rose-700 shadow-md ring-2 ring-rose-300" : "bg-rose-50/70 border-rose-200 hover:bg-rose-100/70"
                }`}
              >
                <div className="text-xs font-bold text-rose-950 flex items-center gap-1">
                  <span>🟡</span> <span>{tr("చెల్లింపు లేని ప్రొఫైళ్లు", "Unpaid profiles")}</span>
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
                <div className="text-xs font-bold text-indigo-950">📸 {tr("ఫోటో ఉన్నవి", "With photo")}</div>
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
                    <span>{tr("డైరెక్టరీ & సంప్రదింపు నంబర్లు", "Directory and contact numbers")}</span>
                  </h2>
                  <p className="text-xs text-slate-600 mt-1">
                    {tr(`మొత్తం ${dirTotal} నమోదైన ప్రొఫైళ్లు • తేదీ, చెల్లింపు మరియు నమోదైన చెక్‌ల ద్వారా శోధించండి.`, `${dirTotal} registered profiles • search by date, payment, and recorded checks.`)}
                  </p>
                </div>

                {/* Keyword Search & CSV Export */}
                <div className="flex items-center gap-2 flex-wrap">
                  <input aria-label={tr("పేరు, ఫోన్ నంబర్, ID లేదా కమ్యూనిటీ…", "Name, phone, ID, or community…")}
                    type="text"
                    value={dirSearch}
                    onChange={(e) => setDirSearch(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") loadDirectory(); }}
                    placeholder={tr("పేరు, ఫోన్ నంబర్, ID లేదా కమ్యూనిటీ…", "Name, phone, ID, or community…")}
                    className="px-4 py-2 rounded-2xl border border-slate-300 text-xs font-bold focus:border-maroon focus:outline-none w-52 sm:w-64"
                  />
                  <button type="button"
                    onClick={() => loadDirectory()}
                    className="px-4 py-2 rounded-2xl maroon-gradient text-white font-extrabold text-xs shadow-md"
                  >
                    🔍 {tr("శోధించండి", "Search")}
                  </button>
                  <button type="button"
                    onClick={() => {
                      setPrintSheetModal({
                        open: true,
                        title: tr(`మన వివాహ — నమోదైన ప్రొఫైల్‌ల డైరెక్టరీ (${directoryProfiles.length})`, `Mana Vivaha — Registered profile directory (${directoryProfiles.length})`),
                        profiles: directoryProfiles,
                      });
                    }}
                    className="px-3.5 py-2 rounded-2xl bg-slate-700 hover:bg-slate-800 text-white font-extrabold text-xs shadow-sm flex items-center gap-1.5 transition active:scale-95"
                    title="Print directory profiles sheet"
                  >
                    <span>🖨️</span>
                    <span>{tr("ప్రింట్ షీట్", "Print sheet")}</span>
                  </button>
                  <button type="button"
                    onClick={exportProfilesCsv}
                    className="px-3.5 py-2 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs shadow-sm flex items-center gap-1.5 transition active:scale-95"
                    title="Export all directory profiles to CSV"
                  >
                    <span>📥</span>
                    <span>{tr("CSV ఎగుమతి", "Export CSV")}</span>
                  </button>
                </div>
              </div>

              {/* Date Filter Quick Pills */}
              <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-500 mr-1">📅 {tr("నమోదు తేదీ:", "Registration date:")}</span>
                {[
                  { id: "all", label: tr("అన్ని తేదీలు", "All dates") },
                  { id: "today", label: tr("🌟 ఈరోజు", "🌟 Today") },
                  { id: "yesterday", label: tr("📅 నిన్న", "📅 Yesterday") },
                  { id: "7days", label: tr("🗓️ గత 7 రోజులు", "🗓️ Last 7 days") },
                  { id: "month", label: tr("📆 ఈ నెల", "📆 This month") },
                  { id: "custom", label: tr("🔍 అనుకూల తేదీ", "🔍 Custom dates") },
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
                    <input aria-label={tr("తేదీ నుండి", "Date from")}
                      type="date"
                      value={dirDateFrom}
                      onChange={(e) => setDirDateFrom(e.target.value)}
                      className="px-2.5 py-1 text-xs border border-slate-300 rounded-lg"
                    />
                    <span className="text-xs text-slate-400">{tr("నుండి", "to")}</span>
                    <input aria-label={tr("తేదీ వరకు", "Date to")}
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
                      {tr("ఫిల్టర్ చేయండి", "Apply")}
                    </button>
                  </div>
                )}
              </div>

              {/* Profession & Category Quick Pills */}
              <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-500 mr-1">💼 {tr("వృత్తి / వర్గం:", "Occupation / category:")}</span>
                {[
                  { id: "all", label: tr("అన్ని రంగాలు", "All categories") },
                  { id: "housewife", label: tr("🏡 గృహిణి", "🏡 Homemaker") },
                  { id: "it_software", label: tr("💻 సాఫ్ట్‌వేర్ / IT", "💻 Software / IT") },
                  { id: "govt", label: tr("🏛️ ప్రభుత్వ ఉద్యోగం", "🏛️ Government job") },
                  { id: "business", label: tr("🏢 వ్యాపారం", "🏢 Business") },
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
                  <label className="text-[10px] font-bold text-slate-500 block mb-0.5">💰 {tr("చెల్లింపు స్థితి:", "Payment status:")}</label>
                  <select aria-label={tr("చెల్లింపు స్థితి", "Payment status")}
                    value={dirPayment}
                    onChange={(e) => setDirPayment(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 font-medium"
                  >
                    <option value="all">{tr("అన్నీ", "All")}</option>
                    <option value="unpaid">🟡 {tr("చెల్లింపు లేనివి / ఉచితం", "Unpaid / free")}</option>
                    <option value="paid">🟢 {tr("చెల్లించినవి", "Paid")}</option>
                  </select>
                </div>

                {/* Recorded-check filter; not an identity verdict */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-0.5">{te ? "🛡️ నమోదైన చెక్ (OTP / ఫోటో / ID):" : "🛡️ Recorded check (OTP / photo / ID):"}</label>
                  <select aria-label={te ? "🛡️ నమోదైన చెక్ (OTP / ఫోటో / ID):" : "🛡️ Recorded check (OTP / photo / ID):"}
                    value={dirCheckStatus}
                    onChange={(e) => setDirCheckStatus(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 font-medium"
                  >
                    <option value="all">{te ? "అందరూ (All)" : "All"}</option>
                    <option value="verified">{te ? "చెక్ నమోదు అయింది (గుర్తింపు హామీ కాదు)" : "A check is recorded (not identity-verified)"}</option>
                    <option value="unverified">{te ? "చెక్ నమోదు కాలేదు" : "No check recorded"}</option>
                  </select>
                </div>

                {/* Marital Status Filter */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-0.5">💍 {tr("వైవాహిక స్థితి:", "Marital status:")}</label>
                  <select aria-label={tr("వైవాహిక స్థితి", "Marital status")}
                    value={dirMarital}
                    onChange={(e) => setDirMarital(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 font-medium"
                  >
                    <option value="all">{tr("అన్నీ", "All")}</option>
                    <option value="first_marriage">{tr("మొదటి వివాహం", "Never married")}</option>
                    <option value="second_marriage">{tr("విడాకులు / విధవ / విధురుడు", "Previously married")}</option>
                  </select>
                </div>

                {/* Photo Filter */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-0.5">📸 {tr("ఫోటో:", "Photo:")}</label>
                  <select aria-label={tr("ఫోటో స్థితి", "Photo status")}
                    value={dirPhoto}
                    onChange={(e) => setDirPhoto(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 font-medium"
                  >
                    <option value="all">{tr("అన్నీ", "All")}</option>
                    <option value="with_photo">📸 {tr("ఫోటో ఉన్నవి", "With photo")}</option>
                    <option value="no_photo">{tr("ఫోటో లేనివి", "No photo")}</option>
                  </select>
                </div>

                {/* Gender Filter */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-0.5">👰/🤵 {tr("లింగం:", "Gender:")}</label>
                  <select aria-label={tr("లింగం", "Gender")}
                    value={dirGender}
                    onChange={(e) => setDirGender(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 font-medium"
                  >
                    <option value="">{tr("అన్నీ", "All")}</option>
                    <option value="Bride">👰 {tr("వధువులు", "Brides")}</option>
                    <option value="Groom">🤵 {tr("వరులు", "Grooms")}</option>
                  </select>
                </div>

                {/* District Filter */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-0.5">🏡 {tr("జిల్లా:", "District:")}</label>
                  <select aria-label={tr("జిల్లా", "District")}
                    value={dirDistrict}
                    onChange={(e) => setDirDistrict(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 font-medium"
                  >
                    <option value="">{tr("అన్ని జిల్లాలు", "All districts")}</option>
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
                      <th className="p-3.5 text-center">{tr("ఎంపిక", "Select")}</th>
                      <th className="p-3.5">{tr("ID / పేరు", "ID / name")}</th>
                      <th className="p-3.5">{tr("నమోదు తేదీ", "Registration date")}</th>
                      <th className="p-3.5">{tr("ప్లాన్ & స్థితి", "Plan & status")}</th>
                      <th className="p-3.5">{tr("లింగం / వయస్సు", "Gender / age")}</th>
                      <th className="p-3.5">{tr("కమ్యూనిటీ & గోత్రం", "Community & gothram")}</th>
                      <th className="p-3.5">{tr("వృత్తి / విద్య", "Occupation / education")}</th>
                      <th className="p-3.5">{tr("జిల్లా / ఊరు", "District / city")}</th>
                      <th className="p-3.5">📞 {tr("ఫోన్ నంబర్", "Phone number")}</th>
                      <th className="p-3.5 text-right">{tr("చర్యలు & ప్లాన్", "Actions & plan")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dirLoading ? (
                      <tr>
                        <td colSpan={10} className="p-8 text-center text-slate-400 font-bold">
                          {tr("లోడ్ అవుతోంది…", "Loading…")}
                        </td>
                      </tr>
                    ) : directoryProfiles.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="p-8 text-center text-slate-400 font-bold">
                          {tr("ఎంచుకున్న ఫిల్టర్‌లకు ప్రొఫైల్‌లు లేవు.", "No profiles match the selected filters.")}
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
                                aria-label={tr("ప్రొఫైల్ ఎంచుకోండి", "Select profile")}
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
                                    {tr("గతంలో వివాహమైన", "Previously married")}
                                  </span>
                                )}
                              </div>
                              <div className="font-mono text-[10px] text-maroon flex items-center gap-1">
                                <span>{p.tsap_id}</span>
                                {p.photo_url ? (
                                  <span className="text-[10px]" title="Photo Uploaded">📸</span>
                                ) : (
                                  <span className="text-[9px] text-slate-400 font-sans">{tr("ఫోటో లేదు", "No photo")}</span>
                                )}
                              </div>
                            </td>
                            <td className="p-3.5 font-medium whitespace-nowrap">
                              <div className={`font-mono text-[11px] ${isToday ? "text-amber-800 font-black" : "text-slate-600"}`}>
                                {isToday ? `🌟 ${tr("ఈరోజు", "Today")}` : regDateStr}
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
                                    <span>🟡 {tr("ఉచిత సభ్యులు", "Free member")}</span>
                                  </span>
                                )}
                                <div className="text-[10px] text-slate-500 font-mono">
                                  🪙 {p.credits || 0} {tr("క్రెడిట్‌లు", "credits")}
                                </div>
                              </div>
                            </td>
                            <td className="p-3.5 font-medium">
                              <div>{p.gender === "Bride" ? `👰 ${tr("వధువు", "Bride")}` : `🤵 ${tr("వరుడు", "Groom")}`}</div>
                              <div className="text-slate-500">{p.age} {tr("సం.", "years")}</div>
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
                                    ? tr(`నమస్కారం ${p.full_name} గారు! మన వివాహ నుంచి సంప్రదిస్తున్నాం. మీ ప్రొఫైల్ (${p.tsap_id}) గురించి సహాయం కావాలంటే తెలియజేయండి.`, `Hello ${p.full_name}, this is Mana Vivaha. Let us know if you need assistance with your profile (${p.tsap_id}).`)
                                    : tr(`నమస్కారం ${p.full_name} గారు! మన వివాహలో మీ ప్రొఫైల్ (${p.tsap_id}) నమోదు అయింది. ప్రస్తుత సేవలు, ధరల వివరాలకు https://manavivaha.in/pricing చూడండి. ప్రొఫైల్ ఆమోదం లేదా వెరిఫికేషన్‌కు హామీ లేదు; చెల్లింపులు అధికారిక వెబ్‌సైట్ ద్వారా మాత్రమే చేయండి.`, `Hello ${p.full_name}, your profile (${p.tsap_id}) is registered with Mana Vivaha. Current services and prices: https://manavivaha.in/pricing. Profile approval or verification is not guaranteed. Please pay only through the official website.`)) || undefined}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-block p-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white transition font-bold"
                                  title={isPaid ? "WhatsApp Chat" : tr("WhatsApp ఫాలో-అప్", "WhatsApp follow-up")}
                                >
                                  💬
                                </a>
                              )}

                              {/* Matchmaker */}
                              <button type="button"
                                onClick={() => {
                                  setLookupQuery(p.tsap_id);
                                  runMatchmaker(p.tsap_id);
                                  setTab("matchmaker");
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-amber-100 text-maroon font-bold text-[11px] hover:bg-amber-200 transition"
                                title={tr("ప్రొఫైల్‌లను చూడండి", "Find profiles")}
                              >
                                ⚡ {tr("ప్రొఫైల్‌లు", "Profiles")}
                              </button>

                              {/* WhatsApp Proposal Generator */}
                              <button type="button"
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
                                title={tr("WhatsApp ప్రపోజల్ బిల్డర్", "WhatsApp proposal builder")}
                              >
                                💌 {tr("ప్రపోజల్", "Proposal")}
                              </button>

                              {/* Counselor CRM Call Notes */}
                              <button type="button"
                                onClick={() => openCounselorModal(p)}
                                className="px-2.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-900 border border-indigo-200 font-bold text-[11px] hover:bg-indigo-100 transition shadow-xs"
                                title={tr("కౌన్సిలర్ కాల్ నోట్స్ & CRM హిస్టరీ", "Counsellor call notes and CRM history")}
                              >
                                📝 CRM
                              </button>

                              {/* Manual plan-credit activation; approval and verification remain separate. */}
                              <button type="button"
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
                                👑 {tr("ప్లాన్ ఇవ్వండి", "Grant plan")}
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
                { label: L.recordedChecksTot, val: t.recorded_checks, icon: "🛡️" },
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

            {/* 📊 Ops insights: queue aging, funnel, engagement, trend */}
            <OpsInsights analytics={an} series={(an.signups?.series || []).map((d: any) => Number(d.count) || 0)} />
          </div>
        )}

        {/* Profile Approval Queue Tab */}
        {tab === "queue" && (
          <div className="space-y-4">
            <div className="flex gap-2">
              {(owner ? (["pending", "approved", "rejected", "all"] as const) : (["pending"] as const)).map((s) => (
                <button type="button"
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
                    <span>{tr("కమ్యూనిటీ డిమాండ్ & సరఫరా సమతుల్యత", "Community demand and supply overview")}</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    {tr("ప్రతి కమ్యూనిటీలో వధూవరుల నిష్పత్తి మరియు నమోదు చేసిన చెక్‌ల సంఖ్య. ఇది ప్రొఫైల్ నాణ్యత లేదా ధృవీకరణకు రేటింగ్ కాదు.", "Bride-to-groom ratios and recorded checks by community. This is not a rating of profile quality or verification.")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={loadDemandMatrix}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
                >
                  🔄 {tr("రిఫ్రెష్", "Refresh")}
                </button>
              </div>

              {demandMatrixData.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-slate-700 font-extrabold uppercase border-b border-slate-200">
                      <tr>
                        <th className="p-3">{tr("కమ్యూనిటీ", "Community")}</th>
                        <th className="p-3 text-center">{tr("మొత్తం ప్రొఫైళ్లు", "Total profiles")}</th>
                        <th className="p-3 text-center">👰 {tr("వధువులు", "Brides")}</th>
                        <th className="p-3 text-center">🤵 {tr("వరులు", "Grooms")}</th>
                        <th className="p-3 text-center">{tr("వధువు / వరుడు నిష్పత్తి", "Bride-to-groom ratio")}</th>
                        <th className="p-3 text-center">{tr("నిష్పత్తి సూచన", "Ratio indicator")}</th>
                        <th className="p-3 text-center" title="Phone OTP, photo review, or manual ID review record; not identity proof.">{te ? "నమోదైన చెక్‌లు" : "Recorded checks"}</th>
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
                              {te ? row.health_telugu : row.health === "balanced" ? "Balanced" : row.health === "high_groom_demand" ? "Fewer grooms" : "Fewer brides"}
                            </span>
                          </td>
                          <td className="p-3 text-center font-mono font-bold text-emerald-700">{row.recorded_checks}</td>
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
                    <span className="font-extrabold text-sm text-maroon">{te ? c.te : c.en}</span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                      {c.total} Profiles
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600">
                    👰 {c.females} Brides • 🤵 {c.males} Grooms
                  </div>
                  <p className="text-[10px] leading-relaxed text-slate-500">
                    {c.routing_eligible
                      ? (te ? "Routing కోసం నమోదు అయింది; బాహ్య availability తనిఖీ కాలేదు." : "Marked for routing; external availability is not checked.")
                      : (te ? "Routing destination నమోదు కాలేదు." : "No routing destination is configured.")}
                  </p>
                  <div className="pt-1 flex flex-wrap gap-1">
                    {c.channel_bride ? (
                      <a
                        href={`https://t.me/${encodeURIComponent(c.channel_bride)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 min-w-[7rem] py-2 text-center text-[10px] font-bold bg-[#229ED9] text-white rounded-lg"
                      >
                        📢 {te ? "వధువుల listing" : "Brides listing"}
                      </a>
                    ) : (
                      <span className="flex-1 min-w-[7rem] py-2 text-center text-[10px] text-slate-500 rounded-lg bg-slate-50">
                        {te ? "వధువుల destination లేదు" : "No brides destination"}
                      </span>
                    )}
                    {c.channel_groom ? (
                      <a
                        href={`https://t.me/${encodeURIComponent(c.channel_groom)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 min-w-[7rem] py-2 text-center text-[10px] font-bold bg-[#229ED9] text-white rounded-lg"
                      >
                        📢 {te ? "వరుల listing" : "Grooms listing"}
                      </a>
                    ) : (
                      <span className="flex-1 min-w-[7rem] py-2 text-center text-[10px] text-slate-500 rounded-lg bg-slate-50">
                        {te ? "వరుల destination లేదు" : "No grooms destination"}
                      </span>
                    )}
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
              <span>{tr("టెలిగ్రామ్ & వాట్సాప్ ఛానెల్‌ల నిర్వహణ", "Telegram and WhatsApp channels")}</span>
            </h3>
            <ChannelCoverage />
            <ChannelsConsole />
          </div>
        )}

        {/* WhatsApp & Phone Numbers Management */}
        {tab === "numbers" && owner && (
          <div className="bg-white rounded-3xl p-6 border border-gold/30 shadow-xs space-y-4">
            <h3 className="font-black text-lg text-[#7A0C2E] flex items-center gap-2">
              <span>📱</span>
              <span>{tr("అధికారిక WhatsApp పంపేవారు & మద్దతు నంబర్లు", "WhatsApp senders and support numbers")}</span>
            </h3>
            <WANumbersConsole />
          </div>
        )}

        {/* Add Profile Form Tab */}
        {tab === "addProfile" && owner && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gold/30 max-w-2xl mx-auto shadow-sm">
            <h2 className="text-lg font-black text-[#7A0C2E] mb-2">{tr("➕ ప్రొఫైల్ చేర్చండి", "➕ Add a profile")}</h2>
            <p className="mb-4 text-xs leading-relaxed text-slate-600">{tr("సభ్యుని స్పష్టమైన సమ్మతి పొందిన తర్వాత మాత్రమే వివరాలు నమోదు చేయండి. సమాచారం సభ్యుడు అందించినది. సిబ్బంది నమోదు, ఫోన్ OTP లేదా ప్రొఫైల్ ఆమోదం గుర్తింపు ధృవీకరణ కాదు. సమీక్ష పూర్తయ్యే వరకు ప్రొఫైల్ ప్రచురించబడదు.", "Enter details only with the member’s explicit consent. All information is member-provided. Staff entry, phone OTP, and profile approval are not identity verification. The profile will not be published until reviewed.")}</p>
            <form onSubmit={handleCreateProfile} className="space-y-4 text-xs font-bold">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1">{tr("పూర్తి పేరు", "Full name")} *</label>
                  <input aria-label="Enter member's name"
                    required
                    value={newProf.full_name}
                    onChange={(e) => setNewProf({ ...newProf, full_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-medium text-sm"
                    placeholder="Enter member's name"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1">{tr("లింగం", "Gender")} *</label>
                  <select aria-label={tr("లింగం", "Gender")}
                    required
                    value={newProf.gender}
                    onChange={(e) => setNewProf({ ...newProf, gender: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                  >
                    <option value="" disabled>{tr("లింగాన్ని ఎంచుకోండి", "Choose gender")}</option>
                    <option value="Bride">👰 {tr("వధువు", "Bride")}</option>
                    <option value="Groom">🤵 {tr("వరుడు", "Groom")}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1">{tr("వయస్సు (ఐచ్ఛికం)", "Age (optional)")}</label>
                  <input aria-label={tr("వయస్సు (ఐచ్ఛికం)", "Age (optional)")}
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
                  <label className="block text-slate-700 mb-1">{tr("మతం", "Religion")} *</label>
                  <select aria-label={tr("మతం", "Religion")}
                    required
                    value={newProf.religion}
                    onChange={(e) => setNewProf({ ...newProf, religion: e.target.value, caste: "", caste_custom: "", sub_caste: "", sub_caste_custom: "" })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                  >
                    <option value="">{tr("మతాన్ని ఎంచుకోండి", "Select religion")}</option>
                    {RELIGIONS.map((religion) => <option key={religion} value={religion}>{religion}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 mb-1">{tr("కులం / కమ్యూనిటీ", "Caste / community")} *</label>
                  <select aria-label={tr("సంఘం", "Community")}
                    required
                    disabled={!newProf.religion}
                    value={newProf.caste}
                    onChange={(e) => setNewProf({ ...newProf, caste: e.target.value, caste_custom: "", sub_caste: "", sub_caste_custom: "" })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm disabled:bg-slate-100"
                  >
                    <option value="">{tr("కమ్యూనిటీని ఎంచుకోండి", "Select community")}</option>
                    {adminCasteOpts.map((c) => <option key={c} value={c}>{te ? CASTE_TELUGU[c] || c : c}</option>)}
                  </select>
                  <p className="mt-1 text-[10px] text-slate-500">{adminCasteLoading ? tr("కమ్యూనిటీల జాబితా లోడ్ అవుతోంది…", "Loading community options…") : adminCasteOffline ? tr("ఆఫ్‌లైన్ జాబితా. అవసరమైతే Other / self-described ఎంచుకోండి.", "Offline list. Choose Other / self-described if needed.") : tr("ప్రతి మతానికి వేరు జాబితా. జాబితాలో లేని కమ్యూనిటీని స్వయంగా నమోదు చేయండి.", "Options vary by religion. Enter a community if it is not listed.")}</p>
                </div>
                {newProf.caste === "Other / self-described" && (
                  <div>
                    <label className="block text-slate-700 mb-1">{tr("సభ్యుడు తెలిపిన కమ్యూనిటీ", "Member-provided community")} *</label>
                    <input aria-label="Member-provided community name" required maxLength={100} value={newProf.caste_custom} onChange={(e) => setNewProf({ ...newProf, caste_custom: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm" placeholder="Member-provided community name" />
                  </div>
                )}
                <div>
                  <label className="block text-slate-700 mb-1">{tr("ఉప-కమ్యూనిటీ (ఐచ్ఛికం)", "Sub-community (optional)")}</label>
                  {adminSubcasteOpts.length ? (
                    <select aria-label={tr("ఉప-కమ్యూనిటీ (ఐచ్ఛికం)", "Sub-community (optional)")} value={newProf.sub_caste} onChange={(e) => setNewProf({ ...newProf, sub_caste: e.target.value, sub_caste_custom: "" })} className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm">
                      <option value="">{tr("ఎంచుకోండి (ఐచ్ఛికం)", "Select (optional)")}</option>
                      {adminSubcasteOpts.map((sub) => <option key={sub} value={sub}>{sub}</option>)}
                    </select>
                  ) : (
                    <input aria-label="Optional member-provided subgroup" maxLength={100} value={newProf.sub_caste} onChange={(e) => setNewProf({ ...newProf, sub_caste: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm" placeholder="Optional member-provided subgroup" />
                  )}
                  {newProf.sub_caste === "Other / self-described" && <input aria-label="Member-provided subgroup name" required maxLength={100} value={newProf.sub_caste_custom} onChange={(e) => setNewProf({ ...newProf, sub_caste_custom: e.target.value })} className="mt-2 w-full px-3 py-2 rounded-xl border border-slate-300 text-sm" placeholder="Member-provided subgroup name" />}
                </div>
                <div>
                  <label className="block text-slate-700 mb-1">{tr("రాష్ట్రం / ప్రాంతం", "State / region")} *</label>
                  <select aria-label={tr("రాష్ట్రం", "State")}
                    required
                    value={newProf.state}
                    onChange={(e) => setNewProf({ ...newProf, state: e.target.value, district: "" })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                  >
                    <option value="">{tr("ప్రాంతాన్ని ఎంచుకోండి", "Select region")}</option>
                    <option value="TS">Telangana</option>
                    <option value="AP">Andhra Pradesh</option>
                    <option value="Other">{tr("ఇతర భారత రాష్ట్రం / NRI", "Other Indian state / NRI")}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 mb-1">{tr("జిల్లా / స్థానం", "District / location")} *</label>
                  <select aria-label={tr("జిల్లా", "District")}
                    required
                    disabled={!newProf.state}
                    value={newProf.district}
                    onChange={(e) => setNewProf({ ...newProf, district: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm disabled:bg-slate-100"
                  >
                    <option value="">{tr("స్థానాన్ని ఎంచుకోండి", "Select location")}</option>
                    {(newProf.state === "TS" ? TS_DISTRICTS : newProf.state === "AP" ? AP_DISTRICTS : newProf.state === "Other" ? OTHER_LOCATIONS.map((location) => location.en) : []).map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1">{tr("విద్య", "Education")}</label>
                  <input aria-label={tr("విద్య", "Education")}
                    value={newProf.education}
                    onChange={(e) => setNewProf({ ...newProf, education: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-medium"
                    placeholder="B.Tech, MBBS..."
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1">{tr("వృత్తి", "Occupation")}</label>
                  <input aria-label={tr("వృత్తి", "Occupation")}
                    value={newProf.job}
                    onChange={(e) => setNewProf({ ...newProf, job: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-medium"
                    placeholder="Software Engineer..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 mb-1">📞 {tr("ఫోన్ నంబర్", "Phone number")} *</label>
                <input aria-label="10-digit member phone"
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
                <span>{tr("సభ్యుని స్పష్టమైన సమ్మతి తీసుకున్నాను; ఈ వివరాలను సభ్యుడే అందించారు.", "I confirm the member consented to this entry and supplied these details.")}</span>
              </label>
              <button
                type="submit"
                disabled={profSubmitting}
                className="w-full py-3 rounded-2xl maroon-gradient text-white font-black text-sm shadow-md hover-lift disabled:opacity-50"
              >
                {profSubmitting ? tr("సేవ్ అవుతోంది…", "Saving…") : tr("🚀 ప్రొఫైల్ సృష్టించి మ్యాచ్‌లను శోధించండి", "🚀 Create profile and find matches")}
              </button>
            </form>
          </div>
        )}

        {/* Data tools + daily featured matches (owner only) */}
        {tab === "tools" && owner && (
          <div className="space-y-6">
            <DailyMatches />
            <DataTools />
            <ModerationQueue />
            <StoriesQueue />
            <LeadsPanel />
            <PublishPanel />
            <PersonalizedDigestPanel />
          </div>
        )}

        {/* Consoles (owner only): campaigns, astro, content, offers, payments,
            the weekly showcase and the assisted match-and-send service. */}
        {tab === "consoles" && owner && (
          <div className="space-y-6">
            <Showcase />
            <MatchSend />
            <ContentConsole />
            <OffersConsole />
            <PayConsole />
            <AdsConsole />
            <AstroConsole />
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
                            <input id={`ad-utr-${ad.id}`} maxLength={64} value={adUtrById[ad.id] || ""} onChange={(e) => setAdUtrById((current) => ({ ...current, [ad.id]: e.target.value }))} className="mt-1.5 min-h-10 w-full rounded-xl border border-slate-300 bg-white px-3 font-mono text-sm" placeholder="Enter actual reference from reviewed receipt" />
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

        {/* Vendors Tab — owner-only, session authenticated; no seeded sample records */}
        {tab === "vendors" && owner && (
          <section className="min-w-0 space-y-5" aria-labelledby="vendor-admin-heading">
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <h2 id="vendor-admin-heading" className="text-xl font-black text-navy">{te ? "వెండర్ సమీక్ష" : "Vendor review"}</h2>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{te ? "నిజమైన vendor records మాత్రమే. చెల్లింపును బ్యాంక్‌తో స్వయంగా సరిపోల్చిన తర్వాతే approve చేయండి." : "Live vendor records only. Approve only after personally matching the payment against the bank record."}</p>
              </div>
              <label className="block w-full text-xs font-bold text-slate-700 sm:w-56">
                {te ? "స్థితి" : "Filter by status"}
                <select value={vendorStatus} onChange={(event) => setVendorStatus(event.target.value)} className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm">
                  <option value="pending">{te ? "పెండింగ్" : "Pending"}</option>
                  <option value="active">{te ? "యాక్టివ్" : "Active listings"}</option>
                  <option value="kit_ready">{te ? "పూర్తయిన share kits" : "Ready share kits"}</option>
                  <option value="rejected">{te ? "తిరస్కరించినవి" : "Rejected"}</option>
                  <option value="expired">{te ? "గడువు ముగిసినవి" : "Expired"}</option>
                  <option value="all">{te ? "అన్నీ" : "All"}</option>
                </select>
              </label>
            </div>

            {vendorRevenue && (
              <div className="grid min-w-0 grid-cols-2 gap-3 lg:grid-cols-4" aria-label={te ? "వెండర్ ఆదాయ సారాంశం" : "Vendor revenue summary"}>
                {[
                  [te ? "యాక్టివ్ వెండర్లు" : "Active vendors", vendorRevenue.active ?? 0],
                  [te ? "పెండింగ్ వెండర్లు" : "Pending vendors", vendorRevenue.pending ?? 0],
                  [te ? "నమోదైన వసూళ్లు" : "Recorded collected", `₹${vendorRevenue.collected ?? 0}`],
                  [te ? "పెండింగ్ మొత్తం" : "Pending amount", `₹${vendorRevenue.pipeline ?? 0}`],
                ].map(([label, value]) => (
                  <div key={String(label)} className="min-w-0 rounded-2xl border border-gold/30 bg-white p-3 shadow-xs sm:p-4">
                    <div className="break-words text-xs font-semibold text-slate-600">{label}</div>
                    <div className="mt-1 break-words text-lg font-black text-navy sm:text-xl">{value}</div>
                  </div>
                ))}
              </div>
            )}

            {vendorsData.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gold/40 bg-white p-8 text-center text-sm text-slate-600">
                {te ? "ఈ స్థితిలో వెండర్ రికార్డులు లేవు." : "No vendor records match this status."}
              </div>
            ) : (
              <div className="grid min-w-0 gap-4 xl:grid-cols-2">
                {vendorsData.map((vendor) => {
                  const vendorId = vendor.id || vendor.vendor_id || "";
                  return (
                    <article key={vendorId || `${vendor.business_name}-${vendor.category}`} className="min-w-0 space-y-3 rounded-2xl border border-gold/30 bg-white p-4 shadow-xs sm:p-5">
                      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <h3 className="break-words text-base font-black text-navy">{vendor.business_name || vendor.name || (te ? "పేరు ఇవ్వలేదు" : "Name not provided")}</h3>
                          <p className="mt-1 break-all font-mono text-xs text-slate-500">{te ? "వెండర్ ID" : "Vendor ID"}: {vendorId || "—"}</p>
                        </div>
                        <span className="w-fit shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-black uppercase text-slate-700">{vendor.status || "unknown"}</span>
                      </div>
                      <div className="grid min-w-0 gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
                        <p className="min-w-0 break-words text-slate-700">📂 {vendor.category_name || vendor.category || "—"}</p>
                        <p className="min-w-0 break-words text-slate-700">📍 {[vendor.district, vendor.state].filter(Boolean).join(", ") || "—"}</p>
                        <p className="min-w-0 break-all font-mono text-slate-700">📞 {vendor.phone || vendor.phone_masked || "—"}</p>
                        <p className="min-w-0 break-words text-slate-700">{vendor.package_name || vendor.package || "—"} · ₹{vendor.package_price ?? 0}</p>
                        <p className="min-w-0 break-all text-xs text-slate-600 sm:col-span-2">{te ? "చెల్లింపు రిఫరెన్స్" : "Submitted payment reference"}: <span className="font-mono">{vendor.payment_ref || (te ? "సమర్పించలేదు" : "Not submitted")}</span></p>
                      </div>
                      {vendor.status === "pending" && vendorId && (
                        <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/70 p-3">
                          <p className="text-xs leading-relaxed text-amber-950">{te ? "రిసీట్ మరియు మొత్తాన్ని బ్యాంక్ రికార్డుతో సరిపోల్చండి. సిస్టమ్ చెల్లింపును స్వతంత్రంగా ధృవీకరించదు; చెల్లింపు business identity verification కాదు." : "Match the receipt and amount against the bank record. This system cannot independently verify payment; payment is not business identity verification."}</p>
                          <label htmlFor={`vendor-utr-${vendorId}`} className="block text-xs font-bold text-slate-700">
                            {te ? "నిజమైన payment reference / UTR" : "Actual payment reference / UTR"}
                            <input id={`vendor-utr-${vendorId}`} maxLength={64} value={vendorUtrById[vendorId] || ""} onChange={(event) => setVendorUtrById((current) => ({ ...current, [vendorId]: event.target.value }))} className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 font-mono text-sm" autoComplete="off" />
                          </label>
                          <label htmlFor={`vendor-reason-${vendorId}`} className="block text-xs font-bold text-slate-700">
                            {te ? "తిరస్కరణ కారణం (తిరస్కరించడానికి అవసరం)" : "Rejection reason (required to reject)"}
                            <input id={`vendor-reason-${vendorId}`} maxLength={500} value={vendorReasonById[vendorId] || ""} onChange={(event) => setVendorReasonById((current) => ({ ...current, [vendorId]: event.target.value }))} className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm" />
                          </label>
                          <div className="flex flex-wrap gap-2">
                            <button type="button" disabled={busyId === vendorId} onClick={() => void handleVendorAction(vendorId, "approve")} className="min-h-11 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{te ? "రిసీట్ సమీక్ష తర్వాత approve" : "Approve after receipt review"}</button>
                            <button type="button" disabled={busyId === vendorId} onClick={() => void handleVendorAction(vendorId, "reject")} className="min-h-11 rounded-xl bg-rose-700 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{te ? "కారణంతో తిరస్కరించండి" : "Reject with reason"}</button>
                          </div>
                        </div>
                      )}
                      {vendor.status === "active" && vendorId && <button type="button" disabled={busyId === vendorId} onClick={() => void handleVendorAction(vendorId, "expire")} className="min-h-11 rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 disabled:opacity-50">{te ? "లిస్టింగ్‌ను ముగించండి" : "Expire listing"}</button>}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
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
                      {paymentVerified && sp.status === "pending_review" && (
                        <div className="space-y-2">
                          <label htmlFor={`spotlight-media-audit-${sp.promo_id}`} className="block text-xs font-bold text-slate-700">
                            {te ? "ప్రొఫైల్/మీడియాలో సమీక్షించిన అంశాల audit note నమోదు చేయండి; ఇది identity verification కాదు" : "Record what you reviewed in the profile/media; this is not identity verification"}
                          </label>
                          <textarea id={`spotlight-media-audit-${sp.promo_id}`} value={spMediaNotes[sp.promo_id] || ""}
                            onChange={(e) => setSpMediaNotes((prev) => ({ ...prev, [sp.promo_id]: e.target.value.slice(0, 300) }))}
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
                          <button type="button" onClick={() => spotlightAction(sp.promo_id, "approve")} disabled={busyId === sp.promo_id || (spMediaNotes[sp.promo_id] || "").trim().length < 8}
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
        {/* Member Stories Tab — the queue behind the homepage story strip */}
        {tab === "stories" && owner && (
          <section className="space-y-4">
            <div className="rounded-2xl border border-gold/30 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-sm font-black text-maroon">
                  {te ? "సభ్యుల కథలు — ప్రచురణ సమీక్ష" : "Member stories — publication review"}
                </h2>
                <div className="flex flex-wrap gap-2">
                  {["pending", "approved", "rejected"].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setStoryStatus(value)}
                      aria-pressed={storyStatus === value}
                      className={`min-h-9 rounded-full border px-3 text-xs font-bold ${
                        storyStatus === value
                          ? "border-maroon bg-maroon text-white"
                          : "border-gold/40 bg-cream text-maroon"
                      }`}
                    >
                      {value === "pending" ? (te ? "సమీక్షలో" : "Pending")
                        : value === "approved" ? (te ? "ప్రచురితం" : "Approved")
                        : (te ? "తిరస్కరించినవి" : "Rejected")}
                    </button>
                  ))}
                </div>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                {te
                  ? "ఆమోదం అనేది ప్రచురణ నిర్ణయం మాత్రమే: ఇది గుర్తింపు, సంబంధం లేదా సమ్మతిని ధృవీకరించదు. పేర్లు సభ్యుడు ఇచ్చినవే. సందేహం ఉంటే తిరస్కరించండి."
                  : "Approval is a publication decision only: it does not verify identity, relationship or consent. Names are whatever the submitter supplied. When in doubt, reject."}
              </p>
            </div>

            {storyQueue.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gold/40 bg-white p-8 text-center text-sm text-slate-600">
                {te ? "ఈ స్థితిలో ఏ కథలూ లేవు." : "No stories in this state."}
              </div>
            ) : (
              storyQueue.map((story) => (
                <article key={story.story_id} className="rounded-2xl border border-gold/25 bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs font-black text-maroon">{story.story_id}</div>
                    <div className="text-[11px] text-slate-500">
                      {story.couple_names ? `${story.couple_names} · ` : ""}
                      {story.district || (te ? "జిల్లా లేదు" : "no district")}
                      {story.tsap_id ? ` · ${story.tsap_id}` : ""}
                    </div>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-slate-700">{story.text}</p>
                  {story.review_note ? (
                    <p className="mt-2 text-[11px] text-slate-500">
                      {te ? "గత సమీక్ష గమనిక: " : "Last review note: "}{story.review_note}
                    </p>
                  ) : null}
                  <input
                    value={storyNotes[story.story_id] || ""}
                    onChange={(e) => setStoryNotes((current) => ({ ...current, [story.story_id]: e.target.value }))}
                    placeholder={te ? "సమీక్ష గమనిక (తిరస్కరణకు తప్పనిసరి)" : "Review note (required to reject)"}
                    aria-label={te ? "సమీక్ష గమనిక" : "Review note"}
                    className="mt-3 min-h-11 w-full rounded-xl border border-gold/30 bg-cream px-3 text-[13px]"
                  />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busyId === story.story_id}
                      onClick={() => storyAction(story, "approve")}
                      className="min-h-11 rounded-full bg-maroon px-4 text-xs font-black text-white disabled:opacity-60"
                    >
                      {te ? "ప్రచురించు" : "Approve & publish"}
                    </button>
                    <button
                      type="button"
                      disabled={busyId === story.story_id}
                      onClick={() => storyAction(story, "reject")}
                      className="min-h-11 rounded-full border border-slate-300 px-4 text-xs font-black text-slate-700 disabled:opacity-60"
                    >
                      {te ? "తిరస్కరించు" : "Reject"}
                    </button>
                  </div>
                </article>
              ))
            )}
          </section>
        )}

        {tab === "referrals" && financeAccess && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gold/30 shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-[#7A0C2E] flex items-center gap-2">
                    <span>🤝</span>
                    <span>{tr("రెఫరల్ భాగస్వాములు & చెల్లింపు అభ్యర్థనల సమీక్ష", "Referral partners and payout review")}</span>
                  </h2>
                  <p className="text-xs text-slate-600 mt-1">
                    {tr("వినియోగదారులు మరియు భాగస్వాముల చెల్లింపు అభ్యర్థనలు. UPI వివరాలను పరిశీలించి, చెల్లింపు పూర్తైన తర్వాత నిజమైన UTR నమోదు చేసి స్థితిని నవీకరించండి. WhatsApp సందేశం విడిగా పంపాలి.", "Payout requests from users and partners. Review UPI details, enter the actual UTR only after settlement, and update the status. WhatsApp messages are sent separately.")}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500">{tr("ఫిల్టర్:", "Filter:")}</span>
                  {[
                    { id: "all", label: tr("అన్నీ", "All") },
                    { id: "requested", label: tr("⏳ పెండింగ్", "⏳ Pending") },
                    { id: "paid", label: tr("✅ చెల్లించినవి", "✅ Paid") },
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
                  <span>{tr("ప్రస్తుతం చెల్లింపు అభ్యర్థనలు లేవు", "There are no payout requests right now.")}</span>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {payouts.map((po) => {
                    const isPending = po.status === "requested";
                    const isPaid = po.status === "paid";
                    const recipientPhone = po.tsap_id ? directoryProfiles.find((x) => x.tsap_id === po.tsap_id)?.phone || "" : "";
                    const payoutMessage = tr(`🎉 శుభవార్త ${po.name} గారు!\n\nమన వివాహ రిఫరల్ ప్రోగ్రామ్ ద్వారా ₹${po.amount} చెల్లింపు మీ UPI ఖాతాకు పంపబడింది.\n${po.utr ? `UTR: ${po.utr}\n` : ""}\nవివరాలు: https://manavivaha.in/referral`, `🎉 Good news, ${po.name}!\n\nYour ₹${po.amount} payout through the Mana Vivaha referral program has been processed to your UPI account.\n${po.utr ? `UTR: ${po.utr}\n` : ""}\nDetails: https://manavivaha.in/referral`);
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
                            <span className="text-slate-500 font-bold">{tr("చెల్లింపు విధానం:", "Payment method:")}</span>
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
                                  <span>{tr(`PhonePe / Google Pay ద్వారా చెల్లించండి (₹${po.amount})`, `Pay via PhonePe / Google Pay (₹${po.amount})`)}</span>
                                </a>
                              )}
                            </div>

                            <div className="flex gap-2">
                              {/* Approve & Settle Payout */}
                              <button type="button"
                                onClick={() => {
                                  const customUtr = prompt(tr("నిజమైన బ్యాంక్ / UPI రసీదులోని UTR నమోదు చేయండి. నిర్ధారించని చెల్లింపును ఆమోదించవద్దు:", "Enter the UTR from the actual bank / UPI receipt. Do not approve an unverified payment:"), "");
                                  if (customUtr?.trim()) payoutAction(po.id, "approve", customUtr.trim());
                                }}
                                disabled={busyId === po.id}
                                className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-sm transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1"
                              >
                                <span>✓</span>
                                <span>{tr("చెల్లింపు పూర్తైనట్లు ఆమోదించండి", "Approve settled payout")}</span>
                              </button>

                              {/* Reject Button */}
                              <button type="button"
                                aria-label={te ? "చెల్లింపును తిరస్కరించండి" : "Reject payout"}
                                onClick={() => {
                                  const reason = prompt(tr("తిరస్కరణకు కారణం నమోదు చేయండి:", "Enter a reason for rejection:"), "");
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
                              <span>{tr("వినియోగదారుకు WhatsApp చెల్లింపు సమాచారం పంపండి", "Send payout details on WhatsApp")}</span>
                            </a>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 🤝 Full referral report — every referrer, their wallet state and per-join ledger.
                Admin-only data (names/phones live here, never in the public partner feed). */}
            <div className="bg-white rounded-3xl p-4 sm:p-5 border border-gold/30 shadow-sm">
              <ReferralReport />
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
                        <h3 className="font-black text-sm text-rose-700">🚩 {te ? (r.category_telugu || r.category) : apiDisplayMessage({ message_en: r.category_en, message: r.category }, false, "Report category")}</h3>
                        <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold uppercase text-rose-800">{r.severity || "unrated"}</span>
                        <span className="text-[10px] text-slate-500">Allegation under review</span>
                      </div>
                      <p className="break-words text-xs text-slate-700">{te ? (r.detail || "అదనపు వివరాలు ఇవ్వలేదు.") : apiDisplayMessage({ detail_en: r.detail_en, detail: r.detail }, false, "Report details are not available in English.")}</p>
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
            <h3 className="font-black text-lg text-[#7A0C2E]">{tr(`💰 మొత్తం రాబడి: ₹${an.revenue.total}`, `💰 Total revenue: ₹${an.revenue.total}`)}</h3>
            <div className="grid md:grid-cols-2 gap-5">
              <Donut items={an.revenue.plan_split} />
              <BarList items={an.revenue.plan_split} />
            </div>
          </div>
        )}

        {/* Audit Tab (Owner only) */}
        {tab === "audit" && owner && an.audit && (
          <div className="bg-white rounded-3xl p-6 border border-gold/30 space-y-3">
            <h3 className="font-black text-base text-navy">📝 {tr("ఇటీవలి ఆడిట్ లాగ్", "Recent audit log")}</h3>
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
                  <span>{selectedProfiles.length} {tr("ప్రొఫైళ్లు ఎంపికయ్యాయి", "profiles selected")}</span>
                </span>

                <div className="flex items-center bg-slate-100 rounded-xl p-0.5 text-[11px] font-bold">
                  <button type="button"
                    onClick={() => setNotepadFormat("simple")}
                    className={`px-2.5 py-1 rounded-lg transition ${
                      notepadFormat === "simple" ? "bg-white text-maroon shadow-xs" : "text-slate-600"
                    }`}
                  >
                    {tr("పేరు — నంబర్ (సాధారణం)", "Name — number (simple)")}
                  </button>
                  <button type="button"
                    onClick={() => setNotepadFormat("detailed")}
                    className={`px-2.5 py-1 rounded-lg transition ${
                      notepadFormat === "detailed" ? "bg-white text-maroon shadow-xs" : "text-slate-600"
                    }`}
                  >
                    {tr("వివరాలతో", "Detailed")}
                  </button>
                </div>

                <button type="button"
                  onClick={() => setIsNotepadMinimized(!isNotepadMinimized)}
                  className="text-xs text-slate-500 hover:text-maroon underline font-bold"
                >
                  {isNotepadMinimized ? tr("🔼 నోట్‌ప్యాడ్ చూపించు", "🔼 Show notepad") : tr("🔽 దాచు", "🔽 Hide") }
                </button>
              </div>

              {/* Right: WhatsApp Phone Input & 1-Click Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                
                {/* Recipient WhatsApp Phone Input */}
                <input aria-label={tr("స్వీకర్త WhatsApp నంబర్", "Recipient WhatsApp number")}
                  type="text"
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  placeholder={tr("స్వీకర్త WhatsApp నంబర్", "Recipient WhatsApp number")}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-mono font-bold focus:border-maroon focus:outline-none w-44"
                />

                {/* 1. Copy Notepad List Button */}
                <button type="button"
                  onClick={copyNotepadToClipboard}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 text-white font-extrabold text-xs shadow-xs hover:bg-slate-900 active:scale-95 transition flex items-center gap-1"
                  title="Copy formatted contact list to clipboard"
                >
                  <span>📋</span>
                  <span>{tr("కాపీ చేయండి", "Copy")}</span>
                </button>

                {/* 2. WhatsApp Button: Profiles ONLY (Privacy Safe) */}
                <button type="button"
                  onClick={() => shareWhatsApp(false)}
                  className="px-3.5 py-2 rounded-xl bg-amber-500 text-white font-extrabold text-xs shadow-xs hover:bg-amber-600 active:scale-95 transition flex items-center gap-1"
                  title="Share profile cards without exposing phone numbers"
                >
                  <span>📲</span>
                  <span>{tr("WhatsApp (నంబర్లు లేకుండా)", "WhatsApp (no phone numbers)")}</span>
                </button>

                {/* 3. WhatsApp Button: Profiles + PHONE NUMBERS */}
                <button type="button"
                  onClick={() => shareWhatsApp(true)}
                  className="px-3.5 py-2 rounded-xl bg-[#25D366] text-white font-black text-xs shadow-xs hover:brightness-105 active:scale-95 transition flex items-center gap-1.5"
                  title="Share profile cards WITH full phone numbers"
                >
                  <span>💬</span>
                  <span>{tr("WhatsApp + నంబర్లు", "WhatsApp + phone numbers")}</span>
                </button>

                {/* 4. Telegram Share Button */}
                <button type="button"
                  onClick={shareTelegram}
                  className="px-3 py-2 rounded-xl bg-[#229ED9] text-white font-extrabold text-xs shadow-xs hover:brightness-105 active:scale-95 transition"
                  title="Broadcast to Telegram Channel"
                >
                  📢
                </button>

                {/* Clear Selection */}
                <button type="button"
                  aria-label={te ? "ఎంపికలను తొలగించండి" : "Clear selection"}
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
                    <span>📝 {tr("నోట్‌ప్యాడ్ ప్రివ్యూ", "Notepad preview")}</span>
                    <span className="font-mono text-emerald-700">✅ {tr("సవరించడానికి / కాపీ చేయడానికి / WhatsApp ద్వారా పంపడానికి సిద్ధం", "Ready to edit, copy, or share on WhatsApp")}</span>
                  </div>
                  <textarea
                    rows={3}
                    readOnly
                    aria-label={tr("రూపొందించిన నోట్", "Generated note")}
                    value={generatedNotepadText}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#7A0C2E]/40 select-all"
                  />
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 block">✍️ {tr("అదనపు గమనిక", "Additional note")}</span>
                  <textarea aria-label={tr("ఉదా: సభ్యులు అందించిన వివరాలను కుటుంబంతో పరిశీలించండి; జాతక సూచికను విడిగా నిర్ధారించండి…", "e.g. Review member-provided details with the family; verify any horoscope reference separately…")}
                    rows={3}
                    value={notepadNote}
                    onChange={(e) => setNotepadNote(e.target.value)}
                    placeholder={tr("ఉదా: సభ్యులు అందించిన వివరాలను కుటుంబంతో పరిశీలించండి; జాతక సూచికను విడిగా నిర్ధారించండి…", "e.g. Review member-provided details with the family; verify any horoscope reference separately…")}
                    className="w-full p-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 focus:border-maroon focus:outline-none focus:ring-2 focus:ring-[#7A0C2E]/40"
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
                  <h3 className="font-black text-navy text-base">{tr("ప్లాన్ క్రెడిట్‌లను యాక్టివేట్ చేయండి", "Activate plan credits")}</h3>
                  <p className="text-xs text-slate-500 font-mono">
                    {upgradeModal.name} • <span className="text-maroon font-bold">{upgradeModal.tsapId}</span> • 📞 {upgradeModal.phone || "—"}
                  </p>
                </div>
              </div>
              <button aria-label={te ? "మూసివేయండి" : "Close"} type="button"
                onClick={() => setUpgradeModal(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            <div className="bg-amber-50 rounded-2xl p-3 border border-amber-200 text-xs text-amber-950 flex items-start gap-2">
              <span className="text-base shrink-0">💡</span>
              <p className="leading-relaxed">
                {tr("నిజమైన చెల్లింపు మూలం / UTRను నమోదు చేసిన తర్వాత మాత్రమే ప్లాన్‌ను యాక్టివేట్ చేయండి. ఇది interest-request క్రెడిట్‌లను మాత్రమే జోడిస్తుంది; ప్రొఫైల్ ఆమోదం, ఫోటో సమీక్ష లేదా గుర్తింపు ధృవీకరణ వేరుగా ఉంటాయి. ఉచిత ప్రోత్సాహకాలకు రిఫరల్ రివార్డు వర్తించదు.", "Enter an actual payment source and UTR before activating a paid plan. This adds interest-request credits only; profile approval, photo review, and identity verification are separate. Complimentary grants do not trigger referral rewards.")}
              </p>
            </div>

            {/* Plan selection cards */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">1. {tr("ప్లాన్‌ను ఎంచుకోండి", "Select a plan")}:</label>
              
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
                  <div className="text-[10px] text-slate-500 mt-1">{tr("5 సంబంధ అభ్యర్థనలు • 30 రోజులు", "5 interest requests • 30 days")}</div>
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
                  <div className="text-[10px] text-slate-500 mt-1">{tr("12 సంబంధ అభ్యర్థనలు • 45 రోజులు", "12 interest requests • 45 days")}</div>
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
                  <div className="text-[10px] text-slate-500 mt-1">{tr("25 సంబంధ అభ్యర్థనలు • 60 రోజులు • యాక్టివ్‌గా ఉన్నప్పుడు ప్రొఫైల్‌ను చూసిన వారి పేర్లు", "25 interest requests • 60 days • Names of profile viewers while active")}</div>
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
                  <div className="text-[10px] text-slate-500 mt-1">{tr("50 సంబంధ అభ్యర్థనలు • 90 రోజులు • యాక్టివ్‌గా ఉన్నప్పుడు ప్రొఫైల్‌ను చూసిన వారి పేర్లు", "50 interest requests • 90 days • Names of profile viewers while active")}</div>
                </button>
              </div>


            </div>

            {/* Payment Mode Selector */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-bold text-slate-700 block">2. {tr("చెల్లింపు మూలం", "Payment source")}:</label>
              <select aria-label={tr("చెల్లింపు విధానం", "Payment mode")}
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
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold focus:border-maroon focus:outline-none focus:ring-2 focus:ring-[#7A0C2E]/40"
              >
                <option value="">{tr("చెల్లింపు మూలాన్ని ఎంచుకోండి", "Select payment source")}</option>
                <option value="UPI_QR">📱 {tr("UPI / QR చెల్లింపు", "UPI / QR payment")}</option>
                <option value="PHONEPE">🟣 PhonePe Transfer</option>
                <option value="GPAY">🔵 Google Pay</option>
                <option value="BANK_TRANSFER">🏦 Direct Bank Transfer / NetBanking</option>
                <option value="CASH">💵 Cash / Offline Office Payment</option>
                <option value="ADMIN_COMPLIMENTARY">🎁 {tr("అడ్మిన్ ఉచిత ప్రోత్సాహం", "Admin complimentary grant")}</option>
              </select>
            </div>

            {/* UTR & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-0.5">UTR / {tr("లావాదేవీ నంబర్ (ఐచ్ఛికం)", "transaction reference (optional")}):</label>
                  <input aria-label={tr("చెల్లింపు రిఫరెన్స్ ఉంటే నమోదు చేయండి", "Enter the payment reference, if available")}
                    type="text"
                    value={grantUtr}
                    onChange={(e) => setGrantUtr(e.target.value)}
                    placeholder={tr("చెల్లింపు రిఫరెన్స్ ఉంటే నమోదు చేయండి", "Enter the payment reference, if available")}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-mono focus:border-maroon focus:outline-none focus:ring-2 focus:ring-[#7A0C2E]/40"
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
                {tr("మొదటి అర్హత కలిగిన చెల్లింపు ప్లాన్‌కే ₹50 రిఫరల్ వాలెట్ రివార్డు వర్తిస్తుంది; ఉచిత ప్రోత్సాహం లేదా పునరావృత చెల్లింపులకు కాదు.", "The ₹50 referral wallet reward applies only to the first eligible paid plan, not complimentary grants or repeat payments.")}
              </label>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setUpgradeModal(null)}
                className="flex-1 py-2.5 rounded-2xl border border-slate-300 font-bold text-xs text-slate-600 hover:bg-slate-100 transition"
              >
                {tr("రద్దు చేయండి", "Cancel")}
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
                {busyId === upgradeModal.tsapId ? tr("యాక్టివేట్ అవుతోంది…", "Activating…") : tr("✓ ప్లాన్ క్రెడిట్‌లను యాక్టివేట్ చేయండి", "✓ Activate plan credits")}
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
              <h3 className="font-black text-navy text-lg">{tr("ప్లాన్ విజయవంతంగా యాక్టివేట్ అయింది!", "Plan activated successfully")}</h3>
              <p className="text-xs text-slate-600">
                {tr(<><b>{activatedSuccessModal.name}</b> ({activatedSuccessModal.tsapId}) కి <b>{activatedSuccessModal.plan}</b> ప్లాన్ క్రెడిట్‌లు జోడించబడ్డాయి. ప్రొఫైల్ ఆమోదం / గుర్తింపు ధృవీకరణ వేరుగా ఉంటాయి.</>, <><b>{activatedSuccessModal.name}</b> ({activatedSuccessModal.tsapId}) received credits for <b>{activatedSuccessModal.plan}</b>. Profile approval and identity verification are separate.</>)}
              </p>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>📲 {tr("వినియోగదారుకు WhatsApp నిర్ధారణ సందేశం:", "WhatsApp confirmation message:")}</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(activatedSuccessModal.waMessage);
                    flash(tr("✅ WhatsApp సందేశం కాపీ అయింది.", "✅ WhatsApp message copied."));
                  }}
                  className="text-emerald-700 hover:text-emerald-800 text-[11px] font-black underline"
                >
                  {tr("కాపీ చేయండి", "Copy")}
                </button>
              </div>
              <textarea
                rows={5}
                readOnly
                aria-label={tr("WhatsApp సందేశం", "WhatsApp message")}
                value={activatedSuccessModal.waMessage}
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 font-sans leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#7A0C2E]/40"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setActivatedSuccessModal(null)}
                className="flex-1 py-2.5 rounded-2xl border border-slate-300 font-bold text-xs text-slate-600 hover:bg-slate-100 transition"
              >
                {tr("ముగించు", "Close")}
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
                  <span>{tr("WhatsApp ద్వారా పంపండి", "Send on WhatsApp")}</span>
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
              <Image
                src={previewPhotoModal.url}
                alt={previewPhotoModal.name}
                width={1000}
                height={800}
                unoptimized
                className="max-w-full max-h-[500px] object-contain"
              />
              <button aria-label={te ? "మూసివేయండి" : "Close"}
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
                {tr("మూసివేయండి", "Close")}
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
                  <h3 className="font-black text-navy text-base">{tr("WhatsApp ప్రపోజల్ బిల్డర్", "WhatsApp proposal builder")}</h3>
                  <p className="text-xs text-slate-500">
                    {tr(`${proposalBatchModal.candidate?.full_name} (${proposalBatchModal.candidate?.tsap_id}) కోసం ప్రొఫైల్ సూచనలు`, `Profile suggestions for ${proposalBatchModal.candidate?.full_name} (${proposalBatchModal.candidate?.tsap_id})`)}
                  </p>
                </div>
              </div>
              <button aria-label={te ? "మూసివేయండి" : "Close"} type="button"
                onClick={() => setProposalBatchModal(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            {/* Template Selector Pills */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">1. {tr("ప్రపోజల్ టెంప్లేట్‌ను ఎంచుకోండి:", "Choose a proposal template:")}</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "parents" as const, label: tr("👨‍👩‍👧 తల్లిదండ్రుల కోసం", "👨‍👩‍👧 For parents") },
                  { id: "direct" as const, label: tr("💍 నేరుగా ప్రొఫైల్ వివరాలు", "💍 Direct profile details") },
                  { id: "vip" as const, label: tr("👑 ప్రత్యేక పరిచయం", "👑 Featured introduction") },
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
                <label className="text-[11px] font-bold text-slate-600 block mb-1">📞 {tr("పంపాల్సిన WhatsApp నంబర్:", "WhatsApp recipient number:")}</label>
                <input aria-label={tr("సభ్యుడు అందించిన 10 అంకెల నంబర్", "10-digit number provided by the member")}
                  type="text"
                  value={proposalBatchModal.recipientPhone}
                  onChange={(e) => setProposalBatchModal({ ...proposalBatchModal, recipientPhone: e.target.value })}
                  placeholder={tr("సభ్యుడు అందించిన 10 అంకెల నంబర్", "10-digit number provided by the member")}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono font-bold focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-[#7A0C2E]/40"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">📝 {tr("ప్రత్యేక సూచనలు / గమనిక (ఐచ్ఛికం):", "Custom note (optional):")}</label>
                <input aria-label={tr("ఉదా: సంప్రదింపు సమయం లేదా అదనపు సూచనను నమోదు చేయండి", "e.g. Add a preferred contact time or other note")}
                  type="text"
                  value={proposalBatchModal.customNote}
                  onChange={(e) => setProposalBatchModal({ ...proposalBatchModal, customNote: e.target.value })}
                  placeholder={tr("ఉదా: సంప్రదింపు సమయం లేదా అదనపు సూచనను నమోదు చేయండి", "e.g. Add a preferred contact time or other note")}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-[#7A0C2E]/40"
                />
              </div>
            </div>

            {/* Generated Live Proposal Message Preview */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>📲 {tr("WhatsApp సందేశ ప్రివ్యూ:", "WhatsApp message preview:")}</span>
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
                    flash(tr("✅ ప్రపోజల్ సందేశం కాపీ అయింది.", "✅ Proposal message copied."));
                  }}
                  className="text-emerald-700 hover:text-emerald-800 text-[11px] font-black underline flex items-center gap-1"
                >
                  <span>📋</span>
                  <span>{tr("కాపీ చేయండి", "Copy")}</span>
                </button>
              </div>
              <textarea
                rows={9}
                readOnly
                aria-label={tr("ప్రతిపాదన సందేశం", "Proposal message")}
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
                {tr("రద్దు చేయండి", "Cancel")}
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
                  flash(tr("✅ ప్రపోజల్ టెక్స్ట్ కాపీ అయింది.", "✅ Proposal text copied."));
                }}
                className="py-2.5 px-4 rounded-2xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs shadow-xs transition"
              >
                📋 {tr("టెక్స్ట్ కాపీ చేయండి", "Copy text")}
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
                <span>{tr("WhatsApp ద్వారా పంపండి", "Send on WhatsApp")}</span>
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
                  <h3 className="font-black text-navy text-base">{tr("మన వివాహ — ప్రింట్ షీట్", "Mana Vivaha — Print sheet")}</h3>
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
                  <span>{tr("ప్రింట్ చేయండి / PDF సేవ్ చేయండి", "Print / save PDF")}</span>
                </button>
                <button aria-label={te ? "మూసివేయండి" : "Close"} type="button"
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
                  <div className="w-10 h-10 rounded-xl bg-maroon text-white flex items-center justify-center text-xl font-black" aria-hidden="true">
                    {te ? "వి" : "MV"}
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-maroon">{te ? "మన వివాహ" : "Mana Vivaha"}</h2>
                    <p className="text-[10px] text-slate-500 font-bold">{tr("తెలుగు వివాహ పరిచయ వేదిక", "Telugu matrimony platform")}</p>
                  </div>
                </div>
                <div className="text-right text-xs">
                  {SITE_CONFIG.supportPhoneDisplay ? <div className="font-bold text-slate-700">Support: {SITE_CONFIG.supportPhoneDisplay}</div> : null}
                  <div className="text-[10px] text-slate-500">{tr("తేదీ:", "Date:")} {new Date().toLocaleDateString(te ? "te-IN" : "en-IN")}</div>
                </div>
              </div>

              <div className="text-center">
                <h3 className="text-sm font-black text-navy">{printSheetModal.title}</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">{tr("మొత్తం ప్రొఫైళ్లు:", "Total profiles:")} {printSheetModal.profiles.length}</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px] border-collapse border border-slate-300">
                  <thead className="bg-slate-100 text-slate-800 font-bold">
                    <tr>
                      <th className="border border-slate-300 p-2 text-center">{tr("క్రమ సంఖ్య", "No.")}</th>
                      <th className="border border-slate-300 p-2">{tr("TSAP ID / పేరు", "TSAP ID / name")}</th>
                      <th className="border border-slate-300 p-2">{tr("లింగం / వయస్సు", "Gender / age")}</th>
                      <th className="border border-slate-300 p-2">{tr("కమ్యూనిటీ & గోత్రం", "Community & gothram")}</th>
                      <th className="border border-slate-300 p-2">{tr("విద్య & వృత్తి", "Education & occupation")}</th>
                      <th className="border border-slate-300 p-2">{tr("ఆదాయం / ప్రాంతం", "Income / location")}</th>
                      <th className="border border-slate-300 p-2">{tr("ఫోన్ నంబర్", "Phone number")}</th>
                      <th className="border border-slate-300 p-2 text-center">{tr("ప్లాన్ స్థితి", "Plan status")}</th>
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
                          <div>{p.gender === "Bride" ? `👰 ${tr("వధువు", "Bride")}` : p.gender === "Groom" ? `🤵 ${tr("వరుడు", "Groom")}` : "—"}</div>
                          <div className="text-slate-500">{p.age ? `${p.age} ${tr("సం.", "years")}` : "—"}</div>
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
                {tr("ఈ సమాచారం వివాహ సంబంధాల పరిశీలన కోసం మాత్రమే. దయచేసి గోప్యత పాటించండి. • మన వివాహ © 2026", "For matrimonial review only. Please respect privacy. • Mana Vivaha © 2026")}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 print:hidden">
              <button
                type="button"
                onClick={() => setPrintSheetModal(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 font-bold text-xs text-slate-600 hover:bg-slate-100 transition"
              >
                {tr("ముగించు", "Close")}
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2 rounded-xl bg-maroon text-white font-extrabold text-xs shadow-md hover:brightness-110 transition flex items-center gap-1.5"
              >
                <span>🖨️</span>
                <span>{tr("ప్రింట్ చేయండి / PDFగా సేవ్ చేయండి", "Print / save as PDF")}</span>
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
                  <h3 className="font-black text-navy text-base">{tr("కౌన్సిలర్ CRM & కాల్ లాగ్", "Counsellor CRM and call log")}</h3>
                  <p className="text-xs text-slate-500 font-mono">
                    {counselorModal.name} • <span className="text-maroon font-bold">{counselorModal.tsapId}</span> • 📞 {counselorModal.phone || "—"}
                  </p>
                </div>
              </div>
              <button aria-label={te ? "మూసివేయండి" : "Close"} type="button"
                onClick={() => setCounselorModal(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            {/* Quick WhatsApp Nudge Buttons */}
            {counselorModal.phone && (
              <div className="space-y-1.5 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <span className="text-[11px] font-bold text-slate-600 block">⚡ {tr("WhatsApp సందేశ టెంప్లేట్‌లు:", "WhatsApp message templates:")}</span>
                <div className="flex flex-wrap gap-1.5">
                  <a
                    href={whatsappPhoneLink(counselorModal.phone, tr(`💐 నమస్కారం ${counselorModal.name} గారు!\nమన వివాహ (Mana Vivaha) నుంచి సంప్రదిస్తున్నాం. ప్రొఫైల్‌ను స్పష్టంగా చూపించడానికి మీకు ఇష్టమైతే ఫోటోను అప్‌లోడ్ చేయండి:\nhttps://manavivaha.in/me`, `💐 Hello ${counselorModal.name}, this is Mana Vivaha. If you wish, you can add a photo to your profile to help members review it:\nhttps://manavivaha.in/me`)) || undefined}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 text-[11px] font-bold flex items-center gap-1 transition"
                  >
                    <span>📸</span> <span>{tr("ఫోటో గురించి", "Photo reminder")}</span>
                  </a>

                  <a
                    href={whatsappPhoneLink(counselorModal.phone, tr(`💐 నమస్కారం ${counselorModal.name} గారు!\nజాతక reference కోసం మీకు తెలిసిన నక్షత్రం, రాశి మరియు గోత్రం వివరాలను ఇక్కడ నవీకరించండి. ఇవి verified chart కాదు:\nhttps://manavivaha.in/me`, `💐 Hello ${counselorModal.name}, you can update your known nakshatram, rasi, and gothram details here as member-entered references; they are not a verified chart:\nhttps://manavivaha.in/me`)) || undefined}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-900 text-[11px] font-bold flex items-center gap-1 transition"
                  >
                    <span>🪔</span> <span>{tr("జాతక వివరాలు", "Horoscope details")}</span>
                  </a>

                  <a
                    href={whatsappPhoneLink(counselorModal.phone, tr(`💐 నమస్కారం ${counselorModal.name} గారు!\nప్రస్తుత ప్లాన్ వివరాలను ఇక్కడ చూడండి. సంప్రదింపు వివరాల ప్రాప్యత సమ్మతి మరియు సేవా నిబంధనలకు లోబడి ఉంటుంది; సంబంధం లేదా ధృవీకరణకు హామీ లేదు:\nhttps://manavivaha.in/pricing`, `💐 Hello ${counselorModal.name}, view current plans and prices here. Access to contact details is subject to consent and service terms; no match or verification is guaranteed:\nhttps://manavivaha.in/pricing`)) || undefined}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-900 text-[11px] font-bold flex items-center gap-1 transition"
                  >
                    <span>👑</span> <span>{tr("₹99 నుంచి ప్లాన్‌లు", "Plans from ₹99")}</span>
                  </a>

                  <a
                    href={whatsappPhoneLink(counselorModal.phone, tr(`💐 నమస్కారం ${counselorModal.name} గారు!\nమీకు చూపిన ప్రొఫైల్‌లను ఇక్కడ పరిశీలించండి:\nhttps://manavivaha.in/matches`, `💐 Hello ${counselorModal.name}, review the profiles shown to you here:\nhttps://manavivaha.in/matches`)) || undefined}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-900 text-[11px] font-bold flex items-center gap-1 transition"
                  >
                    <span>💍</span> <span>{tr("ప్రొఫైల్‌లను చూడండి", "Browse profiles")}</span>
                  </a>
                </div>
              </div>
            )}

            {/* Stage Selector */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">1. {tr("సంప్రదింపు దశ:", "Contact stage:")}</label>
              <select aria-label={tr("దశ", "Stage")}
                value={counselorModal.newStage}
                onChange={(e) => setCounselorModal({ ...counselorModal, newStage: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-[#7A0C2E]/40"
              >
                <option value="new_lead">🌟 {tr("కొత్త లీడ్", "New lead")}</option>
                <option value="call_scheduled">📞 {tr("కాల్ షెడ్యూల్ అయింది", "Call scheduled")}</option>
                <option value="spoke_interested">💬 {tr("కుటుంబంతో మాట్లాడాం — ఆసక్తి ఉంది", "Spoke with family — interested")}</option>
                <option value="proposal_sent">💌 {tr("ప్రొఫైల్ సూచనలు పంపాం", "Profile suggestions sent")}</option>
                <option value="negotiation">🤝 {tr("ప్లాన్ చర్చలో ఉంది", "Plan discussion")}</option>
                <option value="paid_vip">👑 {tr("చెల్లింపు ప్లాన్", "Paid plan")}</option>
                <option value="matched_married">💍 {tr("వివాహం కుదిరింది", "Married")}</option>
                <option value="not_interested">❌ {tr("ఆసక్తి లేదు", "Not interested")}</option>
              </select>
            </div>

            {/* Note & Callback Date */}
            <div className="space-y-2">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">2. {tr("సంభాషణ గమనికలు:", "Conversation notes:")}</label>
                <textarea aria-label={tr("సంభాషణలో జరిగినదాన్ని, సభ్యుడు తెలిపిన ప్రాధాన్యతలను మరియు తదుపరి చర్యను నమోదు చేయండి…", "Record what was discussed, the member’s stated preferences, and the next action…")}
                  rows={3}
                  value={counselorModal.newNote}
                  onChange={(e) => setCounselorModal({ ...counselorModal, newNote: e.target.value })}
                  placeholder={tr("సంభాషణలో జరిగినదాన్ని, సభ్యుడు తెలిపిన ప్రాధాన్యతలను మరియు తదుపరి చర్యను నమోదు చేయండి…", "Record what was discussed, the member’s stated preferences, and the next action…")}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-[#7A0C2E]/40"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-0.5">📅 {tr("తదుపరి సంప్రదింపు సమయం:", "Next follow-up date / time:")}</label>
                <input aria-label={tr("తేదీ, సమయాన్ని నమోదు చేయండి (YYYY-MM-DD HH:MM)", "Enter date and time (YYYY-MM-DD HH:MM)")}
                  type="text"
                  value={counselorModal.callbackAt}
                  onChange={(e) => setCounselorModal({ ...counselorModal, callbackAt: e.target.value })}
                  placeholder={tr("తేదీ, సమయాన్ని నమోదు చేయండి (YYYY-MM-DD HH:MM)", "Enter date and time (YYYY-MM-DD HH:MM)")}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-[#7A0C2E]/40"
                />
              </div>
            </div>

            {/* Previous History Timeline */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-700 block">📜 {tr("సంప్రదింపుల చరిత్ర:", "Contact history:")}</span>
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
                        <div className="text-[10px] text-amber-800 font-bold">⏰ {tr("తదుపరి సంప్రదింపు:", "Follow-up:")} {n.callback_at}</div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 italic py-2 text-center">{tr("గత గమనికలు లేవు.", "No previous notes.")}</p>
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
                {tr("ముగించు", "Close")}
              </button>
              <button
                type="button"
                disabled={busyId === counselorModal.tsapId || !counselorModal.newNote.trim()}
                onClick={saveCounselorNote}
                className="flex-1 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-md transition disabled:opacity-50"
              >
                {busyId === counselorModal.tsapId ? tr("సేవ్ అవుతోంది…", "Saving…") : tr("💾 గమనికను సేవ్ చేయండి", "💾 Save note")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🪐 JATHAKAM EVIDENCE REVIEW — no star-only calculator */}
      {owner && showJathakamReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl space-y-4 rounded-3xl border-2 border-amber-300 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-navy">{te ? "🪐 నిజమైన జాతక పత్రం review" : "🪐 Real Jathakam document review"}</h3>
                <p className="mt-1 text-xs leading-5 text-slate-500">{te ? "Profile star/rasi fields నుంచి score, chart లేదా Porutham ఫలితం తయారు చేయము." : "No score, chart, or Porutham result is generated from profile star/rasi fields."}</p>
              </div>
              <button aria-label={te ? "మూసివేయండి" : "Close"} type="button" onClick={() => setShowJathakamReview(false)} className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 font-bold text-slate-600">✕</button>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-950">
              {te
                ? "ఈ admin action కేవలం authentic horoscope document upload మరియు owner-gated review queue కు తీసుకెళ్తుంది. Review status identity లేదా authenticity certificate కాదు; ఏ interpretation అయినా qualified astrologer ద్వారా అసలైన పత్రాన్ని చూసిన తర్వాతే."
                : "This admin action belongs in the owner-gated real-document review queue. A recorded review status is not an identity or authenticity certificate; a qualified astrologer must inspect the original before any interpretation."}
            </div>
            <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
              <Link href="/porutham" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#7A0C2E] px-4 py-2.5 text-xs font-extrabold text-white">{te ? "Jathakam review తెరవండి" : "Open Jathakam review"} →</Link>
              <button type="button" onClick={() => setShowJathakamReview(false)} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-bold text-slate-600">{tr("ముగించు", "Close")}</button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}
