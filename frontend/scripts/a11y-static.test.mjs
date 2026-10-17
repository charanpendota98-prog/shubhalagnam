/**
 * Static accessibility gate — runs anywhere Node runs, no browser needed.
 * =====================================================================
 * Scans `src/**\/*.tsx` for a small set of high-confidence accessibility and
 * correctness problems that can be detected by parsing JSX text.
 *
 * Grandfathering: this codebase predates the rule set, so known violations are
 * recorded in `scripts/a11y-baseline.json` as a per-file COUNT. A file may
 * improve (count goes down) freely; it may never get worse, and a brand-new
 * file starts at zero. Regenerate with:
 *
 *   node scripts/a11y-static.test.mjs --update-baseline
 *
 * Deliberately NOT checked here (needs a real browser/axe run — see
 * tests/a11y.spec.ts): colour contrast, focus order, focus visibility,
 * semantics, ARIA relationships, and anything that depends on rendered layout.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, "..");
const sourceRoot = path.join(frontendRoot, "src");
const baselinePath = path.join(scriptDir, "a11y-baseline.json");

const updateBaseline = process.argv.includes("--update-baseline");

/* ------------------------------------------------------------------ utils */

function listTsxFiles(directory) {
  const out = [];
  if (!fs.existsSync(directory)) return out;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) out.push(...listTsxFiles(target));
    else if (entry.name.endsWith(".tsx")) out.push(target);
  }
  return out;
}

/** Remove block and line comments so commented-out markup is not scanned. */
function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

/**
 * Brace-aware tag scanner.
 * A naive "first >" match cuts a tag short at `=>` inside an attribute
 * expression (`onClick={() => …}`), which produced false positives, so braces
 * are tracked and the tag ends at the first top-level `>`.
 */
function tagAt(source, start) {
  let depth = 0;
  for (let i = start; i < source.length; i += 1) {
    const char = source[i];
    if (char === "{") depth += 1;
    else if (char === "}") depth -= 1;
    else if (depth <= 0 && char === ">") return source.slice(start, i + 1);
  }
  return source.slice(start, start + 400);
}

function findTags(source, name) {
  const tags = [];
  let index = 0;
  while (index !== -1) {
    index = source.indexOf(`<${name}`, index);
    if (index === -1) break;
    const next = source[index + name.length + 1];
    if (next !== undefined && !/[\s\n>]/.test(next)) {
      index += 1;
      continue;
    }
    const tag = tagAt(source, index);
    tags.push(tag);
    index += tag.length;
  }
  return tags;
}

/* ------------------------------------------------------------------ rules */

/**
 * Each rule receives the comment-stripped file source and returns the number of
 * violations. Keep rules cheap, deterministic and free of judgement calls.
 */
