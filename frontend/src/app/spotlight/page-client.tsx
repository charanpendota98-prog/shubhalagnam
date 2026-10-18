"use client";
/**
 * 🌟 /spotlight — paid sponsored profile placement
 * ==============================================================
 * Registered users can apply for a paid sponsored homepage placement.
 * Payment and media are reviewed; this is not an identity check or reach guarantee.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/lang";
import { Duo } from "@/lib/duo";
import { apiDisplayMessage, authHeaders, readApiJson } from "@/lib/api";

type Tier = {
  code: string;
  days: number;
  price: number;
  name_en: string;
  name_te: string;
  perks_en: string[];
  perks_te: string[];
  badge: string;
  badge_te?: string;
};

export default function SpotlightPromotionPage() {
  const { lang } = useLang();
  const te = lang === "te";

  const [tiers, setTiers] = useState<Record<string, Tier>>({});
  const [ratesLoading, setRatesLoading] = useState(true);
  const [paymentConfig, setPaymentConfig] = useState<{ mode: string; upi_id?: string } | null>(null);
  const [selectedPlan, setSelectedPlan] = useState("SPOT_7");
  const [tsapId, setTsapId] = useState("");
  const [headline, setHeadline] = useState("");
  const [pitchText, setPitchText] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [consentConfirmed, setConsentConfirmed] = useState(false);
  const [paymentRef, setPaymentRef] = useState("");

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      setTsapId(localStorage.getItem("tsap_id") || localStorage.getItem("tsap_last_id") || "");
    } catch { /* private browsing may block storage */ }

    Promise.all([
      fetch("/api/spotlight/rates").then((r) => r.ok ? readApiJson(r) : null),
      fetch("/api/pay/config").then((r) => r.ok ? readApiJson(r) : null),
    ]).then(([rateData, payData]) => {
      if (rateData?.success && rateData.tiers) setTiers(rateData.tiers);
      if (payData?.success) setPaymentConfig({ mode: String(payData.mode || "unconfigured"), upi_id: String(payData.upi_id || "") });
    }).catch(() => {
      setPaymentConfig({ mode: "unconfigured" });
    }).finally(() => setRatesLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setResult(null);

    const id = tsapId.trim().toUpperCase();
    if (!id) {
      setError(te ? "మీ రిజిస్టర్ చేసిన Profile ID నమోదు చేయండి." : "Enter your registered Profile ID.");
      return;
    }
    if (!headline.trim() || headline.trim().length > 140 || !pitchText.trim() || pitchText.trim().length > 600) {
      setError(te ? "హెడ్‌లైన్ మరియు పరిచయాన్ని నమోదు చేయండి (గరిష్ఠంగా 140 / 600 అక్షరాలు)." : "Enter a headline and introduction (maximum 140 / 600 characters).");
      return;
    }
    if (!consentConfirmed) {
      setError(te ? "ప్రొఫైల్ వివరాలు/ఎంచుకున్న వీడియో public sponsored placement లో చూపించడానికి మీ సమ్మతి అవసరం." : "Confirm that your profile details and selected video may appear in the sponsored placement.");
      return;
    }
    if (!/^\d{12}$/.test(paymentRef.trim())) {
      setError(te ? "మీ UPI యాప్ statement లోని నిజమైన 12-అంకెల UTR నమోదు చేయండి." : "Enter the actual 12-digit UTR from your UPI statement.");
      return;
    }
    if (paymentConfig?.mode !== "manual_upi" || !paymentConfig.upi_id) {
      setError(te ? "అధికారిక UPI చెల్లింపు వివరాలు ప్రస్తుతం అందుబాటులో లేవు. డబ్బు పంపవద్దు." : "Official UPI payment details are unavailable. Do not send money.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/spotlight/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          tsap_id: id,
          plan_code: selectedPlan,
          headline: headline.trim(),
          pitch_text: pitchText.trim(),
          video_url: videoUrl.trim(),
          consent_confirmed: consentConfirmed,
          payment_mode: "manual_upi",
          payment_ref: paymentRef.trim(),
        }),
      });

      const data = await readApiJson(res);
      if (res.ok && data.success) {
        setResult(data);
      } else {
        setError(data.detail || data.message || (te ? "దరఖాస్తు విఫలమైంది" : "Submission failed"));
      }
    } catch (err: any) {
      setError(te ? "కనెక్షన్ సమస్య — దయచేసి మళ్లీ ప్రయత్నించండి" : "Connection error — please retry");
    } finally {
      setLoading(false);
    }
  };

  const planObj = tiers[selectedPlan];
  const planPrice = Number(planObj?.price || 0);
  const paymentReady = paymentConfig?.mode === "manual_upi" && Boolean(paymentConfig.upi_id);

  return (
    <div className="min-h-dvh bg-[#FFF8E7] py-8 px-4 sm:px-6 lg:px-8 pb-36">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-bold text-maroon hover:underline">
            <span>←</span>
            <span>{te ? "హోమ్‌కి వెళ్లండి" : "Back to Home"}</span>
          </Link>
          <span className="text-[11px] font-bold bg-amber-200/60 text-maroon px-3 py-1 rounded-full border border-gold/40">
            ⭐ {te ? "ஸ்பான్సర్డ్ ప్రొఫైల్ ప్రమోషన్" : "Sponsored profile promotion"}
          </span>
        </div>

        {/* Hero Header */}
        <div className="maroon-gradient rounded-3xl p-6 sm:p-8 text-white text-center shadow-xl relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-gold/20 rounded-full blur-2xl pointer-events-none" />
          <div className="text-4xl mb-2">🌟</div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            <Duo en="Paid Sponsored Profile Placement" te="చెల్లింపు స్పాన్సర్డ్ ప్రొఫైల్ ప్రమోషన్" />
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-amber-100 max-w-2xl mx-auto leading-relaxed">
            {te
              ? "చెల్లింపు సరిపోల్చి, ప్రొఫైల్/మీడియా సమీక్ష ఆమోదించిన తర్వాతే ఎంచుకున్న కాలానికి సైట్‌లో sponsored placement చూపబడుతుంది. ఇది identity verification, reach, response లేదా match హామీ కాదు."
              : "An on-site sponsored placement may appear for the selected duration only after payment is matched and the profile/media review is approved. This is not identity verification and does not guarantee reach, responses, or a match."}
          </p>
        </div>

        {/* Success Confirmation State */}
        {result ? (
          <div className="bg-white rounded-3xl p-8 border border-emerald-300 shadow-xl text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl mx-auto">
              ✓
            </div>
            <h2 className="text-xl font-extrabold text-gray-900">
              {te ? "ధన్యవాదాలు! మీ దరఖాస్తు నమోదైంది 🎉" : "Promotion Application Submitted! 🎉"}
            </h2>
            <p className="text-sm leading-relaxed text-gray-600 max-w-md mx-auto">
              {te
                ? (result.message_telugu || "మీ దరఖాస్తు payment మరియు profile/media review కోసం వేచి ఉంది. ఆమోదం వచ్చే వరకు ఇది public లో కనిపించదు.")
                : apiDisplayMessage({ message_en: result.message_en }, false, "Your application is awaiting payment and profile/media review. It will not appear publicly until approved.")}
            </p>
            <div className="bg-amber-50 rounded-2xl p-4 max-w-sm mx-auto text-left text-xs text-maroon border border-amber-200 space-y-1">
              <div><b>Promo ID:</b> {result.item?.promo_id}</div>
              <div><b>Profile ID:</b> {result.item?.tsap_id}</div>
              <div><b>{te ? "ప్లాన్" : "Plan"}:</b> {te
                ? (result.item?.plan_name_te || result.item?.plan_name_en)
                : apiDisplayMessage({ message_en: result.item?.plan_name_en }, false, "Sponsored placement")}</div>
              <div><b>{te ? "స్థితి" : "Status"}:</b> ⏳ {result.item?.status === "pending_review" ? (te ? "సమీక్షలో ఉంది" : "Pending review") : result.item?.status}</div>
            </div>
            <div className="pt-4 flex justify-center gap-3">
              <Link href="/" className="px-6 py-2.5 rounded-full maroon-gradient text-white text-xs font-bold shadow-md">
                {te ? "హోమ్‌పేజీ చూడండి" : "Go to Homepage"}
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Form Column */}
            <form onSubmit={handleSubmit} className="lg:col-span-2 bg-white rounded-3xl p-6 sm:p-8 border border-gold/30 shadow-md space-y-6">
              
              {error && (
                <div className="bg-red-50 border border-red-300 text-red-700 p-3.5 rounded-2xl text-xs font-semibold">
                  {error}
                </div>
              )}

              {/* Step 1: Select Plan */}
              <div>
                <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider mb-2">
                  1. {te ? "ప్లాన్ ఎంచుకోండి" : "Select Promotion Plan"}
                </label>
                {ratesLoading ? (
                  <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600" role="status">{te ? "ప్లాన్‌లను లోడ్ చేస్తున్నాం…" : "Loading current plans…"}</p>
                ) : Object.keys(tiers).length ? (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {Object.values(tiers).map((plan) => (
                      <button key={plan.code} type="button" onClick={() => setSelectedPlan(plan.code)}
                        aria-pressed={selectedPlan === plan.code}
                        className={`min-w-0 rounded-2xl border p-4 text-left transition-all ${selectedPlan === plan.code ? "border-maroon bg-rose-50/60 shadow-md ring-2 ring-maroon/20" : "border-gray-200 hover:border-gold"}`}>
                        <div className="break-words font-extrabold text-sm text-maroon">{te
                          ? (plan.badge_te || plan.badge || plan.name_te)
                          : apiDisplayMessage({ message_en: plan.badge }, false, apiDisplayMessage({ message_en: plan.name_en }, false, "Promotion plan"))}</div>
                        <div className="mt-1 text-xs font-semibold text-gray-800">{plan.days} {te ? "రోజులు" : "days"} · ₹{plan.price}</div>
                        <ul className="mt-2 space-y-1 text-[11px] leading-relaxed text-gray-600">
                          {(te ? plan.perks_te || [] : (plan.perks_en || []).map((perk) => apiDisplayMessage({ message_en: perk }, false, "")).filter(Boolean)).map((perk) => <li key={perk}>• {perk}</li>)}
                        </ul>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900" role="alert">{te ? "ప్రస్తుతం ప్లాన్ వివరాలు అందుబాటులో లేవు." : "Plan details are currently unavailable."}</p>
                )}
              </div>

              {/* Step 2: User Details */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    2. {te ? "మీ రిజిస్టర్డ్ TSAP ID" : "Your Registered TSAP ID"} <span className="text-red-500">*</span>
                  </label>
                  <input aria-label={te ? "రిజిస్టర్ చేసిన Profile ID" : "Registered Profile ID"}
                    type="text"
                    required
                    placeholder={te ? "రిజిస్టర్ చేసిన Profile ID" : "Registered Profile ID"}
                    value={tsapId}
                    onChange={(e) => setTsapId(e.target.value.toUpperCase())}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:border-maroon focus:ring-1 focus:ring-maroon outline-none"
                  />
                  <span className="text-[11px] text-gray-500 mt-1 block">
                    {te ? "మీరు ఇంకా రిజిస్టర్ కాకపోతే, " : "Not registered yet? "}
                    <Link href="/register" className="text-maroon underline font-semibold">
                      {te ? "ఇక్కడ ఉచితంగా రిజిస్టర్ అవ్వండి" : "Register here FREE"}
                    </Link>
                  </span>
                </div>

                {/* Step 3: Custom Pitch & Headline */}
                <div>
                  <label htmlFor="spotlight-headline" className="block text-xs font-bold text-gray-700 mb-1">
                    3. {te ? "హెడ్‌లైన్ (గరిష్ఠం 140 అక్షరాలు)" : "Headline (maximum 140 characters)"} <span className="text-red-600">*</span>
                  </label>
                  <input id="spotlight-headline" type="text" required maxLength={140}
                    placeholder={te ? "మీరు పంచుకోవాలనుకునే చిన్న పరిచయం" : "A short headline in your own words"}
                    value={headline} onChange={(e) => setHeadline(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-maroon focus:ring-1 focus:ring-maroon" />
                  <p className="text-right text-[10px] text-slate-500">{headline.length}/140</p>
                </div>

                <div>
                  <label htmlFor="spotlight-pitch" className="block text-xs font-bold text-gray-700 mb-1">
                    4. {te ? "మీ పరిచయం మరియు అంచనాలు (గరిష్ఠం 600 అక్షరాలు)" : "Your introduction and expectations (maximum 600 characters)"} <span className="text-red-600">*</span>
                  </label>
                  <textarea id="spotlight-pitch" rows={4} required maxLength={600}
                    placeholder={te ? "మీ గురించి, కుటుంబం గురించి, భాగస్వామిలో కోరుకునే విషయాలను మీ మాటల్లో రాయండి." : "In your own words, share about yourself, your family, and what you hope to find."}
                    value={pitchText} onChange={(e) => setPitchText(e.target.value)}
                    className="w-full resize-y rounded-xl border border-gray-300 px-4 py-2.5 text-sm leading-relaxed outline-none focus:border-maroon focus:ring-1 focus:ring-maroon" />
                  <p className="text-right text-[10px] text-slate-500">{pitchText.length}/600</p>
                </div>

                {/* Step 4: Media */}
                <div className="space-y-3">
                  <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-700">
                    {te ? "మీ existing profile photo approved మరియు public గా ఉంటే అదే వాడవచ్చు. Private లేదా review కాని photo చూపించము; కొత్త photo ఉంటే ముందుగా profile లో upload చేసి review చేయించండి." : "If your existing profile photo is approved and public, it may be used. Private or unreviewed photos are not shown; upload any new photo to your profile and have it reviewed first."}
                  </p>
                  <div>
                    <label htmlFor="spotlight-video" className="block text-xs font-bold text-gray-700 mb-1">
                      🎥 {te ? "YouTube / Shorts వీడియో లింక్ (ఐచ్ఛికం)" : "YouTube / Shorts video link (optional)"}
                    </label>
                    <input id="spotlight-video" type="url" inputMode="url" autoComplete="url"
                      placeholder="https://youtube.com/shorts/..." value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:border-maroon outline-none" />
                    <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{te ? "YouTube watch/Shorts/embed లింకులు మాత్రమే అనుమతించబడతాయి." : "Only HTTPS YouTube watch, Shorts, or embed links are accepted."}</p>
                  </div>
                  <div className="flex items-start gap-2 rounded-xl border border-maroon/20 bg-rose-50/60 p-3 text-xs leading-relaxed text-slate-800">
                    <input id="spotlight-public-consent" type="checkbox" required checked={consentConfirmed}
                      onChange={(event) => setConsentConfirmed(event.target.checked)}
                      className="mt-0.5 h-4 w-4 shrink-0 accent-[#7A0C2E]" />
                    <label htmlFor="spotlight-public-consent">
                      {te ? "నా profile ID, పేరు/వివరాలు, headline, పరిచయం మరియు సమర్పించిన media ను payment, profile/media review ఆమోదించిన తర్వాత ఎంచుకున్న కాలానికి public sponsored placement లో చూపించడానికి నేను సమ్మతిస్తున్నాను. Public content ను ఇతరులు copy చేయవచ్చని, ఇది identity verification లేదా reach/match హామీ కాదని అర్థం చేసుకున్నాను." : "I consent to showing my profile ID, name/details, headline, introduction, and submitted media in a public sponsored placement for the selected period after payment and profile/media review are approved. I understand others may copy public content and that this is not identity verification or a reach/match guarantee."}
                    </label>
                  </div>
                </div>

                {/* Step 5: Payment details */}
                <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold text-maroon">💰 {te ? "ప్లాన్ మొత్తం" : "Plan amount"}</span>
                    <span className="text-base font-extrabold text-maroon">{planObj ? `₹${planPrice}` : "—"}</span>
                  </div>
                  {paymentReady ? (
                    <>
                      <div className="space-y-2 text-xs text-gray-700">
                        <p>{te ? "చెల్లింపు కోసం ప్రస్తుత merchant UPI ID:" : "Configured merchant UPI ID for payment:"}</p>
                        <div className="flex min-w-0 flex-col gap-2 rounded-xl border border-amber-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
                          <code className="min-w-0 break-all font-bold text-maroon">{paymentConfig?.upi_id}</code>
                          <a className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg bg-maroon px-3 py-2 text-center font-bold text-white"
                            href={`upi://pay?pa=${encodeURIComponent(paymentConfig?.upi_id || "")}&pn=${encodeURIComponent("Mana Vivaha")}&am=${planPrice}&cu=INR&tn=${encodeURIComponent(`Spotlight ${selectedPlan}`)}`}>
                            {te ? `UPI యాప్ తెరవండి · ₹${planPrice}` : `Open UPI app · ₹${planPrice}`}
                          </a>
                        </div>
                        <p className="leading-relaxed text-slate-600">
                          {te ? "చెల్లింపు పూర్తయ్యాక UPI statement లోని నిజమైన 12-అంకెల UTR నమోదు చేయండి. UTR సమర్పణ మాత్రమే payment confirmation కాదు; admin బ్యాంక్ స్టేట్‌మెంట్‌తో సరిపోల్చాలి." : "After paying, enter the actual 12-digit UTR from your UPI statement. Submitting a UTR is not payment confirmation; an administrator must match it against the bank statement."}
                        </p>
                      </div>
                      <label htmlFor="spotlight-utr" className="block text-xs font-bold text-gray-700">
                        {te ? "నిజమైన 12-అంకెల UTR" : "Actual 12-digit UTR"} <span className="text-red-600">*</span>
                      </label>
                      <input id="spotlight-utr" type="text" inputMode="numeric" autoComplete="off" maxLength={12} required
                        placeholder="12-digit UTR" value={paymentRef}
                        onChange={(e) => setPaymentRef(e.target.value.replace(/\D/g, "").slice(0, 12))}
                        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 font-mono text-sm outline-none focus:border-maroon" />
                    </>
                  ) : (
                    <div className="rounded-xl border border-amber-300 bg-white p-3 text-xs leading-relaxed text-amber-950" role="alert">
                      {te ? "ఈ ప్రమోషన్‌కు UPI payment ప్రస్తుతం configure కాలేదు. అధికారిక చెల్లింపు వివరాలు కనిపించే వరకు డబ్బు పంపవద్దు." : "UPI payment for this promotion is not configured. Do not send money until an official destination is shown."}
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <button type="submit" disabled={loading || ratesLoading || !planObj || !paymentReady}
                className="w-full rounded-2xl maroon-gradient py-3.5 text-sm font-extrabold text-white shadow-brand transition-all hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50">
                {loading ? (te ? "నమోదు చేస్తున్నాం…" : "Submitting…") : !paymentReady ? (te ? "చెల్లింపు అందుబాటులో లేదు" : "Payment unavailable") : `${te ? "స్పాట్‌లైట్ దరఖాస్తు సమర్పించండి" : "Submit spotlight application"}${planObj ? ` · ₹${planPrice}` : ""}`}
              </button>
            </form>

            {/* Live Preview Sidebar */}
            <div className="space-y-4">
              <div className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                👁️ {te ? "హోమ్‌పేజీ కార్డ్ ప్రివ్యూ:" : "Homepage card preview:"}
              </div>

              <div className="overflow-hidden rounded-3xl border border-amber-300 bg-white shadow-lg">
                <div className="relative flex h-48 items-center justify-center overflow-hidden bg-gradient-to-br from-rose-100 via-amber-50 to-slate-100">
                  <div className="max-w-xs px-4 text-center text-maroon">
                    <div className="text-4xl" aria-hidden="true">💍</div>
                    <div className="mt-1 text-xs font-semibold">{te ? "అనుమతించిన profile photo ఉంటే review తర్వాత ఉపయోగిస్తాం" : "An approved public profile photo may be used after review"}</div>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" aria-hidden="true" />
                  <div className="absolute left-3 right-3 top-3">
                    <span className="inline-block max-w-full break-words rounded-full bg-amber-300 px-2.5 py-1 text-[9px] font-black uppercase text-maroon">
                      {te ? (planObj?.badge_te || "స్పాన్సర్డ్ ప్రొఫైల్") : (planObj?.badge || "Sponsored profile")}
                    </span>
                  </div>
                  <div className="absolute bottom-3 left-3 right-3 text-white">
                    <div className="break-words text-sm font-bold">{te ? "మీ రిజిస్టర్ చేసిన ప్రొఫైల్" : "Your registered profile"}</div>
                    <div className="text-[10px] text-amber-100">{te ? "ఆమోదం తర్వాత మాత్రమే public అవుతుంది" : "Shown publicly only after review"}</div>
                  </div>
                </div>

                <div className="space-y-3 p-4">
                  <div className="break-words rounded-lg bg-amber-50 p-2 text-xs font-bold leading-relaxed text-maroon">
                    {headline || (te ? "మీ హెడ్‌లైన్ ప్రివ్యూ" : "Your headline preview")}
                  </div>
                  <p className="min-h-16 break-words rounded-xl bg-slate-50 p-3 text-[11px] leading-relaxed text-gray-600">
                    {pitchText || (te ? "మీ పరిచయం ఇక్కడ కనిపిస్తుంది." : "Your introduction will appear here.")}
                  </p>
                  <p className="text-[10px] leading-relaxed text-slate-500">
                    {te ? "ఇది preview మాత్రమే. ఆమోదానికి ముందు నిజమైన profile వివరాలు, మీడియా పరిశీలిస్తారు." : "Preview only. Real profile details and media are reviewed before approval."}
                  </p>
                </div>
              </div>

              {/* Trust Box */}
              <div className="bg-white/80 rounded-2xl p-4 border border-gold/30 text-xs text-gray-700 space-y-2">
                <div className="font-bold text-maroon">🛡️ {te ? "సమీక్ష ప్రక్రియ" : "Review process"}</div>
                <div className="text-[11px] leading-relaxed text-gray-600">
                  {te
                    ? "UTR ను బ్యాంక్ స్టేట్‌మెంట్‌తో సరిపోల్చి, మీడియా/వివరాలను సమీక్షించిన తర్వాత మాత్రమే దరఖాస్తు ఆమోదించబడుతుంది. సమయం మారవచ్చు."
                    : "Applications are approved only after the UTR is matched to the bank statement and the submitted details/media are reviewed. Review timing may vary."}
                </div>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
