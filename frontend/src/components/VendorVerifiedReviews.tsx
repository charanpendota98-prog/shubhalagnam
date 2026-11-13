"use client";

import { useCallback, useEffect, useState } from "react";
import { authHeaders, readApiJson } from "@/lib/api";
import { useLang } from "@/lib/lang";

export default function VendorVerifiedReviews({ vendorId }: { vendorId: string }) {
  const { lang } = useLang();
  const te = lang === "te";
  const [myId, setMyId] = useState("");
  const [reviews, setReviews] = useState<any[]>([]);
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [quoteDate, setQuoteDate] = useState("");
  const [quoteCity, setQuoteCity] = useState("");
  const [quoteBudget, setQuoteBudget] = useState("");
  const [quoteReq, setQuoteReq] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);

  const loadReviews = useCallback(async () => {
    try {
      const r = await fetch(`/api/vendors/${encodeURIComponent(vendorId)}/reviews`);
      if (r.ok) {
        const d = await readApiJson(r);
        setReviews(d.reviews || []);
        setAvgRating(d.avg_rating ?? null);
      }
    } catch {
      /* ignore */
    }
  }, [vendorId]);

  useEffect(() => {
    try {
      setMyId(localStorage.getItem("tsap_id") || "");
    } catch {
      /* ignore */
    }
    void loadReviews();
  }, [loadReviews]);

  const requestQuote = async () => {
    if (!myId) return;
    setBusy(true);
    setToast("");
    try {
      const r = await fetch(`/api/vendors/${encodeURIComponent(vendorId)}/quote`, {
        method: "POST",
        headers: authHeaders(),
        credentials: "same-origin",
        body: JSON.stringify({
          tsap_id: myId,
          event_date: quoteDate,
          city: quoteCity,
          budget_inr: quoteBudget,
          requirements: quoteReq,
        }),
      });
      const d = await readApiJson(r);
      if (r.ok && d.success) {
        setQuoteReq("");
        setToast(te ? "✅ కొటేషన్ అభ్యర్థన నమోదైంది. ఇప్పుడు మీరు ధృవీకరించిన రివ్యూ రాయవచ్చు." : "✅ Quote request recorded. You are now eligible to post a verified enquiry review.");
      } else {
        setToast(d.detail || "Could not submit quote request.");
      }
    } finally {
      setBusy(false);
    }
  };

  const submitReview = async () => {
    if (!myId || comment.trim().length < 8) {
      setToast(te ? "రివ్యూ కనీసం 8 అక్షరాలు ఉండాలి." : "Review comment must be at least 8 characters.");
      return;
    }
    setBusy(true);
    setToast("");
    try {
      const r = await fetch(`/api/vendors/${encodeURIComponent(vendorId)}/reviews`, {
        method: "POST",
        headers: authHeaders(),
        credentials: "same-origin",
        body: JSON.stringify({ tsap_id: myId, rating, comment }),
      });
      const d = await readApiJson(r);
      if (r.ok && d.success) {
        setComment("");
        setToast(te ? "✅ మీ ధృవీకరించిన రివ్యూ ప్రచురించబడింది." : "✅ Verified member review published.");
        await loadReviews();
      } else {
        setToast(d.detail || (te ? "కొటేషన్ అడిగిన సభ్యులు మాత్రమే రివ్యూ రాయగలరు." : "Only members with a recorded quote enquiry can review this vendor."));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mt-6 bg-white rounded-3xl border border-gold/30 p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-extrabold text-maroon text-base">
            ⭐ {te ? "ధృవీకరించిన సభ్యుల రివ్యూలు & కొటేషన్" : "Structured Quote & Verified Member Reviews"}
          </h2>
          <p className="text-[12px] text-gray-600">
            {te
              ? "నకిలీ రేటింగ్‌లను నివారించేందుకు, మన వివాహ ద్వారా కొటేషన్ అడిగిన లాగిన్ సభ్యులు మాత్రమే రివ్యూ రాయగలరు."
              : "To prevent fake ratings, reviews are gated strictly to signed-in members who recorded a structured quote enquiry."}
          </p>
        </div>
        {avgRating !== null && (
          <div className="rounded-2xl bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs font-extrabold text-amber-900">
            ★ {avgRating} / 5 ({reviews.length})
          </div>
        )}
      </div>

      {toast && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs font-bold text-emerald-900">
          {toast}
        </div>
      )}

      {myId ? (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl bg-cream p-4 space-y-2">
            <div className="text-xs font-extrabold text-maroon">
              📋 {te ? "1. కొటేషన్ అడగండి" : "1. Request Structured Quote"} ({myId})
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={quoteDate}
                onChange={(e) => setQuoteDate(e.target.value)}
                aria-label="Event date"
                className="rounded-xl border border-gold/30 bg-white px-2.5 py-1.5 text-xs"
              />
              <input
                value={quoteCity}
                onChange={(e) => setQuoteCity(e.target.value)}
                placeholder={te ? "నగరం (City)" : "Event city"}
                aria-label="Event city"
                className="rounded-xl border border-gold/30 bg-white px-2.5 py-1.5 text-xs"
              />
            </div>
            <input
              value={quoteBudget}
              onChange={(e) => setQuoteBudget(e.target.value)}
              placeholder={te ? "అంచనా బడ్జెట్ (ఉదా: ₹75,000)" : "Estimated budget (e.g. ₹75,000)"}
              aria-label="Estimated budget"
              className="w-full rounded-xl border border-gold/30 bg-white px-2.5 py-1.5 text-xs"
            />
            <input
              value={quoteReq}
              onChange={(e) => setQuoteReq(e.target.value)}
              placeholder={te ? "మీ అవసరాలు (ఉదా: ముహూర్తం + రిసెప్షన్ ఫోటోగ్రఫీ)" : "Requirements (e.g. Muhurtham + Reception coverage)"}
              aria-label="Quote requirements"
              className="w-full rounded-xl border border-gold/30 bg-white px-2.5 py-1.5 text-xs"
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => void requestQuote()}
              className="rounded-xl bg-[#7A0C2E] px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
            >
              {te ? "కొటేషన్ పంపండి" : "Request Quote"}
            </button>
          </div>

          <div className="rounded-2xl bg-cream p-4 space-y-2">
            <div className="text-xs font-extrabold text-maroon">
              ✍️ {te ? "2. ధృవీకరించిన రివ్యూ రాయండి" : "2. Post Verified Enquiry Review"}
            </div>
            <select
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
              aria-label="Star rating"
              className="rounded-xl border border-gold/30 bg-white px-2.5 py-1.5 text-xs font-bold"
            >
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>{"★".repeat(n)} ({n}/5)</option>
              ))}
            </select>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder={te ? "మీ అనుభవాన్ని నిజాయితీగా పంచుకోండి…" : "Share your honest experience with this vendor…"}
              aria-label="Vendor review comment"
              className="w-full rounded-xl border border-gold/30 bg-white p-2.5 text-xs"
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => void submitReview()}
              className="rounded-xl border border-[#7A0C2E] px-4 py-2 text-xs font-bold text-[#7A0C2E] disabled:opacity-50"
            >
              {te ? "రివ్యూ ప్రచురించు" : "Publish Verified Review"}
            </button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-gray-500">
          {te ? "కొటేషన్ అడగడానికి లేదా రివ్యూ రాయడానికి మీ సభ్య ఖాతాలోకి లాగిన్ అవ్వండి." : "Sign in to your member account to request a structured quote or post a verified review."}
        </p>
      )}

      {reviews.length > 0 && (
        <div className="space-y-2 border-t border-gold/20 pt-3">
          {reviews.map((rv) => (
            <div key={rv.id} className="rounded-xl bg-cream px-3.5 py-2.5 text-xs">
              <div className="flex items-center justify-between font-bold text-maroon">
                <span>{rv.reviewer_name} ✓</span>
                <span className="text-amber-700">{"★".repeat(rv.rating || 5)}</span>
              </div>
              <p className="mt-1 text-gray-700">{rv.comment}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
