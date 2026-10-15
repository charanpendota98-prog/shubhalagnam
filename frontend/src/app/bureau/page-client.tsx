"use client";

import { readApiJson } from "@/lib/api";
/**
 * 🏢 BUREAU (B2B) — live plans from backend, zero dummy.
 * Wave 31: mock stats + fake clients deleted; tiers = /api/meta/home-stats bureau truth.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/lang";
import PayBox from "@/components/PayBox";

type BureauPlan = {
  code: string; price: number; profiles: number; validity_days: number;
  label: string; telugu: string; badge: string; per_profile: number; perks?: string[]; perksTe?: string[];
};

const FALLBACK: BureauPlan[] = [
  { code: "BUREAU_999", price: 999, profiles: 25, validity_days: 30, label: "Bureau Starter", telugu: "₹999 → 25 interest requests (B2B)", badge: "Bureau/Agents", per_profile: 40, perks: ["25 interest requests", "30-day credit validity"], perksTe: ["25 interest requests", "30 రోజుల credit validity"] },
  { code: "BUREAU_2999", price: 2999, profiles: 100, validity_days: 30, label: "Bureau Pro", telugu: "₹2999 → 100 interest requests (B2B)", badge: "Bureau Pro", per_profile: 30, perks: ["100 interest requests", "30-day credit validity"], perksTe: ["100 interest requests", "30 రోజుల credit validity"] },
];

export default function BureauPage() {
  const { lang } = useLang();
  const te = lang === "te";
  const [plans, setPlans] = useState<BureauPlan[]>(FALLBACK);

  useEffect(() => {
    fetch("/api/meta/home-stats")
      .then((r) => readApiJson(r))
      .then((d) => { if (Array.isArray(d?.bureau) && d.bureau.length) setPlans(d.bureau); })
      .catch(() => {});
  }, []);

  const T = {
    title: te ? "బ్యూరో / ఏజెంట్ ప్లాన్లు" : "Bureau / Agent plans",
    sub: te
      ? "బ్యూరోలు / ఏజెంట్ల కోసం B2B request-credit packages. Partner link వేరుగా నమోదు చేసుకోవచ్చు; ఈ package bulk registration, monthly report లేదా channel posting ను అందించదు."
      : "B2B request-credit packages for bureaus and agents. Register separately for a partner link; these packages do not provide bulk registration, monthly reports, or channel posting.",
    perMonth: te ? "ఒకసారి" : "one-time",
    profiles: te ? "interest requests" : "interest requests",
    perProfile: te ? "/request" : "/request",
    days: te ? "రోజులు validity" : "days validity",
    choose: te ? "B2B package చెల్లించండి" : "Pay for B2B package",
    howTitle: te ? "ఎలా పని చేస్తుంది?" : "How it works?",
    steps: te ? [
      "Referral partner ID / link కోసం విడిగా నమోదు చేసుకోండి.",
      "మీ link ద్వారా వచ్చే వ్యక్తులు తమ profile/account ను స్వయంగా సృష్టిస్తారు; ఈ package bulk registration లేదా dashboard reports ఇవ్వదు.",
      "B2B package ను కొనుగోలు చేస్తే, ఆ account కు 25 లేదా 100 interest-request credits 30 రోజుల validity తో జమ అవుతాయి.",
      "Referral cash reward వేరే eligibility, exclusions, manual payout review కు లోబడి ఉంటుంది; హామీ కాదు.",
    ] : [
      "Register separately for a referral partner ID and link.",
      "People who use your link create their own profiles/accounts; this package does not include bulk registration or dashboard reports.",
      "A B2B purchase adds 25 or 100 interest-request credits to the purchasing account, valid for 30 days.",
      "Referral cash rewards have separate eligibility, exclusions, and manual payout review; they are not guaranteed.",
    ],
    note: te
      ? "B2B package contact access ను ఇవ్వదు లేదా owner consent ను దాటవేయదు. Profile owner accept చేసిన తర్వాతే accepted-request account views లో contact details కనిపిస్తాయి; notification delivery హామీ లేదు."
      : "A B2B package does not grant contact access or bypass owner consent. Contact details appear in accepted-request account views only after the profile owner accepts; notification delivery is not guaranteed.",
  };

  return (
    <div className="min-h-dvh bg-[#FFF8E7] p-4 pb-36">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
          <Link href="/" className="text-sm font-bold text-[#7A0C2E] shrink-0">← {te ? "హోమ్" : "Home"}</Link>
          <div className="font-bold text-[#7A0C2E] text-sm sm:text-base truncate min-w-0">🏢 {T.title}</div>
          <Link href="/referral/register" className="hidden min-[380px]:inline-flex min-h-10 items-center text-xs bg-[#7A0C2E] text-white px-3 py-1.5 rounded-full shrink-0 whitespace-nowrap">
            {te ? "బ్యూరో నమోదు" : "Bureau Register"} →
          </Link>
        </div>

        <p className="text-center text-[13px] text-gray-600 max-w-2xl mx-auto -mt-3 mb-6">{T.sub}</p>

        <div className={`grid gap-4 ${plans.length > 1 ? "md:grid-cols-2" : ""} max-w-4xl mx-auto`}>
          {plans.map((p) => (
            <div key={p.code} className="bg-white rounded-[1.5rem] border border-gray-100 p-6 card-shadow relative">
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
                {(te && p.perksTe ? p.perksTe : p.perks || []).map((perk) => (
                  <li key={perk}>✅ {perk}</li>
                ))}
              </ul>
              <div className="mt-5"><PayBox planCode={p.code} price={p.price} label={T.choose} /></div>
              <Link href="/register" className="mt-2 block text-center text-xs font-bold text-[#7A0C2E] underline">{te ? "Account లేదా Profile ID లేదా? Register చేయండి" : "Need an account or Profile ID? Register"}</Link>
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
