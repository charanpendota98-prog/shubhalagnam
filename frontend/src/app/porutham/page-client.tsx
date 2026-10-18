"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLang } from "@/lib/lang";
import { authHeaders, getToken, readApiJson } from "@/lib/api";

type ReviewRecord = {
  id: string;
  kind: "pdf" | "photo" | string;
  status: "pending" | "verified" | "rejected" | string;
  at?: string;
  verified_at?: string;
  note?: string;
};

type JathakamStatus = {
  success?: boolean;
  tsap_id?: string;
  state?: "unavailable" | "pending_review" | "review_recorded" | "rejected" | string;
  calculation_available?: boolean;
  records?: ReviewRecord[];
  message_en?: string;
  message_telugu?: string;
  note_en?: string;
  note_telugu?: string;
};

const COPY = {
  en: {
    eyebrow: "Evidence-first astrology",
    title: "Real Jathakam review — never a guessed horoscope",
    intro: "A star selector or a ten-check table is not a Jathakam. This workspace accepts an owner-uploaded birth-chart document and shows only its review state. It does not invent a lagna, planetary placements, doshas, score, verdict, or marriage prediction.",
    uploadTitle: "Submit your real birth-chart document",
    uploadCopy: "Upload the PDF or clear photo issued for the person whose profile you own. A document is queued for review; uploading it does not certify identity, accuracy, or authenticity.",
    idLabel: "Your Profile ID",
    idPlaceholder: "e.g. MV-1234",
    choose: "Choose a PDF or image",
    upload: "Upload for review",
    loading: "Loading review state…",
    noId: "Enter the Profile ID from your own account, or open this page from My profile.",
    unavailable: "No horoscope document has been submitted for this profile.",
    pending: "Document received. Review is pending. No chart, Porutham result, dosha result, score, or verdict is shown while the evidence is unverified.",
    recorded: "A document review status is recorded. This is not an authenticity certificate and does not create a complete chart automatically. Ask a qualified astrologer to interpret the original document.",
    rejected: "The submitted document was not accepted for review. No astrology result was generated. Upload a clearer or corrected document only if you are authorised to do so.",
    statusTitle: "Evidence status",
    statusLabel: "Status",
    pendingLabel: "Pending review",
    recordedLabel: "Review recorded",
    rejectedLabel: "Rejected",
    unavailableLabel: "Not submitted",
    noCalculation: "Automatic horoscope calculations are unavailable here until a qualified review supplies an actual chart. We will never fill missing birth time, place, or planetary data by guessing.",
    pairTitle: "Compare two Jathakams",
    pairCopy: "A compatibility score is intentionally not available from profile stars alone. Both people must provide their own authentic documents and receive an appropriate professional review before any family discussion.",
    pairCta: "Open the review workspace",
    trustTitle: "What this protects",
    trust: [
      "Member-entered star or rasi fields remain unverified input, not a horoscope result.",
      "No sample, demo, dummy, fabricated, or inferred chart is shown.",
      "A review status is separate from identity verification and is never a marriage guarantee.",
      "Uploaded documents stay tied to the owner account; do not upload another person’s private document without permission.",
    ],
    account: "Manage this from My profile",
    register: "Create a profile",
    safety: "Read privacy and safety",
    fileTooLarge: "The file must be 8 MB or smaller.",
    chooseFile: "Choose a PDF or image first.",
    uploadError: "The document could not be submitted safely. Please try again.",
    network: "A network problem occurred. Please try again.",
  },
  te: {
    eyebrow: "ఆధారాలపై నిజమైన జ్యోతిషం",
    title: "నిజమైన జాతక సమీక్ష — ఊహించిన జాతకం కాదు",
    intro: "కేవలం నక్షత్రం ఎంచుకోవడం లేదా పది checks చూపించడం జాతకం కాదు. మీ స్వంత ప్రొఫైల్‌కు చెందిన అసలైన జాతక పత్రాన్ని అప్‌లోడ్ చేసి, దాని review స్థితిని మాత్రమే ఇక్కడ చూపిస్తాం. లగ్నం, గ్రహస్థానాలు, దోషాలు, స్కోర్, తీర్పు లేదా వివాహ అంచనాను మేము కల్పించము.",
    uploadTitle: "మీ అసలైన జాతక పత్రాన్ని సమర్పించండి",
    uploadCopy: "మీ స్వంత ప్రొఫైల్‌కు చెందిన జాతక PDF లేదా స్పష్టమైన ఫోటోను అప్‌లోడ్ చేయండి. పత్రం review queue లోకి వెళుతుంది; upload చేయడం identity, ఖచ్చితత్వం లేదా నిజత్వానికి సర్టిఫికేట్ కాదు.",
    idLabel: "మీ Profile ID",
    idPlaceholder: "ఉదా: MV-1234",
    choose: "PDF లేదా చిత్రాన్ని ఎంచుకోండి",
    upload: "Review కోసం అప్‌లోడ్ చేయండి",
    loading: "Review స్థితి లోడ్ అవుతోంది…",
    noId: "మీ account లోని Profile ID ఇవ్వండి లేదా My profile నుంచి ఈ పేజీని తెరవండి.",
    unavailable: "ఈ ప్రొఫైల్‌కు జాతక పత్రం ఇంకా సమర్పించలేదు.",
    pending: "పత్రం అందింది. Review పెండింగ్‌లో ఉంది. ఆధారం verify అయ్యే వరకు chart, Porutham, dosha, score లేదా తీర్పు చూపించము.",
    recorded: "పత్రం review స్థితి నమోదు అయింది. ఇది authenticity certificate కాదు; పూర్తి chart ను automatic గా తయారు చేయదు. అసలైన పత్రాన్ని అర్హత ఉన్న జ్యోతిష్య నిపుణుడితో పరిశీలించండి.",
    rejected: "సమర్పించిన పత్రం review కు అంగీకరించబడలేదు. ఏ జ్యోతిష్య ఫలితమూ తయారు చేయలేదు. మీరు అనుమతితో ఉంటే మాత్రమే స్పష్టమైన లేదా సరిచేసిన పత్రాన్ని మళ్లీ పంపండి.",
    statusTitle: "ఆధార స్థితి",
    statusLabel: "స్థితి",
    pendingLabel: "Review పెండింగ్",
    recordedLabel: "Review నమోదు అయింది",
    rejectedLabel: "తిరస్కరించబడింది",
    unavailableLabel: "సమర్పించలేదు",
    noCalculation: "అర్హత ఉన్న review ద్వారా అసలైన chart అందే వరకు automatic horoscope calculations ఇక్కడ అందుబాటులో ఉండవు. జన్మ సమయం, ప్రదేశం లేదా గ్రహ వివరాలు తెలియకపోతే మేము ఊహించి నింపము.",
    pairTitle: "రెండు జాతకాలను పోల్చడం",
    pairCopy: "ప్రొఫైల్ నక్షత్రాల ఆధారంగా compatibility score ఉద్దేశపూర్వకంగా అందుబాటులో లేదు. ఇద్దరూ తమ అసలైన పత్రాలను సమర్పించి, తగిన నిపుణుల review పొందిన తర్వాతే కుటుంబ చర్చ జరగాలి.",
    pairCta: "Review workspace తెరవండి",
    trustTitle: "ఇది ఎందుకు సురక్షితం",
    trust: [
      "సభ్యులు నమోదు చేసిన star లేదా rasi వివరాలు verify కాని input మాత్రమే; జాతక ఫలితం కాదు.",
      "Sample, demo, dummy, fabricated లేదా ఊహించిన chart చూపించము.",
      "Review స్థితి identity verification కు వేరు; వివాహ హామీ ఎప్పుడూ కాదు.",
      "అప్‌లోడ్ చేసిన పత్రం owner account కు మాత్రమే సంబంధించినది; అనుమతి లేకుండా మరొకరి private document పంపవద్దు.",
    ],
    account: "My profile లో నిర్వహించండి",
    register: "ప్రొఫైల్ సృష్టించండి",
    safety: "గోప్యత మరియు భద్రత చదవండి",
    fileTooLarge: "ఫైల్ 8 MB లేదా అంతకంటే తక్కువగా ఉండాలి.",
    chooseFile: "ముందు PDF లేదా చిత్రాన్ని ఎంచుకోండి.",
    uploadError: "పత్రాన్ని సురక్షితంగా సమర్పించలేకపోయాం. మళ్లీ ప్రయత్నించండి.",
    network: "నెట్‌వర్క్ సమస్య. మళ్లీ ప్రయత్నించండి.",
  },
} as const;

