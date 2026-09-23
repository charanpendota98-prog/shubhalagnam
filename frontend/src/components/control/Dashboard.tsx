"use client";

/**
 * 🎛️ ADVANCED CONTROL DASHBOARD — owner + worker (RBAC).
 * Real backend data via session cookie: /api/control/analytics, profile-queue,
 * spotlight-queue, reports, castes, and vendors. Actions send CSRF header. Fully bilingual.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/lang";
import { BarList, Donut, Sparkline } from "./Charts";

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

const T = {
  te: {
    ops: "ప్రైవేట్ ఆపరేషన్స్", dash: "డాష్‌బోర్డ్", signedAs: "సైన్ ఇన్",
    signout: "సైన్ అవుట్", refresh: "రిఫ్రెష్", loading: "లోడ్ అవుతోంది…",
    tabOverview: "📊 అవలోకనం", tabQueue: "👥 ప్రొఫైల్ క్యూ", tabCastes: "🏛️ కులాలు & కమ్యూనిటీలు",
    tabAddProfile: "➕ ప్రొఫైల్ చేర్చండి", tabVendors: "🏪 పెళ్లి సేవలు & వెండర్లు",
    tabSpotlight: "🌟 స్పాట్‌లైట్ / Profiles of Day", tabReferrals: "🤝 రెఫరల్స్ & పేఅవుట్స్", tabReports: "🚩 రిపోర్ట్‌లు",
    tabRevenue: "💰 రెవెన్యూ", tabAudit: "📜 ఆడిట్ లాగ్",
    kProfiles: "మొత్తం ప్రొఫైళ్లు", kPending: "పెండింగ్ రివ్యూ", kApproved: "అప్రూవ్డ్",
    kReports: "ఓపెన్ రిపోర్ట్‌లు", kPhotos: "ఫోటో రివ్యూ", kVerified: "వెరిఫైడ్",
    kInterests: "ఇంట్రెస్ట్‌లు", kToday: "ఈరోజు నమోదులు",
    signups14: "గత 14 రోజుల నమోదులు", today: "ఈరోజు", week: "7 రోజులు",
    genderSplit: "లింగ నిష్పత్తి", male: "పురుషులు", female: "స్త్రీలు",
    topCastes: "టాప్ కులాలు", topStates: "టాప్ రాష్ట్రాలు", topDistricts: "టాప్ జిల్లాలు",
    queueTitle: "ప్రొఫైల్ రివ్యూ క్యూ", queueNote: "ఫోన్/ఇమెయిల్/పేమెంట్ ఎప్పుడూ చూపించము — రివ్యూ fields మాత్రమే.",
    approve: "✅ అప్రూవ్", reject: "❌ రిజెక్ట్", pending: "↩️ పెండింగ్",
    noPending: "పెండింగ్ ప్రొఫైళ్లు లేవు 🎉", photo: "ఫోటో",
    filterAll: "అన్నీ", filterPending: "పెండింగ్", filterApproved: "అప్రూవ్డ్", filterRejected: "రిజెక్ట్డ్",
    reportsTitle: "మోడరేషన్ క్యూ", noReports: "ఓపెన్ రిపోర్ట్‌లు లేవు 🎉",
    resolve: "పరిష్కరించు", revenueTitle: "రెవెన్యూ స్నాప్‌షాట్", totalRev: "మొత్తం రెవెన్యూ",
    payments: "చెల్లింపులు", attempts: "ప్రయత్నాలు", planSplit: "ప్లాన్ వారీగా",
    auditTitle: "ఇటీవలి ఆపరేషన్స్ ఆడిట్", ownerOnly: "ఓనర్ మాత్రమే",
    done: "పూర్తయింది", failed: "విఫలమైంది",
  },
  en: {
    ops: "Private operations", dash: "Dashboard", signedAs: "Signed in as",
    signout: "Sign out", refresh: "Refresh", loading: "Loading…",
    tabOverview: "📊 Overview", tabQueue: "👥 Profile queue", tabCastes: "🏛️ Castes & Hubs",
    tabAddProfile: "➕ Add Profile", tabVendors: "🏪 Wedding Vendors",
    tabSpotlight: "🌟 Spotlight / Profiles of Day", tabReferrals: "🤝 Referrals & Payouts", tabReports: "🚩 Reports",
    tabRevenue: "💰 Revenue", tabAudit: "📜 Audit log",
    kProfiles: "Total profiles", kPending: "Pending review", kApproved: "Approved",
    kReports: "Open reports", kPhotos: "Photo review", kVerified: "Verified",
    kInterests: "Interests", kToday: "Signups today",
    signups14: "Signups — last 14 days", today: "Today", week: "7 days",
    genderSplit: "Gender split", male: "Male", female: "Female",
    topCastes: "Top castes", topStates: "Top states", topDistricts: "Top districts",
    queueTitle: "Profile review queue", queueNote: "Phone / email / payments are never shown — review fields only.",
    approve: "✅ Approve", reject: "❌ Reject", pending: "↩️ Pending",
    noPending: "No pending profiles 🎉", photo: "Photo",
    filterAll: "All", filterPending: "Pending", filterApproved: "Approved", filterRejected: "Rejected",
    reportsTitle: "Moderation queue", noReports: "No open reports 🎉",
    resolve: "Resolve", revenueTitle: "Revenue snapshot", totalRev: "Total revenue",
    payments: "Payments", attempts: "Attempts", planSplit: "By plan",
    auditTitle: "Recent operations audit", ownerOnly: "Owner only",
    done: "Done", failed: "Failed",
  },
};

const TELUGU_CASTES_LIST = [
  "Reddy", "Kamma", "Kapu", "Arya Vysya", "Brahmin", "Padmashali", "Yadava",
  "Goud", "Munnuru Kapu", "Velama", "Mudiraj", "Viswabrahmin", "Raju / Kshatriya",
  "Mala", "Madiga", "Lambada / Banjara", "Vaddera", "Rajaka", "Nayee Brahmin",
  "Kummari", "Medari", "Boya / Valmiki", "Muslim", "Christian", "Inter-Caste", "Other"
];

const NAKSHATRAS_LIST = [
  "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigasira", "Ardra", "Punarvasu",
  "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni", "Hasta",
  "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha", "Moola", "Purvashadha",
  "Uttarashadha", "Shravana", "Dhanishta", "Shatabhisha", "Purva Bhadrapada",
  "Uttara Bhadrapada", "Revati"
];

const RASIS_LIST = [
  "Mesha (Aries)", "Vrishabha (Taurus)", "Mithuna (Gemini)", "Karkataka (Cancer)",
  "Simha (Leo)", "Kanya (Virgo)", "Thula (Libra)", "Vrischika (Scorpio)",
  "Dhanussu (Sagittarius)", "Makara (Capricorn)", "Kumbha (Aquarius)", "Meena (Pisces)"
];

const DISTRICTS_TS_AP = [
  "Hyderabad", "Rangareddy", "Medchal", "Warangal", "Karimnagar", "Nizamabad",
  "Khammam", "Nalgonda", "Mahbubnagar", "Visakhapatnam", "Vijayawada (NTR)", "Guntur",
  "Tirupati", "Nellore", "Kurnool", "Rajahmundry", "Kakinada", "Anantapur", "Kadapa",
  "Chittoor", "Eluru", "Srikakulam", "Vizianagaram", "USA / NRI", "Other"
];

async function jget(url: string) {
  const r = await fetch(url, { credentials: "include" });
  if (r.status === 401) throw new Error("401");
  if (!r.ok) throw new Error("load");
  return r.json();
}

export default function Dashboard() {
  const { lang } = useLang();
  const L = T[(lang as "te" | "en") in T ? (lang as "te" | "en") : "te"];
  const [me, setMe] = useState<Me | null>(null);
  const [an, setAn] = useState<Analytics | null>(null);
  const [tab, setTab] = useState<"overview" | "queue" | "castes" | "addProfile" | "vendors" | "spotlight" | "referrals" | "reports" | "revenue" | "audit">("overview");
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [qStatus, setQStatus] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [spotlights, setSpotlights] = useState<SpotlightItem[]>([]);
  const [spStatus, setSpStatus] = useState<string>("all");
  const [payouts, setPayouts] = useState<PayoutItem[]>([]);
  const [pStatus, setPStatus] = useState<string>("all");
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [castesData, setCastesData] = useState<CasteHubItem[]>([]);
  const [vendorsData, setVendorsData] = useState<VendorItem[]>([]);
  const [toast, setToast] = useState("");
  const [busyId, setBusyId] = useState("");
  const [err, setErr] = useState("");

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
  const [createdProfile, setCreatedProfile] = useState<any>(null);
  const [profSubmitting, setProfSubmitting] = useState(false);

  // New Vendor Form State
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

  const loadCore = useCallback(async () => {
    try {
      const [meRes, anRes] = await Promise.all([
        jget("/api/control/me"),
        jget("/api/control/analytics"),
      ]);
      setMe(meRes);
      setAn(anRes);
    } catch (e) {
      if (e instanceof Error && e.message === "401") return gotoLogin();
      setErr("Unable to load workspace");
    }
  }, []);

  const loadQueue = useCallback(async (status: string) => {
    try {
      const d = await jget(`/api/control/profile-queue?status=${status}&limit=100`);
      setQueue(d.items || []);
    } catch { setQueue([]); }
  }, []);

  const loadReports = useCallback(async () => {
    try {
      const d = await jget(`/api/control/reports?limit=50`);
      setReports(d.items || []);
    } catch { setReports([]); }
  }, []);

  const loadSpotlights = useCallback(async (status: string) => {
    try {
      const d = await jget(`/api/control/spotlight/queue?status=${status}&limit=50`);
      setSpotlights(d.items || []);
    } catch { setSpotlights([]); }
  }, []);

  const loadPayouts = useCallback(async (status: string) => {
    try {
      const d = await jget(`/api/control/payouts/queue?status=${status}`);
      setPayouts(d.items || []);
    } catch { setPayouts([]); }
  }, []);

  const loadCastes = useCallback(async () => {
    try {
      const d = await jget(`/api/control/castes`);
      setCastesData(d.castes || []);
    } catch { setCastesData([]); }
  }, []);

  const loadVendors = useCallback(async () => {
    try {
      const d = await jget(`/api/vendors?limit=100`);
      setVendorsData(d.items || d.vendors || []);
    } catch { setVendorsData([]); }
  }, []);

  useEffect(() => { loadCore(); }, [loadCore]);
  useEffect(() => { if (tab === "queue") loadQueue(qStatus); }, [tab, qStatus, loadQueue]);
  useEffect(() => { if (tab === "reports") loadReports(); }, [tab, loadReports]);
  useEffect(() => { if (tab === "spotlight") loadSpotlights(spStatus); }, [tab, spStatus, loadSpotlights]);
  useEffect(() => { if (tab === "referrals") loadPayouts(pStatus); }, [tab, pStatus, loadPayouts]);
  useEffect(() => { if (tab === "castes") loadCastes(); }, [tab, loadCastes]);
  useEffect(() => { if (tab === "vendors") loadVendors(); }, [tab, loadVendors]);

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2800); };

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

  async function resolveReport(id: string, action: string) {
    if (!me) return;
    setBusyId(id);
    try {
      const r = await fetch(`/api/control/reports/${encodeURIComponent(id)}/resolve`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", "X-Control-CSRF": me.csrf },
        body: JSON.stringify({ action }),
      });
      if (!r.ok) throw new Error("fail");
      flash(L.done);
      setReports((reps) => reps.filter((x) => (x.report_id || x.id) !== id));
      loadCore();
    } catch { flash(L.failed); }
    finally { setBusyId(""); }
  }

  async function handleAddProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!me) return;
    if (!newProf.full_name.trim()) return flash("Full name is required");
    setProfSubmitting(true);
    try {
      const r = await fetch("/api/control/profiles/add", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", "X-Control-CSRF": me.csrf },
        body: JSON.stringify(newProf),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || "Failed to add profile");
      setCreatedProfile(d.profile || d);
      flash(lang === "te" ? `✅ ప్రొఫైల్ ${d.tsap_id} విజయవంతంగా జోడించబడింది!` : `✅ Profile ${d.tsap_id} added successfully!`);
      loadCore();
    } catch (err: any) {
      flash(err?.message || "Error adding profile");
    } finally {
      setProfSubmitting(false);
    }
  }

  async function handleAddVendor(e: React.FormEvent) {
    e.preventDefault();
    if (!newVendor.business_name.trim()) return flash("Business name required");
    setVendorSubmitting(true);
    try {
      const r = await fetch("/api/vendors/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newVendor.business_name,
          category: newVendor.category,
          contact_person: newVendor.contact_person,
          phone: newVendor.phone || "9876543210",
          district: newVendor.district,
          state: newVendor.state,
          about: newVendor.about,
          package_code: "silver",
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || "Failed to register vendor");
      flash(lang === "te" ? "✅ వెండర్ విజయవంతంగా నమోదు అయ్యారు!" : "✅ Vendor registered successfully!");
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
    { k: "overview" as const, label: L.tabOverview },
    { k: "queue" as const, label: `${L.tabQueue} (${t.pending})` },
    { k: "castes" as const, label: L.tabCastes },
    { k: "addProfile" as const, label: L.tabAddProfile },
    { k: "vendors" as const, label: L.tabVendors },
    { k: "spotlight" as const, label: L.tabSpotlight },
    { k: "referrals" as const, label: L.tabReferrals },
    { k: "reports" as const, label: `${L.tabReports} (${t.open_reports})` },
    ...(owner ? [{ k: "revenue" as const, label: L.tabRevenue }] : []),
    ...(owner ? [{ k: "audit" as const, label: L.tabAudit }] : []),
  ];

  return (
    <main className="min-h-screen bg-cream pb-16">
      {/* top bar */}
      <header className="sticky top-0 z-30 border-b border-gold/30 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl maroon-gradient text-white font-black shadow-soft">
              👑
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black text-navy">{L.ops}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wider ${
                  owner ? "bg-amber-100 text-amber-900 border border-amber-300" : "bg-slate-100 text-slate-700"
                }`}>
                  {me.role}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                {L.signedAs} <b>{me.username}</b> • TSAP Matrimony Control Hub
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/" target="_blank" className="rounded-xl border border-maroon/20 px-3 py-1.5 text-xs font-bold text-maroon hover:bg-cream">
              🌐 Live Site
            </Link>
            <button
              onClick={loadCore}
              className="rounded-xl border border-gold/40 px-3 py-1.5 text-xs font-bold text-maroon hover:bg-cream"
            >
              🔄 {L.refresh}
            </button>
            <button
              onClick={signout}
              className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200"
            >
              {L.signout}
            </button>
          </div>
        </div>

        {/* tab strip */}
        <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 pb-2 pt-1 scrollbar-none">
          {tabs.map((x) => (
            <button
              key={x.k}
              onClick={() => setTab(x.k)}
              className={`shrink-0 rounded-full px-4 py-2 text-[12.5px] font-bold transition ${
                tab === x.k ? "maroon-gradient text-white shadow-soft" : "text-slate-600 hover:bg-cream"
              }`}
            >
              {x.label}
            </button>
          ))}
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 pt-6">
        {/* ---------------- OVERVIEW ---------------- */}
        {tab === "overview" && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Kpi label={L.kProfiles} value={t.profiles} tone="navy" />
              <Kpi label={L.kPending} value={t.pending} tone="amber" pulse={t.pending > 0} />
              <Kpi label={L.kApproved} value={t.approved} tone="green" />
              <Kpi label={L.kReports} value={t.open_reports} tone="rose" pulse={t.open_reports > 0} />
              <Kpi label={L.kPhotos} value={t.photos_pending} tone="sky" />
              <Kpi label={L.kVerified} value={t.verified} tone="green" />
              <Kpi label={L.kInterests} value={t.interests} tone="navy" />
              <Kpi label={L.kToday} value={an.signups.today} tone="amber" />
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-navy">{L.signups14}</h3>
                  <div className="flex gap-3 text-[11px] font-bold text-slate-500">
                    <span>{L.today}: <b className="text-maroon">{an.signups.today}</b></span>
                    <span>{L.week}: <b className="text-maroon">{an.signups.last_7d}</b></span>
                  </div>
                </div>
                <div className="mt-3 h-24">
                  <Sparkline data={an.signups.series.map((s) => s.count)} height={90} />
                </div>
              </Card>
              <Card>
                <h3 className="text-sm font-black text-navy">{L.genderSplit}</h3>
                <div className="mt-3 flex items-center justify-center">
                  <Donut
                    size={110}
                    segments={[
                      { label: L.female, value: t.females, color: "#7A0C2E" },
                      { label: L.male, value: t.males, color: "#0F1F3C" },
                    ]}
                  />
                </div>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Card><h3 className="mb-3 text-sm font-black text-navy">{L.topCastes}</h3><BarList items={an.top_castes} /></Card>
              <Card><h3 className="mb-3 text-sm font-black text-navy">{L.topStates}</h3><BarList items={an.top_states} color="#0F1F3C" /></Card>
              <Card><h3 className="mb-3 text-sm font-black text-navy">{L.topDistricts}</h3><BarList items={an.top_districts} color="#B8912A" /></Card>
            </div>
          </div>
        )}

        {/* ---------------- QUEUE ---------------- */}
        {tab === "queue" && (
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-navy">{L.queueTitle}</h3>
                <p className="mt-0.5 text-[11.5px] text-slate-500">{L.queueNote}</p>
              </div>
              <div className="flex gap-1.5">
                {([["pending", L.filterPending], ["approved", L.filterApproved], ["rejected", L.filterRejected], ["all", L.filterAll]] as const).map(([k, lab]) => (
                  <button key={k} onClick={() => setQStatus(k)}
                    className={`rounded-full px-3 py-1.5 text-[11.5px] font-bold ${qStatus === k ? "maroon-gradient text-white" : "border border-gold/40 text-maroon hover:bg-cream"}`}>
                    {lab}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-4 space-y-2.5">
              {queue.map((it) => (
                <div key={it.tsap_id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gold/20 bg-white p-3.5 shadow-sm">
                  <div className="min-w-[180px]">
                    <p className="text-[13px] font-black text-navy">{it.full_name} • {it.tsap_id}</p>
                    <p className="text-[11.5px] text-slate-500">{it.gender} • {it.age ? `${it.age} yrs` : "—"} • {it.district}</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <StatusPill status={it.status} />
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10.5px] font-bold text-slate-600">{it.photo_status}</span>
                  </div>
                  <div className="flex gap-1.5">
                    {it.status !== "approved" && (
                      <button disabled={busyId === it.tsap_id} onClick={() => profileAction(it.tsap_id, "approve")}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50">
                        {L.approve}
                      </button>
                    )}
                    {it.status !== "rejected" && (
                      <button disabled={busyId === it.tsap_id} onClick={() => profileAction(it.tsap_id, "reject")}
                        className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50">
                        {L.reject}
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {!queue.length && <p className="py-8 text-center text-sm text-slate-400">{L.noPending}</p>}
            </div>
          </Card>
        )}

        {/* ---------------- 🏛️ CASTES & COMMUNITY HUBS ---------------- */}
        {tab === "castes" && (
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-navy">
                  🏛️ {lang === "te" ? "కులాల మ్యాట్రిమోనీ హబ్స్ & ఛానల్స్" : "Castes Matrimony Hubs & Channels"}
                </h3>
                <p className="mt-0.5 text-[11.5px] text-slate-500">
                  {lang === "te" ? "తెలంగాణ & ఆంధ్రప్రదేశ్ అన్ని కులాల లైవ్ ఛానల్స్, వధువులు/వరుల సంఖ్య మరియు కమ్యూనిటీ లింక్స్." : "All TS & AP community live channels, bride & groom counts, and direct community match links."}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={loadCastes}
                  className="rounded-full border border-gold/40 px-3 py-1.5 text-[11.5px] font-bold text-maroon hover:bg-cream"
                >
                  🔄 {lang === "te" ? "రిఫ్రెష్ డేటా" : "Refresh"}
                </button>
                <Link
                  href="/castes"
                  target="_blank"
                  className="rounded-full maroon-gradient px-3 py-1.5 text-[11.5px] font-bold text-white hover-lift"
                >
                  🌐 {lang === "te" ? "వెబ్‌సైట్ కులాల పేజీ చూడండి" : "View Live Castes Hub"}
                </Link>
              </div>
            </div>

            <div className="mt-5 grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {castesData.map((c) => (
                <div key={c.key} className="rounded-2xl border border-gold/25 bg-white p-4 shadow-sm hover:shadow-md transition">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-navy/10 text-navy uppercase mr-2">
                        {c.category}
                      </span>
                      <span className="font-extrabold text-base text-maroon">{c.en}</span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                      🟢 100% Live
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 mt-1 font-semibold">{c.te}</p>

                  <div className="mt-3 grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl text-center">
                    <div>
                      <span className="text-[10.5px] text-slate-500 block">👰 వధువులు (Brides)</span>
                      <span className="text-sm font-black text-maroon">{c.females}</span>
                    </div>
                    <div>
                      <span className="text-[10.5px] text-slate-500 block">🤵 వరులు (Grooms)</span>
                      <span className="text-sm font-black text-navy">{c.males}</span>
                    </div>
                  </div>

                  {c.members && c.members.length > 0 && (
                    <div className="mt-2 text-[10.5px] text-slate-500">
                      <span className="font-bold">ఉపకులాలు (Sub-castes):</span> {c.members.slice(0, 4).join(", ")}
                      {c.members.length > 4 ? ` +${c.members.length - 4}` : ""}
                    </div>
                  )}

                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                    <Link
                      href={`/matches?caste=${encodeURIComponent(c.en)}`}
                      target="_blank"
                      className="font-bold text-maroon hover:underline"
                    >
                      🔍 సంబంధాలు చూడండి →
                    </Link>
                    <Link
                      href={`/castes/${c.key}-bride`}
                      target="_blank"
                      className="font-bold text-navy hover:underline"
                    >
                      📄 పేజీ →
                    </Link>
                  </div>
                </div>
              ))}
              {!castesData.length && (
                <p className="col-span-3 py-8 text-center text-sm text-slate-400">
                  {lang === "te" ? "కులాల డేటా లోడ్ అవుతోంది…" : "Loading castes data…"}
                </p>
              )}
            </div>
          </Card>
        )}

        {/* ---------------- ➕ ADD MATRIMONY PROFILE ---------------- */}
        {tab === "addProfile" && (
          <Card>
            <div>
              <h3 className="text-base font-black text-navy">
                ➕ {lang === "te" ? "కొత్త మ్యాట్రిమోనీ ప్రొఫైల్ తక్షణమే జోడించండి" : "Add Matrimony Profile (Instant Publish)"}
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                {lang === "te" ? "ఏ కులానికైనా నేరుగా అడ్మిన్ ద్వారా పూర్తి వివరాలతో ప్రొఫైల్ క్రియేట్ చేసి లైవ్ చేయవచ్చు." : "Create, approve and auto-route a verified profile for any community instantly."}
              </p>
            </div>

            {createdProfile && (
              <div className="mt-4 p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div>
                  <p className="font-black text-sm">🎉 ప్రొఫైల్ విజయవంతంగా లైవ్ అయ్యింది!</p>
                  <p className="text-xs mt-0.5">
                    <b>TSAP ID:</b> <span className="font-mono font-bold">{createdProfile.tsap_id}</span> • <b>పేరు:</b> {createdProfile.full_name} • <b>కులం:</b> {createdProfile.caste}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/search/${createdProfile.tsap_id}`}
                    target="_blank"
                    className="rounded-xl maroon-gradient text-white px-3 py-1.5 text-xs font-bold hover-lift"
                  >
                    👁️ ప్రొఫైల్ కార్డ్ చూడండి
                  </Link>
                  <button
                    onClick={() => setCreatedProfile(null)}
                    className="rounded-xl border border-emerald-600 px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100"
                  >
                    మరొకటి జోడించండి
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleAddProfile} className="mt-5 space-y-4">
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    పూర్తి పేరు (Full Name) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Soumya Reddy / Rajesh Kamma"
                    value={newProf.full_name}
                    onChange={(e) => setNewProf({ ...newProf, full_name: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:ring-2 focus:ring-maroon focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    లింగం (Gender) *
                  </label>
                  <select
                    value={newProf.gender}
                    onChange={(e) => setNewProf({ ...newProf, gender: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:ring-2 focus:ring-maroon focus:outline-none bg-white"
                  >
                    <option value="Bride">👰 పెళ్లికూతురు (Bride / Female)</option>
                    <option value="Groom">🤵 పెళ్లికొడుకు (Groom / Male)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    వయస్సు (Age) & ఎత్తు (Height) *
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      required
                      min={18}
                      max={70}
                      value={newProf.age}
                      onChange={(e) => setNewProf({ ...newProf, age: parseInt(e.target.value) || 24 })}
                      className="w-20 rounded-xl border border-slate-300 px-3 py-2 text-xs focus:ring-2 focus:ring-maroon focus:outline-none"
                    />
                    <input
                      type="text"
                      value={newProf.height}
                      onChange={(e) => setNewProf({ ...newProf, height: e.target.value })}
                      placeholder="5 ft 4 in"
                      className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-xs focus:ring-2 focus:ring-maroon focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    కులం (Caste) *
                  </label>
                  <select
                    value={newProf.caste}
                    onChange={(e) => setNewProf({ ...newProf, caste: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:ring-2 focus:ring-maroon focus:outline-none bg-white"
                  >
                    {TELUGU_CASTES_LIST.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ఉపకులం (Sub-Caste)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Pakanati, Chowdary, Niyogi, Devanga"
                    value={newProf.sub_caste}
                    onChange={(e) => setNewProf({ ...newProf, sub_caste: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:ring-2 focus:ring-maroon focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    గోత్రం (Gothram)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Bharadwaja, Kashyapa, Janakula"
                    value={newProf.gothram}
                    onChange={(e) => setNewProf({ ...newProf, gothram: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:ring-2 focus:ring-maroon focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    నక్షత్రం (Nakshatra / Star)
                  </label>
                  <select
                    value={newProf.star}
                    onChange={(e) => setNewProf({ ...newProf, star: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:ring-2 focus:ring-maroon focus:outline-none bg-white"
                  >
                    {NAKSHATRAS_LIST.map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    రాశి (Rasi)
                  </label>
                  <select
                    value={newProf.rasi}
                    onChange={(e) => setNewProf({ ...newProf, rasi: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:ring-2 focus:ring-maroon focus:outline-none bg-white"
                  >
                    {RASIS_LIST.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    చదువు (Education)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. B.Tech / MS in USA / MBBS / MBA"
                    value={newProf.education}
                    onChange={(e) => setNewProf({ ...newProf, education: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:ring-2 focus:ring-maroon focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ఉద్యోగం / వృత్తి (Job / Occupation)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Software Engineer, Bank Manager, Doctor"
                    value={newProf.job}
                    onChange={(e) => setNewProf({ ...newProf, job: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:ring-2 focus:ring-maroon focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    వార్షిక ఆదాయం (Annual Salary)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 15 LPA / $120k"
                    value={newProf.salary}
                    onChange={(e) => setNewProf({ ...newProf, salary: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:ring-2 focus:ring-maroon focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    రాష్ట్రం & జిల్లా (State & District)
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={newProf.state}
                      onChange={(e) => setNewProf({ ...newProf, state: e.target.value })}
                      className="w-20 rounded-xl border border-slate-300 px-3 py-2 text-xs focus:ring-2 focus:ring-maroon focus:outline-none bg-white"
                    >
                      <option value="TS">TS</option>
                      <option value="AP">AP</option>
                      <option value="Other">Other</option>
                    </select>
                    <select
                      value={newProf.district}
                      onChange={(e) => setNewProf({ ...newProf, district: e.target.value })}
                      className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-xs focus:ring-2 focus:ring-maroon focus:outline-none bg-white"
                    >
                      {DISTRICTS_TS_AP.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ఫోన్ నంబర్ (Phone Number - Admin Reference)
                  </label>
                  <input
                    type="tel"
                    placeholder="9876543210"
                    value={newProf.phone}
                    onChange={(e) => setNewProf({ ...newProf, phone: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:ring-2 focus:ring-maroon focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ఫోటో URL (Photo URL - Optional)
                  </label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={newProf.photo_url}
                    onChange={(e) => setNewProf({ ...newProf, photo_url: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:ring-2 focus:ring-maroon focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  కుటుంబ వివరాలు & పరిచయం (About & Family)
                </label>
                <textarea
                  rows={3}
                  placeholder="సాంప్రదాయ కుటుంబం, మంచి విలువలు గల వరుడు/వధువు కోసం చూస్తున్నాము..."
                  value={newProf.about_myself}
                  onChange={(e) => setNewProf({ ...newProf, about_myself: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:ring-2 focus:ring-maroon focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={profSubmitting}
                  className="rounded-xl maroon-gradient text-white px-6 py-3 text-xs font-black hover-lift shadow-md disabled:opacity-50 flex items-center gap-2"
                >
                  {profSubmitting ? "సేవ్ అవుతోంది…" : "✨ ప్రొఫైల్ తక్షణమే లైవ్ చేయండి (Publish Live Profile)"}
                </button>
              </div>
            </form>
          </Card>
        )}

        {/* ---------------- 🏪 WEDDING VENDORS & PUROHITS ---------------- */}
        {tab === "vendors" && (
          <div className="space-y-6">
            <Card>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-black text-navy">
                    🏪 {lang === "te" ? "వెరిఫైడ్ పెళ్లి సేవలు & పురోహితుల నెట్‌వర్క్" : "Wedding Services & Purohits Directory"}
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {lang === "te" ? "ఫోటోగ్రఫీ, క్యాటరింగ్, పురోహితులు, డెకరేషన్స్, ఫంక్షన్ హాల్స్ విచారణలు మరియు అడ్వర్టైజింగ్ నిర్వహణ." : "Manage wedding photographers, purohits, caters, banquet halls, and lead captures."}
                  </p>
                </div>
                <Link
                  href="/vendors"
                  target="_blank"
                  className="rounded-full maroon-gradient px-3.5 py-1.5 text-xs font-bold text-white hover-lift"
                >
                  🌐 {lang === "te" ? "లైవ్ వెండర్స్ డైరెక్టరీ" : "Live Directory"}
                </Link>
              </div>

              <div className="mt-5 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {vendorsData.map((v, i) => (
                  <div key={v.id || v.vendor_id || i} className="rounded-2xl border border-gold/25 bg-white p-3.5 shadow-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-extrabold text-sm text-navy">{v.name || v.business_name}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        ⭐ {v.rating || "4.8"}
                      </span>
                    </div>

                    <div className="mt-1 text-xs text-slate-600">
                      📂 <b>వర్గం:</b> {v.category_name || v.category}
                    </div>

                    <div className="text-xs text-slate-600">
                      📍 <b>ప్రాంతం:</b> {v.district}, {v.state || "TS"}
                    </div>

                    <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between pt-2 border-t border-slate-100">
                      <span>📞 {v.phone_masked || v.phone || "Verified Contact"}</span>
                      <span className="font-bold text-maroon">✓ {v.package_name || "Verified Vendor"}</span>
                    </div>
                  </div>
                ))}
                {!vendorsData.length && (
                  <p className="col-span-3 py-6 text-center text-xs text-slate-400">
                    {lang === "te" ? "వెండర్స్ లోడ్ అవుతున్నారు…" : "Loading wedding vendors…"}
                  </p>
                )}
              </div>
            </Card>

            {/* Quick Add Vendor */}
            <Card>
              <h3 className="text-sm font-black text-navy mb-3">
                ➕ {lang === "te" ? "కొత్త వెండర్ / పురోహితుడిని జోడించండి" : "Add Wedding Vendor / Pandit"}
              </h3>
              <form onSubmit={handleAddVendor} className="grid sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">వ్యాపారం / సంస్థ పేరు *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. శ్రీ కళ్యాణ వేదిక / రాజేష్ ఫోటోగ్రఫీ"
                    value={newVendor.business_name}
                    onChange={(e) => setNewVendor({ ...newVendor, business_name: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-maroon focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">కేటగిరీ (Category) *</label>
                  <select
                    value={newVendor.category}
                    onChange={(e) => setNewVendor({ ...newVendor, category: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-maroon focus:outline-none bg-white"
                  >
                    <option value="photography">📸 ఫోటోగ్రఫీ & సినిమాటోగ్రఫీ</option>
                    <option value="pandit">🕉️ పండితులు / పురోహితులు</option>
                    <option value="catering">🍛 విందు భోజనం & క్యాటరింగ్</option>
                    <option value="decorations">🌸 డెకరేషన్స్ & మండపం</option>
                    <option value="banquet_hall">🏛️ కళ్యాణ మండపం / ఫంక్షన్ హాల్</option>
                    <option value="makeup">💄 బ్రైడల్ మేకప్ & బ్యూటీషియన్</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">సంప్రదించే వ్యక్తి / ఫోన్</label>
                  <input
                    type="text"
                    placeholder="9876543210"
                    value={newVendor.phone}
                    onChange={(e) => setNewVendor({ ...newVendor, phone: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-maroon focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">జిల్లా (District)</label>
                  <select
                    value={newVendor.district}
                    onChange={(e) => setNewVendor({ ...newVendor, district: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-maroon focus:outline-none bg-white"
                  >
                    {DISTRICTS_TS_AP.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2 flex items-end">
                  <button
                    type="submit"
                    disabled={vendorSubmitting}
                    className="w-full rounded-xl maroon-gradient text-white py-2.5 font-bold hover-lift shadow-sm disabled:opacity-50"
                  >
                    {vendorSubmitting ? "నమోదు అవుతోంది…" : "✨ వెండర్‌ను డైరెక్టరీలో చేర్చండి"}
                  </button>
                </div>
              </form>
            </Card>
          </div>
        )}

        {/* ---------------- SPOTLIGHT / PROFILES OF THE DAY ---------------- */}
        {tab === "spotlight" && (
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-navy">🌟 {lang === "te" ? "స్పాట్‌లైట్ ప్రమోషన్ల క్యూ" : "Spotlight & Profiles of the Day Queue"}</h3>
                <p className="mt-0.5 text-[11.5px] text-slate-500">
                  {lang === "te" ? "యూజర్లు కొనుగోలు చేసిన స్పాట్‌లైట్ ప్రమోషన్లను ఆమోదించండి లేదా తిరస్కరించండి." : "Approve paid spotlight promotions to feature profiles on homepage and community channels."}
                </p>
              </div>
              <div className="flex gap-1.5">
                {[
                  ["all", lang === "te" ? "అన్నీ" : "All"],
                  ["submitted", lang === "te" ? "పెండింగ్" : "Pending"],
                  ["active", lang === "te" ? "లైవ్" : "Active"],
                  ["rejected", lang === "te" ? "రిజెక్ట్" : "Rejected"],
                ].map(([k, lab]) => (
                  <button key={k} onClick={() => setSpStatus(k)}
                    className={`rounded-full px-3 py-1.5 text-[11.5px] font-bold ${spStatus === k ? "maroon-gradient text-white" : "border border-gold/40 text-maroon hover:bg-cream"}`}>
                    {lab}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {spotlights.map((sp) => (
                <div key={sp.promo_id} className="rounded-2xl border border-gold/30 bg-white p-4 shadow-sm hover:shadow-md transition space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-navy">{sp.full_name} ({sp.tsap_id})</span>
                      <span className="text-xs bg-gold/10 text-maroon font-bold px-2 py-0.5 rounded-full uppercase">{sp.plan_code}</span>
                      <span className="text-xs font-black text-emerald-700">₹{sp.amount_paid}</span>
                    </div>
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                      sp.status === "active" ? "bg-emerald-100 text-emerald-800" :
                      sp.status === "submitted" ? "bg-amber-100 text-amber-800" : "bg-rose-100 text-rose-800"
                    }`}>
                      {sp.status}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs text-slate-700 space-y-1">
                    <p className="font-bold text-maroon">📌 {sp.headline}</p>
                    <p className="italic">&ldquo;{sp.pitch_text}&rdquo;</p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600 pt-1 border-t border-slate-100">
                    <div className="flex items-center gap-3">
                      <span>💳 <b>Ref:</b> {sp.payment_ref} ({sp.payment_mode})</span>
                      {sp.video_url && (
                        <a href={sp.video_url} target="_blank" rel="noreferrer" className="text-blue-600 font-bold hover:underline flex items-center gap-1">
                          🎥 <span>వీడియో చూడండి</span>
                        </a>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {sp.status !== "active" && (
                        <button
                          disabled={busyId === sp.promo_id}
                          onClick={() => spotlightAction(sp.promo_id, "approve")}
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                          ✅ {lang === "te" ? "లైవ్ చేయండి (Approve)" : "Approve & Live"}
                        </button>
                      )}
                      {sp.status === "active" && (
                        <button
                          disabled={busyId === sp.promo_id}
                          onClick={() => spotlightAction(sp.promo_id, "close")}
                          className="rounded-lg bg-slate-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-700 disabled:opacity-50"
                        >
                          ⏹️ {lang === "te" ? "క్లోజ్ చేయండి" : "Close Promo"}
                        </button>
                      )}
                      {sp.status !== "rejected" && (
                        <button
                          disabled={busyId === sp.promo_id}
                          onClick={() => spotlightAction(sp.promo_id, "reject")}
                          className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"
                        >
                          ❌ {lang === "te" ? "రిజెక్ట్" : "Reject"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {!spotlights.length && (
                <p className="py-8 text-center text-sm text-slate-400">
                  {lang === "te" ? "స్పాట్‌లైట్ ప్రమోషన్లు ఏవీ లేవు" : "No spotlight promotions in this tab"}
                </p>
              )}
            </div>
          </Card>
        )}

        {/* ---------------- REFERRALS & PAYOUTS ---------------- */}
        {tab === "referrals" && (
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-navy">🤝 {lang === "te" ? "రెఫరల్ కమీషన్లు & UPI విత్‌డ్రా క్యూ" : "Referral Commissions & UPI Payouts Queue"}</h3>
                <p className="mt-0.5 text-[11.5px] text-slate-500">
                  {lang === "te" ? "యూజర్లు అభ్యర్థించిన UPI విత్‌డ్రాలను UTR నంబర్‌తో ఆమోదించండి లేదా తిరస్కరించండి." : "Review user referral withdrawal requests, approve with official bank UTR or reject."}
                </p>
              </div>
              <div className="flex gap-1.5">
                {[
                  ["requested", lang === "te" ? "పెండింగ్" : "Pending"],
                  ["paid", lang === "te" ? "చెల్లించినవి" : "Paid"],
                  ["rejected", lang === "te" ? "రిజెక్ట్" : "Rejected"],
                  ["all", lang === "te" ? "అన్నీ" : "All"],
                ].map(([k, lab]) => (
                  <button key={k} onClick={() => setPStatus(k)}
                    className={`rounded-full px-3 py-1.5 text-[11.5px] font-bold ${pStatus === k ? "maroon-gradient text-white" : "border border-gold/40 text-maroon hover:bg-cream"}`}>
                    {lab}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {payouts.map((po) => (
                <div key={po.id} className="rounded-2xl border border-gold/30 bg-white p-4 shadow-sm hover:shadow-md transition flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-navy">ID: {po.tsap_id}</span>
                      <span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600">{po.id}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        po.status === "paid" ? "bg-emerald-100 text-emerald-800" :
                        po.status === "requested" ? "bg-amber-100 text-amber-800 animate-pulse" : "bg-rose-100 text-rose-800"
                      }`}>
                        {po.status}
                      </span>
                    </div>

                    <div className="text-xs text-slate-600">
                      💳 <b>{po.method?.toUpperCase()}:</b> <span className="font-mono text-maroon font-bold">{po.upi_id || po.account || "—"}</span>
                      {po.utr ? <span className="text-emerald-700 font-bold ml-2">✓ UTR: {po.utr}</span> : null}
                    </div>

                    <div className="text-[11px] text-slate-400">
                      📅 {String(po.requested_at || "").slice(0, 19).replace("T", " ")}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <div className="text-right sm:mr-3">
                      <span className="text-xs text-slate-400 block font-semibold">{lang === "te" ? "విత్‌డ్రా మొత్తం" : "Amount"}</span>
                      <span className="text-xl font-black text-maroon">₹{po.amount}</span>
                    </div>

                    {po.status === "requested" && (
                      <div className="flex items-center gap-1.5">
                        <button
                          disabled={busyId === po.id}
                          onClick={() => {
                            const raw = prompt(lang === "te" ? "బ్యాంక్ / UPI UTR నంబర్ నమోదు చేయండి (6-30 అక్షరాలు/అంకెలు):" : "Enter Bank / UPI UTR reference number (6-30 alphanumeric):");
                            if (raw && raw.trim()) {
                              const cleanUtr = raw.trim().replace(/[^A-Za-z0-9]/g, "");
                              if (cleanUtr.length >= 6) payoutAction(po.id, "approve", cleanUtr);
                              else alert(lang === "te" ? "⚠️ UTR కనీసం 6 అక్షరాలు/అంకెలు ఉండాలి" : "⚠️ UTR must be at least 6 alphanumeric characters");
                            }
                          }}
                          className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 shadow-sm"
                        >
                          ✅ {lang === "te" ? "పే చేయండి (UTR)" : "Mark Paid (UTR)"}
                        </button>
                        <button
                          disabled={busyId === po.id}
                          onClick={() => payoutAction(po.id, "reject")}
                          className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"
                        >
                          ❌ {lang === "te" ? "రిజెక్ట్" : "Reject"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {!payouts.length && (
                <p className="py-8 text-center text-sm text-slate-400">
                  {lang === "te" ? "పేఅవుట్ అభ్యర్థనలు ఏవీ లేవు 🎉" : "No payout requests in this queue 🎉"}
                </p>
              )}
            </div>
          </Card>
        )}

        {/* ---------------- REPORTS ---------------- */}
        {tab === "reports" && (
          <Card>
            <h3 className="text-sm font-black text-navy">{L.reportsTitle}</h3>
            <div className="mt-4 space-y-2.5">
              {reports.map((r) => {
                const id = r.report_id || r.id || "";
                return (
                  <div key={id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50/60 p-3.5">
                    <span className="rounded-full bg-rose-600 px-2.5 py-1 text-[10px] font-bold uppercase text-white">{r.severity || r.category || "report"}</span>
                    <div className="min-w-[160px] flex-1">
                      <p className="text-[13px] font-bold text-navy">🎯 {r.target_id || "—"}</p>
                      <p className="text-[11px] text-slate-500">{r.detail || r.category}</p>
                    </div>
                    <div className="flex gap-1.5">
                      {["verify", "warn", "hide", "ban", "dismiss"].map((a) => (
                        <button key={a} disabled={busyId === id} onClick={() => resolveReport(id, a)}
                          className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">{a}</button>
                      ))}
                    </div>
                  </div>
                );
              })}
              {!reports.length && <p className="py-8 text-center text-sm text-slate-400">{L.noReports}</p>}
            </div>
          </Card>
        )}

        {/* ---------------- REVENUE (owner) ---------------- */}
        {tab === "revenue" && owner && an.revenue && (
          <div className="grid gap-4 md:grid-cols-3">
            <Card><p className="text-[12px] font-semibold text-slate-500">{L.totalRev}</p><p className="mt-1 text-3xl font-black text-maroon">₹{an.revenue.total.toLocaleString("en-IN")}</p></Card>
            <Card><p className="text-[12px] font-semibold text-slate-500">{L.payments}</p><p className="mt-1 text-3xl font-black text-navy">{an.revenue.payments}</p></Card>
            <Card><p className="text-[12px] font-semibold text-slate-500">{L.attempts}</p><p className="mt-1 text-3xl font-black text-navy">{an.revenue.attempts}</p></Card>
            <Card className="md:col-span-3"><h3 className="mb-3 text-sm font-black text-navy">{L.planSplit}</h3><BarList items={an.revenue.plan_split} color="#B8912A" /></Card>
          </div>
        )}

        {/* ---------------- AUDIT (owner) ---------------- */}
        {tab === "audit" && owner && (
          <Card>
            <h3 className="text-sm font-black text-navy">{L.auditTitle}</h3>
            <div className="mt-3 space-y-1.5">
              {(an.audit || []).slice().reverse().map((a, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-100 bg-white px-3 py-2 text-[11.5px]">
                  <span className="font-mono text-slate-400">{String(a.at).slice(0, 19).replace("T", " ")}</span>
                  <span className="rounded-full bg-navy/5 px-2 py-0.5 font-bold text-navy">{a.action}</span>
                  <span className="font-semibold text-slate-600">{a.actor}</span>
                  <span className="text-slate-400">{a.ip}</span>
                </div>
              ))}
              {!(an.audit || []).length && <p className="py-6 text-center text-sm text-slate-400">—</p>}
            </div>
          </Card>
        )}
      </div>

      {/* toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-navy px-5 py-3 text-[13px] font-bold text-white shadow-2xl animate-fade">
          {toast}
        </div>
      )}
    </main>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-3xl border border-gold/25 bg-white p-5 shadow-soft ${className}`}>{children}</div>;
}

function Kpi({ label, value, tone, pulse }: { label: string; value: number; tone: string; pulse?: boolean }) {
  const tones: Record<string, string> = {
    navy: "from-[#0F1F3C] to-[#1E3A5F]", amber: "from-[#B8912A] to-[#D4AF37]",
    green: "from-emerald-600 to-emerald-500", rose: "from-rose-600 to-rose-500", sky: "from-sky-600 to-sky-500",
  };
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${tones[tone] || tones.navy} p-4 text-white shadow-soft`}>
      {pulse && <span className="absolute right-3 top-3 h-2.5 w-2.5 animate-ping rounded-full bg-white/80" />}
      <p className="text-2xl font-black leading-none md:text-3xl">{value}</p>
      <p className="mt-1.5 text-[11px] font-semibold opacity-90">{label}</p>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800", approved: "bg-emerald-100 text-emerald-800",
    rejected: "bg-rose-100 text-rose-800",
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold capitalize ${map[status] || "bg-slate-100 text-slate-700"}`}>
      {status}
    </span>
  );
}
