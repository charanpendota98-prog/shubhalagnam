import { test, expect, type Page } from "@playwright/test";

// UI-only response fixtures. These numbers are not real earnings/payment evidence.
async function setup(page: Page, firstStatus = 200) {
  let status = firstStatus;
  let wallet = 137;
  let calls = 0;
  await page.addInitScript(() => localStorage.setItem("tsap_lang", "en"));
  await page.route("**/api/referral/REFRESH01", async (route) => {
    calls += 1;
    await route.fulfill({ status, json: status === 200 ? {
      ok: true, code: "TESTCODE", link: "https://manavivaha.in/r/TESTCODE",
      stats: { wallet, pending_payout: 20, paid_out: 0, qualifying_rewards_total: 100, paid_count: 2, registrations: 3 },
      tier: { key: "BRONZE", icon: "" }, wallet_can_withdraw: true,
      commission_rules: { min_payout: 50 }, recent_registrations: [], ledger: [], payouts: [],
    } : { success: false, detail: "UI fixture unavailable" } });
  });
  await page.route("**/api/referral/REFRESH01/payouts", (route) => route.fulfill({ json: { success: true, payouts: [] } }));
  return { fail: (code: number) => { status = code; }, recover: () => { status = 200; wallet = 150; }, calls: () => calls };
}

test("refresh failure is visibly stale, recovery works and expired auth clears private details", async ({ page }) => {
  const state = await setup(page);
  await page.goto("/referral?id=REFRESH01");
  await expect(page.getByText("₹137", { exact: true })).toBeVisible();
  const timestamp = (await page.getByText(/Last updated:/).innerText()).split("\n")[0];
  await page.getByRole("button", { name: /Request payout/ }).click();
  await expect(page.getByRole("button", { name: "Submit Request", exact: true })).toBeEnabled();
  state.fail(503);
  await page.getByRole("button", { name: "Refresh now", exact: true }).click();
  await expect(page.getByText("Displayed details may be out of date.", { exact: true })).toBeVisible();
  expect((await page.getByText(/Last updated:/).innerText()).split("\n")[0]).toBe(timestamp);
  await expect(page.getByRole("button", { name: /Request payout/ })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Submit Request", exact: true })).toBeDisabled();
  state.recover();
  await page.getByRole("button", { name: "Refresh now", exact: true }).click();
  await expect(page.getByText("₹150", { exact: true })).toBeVisible();
  await expect(page.getByText("Displayed details may be out of date.", { exact: true })).toHaveCount(0);
  state.fail(401);
  await page.getByRole("button", { name: "Refresh now", exact: true }).click();
  await expect(page.getByText(/Please sign in again to see your private details/)).toBeVisible();
  await expect(page.getByText("₹150", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Retry", exact: true })).toBeVisible();
});

test("initial load failure offers a working retry", async ({ page }) => {
  const state = await setup(page, 503);
  await page.goto("/referral?id=REFRESH01");
  const retry = page.getByRole("button", { name: "Retry", exact: true });
  await expect(retry).toBeEnabled();
  await expect(page.getByText(/Your details did not load/)).toBeVisible();
  state.recover();
  await retry.click();
  await expect(page.getByText("₹150", { exact: true })).toBeVisible();
});

test("only visible tabs refresh each minute, and returning to a visible tab refreshes old data", async ({ page }) => {
  await page.clock.install();
  const state = await setup(page);
  await page.goto("/referral?id=REFRESH01");
  await expect(page.getByText("₹137", { exact: true })).toBeVisible();
  const initial = state.calls();
  await page.clock.fastForward(60_001);
  await expect.poll(state.calls).toBeGreaterThan(initial);
  await expect(page.getByRole("button", { name: "Refresh now", exact: true })).toBeEnabled();
  await page.evaluate(() => Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" }));
  const hidden = state.calls();
  await page.clock.fastForward(60_001);
  expect(state.calls()).toBe(hidden);
  state.recover();
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "visible" });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.getByText("₹150", { exact: true })).toBeVisible();
});
