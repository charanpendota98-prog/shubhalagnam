"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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

  const [reviewerName, setReviewerName] = useState("");
  const [relation, setRelation] = useState("Family Elder");
  const [note, setNote] = useState("");
  const [fbSent, setFbSent] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetch(`/api/review-links/${encodeURIComponent(token)}`)
      .then(async (r) => {
        const d = await readApiJson(r);
        if (r.ok && d?.success) setData(d);
        else setErr(d?.detail || (te ? "ఈ రివ్యూ లింక్ గడువు ముగిసింది లేదా రద్దు చేయబడింది." : "This review link has expired or was revoked by the profile owner."));
      })
      .catch(() => setErr(te ? "లింక్ తెరవలేకపోయాము." : "Could not open review link."))
      .finally(() => setLoading(false));
  }, [token, te]);

  const sendFeedback = async () => {
    if (reviewerName.trim().length < 2 || note.trim().length < 3) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/review-links/${encodeURIComponent(token)}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewer_name: reviewerName, relation, note }),
      });
      const d = await readApiJson(r);
      if (r.ok && d.success) {
        setNote("");
        setFbSent(te ? "✅ మీ అభిప్రాయం / ఆశీస్సులు ప్రొఫైల్ యజమానికి చేరాయి." : "✅ Your note has been shared privately with the profile owner.");
      } else {
        setFbSent(d?.detail || "Could not send note.");
      }
    } finally {
      setBusy(false);
    }
  };

  const p = data?.profile;

  return (
    <div className="min-h-dvh bg-[#FFF8E7] px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-5">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-xs font-bold text-[#7A0C2E]">
            ← {te ? "మన వివాహ హోమ్" : "Mana Vivaha Home"}
          </Link>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-bold text-amber-900">
            🔒 {te ? "ప్రైవేట్ కుటుంబ పరిశీలన లింక్" : "Private Family Review Link"}
          </span>
        </div>

        {loading && (
          <div className="rounded-3xl bg-white p-8 text-center text-sm font-bold text-[#7A0C2E]">
            ⏳ {te ? "బయోడేటా వివరాలు లోడ్ అవుతున్నాయి…" : "Loading biodata summary…"}
          </div>
        )}

        {!loading && err && (
          <div className="rounded-3xl border border-rose-200 bg-white p-8 text-center space-y-3">
            <div className="text-3xl">🔒</div>
            <h1 className="text-lg font-extrabold text-[#7A0C2E]">
              {te ? "రివ్యూ లింక్ అందుబాటులో లేదు" : "Review Link Unavailable"}
            </h1>
            <p className="text-xs text-slate-600">{err}</p>
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
                  🔒 {te ? "ప్రొఫైల్ యజమాని ఫోటో ప్రైవసీ ఆన్ చేశారు (ఈ లింక్‌లో ఫోటో దాచబడింది)." : "Photo privacy is enabled by the profile owner (photo withheld on review links)."}
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
                🙏 {te ? "కుటుంబ అభిప్రాయం / ఆశీస్సులు పంపండి" : "Share Family Note with Profile Owner"}
              </h2>
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  value={reviewerName}
                  onChange={(e) => setReviewerName(e.target.value)}
                  placeholder={te ? "మీ పేరు (ఉదా: లక్ష్మి పెద్దమ్మ)" : "Your name (e.g. Lakshmi Aunt)"}
                  aria-label="Reviewer name"
                  className="rounded-xl border border-slate-200 px-3 py-2 text-xs"
                />
                <input
                  value={relation}
                  onChange={(e) => setRelation(e.target.value)}
                  placeholder={te ? "బంధుత్వం (ఉదా: మామయ్య / పెద్దమ్మ)" : "Relation (e.g. Uncle / Aunt)"}
                  aria-label="Reviewer relation"
                  className="rounded-xl border border-slate-200 px-3 py-2 text-xs"
                />
              </div>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder={te ? "మీ సూచనను ఇక్కడ రాయండి…" : "Write your private review note for the profile owner…"}
                aria-label="Elder review note"
                className="w-full rounded-xl border border-slate-200 p-3 text-xs"
              />
              <button
                type="button"
                disabled={busy || reviewerName.trim().length < 2 || note.trim().length < 3}
                onClick={() => void sendFeedback()}
                className="rounded-xl bg-[#7A0C2E] px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
              >
                {te ? "అభిప్రాయం పంపండి" : "Send Private Note"}
              </button>
              {fbSent && <p className="text-xs font-bold text-emerald-800">{fbSent}</p>}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
