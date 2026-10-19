/**
 * 🛡️ WAVE 9 — apiFetch: single place for API calls
 *  • auth token (X-Tsap-Token) — private endpoints IDOR fix
 *  • admin key (X-Admin-Key) — PII endpoints
 *  • timeout + retry + safe JSON parse + language-aware API messages
 */

import { isSafeRootRelativePath, isSafeSameOriginPath } from "./safe-media-path";

const TELUGU_SCRIPT = /[\u0c00-\u0c7f]/;
const ROMAN_TELUGU = /\b(?:meeku|meeru|mee|manam|mari|chesi|chesina|chesukondi|chesukovachu|cheyyandi|cheyandi|cheyyali|cheppandi|chepparu|chestunnam|chestunnaru|chestundi|chustaru|chudandi|chudatam|ayyindi|ayindi|avvaledu|avvadu|avvali|avutundi|kaaledu|saripoledu|ledu|undi|malli|konchem|pampincham|pampinchu|pampandi|ivvandi|ivvakandi|ikkada|akkada|daggara|nunchi|kosam|kuda|tarvata|mundhu|varaku|vastundi|kavali|garu|randi|enduku)\b/i;

function selectedLanguage(): "te" | "en" {
  if (typeof window === "undefined") return "te";
  try {
    const saved = localStorage.getItem("tsap_lang");
    if (saved === "te" || saved === "en") return saved;
  } catch { /* fall through to the document setting */ }
  return document.documentElement.dataset.lang === "en" ? "en" : "te";
}

function hasUntranslatedTelugu(text: string): boolean {
  return TELUGU_SCRIPT.test(text) || ROMAN_TELUGU.test(text);
}

function cleanEnglishCandidate(value: unknown): string {
  if (typeof value !== "string") return "";
  const text = value.trim();
  if (!text || hasUntranslatedTelugu(text)) return "";
  return text;
}

export function apiDisplayMessage(payload: unknown, telugu: boolean, fallback = ""): string {
  const record = payload && typeof payload === "object" && !Array.isArray(payload)
    ? payload as Record<string, unknown>
    : null;
  const candidates = telugu
    ? [record?.message_telugu, record?.message_te, record?.detail_te, record?.detail, record?.error, record?.message, payload]
    : [record?.message_en, record?.error_en, record?.detail_en, record?.ack_en, record?.message, record?.detail, record?.error, record?.reason, payload];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      const text = candidate.trim();
      if (telugu || !hasUntranslatedTelugu(text)) return text;
    }
    if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) {
      const localized = candidate as Record<string, unknown>;
      const nested = telugu
        ? [localized.te, localized.message_telugu, localized.en]
        : [localized.en, localized.message_en, localized.message, localized.te];
      const text = nested.map((value) => telugu ? (typeof value === "string" ? value.trim() : "") : cleanEnglishCandidate(value)).find(Boolean);
      if (text && (telugu || !hasUntranslatedTelugu(text))) return text;
    }
  }
  if (fallback && (telugu || !hasUntranslatedTelugu(fallback))) return fallback;
  return "";
}

export async function readApiJson<T = any>(response: Response): Promise<T> {
  // Some legitimate endpoints answer 204 or an upstream proxy can return a
  // non-JSON error page. `response.json()` would throw and turn a recoverable
  // API error into an unhandled promise rejection in every caller. Consume the
  // body once, parse defensively, and preserve a small object shape callers can
  // safely inspect (`success`, `detail`).
  const text = await response.text();
  if (!text.trim()) {
    return normalizeApiPayload({ success: response.ok, status: response.status }, response.ok) as T;
  }
  try {
    const payload = JSON.parse(text) as T;
    return normalizeApiPayload(payload, response.ok) as T;
  } catch {
    return {
      success: false,
      status: response.status,
      detail: response.ok ? "The server returned an unreadable response." : `Request failed (HTTP ${response.status}).`,
    } as T;
  }
}

