// Missing-options slice 1 (profile_for + diet repair): real-browser acceptance.
// (1) /me edit exposes both optional controls with explicit public-visibility hints and
//     saves them (owner roundtrip), EN desktop + TE mobile; (2) the public profile shows
//     the self-declared rows only when set, EN + TE; (3) a saved diet preference produces
//     a factual check on the candidate profile view; (4) printed biodata carries the rows
//     only when set; (5) full registration step 1 renders both optional controls.
// Run from frontend/ with e2e_server14.py on :8000 and `next start` on :3197.
import { chromium } from "playwright";
import fs from "node:fs";
const T = JSON.parse(fs.readFileSync("/tmp/e2e_tokens.json"));
const O = "/downloads/mv-missing-options/real/";
const B = "http://127.0.0.1:3197";
const b = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox"] });
const log = (...a) => console.log(...a);
let failures = 0;
const expect = (cond, label, extra = "") => { log(cond ? "PASS" : "FAIL", label, extra); if (!cond) failures++; };

async function ctx(id, lang, w, h = 900, recordPrint = false) {
  const c = await b.newContext({ viewport: { width: w, height: h } });
  await c.addInitScript(([id, t, l, rp]) => {
    if (rp) { window.__prints = 0; window.print = () => { window.__prints++; }; }
    if (id) { localStorage.setItem("tsap_id", id); sessionStorage.setItem("tsap_token", t); }
    localStorage.setItem("tsap_lang", l);
  }, [id, id ? T[id] : "", lang, recordPrint]);
  return c;
}
const bodyText = (p) => p.innerText("body");

// ---------- 1. /me edit: controls, hints, save roundtrip (EN desktop) ----------
{
  const c = await ctx("MVE2E00007", "en", 1280);
  const p = await c.newPage(); p.on("pageerror", e => log("PAGEERR", e.message.slice(0, 120)));
  await p.goto(B + "/me", { waitUntil: "networkidle" }); await p.waitForTimeout(2000);
  await p.getByRole("button", { name: /Edit Profile/ }).first().click(); await p.waitForTimeout(2500);
  expect(await p.locator("#me-diet").count() === 1, "edit: diet control present");
  expect(await p.locator("#me-profile_for").count() === 1, "edit: profile_for control present");
  const text = await bodyText(p);
  expect(text.includes("shown on your public profile"), "edit: explicit public-visibility hint before save");
  await p.selectOption("#me-diet", "Vegetarian");
  await p.selectOption("#me-profile_for", "Self");
  await p.screenshot({ path: O + "en-1280-me-edit-lifestyle.png", fullPage: false });
  await p.getByRole("button", { name: /Save changes/ }).click(); await p.waitForTimeout(3000);
  const saved = await p.evaluate(async () => {
    const r = await fetch("/api/profile/MVE2E00007", { headers: { "X-Tsap-Token": sessionStorage.getItem("tsap_token") } });
    const d = await r.json();
    return { diet: d.profile?.diet, profile_for: d.profile?.profile_for };
  });
  expect(saved.diet === "Vegetarian" && saved.profile_for === "Self", "edit: save roundtrip persists both fields", JSON.stringify(saved));
  await c.close();
}

// ---------- 2. /me edit (TE mobile): Telugu labels + hints ----------
{
  const c = await ctx("MVE2E00007", "te", 390, 844);
  const p = await c.newPage();
  await p.goto(B + "/me", { waitUntil: "networkidle" }); await p.waitForTimeout(2000);
  await p.getByRole("button", { name: /ప్రొఫైల్ సవరణ/ }).first().click(); await p.waitForTimeout(2500);
  expect(await p.locator("#me-diet").count() === 1 && await p.locator("#me-profile_for").count() === 1, "edit TE mobile: both controls present");
  const text = await bodyText(p);
  expect(text.includes("పబ్లిక్ ప్రొఫైల్‌లో కనిపిస్తుంది"), "edit TE mobile: Telugu visibility hint present");
  await p.locator("#me-diet").scrollIntoViewIfNeeded(); await p.waitForTimeout(400);
  await p.screenshot({ path: O + "te-390-me-edit-lifestyle.png" });
  await c.close();
}

// ---------- 3. Public profile shows rows when set (EN desktop + TE) ----------
for (const lang of ["en", "te"]) {
  const c = await ctx("MVE2E00001", lang, 1280);
  const p = await c.newPage(); p.on("pageerror", e => log("PAGEERR", e.message.slice(0, 120)));
  await p.goto(B + "/search/MVE2E00002", { waitUntil: "networkidle" }); await p.waitForTimeout(2500);
  const text = await bodyText(p);
  if (lang === "en") {
    expect(text.includes("Diet") && text.includes("Vegetarian"), "profile EN: diet row shown");
    expect(text.includes("Profile listed by") && text.includes("Registered by parents"), "profile EN: listed-by row shown");
  } else {
    expect(text.includes("ఆహారపు అలవాటు") && text.includes("శాఖాహారం"), "profile TE: diet row shown in Telugu");
    expect(text.includes("తల్లిదండ్రులు నమోదు చేసారు"), "profile TE: listed-by row shown in Telugu");
  }
  await p.screenshot({ path: O + `${lang}-1280-profile-selfdeclared.png` });
  await c.close();
}

