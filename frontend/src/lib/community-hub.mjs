/**
 * Connect a member's own community to its community hub / group page.
 *
 * Pure and dependency-free: the caller supplies the hub list, so this works in
 * tests without the channel registry. It never invents a destination — when a
 * community has no hub of its own, the caller gets the directory fallback and a
 * `matched: false` flag to write honest copy with.
 */

/** @typedef {{ key: string, name?: string }} Hub */

/**
 * Community names that mean the same thing as a hub that carries a different
 * spelling (registration form vs channel title). Exact normalised matches only
 * — never substrings, so one community can't be pointed at another's group.
 */
export const HUB_ALIASES = Object.freeze({
  arya_vysya: "vysya",
  komati: "vysya",
  vysya: "vysya",
  viswabrahmin: "viswabrahmana",
  viswakarma: "viswabrahmana",
  kuruba: "kuruma",
  kuruma: "kuruma",
  kummara: "kummari",
  kummari: "kummari",
  devanga: "padmashali_weavers",
  padmashali: "padmashali_weavers",
  koppula_velama: "velama",
  balija: "kapu",
  telaga: "kapu",
  yadava: "yadava_goud",
  golla: "yadava_goud",
  lambada: "lambada_banjara",
  banjara: "lambada_banjara",
  kshatriya: "raju_kshatriya",
  raju: "raju_kshatriya",
  settibalija: "kapu",
  // Communities the registry covers inside a combined "other" channel — they
  // reach that channel's page rather than losing their group link entirely.
  srisayana: "others_bc",
  jalari: "others_bc",
  jogi: "others_bc",
  vadabalija: "others_bc",
  bhatraju: "others_bc",
  kalinga: "others_bc",
  bondili: "others_bc",
  meru: "others_bc",
  are_katika: "others_bc",
  salivahana: "others_bc",
  segidi: "others_bc",
  togata: "padmashali_weavers",
  relli: "others_sc",
  arundhatiya: "others_sc",
  adi_dravida: "others_sc",
  samban: "others_sc",
  chenchu: "others_st",
  naikpod: "others_st",
  kondareddi: "others_st",
  savara: "others_st",
  bagata: "others_st",
  // Other-region communities grouped into regional channels.
  marwari: "north_indian",
  marwadi: "north_indian",
  gujarati: "north_indian",
  punjabi: "north_indian",
  marathi: "other_states",
  odia: "other_states",
  bengali: "other_states",
  vokkaliga: "neighbour_south",
  nair: "neighbour_south",
  nadar: "neighbour_south",
  sc_others: "others_sc",
  st_others: "others_st",
});

/**
 * "Koppula Velama" / "koppula-velama" -> "koppula_velama".
 * @param {unknown} value
 * @returns {string}
 */
export function normalizeCommunity(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[()]/g, " ")
    .replace(/[•,|/&]+/g, " ")
    .replace(/[\s-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

/**
 * Every normalised spelling a hub can be addressed by.
 *
 * `{ strong, loose }`: `strong` is the hub's own key and full display name —
 * those always win. `loose` holds the extra names inside a channel that openly
 * serves several communities, e.g. "Kapu • Balija • Telaga", which are only
 * used when no hub matches exactly.
 *
 * @param {Hub} hub
 * @returns {{ strong: string[], loose: string[] }}
 */
export function hubAliases(hub) {
  const strong = new Set();
  const loose = new Set();
  const key = normalizeCommunity(hub?.key);
  if (key) strong.add(key);
  const raw = String(hub?.name ?? "");
  const full = normalizeCommunity(raw);
  if (full) strong.add(full);
  // The "•" separator is the channel registry's own marker for a hub that
  // serves more than one community name; plain spaces are not treated as
  // separators so "Arya Vysya" can never be reached by "Vysya" alone.
  for (const part of raw.split("•")) {
    const value = normalizeCommunity(part);
    if (value.length >= 3 && !strong.has(value)) loose.add(value);
  }
  return { strong: [...strong], loose: [...loose] };
}

/**
 * Registration stores "Bride" / "Groom"; the hub slugs use lower case.
 * @param {unknown} gender
 * @returns {"bride" | "groom" | ""}
 */
export function roleForGender(gender) {
  const value = String(gender ?? "").trim().toLowerCase();
  if (!value) return "";
  if (value.startsWith("bride") || value === "female" || value === "woman" || value === "అమ్మాయి") return "bride";
  if (value.startsWith("groom") || value === "male" || value === "man" || value === "అబ్బాయి") return "groom";
  return "";
}

/**
 * Resolve the hub page for a member's community and gender.
 * @param {{ community?: string, gender?: string, hubs?: Hub[], fallback?: string }} input
 * @returns {{ href: string, hubKey: string, hubName: string, role: "bride" | "groom" | "", matched: boolean }}
 */
export function communityHubPath({ community, gender, hubs = [], fallback = "/castes" } = {}) {
  const wanted = normalizeCommunity(community);
  const role = roleForGender(gender);
  const list = Array.isArray(hubs) ? hubs : [];

  // An alias target only counts when that hub really exists — an alias must
  // never point at a page that was never created.
  const aliasTarget = HUB_ALIASES[wanted] ? normalizeCommunity(HUB_ALIASES[wanted]) : "";
  const candidates = wanted ? [wanted, ...(aliasTarget ? [aliasTarget] : [])] : [];

  /** @type {Hub | undefined} */
  let hit;
  for (const candidate of candidates) {
    // Pass 1 — the hub's own key or full name. An exact hub must always beat
    // a name borrowed from a combined channel.
    hit = list.find((hub) => hubAliases(hub).strong.includes(candidate));
    if (hit) break;
    // Pass 2 — a community named inside a combined channel ("Balija" inside
    // "Kapu • Balija • Telaga"), or a whole-word prefix of a longer hub name
    // ("Padmashali" → "Padmashali Weavers"). Never a loose substring.
    hit = list.find((hub) => {
      const { loose } = hubAliases(hub);
      return loose.includes(candidate) || loose.some(
        (alias) => alias.length > candidate.length && candidate.length >= 4 && alias.startsWith(`${candidate}_`),
      );
    });
    if (hit) break;
  }

  if (!hit || !role) {
    return { href: fallback, hubKey: "", hubName: "", role, matched: false };
  }
  const hubKey = String(hit.key || "");
  return {
    href: `/castes/${hubKey}-${role}`,
    hubKey,
    hubName: String(hit.name || hubKey),
    role,
    matched: true,
  };
}
