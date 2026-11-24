"use client";
import "@/components/trust-workspace.css";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/lang";

export default function StatusPageClient() {
  const { lang } = useLang();
  const te = lang === "te";
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await fetch("/api/status", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.detail || "Unable to load live status.");
      setData(json);
    } catch (e: any) {
      setData(null);
      setErr(e?.message || "Unable to load live status.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const slo = data?.slo || {};
  const providers = data?.providers_honest_state || {};
  const dr = data?.last_dr_drill || null;
  const unavailable = te ? "సమాచారం లేదు" : "Unavailable";
  const hasSamples = typeof slo.sample_size === "number" && slo.sample_size > 0;
  const measuredAvailability = hasSamples && typeof slo.observed_availability_pct === "number";

  return (
    <div className="mv-trust-workspace max-w-5xl mx-auto px-4 py-8 space-y-6">
      <header className="rounded-3xl border border-amber-200/80 bg-gradient-to-br from-[#5c1224] via-[#4a1020] to-[#2c0913] text-white p-6 md:p-8 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-amber-200 font-semibold">
              {te ? "పారదర్శక సిస్టమ్ స్థితి • Phase 11–12" : "Transparent System Posture • Phase 11–12"}
            </p>
            <h1 className="text-2xl md:text-3xl font-bold mt-1 telugu">
              {te ? "మన వివాహ ప్రత్యక్ష సిస్టమ్ స్థితి" : "Mana Vivaha Live System Status"}
            </h1>
            <p className="text-sm text-amber-100/90 mt-2 max-w-2xl telugu">
              {te
                ? "ఈ పేజీ ఊహించిన uptime క్లెయిమ్‌లు చూపించదు. డేటాబేస్ సమానత్వం, ఇండెక్స్ శోధన మరియు ప్రొవైడర్ కాన్ఫిగరేషన్ నిజ స్థితిని మాత్రమే చూపుతుంది."
                : "This page reports live relational parity, rolling request health, and honest provider readiness without fabricated uptime claims."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadStatus()}
            disabled={loading}
            className="rounded-xl bg-amber-300 text-[#3c0c19] font-semibold px-4 py-2.5 text-sm hover:bg-amber-200 transition disabled:opacity-60"
          >
            {loading ? (te ? "తాజాకరిస్తోంది..." : "Refreshing...") : te ? "ఇప్పుడే తనిఖీ చేయండి" : "Refresh Live Check"}
          </button>
        </div>
      </header>

      {err && (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 text-red-900 p-4 text-sm">
          {err}
        </div>
      )}

      <p role="status" className="text-sm text-stone-600">{te ? "ఇది ప్రస్తుతం సేకరించిన request నమూనా మాత్రమే; lifetime uptime లేదా message delivery హామీ కాదు." : "This is a rolling sample of observed requests, not lifetime uptime or a message-delivery guarantee."}{data?.checked_at ? <> {te ? "తనిఖీ సమయం:" : "Checked:"} <time>{data.checked_at}</time></> : null}</p>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4" aria-label={te ? "ప్రధాన కొలమానాలు" : "Core SLO Metrics"}>
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-stone-500">
            {te ? "మొత్తం స్థితి" : "Overall Status"}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`inline-block w-3 h-3 rounded-full ${
                data?.overall_status === "operational" ? "bg-emerald-500" : "bg-amber-500"
              }`}
            />
            <span className="text-xl font-bold text-stone-900 capitalize">
              {loading ? "…" : data?.overall_status || "unknown"}
            </span>
          </div>
          <p className="text-xs text-stone-600 mt-2">
            {te ? "SQL సమానత్వం:" : "SQL Identity Parity:"}{" "}
            <strong>{data?.components?.transactional_sql_plane === "operational" ? "Verified" : data?.components?.transactional_sql_plane || unavailable}</strong>
          </p>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-stone-500">
            {te ? "లభ్యత SLO (Target 99.5%)" : "Rolling Availability SLO (Target 99.5%)"}
          </div>
          <div data-testid="status-availability" className="mt-2 text-2xl font-bold text-stone-900">
            {loading ? "…" : measuredAvailability ? `${slo.observed_availability_pct}%` : slo.sample_size === 0 ? (te ? "నమూనా లేదు" : "No samples") : unavailable}
          </div>
          <p className="text-xs text-stone-600 mt-2">
            {te ? "నమూనా అభ్యర్థనలు:" : "Observed requests in window:"} <strong>{slo.sample_size ?? "—"}</strong> • p95:{" "}
            <strong>{hasSamples && typeof slo.p95_latency_ms === "number" ? `${slo.p95_latency_ms} ms` : "—"}</strong>
          </p>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-stone-500">
            {te ? "ఇండెక్స్ చేసిన శోధన v2" : "Indexed Search Projection v2"}
          </div>
          <div data-testid="status-search" className="mt-2 text-base font-bold text-stone-900">
            {loading ? "…" : data?.components?.search_v2_projection || unavailable}
          </div>
          <p className="text-xs text-stone-600 mt-2">
            {te ? "ప్రస్తుత తనిఖీ ఇచ్చిన search projection స్థితి" : "Search projection state returned by the current check"}
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-stone-900 telugu">
          {te ? "ఇంటిగ్రేషన్ & ప్రొవైడర్ నిజ స్థితి" : "Honest Provider & Integration Readiness"}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          {[
            {
              key: "online_payment_gateway",
              labelEn: "Online Payment Gateway",
              labelTe: "ఆన్‌లైన్ పేమెంట్ గేట్‌వే",
              val: providers.online_payment_gateway,
            },
            {
              key: "sms_otp",
              labelEn: "SMS OTP Provider",
              labelTe: "SMS OTP ప్రొవైడర్",
              val: providers.sms_otp,
            },
            {
              key: "transactional_email",
              labelEn: "Transactional Email Recovery",
              labelTe: "ఇమెయిల్ రికవరీ సేవ",
              val: providers.transactional_email,
            },
            {
              key: "whatsapp_bridge",
              labelEn: "WhatsApp Notification Bridge",
              labelTe: "వాట్సాప్ బ్రిడ్జ్",
              val: providers.whatsapp_bridge,
            },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between rounded-xl border border-stone-200 p-3.5">
              <span className="font-medium text-stone-800 telugu">{te ? item.labelTe : item.labelEn}</span>
              <span
                className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  item.val === "live_configured" || item.val === "configured"
                    ? "bg-emerald-100 text-emerald-900"
                    : "bg-stone-100 text-stone-700"
                }`}
              >
                {item.val || (loading ? "checking" : unavailable)}
              </span>
            </div>
          ))}
        </div>
        <p className="text-xs text-stone-600 leading-relaxed telugu">
          {data?.honest_disclosure ||
            "Disabled integrations remain cleanly off rather than simulating fake external delivery."}
        </p>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm space-y-3">
        <h2 className="text-lg font-bold text-stone-900 telugu">
          {te ? "డిజాస్టర్ రికవరీ (DR) ధృవీకరణ రుజువు" : "Disaster-Recovery (DR) Rehearsal Proof"}
        </h2>
        {!data ? <p className="text-sm text-stone-600">{loading ? (te ? "తనిఖీ అవుతోంది…" : "Checking…") : unavailable}</p> : dr ? (
          <div className="rounded-xl bg-emerald-50/70 border border-emerald-200 p-4 text-sm space-y-1 text-stone-800">
            <div>
              <strong>Drill ID:</strong> {dr.drill_id} • <strong>Executed:</strong> {dr.at}
            </div>
            <div>
              <strong>Verified Pass:</strong> {dr.passed ? "Yes" : "No"} •{" "}
              <strong>Recovery Duration:</strong> {dr.duration_ms} ms
            </div>
          </div>
        ) : (
          <p className="text-sm text-stone-600 telugu">
            {te
              ? "ఈ ఎన్విరాన్‌మెంట్‌లో ఇంకా DR డ్రిల్ రికార్డ్ కాలేదు. నిర్వాహకులు కంట్రోల్ వర్క్‌స్పేస్ నుండి నాన్-డిస్ట్రక్టివ్ DR డ్రిల్ నడపవచ్చు."
              : "No automated DR rehearsal has been recorded in this state store yet. Operators can trigger a non-destructive backup/restore drill from the Control Workspace."}
          </p>
        )}
        <div className="pt-2 flex flex-wrap gap-3 text-sm">
          <Link href="/safety" className="text-[#7a162e] font-semibold underline">
            {te ? "Trust & Safety సెంటర్" : "Trust & Safety Center"}
          </Link>
          <Link href="/privacy" className="text-[#7a162e] font-semibold underline">
            {te ? "గోప్యతా విధానం" : "Privacy Controls"}
          </Link>
        </div>
      </section>
    </div>
  );
}
