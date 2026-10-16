/**
 * Explainable match reasons — pure, dependency-free, testable.
 * ===========================================================
 * Companion to `match-filter-query.mjs`. It answers one question only:
 * "why did this profile appear in MY results?" — using nothing but the profile
 * row the API returned and the filters this member actually applied.
 *
 * Hard rules (blueprint §5 — explainable matchmaking):
 *   • Facts only. A reason is restating a filter the member set and the value
 *     the profile carries. Nothing is inferred, predicted or scored.
 *   • No compatibility percentage, no "good match", no marriage-outcome claim.
 *   • No inference of religion, caste, income, health, intent or family
 *     approval, and no ranking weight is changed by any of this.
 *   • Missing data produces no reason — never a guessed value, never a
 *     "probably" label.
 *   • Deterministic: same row + same filters ⇒ same reasons in the same order.
 *
 * @typedef {Record<string, string | number | boolean>} MatchFilters
 * @typedef {{ id: string, icon: string, en: string, te: string }} MatchReason
 */

/** Filters at these values are the default, i.e. the member did not narrow them. */
export const DEFAULT_AGE_MIN = 18;
export const DEFAULT_AGE_MAX = 60;

/** Reasons shown per card. Keep small: this explains, it does not advertise. */
export const REASON_LIMIT = 3;

export const REASON_DISCLAIMER = {
  en: "These notes restate the filters you set and the details the member submitted. They are not a compatibility score and do not verify anyone.",
  te: "ఇవి మీరు పెట్టిన ఫిల్టర్లు, సభ్యులు సమర్పించిన వివరాలను మాత్రమే చూపిస్తాయి. ఇవి సరిపోలిక స్కోరు కాదు; ఎవరినీ నిర్ధారించవు.",
};

const norm = (value) => String(value ?? "").trim().toLowerCase();

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Multi-select filters are stored comma-separated; a profile matches when any
 * selected value equals its own recorded value.
 */
function multiMatches(filterValue, rowValue) {
  const selected = String(filterValue ?? "")
    .split(",")
    .map(norm)
    .filter(Boolean);
  if (selected.length === 0) return false;
  const own = norm(rowValue);
  return own.length > 0 && selected.includes(own);
}

/** True when the member actually narrowed this numeric filter. */
function rangeWasNarrowed(min, max, fallbackMin, fallbackMax) {
  return min !== fallbackMin || max !== fallbackMax;
}

/**
 * Explain why one profile is in the current result set.
 * @param {Record<string, any>} row  one search result (safe_user shape)
 * @param {MatchFilters} filters     the filters currently applied
 * @param {{ limit?: number }} [options]
 * @returns {MatchReason[]} 0…limit reasons, most specific first
 */