function normalizeApiPayload<T>(value: T, successfulResponse: boolean): T {
  if (selectedLanguage() !== "en" || !value || typeof value !== "object") return value;
  const genericMessage = successfulResponse
    ? "Your request was completed."
    : "The request could not be completed. Please try again.";

  const visit = (input: unknown): unknown => {
    if (Array.isArray(input)) return input.map(visit);
    if (!input || typeof input !== "object") return input;
    const source = input as Record<string, unknown>;
    const output: Record<string, unknown> = { ...source };
    const explicitEnglish = [source.message_en, source.error_en, source.detail_en, source.ack_en, source.en]
      .map(cleanEnglishCandidate)
      .find(Boolean) || "";
    const safeSibling = [source.message, source.detail, source.error, source.reason]
      .map(cleanEnglishCandidate)
      .find(Boolean) || "";
    const fallback = explicitEnglish || safeSibling || genericMessage;

    // Legacy components still read `message_telugu` directly. Sanitize it in
    // English mode when it actually contains Telugu script or transliteration.
    for (const key of ["message_telugu", "ack_telugu", "message_te", "detail", "error", "reason", "message"]) {
      const field = output[key];
      if (typeof field === "string" && hasUntranslatedTelugu(field)) output[key] = fallback;
    }
    if (source.detail && typeof source.detail === "object" && !Array.isArray(source.detail)) {
      const detail = { ...(source.detail as Record<string, unknown>) };
      if (typeof detail.te === "string" && hasUntranslatedTelugu(detail.te)) {
        detail.te = cleanEnglishCandidate(detail.en) || explicitEnglish || genericMessage;
      }
      output.detail = visit(detail);
    }
    for (const [key, field] of Object.entries(output)) {
      if (key !== "detail") output[key] = visit(field);
    }
    return output;
  };

  return visit(value) as T;
}

export const TOKEN_KEY = "tsap_token";
export const TSAP_KEY = "tsap_id";
export const ADMIN_KEY_STORE = "tsap_admin_key";

export type ApiResult<T> = {
  ok: boolean;
  status: number;
  data: T | null;
  error: string;
  /** Backwards-compatible field name; contains text localized to the selected language. */
  errorTelugu: string;
  needsLogin: boolean;
  needsAdminKey: boolean;
  retryAfter?: number;
};

export function getToken(): string {
  if (typeof window === "undefined") return "";
  // New sessions are HttpOnly-cookie authenticated. A sessionStorage token is
  // retained only as a short-lived migration/fallback credential; never keep a
  // reusable member bearer token in persistent localStorage.
  try { return sessionStorage.getItem(TOKEN_KEY) || ""; }
  catch { return ""; }
}

export function getTsapId(): string {
  if (typeof window === "undefined") return "";
  try { return localStorage.getItem(TSAP_KEY) || sessionStorage.getItem(TSAP_KEY) || ""; }
  catch { return ""; }
}

// keep=true preserves the non-secret profile id, not the bearer token. The
// server-issued HttpOnly cookie is the durable session; sessionStorage is a
// bounded compatibility path for older/header-based deployments.
export function setToken(token: string, tsapId?: string, keep = true) {
  if (typeof window === "undefined") return;
  try {
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
    else sessionStorage.removeItem(TOKEN_KEY);
    if (tsapId) {
      (keep ? localStorage : sessionStorage).setItem(TSAP_KEY, tsapId);
    }
    // Remove any legacy persistent bearer credential immediately after login.
    localStorage.removeItem(TOKEN_KEY);
    if (keep) sessionStorage.removeItem(TSAP_KEY);
  } catch { /* private mode */ }
}

export function getCsrfToken(): string {
  if (typeof document === "undefined") return "";
  try {
    const item = document.cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith("mv_member_csrf="));
    return item ? decodeURIComponent(item.slice("mv_member_csrf=".length)) : "";
  } catch {
    return "";
  }
}

export function getAdminKey(): string {
  if (typeof window === "undefined") return "";
  try { return localStorage.getItem(ADMIN_KEY_STORE) || ""; } catch { return ""; }
}

export function setAdminKey(key: string) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(ADMIN_KEY_STORE, key); } catch { /* ignore */ }
}

