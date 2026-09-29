"use client";
/**
 * 🔐 ADMIN PANEL — మన వివాహ
 * ============================
 * Tabs:
 *   👥 Profiles   → approve (auto-post ki veltundi) / manual credit gift
 *   💰 Payouts    → LIVE referral payout queue (₹50 per paying referral) — UTR tho approve, reject → wallet refund
 *   📊 Analytics  → leads, channels, referral funnel (API nunchi)
 */
import { useCallback, useEffect, useState } from "react";
import AuthGate from "@/components/AuthGate";
import MatchSend from "@/components/MatchSend";
import DailyMatches from "@/components/DailyMatches";
import DataTools from "@/components/DataTools";
import Showcase from "@/components/Showcase";
import AstroConsole from "@/components/AstroConsole";
import AdsConsole from "@/components/AdsConsole";
import PayConsole from "@/components/PayConsole";
import OffersConsole from "@/components/OffersConsole";
import ContentConsole from "@/components/ContentConsole";
import ChannelsConsole from "@/components/ChannelsConsole";
import WANumbersConsole from "@/components/WANumbersConsole";
import ReferralReport from "@/components/ReferralReport";
import { ModerationQueue, StoriesQueue, LeadsPanel, PublishPanel } from "@/components/AdminOps";
import { apiGet, apiPost, authHeaders, getAdminKey, setAdminKey } from "@/lib/api";
import Link from "next/link";
import { Duo, duo } from "@/lib/duo";
import { useLang } from "@/lib/lang";

// 🐞 FIX (F05): ee list lo mundu fake rows (98480xxxxx / 98481xxxxx fake phone numbers) unnayi —
// admin ki nijam kaani data chupinche. WAVE 35: anni rows /api/admin/profiles (backend truth) nunchi matrame.

