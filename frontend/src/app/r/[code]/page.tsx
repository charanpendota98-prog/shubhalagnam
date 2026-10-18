"use client";

import { readApiJson } from "@/lib/api";
/**
 * 🔗 /r/<code> — Referral landing (smart tracking)
 * Click ni API ki pampistundi (funnel), code validate chestundi, referrer peru + bonus chupistundi,
 * tarvata /register?ref=CODE ki redirect (auto-lock + referee bonus credit).
 */
import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useLang } from "@/lib/lang";

export default function ReferralLandingPage() {
  const { lang } = useLang();
  const te = lang === "te";
  const params = useParams();
  const search = useSearchParams();
  const router = useRouter();
  const code = String(params?.code || "").toUpperCase();
  // 💎 `inv` is one person's invite token. Carrying it through the click and
  // into registration is what lets a referrer see "sent → opened → joined"
  // for a named person instead of a single anonymous counter.
  const inv = String(search?.get("inv") || "").trim().toUpperCase().slice(0, 16);
  const [info, setInfo] = useState<any>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!code) return;
    localStorage.setItem("tsap_ref_from_link", code);          // backup (register page kooda chaduvutundi)
    try { sessionStorage.setItem("tsap_click_fired", code); } catch { /* ignore */ }  // 🌊 W20 dedupe
    const inviteQuery = inv ? `&inv=${encodeURIComponent(inv)}` : "";
    fetch(`/api/referral/click/${code}?source=link${inviteQuery}`, { method: "POST" })
      .then((r) => readApiJson(r))
      .then((d) => setInfo(d))
      .catch(() => { })
      .finally(() => setChecked(true));
  }, [code, inv]);

  const valid = info?.valid_code;
  const name = info?.referrer_name;

  // valid code ayithe 1.2 sec lo register ki auto-redirect (user experience smooth)
  useEffect(() => {
    if (!checked) return;
    if (valid !== false) {
      const t = setTimeout(() => router.replace(
        `/register?ref=${code}${inv ? `&inv=${encodeURIComponent(inv)}` : ""}`), 1600);
      return () => clearTimeout(t);
    }
  }, [checked, valid, code, inv, router]);

  return (
    <div className="min-h-dvh bg-[#FFF8E7] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-[1.5rem] shadow-lg p-6 text-center">
        <div className="w-16 h-16 maroon-gradient rounded-full flex items-center justify-center text-white text-3xl mx-auto">
          {valid === false ? "⚠️" : "🎁"}
        </div>

        {!checked && <div className="mt-4 text-sm text-gray-500">{te ? "Code check చేస్తున్నాం…" : "Checking code…"}</div>}

        {checked && valid && (
          <>
            <h1 className={`mt-4 font-extrabold text-xl text-[#7A0C2E] ${te ? "telugu" : ""}`} lang={te ? "te-IN" : "en-IN"}>
              {te ? <>{name ? `${name} గారు` : "మీ friend"} ద్వారా వచ్చారు! 🙏</> : <>You came through {name || "your friend"}! 🙏</>}
            </h1>
            <p className={`mt-2 text-sm text-gray-600 ${te ? "telugu" : ""}`} lang={te ? "te-IN" : "en-IN"}>
              {te ? <>Code: <b className="text-[#7A0C2E]">{code}</b> — register చేస్తే మీ account కి{" "}</> : <>Code: <b className="text-[#7A0C2E]">{code}</b> — when you register, your account receives{" "}</>}
              <b className="text-green-700">+{info?.bonus_credits || 1} credit FREE</b> 🎁
            </p>
            <div className="mt-4 rounded-2xl bg-[#FFF8E7] border border-[#D4AF37]/40 p-3 text-left text-[11px] text-[#7A0C2E] space-y-1">
              <div>{te ? <>✅ మొదటి <b>3 requests FREE</b> (+1 bonus credit మీ friend నుంచి)</> : <>✅ First <b>3 requests FREE</b> (+1 bonus credit from your friend)</>}</div>
              <div>{te ? "✅ ₹99 → 5 requests · ₹199 → 12 · ₹299 → 25 · ₹499 → 50" : "✅ ₹99 → 5 requests · ₹199 → 12 · ₹299 → 25 · ₹499 → 50"}</div>
              <div>{te ? "✅ Approval తర్వాత configured destination కు post queue కావచ్చు; delivery హామీ కాదు" : "✅ After approval, a post may be queued for a configured destination; delivery is not guaranteed"}</div>
              <div>{te ? "✅ Private-photo setting ను గౌరవించే outputs లో photo దాచబడుతుంది; owner accept చేసిన తర్వాత accepted-request account views లో contact access వస్తుంది. Notification delivery హామీ లేదు." : "✅ The private-photo setting suppresses photos only in outputs that honor it; owner acceptance grants contact access in accepted-request account views. Notification delivery is not guaranteed."}</div>
            </div>
            <a href={`/register?ref=${code}${inv ? `&inv=${encodeURIComponent(inv)}` : ""}`}
              className="mt-5 block w-full py-3 maroon-gradient text-white rounded-full font-bold text-sm">
              {te ? "🚀 Register చెయ్యండి (ref auto-lock)" : "🚀 Register with this referral code"}
            </a>
            <div className="text-[11px] text-gray-400 mt-2">{te ? "2 sec లో automatic గా register page కి వెళ్తుంది…" : "You will be redirected to registration in 2 seconds…"}</div>
          </>
        )}

        {checked && valid === false && (
          <>
            <h1 className="mt-4 font-extrabold text-lg text-[#7A0C2E]">{te ? "ఈ referral code దొరకలేదు" : "Referral code not found"}</h1>
            <p className={`mt-2 text-sm text-gray-600 ${te ? "telugu" : ""}`} lang={te ? "te-IN" : "en-IN"}>
{te ? <>Code <b>{code}</b> valid కాదు (లేదా పెద్ద/చిన్న letters తప్పు). పర్వాలేదు — మీరు normal గా register అవ్వచ్చు,
              మీ సొంత referral link కూడా automatic గా వస్తుంది.</> : <>Code <b>{code}</b> is not valid (or letter case is wrong). No problem — you can register normally,
              your own referral link comes automatically.</>}
            </p>
            <a href="/register" className="mt-5 block w-full py-3 maroon-gradient text-white rounded-full font-bold text-sm">
              {te ? "Register చెయ్యండి →" : "Register →"}
            </a>
          </>
        )}

        <div className="mt-4 text-[11px] text-gray-400">
          {te ? "మన వివాహ · manavivaha.in · ₹99 సంబంధం" : "మన వివాహ · manavivaha.in · ₹99 Sambandham"}
        </div>
      </div>
    </div>
  );
}
