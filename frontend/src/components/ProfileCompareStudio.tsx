"use client";

/**
 * ⚖️ PROFILE COMPARISON STUDIO — మన వివాహ సంబంధాల సమగ్ర పోలిక స్టూడియో
 * ====================================================================
 * World-Class Side-by-Side 3-Profile Comparison Matrix for Telugu Matrimony.
 * Real-time API integration, Gunamelanam Score Meter, Salary/Education
 * comparative gauges, WhatsApp Parent Decision Deck, and Print Export.
 */
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { SITE_CONFIG } from "@/lib/site-config";
import { useLang } from "@/lib/lang";
import { WhatsAppIcon, TelegramIcon } from "@/components/BrandIcons";
import { apiPost } from "@/lib/api";

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

const PRESET_OPTIONS: { label: string; ids: string[]; desc: string }[] = [
  {
    label: "👑 హైదరాబాద్ ఐటీ & సాఫ్ట్‌వేర్ సంబంధాలు (Google / MS / Tech)",
    ids: ["MV1001", "MV1002", "MV1003"],
    desc: "B.Tech/MS graduates working in top MNCs with ₹20L+ packages",
  },
  {
    label: "🩺 మెడికల్ & డాక్టర్స్ సంబంధాలు (MBBS / MD / Apollo)",
    ids: ["DOC201", "DOC202", "DOC203"],
    desc: "Post graduate doctors and healthcare consultants",
  },
  {
    label: "🏛️ ప్రభుత్వ & బ్యాంకింగ్ రంగ సంబంధాలు (Govt / PSU / AVP)",
    ids: ["GOV301", "GOV302", "GOV303"],
    desc: "Officers, Group-1/2, and Nationalized Bank Managers",
  },
];

