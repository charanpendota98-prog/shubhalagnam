"use client";

/**
 * 👑 CASTES DIRECTORY — మన వివాహ 2.0 (Ultra-Neat & Best-in-Class UI)
 * ====================================================================
 * Selected Telugu Community Hubs (not an exhaustive official classification):
 *   • Pure Telugu + English Bilingual Community Cards
 *   • Dedicated Bride & Groom Direct Action Portals
 *   • Only listed links or explicitly configured support contacts; no guessed fallback links
 *   • Category Filters (OC, BC, SC, ST, All) & Realtime In-Search
 *   • Zero Awkward Wrapping or Layout Cuts
 */
import { useState, useMemo } from "react";
import Link from "next/link";
import Reveal from "@/components/Reveal";
import SectionHeading from "@/components/SectionHeading";
import { ALL_CHANNELS, CHANNEL_STATS } from "@/lib/channels";
import { resolveChannelLinks, useChannelDirectoryLinks } from "@/lib/channel-links";
import { TelegramIcon, WhatsAppIcon } from "@/components/BrandIcons";
import { useLang } from "@/lib/lang";
import { CASTE_SUBCASTES, CASTE_TELUGU, CASTES_DETAILED, OTHER_COMMUNITY_OPTION } from "@/lib/telugu-data";
import { CASTES, buildSlug, type CasteInfo } from "@/lib/seo-pages";

type CommunityCategory = "OC" | "BC" | "SC" | "ST" | "OTHER";
type CommunityCategoryFilter = "ALL" | CommunityCategory;
type DirectoryMode = "HUBS" | "REGISTRATION";
type DirectoryLayout = "GRID" | "COMPACT";

type DirectoryTab<K extends string> = { key: K; en: string; te: string };

const CATEGORY_TABS: DirectoryTab<CommunityCategoryFilter>[] = [
  { key: "ALL", en: "All communities", te: "అన్ని కమ్యూనిటీలు" },
  { key: "OC", en: "OC", te: "OC" },
  { key: "BC", en: "BC", te: "BC" },
  { key: "SC", en: "SC", te: "SC" },
  { key: "ST", en: "ST", te: "ST" },
  { key: "OTHER", en: "Other", te: "ఇతర" },
];

const LINK_TABS: DirectoryTab<"ALL" | "TELEGRAM" | "WHATSAPP">[] = [
  { key: "ALL", en: "Any listed link", te: "ఏదైనా లిస్టు చేసిన లింక్" },
  { key: "TELEGRAM", en: "Telegram listed", te: "Telegram లింక్ ఉంది" },
  { key: "WHATSAPP", en: "WhatsApp channel listed", te: "WhatsApp channel లింక్ ఉంది" },
];

type CasteDisplayCard = {
  key: string;
  teluguName: string;
  englishName: string;
  category: CommunityCategory;
  subcastes: string[];
  matchQuery: string;
  route: CasteInfo;
};

type CommunityMetadata = {
  englishName: string;
  teluguName: string;
  category: CommunityCategory;
  casteLookup?: string;
  matchQuery?: string;
};

