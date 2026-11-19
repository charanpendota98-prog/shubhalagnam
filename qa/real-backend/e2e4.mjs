import { chromium } from "playwright";
import fs from "node:fs";
const T = JSON.parse(fs.readFileSync("/tmp/e2e_tokens.json"));
const O = "/downloads/mv-missing-options/real/";
const b = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args:["--no-sandbox"] });
const log=(...a)=>console.log(...a);
async function page(id, lang, w, h=900){ const c=await b.newContext({viewport:{width:w,height:h}});
  await c.addInitScript(([id,t,l])=>{ if(id){localStorage.setItem("tsap_id",id);sessionStorage.setItem("tsap_token",t);} localStorage.setItem("tsap_lang",l);},[id,id?T[id]:"",lang]);
  const p=await c.newPage(); p.on("pageerror",e=>log("PAGEERR",e.message.slice(0,120))); p.on("response",r=>{if(r.url().includes("/api/")&&r.status()>=400)log("HTTP",r.status(),r.request().method(),new URL(r.url()).pathname)}); return p; }
// profile page actions
{ const p=await page("MVE2E00001","en",1280);
  await p.goto("http://127.0.0.1:3197/matches?gender=Bride",{waitUntil:"networkidle"}); await p.waitForTimeout(1500);
  await p.getByText(/^\s*(👁️ )?(View details|Details|View profile)/).first().click(); await p.waitForLoadState("networkidle"); await p.waitForTimeout(2000);
  const items=await p.locator("main button, main a[href]").evaluateAll(e=>e.map(x=>(x.innerText||x.getAttribute("aria-label")||"").trim().replace(/\n/g," ").slice(0,30)+(x.tagName==="A"?"→"+x.getAttribute("href").slice(0,30):"")).filter(s=>s&&!s.startsWith("→")));
  log("profile actions:", items.join(" | "));
  await p.screenshot({path:O+"en-1280-profile.png"});
}
await b.close();
