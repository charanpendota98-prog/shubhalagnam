import { chromium } from "playwright";
import fs from "node:fs";
const T = JSON.parse(fs.readFileSync("/tmp/e2e_tokens.json"));
const B="http://127.0.0.1:3197", O="/downloads/mv-missing-options/real/";
const b = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args:["--no-sandbox"] });
const log=(...a)=>console.log(...a);
const H={"Content-Type":"application/json","X-Tsap-Token":T.MVE2E00001,Authorization:"Bearer "+T.MVE2E00001};
await fetch(B+"/api/interest/send",{method:"POST",headers:H,body:JSON.stringify({from_id:"MVE2E00001",to_id:"MVE2E00002"})}).then(r=>r.json()).then(d=>log("seed request:",d.success));
await fetch(B+"/api/view",{method:"POST",headers:H,body:JSON.stringify({tsap_id:"MVE2E00004",viewer_id:"MVE2E00001"})}).then(r=>log("seed view:",r.status));
const L=(lang,en,te)=>lang==="te"?te:en;
for (const lang of ["en","te"]) {
  const steps=[
   ["baseline",async()=>{}],
   ["mother tongue Hindi",async(s)=>{await s.getByLabel(L(lang,"Mother tongue","మాతృభాష")).first().selectOption("Hindi")}],
   ["verification photo,id",async(s)=>{await s.getByLabel(L(lang,"Verification record on file","నమోదైన ధృవీకరణ రికార్డు")).first().selectOption("photo,id")}],
   ["completeness 70",async(s)=>{await s.getByLabel(L(lang,"Profile completeness","ప్రొఫైల్ పూర్తి శాతం")).first().selectOption("70")}],
   ["hide viewed",async(s)=>{await s.getByRole("checkbox",{name:L(lang,"Hide profiles I have already viewed","నేను ఇప్పటికే చూసిన ప్రొఫైల్‌లను దాచండి")}).check()}],
   ["hide requests",async(s)=>{await s.getByRole("checkbox",{name:L(lang,"Hide profiles I have a request with","నాతో రిక్వెస్ట్ ఉన్న ప్రొఫైల్‌లను దాచండి")}).check()}],
   ["same gothram",async(s,p)=>{await s.getByRole("button",{name:L(lang,"Astrology","జ్యోతిషం"),exact:true}).click(); await s.getByRole("checkbox",{name:L(lang,"Skip profiles with the same gothram as mine","నా గోత్రంతో సమానమైన ప్రొఫైల్‌లను తప్పించండి")}).check();}],
  ];
  for (const [name,fn] of steps) {
    const c=await b.newContext({viewport:{width:390,height:844}});
    await c.addInitScript(([t,l])=>{localStorage.setItem("tsap_id","MVE2E00001");sessionStorage.setItem("tsap_token",t);localStorage.setItem("tsap_lang",l);},[T.MVE2E00001,lang]);
    const p=await c.newPage(); p.on("pageerror",e=>log("PAGEERR",e.message.slice(0,100)));
    await p.goto(B+"/matches?gender=Bride",{waitUntil:"networkidle"}); await p.waitForTimeout(1500);
    if(name!=="baseline"){
      await p.getByRole("button",{name:lang==="te"?/ఫిల్టర్లు/:/Filters/}).first().click();
      const s=p.locator("div.fixed").filter({has:p.getByRole("button",{name:/Apply filters|ఫిల్టర్లు వర్తింపజేయండి/})}).last();
      if(name!=="same gothram") await s.getByRole("button",{name:L(lang,"Basics","ప్రాథమిక"),exact:true}).click().catch(()=>{});
      try{ await fn(s,p);}catch(e){log(lang,name,"CONTROL ERR",e.message.split("\n")[0].slice(0,120));}
      await p.getByRole("button",{name:/Apply filters|ఫిల్టర్లు వర్తింపజేయండి/}).click(); await p.waitForTimeout(2500);
    }
    const t=await p.innerText("body"); const ids=[...new Set(t.match(/MVE2E0000\d/g)||[])].sort().map(x=>x.slice(-1));
    log(lang,name.padEnd(22),"result ids:",ids.join(",")||"none","| count text:",t.match(/\d+ (matching|సరిపోలే)/)?.[0]);
    if(["en","te"].includes(lang)&&name==="same gothram") await p.screenshot({path:O+`${lang}-390-gothram-result.png`});
    await c.close();
  }
}
await b.close();
