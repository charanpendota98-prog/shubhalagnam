"use client";
/**
 * 💳 WAVE 14 — SAFE-PAY BOX (pricing → order → Razorpay/manual-UPI → verify)
 * Amount SERVER computes — client amount nammamu. Secret eppudu frontend ki radhu.
 * Props: planCode (S_99..S_499), price (display), label.
 */
import { useCallback, useEffect, useState } from "react";
import { apiDisplayMessage, authHeaders, readApiJson} from "@/lib/api";
import { useLang } from "@/lib/lang";

declare global { interface Window { Razorpay?: any } }

function loadRazorpay(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((res) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => res(true);
    s.onerror = () => res(false);
    document.body.appendChild(s);
  });
}

type PayAvailability = "loading" | "available" | "unavailable" | "error";
let payAvailabilityCache: PayAvailability | null = null;

/** Reads the server's payment mode. Never guesses: loading and error are their own states. */
function usePayAvailability(): { state: PayAvailability; retry: () => void } {
  const [state, setState] = useState<PayAvailability>(payAvailabilityCache || "loading");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (payAvailabilityCache) { setState(payAvailabilityCache); return; }
    let live = true;
    setState("loading");
    fetch("/api/pay/config")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("bad status"))))
      .then((d) => {
        const mode = String(d?.mode || "");
        if (!mode) throw new Error("no mode");
        const next: PayAvailability = mode === "unconfigured" ? "unavailable" : "available";
        payAvailabilityCache = next;
        if (live) setState(next);
      })
      .catch(() => { if (live) setState("error"); });
    return () => { live = false; };
  }, [attempt]);
  const retry = useCallback(() => { payAvailabilityCache = null; setAttempt((n) => n + 1); }, []);
  return { state, retry };
}