export function matchReasons(row, filters, options = {}) {
  const limit = Math.max(0, options.limit ?? REASON_LIMIT);
  if (!row || typeof row !== "object" || !filters || typeof filters !== "object" || limit === 0) {
    return [];
  }

  const found = [];

  // Keyword — the most specific thing a member can ask for.
  if (String(filters.q || "").trim()) {
    const needle = norm(filters.q);
    const haystack = norm(
      [row.full_name, row.tsap_id, row.job, row.education, row.district, row.caste].join(" "),
    );
    if (needle.length > 0 && haystack.includes(needle)) {
      found.push({
        id: "keyword",
        icon: "🔎",
        en: `Matches your search “${String(filters.q).trim()}”`,
        te: `మీ వెతుకులాట “${String(filters.q).trim()}” కి సరిపోలింది`,
      });
    }
  }

  // Location — district before state, so the narrower fact wins.
  if (multiMatches(filters.district, row.district)) {
    found.push({
      id: "district",
      icon: "📍",
      en: `District matches your filter (${row.district})`,
      te: `మీ జిల్లా ఫిల్టర్‌కి సరిపోలింది (${row.district})`,
    });
  } else if (multiMatches(filters.state, row.state)) {
    found.push({
      id: "state",
      icon: "🏛️",
      en: `State matches your filter (${row.state})`,
      te: `మీ రాష్ట్ర ఫిల్టర్‌కి సరిపోలింది (${row.state})`,
    });
  }

  // Community — only what the member selected and the profile recorded.
  if (multiMatches(filters.sub_caste, row.sub_caste)) {
    found.push({
      id: "sub_caste",
      icon: "🧬",
      en: `Sub-community matches your filter (${row.sub_caste})`,
      te: `మీ ఉప-కమ్యూనిటీ ఫిల్టర్‌కి సరిపోలింది (${row.sub_caste})`,
    });
  } else if (multiMatches(filters.caste, row.caste)) {
    found.push({
      id: "caste",
      icon: "💍",
      en: `Community matches your filter (${row.caste})`,
      te: `మీ కమ్యూనిటీ ఫిల్టర్‌కి సరిపోలింది (${row.caste})`,
    });
  }

  if (multiMatches(filters.religion, row.religion)) {
    found.push({
      id: "religion",
      icon: "🕉️",
      en: `Religion matches your filter (${row.religion})`,
      te: `మీ మత ఫిల్టర్‌కి సరిపోలింది (${row.religion})`,
    });
  }

  // Age — only meaningful when the member narrowed the default 18–60 range.
  const ageMin = toNumber(filters.age_min) ?? DEFAULT_AGE_MIN;
  const ageMax = toNumber(filters.age_max) ?? DEFAULT_AGE_MAX;
  const age = toNumber(row.age);
  if (age !== null && rangeWasNarrowed(ageMin, ageMax, DEFAULT_AGE_MIN, DEFAULT_AGE_MAX)) {
    if (age >= ageMin && age <= ageMax) {
      found.push({
        id: "age",
        icon: "🎂",
        en: `Age ${age} is inside your ${ageMin}–${ageMax} range`,
        te: `వయస్సు ${age} — మీ ${ageMin}–${ageMax} పరిధిలో ఉంది`,
      });
    }
  }

  if (multiMatches(filters.education, row.education)) {
    found.push({
      id: "education",
      icon: "🎓",
      en: `Education matches your filter (${row.education})`,
      te: `మీ విద్య ఫిల్టర్‌కి సరిపోలింది (${row.education})`,
    });
  }

  if (multiMatches(filters.job, row.job)) {
    found.push({
      id: "job",
      icon: "💼",
      en: `Work matches your filter (${row.job})`,
      te: `మీ ఉద్యోగ ఫిల్టర్‌కి సరిపోలింది (${row.job})`,
    });
  }

  const salaryMin = toNumber(filters.salary_min) ?? 0;
  const salary = toNumber(row.salary);
  if (salaryMin > 0 && salary !== null && salary >= salaryMin) {
    found.push({
      id: "salary",
      icon: "💰",
      en: `Reported income is at or above ₹${salaryMin}`,
      te: `తెలిపిన ఆదాయం ₹${salaryMin} లేదా అంతకంటే ఎక్కువ`,
    });
  }

  if (multiMatches(filters.marital_status, row.marital_status)) {
    found.push({
      id: "marital_status",
      icon: "💍",
      en: `Marital status matches your filter (${row.marital_status})`,
      te: `మీ వైవాహిక స్థితి ఫిల్టర్‌కి సరిపోలింది (${row.marital_status})`,
    });
  }

  // Recorded checks — stated as recorded, never as proof.
  if (filters.verified_only && (row.is_verified || row.id_verified || row.verification)) {
    found.push({
      id: "verified",
      icon: "🪪",
      en: "A review check is recorded (not an identity guarantee)",
      te: "సమీక్ష నమోదైంది (ఇది గుర్తింపు హామీ కాదు)",
    });
  }

  if (filters.photo_only && (row.photo_url || (Array.isArray(row.photo_urls) && row.photo_urls.length > 0))) {
    found.push({
      id: "photo",
      icon: "📷",
      en: "Photo shared by the member",
      te: "సభ్యుడు పంచుకున్న ఫోటో ఉంది",
    });
  }

  return found.slice(0, limit);
}

/**
 * One-tap actions that widen a search that returned nothing.
 *
 * Only filters the member actually narrowed are suggested, ordered by how much
 * they typically restrict results. Each `patch` merges into the filter state.
 *
 * @param {MatchFilters} filters
 * @param {{ limit?: number }} [options]
 * @returns {{ id: string, icon: string, en: string, te: string, patch: Record<string, string | number | boolean> }[]}
 */
