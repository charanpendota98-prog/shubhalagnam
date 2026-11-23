import { test, expect, type Page } from "@playwright/test";

// Install bar "Later" is a cooldown (14 days), not a permanent dismissal.
// Run against a production server (VISUAL_BASE_URL), like pwa-install.spec.ts.
test.use({ viewport: { width: 390, height: 844 } });
const KEY = "tsap_pwa_dismissed_at";
const DAY = 24 * 60 * 60 * 1000;

async function open(page: Page, seed?: (k: string) => void, arg?: unknown) {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  if (seed) await page.evaluate(seed as never, arg as never);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
}
async function firePrompt(page: Page) {
  const deadline = Date.now() + 25_000;
  for (;;) {
    await page.evaluate(() => window.dispatchEvent(new Event("beforeinstallprompt")));
    if (await page.getByTestId("pwa-install-bar").isVisible().catch(() => false)) return true;
    if (Date.now() > deadline) return false;
    await page.waitForTimeout(1000);
  }
}
const bar = (page: Page) => page.getByTestId("pwa-install-bar");

test("Later stores an ISO timestamp and the bar stays away within the cooldown", async ({ page }) => {
  await open(page);
  expect(await firePrompt(page)).toBe(true);
  await page.getByRole("button", { name: /Later|తర్వాత/ }).click();
  await expect(bar(page)).toHaveCount(0);
  const stored = await page.evaluate((k) => localStorage.getItem(k), KEY);
  expect(Number.isFinite(Date.parse(stored || ""))).toBe(true);
  expect(await page.evaluate(() => localStorage.getItem("tsap_pwa_dismissed"))).toBeNull();
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  await page.evaluate(() => window.dispatchEvent(new Event("beforeinstallprompt")));
  await page.waitForTimeout(7500);
  await expect(bar(page)).toHaveCount(0);
});

test("the bar returns after the cooldown has passed", async ({ page }) => {
  await open(page, (k) => localStorage.setItem(k as string, new Date(Date.now() - 15 * 86400000).toISOString()), KEY);
  expect(await firePrompt(page)).toBe(true);
});

test("a dismissal 13 days ago still blocks the auto prompt", async ({ page }) => {
  await open(page, (k) => localStorage.setItem(k as string, new Date(Date.now() - 13 * 86400000).toISOString()), KEY);
  await page.evaluate(() => window.dispatchEvent(new Event("beforeinstallprompt")));
  await page.waitForTimeout(7500);
  await expect(bar(page)).toHaveCount(0);
});

test("the legacy permanent flag is migrated into a fresh cooldown", async ({ page }) => {
  await open(page, () => localStorage.setItem("tsap_pwa_dismissed", "1"));
  await page.evaluate(() => window.dispatchEvent(new Event("beforeinstallprompt")));
  await page.waitForTimeout(7500);
  await expect(bar(page)).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem("tsap_pwa_dismissed"))).toBeNull();
  const at = Date.parse((await page.evaluate((k) => localStorage.getItem(k), KEY)) || "");
  expect(Date.now() - at).toBeLessThan(DAY);
});

test("an explicit install control still opens the bar during the cooldown", async ({ page }) => {
  await open(page, (k) => localStorage.setItem(k as string, new Date().toISOString()), KEY);
  await page.evaluate(() => window.dispatchEvent(new Event("tsap:install-show")));
  await expect(bar(page)).toBeVisible();
});
