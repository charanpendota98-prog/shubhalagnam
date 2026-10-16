"use client";
/**
 * Referral dashboard for genuine referral links, confirmed eligible rewards,
 * payout requests, and accurate share materials.
 */
import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { toJpeg } from "html-to-image";
import QRCode from "qrcode";
import { useLang } from "@/lib/lang";
import { Duo } from "@/lib/duo";
import { apiDisplayMessage, authHeaders, readApiJson } from "@/lib/api";
import { WhatsAppIcon, TelegramIcon } from "@/components/BrandIcons";

type Dash = any;

const SHOP_TEMPLATES: Record<string, {
  id: string;
  labelTe: string;
  labelEn: string;
  hookTe: string;
  hookEn: string;
  subTe: string;
  subEn: string;
  pointsTe: string[];
  pointsEn: string[];
}> = {
  general: {
    id: "general", labelTe: "🏪 సాధారణ షాప్ & కౌంటర్", labelEn: "🏪 General shop or counter",
    hookTe: "మన వివాహను కుటుంబాలకు పరిచయం చేయండి",
    hookEn: "Share Mana Vivaha with families",
    subTe: "📱 కెమెరాతో QR కోడ్ స్కాన్ చేయండి",
    subEn: "Scan the QR code with your camera",
    pointsTe: ["ఉచిత నమోదు • 3 ఆసక్తి అభ్యర్థనలు", "వినియోగదారు ప్లాన్‌లు ₹99 నుంచి", "యజమాని అంగీకారం తర్వాతే సంప్రదింపు వివరాలు"],
    pointsEn: ["Free registration • 3 interest requests", "Consumer plans from ₹99", "Contact details after owner acceptance"],
  },
  xerox: {
    id: "xerox", labelTe: "🖨️ జిరాక్స్ & మీ సేవా కేంద్రం", labelEn: "🖨️ Print or service centre",
    hookTe: "పెళ్లి సంబంధం చూస్తున్న కుటుంబాలకు ఈ లింక్ ఇవ్వండి",
    hookEn: "Share this link with families looking for matrimony profiles",
    subTe: "📱 QR కోడ్ స్కాన్ చేసి నమోదు పేజీ చూడండి",
    subEn: "Scan the QR code to open the registration page",
    pointsTe: ["ఉచిత నమోదు • 3 ఆసక్తి అభ్యర్థనలు", "వినియోగదారు ప్లాన్‌లు ₹99 నుంచి", "యజమాని అంగీకారం తర్వాతే సంప్రదింపు వివరాలు"],
    pointsEn: ["Free registration • 3 interest requests", "Consumer plans from ₹99", "Contact details after owner acceptance"],
  },
  studio: {
    id: "studio", labelTe: "📸 ఫోటో స్టూడియో & ల్యాబ్", labelEn: "📸 Photo studio or lab",
    hookTe: "మీ కస్టమర్లకు వివాహ ప్రొఫైల్ వేదికను పరిచయం చేయండి",
    hookEn: "Introduce the matrimony platform to your customers",
    subTe: "📱 నమోదు కోసం QR కోడ్ స్కాన్ చేయండి",
    subEn: "Scan the QR code to register",
    pointsTe: ["ఉచిత నమోదు • 3 ఆసక్తి అభ్యర్థనలు", "వినియోగదారు ప్లాన్‌లు ₹99 నుంచి", "యజమాని అంగీకారం తర్వాతే సంప్రదింపు వివరాలు"],
    pointsEn: ["Free registration • 3 interest requests", "Consumer plans from ₹99", "Contact details after owner acceptance"],
  },
  tea: {
    id: "tea", labelTe: "☕ టీ స్టాల్, కేఫ్ & హోటల్", labelEn: "☕ Tea stall, café, or hotel",
    hookTe: "మీ పరిచయాల్లో పెళ్లి సంబంధం చూస్తున్న వారికి పంపండి",
    hookEn: "Share with people in your community who are looking for a match",
    subTe: "📱 కెమెరాతో QR కోడ్ స్కాన్ చేయండి",
    subEn: "Scan the QR code with your camera",
    pointsTe: ["ఉచిత నమోదు • 3 ఆసక్తి అభ్యర్థనలు", "వినియోగదారు ప్లాన్‌లు ₹99 నుంచి", "యజమాని అంగీకారం తర్వాతే సంప్రదింపు వివరాలు"],
    pointsEn: ["Free registration • 3 interest requests", "Consumer plans from ₹99", "Contact details after owner acceptance"],
  },
  tailor: {
    id: "tailor", labelTe: "🪡 టైలరింగ్ & బ్యూటీ పార్లర్", labelEn: "🪡 Tailor or beauty salon",
    hookTe: "తెలుగు వివాహ ప్రొఫైల్ వేదికను షేర్ చేయండి",
    hookEn: "Share a Telugu matrimony profile platform",
    subTe: "📱 QR కోడ్ స్కాన్ చేసి నమోదు వివరాలు చూడండి",
    subEn: "Scan the QR code to view registration details",
    pointsTe: ["ఉచిత నమోదు • 3 ఆసక్తి అభ్యర్థనలు", "వినియోగదారు ప్లాన్‌లు ₹99 నుంచి", "యజమాని అంగీకారం తర్వాతే సంప్రదింపు వివరాలు"],
    pointsEn: ["Free registration • 3 interest requests", "Consumer plans from ₹99", "Contact details after owner acceptance"],
  },
  story: {
    id: "story", labelTe: "📱 WhatsApp స్టేటస్ కథనం", labelEn: "📱 WhatsApp status story",
    hookTe: "మన వివాహ referral link ను షేర్ చేయండి",
    hookEn: "Share your Mana Vivaha referral link",
    subTe: "📱 QR కోడ్ స్కాన్ చేసి నమోదు పేజీకి వెళ్లండి",
    subEn: "Scan the QR code to open registration",
    pointsTe: ["ఉచిత నమోదు • 3 ఆసక్తి అభ్యర్థనలు", "వినియోగదారు ప్లాన్‌లు ₹99 నుంచి", "యజమాని అంగీకారం తర్వాతే సంప్రదింపు వివరాలు"],
    pointsEn: ["Free registration • 3 interest requests", "Consumer plans from ₹99", "Contact details after owner acceptance"],
  },
};

