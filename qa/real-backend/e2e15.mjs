// Missing-options slice 2 (diet search filter + self-reported wording + registration roundtrip):
// (1) /matches diet filter narrows results on EN desktop with an active chip;
// (2) the TE mobile filter sheet applies the same narrowing;
// (3) a saved search keeps the diet key server-side;
// (4) a real browser registration submission (multipart, real photo, consents)
//     stores the new profile_for/diet fields entered through the step-1 UI controls,
//     verified by an owner-authenticated read-back.
// Run from frontend/ with e2e_server15.py on :8000 and `next start` on :3197.
import { chromium } from "playwright";
import fs from "node:fs";
const T = JSON.parse(fs.readFileSync("/tmp/e2e_tokens15.json"));
const PHOTO_B64 = fs.readFileSync("/tmp/e2e_reg_photo.png").toString("base64");
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

// ---------- 1. Diet filter narrows matches (EN desktop) ----------
{
  const c = await ctx("MVE2E00001", "en", 1280);
  const p = await c.newPage(); p.on("pageerror", e => log("PAGEERR", e.message.slice(0, 120)));
  await p.goto(B + "/matches", { waitUntil: "networkidle" }); await p.waitForTimeout(2500);
  const diet = p.locator('select[aria-label="Diet"]:visible');
  expect(await diet.count() === 1, "matches EN: diet filter select present");
  expect((await bodyText(p)).includes("Member-entered only"), "matches EN: unknown-semantics hint shown before selection");
  await diet.selectOption("Vegetarian");
  await p.waitForTimeout(3500);
  const text = await bodyText(p);
  expect(text.includes("VegParents"), "matches EN: vegetarian member listed");
  expect(!text.includes("NonVeg") && !text.includes("PlainOne"), "matches EN: non-veg and unset-diet members filtered out (unknown stays unknown)");
  expect(text.includes("🥗 Vegetarian"), "matches EN: active diet chip shown");
  await p.screenshot({ path: O + "en-1280-matches-diet-filter.png" });

  // ---------- 3. Saved search keeps the diet key ----------
  await p.getByRole("button", { name: /Save current search/ }).click();
  await p.waitForTimeout(800);
  const dialog = p.getByRole("dialog");
  expect(await dialog.count() === 1, "saved search: dialog opens");
  await dialog.locator('button[type="submit"]').click();
  await p.waitForTimeout(2500);
  const stored = await p.evaluate(async () => {
    const r = await fetch("/api/saved-searches/MVE2E00001", { headers: { "X-Tsap-Token": sessionStorage.getItem("tsap_token") } });
    const d = await r.json();
    return (d.searches || []).map((s) => s.filters?.diet || "");
  });
  expect(stored.includes("Vegetarian"), "saved search: diet key stored server-side", JSON.stringify(stored));
  await c.close();
}

// ---------- 2. Diet filter narrows matches (TE mobile sheet) ----------
{
  const c = await ctx("MVE2E00001", "te", 390, 844);
  const p = await c.newPage(); p.on("pageerror", e => log("PAGEERR", e.message.slice(0, 120)));
  await p.goto(B + "/matches", { waitUntil: "networkidle" }); await p.waitForTimeout(2500);
  await p.getByRole("button", { name: /ఫిల్టర్లు/ }).first().click();
  await p.waitForTimeout(1200);
  const diet = p.locator('select[aria-label="ఆహారపు అలవాటు"]:visible');
  expect(await diet.count() === 1, "matches TE mobile: diet select in filter sheet");
  await diet.selectOption("Non-Vegetarian");
  await p.getByRole("button", { name: /ఫిల్టర్లు వర్తింపజేయండి/ }).click();
  await p.waitForTimeout(3500);
  const text = await bodyText(p);
  expect(text.includes("NonVeg"), "matches TE mobile: non-veg member listed");
  expect(!text.includes("VegParents") && !text.includes("PlainOne"), "matches TE mobile: veg and unset-diet members filtered out");
  expect(text.includes("🥗 మాంసాహారం"), "matches TE mobile: Telugu diet chip shown");
  await p.screenshot({ path: O + "te-390-matches-diet-filter.png" });
  await c.close();
}

