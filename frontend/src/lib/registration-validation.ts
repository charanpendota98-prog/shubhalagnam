import { apiDisplayMessage } from "./api";

/** Match the deployed registration name rule before an upload starts. */
export function registrationNameError(value: unknown, telugu: boolean): string {
  const name = typeof value === "string" ? value.trim() : "";
  if (name.length >= 2 && name.length <= 60 && /^[A-Za-z\u0c00-\u0c7f .'\-]+$/.test(name)) return "";
  return telugu
    ? "పూర్తి పేరు: 2 నుంచి 60 అక్షరాలు ఉండాలి. ఆంగ్లం లేదా తెలుగు అక్షరాలు, ఖాళీలు, చుక్క, అపోస్ట్రఫీ లేదా హైఫన్ మాత్రమే ఉపయోగించండి; అంకెలు లేదా ఇతర గుర్తులు వద్దు."
    : "Full name: use 2–60 characters with English or Telugu letters, spaces, periods, apostrophes or hyphens. Do not include numbers or other symbols.";
}

/** The deployed backend still returns this legacy mixed-language name error. */
export function registrationFailureMessage(payload: unknown, telugu: boolean): string {
  const detail = payload && typeof payload === "object" && !Array.isArray(payload)
    ? (payload as Record<string, unknown>).detail : undefined;
  if (typeof detail === "string" && (
    detail === "⚠️ Name లో letters మాత్రమే (2-60 chars)"
    || detail === "⚠️ full_name సరిగ్గా ఇవ్వండి (2-60 characters)"
  )) return registrationNameError("", telugu);
  return apiDisplayMessage(payload, telugu, telugu
    ? "నమోదులో సమస్య ఏర్పడింది. మీ వివరాలు ఇక్కడే ఉన్నాయి. మళ్లీ ప్రయత్నించండి."
    : "Registration could not be completed. Your entries are still here. Please try again.");
}
