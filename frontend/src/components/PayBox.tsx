"use client";
/**
 * 💳 WAVE 14 — SAFE-PAY BOX (pricing → order → Razorpay/manual-UPI → verify)
 * Amount SERVER computes — client amount nammamu. Secret eppudu frontend ki radhu.
 * Props: planCode (S_29..S_499), price (display), label.
 */
import { useState } from "react";
import { authHeaders } from "@/lib/api";
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

export default function PayBox({ planCode, price, label }: { planCode: string; price: number; label: string }) {
  const { lang } = useLang();
  const te = lang === "te";
  const [open, setOpen] = useState(false);
  const [offer, setOffer] = useState("");
  const [order, setOrder] = useState<any>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState("");
  const [utr, setUtr] = useState("");
  const [claimBusy, setClaimBusy] = useState(false);
  const [promo, setPromo] = useState("");
  const [promoBusy, setPromoBusy] = useState(false);

  const previewPromo = async () => {
    const code = offer.trim().toUpperCase();
    if (!code) { setPromo(te ? "ముందు offer code ఇవ్వండి" : "Enter offer code first"); return; }
    setPromoBusy(true);
    try {
      const d = await fetch(`/api/promo/apply?code=${encodeURIComponent(code)}&purpose=credits&plan=${encodeURIComponent(planCode)}&user=${encodeURIComponent(myId())}`).then((r) => r.json());
      setPromo(d.success ? String(d.message_telugu || "OK") : String(d.detail || "Invalid code"));
    } catch { setPromo(te ? "Network problem" : "Network problem"); }
    setPromoBusy(false);
  };

  const myId = () => {
    try { return localStorage.getItem("tsap_id") || ""; } catch { return ""; }
  };

  const createOrder = async () => {
    const id = myId();
    if (!id) { setMsg(te ? "⚠️ ముందు login/register చెయ్యండి (మీ Profile ID కావాలి)" : "⚠️ Login/register first (your Profile ID is needed)"); return; }
    setBusy(true); setMsg("");
    try {
      const r = await fetch("/api/pay/order", {
        method: "POST", headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ tsap_id: id, purpose: "credits", ref: planCode, offer_code: offer.trim().toUpperCase() }),
      });
      const d = await r.json();
      if (!r.ok) { setMsg(d.detail || d.message_telugu || "Order fail"); setBusy(false); return; }
      setOrder(d.pay_order);
      setMsg(d.message_telugu || "");
    } catch { setMsg(te ? "Network problem — మళ్లీ try చెయ్యండి" : "Network problem — retry"); }
    setBusy(false);
  };

  const submitClaim = async () => {
    if (!order) return;
    if (!/^\d{12}$/.test(utr.trim())) { setMsg(te ? "⚠️ UTR = 12 digits (GPay/PhonePe statement నుంచి copy చెయ్యండి)" : "⚠️ UTR = 12 digits (copy from GPay/PhonePe statement)"); return; }
    setClaimBusy(true); setMsg("");
    try {
      const r = await fetch("/api/pay/claim", {
        method: "POST", headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: order.id, utr: utr.trim() }),
      });
      const d = await r.json();
      setMsg(r.ok ? (d.message_telugu || (te ? "✅ UTR వచ్చింది!" : "✅ UTR received!")) : (d.detail || d.message_telugu || (te ? "Claim fail" : "Claim failed")));
      if (r.ok) { setOrder({ ...order, status: "claimed" }); setUtr(""); }
    } catch { setMsg(te ? "Network problem — మళ్లీ try చెయ్యండి" : "Network problem — retry"); }
    setClaimBusy(false);
  };

  const payNow = async () => {
    if (!order || busy) return;
    setBusy(true);
    if (order.mode !== "razorpay" || !order.key_id) {
      setMsg(te ? `💳 ${order.upi_id || "manavivaha@upi"} కి ₹${order.final_amount} pay చేసి — కింద UTR (12 digits) ఇవ్వండి. Admin bank statement verify చేసి confirm చేస్తాడు 🙏 (Order: ${order.id})` : `💳 Pay ₹${order.final_amount} to ${order.upi_id || "manavivaha@upi"} — enter UTR (12 digits) below. Admin verifies the bank statement and confirms 🙏 (Order: ${order.id})`);
      setBusy(false);
      return;
    }
    const ok = await loadRazorpay();
    if (!ok || !window.Razorpay) { setMsg(te ? "⚠️ Razorpay load అవ్వలేదు — UPI manual తో try చెయ్యండి" : "⚠️ Razorpay failed to load — try manual UPI"); setBusy(false); return; }
    if (!order.rzp_order_id) { setMsg(te ? "⚠️ Order ID లేదు — కొత్త order create చెయ్యండి" : "⚠️ No Order ID — create a new order"); setBusy(false); return; }
    const rzp = new window.Razorpay({
      key: order.key_id,
      order_id: order.rzp_order_id,
      amount: order.checkout_amount_paise,
      currency: "INR",
      name: "మన వివాహ",
      description: order.label || label,
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
          const d = await r.json();
          if (r.ok) { setDone(d.message_telugu || "✅ Payment success!"); setOrder(null); }
          else setMsg(d.detail || (te ? "Verify fail — amount cut అయితే support కి payment ID పంపండి" : "Verify failed — if amount was cut, send payment ID to support"));
        } catch { setMsg(te ? "Verify error — payment ID తో support ని contact చెయ్యండి" : "Verify error — contact support with payment ID"); }
        setBusy(false);
      },
      prefill: {},
      theme: { color: "#7A0C2E" },
      modal: {
        ondismiss: () => {
          setBusy(false);
          setMsg(te ? "\u2139\ufe0f Payment window close \u0c1a\u0c47\u0c36\u0c3e\u0c30\u0c41 - order 24h valid, \u0c2e\u0c33\u0c4d\u0c32\u0c40 Pay \u0c28\u0c4a\u0c15\u0c4d\u0c15\u0c3f try \u0c1a\u0c46\u0c2f\u0c4d\u0c2f\u0c02\u0c21\u0c3f \U0001f642" : "\u2139\ufe0f Payment window closed - order valid 24h, press Pay to retry \U0001f642");
        },
      },
    });
    try {
      rzp.on("payment.failed", (resp: any) => {
        setBusy(false);
        const why = resp?.error?.description || "";
        setMsg(te ? `\u274c Payment fail \u0c05\u0c2f\u0c4d\u0c2f\u0c3f\u0c02\u0c26\u0c3f${why ? ` (${why})` : ""} - \u0c21\u0c2c\u0c4d\u0c2c\u0c41\u0c32\u0c41 cut \u0c05\u0c35\u0c4d\u0c35\u0c32\u0c47\u0c26\u0c41, \u0c2e\u0c33\u0c4d\u0c32\u0c40 try \u0c1a\u0c46\u0c2f\u0c4d\u0c2f\u0c02\u0c21\u0c3f` : `\u274c Payment failed${why ? ` (${why})` : ""} - no money cut, please retry`);
      });
    } catch { /* older checkout.js - ignore */ }
    rzp.open();
  };

  if (done) return <div className="rounded-xl bg-green-50 border border-green-200 text-green-800 text-xs font-bold p-3">{done}</div>;

  if (!open)
    return (
      <button onClick={() => setOpen(true)}
        className="w-full rounded-xl bg-[#7A0C2E] text-white px-4 py-2.5 font-bold text-sm hover:bg-[#5f0923]">
        💳 {label} — Pay ₹{price}
      </button>
    );

  return (
    <div className="rounded-xl border border-[#7A0C2E]/20 bg-rose-50/50 p-3 space-y-2">
      {!order ? (
        <>
          <div className="flex gap-2">
            <input value={offer} onChange={(e) => { setOffer(e.target.value); setPromo(""); }} placeholder="Offer code (DIWALI25…)"
              className="flex-1 rounded-lg border px-3 py-2 text-xs font-mono uppercase" aria-label="Offer code" />
            <button onClick={previewPromo} disabled={promoBusy}
              className="rounded-lg border border-green-700 text-green-700 px-3 py-2 text-xs font-bold disabled:opacity-50">
              {promoBusy ? "⏳…" : te ? "🎟️ Check" : "🎟️ Check"}
            </button>
            <button onClick={createOrder} disabled={busy}
              className="rounded-lg bg-[#7A0C2E] text-white px-4 py-2 text-xs font-bold disabled:opacity-50">
              {busy ? "⏳…" : "Order →"}
            </button>
          </div>
          {promo && <p className="text-[11px] font-bold text-green-700">{promo}</p>}
          <p className="text-[11px] text-gray-500">{te ? "Amount server నుంచి fix — offer auto-apply. Secret safe 🔒" : "Amount fixed by server — offer auto-applies. Secret safe 🔒"}</p>
        </>
      ) : (
        <>
          <div className="text-xs font-bold text-[#7A0C2E]">
            Order {order.id} • ₹{order.final_amount}
            {order.discount ? <span className="ml-1 text-green-700">(−₹{order.discount} {order.offer_code})</span> : null}
            <span className="ml-1 font-normal text-gray-500">• {te ? "24h valid" : "valid 24h"}</span>
          </div>
          {order.mode !== "razorpay" && (
            <div className="text-[11px] bg-white rounded-lg p-2.5 border space-y-2">
              <div className="flex items-center justify-between">
                <span>💳 UPI ID: <b className="font-mono text-maroon">{order.upi_id || "6304996088@ybl"}</b></span>
                <span className="font-bold text-emerald-800 text-xs">₹{order.final_amount}</span>
              </div>

              {/* Dynamic Scannable UPI QR */}
              <div className="flex flex-col items-center justify-center p-2.5 bg-[#FFFDF7] rounded-xl border border-gold/30">
                <span className="text-[10px] text-gray-500 font-bold mb-1">
                  {te ? "QR కోడ్ స్కాన్ చేసి పే చేయండి (GPay / PhonePe / Paytm):" : "Scan QR code to pay:"}
                </span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/pay/qr/${order.id}.png`}
                  alt="Scan and Pay via UPI"
                  width={140}
                  height={140}
                  className="w-32 h-32 rounded-lg shadow-xs border border-slate-200"
                />
              </div>

              <a
                href={`upi://pay?pa=${encodeURIComponent(order.upi_id || "6304996088@ybl")}&pn=${encodeURIComponent("Mana Vivaha")}&am=${order.final_amount}&cu=INR&tn=${encodeURIComponent(`ManaVivaha ${order.id}`)}`}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-[#7A0C2E] hover:bg-[#911239] text-white font-bold text-xs transition shadow-xs"
              >
                <span>📲</span>
                <span>{te ? `లేదా మొబైల్ UPI యాప్‌తో పే చేయండి (₹${order.final_amount})` : `Or Pay ₹${order.final_amount} via UPI App`}</span>
              </a>
              {order.status === "claimed" ? (
                <div className="font-bold text-green-700 bg-green-50 p-2 rounded-lg border border-green-200">
                  {te ? "✅ UTR వచ్చింది — admin verify చేస్తున్నాడు, త్వరలోనే credits add 🙏" : "✅ UTR received — admin is verifying, credits soon 🙏"}
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="text-[10px] text-gray-500 font-bold">{te ? "పేమెంట్ తర్వాత 12-అంకెల UTR ఇవ్వండి:" : "Enter 12-digit UTR after payment:"}</div>
                  <div className="flex gap-2">
                    <input value={utr} onChange={(e) => setUtr(e.target.value.replace(/\D/g, "").slice(0, 12))}
                      placeholder="12-digit UTR" inputMode="numeric"
                      className="flex-1 rounded-lg border px-3 py-2 font-mono text-xs" aria-label="12-digit UTR" />
                    <button onClick={submitClaim} disabled={claimBusy || utr.length < 12}
                      className="rounded-lg bg-green-700 hover:bg-green-800 text-white px-3 py-2 font-bold text-xs disabled:opacity-50 transition shadow-xs">
                      {claimBusy ? "⏳…" : te ? "సమర్పించు" : "Submit UTR"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          <button onClick={payNow} disabled={busy}
            className="w-full rounded-lg bg-green-700 text-white px-4 py-2 text-xs font-bold disabled:opacity-50">
            {order.mode === "razorpay" ? (te ? "💳 Razorpay తో Pay" : "💳 Pay with Razorpay") : te ? "✅ Pay చేశాను — details చూడండి" : "✅ I paid — see details"}
          </button>
          <button onClick={() => { setOrder(null); setMsg(""); }} className="text-[11px] underline text-gray-500">{te ? "← Offer మార్చాలి" : "← Change offer"}</button>
        </>
      )}
      {msg && <p className="text-[11px] font-bold text-gray-700">{msg}</p>}
      <button onClick={() => { setOpen(false); setOrder(null); setMsg(""); }} className="text-[11px] underline text-gray-400">close</button>
    </div>
  );
}
