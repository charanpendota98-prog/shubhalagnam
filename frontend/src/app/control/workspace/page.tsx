"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type QueueItem = { tsap_id: string; full_name: string; gender: string; age?: number; district: string; status: string; photo_status: string; created_at: string };

type Session = { role: string; csrf: string };

export default function Workspace() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [items, setItems] = useState<QueueItem[]>([]);
  const [status, setStatus] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/control/profile-queue?status=${status}&limit=100`, { credentials: "include" });
      if (response.status === 401) { router.replace("/control/login"); return; }
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.detail || "Unable to load review queue");
      setItems(data.items || []);
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to load review queue"); }
    finally { setLoading(false); }
  }, [router, status]);

  useEffect(() => {
    fetch("/api/control/me", { credentials: "include" }).then(async (response) => {
      if (response.status === 401) { router.replace("/control/login"); return; }
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Session expired");
      setSession({ role: data.role, csrf: data.csrf });
    }).catch((e) => setError(e instanceof Error ? e.message : "Session expired"));
  }, [router]);
  useEffect(() => { if (session) void load(); }, [session, load]);

  async function moderate(item: QueueItem, action: "approve" | "reject") {
    if (!session || !window.confirm(`${action === "approve" ? "Approve" : "Reject"} ${item.full_name || item.tsap_id}?`)) return;
    setBusy(item.tsap_id); setNotice(""); setError("");
    try {
      const response = await fetch("/api/control/profile-action", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json", "X-Control-CSRF": session.csrf }, body: JSON.stringify({ tsap_id: item.tsap_id, action }) });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.detail || "Action failed");
      setNotice(`${item.tsap_id} ${action}d successfully`);
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Action failed"); }
    finally { setBusy(""); }
  }

  async function logout() {
    if (session) await fetch("/api/control/logout", { method: "POST", credentials: "include", headers: { "X-Control-CSRF": session.csrf } });
    router.replace("/control/login");
  }

  return <main className="min-h-screen bg-[#fffaf7] p-4 md:p-10"><div className="mx-auto max-w-6xl">
    <header className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-[#7A0C2E]">Secure operations</p><h1 className="text-3xl font-bold text-[#0F1F3C]">Profile approval center</h1><p className="text-sm text-slate-600">Minimum-PII moderation workspace · Role: {session?.role || "checking session…"}</p></div><button onClick={logout} className="rounded-xl border px-4 py-2 text-sm font-semibold">Sign out</button></header>
    <section className="mt-8 rounded-2xl border bg-white p-4 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold">Review queue</h2><p className="text-sm text-slate-500">Approve or reject profiles without exposing phone numbers, payments or private contact data.</p></div><div className="flex gap-2">{(["pending", "approved", "rejected", "all"] as const).map((value) => <button key={value} onClick={() => setStatus(value)} className={`rounded-full px-3 py-2 text-xs font-bold ${status === value ? "bg-[#7A0C2E] text-white" : "border text-slate-600"}`}>{value}</button>)}</div></div></section>
    {error && <p className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700" role="alert">{error}</p>}{notice && <p className="mt-4 rounded-xl bg-green-50 p-4 text-sm text-green-700" role="status">{notice}</p>}
    <section className="mt-4 space-y-3">{loading ? <div className="rounded-2xl border bg-white p-8 text-center text-slate-500">Loading secure queue…</div> : items.map(item => <article key={item.tsap_id} className="flex flex-wrap items-center gap-4 rounded-2xl border bg-white p-4 shadow-sm"><div className="min-w-[220px] flex-1"><p className="font-semibold text-[#0F1F3C]">{item.full_name || "Unnamed profile"}</p><p className="text-xs text-slate-500">{item.tsap_id} · {item.gender || "—"} · {item.age || "—"} · {item.district || "—"}</p><p className="mt-1 text-xs text-slate-400">Created {item.created_at || "—"} · Photo: {item.photo_status || "none"}</p></div><span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">{item.status}</span>{status === "pending" && <div className="flex gap-2"><button disabled={busy === item.tsap_id} onClick={() => void moderate(item, "approve")} className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{busy === item.tsap_id ? "…" : "✓ Approve"}</button><button disabled={busy === item.tsap_id} onClick={() => void moderate(item, "reject")} className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">✕ Reject</button></div>}</article>)}{!loading && !items.length && <div className="rounded-2xl border bg-white p-8 text-center text-sm text-slate-500">No {status} profiles.</div>}</section>
  </div></main>;
}
