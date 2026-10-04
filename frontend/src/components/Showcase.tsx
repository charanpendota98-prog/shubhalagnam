"use client";
/**
 * 🎊 WEEKLY CASTE SHOWCASE CONSOLE (WAVE 41)
 * ===========================================
 * "వారానికి ఒక కులం" — okko varam okko caste ki showcase (best profiles).
 * Rotation suggestion: last week caste tarvata next caste. Post → caste channels.
 */
import { useEffect, useMemo, useState } from "react";
import { authHeaders } from "@/lib/api";
import { useLang } from "@/lib/lang";

type Row = Record<string, any>;

const adminToken = () => {
  try { return localStorage.getItem("tsap_admin_token") || ""; } catch { return ""; }
};
const withToken = (url: string) => {
  const tk = adminToken();
  return tk ? `${url}${url.includes("?") ? "&" : "?"}token=${encodeURIComponent(tk)}` : url;
};

export default function Showcase() {
  const { lang } = useLang();
  const te = lang === "te";
  const [caste, setCaste] = useState("");
  const [castes, setCastes] = useState<string[]>([]);
  const [suggestion, setSuggestion] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [cur, setCur] = useState<Row | null>(null);
  const [sel, setSel] = useState<Record<string, boolean>>({});
  const [q, setQ] = useState("");
  const [flash, setFlash] = useState("");
  const [loading, setLoading] = useState(false);

  const loadCastes = async () => {
    try {
      const r = await fetch("/api/search/facets?limit=60").then((x) => x.json());
      const cs = ((r?.facets?.castes || r?.facets?.caste || []) as string[]).filter(Boolean);
      if (cs.length) { setCastes(cs.sort()); if (!caste) setCaste(cs[0]); }
    } catch { /* ignore */ }
  };
  useEffect(() => { void loadCastes(); fetch("/api/showcase").then((r) => r.json()).then((d) => {
    if (d?.success && d.caste) setCur(d);
  }).catch(() => { }); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const load = async (c?: string) => {
    const cc = (c || caste).trim();
    if (!cc) { setFlash(te ? "⚠️ Caste ఎంచుకోండి" : "⚠️ Pick a caste"); return; }
    setLoading(true); setFlash("");
    try {
      const r = await fetch(withToken(`/api/admin/showcase/candidates?caste=${encodeURIComponent(cc)}&limit=60`), { headers: authHeaders(true) });
      const d = await r.json();
      if (d.success) {
        setRows(d.candidates || []); setSuggestion(d.next_caste_suggestion || ""); setSel({});
        if (d.current_week?.ids) setSel(Object.fromEntries(d.current_week.ids.map((x: string) => [x, true])));
        setFlash(te ? `✅ ${d.count} ${cc} profiles · reviewed public photos first` : `✅ ${d.count} ${cc} profiles · reviewed public photos first`);
      } else setFlash(d.detail || "fail");
    } catch { setFlash(te ? "⚠️ API error" : "⚠️ API error"); }
    finally { setLoading(false); }
  };

  const filtered = useMemo(() => !q ? rows : rows.filter((x) =>
    `${x.tsap_id} ${x.full_name} ${x.district}`.toLowerCase().includes(q.toLowerCase())), [rows, q]);
  const selIds = Object.keys(sel).filter((k) => sel[k]);
  const toggle = (id: string) => setSel((s) => ({ ...s, [id]: !s[id] }));

  const apply = async (post: boolean) => {
    if (!selIds.length) { setFlash(te ? "⚠️ Profiles select చెయ్యండి" : "⚠️ Select profiles"); return; }
    setFlash(te ? "⏳ Setting + posting…" : "⏳ Setting + posting…");
    try {
      const r = await fetch(withToken("/api/admin/showcase"), {
        method: "POST", headers: { ...authHeaders(true), "Content-Type": "application/json" },
        body: JSON.stringify({ caste, profile_ids: selIds, post_to_channels: post }),
      });
      const d = await r.json();
      if (d.success) { setFlash(d.message_telugu || `✅ ${d.selected?.length} set · ${d.posted?.length} posted · next: ${d.next_caste}`); setCur({ caste: d.caste, matches: [] }); }
      else setFlash(d.detail || "fail");
    } catch { setFlash(te ? "⚠️ API error" : "⚠️ API error"); }
  };

  return (
    <div>
      <p className="telugu mt-2 text-xs text-gray-500">
        {te ? <>వారానికి <b>ఒక community</b> — చూపించదలచిన profiles ను review చేసి, showcase గా ఎంచుకోండి. Homepage లో కనిపించేలా సెట్ చేయవచ్చు.</> : <>Review and select the profiles you want to feature for one community each week. The showcase can appear on the homepage.</>}
      </p>

      {cur?.caste ? (
        <div className="mt-2 rounded-xl bg-emerald-50 border border-emerald-200 p-2 text-xs">
          🎊 {te ? "ఈ వారం" : "This week"}: <b>{cur.caste}</b>
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select value={caste} onChange={(e) => setCaste(e.target.value)} aria-label="Caste"
          className="rounded-xl border border-[#7A0C2E]/30 px-3 py-2 text-sm">
          {castes.length === 0 && <option value="">—</option>}
          {castes.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        {suggestion && (
          <button onClick={() => { setCaste(suggestion); void load(suggestion); }}
            className="rounded-xl border border-[#B8860B] bg-[#FFF8E7] px-3 py-2 text-xs font-bold text-[#8B6914]">
            🔄 {te ? `వచ్చే వారం: ${suggestion} (rotation)` : `Next: ${suggestion}`}
          </button>
        )}
        <button onClick={() => void load()} disabled={loading}
          className="rounded-xl bg-[#7A0C2E] px-5 py-2 text-sm font-bold text-white disabled:opacity-60">
          {loading ? "⏳" : te ? "🎊 Profiles load" : "Load profiles"}
        </button>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={te ? "వెతకండి…" : "Search…"}
          aria-label="Search" className="min-w-[160px] flex-1 rounded-xl border px-3 py-2 text-sm" />
      </div>

      {flash ? <div className="mt-2 rounded-xl bg-[#0F1F3C] p-3 text-xs text-white">{flash}</div> : null}
      <div className="mt-2 text-xs"><b className="text-[#7A0C2E]">{filtered.length}</b> {te ? "profiles · " : "profiles · "}<b>{selIds.length}</b> selected (max 12)</div>

      <div className="mt-2 max-h-[380px] overflow-auto rounded-2xl border">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-[#FFF8E7]">
            <tr className="text-left text-gray-500"><th className="p-2">☑️</th><th>Profile</th><th>Details</th><th>📸</th></tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={4} className="p-4 text-center text-gray-500">{te ? "Caste ఎంచుకుని load చెయ్యండి" : "Pick a caste and load"}</td></tr>
            ) : filtered.map((x) => (
              <tr key={x.tsap_id} className={`border-t ${sel[x.tsap_id] ? "bg-emerald-50" : ""}`}>
                <td className="p-2 text-center"><input type="checkbox" checked={!!sel[x.tsap_id]} onChange={() => toggle(x.tsap_id)} aria-label={`Select ${x.tsap_id}`} className="h-4 w-4 accent-[#7A0C2E]" /></td>
                <td className="p-2"><div className="font-bold">{x.full_name}</div><div className="font-mono text-[10px] text-gray-500">{x.tsap_id}</div></td>
                <td className="p-2">{x.gender === "Bride" ? "👰" : "🤵"} {x.age}y · {x.district}<div className="text-[10px] text-gray-500">{x.job} · {x.education}</div></td>
                <td className="p-2">{x.has_photo ? "✅" : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button onClick={() => void apply(true)} className="rounded-xl bg-[#7A0C2E] px-5 py-2.5 text-sm font-bold text-white">
          🎊 {te ? "ఈ వారం showcase గా set + caste channels లో post" : "Set weekly showcase + post"}
        </button>
        <button onClick={() => void apply(false)} className="rounded-xl border border-[#7A0C2E] px-4 py-2.5 text-xs font-bold text-[#7A0C2E]">
          {te ? "set మాత్రమే (post వద్దు)" : "Set only"}
        </button>
      </div>
    </div>
  );
}