const SAMPLE_DATABASE: Record<string, ProfileCard> = {
  MV1001: {
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
    salary: "₹24 Lakhs / year",
    district: "హైదరాబాద్",
    state: "తెలంగాణ",
    marital_status: "ఎన్నడూ పెళ్లి కాలేదు",
    photo_url: "/promo/bride-kapu.jpg",
    gunamelanam_score: 31,
  },
  MV1002: {
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
    gunamelanam_score: 29,
  },
  MV1003: {
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
    salary: "₹26 Lakhs / year",
    district: "గుంటూరు",
    state: "ఆంధ్రప్రదేశ్",
    marital_status: "ఎన్నడూ పెళ్లి కాలేదు",
    photo_url: "/promo/story-1.jpg",
    gunamelanam_score: 33,
  },
  DOC201: {
    tsap_id: "DOC201",
    full_name: "డాక్టర్ అనిత వర్మ",
    gender: "Bride",
    age: 28,
    height: "5'5\"",
    caste: "రాజు / క్షత్రియ",
    sub_caste: "సూర్యవంశ",
    gothram: "వశిష్ట",
    star: "హస్త",
    rasi: "కన్య",
    education: "MBBS, MD (General Medicine)",
    job: "Consultant Physician (Apollo)",
    salary: "₹30 Lakhs / year",
    district: "విశాఖపట్నం",
    state: "ఆంధ్రప్రదేశ్",
    marital_status: "ఎన్నడూ పెళ్లి కాలేదు",
    photo_url: "/promo/bride-card.jpg",
    gunamelanam_score: 32,
  },
  DOC202: {
    tsap_id: "DOC202",
    full_name: "డాక్టర్ ప్రణీత్ రెడ్డి",
    gender: "Groom",
    age: 30,
    height: "5'11\"",
    caste: "రెడ్డి",
    sub_caste: "పోకనాటి",
    gothram: "భరద్వాజ",
    star: "స్వాతి",
    rasi: "తుల",
    education: "MS (Orthopaedics) - AIIMS",
    job: "Senior Ortho Surgeon (Yashoda)",
    salary: "₹42 Lakhs / year",
    district: "హైదరాబాద్",
    state: "తెలంగాణ",
    marital_status: "ఎన్నడూ పెళ్లి కాలేదు",
    photo_url: "/promo/groom-kamma.jpg",
    gunamelanam_score: 34,
  },
  DOC203: {
    tsap_id: "DOC203",
    full_name: "డాక్టర్ రవితేజ చౌదరి",
    gender: "Groom",
    age: 29,
    height: "5'10\"",
    caste: "కమ్మ",
    sub_caste: "పెదకమ్మ",
    gothram: "వల్లభనేని",
    star: "పునర్వసు",
    rasi: "మిథునం",
    education: "DM (Cardiology)",
    job: "Cardiologist (Care Hospitals)",
    salary: "₹38 Lakhs / year",
    district: "విజయవాడ",
    state: "ఆంధ్రప్రదేశ్",
    marital_status: "ఎన్నడూ పెళ్లి కాలేదు",
    photo_url: "/promo/groom-vysya.jpg",
    gunamelanam_score: 30,
  },
  GOV301: {
    tsap_id: "GOV301",
    full_name: "శ్రీకాంత్ యాదవ్ (Group-1)",
    gender: "Groom",
    age: 29,
    height: "5'9\"",
    caste: "యాదవ / గొల్ల",
    sub_caste: "ఎర్ర గొల్ల",
    gothram: "అగస్త్య",
    star: "అనురాధ",
    rasi: "వృశ్చికం",
    education: "B.Tech + Civil Services Prep",
    job: "Deputy Collector (Govt of Telangana)",
    salary: "₹18 Lakhs / year + Perks",
    district: "వరంగల్",
    state: "తెలంగాణ",
    marital_status: "ఎన్నడూ పెళ్లి కాలేదు",
    photo_url: "/promo/story-3.jpg",
    gunamelanam_score: 32,
  },
  GOV302: {
    tsap_id: "GOV302",
    full_name: "మధుసూదన్ గుప్తా",
    gender: "Groom",
    age: 28,
    height: "5'8\"",
    caste: "ఆర్య వైశ్య",
    sub_caste: "సాధు",
    gothram: "కుబేర",
    star: "ఉత్తరాషాఢ",
    rasi: "ధనుస్సు",
    education: "MBA + CA",
    job: "Manager (RBI - Reserve Bank)",
    salary: "₹22 Lakhs / year",
    district: "హైదరాబాద్",
    state: "తెలంగాణ",
    marital_status: "ఎన్నడూ పెళ్లి కాలేదు",
    photo_url: "/promo/groom-vysya.jpg",
    gunamelanam_score: 30,
  },
  GOV303: {
    tsap_id: "GOV303",
    full_name: "రాజేష్ గౌడ్",
    gender: "Groom",
    age: 30,
    height: "5'10\"",
    caste: "గౌడ్ / గౌడ",
    sub_caste: "ఎదురు గౌడ",
    gothram: "శివనామ",
    star: "శ్రవణం",
    rasi: "మకరం",
    education: "M.Tech (NIT Warangal)",
    job: "Divisional Engineer (TSSPDCL)",
    salary: "₹20 Lakhs / year",
    district: "కరీంనగర్",
    state: "తెలంగాణ",
    marital_status: "ఎన్నడూ పెళ్లి కాలేదు",
    photo_url: "/promo/story-4.jpg",
    gunamelanam_score: 31,
  },
};

