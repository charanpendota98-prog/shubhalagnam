/**
 * 🔐 Auth helpers (OTP/password login + token state); demo sign-in is retired.
 * Private API (inbox/credits/views/saved/blocks/referral) ki token kavali — IDOR fix.
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import { apiPost, clearAuth, getToken, getTsapId, setToken } from "./api";

export type Session = { tsapId: string; token: string; ready: boolean };

export function useSession(): Session {
  const [tsapId, setTsapId] = useState("");
  const [token, setTok] = useState("");
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      setTsapId(getTsapId());
      setTok(getToken());
    } catch { /* ignore */ }
    setReady(true);
  }, []);
  return { tsapId, token, ready };
}

/** Mee ID ni save cheyyi (register/login tarvata) */
export function rememberSession(tsapId: string, token: string, keep = true) {
  setToken(token, tsapId, keep);
}

export function logout() {
  clearAuth();
}

/** OTP pampu (login) */
export function sendOtp(phone: string) {
  return apiPost<{ success: boolean; message_telugu?: string }>("/api/otp/send", { phone });
}

/** OTP verify → token + tsap_id */
export function verifyOtp(phone: string, code: string) {
  return apiPost<{ success: boolean; auth_token?: string; tsap_id?: string; has_account?: boolean; message_telugu?: string }>(
    "/api/otp/verify",
    { phone, code },
  );
}

/** Login state verify (token valid aa?) */
export function useAuthCheck() {
  const [state, setState] = useState<{ checking: boolean; valid: boolean; tsapId: string }>({ checking: true, valid: false, tsapId: "" });
  const check = useCallback(async () => {
    setState((s) => ({ ...s, checking: true }));
    const token = getToken();
    if (!token) { setState({ checking: false, valid: false, tsapId: "" }); return; }
    const { ok, data } = await apiPost<{ valid?: boolean; tsap_id?: string }>("/api/auth/verify", {});
    const d = (data || {}) as { valid?: boolean; tsap_id?: string };
    setState({ checking: false, valid: ok && !!d.valid, tsapId: String(d.tsap_id || "") });
  }, []);
  useEffect(() => { void check(); }, [check]);
  return { ...state, recheck: check };
}
