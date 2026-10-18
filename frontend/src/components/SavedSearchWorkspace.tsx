"use client";

/**
 * 🔔 Saved-search workspace
 * -------------------------
 * One place to manage every saved search: see what is new, open the results,
 * control WhatsApp alerts, and delete searches you no longer need.
 *
 * Rules enforced here (and by the API):
 * • Alerts are opt-in only. Turning them on requires ticking an explicit
 *   consent box in this session; the box is never pre-checked, and the record
 *   of consent is kept server-side (`alert_consent_at`).
 * • "Send now" reports exactly what the server did — queued, skipped because
 *   consent is missing, or skipped because WhatsApp is off. It never claims a
 *   message was delivered.
 * • Counts are described as profiles matching the saved criteria, never as
 *   compatibility, success or outcome signals.
 */

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { apiFetch, apiPost, authHeaders, readApiJson } from "@/lib/api";
import { useLang } from "@/lib/lang";
import AuthGate from "@/components/AuthGate";
import { CardSkeletonList } from "@/components/Skeletons";
import { Badge, Button, Card, CardBody, EmptyState } from "@/components/ui";
import { isBroadSavedSearch, summarizeSavedSearch } from "@/lib/saved-search-summary.mjs";

type Row = Record<string, any>;

type SavedSearch = {
  search_id: string;
  name?: string;
  filters?: Row;
  alert?: boolean;
  alert_consent_at?: string;
  new_matches?: number;
  sample?: Row[];
  created_at?: string;
};

type Notice = { tone: "ok" | "error" | "info"; text: string };

type AlertsResult = {
  alerts_queued?: number;
  alerts_skipped?: number;
  new_matches_total?: number;
  message_en?: string;
  message_telugu?: string;
};

function formatDate(value: string | undefined, te: boolean): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  try {
    return date.toLocaleDateString(te ? "te-IN" : "en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return String(value).slice(0, 10);
  }
}

function sampleNames(sample: Row[] | undefined): string {
  if (!Array.isArray(sample) || !sample.length) return "";
  return sample
    .map((row) => String(row?.full_name || row?.tsap_id || "").trim())
    .filter(Boolean)
    .slice(0, 3)
    .join(", ");
}

