"use client";

/**
 * Vedic Lagna Patrika Studio — a bilingual, local-only invitation editor.
 * The visitor's own details are never prefilled with sample people or dates.
 */
import { useState } from "react";
import { SITE_CONFIG } from "@/lib/site-config";
import { useLang } from "@/lib/lang";
import { WhatsAppIcon } from "@/components/BrandIcons";

type LagnaTheme = "gold" | "maroon" | "emerald" | "silk";
type DetailKey =
  | "brideName" | "brideGothram" | "brideNative" | "brideMother" | "brideFather"
  | "groomName" | "groomGothram" | "groomNative" | "groomMother" | "groomFather"
  | "date" | "time" | "lagnam" | "star" | "venue" | "inviter";

type Details = Record<DetailKey, string>;

const THEMES: {
  id: LagnaTheme;
  nameTe: string;
  nameEn: string;
  background: string;
  border: string;
  ink: string;
  accent: string;
  canvasStart: string;
  canvasMiddle: string;
  canvasEnd: string;
}[] = [
  {
    id: "gold", nameTe: "👑 స్వర్ణ పీతాంబరం", nameEn: "👑 Royal Gold",
    background: "bg-gradient-to-b from-[#FFFDF0] via-[#FFF9D6] to-[#FFF3B0]",
    border: "border-[#D4AF37]", ink: "text-[#5C3B00]", accent: "#8A5A00",
    canvasStart: "#FFFDF0", canvasMiddle: "#FFF9D6", canvasEnd: "#FFF3B0",
  },
  {
    id: "maroon", nameTe: "🪔 కుంకుమ మెరూన్", nameEn: "🪔 Temple Maroon",
    background: "bg-gradient-to-b from-[#FFF5F5] via-[#FFE8E8] to-[#FFD6D6]",
    border: "border-[#800000]", ink: "text-[#600000]", accent: "#800000",
    canvasStart: "#FFF5F5", canvasMiddle: "#FFE8E8", canvasEnd: "#FFD6D6",
  },
  {
    id: "emerald", nameTe: "🌿 తిరుమల పట్టు", nameEn: "🌿 Emerald Silk",
    background: "bg-gradient-to-b from-[#F2FBF7] via-[#E2F7ED] to-[#C9EFE0]",
    border: "border-[#0F5A47]", ink: "text-[#063B2E]", accent: "#0F5A47",
    canvasStart: "#F2FBF7", canvasMiddle: "#E2F7ED", canvasEnd: "#C9EFE0",
  },
  {
    id: "silk", nameTe: "🌸 రాయలసీమ కల్యాణం", nameEn: "🌸 Classic Silk",
    background: "bg-gradient-to-b from-[#FAF5FF] via-[#F3E8FF] to-[#E9D5FF]",
    border: "border-[#6B21A8]", ink: "text-[#4C1D95]", accent: "#6B21A8",
    canvasStart: "#FAF5FF", canvasMiddle: "#F3E8FF", canvasEnd: "#E9D5FF",
  },
];

const EMPTY_DETAILS: Details = {
  brideName: "", brideGothram: "", brideNative: "", brideMother: "", brideFather: "",
  groomName: "", groomGothram: "", groomNative: "", groomMother: "", groomFather: "",
  date: "", time: "", lagnam: "", star: "", venue: "", inviter: "",
};

const DEFAULT_SLOKA_TE = "వక్రతుండ మహాకాయ సూర్యకోటి సమప్రభ । నిర్విఘ్నం కురు మే దేవ సర్వకార్యేషు సర్వదా ॥";
const DEFAULT_SLOKA_EN = "Vakratunda Mahakaya Surya Koti Sama Prabha, Nirvighnam Kuru Me Deva Sarva Karyeshu Sarvada.";