// Presentation labels supplement the canonical channel registry. All route
// slugs and external destinations below are derived from that registry.
const COMMUNITY_METADATA: Record<string, CommunityMetadata> = {
  reddy: { englishName: "Reddy", teluguName: "రెడ్డి", category: "OC", casteLookup: "Reddy", matchQuery: "Reddy" },
  kamma: { englishName: "Kamma", teluguName: "కమ్మ", category: "OC", casteLookup: "Kamma", matchQuery: "Kamma" },
  kapu: { englishName: "Kapu / Balija / Telaga", teluguName: "కాపు / బలిజ / తెలగ", category: "OC", casteLookup: "Kapu", matchQuery: "Kapu, Balija, Telaga" },
  velama: { englishName: "Velama", teluguName: "వెలమ", category: "OC", casteLookup: "Velama", matchQuery: "Velama" },
  brahmin: { englishName: "Brahmin", teluguName: "బ్రాహ్మణ", category: "OC", casteLookup: "Brahmin", matchQuery: "Brahmin" },
  vysya: { englishName: "Arya Vysya / Komati", teluguName: "ఆర్య వైశ్య / కోమటి", category: "OC", casteLookup: "Arya Vysya", matchQuery: "Vysya, Komati" },
  raju_kshatriya: { englishName: "Raju / Kshatriya", teluguName: "రాజు / క్షత్రియ", category: "OC", casteLookup: "Raju", matchQuery: "Raju, Kshatriya" },
  yadava_goud: { englishName: "Yadava / Golla", teluguName: "యాదవ / గొల్ల", category: "BC", casteLookup: "Yadava", matchQuery: "Yadava, Golla" },
  goud: { englishName: "Goud / Ediga", teluguName: "గౌడ్ / ఈడిగ", category: "BC", casteLookup: "Goud", matchQuery: "Goud, Ediga" },
  padmashali_weavers: { englishName: "Padmashali / Devanga", teluguName: "పద్మశాలి / దేవాంగ", category: "BC", casteLookup: "Padmashali", matchQuery: "Padmashali, Padmasali, Devanga" },
  viswabrahmana: { englishName: "Viswabrahmin / Viswakarma", teluguName: "విశ్వబ్రాహ్మణ / విశ్వకర్మ", category: "BC", casteLookup: "Viswabrahmin", matchQuery: "Viswabrahmana, Viswabrahmin, Viswakarma" },
  munnuru_kapu: { englishName: "Munnuru Kapu", teluguName: "మున్నూరు కాపు", category: "BC", casteLookup: "Munnuru Kapu", matchQuery: "Munnuru Kapu, Munnuru" },
  mudiraj: { englishName: "Mudiraj / Tenugollu", teluguName: "ముదిరాజ్ / తెనుగొల్లు", category: "BC", casteLookup: "Mudiraj", matchQuery: "Mudiraj, Tenugollu" },
  kuruma: { englishName: "Kuruma", teluguName: "కురుమ", category: "BC", matchQuery: "Kuruma" },
  rajaka: { englishName: "Rajaka / Chakali", teluguName: "రజక / చాకలి", category: "BC", casteLookup: "Rajaka", matchQuery: "Rajaka, Chakali" },
  kummari: { englishName: "Kummari / Kummara", teluguName: "కుమ్మరి", category: "BC", casteLookup: "Kummara", matchQuery: "Kummari, Kummara" },
  perika: { englishName: "Perika", teluguName: "పెరిక", category: "BC", casteLookup: "Perika", matchQuery: "Perika" },
  others_bc: { englishName: "Other BC Communities", teluguName: "ఇతర BC సంఘాలు", category: "BC", matchQuery: "" },
  mala: { englishName: "Mala", teluguName: "మాల", category: "SC", casteLookup: "Mala", matchQuery: "Mala" },
  madiga: { englishName: "Madiga", teluguName: "మాదిగ", category: "SC", casteLookup: "Madiga", matchQuery: "Madiga" },
  others_sc: { englishName: "Other SC Communities", teluguName: "ఇతర SC సంఘాలు", category: "SC", casteLookup: "SC Others", matchQuery: "" },
  lambada_banjara: { englishName: "Lambada / Banjara", teluguName: "లంబాడా / బంజారా", category: "ST", casteLookup: "Lambada", matchQuery: "Lambada, Banjara, Sugali" },
};

/** Build every public hub from canonical channel-backed caste routes. */
const EXTENDED_COMMUNITIES: CasteDisplayCard[] = CASTES.map((route) => {
  const metadata = COMMUNITY_METADATA[route.key];
  const englishName = metadata?.englishName || route.name;
  const casteLookup = metadata?.casteLookup || englishName;
  return {
    key: route.key,
    route,
    englishName,
    teluguName: metadata?.teluguName || CASTE_TELUGU[casteLookup] || route.name,
    category: metadata?.category || "OTHER",
    subcastes: CASTE_SUBCASTES[casteLookup] || [],
    matchQuery: metadata?.matchQuery ?? englishName,
  };
}).sort((a, b) => a.englishName.localeCompare(b.englishName, "en", { sensitivity: "base" }));

/** Match a registration label to a hub only when a configured search alias,
 * registration parent, or listed sub-community explicitly connects them. */
function hubForRegistrationOption(englishName: string): CasteDisplayCard | undefined {
  const normalizedName = englishName.trim().toLocaleLowerCase("en").replace(/\s+/g, " ");
  return EXTENDED_COMMUNITIES.find((hub) => {
    const metadata = COMMUNITY_METADATA[hub.key];
    const labels = [
      metadata?.englishName,
      metadata?.casteLookup,
      ...(metadata?.matchQuery || "").split(","),
      ...hub.subcastes,
    ];
    return labels.some((label) => label?.trim().toLocaleLowerCase("en").replace(/\s+/g, " ") === normalizedName);
  });
}

type ChannelLinkState = ReturnType<typeof useChannelDirectoryLinks>;
const NO_CHANNEL_LINKS = { telegram: "", whatsapp: "", whatsappIsDirect: false } as const;

function channelLinks(key: string | undefined, directory: ChannelLinkState) {
  if (!key) return NO_CHANNEL_LINKS;
  const channel = ALL_CHANNELS.find((item) => item.key === key);
  return channel ? resolveChannelLinks(channel, directory) : NO_CHANNEL_LINKS;
}

