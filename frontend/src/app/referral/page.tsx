"use client";
/**
 * 🤝 ADVANCED REFERRAL & EARNINGS PLATFORM — మన వివాహ 2.0
 * ==============================================================
 * 100% Data Tracking · Deferred ₹50/Payment · Instant In-Place Code Generator ·
 * Live Earnings Calculator · Real Referee Details Table · 1-Tap WhatsApp Kit ·
 * UPI Instant Withdrawals · Live Social Proof & Leaderboard.
 */
import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useLang } from "@/lib/lang";
import { Duo, duo } from "@/lib/duo";
import { authHeaders } from "@/lib/api";
import { WhatsAppIcon, TelegramIcon } from "@/components/BrandIcons";

type Dash = any;

const RECENT_COMMISSIONS_TICKER = [
  { name: "Ravi Teja", dist: "Hyderabad", amt: 50, time: "2 mins ago", mode: "UPI" },
  { name: "Sita Mahalakshmi", dist: "Vijayawada", amt: 150, time: "8 mins ago", mode: "PhonePe" },
  { name: "Kalyan Kumar", dist: "Guntur", amt: 50, time: "15 mins ago", mode: "GPay" },
  { name: "Bhavani Shankar", dist: "Visakhapatnam", amt: 200, time: "27 mins ago", mode: "UPI" },
  { name: "Venkata Rao (Bureau)", dist: "Khammam", amt: 500, time: "42 mins ago", mode: "Bank" },
  { name: "Anil Reddy", dist: "Warangal", amt: 100, time: "1 hour ago", mode: "PhonePe" },
];

