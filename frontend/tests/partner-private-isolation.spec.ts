import {localeHref} from "./locale-href";
import {test,expect,type Page} from '@playwright/test';
import fs from 'node:fs';fs.mkdirSync('artifacts/partner-private-isolation',{recursive:true});
async function fixture(page:Page,delayed='',privateMode='valid'){
 let release!:()=>void;let started=false;const wait=new Promise<void>(r=>release=r);const calls:string[]=[];let mode=privateMode;
 await page.addInitScript(()=>localStorage.setItem('tsap_lang','en'));
 await page.route('**/api/**',async r=>{const p=new URL(r.request().url()).pathname;calls.push(p);if(p===delayed){started=true;await wait;}
 if(p==='/api/referral/partner/OLD163/private'){if(mode==='fail')return r.abort();return r.fulfill({json:{success:true,partner_id:mode==='wrong'?'WRONG163':'OLD163',wallet:987,pending_payout:0,qualifying_rewards_total:987}});}
 if(p.endsWith('/auth'))return r.fulfill({json:{success:true,partner_token:'fictional-old-token'}});
 if(p.startsWith('/api/otp/'))return r.fulfill({json:{success:true}});
 if(p==='/api/referral/partner/OLD163'||p==='/api/referral/partner/NEW163')return r.fulfill({json:{success:true,partner_id:p.split('/').pop(),clicks:0,registrations:0,paid_count:0}});
 return r.fulfill({json:{success:true,campaigns:[],items:[]}});});
 return {calls,release:()=>release(),started:()=>started,mode:(m:string)=>mode=m};
}
async function open(page:Page){await page.goto(localeHref('/referral/register','en'));await page.getByLabel('Partner ID',{exact:true}).fill('OLD163');await page.getByRole('button',{name:'View',exact:true}).click();await page.getByLabel('Registered 10-digit mobile',{exact:true}).fill('9000000000');}
async function code(page:Page){await page.getByRole('button',{name:'Send OTP',exact:true}).click();await page.getByLabel('4-digit OTP',{exact:true}).fill('1234');}
async function switchPartner(page:Page){await page.getByLabel('Partner ID',{exact:true}).fill('NEW163');await page.getByRole('button',{name:'View',exact:true}).click();await expect(page.getByLabel('Registered 10-digit mobile',{exact:true})).toBeVisible();}
for(const width of [320,390,1280])test(`late private response stays hidden after partner change ${width}`,async({page})=>{
 const f=await fixture(page,'/api/referral/partner/OLD163/private');await page.setViewportSize({width,height:1000});await open(page);await code(page);await page.getByRole('button',{name:'Verify & continue',exact:true}).click();await expect.poll(f.started).toBe(true);await switchPartner(page);f.release();await page.waitForTimeout(100);await expect(page.getByText('₹987',{exact:true})).toHaveCount(0);await expect(page.getByLabel('Partner ID',{exact:true})).toHaveValue('NEW163');await expect(page.getByRole('region',{name:'Creator campaigns'})).toHaveCount(0);await page.locator('.mv-partner-workspace > section').nth(2).screenshot({path:`artifacts/partner-private-isolation/stale-private-${width}.png`});expect(f.calls).not.toContain('/api/referral/partner/register');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
for(const delayed of ['/api/otp/verify','/api/referral/partner/OLD163/auth'])test(`superseded ${delayed} cannot continue old authentication`,async({page})=>{
 const f=await fixture(page,delayed);await open(page);await code(page);await page.getByRole('button',{name:'Verify & continue',exact:true}).click();await expect.poll(f.started).toBe(true);await switchPartner(page);f.release();await page.waitForTimeout(100);expect(f.calls).not.toContain('/api/referral/partner/OLD163/private');if(delayed==='/api/otp/verify')expect(f.calls).not.toContain('/api/referral/partner/OLD163/auth');await expect(page.getByText('₹987',{exact:true})).toHaveCount(0);
});
test('phone edit invalidates delayed OTP send',async({page})=>{const f=await fixture(page,'/api/otp/send');await open(page);await page.getByRole('button',{name:'Send OTP',exact:true}).click();await expect.poll(f.started).toBe(true);await page.getByLabel('Registered 10-digit mobile',{exact:true}).fill('9000000001');f.release();await page.waitForTimeout(100);await expect(page.getByLabel('4-digit OTP',{exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'Send OTP',exact:true})).toBeEnabled();});
for(const mode of ['wrong','fail'])test(`private ${mode} response clears token and can recover`,async({page})=>{const f=await fixture(page,'',mode);await open(page);await code(page);await page.getByRole('button',{name:'Verify & continue',exact:true}).click();await expect(page.getByText('Private details could not be confirmed. Verify the registered mobile again.',{exact:true})).toBeVisible();await expect(page.getByText('₹987',{exact:true})).toHaveCount(0);await expect(page.getByRole('region',{name:'Creator campaigns'})).toHaveCount(0);f.mode('valid');await page.getByRole('button',{name:'Verify & continue',exact:true}).click();await expect(page.getByText('₹987',{exact:true}).first()).toBeVisible();});
test('rapid verify clicks issue one chain; editing phone clears code',async({page})=>{const f=await fixture(page);await open(page);await code(page);await page.getByRole('button',{name:'Verify & continue',exact:true}).evaluate((b:HTMLButtonElement)=>{b.click();b.click();});await expect(page.getByText('₹987',{exact:true}).first()).toBeVisible();expect(f.calls.filter(x=>x==='/api/otp/verify')).toHaveLength(1);expect(f.calls.filter(x=>x.endsWith('/auth'))).toHaveLength(1);await switchPartner(page);await expect(page.getByLabel('4-digit OTP',{exact:true})).toHaveCount(0);});
test('leaving during private read cannot restore campaigns',async({page})=>{const f=await fixture(page,'/api/referral/partner/OLD163/private');await open(page);await code(page);await page.getByRole('button',{name:'Verify & continue',exact:true}).click();await expect.poll(f.started).toBe(true);await page.getByRole('link',{name:/Referral home/}).click();f.release();await expect(page).toHaveURL(/\/referral$/);await expect(page.getByText('₹987',{exact:true})).toHaveCount(0);});
test('late payout response cannot reload the previous private partner; rapid clicks post once',async({page})=>{const f=await fixture(page,'/api/referral/partner/payout');await open(page);await code(page);await page.getByRole('button',{name:'Verify & continue',exact:true}).click();await expect(page.getByText('₹987',{exact:true}).first()).toBeVisible();await page.getByLabel('Amount (₹50 minimum)',{exact:true}).fill('50');await page.getByLabel('Your UPI ID',{exact:true}).fill('fictional@invalid');await page.getByRole('button',{name:'Submit payout request',exact:true}).evaluate((b:HTMLButtonElement)=>{b.click();b.click();});await expect.poll(f.started).toBe(true);await switchPartner(page);f.release();await page.waitForTimeout(100);expect(f.calls.filter(x=>x==='/api/referral/partner/payout')).toHaveLength(1);expect(f.calls.filter(x=>x==='/api/referral/partner/OLD163/private')).toHaveLength(1);await expect(page.getByText('Request submitted for review.',{exact:true})).toHaveCount(0);await expect(page.getByText('₹987',{exact:true})).toHaveCount(0);});
test('private request timeout releases busy and removes private controls',async({page})=>{const f=await fixture(page,'/api/referral/partner/OLD163/private');await page.clock.install();await open(page);await code(page);await page.getByRole('button',{name:'Verify & continue',exact:true}).click();await expect.poll(f.started).toBe(true);await page.clock.fastForward(20001);await expect(page.getByText('Private details could not be confirmed. Verify the registered mobile again.',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Verify & continue',exact:true})).toBeEnabled();await expect(page.getByRole('region',{name:'Creator campaigns'})).toHaveCount(0);f.release();});

for(const cookie of [false,true])test(`partner writes preserve scoped token and member CSRF cookie=${cookie}`,async({page,context})=>{
 await page.addInitScript(()=>{localStorage.setItem('tsap_lang','en');sessionStorage.setItem('tsap_token','fictional-legacy-bearer');});
 if(cookie){const base=String(test.info().project.use.baseURL);await context.addCookies([{name:'mv_member_session',value:'fictional-member-cookie',url:base,httpOnly:true},{name:'mv_member_csrf',value:'fictional-csrf',url:base}]);}
 const writes:string[]=[];let campaign:any=null;const id='CSRF215',campaignId='abcdefghijklmnopqrstuvwx';
 await page.route('**/api/**',async r=>{const u=new URL(r.request().url()),p=u.pathname;const headers=r.request().headers();let data:any={success:true};
  if(r.request().method()==='POST'){
   writes.push(p);
   expect(headers['x-csrf-token']).toBe(cookie?'fictional-csrf':undefined);
   expect(headers['x-tsap-token']).toBeUndefined();
   if(p==='/api/referral/partner/payout'||p.includes(`/api/referral/${id}/campaigns`))expect(headers['x-partner-token']).toBe('fictional-partner-token');
  }
  if(p.endsWith('/auth'))data={success:true,partner_token:'fictional-partner-token'};
  if(p===`/api/referral/partner/${id}`)data={success:true,partner_id:id,clicks:0,registrations:0,paid_count:0};
  if(p.endsWith('/private'))data={success:true,partner_id:id,wallet:150,pending_payout:0,qualifying_rewards_total:150};
  if(p===`/api/referral/${id}/campaigns`){if(r.request().method()==='GET')expect(headers['x-csrf-token']).toBeUndefined();if(r.request().method()==='POST'){const body=r.request().postDataJSON();campaign={id:campaignId,name:body.name,channel:body.channel,status:'active',link:`https://manavivaha.in/r/${id}?campaign=${campaignId}`,clicks:0,registrations:0,eligible_rewards:0,recorded_earnings_inr:0,disclosure_en:'Fictional disclosure',disclosure_te:'పరీక్ష ప్రకటన'};data={success:true,campaign};}else data={success:true,campaigns:campaign?[campaign]:[]};}
  if(p.endsWith(`/${campaignId}/status`)){campaign={...campaign,status:r.request().postDataJSON().status};data={success:true,campaign};}
  if(p==='/api/referral/partner/payout')data={success:true,ok:true,wallet:100,request:{id:'PAY-2611261237-0001',partner_id:id,amount:50,method:'upi',upi_id:'fictional@invalid',status:'requested'}};
  return r.fulfill({json:data});
 });
 await page.goto(localeHref('/referral/register','en'));await page.getByLabel('Partner ID',{exact:true}).fill(id);await page.getByRole('button',{name:'View',exact:true}).click();await page.getByLabel('Registered 10-digit mobile',{exact:true}).fill('9000000000');await page.getByRole('button',{name:'Send OTP',exact:true}).click();await page.getByLabel('4-digit OTP',{exact:true}).fill('1234');await page.getByRole('button',{name:'Verify & continue',exact:true}).click();
 const region=page.getByRole('region',{name:'Creator campaigns'});await expect(region.getByText('No campaigns yet. Create a link for your first video.')).toBeVisible();await region.getByLabel('Campaign name',{exact:true}).fill('Fictional Campaign');await region.getByRole('button',{name:'Create campaign link',exact:true}).click();await expect(region.getByRole('button',{name:'Pause campaign',exact:true})).toBeVisible();await region.getByRole('button',{name:'Pause campaign',exact:true}).click();await expect(region.getByRole('button',{name:'Resume campaign',exact:true})).toBeVisible();
 await page.getByLabel('Amount (₹50 minimum)',{exact:true}).fill('50');await page.getByLabel('Your UPI ID',{exact:true}).fill('fictional@invalid');await page.getByRole('button',{name:'Submit payout request',exact:true}).click();await expect(page.getByText(/Request PAY-2611261237-0001 for ₹50 is queued for review/)).toBeVisible();expect(writes).toEqual(['/api/otp/send','/api/otp/verify',`/api/referral/partner/${id}/auth`,`/api/referral/${id}/campaigns`,`/api/referral/${id}/campaigns/${campaignId}/status`,'/api/referral/partner/payout']);
});


test('partner request gate blocks absolute cross-origin before reading either credential',async()=>{
 const {partnerRequestInit}=await import('../src/lib/partner-request');
 let reads=0,fetches=0;
 const previous=Object.getOwnPropertyDescriptor(globalThis,'document');
 Object.defineProperty(globalThis,'document',{configurable:true,value:{get cookie(){reads++;return 'mv_member_csrf=fictional-csrf';}}});
 try{
  const origin='https://manavivaha.in';
  for(const url of ['https://external.invalid/collect','//external.invalid/collect']){
   const init={method:'POST',get headers(){reads++;return {'X-Partner-Token':'fictional-scoped-token'};}};
   const send=()=>{const prepared=partnerRequestInit(url,init,origin);fetches++;return prepared;};
   expect(send).toThrow('Unsafe partner service path');
  }
  expect(reads).toBe(0);expect(fetches).toBe(0);
 }finally{if(previous)Object.defineProperty(globalThis,'document',previous);else Reflect.deleteProperty(globalThis,'document');}
});
