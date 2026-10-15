import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_MATCH_FILTERS, parseMatchFilters } from "../src/lib/match-filter-query.mjs";

test("hydrates all homepage search fields from the submitted query", () => {
  const filters = parseMatchFilters("?gender=Bride&age_min=24&age_max=35&state=TS&nri_only=true");

  assert.equal(filters.gender, "Bride");
  assert.equal(filters.age_min, 24);
  assert.equal(filters.age_max, 35);
  assert.equal(filters.state, "TS");
  assert.equal(filters.nri_only, true);
});

test("hydrates each supported matches filter with its intended value type", () => {
  const filters = parseMatchFilters(
    "?gender=Groom&q=doctor&caste=Reddy&sub_caste=Kapulu&district=Warangal&state=TS&job=Engineer" +
      "&education=Masters&salary_min=5&salary_max=20&marital_status=Divorced&children=Has%20children" +
      "&religion=Hindu&age_min=28&age_max=38&star=Rohini&rasi=Mesha&dosham=No&verified_only=true" +
      "&photo_only=true&nri_only=false&height_min=5%274&height_max=6%270",
  );

  assert.deepEqual(filters, {
    ...DEFAULT_MATCH_FILTERS,
    gender: "Groom",
    q: "doctor",
    caste: "Reddy",
    sub_caste: "Kapulu",
    district: "Warangal",
    state: "TS",
    job: "Engineer",
    education: "Masters",
    salary_min: 5,
    salary_max: 20,
    marital_status: "Divorced",
    children: "Has children",
    religion: "Hindu",
    age_min: 28,
    age_max: 38,
    star: "Rohini",
    rasi: "Mesha",
    dosham: "No",
    verified_only: true,
    photo_only: true,
    nri_only: false,
    height_min: "5'4",
    height_max: "6'0",
  });
});

test("normalizes repeated multi-select values and ignores unrecognized keys", () => {
  const filters = parseMatchFilters("?caste=Reddy&caste=Kamma&caste=Reddy&district=Hyderabad&unexpected=forwarded");

  assert.equal(filters.caste, "Reddy,Kamma");
  assert.equal(filters.district, "Hyderabad");
  assert.equal(Object.hasOwn(filters, "unexpected"), false);
});

test("rejects malformed, out-of-range, or inverted numeric query values", () => {
  const malformed = parseMatchFilters("?age_min=17&age_max=61&salary_min=-1&nri_only=maybe");
  assert.equal(malformed.age_min, DEFAULT_MATCH_FILTERS.age_min);
  assert.equal(malformed.age_max, DEFAULT_MATCH_FILTERS.age_max);
  assert.equal(malformed.salary_min, DEFAULT_MATCH_FILTERS.salary_min);
  assert.equal(malformed.nri_only, DEFAULT_MATCH_FILTERS.nri_only);

  const inverted = parseMatchFilters("?age_min=40&age_max=30");
  assert.equal(inverted.age_min, DEFAULT_MATCH_FILTERS.age_min);
  assert.equal(inverted.age_max, DEFAULT_MATCH_FILTERS.age_max);
});
