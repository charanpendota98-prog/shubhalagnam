/**
 * Human-readable summaries for saved searches.
 *
 * Pure, dependency-free and shared by /matches and the saved-search workspace so
 * the same criteria always read the same way. Deliberately factual: it repeats
 * what the member typed and never scores, ranks or predicts anything.
 */

/** @typedef {Record<string, any>} Filters */

const MULTI_VALUE_FIELDS = new Set([
  "caste",
  "sub_caste",
  "district",
  "state",
  "job",
  "education",
  "marital_status",
  "children",
  "religion",
  "star",
  "rasi",
  "dosham",
]);

export const SUMMARY_AGE_MIN = 18;
export const SUMMARY_AGE_MAX = 60;
export const SUMMARY_PART_LIMIT = 4;
export const SUMMARY_VALUE_LIMIT = 2;

/**
 * Split a comma-separated multi-select value into trimmed entries.
 * @param {unknown} value
 * @returns {string[]}
 */
export function splitValues(value) {
  return String(value ?? "")
    .split(",")
    .map((entry) => String(entry || "").trim())
    .filter(Boolean);
}

/**
 * Render a multi-select value as a short, stable label.
 * Values are echoed verbatim; only the list is truncated.
 * @param {unknown} value
 * @param {number} [limit]
 * @returns {string}
 */
export function joinValues(value, limit = SUMMARY_VALUE_LIMIT) {
  const values = splitValues(value);
  if (!values.length) return "";
  const kept = values.slice(0, limit);
  const overflow = values.length - kept.length;
  return overflow > 0 ? `${kept.join(", ")} +${overflow}` : kept.join(", ");
}

/**
 * Normalize an age bound to a number inside the supported range.
 * @param {unknown} value
 * @param {number} fallback
 * @returns {number}
 */
export function normalizeAge(value, fallback) {
  if (value === null || value === undefined || String(value).trim() === "") return fallback;
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(SUMMARY_AGE_MAX, Math.max(SUMMARY_AGE_MIN, Math.round(n)));
}

/**
 * Build the ordered list of "label: value" parts describing one saved search.
 * Order follows the filter drawer so summaries never shuffle.
 * @param {Filters} filters
 * @param {boolean} te Telugu output when true.
 * @returns {string[]}
 */
export function savedSearchParts(filters, te) {
  const f = filters && typeof filters === "object" ? filters : {};
  const parts = [];
  if (f.gender) parts.push(`${te ? "లింగం" : "Gender"}: ${f.gender}`);
  const ageMin = normalizeAge(f.age_min, SUMMARY_AGE_MIN);
  const ageMax = normalizeAge(f.age_max, SUMMARY_AGE_MAX);
  if (ageMin > SUMMARY_AGE_MIN || ageMax < SUMMARY_AGE_MAX) {
    parts.push(`${te ? "వయస్సు" : "Age"}: ${ageMin}–${ageMax}`);
  }
  if (f.religion) parts.push(`${te ? "మతం" : "Religion"}: ${joinValues(f.religion)}`);
  if (f.caste) parts.push(`${te ? "కులం" : "Community"}: ${joinValues(f.caste)}`);
  if (f.sub_caste) parts.push(`${te ? "ఉపకులం" : "Sub-caste"}: ${joinValues(f.sub_caste)}`);
  if (f.district) parts.push(`${te ? "జిల్లా" : "District"}: ${joinValues(f.district)}`);
  if (f.state) parts.push(`${te ? "రాష్ట్రం" : "State"}: ${joinValues(f.state)}`);
  if (f.education) parts.push(`${te ? "విద్య" : "Education"}: ${joinValues(f.education)}`);
  if (f.job) parts.push(`${te ? "వృత్తి" : "Work"}: ${joinValues(f.job)}`);
  if (f.marital_status) {
    parts.push(`${te ? "వైవాహిక స్థితి" : "Marital status"}: ${joinValues(f.marital_status)}`);
  }
  if (f.rasi) parts.push(`${te ? "రాశి" : "Rasi"}: ${f.rasi}`);
  if (f.star) parts.push(`${te ? "నక్షత్రం" : "Nakshatra"}: ${joinValues(f.star)}`);
  if (f.dosham) parts.push(`${te ? "దోషం" : "Dosham"}: ${joinValues(f.dosham)}`);
  if (Number(f.salary_min) > 0) {
    parts.push(`${te ? "కనీస ఆదాయం" : "Min income"}: ₹${Number(f.salary_min)}`);
  }
  if (f.nri_only === true || f.nri_only === "true") parts.push(te ? "NRI మాత్రమే" : "NRI only");
  if (f.verified_only === true || f.verified_only === "true") {
    parts.push(te ? "ధృవీకరించినవే" : "Verified only");
  }
  if (f.photo_only === true || f.photo_only === "true") {
    parts.push(te ? "ఫోటో ఉన్నవే" : "With photo");
  }
  if (f.q) parts.push(`${te ? "కీవర్డ్" : "Keyword"}: ${String(f.q).trim()}`);
  return parts;
}

/**
 * One-line summary of a saved search, capped at four parts so cards stay short.
 * @param {Filters} filters
 * @param {boolean} te
 * @param {number} [limit]
 * @returns {string}
 */
export function summarizeSavedSearch(filters, te, limit = SUMMARY_PART_LIMIT) {
  const parts = savedSearchParts(filters, te);
  if (!parts.length) return te ? "శోధన ఫిల్టర్లు" : "Search filters";
  const kept = parts.slice(0, limit);
  const overflow = parts.length - kept.length;
  const text = kept.join(" · ");
  if (overflow <= 0) return text;
  return te ? `${text} · ఇంకా ${overflow}` : `${text} · +${overflow} more`;
}

/**
 * True when the criteria add nothing to the default browse, i.e. the saved
 * search will match essentially everything.
 * @param {Filters} filters
 * @returns {boolean}
 */
export function isBroadSavedSearch(filters) {
  return savedSearchParts(filters, false).length === 0;
}
