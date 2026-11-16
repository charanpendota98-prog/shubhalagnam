/**
 * 🔐 Auth helpers (OTP/password login + token state); demo sign-in is retired.
 * Private API (inbox/credits/views/saved/blocks/referral) ki token kavali — IDOR fix.
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet, apiPost, clearAuth, getToken, getTsapId, setToken } from "./api";

export type Session = { tsapId: string; token: string; authenticated: boolean; ready: boolean };

export function useSession(): Session {
  const [tsapId, setTsapId] = useState("");
  const [token, setTok] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    const legacyToken = getToken();
    setTok(legacyToken);
    apiGet<{ valid?: boolean; tsap_id?: string }>("/api/auth/verify").then(({ ok, data }) => {
      if (!active) return;
      const verifiedId = ok && data?.valid ? String(data.tsap_id || "") : "";
      setTsapId(verifiedId);
      setAuthenticated(Boolean(verifiedId));
    }).catch(() => {
      if (active) { setTsapId(""); setAuthenticated(false); }
    }).finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);
  return { tsapId, token, authenticated, ready };
}

/** Mee ID ni save cheyyi (register/login tarvata) */
export function rememberSession(tsapId: string, token: string, keep = true) {
  setToken(token, tsapId, keep);
}

export async function logout() {
  const tsapId = getTsapId();
  // Start revocation before clearing the local migration fallback. The server
  // cookie is HttpOnly and must be explicitly expired/revoked, not just hidden
  // by a client-side logout button.
  const revoke = tsapId
    ? apiPost("/api/auth/logout-everywhere", { tsap_id: tsapId })
    : Promise.resolve();
  clearAuth();
  try { await revoke; } catch { /* local logout still completes if offline */ }
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
    const tsapId = getTsapId();
    // A fresh session is represented by the HttpOnly cookie; the non-secret
    // profile id is only a UI hint. Let the server decide validity.
    if (!token && !tsapId) { setState({ checking: false, valid: false, tsapId: "" }); return; }
    const result = await apiGet<{ valid?: boolean; tsap_id?: string }>("/api/auth/verify");
    if (result.status === 401) clearAuth();
    const d = (result.data || {}) as { valid?: boolean; tsap_id?: string };
    setState({ checking: false, valid: result.ok && !!d.valid, tsapId: String(d.tsap_id || "") });
  }, []);
  useEffect(() => { void check(); }, [check]);
  return { ...state, recheck: check };
}

export type AuthCapabilities = {
  password_login: boolean;
  login_identifier: "phone";
  phone_otp: boolean;
  email_recovery_configured: boolean;
  passkeys_configured: boolean;
  email_optional_at_registration: boolean;
};

export function fetchAuthCapabilities() {
  return apiGet<AuthCapabilities>("/api/auth/capabilities");
}
