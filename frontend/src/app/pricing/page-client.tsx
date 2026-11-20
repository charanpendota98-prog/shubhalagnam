"use client";
import "@/components/trust-workspace.css";

import { apiDisplayMessage } from "@/lib/api";
/**
 * 💰 PRICING — మన వివాహ (R13: BA-level minimal — sodi teesi, clean & premium)
 * ------------------------------------------------------------------
 * Plan cards + కొన్ని essentials matrame. Okka line lo clarity:
 *   FREE start → paid credits start at ₹99; contact sharing follows acceptance.
 * Data: GET /api/plans (backend interest.py PLANS — single source of truth)
 */
import Link from "next/link";
import { AlertTriangle, BadgeHelp, Check, CreditCard, FileText, Gift, Handshake, LockKeyhole, RefreshCw, ScrollText, ShieldCheck, Sparkles, Undo2 } from "lucide-react";
import { SITE_CONFIG } from "@/lib/site-config";
import PayBox from "@/components/PayBox";
import OffersBanner from "@/components/OffersBanner";
import BannerSlot from "@/components/BannerSlot";
import { useLang } from "@/lib/lang";

const withoutLeadingEmoji = (text: string) => text.replace(/^[\p{Extended_Pictographic}\uFE0F\u200D\s]+/u, "").trim();

export type Plan = {
  code: string; price: number; profiles: number; label: string; telugu: string;
  badge?: string; per_profile?: number; perks?: string[]; perksTe?: string[]; validity_days?: number;
};
export type Addon = { code: string; price: number; label: string; telugu: string };

const PLAN_NAMES_TE: Record<string, string> = { FREE: "ఉచిత ప్రారంభం", S_99: "సంబంధం", S_199: "ఫ్యామిలీ", S_299: "ప్రీమియం", S_499: "వీఐపీ", BUREAU_999: "బ్యూరో స్టార్టర్", BUREAU_2999: "బ్యూరో ప్రో" };

const FAQ: { qTe: string; qEn: string; aTe: string; aEn: string }[] = [
  { qTe: "ఉచిత సభ్యత్వంలో ఏయే సేవలు అందుతాయి?", qEn: "What is included in the free plan?", aTe: "ఆసక్తి తెలిపేందుకు 3 ఉచిత అభ్యర్థనలు, ఒక ప్రొఫైల్ కార్డు లభిస్తాయి. సందేశాలు రావడం అందుబాటులో ఉన్న సేవలపై ఆధారపడుతుంది; అవి తప్పక చేరుతాయని హామీ లేదు. చెల్లింపు వివరాలు ఇవ్వాల్సిన అవసరం లేదు.", aEn: "The free plan includes 3 interest requests and a profile card. Notification availability depends on configured services; delivery is not guaranteed. No payment details are required." },
  { qTe: "సంప్రదింపు వివరాలు ఎప్పుడు లభిస్తాయి?", qEn: "When are contact details shared?", aTe: "ఎదుటి వ్యక్తి అంగీకరించాక, మీ ఖాతాలో అంగీకరించిన అభ్యర్థన వద్ద సంప్రదింపు వివరాలు కనిపిస్తాయి. WhatsApp సందేశ సేవ అమల్లో ఉంటే ఆ సందేశంలోనూ ఉండవచ్చు; సందేశం చేరిందని లేదా చదివారని నిర్ధారించలేం. క్రెడిట్లు ఉన్నా ఎదుటి వ్యక్తి అంగీకారం తప్పనిసరి.", aEn: "After the profile owner accepts, contact details appear in accepted-request account views and may be included in a configured WhatsApp notification; delivery/read status is not confirmed. Credits do not bypass consent." },
  { qTe: "తిరస్కరిస్తే లేదా స్పందించకపోతే క్రెడిట్ ఏమవుతుంది?", qEn: "What happens to a credit after a decline or no response?", aTe: "అభ్యర్థనను తిరస్కరిస్తే, దానికి ఖర్చయిన 1 క్రెడిట్ ఒక్కసారి తిరిగి వస్తుంది. 7 రోజుల్లో స్పందన రాక అభ్యర్థన గడువు ముగిసినా, దానికి ఖర్చయిన 1 క్రెడిట్ ఒక్కసారి తిరిగి వస్తుంది. ఇది డబ్బు వాపసు కాదు.", aEn: "A declined request returns the spent request credit once. If a request expires after 7 days without a response, one request credit is returned once. Neither is a cash refund." },
  { qTe: "ప్లాన్ క్రెడిట్ల గడువు ఎంత?", qEn: "How long are plan credits valid?", aTe: "₹99 ప్లాన్ → 30 రోజులు · ₹199 → 45 రోజులు · ₹299 → 60 రోజులు · ₹499 వీఐపీ → 90 రోజులు.", aEn: "₹99 plan: 30 days · ₹199: 45 days · ₹299: 60 days · ₹499 VIP: 90 days." },
  { qTe: "ప్లాన్ ఆటో-రెన్యూ అవుతుందా?", qEn: "Does a plan auto-renew?", aTe: "ప్లాన్ కొనాలా వద్దా అనేది మీ నిర్ణయం. అదనపు సేవల ధరలను చెల్లింపుకు ముందు విడిగా చూపిస్తాం.", aEn: "Plans are purchased by your choice; add-ons have separate prices shown before checkout." },
];

