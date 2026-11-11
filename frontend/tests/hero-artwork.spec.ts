import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { decodePng, contrastRatio, parseCssColor, blend } from "./helpers/png";

/**
 * Decorative artwork must never touch copy.
 *
 * The home hero previously floated a full-width gold arch inside the stage.
 * Because the copy column moves with the layout while the arc was pinned to the
 * stage box, the curve swept through the Telugu headline and the subtitle at
 * every width — it read as a diagonal strike-through.
 *
 * This suite encodes the rule that was broken, and it checks *the whole loop*,
 * not frame 0: every hero animation is paused and scrubbed across its duration,
 * then three things are asserted per frame —
 *
 *   1. no decorative stroke comes within 2px of any text box (every stroked
 *      SVG path/line/polyline is sampled at 2px intervals in screen space, so
 *      transform, sway and parallax are all included);
 *   2. every text run that sits on the animated stage keeps ≥ 4.5:1 contrast —
 *      measured against the real pixels, with the copy hidden;
 *   3. the reduced-motion static frame obeys both rules too.
 *
 * Decorative layers living in their own reserved band (`.mv-hero__basan`) pass
 * by construction; an overlay arc cannot.
 */

const VIEWPORTS = [
  { name: "390", width: 390, height: 844 },
  { name: "1440", width: 1440, height: 900 },
] as const;

const LANGS = ["te", "en"] as const;

/** Frames scrubbed per viewport: 0, 1/5 … 4/5 of the longest hero animation. */
const FRAME_STOPS = 6;
const SCRUB_WINDOW_MS = 19_500;
const MIN_CLEARANCE_PX = 2;
const MIN_CONTRAST = 4.5;

async function openHome(page: Page, lang: string) {
  await page.addInitScript((value) => {
    try {
      window.localStorage.setItem("tsap_lang", value);
    } catch {
      /* private mode — the default language is fine */
    }
  }, lang);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".mv-hero__title");
  await page.waitForTimeout(500);
}

