"use client";

/**
 * ☕ PELLI CHOOPULU GUIDE & ETIQUETTE STUDIO — పెళ్లి చూపుల మార్గదర్శిని
 * =================================================================
 * Traditional Telugu Pelli Choopulu customs, etiquette, smart checklist,
 * 1-on-1 questions guide, and WhatsApp advice shareable card.
 */
import { useState } from "react";
import Link from "next/link";
import { SITE_CONFIG } from "@/lib/site-config";
import { useLang } from "@/lib/lang";
import { WhatsAppIcon } from "@/components/BrandIcons";
import SectionHeading from "@/components/SectionHeading";

export default function PelliChoopuluGuide() {
  const { lang } = useLang();
  const te = lang === "te";

  const [activeTab, setActiveTab] = useState<"customs" | "parents" | "candidates" | "dos_donts">("customs");
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  const toggleCheck = (id: string) => {
    setCheckedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const shareText = `☕ *మన వివాహ — సాంప్రదాయ పెళ్లి చూపుల సమగ్ర మార్గదర్శిని* 🌸\n\n` +
    `పెళ్లి చూపులకు వెళ్లేముందు తెలుసుకోవాల్సిన ముఖ్యమైన విషయాలు, పెద్దల మర్యాదలు, అభ్యర్థులు అడగాల్సిన ప్రశ్నలు మరియు తాంబూలాల ఆచారాలు.\n\n` +
    `🔗 చదవండి: https://manavivaha.in/pelli-choopulu\n` +
    `📞 మన వివాహ హెల్ప్‌లైన్: +91 6304996088`;

  const shareUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  return (
    <div className="min-h-screen bg-[#FDFBF7] py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gold/15 border border-gold/40 text-maroon text-xs font-bold">
            🌸 సాంప్రదాయ మార్గదర్శిని • Traditional Telugu Guide
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-maroon">
            {te ? "సాంప్రదాయ పెళ్లి చూపుల సమగ్ర మార్గదర్శిని" : "Telugu Pelli Choopulu Etiquette & Guide"}
          </h1>
          <p className="text-sm text-gray-700 max-w-2xl mx-auto">
            {te
              ? "మన తెలుగు సంప్రదాయాల ప్రకారం పెళ్లి చూపుల నిర్వహణ, పెద్దల మర్యాదలు, అభ్యర్థుల పరస్పర సంభాషణ మరియు చెక్‌లిస్ట్."
              : "A complete traditional guide for Telugu Pelli Choopulu: etiquette, hospitality, parent talking points, and candidate 1-on-1 conversation guide."}
          </p>
        </div>

        {/* Top Action Share */}
        <div className="flex justify-center">
          <a
            href={shareUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#25D366] text-white rounded-full text-xs font-bold shadow hover:brightness-110 active:scale-95 transition"
          >
            <WhatsAppIcon className="w-4 h-4" mono />
            <span>ఈ గైడ్‌ను WhatsApp లో కుటుంబ సభ్యులకు పంపండి</span>
          </a>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gold/30 justify-center gap-2 sm:gap-4 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveTab("customs")}
            className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-2xl transition ${
              activeTab === "customs"
                ? "bg-maroon text-white shadow-md"
                : "bg-white text-gray-700 border border-gold/20 hover:bg-gold/10"
            }`}
          >
            🪔 ఆచారాలు & తాంబూలం
          </button>
          <button
            onClick={() => setActiveTab("parents")}
            className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-2xl transition ${
              activeTab === "parents"
                ? "bg-maroon text-white shadow-md"
                : "bg-white text-gray-700 border border-gold/20 hover:bg-gold/10"
            }`}
          >
            👨‍👩‍👦 పెద్దల సంభాషణ & చెక్‌లిస్ట్
          </button>
          <button
            onClick={() => setActiveTab("candidates")}
            className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-2xl transition ${
              activeTab === "candidates"
                ? "bg-maroon text-white shadow-md"
                : "bg-white text-gray-700 border border-gold/20 hover:bg-gold/10"
            }`}
          >
            💬 అభ్యర్థుల ప్రైవేట్ సంభాషణ
          </button>
          <button
            onClick={() => setActiveTab("dos_donts")}
            className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-2xl transition ${
              activeTab === "dos_donts"
                ? "bg-maroon text-white shadow-md"
                : "bg-white text-gray-700 border border-gold/20 hover:bg-gold/10"
            }`}
          >
            ✨ చేయవలసినవి & చేయకూడనివి
          </button>
        </div>

        {/* Tab 1: Customs */}
        {activeTab === "customs" && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-gold/30 space-y-6">
            <h2 className="text-xl font-extrabold text-maroon flex items-center gap-2">
              <span>🪔</span>
              <span>తెలుగు వారి పెళ్లి చూపుల పద్ధతులు & సంస్కృతి</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-5 bg-cream/40 rounded-2xl border border-gold/30 space-y-2">
                <h3 className="font-bold text-maroon text-sm">1. స్వాగత సత్కారాలు (Welcome & Reception)</h3>
                <p className="text-xs text-gray-700 leading-relaxed">
                  వధువు గృహానికి వరుడు మరియు వారి తల్లిదండ్రులు, ముఖ్య బంధువులు వచ్చినప్పుడు గుమ్మానికి తోరణాలు, గడపకు పసుపు కుంకుమలతో స్వాగతించడం సంప్రదాయం. మంచినీళ్లు, తియ్యని పానీయాలు లేదా కాఫీ/టీలతో మర్యాద చేయాలి.
                </p>
              </div>

              <div className="p-5 bg-cream/40 rounded-2xl border border-gold/30 space-y-2">
                <h3 className="font-bold text-maroon text-sm">2. దీపారాధన & దైవ దర్శనం</h3>
                <p className="text-xs text-gray-700 leading-relaxed">
                  ఇంటి పూజా మందిరంలో దీపారాధన చేసి, ఇష్టదైవాన్ని స్మరించుకున్నాక కార్యక్రమం ప్రారంభమవుతుంది. వధువు సాంప్రదాయ చీరకట్టుతో నిండుగా రావడం ఆచారం.
                </p>
              </div>

              <div className="p-5 bg-cream/40 rounded-2xl border border-gold/30 space-y-2">
                <h3 className="font-bold text-maroon text-sm">3. ఫలహారాలు & భోజన మర్యాదలు</h3>
                <p className="text-xs text-gray-700 leading-relaxed">
                  సంప్రదాయ తెలుగు పిండివంటలు (లడ్డు/సున్నుండలు, బజ్జీ/గారెలు, కాఫీ) అందించడం ఆనవాయితీ. అందరూ కలిసి ప్రశాంత వాతావరణంలో ఫలహారాలు స్వీకరిస్తారు.
                </p>
              </div>

              <div className="p-5 bg-cream/40 rounded-2xl border border-gold/30 space-y-2">
                <h3 className="font-bold text-maroon text-sm">4. వీడ్కోలు తాంబూలం (Parting Blessings)</h3>
                <p className="text-xs text-gray-700 leading-relaxed">
                  తిరిగి వెళ్లే సమయంలో వచ్చిన పెద్దలకు మరియు అతిథులకు తాంబూలం (ఆకులు, పోకలు, అరటిపండ్లు/స్వీట్స్) ఇచ్చి సాదరంగా వీడ్కోలు పలుకుతారు.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Parents Checklist */}
        {activeTab === "parents" && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-gold/30 space-y-6">
            <h2 className="text-xl font-extrabold text-maroon flex items-center gap-2">
              <span>👨‍👩‍👦</span>
              <span>పెద్దల చర్చనీయాంశాలు & ప్రిపరేషన్ చెక్‌లిస్ట్</span>
            </h2>
            <p className="text-xs text-gray-600">
              పెళ్లి చూపుల సమయంలో తల్లిదండ్రులు స్పష్టంగా, గౌరవంగా చర్చించవలసిన ముఖ్యమైన అంశాల చెక్‌లిస్ట్:
            </p>

            <div className="space-y-3">
              {[
                { id: "c1", title: "కుటుంబ నేపథ్యం & అలవాట్లు", desc: "కుటుంబ చరిత్ర, ఉమ్మడి/చిన్న కుటుంబం, ఆహారపు అలవాట్లు (శాకాహారం/మాంసాహారం)." },
                { id: "c2", title: "ఉద్యోగ స్థిరత్వం & నివాసం", desc: "అభ్యర్థి ప్రస్తుత ఉద్యోగం, భవిష్యత్ కెరీర్ ప్లాన్స్, వివాహానంతరం ఉండే నగరం/దేశం." },
                { id: "c3", title: "జాతక పొంతన & వేద గుణమేళనం", desc: "జాతకాలు, గోత్రం సరిపోలిక మరియు ముహూర్తాల ప్రాధాన్యత గురించి చర్చ." },
                { id: "c4", title: "వివాహ వేడుక ప్రణాళిక & బడ్జెట్", desc: "కళ్యాణ మండపం, ఊరు, నిశ్చితార్థం తేదీల ఆలోచనలు మరియు పరస్పర అంగీకారం." },
                { id: "c5", title: "సాంప్రదాయ ఆచారాలు & పండుగల పద్ధతులు", desc: "ఇరు కుటుంబాలలో ఆచరించే కుల సంప్రదాయాలు మరియు పండుగల విశేషాలు." },
              ].map((item) => (
                <div
                  key={item.id}
                  onClick={() => toggleCheck(item.id)}
                  className={`p-4 rounded-2xl border cursor-pointer transition flex items-start gap-3 ${
                    checkedItems[item.id]
                      ? "bg-emerald-50 border-emerald-300"
                      : "bg-gray-50 border-gray-200 hover:border-gold/50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={!!checkedItems[item.id]}
                    onChange={() => {}}
                    className="mt-1 h-4 w-4 rounded text-maroon focus:ring-maroon cursor-pointer"
                  />
                  <div>
                    <h4 className={`text-sm font-bold ${checkedItems[item.id] ? "text-emerald-900 line-through" : "text-gray-900"}`}>
                      {item.title}
                    </h4>
                    <p className="text-xs text-gray-600 mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Candidates 1-on-1 */}
        {activeTab === "candidates" && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-gold/30 space-y-6">
            <h2 className="text-xl font-extrabold text-maroon flex items-center gap-2">
              <span>💬</span>
              <span>అభ్యర్థుల 1-on-1 ఏకాంత సంభాషణ గైడ్</span>
            </h2>
            <p className="text-xs text-gray-600">
              వధూవరులు ఇద్దరూ విడిగా మాట్లాడుకునే 15-20 నిమిషాల సమయంలో అడగదగిన మర్యాదపూర్వకమైన, అర్థవంతమైన ప్రశ్నలు:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-cream/40 rounded-2xl border border-gold/20 space-y-2">
                <div className="text-xs font-bold text-maroon">1. రోజువారీ జీవనశైలి & హాబీలు</div>
                <p className="text-xs text-gray-700">
                  ఖాళీ సమయాల్లో ఏమి చేయటానికి ఇష్టపడతారు? ఫిట్‌నెస్, సంగీతం, పుస్తకాలు, లేదా ప్రయాణాల పట్ల ఆసక్తి ఎలా ఉంది?
                </p>
              </div>

              <div className="p-4 bg-cream/40 rounded-2xl border border-gold/20 space-y-2">
                <div className="text-xs font-bold text-maroon">2. కెరీర్ & భవిష్యత్ లక్ష్యాలు</div>
                <p className="text-xs text-gray-700">
                  ప్రస్తుత జాబ్ వర్క్-లైఫ్ బ్యాలెన్స్ ఎలా ఉంటుంది? పై చదువులు లేదా విదేశాలకు వెళ్లే ఆలోచనలు ఏమైనా ఉన్నాయా?
                </p>
              </div>

              <div className="p-4 bg-cream/40 rounded-2xl border border-gold/20 space-y-2">
                <div className="text-xs font-bold text-maroon">3. కుటుంబ విలువలు & బాధ్యతలు</div>
                <p className="text-xs text-gray-700">
                  తల్లిదండ్రులతో అనుబంధం, కుటుంబ సంబంధాలకు ఇచ్చే ప్రాధాన్యత గురించి ఒకరి ఆలోచనలు మరొకరు పంచుకోండి.
                </p>
              </div>

              <div className="p-4 bg-cream/40 rounded-2xl border border-gold/20 space-y-2">
                <div className="text-xs font-bold text-maroon">4. జీవిత భాగస్వామి పట్ల అంచనాలు</div>
                <p className="text-xs text-gray-700">
                  జీవిత భాగస్వామిలో మీరు ముఖ్యంగా చూసే లక్షణాలు ఏమిటి? పరస్పర గౌరవం, స్వేచ్ఛపై మీ అభిప్రాయం ఏమిటి?
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Dos & Don'ts */}
        {activeTab === "dos_donts" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* DOs */}
            <div className="bg-white rounded-3xl p-6 shadow-xl border-2 border-emerald-300 space-y-4">
              <h3 className="text-base font-extrabold text-emerald-800 flex items-center gap-2">
                <span>✅</span>
                <span>తప్పక చేయవలసినవి (Do&apos;s)</span>
              </h3>
              <ul className="text-xs text-gray-700 space-y-3">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span>నిజాయితీగా, సహజంగా ఉండండి. అనవసరమైన ఆడంబరాలు ప్రదర్శించవద్దు.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span>ఇరు కుటుంబాల పెద్దలను గౌరవంగా పలకరించి ప్రశాంతంగా మాట్లాడండి.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span>అభ్యర్థికి మరియు కుటుంబానికి సమాధానం చెప్పడానికి తగినంత సమయం ఇవ్వండి.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span>ఫోన్లను సైలెంట్‌లో ఉంచి చర్చకు పూర్తి ప్రాధాన్యత ఇవ్వండి.</span>
                </li>
              </ul>
            </div>

            {/* DON'Ts */}
            <div className="bg-white rounded-3xl p-6 shadow-xl border-2 border-rose-300 space-y-4">
              <h3 className="text-base font-extrabold text-rose-800 flex items-center gap-2">
                <span>❌</span>
                <span>చేయకూడనివి (Don&apos;ts)</span>
              </h3>
              <ul className="text-xs text-gray-700 space-y-3">
                <li className="flex items-start gap-2">
                  <span className="text-rose-600 font-bold">✕</span>
                  <span>అక్కడికక్కడే వెంటనే నిర్ణయం చెప్పమని ఎవరినీ ఒత్తిడి చేయవద్దు.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-600 font-bold">✕</span>
                  <span>జీతం, ఆస్తిపాస్తుల గురించి కించపరిచే విధంగా ప్రశ్నలు వేయకూడదు.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-600 font-bold">✕</span>
                  <span>గతం గురించి లేదా వ్యక్తిగత విషయాల గురించి ఇబ్బందికర ప్రశ్నలు అడగవద్దు.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-600 font-bold">✕</span>
                  <span>నచ్చకపోతే అవమానించకుండా, గౌరవప్రదంగా తిరస్కరించాలి.</span>
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* Footer Call to Action */}
        <div className="p-6 bg-gradient-to-r from-maroon to-maroon-dark text-white rounded-3xl text-center space-y-3 shadow-xl">
          <h3 className="text-lg font-bold">సరిపోయే సంబంధం కోసం చూస్తున్నారా?</h3>
          <p className="text-xs text-amber-100 max-w-xl mx-auto">
            మన వివాహ లో వేలాది ధృవీకరించబడిన వధూవరుల ప్రొఫైల్స్ ఉన్నాయి. ఈరోజే మీ కులం మరియు జిల్లా ఆధారంగా సరైన జోడిని వెతకండి.
          </p>
          <div className="pt-2 flex flex-wrap justify-center gap-3">
            <Link
              href="/matches"
              className="px-5 py-2.5 bg-gold hover:bg-gold-light text-maroon-dark font-extrabold rounded-full text-xs shadow transition"
            >
              🔍 సంబంధాలు చూడండి
            </Link>
            <Link
              href="/register"
              className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-full text-xs border border-white/20 transition"
            >
              ✨ ఉచిత రిజిస్ట్రేషన్
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
