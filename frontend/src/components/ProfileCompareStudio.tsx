"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import "./discovery-workspace.css";
import { WhatsAppIcon } from "@/components/BrandIcons";
import { useLang } from "@/lib/lang";
import { apiDisplayMessage, apiPost } from "@/lib/api";
import {
  buildCompareMatrix,
  differenceRows,
  isMissingValue,
  preferenceNotes,
  rankByPreferences,
  tallyLabel,
  tallyPreferences,
} from "@/lib/compare-insights.mjs";

type ProfileCard = {
  tsap_id: string;
  full_name?: string;
  gender?: string;
  age?: number | string;
  height?: string;
  caste?: string;
  sub_caste?: string;
  gothram?: string;
  star?: string;
  rasi?: string;
  education?: string;
  job?: string;
  salary?: string;
  district?: string;
  state?: string;
  marital_status?: string;
  photo_url?: string;
};

type PreferenceCheck = { key: string; label?: string; status: string; note?: string; note_te?: string };
type Comparison = { preference_checks?: PreferenceCheck[]; field_checks?: unknown[]; observations?: string[] };

type CompareResponse = {
  count?: number;
  success?: boolean;
  profiles?: ProfileCard[];
  comparisons?: Record<string, Comparison>;
  has_saved_expectations?: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function validCompareResponse(value: unknown, requested: string[]): value is CompareResponse {
  if (!isRecord(value) || value.success !== true || value.count !== requested.length ||
      !Array.isArray(value.profiles) || value.profiles.length !== requested.length ||
      !isRecord(value.comparisons) || typeof value.has_saved_expectations !== "boolean") return false;
  const ids = new Set<string>();
  const textFields = ["full_name", "gender", "height", "caste", "sub_caste", "gothram", "star", "rasi", "education", "job", "salary", "district", "state", "marital_status", "photo_url"];
  for (const profile of value.profiles) {
    if (!isRecord(profile) || typeof profile.tsap_id !== "string" || !requested.includes(profile.tsap_id) || ids.has(profile.tsap_id)) return false;
    ids.add(profile.tsap_id);
    if (textFields.some((key) => profile[key] != null && typeof profile[key] !== "string")) return false;
    if (profile.age != null && !(typeof profile.age === "string" || (typeof profile.age === "number" && Number.isFinite(profile.age) && profile.age >= 0))) return false;
  }
  let hasChecks = false;
  for (const [id, block] of Object.entries(value.comparisons)) {
    if (!ids.has(id) || !isRecord(block) || !Array.isArray(block.preference_checks) || !Array.isArray(block.field_checks) || !Array.isArray(block.observations)) return false;
    const keys = new Set<string>();
    for (const check of block.preference_checks) {
      if (!isRecord(check) || typeof check.key !== "string" || !check.key.trim() || keys.has(check.key) || (typeof check.status !== "string" || !["met", "not_met", "unknown"].includes(check.status)) || typeof check.label !== "string" || typeof check.note !== "string" || (check.note_te != null && typeof check.note_te !== "string")) return false;
      keys.add(check.key);
    }
    if (block.field_checks.some((row: unknown) => !isRecord(row) || typeof row.key !== "string" || typeof row.label !== "string" || typeof row.note !== "string" || (typeof row.status !== "string" || !["same", "different", "listed"].includes(row.status)))) return false;
    if (block.observations.some((row: unknown) => typeof row !== "string")) return false;
    hasChecks ||= block.preference_checks.length > 0;
  }
  return value.has_saved_expectations === hasChecks;
}

const EMPTY_IDS = ["", "", ""] as const;
const ID_PATTERN = /^[A-Z0-9-]{3,32}$/;

function valueOrLabel(value: unknown, missing: string): string {
  const valueText = String(value ?? "").trim();
  return !isMissingValue(valueText) ? valueText : missing;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => Array.from(part)[0] || "").join("") || "•";
}

/** Value used for comparison only: placeholders collapse to "" so they never
 *  count as a difference. */
function compareValue(profile: ProfileCard, key: string): string {
  if (key === "caste") return [profile.caste, profile.sub_caste].filter((value) => !isMissingValue(value)).join(" · ");
  if (key === "district") return [profile.district, profile.state].filter((value) => !isMissingValue(value)).join(", ");
  const text = String((profile as Record<string, unknown>)[key] ?? "").trim();
  return isMissingValue(text) ? "" : text;
}

