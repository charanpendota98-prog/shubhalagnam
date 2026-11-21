/** The verify-email endpoint confirms one of two completed verification states. */
export function confirmedEmailVerification(status: number, value: unknown): boolean {
  if (status !== 200 || !value || typeof value !== "object" || Array.isArray(value)) return false;
  const reply = value as Record<string, unknown>;
  if (reply.success !== true || reply.detail || reply.error) return false;
  for (const key of ["email_verified", "already_verified"]) {
    if (reply[key] !== undefined && typeof reply[key] !== "boolean") return false;
  }
  return reply.email_verified === true || reply.already_verified === true;
}
