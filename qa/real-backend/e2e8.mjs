import { chromium } from "playwright";
import fs from "node:fs";
const T = JSON.parse(fs.readFileSync("/tmp/e2e_tokens.json"));
const O = "/downloads/mv-missing-options/real/";
const b = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args:["--no-sandbox"] });
const log=(...a)=>console.log(...a);
async function page(id,w=1280,h=900){const c=await b.newContext({viewport:{width:w,height:h}});
  await c.addInitScript(([id,t])=>{localStorage.setItem("tsap_id",id);sessionStorage.setItem("tsap_token",t);localStorage.setItem("tsap_lang","en");},[id,T[id]]);
  const p=await c.newPage(); p.on("pageerror",e=>log("PAGEERR",e.message.slice(0,120))); return p;}
// payment states
{ const p=await page("MVE2E00007");
  let fail=true; let posts=0;
  await p.route("**/api/pay/config",r=>fail?r.abort():r.continue());
  p.on("request",r=>{ if(r.url().includes("/api/pay/order")) posts++; });
  await p.goto("http://127.0.0.1:3197/requests",{waitUntil:"networkidle"});
  await p.getByRole("button",{name:/Plans & Credits/}).click(); await p.waitForTimeout(800);
  log("ERROR state:", await p.getByText(/could not check whether payment is open/).count()>0, "| Pay buttons:", await p.getByRole("button",{name:/Pay ₹/}).count());
  await p.screenshot({path:O+"en-1280-pay-check-error.png"});
  fail=false; await p.getByRole("button",{name:/Try again/}).first().click(); await p.waitForTimeout(1500);
  log("UNAVAILABLE state:", await p.getByText(/Payments are not open yet/).count()>0, "| Pay buttons:", await p.getByRole("button",{name:/Pay ₹/}).count(), "| order posts:", posts);
  await p.getByText(/Payments are not open yet/).first().scrollIntoViewIfNeeded();
  await p.screenshot({path:O+"en-1280-pay-unavailable.png"}); }
// profile send
{ const p=await page("MVE2E00001");
  let sends=0; p.on("request",r=>{ if(r.url().includes("/api/interest/send")&&r.method()==="POST") sends++; });
  await p.goto("http://127.0.0.1:3197/search/MVE2E00005",{waitUntil:"networkidle"}); await p.waitForTimeout(1500);
  const credit=async()=> (await p.innerText("body")).match(/Credits: \d+/)?.[0];
  log("before:", await credit());
  const btn=p.getByRole("button",{name:/💌 Send interest/}).first();
  await btn.click(); await p.waitForTimeout(2500);
  log("after:", await credit(), "| success msg:", await p.locator("p[aria-live=polite]").allInnerTexts());
  log("send button disabled:", await btn.isDisabled(), "| sends:", sends);
  await btn.click({force:true}).catch(()=>{}); await p.waitForTimeout(800); log("sends after second click:", sends);
  await p.locator("p[aria-live=polite]").first().scrollIntoViewIfNeeded().catch(()=>{});
  await p.screenshot({path:O+"en-1280-profile-send-feedback.png"}); }
await b.close();
