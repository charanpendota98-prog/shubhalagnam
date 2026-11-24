"use client";

import "@/components/editorial-workspace.css";

import { useEffect, useState } from "react";
import Link from "@/components/LocaleLink";
import { useParams } from "next/navigation";
import { useLang } from "@/lib/lang";

export default function OrgPortalClient() {
  const params = useParams<{ slug?: string }>();
  const slug = String(params?.slug || "").trim().toLowerCase();
  const { lang } = useLang();
  const te = lang === "te";
  const [portal, setPortal] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [missing, setMissing] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!slug) return;
    let alive = true;
    setLoading(true); setPortal(null); setErr(""); setMissing(false);
    fetch(`/api/orgs/${encodeURIComponent(slug)}`, { cache: "no-store" })
      .then(async (r) => {
        const j = await r.json();
        if (r.status === 404) { if (alive) setMissing(true); return; }
        if (!r.ok || j?.success !== true || !j.portal || typeof j.portal !== "object") throw new Error("Unavailable");
        if (alive) setPortal(j.portal);
      })
      .catch((e: any) => {
        if (alive) setErr("unavailable");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [slug, attempt]);

  return (
    <div className="mv-editorial-workspace max-w-5xl mx-auto px-4 py-8 space-y-6">
      <header className="rounded-3xl bg-gradient-to-br from-[#5c1224] via-[#450e1c] to-[#26070f] text-white p-6 md:p-8 shadow-lg">
        <p className="text-xs uppercase tracking-widest text-amber-200 font-semibold">
          {te ? "ధృవీకరించిన సంఘ పోర్టల్ • White-Label Portal" : "Verified Community Association Portal"}
        </p>
        <h1 className="text-2xl md:text-3xl font-bold mt-1 telugu">
          {loading
            ? te ? "పోర్టల్ లోడ్ అవుతోంది..." : "Loading Organization Portal..."
            : portal
            ? te ? portal.org_name_te || portal.org_name_en : portal.org_name_en
            : missing ? (te ? "సంఘ పోర్టల్ కనుగొనబడలేదు" : "Organization Portal Not Found") : (te ? "సంఘ పోర్టల్ అందుబాటులో లేదు" : "Organization Portal Unavailable")}
        </h1>
        {portal && (
          <p className="text-sm text-amber-100/90 mt-2 max-w-3xl telugu">
            {te ? portal.about_te || portal.about_en : portal.about_en}
          </p>
        )}
      </header>

      {(err || missing) && (
        <div role="alert" className="rounded-2xl border border-stone-200 bg-white p-6 space-y-3">
          <p className="text-sm text-stone-700">{missing ? (te ? "ఈ పోర్టల్ కనుగొనబడలేదు." : "This portal was not found.") : (te ? "పోర్టల్ వివరాలను నిర్ధారించలేకపోయాం. మళ్లీ ప్రయత్నించండి." : "The portal details could not be confirmed. Try again.")}</p>
          {!missing && <button type="button" className="font-bold underline" onClick={() => setAttempt(n => n + 1)}>{te ? "మళ్లీ ప్రయత్నించండి" : "Try again"}</button>}
          <Link href="/events" className="inline-block text-xs font-semibold text-[#7a162e] underline">
            {te ? "← అన్ని సంఘ పోర్టల్స్ & వేదికలకు తిరిగి వెళ్ళండి" : "← Back to Community Events & Portals"}
          </Link>
        </div>
      )}

      {portal && (
        <>
          <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-stone-800 space-y-1">
            <div className="font-semibold text-[#7a162e]">
              {portal.consent_notice || "Public profile summaries only; phone and WhatsApp stay locked until owner acceptance."}
            </div>
            {portal.verified_contact_note && <div>{portal.verified_contact_note}</div>}
          </div>

          <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm space-y-4">
            <div className="mv-editorial-actions flex items-center justify-between">
              <h2 className="text-lg font-bold text-stone-900 telugu">
                {te ? "ఆమోదించబడిన ప్రొఫైల్ సారాంశాలు" : "Approved Public Profile Summaries"} ({portal.approved_profile_count ?? 0})
              </h2>
              <Link href="/matches" className="text-xs font-semibold text-[#7a162e] underline">
                {te ? "అన్ని ఫిల్టర్లతో వెతకండి →" : "Full Search →"}
              </Link>
            </div>

            {(portal.sample_profiles || []).length === 0 ? (
              <p className="text-sm text-stone-600 telugu">
                {te
                  ? "ఈ ఫిల్టర్‌కు సరిపోయే ఆమోదించబడిన ప్రొఫైల్స్ ప్రస్తుతం లేవు."
                  : "No approved public profiles currently match this organization's filter."}
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {portal.sample_profiles.map((p: any) => (
                  <div key={p.tsap_id} className="mv-editorial-actions rounded-xl border border-stone-200 p-4 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="font-bold text-sm text-stone-900">
                        {p.tsap_id} • {p.gender} ({p.age || "—"} yrs)
                      </div>
                      <div className="text-xs text-stone-600">
                        {p.caste} • {p.district || p.state}
                      </div>
                      <div className="text-xs text-stone-500">
                        {p.education} {p.job ? `• ${p.job}` : ""}
                      </div>
                    </div>
                    <Link
                      href={`/search/${encodeURIComponent(p.tsap_id)}`}
                      className="rounded-xl bg-[#7a162e] text-white text-xs font-semibold px-3 py-2 hover:bg-[#5c1224]"
                    >
                      {te ? "ప్రొఫైల్ చూడండి" : "View Profile"}
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
