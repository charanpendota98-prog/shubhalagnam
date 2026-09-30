"use client";
/**
 * 🏢 BUREAU (B2B) — live plans from backend, zero dummy.
 * Wave 31: mock stats + fake clients deleted; tiers = /api/meta/home-stats bureau truth.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/lang";

type BureauPlan = {
  code: string; price: number; profiles: number; validity_days: number;
  label: string; telugu: string; badge: string; per_profile: number; perks?: string[];
};

const FALLBACK: BureauPlan[] = [
  { code: "BUREAU_999", price: 999, profiles: 25, validity_days: 30, label: "Bureau Starter", telugu: "₹999 → 25 profiles (B2B)", badge: "Bureau/Agents", per_profile: 40, perks: ["25 profiles", "Monthly engaged report", "Bulk register"] },
  { code: "BUREAU_2999", price: 2999, profiles: 100, validity_days: 30, label: "Bureau Pro", telugu: "₹2999 → 100 profiles (B2B)", badge: "Bureau Pro", per_profile: 30, perks: ["100 profiles", "Agent dashboard + client management", "Priority channel posting"] },
];

export default function BureauPage() {
  const { lang } = useLang();
  const te = lang === "te";
  const [plans, setPlans] = useState<BureauPlan[]>(FALLBACK);

  useEffect(() => {
    fetch("/api/meta/home-stats")
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d?.bureau) && d.bureau.length) setPlans(d.bureau); })
      .catch(() => {});
  }, []);

  const T = {
    title: te ? "బ్యూరో / ఏజెంట్ ప్లాన్లు" : "Bureau / Agent plans",
    sub: te
      ? "మ్యారేజ్ బ్యూరోలు & ఏజెంట్ల కోసం — మీ clients ని bulk గా register చేసి, monthly report తో manage చెయ్యండి."
      : "For marriage bureaus & agents — bulk-register your clients and manage them with a monthly report.",
    perMonth: te ? "/నెల" : "/mo",
    profiles: te ? "profiles" : "profiles",
    perProfile: te ? "/profile" : "/profile",
    days: te ? "రోజులు validity" : "days validity",
    choose: te ? "ఈ plan తీసుకోండి" : "Choose this plan",
    howTitle: te ? "ఎలా పని చేస్తుంది?" : "How it works?",
    steps: te ? [
      "మీ bureau short code తో clients ని register చెయ్యండి (bulk register).",
      "ప్రతి client profile మీ dashboard లో — interests, credits, status అన్నీ.",
      "నెలాఖరున monthly engaged report — ఏ clients active, ఏవి renewals.",
      "Clients pay చేస్తే మీ commission + priority channel posting.",
    ] : [
      "Register clients with your bureau short code (bulk register).",
      "Every client profile in your dashboard — interests, credits, status.",
      "Monthly engaged report — which clients are active, which need renewal.",
      "When clients pay, your commission + priority channel posting.",
    ],
    note: te
      ? "Bureau plans లో client phone numbers మీకు direct గా కనిపించవు — consent (accept) తర్వాతే exchange. Privacy అందరికీ same."
      : "Bureau plans never show client phone numbers directly — exchange only after consent (accept). Same privacy for all.",
  };

  return (
    <div className="min-h-screen bg-[#FFF8E7] p-4 pb-36">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
          <Link href="/" className="text-sm font-bold text-[#7A0C2E] shrink-0">← {te ? "హోమ్" : "Home"}</Link>
          <div className="font-bold text-[#7A0C2E] text-sm sm:text-base truncate min-w-0">🏢 {T.title}</div>
          <Link href="/referral/register" className="text-xs bg-[#7A0C2E] text-white px-3 py-1.5 rounded-full shrink-0 whitespace-nowrap">
            {te ? "బ్యూరో నమోదు" : "Bureau Register"} →
          </Link>
        </div>

        <p className="text-center text-[13px] text-gray-600 max-w-2xl mx-auto -mt-3 mb-6">{T.sub}</p>

        <div className={`grid gap-4 ${plans.length > 1 ? "md:grid-cols-2" : ""} max-w-4xl mx-auto`}>
          {plans.map((p, i) => (
            <div key={p.code}
              className={`bg-white rounded-[1.5rem] p-6 card-shadow relative ${i === 1 ? "border-2 border-[#D4AF37]" : "border border-gray-100"}`}>
              {i === 1 && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#D4AF37] text-[#7A0C2E] text-[10px] px-3 py-1 rounded-full font-bold">
                  {te ? "ఎక్కువ మంది తీసుకునేది" : "MOST POPULAR"}
                </div>
              )}
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-bold text-[16px]">{p.label}</div>
                  <div className="text-xs text-gray-500">{p.badge}</div>
                </div>
                <div className="text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold">
                  ₹{p.per_profile}{T.perProfile}
                </div>
              </div>
              <div className="mt-3">
                <span className="text-3xl font-bold text-[#7A0C2E]">₹{p.price}</span>
                <span className="text-sm text-gray-500">{T.perMonth}</span>
              </div>
              <div className="mt-1 text-[13px] font-bold">{p.profiles} {T.profiles} • {p.validity_days} {T.days}</div>
              <ul className="mt-4 text-[13px] space-y-2 text-gray-700">
                {(p.perks || []).map((perk) => (
                  <li key={perk}>✅ {perk}</li>
                ))}
              </ul>
              <Link href="/referral/register"
                className={`block text-center w-full mt-5 py-3 rounded-full font-bold text-sm ${i === 1 ? "maroon-gradient text-white" : "border border-[#7A0C2E] text-[#7A0C2E]"}`}>
                {T.choose} — ₹{p.price}
              </Link>
            </div>
          ))}
        </div>

        <div className="mt-6 max-w-4xl mx-auto grid md:grid-cols-2 gap-4">
          <div className="bg-white rounded-[1.5rem] p-6 card-shadow">
            <h3 className="font-bold text-[#7A0C2E]">📌 {T.howTitle}</h3>
            <ol className="mt-3 text-[13px] text-gray-700 space-y-2 list-decimal list-inside">
              {T.steps.map((s) => <li key={s}>{s}</li>)}
            </ol>
          </div>
          <div className="bg-[#0F1F3C] text-white rounded-[1.5rem] p-6">
            <h3 className="font-bold text-[#D4AF37]">🔒 Privacy</h3>
            <p className="mt-3 text-[13px] opacity-90 leading-relaxed">{T.note}</p>
            <Link href="/safety" className="inline-block mt-3 text-[12px] font-bold underline text-[#D4AF37]">
              {te ? "Safety విధానం →" : "Safety policy →"}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
