"use client";


import { apiDisplayMessage, readApiJson } from "@/lib/api";
/**
 * /porutham — limited traditional reference report
 * Shows the ten backend rule checks item-by-item when the required star details exist.
 * It does not produce a compatibility score, star rating, or marriage verdict.
 */
import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Duo } from "@/lib/duo";
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
  const [gRes, setGRes] = useState<{ note: string } | null>(null);
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
      const d = await fetch(`/api/porutham?bride=${encodeURIComponent(b)}&groom=${encodeURIComponent(g)}`).then((r) => readApiJson(r));
      if (d.detail) {
        setErr(apiDisplayMessage(d, te, te ? "గుణమేళనం లెక్కించలేకపోయాం. మళ్లీ ప్రయత్నించండి." : "Could not calculate the Porutham reference. Please try again."));
        setRes(null);
      } else {
        setRes({ ...d, _bride: b, _groom: g }); setImgOk(true);
        try {
          const [cb, cg] = await Promise.all([
            fetch(`/api/astro/chart/${encodeURIComponent(b)}`).then((r) => readApiJson(r)),
            fetch(`/api/astro/chart/${encodeURIComponent(g)}`).then((r) => readApiJson(r)),
          ]);
          if (cb?.success) setChartB(cb);
          if (cg?.success) setChartG(cg);
        } catch { /* charts optional */ }
      }
    } catch { setErr(te ? "Network problem — మళ్లీ try చెయ్యండి" : "Network problem — retry"); }
    setBusy(false);
  }, [te]);

  const checkGothram = async () => {
    if (!gA.trim() || !gB.trim()) {
      setGRes({ note: te ? "రెండు ప్రొఫైల్ IDలను నమోదు చేయండి." : "Enter both profile IDs." });
      return;
    }
    setGBusy(true);
    try {
      const d = await fetch(`/api/gothram/check?a=${encodeURIComponent(gA.trim().toUpperCase())}&b=${encodeURIComponent(gB.trim().toUpperCase())}`).then((r) => readApiJson(r));
      if (d.detail || !d.success) {
        setGRes({ note: apiDisplayMessage(d, te, te ? "గోత్ర వివరాలను పోల్చలేకపోయాం." : "Could not compare the gothram details.") });
      } else if (te) {
        setGRes({ note: d.note_telugu || "నమోదు చేసిన వివరాలను పోల్చలేకపోయాం." });
      } else {
        setGRes({ note: d.same === true
          ? "The entered gothram text matches. This is a text comparison only—not a marriage decision."
          : d.same === false
            ? "The entered gothram text differs. This is a text comparison only—not a traditional ruling."
            : "One or both gothram details are unavailable; no comparison could be made." });
      }
    } catch {
      setGRes({ note: te ? "నెట్‌వర్క్ సమస్య. మళ్లీ ప్రయత్నించండి." : "A network problem occurred. Please try again." });
    }
    setGBusy(false);
  };

  const calcByStar = async () => {
    if (!bStar || !gStar) { setErr(te ? "వధువు, వరుడు ఇద్దరి నక్షత్రాలను ఎంచుకోండి." : "Select a nakshatra for both profiles."); return; }
    setBusy(true); setErr("");
    try {
      const d = await fetch("/api/porutham", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bride_star: bStar, bride_rasi: bRasi, groom_star: gStar, groom_rasi: gRasi }),
      }).then((r) => readApiJson(r));
      if (d.detail) {
        setErr(apiDisplayMessage(d, te, te ? "గుణమేళనం లెక్కించలేకపోయాం. వివరాలను పరిశీలించండి." : "Could not calculate the Porutham reference. Review the supplied details."));
        setRes(null);
      } else {
        setRes({ ...d, _bride: bStar, _groom: gStar, _byStar: true });
      }
    } catch { setErr(te ? "నెట్‌వర్క్ సమస్య. మళ్లీ ప్రయత్నించండి." : "A network problem occurred. Please try again."); }
    setBusy(false);
  };

  const shareWa = () => {
    if (!res) return;
    const brand = te ? "మన వివాహ (Mana Vivaha)" : "Mana Vivaha (మన వివాహ)";
    const brideStar = te ? (res.bride_star || res._bride) : apiDisplayMessage({ message_en: res.bride_star_en }, false, res._byStar ? res._bride : "Not available in English");
    const groomStar = te ? (res.groom_star || res._groom) : apiDisplayMessage({ message_en: res.groom_star_en }, false, res._byStar ? res._groom : "Not available in English");
    const txt = te
      ? `${brand} — గుణమేళనం సూచిక\n${res.bride?.full_name || res._bride} • ${brideStar}\n${res.groom?.full_name || res._groom} • ${groomStar}\nసరిపోతాయని గుర్తించిన అంశాలు: ${res.passed_checks ?? 0} / ${res.total_checks ?? 10}\nఇది అనుకూలత స్కోరు లేదా వివాహ సిఫార్సు కాదు. ప్రతి అంశాన్ని విడిగా పరిశీలించండి.\n${window.location.origin}/porutham`
      : `${brand} — Porutham reference\n${res.bride?.full_name || res._bride} • ${brideStar}\n${res.groom?.full_name || res._groom} • ${groomStar}\nChecks marked pass: ${res.passed_checks ?? 0} of ${res.total_checks ?? 10}\nReview each item separately. This is not a compatibility score or marriage recommendation.\n${window.location.origin}/porutham`;
    window.open(`https://wa.me/?text=${encodeURIComponent(txt)}`, "_blank", "noopener,noreferrer");
  };

  const shareImg = () => {
    if (!res?._bride || !res?._groom || res._byStar) return;
    const url = `${window.location.origin}/api/og/porutham/${encodeURIComponent(res._bride)}/${encodeURIComponent(res._groom)}.png`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const items: Res[] = res?.items || [];
  const brideStarLabel = te ? res?.bride_star : apiDisplayMessage({ message_en: res?.bride_star_en }, false, "");
  const groomStarLabel = te ? res?.groom_star : apiDisplayMessage({ message_en: res?.groom_star_en }, false, "");
  const brideRasiLabel = te ? res?.bride_rasi : apiDisplayMessage({ message_en: res?.bride_rasi_en }, false, "");
  const groomRasiLabel = te ? res?.groom_rasi : apiDisplayMessage({ message_en: res?.groom_rasi_en }, false, "");

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
            <span className="bg-white/10 border border-white/20 rounded-full px-3 py-1.5">{te ? "📄 10 అంశాల సూచిక / PDF" : "📄 10-check reference / PDF"}</span>
            <span className="bg-white/10 border border-white/20 rounded-full px-3 py-1.5">{te ? "🖼️ పంచుకోదగిన ఫలిత చిత్రం" : "🖼️ Shareable result image"}</span>
            <span className="bg-white/10 border border-white/20 rounded-full px-3 py-1.5">{te ? "ℹ️ పరిమిత నియమ-ఆధారిత సూచిక" : "ℹ️ Limited rule-based reference"}</span>
          </div>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 py-5 space-y-4">
        {/* ---------- input card ---------- */}
        <div className="bg-white rounded-[1.5rem] border border-gold/25 p-4 print:hidden">
          <div className="flex gap-2">
            {([["id", te ? "🎫 Profile ID తో" : "🎫 With Profile ID"], ["star", te ? "⭐ Star తో (register అవ్వకుండా)" : "⭐ By star (no register)"]] as const).map(([v, l]) => (
              <button type="button" key={v} onClick={() => setMode(v)} className={`chip ${mode === v ? "chip-on" : ""}`}>{l}</button>
            ))}
          </div>

          {mode === "id" ? (
            <div className="mt-3 grid md:grid-cols-3 gap-3">
              <div>
                <label className="text-[12px] font-bold">👰 Bride Profile ID</label>
                <input aria-label="👰 Bride Profile ID" value={bride} onChange={(e) => setBride(e.target.value.toUpperCase())} placeholder={te ? "వధువు Profile ID" : "Bride Profile ID"} className="input-mobile font-mono" />
              </div>
              <div>
                <label className="text-[12px] font-bold">🤵 Groom Profile ID</label>
                <input aria-label="🤵 Groom Profile ID" value={groom} onChange={(e) => setGroom(e.target.value.toUpperCase())} placeholder={te ? "వరుడు Profile ID" : "Groom Profile ID"} className="input-mobile font-mono" />
              </div>
              <div className="flex items-end">
                <button type="button" onClick={() => calcById(bride, groom)} disabled={busy}
                  className="w-full py-3.5 rounded-2xl maroon-gradient text-white font-bold text-[13px] disabled:opacity-60">
                  {busy ? "Calculate…" : te ? "💍 గుణమేళనం చూడు" : "💍 See Gunamelanam"}
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-[12px] font-bold">{te ? "వధువు నక్షత్రం" : "Bride nakshatra"}</label>
                <select aria-label={te ? "వధువు నక్షత్రం" : "Bride nakshatra"}
                  value={bStar}
                  onChange={(e) => {
                    const s = e.target.value;
                    setBStar(s);
                    if (s && NAK_TO_RASI[s]) setBRasi(NAK_TO_RASI[s]);
                  }}
                  className="input-mobile"
                >
                  <option value="">— select —</option>
                  {NAKSHATRAS.map((n) => <option key={n.en} value={n.en}>{te ? `${n.te} (${n.en})` : n.en}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[12px] font-bold">{te ? "వధువు రాశి" : "Bride rasi"}</label>
                <select aria-label={te ? "వధువు రాశి" : "Bride rasi"} value={bRasi} onChange={(e) => setBRasi(e.target.value)} className="input-mobile">
                  <option value="">— auto —</option>
                  {RASIS.map((r) => <option key={r.en} value={r.en}>{te ? `${r.te} (${r.en})` : r.en}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[12px] font-bold">{te ? "వరుని నక్షత్రం" : "Groom nakshatra"}</label>
                <select aria-label={te ? "వరుని నక్షత్రం" : "Groom nakshatra"}
                  value={gStar}
                  onChange={(e) => {
                    const s = e.target.value;
                    setGStar(s);
                    if (s && NAK_TO_RASI[s]) setGRasi(NAK_TO_RASI[s]);
                  }}
                  className="input-mobile"
                >
                  <option value="">— select —</option>
                  {NAKSHATRAS.map((n) => <option key={n.en} value={n.en}>{te ? `${n.te} (${n.en})` : n.en}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[12px] font-bold">{te ? "వరుని రాశి" : "Groom rasi"}</label>
                <select aria-label={te ? "వరుని రాశి" : "Groom rasi"} value={gRasi} onChange={(e) => setGRasi(e.target.value)} className="input-mobile">
                  <option value="">— auto —</option>
                  {RASIS.map((r) => <option key={r.en} value={r.en}>{te ? `${r.te} (${r.en})` : r.en}</option>)}
                </select>
              </div>
              <div className="col-span-2 md:col-span-4">
                <button type="button" onClick={calcByStar} disabled={busy}
                  className="w-full py-3.5 rounded-2xl maroon-gradient text-white font-bold text-[13px] disabled:opacity-60">
                  {busy ? "Calculate…" : te ? "💍 గుణమేళనం చూడు (నక్షత్రంతో)" : "💍 See Gunamelanam (by star)"}
                </button>
              </div>
            </div>
          )}
          {myId && mode === "id" && (
            <div className="mt-2 text-[11px] text-gray-600">
{te ? <>మీ ID: <b className="font-mono">{myId}</b> —{" "}
              <button type="button" onClick={() => calcById(myId, groom || bride)} className="text-maroon font-bold underline">
                నా ID ని వేరే profile తో compare చెయ్యి
              </button></> : <>Your ID: <b className="font-mono">{myId}</b> —{" "}
              <button type="button" onClick={() => calcById(myId, groom || bride)} className="text-maroon font-bold underline">
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
            <button type="button" onClick={() => void checkGothram()} disabled={gBusy}
              className="py-3 rounded-2xl maroon-gradient text-white font-bold text-[13px] disabled:opacity-60">
              {gBusy ? "…" : te ? "🛡️ Check" : "🛡️ Check"}
            </button>
          </div>
          {gRes?.note && (
            <p role="status" className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-2 text-[12px] font-medium text-slate-700">
              {gRes.note}
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
                      👰 {res.bride?.full_name || res._bride} — <b>{brideStarLabel || "—"}</b>, {brideRasiLabel || "—"}<br />
                      🤵 {res.groom?.full_name || res._groom} — <b>{groomStarLabel || "—"}</b>, {groomRasiLabel || "—"}
                    </div>
                  )}
                  {(te ? res.doshas : (res.doshas_en || []).map((item: string) => apiDisplayMessage({ message_en: item }, false, "")).filter(Boolean))?.length ? (
                    <div className="mt-2 inline-block bg-rose-50 border border-rose-200 text-rose-800 rounded-xl px-3 py-1.5 text-[11px] font-bold">
                      {te
                        ? <>⚠️ సమీక్షించాల్సిన అంశాలు: {res.doshas.join(" + ")} — కుటుంబ పెద్దలు లేదా అర్హులైన సలహాదారుతో చర్చించండి.</>
                        : <>⚠️ Items marked for review: {(res.doshas_en || []).map((item: string) => apiDisplayMessage({ message_en: item }, false, "")).filter(Boolean).join(" + ") || "See the individual checks."} — consult a qualified adviser if relevant.</>}
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
                        <span className="text-[13px] font-bold text-ink">{it.no}. {te ? it.name : (it.name_en || `Porutham check ${it.no}`)}</span>
                        {te ? <span className="text-[11px] text-gray-500 telugu">{it.telugu}</span> : null}
                      </div>
                      <div className={`mt-1 text-[11px] text-gray-700 leading-relaxed ${te ? "telugu" : ""}`}>
                        {te ? it.note : apiDisplayMessage({ message_en: it.note_en }, false, "Rule explanation is not available in English.")}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className={`mt-3 bg-cream rounded-2xl p-3 text-[11px] text-gray-700 leading-relaxed ${te ? "telugu" : ""}`}>
                🕉️ {te
                  ? (res.advice_telugu || res.reason || "వివరాలు అందుబాటులో లేవు.")
                  : apiDisplayMessage({ message_en: res.advice_en || res.reason_en }, false, "This is a limited reference. Review each item separately; it is not a marriage recommendation.")}
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
                <button type="button" onClick={() => window.print()} className="px-4 py-3 rounded-2xl maroon-gradient text-white font-bold text-[12px]">🖨️ Print View</button>
                <button type="button" onClick={shareWa} title={te ? "బాహ్య WhatsApp share తెరుస్తుంది; availability తనిఖీ చేయబడదు" : "Opens external WhatsApp sharing; availability is not checked"} className="px-4 py-3 rounded-2xl bg-[#25D366] text-white font-bold text-[12px]">{te ? "WhatsApp లో షేర్" : "Share via WhatsApp"}</button>
                {!res._byStar && <button type="button" onClick={shareImg} className="px-4 py-3 rounded-2xl border border-maroon/25 text-maroon font-bold text-[12px]">{te ? "🖼️ నివేదిక చిత్రం" : "🖼️ Report image"}</button>}
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
                  alt={te ? "గుణమేళనం సూచిక నివేదిక" : "Porutham reference report"}
                  className="mt-3 w-full rounded-2xl border border-gold/30"
                />
              </div>
            )}
          </>
        )}

        {/* ---------- glossary ---------- */}
        <div className="bg-white rounded-[1.5rem] border border-gold/25 p-5 print:hidden">
          <div className="font-bold text-maroon text-[15px]">{te ? "📚 ఈ పది నియమ-ఆధారిత checks గురించి (సమాచారం కోసం మాత్రమే)" : "📚 About these ten rule-based checks (informational only)"}</div>
          <div className={`mt-3 grid md:grid-cols-2 gap-2 text-[11px] text-gray-700 leading-relaxed ${te ? "telugu" : ""}`}>
            {(te ? [
              ["రాశి పొంతన", "ఈ లెక్కలో రాశుల మధ్య 6/8 స్థాన నియమాన్ని తనిఖీ చేస్తుంది."],
              ["నక్షత్ర / దిన గుణం", "నక్షత్రాల మధ్య నిర్వచించిన వేధ జంట ఉందో పరిశీలిస్తుంది."],
              ["గణ మైత్రి", "ఎంచుకున్న నక్షత్రాల గణ వర్గాలను పట్టికతో పోలుస్తుంది."],
              ["యోని పొంతన", "నక్షత్రాలకు కేటాయించిన యోని వర్గాలు వ్యతిరేక జంటలో ఉన్నాయో చూస్తుంది."],
              ["రజ్జు శుద్ధి", "రెండు నక్షత్రాలు ఒకే రజ్జు సమూహంలో ఉన్నాయో తనిఖీ చేస్తుంది."],
              ["వేధ పరిశీలన", "నిర్వచించిన నక్షత్ర వేధ జంటలో ఈ నక్షత్రాలు ఉన్నాయో చూస్తుంది."],
              ["మాహేంద్ర పొంతన", "ఈ నియమంలో జాబితా చేసిన నక్షత్ర దూరాలను పరిశీలిస్తుంది."],
              ["స్త్రీ దీర్ఘం", "వరుని నక్షత్రం నుంచి వధువు నక్షత్రం వరకు దూరం 13 లేదా అంతకంటే ఎక్కువ ఉందో చూస్తుంది."],
              ["వశ్య పొంతన", "రాశులకు ఇచ్చిన వశ్య వర్గాలు లేదా స్నేహ జంటలను పోలుస్తుంది."],
              ["రాశ్యాధిపతి మైత్రి", "రాశి అధిపతుల సంబంధాన్ని ఈ నియమ పట్టికతో పోలుస్తుంది."],
            ] : [
              ["Rasi compatibility", "Checks whether the rasi distance falls in the listed 6/8 positions."],
              ["Nakshatra / Dina", "Checks for a Vedha pair defined in the reference table."],
              ["Gana compatibility", "Compares the selected nakshatras’ gana categories with the rule table."],
              ["Yoni compatibility", "Checks whether the assigned yoni categories form a listed opposing pair."],
              ["Rajju", "Checks whether both nakshatras fall in the same Rajju group."],
              ["Vedha", "Checks whether the selected nakshatras form a listed Vedha pair."],
              ["Mahendra", "Checks the nakshatra distances listed for this rule."],
              ["Stree Deergha", "Checks whether the count from the groom’s nakshatra to the bride’s is at least 13."],
              ["Vashya", "Compares the rasi Vashya groups and listed friendly pairs."],
              ["Rasi lord relationship", "Checks the planetary-lord relationship in the rule table."],
            ]).map(([title, description]) => (
              <div key={title} className="bg-cream rounded-xl p-2.5 border border-gold/20">
                <div className="font-bold text-maroon">{title}</div>
                <div className="mt-0.5">{description}</div>
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

function PoruthamLoading() {
  const { lang } = useLang();
  return <div className="min-h-dvh bg-cream p-8 text-center text-[13px]">{lang === "te" ? "వేద గుణమేళనం లోడ్ అవుతోంది…" : "Loading the Porutham reference…"}</div>;
}

export default function PoruthamPage() {
  return (
    <Suspense fallback={<PoruthamLoading />}>
      <PoruthamInner />
    </Suspense>
  );
}
