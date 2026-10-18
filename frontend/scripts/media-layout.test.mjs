import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const css = fs.readFileSync(path.join(ROOT, "src/app/globals.css"), "utf8");
const hero = fs.readFileSync(path.join(ROOT, "src/components/CinematicHero.tsx"), "utf8");
const story = fs.readFileSync(path.join(ROOT, "src/components/WeddingStoryHero.tsx"), "utf8");
const gallery = fs.readFileSync(path.join(ROOT, "src/components/CinematicGallery.tsx"), "utf8");

test("cinematic hero has a real poster, local media, and a playback failure path", () => {
  assert.match(hero, /poster=\"\/promo\/hero-bg-ultra\.jpg\"/);
  assert.match(hero, /wedding-film-mobile\.mp4/);
  assert.match(hero, /wedding-film\.mp4/);
  assert.match(hero, /onError=/);
  assert.match(hero, /filmFailed/);
  assert.match(hero, /hero-film-toggle/);
});

test("mobile hero media stays in one stable box and contains complete film content", () => {
  assert.match(css, /\.hero-poster,\s*\.hero-video\s*\{[\s\S]*?object-fit:\s*cover/);
  assert.match(css, /@media \(max-width: 640px\)\s*\{[\s\S]*?\.hero-poster,\s*\.hero-video\s*\{\s*object-position:\s*center center;\s*object-fit:\s*contain/);
  assert.match(css, /\.cinematic-hero\s*\{\s*min-height:\s*clamp\(/);
});

test("wedding story separates mobile copy from the 16:9 film", () => {
  assert.match(story, /poster=\"\/promo\/wedding-story-poster\.jpg\"/);
  assert.match(story, /wedding-story-film\.mp4/);
  assert.match(css, /\.wedding-story__film\s*\{[\s\S]*?object-fit:\s*cover/);
  assert.match(css, /@media \(max-width: 700px\)\s*\{[\s\S]*?\.wedding-story__copy\s*\{[\s\S]*?background:\s*rgba\(18,7,19/);
  assert.match(css, /@media \(max-width: 700px\)\s*\{[\s\S]*?\.wedding-story__scene\s*\{[\s\S]*?inset:\s*clamp\(/);
  assert.match(css, /@media \(max-width: 700px\)\s*\{[\s\S]*?\.wedding-story__film\s*\{[^}]*object-position: center center; object-fit: contain/);
});

test("gallery video preserves the source aspect ratio on small screens", () => {
  assert.match(gallery, /poster=\"\/promo\/wedding-story-poster\.jpg\"/);
  assert.match(gallery, /onError=/);
  assert.match(gallery, /object-contain/);
});
