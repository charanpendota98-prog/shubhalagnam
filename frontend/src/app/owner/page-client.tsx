"use client";

import { readApiJson } from "@/lib/api";
/**
 * 👑 WAVE 38 — /owner BUSINESS DASHBOARD (revenue + funnel + system).
 * HIDDEN route (public links levu — direct URL + admin key only, like /admin).
 */
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useLang } from "@/lib/lang";

type Row = Record<string, any>;
const LEGACY_KEY_STORAGE = "tsap_admin_key";

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
  const [controlCsrf, setControlCsrf] = useState("");
  const [sessionUser, setSessionUser] = useState("");
  const [d, setD] = useState<Row | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const authRequestHeaders = useCallback((overrideKey?: string): Record<string, string> => {
    const k = (overrideKey ?? key).trim();
    const h: Record<string, string> = {};
    if (k) h["x-admin-key"] = k;
    if (controlCsrf) h["X-Control-CSRF"] = controlCsrf;
    return h;
  }, [key, controlCsrf]);

  const load = useCallback(async (overrideKey?: string, hasCookieSession = false) => {
    const k = (overrideKey ?? key).trim();
    if (!k && !hasCookieSession && !sessionUser) return;
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/owner/summary", {
        credentials: "same-origin",
        headers: k ? { "x-admin-key": k } : {},
      });
      const j = await readApiJson(r);
      if (r.status === 403 || r.status === 401) {
        setErr(te
          ? "🔒 Owner session లేదా సరైన admin key అవసరం — /control/login లో sign in అవ్వండి"
          : "🔒 Owner session or valid admin key required — sign in via /control/login");
        setD(null);
      } else if (j.success) {
        setD(j);
      } else {
        setErr(j.detail || "Load fail");
        setD(null);
      }
    } catch { setErr(te ? "Network problem" : "Network problem"); }
    setBusy(false);
  }, [key, sessionUser, te]);

  useEffect(() => {
    // Security hardening (MV-007): purge any legacy plaintext admin key from localStorage.
    try { localStorage.removeItem(LEGACY_KEY_STORAGE); } catch { /* ignore */ }
    let cancelled = false;
    (async () => {
      try {
        const meRes = await fetch("/api/control/me", { credentials: "same-origin" });
        if (!meRes.ok) return;
        const me = await readApiJson<Row>(meRes);
        if (cancelled) return;
        if (me?.role === "owner") {
          setSessionUser(String(me.username || "owner"));
          setControlCsrf(String(me.csrf || ""));
          await load("", true);
        }
      } catch {
        /* unauthenticated — wait for /control/login or one-time memory key */
      }
    })();
    return () => { cancelled = true; };
  }, [load]);

  const [bmsg, setBmsg] = useState("");
  const [bbusy, setBbusy] = useState(false);

  const downloadBackup = useCallback(async () => {
    setBbusy(true); setBmsg("");
    try {
      const r = await fetch("/api/admin/backup/export", {
        credentials: "same-origin",
        headers: authRequestHeaders(),
      });
      if (!r.ok) { setBmsg(te ? "❌ Backup fail — owner session లేదా key check cheyandi" : "❌ Backup failed — verify owner session"); setBbusy(false); return; }
      const blob = await r.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "mana-vivaha-backup.zip";
      a.click();
      setBmsg(te ? "✅ Backup download ayindi — safe ga dachukondi" : "✅ Backup downloaded — keep it safe");
    } catch { setBmsg("❌ Network problem"); }
    setBbusy(false);
  }, [authRequestHeaders, te]);

  const restoreBackup = useCallback(async (f: File | undefined) => {
    if (!f) return;
    if (!window.confirm(te ? "⚠️ ఈ ZIP core/state JSON మాత్రమే restore చేస్తుంది; photos/media, secrets restore కావు. ప్రస్తుత data మారుతుంది. Isolated stagingలో backup/restore ధృవీకరించారా?" : "⚠️ This ZIP restores JSON application state only; photos/media and secrets are not restored. Current data will change. Have you verified backup and restore in isolated staging?")) return;
    setBbusy(true); setBmsg("");
    const sendRestore = (confirmDestructive: boolean) => fetch("/api/admin/backup/import", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        ...authRequestHeaders(),
        "Content-Type": "application/zip",
        ...(confirmDestructive ? { "X-Confirm-Destructive-Restore": "true" } : {}),
      },
      body: f,
    });
    try {
      let r = await sendRestore(false);
      let j = await readApiJson<Row>(r);
      const restoreDetail = j.detail as Row | undefined;
      if (!r.ok && restoreDetail?.code === "restore_requires_confirmation") {
        const decreases = restoreDetail.decreases as Record<string, { current: number; backup: number }> | undefined;
        const summary = Object.entries(decreases || {})
          .map(([name, counts]) => `${name}: ${counts.current} → ${counts.backup}`)
          .join(", ");
        const confirmed = window.confirm(te
          ? `⚠️ ఈ backupలో ప్రస్తుత database కంటే తక్కువ records ఉన్నాయి (${summary}). Restore చేస్తే ప్రస్తుత records తగ్గుతాయి. ముందుగా off-host backup ఉందని నిర్ధారించారా? Restore కొనసాగించాలా?`
          : `⚠️ This backup has fewer records than the active database (${summary}). Restoring will reduce the current records. Confirm that you have a verified off-host backup. Continue?`);
        if (confirmed) {
          r = await sendRestore(true);
          j = await readApiJson<Row>(r);
        } else {
          setBmsg(te ? "Restore రద్దు — ప్రస్తుత registrations మారలేదు." : "Restore cancelled — active registrations were left unchanged.");
          return;
        }
      }
      const detail = typeof j.detail === "string" ? j.detail : j.detail?.message;
      setBmsg(j.success
        ? `✅ Restore ok — ${j.restored?.length ?? 0} files (${j.note || ""})`
        : `❌ ${detail || "Restore failed"}`);
      if (j.success) void load(key, Boolean(sessionUser));
    } catch { setBmsg("❌ Network problem"); }
    finally { setBbusy(false); }
  }, [authRequestHeaders, key, sessionUser, te, load]);

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
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-rose-200 pb-3">
        <div>
          <h1 className="text-2xl font-extrabold text-[#7A0C2E]">👑 {te ? "Owner Control & Business Hub" : "Owner Control & Business Hub"}</h1>
          <p className="text-[11px] text-slate-500">{te ? "Official Owner Management Console — Mana Vivaha" : "Official Owner Management Console — Mana Vivaha"}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold ${d ? "bg-emerald-50 text-emerald-800 border-emerald-300" : "bg-amber-50 text-amber-900 border-amber-300"}`}>
            <span className={`w-2 h-2 rounded-full ${d ? "bg-emerald-500" : "bg-amber-500"}`}></span>
            {d
              ? (sessionUser
                  ? (te ? `HttpOnly Owner Session (${sessionUser})` : `HttpOnly Owner Session (${sessionUser})`)
                  : (te ? "అడ్మిన్ API యాక్సెస్ ఉంది" : "Admin API access active"))
              : (te ? "Owner సైన్-ఇన్ అవసరం" : "Owner sign-in required")}
          </span>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
        <p className="font-bold text-slate-900">{te ? "గోప్యత & సెషన్ భద్రత" : "Privacy and session security"}</p>
        <p className="mt-1 text-[12px] leading-relaxed">
          {te
            ? "ఈ కన్సోల్ HttpOnly Owner Session (/control/login) ద్వారా పనిచేస్తుంది మరియు browser localStorage లో admin key ని ఎప్పుడూ నిల్వ చేయదు. ఇక్కడి గణాంకాలు అప్లికేషన్‌లో నమోదైన స్థితిని చూపుతాయి; చెల్లింపు, ఛానల్ లేదా బాహ్య సందేశాల డెలివరీని స్వతంత్రంగా నిర్ధారించవు."
            : "This console authenticates via the HttpOnly Owner Session (/control/login) and never stores admin keys in browser localStorage. Counts reflect application-recorded state; they do not independently confirm payment, channel availability, or external message delivery."}
        </p>
        {!sessionUser && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Link href="/control/login" className="inline-flex items-center rounded-xl bg-[#7A0C2E] px-4 py-2 text-xs font-bold text-white hover:bg-[#5c0922]">
              🔐 {te ? "Owner Control Portal లో సైన్-ఇన్ చేయండి" : "Sign in via Owner Control Portal"}
            </Link>
            <span className="text-[11px] text-slate-500">
              {te ? "లేదా ఒకసారి మాత్రమే memory key తో చూడండి (browser లో save అవ్వదు):" : "Or unlock once in memory only (never saved to browser storage):"}
            </span>
          </div>
        )}
      </div>

      {!sessionUser && (
        <div className="mt-4 flex gap-2">
          <input value={key} onChange={(e) => setKey(e.target.value)} type="password" autoComplete="off"
            placeholder={te ? "One-time emergency admin key (memory only)" : "One-time emergency admin key (memory only)"} aria-label="Admin key"
            className="flex-1 rounded-2xl border px-3 py-2 font-mono text-sm" />
          <button type="button" onClick={() => void load(key)} disabled={busy || !key}
            className="rounded-2xl bg-[#7A0C2E] px-5 py-2 text-sm font-bold text-white disabled:opacity-50">
            {busy ? "…" : te ? "చూడు" : "View"}
          </button>
          {d && <button type="button" aria-label={te ? "మళ్లీ లోడ్ చేయండి" : "Refresh"} onClick={() => void load(key, Boolean(sessionUser))} className="rounded-2xl border px-4 py-2 text-sm">↻</button>}
        </div>
      )}
      {sessionUser && d && (
        <div className="mt-3 flex justify-end">
          <button type="button" aria-label={te ? "మళ్లీ లోడ్ చేయండి" : "Refresh"} onClick={() => void load("", true)} className="rounded-2xl border bg-white px-4 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50">
            ↻ {te ? "రిఫ్రెష్" : "Refresh summary"}
          </button>
        </div>
      )}
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
              <Stat v={users.recorded_checks ?? 0} l={te ? "నమోదైన చెక్‌లు" : "Recorded checks"} />
              <Stat v={users.brides ?? 0} l="brides" />
              <Stat v={users.grooms ?? 0} l="grooms" />
              <Stat v={users.nri ?? 0} l="NRI" />
              <Stat v={users.boosted ?? 0} l={te ? "boosted" : "boosted"} />
            </div>
            <p className="mt-2 text-[12px] text-slate-600">
              📸 {users.with_photo ?? 0} • 🎙️ {users.with_voice ?? 0} • 💳 {users.credits_out ?? 0} credits out • 👛 ₹{users.wallet_out ?? 0} wallet out
            </p>
            <p className="mt-1 text-[10px] text-slate-500">{te ? "Recorded checks‌లో Phone OTP, photo review, లేదా manual ID review ఉండవచ్చు; ఇవి identity guarantee కావు." : "Recorded checks may include phone OTP, photo review, or manual ID review; they are not an identity guarantee."}</p>
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
            <p className="text-[12px] leading-relaxed text-slate-600">{te ? "ఈ ZIP‌లో core database మరియు configure చేసిన JSON/JSONL application state మాత్రమే ఉంటాయి. Profile photos, cards, voice introductions, jathakams, posters, .env/secrets లేదా Docker volume ఇందులో ఉండవు. ఇది encrypted off-site backup కాదు. Restore వల్ల records తగ్గితే రెండో confirmation అడుగుతుంది; restore‌కు ముందు same-volume snapshot తీసుకుంటుంది, కానీ అది off-site backup‌కు ప్రత్యామ్నాయం కాదు. Production recovery కోసం మొత్తం data volume మరియు media‌ను encrypted off-host backup చేసి, isolated environment‌లో restore పరీక్షించాలి." : "This ZIP contains the core database and configured JSON/JSONL application state only. It excludes profile photos, cards, voice introductions, jathakams, posters, .env/secrets, and the Docker volume. It is not an encrypted off-site backup. A restore that would reduce active records requires a second confirmation, and a same-volume pre-restore snapshot is attempted first; neither replaces an off-site backup. For production recovery, back up the complete data volume and media off-host with encryption, then test a restore in an isolated environment."}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => void downloadBackup()} disabled={bbusy} className="rounded-2xl bg-[#7A0C2E] px-4 py-2 text-[13px] font-bold text-white disabled:opacity-50">⬇️ {te ? "బ్యాకప్ download" : "Download backup"}</button>
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
              <Stat v={sys.telegram_routing_eligible ?? 0} l="TG routing eligible (not checked)" />
              <Stat v={sys.vapid_ready ? "✅" : "—"} l="VAPID" />
              <Stat v={sys.pay_mode || "—"} l="pay mode" />
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
