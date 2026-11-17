import { chromium } from "playwright";
import fs from "node:fs";
const T = JSON.parse(fs.readFileSync("/tmp/e2e_tokens.json"));
const O = "/downloads/mv-missing-options/real/";
const B="http://127.0.0.1:3197";
const b = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args:["--no-sandbox"] });
const log=(...a)=>console.log(...a);
async function page(id,lang="en",w=1280,h=900){const c=await b.newContext({viewport:{width:w,height:h}});
  await c.addInitScript(([id,t,l])=>{ if(id){localStorage.setItem("tsap_id",id);sessionStorage.setItem("tsap_token",t);} localStorage.setItem("tsap_lang",l);},[id,id?T[id]:"",lang]);
  const p=await c.newPage(); p.on("pageerror",e=>log("PAGEERR",e.message.slice(0,120)));
  p.on("request",r=>{const u=new URL(r.url()); if(/\/api\/(block|report|interest\/send)$/.test(u.pathname)&&r.method()==="POST") log("  POST",u.pathname,r.postData()?.slice(0,140));});
  return p;}
const api=(id,path,body)=>fetch(B+path,{method:"POST",headers:{"Content-Type":"application/json","X-Tsap-Token":T[id],Authorization:"Bearer "+T[id]},body:JSON.stringify(body)}).then(r=>r.json());
async function register(lang,w,phone,tag){
  const p=await page(null,lang,w,900); await p.goto(B+"/register",{waitUntil:"networkidle"});
  await p.getByRole("button",{name:/వధువు|Bride/}).first().click();
  await p.getByLabel(/పూర్తి పేరు|Full Name/).first().fill("Fixture Registrant "+tag);
  await p.locator("input[type=date]").fill("1998-01-01");
  await p.locator("#quick-religion").selectOption({index:1}).catch(()=>{});
  await p.getByRole("button",{name:/కులం \/ సంఘం ఎంచుకోండి|Select a community/}).click(); await p.getByRole("button",{name:/Kapu|కాపు/}).first().click();
  await p.getByLabel(/రాష్ట్రం|State/).first().selectOption("TS");
  await p.getByRole("button",{name:/జిల్లా ఎంచుకోండి|Select a district/}).click(); await p.getByRole("button",{name:/Hyderabad|హైదరాబాద్/}).first().click();
  await p.getByLabel(/10 అంకెల|Mobile number/).first().fill(phone);
  await p.locator("input[type=password]").first().fill("fixture-pass-123");
  await p.getByLabel(/గ్యాలరీ|gallery/).setInputFiles("tests/fixtures/synthetic-profile.jpg");
  await p.getByRole("checkbox",{name:/ఫోటోను అప్‌లోడ్|upload this photo/}).check();
  await p.locator("#registration-consent").check();
  await p.getByRole("button",{name:/1 నిమిషంలో|1 minute/}).click(); await p.waitForTimeout(4000);
  const t=(await p.innerText("body")).replace(/\n+/g," | ");
  log("REGISTER",tag,lang,w,"ok:",/నమోదు విజయవంతంగా|Registration Successful/.test(t), t.match(/(Profile ID|ప్రొఫైల్ ID)[^|]*/)?.[0]);
  if(!/నమోదు విజయవంతంగా|Registration Successful/.test(t)) log(t.slice(0,300));
  await p.screenshot({path:O+`${lang}-${w}-register-result.png`});
}
await register("te",390,"9000000101","te-mobile");
await register("en",1280,"9000000102","en-desktop");
// pre-existing request profile state
await api("MVE2E00001","/api/interest/send",{from_id:"MVE2E00001",to_id:"MVE2E00002"});
{ const p=await page("MVE2E00001"); await p.goto(B+"/search/MVE2E00002",{waitUntil:"networkidle"}); await p.waitForTimeout(2000);
  const m=p.getByRole("button",{name:/Send interest|Interest sent/}).first(), t=p.getByRole("button",{name:/Send with template/});
  log("PREEXISTING label:",await m.innerText(),"| main disabled",await m.isDisabled(),"| tmpl disabled",await t.isDisabled());
  await m.click({force:true}).catch(()=>{}); await t.click({force:true}).catch(()=>{}); await p.waitForTimeout(800);
  await p.screenshot({path:O+"en-1280-profile-preexisting.png"}); }
// report/block flows
{ const p=await page("MVE2E00001"); await p.goto(B+"/search/MVE2E00003",{waitUntil:"networkidle"}); await p.waitForTimeout(1500);
  await p.getByRole("button",{name:/🚩 Report/}).click(); await p.waitForTimeout(400);
  log("REPORT confirm disabled w/o reason:", await p.getByRole("button",{name:"Send report"}).isDisabled());
  await p.screenshot({path:O+"en-1280-report-panel.png"});
  await p.getByRole("button",{name:"Cancel"}).click(); await p.waitForTimeout(300); log("after cancel, panel gone:", await p.getByRole("button",{name:"Send report"}).count()===0);
  await p.getByRole("button",{name:/🚩 Report/}).click(); await p.locator("#report-category").selectOption("spam");
  await p.getByRole("button",{name:"Send report"}).click(); await p.waitForTimeout(1500);
  log("REPORT msg:", await p.locator("p[aria-live=polite]").allInnerTexts(), "| report btn disabled:", await p.getByRole("button",{name:/🚩 Report/}).isDisabled());
  await p.getByRole("button",{name:/🚫 Block/}).click(); await p.waitForTimeout(300);
  await p.getByRole("button",{name:"Cancel"}).click();
  await p.getByRole("button",{name:/🚫 Block/}).click(); await p.getByRole("button",{name:"Yes, block"}).click(); await p.waitForTimeout(1500);
  log("BLOCK msg:", await p.locator("p[aria-live=polite]").allInnerTexts(), "| block disabled:", await p.getByRole("button",{name:/🚫 Block/}).isDisabled());
  await p.screenshot({path:O+"en-1280-block-done.png"});
  // print
  const [pop]=await Promise.all([p.context().waitForEvent("page",{timeout:5000}).catch(()=>null), p.getByRole("button",{name:/Print Biodata/}).click()]);
  if(pop){ await pop.waitForTimeout(1500); log("PRINT popup html len:", (await pop.content()).length, "| text:", (await pop.innerText("body").catch(()=>"")).replace(/\n+/g," | ").slice(0,200)); await pop.screenshot({path:O+"en-print-output.png"}); } else log("PRINT: no popup"); }
await b.close();
