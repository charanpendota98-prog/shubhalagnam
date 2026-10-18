"use client";


import { apiDisplayMessage, readApiJson } from "@/lib/api";
/**
 * 🎴 MANA VIVAHA — FREE TELUGU MARRIAGE BIODATA HD JPG STUDIO
 * ====================================================================
 * • 4 Regal Auspicious Themes (Royal Velvet Maroon 🪔, Temple Gold 🦚, Divine Rose 🌸, Imperial Navy 💎)
 * • Authentic Community Context (Hindu with Vedic Horoscope, Muslim with Nikah/Sect/Namaz, Christian with Church/Denomination)
 * • Zero Misplaced Slokas — Direct, respectful, ultra-clean details for each tradition
 * • Auto-fill from a registered Profile ID
 * • Optional QR Code linking to a profile when a registered Profile ID is entered
 * • 1-Click High-Definition JPG Download (Pixel-Perfect 2.5x Resolution for WhatsApp & Print)
 * • WhatsApp sharing with a clear note that biodata details are not independently verified
 */

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { toJpeg } from "html-to-image";
import QRCode from "qrcode";
import { useLang } from "@/lib/lang";
import { stateFullName } from "@/lib/telugu-data";
import { SITE_CONFIG } from "@/lib/site-config";
import { WhatsAppIcon } from "@/components/BrandIcons";

type Religion = "Hindu" | "Muslim" | "Christian" | "Other";
type LanguageCopy = { te: string[]; en: string[] };

const RELIGION_HEADERS: Record<Religion, LanguageCopy> = {
  Hindu: {
    te: ["|| శ్రీరస్తు — శుభమస్తు — అవిఘ్నమస్తు ||", "|| ఓం శ్రీ లక్ష్మీ వేంకటేశ్వరాయ నమః ||", "|| శ్రీ సీతారామాభ్యాం నమః ||", "|| శ్రీ విఘ్నేశ్వరాయ నమః ||"],
    en: ["|| Shrirastu · Shubhamastu · Avighnamastu ||", "|| Om Sri Lakshmi Venkateswara Namah ||", "|| Sri Sita Ramabhyam Namah ||", "|| Sri Vighneshwaraya Namah ||"],
  },
  Muslim: {
    te: ["🌙 بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ (Bismillahir Rahmanir Raheem) 🌙", "🌙 In the Name of Allah, Most Gracious, Most Merciful 🌙", "🌙 Nikah Mubarak — Blessed Muslim Matrimony 🌙"],
    en: ["🌙 In the name of Allah, the Most Gracious, the Most Merciful 🌙", "🌙 Nikah Mubarak · A blessed union 🌙", "🌙 With gratitude and prayer 🌙"],
  },
  Christian: {
    te: ["✝️ యేసుక్రీస్తు నామమున ✝️", '✝️ "And the two shall become one flesh" — Mark 10:8 ✝️', "✝️ Grace, Peace & Love in Christ Jesus ✝️"],
    en: ["✝️ In the name of Jesus Christ ✝️", '✝️ "And the two shall become one flesh" — Mark 10:8 ✝️', "✝️ Grace, peace, and love in Christ Jesus ✝️"],
  },
  Other: {
    te: ["💍 శుభ వివాహ బంధం 💍", "💍 మంగళకరమైన జీవిత భాగస్వామ్యం 💍"],
    en: ["💍 A blessed marriage union 💍", "💍 A lifelong partnership 💍"],
  },
};

