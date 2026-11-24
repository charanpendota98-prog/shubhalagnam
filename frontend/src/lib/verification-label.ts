export const VERIFICATION_EMOJI = ["📱", "📷", "📸", "🤳", "🪪", "🧾", "🎓", "💼", "🏡", "🪔", "✍️"] as const;
const leadingVerificationEmoji = new RegExp(`^(?:${VERIFICATION_EMOJI.join("|")})\\s*`, "u");

// Strip only a recognized leading badge icon. Unknown and mid-label content stays intact.
export function verificationLabel(text: unknown): string {
  return String(text ?? "").replace(leadingVerificationEmoji, "");
}