export default function PayBox({ planCode, price, label, purpose = "credits", tsapId = "" }: { planCode: string; price: number; label: string; purpose?: "credits" | "boost"; tsapId?: string }) {
  const { lang } = useLang();
  const te = lang === "te";
  const displayLabel = te ? label : apiDisplayMessage(label, false, "Payment");
  const availability = usePayAvailability();
  const [open, setOpen] = useState(false);
  const [offer, setOffer] = useState("");
  const [order, setOrder] = useState<any>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState("");
  const [utr, setUtr] = useState("");
  const [claimBusy, setClaimBusy] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);
  const [promo, setPromo] = useState("");
  const [promoBusy, setPromoBusy] = useState(false);

  const previewPromo = async () => {
    const code = offer.trim().toUpperCase();
    if (!code) { setPromo(te ? "ముందుగా ఆఫర్ కోడ్ ఇవ్వండి" : "Enter offer code first"); return; }
    setPromoBusy(true);
    try {
      const d = await fetch(`/api/promo/apply?code=${encodeURIComponent(code)}&purpose=${encodeURIComponent(purpose)}&plan=${encodeURIComponent(planCode)}&user=${encodeURIComponent(myId())}`).then((r) => readApiJson(r));
      setPromo(apiDisplayMessage(d, te, d.success
        ? (te ? "ఆఫర్ కోడ్ వర్తింపజేశాం." : "Offer code applied.")
        : (te ? "చెల్లుబాటు అయ్యే ఆఫర్ కోడ్ కాదు." : "This offer code is not valid.")));
    } catch { setPromo(te ? "అనుసంధాన సమస్య. మళ్లీ ప్రయత్నించండి." : "Network problem"); }
    setPromoBusy(false);
  };

  const myId = () => {
    if (tsapId.trim()) return tsapId.trim().toUpperCase();
    try { return localStorage.getItem("tsap_id") || ""; } catch { return ""; }
  };

  const createOrder = async () => {
    const id = myId();
    if (!id) { setMsg(te ? "ముందుగా ఖాతాలోకి ప్రవేశించండి లేదా నమోదు చేసుకోండి. మీ ప్రొఫైల్ ఐడీ అవసరం." : "⚠️ Login/register first (your Profile ID is needed)"); return; }
    setBusy(true); setMsg("");
    try {
      const r = await fetch("/api/pay/order", {
        method: "POST", headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ tsap_id: id, purpose, ref: planCode, offer_code: offer.trim().toUpperCase() }),
      });
      const d = await readApiJson(r);
      if (!r.ok) {
        setMsg(apiDisplayMessage(d, te, te ? "ఆర్డర్‌ను సృష్టించలేకపోయాం. మళ్లీ ప్రయత్నించండి." : "The order could not be created. Please try again."));
        setBusy(false);
        return;
      }
      setOrder(d.pay_order);
      setMsg(apiDisplayMessage(d, te, ""));
    } catch { setMsg(te ? "అనుసంధాన సమస్య. మళ్లీ ప్రయత్నించండి." : "Network problem — retry"); }
    setBusy(false);
  };

  const submitClaim = async () => {
    if (!order) return;
    if (!/^\d{12}$/.test(utr.trim())) { setMsg(te ? "UTRలో 12 అంకెలు ఉండాలి. GPay లేదా PhonePe చెల్లింపు వివరాల నుంచి తీసుకోండి." : "⚠️ UTR = 12 digits (copy from GPay/PhonePe statement)"); return; }
    setClaimBusy(true); setMsg("");
    try {
      const r = await fetch("/api/pay/claim", {
        method: "POST", headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: order.id, utr: utr.trim() }),
      });
      const d = await readApiJson(r);
      setMsg(apiDisplayMessage(d, te, r.ok
        ? (te ? "✅ UTR నమోదు అయింది." : "✅ UTR submitted.")
        : (te ? "UTR నమోదు కాలేదు. మళ్లీ ప్రయత్నించండి." : "The UTR could not be submitted. Please try again.")));
      if (r.ok) { setOrder({ ...order, status: "claimed" }); setUtr(""); }
    } catch { setMsg(te ? "అనుసంధాన సమస్య. మళ్లీ ప్రయత్నించండి." : "Network problem — retry"); }
    setClaimBusy(false);
  };

  const refreshStatus = async () => {
    if (!order || statusBusy) return;
    setStatusBusy(true);
    try {
      const r = await fetch(`/api/pay/status/${encodeURIComponent(order.id)}`, { headers: authHeaders() });
      const d = await readApiJson(r);
      if (!r.ok) throw new Error(apiDisplayMessage(d, te, te ? "ఆర్డర్ స్థితి తెలియడం లేదు." : "The order status is unavailable."));
      const next = d.order || {};
      setOrder({ ...order, ...next, qr_token: order.qr_token || next.qr_token });
      if (next.status === "paid") setDone(te ? "చెల్లింపు నిర్ధారించాం. క్రెడిట్లు జమ చేశాం." : "✅ Payment verified — credits added.");
      else setMsg(te ? `ప్రస్తుత ఆర్డర్ స్థితి: ${({ pending: "వేచి ఉంది", created: "సృష్టించాం", claimed: "పరిశీలనలో ఉంది", paid: "చెల్లింపు పూర్తయింది", failed: "విఫలమైంది", expired: "గడువు ముగిసింది" } as Record<string, string>)[next.status] || next.status || "వేచి ఉంది"}` : `ℹ️ Current order status: ${next.status || "pending"}`);
    } catch (e: any) {
      setMsg(e?.message || (te ? "ప్రస్తుత స్థితిని తెలుసుకోలేకపోయాం." : "Status refresh failed."));
    } finally {
      setStatusBusy(false);
    }
  };

  const payNow = async () => {
    if (!order || busy) return;
    setBusy(true);
    if (order.mode === "manual_upi") {
      if (!order.upi_id) {
        setMsg(te ? "చెల్లింపు వివరాలు అందుబాటులో లేవు. డబ్బు పంపవద్దు; తర్వాత మళ్లీ ప్రయత్నించండి." : "Payment destination is not configured. Do not send money; try again later.");
      } else {
        setMsg(te ? `₹${order.final_amount}ను కింద చూపిన వ్యాపారి UPI IDకి చెల్లించి, చెల్లింపు వివరాల్లోని UTR నమోదు చేయండి. నిర్వాహకులు నిర్ధారించిన తర్వాతే ఆర్డర్ పూర్తవుతుంది. (ఆర్డర్: ${order.id})` : `Pay ₹${order.final_amount} to the configured merchant UPI ID shown below, then enter the UTR from your statement. The order completes only after admin verification. (Order: ${order.id})`);
      }
      setBusy(false);
      return;
    }
    if (order.mode !== "razorpay" || !order.key_id) {
      setMsg(te ? "చెల్లింపు సేవ అందుబాటులో లేదు. డబ్బు పంపవద్దు; తర్వాత మళ్లీ ప్రయత్నించండి." : "No payment provider is available. Do not send money; try again later.");
      setBusy(false);
      return;
    }
    const ok = await loadRazorpay();
    if (!ok || !window.Razorpay) { setMsg(te ? "Razorpay తెరుచుకోలేదు. మళ్లీ ప్రయత్నించండి లేదా చూపించిన UPI మార్గాన్ని ఉపయోగించండి." : "⚠️ Razorpay failed to load — try manual UPI"); setBusy(false); return; }
    if (!order.rzp_order_id) { setMsg(te ? "ఆర్డర్ ఐడీ లేదు. కొత్త ఆర్డర్‌ను సృష్టించండి." : "⚠️ No Order ID — create a new order"); setBusy(false); return; }
    const rzp = new window.Razorpay({
      key: order.key_id,
      order_id: order.rzp_order_id,
      amount: order.checkout_amount_paise,
      currency: "INR",
      name: te ? "మన వివాహ" : "Mana Vivaha",
      description: te
        ? (order.label || label)
        : apiDisplayMessage({ message_en: order.label_en, message: order.label || displayLabel }, false, displayLabel),
      handler: async (resp: any) => {
        setBusy(true);
        try {
          const r = await fetch("/api/pay/verify", {
            method: "POST", headers: { ...authHeaders(), "Content-Type": "application/json" },
            body: JSON.stringify({
              order_id: order.id, razorpay_order_id: resp.razorpay_order_id || "",
              razorpay_payment_id: resp.razorpay_payment_id, razorpay_signature: resp.razorpay_signature,
            }),
          });
          const d = await readApiJson(r);
          if (r.ok) {
            setDone(apiDisplayMessage(d, te, te ? "✅ చెల్లింపు నిర్ధారించబడింది." : "✅ Payment confirmed."));
            setOrder(null);
          } else {
            setMsg(apiDisplayMessage(d, te, te
              ? "చెల్లింపును నిర్ధారించలేకపోయాం. ఖాతా నుంచి డబ్బు తగ్గితే, చెల్లింపు ఐడీతో సహాయ బృందాన్ని సంప్రదించండి."
              : "Payment could not be verified. If money was debited, contact support with the payment ID."));
          }
        } catch { setMsg(te ? "చెల్లింపు నిర్ధారణలో సమస్య వచ్చింది. చెల్లింపు ఐడీతో సహాయ బృందాన్ని సంప్రదించండి." : "Verify error — contact support with payment ID"); }
        setBusy(false);
      },
      prefill: {},
      theme: { color: "#7A0C2E" },
      modal: {
        ondismiss: () => {
          setBusy(false);
          setMsg(te ? "చెల్లింపు కిటికీ మూసివేశారు. ఆర్డర్ గడువు 24 గంటలు. మళ్లీ ప్రయత్నించేందుకు చెల్లింపు బటన్ నొక్కండి." : "Payment window closed. The order is valid for 24 hours. Press Pay to retry.");
        },
      },
    });
    try {
      rzp.on("payment.failed", (resp: any) => {
        setBusy(false);
        const rawWhy = resp?.error?.description || "";
        const why = te ? rawWhy : apiDisplayMessage(rawWhy, false, "");
        setMsg(te ? `చెల్లింపు పూర్తి కాలేదు${why ? ` (${why})` : ""}. మళ్లీ ప్రయత్నించే ముందు మీ బ్యాంక్ స్థితి చూడండి. ఖాతా నుంచి డబ్బు తగ్గితే, చెల్లింపు ఐడీతో సహాయ బృందాన్ని సంప్రదించండి.` : `Payment did not complete${why ? ` (${why})` : ""}. Check your bank status before retrying. If money was debited, contact support with the payment ID.`);
      });
    } catch { /* older checkout.js - ignore */ }
    rzp.open();
  };

  if (done) return <div className="rounded-xl bg-green-50 border border-green-200 text-green-800 text-xs font-bold p-3">{done}</div>;

  if (availability.state !== "available" && !order) {
    if (availability.state === "loading") return (
      <div role="status" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-600">
        {te ? "చెల్లింపు అందుబాటును చూస్తున్నాం…" : "Checking whether payment is open…"}
      </div>
    );
    if (availability.state === "error") return (
      <div role="status" className="w-full rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
        <div className="font-semibold">{te ? "చెల్లింపు అందుబాటును తనిఖీ చేయలేకపోయాం." : "We could not check whether payment is open."}</div>
        <button type="button" onClick={availability.retry} className="mt-2 min-h-11 rounded-lg border border-amber-700 bg-white px-4 text-sm font-bold text-amber-900">
          {te ? "మళ్లీ ప్రయత్నించండి" : "Try again"}
        </button>
      </div>
    );
    return (
      <div role="status" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700">
        <div className="font-semibold">{displayLabel} · ₹{price}</div>
        <div className="mt-1">{te ? "చెల్లింపులు ఇంకా ప్రారంభం కాలేదు. ధర సూచన కోసం మాత్రమే. ఇప్పుడు డబ్బు పంపవద్దు." : "Payments are not open yet. The price is shown for reference only. Please do not send money."}</div>
      </div>
    );
  }

  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)}
        className="w-full rounded-xl bg-[#7A0C2E] text-white px-4 py-2.5 font-bold text-sm hover:bg-[#5f0923]">
        {displayLabel} · {te ? `₹${price} చెల్లించండి` : `Pay ₹${price}`}
      </button>
    );

  return (
    <div className="rounded-xl border border-[#7A0C2E]/20 bg-rose-50/50 p-3 space-y-2">
      {!order ? (
        <>
          <div className="grid grid-cols-2 gap-2">
            <input value={offer} onChange={(e) => { setOffer(e.target.value); setPromo(""); }} placeholder={te ? "ఆఫర్ కోడ్ ఉంటే నమోదు చేయండి" : "Enter an offer code if you have one"}
              className="col-span-2 w-full min-w-0 rounded-lg border px-3 py-2 text-xs font-mono uppercase" aria-label={te ? "ఆఫర్ కోడ్" : "Offer code"} />
            <button type="button" onClick={previewPromo} disabled={promoBusy}
              className="col-span-2 min-h-11 min-w-0 rounded-lg border border-green-700 text-green-700 px-3 py-2 text-xs font-bold disabled:opacity-50">
              {promoBusy ? "…" : te ? "తనిఖీ చేయండి" : "Check"}
            </button>
            <button type="button" onClick={createOrder} disabled={busy}
              className="col-span-2 min-h-11 min-w-0 rounded-lg bg-[#7A0C2E] text-white px-4 py-2 text-xs font-bold disabled:opacity-50">
              {busy ? "…" : te ? "ఆర్డర్ సృష్టించండి →" : "Order →"}
            </button>
          </div>
          {promo && <p className="text-[11px] font-bold text-green-700">{promo}</p>}
          <p className="text-[11px] text-gray-500">{te ? "చెల్లించాల్సిన మొత్తాన్ని మా సర్వర్ నిర్ణయిస్తుంది. ఆఫర్ ఉంటే వర్తింపజేస్తుంది. రహస్య చెల్లింపు సమాచారం ఇక్కడ చూపించం." : "Amount fixed by server — offer auto-applies. Secret safe 🔒"}</p>
        </>
      ) : (
        <>
          <div className="text-xs font-bold text-[#7A0C2E]">
            {te ? "ఆర్డర్" : "Order"} {order.id} • ₹{order.final_amount}
            {order.discount ? <span className="ml-1 text-green-700">(−₹{order.discount} {order.offer_code})</span> : null}
            <span className="ml-1 font-normal text-gray-500">• {te ? "గడువు 24 గంటలు" : "valid 24h"}</span>
          </div>
          {order.mode === "manual_upi" && order.upi_id && (
            <div className="text-[11px] bg-white rounded-lg p-2.5 border space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-maroon text-xs">🔒 {te ? "సురక్షిత ఆన్‌లైన్ చెల్లింపు" : "Secure Online Payment"}</span>
                <span className="font-bold text-emerald-800 text-xs">₹{order.final_amount}</span>
              </div>

              {/* Dynamic Scannable UPI QR */}
              <div className="flex flex-col items-center justify-center p-2.5 bg-[#FFFDF7] rounded-xl border border-gold/30">
                <span className="text-[10px] text-gray-500 font-bold mb-1">
                  {te ? "QR కోడ్ స్కాన్ చేసి చెల్లించండి (GPay / PhonePe / Paytm):" : "Scan QR code to pay:"}
                </span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/pay/qr/${encodeURIComponent(order.id)}.png?token=${encodeURIComponent(order.qr_token || "")}`}
                  alt={te ? "UPI చెల్లింపు కోసం QR కోడ్" : "Scan and Pay via UPI"}
                  width={140}
                  height={140}
                  className="w-32 h-32 rounded-lg shadow-xs border border-slate-200"
                />
              </div>

              <LocaleAnchor
                href={`upi://pay?pa=${encodeURIComponent(order.upi_id)}&pn=${encodeURIComponent("Mana Vivaha")}&am=${order.final_amount}&cu=INR&tn=${encodeURIComponent(`ManaVivaha ${order.id}`)}`}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-[#7A0C2E] hover:bg-[#911239] text-white font-bold text-xs transition shadow-xs"
              >
                <span>📲</span>
                <span>{te ? `మొబైల్ UPI యాప్‌తో చెల్లించండి (₹${order.final_amount})` : `Pay ₹${order.final_amount} via UPI App`}</span>
              </LocaleAnchor>
              {order.status === "claimed" ? (
                <div className="font-bold text-green-700 bg-green-50 p-2 rounded-lg border border-green-200">
                  {te ? "UTR అందింది. నిర్వాహకుల పరిశీలనలో ఉంది. చెల్లింపు నిర్ధారణ తర్వాతే క్రెడిట్లు జమ అవుతాయి." : "✅ UTR received — admin is verifying, credits soon 🙏"}
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="text-[10px] text-gray-500 font-bold">{te ? "చెల్లింపు తర్వాత 12 అంకెల UTR ఇవ్వండి:" : "Enter 12-digit UTR after payment:"}</div>
                  <div className="flex flex-col gap-2">
                    <input value={utr} onChange={(e) => setUtr(e.target.value.replace(/\D/g, "").slice(0, 12))}
                      placeholder={te ? "12 అంకెల UTR" : "12-digit UTR"} inputMode="numeric"
                      className="w-full min-w-0 rounded-lg border px-3 py-2 font-mono text-xs" aria-label={te ? "12 అంకెల UTR" : "12-digit UTR"} />
                    <button type="button" onClick={submitClaim} disabled={claimBusy || utr.length < 12}
                      className="rounded-lg bg-green-700 hover:bg-green-800 text-white px-3 py-2 font-bold text-xs disabled:opacity-50 transition shadow-xs">
                      {claimBusy ? "⏳…" : te ? "సమర్పించు" : "Submit UTR"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          <button type="button" onClick={refreshStatus} disabled={statusBusy}
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50">
            {statusBusy ? (te ? "స్థితిని తెలుసుకుంటున్నాం…" : "Checking status…") : (te ? "చెల్లింపు స్థితిని మళ్లీ చూడండి" : "↻ Refresh payment status")}
          </button>
          <button type="button" onClick={payNow} disabled={busy}
            className="w-full rounded-lg bg-[#7A0C2E] hover:bg-[#911239] text-white px-4 py-2.5 text-xs font-black shadow-md transition disabled:opacity-50">
            {order.mode === "razorpay" ? (te ? "Razorpayతో చెల్లించండి (కార్డులు/UPI/నెట్ బ్యాంకింగ్)" : "💳 Pay with Razorpay (Cards/UPI/NetBanking)") : te ? "ఆన్‌లైన్ చెల్లింపు పూర్తి చేయండి" : "💳 Complete Payment"}
          </button>
          <button type="button" onClick={() => { setOrder(null); setMsg(""); }} className="text-[11px] underline text-gray-500">{te ? "← ఆఫర్ మార్చండి" : "← Change offer"}</button>
        </>
      )}
      {msg && <p className="text-[11px] font-bold text-gray-700">{msg}</p>}
      <button type="button" onClick={() => { setOpen(false); setOrder(null); setMsg(""); }} className="text-[11px] underline text-gray-400">{te ? "మూసివేయండి" : "close"}</button>
    </div>
  );
}

import LocaleAnchor from "@/components/LocaleAnchor";
