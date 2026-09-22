"use client";

/**
 * 🎛️ ADVANCED CONTROL DASHBOARD — owner + worker (RBAC).
 * Real backend data via session cookie: /api/control/analytics, profile-queue,
 * spotlight-queue, reports. Actions (approve/reject/resolve) send CSRF header. Fully bilingual.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
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

const T = {
  te: {
    ops: "ప్రైవేట్ ఆపరేషన్స్", dash: "డాష్‌బోర్డ్", signedAs: "సైన్ ఇన్",
    signout: "సైన్ అవుట్", refresh: "రిఫ్రెష్", loading: "లోడ్ అవుతోంది…",
    tabOverview: "📊 అవలోకనం", tabQueue: "👥 ప్రొఫైల్ క్యూ", tabSpotlight: "🌟 స్పాట్‌లైట్ / Profiles of Day", tabReferrals: "🤝 రెఫరల్స్ & పేఅవుట్స్", tabReports: "🚩 రిపోర్ట్‌లు",
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
    tabOverview: "📊 Overview", tabQueue: "👥 Profile queue", tabSpotlight: "🌟 Spotlight / Profiles of Day", tabReferrals: "🤝 Referrals & Payouts", tabReports: "🚩 Reports",
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
  const [tab, setTab] = useState<"overview" | "queue" | "spotlight" | "referrals" | "reports" | "revenue" | "audit">("overview");
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [qStatus, setQStatus] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [spotlights, setSpotlights] = useState<SpotlightItem[]>([]);
  const [spStatus, setSpStatus] = useState<string>("all");
  const [payouts, setPayouts] = useState<PayoutItem[]>([]);
  const [pStatus, setPStatus] = useState<string>("all");
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [toast, setToast] = useState("");
  const [busyId, setBusyId] = useState("");
  const [err, setErr] = useState("");

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

  useEffect(() => { loadCore(); }, [loadCore]);
  useEffect(() => { if (tab === "queue") loadQueue(qStatus); }, [tab, qStatus, loadQueue]);
  useEffect(() => { if (tab === "reports") loadReports(); }, [tab, loadReports]);
  useEffect(() => { if (tab === "spotlight") loadSpotlights(spStatus); }, [tab, spStatus, loadSpotlights]);
  useEffect(() => { if (tab === "referrals") loadPayouts(pStatus); }, [tab, pStatus, loadPayouts]);

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2600); };

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
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || "fail");
      flash(d.action || L.done);
      setReports((rs) => rs.filter((x) => (x.report_id || x.id) !== id));
      loadCore();
    } catch { flash(L.failed); }
    finally { setBusyId(""); }
  }

  async function logout() {
    if (me) {
      await fetch("/api/control/logout", {
        method: "POST", credentials: "include", headers: { "X-Control-CSRF": me.csrf },
      }).catch(() => {});
    }
    gotoLogin();
  }

  if (err) return <main className="grid min-h-screen place-items-center p-8 text-slate-600">{err}</main>;
  if (!me || !an) return (
    <main className="grid min-h-screen place-items-center bg-[#fffaf7] p-8">
      <div className="flex items-center gap-3 text-slate-500">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-maroon border-t-transparent" />
        {L.loading}
      </div>
    </main>
  );

  const t = an.totals;
  const tabs: { k: typeof tab; label: string; ownerOnly?: boolean }[] = [
    { k: "overview", label: L.tabOverview },
    { k: "queue", label: L.tabQueue },
    { k: "spotlight", label: L.tabSpotlight },
    { k: "referrals", label: L.tabReferrals },
    { k: "reports", label: L.tabReports },
    { k: "revenue", label: L.tabRevenue, ownerOnly: true },
    { k: "audit", label: L.tabAudit, ownerOnly: true },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#fffaf7] to-[#fbeee7] pb-16">
      {/* header */}
      <header className="sticky top-0 z-30 border-b border-gold/25 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-5 py-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.24em] text-maroon">{L.ops}</p>
            <h1 className="text-lg font-black text-navy md:text-xl">{L.dash}</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden rounded-full bg-maroon-soft px-3 py-1.5 text-[11px] font-bold text-maroon sm:inline">
              {me.username} · {me.role}
            </span>
            <button onClick={loadCore} className="rounded-xl border border-gold/40 px-3 py-1.5 text-[12px] font-bold text-maroon hover:bg-cream">
              ↻ {L.refresh}
            </button>
            <button onClick={logout} className="rounded-xl maroon-gradient px-3 py-1.5 text-[12px] font-bold text-white">
              {L.signout}
            </button>
          </div>
        </div>
        {/* tabs */}
        <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 pb-2 scrollbar-hide">
          {tabs.filter((x) => !x.ownerOnly || owner).map((x) => (
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
                <div key={it.tsap_id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-gold/20 bg-white p-3.5 transition hover:shadow-soft">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-maroon-soft text-lg">
                    {String(it.gender).toLowerCase().startsWith("f") ? "👰" : "🤵"}
                  </div>
                  <div className="min-w-[160px] flex-1">
                    <p className="text-[13.5px] font-bold text-navy">{it.full_name || "—"}</p>
                    <p className="text-[11px] text-slate-500">{it.tsap_id} · {it.age || "—"}y · {it.district || "—"}</p>
                  </div>
                  <StatusPill status={it.status} />
                  <span className="text-[11px] text-slate-400">{L.photo}: {it.photo_status}</span>
                  <div className="flex gap-1.5">
                    <button disabled={busyId === it.tsap_id} onClick={() => profileAction(it.tsap_id, "approve")}
                      className="rounded-lg bg-green-600 px-3 py-1.5 text-[11.5px] font-bold text-white disabled:opacity-50">{L.approve}</button>
                    <button disabled={busyId === it.tsap_id} onClick={() => profileAction(it.tsap_id, "reject")}
                      className="rounded-lg bg-rose-600 px-3 py-1.5 text-[11.5px] font-bold text-white disabled:opacity-50">{L.reject}</button>
                  </div>
                </div>
              ))}
              {!queue.length && <p className="py-8 text-center text-sm text-slate-400">{L.noPending}</p>}
            </div>
          </Card>
        )}

        {/* ---------------- SPOTLIGHT / PROFILES OF THE DAY ---------------- */}
        {tab === "spotlight" && (
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-navy">🌟 {lang === "te" ? "స్పాట్‌లైట్ / నేటి ప్రత్యేక ప్రొఫైళ్లు క్యూ" : "Spotlight & Profiles of the Day Queue"}</h3>
                <p className="mt-0.5 text-[11.5px] text-slate-500">
                  {lang === "te" ? "వినియోగదారులు చెల్లించిన ప్రమోషన్లను ఇక్కడ ఫోటో/వీడియో పరిశీలించి అప్రూవ్ చేయండి." : "Review user paid profile promotions, check photo/video quality, and approve to go live."}
                </p>
              </div>
              <div className="flex gap-1.5">
                {[
                  ["all", lang === "te" ? "అన్నీ" : "All"],
                  ["pending_review", lang === "te" ? "పెండింగ్" : "Pending"],
                  ["active", lang === "te" ? "లైవ్" : "Live"],
                  ["rejected", lang === "te" ? "రిజెక్ట్" : "Rejected"],
                  ["closed", lang === "te" ? "క్లోజ్డ్" : "Closed"],
                ].map(([k, lab]) => (
                  <button key={k} onClick={() => setSpStatus(k)}
                    className={`rounded-full px-3 py-1.5 text-[11.5px] font-bold ${spStatus === k ? "maroon-gradient text-white" : "border border-gold/40 text-maroon hover:bg-cream"}`}>
                    {lab}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 space-y-4">
              {spotlights.map((sp) => (
                <div key={sp.promo_id} className="rounded-2xl border border-gold/30 bg-white p-4 shadow-sm hover:shadow-md transition space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="relative h-14 w-14 shrink-0 rounded-2xl overflow-hidden bg-slate-900 border border-gold/40">
                        <img src={sp.photo_url || "/promo/cine-1.jpg"} alt="Candidate" className="h-full w-full object-cover" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-extrabold text-navy">{sp.full_name}</p>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                            {sp.plan_code} (₹{sp.amount_paid})
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          {sp.tsap_id} · {sp.gender} · {sp.caste} · 🏡 {sp.district}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${
                        sp.status === "active" ? "bg-emerald-100 text-emerald-800" :
                        sp.status === "pending_review" ? "bg-amber-100 text-amber-800 animate-pulse" :
                        sp.status === "rejected" ? "bg-rose-100 text-rose-800" : "bg-slate-100 text-slate-600"
                      }`}>
                        {sp.status}
                      </span>
                    </div>
                  </div>

                  {/* Headline & Pitch */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs text-slate-700 space-y-1">
                    <p className="font-bold text-maroon">📌 {sp.headline}</p>
                    <p className="italic">&ldquo;{sp.pitch_text}&rdquo;</p>
                  </div>

                  {/* Media & Payment reference check */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600 pt-1 border-t border-slate-100">
                    <div className="flex items-center gap-3">
                      <span>💳 <b>Ref:</b> {sp.payment_ref} ({sp.payment_mode})</span>
                      {sp.video_url && (
                        <a href={sp.video_url} target="_blank" rel="noreferrer" className="text-blue-600 font-bold hover:underline flex items-center gap-1">
                          🎥 <span>వీడియో లింక్ చూడండి</span>
                        </a>
                      )}
                    </div>

                    {/* Action buttons */}
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
                          ❌ {lang === "te" ? "రిజెక్ట్ (Refund)" : "Reject & Refund"}
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
                            const utr = prompt(lang === "te" ? "బ్యాంక్ / UPI UTR నంబర్ నమోదు చేయండి:" : "Enter Bank / UPI UTR reference number:");
                            if (utr && utr.trim()) payoutAction(po.id, "approve", utr.trim());
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
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-navy px-5 py-3 text-[13px] font-bold text-white shadow-2xl">
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
