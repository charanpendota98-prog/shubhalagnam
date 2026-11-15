import {test,expect,type Page} from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import AxeBuilder from "@axe-core/playwright";
const evidence=process.env.CREATOR_EVIDENCE_DIR||path.join(process.cwd(),"artifacts","creator-campaigns");
fs.mkdirSync(evidence,{recursive:true});
const token="ABCDEFGHIJKLMNOPQRSTUVWX";
async function fixture(page:Page,lang="en") {
 let rows:any[]=[],status=200,posts=0;
 await page.addInitScript(l=>localStorage.setItem("tsap_lang",l),lang);
 await page.route("**/api/**",async route=>{
  const url=new URL(route.request().url());
  if(url.pathname==="/api/referral/UI01/campaigns") {
   if(route.request().method()==="POST"){posts++;const d=route.request().postDataJSON();rows.push({id:token,name:d.name,channel:d.channel,status:"active",link:`https://manavivaha.in/r/CREATOR?campaign=${token}`,clicks:12,registrations:3,eligible_rewards:0,disclosure_en:"Ad / referral link. I may receive a reward.",disclosure_te:"ప్రకటన / referral link. నాకు reward రావచ్చు."});}
   return route.fulfill({status,json:status===200?{success:true,campaigns:rows}:{success:false}});
  }
  if(url.pathname.endsWith("/status")){rows=rows.map(x=>({...x,status:route.request().postDataJSON().status}));return route.fulfill({json:{success:true}});}
  if(url.pathname==="/api/referral/UI01")return route.fulfill({json:{ok:true,code:"CREATOR",link:"https://manavivaha.in/r/CREATOR",stats:{wallet:0},tier:{key:"BRONZE"},commission_rules:{min_payout:50}}});
  return route.fulfill({json:{success:true,payouts:[],leaderboard:[]}});
 });
 return{status:(n:number)=>{status=n;},posts:()=>posts};
}
test("create, pause, resume, archive and failed refresh guard",async({page})=>{
 const state=await fixture(page);await page.goto("/referral?id=UI01");const region=page.getByRole("region",{name:"Creator campaigns"});
 await expect(region.getByText("No campaigns yet. Create a link for your first video.")).toBeVisible();
 await region.getByLabel("Campaign name",{exact:true}).fill("My first creator video");await region.getByRole("button",{name:"Create campaign link",exact:true}).click();
 await expect(region.getByRole("heading",{name:"My first creator video"})).toBeVisible();expect(state.posts()).toBe(1);
 await region.getByRole("button",{name:"Pause campaign",exact:true}).click();await expect(region.getByRole("button",{name:"Resume campaign",exact:true})).toBeVisible();
 await region.getByRole("button",{name:"Resume campaign",exact:true}).click();await expect(region.getByRole("button",{name:"Pause campaign",exact:true})).toBeVisible();
 state.status(503);await region.getByRole("button",{name:"Refresh campaigns",exact:true}).click();await expect(region.getByText(/Displayed details may be stale/)).toBeVisible();await expect(region.getByRole("button",{name:"Pause campaign",exact:true})).toBeDisabled();
 state.status(200);await region.getByRole("button",{name:"Refresh campaigns",exact:true}).click();page.once("dialog",d=>d.accept());await region.getByRole("button",{name:"Archive campaign",exact:true}).click();await expect(region.getByText("youtube · archived")).toBeVisible();
 state.status(401);await region.getByRole("button",{name:"Refresh campaigns",exact:true}).click();await expect(region.getByRole("heading",{name:"My first creator video"})).toHaveCount(0);
});
for(const lang of ["en","te"])for(const width of [320,390,1280])test(`campaign form ${lang} ${width} layout and axe`,async({page})=>{
 await page.setViewportSize({width,height:900});await fixture(page,lang);await page.goto("/referral?id=UI01");const region=page.getByRole("region",{name:"Creator campaigns"});await expect(region.getByRole("button",{name:lang==="en"?"Create campaign link":"Campaign link సృష్టించండి",exact:true})).toBeEnabled();
 await region.locator("input").first().fill(lang==="en"?"A long creator video campaign about family registration":"కుటుంబ నమోదు గురించి నా మొదటి వీడియో campaign");await region.locator('button[type=submit]').click();await expect(region.locator("article")).toHaveCount(1);
 await region.getByText("Show campaign QR",{exact:true}).or(region.getByText("Campaign QR చూడండి",{exact:true})).click();
 await expect(region.getByRole("img")).toBeVisible();
 await region.getByText("Disclosure reminder & sample",{exact:true}).or(region.getByText("Disclosure నియమం & sample",{exact:true})).click();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();const scan=await new AxeBuilder({page}).include('section[aria-label="Creator campaigns"]').analyze();expect(scan.violations).toEqual([]);
 await page.locator("input").first().blur(); await page.mouse.click(1,1);
 await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:`${evidence}/ui-${lang}-${width}-full.png`,fullPage:true});
 await region.evaluate(el=>window.scrollTo(0,el.getBoundingClientRect().top+window.scrollY-80)); await page.screenshot({path:`${evidence}/ui-${lang}-${width}-viewport.png`});
});

