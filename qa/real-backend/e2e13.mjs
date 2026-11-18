// v10 acceptance gaps: (1) verification-control narrowing in a real browser against the
// varied review fixture (photo x5, id x1, phone-only x1, unreviewed x1), (2) Telugu desktop
// registration, (3) Print Biodata exercised through Chromium's real print pipeline
// (popup + auto-print hook + print-media render + printToPDF). Run from frontend/.
import { chromium } from "playwright";
import fs from "node:fs";
const T = JSON.parse(fs.readFileSync("/tmp/e2e_tokens.json"));
const O = "/downloads/mv-missing-options/real/";
const B = "http://127.0.0.1:3197";
const b = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox"] });
const log = (...a) => console.log(...a);
let failures = 0;
const expect = (cond, label, extra = "") => { log(cond ? "PASS" : "FAIL", label, extra); if (!cond) failures++; };
const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

async function ctx(id, lang, w, h = 900, recordPrint = false) {
  const c = await b.newContext({ viewport: { width: w, height: h } });
  await c.addInitScript(([id, t, l, rp]) => {
    if (rp) { window.__prints = 0; const orig = window.print ? window.print.bind(window) : null; window.print = () => { window.__prints++; }; }
    if (id) { localStorage.setItem("tsap_id", id); sessionStorage.setItem("tsap_token", t); }
    localStorage.setItem("tsap_lang", l);
  }, [id, id ? T[id] : "", lang, recordPrint]);
  return c;
}
const idsOnPage = async (p) => [...new Set((await p.innerText("body")).match(/MVE2E0000\d/g) || [])].filter(x => x !== "MVE2E00001").sort();

// ---------- 1. verification-control narrowing ----------
const ALL = ["MVE2E00002", "MVE2E00003", "MVE2E00004", "MVE2E00005", "MVE2E00006", "MVE2E00007", "MVE2E00008", "MVE2E00009"];
const PHONE_UP = ["MVE2E00002", "MVE2E00003", "MVE2E00004", "MVE2E00005", "MVE2E00006", "MVE2E00007", "MVE2E00009"];
const PHOTO_UP = ["MVE2E00002", "MVE2E00003", "MVE2E00004", "MVE2E00005", "MVE2E00006", "MVE2E00007"];
const ID_ONLY = ["MVE2E00005"];

// desktop EN sidebar: auto-search on change
{
  const c = await ctx("MVE2E00001", "en", 1280);
  const p = await c.newPage(); p.on("pageerror", e => log("PAGEERR", e.message.slice(0, 100)));
  await p.goto(B + "/matches?gender=Bride", { waitUntil: "networkidle" }); await p.waitForTimeout(2500);
  expect(same(await idsOnPage(p), ALL), "desktop baseline lists all 8 varied-review members");
  const sel = p.getByLabel("Verification badge");
  for (const [value, wanted, name] of [["phone,photo,id", PHONE_UP, "phone,photo,id"], ["photo,id", PHOTO_UP, "photo,id"], ["id", ID_ONLY, "id"]]) {
    await sel.selectOption(value); await p.waitForTimeout(3000);
    const got = await idsOnPage(p);
    expect(same(got, wanted), `desktop narrows on ${name}`, `got ${got.map(x => x.slice(-2)).join(",")}`);
  }
  await p.screenshot({ path: O + "en-1280-verification-id-narrowed.png" });
  await c.close();
}
// mobile modal (EN + TE): Apply filters flow
for (const lang of ["en", "te"]) {
  const L = (en, te) => (lang === "te" ? te : en);
  const c = await ctx("MVE2E00001", lang, 390, 844);
  const p = await c.newPage(); p.on("pageerror", e => log("PAGEERR", e.message.slice(0, 100)));
  for (const [value, wanted, name] of [["photo,id", PHOTO_UP, "photo,id"], ["id", ID_ONLY, "id"], ["phone,photo,id", PHONE_UP, "phone,photo,id"]]) {
    await p.goto(B + "/matches?gender=Bride", { waitUntil: "networkidle" }); await p.waitForTimeout(1500);
    await p.getByRole("button", { name: lang === "te" ? /ఫిల్టర్లు/ : /Filters/ }).first().click();
    const s = p.locator("div.fixed").filter({ has: p.getByRole("button", { name: /Apply filters|ఫిల్టర్లు వర్తింపజేయండి/ }) }).last();
    await s.getByRole("button", { name: L("Basics", "ప్రాథమిక"), exact: true }).click().catch(() => {});
    await s.getByLabel(L("Verification record on file", "నమోదైన ధృవీకరణ రికార్డు")).first().selectOption(value);
    await p.getByRole("button", { name: /Apply filters|ఫిల్టర్లు వర్తింపజేయండి/ }).click(); await p.waitForTimeout(2500);
    const got = await idsOnPage(p);
    expect(same(got, wanted), `${lang} mobile narrows on ${name}`, `got ${got.map(x => x.slice(-2)).join(",")}`);
  }
  if (lang === "te") await p.screenshot({ path: O + "te-390-verification-narrowed.png" });
  await c.close();
}

