"use client";

/**
 * 🎴 MANA VIVAHA — TELUGU MARRIAGE BIODATA MAKER & STUDIO
 * =========================================================
 * - Authentic Telugu Vedic Marriage Biodata with Auspicious Headers
 * - 4 Royal Themes (Temple Gold, Velvet Maroon, Peacock Blue, Rose Gold)
 * - Auto-fill from Profile ID or Custom Input
 * - High-Precision A4 Print & PDF Export (window.print() with exact A4 print styles)
 * - 1-Click WhatsApp Biodata Share & Verification QR Code
 */

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useLang } from "@/lib/lang";
import { Duo, duo } from "@/lib/duo";
import { TELUGU_CASTES, NAKSHATRAS, RASIS, TS_DISTRICTS, AP_DISTRICTS } from "@/lib/telugu-data";
import { SITE_CONFIG } from "@/lib/site-config";
import { WhatsAppIcon } from "@/components/BrandIcons";

const HEADERS = [
  "|| శ్రీ రస్తు — శుభమస్తు — అవిఘ్నమస్తు ||",
  "|| ఓం శ్రీ లక్ష్మీ వేంకటేశ్వరాయ నమః ||",
  "|| శ్రీ సీతారామచంద్రాభ్యాం నమః ||",
  "|| శ్రీ విఘ్నేశ్వరాయ నమః ||",
];

const THEMES = [
  { id: "gold", name: "తిరుమల స్వర్ణ శైలి (Temple Gold)", border: "border-amber-400", bg: "bg-gradient-to-b from-amber-50/70 via-white to-amber-50/40", headerBg: "bg-gradient-to-r from-amber-800 via-amber-600 to-amber-800 text-white", accent: "text-amber-800", pill: "bg-amber-100 text-amber-900 border-amber-300" },
  { id: "maroon", name: "రాయల్ మెరూన్ (Royal Velvet)", border: "border-red-800", bg: "bg-gradient-to-b from-red-50/70 via-white to-red-50/40", headerBg: "bg-gradient-to-r from-red-950 via-red-800 to-red-950 text-white", accent: "text-red-900", pill: "bg-red-100 text-red-900 border-red-300" },
  { id: "peacock", name: "మయూర నీలం (Peacock Blue)", border: "border-teal-600", bg: "bg-gradient-to-b from-teal-50/70 via-white to-teal-50/40", headerBg: "bg-gradient-to-r from-teal-950 via-teal-800 to-teal-950 text-white", accent: "text-teal-900", pill: "bg-teal-100 text-teal-900 border-teal-300" },
  { id: "rose", name: "కళ్యాణ గులాబీ (Auspicious Rose)", border: "border-rose-400", bg: "bg-gradient-to-b from-rose-50/70 via-white to-rose-50/40", headerBg: "bg-gradient-to-r from-rose-900 via-rose-700 to-rose-900 text-white", accent: "text-rose-900", pill: "bg-rose-100 text-rose-900 border-rose-300" },
];

