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
  assert.match(frame, /<aside className="route-context" aria-label=/);
});

test("every non-home route opens with the shared cinematic intro band", () => {
  // One motion vocabulary: the band is the same component everywhere.
  assert.match(frame, /import RouteIntro from "@\/components\/RouteIntro"/);
  assert.match(frame, /<RouteIntro/);
  // Every route declares intro copy in BOTH languages, or opts out explicitly.
  // A route may never inherit an English-only or missing opening.
  const headlineCount = (frame.match(/headline: /g) || []).length;
  assert.equal((frame.match(/headlineTe: /g) || []).length, headlineCount);
  assert.equal((frame.match(/lead: /g) || []).length, headlineCount);
  assert.equal((frame.match(/leadTe: /g) || []).length, headlineCount);
  assert.match(frame, /intro\?: "hero" \| "compact" \| "none"/);
  assert.match(css, /\.mv-intro\s*\{/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*?\.mv-intro__glow[\s\S]*?animation: none/);
});

test("a route never gets two <h1>s: the band stands down where the page has its own hero", () => {
  // Pages that already render their own maroon hero + h1 are marked `intro:
  // "none"`; the band is only a hero for pages that have no hero of their own.
  const none = (frame.match(/intro: "none"/g) || []).length;
  assert.ok(none >= 12, `expected the owning pages to opt out, got ${none}`);
  // The member workspaces moved onto the shared band with Group 2, so they
  // must now supply their opening from RouteFrame, not a local <h1>.
  for (const banded of ["/me", "/matches", "/requests", "/shortlist", "/saved-searches"]) {
    const index = frame.indexOf(`"${banded}":`);
    assert.ok(index > 0, `${banded} missing`);
    const entry = frame.slice(index, frame.indexOf("},", index));
    assert.doesNotMatch(entry, /intro: "none"/, `${banded} now takes its <h1> from the shared band`);
    assert.match(entry, /headlineTe: /, `${banded} needs Telugu headline copy`);
  }
  for (const owned of ["/register", "/search", "/vendors", "/safety", "/porutham"]) {
    const index = frame.indexOf(`"${owned}": {`);
    assert.ok(index > 0, `${owned} missing`);
    const entry = frame.slice(index, frame.indexOf("},", index));
    assert.match(entry, /intro: "none"/, `${owned} already renders its own h1 and hero`);
  }
});

test("direct profile search uses shared form and action primitives", () => {
  assert.match(search, /import \{ Button, Card, CardBody, Field \} from "@\/components\/ui"/);
  assert.match(search, /<Field id="profile-search-id"/);
  assert.match(search, /<Button type="submit"/);
  assert.match(search, /Contact access requires the owner/);
});
