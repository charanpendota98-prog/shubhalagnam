"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ControlLogin() {
  const router = useRouter();
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
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "చెల్లని యూజర్‌నేమ్ లేదా పాస్‌వర్డ్ (Invalid credentials)");
      router.replace(data.role === "owner" ? "/control" : "/control/workspace");
    } catch (e) {
      setError(e instanceof Error ? e.message : "లాగిన్ విఫలమైంది");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#FAF7F2] px-4 py-12">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-6 space-y-1">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-[#7A0C2E] to-[#50081e] text-white text-2xl font-black shadow-lg shadow-maroon/20 mb-2 border border-gold/40">
            వి
          </div>
          <h1 className="text-2xl font-black text-[#0F1F3C]">మన వివాహ (Mana Vivaha)</h1>
          <p className="text-xs font-bold uppercase tracking-widest text-[#7A0C2E]">
            అధికారిక ఆపరేషన్స్ & అడ్మిన్ లాగిన్
          </p>
        </div>

        {/* Login Card */}
        <form
          onSubmit={submit}
          className="rounded-3xl border border-gold/30 bg-white p-7 shadow-xl shadow-slate-200/50 space-y-5"
        >
          {/* Role Selection Tabs */}
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl gap-1">
            <button
              type="button"
              onClick={() => switchTab("admin")}
              className={`py-2 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                roleTab === "admin"
                  ? "bg-white text-[#7A0C2E] shadow-sm font-black"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>👑</span>
              <span>అడ్మిన్ / ఓనర్</span>
            </button>
            <button
              type="button"
              onClick={() => switchTab("worker")}
              className={`py-2 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                roleTab === "worker"
                  ? "bg-white text-slate-800 shadow-sm font-black"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>👷</span>
              <span>స్టాఫ్ / వర్కర్</span>
            </button>
          </div>

          <div className="bg-amber-50/70 rounded-2xl p-3 border border-amber-200/60 text-xs text-amber-950 flex items-start gap-2">
            <span className="text-base shrink-0">🔒</span>
            <p className="leading-relaxed">అధీకృత సిబ్బందికి మాత్రమే. మీ ఖాతా పాత్ర మరియు అనుమతుల ఆధారంగా యాక్సెస్ పరిమితం చేయబడుతుంది.</p>
          </div>

          {/* Username */}
          <div>
            <label htmlFor="control-username" className="block text-xs font-bold text-slate-700 mb-1">
              యూజర్‌నేమ్ (Username)
            </label>
            <input
              id="control-username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-xl border border-slate-300 p-3 text-xs font-bold focus:border-[#7A0C2E] focus:outline-none transition"
              autoComplete="username"
              placeholder="మీకు కేటాయించిన యూజర్‌నేమ్"
            />
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="control-password" className="block text-xs font-bold text-slate-700">
                పాస్‌వర్డ్ (Password)
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[11px] text-[#7A0C2E] font-bold hover:underline"
              >
                {showPassword ? "దాచు (Hide)" : "చూపించు (Show)"}
              </button>
            </div>
            <input
              id="control-password"
              required
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-300 p-3 text-xs font-bold focus:border-[#7A0C2E] focus:outline-none transition"
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div role="alert" className="rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700 border border-rose-200">
              ⚠️ {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-2xl bg-gradient-to-r from-[#7A0C2E] to-[#96123b] p-3 text-xs font-black text-white shadow-md hover:brightness-110 active:scale-98 transition-all disabled:opacity-50"
          >
            {busy ? "లాగిన్ అవుతోంది…" : `లాగిన్ చేయండి (${roleTab === "admin" ? "Admin" : "Worker"})`}
          </button>

        </form>

        <p className="mt-5 text-center text-[11px] text-slate-400">
          గోప్యత మరియు భద్రత కోసం ఈ పోర్టల్ పబ్లిక్ సైట్‌లో లింక్ చేయబడలేదు • మన వివాహ © 2026
        </p>
      </div>
    </div>
  );
}

