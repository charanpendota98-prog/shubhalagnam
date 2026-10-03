"use client";
/**
 * 🎯 MATCH & SEND CONSOLE — ₹500 assisted service (WAVE 12)
 * =========================================================
 * Flow:
 *   1. Buyer Profile ID → perfect matches auto-load (score sort)
 *   2. Neat filters → enni match ayithe anni chupisthundi
 *   3. ☑️ Select → order (₹500 + UTR paid) → 📩 Telegram / 💬 WhatsApp 1-click send
 *   4. 📋 Copy-list (NAME -- NUMBER) — manual paste fallback
 * STRICT: pampina profiles mathrame buyer ki unlock (backend entitlement).
 */
import { useMemo, useState } from "react";
import { authHeaders } from "@/lib/api";
import { useLang } from "@/lib/lang";

type Row = Record<string, any>;

const adminToken = () => {
  try { return localStorage.getItem("tsap_admin_token") || ""; } catch { return ""; }
};
const withToken = (url: string) => {
  const tk = adminToken();
  return tk ? `${url}${url.includes("?") ? "&" : "?"}token=${encodeURIComponent(tk)}` : url;
};

export default function MatchSend() {
  const { lang } = useLang();
  const te = lang === "te";
  const [buyerId, setBuyerId] = useState("");
  const [data, setData] = useState<Row | null>(null);
  const [loading, setLoading] = useState(false);
  const [flash, setFlash] = useState("");
  // filters
  const [fAgeMin, setFAgeMin] = useState(18);
  const [fAgeMax, setFAgeMax] = useState(60);
  const [fCaste, setFCaste] = useState("");
  const [fDistrict, setFDistrict] = useState("");
  const [fMarital, setFMarital] = useState("");
  const [fVerified, setFVerified] = useState(false);
  const [fPhoto, setFPhoto] = useState(false);
  const [fQ, setFQ] = useState("");
  // 🌊 W19 server-side strict filters (backend pre-filters before topmatch)
  const [fReligion, setFReligion] = useState("");
  const [fState, setFState] = useState("");
  const [fJob, setFJob] = useState("");
  const [fSalary, setFSalary] = useState("");
  const [fNri, setFNri] = useState(""); // "" | "only" | "exclude"
  // selection + order + deliver
  const [sel, setSel] = useState<Record<string, boolean>>({});
  const [orders, setOrders] = useState<Row[]>([]);
  const [orderId, setOrderId] = useState("");
  const [utr, setUtr] = useState("");
  const [via, setVia] = useState("both");
  const [deliverRes, setDeliverRes] = useState<Row | null>(null);
  const [copyList, setCopyList] = useState("");
  const [copied, setCopied] = useState(false);
  const [tgChat, setTgChat] = useState("");

  const load = async () => {
    const id = buyerId.trim().toUpperCase();
    if (!id) { setFlash(te ? "⚠️ Buyer Profile ID ఇవ్వండి" : "⚠️ Enter buyer Profile ID"); return; }
    setLoading(true); setFlash(""); setData(null); setSel({}); setDeliverRes(null); setCopyList("");
    const qs = new URLSearchParams();
    qs.set("age_min", String(fAgeMin)); qs.set("age_max", String(fAgeMax));
    if (fCaste) qs.set("castes", fCaste);
    if (fDistrict) qs.set("districts", fDistrict);
    if (fMarital) qs.set("marital", fMarital);
    if (fReligion) qs.set("religion", fReligion);
    if (fState) qs.set("state", fState);
    if (fJob) qs.set("jobs", fJob);
    if (fSalary) qs.set("salary_min", fSalary);
    if (fPhoto) qs.set("photo_only", "true");
    if (fVerified) qs.set("verified_only", "true");
    if (fNri === "only") qs.set("nri_only", "true");
    if (fNri === "exclude") qs.set("nri_exclude", "true");
    try {
      const r = await fetch(withToken(`/api/admin/match-send/${encodeURIComponent(id)}?limit=100&min_score=0&${qs.toString()}`),
        { headers: authHeaders(true) });
      const d = await r.json();
      if (!r.ok) { setFlash(d.detail || (te ? "Load fail అయ్యింది" : "Load failed")); return; }
      setData(d);
      setFlash(te ? `✅ ${d.count} perfect matches load అయ్యాయి` : `✅ ${d.count} perfect matches loaded`);
      void loadOrders();
    } catch { setFlash(te ? "⚠️ API error — backend check చెయ్యండి" : "⚠️ API error — check backend"); }
    finally { setLoading(false); }
  };

  const loadOrders = async () => {
    try {
      const r = await fetch(withToken("/api/admin/assist-orders"), { headers: authHeaders(true) });
      const d = await r.json();
      if (d.success) setOrders(d.orders || []);
    } catch { /* ignore */ }
  };

  const results: Row[] = data?.results || [];
  const castes = useMemo(() => Array.from(new Set(results.map((x) => String(x.caste || "")))).filter(Boolean).sort(), [results]);
  const districts = useMemo(() => Array.from(new Set(results.map((x) => String(x.district || "")))).filter(Boolean).sort(), [results]);

  const filtered = results.filter((x) => {
    const age = Number(x.age || 0);
    if (age && (age < fAgeMin || age > fAgeMax)) return false;
    if (fCaste && x.caste !== fCaste) return false;
    if (fDistrict && x.district !== fDistrict) return false;
    if (fMarital && (x.marital_status || "") !== fMarital) return false;
    if (fVerified && !(x.phone_verified || x.verified)) return false;
    if (fPhoto && !x.has_photo) return false;
    if (fQ) {
      const q = fQ.toLowerCase();
      const hay = `${x.tsap_id} ${x.full_name} ${x.caste} ${x.district} ${x.job} ${x.education}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const selIds = Object.keys(sel).filter((k) => sel[k]);
  const toggle = (id: string) => setSel((s) => ({ ...s, [id]: !s[id] }));
  const selectAll = (on: boolean) => {
    const o: Record<string, boolean> = {};
    filtered.forEach((x) => { o[x.tsap_id] = on; });
    setSel(o);
  };

  const createOrder = async () => {
    const r = await fetch(withToken("/api/admin/assist-orders"),
      { method: "POST", headers: { ...authHeaders(true), "Content-Type": "application/json" },
        body: JSON.stringify({ buyer_id: data?.buyer?.tsap_id, amount: 500, note: "match-send console" }) });
    const d = await r.json();
    if (d.success) { setOrderId(d.order.id); setFlash(te ? `✅ Order ${d.order.id} — ₹500 UTR వచ్చాక paid చెయ్యండి` : `✅ Order ${d.order.id} — mark paid after ₹500 UTR arrives`); void loadOrders(); }
    else setFlash(d.detail || d.message_telugu || "Order fail");
  };

  const markPaid = async () => {
    if (!orderId) { setFlash(te ? "⚠️ Order select/create చెయ్యండి" : "⚠️ Select/create an order"); return; }
    if (!utr.trim()) { setFlash(te ? "⚠️ UTR ఇవ్వకుండా paid చెయ్యకూడదు" : "⚠️ Cannot mark paid without UTR"); return; }
    const r = await fetch(withToken(`/api/admin/assist-orders/${orderId}/paid`),
      { method: "POST", headers: { ...authHeaders(true), "Content-Type": "application/json" },
        body: JSON.stringify({ utr: utr.trim() }) });
    const d = await r.json();
    setFlash(d.message_telugu || d.detail || "done");
    void loadOrders();
  };

  const deliver = async () => {
    if (!selIds.length) { setFlash(te ? "⚠️ Profiles select చెయ్యండి (☑️)" : "⚠️ Select profiles (☑️)"); return; }
    setFlash("⏳ Delivering…");
    const r = await fetch(withToken("/api/admin/match-send/deliver"),
      { method: "POST", headers: { ...authHeaders(true), "Content-Type": "application/json" },
        body: JSON.stringify({ buyer_id: data?.buyer?.tsap_id, profile_ids: selIds, via, order_id: orderId }) });
    const d = await r.json();
    if (d.success) {
      setDeliverRes(d);
      setCopyList(d.copy_list || "");
      setFlash(te ? `✅ ${d.delivered} profiles → ${d.buyer_id} (STRICT unlock: ఇవి మాత్రమే)` : `✅ ${d.delivered} profiles → ${d.buyer_id} (STRICT unlock: only these)`);
      void loadOrders();
    } else setFlash(d.detail || "Deliver fail");
  };

  const refreshCopy = async () => {
    if (!selIds.length) { setFlash(te ? "⚠️ Profiles select చెయ్యండి" : "⚠️ Select profiles"); return; }
    const r = await fetch(withToken(`/api/admin/match-send/copy-list?buyer=${data?.buyer?.tsap_id}&ids=${selIds.join(",")}&order_id=${orderId}`),
      { headers: authHeaders(true) });
    const d = await r.json();
    if (d.success) { setCopyList(d.text); setFlash(te ? `📋 Copy-list ready (${d.count} profiles)` : `📋 Copy-list ready (${d.count} profiles)`); }
    else setFlash(d.detail || "Copy-list fail");
  };

  const linkTg = async () => {
    if (!tgChat.trim()) { setFlash(te ? "⚠️ Buyer Telegram chat ID (/myid) ఇవ్వండి" : "⚠️ Enter buyer Telegram chat ID (/myid)"); return; }
    const r = await fetch(withToken("/api/admin/link-telegram"),
      { method: "POST", headers: { ...authHeaders(true), "Content-Type": "application/json" },
        body: JSON.stringify({ buyer_id: data?.buyer?.tsap_id, chat_id: tgChat.trim() }) });
    const d = await r.json();
    setFlash(d.message_telugu || d.detail || "done");
    if (d.success) setData({ ...data, buyer: { ...data?.buyer, telegram_chat_id: tgChat.trim(), telegram_linked: true } });
  };

  const copyNow = () => {
    navigator.clipboard?.writeText(copyList);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const buyerOrders = orders.filter((o) => o.buyer_id === data?.buyer?.tsap_id);

  return (
    <div>
      <p className="telugu mt-2 text-xs text-gray-500">
        Buyer ID → perfect matches → filters → ☑️ select → ₹500 order (UTR) → 📩 Telegram / 💬 WhatsApp send.
{te ? <>పంపిన profiles <b>మాత్రమే</b> buyer కి unlock — Telegram లో <b>/mylist</b> లో ఇవి మాత్రమే కనిపిస్తాయి.</> : <>Only sent profiles unlock for the buyer — only these show in <b>/mylist</b> on Telegram.</>}
      </p>

      {/* buyer load */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input value={buyerId} onChange={(e) => setBuyerId(e.target.value.toUpperCase())}
          onKeyDown={(e) => { if (e.key === "Enter") void load(); }}
          placeholder="Buyer Profile ID (ex: KAM001)"
          aria-label="Buyer Profile ID"
          className="min-w-[260px] flex-1 rounded-xl border border-[#7A0C2E]/30 px-3 py-2 font-mono text-sm" />
        <button onClick={() => void load()} disabled={loading}
          className="rounded-xl bg-[#7A0C2E] px-5 py-2 text-sm font-bold text-white disabled:opacity-60">
          {loading ? "⏳ Loading…" : "🎯 Perfect matches load"}
        </button>
      </div>
      {flash ? <div className="mt-2 rounded-xl bg-[#0F1F3C] p-3 text-xs text-white">{flash}</div> : null}

      {data?.buyer ? (
        <>
          {/* buyer card */}
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border p-4 text-xs">
              <div className="font-bold text-[#7A0C2E]">🧑 Buyer</div>
              <div className="mt-1 font-mono font-bold">{data.buyer.tsap_id}</div>
              <div>{data.buyer.name} · 📞 {data.buyer.phone || "—"} · 💰 {data.buyer.credits} credits</div>
              <div className="mt-1">
                {data.buyer.telegram_linked
                  ? <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] text-green-700">📩 Telegram linked ({data.buyer.telegram_chat_id})</span>
                  : <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] text-amber-800">{te ? "⚠️ Telegram link లేదు — కింద link చెయ్యండి" : "⚠️ Telegram not linked — link below"}</span>}
              </div>
              <div className="mt-2 flex gap-2">
                <input value={tgChat} onChange={(e) => setTgChat(e.target.value)} placeholder="Buyer /myid (chat id)"
                  aria-label="Buyer Telegram chat id" className="w-40 rounded-lg border px-2 py-1 text-xs" />
                <button onClick={() => void linkTg()} className="rounded-lg bg-[#0F1F3C] px-3 py-1 text-xs font-bold text-white">🔗 Link</button>
              </div>
            </div>
            {/* order box */}
            <div className="rounded-2xl border p-4 text-xs">
              <div className="font-bold text-[#7A0C2E]">💳 ₹500 Assisted order</div>
              <div className="mt-2 flex flex-wrap gap-2">
                <button onClick={() => void createOrder()} className="rounded-lg bg-[#7A0C2E] px-3 py-1.5 font-bold text-white">➕ New ₹500 order</button>
                <select value={orderId} onChange={(e) => setOrderId(e.target.value)}
                  aria-label="Order select" className="rounded-lg border px-2 py-1.5">
                  <option value="">— order (optional) —</option>
                  {buyerOrders.map((o) => (
                    <option key={o.id} value={o.id}>{o.id} · ₹{o.amount} · {o.status}{o.utr ? ` · ${o.utr}` : ""}</option>
                  ))}
                </select>
              </div>
              <div className="mt-2 flex gap-2">
                <input value={utr} onChange={(e) => setUtr(e.target.value)} placeholder="UTR / ref no"
                  aria-label="UTR" className="w-44 rounded-lg border px-2 py-1.5" />
                <button onClick={() => void markPaid()} className="rounded-lg bg-green-600 px-3 py-1.5 font-bold text-white">✅ Paid</button>
              </div>
              <p className="mt-1 text-[11px] text-gray-500">{te ? "Order లేకుండా deliver చేస్తే → admin-gift grant (audit లో record)." : "Delivering without order → admin-gift grant (recorded in audit)."}</p>
            </div>
          </div>

          {/* filters */}
          <div className="mt-3 rounded-2xl bg-gray-50 p-3">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-bold text-[#7A0C2E]">🔎 Filters</span>
              <label>Age <input type="number" value={fAgeMin} onChange={(e) => setFAgeMin(Number(e.target.value))} aria-label="Min age" className="w-14 rounded-lg border px-1 py-1" /></label>
              <span>–</span>
              <label><input type="number" value={fAgeMax} onChange={(e) => setFAgeMax(Number(e.target.value))} aria-label="Max age" className="w-14 rounded-lg border px-1 py-1" /></label>
              <select value={fCaste} onChange={(e) => setFCaste(e.target.value)} aria-label="Caste" className="rounded-lg border px-2 py-1">
                <option value="">{te ? "Caste: అన్నీ" : "Caste: all"}</option>{castes.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={fDistrict} onChange={(e) => setFDistrict(e.target.value)} aria-label="District" className="rounded-lg border px-2 py-1">
                <option value="">{te ? "District: అన్నీ" : "District: all"}</option>{districts.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={fMarital} onChange={(e) => setFMarital(e.target.value)} aria-label="Marital" className="rounded-lg border px-2 py-1">
                <option value="">{te ? "Marital: అన్నీ" : "Marital: all"}</option><option>Pelli Kaledu</option><option>Vivaha Bandham</option><option>Vithanthuvu</option><option>Vidower</option>
              </select>
              <label className="flex items-center gap-1"><input type="checkbox" checked={fVerified} onChange={(e) => setFVerified(e.target.checked)} /> ✅ verified</label>
              <label className="flex items-center gap-1"><input type="checkbox" checked={fPhoto} onChange={(e) => setFPhoto(e.target.checked)} /> 📸 photo</label>
              <select value={fReligion} onChange={(e) => setFReligion(e.target.value)} aria-label="Religion" className="rounded-lg border px-2 py-1">
                <option value="Hindu">{te ? "🕉️ హిందూ" : "🕉️ Hindu"}</option>
              </select>
              <select value={fState} onChange={(e) => setFState(e.target.value)} aria-label="State" className="rounded-lg border px-2 py-1">
                <option value="">{te ? "State: అన్నీ" : "State: all"}</option><option>TS</option><option>AP</option>
              </select>
              <input value={fJob} onChange={(e) => setFJob(e.target.value)} placeholder="Job (Software/Doctor…)"
                aria-label="Job" className="w-32 rounded-lg border px-2 py-1" />
              <input value={fSalary} onChange={(e) => setFSalary(e.target.value.replace(/\D/g, ""))} placeholder="Min salary ₹"
                aria-label="Min salary" inputMode="numeric" className="w-24 rounded-lg border px-2 py-1" />
              <select value={fNri} onChange={(e) => setFNri(e.target.value)} aria-label="NRI" className="rounded-lg border px-2 py-1">
                <option value="">{te ? "✈️ NRI: అన్నీ" : "✈️ NRI: all"}</option><option value="only">✈️ NRI ONLY</option><option value="exclude">{te ? "NRI వద్దు" : "No NRI"}</option>
              </select>
              <button onClick={() => void load()} disabled={loading}
                className="rounded-lg bg-[#7A0C2E] px-3 py-1 font-bold text-white disabled:opacity-60">
                🔃 Filters apply
              </button>
              <input value={fQ} onChange={(e) => setFQ(e.target.value)} placeholder="Search: name/job/ID…"
                aria-label="Search" className="min-w-[140px] flex-1 rounded-lg border px-2 py-1" />
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs">
              <b className="text-[#7A0C2E]">{filtered.length}/{results.length} profiles</b>{data.filters_skipped ? <span className="text-gray-500"> · 🔍 {data.filters_skipped} server-filter skip</span> : null}
              <button onClick={() => selectAll(true)} className="rounded-full bg-gray-200 px-3 py-1">{te ? "☑️ అన్నీ select" : "☑️ select all"}</button>
              <button onClick={() => selectAll(false)} className="rounded-full bg-gray-200 px-3 py-1">⬜ clear</button>
              <b>Selected: {selIds.length}</b>
            </div>
          </div>

          {/* results */}
          <div className="mt-3 max-h-[420px] overflow-auto rounded-2xl border">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-[#FFF8E7]">
                <tr className="text-left text-gray-500">
                  <th className="p-2">☑️</th><th>Score</th><th>Profile</th><th>Details</th><th>Number</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={5} className="p-4 text-center text-gray-500">{te ? "Filters కి match అయ్యే profiles లేవు 🙂" : "No profiles match the filters 🙂"}</td></tr>
                ) : filtered.map((x) => (
                  <tr key={x.tsap_id} className={`border-t ${sel[x.tsap_id] ? "bg-emerald-50" : ""}`}>
                    <td className="p-2 text-center">
                      <input type="checkbox" checked={!!sel[x.tsap_id]} onChange={() => toggle(x.tsap_id)}
                        aria-label={`Select ${x.tsap_id}`} className="h-4 w-4 accent-[#7A0C2E]" />
                    </td>
                    <td className="p-2 font-extrabold text-[#7A0C2E]">{x.score ?? "—"}</td>
                    <td className="p-2">
                      <div className="font-bold">{x.full_name}</div>
                      <div className="font-mono text-[10px] text-gray-500">{x.tsap_id}</div>
                      <div className="text-[10px]">{x.verification || ""}{x.boosted ? " ⚡" : ""}</div>
                    </td>
                    <td className="p-2">
                      {x.gender === "Bride" ? "👰" : "🤵"} {x.age}y · {x.caste} · {x.district}
                      <div className="text-[10px] text-gray-500">{x.education} · {x.job} · {x.salary}{x.star ? ` · 🌟${x.star}` : ""} · {x.marital_status || ""}</div>
                    </td>
                    <td className="p-2 font-mono font-bold">{x.phone || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* deliver */}
          <div className="mt-3 rounded-2xl border-2 border-[#7A0C2E]/30 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <b className="text-sm text-[#7A0C2E]">📩 Personal send ({selIds.length} selected)</b>
              <select value={via} onChange={(e) => setVia(e.target.value)} aria-label="Via" className="rounded-lg border px-2 py-1.5 text-xs">
                <option value="both">📩 Telegram + 💬 WhatsApp</option>
                <option value="telegram">📩 Telegram DM</option>
                <option value="whatsapp">💬 WhatsApp</option>
              </select>
              <button onClick={() => void deliver()} className="rounded-xl bg-[#7A0C2E] px-5 py-2 text-sm font-bold text-white">
                🚀 Send personal ga
              </button>
              <button onClick={() => void refreshCopy()} className="rounded-xl border border-[#7A0C2E] px-4 py-2 text-xs font-bold text-[#7A0C2E]">
                📋 Copy-list refresh
              </button>
            </div>
            {deliverRes ? (
              <div className="mt-2 grid gap-2 text-xs md:grid-cols-2">
                <div className="rounded-xl bg-gray-50 p-2">
                  📩 Telegram: {deliverRes.telegram?.sent ? `✅ ${deliverRes.telegram.sent} msgs` : `🧪 ${deliverRes.telegram?.failed || "pending"}`}
                </div>
                <div className="rounded-xl bg-gray-50 p-2">
                  💬 WhatsApp: {deliverRes.whatsapp?.queued ? `✅ ${deliverRes.whatsapp.queued} queued` : `🧪 ${deliverRes.whatsapp?.failed || "pending"}`}
                </div>
              </div>
            ) : null}
            {copyList ? (
              <div className="mt-2">
                <div className="flex items-center justify-between">
                  <b className="text-xs text-[#7A0C2E]">📋 Copy-list (NAME -- NUMBER) — copy chesi Telegram/WhatsApp lo paste</b>
                  <button onClick={copyNow} className="rounded-lg bg-[#0F1F3C] px-3 py-1 text-xs font-bold text-white">
                    {copied ? "✅ Copied!" : "📋 Copy"}
                  </button>
                </div>
                <pre className="mt-1 max-h-56 overflow-auto whitespace-pre-wrap rounded-xl bg-[#0F1F3C] p-3 font-mono text-[11px] text-green-200">{copyList}</pre>
              </div>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
