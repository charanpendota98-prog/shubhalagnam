"use client";

import { useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { useLang } from "@/lib/lang";
import { WhatsAppIcon } from "@/components/BrandIcons";
import { SITE_CONFIG } from "@/lib/site-config";

type Tab = "customs" | "parents" | "candidates" | "dos_donts";
type Copy = { te: string; en: string };

const CUSTOMS: { title: Copy; body: Copy }[] = [
  {
    title: { te: "1. స్వాగతం మరియు ఆతిథ్యం", en: "1. Welcome and hospitality" },
    body: {
      te: "కొన్ని కుటుంబాల్లో వరుడు, వారి తల్లిదండ్రులు మరియు బంధువులను వధువు ఇంటికి ఆహ్వానించి, ఇంటి సంప్రదాయం ప్రకారం స్వాగతిస్తారు. నీరు లేదా టీ అందించడం వంటి సరళమైన ఆతిథ్యం చాలు.",
      en: "In some families, the prospective groom, parents, and relatives are welcomed at the prospective bride’s home according to that family’s customs. Simple hospitality, such as offering water or tea, is enough.",
    },
  },
  {
    title: { te: "2. ప్రార్థన లేదా కుటుంబ ఆచారం", en: "2. Prayer or a family custom" },
    body: {
      te: "కుటుంబం కోరుకుంటే, తమకు ముఖ్యమైన ప్రార్థన లేదా సంప్రదాయంతో సమావేశాన్ని ప్రారంభించవచ్చు. పాల్గొనడం అందరికీ సౌకర్యంగా ఉండేలా చూసుకోండి.",
      en: "If the family wishes, the meeting may begin with a prayer or custom that is meaningful to them. Make sure everyone is comfortable with taking part.",
    },
  },
  {
    title: { te: "3. అల్పాహారం మరియు సంభాషణ", en: "3. Refreshments and conversation" },
    body: {
      te: "అల్పాహారం లేదా పానీయాలు కుటుంబ ఇష్టానుసారం అందించవచ్చు. ఆతిథ్యం సరళంగా ఉంచి, అందరికీ సౌకర్యంగా మాట్లాడుకునే సమయం ఇవ్వండి.",
      en: "Families may offer refreshments or drinks if they wish. Keep hospitality simple and leave enough time for everyone to talk comfortably.",
    },
  },
  {
    title: { te: "4. గౌరవప్రదమైన వీడ్కోలు", en: "4. A respectful farewell" },
    body: {
      te: "కుటుంబంలో ఆచారం ఉంటే తాంబూలం లేదా చిన్న కానుకతో వీడ్కోలు పలకవచ్చు. ఎవరిపైనా ఖర్చు లేదా ఆచారాల విషయంలో ఒత్తిడి చేయకండి.",
      en: "If it is part of the family’s custom, offer tamboolam or a small token when guests leave. No one should feel pressured about gifts, expenses, or rituals.",
    },
  },
];

const FAMILY_TOPICS: { id: string; title: Copy; desc: Copy }[] = [
  {
    id: "family",
    title: { te: "కుటుంబ నేపథ్యం మరియు అలవాట్లు", en: "Family background and everyday habits" },
    desc: { te: "కుటుంబ జీవనం, ఆహారపు అలవాట్లు, వ్యక్తిగత పరిమితులు వంటి విషయాలను గౌరవంగా మాట్లాడుకోండి.", en: "Discuss family life, food preferences, and personal boundaries respectfully." },
  },
  {
    id: "work",
    title: { te: "ఉద్యోగం, కెరీర్ మరియు నివాసం", en: "Work, career, and where to live" },
    desc: { te: "ప్రస్తుత పని, భవిష్యత్ లక్ష్యాలు, వివాహం తర్వాత నగరం లేదా దేశం మారే అవకాశాలపై మాట్లాడుకోండి.", en: "Talk about current work, future goals, and whether either person may relocate after marriage." },
  },
  {
    id: "beliefs",
    title: { te: "విలువలు మరియు సంప్రదాయాలు", en: "Values and traditions" },
    desc: { te: "మతం, కుటుంబ ఆచారాలు, పండుగలు లేదా జాతకం వంటి అంశాల్లో ఎవరి అభిప్రాయాలు ఏమిటో తెలుసుకోండి.", en: "Learn what each person thinks about faith, family traditions, festivals, or horoscope practices." },
  },
  {
    id: "plans",
    title: { te: "వివాహ వేడుక మరియు ప్రణాళికలు", en: "Wedding plans and practical arrangements" },
    desc: { te: "తేదీలు, ప్రదేశం, వేడుక పరిమాణం మరియు ఖర్చుల గురించి పరస్పర అంగీకారంతో చర్చించండి.", en: "Discuss dates, venue, the size of the event, and costs by mutual agreement." },
  },
  {
    id: "responsibilities",
    title: { te: "కుటుంబ బాధ్యతలు", en: "Family responsibilities" },
    desc: { te: "ఇరు కుటుంబాల బాధ్యతలు, సంరక్షణ అవసరాలు మరియు భవిష్యత్ అంచనాలను స్పష్టంగా చెప్పుకోండి.", en: "Be clear about responsibilities to both families, care needs, and expectations for the future." },
  },
];

const CANDIDATE_TOPICS: { title: Copy; question: Copy }[] = [
  {
    title: { te: "1. రోజువారీ జీవితం మరియు ఆసక్తులు", en: "1. Daily life and interests" },
    question: { te: "ఖాళీ సమయంలో ఏమి చేయడం ఇష్టం? పని, విశ్రాంతి, సంగీతం, పుస్తకాలు లేదా ప్రయాణం ఎలా సమతుల్యం చేసుకుంటారు?", en: "What do you enjoy in your free time? How do you balance work with rest, music, reading, or travel?" },
  },
  {
    title: { te: "2. కెరీర్ మరియు భవిష్యత్ లక్ష్యాలు", en: "2. Career and future goals" },
    question: { te: "మీ కెరీర్‌లో తదుపరి లక్ష్యాలు ఏమిటి? చదువు లేదా పని కోసం వేరే నగరానికి వెళ్లే ఆలోచన ఉందా?", en: "What are your next career goals? Might you want to relocate for work or further study?" },
  },
  {
    title: { te: "3. కుటుంబ విలువలు మరియు బాధ్యతలు", en: "3. Family values and responsibilities" },
    question: { te: "కుటుంబంతో గడిపే సమయం, పెద్దల సంరక్షణ, వ్యక్తిగత స్వేచ్ఛ గురించి మీ ఆలోచనలు ఏమిటి?", en: "What are your thoughts on time with family, caring for elders, and maintaining individual independence?" },
  },
  {
    title: { te: "4. భాగస్వామ్యంపై అంచనాలు", en: "4. Expectations of a partnership" },
    question: { te: "పరస్పర గౌరవం, నిర్ణయాలు కలిసి తీసుకోవడం, విభేదాలను పరిష్కరించడం మీకు ఎలా ఉండాలి?", en: "What do mutual respect, shared decision-making, and resolving disagreements look like to you?" },
  },
];

const DOS: Copy[] = [
  { te: "నిజాయితీగా, సహజంగా మాట్లాడండి; చూపించడానికి మాత్రమే వివరాలు జోడించకండి.", en: "Be honest and genuine; do not add details just to impress." },
  { te: "ఇరు కుటుంబాల వారితో మర్యాదగా, ప్రశాంతంగా మాట్లాడండి.", en: "Speak respectfully and calmly with both families." },
  { te: "ప్రతి ఒక్కరికీ ప్రశ్నలు అడగడానికి, సమాధానం ఆలోచించడానికి సమయం ఇవ్వండి.", en: "Give everyone time to ask questions and consider their answers." },
  { te: "ఫోన్‌ను పక్కన పెట్టి, సంభాషణపై శ్రద్ధ పెట్టండి.", en: "Put phones aside and give the conversation your attention." },
];

const DONTS: Copy[] = [
  { te: "అక్కడికక్కడే నిర్ణయం చెప్పమని ఒత్తిడి చేయకండి.", en: "Do not pressure anyone to make an immediate decision." },
  { te: "జీతం లేదా ఆస్తుల గురించి అవమానకరంగా ప్రశ్నించకండి.", en: "Do not ask about income or assets in a demeaning way." },
  { te: "అంగీకారం లేకుండా వ్యక్తిగత లేదా గత సంబంధాల గురించి ప్రశ్నించకండి.", en: "Do not ask intrusive questions about private matters or past relationships without consent." },
  { te: "సరిపోకపోతే అవమానించకుండా, గౌరవంగా స్పందించండి.", en: "If it is not a fit, respond respectfully rather than insulting anyone." },
];

const TAB_ORDER: Tab[] = ["customs", "parents", "candidates", "dos_donts"];

export default function PelliChoopuluGuide() {
  const { lang } = useLang();
  const te = lang === "te";
  const [activeTab, setActiveTab] = useState<Tab>("customs");
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const choose = (copy: Copy) => te ? copy.te : copy.en;

  const tabLabels: Record<Tab, Copy> = {
    customs: { te: "ఆచారాలు", en: "Customs" },
    parents: { te: "కుటుంబ చెక్‌లిస్ట్", en: "Family checklist" },
    candidates: { te: "ఇద్దరి సంభాషణ", en: "Private conversation" },
    dos_donts: { te: "చేయాల్సినవి / వద్దనేవి", en: "Do’s and don’ts" },
  };

  const shareText = te
    ? `☕ *మన వివాహ — పెళ్లి చూపుల మార్గదర్శిని*\n\nసంప్రదాయాలు, కుటుంబ సంభాషణ, అభ్యర్థుల మాటలు మరియు గౌరవప్రదమైన ప్రవర్తనపై ఉపయోగకరమైన గైడ్. కుటుంబాల సంప్రదాయాలు మారవచ్చు; పరస్పర అంగీకారం, సౌకర్యం ముఖ్యం.\n\n🔗 చదవండి: ${SITE_CONFIG.siteUrl}/pelli-choopulu`
    : `☕ *Mana Vivaha — Pelli Choopulu Guide*\n\nA practical guide to customs, family conversations, questions for prospective partners, and respectful conduct. Traditions vary by family; comfort and consent come first.\n\n🔗 Read the guide: ${SITE_CONFIG.siteUrl}/pelli-choopulu`;
  const shareUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, current: Tab) => {
    let nextIndex = TAB_ORDER.indexOf(current);
    if (event.key === "ArrowRight") nextIndex = (nextIndex + 1) % TAB_ORDER.length;
    else if (event.key === "ArrowLeft") nextIndex = (nextIndex - 1 + TAB_ORDER.length) % TAB_ORDER.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = TAB_ORDER.length - 1;
    else return;
    event.preventDefault();
    const next = TAB_ORDER[nextIndex];
    setActiveTab(next);
    document.getElementById(`pelli-tab-${next}`)?.focus();
  };

  const tabButton = (tab: Tab, icon: string) => (
    <button
      key={tab}
      id={`pelli-tab-${tab}`}
      type="button"
      role="tab"
      aria-selected={activeTab === tab}
      aria-controls={`pelli-panel-${tab}`}
      tabIndex={activeTab === tab ? 0 : -1}
      onClick={() => setActiveTab(tab)}
      onKeyDown={(event) => handleTabKeyDown(event, tab)}
      className={`min-h-12 rounded-2xl border px-3 py-2 text-xs font-bold transition sm:text-sm ${activeTab === tab ? "border-maroon bg-maroon text-white shadow-md" : "border-gold/20 bg-white text-gray-700 hover:bg-gold/10"}`}
    >
      <span aria-hidden="true">{icon} </span>{choose(tabLabels[tab])}
    </button>
  );

  return (
    <div lang={te ? "te-IN" : "en-IN"} className="min-h-dvh bg-[#FDFBF7] px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-7 sm:space-y-8">
        <header className="space-y-3 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/15 px-4 py-1.5 text-xs font-bold text-maroon">
            🌸 {te ? "పెళ్లి చూపుల మార్గదర్శిని" : "Pelli Choopulu Guide"}
          </div>
          <h1 className={`text-3xl font-extrabold text-maroon sm:text-4xl ${te ? "telugu" : ""}`}>
            {te ? "పెళ్లి చూపులు: సంప్రదాయాలు మరియు కుటుంబ మార్గదర్శిని" : "Pelli Choopulu: Meeting Etiquette & Family Guide"}
          </h1>
          <p className={`mx-auto max-w-2xl text-sm leading-7 text-gray-700 ${te ? "telugu" : ""}`}>
            {te
              ? "సంప్రదాయాలు ప్రాంతం, మతం, కుటుంబం ప్రకారం మారుతాయి. అందరికీ సౌకర్యంగా ఉండే విధంగా, పరస్పర గౌరవం మరియు అంగీకారంతో ముందుకు వెళ్లండి."
              : "Customs vary by region, religion, and family. Agree together on what feels comfortable; mutual respect and consent matter most."}
          </p>
        </header>

        <div className="flex justify-center">
          <a
            href={shareUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={te ? "ఈ గైడ్‌ను WhatsApp ద్వారా పంచుకోండి" : "Share this guide using WhatsApp"}
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#25D366] px-5 py-2.5 text-xs font-bold text-white shadow transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
          >
            <WhatsAppIcon className="h-4 w-4" mono />
            <span>{te ? "ఈ గైడ్‌ను WhatsApp లో పంచుకోండి" : "Share this guide on WhatsApp"}</span>
          </a>
        </div>

        <div role="tablist" aria-label={te ? "గైడ్ విభాగాలు" : "Guide sections"} className="grid grid-cols-2 gap-2 border-b border-gold/30 pb-3 sm:grid-cols-4 sm:gap-3">
          {tabButton("customs", "🪔")}
          {tabButton("parents", "👨‍👩‍👦")}
          {tabButton("candidates", "💬")}
          {tabButton("dos_donts", "✨")}
        </div>

        {activeTab === "customs" && (
          <section id="pelli-panel-customs" role="tabpanel" aria-labelledby="pelli-tab-customs" tabIndex={0} className="space-y-5 rounded-3xl border border-gold/30 bg-white p-5 shadow-xl sm:p-8">
            <h2 className={`flex items-center gap-2 text-xl font-extrabold text-maroon ${te ? "telugu" : ""}`}>
              <span aria-hidden="true">🪔</span>{te ? "కుటుంబ సంప్రదాయాలు మరియు ఆతిథ్యం" : "Family customs and hospitality"}
            </h2>
            <p className={`rounded-2xl bg-amber-50 p-4 text-xs leading-6 text-amber-950 ${te ? "telugu" : ""}`}>
              {te ? "ఇవి కొన్ని కుటుంబాల్లో కనిపించే ఉదాహరణలు మాత్రమే; అందరికీ ఒకే సంప్రదాయం వర్తించదు. ఇద్దరి కుటుంబాలు అంగీకరించిన ఆచారాలనే అనుసరించండి." : "These are examples from some families, not rules for everyone. Follow only the customs that both families are comfortable with."}
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              {CUSTOMS.map((item) => (
                <article key={item.title.en} className="space-y-2 rounded-2xl border border-gold/30 bg-cream/40 p-5">
                  <h3 className={`text-sm font-bold text-maroon ${te ? "telugu" : ""}`}>{choose(item.title)}</h3>
                  <p className={`text-xs leading-6 text-gray-700 ${te ? "telugu" : ""}`}>{choose(item.body)}</p>
                </article>
              ))}
            </div>
          </section>
        )}

        {activeTab === "parents" && (
          <section id="pelli-panel-parents" role="tabpanel" aria-labelledby="pelli-tab-parents" tabIndex={0} className="space-y-5 rounded-3xl border border-gold/30 bg-white p-5 shadow-xl sm:p-8">
            <div>
              <h2 className={`text-xl font-extrabold text-maroon ${te ? "telugu" : ""}`}>
                {te ? "కుటుంబ చర్చల చెక్‌లిస్ట్" : "Family conversation checklist"}
              </h2>
              <p className={`mt-2 text-xs leading-6 text-gray-600 ${te ? "telugu" : ""}`}>
                {te ? "ఒకరినొకరు తెలుసుకోవడానికి ఈ అంశాలను స్పష్టంగా, గౌరవంగా చర్చించండి. అన్నింటికీ ఒకే సమాధానం అవసరం లేదు." : "Use these topics to understand one another. Discuss them clearly and respectfully; there is no single answer that works for every family."}
              </p>
            </div>
            <div className="space-y-3">
              {FAMILY_TOPICS.map((item) => (
                <label key={item.id} htmlFor={`pelli-check-${item.id}`} className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${checkedItems[item.id] ? "border-emerald-300 bg-emerald-50" : "border-gray-200 bg-gray-50 hover:border-gold/50"}`}>
                  <input
                    id={`pelli-check-${item.id}`}
                    type="checkbox"
                    checked={!!checkedItems[item.id]}
                    onChange={() => setCheckedItems((prev) => ({ ...prev, [item.id]: !prev[item.id] }))}
                    className="mt-1 h-4 w-4 shrink-0 rounded text-maroon focus:ring-maroon"
                  />
                  <span>
                    <span className={`block text-sm font-bold ${checkedItems[item.id] ? "text-emerald-900" : "text-gray-900"} ${te ? "telugu" : ""}`}>{choose(item.title)}</span>
                    <span className={`mt-0.5 block text-xs leading-6 text-gray-600 ${te ? "telugu" : ""}`}>{choose(item.desc)}</span>
                  </span>
                </label>
              ))}
            </div>
          </section>
        )}

        {activeTab === "candidates" && (
          <section id="pelli-panel-candidates" role="tabpanel" aria-labelledby="pelli-tab-candidates" tabIndex={0} className="space-y-5 rounded-3xl border border-gold/30 bg-white p-5 shadow-xl sm:p-8">
            <div>
              <h2 className={`text-xl font-extrabold text-maroon ${te ? "telugu" : ""}`}>
                {te ? "ఇద్దరి వ్యక్తిగత సంభాషణ" : "A private conversation between the two of you"}
              </h2>
              <p className={`mt-2 text-xs leading-6 text-gray-600 ${te ? "telugu" : ""}`}>
                {te ? "ఇద్దరూ అంగీకరిస్తే, కుటుంబ సభ్యుల ఒత్తిడి లేకుండా ప్రశాంతంగా మాట్లాడుకునే సమయం కేటాయించండి." : "If both people agree, set aside calm time to talk without pressure from family members."}
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {CANDIDATE_TOPICS.map((item) => (
                <article key={item.title.en} className="space-y-2 rounded-2xl border border-gold/20 bg-cream/40 p-4">
                  <h3 className={`text-xs font-bold text-maroon ${te ? "telugu" : ""}`}>{choose(item.title)}</h3>
                  <p className={`text-xs leading-6 text-gray-700 ${te ? "telugu" : ""}`}>{choose(item.question)}</p>
                </article>
              ))}
            </div>
          </section>
        )}

        {activeTab === "dos_donts" && (
          <section id="pelli-panel-dos_donts" role="tabpanel" aria-labelledby="pelli-tab-dos_donts" tabIndex={0} className="grid gap-5 md:grid-cols-2">
            <article className="space-y-4 rounded-3xl border-2 border-emerald-300 bg-white p-5 shadow-xl sm:p-6">
              <h2 className={`flex items-center gap-2 text-base font-extrabold text-emerald-800 ${te ? "telugu" : ""}`}><span aria-hidden="true">✅</span>{te ? "చేయాల్సినవి" : "Do"}</h2>
              <ul className="space-y-3 text-xs leading-6 text-gray-700">
                {DOS.map((item) => <li key={item.en} className={`flex items-start gap-2 ${te ? "telugu" : ""}`}><span className="font-bold text-emerald-700" aria-hidden="true">✓</span><span>{choose(item)}</span></li>)}
              </ul>
            </article>
            <article className="space-y-4 rounded-3xl border-2 border-rose-300 bg-white p-5 shadow-xl sm:p-6">
              <h2 className={`flex items-center gap-2 text-base font-extrabold text-rose-800 ${te ? "telugu" : ""}`}><span aria-hidden="true">❌</span>{te ? "చేయకూడనివి" : "Avoid"}</h2>
              <ul className="space-y-3 text-xs leading-6 text-gray-700">
                {DONTS.map((item) => <li key={item.en} className={`flex items-start gap-2 ${te ? "telugu" : ""}`}><span className="font-bold text-rose-700" aria-hidden="true">✕</span><span>{choose(item)}</span></li>)}
              </ul>
            </article>
          </section>
        )}

        <section className="space-y-4 rounded-3xl bg-gradient-to-r from-maroon to-maroon-dark p-5 text-center text-white shadow-xl sm:p-7">
          <h2 className={`text-lg font-bold ${te ? "telugu" : ""}`}>
            {te ? "సంబంధం కోసం వెతుకుతున్నారా?" : "Looking for a match?"}
          </h2>
          <p className={`mx-auto max-w-xl text-xs leading-6 text-amber-100 ${te ? "telugu" : ""}`}>
            {te
              ? "సభ్యులు అందించిన ప్రొఫైల్స్‌ను చూడండి. Verification సూచనలు నిర్దిష్ట checks‌ను మాత్రమే తెలియజేస్తాయి; అవి గుర్తింపు లేదా వివాహానికి హామీ కావు."
              : "Browse member-submitted profiles. Verification labels refer only to specific recorded checks; they are not identity or marriage guarantees."}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/matches" className="inline-flex min-h-11 items-center justify-center rounded-full bg-gold px-5 py-2.5 text-xs font-extrabold text-maroon-dark transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
              {te ? "సంబంధాలు చూడండి" : "Browse matches"}
            </Link>
            <Link href="/register" className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/30 bg-white/10 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
              {te ? "ఉచిత నమోదు" : "Register for free"}
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
