/**
 * Static tests for the shared saved-search summary module.
 * Run: npm run test:saved-search
 */
import {
  isBroadSavedSearch,
  joinValues,
  normalizeAge,
  savedSearchParts,
  splitValues,
  summarizeSavedSearch,
} from "../src/lib/saved-search-summary.mjs";

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

check("splitValues trims, drops blanks and de-duplicates nothing", () => {
  eq(splitValues(" Reddy ,  Kamma ,, "), ["Reddy", "Kamma"]);
  eq(splitValues(""), []);
  eq(splitValues(null), []);
  eq(splitValues(undefined), []);
});

check("joinValues truncates with a visible +N overflow", () => {
  eq(joinValues("A, B"), "A, B");
  eq(joinValues("A, B, C"), "A, B +1");
  eq(joinValues("A, B, C, D", 3), "A, B, C +1");
  eq(joinValues(""), "");
});

check("normalizeAge clamps to 18-60 and falls back safely", () => {
  eq(normalizeAge(25, 18), 25);
  eq(normalizeAge(12, 18), 18);
  eq(normalizeAge(90, 60), 60);
  eq(normalizeAge("32", 18), 32);
  eq(normalizeAge("abc", 18), 18);
  eq(normalizeAge(null, 60), 60);
  eq(normalizeAge(undefined, 60), 60);
  eq(normalizeAge(24.6, 18), 25);
});

check("default age range produces no age part", () => {
  const parts = savedSearchParts({ age_min: 18, age_max: 60 }, false);
  assert(!parts.some((p) => p.startsWith("Age")), `unexpected age part in ${JSON.stringify(parts)}`);
});

check("narrowed age range is reported once with both bounds", () => {
  const parts = savedSearchParts({ age_min: 25, age_max: 34 }, false);
  eq(parts, ["Age: 25–34"]);
});

check("out-of-range stored ages are clamped, not echoed", () => {
  eq(savedSearchParts({ age_min: 5, age_max: 40 }, false), ["Age: 18–40"]);
  // A range that clamps back to the default contributes nothing.
  eq(savedSearchParts({ age_min: 5, age_max: 99 }, false), []);
});

check("part order follows the filter drawer", () => {
  const parts = savedSearchParts(
    {
      q: "doctor",
      photo_only: true,
      district: "Hyderabad",
      gender: "Bride",
      caste: "Reddy",
      age_min: 24,
      age_max: 30,
      religion: "Hindu",
    },
    false,
  );
  eq(parts, [
    "Gender: Bride",
    "Age: 24–30",
    "Religion: Hindu",
    "Community: Reddy",
    "District: Hyderabad",
    "With photo",
    "Keyword: doctor",
  ]);
});

check("boolean filters accept string 'true' as well as boolean true", () => {
  const parts = savedSearchParts({ nri_only: "true", verified_only: true, photo_only: false }, false);
  eq(parts, ["NRI only", "Verified only"]);
});

check("income is only mentioned when a minimum was set", () => {
  eq(savedSearchParts({ salary_min: 0, salary_max: 0 }, false), []);
  eq(savedSearchParts({ salary_min: 8 }, false), ["Min income: ₹8"]);
});

check("Telugu output uses Telugu labels", () => {
  const parts = savedSearchParts({ gender: "Bride", age_min: 25, age_max: 30 }, true);
  eq(parts, ["లింగం: Bride", "వయస్సు: 25–30"]);
});

check("summary is capped at four parts with a +N more tail", () => {
  const text = summarizeSavedSearch(
    { gender: "Groom", age_min: 25, age_max: 30, religion: "Hindu", caste: "Reddy", district: "Hyderabad" },
    false,
  );
  eq(text, "Gender: Groom · Age: 25–30 · Religion: Hindu · Community: Reddy · +1 more");
});

check("Telugu overflow tail is translated", () => {
  const text = summarizeSavedSearch(
    { gender: "Groom", age_min: 25, age_max: 30, religion: "Hindu", caste: "Reddy", district: "Hyderabad" },
    true,
  );
  assert(text.includes("ఇంకా 1"), `expected Telugu overflow tail, got ${text}`);
});

check("empty criteria fall back to a neutral label", () => {
  eq(summarizeSavedSearch({}, false), "Search filters");
  eq(summarizeSavedSearch({}, true), "శోధన ఫిల్టర్లు");
  eq(summarizeSavedSearch(null, false), "Search filters");
});

check("isBroadSavedSearch detects a do-nothing saved search", () => {
  eq(isBroadSavedSearch({}), true);
  eq(isBroadSavedSearch({ age_min: 18, age_max: 60 }), true);
  eq(isBroadSavedSearch({ district: "Hyderabad" }), false);
});

check("summary never renders scoring, ranking or prediction language", () => {
  const text = summarizeSavedSearch(
    { gender: "Bride", age_min: 24, age_max: 30, caste: "Reddy", verified_only: true, q: "doctor" },
    false,
  );
  assert(!/compatibility|soulmate|guaranteed|success|best match|%\s*$/i.test(text), `risky copy: ${text}`);
});

console.log(`\n# tests ${passed + failed}\n# pass ${passed}\n# fail ${failed}`);
if (failed > 0) process.exit(1);
