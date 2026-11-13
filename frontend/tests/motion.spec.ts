import { test, expect, type Page } from "@playwright/test";

/**
 * Motion system gate.
 *
 * The redesign promises one coherent motion vocabulary across every route, and
 * a hard floor under it: motion must never hide content, never run on a core
 * thread property, and never ignore `prefers-reduced-motion`.
 *
 * Checked here:
 *  1. every route reports the same motion tokens (durations, easings, stagger);
 *  2. scroll-reveal elements become visible after scrolling — including the
 *     bottom of very long lists, where a naive threshold leaves content blank,
 *     and content that mounts only after the viewport has already scrolled
 *     past it (which an IntersectionObserver could never fire for);
 *  3. the ambience layer exists, sits behind content, and is inert
 *     (`pointer-events: none`, `aria-hidden`);
 *  4. reduced motion removes the ambience animation, keeps reveals visible and
 *     leaves `animation-name: none` on the intro band;
 *  5. the private consoles get no ambience at all.
 */

const ROUTES = ["/", "/pricing", "/safety", "/requests", "/vendors", "/stories", "/terms", "/matches"];

const VIEWPORTS = [
  { name: "320", width: 320, height: 720 },
  { name: "390", width: 390, height: 844 },
  { name: "1280", width: 1280, height: 900 },
];

async function settle(page: Page) {
  await page.waitForLoadState("load");
  await page.waitForTimeout(400);
}

/**
 * Scroll the whole document so every IntersectionObserver has fired.
 *
 * Stays at the bottom: content keeps streaming in (stories, vendors, rails) and
 * an element that mounts after the pass would otherwise never be observed. The
 * loop repeats until the document height stops growing.
 */
async function scrollThrough(page: Page) {
  await page.evaluate(async () => {
    let height = 0;
    for (let pass = 0; pass < 4; pass += 1) {
      for (let y = 0; y < document.body.scrollHeight; y += 400) {
        window.scrollTo(0, y);
        await new Promise((resolve) => setTimeout(resolve, 55));
      }
      await new Promise((resolve) => setTimeout(resolve, 300));
      if (document.body.scrollHeight === height) break;
      height = document.body.scrollHeight;
    }
    window.scrollTo(0, document.body.scrollHeight);
  });
  await page.waitForTimeout(1200);
}

test("one motion vocabulary: the same tokens resolve on every route", async ({ page }) => {
  const seen: Record<string, string>[] = [];
  for (const route of ROUTES) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await settle(page);
    seen.push(
      await page.evaluate(() => {
        const style = getComputedStyle(document.documentElement);
        return {
          fast: style.getPropertyValue("--ds-duration-fast").trim(),
          base: style.getPropertyValue("--ds-duration-base").trim(),
          slow: style.getPropertyValue("--ds-duration-slow").trim(),
          reveal: style.getPropertyValue("--ds-duration-reveal").trim(),
          ease: style.getPropertyValue("--ds-ease").trim(),
          stagger: style.getPropertyValue("--ds-stagger-step").trim(),
        };
      }),
    );
  }

  const first = seen[0];
  for (const [index, tokens] of seen.entries()) {
    expect(tokens, `${ROUTES[index]} drifts from the shared motion scale`).toEqual(first);
  }
  // Tokens must be real values, not empty declarations that silently fall back.
  // Chromium serialises time custom properties as seconds (".25s") —
  // accept either unit, but never an empty or keyword value.
  const duration = /^\d*\.?\d+(ms|s)$/;
  expect(first.base).toMatch(duration);
  expect(first.reveal).toMatch(duration);
  expect(first.stagger).toMatch(duration);
  expect(first.ease).toContain("cubic-bezier");
});

for (const viewport of VIEWPORTS) {
  test.describe(`${viewport.name}px`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test("scroll reveals always end visible, at every depth of the page", async ({ page }) => {
      for (const route of ROUTES) {
        await page.goto(route, { waitUntil: "domcontentloaded" });
        await settle(page);
        await scrollThrough(page);

        const stuck = await page.evaluate(() =>
          [...document.querySelectorAll<HTMLElement>(".reveal")]
            .filter((element) => Number(getComputedStyle(element).opacity) < 0.95)
            .map((element) => ({
              cls: element.className.slice(0, 48),
              top: Math.round(element.getBoundingClientRect().top),
            })),
        );
        expect(stuck, `${route} at ${viewport.name}px left ${stuck.length} sections invisible`).toEqual([]);
      }
    });

    test("the ambience layer is decorative, inert and behind the content", async ({ page }) => {
      await page.goto("/pricing", { waitUntil: "domcontentloaded" });
      await settle(page);

      const info = await page.evaluate(() => {
        const layer = document.querySelector<HTMLElement>(".mv-ambience");
        if (!layer) return null;
        const style = getComputedStyle(layer);
        const body = getComputedStyle(document.body);
        return {
          position: style.position,
          pointerEvents: style.pointerEvents,
          ariaHidden: layer.getAttribute("aria-hidden"),
          zIndex: Number(style.zIndex),
          bodyZ: Number(body.zIndex),
          progress: Boolean(layer.querySelector(".mv-ambience__progress")),
        };
      });

      expect(info, "the ambience layer should mount on public routes").not.toBeNull();
      expect(info!.position).toBe("fixed");
      expect(info!.pointerEvents).toBe("none");
      expect(info!.ariaHidden).toBe("true");
      expect(info!.zIndex).toBeLessThan(info!.bodyZ);
      expect(info!.progress).toBe(true);

      // Scrolling must only move a compositor property, never re-layout.
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
      await page.waitForTimeout(200);
      const scale = await page.evaluate(() => {
        const bar = document.querySelector<HTMLElement>(".mv-ambience__progress");
        return bar ? getComputedStyle(bar).transform : "none";
      });
      expect(scale).toMatch(/matrix/);
    });

    test("private consoles stay plain tools — no cinematic layer", async ({ page }) => {
      await page.goto("/control", { waitUntil: "domcontentloaded" });
      await settle(page);
      const layer = await page.evaluate(() => Boolean(document.querySelector(".mv-ambience")));
      expect(layer, "operator consoles must not mount the ambience layer").toBe(false);
    });
  });
}

test.describe("reduced motion", () => {
  test.use({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });

  test("reveals are visible immediately and the stage is frozen", async ({ page }) => {
    await page.goto("/pricing", { waitUntil: "domcontentloaded" });
    await settle(page);

    const report = await page.evaluate(() => {
      const reveals = [...document.querySelectorAll<HTMLElement>(".reveal")];
      const glow = document.querySelector<HTMLElement>(".mv-intro__glow");
      return {
        counted: reveals.length,
        hidden: reveals.filter((element) => Number(getComputedStyle(element).opacity) < 0.95).length,
        jsFlag: document.documentElement.classList.contains("mv-js"),
        glowAnimation: glow ? getComputedStyle(glow).animationName : "none",
        ambienceAnimation: (() => {
          const veil = document.querySelector<HTMLElement>(".mv-ambience__veil");
          return veil ? getComputedStyle(veil).animationName : "none";
        })(),
      };
    });

    expect(report.hidden, "reduced motion must never hide a section").toBe(0);
    expect(report.jsFlag, "the reveal script should not arm itself under reduced motion").toBe(false);
    expect(report.glowAnimation).toBe("none");
    expect(report.ambienceAnimation).toBe("none");
  });
});
