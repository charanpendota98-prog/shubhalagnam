"use client";

/**
 * 🎴 MANA VIVAHA — LUXURY TELUGU MARRIAGE BIODATA STUDIO
 * =========================================================
 * - Premium Matrimonial Biodata (Shaadi Elite / VIP Standard)
 * - Contextual Religious Presets (Hindu / Muslim / Christian / Inter-faith)
 * - 4 Regal Themes: Royal Velvet Maroon 👑, Temple Gold 🪔, Imperial Emerald 🦚, Auspicious Rose 🌸
 * - Crystal Clear English Labels with Traditional Telugu Highlights
 * - 2nd Marriage / Remarriage Distinguished Header Badge
 * - Form Data Auto-Fill via Profile ID or Live In-Place Editing
 * - Pixel-Perfect A4 Page Dimension for Print & PDF Export
 * - Official Mana Vivaha Digital Trust Badge + WhatsApp Helpline: +91 63049 96088
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { useLang } from "@/lib/lang";
import { SITE_CONFIG } from "@/lib/site-config";
import { WhatsAppIcon } from "@/components/BrandIcons";

const RELIGION_HEADERS: Record<string, string[]> = {
  Hindu: [
    "|| శ్రీ రస్తు — శుభమస్తు — అవిఘ్నమస్తు ||",
    "|| Om Sri Lakshmi Venkateshwaraya Namaha ||",
    "|| Sri Sita Ramachandrabhyam Namaha ||",
    "|| Sri Vighneshwaraya Namaha ||",
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
    name: "Royal Velvet Maroon (రాయల్ మెరూన్)",
    border: "border-[#7A0C2E]",
    bg: "bg-gradient-to-b from-[#FFFDF7] via-white to-[#FDF8F0]",
    headerBg: "bg-gradient-to-r from-[#59041E] via-[#7A0C2E] to-[#59041E] text-white",
    accent: "text-[#7A0C2E]",
    subAccent: "text-[#B8860B]",
    divider: "border-[#7A0C2E]/20",
    pill: "bg-[#7A0C2E]/10 text-[#7A0C2E] border-[#7A0C2E]/20",
    badgeBg: "bg-[#7A0C2E] text-white",
  },
  {
    id: "gold",
    name: "Tirumala Temple Gold (స్వర్ణ శైలి)",
    border: "border-[#B8860B]",
    bg: "bg-gradient-to-b from-[#FFFDF2] via-white to-[#FFF9E6]",
    headerBg: "bg-gradient-to-r from-[#8B6508] via-[#B8860B] to-[#8B6508] text-white",
    accent: "text-[#8B6508]",
    subAccent: "text-[#7A0C2E]",
    divider: "border-[#B8860B]/25",
    pill: "bg-[#B8860B]/15 text-[#8B6508] border-[#B8860B]/30",
    badgeBg: "bg-[#B8860B] text-white",
  },
  {
    id: "peacock",
    name: "Imperial Emerald Blue (మయూర నీలం)",
    border: "border-[#0C5858]",
    bg: "bg-gradient-to-b from-[#F2FBFA] via-white to-[#EAF7F6]",
    headerBg: "bg-gradient-to-r from-[#063838] via-[#0C5858] to-[#063838] text-white",
    accent: "text-[#0C5858]",
    subAccent: "text-[#B8860B]",
    divider: "border-[#0C5858]/20",
    pill: "bg-[#0C5858]/10 text-[#0C5858] border-[#0C5858]/25",
    badgeBg: "bg-[#0C5858] text-white",
  },
  {
    id: "rose",
    name: "Auspicious Rose Gold (కళ్యాణ గులాబీ)",
    border: "border-[#A83258]",
    bg: "bg-gradient-to-b from-[#FFF5F8] via-white to-[#FDF0F4]",
    headerBg: "bg-gradient-to-r from-[#7A1D3B] via-[#A83258] to-[#7A1D3B] text-white",
    accent: "text-[#A83258]",
    subAccent: "text-[#7A0C2E]",
    divider: "border-[#A83258]/20",
    pill: "bg-[#A83258]/10 text-[#A83258] border-[#A83258]/25",
    badgeBg: "bg-[#A83258] text-white",
  },
];

export default function BiodataPage() {
  const { lang } = useLang();
  const te = lang === "te";

  const [religion, setReligion] = useState<"Hindu" | "Muslim" | "Christian" | "Other">("Hindu");
  const [headerText, setHeaderText] = useState(RELIGION_HEADERS.Hindu[0]);
  const [selectedTheme, setSelectedTheme] = useState(THEMES[0]);
  const [profileId, setProfileId] = useState("");
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Form Data
  const [data, setData] = useState({
    title: "MARRIAGE BIODATA (వివాహ బయోడేటా)",
    fullName: "Ravi Teja Reddy",
    gender: "Groom",
    maritalStatus: "Never Married",
    isSecondMarriage: false,
    dob: "15 August 1997",
    tob: "08:45 AM",
    height: "5' 10\" (178 cm)",
    complexion: "Wheatish",
    caste: "Reddy",
    subCaste: "Motati (మోటాటి)",
    // Hindu Astrological fields
    gothram: "Bharadwaja (భరద్వాజ)",
    star: "Rohini (రోహిణి)",
    rasi: "Vrishabha (వృషభం)",
    lagnam: "Mithuna Lagnam (మిథునం)",
    // Muslim fields
    islamicSect: "Sunni (సున్నీ)",
    islamicJamath: "Sheikh (షేక్)",
    namazStatus: "5 Times Namaz Regular",
    // Christian fields
    christianDenomination: "Roman Catholic (రోమన్ క్యాథలిక్)",
    churchName: "St. Mary's Basilica, Secunderabad",
    baptismStatus: "Baptized & Active Believer",
    // Career & Education
    education: "B.Tech in Computer Science",
    educationDetail: "JNTU Hyderabad (2019 Batch)",
    job: "Senior Software Engineer",
    company: "TCS / Amazon Partner",
    salary: "₹18,00,000 / annum (18 LPA)",
    workLocation: "Hyderabad, Telangana (Hybrid / WFH)",
    // Family Lineage
    fatherName: "Ramakrishna Reddy",
    fatherOccupation: "Real Estate & Agriculture",
    motherName: "Lakshmi Devi",
    motherOccupation: "Home Maker",
    siblings: "1 Younger Sister (B.Tech - Unmarried)",
    nativePlace: "Nalgonda / Hyderabad",
    properties: "Own Independent House in Hyderabad + 4 Acres Agricultural Land",
    familyValues: "Traditional & Cultured Family",
    // Contact
    contactPerson: "Father's Contact",
    phone: "98490XXXXX",
    email: "ramakrishna.reddy@gmail.com",
    address: "Flat 402, Sri Balaji Towers, Kukatpally, Hyderabad - 500072",
    photoUrl: "/promo/groom-kamma.jpg",
  });

  // Handle Religion Change
  const handleReligionChange = (r: "Hindu" | "Muslim" | "Christian" | "Other") => {
    setReligion(r);
    const headers = RELIGION_HEADERS[r] || RELIGION_HEADERS.Hindu;
    setHeaderText(headers[0]);
    if (r === "Muslim") {
      setData((prev) => ({
        ...prev,
        title: "NIKAH BIODATA (నికాహ్ బయోడేటా)",
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
        title: "MARRIAGE BIODATA (వివాహ బయోడేటా)",
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
          const isRemarriage = mStatus.toLowerCase().includes("divorced") ||
            mStatus.toLowerCase().includes("widowed") ||
            mStatus.toLowerCase().includes("remarriage") ||
            mStatus.toLowerCase().includes("second");

          const pRel = p.religion === "Muslim" ? "Muslim" : (p.religion === "Christian" ? "Christian" : "Hindu");
          setReligion(pRel);
          const headers = RELIGION_HEADERS[pRel] || RELIGION_HEADERS.Hindu;
          setHeaderText(headers[0]);

          setData((prev) => ({
            ...prev,
            title: isRemarriage
              ? "SECOND MARRIAGE BIODATA (పునర్వివాహం)"
              : (pRel === "Muslim" ? "NIKAH BIODATA (నికాహ్ బయోడేటా)" : (pRel === "Christian" ? "CHRISTIAN MATRIMONIAL BIODATA" : "MARRIAGE BIODATA (వివాహ బయోడేటా)")),
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

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const shareOnWhatsApp = () => {
    const text = `🌸 *${data.title} — MANA VIVAHA* 🌸\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `👤 *Name:* ${data.fullName} (${data.height})\n` +
      `💍 *Status:* ${data.maritalStatus}\n` +
      (religion === "Hindu"
        ? `💍 *Caste & Gothram:* ${data.caste} (${data.subCaste}) | ${data.gothram}\n` +
          `🌟 *Horoscope:* ${data.star} · ${data.rasi}\n`
        : religion === "Muslim"
        ? `🕌 *Sect & Jamath:* ${data.islamicSect} (${data.islamicJamath}) | ${data.namazStatus}\n`
        : `⛪ *Denomination:* ${data.christianDenomination} | ${data.churchName}\n`) +
      `🎓 *Education:* ${data.education}\n` +
      `💼 *Profession:* ${data.job} at ${data.company}\n` +
      `💰 *Annual Income:* ${data.salary}\n` +
      `📍 *Location:* ${data.workLocation}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `👨‍👩‍👦 *Family Lineage:*\n` +
      `• Father: ${data.fatherName} (${data.fatherOccupation})\n` +
      `• Mother: ${data.motherName} (${data.motherOccupation})\n` +
      `• Siblings: ${data.siblings}\n` +
      `• Native: ${data.nativePlace}\n` +
      `• Assets: ${data.properties}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🔗 *View 100% Verified Profile on Mana Vivaha:*\n` +
      `👉 ${SITE_CONFIG.siteUrl}/search/${profileId || "MV1001"}\n\n` +
      `📞 *Official Support WhatsApp:* +91 63049 96088`;

    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] py-6 sm:py-10 px-3 sm:px-6 font-sans">
      <div className="max-w-6xl mx-auto">
        
        {/* ================= TOP STUDIO CONTROLS (HIDDEN IN PRINT) ================= */}
        <div className="no-print bg-white rounded-3xl p-5 sm:p-7 shadow-sm border border-gold/40 mb-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <div className="inline-flex items-center gap-2 bg-amber-50 border border-gold/40 rounded-full px-3 py-1 text-xs font-bold text-maroon mb-1">
                <span>👑</span> {te ? "మన వివాహ రాయల్ బయోడేటా స్టూడియో" : "Mana Vivaha Royal Biodata Studio"}
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-ink telugu">
                {te ? "సంప్రదాయ & ఆధునిక వివాహ బయోడేటా" : "Shaadi Elite Standard Marriage Biodata"}
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                {te ? "మతం, కులం, లేదా పునర్వివాహం (2nd Marriage) కి అనుగుణంగా పర్‌ఫెక్ట్ A4 PDF ని డౌన్‌లోడ్ చేయండి." : "Contextualized for Hindu, Muslim, Christian, and Remarriage profiles with crisp A4 PDF export."}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setIsEditing(!isEditing)}
                className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition border ${
                  isEditing ? "bg-amber-100 border-amber-300 text-amber-900" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                ✏️ {isEditing ? (te ? "ప్రివ్యూ మోడ్" : "View Preview") : (te ? "వివరాలు ఎడిట్ చేయి" : "Edit Fields")}
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="px-5 py-2.5 rounded-2xl bg-maroon text-white font-black text-xs sm:text-sm hover:bg-maroon-dark transition shadow-md flex items-center gap-2"
              >
                <span>🖨️</span> {te ? "PDF డౌన్‌లోడ్ / ప్రింట్ (A4)" : "Download A4 PDF / Print"}
              </button>
              <button
                type="button"
                onClick={shareOnWhatsApp}
                className="px-5 py-2.5 rounded-2xl bg-emerald-600 text-white font-black text-xs sm:text-sm hover:bg-emerald-700 transition shadow-md flex items-center gap-2"
              >
                <WhatsAppIcon className="w-4 h-4 fill-white" />
                {te ? "వాట్సాప్‌లో షేర్ చేయండి" : "Share on WhatsApp"}
              </button>
            </div>
          </div>

          {/* Quick Config Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ⚡ {te ? "Profile ID తో ఆటో-ఫిల్" : "Auto-fill Profile ID"}
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
                  {loading ? "..." : (te ? "లోడ్" : "Load")}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                🕌 / ⛪ / 🪔 {te ? "మత సంప్రదాయం (Religion)" : "Religion / Tradition"}
              </label>
              <select
                value={religion}
                onChange={(e) => handleReligionChange(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 focus:border-maroon outline-none bg-white"
              >
                <option value="Hindu">Hindu (హిందూ)</option>
                <option value="Muslim">Muslim (ముస్లిం / Nikah)</option>
                <option value="Christian">Christian (క్రైస్తవ)</option>
                <option value="Other">General / Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                💍 {te ? "వివాహ స్థితి (Marital Status)" : "Marital Status"}
              </label>
              <select
                value={data.maritalStatus}
                onChange={(e) => {
                  const val = e.target.value;
                  const isRemarr = val !== "Never Married";
                  setData({
                    ...data,
                    maritalStatus: val,
                    isSecondMarriage: isRemarr,
                    title: isRemarr
                      ? "SECOND MARRIAGE BIODATA (పునర్వివాహం)"
                      : (religion === "Muslim" ? "NIKAH BIODATA (నికాహ్ బయోడేటా)" : (religion === "Christian" ? "CHRISTIAN MATRIMONIAL BIODATA" : "MARRIAGE BIODATA (వివాహ బయోడేటా)")),
                  });
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 focus:border-maroon outline-none bg-white"
              >
                <option value="Never Married">Never Married (అవివాహితుడు / అవివాహిత)</option>
                <option value="Divorced">Divorced (విడాకులు అయినవి)</option>
                <option value="Widowed">Widowed (భార్య/భర్త మరణించిన)</option>
                <option value="Awaiting Divorce">Awaiting Divorce (విడాకుల ప్రక్రియలో)</option>
                <option value="Second Marriage">Second Marriage (పునర్వివాహం)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                🎨 {te ? "రాయల్ థీమ్ ఎంపిక" : "Select Royal Color Theme"}
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
          </div>
        </div>

        {/* ================= BIODATA CANVAS (EXACT A4 PRINT OPTIMIZED) ================= */}
        <div
          id="biodata-canvas"
          className={`bg-white rounded-3xl ${selectedTheme.bg} border-4 ${selectedTheme.border} p-6 sm:p-10 shadow-2xl max-w-[800px] mx-auto text-slate-900 transition-all`}
        >
          {/* 1. Auspicious Inscription Banner */}
          <div className="text-center pb-4 border-b-2 border-dashed border-amber-300/80">
            <p className="text-xs sm:text-sm font-bold tracking-widest text-amber-900 telugu mb-1">
              {headerText}
            </p>

            {/* Remarriage or Standard Title Badge */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-1.5">
              <div className={`inline-block px-7 py-1.5 rounded-full ${selectedTheme.headerBg} shadow-sm font-black text-xs sm:text-sm tracking-wider uppercase`}>
                {data.title}
              </div>
              {data.isSecondMarriage && (
                <div className="inline-block px-4 py-1 rounded-full bg-amber-500 text-white font-black text-[11px] shadow-sm uppercase tracking-wide">
                  💍 Second Marriage / Remarriage
                </div>
              )}
            </div>
          </div>

          {/* 2. Top Profile Row with Photo & Key Highlights */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 py-6 border-b border-slate-200/80">
            {/* Photo with Prominent Luxury Border */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <div className="w-32 h-40 rounded-2xl overflow-hidden border-2 border-gold shadow-md shrink-0 bg-slate-100 relative">
              <img
                src={data.photoUrl || "/promo/groom-kamma.jpg"}
                alt={data.fullName}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[9px] font-mono px-1.5 py-0.5 rounded backdrop-blur-xs">
                {profileId || "MV1001"}
              </div>
            </div>

            {/* Title / Name & Tags */}
            <div className="space-y-2 text-center sm:text-left flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <h2 className={`text-2xl sm:text-3xl font-black ${selectedTheme.accent} tracking-tight`}>
                  {data.fullName}
                </h2>
                <span className="font-mono text-xs font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200 self-center sm:self-auto">
                  ID: {profileId || "MV1001"}
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 pt-0.5">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${selectedTheme.pill}`}>
                  💍 {data.caste} {data.subCaste ? `(${data.subCaste})` : ""}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${selectedTheme.pill}`}>
                  🎓 {data.education}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${selectedTheme.pill}`}>
                  💼 {data.job}
                </span>
                {data.isSecondMarriage && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-900 border border-amber-300">
                    💍 {data.maritalStatus}
                  </span>
                )}
              </div>

              <div className="text-xs text-slate-600 font-medium space-y-0.5 pt-1">
                <div>🏢 <b className="text-slate-800">{data.company}</b> • 📍 {data.workLocation}</div>
                <div className="text-emerald-800 font-bold">💰 Annual Package: {data.salary}</div>
              </div>
            </div>
          </div>

          {/* 3. Section 1: Personal Details */}
          <div className="py-4 border-b border-slate-200/80">
            <h3 className={`text-xs sm:text-sm font-extrabold ${selectedTheme.accent} uppercase tracking-wider mb-3 flex items-center gap-2`}>
              <span>👤</span> Personal Profile
            </h3>
            <div className="grid grid-cols-2 gap-y-2 gap-x-6 text-xs">
              <div className="flex justify-between border-b border-slate-100 pb-1">
                <span className="text-slate-500 font-medium">Date of Birth:</span>
                <span className="font-bold text-slate-800">{data.dob}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-1">
                <span className="text-slate-500 font-medium">Time of Birth:</span>
                <span className="font-bold text-slate-800">{data.tob}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-1">
                <span className="text-slate-500 font-medium">Height:</span>
                <span className="font-bold text-slate-800">{data.height}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-1">
                <span className="text-slate-500 font-medium">Complexion:</span>
                <span className="font-bold text-slate-800">{data.complexion}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-1 col-span-2">
                <span className="text-slate-500 font-medium">Marital Status:</span>
                <span className="font-bold text-slate-800">{data.maritalStatus}</span>
              </div>
            </div>
          </div>

          {/* 4. Section 2: Religion-Specific Details (Hindu / Muslim / Christian) */}
          <div className="py-4 border-b border-slate-200/80">
            {religion === "Hindu" && (
              <>
                <h3 className={`text-xs sm:text-sm font-extrabold ${selectedTheme.accent} uppercase tracking-wider mb-3 flex items-center gap-2`}>
                  <span>🕉️</span> Horoscope & Astrological Details
                </h3>
                <div className="grid grid-cols-2 gap-y-2 gap-x-6 text-xs">
                  <div className="flex justify-between border-b border-slate-100 pb-1">
                    <span className="text-slate-500 font-medium">Gothram:</span>
                    <span className="font-bold text-slate-800">{data.gothram}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1">
                    <span className="text-slate-500 font-medium">Nakshatram (Star):</span>
                    <span className="font-bold text-slate-800">{data.star}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1">
                    <span className="text-slate-500 font-medium">Rasi:</span>
                    <span className="font-bold text-slate-800">{data.rasi}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1">
                    <span className="text-slate-500 font-medium">Lagnam:</span>
                    <span className="font-bold text-slate-800">{data.lagnam}</span>
                  </div>
                </div>
              </>
            )}

            {religion === "Muslim" && (
              <>
                <h3 className={`text-xs sm:text-sm font-extrabold ${selectedTheme.accent} uppercase tracking-wider mb-3 flex items-center gap-2`}>
                  <span>🕌</span> Islamic & Religious Background
                </h3>
                <div className="grid grid-cols-2 gap-y-2 gap-x-6 text-xs">
                  <div className="flex justify-between border-b border-slate-100 pb-1">
                    <span className="text-slate-500 font-medium">Islamic Sect:</span>
                    <span className="font-bold text-slate-800">{data.islamicSect}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1">
                    <span className="text-slate-500 font-medium">Jamath / Sub-caste:</span>
                    <span className="font-bold text-slate-800">{data.islamicJamath}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1 col-span-2">
                    <span className="text-slate-500 font-medium">Religious Practice / Namaz:</span>
                    <span className="font-bold text-slate-800">{data.namazStatus}</span>
                  </div>
                </div>
              </>
            )}

            {religion === "Christian" && (
              <>
                <h3 className={`text-xs sm:text-sm font-extrabold ${selectedTheme.accent} uppercase tracking-wider mb-3 flex items-center gap-2`}>
                  <span>⛪</span> Christian Church & Spiritual Background
                </h3>
                <div className="grid grid-cols-2 gap-y-2 gap-x-6 text-xs">
                  <div className="flex justify-between border-b border-slate-100 pb-1">
                    <span className="text-slate-500 font-medium">Denomination:</span>
                    <span className="font-bold text-slate-800">{data.christianDenomination}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1">
                    <span className="text-slate-500 font-medium">Baptism Status:</span>
                    <span className="font-bold text-slate-800">{data.baptismStatus}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1 col-span-2">
                    <span className="text-slate-500 font-medium">Parish / Church Name:</span>
                    <span className="font-bold text-slate-800">{data.churchName}</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* 5. Section 3: Education & Career */}
          <div className="py-4 border-b border-slate-200/80">
            <h3 className={`text-xs sm:text-sm font-extrabold ${selectedTheme.accent} uppercase tracking-wider mb-3 flex items-center gap-2`}>
              <span>🎓</span> Education & Professional Career
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6 text-xs">
              <div className="border-b border-slate-100 pb-1">
                <span className="text-slate-500 block text-[11px]">Highest Qualification:</span>
                <span className="font-bold text-slate-800">{data.education} — {data.educationDetail}</span>
              </div>
              <div className="border-b border-slate-100 pb-1">
                <span className="text-slate-500 block text-[11px]">Designation & Company:</span>
                <span className="font-bold text-slate-800">{data.job} at {data.company}</span>
              </div>
              <div className="border-b border-slate-100 pb-1">
                <span className="text-slate-500 block text-[11px]">Annual Package:</span>
                <span className="font-bold text-emerald-800 text-sm">{data.salary}</span>
              </div>
              <div className="border-b border-slate-100 pb-1">
                <span className="text-slate-500 block text-[11px]">Work Location:</span>
                <span className="font-bold text-slate-800">{data.workLocation}</span>
              </div>
            </div>
          </div>

          {/* 6. Section 4: Family Details & Properties */}
          <div className="py-4 border-b border-slate-200/80">
            <h3 className={`text-xs sm:text-sm font-extrabold ${selectedTheme.accent} uppercase tracking-wider mb-3 flex items-center gap-2`}>
              <span>👨‍👩‍👦</span> Family Lineage & Background
            </h3>
            <div className="space-y-1.5 text-xs">
              <div className="flex flex-col sm:flex-row sm:justify-between border-b border-slate-100 pb-1">
                <span className="text-slate-500 font-medium">Father's Name & Profession:</span>
                <span className="font-bold text-slate-800">{data.fatherName} ({data.fatherOccupation})</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between border-b border-slate-100 pb-1">
                <span className="text-slate-500 font-medium">Mother's Name & Profession:</span>
                <span className="font-bold text-slate-800">{data.motherName} ({data.motherOccupation})</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between border-b border-slate-100 pb-1">
                <span className="text-slate-500 font-medium">Siblings:</span>
                <span className="font-bold text-slate-800">{data.siblings}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between border-b border-slate-100 pb-1">
                <span className="text-slate-500 font-medium">Native Place / Residence:</span>
                <span className="font-bold text-slate-800">{data.nativePlace}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between border-b border-slate-100 pb-1">
                <span className="text-slate-500 font-medium">Assets & Properties:</span>
                <span className="font-bold text-slate-800">{data.properties}</span>
              </div>
            </div>
          </div>

          {/* 7. Section 5: Contact & Mana Vivaha Official Trust Seal */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
            <div className="space-y-1 text-center sm:text-left">
              <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block">
                📞 Contact & Address
              </span>
              <div className="font-bold text-slate-800 text-sm">
                {data.contactPerson}: {data.phone}
              </div>
              <div className="text-[11px] text-slate-600">
                Residential Address: {data.address}
              </div>
            </div>

            {/* Official Mana Vivaha Trust Seal */}
            <div className="flex items-center gap-3 bg-amber-50/90 p-3 rounded-2xl border border-amber-300 shadow-sm shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={SITE_CONFIG.logoImage}
                alt="మన వివాహ Verified"
                className="w-11 h-11 rounded-xl object-cover shadow-sm shrink-0"
              />
              <div className="text-left">
                <div className="text-[11px] font-black text-maroon telugu">
                  మన వివాహ (MANA VIVAHA)
                </div>
                <div className="text-[10px] text-slate-700 font-mono font-bold">
                  Profile ID: {profileId || "MV1001"} · Verified ✅
                </div>
                <div className="text-[10px] font-black text-emerald-800 flex items-center gap-1">
                  <span>📱 Helpline:</span>
                  <span>+91 63049 96088</span>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
