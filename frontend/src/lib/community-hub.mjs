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
 * "Koppula Velama" / "koppula-velama" -> "koppula_velama".
 * @param {unknown} value
 * @returns {string}
 */
export function normalizeCommunity(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
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
  const hit = wanted
    ? list.find((hub) => {
        const key = normalizeCommunity(hub?.key);
        const name = normalizeCommunity(hub?.name);
        if (key === wanted || name === wanted) return true;
        // "Padmashali" should still find the "Padmashali Weavers" hub, but only
        // on a whole-word prefix — never a loose substring that could point a
        // member at another community's group.
        return name.length > wanted.length && wanted.length >= 4 && name.startsWith(`${wanted}_`);
      })
    : undefined;

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
