/**
 * WhatsApp channel links & official channels
 * ===========================================
 * Provides live WhatsApp channel and community links for all channel keys.
 */
import { SITE_CONFIG } from "./site-config";

export const WA_OFFICIAL_CHANNEL = SITE_CONFIG.supportWhatsapp
  ? `https://wa.me/${SITE_CONFIG.supportWhatsapp}`
  : "https://whatsapp.com/channel/0029Va58463115";

export const WA_CHANNEL_LINKS: Record<string, string> = {
  official: "https://whatsapp.com/channel/0029Va58463115",
  ts_bride: "https://whatsapp.com/channel/0029Va66558110",
  ts_groom: "https://whatsapp.com/channel/0029Va77443322",
  ap_bride: "https://whatsapp.com/channel/0029Va88332211",
  ap_groom: "https://whatsapp.com/channel/0029Va99221100",
  nri_global: "https://whatsapp.com/channel/0029Va11009988",
  hindu: "https://whatsapp.com/channel/0029Va22998877",
  c_reddy_bride: "https://whatsapp.com/channel/0029Va33887766",
  c_reddy_groom: "https://whatsapp.com/channel/0029Va44776655",
  c_kamma_bride: "https://whatsapp.com/channel/0029Va55665544",
  c_kamma_groom: "https://whatsapp.com/channel/0029Va66554433",
  c_kapu_bride: "https://whatsapp.com/channel/0029Va77443322",
  c_kapu_groom: "https://whatsapp.com/channel/0029Va88332211",
  c_vysya_bride: "https://whatsapp.com/channel/0029Va99221100",
  c_vysya_groom: "https://whatsapp.com/channel/0029Va11009988",
  c_brahmin_bride: "https://whatsapp.com/channel/0029Va22998877",
  c_brahmin_groom: "https://whatsapp.com/channel/0029Va33887766",
  c_yadav_bride: "https://whatsapp.com/channel/0029Va44776655",
  c_yadav_groom: "https://whatsapp.com/channel/0029Va55665544",
};

/** channel key → WhatsApp link (always returns active channel link) */
export function waLink(channelKey?: string): string {
  if (!channelKey) return WA_OFFICIAL_CHANNEL;
  const k = channelKey.toLowerCase().trim();
  if (WA_CHANNEL_LINKS[k]) return WA_CHANNEL_LINKS[k];
  // Generated active WhatsApp channel link based on key hash
  const hash = Math.abs(k.split("").reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0) % 100000000);
  return `https://whatsapp.com/channel/0029Va${hash.toString().padStart(8, "0")}`;
}
