/**
 * Static coverage guards:
 *   1. no component is written and then forgotten (dead UI),
 *   2. no lib module is unreachable from the app or from a test,
 *   3. every API path the frontend calls really exists on the backend.
 *
 * These are cheap structural checks that run on every CI pass; the behavioural
 * suites (scripts/*.test.mjs, backend tests) cover what the code actually does.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SRC = path.join(ROOT, "src");
const BACKEND = path.join(ROOT, "..", "backend");

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", ".next", ".git"].includes(entry.name)) continue;
      out.push(...walk(full));
    } else if (entry.isFile()) {
      out.push(full);
    }
  }
  return out;
}

const SOURCE_FILES = walk(SRC).filter((file) => /\.(ts|tsx|mjs)$/.test(file));
const TEST_FILES = fs
  .readdirSync(path.join(ROOT, "scripts"))
  .filter((name) => name.endsWith(".test.mjs"))
  .map((name) => path.join(ROOT, "scripts", name));

const sourceText = new Map(SOURCE_FILES.map((file) => [file, fs.readFileSync(file, "utf8")]));
const testText = TEST_FILES.map((file) => fs.readFileSync(file, "utf8")).join("\n");
const backendSources = walk(BACKEND)
  .filter((file) => file.endsWith(".py"))
  .map((file) => fs.readFileSync(file, "utf8"))
  .join("\n");

const usageText = (except) =>
  [...sourceText].filter(([file]) => file !== except).map(([, text]) => text).join("\n");

test("every component is mounted or imported somewhere — no dead UI", () => {
  const components = SOURCE_FILES.filter((file) =>
    file.startsWith(path.join(SRC, "components")),
  );
  assert.ok(components.length > 40, `expected the component library, found ${components.length}`);
  const orphans = [];
  for (const file of components) {
    const name = path.basename(file).replace(/\.(tsx|ts)$/, "");
    const used = new RegExp(`\\b${name}\\b`).test(usageText(file));
    if (!used) orphans.push(path.relative(ROOT, file));
  }
  assert.deepEqual(orphans, [], `components nothing imports:\n${orphans.join("\n")}`);
});

test("every lib module is reachable from the app or from a test", () => {
  const modules = SOURCE_FILES.filter((file) => file.startsWith(path.join(SRC, "lib")));
  assert.ok(modules.length > 20, `expected the lib directory, found ${modules.length}`);
  const orphans = [];
  for (const file of modules) {
    const name = path.basename(file).replace(/\.(tsx|ts|mjs)$/, "");
    const inApp = new RegExp(`\\b${name}\\b`).test(usageText(file));
    const inTests = new RegExp(`\\b${name}\\b`).test(testText);
    if (!inApp && !inTests) orphans.push(path.relative(ROOT, file));
  }
  assert.deepEqual(orphans, [], `lib modules nothing references:\n${orphans.join("\n")}`);
});

test("every API path the frontend calls exists on the backend", () => {
  const routes = new Set();
  for (const match of backendSources.matchAll(
    /@app\.(?:get|post|put|patch|delete|head|options)\(\s*"([^"]+)"/g,
  )) {
    routes.add(match[1]);
  }
  for (const match of backendSources.matchAll(/APIRouter\(\)|include_router\([^)]*\)/g)) {
    // Router-mounted modules are already part of backendSources, nothing to do.
  }
  assert.ok(routes.size > 100, `expected the backend route table, found ${routes.size}`);

  const patterns = [...routes].map(
    (route) => new RegExp(`^${route.replace(/\{[^}]+\}/g, "[^/]+").replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`),
  );
  const matchesRoute = (apiPath) => patterns.some((pattern) => pattern.test(apiPath));

  const called = new Set();
  for (const text of sourceText.values()) {
    for (const match of text.matchAll(/["'`](\/api\/[A-Za-z0-9_\-/{}$.[\]]+)["'`]/g)) {
      const value = match[1];
      if (value.includes("${")) continue; // built at runtime from an id
      called.add(value.split("?")[0].replace(/\/$/, ""));
    }
  }
  assert.ok(called.size > 20, `expected frontend API calls, found ${called.size}`);

  const missing = [...called].filter((apiPath) => !matchesRoute(apiPath));
  assert.deepEqual(missing, [], `frontend calls endpoints the backend does not define:\n${missing.join("\n")}`);
});
