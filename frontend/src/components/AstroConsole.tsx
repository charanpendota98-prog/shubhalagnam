"use client";
/**
 * 🪐 WAVE 13 — ADMIN ASTRO CONSOLE
 * 36-guna checker (2 IDs) + dosha queue (jathakam verify) + stats.
 */
import { useEffect, useState } from "react";
import { apiDisplayMessage, authHeaders, readApiJson } from "@/lib/api";
import { useLang } from "@/lib/lang";

type Row = Record<string, any>;
const adminToken = () => {
  try { return localStorage.getItem("tsap_admin_token") || ""; } catch { return ""; }
};
const withToken = (url: string) => {
  const tk = adminToken();
  return tk ? `${url}${url.includes("?") ? "&" : "?"}token=${encodeURIComponent(tk)}` : url;
};

export default function AstroConsole() {
  const { lang } = useLang();
  const te = lang === "te";
  const [bride, setBride] = useState("");
  const [groom, setGroom] = useState("");
  const [guna, setGuna] = useState<Row | null>(null);
  const [flash, setFlash] = useState("");
  const [queue, setQueue] = useState<Row[]>([]);
  const [qStatus, setQStatus] = useState("");
  const [stats, setStats] = useState<Row | null>(null);
  const [note, setNote] = useState<Record<string, string>>({});

  const loadStats = async () => {
    try {
      const d = await fetch(withToken("/api/admin/astro/stats"), { headers: authHeaders(true) }).then((r) => readApiJson(r));
      if (d.success) setStats(d);
    } catch { /* ignore */ }
  };
  const loadQueue = async (st: string) => {
    try {
      const d = await fetch(withToken(`/api/admin/astro/queue${st ? `?status=${st}` : ""}`), { headers: authHeaders(true) }).then((r) => readApiJson(r));
      if (d.success) setQueue(d.items || []);
    } catch { /* ignore */ }
  };
  useEffect(() => { void loadStats(); void loadQueue(""); }, []);

  const checkGuna = async () => {
    if (!bride.trim() || !groom.trim()) { setFlash(te ? "⚠️ Bride + Groom IDs ఇవ్వండి" : "⚠️ Enter Bride + Groom IDs"); return; }
    setFlash(te ? "⏳ Guna చూస్తున్నాం…" : "⏳ Checking guna…");
    const r = await fetch(`/api/astro/guna?bride_id=${encodeURIComponent(bride.trim().toUpperCase())}&groom_id=${encodeURIComponent(groom.trim().toUpperCase())}`);
    const d = await readApiJson(r);
    if (!r.ok) { setFlash(d.detail || "Fail"); setGuna(null); return; }
    setGuna(d);
    const verdict = apiDisplayMessage({ message_en: d.verdict_en || d.verdict, message: d.verdict_telugu }, te, te ? "ఫలితం అందుబాటులో లేదు." : "Verdict not available in English.");
    setFlash(d.available ? `✅ ${d.total_36}/36 — ${verdict}` : verdict);
  };

  const verify = async (id: string, ok: boolean) => {
    const r = await fetch(withToken(`/api/admin/astro/verify/${id}`),
      { method: "POST", headers: { ...authHeaders(true), "Content-Type": "application/json" },
        body: JSON.stringify({ ok, note: note[id] || "" }) });
    const d = await readApiJson(r);
    setFlash(apiDisplayMessage(d, te, te ? "జాతక పత్ర సమీక్ష స్థితి నవీకరించబడింది." : "Review status updated."));
    void loadQueue(qStatus); void loadStats();
  };

  return (
    <div>
      <p className="telugu mt-2 text-xs text-gray-600">
        {te ? "36-guna Ashtakoota, dosha screening సభ్యులు ఇచ్చిన జన్మ వివరాలపై ఆధారపడిన సూచిక లెక్కలు మాత్రమే; పూర్తి జాతకం లేదా వివాహ నిర్ణయం కాదు. జాతక పత్రం review status నమోదు కావడం దాని నిజత్వానికి హామీ కాదు. కుటుంబ జ్యోతిష్య నిపుణుడితో నిర్ధారించండి." : "36-guna Ashtakoota and dosha screening are reference calculations from member-entered birth details, not a complete horoscope or marriage decision. A recorded horoscope-document review status does not certify authenticity. Confirm with your family astrologer."}
      </p>
      {stats ? (
        <div className="mt-3 grid grid-cols-2 gap-3 text-center md:grid-cols-5">
          {[
            { l: te ? "ప్రొఫైళ్లు" : "Profiles", v: stats.total }, { l: te ? "🚫 తెలిపిన దోషం" : "🚫 Dosha declared", v: stats.dosha_declared },
            { l: te ? "⚠️ సభ్యుడు తెలిపిన మూలం" : "⚠️ Moola (declared)", v: stats.moola }, { l: te ? "🪐 జాతక పత్రం review నమోదు" : "🪐 Horoscope document review recorded", v: stats.jathakam_verified },
            { l: te ? "⏳ పత్రం review పెండింగ్" : "⏳ Document review pending", v: stats.jathakam_pending },
          ].map((x) => (
            <div key={x.l} className="rounded-2xl bg-gray-50 p-3">
              <div className="text-xl font-bold text-[#7A0C2E]">{x.v}</div>
              <div className="text-[11px] text-gray-500">{x.l}</div>
            </div>
          ))}
        </div>
      ) : null}

      {/* guna checker */}
      <div className="mt-3 rounded-2xl border p-4">
        <div className="font-bold text-[#7A0C2E]">🪐 {te ? "36-గుణ సూచిక లెక్క" : "36-Guna reference calculation"}</div>
        <div className="mt-2 flex flex-wrap gap-2">
          <input value={bride} onChange={(e) => setBride(e.target.value.toUpperCase())} placeholder="Bride Profile ID"
            aria-label="Bride ID" className="min-w-[200px] flex-1 rounded-xl border px-3 py-2 font-mono text-sm" />
          <input value={groom} onChange={(e) => setGroom(e.target.value.toUpperCase())} placeholder="Groom Profile ID"
            aria-label="Groom ID" className="min-w-[200px] flex-1 rounded-xl border px-3 py-2 font-mono text-sm" />
          <button type="button" onClick={() => void checkGuna()} className="rounded-xl bg-[#7A0C2E] px-5 py-2 text-sm font-bold text-white">🔍 {te ? "గుణాలు చూడండి" : "Calculate reference"}</button>
        </div>
        {flash ? <div className="mt-2 rounded-xl bg-[#0F1F3C] p-2 text-xs text-white">{flash}</div> : null}
        {guna?.available ? (
          <div className="mt-3">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-[#7A0C2E] px-4 py-2 text-center text-white">
                <div className="text-2xl font-extrabold">{guna.total_36}<span className="text-sm">/36</span></div>
                <div className="text-[10px]">{guna.percent}% · {guna.verdict}</div>
              </div>
              <div className="text-xs text-gray-600">
                👰 {apiDisplayMessage({ message_en: guna.bride?.star_en, message: guna.bride?.star }, te, te ? "—" : "Not available in English")} / {apiDisplayMessage({ message_en: guna.bride?.rasi_en, message: guna.bride?.rasi }, te, te ? "—" : "Not available in English")} × 🤵 {apiDisplayMessage({ message_en: guna.groom?.star_en, message: guna.groom?.star }, te, te ? "—" : "Not available in English")} / {apiDisplayMessage({ message_en: guna.groom?.rasi_en, message: guna.groom?.rasi }, te, te ? "—" : "Not available in English")}
                <div className="mt-1 font-bold text-[#7A0C2E]">{apiDisplayMessage({ message_en: guna.verdict_en || guna.verdict, message: guna.verdict_telugu }, te, te ? "ఫలితం అందుబాటులో లేదు." : "Verdict not available in English.")}</div>
              </div>
            </div>
            <div className="mt-2 grid gap-2 md:grid-cols-2">
              {(guna.kootas || []).map((k: Row) => (
                <div key={k.koota} className="rounded-xl bg-gray-50 p-2 text-xs">
                  <div className="flex justify-between font-bold"><span>{apiDisplayMessage({ message_en: k.name_en || k.koota_en, message: k.koota }, te, te ? "—" : "Factor name unavailable in English")}</span><span className="text-[#7A0C2E]">{k.score}/{k.max}</span></div>
                  <div className="text-gray-500">{apiDisplayMessage({ message_en: k.detail_en, message: k.detail }, te, "")}</div>
                  {te ? <div>{k.telugu}</div> : null}
                </div>
              ))}
            </div>
            {(guna.doshas || []).length ? (
              <div className="mt-2 rounded-xl bg-red-50 p-2 text-xs text-red-800">
                <b>🚫 {te ? "దోష సూచనలు" : "Dosha references"} ({guna.doshas.length}):</b>
                <ul className="mt-1 list-disc pl-5">{guna.doshas.map((d: unknown, i: number) => <li key={i}>{apiDisplayMessage(typeof d === "object" && d !== null ? { message_en: (d as Row).message_en || (d as Row).name_en || (d as Row).description_en, message: (d as Row).message || (d as Row).name || (d as Row).description } : { message: String(d) }, te, te ? "—" : "Dosha reference unavailable in English")}</li>)}</ul>
              </div>
            ) : null}
            {apiDisplayMessage({ message_en: guna.note_en, message: guna.note_telugu }, te, "") ? <p className="mt-1 text-[11px] text-gray-500">{apiDisplayMessage({ message_en: guna.note_en, message: guna.note_telugu }, te, "")}</p> : null}
          </div>
        ) : null}
      </div>

      {/* pandit queue */}
      <div className="mt-3 rounded-2xl border p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="font-bold text-[#7A0C2E]">📜 {te ? "జాతక పత్రాల review క్యూ" : "Horoscope document review queue"}</div>
          <select value={qStatus} onChange={(e) => { setQStatus(e.target.value); void loadQueue(e.target.value); }}
            aria-label="Status" className="rounded-full border px-3 py-1.5 text-xs">
            <option value="">{te ? "అన్నీ" : "All"}</option><option value="pending">{te ? "పెండింగ్" : "Pending"}</option>
            <option value="verified">{te ? "Review నమోదు అయింది" : "Review recorded"}</option><option value="rejected">{te ? "తిరస్కరించారు" : "Rejected"}</option>
          </select>
        </div>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="border-b text-left text-gray-500">
              <th className="p-2">ID</th><th>Profile</th><th>File</th><th>Status</th><th>Note / Action</th>
            </tr></thead>
            <tbody>
              {queue.length === 0 ? <tr><td colSpan={5} className="p-4 text-center text-gray-500">{te ? "క్యూ ఖాళీగా ఉంది 🙂" : "The queue is empty 🙂"}</td></tr> : null}
              {queue.map((j) => (
                <tr key={j.id} className="border-b">
                  <td className="p-2 font-mono font-bold">{j.id}<div className="text-[10px] text-gray-400">{String(j.at || "").slice(0, 16)}</div></td>
                  <td className="p-2 font-mono">{j.tsap_id}</td>
                  <td className="p-2">{j.kind === "pdf" ? "📄" : "🖼️"} <span className="font-mono text-[10px]">{j.file}</span></td>
                  <td className="p-2"><span title={j.status === "verified" ? (te ? "Review status మాత్రమే; పత్రం authenticity కు హామీ కాదు." : "Review status only; not a document-authenticity certificate.") : undefined} className={`rounded-full px-2 py-0.5 text-[10px] ${j.status === "verified" ? "bg-green-100 text-green-700" : j.status === "rejected" ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"}`}>{j.status === "verified" ? (te ? "Review నమోదు" : "Review recorded") : j.status === "rejected" ? (te ? "తిరస్కరించారు" : "Rejected") : (te ? "పెండింగ్" : "Pending")}</span></td>
                  <td className="p-2">
                    {j.status === "pending" ? (
                      <div className="flex gap-1">
                        <input value={note[j.id] || ""} onChange={(e) => setNote({ ...note, [j.id]: e.target.value })}
                          placeholder={te ? "Review గమనిక" : "Review note"} aria-label={te ? "Review గమనిక" : "Review note"} className="w-28 rounded-lg border px-2 py-1" />
                        <button type="button" aria-label={te ? "Review స్థితిని నమోదు చేయండి" : "Record review status"} title={te ? "Review status నమోదు" : "Record review status"} onClick={() => void verify(j.id, true)} className="rounded-full bg-green-600 px-3 py-1 text-white">✅</button>
                        <button type="button" aria-label={te ? "పత్రం review ను తిరస్కరించండి" : "Reject document review"} title={te ? "తిరస్కరించండి" : "Reject review"} onClick={() => void verify(j.id, false)} className="rounded-full bg-red-500 px-3 py-1 text-white">❌</button>
                      </div>
                    ) : <span className="text-gray-500">{apiDisplayMessage({ message_en: j.note_en, message: j.note }, te, "—")}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
