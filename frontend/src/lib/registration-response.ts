type RegistrationConfirmation = Record<string, any> & {
  tsap_id: string;
  card_url: string;
  credits: number;
  phone_verified: boolean;
  is_approved: boolean;
};

function record(value: unknown): value is Record<string, any> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** Match the registration and same-key recovery response, not an HTTP status alone. */
export function registrationConfirmation(value: unknown): RegistrationConfirmation | null {
  if (!record(value) || ("success" in value && value.success !== true) || "detail" in value) return null;
  if (typeof value.tsap_id !== "string" || !/^[A-Z0-9][A-Z0-9_-]{0,63}$/.test(value.tsap_id)) return null;
  if (typeof value.card_url !== "string") return null;
  if (value.card_url && value.card_url !== `/cards/${value.tsap_id}.png`) return null;
  if (!Number.isSafeInteger(value.credits) || value.credits < 0) return null;
  if (typeof value.phone_verified !== "boolean" || typeof value.is_approved !== "boolean") return null;
  if ("auth_token" in value && typeof value.auth_token !== "string") return null;
  if (value.email_verify != null) {
    if (!record(value.email_verify)) return null;
    for (const key of ["required", "sent", "verified"]) {
      if (key in value.email_verify && typeof value.email_verify[key] !== "boolean") return null;
    }
  }
  if (value.referral != null) {
    if (!record(value.referral)) return null;
    if (value.referral.joined_with != null) {
      const joined = value.referral.joined_with;
      if (!record(joined) || typeof joined.ok !== "boolean") return null;
      if ("bonus_credits" in joined && (!Number.isSafeInteger(joined.bonus_credits) || joined.bonus_credits < 0)) return null;
    }
  }
  return value as RegistrationConfirmation;
}
