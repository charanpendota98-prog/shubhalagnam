import { getCsrfToken } from "./api";
import { isSafeSameOriginPath } from "./safe-media-path";

/** Partner requests keep their scoped identity. Never attach credentials to an external URL. */
export function partnerRequestInit(url: string, init?: RequestInit, origin = window.location.origin): RequestInit {
  if (!isSafeSameOriginPath(url, origin)) throw new Error("Unsafe partner service path");
  const headers = new Headers(init?.headers);
  if (["POST", "PUT", "PATCH", "DELETE"].includes((init?.method || "GET").toUpperCase())) {
    const csrf = getCsrfToken();
    if (csrf) headers.set("X-CSRF-Token", csrf);
  }
  return { ...init, headers };
}
