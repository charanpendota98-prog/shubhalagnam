/**
 * Static tests for the control-dashboard insight helpers.
 * Run: npm run test:ops
 */
import {
  agingLabel,
  funnelLabel,
  funnelRows,
  hoursLabel,
  interestStatusLabel,
  interestStatusRows,
  sharePercent,
  trendLabel,
} from "../src/lib/ops-insights.mjs";

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

check("aging labels cover every backend bucket", () => {
  eq(agingLabel("under_24h", false), "Under 24 hours");
  eq(agingLabel("1_3_days", false), "1–3 days");
  eq(agingLabel("3_7_days", false), "3–7 days");
  eq(agingLabel("over_7_days", false), "Over 7 days");
  assert(agingLabel("over_7_days", true).length > 0, "Telugu label required");
});

check("unknown keys are humanized, never shown raw", () => {
  eq(agingLabel("some_new_bucket", false), "some new bucket");
  eq(agingLabel("", false), "Other");
  eq(funnelLabel("photo_added", false), "Added a photo");
  eq(interestStatusLabel("withdrawn", false), "Withdrawn");
  eq(interestStatusLabel("weird_state", false), "weird state");
});

check("sharePercent refuses to divide by nothing", () => {
  eq(sharePercent(3, 0), null);
  eq(sharePercent(3, null), null);
  eq(sharePercent(undefined, 10), null);
  eq(sharePercent(1, 4), 25);
  eq(sharePercent(-5, 10), 0);
  eq(sharePercent(20, 10), 100, "a share never exceeds 100%");
});

check("funnel rows label and share against the first step only", () => {
  const rows = funnelRows([
    { step: "registered", count: 100 },
    { step: "photo_added", count: 40 },
    { step: "approved", count: 25 },
    { step: "sent_first_interest", count: 10 },
  ], false);
  eq(rows.map((row) => [row.label, row.count, row.share]), [
    ["Registered", 100, null],
    ["Added a photo", 40, 40],
    ["Approved", 25, 25],
    ["Sent a first request", 10, 10],
  ]);
});

check("an empty funnel yields no rows and no shares", () => {
  eq(funnelRows([], false), []);
  eq(funnelRows(null, false), []);
  eq(funnelRows([{ step: "registered", count: 0 }], false), [{ step: "registered", label: "Registered", count: 0, share: null }]);
});

check("hoursLabel reads as a duration", () => {
  eq(hoursLabel(0, false), "None waiting");
  eq(hoursLabel(-3, false), "None waiting");
  eq(hoursLabel(0.5, false), "Under an hour");
  eq(hoursLabel(6, false), "6 hours");
  eq(hoursLabel(47, false), "47 hours");
  eq(hoursLabel(48, false), "2 days");
  eq(hoursLabel(200, false), "8.3 days");
  eq(hoursLabel("junk", false), "None waiting");
});

check("trendLabel compares with the previous week", () => {
  const up = trendLabel({ last_7d: 12, previous_7d: 8 }, false);
  assert(up.includes("12") && up.includes("4") && up.includes("up"), up);
  assert(up.includes("50%"), `expected 50% in ${up}`);
  const down = trendLabel({ last_7d: 6, previous_7d: 8 }, false);
  assert(down.includes("down") && down.includes("25%"), down);
});

check("trendLabel handles a flat week and an empty baseline", () => {
  eq(trendLabel({ last_7d: 5, previous_7d: 5 }, false), "5 in the last 7 days — no change");
  const empty = trendLabel({ last_7d: 3, previous_7d: 0 }, false);
  assert(empty.includes("3"), empty);
  assert(!/NaN|Infinity|undefined/.test(empty), `no broken math: ${empty}`);
  assert(!/%/.test(empty), `no percentage without a baseline: ${empty}`);
});

check("trendLabel never renders NaN or Infinity", () => {
  for (const trend of [{}, { last_7d: 0, previous_7d: 0 }, { last_7d: null, previous_7d: 5 }, { last_7d: 5, previous_7d: null }]) {
    const text = `${trendLabel(trend, false)} ${trendLabel(trend, true)}`;
    assert(!/NaN|Infinity|undefined|null/.test(text), `broken output for ${JSON.stringify(trend)}: ${text}`);
  }
});

check("interest statuses read as what members did, in a stable order", () => {
  const rows = interestStatusRows(
    [{ label: "declined", count: 2 }, { label: "accepted", count: 5 }, { label: "pending", count: 9 }],
    false,
  );
  eq(rows.map((row) => row.label), ["Awaiting reply", "Accepted", "Declined"]);
  eq(rows.map((row) => row.count), [9, 5, 2]);
  eq(interestStatusRows(null, false), []);
});

console.log(`\n# tests ${passed + failed}\n# pass ${passed}\n# fail ${failed}`);
if (failed > 0) process.exit(1);