export default function AdminPage() {
  const { lang } = useLang();
  const te = lang === "te";
  const [tab, setTab] = useState("payouts");
  const [role, setRole] = useState<"owner" | "staff" | "">(""); // W41: staff = limited tabs
  const [profiles, setProfiles] = useState<any[]>([]);
  const [queue, setQueue] = useState<any>({ items: [], count: 0, total_amount: 0 });
  const [utr, setUtr] = useState<Record<string, string>>({});
  const [status, setStatus] = useState("requested");
  const [search, setSearch] = useState("");
  const [flash, setFlash] = useState("");
  const [board, setBoard] = useState<any[]>([]);
  const [vQueue, setVQueue] = useState<any>({ items: [], count: 0, total_amount: 0 });
  const [vStatus, setVStatus] = useState("pending");
  const [vUtr, setVUtr] = useState<Record<string, string>>({});
  const [vRevenue, setVRevenue] = useState<any>(null);
  const [stats, setStats] = useState<any>({});
  // 🔐 WAVE 9 — admin key (X-Admin-Key) + abuse dashboard
  const [profStatus, setProfStatus] = useState("pending");
  const [profQ, setProfQ] = useState("");
  const [profQGo, setProfQGo] = useState("");
  const [profTotal, setProfTotal] = useState(0);
  const [profOffset, setProfOffset] = useState(0);
  const [pFlash, setPFlash] = useState("");
  const [adminKey, setAdminKeyState] = useState("");
  const [needKey, setNeedKey] = useState(false);
  const [abuse, setAbuse] = useState<any>(null);

  useEffect(() => { setAdminKeyState(getAdminKey()); }, []);

  const saveAdminKey = () => {
    setAdminKey(adminKey.trim());
    setNeedKey(false);
    setFlash(adminKey.trim() ? (te ? "🔐 Admin key save అయ్యింది (localStorage లో — browser తర్వాత కూడా గుర్తు ఉంటుంది)" : "🔐 Admin key saved (in localStorage — remembered later too)") : (te ? "🔐 Key తీసేశారు" : "🔐 Key removed"));
  };

  const loadAbuse = useCallback(async () => {
    const { ok, data, needsAdminKey } = await apiGet<any>("/api/admin/abuse", true);
    if (needsAdminKey) { setNeedKey(true); return; }
    if (ok) setAbuse(data);
  }, []);

  useEffect(() => { void loadAbuse(); }, [loadAbuse]);

  /* ---------- loaders ---------- */
  const loadProfiles = useCallback(async () => {
    try {
      const d = await fetch(`/api/admin/profiles?status=${profStatus}&q=${encodeURIComponent(profQGo)}&limit=30&offset=${profOffset}`, { headers: authHeaders(true) })
        .then((r) => { if (r.status === 403) setNeedKey(true); return r.json(); });
      if (d.success) { setProfiles(d.profiles || []); setProfTotal(d.total || 0); }
      else setPFlash(d.detail || "Load fail");
    } catch { setPFlash("Network problem"); }
  }, [profStatus, profQGo, profOffset]);
  useEffect(() => { if (tab === "profiles") void loadProfiles(); }, [tab, loadProfiles]);
  // 👤 W41 — role detect: owner (full) | staff (limited — money/data tabs levu)
  useEffect(() => {
    fetch("/api/admin/whoami", { headers: authHeaders(true) }).then((r) => r.json())
      .then((d) => { if (d?.role) { setRole(d.role); if (d.role === "staff") setTab("matchsend"); } })
      .catch(() => { });
  }, []);

  // 🔐 ADMIN_TOKEN env set unte ee token tho vellali (lekapote dev/demo mode lo open)
  const adminToken = () => {
    try { return localStorage.getItem("tsap_admin_token") || ""; } catch { return ""; }
  };

  const loadQueue = useCallback((st: string) => {
    const tk = adminToken();
    fetch(`/api/admin/payouts?status=${st}${tk ? `&token=${encodeURIComponent(tk)}` : ""}`, { headers: authHeaders(true) })
      .then((r) => { if (r.status === 403) setNeedKey(true); return r.json(); })
      .then((d) => (d.success ? setQueue(d) : setFlash(d.message_telugu || (te ? "⚠️ Admin key check చెయ్యండి (/admin లో key పెట్టండి)" : "⚠️ Check admin key (put key in /admin)"))))
      .catch(() => { });
  }, []);

  useEffect(() => { loadQueue(status); }, [status, loadQueue]);

  const loadVendors = useCallback((st: string) => {
    const tk = adminToken();
    fetch(`/api/admin/vendors?status=${st}${tk ? `&token=${encodeURIComponent(tk)}` : ""}`, { headers: authHeaders(true) })
      .then((r) => { if (r.status === 403) setNeedKey(true); return r.json(); })
      .then((d) => (d.success ? setVQueue(d) : setFlash(d.message_telugu || (te ? "⚠️ Admin key check చెయ్యండి (/admin లో key పెట్టండి)" : "⚠️ Check admin key (put key in /admin)"))))
      .catch(() => { });
    fetch(`/api/admin/vendors/revenue/summary${tk ? `?token=${encodeURIComponent(tk)}` : ""}`, { headers: authHeaders(true) })
      .then((r) => r.json()).then((d) => d.success && setVRevenue(d)).catch(() => { });
  }, []);

  useEffect(() => { if (tab === "vendors") loadVendors(vStatus); }, [tab, vStatus, loadVendors]);

  const actVendor = async (id: string, action: string, pkg?: string) => {
    const q = new URLSearchParams({ action });
    const tk = adminToken();
    if (tk) q.set("token", tk);
    if (action === "approve") {
      const v = (vUtr[id] || "").trim();
      if (!v) { setFlash(te ? "⚠️ Payment reference (UTR) ఇవ్వకుండా vendor activate చెయ్యకూడదు — audit కి. Free కి 'FREE' అని type చెయ్యండి" : "⚠️ Don\u2019t activate vendor without payment reference (UTR) — for audit. Type 'FREE' for free"); return; }
      q.set("utr", v);
      if (pkg) q.set("package", pkg);
    } else if (action === "reject") {
      q.set("reason", te ? "admin_reject: payment/details verify అవ్వలేదు" : "admin_reject: payment/details not verified");
    }
    const r = await fetch(`/api/admin/vendors/${id}/action?${q.toString()}`, { method: "POST", headers: authHeaders(true) });
    const d = await r.json();
    setFlash(d.message_telugu || d.reason || "done");
    loadVendors(vStatus);
  };
  useEffect(() => {
    fetch("/api/referral/leaderboard?period=all&limit=5").then((r) => r.json()).then((d) => setBoard(d.leaderboard || [])).catch(() => { });
    fetch("/api/leads/stats", { headers: authHeaders(true) })
      .then((r) => { if (r.status === 403) setNeedKey(true); return r.json(); })
      .then((d) => setStats((s: any) => ({ ...s, leads: d }))).catch(() => { });
    fetch("/api/channels").then((r) => r.json()).then((d) => setStats((s: any) => ({ ...s, channels: d.stats }))).catch(() => { });
  }, []);

  const act = async (id: string, action: string) => {
    const q = new URLSearchParams({ action });
    const tk = adminToken();
    if (tk) q.set("token", tk);
    if (action === "approve") {
      const v = (utr[id] || "").trim();
      if (!v) { setFlash(te ? "⚠️ UTR/reference number ఇవ్వకుండా approve చెయ్యకూడదు (audit కి)" : "⚠️ Don\u2019t approve without UTR/reference (for audit)"); return; }
      q.set("utr", v);
    } else {
      q.set("reason", te ? "admin_reject: details verify అవ్వలేదు" : "admin_reject: details not verified");
    }
    const r = await fetch(`/api/admin/payouts/${id}/action?${q.toString()}`, { method: "POST", headers: authHeaders(true) });
    const d = await r.json();
    setFlash(d.message_telugu || d.reason || "done");
    loadQueue(status);
  };

  const approveProfile = async (id: string) => {
    try {
      const r = await fetch(`/api/admin/approve/${id}`, { method: "POST", headers: authHeaders(true) });
      const d = await r.json();
      setPFlash(d.success ? `✅ ${id} approve + ${(d.posted_to || []).length} channels` : (d.detail || "done"));
      void loadProfiles();
    } catch { setPFlash("Approve fail - API check"); }
  };

  const giftPremium = async (id: string) => {
    const r = await fetch(`/api/admin/make_premium/${id}?gift_credits=10`, { method: "POST", headers: authHeaders(true) });
    const d = await r.json();
    setPFlash(d.message_telugu || d.detail || "done");
    void loadProfiles();
  };

  const setIdVerified = async (id: string, verified: boolean) => {
    const note = verified ? (window.prompt("Review note (Do not enter ID number)", "Original ID visually matched with profile") || "manual review") : "admin revoke";
    const r = await fetch(`/api/admin/profiles/${id}/id-verification`, {
      method: "POST", headers: { ...authHeaders(true), "Content-Type": "application/json" },
      body: JSON.stringify({ verified, method: "government_id", note }),
    });
    const d = await r.json();
    setPFlash(d.message_telugu || d.detail || "done");
    void loadProfiles();
  };

  const banProfile = async (id: string, ban: boolean) => {
    if (ban && !window.confirm(`${id} BAN? (search/matches/channels నుంచి పోతుంది)`)) return;
    const r = await fetch(`/api/admin/profiles/${id}/${ban ? "ban" : "unban"}`,
      { method: "POST", headers: { ...authHeaders(true), "Content-Type": "application/json" },
        body: JSON.stringify(ban ? { reason: "admin console" } : {}) });
    const d = await r.json();
    setFlash(d.message_telugu || d.detail || "done");
    setPFlash(d.message_telugu || d.detail || "done");
    void loadProfiles();
  };

  const vendorToken = async (id: string) => {
    const r = await fetch(`/api/admin/vendors/${id}/token`, { method: "POST", headers: authHeaders(true) });
    const d = await r.json();
    setFlash(d.success ? `🔑 ${id} token: ${d.vendor_token} (vendor ki WhatsApp lo pampandi)` : (d.detail || "done"));
  };

  const rows = (queue.items || []).filter((p: any) => ((p.code || "") + (p.name || "") + (p.upi_id || "") + p.id).toLowerCase().includes(search.toLowerCase()));

  return (
    <main className="min-h-screen bg-[#FFF8E7] p-4">

      {/* 🔐 WAVE 9 — ADMIN KEY + ABUSE DASHBOARD */}
      <section className="mx-auto max-w-6xl px-4 pt-4">
        <div className="rounded-2xl border-2 border-[#7A0C2E]/25 bg-white p-4">
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex-1 min-w-[240px] text-[12px] font-bold text-[#7A0C2E]">
              {te ? "🔐 Admin key (X-Admin-Key) — leads / payouts / moderation / abuse కి కావాలి" : "🔐 Admin key (X-Admin-Key) — needed for leads / payouts / moderation / abuse"}
              <input value={adminKey} onChange={(e) => setAdminKeyState(e.target.value)} type="password"
                placeholder={te ? "ADMIN_KEY env value (server log లో కూడా ఉంటుంది)" : "ADMIN_KEY env value (also in server log)"}
                className="mt-1 w-full rounded-xl border border-[#7A0C2E]/30 px-3 py-2 font-mono text-[12px]" aria-label={te ? "ADMIN_KEY env value" : "ADMIN_KEY env value"} />
            </label>
            <button onClick={saveAdminKey} className="rounded-xl bg-[#7A0C2E] px-4 py-2 text-[12px] font-bold text-white">💾 Save key</button>
            <button onClick={() => void loadAbuse()} className="rounded-xl border border-[#7A0C2E] px-4 py-2 text-[12px] font-bold text-[#7A0C2E]">🔄 Abuse refresh</button>
          </div>
          {needKey ? (
            <div className="mt-3">
              <AuthGate admin title={te ? "🔒 Admin key కావాలి" : "🔒 Admin key needed"}
                note={te ? "PII (leads phones) + money (payouts) endpoints ఇప్పుడు key తో protect చేశాం. Server start లో \u2018[HARDENING] admin_key=…\u2019 line లో key ఉంటుంది — లేదా ADMIN_KEY env లో పెట్టండి." : "PII (leads phones) + money (payouts) endpoints are now key-protected. The key is in the server start \u2018[HARDENING] admin_key=…\u2019 line — or put ADMIN_KEY in env."} />
            </div>
          ) : null}
          {abuse ? (
            <div className="mt-3 grid grid-cols-2 gap-2 text-[12px] sm:grid-cols-4 lg:grid-cols-6">
              <div className="rounded-xl bg-amber-50 p-2"><b>{abuse.rate_limited}</b><br />🚦 rate limited</div>
              <div className="rounded-xl bg-rose-50 p-2"><b>{abuse.auth_denied}</b><br />🔒 auth denied</div>
              <div className="rounded-xl bg-rose-50 p-2"><b>{abuse.admin_denied}</b><br />🛡️ admin denied</div>
              <div className="rounded-xl bg-sky-50 p-2"><b>{abuse.webhook_replay}</b><br />🔁 payment replay</div>
              <div className="rounded-xl bg-emerald-50 p-2"><b>{abuse.validation_errors}</b><br />🧹 bad inputs</div>
              <div className="rounded-xl bg-slate-50 p-2"><b>{abuse.consent_events}</b><br />📜 consents</div>
            </div>
          ) : null}
        </div>
      </section>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <Link href="/" className="text-sm font-bold text-[#7A0C2E]">← Home</Link>
          <div className="font-bold text-[#7A0C2E]">🔐 Admin Panel</div>
          <div className="text-xs bg-[#7A0C2E] text-white px-3 py-1 rounded-full">Admin only</div>
          {role === "staff" && <div className="telugu text-xs bg-[#B8860B] text-white px-3 py-1 rounded-full">👤 Staff — limited access</div>}
        </div>

        {/* W40 — neat grouped tabs (easy navigation) */}
        {[
          { g: te ? "💰 డబ్బు" : "💰 Money", items: [["payouts", duo("💰 Referral Payouts (live)", "💰 రెఫరల్ చెల్లింపులు")], ["pay", duo("💳 Payments", "💳 చెల్లింపులు")]] },
          { g: te ? "🚀 గ్రోత్" : "🚀 Growth", staff: true, items: [["matchsend", duo("🎯 Match & Send (₹500)", "🎯 మ్యాచ్ & సెండ్")], ["daily", duo("🗓️ Daily Matches", "🗓️ ఈ రోజు మ్యాచ్‌లు")], ["showcase", duo("🎊 Caste Showcase", "🎊 కుల షోకేస్")]] },
          { g: te ? "👥 యూజర్లు" : "👥 Users", staff: true, items: [["profiles", duo("👥 Profiles", "👥 ప్రొఫైళ్లు")], ["photos", duo("📸 Photo Review", "📸 ఫోటో పరిశీలన")], ["safety", duo("🛡️ Safety", "🛡️ భద్రత")]] },
          { g: te ? "📝 కంటెంట్" : "📝 Content", items: [["content", duo("📝 Content (CMS)", "📝 కంటెంట్")], ["astro", duo("🪐 Astro", "🪐 జ్యోతిషం")], ["channels", duo("📡 Channels + Poster", "📡 ఛానళ్లు")]] },
          { g: te ? "⚙️ సిస్టమ్" : "⚙️ System", items: [["ads", duo("📢 Ads", "📢 ప్రకటనలు")], ["offers", duo("🎉 Offers", "🎉 ఆఫర్లు")], ["vendors", duo("🏪 Vendor Ads (live)", "🏪 వెండర్ ప్రకటనలు")], ["analytics", duo("📊 Analytics", "📊 విశ్లేషణ")], ["ops", duo("📮 Ops", "📮 ఆప్స్")], ["data", duo("📤 Excel + Retention", "📤 ఎక్సెల్ + రిటెన్షన్")]] },
        ].filter((grp) => role !== "staff" || grp.staff).map((grp) => (
          <div key={grp.g} className="mb-3">
            <div className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">{grp.g}</div>
            <div className="flex flex-wrap gap-2">
              {grp.items.map(([k, l]) => (
                <button key={k} onClick={() => setTab(k)}
                  className={`px-4 py-2 rounded-full text-[13px] font-bold ${tab === k ? "maroon-gradient text-white" : "bg-white border"}`}>{l}</button>
              ))}
            </div>
          </div>
        ))}

        <div className="grid md:grid-cols-4 gap-3 mb-4">
          <div className="bg-white rounded-2xl p-4 shadow-sm text-center"><div className="text-2xl font-bold text-orange-600">{queue.count || 0}</div><div className="text-xs">Payout requests</div></div>
          <div className="bg-white rounded-2xl p-4 shadow-sm text-center"><div className="text-2xl font-bold text-[#7A0C2E]">₹{queue.total_amount || 0}</div><div className="text-xs">Pending amount</div></div>
          <div className="bg-white rounded-2xl p-4 shadow-sm text-center"><div className="text-2xl font-bold text-green-600">{stats.channels?.total || 0}</div><div className="text-xs">Channels ({stats.channels?.live || 0} live)</div></div>
          <div className="bg-white rounded-2xl p-4 shadow-sm text-center"><div className="text-2xl font-bold">{stats.leads?.total_leads ?? stats.leads?.total ?? 0}</div><div className="text-xs">Leads (visitors)</div></div>
        </div>

        {flash && <div className="mb-3 rounded-xl bg-[#0F1F3C] text-white text-xs p-3">{flash} <button onClick={() => setFlash("")} className="underline ml-2">close</button></div>}

        <div className="bg-white rounded-[1.5rem] p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-bold text-[#7A0C2E]">
              {tab === "payouts" ? duo("💰 Referral Payout Queue — approve with UTR (audit trail)", "💰 రెఫరల్ చెల్లింపులు — UTR తో ఆమోదం")
                : tab === "vendors" ? duo("🏪 Vendor Ads — approve (UTR) → listing live + promo post", "🏪 వెండర్ ప్రకటనలు — ఆమోదం → లైవ్")
                : tab === "profiles" ? duo("Profiles — Approve → post", "ప్రొఫైళ్లు — ఆమోదం → పోస్ట్")
                : tab === "daily" ? duo("🗓️ Matches of the Day — select → caste channels boost post", "🗓️ ఈ రోజు మ్యాచ్‌లు — select → కుల ఛానళ్లలో పోస్ట్")
                : tab === "data" ? duo("📤 Excel downloads + 3-year retention", "📤 ఎక్సెల్ డౌన్‌లోడ్‌లు + 3 సంవత్సరాల రిటెన్షన్") : duo("Analytics", "విశ్లేషణ")}
            </h2>
            <div className="flex gap-2">
              {tab === "payouts" && (
                <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-full border px-3 py-1.5 text-xs" aria-label="Select option">
                  <option value="requested">requested</option><option value="paid">paid</option>
                  <option value="rejected">rejected</option><option value="">anni</option>
                </select>
              )}
              {tab === "vendors" && (
                <select value={vStatus} onChange={(e) => setVStatus(e.target.value)} className="rounded-full border px-3 py-1.5 text-xs" aria-label="Select option">
                  <option value="pending">pending</option><option value="active">active</option>
                  <option value="expired">expired</option><option value="rejected">rejected</option><option value="">anni</option>
                </select>
              )}
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Code / Name / UPI / ID"
                className="px-4 py-2 rounded-full bg-gray-50 border text-xs" aria-label="Code / Name / UPI / ID" />
            </div>
          </div>

          {/* ---------------- MATCH & SEND (₹500 assisted) ---------------- */}
          {tab === "showcase" && (
            <>
              <h2 className="font-bold text-[#7A0C2E] mt-2">🎊 {te ? "వారానికి ఒక కులం — showcase" : "Weekly caste showcase"}</h2>
              <Showcase />
            </>
          )}

          {tab === "daily" && (
            <>
              <h2 className="font-bold text-[#7A0C2E] mt-2">🗓️ Matches of the Day — {te ? "ఎంపిక → ఛానళ్లలో బూస్ట్ పోస్ట్" : "select → boost post in channels"}</h2>
              <DailyMatches />
            </>
          )}

          {tab === "data" && (
            <>
              <h2 className="font-bold text-[#7A0C2E] mt-2">📤 {te ? "Excel + Retention" : "Excel + Retention"}</h2>
              <DataTools />
            </>
          )}

          {tab === "matchsend" && (
            <>
              <h2 className="font-bold text-[#7A0C2E] mt-2">🎯 Match &amp; Send — buyer ID → perfect matches → personal Telegram/WhatsApp</h2>
              <MatchSend />
            </>
          )}

          {/* ---------------- ASTRO ---------------- */}
          {tab === "astro" && (
            <>
              <h2 className="font-bold text-[#7A0C2E] mt-2">🪐 Astrology — 36-guna + dosha + jathakam verify</h2>
              <AstroConsole />
            </>
          )}

          {/* ---------------- ADS ---------------- */}
          {tab === "ads" && (
            <>
              <h2 className="font-bold text-[#7A0C2E] mt-2">📢 Ad campaigns — approve → district/state LIVE</h2>
              <AdsConsole />
            </>
          )}

          {/* ---------------- PAYMENTS ---------------- */}
          {tab === "pay" && (
            <>
              <h2 className="font-bold text-[#7A0C2E] mt-2">💳 Safe-Pay orders — Razorpay auto / UPI-UTR confirm</h2>
              <PayConsole />
            </>
          )}

          {/* ---------------- OFFERS ---------------- */}
          {tab === "offers" && (
            <>
              <h2 className="font-bold text-[#7A0C2E] mt-2">🎉 Festival offers — codes + dates + caps</h2>
              <OffersConsole />
            </>
          )}

          {/* ---------------- CONTENT (CMS) ---------------- */}
          {tab === "content" && (
            <>
              <h2 className="font-bold text-[#7A0C2E] mt-2">📝 Content — pages + stories + banners (code vaddu)</h2>
              <ContentConsole />
            </>
          )}

          {/* ---------------- CHANNELS + POSTER ---------------- */}
          {tab === "channels" && (
            <>
              <h2 className="font-bold text-[#7A0C2E] mt-2">📡 Channels — links map + bulk import + smart poster</h2>
              <ChannelsConsole />
              <WANumbersConsole />
            </>
          )}

          {/* ---------------- SAFETY ---------------- */}
          {tab === "safety" && (
            <>
              <h2 className="font-bold text-[#7A0C2E] mt-2">🛡️ Safety — reports + success-story approvals</h2>
              <ModerationQueue />
              <h2 className="font-bold text-[#7A0C2E] mt-4">💑 Success stories — approve → page + channels</h2>
              <StoriesQueue />
            </>
          )}

          {/* ---------------- OPS ---------------- */}
          {tab === "ops" && (
            <>
              <h2 className="font-bold text-[#7A0C2E] mt-2">📈 Leads — follow-up (24h lo)</h2>
              <LeadsPanel />
              <h2 className="font-bold text-[#7A0C2E] mt-4">📮 Publish control — re-post + digest + dead letters</h2>
              <PublishPanel />
            </>
          )}

          {/* ---------------- PHOTO REVIEW ---------------- */}
          {tab === "photos" && (
            <div className="mt-2 rounded-2xl border border-gold/30 bg-cream/50 p-5 text-center">
              <div className="text-3xl">📸</div>
              <h2 className="font-bold text-[#7A0C2E] mt-1">Photo + Selfie Review Queue</h2>
              <p className="text-[12px] text-gray-600 telugu">{te ? "Technical checks pass అయిన photos — wrong-person/group/celebrity ని reject చెయ్యండి." : "Photos that passed technical checks — reject wrong-person/group/celebrity."}</p>
              <Link href="/admin/photos"
                className="mt-3 inline-block rounded-xl maroon-gradient text-white font-bold px-6 py-2.5 text-sm">
                Open Review Queue →
              </Link>
            </div>
          )}

          {/* ---------------- PAYOUTS ---------------- */}
          {tab === "payouts" && (
            <>
              <ReferralReport />
              <p className="text-xs text-gray-500 mt-2 telugu">
{te ? <>₹50 per paying referral — first payment ONLY (flat, అంతే). UPI copy → PhonePe deep link → pay → UTR పెట్టండి → approve → user transaction list లో PAID ✅
                Reject చేస్తే wallet కి మళ్లీ credit అవుతుంది (automatic).</> : <>₹50 per paying referral — first payment ONLY (flat, that\u2019s it). UPI copy → PhonePe deep link → pay → put UTR → approve → PAID in user transaction list ✅
                On reject, wallet re-credits automatically.</>}
              </p>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-xs text-gray-500 border-b">
                    <th className="text-left p-2">Request</th><th>Referrer</th><th>UPI / Bank</th>
                    <th>Amount</th><th>UTR / Action</th>
                  </tr></thead>
                  <tbody>
                    {rows.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-xs text-gray-500">{te ? "ఈ status లో requests లేవు 🙂" : "No requests in this status 🙂"}</td></tr>}
                    {rows.map((p: any) => (
                      <tr key={p.id} className="border-b">
                        <td className="p-2 text-xs">
                          <div className="font-bold">{p.id}</div>
                          <div className="text-[10px] text-gray-500">{p.requested_at?.slice(0, 16).replace("T", " ")}</div>
                          <div className={`mt-1 inline-block px-2 py-0.5 rounded-full text-[10px] ${p.status === "paid" ? "bg-green-100 text-green-700" : p.status === "rejected" ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"}`}>{p.status}{p.utr ? ` · ${p.utr}` : ""}</div>
                        </td>
                        <td className="p-2 text-xs">
                          <div className="font-bold">{p.name}</div>
                          <div className="text-[11px] text-gray-500">{p.code} • {p.tier}</div>
                          <div className="text-[10px] text-gray-400">{p.tsap_id}</div>
                        </td>
                        <td className="p-2 text-xs">
                          {p.method === "upi" ? <div className="font-bold">📱 {p.upi_id}</div>
                            : <div className="font-bold">🏦 {p.bank?.holder}<br />{p.bank?.account_no} · {p.bank?.ifsc}</div>}
                          <button onClick={() => navigator.clipboard?.writeText(p.upi_id || p.bank?.account_no || "")}
                            className="mt-1 px-2 py-0.5 bg-gray-100 rounded-full text-[10px]">📋 copy</button>
                        </td>
                        <td className="p-2 text-center font-bold text-[#7A0C2E]">₹{p.amount}</td>
                        <td className="p-2">
                          {p.status === "requested" ? (
                            <div className="flex flex-col gap-1">
                              <input value={utr[p.id] || ""} onChange={(e) => setUtr({ ...utr, [p.id]: e.target.value })}
                                placeholder="UTR / ref no" className="rounded-lg border px-2 py-1 text-xs w-36" aria-label="UTR / ref no" />
                              <div className="flex gap-1">
                                <button onClick={() => act(p.id, "approve")} className="px-3 py-1 bg-green-600 text-white rounded-full text-xs">✅ Paid</button>
                                <button onClick={() => act(p.id, "reject")} className="px-3 py-1 bg-red-500 text-white rounded-full text-xs">❌ Reject</button>
                                {p.method === "upi" && (
                                  <a href={`phonepe://pay?pa=${p.upi_id}&pn=${encodeURIComponent(p.name)}&am=${p.amount}&tn=Manavivaha Referral ${p.code}`}
                                    className="px-3 py-1 bg-[#6739B7] text-white rounded-full text-center text-xs">📱 PhonePe</a>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="text-[11px] text-gray-500">{p.paid_at ? `paid ${p.paid_at.slice(0, 16).replace("T", " ")}` : p.reason}</div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 rounded-xl bg-[#0F1F3C] text-white text-xs p-4">
                <div className="font-bold text-[#D4AF37]">💡 Payout process (manual — 10 sec)</div>
                <div className="mt-1 space-y-0.5 opacity-90">
                  <div>1. Copy UPI → 2. PhonePe deep link (amount auto) → 3. Send → 4. UTR paste → 5. ✅ Paid</div>
                  <div>{te ? "Reject అయితే → referrer wallet కి auto-credit + message వెళ్తుంది. అన్ని entries ledger లో (audit) ఉంటాయి." : "On reject → referrer wallet auto-credits + message goes. All entries stay in ledger (audit)."}</div>
                </div>
              </div>
            </>
          )}

          {/* ---------------- VENDOR ADS ---------------- */}
          {tab === "vendors" && (
            <>
              <p className="text-xs text-gray-500 mt-2 telugu">
{te ? <>Vendor signup (catering/photography/decorations/hall/pandit...) → payment verify → <b>activate</b> చేస్తే
                listing + Telugu promo post + poster ready. Enquiries direct vendor WhatsApp కి వెళ్తాయి.</> : <>Vendor signup (catering/photography/decorations/hall/pandit...) → payment verify → on <b>activate</b>,
                listing + Telugu promo post + poster ready. Enquiries go direct to vendor WhatsApp.</>}
              </p>
              {vRevenue && (
                <div className="mt-3 grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
                  {[
                    { l: "Active vendors", v: vRevenue.active, c: "text-green-600" },
                    { l: "Pending", v: vRevenue.pending, c: "text-orange-600" },
                    { l: "Collected (₹)", v: vRevenue.collected, c: "text-[#7A0C2E]" },
                    { l: "MRR (₹)", v: vRevenue.mrr, c: "text-[#7A0C2E]" },
                    { l: "Leads (total)", v: vRevenue.leads_total, c: "text-[#0F1F3C]" },
                  ].map((x) => (
                    <div key={x.l} className="bg-gray-50 rounded-2xl p-3">
                      <div className={`text-xl font-bold ${x.c}`}>{x.v}</div>
                      <div className="text-[11px] text-gray-500">{x.l}</div>
                    </div>
                  ))}
                </div>
              )}
              {vRevenue?.renewals_due?.length > 0 && (
                <div className="mt-3 rounded-xl bg-[#FFF8E7] border border-[#D4AF37]/50 p-3 text-xs text-[#7A0C2E]">
                  ⏳ <b>{vRevenue.renewals_due.length}</b> {te ? <>listings ఈ వారంలో expire అవుతున్నాయి — renewal call చెయ్యండి:</> : <>listings expiring this week — make renewal calls:</>}
                  {" "}{vRevenue.renewals_due.map((r: any) => r.name).join(", ")}
                </div>
              )}
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-xs text-gray-500 border-b">
                    <th className="text-left p-2">Vendor</th><th>Category</th><th>Contact</th>
                    <th>Package</th><th>UTR / Action</th>
                  </tr></thead>
                  <tbody>
                    {(vQueue.items || []).length === 0 && (
                      <tr><td colSpan={5} className="p-4 text-center text-xs text-gray-500">{te ? "ఈ status లో vendor requests లేవు 🙂" : "No vendor requests in this status 🙂"}</td></tr>
                    )}
                    {(vQueue.items || []).map((v: any) => (
                      <tr key={v.id} className="border-b align-top">
                        <td className="p-2 text-xs">
                          <div className="font-bold">{v.icon} {v.business_name}</div>
                          <div className="text-[10px] text-gray-500">{v.id} • {v.city}{v.district ? `, ${v.district}` : ""}</div>
                          <div className={`mt-1 inline-block px-2 py-0.5 rounded-full text-[10px] ${v.status === "active" ? "bg-green-100 text-green-700" : v.status === "rejected" ? "bg-red-100 text-red-700" : v.status === "expired" ? "bg-gray-200 text-gray-700" : "bg-orange-100 text-orange-700"}`}>
                            {v.status}{v.expires_at ? ` → ${v.expires_at.slice(0, 10)}` : ""}
                          </div>
                          {v.about && <div className="text-[10px] text-gray-500 mt-1 max-w-[220px] line-clamp-2">{v.about}</div>}
                        </td>
                        <td className="p-2 text-xs">{v.category_te || v.category}<div className="text-[10px] text-gray-500">{v.price_range}</div></td>
                        <td className="p-2 text-xs">
                          <a href={`https://wa.me/91${v.whatsapp || v.phone}`} target="_blank" rel="noreferrer" className="font-bold text-green-700 underline">📞 {v.phone}</a>
                          <div className="text-[10px] text-gray-500">owner: {v.owner_name || "-"} • {v.experience_years || "-"} yrs</div>
                        </td>
                        <td className="p-2 text-xs">
                          <div className="font-bold text-[#7A0C2E]">₹{v.package_price} <span className="text-[10px] text-gray-500">/ {v.package_days}d</span></div>
                          <div className="text-[10px] text-gray-500">{v.package}</div>
                        </td>
                        <td className="p-2">
                          {v.status === "pending" ? (
                            <div className="flex flex-col gap-1">
                              <input value={vUtr[v.id] || ""} onChange={(e) => setVUtr({ ...vUtr, [v.id]: e.target.value })}
                                placeholder="UTR / payment ref" className="rounded-lg border px-2 py-1 text-xs w-36" aria-label="UTR / payment ref" />
                              <div className="flex flex-wrap gap-1">
                                <button onClick={() => actVendor(v.id, "approve", v.package)} className="px-3 py-1 bg-green-600 text-white rounded-full text-xs">✅ Activate</button>
                                <button onClick={() => actVendor(v.id, "reject")} className="px-3 py-1 bg-red-500 text-white rounded-full text-xs">❌ Reject</button>
                                {v.whatsapp_link && (
                                  <a href={v.whatsapp_link} target="_blank" rel="noreferrer" className="px-3 py-1 bg-[#6739B7] text-white rounded-full text-xs">💬 WA</a>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {v.status === "active" && (
                                <button onClick={() => actVendor(v.id, "expire")} className="px-3 py-1 bg-gray-200 rounded-full text-xs">⏳ Expire</button>
                              )}
                              {v.status !== "active" && (
                                <button onClick={() => actVendor(v.id, "approve", v.package)} className="px-3 py-1 bg-green-600 text-white rounded-full text-xs">♻️ Reactivate</button>
                              )}
                              <button onClick={() => void vendorToken(v.id)} className="px-3 py-1 bg-gray-100 rounded-full text-xs">🔑 token</button>
                              <a href={`/vendors/${v.id}`} className="px-3 py-1 bg-gray-100 rounded-full text-xs">👁️ view</a>
                              <a href={`/api/vendors/${v.id}/poster.png`} download className="px-3 py-1 bg-gray-100 rounded-full text-xs">⬇️ poster</a>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 rounded-xl bg-[#0F1F3C] text-white text-xs p-4">
                <div className="font-bold text-[#D4AF37]">🏪 Vendor process (30 sec)</div>
                <div className="mt-1 space-y-0.5 opacity-90">
                  <div>1. Payment vachhinda check (UPI/phone) → 2. UTR paste → 3. ✅ Activate → 4. Listing + promo post live (+ poster download)</div>
                  <div>{te ? "Enquiries అన్నీ vendor WhatsApp కి auto-వెళ్తాయి (lead text లో number, budget, event date ఉంటుంది)." : "All enquiries auto-go to vendor WhatsApp (lead text has number, budget, event date)."}</div>
                </div>
              </div>
            </>
          )}

          {/* ---------------- PROFILES (backend queue) ---------------- */}
          {tab === "profiles" && (
            <div className="mt-2">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {[["pending", "Pending"], ["approved", "Approved"], ["banned", "Banned"], ["all", "All"]].map(([v, l]) => (
                  <button key={v} onClick={() => { setProfStatus(v); setProfOffset(0); }}
                    className={`rounded-full px-3 py-1.5 font-bold ${profStatus === v ? "maroon-gradient text-white" : "bg-gray-100"}`}>{l}</button>
                ))}
                <input value={profQ} onChange={(e) => setProfQ(e.target.value)} placeholder="ID / name / phone / caste / district"
                  className="min-w-[200px] flex-1 rounded-full border px-3 py-1.5" aria-label="search profiles" />
                <button onClick={() => { setProfQGo(profQ); setProfOffset(0); }} className="rounded-full bg-[#7A0C2E] px-4 py-1.5 font-bold text-white">🔍 Search</button>
                <span className="font-bold text-[#7A0C2E]">{profTotal} profiles</span>
                <button onClick={() => void loadProfiles()} className="underline">↻ refresh</button>
              </div>
              {pFlash && <div className="mb-2 mt-2 rounded-xl bg-[#0F1F3C] p-2 text-xs text-white">{pFlash}</div>}
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-xs text-gray-500">
                    <th className="p-2 text-left">Profile</th><th>Contact</th><th>Status</th><th>Credits</th><th>Actions</th>
                  </tr></thead>
                  <tbody>
                    {!profiles.length && <tr><td colSpan={5} className="p-4 text-center text-xs text-gray-500">Ee queue khali 🙂</td></tr>}
                    {profiles.map((p: any) => (
                      <tr key={p.tsap_id} className="border-b align-top">
                        <td className="p-2 text-xs">
                          <div className="font-mono font-bold">{p.tsap_id}</div>
                          <div className="font-bold">{p.full_name} • {p.gender} • {p.age}y</div>
                          <div className="text-[11px] text-gray-500">{p.caste} • {p.district} ({p.state})</div>
                          <div className="text-[10px] text-gray-400">{String(p.created_at || "").slice(0, 16).replace("T", " ")}{p.has_photo ? " • 📸" : ""}</div>
                        </td>
                        <td className="p-2 text-xs">
                          {p.phone ? <a href={`https://wa.me/91${p.phone}`} target="_blank" rel="noreferrer" className="font-mono font-bold text-green-700 underline">📞 {p.phone}</a> : <span className="text-gray-400">—</span>}
                          <div className="mt-1 text-[10px]">{p.phone_verified ? "✅ phone" : "⏳ phone"} • {p.id_verified ? "🪪 ID verified" : "— ID pending"}</div>
                        </td>
                        <td className="p-2 text-xs">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${p.is_banned ? "bg-red-100 text-red-700" : p.is_approved ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                            {p.is_banned ? "BANNED" : p.is_approved ? "Approved" : "Pending"}
                          </span>
                          {(p.warnings || 0) > 0 && <div className="mt-1 text-[10px] text-amber-700">⚠️ {p.warnings} warnings</div>}
                        </td>
                        <td className="p-2 text-center text-xs"><b>{p.credits}</b><div className="text-[10px] text-gray-500">{p.plan}</div></td>
                        <td className="p-2">
                          <div className="flex max-w-[220px] flex-wrap gap-1">
                            {!p.is_approved && !p.is_banned && (
                              <button onClick={() => void approveProfile(p.tsap_id)} className="rounded-full bg-green-600 px-3 py-1 text-xs text-white">✅ Approve</button>
                            )}
                            <button onClick={() => void giftPremium(p.tsap_id)} className="rounded-full bg-[#D4AF37] px-3 py-1 text-xs font-bold">💎 +10</button>
                            {p.id_verified ? (
                              <button onClick={() => void setIdVerified(p.tsap_id, false)} className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800">🪪 Revoke ID</button>
                            ) : (
                              <button onClick={() => void setIdVerified(p.tsap_id, true)} className="rounded-full bg-blue-600 px-3 py-1 text-xs font-bold text-white">🪪 Verify ID</button>
                            )}
                            {p.is_banned ? (
                              <button onClick={() => void banProfile(p.tsap_id, false)} className="rounded-full bg-blue-600 px-3 py-1 text-xs text-white">♻️ Unban</button>
                            ) : (
                              <button onClick={() => void banProfile(p.tsap_id, true)} className="rounded-full bg-red-100 px-3 py-1 text-xs text-red-700">⛔ Ban</button>
                            )}
                            <a href={`/search/${p.tsap_id}`} className="rounded-full bg-gray-100 px-3 py-1 text-xs">👁️ view</a>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs">
                <button disabled={profOffset === 0} onClick={() => setProfOffset(Math.max(0, profOffset - 30))} className="rounded-full bg-gray-100 px-3 py-1 disabled:opacity-40">← prev</button>
                <span>{profOffset + 1}–{Math.min(profOffset + 30, profTotal)} / {profTotal}</span>
                <button disabled={profOffset + 30 >= profTotal} onClick={() => setProfOffset(profOffset + 30)} className="rounded-full bg-gray-100 px-3 py-1 disabled:opacity-40">next →</button>
              </div>
            </div>
          )}

          {/* ---------------- ANALYTICS ---------------- */}
          {tab === "analytics" && (
            <div className="mt-4 grid md:grid-cols-2 gap-4 text-xs">
              <div className="rounded-2xl border p-4">
                <div className="font-bold text-[#7A0C2E]">🏆 Top referrers (live)</div>
                <div className="mt-2 space-y-1">
                  {board.length === 0 && <div className="text-gray-500">{te ? "Data లేదు — referrers start చెయ్యండి" : "No data yet — referrers will start it"}</div>}
                  {board.map((b) => (
                    <div key={b.code} className="flex justify-between bg-gray-50 rounded-lg px-3 py-2">
                      <span>{b.rank}. {b.name} ({b.code})</span>
                      <span className="font-bold text-green-600">₹{b.earned} · {b.paid} paid</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border p-4">
                <div className="font-bold text-[#7A0C2E]">📢 Channels</div>
                <div className="mt-2 space-y-1">
                  <div>Total: <b>{stats.channels?.total ?? "—"}</b> • Live: <b>{stats.channels?.live ?? "—"}</b> • To create: <b>{stats.channels?.to_create ?? "—"}</b></div>
                  {stats.channels?.by_tier && Object.entries(stats.channels.by_tier).map(([k, v]) => (
                    <div key={k} className="flex justify-between bg-gray-50 rounded-lg px-3 py-1.5"><span>{k}</span><span className="font-bold">{String(v)}</span></div>
                  ))}
                </div>
                <Link href="/channels" className="mt-2 inline-block underline font-bold text-[#7A0C2E]">Channel setup →</Link>
              </div>
              <div className="rounded-2xl border p-4">
                <div className="font-bold text-[#7A0C2E]">📈 Leads / visitors</div>
                <div className="mt-2 space-y-1">
                  {stats.leads ? Object.entries(stats.leads).slice(0, 6).map(([k, v]) => (
                    <div key={k} className="flex justify-between bg-gray-50 rounded-lg px-3 py-1.5"><span>{k}</span><span className="font-bold">{typeof v === "object" ? JSON.stringify(v).slice(0, 40) : String(v)}</span></div>
                  )) : <div className="text-gray-500">Loading…</div>}
                </div>
              </div>
              <div className="rounded-2xl border p-4">
                <div className="font-bold text-[#7A0C2E]">🩺 System health</div>
                <a href="/api/system/health" target="_blank" rel="noreferrer" className="mt-2 block underline font-bold text-[#7A0C2E]">/api/system/health →</a>
                <a href="/api/wa/status" target="_blank" rel="noreferrer" className="mt-1 block underline font-bold text-[#7A0C2E]">/api/wa/status →</a>
                <a href="/api/bots/health" target="_blank" rel="noreferrer" className="mt-1 block underline font-bold text-[#7A0C2E]">/api/bots/health →</a>
                <a href="/api/referral/leaderboard?period=week" target="_blank" rel="noreferrer" className="mt-1 block underline font-bold text-[#7A0C2E]">/api/referral/leaderboard?period=week →</a>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
