"use client";
/**
 * 📤 DATA TOOLS (WAVE 40) — Excel exports + 3-year retention manager
 * ==================================================================
 * - Full data Excel (CSV) downloads: profiles / payments / leads / partners
 * - Retention: preview (3+ years profiles) → run (archive + delete)
 */
import { useEffect, useState } from "react";
import { authHeaders, readApiJson} from "@/lib/api";
import { useLang } from "@/lib/lang";

type Row = Record<string, any>;

const adminToken = () => {
  try { return localStorage.getItem("tsap_admin_token") || ""; } catch { return ""; }
};
const withToken = (url: string) => {
  const tk = adminToken();
  return tk ? `${url}${url.includes("?") ? "&" : "?"}token=${encodeURIComponent(tk)}` : url;
};

export default function DataTools() {
  const { lang } = useLang();
  const te = lang === "te";
  const [flash, setFlash] = useState("");
  const [ret, setRet] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);

  const loadPreview = async () => {
    setBusy(true);
    try {
      const r = await fetch(withToken("/api/admin/retention/preview"), { headers: authHeaders(true) });
      const d = await readApiJson(r);
      if (d.success) { setRet(d); setFlash(""); } else setFlash(d.detail || "fail");
    } catch { setFlash(te ? "⚠️ API error" : "⚠️ API error"); }
    finally { setBusy(false); }
  };
  useEffect(() => { void loadPreview(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const runRetention = async () => {
    if (!confirm(te ? "3+ years అయిన profiles ARCHIVE + DELETE చేయాలా? (backup ముందే ఉంటుంది)" : "Archive + DELETE 3+ year old profiles? (backup happens first)")) return;
    setBusy(true);
    try {
      const r = await fetch(withToken("/api/admin/retention/run"), {
        method: "POST", headers: { ...authHeaders(true), "Content-Type": "application/json" }, body: JSON.stringify({}),
      });
      const d = await readApiJson(r);
      setFlash(d.message_telugu || (d.success ? `✅ deleted: ${d.deleted} · skipped: ${d.skipped} · archive saved` : d.detail || "fail"));
      void loadPreview();
    } catch { setFlash(te ? "⚠️ API error" : "⚠️ API error"); }
    finally { setBusy(false); }
  };

  const dl = (path: string) => {
    window.open(withToken(path), "_blank");
  };

  const exports = [
    { icon: "👥", label: te ? "ప్రొఫైళ్లు (full data)" : "Profiles (full data)", path: "/api/admin/export/users.csv", note: te ? "ID, name, phone, caste, plan, wallet — అన్నీ" : "ID, name, phone, caste, plan, wallet — all" },
    { icon: "💳", label: te ? "చెల్లింపులు" : "Payments", path: "/api/admin/export/payments.csv", note: "orders + status + UTR" },
    { icon: "📞", label: te ? "Leads" : "Leads", path: "/api/admin/export/leads.csv", note: te ? "follow-up కోసం phones" : "phones for follow-up" },
    { icon: "🤝", label: te ? "Referral partners" : "Referral partners", path: "/api/admin/referrals/partners.csv", note: te ? "codes + earnings" : "codes + earnings" },
  ];

  const toDelete = ret?.to_delete || [];
  const skipped = ret?.skipped_active || [];

  return (
    <div>
      {/* EXPORTS */}
      <h3 className="font-bold text-[#7A0C2E]">📤 Excel Download</h3>
      <p className="telugu mt-1 text-xs text-gray-500">{te ? "అన్ని data Excel లో open అయ్యే CSV files — ఒక క్లిక్ డౌన్‌లోడ్." : "All data as Excel-ready CSV — one-click download."}</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {exports.map((e) => (
          <button type="button" key={e.path} onClick={() => dl(e.path)}
            className="rounded-2xl border border-[#7A0C2E]/20 bg-white p-4 text-left shadow-sm hover:border-[#7A0C2E]/50">
            <div className="font-bold text-[#7A0C2E]">{e.icon} {e.label}</div>
            <div className="mt-1 text-[11px] text-gray-500">{e.note}</div>
            <div className="mt-2 text-[11px] font-bold text-[#B8860B]">⬇️ {te ? "డౌన్‌లోడ్" : "Download"}</div>
          </button>
        ))}
      </div>

      {/* RETENTION */}
      <h3 className="mt-8 font-bold text-[#7A0C2E]">🗑️ {te ? "3 సంవత్సరాల Retention" : "3-Year Retention"}</h3>
      <p className="telugu mt-1 text-xs text-gray-500">
        {te ? <>Profile create చేసిన తేదీ నుంచి 3 సంవత్సరాలు దాటిన అర్హమైన records ను archive చేసి active store నుంచి తొలగిస్తాం. ఆ archive కు automatic purge deadline ప్రస్తుతం లేదు; ఇది పూర్తి erasure కాదు. Balance, pending payout, active plan లేదా boost ఉన్నవి skip అవుతాయి.</> : <>Eligible records older than three years from profile creation are archived before removal from active stores. Archives currently have no automatic purge deadline, so this is not complete erasure. Records with a balance, pending payout, active plan, or boost are skipped.</>}
      </p>
      {ret ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-white p-4 text-center shadow-sm border"><div className="text-2xl font-bold text-[#7A0C2E]">{ret.total_users}</div><div className="text-xs">{te ? "మొత్తం profiles" : "Total profiles"}</div></div>
          <div className="rounded-2xl bg-white p-4 text-center shadow-sm border"><div className="text-2xl font-bold text-orange-600">{toDelete.length}</div><div className="text-xs">{te ? "3+ సంవత్సరాలు (delete అవుతాయి)" : "3+ years (to delete)"}</div></div>
          <div className="rounded-2xl bg-white p-4 text-center shadow-sm border"><div className="text-2xl font-bold text-green-600">{skipped.length}</div><div className="text-xs">{te ? "Money/plan active (safe)" : "Active money (safe)"}</div></div>
        </div>
      ) : null}
      {toDelete.length > 0 && (
        <div className="mt-2 max-h-40 overflow-auto rounded-xl border p-2 text-[11px] font-mono">
          {toDelete.slice(0, 50).map((x: Row) => <div key={x.tsap_id}>{x.tsap_id} · {x.name} · {String(x.created_at || "").slice(0, 10)}</div>)}
          {toDelete.length > 50 && <div className="text-gray-400">… +{toDelete.length - 50} more</div>}
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => void runRetention()} disabled={busy || !toDelete.length}
          className="rounded-xl bg-[#7A0C2E] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">
          🗑️ {te ? "ఇప్పుడే run చెయ్యి (archive + delete)" : "Run now (archive + delete)"}
        </button>
        <button type="button" onClick={() => void loadPreview()} disabled={busy}
          className="rounded-xl border border-[#7A0C2E] px-4 py-2.5 text-xs font-bold text-[#7A0C2E]">🔄 {te ? "ప్రివ్యూ రిఫ్రెష్" : "Refresh preview"}</button>
      </div>
      {flash ? <div className="mt-3 rounded-xl bg-[#0F1F3C] p-3 text-xs text-white">{flash}</div> : null}
    </div>
  );
}