export default function BiodataPage() {
  const { lang } = useLang();
  const te = lang === "te";

  const [headerText, setHeaderText] = useState(HEADERS[0]);
  const [selectedTheme, setSelectedTheme] = useState(THEMES[0]);
  const [profileId, setProfileId] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Form Data
  const [data, setData] = useState({
    title: "వివాహ బయోడేటా (Marriage Biodata)",
    fullName: "రవితేజ రెడ్డి",
    gender: "Groom",
    dob: "1997-08-15",
    tob: "08:45 AM",
    pob: "హైదరాబాద్",
    height: "5' 10\" (178 cm)",
    complexion: "గోధుమ రంగు (Wheatish)",
    caste: "రెడ్డి",
    subCaste: "మోటాటి",
    gothram: "భరద్వాజ",
    star: "రోహిణి",
    paadam: "2 వ పాదం",
    rasi: "వృషభం",
    lagnam: "మిథున లగ్నం",
    education: "B.Tech (Computer Science)",
    educationDetail: "JNTU Hyderabad (2019 Batch)",
    job: "Senior Software Engineer",
    company: "TCS / Amazon Partner",
    salary: "₹18,00,000 / annum (18 LPA)",
    workLocation: "హైదరాబాద్ (Work From Home/Hybrid)",
    fatherName: "రామకృష్ణా రెడ్డి",
    fatherOccupation: "వ్యాపారం (Real Estate & Agriculture)",
    motherName: "లక్ష్మీ దేవి",
    motherOccupation: "గృహిణి (Home Maker)",
    siblings: "1 చెల్లెలు (వివాహం కాలేదు - B.Tech విద్యార్థి)",
    nativePlace: "నల్గొండ / హైదరాబాద్",
    properties: "సొంత ఇల్లు (హైదరాబాద్) + 4 ఎకరాల వ్యవసాయ భూమి",
    contactPerson: "తండ్రి గారి ఫోన్",
    phone: "98490XXXXX",
    email: "ramakrishna.reddy@gmail.com",
    address: "ఫ్లాట్ 402, శ్రీ బాలాజీ టవర్స్, కూకట్‌పల్లి, హైదరాబాద్ - 500072",
    photoUrl: "/promo/groom-kamma.jpg",
  });

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
          setData((prev) => ({
            ...prev,
            fullName: p.full_name || prev.fullName,
            gender: p.gender || prev.gender,
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
            workLocation: p.work_location || `${p.district || "హైదరాబాద్"}, ${p.state || "TS"}`,
            nativePlace: `${p.district || "హైదరాబాద్"}, ${p.state || "తెలంగాణ"}`,
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

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const shareOnWhatsApp = () => {
    const text = `🌸 *${data.title} — మన వివాహ (MANA VIVAHA)* 🌸\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `👤 *పేరు:* ${data.fullName}\n` +
      `💍 *కులం:* ${data.caste} (${data.subCaste})\n` +
      `🌟 *గోత్రం:* ${data.gothram}  |  *నక్షత్రం:* ${data.star} (${data.rasi})\n` +
      `🎓 *విద్య:* ${data.education}\n` +
      `💼 *ఉద్యోగం:* ${data.job} (${data.company})\n` +
      `💰 *వార్షిక ఆదాయం:* ${data.salary}\n` +
      `📍 *ప్రాంతం:* ${data.workLocation}\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `👨‍👩‍👦 *కుటుంబ వివరాలు:*\n` +
      `• తండ్రి: ${data.fatherName} (${data.fatherOccupation})\n` +
      `• తల్లి: ${data.motherName} (${data.motherOccupation})\n` +
      `• తోబుట్టువులు: ${data.siblings}\n` +
      `• స్వస్థలం: ${data.nativePlace}\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `🔗 *మన వివాహ లో పూర్తి వెరిఫైడ్ ప్రొఫైల్ చూడండి:*\n` +
      `👉 ${SITE_CONFIG.siteUrl}/search/${profileId || "MV1001"}`;

    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  return (
    <div className="min-h-screen bg-slate-100 py-6 sm:py-10 px-3 sm:px-6 font-sans">
      <div className="max-w-6xl mx-auto">
        
        {/* Top Control Bar — Hidden in Print */}
        <div className="no-print bg-white rounded-3xl p-5 sm:p-7 shadow-sm border border-gold/40 mb-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <div className="inline-flex items-center gap-2 bg-amber-50 border border-gold/40 rounded-full px-3 py-1 text-xs font-bold text-maroon mb-1">
                <span>🎴</span> {te ? "తెలుగు వివాహ బయోడేటా మేకర్ (PDF & WhatsApp)" : "Telugu Marriage Biodata Studio"}
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-ink telugu">
                {te ? "సంప్రదాయ తెలుగు వివాహ బయోడేటా సృష్టించండి" : "Create Traditional Telugu Marriage Biodata"}
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                {te ? "మీ వివరాలను పూరించండి, నచ్చిన థీమ్ ఎంచుకోండి — తక్షణమే హై-క్వాలిటీ PDF డౌన్‌లోడ్ చేసుకోండి లేదా వాట్సాప్‌లో షేర్ చేయండి." : "Fill your details, pick a royal theme, and download crisp A4 PDF or share directly to WhatsApp."}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={handlePrint}
                className="px-5 py-2.5 rounded-2xl bg-maroon text-white font-bold text-xs sm:text-sm hover:bg-maroon-dark transition shadow-md flex items-center gap-2"
              >
                <span>🖨️</span> {te ? "PDF డౌన్‌లోడ్ / ప్రింట్ (A4)" : "Download PDF / Print"}
              </button>
              <button
                type="button"
                onClick={shareOnWhatsApp}
                className="px-5 py-2.5 rounded-2xl bg-emerald-600 text-white font-bold text-xs sm:text-sm hover:bg-emerald-700 transition shadow-md flex items-center gap-2"
              >
                <WhatsAppIcon className="w-4 h-4 fill-white" />
                {te ? "వాట్సాప్‌లో షేర్ చేయండి" : "Share on WhatsApp"}
              </button>
            </div>
          </div>

          {/* Controls: Quick Load from Profile ID + Theme Selector */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ⚡ {te ? "Profile ID తో ఆటో-ఫిల్ చేయండి" : "Auto-fill with Profile ID"}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. MV1001"
                  value={profileId}
                  onChange={(e) => setProfileId(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold focus:border-maroon outline-none uppercase"
                />
                <button
                  type="button"
                  onClick={() => fetchProfile(profileId)}
                  disabled={loading}
                  className="px-4 py-2 rounded-xl bg-gold text-maroon font-black text-xs hover:bg-gold-light transition shrink-0"
                >
                  {loading ? "..." : (te ? "లోడ్ చేయి" : "Load")}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                🎨 {te ? "రాజసం రంగు థీమ్" : "Royal Color Theme"}
              </label>
              <select
                value={selectedTheme.id}
                onChange={(e) => setSelectedTheme(THEMES.find((t) => t.id === e.target.value) || THEMES[0])}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 focus:border-maroon outline-none bg-white"
              >
                {THEMES.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                🕉️ {te ? "శుభ ప్రారంభ శ్లోకం / హెడర్" : "Auspicious Inscription Header"}
              </label>
              <select
                value={headerText}
                onChange={(e) => setHeaderText(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 focus:border-maroon outline-none bg-white"
              >
                {HEADERS.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ================= BIODATA PREVIEW CANVAS (PRINT OPTIMIZED) ================= */}
        <div
          id="biodata-canvas"
          className={`bg-white rounded-3xl ${selectedTheme.bg} border-4 ${selectedTheme.border} p-6 sm:p-10 shadow-2xl max-w-[800px] mx-auto text-slate-900 transition-all`}
        >
          {/* 1. Auspicious Inscription Banner */}
          <div className="text-center pb-4 border-b-2 border-dashed border-amber-300/80">
            <p className="text-xs sm:text-sm font-bold tracking-widest text-amber-900 telugu mb-1">
              {headerText}
            </p>
            <div className={`inline-block px-6 py-1.5 rounded-full ${selectedTheme.headerBg} shadow-sm font-black text-sm sm:text-base tracking-wide mt-2`}>
              {data.title}
            </div>
          </div>

          {/* 2. Top Profile Row with Photo */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 py-6 border-b border-amber-200/60">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <div className="w-32 h-40 rounded-2xl overflow-hidden border-2 border-gold shadow-md shrink-0 bg-slate-100">
              <img
                src={data.photoUrl || "/promo/groom-kamma.jpg"}
                alt={data.fullName}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="space-y-1.5 text-center sm:text-left flex-1">
              <h2 className={`text-2xl sm:text-3xl font-black ${selectedTheme.accent} telugu`}>
                {data.fullName}
              </h2>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${selectedTheme.pill}`}>
                  💍 {data.caste} {data.subCaste ? `(${data.subCaste})` : ""}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${selectedTheme.pill}`}>
                  🎓 {data.education}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${selectedTheme.pill}`}>
                  💼 {data.job}
                </span>
              </div>
              <p className="text-xs text-slate-600 font-medium pt-1">
                📍 {data.workLocation} • 💰 {data.salary}
              </p>
            </div>
          </div>

          {/* 3. Section 1: వ్యక్తిగత & శారీరక వివరాలు (Personal Details) */}
          <div className="py-4 border-b border-amber-200/60">
            <h3 className={`text-sm font-bold ${selectedTheme.accent} uppercase tracking-wider mb-3 flex items-center gap-2`}>
              <span>👤</span> వ్యక్తిగత వివరాలు (Personal Details)
            </h3>
            <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
              <div className="flex justify-between border-b border-slate-100 pb-1">
                <span className="text-slate-500 font-medium">జన్మ తేదీ (DOB):</span>
                <span className="font-bold text-slate-800">{data.dob}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-1">
                <span className="text-slate-500 font-medium">జన్మ సమయం (TOB):</span>
                <span className="font-bold text-slate-800">{data.tob}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-1">
                <span className="text-slate-500 font-medium">జన్మ స్థలం (POB):</span>
                <span className="font-bold text-slate-800">{data.pob}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-1">
                <span className="text-slate-500 font-medium">ఎత్తు (Height):</span>
                <span className="font-bold text-slate-800">{data.height}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-1">
                <span className="text-slate-500 font-medium">వర్ణం (Complexion):</span>
                <span className="font-bold text-slate-800">{data.complexion}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-1">
                <span className="text-slate-500 font-medium">మాతృభాష:</span>
                <span className="font-bold text-slate-800">తెలుగు (Telugu)</span>
              </div>
            </div>
          </div>

          {/* 4. Section 2: జాతక & గ్రహ స్థితి వివరాలు (Astrological Details) */}
          <div className="py-4 border-b border-amber-200/60">
            <h3 className={`text-sm font-bold ${selectedTheme.accent} uppercase tracking-wider mb-3 flex items-center gap-2`}>
              <span>🕉️</span> జాతక వివరాలు (Astrological Details)
            </h3>
            <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
              <div className="flex justify-between border-b border-slate-100 pb-1">
                <span className="text-slate-500 font-medium">గోత్రం (Gothram):</span>
                <span className="font-bold text-slate-800">{data.gothram}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-1">
                <span className="text-slate-500 font-medium">నక్షత్రం (Nakshatram):</span>
                <span className="font-bold text-slate-800">{data.star} ({data.paadam})</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-1">
                <span className="text-slate-500 font-medium">రాశి (Rasi):</span>
                <span className="font-bold text-slate-800">{data.rasi}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-1">
                <span className="text-slate-500 font-medium">లగ్నం (Lagnam):</span>
                <span className="font-bold text-slate-800">{data.lagnam}</span>
              </div>
            </div>
          </div>

          {/* 5. Section 3: విద్య & ఉద్యోగ వివరాలు (Education & Career) */}
          <div className="py-4 border-b border-amber-200/60">
            <h3 className={`text-sm font-bold ${selectedTheme.accent} uppercase tracking-wider mb-3 flex items-center gap-2`}>
              <span>🎓</span> విద్య & ఉద్యోగం (Education & Profession)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4 text-xs">
              <div className="border-b border-slate-100 pb-1">
                <span className="text-slate-500 block text-[11px]">విద్యార్హత (Education):</span>
                <span className="font-bold text-slate-800">{data.education} — {data.educationDetail}</span>
              </div>
              <div className="border-b border-slate-100 pb-1">
                <span className="text-slate-500 block text-[11px]">హోదా & సంస్థ (Job & Company):</span>
                <span className="font-bold text-slate-800">{data.job} at {data.company}</span>
              </div>
              <div className="border-b border-slate-100 pb-1">
                <span className="text-slate-500 block text-[11px]">వార్షిక ఆదాయం (Annual Income):</span>
                <span className="font-bold text-emerald-800">{data.salary}</span>
              </div>
              <div className="border-b border-slate-100 pb-1">
                <span className="text-slate-500 block text-[11px]">పనిచేయు ప్రదేశం (Work Location):</span>
                <span className="font-bold text-slate-800">{data.workLocation}</span>
              </div>
            </div>
          </div>

          {/* 6. Section 4: కుటుంబ వివరాలు & స్థిరాస్తులు (Family Details) */}
          <div className="py-4 border-b border-amber-200/60">
            <h3 className={`text-sm font-bold ${selectedTheme.accent} uppercase tracking-wider mb-3 flex items-center gap-2`}>
              <span>👨‍👩‍👦</span> కుటుంబ వివరాలు (Family Details)
            </h3>
            <div className="space-y-1.5 text-xs">
              <div className="flex flex-col sm:flex-row sm:justify-between border-b border-slate-100 pb-1">
                <span className="text-slate-500 font-medium">తండ్రి గారి పేరు & వృత్తి:</span>
                <span className="font-bold text-slate-800">{data.fatherName} ({data.fatherOccupation})</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between border-b border-slate-100 pb-1">
                <span className="text-slate-500 font-medium">తల్లి గారి పేరు & వృత్తి:</span>
                <span className="font-bold text-slate-800">{data.motherName} ({data.motherOccupation})</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between border-b border-slate-100 pb-1">
                <span className="text-slate-500 font-medium">తోబుట్టువులు (Siblings):</span>
                <span className="font-bold text-slate-800">{data.siblings}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between border-b border-slate-100 pb-1">
                <span className="text-slate-500 font-medium">స్వస్థలం / నివాసం:</span>
                <span className="font-bold text-slate-800">{data.nativePlace}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between border-b border-slate-100 pb-1">
                <span className="text-slate-500 font-medium">స్థిరాస్తులు (Properties):</span>
                <span className="font-bold text-slate-800">{data.properties}</span>
              </div>
            </div>
          </div>

          {/* 7. Section 5: సంప్రదించవలసిన వివరాలు (Contact & Verification) */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
            <div className="space-y-1 text-center sm:text-left">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                📞 సంప్రదింపు వివరాలు (Contact Details)
              </span>
              <div className="font-bold text-slate-800 text-sm">
                {data.contactPerson}: {data.phone}
              </div>
              <div className="text-[11px] text-slate-600">
                చిరునామా: {data.address}
              </div>
            </div>

            <div className="flex items-center gap-3 bg-amber-50/80 p-2.5 rounded-2xl border border-amber-200 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={SITE_CONFIG.logoImage}
                alt="మన వివాహ Verified"
                className="w-10 h-10 rounded-xl object-cover shadow-sm"
              />
              <div className="text-left">
                <div className="text-[11px] font-black text-maroon telugu">
                  మన వివాహ ధృవీకరించిన ప్రొఫైల్
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                  ID: {profileId || "MV1001"} · Verified ✅
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
