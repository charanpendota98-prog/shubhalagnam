"use client";

import { useState } from "react";
import { authHeaders, readApiJson } from "@/lib/api";
import { useLang } from "@/lib/lang";

export default function PrivatePhotoAccessCard({
  profile,
  myTsapId,
}: {
  profile: Record<string, any>;
  myTsapId: string;
}) {
  const { lang } = useLang();
  const te = lang === "te";
  const [note, setNote] = useState("");
  const [signedUrl, setSignedUrl] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const ownerId = String(profile?.tsap_id || "").trim().toUpperCase();
  const isOwner = Boolean(myTsapId && myTsapId.toUpperCase() === ownerId);
  if (!ownerId || isOwner || !profile?.photo_private) return null;

  const requestAccess = async () => {
    setBusy(true);
    setStatusMsg("");
    try {
      const r = await fetch("/api/photo/access/request", {
        method: "POST",
        headers: authHeaders(),
        credentials: "same-origin",
        body: JSON.stringify({ viewer_id: myTsapId, owner_id: ownerId, note }),
      });
      const d = await readApiJson(r);
      if (r.ok && d.success) {
        setStatusMsg(
          te
            ? "✅ ప్రైవేట్ ఫోటో అభ్యర్థన పంపబడింది. ప్రొఫైల్ యజమాని ఆమోదించిన తర్వాత ఇక్కడ చూడవచ్చు."
            : "✅ Private photo request sent. Once approved by the owner, click View Approved Photo below.",
        );
      } else {
        setStatusMsg(d.detail || "Could not request photo access.");
      }
    } finally {
      setBusy(false);
    }
  };

  const viewSignedPhoto = async () => {
    setBusy(true);
    setStatusMsg("");
    try {
      const r = await fetch("/api/photo/access/signed-url", {
        method: "POST",
        headers: authHeaders(),
        credentials: "same-origin",
        body: JSON.stringify({ viewer_id: myTsapId, owner_id: ownerId, ttl_seconds: 900 }),
      });
      const d = await readApiJson(r);
      if (r.ok && d.success && d.signed_url) {
        setSignedUrl(d.signed_url);
      } else {
        setStatusMsg(
          te
            ? "ఫోటో అనుమతి ఇంకా ఆమోదించబడలేదు లేదా గడువు ముగిసింది."
            : d.detail || "Photo permission is pending owner approval or has expired.",
        );
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-xs space-y-2.5">
      <div className="flex items-center gap-2 font-extrabold text-[#7A0C2E]">
        <span>🔒</span>
        <span>
          {te
            ? "ప్రైవేట్ ఫోటో రక్షణ (యజమాని అనుమతితో మాత్రమే కనిపిస్తుంది)"
            : "Private Photo Protected (Owner-Controlled Expiring Access)"}
        </span>
      </div>

      {myTsapId ? (
        <>
          {!signedUrl ? (
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={te ? "చిన్న పరిచయం (ఐచ్ఛికం)…" : "Polite note to family (optional)…"}
                aria-label="Private photo request note"
                className="flex-1 rounded-xl border border-amber-300 bg-white px-3 py-2 text-xs"
              />
              <button
                type="button"
                disabled={busy}
                onClick={() => void requestAccess()}
                className="rounded-xl bg-[#7A0C2E] px-3.5 py-2 font-bold text-white disabled:opacity-50"
              >
                {te ? "ఫోటో అనుమతి అడగండి" : "Request Photo Access"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void viewSignedPhoto()}
                className="rounded-xl border border-[#7A0C2E] bg-white px-3.5 py-2 font-bold text-[#7A0C2E] disabled:opacity-50"
              >
                {te ? "ఆమోదించిన ఫోటో చూడు" : "View Approved Photo"}
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={signedUrl}
                alt={`${ownerId} approved photo`}
                className="max-h-80 rounded-2xl border border-gold/40 object-cover shadow-sm"
              />
              <p className="text-[11px] text-slate-600">
                {te
                  ? "ఈ తాత్కాలిక సంతకం చేసిన ఫోటో లింక్ 15 నిమిషాల్లో ముగుస్తుంది."
                  : "This signed temporary photo URL expires automatically in 15 minutes."}
              </p>
            </div>
          )}
          {statusMsg && <p className="font-bold text-amber-900">{statusMsg}</p>}
        </>
      ) : (
        <p className="text-slate-600">
          {te
            ? "ప్రైవేట్ ఫోటో అనుమతి కోరడానికి దయచేసి లాగిన్ అవ్వండి."
            : "Sign in to request owner permission to view this private photo."}
        </p>
      )}
    </div>
  );
}