const RULES = {
  /** A bare <button> inside a <form> defaults to type="submit" and submits it. */
  "button-without-type": (source) =>
    findTags(source, "button").filter((tag) => !/\btype=/.test(tag)).length,

  /** Images must expose alt text (alt="" for decorative ones). */
  "img-without-alt": (source) =>
    findTags(source, "img").filter((tag) => !/\balt=/.test(tag)).length,

  /** Positive tabIndex breaks the natural focus order. */
  "positive-tabindex": (source) =>
    (source.match(/tabIndex=\{\s*[1-9]/g) || []).length,

  /** aria-hidden on a focusable element hides it from AT while it stays tabbable. */
  "aria-hidden-focusable": (source) =>
    findTags(source, "a")
      .concat(findTags(source, "button"))
      .concat(findTags(source, "input"))
      .concat(findTags(source, "select"))
      .concat(findTags(source, "textarea"))
      .filter((tag) => /aria-hidden="true"/.test(tag) && !/\bdisabled\b/.test(tag) && !/\btabIndex=\{-1\}/.test(tag))
      .length,

  /**
   * An icon-only control must still have a name a screen reader can read.
   * A button whose entire content is an emoji or an <svg>/icon component, with
   * no aria-label/aria-labelledby/title, is announced as just "button".
   */
  "button-without-name": (source) => {
    let count = 0;
    let index = 0;
    while (index !== -1) {
      index = source.indexOf("<button", index);
      if (index === -1) break;
      const next = source[index + 7];
      if (next !== undefined && !/[\s\n>]/.test(next)) {
        index += 1;
        continue;
      }
      const tag = tagAt(source, index);
      const tagEnd = index + tag.length;
      const close = source.indexOf("</button>", tagEnd);
      const inner = close === -1 ? "" : source.slice(tagEnd, close);
      index = close === -1 ? tagEnd : close + 9;
      if (!inner.trim()) continue;
      if (/\b(aria-label|aria-labelledby|title)=/.test(tag)) continue;
      // Dynamic content can render text — assume it does.
      if (/\{[^{}]*[A-Za-z\u0C00-\u0C7F][^{}]*\}/.test(inner)) continue;
      const literal = inner.replace(/<[^>]+>/g, "");
      if (/[A-Za-z0-9\u0C00-\u0C7F]/.test(literal)) continue;
      // <Duo en="…" te="…" /> renders real text.
      if (/<Duo\b/.test(inner)) continue;
      count += 1;
    }
    return count;
  },

  /**
   * A form control must have a name a screen reader can announce: an
   * aria-label / aria-labelledby / title / id (paired with htmlFor), a
   * <label> wrapper, or a placeholder used as the visible hint.
   */
  "control-without-name": (source) => {
    // <label> … </label> ranges: a control inside one is already associated.
    const labelSpans = [];
    let scan = 0;
    while (scan !== -1) {
      scan = source.indexOf("<label", scan);
      if (scan === -1) break;
      const close = source.indexOf("</label>", scan);
      labelSpans.push([scan, close === -1 ? source.length : close]);
      scan = close === -1 ? scan + 6 : close + 8;
    }
    let count = 0;
    const matcher = /<(input|select|textarea)[\s]/g;
    let match;
    while ((match = matcher.exec(source)) !== null) {
      const index = match.index;
      const tag = tagAt(source, index);
      const insideLabel = labelSpans.some(([a, b]) => index >= a && index <= b);
      const named = /\b(aria-label|aria-labelledby|title|id|placeholder)=/.test(tag);
      if (!insideLabel && !named && !/type=\{?["']?hidden/.test(tag)) count += 1;
      matcher.lastIndex = index + tag.length;
    }
    return count;
  },

  /** role="button" on a non-button element must be keyboard reachable. */
  "role-button-without-tabindex": (source) =>
    findTags(source, "div")
      .concat(findTags(source, "span"))
      .concat(findTags(source, "li"))
      .filter((tag) => /role="button"/.test(tag) && !/\btabIndex=/.test(tag))
      .length,
};

function scan() {
  const files = listTsxFiles(sourceRoot).sort();
  const results = {};
  for (const rule of Object.keys(RULES)) results[rule] = {};
  for (const file of files) {
    const relative = path.relative(frontendRoot, file).split(path.sep).join("/");
    const source = stripComments(fs.readFileSync(file, "utf8"));
    for (const [rule, run] of Object.entries(RULES)) {
      const count = run(source);
      if (count > 0) results[rule][relative] = count;
    }
  }
  return results;
}

/* ------------------------------------------------------------------- main */

const current = scan();

if (updateBaseline) {
  fs.writeFileSync(baselinePath, `${JSON.stringify(current, null, 2)}\n`, "utf8");
  const total = Object.values(current).reduce(
    (sum, byFile) => sum + Object.values(byFile).reduce((a, b) => a + b, 0),
    0,
  );
  console.log(`Baseline written to ${path.relative(frontendRoot, baselinePath)} — ${total} grandfathered findings.`);
  process.exit(0);
}

const baseline = JSON.parse(fs.readFileSync(baselinePath, "utf8"));

for (const rule of Object.keys(RULES)) {
  test(`a11y-static: ${rule} never gets worse`, () => {
    const known = baseline[rule] ?? {};
    const found = current[rule] ?? {};
    const problems = [];

    for (const [file, count] of Object.entries(found)) {
      const allowed = known[file];
      if (allowed === undefined) {
        problems.push(`${file}: ${count} new finding(s) in a file that had none — fix or re-baseline`);
      } else if (count > allowed) {
        problems.push(`${file}: ${count} finding(s), baseline allows ${allowed}`);
      }
    }
    assert.equal(
      problems.length,
      0,
      `New accessibility findings for "${rule}":\n  ${problems.join("\n  ")}`,
    );
  });
}

test("a11y-static: baseline covers every rule", () => {
  const missing = Object.keys(RULES).filter((rule) => !(rule in baseline));
  assert.deepEqual(missing, [], `Baseline is missing rule(s): ${missing.join(", ")}`);
});

test("a11y-static: baseline has no stale rule keys", () => {
  const stale = Object.keys(baseline).filter((rule) => !(rule in RULES));
  assert.deepEqual(stale, [], `Baseline references removed rule(s): ${stale.join(", ")}`);
});
