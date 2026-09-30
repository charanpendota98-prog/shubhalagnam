"use client";

import { useLang } from "@/lib/lang";

export interface KootaDetail {
  name: string;
  telugu: string;
  obtained: number;
  max: number;
  desc: string;
  status: "excellent" | "good" | "neutral" | "caution";
}

interface Props {
  totalScore?: number;
  maxScore?: number;
  brideName?: string;
  groomName?: string;
  brideStar?: string;
  groomStar?: string;
  kootas?: KootaDetail[];
}

const DEFAULT_KOOTAS: KootaDetail[] = [
  { name: "Dina Koota", telugu: "దిన కూటమి (ఆరోగ్యం & ఆయుష్షు)", obtained: 3, max: 3, desc: "వధూవరుల మధ్య పరస్పర క్షేమం, ఆరోగ్యం మరియు దీర్ఘాయుష్షులకు అద్భుతమైన అనుకూలత ఉంది.", status: "excellent" },
  { name: "Gana Koota", telugu: "గణ కూటమి (స్వభావం & మైత్రి)", obtained: 6, max: 6, desc: "దేవ-మనుష్య గణాల కలయికతో పరస్పర ఆప్యాయత, సామరస్యం మరియు మానసిక ఐక్యత కలిగి ఉంటారు.", status: "excellent" },
  { name: "Mahendra Koota", telugu: "మహేంద్ర కూటమి (సంతాన భాగ్యం)", obtained: 1, max: 1, desc: "సంతాన వృద్ధి, గృహ లక్ష్మీ కటాక్షం మరియు కుటుంబ సంపదకు శుభప్రదం.", status: "good" },
  { name: "Stree Deergha", telugu: "స్త్రీ దీర్ఘం (సౌభాగ్యం)", obtained: 1, max: 1, desc: "స్త్రీకి దీర్ఘ సుమంగళి యోగం మరియు సంసార సౌఖ్యం ప్రాప్తిస్తుంది.", status: "excellent" },
  { name: "Yoni Koota", telugu: "యోని కూటమి (దాంపత్య సుఖం)", obtained: 3, max: 4, desc: "దాంపత్య జీవితంలో పరస్పర అవగాహన, అనురాగం మరియు శారీరక అనుకూలత.", status: "good" },
  { name: "Rasi Koota", telugu: "రాశి కూటమి (వంశాభివృద్ధి)", obtained: 7, max: 7, desc: "శుభ గ్రహ రాశుల కలయికతో కుటుంబంలో సుఖశాంతులు మరియు ఏకాభిప్రాయం.", status: "excellent" },
  { name: "Graha Maitri", telugu: "రాశ్యాధిపతి (గ్రహ మైత్రి)", obtained: 4, max: 5, desc: "రాశి అధిపతుల మధ్య స్నేహ భావం వల్ల జీవితాంతం ఒకరినొకరు గౌరవించుకుంటారు.", status: "good" },
  { name: "Vasya Koota", telugu: "వశ్య కూటమి (పరస్పర ఆకర్షణ)", obtained: 2, max: 2, desc: "భార్యాభర్తల మధ్య పరస్పర ఆకర్షణ, విధేయత మరియు ఆత్మీయ అనుబంధం.", status: "excellent" },
  { name: "Rajju Koota", telugu: "రజ్జు శుద్ధి (మాంగల్య బలం)", obtained: 1, max: 1, desc: "రజ్జు దోషం లేని శుభప్రదమైన సంబంధం — మాంగల్య రక్షణ మరియు సౌభాగ్యం.", status: "excellent" },
  { name: "Vedha Koota", telugu: "వేధ రహితం (నిర్దోషం)", obtained: 1, max: 1, desc: "నక్షత్రాల మధ్య ఎలాంటి వేధ (విరోధం) లేదు — సంపూర్ణ శుభ ఫలితం.", status: "excellent" },
];

