/**
 * Merge offset-based search pages without rendering duplicate member cards if
 * new profiles shift the API's sort order between requests.
 * @param {Array<Record<string, unknown>>} current
 * @param {Array<Record<string, unknown>>} incoming
 * @returns {Array<Record<string, unknown>>}
 */
export function mergeMatchPages(current, incoming) {
  const seen = new Set(current.map((row) => String(row.tsap_id || row.id || "").trim()).filter(Boolean));
  const merged = [...current];
  for (const row of incoming) {
    const id = String(row.tsap_id || row.id || "").trim();
    if (id && seen.has(id)) continue;
    if (id) seen.add(id);
    merged.push(row);
  }
  return merged;
}
