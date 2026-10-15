"use client";

import { apiDisplayMessage, readApiJson } from "@/lib/api";
/**
 * 💰 PRICING — మన వివాహ (R13: BA-level minimal — sodi teesi, clean & premium)
 * ------------------------------------------------------------------
 * Plan cards + కొన్ని essentials matrame. Okka line lo clarity:
 *   FREE start → paid credits start at ₹99; contact sharing follows acceptance.
 * Data: GET /api/plans (backend interest.py PLANS — single source of truth)
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { SITE_CONFIG } from "@/lib/site-config";
import PayBox from "@/components/PayBox";
import OffersBanner from "@/components/OffersBanner";
import BannerSlot from "@/components/BannerSlot";
import { useLang } from "@/lib/lang";

type Plan = {
  code: string; price: number; profiles: number; label: string; telugu: string;
  badge?: string; per_profile?: number; perks?: string[]; perksTe?: string[]; validity_days?: number;
};
type Addon = { code: string; price: number; label: string; telugu: string };

const FALLBACK_PLANS: Plan[] = [
  { code: "FREE", price: 0, profiles: 3, label: "Free", telugu: "మొదటి 3 interest requests ఉచితం", badge: "No payment required", perks: ["3 interest requests", "Profile card generation", "No payment required"], perksTe: ["3 ఉచిత interest requests", "ప్రొఫైల్ కార్డ్", "చెల్లింపు అవసరం లేదు"] },
  { code: "S_99", price: 99, profiles: 5, label: "Sambandham", telugu: "₹99 → 5 interest requests", per_profile: 20, badge: "Entry", perks: ["5 interest requests", "30-day credit validity", "Contact access in accepted-request account views after owner acceptance", "Refund policy as shown in your account"], perksTe: ["5 interest requests", "30 రోజుల credit validity", "Owner accept చేసిన తర్వాత accepted-request account views లో contact details కనిపిస్తాయి", "Account లో చూపిన refund policy వర్తిస్తుంది"] },
  { code: "S_199", price: 199, profiles: 12, label: "Family", telugu: "₹199 → 12 interest requests", per_profile: 17, badge: "₹17/request", perks: ["12 interest requests", "45-day credit validity", "Contact access in accepted-request account views after owner acceptance", "Refund policy as shown in your account"], perksTe: ["12 interest requests", "45 రోజుల credit validity", "Owner accept చేసిన తర్వాత accepted-request account views లో contact details కనిపిస్తాయి", "Account లో చూపిన refund policy వర్తిస్తుంది"] },
  { code: "S_299", price: 299, profiles: 25, label: "Premium", telugu: "₹299 → 25 interest requests", per_profile: 12, badge: "₹12/request", perks: ["25 interest requests", "60-day credit validity", "Who-viewed names while this plan is active", "Contact access in accepted-request account views after owner acceptance", "Refund policy as shown in your account"], perksTe: ["25 interest requests", "60 రోజుల credit validity", "ఈ plan active ఉన్నంతవరకు మీ profile చూసిన వారి పేర్లు", "Owner accept చేసిన తర్వాత accepted-request account views లో contact details కనిపిస్తాయి", "Account లో చూపిన refund policy వర్తిస్తుంది"] },
  { code: "S_499", price: 499, profiles: 50, label: "VIP", telugu: "₹499 → 50 interest requests", per_profile: 10, badge: "VIP", perks: ["50 interest requests", "90-day credit validity", "Who-viewed names while this plan is active", "Contact access in accepted-request account views after owner acceptance", "Refund policy as shown in your account"], perksTe: ["50 interest requests", "90 రోజుల credit validity", "ఈ plan active ఉన్నంతవరకు మీ profile చూసిన వారి పేర్లు", "Owner accept చేసిన తర్వాత accepted-request account views లో contact details కనిపిస్తాయి", "Account లో చూపిన refund policy వర్తిస్తుంది"] },
];
const FALLBACK_ADDONS: Addon[] = [
  { code: "BOOST_49", price: 49, label: "Profile Boost (1 day)", telugu: "ఒక రోజు boost; placement availability మారవచ్చు" },
  { code: "WHOVIEWED_49", price: 49, label: "Who viewed me (30 days)", telugu: "30 రోజుల పాటు viewer names చూడండి" },
  { code: "VERIFY_199", price: 199, label: "Manual photo review request", telugu: "ఫోటో review request; approval లేదా badge హామీ కాదు" },
];

const FAQ: { qTe: string; qEn: string; aTe: string; aEn: string }[] = [
  { qTe: "ఉచిత సభ్యత్వంలో ఏయే సేవలు అందుతాయి?", qEn: "What is included in the free plan?", aTe: "3 ఉచిత interest requests మరియు profile card లభిస్తాయి. Notification అందుబాటు configured సేవలపై ఆధారపడుతుంది; delivery హామీ లేదు. Payment వివరాలు ఇవ్వాల్సిన అవసరం లేదు.", aEn: "The free plan includes 3 interest requests and a profile card. Notification availability depends on configured services; delivery is not guaranteed. No payment details are required." },
  { qTe: "సంప్రదింపు వివరాలు ఎప్పుడు లభిస్తాయి?", qEn: "When are contact details shared?", aTe: "Profile owner accept చేసిన తర్వాత accepted-request account views లో contact details కనిపిస్తాయి; configured WhatsApp notification లో ఉండవచ్చు, delivery/read నిర్ధారణ కాదు. Credits consent ను bypass చేయవు.", aEn: "After the profile owner accepts, contact details appear in accepted-request account views and may be included in a configured WhatsApp notification; delivery/read status is not confirmed. Credits do not bypass consent." },
  { qTe: "Decline లేదా స్పందన లేకపోతే క్రెడిట్ ఏమవుతుంది?", qEn: "What happens to a credit after a decline or no response?", aTe: "Decline పై credit return మీ account policy ప్రకారం ఉంటుంది. 7 రోజులకు స్పందన లేక request expire అయితే ఖర్చయిన 1 request credit ఒకసారి తిరిగి వస్తుంది. ఇది cash refund కాదు.", aEn: "Credit returns on decline follow your account policy. If a request expires after 7 days without a response, one request credit is returned once. Neither is a cash refund." },
  { qTe: "ప్లాన్ validity ఎంత?", qEn: "How long are plan credits valid?", aTe: "₹99 ప్లాన్ → 30 రోజులు · ₹199 → 45 రోజులు · ₹299 → 60 రోజులు · ₹499 VIP → 90 రోజులు.", aEn: "₹99 plan: 30 days · ₹199: 45 days · ₹299: 60 days · ₹499 VIP: 90 days." },
  { qTe: "ప్లాన్ ఆటో-రెన్యూ అవుతుందా?", qEn: "Does a plan auto-renew?", aTe: "Plan కొనుగోలు మీ స్వంత నిర్ణయంతో జరుగుతుంది; add-ons కు checkout ముందు విడిగా ధర చూపిస్తాం.", aEn: "Plans are purchased by your choice; add-ons have separate prices shown before checkout." },
];

export default function PricingPage() {
  const { lang } = useLang();
  const te = lang === "te";
  const [plans, setPlans] = useState<Plan[]>(FALLBACK_PLANS);
  const [addons, setAddons] = useState<Addon[]>(FALLBACK_ADDONS);

  useEffect(() => {
    fetch("/api/plans")
      .then((r) => readApiJson(r))
      .then((d) => {
        if (Array.isArray(d.plans) && d.plans.length) setPlans([d.plans[0], ...d.plans.filter((p: Plan) => p.price > 0)]);
        if (Array.isArray(d.addons) && d.addons.length) setAddons(d.addons);
      })
      .catch(() => { });
  }, []);

  const paid = plans.filter((p) => p.price > 0);
  const free = plans.find((p) => p.price === 0) || FALLBACK_PLANS[0];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 pb-36">
      {/* HERO — okka line (R13 minimal) */}
      <div className="text-center">
        <h1 className="text-3xl md:text-4xl font-extrabold text-[#7A0C2E] telugu">
          {te ? "ప్లాన్లు & ధరలు" : "Plans & Pricing"}
        </h1>
        <p className="mt-2 text-sm text-gray-600 telugu">
          {te ? <>మొదటి <b>3 requests FREE</b> • తర్వాత ₹99 నుంచి • optional add-ons ధరలు విడిగా చూపిస్తాం</> : <>First <b>3 requests FREE</b> • paid plans from ₹99 • optional add-ons priced separately</>}
        </p>
      </div>

      <div className="mt-4"><OffersBanner /></div>
      <div className="mt-3"><BannerSlot page="pricing" /></div>

      {/* PLAN CARDS — core */}
      <section className="mt-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[free, ...paid].map((p) => (
              <div key={p.code} className="rounded-2xl border border-gray-200 p-5 bg-white shadow-sm">
                <div className="flex items-baseline justify-between">
                  <div className="font-bold text-[#7A0C2E] text-lg">{te ? p.label : apiDisplayMessage({ message_en: p.label }, false, "Plan")}</div>
                  <div className="text-2xl font-extrabold text-[#7A0C2E]">{p.price === 0 ? (te ? "FREE" : "FREE") : `₹${p.price}`}</div>
                </div>
                <div className={`mt-1 text-sm text-gray-700 ${te ? "telugu" : ""}`} lang={te ? "te-IN" : "en-IN"}>
                  {te
                    ? p.telugu || `${p.profiles} interest requests`
                    : `${p.price === 0 ? "First " : `₹${p.price} · `}${p.profiles} interest request${p.profiles === 1 ? "" : "s"}${p.price === 0 ? " are free" : ""}`}
                </div>
                {p.validity_days && (
                  <div className="mt-1 text-[11px] text-gray-500">{te ? `${p.validity_days} రోజులపాటు చెల్లుబాటు` : `${p.validity_days}-day validity`}</div>
                )}
                <ul className="mt-3 space-y-1.5 text-xs text-gray-700">
                  {(te ? p.perksTe || [] : (p.perks || []).map((perk) => apiDisplayMessage({ message_en: perk }, false, "")).filter(Boolean))
                    .slice(0, 4).map((perk) => <li key={perk} className={te ? "telugu" : ""}>✅ {perk}</li>)}
                  {te && !p.perksTe?.length ? <li className="text-gray-500">ప్లాన్ వివరాలు అందుబాటులో లేవు</li> : null}
                </ul>
                {p.price === 0 ? (
                  <Link href="/register" className="mt-4 block text-center rounded-xl py-2.5 font-bold text-sm bg-gray-100 text-[#7A0C2E]">
                    {te ? "FREE గా start" : "Start free"}
                  </Link>
                ) : (
                  <div className="mt-4"><PayBox planCode={p.code} price={p.price} label={p.label} /></div>
                )}
              </div>
          ))}
        </div>
        {/* okka clarity line — numbers policy */}
        <div className="mt-5 text-center text-xs text-gray-500 telugu">
          {te ? "🔒 Owner accept తర్వాత accepted-request account views లో contact details కనిపిస్తాయి; notification delivery హామీ లేదు • decline credit return account policy ప్రకారం" : "🔒 Owner acceptance grants contact access in accepted-request account views; notification delivery is not guaranteed • decline credit returns follow account policy"}
        </div>
      </section>

      {/* ADD-ONS + RENEWAL + REFERRAL + SPOTLIGHT — compact row */}
      <section className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="font-bold text-[#7A0C2E] telugu">{te ? "🎁 Add-ons" : "🎁 Add-ons"}</div>
          <ul className="mt-3 space-y-2 text-xs">
            {addons.map((a) => (
              <li key={a.code} className="flex items-start justify-between gap-2">
                <span className={te ? "telugu" : ""} lang={te ? "te-IN" : "en-IN"}>{te ? a.telugu || a.label : apiDisplayMessage({ message_en: a.label }, false, "Add-on")}</span>
                <span className="font-bold text-[#7A0C2E] whitespace-nowrap">₹{a.price}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-[#B8860B]/40 bg-[#FFF8E1] p-5">
          <div className="font-bold text-[#7A0C2E] telugu">{te ? "🔁 Renewal (పాత customers)" : "🔁 Renewal"}</div>
          <div className="mt-3 text-sm telugu">₹{SITE_CONFIG.pricing.renewal.price} → <b>{SITE_CONFIG.pricing.renewal.profiles} requests</b></div>
          <Link href="/requests#renew" className="mt-3 inline-block text-xs font-bold text-[#7A0C2E] underline">{te ? "Renewal తీసుకోండి →" : "Get renewal →"}</Link>
        </div>
        <div className="rounded-2xl border border-gold/40 bg-white p-5">
          <div className="font-bold text-[#7A0C2E] telugu">🌟 {te ? "స్పాట్‌లైట్ ప్రమోషన్" : "Spotlight Boost"}</div>
          <div className="mt-3 text-xs telugu text-gray-700">
            {te ? <>హోమ్‌పేజీ టాప్‌లో ఫోటో & వీడియోతో మీ ప్రొఫైల్ ప్రమోట్ చేసుకోండి — <b>₹99 నుండి</b>.</> : <>Promote your profile with photo & video at top of home — <b>from ₹99</b>.</>}
          </div>
          <Link href="/spotlight" className="mt-3 inline-block text-xs font-bold text-[#7A0C2E] underline">{te ? "ప్రమోట్ చేసుకోండి →" : "Promote profile →"}</Link>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="font-bold text-[#7A0C2E] telugu">🤝 Referral — ₹{SITE_CONFIG.pricing.referralPerPay}</div>
          <div className="mt-3 text-xs telugu leading-relaxed text-gray-700">
            {te
              ? <>Referrer కు ఒక్కసారి ₹{SITE_CONFIG.pricing.referralPerPay} reward అర్హత ఉండవచ్చు—referred user మొదటి qualifying S_99/S_199/S_299/S_499 consumer-plan payment కనీసం ₹99 అయినప్పుడు మాత్రమే. Add-ons, renewals, B2B plans తదితర మినహాయింపులు వర్తిస్తాయి; payout manual review లో ఉంటుంది.</>
              : <>A referrer may qualify once for ₹{SITE_CONFIG.pricing.referralPerPay} only after the referred user&apos;s first qualifying S_99/S_199/S_299/S_499 consumer-plan payment of at least ₹99. Add-ons, renewals, B2B plans and other exclusions apply; payout is manually reviewed.</>}
          </div>
          <Link href="/referral" className="mt-3 inline-block text-xs font-bold text-[#7A0C2E] underline">{te ? "అర్హత నియమాలు చూడండి →" : "See eligibility rules →"}</Link>
        </div>
      </section>

      {/* PAYMENT + POLICIES — compact */}
      <section className="mt-10 grid md:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-[#7A0C2E] text-white p-5">
          <div className="font-bold text-sm">💳 {te ? "చెల్లింపు" : "Payments"}</div>
          <div className="mt-2 text-xs opacity-90">{te ? "చెల్లింపు మార్గాలు checkout వద్ద చూపిస్తాం; అందుబాటు ప్రస్తుత payment configuration పై ఆధారపడి ఉంటుంది." : "Available payment methods are shown at checkout; options depend on current payment configuration."}</div>
          <div className="mt-2 text-[11px] opacity-75">{te ? "స్వయంచాలక పునరుద్ధరణ ప్రారంభించలేదు." : "Auto-renewal is not enabled."}</div>
          {SITE_CONFIG.supportConfigured ? (
            <div className="mt-3 flex flex-wrap gap-x-2 text-[11px] opacity-75">
              <span>{te ? "సహాయం:" : "Support:"}</span>
              {SITE_CONFIG.supportLink ? <a href={SITE_CONFIG.supportLink} target="_blank" rel="noopener noreferrer" className="underline">{te ? "కాన్ఫిగర్ చేసిన WhatsApp" : "Configured WhatsApp"}</a> : null}
              {SITE_CONFIG.supportPhoneDisplay ? <a href={`tel:${SITE_CONFIG.supportPhoneDisplay.replace(/[^\d+]/g, "")}`} className="underline">{SITE_CONFIG.supportPhoneDisplay}</a> : null}
              {SITE_CONFIG.supportEmail ? <a href={`mailto:${SITE_CONFIG.supportEmail}`} className="underline">{SITE_CONFIG.supportEmail}</a> : null}
            </div>
          ) : null}
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="font-bold text-[#7A0C2E] text-sm">{te ? "📜 విధానాలు" : "📜 Policies"}</div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <Link href="/refund" className="rounded-xl border border-gray-200 p-2.5 hover:border-[#7A0C2E]">💸 {te ? "వాపసు" : "Refund"}</Link>
            <Link href="/terms" className="rounded-xl border border-gray-200 p-2.5 hover:border-[#7A0C2E]">📄 {te ? "నిబంధనలు" : "Terms"}</Link>
            <Link href="/privacy" className="rounded-xl border border-gray-200 p-2.5 hover:border-[#7A0C2E]">🔒 {te ? "గోప్యత" : "Privacy"}</Link>
            <Link href="/safety" className="rounded-xl border border-gray-200 p-2.5 hover:border-[#7A0C2E]">🛡️ {te ? "భద్రత" : "Safety"}</Link>
          </div>
          <div className="mt-3 text-[11px] text-gray-500 telugu">
            {te ? "⚠️ Advance money అడిగితే అది మోసం — report చెయ్యండి." : "⚠️ Anyone asking advance money is fraud — report it."}
          </div>
        </div>
      </section>

      {/* FAQ — 5 short */}
      <section className="mt-10">
        <h2 className="text-xl font-bold text-[#7A0C2E] telugu">{te ? "❓ ప్రశ్నలు" : "❓ FAQ"}</h2>
        <div className="mt-3 space-y-2">
          {FAQ.map((f) => (
            <details key={f.qEn} className="rounded-xl border border-gray-200 bg-white p-4 open:shadow-sm">
              <summary className="cursor-pointer font-semibold text-sm text-[#7A0C2E] telugu">{te ? f.qTe : f.qEn}</summary>
              <p className="mt-2 text-xs text-gray-700 telugu leading-relaxed">{te ? f.aTe : f.aEn}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA — clean */}
      <section className="mt-10 rounded-3xl gold-gradient p-6 text-center">
        <div className="text-lg font-extrabold text-[#7A0C2E] telugu">
          {te ? "మొదటి 3 requests FREE — ఇప్పుడే start చెయ్యండి" : "First 3 requests FREE — start now"}
        </div>
        <div className="mt-4 flex flex-wrap gap-3 justify-center">
          <Link href="/register" className="rounded-xl bg-[#7A0C2E] text-white px-5 py-2.5 font-bold text-sm">Register FREE →</Link>
          {SITE_CONFIG.supportLink ? (
            <a href={SITE_CONFIG.supportLink} target="_blank" rel="noopener noreferrer" className="rounded-xl bg-white/70 text-[#7A0C2E] px-5 py-2.5 font-bold text-sm border border-[#7A0C2E]/20">{te ? "WhatsApp లో అడగండి" : "Ask on WhatsApp"}</a>
          ) : null}
        </div>
      </section>
    </div>
  );
}
