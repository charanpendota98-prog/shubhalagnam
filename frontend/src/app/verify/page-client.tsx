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
  const [badges, setBadges] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [credType, setCredType] = useState("education");
  const [docType, setDocType] = useState("");
  const [credSummary, setCredSummary] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      setTsapId(qp.get("id") || localStorage.getItem(TSAP_KEY) || "");
    } catch { /* ignore */ }
  }, [qp]);

  const load = useCallback(async () => {
    if (!tsapId) return;
    try {
      const [r, br] = await Promise.all([
        fetch(`/api/photo/status/${encodeURIComponent(tsapId)}`, {
          headers: authHeaders(),
          credentials: "same-origin",
          cache: "no-store",
        }),
        fetch(`/api/verification/${encodeURIComponent(tsapId)}/badges`, {
          headers: authHeaders(),
          credentials: "same-origin",
          cache: "no-store",
        }),
      ]);
      if (r.ok) {
        const d = await readApiJson(r);
        setStatus(d.selfie_verified ? "approved" : (d.selfie_status || "none"));
      }
      if (br.ok) {
        const bd = await readApiJson(br);
        setBadges(bd.badges || []);
        setSubmissions(bd.submissions || []);
      }
    } catch { /* offline */ }
  }, [tsapId]);

  useEffect(() => { void load(); }, [load]);

  const submitCredential = async () => {
    if (!tsapId) return;
    if (credSummary.trim().length < 4) {
      setMsg(te ? "వివరాలు నమోదు చేయండి (ID పూర్తి నంబర్ ఇవ్వవద్దు)." : "Enter credential details (do not type full government ID numbers).");
      return;
    }
    setBusy(true); setMsg("");
    try {
      const r = await fetch(`/api/verification/${encodeURIComponent(tsapId)}/submit`, {
        method: "POST",
        headers: authHeaders(),
        credentials: "same-origin",
        body: JSON.stringify({ badge_type: credType, document_type: docType, summary: credSummary }),
      });
      const d = await readApiJson(r).catch(() => ({}));
      if (!r.ok) {
        setMsg(apiDisplayMessage(d, te, te ? "సమర్పణ విఫలమైంది" : "Submission failed."));
      } else {
        setDocType("");
        setCredSummary("");
        setMsg(te ? d.message_telugu : d.message_en);
        await load();
      }
    } catch {
      setMsg(te ? "Network లేదు — మళ్లీ try చెయ్యండి" : "Network error — please retry.");
    }
    setBusy(false);
  };

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

      {/* 🎓 Multi-Badge Credential Verification (Decoupled from Phone OTP) */}
      <section className="mt-6 rounded-2xl border border-gold/30 bg-white p-5 space-y-4">
        <div>
          <h2 className="text-[16px] font-extrabold text-maroon">
            🛡️ <Duo en="Independent Verification Badges (No Phone OTP Required)" te="స్వతంత్ర ధృవీకరణ బ్యాడ్జ్‌లు (ఫోన్ OTP అవసరం లేదు)" />
          </h2>
          <p className="mt-1 text-[12px] text-gray-600 telugu">
            {te
              ? "ప్రతి బ్యాడ్జ్ వేరుగా మాన్యువల్ సమీక్ష ద్వారా నమోదు చేయబడుతుంది. మేము ఎప్పుడూ కృత్రిమ trust score లను చూపము మరియు పూర్తి ఆధార్/PAN నంబర్లను నిల్వ చేయము."
              : "Each badge is recorded independently after manual staff review. Mana Vivaha never calculates synthetic trust scores and never stores full Aadhaar/PAN numbers in plaintext."}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-3 text-[12px]">
          {[
            { icon: "📸", en: "Profile Photo Review", te: "ప్రొఫైల్ ఫోటో సమీక్ష", descEn: "Moderated before public display.", descTe: "పబ్లిక్‌గా చూపే ముందు మాన్యువల్ సమీక్ష." },
            { icon: "🤳", en: "Live Selfie Match", te: "లైవ్ సెల్ఫీ సరిపోలిక", descEn: "Compared against your uploaded profile photo.", descTe: "మీ ప్రొఫైల్ ఫోటోతో సరిపోల్చి పరిశీలిస్తారు." },
            { icon: "🎓", en: "Education Credential", te: "విద్యా అర్హత బ్యాడ్జ్", descEn: "University/degree summary reviewed by staff.", descTe: "డిగ్రీ/కళాశాల వివరాల మాన్యువల్ పరిశీలన." },
            { icon: "💼", en: "Employment / Profession", te: "ఉద్యోగ / వృత్తి బ్యాడ్జ్", descEn: "Employer or business proof reviewed by staff.", descTe: "ఉద్యోగ లేదా వ్యాపార వివరాల పరిశీలన." },
          ].map((item) => (
            <div key={item.en} className="rounded-xl border border-gold/25 bg-cream p-3">
              <div className="font-bold text-ink">{item.icon} {te ? item.te : item.en}</div>
              <div className="mt-0.5 text-[11px] text-gray-600">{te ? item.descTe : item.descEn}</div>
            </div>
          ))}
        </div>

        {tsapId ? (
          <div className="border-t border-gold/25 pt-4 space-y-3">
            <div className="font-bold text-[13px] text-maroon">
              {te ? "పత్రాల సమీక్ష అభ్యర్థన పంపండి" : "Submit Education / Employment / Masked ID for Staff Review"}
            </div>
            {badges.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {badges.map((b: any) => (
                  <span key={b.badge_type} className="rounded-full bg-emerald-50 border border-emerald-300 px-2.5 py-1 text-[11px] font-bold text-emerald-900">
                    ✓ {te ? b.label_te : b.label_en}
                  </span>
                ))}
              </div>
            )}
            <div className="grid sm:grid-cols-2 gap-2">
              <select
                value={credType}
                onChange={(e) => setCredType(e.target.value)}
                aria-label={te ? "బ్యాడ్జ్ రకం" : "Badge type"}
                className="input-mobile text-[13px]"
              >
                <option value="education">{te ? "🎓 విద్య (Education)" : "🎓 Education Credential"}</option>
                <option value="employment">{te ? "💼 ఉద్యోగం (Employment)" : "💼 Employment / Profession"}</option>
                <option value="government_id">{te ? "🪪 ప్రభుత్వ ID (చివరి 4 అంకెలు మాత్రమే)" : "🪪 Government ID (last 4 digits only)"}</option>
              </select>
              <input
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                placeholder={te ? "ఉదా: B.Tech / TCS Offer / Voter ID" : "E.g. B.Tech Degree / Employer ID"}
                aria-label={te ? "పత్రం రకం" : "Document type"}
                className="input-mobile text-[13px]"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                value={credSummary}
                onChange={(e) => setCredSummary(e.target.value)}
                placeholder={te ? "వివరాలు (పూర్తి ID నంబర్ రాయవద్దు)…" : "Institution / employer summary (never enter full ID numbers)…"}
                aria-label={te ? "ధృవీకరణ వివరాలు" : "Credential summary"}
                className="input-mobile flex-1 text-[13px]"
              />
              <button
                type="button"
                disabled={busy}
                onClick={() => void submitCredential()}
                className="rounded-xl bg-maroon px-4 py-2.5 text-[12px] font-bold text-white disabled:opacity-50 shrink-0"
              >
                {te ? "సమీక్షకు పంపు" : "Submit for Review"}
              </button>
            </div>
            {submissions.length > 0 && (
              <div className="space-y-1.5 pt-1">
                {submissions.map((s: any) => (
                  <div key={s.id} className="rounded-xl bg-cream px-3 py-2 text-[11px] flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-maroon uppercase">{s.badge_type}</span>
                    <span className="text-gray-600">{s.document_type || "—"}</span>
                    <span className="rounded-full bg-white border border-gold/40 px-2 py-0.5 font-bold">{s.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 flex flex-wrap items-center justify-between gap-2 text-[12px]">
            <span className="text-amber-900 font-medium">
              {te ? "మీ ప్రొఫైల్ ధృవీకరణ ప్రారంభించడానికి లాగిన్ లేదా ఉచిత రిజిస్టర్ చేయండి." : "Sign in or register free to submit verification items for your profile."}
            </span>
            <div className="flex gap-2">
              <Link href="/login" className="rounded-lg border border-maroon px-3 py-1.5 font-bold text-maroon">{te ? "లాగిన్" : "Sign In"}</Link>
              <Link href="/register" className="rounded-lg bg-maroon px-3 py-1.5 font-bold text-white">{te ? "ఉచిత రిజిస్టర్" : "Register Free"}</Link>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
