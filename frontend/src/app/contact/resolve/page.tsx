"use client";

/**
 * 🔒 Contact resolve landing — the only URL a contact QR encodes.
 * Opened in a browser where the viewing member is logged in, it redeems the
 * single-use token through the API (owner session required) and offers the
 * WhatsApp hand-off. The phone number is never rendered here: only a masked
 * form and a wa.me link leave this page.
 */
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { apiGet } from "@/lib/api";

type ResolveOk = { ok: true; wa_link: string; phone_masked: string };
type State =
  | { phase: "working" }
  | { phase: "ready"; waLink: string; masked: string }
  | { phase: "error"; message: string }
  | { phase: "login" };

function teluguUi(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const saved = localStorage.getItem("tsap_lang");
    if (saved === "en") return false;
    if (saved === "te") return true;
  } catch { /* default below */ }
  return document.documentElement.dataset.lang !== "en";
}

function ResolveInner() {
  const params = useSearchParams();
  const token = (params.get("token") || "").slice(0, 256);
  const [state, setState] = useState<State>({ phase: "working" });
  const started = useRef(false);
  const te = teluguUi();

  useEffect(() => {
    if (started.current) return;   // redeem exactly once: the token is single-use
    started.current = true;
    if (!token) {
      setState({ phase: "error", message: te ? "QR లింక్ పూర్తిగా లేదు — మళ్లీ QR సృష్టించండి." : "The QR link is incomplete — please create a fresh QR." });
      return;
    }
    void apiGet<ResolveOk>(`/api/contact/resolve/${encodeURIComponent(token)}`).then(({ ok, data, needsLogin, errorTelugu }) => {
      if (ok && data?.ok && data.wa_link) {
        setState({ phase: "ready", waLink: String(data.wa_link), masked: String(data.phone_masked || "") });
      } else if (needsLogin) {
        setState({ phase: "login" });
      } else {
        setState({ phase: "error", message: errorTelugu || (te ? "ఈ QR ఇక చెల్లదు (గడువు ముగిసింది లేదా ఇప్పటికే వాడారు)." : "This QR is no longer valid (expired or already used).") });
      }
    });
  }, [token, te]);

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-6 py-16 text-center">
      {state.phase === "working" ? (
        <p className="text-sm text-slate-600">{te ? "⏳ QR నిర్ధారిస్తున్నాం…" : "⏳ Verifying the QR…"}</p>
      ) : null}
      {state.phase === "login" ? (
        <div>
          <p className="text-base font-bold text-slate-800">{te ? "🔒 ఈ పరికరంలో మీ account కి login చేయండి" : "🔒 Log in to your account on this device"}</p>
          <p className="mt-2 text-sm text-slate-600">{te ? "QR యజమాని session లోనే ఇది ఓపెన్ అవుతుంది. Login తర్వాత profile page నుండి కొత్త QR తీయండి." : "The QR opens only in its owner's session. After logging in, create a fresh QR from the profile page."}</p>
          <Link href="/login" className="mt-4 inline-block rounded-xl bg-[#7A0C2E] px-5 py-2.5 text-sm font-bold text-white">{te ? "Login" : "Log in"}</Link>
        </div>
      ) : null}
      {state.phase === "error" ? (
        <div>
          <p className="text-base font-bold text-slate-800">{state.message}</p>
          <p className="mt-2 text-sm text-slate-600">{te ? "QR 5 నిమిషాలు మాత్రమే చెల్లుంది, ఒక్కసారే పని చేస్తుంది." : "A QR stays valid for 5 minutes and works only once."}</p>
        </div>
      ) : null}
      {state.phase === "ready" ? (
        <div>
          <p className="text-base font-bold text-emerald-700">{te ? "✅ Contact అందుబాటులో ఉంది" : "✅ Contact is available"}</p>
          {state.masked ? <p className="mt-1 text-sm text-slate-600">{state.masked}</p> : null}
          <a href={state.waLink} target="_blank" rel="noopener noreferrer"
            className="mt-4 inline-block rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white">
            💬 {te ? "WhatsApp ఓపెన్ చేయండి" : "Open WhatsApp"}
          </a>
          <p className="mt-3 text-[12px] text-slate-500">{te ? "నంబర్ ఈ పేజీలో చూపించము — WhatsApp లోనే సంభాషణ కొనసాగుతుంది." : "The number is not shown on this page — the conversation continues in WhatsApp."}</p>
        </div>
      ) : null}
    </main>
  );
}

export default function ContactResolvePage() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-md px-6 py-16 text-center text-sm text-slate-600">⏳</main>}>
      <ResolveInner />
    </Suspense>
  );
}