test("campaign landing preserves token and invite into registration",async({page})=>{
 let click="";await page.route("**/api/**",async route=>{const u=new URL(route.request().url());if(u.pathname.includes("/referral/click/")){click=u.search;return route.fulfill({json:{success:true,valid_code:true,bonus_credits:1}});}return route.fulfill({json:{success:true}});});
 await page.goto(`/r/CREATOR?campaign=${token}&inv=INVITE01`);await page.waitForURL(`**/register?ref=CREATOR&inv=INVITE01&campaign=${token}`);expect(click).toContain(`campaign=${token}`);expect(click).toContain("inv=INVITE01");
});
test("partner campaigns require private OTP flow and scoped header",async({page})=>{
 await page.addInitScript(()=>localStorage.setItem("tsap_lang","en"));let campaignRequests=0;
 await page.route("**/api/**",async route=>{
  const u=new URL(route.request().url());let d:any={success:true};
  if(u.pathname==="/api/referral/partner/SYN-PARTNER")d={success:true,partner_id:"SYN-PARTNER",clicks:0,registrations:0,paid_count:0};
  if(u.pathname.endsWith("/auth"))d={success:true,partner_token:"synthetic-scoped-token"};
  if(u.pathname.endsWith("/private"))d={success:true,partner_id:"SYN-PARTNER",wallet:0};
  if(u.pathname==="/api/referral/SYN-PARTNER/campaigns"){campaignRequests++;expect(route.request().headers()["x-partner-token"]).toBe("synthetic-scoped-token");d={success:true,campaigns:[]};}
  return route.fulfill({json:d});
 });
 await page.goto("/referral/register");await expect(page.getByRole("region",{name:"Creator campaigns"})).toHaveCount(0);
 await page.getByLabel("Partner ID",{exact:true}).fill("SYN-PARTNER");await page.getByRole("button",{name:"View",exact:true}).click();
 await page.getByLabel("Registered 10-digit mobile",{exact:true}).fill("9000014599");await page.getByRole("button",{name:"Send OTP",exact:true}).click();await page.getByLabel("4-digit OTP",{exact:true}).fill("1234");await page.getByRole("button",{name:"Verify & continue",exact:true}).click();
 await expect(page.getByRole("region",{name:"Creator campaigns"})).toBeVisible();await expect(page.getByText("No campaigns yet. Create a link for your first video.")).toBeVisible();expect(campaignRequests).toBeGreaterThan(0);
 await page.locator("input").first().blur();await page.mouse.click(1,1);await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:`${evidence}/ui-partner-private.png`,fullPage:true});
});
