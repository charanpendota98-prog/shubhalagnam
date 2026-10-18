"use client";
/**
 * 💳 WAVE 14 — ADMIN PAYMENTS CONSOLE
 * Safe-pay orders (Razorpay verify auto / manual-UPI UTR confirm) + collection stats.
 * ADMIN ONLY.
 */
import { useCallback, useEffect, useState } from "react";
import { apiDisplayMessage, authHeaders, readApiJson } from "@/lib/api";
import { useLang } from "@/lib/lang";

type Row = Record<string, any>;

export default function PayConsole() {
  const { lang } = useLang();
  const te = lang === "te";
  const displayDynamicText = (value: unknown, fallback = "Not available in English") => te
    ? String(value ?? "")
    : apiDisplayMessage({ message_en: value }, false, fallback);
  const [items, setItems] = useState<Row[]>([]);
  const [stats, setStats] = useState<Row | null>(null);
  const [status, setStatus] = useState("");
  const [utr, setUtr] = useState<Record<string, string>>({});
  const [flash, setFlash] = useState("");
  const [rf, setRf] = useState<Record<string, string>>({});
  const [audit, setAudit] = useState<any[]>([]);
  const [showAudit, setShowAudit] = useState(false);
  const [clawId, setClawId] = useState("");
  const [clawAmt, setClawAmt] = useState("");

  const load = useCallback(async () => {
    try {
      const d = await fetch(`/api/admin/payments${status ? `?status=${status}` : ""}`,
      { headers: authHeaders(true) }).then((r) => readApiJson(r));
      if (d.success) { setItems(d.orders || []); setStats(d.stats || null); }
      else setFlash(apiDisplayMessage(d, te, te ? "చెల్లింపుల వివరాలు లోడ్ కాలేదు." : "Could not load payment details."));
    } catch { setFlash(te ? "నెట్‌వర్క్ సమస్య" : "Network problem. Please try again."); }
  }, [status, te]);
  useEffect(() => { void load(); }, [load]);

  const confirm = async (id: string) => {
    const u = (utr[id] ?? items.find((x: any) => x.id === id)?.claim_utr ?? "").trim();
    if (!/^\d{12}$/.test(u)) { setFlash(te ? "⚠️ UTR = 12 digits (bank statement తో match చెయ్యండి, audit కి mandatory)" : "⚠️ UTR = 12 digits (match with bank statement, mandatory for audit)"); return; }
    const r = await fetch(`/api/admin/payments/${id}/confirm`,
      { method: "POST", headers: { ...authHeaders(true), "Content-Type": "application/json" },
        body: JSON.stringify({ utr: u }) });
    const d = await readApiJson(r);
    setFlash(apiDisplayMessage(d, te, te ? "చెల్లింపు స్థితి నవీకరించబడింది." : "Payment status updated."));
    void load();
  };

  const refund = async (id: string, mode: string) => {
    const reason = (rf[id + ":r"] || "customer_request").trim() || "customer_request";
    const note = (rf[id + ":n"] || "").trim();
    if (mode !== "razorpay" && !note) { setFlash(te ? "Manual refund ki return-proof note mandatory (UTR/memo) - audit" : "Manual refund needs return-proof note (UTR/memo) - audit"); return; }
    if (!window.confirm(te ? `${id} REFUND? (money back + benefits reverse + commission clawback)` : `${id} REFUND? (money back + benefits reversed + commission clawback)`)) return;
    const r = await fetch(`/api/admin/payments/${id}/refund`,
      { method: "POST", headers: { ...authHeaders(true), "Content-Type": "application/json" },
        body: JSON.stringify({ reason, note }) });
    const d = await readApiJson(r);
    setFlash(apiDisplayMessage(d, te, te ? "Refund స్థితి నవీకరించబడింది." : "Refund status updated."));
    void load();
  };

  const loadAudit = async () => {
    try {
      const d = await fetch("/api/admin/audit?limit=30", { headers: authHeaders(true) }).then((r) => readApiJson(r));
      if (d.success) { setAudit(d.events || []); setShowAudit(true); }
      else setFlash(apiDisplayMessage(d, te, te ? "Audit లోడ్ కాలేదు." : "Could not load the audit log."));
    } catch { setFlash(te ? "నెట్‌వర్క్ సమస్య" : "Network problem. Please try again."); }
  };

  const clawback = async () => {
    if (!clawId.trim()) { setFlash(te ? "Profile ID ఇవ్వండి" : "Give Profile ID"); return; }
    const r = await fetch(`/api/admin/refund/${clawId.trim().toUpperCase()}?amount=${encodeURIComponent(clawAmt || "0")}&reason=admin_clawback`,
      { method: "POST", headers: authHeaders(true) });
    const d = await readApiJson(r);
    setFlash(apiDisplayMessage(d, te, te ? "కమిషన్ సర్దుబాటు అభ్యర్థన పూర్తయింది." : "Commission adjustment request completed."));
  };

  return (
    <div>
      <p className="telugu mt-2 text-xs text-gray-500">
        Razorpay payments <b>auto-verify → auto-fulfill</b>. Manual-UPI orders ki UTR verify chesi <b>confirm</b> —
        appude credits/assisted/ads add (double-credit impossible — idempotent).
      </p>
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2 my-3">
          {[["Orders", stats.orders], ["Paid", stats.paid], ["Pending", stats.pending], ["Refunded", stats.refunded],
            ["Collected ₹", stats.collected], ["Offers live", stats.offers_live]].map(([l, v]) => (
            <div key={l as string} className="rounded-xl bg-rose-50 border border-rose-100 p-2 text-center">
              <div className="text-lg font-extrabold text-[#7A0C2E]">{String(v ?? 0)}</div>
              <div className="text-[11px] text-gray-500">{l}</div>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2 my-2">
        {([["", te ? "అన్నీ" : "all"], ["created", "pending"], ["claimed", te ? "UTR వచ్చింది" : "UTR received"], ["paid", "paid"], ["refunded", "refunded"], ["expired", "expired"]] as string[][]).map(([v, l]) => (
          <button type="button" key={v} onClick={() => setStatus(v)}
            className={`px-3 py-1 rounded-full text-xs font-bold ${status === v ? "maroon-gradient text-white" : "bg-gray-100"}`}>{l}</button>
        ))}
        <button type="button" onClick={() => void load()} className="ml-auto text-xs underline">↻ refresh</button>
      </div>
      {flash && <div className="mb-2 rounded-xl bg-[#0F1F3C] text-white text-xs p-2">{flash}</div>}
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
        <button type="button" onClick={() => void loadAudit()} className="rounded-full bg-[#0F1F3C] px-3 py-1.5 font-bold text-white">\U0001F9FE Money audit</button>
        <input value={clawId} onChange={(e) => setClawId(e.target.value)} placeholder="TSAP-ID (clawback)"
          className="w-40 rounded-lg border px-2 py-1.5 font-mono" aria-label="Profile ID" />
        <input value={clawAmt} onChange={(e) => setClawAmt(e.target.value)} placeholder="\u20B9 amt"
          className="w-20 rounded-lg border px-2 py-1.5 font-mono" aria-label="amount" />
        <button type="button" onClick={() => void clawback()} className="rounded-full bg-amber-100 px-3 py-1.5 font-bold text-amber-800">\u21A9\uFE0F Commission clawback</button>
      </div>
      {showAudit && (
        <div className="mb-2 max-h-[160px] space-y-1 overflow-auto rounded-xl border p-2 text-[11px]">
          <div className="flex items-center"><b>\U0001F9FE Audit (latest 30)</b><button type="button" onClick={() => setShowAudit(false)} className="ml-auto underline">close</button></div>
          {audit.map((e: any, i: number) => (
            <div key={i} className="rounded-lg bg-gray-50 px-2 py-1 font-mono">{displayDynamicText(e.event, "Event label unavailable in English")} \u2022 {e.actor} \u2022 {displayDynamicText(JSON.stringify(e.data || {}), "Audit details unavailable in English").slice(0, 90)} \u2022 {String(e.at || "").slice(0, 19).replace("T", " ")}</div>
          ))}
          {!audit.length && <p className="text-gray-400">No records.</p>}
        </div>
      )}
      <div className="space-y-2 max-h-[420px] overflow-auto pr-1">
        {items.map((o) => (
          <div key={o.id} className="rounded-xl border p-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono font-bold">{o.id}</span>
              <span className={`px-2 py-0.5 rounded-full font-bold ${o.status === "paid" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
                {o.status}
              </span>
              <span className="font-bold">₹{o.final_amount}</span>
              {o.discount ? <span className="text-green-700">−₹{o.discount} ({o.offer_code})</span> : null}
              <span className="text-gray-500">{o.purpose}:{o.ref} • {o.tsap_id} • {o.mode}</span>
              <span className="ml-auto text-gray-400">{o.created_at}</span>
            </div>
            <div className="mt-1 text-gray-600">{o.label}</div>
            {o.claim_utr && o.status !== "paid" && (
              <div className="mt-1 text-[11px] text-blue-700 font-bold">{te ? "📩 User ఇచ్చిన UTR:" : "📩 User-given UTR:"} <span className="font-mono">{o.claim_utr}</span> · {o.claimed_at} — {te ? "statement తో match చేసి confirm చెయ్యండి" : "match with statement, then confirm"}</div>
            )}
            {o.status !== "paid" && o.status !== "expired" && (
              <div className="mt-2 flex gap-2">
                <input value={utr[o.id] ?? o.claim_utr ?? ""} onChange={(e) => setUtr({ ...utr, [o.id]: e.target.value })}
                  placeholder="UTR (12-digit)" className="flex-1 rounded-lg border px-3 py-1.5 text-xs font-mono" aria-label="UTR" />
                <button type="button" onClick={() => void confirm(o.id)}
                  className="rounded-lg bg-green-700 text-white px-4 py-1.5 text-xs font-bold">✅ Confirm + fulfill</button>
              </div>
            )}
            {o.status === "paid" && o.receipt && (
              <div className="mt-1 text-[11px] text-green-700">🧾 {o.receipt.payment_id || o.receipt.utr} • {o.paid_at}</div>
            )}
            {o.status === "paid" && (
              <div className="mt-2 flex flex-wrap gap-2">
                <input value={rf[o.id + ":r"] || ""} onChange={(e) => setRf({ ...rf, [o.id + ":r"]: e.target.value })}
                  placeholder="reason (customer_request)" className="min-w-[140px] flex-1 rounded-lg border px-2 py-1.5 text-xs" aria-label="refund reason" />
                <input value={rf[o.id + ":n"] || ""} onChange={(e) => setRf({ ...rf, [o.id + ":n"]: e.target.value })}
                  placeholder={o.mode === "razorpay" ? "note (optional)" : "return proof UTR (mandatory)"} className="min-w-[140px] flex-1 rounded-lg border px-2 py-1.5 text-xs" aria-label="refund note" />
                <button type="button" onClick={() => void refund(o.id, o.mode)}
                  className="rounded-lg bg-red-600 px-4 py-1.5 text-xs font-bold text-white">\u21A9\uFE0F Refund</button>
              </div>
            )}
            {o.status === "refunded" && (
              <div className="mt-1 text-[11px] text-red-700">\u21A9\uFE0F refunded {o.refund_id} \u2022 {o.refunded_at} \u2022 {(o.refund_reversal?.reversed || []).join(", ")}</div>
            )}
          </div>
        ))}
        {!items.length && <p className="text-xs text-gray-400">{te ? "Orders లేవు." : "No orders."}</p>}
      </div>
    </div>
  );
}
