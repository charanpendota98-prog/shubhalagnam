"use client";
/**
 * 👑 WAVE 38 — /owner BUSINESS DASHBOARD (revenue + funnel + system).
 * HIDDEN route (public links levu — direct URL + admin key only, like /admin).
 */
import { useCallback, useEffect, useState } from "react";
import { useLang } from "@/lib/lang";
import { SITE_CONFIG } from "@/lib/site-config";

type Row = Record<string, any>;
const KEY = "tsap_admin_key";

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-rose-200 bg-white p-4">
      <h2 className="text-sm font-extrabold text-[#7A0C2E]">{title}</h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function Stat({ v, l }: { v: string | number; l: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-2 text-center">
      <p className="text-lg font-extrabold text-[#7A0C2E]">{v}</p>
      <p className="text-[10px] text-slate-500">{l}</p>
    </div>
  );
}

export default function OwnerPage() {
  const { lang } = useLang();
  const te = lang === "te";
  const [key, setKey] = useState("");
  const [d, setD] = useState<Row | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async (k: string) => {
    if (!k) return;
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/owner/summary", { headers: { "x-admin-key": k } });
      const j = await r.json();
      if (r.status === 403) { setErr(te ? "🔑 Key తప్పు — correct admin key ఇవ్వండి" : "🔑 Wrong key — enter correct admin key"); setD(null); }
      else if (j.success) { setD(j); try { localStorage.setItem(KEY, k); } catch { /* ignore */ } }
      else { setErr(j.detail || "Load fail"); setD(null); }
    } catch { setErr(te ? "Network problem" : "Network problem"); }
    setBusy(false);
  }, [te]);

  useEffect(() => {
    try {
      const k = localStorage.getItem(KEY) || "";
      if (k) { setKey(k); void load(k); }
    } catch { /* ignore */ }
  }, [load]);

  const [bmsg, setBmsg] = useState("");
  const [bbusy, setBbusy] = useState(false);

  const downloadBackup = useCallback(async () => {
    setBbusy(true); setBmsg("");
    try {
      const r = await fetch("/api/admin/backup/export", { headers: { "x-admin-key": key } });
      if (!r.ok) { setBmsg(te ? "❌ Backup fail — key check cheyandi" : "❌ Backup failed — check key"); setBbusy(false); return; }
      const blob = await r.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "mana-vivaha-backup.zip";
      a.click();
      setBmsg(te ? "✅ Backup download ayindi — safe ga dachukondi" : "✅ Backup downloaded — keep it safe");
    } catch { setBmsg("❌ Network problem"); }
    setBbusy(false);
  }, [key, te]);

  const restoreBackup = useCallback(async (f: File | undefined) => {
    if (!f) return;
    if (!window.confirm(te ? "⚠️ Restore: current data replace అవుతుంది. Continue?" : "⚠️ Restore: current data will be replaced. Continue?")) return;
    setBbusy(true); setBmsg("");
    try {
      const r = await fetch("/api/admin/backup/import", { method: "POST", headers: { "x-admin-key": key, "Content-Type": "application/zip" }, body: f });
      const j = await r.json();
      setBmsg(j.success ? `✅ Restore ok — ${j.restored?.length ?? 0} files (${j.note || ""})` : `❌ ${j.detail || "fail"}`);
      if (j.success) void load(key);
    } catch { setBmsg("❌ Network problem"); }
    setBbusy(false);
  }, [key, te, load]);

  const rev: Row = d?.revenue || {};
  const users: Row = d?.users || {};
  const funnel: Row = d?.funnel || {};
  const eng: Row = d?.engagement || {};
  const ref: Row = d?.referral || {};
  const ch: Row = d?.channels || {};
  const sys: Row = d?.system || {};
  const series: Row[] = rev.series_7d || [];
  const maxC = Math.max(1, ...series.map((s) => Number(s.collected || 0)));

  return (
    <main className="mx-auto max-w-4xl px-4 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-rose-200 pb-3">
        <div>
          <h1 className="text-2xl font-extrabold text-[#7A0C2E]">👑 {te ? "Owner Control & Business Hub" : "Owner Control & Business Hub"}</h1>
          <p className="text-[11px] text-slate-500">{te ? "Official Owner Management Console — Mana Vivaha" : "Official Owner Management Console — Mana Vivaha"}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Verified Owner Active
          </span>
        </div>
      </div>

      {/* Official Acceptance & Owner Credentials Badge */}
      <div className="mt-4 rounded-3xl border border-emerald-500/30 bg-gradient-to-r from-emerald-50/80 via-white to-amber-50/40 p-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-emerald-100 pb-2">
          <div className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
            <span>🛡️</span>
            <span>{te ? "అధికారిక యజమాని అంగీకార పత్రం (Official Owner Acceptance)" : "Official Owner Acceptance Details"}</span>
          </div>
          <span className="font-mono text-[10px] text-emerald-700 font-bold bg-white px-2 py-0.5 rounded-full border border-emerald-200">
            ID: {SITE_CONFIG.owner.id}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
          <div className="bg-white/80 p-2 rounded-xl border border-emerald-100">
            <span className="text-gray-500 block text-[9px] uppercase font-bold">Owner Name</span>
            <span className="font-bold text-gray-900">{SITE_CONFIG.owner.name}</span>
          </div>
          <div className="bg-white/80 p-2 rounded-xl border border-emerald-100">
            <span className="text-gray-500 block text-[9px] uppercase font-bold">Signatory Name</span>
            <span className="font-bold text-gray-900">{SITE_CONFIG.owner.signatoryName}</span>
          </div>
          <div className="bg-white/80 p-2 rounded-xl border border-emerald-100">
            <span className="text-gray-500 block text-[9px] uppercase font-bold">Contact Phone</span>
            <span className="font-mono font-bold text-emerald-800">{SITE_CONFIG.owner.contactNumber}</span>
          </div>
          <div className="bg-white/80 p-2 rounded-xl border border-emerald-100">
            <span className="text-gray-500 block text-[9px] uppercase font-bold">Official Email</span>
            <span className="font-mono font-bold text-emerald-800 truncate block">{SITE_CONFIG.owner.email}</span>
          </div>
          <div className="bg-white/80 p-2 rounded-xl border border-emerald-100 col-span-2">
            <span className="text-gray-500 block text-[9px] uppercase font-bold">Date of Acceptance</span>
            <span className="font-mono font-bold text-gray-800">{SITE_CONFIG.owner.dateOfAcceptance}</span>
          </div>
          <div className="bg-white/80 p-2 rounded-xl border border-emerald-100 col-span-2">
            <span className="text-gray-500 block text-[9px] uppercase font-bold">Acceptance IP Address</span>
            <span className="font-mono font-bold text-gray-800">{SITE_CONFIG.owner.ipAddress}</span>
          </div>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <input value={key} onChange={(e) => setKey(e.target.value)} type="password"
          placeholder={te ? "Admin key" : "Admin key"} aria-label="Admin key"
          className="flex-1 rounded-2xl border px-3 py-2 font-mono text-sm" />
        <button onClick={() => void load(key)} disabled={busy || !key}
          className="rounded-2xl bg-[#7A0C2E] px-5 py-2 text-sm font-bold text-white disabled:opacity-50">
          {busy ? "…" : te ? "చూడు" : "View"}
        </button>
        {d && <button onClick={() => void load(key)} className="rounded-2xl border px-4 py-2 text-sm">↻</button>}
      </div>
      {err && <p className="mt-2 rounded-2xl border border-amber-300 bg-amber-50 p-2 text-[13px] font-bold text-amber-900">{err}</p>}
      {d && <p className="mt-1 font-mono text-[10px] text-slate-400">at {String(d.at || "").slice(0, 19).replace("T", " ")}</p>}

      {d && (
        <div className="mt-4 space-y-4">
          <Card title={`💰 Revenue — ₹${rev.collected ?? 0} collected (${rev.pay_mode || ""})`}>
            <div className="grid grid-cols-4 gap-2">
              <Stat v={rev.orders ?? 0} l={te ? "orders" : "orders"} />
              <Stat v={rev.paid ?? 0} l={te ? "paid" : "paid"} />
              <Stat v={rev.pending ?? 0} l={te ? "pending" : "pending"} />
              <Stat v={rev.refunded ?? 0} l={te ? "refunded" : "refunded"} />
            </div>
            {Object.keys(rev.by_mode || {}).length > 0 && (
              <p className="mt-2 text-[12px] text-slate-600">
                {Object.entries(rev.by_mode as Record<string, number>).map(([m, v]) => `${m}: ₹${v}`).join(" • ")}
              </p>
            )}
            {series.length > 0 && (
              <div className="mt-3 flex h-24 items-end gap-1">
                {series.map((s) => (
                  <div key={s.date} className="flex-1 text-center">
                    <div className="mx-auto w-full rounded-t bg-[#7A0C2E]" style={{ height: `${Math.max(4, Math.round(88 * Number(s.collected || 0) / maxC))}px` }} />
                    <p className="mt-0.5 text-[9px] text-slate-500">{String(s.date).slice(5)}</p>
                    <p className="text-[9px] font-bold">₹{s.collected}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card title={`👥 Users — ${users.total ?? 0}`}>
            <div className="grid grid-cols-4 gap-2">
              <Stat v={users.approved ?? 0} l={te ? "approved" : "approved"} />
              <Stat v={users.pending ?? 0} l={te ? "pending" : "pending"} />
              <Stat v={users.banned ?? 0} l={te ? "banned" : "banned"} />
              <Stat v={users.verified ?? 0} l={te ? "verified" : "verified"} />
              <Stat v={users.brides ?? 0} l="brides" />
              <Stat v={users.grooms ?? 0} l="grooms" />
              <Stat v={users.nri ?? 0} l="NRI" />
              <Stat v={users.boosted ?? 0} l={te ? "boosted" : "boosted"} />
            </div>
            <p className="mt-2 text-[12px] text-slate-600">
              📸 {users.with_photo ?? 0} • 🎙️ {users.with_voice ?? 0} • 💳 {users.credits_out ?? 0} credits out • 👛 ₹{users.wallet_out ?? 0} wallet out
            </p>
          </Card>

          <Card title={`💌 Funnel — ${funnel.interests ?? 0} interests`}>
            <div className="grid grid-cols-4 gap-2">
              {["pending", "accepted", "declined", "expired"].map((s) => (
                <Stat key={s} v={funnel.by_status?.[s] ?? 0} l={s} />
              ))}
            </div>
            <p className="mt-2 text-[12px] font-bold text-emerald-700">
              ✅ Accept rate: {funnel.accept_rate ?? 0}% • 📋 Unlocks: {funnel.unlocks ?? 0}
            </p>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card title="🔥 Engagement">
              <div className="grid grid-cols-3 gap-2">
                <Stat v={eng.push_subs ?? 0} l="push subs" />
                <Stat v={eng.streak_users ?? 0} l="streak" />
                <Stat v={eng.jathakam_pending ?? 0} l="jathakam Q" />
              </div>
            </Card>
            <Card title="🤝 Referral">
              <div className="grid grid-cols-2 gap-2">
                <Stat v={ref.paid_referrals ?? 0} l={te ? "paid refs" : "paid refs"} />
                <Stat v={ref.referrers ?? 0} l={te ? "referrers" : "referrers"} />
              </div>
            </Card>
          </div>

          <Card title="📢 Channels">
            {Object.keys(ch.by_tier || {}).length === 0 && <p className="text-[12px] text-slate-500">—</p>}
            <div className="space-y-1">
              {Object.entries(ch.by_tier || {}).map(([t, v]: [string, any]) => (
                <div key={t} className="flex items-center gap-2 text-[12px]">
                  <span className="w-28 font-mono text-[11px]">{t}</span>
                  <div className="h-2 flex-1 rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-green-600" style={{ width: `${v.total ? Math.round(100 * v.live / v.total) : 0}%` }} />
                  </div>
                  <span className="text-slate-600">{v.live}/{v.total}</span>
                </div>
              ))}
            </div>
            {(ch.gaps || []).length > 0 && (
              <p className="mt-2 text-[11px] text-amber-800">⚠️ {(ch.gaps || []).join(" • ")}</p>
            )}
          </Card>

          <Card title="💾 Backup / Restore">
            <p className="text-[12px] text-slate-600">{te ? "అన్నీ (users, payments, interests, channels) okka zip లో. Crash అయినా ఈ zip + code ఉంటే site మళ్ళీ వస్తుంది." : "Everything (users, payments, interests, channels) in one zip. Even after a crash, this zip + code brings the site back."}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button onClick={() => void downloadBackup()} disabled={bbusy} className="rounded-2xl bg-[#7A0C2E] px-4 py-2 text-[13px] font-bold text-white disabled:opacity-50">⬇️ {te ? "బ్యాకప్ download" : "Download backup"}</button>
              <label className="cursor-pointer rounded-2xl border border-[#7A0C2E] px-4 py-2 text-[13px] font-bold text-[#7A0C2E]">⬆️ {te ? "Restore (zip)" : "Restore (zip)"}
                <input type="file" accept=".zip" className="hidden" onChange={(e) => { void restoreBackup(e.target.files?.[0]); e.target.value = ""; }} />
              </label>
            </div>
            {bmsg && <p className="mt-2 text-[12px] font-bold">{bmsg}</p>}
          </Card>

          <Card title="⚙️ System">
            <div className="grid grid-cols-3 gap-2 text-[12px]">
              <Stat v={sys.wa_queue ?? 0} l="WA queue" />
              <Stat v={sys.dead_letters ?? 0} l="dead letters" />
              <Stat v={sys.worker ? "▶️" : "⏸️"} l="worker" />
              <Stat v={sys.telegram_live ?? 0} l="TG live" />
              <Stat v={sys.vapid_ready ? "✅" : "—"} l="VAPID" />
              <Stat v={sys.pay_mode || "—"} l="pay mode" />
            </div>
          </Card>
        </div>
      )}
    </main>
  );
}
