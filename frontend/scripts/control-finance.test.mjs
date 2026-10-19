import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const dashboard = fs.readFileSync(path.join(root, "src/components/control/Dashboard.tsx"), "utf8");
const payBox = fs.readFileSync(path.join(root, "src/components/PayBox.tsx"), "utf8");
const quickUnlock = fs.readFileSync(path.join(root, "src/components/QuickUnlockModal.tsx"), "utf8");
const blogPage = fs.readFileSync(path.join(root, "src/app/blog/[slug]/page.tsx"), "utf8");
const backendMain = fs.readFileSync(path.join(root, "..", "backend/main.py"), "utf8");


test("control directory CSV neutralizes spreadsheet formulas in member-entered values", () => {
  assert.match(dashboard, /const csvCell\s*=\s*\(value: unknown\)/);
  assert.match(dashboard, /\/\^\[=\+\\-@\]\//);
  assert.match(dashboard, /text\s*=\s*`'\$\{text\}`/);
  assert.match(dashboard, /csvCell\(p\.full_name\)/);
  assert.match(dashboard, /csvCell\(p\.phone\)/);
});

test("owner contact disclosure is explicit and wired to the audited directory request", () => {
  assert.match(dashboard, /dirContactsRevealed/);
  assert.match(dashboard, /qs\.set\("include_contact", "true"\)/);
  assert.match(dashboard, /Reveal contacts for approved outreach/);
  assert.match(dashboard, /phone_masked/);
});

test("payment QR images use the per-order capability token", () => {
  assert.match(payBox, /qr_token/);
  assert.match(quickUnlock, /qr_token/);
  assert.match(payBox, /token=\$\{encodeURIComponent/);
  assert.match(quickUnlock, /token=\$\{encodeURIComponent/);
});

test("manual control plan activation requires a payment proof or a complimentary reason", () => {
  assert.match(dashboard, /transaction or receipt reference \(required\)/);
  assert.match(dashboard, /grantPayMode !== "ADMIN_COMPLIMENTARY" && \(grantAmount <= 0 \|\| !grantUtr\.trim\(\)\)/);
  assert.match(dashboard, /grantPayMode === "ADMIN_COMPLIMENTARY" && grantNotes\.trim\(\)\.length < 8/);
});

test("the blog API and dynamic article route share one canonical checklist slug", () => {
  assert.match(backendMain, /telugu-pelli-sambandham-checklist/);
  assert.match(backendMain, /legacy_slugs/);
  assert.match(blogPage, /LEGACY_CHECKLIST_SLUG/);
  assert.ok(blogPage.includes("redirect(`/blog/${resolvedSlug}`)"));
});
