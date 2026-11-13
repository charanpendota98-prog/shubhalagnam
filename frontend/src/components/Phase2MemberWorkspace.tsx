"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { authHeaders, readApiJson } from "@/lib/api";
import { useLang } from "@/lib/lang";

export default function Phase2MemberWorkspace({
  myId,
  mode,
}: {
  myId: string;
  mode: "alerts" | "security_links";
}) {
  const { lang } = useLang();
  const te = lang === "te";
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");

  // Alerts & Saved-Search Digest
  const [digestData, setDigestData] = useState<any>(null);
  const [alertEnabled, setAlertEnabled] = useState(false);
  const [alertFreq, setAlertFreq] = useState("weekly");
  const [quietStart, setQuietStart] = useState("21:00");
  const [quietEnd, setQuietEnd] = useState("08:00");

  // Devices & Sessions + Elder Review Links + Appointments
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const [deviceLabel, setDeviceLabel] = useState("My Browser");
  const [links, setLinks] = useState<any[]>([]);
  const [linkLabel, setLinkLabel] = useState("Family Elder Review");
  const [ttlHours, setTtlHours] = useState(72);
  const [latestSharePath, setLatestSharePath] = useState("");
  const [appointments, setAppointments] = useState<any[]>([]);
  const [aptDate, setAptDate] = useState("");
  const [aptSlot, setAptSlot] = useState("evening_17_19");
  const [aptTopic, setAptTopic] = useState("profile_shortlist_guidance");
  const [aptNotes, setAptNotes] = useState("");

  const loadData = useCallback(async () => {
    if (!myId) return;
    const h = authHeaders();
    try {
      if (mode === "alerts") {
        const r = await fetch(`/api/me/${encodeURIComponent(myId)}/saved-search-digest`, {
          headers: h,
          credentials: "same-origin",
        });
        if (r.ok) {
          const d = await readApiJson(r);
          setDigestData(d);
          if (d?.preferences) {
            setAlertEnabled(Boolean(d.preferences.enabled));
            setAlertFreq(d.preferences.frequency === "daily" ? "daily" : "weekly");
            setQuietStart(d.preferences.quiet_hours_start || "21:00");
            setQuietEnd(d.preferences.quiet_hours_end || "08:00");
          }
        }
      } else {
        const [sr, lr, ar] = await Promise.all([
          fetch(`/api/me/${encodeURIComponent(myId)}/sessions`, { headers: h, credentials: "same-origin" }),
          fetch(`/api/me/${encodeURIComponent(myId)}/review-links`, { headers: h, credentials: "same-origin" }),
          fetch(`/api/appointments/${encodeURIComponent(myId)}`, { headers: h, credentials: "same-origin" }),
        ]);
        if (sr.ok) setSessionInfo(await readApiJson(sr));
        if (lr.ok) setLinks((await readApiJson(lr)).links || []);
        if (ar.ok) setAppointments((await readApiJson(ar)).appointments || []);
      }
    } catch {
      /* ignore */
    }
  }, [myId, mode]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const saveAlertPrefs = async (nextEnabled: boolean) => {
    setBusy(true);
    setToast("");
    try {
      const r = await fetch(`/api/me/${encodeURIComponent(myId)}/alert-preferences`, {
        method: "POST",
        headers: authHeaders(),
        credentials: "same-origin",
        body: JSON.stringify({
          enabled: nextEnabled,
          frequency: nextEnabled ? alertFreq : "off",
          quiet_hours_start: quietStart,
          quiet_hours_end: quietEnd,
        }),
      });
      if (r.ok) {
        setAlertEnabled(nextEnabled);
        setToast(
          nextEnabled
            ? (te ? "✅ సేవ్ చేసిన శోధన అలర్ట్‌లు ఆన్ అయ్యాయి." : "✅ Opt-in saved-search digest alerts enabled.")
            : (te ? "✅ అలర్ట్‌లు ఆఫ్ చేయబడ్డాయి." : "✅ Saved-search alerts turned off."),
        );
        await loadData();
      }
    } finally {
      setBusy(false);
    }
  };

  const registerCookieSession = async () => {
    setBusy(true);
    setToast("");
    try {
      const r = await fetch(`/api/me/${encodeURIComponent(myId)}/sessions/register`, {
        method: "POST",
        headers: authHeaders(),
        credentials: "same-origin",
        body: JSON.stringify({ device_label: deviceLabel, enable_cookie: true }),
      });
      if (r.ok) {
        setToast(te ? "✅ ఈ బ్రౌజర్ HttpOnly కుకీ సెషన్‌తో నమోదైంది." : "✅ Registered current device with HttpOnly session cookie protection.");
        await loadData();
      }
    } finally {
      setBusy(false);
    }
  };

  const revokeOneSession = async (sessionId: string) => {
    setBusy(true);
    try {
      const r = await fetch(`/api/me/${encodeURIComponent(myId)}/sessions/${encodeURIComponent(sessionId)}/revoke`, {
        method: "POST",
        headers: authHeaders(),
        credentials: "same-origin",
      });
      if (r.ok) {
        setToast(te ? `✅ సెషన్ ${sessionId} రద్దు చేయబడింది.` : `✅ Session ${sessionId} revoked.`);
        await loadData();
      }
    } finally {
      setBusy(false);
    }
  };

  const revokeEverywhere = async () => {
    if (!window.confirm(te ? "అన్ని పరికరాల నుండి వెంటనే లాగౌట్ చేయమంటారా?" : "Sign out all devices and sessions immediately?")) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/me/${encodeURIComponent(myId)}/sessions/revoke-all`, {
        method: "POST",
        headers: authHeaders(),
        credentials: "same-origin",
      });
      if (r.ok) {
        try {
          localStorage.removeItem("tsap_token");
        } catch {
          /* ignore */
        }
        setToast(te ? "✅ అన్ని పరికరాల సెషన్లు రద్దు చేయబడ్డాయి. మళ్లీ లాగిన్ అవ్వండి." : "✅ All device tokens revoked. Please sign in again.");
      }
    } finally {
      setBusy(false);
    }
  };

  const createElderLink = async () => {
    setBusy(true);
    setToast("");
    try {
      const r = await fetch(`/api/me/${encodeURIComponent(myId)}/review-links`, {
        method: "POST",
        headers: authHeaders(),
        credentials: "same-origin",
        body: JSON.stringify({ label: linkLabel, ttl_hours: ttlHours, max_views: 15 }),
      });
      const d = await readApiJson(r);
      if (r.ok && d?.review_link) {
        const fullUrl = `${window.location.origin}${d.review_link.share_path}`;
        setLatestSharePath(fullUrl);
        navigator.clipboard?.writeText(fullUrl).catch(() => {});
        setToast(te ? "✅ ప్రైవేట్ రివ్యూ లింక్ సిద్ధమై కాపీ చేయబడింది." : "✅ Private elder review link created & copied to clipboard.");
        await loadData();
      }
    } finally {
      setBusy(false);
    }
  };

  const revokeElderLink = async (linkId: string) => {
    setBusy(true);
    try {
      const r = await fetch(`/api/me/${encodeURIComponent(myId)}/review-links/${encodeURIComponent(linkId)}/revoke`, {
        method: "POST",
        headers: authHeaders(),
        credentials: "same-origin",
      });
      if (r.ok) {
        setToast(te ? "✅ రివ్యూ లింక్ వెంటనే రద్దు చేయబడింది." : "✅ Review link revoked immediately.");
        await loadData();
      }
    } finally {
      setBusy(false);
    }
  };

  const submitAppointment = async () => {
    if (!aptDate) {
      setToast(te ? "దయచేసి తేదీని ఎంచుకోండి." : "Please pick a preferred date.");
      return;
    }
    setBusy(true);
    try {
      const r = await fetch("/api/appointments/book", {
        method: "POST",
        headers: authHeaders(),
        credentials: "same-origin",
        body: JSON.stringify({
          tsap_id: myId,
          preferred_date: aptDate,
          preferred_slot: aptSlot,
          language: te ? "te" : "en",
          topic: aptTopic,
          family_notes: aptNotes,
        }),
      });
      const d = await readApiJson(r);
      if (r.ok && d.success) {
        setAptNotes("");
        setToast(te ? `✅ కన్సల్టేషన్ స్లాట్ అభ్యర్థన నమోదైంది (${d.appointment?.appointment_id}).` : `✅ Assisted consultation request booked (${d.appointment?.appointment_id}).`);
        await loadData();
      } else {
        setToast(d?.detail || "Could not book consultation.");
      }
    } finally {
      setBusy(false);
    }
  };

  if (mode === "alerts") {
    return (
      <section className="mv-surface mv-surface__body space-y-4">
        {toast && <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3.5 py-2 text-xs font-bold text-emerald-900">{toast}</div>}

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-extrabold text-[#7A0C2E]">
              🔔 {te ? "సేవ్ చేసిన శోధన అలర్ట్స్ & డైజెస్ట్" : "Saved-Search Opt-In Digest & Quiet Hours"}
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              {te
                ? "మీ అనుమతి లేకుండా అలర్ట్‌లు పంపబడవు. రాత్రి నిశ్శబ్ద సమయాల్లో (Quiet Hours) నోటిఫికేషన్‌లు ఆపివేయబడతాయి."
                : "Strictly opt-in: alerts default to off, honor IST quiet hours, and can be disabled in one tap."}
            </p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${alertEnabled ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>
            {alertEnabled ? (te ? "ఆన్‌లో ఉంది" : "Opted In") : (te ? "ఆఫ్‌లో ఉంది" : "Off by Default")}
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 rounded-2xl bg-slate-50 p-3.5 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">{te ? "ఫ్రీక్వెన్సీ" : "Digest Frequency"}</label>
            <select
              value={alertFreq}
              onChange={(e) => setAlertFreq(e.target.value)}
              aria-label="Alert frequency"
              className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 font-bold"
            >
              <option value="weekly">{te ? "వారానికి ఒకసారి (Weekly)" : "Weekly Digest"}</option>
              <option value="daily">{te ? "రోజువారీ (Daily)" : "Daily Digest"}</option>
            </select>
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">{te ? "నిశ్శబ్ద సమయం ప్రారంభం (IST)" : "Quiet Hours Start (IST)"}</label>
            <input
              type="time"
              value={quietStart}
              onChange={(e) => setQuietStart(e.target.value)}
              aria-label="Quiet hours start"
              className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 font-bold"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">{te ? "నిశ్శబ్ద సమయం ముగింపు (IST)" : "Quiet Hours End (IST)"}</label>
            <input
              type="time"
              value={quietEnd}
              onChange={(e) => setQuietEnd(e.target.value)}
              aria-label="Quiet hours end"
              className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 font-bold"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void saveAlertPrefs(true)}
            className="rounded-xl bg-[#7A0C2E] px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
          >
            {te ? "అలర్ట్‌లను ఆన్ / సేవ్ చేయి" : "Save & Enable Opt-In Alerts"}
          </button>
          {alertEnabled && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void saveAlertPrefs(false)}
              className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-800 disabled:opacity-50"
            >
              {te ? "1-క్లిక్ ఆఫ్ చేయి" : "1-Tap Unsubscribe"}
            </button>
          )}
          <Link href="/matches" className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700">
            {te ? "మ్యాచెస్ పేజీలో శోధన సేవ్ చేయండి →" : "Manage Saved Searches on Matches →"}
          </Link>
        </div>

        <div className="border-t border-slate-100 pt-3 space-y-2">
          <h3 className="text-xs font-extrabold uppercase text-slate-500">
            {te ? "మీ సేవ్ చేసిన శోధనల తాజా డైజెస్ట్" : "Current Saved-Search Preview Digest"}
          </h3>
          {(digestData?.digests || []).length === 0 ? (
            <p className="text-xs text-slate-500">
              {te ? "ఇంకా సేవ్ చేసిన శోధనలు లేవు. Matches పేజీలో ఫిల్టర్లు ఎంచుకుని Save Search నొక్కండి." : "No saved searches yet. Save a filter combination on the Matches page to see matching profiles here."}
            </p>
          ) : (
            <div className="space-y-2">
              {digestData.digests.map((dg: any, idx: number) => (
                <div key={dg.search_id || idx} className="rounded-2xl border border-slate-200 p-3 text-xs space-y-2">
                  <div className="flex items-center justify-between font-bold text-[#7A0C2E]">
                    <span>🔖 {dg.name}</span>
                    <span>{dg.match_count} {te ? "సరిపోలే ప్రొఫైల్స్" : "matching profiles"}</span>
                  </div>
                  {(dg.sample_profiles || []).length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {dg.sample_profiles.map((sp: any) => (
                        <Link
                          key={sp.tsap_id}
                          href={`/search/${encodeURIComponent(sp.tsap_id)}`}
                          className="rounded-xl bg-[#FAF7F2] border border-gold/30 px-2.5 py-1 font-semibold text-slate-800 hover:border-[#7A0C2E]"
                        >
                          {sp.first_name} ({sp.tsap_id}) • {sp.district}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-5">
      {toast && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3.5 py-2 text-xs font-bold text-emerald-900">
          {toast}
        </div>
      )}

      {/* 1. Sessions & Cookie Security */}
      <section className="mv-surface mv-surface__body space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-extrabold text-[#7A0C2E]">
              🔐 {te ? "పరికరాలు & సెషన్ భద్రత" : "Active Devices & Session Security"}
            </h2>
            <p className="text-xs text-slate-600">
              {te
                ? `టోకెన్ వెర్షన్: v${sessionInfo?.token_version ?? 0} • HttpOnly కుకీ: ${sessionInfo?.cookie_session_active ? "ఆన్‌లో ఉంది" : "అందుబాటులో ఉంది"}`
                : `Token version: v${sessionInfo?.token_version ?? 0} • HttpOnly cookie session: ${sessionInfo?.cookie_session_active ? "Active" : "Available"}`}
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => void revokeEverywhere()}
            className="rounded-xl border border-rose-300 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-800"
          >
            🚪 {te ? "అన్ని పరికరాల నుండి లాగౌట్ చేయి" : "Log Out All Devices"}
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={deviceLabel}
            onChange={(e) => setDeviceLabel(e.target.value)}
            placeholder={te ? "ఈ పరికరం పేరు (ఉదా: నా ఫోన్)" : "Device label (e.g. Home Laptop)"}
            aria-label="Device label"
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs flex-1"
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => void registerCookieSession()}
            className="rounded-xl bg-[#7A0C2E] px-4 py-2 text-xs font-bold text-white"
          >
            🛡️ {te ? "HttpOnly కుకీ రక్షణ ఆన్ చేయి" : "Register Device + HttpOnly Cookie"}
          </button>
        </div>

        {(sessionInfo?.sessions || []).length > 0 && (
          <div className="space-y-1.5 pt-2">
            {sessionInfo.sessions.map((s: any) => (
              <div key={s.session_id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
                <div>
                  <b>{s.device_label}</b> ({s.session_id}) • <span className="uppercase text-[10px] font-bold">{s.status}</span>
                  {s.cookie_mode ? " • HttpOnly" : ""}
                </div>
                {s.status === "active" && (
                  <button type="button" onClick={() => void revokeOneSession(s.session_id)} className="text-rose-700 font-bold underline">
                    {te ? "రద్దు చేయి" : "Revoke"}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 2. Private Shareable Elder Profile Review Links */}
      <section className="mv-surface mv-surface__body space-y-3">
        <div>
          <h2 className="text-base font-extrabold text-[#7A0C2E]">
            🔗 {te ? "పెద్దల పరిశీలన కోసం ప్రైవేట్ బయోడేటా లింక్" : "Private Shareable Elder Review Links"}
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            {te
              ? "ఫోన్ నంబర్ లేదా ఈమెయిల్ చూపించకుండా కుటుంబ పెద్దలకు WhatsApp లో పంపగల గడువు ఉన్న బయోడేటా లింక్."
              : "Share a time-limited, contact-redacted biodata link with family elders and revoke it anytime."}
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <input
            value={linkLabel}
            onChange={(e) => setLinkLabel(e.target.value)}
            placeholder="Label (e.g. Peddamma Review)"
            aria-label="Review link label"
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs"
          />
          <select
            value={ttlHours}
            onChange={(e) => setTtlHours(Number(e.target.value))}
            aria-label="Expiry hours"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold"
          >
            <option value={24}>{te ? "24 గంటల గడువు" : "Expires in 24 hours"}</option>
            <option value={72}>{te ? "3 రోజుల గడువు" : "Expires in 3 days"}</option>
            <option value={168}>{te ? "7 రోజుల గడువు" : "Expires in 7 days"}</option>
          </select>
          <button
            type="button"
            disabled={busy}
            onClick={() => void createElderLink()}
            className="rounded-xl bg-[#7A0C2E] px-4 py-2 text-xs font-bold text-white"
          >
            + {te ? "ప్రైవేట్ లింక్ సృష్టించు" : "Create & Copy Link"}
          </button>
        </div>

        {latestSharePath && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs break-all">
            <b>{te ? "ఈ లింక్‌ను పెద్దలకు షేర్ చేయండి:" : "Shareable Elder Link:"}</b> <code>{latestSharePath}</code>
          </div>
        )}

        {links.length > 0 && (
          <div className="space-y-2">
            {links.map((lk) => (
              <div key={lk.link_id} className="rounded-xl border border-slate-200 p-3 text-xs space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <b>{lk.label}</b> ({lk.link_id}) • {lk.view_count}/{lk.max_views} views • <b>{lk.status}</b>
                  </div>
                  {lk.status === "active" && (
                    <button type="button" onClick={() => void revokeElderLink(lk.link_id)} className="text-rose-700 font-bold underline">
                      {te ? "వెంటనే రద్దు చేయి" : "Revoke Link"}
                    </button>
                  )}
                </div>
                {(lk.feedback || []).map((fb: any) => (
                  <div key={fb.id} className="rounded-lg bg-amber-50/70 px-2.5 py-1.5 text-[11px] text-slate-800">
                    🙏 <b>{fb.reviewer_name} ({fb.relation}):</b> {fb.note}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 3. Assisted Matchmaker Appointments */}
      <section className="mv-surface mv-surface__body space-y-3">
        <div>
          <h2 className="text-base font-extrabold text-[#7A0C2E]">
            📅 {te ? "సహాయక మ్యాచ్ మేకర్ కన్సల్టేషన్" : "Assisted Matchmaker Family Consultation"}
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            {te
              ? "ప్రొఫైల్ మెరుగుదల లేదా షార్ట్‌లిస్ట్ మార్గదర్శకత్వం కోసం మా కోఆర్డినేటర్ కాల్ స్లాట్ బుక్ చేయండి."
              : "Schedule a structured Telugu or English coordinator call for profile review and search guidance."}
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <input
            type="date"
            value={aptDate}
            onChange={(e) => setAptDate(e.target.value)}
            aria-label="Preferred consultation date"
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs"
          />
          <select
            value={aptSlot}
            onChange={(e) => setAptSlot(e.target.value)}
            aria-label="Consultation time slot"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold"
          >
            <option value="morning_10_12">{te ? "ఉదయం 10:00 – 12:00" : "10:00 AM – 12:00 PM IST"}</option>
            <option value="afternoon_14_16">{te ? "మధ్యాహ్నం 2:00 – 4:00" : "2:00 PM – 4:00 PM IST"}</option>
            <option value="evening_17_19">{te ? "సాయంత్రం 5:00 – 7:00" : "5:00 PM – 7:00 PM IST"}</option>
          </select>
          <select
            value={aptTopic}
            onChange={(e) => setAptTopic(e.target.value)}
            aria-label="Consultation topic"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold"
          >
            <option value="profile_shortlist_guidance">{te ? "షార్ట్‌లిస్ట్ సూచనలు" : "Shortlist & Filter Guidance"}</option>
            <option value="assisted_onboarding">{te ? "ప్రొఫైల్ పూర్తి సహాయం" : "Assisted Profile Onboarding"}</option>
            <option value="family_coordination">{te ? "కుటుంబ సమన్వయ సహాయం" : "Family Process Questions"}</option>
          </select>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={aptNotes}
            onChange={(e) => setAptNotes(e.target.value)}
            placeholder={te ? "అదనపు వివరాలు (ఐచ్ఛికం)…" : "Optional family context…"}
            aria-label="Consultation notes"
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs flex-1"
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => void submitAppointment()}
            className="rounded-xl bg-[#7A0C2E] px-4 py-2 text-xs font-bold text-white"
          >
            {te ? "స్లాట్ అభ్యర్థించండి" : "Request Consultation"}
          </button>
        </div>

        {appointments.length > 0 && (
          <div className="space-y-1.5 pt-2">
            {appointments.map((a) => (
              <div key={a.appointment_id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs flex flex-wrap justify-between gap-2">
                <span>
                  <b>{a.appointment_id}</b> • {a.preferred_date} ({a.preferred_slot}) — <b className="uppercase">{a.status}</b>
                </span>
                {a.staff_note && <span className="text-emerald-800 font-semibold">{a.staff_note}</span>}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