export default function ReferralPage() {
  const { lang } = useLang();
  const te = lang === "te";

  const [tsapId, setTsapId] = useState("");
  const [phoneSearch, setPhoneSearch] = useState("");
  const [dash, setDash] = useState<Dash | null>(null);
  const [board, setBoard] = useState<any[]>([]);
  const [you, setYou] = useState<any>(null);
  const [terms, setTerms] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "shop_poster" | "status_poster" | "friends" | "share" | "payouts" | "leaderboard" | "terms">("overview");
  const [msgIdx, setMsgIdx] = useState(0);
  const [err, setErr] = useState("");
  const [searchErr, setSearchErr] = useState("");
  const [searching, setSearching] = useState(false);
  
  // Optional label printed on the locally generated referral poster.
  const [posterCustomName, setPosterCustomName] = useState<string>("");

  // Shop Sticker & QR Poster State
  const [shopPosterDownloading, setShopPosterDownloading] = useState(false);
  const [shopPosterTheme, setShopPosterTheme] = useState<"maroon" | "gold" | "navy">("maroon");
  const [shopTemplate, setShopTemplate] = useState<"general" | "xerox" | "studio" | "tea" | "tailor" | "story">("general");
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const shopPosterRef = useRef<HTMLDivElement>(null);

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
      .then((r) => readApiJson(r))
      .then((d) => {
        if (d.ok) setDash(d);
        else setErr(apiDisplayMessage(d, te, te ? "డేటా లోడ్ కాలేదు. మీ ID సరిచూసుకోండి." : "Could not load the dashboard. Check your partner ID."));
      })
      .catch(() => setErr(te ? "కనెక్షన్ సమస్య — కొద్దిసేపటి తర్వాత మళ్లీ ప్రయత్నించండి" : "Network error — please retry"));

    fetch(`/api/referral/${encodeURIComponent(id)}/payouts`, { headers: authHeaders() })
      .then((r) => readApiJson(r))
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
      .then((r) => readApiJson(r))
      .then(setTerms)
      .catch(() => {});
  }, []);

  const loadBoard = useCallback((period: string) => {
    const meQ = tsapId ? `&me=${encodeURIComponent(tsapId)}` : "";
    fetch(`/api/referral/leaderboard?period=${period}&limit=10${meQ}`)
      .then((r) => readApiJson(r))
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
      const data = await readApiJson(res);
      if (res.ok && data.success && data.tsap_id) {
        setTsapId(data.tsap_id);
        localStorage.setItem("tsap_last_id", data.tsap_id);
      } else {
        setSearchErr(apiDisplayMessage(data, te, te ? "ఈ నంబర్‌తో ప్రొఫైల్ దొరకలేదు." : "A profile was not found for this number."));
      }
    } catch {
      setSearchErr(te ? "వెతకడం విఫలమైంది" : "Lookup failed");
    } finally {
      setSearching(false);
    }
  };

  const copy = (text: string, label: string) => {
    navigator.clipboard?.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(""), 2000);
  };

  const minPayout = Number(dash?.commission_rules?.min_payout ?? 50);

  const submitPayout = async () => {
    const amount = parseInt(pay.amount || "0", 10);
    if (!amount || amount < minPayout) {
      setPayRes({ success: false, reason: te ? `కనీస payout అభ్యర్థన ₹${minPayout}.` : `The minimum payout request is ₹${minPayout}.` });
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
      const d = await readApiJson(r);
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
  const link = dash?.link || (dash?.code ? `https://manavivaha.in/r/${dash.code}` : "");
  const kit = dash?.share_kit || {};
  const referralRulesLink = "https://manavivaha.in/referral";
  const fallbackMessages = te ? [
    `🙏 మన వివాహ (Mana Vivaha)\nఉచిత నమోదు • 3 ఆసక్తి అభ్యర్థనలు\nనా referral link: ${link}\nనిబంధనలు: ${referralRulesLink}`,
    `మన వివాహలో నమోదు చేసుకోండి: ${link}\nచెల్లుబాటు అయ్యే referral ద్వారా కొత్త సభ్యుడికి +1, పరిచయం చేసిన సభ్యుడికి +2 ఆసక్తి అభ్యర్థన క్రెడిట్‌లు లభిస్తాయి; ఇవి నగదు కాదు.\nనిబంధనలు: ${referralRulesLink}`,
    `₹50 బహుమతి మొదటి అర్హత కలిగిన వినియోగదారు ప్లాన్ చెల్లింపుపై ఒక్కసారి మాత్రమే లభించవచ్చు. మినహాయింపులు, అర్హత మరియు మాన్యువల్ సమీక్ష వర్తిస్తాయి: ${referralRulesLink}`,
  ] : [
    `🙏 Mana Vivaha (మన వివాహ)\nFree registration • 3 interest requests\nMy referral link: ${link}\nTerms: ${referralRulesLink}`,
    `Join Mana Vivaha: ${link}\nA valid referral grants +1 interest-request credit to the new member and +2 to the referrer; these credits are not cash.\nTerms: ${referralRulesLink}`,
    `A one-time ₹50 reward may apply to the first qualifying consumer-plan payment only. Exclusions, eligibility checks, and manual review apply: ${referralRulesLink}`,
  ];
  const messageCandidate = te
    ? (kit.whatsapp_messages_te || kit.whatsapp_messages || fallbackMessages)
    : (kit.whatsapp_messages_en || fallbackMessages);
  const localizedMessages: string[] = Array.isArray(messageCandidate) ? messageCandidate : fallbackMessages;

  const friendsList = dash?.recent_registrations || [];


  const refCodeActive = dash?.code || tsapId || "MV";
  const refRegistrationUrl = `https://manavivaha.in/register?ref=${refCodeActive}`;

  useEffect(() => {
    if (refRegistrationUrl) {
      QRCode.toDataURL(refRegistrationUrl, {
        width: 280,
        margin: 1,
        color: {
          dark: shopPosterTheme === "navy" ? "#0F1F3C" : "#7A0C2E",
          light: "#FFFFFF",
        },
      })
        .then(setQrCodeUrl)
        .catch(() => {});
    }
  }, [refRegistrationUrl, shopPosterTheme]);

  const downloadShopPosterHD = async () => {
    if (!shopPosterRef.current) return;
    setShopPosterDownloading(true);
    try {
      const dataUrl = await toJpeg(shopPosterRef.current, {
        quality: 0.96,
        pixelRatio: 2.5,
        backgroundColor: "#FFFFFF",
      });
      const a = document.createElement("a");
      a.download = `ManaVivaha_Shop_Sticker_${refCodeActive}.jpg`;
      a.href = dataUrl;
      a.click();
    } catch (e) {
      console.error(e);
      alert(te ? "పోస్టర్‌ను డౌన్‌లోడ్ చేయలేకపోయాం. మళ్లీ ప్రయత్నించండి." : "Could not download the poster. Please try again.");
    }
    setShopPosterDownloading(false);
  };

  return (
    <div className="min-h-dvh bg-[#FFF8E7] pb-36">
      
      {/* ================= HERO SECTION ================= */}
      <section className="maroon-gradient text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gold/15 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-6xl mx-auto px-4 py-8 relative">
          
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-black uppercase bg-gradient-to-r from-amber-400 to-yellow-300 text-maroon shadow-md border border-white/40">
                <span>🎁</span>
                <span>{te ? "Referral attach పై +2 request credits • అర్హమైన first plan పై ఒక్కసారి ₹50" : "+2 request credits on valid referral attachment • one-time ₹50 for a qualifying first plan"}</span>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight">
                <Duo en="Referral Partner & Rewards Console" te="రెఫరల్ భాగస్వామ్యం & సంపాదన వేదిక 🤝" />
              </h1>

              <p className="text-xs sm:text-sm text-amber-100 leading-relaxed">
                {te
                  ? "Valid referral attach అయినప్పుడు referrer కు +2, కొత్త user కు +1 interest-request credits వస్తాయి; ఇవి cash కావు. Referrer కు ₹50 reward ఒక్కసారి మాత్రమే—referee మొదటి S_99/S_199/S_299/S_499 consumer-plan payment కనీసం ₹99 అయినప్పుడు అర్హత ఉండవచ్చు. మినహాయింపులు వర్తిస్తాయి; payout request admin review లో ఉంటుంది."
                  : "A valid referral attachment grants +2 interest-request credits to the referrer and +1 to the new user; these are not cash. The referrer may qualify for ₹50 once, only on the referee’s first S_99/S_199/S_299/S_499 consumer-plan payment of at least ₹99. Exclusions apply; payout requests receive manual review."}
              </p>
            </div>

            {!tsapId ? (
              <div className="w-full lg:max-w-sm rounded-3xl border border-amber-200 bg-white/95 p-5 text-gray-900 shadow-2xl">
                <div className="flex items-start gap-3">
                  <span aria-hidden="true" className="text-2xl">🤝</span>
                  <div>
                    <h2 className="text-sm font-black text-maroon">{te ? "రెఫరల్ భాగస్వామిగా చేరండి" : "Become a referral partner"}</h2>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">
                      {te ? "అక్షర క్రమంలో ఉన్న రాష్ట్రం/జిల్లా ఎంపికలతో పూర్తి నమోదు పేజీని ఉపయోగించండి. నమోదు ఒక్కటే cash reward ఇవ్వదు." : "Use the dedicated registration form with consistent state and district choices. Registration alone does not earn a cash reward."}
                    </p>
                    <Link href="/referral/register" className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[#7A0C2E] px-4 py-2.5 text-center text-xs font-black text-white hover:bg-[#5d0924] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2">
                      {te ? "భాగస్వామి నమోదు ప్రారంభించండి" : "Start partner registration"} <span aria-hidden="true" className="ml-1">→</span>
                    </Link>
                  </div>
                </div>
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

        {dash ? (
          <>
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
                ? (te ? "💸 Payout అభ్యర్థన (UPI)" : "💸 Request payout (UPI)")
                : (te ? `Payout request కోసం ఇంకా ₹${Math.max(0, minPayout - (s.wallet || 0))} కావాలి` : `₹${Math.max(0, minPayout - (s.wallet || 0))} more needed for the minimum payout request`)}
            </button>
          </div>

          {/* Confirmed eligible rewards */}
          <div className="bg-white rounded-3xl p-5 border border-gold/30 shadow-sm flex flex-col justify-between">
            <span className="text-xs text-gray-500 font-bold">💰 {te ? "నమోదైన అర్హమైన referral rewards" : "Recorded qualifying referral rewards"}</span>
            <div className="text-2xl sm:text-3xl font-black text-emerald-700 mt-2">
              ₹{s.qualifying_rewards_total ?? 0}
            </div>
            <span className="text-[11px] text-gray-500 mt-1">
              {te ? `నిజంగా చెల్లించినవి: ₹${s.paid_out ?? 0}` : `Settled payouts recorded: ₹${s.paid_out ?? 0}`}
            </span>
          </div>

          {/* Eligible first-plan rewards */}
          <div className="bg-white rounded-3xl p-5 border border-gold/30 shadow-sm flex flex-col justify-between">
            <span className="text-xs text-gray-500 font-bold">🎉 {te ? "అర్హమైన first-plan rewards" : "Qualifying first-plan rewards"}</span>
            <div className="text-2xl sm:text-3xl font-black text-navy mt-2">
              {s.paid_count ?? 0}
            </div>
            <span className="text-[11px] text-gray-500 mt-1">
              {te ? `మొత్తం referral registrations: ${s.registrations ?? 0}` : `Total referral registrations: ${s.registrations ?? 0}`}
            </span>
          </div>

          {/* Referral registrations without a recorded eligible reward — no money projection. */}
          <div className="bg-white rounded-3xl p-5 border border-gold/30 shadow-sm flex flex-col justify-between">
            <span className="text-xs text-gray-500 font-bold">⏳ {te ? "అర్హమైన reward నమోదు కాని referrals" : "Referrals without a recorded eligible reward"}</span>
            <div className="text-2xl sm:text-3xl font-black text-amber-600 mt-2">
              {s.pending_friends ?? 0}
            </div>
            <span className="text-[11px] text-gray-500 mt-1">
              {te ? "ఇది భవిష్యత్ ఆదాయం కాదు; qualifying payment నమోదైనప్పుడే reward లెక్కించబడుతుంది." : "This is not projected income; a reward is counted only when a qualifying payment is recorded."}
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
                  {te ? `విత్‌డ్రా మొత్తం (కనీసం ₹${minPayout})` : `Withdrawal amount (minimum ₹${minPayout})`}
                </label>
                <input
                  type="number"
                  min={minPayout}
                  max={s.wallet || minPayout}
                  value={pay.amount}
                  onChange={(e) => setPay({ ...pay, amount: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-gray-300 text-xs focus:border-maroon outline-none"
                  placeholder={te ? "మొత్తం (₹)" : "Amount (₹)"}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  {te ? "మీ UPI ID" : "Your UPI ID"}
                </label>
                <input
                  type="text"
                  value={pay.upi}
                  onChange={(e) => setPay({ ...pay, upi: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-gray-300 text-xs focus:border-maroon outline-none"
                  placeholder={te ? "UPI ID నమోదు చేయండి" : "Enter your UPI ID"}
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-gray-500">
                {te ? "ఈ అభ్యర్థన admin review లో ఉంటుంది; processing time కు హామీ లేదు." : "This request receives manual admin review; no processing time is guaranteed."}
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
                {apiDisplayMessage(payRes, te, te ? "Payout అభ్యర్థనను పూర్తి చేయలేకపోయాం." : "The payout request could not be completed.")}
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
            {link || (te ? "రెఫరల్ ID లోడ్ అవుతున్నప్పుడు వేచి ఉండండి" : "Loading your referral link…")}
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {[
            { id: "overview", label: te ? "📊 అవలోకనం" : "📊 Overview" },
            { id: "shop_poster", label: te ? "🏪 షాప్ స్టిక్కర్ & QR పోస్టర్" : "🏪 Shop Sticker & QR Poster" },
            { id: "status_poster", label: te ? "🖼️ referral పోస్టర్" : "🖼️ Referral Poster" },
            { id: "friends", label: te ? `👥 నా రెఫరల్స్ (${friendsList.length})` : `👥 Referred Friends (${friendsList.length})` },
            { id: "share", label: te ? "📲 వాట్సాప్ షేర్ కిట్" : "📲 Share Kit" },
            { id: "payouts", label: te ? "🧾 విత్‌డ్రా హిస్టరీ" : "🧾 Payout History" },
            { id: "leaderboard", label: te ? "🏆 లీడర్‌బోర్డ్" : "🏆 Leaderboard" },
            { id: "terms", label: te ? "📜 నిబంధనలు" : "📜 Terms & Rules" },
          ].map((tab) => (
            <button type="button"
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

        {/* ================= TAB: SHOP STICKER & QR POSTER STUDIO ================= */}
        {activeTab === "shop_poster" && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gold/40 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-xl font-black text-maroon flex items-center gap-2">
                  <span>🏪</span>
                  <span>{te ? "షాప్ & స్టిక్కర్ QR పోస్టర్" : "Shop & Sticker QR Poster"}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {te ? "మీ referral QR ను పోస్టర్‌గా డౌన్‌లోడ్ చేసి షేర్ చేయండి. ₹50 reward నియమాలు, మినహాయింపులు మరియు payout review వివరాలు terms లో ఉన్నాయి."
                    : "Download and share your referral QR poster. See the terms for the one-time qualifying-plan reward, exclusions, and payout review."}
                </p>
              </div>

              {/* Theme & Actions */}
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={downloadShopPosterHD}
                  disabled={shopPosterDownloading}
                  className="px-4 sm:px-5 py-2.5 rounded-2xl gold-gradient text-maroon font-black text-xs shadow-md hover:brightness-105 transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {shopPosterDownloading ? (te ? "డౌన్‌లోడ్ అవుతోంది…" : "Downloading…") : (te ? "📸 పోస్టర్ డౌన్‌లోడ్ (JPG)" : "📸 Download poster (JPG)")}
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-2.5 rounded-2xl bg-white border-2 border-gold/50 text-maroon font-black text-xs shadow-xs hover:bg-amber-50 transition flex items-center gap-1.5"
                >
                  <span>🖨️</span>
                  <span>{te ? "ప్రింట్" : "Print"}</span>
                </button>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(te
                    ? `🙏 మన వివాహ (Mana Vivaha)\nఉచిత నమోదు • 3 ఆసక్తి అభ్యర్థనలు • వినియోగదారు ప్లాన్‌లు ₹99 నుంచి.\nనా referral link: ${refRegistrationUrl}\nబహుమతి అర్హత మరియు మినహాయింపులు: https://manavivaha.in/referral`
                    : `🙏 Mana Vivaha (మన వివాహ)\nFree registration • 3 interest requests • consumer plans from ₹99.\nMy referral link: ${refRegistrationUrl}\nReward eligibility and exclusions: https://manavivaha.in/referral`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 rounded-2xl bg-[#25D366] text-white font-black text-xs shadow-md hover:brightness-105 transition flex items-center gap-1.5"
                >
                  <WhatsAppIcon className="w-4 h-4 fill-white" />
                  <span>{te ? "WhatsApp ద్వారా పంచుకోండి" : "Share on WhatsApp"}</span>
                </a>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Controls Column (4 cols) */}
              <div className="lg:col-span-4 space-y-4 bg-amber-50/50 p-5 rounded-3xl border border-gold/30 text-xs">
                {/* Business / Shop Template Picker */}
                <div>
                  <label className="font-bold text-slate-800 block mb-1">🏢 {te ? "దుకాణం / పంచుకునే నమూనా" : "Shop or sharing template"}</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {Object.values(SHOP_TEMPLATES).map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setShopTemplate(t.id as any)}
                        className={`p-2 rounded-xl text-[11px] font-bold border text-left transition ${
                          shopTemplate === t.id
                            ? "bg-maroon text-white border-maroon shadow-xs"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        {te ? t.labelTe : t.labelEn}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-800 block mb-1">🎨 {te ? "పోస్టర్ రంగు థీమ్" : "Poster colour theme"}</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { v: "maroon", te: "రాయల్ మెరూన్", en: "Royal maroon" },
                      { v: "gold", te: "టెంపుల్ గోల్డ్", en: "Temple gold" },
                      { v: "navy", te: "రాయల్ నేవీ", en: "Royal navy" },
                    ].map((t) => (
                      <button
                        key={t.v}
                        type="button"
                        onClick={() => setShopPosterTheme(t.v as any)}
                        className={`py-2 rounded-xl text-xs font-bold border transition ${
                          shopPosterTheme === t.v
                            ? "bg-maroon text-white border-maroon shadow-xs"
                            : "bg-white text-slate-700 border-slate-200"
                        }`}
                      >
                        {te ? t.te : t.en}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-800 block mb-1">🏷️ {te ? "దుకాణం / వ్యాపారం పేరు" : "Business or shop name"}</label>
                  <input
                    type="text"
                    value={posterCustomName}
                    onChange={(e) => setPosterCustomName(e.target.value)}
                    placeholder={te ? "మీ వ్యాపారం లేదా దుకాణం పేరు" : "Your business or shop name"}
                    className="w-full p-2.5 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-maroon"
                  />
                </div>

                <div className="bg-white p-3.5 rounded-2xl border border-gold/30 space-y-2 text-slate-700">
                  <div className="font-black text-maroon flex items-center gap-1.5">
                    <span>💡</span>
                    <span>{te ? "Referral నియమాలు" : "Referral terms"}</span>
                  </div>
                  <ul className="space-y-1 text-[11px] list-disc list-inside">
                    <li>Share this QR only with people who may want to register.</li>
                    <li>Valid referral attachment: +2 request credits to the referrer and +1 to the new user; not cash.</li>
                    <li>₹50 is a one-time possible reward only on the first qualifying S_99/S_199/S_299/S_499 consumer-plan payment of at least ₹99.</li>
                    <li>Add-ons, assisted services, boosts, gifts, renewals, complimentary grants and B2B/non-consumer payments are excluded. Payout requests receive manual review.</li>
                  </ul>
                </div>
              </div>

              {/* Printable Canvas Column (8 cols) */}
              <div className="lg:col-span-8 flex flex-col items-center">
                <div className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1.5">
                  <span>{te ? SHOP_TEMPLATES[shopTemplate]?.labelTe : SHOP_TEMPLATES[shopTemplate]?.labelEn}</span>
                </div>

                {/* The Poster Target */}
                <div
                  ref={shopPosterRef}
                  id="shop-sticker-canvas"
                  className={`w-full max-w-[480px] rounded-3xl p-6 sm:p-8 shadow-2xl border-4 text-center space-y-4 relative overflow-hidden transition-all ${
                    shopPosterTheme === "gold"
                      ? "bg-[#FFFDF2] border-[#B8860B] text-slate-900"
                      : shopPosterTheme === "navy"
                      ? "bg-[#F4F7FC] border-[#0F1F3C] text-slate-900"
                      : "bg-[#FFFDF7] border-[#7A0C2E] text-slate-900"
                  }`}
                >
                  {/* Watermark Motifs */}
                  <div className="absolute top-2 left-2 text-4xl opacity-15 pointer-events-none">🪔</div>
                  <div className="absolute top-2 right-2 text-4xl opacity-15 pointer-events-none">🌸</div>
                  <div className="absolute bottom-2 left-2 text-4xl opacity-15 pointer-events-none">⚜️</div>
                  <div className="absolute bottom-2 right-2 text-4xl opacity-15 pointer-events-none">🦚</div>

                  {/* Brand Header */}
                  <div className="border-b-2 border-dashed border-amber-300 pb-3 space-y-1">
                    <div className="flex items-center justify-center gap-3">
                      <Image src="/brand/logo-square-256.png" alt="Mana Vivaha logo" width={48} height={48} className="h-12 w-12 rounded-xl object-contain" />
                      <div className="text-left">
                        <div className="text-xl sm:text-2xl font-black text-[#7A0C2E] tracking-tight">Mana Vivaha • మన వివాహ</div>
                        <p className="text-xs font-bold text-slate-600">{te ? "తెలుగు వివాహ ప్రొఫైల్ వేదిక" : "Telugu matrimony profiles"}</p>
                      </div>
                    </div>
                  </div>

                  {/* Referral invitation */}
                  <div className="bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 text-[#5C0822] rounded-2xl p-2.5 shadow-sm">
                    <div className="text-sm sm:text-base font-black uppercase tracking-wide">
                      {te
                        ? (SHOP_TEMPLATES[shopTemplate]?.hookTe || "మన వివాహ referral link ను పంచుకోండి")
                        : (SHOP_TEMPLATES[shopTemplate]?.hookEn || "Share your Mana Vivaha referral link")}
                    </div>
                  </div>

                  {/* High-Contrast QR Code Box */}
                  <div className="bg-white p-4 rounded-3xl border-2 border-gold shadow-md inline-block mx-auto space-y-2">
                    <div className="w-48 h-48 sm:w-56 sm:h-56 mx-auto flex items-center justify-center">
                      {qrCodeUrl ? (
                        <Image src={qrCodeUrl} alt="Scan QR" width={224} height={224} unoptimized className="w-full h-full object-contain" />
                      ) : (
                        <div className="w-48 h-48 bg-slate-100 flex items-center justify-center text-xs">QR</div>
                      )}
                    </div>
                    <div className="inline-block px-4 py-1.5 rounded-full maroon-gradient text-white text-[11px] font-black shadow-xs">
                      {te
                        ? (SHOP_TEMPLATES[shopTemplate]?.subTe || "📱 QR కోడ్ స్కాన్ చేయండి")
                        : (SHOP_TEMPLATES[shopTemplate]?.subEn || "Scan the QR code to open registration")}
                    </div>
                  </div>

                  {/* Marketing Highlights */}
                  <div className="space-y-1.5 text-xs text-slate-800 text-left bg-amber-50/70 p-3.5 rounded-2xl border border-gold/30">
                    {(te
                      ? (SHOP_TEMPLATES[shopTemplate]?.pointsTe || ["ఉచిత నమోదు • 3 ఆసక్తి అభ్యర్థనలు", "వినియోగదారు ప్లాన్‌లు ₹99 నుంచి", "యజమాని అంగీకారం తర్వాతే సంప్రదింపు వివరాలు"])
                      : (SHOP_TEMPLATES[shopTemplate]?.pointsEn || ["Free registration • 3 interest requests", "Consumer plans from ₹99", "Contact details after owner acceptance"])
                    ).map((pt, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-emerald-600 font-bold">✓</span>
                        <span className="font-bold">{pt}</span>
                      </div>
                    ))}
                  </div>

                  {/* Referral Attribution Footer */}
                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-600">
                    <div>
                      <span className="font-bold block text-maroon">Referral code: {refCodeActive}</span>
                      {posterCustomName && <span className="font-semibold text-slate-500">{te ? "కేంద్రం:" : "Business:"} {posterCustomName}</span>}
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-slate-900 block">manavivaha.in</span>
                      <span className="text-[10px] text-slate-500">Free registration • 3 interest requests</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB: REFERRAL INFORMATION POSTER ================= */}
        {activeTab === "status_poster" && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gold/40 shadow-sm space-y-5">
            <div>
              <h3 className="text-xl font-extrabold text-maroon">🖼️ {te ? "Referral QR పోస్టర్" : "Referral QR Poster"}</h3>
              <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                {te
                  ? "ఈ పోస్టర్ referral link ను పంచుకోవడానికి మాత్రమే. ఇది సంపాదన లేదా payout రసీదు కాదు. ₹50 reward అర్హత నియమాలు మరియు మినహాయింపులు చూడండి."
                  : "This poster shares your referral link; it is not proof of earnings or payout. Review the ₹50 reward eligibility and exclusions before sharing."}
              </p>
            </div>
            {tsapId ? (
              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <Image src={`/api/referral/${encodeURIComponent(tsapId)}/poster.png?style=status`}
                  alt="Mana Vivaha referral QR poster" width={512} height={768} unoptimized className="mx-auto max-h-[70vh] w-auto max-w-full rounded-2xl border border-amber-200 object-contain" />
                <a href={`/api/referral/${encodeURIComponent(tsapId)}/poster.png?style=status`} download
                  className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#7A0C2E] px-5 py-3 text-sm font-bold text-white hover:bg-[#5e0824]">
                  {te ? "📥 Referral పోస్టర్ డౌన్‌లోడ్" : "📥 Download referral poster"}
                </a>
              </div>
            ) : (
              <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">{te ? "ముందుగా మీ referral ID లోడ్ చేయండి." : "Load your referral ID to view its poster."}</p>
            )}
            <Link href="/referral" className="text-sm font-semibold text-[#7A0C2E] underline underline-offset-2">
              {te ? "పూర్తి referral terms" : "View full referral terms"}
            </Link>
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
                    {te ? "ఉచిత నమోదు తో 3 interest requests ఉంటాయి. Valid referral attach అయితే కొత్త user కు అదనంగా +1 request credit వస్తుంది; ఇది cash కాదు." : "Free registration includes 3 interest requests. A valid referral attachment adds +1 request credit to the new user; it is not cash."}
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-amber-50/60 rounded-2xl border border-amber-100">
                  <span className="w-6 h-6 rounded-full bg-maroon text-white font-bold flex items-center justify-center shrink-0 text-xs">3</span>
                  <div>
                    <b className="text-maroon block mb-0.5">{te ? "అర్హమైన first-plan payment పై ఒక్కసారి ₹50" : "One-time ₹50 on a qualifying first-plan payment"}</b>
                    {te ? "Referee మొదటి S_99/S_199/S_299/S_499 consumer-plan payment కనీసం ₹99 అయినప్పుడు మాత్రమే referrer కు ఒక్కసారి ₹50 అర్హత ఉండవచ్చు. మినహాయింపులు వర్తిస్తాయి; payout manual review లో ఉంటుంది." : "The referrer may qualify once when the referee’s first S_99/S_199/S_299/S_499 consumer-plan payment is at least ₹99. Exclusions apply and payout requests receive manual review."}
                  </div>
                </div>
              </div>
            </div>

            {/* Referral credit and payout rules */}
            <div className="bg-white rounded-3xl p-6 border border-gold/30 shadow-sm space-y-4">
              <h3 className="font-extrabold text-maroon text-base">
                🔎 {te ? "క్రెడిట్స్ మరియు payout" : "Credits and payout"}
              </h3>
              <div className="space-y-3 text-xs leading-relaxed text-gray-700">
                <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4">
                  <b className="text-maroon">{te ? "Valid referral attach" : "Valid referral attachment"}</b>
                  <p className="mt-1">{te ? "Referrer కు +2, కొత్త user కు +1 interest-request credits. ఇవి cash లేదా contact unlocks కావు." : "The referrer gets +2 and the new user +1 interest-request credits. These are not cash or contact unlocks."}</p>
                </div>
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
                  <b className="text-maroon">{te ? "ఒక్కసారి ₹50 reward" : "One-time ₹50 reward"}</b>
                  <p className="mt-1">{te ? "మొదటి qualifying S_99/S_199/S_299/S_499 consumer-plan payment కనీసం ₹99 అయితే మాత్రమే. Add-ons, assisted services, boosts, gifts, renewals, complimentary grants మరియు B2B/non-consumer payments మినహాయింపు." : "Only if the first qualifying S_99/S_199/S_299/S_499 consumer-plan payment is at least ₹99. Add-ons, assisted services, boosts, gifts, renewals, complimentary grants and B2B/non-consumer payments are excluded."}</p>
                </div>
                <p className="text-gray-500">{te ? "Payout requests require at least the stated wallet minimum and manual admin review; no fixed processing time is promised." : "Payout requests require the stated wallet minimum and manual admin review; no fixed processing time is promised."}</p>
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
                  {te ? "Referral నమోదులు మరియు qualifying first-plan reward స్థితి ఇక్కడ చూడండి." : "Review referral registrations and the status of qualifying first-plan rewards."}
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
                  {te ? "మీ referral link ను ఆసక్తి ఉన్న కుటుంబాలతో పంచుకోండి. Reward అనేది terms లోని అర్హతలపై ఆధారపడి ఉంటుంది." : "Share your referral link with interested families. Any reward depends on the eligibility terms."}
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
                          {[te ? r.caste : apiDisplayMessage({ message_en: r.caste }, false, ""), te ? r.district : apiDisplayMessage({ message_en: r.district }, false, "")].filter(Boolean).join(" · ")}{r.joined ? ` · 📅 ${String(r.joined).slice(0, 10)}` : ""}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-200/60">
                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                        r.paid
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : r.reward_reversed || r.status_text_en?.startsWith("↩")
                          ? "bg-rose-50 text-rose-800 border border-rose-200"
                          : "bg-amber-100 text-amber-800 border border-amber-300"
                      }`}>
                        {te ? (r.status_text_te || (r.paid ? "✅ అర్హమైన reward wallet లో నమోదైంది" : "⏳ అర్హత ఉన్న payment నమోదు కాలేదు"))
                    : apiDisplayMessage({ message_en: r.status_text_en }, false, r.paid ? "✅ Eligible reward recorded" : "⏳ No qualifying payment recorded")}
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
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-xl border border-gold text-maroon font-bold hover:bg-gold-soft"
                  >
                    🖼️ {te ? "QR పోస్టర్" : "QR Poster"}
                  </a>
                  <a
                    href={`/api/referral/${tsapId}/poster.png?style=status`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-navy text-white font-bold hover:bg-navy/90"
                  >
                    📱 {te ? "స్టేటస్ పోస్టర్" : "Status Poster"}
                  </a>
                </div>
              )}
            </div>

            {/* Message Template Switcher */}
            <div className="flex gap-2">
              {localizedMessages.map((_, i) => (
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
              {localizedMessages[msgIdx]}
            </div>

            {/* 1-Tap Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <a
                href={(te ? kit.whatsapp_share_variants_te : kit.whatsapp_share_variants_en)?.[msgIdx] || `https://wa.me/?text=${encodeURIComponent(localizedMessages[msgIdx] || "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#25D366] text-white font-extrabold text-xs shadow-md hover:brightness-105 active:scale-95 transition"
              >
                <WhatsAppIcon className="w-4 h-4" mono />
                <span>{te ? "వాట్సాప్‌లో షేర్ చేయండి" : "Share on WhatsApp"}</span>
              </a>

              <a
                href={(te ? kit.telegram_share_te : kit.telegram_share_en) || `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(localizedMessages[msgIdx] || "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#229ED9] text-white font-extrabold text-xs shadow-md hover:brightness-105 active:scale-95 transition"
              >
                <TelegramIcon className="w-4 h-4" mono />
                <span>Telegram</span>
              </a>

              <button
                type="button"
                onClick={() => copy(localizedMessages[msgIdx] || "", "msg")}
                className="px-5 py-3 rounded-2xl border border-gray-300 text-gray-700 font-bold text-xs hover:bg-gray-50 active:scale-95 transition"
              >
                📋 {copied === "msg" ? (te ? "కాపీ అయింది! ✅" : "Copied! ✅") : (te ? "సందేశాన్ని కాపీ చేయండి" : "Copy message")}
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
                {te ? `ఇంకా payout అభ్యర్థనలు లేవు. కనీసం ₹${minPayout} wallet balance ఉన్నప్పుడు request పెట్టవచ్చు; admin review వర్తిస్తుంది.` : `No payout requests yet. A request is available at a wallet balance of at least ₹${minPayout}; manual review applies.`}
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
                          {isPaid ? "✅ PAID" : te ? (p.status || "—") : apiDisplayMessage({ message_en: p.status }, false, "Pending")}
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
                <p className="text-xs text-gray-500 mt-0.5">
                  {te ? "Leaderboard అర్హమైన first-plan rewards ఆధారంగా ఉంటుంది; అదనపు prize లేదా cash bonus లేదు." : "Ranks use recorded qualifying first-plan rewards; no additional prize or cash bonus is offered."}
                </p>
              </div>

              <div className="flex gap-1.5 bg-gray-100 p-1 rounded-xl text-xs">
                {["all", "week", "month"].map((p) => (
                  <button type="button"
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
                    <span className="font-extrabold text-maroon block">{item.paid_count || item.paid || 0} qualifying first-plan rewards</span>
                  <span className="text-[10px] text-gray-500 font-bold">Dashboard recognition only</span>
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
              📜 {te ? "రెఫరల్ నియమ నిబంధనలు" : "Referral Program Rules & Policy"}
            </h3>
            <div className="space-y-2.5 text-xs text-gray-700 leading-relaxed">
              {(te ? (terms?.rules_telugu || [
                "నమోదు ఉచితం; 3 ఆసక్తి అభ్యర్థన క్రెడిట్‌లు ఉంటాయి. ఇవి సంప్రదింపు వివరాలు తెరవవు.",
                "రిఫరర్‌కు ₹50 ఒకసారి మాత్రమే లభించవచ్చు: కొత్త సభ్యుడి మొదటి అర్హత కలిగిన S_99/S_199/S_299/S_499 వినియోగదారు ప్లాన్ చెల్లింపు కనీసం ₹99 ఉండాలి.",
                "యాడ్-ఆన్‌లు, సహాయక సేవలు, బూస్ట్‌లు, బహుమతులు, పునరుద్ధరణలు, ఉచిత క్రెడిట్‌లు మరియు B2B / వినియోగదారు కాని చెల్లింపులు మినహాయింపు.",
                "చెల్లుబాటు అయ్యే రిఫరల్‌తో రిఫరర్‌కు +2, కొత్త సభ్యుడికి +1 ఆసక్తి అభ్యర్థన క్రెడిట్ లభిస్తుంది; ఇవి నగదు కాదు.",
                "పేఅవుట్ అభ్యర్థనలకు కనీస వాలెట్ నిల్వ మరియు మాన్యువల్ నిర్వాహక సమీక్ష అవసరం; సమయం హామీ కాదు."
              ]) : (terms?.rules_en || [
                "Registration is free and includes 3 interest-request credits; these do not unlock contact details.",
                "A referrer may receive ₹50 once if the new member’s first qualifying S_99/S_199/S_299/S_499 consumer-plan payment is at least ₹99.",
                "Add-ons, assisted services, boosts, gifts, renewals, complimentary grants, and B2B or other non-consumer payments are excluded.",
                "A valid referral grants +2 interest-request credits to the referrer and +1 to the new member; credits are not cash.",
                "Payout requests require the minimum wallet balance and manual review; processing time is not guaranteed."
              ])).map((rule: string, i: number) => (
                <div key={i} className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  {rule}
                </div>
              ))}
            </div>
          </div>
        )}

          </>
        ) : (
          <div className="rounded-2xl border border-amber-200 bg-white p-5 text-sm leading-relaxed text-slate-700 shadow-sm" role="status">
            {tsapId
              ? (te ? "మీ referral dashboard లోడ్ అవుతోంది. కొద్దిసేపు వేచి ఉండండి." : "Loading your referral dashboard. Please wait a moment.")
              : (te ? "వ్యక్తిగత referral dashboard చూడటానికి పై భాగంలో మీ TSAP ID లేదా మొబైల్‌తో వెతకండి. Partner ID ఉంటే partner నమోదు పేజీలో dashboard తెరవండి." : "Search above with your TSAP ID or mobile to view your personal referral dashboard. For a partner ID, open the partner registration page and use its dashboard lookup.")}
          </div>
        )}
      </div>
    </div>
  );
}