export default function CastesClient() {
  const { lang } = useLang();
  const te = lang === "te";
  const channelDirectory = useChannelDirectoryLinks();
  const getChannelLinks = (key?: string) => channelLinks(key, channelDirectory);
  const [search, setSearch] = useState("");
  const [directoryMode, setDirectoryMode] = useState<DirectoryMode>("HUBS");
  const [layout, setLayout] = useState<DirectoryLayout>("GRID");
  const [selectedLetter, setSelectedLetter] = useState("ALL");
  const [selectedCat, setSelectedCat] = useState<CommunityCategoryFilter>("ALL");
  const [selectedLink, setSelectedLink] = useState<"ALL" | "TELEGRAM" | "WHATSAPP">("ALL");

  const filteredCastes = useMemo(() => {
    const q = search.trim().toLowerCase();
    return EXTENDED_COMMUNITIES.filter((c) => {
      const matchesQuery = !q || [c.englishName, c.teluguName, c.route.name, ...c.subcastes]
        .some((value) => value.toLowerCase().includes(q));
      const matchesCat = selectedCat === "ALL" || c.category === selectedCat;
      const matchesLetter = selectedLetter === "ALL" || c.englishName.trim().charAt(0).toUpperCase() === selectedLetter;
      const links = [channelLinks(c.route.bride?.key, channelDirectory), channelLinks(c.route.groom?.key, channelDirectory)];
      const matchesLink = selectedLink === "ALL"
        || (selectedLink === "TELEGRAM" && links.some((link) => Boolean(link.telegram)))
        || (selectedLink === "WHATSAPP" && links.some((link) => Boolean(link.whatsapp)));
      return matchesQuery && matchesCat && matchesLink && matchesLetter;
    });
  }, [search, selectedCat, selectedLink, selectedLetter, channelDirectory]);

  const filteredRegistrationOptions = useMemo(() => {
    const q = search.trim().toLowerCase();
    return CASTES_DETAILED.filter((community) => {
      const matchesQuery = !q || [community.en, community.te, community.display, ...community.subcastes]
        .some((value) => value.toLowerCase().includes(q));
      const matchesLetter = selectedLetter === "ALL" || community.en.trim().charAt(0).toUpperCase() === selectedLetter;
      return matchesQuery && matchesLetter;
    });
  }, [search, selectedLetter]);

  const availableLetters = [...new Set((directoryMode === "HUBS"
    ? EXTENDED_COMMUNITIES.map((community) => community.englishName)
    : CASTES_DETAILED.map((community) => community.en))
    .map((name) => name.trim().charAt(0).toUpperCase()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "en"));
  const resultCount = directoryMode === "HUBS" ? filteredCastes.length : filteredRegistrationOptions.length;
  const resultTotal = directoryMode === "HUBS" ? EXTENDED_COMMUNITIES.length : CASTES_DETAILED.length;
  const hasActiveFilters = Boolean(search.trim()) || selectedLetter !== "ALL"
    || (directoryMode === "HUBS" && (selectedCat !== "ALL" || selectedLink !== "ALL"));

  const changeDirectoryMode = (mode: DirectoryMode) => {
    setDirectoryMode(mode);
    setSelectedLetter("ALL");
    if (mode === "REGISTRATION") {
      setSelectedCat("ALL");
      setSelectedLink("ALL");
    }
  };

  const clearDirectoryFilters = () => {
    setSearch("");
    setSelectedLetter("ALL");
    setSelectedCat("ALL");
    setSelectedLink("ALL");
  };

  return (
    <div className="min-h-dvh pb-36 bg-[#FCFBF8]">
      {/* HERO SECTION */}
      <section className="maroon-gradient text-white border-b-4 border-gold/40">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <Reveal>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-4 py-1.5 text-xs font-bold shadow-sm">
              👑 {te ? "రిజిస్ట్రీలో ఉన్న కమ్యూనిటీ హబ్‌లు" : "Registry-backed community hubs"} • {te ? "ప్రతి హబ్‌కు వధువు / వరుడు మార్గాలు" : "Bride and groom routes for each hub"}
            </div>

            <h1 className="mt-4 max-w-4xl text-3xl font-black tracking-tight sm:text-4xl md:text-5xl">
              {te ? "కులం / కమ్యూనిటీ హబ్‌లు & సంబంధాల అన్వేషణ" : "Caste & Community Hubs — Explore Matches"}
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-white/90 md:text-base">
              {te ? (
                <>కాన్ఫిగర్ చేసిన channel registryలోని {EXTENDED_COMMUNITIES.length} హబ్‌లను చూడండి లేదా {CASTES_DETAILED.length} ప్రస్తుత నమోదు ఎంపికల జాబితాకు మారండి. ఇవి అధికారికంగా సంపూర్ణ జాబితాలు కావు. బాహ్య లింకుల అందుబాటు తనిఖీ చేయబడదు.</>
              ) : (
                <>Browse {EXTENDED_COMMUNITIES.length} hubs in the configured channel registry, or switch to the separate list of {CASTES_DETAILED.length} current registration options. Neither list is an exhaustive or official classification. External link availability is not monitored.</>
              )}
            </p>

            <div className="mt-5 grid max-w-4xl grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { value: EXTENDED_COMMUNITIES.length, en: "configured channel hubs", te: "రిజిస్ట్రీ కమ్యూనిటీ హబ్‌లు" },
                { value: CHANNEL_STATS.by_tier.L3_CASTE, en: "listed channel entries", te: "లిస్టు చేసిన ఛానల్ ఎంట్రీలు" },
                { value: CASTES_DETAILED.length, en: "registration options", te: "నమోదు ఎంపికలు" },
                { value: "A–Z", en: "search and filter", te: "వెతకడం & వడపోత" },
              ].map((stat) => (
                <div key={stat.en} className="rounded-2xl border border-white/20 bg-white/10 px-3 py-2.5 backdrop-blur-sm">
                  <div className="text-lg font-black">{stat.value}</div>
                  <div className="text-[10px] font-semibold text-white/75 sm:text-[11px]">{te ? stat.te : stat.en}</div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex max-w-2xl flex-col gap-2 sm:flex-row">
              <label htmlFor="community-directory-search" className="sr-only">{te ? "కమ్యూనిటీ హబ్‌లు, నమోదు ఎంపికలు లేదా ఉపసమాజాలను వెతకండి" : "Search hubs, registration options, or sub-communities"}</label>
              <input
                id="community-directory-search"
                type="search"
                autoComplete="off"
                placeholder={te ? "🔍 కమ్యూనిటీ / ఉపసమాజం పేరు" : "🔍 Search hubs, options, or sub-communities"}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="min-h-12 min-w-0 flex-1 rounded-2xl border border-white/30 bg-white/15 px-4 py-3 text-sm text-white placeholder:text-white/70 shadow-inner transition focus:bg-white/25 focus:outline-none focus:ring-2 focus:ring-gold"
              />
              {search ? (
                <button type="button" onClick={() => setSearch("")} className="min-h-12 rounded-2xl border border-white/30 bg-white/15 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold">
                  {te ? "వెతుకులాట తొలగించండి" : "Clear search"}
                </button>
              ) : null}
            </div>
          </Reveal>
        </div>
      </section>

      {/* MAIN CONTENT AREA */}
      <div className="max-w-6xl mx-auto px-4 py-10">
        <SectionHeading
          eyebrow={te ? "సమాజాలు & కమ్యూనిటీలు" : "Telugu Communities & Hubs"}
          title={te ? "మీ కులం ఎంచుకోండి — సంబంధాలు చూడండి" : "Select Your Community — Explore Alliances"}
          subtitle={directoryMode === "HUBS"
            ? (te ? "ప్రతి లిస్టు చేసిన హబ్‌కు వధువు, వరుడు మార్గాలు మరియు సంబంధాల సెర్చ్." : "Each listed hub links to bride and groom pages plus profile discovery.")
            : (te ? "ప్రస్తుత నమోదు ఎంపికలు, వాటి ఉపసమాజాలు మరియు సభ్యుల నమోదు చేసిన ప్రొఫైళ్లను చూడండి." : "Browse current registration choices, their sub-communities, and member-entered profile searches.")}
          telugu={te}
        />

        <section aria-labelledby="directory-view-heading" className="mt-6 rounded-3xl border border-amber-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <h2 id="directory-view-heading" className="text-sm font-black text-slate-900">
                {te ? "కేటలాగ్‌ను ఎంచుకోండి" : "Choose a directory view"}
              </h2>
              <p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-slate-600">
                {directoryMode === "HUBS"
                  ? (te ? "ఈ హబ్‌లు కాన్ఫిగర్ చేసిన channel registry ఆధారంగా ఉన్నాయి. వర్గ ట్యాగ్‌లు నావిగేషన్ కోసం మాత్రమే." : "These hubs come from the configured channel registry. Group tags are navigational, not official eligibility or verification labels.")
                  : (te ? `${CASTES_DETAILED.length} నమోదు ఎంపికలు మరియు వాటి ఉపసమాజాలను వెతకండి. dedicated hub లింకులు కాన్ఫిగర్ చేసిన చోట మాత్రమే చూపిస్తాం.` : `Search all ${CASTES_DETAILED.length} current registration choices and their listed sub-communities. Dedicated hub links appear only where configured.`)}
              </p>
            </div>
            <div className="grid w-full grid-cols-2 gap-2 xl:w-auto" role="group" aria-label={te ? "డైరెక్టరీ రకం" : "Directory source"}>
              <button
                type="button"
                aria-pressed={directoryMode === "HUBS"}
                onClick={() => changeDirectoryMode("HUBS")}
                className={`min-h-12 rounded-2xl border px-3 py-2 text-left text-xs font-extrabold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon ${directoryMode === "HUBS" ? "maroon-gradient border-transparent text-white shadow-sm" : "border-slate-200 bg-slate-50 text-slate-700 hover:border-maroon/40"}`}
              >
                <span className="block">{te ? "కమ్యూనిటీ హబ్‌లు" : "Channel hubs"}</span>
                <span className="mt-0.5 block text-[10px] opacity-75">{EXTENDED_COMMUNITIES.length} {te ? "రిజిస్ట్రీ హబ్‌లు" : "configured hubs"}</span>
              </button>
              <button
                type="button"
                aria-pressed={directoryMode === "REGISTRATION"}
                onClick={() => changeDirectoryMode("REGISTRATION")}
                className={`min-h-12 rounded-2xl border px-3 py-2 text-left text-xs font-extrabold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon ${directoryMode === "REGISTRATION" ? "maroon-gradient border-transparent text-white shadow-sm" : "border-slate-200 bg-slate-50 text-slate-700 hover:border-maroon/40"}`}
              >
                <span className="block">{te ? "నమోదు కమ్యూనిటీ ఎంపికలు" : "Registration catalogue"}</span>
                <span className="mt-0.5 block text-[10px] opacity-75">{CASTES_DETAILED.length} {te ? "ఎంపికలు" : "current options"}</span>
              </button>
            </div>
          </div>

          {directoryMode === "HUBS" ? (
            <>
              <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 lg:flex-row lg:items-center lg:justify-between">
                <p className="max-w-xl text-[11px] leading-relaxed text-slate-600">
                  {te ? "OC / BC / SC / ST ట్యాగ్‌లు నావిగేషన్ కోసం మాత్రమే; అధికారిక అర్హత లేదా కుల ధృవీకరణ కావు." : "OC / BC / SC / ST tags are for navigation only; they are not official eligibility or caste-verification decisions."}
                </p>
                <div className="flex flex-wrap gap-2" role="group" aria-label={te ? "కమ్యూనిటీ వర్గం" : "Community group"}>
                  {CATEGORY_TABS.map((cat) => {
                    const count = cat.key === "ALL" ? EXTENDED_COMMUNITIES.length : EXTENDED_COMMUNITIES.filter((item) => item.category === cat.key).length;
                    return (
                      <button
                        type="button"
                        key={cat.key}
                        aria-pressed={selectedCat === cat.key}
                        onClick={() => setSelectedCat(cat.key)}
                        className={`min-h-10 rounded-full border px-3 py-2 text-[11px] font-extrabold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon ${selectedCat === cat.key ? "maroon-gradient border-transparent text-white shadow-sm" : "border-slate-200 bg-slate-50 text-slate-700 hover:border-maroon/40 hover:bg-amber-50"}`}
                      >
                        {te ? cat.te : cat.en} <span className="opacity-75">{count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2" role="group" aria-label={te ? "లిస్టు చేసిన బాహ్య destination వడపోత" : "Filter by listed external destination"}>
                <span className="mr-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">{te ? "లింకులు" : "Listed links"}</span>
                {LINK_TABS.map((tab) => (
                  <button
                    type="button"
                    key={tab.key}
                    aria-pressed={selectedLink === tab.key}
                    onClick={() => setSelectedLink(tab.key)}
                    className={`min-h-10 rounded-xl border px-3 py-2 text-[11px] font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon ${selectedLink === tab.key ? "border-[#7A0C2E] bg-rose-50 text-[#7A0C2E]" : "border-slate-200 bg-white text-slate-600 hover:border-maroon/40"}`}
                  >
                    {te ? tab.te : tab.en}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <p className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-[11px] leading-relaxed text-slate-600">
              {te ? "ఈ జాబితా ప్రస్తుత నమోదు ఎంపికలను చూపిస్తుంది; ఇది అన్ని కమ్యూనిటీల అధికారిక జాబితా కాదు. కమ్యూనిటీకి నేరుగా సరిపోయే బాహ్య లింక్ లేకపోతే ఊహించి చూపించము." : "This is the current registration list, not an official or exhaustive community catalogue. No external destination is guessed when an option has no direct configured hub link."}
            </p>
          )}

          <div className="mt-4 border-t border-slate-100 pt-3">
            <div className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">{te ? "అక్షరం ద్వారా వడపోత" : "Filter alphabetically"}</div>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label={te ? "అక్షర క్రమ వడపోత" : "Alphabetical community filter"}>
              {["ALL", ...availableLetters].map((letter) => (
                <button
                  type="button"
                  key={letter}
                  aria-pressed={selectedLetter === letter}
                  onClick={() => setSelectedLetter(letter)}
                  className={`min-h-9 min-w-9 rounded-lg border px-2.5 py-1.5 text-[10px] font-extrabold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon ${selectedLetter === letter ? "border-[#7A0C2E] bg-rose-50 text-[#7A0C2E]" : "border-slate-200 bg-white text-slate-600 hover:border-maroon/40"}`}
                >
                  {letter === "ALL" ? (te ? "అన్నీ" : "All") : letter}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-end gap-3">
            <span className="mr-auto text-[11px] font-bold text-slate-600" aria-live="polite">
              {directoryMode === "HUBS"
                ? (te ? `${resultCount} / ${resultTotal} హబ్‌లు` : `Showing ${resultCount} of ${resultTotal} channel hubs`)
                : (te ? `${resultCount} / ${resultTotal} నమోదు ఎంపికలు` : `Showing ${resultCount} of ${resultTotal} registration options`)}
            </span>
            {directoryMode === "HUBS" ? (
              <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1" role="group" aria-label={te ? "హబ్ కార్డ్ లేఅవుట్" : "Hub layout"}>
                {(["GRID", "COMPACT"] as DirectoryLayout[]).map((option) => (
                  <button
                    type="button"
                    key={option}
                    aria-pressed={layout === option}
                    onClick={() => setLayout(option)}
                    className={`min-h-9 rounded-lg px-3 py-1.5 text-[10px] font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon ${layout === option ? "bg-white text-[#7A0C2E] shadow-sm" : "text-slate-600 hover:text-[#7A0C2E]"}`}
                  >
                    {option === "GRID" ? (te ? "కార్డ్‌లు" : "Cards") : (te ? "కాంపాక్ట్" : "Compact")}
                  </button>
                ))}
              </div>
            ) : null}
            {hasActiveFilters ? (
              <button type="button" onClick={clearDirectoryFilters} className="min-h-10 rounded-lg px-2.5 text-[11px] font-bold text-[#7A0C2E] underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon">
                {te ? "అన్ని వడపోతలు తొలగించండి" : "Clear filters"}
              </button>
            ) : null}
          </div>
        </section>

        {directoryMode === "HUBS" ? (
          <div className={`mt-6 grid gap-4 ${layout === "COMPACT" ? "grid-cols-1" : "sm:grid-cols-2 xl:grid-cols-3"}`}>
          {filteredCastes.map((c, i) => {
            const brideLinks = getChannelLinks(c.route.bride?.key);
            const groomLinks = getChannelLinks(c.route.groom?.key);
            const brideTelegram = brideLinks.telegram;
            const groomTelegram = groomLinks.telegram;
            const brideWhatsApp = brideLinks.whatsapp;
            const groomWhatsApp = groomLinks.whatsapp;
            const matchesHref = c.matchQuery ? `/matches?caste=${encodeURIComponent(c.matchQuery)}` : "/matches";
            return (
              <Reveal key={c.key} delay={(i % 6) * 35}>
                <div className={`group flex h-full min-w-0 flex-col rounded-3xl border border-amber-200 bg-white p-4 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-amber-400 hover:shadow-xl sm:p-5 ${layout === "COMPACT" ? "lg:flex-row lg:items-center lg:gap-4" : ""}`}>
                  <div className={`flex items-start justify-between gap-3 ${layout === "COMPACT" ? "lg:flex-1" : ""}`}>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-rose-50 to-amber-50 text-lg">💍</span>
                        <h3 lang={te ? "te-IN" : "en-IN"} className={`min-w-0 break-words text-base font-black leading-snug text-[#7A0C2E] sm:text-lg ${te ? "telugu" : ""}`}>
                          {te ? c.teluguName : c.englishName}
                        </h3>
                      </div>
                      <p className={`mt-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500 ${layout === "COMPACT" ? "lg:mt-1" : ""}`}>{te ? "లిస్టు చేసిన కమ్యూనిటీ హబ్" : "Registry-listed community hub"}</p>
                      {layout === "COMPACT" ? (
                        <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
                          {te ? `${c.subcastes.length} నమోదు ఉపసమాజ ఎంపికలు` : `${c.subcastes.length} listed registration sub-community options`}
                        </p>
                      ) : null}
                    </div>
                    <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-black text-slate-600">{c.category}</span>
                  </div>

                  {layout === "GRID" ? (
                    <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50/60 p-3">
                      <div className="text-[11px] font-bold text-slate-800">{te ? "నమోదు ఎంపికలు" : "Registration options"}</div>
                      <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
                        {te ? (c.subcastes.length ? `ఈ హబ్‌కు ${c.subcastes.length} ఉపసమాజ ఎంపికలు నమోదు ఫారంలో ఉన్నాయి.` : "సరైన ఉపసమాజం కనిపించకపోతే స్వయంగా పేర్కొన్న పేరును నమోదు చేయవచ్చు.") : (c.subcastes.length ? `${c.subcastes.length} sub-community options are available in registration; the list is not exhaustive.` : "If no listed option fits, registration supports a self-described name.")}
                      </p>
                    </div>
                  ) : null}

                  <div className={`mt-4 grid grid-cols-2 gap-2 ${layout === "COMPACT" ? "lg:mt-0 lg:w-44 lg:shrink-0" : ""}`}>
                    <Link href={`/castes/${buildSlug(c.key, "bride")}`} className="inline-flex min-h-11 items-center justify-center gap-1 rounded-xl bg-gradient-to-r from-[#7A0C2E] to-[#A0143A] px-3 py-2.5 text-xs font-extrabold text-white shadow-sm transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon focus-visible:ring-offset-2">
                      👰 {te ? "వధువుల హబ్" : "Brides"}
                    </Link>
                    <Link href={`/castes/${buildSlug(c.key, "groom")}`} className="inline-flex min-h-11 items-center justify-center gap-1 rounded-xl border border-[#7A0C2E]/25 bg-rose-50 px-3 py-2.5 text-xs font-extrabold text-[#7A0C2E] transition hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon focus-visible:ring-offset-2">
                      🤵 {te ? "వరుల హబ్" : "Grooms"}
                    </Link>
                  </div>

                  <div className={`mt-3 grid grid-cols-2 gap-2 ${layout === "COMPACT" ? "lg:mt-0 lg:w-56 lg:shrink-0" : ""}`}>
                    {brideTelegram ? <a href={brideTelegram} target="_blank" rel="noopener noreferrer" aria-label={te ? `${c.englishName} వధువుల Telegram destination తెరవండి` : `Open the listed Telegram destination for ${c.englishName} brides`} title={te ? "బాహ్య Telegram లింక్; అందుబాటు తనిఖీ చేయబడదు" : "External Telegram link; availability is not checked"} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#229ED9] px-3 py-2 text-[11px] font-bold text-white transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#229ED9] focus-visible:ring-offset-2"><TelegramIcon className="h-4 w-4" mono /> Telegram</a> : <span className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-[11px] font-semibold text-slate-500"><TelegramIcon className="h-4 w-4" mono /> {te ? "Telegram లింక్ లేదు" : "No Telegram link"}</span>}
                    {brideWhatsApp ? <a href={brideWhatsApp} target="_blank" rel="noopener noreferrer" aria-label={te ? `${c.englishName} వధువుల WhatsApp channel తెరవండి` : `Open the listed WhatsApp channel for ${c.englishName} brides`} title={te ? "బాహ్య WhatsApp channel; అందుబాటు తనిఖీ చేయబడదు" : "External WhatsApp channel; availability is not checked"} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#128C4A] px-3 py-2 text-[11px] font-bold text-white transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#128C4A] focus-visible:ring-offset-2"><WhatsAppIcon className="h-4 w-4" mono /> WhatsApp</a> : <span className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-[11px] font-semibold text-slate-500"><WhatsAppIcon className="h-4 w-4" mono /> {te ? "WhatsApp లింక్ లేదు" : "No WhatsApp link"}</span>}
                  </div>

                  <div className={`mt-auto pt-4 ${layout === "COMPACT" ? "lg:mt-0 lg:w-48 lg:shrink-0 lg:pt-0" : ""}`}>
                    <Link href={matchesHref} className="block min-h-10 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-center text-xs font-extrabold text-[#7A0C2E] transition hover:border-amber-400 hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon focus-visible:ring-offset-2">
                      🔎 {te ? (c.matchQuery ? "ఈ కమ్యూనిటీ సంబంధాలు చూడండి" : "ప్రొఫైల్ మ్యాచ్‌లు చూడండి") : (c.matchQuery ? `Browse ${c.englishName} matches` : "Browse all matches")}
                    </Link>
                    <p className="mt-2 text-center text-[10px] leading-relaxed text-slate-500">{te ? "లింకులు నమోదు చేసిన destinations మాత్రమే; బాహ్య సేవ స్థితి ధృవీకరించబడదు." : "Only configured destinations are shown; external service status is not verified."}</p>
                  </div>
                </div>
              </Reveal>
            );
          })}
          </div>
        ) : null}

        {directoryMode === "REGISTRATION" ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredRegistrationOptions.map((community, i) => {
              const relatedHub = hubForRegistrationOption(community.en);
              const isSelfDescribed = community.en === OTHER_COMMUNITY_OPTION;
              const matchesHref = isSelfDescribed ? "/matches" : `/matches?caste=${encodeURIComponent(community.en)}`;
              return (
                <Reveal key={community.en} delay={(i % 6) * 25}>
                  <article className="flex h-full min-w-0 flex-col rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-lg sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 lang={te ? "te-IN" : "en-IN"} className={`break-words text-base font-black leading-snug text-[#7A0C2E] sm:text-lg ${te ? "telugu" : ""}`}>
                          {te ? community.te : community.en}
                        </h3>
                        <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                          {te ? "ప్రస్తుత నమోదు ఎంపిక" : "Current registration option"}
                        </p>
                      </div>
                      <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-50 text-lg">🪷</span>
                    </div>

                    {community.subcastes.length ? (
                      <details className="mt-4 rounded-2xl border border-amber-100 bg-amber-50/60 p-3">
                        <summary className="min-h-10 cursor-pointer select-none text-[11px] font-bold text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon">
                          {te ? `${community.subcastes.length} ఉపసమాజ ఎంపికలు చూపించండి` : `View ${community.subcastes.length} sub-community options`}
                        </summary>
                        <ul className="mt-2 grid max-h-44 grid-cols-1 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-2">
                          {community.subcastes.map((subcommunity) => (
                            <li key={subcommunity} className="min-w-0">
                              <Link href={`/matches?caste=${encodeURIComponent(subcommunity)}`} className="block min-h-9 break-words rounded-lg border border-white/80 bg-white px-2.5 py-2 text-[10px] font-semibold text-slate-700 transition hover:border-amber-300 hover:text-[#7A0C2E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon">
                                {subcommunity}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </details>
                    ) : (
                      <p className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-600">
                        {te ? "ఈ ఎంపికకు ఉపసమాజ జాబితా లేదు; అవసరమైతే నమోదు సమయంలో స్వయంగా పేర్కొన్న పేరు ఉపయోగించండి." : "No sub-community choices are listed for this option; use a self-described name during registration if needed."}
                      </p>
                    )}

                    {relatedHub ? (
                      <div className="mt-3 rounded-2xl border border-rose-100 bg-rose-50/60 p-3">
                        <p className="mb-2 text-[10px] font-bold text-slate-700">
                          {te ? `లిస్టు చేసిన సంబంధిత హబ్: ${relatedHub.englishName}` : `Related configured hub: ${relatedHub.englishName}`}
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          <Link href={`/castes/${buildSlug(relatedHub.key, "bride")}`} className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[#7A0C2E] px-2 py-2 text-[10px] font-extrabold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon focus-visible:ring-offset-2">
                            {te ? "వధువులు" : "Brides"}
                          </Link>
                          <Link href={`/castes/${buildSlug(relatedHub.key, "groom")}`} className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#7A0C2E]/25 bg-white px-2 py-2 text-[10px] font-extrabold text-[#7A0C2E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon focus-visible:ring-offset-2">
                            {te ? "వరులు" : "Grooms"}
                          </Link>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-3 text-[10px] leading-relaxed text-slate-500">
                        {te ? "ఈ ఎంపికకు ప్రత్యేక channel hub లింక్‌ను registryలో కనుగొనలేదు." : "No direct channel-hub link is mapped to this registration option."}
                      </p>
                    )}

                    <div className="mt-auto grid grid-cols-2 gap-2 pt-4">
                      <Link href={matchesHref} className="inline-flex min-h-10 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 px-2 py-2 text-center text-[10px] font-extrabold text-[#7A0C2E] transition hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon focus-visible:ring-offset-2">
                        {te ? (isSelfDescribed ? "మ్యాచ్‌లు చూడండి" : "సంబంధాలు చూడండి") : (isSelfDescribed ? "Browse matches" : `Find ${community.en} matches`)}
                      </Link>
                      <Link href="/register" className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-2 py-2 text-center text-[10px] font-extrabold text-slate-700 transition hover:border-maroon/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon focus-visible:ring-offset-2">
                        {te ? "నమోదు ప్రారంభించండి" : "Start registration"}
                      </Link>
                    </div>
                    <p className="mt-2 text-center text-[10px] leading-relaxed text-slate-500">
                      {te ? "మ్యాచ్‌లు సభ్యులు నమోదు చేసిన caste / sub-community పదాలను బట్టి వడపోత చేస్తాయి." : "Profile search uses the member-entered caste or sub-community text; results depend on available profiles."}
                    </p>
                  </article>
                </Reveal>
              );
            })}
          </div>
        ) : null}

        {/* Empty state */}
        {resultCount === 0 && (
          <div className="mt-10 text-center p-10 bg-white rounded-3xl border border-gray-200 card-shadow">
            <div className="text-4xl">🔍</div>
            <div className={`font-extrabold text-gray-800 text-lg mt-3 ${te ? "telugu" : ""}`}>
              {te ? "ఈ వడపోతలకు సరిపడే కమ్యూనిటీలు లేవు" : "No communities match these filters"}
            </div>
            <p className={`text-xs text-gray-500 mt-1 max-w-md mx-auto ${te ? "telugu" : ""}`}>
              {te ? "పేరు కనిపించకపోతే ఉచిత నమోదులో ‘Other / self-described’ ఎంపికను ఎంచుకుని మీ కమ్యూనిటీ పేరును నమోదు చేయండి." : "If you do not see a match, choose ‘Other / self-described’ during free registration and enter your community name."}
            </p>
            <Link href="/register" className="inline-block mt-5 maroon-gradient text-white font-bold px-6 py-3 rounded-2xl text-xs shadow-brand hover-lift">
              {te ? "📝 ఉచిత నమోదు" : "Register Free"}
            </Link>
          </div>
        )}

        {/* Bottom Navigation CTA Bar */}
        <div className="mt-12 p-6 bg-gradient-to-r from-[#7A0C2E] to-[#4A0018] rounded-3xl text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <div className={`text-lg font-extrabold ${te ? "telugu" : ""}`}>
              {te ? "మీ కులానికి సరిపోయే సంబంధాలు కావాలా?" : "Explore profiles by community"}
            </div>
            <div className={`text-xs text-white/80 mt-1 ${te ? "telugu" : ""}`}>
              {te ? "ఉచితంగా నమోదు చేసుకోండి • మొదటి 3 interest requests ఉచితం" : "Register for free • First 3 interest requests are free"}
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <Link href="/register" className="gold-gradient text-maroon font-black px-6 py-3 rounded-2xl text-xs hover-lift shadow-md">
              {te ? "📝 ఉచిత నమోదు" : "📝 Register FREE"}
            </Link>
            <Link href="/channels" className="bg-white/15 hover:bg-white/25 border border-white/30 text-white font-bold px-5 py-3 rounded-2xl text-xs transition">
              📢 {CHANNEL_STATS.total} {te ? "పబ్లిక్ ఛానల్ listings" : "public channel listings"}
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
