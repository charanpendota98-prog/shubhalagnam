/**
 * Playwright runner wrapper.
 * ---------------------------------------------------------------
 * The specs in `tests/` need a Chromium binary (`npx playwright install
 * chromium`). Environments without network access to the Playwright CDN cannot
 * download one, so this wrapper detects the binary first:
 *
 *   • binary present  → run the requested specs, exit with Playwright's code.
 *   • binary missing  → skip loudly (exit 0) unless REQUIRE_VISUAL_TESTS=1,
 *                       which turns a missing browser into a hard failure so CI
 *                       can opt into strictness.
 *
 * A skip is reported as a skip, never as a pass — the message says the suite did
 * not run and why.
 */

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, "..");
const args = process.argv.slice(2);

async function browserAvailable() {
  try {
    const { chromium } = await import("@playwright/test");
    return fs.existsSync(chromium.executablePath());
  } catch {
    return false;
  }
}

const available = await browserAvailable();

if (!available) {
  const message = [
    "",
    "  ⚠️  Playwright browser not installed — responsive/axe suite SKIPPED.",
    "",
    "     This is not a pass: the checks below did not run.",
    "       • 8 viewports × 6 routes — horizontal overflow + screenshots",
    "       • 44px touch-target check on design-system controls",
    "       • axe WCAG 2.0/2.1 A+AA scan and keyboard focus visibility",
    "",
    "     Install the binary and re-run:",
    "       npx playwright install chromium",
    "       npm run test:visual && npm run test:axe",
    "",
    "     CI can require it: REQUIRE_VISUAL_TESTS=1 npm run test:visual",
    "",
  ].join("\n");
  console.warn(message);
  process.exit(process.env.REQUIRE_VISUAL_TESTS === "1" ? 1 : 0);
}

const binary = path.join(frontendRoot, "node_modules", ".bin", "playwright");
const runner = fs.existsSync(binary) ? binary : "npx";
const argv = fs.existsSync(binary) ? ["test", ...args] : ["playwright", "test", ...args];

const result = spawnSync(runner, argv, { stdio: "inherit", cwd: frontendRoot, shell: false });
process.exit(typeof result.status === "number" ? result.status : 1);
