/**
 * Validate a media URL before an authenticated browser fetch. The application
 * stores media under same-origin paths; protocol-relative and backslash paths
 * can otherwise escape that origin and receive custom auth headers.
 */
export function isSafeRootRelativePath(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.startsWith("/")
    && !value.startsWith("//") && !value.includes("\\")
    && value.trim() === value && !/[\u0000-\u0020\u007f]/.test(value);
}

export function isSafeSameOriginPath(value: unknown, origin: string): value is string {
  if (!isSafeRootRelativePath(value)) return false;

  try {
    const base = new URL(origin);
    if ((base.protocol !== "http:" && base.protocol !== "https:")
        || base.username || base.password) return false;
    const target = new URL(value, base);
    return target.origin === base.origin && !target.username && !target.password;
  } catch {
    return false;
  }
}
