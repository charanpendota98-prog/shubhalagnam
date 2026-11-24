"use client";

/**
 * 📸 WAVE 17 — ADMIN photo + selfie moderation queue (Layer-2 human review).
 * Admin key (X-Admin-Key) tho matrame. Wrong-person/group/celebrity → reject + Telugu reason.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Duo } from "@/lib/duo";
import { useLang } from "@/lib/lang";
import Link from "next/link";
import { apiFetch, apiPost, getAdminKey, setAdminKey } from "@/lib/api";
import ProtectedImage from "@/components/ProtectedImage";

type Item = {
  kind: string; revision: string; tsap_id: string; name: string; url: string;
  checks: Record<string, string | number>; at: string;
};

const REJECT_REASONS = [
  { en: "Not your photo (wrong person)", te: "ఇది మీ ఫోటో కాదు — మీ సొంత ఫోటో పంపండి" },
  { en: "Group photo — single photo only", te: "గ్రూప్ ఫోటో వద్దు — మీ single ఫోటో మాత్రమే పంపండి" },
  { en: "Photo of a photo / screenshot", te: "వేరే ఫోటో/screen ని తీసినది — ORIGINAL ఫోటో పంపండి" },
  { en: "Face not clearly visible", te: "ముఖం స్పష్టంగా కనిపించట్లేదు — clear front-face ఫోటో పంపండి" },
  { en: "Celebrity / downloaded image", te: "సినిమా/download ఫోటో వద్దు — మీ original ఫోటో పంపండి" },
];

export default function AdminPhotosPage() {
  const { lang } = useLang();
  const te = lang === "te";
  const [key, setKey] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [msg, setMsg] = useState("");
  const [status, setStatus] = useState<"loading" | "ready" | "auth" | "error">("loading");
  const sequence = useRef(0);
  const [busy, setBusy] = useState("");
  const [reasonIdx, setReasonIdx] = useState<Record<string, number>>({});

  useEffect(() => { setKey(getAdminKey()); }, []);

  const load = useCallback(async () => {
    const request = ++sequence.current;
    setStatus("loading");
    setMsg("");
    setItems([]);
    const { ok, status: code, data, errorTelugu } = await apiFetch<{ count?: number; queue?: Item[] }>("/api/admin/photos/pending", { admin: true, cache: "no-store" });
    if (request !== sequence.current) return;
    if (!ok) {
      setStatus(code === 401 || code === 403 ? "auth" : "error");
      setMsg(errorTelugu);
      return;
    }
    if (!Array.isArray(data?.queue)) { setStatus("error"); return; }
    setItems(data.queue);
    setStatus("ready");
  }, []);

  // The endpoint already accepts owner/staff cookies. Do not gate its GET on
  // a legacy key or issue a new request for every character typed into a key.
  useEffect(() => { void load(); return () => { sequence.current++; }; }, [load]);

  const review = async (it: Item, decision: "approved" | "rejected") => {
    setBusy(it.tsap_id + it.kind);
    const r = REJECT_REASONS[reasonIdx[it.tsap_id + it.kind] || 0];
    const { ok, status: code, errorTelugu } = await apiPost("/api/admin/photos/review", {
      tsap_id: it.tsap_id, kind: it.kind, revision: it.revision, decision,
      reason: r.en, reason_te: r.te,
    }, true);
    setBusy("");
    if (!ok && code === 409) { await load(); setMsg(te ? "ఫోటో మారింది లేదా ఇప్పటికే సమీక్షించారు. తాజా ఫోటోను చూసి మళ్లీ నిర్ణయించండి." : "The photo changed or was already reviewed. Check the refreshed image before deciding."); return; }
    if (!ok) { setMsg(errorTelugu); if (code === 401 || code === 403) { sequence.current++; setItems([]); setStatus("auth"); } return; }
    setItems((xs) => xs.filter((x) => !(x.tsap_id === it.tsap_id && x.kind === it.kind)));
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-extrabold text-maroon">📸 <Duo en="Photo Review Queue" te="ఫోటో పరిశీలన" /></h1>
        <Link href="/control" className="inline-flex min-h-10 items-center justify-center rounded-xl border border-maroon/20 px-3 py-2 text-xs font-bold text-maroon hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon focus-visible:ring-offset-2">
          {te ? "← అడ్మిన్ డాష్‌బోర్డ్" : "← Admin dashboard"}
        </Link>
      </div>
      <p className="text-[12px] text-gray-600 telugu">{te ? "Technical checks pass అయిన photos మాత్రమే ఇక్కడ — wrong-person/group/celebrity ని reject చెయ్యండి." : "Only photos that passed technical checks — reject wrong-person/group/celebrity."}</p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Link href="/control/login" className="inline-flex min-h-11 items-center rounded-xl border border-maroon/30 px-4 py-2 text-sm font-bold text-maroon">
          {te ? "యజమాని / సిబ్బంది లాగిన్" : "Owner / staff sign in"}
        </Link>
        <button type="button" disabled={status === "loading" || !!busy} onClick={() => void load()} className="min-h-11 shrink-0 whitespace-nowrap rounded-xl border border-slate-300 px-4 py-2 text-sm disabled:opacity-50">
          {status === "loading" ? (te ? "లోడ్ అవుతోంది…" : "Loading…") : (te ? "మళ్లీ లోడ్ చేయండి" : "Refresh queue")}{status === "ready" ? ` (${items.length})` : ""}
        </button>
      </div>
      <details className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
        <summary className="cursor-pointer text-sm text-slate-700">{te ? "పాత admin key తో ప్రవేశం" : "Legacy admin key access"}</summary>
        <form className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end" onSubmit={(e) => { e.preventDefault(); setAdminKey(key); void load(); }}>
          <label className="min-w-0 flex-1 text-xs font-semibold text-slate-700">
            {te ? "అడ్మిన్ కీ" : "Admin key"}
            <input aria-label={te ? "అడ్మిన్ కీ" : "Admin key"} value={key} onChange={(e) => setKey(e.target.value)} type="password" autoComplete="off" className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          </label>
          <button type="submit" disabled={status === "loading" || !!busy || !key.trim()} className="min-h-11 shrink-0 whitespace-nowrap rounded-xl bg-maroon px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{te ? "తెరవండి" : "Unlock"}</button>
        </form>
      </details>
      {status === "loading" ? <p role="status" className="mt-4 text-sm text-slate-700">{te ? "ఫోటో సమీక్ష queue లోడ్ అవుతోంది…" : "Loading photo review queue…"}</p> : null}
      {status === "auth" ? <p role="alert" className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">{te ? "లాగిన్ అవసరం లేదా ఈ queue కి అనుమతి లేదు. ఇది ఖాళీ queue అని కాదు. యజమాని / సిబ్బంది ఖాతాతో లాగిన్ చేసి మళ్లీ ప్రయత్నించండి." : "Sign-in is required or this account cannot access the queue. This is not an empty queue. Sign in with an authorized owner or staff account and retry."}</p> : null}
      {status === "error" ? <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">{te ? "Queue లోడ్ కాలేదు. ఇది ఖాళీ అని కాదు. మళ్లీ లోడ్ చేయండి." : "The queue could not be loaded. This does not mean it is empty. Refresh to retry."} {msg}</p> : null}
      {status === "ready" && msg ? <p role="alert" className="mt-3 text-sm text-maroon">{msg}</p> : null}
      {status === "ready" && items.length === 0 ? (
        <div role="status" className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center font-bold text-emerald-900">
          {te ? "ప్రస్తుతం సమీక్ష కోసం ఫోటోలు లేవు." : "No photos currently await review."}
        </div>
      ) : null}

      <div className="mt-4 grid sm:grid-cols-2 gap-3">
        {items.map((it) => {
          const k = it.tsap_id + it.kind;
          return (
            <div key={k} className="rounded-2xl border border-gold/30 bg-white p-3 card-shadow">
              <div className="flex flex-col gap-3 sm:flex-row">
                <ProtectedImage src={it.url} alt={`${it.kind} review image unavailable`} admin
                  className="w-28 h-36 object-cover rounded-xl border border-slate-200" />
                <div className="w-full min-w-0 flex-1">
                  <div className="font-bold text-[13px]">{it.kind === "selfie" ? "🤳 Selfie" : "📸 Photo"} · {it.name}</div>
                  <div className="font-mono text-[11px] text-gray-500">{it.tsap_id}</div>
                  <div className="text-[11px] text-gray-600 mt-1">
                    {it.checks?.w ?? "-"}×{it.checks?.h ?? "-"} · {it.checks?.kb ?? "-"}KB · blur {it.checks?.blur_score ?? "-"} · bright {it.checks?.brightness ?? "-"}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button type="button" disabled={!!busy || status !== "ready"} onClick={() => void review(it, "approved")}
                      className="flex-1 rounded-xl bg-emerald-600 text-white text-[12px] font-bold py-2 disabled:opacity-50">
                      {busy === k ? "…" : (te ? "✅ ఆమోదించండి" : "✅ Approve")}
                    </button>
                    <button type="button" disabled={!!busy || status !== "ready"} onClick={() => void review(it, "rejected")}
                      className="flex-1 rounded-xl bg-red-600 text-white text-[12px] font-bold py-2 disabled:opacity-50">
                      {te ? "❌ తిరస్కరించండి" : "❌ Reject"}
                    </button>
                  </div>
                  <select aria-label={te ? "సమీక్ష కారణం" : "Review reason"} value={reasonIdx[k] || 0}
                    onChange={(e) => setReasonIdx((m) => ({ ...m, [k]: Number(e.target.value) }))}
                    className="mt-2 w-full rounded-lg border border-slate-300 text-[11px] px-2 py-1.5">
                    {REJECT_REASONS.map((r, i) => <option key={r.en} value={i}>❌ {te ? r.te : r.en}</option>)}
                  </select>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
