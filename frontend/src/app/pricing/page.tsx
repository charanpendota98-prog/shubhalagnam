"use client";
/**
 * 💰 PRICING — మన వివాహ (R13: BA-level minimal — sodi teesi, clean & premium)
 * ------------------------------------------------------------------
 * Plan cards + కొన్ని essentials matrame. Okka line lo clarity:
 *   FREE start → ₹29/₹99/₹199/₹299/₹499 → numbers accept తర్వాతే.
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
  { code: "FREE", price: 0, profiles: 3, label: "Free", telugu: "మొదటి 3 requests FREE", badge: te0("ఎప్పుడైనా", "No card"), perks: ["3 interest requests", "Profile card + channels"], perksTe: ["3 interest requests", "Profile card + channels"] },
  { code: "S_29", price: 29, profiles: 1, label: "Single", telugu: "₹29 → 1 request", per_profile: 29, perks: ["1 interest request", "Decline అయితే refund"], perksTe: ["1 interest request", "Decline అయితే refund"] },
  { code: "S_99", price: 99, profiles: 5, label: "Sambandham", telugu: "₹99 → 5 requests", per_profile: 20, badge: te0("చాలా వారు తీసుకుంటారు", "Popular"), perks: ["5 requests", "7-day boost"], perksTe: ["5 requests", "7-day boost"] },
  { code: "S_199", price: 199, profiles: 12, label: "Family", telugu: "₹199 → 12 requests", per_profile: 17, badge: te0("బెస్ట్ విలువ", "Best value"), perks: ["12 requests", "✅ Verified badge", "1 జ్యోతిషం report"], perksTe: ["12 requests", "✅ Verified badge", "1 జ్యోతిషం report"] },
  { code: "S_299", price: 299, profiles: 25, label: "Premium", telugu: "₹299 → 25 requests", per_profile: 12, perks: ["25 requests", "30-day boost", "Who viewed (60d)"], perksTe: ["25 requests", "30-day boost", "Who viewed (60d)"] },
  { code: "S_499", price: 499, profiles: 50, label: "VIP", telugu: "₹499 → 50 requests", per_profile: 10, perks: ["50 requests", "Matchmaker assist", "90-day boost"], perksTe: ["50 requests", "Matchmaker assist", "90-day boost"] },
];
function te0(te: string, en: string) { return en; }  // fallback labels English (live API te labels vastayi)

const FALLBACK_ADDONS: Addon[] = [
  { code: "BOOST_49", price: 49, label: "Profile Boost (7 days)", telugu: "Channel top లో మీ card — 3× views" },
  { code: "WHOVIEWED_49", price: 49, label: "Who viewed me (30 days)", telugu: "ఎవరు చూశారు — names తో" },
  { code: "PORUTHAM_99", price: 99, label: "జ్యోతిషం పొరుతం report", telugu: "Full kundli match report (Telugu)" },
  { code: "VERIFY_199", price: 199, label: "Photo verification", telugu: "✅ Verified badge" },
];

const FAQ: { q: string; a: string }[] = [
  { q: "FREE లో ఏమి వస్తుంది?", a: "3 interest requests + profile card + channels లో posting. Card details అవసరం లేదు." },
  { q: "Phone number ఎప్పుడు వస్తుంది?", a: "రెండు వైపులా accept అయ్యాకే. Chatting లేదు — requests మాత్రమే." },
  { q: "Decline అయితే డబ్బు పోతుందా?", a: "లేదు — respond అవ్వకపోతే లేదా decline అయితే ఆ request credit refund." },
  { q: "Validity ఎంత?", a: "₹29 → 15 రోజులు · ₹99 → 30 · ₹199 → 45 · ₹299 → 60 · ₹499 → 90 రోజులు." },
  { q: "Auto-renewal / hidden charges?", a: "లేవు. GST invoice support దగ్గర అడిగితే 24 గంటల్లో వస్తుంది." },
];

export default function PricingPage() {
  const { lang } = useLang();
  const te = lang === "te";
  const [plans, setPlans] = useState<Plan[]>(FALLBACK_PLANS);
  const [addons, setAddons] = useState<Addon[]>(FALLBACK_ADDONS);

  useEffect(() => {
    fetch("/api/plans")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.plans) && d.plans.length) setPlans([d.plans[0], ...d.plans.filter((p: Plan) => p.price > 0)]);
        if (Array.isArray(d.addons) && d.addons.length) setAddons(d.addons);
      })
      .catch(() => { });
  }, []);

  const paid = plans.filter((p) => p.price > 0);
  const free = plans.find((p) => p.price === 0) || FALLBACK_PLANS[0];

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      {/* HERO — okka line (R13 minimal) */}
      <div className="text-center">
        <h1 className="text-3xl md:text-4xl font-extrabold text-[#7A0C2E] telugu">
          {te ? "ప్లాన్లు & ధరలు" : "Plans & Pricing"}
        </h1>
        <p className="mt-2 text-sm text-gray-600 telugu">
          {te ? <>మొదటి <b>3 requests FREE</b> • తర్వాత మీ ఇష్టం — ₹29 నుంచి • దాచిన ఛార్జీలు లేవు</> : <>First <b>3 requests FREE</b> • then your choice — from ₹29 • no hidden charges</>}
        </p>
      </div>

      <div className="mt-4"><OffersBanner /></div>
      <div className="mt-3"><BannerSlot page="pricing" /></div>

      {/* PLAN CARDS — core */}
      <section className="mt-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[free, ...paid].map((p) => {
            const isPopular = p.code === "S_99";
            const isBest = p.code === "S_199";
            return (
              <div key={p.code}
                className={`rounded-2xl border p-5 bg-white shadow-sm relative ${isPopular ? "border-[#B8860B] ring-2 ring-[#B8860B]/30" : isBest ? "border-[#7A0C2E]" : "border-gray-200"}`}>
                {(isPopular || isBest) && (
                  <div className="absolute -top-3 left-4 px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
                    style={{ background: isPopular ? "#B8860B" : "#7A0C2E" }}>
                    {isPopular ? (te ? "⭐ పాపులర్" : "⭐ POPULAR") : (te ? "🏆 బెస్ట్ విలువ" : "🏆 BEST VALUE")}
                  </div>
                )}
                <div className="flex items-baseline justify-between">
                  <div className="font-bold text-[#7A0C2E] text-lg telugu">{p.label}</div>
                  <div className="text-2xl font-extrabold text-[#7A0C2E]">{p.price === 0 ? (te ? "FREE" : "FREE") : `₹${p.price}`}</div>
                </div>
                <div className="mt-1 text-sm telugu text-gray-700">{p.telugu}</div>
                {p.validity_days && (
                  <div className="mt-1 text-[11px] text-gray-500">{te ? `${p.validity_days} రోజుల validity` : `${p.validity_days}-day validity`}</div>
                )}
                <ul className="mt-3 space-y-1.5 text-xs text-gray-700">
                  {((te && p.perksTe ? p.perksTe : p.perks) || []).slice(0, 4).map((k) => <li key={k} className="telugu">✅ {k}</li>)}
                </ul>
                {p.price === 0 ? (
                  <Link href="/register" className="mt-4 block text-center rounded-xl py-2.5 font-bold text-sm bg-gray-100 text-[#7A0C2E]">
                    {te ? "FREE గా start" : "Start free"}
                  </Link>
                ) : (
                  <div className="mt-4"><PayBox planCode={p.code} price={p.price} label={p.label} /></div>
                )}
              </div>
            );
          })}
        </div>
        {/* okka clarity line — numbers policy */}
        <div className="mt-5 text-center text-xs text-gray-500 telugu">
          {te ? "🔒 Phone numbers రెండు వైపులా accept అయ్యాకే share అవుతాయి • decline అయితే credit refund" : "🔒 Numbers shared only after both sides accept • credit refunded on decline"}
        </div>
      </section>

      {/* ADD-ONS + RENEWAL + REFERRAL + SPOTLIGHT — compact row */}
      <section className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="font-bold text-[#7A0C2E] telugu">{te ? "🎁 Add-ons" : "🎁 Add-ons"}</div>
          <ul className="mt-3 space-y-2 text-xs">
            {addons.map((a) => (
              <li key={a.code} className="flex items-start justify-between gap-2">
                <span className="telugu">{a.label}</span>
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
          <div className="mt-3 text-xs telugu text-gray-700">
            {te ? <>Friend register అయి pay చేస్తే మీకు <b>₹{SITE_CONFIG.pricing.referralPerPay}</b> — ఎవరైనా, ఎన్ని అయినా.</> : <>Friend registers & pays → you get <b>₹{SITE_CONFIG.pricing.referralPerPay}</b> — anyone, unlimited.</>}
          </div>
          <Link href="/referral" className="mt-3 inline-block text-xs font-bold text-[#7A0C2E] underline">{te ? "Referral చూడండి →" : "See referral →"}</Link>
        </div>
      </section>

      {/* PAYMENT + POLICIES — compact */}
      <section className="mt-10 grid md:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-[#7A0C2E] text-white p-5">
          <div className="font-bold text-sm">💳 {te ? "చెల్లింపు" : "Payments"}</div>
          <div className="mt-2 text-xs opacity-90">UPI (GPay / PhonePe / Paytm) • Cards • Net Banking — Razorpay secure</div>
          <div className="mt-2 text-[11px] opacity-75">GST invoice 24h లో • Auto-renewal లేదు</div>
          <div className="mt-3 text-[11px] opacity-75">Support: {SITE_CONFIG.supportPhoneDisplay} • {SITE_CONFIG.supportEmail}</div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="font-bold text-[#7A0C2E] text-sm">{te ? "📜 Policies" : "📜 Policies"}</div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <Link href="/refund" className="rounded-xl border border-gray-200 p-2.5 hover:border-[#7A0C2E]">💸 Refund</Link>
            <Link href="/terms" className="rounded-xl border border-gray-200 p-2.5 hover:border-[#7A0C2E]">📄 Terms</Link>
            <Link href="/privacy" className="rounded-xl border border-gray-200 p-2.5 hover:border-[#7A0C2E]">🔒 Privacy</Link>
            <Link href="/safety" className="rounded-xl border border-gray-200 p-2.5 hover:border-[#7A0C2E]">🛡️ Safety</Link>
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
            <details key={f.q} className="rounded-xl border border-gray-200 bg-white p-4 open:shadow-sm">
              <summary className="cursor-pointer font-semibold text-sm text-[#7A0C2E] telugu">{f.q}</summary>
              <p className="mt-2 text-xs text-gray-700 telugu leading-relaxed">{f.a}</p>
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
          <a href={SITE_CONFIG.supportLink} className="rounded-xl bg-white/70 text-[#7A0C2E] px-5 py-2.5 font-bold text-sm border border-[#7A0C2E]/20">{te ? "WhatsApp లో అడగండి" : "Ask on WhatsApp"}</a>
        </div>
      </section>
    </main>
  );
}
