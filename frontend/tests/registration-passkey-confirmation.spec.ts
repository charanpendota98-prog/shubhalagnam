import {localeHref} from "./locale-href";
import {test,expect,type Page} from '@playwright/test';
import fs from 'node:fs';
fs.mkdirSync('artifacts/registration-passkey',{recursive:true});
async function register(page:Page,mode:'off'|'on'|'error'|'malformed'){
 await page.addInitScript(()=>localStorage.setItem('tsap_lang','en'));
 let passkeyWrites=0;
 await page.route('**/api/**',r=>{const path=new URL(r.request().url()).pathname;
  if(path==='/api/auth/capabilities')return r.fulfill({status:mode==='error'?503:200,json:mode==='malformed'?{success:true}:{password_login:true,login_identifier:'phone',phone_otp:false,email_recovery_configured:false,passkeys_configured:mode==='on',email_optional_at_registration:true}});
  if(path.includes('passkey')||path.includes('webauthn'))passkeyWrites++;
  if(path==='/api/register')return r.fulfill({json:{success:true,tsap_id:'SYN-GATE',card_url:'',phone_verified:false,is_approved:false,plan:'FREE',credits:3,email_verify:{required:false}}});
  return r.fulfill({json:{success:true,castes:['Kapu'],districts:['Hyderabad'],items:[]}});
 });
 await page.goto(localeHref('/register','en'));await page.getByRole('button',{name:/Bride/}).click();await page.getByLabel('Full Name',{exact:false}).fill('Synthetic Capability Test');await page.locator('input[type=date]').fill('1998-01-01');await page.locator('#quick-religion').selectOption('Hindu');
 await page.getByRole('button',{name:/Select a community/}).click();await page.getByRole('button',{name:'Kapu',exact:true}).click();await page.getByLabel('State',{exact:true}).selectOption('TS');await page.getByRole('button',{name:/Select a district/}).click();await page.getByRole('button',{name:'Hyderabad',exact:true}).click();
 await page.getByLabel('Mobile number (10 digits)',{exact:false}).fill('9000000001');await page.getByLabel('Password (minimum 6 characters)',{exact:true}).fill('synthetic-test-only');
 await page.getByLabel('Choose a photo from your gallery',{exact:true}).setInputFiles('tests/fixtures/synthetic-profile.jpg');await page.getByRole('checkbox',{name:/I have permission to upload this photo/}).check();await page.locator('#registration-consent').check();
 await page.getByRole('button',{name:'Create my profile in 1 minute',exact:false}).click();await expect(page.getByRole('heading',{name:'Registration Successful!',exact:true})).toBeVisible();return()=>passkeyWrites;
}


for(const lang of ['en','te'])for(const width of [320,390,1280])test(`registration passkey confirmation retry cookie session ${lang} ${width}`,async({page})=>{
 await page.setViewportSize({width,height:900});
 await page.addInitScript(()=>{const bytes=new Uint8Array([97]).buffer;Object.defineProperty(navigator.credentials,'create',{configurable:true,value:async()=>({id:'fictional',rawId:bytes,type:'public-key',response:{attestationObject:bytes,clientDataJSON:bytes,getTransports:()=>[]}})});});
 const dialogs:string[]=[];page.on('dialog',async d=>{dialogs.push(d.message());await d.dismiss()});
 await register(page,'on');if(lang==='te')await page.getByRole('button',{name:'తెలుగులో చూపించండి',exact:true}).click();
 let status=500,body:any={success:true},calls=0;let release:()=>void=()=>{};let pending:Promise<void>|null=null;let stall=false;
 await page.route('**/api/auth/passkey/register/*',async r=>{const p=new URL(r.request().url()).pathname;calls++;if(stall)return;
 if(p.endsWith('/begin'))return r.fulfill({json:{success:true,challenge_id:'fictional',options:{challenge:'YQ',user:{id:'YQ'},rp:{name:'Fixture',id:'localhost'},pubKeyCredParams:[{type:'public-key',alg:-7}]}}});
 if(pending)await pending;return r.fulfill({status,json:body});});
 const input=page.getByLabel(lang==='en'?'Your password':'మీ పాస్‌వర్డ్',{exact:true}),button=page.getByRole('button',{name:lang==='en'?'Register Passkey':'పాస్‌కీ సెటప్ చేయండి',exact:true}),feedback=page.locator('#registration-passkey-feedback');
 await input.fill('fixture-only');await button.click();await expect(feedback).toContainText(lang==='en'?'could not confirm':'నిర్ధారించలేకపోయాం');await expect(input).toHaveValue('fixture-only');expect(calls).toBe(2);expect(dialogs).toEqual([]);
 if(lang==='en'&&width===1280){for(const reply of [{s:202,b:{success:true}},{s:200,b:{success:'true'}},{s:200,b:{success:true,detail:'Rejected'}}]){status=reply.s;body=reply.b;await button.click();await expect(feedback).toContainText('could not confirm');await expect(input).toHaveValue('fixture-only');}}
 if(lang==='en'&&width===1280){stall=true;await page.clock.install();const beforeTimeout=calls;await button.click();await expect.poll(()=>calls).toBe(beforeTimeout+1);await page.clock.fastForward(20_001);await expect(feedback).toContainText('could not confirm');await expect(input).toHaveValue('fixture-only');await expect(button).toBeEnabled();stall=false;await page.clock.resume();}
 await feedback.scrollIntoViewIfNeeded();await page.screenshot({path:`artifacts/registration-passkey/error-${lang}-${width}.png`});
 status=200;body={success:true};pending=new Promise<void>(r=>release=r);const before=calls;await button.click();await expect(page.getByRole('button',{name:lang==='en'?'Setting up...':'సెటప్ అవుతోంది...',exact:true})).toBeDisabled();await expect.poll(()=>calls).toBe(before+2);await input.press('Enter');expect(calls).toBe(before+2);release();await expect(feedback).toContainText(lang==='en'?'setup is confirmed':'సెటప్ పూర్తయింది');await expect(input).toHaveValue('');await expect(button).toBeDisabled();expect(dialogs).toEqual([]);await feedback.scrollIntoViewIfNeeded();await page.screenshot({path:`artifacts/registration-passkey/success-${lang}-${width}.png`});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();
});
