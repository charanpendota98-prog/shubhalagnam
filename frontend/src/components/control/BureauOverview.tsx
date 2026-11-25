"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "@/components/LocaleLink";
import { useLang } from "@/lib/lang";

type Counts = { bureaus: number; active_seats: number; revoked_seats: number; consented_clients: number };
type Bureau = Omit<Counts, "bureaus"> & { bureau_id: string; business_name: string; district: string; created_at: string };
type Result = { success: boolean; items: Bureau[]; totals: Counts; matched: number; page: number; pages: number; as_of: string };
const button = "min-h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-800 disabled:opacity-50";

export default function BureauOverview() {
  const { lang } = useLang(); const te = lang === "te";
  const [data, setData] = useState<Result | null>(null);
  const [draft, setDraft] = useState(""); const [query, setQuery] = useState(""); const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  const sequence = useRef(0);
  const load = useCallback(async () => {
    const seq = ++sequence.current; setLoading(true); setError("");
    // Clear the previous page/filter before loading. Never label old rows as fresh.
    setData(null);
    try {
      const r = await fetch(`/api/control/bureaus?q=${encodeURIComponent(query)}&page=${page}&page_size=20`, { credentials: "include", cache: "no-store" });
      if (seq !== sequence.current) return;
      if (!r.ok) { setError(r.status === 401 || r.status === 403 ? "auth" : "load"); return; }
      const d = await r.json();
      if (!d.success || !Array.isArray(d.items) || !d.totals) throw new Error("Invalid overview");
      if (seq === sequence.current) setData(d);
    } catch { if (seq === sequence.current) setError("load"); }
    finally { if (seq === sequence.current) setLoading(false); }
  }, [query, page]);
  useEffect(() => { const counter = sequence; void load(); return () => { ++counter.current; }; }, [load]);
  const labels = te ? ["బ్యూరోలు", "Active operator seats", "Revoked seats", "సమ్మతి నమోదైన roster entries"] : ["Bureaus", "Active operator seats", "Revoked seats", "Consent-recorded roster entries"];
  return <section aria-label="Bureau operations" aria-busy={loading} className="min-w-0 space-y-5 rounded-3xl border border-slate-200 bg-white p-4 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="text-xl font-extrabold text-[#7A0C2E]">{te ? "బ్యూరో కార్యకలాపాలు" : "Bureau operations"}</h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">{te ? "Owner-only, read-only overview. Tenant keys, contacts, సభ్యుల IDs, notes ఇక్కడ చూపించబడవు." : "Owner-only, read-only overview. No tenant keys, contacts, member IDs or notes are shown here."}</p></div>
      <button type="button" className={button} disabled={loading} onClick={() => void load()}>{te ? "మళ్లీ లోడ్" : "Refresh bureaus"}</button>
    </div>
    <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-950">{te ? "Roster సమ్మతి బ్యూరో నమోదు చేసినది మాత్రమే; స్వతంత్రంగా ధృవీకరించిన consent కాదు. ఇవి registrations, paid plans లేదా verified bureaus సంఖ్యలు కావు." : "Roster consent is recorded by the bureau, not independently verified. These are not member registrations, paid plans or verified-bureau counts."}</p>
    <form className="flex flex-wrap items-end gap-2" onSubmit={e => { e.preventDefault(); if(query === draft.trim() && page === 1) void load(); else { setPage(1); setQuery(draft.trim()); } }}>
      <label className="min-w-0 w-full text-sm font-bold text-slate-700 sm:w-auto sm:flex-1">{te ? "బ్యూరో పేరు, ID లేదా జిల్లా" : "Bureau name, ID or district"}
        <input value={draft} onChange={e => setDraft(e.target.value)} maxLength={100} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3 font-normal" /></label>
      <button className={button} type="submit" disabled={loading}>{te ? "వెతకండి" : "Search bureaus"}</button>
    </form>
    {loading && <p role="status" className="text-sm text-slate-600">{te ? "లోడ్ అవుతోంది…" : "Loading bureau overview…"}</p>}
    {error && <div role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-950">{error === "auth" ? (te ? "Owner session అవసరం. మళ్లీ సైన్ ఇన్ చేయండి." : "An owner session is required. Please sign in again.") : (te ? "బ్యూరో వివరాలు లోడ్ కాలేదు. ఖాళీగా ఉన్నాయని కాదు. మళ్లీ ప్రయత్నించండి." : "Bureau details could not be loaded. This does not mean there are no bureaus. Please retry.")}
      {error === "auth" && <Link className="mt-2 block min-h-11 py-3 font-bold underline" href="/control/login">{te ? "సైన్ ఇన్" : "Sign in"}</Link>}</div>}
    {data && <>
      <p className="text-xs text-slate-600">{te ? "అన్ని బ్యూరోల మొత్తం · Snapshot: " : "All-bureau totals · Snapshot: "}{data.as_of.replace("T", " ")}</p>
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">{(["bureaus", "active_seats", "revoked_seats", "consented_clients"] as const).map((k, i) => <div key={k} className="rounded-2xl bg-slate-50 p-4"><dt className="text-xs font-semibold text-slate-600">{labels[i]}</dt><dd className="mt-1 text-2xl font-extrabold text-[#7A0C2E]">{data.totals[k]}</dd></div>)}</dl>
      <p role="status" className="text-sm font-semibold text-slate-700">{data.matched} {te ? "ఫలితాలు" : "results"} · {te ? "పేజీ" : "Page"} {data.page} / {data.pages}</p>
      {data.items.length === 0 ? <p className="rounded-xl border border-dashed border-slate-300 p-5 text-sm text-slate-600">{query ? (te ? "ఈ శోధనకు ఫలితాలు లేవు." : "No bureaus match this search.") : (te ? "ఇంకా బ్యూరో workspaces సృష్టించబడలేదు." : "No bureau workspaces have been created yet.")}</p> : <div className="grid min-w-0 gap-3 lg:grid-cols-2">{data.items.map(row => <article key={row.bureau_id} className="min-w-0 rounded-2xl border border-slate-200 p-4 [overflow-wrap:anywhere]">
        <h3 className="font-extrabold text-slate-900">{row.business_name || row.bureau_id}</h3><p className="mt-1 text-xs text-slate-600">{row.bureau_id} · {row.district || (te ? "జిల్లా నమోదు కాలేదు" : "District not recorded")}</p>
        <dl className="mt-3 space-y-2 text-sm">{(["active_seats", "revoked_seats", "consented_clients"] as const).map((key, i) => <div key={key} className="flex justify-between gap-4"><dt className="text-slate-600">{labels[i+1]}</dt><dd className="shrink-0 font-bold text-slate-900">{row[key]}</dd></div>)}</dl>
        <p className="mt-3 text-xs text-slate-500">{te ? "సృష్టించబడింది: " : "Created: "}{row.created_at ? row.created_at.replace("T", " ") : (te ? "నమోదు కాలేదు" : "Not recorded")}</p>
      </article>)}</div>}
      <nav aria-label="Bureau result pages" className="flex flex-wrap gap-2"><button type="button" className={button} disabled={data.page <= 1 || loading} onClick={() => setPage(data.page - 1)}>{te ? "వెనుకకు" : "Previous page"}</button><button type="button" className={button} disabled={data.page >= data.pages || loading} onClick={() => setPage(data.page + 1)}>{te ? "తరువాత" : "Next page"}</button></nav>
    </>}
    <div className="border-t border-slate-200 pt-4 text-sm text-slate-600"><p>{te ? "Seats లేదా roster మార్చాలంటే ఆ tenant credentials అవసరం. Platform owner view ద్వారా tenant access రాదు." : "Changing seats or a roster still requires that tenant's credentials. This platform overview does not grant tenant access."}</p><Link href="/bureau" className="mt-2 inline-flex min-h-11 items-center font-bold text-[#7A0C2E] underline">{te ? "Tenant workspace తెరవండి" : "Open tenant workspace"}</Link></div>
  </section>;
}
