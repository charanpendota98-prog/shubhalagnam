// Missing-options slice 3 (stored height/income/states preferences now evaluated):
// (1) saving height range + minimum income preferences yields factual met rows on
//     a candidate inside both (EN desktop); (2) a candidate outside both shows
//     differs rows (TE mobile); (3) a candidate with neither fact listed shows no
//     height/income comparison rows (unknown stays unknown); (4) no state row
//     appears for a default (never explicitly selected) states preference.
// Run from frontend/ with e2e_server16.py on :8000 and `next start` on :3197.
import { chromium } from "playwright";
import fs from "node:fs";
const T = JSON.parse(fs.readFileSync("/tmp/e2e_tokens16.json"));
const O = "/downloads/mv-missing-options/real/";
const B = "http://127.0.0.1:3197";
const b = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox"] });
const log = (...a) => console.log(...a);
let failures = 0;
const expect = (cond, label, extra = "") => { log(cond ? "PASS" : "FAIL", label, extra); if (!cond) failures++; };

async function ctx(id, lang, w, h = 900) {
  const c = await b.newContext({ viewport: { width: w, height: h } });
  await c.addInitScript(([id, t, l]) => {
    if (id) { localStorage.setItem("tsap_id", id); sessionStorage.setItem("tsap_token", t); }
    localStorage.setItem("tsap_lang", l);
  }, [id, id ? T[id] : "", lang]);
  return c;
}
const bodyText = (p) => p.innerText("body");

async function savePrefs(p) {
  const status = await p.evaluate(async () => {
    const r = await fetch("/api/profile/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Tsap-Token": sessionStorage.getItem("tsap_token") },
      body: JSON.stringify({
        tsap_id: "MVE2E00001", age_min: 25, age_max: 40, marital_statuses: ["Any"],
        height_min: "5'0\"", height_max: "5'10\"", min_salary: "₹5 - 7 Lakhs / year", diet: "Any",
      }),
    });
    return r.status;
  });
  expect(status === 200, "preferences: height/income preferences saved", `status ${status}`);
}

// ---------- 1. Candidate inside both selections: met rows (EN desktop) ----------
{
  const c = await ctx("MVE2E00001", "en", 1280);
  const p = await c.newPage(); p.on("pageerror", e => log("PAGEERR", e.message.slice(0, 120)));
  await p.goto(B + "/matches", { waitUntil: "networkidle" }); await p.waitForTimeout(1500);
  await savePrefs(p);
  await p.goto(B + "/search/MVE2E00010", { waitUntil: "networkidle" }); await p.waitForTimeout(2500);
  const text = await bodyText(p);
  expect(text.includes("listed height matches the saved preference"), "profile EN: height met note");
  expect(text.includes("listed income matches the saved preference"), "profile EN: income met note");
  expect(!text.includes("listed state"), "profile EN: no state row for never-selected default states");
  const card = p.locator("text=listed height matches").first();
  await card.scrollIntoViewIfNeeded(); await p.waitForTimeout(400);
  await p.screenshot({ path: O + "en-1280-profile-height-income-met.png" });
  await c.close();
}

// ---------- 2. Candidate outside both: differs rows (TE mobile) ----------
{
  const c = await ctx("MVE2E00001", "te", 390, 844);
  const p = await c.newPage(); p.on("pageerror", e => log("PAGEERR", e.message.slice(0, 120)));
  await p.goto(B + "/matches", { waitUntil: "networkidle" }); await p.waitForTimeout(1500);
  await savePrefs(p);
  await p.goto(B + "/search/MVE2E00011", { waitUntil: "networkidle" }); await p.waitForTimeout(2500);
  const text = await bodyText(p);
  expect(text.includes("listed height differs from the saved preference"), "profile TE mobile: height differs note");
  expect(text.includes("listed income differs from the saved preference"), "profile TE mobile: income differs note");
  const card = p.locator("text=listed height differs").first();
  await card.scrollIntoViewIfNeeded(); await p.waitForTimeout(400);
  await p.screenshot({ path: O + "te-390-profile-height-income-differs.png" });
  await c.close();
}

// ---------- 3. Candidate with neither fact listed: no rows (unknown stays unknown) ----------
{
  const c = await ctx("MVE2E00001", "en", 1280);
  const p = await c.newPage();
  await p.goto(B + "/matches", { waitUntil: "networkidle" }); await p.waitForTimeout(1500);
  await savePrefs(p);
  await p.goto(B + "/search/MVE2E00012", { waitUntil: "networkidle" }); await p.waitForTimeout(2500);
  const text = await bodyText(p);
  expect(!text.includes("listed height") && !text.includes("listed income"), "profile unset: no height/income rows (unknown stays unknown)");
  await c.close();
}

await b.close();
log(failures ? `RESULT: ${failures} FAILED` : "RESULT: all PASS");
process.exit(failures ? 1 : 0);
