import {test,expect,type Page} from '@playwright/test';
import fs from 'node:fs';fs.mkdirSync('artifacts/campaign-response-integrity',{recursive:true});
const id='ABCDEFGHIJKLMNOPQRSTUVWX';
const valid=()=>({id,name:'Fictional creator campaign',channel:'youtube',status:'active',link:`https://manavivaha.in/r/FICTION165?campaign=${id}`,clicks:4,registrations:2,eligible_rewards:0,recorded_earnings_inr:0,disclosure_en:'Ad / referral link.',disclosure_te:'ప్రకటన / referral link.'});
async function fixture(page:Page,lang='en'){
 let payload:any={success:true,campaigns:[]},ack:any=null,posts=0;
 await page.addInitScript(l=>localStorage.setItem('tsap_lang',l),lang);
 await page.route('**/api/**',async r=>{
  const p=new URL(r.request().url()).pathname;
  if(p==='/api/referral/UI165/campaigns'||p.startsWith('/api/referral/UI165/campaigns/')){
   if(r.request().method()==='POST'){posts++;return r.fulfill({json:ack??{success:true,campaign:valid()}});}
   return r.fulfill({json:payload});
  }
  if(p==='/api/referral/UI165')return r.fulfill({json:{ok:true,code:'FICTION165',link:'https://manavivaha.in/r/FICTION165',stats:{wallet:0},tier:{key:'BRONZE'},commission_rules:{min_payout:50}}});
  return r.fulfill({json:{success:true,payouts:[],leaderboard:[]}});
 });
 return{payload:(p:any)=>payload=p,ack:(p:any)=>ack=p,posts:()=>posts};
}
const malformed:Record<string,()=>any>={
 'object list':()=>({success:true,campaigns:{bad:true}}),
 'missing list':()=>({success:true}),
 'null row':()=>({success:true,campaigns:[null]}),
 'duplicate token':()=>({success:true,campaigns:[valid(),valid()]}),
 'unsafe ID':()=>({success:true,campaigns:[{...valid(),id:'../status'}]}),
 'invalid status':()=>({success:true,campaigns:[{...valid(),status:'deleted'}]}),
 'negative count':()=>({success:true,campaigns:[{...valid(),clicks:-1}]}),
 'string count':()=>({success:true,campaigns:[{...valid(),registrations:'2'}]}),
 'negative earnings':()=>({success:true,campaigns:[{...valid(),recorded_earnings_inr:-50}]}),
 'object name':()=>({success:true,campaigns:[{...valid(),name:{bad:true}}]}),
 'missing disclosure':()=>({success:true,campaigns:[{...valid(),disclosure_en:''}]}),
 'external link':()=>({success:true,campaigns:[{...valid(),link:`https://example.invalid/r/FICTION165?campaign=${id}`}]}),
 'mismatched link token':()=>({success:true,campaigns:[{...valid(),link:'https://manavivaha.in/r/FICTION165?campaign=ZYXWVUTSRQPONMLKJIHGFEDC'}]}),
 'extra query':()=>({success:true,campaigns:[{...valid(),link:valid().link+'&next=wrong'}]}),
 'credential link':()=>({success:true,campaigns:[{...valid(),link:valid().link.replace('https://','https://user@')}]}),
};
for(const [name,body]of Object.entries(malformed))test(`reject malformed campaign ${name}`,async({page})=>{
 const f=await fixture(page);f.payload(body());await page.goto('/referral?id=UI165');const region=page.getByRole('region',{name:'Creator campaigns'});await expect(region.getByRole('status')).toContainText('Campaign details could not be refreshed');await expect(page.getByRole('heading',{name:'Something went wrong'})).toHaveCount(0);await expect(region.getByText('No campaigns yet. Create a link for your first video.')).toHaveCount(0);await expect(region.getByRole('button',{name:'Create campaign link',exact:true})).toBeDisabled();await expect(region.locator('article')).toHaveCount(0);f.payload({success:true,campaigns:[]});await region.getByRole('button',{name:'Refresh campaigns',exact:true}).click();await expect(region.getByText('No campaigns yet. Create a link for your first video.')).toBeVisible();expect(f.posts()).toBe(0);
});
for(const lang of ['en','te'])for(const width of [320,390,1280])test(`malformed refresh retains safe stale row ${lang} ${width}`,async({page})=>{
 await page.setViewportSize({width,height:3500});const f=await fixture(page,lang);f.payload({success:true,campaigns:[valid()]});await page.goto('/referral?id=UI165');const region=page.getByRole('region',{name:'Creator campaigns'});await expect(region.getByRole('heading',{name:valid().name})).toBeVisible();f.payload({success:true,campaigns:[null]});await region.getByRole('button',{name:lang==='en'?'Refresh campaigns':'తాజా వివరాలు చూడండి',exact:true}).click();await expect(region.getByRole('status')).toContainText(lang==='en'?'Displayed details may be stale.':'పాత వివరాలు కావచ్చు.');await expect(region.getByRole('heading',{name:valid().name})).toBeVisible();await expect(region.getByRole('button',{name:lang==='en'?'Pause campaign':'తాత్కాలికంగా ఆపండి',exact:true})).toBeDisabled();await region.screenshot({path:`artifacts/campaign-response-integrity/stale-${lang}-${width}.png`});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(f.posts()).toBe(0);
});
for(const [name,ack]of Object.entries({missing:{success:true},wrongName:{success:true,campaign:{...valid(),name:'Another campaign'}},wrongStatus:{success:true,campaign:{...valid(),status:'paused'}}}))test(`reject unconfirmed create ${name}`,async({page})=>{
 const f=await fixture(page);f.ack(ack);await page.goto('/referral?id=UI165');const region=page.getByRole('region',{name:'Creator campaigns'});await expect(region.getByText('No campaigns yet. Create a link for your first video.')).toBeVisible();await region.getByLabel('Campaign name',{exact:true}).fill(valid().name);await region.getByRole('button',{name:'Create campaign link',exact:true}).click();await expect(region.getByRole('status')).toContainText('Change not confirmed. Refresh and check before trying again.');await expect(region.getByLabel('Campaign name',{exact:true})).toHaveValue(valid().name);await expect(region.getByRole('button',{name:'Create campaign link',exact:true})).toBeDisabled();expect(f.posts()).toBe(1);
});
test('status acknowledgement must match requested campaign and status',async({page})=>{const f=await fixture(page);f.payload({success:true,campaigns:[valid()]});f.ack({success:true,campaign:{...valid(),id:'ZYXWVUTSRQPONMLKJIHGFEDC',link:'https://manavivaha.in/r/FICTION165?campaign=ZYXWVUTSRQPONMLKJIHGFEDC',status:'paused'}});await page.goto('/referral?id=UI165');const region=page.getByRole('region',{name:'Creator campaigns'});await region.getByRole('button',{name:'Pause campaign',exact:true}).click();await expect(region.getByRole('status')).toContainText('Change not confirmed');await expect(region.getByText('youtube · active')).toBeVisible();expect(f.posts()).toBe(1);});
