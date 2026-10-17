/**
 * Tests for the explainable-match helpers (src/lib/match-reasons.mjs).
 *
 * The point of these tests is the safety property as much as the arithmetic:
 * a reason may only restate a filter the member set and a value the profile
 * actually carries. Anything invented, guessed or scored fails the suite.
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_AGE_MAX,
  DEFAULT_AGE_MIN,
  REASON_LIMIT,
  matchReasons,
  relaxSuggestions,
  widenedAgeLabel,
} from "../src/lib/match-reasons.mjs";
import { DEFAULT_MATCH_FILTERS } from "../src/lib/match-filter-query.mjs";

const filters = (overrides = {}) => ({ ...DEFAULT_MATCH_FILTERS, ...overrides });

const row = (overrides = {}) => ({
  tsap_id: "MV1001",
  full_name: "Test Profile",
  age: 27,
  gender: "Bride",
  caste: "Reddy",
  sub_caste: "Naidu",
  district: "Hyderabad",
  state: "TS",
  education: "B.Tech",
  job: "Software",
  salary: "600000",
  marital_status: "Never Married",
  religion: "Hindu",
  photo_url: "/photos/x.jpg",
  ...overrides,
});

test("no filters applied ⇒ no reasons (nothing was narrowed)", () => {
  assert.deepEqual(matchReasons(row(), filters()), []);
});

test("a missing row or filter object is handled without throwing", () => {
  assert.deepEqual(matchReasons(null, filters()), []);
  assert.deepEqual(matchReasons(row(), null), []);
  assert.deepEqual(relaxSuggestions(null), []);
});

test("reasons restate the filter and the profile value", () => {
  const reasons = matchReasons(row(), filters({ district: "Hyderabad", age_min: 25, age_max: 30 }));
  const ids = reasons.map((reason) => reason.id);
  assert.ok(ids.includes("district"), "district match must be explained");
  assert.ok(ids.includes("age"), "narrowed age range must be explained");
  const age = reasons.find((reason) => reason.id === "age");
  assert.match(age.en, /Age 27 is inside your 25–30 range/);
  assert.match(age.te, /27/);
});

test("the default age range is not reported as a reason", () => {
  const reasons = matchReasons(row(), filters({ age_min: DEFAULT_AGE_MIN, age_max: DEFAULT_AGE_MAX }));
  assert.equal(
    reasons.filter((reason) => reason.id === "age").length,
    0,
    "18–60 is the default, so it explains nothing",
  );
});

test("mismatched filters produce no reason for that field", () => {
  const reasons = matchReasons(row(), filters({ district: "Guntur", caste: "Kamma" }));
  assert.deepEqual(reasons, []);
});

test("missing profile data never produces a guessed reason", () => {
  const reasons = matchReasons(
    row({ education: "", job: "", salary: "", marital_status: "", district: "", religion: "" }),
    filters({ education: "B.Tech", job: "Software", salary_min: 100000, marital_status: "Never Married", district: "Hyderabad", religion: "Hindu" }),
  );
  assert.deepEqual(reasons, [], "empty values must yield no reasons");
});

test("multi-select filters match any selected value", () => {
  const reasons = matchReasons(row(), filters({ caste: "Kamma, Reddy, Vysya" }));
  assert.ok(reasons.some((reason) => reason.id === "caste"));
});

test("multi-select comparison is case and space insensitive", () => {
  const reasons = matchReasons(row({ district: "hyderabad" }), filters({ district: " Hyderabad " }));
  assert.ok(reasons.some((reason) => reason.id === "district"));
});

test("sub-community wins over community when both match", () => {
  const reasons = matchReasons(row(), filters({ caste: "Reddy", sub_caste: "Naidu" }));
  const ids = reasons.map((reason) => reason.id);
  assert.ok(ids.indexOf("sub_caste") < ids.indexOf("caste") || !ids.includes("caste"));
});

test("recorded checks are described as recorded, never as verified identity", () => {
  const reasons = matchReasons(row({ id_verified: true }), filters({ verified_only: true }));
  const verified = reasons.find((reason) => reason.id === "verified");
  assert.ok(verified, "a recorded check should be explained");
  assert.match(verified.en, /not an identity guarantee/i);
  assert.doesNotMatch(verified.en, /verified identity|100%|guaranteed match/i);
});

test("reasons never contain a compatibility score or outcome claim", () => {
  const all = matchReasons(row(), filters({
    q: "Test",
    district: "Hyderabad",
    sub_caste: "Naidu",
    caste: "Reddy",
    religion: "Hindu",
    age_min: 25,
    age_max: 30,
    education: "B.Tech",
    job: "Software",
    salary_min: 100000,
    marital_status: "Never Married",
    verified_only: true,
    photo_only: true,
  }));
  for (const reason of all) {
    const text = `${reason.en} ${reason.te}`;
    assert.doesNotMatch(text, /%\s*$|compatibility|soulmate|perfect match|guaranteed|success/i);
  }
});

test("the number of reasons is capped and deterministic", () => {
  const active = filters({
    q: "Test",
    district: "Hyderabad",
    sub_caste: "Naidu",
    caste: "Reddy",
    religion: "Hindu",
    age_min: 25,
    age_max: 30,
    education: "B.Tech",
    job: "Software",
    salary_min: 100000,
    marital_status: "Never Married",
    verified_only: true,
    photo_only: true,
  });
  const first = matchReasons(row(), active);
  assert.equal(first.length, REASON_LIMIT);
  assert.deepEqual(first, matchReasons(row(), active), "same input must give the same reasons");
  assert.equal(matchReasons(row(), active, { limit: 1 }).length, 1);
  assert.equal(matchReasons(row(), active, { limit: 0 }).length, 0);
});

test("relax suggestions only cover filters that were narrowed", () => {
  assert.deepEqual(relaxSuggestions(filters()), []);

  const suggestions = relaxSuggestions(filters({ district: "Hyderabad", photo_only: true }));
  const ids = suggestions.map((suggestion) => suggestion.id);
  assert.deepEqual(ids, ["photo_only", "district"]);
});

test("relax patches merge cleanly into the filter state", () => {
  const current = filters({ district: "Hyderabad", photo_only: true, sub_caste: "Naidu" });
  const suggestion = relaxSuggestions(current, { limit: 1 })[0];
  const next = { ...current, ...suggestion.patch };
  assert.equal(next[suggestion.id], suggestion.patch[suggestion.id]);
  assert.notDeepEqual(next, current, "applying a suggestion must change the filters");
});

test("age widening stays inside the supported range and labels itself", () => {
  const suggestion = relaxSuggestions(filters({ age_min: 20, age_max: 25 })).find((entry) => entry.id === "age");
  assert.ok(suggestion, "a narrowed age range must be relaxable");
  assert.equal(suggestion.patch.age_min, 18);
  assert.equal(suggestion.patch.age_max, 30);
  assert.equal(widenedAgeLabel(filters({ age_min: 20, age_max: 25 })), "18–30");

  const edge = relaxSuggestions(filters({ age_min: 18, age_max: 60 })).find((entry) => entry.id === "age");
  assert.equal(edge, undefined, "the default range is not narrow, so it is not suggested");
});

test("relax suggestions are capped", () => {
  const everything = filters({
    q: "Test",
    caste: "Reddy",
    sub_caste: "Naidu",
    district: "Hyderabad",
    state: "TS",
    education: "B.Tech",
    job: "Software",
    salary_min: 100000,
    marital_status: "Never Married",
    religion: "Hindu",
    verified_only: true,
    photo_only: true,
    age_min: 25,
    age_max: 30,
  });
  assert.equal(relaxSuggestions(everything, { limit: 2 }).length, 2);
  assert.ok(relaxSuggestions(everything, { limit: 10 }).length <= 12);
});
