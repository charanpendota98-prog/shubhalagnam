/** Serialize JSON-LD for an inline script element without allowing HTML/script breakout. */
const SCRIPT_UNSAFE_CHARS: Record<string, string> = {
  "<": "\\u003c",
  ">": "\\u003e",
  "&": "\\u0026",
};

export function serializeJsonLd(value: unknown): string {
  const json = JSON.stringify(value);
  if (typeof json !== "string") {
    throw new TypeError("JSON-LD value must be serializable");
  }
  return json.replace(/[<>&]/g, (char) => SCRIPT_UNSAFE_CHARS[char] ?? char);
}
