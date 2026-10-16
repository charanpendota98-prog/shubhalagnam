import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Accessibility checks that need a real browser.
 *
 * Static checks (missing alt, button type, tab order hazards) live in
 * scripts/a11y-static.test.mjs and run without a browser. This file covers what
 * only a rendered page can answer: axe's WCAG 2.0/2.1 A + AA rule set and
 * whether keyboard focus is actually visible.
 *
 * Only `serious` and `critical` violations fail the run; moderate/minor
 * findings are printed so they can be triaged without blocking the gate.
 */

const ROUTES = ["/", "/pricing", "/safety", "/register", "/login"];

for (const route of ROUTES) {
  test(`${route} has no serious or critical axe violations`, async ({ page }) => {
    await page.goto(route, { waitUntil: "load" });
    await page.waitForTimeout(600);

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();

    const blocking = results.violations.filter(
      (violation) => violation.impact === "serious" || violation.impact === "critical",
    );
    const summary = blocking.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      nodes: violation.nodes.length,
      help: violation.help,
    }));
    expect(summary, `axe violations on ${route}: ${JSON.stringify(summary, null, 2)}`).toEqual([]);

    const advisory = results.violations.filter(
      (violation) => violation.impact !== "serious" && violation.impact !== "critical",
    );
    if (advisory.length > 0) {
      console.log(
        `advisory (${route}): ${advisory
          .map((violation) => `${violation.id}[${violation.impact ?? "unknown"}]`)
          .join(", ")}`,
      );
    }
  });
}

test("keyboard focus is visible on the homepage", async ({ page }) => {
  await page.goto("/", { waitUntil: "load" });
  await page.waitForTimeout(400);

  let checked = 0;
  for (let step = 0; step < 12; step += 1) {
    await page.keyboard.press("Tab");
    const state = await page.evaluate(() => {
      const active = document.activeElement as HTMLElement | null;
      if (!active || active === document.body) return null;
      const style = getComputedStyle(active);
      const rect = active.getBoundingClientRect();
      return {
        tag: active.tagName,
        outlineWidth: parseFloat(style.outlineWidth) || 0,
        outlineStyle: style.outlineStyle,
        boxShadow: style.boxShadow,
        width: rect.width,
        height: rect.height,
      };
    });
    if (!state || state.width === 0 || state.height === 0) continue;
    checked += 1;
    const hasOutline = state.outlineWidth > 0 && state.outlineStyle !== "none";
    const hasRing = state.boxShadow !== "none";
    expect(
      hasOutline || hasRing,
      `Focused <${state.tag}> has no visible focus indicator (outline ${state.outlineWidth}px/${state.outlineStyle}, shadow ${state.boxShadow})`,
    ).toBeTruthy();
  }

  expect(checked, "Expected to inspect at least a few focusable elements").toBeGreaterThan(2);
});
