/**
 * Shared, dependency-free URL parser for the matches search state.
 * Keep the allowlist in sync with the visible filter model; unknown query keys
 * are ignored rather than forwarded to the search API.
 * @typedef {Record<string, string | number | boolean>} MatchFilters
 */
export const DEFAULT_MATCH_FILTERS = {
  gender: "",
  q: "",
  caste: "",
  sub_caste: "",
  district: "",
  state: "",
  job: "",
  education: "",
  salary_min: 0,
  salary_max: 0,
  marital_status: "",
  children: "",
  religion: "",
  age_min: 18,
  age_max: 60,
  star: "",
  rasi: "",
  dosham: "",
  verified_only: false,
  photo_only: false,
  nri_only: false,
  height_min: "",
  height_max: "",
};

const NUMERIC_FIELDS = new Set(["age_min", "age_max", "salary_min", "salary_max"]);
const BOOLEAN_FIELDS = new Set(["verified_only", "photo_only", "nri_only"]);
const MULTI_VALUE_FIELDS = new Set([
  "caste",
  "sub_caste",
  "district",
  "job",
  "education",
  "marital_status",
  "children",
  "religion",
  "star",
  "rasi",
  "dosham",
]);
const FILTER_KEYS = new Set(Object.keys(DEFAULT_MATCH_FILTERS));

/**
 * Parse a URL query string into safe, typed matches filters.
 * Repeated multi-select parameters are normalized to the comma-separated form
 * consumed by the existing filter controls and API. Numeric values are bounded
 * to the supported age range or non-negative salary values.
 * @param {string | URLSearchParams} search
 * @returns {MatchFilters}
 */
export function parseMatchFilters(search) {
  const params = search instanceof URLSearchParams
    ? search
    : new URLSearchParams(String(search || ""));
  const filters = { ...DEFAULT_MATCH_FILTERS };

  for (const key of FILTER_KEYS) {
    const values = params.getAll(key);
    if (values.length === 0) continue;

    if (NUMERIC_FIELDS.has(key)) {
      const value = Number(values[values.length - 1]);
      if (!Number.isInteger(value) || value < 0) continue;
      if ((key === "age_min" || key === "age_max") && (value < 18 || value > 60)) continue;
      filters[key] = value;
      continue;
    }

    if (BOOLEAN_FIELDS.has(key)) {
      const value = values[values.length - 1].trim().toLowerCase();
      if (value === "true" || value === "false") filters[key] = value === "true";
      continue;
    }

    if (MULTI_VALUE_FIELDS.has(key)) {
      const seen = new Set();
      const selected = values
        .flatMap((value) => value.split(","))
        .map((value) => value.trim())
        .filter((value) => {
          const normalized = value.toLowerCase();
          if (!normalized || seen.has(normalized)) return false;
          seen.add(normalized);
          return true;
        });
      filters[key] = selected.join(",");
      continue;
    }

    filters[key] = values[0].trim();
  }

  if (filters.age_min > filters.age_max) {
    filters.age_min = DEFAULT_MATCH_FILTERS.age_min;
    filters.age_max = DEFAULT_MATCH_FILTERS.age_max;
  }

  return filters;
}