function CompareAvatar({ name, photo }: { name: string; photo?: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [photo]);
  if (photo && !failed) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={photo} alt="" onError={() => setFailed(true)} className="h-14 w-14 shrink-0 rounded-2xl border border-gray-200 object-cover" />;
  }
  return <div aria-hidden="true" className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-maroon/5 text-lg font-bold text-maroon">{initials(name)}</div>;
}

export default function ProfileCompareStudio() {
  const { lang } = useLang();
  const te = lang === "te";
  const requestEpoch = useRef(0);
  useEffect(() => () => { requestEpoch.current += 1; }, []);
  const invalidate = () => {
    requestEpoch.current += 1;
    setLoading(false);
    setProfiles([]);
    setComparisons({});
    setCopyMessage("");
    setError("");
    setNeedsLogin(false);
    setOrder("entered");
    setOnlyDifferences(false);
  };
  const [ids, setIds] = useState<string[]>([...EMPTY_IDS]);
  const [showThird, setShowThird] = useState(false);
  const [profiles, setProfiles] = useState<ProfileCard[]>([]);
  const [comparisons, setComparisons] = useState<Record<string, Comparison>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [needsLogin, setNeedsLogin] = useState(false);
  const [copyMessage, setCopyMessage] = useState("");
  const [onlyDifferences, setOnlyDifferences] = useState(false);
  const [order, setOrder] = useState<"entered" | "preferences">("entered");

  const activeIds = showThird ? ids.slice(0, 3) : ids.slice(0, 2);
  const baseProfiles = profiles.slice(0, showThird ? 3 : 2);

  const ranking = useMemo(() => rankByPreferences(baseProfiles, comparisons), [baseProfiles, comparisons]);
  const hasExpectations = ranking.some((row) => row.total > 0);

  const activeProfiles = useMemo(() => {
    if (order !== "preferences" || !hasExpectations) return baseProfiles;
    return ranking
      .map((row) => baseProfiles.find((profile) => String(profile.tsap_id) === row.tsap_id))
      .filter((profile): profile is ProfileCard => Boolean(profile));
  }, [baseProfiles, ranking, order, hasExpectations]);

  const detailRows: { label: string; key: string }[] = [
    { label: te ? "వయస్సు" : "Age", key: "age" },
    { label: te ? "ఎత్తు" : "Height", key: "height" },
    { label: te ? "కులం / ఉపకులం" : "Caste / subcaste", key: "caste" },
    { label: te ? "గోత్రం" : "Gothram", key: "gothram" },
    { label: te ? "నక్షత్రం" : "Star", key: "star" },
    { label: te ? "రాశి" : "Rasi", key: "rasi" },
    { label: te ? "విద్య" : "Education", key: "education" },
    { label: te ? "వృత్తి" : "Profession", key: "job" },
    { label: te ? "జీతం" : "Income", key: "salary" },
    { label: te ? "వైవాహిక స్థితి" : "Marital status", key: "marital_status" },
    { label: te ? "ప్రాంతం" : "Location", key: "district" },
  ];

  const matrix = useMemo(
    () => buildCompareMatrix(detailRows, activeProfiles, (profile, key) => compareValue(profile as ProfileCard, key)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeProfiles, te],
  );
  const differences = useMemo(() => differenceRows(matrix), [matrix]);
  const differingKeys = useMemo(() => new Set(differences.map((row) => row.key)), [differences]);
  const visibleRows = onlyDifferences
    ? detailRows.filter((row) => differingKeys.has(row.key))
    : detailRows;

  const shareText = useMemo(() => {
    if (activeProfiles.length < 2) return "";
    const label = (en: string, teText: string) => te ? teText : en;
    const safeValue = (value: unknown) => {
      const text = valueOrLabel(value, "");
      return te ? text : apiDisplayMessage({ message_en: text }, false, "");
    };
    const lines = [label("Mana Vivaha — profile comparison", "మన వివాహ — ప్రొఫైల్ పోలిక"), ""];
    activeProfiles.forEach((profile, index) => {
      lines.push(`${index + 1}. ${valueOrLabel(profile.full_name, te ? "సభ్యుల వివరాలు" : "Member profile")} (${profile.tsap_id})`);
      const details = [
        [label("Age", "వయస్సు"), safeValue(profile.age)],
        [label("Community / sub-community", "కమ్యూనిటీ / ఉప-కమ్యూనిటీ"), [profile.caste, profile.sub_caste].filter(Boolean).map(safeValue).filter((value) => !isMissingValue(value)).join(" · ")],
        [label("Gothram", "గోత్రం"), safeValue(profile.gothram)],
        [label("Star / Rasi", "నక్షత్రం / రాశి"), [profile.star, profile.rasi].filter(Boolean).map(safeValue).filter(Boolean).join(" / ")],
        [label("Education", "విద్య"), safeValue(profile.education)],
        [label("Profession", "వృత్తి"), safeValue(profile.job)],
        [label("Location", "ప్రాంతం"), [profile.district, profile.state].filter(Boolean).map(safeValue).filter((value) => !isMissingValue(value)).join(", ")],
      ] as const;
      details.forEach(([detailLabel, value]) => {
        const shown = value || label("Not provided", "వివరాలు ఇవ్వలేదు");
        if (shown !== label("Not provided", "వివరాలు ఇవ్వలేదు")) lines.push(`${detailLabel}: ${shown}`);
      });
      lines.push("");
    });
    lines.push(label("Informational comparison only. Please confirm details directly with the profile owner.", "ఇది సమాచార పోలిక మాత్రమే. వివరాలను ప్రొఫైల్ యజమానితో నేరుగా నిర్ధారించండి."));
    return lines.join("\n");
  }, [activeProfiles, te]);

  const setIdAt = (index: number, value: string) => {
    invalidate();
    setIds((current) => {
      const next = [...current];
      next[index] = value.toUpperCase().replace(/\s+/g, "");
      return next;
    });
  };

  const handleCompare = async () => {
    const requested = activeIds.map((value) => value.trim().toUpperCase());
    if (requested.some((value) => !value)) {
      setError(te ? "పోల్చడానికి చూపించిన ప్రతి సభ్యత్వ సంఖ్య నమోదు చేయండి." : "Enter an ID in each visible field.");
      setNeedsLogin(false);
      return;
    }
    if (requested.some((value) => !ID_PATTERN.test(value))) {
      setError(te ? "సభ్యత్వ సంఖ్యలో ఆంగ్ల అక్షరాలు, అంకెలు లేదా హైఫన్ మాత్రమే వాడండి." : "Use only letters, numbers, and hyphens in profile IDs.");
      setNeedsLogin(false);
      return;
    }
    if (new Set(requested).size !== requested.length) {
      setError(te ? "ప్రతి సభ్యత్వ సంఖ్య వేర్వేరుగా ఉండాలి." : "Enter a different profile ID in each field.");
      setNeedsLogin(false);
      return;
    }

    const epoch = ++requestEpoch.current;
    setLoading(true);
    setError("");
    setNeedsLogin(false);
    setCopyMessage("");
    setProfiles([]);
    setComparisons({});
    setOrder("entered");
    const result = await apiPost<CompareResponse>("/api/matches/compare-profiles", { profile_ids: requested });
    if (requestEpoch.current !== epoch) return;
    setLoading(false);

    if (!result.ok) {
      setError((te ? result.errorTelugu || result.error : result.error) || (te ? "సభ్యుల వివరాలను పోల్చలేకపోయాం. మళ్లీ ప్రయత్నించండి." : "Unable to compare these profiles. Please try again."));
      setNeedsLogin(result.needsLogin || result.status === 401);
      return;
    }

    if (!validCompareResponse(result.data, requested)) {
      setError(te ? "పోలిక వివరాలను నిర్ధారించలేకపోయాం. మళ్లీ ప్రయత్నించండి." : "We could not verify the comparison details. Please try again.");
      return;
    }
    setProfiles(requested.map((id) => result.data!.profiles!.find((profile) => profile.tsap_id === id)!));
    setComparisons(result.data?.comparisons && typeof result.data.comparisons === "object" ? result.data.comparisons : {});
  };

  const copySummary = async () => {
    if (!shareText) return;
    try {
      await navigator.clipboard.writeText(shareText);
      setCopyMessage(te ? "సారాంశం కాపీ అయ్యింది." : "Comparison summary copied.");
    } catch {
      setCopyMessage(te ? "కాపీ చేయడానికి అనుమతి లేదు. వాట్సాప్ ద్వారా పంచుకోండి." : "Clipboard access is unavailable. Use WhatsApp share instead.");
    }
  };

  const renderValue = (value: unknown) => {
    const text = valueOrLabel(value, "");
    if (!text) return te ? "వివరాలు ఇవ్వలేదు" : "Not provided";
    return te ? text : apiDisplayMessage({ message_en: text }, false, "Not provided");
  };

  return (
    <div className="mv-discovery-workspace min-h-dvh bg-[#FDFBF7] px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-7">
        <header className="mx-auto max-w-3xl space-y-3 text-center">
          <p className="inline-flex rounded-full border border-gold/40 bg-gold/15 px-4 py-1.5 text-xs font-bold text-maroon">
            {te ? "సంబంధాల పోలిక" : "MEMBER PROFILE COMPARISON"}
          </p>
          <h1 className="text-3xl font-extrabold text-maroon sm:text-4xl">
            {te ? "సంబంధాలను పక్కపక్కన పోల్చండి" : "Compare member profiles side by side"}
          </h1>
          <p className="text-sm leading-6 text-gray-700 sm:text-base">
            {te
              ? "అందుబాటులో ఉన్న నిజమైన సభ్యత్వ సంఖ్యలతో పోల్చండి. కల్పిత సభ్యులను లేదా ఊహించిన అనుకూలత శాతాలను చూపించము."
              : "Compare approved member profiles using their available information. No example members or invented compatibility scores are shown."}
          </p>
        </header>

        <section aria-labelledby="compare-input-heading" className="rounded-3xl border border-gold/30 bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id="compare-input-heading" className="font-bold text-gray-900">
                {te ? "సభ్యత్వ సంఖ్యలను నమోదు చేయండి" : "Enter profile IDs"}
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                {te ? "పోల్చడానికి ప్రవేశించాలి; ఆమోదించిన రెండు లేదా మూడు సభ్యుల వివరాలను ఎంచుకోండి." : "Sign in to compare 2 or 3 approved profiles."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                invalidate();
                setShowThird((visible) => !visible);
                setProfiles([]);
                setComparisons({});
                setError("");
              }}
              className="min-h-10 rounded-xl border border-maroon/20 bg-maroon/5 px-3 py-2 text-sm font-semibold text-maroon hover:bg-maroon/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon"
              aria-expanded={showThird}
            >
              {showThird ? (te ? "− మూడో సభ్యత్వ సంఖ్యను తీసివేయండి" : "− Remove third profile") : (te ? "+ మూడో సభ్యత్వ సంఖ్య" : "+ Add a third profile")}
            </button>
          </div>

          <div className={`grid grid-cols-1 gap-3 ${showThird ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
            {activeIds.map((value, index) => (
              <div key={index}>
                <label htmlFor={`compare-id-${index + 1}`} className="mb-1.5 block text-sm font-semibold text-gray-700">
                  {te ? `సభ్యత్వ సంఖ్య ${index + 1}` : `Profile ID ${index + 1}`}
                </label>
                <input
                  id={`compare-id-${index + 1}`}
                  value={value}
                  onChange={(event) => setIdAt(index, event.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                  maxLength={32}
                  placeholder={te ? "సభ్యత్వ సంఖ్య నమోదు చేయండి" : "Enter member ID"}
                  className="min-h-12 w-full rounded-xl border border-gray-300 bg-gray-50 px-3 font-mono text-sm uppercase tracking-wide text-gray-900 outline-none transition focus:border-maroon focus:ring-2 focus:ring-maroon/20"
                />
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => void handleCompare()}
              disabled={loading}
              className="min-h-11 rounded-xl bg-maroon px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-maroon-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
            >
              {loading ? (te ? "పోలుస్తోంది…" : "Loading profiles…") : (te ? "పోల్చండి" : "Compare profiles")}
            </button>
            <Link href="/search" className="text-sm font-semibold text-maroon underline-offset-4 hover:underline">
              {te ? "పంచుకున్న సభ్యత్వ సంఖ్యతో వెతకండి" : "Open a shared Profile ID"}
            </Link>
          </div>
          {error && (
            <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              <p>{error}</p>
              {needsLogin && <Link href="/login" className="mt-2 inline-flex min-h-10 items-center font-bold underline">{te ? "ప్రవేశించండి" : "Sign in"}</Link>}
            </div>
          )}
          <p className="sr-only" aria-live="polite">{loading ? (te ? "లోడ్ అవుతోంది" : "Loading") : ""}</p>
        </section>

        {activeProfiles.length === 0 && !loading && !error && (
          <div className="rounded-3xl border border-dashed border-gray-300 bg-white/70 px-5 py-12 text-center">
            <div aria-hidden="true" className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-maroon/5 text-2xl text-maroon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-7 w-7"><path d="M12 3v17M5 20h14M4 7h16M5 7l-3 6h6L5 7Zm14 0-3 6h6l-3-6Z" /></svg></div>
            <h2 className="mt-4 text-lg font-bold text-gray-900">{te ? "పోలిక ఇంకా ప్రారంభం కాలేదు" : "No profiles selected yet"}</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-gray-600">
              {te ? "రెండు లేదా మూడు నిజమైన సభ్యత్వ సంఖ్యలను నమోదు చేసి పోల్చండి. అందుబాటులో లేని వివరాలను ఇవ్వలేదని చూపిస్తాము." : "Enter two or three real member IDs to begin. Missing profile details will be labeled as not provided."}
            </p>
          </div>
        )}

        {activeProfiles.length > 0 && (
          <section aria-label={te ? "పోల్చిన సభ్యుల వివరాలు" : "Compared profiles"}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-3">
              <label className="flex min-h-11 items-center gap-2 text-sm font-semibold text-gray-800">
                <input
                  type="checkbox"
                  className="h-5 w-5 shrink-0"
                  checked={onlyDifferences}
                  onChange={(event) => setOnlyDifferences(event.target.checked)}
                />
                {te ? `తేడాలు మాత్రమే చూపించు (${differences.length})` : `Only show what differs (${differences.length})`}
              </label>
              {hasExpectations && (
                <label className="flex min-h-11 items-center gap-2 text-sm font-semibold text-gray-800">
                  <span className="sr-only">{te ? "క్రమం" : "Order"}</span>
                  <select
                    value={order}
                    onChange={(event) => setOrder(event.target.value === "preferences" ? "preferences" : "entered")}
                    className="min-h-11 rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-maroon focus:ring-2 focus:ring-maroon/20"
                  >
                    <option value="entered">{te ? "మీరు నమోదు చేసిన క్రమం" : "Order you entered"}</option>
                    <option value="preferences">{te ? "ఆశించిన వివరాలు సరిపోలిన క్రమం" : "Expectations met first"}</option>
                  </select>
                </label>
              )}
            </div>

            {onlyDifferences && differences.length === 0 && (
              <p role="status" className="mb-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-gray-700">
                {te ? "ఈ సభ్యుల మధ్య తేడా ఉన్న వివరాలు లేవు. చూపిన వివరాలు ఒకేలా ఉన్నాయి లేదా ఇవ్వలేదు." : "These profiles state the same values everywhere — nothing differs among the details shown."}
              </p>
            )}

            <div className={`grid grid-cols-1 gap-4 ${activeProfiles.length === 3 ? "lg:grid-cols-3" : "md:grid-cols-2"}`}>
              {activeProfiles.map((profile, index) => {
                const checks = comparisons[String(profile.tsap_id)]?.preference_checks || [];
                const tally = tallyPreferences(checks);
                const labels: Record<string, string> = { age: "వయస్సు పరిధి", caste: "కుల అభిరుచి", job: "వృత్తి అభిరుచి", location: "ప్రాంత అభిరుచి", diet: "ఆహారపు అలవాటు", height: "ఎత్తు పరిధి", min_salary: "కనిష్ఠ ఆదాయం", states: "రాష్ట్ర అభిరుచి" };
                const unknown = checks.filter((check) => check.status === "unknown").map((check) => ({ key: check.key, label: check.label || "", note: check.note || "", met: null }));
                const notes = [...preferenceNotes(checks), ...unknown].map((note) => {
                  if (!te) return note;
                  const source = checks.find((check) => check.key === note.key);
                  return { ...note, label: labels[note.key] || "దాచుకున్న అభిరుచి", note: source?.note_te || (note.met === null ? "ఇచ్చిన వివరాలతో ఖచ్చితంగా పోల్చలేము." : note.met ? "మీరు దాచుకున్న అభిరుచికి సరిపోతుంది." : "మీరు దాచుకున్న అభిరుచికి భిన్నంగా ఉంది.") };
                });
                return (
                  <article key={profile.tsap_id} className="min-w-0 overflow-hidden rounded-3xl border border-gold/30 bg-white shadow-sm">
                    <div className="flex items-center gap-3 border-b border-gray-100 p-4 sm:p-5">
                      <CompareAvatar name={valueOrLabel(profile.full_name, te ? "సభ్యులు" : "Member")} photo={profile.photo_url} />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold uppercase tracking-wide text-maroon">{te ? `సంబంధం ${index + 1}` : `Profile ${index + 1}`}</p>
                        <h2 className="mt-0.5 break-words text-lg font-bold text-gray-900">{valueOrLabel(profile.full_name, te ? "సభ్యుల ప్రొఫైల్" : "Member profile")}</h2>
                        <p className="mt-0.5 break-all font-mono text-xs text-gray-600">{profile.tsap_id}</p>
                      </div>
                    </div>
                    <dl className="divide-y divide-gray-100 px-4 sm:px-5">
                      {visibleRows.map((row) => {
                        let value: unknown = (profile as Record<string, unknown>)[row.key];
                        if (row.key === "caste") value = [profile.caste, profile.sub_caste].filter((value) => !isMissingValue(value)).join(" · ");
                        if (row.key === "district") value = [profile.district, profile.state].filter((value) => !isMissingValue(value)).join(", ");
                        return (
                          <div key={row.key} className="grid grid-cols-[minmax(6.5rem,0.7fr)_minmax(0,1.3fr)] gap-3 py-3 text-sm">
                            <dt className="text-gray-500">
                              {row.label}
                              {differingKeys.has(row.key) && (
                                <span className="ml-1 font-bold text-maroon" title={te ? "ఈ వివరంలో తేడా ఉంది" : "These profiles differ here"}>
                                  •
                                </span>
                              )}
                            </dt>
                            <dd className="break-words font-medium text-gray-900">{renderValue(value)}</dd>
                          </div>
                        );
                      })}
                    </dl>
                    {notes.length > 0 && (
                      <div className="border-t border-gray-100 bg-amber-50/60 px-4 py-3 sm:px-5">
                        <p className="text-xs font-bold text-amber-900">{tally.total > 0 ? tallyLabel(tally, te) : (te ? "ఇచ్చిన వివరాలతో ఖచ్చితంగా పోల్చలేము" : "Saved expectations could not be determined from the listed details")}</p>
                        <ul className="mt-2 space-y-1.5">
                          {notes.map((note) => (
                            <li key={note.key} className="flex gap-2 text-[11px] leading-relaxed text-gray-700">
                              <span aria-hidden="true" className={note.met ? "text-emerald-700" : "text-gray-500"}>
                                {note.met === null ? <span>?</span> : note.met ? <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 h-3.5 w-3.5 shrink-0"><path d="m4 10 4 4 8-8" /></svg> : <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 h-3.5 w-3.5 shrink-0"><path d="m5 5 10 10M15 5 5 15" /></svg>}
                              </span>
                              <span>
                                <span className="font-semibold">{note.label}: </span>
                                {note.note}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
            <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">
              {te ? "ఇక్కడ అనుకూలత లేదా జాతక శాతాలు లెక్కించము. సభ్యులు ఇచ్చిన వివరాలు మాత్రమే చూపిస్తాము; నిర్ణయానికి ముందు నేరుగా నిర్ధారించండి." : "This page does not calculate compatibility or horoscope scores. Details are member-provided; verify important information directly before making decisions."}
            </p>
            {order === "preferences" && hasExpectations && (
              <p className="mt-2 rounded-2xl bg-slate-50 px-4 py-3 text-xs leading-5 text-gray-700">
                {te
                  ? "ఈ క్రమం మీరు దాచుకున్న అభిరుచులలో ఎన్ని సరిపోతున్నాయో లెక్క మాత్రమే. ఇది శాతం కాదు, ఫలితానికి హామీ కాదు."
                  : "This order is only a count of how many of your saved expectations each profile meets. It is not a score, a percentage, or a prediction."}
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => void copySummary()} className="min-h-10 rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon">
                {te ? "సారాంశం కాపీ చేయండి" : "Copy summary"}
              </button>
              <a href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[#128C7E] px-4 py-2 text-sm font-bold text-white hover:bg-[#0f766e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2">
                <WhatsAppIcon className="h-4 w-4" mono />
                {te ? "వాట్సాప్ ద్వారా పంపండి" : "Share with WhatsApp"}
              </a>
              <button type="button" onClick={() => window.print()} className="min-h-10 rounded-full bg-maroon px-4 py-2 text-sm font-bold text-white hover:bg-maroon-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon focus-visible:ring-offset-2 print:hidden">
                {te ? "ప్రింట్" : "Print"}
              </button>
              <button type="button" onClick={() => { invalidate(); setIds([...EMPTY_IDS]); }} className="min-h-10 rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon">
                {te ? "పోలికను తొలగించండి" : "Clear comparison"}
              </button>
            </div>
            <p role="status" aria-live="polite" className="mt-2 text-sm text-gray-600">{copyMessage}</p>
          </section>
        )}
      </div>
    </div>
  );
}
