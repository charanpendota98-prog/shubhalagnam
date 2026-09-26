"use client";

/**
 * 🎴 MANA VIVAHA — 1-MINUTE FREE TELUGU MARRIAGE BIODATA HD JPG STUDIO
 * ====================================================================
 * • 4 Regal Auspicious Themes (Royal Velvet Maroon 🪔, Temple Gold 🦚, Divine Rose 🌸, Imperial Navy 💎)
 * • 1-Click Auto-Fill from Profile ID (e.g., MV2001, MV2002)
 * • Complete Telugu + English Details: Personal, Vedic Horoscope, Career, Family Lineage & Assets
 * • Instant Scannable QR Code linking to live profile
 * • 1-Click High-Definition JPG Download (Pixel-Perfect 2x/3x Resolution)
 * • Auspicious Trojan Horse Growth Loop for viral WhatsApp sharing
 */

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { toJpeg, toPng } from "html-to-image";
import QRCode from "qrcode";
import { useLang } from "@/lib/lang";
import { SITE_CONFIG } from "@/lib/site-config";
import { WhatsAppIcon } from "@/components/BrandIcons";

const RELIGION_HEADERS: Record<string, string[]> = {
  Hindu: [
    "|| శ్రీరస్తు — శుభమస్తు — అవిఘ్నమస్తు ||",
    "|| ఓం శ్రీ లక్ష్మీ వేంకటేశ్వరాయ నమః ||",
    "|| శ్రీ సీతారామాభ్యాం నమః ||",
    "|| శ్రీ విఘ్నేశ్వరాయ నమః ||",
  ],
  Muslim: [
    "|| بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ (Bismillahir Rahmanir Raheem) ||",
    "|| In the Name of Allah, Most Gracious, Most Merciful ||",
    "|| Nikah Mubarak — Blessed Muslim Matrimony ||",
  ],
  Christian: [
    "|| In the Name of Jesus Christ (యేసుక్రీస్తు నామమున) ||",
    "|| Blessed Christian Holy Matrimony ||",
    "|| Grace, Peace & Love in Christ Jesus ||",
  ],
  Other: [
    "|| Auspicious Holy Matrimony ||",
    "|| Sacred Life Partnership ||",
  ],
};

const THEMES = [
  {
    id: "maroon",
    name: "రాయల్ వెల్వెట్ మెరూన్ (Royal Velvet Maroon)",
    border: "border-[#7A0C2E]",
    canvasBg: "bg-[#FFFDF7]",
    headerBg: "bg-gradient-to-r from-[#59041E] via-[#7A0C2E] to-[#59041E] text-white",
    accent: "text-[#7A0C2E]",
    subAccent: "text-[#B8860B]",
    divider: "border-[#7A0C2E]/20",
    pill: "bg-[#7A0C2E]/10 text-[#7A0C2E] border-[#7A0C2E]/30",
    badgeBg: "bg-[#7A0C2E] text-white",
    frameBorder: "border-[#7A0C2E]",
    goldRing: "ring-[#D4AF37]",
  },
  {
    id: "gold",
    name: "తిరుమల టెంపుల్ గోల్డ్ (Tirumala Temple Gold)",
    border: "border-[#B8860B]",
    canvasBg: "bg-[#FFFDF2]",
    headerBg: "bg-gradient-to-r from-[#8B6508] via-[#B8860B] to-[#8B6508] text-white",
    accent: "text-[#8B6508]",
    subAccent: "text-[#7A0C2E]",
    divider: "border-[#B8860B]/25",
    pill: "bg-[#B8860B]/15 text-[#8B6508] border-[#B8860B]/35",
    badgeBg: "bg-[#B8860B] text-white",
    frameBorder: "border-[#B8860B]",
    goldRing: "ring-[#B8860B]",
  },
  {
    id: "rose",
    name: "కళ్యాణ గులాబీ సిల్క్ (Divine Silk Rose Gold)",
    border: "border-[#A83258]",
    canvasBg: "bg-[#FFF5F8]",
    headerBg: "bg-gradient-to-r from-[#7A1D3B] via-[#A83258] to-[#7A1D3B] text-white",
    accent: "text-[#A83258]",
    subAccent: "text-[#7A0C2E]",
    divider: "border-[#A83258]/20",
    pill: "bg-[#A83258]/10 text-[#A83258] border-[#A83258]/30",
    badgeBg: "bg-[#A83258] text-white",
    frameBorder: "border-[#A83258]",
    goldRing: "ring-[#D4AF37]",
  },
  {
    id: "navy",
    name: "ఇంపీరియల్ రాయల్ నేవీ (Imperial Executive Navy)",
    border: "border-[#0F1F3C]",
    canvasBg: "bg-[#F4F7FC]",
    headerBg: "bg-gradient-to-r from-[#0A1528] via-[#0F1F3C] to-[#0A1528] text-white",
    accent: "text-[#0F1F3C]",
    subAccent: "text-[#B8860B]",
    divider: "border-[#0F1F3C]/20",
    pill: "bg-[#0F1F3C]/10 text-[#0F1F3C] border-[#0F1F3C]/30",
    badgeBg: "bg-[#0F1F3C] text-white",
    frameBorder: "border-[#0F1F3C]",
    goldRing: "ring-[#D4AF37]",
  },
];