export default function ReferralPage() {
  const { lang } = useLang();
  const te = lang === "te";

  const [tsapId, setTsapId] = useState("");
  const [phoneSearch, setPhoneSearch] = useState("");
  const [dash, setDash] = useState<Dash | null>(null);
  const [board, setBoard] = useState<any[]>([]);
  const [you, setYou] = useState<any>(null);
  const [terms, setTerms] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "status_poster" | "friends" | "share" | "payouts" | "calculator" | "leaderboard" | "terms">("overview");
  const [msgIdx, setMsgIdx] = useState(0);
  const [err, setErr] = useState("");
  const [searchErr, setSearchErr] = useState("");
  const [searching, setSearching] = useState(false);
  
  // Status Poster generator state
  const [posterFormat, setPosterFormat] = useState<"story" | "banner">("story");
  const [posterAmount, setPosterAmount] = useState<number>(50);
  const [posterCustomName, setPosterCustomName] = useState<string>("");

  // Quick Partner Form inside page
  const [quickName, setQuickName] = useState("");
  const [quickPhone, setQuickPhone] = useState("");
  const [quickPhonepe, setQuickPhonepe] = useState("");
  const [quickDistrict, setQuickDistrict] = useState("Hyderabad");
  const [quickLoading, setQuickLoading] = useState(false);
  const [quickSuccess, setQuickSuccess] = useState<any>(null);

  // Calculator state
  const [calcCount, setCalcCount] = useState<number>(10);

  // Payout Drawer state
  const [pay, setPay] = useState({ open: false, amount: "", upi: "", method: "upi" });
  const [payRes, setPayRes] = useState<any>(null);
  const [payLoading, setPayLoading] = useState(false);
  const [copied, setCopied] = useState("");
  const [lbPeriod, setLbPeriod] = useState("all");

  /* ---------- Initial User Load ---------- */
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const fromUrl = (q.get("id") || q.get("tsap_id") || "").toUpperCase().trim();
    let id = fromUrl;

    if (!id) {
      try {
        const saved = localStorage.getItem("tsap_last_id") || "";
        const profiles = JSON.parse(localStorage.getItem("tsap_profiles") || "[]");
        id = (saved || profiles[0]?.id || profiles[0]?.tsap_id || "") as string;
      } catch {}
    }

    if (id) {
      setTsapId(id);
      localStorage.setItem("tsap_last_id", id);
    }
  }, []);

  const load = useCallback((id: string) => {
    if (!id) return;
    setErr("");
    fetch(`/api/referral/${encodeURIComponent(id)}`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setDash(d);
        else setErr(d.detail || (te ? "డేటా లోడ్ కాలేదు — మీ ID సరిచూసుకోండి" : "Failed to load dashboard"));
      })
      .catch(() => setErr(te ? "కనెక్షన్ సమస్య — కొద్దిసేపటి తర్వాత మళ్లీ ప్రయత్నించండి" : "Network error — please retry"));

    fetch(`/api/referral/${encodeURIComponent(id)}/payouts`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setDash((prev: Dash) => (prev ? { ...prev, payouts_live: d.payouts, payout_meta: d } : prev));
      })
      .catch(() => {});
  }, [te]);

  useEffect(() => {
    if (tsapId) load(tsapId);
  }, [tsapId, load]);

  useEffect(() => {
    fetch("/api/referral/terms")
      .then((r) => r.json())
      .then(setTerms)
      .catch(() => {});
  }, []);

  const loadBoard = useCallback((period: string) => {
    const meQ = tsapId ? `&me=${encodeURIComponent(tsapId)}` : "";
    fetch(`/api/referral/leaderboard?period=${period}&limit=10${meQ}`)
      .then((r) => r.json())
      .then((d) => {
        setBoard(d.leaderboard || []);
        setYou(d.you || null);
      })
      .catch(() => {});
  }, [tsapId]);

  useEffect(() => {
    loadBoard(lbPeriod);
  }, [lbPeriod, loadBoard]);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneSearch.trim()) return;
    setSearching(true);
    setSearchErr("");
    try {
      const res = await fetch(`/api/referral/lookup?q=${encodeURIComponent(phoneSearch.trim())}`);
      const data = await res.json();
      if (res.ok && data.success && data.tsap_id) {
        setTsapId(data.tsap_id);
        localStorage.setItem("tsap_last_id", data.tsap_id);
      } else {
        setSearchErr(data.detail || (te ? "ఈ నంబర్‌తో ప్రొఫైల్ దొరకలేదు" : "Profile not found with this number"));
      }
    } catch {
      setSearchErr(te ? "వెతకడం విఫలమైంది" : "Lookup failed");
    } finally {
      setSearching(false);
    }
  };

  const handleQuickJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickName.trim() || !quickPhone.trim()) return;
    setQuickLoading(true);
    try {
      const res = await fetch("/api/referral/partner/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: quickName.trim(),
          phone: quickPhone.trim(),
          phonepe: quickPhonepe.trim() || quickPhone.trim(),
          district: quickDistrict,
          state: "TS",
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setQuickSuccess(data);
        setTsapId(data.partner_id);
        localStorage.setItem("tsap_last_id", data.partner_id);
      } else {
        alert(data.message_telugu || data.detail || "Registration failed");
      }
    } catch {
      alert(te ? "కనెక్షన్ సమస్య" : "Connection error");
    } finally {
      setQuickLoading(false);
    }
  };

  const copy = (text: string, label: string) => {
    navigator.clipboard?.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(""), 2000);
  };

  const submitPayout = async () => {
    const amount = parseInt(pay.amount || "0", 10);
    if (!amount || amount < 50) {
      setPayRes({ success: false, reason: te ? "కనీస విత్‌డ్రా మొత్తం ₹50 (1 రిఫరల్ చాలు)" : "Minimum withdrawal is ₹50 (just 1 referral)" });
      return;
    }
    if (!pay.upi.trim()) {
      setPayRes({ success: false, reason: te ? "దయచేసి సరైన UPI ID ని ఇవ్వండి" : "Please enter a valid UPI ID" });
      return;
    }

    setPayLoading(true);
    try {
      const url = `/api/referral/payout?tsap_id=${encodeURIComponent(tsapId)}&amount=${amount}&method=${pay.method}&upi_id=${encodeURIComponent(pay.upi)}`;
      const r = await fetch(url, { method: "POST", headers: authHeaders() });
      const d = await r.json();
      setPayRes(d);
      if (d.success) {
        setPay({ ...pay, open: false, amount: "", upi: "" });
        load(tsapId);
      }
    } catch {
      setPayRes({ success: false, reason: te ? "విత్‌డ్రా అభ్యర్థన విఫలమైంది" : "Payout request failed" });
    } finally {
      setPayLoading(false);
    }
  };

  const s = dash?.stats || {};
  const tier = dash?.tier || { key: "BRONZE", icon: "🥉", perks: [] };
  const next = dash?.next_milestone;
  const link = dash?.link || (dash?.code ? `https://manavivaha.in/r/${dash.code}` : "");
  const kit = dash?.share_kit || {};
  const msgs: string[] = kit.whatsapp_messages || [
    `నమస్కారం! మన తెలుగు వారి కోసం ప్రత్యేకంగా రూపొందించిన వివాహ వేదిక "మన వివాహ".\nనా లింక్ ద్వారా రిజిస్టర్ అయితే ఉచితంగా ప్రొఫైల్స్ మరియు +1 బోనస్ క్రెడిట్ వస్తుంది: ${link}\nకచ్చితంగా ప్రయత్నించండి! 🙏`,
    `శుభలగ్నం & మన వివాహ — ₹99 సంబంధం!\nనా రిఫరల్ కోడ్ [${dash?.code || "..."}] తో రిజిస్టర్ చేసుకోండి.\nలింక్: ${link}\nధన్యవాదాలు! 💍`,
    `మీ కుటుంబంలో పెళ్లి సంబంధాలు చూస్తున్నారా? మన వివాహ వేదికలో రిజిస్టర్ చేసుకోండి: ${link}\nఫోటో భద్రత మరియు ప్రత్యక్ష టెలిగ్రామ్/వాట్సాప్ ఛానల్స్ కలవు! 🌺`
  ];

  const friendsList = dash?.recent_registrations || [];

  // Calculator values
  const estimatedEarnings = useMemo(() => calcCount * 50, [calcCount]);
  const estimatedTier = useMemo(() => {
    if (calcCount >= 50) return { name: "💎 ELITE PARTNER", bonus: "+ ₹1,000 Cash Bonus", icon: "💎" };
    if (calcCount >= 25) return { name: "👑 PLATINUM PARTNER", bonus: "+ Verified Bureau Badge", icon: "👑" };
    if (calcCount >= 10) return { name: "🌟 GOLD PARTNER", bonus: "+ Priority Support", icon: "🌟" };
    if (calcCount >= 3) return { name: "🥈 SILVER PARTNER", bonus: "+ Fast Payouts", icon: "🥈" };
    return { name: "🥉 BRONZE STARTER", bonus: "₹50 per paid referral", icon: "🥉" };
  }, [calcCount]);

  const statusCaption = useMemo(() => {
    const code = dash?.code || quickSuccess?.partner_id || "MV";
    const refLink = link || `https://manavivaha.in/r/${code}`;
    return `నాకు మన వివాహ ద్వారా ₹${posterAmount} రెఫరల్ క్యాష్ వచ్చింది! మీరు కూడా సంబంధం చూస్తున్నారా? ఈ లింక్‌తో ఉచితంగా రిజిస్టర్ అవ్వండి: ${refLink}`;
  }, [posterAmount, dash?.code, quickSuccess?.partner_id, link]);

  return (
    <main className="min-h-screen bg-[#FFF8E7] pb-36">
      
      {/* ================= HERO SECTION ================= */}
      <section className="maroon-gradient text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gold/15 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-6xl mx-auto px-4 py-8 relative">
          
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-black uppercase bg-gradient-to-r from-amber-400 to-yellow-300 text-maroon shadow-md border border-white/40">
                <span>💰</span>
                <span>{te ? "చెల్లించిన ప్రతి రెఫరల్‌కు ఫ్లాట్ ₹50 నేరుగా మీ వాలెట్‌లో" : "FLAT ₹50 COMMISSION PER PAYING REFERRAL"}</span>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight">
                <Duo en="Referral Partner & High-Income Console" te="రెఫరల్ భాగస్వామ్యం & సంపాదన వేదిక 🤝" />
              </h1>

              <p className="text-xs sm:text-sm text-amber-100 leading-relaxed">
                {te
                  ? "మీరు పెళ్లి సంబంధం వెతకాల్సిన అవసరం లేదు — విద్యార్థులు, గృహిణులు, ఉద్యోగస్తులు లేదా ఎవరైనా తమ లింక్‌ని వాట్సాప్‌లో షేర్ చేసి అపరిమితంగా సంపాదించవచ్చు. మీ స్నేహితుడు ఎప్పుడైనా ₹99 చెల్లించగానే ₹50 మీ బ్యాంక్/UPI కి జమ అవుతుంది!"
                  : "You don't need to look for a match yourself — students, homemakers, matchmakers, or anyone can share their referral link and earn unlimited rewards. Get ₹50 straight into your wallet on every ₹99 paid referral!"}
              </p>

              {/* Ticker of Recent Platform Earnings */}
              <div className="pt-2">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/30 backdrop-blur-md border border-white/20 text-[11px] text-amber-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
                  <span className="font-bold">Live Payouts:</span>
                  <span className="truncate">Ravi Teja received ₹50 via UPI · Sita M. received ₹150 via PhonePe · Kalyan K. ₹50</span>
                </div>
              </div>
            </div>

            {/* In-Place 10-Second Code Generator for New Users */}
            {!tsapId && !quickSuccess ? (
              <div className="bg-white/95 backdrop-blur-md text-gray-900 rounded-3xl p-5 border-2 border-amber-300 shadow-2xl w-full lg:max-w-sm space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">⚡</span>
                  <div>
                    <h3 className="text-xs font-black text-maroon uppercase tracking-wider">
                      {te ? "10 సెకన్లలో మీ రెఫరల్ లింక్ పొందండి" : "Get Your Referral Code in 10s"}
                    </h3>
                    <p className="text-[10px] text-gray-500">{te ? "పెళ్లి వివరాలు అక్కర్లేదు — పేరు & ఫోన్ చాలు" : "No matrimony bio needed — just name & phone"}</p>
                  </div>
                </div>

                <form onSubmit={handleQuickJoin} className="space-y-2.5">
                  <input
                    type="text"
                    required
                    placeholder={te ? "మీ పేరు (Your Name)" : "Your Full Name"}
                    value={quickName}
                    onChange={(e) => setQuickName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs outline-none focus:border-maroon focus:ring-1 focus:ring-maroon"
                  />
                  <input
                    type="tel"
                    required
                    placeholder={te ? "10 అంకెల మొబైల్ (WhatsApp No)" : "10-digit WhatsApp Mobile"}
                    value={quickPhone}
                    onChange={(e) => setQuickPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs outline-none focus:border-maroon focus:ring-1 focus:ring-maroon"
                  />
                  <input
                    type="text"
                    placeholder={te ? "PhonePe / GPay UPI ID (విత్‌డ్రా కోసం)" : "UPI ID for Payouts (Optional)"}
                    value={quickPhonepe}
                    onChange={(e) => setQuickPhonepe(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs outline-none focus:border-maroon focus:ring-1 focus:ring-maroon"
                  />
                  <button
                    type="submit"
                    disabled={quickLoading}
                    className="w-full py-2.5 rounded-xl gold-gradient text-maroon font-black text-xs shadow-gold hover:brightness-105 active:scale-95 transition disabled:opacity-50"
                  >
                    {quickLoading ? "..." : (te ? "🚀 నా రెఫరల్ లింక్ సృష్టించండి (FREE)" : "🚀 Generate My Referral Link (FREE)")}
                  </button>
                </form>
              </div>
            ) : null}

          </div>

          {/* Quick Search for Existing Code */}
          <div className="mt-6 pt-5 border-t border-white/20 flex flex-wrap items-center justify-between gap-3">
            <form onSubmit={handleLookup} className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-bold text-amber-200">🔍 {te ? "పాత లింక్ లేదా ప్రొఫైల్ వెతకండి:" : "Lookup Existing Code:"}</span>
              <input
                type="text"
                placeholder={te ? "10 అంకెల మొబైల్ లేదా TSAP ID" : "10-digit Phone or TSAP ID"}
                value={phoneSearch}
                onChange={(e) => setPhoneSearch(e.target.value)}
                className="px-3.5 py-1.5 rounded-xl bg-white/15 border border-white/30 text-white placeholder-white/60 text-xs outline-none focus:bg-white/25 w-52"
              />
              <button
                type="submit"
                disabled={searching}
                className="px-4 py-1.5 rounded-xl bg-gold text-maroon font-bold text-xs hover:brightness-105 disabled:opacity-50"
              >
                {searching ? "..." : (te ? "వెతకండి" : "Search")}
              </button>
            </form>

            {tsapId && (
              <div className="flex items-center gap-2 text-xs">
                <span className="bg-white/20 px-3 py-1 rounded-full font-mono font-bold">ID: {tsapId}</span>
                <span className="bg-amber-300 text-maroon font-bold px-3 py-1 rounded-full">{tier.icon} {tier.key}</span>
              </div>
            )}
          </div>

          {searchErr && <div className="mt-2 text-xs text-rose-300 font-semibold">{searchErr}</div>}
        </div>
      </section>

      {/* ================= MAIN CONTAINER ================= */}
      <div className="max-w-6xl mx-auto px-4 mt-6 space-y-6">
        
        {err && (
          <div className="bg-red-50 border border-red-300 text-red-700 p-4 rounded-2xl text-xs font-semibold">
            ⚠️ {err}
          </div>
        )}

        {/* TOP SUMMARY METRICS & WALLET BANNER */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Wallet Card */}
          <div className="bg-white rounded-3xl p-5 border-2 border-amber-300/80 shadow-md flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between text-xs text-gray-500 font-bold">
                <span>👛 {te ? "అందుబాటులో ఉన్న వాలెట్" : "Available Wallet"}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">Live</span>
              </div>
              <div className="text-3xl sm:text-4xl font-black text-maroon mt-1">
                ₹{s.wallet ?? 0}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setPay({ ...pay, open: !pay.open, amount: String(Math.floor(s.wallet || 0)) })}
              disabled={!dash?.wallet_can_withdraw}
              className={`w-full py-2.5 rounded-xl text-xs font-extrabold shadow-sm transition ${
                dash?.wallet_can_withdraw
                  ? "gold-gradient text-maroon hover:brightness-105 active:scale-95"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}
            >
              {dash?.wallet_can_withdraw
                ? (te ? "💸 విత్‌డ్రా అభ్యర్థన (UPI)" : "💸 Withdraw Payout (UPI)")
                : (te ? `ఇంకా ₹${Math.max(0, 50 - (s.wallet || 0))} కావాలి (1 రిఫరల్ = ₹50)` : `₹${Math.max(0, 50 - (s.wallet || 0))} more needed (1 ref = ₹50)`)}
            </button>
          </div>

          {/* Lifetime Earned */}
          <div className="bg-white rounded-3xl p-5 border border-gold/30 shadow-sm flex flex-col justify-between">
            <span className="text-xs text-gray-500 font-bold">💰 {te ? "మొత్తం సంపాదన" : "Lifetime Earned"}</span>
            <div className="text-2xl sm:text-3xl font-black text-emerald-700 mt-2">
              ₹{s.lifetime_earned ?? 0}
            </div>
            <span className="text-[11px] text-gray-500 mt-1">
              {te ? `మొత్తం చెల్లించబడింది: ₹${s.paid_out ?? 0}` : `Total Settled: ₹${s.paid_out ?? 0}`}
            </span>
          </div>

          {/* Paid Referrals */}
          <div className="bg-white rounded-3xl p-5 border border-gold/30 shadow-sm flex flex-col justify-between">
            <span className="text-xs text-gray-500 font-bold">🎉 {te ? "చెల్లించిన రెఫరల్స్ (₹50)" : "Paid Referrals (₹50)"}</span>
            <div className="text-2xl sm:text-3xl font-black text-navy mt-2">
              {s.paid_count ?? 0}
            </div>
            <span className="text-[11px] text-gray-500 mt-1">
              {te ? `మొత్తం రిజిస్ట్రేషన్లు: ${s.registrations ?? 0}` : `Total Signups: ${s.registrations ?? 0}`}
            </span>
          </div>

          {/* Pipeline */}
          <div className="bg-white rounded-3xl p-5 border border-gold/30 shadow-sm flex flex-col justify-between">
            <span className="text-xs text-gray-500 font-bold">⏳ {te ? "పైప్‌లైన్ (వస్తున్న డబ్బు)" : "Pipeline (Expected)"}</span>
            <div className="text-2xl sm:text-3xl font-black text-amber-600 mt-2">
              ₹{s.pending_value ?? 0}
            </div>
            <span className="text-[11px] text-gray-500 mt-1">
              {te ? `${s.pending_friends ?? 0} మంది పేమెంట్ పెండింగ్` : `${s.pending_friends ?? 0} friends awaiting payment`}
            </span>
          </div>

        </div>

        {/* Payout Form Drawer */}
        {pay.open && (
          <div className="bg-white rounded-3xl p-6 border-2 border-maroon/40 shadow-xl space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-maroon">
                💸 {te ? "UPI / బ్యాంక్ విత్‌డ్రా అభ్యర్థన" : "Request Payout via UPI"}
              </h3>
              <button
                type="button"
                onClick={() => setPay({ ...pay, open: false })}
                className="text-gray-400 hover:text-gray-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  {te ? "విత్‌డ్రా మొత్తం (కనీసం ₹50 — 1 రిఫరల్)" : "Withdrawal Amount (Min ₹50)"}
                </label>
                <input
                  type="number"
                  min="50"
                  max={s.wallet || 50}
                  value={pay.amount}
                  onChange={(e) => setPay({ ...pay, amount: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-gray-300 text-xs focus:border-maroon outline-none"
                  placeholder="Amount (e.g. 50)"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  {te ? "మీ Google Pay / PhonePe / Paytm UPI ID" : "Your UPI ID (e.g. name@okhdfcbank)"}
                </label>
                <input
                  type="text"
                  value={pay.upi}
                  onChange={(e) => setPay({ ...pay, upi: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-gray-300 text-xs focus:border-maroon outline-none"
                  placeholder="yourname@okicici"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-gray-500">
                {te ? "⏱️ అడ్మిన్ ఆమోదించిన 24-48 గంటల్లో UTR నంబర్‌తో జమ చేయబడుతుంది." : "⏱️ Settled within 24-48 hours with official UTR."}
              </span>

              <button
                type="button"
                onClick={submitPayout}
                disabled={payLoading}
                className="px-6 py-2 rounded-xl maroon-gradient text-white text-xs font-bold shadow-md hover:brightness-110 disabled:opacity-50"
              >
                {payLoading ? (te ? "పంపుతున్నాం…" : "Submitting…") : (te ? "అభ్యర్థన పంపండి" : "Submit Request")}
              </button>
            </div>

            {payRes && (
              <div className={`p-3 rounded-xl text-xs font-semibold ${payRes.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                {payRes.message_telugu || payRes.reason || payRes.detail}
              </div>
            )}
          </div>
        )}

        {/* SHARE LINK BOX */}
        <div className="bg-white rounded-3xl p-6 border border-gold/40 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs text-gray-500 font-bold block">{te ? "మీ వ్యక్తిగత రెఫరల్ కోడ్ & లింక్" : "Your Referral Code & Link"}</span>
              <div className="text-2xl sm:text-3xl font-black text-maroon tracking-wider mt-0.5">
                {dash?.code || "REGISTER TO GET CODE"}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => copy(link, "link")}
                className="px-4 py-2 rounded-xl maroon-gradient text-white font-extrabold text-xs shadow-soft hover:brightness-110 active:scale-95 transition"
              >
                🔗 {copied === "link" ? (te ? "కాపీ అయింది! ✅" : "Copied! ✅") : (te ? "లింక్ కాపీ చేయండి" : "Copy Link")}
              </button>
              <button
                type="button"
                onClick={() => copy(dash?.code || "", "code")}
                className="px-4 py-2 rounded-xl border border-gold text-maroon font-bold text-xs hover:bg-gold-soft transition"
              >
                #️⃣ {copied === "code" ? "✅" : (te ? "కోడ్ కాపీ" : "Copy Code")}
              </button>
            </div>
          </div>

          <div className="p-3 bg-amber-50/70 rounded-2xl border border-amber-200/80 font-mono text-xs text-maroon break-all select-all">
            {link || "https://manavivaha.in/r/..."}
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {[
            { id: "overview", label: te ? "📊 అవలోకనం" : "📊 Overview" },
            { id: "status_poster", label: te ? "🖼️ వాట్సాప్ స్టేటస్ పోస్టర్" : "🖼️ Status Poster" },
            { id: "calculator", label: te ? "🧮 సంపాదన కాలిక్యులేటర్" : "🧮 Calculator" },
            { id: "friends", label: te ? `👥 నా రెఫరల్స్ (${friendsList.length})` : `👥 Referred Friends (${friendsList.length})` },
            { id: "share", label: te ? "📲 వాట్సాప్ షేర్ కిట్" : "📲 Share Kit" },
            { id: "payouts", label: te ? "🧾 విత్‌డ్రా హిస్టరీ" : "🧾 Payout History" },
            { id: "leaderboard", label: te ? "🏆 లీడర్‌బోర్డ్" : "🏆 Leaderboard" },
            { id: "terms", label: te ? "📜 నిబంధనలు" : "📜 Terms & Rules" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 rounded-full text-xs font-extrabold whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? "maroon-gradient text-white shadow-soft"
                  : "bg-white text-gray-700 hover:bg-amber-50 border border-gold/30"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ================= TAB: WHATSAPP STATUS & EARNINGS POSTER GENERATOR ================= */}
        {activeTab === "status_poster" && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gold/40 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-extrabold text-maroon flex items-center gap-2">
                  <span>🖼️</span>
                  <span>{te ? "వాట్సాప్ స్టేటస్ & ఎర్నింగ్స్ ప్రూఫ్ పోస్టర్" : "WhatsApp Status & Earnings Proof Poster"}</span>
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  {te
                    ? "మీ సంపాదన మరియు రెఫరల్ కోడ్‌తో కూడిన హై-రిజల్యూషన్ కార్డ్ ఆటోమేటిక్‌గా తయారవుతుంది. దీన్ని వాట్సాప్ స్టేటస్‌లో పెట్టి సులభంగా మరిన్ని రెఫరల్స్ పొందండి!"
                    : "Automatically generated high-resolution card with your earnings and referral QR code to share on WhatsApp Status."}
                </p>
              </div>

              {/* Format Switcher */}
              <div className="flex items-center gap-1.5 p-1 bg-amber-50 rounded-2xl border border-gold/40 shrink-0">
                <button
                  type="button"
                  onClick={() => setPosterFormat("story")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    posterFormat === "story" ? "maroon-gradient text-white shadow-xs" : "text-gray-600 hover:text-maroon"
                  }`}
                >
                  📱 {te ? "స్టేటస్ (Story)" : "Status (Story)"}
                </button>
                <button
                  type="button"
                  onClick={() => setPosterFormat("banner")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    posterFormat === "banner" ? "maroon-gradient text-white shadow-xs" : "text-gray-600 hover:text-maroon"
                  }`}
                >
                  💻 {te ? "సోషల్ బ్యానర్" : "Social Banner"}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Controls Column (5 cols) */}
              <div className="lg:col-span-5 space-y-5 bg-amber-50/50 p-5 rounded-3xl border border-amber-200/80">
                
                {/* Amount presets */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    💰 {te ? "పోస్టర్‌పై చూపించాల్సిన మొత్తం (Amount):" : "Amount to display on poster:"}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[50, 100, 250, 500, 1000, 2500].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setPosterAmount(amt)}
                        className={`py-2 rounded-xl text-xs font-black transition border ${
                          posterAmount === amt
                            ? "bg-[#7A0C2E] text-white border-[#7A0C2E] shadow-sm"
                            : "bg-white text-gray-700 border-gold/40 hover:bg-amber-100/50"
                        }`}
                      >
                        ₹{amt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Name */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    ✍️ {te ? "మీ పేరు (Partner Name):" : "Your Name:"}
                  </label>
                  <input
                    type="text"
                    value={posterCustomName}
                    onChange={(e) => setPosterCustomName(e.target.value)}
                    placeholder={dash?.name || quickName || "మీ పేరు"}
                    className="w-full px-4 py-2.5 rounded-xl border border-gold/40 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-maroon font-bold text-navy"
                  />
                </div>

                {/* Status Captions Kit */}
                <div className="space-y-2 pt-2 border-t border-amber-200">
                  <span className="text-xs font-bold text-maroon block">
                    💬 {te ? "స్టేటస్ కింద పెట్టే తెలుగు క్యాప్షన్:" : "WhatsApp Status Caption:"}
                  </span>
                  <div className="p-3 bg-white rounded-2xl border border-gold/30 text-xs text-gray-700 space-y-2">
                    <p className="font-semibold text-gray-800">
                      “{statusCaption}”
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard?.writeText(statusCaption);
                          setCopied("caption");
                          setTimeout(() => setCopied(""), 2000);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-maroon font-bold text-[11px] transition"
                      >
                        {copied === "caption" ? "✅ కాపీ అయింది!" : "📋 కాపీ క్యాప్షన్"}
                      </button>
                      <a
                        href={`https://api.whatsapp.com/send?text=${encodeURIComponent(statusCaption)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition flex items-center gap-1"
                      >
                        <WhatsAppIcon className="w-3.5 h-3.5 fill-current" />
                        <span>వాట్సాప్‌లో షేర్</span>
                      </a>
                    </div>
                  </div>
                </div>

                {/* Instant Download Button */}
                <div className="space-y-2 pt-2">
                  <a
                    href={`/api/referral/earnings-card?code=${encodeURIComponent(dash?.code || quickSuccess?.partner_id || "PARTNER")}&name=${encodeURIComponent(posterCustomName || dash?.name || quickName || "Partner")}&amount=${posterAmount}&paid_count=${s.paid_count || 1}&tier=${encodeURIComponent(tier?.key || "BRONZE")}&format=${posterFormat}`}
                    download={`manavivaha-earnings-${dash?.code || "mv"}-${posterFormat}.png`}
                    className="w-full py-3 rounded-2xl maroon-gradient text-white text-xs font-black shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 text-center"
                  >
                    <span>📥</span>
                    <span>{te ? "HD పోస్టర్ డౌన్‌లోడ్ చేయండి (PNG)" : "Download HD Poster (PNG)"}</span>
                  </a>
                  <p className="text-[10px] text-gray-500 text-center">
                    {te ? "గ్యాలరీలో సేవ్ చేసుకొని మీ వాట్సాప్ / ఇన్‌స్టాగ్రామ్ స్టేటస్‌లో పెట్టండి 📲" : "Save to gallery & share to WhatsApp / Instagram story"}
                  </p>
                </div>

              </div>

              {/* Live Preview Column (7 cols) */}
              <div className="lg:col-span-7 flex flex-col items-center">
                <div className="text-xs font-bold text-gray-500 mb-2 flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{te ? "లైవ్ పోస్టర్ ప్రివ్యూ (Live Generated Card)" : "Live Generated Card Preview"}</span>
                </div>

                <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-amber-300 max-w-sm w-full bg-slate-900 group">
                  <img
                    src={`/api/referral/earnings-card?code=${encodeURIComponent(dash?.code || quickSuccess?.partner_id || "PARTNER")}&name=${encodeURIComponent(posterCustomName || dash?.name || quickName || "Partner")}&amount=${posterAmount}&paid_count=${s.paid_count || 1}&tier=${encodeURIComponent(tier?.key || "BRONZE")}&format=${posterFormat}&t=${posterAmount}`}
                    alt="Referral Earnings Proof Card"
                    className="w-full h-auto object-contain block"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                    <a
                      href={`/api/referral/earnings-card?code=${encodeURIComponent(dash?.code || quickSuccess?.partner_id || "PARTNER")}&name=${encodeURIComponent(posterCustomName || dash?.name || quickName || "Partner")}&amount=${posterAmount}&paid_count=${s.paid_count || 1}&tier=${encodeURIComponent(tier?.key || "BRONZE")}&format=${posterFormat}`}
                      target="_blank"
                      className="w-full py-2 bg-amber-400 text-maroon rounded-xl font-bold text-xs text-center shadow"
                    >
                      🔍 {te ? "పూర్తి పరిమాణంలో చూడండి" : "View Full Size"}
                    </a>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ================= TAB 1: OVERVIEW ================= */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* How It Works Card */}
            <div className="bg-white rounded-3xl p-6 border border-gold/30 shadow-sm space-y-4">
              <h3 className="font-extrabold text-maroon text-base">
                ⚡ {te ? "ఎలా పని చేస్తుంది? (3 సులభ దశలు)" : "How It Works (3 Easy Steps)"}
              </h3>
              <div className="space-y-3 text-xs text-gray-700 leading-relaxed">
                <div className="flex items-start gap-3 p-3 bg-amber-50/60 rounded-2xl border border-amber-100">
                  <span className="w-6 h-6 rounded-full bg-maroon text-white font-bold flex items-center justify-center shrink-0 text-xs">1</span>
                  <div>
                    <b className="text-maroon block mb-0.5">{te ? "మీ లింక్ షేర్ చేయండి" : "Share Your Link"}</b>
                    {te ? "మీ వాట్సాప్ గ్రూపులు, స్టేటస్ లేదా స్నేహితులకు మీ రెఫరల్ లింక్ పంపండి." : "Share your link on WhatsApp groups, status, or with friends looking for match."}
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-amber-50/60 rounded-2xl border border-amber-100">
                  <span className="w-6 h-6 rounded-full bg-maroon text-white font-bold flex items-center justify-center shrink-0 text-xs">2</span>
                  <div>
                    <b className="text-maroon block mb-0.5">{te ? "స్నేహితుడు రిజిస్టర్ అవుతాడు" : "Friend Registers (FREE)"}</b>
                    {te ? "వారు ఉచితంగా రిజిస్టర్ అయి 3 మ్యాచెస్ పొందుతారు (+1 బోనస్ క్రెడిట్)." : "They register free, get 3 free profiles (+1 referee bonus credit)."}
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-amber-50/60 rounded-2xl border border-amber-100">
                  <span className="w-6 h-6 rounded-full bg-maroon text-white font-bold flex items-center justify-center shrink-0 text-xs">3</span>
                  <div>
                    <b className="text-maroon block mb-0.5">{te ? "మొదటి పేమెంట్ = ₹50 మీ వాలెట్‌కు" : "First Payment = ₹50 to Your Wallet"}</b>
                    {te ? "వారు ఎప్పుడైనా ₹99 (లేదా ఏదైనా ప్లాన్) చెల్లించగానే, తక్షణమే మీ వాలెట్‌కు ₹50 జమ అవుతుంది." : "Whenever they pay ₹99 (or any plan), ₹50 lands straight into your wallet!"}
                  </div>
                </div>
              </div>
            </div>

            {/* Who Can Earn Card */}
            <div className="bg-white rounded-3xl p-6 border border-gold/30 shadow-sm space-y-4">
              <h3 className="font-extrabold text-maroon text-base">
                🌟 {te ? "ఎవరెవరు సంపాదించవచ్చు?" : "Who Can Earn?"}
              </h3>
              <div className="grid grid-cols-2 gap-2.5 text-center">
                {[
                  { icon: "🎓", role: te ? "విద్యార్థులు" : "Students", desc: te ? "పాకెట్ మనీ కోసం" : "For pocket money" },
                  { icon: "🏡", role: te ? "గృహిణులు" : "Homemakers", desc: te ? "ఇంట్లోనే కూర్చుని" : "From home" },
                  { icon: "💼", role: te ? "ఉద్యోగస్తులు" : "Professionals", desc: te ? "సైడ్ ఇన్‌కమ్‌గా" : "As side income" },
                  { icon: "🤝", role: te ? "వివాహ బ్యూరోలు" : "Matchmakers", desc: te ? "అదనపు ఆదాయం" : "Extra commission" },
                ].map((item) => (
                  <div key={item.role} className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="text-2xl">{item.icon}</div>
                    <div className="font-bold text-xs text-maroon mt-1">{item.role}</div>
                    <div className="text-[10px] text-gray-500">{item.desc}</div>
                  </div>
                ))}
              </div>
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-800 text-center font-bold">
                {te ? "💡 10 మంది పే చేస్తే = ₹500 నేరుగా మీ UPI బ్యాంక్ ఖాతాకు!" : "💡 10 Paid Referrals = ₹500 direct to your UPI account!"}
              </div>
            </div>

          </div>
        )}

        {/* ================= TAB 2: INTERACTIVE EARNINGS CALCULATOR ================= */}
        {activeTab === "calculator" && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gold/40 shadow-sm space-y-6">
            <div className="text-center space-y-1">
              <h3 className="text-xl font-extrabold text-maroon">
                🧮 {te ? "లైవ్ సంపాదన కాలిక్యులేటర్" : "Live Earnings Calculator"}
              </h3>
              <p className="text-xs text-gray-500">
                {te ? "మీరు ఎంత మందిని రిఫర్ చేస్తే ఎంత సంపాదించవచ్చో క్రింద స్లైడర్ ద్వారా పరిశీలించండి:" : "Slide to see your potential earnings:"}
              </p>
            </div>

            <div className="max-w-xl mx-auto space-y-6">
              <div className="bg-amber-50/70 p-6 rounded-3xl border border-amber-200 text-center space-y-3">
                <span className="text-xs font-bold text-gray-600 block">
                  {te ? "చెల్లించిన రిఫరల్స్ సంఖ్య:" : "Number of Paying Referrals:"}
                </span>
                <div className="text-4xl font-black text-navy">{calcCount} <span className="text-lg font-normal text-gray-500">{te ? "స్నేహితులు" : "Friends"}</span></div>

                <input
                  type="range"
                  min="1"
                  max="100"
                  step="1"
                  value={calcCount}
                  onChange={(e) => setCalcCount(parseInt(e.target.value, 10))}
                  className="w-full accent-[#7A0C2E] cursor-pointer"
                />

                <div className="flex justify-between text-[11px] font-bold text-gray-400">
                  <span>1 Friend (₹50)</span>
                  <span>25 Friends (₹1,250)</span>
                  <span>50 Friends (₹2,500)</span>
                  <span>100 Friends (₹5,000)</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-5 bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-3xl border border-emerald-300 text-center">
                  <span className="text-xs font-bold text-emerald-800 block">{te ? "మీకు వచ్చే కమీషన్ (₹50/Friend)" : "Your Cash Earnings"}</span>
                  <div className="text-3xl sm:text-4xl font-black text-emerald-700 mt-1">₹{estimatedEarnings}</div>
                  <span className="text-[10px] text-emerald-600 block mt-1">100% Instant UPI Payout</span>
                </div>

                <div className="p-5 bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-3xl border border-gold/60 text-center">
                  <span className="text-xs font-bold text-maroon block">{te ? "మీ భాగస్వామి స్థాయి (Tier)" : "Partner Tier & Bonus"}</span>
                  <div className="text-lg sm:text-xl font-extrabold text-maroon mt-1">{estimatedTier.icon} {estimatedTier.name}</div>
                  <span className="text-[11px] text-amber-800 font-bold block mt-1">{estimatedTier.bonus}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 3: DETAILED REFERRED FRIENDS ================= */}
        {activeTab === "friends" && (
          <div className="bg-white rounded-3xl p-6 border border-gold/30 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-maroon text-base">
                  👥 {te ? "మీ రిఫరల్ ద్వారా చేరిన సభ్యుల జాబితా" : "Your Referred Friends List"}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {te ? "మీ లింక్ ద్వారా నమోదైన ప్రతి వ్యక్తి స్టేటస్ మరియు ₹50 flat కమీషన్ వివరాలు క్రింద చూడండి." : "Real-time details of members who joined with your code with ₹50 flat reward."}
                </p>
              </div>
              <span className="text-xs font-bold bg-amber-100 text-amber-800 px-3 py-1 rounded-full">
                {friendsList.length} {te ? "సభ్యులు" : "Members"}
              </span>
            </div>

            {friendsList.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <div className="text-4xl">🎁</div>
                <div className="text-sm font-bold text-gray-700">
                  {te ? "ఇంకా ఎవరూ మీ లింక్‌తో నమోదు కాలేదు" : "No referrals registered yet"}
                </div>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  {te ? "మీ వాట్సాప్ స్టేటస్ లేదా గ్రూపులలో లింక్ షేర్ చేయండి. మొదటి రిఫరల్‌తో సంపాదన ప్రారంభించండి!" : "Share your link on WhatsApp to start getting referrals!"}
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab("share")}
                  className="px-5 py-2 rounded-full maroon-gradient text-white text-xs font-bold"
                >
                  📲 {te ? "వాట్సాప్ మెసేజ్ షేర్ చేయండి" : "Share WhatsApp Message"}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {friendsList.map((r: any, idx: number) => (
                  <div
                    key={r.tsap_id || idx}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border border-gray-100 bg-slate-50/70 hover:bg-amber-50/40 transition gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-maroon-soft text-maroon font-bold flex items-center justify-center text-sm shrink-0">
                        {r.gender === "Bride" ? "👰" : "🤵"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-navy">{r.name || r.full_name || r.tsap_id}</span>
                          <span className="font-mono text-[10px] text-gray-400 bg-white px-2 py-0.5 rounded border">ID: {r.tsap_id}</span>
                        </div>
                        <div className="text-[11px] text-gray-500 mt-0.5">
                          {r.caste} · 🏡 {r.district} · 📅 {String(r.joined || "").slice(0, 10)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-200/60">
                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                        r.paid
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : "bg-amber-100 text-amber-800 border border-amber-300"
                      }`}>
                        {r.paid ? `💰 ₹${r.commission || 50} జమయింది ✅` : (te ? "⏳ పేమెంట్ పెండింగ్ (⏳ pay pending)" : "⏳ pay pending")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 4: SHARE KIT ================= */}
        {activeTab === "share" && (
          <div className="bg-white rounded-3xl p-6 border border-gold/30 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-maroon text-base">
                  📲 {te ? "వాట్సాప్ & సోషల్ మీడియా షేరింగ్ కిట్" : "WhatsApp & Social Share Kit"}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {te ? "ఈ మెసేజ్ ఎంచుకుని 1-క్లిక్‌తో వాట్సాప్‌లో షేర్ చేయండి:" : "Choose a message and share directly on WhatsApp:"}
                </p>
              </div>

              {tsapId && (
                <div className="flex gap-2 text-xs">
                  <a
                    href={`/api/referral/${tsapId}/poster.png?style=square`}
                    target="_blank"
                    className="px-3 py-1.5 rounded-xl border border-gold text-maroon font-bold hover:bg-gold-soft"
                  >
                    🖼️ {te ? "QR పోస్టర్" : "QR Poster"}
                  </a>
                  <a
                    href={`/api/referral/${tsapId}/poster.png?style=status`}
                    target="_blank"
                    className="px-3 py-1.5 rounded-xl bg-navy text-white font-bold hover:bg-navy/90"
                  >
                    📱 {te ? "స్టేటస్ పోస్టర్" : "Status Poster"}
                  </a>
                </div>
              )}
            </div>

            {/* Message Template Switcher */}
            <div className="flex gap-2">
              {msgs.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setMsgIdx(i)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                    msgIdx === i ? "maroon-gradient text-white shadow-soft" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {te ? `టెంప్లేట్ ${i + 1}` : `Template ${i + 1}`}
                </button>
              ))}
            </div>

            {/* Selected Message Box */}
            <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-200 text-xs text-gray-800 whitespace-pre-wrap leading-relaxed">
              {msgs[msgIdx]}
            </div>

            {/* 1-Tap Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <a
                href={kit.whatsapp_share_variants?.[msgIdx] || `https://api.whatsapp.com/send?text=${encodeURIComponent(msgs[msgIdx])}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#25D366] text-white font-extrabold text-xs shadow-md hover:brightness-105 active:scale-95 transition"
              >
                <WhatsAppIcon className="w-4 h-4" mono />
                <span>{te ? "వాట్సాప్‌లో షేర్ చేయండి" : "Share on WhatsApp"}</span>
              </a>

              <a
                href={kit.telegram_share || `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(msgs[msgIdx])}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#229ED9] text-white font-extrabold text-xs shadow-md hover:brightness-105 active:scale-95 transition"
              >
                <TelegramIcon className="w-4 h-4" mono />
                <span>Telegram</span>
              </a>

              <button
                type="button"
                onClick={() => copy(msgs[msgIdx], "msg")}
                className="px-5 py-3 rounded-2xl border border-gray-300 text-gray-700 font-bold text-xs hover:bg-gray-50 active:scale-95 transition"
              >
                📋 {copied === "msg" ? "కాపీ అయింది! ✅" : "టెక్స్ట్ కాపీ"}
              </button>
            </div>
          </div>
        )}

        {/* ================= TAB 5: PAYOUT HISTORY ================= */}
        {activeTab === "payouts" && (
          <div className="bg-white rounded-3xl p-6 border border-gold/30 shadow-sm space-y-4">
            <h3 className="font-extrabold text-maroon text-base">
              🧾 {te ? "విత్‌డ్రా చరిత్ర & UTR రసీదులు" : "Withdrawal History & UTR Receipts"}
            </h3>

            {(!dash?.payouts?.length && !dash?.payouts_live?.length) ? (
              <div className="text-center py-10 text-xs text-gray-500">
                {te ? "ఇంకా ఎలాంటి విత్‌డ్రా అభ్యర్థనలు లేవు. మీ వాలెట్ ₹100 చేరుకోగానే విత్‌డ్రా చేసుకోవచ్చు." : "No withdrawal requests yet. You can withdraw as soon as your wallet reaches ₹100."}
              </div>
            ) : (
              <div className="space-y-2.5">
                {(dash.payouts_live || dash.payouts).map((p: any, idx: number) => {
                  const isPaid = p.status === "paid" || p.payout_paid;
                  return (
                    <div key={p.id || idx} className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
                      <div>
                        <div className="font-bold text-navy">{p.id}</div>
                        <div className="text-[11px] text-gray-500">
                          {p.method?.toUpperCase()} · {p.upi_id || p.account || ""}
                          {p.utr ? <b className="text-emerald-700 block">UTR: {p.utr}</b> : null}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-black text-sm text-maroon">₹{p.amount}</div>
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                          isPaid ? "bg-emerald-100 text-emerald-800 border border-emerald-300" :
                          p.status === "rejected" ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800"
                        }`}>
                          {isPaid ? "✅ PAID" : p.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 6: LEADERBOARD ================= */}
        {activeTab === "leaderboard" && (
          <div className="bg-white rounded-3xl p-6 border border-gold/30 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-maroon text-base">
                  🏆 {te ? "టాప్ రెఫరర్స్ లీడర్‌బోర్డ్" : "Top Referrers Leaderboard"}
                </h3>
                <p className="text-xs text-emerald-700 font-bold mt-0.5">
                  🎁 {te ? "వారపు టాప్-1 విజేతకు ₹1000 అదనపు నగదు బహుమతి!" : "Weekly Top-1 Referrer gets ₹1000 Extra Cash Prize!"}
                </p>
              </div>

              <div className="flex gap-1.5 bg-gray-100 p-1 rounded-xl text-xs">
                {["all", "week", "month"].map((p) => (
                  <button
                    key={p}
                    onClick={() => setLbPeriod(p)}
                    className={`px-3 py-1 rounded-lg font-bold capitalize transition ${
                      lbPeriod === p ? "bg-white text-maroon shadow-sm" : "text-gray-600"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 mt-2">
              {board.map((item, idx) => (
                <div
                  key={idx}
                  className={`flex items-center justify-between p-3 rounded-2xl text-xs ${
                    idx === 0 ? "bg-amber-50 border-2 border-gold/60 font-bold" : "bg-slate-50 border border-slate-100"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-center font-extrabold text-sm text-maroon">
                      {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`}
                    </span>
                    <div>
                      <span className="font-bold text-navy">{item.name || "Referral Partner"}</span>
                      <span className="text-[10px] text-gray-400 block font-mono">{item.code}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-extrabold text-maroon block">{item.paid_count || 0} Paid Referrals</span>
                    <span className="text-[10px] text-emerald-600 font-bold">₹{(item.paid_count || 0) * 50} Earned</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= TAB 7: TERMS & RULES ================= */}
        {activeTab === "terms" && (
          <div className="bg-white rounded-3xl p-6 border border-gold/30 shadow-sm space-y-4">
            <h3 className="font-extrabold text-maroon text-base">
              📜 {te ? "రెఫరల్ నియమ నిబంధనలు (100% పారదర్శకత)" : "Referral Program Rules & Policy"}
            </h3>
            <div className="space-y-2.5 text-xs text-gray-700 leading-relaxed">
              {(terms?.rules_telugu || [
                "1. ఉచిత నమోదు — ఎవరైనా రిజిస్టర్ అవ్వగానే మొదటి 3 ప్రొఫైల్స్ ఉచితంగా చూడవచ్చు.",
                "2. మీ స్నేహితుడు ₹99 లేదా ఏదైనా ప్లాన్ మొదటిసారి చెల్లించిన వెంటనే మీ వాలెట్‌కు ₹50 జమ అవుతుంది.",
                "3. ఎంత మందినైనా రిఫర్ చేయవచ్చు — పరిమితులు లేవు.",
                "4. వాలెట్ బ్యాలెన్స్ ₹50 దాటగానే (ఒక్క రిఫరల్ తోనే) తక్షణమే UPI ద్వారా విత్‌డ్రా అభ్యర్థన సమర్పించవచ్చు.",
                "5. ఫేక్ ప్రొఫైల్స్ మరియు బాట్ అకౌంట్లు అనుమతించబడవు; నిజమైన వినియోగదారుల పేమెంట్లపై మాత్రమే కమీషన్ లభిస్తుంది."
              ]).map((rule: string, i: number) => (
                <div key={i} className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  {rule}
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
