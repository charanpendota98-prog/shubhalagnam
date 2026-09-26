"use client";

import { useState, useEffect } from "react";
import { useLang } from "@/lib/lang";
import { authHeaders } from "@/lib/api";

type ProfileTarget = {
  tsap_id: string;
  full_name?: string;
  name?: string;
  gender?: string;
  age?: number;
  caste?: string;
  sub_caste?: string;
  district?: string;
  state?: string;
  job?: string;
  education?: string;
  salary?: string;
  photo_url?: string;
  phone_masked?: string;
};

interface QuickUnlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: ProfileTarget | null;
  onUnlocked?: (phone: string) => void;
}

export default function QuickUnlockModal({
  isOpen,
  onClose,
  target,
  onUnlocked,
}: QuickUnlockModalProps) {
  const { lang } = useLang();
  const te = lang === "te";

  const [selectedPlan, setSelectedPlan] = useState<"S_29" | "S_99" | "S_199" | "S_499">("S_99");
  const [promoCode, setPromoCode] = useState("");
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoMsg, setPromoMsg] = useState("");
  const [promoBusy, setPromoBusy] = useState(false);

  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [unlockedPhone, setUnlockedPhone] = useState("");
  const [payOrder, setPayOrder] = useState<any>(null);
  const [utr, setUtr] = useState("");
  const [utrBusy, setUtrBusy] = useState(false);

  // Available monetization packages
  const PACKAGES = [
    {
      code: "S_29" as const,
      price: 29,
      credits: 1,
      titleTe: "1 సంబంధం నంబర్",
      titleEn: "1 Contact Unlock",
      badge: te ? "ట్రయల్" : "Trial",
      perkTe: "1 నంబర్ తక్షణమే • డిక్లైన్ అయితే రీఫండ్",
      perkEn: "1 Instant contact • Full refund if declined",
    },
    {
      code: "S_99" as const,
      price: 99,
      credits: 5,
      popular: true,
      titleTe: "5 సంబంధాల నంబర్లు + 7 రోజుల బూస్ట్",
      titleEn: "5 Contact Unlocks + 7-Day Boost",
      badge: te ? "చాలామంది ఎంపిక ⭐" : "Most Popular ⭐",
      perkTe: "5 నంబర్లు (ఒక్కోటి ₹20) + 7 రోజుల ప్రొఫైల్ ప్రమోషన్",
      perkEn: "5 contacts (₹20/ea) + 7 days priority promotion",
    },
    {
      code: "S_199" as const,
      price: 199,
      credits: 12,
      titleTe: "12 సంబంధాలు + వేద గుణమేళనం PDF",
      titleEn: "12 Unlocks + Gunamelanam PDF",
      badge: te ? "బెస్ట్ సేవింగ్స్" : "Best Value",
      perkTe: "12 నంబర్లు + ఉచిత వేద జాతక సరిపోలిక PDF రిపోర్ట్",
      perkEn: "12 contacts + Free Kundli Match PDF download",
    },
    {
      code: "S_499" as const,
      price: 499,
      credits: 50,
      titleTe: "VIP అన్‌లిమిటెడ్ (50 సంబంధాలు)",
      titleEn: "VIP Unlimited (50 Unlocks)",
      badge: te ? "VIP ప్లాన్" : "VIP Plan",
      perkTe: "50 నంబర్లు + 90 రోజుల స్పాట్‌లైట్ బూస్ట్ + అసిస్టెడ్ సపోర్ట్",
      perkEn: "50 contacts + 90 days spotlight boost + RM support",
    },
  ];

  const currentPkg = PACKAGES.find((p) => p.code === selectedPlan) || PACKAGES[1];
  const finalPrice = Math.max(0, currentPkg.price - promoDiscount);

  // Check if viewer has logged in profile
  const getViewerId = () => {
    try {
      return localStorage.getItem("tsap_id") || "";
    } catch {
      return "";
    }
  };

  // Attempt direct unlock if user already has credits
  const attemptDirectUnlock = async () => {
    const vid = getViewerId();
    if (!vid || !target) return;
    setBusy(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/unlock", {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          viewer_id: vid,
          target_id: target.tsap_id,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.phone) {
        setUnlockedPhone(data.phone);
        setSuccessMsg(data.message_telugu || "✅ నంబర్ అన్‌లాక్ అయ్యింది!");
        if (onUnlocked) onUnlocked(data.phone);
      } else if (data.reason === "no_credits" || !res.ok) {
        // Show payment options
      }
    } catch {
      // Keep payment modal open
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (isOpen && target) {
      setUnlockedPhone("");
      setSuccessMsg("");
      setErrorMsg("");
      setPayOrder(null);
      attemptDirectUnlock();
    }
  }, [isOpen, target]);

  if (!isOpen || !target) return null;

  // Apply Promo code
  const applyPromo = async () => {
    const code = promoCode.trim().toUpperCase();
    if (!code) return;
    setPromoBusy(true);
    setPromoMsg("");
    try {
      const res = await fetch(
        `/api/promo/apply?code=${encodeURIComponent(code)}&purpose=credits&plan=${encodeURIComponent(selectedPlan)}&user=${encodeURIComponent(getViewerId())}`
      );
      const d = await res.json();
      if (res.ok && d.success) {
        setPromoDiscount(Number(d.discount || 20));
        setPromoMsg(`🎉 ${d.message_telugu || "Offer Applied!"} (−₹${d.discount || 20})`);
      } else {
        setPromoDiscount(0);
        setPromoMsg(d.detail || (te ? "చెల్లని ఆఫర్ కోడ్" : "Invalid promo code"));
      }
    } catch {
      setPromoMsg(te ? "నెట్‌వర్క్ సమస్య" : "Network error");
    } finally {
      setPromoBusy(false);
    }
  };

  // Create payment order
  const handleCreateOrder = async () => {
    const vid = getViewerId();
    if (!vid) {
      setErrorMsg(
        te
          ? "⚠️ దయచేసి ముందుగా లాగిన్ / నమోదు చేసుకోండి"
          : "⚠️ Please login/register first to unlock numbers"
      );
      return;
    }
    setBusy(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/pay/order", {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          tsap_id: vid,
          purpose: "credits",
          ref: selectedPlan,
          offer_code: promoCode.trim().toUpperCase(),
        }),
      });
      const d = await res.json();
      if (!res.ok || !d.success) {
        setErrorMsg(d.detail || d.message_telugu || (te ? "ఆర్డర్ క్రియేషన్ విఫలమైంది" : "Order failed"));
        setBusy(false);
        return;
      }
      setPayOrder(d.pay_order);
    } catch {
      setErrorMsg(te ? "సర్వర్ కనెక్ట్ అవ్వడం లేదు" : "Connection failed");
    } finally {
      setBusy(false);
    }
  };

  // Submit UTR after payment
  const handleSubmitUtr = async () => {
    if (!payOrder) return;
    if (!/^\d{12}$/.test(utr.trim())) {
      setErrorMsg(te ? "⚠️ UTR 12 అంకెలు ఉండాలి (GPay/PhonePe నుండి)" : "⚠️ UTR must be 12 digits from UPI app");
      return;
    }
    setUtrBusy(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/pay/claim", {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: payOrder.id,
          utr: utr.trim(),
        }),
      });
      const d = await res.json();
      if (res.ok && d.success) {
        setSuccessMsg(
          te
            ? "✅ మీ UTR సమర్పించబడింది! అడ్మిన్ బ్యాంక్ స్టేట్‌మెంట్ వెరిఫై చేసి క్రెడిట్స్ యాడ్ చేస్తారు."
            : "✅ UTR submitted! Admin will verify and activate credits immediately."
        );
        setPayOrder({ ...payOrder, status: "claimed" });
      } else {
        setErrorMsg(d.detail || d.message_telugu || (te ? "సమర్పణ విఫలమైంది" : "Submission failed"));
      }
    } catch {
      setErrorMsg(te ? "సమస్య ఏర్పడింది, మళ్ళీ ప్రయత్నించండి" : "Error, please retry");
    } finally {
      setUtrBusy(false);
    }
  };

  const candidateName = target.full_name || target.name || "సంబంధం";
  const maskedPhone = "••••••••••";

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border-2 border-gold/40 overflow-hidden relative my-auto">
        
        {/* Header Ribbon */}
        <div className="maroon-gradient p-5 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/25 hover:bg-black/40 flex items-center justify-center text-white font-black text-sm transition"
          >
            ✕
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xl">🔒</span>
            <span className="text-xs font-black uppercase tracking-widest text-amber-200">
              {te ? "ధృవీకరించబడిన సంప్రదింపు నంబర్" : "Verified Direct Contact"}
            </span>
          </div>

          <h3 className="text-lg font-black mt-1">
            {te ? "సంబంధం ఫోన్ నంబర్ అన్‌లాక్ చేసుకోండి" : "Unlock Match Phone Number"}
          </h3>
          <p className="text-xs text-amber-100/90 mt-0.5">
            {te
              ? "నేరుగా వధువు/వరుడి కుటుంబంతో మాట్లాడండి • 100% నమ్మకమైన ప్రొఫైల్స్"
              : "Speak directly with the family • 100% Authentic Profiles"}
          </p>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 max-h-[78vh] overflow-y-auto">
          
          {/* Target Profile Mini Card */}
          <div className="bg-amber-50/70 border border-gold/40 rounded-2xl p-3.5 flex items-center gap-3.5">
            {target.photo_url ? (
              <img
                src={target.photo_url}
                alt={candidateName}
                className="w-14 h-16 rounded-xl object-cover border border-gold/30 shadow-xs"
              />
            ) : (
              <div className="w-14 h-16 rounded-xl bg-amber-100 border border-gold/30 flex items-center justify-center text-2xl text-maroon">
                {target.gender === "Groom" || target.gender === "Male" ? "🤵" : "👰"}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-sm text-navy truncate">
                  {candidateName}
                </span>
                <span className="font-mono text-[11px] text-slate-500 font-bold">
                  {target.tsap_id}
                </span>
              </div>

              <p className="text-xs font-bold text-maroon mt-0.5">
                💍 {target.caste || "Telugu"} {target.age ? `• ${target.age} yrs` : ""}
              </p>
              <p className="text-[11.5px] text-slate-600 truncate mt-0.5">
                📍 {target.district || "Hyderabad"} • 🎓 {target.education || "Graduate"} • 💼 {target.job || "Professional"}
              </p>
            </div>
          </div>

          {/* If already Unlocked Phone is Ready */}
          {unlockedPhone ? (
            <div className="bg-emerald-50 border-2 border-emerald-500 rounded-2xl p-4 text-center space-y-3 animate-fade">
              <div className="text-emerald-700 font-black text-sm">
                🎉 {te ? "నంబర్ విజయవంతంగా అన్‌లాక్ అయ్యింది!" : "Contact Unlocked Successfully!"}
              </div>
              <div className="text-2xl sm:text-3xl font-black font-mono tracking-wider text-emerald-900 bg-white py-2.5 px-4 rounded-xl border border-emerald-300 shadow-inner">
                {unlockedPhone}
              </div>
              <p className="text-xs text-emerald-700 font-medium">
                {te ? "గౌరవంగా మాట్లాడండి • శుభలగ్నం నుండి తీసుకున్నామని చెప్పండి 🙏" : "Mention Shubhalagnam Matrimony reference when you call 🙏"}
              </p>
              <div className="flex gap-2.5 pt-1">
                <a
                  href={`tel:${unlockedPhone}`}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md transition"
                >
                  <span>📞</span>
                  <span>{te ? "డైరెక్ట్ కాల్" : "Call Now"}</span>
                </a>
                <a
                  href={`https://wa.me/91${unlockedPhone}?text=${encodeURIComponent(`నమస్కారం, శుభలగ్నం మ్యాట్రిమోనీలో మీ ప్రొఫైల్ (${target.tsap_id}) చూసి సంప్రదిస్తున్నాము.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2.5 px-4 rounded-xl bg-[#25D366] hover:brightness-105 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md transition"
                >
                  <span>💬</span>
                  <span>{te ? "వాట్సాప్ మెసేజ్" : "WhatsApp"}</span>
                </a>
              </div>
            </div>
          ) : payOrder ? (
            /* Active Pay Order / UPI QR View */
            <div className="bg-slate-50 border border-gold/40 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-maroon uppercase">
                  {te ? "ఆర్డర్ వివరాలు" : "Payment Order"} ({payOrder.id})
                </span>
                <span className="font-black text-base text-emerald-700">
                  ₹{payOrder.final_amount}
                </span>
              </div>

              {/* UPI ID / QR Box */}
              <div className="bg-white rounded-xl p-3 border border-slate-200 text-center space-y-2">
                <p className="text-xs text-slate-600 font-medium">
                  {te
                    ? "ఏదైనా UPI యాప్ (GPay / PhonePe / Paytm) ద్వారా పేమెంట్ చేయండి:"
                    : "Pay via any UPI App (GPay / PhonePe / Paytm / BHIM):"}
                </p>
                <div className="bg-amber-50 font-mono font-black text-sm text-maroon py-2 px-3 rounded-lg border border-gold/40 select-all">
                  {payOrder.upi_id || "9394483300@ybl"}
                </div>

                {/* Live Scannable Dynamic QR */}
                <div className="flex flex-col items-center justify-center p-2 bg-[#FFFDF7] rounded-xl border border-gold/30">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/pay/qr/${payOrder.id}.png`}
                    alt="Scan and Pay via UPI"
                    width={140}
                    height={140}
                    className="w-32 h-32 rounded-lg shadow-xs border border-slate-200"
                  />
                </div>

                <div className="text-[11px] text-slate-500">
                  {te ? "లేదా డైరెక్ట్ UPI పే నొక్కండి:" : "Or tap below to open UPI App:"}
                </div>
                <a
                  href={`upi://pay?pa=${encodeURIComponent(payOrder.upi_id || "9394483300@ybl")}&pn=${encodeURIComponent("Mana Vivaha")}&am=${payOrder.final_amount}&cu=INR&tn=${encodeURIComponent(`ManaVivaha ${payOrder.id}`)}`}
                  className="inline-flex items-center gap-1.5 py-2 px-4 rounded-xl bg-[#7A0C2E] text-white font-black text-xs shadow-md hover:bg-[#911239] transition"
                >
                  <span>📲</span>
                  <span>{te ? "UPI యాప్‌తో పే చేయండి (₹" + payOrder.final_amount + ")" : `Pay ₹${payOrder.final_amount} via UPI App`}</span>
                </a>
              </div>

              {/* UTR Input */}
              <div className="space-y-1.5 pt-1">
                <label className="block text-xs font-bold text-slate-700">
                  {te ? "పేమెంట్ చేసిన తర్వాత 12-అంకెల UTR నంబర్ ఎంటర్ చేయండి:" : "Enter 12-digit UTR Number after payment:"}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={12}
                    value={utr}
                    onChange={(e) => setUtr(e.target.value.replace(/\D/g, ""))}
                    placeholder="12-digit UTR / Ref No"
                    className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800"
                  />
                  <button
                    onClick={handleSubmitUtr}
                    disabled={utrBusy || utr.length < 12}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs disabled:opacity-50 transition shadow-xs"
                  >
                    {utrBusy ? "⏳…" : te ? "సమర్పించు" : "Submit"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Choose Package & Instant Unlock CTA */
            <div className="space-y-3">
              <div className="text-xs font-black text-slate-800 flex items-center justify-between">
                <span>⚡ {te ? "ప్యాకేజీ ఎంచుకోండి:" : "Choose Package:"}</span>
                <span className="text-emerald-700 font-bold">100% Refund Guarantee</span>
              </div>

              <div className="space-y-2">
                {PACKAGES.map((pkg) => {
                  const isSelected = selectedPlan === pkg.code;
                  return (
                    <div
                      key={pkg.code}
                      onClick={() => setSelectedPlan(pkg.code)}
                      className={`cursor-pointer rounded-2xl p-3.5 border-2 transition relative flex items-center justify-between gap-3 ${
                        isSelected
                          ? "border-maroon bg-rose-50/50 shadow-md"
                          : "border-slate-200 hover:border-gold/60 bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                            isSelected ? "border-maroon bg-maroon text-white" : "border-slate-300"
                          }`}
                        >
                          {isSelected && <span className="text-[10px] font-black">✓</span>}
                        </div>

                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-xs text-slate-900">
                              {te ? pkg.titleTe : pkg.titleEn}
                            </span>
                            {pkg.badge && (
                              <span
                                className={`text-[9.5px] font-black px-2 py-0.5 rounded-full ${
                                  pkg.popular
                                    ? "bg-amber-400 text-maroon"
                                    : "bg-emerald-100 text-emerald-800"
                                }`}
                              >
                                {pkg.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-600 font-medium">
                            {te ? pkg.perkTe : pkg.perkEn}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-base font-black text-maroon">₹{pkg.price}</div>
                        <div className="text-[10px] text-slate-400 font-bold">
                          {pkg.credits} Unlocks
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Promo Code Input */}
              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  placeholder="Promo (SHUBHAM50, FIRSTMATCH)"
                  value={promoCode}
                  onChange={(e) => {
                    setPromoCode(e.target.value);
                    setPromoMsg("");
                  }}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono uppercase font-bold text-slate-800"
                />
                <button
                  onClick={applyPromo}
                  disabled={promoBusy || !promoCode.trim()}
                  className="px-3 py-2 rounded-xl border border-gold/60 bg-amber-50 hover:bg-amber-100 text-maroon font-black text-xs disabled:opacity-50 transition"
                >
                  {promoBusy ? "⏳…" : te ? "ఆఫర్ అప్లై" : "Apply"}
                </button>
              </div>
              {promoMsg && (
                <div
                  className={`text-[11.5px] font-bold px-2.5 py-1 rounded-lg ${
                    promoDiscount > 0
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : "bg-rose-50 text-rose-800 border border-rose-200"
                  }`}
                >
                  {promoMsg}
                </div>
              )}

              {/* Primary Action Button */}
              <button
                onClick={handleCreateOrder}
                disabled={busy}
                className="w-full py-3 px-4 rounded-2xl maroon-gradient hover:brightness-105 active:scale-98 text-white font-black text-sm shadow-lg flex items-center justify-center gap-2 transition"
              >
                <span>💳</span>
                <span>
                  {te
                    ? `నంబర్ అన్‌లాక్ చేయండి — ₹${finalPrice} పే చేయండి`
                    : `Unlock Contact — Pay ₹${finalPrice}`}
                </span>
                <span>→</span>
              </button>

              <div className="flex items-center justify-center gap-4 text-[10.5px] text-slate-500 pt-1 font-semibold">
                <span>🛡️ 100% Safe UPI</span>
                <span>•</span>
                <span>⚡ Instant SMS & WhatsApp</span>
                <span>•</span>
                <span>🤝 24/7 Support</span>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="bg-rose-50 border border-rose-300 rounded-xl p-3 text-xs text-rose-800 font-bold">
              {errorMsg}
            </div>
          )}

          {/* Success Message */}
          {successMsg && !unlockedPhone && (
            <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3 text-xs text-emerald-800 font-bold">
              {successMsg}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
