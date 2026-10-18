"use client";

/**
 * Admin Jathakam evidence queue.
 *
 * This console deliberately does not calculate Gunamelanam, dosha flags, or a
 * chart from member-entered star/rasi fields. A queue status is not an
 * authenticity certificate; an appropriately qualified reviewer must inspect
 * the original document outside this UI before any interpretation is shared.
 */
import { useEffect, useState } from "react";
import { apiDisplayMessage, authHeaders, readApiJson } from "@/lib/api";
import { useLang } from "@/lib/lang";

type QueueItem = { id: string; tsap_id: string; file?: string; kind?: string; status?: string; at?: string; note?: string };
type Stats = { total?: number; jathakam_verified?: number; jathakam_pending?: number };

export default function AstroConsole() {
  const { lang } = useLang();
  const te = lang === "te";
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [qStatus, setQStatus] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);
  const [note, setNote] = useState<Record<string, string>>({});
  const [flash, setFlash] = useState("");

  const loadStats = async () => {
    try {
      const response = await fetch("/api/admin/astro/stats", { headers: authHeaders(true) });
      const data = await readApiJson<Stats & { success?: boolean }>(response);
      if (response.ok && data.success) setStats(data);
    } catch { /* admin dashboard remains usable if stats are temporarily unavailable */ }
  };

  const loadQueue = async (status: string) => {
    try {
      const response = await fetch(`/api/admin/astro/queue${status ? `?status=${encodeURIComponent(status)}` : ""}`, { headers: authHeaders(true) });
      const data = await readApiJson<{ success?: boolean; items?: QueueItem[] }>(response);
      if (response.ok && data.success) setQueue(data.items || []);
    } catch { /* ignore transient dashboard failures */ }
  };

  useEffect(() => { void loadStats(); void loadQueue(""); }, []);

  const verify = async (id: string, ok: boolean) => {
    const response = await fetch(`/api/admin/astro/verify/${encodeURIComponent(id)}`, {
      method: "POST",
      headers: { ...authHeaders(true), "Content-Type": "application/json" },
      body: JSON.stringify({ ok, note: note[id] || "" }),
    });
    const data = await readApiJson(response);
    setFlash(apiDisplayMessage(data, te, te ? "జాతక review స్థితి నవీకరించబడింది." : "Document review status updated."));
    void loadQueue(qStatus);
    void loadStats();
  };

  return (
    <div>
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-950">
        {te
          ? "ఈ క్యూ పత్రం సమర్పించబడిందా మరియు review స్థితి ఏమిటో మాత్రమే నిర్వహిస్తుంది. ఇది authenticity, identity, జన్మ వివరాల ఖచ్చితత్వం లేదా వివాహ నిర్ణయానికి సర్టిఫికేట్ కాదు. Star/rasi ఆధారంగా ఆటోమేటిక్ chart, score లేదా dosha ఫలితం ఇక్కడ చూపించము."
          : "This queue records only whether a document was submitted and what review status was recorded. It is not an authenticity, identity, birth-detail, or marriage certificate. No automatic chart, score, or dosha result is shown from star/rasi fields."}
      </div>

      {stats ? (
        <div className="mt-3 grid grid-cols-3 gap-3 text-center">
          {[
            { label: te ? "ప్రొఫైళ్లు" : "Profiles", value: stats.total ?? 0 },
            { label: te ? "Review నమోదు" : "Review recorded", value: stats.jathakam_verified ?? 0 },
            { label: te ? "Review పెండింగ్" : "Pending review", value: stats.jathakam_pending ?? 0 },
          ].map((item) => <div key={item.label} className="rounded-2xl bg-gray-50 p-3"><div className="text-xl font-bold text-[#7A0C2E]">{item.value}</div><div className="text-[11px] text-gray-500">{item.label}</div></div>)}
        </div>
      ) : null}

      {flash ? <div className="mt-3 rounded-xl bg-[#0F1F3C] p-3 text-xs text-white" role="status">{flash}</div> : null}

      <div className="mt-3 rounded-2xl border p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="font-bold text-[#7A0C2E]">📜 {te ? "జాతక పత్రాల review క్యూ" : "Horoscope document review queue"}</div>
          <select value={qStatus} onChange={(event) => { setQStatus(event.target.value); void loadQueue(event.target.value); }} aria-label="Status" className="rounded-full border px-3 py-1.5 text-xs">
            <option value="">{te ? "అన్నీ" : "All"}</option>
            <option value="pending">{te ? "పెండింగ్" : "Pending"}</option>
            <option value="verified">{te ? "Review నమోదు అయింది" : "Review recorded"}</option>
            <option value="rejected">{te ? "తిరస్కరించారు" : "Rejected"}</option>
          </select>
        </div>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="border-b text-left text-gray-500"><th className="p-2">ID</th><th>Profile</th><th>File</th><th>Status</th><th>Note / action</th></tr></thead>
            <tbody>
              {queue.length === 0 ? <tr><td colSpan={5} className="p-4 text-center text-gray-500">{te ? "క్యూ ఖాళీగా ఉంది 🙂" : "The queue is empty 🙂"}</td></tr> : null}
              {queue.map((item) => (
                <tr key={item.id} className="border-b align-top">
                  <td className="p-2 font-mono font-bold">{item.id}<div className="text-[10px] text-gray-400">{String(item.at || "").slice(0, 16)}</div></td>
                  <td className="p-2 font-mono">{item.tsap_id}</td>
                  <td className="p-2">{item.kind === "pdf" ? "📄" : "🖼️"} <span className="font-mono text-[10px]">{item.file}</span></td>
                  <td className="p-2">{item.status}</td>
                  <td className="min-w-[14rem] p-2">
                    <textarea value={note[item.id] || ""} onChange={(event) => setNote((old) => ({ ...old, [item.id]: event.target.value.slice(0, 500) }))} placeholder={te ? "Review note (optional)" : "Review note (optional)"} className="w-full rounded-lg border px-2 py-1 text-xs" rows={2} />
                    {item.status === "pending" ? <div className="mt-1 flex flex-wrap gap-1"><button type="button" onClick={() => void verify(item.id, true)} className="rounded-lg bg-emerald-600 px-2 py-1 font-bold text-white">{te ? "Review నమోదు" : "Record review"}</button><button type="button" onClick={() => void verify(item.id, false)} className="rounded-lg bg-rose-600 px-2 py-1 font-bold text-white">{te ? "తిరస్కరించు" : "Reject"}</button></div> : <div className="mt-1 text-[11px] text-gray-500">{item.note || (te ? "స్థితి మాత్రమే; ఫలితం లేదు." : "Status only; no astrology result.")}</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
