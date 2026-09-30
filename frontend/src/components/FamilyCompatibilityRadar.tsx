"use client";

/**
 * 🧠 6-DIMENSIONAL FAMILY & LIFESTYLE COMPATIBILITY RADAR
 * =========================================================
 * AI-powered holistic matchmaker computing Astro, Education,
 * Family Values, Location Proximity, Age/Height, and Financial Balance.
 */
import { useState, useMemo } from "react";
import { WhatsAppIcon } from "@/components/BrandIcons";
import { useLang } from "@/lib/lang";

export interface RadarDimension {
  key: string;
  nameTe: string;
  nameEn: string;
  score: number; // 0 - 100
  maxScore: number;
  icon: string;
  verdictTe: string;
  verdictEn: string;
  weight: number;
}

interface FamilyCompatibilityRadarProps {
  applicantName?: string;
  candidateName?: string;
  applicantId?: string;
  candidateId?: string;
  caste?: string;
  astroScore?: number;
  educationMatch?: number;
  familyMatch?: number;
  locationMatch?: number;
  physicalMatch?: number;
  financialMatch?: number;
  onSendProposal?: () => void;
}

export default function FamilyCompatibilityRadar({
  applicantName = "మీ ప్రొఫైల్",
  candidateName = "సంబంధం",
  applicantId = "TS1001",
  candidateId = "AP1002",
  caste = "తెలుగు కుటుంబం",
  astroScore = 88,
  educationMatch = 92,
  familyMatch = 95,
  locationMatch = 85,
  physicalMatch = 90,
  financialMatch = 86,
  onSendProposal,
}: FamilyCompatibilityRadarProps) {
  const { lang } = useLang();
  const te = lang === "te";

  const dimensions: RadarDimension[] = useMemo(() => [
    {
      key: "astro",
      nameTe: "వేద గుణమేళనం",
      nameEn: "Vedic Horoscope",
      score: astroScore,
      maxScore: 100,
      icon: "🪔",
      verdictTe: astroScore >= 75 ? "ఉత్తమ జాతక పొంతన (దోష రహితం)" : "సాధారణ పొంతన",
      verdictEn: astroScore >= 75 ? "Excellent Gunamelanam" : "Moderate match",
      weight: 25,
    },
    {
      key: "education",
      nameTe: "విద్యా & ఉద్యోగం",
      nameEn: "Education & Career",
      score: educationMatch,
      maxScore: 100,
      icon: "🎓",
      verdictTe: educationMatch >= 80 ? "సమాన ఉన్నత విద్య & ప్రొఫెషన్" : "అనుకూల అర్హత",
      verdictEn: educationMatch >= 80 ? "Aligned Career & Degrees" : "Compatible",
      weight: 20,
    },
    {
      key: "family",
      nameTe: "కుటుంబ సంస్కృతి",
      nameEn: "Family Values",
      score: familyMatch,
      maxScore: 100,
      icon: "🏡",
      verdictTe: familyMatch >= 85 ? "సాంప్రదాయ విలువలు & ఆచారాలు" : "మంచి కుటుంబం",
      verdictEn: familyMatch >= 85 ? "Harmonious Traditions" : "Good Family",
      weight: 20,
    },
    {
      key: "location",
      nameTe: "ప్రాంతీయ సామీప్యత",
      nameEn: "Location Index",
      score: locationMatch,
      maxScore: 100,
      icon: "📍",
      verdictTe: locationMatch >= 80 ? "సులభ రాకపోకలు (TS-AP కనెక్ట్)" : "వేర్వేరు జిల్లాలు",
      verdictEn: locationMatch >= 80 ? "Close Proximity" : "Inter-District",
      weight: 10,
    },
    {
      key: "physical",
      nameTe: "వయస్సు & ఎత్తు",
      nameEn: "Age & Height",
      score: physicalMatch,
      maxScore: 100,
      icon: "🎂",
      verdictTe: physicalMatch >= 80 ? "పరిపూర్ణ జంట నిష్పత్తి" : "తగిన నిష్పత్తి",
      verdictEn: physicalMatch >= 80 ? "Ideal Balance" : "Acceptable",
      weight: 15,
    },
    {
      key: "financial",
      nameTe: "జీవన ప్రమాణాలు",
      nameEn: "Financial Status",
      score: financialMatch,
      maxScore: 100,
      icon: "💰",
      verdictTe: financialMatch >= 80 ? "సమాన ఆర్థిక స్థిరత్వం" : "మంచి ఆదాయం",
      verdictEn: financialMatch >= 80 ? "Balanced Lifestyle" : "Stable",
      weight: 10,
    },
  ], [astroScore, educationMatch, familyMatch, locationMatch, physicalMatch, financialMatch]);

  // Overall Weighted Score
  const overallScore = useMemo(() => {
    const total = dimensions.reduce((acc, d) => acc + (d.score * d.weight) / 100, 0);
    return Math.round(total);
  }, [dimensions]);

  // SVG Radar Points Calculation (6 Sided Polygon)
  const size = 260;
  const center = size / 2;
  const radius = size * 0.38;

  const getCoordinates = (value: number, index: number, total: number) => {
    const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
    const r = (value / 100) * radius;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  const radarPolygonPoints = useMemo(() => {
    return dimensions
      .map((d, i) => {
        const { x, y } = getCoordinates(d.score, i, dimensions.length);
        return `${x},${y}`;
      })
      .join(" ");
  }, [dimensions]);

  const waShareText = `🌟 *మన వివాహ — AI కుటుంబ సమగ్ర సరిపోలిక నివేదిక* 🌟\n\n` +
    `👤 *ప్రొఫైల్స్:* ${applicantName} (${applicantId}) ↔ ${candidateName} (${candidateId})\n` +
    `💍 *మొత్తం అనుకూలత స్కోర్:* *${overallScore}% — ఉత్తమ సంబంధం (Highly Recommended)*\n\n` +
    `📊 *6-ముఖాల విశ్లేషణ:*\n` +
    `🪔 వేద జాతక గుణమేళనం: ${astroScore}%\n` +
    `🎓 విద్యా & ఉద్యోగం: ${educationMatch}%\n` +
    `🏡 కుటుంబ సంస్కృతి: ${familyMatch}%\n` +
    `📍 ప్రాంతీయ సామీప్యత: ${locationMatch}%\n` +
    `🎂 వయస్సు & ఎత్తు: ${physicalMatch}%\n` +
    `💰 జీవన ప్రమాణాలు: ${financialMatch}%\n\n` +
    `✨ వివరాలు చూడండి: https://manavivaha.in/search/${candidateId}\n` +
    `📞 మన వివాహ హెల్ప్‌లైన్: +91 6304996088`;

  const waUrl = `https://wa.me/?text=${encodeURIComponent(waShareText)}`;

  return (
    <div className="bg-white rounded-3xl p-6 shadow-xl border border-gold/40 space-y-6">
      {/* Title Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-extrabold">
            <span>✨</span>
            <span>AI Matchmaker 360° Radar</span>
          </div>
          <h3 className="text-lg sm:text-xl font-extrabold text-maroon mt-1">
            {te ? "కుటుంబ & జీవనశైలి సమగ్ర సరిపోలిక" : "Holistic Compatibility Radar"}
          </h3>
        </div>

        {/* Big Overall Score Badge */}
        <div className="text-right">
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-700 leading-none">
            {overallScore}%
          </div>
          <div className="text-[11px] font-bold text-gray-500 uppercase mt-0.5">
            {te ? "ఉత్తమ సరిపోలిక" : "Overall Match"}
          </div>
        </div>
      </div>

      {/* Visual Radar Grid & Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        {/* SVG Radar Chart (Left) */}
        <div className="md:col-span-5 flex flex-col items-center justify-center p-3 bg-gradient-to-b from-amber-50/50 to-rose-50/50 rounded-2xl border border-gold/20">
          <svg width={size} height={size} className="overflow-visible">
            {/* Concentric Background Polygons */}
            {[0.25, 0.5, 0.75, 1.0].map((level, lvlIdx) => {
              const bgPoints = dimensions
                .map((_, i) => {
                  const { x, y } = getCoordinates(level * 100, i, dimensions.length);
                  return `${x},${y}`;
                })
                .join(" ");
              return (
                <polygon
                  key={lvlIdx}
                  points={bgPoints}
                  fill={lvlIdx === 3 ? "rgba(255, 255, 255, 0.8)" : "none"}
                  stroke="#E5E7EB"
                  strokeWidth="1.2"
                />
              );
            })}

            {/* Radar Spokes */}
            {dimensions.map((_, i) => {
              const { x, y } = getCoordinates(100, i, dimensions.length);
              return (
                <line
                  key={i}
                  x1={center}
                  y1={center}
                  x2={x}
                  y2={y}
                  stroke="#E5E7EB"
                  strokeWidth="1"
                  strokeDasharray="2,2"
                />
              );
            })}

            {/* Data Polygon */}
            <polygon
              points={radarPolygonPoints}
              fill="rgba(197, 160, 89, 0.35)"
              stroke="#B45309"
              strokeWidth="2.5"
            />

            {/* Data Points */}
            {dimensions.map((d, i) => {
              const { x, y } = getCoordinates(d.score, i, dimensions.length);
              return (
                <g key={d.key}>
                  <circle cx={x} cy={y} r="4.5" fill="#7A0C2E" stroke="#FFFFFF" strokeWidth="2" />
                </g>
              );
            })}
          </svg>
          <div className="text-[11px] font-bold text-gray-500 mt-2 text-center">
            {applicantName} ↔ {candidateName}
          </div>
        </div>

        {/* 6 Dimension Details (Right) */}
        <div className="md:col-span-7 space-y-2.5">
          {dimensions.map((d) => (
            <div
              key={d.key}
              className="p-2.5 bg-gray-50/80 hover:bg-cream rounded-xl border border-gray-200/70 transition flex items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base">{d.icon}</span>
                <div>
                  <div className="font-extrabold text-gray-900 truncate">
                    {te ? d.nameTe : d.nameEn}
                  </div>
                  <div className="text-[10px] text-gray-500 truncate">
                    {te ? d.verdictTe : d.verdictEn}
                  </div>
                </div>
              </div>

              {/* Score Bar & Value */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="w-16 bg-gray-200 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-emerald-600 rounded-full"
                    style={{ width: `${d.score}%` }}
                  />
                </div>
                <span className="font-extrabold text-gray-800 w-8 text-right">
                  {d.score}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-100">
        <div className="text-xs text-gray-600">
          💡 <span className="font-semibold">{te ? "సలహా:" : "Verdict:"}</span> {te ? "ఈ ప్రొఫైల్ మీ కుటుంబ ప్రాధాన్యతలకు అత్యంత అనుకూలంగా ఉంది." : "High compatibility across all 6 core metrics."}
        </div>

        <div className="flex items-center gap-2">
          <a
            href={waUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#25D366] text-white rounded-full text-xs font-bold shadow hover:brightness-110 active:scale-95 transition"
          >
            <WhatsAppIcon className="w-3.5 h-3.5" mono />
            <span>WhatsApp లో పంపండి</span>
          </a>

          {onSendProposal && (
            <button
              onClick={onSendProposal}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-maroon text-white rounded-full text-xs font-bold shadow hover:bg-maroon-dark active:scale-95 transition"
            >
              <span>💌 ప్రపోజల్ పంపండి</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
