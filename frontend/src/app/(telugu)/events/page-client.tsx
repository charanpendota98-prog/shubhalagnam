"use client";

import "@/components/editorial-workspace.css";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { authHeaders, readApiJson } from "@/lib/api";
import { useLang } from "@/lib/lang";

export default function EventsPageClient() {
  const { lang } = useLang();
  const te = lang === "te";
  const [myId, setMyId] = useState("");
  const [events, setEvents] = useState<any[]>([]);
  const [bundles, setBundles] = useState<any[]>([]);
  const [portals, setPortals] = useState<any[]>([]);
  const [insights, setInsights] = useState<any>(null);
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  const [reads, setReads] = useState<Record<string, "loading" | "ready" | "failed">>({ events: "loading", bundles: "loading", portals: "loading", insights: "loading" });

  const [rsvpReview, setRsvpReview] = useState<Record<string, { count: string; consent: boolean }>>({});
  const updateRsvp = (id: string, value: Partial<{ count: string; consent: boolean }>) => setRsvpReview(previous => ({ ...previous, [id]: { ...(previous[id] || { count: "", consent: false }), ...value } }));

  // Bundle enquiry state
  const [selectedBundle, setSelectedBundle] = useState("BND-PELLI-ESSENTIALS");
  const [bundleCity, setBundleCity] = useState("Hyderabad");
  const [bundleDate, setBundleDate] = useState("2027-02-14");
  const [bundleGuests, setBundleGuests] = useState(250);
  const [bundleConsent, setBundleConsent] = useState(false);

  // Ambassador state
  const [ambDistrict, setAmbDistrict] = useState("Hyderabad");
  const [ambCommunity, setAmbCommunity] = useState("All Telugu Families");
  const [ambStatement, setAmbStatement] = useState("");

  const loadAll = useCallback(async () => {
    setReads({ events: "loading", bundles: "loading", portals: "loading", insights: "loading" });
    setEvents([]); setBundles([]); setPortals([]); setInsights(null);
    await Promise.all([
      { key: "events", url: "/api/events", field: "events", save: setEvents },
      { key: "bundles", url: "/api/bundles", field: "bundles", save: setBundles },
      { key: "portals", url: "/api/orgs", field: "portals", save: setPortals },
      { key: "insights", url: "/api/insights/demand", field: "", save: setInsights },
    ].map(async ({ key, url, field, save }) => {
      try {
        const response = await fetch(url, { cache: "no-store" });
        const data = await readApiJson<any>(response);
        if (!response.ok || data?.success !== true || (field && !Array.isArray(data[field]))) throw new Error("Unavailable");
        save(field ? data[field] : data);
        setReads(previous => ({ ...previous, [key]: "ready" }));
      } catch { setReads(previous => ({ ...previous, [key]: "failed" })); }
    }));
  }, []);

  const readNotice = (key: string) => reads[key] === "ready" ? null : (
    <div role={reads[key] === "failed" ? "alert" : "status"} className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-stone-800">
      <p>{reads[key] === "loading" ? (te ? "లోడ్ అవుతోంది…" : "Loading…") : (te ? "ఈ సమాచారం నిర్ధారించలేకపోయాం. ఖాళీ జాబితా లేదా సున్నా అని భావించవద్దు." : "This information could not be confirmed. Do not treat it as an empty list or a zero count.")}</p>
      {reads[key] === "failed" && <button type="button" className="mt-2 font-semibold underline" onClick={() => void loadAll()}>{te ? "మళ్లీ ప్రయత్నించండి" : "Try again"}</button>}
    </div>
  );

  useEffect(() => {
    try {
      const saved = (localStorage.getItem("tsap_id") || "").trim().toUpperCase();
      setMyId(saved);
    } catch {
      /* ignore */
    }
    void loadAll();
  }, [loadAll]);

  async function rsvpEvent(eventId: string) {
    if (!myId) {
      setToast(te ? "RSVP చేయడానికి ముందుగా లాగిన్ అవ్వండి." : "Sign in to your member account before submitting an RSVP.");
      return;
    }
    const review = rsvpReview[eventId];
    const count = Number(review?.count);
    if (!review?.consent || !Number.isInteger(count) || count < 1 || count > 6) {
      setToast(te ? "హాజరయ్యే వారి సంఖ్య (1–6) మరియు RSVP అనుమతిని నిర్ధారించండి." : "Review the attendee count (1–6) and explicitly confirm RSVP consent.");
      return;
    }
    setBusy(true);
    setToast("");
    try {
      const res = await fetch(`/api/events/${encodeURIComponent(eventId)}/rsvp`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ tsap_id: myId, attendee_count: count, consent_confirmed: review.consent }),
      });
      const json = await readApiJson<any>(res);
      if (!res.ok) throw new Error(json?.detail || "RSVP could not be saved.");
      setToast(json?.status === "already_registered"
        ? (te ? "ఈ ఖాతాకు RSVP ఇప్పటికే నమోదైంది. కొత్త RSVP సృష్టించలేదు." : "This account already has an RSVP. No new RSVP was created.")
        : (te ? "✅ మీ RSVP నమోదు అయింది." : "✅ Your consented RSVP has been recorded."));
      updateRsvp(eventId, { consent: false });
      await loadAll();
    } catch (e: any) {
      setToast(e?.message || "RSVP failed.");
    } finally {
      setBusy(false);
    }
  }

  async function submitBundleEnquiry(e: React.FormEvent) {
    e.preventDefault();
    if (!myId) {
      setToast(te ? "బండిల్ ఎంక్వైరీ కోసం లాగిన్ అవ్వండి." : "Please sign in before sending a wedding bundle enquiry.");
      return;
    }
    setBusy(true);
    setToast("");
    try {
      const res = await fetch("/api/bundles/enquire", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          tsap_id: myId,
          bundle_id: selectedBundle,
          city: bundleCity,
          event_date: bundleDate,
          guest_count: Number(bundleGuests) || 100,
          consent_confirmed: bundleConsent,
        }),
      });
      const json = await readApiJson<any>(res);
      if (!res.ok) throw new Error(json?.detail || "Could not submit bundle enquiry.");
      setToast(
        te
          ? `✅ వివాహ బండిల్ ఎంక్వైరీ (${json.enquiry?.enquiry_id}) పంపబడింది.`
          : `✅ Wedding bundle enquiry (${json.enquiry?.enquiry_id}) recorded.`
      );
    } catch (err: any) {
      setToast(err?.message || "Enquiry failed.");
    } finally {
      setBusy(false);
    }
  }

  async function applyAmbassador(e: React.FormEvent) {
    e.preventDefault();
    if (!myId) {
      setToast(te ? "అంబాసిడర్ దరఖాస్తు కోసం లాగిన్ అవ్వండి." : "Sign in to apply as a verified community ambassador.");
      return;
    }
    setBusy(true);
    setToast("");
    try {
      const res = await fetch("/api/ambassadors/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          tsap_id: myId,
          district: ambDistrict,
          community: ambCommunity,
          statement: ambStatement,
        }),
      });
      const json = await readApiJson<any>(res);
      if (!res.ok) throw new Error(json?.detail || "Ambassador application failed.");
      setToast(
        te
          ? `✅ అంబాసిడర్ దరఖాస్తు (${json.application?.application_id}) సమీక్షలో ఉంది.`
          : `✅ Ambassador application (${json.application?.application_id}) submitted for staff review.`
      );
      setAmbStatement("");
    } catch (err: any) {
      setToast(err?.message || "Application failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mv-editorial-workspace max-w-6xl mx-auto px-4 py-8 space-y-8">
      <header className="rounded-3xl bg-gradient-to-br from-[#5c1224] via-[#450e1c] to-[#26070f] text-white p-6 md:p-8 shadow-lg">
        <p className="text-xs uppercase tracking-widest text-amber-200 font-semibold">
          {te ? "కమ్యూనిటీ వేదికలు • వివాహ బండిల్స్ • సంఘ పోర్టల్స్" : "Community Events • Wedding Bundles • Org Portals"}
        </p>
        <h1 className="text-2xl md:text-3xl font-bold mt-1 telugu">
          {te ? "పరిచయ వేదికలు & వివాహ సేవల హబ్" : "Verified Parichaya Vedikas & Wedding Services Hub"}
        </h1>
        <p className="text-sm text-amber-100/90 mt-2 max-w-3xl telugu">
          {te
            ? "ధృవీకరించిన కుటుంబ పరిచయ వేదికలు, స్పష్టమైన వివాహ బండిల్స్ మరియు k-anonymous కమ్యూనిటీ గణాంకాలు. ఎవరి ఫోన్ నంబర్ అనుమతి లేకుండా షేర్ చేయబడదు."
            : "Verified family gatherings, transparent wedding vendor bundles, white-label association portals, and k-anonymous aggregate demand insights."}
        </p>
      </header>

      {toast && (
        <div role="status" className="rounded-2xl border border-amber-300 bg-amber-50 text-stone-900 px-4 py-3 text-sm font-medium">
          {toast}
        </div>
      )}

      {/* 1. Verified Community Events (#23) */}
      <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-bold text-stone-900 telugu">
            {te ? "ధృవీకరించిన పరిచయ వేదికలు (Community Events)" : "Verified Parichaya Vedika & Community Events"}
          </h2>
          {!myId && (
            <Link href="/login" className="text-xs font-semibold text-[#7a162e] underline">
              {te ? "RSVP కోసం లాగిన్ అవ్వండి →" : "Sign in to RSVP →"}
            </Link>
          )}
        </div>
        {reads.events !== "ready" ? readNotice("events") : events.length === 0 ? (
          <p className="text-sm text-stone-600 telugu">
            {te
              ? "ప్రస్తుతం షెడ్యూల్ చేసిన పరిచయ వేదికలు లేవు. ధృవీకరించిన నిర్వాహకులు జోడించిన వెంటనే ఇక్కడ కనిపిస్తాయి."
              : "No upcoming community events are scheduled yet. Events appear here only when published by verified organizers."}
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {events.map((ev) => (
              <div key={ev.event_id} className="rounded-2xl border border-stone-200 p-4 space-y-2 bg-stone-50/50">
                <div className="mv-editorial-actions flex items-center justify-between text-xs text-stone-500">
                  <span className="font-semibold text-[#7a162e]">{ev.city} • {ev.event_date}</span>
                  <span>{ev.mode === "online" ? "Online" : "In-Person"}</span>
                </div>
                <h3 className="font-bold text-stone-900 telugu">{te ? ev.title_te || ev.title_en : ev.title_en}</h3>
                <p className="text-xs text-stone-600">
                  {te ? "నిర్వాహకులు:" : "Organizer:"} <strong>{ev.organizer}</strong> • {ev.community_focus}
                </p>
                <div className="border-t border-stone-200 pt-3 space-y-3">
                  <p className="text-xs text-stone-600">
                    {te ? "నమోదైన RSVP ఖాతాలు:" : "Registered RSVP accounts:"} <strong>{ev.rsvp_count ?? (te ? "అందుబాటులో లేదు" : "Unavailable")}</strong> / {ev.capacity}
                  </p>
                  <p className="text-xs text-stone-600">{te ? "Capacity ఖాతా RSVPలను లెక్కిస్తుంది; హాజరయ్యే వ్యక్తుల మొత్తం కాదు. స్థలం, సమయం మరియు ఇతర ఏర్పాట్లను నిర్వాహకులతో నిర్ధారించండి." : "Capacity counts account RSVPs, not total attendees. Confirm the venue, time and other arrangements with the organizer."}</p>
                  <label className="block text-sm font-semibold text-stone-700">
                    <span>{te ? "హాజరయ్యే వారి సంఖ్య (1–6)" : "Attendees in this RSVP (1–6)"}</span>
                    <input type="number" min={1} max={6} step={1} inputMode="numeric"
                      value={rsvpReview[ev.event_id]?.count || ""}
                      onChange={e => updateRsvp(ev.event_id, { count: e.target.value, consent: false })}
                      className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2" />
                  </label>
                  <label className="flex items-start gap-2 text-sm text-stone-700">
                    <input type="checkbox" className="mt-1 shrink-0" checked={rsvpReview[ev.event_id]?.consent || false}
                      onChange={e => updateRsvp(ev.event_id, { consent: e.target.checked })} />
                    <span>{te ? "పై వేదిక మరియు నేను ఇచ్చిన హాజరు సంఖ్యను సమీక్షించాను. ఈ ఖాతా నుండి ఈ RSVP నమోదుకు నా అనుమతి ఉంది." : "I reviewed this event and the attendee count I entered. I consent to recording this RSVP from my account."}</span>
                  </label>
                  <button type="button"
                    disabled={busy || !rsvpReview[ev.event_id]?.consent || !Number.isInteger(Number(rsvpReview[ev.event_id]?.count)) || Number(rsvpReview[ev.event_id]?.count) < 1 || Number(rsvpReview[ev.event_id]?.count) > 6}
                    onClick={() => void rsvpEvent(ev.event_id)}
                    className="rounded-xl bg-[#7a162e] text-white text-xs font-semibold px-3.5 py-2 hover:bg-[#5f1023] disabled:opacity-50">
                    {te ? "అనుమతితో RSVP" : "Consented RSVP"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 2. Wedding Services Bundles (#15) */}
      <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm space-y-5">
        <div>
          <h2 className="text-xl font-bold text-stone-900 telugu">
            {te ? "వివాహ సేవల బండిల్స్ (Wedding Vendor Bundles)" : "Structured Wedding Services Bundles"}
          </h2>
          <p className="text-xs text-stone-600 mt-1 telugu">
            {te
              ? "సూచనాత్మక బడ్జెట్ పరిధి మాత్రమే; సేవా జాబితాలు ప్రొఫైల్ ధృవీకరణకు పూర్తిగా వేరు."
              : "Indicative transparent budget ranges across verified vendor categories. Service listings are independent from member verification."}
          </p>
        </div>

        {readNotice("bundles")}
        {reads.bundles === "ready" && bundles.length === 0 && <p role="status" className="text-sm text-stone-600">{te ? "ప్రస్తుతం ప్రచురించిన బండిల్స్ లేవు." : "No wedding bundles are currently published."}</p>}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {bundles.map((b) => (
            <div
              key={b.bundle_id}
              className={`rounded-2xl border p-4 space-y-2 transition ${
                selectedBundle === b.bundle_id ? "border-[#7a162e] bg-amber-50/40" : "border-stone-200"
              }`}
            >
              <div className="font-bold text-stone-900 telugu">{te ? b.title_te : b.title_en}</div>
              <div className="text-sm font-semibold text-[#7a162e]">{b.indicative_budget_inr}</div>
              <p className="text-xs text-stone-600 telugu">{te ? b.disclosure_te : b.disclosure_en}</p>
              <div className="flex flex-wrap gap-1 pt-1">
                {(b.categories || []).map((c: string) => (
                  <span key={c} className="text-[11px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-700">
                    {c}
                  </span>
                ))}
              </div>
              <button
                type="button"
                aria-pressed={selectedBundle === b.bundle_id}
                onClick={() => setSelectedBundle(b.bundle_id)}
                className="text-xs font-semibold text-[#7a162e] underline pt-1"
              >
                {selectedBundle === b.bundle_id
                  ? te ? "✓ ఎంచుకోబడింది" : "✓ Selected for enquiry"
                  : te ? "ఈ బండిల్ ఎంచుకోండి" : "Select bundle"}
              </button>
            </div>
          ))}
        </div>

        <form onSubmit={submitBundleEnquiry} className="rounded-2xl border border-stone-200 bg-stone-50 p-4 grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <label className="text-xs font-semibold text-stone-700 space-y-1">
            <span>{te ? "నగరం / జిల్లా" : "Wedding City"}</span>
            <input
              value={bundleCity}
              onChange={(e) => setBundleCity(e.target.value)}
              required
              className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs font-semibold text-stone-700 space-y-1">
            <span>{te ? "అంచనా తేదీ" : "Tentative Date"}</span>
            <input
              type="date"
              value={bundleDate}
              onChange={(e) => setBundleDate(e.target.value)}
              required
              className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs font-semibold text-stone-700 space-y-1">
            <span>{te ? "అతిథుల సంఖ్య" : "Estimated Guests"}</span>
            <input
              type="number"
              min={10}
              max={5000}
              value={bundleGuests}
              onChange={(e) => setBundleGuests(Number(e.target.value))}
              className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm"
            />
          </label>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs text-stone-700">
              <input
                type="checkbox"
                checked={bundleConsent}
                onChange={(e) => setBundleConsent(e.target.checked)}
              />
              <span>{te ? "వెండర్ సంప్రదింపుకు నా అనుమతి ఉంది" : "Share my enquiry with bundle coordinators"}</span>
            </label>
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-[#7a162e] text-white font-semibold py-2 text-xs hover:bg-[#5c1224] disabled:opacity-50"
            >
              {te ? "బండిల్ ఎంక్వైరీ పంపండి" : "Send Bundle Enquiry"}
            </button>
          </div>
        </form>
      </section>

      {/* 3. White-Label Community Organization Portals (#17) & k-Anonymous Insights (#18) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm space-y-3">
          <h2 className="text-lg font-bold text-stone-900 telugu">
            {te ? "ధృవీకరించిన సంఘ పోర్టల్స్ (Org Portals)" : "Verified Community Association Portals"}
          </h2>
          {reads.portals !== "ready" ? readNotice("portals") : portals.length === 0 ? (
            <p className="text-sm text-stone-600 telugu">
              {te
                ? "ఇంకా సంఘ పోర్టల్స్ నమోదు కాలేదు. ఆమోదం పొందిన సంఘాలు /org/[slug] వద్ద కనిపిస్తాయి."
                : "No verified association portals published yet. Approved community organizations appear here with strict owner-consent boundaries."}
            </p>
          ) : (
            <ul className="space-y-2">
              {portals.map((p) => (
                <li key={p.slug} className="mv-editorial-actions rounded-xl border border-stone-200 p-3 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-sm text-stone-900 telugu">
                      {te ? p.org_name_te || p.org_name_en : p.org_name_en}
                    </div>
                    <div className="text-xs text-stone-500">
                      {p.community_filter || "All Communities"} {p.district_focus ? `• ${p.district_focus}` : ""}
                    </div>
                  </div>
                  <Link
                    href={`/org/${encodeURIComponent(p.slug)}`}
                    className="rounded-lg bg-stone-100 px-3 py-1.5 text-xs font-semibold text-[#7a162e] hover:bg-amber-100"
                  >
                    {te ? "పోర్టల్ తెరవండి →" : "Open Portal →"}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm space-y-3">
          <h2 className="text-lg font-bold text-stone-900 telugu">
            {te ? "k-Anonymous కమ్యూనిటీ డిమాండ్ గణాంకాలు (k ≥ 5)" : "k-Anonymous Demand Insights (k ≥ 5 Floor)"}
          </h2>
          {reads.insights !== "ready" ? readNotice("insights") : <>
          <p className="text-xs text-stone-600">
            {insights?.privacy_guarantee ||
              (te ? "5 కంటే తక్కువ సభ్యుల సమూహాల గణాంకాలను చూపించరు. ఇవి సమగ్ర గణాంకాలు మాత్రమే; వ్యక్తి వివరాలు కావు." : "Counts for groups smaller than 5 members are suppressed. These are aggregate counts, not individual profile details.")}
          </p>
          <div className="text-xs text-stone-700 space-y-1">
            <div>
              <strong>{te ? "మొత్తం ఆమోదించిన ప్రొఫైల్స్:" : "Approved Pool:"}</strong>{" "}
              {insights?.total_approved_profiles ?? (te ? "అందుబాటులో లేదు" : "Unavailable")} •{" "}
              <strong>{te ? "గోప్యత కోసం దాచిన చిన్న సమూహాలు:" : "Suppressed small cohorts (<5):"}</strong>{" "}
              {typeof insights?.suppressed_small_cohorts?.districts === "number" && typeof insights?.suppressed_small_cohorts?.communities === "number"
                ? insights.suppressed_small_cohorts.districts + insights.suppressed_small_cohorts.communities
                : (te ? "అందుబాటులో లేదు" : "Unavailable")}
            </div>
            {(insights?.districts || []).length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-2">
                {insights.districts.slice(0, 6).map((d: any) => (
                  <span key={d.district} className="rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1 text-xs">
                    {d.district}: <strong>{d.approved_profiles}</strong>
                  </span>
                ))}
              </div>
            )}
          </div>
          </>}
        </section>
      </div>

      {/* 4. Phase 8 Community Ambassador Application */}
      <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-stone-900 telugu">
          {te ? "ధృవీకరించిన కమ్యూనిటీ అంబాసిడర్ దరఖాస్తు" : "Verified Community Ambassador Program"}
        </h2>
        <form onSubmit={applyAmbassador} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <label className="text-xs font-semibold text-stone-700 space-y-1">
            <span>{te ? "జిల్లా" : "District"}</span>
            <input
              value={ambDistrict}
              onChange={(e) => setAmbDistrict(e.target.value)}
              required
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs font-semibold text-stone-700 space-y-1">
            <span>{te ? "సంఘం / ప్రాంతం" : "Community Focus"}</span>
            <input
              value={ambCommunity}
              onChange={(e) => setAmbCommunity(e.target.value)}
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs font-semibold text-stone-700 space-y-1 md:col-span-3">
            <span>{te ? "మీ కుటుంబ/సేవా నేపథ్యం (కనీసం 15 అక్షరాలు)" : "How will you help families verify profiles responsibly? (min 15 chars)"}</span>
            <textarea
              value={ambStatement}
              onChange={(e) => setAmbStatement(e.target.value)}
              rows={2}
              required
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
            />
          </label>
          <div>
            <button
              type="submit"
              disabled={busy}
              className="rounded-xl bg-[#7a162e] text-white font-semibold px-4 py-2 text-xs hover:bg-[#5c1224] disabled:opacity-50"
            >
              {te ? "అంబాసిడర్‌గా దరఖాస్తు చేయండి" : "Submit Ambassador Application"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
