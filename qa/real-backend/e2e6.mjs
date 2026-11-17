import { chromium } from "playwright";
import fs from "node:fs";
const T = JSON.parse(fs.readFileSync("/tmp/e2e_tokens.json"));
const O = "/downloads/mv-missing-options/real/";
const b = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args:["--no-sandbox"] });
const log=(...a)=>console.log(...a);
async function page(id,w=1280,h=900){const c=await b.newContext({viewport:{width:w,height:h}});
  await c.addInitScript(([id,t])=>{localStorage.setItem("tsap_id",id);sessionStorage.setItem("tsap_token",t);localStorage.setItem("tsap_lang","en");},[id,T[id]]);
  const p=await c.newPage(); p.on("pageerror",e=>log("PAGEERR",e.message.slice(0,120)));
  p.on("response",async r=>{const u=new URL(r.url()); if(u.pathname.startsWith("/api/pay")||u.pathname.startsWith("/api/interest/send")){let t="";try{t=(await r.text()).slice(0,300)}catch{}; log("API",r.request().method(),u.pathname,r.status(),t)}});
  return p;}
// A. no-credit error pixels
{ const p=await page("MVE2E00007");
  await p.goto("http://127.0.0.1:3197/requests",{waitUntil:"networkidle"});
  await p.getByRole("button",{name:/Send interest/}).first().click();
  await p.locator("input.font-mono").last().fill("MVE2E00001");
  await p.locator("#requests-task-panel").getByRole("button",{name:/💌 Send interest/}).click();
  await p.waitForTimeout(700);
  const toast=p.getByText(/No request credits remain/).first(); log("toast visible:", await toast.isVisible().catch(()=>false), "count", await p.getByText(/No request credits remain/).count());
  await toast.scrollIntoViewIfNeeded().catch(()=>{});
  await p.screenshot({path:O+"en-1280-no-credits-error.png"});
  // B. Pay buttons
  const pay=p.getByRole("button",{name:/Pay|Buy|Renew|₹/}).first();
  log("pay buttons:", (await p.locator("main button").evaluateAll(e=>e.map(x=>x.innerText.trim()).filter(t=>/Pay|Buy|Renew|₹/i.test(t)))).join(" | "));
  await p.getByRole("button",{name:/Pay/}).first().click(); await p.waitForTimeout(2500);
  log("after pay click text:", (await p.innerText("main")).replace(/\n+/g," | ").match(/(Razorpay|checkout|unavailable|not (available|configured)|order[^|]*|payment[^|]*)/ig)?.slice(0,6));
  await p.screenshot({path:O+"en-1280-pay-click.png"});
}
// C. profile-page interest persisted
{ const p=await page("MVE2E00001");
  await p.goto("http://127.0.0.1:3197/search/MVE2E00004",{waitUntil:"networkidle"}); await p.waitForTimeout(1500);
  await p.getByRole("button",{name:/💌 Send interest/}).first().click(); await p.waitForTimeout(2500);
  const t=(await p.innerText("main")).replace(/\n+/g," | ");
  log("profile UI after send:", t.match(/(✅[^|]*|sent[^|]*|REQ-[^|]*|Request[^|]*sent[^|]*|[^|]*credit[^|]*)/i)?.slice(0,3));
  const r=await p.evaluate(async([id,tk])=>{const h={"X-Tsap-Token":tk,Authorization:"Bearer "+tk};const s=await (await fetch("/api/interest/sent/"+id,{headers:h})).json();return s},["MVE2E00001",T.MVE2E00001]);
  log("persisted sent:", JSON.stringify(r).slice(0,500));
  await p.screenshot({path:O+"en-1280-profile-send.png"});
}
await b.close();
