const HINDU_REGISTRATION_FIELDS = ["birth_time", "gothram", "star", "rasi", "moola_nakshatram", "dosham"] as const;

// A resumed draft may hold Hindu details after its owner selects another religion.
// Keep the draft intact, but never submit those hidden references for another branch.
export function registrationReligionPayload(form: Record<string, unknown>): Record<string, unknown> {
  const payload = { ...form };
  if (form.religion !== "Hindu") {
    for (const field of HINDU_REGISTRATION_FIELDS) payload[field] = "";
  }
  return payload;
}
