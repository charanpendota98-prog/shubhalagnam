"use client";

/**
 * ⚖️ PROFILE COMPARISON STUDIO — మన వివాహ సంబంధాల పోలిక స్టూడియో
 * =================================================================
 * Side-by-side comparison of 2 or 3 Telugu candidate profiles.
 * Compares Astro 36-Guna, Education, Salary, Gothram, Location,
 * with 1-Click WhatsApp Parent Deck and Printable Matrix Sheet.
 */
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { SITE_CONFIG } from "@/lib/site-config";
import { useLang } from "@/lib/lang";
import { WhatsAppIcon, TelegramIcon } from "@/components/BrandIcons";
import Reveal from "@/components/Reveal";
import SectionHeading from "@/components/SectionHeading";

type ProfileCard = {
  tsap_id: string;
  full_name: string;
  gender: string;
  age: number;
  height: string;
  caste: string;
  sub_caste?: string;
  gothram: string;
  star: string;
  rasi: string;
  education: string;
  job: string;
  salary: string;
  district: string;
  state: string;
  marital_status: string;
  photo_url?: string;
  gunamelanam_score?: number;
};

const SAMPLE_PROFILES: ProfileCard[] = [
  {
    tsap_id: "MV1001",
    full_name: "శ్రీలక్ష్మి కొణిదెల",
    gender: "Bride",
    age: 26,
    height: "5'4\"",
    caste: "కాపు",
    sub_caste: "తెలగ",
    gothram: "జనకుల",
    star: "రోహిణి",
    rasi: "వృషభం",
    education: "B.Tech (CSE) - CBIT",
    job: "Senior Software Engineer (Google)",
    salary: "₹22 Lakhs / year",
    district: "హైదరాబాద్",
    state: "తెలంగాణ",
    marital_status: "ఎన్నడూ పెళ్లి కాలేదు",
    photo_url: "/promo/bride-kapu.jpg",
    gunamelanam_score: 30,
  },
  {
    tsap_id: "MV1002",
    full_name: "సౌమ్య రాణి గారు",
    gender: "Bride",
    age: 25,
    height: "5'5\"",
    caste: "కాపు",
    sub_caste: "బలిజ",
    gothram: "ధనుంజయ",
    star: "మృగశిర",
    rasi: "మిథునం",
    education: "MS in Data Analytics - US",
    job: "Data Architect (Microsoft)",
    salary: "₹28 Lakhs / year",
    district: "విజయవాడ",
    state: "ఆంధ్రప్రదేశ్",
    marital_status: "ఎన్నడూ పెళ్లి కాలేదు",
    photo_url: "/promo/bride-card.jpg",
    gunamelanam_score: 28,
  },
  {
    tsap_id: "MV1003",
    full_name: "కీర్తన రెడ్డి",
    gender: "Bride",
    age: 27,
    height: "5'6\"",
    caste: "రెడ్డి",
    sub_caste: "మోటాటి",
    gothram: "కాశ్యపస",
    star: "ఉత్తరాభాద్ర",
    rasi: "మీనం",
    education: "MBA (Finance) - IIM",
    job: "Assistant Vice President (HDFC)",
    salary: "₹25 Lakhs / year",
    district: "గుంటూరు",
    state: "ఆంధ్రప్రదేశ్",
    marital_status: "ఎన్నడూ పెళ్లి కాలేదు",
    photo_url: "/promo/story-1.jpg",
    gunamelanam_score: 32,
  },
];

