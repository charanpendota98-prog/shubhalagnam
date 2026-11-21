import {test,expect,type Page} from '@playwright/test';
import {confirmedEmailResend} from '../src/lib/email-verification-confirmation';
import fs from 'node:fs';
fs.mkdirSync('artifacts/registration-email-resend',{recursive:true});
async function fill(page:Page){
 await page.goto('/register');await page.getByRole('button',{name:/Bride/}).click();await page.getByLabel('Full Name',{exact:false}).fill('Synthetic Capability Test');await page.locator('input[type=date]').fill('1998-01-01');await page.locator('#quick-religion').selectOption('Hindu');
 await page.getByRole('button',{name:/Select a community/}).click();await page.getByRole('button',{name:'Kapu',exact:true}).click();await page.getByLabel('State',{exact:true}).selectOption('TS');await page.getByRole('button',{name:/Select a district/}).click();await page.getByRole('button',{name:'Hyderabad',exact:true}).click();
 await page.getByLabel('Mobile number (10 digits)',{exact:false}).fill('9000000001');await page.getByLabel('Password (minimum 6 characters)',{exact:true}).fill('synthetic-test-only');
 await page.getByLabel('Choose a photo from your gallery',{exact:true}).setInputFiles('tests/fixtures/synthetic-profile.jpg');await page.getByRole('checkbox',{name:/I have permission to upload this photo/}).check();await page.locator('#registration-consent').check();
 
}
const registration={tsap_id:'MV1001',card_url:'',credits:4,phone_verified:false,is_approved:false,email_verify:{required:true,verified:false,sent:false}};
for(const status of [201,202,204,400,401,409,429,500])test(`resend rejects incomplete status ${status}`,()=>expect(confirmedEmailResend(status,{success:true,sent:true})).toBeNull());
for(const [i,reply]of[null,[],{}, {success:'true',sent:true},{success:true},{success:true,sent:false},{success:false,sent:true},{success:true,sent:'true'},{success:true,already_verified:'true'},{success:true,sent:true,already_verified:true},{success:true,sent:true,error:'rejected'},{success:true,sent:true,detail:'pending'}].entries())test(`resend rejects malformed response ${i}`,()=>expect(confirmedEmailResend(200,reply)).toBeNull());
test('resend accepts only completed send or already verified',()=>{expect(confirmedEmailResend(200,{success:true,sent:true})).toBe('sent');expect(confirmedEmailResend(200,{success:true,already_verified:true})).toBe('verified');});
for(const lang of ['en','te'])for(const width of [320,390,1280])test(`email resend safe recovery ${lang} ${width}`,async({page})=>{
 await page.setViewportSize({width,height:1000});await page.addInitScript(()=>localStorage.setItem('tsap_lang','en'));
 let status=503,reply:any={success:true,sent:true};const writes:{path:string,data:any}[]=[];const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/**',r=>{const path=new URL(r.request().url()).pathname;if(r.request().method()!=='GET')writes.push({path,data:path==='/api/auth/send-verify-email'?r.request().postDataJSON():null});
 if(path==='/api/register')return r.fulfill({status:201,json:registration});
 if(path==='/api/auth/send-verify-email')return r.fulfill({status,json:reply});
 if(path==='/api/auth/verify-email')return r.fulfill({json:{success:true,email_verified:true}});
 if(path==='/api/auth/capabilities')return r.fulfill({json:{password_login:true,login_identifier:'phone',phone_otp:false,email_recovery_configured:true,passkeys_configured:false,email_optional_at_registration:true}});
 return r.fulfill({json:{success:true,castes:['Kapu'],districts:['Hyderabad'],items:[]}});});
 await fill(page);await page.getByRole('button',{name:'Create my profile in 1 minute',exact:false}).click();await expect(page.getByRole('heading',{name:'Registration Successful!',exact:true})).toBeVisible();
 if(lang==='te')await page.getByRole('button',{name:'తెలుగులో చూపించండి',exact:true}).click();
 const code=page.locator('#email-verify-code'),password=page.locator('#email-resend-password'),feedback=page.locator('#email-resend-feedback');const submit=page.getByRole('button',{name:lang==='en'?'Request a new email code':'కొత్త ఈమెయిల్ కోడ్ కోరండి',exact:true});
 await expect(page.getByText(lang==='en'?'The code could not be sent. Your email is not verified yet; keep your password safe.':'కోడ్ పంపడం సాధ్యపడలేదు. మీ ఈమెయిల్ ఇంకా ధృవీకరించబడలేదు; పాస్‌వర్డ్‌ను భద్రంగా ఉంచండి.',{exact:true})).toBeVisible();
 await code.fill('12345678');await submit.click();await expect(feedback).toContainText(lang==='en'?'Enter your account password.':'మీ ఖాతా పాస్‌వర్డ్ నమోదు చేయండి.');expect(writes.length).toBe(1);
 await password.fill('fictional-password');await submit.click();await expect(feedback).toContainText(lang==='en'?'could not confirm':'నిర్ధారించలేకపోయాం');await expect(code).toHaveValue('12345678');await expect(password).toHaveValue('');
 if(lang==='en'&&width===1280){for(const [st,body]of[[200,{success:'true',sent:true}],[202,{success:true,sent:true}],[401,{detail:'not authorised'}],[429,{detail:'wait'}]]as const){status=st;reply=body;await password.fill('fictional-password');await submit.click();await expect(feedback).toContainText('could not confirm');await expect(code).toHaveValue('12345678');}}
 await feedback.scrollIntoViewIfNeeded();await page.locator("#email-verify-code").locator("xpath=ancestor::div[contains(@class,'bg-blue-50')]").screenshot({path:`artifacts/registration-email-resend/error-${lang}-${width}.png`});
 status=200;reply={success:true,sent:true};await password.fill('fictional-password');await submit.click();await expect(feedback).toContainText(lang==='en'?'A new code request was accepted':'కొత్త కోడ్ పంపే అభ్యర్థన అంగీకరించబడింది');await expect(code).toHaveValue('');await expect(password).toHaveValue('');await expect(page.locator('#email-verification-feedback')).not.toContainText('Your email is verified');
 await expect(page.getByText(lang==='en'?'The code could not be sent. Your email is not verified yet; keep your password safe.':'కోడ్ పంపడం సాధ్యపడలేదు. మీ ఈమెయిల్ ఇంకా ధృవీకరించబడలేదు; పాస్‌వర్డ్‌ను భద్రంగా ఉంచండి.',{exact:true})).toHaveCount(0);
 await feedback.scrollIntoViewIfNeeded();await page.locator("#email-verify-code").locator("xpath=ancestor::div[contains(@class,'bg-blue-50')]").screenshot({path:`artifacts/registration-email-resend/accepted-${lang}-${width}.png`});
 await code.fill('87654321');await page.getByRole('button',{name:lang==='en'?'Verify':'ధృవీకరించండి',exact:true}).click();await expect(code).toHaveCount(0);await expect(password).toHaveCount(0);
 expect(writes.every(w=>['/api/register','/api/auth/send-verify-email','/api/auth/verify-email'].includes(w.path))).toBe(true);
 const send=writes.find(w=>w.path==='/api/auth/send-verify-email');expect(send?.data).toEqual({tsap_id:'MV1001',password:'fictional-password'});expect(errors).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
test('email resend pending request prevents duplicates, times out and recovers already verified',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('tsap_lang','en'));let count=0,verifyCount=0;
 await page.route('**/api/**',r=>{const path=new URL(r.request().url()).pathname;
 if(path==='/api/register')return r.fulfill({status:201,json:registration});
 if(path==='/api/auth/send-verify-email'){count++;return count===1?undefined:r.fulfill({json:{success:true,already_verified:true}});}
 if(path==='/api/auth/verify-email')verifyCount++;
 if(path==='/api/auth/capabilities')return r.fulfill({json:{password_login:true,login_identifier:'phone',phone_otp:false,email_recovery_configured:true,passkeys_configured:false,email_optional_at_registration:true}});
 return r.fulfill({json:{success:true,castes:['Kapu'],districts:['Hyderabad'],items:[]}});});
 await fill(page);await page.getByRole('button',{name:'Create my profile in 1 minute',exact:false}).click();const password=page.locator('#email-resend-password'),code=page.locator('#email-verify-code'),feedback=page.locator('#email-resend-feedback');await expect(password).toBeVisible();await page.clock.install();await password.fill('fictional-password');await code.fill('12345678');await password.press('Enter');await expect.poll(()=>count).toBe(1);await password.press('Enter');await expect(page.getByRole('button',{name:'Verify',exact:true})).toBeDisabled();await expect(code).toBeDisabled();expect(count).toBe(1);expect(verifyCount).toBe(0);await page.clock.fastForward(20_001);await expect(feedback).toContainText('could not confirm');await expect(code).toHaveValue('12345678');await expect(password).toHaveValue('');await password.fill('fictional-password');await password.press('Enter');await expect(page.locator('#email-verification-feedback')).toContainText('Your email is verified');await expect(password).toHaveCount(0);expect(count).toBe(2);expect(verifyCount).toBe(0);
});
