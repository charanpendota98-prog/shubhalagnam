import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";

// Dashboard referral strip: read-only summary from the existing wallet endpoint.
// Mocked API only; no member, wallet or payout is touched.
const base = JSON.parse(fs.readFileSync("scripts/fixtures/referral-payloads.json", "utf8"))[0].wallet;
const withMoney = { ...base, wallet: 150, min_payout: 200, totals: { ...base.totals, pending_payout: 50, paid_out: 400 } };

async function openMe(page: Page, lang: "en" | "te", wallet: { status?: number; json: unknown }) {
  let walletCalls = 0;
  await page.addInitScript((l) => {
    localStorage.setItem("tsap_lang", l); localStorage.setItem("tsap_id", "UI_ONLY"); sessionStorage.removeItem("tsap_token");
  }, lang);
  await page.route("**/api/**", (r) => {
    const u = new URL(r.request().url());
    if (u.pathname === "/api/auth/verify") return r.fulfill({ json: { valid: true, tsap_id: "UI_ONLY" } });
    if (u.pathname === "/api/referral/UI_ONLY/wallet") { walletCalls++; return r.fulfill({ status: wallet.status || 200, json: wallet.json as object }); }
    return r.fulfill({ json: { success: true } });
  });
  await page.goto("/me");
  return () => walletCalls;
}

for (const lang of ["en", "te"] as const) {
  test(`dashboard strip shows recorded amounts, no share button ${lang}`, async ({ page }) => {
    await openMe(page, lang, { json: withMoney });
    const strip = page.getByTestId("referral-highlight");
    await expect(strip).toBeVisible();
    await expect(strip).toContainText("₹150");
    await expect(strip).toContainText("₹400");
    await expect(strip).toContainText("₹200");
    await expect(strip.getByRole("link")).toHaveAttribute("href", "/referral");
    await expect(strip.getByRole("button")).toHaveCount(0);
    await expect(strip).not.toContainText(/earn|guarantee|instant|సంపాదించండి/i);
  });
}

test("390px mobile: strip fits without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openMe(page, "te", { json: withMoney });
  const strip = page.getByTestId("referral-highlight");
  await expect(strip).toBeVisible();
  const fits = await strip.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return r.left >= 0 && r.right <= innerWidth + 1 && document.documentElement.scrollWidth <= innerWidth + 1;
  });
  expect(fits).toBe(true);
  const link = await strip.getByRole("link").boundingBox();
  expect(link && link.height >= 40).toBe(true);
});

test("English branch does not use the Telugu typeface; labels match /referral", async ({ page }) => {
  await openMe(page, "en", { json: withMoney });
  const strip = page.getByTestId("referral-highlight");
  await expect(strip).toContainText("Paid out ₹400");
  await expect(strip.locator(".telugu")).toHaveCount(0);
});

test("zero state is plain and makes no promise", async ({ page }) => {
  await openMe(page, "en", { json: { ...base, min_payout: 200 } });
  const strip = page.getByTestId("referral-highlight");
  await expect(strip).toContainText("No referral rewards yet");
  await expect(strip).toContainText("₹200");
});

test("a failed or malformed wallet read renders no strip", async ({ page }) => {
  await openMe(page, "en", { status: 500, json: { detail: "x" } });
  await page.waitForTimeout(1500);
  await expect(page.getByTestId("referral-highlight")).toHaveCount(0);
});

test("a malformed wallet payload renders no strip", async ({ page }) => {
  await openMe(page, "en", { json: { wallet: "lots" } });
  await page.waitForTimeout(1500);
  await expect(page.getByTestId("referral-highlight")).toHaveCount(0);
});
