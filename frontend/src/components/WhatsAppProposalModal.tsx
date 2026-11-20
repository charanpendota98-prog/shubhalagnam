"use client";

import { useEffect, useId, useRef, useState } from "react";
import { apiDisplayMessage } from "@/lib/api";
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
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const hasProfile = profile !== null;
  useEffect(() => {
    if (!isOpen || !hasProfile) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (!dialog.open) dialog.showModal();
    closeRef.current?.focus({ preventScroll: true });
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, [isOpen, hasProfile]);

  const { lang } = useLang();
  const te = lang === "te";
  const [tone, setTone] = useState<"parent" | "self" | "relative">("parent");
  const [includeSalary, setIncludeSalary] = useState(true);
  const [includeAstro, setIncludeAstro] = useState(true);
  const [includeBiodataLink, setIncludeBiodataLink] = useState(true);
  const [copied, setCopied] = useState(false);
  const [actionError, setActionError] = useState<"copy" | "whatsapp" | null>(null);
  const actionEpoch = useRef(0);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    actionEpoch.current += 1;
    setCopied(false);
    setActionError(null);
    return () => {
      actionEpoch.current += 1;
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
    };
  }, [isOpen, profile?.tsap_id]);

  if (!isOpen || !profile) return null;

  const isBride = (profile.gender || "").toLowerCase().includes("bride") || (profile.gender || "").includes("ఆడ") || (profile.gender || "").includes("వధువు");
  const genderTitleTe = isBride ? "వధువు (అమ్మాయి)" : "వరుడు (అబ్బాయి)";
  const originUrl = typeof window !== "undefined" ? window.location.origin : "https://manavivaha.in";
  const profileUrl = `${originUrl}/search/${profile.tsap_id}`;
  const biodataUrl = `${originUrl}/biodata?id=${profile.tsap_id}`;

  const buildProposalText = () => {
    const displayField = (value?: string) => te
      ? String(value || "")
      : apiDisplayMessage({ message_en: value }, false, "");
    const englishMaritalStatus = (value?: string) => {
      const key = String(value || "").trim().toLowerCase();
      if (["pelli kaledu", "never married", "single"].includes(key)) return "Never married";
      if (["widow", "widower", "widowed"].includes(key)) return "Widowed";
      if (key === "divorced") return "Divorced";
      if (["awaiting divorce", "divorce pending"].includes(key)) return "Divorce pending";
      if (key === "separated") return "Separated";
      return displayField(value);
    };
    let greeting = "";
    if (tone === "parent") {
      greeting = te
        ? `🙏 నమస్కారం అండి!\nమేము మన వివాహ (Mana Vivaha) లో మీ కోసం సరితూగే ${genderTitleTe} సంబంధం ప్రొఫైల్ వివరాలను పంపుతున్నాము:`
        : `🙏 Hello!\nWe are sharing a Telugu matrimony profile from Mana Vivaha for your consideration:`;
    } else if (tone === "self") {
      greeting = te
        ? `🙏 నమస్కారం అండి!\nనేను మన వివాహ (Mana Vivaha) లో నా పెళ్లి సంబంధం కోసం వివరాలను పంపుతున్నాను. దయచేసి పరిశీలించండి:`
        : `🙏 Hello!\nI am sharing my matrimony profile from Mana Vivaha for your consideration:`;
    } else {
      greeting = te
        ? `💐 శుభోదయం / నమస్కారం అండి!\nమన బంధువులలో/పరిచయస్తులలో మీకు సరితూగే మంచి సంబంధం (Match Profile) వివరాలు ఇక్కడ ఉన్నాయి:`
        : `💐 Greetings!\nHere are the details of a prospective matrimony profile for your consideration:`;
    }

    const lines = [
      greeting,
      `\n🆔 Profile ID: ${profile.tsap_id}`,
      `${te ? "👤 పేరు" : "👤 Name"}: ${profile.full_name || (te ? "పేరు ఇవ్వలేదు" : "Name not provided")}`,
    ];
    const height = displayField(profile.height);
    if (profile.age || height) {
      const ageText = profile.age ? `${profile.age}${te ? " సం." : " years"}` : "";
      lines.push(`${te ? "🎂 వయస్సు & ఎత్తు" : "🎂 Age / height"}: ${[ageText, height].filter(Boolean).join(" · ")}`);
    }
    const education = displayField(profile.education);
    if (education) lines.push(`${te ? "🎓 చదువు" : "🎓 Education"}: ${education}`);
    const work = [profile.job, profile.company].map(displayField).filter(Boolean).join(" · ");
    if (work) lines.push(`${te ? "💼 ఉద్యోగం" : "💼 Occupation"}: ${work}`);

    const salary = displayField(profile.salary);
    if (includeSalary && salary) lines.push(`${te ? "💰 వార్షిక ఆదాయం" : "💰 Annual income"}: ${salary}`);

    const location = [profile.district, profile.state].map(displayField).filter(Boolean).join(", ");
    if (location) lines.push(`${te ? "📍 ఊరు / జిల్లా" : "📍 Location"}: ${location}`);
    const community = [profile.caste, profile.sub_caste].map(displayField).filter(Boolean).join(" / ");
    if (community) lines.push(`${te ? "🏛️ కులం / ఉపకులం" : "🏛️ Community / sub-community"}: ${community}`);

    if (includeAstro) {
      const astroLabels = te
        ? [["గోత్రం", profile.gothram], ["నక్షత్రం", profile.star], ["రాశి", profile.rasi]] as const
        : [["Gothram", profile.gothram], ["Nakshatra", profile.star], ["Moon sign", profile.rasi]] as const;
      const astroParts = astroLabels
        .map(([label, value]) => {
          const shown = displayField(value);
          return shown ? `${label}: ${shown}` : "";
        })
        .filter(Boolean);
      if (astroParts.length) lines.push(`${te ? "🌟 జాతక సూచనలు (సభ్యుడు నమోదు చేసినవి; verify కాదు)" : "🌟 Horoscope references (member-entered; not verified)"}: ${astroParts.join(" • ")}`);
    }

    const maritalStatus = te ? displayField(profile.marital_status) : englishMaritalStatus(profile.marital_status);
    if (maritalStatus && !["pelli kaledu", "never married", "single"].includes(maritalStatus.toLowerCase())) {
      lines.push(`${te ? "💍 వైవాహిక స్థితి" : "💍 Marital status"}: ${maritalStatus}`);
    }

    lines.push(te
      ? `\n🔗 పూర్తి ప్రొఫైల్ వివరాలు & ఫోటో చూడటానికి లింక్:\n👉 ${profileUrl}`
      : `\n🔗 View the full profile and photo:\n👉 ${profileUrl}`);

    if (includeBiodataLink) {
      lines.push(te
        ? `\n🎴 HD కలర్ బయోడేటా డౌన్‌లోడ్ చేయడానికి లింక్:\n👉 ${biodataUrl}`
        : `\n🎴 Download the shareable biodata:\n👉 ${biodataUrl}`);
    }

    lines.push(te ? "\n✨ మన వివాహ (Mana Vivaha) — Telugu matrimony profile service" : "\n✨ Mana Vivaha — Telugu matrimony profile service");
    lines.push(te ? "వివరాలను కుటుంబ సభ్యులతో కలిసి పరిశీలించి స్వతంత్రంగా ధృవీకరించండి." : "Review the details with your family and verify them independently.");

    return lines.join("\n");
  };

  const text = buildProposalText();

  const handleCopy = async () => {
    const epoch = ++actionEpoch.current;
    setActionError(null);
    setCopied(false);
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
    try {
      await navigator.clipboard.writeText(text);
      if (actionEpoch.current !== epoch) return;
      setCopied(true);
      copiedTimer.current = setTimeout(() => {
        if (actionEpoch.current === epoch) setCopied(false);
      }, 2500);
    } catch {
      if (actionEpoch.current === epoch) setActionError("copy");
    }
  };

  const handleWhatsAppSend = () => {
    setActionError(null);
    const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    try {
      if (!window.open(waUrl, "_blank")) setActionError("whatsapp");
    } catch {
      setActionError("whatsapp");
    }
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(
          'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'
        )).filter((element) => element.getClientRects().length > 0 && element.tabIndex >= 0);
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (!first || !last) return;
        if (event.shiftKey && (document.activeElement === first || !controls.includes(document.activeElement as HTMLElement))) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && (document.activeElement === last || !controls.includes(document.activeElement as HTMLElement))) {
          event.preventDefault();
          first.focus();
        }
      }}
      className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none border-0 bg-black/60 p-3 text-left backdrop-blur-xs open:flex open:items-center open:justify-center overflow-y-auto"
    >
      <div className="relative w-full max-w-xl rounded-3xl bg-white shadow-2xl border border-amber-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="mv-proposal-header maroon-gradient px-6 py-4 text-white shrink-0">
          <div className="min-w-0 flex-1">
              <h3 id={titleId} className="font-extrabold text-base md:text-lg">
                {te ? "వాట్సాప్ సంబంధం ప్రతిపాదన (Proposal Share)" : "Share WhatsApp Proposal"}
              </h3>
              <p id={descriptionId} className="text-[11px] text-amber-200 font-medium">
                {te ? "సంపూర్ణ వివరాలు + HD బయోడేటా లింక్‌తో క్షణాల్లో వాట్సాప్‌లో పంపండి" : "Send beautiful personalized biodata proposal via WhatsApp"}
              </p>
          </div>
          <button type="button"
            ref={closeRef}
            onClick={onClose}
            aria-label={te ? "మూసివేయండి" : "Close"}
            className="mv-proposal-close min-w-11 min-h-11 shrink-0 rounded-full bg-white/20 text-white hover:bg-white/30 flex items-center justify-center font-bold text-sm transition"
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
            <div className="mv-proposal-tones grid gap-2">
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
              <span>🌟 {te ? "గోత్రం/నక్షత్రం చేర్చు (member-entered)" : "Include member-entered Gothram/Star"}</span>
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
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
              <label className="text-xs font-bold text-slate-700">
                {te ? "వాట్సాప్ సందేశం ప్రివ్యూ (WhatsApp Message Preview):" : "Live WhatsApp Message Preview:"}
              </label>
              <span className="shrink-0 whitespace-nowrap text-[10px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                ✓ Ready to send
              </span>
            </div>
            <pre tabIndex={0} aria-label={te ? "సందేశం ముందస్తు వీక్షణ" : "Message preview"} className="w-full bg-[#E5DDD5]/40 border border-[#25D366]/30 rounded-2xl p-3.5 text-xs text-slate-800 font-sans whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto">
              {text}
            </pre>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 shrink-0">
          {actionError && (
            <p role="alert" className="mb-3 text-xs font-semibold text-red-800">
              {actionError === "copy"
                ? te ? "కాపీ కాలేదు. మళ్లీ ప్రయత్నించండి లేదా ప్రివ్యూలోని సందేశాన్ని ఎంచుకుని కాపీ చేయండి." : "Could not copy. Try again or select and copy the message in the preview."
                : te ? "వాట్సాప్ తెరుచుకోలేదు. పాప్-అప్‌లను అనుమతించి మళ్లీ ప్రయత్నించండి లేదా సందేశాన్ని కాపీ చేయండి." : "WhatsApp did not open. Allow pop-ups and try again, or copy the message."}
            </p>
          )}
          <div className="mv-proposal-actions">
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
            className="min-w-0 py-2.5 px-4 rounded-xl font-bold text-xs bg-[#25D366] hover:bg-[#1EBE5D] text-white shadow-md hover:shadow-lg transition flex items-center justify-center gap-2"
          >
            <span className="text-base">💬</span>
            <span>{te ? "వాట్సాప్‌లో నేరుగా పంపు" : "Send Directly on WhatsApp"}</span>
          </button>
          </div>
        </div>
      </div>
    </dialog>
  );
}
