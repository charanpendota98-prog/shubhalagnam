/**
 * 🌊 WAVE 43 — Member Intelligence static suite.
 *
 * The five new endpoints are only allowed to explain what is recorded. These
 * checks guard that promise on both sides of the wire:
 *   1. every endpoint exists and is mounted in the UI (no dead feature),
 *   2. no surface — API module or component — invents a compatibility score,
 *      a ranking, a trust claim, a guaranteed delivery, or a promised reply,
 *   3. every surface is bilingual (English + Telugu) and mobile-friendly.
 * Run: node scripts/member-intel.test.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SRC = path.join(ROOT, "src");
const BACKEND = path.join(ROOT, "..", "backend");

let passed = 0;
const failures = [];

function check(name, fn) {
  try {
    fn();
    passed += 1;
  } catch (error) {
    failures.push(`${name}\n    ${error.message}`);
    console.error(`  ✗ ${name}\n    ${error.message}`);
  }
}

const read = (relative) => fs.readFileSync(path.join(ROOT, relative), "utf8");
const readSrc = (relative) => read(path.join("src", relative));

const COMPONENTS = {
  VerificationProgress: "components/VerificationProgress.tsx",
  ProfileInsights: "components/ProfileInsights.tsx",
  RequestCoach: "components/RequestCoach.tsx",
  RequestTimeline: "components/RequestTimeline.tsx",
  MemberActivity: "components/MemberActivity.tsx",
};

const MOUNTS = {
  VerificationProgress: "src/app/verify/page-client.tsx",
  ProfileInsights: "src/app/search/[id]/ProfileView.tsx",
  RequestCoach: "src/app/search/[id]/ProfileView.tsx",
  RequestTimeline: "src/app/search/[id]/ProfileView.tsx",
  MemberActivity: "src/app/me/page-client.tsx",
};

const MOUNT_PAGES = [...new Set(Object.values(MOUNTS))].map((relative) =>
  path.join(ROOT, relative),
);

const ENDPOINTS = [
  "/api/verification/{tsap_id}/progress",
  "/api/matches/{viewer_id}/insights/{profile_id}",
  "/api/interest/coach",
  "/api/interest/{request_id}/timeline",
  "/api/me/{tsap_id}/activity",
];

// Anything that would promise something the service cannot promise.
const BANNED = [
  /compatibility\s*score/i,
  /match\s*score/i,
  /\d{1,3}\s*%\s*match/i,
  /trust\s*score/i,
  /guaranteed\s*(reply|response|delivery|read)/i,
  /will\s+definitely\s+reply/i,
  /marriage\s+guarantee/i,
];

// A phrase is only a false promise when the sentence does not deny it. Honest
// copy says "not a compatibility score" and must not be flagged as one.
const NEGATION = /\b(not|never|no|cannot|can't|don't|doesn't|isn't|aren't|without|instead of|neither|nor)\b|(కాదు|కాదని|లేదు|లేకుండా|ఊహించము|హామీ\s*లేదు)/i;
const claims = (text) =>
  text
    .split(/(?<=[.!?;])\s+|\n/)
    .filter((segment) => !NEGATION.test(segment))
    .join(" ");

check("every member-intel endpoint is defined on the backend", () => {
  const main = fs.readFileSync(path.join(BACKEND, "main.py"), "utf8");
  const routes = new Set(
    [...main.matchAll(/@app\.(?:get|post|put|patch|delete)\(\s*"([^"]+)"/g)].map((m) => m[1]),
  );
  const missing = ENDPOINTS.filter((route) => !routes.has(route));
  assert.deepEqual(missing, [], `missing routes: ${missing.join(", ")}`);
});

check("each endpoint reads the owner's token before answering", () => {
  const main = fs.readFileSync(path.join(BACKEND, "main.py"), "utf8");
  const blocks = main.split("\n@app.").filter((block) =>
    ENDPOINTS.some((route) => block.includes(`"${route}"`)),
  );
  assert.equal(blocks.length, ENDPOINTS.length, "each endpoint must be defined exactly once");
  for (const [index, block] of blocks.entries()) {
    assert.ok(
      block.includes("require_owner("),
      `${ENDPOINTS[index]} must call require_owner() — private member data`,
    );
  }
});

check("the member-intel module promises nothing it cannot deliver", () => {
  const module = claims(fs.readFileSync(path.join(BACKEND, "member_intel.py"), "utf8"));
  for (const pattern of BANNED) {
    assert.ok(!pattern.test(module), `member_intel.py must not claim ${pattern}`);
  }
  for (const phrase of [
    "DISCLAIMER_EN",
    "DELIVERY_NOTE_EN",
    "compatibility_score_calculated",
    "small_sample",
  ]) {
    assert.ok(module.includes(phrase), `member_intel.py must define ${phrase}`);
  }
});

check("every component exists", () => {
  for (const [name, relative] of Object.entries(COMPONENTS)) {
    assert.ok(fs.existsSync(path.join(SRC, relative)), `${name} file missing`);
  }
});

check("no component is written and then forgotten — each one is mounted", () => {
  for (const [name, relative] of Object.entries(MOUNTS)) {
    const page = fs.readFileSync(path.join(ROOT, relative), "utf8");
    assert.ok(
      new RegExp(`import\\s+${name}\\s+from`).test(page),
      `${relative} must import ${name}`,
    );
    assert.ok(new RegExp(`<${name}\\b`).test(page), `${relative} must render <${name} />`);
  }
});

check("no surface invents a compatibility score or a promise", () => {
  const surfaces = [
    ...Object.values(COMPONENTS).map((relative) => ["component", readSrc(relative)]),
    ...MOUNT_PAGES.map((file) => ["page", fs.readFileSync(file, "utf8")]),
  ];
  for (const [kind, source] of surfaces) {
    const text = claims(source);
    for (const pattern of BANNED) {
      assert.ok(!pattern.test(text), `${kind} must not claim ${pattern}`);
    }
  }
});

check("every component is bilingual — Telugu copy is not an afterthought", () => {
  for (const [name, relative] of Object.entries(COMPONENTS)) {
    const text = readSrc(relative);
    assert.ok(text.includes("useLang"), `${name} must read the language`);
    assert.ok(text.includes("te ?"), `${name} must branch on Telugu`);
    assert.ok(/[\u0C00-\u0C7F]/.test(text), `${name} must contain Telugu text`);
  }
});

check("every component shows the Telugu side of what the API sends", () => {
  for (const [name, relative] of Object.entries(COMPONENTS)) {
    const text = readSrc(relative);
    assert.ok(/_te\b/.test(text), `${name} must render the Telugu strings from the API`);
  }
});

check("interactive elements keep a mobile-friendly touch target", () => {
  for (const [name, relative] of Object.entries(COMPONENTS)) {
    const text = readSrc(relative);
    if (!/<button|<a\s|<Link/.test(text)) continue;
    assert.ok(/min-h-11/.test(text), `${name} needs a min-h-11 touch target`);
  }
});

check("components never hard-code a score — they render what the API returns", () => {
  const insights = readSrc(COMPONENTS.ProfileInsights);
  assert.ok(
    insights.includes("compatibility_score_calculated") || insights.includes("disclaimer_en"),
    "insights must surface the disclaimer or the no-score flag",
  );
  const coach = readSrc(COMPONENTS.RequestCoach);
  assert.ok(coach.includes("can_send"), "the coach must gate on the server's eligibility answer");
  assert.ok(coach.includes("credits"), "the coach must show the real credit count");
});

check("a matching saved search explains which filter fitted", () => {
  const insights = readSrc(COMPONENTS.ProfileInsights);
  assert.ok(insights.includes("filter_detail"), "insights must read the per-filter detail");
  assert.ok(
    /filter_detail\s*\|\|\s*\[\]/.test(insights) || /filter_detail \|\| \[\]/.test(insights),
    "the per-filter list must fall back to empty, never render undefined",
  );
  const backend = fs.readFileSync(path.join(BACKEND, "member_intel.py"), "utf8");
  assert.ok(backend.includes("def _filter_breakdown"), "one helper computes the breakdown");
  assert.ok(
    backend.includes("quality.matches_filters(profile, {key: value})"),
    "each filter is judged by the same matcher search uses — never a second opinion",
  );
});

check("the timeline only draws steps that were recorded", () => {
  const timeline = readSrc(COMPONENTS.RequestTimeline);
  assert.ok(timeline.includes("completed"), "steps must carry a recorded state");
  assert.ok(/state === "completed"/.test(timeline), "only completed steps are styled as done");
  assert.ok(/when\(step\.at\)/.test(timeline), "each step shows the timestamp it was recorded at");
});

check("verification is described as recorded checks, never as trust", () => {
  const verify = readSrc(COMPONENTS.VerificationProgress);
  assert.ok(verify.includes("does_not"), "each check must say what it does not confirm");
  assert.ok(!/trusted|trustworthiness/i.test(verify), "verification must not claim trust");
});

console.log(`\n🌊 MEMBER INTELLIGENCE — ${passed} passed, ${failures.length} failed`);
if (failures.length) {
  console.error(`\nFAILED:\n  ❌ ${failures.join("\n  ❌ ")}`);
  process.exit(1);
}