/** Freezes every hero animation at `time` and returns the geometry we check. */
async function freezeAndMeasure(page: Page, time: number) {
  return page.evaluate(
    ({ t, clearance }) => {
      for (const animation of document.getAnimations()) {
        const name = (animation as CSSAnimation).animationName ?? "";
        if (!name.startsWith("mv")) continue;
        try {
          animation.pause();
          animation.currentTime = t;
        } catch {
          /* finished/removed animations are not scrubbable — nothing to check */
        }
      }

      const hero = document.querySelector<HTMLElement>(".mv-hero");
      if (!hero) throw new Error("no .mv-hero");
      const heroRect = hero.getBoundingClientRect();

      // --- copy boxes: real glyph rects, not element boxes -----------------
      const textRects: { x: number; y: number; w: number; h: number; color: string; sample: string }[] = [];
      const walker = document.createTreeWalker(hero, NodeFilter.SHOW_TEXT);
      let node: Text | null;
      while ((node = walker.nextNode() as Text | null)) {
        const value = node.textContent?.trim();
        if (!value) continue;
        const element = node.parentElement;
        if (!element || element.closest('[aria-hidden="true"]')) continue;
        const style = getComputedStyle(element);
        if (style.visibility === "hidden" || style.display === "none") continue;

        // Skip copy that sits on its own opaque/gradient surface (the search
        // card, gold CTAs, the kicker pill): those pixels are not stage pixels.
        let backed = false;
        for (let ancestor: HTMLElement | null = element; ancestor && ancestor !== hero; ancestor = ancestor.parentElement) {
          const s = getComputedStyle(ancestor);
          const numbers = s.backgroundColor.match(/[\d.]+/g);
          const alpha = numbers && numbers.length > 3 ? Number(numbers[3]) : 1;
          if ((numbers && alpha > 0.85) || s.backgroundImage !== "none") {
            backed = true;
            break;
          }
        }
        if (backed) continue;

        let color = style.color;
        if (/rgba\(0, 0, 0, 0\)|transparent/.test(color)) {
          // gradient-clipped gold headline: report the gold stop
          color = "rgb(246, 217, 138)";
        }

        const range = document.createRange();
        range.selectNodeContents(node);
        for (const rect of range.getClientRects()) {
          if (rect.width <= 2 || rect.height <= 2) continue;
          textRects.push({ x: rect.x, y: rect.y, w: rect.width, h: rect.height, color, sample: value.slice(0, 32) });
        }
      }

      // --- decorative strokes: sampled in screen space ----------------------
      const strokes: number[][] = [];
      for (const element of hero.querySelectorAll<SVGGeometryElement>(".mv-hero__stage path, .mv-hero__stage line, .mv-hero__stage polyline, .mv-hero__stage polygon, .mv-hero__basan path, .mv-hero__basan line, .mv-hero__basan polyline, .mv-hero__basan polygon")) {
        const stroke = element.getAttribute("stroke");
        const hasStroke = Boolean(stroke && stroke !== "none");
        const lineLike = ["path", "line", "polyline", "polygon"].includes(element.tagName.toLowerCase());
        if (!hasStroke || !lineLike) continue;
        const matrix = element.getScreenCTM();
        if (!matrix) continue;

        const length = typeof element.getTotalLength === "function" ? element.getTotalLength() : 0;
        if (!length) continue;
        let previous: DOMPoint | null = null;
        for (let d = 0; d <= length; d += 2) {
          const point = element.getPointAtLength(d).matrixTransform(matrix);
          if (previous) strokes.push([previous.x, previous.y, point.x, point.y]);
          previous = point;
        }
      }

      // --- crossings --------------------------------------------------------
      const crossings: { at: [number, number]; text: string }[] = [];
      for (const [x1, y1, x2, y2] of strokes) {
        const steps = Math.max(2, Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 2));
        for (let s = 0; s <= steps; s += 1) {
          const px = x1 + ((x2 - x1) * s) / steps;
          const py = y1 + ((y2 - y1) * s) / steps;
          for (const rect of textRects) {
            if (
              px >= rect.x - clearance &&
              px <= rect.x + rect.w + clearance &&
              py >= rect.y - clearance &&
              py <= rect.y + rect.h + clearance
            ) {
              crossings.push({ at: [Math.round(px), Math.round(py)], text: rect.sample });
              break;
            }
          }
        }
      }

      // Lowest point of copy vs top of the ornament band: the separation that
      // makes an overlay impossible rather than merely unlikely.
      const band = hero.querySelector<HTMLElement>(".mv-hero__basan");
      const bandRect = band?.getBoundingClientRect();
      const textBottom = textRects.length ? Math.max(...textRects.map((r) => r.y + r.h)) : 0;

      return {
        hero: { x: heroRect.x, y: heroRect.y, w: heroRect.width, h: heroRect.height },
        textRects: textRects.map(({ x, y, w, h, color, sample }) => ({
          x: Math.round(x),
          y: Math.round(y),
          w: Math.round(w),
          h: Math.round(h),
          color,
          sample,
        })),
        strokeSegments: strokes.length,
        crossings,
        bandTop: bandRect ? Math.round(bandRect.y) : null,
        textBottom: Math.round(textBottom),
        separation: bandRect ? Math.round(bandRect.y - textBottom) : null,
      };
    },
    { t: time, clearance: MIN_CLEARANCE_PX },
  );
}

