"use client";
/**
 * 🌟 /spotlight — PROMOTE YOUR PROFILE ("Profiles of the Day")
 * ==============================================================
 * Registered users can boost their profile to the top of the homepage & channels.
 * Photo / Video media upload + custom pitch + UPI payment + admin review.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/lang";
import { Duo } from "@/lib/duo";
import { authHeaders } from "@/lib/api";

type Tier = {
  code: string;
  days: number;
  price: number;
  name_en: string;
  name_te: string;
  perks_te: string[];
  badge: string;
};

export default function SpotlightPromotionPage() {
  const { lang } = useLang();
  const te = lang === "te";

  const [tiers, setTiers] = useState<Record<string, Tier>>({});
  const [selectedPlan, setSelectedPlan] = useState("SPOT_7");
  const [tsapId, setTsapId] = useState("");
  const [headline, setHeadline] = useState("");
  const [pitchText, setPitchText] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [paymentMode, setPaymentMode] = useState("upi");
  const [paymentRef, setPaymentRef] = useState("");
  const [contactOpt, setContactOpt] = useState("send_interest");

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    // Check localStorage for logged in user
    try {
      const saved = localStorage.getItem("tsap_last_id") || "";
      if (saved) setTsapId(saved);
      else {
        const profiles = JSON.parse(localStorage.getItem("tsap_profiles") || "[]");
        if (profiles[0]?.id) setTsapId(profiles[0].id);
      }
    } catch {}

    // Fetch live tiers
    fetch("/api/spotlight/rates")
      .then((r) => r.json())
      .then((d) => {
        if (d?.success && d.tiers) setTiers(d.tiers);
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setResult(null);

    const id = tsapId.trim().toUpperCase();
    if (!id) {
      setError(te ? "⚠️ దయచేసి మీ TSAP ID ని ఇవ్వండి" : "⚠️ Please enter your TSAP ID");
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
          photo_url: photoUrl.trim(),
          video_url: videoUrl.trim(),
          payment_mode: paymentMode,
          payment_ref: paymentRef.trim() || `UPI-${Date.now().toString().slice(-6)}`,
          contact_opt: contactOpt,
        }),
      });

      const data = await res.json();
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

  const planObj = tiers[selectedPlan] || {
    price: selectedPlan === "SPOT_30" ? 499 : selectedPlan === "SPOT_7" ? 199 : 99,
    days: selectedPlan === "SPOT_30" ? 30 : selectedPlan === "SPOT_7" ? 7 : 3,
  };

  return (
    <main className="min-h-screen bg-[#FFF8E7] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-bold text-maroon hover:underline">
            <span>←</span>
            <span>{te ? "హోమ్‌కి వెళ్లండి" : "Back to Home"}</span>
          </Link>
          <span className="text-[11px] font-bold bg-amber-200/60 text-maroon px-3 py-1 rounded-full border border-gold/40">
            ⚡ 10x Profile Reach & Responses
          </span>
        </div>

        {/* Hero Header */}
        <div className="maroon-gradient rounded-3xl p-6 sm:p-8 text-white text-center shadow-xl relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-gold/20 rounded-full blur-2xl pointer-events-none" />
          <div className="text-4xl mb-2">🌟</div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            <Duo en="Promote Your Profile — 'Profiles of the Day'" te="మీ ప్రొఫైల్‌ను ప్రమోట్ చేసుకోండి — నేటి విశేష ప్రొఫైల్" />
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-amber-100 max-w-2xl mx-auto leading-relaxed">
            {te
              ? "మీ ఫోటో మరియు వీడియో పరిచయంతో హోమ్‌పేజీ టాప్‌లో, మ్యాచెస్ సైడ్‌బార్‌లో మరియు 52+ ఛానళ్లలో ప్రత్యేకంగా కనిపించండి. త్వరితగతిన మంచి సంబంధం కుదుర్చుకోండి!"
              : "Feature your profile with high-res photo and video intro at the top of homepage, matches section, and Telegram/WhatsApp channels for maximum alliance proposals."}
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
            <p className="text-sm text-gray-600 max-w-md mx-auto">
              {result.message_telugu || (te ? "అడ్మిన్ టీమ్ వివరాలు పరిశీలించి 2 గంటల్లో లైవ్ చేస్తుంది." : "Our admin team will review media and activate your spotlight within 2 hours.")}
            </p>
            <div className="bg-amber-50 rounded-2xl p-4 max-w-sm mx-auto text-left text-xs text-maroon border border-amber-200 space-y-1">
              <div><b>Promo ID:</b> {result.item?.promo_id}</div>
              <div><b>User ID:</b> {result.item?.tsap_id}</div>
              <div><b>Plan:</b> {result.item?.plan_name_te || result.item?.plan_name_en}</div>
              <div><b>Status:</b> ⏳ {result.item?.status}</div>
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
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { code: "SPOT_3", days: 3, price: 99, label: "3 Days", badge: "⚡ ₹99", desc: te ? "హోమ్ & మ్యాచెస్ బూస్ట్" : "Home & Matches" },
                    { code: "SPOT_7", days: 7, price: 199, label: "7 Days", badge: "🌟 ₹199 (Best)", desc: te ? "వీడియో + ఛానల్ పిన్" : "Video + Channel Pin" },
                    { code: "SPOT_30", days: 30, price: 499, label: "30 Days", badge: "💎 ₹499 (VIP)", desc: te ? "30 రోజులు సూపర్ స్పాట్‌లైట్" : "VIP Month Super" },
                  ].map((p) => (
                    <button
                      key={p.code}
                      type="button"
                      onClick={() => setSelectedPlan(p.code)}
                      className={`p-4 rounded-2xl border text-left transition-all ${
                        selectedPlan === p.code
                          ? "border-maroon bg-rose-50/60 shadow-md scale-[1.02] ring-2 ring-maroon/20"
                          : "border-gray-200 hover:border-gold"
                      }`}
                    >
                      <div className="font-extrabold text-sm text-maroon">{p.badge}</div>
                      <div className="text-xs font-semibold text-gray-800 mt-1">{p.label}</div>
                      <div className="text-[11px] text-gray-500 mt-0.5">{p.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 2: User Details */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    2. {te ? "మీ రిజిస్టర్డ్ TSAP ID" : "Your Registered TSAP ID"} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. TSAP-M-2026-1088"
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
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    3. {te ? "ఆకర్షణీయమైన హెడ్‌లైన్ (Headline)" : "Punchy Headline"}
                  </label>
                  <input
                    type="text"
                    placeholder={te ? "ఉదా: హైదరాబాద్ సాఫ్ట్‌వేర్ ఇంజనీర్ — మంచి కుటుంబ సంబంధం కోసం" : "e.g. Software Engineer in Hyderabad — Seeking cultured alliance"}
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:border-maroon focus:ring-1 focus:ring-maroon outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    4. {te ? "మీ వ్యక్తిగత పరిచయం & కోరికలు (Alliance Pitch)" : "Alliance Bio & Expectations"}
                  </label>
                  <textarea
                    rows={3}
                    placeholder={te ? "మీ కుటుంబం, చదువు, ఉద్యోగం మరియు కాబోయే జీవిత భాగస్వామి నుంచి మీ అంచనాలను 2-3 వాక్యాలలో రాయండి..." : "Write 2-3 lines introducing yourself, family background, and partner preferences..."}
                    value={pitchText}
                    onChange={(e) => setPitchText(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:border-maroon focus:ring-1 focus:ring-maroon outline-none"
                  />
                </div>

                {/* Step 4: Media Links (Photo + Video) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      📸 {te ? "ఫోటో లింక్ (ఐచ్ఛికం)" : "Photo URL (Optional)"}
                    </label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={photoUrl}
                      onChange={(e) => setPhotoUrl(e.target.value)}
                      className="w-full px-4 py-2 rounded-xl border border-gray-300 text-xs focus:border-maroon outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      🎥 {te ? "వీడియో లింక్ (YouTube / Shorts / Reels)" : "Video Intro Link (YouTube/Shorts)"}
                    </label>
                    <input
                      type="url"
                      placeholder="https://youtube.com/shorts/..."
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      className="w-full px-4 py-2 rounded-xl border border-gray-300 text-xs focus:border-maroon outline-none"
                    />
                  </div>
                </div>

                {/* Step 5: Payment Info */}
                <div className="bg-amber-50/70 rounded-2xl p-4 border border-amber-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-maroon">💰 {te ? "చెల్లించాల్సిన మొత్తం:" : "Amount to Pay:"}</span>
                    <span className="text-base font-extrabold text-maroon">₹{planObj.price}</span>
                  </div>

                  <div className="text-[11px] text-gray-600">
                    {te
                      ? "UPI ID: `manavivaha@icici` కి ₹" + planObj.price + " Google Pay/PhonePe/Paytm ద్వారా చెల్లించి, క్రింద UTR / Ref Number నమోదు చేయండి."
                      : "Pay ₹" + planObj.price + " via UPI to `manavivaha@icici` and enter your UTR / Transaction Reference below."}
                  </div>

                  <input
                    type="text"
                    placeholder={te ? "UPI Transaction Ref / UTR నంబర్" : "UPI Transaction Ref / UTR"}
                    value={paymentRef}
                    onChange={(e) => setPaymentRef(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl bg-white border border-gray-300 text-xs focus:border-maroon outline-none"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-2xl maroon-gradient text-white font-extrabold text-sm shadow-brand hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {loading ? (te ? "నమోదు చేస్తున్నాం…" : "Submitting…") : `🚀 ${te ? "స్పాట్‌లైట్ ప్రమోషన్ సమర్పించండి" : "Submit Spotlight Promotion"} (₹${planObj.price})`}
              </button>
            </form>

            {/* Live Preview Sidebar */}
            <div className="space-y-4">
              <div className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                👁️ {te ? "హోమ్‌పేజీలో ఎలా కనిపిస్తుంది:" : "Live Preview on Homepage:"}
              </div>

              <div className="bg-white rounded-3xl overflow-hidden border border-amber-300 shadow-lg p-0">
                <div className="relative h-48 bg-slate-900">
                  <img
                    src={photoUrl || "/promo/cine-1.jpg"}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent" />
                  <div className="absolute top-2 left-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-400 text-maroon">
                      {selectedPlan === "SPOT_30" ? "💎 VIP SPOTLIGHT" : "✨ PROFILE OF THE DAY"}
                    </span>
                  </div>
                  <div className="absolute bottom-2 left-3 right-3 text-white">
                    <div className="font-bold text-sm truncate">{tsapId || "Your Name"}</div>
                    <div className="text-[10px] text-amber-200">28 Yrs · Verified Alliance</div>
                  </div>
                </div>

                <div className="p-4 space-y-2">
                  <div className="text-xs font-bold text-maroon truncate">
                    📍 {headline || (te ? "హైదరాబాద్ ప్రొఫెషనల్" : "Hyderabad Professional")}
                  </div>
                  <p className="text-[11px] text-gray-600 line-clamp-3 italic bg-slate-50 p-2 rounded-xl">
                    &ldquo;{pitchText || (te ? "మంచి విద్యావంతులైన భాగస్వామి కోసం చూస్తున్నాము..." : "Looking for a well-educated, cultured life partner...")}&rdquo;
                  </p>
                  <div className="pt-2 flex gap-2">
                    <div className="flex-1 py-1.5 rounded-lg maroon-gradient text-white text-[10px] font-bold text-center">
                      💍 {te ? "సంబంధం పంపండి" : "Send Interest"}
                    </div>
                    <div className="py-1.5 px-3 rounded-lg border border-gold text-maroon text-[10px] font-bold text-center">
                      👀 View
                    </div>
                  </div>
                </div>
              </div>

              {/* Trust Box */}
              <div className="bg-white/80 rounded-2xl p-4 border border-gold/30 text-xs text-gray-700 space-y-2">
                <div className="font-bold text-maroon">🛡️ 100% Manual Review</div>
                <div className="text-[11px] text-gray-600 leading-relaxed">
                  {te
                    ? "అభ్యంతరకరమైన ఫోటోలు లేదా తప్పుడు వివరాలు అనుమతించబడవు. ప్రతి ప్రమోషన్‌ను మా అడ్మిన్ టీమ్ పరిశీలించిన తర్వాతే లైవ్ చేస్తుంది."
                    : "No fake profiles or improper media allowed. Our safety operations team reviews every submission before making it live."}
                </div>
              </div>
            </div>

          </div>
        )}

      </div>
    </main>
  );
}
