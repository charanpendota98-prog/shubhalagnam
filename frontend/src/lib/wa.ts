/** Verified WhatsApp channel links supplied by Mana Vivaha administration. */
import { SITE_CONFIG } from "./site-config";

export const WA_OFFICIAL_CHANNEL = `https://wa.me/${SITE_CONFIG.supportWhatsapp}`;

export const WA_CHANNEL_LINKS: Record<string, string> = {
  "c_brahmin_bride": "https://whatsapp.com/channel/0029VbDba8OLSmbk24oJaf3O",
  "c_brahmin_groom": "https://whatsapp.com/channel/0029VbEKbbYEgGfQi0Y1ao1g",
  "c_kamma_bride": "https://whatsapp.com/channel/0029VbDlfav2ZjChEwBJTB0g",
  "c_kamma_groom": "https://whatsapp.com/channel/0029Vb8r6ZJFXUueNw3SQU3r",
  "c_kapu_bride": "https://whatsapp.com/channel/0029VbDyehn30LKVqYhOfn0L",
  "c_kapu_groom": "https://whatsapp.com/channel/0029Vb8le7LLCoX4ClqFvi1J",
  "c_lambada_banjara_bride": "https://whatsapp.com/channel/0029VbD3CW6HVvTbgyWWvX3r",
  "c_lambada_banjara_groom": "https://whatsapp.com/channel/0029Vb902btGE56gSl4iV10H",
  "c_madiga_bride": "https://whatsapp.com/channel/0029Vb94k5RKAwEkRYeW7m1C",
  "c_madiga_groom": "https://whatsapp.com/channel/0029VbDwFWs60eBX0hvdW93T",
  "c_mala_bride": "https://whatsapp.com/channel/0029VbDtETF65yD6fNeGlf2A",
  "c_mala_groom": "https://whatsapp.com/channel/0029Vb8uW65EwEjvgTserz3x",
  "c_mudiraj": "https://whatsapp.com/channel/0029VbDrXXxATRSsOCpkZD2J",
  "c_munnuru_kapu_bride": "https://whatsapp.com/channel/0029VbECYss60eBcdKqXag3D",
  "c_munnuru_kapu_groom": "https://whatsapp.com/channel/0029VbD3XJa4CrfknKw76i0e",
  "c_others_bc_bride": "https://whatsapp.com/channel/0029VbDz6odI7Be7YAuc1e3w",
  "c_others_bc_groom": "https://whatsapp.com/channel/0029VbE9dOxDDmFZvsPGd31I",
  "c_others_sc_bride": "https://whatsapp.com/channel/0029Vb8oMp4J93we9t58Sr0m",
  "c_others_sc_groom": "https://whatsapp.com/channel/0029VbDNWfI002TDBUfbFp2A",
  "c_padmashali_weavers": "https://whatsapp.com/channel/0029VbDO1JI0AgW8yM52cm1J",
  "c_raju_kshatriya_bride": "https://whatsapp.com/channel/0029VbEEoWhJJhzenO8voU1e",
  "c_raju_kshatriya_groom": "https://whatsapp.com/channel/0029VbDnKz45q08XGV69LJ0f",
  "c_reddy_bride": "https://whatsapp.com/channel/0029VbDpD0N5kg74TpAbIz1R",
  "c_reddy_groom": "https://whatsapp.com/channel/0029Vb900wSEFeXrEfkBNQ0S",
  "c_velama_bride": "https://whatsapp.com/channel/0029Vb98bMQBFLgUhEG7cq37",
  "c_velama_groom": "https://whatsapp.com/channel/0029Vb9KeAeD38CUvyswkO3O",
  "c_viswabrahmana_bride": "https://whatsapp.com/channel/0029Vb8MKAKBA1f7VLuIaX2Y",
  "c_viswabrahmana_groom": "https://whatsapp.com/channel/0029VbDdWlb8aKvK4Rddz32k",
  "c_vysya_bride": "https://whatsapp.com/channel/0029Vb90m6u42DcfPpwvg33K",
  "c_vysya_groom": "https://whatsapp.com/channel/0029VbDl75K7dmeeZMZA2926",
  "c_yadava_goud_bride": "https://whatsapp.com/channel/0029Vb8fFvdHVvTcadiqkp2D",
  "c_yadava_goud_groom": "https://whatsapp.com/channel/0029VbDn2nT7j6g3fdTXgq3A",
  "christian_bride": "https://whatsapp.com/channel/0029Vb8ikeUHgZWViQMiJQ2h",
  "christian_groom": "https://whatsapp.com/channel/0029Vb9U1HC84OmDO5Q7HM0I",
  "muslim_bride": "https://whatsapp.com/channel/0029VbEMkZZDDmFUKnTbB31b",
  "muslim_groom": "https://whatsapp.com/channel/0029VbEPpCj0lwgqyXF6vV1a",
};

/** Return a verified channel link, otherwise truthful official support chat. */
export function waLink(channelKey?: string): string {
  const key = (channelKey || "").toLowerCase().trim();
  const aliases: Record<string, string> = {
    c_yadav_bride: "c_yadava_goud_bride",
    c_yadav_groom: "c_yadava_goud_groom",
  };
  const link = WA_CHANNEL_LINKS[aliases[key] || key];
  if (link) return link;
  const message = encodeURIComponent(`Hi! Please share the ${channelKey || "Mana Vivaha"} WhatsApp channel link.`);
  return `https://wa.me/${SITE_CONFIG.supportWhatsapp}?text=${message}`;
}
