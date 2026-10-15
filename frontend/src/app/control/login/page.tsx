"use client";


import { readApiJson } from "@/lib/api";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLang } from "@/lib/lang";

const containsTelugu = (value: string) => /[\u0c00-\u0c7f]/.test(value);

export default function ControlLogin() {
  const router = useRouter();
  const { lang } = useLang();
  const te = lang === "te";
  const [roleTab, setRoleTab] = useState<"admin" | "worker">("admin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const switchTab = (tab: "admin" | "worker") => {
    setRoleTab(tab);
    setUsername("");
    setPassword("");
    setError("");
  };

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/control/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await readApiJson(response);
      if (!response.ok) {
        const detail = typeof data?.detail === "string" ? data.detail : "";
        const fallback = te
          ? "చెల్లని యూజర్‌నేమ్ లేదా పాస్‌వర్డ్. మీకు కేటాయించిన వివరాలను తనిఖీ చేయండి."
          : "Sign-in failed. Check your assigned username and password.";
        throw new Error(detail && (te || !containsTelugu(detail)) ? detail : fallback);
      }
      router.replace(data.role === "owner" ? "/control" : "/control/workspace");
    } catch (e) {
      const fallback = te ? "లాగిన్ విఫలమైంది. మళ్లీ ప్రయత్నించండి." : "Sign-in failed. Please try again.";
      const message = e instanceof Error ? e.message : fallback;
      setError(!te && containsTelugu(message) ? fallback : message);
    } finally {
      setBusy(false);
    }
  }

  const brandLetter = te ? "వి" : "M";

  return (
    <div lang={te ? "te-IN" : "en-IN"} className="flex min-h-dvh items-center justify-center bg-[#FAF7F2] px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 space-y-1 text-center">
          <div className="mb-2 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-gold/40 bg-gradient-to-br from-[#7A0C2E] to-[#50081e] text-2xl font-black text-white shadow-lg shadow-maroon/20" aria-hidden="true">
            {brandLetter}
          </div>
          <h1 className="text-2xl font-black text-[#0F1F3C]">Mana Vivaha · మన వివాహ</h1>
          <p className={`text-xs font-bold uppercase tracking-widest text-[#7A0C2E] ${te ? "telugu" : ""}`}>
            {te ? "అధికారిక ఆపరేషన్స్ & అడ్మిన్ లాగిన్" : "Private operations sign-in"}
          </p>
        </div>

        <form onSubmit={submit} className="space-y-5 rounded-3xl border border-gold/30 bg-white p-6 shadow-xl shadow-slate-200/50 sm:p-7">
          <div className="grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1" role="group" aria-label={te ? "ఖాతా పాత్రను ఎంచుకోండి" : "Choose account role"}>
            <button
              type="button"
              onClick={() => switchTab("admin")}
              aria-pressed={roleTab === "admin"}
              className={`flex min-h-11 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-black transition-all ${roleTab === "admin" ? "bg-white text-[#7A0C2E] shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
            >
              <span aria-hidden="true">👑</span>
              <span>{te ? "అడ్మిన్ / ఓనర్" : "Owner / admin"}</span>
            </button>
            <button
              type="button"
              onClick={() => switchTab("worker")}
              aria-pressed={roleTab === "worker"}
              className={`flex min-h-11 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-black transition-all ${roleTab === "worker" ? "bg-white text-slate-800 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
            >
              <span aria-hidden="true">👷</span>
              <span>{te ? "స్టాఫ్ / వర్కర్" : "Staff / worker"}</span>
            </button>
          </div>

          <div className="flex items-start gap-2 rounded-2xl border border-amber-200/60 bg-amber-50/70 p-3 text-xs text-amber-950">
            <span className="shrink-0 text-base" aria-hidden="true">🔒</span>
            <p className={`leading-relaxed ${te ? "telugu" : ""}`}>
              {te
                ? "అధీకృత సిబ్బందికి మాత్రమే. మీ పాత్ర మరియు అనుమతుల ఆధారంగా యాక్సెస్ పరిమితం చేయబడుతుంది."
                : "Authorized staff only. Access is limited according to your account role and permissions."}
            </p>
          </div>

          <div>
            <label htmlFor="control-username" className={`mb-1 block text-xs font-bold text-slate-700 ${te ? "telugu" : ""}`}>
              {te ? "యూజర్‌నేమ్" : "Username"}
            </label>
            <input
              id="control-username"
              required
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="w-full rounded-xl border border-slate-300 p-3 text-sm font-semibold focus:border-[#7A0C2E] focus:outline-none focus:ring-2 focus:ring-[#7A0C2E]/20"
              autoComplete="username"
              placeholder={te ? "మీకు కేటాయించిన యూజర్‌నేమ్" : "Assigned username"}
            />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between gap-3">
              <label htmlFor="control-password" className={`block text-xs font-bold text-slate-700 ${te ? "telugu" : ""}`}>
                {te ? "పాస్‌వర్డ్" : "Password"}
              </label>
              <button
                type="button"
                onClick={() => setShowPassword((shown) => !shown)}
                aria-label={showPassword ? (te ? "పాస్‌వర్డ్ దాచు" : "Hide password") : (te ? "పాస్‌వర్డ్ చూపించు" : "Show password")}
                className="min-h-9 rounded px-2 text-[11px] font-bold text-[#7A0C2E] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7A0C2E]"
              >
                {showPassword ? (te ? "దాచు" : "Hide") : (te ? "చూపించు" : "Show")}
              </button>
            </div>
            <input
              id="control-password"
              required
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-slate-300 p-3 text-sm font-semibold focus:border-[#7A0C2E] focus:outline-none focus:ring-2 focus:ring-[#7A0C2E]/20"
              autoComplete="current-password"
            />
          </div>

          {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700">⚠️ {error}</div>}

          <button
            type="submit"
            disabled={busy}
            className="min-h-12 w-full rounded-2xl bg-gradient-to-r from-[#7A0C2E] to-[#96123b] p-3 text-sm font-black text-white shadow-md transition-all hover:brightness-110 disabled:opacity-50"
          >
            {busy
              ? (te ? "లాగిన్ అవుతోంది…" : "Signing in…")
              : (te ? `లాగిన్ చేయండి (${roleTab === "admin" ? "అడ్మిన్" : "వర్కర్"})` : `Sign in as ${roleTab === "admin" ? "owner/admin" : "staff"}`)}
          </button>
        </form>

        <p className={`mt-5 text-center text-[11px] text-slate-400 ${te ? "telugu" : ""}`}>
          {te
            ? "గోప్యత మరియు భద్రత కోసం ఈ పోర్టల్ పబ్లిక్ సైట్‌లో లింక్ చేయబడలేదు • మన వివాహ © 2026"
            : "This private portal is not linked from the public site • Mana Vivaha © 2026"}
        </p>
        <Link href="/" className={`mt-3 flex min-h-10 items-center justify-center rounded-lg text-xs font-semibold text-[#7A0C2E] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7A0C2E] ${te ? "telugu" : ""}`}>
          {te ? "← ప్రధాన సైట్‌కు తిరిగి వెళ్ళండి" : "← Return to the public site"}
        </Link>
      </div>
    </div>
  );
}
