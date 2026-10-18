/**
 * MANA VIVAHA — PROGRAMMATIC SEO PAGES 🔎
 * =======================================
 * Top matrimony sites 1 lakh+ pages tho Google nunchi free traffic teesukuntayi
 * (Shaadi: "reddy bride hyderabad" → landing page). Manam kooda ade chestham —
 * 18 caste CLUSTERS × 2 roles × districts = **500+ landing pages**, anni auto-generate.
 *
 * URL pattern:  /castes/reddy-bride-hyderabad
 *               /castes/kamma-groom
 *               /castes/mala-bride-warangal
 */
import { ALL_CHANNELS } from "./channels";

// emoji/glyphs teesi plain name (TS target tho compatible regex — \p{L} es6+ kavali)
const stripEmoji = (s: string) =>
  s.replace(/[^A-Za-z0-9\s&|/.,'()-]/g, "").replace(/\s+/g, " ").trim();

export type ChannelRef = {
  key: string;
  username: string;
  link: string;
  deepLink: string;
  desc: string;
  routingEligible: boolean;
  name: string;
  hashtags: string[];
  wave?: number;
};

export type CasteInfo = {
  key: string;         // "reddy" (caste key — channel key kaadu)
  name: string;        // "Reddy"
  full: string;        // "Reddy Matrimony"
  split: boolean;      // True = bride + groom channels separate (caste prakaram)
  bride?: ChannelRef;
  groom?: ChannelRef;
  username: string;    // default (bride channel) — purathana code ki
  link: string;
  deepLink: string;
  desc: string;
  routingEligible: boolean;
  hashtags: string[];
};

const CH_BY_KEY: Map<string, any> = new Map(ALL_CHANNELS.map((c: any) => [c.key, c]));

function channelRef(c: any): ChannelRef {
  return { key: c.key, username: c.username, link: c.link, deepLink: c.deepLink, desc: c.desc,
           routingEligible: !!c.routingEligible, name: c.name, hashtags: c.hashtags || [], wave: c.wave };
}

/** Caste + role ki correct channel — split unte caste×gender, lekapote mixed channel. */
export function channelForCaste(casteKey: string, role: Role): ChannelRef | null {
  const split = CH_BY_KEY.get(`c_${casteKey}_${role}`);        // pedda cluster → bride/groom separate
  const single = CH_BY_KEY.get(`c_${casteKey}`);               // cluster single channel (both genders)
  const legacy = CH_BY_KEY.get(casteKey);                      // purathana key (safety)
  const ch = split || single || legacy;
  return ch ? channelRef(ch) : null;
}

/** True ayithe bride/groom channels **veru veru** unnai (single cluster lo okate channel) */
export function channelSplit(casteKey: string): boolean {
  const b = CH_BY_KEY.get(`c_${casteKey}_bride`);
  const g = CH_BY_KEY.get(`c_${casteKey}_groom`);
  return !!(b && g && b.username !== g.username);
}

/** L3 channels nunchi unique caste keys (caste×gender + mixed rendu nunchi) */
function casteKeysInOrder(): string[] {
  const order: string[] = [];
  const seen = new Set<string>();
  for (const c of ALL_CHANNELS as any[]) {
    if (c.tier !== "L3_CASTE") continue;
    let k: string = c.key;
    if (k.startsWith("c_")) k = k.slice(2).replace(/_(bride|groom)$/, "");
    if (!seen.has(k)) { seen.add(k); order.push(k); }
  }
  return order;
}

/** Channel title nunchi caste peru — "Reddy Brides" / "Koppula Velama Matrimony" → "Reddy" / "Koppula Velama" */
function casteDisplayName(key: string, channelName: string): string {
  const clean = stripEmoji(channelName).split("|")[0].trim();
  const stripped = clean
    .replace(/\s*(Brides|Grooms|Matrimony)$/i, "")
    .trim();
  if (stripped) return stripped;
  return key.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

export const CASTES: CasteInfo[] = casteKeysInOrder().map((key) => {
  const bride = channelForCaste(key, "bride");
  const groom = channelForCaste(key, "groom");
  const base = bride || groom;
  if (!base) return null;                     // channel ledu → ee caste page generate cheyyaku
  const name = casteDisplayName(key, base.name);
  return {
    key,
    name,
    full: `${name} Matrimony`,
    split: channelSplit(key),
    bride: bride || undefined,
    groom: groom || undefined,
    username: base.username,
    link: base.link,
    deepLink: base.deepLink,
    desc: base.desc,
    routingEligible: base.routingEligible,
    hashtags: base.hashtags,
  };
}).filter(Boolean) as CasteInfo[];

export type DistrictInfo = { slug: string; name: string; state: "TS" | "AP" };

export const DISTRICTS: DistrictInfo[] = [
  { slug: "hyderabad", name: "Hyderabad", state: "TS" },
  { slug: "rangareddy", name: "Rangareddy", state: "TS" },
  { slug: "medchal", name: "Medchal-Malkajgiri", state: "TS" },
  { slug: "nalgonda", name: "Nalgonda", state: "TS" },
  { slug: "warangal", name: "Warangal", state: "TS" },
  { slug: "karimnagar", name: "Karimnagar", state: "TS" },
  { slug: "khammam", name: "Khammam", state: "TS" },
  { slug: "nizamabad", name: "Nizamabad", state: "TS" },
  { slug: "mahbubnagar", name: "Mahabubnagar", state: "TS" },
  { slug: "medak", name: "Medak", state: "TS" },
  { slug: "adilabad", name: "Adilabad", state: "TS" },
  { slug: "suryapet", name: "Suryapet", state: "TS" },
  { slug: "siddipet", name: "Siddipet", state: "TS" },
  { slug: "sangareddy", name: "Sangareddy", state: "TS" },
  { slug: "vijayawada", name: "Vijayawada", state: "AP" },
  { slug: "guntur", name: "Guntur", state: "AP" },
  { slug: "visakhapatnam", name: "Visakhapatnam", state: "AP" },
  { slug: "tirupati", name: "Tirupati", state: "AP" },
  { slug: "nellore", name: "Nellore", state: "AP" },
  { slug: "kurnool", name: "Kurnool", state: "AP" },
  { slug: "rajahmundry", name: "Rajahmundry", state: "AP" },
  { slug: "kakinada", name: "Kakinada", state: "AP" },
  { slug: "anantapur", name: "Anantapur", state: "AP" },
  { slug: "chittoor", name: "Chittoor", state: "AP" },
];

export type Role = "bride" | "groom";

export function buildSlug(casteKey: string, role: Role, districtSlug?: string) {
  return districtSlug ? `${casteKey}-${role}-${districtSlug}` : `${casteKey}-${role}`;
}

export function parseSlug(slug: string): { caste: CasteInfo; role: Role; district?: DistrictInfo } | null {
  const parts = (slug || "").toLowerCase().split("-").filter(Boolean);
  const roleIdx = parts.findIndex((p) => p === "bride" || p === "groom");
  if (roleIdx <= 0) return null;
  const casteKey = parts.slice(0, roleIdx).join("_");
  const role = parts[roleIdx] as Role;
  const districtSlug = parts.slice(roleIdx + 1).join("-");
  const caste = CASTES.find((c) => c.key === casteKey || c.key.replace(/_/g, "-") === parts.slice(0, roleIdx).join("-"));
  if (!caste) return null;
  const district = districtSlug ? DISTRICTS.find((d) => d.slug === districtSlug) : undefined;
  if (districtSlug && !district) return null;
  return { caste, role, district };
}

/** Sitemap / generateStaticParams ki — community × role, no district. */
export function allSeoSlugs(): string[] {
  const out: string[] = [];
  for (const c of CASTES) {
    out.push(buildSlug(c.key, "bride"));
    out.push(buildSlug(c.key, "groom"));
  }
  return out;
}

/**
 * Community × role × district slugs for the first `limit` communities.
 *
 * These pages already exist and answer real searches ("Reddy brides in
 * Warangal"), but nothing linked into them, so crawlers never found them.
 * Only the communities the registry lists first are expanded: a district page
 * is only worth a sitemap entry where the community itself has enough demand
 * to make the page more than a doorway.
 */
export function districtSeoSlugs(limit = 0): string[] {
  if (!Number.isFinite(limit) || limit <= 0) return [];
  const out: string[] = [];
  for (const c of CASTES.slice(0, Math.floor(limit))) {
    for (const d of DISTRICTS) {
      out.push(buildSlug(c.key, "bride", d.slug));
      out.push(buildSlug(c.key, "groom", d.slug));
    }
  }
  return out;
}

export const SEO_PAGE_COUNT = allSeoSlugs().length;
export const SEO_DISTRICT_PAGE_COUNT = districtSeoSlugs(8).length;
