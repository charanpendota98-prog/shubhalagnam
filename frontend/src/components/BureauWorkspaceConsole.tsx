"use client";

import { useState } from "react";
import { readApiJson } from "@/lib/api";
import { useLang } from "@/lib/lang";

export default function BureauWorkspaceConsole() {
  const { lang } = useLang();
  const te = lang === "te";
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");

  // Create tenant
  const [bizName, setBizName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [district, setDistrict] = useState("");
  const [phone, setPhone] = useState("");
  const [issuedCreds, setIssuedCreds] = useState<{ bureau_id: string; owner_key: string } | null>(null);

  // Connect to existing tenant
  const [bureauId, setBureauId] = useState("");
  const [bureauKey, setBureauKey] = useState("");
  const [ws, setWs] = useState<any>(null);

  // Seat & client inputs
  const [seatName, setSeatName] = useState("");
  const [seatRole, setSeatRole] = useState("coordinator");
  const [newSeatKey, setNewSeatKey] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientLabel, setClientLabel] = useState("");
  const [clientNotes, setClientNotes] = useState("");
  const [clientConsent, setClientConsent] = useState(false);

  const createTenant = async () => {
    setBusy(true);
    setToast("");
    try {
      const r = await fetch("/api/bureaus/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ business_name: bizName, owner_name: ownerName, district, contact_phone: phone }),
      });
      const d = await readApiJson(r);
      if (r.ok && d.success) {
        setIssuedCreds({ bureau_id: d.bureau_id, owner_key: d.owner_key });
        setBureauId(d.bureau_id);
        setBureauKey(d.owner_key);
        setToast(te ? `✅ బ్యూరో టెనెంట్ సిద్ధం: ${d.bureau_id}` : `✅ Isolated bureau workspace created: ${d.bureau_id}`);
      } else {
        setToast(d?.detail || "Could not create bureau workspace.");
      }
    } finally {
      setBusy(false);
    }
  };

  const openWorkspace = async (idOverride?: string, keyOverride?: string) => {
    const bid = (idOverride ?? bureauId).trim().toUpperCase();
    const bkey = (keyOverride ?? bureauKey).trim();
    if (!bid || !bkey) return;
    setBusy(true);
    setToast("");
    try {
      const r = await fetch(`/api/bureaus/${encodeURIComponent(bid)}/workspace`, {
        headers: { "X-Bureau-Key": bkey },
      });
      const d = await readApiJson(r);
      if (r.ok && d.success) {
        setWs(d);
      } else {
        setWs(null);
        setToast(d?.detail || "Invalid bureau ID or access key.");
      }
    } finally {
      setBusy(false);
    }
  };

  const addSeat = async () => {
    if (!ws || !seatName.trim()) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/bureaus/${encodeURIComponent(ws.bureau_id)}/seats`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Bureau-Key": bureauKey.trim() },
        body: JSON.stringify({ name: seatName, role: seatRole }),
      });
      const d = await readApiJson(r);
      if (r.ok && d.seat) {
        setSeatName("");
        setNewSeatKey(`${d.seat.seat_id}: ${d.seat.seat_key}`);
        await openWorkspace(ws.bureau_id, bureauKey);
      } else {
        setToast(d?.detail || "Could not add seat.");
      }
    } finally {
      setBusy(false);
    }
  };

  const revokeSeat = async (seatId: string) => {
    if (!ws) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/bureaus/${encodeURIComponent(ws.bureau_id)}/seats/${encodeURIComponent(seatId)}/revoke`, {
        method: "POST",
        headers: { "X-Bureau-Key": bureauKey.trim() },
      });
      if (r.ok) {
        await openWorkspace(ws.bureau_id, bureauKey);
      }
    } finally {
      setBusy(false);
    }
  };

  const recordClient = async () => {
    if (!ws || !clientId.trim()) return;
    setBusy(true);
    setToast("");
    try {
      const r = await fetch(`/api/bureaus/${encodeURIComponent(ws.bureau_id)}/clients`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Bureau-Key": bureauKey.trim() },
        body: JSON.stringify({
          client_tsap_id: clientId.trim().toUpperCase(),
          client_label: clientLabel,
          notes: clientNotes,
          consent_confirmed: clientConsent,
        }),
      });
      const d = await readApiJson(r);
      if (r.ok && d.success) {
        setClientId("");
        setClientLabel("");
        setClientNotes("");
        setClientConsent(false);
        await openWorkspace(ws.bureau_id, bureauKey);
      } else {
        setToast(d?.detail || "Could not record client.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mt-8 max-w-4xl mx-auto bg-white rounded-[1.5rem] border border-gold/30 p-6 space-y-5 card-shadow">
      <div>
        <h2 className="text-lg font-extrabold text-[#7A0C2E]">
          🏢 {te ? "టెనెంట్-ఐసోలేటెడ్ బ్యూరో సీట్ వర్క్‌స్పేస్ (Phase 2)" : "Tenant-Isolated Bureau Seat Workspace"}
        </h2>
        <p className="text-xs text-gray-600 mt-1">
          {te
            ? "ప్రతి బ్యూరోకు వేర్వేరు టెనెంట్ ID, రద్దు చేయగల కోఆర్డినేటర్ సీట్లు మరియు కుటుంబ అనుమతితో క్లయింట్ నోట్స్ ఉంటాయి. ఇది సభ్యుల కాంటాక్ట్ గోప్యతను దాటవేయదు."
            : "Each bureau receives an isolated tenant workspace, revocable operator seats, and consent-checked client notes without exposing private member contacts."}
        </p>
      </div>

      {toast && <div className="rounded-xl bg-amber-50 border border-amber-200 px-3.5 py-2 text-xs font-bold text-amber-950">{toast}</div>}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl bg-[#FAF7F2] p-4 space-y-2">
          <div className="text-xs font-extrabold text-[#7A0C2E]">
            1. {te ? "కొత్త బ్యూరో టెనెంట్ రిజిస్టర్" : "Create Isolated Bureau Tenant"}
          </div>
          <input value={bizName} onChange={(e) => setBizName(e.target.value)} placeholder={te ? "బ్యూరో పేరు" : "Bureau business name"} aria-label="Bureau business name" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs" />
          <div className="grid grid-cols-2 gap-2">
            <input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder={te ? "యజమాని పేరు" : "Owner name"} aria-label="Bureau owner name" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs" />
            <input value={district} onChange={(e) => setDistrict(e.target.value)} placeholder={te ? "జిల్లా" : "District"} aria-label="Bureau district" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs" />
          </div>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={te ? "10 అంకెల ఫోన్ నంబర్" : "10-digit contact phone"} aria-label="Bureau phone" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs" />
          <button type="button" disabled={busy} onClick={() => void createTenant()} className="rounded-xl bg-[#7A0C2E] px-4 py-2 text-xs font-bold text-white">
            {te ? "టెనెంట్ సృష్టించు" : "Create Bureau Workspace"}
          </button>
          {issuedCreds && (
            <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-2.5 text-[11px] break-all space-y-1">
              <div><b>Bureau ID:</b> {issuedCreds.bureau_id}</div>
              <div><b>Owner Key (save once):</b> <code>{issuedCreds.owner_key}</code></div>
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-[#FAF7F2] p-4 space-y-2">
          <div className="text-xs font-extrabold text-[#7A0C2E]">
            2. {te ? "బ్యూరో వర్క్‌స్పేస్ ఓపెన్ చేయండి" : "Open Existing Bureau Workspace"}
          </div>
          <input value={bureauId} onChange={(e) => setBureauId(e.target.value.toUpperCase())} placeholder="BUR-XXXXXX" aria-label="Bureau ID" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-mono" />
          <input type="password" value={bureauKey} onChange={(e) => setBureauKey(e.target.value)} placeholder={te ? "Owner లేదా Seat Key" : "Owner Key or Seat Key"} aria-label="Bureau access key" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-mono" />
          <button type="button" disabled={busy} onClick={() => void openWorkspace()} className="rounded-xl border border-[#7A0C2E] px-4 py-2 text-xs font-bold text-[#7A0C2E]">
            {te ? "వర్క్‌స్పేస్ తెరవండి" : "Connect Workspace"}
          </button>
        </div>
      </div>

      {ws && (
        <div className="border-t border-slate-200 pt-4 space-y-4 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="font-extrabold text-[#7A0C2E] text-sm">{ws.business_name}</span> ({ws.bureau_id}) • Role: <b className="uppercase">{ws.viewer_role}</b>
            </div>
            <span className="text-[11px] text-gray-500">{ws.seats?.length || 0} seats • {ws.clients?.length || 0} clients</span>
          </div>

          {ws.viewer_role === "owner" && (
            <div className="rounded-2xl border border-slate-200 p-3.5 space-y-2">
              <div className="font-bold text-[#7A0C2E]">{te ? "ఆపరేటర్ సీట్లు (Coordinator / Viewer)" : "Manage Operator Seats"}</div>
              <div className="flex flex-col sm:flex-row gap-2">
                <input value={seatName} onChange={(e) => setSeatName(e.target.value)} placeholder="Staff name" aria-label="Seat operator name" className="rounded-xl border border-slate-200 px-3 py-1.5 flex-1" />
                <select value={seatRole} onChange={(e) => setSeatRole(e.target.value)} aria-label="Seat role" className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-bold">
                  <option value="coordinator">Coordinator (can record clients)</option>
                  <option value="viewer">Viewer (read-only)</option>
                </select>
                <button type="button" onClick={() => void addSeat()} className="rounded-xl bg-[#7A0C2E] px-3.5 py-1.5 font-bold text-white">+ Add Seat</button>
              </div>
              {newSeatKey && <div className="rounded-lg bg-emerald-50 p-2 font-mono break-all">Issued Seat Key: {newSeatKey}</div>}
              {(ws.seats || []).map((s: any) => (
                <div key={s.seat_id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-1.5">
                  <span><b>{s.name}</b> ({s.seat_id}) • {s.role} • {s.status}</span>
                  {s.status === "active" && (
                    <button type="button" onClick={() => void revokeSeat(s.seat_id)} className="text-rose-700 font-bold underline">Revoke</button>
                  )}
                </div>
              ))}
            </div>
          )}

          {(ws.viewer_role === "owner" || ws.viewer_role === "coordinator") && (
            <div className="rounded-2xl border border-slate-200 p-3.5 space-y-2">
              <div className="font-bold text-[#7A0C2E]">{te ? "కుటుంబ అనుమతితో క్లయింట్ ప్రొఫైల్ నోట్" : "Record Consented Client Profile"}</div>
              <div className="grid gap-2 sm:grid-cols-3">
                <input value={clientId} onChange={(e) => setClientId(e.target.value.toUpperCase())} placeholder="Member TSAP ID" aria-label="Client TSAP ID" className="rounded-xl border border-slate-200 px-3 py-1.5 font-mono" />
                <input value={clientLabel} onChange={(e) => setClientLabel(e.target.value)} placeholder="Family reference label" aria-label="Client family label" className="rounded-xl border border-slate-200 px-3 py-1.5" />
                <input value={clientNotes} onChange={(e) => setClientNotes(e.target.value)} placeholder="Requirements note" aria-label="Client requirements note" className="rounded-xl border border-slate-200 px-3 py-1.5" />
              </div>
              <label className="flex items-center gap-2 text-[11px] text-slate-700">
                <input type="checkbox" checked={clientConsent} onChange={(e) => setClientConsent(e.target.checked)} />
                <span>{te ? "ఈ సభ్యుని / కుటుంబ అనుమతి తీసుకున్నామని నిర్ధారిస్తున్నాను." : "I confirm explicit permission from this member/family to track their profile ID in our bureau roster."}</span>
              </label>
              <button type="button" onClick={() => void recordClient()} className="rounded-xl bg-[#7A0C2E] px-4 py-1.5 font-bold text-white">Save Client Note</button>
            </div>
          )}

          {(ws.clients || []).length > 0 && (
            <div className="space-y-1.5">
              <div className="font-bold text-slate-700">Tenant Client Roster</div>
              {ws.clients.map((c: any) => (
                <div key={c.entry_id} className="rounded-xl bg-slate-50 px-3 py-2 flex flex-wrap justify-between gap-2">
                  <span><b>{c.client_tsap_id}</b> {c.client_label ? `(${c.client_label})` : ""} — {c.notes}</span>
                  <span className="text-gray-400">{c.added_by}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
