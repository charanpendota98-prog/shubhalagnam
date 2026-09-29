"use client";

/**
 * 👑 CASTES DIRECTORY — మన వివాహ 2.0 (Ultra-Neat & Best-in-Class UI)
 * ====================================================================
 * Comprehensive Telugu Communities Matrimonial Hub with:
 *   • Pure Telugu + English Bilingual Community Cards
 *   • Dedicated Bride & Groom Direct Action Portals
 *   • Instant 1-Tap Telegram & WhatsApp Channel Connects
 *   • Category Filters (OC, BC, SC, ST, All) & Realtime In-Search
 *   • Zero Awkward Wrapping or Layout Cuts
 */
import { useState, useMemo } from "react";
import Link from "next/link";
import Reveal from "@/components/Reveal";
import SectionHeading from "@/components/SectionHeading";
import { CASTES, buildSlug } from "@/lib/seo-pages";
import { CHANNEL_STATS } from "@/lib/channels";
import { waLink } from "@/lib/wa";
import { TelegramIcon, WhatsAppIcon } from "@/components/BrandIcons";
import { useLang } from "@/lib/lang";
import { CASTE_TELUGU } from "@/lib/telugu-data";

interface CasteDisplayCard {
  key: string;
  teluguName: string;
  englishName: string;
  category: "OC" | "BC" | "SC" | "ST";
  subcastes: string;
  brideSlug: string;
  groomSlug: string;
  brideTgLink: string;
  groomTgLink: string;
  brideWaKey: string;
  groomWaKey: string;
}

