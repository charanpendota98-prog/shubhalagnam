import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

// Real backend outputs from six disposable synthetic states: empty, invite,
// follow-up, waiting, rewarded and reversed. No provider or production data.
const fixtures = JSON.parse(fs.readFileSync(new URL("./fixtures/referral-payloads.json", import.meta.url)));
const context = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync(new URL("../src/lib/referral-payload.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, context);
const checks = { wallet: "validStatement", earnings: "validEarnings", insights: "validInsights", invites: "validInvites" };

for (const fixture of fixtures) for (const [endpoint, name] of Object.entries(checks)) {
  test(`${fixture.label}: accepts real synthetic backend ${endpoint} contract`, () => {
    assert.equal(context.exports[name](fixture[endpoint]), true);
  });
}

for (const [endpoint, name] of Object.entries(checks)) {
  for (const [label, payload] of Object.entries({ missing: undefined, null: null, list: [], successOnly: { success: true }, empty: {} })) {
    test(`${endpoint}: rejects ${label} instead of inventing empty private data`, () => {
      assert.equal(context.exports[name](payload), false);
    });
  }
}

const invalid = {
  wallet: [
    ["wallet", "137"], ["wallet", null], ["wallet", NaN], ["entries", null], ["entries", {}],
    ["entries.0.amount", "50"], ["entries.0.type", null], ["totals.paid_out", undefined],
    ["identity.reconciles", "true"], ["identity.expected_wallet", Infinity], ["min_payout", "50"],
  ],
  earnings: [
    ["rows", null], ["counts", null], ["counts.rewarded", undefined], ["totals.wallet", "50"],
    ["rows.0.timeline", null], ["rows.0.reward", "50"], ["rows.0.timeline.0.label_en", {}],
  ],
  insights: [
    ["channels", {}], ["conversion", null], ["conversion.clicks", "0"], ["conversion.small_sample", null],
    ["conversion.click_to_join_pct", undefined], ["followups", null], ["next_actions", {}],
    ["best_channel", {}], ["followups.0.share", {}],
  ],
  invites: [["invites", null], ["invites", {}], ["invites.0.token", null], ["invites.0.needs_followup", "false"], ["invites.0.sent_days_ago", "0"]],
};
for (const [endpoint, mutations] of Object.entries(invalid)) for (const [path, value] of mutations) {
  test(`${endpoint}: rejects malformed ${path} (${String(value)})`, () => {
    const fixture = fixtures.find(f => f.label === (endpoint === "wallet" || endpoint === "earnings" ? "rewarded" : "followup"));
    const payload = structuredClone(fixture[endpoint]);
    const parts = path.split(".");
    const leaf = parts.pop();
    let current = payload;
    for (const part of parts) current = current[part];
    current[leaf] = value;
    assert.equal(context.exports[checks[endpoint]](payload), false);
  });
}