export function relaxSuggestions(filters, options = {}) {
  const limit = Math.max(0, options.limit ?? 3);
  if (!filters || typeof filters !== "object" || limit === 0) return [];

  const candidates = [
    {
      id: "verified_only",
      icon: "🪪",
      active: () => filters.verified_only === true,
      en: "Include profiles without a recorded review",
      te: "సమీక్ష నమోదు లేని ప్రొఫైళ్లను కూడా చూపించు",
      patch: { verified_only: false },
    },
    {
      id: "photo_only",
      icon: "📷",
      active: () => filters.photo_only === true,
      en: "Include profiles without a photo",
      te: "ఫోటో లేని ప్రొఫైళ్లను కూడా చూపించు",
      patch: { photo_only: false },
    },
    {
      id: "q",
      icon: "🔎",
      active: () => String(filters.q || "").trim().length > 0,
      en: "Clear the keyword",
      te: "వెతుకులాట పదాన్ని తీసివేయి",
      patch: { q: "" },
    },
    {
      id: "sub_caste",
      icon: "🧬",
      active: () => String(filters.sub_caste || "").trim().length > 0,
      en: "Include every sub-community",
      te: "అన్ని ఉప-కమ్యూనిటీలను చూపించు",
      patch: { sub_caste: "" },
    },
    {
      id: "district",
      icon: "📍",
      active: () => String(filters.district || "").trim().length > 0,
      en: "Search the whole state instead",
      te: "రాష్ట్రమంతా వెతకు",
      patch: { district: "" },
    },
    {
      id: "education",
      icon: "🎓",
      active: () => String(filters.education || "").trim().length > 0,
      en: "Any education",
      te: "ఏ విద్య అయినా సరే",
      patch: { education: "" },
    },
    {
      id: "job",
      icon: "💼",
      active: () => String(filters.job || "").trim().length > 0,
      en: "Any work",
      te: "ఏ ఉద్యోగమైనా సరే",
      patch: { job: "" },
    },
    {
      id: "salary_min",
      icon: "💰",
      active: () => (toNumber(filters.salary_min) ?? 0) > 0,
      en: "Remove the minimum income",
      te: "కనీస ఆదాయ ఫిల్టర్‌ను తీసివేయి",
      patch: { salary_min: 0 },
    },
    {
      id: "marital_status",
      icon: "💍",
      active: () => String(filters.marital_status || "").trim().length > 0,
      en: "Any marital status",
      te: "ఏ వైవాహిక స్థితి అయినా సరే",
      patch: { marital_status: "" },
    },
    {
      id: "caste",
      icon: "💍",
      active: () => String(filters.caste || "").trim().length > 0,
      en: "Include every community",
      te: "అన్ని కమ్యూనిటీలను చూపించు",
      patch: { caste: "" },
    },
    {
      id: "state",
      icon: "🏛️",
      active: () => String(filters.state || "").trim().length > 0,
      en: "Search Telangana and Andhra Pradesh",
      te: "తెలంగాణ, ఆంధ్రప్రదేశ్ రెండింటిలో వెతకు",
      patch: { state: "" },
    },
    {
      id: "age",
      icon: "🎂",
      active: () =>
        rangeWasNarrowed(
          toNumber(filters.age_min) ?? DEFAULT_AGE_MIN,
          toNumber(filters.age_max) ?? DEFAULT_AGE_MAX,
          DEFAULT_AGE_MIN,
          DEFAULT_AGE_MAX,
        ),
      en: "Widen the age range",
      te: "వయస్సు పరిధిని పెంచు",
      // Widening is computed here so the label can state the new range.
      patch: widenAge(filters),
    },
  ];

  return candidates
    .filter((candidate) => {
      try {
        return candidate.active() === true;
      } catch {
        return false;
      }
    })
    .slice(0, limit)
    .map(({ id, icon, en, te, patch }) => ({ id, icon, en, te, patch }));
}

/** Widen the age range by 5 years on each side, clamped to the supported range. */
function widenAge(filters) {
  const min = Math.max(18, (toNumber(filters.age_min) ?? DEFAULT_AGE_MIN) - 5);
  const max = Math.min(60, (toNumber(filters.age_max) ?? DEFAULT_AGE_MAX) + 5);
  return { age_min: min, age_max: max };
}

/** Label for a widened age range, used by the UI next to its relax action. */
export function widenedAgeLabel(filters) {
  const patch = widenAge(filters);
  return `${patch.age_min}–${patch.age_max}`;
}