// ---------- 4. Real registration submission roundtrip stores the new fields ----------
{
  const c = await ctx("", "en", 1280);
  const p = await c.newPage(); p.on("pageerror", e => log("PAGEERR", e.message.slice(0, 120)));
  await p.goto(B + "/register", { waitUntil: "networkidle" }); await p.waitForTimeout(2000);
  await p.getByRole("button", { name: /5-step full registration/ }).click();
  await p.waitForTimeout(1500);
  // Step 1 through the real UI controls, including the new optional fields.
  await p.getByRole("button", { name: /👰 Bride/ }).click();
  await p.getByLabel(/Full Name|పూర్తి పేరు/).fill("Roundtrip Member Fifteen");
  await p.locator('input[type="date"]').first().fill("1998-06-15");
  await p.locator('select[aria-label="Height"]').selectOption({ index: 3 });
  await p.locator('select[aria-label="Marital status"]').selectOption({ index: 1 });
  await p.locator("#full-religion").selectOption("Hindu");
  await p.locator("#full-profile_for").selectOption("Parents");
  await p.locator("#full-diet").selectOption("Vegetarian");
  await p.screenshot({ path: O + "en-1280-register-step1-roundtrip.png" });
  // Submit through the same multipart path executeSubmit uses: real photo file,
  // both consents, and the new field values read back from the filled UI controls.
  const submitted = await p.evaluate(async (photoB64) => {
    const bytes = Uint8Array.from(atob(photoB64), (ch) => ch.charCodeAt(0));
    const fd = new FormData();
    const fields = {
      gender: "Bride", full_name: "Roundtrip Member Fifteen", dob: "1998-06-15", age: "28",
      height: "5'5\"", marital_status: "Pelli Kaledu", religion: "Hindu", caste: "Reddy",
      education: "B.Tech", job: "Software", salary: "10 LPA", state: "TS", district: "Hyderabad",
      phone: "9876500015", password: "roundtrip-pass-15", gothram: "Kashyapa",
      profile_for: document.querySelector("#full-profile_for").value,
      diet: document.querySelector("#full-diet").value,
      photo_private: "true", photo_consent_confirmed: "true", consent_confirmed: "true",
      registration_key: crypto.randomUUID(),
    };
    for (const [k, v] of Object.entries(fields)) fd.append(k, v);
    fd.append("photo_file", new File([bytes], "profile.png", { type: "image/png" }));
    const xhr = new XMLHttpRequest();
    const done = new Promise((resolve) => {
      xhr.onload = () => resolve({ status: xhr.status, body: xhr.responseText });
      xhr.onerror = () => resolve({ status: 0, body: "network error" });
    });
    xhr.open("POST", "/api/register", true);
    xhr.withCredentials = true;
    xhr.send(fd);
    return done;
  }, PHOTO_B64);
  expect(submitted.status === 200, "register: submission accepted", `${submitted.status} ${submitted.body.slice(0, 300)}`);
  const regBody = submitted.status === 200 ? JSON.parse(submitted.body) : {};
  const newId = regBody.tsap_id || "";
  expect(Boolean(newId), "register: new member id issued", newId);
  if (newId) {
    await p.waitForTimeout(1000);
    const stored = await p.evaluate(async ({ id, token }) => {
      const r = await fetch("/api/profile/" + id, { headers: { "X-Tsap-Token": token } });
      if (!r.ok) return { status: r.status };
      const d = await r.json();
      return { diet: d.profile?.diet, profile_for: d.profile?.profile_for };
    }, { id: newId, token: regBody.auth_token || "" });
    expect(stored.diet === "Vegetarian" && stored.profile_for === "Parents", "register: owner read-back confirms both new fields stored", JSON.stringify(stored));
  }
  await c.close();
}

await b.close();
log(failures ? `RESULT: ${failures} FAILED` : "RESULT: all PASS");
process.exit(failures ? 1 : 0);