export default function KundaliRadarVisualizer({
  totalScore = 28,
  maxScore = 36,
  brideName,
  groomName,
  brideStar,
  groomStar,
  kootas = DEFAULT_KOOTAS,
}: Props) {
  const { lang } = useLang();
  const te = lang === "te";
  const percentage = Math.round((totalScore / maxScore) * 100);

  const getVerdict = (pct: number) => {
    if (pct >= 75) return { te: "అత్యుత్తమ వేద గుణమేళనం (ఉత్తమ సంబంధం) 🌟", en: "Excellent Vedic Match 🌟", color: "text-emerald-700 bg-emerald-50 border-emerald-300" };
    if (pct >= 55) return { te: "మంచి గుణమేళనం (అనుకూల సంబంధం) 👍", en: "Good Auspicious Match 👍", color: "text-blue-700 bg-blue-50 border-blue-300" };
    if (pct >= 40) return { te: "మధ్యమ గుణమేళనం (పెద్దల ఆశీస్సులతో శుభం) 🌸", en: "Average Match 🌸", color: "text-amber-700 bg-amber-50 border-amber-300" };
    return { te: "సాధారణ గుణమేళనం (ఆత్మీయతే ప్రధానం) 🕊️", en: "Informational Match 🕊️", color: "text-rose-700 bg-rose-50 border-rose-300" };
  };

  const verdict = getVerdict(percentage);

  return (
    <div className="rounded-3xl border-2 border-amber-300/80 bg-white p-5 shadow-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-amber-100 pb-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-amber-500 text-white font-bold text-lg shadow-xs">
            🕉️
          </span>
          <div>
            <h3 className="font-black text-slate-800 text-sm sm:text-base">
              {te ? "సంపూర్ణ అష్టకూటమి గుణమేళనం (36 Gunas Score)" : "Vedic Ashtakoota Kundali Match (36 Gunas)"}
            </h3>
            <p className="text-[11px] text-slate-500">
              {brideName && groomName ? `${brideName} (${brideStar || ""}) ❤️ ${groomName} (${groomStar || ""})` : te ? "వేద జ్యోతిష శాస్త్ర ప్రాతిపదికన విశ్లేషణ" : "Vedic Compatibility Analysis"}
            </p>
          </div>
        </div>

        {/* Score Ring */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xl sm:text-2xl font-black text-[#7A0C2E]">
              {totalScore} <span className="text-xs font-bold text-slate-400">/ {maxScore}</span>
            </div>
            <div className="text-[11px] font-bold text-amber-700">{percentage}% Compatibility</div>
          </div>
          <div className="relative w-12 h-12 flex items-center justify-center">
            <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-slate-100"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-emerald-600 transition-all duration-1000"
                strokeDasharray={`${percentage}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="absolute text-[11px] font-black text-slate-800">{percentage}%</span>
          </div>
        </div>
      </div>

      {/* Verdict Banner */}
      <div className={`mt-4 rounded-2xl border p-3 text-center text-xs sm:text-sm font-extrabold ${verdict.color}`}>
        {te ? verdict.te : verdict.en}
      </div>

      {/* Notice info */}
      <div className="mt-2 text-[11px] text-slate-500 bg-amber-50/50 rounded-xl p-2.5 border border-amber-100/60 leading-relaxed">
        ℹ️ {te ? "గమనిక: జ్యోతిష వివరాలు కేవలం అవగాహన మరియు మార్గదర్శకత్వం కొరకు మాత్రమే. ఇరువైపుల కుటుంబాల పరస్పర ఇష్టం, విద్య, సంస్కారం మరియు అవగాహనకే ప్రాధాన్యతనివ్వండి." : "Note: Astrological matching is strictly for reference and cultural interest. Personal compatibility, mutual trust, and understanding are most important."}
      </div>

      {/* Kootas Grid */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {kootas.map((k, i) => (
          <div
            key={i}
            className={`rounded-2xl border p-3 transition hover:shadow-xs ${
              k.status === "excellent"
                ? "bg-emerald-50/40 border-emerald-200"
                : k.status === "good"
                ? "bg-blue-50/40 border-blue-200"
                : "bg-slate-50 border-slate-200"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-800">
                {te ? k.telugu : k.name}
              </span>
              <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-extrabold text-slate-700 shadow-2xs border border-slate-100">
                {k.obtained} / {k.max} pts
              </span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              {k.desc}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
