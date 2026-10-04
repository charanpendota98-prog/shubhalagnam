import { ALL_CHANNELS } from "./channels";
import { SITE_CONFIG } from "./site-config";

/**
 * WhatsApp channel URLs are generated from backend/channels_config.py by
 * backend/gen_frontend_channels.py. URL shape is validated here too; external
 * availability is not checked by the app. A wa.me phone/chat URL is a support
 * destination, not a channel invite, so it is intentionally rejected here.
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

export const WA_CHANNEL_LINKS: Record<string, string> = ALL_CHANNELS.reduce<Record<string, string>>(
  (links, channel) => {
    if (channel.whatsappLink && isWhatsAppChannelUrl(channel.whatsappLink)) {
      links[channel.key] = channel.whatsappLink;
    }
    return links;
  },
  {},
);

/** @deprecated This is a support chat, not an official WhatsApp channel. */
export const WA_OFFICIAL_CHANNEL = SITE_CONFIG.supportLink;

const CHANNEL_ALIASES: Record<string, string> = {
  c_yadav_bride: "c_yadava_goud_bride",
  c_yadav_groom: "c_yadava_goud_groom",
};

export type WhatsAppLink = { url: string; isDirectChannel: boolean };

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

/** Build a share-sheet URL without asserting a recipient number. */
export function whatsappShareLink(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/** A support chat is distinct from an official channel invite. */
export function getWASupportLink(channelKey?: string): string {
  if (!SITE_CONFIG.supportWhatsapp) return "";
  const label = channelKey || "Mana Vivaha";
  return whatsappPhoneLink(
    SITE_CONFIG.supportWhatsapp,
    `Hi! Please share the ${label} WhatsApp channel link.`,
  ) || "";
}

/** Return a configured channel URL, or an explicitly labelled support-chat fallback. */
export function getWAChannelLink(channelKey?: string): WhatsAppLink {
  const key = (channelKey || "").toLowerCase().trim();
  const link = WA_CHANNEL_LINKS[CHANNEL_ALIASES[key] || key];
  if (link) return { url: link, isDirectChannel: true };

  // A support-chat fallback is only available when an administrator has
  // explicitly configured a support destination; never invent a number.
  return { url: getWASupportLink(channelKey), isDirectChannel: false };
}

/** URL-only helper for direct channel links; never substitutes a support chat. */
export function waLink(channelKey?: string): string {
  const key = (channelKey || "").toLowerCase().trim();
  return WA_CHANNEL_LINKS[CHANNEL_ALIASES[key] || key] || "";
}