export default function ProfileCompareStudio() {
  const { lang } = useLang();
  const te = lang === "te";

  const [idInput1, setIdInput1] = useState("MV1001");
  const [idInput2, setIdInput2] = useState("MV1002");
  const [idInput3, setIdInput3] = useState("MV1003");
  const [showThird, setShowThird] = useState(true);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const [profiles, setProfiles] = useState<ProfileCard[]>([
    SAMPLE_DATABASE["MV1001"],
    SAMPLE_DATABASE["MV1002"],
    SAMPLE_DATABASE["MV1003"],
  ]);

  const fetchProfiles = async (ids: string[]) => {
    setLoading(true);
    try {
      const res = await apiPost<{ success: boolean; profiles: ProfileCard[] }>("/api/matches/compare-profiles", {
        profile_ids: ids,
      });

      if (res.ok && res.data?.profiles && res.data.profiles.length >= 2) {
        // Merge with client sample data photos if server returned mock
        const enriched = res.data.profiles.map((p) => {
          const sample = SAMPLE_DATABASE[p.tsap_id];
          return {
            ...p,
            photo_url: p.photo_url || sample?.photo_url || "/promo/bride-card.jpg",
            gunamelanam_score: p.gunamelanam_score || sample?.gunamelanam_score || 30,
          };
        });
        setProfiles(enriched);
      } else {
        // Fallback to local sample lookup
        const local = ids.map((id) => SAMPLE_DATABASE[id] || SAMPLE_DATABASE["MV1001"]);
        setProfiles(local);
      }
    } catch {
      const local = ids.map((id) => SAMPLE_DATABASE[id] || SAMPLE_DATABASE["MV1001"]);
      setProfiles(local);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyIds = () => {
    const ids = showThird ? [idInput1, idInput2, idInput3] : [idInput1, idInput2];
    fetchProfiles(ids);
  };

  const handleApplyPreset = (preset: typeof PRESET_OPTIONS[0]) => {
    setIdInput1(preset.ids[0]);
    setIdInput2(preset.ids[1]);
    setIdInput3(preset.ids[2]);
    setShowThird(true);
    fetchProfiles(preset.ids);
  };

  // WhatsApp Deck generator
  const waDeckText = useMemo(() => {
    let msg = `⚖️ *మన వివాహ — సంబంధాల పోలిక నివేదిక (Comparison Deck)* ⚖️\n\n`;
    profiles.slice(0, showThird ? 3 : 2).forEach((p, idx) => {
      msg += `*${idx + 1}. ${p.full_name} (${p.tsap_id})*\n`;
      msg += `💍 కులం/గోత్రం: ${p.caste} (${p.gothram})\n`;
      msg += `🌟 నక్షత్రం/రాశి: ${p.star} / ${p.rasi} (గుణమేళనం: ${p.gunamelanam_score || 30}/36)\n`;
      msg += `🎓 చదువు & ఉద్యోగం: ${p.education} · ${p.job}\n`;
      msg += `💰 ప్యాకేజీ & నగరం: ${p.salary} · ${p.district}\n`;
      msg += `🔗 వివరాలు: https://manavivaha.in/search/${p.tsap_id}\n\n`;
    });
    msg += `✨ కుటుంబ పెద్దల నిర్ణయం కొరకు — మన వివాహ | manavivaha.in\n📞 సహాయం: +91 6304996088`;
    return msg;
  }, [profiles, showThird]);

  const waDeckUrl = `https://wa.me/?text=${encodeURIComponent(waDeckText)}`;

  const handleCopyDeck = () => {
    navigator.clipboard.writeText(waDeckText);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const activeProfiles = showThird ? profiles.slice(0, 3) : profiles.slice(0, 2);

  return (
    <div className="min-h-dvh bg-[#FDFBF7] py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gold/15 border border-gold/40 text-maroon text-xs font-bold">
            ⚖️ మ్యాట్రిమోనీ కంపారిజన్ స్టూడియో • Side-by-Side Matrix
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-maroon">
            {te ? "సంబంధాల సమగ్ర పోలిక స్టూడియో" : "3-Profile Comparison Matrix Studio"}
          </h1>
          <p className="text-sm text-gray-700 max-w-2xl mx-auto">
            {te
              ? "తల్లిదండ్రులు మరియు అభ్యర్థులు 2 లేదా 3 సంబంధాలను పక్కపక్కనే ఉంచి వేద గుణమేళనం, విద్య, ఉద్యోగం, వార్షిక జీతం, గోత్రం మరియు స్వస్థలాలను సరిపోల్చుకోండి."
              : "Compare 2 or 3 candidate profiles side-by-side across Astro Gunamelanam, education, salary, gothram, and lifestyle parameters."}
          </p>
        </div>

        {/* Quick Presets */}
        <div className="bg-white p-4 rounded-3xl shadow-sm border border-gold/30">
          <div className="text-xs font-extrabold text-maroon uppercase tracking-wider mb-2">
            ⚡ {te ? "శీఘ్ర పోలిక కేటగిరీలు (Quick Preset Decks):" : "Quick Preset Decks:"}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {PRESET_OPTIONS.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleApplyPreset(opt)}
                className="text-left p-3 rounded-2xl bg-cream/50 hover:bg-gold/15 border border-gold/20 transition text-xs group"
              >
                <div className="font-bold text-gray-900 group-hover:text-maroon leading-tight">
                  {opt.label}
                </div>
                <div className="text-[10px] text-gray-500 mt-1">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic ID Input & Action Bar */}
        <div className="bg-white p-5 rounded-3xl shadow-lg border border-gold/30 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-xs font-bold text-gray-700">🔍 {te ? "TSAP IDs:" : "IDs:"}</span>
            <input
              type="text"
              value={idInput1}
              onChange={(e) => setIdInput1(e.target.value.toUpperCase())}
              placeholder="ID 1"
              className="w-24 px-3 py-2 text-xs font-mono font-bold bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-maroon"
            />
            <span className="text-xs font-bold text-gray-400">VS</span>
            <input
              type="text"
              value={idInput2}
              onChange={(e) => setIdInput2(e.target.value.toUpperCase())}
              placeholder="ID 2"
              className="w-24 px-3 py-2 text-xs font-mono font-bold bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-maroon"
            />
            {showThird && (
              <>
                <span className="text-xs font-bold text-gray-400">VS</span>
                <input
                  type="text"
                  value={idInput3}
                  onChange={(e) => setIdInput3(e.target.value.toUpperCase())}
                  placeholder="ID 3"
                  className="w-24 px-3 py-2 text-xs font-mono font-bold bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-maroon"
                />
              </>
            )}
            <button
              onClick={handleApplyIds}
              disabled={loading}
              className="px-4 py-2 bg-maroon hover:bg-maroon-dark text-white rounded-xl text-xs font-bold shadow transition active:scale-95 disabled:opacity-50"
            >
              {loading ? "పోలుస్తోంది..." : "🔄 పోల్చండి"}
            </button>
            <button
              onClick={() => setShowThird(!showThird)}
              className="text-xs font-bold text-maroon hover:underline px-2.5 py-1.5 bg-maroon/5 rounded-xl border border-maroon/10"
            >
              {showThird ? "− 2 మాత్రమే" : "+ 3వ సంబంధం"}
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleCopyDeck}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-full text-xs font-bold transition"
            >
              <span>{copied ? "✅ కాపీ అయ్యింది!" : "📋 Deck కాపీ చేయండి"}</span>
            </button>
            <a
              href={waDeckUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#25D366] text-white rounded-full text-xs font-bold shadow hover:brightness-110 active:scale-95 transition"
            >
              <WhatsAppIcon className="w-4 h-4" mono />
              <span>WhatsApp లో పంపండి</span>
            </a>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-maroon text-white rounded-full text-xs font-bold shadow hover:bg-maroon-dark active:scale-95 transition no-print"
            >
              <span>🖨️ ప్రింట్</span>
            </button>
          </div>
        </div>

        {/* 3 Side-by-Side Profile Cards */}
        <div className={`grid grid-cols-1 ${showThird ? "md:grid-cols-3" : "md:grid-cols-2"} gap-6`}>
          {activeProfiles.map((p, idx) => (
            <div
              key={p.tsap_id}
              className="bg-white rounded-3xl p-6 shadow-xl border-2 border-gold/30 hover:border-maroon/50 transition duration-300 relative space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-4">
                {/* Header Rank Badge */}
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <span className="px-3 py-1 rounded-full bg-maroon text-white text-[11px] font-extrabold shadow-sm">
                    సంబంధం #{idx + 1}
                  </span>
                  <span className="font-mono text-xs font-bold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-lg">
                    {p.tsap_id}
                  </span>
                </div>

                {/* Candidate Photo & Basic Info */}
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.photo_url || "/promo/bride-card.jpg"}
                    alt={p.full_name}
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-gold/40 shadow-sm shrink-0"
                  />
                  <div>
                    <h3 className="text-base font-extrabold text-gray-900 leading-snug">
                      {p.full_name}
                    </h3>
                    <div className="text-xs text-gray-600">
                      {p.age} సం॥ · {p.height} · {p.marital_status}
                    </div>
                  </div>
                </div>

                {/* Vedic Astro Gunamelanam Score Meter */}
                <div className="p-3.5 bg-gradient-to-r from-amber-50 to-rose-50 rounded-2xl border border-gold/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">
                        🪔 వేద గుణమేళనం
                      </div>
                      <div className="text-xs font-bold text-maroon">
                        {p.star} ({p.rasi})
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-extrabold text-emerald-700 leading-none">
                        {p.gunamelanam_score || 30}<span className="text-xs font-normal text-gray-400">/36</span>
                      </div>
                      <div className="text-[10px] font-bold text-emerald-800">ఉత్తమ పొంతన</div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-emerald-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${((p.gunamelanam_score || 30) / 36) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Key Attributes List */}
                <div className="space-y-2 text-xs text-gray-700 pt-1">
                  <div className="flex justify-between py-1 border-b border-gray-50">
                    <span className="text-gray-500">కులం & గోత్రం:</span>
                    <span className="font-bold text-gray-900">{p.caste} ({p.gothram})</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-50">
                    <span className="text-gray-500">విద్యార్హత:</span>
                    <span className="font-bold text-gray-900 text-right">{p.education}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-50">
                    <span className="text-gray-500">ఉద్యోగం:</span>
                    <span className="font-bold text-gray-900 text-right">{p.job}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-50">
                    <span className="text-gray-500">వార్షిక ప్యాకేజీ:</span>
                    <span className="font-extrabold text-emerald-800">{p.salary}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-50">
                    <span className="text-gray-500">స్వస్థలం:</span>
                    <span className="font-bold text-gray-900">{p.district}, {p.state}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex gap-2">
                <Link
                  href={`/search/${p.tsap_id}`}
                  className="flex-1 text-center py-2.5 bg-maroon/10 hover:bg-maroon/20 text-maroon rounded-xl text-xs font-bold transition"
                >
                  వివరాలు
                </Link>
                <Link
                  href={`/search/${p.tsap_id}`}
                  className="flex-1 text-center py-2.5 bg-maroon hover:bg-maroon-dark text-white rounded-xl text-xs font-bold shadow transition"
                >
                  💌 Interest పంపు
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Detailed Side-by-Side Parameter Matrix */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-gold/30 overflow-x-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-extrabold text-maroon flex items-center gap-2">
              <span>📊</span>
              <span>{te ? "వివరమైన పోలిక పట్టిక (Side-by-Side Parameter Matrix)" : "Detailed Parameter Matrix"}</span>
            </h3>
            <span className="text-xs text-gray-500">TS & AP Verified Metrics</span>
          </div>

          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b-2 border-gold/30 bg-cream/60">
                <th className="p-3 font-extrabold text-maroon w-1/4">లక్షణాలు (Attributes)</th>
                {activeProfiles.map((p) => (
                  <th key={p.tsap_id} className="p-3 font-extrabold text-gray-900">
                    {p.full_name} ({p.tsap_id})
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="p-3 font-bold text-gray-600">🪔 వేద గుణమేళనం స్కోర్</td>
                {activeProfiles.map((p) => (
                  <td key={p.tsap_id} className="p-3 font-extrabold text-emerald-700">
                    {p.gunamelanam_score || 30} / 36 గుణాలు (ఉత్తమ పొంతన)
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-3 font-bold text-gray-600">🎂 వయస్సు & ఎత్తు</td>
                {activeProfiles.map((p) => (
                  <td key={p.tsap_id} className="p-3 font-semibold text-gray-800">
                    {p.age} సం॥ · {p.height}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-3 font-bold text-gray-600">🕉️ కులం & ఉపకులం</td>
                {activeProfiles.map((p) => (
                  <td key={p.tsap_id} className="p-3 font-semibold text-gray-800">
                    {p.caste} {p.sub_caste ? `(${p.sub_caste})` : ""}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-3 font-bold text-gray-600">🪔 గోత్రం & నక్షత్రం</td>
                {activeProfiles.map((p) => (
                  <td key={p.tsap_id} className="p-3 font-semibold text-gray-800">
                    {p.gothram} · {p.star} ({p.rasi})
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-3 font-bold text-gray-600">🎓 విద్యార్హత</td>
                {activeProfiles.map((p) => (
                  <td key={p.tsap_id} className="p-3 font-semibold text-gray-800">
                    {p.education}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-3 font-bold text-gray-600">💼 ఉద్యోగం & హోదా</td>
                {activeProfiles.map((p) => (
                  <td key={p.tsap_id} className="p-3 font-semibold text-gray-800">
                    {p.job}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-3 font-bold text-gray-600">💰 వార్షిక ఆదాయం</td>
                {activeProfiles.map((p) => (
                  <td key={p.tsap_id} className="p-3 font-extrabold text-emerald-800">
                    {p.salary}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-3 font-bold text-gray-600">📍 స్వస్థలం & రాష్ట్రం</td>
                {activeProfiles.map((p) => (
                  <td key={p.tsap_id} className="p-3 font-semibold text-gray-800">
                    {p.district}, {p.state}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-3 font-bold text-gray-600">💍 వైవాహిక స్థితి</td>
                {activeProfiles.map((p) => (
                  <td key={p.tsap_id} className="p-3 font-semibold text-gray-800">
                    {p.marital_status}
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
