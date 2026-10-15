/**
 * WhatsApp channel URLs are validated as HTTPS WhatsApp invite destinations;
 * URL shape does not prove that an invite is active. A wa.me phone/chat URL is
 * deliberately handled as a separate, explicitly configured support/contact link.
 */
export function isWhatsAppChannelUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port || url.hash) return false;
    const path = url.pathname.replace(/^\/+|\/+$/g, "");
    if (["whatsapp.com", "www.whatsapp.com"].includes(url.hostname.toLowerCase())) {
      return /^channel\/[A-Za-z0-9_-]{12,128}$/.test(path);
    }
    if (url.hostname.toLowerCase() === "chat.whatsapp.com") {
      return /^[A-Za-z0-9_-]{12,128}$/.test(path);
    }
    return false;
  } catch {
    return false;
  }
}

/** Accept only real Telegram public channel/group links, never arbitrary hrefs. */
export function isTelegramChannelUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port || url.hash) return false;
    if (!["t.me", "telegram.me"].includes(url.hostname.toLowerCase())) return false;
    const path = url.pathname.replace(/^\/+|\/+$/g, "");
    return /^(?:[A-Za-z0-9_]{5,32}|\+[A-Za-z0-9_-]{6,128}|joinchat\/[A-Za-z0-9_-]{6,128}|c\/\d+\/\d+)$/.test(path);
  } catch {
    return false;
  }
}

/** Normalize Indian or international phone input for WhatsApp click-to-chat URLs. */
export function normalizeWhatsAppPhone(value: unknown, defaultCountryCode = "91"): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  let digits = String(value).trim().replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  if (digits.length === 10) digits = `${defaultCountryCode}${digits}`;
  return /^[1-9]\d{7,14}$/.test(digits) ? digits : null;
}

/** Build a click-to-chat URL, returning null rather than a malformed recipient link. */
export function whatsappPhoneLink(value: unknown, text?: string): string | null {
  const phone = normalizeWhatsAppPhone(value);
  if (!phone) return null;
  const query = text ? `?text=${encodeURIComponent(text)}` : "";
  return `https://wa.me/${phone}${query}`;
}

/** Canonicalize only an explicit wa.me phone URL; reject arbitrary vendor hrefs. */
export function safeWhatsAppPhoneLink(value: string): string {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname.toLowerCase() !== "wa.me"
        || url.username || url.password || url.port || url.hash) return "";
    const phone = url.pathname.replace(/^\/+|\/+$/g, "");
    const params = [...url.searchParams.keys()];
    if (!/^[1-9]\d{7,14}$/.test(phone) || params.length > 1 || params.some((key) => key !== "text")) return "";
    return whatsappPhoneLink(phone, url.searchParams.get("text") || undefined) || "";
  } catch {
    return "";
  }
}

/** Build a share-sheet URL without asserting a recipient number. */
export function whatsappShareLink(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
