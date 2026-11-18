// Bounded full 5-step registration wizard click-through (release-confidence gap).
// Every step is driven through the real browser UI - gender buttons, text fields,
// native selects, SearchSelect comboboxes, file input, checkboxes, Next/Complete
// buttons. No XHR or API substitution for the browser flow; a read-only API
// fetch AFTER the success screen only verifies what the server stored.
// Run from frontend/ with e2e_server17.py on :8000 and `next start` on :3197.
import { chromium } from "playwright";
import fs from "node:fs";
const O = "/downloads/mv-missing-options/real/";
const B = "http://127.0.0.1:3197";
const b = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox"] });
const log = (...a) => console.log(...a);
let failures = 0;
const expect = (cond, label, extra = "") => { log(cond ? "PASS" : "FAIL", label, extra); if (!cond) failures++; };

const c = await b.newContext({ viewport: { width: 1280, height: 900 } });
await c.addInitScript(() => localStorage.setItem("tsap_lang", "en"));
const p = await c.newPage();
p.on("pageerror", (e) => log("PAGEERR", e.message.slice(0, 140)));

await p.goto(B + "/register", { waitUntil: "networkidle" });
await p.waitForTimeout(2000);
await p.getByRole("button", { name: /5-step full registration/ }).click();
await p.waitForTimeout(1200);

// ---------- Step 1: Basic Details ----------
await p.getByRole("button", { name: /🤵 Groom/ }).click();
await p.getByLabel(/Full Name|పూర్తి పేరు/).fill("Wizard Clickthrough Member");
await p.locator('input[type="date"]').first().fill("1994-04-20");
await p.locator('select[aria-label="Height"]').selectOption("5'10\"");
await p.locator('select[aria-label="Marital status"]').selectOption("Pelli Kaledu");
await p.locator("#full-religion").selectOption("Hindu");
await p.locator("#full-profile_for").selectOption("Self");
await p.locator("#full-diet").selectOption("Vegetarian");
await p.screenshot({ path: O + "en-1280-wizard-step1-filled.png" });
await p.getByRole("button", { name: "Next →" }).click();
await p.waitForTimeout(1200);
expect(await p.getByText("Caste & Astrology").first().isVisible().catch(() => false), "wizard: step 1 -> 2 advanced via Next");

// ---------- Step 2: Caste & Astrology ----------
await p.getByRole("button", { name: /^Community/ }).first().click();
await p.waitForTimeout(800);
await p.getByRole("button", { name: "Reddy", exact: true }).first().click();
await p.getByLabel(/Gothram|గోత్రం/).fill("Kashyapa");
await p.screenshot({ path: O + "en-1280-wizard-step2-filled.png" });
await p.getByRole("button", { name: "Next →" }).click();
await p.waitForTimeout(1200);
expect(await p.getByText("Career & Education").first().isVisible().catch(() => false), "wizard: step 2 -> 3 advanced via Next");

// ---------- Step 3: Career & Education ----------
await p.locator('select[aria-label="Work sector"]').selectOption("Software / IT / Tech");
await p.locator('select[aria-label="Education"]').selectOption("B.Tech / B.E.");
await p.getByLabel(/Occupation \/ job title|ఉద్యోగం \/ హోదా/).fill("Software Engineer");
await p.locator('select[aria-label="Income"]').selectOption("₹10 - 12 Lakhs / year");
await p.screenshot({ path: O + "en-1280-wizard-step3-filled.png" });
await p.getByRole("button", { name: "Next →" }).click();
await p.waitForTimeout(1200);
expect(await p.getByText("Location & Family").first().isVisible().catch(() => false), "wizard: step 3 -> 4 advanced via Next");

// ---------- Step 4: Location & Family ----------
await p.locator('select[aria-label="State"]').selectOption("TS");
await p.waitForTimeout(600);
await p.getByRole("button", { name: /^District/ }).first().click();
await p.waitForTimeout(800);
await p.getByRole("button", { name: /Hyderabad/ }).first().click();
await p.getByLabel(/Mobile number/).fill("9876500099");
await p.getByLabel(/Password/).fill("wizard-pass-17");
await p.screenshot({ path: O + "en-1280-wizard-step4-filled.png" });
await p.getByRole("button", { name: "Next →" }).click();
await p.waitForTimeout(1200);
expect(await p.getByText("Photo & Finish").first().isVisible().catch(() => false), "wizard: step 4 -> 5 advanced via Next");

// ---------- Step 5: Photo & Finish ----------
await p.locator('input[aria-label="Choose a photo from your gallery"]').setInputFiles("/tmp/e2e_reg_photo.png");
await p.waitForTimeout(4000); // client-side photo preparation
await p.getByText("I have permission to upload this photo").click();
await p.locator("#registration-consent").check();
await p.screenshot({ path: O + "en-1280-wizard-step5-filled.png" });
const completeBtn = p.getByRole("button", { name: /Complete registration/ });
expect(await completeBtn.isEnabled().catch(() => false), "wizard: complete button enabled after photo + consents");
await completeBtn.click();

// ---------- Completion ----------
await p.getByText("Registration Successful!").waitFor({ timeout: 30000 }).catch(() => {});
const successVisible = await p.getByText("Registration Successful!").isVisible().catch(() => false);
expect(successVisible, "wizard: browser submit reached Registration Successful screen");
const bodyText = await p.innerText("body");
const idMatch = bodyText.match(/Profile ID:\s*([A-Z0-9]+)/);
const newId = idMatch ? idMatch[1] : "";
expect(Boolean(newId), "wizard: server-issued profile id shown on success screen", newId);
await p.screenshot({ path: O + "en-1280-wizard-success.png", fullPage: false });

// ---------- Post-verification of what the server stored ----------
// The public profile route correctly refuses an unauthenticated fetch of an
// unreviewed profile (401), so verify through the new member's OWN session:
// password login with the credentials just created, then read own profile.
if (newId) {
  const stored = await p.evaluate(async ({ id, phone, password }) => {
    const lr = await fetch("/api/auth/login-password", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, password }),
    });
    if (!lr.ok) return { status: "login-" + lr.status };
    const ld = await lr.json();
    const r = await fetch("/api/profile/" + id, { headers: { "X-Tsap-Token": ld.auth_token } });
    if (!r.ok) return { status: r.status };
    const d = await r.json();
    const pr = d.profile || {};
    return { status: r.status, full_name: pr.full_name, gender: pr.gender, height: pr.height,
             salary: pr.salary, diet: pr.diet, profile_for: pr.profile_for, state: pr.state,
             district: pr.district, marital_status: pr.marital_status, caste: pr.caste };
  }, { id: newId, phone: "9876500099", password: "wizard-pass-17" });
  log("stored:", JSON.stringify(stored));
  expect(stored.status === 200, "wizard: new profile retrievable after registration");
  expect(stored.full_name === "Wizard Clickthrough Member", "wizard: full name stored");
  expect(stored.profile_for === "Self", "wizard: listed-by (profile_for) stored from step-1 control");
  expect(stored.diet === "Vegetarian", "wizard: diet stored from step-1 control");
  expect(stored.height === "5'10\"", "wizard: height stored");
  expect(stored.salary === "₹10 - 12 Lakhs / year", "wizard: salary range stored");
  expect(stored.state === "TS" && stored.district === "Hyderabad", "wizard: state + district stored");
}

log(failures ? `RESULT: ${failures} FAIL` : "RESULT: all PASS");
await b.close();
process.exit(failures ? 1 : 0);