/** Screenshot the stage with the copy hidden, then measure every text box. */
async function measureContrast(
  page: Page,
  textRects: { x: number; y: number; w: number; h: number; color: string; sample: string }[],
  label: string,
) {
  const inner = page.locator(".mv-hero__inner");
  const previous = await inner.evaluate((element) => {
    const style = element.getAttribute("style") ?? "";
    element.style.visibility = "hidden";
    return style;
  });

  const file = path.join(os.tmpdir(), `mv-stage-${label.replace(/[^\w-]+/g, "_")}.png`);
  await page.screenshot({ path: file, animations: "disabled" });
  const bitmap = decodePng(fs.readFileSync(file));
  fs.rmSync(file, { force: true });

  await inner.evaluate((element, style) => element.setAttribute("style", style), previous);

  const results: { ratio: number; sample: string; box: number[] }[] = [];
  for (const rect of textRects) {
    const x0 = Math.max(0, rect.x);
    const y0 = Math.max(0, rect.y);
    const x1 = Math.min(bitmap.width, rect.x + rect.w);
    const y1 = Math.min(bitmap.height, rect.y + rect.h);
    if (x1 <= x0 || y1 <= y0) continue;

    const stepX = Math.max(1, Math.floor((x1 - x0) / 12));
    const stepY = Math.max(1, Math.floor((y1 - y0) / 4));
    const foreground = parseCssColor(rect.color);
    let worst = Infinity;

    for (let y = y0; y < y1; y += stepY) {
      for (let x = x0; x < x1; x += stepX) {
        const index = (y * bitmap.width + x) * 4;
        const background: [number, number, number] = [bitmap.data[index], bitmap.data[index + 1], bitmap.data[index + 2]];
        const ratio = contrastRatio(blend(foreground, background), background);
        if (ratio < worst) worst = ratio;
      }
    }

    results.push({ ratio: Number(worst.toFixed(2)), sample: rect.sample, box: [rect.x, rect.y, rect.w, rect.h] });
  }

  return results;
}

for (const viewport of VIEWPORTS) {
  for (const lang of LANGS) {
    test.describe(`${viewport.name}px · ${lang}`, () => {
      test.use({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 1 });

      test("decorative artwork never crosses the copy, at any frame", async ({ page }) => {
        await openHome(page, lang);
        const failures: string[] = [];

        for (let stop = 0; stop < FRAME_STOPS; stop += 1) {
          const time = Math.round((SCRUB_WINDOW_MS / FRAME_STOPS) * stop);
          const frame = await freezeAndMeasure(page, time);

          if (frame.crossings.length) {
            failures.push(
              `frame@${time}ms: ${frame.crossings.length} stroke hits, e.g. ${JSON.stringify(frame.crossings.slice(0, 3))}`,
            );
          }

          // The ornament band is below the copy by construction: assert the gap
          // instead of trusting a screenshot.
          expect(
            frame.separation,
            `frame@${time}ms: the ornament band must sit below all copy (band top ${frame.bandTop}px, copy bottom ${frame.textBottom}px)`,
          ).toBeGreaterThan(8);

          const contrast = await measureContrast(page, frame.textRects, `${viewport.name}-${lang}-${time}`);
          const low = contrast.filter((entry) => entry.ratio < MIN_CONTRAST);
          if (low.length) {
            failures.push(`frame@${time}ms: contrast below ${MIN_CONTRAST}:1 → ${JSON.stringify(low)}`);
          }
        }

        expect(failures, failures.join("\n")).toEqual([]);
      });

      test("the reduced-motion static frame is equally clear of copy", async ({ page }) => {
        await page.emulateMedia({ reducedMotion: "reduce" });
        await openHome(page, lang);

        const running = await page.evaluate(
          () =>
            document
              .getAnimations()
              .filter((animation) => ((animation as CSSAnimation).animationName ?? "").startsWith("mv")).length,
        );
        expect(running, "reduced motion must freeze every hero animation").toBe(0);

        const frame = await freezeAndMeasure(page, 0);
        expect(frame.crossings, "the static frame still crosses copy").toEqual([]);
        expect(frame.separation, "the static frame must keep the ornament band below the copy").toBeGreaterThan(8);

        const contrast = await measureContrast(page, frame.textRects, `${viewport.name}-${lang}-reduced`);
        expect(
          contrast.filter((entry) => entry.ratio < MIN_CONTRAST),
          `reduced-motion contrast below ${MIN_CONTRAST}:1`,
        ).toEqual([]);
      });
    });
  }
}
