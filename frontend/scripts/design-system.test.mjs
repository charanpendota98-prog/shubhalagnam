/**
 * Design-system gate — keeps tokens, CSS and primitives honest.
 * ============================================================
 * Checks (all static, no browser required):
 *  1. `src/lib/design-tokens.ts` declares a non-empty, well-formed token map.
 *  2. Every token is mirrored 1:1 in a `:root` block of `src/app/globals.css`.
 *  3. Every `var(--ds-*)` used in globals.css is actually defined.
 *  4. The touch-target token meets the 44px mobile-first minimum.
 *  5. Primitives in `src/components/ui/` never hardcode a raw hex colour,
 *     never remove focus styling, and cover the documented component list.
 *  6. Button defaults to `type="button"`; Field wires label/aria correctly.
 *  7. The barrel file re-exports every primitive.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, "..");
const tokensPath = path.join(frontendRoot, "src", "lib", "design-tokens.ts");
const cssPath = path.join(frontendRoot, "src", "app", "globals.css");
const uiDir = path.join(frontendRoot, "src", "components", "ui");

const tokensSource = fs.readFileSync(tokensPath, "utf8");
const css = fs.readFileSync(cssPath, "utf8");

/** Pull `"--ds-name": "value"` pairs out of the token module. */
function parseTokens() {
  const pairs = {};
  const re = /"(--ds-[a-z0-9-]+)":\s*"([^"]*)"/g;
  let match;
  while ((match = re.exec(tokensSource)) !== null) pairs[match[1]] = match[2];
  return pairs;
}

/** Pull `--ds-name: value;` declarations out of every `:root` block. */
function parseCssVars() {
  const vars = {};
  const rootRe = /:root\s*\{([^}]*)\}/g;
  let block;
  while ((block = rootRe.exec(css)) !== null) {
    const declRe = /(--ds-[a-z0-9-]+)\s*:\s*([^;]+);/g;
    let decl;
    while ((decl = declRe.exec(block[1])) !== null) vars[decl[1]] = decl[2].trim();
  }
  return vars;
}

const tokens = parseTokens();
const cssVars = parseCssVars();
const uiFiles = fs.existsSync(uiDir)
  ? fs.readdirSync(uiDir).filter((name) => name.endsWith(".tsx"))
  : [];
const readUi = (name) => fs.readFileSync(path.join(uiDir, name), "utf8");

test("tokens: the map is declared and non-empty", () => {
  assert.ok(Object.keys(tokens).length > 40, `Expected a populated token map, got ${Object.keys(tokens).length}`);
  assert.match(tokensSource, /export const DESIGN_TOKENS/, "DESIGN_TOKENS must be exported");
  assert.match(tokensSource, /as const;/, "DESIGN_TOKENS must be a const assertion");
});

test("tokens: every token name is kebab-case and ds-prefixed", () => {
  const bad = Object.keys(tokens).filter((name) => !/^--ds-[a-z0-9]+(-[a-z0-9]+)*$/.test(name));
  assert.deepEqual(bad, [], `Malformed token names: ${bad.join(", ")}`);
});

test("tokens: colour values are valid hex", () => {
  const bad = Object.entries(tokens)
    .filter(([, value]) => value.startsWith("#"))
    .filter(([, value]) => !/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(value))
    .map(([name]) => name);
  assert.deepEqual(bad, [], `Invalid hex values: ${bad.join(", ")}`);
});

test("tokens: no duplicate keys", () => {
  const names = tokensSource.match(/"--ds-[a-z0-9-]+":/g) || [];
  assert.equal(names.length, new Set(names).size, "Duplicate token declarations in design-tokens.ts");
});

test("css: every token is mirrored in a :root block with the same value", () => {
  const problems = [];
  for (const [name, value] of Object.entries(tokens)) {
    const cssValue = cssVars[name];
    if (cssValue === undefined) problems.push(`${name} is missing from globals.css`);
    else if (cssValue !== value) problems.push(`${name}: tokens say "${value}", CSS says "${cssValue}"`);
  }
  assert.deepEqual(problems, [], `Token/CSS drift:\n  ${problems.join("\n  ")}`);
});

test("css: no token is defined in CSS that the token module does not declare", () => {
  const extra = Object.keys(cssVars).filter((name) => !(name in tokens));
  assert.deepEqual(extra, [], `CSS declares unknown token(s): ${extra.join(", ")}`);
});

test("css: every var(--ds-*) reference resolves to a defined token", () => {
  const used = new Set(css.match(/var\((--ds-[a-z0-9-]+)/g)?.map((entry) => entry.slice(4)) ?? []);
  const missing = [...used].filter((name) => !(name in tokens));
  assert.deepEqual(missing, [], `globals.css references undefined token(s): ${missing.join(", ")}`);
});

test("css: the shared touch target meets the 44px minimum", () => {
  assert.equal(tokens["--ds-touch-min"], "44px");
  assert.match(css, /\.ds-btn\s*\{[^}]*min-height:\s*var\(--ds-touch-min\)/, ".ds-btn must use the touch-target token");
});

test("primitives: the documented component set exists", () => {
  const expected = ["Button.tsx", "Card.tsx", "Badge.tsx", "Field.tsx", "EmptyState.tsx", "index.ts"];
  const missing = expected.filter((name) => !fs.existsSync(path.join(uiDir, name)));
  assert.deepEqual(missing, [], `Missing primitive file(s): ${missing.join(", ")}`);
});

test("primitives: no hardcoded hex colours", () => {
  const offenders = [];
  for (const file of uiFiles) {
    const source = readUi(file);
    const hexes = source.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [];
    if (hexes.length > 0) offenders.push(`${file}: ${[...new Set(hexes)].join(", ")}`);
  }
  assert.deepEqual(offenders, [], `Use design tokens instead of raw colours:\n  ${offenders.join("\n  ")}`);
});

test("primitives: focus styling is never removed without a replacement", () => {
  const offenders = [];
  for (const file of uiFiles) {
    const source = readUi(file);
    if (/outline-none|outline:\s*none/.test(source) && !/focus-visible/.test(source)) {
      offenders.push(file);
    }
  }
  assert.deepEqual(offenders, [], `outline removal without focus-visible in: ${offenders.join(", ")}`);
});

test("primitives: Button defaults to type=\"button\"", () => {
  const source = readUi("Button.tsx");
  assert.match(source, /type=\{buttonProps\.type \?\? "button"\}/, "Button must never fall back to the implicit submit type");
  assert.match(source, /aria-busy=/, "Loading buttons must announce aria-busy");
});

test("primitives: Field wires label, description and error state", () => {
  const source = readUi("Field.tsx");
  assert.match(source, /htmlFor=\{controlId\}/, "The label must point at the control");
  assert.match(source, /aria-describedby/, "Field must expose hint/error ids to the control");
  assert.match(source, /invalid:\s*Boolean\(error\)/, "Field must expose the invalid state to the control");
});

test("primitives: the barrel re-exports every component", () => {
  const barrel = fs.readFileSync(path.join(uiDir, "index.ts"), "utf8");
  const components = uiFiles.map((file) => file.replace(/\.tsx$/, ""));
  const missing = components.filter((name) => !barrel.includes(`./${name}`));
  assert.deepEqual(missing, [], `index.ts is missing: ${missing.join(", ")}`);
});