export default function BiodataPage() {
  const { lang } = useLang();
  const te = lang === "te";

  const [religion, setReligion] = useState<"Hindu" | "Muslim" | "Christian" | "Other">("Hindu");
  const [headerText, setHeaderText] = useState(RELIGION_HEADERS.Hindu[0]);
  const [selectedTheme, setSelectedTheme] = useState(THEMES[0]);
  const [profileId, setProfileId] = useState("MV2001");
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");

  const canvasRef = useRef<HTMLDivElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Form Data
  const [data, setData] = useState({
    title: "వివాహ బయోడేటా (MARRIAGE BIODATA)",
    fullName: "లక్ష్మి ప్రసన్న రెడ్డి (Lakshmi Prasanna)",
    gender: "Bride",
    maritalStatus: "Never Married",
    isSecondMarriage: false,
    dob: "14 May 1998",
    tob: "07:30 AM",
    height: "5' 4\" (162 cm)",
    complexion: "Fair (చామన ఛాయ)",
    motherTongue: "Telugu (తెలుగు)",
    caste: "Reddy",
    subCaste: "Motati (మోటాటి)",
    // Astrological fields
    gothram: "Janakula (జనకుల)",
    star: "Swathi (స్వాతి)",
    rasi: "Tula / Libra (తులా రాశి)",
    lagnam: "Kanya (కన్యా లగ్నం)",
    dosham: "No (దోషం లేదు)",
    // Career & Education
    education: "B.Tech in Computer Science (CSE)",
    educationDetail: "Osmania University, Hyderabad",
    job: "Senior Software Engineer",
    company: "TCS / Infosys",
    salary: "₹15,00,000 / annum (15 LPA)",
    workLocation: "Hyderabad, Telangana",
    // Family Lineage & Assets
    fatherName: "శ్రీనివాస రెడ్డి (Srinivasa Reddy)",
    fatherOccupation: "Govt Employee (Retd)",
    motherName: "సుజాత (Sujatha)",
    motherOccupation: "Home Maker (గృహిణి)",
    siblings: "1 తమ్ముడు (Software Engineer - Unmarried)",
    nativePlace: "వరంగల్ / హైదరాబాద్ (Warangal / Hyd)",
    properties: "సొంత ఇల్లు (Hyderabad) + 5 ఎకరాల వ్యవసాయ భూమి",
    familyValues: "సాంప్రదాయ & ఉన్నత విలువలు గల కుటుంబం",
    // Contact
    contactPerson: "తండ్రి గారి నంబర్ (Father's Contact)",
    phone: "98490XXXXX",
    email: "srinivasa.reddy@gmail.com",
    address: "ఫ్లాట్ 302, శ్రీ బాలాజీ రెసిడెన్సీ, కూకట్‌పల్లి, హైదరాబాద్ - 500072",
    photoUrl: "/promo/bride-card.jpg",
  });

  // Generate QR code for viral loop
  useEffect(() => {
    const targetUrl = `https://manavivaha.in/search/${profileId || "MV2001"}`;
    QRCode.toDataURL(targetUrl, {
      width: 140,
      margin: 1,
      color: {
        dark: "#7A0C2E",
        light: "#FFFFFF",
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch(() => {});
  }, [profileId]);

  // Handle Religion Change
  const handleReligionChange = (r: "Hindu" | "Muslim" | "Christian" | "Other") => {
    setReligion(r);
    const headers = RELIGION_HEADERS[r] || RELIGION_HEADERS.Hindu;
    setHeaderText(headers[0]);
    if (r === "Muslim") {
      setData((prev) => ({
        ...prev,
        title: "నికాహ్ బయోడేటా (NIKAH BIODATA)",
        caste: "Muslim",
        subCaste: "Sheikh",
      }));
    } else if (r === "Christian") {
      setData((prev) => ({
        ...prev,
        title: "CHRISTIAN MATRIMONIAL BIODATA",
        caste: "Christian",
        subCaste: "Roman Catholic",
      }));
    } else {
      setData((prev) => ({
        ...prev,
        title: "వివాహ బయోడేటా (MARRIAGE BIODATA)",
        caste: "Reddy",
        subCaste: "Motati",
      }));
    }
  };

  // Pre-fill from Profile ID
  const fetchProfile = async (id: string) => {
    const cleanId = id.trim().toUpperCase();
    if (!cleanId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/search/${cleanId}`);
      if (res.ok) {
        const json = await res.json();
        const p = json.profile || json;
        if (p && p.full_name) {
          const mStatus = p.marital_status || "Never Married";
          const isRemarriage =
            mStatus.toLowerCase().includes("divorced") ||
            mStatus.toLowerCase().includes("widow") ||
            mStatus.toLowerCase().includes("remarriage") ||
            mStatus.toLowerCase().includes("second");

          const pRel = p.religion === "Muslim" ? "Muslim" : p.religion === "Christian" ? "Christian" : "Hindu";
          setReligion(pRel);
          const headers = RELIGION_HEADERS[pRel] || RELIGION_HEADERS.Hindu;
          setHeaderText(headers[0]);

          setData((prev) => ({
            ...prev,
            title: isRemarriage
              ? "పునర్వివాహ బయోడేటా (SECOND MARRIAGE BIODATA)"
              : pRel === "Muslim"
              ? "నికాహ్ బయోడేటా (NIKAH BIODATA)"
              : pRel === "Christian"
              ? "CHRISTIAN MATRIMONIAL BIODATA"
              : "వివాహ బయోడేటా (MARRIAGE BIODATA)",
            fullName: p.full_name || prev.fullName,
            gender: p.gender || prev.gender,
            maritalStatus: mStatus,
            isSecondMarriage: isRemarriage,
            dob: p.dob || prev.dob,
            height: p.height || prev.height,
            caste: p.caste || prev.caste,
            subCaste: p.sub_caste || prev.subCaste,
            gothram: p.gothram || prev.gothram,
            star: p.star || prev.star,
            rasi: p.rasi || prev.rasi,
            education: p.education || prev.education,
            educationDetail: p.education_detail || prev.educationDetail,
            job: p.job || prev.job,
            company: p.company || prev.company,
            salary: p.salary || prev.salary,
            workLocation: p.work_location || `${p.district || "Hyderabad"}, ${p.state || "TS"}`,
            nativePlace: `${p.district || "Hyderabad"}, ${p.state || "Telangana"}`,
            photoUrl: p.photo_url || prev.photoUrl,
          }));
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Custom Photo Upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setData((prev) => ({ ...prev, photoUrl: url }));
    }
  };

  // 1-Click High Definition JPG Generator
  const downloadHDJpg = async () => {
    if (!canvasRef.current) return;
    setDownloading(true);
    try {
      const dataUrl = await toJpeg(canvasRef.current, {
        quality: 0.96,
        pixelRatio: 2.5, // Ultra-sharp 2.5x HD resolution for print & WhatsApp
        backgroundColor: "#FFFFFF",
      });
      const link = document.createElement("a");
      link.download = `${data.fullName.replace(/\s+/g, "_")}_ManaVivaha_Biodata.jpg`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Error generating JPG biodata:", err);
      alert("ఫోటో డౌన్‌లోడ్ చేయడంలో సమస్య ఏర్పడింది. దయచేసి ప్రింట్ ఆప్షన్ ఉపయోగించండి.");
    }
    setDownloading(false);
  };

  // Share on WhatsApp
  const shareOnWhatsApp = () => {
    const text =
      `🙏 *|| శ్రీరస్తు — శుభమస్తు — అవిఘ్నమస్తు ||*\n` +
      `👑 *మన వివాహ (Mana Vivaha) — తెలుగు వివాహ బయోడేటా*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `👤 *పేరు:* ${data.fullName} (${data.height})\n` +
      `💍 *వైవాహిక స్థితి:* ${data.maritalStatus}\n` +
      `💍 *కులం & గోత్రం:* ${data.caste} ${data.subCaste ? `(${data.subCaste})` : ""} | గోత్రం: ${data.gothram}\n` +
      `⭐ *జ్యోతిషం:* నక్షత్రం: ${data.star} · రాశి: ${data.rasi}\n` +
      `🎓 *విద్యార్హత:* ${data.education}\n` +
      `💼 *ఉద్యోగం:* ${data.job} (${data.company})\n` +
      `💰 *వార్షిక ఆదాయం:* ${data.salary}\n` +
      `📍 *నివాసం:* ${data.workLocation}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `👨‍👩‍👧 *కుటుంబ వివరాలు:*\n` +
      `• తండ్రి: ${data.fatherName} (${data.fatherOccupation})\n` +
      `• తల్లి: ${data.motherName} (${data.motherOccupation})\n` +
      `• తోబుట్టువులు: ${data.siblings}\n` +
      `• సొంత ఊరు: ${data.nativePlace}\n` +
      `• ఆస్తులు: ${data.properties}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🔍 *ఈ ప్రొఫైల్ యొక్క పూర్తి వివరాలు & ధృవీకరణ కొరకు:*\n` +
      `👉 https://manavivaha.in/search/${profileId || "MV2001"}\n\n` +
      `📞 *అధికారిక వాట్సాప్ హెల్ప్‌లైన్:* +91 6304996088`;

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] py-6 sm:py-10 px-3 sm:px-6 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* ================= TOP STUDIO CONTROLS (NO PRINT) ================= */}
        <div className="bg-white rounded-3xl p-5 sm:p-7 shadow-md border border-gold/40 space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <div className="inline-flex items-center gap-2 bg-amber-50 border border-gold/40 rounded-full px-3 py-1 text-xs font-bold text-maroon mb-1.5">
                <span>🎴</span> <span>మన వివాహ రాయల్ తెలుగు బయోడేటా HD స్టూడియో</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-navy telugu">
                1-నిమిషంలో ఉచిత తెలుగు వివాహ బయోడేటా HD JPG మేకర్
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                సంప్రదాయ వినాయక శ్లోకం, జాతకం, నక్షత్రం, గోత్రం, కుటుంబ వివరాలతో కూడిన రాయల్ HD JPG బయోడేటాను డౌన్‌లోడ్ చేయండి.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setIsEditing(!isEditing)}
                className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition border ${
                  isEditing ? "bg-amber-100 border-amber-300 text-amber-900 shadow-xs" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                ✏️ {isEditing ? "👁️ ప్రివ్యూ మోడ్" : "✏️ వివరాలు సవరించండి"}
              </button>

              <button
                type="button"
                onClick={downloadHDJpg}
                disabled={downloading}
                className="px-5 py-2.5 rounded-2xl gold-gradient text-maroon font-black text-xs sm:text-sm shadow-md hover:brightness-105 transition flex items-center gap-2 disabled:opacity-50"
              >
                {downloading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-maroon border-t-transparent rounded-full animate-spin" />
                    <span>JPG తయారవుతోంది…</span>
                  </>
                ) : (
                  <>
                    <span>📸</span>
                    <span>HD JPG డౌన్‌లోడ్</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={shareOnWhatsApp}
                className="px-5 py-2.5 rounded-2xl bg-[#25D366] text-white font-black text-xs sm:text-sm hover:brightness-105 transition shadow-md flex items-center gap-2"
              >
                <WhatsAppIcon className="w-4 h-4 fill-white" />
                <span>WhatsApp లో షేర్</span>
              </button>
            </div>
          </div>

          {/* Quick Toolbar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ⚡ ప్రొఫైల్ ఐడీ తో ఆటో-ఫిల్ (Profile ID):
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="ఉదా: MV2001"
                  value={profileId}
                  onChange={(e) => setProfileId(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold focus:border-maroon outline-none uppercase"
                />
                <button
                  type="button"
                  onClick={() => fetchProfile(profileId)}
                  disabled={loading}
                  className="px-3.5 py-2 rounded-xl maroon-gradient text-white font-bold text-xs hover:brightness-105 transition shrink-0"
                >
                  {loading ? "..." : "నింపు"}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                🎨 రాయల్ థీమ్ ఎంపిక (Regal Theme):
              </label>
              <select
                value={selectedTheme.id}
                onChange={(e) => setSelectedTheme(THEMES.find((t) => t.id === e.target.value) || THEMES[0])}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:border-maroon outline-none bg-white"
              >
                {THEMES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                🕉️ సంప్రదాయ శ్లోకం (Auspicious Header):
              </label>
              <select
                value={headerText}
                onChange={(e) => setHeaderText(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:border-maroon outline-none bg-white"
              >
                {(RELIGION_HEADERS[religion] || RELIGION_HEADERS.Hindu).map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                📷 ఫోటో మార్చండి (Custom Photo):
              </label>
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 text-xs font-bold text-center"
              >
                📁 ఫోటో అప్‌లోడ్ చేయండి
              </button>
              <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            </div>
          </div>
        </div>

        {/* ================= EDIT FORM ACCORDION (WHEN EDITING) ================= */}
        {isEditing && (
          <div className="bg-white rounded-3xl p-5 sm:p-7 shadow-md border border-gold/40 space-y-4 animate-fade">
            <h2 className="text-base font-black text-maroon border-b border-slate-100 pb-2">
              📝 బయోడేటా వివరాలను సవరించండి (Edit Biodata Fields)
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">పూర్తి పేరు (Full Name):</label>
                <input
                  type="text"
                  value={data.fullName}
                  onChange={(e) => setData({ ...data, fullName: e.target.value })}
                  className="w-full p-2 border rounded-xl"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">పుట్టిన తేదీ (DOB):</label>
                <input
                  type="text"
                  value={data.dob}
                  onChange={(e) => setData({ ...data, dob: e.target.value })}
                  className="w-full p-2 border rounded-xl"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">పుట్టిన సమయం (Birth Time):</label>
                <input
                  type="text"
                  value={data.tob}
                  onChange={(e) => setData({ ...data, tob: e.target.value })}
                  className="w-full p-2 border rounded-xl"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">ఎత్తు (Height):</label>
                <input
                  type="text"
                  value={data.height}
                  onChange={(e) => setData({ ...data, height: e.target.value })}
                  className="w-full p-2 border rounded-xl"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">కులం (Caste):</label>
                <input
                  type="text"
                  value={data.caste}
                  onChange={(e) => setData({ ...data, caste: e.target.value })}
                  className="w-full p-2 border rounded-xl"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">ఉపకులం (Sub-caste):</label>
                <input
                  type="text"
                  value={data.subCaste}
                  onChange={(e) => setData({ ...data, subCaste: e.target.value })}
                  className="w-full p-2 border rounded-xl"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">గోత్రం (Gothram):</label>
                <input
                  type="text"
                  value={data.gothram}
                  onChange={(e) => setData({ ...data, gothram: e.target.value })}
                  className="w-full p-2 border rounded-xl"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">నక్షత్రం (Nakshatram):</label>
                <input
                  type="text"
                  value={data.star}
                  onChange={(e) => setData({ ...data, star: e.target.value })}
                  className="w-full p-2 border rounded-xl"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">రాశి (Raasi):</label>
                <input
                  type="text"
                  value={data.rasi}
                  onChange={(e) => setData({ ...data, rasi: e.target.value })}
                  className="w-full p-2 border rounded-xl"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">చదువు (Education):</label>
                <input
                  type="text"
                  value={data.education}
                  onChange={(e) => setData({ ...data, education: e.target.value })}
                  className="w-full p-2 border rounded-xl"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">ఉద్యోగం (Job Designation):</label>
                <input
                  type="text"
                  value={data.job}
                  onChange={(e) => setData({ ...data, job: e.target.value })}
                  className="w-full p-2 border rounded-xl"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">వార్షిక వేతనం (Annual Salary):</label>
                <input
                  type="text"
                  value={data.salary}
                  onChange={(e) => setData({ ...data, salary: e.target.value })}
                  className="w-full p-2 border rounded-xl"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">తండ్రి పేరు & వృత్తి:</label>
                <input
                  type="text"
                  value={data.fatherName}
                  onChange={(e) => setData({ ...data, fatherName: e.target.value })}
                  className="w-full p-2 border rounded-xl"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">తల్లి పేరు & వృత్తి:</label>
                <input
                  type="text"
                  value={data.motherName}
                  onChange={(e) => setData({ ...data, motherName: e.target.value })}
                  className="w-full p-2 border rounded-xl"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">సంప్రదించవలసిన ఫోన్ నంబర్:</label>
                <input
                  type="text"
                  value={data.phone}
                  onChange={(e) => setData({ ...data, phone: e.target.value })}
                  className="w-full p-2 border rounded-xl"
                />
              </div>
            </div>
          </div>
        )}

        {/* ================= BIODATA CANVAS (PIXEL-PERFECT HD JPG TARGET) ================= */}
        <div className="overflow-x-auto pb-4">
          <div
            ref={canvasRef}
            id="biodata-canvas"
            className={`w-[800px] min-w-[800px] mx-auto rounded-3xl ${selectedTheme.canvasBg} border-4 ${selectedTheme.border} p-8 shadow-2xl text-slate-900 transition-all space-y-6 relative overflow-hidden`}
          >
            {/* Auspicious Watermark Background Motifs */}
            <div className="absolute top-0 left-0 w-32 h-32 opacity-10 pointer-events-none text-8xl">🪔</div>
            <div className="absolute top-0 right-0 w-32 h-32 opacity-10 pointer-events-none text-8xl">🌸</div>
            <div className="absolute bottom-16 left-0 w-32 h-32 opacity-10 pointer-events-none text-8xl">⚜️</div>
            <div className="absolute bottom-16 right-0 w-32 h-32 opacity-10 pointer-events-none text-8xl">🦚</div>

            {/* 1. Auspicious Top Header Banner */}
            <div className="text-center pb-4 border-b-2 border-dashed border-amber-300">
              <div className="flex items-center justify-center gap-2 mb-1">
                <span className="text-2xl">🙏</span>
                <span className="text-sm font-bold tracking-widest text-amber-900 telugu">{headerText}</span>
                <span className="text-2xl">🙏</span>
              </div>

              {/* Title Badge */}
              <div className="inline-block mt-1 px-8 py-2 rounded-full ${selectedTheme.headerBg} shadow-sm font-black text-sm tracking-wider uppercase">
                {data.title}
              </div>
            </div>

            {/* 2. Photo & Key Identity Strip */}
            <div className="flex items-center gap-6 pb-4 border-b border-slate-200">
              {/* Photo with Luxury Frame */}
              <div className="relative shrink-0">
                <div className={`w-32 h-40 rounded-2xl overflow-hidden border-2 ${selectedTheme.frameBorder} shadow-md bg-white p-1`}>
                  <img src={data.photoUrl || "/promo/bride-card.jpg"} alt={data.fullName} className="w-full h-full object-cover rounded-xl" />
                </div>
                <span className="absolute -bottom-2 -right-2 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow border border-white">
                  ✅ 100% Verified
                </span>
              </div>

              {/* Name & Quick Badges */}
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <h2 className={`text-2xl font-black ${selectedTheme.accent} tracking-tight truncate`}>{data.fullName}</h2>
                  <span className="font-mono text-xs font-black bg-amber-50 text-maroon border border-gold/40 px-3 py-1 rounded-xl shadow-xs">
                    ID: {profileId || "MV2001"}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${selectedTheme.pill}`}>
                    💍 {data.caste} {data.subCaste ? `(${data.subCaste})` : ""}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${selectedTheme.pill}`}>
                    🎂 {data.dob} ({data.height})
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${selectedTheme.pill}`}>
                    🎓 {data.education}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${selectedTheme.pill}`}>
                    💼 {data.job}
                  </span>
                </div>

                <div className="text-xs text-slate-700 font-medium pt-1 flex items-center justify-between">
                  <span>🏢 <b className="text-slate-900">{data.company}</b> • 📍 {data.workLocation}</span>
                  <span className="text-emerald-700 font-black">💰 {data.salary}</span>
                </div>
              </div>
            </div>

            {/* 3. Section 1: వ్యక్తిగత & జ్యోతిష వివరాలు (Astrology & Horoscope) */}
            <div className="space-y-3 pb-4 border-b border-slate-200">
              <h3 className={`text-xs font-black ${selectedTheme.accent} uppercase tracking-wider flex items-center gap-1.5`}>
                <span>⭐</span> <span>కులం & జ్యోతిష వివరాలు (Caste & Horoscope)</span>
              </h3>
              <div className="grid grid-cols-3 gap-y-2 gap-x-4 text-xs bg-amber-50/40 p-3 rounded-2xl border border-gold/30">
                <div>
                  <span className="text-slate-500 font-medium block">కులం / ఉపకులం:</span>
                  <span className="font-bold text-slate-900">{data.caste} {data.subCaste ? `(${data.subCaste})` : ""}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium block">గోత్రం (Gothram):</span>
                  <span className="font-bold text-slate-900">{data.gothram || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium block">నక్షత్రం (Nakshatram):</span>
                  <span className="font-bold text-maroon">⭐ {data.star || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium block">రాశి (Moon Sign):</span>
                  <span className="font-bold text-slate-900">{data.rasi || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium block">లగ్నం (Lagnam):</span>
                  <span className="font-bold text-slate-900">{data.lagnam || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium block">కుజ దోషం (Manglik):</span>
                  <span className="font-bold text-emerald-800">{data.dosham || "లేదు (No)"}</span>
                </div>
              </div>
            </div>

            {/* 4. Section 2: విద్య, ఉద్యోగం & కుటుంబ వివరాలు (Career & Family Details) */}
            <div className="space-y-3 pb-4 border-b border-slate-200">
              <h3 className={`text-xs font-black ${selectedTheme.accent} uppercase tracking-wider flex items-center gap-1.5`}>
                <span>👨‍👩‍👧</span> <span>కుటుంబ నేపథ్యం & ఆస్తిపాస్తులు (Family & Lineage)</span>
              </h3>
              <div className="grid grid-cols-2 gap-y-2.5 gap-x-6 text-xs">
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span className="text-slate-500 font-medium">తండ్రి గారి పేరు & వృత్తి:</span>
                  <span className="font-bold text-slate-900">{data.fatherName} ({data.fatherOccupation})</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span className="text-slate-500 font-medium">తల్లి గారి పేరు & వృత్తి:</span>
                  <span className="font-bold text-slate-900">{data.motherName} ({data.motherOccupation})</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span className="text-slate-500 font-medium">తోబుట్టువులు (Siblings):</span>
                  <span className="font-bold text-slate-900">{data.siblings}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span className="text-slate-500 font-medium">సొంత ఊరు (Native Place):</span>
                  <span className="font-bold text-slate-900">{data.nativePlace}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1 col-span-2">
                  <span className="text-slate-500 font-medium">స్థిరాస్తులు & భూములు (Assets):</span>
                  <span className="font-bold text-slate-900">{data.properties}</span>
                </div>
              </div>
            </div>

            {/* 5. Section 3: సంప్రదించవలసిన వివరాలు (Contact Details) */}
            <div className="space-y-2 pb-4 border-b border-slate-200">
              <h3 className={`text-xs font-black ${selectedTheme.accent} uppercase tracking-wider flex items-center gap-1.5`}>
                <span>📞</span> <span>సంప్రదించవలసిన వివరాలు (Contact Information)</span>
              </h3>
              <div className="grid grid-cols-2 gap-y-2 gap-x-6 text-xs bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-slate-500 font-medium block">సంప్రదించవలసిన వారు:</span>
                  <span className="font-bold text-slate-900">{data.contactPerson} ({data.phone})</span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium block">నివాస చిరునామా:</span>
                  <span className="font-bold text-slate-900">{data.address}</span>
                </div>
              </div>
            </div>

            {/* ================= 6. THE TROJAN HORSE VIRAL FOOTER (MANA VIVAHA VERIFICATION BAR) ================= */}
            <div className="bg-gradient-to-r from-amber-100/90 via-amber-50 to-amber-100/90 border-2 border-gold/60 rounded-2xl p-4 flex items-center justify-between gap-4 shadow-sm">
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-base">👑</span>
                  <span className="font-black text-xs text-maroon uppercase tracking-wide">
                    మన వివాహ (MANA VIVAHA) — అధికారిక ధృవీకరించబడిన ప్రొఫైల్
                  </span>
                </div>
                <p className="text-[11px] text-slate-700 font-medium leading-relaxed telugu">
                  🔍 ఈ సంబంధం యొక్క పూర్తి ప్రొఫైల్, ఫోటోలు, జాతక సరిపోలిక & సంప్రదింపుల కొరకు పక్కన ఉన్న <b>QR Code స్కాన్ చేయండి</b> లేదా <b>manavivaha.in/search/{profileId || "MV2001"}</b> లో చూడండి.
                </p>
                <div className="text-[10px] text-slate-500 font-bold pt-0.5">
                  📞 అధికారిక వాట్సాప్ హెల్ప్‌లైన్: +91 6304996088 • 100% నమ్మకమైన తెలుగు మ్యాట్రిమోనీ
                </div>
              </div>

              {/* Dynamic Scannable QR Code */}
              <div className="shrink-0 text-center bg-white p-1.5 rounded-xl border border-gold/50 shadow-xs">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="Scan QR Code" className="w-20 h-20" />
                ) : (
                  <div className="w-20 h-20 bg-slate-100 flex items-center justify-center text-xs">QR</div>
                )}
                <span className="text-[9px] font-extrabold text-maroon block mt-0.5">SCAN TO VIEW</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
