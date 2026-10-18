"use client";
/** Admin-curated featured-profile tool; not a compatibility ranking or identity check. */
import { useEffect, useMemo, useState } from "react";
import { apiDisplayMessage, authHeaders, readApiJson } from "@/lib/api";
import { useLang } from "@/lib/lang";

type Row = Record<string, any>;

export default function DailyMatches() {
  const { lang } = useLang();
  const te = lang === "te";
  const [rows, setRows] = useState<Row[]>([]);
  const [today, setToday] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState("");
  const [selection, setSelection] = useState<Record<string, boolean>>({});
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<Row | null>(null);

  const load = async () => {
    setLoading(true);
    setFlash("");
    try {
      const response = await fetch("/api/admin/daily-matches/candidates?limit=100", {
        headers: authHeaders(true),
      });
      const data = await readApiJson(response);
      if (!response.ok || !data.success) {
        setFlash(data.detail || (te ? "లోడ్ చేయడం సాధ్యం కాలేదు" : "Could not load profiles"));
        return;
      }
      setRows(data.candidates || []);
      setToday(data.today || []);
      setFlash(te
        ? `${data.count} ఆమోదించిన profiles · ${data.boosted_count} sponsored placement`
        : `${data.count} approved profiles · ${data.boosted_count} sponsored placements`);
    } catch {
      setFlash(te ? "API అందుబాటులో లేదు" : "API request failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) =>
      `${row.tsap_id} ${row.full_name} ${row.caste} ${row.district}`.toLowerCase().includes(term));
  }, [rows, query]);

  const selectedIds = Object.keys(selection).filter((id) => selection[id]);
  const toggle = (id: string) => setSelection((current) => ({ ...current, [id]: !current[id] }));
  const selectVisible = (checked: boolean) => {
    setSelection((current) => {
      const next = { ...current };
      filtered.forEach((row) => {
        if (checked) next[row.tsap_id] = true;
        else delete next[row.tsap_id];
      });
      return next;
    });
  };

  const apply = async (post: boolean) => {
    if (!selectedIds.length) {
      setFlash(te ? "ముందుగా profiles ఎంచుకోండి" : "Select at least one profile first");
      return;
    }
    if (post && !window.confirm(te
      ? "ఎంచుకున్న profile summaries ప్రస్తుత configured channels‌కు పంపడానికి ప్రయత్నించాలా? Live publishing enabled అయితే ఇది బాహ్య post అవుతుంది. Delivery హామీ లేదు."
      : "Attempt to publish these profile summaries to currently configured channels? If live publishing is enabled, this sends external posts. Delivery is not guaranteed.")) return;

    setSaving(true);
    setFlash(post
      ? (te ? "పోస్టింగ్ స్థితిని తనిఖీ చేస్తున్నాం…" : "Checking publishing result…")
      : (te ? "Featured జాబితాను సేవ్ చేస్తున్నాం…" : "Saving featured list…"));
    try {
      const response = await fetch("/api/admin/daily-matches", {
        method: "POST",
        headers: { ...authHeaders(true), "Content-Type": "application/json" },
        body: JSON.stringify({ profile_ids: selectedIds, post_to_channels: post }),
      });
      const data = await readApiJson(response);
      if (!response.ok || !data.success) {
        setFlash(data.detail || (te ? "సేవ్ చేయడం సాధ్యం కాలేదు" : "Could not save featured profiles"));
        return;
      }
      setResult(data);
      setToday(data.selected || []);
      setFlash(te
        ? `${data.selected?.length || 0} profiles featured జాబితాలో సేవ్ అయ్యాయి`
        : `${data.selected?.length || 0} profiles saved as today's featured list`);
      await load();
    } catch {
      setFlash(te ? "API request విఫలమైంది" : "API request failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section aria-labelledby="daily-featured-title" className="space-y-3">
      <div>
        <h2 id="daily-featured-title" className="text-lg font-extrabold text-[#7A0C2E]">
          {te ? "ఈ రోజు featured profiles" : "Today’s featured profiles"}
        </h2>
        <p className="telugu mt-1 text-xs leading-relaxed text-gray-600">
          {te
            ? <>ఇది admin-curated జాబితా మాత్రమే — compatibility, identity లేదా విజయంపై verdict కాదు. Active paid boost ఉన్న profiles‌కు <b>sponsored placement</b> ఇవ్వబడుతుంది; మిగతావి recent registration క్రమంలో ఉంటాయి. Posting వేరే, స్పష్టమైన action.</>
            : <>This is an admin-curated list—not a compatibility, identity, or outcome verdict. Profiles with an active paid boost receive <b>sponsored placement</b>; others follow recency. Publishing is a separate, explicit action.</>}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor="daily-featured-search">{te ? "Profiles వెతకండి" : "Search profiles"}</label>
        <input
          id="daily-featured-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={te ? "ID / పేరు / caste / district వెతకండి" : "Search ID, name, caste, or district"}
          className="min-w-[200px] flex-1 rounded-xl border border-[#7A0C2E]/30 px-3 py-2 text-sm"
        />
        <button type="button" onClick={() => void load()} disabled={loading || saving}
          className="rounded-xl border border-[#7A0C2E] px-4 py-2 text-xs font-bold text-[#7A0C2E] disabled:opacity-50">
          {loading ? (te ? "లోడ్ అవుతోంది…" : "Loading…") : (te ? "రిఫ్రెష్" : "Refresh")}
        </button>
      </div>

      {today.length > 0 && (
        <p className="break-words rounded-xl border border-emerald-200 bg-emerald-50 p-2 text-xs">
          {te ? "ఈ రోజు featured IDs" : "Today’s featured IDs"}: <b>{today.join(", ")}</b>
        </p>
      )}
      {flash && <p role="status" aria-live="polite" className="break-words rounded-xl bg-[#0F1F3C] p-3 text-xs text-white">{flash}</p>}

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <b className="text-[#7A0C2E]">{filtered.length} {te ? "profiles" : "profiles"}</b>
        <button type="button" onClick={() => selectVisible(true)} className="rounded-full bg-gray-200 px-3 py-1">
          {te ? "కనిపిస్తున్నవి ఎంచుకోండి" : "Select visible"}
        </button>
        <button type="button" onClick={() => selectVisible(false)} className="rounded-full bg-gray-200 px-3 py-1">
          {te ? "కనిపిస్తున్నవి తీసేయండి" : "Clear visible"}
        </button>
        <b>{te ? "ఎంపిక" : "Selected"}: {selectedIds.length}</b>
      </div>

      <div className="max-h-[380px] overflow-auto rounded-2xl border" role="region" aria-label={te ? "ఎంచుకోవడానికి profiles" : "Profiles available for featuring"}>
        <table className="w-full min-w-[580px] text-xs">
          <thead className="sticky top-0 bg-[#FFF8E7]">
            <tr className="text-left text-gray-600">
              <th scope="col" className="p-2">{te ? "ఎంచుకోండి" : "Select"}</th>
              <th scope="col" className="p-2">{te ? "Profile" : "Profile"}</th>
              <th scope="col" className="p-2">{te ? "వివరాలు" : "Details"}</th>
              <th scope="col" className="p-2">{te ? "Placement" : "Placement"}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={4} className="p-4 text-center text-gray-500">{te ? "ఆమోదించిన profiles లేవు" : "No approved profiles found"}</td></tr>
            ) : filtered.map((row) => {
              const displayedTerms = [row.caste, row.district, row.job, row.marital_status]
                .map((value) => te ? String(value || "") : apiDisplayMessage({ message_en: value }, false, ""));
              const [caste, district, job, maritalStatus] = displayedTerms;
              return (
              <tr key={row.tsap_id} className={`border-t ${selection[row.tsap_id] ? "bg-emerald-50" : ""} ${today.includes(row.tsap_id) ? "bg-amber-50" : ""}`}>
                <td className="p-2 text-center">
                  <input type="checkbox" checked={!!selection[row.tsap_id]} onChange={() => toggle(row.tsap_id)}
                    aria-label={`${te ? "ఎంచుకోండి" : "Select"} ${row.tsap_id}`} className="h-4 w-4 accent-[#7A0C2E]" />
                </td>
                <td className="p-2">
                  <div className="font-bold">{row.full_name}</div>
                  <div className="font-mono text-[10px] text-gray-500">{row.tsap_id}</div>
                </td>
                <td className="p-2">
                  {row.age ? `${row.age}y · ` : ""}{[caste, district].filter(Boolean).join(" · ")}
                  <div className="text-[10px] text-gray-500">{[job, maritalStatus].filter(Boolean).join(" · ")}</div>
                </td>
                <td className="p-2">
                  {row.boost_active
                    ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">{te ? "Sponsored" : "Sponsored"}</span>
                    : <span className="text-gray-600">{te ? "Featured" : "Featured"}</span>}
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => void apply(false)} disabled={saving || loading}
          className="rounded-xl bg-[#7A0C2E] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">
          {te ? "Featured జాబితా సేవ్ చేయండి — post చేయవద్దు" : "Save featured list — no posting"}
        </button>
        <button type="button" onClick={() => void apply(true)} disabled={saving || loading}
          className="rounded-xl border border-[#7A0C2E] px-4 py-2.5 text-xs font-bold text-[#7A0C2E] disabled:opacity-50">
          {te ? "స్పష్టమైన confirmation తర్వాత channels‌కు post" : "Attempt channel publishing (confirm first)"}
        </button>
      </div>

      {result && (
        <div className="space-y-1 rounded-xl bg-gray-50 p-3 text-xs">
          <p>{te ? "Featured profiles సేవ్ అయ్యాయి" : "Featured profiles saved"}: <b>{result.selected?.length || 0}</b></p>
          {result.posting_attempted && <p>
            {te ? "API ద్వారా అంగీకరించబడినవి" : "Accepted by publishing API"}: <b>{result.posted?.length || 0}</b>
            {" · "}{te ? "Queue లో చేరినవి" : "Queued"}: <b>{result.queued?.length || 0}</b>
            {" · "}{te ? "డ్రై-రన్ previewలు" : "Dry-run previews"}: <b>{result.would_post?.length || 0}</b>
            {" · "}{te ? "విఫలమైనవి" : "Failed"}: <b>{result.failed?.length || 0}</b>
          </p>}
          {result.posting_attempted && <p className="text-gray-600">
            {te ? "API acceptance బాహ్య delivery లేదా views‌కు హామీ కాదు." : "API acceptance does not confirm external delivery or views."}
          </p>}
        </div>
      )}
    </section>
  );
}
