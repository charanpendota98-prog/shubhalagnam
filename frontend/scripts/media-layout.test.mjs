import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

/**
 * Media + layout gate for the homepage hero and the story section.
 *
 * The hero used to autoplay a local MP4 behind the search card. It is now a
 * CSS/SVG depth stage: this file asserts the *replacement* contract instead of
 * the old film contract — no video bytes in the hero, a pausable stage, and a
 * hero whose only heavy element is the CSS artwork.
 */

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const css = fs.readFileSync(path.join(ROOT, "src/app/globals.css"), "utf8");
const hero = fs.readFileSync(path.join(ROOT, "src/components/CinematicHero.tsx"), "utf8");
const story = fs.readFileSync(path.join(ROOT, "src/components/WeddingStorySection.tsx"), "utf8");
const home = fs.readFileSync(path.join(ROOT, "src/app/page.tsx"), "utf8");

test("the hero ships no video file or remote media", () => {
  assert.doesNotMatch(hero, /\.mp4/);
  assert.doesNotMatch(hero, /<video/);
  assert.doesNotMatch(hero, /next\/image/);
  assert.match(hero, /mv-hero__stage/);
  assert.match(hero, /aria-hidden="true"/);
});

test("hero motion is compositor-only and pausable", () => {
  // Only transform/opacity style animations are declared for the hero stage.
  assert.match(css, /@keyframes mvHalo\s*\{[\s\S]*?transform/);
  assert.match(css, /\.mv-hero\[data-inview="false"\][\s\S]*?animation-play-state:\s*paused/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*?\.mv-hero__halo/);
  // The IntersectionObserver that drives data-inview must exist in the component.
  assert.match(hero, /IntersectionObserver/);
  assert.match(hero, /data-inview=/);
});

test("hero artwork layers stay inside a clipped, non-hit-tested box", () => {
  assert.match(css, /\.mv-hero\s*\{[\s\S]*?overflow:\s*clip/);
  assert.match(css, /\.mv-hero__stage\s*\{[\s\S]*?pointer-events:\s*none/);
  assert.match(css, /\.mv-hero__stage\s*\{[\s\S]*?contain:\s*strict/);
});

test("homepage mounts the content-first story section instead of the photo film", () => {
  assert.match(home, /<WeddingStorySection \/>/);
  assert.doesNotMatch(home, /WeddingStoryHero/);
  assert.doesNotMatch(home, /CinematicGallery/);
  assert.match(story, /StepIcon/);
  assert.match(story, /IntersectionObserver/);
  // The old film section is gone from the DOM entirely.
  assert.doesNotMatch(story, /\.mp4/);
  assert.doesNotMatch(story, /<video/);
});

test("the stories route no longer mounts the AI-photo gallery", () => {
  const storiesPage = fs.readFileSync(path.join(ROOT, "src/app/stories/page.tsx"), "utf8");
  assert.doesNotMatch(storiesPage, /CinematicGallery/);
});

test("promo imagery is no longer referenced by any mounted page", () => {
  const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
  const offenders = walk(path.join(ROOT, "src"))
    .filter((file) => /\.(tsx|ts)$/.test(file))
    // The two legacy AI-photo components were deleted with this change; if any
    // file reintroduces the album, this gate fails.
    .filter((file) => /\/promo\/(hero-bg|wedding-film|wedding-story-film|cine-|story-\d)/.test(fs.readFileSync(file, "utf8")));
  assert.deepEqual(offenders, []);
});
