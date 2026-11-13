"use client";

import { useCallback, useEffect, useState } from "react";
import { authHeaders, readApiJson } from "@/lib/api";
import { useLang } from "@/lib/lang";

export type EcosystemSection = "family" | "ledger" | "privacy" | "support";

export default function MemberEcosystemHub({
  myId,
  section,
}: {
  myId: string;
  section: EcosystemSection;
}) {
  const { lang } = useLang();
  const te = lang === "te";
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");

  // Credit ledger & receipts
  const [ledger, setLedger] = useState<any>(null);
  const [receipts, setReceipts] = useState<any[]>([]);

  // Family collaboration
  const [family, setFamily] = useState<any>(null);
  const [collabName, setCollabName] = useState("");
  const [collabRelation, setCollabRelation] = useState("father");
  const [suggestId, setSuggestId] = useState("");
  const [suggestNote, setSuggestNote] = useState("");

  // Private photo access grants
  const [photoAccess, setPhotoAccess] = useState<any>({ incoming: [], outgoing: [] });

  // Support tickets
  const [tickets, setTickets] = useState<any[]>([]);
  const [tktCategory, setTktCategory] = useState("general");
  const [tktSubject, setTktSubject] = useState("");
  const [tktMessage, setTktMessage] = useState("");

  const loadSection = useCallback(async () => {
    if (!myId) return;
    setToast("");
    try {
      if (section === "ledger") {
        const [lr, rr] = await Promise.all([
          fetch(`/api/credits/${encodeURIComponent(myId)}/ledger`, { headers: authHeaders(), credentials: "same-origin" }),
          fetch(`/api/payments/${encodeURIComponent(myId)}/receipts`, { headers: authHeaders(), credentials: "same-origin" }),
        ]);
        if (lr.ok) setLedger(await readApiJson(lr));
        if (rr.ok) {
          const rj = await readApiJson(rr);
          setReceipts(rj.receipts || []);
        }
      } else if (section === "family") {
        const fr = await fetch(`/api/family/${encodeURIComponent(myId)}`, { headers: authHeaders(), credentials: "same-origin" });
        if (fr.ok) setFamily(await readApiJson(fr));
      } else if (section === "privacy") {
        const pr = await fetch(`/api/photo/access/${encodeURIComponent(myId)}`, { headers: authHeaders(), credentials: "same-origin" });
        if (pr.ok) setPhotoAccess(await readApiJson(pr));
      } else if (section === "support") {
        const sr = await fetch(`/api/support/tickets/${encodeURIComponent(myId)}`, { headers: authHeaders(), credentials: "same-origin" });
        if (sr.ok) {
          const sj = await readApiJson(sr);
          setTickets(sj.tickets || []);
        }
      }
    } catch {
      /* ignore */
    }
  }, [myId, section]);

  useEffect(() => {
    void loadSection();
  }, [loadSection]);

  const inviteFamily = async () => {
    if (!collabName.trim()) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/family/${encodeURIComponent(myId)}/invite`, {
        method: "POST",
        headers: authHeaders(),
        credentials: "same-origin",
        body: JSON.stringify({ name: collabName, relation: collabRelation, can_shortlist: true, can_suggest: true }),
      });
      const d = await readApiJson(r);
      if (r.ok && d.success) {
        setCollabName("");
        setToast(
          te
            ? `✅ ఆహ్వాన కోడ్ సిద్ధం: ${d.invite?.invite_code}`
            : `✅ Family invite code created: ${d.invite?.invite_code}`,
        );
        await loadSection();
      } else {
        setToast(d.detail || "Could not create invite.");
      }
    } finally {
      setBusy(false);
    }
  };

  const revokeFamily = async (collabId: string) => {
    setBusy(true);
    try {
      const r = await fetch(`/api/family/${encodeURIComponent(myId)}/revoke/${encodeURIComponent(collabId)}`, {
        method: "POST",
        headers: authHeaders(),
        credentials: "same-origin",
      });
      if (r.ok) {
        setToast(te ? "✅ కుటుంబ యాక్సెస్ రద్దు చేయబడింది." : "✅ Collaborator access revoked.");
        await loadSection();
      }
    } finally {
      setBusy(false);
    }
  };

  const saveFamilySuggestion = async () => {
    if (!suggestId.trim()) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/family/${encodeURIComponent(myId)}/suggest`, {
        method: "POST",
        headers: authHeaders(),
        credentials: "same-origin",
        body: JSON.stringify({ candidate_tsap_id: suggestId.trim().toUpperCase(), note: suggestNote }),
      });
      const d = await readApiJson(r);
      if (r.ok && d.success) {
        setSuggestId("");
        setSuggestNote("");
        setToast(te ? "✅ సంబంధం సూచన నమోదైంది." : "✅ Match suggestion recorded.");
        await loadSection();
      } else {
        setToast(d.detail || "Could not record suggestion.");
      }
    } finally {
      setBusy(false);
    }
  };

  const respondPhotoGrant = async (grantId: string, decision: "approved" | "declined" | "revoked") => {
    setBusy(true);
    try {
      const r = await fetch("/api/photo/access/respond", {
        method: "POST",
        headers: authHeaders(),
        credentials: "same-origin",
        body: JSON.stringify({ owner_id: myId, grant_id: grantId, decision, days: 7 }),
      });
      if (r.ok) {
        setToast(te ? `✅ ఫోటో అనుమతి స్థితి: ${decision}` : `✅ Photo access updated: ${decision}`);
        await loadSection();
      }
    } finally {
      setBusy(false);
    }
  };

  const downloadDataExport = async () => {
    setBusy(true);
    try {
      const r = await fetch(`/api/me/${encodeURIComponent(myId)}/data-export`, {
        headers: authHeaders(),
        credentials: "same-origin",
      });
      if (!r.ok) {
        setToast(te ? "డేటా డౌన్‌లోడ్ సాధ్యం కాలేదు." : "Could not export account data.");
        return;
      }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mana-vivaha-data-${myId}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setToast(te ? "✅ మీ ఖాతా డేటా JSON డౌన్‌లోడ్ అయింది." : "✅ Your account data export (JSON) has downloaded.");
    } finally {
      setBusy(false);
    }
  };

  const submitTicket = async () => {
    if (tktSubject.trim().length < 4 || tktMessage.trim().length < 10) {
      setToast(te ? "విషయం మరియు పూర్తి వివరాలు రాయండి." : "Please enter both a subject and detailed message.");
      return;
    }
    setBusy(true);
    try {
      const r = await fetch("/api/support/tickets", {
        method: "POST",
        headers: authHeaders(),
        credentials: "same-origin",
        body: JSON.stringify({ tsap_id: myId, category: tktCategory, subject: tktSubject, message: tktMessage }),
      });
      const d = await readApiJson(r);
      if (r.ok && d.success) {
        setTktSubject("");
        setTktMessage("");
        setToast(te ? `✅ టికెట్ నమోదైంది: ${d.ticket?.ticket_id}` : `✅ Support ticket created: ${d.ticket?.ticket_id}`);
        await loadSection();
      } else {
        setToast(d.detail || "Ticket submission failed.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {toast && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-900">
          {toast}
        </div>
      )}

      {section === "ledger" && (
        <section className="mv-surface mv-surface__body space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-extrabold text-[#7A0C2E]">
                💳 {te ? "క్రెడిట్ లెడ్జర్ & చెల్లింపు రసీదులు" : "FIFO Credit Ledger & Payment Receipts"}
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                {te ? ledger?.policy_te || "ప్లాన్ గడువు ప్రకారం క్రెడిట్స్ FIFO క్రమంలో వాడబడతాయి." : ledger?.policy_en || "Paid plan credits follow 30/45/60/90-day FIFO validity; registration free credits never expire."}
              </p>
            </div>
            <div className="rounded-2xl bg-rose-50 border border-rose-200 px-4 py-2 text-center">
              <div className="text-xl font-black text-[#7A0C2E]">{ledger?.available_credits ?? "—"}</div>
              <div className="text-[10px] font-bold text-slate-600">{te ? "అందుబాటులో ఉన్న క్రెడిట్స్" : "Available Credits"}</div>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-extrabold uppercase tracking-wide text-slate-500">
              {te ? "యాక్టివ్ క్రెడిట్ బకెట్లు" : "Credit Buckets"}
            </h3>
            {(ledger?.buckets || []).length === 0 && (
              <p className="text-xs text-slate-500">{te ? "క్రెడిట్ బకెట్లు లేవు." : "No credit buckets recorded yet."}</p>
            )}
            <div className="grid gap-2 sm:grid-cols-2">
              {(ledger?.buckets || []).map((b: any) => (
                <div key={b.bucket_id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
                  <div className="flex items-center justify-between font-bold text-slate-900">
                    <span>{b.plan_code} ({b.kind === "legacy_or_free" ? (te ? "ఉచిత/పాతవి" : "Free / Legacy") : b.kind})</span>
                    <span className="text-[#7A0C2E]">{b.remaining}/{b.granted}</span>
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500">
                    {b.expires_at
                      ? (te ? `గడువు: ${String(b.expires_at).slice(0, 10)}` : `Expires: ${String(b.expires_at).slice(0, 10)}`)
                      : (te ? "గడువు ముగియదు" : "Non-expiring")}
                    {" • "}{b.status}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2 border-t border-slate-100 pt-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wide text-slate-500">
              {te ? "చెల్లింపు రసీదులు" : "Verified Payment Receipts"}
            </h3>
            {receipts.length === 0 ? (
              <p className="text-xs text-slate-500">{te ? "ఇంకా చెల్లింపు రసీదులు లేవు." : "No paid orders recorded on this account yet."}</p>
            ) : (
              <div className="space-y-2">
                {receipts.map((rc) => (
                  <div key={rc.receipt_no} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gold/30 bg-white p-3 text-xs">
                    <div>
                      <div className="font-mono font-bold text-[#7A0C2E]">{rc.receipt_no} • ₹{rc.amount_inr}</div>
                      <div className="text-[11px] text-slate-600">{rc.plan} • Ref: {rc.payment_ref} • {String(rc.paid_at).slice(0, 10)}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="rounded-xl border border-[#7A0C2E] px-3 py-1.5 font-bold text-[#7A0C2E] hover:bg-rose-50"
                    >
                      🖨️ {te ? "ప్రింట్" : "Print"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {section === "family" && (
        <section className="mv-surface mv-surface__body space-y-4">
          <div>
            <h2 className="text-base font-extrabold text-[#7A0C2E]">
              👨‍👩‍👧 {te ? "కుటుంబ సహకార కేంద్రం (Family Collaboration)" : "Family Collaboration Hub"}
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              {te
                ? "తల్లిదండ్రులు లేదా తోబుట్టువులు సంబంధాలను షార్ట్‌లిస్ట్ చేసి సూచించడానికి ఆహ్వానించండి. కాంటాక్ట్ అన్‌లాక్ మరియు ఖాతా తొలగింపు ఎప్పుడూ ప్రొఫైల్ యజమాని చేతిలోనే ఉంటాయి."
                : "Invite parents, siblings, or guardians to shortlist and suggest matches with transparent activity logs. Contact sharing and account deletion remain strictly owner-only."}
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <input
              value={collabName}
              onChange={(e) => setCollabName(e.target.value)}
              placeholder={te ? "కుటుంబ సభ్యుని పేరు" : "Family member name"}
              aria-label={te ? "కుటుంబ సభ్యుని పేరు" : "Family member name"}
              className="rounded-xl border border-slate-200 px-3 py-2 text-xs"
            />
            <select
              value={collabRelation}
              onChange={(e) => setCollabRelation(e.target.value)}
              aria-label={te ? "బంధుత్వం" : "Relationship"}
              className="rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white"
            >
              <option value="father">{te ? "తండ్రి (Father)" : "Father"}</option>
              <option value="mother">{te ? "తల్లి (Mother)" : "Mother"}</option>
              <option value="brother">{te ? "సోదరుడు (Brother)" : "Brother"}</option>
              <option value="sister">{te ? "సోదరి (Sister)" : "Sister"}</option>
              <option value="guardian">{te ? "సంరక్షకులు (Guardian)" : "Guardian"}</option>
            </select>
            <button
              type="button"
              disabled={busy || !collabName.trim()}
              onClick={() => void inviteFamily()}
              className="rounded-xl bg-[#7A0C2E] px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
            >
              + {te ? "ఆహ్వాన కోడ్ సృష్టించు" : "Generate Invite Code"}
            </button>
          </div>

          {(family?.pending_invites || []).length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs space-y-1">
              <div className="font-bold text-amber-900">{te ? "పెండింగ్ ఆహ్వాన కోడ్‌లు:" : "Pending Invite Codes:"}</div>
              {family.pending_invites.map((inv: any) => (
                <div key={inv.invite_code} className="flex flex-wrap items-center justify-between gap-2">
                  <span>{inv.collaborator_name} ({inv.relation})</span>
                  <code className="rounded bg-white px-2 py-0.5 font-mono font-bold text-[#7A0C2E]">{inv.invite_code}</code>
                </div>
              ))}
            </div>
          )}

          {(family?.collaborators || []).length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-extrabold uppercase text-slate-500">{te ? "కుటుంబ సభ్యులు" : "Collaborators"}</h3>
              {family.collaborators.map((c: any) => (
                <div key={c.collaborator_id} className="flex items-center justify-between rounded-xl border border-slate-200 p-3 text-xs">
                  <div>
                    <span className="font-bold text-slate-900">{c.name}</span> ({c.relation}) • <span className="font-semibold">{c.status}</span>
                  </div>
                  {c.status === "active" && (
                    <button
                      type="button"
                      onClick={() => void revokeFamily(c.collaborator_id)}
                      className="text-rose-700 font-bold underline"
                    >
                      {te ? "రద్దు చేయి" : "Revoke"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="border-t border-slate-100 pt-3 space-y-2">
            <h3 className="text-xs font-extrabold uppercase text-slate-500">{te ? "కుటుంబ చర్చ కోసం ప్రొఫైల్ నోట్ జతచేయండి" : "Save a Profile for Family Review"}</h3>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                value={suggestId}
                onChange={(e) => setSuggestId(e.target.value.toUpperCase())}
                placeholder="TSAP ID (e.g. RED001)"
                aria-label="Suggested Profile ID"
                className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-mono sm:w-44"
              />
              <input
                value={suggestNote}
                onChange={(e) => setSuggestNote(e.target.value)}
                placeholder={te ? "కుటుంబ గమనిక (ఉదా: మంచి విద్యా నేపథ్యం)…" : "Family note (e.g. Good education & same district)…"}
                aria-label="Family note"
                className="rounded-xl border border-slate-200 px-3 py-2 text-xs flex-1"
              />
              <button
                type="button"
                disabled={busy || !suggestId.trim()}
                onClick={() => void saveFamilySuggestion()}
                className="rounded-xl border border-[#7A0C2E] px-4 py-2 text-xs font-bold text-[#7A0C2E] disabled:opacity-50"
              >
                {te ? "జతచేయి" : "Save Note"}
              </button>
            </div>
            {(family?.suggestions || []).map((s: any) => (
              <div key={s.id} className="rounded-xl bg-slate-50 px-3 py-2 text-xs flex flex-wrap justify-between gap-2">
                <span><b>{s.candidate_tsap_id}</b> — {s.note || "—"}</span>
                <span className="text-slate-500">{s.suggested_by}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {section === "privacy" && (
        <section className="mv-surface mv-surface__body space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-extrabold text-[#7A0C2E]">
                🔒 {te ? "ప్రైవసీ సెంటర్ & DPDP డేటా ఎక్స్‌పోర్ట్" : "Privacy Center, Photo Permissions & DPDP Data Export"}
              </h2>
              <p className="text-xs text-slate-600 mt-1">
                {te
                  ? "మీ ప్రైవేట్ ఫోటోలను ఎవరు చూడవచ్చో నియంత్రించండి మరియు మీ ఖాతా డేటాను ఒకే క్లిక్‌తో JSON ఫైల్‌గా డౌన్‌లోడ్ చేసుకోండి."
                  : "Control who can view your private photos with expiring signed grants, and download a portable JSON copy of your own account records."}
              </p>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => void downloadDataExport()}
              className="rounded-2xl bg-[#7A0C2E] px-4 py-2.5 text-xs font-bold text-white shadow-sm disabled:opacity-50"
            >
              📥 {te ? "నా ఖాతా డేటా డౌన్‌లోడ్ (JSON)" : "Download My Data (JSON)"}
            </button>
          </div>

          <div className="space-y-2 border-t border-slate-100 pt-3">
            <h3 className="text-xs font-extrabold uppercase text-slate-500">
              {te ? "ప్రైవేట్ ఫోటో యాక్సెస్ అభ్యర్థనలు" : "Incoming Private Photo Access Requests"}
            </h3>
            {(photoAccess?.incoming || []).length === 0 ? (
              <p className="text-xs text-slate-500">
                {te ? "ప్రస్తుతం ఫోటో యాక్సెస్ అభ్యర్థనలు లేవు." : "No incoming private photo access requests right now."}
              </p>
            ) : (
              <div className="space-y-2">
                {photoAccess.incoming.map((g: any) => (
                  <div key={g.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 p-3 text-xs">
                    <div>
                      <span className="font-mono font-bold text-[#7A0C2E]">{g.viewer_id}</span> • <span>{g.status}</span>
                      {g.note ? <span className="text-slate-600"> — {g.note}</span> : null}
                    </div>
                    <div className="flex gap-1.5">
                      {g.status === "pending" && (
                        <>
                          <button type="button" onClick={() => void respondPhotoGrant(g.id, "approved")} className="rounded-lg bg-emerald-700 px-3 py-1 font-bold text-white">
                            {te ? "ఆమోదించు (7 రోజులు)" : "Approve (7d)"}
                          </button>
                          <button type="button" onClick={() => void respondPhotoGrant(g.id, "declined")} className="rounded-lg border border-slate-300 px-3 py-1 font-bold text-slate-700">
                            {te ? "తిరస్కరించు" : "Decline"}
                          </button>
                        </>
                      )}
                      {g.status === "approved" && (
                        <button type="button" onClick={() => void respondPhotoGrant(g.id, "revoked")} className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-1 font-bold text-rose-800">
                          {te ? "వెంటనే రద్దు చేయి" : "Revoke Now"}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {section === "support" && (
        <section className="mv-surface mv-surface__body space-y-4">
          <div>
            <h2 className="text-base font-extrabold text-[#7A0C2E]">
              🎫 {te ? "సభ్యుల సహాయ కేంద్రం (Support Tickets)" : "Member Support & Grievance Desk"}
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              {te
                ? "చెల్లింపులు, ధృవీకరణ, ప్రైవసీ లేదా సాంకేతిక సమస్యలపై టికెట్ నమోదు చేయండి."
                : "Raise a tracked support request for billing, verification, privacy/DPDP, or technical assistance."}
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <select
              value={tktCategory}
              onChange={(e) => setTktCategory(e.target.value)}
              aria-label={te ? "సమస్య రకం" : "Support category"}
              className="rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white"
            >
              <option value="general">{te ? "సాధారణ సహాయం" : "General Help"}</option>
              <option value="billing">{te ? "చెల్లింపులు / క్రెడిట్స్" : "Billing & Credits"}</option>
              <option value="verification">{te ? "ప్రొఫైల్ ధృవీకరణ" : "Profile Verification"}</option>
              <option value="privacy_dpdp">{te ? "గోప్యత / DPDP అభ్యర్థన" : "Privacy / DPDP Request"}</option>
              <option value="technical">{te ? "సాంకేతిక సమస్య" : "Technical Issue"}</option>
            </select>
            <input
              value={tktSubject}
              onChange={(e) => setTktSubject(e.target.value)}
              placeholder={te ? "విషయం (Subject)…" : "Short subject…"}
              aria-label={te ? "టికెట్ విషయం" : "Ticket subject"}
              className="rounded-xl border border-slate-200 px-3 py-2 text-xs sm:col-span-2"
            />
          </div>
          <textarea
            value={tktMessage}
            onChange={(e) => setTktMessage(e.target.value)}
            rows={3}
            placeholder={te ? "మీ సమస్యను వివరంగా రాయండి…" : "Describe how our team can help…"}
            aria-label={te ? "టికెట్ వివరాలు" : "Ticket details"}
            className="w-full rounded-xl border border-slate-200 p-3 text-xs"
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => void submitTicket()}
            className="rounded-xl bg-[#7A0C2E] px-5 py-2.5 text-xs font-bold text-white disabled:opacity-50"
          >
            {te ? "టికెట్ పంపండి" : "Submit Support Ticket"}
          </button>

          {tickets.length > 0 && (
            <div className="space-y-2 border-t border-slate-100 pt-3">
              {tickets.map((t) => (
                <div key={t.ticket_id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs space-y-1">
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-[#7A0C2E]">{t.ticket_id} — {t.subject}</span>
                    <span className="rounded-full bg-white border px-2 py-0.5 text-[10px] uppercase">{t.status}</span>
                  </div>
                  {(t.messages || []).map((m: any, idx: number) => (
                    <div key={idx} className="text-[11px] text-slate-700">
                      <b>{m.sender === "staff" ? "Support" : "You"}:</b> {m.text}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
