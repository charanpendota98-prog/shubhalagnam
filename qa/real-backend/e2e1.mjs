import { chromium } from "playwright";
import fs from "node:fs";
const T = JSON.parse(fs.readFileSync("/tmp/e2e_tokens.json"));
const O = "/downloads/mv-missing-options/real/";
const b = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args:["--no-sandbox"] });
async function ctx(id, lang, w, h=900) {
  const c = await b.newContext({ viewport: { width: w, height: h } });
  await c.addInitScript(([id,t,l]) => { if(id){localStorage.setItem("tsap_id", id); sessionStorage.setItem("tsap_token", t);} localStorage.setItem("tsap_lang", l); }, [id, id?T[id]:"", lang]);
  return c;
}
const log = (...a) => console.log(...a);
// 1. mobile search EN/TE, viewer signed in
for (const lang of ["en","te"]) {
  const c = await ctx("MVE2E00001", lang, 390, 844); const p = await c.newPage();
  const errs=[]; p.on("pageerror", e=>errs.push(e.message));
  await p.goto("http://127.0.0.1:3197/matches?gender=bride", { waitUntil: "networkidle" }); await p.waitForTimeout(2500);
  await p.screenshot({ path: O+`${lang}-390-matches-settled.png` });
  log(lang, "matches errs", errs.length, errs.slice(0,2));
  await c.close();
}
// 2. editor save/reload for divorcee
{
  const c = await ctx("MVE2E00007", "en", 1280); const p = await c.newPage();
  const errs=[]; p.on("pageerror", e=>errs.push(e.message));
  await p.goto("http://127.0.0.1:3197/me", { waitUntil: "networkidle" });
  await p.getByRole("button", { name: /Edit Profile/ }).click();
  await p.locator("#me-children").waitFor({ timeout: 8000 });
  await p.locator("#me-children").selectOption("2");
  await p.locator("#me-physical_status").selectOption("Normal");
  await p.locator("form button[type=submit]").last().click();
  await p.waitForTimeout(2500);
  await p.reload({ waitUntil: "networkidle" });
  await p.getByRole("button", { name: /Edit Profile/ }).click();
  await p.locator("#me-children").waitFor({ timeout: 8000 });
  log("after reload children=", await p.locator("#me-children").inputValue(), "physical=", await p.locator("#me-physical_status").inputValue());
  await p.locator("#me-children").scrollIntoViewIfNeeded();
  await p.screenshot({ path: O+"en-1280-account-children-after-reload.png" });
  log("me errs", errs.slice(0,2));
  await c.close();
}
// 3. requests page
{
  const c = await ctx("MVE2E00001", "en", 1280); const p = await c.newPage();
  const errs=[]; p.on("pageerror", e=>errs.push(e.message));
  p.on("response", r=>{ if(r.status()>=400) log("HTTP", r.status(), r.url().slice(0,120)); });
  await p.goto("http://127.0.0.1:3197/requests", { waitUntil: "networkidle" }); await p.waitForTimeout(2000);
  const btns = await p.locator("button, a[href]").evaluateAll(els=>els.map(e=>(e.innerText||e.getAttribute("aria-label")||"").trim().slice(0,40)).filter(Boolean));
  log("requests buttons:", btns.slice(0,40).join(" | "));
  await p.screenshot({ path: O+"en-1280-requests.png" });
  log("req errs", errs.slice(0,2));
  await c.close();
}
await b.close();