// ---------- 2. Print Biodata through the real print pipeline ----------
for (const lang of ["en", "te"]) {
  const c = await ctx("MVE2E00001", lang, 1280, 900, true);
  const p = await c.newPage(); p.on("pageerror", e => log("PAGEERR", e.message.slice(0, 100)));
  await p.goto(B + "/search/MVE2E00006", { waitUntil: "networkidle" }); await p.waitForTimeout(2000);
  const [pop] = await Promise.all([
    p.context().waitForEvent("page", { timeout: 8000 }).catch(() => null),
    p.getByRole("button", { name: /Print Biodata|ప్రింట్ బయోడేటా/ }).click(),
  ]);
  expect(Boolean(pop), `${lang} print opens the biodata window`);
  if (pop) {
    await pop.waitForLoadState("load"); await pop.waitForTimeout(1500);
    const prints = await pop.evaluate(() => window.__prints);
    expect(prints >= 1, `${lang} popup auto-invokes window.print() on load`, `calls=${prints}`);
    const body = await pop.innerText("body");
    expect(body.includes("Sample PlainOne"), `${lang} biodata carries the member name`);
    expect(/MVE2E00006/.test(body), `${lang} biodata carries the profile ID`);
    expect(/verify independently|స్వతంత్రంగా నిర్ధారించండి/.test(body), `${lang} biodata carries the independent-verification footer`);
    log(`${lang} print footer:`, (body.match(/[^\n]*\/search\/MVE2E00006[^\n]*/) || [""])[0].trim().slice(-80));
    await pop.emulateMedia({ media: "print" });
    await pop.screenshot({ path: O + `${lang}-print-media-biodata.png` });
    await pop.pdf({ path: O + `${lang}-print-biodata.pdf`, format: "A4" });
    log(`${lang} print PDF written`);
  }
  await c.close();
}

// ---------- 3. Telugu desktop registration ----------
{
  const c = await ctx(null, "te", 1280);
  const p = await c.newPage(); p.on("pageerror", e => log("PAGEERR", e.message.slice(0, 100)));
  await p.goto(B + "/register", { waitUntil: "networkidle" });
  await p.getByRole("button", { name: /వధువు|Bride/ }).first().click();
  await p.getByLabel(/పూర్తి పేరు|Full Name/).first().fill("Fixture Registrant te-desktop");
  await p.locator("input[type=date]").fill("1998-01-01");
  await p.locator("#quick-religion").selectOption({ index: 1 }).catch(() => {});
  await p.getByRole("button", { name: /కులం \/ సంఘం ఎంచుకోండి|Select a community/ }).click();
  await p.getByRole("button", { name: /Kapu|కాపు/ }).first().click();
  await p.getByLabel(/రాష్ట్రం|State/).first().selectOption("TS");
  await p.getByRole("button", { name: /జిల్లా ఎంచుకోండి|Select a district/ }).click();
  await p.getByRole("button", { name: /Hyderabad|హైదరాబాద్/ }).first().click();
  await p.getByLabel(/10 అంకెల|Mobile number/).first().fill("9000000103");
  await p.locator("input[type=password]").first().fill("fixture-pass-123");
  await p.getByLabel(/గ్యాలరీ|gallery/).setInputFiles("tests/fixtures/synthetic-profile.jpg");
  await p.getByRole("checkbox", { name: /ఫోటోను అప్‌లోడ్|upload this photo/ }).check();
  await p.locator("#registration-consent").check();
  await p.getByRole("button", { name: /1 నిమిషంలో|1 minute/ }).click(); await p.waitForTimeout(4000);
  const t = (await p.innerText("body")).replace(/\n+/g, " | ");
  expect(/నమోదు విజయవంతంగా|Registration Successful/.test(t), "te desktop registration succeeds");
  log("te-desktop id:", t.match(/(Profile ID|ప్రొఫైల్ ID)[^|]*/)?.[0]);
  if (!/నమోదు విజయవంతంగా|Registration Successful/.test(t)) log(t.slice(0, 300));
  await p.screenshot({ path: O + "te-1280-register-result.png" });
  await c.close();
}

await b.close();
log(failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`);
process.exitCode = failures === 0 ? 0 : 1;
