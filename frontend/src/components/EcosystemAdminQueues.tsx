"use client";

import { useCallback, useEffect, useState } from "react";
import { authHeaders, readApiJson } from "@/lib/api";
import { useLang } from "@/lib/lang";

export default function EcosystemAdminQueues() {
  const { lang } = useLang();
  const te = lang === "te";
  const [verifs, setVerifs] = useState<any[]>([]);
  const [appeals, setAppeals] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [parity, setParity] = useState<any>(null);
  const [quarantine, setQuarantine] = useState<any[]>([]);
  const [refunds, setRefunds] = useState<any[]>([]);
  const [holds, setHolds] = useState<any[]>([]);
  const [flags, setFlags] = useState<Record<string, any>>({});
  const [drDrill, setDrDrill] = useState<any>(null);
  const [holdTargetId, setHoldTargetId] = useState("");
  const [holdReason, setHoldReason] = useState("");
  const [aiInput, setAiInput] = useState("");
  const [aiResult, setAiResult] = useState<any>(null);
  const [evTitle, setEvTitle] = useState("");
  const [evCity, setEvCity] = useState("Hyderabad");
  const [evDate, setEvDate] = useState("2027-01-24");
  const [evOrg, setEvOrg] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const [orgName, setOrgName] = useState("");
  const [orgCaste, setOrgCaste] = useState("");
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [flash, setFlash] = useState("");

  const loadAll = useCallback(async () => {
    const h = authHeaders(true);
    try {
      const [vr, ar, tr, apr, pr, qr, rfr, hlr, flr] = await Promise.all([
        fetch("/api/admin/verification/queue?status=pending_review", { headers: h, credentials: "same-origin" }),
        fetch("/api/admin/appeals?status=pending", { headers: h, credentials: "same-origin" }),
        fetch("/api/admin/support/tickets?status=open", { headers: h, credentials: "same-origin" }),
        fetch("/api/admin/appointments?status=requested", { headers: h, credentials: "same-origin" }),
        fetch("/api/admin/identity/reconcile", { headers: h, credentials: "same-origin" }),
        fetch("/api/admin/media/quarantine?status=quarantined", { headers: h, credentials: "same-origin" }),
        fetch("/api/admin/refunds?status=open", { headers: h, credentials: "same-origin" }),
        fetch("/api/admin/legal-holds?status=active", { headers: h, credentials: "same-origin" }),
        fetch("/api/admin/flags", { headers: h, credentials: "same-origin" }),
      ]);
      if (vr.ok) setVerifs((await readApiJson(vr)).items || []);
      if (ar.ok) setAppeals((await readApiJson(ar)).appeals || []);
      if (tr.ok) setTickets((await readApiJson(tr)).tickets || []);
      if (apr.ok) setAppointments((await readApiJson(apr)).appointments || []);
      if (pr.ok) setParity(await readApiJson(pr));
      if (qr.ok) setQuarantine((await readApiJson(qr)).items || []);
      if (rfr.ok) setRefunds((await readApiJson(rfr)).refunds || []);
      if (hlr.ok) setHolds((await readApiJson(hlr)).holds || []);
      if (flr.ok) setFlags((await readApiJson(flr)).flags || {});
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const syncIdentitySql = async () => {
    const r = await fetch("/api/admin/identity/sync", {
      method: "POST",
      headers: authHeaders(true),
      credentials: "same-origin",
    });
    if (r.ok) {
      const d = await readApiJson(r);
      setParity(d.reconcile || null);
      setFlash(`✅ SQL Identity Sync complete (${d.sync?.synced ?? 0} synced)`);
    }
  };

  const reviewBadge = async (recordId: string, decision: "approved" | "rejected") => {
    const r = await fetch(`/api/admin/verification/${encodeURIComponent(recordId)}/review`, {
      method: "POST",
      headers: { ...authHeaders(true), "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ decision, reason: replyText[recordId] || "" }),
    });
    if (r.ok) {
      setFlash(`✅ Verification ${recordId} → ${decision}`);
      void loadAll();
    }
  };

  const resolveAppeal = async (appealId: string, decision: "upheld" | "denied") => {
    const r = await fetch(`/api/admin/appeals/${encodeURIComponent(appealId)}/resolve`, {
      method: "POST",
      headers: { ...authHeaders(true), "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ outcome: decision, note: replyText[appealId] || "" }),
    });
    if (r.ok) {
      setFlash(`✅ Appeal ${appealId} → ${decision}`);
      void loadAll();
    }
  };

  const replyTicket = async (ticketId: string) => {
    const msg = (replyText[ticketId] || "").trim();
    if (!msg) return;
    const r = await fetch(`/api/admin/support/tickets/${encodeURIComponent(ticketId)}/reply`, {
      method: "POST",
      headers: { ...authHeaders(true), "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ reply: msg, status: "resolved" }),
    });
    if (r.ok) {
      setFlash(`✅ Replied & resolved ${ticketId}`);
      void loadAll();
    }
  };

  const updateAppt = async (aptId: string, status: "confirmed" | "completed" | "cancelled") => {
    const r = await fetch(`/api/admin/appointments/${encodeURIComponent(aptId)}/status`, {
      method: "POST",
      headers: { ...authHeaders(true), "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ status, staff_note: replyText[aptId] || "" }),
    });
    if (r.ok) {
      setFlash(`✅ Appointment ${aptId} → ${status}`);
      void loadAll();
    }
  };

  return (
    <div className="mt-6 space-y-5 border-t border-slate-200 pt-5">
      {flash && <div className="rounded-xl bg-emerald-900 px-3 py-2 text-xs font-bold text-white">{flash}</div>}

      {/* Phase 2: Transactional Identity SQL Parity Card (Owner only) */}
      {parity && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="font-extrabold text-[#7A0C2E]">🗄️ Phase 2 SQL Identity Parity:</span>{" "}
            <span>JSON={parity.json_count} • SQL={parity.sql_count} • Active Sessions={parity.active_sessions}</span>{" "}
            <span className={`font-bold ${parity.parity_ok ? "text-emerald-700" : "text-amber-700"}`}>
              ({parity.parity_ok ? "PARITY OK ✓" : `${parity.missing_in_sql_count} unsynced`})
            </span>
          </div>
          <button
            type="button"
            onClick={() => void syncIdentitySql()}
            className="rounded-lg border border-[#7A0C2E] px-2.5 py-1 font-bold text-[#7A0C2E] bg-white"
          >
            ↻ Re-sync SQL Shadow Store
          </button>
        </div>
      )}

      {/* 1. Multi-Badge Verification Queue */}
      <div>
        <h3 className="text-xs font-extrabold uppercase tracking-wide text-[#7A0C2E]">
          🪪 {te ? "బ్యాడ్జ్ ధృవీకరణ క్యూ" : "Multi-Badge Verification Queue"} ({verifs.length})
        </h3>
        {verifs.length === 0 ? (
          <p className="mt-1 text-xs text-gray-400">{te ? "పెండింగ్ ధృవీకరణలు లేవు ✅" : "No pending badge verifications ✅"}</p>
        ) : (
          <div className="mt-2 space-y-2">
            {verifs.map((v) => (
              <div key={v.id} className="rounded-xl border p-3 text-xs space-y-1.5">
                <div className="flex justify-between font-bold">
                  <span>{v.tsap_id} • {v.badge_type}</span>
                  <span className="text-gray-400">{String(v.submitted_at || "").slice(0, 16)}</span>
                </div>
                {v.summary && <div className="text-gray-700">{v.summary}</div>}
                <div className="flex flex-wrap gap-1.5">
                  <input
                    value={replyText[v.id] || ""}
                    onChange={(e) => setReplyText({ ...replyText, [v.id]: e.target.value })}
                    placeholder="Reviewer note…"
                    aria-label="Verification review note"
                    className="flex-1 rounded-lg border px-2 py-1 text-xs"
                  />
                  <button type="button" onClick={() => void reviewBadge(v.id, "approved")} className="rounded-lg bg-emerald-700 px-3 py-1 font-bold text-white">
                    ✓ Approve Badge
                  </button>
                  <button type="button" onClick={() => void reviewBadge(v.id, "rejected")} className="rounded-lg bg-rose-100 px-3 py-1 font-bold text-rose-800">
                    ✕ Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. Moderation Appeals Queue */}
      <div>
        <h3 className="text-xs font-extrabold uppercase tracking-wide text-[#7A0C2E]">
          ⚖️ {te ? "మోడరేషన్ అప్పీల్స్ క్యూ" : "Moderation Appeals Queue"} ({appeals.length})
        </h3>
        {appeals.length === 0 ? (
          <p className="mt-1 text-xs text-gray-400">{te ? "పెండింగ్ అప్పీల్స్ లేవు ✅" : "No pending moderation appeals ✅"}</p>
        ) : (
          <div className="mt-2 space-y-2">
            {appeals.map((a) => (
              <div key={a.id} className="rounded-xl border p-3 text-xs space-y-1.5">
                <div className="font-bold">{a.id} • Profile: {a.tsap_id}</div>
                <div className="text-gray-700">{a.reason} {a.context_note ? `— ${a.context_note}` : ""}</div>
                <div className="flex flex-wrap gap-1.5">
                  <input
                    value={replyText[a.id] || ""}
                    onChange={(e) => setReplyText({ ...replyText, [a.id]: e.target.value })}
                    placeholder="Resolution note…"
                    aria-label="Appeal resolution note"
                    className="flex-1 rounded-lg border px-2 py-1 text-xs"
                  />
                  <button type="button" onClick={() => void resolveAppeal(a.id, "upheld")} className="rounded-lg bg-emerald-700 px-3 py-1 font-bold text-white">
                    Restore Profile
                  </button>
                  <button type="button" onClick={() => void resolveAppeal(a.id, "denied")} className="rounded-lg bg-gray-200 px-3 py-1 font-bold text-gray-800">
                    Deny Appeal
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Support Tickets Queue */}
      <div>
        <h3 className="text-xs font-extrabold uppercase tracking-wide text-[#7A0C2E]">
          🎫 {te ? "సభ్యుల సపోర్ట్ టికెట్లు" : "Open Member Support Tickets"} ({tickets.length})
        </h3>
        {tickets.length === 0 ? (
          <p className="mt-1 text-xs text-gray-400">{te ? "ఓపెన్ సపోర్ట్ టికెట్లు లేవు ✅" : "No open support tickets ✅"}</p>
        ) : (
          <div className="mt-2 space-y-2">
            {tickets.map((t) => (
              <div key={t.ticket_id} className="rounded-xl border p-3 text-xs space-y-1.5">
                <div className="font-bold">{t.ticket_id} • {t.tsap_id} • [{t.category}] {t.subject}</div>
                <div className="text-gray-700">{t.messages?.[0]?.text}</div>
                <div className="flex flex-wrap gap-1.5">
                  <input
                    value={replyText[t.ticket_id] || ""}
                    onChange={(e) => setReplyText({ ...replyText, [t.ticket_id]: e.target.value })}
                    placeholder="Reply to member…"
                    aria-label="Support reply"
                    className="flex-1 rounded-lg border px-2 py-1 text-xs"
                  />
                  <button type="button" onClick={() => void replyTicket(t.ticket_id)} className="rounded-lg bg-[#7A0C2E] px-3 py-1 font-bold text-white">
                    Send & Resolve
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Phase 2 Assisted Matchmaker Appointments Queue */}
      <div>
        <h3 className="text-xs font-extrabold uppercase tracking-wide text-[#7A0C2E]">
          📅 {te ? "మ్యాచ్ మేకర్ కన్సల్టేషన్ అభ్యర్థనలు" : "Assisted Matchmaker Appointments"} ({appointments.length})
        </h3>
        {appointments.length === 0 ? (
          <p className="mt-1 text-xs text-gray-400">{te ? "పెండింగ్ కన్సల్టేషన్లు లేవు ✅" : "No pending appointment requests ✅"}</p>
        ) : (
          <div className="mt-2 space-y-2">
            {appointments.map((ap) => (
              <div key={ap.appointment_id} className="rounded-xl border p-3 text-xs space-y-1.5">
                <div className="font-bold">{ap.appointment_id} • {ap.tsap_id} ({ap.member_name}) • {ap.preferred_date} [{ap.preferred_slot}]</div>
                {ap.family_notes && <div className="text-gray-700">{ap.family_notes}</div>}
                <div className="flex flex-wrap gap-1.5">
                  <input
                    value={replyText[ap.appointment_id] || ""}
                    onChange={(e) => setReplyText({ ...replyText, [ap.appointment_id]: e.target.value })}
                    placeholder="Coordinator note / call window…"
                    aria-label="Appointment coordinator note"
                    className="flex-1 rounded-lg border px-2 py-1 text-xs"
                  />
                  <button type="button" onClick={() => void updateAppt(ap.appointment_id, "confirmed")} className="rounded-lg bg-emerald-700 px-3 py-1 font-bold text-white">
                    Confirm Slot
                  </button>
                  <button type="button" onClick={() => void updateAppt(ap.appointment_id, "completed")} className="rounded-lg bg-[#7A0C2E] px-3 py-1 font-bold text-white">
                    Mark Completed
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Phases 3–12 Enterprise Governance Console */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-black text-[#7A0C2E]">
              {te ? "Phases 3–12 ఎంటర్‌ప్రైజ్ గవర్నెన్స్ & DR కన్సోల్" : "Phases 3–12 Enterprise Governance, Legal Holds & DR Console"}
            </h3>
            <p className="text-xs text-slate-600">
              Media Quarantine: <b>{quarantine.length}</b> • Open Refunds: <b>{refunds.length}</b> • Active Legal Holds: <b>{holds.length}</b>
            </p>
          </div>
          <button
            type="button"
            onClick={async () => {
              const r = await fetch("/api/admin/dr/drill", {
                method: "POST",
                headers: authHeaders(true),
                credentials: "same-origin",
              });
              const d = await readApiJson(r);
              if (r.ok && d.drill) {
                setDrDrill(d.drill);
                setFlash(`✅ Non-destructive DR Drill passed (${d.drill.drill_id})`);
              }
            }}
            className="rounded-xl bg-emerald-700 px-3.5 py-1.5 text-xs font-bold text-white"
          >
            Run Non-Destructive DR Drill
          </button>
        </div>

        {drDrill && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs">
            <b>{drDrill.drill_id}</b> • SHA-256: <code>{drDrill.snapshot_sha256?.slice(0, 24)}…</code> • SQL Parity:{" "}
            <b>{drDrill.sql_parity_ok ? "Verified" : "Mismatch"}</b> ({drDrill.duration_ms} ms)
          </div>
        )}

        {/* Phase 5 Refunds Queue */}
        {refunds.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-700">Open Billing / Refund Cases</div>
            {refunds.map((rf) => (
              <div key={rf.refund_id} className="rounded-xl border border-slate-200 p-2.5 text-xs flex flex-wrap items-center justify-between gap-2">
                <span>
                  <b>{rf.refund_id}</b> • {rf.tsap_id} • ₹{rf.amount_inr} — {rf.reason}
                </span>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={async () => {
                      const r = await fetch(`/api/admin/refunds/${rf.refund_id}/resolve`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json", ...authHeaders(true) },
                        credentials: "same-origin",
                        body: JSON.stringify({ status: "approved", staff_note: "Verified ledger entry; approved." }),
                      });
                      if (r.ok) {
                        setFlash(`✅ Refund ${rf.refund_id} approved`);
                        await loadAll();
                      }
                    }}
                    className="rounded-lg bg-emerald-700 px-2.5 py-1 font-bold text-white"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const r = await fetch(`/api/admin/refunds/${rf.refund_id}/resolve`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json", ...authHeaders(true) },
                        credentials: "same-origin",
                        body: JSON.stringify({ status: "rejected", staff_note: "No matching duplicate charge." }),
                      });
                      if (r.ok) {
                        setFlash(`Refund ${rf.refund_id} closed`);
                        await loadAll();
                      }
                    }}
                    className="rounded-lg bg-rose-700 px-2.5 py-1 font-bold text-white"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Phase 7 Legal Holds */}
        <div className="rounded-xl border border-slate-200 p-3 space-y-2">
          <div className="text-xs font-bold text-slate-800">Phase 7 — Dispute Legal Holds (Blocks Destructive Purge)</div>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={holdTargetId}
              onChange={(e) => setHoldTargetId(e.target.value.toUpperCase())}
              placeholder="TSAP ID"
              aria-label="Legal hold TSAP ID"
              className="rounded-lg border px-2.5 py-1.5 text-xs font-mono"
            />
            <input
              value={holdReason}
              onChange={(e) => setHoldReason(e.target.value)}
              placeholder="Dispute / investigation reason (min 8 chars)"
              aria-label="Legal hold reason"
              className="rounded-lg border px-2.5 py-1.5 text-xs flex-1"
            />
            <button
              type="button"
              onClick={async () => {
                const r = await fetch("/api/admin/legal-holds", {
                  method: "POST",
                  headers: { "Content-Type": "application/json", ...authHeaders(true) },
                  credentials: "same-origin",
                  body: JSON.stringify({ tsap_id: holdTargetId, reason: holdReason }),
                });
                if (r.ok) {
                  setHoldTargetId("");
                  setHoldReason("");
                  setFlash("✅ Legal hold placed");
                  await loadAll();
                }
              }}
              className="rounded-lg bg-[#7A0C2E] px-3 py-1.5 text-xs font-bold text-white"
            >
              Place Hold
            </button>
          </div>
          {holds.map((h) => (
            <div key={h.hold_id} className="flex items-center justify-between rounded-lg bg-amber-50 px-3 py-1.5 text-xs">
              <span><b>{h.hold_id}</b> • {h.tsap_id} — {h.reason}</span>
              <button
                type="button"
                onClick={async () => {
                  const r = await fetch(`/api/admin/legal-holds/${h.hold_id}/release`, {
                    method: "POST",
                    headers: authHeaders(true),
                    credentials: "same-origin",
                  });
                  if (r.ok) await loadAll();
                }}
                className="font-bold text-[#7A0C2E] underline"
              >
                Release
              </button>
            </div>
          ))}
        </div>

        {/* Phase 8 Feature Flags */}
        <div className="rounded-xl border border-slate-200 p-3 space-y-2">
          <div className="text-xs font-bold text-slate-800">Phase 8 — Governed Feature Flags (Default-Closed)</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {Object.entries(flags).map(([k, v]: [string, any]) => (
              <div key={k} className="flex items-center justify-between rounded-lg border px-3 py-1.5 text-xs">
                <span className="font-mono">{k}</span>
                <button
                  type="button"
                  onClick={async () => {
                    const r = await fetch("/api/admin/flags", {
                      method: "POST",
                      headers: { "Content-Type": "application/json", ...authHeaders(true) },
                      credentials: "same-origin",
                      body: JSON.stringify({ flag: k, enabled: !v?.enabled, owner: v?.owner || "platform-ops" }),
                    });
                    if (r.ok) await loadAll();
                  }}
                  className={`rounded-full px-2.5 py-0.5 font-bold ${
                    v?.enabled ? "bg-emerald-100 text-emerald-900" : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {v?.enabled ? "ON" : "OFF"}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Phase 9 Advisory-Only AI Assist + Kill Switch */}
        <div className="rounded-xl border border-slate-200 p-3 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-800">
              Phase 9 — PII-Redacted AI Assist Triage (Human Authority Only)
            </span>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={async () => {
                  await fetch("/api/admin/ai-assist/kill-switch", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", ...authHeaders(true) },
                    credentials: "same-origin",
                    body: JSON.stringify({ enabled: true, reason: "Operator enabled advisory triage" }),
                  });
                  setFlash("✅ AI Assist advisory mode enabled");
                }}
                className="rounded-lg bg-emerald-700 px-2.5 py-1 text-[11px] font-bold text-white"
              >
                Enable Assist
              </button>
              <button
                type="button"
                onClick={async () => {
                  await fetch("/api/admin/ai-assist/kill-switch", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", ...authHeaders(true) },
                    credentials: "same-origin",
                    body: JSON.stringify({ enabled: false, reason: "Instant operator kill-switch" }),
                  });
                  setAiResult(null);
                  setFlash("🛑 AI Assist global kill-switch engaged");
                }}
                className="rounded-lg bg-rose-700 px-2.5 py-1 text-[11px] font-bold text-white"
              >
                Kill Switch OFF
              </button>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              placeholder="Paste moderation or support note (phones/emails auto-redacted)…"
              aria-label="AI triage input text"
              className="rounded-lg border px-2.5 py-1.5 text-xs flex-1"
            />
            <button
              type="button"
              onClick={async () => {
                const r = await fetch("/api/admin/ai-assist/triage", {
                  method: "POST",
                  headers: { "Content-Type": "application/json", ...authHeaders(true) },
                  credentials: "same-origin",
                  body: JSON.stringify({ kind: "moderation", text: aiInput, distinct_reporters: 1 }),
                });
                const d = await readApiJson(r);
                if (r.ok) setAiResult(d.triage);
                else setFlash(d?.detail || "AI Assist is disabled by kill-switch.");
              }}
              className="rounded-lg bg-[#7A0C2E] px-3 py-1.5 text-xs font-bold text-white"
            >
              Run Redacted Triage
            </button>
          </div>
          {aiResult && (
            <div className="rounded-lg bg-slate-50 p-2.5 text-xs space-y-1">
              <div>
                <b>Priority:</b> {aiResult.priority} • <b>Authority:</b> {aiResult.authority} •{" "}
                <b>SOP:</b> {aiResult.recommended_human_sop}
              </div>
              <div className="text-slate-600">
                <b>Redacted Preview:</b> {aiResult.redacted_summary}
              </div>
            </div>
          )}
        </div>

        {/* Phase 3 Verified Community Event & Org Portal Publisher */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-xl border border-slate-200 p-3 space-y-2">
            <div className="text-xs font-bold text-slate-800">Publish Verified Parichaya Vedika Event</div>
            <input value={evTitle} onChange={(e) => setEvTitle(e.target.value)} placeholder="Event title" aria-label="Event title" className="w-full rounded-lg border px-2.5 py-1.5 text-xs" />
            <div className="grid grid-cols-2 gap-2">
              <input value={evCity} onChange={(e) => setEvCity(e.target.value)} placeholder="City" aria-label="Event city" className="rounded-lg border px-2.5 py-1.5 text-xs" />
              <input type="date" value={evDate} onChange={(e) => setEvDate(e.target.value)} aria-label="Event date" className="rounded-lg border px-2.5 py-1.5 text-xs" />
            </div>
            <input value={evOrg} onChange={(e) => setEvOrg(e.target.value)} placeholder="Verified organizer" aria-label="Event organizer" className="w-full rounded-lg border px-2.5 py-1.5 text-xs" />
            <button
              type="button"
              onClick={async () => {
                const r = await fetch("/api/admin/events", {
                  method: "POST",
                  headers: { "Content-Type": "application/json", ...authHeaders(true) },
                  credentials: "same-origin",
                  body: JSON.stringify({ title_en: evTitle, city: evCity, event_date: evDate, organizer: evOrg }),
                });
                if (r.ok) {
                  setEvTitle("");
                  setEvOrg("");
                  setFlash("✅ Verified community event published");
                }
              }}
              className="rounded-lg bg-[#7A0C2E] px-3 py-1.5 text-xs font-bold text-white"
            >
              Publish Event
            </button>
          </div>

          <div className="rounded-xl border border-slate-200 p-3 space-y-2">
            <div className="text-xs font-bold text-slate-800">Create White-Label Organization Portal</div>
            <div className="grid grid-cols-2 gap-2">
              <input value={orgSlug} onChange={(e) => setOrgSlug(e.target.value.toLowerCase())} placeholder="slug (e.g. hyd-seva)" aria-label="Organization slug" className="rounded-lg border px-2.5 py-1.5 text-xs font-mono" />
              <input value={orgCaste} onChange={(e) => setOrgCaste(e.target.value)} placeholder="Community filter" aria-label="Organization community filter" className="rounded-lg border px-2.5 py-1.5 text-xs" />
            </div>
            <input value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="Verified Organization Name" aria-label="Organization name" className="w-full rounded-lg border px-2.5 py-1.5 text-xs" />
            <button
              type="button"
              onClick={async () => {
                const r = await fetch("/api/admin/orgs", {
                  method: "POST",
                  headers: { "Content-Type": "application/json", ...authHeaders(true) },
                  credentials: "same-origin",
                  body: JSON.stringify({ slug: orgSlug, org_name_en: orgName, community_filter: orgCaste }),
                });
                if (r.ok) {
                  setOrgSlug("");
                  setOrgName("");
                  setFlash("✅ White-label organization portal published");
                }
              }}
              className="rounded-lg bg-[#7A0C2E] px-3 py-1.5 text-xs font-bold text-white"
            >
              Publish Org Portal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
