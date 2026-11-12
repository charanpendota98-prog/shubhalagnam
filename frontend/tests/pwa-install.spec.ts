import { test, expect, type Page } from "@playwright/test";

/**
 * PWA install bar placement.
 *
 * Regression: on a 390px phone the auto-show install banner overlapped the
 * phone/password fields on /login until dismissed. The banner now stays off
 * the auth screens entirely, while the install path keeps working elsewhere.
 *
 * NOTE: run against a production standalone server (VISUAL_BASE_URL=...);
 * in `next dev` the PWA client component does not reliably mount, which
 * suppresses the banner everywhere and makes the positive cases fail.
 */

const MOBILE = { width: 390, height: 844 };
const AUTO_SHOW_WAIT_MS = 7_000; // PWA.tsx auto-shows ~6s after beforeinstallprompt

async function dispatchAutoInstallPromptOnce(page: Page) {
  await page.evaluate(() => {
    window.dispatchEvent(new Event("beforeinstallprompt"));
  });
  await page.waitForTimeout(AUTO_SHOW_WAIT_MS);
}

async function dispatchAutoInstallPrompt(page: Page) {
  // Dev-mode hydration can outlast a fixed wait: keep re-arming the prompt
  // until the bar appears (6s after the last dispatch) or the budget ends.
  const deadline = Date.now() + 30_000;
  for (;;) {
    await page.evaluate(() => {
      window.dispatchEvent(new Event("beforeinstallprompt"));
    });
    const shown = await page
      .getByTestId("pwa-install-bar")
      .isVisible()
      .catch(() => false);
    if (shown) return;
    if (Date.now() > deadline) {
      await page.waitForTimeout(AUTO_SHOW_WAIT_MS);
      return;
    }
    await page.waitForTimeout(1_000);
  }
}

test.describe("PWA install bar placement", () => {
  test.use({ viewport: MOBILE });

  for (const route of ["/login", "/register", "/verify"]) {
    test(`${route} keeps the auth screen clear of the auto install bar`, async ({ page }) => {
      const response = await page.goto(route, { waitUntil: "networkidle" });
      expect(response, `${route} must respond`).not.toBeNull();
      await page.waitForTimeout(1200); // hydration: PWA listener must be attached before dispatch
      await dispatchAutoInstallPromptOnce(page);
      await expect(page.getByTestId("pwa-install-bar")).toHaveCount(0);
    });
  }

  test("home still auto-shows the install bar", async ({ page }) => {
    const response = await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(response, "home must respond").not.toBeNull();
    await page.waitForTimeout(600);
    await dispatchAutoInstallPrompt(page);
    await expect(page.getByTestId("pwa-install-bar")).toBeVisible();
  });

  test("a visible bar hides when navigating to login", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await page.waitForTimeout(1200);
    await dispatchAutoInstallPrompt(page);
    await expect(page.getByTestId("pwa-install-bar")).toBeVisible();
    // Client-side (SPA) navigation keeps the PWA component mounted, so this
    // exercises the hide-on-auth-route effect rather than a fresh page load.
    await page.getByRole("button", { name: /మెనూ|Menu/ }).click();
    await page.getByRole("link", { name: /లాగిన్|Log in|Login/ }).first().click();
    await page.waitForURL("**/login**");
    await expect(page.getByTestId("pwa-install-bar")).toHaveCount(0);
  });

  test("manual install event still opens the bar", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);
    await page.evaluate(() => {
      window.dispatchEvent(new Event("tsap:install-show"));
    });
    await expect(page.getByTestId("pwa-install-bar")).toBeVisible();
  });
});
