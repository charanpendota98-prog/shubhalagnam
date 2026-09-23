"use client";

/**
 * /porutham — 10-PORUTHAM FULL REPORT (advanced, printable, shareable) 💍
 * ======================================================================
 * Top matrimony sites lo "kundli match" paid add-on (₹300+). Manam:
 *   • 10 porutham lu — prathi daaniki pass/fail + Telugu note
 *   • Score /10 + stars + Telugu verdict + dosha (రజ్జు/వేధ) alert
 *   • WhatsApp lo share cheyyadaniki ready-made report IMAGE (backend Pillow)
 *   • 🖨️ Print / Save as PDF (purohitulu/pedda vaallaki chupinchadaniki)
 *   • Star teliyakapote — star/rasi direct ga select chesi kooda calculate cheyyachu
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
  }, []);

  const checkGothram = async () => {
    if (!gA.trim() || !gB.trim()) { setGRes({ verdict_telugu: te ? "రెండు Profile IDs ఇవ్వండి" : "Enter both Profile IDs" }); return; }
    setGBusy(true);
    try {
      const d = await fetch(`/api/gothram/check?a=${encodeURIComponent(gA.trim().toUpperCase())}&b=${encodeURIComponent(gB.trim().toUpperCase())}`).then((r) => r.json());
      setGRes(d.detail ? { verdict_telugu: d.detail, blocked: false } : d);
    } catch { setGRes({ verdict_telugu: te ? "Network problem" : "Network problem", blocked: false }); }
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
    const txt = `💍 వేద గుణమేళనం & జాతక పొంతన రిపోర్ట్ — మన వివాహ\n${res.bride?.full_name || res._bride} ❤️ ${res.groom?.full_name || res._groom}\n`
      + `Score: ${res.score}/${res.max_score} (${res.stars}★)\n${res.verdict}\n`
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
    <main className="min-h-screen bg-cream pb-36">
      <section className="maroon-gradient text-white print:!bg-white print:!text-maroon">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-[11px] font-bold bg-white/10 border border-white/20 rounded-full px-3 py-1 inline-block">
            💍 <Duo en="Jyothishyam (Astrology) • Vedic Gunamelanam" te="వేద జ్యోతిషం • వివాహ గుణమేళనం & జాతక పొంతన" />
          </div>
          <h1 className="mt-3 text-2xl md:text-3xl font-bold"><Duo en="Jyothishyam — Vedic Marriage Gunamelanam Full Report" te="జ్యోతిషం — వివాహ గుణమేళనం & జాతక పొంతన పూర్తి రిపోర్ట్" /></h1>
          <p className="mt-2 text-[13px] md:text-sm opacity-90 telugu max-w-3xl">
{te ? <>రాశి • నక్షత్రం • గణం • యోని • రజ్జు • వేధ • మాహేంద్ర • స్త్రీదీర్ఘ • వశ్య • రాశ్యాధిపతి —
            సంపూర్ణ వేద గుణమేళనం ఒకేచోట, స్పష్టమైన తెలుగు వివరణతో. రజ్జు/వేధ దోషాలుంటే ముందే సూచిస్తాం.</> : <>Rasi • Nakshatra • Gana • Yoni • Rajju • Vedha • Mahendra • Stree Deergha • Vashya • Rasi Adhipathi —
            complete Vedic Gunamelanam in one place with Telugu explanation. We warn early about Rajju/Vedha dosha.</>}
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
            <span className="bg-white/10 border border-white/20 rounded-full px-3 py-1.5">📄 Print/PDF report</span>
            <span className="bg-white/10 border border-white/20 rounded-full px-3 py-1.5">🖼️ WhatsApp share image</span>
            <span className="bg-white/10 border border-white/20 rounded-full px-3 py-1.5">🎁 Add-on ₹49 lo detailed</span>
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
                <input value={bride} onChange={(e) => setBride(e.target.value.toUpperCase())} placeholder="RED001" className="input-mobile font-mono" />
              </div>
              <div>
                <label className="text-[12px] font-bold">🤵 Groom Profile ID</label>
                <input value={groom} onChange={(e) => setGroom(e.target.value.toUpperCase())} placeholder="RED001" className="input-mobile font-mono" />
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

        {/* ---------- gothram checker ---------- */}
        <div className="bg-white rounded-[1.5rem] border border-gold/25 p-4 print:hidden">
          <div className="font-bold text-maroon text-[14px]">{te ? "🛡️ గోత్రం check — same గోత్రం అయితే పెళ్లి కూడదు" : "🛡️ Gothram check — same gothram blocks marriage"}</div>
          <div className="mt-2 grid md:grid-cols-3 gap-2">
            <input value={gA} onChange={(e) => setGA(e.target.value.toUpperCase())} placeholder="Profile ID - A" className="input-mobile font-mono" aria-label="Profile ID A" />
            <input value={gB} onChange={(e) => setGB(e.target.value.toUpperCase())} placeholder="Profile ID - B" className="input-mobile font-mono" aria-label="Profile ID B" />
            <button onClick={() => void checkGothram()} disabled={gBusy}
              className="py-3 rounded-2xl maroon-gradient text-white font-bold text-[13px] disabled:opacity-60">
              {gBusy ? "…" : te ? "🛡️ Check" : "🛡️ Check"}
            </button>
          </div>
          {gRes?.verdict_telugu && (
            <p className={`mt-2 rounded-xl border p-2 text-[12px] font-bold ${gRes.blocked ? "border-red-300 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-900"}`}>
              {gRes.verdict_telugu}
            </p>
          )}
        </div>

        {/* ---------- report ---------- */}
        {res && (
          <>
            <div className="bg-white rounded-[1.5rem] border border-gold/25 p-5">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="shrink-0 w-[124px] h-[124px] rounded-full maroon-gradient text-center flex flex-col items-center justify-center mx-auto md:mx-0">
                  <div className="text-4xl font-bold text-white">{res.score}<span className="text-[16px] opacity-80">/10</span></div>
                  <div className="text-[10px] text-[#EAD08A] mt-0.5">{res.percent}%</div>
                </div>
                <div className="flex-1 text-center md:text-left">
                  <div className="text-[17px] font-bold text-maroon telugu">{res.verdict}</div>
                  <div className="mt-1 text-[13px] text-gray-700">
                    {"★".repeat(res.stars || 0)}{"☆".repeat(5 - (res.stars || 0))} •{" "}
                    {res.available ? (te ? `${items.filter((i) => i.pass).length} గుణాలు అనుకూలం` : `${items.filter((i) => i.pass).length} points matched`) : (te ? "డేటా సరిపోలేదు" : "not enough data")}
                  </div>
                  {res.available && (
                    <div className="mt-1.5 text-[12px] text-gray-700">
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

              <div className="mt-4 flex flex-wrap gap-2 print:hidden">
                <button onClick={() => window.print()} className="px-4 py-3 rounded-2xl maroon-gradient text-white font-bold text-[12px]">🖨️ Print / PDF రిపోర్ట్</button>
                <button onClick={shareWa} className="px-4 py-3 rounded-2xl bg-green-600 text-white font-bold text-[12px]">WhatsApp లో షేర్</button>
                {!res._byStar && <button onClick={shareImg} className="px-4 py-3 rounded-2xl border border-maroon/25 text-maroon font-bold text-[12px]">🖼️ రిపోర్ట్ ఇమేజ్</button>}
                <Link href="/requests" className="px-4 py-3 rounded-2xl border border-maroon/25 text-maroon font-bold text-[12px]">{te ? "💌 Interest పంపు (1 credit)" : "💌 Send interest (1 credit)"}</Link>
              </div>
            </div>

            {/* ---------- rasi charts ---------- */}
            {(chartB || chartG) && (
              <div className="grid md:grid-cols-2 gap-3 print:hidden">
                {chartB && <RasiChart houses={chartB.houses} moonHouse={chartB.moon_house} star={chartB.star} rasi={chartB.rasi} title={`👰 ${res._bride}`} />}
                {chartG && <RasiChart houses={chartG.houses} moonHouse={chartG.moon_house} star={chartG.star} rasi={chartG.rasi} title={`🤵 ${res._groom}`} />}
              </div>
            )}

            {/* ---------- report image preview ---------- */}
            {!res._byStar && imgOk && (
              <div className="bg-white rounded-[1.5rem] border border-gold/25 p-4 print:hidden">
                <div className="font-bold text-maroon text-[14px]">{te ? "🖼️ WhatsApp లో షేర్ చేయడానికి గుణమేళనం ఇమేజ్" : "🖼️ Gunamelanam image ready to share on WhatsApp"}</div>
                <div className="text-[11px] text-gray-600 mt-1">
                  {te ? "ఈ ఇమేజ్‌ని WhatsApp గ్రూప్ / ఫ్యామిలీకి పంపండి — స్కోర్, గుణాలు, తీర్పు అన్నీ కనిపిస్తాయి." : "Send this image to WhatsApp group / family — score, points, verdict all visible."}
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
          <div className="font-bold text-maroon text-[15px]">{te ? "📚 వేద గుణమేళనం & జాతక పొంతన అంటే ఏమిటి? (పెళ్లి పెద్దలు చూసే ముఖ్య విషయాలు)" : "📚 What are the 10 Vedic Kundli Compatibility Factors?"}</div>
          <div className="mt-3 grid md:grid-cols-2 gap-2 text-[11px] text-gray-700 telugu leading-relaxed">
            {[
              ["రాశి పొంతన (Rasi Koota)", "వధూవరుల రాశుల మధ్య దూరం 6/8 కాకూడదు (షష్టాష్టక దోష నివారణ)."],
              ["దిన / నక్షత్ర గుణం (Dina Koota)", "నక్షత్రాల మధ్య వేధ (విరోధం) లేకుండా ఆరోగ్య ఆయుష్షులను సూచిస్తుంది."],
              ["గణ మైత్రి (Gana Koota)", "దేవ–మనుష్య–రాక్షస గణాల పొంతన (స్వభావం + మానసిక అనుకూలత)."],
              ["యోని పొంతన (Yoni Koota)", "శారీరక & దాంపత్య సుఖం (శత్రు యోనులు కాకుండా మైత్రి)."],
              ["రజ్జు శుద్ధి (Rajju Koota)", "⚠️ అత్యంత ముఖ్యం — ఒకే రజ్జు కాకుండా దీర్ఘాయుష్షు & మాంగల్య బలం."],
              ["వేధ దోష పరిశీలన (Vedha Koota)", "⚠️ ముఖ్యం — పరస్పర నక్షత్ర వేధ లేకుండా శుభప్రదం."],
              ["మాహేంద్ర పొంతన (Mahendra Koota)", "సంతాన భాగ్యం & ఐశ్వర్య వృద్ధి కొరకు."],
              ["స్త్రీ దీర్ఘం (Stree Deergha)", "స్త్రీకి దీర్ఘ సుమంగళి యోగం & సౌభాగ్యం."],
              ["వశ్య పొంతన (Vashya Koota)", "పరస్పర ఆకర్షణ, అవగాహన మరియు గౌరవం."],
              ["రాశ్యాధిపతి మైత్రి (Graha Maitri)", "రాశి అధిపతుల మిత్రత్వం — శాశ్వత దాంపత్య బలం."],
            ].map(([t, d]) => (
              <div key={t} className="bg-cream rounded-xl p-2.5 border border-gold/20">
                <div className="font-bold text-maroon">{t}</div>
                <div className="mt-0.5">{d}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 text-[11px] text-gray-500">
            {te ? <>🎁 <b>సంపూర్ణ గుణమేళనం జాతక రిపోర్ట్ (PDF + వేద పురోహితుల సంప్రదింపులు)</b> — కేవలం ₹49.</> : <>🎁 <b>Complete Kundli Gunamelanam report (PDF + purohit consult)</b> — just ₹49.</>}
          </div>
        </div>
      </div>
    </main>
  );
}

export default function PoruthamPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-cream p-8 text-center text-[13px]">వేద గుణమేళనం లోడ్ అవుతుంది…</main>}>
      <PoruthamInner />
    </Suspense>
  );
}