export default function SavedSearchWorkspace() {
  const { lang } = useLang();
  const te = lang === "te";

  const [myId, setMyId] = useState("");
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [unauthorized, setUnauthorized] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const [pendingId, setPendingId] = useState("");
  const [sendingId, setSendingId] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState("");
  const [consentFor, setConsentFor] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    try {
      setMyId(localStorage.getItem("tsap_id") || localStorage.getItem("tsap_last_id") || "");
    } catch {
      /* ignore */
    }
  }, []);

  const load = useCallback(async () => {
    if (!myId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(false);
    setUnauthorized(false);
    try {
      const response = await fetch(`/api/saved-searches/${encodeURIComponent(myId)}`, { headers: authHeaders() });
      if (response.status === 401 || response.status === 403) {
        setUnauthorized(true);
        setSearches([]);
        return;
      }
      if (!response.ok) {
        setLoadError(true);
        return;
      }
      const data = await readApiJson(response);
      const rows = Array.isArray(data?.searches) ? data.searches : [];
      setSearches(rows.filter((row: SavedSearch) => row?.search_id));
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [myId]);

  useEffect(() => {
    void load();
  }, [load, attempt]);

  const setAlert = async (search: SavedSearch, enable: boolean) => {
    const id = String(search.search_id || "");
    if (!id) return;
    setPendingId(id);
    setNotice(null);
    const { ok, data } = await apiFetch<{ alert_enabled?: boolean; message_en?: string; message_telugu?: string }>(
      `/api/saved-searches/${encodeURIComponent(myId)}/${encodeURIComponent(id)}`,
      { method: "PUT", body: { alert: enable, alert_consent_confirmed: true } },
    );
    setPendingId("");
    setConsentFor("");
    if (!ok) {
      setNotice({
        tone: "error",
        text: te ? "Alert సెట్టింగ్ మార్చలేకపోయాం. మళ్లీ ప్రయత్నించండి." : "We could not change the alert setting. Please try again.",
      });
      return;
    }
    setNotice({
      tone: enable ? "ok" : "info",
      text: te
        ? String(data?.message_telugu || (enable ? "ఈ search‌కు alerts ఆన్ చేశారు." : "ఈ search‌కు notifications ఆఫ్ చేశారు."))
        : String(data?.message_en || (enable ? "Alerts are on for this search." : "Notifications are off for this search.")),
    });
    void load();
  };

  const sendNow = async (search: SavedSearch) => {
    const id = String(search.search_id || "");
    if (!id) return;
    setSendingId(id);
    setNotice(null);
    const { ok, data } = await apiPost<AlertsResult>(`/api/saved-searches/${encodeURIComponent(myId)}/alerts`, {});
    setSendingId("");
    if (!ok) {
      setNotice({
        tone: "error",
        text: te ? "Alerts పంపలేకపోయాం. మళ్లీ ప్రయత్నించండి." : "We could not send alerts right now. Please try again.",
      });
      return;
    }
    const queued = Number((data as AlertsResult | null)?.alerts_queued ?? 0);
    const message = te
      ? String((data as AlertsResult | null)?.message_telugu || "")
      : String((data as AlertsResult | null)?.message_en || "");
    setNotice({
      tone: queued > 0 ? "ok" : "info",
      text:
        message ||
        (te
          ? "కొత్త matches ఇప్పుడు లేవు — filters మార్చి మళ్లీ చూడండి."
          : "There are no new matches for your saved searches right now."),
    });
  };

  const remove = async (search: SavedSearch) => {
    const id = String(search.search_id || "");
    if (!id) return;
    setPendingId(id);
    setNotice(null);
    const { ok } = await apiFetch(`/api/saved-searches/${encodeURIComponent(myId)}/${encodeURIComponent(id)}`, { method: "DELETE" });
    setPendingId("");
    setConfirmDeleteId("");
    if (!ok) {
      setNotice({
        tone: "error",
        text: te ? "Search తొలగించలేకపోయాం. మళ్లీ ప్రయత్నించండి." : "We could not delete this search. Please try again.",
      });
      return;
    }
    setNotice({ tone: "info", text: te ? "Saved search తొలగించాం." : "Saved search deleted." });
    void load();
  };

  if (unauthorized || (!loading && !myId)) {
    return <AuthGate note={te ? "మీ saved searches, alerts చూడటానికి లాగిన్ అవ్వండి." : "Log in to manage your saved searches and alerts."} />;
  }

  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8" aria-labelledby="saved-searches-title">
      <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge icon={<span aria-hidden="true">🔔</span>}>{te ? "సేవ్ చేసిన శోధనలు" : "Saved searches"}</Badge>
          <h1 id="saved-searches-title" className="mt-2 text-xl font-extrabold text-maroon sm:text-2xl">
            {te ? "నా saved searches" : "My saved searches"}
          </h1>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-600 sm:text-sm">
            {te
              ? "మీరు save చేసిన శోధనలు, వాటికి కొత్తగా వచ్చిన ప్రొఫైళ్లు, మరియు WhatsApp alerts — అన్నీ ఒకే చోట. Alerts పూర్తిగా మీ ఇష్టం; ఎప్పుడైనా ఆపేయవచ్చు."
              : "Your saved searches, what is new for each, and WhatsApp alerts — all in one place. Alerts are entirely optional and can be turned off at any time."}
          </p>
        </div>
        <Link
          href="/matches"
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full border border-maroon/30 px-4 py-2 text-xs font-bold text-maroon"
        >
          {te ? "కొత్త శోధన సేవ్ చేయండి" : "Save a new search"}
        </Link>
      </div>

      {notice && (
        <div
          role={notice.tone === "error" ? "alert" : "status"}
          aria-live={notice.tone === "error" ? "assertive" : "polite"}
          className={`mb-4 rounded-xl border px-3 py-2.5 text-xs font-semibold ${
            notice.tone === "error"
              ? "border-amber-200 bg-amber-50 text-amber-950"
              : notice.tone === "ok"
                ? "border-emerald-200 bg-emerald-50 text-emerald-950"
                : "border-slate-200 bg-slate-50 text-slate-800"
          }`}
        >
          {notice.text}
        </div>
      )}

      {loading ? (
        <CardSkeletonList n={3} />
      ) : loadError ? (
        <Card>
          <CardBody>
            <p role="alert" className="text-sm text-amber-950">
              {te ? "Saved searches లోడ్ కాలేదు." : "Your saved searches could not be loaded."}
            </p>
            <div className="mt-3">
              <Button type="button" onClick={() => setAttempt((value) => value + 1)}>
                {te ? "మళ్లీ ప్రయత్నించండి" : "Retry"}
              </Button>
            </div>
          </CardBody>
        </Card>
      ) : searches.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              title={te ? "ఇంకా saved searches లేవు" : "No saved searches yet"}
              description={
                te
                  ? "మీకు నచ్చిన ఫిల్టర్లతో శోధించి, ఆ శోధనను సేవ్ చేసుకోండి — తర్వాత ఒకే క్లిక్‌లో తిరిగి చూడవచ్చు."
                  : "Search with the filters you care about and save it — then come back to those exact results in one tap."
              }
              action={
                <Link href="/matches" className="ds-btn ds-btn--secondary">
                  {te ? "ప్రొఫైళ్లు చూడండి" : "Browse profiles"}
                </Link>
              }
            />
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-3">
          {searches.map((search) => {
            const id = String(search.search_id || "");
            const alertsOn = search.alert === true && Boolean(search.alert_consent_at);
            const legacyNeedsConsent = search.alert === true && !search.alert_consent_at;
            const count = Math.max(0, Number(search.new_matches) || 0);
            const names = sampleNames(search.sample);
            const broad = isBroadSavedSearch(search.filters || {});
            const busy = pendingId === id || sendingId === id;
            return (
              <Card key={id}>
                <CardBody>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h2 className="break-words text-sm font-bold text-slate-900 sm:text-base">
                        {String(search.name || (te ? "సేవ్ చేసిన శోధన" : "Saved search"))}
                      </h2>
                      <p className="mt-1 text-xs leading-relaxed text-slate-600">
                        {summarizeSavedSearch(search.filters || {}, te)}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 font-bold text-slate-800">
                          {alertsOn
                            ? count >= 5
                              ? te
                                ? "5+ కొత్త ప్రొఫైళ్లు"
                                : "5+ new profiles"
                              : te
                                ? `${count} కొత్త ప్రొఫైళ్లు`
                                : `${count} new profiles`
                            : count >= 5
                              ? te
                                ? "5+ ప్రొఫైళ్లు సరిపోతున్నాయి"
                                : "5+ profiles match"
                              : te
                                ? `${count} ప్రొఫైళ్లు సరిపోతున్నాయి`
                                : `${count} profiles match`}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-1 font-bold ${
                            alertsOn ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-900"
                          }`}
                        >
                          {alertsOn
                            ? te
                              ? "Alerts ఆన్"
                              : "Alerts on"
                            : legacyNeedsConsent
                              ? te
                                ? "సమ్మతి నమోదు వరకు alerts నిలిపివేశారు"
                                : "Alerts paused until consent is recorded"
                              : te
                                ? "Alerts ఆఫ్"
                                : "Alerts off"}
                        </span>
                        {search.created_at && (
                          <span className="text-slate-500">{formatDate(search.created_at, te)}</span>
                        )}
                      </div>
                      {names && (
                        <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                          {te ? "తాజావి: " : "Latest: "}
                          {names}
                        </p>
                      )}
                      {broad && (
                        <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                          {te
                            ? "ఈ శోధనలో ఫిల్టర్లు లేవు — దాదాపు అన్ని ప్రొఫైళ్లు సరిపోతాయి."
                            : "This search has no filters, so almost every profile matches it."}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Link
                      href={`/matches?search=${encodeURIComponent(id)}`}
                      className="inline-flex min-h-11 items-center justify-center rounded-lg bg-indigo-700 px-3 text-xs font-bold text-white"
                    >
                      {te ? "ఫలితాలు చూడండి" : "View results"}
                    </Link>

                    {alertsOn ? (
                      <Button
                        type="button"
                        variant="secondary"
                        loading={pendingId === id}
                        disabled={busy}
                        onClick={() => void setAlert(search, false)}
                      >
                        {te ? "Alerts ఆఫ్ చేయండి" : "Turn off alerts"}
                      </Button>
                    ) : consentFor === id ? (
                      <span className="sr-only" />
                    ) : (
                      <Button
                        type="button"
                        variant="secondary"
                        loading={pendingId === id}
                        disabled={busy}
                        onClick={() => setConsentFor(id)}
                      >
                        {legacyNeedsConsent
                          ? te
                            ? "సమ్మతిని నమోదు చేయండి"
                            : "Record consent"
                          : te
                            ? "Alerts ఆన్ చేయండి"
                            : "Turn on alerts"}
                      </Button>
                    )}

                    <Button
                      type="button"
                      variant="ghost"
                      loading={sendingId === id}
                      disabled={busy}
                      onClick={() => void sendNow(search)}
                    >
                      {te ? "ఇప్పుడే పంపండి" : "Send me the new ones now"}
                    </Button>

                    {confirmDeleteId === id ? (
                      <Button type="button" variant="outline" loading={pendingId === id} disabled={busy} onClick={() => void remove(search)}>
                        {te ? "తొలగింపు నిర్ధారించండి" : "Confirm delete"}
                      </Button>
                    ) : (
                      <Button type="button" variant="ghost" disabled={busy} onClick={() => setConfirmDeleteId(id)}>
                        {te ? "తొలగించు" : "Delete"}
                      </Button>
                    )}
                    {confirmDeleteId === id && (
                      <Button type="button" variant="ghost" onClick={() => setConfirmDeleteId("")}>
                        {te ? "రద్దు" : "Cancel"}
                      </Button>
                    )}
                  </div>

                  {consentFor === id && (
                    <div className="mt-3 space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
                      <p className="text-xs leading-relaxed text-amber-950">
                        {te
                          ? "ఈ శోధనకు సరిపోయే కొత్త ప్రొఫైళ్లు ఉన్నప్పుడు మీకు WhatsApp సందేశం పంపాలని మీరు అడుగుతున్నారు. ఇది మీ ఇష్టం; ఎప్పుడైనా ఆపేయవచ్చు. సందేశంలో ఫోన్ నంబర్లు ఉండవు."
                          : "You are asking us to send you a WhatsApp message when new profiles match this search. This is optional and you can stop it any time. The message never contains phone numbers."}
                      </p>
                      <label className="flex min-h-11 items-start gap-2 text-xs font-semibold text-amber-950">
                        <input
                          type="checkbox"
                          className="mt-0.5 h-4 w-4"
                          checked={false}
                          onChange={(event) => {
                            if (event.target.checked) void setAlert(search, true);
                          }}
                        />
                        <span>
                          {te
                            ? "నాకు ఈ saved search కోసం WhatsApp alerts కావాలి — నేను సమ్మతిస్తున్నాను."
                            : "I want WhatsApp alerts for this saved search — I consent."}
                        </span>
                      </label>
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="ghost" onClick={() => setConsentFor("")}>
                          {te ? "రద్దు" : "Cancel"}
                        </Button>
                      </div>
                    </div>
                  )}

                  {confirmDeleteId === id && (
                    <p className="mt-2 text-[11px] leading-relaxed text-slate-600">
                      {alertsOn
                        ? te
                          ? "తొలగిస్తే ఈ saved search‌కు వచ్చే alerts కూడా ఆగుతాయి."
                          : "Deleting also stops future alerts for this saved search."
                        : te
                          ? "ఈ saved search మాత్రమే తొలగించబడుతుంది."
                          : "Only this saved search will be deleted."}
                    </p>
                  )}
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      <p className="mt-5 text-[11px] leading-relaxed text-slate-500">
        {te
          ? "Counts ఇప్పుడు ఉన్న ప్రొఫైళ్ల ఆధారంగా ఉంటాయి; అవి విజయం లేదా అనుకూలతకు సంకేతం కాదు. Alerts WhatsApp ద్వారా పంపబడతాయి మరియు పంపిణీకి హామీ ఇవ్వము."
          : "Counts reflect the profiles available right now; they are not a signal of compatibility or outcome. Alerts are sent over WhatsApp, and delivery is not guaranteed."}
      </p>
    </section>
  );
}
