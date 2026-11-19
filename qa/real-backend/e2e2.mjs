import { chromium } from "playwright";
import fs from "node:fs";
const T = JSON.parse(fs.readFileSync("/tmp/e2e_tokens.json"));
const O = "/downloads/mv-missing-options/real/";
const b = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args:["--no-sandbox"] });
const log=(...a)=>console.log(...a);
async function page(id, lang, w, h=900){ const c=await b.newContext({viewport:{width:w,height:h}});
  await c.addInitScript(([id,t,l])=>{ if(id){localStorage.setItem("tsap_id",id);sessionStorage.setItem("tsap_token",t);} localStorage.setItem("tsap_lang",l);},[id,id?T[id]:"",lang]);
  const p=await c.newPage(); p.on("pageerror",e=>log("PAGEERR",e.message.slice(0,120))); p.on("response",r=>{if(r.url().includes("/api/")&&r.status()>=400)log("HTTP",r.status(),r.request().method(),new URL(r.url()).pathname)}); return p; }
// mobile filter modal, real backend
for (const lang of ["en","te"]) {
  const p = await page("MVE2E00001", lang, 390, 844);
  await p.goto("http://127.0.0.1:3197/matches?gender=Bride",{waitUntil:"networkidle"}); await p.waitForTimeout(1500);
  await p.getByRole("button",{name: lang==="te"?/ఫిల్టర్లు/:/Filters/}).first().click();
  const modal = p.locator("div.fixed").filter({has:p.getByRole("button",{name:/Apply filters|ఫిల్టర్లు వర్తింపజేయండి/})}).last();
  await modal.locator("select").filter({has:p.locator("option[value='Joint']")}).first().selectOption("Joint");
  await p.waitForTimeout(400);
  await modal.locator("select").filter({has:p.locator("option[value='Joint']")}).first().scrollIntoViewIfNeeded();
  await p.screenshot({path:O+`${lang}-390-modal-controls.png`});
  await p.getByRole("button",{name:/Apply filters|ఫిల్టర్లు వర్తింపజేయండి/}).click(); await p.waitForTimeout(2500);
  log(lang,"mobile applied text:", (await p.innerText("body")).replace(/\n+/g," | ").slice(150,420));
  await p.screenshot({path:O+`${lang}-390-result-settled.png`});
}
// requests: send as 00001 -> 00002
{
  const p = await page("MVE2E00001","en",1280);
  await p.goto("http://127.0.0.1:3197/requests",{waitUntil:"networkidle"});
  await p.getByRole("button",{name:/Send interest/}).first().click();
  await p.getByLabel(/Profile ID to send|ఆసక్తి స్వీకర్త/).fill("MVE2E00002").catch(async()=>{await p.locator("input.font-mono").last().fill("MVE2E00002")});
  await p.locator("#requests-task-panel").getByRole("button",{name:/💌 Send interest/}).click(); await p.waitForTimeout(2500);
  log("send result:", (await p.innerText("main")).replace(/\n+/g," | ").match(/(✅[^|]*|[^|]*(error|credit|Failed|fail)[^|]*)/i)?.[0]);
  await p.screenshot({path:O+"en-1280-requests-send.png"});
  await p.getByRole("button",{name:/^📤? ?Sent/}).first().click().catch(()=>{});
  await p.waitForTimeout(800);
  log("sent tab:", (await p.innerText("main")).replace(/\n+/g," | ").slice(0,500));
}
{
  const p = await page("MVE2E00002","en",1280);
  await p.goto("http://127.0.0.1:3197/requests",{waitUntil:"networkidle"}); await p.waitForTimeout(1200);
  const txt=(await p.innerText("main")).replace(/\n+/g," | "); log("received:", txt.slice(0,600));
  const acc=p.getByRole("button",{name:/Accept|అంగీకరించ/}).first();
  log("accept buttons:", await acc.count());
  if(await acc.count()){ await acc.click(); await p.waitForTimeout(2000); log("after accept:", (await p.innerText("main")).replace(/\n+/g," | ").slice(0,500)); }
  await p.screenshot({path:O+"en-1280-requests-received.png"});
}
await b.close();
