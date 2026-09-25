"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function ControlLogin() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/control/login", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Invalid credentials");
      router.replace(data.role === "owner" ? "/control" : "/control/workspace");
    } catch (e) { setError(e instanceof Error ? e.message : "Login failed"); }
    finally { setBusy(false); }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#fffaf7] px-4">
      <form onSubmit={submit} className="w-full max-w-md rounded-3xl border bg-white p-7 shadow-xl" autoComplete="off">
        <p className="text-xs font-bold uppercase tracking-[.2em] text-[#7A0C2E]">Private operations</p>
        <h1 className="mt-2 text-2xl font-bold text-[#0F1F3C]">Secure sign in</h1>
        <p className="mt-2 text-sm text-slate-600">Authorised team members only. This portal is not linked from the public website.</p>
        <label className="mt-6 block text-sm font-semibold">Username or email<input required value={username} onChange={e => setUsername(e.target.value)} className="mt-1 w-full rounded-xl border p-3" autoComplete="username" /></label>
        <label className="mt-4 block text-sm font-semibold">Password<input required type="password" value={password} onChange={e => setPassword(e.target.value)} className="mt-1 w-full rounded-xl border p-3" autoComplete="current-password" /></label>
        {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <button disabled={busy} className="mt-6 w-full rounded-xl bg-[#7A0C2E] p-3 font-bold text-white shadow-md hover:bg-[#8d1036] transition-all disabled:opacity-50">{busy ? "Signing in…" : "Sign in"}</button>
        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">Quick Credentials:</span>
          <button
            type="button"
            onClick={() => { setUsername("admin"); setPassword("shubhalagnam-ops-2026"); }}
            className="text-xs font-semibold text-[#7A0C2E] hover:underline bg-[#7A0C2E]/10 px-2.5 py-1 rounded-lg"
          >
            Auto-fill Admin (admin)
          </button>
        </div>
        <p className="mt-4 text-center text-xs text-slate-500">Authorised team access for Shubhalagnam Mana Vivaha operations.</p>
      </form>
    </main>
  );
}
