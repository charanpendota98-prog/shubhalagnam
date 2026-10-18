/**
 * Static tests for the community catalogue (src/lib/telugu-data.ts).
 *
 * The catalogue drives registration, search filters and Telugu labels, so a
 * missing entry is invisible until a member cannot find themselves. These
 * checks are the guard rail:
 *   • anything a member can pick at registration must exist in the catalogue
 *     (directly or through a documented alias);
 *   • every community has a Telugu label and a catch-all sub-community choice;
 *   • the lists stay unique, sorted and reasonably complete.
 *
 * Run: npm run test:community
 */
import {
  CASTES,
  CASTES_DETAILED,
  CASTE_SUBCASTES,
  CASTE_TELUGU,
  COMMUNITIES_BY_RELIGION,
  OTHER_COMMUNITY_OPTION,
} from "../src/lib/telugu-data.ts";

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

const CATCH_ALL = /\(Any\)|^Any$|No Bar/;

check("the catalogue is substantial enough to be useful", () => {
  assert(CASTES_DETAILED.length >= 55, `only ${CASTES_DETAILED.length} communities — did the list get truncated?`);
});

check("community names are unique", () => {
  const names = CASTES_DETAILED.map((row) => row.en);
  eq(names.length, new Set(names).size, "duplicate community names");
});

check("communities are stored in a stable, sorted order", () => {
  const names = CASTES_DETAILED.map((row) => row.en);
  const sorted = [...names].sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }));
  eq(names, sorted, "CASTES_DETAILED is not sorted");
});

check("every community carries a Telugu label and display text", () => {
  for (const row of CASTES_DETAILED) {
    assert(row.te && row.te.trim(), `${row.en} has no Telugu name`);
    assert(row.display && row.display.includes(row.te), `${row.en} display does not lead with the Telugu name`);
  }
});

check("every community with sub-communities offers a catch-all choice", () => {
  for (const row of CASTES_DETAILED) {
    if (!row.subcastes.length) continue;
    assert(row.subcastes.some((value) => CATCH_ALL.test(value)),
      `${row.en} has no "(Any)" style catch-all sub-community`);
  }
});

check("sub-community lists contain no duplicates", () => {
  for (const row of CASTES_DETAILED) {
    eq(new Set(row.subcastes).size, row.subcastes.length, `${row.en} has duplicate sub-communities`);
  }
});

check("every community has a Telugu translation entry", () => {
  for (const name of CASTES) {
    assert(CASTE_TELUGU[name] && CASTE_TELUGU[name].trim(), `no Telugu label for ${name}`);
  }
});

check("every alias points at a real sub-community list", () => {
  for (const [alias, list] of Object.entries(CASTE_SUBCASTES)) {
    // A community may legitimately declare no sub-castes (self-described).
    const owner = CASTES_DETAILED.find((row) => row.en === alias);
    if (owner && owner.subcastes.length === 0) continue;
    assert(Array.isArray(list) && list.length, `alias ${alias} resolves to nothing`);
  }
});

check("the communities a Hindu member can register with all resolve", () => {
  // Regression guard: Dasari, Jalari, Jogi and Vadabalija were selectable at
  // registration but absent from CASTES, so they never appeared in search.
  const orphans = COMMUNITIES_BY_RELIGION.Hindu.filter((name) => {
    if (CASTES.includes(name)) return false;
    const viaAlias = CASTE_SUBCASTES[name];
    return !(Array.isArray(viaAlias) && viaAlias.length);
  });
  eq(orphans, [], "Hindu communities with no catalogue entry");
});

check("the previously missing communities are real entries now", () => {
  for (const name of ["Dasari", "Jalari", "Jogi", "Vadabalija"]) {
    const row = CASTES_DETAILED.find((entry) => entry.en === name);
    assert(row, `${name} is still missing from the catalogue`);
    assert(row.te && row.te.trim(), `${name} has no Telugu label`);
    assert(row.subcastes.some((value) => CATCH_ALL.test(value)), `${name} has no catch-all sub-community`);
  }
});

check("the names members actually type resolve into the catalogue", () => {
  for (const alias of ["Kshatriya", "Valmiki", "Vysya", "Yadav", "Viswakarma"]) {
    assert(Array.isArray(CASTE_SUBCASTES[alias]) && CASTE_SUBCASTES[alias].length,
      `${alias} should resolve to a community's sub-castes`);
  }
});

check("religion lists are unique, sorted and offer a self-described choice", () => {
  for (const [religion, list] of Object.entries(COMMUNITIES_BY_RELIGION)) {
    eq(new Set(list).size, list.length, `${religion} list has duplicates`);
    const sorted = [...list].sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }));
    eq(list, sorted, `${religion} list is not sorted`);
    assert(list.includes(OTHER_COMMUNITY_OPTION), `${religion} list has no self-described option`);
  }
});

check("reserved-category buckets carry their real communities", () => {
  const sc = CASTES_DETAILED.find((row) => row.en === "SC Others");
  const st = CASTES_DETAILED.find((row) => row.en === "ST Others");
  assert(sc && sc.subcastes.includes("Bhovi"), "SC Others should list Bhovi");
  assert(st && st.subcastes.includes("Kolam"), "ST Others should list Kolam");
});

console.log(`\n# tests ${passed + failed}\n# pass ${passed}\n# fail ${failed}`);
if (failed > 0) process.exit(1);
