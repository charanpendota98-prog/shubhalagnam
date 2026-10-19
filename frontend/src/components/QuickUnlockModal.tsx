"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useLang } from "@/lib/lang";
import { apiDisplayMessage, authHeaders, readApiJson} from "@/lib/api";
import { normalizeWhatsAppPhone, whatsappPhoneLink } from "@/lib/wa";
import { SITE_CONFIG } from "@/lib/site-config";

declare global { interface Window { Razorpay?: any } }

function loadRazorpay(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

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
  const [selectedPlan, setSelectedPlan] = useState<"S_99" | "S_199" | "S_299" | "S_499">("S_99");
  const [promoCode, setPromoCode] = useState("");
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoMsg, setPromoMsg] = useState("");
  const [promoBusy, setPromoBusy] = useState(false);

  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [unlockedPhone, setUnlockedPhone] = useState("");
  const [payOrder, setPayOrder] = useState<any>(null);
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [utr, setUtr] = useState("");
  const [utrBusy, setUtrBusy] = useState(false);
  const normalizedUnlockedPhone = normalizeWhatsAppPhone(unlockedPhone);
  const unlockedWhatsAppUrl = target
    ? whatsappPhoneLink(unlockedPhone, te
      ? `నమస్కారం, మన వివాహ (Mana Vivaha) మ్యాట్రిమోనీలో మీ ప్రొఫైల్ (${target.tsap_id}) చూసి సంప్రదిస్తున్నాను.`
      : `Hello, I found your profile (${target.tsap_id}) on Mana Vivaha and would like to connect.`)
    : null;
  const paymentHelpUrl = target
    ? whatsappPhoneLink(SITE_CONFIG.supportWhatsapp, te
      ? `నమస్కారం మన వివాహ హెల్ప్‌లైన్! నా ప్రొఫైల్ కోసం ప్లాన్ చెల్లింపులో సహాయం కావాలి. లక్ష్య ప్రొఫైల్ ID: ${target.tsap_id}.`
      : `Hello Mana Vivaha support, I need help with a plan payment for my profile. Target profile ID: ${target.tsap_id}.`)
    : null;

  // These are interest-request credits, not direct phone unlocks.
  const PACKAGES = [
    {
      code: "S_99" as const,
      price: 99,
      credits: 5,
      titleTe: "5 interest-request credits",
      titleEn: "5 interest-request credits",
      badge: te ? "ప్రారంభ ప్లాన్" : "Entry plan",
      perkTe: "30 రోజుల validity • Contact sharing profile owner acceptance తర్వాత మాత్రమే",
      perkEn: "30-day validity • Contact sharing only after the profile owner accepts",
    },
    {
      code: "S_199" as const,
      price: 199,
      credits: 12,
      titleTe: "12 interest-request credits",
      titleEn: "12 interest-request credits",
      badge: "₹17/request credit",
      perkTe: "45 రోజుల validity • Match లేదా response guarantee లేదు",
      perkEn: "45-day validity • No match or response guarantee",
    },
    {
      code: "S_299" as const,
      price: 299,
      credits: 25,
      titleTe: "25 interest-request credits",
      titleEn: "25 interest-request credits",
      badge: "₹12/request credit",
      perkTe: "60 రోజుల validity • Contact details acceptance తర్వాతే",
      perkEn: "60-day validity • Contact details follow acceptance",
    },
    {
      code: "S_499" as const,
      price: 499,
      credits: 50,
      titleTe: "50 interest-request credits",
      titleEn: "50 interest-request credits",
      badge: te ? "VIP ప్లాన్" : "VIP plan",
      perkTe: "90 రోజుల validity • Match లేదా response guarantee లేదు",
      perkEn: "90-day validity • No match or response guarantee",
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

  // A full contact reveal is possible only when an accepted interest grants consent.
  const attemptDirectUnlock = useCallback(async () => {
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
      const data = await readApiJson(res);
      if (res.ok && data.success && data.phone) {
        setUnlockedPhone(data.phone);
        setSuccessMsg(apiDisplayMessage(data, te, te ? "✅ అంగీకారం తర్వాత contact details అందుబాటులో ఉన్నాయి." : "✅ Contact details are available after acceptance."));
        if (onUnlocked) onUnlocked(data.phone);
      } else if (data.reason === "consent_required" || data.reason === "no_credits") {
        // Keep the request-credit options visible; paid credits cannot bypass consent.
      } else if (!res.ok) {
        setErrorMsg(apiDisplayMessage(data, te, te ? "Contact access చెక్ చేయలేకపోయాం." : "Could not check contact access."));
      }
    } catch {
      // Keep payment modal open
    } finally {
      setBusy(false);
    }
  }, [target, te, onUnlocked]);

  useEffect(() => {
    if (isOpen && target) {
      setUnlockedPhone("");
      setSuccessMsg("");
      setErrorMsg("");
      setPayOrder(null);
      setPaymentComplete(false);
      attemptDirectUnlock();
    }
  }, [isOpen, target, attemptDirectUnlock]);

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
      const d = await readApiJson(res);
      if (res.ok && d.success) {
        setPromoDiscount(Number(d.discount || 20));
        setPromoMsg(`🎉 ${apiDisplayMessage(d, te, te ? "ఆఫర్ వర్తింపజేయబడింది!" : "Offer applied.")} (−₹${d.discount || 20})`);
      } else {
        setPromoDiscount(0);
        setPromoMsg(apiDisplayMessage(d, te, te ? "చెల్లని ఆఫర్ కోడ్" : "Invalid promo code"));
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
          : "⚠️ Please login/register first to buy request credits"
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
      const d = await readApiJson(res);
      if (!res.ok || !d.success) {
        setErrorMsg(apiDisplayMessage(d, te, te ? "ఆర్డర్ సృష్టించలేకపోయాం. మళ్లీ ప్రయత్నించండి." : "The order could not be created. Please try again."));
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
      const d = await readApiJson(res);
      if (res.ok && d.success) {
        setSuccessMsg(
          te
            ? "✅ మీ UTR సమర్పించబడింది! అడ్మిన్ బ్యాంక్ స్టేట్‌మెంట్ వెరిఫై చేసి క్రెడిట్స్ యాడ్ చేస్తారు."
            : "✅ UTR submitted! Admin will verify and activate credits immediately."
        );
        setPayOrder({ ...payOrder, status: "claimed" });
      } else {
        setErrorMsg(apiDisplayMessage(d, te, te ? "సమర్పణ విఫలమైంది. మళ్లీ ప్రయత్నించండి." : "The UTR could not be submitted. Please try again."));
      }
    } catch {
      setErrorMsg(te ? "సమస్య ఏర్పడింది, మళ్ళీ ప్రయత్నించండి" : "Error, please retry");
    } finally {
      setUtrBusy(false);
    }
  };

  const handleRazorpayPayment = async () => {
    if (!payOrder || busy) return;
    if (payOrder.mode !== "razorpay" || !payOrder.key_id || !payOrder.rzp_order_id) {
      setErrorMsg(te ? "ఆన్‌లైన్ చెల్లింపు ఆర్డర్ వివరాలు అందుబాటులో లేవు." : "Online payment order details are unavailable.");
      return;
    }
    setBusy(true);
    setErrorMsg("");
    const loaded = await loadRazorpay();
    if (!loaded || !window.Razorpay) {
      setBusy(false);
      setErrorMsg(te ? "చెల్లింపు పేజీ లోడ్ కాలేదు. మళ్లీ ప్రయత్నించండి." : "The payment checkout could not be loaded. Please retry.");
      return;
    }
    const checkout = new window.Razorpay({
      key: payOrder.key_id,
      order_id: payOrder.rzp_order_id,
      amount: payOrder.checkout_amount_paise,
      currency: "INR",
      name: te ? "మన వివాహ" : "Mana Vivaha",
      description: te
        ? (payOrder.label || currentPkg.titleTe)
        : apiDisplayMessage({ message_en: payOrder.label_en, message: payOrder.label || currentPkg.titleEn }, false, currentPkg.titleEn),
      handler: async (response: any) => {
        setBusy(true);
        try {
          const res = await fetch("/api/pay/verify", {
            method: "POST",
            headers: { ...authHeaders(), "Content-Type": "application/json" },
            body: JSON.stringify({
              order_id: payOrder.id,
              razorpay_order_id: response.razorpay_order_id || "",
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }),
          });
          const data = await readApiJson(res);
          if (!res.ok || !data.success) {
            setErrorMsg(apiDisplayMessage(data, te, te ? "చెల్లింపును నిర్ధారించలేకపోయాం. Support ను సంప్రదించేటప్పుడు payment ID ఇవ్వండి." : "Payment could not be verified. Contact support with your payment ID."));
            return;
          }
          setPayOrder(null);
          setPaymentComplete(true);
          setSuccessMsg("");
        } catch {
          setErrorMsg(te ? "ధృవీకరణలో సమస్య. Payment ID తో support ను సంప్రదించండి." : "Verification could not be completed. Contact support with your payment ID.");
        } finally {
          setBusy(false);
        }
      },
      modal: {
        ondismiss: () => {
          setBusy(false);
          setErrorMsg(te ? "చెల్లింపు విండో మూసివేయబడింది. మీరు మళ్లీ ప్రయత్నించవచ్చు." : "Payment window closed. You can retry.");
        },
      },
      theme: { color: "#7A0C2E" },
    });
    checkout.on("payment.failed", (response: any) => {
      setBusy(false);
      const reason = response?.error?.description;
      setErrorMsg(te ? `చెల్లింపు విఫలమైంది${reason ? `: ${reason}` : ""}. మళ్లీ ప్రయత్నించండి.` : `Payment failed${reason ? `: ${reason}` : ""}. Please retry.`);
    });
    checkout.open();
  };

  const candidateName = target.full_name || target.name || target.tsap_id;
  const localizedProfileField = (value?: string) => te ? value || "" : apiDisplayMessage({ message_en: value }, false, "");
  const displayCaste = localizedProfileField(target.caste);
  const displayDistrict = localizedProfileField(target.district);
  const displayEducation = localizedProfileField(target.education);
  const displayJob = localizedProfileField(target.job);

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border-2 border-gold/40 overflow-hidden relative my-auto">
        
        {/* Header Ribbon */}
        <div className="maroon-gradient p-5 text-white relative">
          <button aria-label={te ? "మూసివేయండి" : "Close"} type="button"
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/25 hover:bg-black/40 flex items-center justify-center text-white font-black text-sm transition"
          >
            ✕
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xl">🔒</span>
            <span className="text-xs font-black uppercase tracking-widest text-amber-200">
              {te ? "సమ్మతితో సంప్రదింపు" : "Consent-based contact sharing"}
            </span>
          </div>

          <h3 className="text-lg font-black mt-1">
            {te ? "అంగీకారం తర్వాతే contact details" : "Contact details after acceptance"}
          </h3>
          <p className="text-xs text-amber-100/90 mt-0.5">
            {te
              ? "Interest పంపండి. Owner accept చేసిన తర్వాత accepted-request account views లో details కనిపిస్తాయి; notification delivery హామీ లేదు."
              : "Send an interest. After owner acceptance, details appear in accepted-request account views; notification delivery is not guaranteed."}
          </p>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 max-h-[78vh] overflow-y-auto">
          
          {/* Target Profile Mini Card */}
          <div className="bg-amber-50/70 border border-gold/40 rounded-2xl p-3.5 flex items-center gap-3.5">
            {target.photo_url ? (
              <Image
                src={target.photo_url}
                alt={candidateName}
                width={56}
                height={64}
                unoptimized
                className="w-14 h-16 rounded-xl object-cover border border-gold/30 shadow-xs"
              />
            ) : (
              <div className="w-14 h-16 rounded-xl bg-amber-100 border border-gold/30 flex items-center justify-center text-2xl text-maroon">
                {target.gender === "Groom" || target.gender === "Male" ? "🤵" : target.gender === "Bride" || target.gender === "Female" ? "👰" : "💍"}
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

              {(displayCaste || target.age) && <p className="break-words text-xs font-bold text-maroon mt-0.5">
                {displayCaste ? `💍 ${displayCaste}` : ""} {target.age ? `• ${target.age} ${te ? "సం." : "yrs"}` : ""}
              </p>}
              {(displayDistrict || displayEducation || displayJob) ? (
                <p className="break-words text-[11.5px] leading-relaxed text-slate-600 mt-0.5">
                  {[displayDistrict, displayEducation, displayJob].filter(Boolean).join(" • ")}
                </p>
              ) : <p className="text-[11.5px] text-slate-500 mt-0.5">{te ? "అదనపు వివరాలు అందుబాటులో లేవు" : "Additional details are not available"}</p>}
            </div>
          </div>

          <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs leading-relaxed text-amber-950" role="note">
            {te
              ? "ఒక్క credit = ఒక interest request. Credits phone number ను నేరుగా అన్‌లాక్ చేయవు; profile owner accept చేసిన తర్వాత మాత్రమే contact details అందుబాటులో ఉంటాయి."
              : "One credit sends one interest request. Credits do not directly unlock a phone number; contact details are available only after the profile owner accepts."}
          </div>

          {/* Contact details can appear here only after the recipient has accepted. */}
          {unlockedPhone ? (
            <div className="bg-emerald-50 border-2 border-emerald-500 rounded-2xl p-4 text-center space-y-3 animate-fade">
              <div className="text-emerald-700 font-black text-sm">
                🎉 {te ? "అంగీకారం తర్వాత contact details అందుబాటులో ఉన్నాయి" : "Contact details available after acceptance"}
              </div>
              <div className="text-2xl sm:text-3xl font-black font-mono tracking-wider text-emerald-900 bg-white py-2.5 px-4 rounded-xl border border-emerald-300 shadow-inner">
                {unlockedPhone}
              </div>
              <p className="text-xs text-emerald-700 font-medium">
                {te ? "గౌరవంగా మాట్లాడండి; వివరాలను స్వతంత్రంగా నిర్ధారించండి 🙏" : "Speak respectfully and verify details independently 🙏"}
              </p>
              <div className="flex gap-2.5 pt-1">
                <a
                  href={normalizedUnlockedPhone ? `tel:+${normalizedUnlockedPhone}` : undefined}
                  aria-disabled={!normalizedUnlockedPhone}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md transition aria-disabled:pointer-events-none aria-disabled:opacity-50"
                >
                  <span>📞</span>
                  <span>{te ? "డైరెక్ట్ కాల్" : "Call Now"}</span>
                </a>
                <a
                  href={unlockedWhatsAppUrl || undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-disabled={!unlockedWhatsAppUrl}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-[#25D366] hover:brightness-105 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md transition aria-disabled:pointer-events-none aria-disabled:opacity-50"
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

              {payOrder.mode === "razorpay" ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-3">
                  <p className="text-xs text-slate-700">
                    {te ? "సురక్షిత చెల్లింపు చెక్అవుట్ తెరవబడుతుంది. చెల్లింపు తర్వాత సర్వర్ ధృవీకరిస్తుంది." : "Secure checkout will open. Payment is credited only after server-side verification."}
                  </p>
                  <button type="button" onClick={handleRazorpayPayment} disabled={busy}
                    className="w-full py-3 rounded-xl bg-[#7A0C2E] text-white font-bold text-sm disabled:opacity-50">
                    {busy ? (te ? "దయచేసి వేచి ఉండండి…" : "Please wait…") : (te ? `Razorpay ద్వారా ₹${payOrder.final_amount} చెల్లించండి` : `Pay ₹${payOrder.final_amount} with Razorpay`)}
                  </button>
                </div>
              ) : payOrder.mode === "manual_upi" && payOrder.upi_id ? (
                <>
                  <div className="bg-white rounded-xl p-3 border border-slate-200 text-center space-y-2">
                    <p className="text-xs text-slate-600 font-medium">
                      {te ? "చెల్లింపు వివరాలు (UPI)" : "Manual UPI payment details"}
                    </p>
                    <p className="text-sm font-bold text-maroon break-all" aria-label="Merchant UPI ID">{payOrder.upi_id}</p>
                    <p className="text-[11px] text-slate-500">
                      {te ? "QR స్కాన్ చేసి లేదా UPI యాప్ ద్వారా చెల్లించండి. UTR సమర్పించిన తర్వాత నిర్వాహకుడు బ్యాంక్ స్టేట్‌మెంట్‌తో ధృవీకరిస్తారు." : "Scan the QR or pay using a UPI app. After you submit the UTR, an administrator must verify it against the bank statement."}
                    </p>
                    <div className="flex flex-col items-center justify-center p-2 bg-[#FFFDF7] rounded-xl border border-gold/30">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/api/pay/qr/${encodeURIComponent(payOrder.id)}.png?token=${encodeURIComponent(payOrder.qr_token || "")}`} alt="UPI payment QR code" width={140} height={140}
                        className="w-32 h-32 rounded-lg border border-slate-200" />
                    </div>
                    <a href={`upi://pay?pa=${encodeURIComponent(payOrder.upi_id)}&pn=${encodeURIComponent("Mana Vivaha")}&am=${payOrder.final_amount}&cu=INR&tn=${encodeURIComponent(`ManaVivaha ${payOrder.id}`)}`}
                      className="inline-flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl bg-[#7A0C2E] text-white font-bold text-xs">
                      📲 {te ? `UPI యాప్‌తో ₹${payOrder.final_amount} చెల్లించండి` : `Pay ₹${payOrder.final_amount} with a UPI app`}
                    </a>
                  </div>
                  {payOrder.status === "claimed" ? (
                    <div className="text-xs font-bold text-green-700 bg-green-50 p-3 rounded-xl border border-green-200" role="status">
                      {te ? "UTR సమర్పించబడింది. చెల్లింపు నిర్వాహకుడి ధృవీకరణ కోసం వేచి ఉంది." : "UTR submitted. Payment is waiting for administrator verification."}
                    </div>
                  ) : (
                    <div className="space-y-1.5 pt-1">
                      <label className="block text-xs font-bold text-slate-700" htmlFor="quick-unlock-utr">
                        {te ? "చెల్లించిన తర్వాత 12-అంకెల UTR నమోదు చేయండి:" : "Enter the 12-digit UTR after paying:"}
                      </label>
                      <div className="flex gap-2">
                        <input id="quick-unlock-utr" type="text" inputMode="numeric" maxLength={12} value={utr}
                          onChange={(e) => setUtr(e.target.value.replace(/\D/g, "").slice(0, 12))}
                          placeholder="12-digit UTR" className="min-w-0 flex-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800" />
                        <button type="button" onClick={handleSubmitUtr} disabled={utrBusy || utr.length !== 12}
                          className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs disabled:opacity-50">
                          {utrBusy ? "⏳…" : te ? "సమర్పించు" : "Submit UTR"}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-950" role="alert">
                  {te ? "చెల్లింపు provider అందుబాటులో లేదు. అధికారిక చెల్లింపు వివరాలు కనిపించే వరకు డబ్బు పంపవద్దు." : "Payment is not configured. Do not send money unless an official checkout destination is shown."}
                </div>
              )}
            </div>
          ) : paymentComplete ? (
            <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-5 text-center space-y-3" role="status">
              <div className="text-lg font-black text-emerald-900">{te ? "చెల్లింపు ధృవీకరించబడింది" : "Payment verified"}</div>
              <p className="text-sm text-emerald-900">
                {te
                  ? `${currentPkg.credits} interest-request credits మీ ఖాతాకు జమ అయ్యాయి. Interest పంపడానికి ఈ window మూసి కొనసాగండి.`
                  : `${currentPkg.credits} interest-request credits were added to your account. Close this window to continue and send an interest.`}
              </p>
              <p className="text-xs text-emerald-800">{te ? "Owner acceptance తర్వాత contact details accepted-request account views లో కనిపిస్తాయి; notification delivery హామీ లేదు." : "After owner acceptance, contact details appear in accepted-request account views; notification delivery is not guaranteed."}</p>
              <button type="button" onClick={onClose} className="w-full rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white">{te ? "కొనసాగించండి" : "Continue"}</button>
            </div>
          ) : (
            /* Choose request-credit plan */
            <div className="space-y-3">
              <div className="text-xs font-black text-slate-800">
                <span>⚡ {te ? "Interest-request credits ఎంచుకోండి:" : "Choose interest-request credits:"}</span>
              </div>

              <div className="space-y-2">
                {PACKAGES.map((pkg) => {
                  const isSelected = selectedPlan === pkg.code;
                  return (
                    <button
                      type="button"
                      key={pkg.code}
                      onClick={() => setSelectedPlan(pkg.code)}
                      aria-pressed={isSelected}
                      className={`w-full text-left cursor-pointer rounded-2xl p-3.5 border-2 transition relative flex items-center justify-between gap-3 ${
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
                                className="text-[9.5px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-700"
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
                          {pkg.credits} credits
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Promo Code Input */}
              <div className="flex gap-2 pt-1">
                <input aria-label={te ? "Promo code (optional)" : "Promo code (optional)"}
                  type="text"
                  placeholder={te ? "Promo code (optional)" : "Promo code (optional)"}
                  value={promoCode}
                  onChange={(e) => {
                    setPromoCode(e.target.value);
                    setPromoMsg("");
                  }}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono uppercase font-bold text-slate-800"
                />
                <button type="button"
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
              <button type="button"
                onClick={handleCreateOrder}
                disabled={busy}
                className="w-full py-3 px-4 rounded-2xl maroon-gradient hover:brightness-105 active:scale-98 text-white font-black text-sm shadow-lg flex items-center justify-center gap-2 transition"
              >
                <span>💳</span>
                <span>
                  {te
                    ? `${currentPkg.credits} request credits — ₹${finalPrice} చెల్లించండి`
                    : `Buy ${currentPkg.credits} request credits — Pay ₹${finalPrice}`}
                </span>
                <span>→</span>
              </button>

              <div className="flex items-center justify-center gap-4 text-[10.5px] text-slate-500 pt-1 font-semibold">
                <span>💳 Payment options</span>
                <span>•</span>
                <span>ℹ️ Confirmation after processing</span>
                <span>•</span>
                <span>🤝 Support availability varies</span>
              </div>

              {/* Direct WhatsApp Helpline & QR Assistance */}
              <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2">
                <div className="text-[11px] text-slate-600 font-medium text-center sm:text-left">
                  {te ? "చెల్లింపులో సందేహమా? WhatsApp ద్వారా support ను సంప్రదించండి:" : "Questions about payment? Contact support on WhatsApp:"}
                </div>
                {paymentHelpUrl ? (
                  <a
                    href={paymentHelpUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-1.5 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-extrabold text-xs flex items-center gap-1.5 shadow-xs transition shrink-0"
                  >
                    <span>💬</span>
                    <span>{te ? "WhatsApp లో సహాయం పొందండి" : "Get help on WhatsApp"}</span>
                  </a>
                ) : (
                  <span className="text-xs text-slate-500">WhatsApp support is unavailable.</span>
                )}
              </div>

              {/* Referral credit earning tips */}
              <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-2.5 text-[11px] text-amber-950 space-y-1">
                <div className="font-bold flex items-center gap-1">
                  <span>🎁</span> <span>{te ? "Referral ద్వారా credit పొందే అవకాశం:" : "Earn a referral credit:"}</span>
                </div>
                <div className="text-slate-600 pl-4 space-y-0.5">
                  <div>🤝 {te ? <>Valid referral attach పై కొత్త user కి <b>+1 interest-request credit</b>; referrer కు <b>+2 request credits</b> (ఇవి cash కావు). Referrer కు <b>ఒక్కసారి ₹50</b> అర్హత ఉండవచ్చు—referee మొదటి S_99/S_199/S_299/S_499 consumer-plan payment కనీసం ₹99 అయినప్పుడు మాత్రమే; exclusions మరియు manual payout review వర్తిస్తాయి.</> : <>A valid referral attachment gives the new user <b>+1 interest-request credit</b> and the referrer <b>+2 request credits</b> (not cash). The referrer may qualify for <b>₹50 once</b> only on the referee’s first S_99/S_199/S_299/S_499 consumer-plan payment of at least ₹99; exclusions and manual payout review apply.</>}</div>
                </div>
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
