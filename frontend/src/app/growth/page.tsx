"use client";

/**
 * /growth — OPS + GROWTH DASHBOARD (admin/matcher ki)
 * ==================================================
 * Entha mandi vacharu? (visits) → Entha mandi number icharu? (leads)
 * → Entha mandi profiles ayyaru? (inventory) → WhatsApp queue ela undi? (anti-ban)
 * Ee screen chusi admin rojuki 10 nimushalalo follow-up cheyyali.
 */
import { authHeaders, getAdminKey, setAdminKey } from "@/lib/api";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Duo, duo } from "@/lib/duo";
import { useLang } from "@/lib/lang";

type Stats = Record<string, any>;

export default function GrowthPage() {
  const { lang } = useLang();
  const te = lang === "te";
  const [stats, setStats] = useState<Stats | null>(null);
  const [inv, setInv] = useState<Stats | null>(null);
  const [wa, setWa] = useState<Stats | null>(null);
  const [leads, setLeads] = useState<Stats[]>([]);
  const [busy, setBusy] = useState("");
  const [note, setNote] = useState("");
  const [keyInput, setKeyInput] = useState("");
  const [keySaved, setKeySaved] = useState(false);
  const [needsAdminKey, setNeedsAdminKey] = useState(false);

  useEffect(() => { try { setKeyInput(getAdminKey()); setKeySaved(Boolean(getAdminKey())); } catch { /* ignore */ } }, []);

  const saveKey = () => {
    setAdminKey(keyInput.trim());
    setKeySaved(Boolean(keyInput.trim()));
    setNote(keyInput.trim() ? (te ? "✅ Admin key save అయ్యింది — ఇప్పుడు leads data వస్తుంది" : "✅ Admin key saved — leads data will load") : (te ? "⚠️ Key ఖాళీగా ఉంది" : "⚠️ Key is empty"));
    load();
  };

  const load = useCallback(async () => {
    try {
      const [s, i, w, l] = await Promise.all([
        fetch("/api/leads/stats", { headers: authHeaders(true) }).then((r) => r.json()),
        fetch("/api/inventory").then((r) => r.json()),
        fetch("/api/wa/status").then((r) => r.json()),
        fetch("/api/leads?limit=30", { headers: authHeaders(true) }).then((r) => r.json()),
      ]);
      setStats(s); setInv(i); setWa(w); setLeads(l.items || []);
      // 🐞 FIX: 403 vaste khali table chupinchadam kaadu — "admin key kavali" clear ga cheppali
      if ((s as Stats)?.detail || (l as Stats)?.detail) setNeedsAdminKey(true); else setNeedsAdminKey(false);
    } catch {
      setNote(te ? "API reach అవ్వలేదు — backend run అవుతుందో చూసుకోండి" : "API unreachable — check backend is running");
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const followup = async (id: string) => {
    setBusy(id);
    try {
      const d = await fetch(`/api/leads/followup/${id}`, { method: "POST", headers: authHeaders(true) }).then((r) => r.json());
      setNote(d.message_telugu || "Follow-up queued");
      load();
    } catch { setNote(te ? "Follow-up పంపలేదు" : "Follow-up not sent"); }
    setBusy("");
  };

  const waAction = async (path: string) => {
    const d = await fetch(path, { method: "POST" }).then((r) => r.json());
    setNote(d.message_telugu || "OK");
    load();
  };

  const KPI = ({ label, value, sub, tone = "maroon" }: { label: string; value: any; sub?: string; tone?: string }) => (
    <div className="bg-white rounded-2xl border border-gold/25 p-4">
      <div className="text-[11px] text-gray-500">{label}</div>
      <div className={`text-2xl font-bold ${tone === "gold" ? "text-[#8a6d1a]" : "text-maroon"}`}>{value}</div>
      {sub && <div className="text-[10px] text-gray-500 mt-0.5">{sub}</div>}
    </div>
  );

  const ab = wa?.antiban || {};

  return (
    <main className="min-h-dvh bg-cream pb-16">
      {/* 🔐 WAVE 9 — admin key card: /api/leads* lo phone numbers unnayi (PII) → key tho matrame */}
      <div className="max-w-6xl mx-auto px-4 pt-4">
        <div className={`rounded-2xl border p-4 ${needsAdminKey ? "border-rose-300 bg-rose-50" : "border-gold/30 bg-white"}`}>
          <div className="text-[13px] font-bold text-maroon">🔐 Admin key (leads PII lock)</div>
          <p className="mt-1 text-[12px] text-gray-700">
{te ? <>Leads list + stats లో customer phone numbers ఉంటాయి — కాబట్టి ఇవి <b>admin key</b> తోనే వస్తాయి.
            Server లో <code>ADMIN_KEY</code> env పెట్టండి, అదే ఇక్కడ paste చెయ్యండి (browser లోనే save అవుతుంది, server కి పంపము).</> : <>Leads list + stats contain customer phone numbers — so they come only with <b>admin key</b>.
            Put <code>ADMIN_KEY</code> env on server, paste it here (saved in browser only, never sent to server).</>}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input aria-label="Admin key" type="password" value={keyInput} onChange={(e) => setKeyInput(e.target.value)}
              placeholder="ADMIN_KEY…" className="rounded-xl border border-maroon/25 px-3 py-2 text-[12px] font-mono w-64" />
            <button onClick={saveKey} className="rounded-xl bg-[#7A0C2E] px-4 py-2 text-[12px] font-bold text-white">💾 Save key</button>
            <button onClick={() => load()} className="rounded-xl border border-maroon/25 px-4 py-2 text-[12px] font-bold text-maroon">🔄 Reload</button>
            {keySaved && <span className="text-[11px] text-emerald-700">{te ? <>✅ key save అయ్యింది ({(getAdminKey() || "").slice(0, 4)}••••)</> : <>✅ key saved ({(getAdminKey() || "").slice(0, 4)}••••)</>}</span>}
          </div>
          {needsAdminKey && <p className="mt-2 text-[12px] font-semibold text-rose-700">{te ? "⚠️ Server 403 ఇచ్చింది — key save చేసి మళ్లీ reload చెయ్యండి." : "⚠️ Server gave 403 — save key and reload."}</p>}
        </div>
      </div>
      <div className="maroon-gradient text-white">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="text-[11px] font-bold bg-white/10 border border-white/20 rounded-full px-3 py-1 inline-block">
            📈 Growth + Ops dashboard
          </div>
          <h1 className="mt-3 text-2xl md:text-3xl font-bold"><Duo en="Site traffic → Leads → Profiles" te="సందర్శకులు → లీడ్స్ → ప్రొఫైళ్లు" /></h1>
          <p className="mt-2 text-[13px] opacity-90 telugu max-w-3xl">
{te ? <>ప్రతి visitor DB లో save అవుతారు (middleware tracking). Number ఇస్తే lead — మన WhatsApp follow-up తో profile గా మారతారు.
            WhatsApp posts అన్నీ anti-ban gap (120–170s random) తో — ఈ screen లో queue status చూడొచ్చు.</> : <>Every visitor saves to DB (middleware tracking). A number makes a lead — our WhatsApp follow-up converts them to profiles.
            All WhatsApp posts go with anti-ban gap (120–170s random) — queue status visible on this screen.</>}
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-[12px]">
            <button onClick={load} className="px-4 py-2 rounded-full gold-gradient text-maroon font-bold">🔄 Refresh</button>
            <Link href="/admin" className="px-4 py-2 rounded-full bg-white/10 border border-white/25 font-bold">Admin panel</Link>
            <Link href="/matches" className="px-4 py-2 rounded-full bg-white/10 border border-white/25 font-bold">Matches</Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">
        {note && <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl px-4 py-3 text-[13px]">{note}</div>}

        {!stats ? (
          <div className="text-gray-500 text-sm">{te ? "Load అవుతుంది…" : "Loading…"}</div>
        ) : (
          <>
            {/* ---- KPI row ---- */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              <KPI label="Visits (total)" value={stats.visits_total} sub={te ? `ఈ రోజు: ${stats.visits_today}` : `today: ${stats.visits_today}`} />
              <KPI label="Unique visitors" value={stats.visitors_unique} sub="IP+device hash" />
              <KPI label="Leads" value={stats.leads_total} sub={te ? `కొత్తవి: ${stats.leads_new}` : `new: ${stats.leads_new}`} tone="gold" />
              <KPI label="Lead conversion" value={`${stats.conversion}%`} sub="unique visitors → leads" tone="gold" />
              <KPI label="Profiles (inventory)" value={inv?.total_profiles} sub={`target ${inv?.launch_target}`} />
              <KPI label="WhatsApp sent" value={wa?.sent_total ?? 0} sub={wa?.whatsapp_mode === "off" ? "mode: off (offline)" : `mode: ${wa?.whatsapp_mode}`} />
            </div>

            {/* ---- inventory gauge ---- */}
            {inv && (
              <div className="bg-white rounded-2xl border border-gold/25 p-4">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-maroon text-[15px]">🚀 Launch inventory — {inv.total_profiles}/{inv.launch_target} ({inv.percent}%)</div>
                  <div className="text-[11px] text-gray-500">
                    brides {inv.brides} • grooms {inv.grooms} • verified {inv.verified} • photos {inv.photos}
                  </div>
                </div>
                <div className="mt-2 h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-3 maroon-gradient" style={{ width: `${Math.min(100, inv.percent)}%` }} />
                </div>
                <div className="mt-2 text-[12px] text-gray-600 telugu">{inv.message_telugu}</div>
                <div className="mt-2 grid md:grid-cols-2 gap-2 text-[11px] text-gray-600">
                  {(inv.how_to_fill || []).map((h: string) => <div key={h} className="bg-cream rounded-xl px-3 py-2">• {h}</div>)}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="text-[11px] bg-cream border border-gold/30 rounded-full px-3 py-1">castes covered: {inv.castes_covered}</span>
                  <span className="text-[11px] bg-cream border border-gold/30 rounded-full px-3 py-1">districts covered: {inv.districts_covered}</span>
                </div>
              </div>
            )}

            {/* ---- channels + top pages ---- */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl border border-gold/25 p-4">
                <div className="font-bold text-maroon text-[14px]">{te ? "📲 Traffic channels (ఎక్కడ నుంచి వచ్చారు)" : "📲 Traffic channels (where from)"}</div>
                <div className="mt-3 space-y-2">
                  {Object.entries(stats.by_channel || {}).map(([k, v]) => {
                    const max = Math.max(...Object.values(stats.by_channel as Record<string, number>).map(Number), 1);
                    return (
                      <div key={k}>
                        <div className="flex justify-between text-[11px]"><span className="font-bold">{k}</span><span>{String(v)}</span></div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-2 gold-gradient" style={{ width: `${(Number(v) / max) * 100}%` }} />
                        </div>
                      </div>
                    );
                  })}
                  {!Object.keys(stats.by_channel || {}).length && <div className="text-[12px] text-gray-500">{te ? "ఇంకా traffic లేదు — channels post చెయ్యండి" : "No traffic yet — post to channels"}</div>}
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-gold/25 p-4">
                <div className="font-bold text-maroon text-[14px]">{te ? "🔥 Top pages (ఎక్కడ ఎక్కువ చూస్తున్నారు)" : "🔥 Top pages (most viewed)"}</div>
                <div className="mt-3 space-y-1.5">
                  {(stats.top_paths || []).map((p: any) => (
                    <div key={p.path} className="flex justify-between text-[12px] bg-cream rounded-xl px-3 py-2">
                      <span className="truncate">{p.path}</span><span className="font-bold text-maroon">{p.visits}</span>
                    </div>
                  ))}
                  {!(stats.top_paths || []).length && <div className="text-[12px] text-gray-500">{te ? "ఇంకా data లేదు" : "No data yet"}</div>}
                </div>
              </div>
            </div>

            {/* ---- leads table ---- */}
            <div className="bg-white rounded-2xl border border-gold/25 p-4">
              <div className="flex items-center justify-between">
                <div className="font-bold text-maroon text-[14px]">{te ? "📱 Leads (number ఇచ్చిన వాళ్లు) — follow-up చెయ్యండి" : "📱 Leads (gave numbers) — follow up"}</div>
                <div className="text-[11px] text-gray-500">{leads.length} shown</div>
              </div>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="text-left text-gray-500">
                      <th className="py-1">Lead</th><th>Number</th><th>Gender</th><th>District</th>
                      <th>Source</th><th>Status</th><th>Follow-up</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map((l) => (
                      <tr key={l.id} className="border-t border-gold/15">
                        <td className="py-1.5 font-mono text-[11px]">{l.id}</td>
                        <td className="font-bold">{l.phone}</td>
                        <td>{l.gender || "—"}</td>
                        <td>{l.district || "—"}</td>
                        <td>{l.source}</td>
                        <td>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${l.status === "converted" ? "bg-emerald-100 text-emerald-800" :
                            l.status === "contacted" ? "bg-amber-100 text-amber-800" : "bg-gray-100 text-gray-700"}`}>{l.status}</span>
                        </td>
                        <td>
                          <button onClick={() => followup(l.id)} disabled={busy === l.id}
                            className="px-3 py-1.5 rounded-full maroon-gradient text-white font-bold text-[10px] disabled:opacity-50">
                            {busy === l.id ? "…" : "📲 WhatsApp follow-up"}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {!leads.length && <tr><td colSpan={7} className="py-3 text-gray-500">{te ? "ఇంకా leads లేవు — QuickLead form / register తో వస్తాయి" : "No leads yet — they come via QuickLead form / register"}</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ---- WhatsApp anti-ban status ---- */}
            <div className="bg-white rounded-2xl border border-gold/25 p-4">
              <div className="font-bold text-maroon text-[14px]">🛡️ WhatsApp anti-ban status</div>
              <div className="mt-3 grid grid-cols-2 md:grid-cols-5 gap-3 text-[12px]">
                <div className="bg-cream rounded-xl px-3 py-2">mode: <b>{wa?.whatsapp_mode}</b></div>
                <div className="bg-cream rounded-xl px-3 py-2">gap: <b>{ab.random_gap || "—"}</b></div>
                <div className="bg-cream rounded-xl px-3 py-2">queue: <b>{wa?.queued}</b> (interest {wa?.queued_interest})</div>
                <div className="bg-cream rounded-xl px-3 py-2">cap today: <b>{ab.warmup_cap_today ?? "—"}</b> / {ab.daily_cap ?? "—"}</div>
                <div className="bg-cream rounded-xl px-3 py-2">hours: <b>{(ab.active_hours_ist || []).join("–")} IST</b></div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={() => waAction("/api/wa/pause")} className="px-4 py-2 rounded-full border border-rose-300 text-rose-700 font-bold text-[12px]">⏸️ Pause WhatsApp</button>
                <button onClick={() => waAction("/api/wa/resume")} className="px-4 py-2 rounded-full border border-emerald-300 text-emerald-700 font-bold text-[12px]">▶️ Resume</button>
                <button onClick={() => waAction("/api/wa/reset_day")} className="px-4 py-2 rounded-full border border-gold/40 text-maroon font-bold text-[12px]">🔄 Reset day counter</button>
              </div>
              <div className="mt-2 text-[11px] text-gray-500">
                {te ? "Telegram ముందు post అవుతుంది → WhatsApp తర్వాత (random 120–170s gap, every 6 messages కి 8–20 min break, 8–22 IST only)." : "Telegram posts first → WhatsApp after (random 120–170s gap, 8–20 min break every 6 messages, 8–22 IST only)."}
              </div>
            </div>

            {/* ---- lead sources ---- */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl border border-gold/25 p-4">
                <div className="font-bold text-maroon text-[14px]">📍 Leads by district</div>
                <div className="mt-2 space-y-1">
                  {Object.entries(stats.leads_by_district || {}).map(([k, v]) => (
                    <div key={k} className="flex justify-between text-[12px]"><span>{k}</span><b className="text-maroon">{String(v)}</b></div>
                  ))}
                  {!Object.keys(stats.leads_by_district || {}).length && <div className="text-[12px] text-gray-500">{te ? "Data లేదు" : "No data"}</div>}
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-gold/25 p-4">
                <div className="font-bold text-maroon text-[14px]">🧲 Leads by source</div>
                <div className="mt-2 space-y-1">
                  {Object.entries(stats.leads_by_source || {}).map(([k, v]) => (
                    <div key={k} className="flex justify-between text-[12px]"><span>{k}</span><b className="text-maroon">{String(v)}</b></div>
                  ))}
                  {!Object.keys(stats.leads_by_source || {}).length && <div className="text-[12px] text-gray-500">{te ? "Data లేదు" : "No data"}</div>}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
