/**
 * Compare-studio insights: what actually differs, and which of the member's
 * own saved expectations each profile meets.
 *
 * Pure and dependency-free. Everything here is derived from member-entered
 * profile data and the member's own saved expectations — nothing is inferred,
 * no compatibility score is produced, and no percentage is ever shown.
 */

/** @typedef {{ key: string, status: string, label?: string, note?: string }} Check */

const MISSING_WORDS = new Set(["", "—", "-", "none", "not provided", "na", "n/a"]);

/**
 * Normalize a displayed value so "Reddy " and "reddy" compare equal, and so
 * placeholder text counts as missing rather than as a difference.
 * @param {unknown} value
 * @returns {string}
 */
export function normalizeCompareValue(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * True when a value carries no information for comparison purposes.
 * @param {unknown} value
 * @returns {boolean}
 */
export function isMissingValue(value) {
  return MISSING_WORDS.has(normalizeCompareValue(value));
}

/**
 * Build a row-by-row comparison matrix.
 * A row only "differs" when at least two profiles state a value and those
 * values are different — a blank is never evidence of a difference.
 * @param {{ key: string, label: string }[]} rows
 * @param {Array<Record<string, any>>} profiles
 * @param {(profile: Record<string, any>, key: string) => string} valueOf
 */
export function buildCompareMatrix(rows, profiles, valueOf) {
  const list = Array.isArray(rows) ? rows : [];
  const cards = Array.isArray(profiles) ? profiles : [];
  return list.map((row) => {
    const values = cards.map((profile) => {
      const text = String(valueOf(profile, row.key) ?? "").replace(/\s+/g, " ").trim();
      return { tsap_id: String(profile?.tsap_id ?? ""), text, present: !isMissingValue(text) };
    });
    const stated = values.filter((entry) => entry.present).map((entry) => normalizeCompareValue(entry.text));
    const differs = stated.length >= 2 && new Set(stated).size > 1;
    return {
      key: row.key,
      label: row.label,
      values,
      differs,
      allMissing: values.length > 0 && values.every((entry) => !entry.present),
      anyMissing: values.some((entry) => !entry.present),
    };
  });
}

/**
 * Rows where the profiles actually disagree. Nothing here is a judgement —
 * a difference is simply two stated values that are not the same.
 * @param {ReturnType<typeof buildCompareMatrix>} matrix
 */
export function differenceRows(matrix) {
  return (Array.isArray(matrix) ? matrix : []).filter((row) => row.differs);
}

/**
 * Count how many of the member's saved expectations a profile meets.
 * Unknown is not the same as not met: checks only exist for expectations the
 * member actually saved, so an empty list means "nothing to compare".
 * @param {Check[]} checks
 * @returns {{ met: number, notMet: number, total: number }}
 */
export function tallyPreferences(checks) {
  const rows = Array.isArray(checks) ? checks : [];
  let met = 0;
  let notMet = 0;
  for (const row of rows) {
    if (row?.status === "met") met += 1;
    else if (row?.status === "not_met") notMet += 1;
  }
  return { met, notMet, total: met + notMet };
}

/**
 * Order profiles by how many saved expectations they meet, ties broken by the
 * order the member entered them. Profiles with nothing to compare go last and
 * keep their entered order.
 * @param {Array<Record<string, any>>} profiles
 * @param {Record<string, { preference_checks?: Check[] }>} comparisons
 */
export function rankByPreferences(profiles, comparisons) {
  const cards = Array.isArray(profiles) ? profiles : [];
  const map = comparisons && typeof comparisons === "object" ? comparisons : {};
  return cards
    .map((profile, index) => {
      const id = String(profile?.tsap_id ?? "");
      const tally = tallyPreferences((map[id] || {}).preference_checks);
      return { tsap_id: id, index, ...tally };
    })
    .sort((a, b) => {
      if ((a.total > 0) !== (b.total > 0)) return a.total > 0 ? -1 : 1;
      if (b.met !== a.met) return b.met - a.met;
      if (a.notMet !== b.notMet) return a.notMet - b.notMet;
      return a.index - b.index;
    });
}

/**
 * Plain-language label for a tally. Deliberately a count of saved expectations,
 * never a percentage, grade or outcome claim.
 * @param {{ met: number, total: number }} tally
 * @param {boolean} te
 */
export function tallyLabel(tally, te) {
  const met = Math.max(0, Number(tally?.met) || 0);
  const total = Math.max(0, Number(tally?.total) || 0);
  if (total === 0) return te ? "పోల్చడానికి saved expectations లేవు" : "No saved expectations to compare";
  return te
    ? `మీరు సేవ్ చేసిన ${total} లో ${met} అంశాలు సరిపోతున్నాయి`
    : `Meets ${met} of ${total} things you saved`;
}

/**
 * The notes behind a tally, met first, so the member can see why.
 * @param {Check[]} checks
 */
export function preferenceNotes(checks) {
  const rows = Array.isArray(checks) ? checks : [];
  return rows
    .filter((row) => row?.status === "met" || row?.status === "not_met")
    .map((row) => ({ key: String(row.key || ""), label: String(row.label || ""), note: String(row.note || ""), met: row.status === "met" }))
    .sort((a, b) => (a.met === b.met ? a.key.localeCompare(b.key) : a.met ? -1 : 1));
}
