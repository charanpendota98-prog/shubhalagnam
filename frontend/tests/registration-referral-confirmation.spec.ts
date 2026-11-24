import {localeHref} from "./locale-href";
import {test,expect} from '@playwright/test';
import {registrationReferralCheck} from '../src/lib/registration-referral-confirmation';
import fs from 'node:fs';
fs.mkdirSync('artifacts/registration-referral-confirmation',{recursive:true});
const valid={success:true,ok:true,valid_code:true,code:'MVREFTEST',referrer_name:'Fixture Referrer',bonus_credits:1};
for(const status of [201,202,204,400,401,409,429,500])test(`referral rejects HTTP ${status}`,()=>expect(registrationReferralCheck(status,valid,'MVREFTEST','click').state).toBe('unconfirmed'));
for(const [i,extra] of [null,[],{}, {...valid,success:false},{...valid,success:'true'},{...valid,valid_code:'true'},{...valid,ok:false},{...valid,ok:undefined},{...valid,code:'OTHER'},{...valid,referrer_name:{}},{...valid,referrer_name:''},{...valid,referrer_name:' '.repeat(10)},{...valid,bonus_credits:-1},{...valid,bonus_credits:'1'},{...valid,bonus_credits:1.5},{...valid,bonus_credits:undefined},{...valid,error:'rejected'},{...valid,detail:'pending'}].entries())test(`referral rejects contradictory payload ${i}`,()=>expect(registrationReferralCheck(200,extra,'MVREFTEST','click').state).toBe('unconfirmed'));
test('referral permits confirmed zero credits and validated aliases',()=>{expect(registrationReferralCheck(200,{...valid,bonus_credits:0},'MVREFTEST','click')).toMatchObject({state:'valid',info:{bonus_credits:0}});expect(registrationReferralCheck(200,{...valid,alias:'MVALIAS'},'MVALIAS','validate').state).toBe('valid');expect(registrationReferralCheck(200,{...valid,alias:'MVALIAS'},'MVALIAS','click').state).toBe('unconfirmed');expect(registrationReferralCheck(200,{success:true,ok:false,valid_code:false},'MVREFTEST','validate').state).toBe('invalid');});
for(const lang of ['en','te'])for(const width of [320,390,1280])test(`registration referral honest retry ${lang} ${width}`,async({page})=>{
 await page.setViewportSize({width,height:1000});await page.addInitScript(l=>localStorage.setItem('tsap_lang',l),lang);
 let reads=0;const writes:string[]=[];const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/**',r=>{const path=new URL(r.request().url()).pathname;if(r.request().method()!=='GET')writes.push(path);
 if(path==='/api/referral/click/MVREFTEST')return r.fulfill({status:500,json:{...valid,success:false,bonus_credits:999}});
 if(path==='/api/referral/validate/MVREFTEST'){reads++;return r.fulfill({json:reads===1?{success:true,ok:false,valid_code:false,code:'MVREFTEST'}:{...valid,bonus_credits:0}});}
 if(path==='/api/auth/capabilities')return r.fulfill({json:{password_login:true,login_identifier:'phone',phone_otp:false,email_recovery_configured:true,passkeys_configured:false,email_optional_at_registration:true}});
 return r.fulfill({json:{success:true,castes:['Kapu'],items:[]}});});
 await page.goto(localeHref('/register?ref=MVREFTEST',lang));const banner=page.getByTestId('registration-referral-banner');await expect(banner).toContainText(lang==='en'?'Bonus request-credit eligibility is not confirmed.':'అర్హత ఇంకా నిర్ధారణ కాలేదు.');await expect(banner).not.toContainText('999');await expect(banner).not.toContainText('Fixture Referrer');await banner.screenshot({path:`artifacts/registration-referral-confirmation/error-${lang}-${width}.png`});
 const retry=banner.getByRole('button',{name:lang==='en'?'Check the code again':'కోడ్‌ను మళ్లీ తనిఖీ చేయండి',exact:true});await retry.click();await expect(banner).toContainText(lang==='en'?'You can register without a referral.':'సిఫార్సు లేకుండానే నమోదు చేసుకోవచ్చు.');await retry.click();await expect(banner).toContainText('Fixture Referrer');await expect(banner).toContainText(lang==='en'?'Bonus request credits: 0':'అదనపు పరిచయ అభ్యర్థనలు: 0');await expect(banner).not.toContainText('+1');await expect(retry).toHaveCount(0);await banner.screenshot({path:`artifacts/registration-referral-confirmation/confirmed-${lang}-${width}.png`});
 await page.reload();await expect(banner).toContainText('Fixture Referrer');expect(reads).toBe(3);expect(writes).toEqual(['/api/referral/click/MVREFTEST']);expect(errors).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
test('a stalled referral read times out and retries without another tracking write',async({page})=>{
 await page.addInitScript(()=>{localStorage.setItem('tsap_lang','en');sessionStorage.setItem('tsap_click_fired','1');});let reads=0;let writes=0;
 await page.route('**/api/**',r=>{if(r.request().method()!=='GET')writes++;if(r.request().url().includes('/api/referral/validate/')){reads++;return reads===1?undefined:r.fulfill({json:valid});}return r.fulfill({json:{success:true}});});
 await page.clock.install();await page.goto('/register?ref=MVREFTEST');await expect.poll(()=>reads).toBe(1);const banner=page.getByTestId('registration-referral-banner');await expect(banner).toContainText('Checking');await page.clock.fastForward(20_001);await expect(banner).toContainText('not confirmed');await banner.getByRole('button',{name:'Check the code again'}).click();await expect(banner).toContainText('Fixture Referrer');expect(reads).toBe(2);expect(writes).toBe(0);
});
test('a late old-code reply cannot replace the current referral',async({page})=>{
 await page.addInitScript(()=>{localStorage.setItem('tsap_lang','en');sessionStorage.setItem('tsap_click_fired','1');});let releaseOld:()=>void=()=>{};const oldReady=new Promise<void>(resolve=>releaseOld=resolve);let oldSeen=false;
 await page.route('**/api/**',async r=>{const path=new URL(r.request().url()).pathname;if(path==='/api/referral/validate/MVREFTEST'){oldSeen=true;await oldReady;return r.fulfill({json:valid}).catch(()=>{});}if(path==='/api/referral/validate/MVREFNEW')return r.fulfill({json:{...valid,code:'MVREFNEW',referrer_name:'New Fixture Referrer'}});return r.fulfill({json:{success:true}});});
 await page.goto('/register?ref=MVREFTEST');await expect.poll(()=>oldSeen).toBe(true);await page.evaluate(()=>history.pushState(null,'','/register?ref=MVREFNEW'));const banner=page.getByTestId('registration-referral-banner');await expect(banner).toContainText('New Fixture Referrer');releaseOld();await expect(banner).toContainText('New Fixture Referrer');await expect(banner).not.toContainText('Referred by Fixture Referrer');
});
test('referral body-read timeout leaves checking and stays retryable',async({page})=>{
 await page.addInitScript(()=>{
  localStorage.setItem('tsap_lang','en');sessionStorage.setItem('tsap_click_fired','1');const original=window.fetch.bind(window);let calls=0;
  window.fetch=(input,init)=>{
   if(String(input).includes('/api/referral/validate/')){calls++;return Promise.resolve(calls===1?({status:200,text:()=>new Promise<string>(()=>{})} as Response):new Response(JSON.stringify({success:true,ok:true,valid_code:true,code:'MVREFTEST',referrer_name:'Fixture Referrer',bonus_credits:1}),{status:200}));}
   return original(input,init);
  };
 });
 await page.route('**/api/**',r=>r.fulfill({json:{success:true}}));await page.clock.install();await page.goto('/register?ref=MVREFTEST');const banner=page.getByTestId('registration-referral-banner');await expect(banner).toContainText('Checking');await page.clock.fastForward(20_001);await expect(banner).toContainText('not confirmed');await banner.getByRole('button',{name:'Check the code again'}).click();await expect(banner).toContainText('Fixture Referrer');
});
test('blocked session storage uses read-only validation without a page error',async({page})=>{
 await page.addInitScript(()=>{localStorage.setItem('tsap_lang','en');const get=Storage.prototype.getItem;const set=Storage.prototype.setItem;Storage.prototype.getItem=function(key){if(this===sessionStorage)throw new Error('Fixture denied');return get.call(this,key);};Storage.prototype.setItem=function(key,value){if(this===sessionStorage)throw new Error('Fixture denied');return set.call(this,key,value);};});
 let writes=0,reads=0;const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.route('**/api/**',r=>{if(r.request().method()!=='GET')writes++;if(r.request().url().includes('/api/referral/validate/')){reads++;return r.fulfill({json:valid});}return r.fulfill({json:{success:true}});});await page.goto('/register?ref=MVREFTEST');await expect(page.getByTestId('registration-referral-banner')).toContainText('Fixture Referrer');expect(reads).toBe(1);expect(writes).toBe(0);expect(errors).toEqual([]);
});
