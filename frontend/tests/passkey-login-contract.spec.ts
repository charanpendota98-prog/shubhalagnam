import {localeHref} from "./locale-href";
import {test,expect} from '@playwright/test';
async function fixture(page:any,lang='en',status=503,body:any={success:true,tsap_id:'FICTIONAL-PASSKEY',auth_token:''}) {
 await page.addInitScript((l:string)=>{
  localStorage.setItem('tsap_lang',l);
  const bytes=new Uint8Array([97]).buffer;
  Object.defineProperty(navigator.credentials,'get',{configurable:true,value:async()=>({id:'fictional-credential',rawId:bytes,type:'public-key',response:{authenticatorData:bytes,clientDataJSON:bytes,signature:bytes,userHandle:null}})});
 },lang);
 const writes:string[]=[];
 await page.route('**/api/**',(r:any)=>{
  const path=new URL(r.request().url()).pathname;
  if(r.request().method()!=='GET')writes.push(path);
  if(path==='/api/auth/capabilities')return r.fulfill({json:{password_login:true,phone_otp:false,email_recovery_configured:false,passkeys_configured:true}});
  if(path==='/api/auth/passkey/login/begin')return r.fulfill({json:{success:true,options:{challenge:'YQ'},challenge_id:'fictional-challenge'}});
  if(path==='/api/auth/passkey/login/finish')return r.fulfill({status,json:body});
  return r.fulfill({status:503,json:{detail:'Isolated fixture only'}});
 });
 await page.goto(localeHref('/login',lang));return writes;
}
for(const lang of ['en','te'])for(const width of [320,390,1280])test(`reject mocked passkey HTTP503 ${lang} ${width}`,async({page})=>{
 await page.setViewportSize({width,height:850});const writes=await fixture(page,lang);
 await page.getByRole('button',{name:/^(Sign in with Passkey|Passkey తో లాగిన్)/}).click();
 await expect(page.locator('[role=status][aria-live=polite]')).not.toHaveClass(/emerald/);
 await expect(page.locator('[role=status][aria-live=polite]')).toContainText(lang==='te'?'నిర్ధారించలేదు':'did not confirm');
 await page.waitForTimeout(750);await expect(page).toHaveURL(/\/login$/);
 expect(await page.evaluate(()=>localStorage.getItem('tsap_id'))).toBeNull();expect(writes).toEqual(['/api/auth/passkey/login/begin','/api/auth/passkey/login/finish']);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 await page.locator('h1').click();await page.evaluate(()=>window.scrollTo(0,0));
 await page.screenshot({path:`artifacts/passkey-contract/after-${lang}-${width}.png`,fullPage:true});
});
for(const status of [202,400,401,403])test(`reject mocked passkey HTTP${status}`,async({page})=>{
 await fixture(page,'en',status);await page.getByRole('button',{name:/^Sign in with Passkey/}).click();await expect(page.locator('[role=status][aria-live=polite]')).toContainText('did not confirm');await page.waitForTimeout(700);await expect(page).toHaveURL(/\/login$/);expect(await page.evaluate(()=>localStorage.getItem('tsap_id'))).toBeNull();
});
test('reject mocked passkey contradictory account state',async({page})=>{
 await fixture(page,'en',200,{success:true,tsap_id:'FICTIONAL-PASSKEY',auth_token:'',has_account:false});await page.getByRole('button',{name:/^Sign in with Passkey/}).click();await expect(page.locator('[role=status][aria-live=polite]')).toContainText('did not confirm');await page.waitForTimeout(700);await expect(page).toHaveURL(/\/login$/);expect(await page.evaluate(()=>localStorage.getItem('tsap_id'))).toBeNull();
});
test('mocked confirmed passkey cookie session remains supported',async({page})=>{
 await fixture(page,'en',200);await page.getByRole('button',{name:/^Sign in with Passkey/}).click();await expect(page).toHaveURL(/\/requests$/);expect(await page.evaluate(()=>localStorage.getItem('tsap_id'))).toBe('FICTIONAL-PASSKEY');
});
test('superseded mocked passkey response cannot store a session or redirect',async({page})=>{
 await fixture(page,'en',200);let started=false;let release:()=>void=()=>{};const pending=new Promise<void>(resolve=>release=resolve);
 await page.route('**/api/auth/passkey/login/finish',async r=>{started=true;await pending;await r.fulfill({json:{success:true,tsap_id:'FICTIONAL-STALE',auth_token:''}})});
 await page.getByRole('button',{name:/^Sign in with Passkey/}).click();await expect.poll(()=>started).toBe(true);await page.locator('#login-phone').fill('9876501234');release();await page.waitForTimeout(800);await expect(page).toHaveURL(/\/login$/);expect(await page.evaluate(()=>localStorage.getItem('tsap_id'))).toBeNull();
});

for(const lang of ['en','te'])for(const width of [320,390,1280])test(`bounded passkey network retry ${lang} ${width}`,async({page})=>{
 await page.setViewportSize({width,height:850});await fixture(page,lang,200);let calls=0;let stall=true;
 await page.route('**/api/auth/passkey/login/begin',async r=>{calls++;if(stall)return;await r.fulfill({json:{success:true,options:{challenge:'YQ'},challenge_id:'fictional-challenge'}})});
 const button=page.getByRole('button',{name:/^(Sign in with Passkey|Passkey తో లాగిన్)/}),feedback=page.locator('[role=status][aria-live=polite]');
 await page.clock.install();await button.click();await expect.poll(()=>calls).toBe(1);await page.clock.fastForward(20_001);
 await expect(feedback).toContainText(lang==='te'?'నిర్ధారించలేదు':'did not confirm');await expect(button).toBeEnabled();expect(await page.evaluate(()=>localStorage.getItem('tsap_id'))).toBeNull();
 await page.clock.resume();await page.locator('h1').click();await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:`artifacts/passkey-contract/timeout-${lang}-${width}.png`,fullPage:true});
 stall=false;await page.clock.resume();await button.click();await expect(page).toHaveURL(/\/requests$/);expect(await page.evaluate(()=>localStorage.getItem('tsap_id'))).toBe('FICTIONAL-PASSKEY');
});
