"use client";

import "@/components/private-fallback.css";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LockKeyhole, LoaderCircle, MessageSquare, CircleCheck } from "lucide-react";
import { useParams } from "next/navigation";
import { readApiJson } from "@/lib/api";
import { useLang } from "@/lib/lang";

export default function ElderReviewClient() {
  const { lang } = useLang();
  const te = lang === "te";
  const params = useParams();
  const token = String(params?.token || "");
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [feedbackError, setFeedbackError] = useState(false);

  const [reviewerName, setReviewerName] = useState("");
  const [relation, setRelation] = useState("Family Elder");
  const [note, setNote] = useState("");
  const [fbSent, setFbSent] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) return;
    let active = true;
    setLoading(true); setData(null); setErr(""); setFbSent("");
    setReviewerName(""); setRelation("Family Elder"); setNote("");
    fetch(`/api/review-links/${encodeURIComponent(token)}`, { cache: "no-store" })
      .then(async (r) => {
        const d = await readApiJson(r);
        if (!active) return;
        if (r.ok && d?.success === true && d.profile && typeof d.profile === "object") setData(d);
        else setErr(r.status === 404 ? "unavailable" : "network");
      })
      .catch(() => { if (active) setErr("network"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token, attempt]);

  const sendFeedback = async () => {
    if (busy || !data?.profile || reviewerName.trim().length < 2 || note.trim().length < 3) return;
    setBusy(true); setFbSent(""); setFeedbackError(false);
    try {
      const r = await fetch(`/api/review-links/${encodeURIComponent(token)}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewer_name: reviewerName, relation, note }),
      });
      const d = await readApiJson(r);
      if (r.ok && d.success === true) {
        setNote("");
        setFbSent(te ? "మీ note ప్రొఫైల్ యజమాని పరిశీలన కోసం సేవ్ అయింది." : "Your note was saved for the profile owner to review.");
      } else {
        setFeedbackError(true);
        setFbSent(d?.detail || (te ? "Note సేవ్ కాలేదు. మీ వివరాలు ఇక్కడే ఉన్నాయి." : "The note was not saved. Your entries are still here."));
      }
    } catch {
      setFeedbackError(true);
      setFbSent(te ? "Note సేవ్ అయిందో నిర్ధారించలేకపోయాం. మళ్లీ పంపే ముందు ప్రొఫైల్ యజమానితో చెక్ చేయండి." : "Could not confirm whether the note was saved. Check with the profile owner before sending it again.");
    } finally {
      setBusy(false);
    }
  };

  const p = data?.profile;

  return (
    <div className="mv-private-fallback min-h-dvh bg-[#FFF8E7] px-4 py-8 pb-24">
      <div className="mx-auto max-w-2xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="text-xs font-bold text-[#7A0C2E]">
            ← {te ? "మన వివాహ హోమ్" : "Mana Vivaha Home"}
          </Link>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-bold text-amber-900">
            <LockKeyhole aria-hidden="true" focusable="false" className="mr-1 inline-block h-3 w-3 align-text-bottom" />{te ? "ప్రైవేట్ కుటుంబ పరిశీలన లింక్" : "Private Family Review Link"}
          </span>
        </div>

        {loading && (
          <div className="rounded-3xl bg-white p-8 text-center text-sm font-bold text-[#7A0C2E]">
            <h1><LoaderCircle aria-hidden="true" focusable="false" className="mr-1 inline-block h-4 w-4 align-text-bottom motion-safe:animate-spin" />{te ? "బయోడేటా వివరాలు లోడ్ అవుతున్నాయి…" : "Loading biodata summary…"}</h1>
          </div>
        )}

        {!loading && err && (
          <div className="rounded-3xl border border-rose-200 bg-white p-8 text-center space-y-3">
            <LockKeyhole aria-hidden="true" focusable="false" className="mx-auto h-8 w-8 text-maroon" />
            <h1 className="text-lg font-extrabold text-[#7A0C2E]">
              {te ? "రివ్యూ లింక్ అందుబాటులో లేదు" : "Review Link Unavailable"}
            </h1>
            <p role="alert" className="text-xs text-slate-600">{err === "unavailable"
              ? (te ? "ఈ లింక్ దొరకలేదు, గడువు ముగిసింది, రద్దయింది లేదా view limit చేరింది. ప్రొఫైల్ యజమానిని సంప్రదించండి." : "The link was not found, expired, revoked or reached its view limit. Ask the profile owner for help.")
              : (te ? "ప్రస్తుతం లింక్ వివరాలను నిర్ధారించలేకపోయాం. ఇది లింక్ గడువు ముగిసిందని కాదు." : "The link could not be checked right now. This does not confirm it has expired.")}</p>
            {err === "network" && <>
              <p className="text-xs text-slate-600">{te ? "మళ్లీ తెరిస్తే మిగిలిన views లో ఒకటి తగ్గవచ్చు." : "Opening it again may use another remaining view."}</p>
              <button type="button" onClick={() => setAttempt(x => x + 1)} className="rounded-xl bg-maroon px-4 py-2 text-white font-bold">{te ? "మళ్లీ ప్రయత్నించండి" : "Try again"}</button>
            </>}
          </div>
        )}

        {!loading && p && (
          <>
            <section className="rounded-3xl border-2 border-[#D4AF37]/50 bg-white p-6 shadow-sm space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
                    {data.label || (te ? "కుటుంబ పెద్దల పరిశీలన" : "Family Review")}
                  </div>
                  <h1 className="mt-1 text-2xl font-extrabold text-[#7A0C2E]">
                    {p.first_name} <span className="font-mono text-sm text-slate-500">({p.tsap_id})</span>
                  </h1>
                </div>
                <div className="text-right text-[11px] text-slate-500">
                  <div>{te ? `మిగిలిన వీక్షణలు: ${data.views_remaining}` : `Views remaining: ${data.views_remaining}`}</div>
                  <div>{te ? `గడువు: ${String(data.expires_at).slice(0, 10)}` : `Expires: ${String(data.expires_at).slice(0, 10)}`}</div>
                </div>
              </div>

              {p.photo_private ? (
                <div className="rounded-2xl bg-amber-50 border border-amber-200 px-4 py-2.5 text-xs text-amber-900">
                  <LockKeyhole aria-hidden="true" focusable="false" className="mr-1 inline-block h-3 w-3 align-text-bottom" />{te ? "ప్రొఫైల్ యజమాని ఫోటో ప్రైవసీ ఆన్ చేశారు (ఈ లింక్‌లో ఫోటో దాచబడింది)." : "Photo privacy is enabled by the profile owner (photo withheld on review links)."}
                </div>
              ) : null}

              <dl className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
                {[
                  [te ? "వయస్సు / ఎత్తు" : "Age / Height", [p.age ? `${p.age} yrs` : "", p.height].filter(Boolean).join(" • ") || "—"],
                  [te ? "వైవాహిక స్థితి" : "Marital Status", p.marital_status || "—"],
                  [te ? "మతం / కులం" : "Community", [p.religion, p.caste, p.sub_caste].filter(Boolean).join(" • ") || "—"],
                  [te ? "గోత్రం" : "Gothram", p.gothram || "—"],
                  [te ? "నక్షత్రం / రాశి" : "Star / Rasi", [p.star, p.rasi].filter(Boolean).join(" / ") || "—"],
                  [te ? "విద్య" : "Education", [p.education, p.education_detail].filter(Boolean).join(" ") || "—"],
                  [te ? "ఉద్యోగం" : "Occupation", p.job || "—"],
                  [te ? "ఆదాయం" : "Income", p.salary || "—"],
                  [te ? "ప్రాంతం" : "Location", [p.district, p.state, p.country].filter(Boolean).join(", ") || "—"],
                ].map(([label, val]) => (
                  <div key={String(label)} className="rounded-xl bg-[#FAF7F2] p-3">
                    <dt className="text-[10px] font-bold text-slate-500">{label}</dt>
                    <dd className="mt-0.5 font-bold text-slate-900">{val}</dd>
                  </div>
                ))}
              </dl>

              {p.about_myself && (
                <div className="rounded-2xl bg-slate-50 p-3.5 text-xs text-slate-700 leading-relaxed">
                  <b>{te ? "పరిచయం:" : "About:"}</b> {p.about_myself}
                </div>
              )}

              <p className="rounded-xl bg-rose-50/70 px-3 py-2 text-[11px] text-slate-600">
                {te ? p.disclaimer_te : p.disclaimer_en}
              </p>
            </section>

            <section className="rounded-3xl border border-gold/30 bg-white p-5 space-y-3">
              <h2 className="text-sm font-extrabold text-[#7A0C2E]">
                <MessageSquare aria-hidden="true" focusable="false" className="mr-1 inline-block h-4 w-4 align-text-bottom" />{te ? "కుటుంబ అభిప్రాయం / ఆశీస్సులు పంపండి" : "Share Family Note with Profile Owner"}
              </h2>
              <p id="elder-feedback-privacy" className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-950">
                {te
                  ? "గోప్యత కోసం, మీ పేరు, బంధుత్వం లేదా note లోని ఫోన్ నంబర్లు, ఇమెయిల్ చిరునామాలు సేవ్ చేసే ముందు దాచబడవచ్చు. సంప్రదింపు వివరాలు రాయవద్దు."
                  : "For privacy, phone numbers and email addresses in your name, relation or note may be hidden before saving. Do not include contact details."}
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="text-xs font-bold">{te ? "మీ పేరు" : "Your name"}<input
                  maxLength={60}
                  value={reviewerName}
                  onChange={(e) => setReviewerName(e.target.value)}
                  placeholder={te ? "మీ పేరు (ఉదా: లక్ష్మి పెద్దమ్మ)" : "Your name (e.g. Lakshmi Aunt)"}
                  aria-label="Reviewer name"
                aria-describedby="elder-feedback-privacy"
                  className="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                />
                </label><label className="text-xs font-bold">{te ? "బంధుత్వం" : "Relation"}<input
                  maxLength={40}
                  value={relation}
                  onChange={(e) => setRelation(e.target.value)}
                  placeholder={te ? "బంధుత్వం (ఉదా: మామయ్య / పెద్దమ్మ)" : "Relation (e.g. Uncle / Aunt)"}
                  aria-label="Reviewer relation"
                aria-describedby="elder-feedback-privacy"
                  className="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                />
              </label></div>
              <label className="block text-xs font-bold">{te ? "మీ private note" : "Your private note"}<textarea
                maxLength={300}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder={te ? "మీ సూచనను ఇక్కడ రాయండి…" : "Write your private review note for the profile owner…"}
                aria-label="Elder review note"
                aria-describedby="elder-feedback-privacy"
                className="w-full rounded-xl border border-slate-200 p-3 text-xs"
              />
              </label><button
                type="button"
                disabled={busy || reviewerName.trim().length < 2 || note.trim().length < 3}
                onClick={() => void sendFeedback()}
                className="rounded-xl bg-[#7A0C2E] px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
              >
                {te ? "అభిప్రాయం పంపండి" : "Send Private Note"}
              </button>
              {fbSent && <p role={feedbackError ? "alert" : "status"} className={`text-xs font-bold ${feedbackError ? "text-rose-800" : "text-emerald-800"}`}>{!feedbackError && <CircleCheck aria-hidden="true" focusable="false" className="mr-1 inline-block h-4 w-4 align-text-bottom" />}{fbSent}</p>}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