const EXTENDED_COMMUNITIES: CasteDisplayCard[] = [
  {
    key: "reddy",
    teluguName: "రెడ్డి",
    englishName: "Reddy",
    category: "OC",
    subcastes: "పాకనాటి, మోటాటి, గుడాటి, దేశతి, గంజాం, పెడకంటి",
    brideSlug: "reddy-bride",
    groomSlug: "reddy-groom",
    brideTgLink: "https://t.me/manavivaha_reddy_bride",
    groomTgLink: "https://t.me/manavivaha_reddy_groom",
    brideWaKey: "c_reddy_bride",
    groomWaKey: "c_reddy_groom",
  },
  {
    key: "kamma",
    teluguName: "కమ్మ",
    englishName: "Kamma",
    category: "OC",
    subcastes: "చౌదరి, పెద కమ్మ, చిన కమ్మ, గోడచాటి",
    brideSlug: "kamma-bride",
    groomSlug: "kamma-groom",
    brideTgLink: "https://t.me/manavivaha_kamma_bride",
    groomTgLink: "https://t.me/manavivaha_kamma_groom",
    brideWaKey: "c_kamma_bride",
    groomWaKey: "c_kamma_groom",
  },
  {
    key: "kapu",
    teluguName: "కాపు / బలిజ / తెలగ",
    englishName: "Kapu / Balija / Telaga",
    category: "OC",
    subcastes: "ఒంటరి, తూర్పు కాపు, పల్లి కాపు, గాజుల బలిజ, తెలగ",
    brideSlug: "kapu-bride",
    groomSlug: "kapu-groom",
    brideTgLink: "https://t.me/manavivaha_kapu_bride",
    groomTgLink: "https://t.me/manavivaha_kapu_groom",
    brideWaKey: "c_kapu_bride",
    groomWaKey: "c_kapu_groom",
  },
  {
    key: "vysya",
    teluguName: "ఆర్య వైశ్య",
    englishName: "Arya Vysya",
    category: "OC",
    subcastes: "కోమటి, త్రివర్ణిక, కాళింగ వైశ్య, సాధు చెట్టి",
    brideSlug: "vysya-bride",
    groomSlug: "vysya-groom",
    brideTgLink: "https://t.me/manavivaha_vysya_bride",
    groomTgLink: "https://t.me/manavivaha_vysya_groom",
    brideWaKey: "c_vysya_bride",
    groomWaKey: "c_vysya_groom",
  },
  {
    key: "brahmin",
    teluguName: "బ్రాహ్మణ",
    englishName: "Brahmin",
    category: "OC",
    subcastes: "వైదిక, నియోగి, శిష్టకరణ, ద్రావిడ, స్మార్త, మాధ్వ",
    brideSlug: "brahmin-bride",
    groomSlug: "brahmin-groom",
    brideTgLink: "https://t.me/manavivaha_brahmin_bride",
    groomTgLink: "https://t.me/manavivaha_brahmin_groom",
    brideWaKey: "c_brahmin_bride",
    groomWaKey: "c_brahmin_groom",
  },
  {
    key: "velama",
    teluguName: "వెలమ",
    englishName: "Velama",
    category: "OC",
    subcastes: "పద్మ వెలమ, ఆది వెలమ, కొప్పుల వెలమ",
    brideSlug: "velama-bride",
    groomSlug: "velama-groom",
    brideTgLink: "https://t.me/manavivaha_velama_bride",
    groomTgLink: "https://t.me/manavivaha_velama_groom",
    brideWaKey: "c_velama_bride",
    groomWaKey: "c_velama_groom",
  },
  {
    key: "raju_kshatriya",
    teluguName: "రాజు / క్షత్రియ",
    englishName: "Raju / Kshatriya",
    category: "OC",
    subcastes: "సూర్య వంశం, చంద్ర వంశం, వన్నియార్ రాజు",
    brideSlug: "raju_kshatriya-bride",
    groomSlug: "raju_kshatriya-groom",
    brideTgLink: "https://t.me/manavivaha_raju_kshatriya",
    groomTgLink: "https://t.me/manavivaha_raju_kshatriya",
    brideWaKey: "c_raju_kshatriya",
    groomWaKey: "c_raju_kshatriya",
  },
  {
    key: "yadava",
    teluguName: "యాదవ",
    englishName: "Yadava / Golla",
    category: "BC",
    subcastes: "గొల్ల, కురుమ, ఎర్ర గొల్ల, పూజ గొల్ల, కర్ణ గొల్ల",
    brideSlug: "yadava_goud-bride",
    groomSlug: "yadava_goud-groom",
    brideTgLink: "https://t.me/manavivaha_yadava_goud_bride",
    groomTgLink: "https://t.me/manavivaha_yadava_goud_groom",
    brideWaKey: "c_yadava_goud_bride",
    groomWaKey: "c_yadava_goud_groom",
  },
  {
    key: "goud",
    teluguName: "గౌడ్",
    englishName: "Goud / Ediga",
    category: "BC",
    subcastes: "ఈడిగ, గమళ్ల, గౌడ, శెట్టిబలిజ గౌడ్, కావలి",
    brideSlug: "yadava_goud-bride",
    groomSlug: "yadava_goud-groom",
    brideTgLink: "https://t.me/manavivaha_yadava_goud_bride",
    groomTgLink: "https://t.me/manavivaha_yadava_goud_groom",
    brideWaKey: "c_yadava_goud_bride",
    groomWaKey: "c_yadava_goud_groom",
  },
  {
    key: "padmashali",
    teluguName: "పద్మశాలి / దేవాంగ",
    englishName: "Padmashali / Devanga",
    category: "BC",
    subcastes: "పద్మసాలి, పట్టుసాలి, తొగట, సేనాపతుల, దేవాంగ",
    brideSlug: "padmashali_weavers-bride",
    groomSlug: "padmashali_weavers-groom",
    brideTgLink: "https://t.me/manavivaha_padmashali_weavers",
    groomTgLink: "https://t.me/manavivaha_padmashali_weavers",
    brideWaKey: "c_padmashali_weavers",
    groomWaKey: "c_padmashali_weavers",
  },
  {
    key: "viswabrahmana",
    teluguName: "విశ్వబ్రాహ్మణ",
    englishName: "Viswabrahmin / Viswakarma",
    category: "BC",
    subcastes: "కంసాలి, కమ్మరి, కంచరి, వడ్ల, ఆవుసల, శిల్పి, ఆచారి",
    brideSlug: "viswabrahmana-bride",
    groomSlug: "viswabrahmana-groom",
    brideTgLink: "https://t.me/manavivaha_viswabrahmana",
    groomTgLink: "https://t.me/manavivaha_viswabrahmana",
    brideWaKey: "c_viswabrahmana",
    groomWaKey: "c_viswabrahmana",
  },
  {
    key: "munnuru_kapu",
    teluguName: "మున్నూరు కాపు",
    englishName: "Munnuru Kapu",
    category: "BC",
    subcastes: "మున్నూరు, పటేల్, కాపు",
    brideSlug: "munnuru_kapu-bride",
    groomSlug: "munnuru_kapu-groom",
    brideTgLink: "https://t.me/manavivaha_munnuru_kapu",
    groomTgLink: "https://t.me/manavivaha_munnuru_kapu",
    brideWaKey: "c_munnuru_kapu",
    groomWaKey: "c_munnuru_kapu",
  },
  {
    key: "mudiraj",
    teluguName: "ముదిరాజ్",
    englishName: "Mudiraj / Tenugollu",
    category: "BC",
    subcastes: "ముదిరాజు, ముత్రాసి, తెనుగొల్లు, బాంట్, పాలేగార్లు",
    brideSlug: "mudiraj-bride",
    groomSlug: "mudiraj-groom",
    brideTgLink: "https://t.me/manavivaha_mudiraj",
    groomTgLink: "https://t.me/manavivaha_mudiraj",
    brideWaKey: "c_mudiraj",
    groomWaKey: "c_mudiraj",
  },
  {
    key: "others_bc",
    teluguName: "ఇతర BC కులాలు",
    englishName: "Other BC Communities",
    category: "BC",
    subcastes: "కుమ్మర, రజక, నాయీ బ్రాహ్మణ, గాండ్ల, ఉప్పర, వడ్డెర, బెస్త, గవర",
    brideSlug: "others_bc-bride",
    groomSlug: "others_bc-groom",
    brideTgLink: "https://t.me/manavivaha_others_bc",
    groomTgLink: "https://t.me/manavivaha_others_bc",
    brideWaKey: "c_others_bc",
    groomWaKey: "c_others_bc",
  },
  {
    key: "mala",
    teluguName: "మాల",
    englishName: "Mala",
    category: "SC",
    subcastes: "మాల అయ్యవారు, మాల దాసరి, రెడ్డి మాల, సారిండ్ల",
    brideSlug: "mala-bride",
    groomSlug: "mala-groom",
    brideTgLink: "https://t.me/manavivaha_mala_bride",
    groomTgLink: "https://t.me/manavivaha_mala_groom",
    brideWaKey: "c_mala_bride",
    groomWaKey: "c_mala_groom",
  },
  {
    key: "madiga",
    teluguName: "మాదిగ",
    englishName: "Madiga",
    category: "SC",
    subcastes: "మాదిగ దాసు, మాష్టీన్, మాదిగ దాసరి, బావురి, సింధోళ్లు",
    brideSlug: "madiga-bride",
    groomSlug: "madiga-groom",
    brideTgLink: "https://t.me/manavivaha_madiga_bride",
    groomTgLink: "https://t.me/manavivaha_madiga_groom",
    brideWaKey: "c_madiga_bride",
    groomWaKey: "c_madiga_groom",
  },
  {
    key: "others_sc",
    teluguName: "ఆది ఆంధ్ర / ఇతర SC",
    englishName: "Adi Andhra / Other SC",
    category: "SC",
    subcastes: "ఆది ద్రావిడ, అరుంధతీయ, రెల్లి, అర్వ మాల, దండాసి",
    brideSlug: "others_sc-bride",
    groomSlug: "others_sc-groom",
    brideTgLink: "https://t.me/manavivaha_others_sc",
    groomTgLink: "https://t.me/manavivaha_others_sc",
    brideWaKey: "c_others_sc",
    groomWaKey: "c_others_sc",
  },
  {
    key: "lambada_banjara",
    teluguName: "లంబాడా / బంజారా",
    englishName: "Lambada / Banjara",
    category: "ST",
    subcastes: "లంబాడి, బంజారా, లంబాణి, సుగాలి, గోర్",
    brideSlug: "lambada_banjara-bride",
    groomSlug: "lambada_banjara-groom",
    brideTgLink: "https://t.me/manavivaha_lambada_banjara",
    groomTgLink: "https://t.me/manavivaha_lambada_banjara",
    brideWaKey: "c_lambada_banjara",
    groomWaKey: "c_lambada_banjara",
  },
  {
    key: "others_st",
    teluguName: "కోయ / గోండ్ / ఇతర ST",
    englishName: "Koya / Gond / Other ST",
    category: "ST",
    subcastes: "కోయ, రాజ్‌గోండ్, చెంచు, బగత, కొండ రెడ్డి, సవర, యానాది, ఎరుకల",
    brideSlug: "others_st-bride",
    groomSlug: "others_st-groom",
    brideTgLink: "https://t.me/manavivaha_others_st",
    groomTgLink: "https://t.me/manavivaha_others_st",
    brideWaKey: "c_others_st",
    groomWaKey: "c_others_st",
  },
];

