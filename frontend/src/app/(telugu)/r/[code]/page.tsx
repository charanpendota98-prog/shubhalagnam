"use client";

import "@/components/partner-workspace.css";

import { readApiJson } from "@/lib/api";
/**
 * 🔗 /r/<code> — Referral landing (smart tracking)
 * Click ni API ki pampistundi (funnel), code validate chestundi, referrer peru + bonus chupistundi,
 * tarvata /register?ref=CODE ki redirect (auto-lock + referee bonus credit).
 */
import { useEffect, useState } from "react";
import {useParams,useSearchParams} from "next/navigation";
import { useLang } from "@/lib/lang";
import { Gift, TriangleAlert, Check } from "lucide-react";

export default function ReferralLandingPage() {
  const { lang } = useLang();
  const te = lang === "te";
  const params = useParams();
  const search = useSearchParams();
  const router = useLocaleRouter();
  const code = String(params?.code || "").toUpperCase();
  // 💎 `inv` is one person's invite token. Carrying it through the click and
  // into registration is what lets a referrer see "sent → opened → joined"
  // for a named person instead of a single anonymous counter.
  const inv = String(search?.get("inv") || "").trim().toUpperCase().slice(0, 16);
  const campaign = String(search?.get("campaign") || "").trim();
  const campaignQuery = /^[A-Za-z0-9_-]{24}$/.test(campaign) ? `&campaign=${encodeURIComponent(campaign)}` : "";
  const [info, setInfo] = useState<{valid_code:boolean;referrer_name:string;bonus_credits:number}|null>(null);
  const [checked, setChecked] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!code) return;
    let active = true; setChecked(false); setFailed(false); setInfo(null);
    try { sessionStorage.setItem("tsap_click_fired", code); } catch { /* ignore */ }  // 🌊 W20 dedupe
    const inviteQuery = inv ? `&inv=${encodeURIComponent(inv)}` : "";
    fetch(`/api/referral/click/${code}?source=link${inviteQuery}${campaignQuery}`, { method: "POST" })
      .then(async r => { const d = await readApiJson(r); if (!r.ok || d?.success !== true || typeof d.valid_code !== "boolean" || (d.valid_code && (typeof d.referrer_name !== "string" || !Number.isSafeInteger(d.bonus_credits) || d.bonus_credits < 0))) throw new Error("Unavailable"); return d; })
      .then(d => { if (active) { setInfo(d); try { if (d.valid_code) localStorage.setItem("tsap_ref_from_link", code); else if (localStorage.getItem("tsap_ref_from_link") === code) localStorage.removeItem("tsap_ref_from_link"); } catch {} } })
      .catch(() => { if (active) setFailed(true); })
      .finally(() => { if (active) setChecked(true); });
    return () => { active = false; };
  }, [code, inv, campaignQuery, attempt]);

  const valid = info?.valid_code;
  const name = info?.referrer_name;
  const bonus = info?.bonus_credits ?? 0;

  // valid code ayithe 1.2 sec lo register ki auto-redirect (user experience smooth)
  useEffect(() => {
    if (!checked) return;
    if (valid === true) {
      const t = setTimeout(() => router.replace(
        `/register?ref=${code}${inv ? `&inv=${encodeURIComponent(inv)}` : ""}${campaignQuery}`), 1600);
      return () => clearTimeout(t);
    }
  }, [checked, valid, code, inv, campaignQuery, router]);

  return (
    <div className="mv-partner-workspace min-h-dvh bg-[#FFF8E7] flex items-center justify-center p-4 pb-24 sm:pb-8">
      <div className="w-full max-w-md bg-white rounded-[1.5rem] shadow-lg p-6 text-center">
        <div className="w-16 h-16 maroon-gradient rounded-full flex items-center justify-center text-white text-3xl mx-auto">
          {valid === false || failed ? <TriangleAlert className="w-7 h-7" aria-hidden="true" /> : <Gift className="w-7 h-7" aria-hidden="true" />}
        </div>

        {(!checked || failed) && <h1 className="mt-4 text-xl font-bold text-maroon">{te ? "ఆహ్వాన సంకేతం" : "Referral code"}</h1>}
        {failed && <div role="alert" className="mt-3 space-y-3"><p>{te ? "ఆహ్వాన సంకేతాన్ని నిర్ధారించలేకపోయాం. నమోదు పేజీకి మళ్లించలేదు." : "The code could not be confirmed. You have not been redirected."}</p><button type="button" onClick={() => setAttempt(n => n + 1)} className="font-bold underline">{te ? "మళ్లీ ప్రయత్నించండి" : "Try again"}</button><LocaleAnchor href="/register" className="block underline">{te ? "సంకేతం లేకుండా నమోదు" : "Register without a code"}</LocaleAnchor></div>}
        {!checked && <div role="status" className="mt-4 text-sm text-gray-500">{te ? "ఆహ్వాన సంకేతాన్ని తనిఖీ చేస్తున్నాం…" : "Checking code…"}</div>}

        {checked && valid && (
          <>
            <h1 className={`mt-4 font-extrabold text-xl text-[#7A0C2E] ${te ? "telugu" : ""}`} lang={te ? "te-IN" : "en-IN"}>
              {te ? <>{name ? `${name} గారు` : "మీ స్నేహితులు"} ద్వారా వచ్చారు!</> : <>You came through {name || "your friend"}!</>}
            </h1>
            <p className={`mt-2 text-sm text-gray-600 ${te ? "telugu" : ""}`} lang={te ? "te-IN" : "en-IN"}>
              {te ? <>సంకేతం: <b className="text-[#7A0C2E]">{code}</b>. నమోదు చేసుకుంటే మీ ఖాతాకు{" "}</> : <>Code: <b className="text-[#7A0C2E]">{code}</b>. When you register, your account receives{" "}</>}
              <b className="text-green-700">{te ? `${bonus} అదనపు పరిచయాలు ఉచితం` : `+${bonus} ${bonus === 1 ? "credit" : "credits"} FREE`}</b>
            </p>
            <ul className="mt-4 rounded-2xl bg-[#FFF8E7] border border-[#D4AF37]/40 p-3 text-left text-xs text-[#7A0C2E] space-y-2">
              {[
                te ? <>మొదటి <b>3 పరిచయ అభ్యర్థనలు ఉచితం</b> ({bonus} అదనపు పరిచయాలు)</> : <>First <b>3 requests FREE</b> ({bonus} bonus {bonus === 1 ? "credit" : "credits"} from your friend)</>,
                te ? "₹99 కు 5 అభ్యర్థనలు · ₹199 కు 12 · ₹299 కు 25 · ₹499 కు 50" : "₹99 → 5 requests · ₹199 → 12 · ₹299 → 25 · ₹499 → 50",
                te ? "ఆమోదం తర్వాత, ముందుగా ఎంచుకున్న గమ్యస్థానానికి ప్రచురణ కోసం అభ్యర్థన వేచి ఉండవచ్చు. చేరుతుందని హామీ లేదు." : "After approval, a post may be queued for a configured destination; delivery is not guaranteed",
                te ? "వ్యక్తిగత ఫోటో గోప్యతను పాటించే ఫలితాల్లో మాత్రమే ఫోటో దాచబడుతుంది. ప్రొఫైల్ యజమాని ఆమోదించిన తర్వాత, అంగీకరించిన అభ్యర్థనల విభాగంలో సంప్రదింపు వివరాలు చూడవచ్చు. నోటిఫికేషన్ చేరుతుందని హామీ లేదు." : "The private-photo setting suppresses photos only in outputs that honor it; owner acceptance grants contact access in accepted-request account views. Notification delivery is not guaranteed."
              ].map((text, index) => <li key={index} className="flex items-start gap-2"><Check className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" /><span>{text}</span></li>)}
            </ul>
            <LocaleAnchor href={`/register?ref=${code}${inv ? `&inv=${encodeURIComponent(inv)}` : ""}${campaignQuery}`}
              className="mt-5 block w-full py-3 maroon-gradient text-white rounded-full font-bold text-sm">
              {te ? "ఈ ఆహ్వాన సంకేతంతో నమోదు చేసుకోండి" : "Register with this referral code"}
            </LocaleAnchor>
            <div className="text-[11px] text-gray-400 mt-2">{te ? "2 సెకన్లలో నమోదు పేజీకి మళ్లిస్తాం…" : "You will be redirected to registration in 2 seconds…"}</div>
          </>
        )}

        {checked && valid === false && (
          <>
            <h1 className="mt-4 font-extrabold text-lg text-[#7A0C2E]">{te ? "ఈ ఆహ్వాన సంకేతం దొరకలేదు" : "Referral code not found"}</h1>
            <p className={`mt-2 text-sm text-gray-600 ${te ? "telugu" : ""}`} lang={te ? "te-IN" : "en-IN"}>
{te ? <>ఆహ్వాన సంకేతం <b>{code}</b> చెల్లదు. మీరు సంకేతం లేకుండా నమోదు చేసుకోవచ్చు.
              మీ సొంత ఆహ్వాన లింకు కూడా అందుతుంది.</> : <>Code <b>{code}</b> is not valid. You can register without a code.
              Your own referral link comes automatically.</>}
            </p>
            <LocaleAnchor href="/register" className="mt-5 block w-full py-3 maroon-gradient text-white rounded-full font-bold text-sm">
              {te ? "నమోదు చేసుకోండి →" : "Register →"}
            </LocaleAnchor>
          </>
        )}

        <div className="mt-4 text-[11px] text-gray-400">
          {te ? "మన వివాహ · manavivaha.in · ₹99 సంబంధం" : "మన వివాహ · manavivaha.in · ₹99 Sambandham"}
        </div>
      </div>
    </div>
  );
}

import {useLocaleRouter} from "@/lib/locale-navigation";

import LocaleAnchor from "@/components/LocaleAnchor";
