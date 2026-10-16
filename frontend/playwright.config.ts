import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration — responsive and accessibility QA.
 *
 * Running it requires a browser binary:
 *
 *   npx playwright install chromium
 *   npm run test:visual     # 8 viewports × key routes: overflow + screenshots
 *   npm run test:axe        # axe (WCAG 2.0/2.1 A + AA) + keyboard focus ring
 *
 * `npm run test:visual` / `npm run test:axe` skip with a clear message when no
 * browser is installed, so a checkout without binaries still passes locally;
 * set REQUIRE_VISUAL_TESTS=1 to make a missing browser a hard failure in CI.
 *
 * These runs cover this environment's rendering only. They are not evidence of
 * real-device behaviour — see DESIGN-SYSTEM.md for the manual QA matrix.
 */

const PORT = Number(process.env.VISUAL_PORT || 3100);
const baseURL = process.env.VISUAL_BASE_URL || `http://127.0.0.1:${PORT}`;
const startServer = process.env.VISUAL_NO_SERVER !== "1";

export default defineConfig({
  testDir: "./tests",
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  outputDir: "./artifacts/playwright-out",
  use: {
    baseURL,
    trace: "off",
    video: "off",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  ...(startServer
    ? {
        webServer: {
          command: `npm run dev -- --port ${PORT}`,
          url: baseURL,
          reuseExistingServer: true,
          timeout: 180_000,
        },
      }
    : {}),
});