export type PricingSnapshot = {
  paymentMode?: "unconfigured" | "manual_upi" | "razorpay" | "unknown";
  plans: Plan[] | null;
  addons: Addon[];
  offers: import("@/components/OffersBanner").Offer[];
  banners: import("@/components/BannerSlot").Banner[];
  noticesUnavailable: boolean;
};

export default function PricingPage({ snapshot }: { snapshot: PricingSnapshot }) {
  const { lang } = useLang();
  const te = lang === "te";
  const plans = snapshot.plans || [];
  const addons = snapshot.addons;
  const paid = plans.filter((p) => p.price > 0);
  const free = plans.find((p) => p.price === 0);

  return (
    <div className="mv-trust-workspace max-w-6xl mx-auto px-4 py-8 pb-36">
      {/* HERO — okka line (R13 minimal) */}
      <div className="text-center">
        <h1 className="text-3xl md:text-4xl font-extrabold text-[#7A0C2E] telugu">
          {te ? "ప్లాన్లు, ధరలు" : "Plans & Pricing"}
        </h1>
        <p className="mt-2 text-sm text-gray-600 telugu">
          {te ? <>మొదటి <b>3 అభ్యర్థనలు ఉచితం</b> • ఆ తర్వాత ₹99 నుంచి • అదనపు సేవల ధరలు వేరు</> : <>First <b>3 requests FREE</b> • paid plans from ₹99 • optional add-ons priced separately</>}
        </p>
      </div>

      <div role="status" className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        <p className="font-bold">{snapshot.paymentMode === "unconfigured" ? (te ? "ప్రస్తుతం చెల్లింపులు చేయలేరు" : "Paid checkout is currently unavailable") : (te ? "చెల్లింపు ముందు ప్రస్తుత స్థితి తనిఖీ చేయండి" : "Check current payment availability before paying")}</p>
        <p className="mt-1">{snapshot.paymentMode === "unconfigured"
          ? (te ? "ఉచితంగా నమోదు చేసుకుని మొదటి 3 అభ్యర్థనలు పంపండి. దిగువ ప్లాన్ల ధరలు సమాచారం కోసం మాత్రమే. చెల్లింపు వివరాలు నిర్ధారించకుండా డబ్బు పంపవద్దు." : "Start with free registration and the first 3 requests. Paid plans below are a price catalogue, not an available checkout. Do not send money without a verified checkout destination.")
          : (te ? "చెల్లింపు సదుపాయం కనిపించినంత మాత్రాన అది అమల్లో ఉందని లేదా సేవా సంస్థ అనుమతి ఉందని అర్థం కాదు. చెల్లింపు వివరాలు నిర్ధారించలేకపోతే డబ్బు పంపవద్దు." : "Configuration alone does not confirm provider approval or live payments. Do not send money when checkout details cannot be verified.")}</p>
      </div>

      <div className="mt-4"><OffersBanner initialOffers={snapshot.offers} /></div>
      <div className="mt-3"><BannerSlot page="pricing" initialBanners={snapshot.banners} /></div>

      {snapshot.noticesUnavailable && <p role="status" className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm">{te ? "ఆఫర్లు లేదా ప్రకటనలు ప్రస్తుతం చూపించలేకపోతున్నాం. తాజా వివరాల కోసం పేజీని మళ్లీ తెరవండి." : "Offers or announcements are temporarily unavailable. Reload for current details."}</p>}
      {!snapshot.plans && <div role="alert" className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-4"><p>{te ? "ప్రస్తుత ప్లాన్ కార్డులు అందుబాటులో లేవు. మళ్లీ ప్రయత్నించండి." : "Current plan cards are unavailable. Please try again."}</p><button type="button" className="mt-3 rounded-xl border px-4 py-2" onClick={() => window.location.reload()}>{te ? "మళ్లీ ప్రయత్నించండి" : "Retry"}</button></div>}
      {/* PLAN CARDS — core */}
      <section className="mt-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...(free ? [free] : []), ...paid].map((p) => (
              <div key={p.code} className="rounded-2xl border border-gray-200 p-5 bg-white shadow-sm">
                <div className="flex items-baseline justify-between">
                  <div className="font-bold text-[#7A0C2E] text-lg">{te ? (PLAN_NAMES_TE[p.code] || p.label) : apiDisplayMessage({ message_en: p.label }, false, "Plan")}</div>
                  <div className="text-2xl font-extrabold text-[#7A0C2E]">{p.price === 0 ? (te ? "ఉచితం" : "FREE") : `₹${p.price}`}</div>
                </div>
                <div className={`mt-1 text-sm text-gray-700 ${te ? "telugu" : ""}`} lang={te ? "te-IN" : "en-IN"}>
                  {te
                    ? p.telugu || `${p.profiles} అభ్యర్థనలు`
                    : `${p.price === 0 ? "First " : `₹${p.price} · `}${p.profiles} interest request${p.profiles === 1 ? "" : "s"}${p.price === 0 ? " are free" : ""}`}
                </div>
                {p.validity_days && (
                  <div className="mt-1 text-[11px] text-gray-500">{te ? `${p.validity_days} రోజులపాటు చెల్లుబాటు` : `${p.validity_days}-day validity`}</div>
                )}
                <ul className="mt-3 space-y-1.5 text-xs text-gray-700">
                  {(te ? p.perksTe || [] : (p.perks || []).map((perk) => apiDisplayMessage({ message_en: perk }, false, "")).filter(Boolean))
                    .map((perk) => withoutLeadingEmoji(perk)).filter(Boolean)
                    .slice(0, 4).map((perk) => <li key={perk} className={`flex items-start gap-1.5 ${te ? "telugu" : ""}`}><Check aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span>{perk}</span></li>)}
                  {te && !p.perksTe?.length ? <li className="text-gray-500">ప్లాన్ వివరాలు అందుబాటులో లేవు</li> : null}
                </ul>
                {p.price === 0 ? (
                  <Link href="/register" className="mt-4 block text-center rounded-xl py-2.5 font-bold text-sm bg-gray-100 text-[#7A0C2E]">
                    {te ? "ఉచితంగా మొదలుపెట్టండి" : "Start free"}
                  </Link>
                ) : (
                  <div className="mt-4"><PayBox planCode={p.code} price={p.price} label={te ? (PLAN_NAMES_TE[p.code] || p.label) : p.label} /></div>
                )}
              </div>
          ))}
        </div>
        {/* okka clarity line — numbers policy */}
        <div className="mt-5 flex items-start justify-center gap-1.5 text-center text-xs text-gray-500 telugu">
          <LockKeyhole aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" /><span>
          {te ? "ఎదుటి వ్యక్తి అంగీకరించాకే మీ ఖాతాలో ఆ అభ్యర్థన వద్ద సంప్రదింపు వివరాలు కనిపిస్తాయి. సందేశం తప్పక చేరుతుందని హామీ లేదు. తిరస్కరిస్తే ఖర్చయిన 1 క్రెడిట్ ఒక్కసారి తిరిగి వస్తుంది." : "Owner acceptance grants contact access in accepted-request account views; notification delivery is not guaranteed • a decline returns one request credit once"}</span>
        </div>
      </section>

      {/* ADD-ONS + RENEWAL + REFERRAL + SPOTLIGHT — compact row */}
      <section className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="font-bold text-[#7A0C2E] telugu"><Gift aria-hidden="true" className="inline-block h-4 w-4 shrink-0 align-middle" /> {te ? "అదనపు సేవలు" : "Add-ons"}</div>
          <ul className="mt-3 space-y-2 text-xs">
            {addons.map((a) => (
              <li key={a.code} className="flex items-start justify-between gap-2">
                <span className={te ? "telugu" : ""} lang={te ? "te-IN" : "en-IN"}>{withoutLeadingEmoji(te ? a.telugu || a.label : apiDisplayMessage({ message_en: a.label }, false, "Add-on"))}</span>
                <span className="font-bold text-[#7A0C2E] whitespace-nowrap">₹{a.price}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-[#B8860B]/40 bg-[#FFF8E1] p-5">
          <div className="font-bold text-[#7A0C2E] telugu"><RefreshCw aria-hidden="true" className="inline-block h-4 w-4 shrink-0 align-middle" /> {te ? "పునరుద్ధరణ (పాత సభ్యులకు)" : "Renewal"}</div>
          <div className="mt-3 text-sm telugu">₹{SITE_CONFIG.pricing.renewal.price} → <b>{SITE_CONFIG.pricing.renewal.profiles} {te ? "అభ్యర్థనలు" : "requests"}</b></div>
          <Link href="/requests#renew" className="mt-3 inline-block text-xs font-bold text-[#7A0C2E] underline">{te ? "మళ్లీ కొనుగోలు చేయండి →" : "Get renewal →"}</Link>
        </div>
        <div className="rounded-2xl border border-gold/40 bg-white p-5">
          <div className="font-bold text-[#7A0C2E] telugu"><Sparkles aria-hidden="true" className="inline-block h-4 w-4 shrink-0 align-middle" /> {te ? "ప్రొఫైల్‌కు ప్రచారం" : "Spotlight Boost"}</div>
          <div className="mt-3 text-xs telugu text-gray-700">
            {te ? <>మొదటి పేజీ పైభాగంలో ఫోటో, వీడియోతో మీ ప్రొఫైల్‌కు ప్రచారం చేయండి. <b>₹99 నుంచి</b>.</> : <>Promote your profile with photo & video at top of home — <b>from ₹99</b>.</>}
          </div>
          <Link href="/spotlight" className="mt-3 inline-block text-xs font-bold text-[#7A0C2E] underline">{te ? "ప్రచారం చేయండి →" : "Promote profile →"}</Link>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="font-bold text-[#7A0C2E] telugu"><Handshake aria-hidden="true" className="inline-block h-4 w-4 shrink-0 align-middle" /> {te ? "స్నేహితులను పరిచయం చేయండి" : "Referral"} · ₹{SITE_CONFIG.pricing.referralPerPay}</div>
          <div className="mt-3 text-xs telugu leading-relaxed text-gray-700">
            {te
              ? <>మీరు పరిచయం చేసిన వ్యక్తి మొదటిసారి అర్హత ఉన్న వ్యక్తిగత ప్లాన్ (S_99/S_199/S_299/S_499) కోసం కనీసం ₹99 చెల్లించినప్పుడే, మీకు ఒక్కసారి ₹{SITE_CONFIG.pricing.referralPerPay} బహుమతికి అర్హత ఉండవచ్చు. అదనపు సేవలు, మళ్లీ కొనుగోళ్లు, వ్యాపార ప్లాన్లు, ఇతర మినహాయింపులు వర్తిస్తాయి. పరిశీలన తర్వాతే బహుమతి చెల్లింపును నిర్ణయిస్తారు.</>
              : <>A referrer may qualify once for ₹{SITE_CONFIG.pricing.referralPerPay} only after the referred user&apos;s first qualifying S_99/S_199/S_299/S_499 consumer-plan payment of at least ₹99. Add-ons, renewals, B2B plans and other exclusions apply; payout is manually reviewed.</>}
          </div>
          <Link href="/referral" className="mt-3 inline-block text-xs font-bold text-[#7A0C2E] underline">{te ? "అర్హత నియమాలు చూడండి →" : "See eligibility rules →"}</Link>
        </div>
      </section>

      {/* PAYMENT + POLICIES — compact */}
      <section className="mt-10 grid md:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-[#7A0C2E] text-white p-5">
          <div className="font-bold text-sm"><CreditCard aria-hidden="true" className="inline-block h-4 w-4 shrink-0 align-middle" /> {te ? "చెల్లింపు" : "Payments"}</div>
          <div className="mt-2 text-xs opacity-90">{te ? "చెల్లింపు సమయంలో అందుబాటులో ఉన్న మార్గాలను చూపిస్తాం. ఏ మార్గాలు పనిచేస్తాయనేది అప్పటి చెల్లింపు సదుపాయంపై ఆధారపడుతుంది." : "Available payment methods are shown at checkout; options depend on current payment configuration."}</div>
          <div className="mt-2 text-[11px] opacity-75">{te ? "స్వయంచాలక పునరుద్ధరణ ప్రారంభించలేదు." : "Auto-renewal is not enabled."}</div>
          {SITE_CONFIG.supportConfigured ? (
            <div className="mt-3 flex flex-wrap gap-x-2 text-[11px] opacity-75">
              <span>{te ? "సహాయం:" : "Support:"}</span>
              {SITE_CONFIG.supportLink ? <a href={SITE_CONFIG.supportLink} target="_blank" rel="noopener noreferrer" className="underline">{te ? "సహాయం కోసం WhatsApp" : "Configured WhatsApp"}</a> : null}
              {SITE_CONFIG.supportPhoneDisplay ? <a href={`tel:${SITE_CONFIG.supportPhoneDisplay.replace(/[^\d+]/g, "")}`} className="underline">{SITE_CONFIG.supportPhoneDisplay}</a> : null}
              {SITE_CONFIG.supportEmail ? <a href={`mailto:${SITE_CONFIG.supportEmail}`} className="underline">{SITE_CONFIG.supportEmail}</a> : null}
            </div>
          ) : null}
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="font-bold text-[#7A0C2E] text-sm"><ScrollText aria-hidden="true" className="inline-block h-4 w-4 shrink-0 align-middle" /> {te ? "విధానాలు" : "Policies"}</div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <Link href="/refund" className="rounded-xl border border-gray-200 p-2.5 hover:border-[#7A0C2E]"><Undo2 aria-hidden="true" className="inline-block h-4 w-4 shrink-0 align-middle" /> {te ? "వాపసు" : "Refund"}</Link>
            <Link href="/terms" className="rounded-xl border border-gray-200 p-2.5 hover:border-[#7A0C2E]"><FileText aria-hidden="true" className="inline-block h-4 w-4 shrink-0 align-middle" /> {te ? "నిబంధనలు" : "Terms"}</Link>
            <Link href="/privacy" className="rounded-xl border border-gray-200 p-2.5 hover:border-[#7A0C2E]"><LockKeyhole aria-hidden="true" className="inline-block h-4 w-4 shrink-0 align-middle" /> {te ? "గోప్యత" : "Privacy"}</Link>
            <Link href="/safety" className="rounded-xl border border-gray-200 p-2.5 hover:border-[#7A0C2E]"><ShieldCheck aria-hidden="true" className="inline-block h-4 w-4 shrink-0 align-middle" /> {te ? "భద్రత" : "Safety"}</Link>
          </div>
          <div className="mt-3 text-[11px] text-gray-500 telugu">
            <AlertTriangle aria-hidden="true" className="inline-block h-4 w-4 shrink-0 align-middle" /> {te ? "ముందుగా డబ్బు అడిగితే జాగ్రత్త. వివరాలను స్వతంత్రంగా నిర్ధారించండి. అనుమానంగా ఉంటే ఫిర్యాదు చేయండి." : "Be cautious about requests for advance money. Verify details independently and report suspicious requests."}
          </div>
        </div>
      </section>

      {/* FAQ — 5 short */}
      <section className="mt-10">
        <h2 className="text-xl font-bold text-[#7A0C2E] telugu"><BadgeHelp aria-hidden="true" className="inline-block h-5 w-5 shrink-0 align-middle" /> {te ? "ప్రశ్నలు" : "FAQ"}</h2>
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
          {te ? "మొదటి 3 అభ్యర్థనలు ఉచితం. ఇప్పుడే మొదలుపెట్టండి" : "First 3 requests FREE — start now"}
        </div>
        <div className="mt-4 flex flex-wrap gap-3 justify-center">
          <Link href="/register" className="rounded-xl bg-[#7A0C2E] text-white px-5 py-2.5 font-bold text-sm">{te ? "ఉచితంగా నమోదు చేసుకోండి →" : "Register FREE →"}</Link>
          {SITE_CONFIG.supportLink ? (
            <a href={SITE_CONFIG.supportLink} target="_blank" rel="noopener noreferrer" className="rounded-xl bg-white/70 text-[#7A0C2E] px-5 py-2.5 font-bold text-sm border border-[#7A0C2E]/20">{te ? "WhatsApp లో అడగండి" : "Ask on WhatsApp"}</a>
          ) : null}
        </div>
      </section>
    </div>
  );
}