export default function ProfileCompareStudio() {
  const { lang } = useLang();
  const te = lang === "te";

  const [idInput1, setIdInput1] = useState("MV1001");
  const [idInput2, setIdInput2] = useState("MV1002");
  const [idInput3, setIdInput3] = useState("MV1003");
  const [showThird, setShowThird] = useState(true);

  const [profiles, setProfiles] = useState<ProfileCard[]>(SAMPLE_PROFILES);

  // Formatted WhatsApp Comparison Message
  const waDeckText = useMemo(() => {
    let msg = `⚖️ *మన వివాహ — 3 సంబంధాల పోలిక నివేదిక (Comparison Deck)* ⚖️\n\n`;
    profiles.slice(0, showThird ? 3 : 2).forEach((p, idx) => {
      msg += `*${idx + 1}. ${p.full_name} (${p.tsap_id})*\n`;
      msg += `💍 కులం/గోత్రం: ${p.caste} (${p.gothram})\n`;
      msg += `🌟 నక్షత్రం/రాశి: ${p.star} / ${p.rasi} (గుణమేళనం: ${p.gunamelanam_score || 28}/36)\n`;
      msg += `🎓 చదువు & ఉద్యోగం: ${p.education} · ${p.job}\n`;
      msg += `💰 జీతం & ప్రాంతం: ${p.salary} · ${p.district}\n`;
      msg += `🔗 వివరాలు: https://manavivaha.in/search/${p.tsap_id}\n\n`;
    });
    msg += `✨ తల్లిదండ్రుల నిర్ణయం కొరకు — మన వివాహ | manavivaha.in\n📞 హెల్ప్‌లైన్: +91 6304996088`;
    return msg;
  }, [profiles, showThird]);

  const waDeckUrl = `https://wa.me/?text=${encodeURIComponent(waDeckText)}`;

  const activeProfiles = showThird ? profiles.slice(0, 3) : profiles.slice(0, 2);

  return (
    <div className="min-h-screen bg-[#FDFBF7] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gold/15 border border-gold/40 text-maroon text-xs font-bold mb-3">
            ⚖️ మ్యాట్రిమోనీ పోలిక స్టూడియో • Side-by-Side Matrix
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-maroon">
            {te ? "సంబంధాల సమగ్ర పోలిక స్టూడియో" : "Profile Comparison Matrix"}
          </h1>
          <p className="mt-2 text-sm text-gray-700 max-w-2xl mx-auto">
            {te
              ? "తల్లిదండ్రులు మరియు అభ్యర్థులు 2 లేదా 3 సంబంధాలను పక్కపక్కనే పెట్టి చదువు, ఉద్యోగం, జీతం, గోత్రం మరియు గుణమేళనం స్కోర్లను సరిపోల్చుకోండి."
              : "Compare 2 or 3 candidate profiles side-by-side across Astro Gunamelanam, education, salary, gothram, and lifestyle."}
          </p>
        </div>

        {/* Input Bar & Actions */}
        <div className="bg-white p-5 rounded-3xl shadow-lg border border-gold/30 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-bold text-gray-700">🔍 {te ? "TSAP IDs:" : "Compare IDs:"}</span>
            <input
              type="text"
              value={idInput1}
              onChange={(e) => setIdInput1(e.target.value.toUpperCase())}
              placeholder="ID 1"
              className="w-24 px-3 py-1.5 text-xs font-mono font-bold bg-gray-50 border border-gray-200 rounded-xl outline-none"
            />
            <span className="text-xs text-gray-400">vs</span>
            <input
              type="text"
              value={idInput2}
              onChange={(e) => setIdInput2(e.target.value.toUpperCase())}
              placeholder="ID 2"
              className="w-24 px-3 py-1.5 text-xs font-mono font-bold bg-gray-50 border border-gray-200 rounded-xl outline-none"
            />
            {showThird && (
              <>
                <span className="text-xs text-gray-400">vs</span>
                <input
                  type="text"
                  value={idInput3}
                  onChange={(e) => setIdInput3(e.target.value.toUpperCase())}
                  placeholder="ID 3"
                  className="w-24 px-3 py-1.5 text-xs font-mono font-bold bg-gray-50 border border-gray-200 rounded-xl outline-none"
                />
              </>
            )}
            <button
              onClick={() => setShowThird(!showThird)}
              className="text-xs font-bold text-maroon hover:underline px-2 py-1 bg-maroon/5 rounded-lg"
            >
              {showThird ? "− 2 మాత్రమే పోల్చండి" : "+ 3వ సంబంధం జోడించండి"}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={waDeckUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#25D366] text-white rounded-full text-xs font-bold shadow hover:brightness-110 active:scale-95 transition"
            >
              <WhatsAppIcon className="w-4 h-4" mono />
              <span>WhatsApp లో Deck షేర్ చేయండి</span>
            </a>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-maroon text-white rounded-full text-xs font-bold shadow hover:bg-maroon-dark active:scale-95 transition no-print"
            >
              <span>🖨️ ప్రింట్ షీట్</span>
            </button>
          </div>
        </div>

        {/* Side-by-Side Comparison Cards */}
        <div className={`grid grid-cols-1 ${showThird ? "md:grid-cols-3" : "md:grid-cols-2"} gap-6`}>
          {activeProfiles.map((p, idx) => (
            <div
              key={p.tsap_id}
              className="bg-white rounded-3xl p-6 shadow-xl border-2 border-gold/30 hover:border-maroon/50 transition duration-300 relative space-y-4"
            >
              {/* Badge Rank */}
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <span className="px-3 py-1 rounded-full bg-maroon text-white text-[11px] font-extrabold">
                  సంబంధం #{idx + 1}
                </span>
                <span className="font-mono text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                  {p.tsap_id}
                </span>
              </div>

              {/* Photo & Name */}
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.photo_url || "/promo/bride-card.jpg"}
                  alt={p.full_name}
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-gold/40 shadow-sm"
                />
                <div>
                  <h3 className="text-base font-extrabold text-gray-900 leading-snug">
                    {p.full_name}
                  </h3>
                  <div className="text-xs text-gray-600">
                    {p.age} yrs · {p.height} · {p.marital_status}
                  </div>
                </div>
              </div>

              {/* Astro Score Badge */}
              <div className="p-3 bg-gradient-to-r from-amber-50 to-rose-50 rounded-2xl border border-gold/30 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold text-gray-500 uppercase">🪔 వేద గుణమేళనం స్కోర్</div>
                  <div className="text-sm font-extrabold text-maroon">
                    {p.star} ({p.rasi})
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-extrabold text-emerald-700">
                    {p.gunamelanam_score || 30}/36
                  </div>
                  <div className="text-[10px] font-bold text-emerald-800">ఉత్తమ పొంతన</div>
                </div>
              </div>

              {/* Key Attributes List */}
              <div className="space-y-2.5 text-xs text-gray-700 pt-2 border-t border-gray-100">
                <div className="flex justify-between py-1 border-b border-gray-50">
                  <span className="text-gray-500">కులం & గోత్రం:</span>
                  <span className="font-bold text-gray-900">{p.caste} ({p.gothram})</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-50">
                  <span className="text-gray-500">విద్యార్హత:</span>
                  <span className="font-bold text-gray-900 text-right">{p.education}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-50">
                  <span className="text-gray-500">ఉద్యోగం / కంపెనీ:</span>
                  <span className="font-bold text-gray-900 text-right">{p.job}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-50">
                  <span className="text-gray-500">వార్షిక ఆదాయం:</span>
                  <span className="font-extrabold text-emerald-700">{p.salary}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-50">
                  <span className="text-gray-500">స్వస్థలం & జిల్లా:</span>
                  <span className="font-bold text-gray-900">{p.district}, {p.state}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex gap-2">
                <Link
                  href={`/search/${p.tsap_id}`}
                  className="flex-1 text-center py-2 bg-maroon/10 hover:bg-maroon/20 text-maroon rounded-xl text-xs font-bold transition"
                >
                  పూర్తి ప్రొఫైల్
                </Link>
                <Link
                  href={`/search/${p.tsap_id}`}
                  className="flex-1 text-center py-2 bg-maroon hover:bg-maroon-dark text-white rounded-xl text-xs font-bold shadow transition"
                >
                  💌 Interest పంపు
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Detailed Side-by-Side Comparison Table */}
        <div className="bg-white rounded-3xl p-6 shadow-xl border border-gold/30 overflow-x-auto">
          <h3 className="text-lg font-extrabold text-maroon mb-4 flex items-center gap-2">
            <span>📊</span>
            <span>{te ? "సమగ్ర పోలిక పట్టిక (Side-by-Side Parameter Matrix)" : "Parameter Comparison Matrix"}</span>
          </h3>
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b-2 border-gold/30 bg-cream/60">
                <th className="p-3 font-extrabold text-maroon w-1/4">లక్షణాలు (Attribute)</th>
                {activeProfiles.map((p) => (
                  <th key={p.tsap_id} className="p-3 font-extrabold text-gray-900">
                    {p.full_name} ({p.tsap_id})
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="p-3 font-bold text-gray-500">🪔 వేద గుణమేళనం</td>
                {activeProfiles.map((p) => (
                  <td key={p.tsap_id} className="p-3 font-extrabold text-emerald-700">
                    {p.gunamelanam_score || 30} / 36 గుణాలు (ఉత్తమం)
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-3 font-bold text-gray-500">🎂 వయస్సు & ఎత్తు</td>
                {activeProfiles.map((p) => (
                  <td key={p.tsap_id} className="p-3 font-semibold text-gray-800">
                    {p.age} సంవత్సరాలు · {p.height}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-3 font-bold text-gray-500">🕉️ కులం & గోత్రం</td>
                {activeProfiles.map((p) => (
                  <td key={p.tsap_id} className="p-3 font-semibold text-gray-800">
                    {p.caste} ({p.gothram})
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-3 font-bold text-gray-500">🎓 విద్యా అర్హత</td>
                {activeProfiles.map((p) => (
                  <td key={p.tsap_id} className="p-3 font-semibold text-gray-800">
                    {p.education}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-3 font-bold text-gray-500">💼 ఉద్యోగం & హోదా</td>
                {activeProfiles.map((p) => (
                  <td key={p.tsap_id} className="p-3 font-semibold text-gray-800">
                    {p.job}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-3 font-bold text-gray-500">💰 వార్షిక ప్యాకేజీ</td>
                {activeProfiles.map((p) => (
                  <td key={p.tsap_id} className="p-3 font-extrabold text-emerald-800">
                    {p.salary}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-3 font-bold text-gray-500">📍 నివాసం & జిల్లా</td>
                {activeProfiles.map((p) => (
                  <td key={p.tsap_id} className="p-3 font-semibold text-gray-800">
                    {p.district}, {p.state}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