export function clearAuth() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TSAP_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TSAP_KEY);
  } catch { /* ignore */ }
}

type Opts = {
  method?: "GET" | "POST" | "DELETE" | "PUT";
  body?: unknown;
  form?: FormData;
  admin?: boolean;
  timeoutMs?: number;
  retries?: number;
  cache?: RequestCache;
};

export async function apiFetch<T = unknown>(path: string, opts: Opts = {}): Promise<ApiResult<T>> {
  const { method = "GET", body, form, admin = false, timeoutMs = 12000, retries: requestedRetries, cache } = opts;
  // Never replay a mutation automatically. A lost response after a successful
  // POST could otherwise duplicate registration, payment, interest, payout, or
  // moderation actions. GET remains retryable; callers may explicitly opt a
  // proven-idempotent write into retries with `retries: 1`.
  const retries = requestedRetries ?? (method === "GET" ? 1 : 0);
  // This shared client attaches member/admin credentials. Reject absolute,
  // protocol-relative, and malformed paths before reading credentials or fetch().
  const safePath = typeof window === "undefined"
    ? isSafeRootRelativePath(path)
    : isSafeSameOriginPath(path, window.location.origin);
  if (!safePath) {
    const message = selectedLanguage() === "en"
      ? "Request blocked: service calls must use a safe same-origin path."
      : "భద్రతా కారణాల వల్ల ఈ అభ్యర్థనను నిలిపివేశాం. మళ్లీ ప్రయత్నించండి.";
    return { ok: false, status: 0, data: null, error: message, errorTelugu: message,
      needsLogin: false, needsAdminKey: false };
  }

  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers["X-Tsap-Token"] = token;
  if (admin) {
    const key = getAdminKey();
    if (key) headers["X-Admin-Key"] = key;
  }
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const csrf = getCsrfToken();
  if (csrf) headers["X-CSRF-Token"] = csrf;
  headers["Accept-Language"] = selectedLanguage() === "en" ? "en" : "te";

  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(path, {
        method,
        headers,
        body: form ? form : body !== undefined ? JSON.stringify(body) : undefined,
        signal: ctrl.signal,
        credentials: "same-origin",
        cache,
      });
      clearTimeout(timer);
      const text = await res.text();
      let data: T | null = null;
      try { data = text ? (JSON.parse(text) as T) : null; } catch { data = null; }
      const parsed = (data || {}) as Record<string, unknown>;
      const successfulResponse = res.ok && parsed.success !== false;
      if (data !== null) data = normalizeApiPayload(data, successfulResponse);
      const d = (data || {}) as Record<string, unknown>;
      const lang = selectedLanguage();
      // FastAPI validation errors often put `{te, en}` inside `detail`.
      // String(detail) would render as the literal `[object Object]`; use the
      // same bilingual extractor as the rest of the client instead.
      const rawMessage = apiDisplayMessage(data, true, "");
      const englishMessage = apiDisplayMessage(data, false, "");
      const englishFallback = res.status === 401
        ? "Your session has expired or sign-in is required."
        : res.status === 403
        ? "You do not have permission to complete this action."
        : res.status === 404
        ? "The requested item was not found."
        : res.status === 409
        ? "This request conflicts with the current state. Refresh and try again."
        : res.status === 413
        ? "The uploaded file is too large."
        : res.status === 422
        ? "Some submitted information is invalid. Review it and try again."
        : res.status === 429
        ? "Too many requests. Please wait and try again."
        : res.status >= 500
        ? "A server problem occurred. Please try again shortly."
        : "The request could not be completed. Please try again.";
      const localizedError = lang === "en"
        ? (englishMessage || cleanEnglishCandidate(rawMessage) || englishFallback)
        : (rawMessage || (res.status === 401
          ? "🔒 Mee account ki OTP login cheyyandi"
          : res.status === 403
          ? "🔒 Ee data ki access ledu (admin key / owner matrame)"
          : res.status === 429
          ? "⏳ Chala fast ga try chestunnaru — konchem aagi malli try cheyyandi"
          : "⚠️ Server problem — malli try cheyyandi"));
      const isJson = data !== null && typeof data === "object";
      if (res.ok) {
        return { ok: true, status: res.status, data, error: "", errorTelugu: rawMessage, needsLogin: false, needsAdminKey: false };
      }
      // 5xx → retry once (server hiccup)
      if (res.status >= 500 && attempt < retries) { await new Promise((r) => setTimeout(r, 400)); continue; }
      return {
        ok: false,
        status: res.status,
        data: isJson ? data : null,
        error: localizedError,
        errorTelugu: localizedError,
        needsLogin: res.status === 401,
        needsAdminKey: res.status === 403 && admin,
        retryAfter: Number(res.headers.get("Retry-After") || d.retry_after || 0) || undefined,
      };
    } catch (err) {
      clearTimeout(timer);
      if (attempt < retries) { await new Promise((r) => setTimeout(r, 400)); continue; }
      const aborted = (err as Error)?.name === "AbortError";
      const lang = selectedLanguage();
      const localizedError = lang === "en"
        ? (aborted ? "The request timed out. Please try again." : "A network connection could not be established. Check your connection and try again.")
        : (aborted ? "⏱️ Server slow ga undi — malli try cheyyandi" : "📡 Internet/server connection ledu — check cheyyandi");
      return {
        ok: false, status: 0, data: null,
        error: lang === "en" ? localizedError : aborted ? "timeout" : "network_error",
        errorTelugu: localizedError,
        needsLogin: false, needsAdminKey: false,
      };
    }
  }
  const unreachable = selectedLanguage() === "en" ? "The request could not be completed. Please try again." : "⚠️ Try cheyyandi";
  return { ok: false, status: 0, data: null, error: unreachable, errorTelugu: unreachable, needsLogin: false, needsAdminKey: false };
}

