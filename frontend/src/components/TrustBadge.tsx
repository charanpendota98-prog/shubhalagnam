"use client";

import { useLang } from "@/lib/lang";

/** Recorded verification facts only; no composite trust score or trustworthiness claim. */
export type TrustInfo = {
  verification_level?: "none" | "phone" | "photo" | "id";
  verification_label?: string;
  is_verified?: boolean;
};

const LABELS = {
  en: { id: "Government ID review recorded", photo: "Photo review recorded", phone: "Phone OTP recorded", none: "No phone, photo or ID check recorded", completeness: "profile fields entered" },
  te: { id: "ప్రభుత్వ ID సమీక్ష నమోదు", photo: "ఫోటో సమీక్ష నమోదు", phone: "ఫోన్ OTP నమోదు", none: "ఫోన్, ఫోటో లేదా ID తనిఖీ నమోదు కాలేదు", completeness: "ప్రొఫైల్ fields నమోదు" },
};

export default function TrustBadge({ trust, completeness, compact = false }: { trust?: TrustInfo | null; completeness?: number; compact?: boolean }) {
  const { lang } = useLang();
  const te = lang === "te";
  const labels = te ? LABELS.te : LABELS.en;
  const level = trust?.verification_level || "none";
  const status = trust?.verification_label || labels[level] || labels.none;
  const tone = level === "id" ? "bg-blue-50 text-blue-800 border-blue-200"
    : level === "photo" ? "bg-violet-50 text-violet-800 border-violet-200"
    : level === "phone" ? "bg-emerald-50 text-emerald-800 border-emerald-200"
    : "bg-slate-50 text-slate-700 border-slate-200";
  const percent = typeof completeness === "number" && Number.isFinite(completeness)
    ? Math.max(0, Math.min(100, Math.round(completeness))) : null;

  return (
    <span
      className={`inline-flex max-w-full flex-wrap items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${tone}`}
      title={te ? "ఇవి నమోదు చేసిన తనిఖీల స్థితి మాత్రమే; గుర్తింపు లేదా నమ్మకానికి హామీ కాదు." : "Recorded check status only; not a guarantee of identity or trustworthiness."}
    >
      <span aria-hidden="true">{level === "id" ? "🪪" : level === "photo" ? "📷" : level === "phone" ? "📱" : "ℹ️"}</span>
      <span>{status}</span>
      {!compact && percent !== null && (
        <span className="opacity-80">· {percent}% {labels.completeness}</span>
      )}
    </span>
  );
}
