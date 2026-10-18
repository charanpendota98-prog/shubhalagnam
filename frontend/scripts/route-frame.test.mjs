import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const frame = fs.readFileSync(path.join(ROOT, "src/components/RouteFrame.tsx"), "utf8");
const layout = fs.readFileSync(path.join(ROOT, "src/app/layout.tsx"), "utf8");
const search = fs.readFileSync(path.join(ROOT, "src/app/search/page-client.tsx"), "utf8");
const css = fs.readFileSync(path.join(ROOT, "src/app/globals.css"), "utf8");

test("every route receives the shared route frame from the root layout", () => {
  assert.match(layout, /import RouteFrame from "@\/components\/RouteFrame"/);
  assert.match(layout, /<RouteFrame>\{children\}<\/RouteFrame>/);
  assert.match(frame, /usePathname\(\)/);
  assert.match(frame, /data-route=/);
});

test("core workspaces have explicit bilingual context metadata", () => {
  for (const key of ["/register", "/matches", "/requests", "/porutham", "/safety", "/vendors", "/pricing"]) {
    assert.match(frame, new RegExp(`"${key.replace("/", "\\/")}":`), `${key} needs route context`);
  }
  assert.match(frame, /No star-only score, invented chart, or marriage verdict/);
  assert.match(frame, /Star-only score, ఊహించిన chart లేదా వివాహ తీర్పు లేదు/);
});

test("route chrome is responsive and keeps the page content in its own layer", () => {
  assert.match(css, /\.route-frame\s*\{/);
  assert.match(css, /\.route-context__note\s*\{[\s\S]*?white-space:\s*nowrap/);
  assert.match(css, /@media \(max-width: 639px\)\s*\{[\s\S]*?\.route-context__note\s*\{\s*display:\s*none/);
  assert.match(css, /\.route-frame__content\s*\{/);
});

test("direct profile search uses shared form and action primitives", () => {
  assert.match(search, /import \{ Button, Card, CardBody, Field \} from "@\/components\/ui"/);
  assert.match(search, /<Field id="profile-search-id"/);
  assert.match(search, /<Button type="submit"/);
  assert.match(search, /Contact access requires the owner/);
});