type Copy = (typeof COPY)["en"] | (typeof COPY)["te"];

function statusText(state: string | undefined, copy: Copy) {
  if (state === "pending_review") return copy.pendingLabel;
  if (state === "review_recorded") return copy.recordedLabel;
  if (state === "rejected") return copy.rejectedLabel;
  return copy.unavailableLabel;
}

function statusTone(state: string | undefined) {
  if (state === "pending_review") return "border-amber-200 bg-amber-50 text-amber-950";
  if (state === "review_recorded") return "border-sky-200 bg-sky-50 text-sky-950";
  if (state === "rejected") return "border-rose-200 bg-rose-50 text-rose-950";
  return "border-slate-200 bg-slate-50 text-slate-900";
}

export default function PoruthamPageClient() {
  const { lang } = useLang();
  const te = lang === "te";
  const copy = te ? COPY.te : COPY.en;
  const [profileId, setProfileId] = useState("");
  const [status, setStatus] = useState<JathakamStatus | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadStatus = useCallback(async (id: string) => {
    const normalized = id.trim().toUpperCase();
    if (!normalized) {
      setStatus(null);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`/api/astro/jathakam/${encodeURIComponent(normalized)}`, { headers: authHeaders() });
      const data = await readApiJson<JathakamStatus>(response);
      if (response.ok && data.success) {
        setStatus(data);
        setMessage(null);
      } else {
        setStatus(null);
        setMessage({ ok: false, text: data.message_en && !te ? data.message_en : data.message_telugu || copy.noId });
      }
    } catch {
      setStatus(null);
      setMessage({ ok: false, text: copy.network });
    } finally {
      setLoading(false);
    }
  }, [copy.network, copy.noId, te]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("tsap_id") || "";
      if (stored) {
        setProfileId(stored.toUpperCase());
        void loadStatus(stored);
      }
    } catch {
      // Private browsing can reject storage; the manual ID field still works.
    }
  }, [loadStatus]);

  const onIdBlur = () => {
    const normalized = profileId.trim().toUpperCase();
    setProfileId(normalized);
    if (normalized) {
      try { localStorage.setItem("tsap_id", normalized); } catch { /* ignore */ }
      void loadStatus(normalized);
    }
  };

  const upload = async () => {
    const normalized = profileId.trim().toUpperCase();
    if (!normalized) {
      setMessage({ ok: false, text: copy.noId });
      return;
    }
    if (!selectedFile) {
      setMessage({ ok: false, text: copy.chooseFile });
      fileInputRef.current?.focus();
      return;
    }
    if (selectedFile.size > 8 * 1024 * 1024) {
      setMessage({ ok: false, text: copy.fileTooLarge });
      return;
    }
    setBusy(true);
    setMessage(null);
    const form = new FormData();
    form.append("tsap_id", normalized);
    form.append("file", selectedFile);
    try {
      const headers: Record<string, string> = {};
      const token = getToken();
      if (token) headers["X-Tsap-Token"] = token;
      const response = await fetch("/api/astro/jathakam/upload", { method: "POST", headers, body: form });
      const data = await readApiJson<JathakamStatus & { jathakam_id?: string }>(response);
      if (!response.ok || !data.success) {
        setMessage({ ok: false, text: te ? data.message_telugu || copy.uploadError : data.message_en || copy.uploadError });
      } else {
        setMessage({ ok: true, text: te ? data.message_telugu || copy.pending : data.message_en || copy.pending });
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        await loadStatus(normalized);
      }
    } catch {
      setMessage({ ok: false, text: copy.network });
    } finally {
      setBusy(false);
    }
  };

  const currentState = status?.state || "unavailable";
  const explanation = currentState === "pending_review"
    ? copy.pending
    : currentState === "review_recorded"
      ? copy.recorded
      : currentState === "rejected"
        ? copy.rejected
        : copy.unavailable;

  return (
    <main className="min-h-dvh bg-[#fffaf0] pb-20">
      <section className="overflow-hidden bg-gradient-to-br from-[#5c0822] via-[#7a0c2e] to-[#0f766e] text-white">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          <span className="inline-flex rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[.16em] text-amber-100">🪐 {copy.eyebrow}</span>
          <h1 className="mt-4 max-w-4xl text-3xl font-black leading-tight sm:text-5xl">{copy.title}</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-white/85 sm:text-base">{copy.intro}</p>
          <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold text-white/90">
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-2">✓ Evidence required</span>
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-2">✓ No fabricated chart</span>
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-2">✓ Pending states stay pending</span>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-5 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(19rem,.65fr)] lg:px-8 lg:py-8">
        <section className="rounded-[1.75rem] border border-amber-200 bg-white p-5 shadow-[0_18px_55px_rgba(92,8,34,.08)] sm:p-7" aria-labelledby="jathakam-upload-title">
          <div className="flex items-start gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-amber-50 text-2xl" aria-hidden="true">📜</span>
            <div>
              <h2 id="jathakam-upload-title" className="text-xl font-extrabold text-[#5c0822] sm:text-2xl">{copy.uploadTitle}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{copy.uploadCopy}</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)]">
            <label className="block text-sm font-bold text-slate-800" htmlFor="jathakam-profile-id">
              {copy.idLabel}
              <input
                id="jathakam-profile-id"
                value={profileId}
                onChange={(event) => setProfileId(event.target.value.toUpperCase())}
                onBlur={onIdBlur}
                placeholder={copy.idPlaceholder}
                autoComplete="off"
                className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 font-mono text-base outline-none focus:border-[#7a0c2e] focus:ring-2 focus:ring-[#7a0c2e]/20"
              />
            </label>
            <div>
              <label className="block text-sm font-bold text-slate-800" htmlFor="jathakam-file">{copy.choose}</label>
              <input
                ref={fileInputRef}
                id="jathakam-file"
                type="file"
                accept=".pdf,image/jpeg,image/png,image/webp,application/pdf"
                onChange={(event) => { setSelectedFile(event.target.files?.[0] || null); setMessage(null); }}
                className="mt-2 block min-h-12 w-full rounded-xl border border-dashed border-[#c58a9d] bg-rose-50/40 px-3 py-3 text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-[#7a0c2e] file:px-3 file:py-2 file:font-bold file:text-white"
              />
              <p className="mt-2 text-xs text-slate-500">PDF, JPG, PNG or WebP · max 8 MB</p>
            </div>
          </div>

          <button type="button" onClick={() => void upload()} disabled={busy || loading} className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-gradient-to-r from-[#5c0822] via-[#7a0c2e] to-[#b47b08] px-5 py-3 text-sm font-extrabold text-white shadow-md transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto">
            {busy ? copy.loading : `📤 ${copy.upload}`}
          </button>
          {message ? <p role={message.ok ? "status" : "alert"} className={`mt-4 rounded-xl border p-3 text-sm leading-6 ${message.ok ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-rose-200 bg-rose-50 text-rose-900"}`}>{message.text}</p> : null}
        </section>

        <section className={`rounded-[1.75rem] border p-5 shadow-sm sm:p-6 ${statusTone(currentState)}`} aria-labelledby="jathakam-status-title" aria-live="polite">
          <div className="flex items-center justify-between gap-3">
            <h2 id="jathakam-status-title" className="text-lg font-extrabold">{copy.statusTitle}</h2>
            {loading ? <span className="text-xs font-semibold opacity-70">{copy.loading}</span> : null}
          </div>
          <div className="mt-4 rounded-2xl border border-current/15 bg-white/55 p-4">
            <p className="text-[11px] font-extrabold uppercase tracking-[.14em] opacity-70">{copy.statusLabel}</p>
            <p className="mt-1 text-xl font-black">{statusText(currentState, copy)}</p>
            {status?.tsap_id ? <p className="mt-1 font-mono text-xs opacity-70">{status.tsap_id}</p> : null}
          </div>
          <p className="mt-4 text-sm leading-6">{explanation}</p>
          <p className="mt-4 border-t border-current/15 pt-4 text-xs font-semibold leading-5">{copy.noCalculation}</p>
          {status?.records?.length ? (
            <ul className="mt-4 space-y-2 text-xs opacity-80">
              {status.records.slice(0, 3).map((record) => <li key={record.id}>• {record.kind === "pdf" ? "PDF" : "Image"} · {record.id} · {record.at ? new Date(record.at).toLocaleDateString() : ""}</li>)}
            </ul>
          ) : null}
        </section>
      </div>

      <div className="mx-auto grid max-w-6xl gap-5 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 sm:p-6" aria-labelledby="jathakam-pair-title">
          <p className="text-[11px] font-extrabold uppercase tracking-[.16em] text-[#8b5364]">No shortcut</p>
          <h2 id="jathakam-pair-title" className="mt-2 text-xl font-extrabold text-[#5c0822]">{copy.pairTitle}</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">{copy.pairCopy}</p>
          <Link href="#jathakam-upload-title" className="mt-5 inline-flex min-h-11 items-center rounded-xl border border-[#7a0c2e]/25 px-4 py-2.5 text-sm font-bold text-[#7a0c2e]">{copy.pairCta} →</Link>
        </section>
        <section className="rounded-[1.75rem] border border-emerald-200 bg-emerald-50/60 p-5 sm:p-6" aria-labelledby="jathakam-trust-title">
          <h2 id="jathakam-trust-title" className="text-xl font-extrabold text-emerald-950">{copy.trustTitle}</h2>
          <ul className="mt-3 space-y-3 text-sm leading-6 text-emerald-950">{copy.trust.map((item) => <li key={item} className="flex gap-2"><span aria-hidden="true">✓</span><span>{item}</span></li>)}</ul>
        </section>
      </div>

      <div className="mx-auto mt-6 flex max-w-6xl flex-wrap gap-3 px-4 sm:px-6 lg:px-8">
        <Link href="/me" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#7a0c2e] px-4 py-2.5 text-sm font-bold text-white">🪐 {copy.account}</Link>
        <Link href="/register" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#7a0c2e]/25 bg-white px-4 py-2.5 text-sm font-bold text-[#7a0c2e]">{copy.register}</Link>
        <Link href="/safety" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700">🔒 {copy.safety}</Link>
      </div>
    </main>
  );
}
