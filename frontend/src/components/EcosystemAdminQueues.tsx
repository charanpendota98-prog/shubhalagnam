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
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [flash, setFlash] = useState("");

  const loadAll = useCallback(async () => {
    const h = authHeaders(true);
    try {
      const [vr, ar, tr] = await Promise.all([
        fetch("/api/admin/verification/queue?status=pending_review", { headers: h, credentials: "same-origin" }),
        fetch("/api/admin/appeals?status=pending", { headers: h, credentials: "same-origin" }),
        fetch("/api/admin/support/tickets?status=open", { headers: h, credentials: "same-origin" }),
      ]);
      if (vr.ok) setVerifs((await readApiJson(vr)).items || []);
      if (ar.ok) setAppeals((await readApiJson(ar)).appeals || []);
      if (tr.ok) setTickets((await readApiJson(tr)).tickets || []);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const reviewBadge = async (recordId: string, decision: "verified" | "rejected") => {
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

  const resolveAppeal = async (appealId: string, decision: "upheld_restore" | "rejected") => {
    const r = await fetch(`/api/admin/appeals/${encodeURIComponent(appealId)}/resolve`, {
      method: "POST",
      headers: { ...authHeaders(true), "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ decision, note: replyText[appealId] || "" }),
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

  return (
    <div className="mt-6 space-y-5 border-t border-slate-200 pt-5">
      {flash && <div className="rounded-xl bg-emerald-900 px-3 py-2 text-xs font-bold text-white">{flash}</div>}

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
                {v.evidence_note && <div className="text-gray-700">{v.evidence_note}</div>}
                <div className="flex flex-wrap gap-1.5">
                  <input
                    value={replyText[v.id] || ""}
                    onChange={(e) => setReplyText({ ...replyText, [v.id]: e.target.value })}
                    placeholder="Reviewer note…"
                    aria-label="Verification review note"
                    className="flex-1 rounded-lg border px-2 py-1 text-xs"
                  />
                  <button type="button" onClick={() => void reviewBadge(v.id, "verified")} className="rounded-lg bg-emerald-700 px-3 py-1 font-bold text-white">
                    ✓ Verify
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
                <div className="text-gray-700">{a.statement}</div>
                <div className="flex flex-wrap gap-1.5">
                  <input
                    value={replyText[a.id] || ""}
                    onChange={(e) => setReplyText({ ...replyText, [a.id]: e.target.value })}
                    placeholder="Resolution note…"
                    aria-label="Appeal resolution note"
                    className="flex-1 rounded-lg border px-2 py-1 text-xs"
                  />
                  <button type="button" onClick={() => void resolveAppeal(a.id, "upheld_restore")} className="rounded-lg bg-emerald-700 px-3 py-1 font-bold text-white">
                    Restore Profile
                  </button>
                  <button type="button" onClick={() => void resolveAppeal(a.id, "rejected")} className="rounded-lg bg-gray-200 px-3 py-1 font-bold text-gray-800">
                    Reject Appeal
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
    </div>
  );
}