export default function CastesClient() {
  const { lang } = useLang();
  const te = lang === "te";
  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState<string>("ALL");

  const filteredCastes = useMemo(() => {
    return EXTENDED_COMMUNITIES.filter((c) => {
      const q = search.trim().toLowerCase();
      const matchesQuery =
        !q ||
        c.englishName.toLowerCase().includes(q) ||
        c.teluguName.includes(search.trim()) ||
        c.subcastes.toLowerCase().includes(q);
      const matchesCat = selectedCat === "ALL" || c.category === selectedCat;
      return matchesQuery && matchesCat;
    });
  }, [search, selectedCat]);

  return (
    <main className="min-h-screen pb-36 bg-[#FCFBF8]">
      {/* HERO SECTION */}
      <section className="maroon-gradient text-white border-b-4 border-gold/40">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <Reveal>
            <div className="inline-flex items-center gap-2 bg-white/15 border border-white/25 rounded-full px-4 py-1.5 text-xs font-bold shadow-sm">
              👑 {te ? "ఆంధ్రప్రదేశ్ & తెలంగాణ సమగ్ర కులాలు" : "All TS & AP Telugu Communities"} • 100% {te ? "ధృవీకరించిన సంబంధాలు" : "Verified Matches"}
            </div>
            
            <h1 className="mt-4 text-3xl md:text-5xl font-black tracking-tight telugu">
              {te ? "కులాల వారీగా సంబంధాలు & లైవ్ ఛానల్స్" : "Caste-Wise Matches & Live Channels"}
            </h1>
            
            <p className="mt-3 text-sm md:text-base opacity-95 telugu max-w-3xl leading-relaxed">
              {te ? (
                <>మీ కులాన్ని ఎంచుకోండి — ఆ సమాజపు వధువులు & వరుల సంబంధాలు, ప్రత్యేక టెలిగ్రామ్ & వాట్సాప్ ఛానల్స్, వేద జాతక సరిపోలిక మరియు నేరుగా సంబంధాల అన్వేషణ అంతా ఒక్క చోటే. OC, BC, SC, ST — అన్ని వర్గాల సంబంధాలు అందుబాటులో ఉన్నాయి.</>
              ) : (
                <>Select your community — explore verified brides and grooms, dedicated Telegram & WhatsApp matrimonial channels, Vedic Gunamelanam horoscope matchmaker, and direct match search.</>
              )}
            </p>

            {/* Quick search input */}
            <div className="mt-6 flex flex-col sm:flex-row gap-2 max-w-xl">
              <input
                type="text"
                placeholder={te ? "🔍 కులం / ఉపకులం పేరు టైప్ చేయండి (ఉదా: రెడ్డి, కమ్మ, కాపు, వైశ్య, యాదవ, పద్మశాలి...)" : "🔍 Type caste or sub-caste name (e.g. Reddy, Kamma, Kapu, Vysya...)"}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 bg-white/15 border border-white/30 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-white/70 focus:outline-none focus:ring-2 focus:ring-gold focus:bg-white/25 transition shadow-inner"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="bg-white/20 px-4 py-2.5 rounded-2xl text-xs font-bold hover:bg-white/30 transition text-white"
                >
                  Clear
                </button>
              )}
            </div>
          </Reveal>
        </div>
      </section>

      {/* MAIN CONTENT AREA */}
      <div className="max-w-6xl mx-auto px-4 py-10">
        <SectionHeading
          eyebrow={te ? "సమాజాలు & కమ్యూనిటీలు" : "Telugu Communities & Hubs"}
          title={te ? "మీ కులం ఎంచుకోండి — సంబంధాలు చూడండి" : "Select Your Community — Explore Alliances"}
          subtitle={te ? "ప్రతి కులానికి వధువులు & వరుల ప్రత్యేక లైవ్ ఛానల్స్ మరియు సంబంధాల సెర్చ్ అందుబాటులో ఉంది." : "Dedicated bride & groom channels and direct match discovery for every community."}
          telugu
        />

        {/* Category Filter Tabs */}
        <div className="mt-6 flex flex-wrap gap-2.5 items-center">
          {[
            { key: "ALL", labelTe: "అన్ని కులాలు (All Castes)", labelEn: "All Castes" },
            { key: "OC", labelTe: "OC కులాలు (రెడ్డి, కమ్మ, కాపు, వైశ్య, బ్రాహ్మణ, వెలమ)", labelEn: "OC Communities" },
            { key: "BC", labelTe: "BC కులాలు (యాదవ, గౌడ్, పద్మశాలి, ముదిరాజ్, విశ్వబ్రాహ్మణ)", labelEn: "BC Communities" },
            { key: "SC", labelTe: "SC వర్గాలు (మాల, మాదిగ & ఆది ఆంధ్ర)", labelEn: "SC Communities" },
            { key: "ST", labelTe: "ST వర్గాలు (లంబాడా, బంజారా, కోయ & గోండ్)", labelEn: "ST Communities" },
          ].map((cat) => (
            <button
              key={cat.key}
              onClick={() => setSelectedCat(cat.key)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all ${
                selectedCat === cat.key
                  ? "maroon-gradient text-white shadow-brand scale-105"
                  : "bg-white border border-gray-300 text-slate-700 hover:border-maroon/50 hover:bg-amber-50/40"
              }`}
            >
              {te ? cat.labelTe : cat.labelEn}
            </button>
          ))}
        </div>

        {/* ELEGANT CASTE CARDS GRID */}
        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCastes.map((c, i) => (
            <Reveal key={c.key} delay={(i % 6) * 35}>
              <div className="bg-white rounded-3xl p-5 border border-gold/30 hover:border-gold shadow-md hover:shadow-xl transition-all duration-300 h-full flex flex-col justify-between group">
                
                {/* Card Header */}
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xl">💍</span>
                        <h3 className="font-extrabold text-[#7A0C2E] text-[18px] leading-tight telugu">
                          {c.teluguName}
                        </h3>
                      </div>
                      <div className="text-[12px] font-bold text-slate-500 mt-0.5">
                        {c.englishName}
                      </div>
                    </div>
                    
                    <span className="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-sm shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      100% Live
                    </span>
                  </div>

                  {/* Subcastes highlight */}
                  <div className="mt-3 bg-amber-50/60 rounded-xl p-2.5 border border-gold/20 text-[11px] text-slate-700 leading-relaxed telugu">
                    <span className="font-bold text-[#7A0C2E]">ఉపకులాలు: </span>
                    <span className="opacity-90">{c.subcastes}</span>
                  </div>
                </div>

                {/* Card Actions: Dedicated Bride & Groom Lanes */}
                <div className="mt-5 space-y-3">
                  
                  {/* Bride Row */}
                  <div className="bg-rose-50/40 border border-rose-100 rounded-2xl p-2 flex items-center justify-between gap-2">
                    <Link
                      href={`/castes/${c.brideSlug}`}
                      className="flex-1 text-center text-xs font-extrabold maroon-gradient text-white py-2.5 px-3 rounded-xl hover-lift shadow-sm truncate"
                    >
                      👰 {te ? "వధువులు (Brides)" : "Brides"}
                    </Link>
                    
                    <div className="flex items-center gap-1.5 shrink-0">
                      <a
                        href={c.brideTgLink}
                        target="_blank"
                        rel="noreferrer"
                        title={te ? "వధువుల Telegram ఛానల్" : "Brides Telegram Channel"}
                        className="grid place-items-center w-8 h-8 rounded-xl bg-[#229ED9] text-white shadow-soft hover:scale-110 active:scale-95 transition"
                      >
                        <TelegramIcon className="w-4 h-4" mono />
                      </a>
                      {waLink(c.brideWaKey) ? (
                        <a
                          href={waLink(c.brideWaKey)}
                          target="_blank"
                          rel="noreferrer"
                          title={te ? "వధువుల WhatsApp ఛానల్" : "Brides WhatsApp Channel"}
                          className="grid place-items-center w-8 h-8 rounded-xl bg-[#25D366] text-white shadow-soft hover:scale-110 active:scale-95 transition"
                        >
                          <WhatsAppIcon className="w-4 h-4" mono />
                        </a>
                      ) : null}
                    </div>
                  </div>

                  {/* Groom Row */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-2 flex items-center justify-between gap-2">
                    <Link
                      href={`/castes/${c.groomSlug}`}
                      className="flex-1 text-center text-xs font-extrabold bg-white border border-maroon/30 text-maroon hover:bg-rose-50/60 py-2.5 px-3 rounded-xl hover-lift shadow-sm truncate"
                    >
                      🤵 {te ? "వరులు (Grooms)" : "Grooms"}
                    </Link>
                    
                    <div className="flex items-center gap-1.5 shrink-0">
                      <a
                        href={c.groomTgLink}
                        target="_blank"
                        rel="noreferrer"
                        title={te ? "వరుల Telegram ఛానల్" : "Grooms Telegram Channel"}
                        className="grid place-items-center w-8 h-8 rounded-xl bg-[#229ED9] text-white shadow-soft hover:scale-110 active:scale-95 transition"
                      >
                        <TelegramIcon className="w-4 h-4" mono />
                      </a>
                      {waLink(c.groomWaKey) ? (
                        <a
                          href={waLink(c.groomWaKey)}
                          target="_blank"
                          rel="noreferrer"
                          title={te ? "వరుల WhatsApp ఛానల్" : "Grooms WhatsApp Channel"}
                          className="grid place-items-center w-8 h-8 rounded-xl bg-[#25D366] text-white shadow-soft hover:scale-110 active:scale-95 transition"
                        >
                          <WhatsAppIcon className="w-4 h-4" mono />
                        </a>
                      ) : null}
                    </div>
                  </div>

                  {/* Explore Matches Link */}
                  <div className="pt-1">
                    <Link
                      href={`/matches?caste=${encodeURIComponent(c.englishName.split("/")[0].trim())}`}
                      className="block text-center text-xs font-extrabold text-[#7A0C2E] hover:text-[#9B1138] bg-amber-50/50 hover:bg-amber-100/60 border border-gold/40 rounded-xl py-2 transition"
                    >
                      🔍 {te ? `${c.teluguName.split("/")[0]} సంబంధాలన్నీ చూడండి →` : `Explore all ${c.englishName.split("/")[0]} matches →`}
                    </Link>
                  </div>

                </div>

              </div>
            </Reveal>
          ))}
        </div>

        {/* Empty state */}
        {filteredCastes.length === 0 && (
          <div className="mt-10 text-center p-10 bg-white rounded-3xl border border-gray-200 card-shadow">
            <div className="text-4xl">🔍</div>
            <div className="font-extrabold text-gray-800 text-lg mt-3 telugu">
              {te ? "మీరు వెతికిన కులం దొరకలేదు" : "No castes matched your search"}
            </div>
            <p className="text-xs text-gray-500 mt-1 telugu max-w-md mx-auto">
              {te ? "దయచేసి స్పెల్లింగ్ సరిచూసుకోండి లేదా నేరుగా ఉచిత నమోదు ద్వారా మీ ప్రొఫైల్ సృష్టించండి — అన్ని కులాలు అందుబాటులో ఉన్నాయి." : "Please check your spelling or register free — all community options are supported."}
            </p>
            <Link href="/register" className="inline-block mt-5 maroon-gradient text-white font-bold px-6 py-3 rounded-2xl text-xs shadow-brand hover-lift">
              {te ? "📝 ఉచిత నమోదు" : "Register Free"}
            </Link>
          </div>
        )}

        {/* Bottom Navigation CTA Bar */}
        <div className="mt-12 p-6 bg-gradient-to-r from-[#7A0C2E] to-[#4A0018] rounded-3xl text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <div className="text-lg font-extrabold telugu">
              {te ? "మీ కులానికి సరిపోయే సంబంధాలు కావాలా?" : "Looking for perfect community alliances?"}
            </div>
            <div className="text-xs text-white/80 mt-1 telugu">
              {te ? "3 నిమిషాల్లో ఉచితంగా నమోదు చేసుకోండి • మొదటి 3 సంబంధాలు ఉచితం" : "Register in 3 minutes • First 3 requests 100% FREE"}
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <Link href="/register" className="gold-gradient text-maroon font-black px-6 py-3 rounded-2xl text-xs hover-lift shadow-md">
              {te ? "📝 ఉచిత నమోదు" : "📝 Register FREE"}
            </Link>
            <Link href="/channels" className="bg-white/15 hover:bg-white/25 border border-white/30 text-white font-bold px-5 py-3 rounded-2xl text-xs transition">
              📢 {CHANNEL_STATS.total} {te ? "ఛానల్స్ నెట్‌వర్క్" : "Channels"}
            </Link>
          </div>
        </div>

      </div>
    </main>
  );
}
