"use client";

/**
 * 📸 WAVE 17 — ADMIN photo + selfie moderation queue (Layer-2 human review).
 * Admin key (X-Admin-Key) tho matrame. Wrong-person/group/celebrity → reject + Telugu reason.
 */
import { useCallback, useEffect, useState } from "react";
import { Duo } from "@/lib/duo";
import { useLang } from "@/lib/lang";
import Link from "next/link";
import { apiGet, apiPost, getAdminKey, setAdminKey } from "@/lib/api";
import ProtectedImage from "@/components/ProtectedImage";

type Item = {
  kind: string; tsap_id: string; name: string; url: string;
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
  const [busy, setBusy] = useState("");
  const [reasonIdx, setReasonIdx] = useState<Record<string, number>>({});

  useEffect(() => { setKey(getAdminKey()); }, []);

  const load = useCallback(async () => {
    setMsg("");
    const { ok, data, errorTelugu } = await apiGet<{ count?: number; queue?: Item[] }>("/api/admin/photos/pending", true);
    if (!ok) { setMsg(errorTelugu); setItems([]); return; }
    setItems(data?.queue || []);
  }, []);

  useEffect(() => { if (key) void load(); }, [key, load]);

  const review = async (it: Item, decision: "approved" | "rejected") => {
    setBusy(it.tsap_id + it.kind);
    const r = REJECT_REASONS[reasonIdx[it.tsap_id + it.kind] || 0];
    const { ok, errorTelugu } = await apiPost("/api/admin/photos/review", {
      tsap_id: it.tsap_id, kind: it.kind, decision,
      reason: r.en, reason_te: r.te,
    }, true);
    setBusy("");
    if (!ok) { setMsg(errorTelugu); return; }
    setItems((xs) => xs.filter((x) => !(x.tsap_id === it.tsap_id && x.kind === it.kind)));
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-extrabold text-maroon">📸 <Duo en="Photo Review Queue" te="ఫోటో పరిశీలన" /></h1>
        <Link href="/admin" className="inline-flex min-h-10 items-center justify-center rounded-xl border border-maroon/20 px-3 py-2 text-xs font-bold text-maroon hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon focus-visible:ring-offset-2">
          {te ? "← అడ్మిన్ డాష్‌బోర్డ్" : "← Admin dashboard"}
        </Link>
      </div>
      <p className="text-[12px] text-gray-600 telugu">{te ? "Technical checks pass అయిన photos మాత్రమే ఇక్కడ — wrong-person/group/celebrity ని reject చెయ్యండి." : "Only photos that passed technical checks — reject wrong-person/group/celebrity."}</p>

      <div className="mt-3 flex gap-2 items-center">
        <input value={key} onChange={(e) => setKey(e.target.value)} placeholder="Admin key"
          type="password" className="rounded-xl border border-slate-300 px-3 py-2 text-sm w-64" />
        <button onClick={() => { setAdminKey(key); void load(); }}
          className="rounded-xl bg-maroon text-white px-4 py-2 text-sm font-bold maroon-gradient">Unlock</button>
        <button onClick={() => void load()} className="rounded-xl border border-slate-300 px-3 py-2 text-sm">↻ Refresh ({items.length})</button>
      </div>
      {msg ? <p className="mt-2 text-sm font-medium text-maroon">{msg}</p> : null}

      {key && items.length === 0 && !msg ? (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center text-emerald-900 font-bold">
          {te ? "✅ Queue ఖాళీ — అన్ని photos review అయ్యాయి!" : "✅ Queue empty — all photos reviewed!"}
        </div>
      ) : null}

      <div className="mt-4 grid sm:grid-cols-2 gap-3">
        {items.map((it) => {
          const k = it.tsap_id + it.kind;
          return (
            <div key={k} className="rounded-2xl border border-gold/30 bg-white p-3 card-shadow">
              <div className="flex gap-3">
                <ProtectedImage src={it.url} alt={`${it.kind} review image unavailable`} admin
                  className="w-28 h-36 object-cover rounded-xl border border-slate-200" />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-[13px]">{it.kind === "selfie" ? "🤳 Selfie" : "📸 Photo"} · {it.name}</div>
                  <div className="font-mono text-[11px] text-gray-500">{it.tsap_id}</div>
                  <div className="text-[11px] text-gray-600 mt-1">
                    {it.checks?.w}×{it.checks?.h} · {String(it.checks?.kb)}KB · blur {String(it.checks?.blur_score)} · bright {String(it.checks?.brightness)}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button disabled={!!busy} onClick={() => void review(it, "approved")}
                      className="flex-1 rounded-xl bg-emerald-600 text-white text-[12px] font-bold py-2 disabled:opacity-50">
                      {busy === k ? "…" : "✅ Approve"}
                    </button>
                    <button disabled={!!busy} onClick={() => void review(it, "rejected")}
                      className="flex-1 rounded-xl bg-red-600 text-white text-[12px] font-bold py-2 disabled:opacity-50">
                      ❌ Reject
                    </button>
                  </div>
                  <select value={reasonIdx[k] || 0}
                    onChange={(e) => setReasonIdx((m) => ({ ...m, [k]: Number(e.target.value) }))}
                    className="mt-2 w-full rounded-lg border border-slate-300 text-[11px] px-2 py-1.5">
                    {REJECT_REASONS.map((r, i) => <option key={r.en} value={i}>❌ {r.en}</option>)}
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