/** GET shorthand */
export const apiGet = <T = unknown>(path: string, admin = false) => apiFetch<T>(path, { admin });

/** POST shorthand */
export const apiPost = <T = unknown>(path: string, body?: unknown, admin = false) =>
  apiFetch<T>(path, { method: "POST", body: body ?? {}, admin });

/**
 * Download a protected file without putting an admin/member credential in the
 * URL. `opening a protected export URL with a query token leaks secrets to browser
 * history, reverse-proxy logs, analytics and Referer headers; fetch + Blob keeps
 * the existing X-Admin-Key/X-Tsap-Token header path instead.
 */
export async function downloadAuthenticatedFile(path: string, suggestedName = "download") {
  if (typeof window === "undefined" || !isSafeSameOriginPath(path, window.location.origin)) {
    return { ok: false, error: "Request blocked: unsafe download path." };
  }
  try {
    const response = await fetch(path, { headers: authHeaders(true), credentials: "same-origin" });
    if (!response.ok) {
      const data = await readApiJson<Record<string, unknown>>(response);
      return { ok: false, error: apiDisplayMessage(data, selectedLanguage() === "te", "Download could not be completed.") };
    }
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = suggestedName.replace(/[^A-Za-z0-9._-]/g, "_") || "download";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000);
    return { ok: true, error: "" };
  } catch {
    return { ok: false, error: selectedLanguage() === "en" ? "Download failed. Please try again." : "డౌన్‌లోడ్ చేయలేకపోయాం. మళ్లీ ప్రయత్నించండి." };
  }
}

/** Local (offline) safe JSON read */
export function readLocal<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
}

export function writeLocal(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}

/** fetch() ki auth headers (token + admin key) — muttadi calls ki convenience */
export function authHeaders(admin = false, json = true): Record<string, string> {
  const h: Record<string, string> = {};
  if (json) h["Content-Type"] = "application/json";
  const token = getToken();
  if (token) h["X-Tsap-Token"] = token;
  const csrf = getCsrfToken();
  if (csrf) h["X-CSRF-Token"] = csrf;
  if (admin) {
    const key = getAdminKey();
    if (key) h["X-Admin-Key"] = key;
  }
  return h;
}