const THEMES = [
  {
    id: "maroon",
    nameTe: "రాయల్ వెల్వెట్ మెరూన్",
    nameEn: "Royal Velvet Maroon",
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
    nameTe: "తిరుమల టెంపుల్ గోల్డ్",
    nameEn: "Tirumala Temple Gold",
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
    nameTe: "కళ్యాణ గులాబీ సిల్క్",
    nameEn: "Divine Silk Rose Gold",
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
    nameTe: "ఇంపీరియల్ రాయల్ నేవీ",
    nameEn: "Imperial Executive Navy",
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

  const [religion, setReligion] = useState<Religion>("Hindu");
  const [selectedTheme, setSelectedTheme] = useState(THEMES[0]);
  const headerText = (te ? RELIGION_HEADERS[religion].te : RELIGION_HEADERS[religion].en)[0];
  const [profileId, setProfileId] = useState("");
  const [lookupMessage, setLookupMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [qrData, setQrData] = useState<{ profileId: string; dataUrl: string } | null>(null);
  const qrDataUrl = qrData?.profileId === profileId.trim() ? qrData.dataUrl : "";

  const canvasRef = useRef<HTMLDivElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const queryAutofillHandled = useRef(false);

  // Form Data
  const [data, setData] = useState({
    fullName: "",
    gender: "Bride",
    maritalStatus: "",
    isSecondMarriage: false,
    dob: "",
    tob: "",
    height: "",
    complexion: "",
    motherTongue: "",
    caste: "",
    subCaste: "",
    // Hindu Astrological fields
    gothram: "",
    star: "",
    rasi: "",
    lagnam: "",
    dosham: "",
    // Muslim specific fields
    islamicSect: "",
    islamicJamath: "",
    namazStatus: "",
    // Christian specific fields
    christianDenomination: "",
    churchName: "",
    baptismStatus: "",
    // Career & Education
    education: "",
    educationDetail: "",
    job: "",
    company: "",
    salary: "",
    workLocation: "",
    // Family Lineage & Assets
    fatherName: "",
    fatherOccupation: "",
    motherName: "",
    motherOccupation: "",
    siblings: "",
    nativePlace: "",
    properties: "",
    familyValues: "",
    // Contact
    contactPerson: "",
    phone: "",
    email: "",
    address: "",
    photoUrl: "",
  });

  const biodataField = (value: unknown, fallback = "") => {
    const text = String(value ?? "").trim();
    if (!text) return "";
    return te ? text : apiDisplayMessage({ message_en: text }, false, fallback);
  };
  const displayBiodataField = (value: unknown) => biodataField(value, te ? "" : "Not available in English");
  const biodataMaritalStatus = (() => {
    const normalized = data.maritalStatus.trim().toLowerCase();
    if (te) return data.maritalStatus;
    if (["pelli kaledu", "never married", "single"].includes(normalized)) return "Never married";
    if (["widow", "widower", "widowed"].includes(normalized)) return "Widowed";
    if (["divorced", "awaiting divorce", "separated"].includes(normalized)) return normalized.replace(/^\\w/, (letter) => letter.toUpperCase());
    return biodataField(data.maritalStatus, "");
  })();

  const biodataTitle = data.isSecondMarriage
    ? (te ? "పునర్వివాహ బయోడేటా" : "Second Marriage Biodata")
    : religion === "Muslim"
    ? (te ? "నికాహ్ బయోడేటా" : "Nikah Biodata")
    : religion === "Christian"
    ? (te ? "క్రైస్తవ వివాహ బయోడేటా" : "Christian Marriage Biodata")
    : (te ? "వివాహ బయోడేటా" : "Marriage Biodata");

  // Generate a profile QR only when a profile ID has been supplied.
  useEffect(() => {
    const cleanId = profileId.trim();
    if (!cleanId) return;
    let cancelled = false;
    const targetUrl = `${SITE_CONFIG.siteUrl.replace(/\/+$/, "")}/search/${encodeURIComponent(cleanId)}`;
    QRCode.toDataURL(targetUrl, {
      width: 140,
      margin: 1,
      color: {
        dark: "#7A0C2E",
        light: "#FFFFFF",
      },
    })
      .then((url) => { if (!cancelled) setQrData({ profileId: cleanId, dataUrl: url }); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [profileId]);

  // Handle Religion Change
  const handleReligionChange = (r: Religion) => {
    setReligion(r);
    setData((prev) => ({ ...prev, caste: "", subCaste: "" }));
  };

  // Pre-fill from a member's Profile ID. Returned member values are kept as supplied.
  const fetchProfile = useCallback(async (id: string) => {
    const cleanId = id.trim().toUpperCase();
    if (!cleanId) {
      setLookupMessage({ ok: false, text: te ? "ప్రొఫైల్ ID నమోదు చేయండి." : "Enter a profile ID." });
      return;
    }
    setLoading(true);
    setLookupMessage(null);
    try {
      const res = await fetch(`/api/search/${encodeURIComponent(cleanId)}`);
      const json = await readApiJson(res);
      if (!res.ok) {
        setLookupMessage({
          ok: false,
          text: apiDisplayMessage(json, te, te ? "ప్రొఫైల్‌ను లోడ్ చేయలేకపోయాం." : "Could not load that profile."),
        });
        return;
      }
      const p = json.profile || json;
      if (!p?.full_name) {
        setLookupMessage({ ok: false, text: te ? "ఈ IDతో ప్రొఫైల్ దొరకలేదు." : "No profile was found for this ID." });
        return;
      }

      const mStatus = p.marital_status || "";
      const normalizedStatus = String(mStatus).toLowerCase();
      const isRemarriage = ["divorced", "widow", "remarriage", "second"].some((term) => normalizedStatus.includes(term));
      const pRel: Religion = p.religion === "Muslim"
        ? "Muslim"
        : p.religion === "Christian"
        ? "Christian"
        : p.religion === "Other"
        ? "Other"
        : "Hindu";
      setReligion(pRel);

      setData((prev) => ({
        ...prev,
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
        workLocation: p.work_location || [p.district, p.state ? stateFullName(p.state, te) : ""].filter(Boolean).join(", "),
        nativePlace: [p.district, p.state ? stateFullName(p.state, te) : ""].filter(Boolean).join(", "),
        photoUrl: p.photo_url || "",
      }));
      setLookupMessage({ ok: true, text: te ? "✅ ప్రొఫైల్ వివరాలు నింపబడ్డాయి." : "✅ Profile details loaded." });
    } catch {
      setLookupMessage({ ok: false, text: te ? "నెట్‌వర్క్ సమస్య. మళ్లీ ప్రయత్నించండి." : "A network error occurred. Please try again." });
    } finally {
      setLoading(false);
    }
  }, [te]);

  // Auto-fill from URL query parameter ?id=... on mount. This stays client-only to
  // avoid server/client hydration differences from reading window.location in render.
  useEffect(() => {
    if (queryAutofillHandled.current) return;
    queryAutofillHandled.current = true;
    const params = new URLSearchParams(window.location.search);
    const urlId = params.get("id")?.trim().toUpperCase();
    if (urlId) {
      setProfileId(urlId);
      void fetchProfile(urlId);
    }
  }, [fetchProfile]);

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
      alert(te ? "బయోడేటా JPG డౌన్‌లోడ్ కాలేదు. మళ్లీ ప్రయత్నించండి." : "The biodata JPG could not be downloaded. Please try again.");
    }
    setDownloading(false);
  };

  // Share a language-matched biodata summary. Member-entered names remain proper names;
  // other English-mode fields are hidden when an English value is unavailable.
  const shareOnWhatsApp = () => {
    const brand = te ? "మన వివాహ (Mana Vivaha)" : "Mana Vivaha (మన వివాహ)";
    const field = (value: unknown) => biodataField(value, te ? "" : "Not available in English");
    const headerPrefix = `👑 *${brand} — ${biodataTitle}*\n${headerText}`;
    const lines = [
      headerPrefix,
      "━━━━━━━━━━━━━━━━━━━━━━━━━━",
      data.fullName ? `👤 *${te ? "పేరు" : "Name"}:* ${data.fullName}${field(data.height) ? ` (${field(data.height)})` : ""}` : "",
      data.dob || field(data.height) ? `🎂 *${te ? "పుట్టిన తేదీ / ఎత్తు" : "Date of birth / height"}:* ${[data.dob, field(data.height)].filter(Boolean).join(" · ")}` : "",
      biodataMaritalStatus ? `💍 *${te ? "వైవాహిక స్థితి" : "Marital status"}:* ${biodataMaritalStatus}` : "",
      religion === "Muslim" ? [
        field(data.islamicSect) || field(data.islamicJamath) ? `🕌 *${te ? "ఫిర్కా / జమాత్" : "Sect / Jamath"}:* ${[field(data.islamicSect), field(data.islamicJamath)].filter(Boolean).join(" · ")}` : "",
        field(data.namazStatus) ? `🕌 *${te ? "నమాజ్ / దీన్ స్థితి" : "Prayer / faith practice"}:* ${field(data.namazStatus)}` : "",
      ].filter(Boolean).join("\n") : "",
      religion === "Christian" ? [
        field(data.christianDenomination) ? `⛪ *${te ? "తెగ / డినామినేషన్" : "Denomination"}:* ${field(data.christianDenomination)}` : "",
        field(data.churchName) ? `⛪ *${te ? "చర్చి / పారిష్" : "Church / parish"}:* ${field(data.churchName)}` : "",
        field(data.baptismStatus) ? `⛪ *${te ? "బాప్టిజం స్థితి" : "Baptism status"}:* ${field(data.baptismStatus)}` : "",
      ].filter(Boolean).join("\n") : "",
      religion === "Hindu" || religion === "Other" ? [
        [field(data.caste), field(data.subCaste), field(data.gothram)].some(Boolean)
          ? `💍 *${te ? "కులం / ఉపకులం / గోత్రం" : "Community / sub-community / gothram"}:* ${[field(data.caste), field(data.subCaste), field(data.gothram)].filter(Boolean).join(" · ")}` : "",
        [field(data.star), field(data.rasi), field(data.lagnam)].some(Boolean)
          ? `⭐ *${te ? "నక్షత్రం / రాశి / లగ్నం" : "Nakshatra / moon sign / ascendant"}:* ${[field(data.star), field(data.rasi), field(data.lagnam)].filter(Boolean).join(" · ")}` : "",
        field(data.dosham) ? `🪔 *${te ? "కుజ దోషం" : "Manglik status"}:* ${field(data.dosham)}` : "",
      ].filter(Boolean).join("\n") : "",
      field(data.education) || field(data.educationDetail) ? `🎓 *${te ? "విద్య" : "Education"}:* ${[field(data.education), field(data.educationDetail)].filter(Boolean).join(" · ")}` : "",
      field(data.job) || field(data.company) ? `💼 *${te ? "ఉద్యోగం / సంస్థ" : "Work / company"}:* ${[field(data.job), field(data.company)].filter(Boolean).join(" · ")}` : "",
      field(data.salary) ? `💰 *${te ? "వార్షిక ఆదాయం" : "Annual income"}:* ${field(data.salary)}` : "",
      field(data.workLocation) ? `📍 *${te ? "పని ప్రాంతం" : "Work location"}:* ${field(data.workLocation)}` : "",
      data.fatherName || field(data.fatherOccupation) || data.motherName || field(data.motherOccupation) || field(data.siblings) || field(data.nativePlace) || field(data.properties)
        ? `👨‍👩‍👧 *${te ? "కుటుంబ వివరాలు" : "Family details"}:*\n${[
            data.fatherName || field(data.fatherOccupation) ? `• ${te ? "తండ్రి" : "Father"}: ${[data.fatherName, field(data.fatherOccupation)].filter(Boolean).join(" · ")}` : "",
            data.motherName || field(data.motherOccupation) ? `• ${te ? "తల్లి" : "Mother"}: ${[data.motherName, field(data.motherOccupation)].filter(Boolean).join(" · ")}` : "",
            field(data.siblings) ? `• ${te ? "తోబుట్టువులు" : "Siblings"}: ${field(data.siblings)}` : "",
            field(data.nativePlace) ? `• ${te ? "సొంత ఊరు" : "Native place"}: ${field(data.nativePlace)}` : "",
            field(data.properties) ? `• ${te ? "ఆస్తులు" : "Assets"}: ${field(data.properties)}` : "",
          ].filter(Boolean).join("\n")}`
        : "",
      data.contactPerson || data.phone ? `📞 *${te ? "సంప్రదింపు" : "Contact"}:* ${[data.contactPerson, data.phone].filter(Boolean).join(" · ")}` : "",
      field(data.address) ? `📍 *${te ? "చిరునామా" : "Address"}:* ${field(data.address)}` : "",
      "━━━━━━━━━━━━━━━━━━━━━━━━━━",
      `ℹ️ *${te ? "ఈ బయోడేటాలోని వివరాలను సభ్యుడు అందించారు; అవి స్వతంత్రంగా ధృవీకరించబడలేదు." : "Biodata details were supplied by the member and have not been independently verified."}*`,
      profileId.trim() ? `👉 ${SITE_CONFIG.siteUrl.replace(/\/+$/, "")}/search/${encodeURIComponent(profileId.trim())}` : "",
    ].filter(Boolean);

    window.open(`https://wa.me/?text=${encodeURIComponent(lines.join("\n"))}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-dvh bg-[#FAF7F2] py-6 sm:py-10 px-3 sm:px-6 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* ================= TOP STUDIO CONTROLS (NO PRINT) ================= */}
        <div className="bg-white rounded-3xl p-5 sm:p-7 shadow-md border border-gold/40 space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <div className="inline-flex items-center gap-2 bg-amber-50 border border-gold/40 rounded-full px-3 py-1 text-xs font-bold text-maroon mb-1.5">
                <span>🎴</span> <span>{te ? "మన వివాహ రాయల్ బయోడేటా స్టూడియో" : "Mana Vivaha Marriage Biodata Studio"}</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-navy">
                {te ? "తెలుగు వివాహ బయోడేటా రూపొందించండి" : "Create a Marriage Biodata"}
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                {te ? "మీరు అందించిన వివరాలతో సంప్రదాయ శైలిలో బయోడేటాను రూపొందించి, JPGగా డౌన్‌లోడ్ చేయండి." : "Create a shareable biodata in a traditional style and download it as a JPG."}
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                {te ? "ప్రొఫైల్ నుంచి వచ్చిన వివరాలు సభ్యులు అందించినవే; అవి స్వతంత్రంగా ధృవీకరించబడలేదు." : "Profile details are member-submitted and are not independently verified."}
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
                {isEditing ? (te ? "👁️ ప్రివ్యూ చూపించండి" : "👁️ Preview") : (te ? "✏️ వివరాలను సవరించండి" : "✏️ Edit details")}
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
                    <span>{te ? "JPG సిద్ధమవుతోంది…" : "Preparing JPG…"}</span>
                  </>
                ) : (
                  <>
                    <span>📸</span>
                    <span>{te ? "HD JPG డౌన్‌లోడ్ చేయండి" : "Download HD JPG"}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={shareOnWhatsApp}
                className="px-5 py-2.5 rounded-2xl bg-[#25D366] text-white font-black text-xs sm:text-sm hover:brightness-105 transition shadow-md flex items-center gap-2"
              >
                <WhatsAppIcon className="w-4 h-4 fill-white" />
                <span>{te ? "WhatsAppలో పంచుకోండి" : "Share on WhatsApp"}</span>
              </button>
            </div>
          </div>

          {/* Quick Toolbar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1" htmlFor="biodata-profile-id">
                ⚡ {te ? "ప్రొఫైల్ IDతో వివరాలు నింపండి" : "Fill from profile ID"}
              </label>
              <div className="flex gap-2">
                <input
                  id="biodata-profile-id"
                  type="text"
                  placeholder={te ? "ప్రొఫైల్ ID" : "Profile ID"}
                  value={profileId}
                  onChange={(e) => { setProfileId(e.target.value.toUpperCase()); setLookupMessage(null); }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold focus:border-maroon outline-none uppercase"
                />
                <button
                  type="button"
                  onClick={() => fetchProfile(profileId)}
                  disabled={loading}
                  className="px-3.5 py-2 rounded-xl maroon-gradient text-white font-bold text-xs hover:brightness-105 transition shrink-0"
                >
                  {loading ? "…" : te ? "వివరాలు నింపండి" : "Load details"}
                </button>
              </div>
              {lookupMessage && <p role="status" aria-live="polite" className={`mt-1 text-[11px] font-semibold ${lookupMessage.ok ? "text-emerald-700" : "text-rose-700"}`}>{lookupMessage.text}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1" htmlFor="biodata-religion">
                🕌 / ⛪ / 🪔 {te ? "సంప్రదాయం / మతం" : "Tradition / religion"}
              </label>
              <select
                id="biodata-religion"
                value={religion}
                onChange={(e) => handleReligionChange(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:border-maroon outline-none bg-white"
              >
                <option value="Hindu">{te ? "హిందూ — జాతకం, గోత్రం" : "Hindu — horoscope and gothram"}</option>
                <option value="Muslim">{te ? "ముస్లిం — నికాహ్, శాఖ, నమాజ్" : "Muslim — nikah, sect, and prayer practice"}</option>
                <option value="Christian">{te ? "క్రైస్తవ — తెగ, చర్చి" : "Christian — denomination and church"}</option>
                <option value="Other">{te ? "ఇతర సంప్రదాయం" : "Other tradition"}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1" htmlFor="biodata-theme">
                🎨 {te ? "డిజైన్ థీమ్" : "Design theme"}
              </label>
              <select
                id="biodata-theme"
                value={selectedTheme.id}
                onChange={(e) => setSelectedTheme(THEMES.find((t) => t.id === e.target.value) || THEMES[0])}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:border-maroon outline-none bg-white"
              >
                {THEMES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {te ? t.nameTe : t.nameEn}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                📷 {te ? "ఐచ్ఛిక ఫోటో" : "Optional photo"}
              </label>
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 text-xs font-bold text-center"
              >
                {te ? "📁 ఫోటో అప్‌లోడ్ చేయండి" : "📁 Upload photo"}
              </button>
              <input aria-label={te ? "ఫోటో ఎంచుకోండి" : "Choose photo"} ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            </div>
          </div>
        </div>

        {/* ================= EDIT FORM ACCORDION (WHEN EDITING) ================= */}
        {isEditing && (
          <div className="bg-white rounded-3xl p-5 sm:p-7 shadow-md border border-gold/40 space-y-4 animate-fade">
            <h2 className="text-base font-black text-maroon border-b border-slate-100 pb-2">
              📝 {te ? "బయోడేటా వివరాలను సవరించండి" : "Edit biodata details"}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">{te ? "పూర్తి పేరు" : "Full name"}</label>
                <input aria-label={te ? "పూర్తి పేరు" : "Full name"}
                  type="text"
                  value={data.fullName}
                  onChange={(e) => setData({ ...data, fullName: e.target.value })}
                  className="w-full p-2 border rounded-xl"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">{te ? "పుట్టిన తేదీ" : "Date of birth"}</label>
                <input aria-label={te ? "పుట్టిన తేదీ" : "Date of birth"}
                  type="text"
                  value={data.dob}
                  onChange={(e) => setData({ ...data, dob: e.target.value })}
                  className="w-full p-2 border rounded-xl"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">{te ? "పుట్టిన సమయం" : "Time of birth"}</label>
                <input aria-label={te ? "పుట్టిన సమయం" : "Time of birth"}
                  type="text"
                  value={data.tob}
                  onChange={(e) => setData({ ...data, tob: e.target.value })}
                  className="w-full p-2 border rounded-xl"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">{te ? "ఎత్తు" : "Height"}</label>
                <input aria-label={te ? "ఎత్తు" : "Height"}
                  type="text"
                  value={data.height}
                  onChange={(e) => setData({ ...data, height: e.target.value })}
                  className="w-full p-2 border rounded-xl"
                />
              </div>

              {/* Religion Specific Form Fields */}
              {religion === "Hindu" && (
                <>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">{te ? "కులం" : "Community"}</label>
                    <input aria-label={te ? "కులం" : "Community"}
                      type="text"
                      value={data.caste}
                      onChange={(e) => setData({ ...data, caste: e.target.value })}
                      className="w-full p-2 border rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">{te ? "ఉపకులం" : "Sub-community"}</label>
                    <input aria-label={te ? "ఉపకులం" : "Sub-community"}
                      type="text"
                      value={data.subCaste}
                      onChange={(e) => setData({ ...data, subCaste: e.target.value })}
                      className="w-full p-2 border rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">{te ? "గోత్రం" : "Gothram"}</label>
                    <input aria-label={te ? "గోత్రం" : "Gothram"}
                      type="text"
                      value={data.gothram}
                      onChange={(e) => setData({ ...data, gothram: e.target.value })}
                      className="w-full p-2 border rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">{te ? "నక్షత్రం" : "Nakshatra"}</label>
                    <input aria-label={te ? "నక్షత్రం" : "Nakshatra"}
                      type="text"
                      value={data.star}
                      onChange={(e) => setData({ ...data, star: e.target.value })}
                      className="w-full p-2 border rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">{te ? "రాశి" : "Moon sign"}</label>
                    <input aria-label={te ? "రాశి" : "Moon sign"}
                      type="text"
                      value={data.rasi}
                      onChange={(e) => setData({ ...data, rasi: e.target.value })}
                      className="w-full p-2 border rounded-xl"
                    />
                  </div>
                </>
              )}

              {religion === "Muslim" && (
                <>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">{te ? "ఫిర్కా / శాఖ" : "Sect / maslak"}</label>
                    <input aria-label={te ? "ఫిర్కా / శాఖ" : "Sect / maslak"}
                      type="text"
                      value={data.islamicSect}
                      onChange={(e) => setData({ ...data, islamicSect: e.target.value })}
                      className="w-full p-2 border rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">{te ? "జమాత్ / శాఖ" : "Jamath / community"}</label>
                    <input aria-label={te ? "జమాత్ / శాఖ" : "Jamath / community"}
                      type="text"
                      value={data.islamicJamath}
                      onChange={(e) => setData({ ...data, islamicJamath: e.target.value })}
                      className="w-full p-2 border rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">{te ? "నమాజ్ / దీన్ ఆచరణ" : "Prayer / faith practice"}</label>
                    <input aria-label={te ? "నమాజ్ / దీన్ ఆచరణ" : "Prayer / faith practice"}
                      type="text"
                      value={data.namazStatus}
                      onChange={(e) => setData({ ...data, namazStatus: e.target.value })}
                      className="w-full p-2 border rounded-xl"
                    />
                  </div>
                </>
              )}

              {religion === "Christian" && (
                <>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">{te ? "తెగ / డినామినేషన్" : "Denomination"}</label>
                    <input aria-label={te ? "తెగ / డినామినేషన్" : "Denomination"}
                      type="text"
                      value={data.christianDenomination}
                      onChange={(e) => setData({ ...data, christianDenomination: e.target.value })}
                      className="w-full p-2 border rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">{te ? "చర్చి పేరు" : "Church / parish"}</label>
                    <input aria-label={te ? "చర్చి పేరు" : "Church / parish"}
                      type="text"
                      value={data.churchName}
                      onChange={(e) => setData({ ...data, churchName: e.target.value })}
                      className="w-full p-2 border rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">{te ? "బాప్టిజం / విశ్వాస స్థితి" : "Baptism / faith status"}</label>
                    <input aria-label={te ? "బాప్టిజం / విశ్వాస స్థితి" : "Baptism / faith status"}
                      type="text"
                      value={data.baptismStatus}
                      onChange={(e) => setData({ ...data, baptismStatus: e.target.value })}
                      className="w-full p-2 border rounded-xl"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="font-bold text-slate-700 block mb-1">{te ? "విద్య" : "Education"}</label>
                <input aria-label={te ? "విద్య" : "Education"}
                  type="text"
                  value={data.education}
                  onChange={(e) => setData({ ...data, education: e.target.value })}
                  className="w-full p-2 border rounded-xl"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">{te ? "ఉద్యోగం / హోదా" : "Job / title"}</label>
                <input aria-label={te ? "ఉద్యోగం / హోదా" : "Job / title"}
                  type="text"
                  value={data.job}
                  onChange={(e) => setData({ ...data, job: e.target.value })}
                  className="w-full p-2 border rounded-xl"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">{te ? "వార్షిక ఆదాయం" : "Annual income"}</label>
                <input aria-label={te ? "వార్షిక ఆదాయం" : "Annual income"}
                  type="text"
                  value={data.salary}
                  onChange={(e) => setData({ ...data, salary: e.target.value })}
                  className="w-full p-2 border rounded-xl"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">{te ? "తండ్రి పేరు / వృత్తి" : "Father's name / occupation"}</label>
                <input aria-label={te ? "తండ్రి పేరు / వృత్తి" : "Father's name / occupation"}
                  type="text"
                  value={data.fatherName}
                  onChange={(e) => setData({ ...data, fatherName: e.target.value })}
                  className="w-full p-2 border rounded-xl"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">{te ? "తల్లి పేరు / వృత్తి" : "Mother's name / occupation"}</label>
                <input aria-label={te ? "తల్లి పేరు / వృత్తి" : "Mother's name / occupation"}
                  type="text"
                  value={data.motherName}
                  onChange={(e) => setData({ ...data, motherName: e.target.value })}
                  className="w-full p-2 border rounded-xl"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">{te ? "సంప్రదింపు ఫోన్ నంబర్" : "Contact phone number"}</label>
                <input aria-label={te ? "సంప్రదింపు ఫోన్ నంబర్" : "Contact phone number"}
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
            {/* Contextual Watermark Background Motifs */}
            {religion === "Muslim" ? (
              <>
                <div className="absolute top-0 left-0 w-32 h-32 opacity-10 pointer-events-none text-8xl">🌙</div>
                <div className="absolute top-0 right-0 w-32 h-32 opacity-10 pointer-events-none text-8xl">⭐️</div>
                <div className="absolute bottom-16 left-0 w-32 h-32 opacity-10 pointer-events-none text-8xl">🕌</div>
                <div className="absolute bottom-16 right-0 w-32 h-32 opacity-10 pointer-events-none text-8xl">🤲</div>
              </>
            ) : religion === "Christian" ? (
              <>
                <div className="absolute top-0 left-0 w-32 h-32 opacity-10 pointer-events-none text-8xl">✝️</div>
                <div className="absolute top-0 right-0 w-32 h-32 opacity-10 pointer-events-none text-8xl">🕊️</div>
                <div className="absolute bottom-16 left-0 w-32 h-32 opacity-10 pointer-events-none text-8xl">⛪</div>
                <div className="absolute bottom-16 right-0 w-32 h-32 opacity-10 pointer-events-none text-8xl">📖</div>
              </>
            ) : (
              <>
                <div className="absolute top-0 left-0 w-32 h-32 opacity-10 pointer-events-none text-8xl">🪔</div>
                <div className="absolute top-0 right-0 w-32 h-32 opacity-10 pointer-events-none text-8xl">🌸</div>
                <div className="absolute bottom-16 left-0 w-32 h-32 opacity-10 pointer-events-none text-8xl">⚜️</div>
                <div className="absolute bottom-16 right-0 w-32 h-32 opacity-10 pointer-events-none text-8xl">🦚</div>
              </>
            )}

            {/* 1. Auspicious Top Header Banner */}
            <div className="text-center pb-4 border-b-2 border-dashed border-amber-300/80">
              <div className="flex items-center justify-center gap-2 mb-1">
                  <span className="text-xl">
                  {religion === "Muslim" ? "🌙" : religion === "Christian" ? "✝️" : "🙏"}
                </span>
                <span lang={te ? "te-IN" : "en-IN"} className="text-xs sm:text-sm font-bold tracking-widest text-amber-950 font-mono">
                  {headerText}
                </span>
                <span className="text-xl">
                  {religion === "Muslim" ? "🌙" : religion === "Christian" ? "✝️" : "🙏"}
                </span>
              </div>

              {/* Title Badge */}
              <div className={`inline-block mt-1 px-8 py-2 rounded-full ${selectedTheme.headerBg} shadow-sm font-black text-sm tracking-wider uppercase`}>
                {biodataTitle}
              </div>
            </div>

            {/* 2. Photo & Key Identity Strip */}
            <div className="flex items-center gap-6 pb-4 border-b border-slate-200">
              {/* Photo with Luxury Frame */}
              <div className="relative shrink-0">
                <div className={`w-32 h-40 rounded-2xl overflow-hidden border-2 ${selectedTheme.frameBorder} shadow-md bg-white p-1`}>
                  {data.photoUrl ? (
                    <Image src={data.photoUrl} alt={data.fullName ? (te ? `${data.fullName} ప్రొఫైల్ ఫోటో` : `${data.fullName} profile photo`) : (te ? "ప్రొఫైల్ ఫోటో" : "Profile photo")} width={128} height={160} unoptimized className="w-full h-full object-cover rounded-xl" />
                  ) : (
                    <div className="w-full h-full rounded-xl bg-slate-100 text-slate-500 flex flex-col items-center justify-center gap-2 text-center text-xs font-semibold" aria-label={te ? "ప్రొఫైల్ ఫోటో జోడించలేదు" : "No profile photo added"}>
                      <span aria-hidden="true" className="text-3xl">📷</span>
                      <span>{te ? "ఫోటో జోడించలేదు" : "Photo not added"}</span>
                    </div>
                  )}
                </div>
                <span className="absolute -bottom-2 -right-2 bg-slate-700 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow border border-white">
                  {te ? "వివరాలు ధృవీకరించబడలేదు" : "Details not verified"}
                </span>
              </div>

              {/* Name & Quick Badges */}
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <h2 className={`text-2xl font-black ${selectedTheme.accent} tracking-tight truncate`}>{data.fullName}</h2>
                  <span className="font-mono text-xs font-black bg-amber-50 text-maroon border border-gold/40 px-3 py-1 rounded-xl shadow-xs">
                    ID: {profileId || "—"}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${selectedTheme.pill}`}>
                    {religion === "Muslim" ? "🕌 Muslim" : religion === "Christian" ? "⛪ Christian" : `💍 ${displayBiodataField(data.caste)} ${displayBiodataField(data.subCaste) ? `(${displayBiodataField(data.subCaste)})` : ""}`}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${selectedTheme.pill}`}>
                    🎂 {data.dob} ({displayBiodataField(data.height)})
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${selectedTheme.pill}`}>
                    🎓 {displayBiodataField(data.education)}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${selectedTheme.pill}`}>
                    💼 {displayBiodataField(data.job)}
                  </span>
                </div>

                <div className="text-xs text-slate-700 font-medium pt-1 flex items-center justify-between">
                  <span>🏢 <b className="text-slate-900">{displayBiodataField(data.company)}</b> • 📍 {displayBiodataField(data.workLocation)}</span>
                  <span className="text-emerald-700 font-black">💰 {displayBiodataField(data.salary)}</span>
                </div>
              </div>
            </div>

            {/* 3. Section 1: Community / Astrology / Deen Details */}
            <div className="space-y-3 pb-4 border-b border-slate-200">
              {religion === "Muslim" ? (
                <>
                  <h3 className={`text-xs font-black ${selectedTheme.accent} uppercase tracking-wider flex items-center gap-1.5`}>
                    <span>🕌</span> <span>{te ? "ఇస్లామిక్ మరియు కమ్యూనిటీ వివరాలు" : "Islamic and community details"}</span>
                  </h3>
                  <div className="grid grid-cols-3 gap-y-2 gap-x-4 text-xs bg-emerald-50/50 p-3 rounded-2xl border border-emerald-200">
                    <div>
                      <span className="text-slate-500 font-medium block">{te ? "ఫిర్కా / శాఖ" : "Sect / maslak"}</span>
                      <span className="font-bold text-slate-900">{displayBiodataField(data.islamicSect) || "—"}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block">{te ? "జమాత్ / శాఖ" : "Jamath"}</span>
                      <span className="font-bold text-slate-900">{displayBiodataField(data.islamicJamath) || "—"}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block">{te ? "నమాజ్ / దీన్ స్థితి" : "Prayer / faith practice"}</span>
                      <span className="font-bold text-emerald-800">{displayBiodataField(data.namazStatus) || "—"}</span>
                    </div>
                  </div>
                </>
              ) : religion === "Christian" ? (
                <>
                  <h3 className={`text-xs font-black ${selectedTheme.accent} uppercase tracking-wider flex items-center gap-1.5`}>
                    <span>⛪</span> <span>{te ? "క్రైస్తవ తెగ మరియు చర్చి వివరాలు" : "Christian denomination and church"}</span>
                  </h3>
                  <div className="grid grid-cols-3 gap-y-2 gap-x-4 text-xs bg-indigo-50/50 p-3 rounded-2xl border border-indigo-200">
                    <div>
                      <span className="text-slate-500 font-medium block">{te ? "తెగ / డినామినేషన్" : "Denomination"}</span>
                      <span className="font-bold text-slate-900">{displayBiodataField(data.christianDenomination) || "—"}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block">{te ? "చర్చి పేరు / ప్రాంతం" : "Church / parish"}</span>
                      <span className="font-bold text-slate-900">{displayBiodataField(data.churchName) || "—"}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block">{te ? "బాప్టిజం స్థితి" : "Baptism status"}</span>
                      <span className="font-bold text-indigo-900">{displayBiodataField(data.baptismStatus) || "—"}</span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <h3 className={`text-xs font-black ${selectedTheme.accent} uppercase tracking-wider flex items-center gap-1.5`}>
                    <span>⭐</span> <span>{te ? "కమ్యూనిటీ మరియు జ్యోతిష వివరాలు" : "Community and horoscope details"}</span>
                  </h3>
                  <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] leading-5 text-amber-950">
                    {te ? "క్రింది వివరాలు profile owner నమోదు చేసిన references మాత్రమే; పూర్తి లేదా verify అయిన జాతకం కాదు. అసలైన పత్రాన్ని స్వతంత్రంగా పరిశీలించండి." : "These are profile-owner-entered references only, not a complete or verified horoscope. Review any original document independently."}
                  </p>
                  <div className="grid grid-cols-3 gap-y-2 gap-x-4 text-xs bg-amber-50/40 p-3 rounded-2xl border border-gold/30">
                    <div>
                      <span className="text-slate-500 font-medium block">{te ? "కులం / ఉపకులం" : "Community / sub-community"}</span>
                      <span className="font-bold text-slate-900">{displayBiodataField(data.caste)} {displayBiodataField(data.subCaste) ? `(${displayBiodataField(data.subCaste)})` : ""}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block">{te ? "గోత్రం" : "Gothram"}</span>
                      <span className="font-bold text-slate-900">{displayBiodataField(data.gothram) || "—"}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block">{te ? "నక్షత్రం" : "Nakshatra"}</span>
                      <span className="font-bold text-maroon">⭐ {displayBiodataField(data.star) || "—"}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block">{te ? "రాశి" : "Moon sign"}</span>
                      <span className="font-bold text-slate-900">{displayBiodataField(data.rasi) || "—"}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block">{te ? "లగ్నం" : "Ascendant"}</span>
                      <span className="font-bold text-slate-900">{displayBiodataField(data.lagnam) || "—"}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block">{te ? "కుజ దోషం (owner-entered reference)" : "Manglik status (owner-entered reference)"}</span>
                      <span className="font-bold text-emerald-800">{displayBiodataField(data.dosham) || "—"}</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* 4. Section 2: విద్య, ఉద్యోగం & కుటుంబ వివరాలు (Career & Family Details) */}
            <div className="space-y-3 pb-4 border-b border-slate-200">
              <h3 className={`text-xs font-black ${selectedTheme.accent} uppercase tracking-wider flex items-center gap-1.5`}>
                <span>👨‍👩‍👧</span> <span>{te ? "కుటుంబ నేపథ్యం మరియు ఆస్తులు" : "Family background and assets"}</span>
              </h3>
              <div className="grid grid-cols-2 gap-y-2.5 gap-x-6 text-xs">
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span className="text-slate-500 font-medium">{te ? "తండ్రి పేరు / వృత్తి" : "Father's name / occupation"}</span>
                  <span className="font-bold text-slate-900">{data.fatherName} ({displayBiodataField(data.fatherOccupation)})</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span className="text-slate-500 font-medium">{te ? "తల్లి పేరు / వృత్తి" : "Mother's name / occupation"}</span>
                  <span className="font-bold text-slate-900">{data.motherName} ({displayBiodataField(data.motherOccupation)})</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span className="text-slate-500 font-medium">{te ? "తోబుట్టువులు" : "Siblings"}</span>
                  <span className="font-bold text-slate-900">{displayBiodataField(data.siblings)}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span className="text-slate-500 font-medium">{te ? "సొంత ఊరు" : "Native place"}</span>
                  <span className="font-bold text-slate-900">{displayBiodataField(data.nativePlace)}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1 col-span-2">
                  <span className="text-slate-500 font-medium">{te ? "స్థిరాస్తులు / భూములు" : "Property / land"}</span>
                  <span className="font-bold text-slate-900">{displayBiodataField(data.properties)}</span>
                </div>
              </div>
            </div>

            {/* 5. Section 3: సంప్రదించవలసిన వివరాలు (Contact Details) */}
            <div className="space-y-2 pb-4 border-b border-slate-200">
              <h3 className={`text-xs font-black ${selectedTheme.accent} uppercase tracking-wider flex items-center gap-1.5`}>
                <span>📞</span> <span>{te ? "సంప్రదింపు వివరాలు" : "Contact information"}</span>
              </h3>
              <div className="grid grid-cols-2 gap-y-2 gap-x-6 text-xs bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-slate-500 font-medium block">{te ? "సంప్రదించవలసిన వ్యక్తి" : "Contact person"}</span>
                  <span className="font-bold text-slate-900">{data.contactPerson} ({data.phone})</span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium block">{te ? "చిరునామా" : "Address"}</span>
                  <span className="font-bold text-slate-900">{displayBiodataField(data.address)}</span>
                </div>
              </div>
            </div>

            {/* ================= 6. THE TROJAN HORSE VIRAL FOOTER (MANA VIVAHA VERIFICATION BAR) ================= */}
            <div className="bg-gradient-to-r from-amber-100/90 via-amber-50 to-amber-100/90 border-2 border-gold/60 rounded-2xl p-4 flex items-center justify-between gap-4 shadow-sm">
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-base">👑</span>
                  <span className="font-black text-xs text-maroon uppercase tracking-wide">
                    {te ? "మన వివాహ (Mana Vivaha) — ప్రొఫైల్ లింక్" : "Mana Vivaha (మన వివాహ) — Profile link"}
                  </span>
                </div>
                <p className="text-[11px] text-slate-700 font-medium leading-relaxed telugu">
                  {profileId.trim()
                    ? (te
                      ? <>ప్రొఫైల్ వివరాల కోసం <b>QR కోడ్ స్కాన్ చేయండి</b> లేదా <b>{SITE_CONFIG.domain}/search/{profileId}</b> చూడండి. వివరాలు సభ్యులు అందించినవి; స్వతంత్రంగా ధృవీకరించబడలేదు.</>
                      : <>Scan the <b>QR code</b> or visit <b>{SITE_CONFIG.domain}/search/{profileId}</b> to view the profile. Details are member-submitted and not independently verified.</>)
                    : (te
                      ? <>QR కోడ్ కోసం Profile ID నమోదు చేయండి. బయోడేటా వివరాలు స్వతంత్రంగా ధృవీకరించబడలేదు.</>
                      : <>Enter a profile ID to generate a QR code. Biodata details are not independently verified.</>)}
                </p>
                <div className="text-[10px] text-slate-500 font-bold pt-0.5">
                  {te ? "పరిచయం ముందుగా సభ్యులు అందించిన వివరాలను స్వతంత్రంగా నిర్ధారించుకోండి." : "Verify member-submitted details independently before making contact."}
                </div>
              </div>

              {/* Dynamic Scannable QR Code */}
              <div className="shrink-0 text-center bg-white p-1.5 rounded-xl border border-gold/50 shadow-xs">
                {qrDataUrl ? (
                  <Image src={qrDataUrl} alt={te ? "QR కోడ్ స్కాన్ చేయండి" : "Scan the QR code"} width={80} height={80} unoptimized className="w-20 h-20" />
                ) : (
                  <div className="w-20 h-20 bg-slate-100 flex items-center justify-center text-xs">QR</div>
                )}
                <span className="text-[9px] font-extrabold text-maroon block mt-0.5">{qrDataUrl ? (te ? "చూడటానికి స్కాన్ చేయండి" : "SCAN TO VIEW") : (te ? "PROFILE ID జోడించండి" : "ADD PROFILE ID")}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
