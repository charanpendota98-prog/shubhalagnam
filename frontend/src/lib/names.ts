/**
 * 👋 WAVE 13 — public name display (first-name only, surname hidden).
 * The backend retains submitted names; public profile cards display only a first name.
 */
export function firstName(fullName?: string): string {
  const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean);
  return parts.length ? parts[0] : "—";
}

/** Paid/admin context: "Lakshmi R." */
export function shortName(fullName?: string): string {
  const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "—";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1].charAt(0)}.`;
}
