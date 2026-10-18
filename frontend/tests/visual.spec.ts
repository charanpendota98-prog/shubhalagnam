import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

/**
 * Responsive smoke checks.
 *
 * Each viewport answers three questions the blueprint calls out:
 *   1. Does the page overflow horizontally?
 *   2. Are design-system controls still at least 44px tall?
 *   3. Is the primary registration action reachable without scrolling?
 *
 * Screenshots land in artifacts/visual/ for human review — automation flags
 * regressions, it does not replace looking at the page.
 */

const VIEWPORTS = [
  { name: "320", width: 320, height: 720 },
  { name: "360", width: 360, height: 740 },
  { name: "390", width: 390, height: 844 },
  { name: "430", width: 430, height: 932 },
  { name: "768", width: 768, height: 1024 },
  { name: "1024", width: 1024, height: 768 },
  { name: "1280", width: 1280, height: 800 },
  { name: "1920", width: 1920, height: 1080 },
];

const ROUTES = ["/", "/pricing", "/safety", "/register", "/matches", "/login"];

const SHOT_DIR = path.resolve(process.cwd(), "artifacts", "visual");

function slug(route: string): string {
  return route === "/" ? "home" : route.replace(/^\//, "").replace(/\//g, "-");
}

async function settle(page: Page) {
  await page.waitForLoadState("load");
  // Client components fetch and paint after hydration; give them a beat.
  await page.waitForTimeout(600);
}

for (const viewport of VIEWPORTS) {
  test.describe(`${viewport.name}px`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    for (const route of ROUTES) {
      test(`${route} does not overflow horizontally`, async ({ page }) => {
        const response = await page.goto(route, { waitUntil: "domcontentloaded" });
        expect(response, `${route} must respond`).not.toBeNull();
        await settle(page);

        const box = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        }));
        expect(
          box.scrollWidth,
          `${route} overflows at ${viewport.name}px (scrollWidth ${box.scrollWidth} > clientWidth ${box.clientWidth})`,
        ).toBeLessThanOrEqual(box.clientWidth + 1);

        fs.mkdirSync(SHOT_DIR, { recursive: true });
        await page.screenshot({
          path: path.join(SHOT_DIR, `${slug(route)}-${viewport.name}.png`),
          fullPage: false,
        });
      });
    }

    test("design-system controls keep a 44px touch target", async ({ page }) => {
      await page.goto("/", { waitUntil: "domcontentloaded" });
      await settle(page);

      const small = await page.evaluate(() => {
        const offenders: string[] = [];
        const controls = document.querySelectorAll<HTMLElement>(".ds-btn");
        controls.forEach((control) => {
          const style = getComputedStyle(control);
          if (style.display === "none" || style.visibility === "hidden") return;
          const rect = control.getBoundingClientRect();
          if (rect.height === 0) return;
          if (rect.height < 43.5) {
            offenders.push(`${control.className} → ${Math.round(rect.height)}px`);
          }
        });
        return offenders;
      });

      expect(small, `Controls below 44px at ${viewport.name}px: ${small.join("; ")}`).toEqual([]);
    });
  });
}

test("the registration action is available without scrolling on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await settle(page);

  const register = page.locator('a[href="/register"]').first();
  await expect(register).toBeVisible();

  const box = await register.boundingBox();
  expect(box, "The register link must have a box").not.toBeNull();
  expect(
    box!.y,
    "A registration action must be within the first phone screen",
  ).toBeLessThan(740);
});
