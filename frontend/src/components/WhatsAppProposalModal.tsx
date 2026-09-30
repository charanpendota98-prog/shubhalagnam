"use client";

import { useState } from "react";
import { useLang } from "@/lib/lang";

export interface ProposalProfileData {
  tsap_id: string;
  full_name?: string;
  gender?: string;
  age?: number | string;
  height?: string;
  caste?: string;
  sub_caste?: string;
  gothram?: string;
  star?: string;
  rasi?: string;
  education?: string;
  job?: string;
  company?: string;
  salary?: string;
  district?: string;
  state?: string;
  marital_status?: string;
  father_name?: string;
  photo_url?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  profile: ProposalProfileData | null;
}

export default function WhatsAppProposalModal({ isOpen, onClose, profile }: Props) {
  const { lang } = useLang();
  const te = lang === "te";
  const [tone, setTone] = useState<"parent" | "self" | "relative">("parent");
  const [includeSalary, setIncludeSalary] = useState(true);
  const [includeAstro, setIncludeAstro] = useState(true);
  const [includeBiodataLink, setIncludeBiodataLink] = useState(true);
  const [copied, setCopied] = useState(false);

  if (!isOpen || !profile) return null;

  const isBride = (profile.gender || "").toLowerCase().includes("bride") || (profile.gender || "").includes("ఆడ") || (profile.gender || "").includes("వధువు");
  const genderTitleTe = isBride ? "వధువు (అమ్మాయి)" : "వరుడు (అబ్బాయి)";
  const originUrl = typeof window !== "undefined" ? window.location.origin : "https://manavivaha.in";
  const profileUrl = `${originUrl}/search/${profile.tsap_id}`;
  const biodataUrl = `${originUrl}/biodata?id=${profile.tsap_id}`;

  const buildProposalText = () => {
    let greeting = "";
    if (tone === "parent") {
      greeting = te
        ? `🙏 నమస్కారం అండి!\nమేము మన వివాహ (Mana Vivaha) లో మీ కోసం సరితూగే ${genderTitleTe} సంబంధం ప్రొఫైల్ వివరాలను పంపుతున్నాము:`
        : `🙏 Namaskaram!\nWe are sharing a verified Telugu matrimonial match profile from Mana Vivaha:`;
    } else if (tone === "self") {
      greeting = te
        ? `🙏 నమస్కారం అండి!\nనేను మన వివాహ (Mana Vivaha) లో నా పెళ్లి సంబంధం కోసం వివరాలను పంపుతున్నాను. దయచేసి పరిశీలించండి:`
        : `🙏 Namaskaram!\nI am sharing my matrimonial profile details from Mana Vivaha for your kind consideration:`;
    } else {
      greeting = te
        ? `💐 శుభోదయం / నమస్కారం అండి!\nమన బంధువులలో/పరిచయస్తులలో మీకు సరితూగే మంచి సంబంధం (Match Profile) వివరాలు ఇక్కడ ఉన్నాయి:`
        : `💐 Greetings!\nHere are the matrimonial profile details of a suitable prospective match:`;
    }

    const lines = [
      greeting,
      `\n🆔 Profile ID: ${profile.tsap_id}`,
      `👤 పేరు: ${profile.full_name || "పేరు గోప్యంగా ఉంచబడింది"}`,
      `🎂 వయస్సు & ఎత్తు: ${profile.age ? `${profile.age} సం||` : "N/A"}${profile.height ? ` • ${profile.height}` : ""}`,
      `🎓 చదువు: ${profile.education || "Graduate"}`,
      `💼 ఉద్యోగం: ${profile.job || "Private"}${profile.company ? ` (${profile.company})` : ""}`,
    ];

    if (includeSalary && profile.salary) {
      lines.push(`💰 వార్షిక ఆదాయం (Salary): ${profile.salary}`);
    }

    lines.push(`📍 ఊరు / జిల్లా: ${profile.district || "Telangana / AP"}${profile.state ? ` (${profile.state})` : ""}`);
    lines.push(`🏛️ కులం: ${profile.caste || "Telugu Community"}${profile.sub_caste ? ` (${profile.sub_caste})` : ""}`);

    if (includeAstro) {
      const astroParts = [];
      if (profile.gothram) astroParts.push(`గోత్రం: ${profile.gothram}`);
      if (profile.star) astroParts.push(`నక్షత్రం: ${profile.star}`);
      if (profile.rasi) astroParts.push(`రాశి: ${profile.rasi}`);
      if (astroParts.length) {
        lines.push(`🌟 జాతకం: ${astroParts.join(" • ")}`);
      }
    }

    if (profile.marital_status && profile.marital_status !== "Pelli Kaledu" && profile.marital_status !== "Never Married") {
      lines.push(`💍 వైవాహిక స్థితి: ${profile.marital_status}`);
    }

    lines.push(`\n🔗 పూర్తి ప్రొఫైల్ వివరాలు & ఫోటో చూడటానికి లింక్:\n👉 ${profileUrl}`);

    if (includeBiodataLink) {
      lines.push(`\n🎴 HD కలర్ బయోడేటా డౌన్‌లోడ్ చేయడానికి లింక్:\n👉 ${biodataUrl}`);
    }

    lines.push(`\n✨ మన వివాహ (Mana Vivaha) — 100% నమ్మకమైన తెలుగు మ్యాట్రిమోని వేదిక`);
    lines.push(`📞 హెల్ప్‌లైన్ & వాట్సాప్: +91 6304996088`);

    return lines.join("\n");
  };

  const text = buildProposalText();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleWhatsAppSend = () => {
    const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(waUrl, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-xl rounded-3xl bg-white shadow-2xl border border-amber-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="maroon-gradient px-6 py-4 text-white shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">💌</span>
            <div>
              <h3 className="font-extrabold text-base md:text-lg">
                {te ? "వాట్సాప్ సంబంధం ప్రతిపాదన (Proposal Share)" : "Share WhatsApp Proposal"}
              </h3>
              <p className="text-[11px] text-amber-200 font-medium">
                {te ? "సంపూర్ణ వివరాలు + HD బయోడేటా లింక్‌తో క్షణాల్లో వాట్సాప్‌లో పంపండి" : "Send beautiful personalized biodata proposal via WhatsApp"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full bg-white/20 text-white hover:bg-white/30 flex items-center justify-center font-bold text-sm transition"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-slate-800 flex-1">
          {/* Tone Selector */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">
              {te ? "ఎవరి తరఫున పంపుతున్నారు? (Proposal Tone):" : "Sending On Behalf Of:"}
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setTone("parent")}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition text-center border ${
                  tone === "parent"
                    ? "bg-[#7A0C2E] text-white border-[#7A0C2E] shadow-xs"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                👨‍👩‍👦 {te ? "తల్లిదండ్రులు" : "Parents"}
              </button>
              <button
                type="button"
                onClick={() => setTone("self")}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition text-center border ${
                  tone === "self"
                    ? "bg-[#7A0C2E] text-white border-[#7A0C2E] shadow-xs"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                💍 {te ? "స్వయంగా" : "Candidate"}
              </button>
              <button
                type="button"
                onClick={() => setTone("relative")}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition text-center border ${
                  tone === "relative"
                    ? "bg-[#7A0C2E] text-white border-[#7A0C2E] shadow-xs"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                🤝 {te ? "బంధువులు / Mediator" : "Relative"}
              </button>
            </div>
          </div>

          {/* Toggle Options */}
          <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-3 flex flex-wrap gap-x-4 gap-y-2 text-xs font-medium text-amber-950">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={includeSalary}
                onChange={(e) => setIncludeSalary(e.target.checked)}
                className="rounded accent-[#7A0C2E]"
              />
              <span>💰 {te ? "ఆదాయం (Salary) చేర్చు" : "Include Salary"}</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={includeAstro}
                onChange={(e) => setIncludeAstro(e.target.checked)}
                className="rounded accent-[#7A0C2E]"
              />
              <span>🌟 {te ? "గోత్రం/నక్షత్రం చేర్చు" : "Include Gothram/Star"}</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={includeBiodataLink}
                onChange={(e) => setIncludeBiodataLink(e.target.checked)}
                className="rounded accent-[#7A0C2E]"
              />
              <span>🎴 {te ? "HD బయోడేటా లింక్ చేర్చు" : "Include Biodata Link"}</span>
            </label>
          </div>

          {/* Live Message Preview */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700">
                {te ? "వాట్సాప్ సందేశం ప్రివ్యూ (WhatsApp Message Preview):" : "Live WhatsApp Message Preview:"}
              </label>
              <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                ✓ Ready to send
              </span>
            </div>
            <pre className="w-full bg-[#E5DDD5]/40 border border-[#25D366]/30 rounded-2xl p-3.5 text-xs text-slate-800 font-sans whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto">
              {text}
            </pre>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 shrink-0 flex flex-wrap gap-2.5 items-center justify-between">
          <button
            type="button"
            onClick={handleCopy}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-1.5 border ${
              copied
                ? "bg-emerald-600 text-white border-emerald-600"
                : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
            }`}
          >
            <span>{copied ? "✓" : "📋"}</span>
            <span>{copied ? (te ? "కాపీ చేయబడింది!" : "Copied!") : te ? "టెక్స్ట్ కాపీ చేయి" : "Copy Text"}</span>
          </button>

          <button
            type="button"
            onClick={handleWhatsAppSend}
            className="flex-1 min-w-[200px] py-2.5 px-4 rounded-xl font-bold text-xs bg-[#25D366] hover:bg-[#1EBE5D] text-white shadow-md hover:shadow-lg transition flex items-center justify-center gap-2"
          >
            <span className="text-base">💬</span>
            <span>{te ? "వాట్సాప్‌లో నేరుగా పంపు" : "Send Directly on WhatsApp"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
