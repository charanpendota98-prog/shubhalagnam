"use client";

/** /castes body — neat Telugu / clean English via toggle with interactive search & filters. */
import { useState, useMemo } from "react";
import Link from "next/link";
import Reveal from "@/components/Reveal";
import SectionHeading from "@/components/SectionHeading";
import { CASTES, buildSlug } from "@/lib/seo-pages";
import { CHANNEL_STATS } from "@/lib/channels";
import { waLink } from "@/lib/wa";
import { TelegramIcon, WhatsAppIcon } from "@/components/BrandIcons";
import { useLang } from "@/lib/lang";

const CASTE_CATEGORIES: Record<string, string> = {
  reddy: "OC",
  kamma: "OC",
  kapu: "OC",
  velama: "OC",
  brahmin: "OC",
  vysya: "OC",
  raju_kshatriya: "OC",
  yadava_goud: "BC",
  munnuru_kapu: "BC",
  viswabrahmana: "BC",
  padmashali_weavers: "BC",
  mudiraj: "BC",
  others_bc: "BC",
  mala: "SC",
  madiga: "SC",
  others_sc: "SC",
  lambada_banjara: "ST",
  others_st: "ST",
};

export default function CastesClient() {
  const { lang } = useLang();
  const te = lang === "te";
  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState<string>("ALL");

  const filteredCastes = useMemo(() => {
    return CASTES.filter((c) => {
      const matchesQuery =
        !search ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.key.toLowerCase().includes(search.toLowerCase());
      const cat = CASTE_CATEGORIES[c.key] || "BC";
      const matchesCat = selectedCat === "ALL" || cat === selectedCat;
      return matchesQuery && matchesCat;
    });
  }, [search, selectedCat]);

  return (
    <main className="min-h-screen">
      <section className="maroon-gradient text-white">
        <div className="max-w-6xl mx-auto px-4 py-10">
          <Reveal>
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-3.5 py-1 text-[11px] font-bold">
              👑 {te ? "ఆంధ్రప్రదేశ్ & తెలంగాణ అన్ని కులాలు" : "All TS & AP Communities"} • {CHANNEL_STATS.by_tier.L3_CASTE} {te ? "ప్రత్యేక కమ్యూనిటీ ఛానల్స్" : "Community Channels"}
            </div>
            <h1 className="mt-3 text-2xl md:text-4xl font-bold">
              {te ? "కులాల వారీగా సంబంధాలు — 100% లైవ్" : "Caste-wise Matches — 100% Live"}
            </h1>
            <p className="mt-2 text-[13px] md:text-sm opacity-90 telugu max-w-3xl leading-relaxed">
              {te ? (
                <>మీ కులాన్ని ఎంచుకోండి — ఆ సమాజపు పెళ్లికూతురు & పెళ్లికొడుకు సంబంధాలు, ప్రత్యేక టెలిగ్రామ్ & వాట్సాప్ ఛానల్స్, వేద జాతక సరిపోలిక మరియు నేరుగా సంబంధాల అన్వేషణ అంతా ఒక్క చోటే. OC, BC, SC, ST — అన్ని వర్గాల సంబంధాలు అందుబాటులో ఉన్నాయి.</>
              ) : (
                <>Select your community — explore brides and grooms, dedicated Telegram & WhatsApp matrimonial channels, Vedic horoscope matchmaker and direct profile search. 100% verified Telugu matches across OC, BC, SC, and ST communities.</>
              )}
            </p>

            {/* Quick search input */}
            <div className="mt-6 flex flex-col sm:flex-row gap-2 max-w-xl">
              <input
                type="text"
                placeholder={te ? "🔍 మీ కులం పేరు టైప్ చేయండి (ఉదా: రెడ్డి, Kamma, కాపు, వైశ్య, యాదవ, పద్మశాలి...)" : "🔍 Type your caste name (e.g. Reddy, Kamma, Kapu, Vysya, Yadava...)"}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 bg-white/10 border border-white/30 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-gold focus:bg-white/20 transition"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="bg-white/20 px-3 py-2 rounded-xl text-xs font-bold hover:bg-white/30"
                >
                  Clear
                </button>
              )}
            </div>
          </Reveal>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <SectionHeading
          eyebrow={te ? "సమాజాలు & కులాలు" : "Communities & Castes"}
          title={te ? "మీ కులం ఎంచుకోండి — సంబంధాలు చూడండి" : "Select Your Community — Explore Matches"}
          subtitle={te ? "ప్రతి కులానికి వధువులు & వరుల ప్రత్యేక లైవ్ ఛానల్స్ మరియు సంబంధాల సెర్చ్ అందుబాటులో ఉంది." : "Dedicated bride & groom channels and direct match discovery for every community."}
          telugu
        />

        {/* Category Tabs */}
        <div className="mt-5 flex flex-wrap gap-2 items-center">
          {[
            { key: "ALL", labelTe: "అన్నీ (All Castes)", labelEn: "All Castes" },
            { key: "OC", labelTe: "OC కులాలు (రెడ్డి, కమ్మ, కాపు, వైశ్య, బ్రాహ్మణ, వెలమ)", labelEn: "OC Communities" },
            { key: "BC", labelTe: "BC కులాలు (యాదవ, గౌడ, పద్మశాలి, ముదిరాజ్, విశ్వబ్రాహ్మణ)", labelEn: "BC Communities" },
            { key: "SC", labelTe: "SC వర్గాలు (మాల, మాదిగ & ఇతరులు)", labelEn: "SC Communities" },
            { key: "ST", labelTe: "ST వర్గాలు (లంబాడా, బంజారా, కోయ & ఇతరులు)", labelEn: "ST Communities" },
          ].map((cat) => (
            <button
              key={cat.key}
              onClick={() => setSelectedCat(cat.key)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                selectedCat === cat.key
                  ? "maroon-gradient text-white shadow-md scale-105"
                  : "bg-white border border-gray-200 text-gray-700 hover:bg-cream"
              }`}
            >
              {te ? cat.labelTe : cat.labelEn}
            </button>
          ))}
        </div>

        <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredCastes.map((c, i) => (
            <Reveal key={c.key} delay={(i % 6) * 40}>
              <div className="bg-white rounded-2xl p-4.5 card-shadow border border-gold/20 hover:border-gold/60 transition h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-bold text-maroon text-[16px] flex items-center gap-1.5">
                      <span>💍</span>
                      <span>{c.name}</span>
                    </div>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                      🟢 Live
                    </span>
                  </div>

                  <p className="text-[11px] text-gray-500 mt-1 line-clamp-1">
                    {te ? "ధృవీకరించిన సంబంధాలు & నేరుగా మ్యాచ్ సంప్రదింపులు" : "Verified profiles & direct matrimonial connects"}
                  </p>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Link
                      href={`/castes/${buildSlug(c.key, "bride")}`}
                      className="flex-1 text-center text-[12px] font-bold maroon-gradient text-white px-3 py-2 rounded-xl hover-lift shadow-sm"
                    >
                      {te ? "👰 వధువులు (Brides)" : "👰 Brides"}
                    </Link>
                    <a
                      href={c.bride?.link || c.link}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={te ? "వధువుల Telegram" : "Brides Telegram"}
                      className="grid place-items-center w-9 h-9 rounded-xl bg-[#229ED9] text-white shadow-soft hover:brightness-110 active:scale-95 transition shrink-0"
                    >
                      <TelegramIcon className="w-4 h-4" mono />
                    </a>
                    {waLink(c.bride?.key || c.key) ? (
                      <a
                        href={waLink(c.bride?.key || c.key)}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={te ? "వధువుల WhatsApp" : "Brides WhatsApp"}
                        className="grid place-items-center w-9 h-9 rounded-xl bg-[#25D366] text-white shadow-soft hover:brightness-110 active:scale-95 transition shrink-0"
                      >
                        <WhatsAppIcon className="w-4 h-4" mono />
                      </a>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Link
                      href={`/castes/${buildSlug(c.key, "groom")}`}
                      className="flex-1 text-center text-[12px] font-bold border border-maroon/30 text-maroon bg-rose-50/50 hover:bg-rose-50 px-3 py-2 rounded-xl hover-lift shadow-sm"
                    >
                      {te ? "🤵 వరులు (Grooms)" : "🤵 Grooms"}
                    </Link>
                    <a
                      href={c.groom?.link || c.bride?.link || c.link}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={te ? "వరుల Telegram" : "Grooms Telegram"}
                      className="grid place-items-center w-9 h-9 rounded-xl bg-[#229ED9] text-white shadow-soft hover:brightness-110 active:scale-95 transition shrink-0"
                    >
                      <TelegramIcon className="w-4 h-4" mono />
                    </a>
                    {waLink(c.groom?.key) ? (
                      <a
                        href={waLink(c.groom?.key)}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={te ? "వరుల WhatsApp" : "Grooms WhatsApp"}
                        className="grid place-items-center w-9 h-9 rounded-xl bg-[#25D366] text-white shadow-soft hover:brightness-110 active:scale-95 transition shrink-0"
                      >
                        <WhatsAppIcon className="w-4 h-4" mono />
                      </a>
                    ) : null}
                  </div>

                  <div className="pt-1">
                    <Link
                      href={`/matches?caste=${encodeURIComponent(c.name)}`}
                      className="block text-center text-[11px] font-bold text-maroon hover:text-maroon/80 underline decoration-gold/60 underline-offset-2"
                    >
                      🔍 {te ? `${c.name} సంబంధాలన్నీ చూడండి →` : `Explore all ${c.name} matches →`}
                    </Link>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {filteredCastes.length === 0 && (
          <div className="mt-8 text-center p-8 bg-white rounded-2xl border border-gray-200">
            <div className="text-3xl">🔍</div>
            <div className="font-bold text-gray-800 mt-2">
              {te ? "మీరు వెతికిన కులం దొరకలేదు" : "No castes matched your search"}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {te ? "దయచేసి స్పెల్లింగ్ సరిచూసుకోండి లేదా నేరుగా రిజిస్టర్ అవ్వండి — అన్ని కులాల ఆప్షన్లు ఉన్నాయి." : "Please verify spelling or register directly — all caste options are available."}
            </p>
            <Link href="/register" className="inline-block mt-4 maroon-gradient text-white font-bold px-5 py-2.5 rounded-xl text-xs">
              {te ? "📝 ఉచిత నమోదు" : "Register Free"}
            </Link>
          </div>
        )}

        <div className="mt-8 flex flex-wrap gap-2.5">
          <Link href="/register" className="maroon-gradient text-white font-bold px-5 py-3 rounded-xl hover-lift shadow-sm">
            {te ? "📝 ఉచిత నమోదు" : "📝 Register FREE"}
          </Link>
          <Link href="/channels" className="border border-maroon/30 text-maroon bg-white font-bold px-5 py-3 rounded-xl hover-lift shadow-sm">
            📢 {CHANNEL_STATS.total} {te ? "కమ్యూనిటీ ఛానల్స్" : "Channels"}
          </Link>
          <Link href="/matches" className="border border-gold text-maroon bg-gold/10 font-bold px-5 py-3 rounded-xl hover-lift shadow-sm">
            💘 {te ? "అన్ని సంబంధాలు చూడండి" : "All Matches"}
          </Link>
        </div>
      </div>
    </main>
  );
}
