"use client";

/**
 * 🤳 WAVE 17 — Verify Profile (live selfie → separately recorded review status).
 * Screenshot 6 standard: Verify Profile + Skip + "Verify with a live selfie" card.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Duo, duo } from "@/lib/duo";
import { useLang } from "@/lib/lang";
import { apiDisplayMessage, authHeaders, TSAP_KEY, readApiJson } from "@/lib/api";
import VerificationProgress from "@/components/VerificationProgress";

export default function VerifyPage() {
  const { lang } = useLang();
  const te = lang === "te";
  const qp = useSearchParams();
  const [tsapId, setTsapId] = useState("");
  const [status, setStatus] = useState("none");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      setTsapId(qp.get("id") || localStorage.getItem(TSAP_KEY) || "");
    } catch { /* ignore */ }
  }, [qp]);

  const load = useCallback(async () => {
    if (!tsapId) return;
    try {
      const r = await fetch(`/api/photo/status/${encodeURIComponent(tsapId)}`, {
        headers: authHeaders(),
        credentials: "same-origin",
        cache: "no-store",
      });
      if (r.ok) {
        const d = await readApiJson(r);
        setStatus(d.selfie_verified ? "approved" : (d.selfie_status || "none"));
      }
    } catch { /* offline */ }
  }, [tsapId]);

  useEffect(() => { void load(); }, [load]);

  const upload = async (f: File | undefined) => {
    if (!f || !tsapId) return;
    setBusy(true); setMsg("");
    try {
      const fd = new FormData();
      fd.append("file", f);
      fd.append("tsap_id", tsapId);
      const r = await fetch("/api/verify/selfie", {
        method: "POST",
        headers: authHeaders(false, false),
        credentials: "same-origin",
        body: fd,
      });
      const d = await readApiJson(r).catch(() => ({}));
      if (!r.ok) {
        setMsg(apiDisplayMessage(d, te, te ? "Selfie fail — మళ్లీ try చెయ్యండి" : "Selfie upload failed. Please try again."));
      } else {
        setMsg(apiDisplayMessage(d, te, te ? "Selfie వెళ్లింది ✅" : "Selfie submitted for review."));
        await load();
      }
    } catch {
      setMsg(te ? "Network లేదు — మళ్లీ try చెయ్యండి" : "No network — retry");
    }
    setBusy(false);
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 pb-36">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl sm:text-2xl font-extrabold text-maroon min-w-0">🤳 <Duo en="Verify Profile" te="ప్రొఫైల్ ధృవీకరణ" /></h1>
        <Link href="/matches" className="text-[13px] font-bold text-maroon shrink-0"><Duo en="Skip for now ›" te="ప్రస్తుతానికి దాటవేయి ›" /></Link>
      </div>

      <section className="mt-4 rounded-2xl border border-gold/30 card-shadow bg-gradient-to-br from-emerald-50 to-white p-6">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="relative shrink-0">
            <div className="w-28 h-28 rounded-full bg-white border-4 border-maroon/20 flex items-center justify-center text-5xl">🧑</div>
            <div className="absolute -bottom-1 -right-1 w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xl border-4 border-white">✓</div>
          </div>
          <div className="flex-1 text-center sm:text-left">
            <div className="font-bold text-[16px]"><Duo en="Verify the profile using the below option:" te="కింది విధంగా ప్రొఫైల్ ధృవీకరించండి:" /></div>
            {status === "approved" ? (
              <div className="mt-3 rounded-xl bg-emerald-100 border border-emerald-300 p-3 font-bold text-emerald-900 text-[13px]">
                ✅ <Duo en="Selfie review status recorded on your profile." te="సెల్ఫీ సమీక్ష స్థితి మీ ప్రొఫైల్‌లో నమోదు చేయబడింది." />
              </div>
            ) : status === "pending" ? (
              <div className="mt-3 rounded-xl bg-amber-50 border border-amber-300 p-3 text-[13px] telugu">
                ⏳ <b>{duo("Selfie under review", "సెల్ఫీ పరిశీలనలో ఉంది")}</b> — {duo("you get the badge once admin approves", "అడ్మిన్ ఆమోదించగానే బ్యాడ్జ్ వస్తుంది")}
                <button type="button" aria-label={te ? "సమీక్ష స్థితిని మళ్లీ తనిఖీ చేయండి" : "Refresh review status"} onClick={() => void load()} className="ml-2 font-bold text-maroon underline">↻</button>
              </div>
            ) : (
              <>
                <input aria-label={te ? "సెల్ఫీ ఎంచుకోండి" : "Choose selfie"} ref={fileRef} type="file" accept="image/*" capture="user" className="hidden"
                  onChange={(e) => void upload(e.target.files?.[0])} />
                <button disabled={busy || !tsapId} onClick={() => fileRef.current?.click()}
                  className="mt-3 w-full rounded-xl border-2 border-maroon/40 bg-white p-3 flex items-center gap-3 hover:border-maroon disabled:opacity-50 text-left">
                  <span className="text-2xl">🤳</span>
                  <span className="flex-1">
                    <span className="block font-bold text-[14px]"><Duo en="Verify with a live selfie" te="లైవ్ సెల్ఫీతో ధృవీకరించండి" /></span>
                    <span className="block text-[12px] text-gray-600 telugu">
                      {busy ? duo("Validating… please wait", "పరిశీలిస్తున్నాం…") : duo("Take a selfie and verify yourself", "సెల్ఫీ తీసి మిమ్మల్ని ధృవీకరించండి")}
                    </span>
                  </span>
                  <span className="text-maroon text-xl">›</span>
                </button>
              </>
            )}
            {!tsapId ? (
              <p className="mt-2 text-[12px] text-amber-700">⚠️ {duo("verify after login/register", "లాగిన్/రిజిస్టర్ అయ్యాక ధృవీకరించండి")}</p>
            ) : null}
            {msg ? <p className="mt-2 text-[13px] font-medium text-maroon telugu">{msg}</p> : null}
          </div>
        </div>
        <p className="mt-4 text-[11px] text-gray-500 telugu">
          {duo("Uploads receive technical checks and a separate staff review. A recorded check does not verify every profile detail or guarantee responses.",
               "అప్‌లోడ్‌లకు సాంకేతిక తనిఖీలు, వేరుగా staff review ఉంటాయి. నమోదైన తనిఖీ అన్ని profile వివరాలను నిర్ధారించదు; స్పందనలకూ హామీ కాదు.")}
        </p>
      </section>

      {/* 🧾 WAVE 43 — what is recorded, what is not, and what to do next */}
      <VerificationProgress tsapId={tsapId} />
    </div>
  );
}
