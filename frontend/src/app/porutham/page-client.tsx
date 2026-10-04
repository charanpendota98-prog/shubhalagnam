"use client";

/**
 * /porutham — limited traditional reference report
 * Shows the ten backend rule checks item-by-item when the required star details exist.
 * It does not produce a compatibility score, star rating, or marriage verdict.
 */
import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Duo, duo } from "@/lib/duo";
import { useLang } from "@/lib/lang";
import { useSearchParams } from "next/navigation";
import { NAKSHATRAS, NAK_TO_RASI, RASIS } from "@/lib/telugu-data";
import RasiChart from "@/components/RasiChart";

type Res = Record<string, any>;

function PoruthamInner() {
  const { lang } = useLang();
  const te = lang === "te";
  const sp = useSearchParams();
  const [bride, setBride] = useState("");
  const [groom, setGroom] = useState("");
  const [myId, setMyId] = useState("");
  const [bStar, setBStar] = useState("");
  const [gStar, setGStar] = useState("");
  const [bRasi, setBRasi] = useState("");
  const [gRasi, setGRasi] = useState("");
  const [mode, setMode] = useState<"id" | "star">("id");
  const [res, setRes] = useState<Res | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [imgOk, setImgOk] = useState(true);
  const [gA, setGA] = useState("");
  const [gB, setGB] = useState("");
  const [gRes, setGRes] = useState<Res | null>(null);
  const [gBusy, setGBusy] = useState(false);
  const [chartB, setChartB] = useState<Res | null>(null);
  const [chartG, setChartG] = useState<Res | null>(null);

  useEffect(() => {
    const mine = (localStorage.getItem("tsap_id") || "").toUpperCase();
    if (mine) setMyId(mine);
    const qb = (sp.get("bride") || "").toUpperCase();
    const qg = (sp.get("groom") || "").toUpperCase();
    if (qb) setBride(qb);
    if (qg) setGroom(qg);
    else if (mine) setGroom(mine);
  }, [sp]);

  const calcById = useCallback(async (b: string, g: string) => {
    if (!b || !g) { setErr(te ? "రెండు Profile IDs ఇవ్వండి (bride + groom)" : "Enter both Profile IDs (bride + groom)"); return; }
    setBusy(true); setErr(""); setChartB(null); setChartG(null);
    try {
      const d = await fetch(`/api/porutham?bride=${encodeURIComponent(b)}&groom=${encodeURIComponent(g)}`).then((r) => r.json());
      if (d.detail) { setErr(typeof d.detail === "string" ? d.detail : (d.detail.te || d.detail.message_telugu || d.detail.en || "గుణమేళనం లెక్కించలేకపోయాం")); setRes(null); } else {
        setRes({ ...d, _bride: b, _groom: g }); setImgOk(true);
        try {
          const [cb, cg] = await Promise.all([
            fetch(`/api/astro/chart/${encodeURIComponent(b)}`).then((r) => r.json()),
            fetch(`/api/astro/chart/${encodeURIComponent(g)}`).then((r) => r.json()),
          ]);
          if (cb?.success) setChartB(cb);
          if (cg?.success) setChartG(cg);
        } catch { /* charts optional */ }
      }
    } catch { setErr(te ? "Network problem — మళ్లీ try చెయ్యండి" : "Network problem — retry"); }
    setBusy(false);
  }, [te]);

  const checkGothram = async () => {
    if (!gA.trim() || !gB.trim()) { setGRes({ note_telugu: te ? "రెండు Profile IDs ఇవ్వండి" : "Enter both Profile IDs" }); return; }
    setGBusy(true);
    try {
      const d = await fetch(`/api/gothram/check?a=${encodeURIComponent(gA.trim().toUpperCase())}&b=${encodeURIComponent(gB.trim().toUpperCase())}`).then((r) => r.json());
      setGRes(d.detail ? { note_telugu: d.detail, blocked: false } : d);
    } catch { setGRes({ note_telugu: te ? "Network problem" : "Network problem", blocked: false }); }
    setGBusy(false);
  };

  const calcByStar = async () => {
    if (!bStar || !gStar) { setErr(te ? "Bride + Groom star (నక్షత్రం) select చెయ్యండి" : "Select bride + groom stars (nakshatram)"); return; }
    setBusy(true); setErr("");
    try {
      const d = await fetch("/api/porutham", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bride_star: bStar, bride_rasi: bRasi, groom_star: gStar, groom_rasi: gRasi }),
      }).then((r) => r.json());
      setRes({ ...d, _bride: bStar, _groom: gStar, _byStar: true });
    } catch { setErr(te ? "Network problem — మళ్లీ try చెయ్యండి" : "Network problem — retry"); }
    setBusy(false);
  };

  const shareWa = () => {
    if (!res) return;
    const txt = `మన వివాహ — traditional Porutham checks\n${res.bride?.full_name || res._bride} • ${res.groom?.full_name || res._groom}\n`
      + `Checks marked pass: ${res.passed_checks ?? 0} of ${res.total_checks ?? 10}\nReview every item separately. This is not a compatibility score or marriage recommendation.\n`
      + `Details: https://manavivaha.in/porutham`;
    window.open(`https://wa.me/?text=${encodeURIComponent(txt)}`, "_blank");
  };

  const shareImg = () => {
    if (!res?._bride || !res?._groom || res._byStar) return;
    const url = `${window.location.origin}/api/og/porutham/${encodeURIComponent(res._bride)}/${encodeURIComponent(res._groom)}.png`;
    window.open(url, "_blank");
  };

  const items: Res[] = res?.items || [];

  return (
    <div className="min-h-dvh bg-cream pb-36">
      <section className="maroon-gradient text-white print:!bg-white print:!text-maroon">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-[11px] font-bold bg-white/10 border border-white/20 rounded-full px-3 py-1 inline-block">
            💍 <Duo en="Jyothishyam (Astrology) • Vedic Gunamelanam" te="వేద జ్యోతిషం • వివాహ గుణమేళనం & జాతక పొంతన" />
          </div>
          <h1 className="mt-3 text-2xl md:text-3xl font-bold"><Duo en="Jyothishyam — Ten-check Porutham Reference" te="జ్యోతిషం — పది నియమ-ఆధారిత పొంతన checks" /></h1>
          <p className="mt-2 text-[13px] md:text-sm opacity-90 telugu max-w-3xl">
{te ? <>నక్షత్ర వివరాల ఆధారంగా backend లెక్కించే పది సాంప్రదాయ checks మరియు వాటి వివరణ. ఇది పూర్తి జాతక విశ్లేషణ, వ్యక్తిత్వ అంచనా లేదా వివాహ ఫలిత హామీ కాదు; కుటుంబం/అర్హులైన సలహాదారులతో వివరాలు నిర్ధారించండి.</> : <>Ten traditional checks calculated by the backend from supplied star details. This is a limited reference, not a complete horoscope, a personality assessment, or a prediction of marriage outcomes; verify details with family and a qualified adviser.</>}
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
            <span className="bg-white/10 border border-white/20 rounded-full px-3 py-1.5">📄 10-check reference / PDF</span>
            <span className="bg-white/10 border border-white/20 rounded-full px-3 py-1.5">🖼️ Shareable result image</span>
            <span className="bg-white/10 border border-white/20 rounded-full px-3 py-1.5">ℹ️ Rule-based, limited reference</span>
          </div>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 py-5 space-y-4">
        {/* ---------- input card ---------- */}
        <div className="bg-white rounded-[1.5rem] border border-gold/25 p-4 print:hidden">
          <div className="flex gap-2">
            {([["id", te ? "🎫 Profile ID తో" : "🎫 With Profile ID"], ["star", te ? "⭐ Star తో (register అవ్వకుండా)" : "⭐ By star (no register)"]] as const).map(([v, l]) => (
              <button key={v} onClick={() => setMode(v)} className={`chip ${mode === v ? "chip-on" : ""}`}>{l}</button>
            ))}
          </div>

          {mode === "id" ? (
            <div className="mt-3 grid md:grid-cols-3 gap-3">
              <div>
                <label className="text-[12px] font-bold">👰 Bride Profile ID</label>
                <input value={bride} onChange={(e) => setBride(e.target.value.toUpperCase())} placeholder={te ? "వధువు Profile ID" : "Bride Profile ID"} className="input-mobile font-mono" />
              </div>
              <div>
                <label className="text-[12px] font-bold">🤵 Groom Profile ID</label>
                <input value={groom} onChange={(e) => setGroom(e.target.value.toUpperCase())} placeholder={te ? "వరుడు Profile ID" : "Groom Profile ID"} className="input-mobile font-mono" />
              </div>
              <div className="flex items-end">
                <button onClick={() => calcById(bride, groom)} disabled={busy}
                  className="w-full py-3.5 rounded-2xl maroon-gradient text-white font-bold text-[13px] disabled:opacity-60">
                  {busy ? "Calculate…" : te ? "💍 గుణమేళనం చూడు" : "💍 See Gunamelanam"}
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-[12px] font-bold">Bride star (వధువు నక్షత్రం)</label>
                <select
                  value={bStar}
                  onChange={(e) => {
                    const s = e.target.value;
                    setBStar(s);
                    if (s && NAK_TO_RASI[s]) setBRasi(NAK_TO_RASI[s]);
                  }}
                  className="input-mobile"
                >
                  <option value="">— select —</option>
                  {NAKSHATRAS.map((n) => <option key={n.en} value={n.en}>{n.te} ({n.en})</option>)}
                </select>
              </div>
              <div>
                <label className="text-[12px] font-bold">Bride rasi (రాశి)</label>
                <select value={bRasi} onChange={(e) => setBRasi(e.target.value)} className="input-mobile">
                  <option value="">— auto —</option>
                  {RASIS.map((r) => <option key={r.en} value={r.en}>{r.te} ({r.en})</option>)}
                </select>
              </div>
              <div>
                <label className="text-[12px] font-bold">Groom star (వరుని నక్షత్రం)</label>
                <select
                  value={gStar}
                  onChange={(e) => {
                    const s = e.target.value;
                    setGStar(s);
                    if (s && NAK_TO_RASI[s]) setGRasi(NAK_TO_RASI[s]);
                  }}
                  className="input-mobile"
                >
                  <option value="">— select —</option>
                  {NAKSHATRAS.map((n) => <option key={n.en} value={n.en}>{n.te} ({n.en})</option>)}
                </select>
              </div>
              <div>
                <label className="text-[12px] font-bold">Groom rasi (రాశి)</label>
                <select value={gRasi} onChange={(e) => setGRasi(e.target.value)} className="input-mobile">
                  <option value="">— auto —</option>
                  {RASIS.map((r) => <option key={r.en} value={r.en}>{r.te} ({r.en})</option>)}
                </select>
              </div>
              <div className="col-span-2 md:col-span-4">
                <button onClick={calcByStar} disabled={busy}
                  className="w-full py-3.5 rounded-2xl maroon-gradient text-white font-bold text-[13px] disabled:opacity-60">
                  {busy ? "Calculate…" : te ? "💍 గుణమేళనం చూడు (నక్షత్రంతో)" : "💍 See Gunamelanam (by star)"}
                </button>
              </div>
            </div>
          )}
          {myId && mode === "id" && (
            <div className="mt-2 text-[11px] text-gray-600">
{te ? <>మీ ID: <b className="font-mono">{myId}</b> —{" "}
              <button onClick={() => calcById(myId, groom || bride)} className="text-maroon font-bold underline">
                నా ID ని వేరే profile తో compare చెయ్యి
              </button></> : <>Your ID: <b className="font-mono">{myId}</b> —{" "}
              <button onClick={() => calcById(myId, groom || bride)} className="text-maroon font-bold underline">
                compare my ID with another profile
              </button></>}
            </div>
          )}
          {err && <div className="mt-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl px-3 py-2 text-[12px]">{err}</div>}
        </div>

        {/* ---------- member-entered gothram comparison ---------- */}
        <div className="bg-white rounded-[1.5rem] border border-gold/25 p-4 print:hidden">
          <div className="font-bold text-maroon text-[14px]">{te ? "🛡️ ప్రొఫైల్‌లో ఇచ్చిన గోత్ర వివరాలను పోల్చండి" : "🛡️ Compare member-entered gothram details"}</div>
          <p className="mt-1 text-[11px] text-slate-600">{te ? "ఇది నమోదు చేసిన పదాల పోలిక మాత్రమే; కుటుంబ సంప్రదాయం లేదా వివాహ నిర్ణయంపై తీర్పు కాదు." : "This compares the entered text only; it is not a ruling on family tradition or a marriage decision."}</p>
          <div className="mt-2 grid md:grid-cols-3 gap-2">
            <input value={gA} onChange={(e) => setGA(e.target.value.toUpperCase())} placeholder="Profile ID - A" className="input-mobile font-mono" aria-label="Profile ID A" />
            <input value={gB} onChange={(e) => setGB(e.target.value.toUpperCase())} placeholder="Profile ID - B" className="input-mobile font-mono" aria-label="Profile ID B" />
            <button onClick={() => void checkGothram()} disabled={gBusy}
              className="py-3 rounded-2xl maroon-gradient text-white font-bold text-[13px] disabled:opacity-60">
              {gBusy ? "…" : te ? "🛡️ Check" : "🛡️ Check"}
            </button>
          </div>
          {gRes?.note_telugu && (
            <p role="status" className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-2 text-[12px] font-medium text-slate-700">
              {gRes.note_telugu}
            </p>
          )}
        </div>

        {/* ---------- report ---------- */}
        {res && (
          <>
            <div className="bg-white rounded-[1.5rem] border border-gold/25 p-5">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="min-w-0 flex-1 text-center md:text-left">
                  {res.available ? (
                    <>
                      <div className="text-[17px] font-bold text-maroon telugu">{te ? "Porutham checks లెక్కించబడ్డాయి" : "Porutham checks calculated"}</div>
                      <div className="mt-1 inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[12px] font-bold text-amber-950">
                        {te ? `${res.passed_checks ?? 0} / ${res.total_checks ?? 10} checks pass గా గుర్తింపు` : `${res.passed_checks ?? 0} of ${res.total_checks ?? 10} checks marked pass`}
                      </div>
                    </>
                  ) : (
                    <div className="text-[13px] text-slate-700">{te ? "తగిన నక్షత్ర వివరాలు లేవు — Porutham లెక్కించలేదు" : "Required star details are missing; Porutham was not calculated."}</div>
                  )}
                  {res.available && (
                    <div className="mt-2 text-[12px] text-gray-700">
                      👰 {res.bride?.full_name || res._bride} — <b>{(res.bride_star_en || "")} ({res.bride_star || ""})</b>, {res.bride_rasi || ""}<br />
                      🤵 {res.groom?.full_name || res._groom} — <b>{(res.groom_star_en || "")} ({res.groom_star || ""})</b>, {res.groom_rasi || ""}
                    </div>
                  )}
                  {res.doshas?.length ? (
                    <div className="mt-2 inline-block bg-rose-50 border border-rose-200 text-rose-800 rounded-xl px-3 py-1.5 text-[11px] font-bold">
                      {te ? <>⚠️ దోషం: {res.doshas.join(" + ")} — పెద్దలు/పురోహితులను సంప్రదించండి</> : <>⚠️ Dosha: {res.doshas.join(" + ")} — consult elders/purohit</>}
                    </div>
                  ) : null}
                </div>
              </div>

              {res.available && items.length > 0 && (
                <div className="mt-4 grid md:grid-cols-2 gap-2">
                  {items.map((it) => (
                    <div key={it.no} className={`rounded-2xl p-3 border ${it.pass ? "bg-emerald-50/60 border-emerald-200" : "bg-rose-50/60 border-rose-200"}`}>
                      <div className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-full text-white text-[12px] font-bold flex items-center justify-center ${it.pass ? "bg-emerald-600" : "bg-rose-600"}`}>
                          {it.pass ? "✓" : "✗"}
                        </span>
                        <span className="text-[13px] font-bold text-ink">{it.no}. {it.name}</span>
                        <span className="text-[11px] text-gray-500 telugu">{it.telugu}</span>
                      </div>
                      <div className="mt-1 text-[11px] text-gray-700 telugu leading-relaxed">{it.note}</div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-3 bg-cream rounded-2xl p-3 text-[11px] text-gray-700 telugu leading-relaxed">
                🕉️ {res.advice_telugu || res.reason}
              </div>

              {res.available && (
              <div className="mt-4 flex flex-wrap gap-2 print:hidden">
                <a
                  href={res._byStar ? `/api/astro/report/download?bride_star=${encodeURIComponent(bStar)}&bride_rasi=${encodeURIComponent(bRasi)}&groom_star=${encodeURIComponent(gStar)}&groom_rasi=${encodeURIComponent(gRasi)}` : `/api/astro/report/download?bride_id=${encodeURIComponent(bride)}&groom_id=${encodeURIComponent(groom)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-3 rounded-2xl gold-gradient text-maroon font-black text-[12px] shadow-gold hover-lift flex items-center gap-1.5"
                >
                  <span>📜</span>
                  <span>{te ? "10 checks reference PDF డౌన్‌లోడ్" : "Download 10-check reference PDF"}</span>
                </a>
                <button onClick={() => window.print()} className="px-4 py-3 rounded-2xl maroon-gradient text-white font-bold text-[12px]">🖨️ Print View</button>
                <button onClick={shareWa} title={te ? "బాహ్య WhatsApp share తెరుస్తుంది; availability తనిఖీ చేయబడదు" : "Opens external WhatsApp sharing; availability is not checked"} className="px-4 py-3 rounded-2xl bg-[#25D366] text-white font-bold text-[12px]">{te ? "WhatsApp లో షేర్" : "Share via WhatsApp"}</button>
                {!res._byStar && <button onClick={shareImg} className="px-4 py-3 rounded-2xl border border-maroon/25 text-maroon font-bold text-[12px]">🖼️ రిపోర్ట్ ఇమేజ్</button>}
                <Link href="/requests" className="px-4 py-3 rounded-2xl border border-maroon/25 text-maroon font-bold text-[12px]">{te ? "💌 Interest పంపు" : "💌 Send interest"}</Link>
              </div>
              )}
            </div>

            {/* ---------- rasi charts ---------- */}
            {(chartB || chartG) && (
              <div className="grid md:grid-cols-2 gap-3 print:hidden">
                {chartB && <RasiChart houses={chartB.houses} moonHouse={chartB.moon_house} star={chartB.star} rasi={chartB.rasi} title={`👰 ${res._bride}`} />}
                {chartG && <RasiChart houses={chartG.houses} moonHouse={chartG.moon_house} star={chartG.star} rasi={chartG.rasi} title={`🤵 ${res._groom}`} />}
              </div>
            )}

            {/* ---------- report image preview ---------- */}
            {res.available && !res._byStar && imgOk && (
              <div className="bg-white rounded-[1.5rem] border border-gold/25 p-4 print:hidden">
                <div className="font-bold text-maroon text-[14px]">{te ? "🖼️ WhatsApp లో షేర్ చేయడానికి గుణమేళనం ఇమేజ్" : "🖼️ Gunamelanam image ready to share on WhatsApp"}</div>
                <div className="text-[11px] text-gray-600 mt-1">
                  {te ? "ఇమేజ్‌లో backend ఇచ్చిన పది checks వివరాలు మాత్రమే ఉంటాయి. WhatsApp ద్వారా పంచుకోవాలా వద్దా అనేది మీ నిర్ణయం; బాహ్య లభ్యత తనిఖీ చేయబడదు." : "The image contains the backend's ten checks. Sharing via WhatsApp is optional; external availability is not checked."}
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/og/porutham/${encodeURIComponent(res._bride)}/${encodeURIComponent(res._groom)}.png`}
                  onError={() => setImgOk(false)}
                  alt="Gunamelanam report — Telugu"
                  className="mt-3 w-full rounded-2xl border border-gold/30"
                />
              </div>
            )}
          </>
        )}

        {/* ---------- glossary ---------- */}
        <div className="bg-white rounded-[1.5rem] border border-gold/25 p-5 print:hidden">
          <div className="font-bold text-maroon text-[15px]">{te ? "📚 ఈ పది నియమ-ఆధారిత checks గురించి (సమాచారం కోసం మాత్రమే)" : "📚 About these ten rule-based checks (informational only)"}</div>
          <div className="mt-3 grid md:grid-cols-2 gap-2 text-[11px] text-gray-700 telugu leading-relaxed">
            {[
              ["రాశి పొంతన (Rasi)", "ఈ implementation లో రాశుల మధ్య 6/8 దూరం ఉందో లేదో తనిఖీ చేస్తుంది."],
              ["నక్షత్ర / దిన గుణం", "నక్షత్రాల మధ్య backend లో నిర్వచించిన వేధ జంట ఉందో పరిశీలిస్తుంది."],
              ["గణ మైత్రి (Gana)", "ఎంచుకున్న నక్షత్రాల గణ వర్గీకరణను backend పట్టికతో పోలుస్తుంది."],
              ["యోని పొంతన (Yoni)", "నక్షత్రాలకు కేటాయించిన యోని వర్గాలు శత్రు జంటలో ఉన్నాయో చూస్తుంది."],
              ["రజ్జు శుద్ధి (Rajju)", "రెండు నక్షత్రాలు ఒకే రజ్జు సమూహంలో ఉన్నాయో తనిఖీ చేస్తుంది."],
              ["వేధ పరిశీలన (Vedha)", "నిర్వచించిన నక్షత్ర వేధ జంటలలో ఈ రెండు నక్షత్రాలు ఉన్నాయో చూస్తుంది."],
              ["మాహేంద్ర పొంతన (Mahendra)", "Backend నియమంలో జాబితా చేసిన నక్షత్ర దూరాలనే pass గా గుర్తిస్తుంది."],
              ["స్త్రీ దీర్ఘం (Stree Deergha)", "వరుని నక్షత్రం నుండి వధువు నక్షత్రం వరకు లెక్కించిన దూరం 13 లేదా అంతకంటే ఎక్కువో చూస్తుంది."],
              ["వశ్య పొంతన (Vashya)", "రాశులకు backend లో ఇచ్చిన వశ్య వర్గాలు లేదా అనుబంధ జంటలను పోలుస్తుంది."],
              ["రాశ్యాధిపతి మైత్రి (Rasi Adhipathi)", "రాశి అధిపతులకు backend లో నిర్వచించిన ఒకే లేదా మిత్ర జంట వర్తిస్తుందో చూస్తుంది."],
            ].map(([t, d]) => (
              <div key={t} className="bg-cream rounded-xl p-2.5 border border-gold/20">
                <div className="font-bold text-maroon">{t}</div>
                <div className="mt-0.5">{d}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] text-gray-600">
            {te ? "ఈ automated reference లో పురోహితుల సంప్రదింపు లేదా పూర్తి జాతక విశ్లేషణ చేర్చలేదు." : "This automated reference does not include an astrologer consultation or a complete horoscope analysis."}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PoruthamPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-cream p-8 text-center text-[13px]">వేద గుణమేళనం లోడ్ అవుతుంది…</div>}>
      <PoruthamInner />
    </Suspense>
  );
}