const LABELS: Record<DetailKey, { te: string; en: string }> = {
  brideName: { te: "వధువు పేరు", en: "Bride's name" },
  brideGothram: { te: "గోత్రం", en: "Gotra" },
  brideNative: { te: "స్వస్థలం", en: "Hometown" },
  brideMother: { te: "తల్లి పేరు", en: "Mother's name" },
  brideFather: { te: "తండ్రి పేరు", en: "Father's name" },
  groomName: { te: "వరుడి పేరు", en: "Groom's name" },
  groomGothram: { te: "గోత్రం", en: "Gotra" },
  groomNative: { te: "స్వస్థలం", en: "Hometown" },
  groomMother: { te: "తల్లి పేరు", en: "Mother's name" },
  groomFather: { te: "తండ్రి పేరు", en: "Father's name" },
  date: { te: "ముహూర్తం తేదీ", en: "Wedding date" },
  time: { te: "సమయం", en: "Time" },
  lagnam: { te: "లగ్నం", en: "Lagnam" },
  star: { te: "నక్షత్రం", en: "Nakshatra" },
  venue: { te: "కల్యాణ వేదిక / చిరునామా", en: "Venue / address" },
  inviter: { te: "ఆహ్వానించేవారు", en: "Invited by" },
};

export default function LagnaPatrikaStudio() {
  const { lang } = useLang();
  const te = lang === "te";
  const [theme, setTheme] = useState<LagnaTheme>("gold");
  const [sloka, setSloka] = useState("");
  const [details, setDetails] = useState<Details>(EMPTY_DETAILS);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const currentTheme = THEMES.find((candidate) => candidate.id === theme) ?? THEMES[0];
  const slokaText = sloka.trim() || (te ? DEFAULT_SLOKA_TE : DEFAULT_SLOKA_EN);
  const siteUrl = `${SITE_CONFIG.siteUrl.replace(/\/$/, "")}/lagna-patrika`;
  const displayValue = (value: string) => value.trim() || "—";

  const shareText = [
    te ? "🪔 మన వివాహ • Mana Vivaha — శుభ లగ్న పత్రిక 🪔" : "🪔 Mana Vivaha (మన వివాహ) — Wedding Invitation 🪔",
    te ? "🙏 శ్రీరస్తు • శుభమస్తు • అవిఘ్నమస్తు" : "🙏 Sri Rastu • Shubhamastu • Avighnamastu",
    "",
    `${te ? "👰 వధువు" : "👰 Bride"}: ${displayValue(details.brideName)}${details.brideGothram.trim() ? ` (${te ? "గోత్రం" : "Gotra"}: ${details.brideGothram.trim()})` : ""}`,
    `${te ? "తల్లిదండ్రులు" : "Parents"}: ${[details.brideMother, details.brideFather].map((value) => value.trim()).filter(Boolean).join(" & ") || "—"}`,
    `${te ? "స్వస్థలం" : "Hometown"}: ${displayValue(details.brideNative)}`,
    "",
    `${te ? "🤵 వరుడు" : "🤵 Groom"}: ${displayValue(details.groomName)}${details.groomGothram.trim() ? ` (${te ? "గోత్రం" : "Gotra"}: ${details.groomGothram.trim()})` : ""}`,
    `${te ? "తల్లిదండ్రులు" : "Parents"}: ${[details.groomMother, details.groomFather].map((value) => value.trim()).filter(Boolean).join(" & ") || "—"}`,
    `${te ? "స్వస్థలం" : "Hometown"}: ${displayValue(details.groomNative)}`,
    "",
    `${te ? "🗓️ వివాహ తేదీ" : "🗓️ Wedding date"}: ${displayValue(details.date)}`,
    `${te ? "⏰ శుభ ముహూర్తం" : "⏰ Auspicious time"}: ${displayValue(details.time)}${details.lagnam.trim() ? ` (${details.lagnam.trim()})` : ""}`,
    `${te ? "🌟 నక్షత్రం" : "🌟 Nakshatra"}: ${displayValue(details.star)}`,
    `${te ? "🏛️ కల్యాణ వేదిక" : "🏛️ Venue"}: ${displayValue(details.venue)}`,
    "",
    te ? "✨ విచ్చేసి నూతన వధూవరులను ఆశీర్వదించగలరు." : "✨ Please join us and bless the couple.",
    `${te ? "ఆహ్వానించేవారు" : "Invited by"}: ${displayValue(details.inviter)}`,
    "",
    `${te ? "డిజిటల్ లగ్న పత్రిక" : "Create your digital invitation"}: ${siteUrl}`,
  ].join("\n");
  const waShareUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  const updateDetail = (key: DetailKey, value: string) => {
    setDetails((current) => ({ ...current, [key]: value }));
  };

  const field = (key: DetailKey, span = false) => {
    const label = te ? LABELS[key].te : LABELS[key].en;
    return (
      <label key={key} className={`block min-w-0 ${span ? "sm:col-span-2" : ""}`} htmlFor={`patrika-${key}`}>
        <span className="mb-1 block text-xs font-semibold text-gray-700">{label}</span>
        <input
          id={`patrika-${key}`}
          type="text"
          value={details[key]}
          onChange={(event) => updateDetail(key, event.target.value)}
          placeholder={label}
          autoComplete="off"
          className="w-full min-w-0 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-base outline-none transition focus:border-maroon focus:ring-2 focus:ring-maroon/15 sm:text-sm"
        />
      </label>
    );
  };

  const handleDownloadHD = () => {
    setDownloading(true);
    setDownloadError("");
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas is unavailable");
      canvas.width = 1080;
      canvas.height = 1620;

      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, currentTheme.canvasStart);
      gradient.addColorStop(0.5, currentTheme.canvasMiddle);
      gradient.addColorStop(1, currentTheme.canvasEnd);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = currentTheme.accent;
      ctx.lineWidth = 16;
      ctx.strokeRect(30, 30, canvas.width - 60, canvas.height - 60);
      ctx.lineWidth = 4;
      ctx.strokeRect(50, 50, canvas.width - 100, canvas.height - 100);

      const drawCentered = (text: string, y: number, font: string, color = "#222222") => {
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = font;
        ctx.fillStyle = color;
        ctx.fillText(text || "—", canvas.width / 2, y, 920);
      };
      const parentNames = (mother: string, father: string) => [mother, father].map((value) => value.trim()).filter(Boolean).join(" & ") || "—";
      const person = (role: string, name: string, gotra: string, mother: string, father: string, home: string, startY: number) => {
        drawCentered(role, startY, "bold 28px sans-serif", currentTheme.accent);
        drawCentered(displayValue(name), startY + 52, "bold 36px sans-serif");
        drawCentered(`${te ? "గోత్రం" : "Gotra"}: ${displayValue(gotra)}`, startY + 98, "25px sans-serif", "#555555");
        drawCentered(`${te ? "తల్లిదండ్రులు" : "Parents"}: ${parentNames(mother, father)}`, startY + 138, "23px sans-serif", "#555555");
        drawCentered(`${te ? "స్వస్థలం" : "Hometown"}: ${displayValue(home)}`, startY + 178, "23px sans-serif", "#555555");
      };

      drawCentered(te ? "॥ శ్రీరస్తు • శుభమస్తు • అవిఘ్నమస్తు ॥" : "Sri Rastu • Shubhamastu • Avighnamastu", 100, "bold 32px sans-serif", currentTheme.accent);
      drawCentered(slokaText, 160, "italic 22px sans-serif", "#555555");
      drawCentered(te ? "🪔 శుభ లగ్న పత్రిక 🪔" : "🪔 Auspicious Wedding Invitation 🪔", 245, "bold 42px sans-serif", currentTheme.accent);

      person(te ? "👰 వధువు" : "👰 Bride", details.brideName, details.brideGothram, details.brideMother, details.brideFather, details.brideNative, 325);
      person(te ? "🤵 వరుడు" : "🤵 Groom", details.groomName, details.groomGothram, details.groomMother, details.groomFather, details.groomNative, 565);

      ctx.fillStyle = "rgba(255, 255, 255, 0.72)";
      ctx.fillRect(100, 790, canvas.width - 200, 500);
      ctx.strokeStyle = currentTheme.accent;
      ctx.lineWidth = 2;
      ctx.strokeRect(100, 790, canvas.width - 200, 500);
      drawCentered(te ? "🗓️ శుభ ముహూర్త వివరాలు" : "🗓️ Wedding Ceremony Details", 845, "bold 30px sans-serif", currentTheme.accent);
      drawCentered(`${te ? "తేదీ" : "Date"}: ${displayValue(details.date)}`, 910, "26px sans-serif");
      drawCentered(`${te ? "సమయం" : "Time"}: ${displayValue(details.time)}`, 970, "26px sans-serif");
      drawCentered(`${te ? "లగ్నం" : "Lagnam"}: ${displayValue(details.lagnam)}`, 1030, "26px sans-serif");
      drawCentered(`${te ? "నక్షత్రం" : "Nakshatra"}: ${displayValue(details.star)}`, 1090, "26px sans-serif");
      drawCentered(`${te ? "వేదిక" : "Venue"}: ${displayValue(details.venue)}`, 1160, "24px sans-serif");
      drawCentered(`${te ? "ఆహ్వానించేవారు" : "Invited by"}: ${displayValue(details.inviter)}`, 1370, "bold 23px sans-serif", "#444444");
      drawCentered(te ? "మన వివాహ • Mana Vivaha • తెలుగు మ్యాట్రిమోనీ" : "Mana Vivaha (మన వివాహ) • Telugu Matrimony", 1515, "bold 22px sans-serif", currentTheme.accent);
      drawCentered(SITE_CONFIG.domain, 1555, "20px sans-serif", "#555555");

      const slug = `${details.groomName}-${details.brideName}`
        .trim()
        .replace(/\s+/g, "_")
        .replace(/[^\p{L}\p{N}_-]/gu, "")
        .replace(/^[-_]+|[-_]+$/g, "");
      const link = document.createElement("a");
      link.download = `Lagna_Patrika${slug ? `_${slug}` : ""}.jpg`;
      link.href = canvas.toDataURL("image/jpeg", 0.95);
      link.click();
    } catch (error) {
      console.error("Lagna Patrika download failed:", error);
      setDownloadError(te ? "కార్డ్ డౌన్‌లోడ్ కాలేదు. మళ్లీ ప్రయత్నించండి." : "The card could not be downloaded. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const groupHeading = (icon: string, title: string) => (
    <h3 className="flex items-center gap-2 text-sm font-extrabold text-gray-900">{icon} {title}</h3>
  );

  const previewPerson = (
    role: string,
    name: string,
    gotra: string,
    mother: string,
    father: string,
    home: string,
    tint: "rose" | "amber",
  ) => (
    <section className="min-w-0 rounded-2xl border border-gold/30 bg-white/75 p-4 text-left shadow-sm" aria-label={role}>
      <h4 className={`mb-2 text-xs font-bold uppercase tracking-wider ${tint === "rose" ? "text-rose-800" : "text-amber-800"}`}>{role}</h4>
      <p className="break-words text-lg font-extrabold text-gray-900">{displayValue(name)}</p>
      <dl className="mt-2 space-y-1.5 text-sm text-gray-700">
        <div className="flex flex-wrap gap-x-1"><dt className="font-semibold">{te ? "గోత్రం:" : "Gotra:"}</dt><dd className="min-w-0 break-words">{displayValue(gotra)}</dd></div>
        <div className="flex flex-wrap gap-x-1"><dt className="font-semibold">{te ? "తల్లిదండ్రులు:" : "Parents:"}</dt><dd className="min-w-0 break-words">{[mother, father].map((value) => value.trim()).filter(Boolean).join(" & ") || "—"}</dd></div>
        <div className="flex flex-wrap gap-x-1"><dt className="font-semibold">{te ? "స్వస్థలం:" : "Hometown:"}</dt><dd className="min-w-0 break-words">{displayValue(home)}</dd></div>
      </dl>
    </section>
  );

  return (
    <main className="min-h-dvh bg-[#FDFBF7] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 text-center">
          <div className="mb-3 inline-flex max-w-full items-center gap-2 rounded-full border border-gold/40 bg-gold/15 px-4 py-2 text-xs font-bold text-maroon">
            🪔 {te ? "ఉచిత తెలుగు డిజిటల్ లగ్న పత్రిక స్టూడియో" : "Free Telugu Wedding Invitation Studio"}
          </div>
          <h1 className="text-3xl font-extrabold text-maroon sm:text-4xl">
            {te ? "💍 శుభ లగ్న పత్రిక జనరేటర్" : "💍 Telugu Lagna Patrika Studio"}
          </h1>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-gray-700">
            {te
              ? "వధూవరులు, ముహూర్తం, వేదిక వివరాలతో సాంప్రదాయ లగ్న పత్రికను రూపొందించి WhatsAppలో పంచుకోండి లేదా HD కార్డ్‌గా డౌన్‌లోడ్ చేసుకోండి."
              : "Create a traditional Telugu wedding invitation with your ceremony details, then share it on WhatsApp or download a high-resolution card."}
          </p>
        </header>

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12 lg:gap-8">
          <section className="min-w-0 space-y-6 rounded-3xl border border-gold/30 bg-white p-5 shadow-xl sm:p-6 lg:col-span-5" aria-labelledby="patrika-editor-title">
            <h2 id="patrika-editor-title" className="flex items-center gap-2 border-b border-gray-100 pb-3 text-lg font-bold text-maroon">
              <span aria-hidden="true">✍️</span>{te ? "ఆహ్వాన వివరాలు" : "Invitation details"}
            </h2>

            <fieldset>
              <legend className="mb-2 text-xs font-bold uppercase text-gray-700">🎨 {te ? "థీమ్ ఎంచుకోండి" : "Choose a theme"}</legend>
              <div className="grid grid-cols-2 gap-2">
                {THEMES.map((candidate) => (
                  <button
                    key={candidate.id}
                    type="button"
                    onClick={() => setTheme(candidate.id)}
                    aria-pressed={theme === candidate.id}
                    className={`min-h-11 rounded-xl border px-3 py-2 text-left text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon focus-visible:ring-offset-2 ${theme === candidate.id ? "border-maroon bg-maroon/10 text-maroon shadow-sm" : "border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100"}`}
                  >
                    {te ? candidate.nameTe : candidate.nameEn}
                  </button>
                ))}
              </div>
            </fieldset>

            <label className="block">
              <span className="mb-1 block text-xs font-bold text-gray-700">🪔 {te ? "ప్రార్థనా శ్లోకం" : "Invocation"}</span>
              <textarea
                rows={2}
                value={sloka}
                onChange={(event) => setSloka(event.target.value)}
                placeholder={te ? DEFAULT_SLOKA_TE : DEFAULT_SLOKA_EN}
                className="w-full resize-y rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-base outline-none transition focus:border-maroon focus:ring-2 focus:ring-maroon/15 sm:text-sm"
              />
            </label>

            <fieldset className="space-y-3 rounded-2xl border border-rose-200/70 bg-rose-50/60 p-4">
              <legend className="px-1 text-sm font-extrabold text-rose-900">👰 {te ? "వధువు వివరాలు" : "Bride details"}</legend>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {field("brideName", true)}{field("brideGothram")}{field("brideNative")}{field("brideMother")}{field("brideFather")}
              </div>
            </fieldset>

            <fieldset className="space-y-3 rounded-2xl border border-amber-200/70 bg-amber-50/60 p-4">
              <legend className="px-1 text-sm font-extrabold text-amber-900">🤵 {te ? "వరుడి వివరాలు" : "Groom details"}</legend>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {field("groomName", true)}{field("groomGothram")}{field("groomNative")}{field("groomMother")}{field("groomFather")}
              </div>
            </fieldset>

            <fieldset className="space-y-3 rounded-2xl border border-emerald-200/70 bg-emerald-50/60 p-4">
              <legend className="px-1 text-sm font-extrabold text-emerald-900">🗓️ {te ? "ముహూర్తం & వేదిక" : "Muhurtham & venue"}</legend>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {field("date", true)}{field("time")}{field("lagnam")}{field("star", true)}{field("venue", true)}{field("inviter", true)}
              </div>
            </fieldset>
            <p className="text-xs leading-relaxed text-gray-500">
              {te ? "మీరు నమోదు చేసిన వివరాలు అలాగే ఉపయోగించబడతాయి; నమూనా పేర్లు లేదా తేదీలు ముందుగా నింపబడవు." : "Your details are used exactly as entered. No sample names or dates are prefilled."}
            </p>
          </section>

          <section className="min-w-0 space-y-4 lg:col-span-7" aria-labelledby="patrika-preview-title">
            <div className="flex flex-col gap-3 rounded-2xl border border-gold/30 bg-white p-4 shadow-md sm:flex-row sm:items-center sm:justify-between">
              <h2 id="patrika-preview-title" className="text-sm font-bold text-gray-800">✨ {te ? "లైవ్ ప్రివ్యూ & డౌన్‌లోడ్" : "Live preview & actions"}</h2>
              <div className="flex flex-col gap-2 sm:flex-row">
                <a
                  href={waShareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={te ? "WhatsAppలో ఆహ్వానాన్ని పంచుకోండి" : "Share invitation on WhatsApp"}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#25D366] px-4 py-2 text-sm font-bold text-white shadow-md transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700 focus-visible:ring-offset-2 active:scale-[.98]"
                >
                  <WhatsAppIcon className="h-4 w-4" mono />
                  <span>{te ? "WhatsApp ఆహ్వానం" : "WhatsApp invitation"}</span>
                </a>
                <button
                  type="button"
                  onClick={handleDownloadHD}
                  disabled={downloading}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-maroon px-4 py-2 text-sm font-bold text-white shadow-md transition hover:bg-maroon-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon focus-visible:ring-offset-2 active:scale-[.98] disabled:cursor-wait disabled:opacity-60"
                >
                  <span aria-hidden="true">{downloading ? "⏳" : "📥"}</span>
                  <span>{downloading ? (te ? "తయారవుతోంది…" : "Preparing…") : (te ? "HD కార్డ్ డౌన్‌లోడ్" : "Download HD card")}</span>
                </button>
              </div>
            </div>
            {downloadError && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{downloadError}</p>}

            <article className={`relative min-w-0 overflow-hidden rounded-3xl border-4 ${currentTheme.border} ${currentTheme.background} p-5 text-center shadow-2xl sm:p-8`}>
              <div className={`pointer-events-none absolute inset-2 rounded-2xl border-2 ${currentTheme.border} opacity-40 sm:inset-3`} aria-hidden="true" />
              <div className="relative space-y-5">
                <header className="space-y-2">
                  <p className={`text-sm font-bold sm:text-base ${currentTheme.ink}`}>
                    {te ? "॥ శ్రీరస్తు • శుభమస్తు • అవిఘ్నమస్తు ॥" : "Sri Rastu • Shubhamastu • Avighnamastu"}
                  </p>
                  <p className="mx-auto max-w-2xl break-words text-xs italic leading-relaxed text-gray-700 sm:text-sm">{slokaText}</p>
                </header>
                <h3 className={`inline-flex max-w-full items-center justify-center rounded-full border border-gold/40 bg-white/80 px-4 py-2 text-xl font-extrabold shadow-md sm:px-8 sm:text-2xl ${currentTheme.ink}`}>
                  🪔 {te ? "శుభ లగ్న పత్రిక" : "Wedding Invitation"} 🪔
                </h3>
                <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                  {previewPerson(te ? "👰 వధువు" : "👰 Bride", details.brideName, details.brideGothram, details.brideMother, details.brideFather, details.brideNative, "rose")}
                  {previewPerson(te ? "🤵 వరుడు" : "🤵 Groom", details.groomName, details.groomGothram, details.groomMother, details.groomFather, details.groomNative, "amber")}
                </div>
                <section className="rounded-2xl border border-gold/40 bg-white/85 p-4 text-center shadow-md sm:p-5">
                  <h4 className={`text-sm font-bold uppercase tracking-wide ${currentTheme.ink}`}>
                    💍 {te ? "శుభ ముహూర్త వివరాలు" : "Ceremony details"}
                  </h4>
                  <p className="mt-2 break-words text-base font-extrabold text-maroon sm:text-lg">{displayValue(details.date)}</p>
                  <p className="break-words text-sm font-semibold text-gray-800">
                    {displayValue(details.time)}{details.lagnam.trim() ? ` · ${te ? "లగ్నం" : "Lagnam"}: ${details.lagnam}` : ""}
                  </p>
                  <p className="mt-1 break-words text-sm text-gray-700"><span className="font-semibold">{te ? "నక్షత్రం:" : "Nakshatra:"}</span> {displayValue(details.star)}</p>
                  <p className="mt-3 break-words border-t border-gray-200 pt-3 text-sm text-gray-700">
                    🏛️ <span className="font-semibold">{te ? "కల్యాణ వేదిక:" : "Venue:"}</span> {displayValue(details.venue)}
                  </p>
                </section>
                <p className="break-words text-sm text-gray-700">
                  <span className="font-semibold">{te ? "ఆహ్వానించేవారు:" : "Invited by:"}</span> {displayValue(details.inviter)}
                </p>
                <footer className="break-words text-xs font-bold tracking-wide text-gray-700">
                  {te ? "మన వివాహ • Mana Vivaha • తెలుగు మ్యాట్రిమోనీ" : "Mana Vivaha (మన వివాహ) • Telugu Matrimony"} | {SITE_CONFIG.domain}
                </footer>
              </div>
            </article>
          </section>
        </div>
      </div>
    </main>
  );
}