// ---------- 4. Public profile hides rows when unset ----------
{
  const c = await ctx("MVE2E00001", "en", 1280);
  const p = await c.newPage();
  await p.goto(B + "/search/MVE2E00006", { waitUntil: "networkidle" }); await p.waitForTimeout(2500);
  const text = await bodyText(p);
  expect(!text.includes("Diet") && !text.includes("Profile listed by"), "profile unset: no diet/listed-by rows (unknown stays unknown)");
  await c.close();
}

// ---------- 5. Saved diet preference produces a factual check on the profile view ----------
{
  const c = await ctx("MVE2E00001", "en", 1280);
  const p = await c.newPage();
  await p.goto(B + "/matches", { waitUntil: "networkidle" }); await p.waitForTimeout(1500);
  const saved = await p.evaluate(async () => {
    const r = await fetch("/api/profile/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Tsap-Token": sessionStorage.getItem("tsap_token") },
      body: JSON.stringify({ tsap_id: "MVE2E00001", diet: "Vegetarian", marital_statuses: ["Any"] }),
    });
    return r.status;
  });
  expect(saved === 200, "preferences: viewer diet preference saved", `status ${saved}`);
  await p.goto(B + "/search/MVE2E00005", { waitUntil: "networkidle" }); await p.waitForTimeout(2500);
  const text = await bodyText(p);
  expect(text.includes("listed diet differs from the saved preference"), "profile view: diet not_met factual check shown");
  await p.screenshot({ path: O + "en-1280-profile-diet-pref-check.png" });
  await p.goto(B + "/search/MVE2E00002", { waitUntil: "networkidle" }); await p.waitForTimeout(2500);
  expect((await bodyText(p)).includes("listed diet matches the saved preference"), "profile view: diet met factual check shown");
  await c.close();
}

// ---------- 6. Printed biodata carries rows only when set ----------
{
  const c = await ctx("MVE2E00001", "en", 1280, 900, true);
  const p = await c.newPage();
  await p.goto(B + "/search/MVE2E00002", { waitUntil: "networkidle" }); await p.waitForTimeout(2500);
  const [popup] = await Promise.all([
    c.waitForEvent("page"),
    p.getByRole("button", { name: /Print Biodata|బయోడేటా/ }).first().click(),
  ]);
  await popup.waitForLoadState("domcontentloaded"); await popup.waitForTimeout(800);
  const html = await popup.content();
  expect(html.includes("Diet") && html.includes("Vegetarian"), "biodata: diet row printed when set");
  expect(html.includes("Profile listed by") && html.includes("Registered by parents"), "biodata: listed-by row printed when set");
  expect((await popup.evaluate(() => window.__prints || 0)) >= 1, "biodata: print invoked");
  await popup.close();
  await p.goto(B + "/search/MVE2E00006", { waitUntil: "networkidle" }); await p.waitForTimeout(2500);
  const [popup2] = await Promise.all([
    c.waitForEvent("page"),
    p.getByRole("button", { name: /Print Biodata|బయోడేటా/ }).first().click(),
  ]);
  await popup2.waitForLoadState("domcontentloaded"); await popup2.waitForTimeout(800);
  const html2 = await popup2.content();
  expect(!html2.includes(">Diet<") && !html2.includes("Profile listed by"), "biodata: rows omitted when unset");
  await popup2.close();
  await c.close();
}

// ---------- 7. Full registration step 1 renders both optional controls (EN desktop + TE mobile) ----------
for (const [lang, w, h] of [["en", 1280, 900], ["te", 390, 844]]) {
  const c = await ctx("", lang, w, h);
  const p = await c.newPage(); p.on("pageerror", e => log("PAGEERR", e.message.slice(0, 120)));
  await p.goto(B + "/register", { waitUntil: "networkidle" }); await p.waitForTimeout(2000);
  await p.getByRole("button", { name: lang === "te" ? /5-దశల పూర్తి నమోదు/ : /5-step full registration/ }).click();
  await p.waitForTimeout(1500);
  expect(await p.locator("#full-profile_for").count() === 1, `register ${lang}: profile_for control present`);
  expect(await p.locator("#full-diet").count() === 1, `register ${lang}: diet control present`);
  const text = await bodyText(p);
  expect(text.includes(lang === "te" ? "పబ్లిక్ ప్రొఫైల్‌లో కనిపిస్తుంది" : "shown on your public profile"), `register ${lang}: visibility hint before entry`);
  await p.locator("#full-diet").scrollIntoViewIfNeeded(); await p.waitForTimeout(400);
  await p.screenshot({ path: O + `${lang}-${w}-register-step1-lifestyle.png` });
  await c.close();
}

await b.close();
log(failures ? `RESULT: ${failures} FAILED` : "RESULT: all PASS");
process.exit(failures ? 1 : 0);
