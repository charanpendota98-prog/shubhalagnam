"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { WhatsAppIcon } from "@/components/BrandIcons";
import { useLang } from "@/lib/lang";
import { apiPost } from "@/lib/api";

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

type CompareResponse = { success?: boolean; profiles?: ProfileCard[] };

const EMPTY_IDS = ["", "", ""] as const;
const ID_PATTERN = /^[A-Z0-9-]{3,32}$/;

function valueOrLabel(value: unknown, missing: string): string {
  const valueText = String(value ?? "").trim();
  return valueText && valueText !== "—" && valueText.toLowerCase() !== "none" ? valueText : missing;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => Array.from(part)[0] || "").join("") || "•";
}

export default function ProfileCompareStudio() {
  const { lang } = useLang();
  const te = lang === "te";
  const [ids, setIds] = useState<string[]>([...EMPTY_IDS]);
  const [showThird, setShowThird] = useState(false);
  const [profiles, setProfiles] = useState<ProfileCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [needsLogin, setNeedsLogin] = useState(false);
  const [copyMessage, setCopyMessage] = useState("");

  const activeIds = showThird ? ids.slice(0, 3) : ids.slice(0, 2);
  const activeProfiles = profiles.slice(0, showThird ? 3 : 2);

  const shareText = useMemo(() => {
    if (activeProfiles.length < 2) return "";
    const lines = ["మన వివాహ — profile comparison", ""];
    activeProfiles.forEach((profile, index) => {
      lines.push(`${index + 1}. ${valueOrLabel(profile.full_name, "Member profile")} (${profile.tsap_id})`);
      const details = [
        ["Age", profile.age],
        ["Caste", [profile.caste, profile.sub_caste].filter(Boolean).join(" · ")],
        ["Gothram", profile.gothram],
        ["Star / Rasi", [profile.star, profile.rasi].filter(Boolean).join(" / ")],
        ["Education", profile.education],
        ["Profession", profile.job],
        ["Location", [profile.district, profile.state].filter(Boolean).join(", ")],
      ] as const;
      details.forEach(([label, value]) => {
        const shown = valueOrLabel(value, "Not provided");
        if (shown !== "Not provided") lines.push(`${label}: ${shown}`);
      });
      lines.push("");
    });
    lines.push("Informational comparison only. Please confirm details directly with the profile owner.");
    return lines.join("\n");
  }, [activeProfiles]);

  const setIdAt = (index: number, value: string) => {
    setIds((current) => {
      const next = [...current];
      next[index] = value.toUpperCase().replace(/\s+/g, "");
      return next;
    });
  };

  const handleCompare = async () => {
    const requested = activeIds.map((value) => value.trim().toUpperCase());
    if (requested.some((value) => !value)) {
      setError(te ? "పోల్చడానికి చూపించిన ప్రతి ID నమోదు చేయండి." : "Enter an ID in each visible field.");
      setNeedsLogin(false);
      return;
    }
    if (requested.some((value) => !ID_PATTERN.test(value))) {
      setError(te ? "Profile ID లో అక్షరాలు, సంఖ్యలు లేదా హైఫన్ మాత్రమే వాడండి." : "Use only letters, numbers, and hyphens in profile IDs.");
      setNeedsLogin(false);
      return;
    }
    if (new Set(requested).size !== requested.length) {
      setError(te ? "ప్రతి profile ID వేర్వేరుగా ఉండాలి." : "Enter a different profile ID in each field.");
      setNeedsLogin(false);
      return;
    }

    setLoading(true);
    setError("");
    setNeedsLogin(false);
    setCopyMessage("");
    setProfiles([]);
    const result = await apiPost<CompareResponse>("/api/matches/compare-profiles", { profile_ids: requested });
    setLoading(false);

    if (!result.ok) {
      setError(result.errorTelugu || result.error || (te ? "Profiles పోల్చలేకపోయాం. మళ్లీ ప్రయత్నించండి." : "Unable to compare these profiles. Please try again."));
      setNeedsLogin(result.needsLogin || result.status === 401);
      return;
    }

    const returned = result.data?.profiles;
    if (!Array.isArray(returned) || returned.length !== requested.length) {
      setError(te ? "అన్ని approved profiles అందుబాటులో లేవు." : "One or more approved profiles are unavailable.");
      return;
    }
    setProfiles(returned);
  };

  const copySummary = async () => {
    if (!shareText) return;
    try {
      await navigator.clipboard.writeText(shareText);
      setCopyMessage(te ? "సారాంశం కాపీ అయ్యింది." : "Comparison summary copied.");
    } catch {
      setCopyMessage(te ? "Clipboard అనుమతి లేదు. WhatsApp share ఉపయోగించండి." : "Clipboard access is unavailable. Use WhatsApp share instead.");
    }
  };

  const renderValue = (value: unknown) => valueOrLabel(value, te ? "వివరాలు ఇవ్వలేదు" : "Not provided");
  const detailRows: { label: string; key: keyof ProfileCard }[] = [
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

  return (
    <main className="min-h-dvh bg-[#FDFBF7] px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
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
              ? "నిజమైన, అందుబాటులో ఉన్న profile IDs తో పోలిక ప్రారంభించండి. కల్పిత profiles లేదా ఊహించిన compatibility scores చూపించము."
              : "Compare approved member profiles using their available information. No example members or invented compatibility scores are shown."}
          </p>
        </header>

        <section aria-labelledby="compare-input-heading" className="rounded-3xl border border-gold/30 bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id="compare-input-heading" className="font-bold text-gray-900">
                {te ? "Profile IDs నమోదు చేయండి" : "Enter profile IDs"}
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                {te ? "పోలికకు sign in కావాలి; 2 లేదా 3 approved profiles ఎంచుకోండి." : "Sign in to compare 2 or 3 approved profiles."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowThird((visible) => !visible);
                setProfiles([]);
                setError("");
              }}
              className="min-h-10 rounded-xl border border-maroon/20 bg-maroon/5 px-3 py-2 text-sm font-semibold text-maroon hover:bg-maroon/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon"
              aria-expanded={showThird}
            >
              {showThird ? (te ? "− తీసివేయి" : "− Remove third profile") : (te ? "+ మూడో profile" : "+ Add a third profile")}
            </button>
          </div>

          <div className={`grid grid-cols-1 gap-3 ${showThird ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
            {activeIds.map((value, index) => (
              <div key={index}>
                <label htmlFor={`compare-id-${index + 1}`} className="mb-1.5 block text-sm font-semibold text-gray-700">
                  {te ? `Profile ID ${index + 1}` : `Profile ID ${index + 1}`}
                </label>
                <input
                  id={`compare-id-${index + 1}`}
                  value={value}
                  onChange={(event) => setIdAt(index, event.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                  maxLength={32}
                  placeholder={te ? "ID నమోదు చేయండి" : "Enter member ID"}
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
              {te ? "Profile ID కనుగొనడానికి Search తెరవండి" : "Open search to find a profile ID"}
            </Link>
          </div>
          {error && (
            <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              <p>{error}</p>
              {needsLogin && <Link href="/login" className="mt-2 inline-flex min-h-10 items-center font-bold underline">{te ? "Login చేయండి" : "Sign in"}</Link>}
            </div>
          )}
          <p className="sr-only" aria-live="polite">{loading ? (te ? "లోడ్ అవుతోంది" : "Loading") : ""}</p>
        </section>

        {activeProfiles.length === 0 && !loading && !error && (
          <div className="rounded-3xl border border-dashed border-gray-300 bg-white/70 px-5 py-12 text-center">
            <div aria-hidden="true" className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-maroon/5 text-2xl text-maroon">⚖</div>
            <h2 className="mt-4 text-lg font-bold text-gray-900">{te ? "పోలిక ఇంకా ప్రారంభం కాలేదు" : "No profiles selected yet"}</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-gray-600">
              {te ? "రెండు లేదా మూడు నిజమైన member IDs నమోదు చేసి పోల్చండి. వివరాలు అందుబాటులో లేకపోతే అవి ఖాళీగా చూపబడతాయి." : "Enter two or three real member IDs to begin. Missing profile details will be labeled as not provided."}
            </p>
          </div>
        )}

        {activeProfiles.length > 0 && (
          <section aria-label={te ? "పోల్చిన profiles" : "Compared profiles"}>
            <div className={`grid grid-cols-1 gap-4 ${activeProfiles.length === 3 ? "lg:grid-cols-3" : "md:grid-cols-2"}`}>
              {activeProfiles.map((profile, index) => (
                <article key={profile.tsap_id} className="min-w-0 overflow-hidden rounded-3xl border border-gold/30 bg-white shadow-sm">
                  <div className="flex items-center gap-3 border-b border-gray-100 p-4 sm:p-5">
                    {profile.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={profile.photo_url} alt="" className="h-14 w-14 shrink-0 rounded-2xl border border-gray-200 object-cover" />
                    ) : (
                      <div aria-hidden="true" className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-maroon/5 text-lg font-bold text-maroon">
                        {initials(valueOrLabel(profile.full_name, "Member"))}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold uppercase tracking-wide text-maroon">{te ? `సంబంధం ${index + 1}` : `Profile ${index + 1}`}</p>
                      <h2 className="mt-0.5 break-words text-lg font-bold text-gray-900">{renderValue(profile.full_name)}</h2>
                      <p className="mt-0.5 break-all font-mono text-xs text-gray-600">{profile.tsap_id}</p>
                    </div>
                  </div>
                  <dl className="divide-y divide-gray-100 px-4 sm:px-5">
                    {detailRows.map((row) => {
                      let value: unknown = profile[row.key];
                      if (row.key === "caste") value = [profile.caste, profile.sub_caste].filter(Boolean).join(" · ");
                      if (row.key === "district") value = [profile.district, profile.state].filter(Boolean).join(", ");
                      return (
                        <div key={row.key} className="grid grid-cols-[minmax(6.5rem,0.7fr)_minmax(0,1.3fr)] gap-3 py-3 text-sm">
                          <dt className="text-gray-500">{row.label}</dt>
                          <dd className="break-words font-medium text-gray-900">{renderValue(value)}</dd>
                        </div>
                      );
                    })}
                  </dl>
                </article>
              ))}
            </div>
            <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">
              {te ? "ఇక్కడ compatibility లేదా జాతక స్కోర్లు లెక్కించము. వివరాలు profile యజమాని అందించిన సమాచారం మాత్రమే; నిర్ణయానికి ముందు నేరుగా నిర్ధారించండి." : "This page does not calculate compatibility or horoscope scores. Details are member-provided; verify important information directly before making decisions."}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => void copySummary()} className="min-h-10 rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon">
                {te ? "సారాంశం కాపీ చేయండి" : "Copy summary"}
              </button>
              <a href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[#128C7E] px-4 py-2 text-sm font-bold text-white hover:bg-[#0f766e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2">
                <WhatsAppIcon className="h-4 w-4" mono />
                {te ? "WhatsApp ద్వారా పంపండి" : "Share with WhatsApp"}
              </a>
              <button type="button" onClick={() => window.print()} className="min-h-10 rounded-full bg-maroon px-4 py-2 text-sm font-bold text-white hover:bg-maroon-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon focus-visible:ring-offset-2 print:hidden">
                {te ? "ప్రింట్" : "Print"}
              </button>
              <button type="button" onClick={() => { setProfiles([]); setIds([...EMPTY_IDS]); setError(""); }} className="min-h-10 rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon">
                {te ? "Clear" : "Clear comparison"}
              </button>
            </div>
            <p role="status" aria-live="polite" className="mt-2 text-sm text-gray-600">{copyMessage}</p>
          </section>
        )}
      </div>
    </main>
  );
}
