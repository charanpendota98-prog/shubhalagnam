"use client";

/** Registration photo review state and retry UI. Registration itself requires a photo. */
import { useCallback, useEffect, useRef, useState } from "react";
import { Duo } from "@/lib/duo";
import { useLang } from "@/lib/lang";
import { apiDisplayMessage, authHeaders, readApiJson } from "@/lib/api";
import { prepareProfilePhoto, ProfilePhotoError, profilePhotoErrorMessage } from "@/lib/photo-upload";
import ProtectedImage from "@/components/ProtectedImage";

type Status = {
  photo_url: string;
  photo_status: string;
  photo_reason: string;
  photo_reason_te: string;
};

type ApiError = { detail?: unknown; [key: string]: unknown };

export default function PhotoFlow({ tsapId }: { tsapId: string }) {
  const { lang } = useLang();
  const te = lang === "te";
  const [st, setSt] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/photo/status/${encodeURIComponent(tsapId)}`, {
        headers: authHeaders(),
        credentials: "same-origin",
        cache: "no-store",
      });
      const payload = await readApiJson<Status & ApiError>(r).catch(() => ({} as Status & ApiError));
      if (!r.ok) {
        setErr(apiDisplayMessage(payload, te, te
          ? "ఫోటో స్థితిని లోడ్ చేయలేకపోయాం. మళ్లీ ప్రయత్నించండి."
          : "Could not load the photo status. Please retry."));
        return;
      }
      setSt(payload);
      setErr("");
    } catch {
      setErr(te ? "స్థితిని లోడ్ చేయలేకపోయాం. మళ్లీ ప్రయత్నించండి." : "Could not load photo status. Please retry.");
    }
  }, [tsapId, te]);

  useEffect(() => { void load(); }, [load]);

  const upload = async (file?: File) => {
    if (!file || busy) return;
    setBusy(true);
    setErr("");
    try {
      const prepared = await prepareProfilePhoto(file);
      const fd = new FormData();
      fd.append("file", prepared, prepared.name);
      fd.append("tsap_id", tsapId);
      const r = await fetch("/api/photo/upload", {
        method: "POST",
        headers: authHeaders(false, false),
        credentials: "same-origin",
        body: fd,
      });
      const d = await readApiJson<ApiError>(r).catch(() => ({} as ApiError));
      if (!r.ok) {
        setErr(apiDisplayMessage(d, te, te
          ? "ఫోటో అప్‌లోడ్ కాలేదు. ఫైల్‌ను తనిఖీ చేసి మళ్లీ ప్రయత్నించండి."
          : "Photo upload failed. Check the file and try again."));
        return;
      }
      setSt((current) => ({
        photo_url: String((d as Record<string, unknown>).url || current?.photo_url || ""),
        photo_status: String((d as Record<string, unknown>).status || "pending"),
        photo_reason: "",
        photo_reason_te: "",
      }));
      await load();
    } catch (error) {
      if (error instanceof ProfilePhotoError) {
        setErr(profilePhotoErrorMessage(error.code, te));
      } else {
        setErr(te ? "నెట్‌వర్క్ సమస్య. మళ్లీ ప్రయత్నించండి." : "Network problem. Please try again.");
      }
    } finally {
      setBusy(false);
    }
  };

  const status = st?.photo_status || "loading";
  const mayReplace = status === "approved" || status === "rejected" || status === "none";
  const title = status === "approved"
    ? (te ? "ఫోటో సమీక్ష పూర్తయింది" : "Photo review complete")
    : status === "rejected"
      ? (te ? "మరో ఫోటో అవసరం" : "Please choose another photo")
      : status === "loading"
        ? (te ? "ఫోటో స్థితిని లోడ్ చేస్తున్నాం…" : "Loading photo status…")
        : (te ? "ఫోటో సిబ్బంది సమీక్షలో ఉంది" : "Photo is waiting for staff review");

  return (
    <section className="rounded-2xl border border-gold/35 bg-white p-4 shadow-sm" aria-live="polite">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-xl" aria-hidden="true">📸</div>
        <div className="min-w-0 flex-1">
          <h3 className={`text-sm font-black text-slate-900 ${te ? "telugu" : ""}`}>{title}</h3>
          {status === "pending" ? (
            <p className={`mt-1 text-xs leading-relaxed text-slate-600 ${te ? "telugu" : ""}`}>
              {te
                ? "ఫైల్ మరియు స్పష్టత తనిఖీలు పూర్తయ్యాయి. ఫోటో suitability‌ను సిబ్బంది సమీక్షిస్తున్నారు. సమీక్ష identity verification కాదు; మీ privacy ఎంపిక అమల్లో ఉంటుంది."
                : "File and clarity checks passed. Staff are reviewing photo suitability. This is not identity verification; your privacy choice remains in effect."}
            </p>
          ) : status === "approved" ? (
            <p className={`mt-1 text-xs leading-relaxed text-slate-600 ${te ? "telugu" : ""}`}>
              {te
                ? "సిబ్బంది ఫోటోను ఆమోదించారు. ఇది identity లేదా ఇతర profile వివరాలను నిర్ధారించదు; చూపింపు మీ privacy ఎంపిక మరియు profile approval‌పై ఆధారపడి ఉంటుంది."
                : "Staff approved the photo. This does not verify identity or other profile details; visibility depends on your privacy choice and profile approval."}
            </p>
          ) : status === "rejected" ? (
            <p className={`mt-1 text-xs leading-relaxed text-rose-800 ${te ? "telugu" : ""}`}>
              {te ? st?.photo_reason_te || "స్పష్టమైన, ఒక్కరే కనిపించే అసలు ఫోటోను ఎంచుకోండి." : st?.photo_reason || "Choose a clear, original photo showing one person."}
            </p>
          ) : status === "loading" ? (
            <p className="mt-1 text-xs text-slate-600"><Duo en="Please wait while we check the saved status." te="సేవ్ చేసిన స్థితిని తనిఖీ చేస్తున్నాం. దయచేసి వేచి ఉండండి." /></p>
          ) : (
            <p className={`mt-1 text-xs leading-relaxed text-slate-600 ${te ? "telugu" : ""}`}>
              {te
                ? "ఫోటోతో నమోదు చేయబడింది. స్థితి రాకపోతే, మీ అకౌంట్‌ను మళ్లీ తెరిచి ప్రయత్నించండి లేదా సిబ్బంది సహాయం పొందండి."
                : "Your registration included a photo. If its status is unavailable, reopen your account and retry or ask staff for help."}
            </p>
          )}
        </div>
        {st?.photo_url ? (
          <ProtectedImage src={st.photo_url} alt={te ? "ప్రైవేట్ ఫోటో preview" : "Private photo preview"} className="h-20 w-16 shrink-0 rounded-xl border border-slate-200 object-cover" />
        ) : null}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        className="hidden"
        aria-label={te ? "కొత్త ప్రొఫైల్ ఫోటో ఎంచుకోండి" : "Choose a replacement profile photo"}
        onChange={(event) => {
          void upload(event.currentTarget.files?.[0]);
          event.currentTarget.value = "";
        }}
      />

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        {mayReplace ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            className="min-h-10 w-full rounded-xl bg-[#7A0C2E] px-4 py-2 text-xs font-black text-white transition hover:bg-[#5E0824] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7A0C2E] focus-visible:ring-offset-2 disabled:opacity-60 sm:w-auto"
          >
            {busy
              ? <Duo en="Checking and uploading…" te="తనిఖీ చేసి అప్‌లోడ్ చేస్తున్నాం…" />
              : status === "approved"
                ? <Duo en="Replace photo" te="ఫోటో మార్చండి" />
                : <Duo en="Upload another photo" te="మరో ఫోటో అప్‌లోడ్ చేయండి" />}
          </button>
        ) : null}
        {status === "pending" || status === "loading" ? (
          <button
            type="button"
            onClick={() => void load()}
            className="min-h-10 w-full rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7A0C2E] focus-visible:ring-offset-2 sm:w-auto"
          >
            <Duo en="Refresh review status" te="సమీక్ష స్థితిని మళ్లీ తనిఖీ చేయండి" />
          </button>
        ) : null}
        {err ? <p role="alert" className={`text-xs font-semibold text-rose-700 ${te ? "telugu" : ""}`}>{err}</p> : null}
      </div>
    </section>
  );
}
