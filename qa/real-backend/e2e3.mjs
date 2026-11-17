import { chromium } from "playwright";
import fs from "node:fs";
const T = JSON.parse(fs.readFileSync("/tmp/e2e_tokens.json"));
const O = "/downloads/mv-missing-options/real/";
const b = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args:["--no-sandbox"] });
const log=(...a)=>console.log(...a);
async function page(id, lang, w, h=900){ const c=await b.newContext({viewport:{width:w,height:h}});
  await c.addInitScript(([id,t,l])=>{ if(id){localStorage.setItem("tsap_id",id);sessionStorage.setItem("tsap_token",t);} localStorage.setItem("tsap_lang",l);},[id,id?T[id]:"",lang]);
  const p=await c.newPage(); p.on("pageerror",e=>log("PAGEERR",e.message.slice(0,120))); p.on("response",r=>{if(r.url().includes("/api/")&&r.status()>=400)log("HTTP",r.status(),r.request().method(),new URL(r.url()).pathname)}); return p; }
async function send(p,to){ await p.goto("http://127.0.0.1:3197/requests",{waitUntil:"networkidle"});
  await p.getByRole("button",{name:/Send interest/}).first().click();
  await p.locator("input.font-mono").last().fill(to);
  await p.locator("#requests-task-panel").getByRole("button",{name:/💌 Send interest/}).click(); await p.waitForTimeout(2500); }
// 402 path: 00007 has no credits
{ const p=await page("MVE2E00007","en",1280); await send(p,"MVE2E00001");
  const t=(await p.innerText("body")).replace(/\n+/g," | "); log("no-credit msg shows raw code?", /credits_ledu/.test(t), "| has plain msg?", /No request credits remain/.test(t));
  await p.screenshot({path:O+"en-1280-requests-no-credits.png"}); }
// happy path
{ const p=await page("MVE2E00001","en",1280); await send(p,"MVE2E00002");
  const t=(await p.innerText("body")).replace(/\n+/g," | "); log("send ok:", /sent/i.test(t), t.match(/✅[^|]*/)?.[0]);
  await p.screenshot({path:O+"en-1280-requests-sent-ok.png"}); }
{ const p=await page("MVE2E00002","en",1280); await p.goto("http://127.0.0.1:3197/requests",{waitUntil:"networkidle"}); await p.waitForTimeout(1200);
  const btns=await p.locator("main button").evaluateAll(e=>e.map(x=>x.innerText.trim()).filter(Boolean));
  log("recv buttons:", btns.join(" | "));
  const acc=p.getByRole("button",{name:/Accept|అంగీకరించ|Yes/}).first();
  if(await acc.count()){ await acc.click(); await p.waitForTimeout(2500); log("after accept:", (await p.innerText("main")).replace(/\n+/g," | ").slice(0,400)); }
  await p.screenshot({path:O+"en-1280-requests-received.png"}); }
await b.close();
