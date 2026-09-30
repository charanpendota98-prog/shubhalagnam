"use client";

/**
 * 🪔 VEDIC LAGNA PATRIKA STUDIO — మన వివాహ సాంప్రదాయ లగ్న పత్రిక స్టూడియో
 * =========================================================================
 * Authentic Telugu Marriage Lagna Patrika Generator with Sanskrit Slokas,
 * Auspicious Muhurtham details, Royal Themes, HD Canvas Image rendering,
 * and 1-Click WhatsApp & PDF Sharing.
 */
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { SITE_CONFIG } from "@/lib/site-config";
import { useLang } from "@/lib/lang";
import { TelegramIcon, WhatsAppIcon } from "@/components/BrandIcons";
import Reveal from "@/components/Reveal";
import SectionHeading from "@/components/SectionHeading";

type LagnaTheme = "gold" | "maroon" | "emerald" | "silk";

const THEMES: { id: LagnaTheme; nameTe: string; nameEn: string; bgClass: string; borderClass: string; textClass: string; accentClass: string }[] = [
  {
    id: "gold",
    nameTe: "👑 స్వర్ణ పీతాంబరం (Royal Gold)",
    nameEn: "Royal Gold",
    bgClass: "bg-gradient-to-b from-[#FFFDF0] via-[#FFF9D6] to-[#FFF3B0]",
    borderClass: "border-[#D4AF37]",
    textClass: "text-[#5C3B00]",
    accentClass: "bg-[#D4AF37] text-white",
  },
  {
    id: "maroon",
    nameTe: "🪔 కుంకుమ మెరూన్ (Temple Maroon)",
    nameEn: "Temple Maroon",
    bgClass: "bg-gradient-to-b from-[#FFF5F5] via-[#FFE8E8] to-[#FFD6D6]",
    borderClass: "border-[#800000]",
    textClass: "text-[#600000]",
    accentClass: "bg-[#800000] text-white",
  },
  {
    id: "emerald",
    nameTe: "🌿 తిరుమల పట్టు (Emerald Silk)",
    nameEn: "Emerald Silk",
    bgClass: "bg-gradient-to-b from-[#F2FBF7] via-[#E2F7ED] to-[#C9EFE0]",
    borderClass: "border-[#0F5A47]",
    textClass: "text-[#063B2E]",
    accentClass: "bg-[#0F5A47] text-white",
  },
  {
    id: "silk",
    nameTe: "🌸 రాయలసీమ కల్యాణం (Classic Silk)",
    nameEn: "Classic Silk",
    bgClass: "bg-gradient-to-b from-[#FAF5FF] via-[#F3E8FF] to-[#E9D5FF]",
    borderClass: "border-[#6B21A8]",
    textClass: "text-[#4C1D95]",
    accentClass: "bg-[#6B21A8] text-white",
  },
];

