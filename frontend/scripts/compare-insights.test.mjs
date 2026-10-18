/**
 * Static tests for the compare-studio insight helpers.
 * Run: npm run test:compare
 */
import {
  buildCompareMatrix,
  differenceRows,
  isMissingValue,
  normalizeCompareValue,
  preferenceNotes,
  rankByPreferences,
  tallyLabel,
  tallyPreferences,
} from "../src/lib/compare-insights.mjs";

let passed = 0;
let failed = 0;

function check(name, fn) {
  try {
    fn();
    passed += 1;
  } catch (error) {
    failed += 1;
    console.error(`  ✗ ${name}\n    ${error.message}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || "expected a truthy value");
}

function eq(actual, expected, message) {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) throw new Error(`${message || "mismatch"}: got ${a}, expected ${b}`);
}

const ROWS = [
  { key: "age", label: "Age" },
  { key: "caste", label: "Community" },
  { key: "job", label: "Profession" },
];

const profiles = [
  { tsap_id: "A", age: "30", caste: "Reddy", job: "Software" },
  { tsap_id: "B", age: "30", caste: "Kamma", job: "" },
];

const valueOf = (profile, key) => String(profile?.[key] ?? "");

check("normalizeCompareValue is case- and space-insensitive", () => {
  eq(normalizeCompareValue("  Reddy  Kapu "), "reddy kapu");
  eq(normalizeCompareValue(null), "");
});

check("placeholder text counts as missing", () => {
  eq(isMissingValue(""), true);
  eq(isMissingValue("—"), true);
  eq(isMissingValue("Not provided"), true);
  eq(isMissingValue("Reddy"), false);
});

check("a row differs only when two stated values disagree", () => {
  const matrix = buildCompareMatrix(ROWS, profiles, valueOf);
  eq(matrix.map((row) => [row.key, row.differs]), [["age", false], ["caste", true], ["job", false]]);
});

check("a blank value never creates a difference", () => {
  const matrix = buildCompareMatrix(ROWS, profiles, valueOf);
  const job = matrix.find((row) => row.key === "job");
  eq(job.differs, false);
  eq(job.anyMissing, true);
  eq(job.allMissing, false);
});

check("all-missing rows are flagged and never differ", () => {
  const matrix = buildCompareMatrix(ROWS, [{ tsap_id: "A" }, { tsap_id: "B" }], valueOf);
  assert(matrix.every((row) => !row.differs), "empty profiles must not differ");
  assert(matrix.every((row) => row.allMissing), "empty profiles are all missing");
});

check("casing and spacing alone are not a difference", () => {
  const matrix = buildCompareMatrix(
    [{ key: "caste", label: "Community" }],
    [{ tsap_id: "A", caste: "Reddy" }, { tsap_id: "B", caste: "  reddy " }],
    valueOf,
  );
  eq(matrix[0].differs, false);
});

check("differenceRows returns only the rows that differ", () => {
  const matrix = buildCompareMatrix(ROWS, profiles, valueOf);
  eq(differenceRows(matrix).map((row) => row.key), ["caste"]);
});

check("a single profile cannot differ from itself", () => {
  const matrix = buildCompareMatrix(ROWS, [{ tsap_id: "A", age: "30", caste: "Reddy", job: "IT" }], valueOf);
  eq(differenceRows(matrix), []);
});

check("tallyPreferences counts met and not_met only", () => {
  eq(tallyPreferences([
    { key: "age", status: "met" },
    { key: "caste", status: "not_met" },
    { key: "job", status: "unknown" },
  ]), { met: 1, notMet: 1, total: 2 });
  eq(tallyPreferences(null), { met: 0, notMet: 0, total: 0 });
  eq(tallyPreferences([]), { met: 0, notMet: 0, total: 0 });
});

check("rankByPreferences orders by met count, ties keep entered order", () => {
  const cards = [{ tsap_id: "A" }, { tsap_id: "B" }, { tsap_id: "C" }];
  const comparisons = {
    A: { preference_checks: [{ status: "met" }] },
    B: { preference_checks: [{ status: "met" }, { status: "met" }] },
    C: { preference_checks: [{ status: "not_met" }] },
  };
  eq(rankByPreferences(cards, comparisons).map((row) => row.tsap_id), ["B", "A", "C"]);
});

check("profiles with nothing to compare go last, in entered order", () => {
  const cards = [{ tsap_id: "A" }, { tsap_id: "B" }, { tsap_id: "C" }];
  const comparisons = { C: { preference_checks: [{ status: "met" }] } };
  eq(rankByPreferences(cards, comparisons).map((row) => row.tsap_id), ["C", "A", "B"]);
});

check("ranking is stable for identical tallies", () => {
  const cards = [{ tsap_id: "A" }, { tsap_id: "B" }, { tsap_id: "C" }];
  const comparisons = {
    A: { preference_checks: [{ status: "met" }, { status: "not_met" }] },
    B: { preference_checks: [{ status: "not_met" }, { status: "met" }] },
    C: { preference_checks: [] },
  };
  eq(rankByPreferences(cards, comparisons).map((row) => row.tsap_id), ["A", "B", "C"]);
});

check("tallyLabel is a count, never a percentage or verdict", () => {
  const en = tallyLabel({ met: 2, total: 5 }, false);
  eq(en, "Meets 2 of 5 things you saved");
  assert(!/\d+%/.test(en), `no percentage allowed: ${en}`);
  assert(!/score|compatibility|guaranteed|soulmate/i.test(en), `no verdict language: ${en}`);
  const te = tallyLabel({ met: 2, total: 5 }, true);
  assert(te.includes("2") && te.includes("5"), `Telugu label must carry both counts: ${te}`);
});

check("tallyLabel says so when there is nothing saved to compare", () => {
  eq(tallyLabel({ met: 0, total: 0 }, false), "No saved expectations to compare");
  eq(tallyLabel(null, false), "No saved expectations to compare");
});

check("preferenceNotes list met checks first and keep the reason", () => {
  const notes = preferenceNotes([
    { key: "caste", label: "Community", status: "not_met", note: "differs" },
    { key: "age", label: "Age range", status: "met", note: "within range" },
    { key: "job", label: "Profession", status: "unknown", note: "ignore me" },
  ]);
  eq(notes.map((row) => row.key), ["age", "caste"]);
  eq(notes[0].note, "within range");
});

console.log(`\n# tests ${passed + failed}\n# pass ${passed}\n# fail ${failed}`);
if (failed > 0) process.exit(1);
