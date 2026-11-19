import { chromium } from "playwright";
import fs from "node:fs";
const T = JSON.parse(fs.readFileSync("/tmp/e2e_tokens.json"));
const O = "/downloads/mv-missing-options/real/";
const B="http://127.0.0.1:3197";
const b = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args:["--no-sandbox"] });
const log=(...a)=>console.log(...a);
async function page(id,lang="en",w=1280,h=900){const c=await b.newContext({viewport:{width:w,height:h}});
  await c.addInitScript(([id,t,l])=>{ window.__prints=0; window.print=()=>{window.__prints++}; if(id){localStorage.setItem("tsap_id",id);sessionStorage.setItem("tsap_token",t);} localStorage.setItem("tsap_lang",l);},[id,id?T[id]:"",lang]);
  const p=await c.newPage(); p.on("pageerror",e=>log("PAGEERR",e.message.slice(0,120)));
  p.on("response",async r=>{const u=new URL(r.url()); if(/block|report|respond|interest\/send/.test(u.pathname)&&r.request().method()!=="GET"){let t="";try{t=(await r.text()).slice(0,160)}catch{} log("API",r.request().method(),u.pathname,r.status(),t)}});
  return p;}
const api=(id,path,body)=>fetch(B+path,{method:"POST",headers:{"Content-Type":"application/json","X-Tsap-Token":T[id],Authorization:"Bearer "+T[id]},body:JSON.stringify(body)}).then(r=>r.json());
// A: pre-existing request state
await api("MVE2E00001","/api/interest/send",{from_id:"MVE2E00001",to_id:"MVE2E00002"});
{ const p=await page("MVE2E00001"); let sends=0; p.on("request",r=>{if(r.url().includes("/api/interest/send")&&r.method()==="POST")sends++});
  await p.goto(B+"/search/MVE2E00002",{waitUntil:"networkidle"}); await p.waitForTimeout(2000);
  const m=p.getByRole("button",{name:/Send interest|Interest sent/}).first(), t=p.getByRole("button",{name:/Send with template/});
  log("A preexisting: label", await m.innerText(), "| main disabled", await m.isDisabled(), "| tmpl disabled", await t.isDisabled());
  await m.click({force:true}).catch(()=>{}); await p.waitForTimeout(1500);
  log("A UI after click:", (await p.locator("p[aria-live=polite]").allInnerTexts()).join(" / ").slice(0,200), "| POSTs:", sends);
  log("A coach text:", (await p.innerText("main")).match(/You already sent[^\n]*|already[^\n]*request[^\n]*/i)?.[0]);
  await p.screenshot({path:O+"en-1280-profile-preexisting.png"});
  // print
  await p.getByRole("button",{name:/Print Biodata/}).click(); await p.waitForTimeout(800);
  log("print calls:", await p.evaluate(()=>window.__prints), "| new tabs:", p.context().pages().length);
}
// B: decline
{ const p=await page("MVE2E00002"); await p.goto(B+"/requests",{waitUntil:"networkidle"}); await p.waitForTimeout(1200);
  const d=p.getByRole("button",{name:/Decline/}).first(); log("B decline buttons:", await d.count());
  await d.click(); await p.waitForTimeout(1500);
  const dlg=await p.locator("[role=dialog], .fixed").allInnerTexts(); log("B after decline click:", (await p.innerText("main")).replace(/\n+/g," | ").slice(0,350), "| dialog:", dlg.join("").slice(0,150));
  await p.screenshot({path:O+"en-1280-decline.png"}); }
// C: block / report from profile
{ const p=await page("MVE2E00001"); await p.goto(B+"/search/MVE2E00003",{waitUntil:"networkidle"}); await p.waitForTimeout(1500);
  await p.getByRole("button",{name:/🚩 Report/}).click(); await p.waitForTimeout(800);
  log("C report UI:", (await p.locator("[role=dialog], .fixed, form").allInnerTexts()).join(" || ").replace(/\n+/g," | ").slice(0,400));
  await p.screenshot({path:O+"en-1280-report-ui.png"}); }
await b.close();
