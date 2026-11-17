import { chromium } from "playwright";
import fs from "node:fs";
const T = JSON.parse(fs.readFileSync("/tmp/e2e_tokens.json"));
const O = "/downloads/mv-missing-options/real/";
const b = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args:["--no-sandbox"] });
const log=(...a)=>console.log(...a);
async function page(id,lang,w,h=900){const c=await b.newContext({viewport:{width:w,height:h}});
  await c.addInitScript(([id,t,l])=>{localStorage.setItem("tsap_id",id);sessionStorage.setItem("tsap_token",t);localStorage.setItem("tsap_lang",l);},[id,T[id],lang]);
  const p=await c.newPage(); p.on("pageerror",e=>log("PAGEERR",e.message.slice(0,120))); return p;}
{ const p=await page("MVE2E00001","en",1280); let sends=0;
  p.on("request",r=>{ if(r.url().includes("/api/interest/send")&&r.method()==="POST") sends++; });
  await p.goto("http://127.0.0.1:3197/search/MVE2E00006",{waitUntil:"networkidle"}); await p.waitForTimeout(1500);
  await p.getByRole("button",{name:/Send with template/}).click(); await p.waitForTimeout(2500);
  const a=p.getByRole("button",{name:/Interest sent|Send interest/}).first(), t=p.getByRole("button",{name:/Send with template/});
  log("label:", await a.innerText(), "| main disabled:", await a.isDisabled(), "| template disabled:", await t.isDisabled(), "| sends:", sends);
  await a.click({force:true}).catch(()=>{}); await t.click({force:true}).catch(()=>{}); await p.waitForTimeout(1000);
  log("sends after forced clicks on both:", sends);
  await p.locator("p[aria-live=polite]").first().scrollIntoViewIfNeeded().catch(()=>{});
  await p.screenshot({path:O+"en-1280-profile-sent-buttons.png"}); }
for (const [path,name] of [["/pricing","pricing"],["/bureau","bureau"]]) for (const lang of ["en","te"]) {
  const p=await page("MVE2E00001",lang,390,844);
  await p.goto("http://127.0.0.1:3197"+path,{waitUntil:"networkidle"}); await p.waitForTimeout(2000);
  const n=await p.getByText(/Payments are not open yet|చెల్లింపులు ఇంకా ప్రారంభం/).count();
  const payBtn=await p.getByRole("button",{name:/Pay ₹/}).count();
  const overflow=await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
  log(name,lang,"unavailable notes:",n,"| Pay buttons:",payBtn,"| h-overflow:",overflow);
  const el=p.getByText(/Payments are not open yet|చెల్లింపులు ఇంకా ప్రారంభం/).first();
  if(n) await el.scrollIntoViewIfNeeded();
  await p.screenshot({path:O+`${lang}-390-${name}-pay.png`});
}
await b.close();