export default function LagnaPatrikaStudio() {
  const { lang } = useLang();
  const te = lang === "te";

  // Form State
  const [theme, setTheme] = useState<LagnaTheme>("gold");
  const [sloka, setSloka] = useState<string>("వక్రతుండ మహాకాయ సూర్యకోటి సమప్రభ । నిర్విఘ్నం కురు మే దేవ సర్వకార్యేషు సర్వదా ॥");
  
  // Groom Details
  const [groomName, setGroomName] = useState("చిరంజీవి సాయి కార్తీక్");
  const [groomGothram, setGroomGothram] = useState("కాశ్యపస గోత్రోద్భవ");
  const [groomFather, setGroomFather] = useState("శ్రీ వెంకటేశ్వర రావు");
  const [groomMother, setGroomMother] = useState("శ్రీమతి లక్ష్మీ కాంతమ్మ");
  const [groomNative, setGroomNative] = useState("హైదరాబాద్, తెలంగాణ");

  // Bride Details
  const [brideName, setBrideName] = useState("చిరంజీవి సౌభాగ్యవతి శ్రీలక్ష్మి");
  const [brideGothram, setBrideGothram] = useState("జనకుల గోత్రోద్భవ");
  const [brideFather, setBrideFather] = useState("శ్రీ రామచంద్ర మూర్తి");
  const [brideMother, setBrideMother] = useState("శ్రీమతి సీతమ్మ");
  const [brideNative, setBrideNative] = useState("విజయవాడ, ఆంధ్రప్రదేశ్");

  // Muhurtham Details
  const [muhurthamDate, setMuhurthamDate] = useState("2026 నవంబర్ 18 (కార్తీక శుద్ధ దశమి)");
  const [muhurthamTime, setMuhurthamTime] = useState("ఉదయం 09 గంటల 15 నిమిషాలకు");
  const [muhurthamLagnam, setMuhurthamLagnam] = useState("ధనూ లగ్న పుష్కరాంశ సుముహూర్తమున");
  const [muhurthamStar, setMuhurthamStar] = useState("ఉత్తరాభాద్ర నక్షత్ర యుక్త");
  const [venue, setVenue] = useState("శ్రీ వేంకటేశ్వర కల్యాణ మండపం, బంజారా హిల్స్, హైదరాబాద్");
  const [inviter, setInviter] = useState("వధూవరుల తల్లిదండ్రులు మరియు బంధుమిత్రులు");

  const [downloading, setDownloading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Generate WhatsApp Share Message
  const waShareText = `🪔 *మన వివాహ — శుభ లగ్న పత్రిక* 🪔\n\n` +
    `🙏 *శ్రీరస్తు - శుభమస్తు - అవిఘ్నమస్తు*\n\n` +
    `👰 *వధువు:* ${brideName} (${brideGothram})\n` +
    `తల్లిదండ్రులు: ${brideMother} & ${brideFather}\n` +
    `స్వస్థలం: ${brideNative}\n\n` +
    `🤵 *వరుడు:* ${groomName} (${groomGothram})\n` +
    `తల్లిదండ్రులు: ${groomMother} & ${groomFather}\n` +
    `స్వస్థలం: ${groomNative}\n\n` +
    `🗓️ *వివాహ తేదీ:* ${muhurthamDate}\n` +
    `⏰ *శుభ ముహూర్తం:* ${muhurthamTime} (${muhurthamLagnam})\n` +
    `🌟 *నక్షత్రం:* ${muhurthamStar}\n` +
    `🏛️ *కల్యాణ వేదిక:* ${venue}\n\n` +
    `✨ అందరూ విచ్చేసి నూతన వధూవరులను ఆశీర్వదించగలరు 💐\n\n` +
    `🌐 డిజిటల్ లగ్న పత్రిక & వివాహ సేవలు: https://manavivaha.in/lagna-patrika`;

  const waShareUrl = `https://wa.me/?text=${encodeURIComponent(waShareText)}`;

  const currentTheme = THEMES.find((t) => t.id === theme) || THEMES[0];

  // HD Download handler via Canvas
  const handleDownloadHD = async () => {
    setDownloading(true);
    try {
      const el = cardRef.current;
      if (!el) return;

      // Use html2canvas or dynamic canvas rendering
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = 1080;
      canvas.height = 1620;

      if (ctx) {
        // Draw background
        const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        if (theme === "gold") {
          grad.addColorStop(0, "#FFFDF0");
          grad.addColorStop(0.5, "#FFF9D6");
          grad.addColorStop(1, "#FFF3B0");
        } else if (theme === "maroon") {
          grad.addColorStop(0, "#FFF5F5");
          grad.addColorStop(0.5, "#FFE8E8");
          grad.addColorStop(1, "#FFD6D6");
        } else if (theme === "emerald") {
          grad.addColorStop(0, "#F2FBF7");
          grad.addColorStop(0.5, "#E2F7ED");
          grad.addColorStop(1, "#C9EFE0");
        } else {
          grad.addColorStop(0, "#FAF5FF");
          grad.addColorStop(0.5, "#F3E8FF");
          grad.addColorStop(1, "#E9D5FF");
        }
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw Royal Borders
        ctx.strokeStyle = theme === "maroon" ? "#800000" : theme === "emerald" ? "#0F5A47" : theme === "silk" ? "#6B21A8" : "#D4AF37";
        ctx.lineWidth = 16;
        ctx.strokeRect(30, 30, canvas.width - 60, canvas.height - 60);
        ctx.lineWidth = 4;
        ctx.strokeRect(50, 50, canvas.width - 100, canvas.height - 100);

        // Header Title
        ctx.fillStyle = theme === "maroon" ? "#800000" : theme === "emerald" ? "#0F5A47" : theme === "silk" ? "#6B21A8" : "#8A5A00";
        ctx.textAlign = "center";
        ctx.font = "bold 42px sans-serif";
        ctx.fillText("॥ శ్రీరస్తు • శుభమస్తు • అవిఘ్నమస్తు ॥", canvas.width / 2, 130);

        ctx.font = "italic 24px sans-serif";
        ctx.fillStyle = "#555555";
        ctx.fillText(sloka, canvas.width / 2, 185);

        // Main Lagna Patrika Box
        ctx.fillStyle = theme === "maroon" ? "#800000" : theme === "emerald" ? "#0F5A47" : theme === "silk" ? "#6B21A8" : "#8A5A00";
        ctx.font = "bold 56px sans-serif";
        ctx.fillText("🪔 శుభ లగ్న పత్రిక 🪔", canvas.width / 2, 280);

        // Bride & Groom Box
        ctx.font = "bold 32px sans-serif";
        ctx.fillStyle = "#222222";
        ctx.fillText(`👰 వధువు: ${brideName}`, canvas.width / 2, 400);
        ctx.font = "26px sans-serif";
        ctx.fillStyle = "#555555";
        ctx.fillText(`(${brideGothram} · తల్లిదండ్రులు: ${brideMother} & ${brideFather})`, canvas.width / 2, 445);
        ctx.fillText(`స్వస్థలం: ${brideNative}`, canvas.width / 2, 485);

        ctx.font = "bold 36px sans-serif";
        ctx.fillStyle = theme === "maroon" ? "#800000" : theme === "emerald" ? "#0F5A47" : "#D4AF37";
        ctx.fillText("💍 పాణిగ్రహణ సుముహూర్తం 💍", canvas.width / 2, 570);

        ctx.font = "bold 32px sans-serif";
        ctx.fillStyle = "#222222";
        ctx.fillText(`🤵 వరుడు: ${groomName}`, canvas.width / 2, 660);
        ctx.font = "26px sans-serif";
        ctx.fillStyle = "#555555";
        ctx.fillText(`(${groomGothram} · తల్లిదండ్రులు: ${groomMother} & ${groomFather})`, canvas.width / 2, 705);
        ctx.fillText(`స్వస్థలం: ${groomNative}`, canvas.width / 2, 745);

        // Muhurtham Details Box
        ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
        ctx.fillRect(100, 820, canvas.width - 200, 420);
        ctx.strokeStyle = ctx.fillStyle;
        ctx.strokeRect(100, 820, canvas.width - 200, 420);

        ctx.fillStyle = theme === "maroon" ? "#800000" : theme === "emerald" ? "#0F5A47" : theme === "silk" ? "#6B21A8" : "#8A5A00";
        ctx.font = "bold 34px sans-serif";
        ctx.fillText("🗓️ నిశ్చయ తాంబూల సుముహూర్త వివరాలు", canvas.width / 2, 880);

        ctx.font = "28px sans-serif";
        ctx.fillStyle = "#222222";
        ctx.fillText(`తేదీ: ${muhurthamDate}`, canvas.width / 2, 940);
        ctx.fillText(`సమయం: ${muhurthamTime}`, canvas.width / 2, 990);
        ctx.fillText(`లగ్నం: ${muhurthamLagnam}`, canvas.width / 2, 1040);
        ctx.fillText(`నక్షత్రం: ${muhurthamStar}`, canvas.width / 2, 1090);
        ctx.fillText(`వేదిక: ${venue}`, canvas.width / 2, 1150);

        // Inviter & Footer
        ctx.font = "bold 26px sans-serif";
        ctx.fillStyle = "#444444";
        ctx.fillText(`ఆహ్వానించేవారు: ${inviter}`, canvas.width / 2, 1340);

        ctx.font = "bold 24px sans-serif";
        ctx.fillStyle = theme === "maroon" ? "#800000" : theme === "emerald" ? "#0F5A47" : "#D4AF37";
        ctx.fillText("మన వివాహ • తెలుగు వారి పవిత్ర మ్యాట్రిమోనీ | manavivaha.in", canvas.width / 2, 1540);

        const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
        const link = document.createElement("a");
        link.download = `Lagna_Patrika_${groomName.replace(/\s+/g, "_")}_${brideName.replace(/\s+/g, "_")}.jpg`;
        link.href = dataUrl;
        link.click();
      }
    } catch (e) {
      console.error("Download failed:", e);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gold/15 border border-gold/40 text-maroon text-xs font-bold mb-3">
            🪔 100% ఉచిత తెలుగు డిజిటల్ లగ్న పత్రిక స్టూడియో
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-maroon">
            {te ? "💍 శుభ లగ్న పత్రిక జనరేటర్" : "💍 Telugu Lagna Patrika Studio"}
          </h1>
          <p className="mt-2 text-sm text-gray-700 max-w-2xl mx-auto">
            {te
              ? "పెళ్లి కుదిరిన తర్వాత బంధుమిత్రులకు వాట్సాప్‌లో ఆహ్వానం పంపడానికి సాంప్రదాయ లగ్న పత్రికను 1 నిమిషంలో సులభంగా తయారుచేసుకోండి."
              : "Generate an authentic traditional Telugu Lagna Patrika with muhurtham details, Sanskrit slokas & HD photo export."}
          </p>
        </div>

        {/* Studio Layout: Editor (Left) & Live Preview (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Controls Column */}
          <div className="lg:col-span-5 bg-white rounded-3xl p-6 shadow-xl border border-gold/30 space-y-6">
            <h2 className="text-lg font-bold text-maroon flex items-center gap-2 border-b border-gray-100 pb-3">
              <span>✍️</span>
              <span>{te ? "లగ్న పత్రిక వివరాలు ఎడిట్ చేయండి" : "Edit Lagna Patrika Details"}</span>
            </h2>

            {/* Theme Selector */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-2">
                🎨 {te ? "రాజసం థీమ్ ఎంచుకోండి" : "Select Royal Theme"}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {THEMES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTheme(t.id)}
                    className={`px-3 py-2 text-xs font-bold rounded-xl border text-left transition ${
                      theme === t.id
                        ? "border-maroon bg-maroon/10 text-maroon shadow-sm ring-2 ring-maroon/20"
                        : "border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {t.nameTe}
                  </button>
                ))}
              </div>
            </div>

            {/* Sloka Input */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                🪔 {te ? "ప్రారంభ శ్లోకం / మంత్రం" : "Invocational Sloka"}
              </label>
              <input
                type="text"
                value={sloka}
                onChange={(e) => setSloka(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-gold outline-none"
              />
            </div>

            {/* Bride Form */}
            <div className="p-4 bg-rose-50/60 rounded-2xl border border-rose-200/60 space-y-3">
              <div className="text-xs font-extrabold text-rose-900 flex items-center gap-1.5">
                <span>👰</span>
                <span>{te ? "వధువు వివరాలు (Bride)" : "Bride Details"}</span>
              </div>
              <input
                type="text"
                placeholder="వధువు పేరు"
                value={brideName}
                onChange={(e) => setBrideName(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-gray-200 bg-white outline-none"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="గోత్రం"
                  value={brideGothram}
                  onChange={(e) => setBrideGothram(e.target.value)}
                  className="w-full text-xs p-2 rounded-xl border border-gray-200 bg-white outline-none"
                />
                <input
                  type="text"
                  placeholder="స్వస్థలం"
                  value={brideNative}
                  onChange={(e) => setBrideNative(e.target.value)}
                  className="w-full text-xs p-2 rounded-xl border border-gray-200 bg-white outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="తల్లి పేరు"
                  value={brideMother}
                  onChange={(e) => setBrideMother(e.target.value)}
                  className="w-full text-xs p-2 rounded-xl border border-gray-200 bg-white outline-none"
                />
                <input
                  type="text"
                  placeholder="తండ్రి పేరు"
                  value={brideFather}
                  onChange={(e) => setBrideFather(e.target.value)}
                  className="w-full text-xs p-2 rounded-xl border border-gray-200 bg-white outline-none"
                />
              </div>
            </div>

            {/* Groom Form */}
            <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200/60 space-y-3">
              <div className="text-xs font-extrabold text-amber-900 flex items-center gap-1.5">
                <span>🤵</span>
                <span>{te ? "వరుడు వివరాలు (Groom)" : "Groom Details"}</span>
              </div>
              <input
                type="text"
                placeholder="వరుడు పేరు"
                value={groomName}
                onChange={(e) => setGroomName(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-gray-200 bg-white outline-none"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="గోత్రం"
                  value={groomGothram}
                  onChange={(e) => setGroomGothram(e.target.value)}
                  className="w-full text-xs p-2 rounded-xl border border-gray-200 bg-white outline-none"
                />
                <input
                  type="text"
                  placeholder="స్వస్థలం"
                  value={groomNative}
                  onChange={(e) => setGroomNative(e.target.value)}
                  className="w-full text-xs p-2 rounded-xl border border-gray-200 bg-white outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="తల్లి పేరు"
                  value={groomMother}
                  onChange={(e) => setGroomMother(e.target.value)}
                  className="w-full text-xs p-2 rounded-xl border border-gray-200 bg-white outline-none"
                />
                <input
                  type="text"
                  placeholder="తండ్రి పేరు"
                  value={groomFather}
                  onChange={(e) => setGroomFather(e.target.value)}
                  className="w-full text-xs p-2 rounded-xl border border-gray-200 bg-white outline-none"
                />
              </div>
            </div>

            {/* Muhurtham Details */}
            <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200/60 space-y-3">
              <div className="text-xs font-extrabold text-emerald-900 flex items-center gap-1.5">
                <span>🗓️</span>
                <span>{te ? "వివాహ ముహూర్తం & వేదిక" : "Muhurtham & Venue"}</span>
              </div>
              <input
                type="text"
                placeholder="ముహూర్తం తేదీ"
                value={muhurthamDate}
                onChange={(e) => setMuhurthamDate(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-gray-200 bg-white outline-none"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="సమయం"
                  value={muhurthamTime}
                  onChange={(e) => setMuhurthamTime(e.target.value)}
                  className="w-full text-xs p-2 rounded-xl border border-gray-200 bg-white outline-none"
                />
                <input
                  type="text"
                  placeholder="లగ్నం"
                  value={muhurthamLagnam}
                  onChange={(e) => setMuhurthamLagnam(e.target.value)}
                  className="w-full text-xs p-2 rounded-xl border border-gray-200 bg-white outline-none"
                />
              </div>
              <input
                type="text"
                placeholder="నక్షత్రం"
                value={muhurthamStar}
                onChange={(e) => setMuhurthamStar(e.target.value)}
                className="w-full text-xs p-2 rounded-xl border border-gray-200 bg-white outline-none"
              />
              <input
                type="text"
                placeholder="కల్యాణ వేదిక / అడ్రస్"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-gray-200 bg-white outline-none"
              />
              <input
                type="text"
                placeholder="ఆహ్వానించేవారు"
                value={inviter}
                onChange={(e) => setInviter(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-gray-200 bg-white outline-none"
              />
            </div>
          </div>

          {/* Live Preview Column */}
          <div className="lg:col-span-7 space-y-4">
            {/* Action Bar */}
            <div className="bg-white p-4 rounded-2xl shadow-md border border-gold/30 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs font-bold text-gray-700">
                ✨ {te ? "లైవ్ ప్రివ్యూ & డౌన్‌లోడ్" : "Live Preview & Actions"}
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={waShareUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#25D366] text-white rounded-full text-xs font-bold shadow-md hover:brightness-110 active:scale-95 transition"
                >
                  <WhatsAppIcon className="w-4 h-4" mono />
                  <span>WhatsApp ఆహ్వానం</span>
                </a>
                <button
                  onClick={handleDownloadHD}
                  disabled={downloading}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-maroon text-white rounded-full text-xs font-bold shadow-md hover:bg-maroon-dark active:scale-95 transition disabled:opacity-50"
                >
                  <span>{downloading ? "⏳ తయారవుతోంది..." : "📥 HD కార్డ్ డౌన్‌లోడ్"}</span>
                </button>
              </div>
            </div>

            {/* Regal Card Preview */}
            <div
              ref={cardRef}
              className={`rounded-3xl p-6 sm:p-10 shadow-2xl border-4 ${currentTheme.borderClass} ${currentTheme.bgClass} text-center space-y-6 relative overflow-hidden transition-all duration-300`}
            >
              {/* Inner Decorative Border */}
              <div className={`absolute inset-3 border-2 ${currentTheme.borderClass} opacity-40 rounded-2xl pointer-events-none`} />

              {/* Sloka Header */}
              <div className="space-y-1">
                <div className={`text-base sm:text-lg font-bold ${currentTheme.textClass}`}>
                  ॥ శ్రీరస్తు • శుభమస్తు • అవిఘ్నమస్తు ॥
                </div>
                <div className="text-xs sm:text-sm italic opacity-80 max-w-lg mx-auto">
                  {sloka}
                </div>
              </div>

              {/* Main Title Badge */}
              <div className="inline-block py-2 px-8 rounded-full bg-white/80 shadow-md border border-gold/40">
                <h3 className={`text-2xl sm:text-3xl font-extrabold ${currentTheme.textClass}`}>
                  🪔 శుభ లగ్న పత్రిక 🪔
                </h3>
              </div>

              {/* Bride & Groom Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left my-4">
                {/* Bride Side */}
                <div className="p-4 bg-white/70 rounded-2xl border border-gold/30 shadow-sm space-y-1.5">
                  <div className="text-xs font-bold uppercase tracking-wider text-rose-800">👰 వధువు</div>
                  <div className="text-sm font-extrabold text-gray-900">{brideName}</div>
                  <div className="text-xs text-gray-600">గోత్రం: <span className="font-semibold text-gray-800">{brideGothram}</span></div>
                  <div className="text-xs text-gray-600">తల్లిదండ్రులు: <span className="font-semibold text-gray-800">{brideMother} & {brideFather}</span></div>
                  <div className="text-xs text-gray-600">స్వస్థలం: <span className="font-semibold text-gray-800">{brideNative}</span></div>
                </div>

                {/* Groom Side */}
                <div className="p-4 bg-white/70 rounded-2xl border border-gold/30 shadow-sm space-y-1.5">
                  <div className="text-xs font-bold uppercase tracking-wider text-amber-800">🤵 వరుడు</div>
                  <div className="text-sm font-extrabold text-gray-900">{groomName}</div>
                  <div className="text-xs text-gray-600">గోత్రం: <span className="font-semibold text-gray-800">{groomGothram}</span></div>
                  <div className="text-xs text-gray-600">తల్లిదండ్రులు: <span className="font-semibold text-gray-800">{groomMother} & {groomFather}</span></div>
                  <div className="text-xs text-gray-600">స్వస్థలం: <span className="font-semibold text-gray-800">{groomNative}</span></div>
                </div>
              </div>

              {/* Muhurtham Details Box */}
              <div className="bg-white/80 rounded-2xl p-5 border border-gold/40 shadow-md space-y-2 text-center">
                <div className={`text-sm font-bold uppercase tracking-wider ${currentTheme.textClass}`}>
                  💍 పాణిగ్రహణ సుముహూర్త వివరాలు 💍
                </div>
                <div className="text-base sm:text-lg font-extrabold text-maroon">
                  {muhurthamDate}
                </div>
                <div className="text-sm text-gray-800 font-semibold">
                  {muhurthamTime} ({muhurthamLagnam})
                </div>
                <div className="text-xs text-gray-600">
                  నక్షత్రం: <span className="font-bold text-gray-800">{muhurthamStar}</span>
                </div>
                <div className="text-xs text-gray-700 pt-2 border-t border-gray-200">
                  🏛️ <span className="font-bold">కల్యాణ వేదిక:</span> {venue}
                </div>
              </div>

              {/* Inviter Footer */}
              <div className="text-xs text-gray-600 pt-2">
                ఆహ్వానించేవారు: <span className="font-bold text-gray-800">{inviter}</span>
              </div>

              <div className="text-[11px] font-bold text-gold opacity-90 tracking-wide">
                మన వివాహ • తెలుగు వారి పవిత్ర మ్యాట్రిమోనీ | manavivaha.in
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
