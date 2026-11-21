import {test,expect,type Page} from '@playwright/test';
import fs from 'node:fs';
import {confirmedEmailVerification} from '../src/lib/email-verification-confirmation';
fs.mkdirSync('artifacts/registration-email-confirmation',{recursive:true});
async function fill(page:Page){
 await page.goto('/register');await page.getByRole('button',{name:/Bride/}).click();await page.getByLabel('Full Name',{exact:false}).fill('Synthetic Capability Test');await page.locator('input[type=date]').fill('1998-01-01');await page.locator('#quick-religion').selectOption('Hindu');
 await page.getByRole('button',{name:/Select a community/}).click();await page.getByRole('button',{name:'Kapu',exact:true}).click();await page.getByLabel('State',{exact:true}).selectOption('TS');await page.getByRole('button',{name:/Select a district/}).click();await page.getByRole('button',{name:'Hyderabad',exact:true}).click();
 await page.getByLabel('Mobile number (10 digits)',{exact:false}).fill('9000000001');await page.getByLabel('Password (minimum 6 characters)',{exact:true}).fill('synthetic-test-only');
 await page.getByLabel('Choose a photo from your gallery',{exact:true}).setInputFiles('tests/fixtures/synthetic-profile.jpg');await page.getByRole('checkbox',{name:/I have permission to upload this photo/}).check();await page.locator('#registration-consent').check();
 
}


const registration={tsap_id:'MV1001',card_url:'',credits:4,phone_verified:false,is_approved:false,email_verify:{required:true,verified:false,sent:true}};
const invalid:any[]=[{},null,[],{success:'true',email_verified:true},{success:true},{success:true,email_verified:false},{success:true,email_verified:'true'},{success:true,already_verified:'true'},{success:false,email_verified:true},{success:true,email_verified:true,detail:'Contradictory error'},{success:true,email_verified:true,error:'Rejected'}];
for(const [i,reply] of invalid.entries())test(`email verification rejects malformed confirmation ${i}`,()=>expect(confirmedEmailVerification(200,reply)).toBe(false));
for(const status of [201,202,204,400,409,500])test(`email verification rejects incomplete status ${status}`,()=>expect(confirmedEmailVerification(status,{success:true,email_verified:true})).toBe(false));
for(const reply of [{success:true,email_verified:true},{success:true,already_verified:true}])test(`email verification accepts backend state ${JSON.stringify(reply)}`,()=>expect(confirmedEmailVerification(200,reply)).toBe(true));
for(const lang of ['en','te'])for(const width of [320,390,1280])test(`post-registration verification safe retry ${lang} ${width}`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.addInitScript(()=>localStorage.setItem('tsap_lang','en'));
 const alerts:string[]=[],errors:string[]=[];page.on('dialog',async d=>{alerts.push(d.message());await d.accept()});page.on('pageerror',e=>errors.push(e.message));
 let status=500,reply:any={success:true,email_verified:true},network=false;const writes:string[]=[];
 await page.route('**/api/**',r=>{const p=new URL(r.request().url()).pathname;
 if(r.request().method()!=='GET')writes.push(p);
 if(p==='/api/register')return r.fulfill({status:201,json:registration});
 if(p==='/api/auth/verify-email')return network?r.abort('failed'):status===204?r.fulfill({status:204,body:''}):r.fulfill({status,json:reply});
 if(p==='/api/auth/capabilities')return r.fulfill({json:{password_login:true,login_identifier:'phone',phone_otp:false,email_recovery_configured:true,passkeys_configured:false,email_optional_at_registration:true}});
 return r.fulfill({json:{success:true,castes:['Kapu'],districts:['Hyderabad'],items:[]}});
 });
 await fill(page);await page.getByRole('button',{name:'Create my profile in 1 minute',exact:false}).click();await expect(page.getByRole('heading',{name:'Registration Successful!',exact:true})).toBeVisible();
 if(lang==='te')await page.getByRole('button',{name:'తెలుగులో చూపించండి',exact:true}).click();
 const input=page.locator('#email-verify-code'),submit=page.getByRole('button',{name:lang==='en'?'Verify':'ధృవీకరించండి',exact:true}),feedback=page.locator('#email-verification-feedback');
 await input.fill('123');await submit.click();await expect(feedback).toContainText(lang==='en'?'eight-digit':'8 అంకెల');expect(writes).toEqual(['/api/register']);
 await input.fill('12345678');await submit.click();await expect(feedback).toContainText(lang==='en'?'could not confirm':'నిర్ధారించలేకపోయాం');await expect(input).toHaveValue('12345678');expect(alerts).toEqual([]);
 if(lang==='en'&&width===1280){for(const code of [202,204,200]){status=code;reply={success:'true',email_verified:true};await submit.click();await expect(feedback).toContainText('could not confirm');await expect(input).toHaveValue('12345678');}network=true;await submit.click();await expect(feedback).toContainText('could not confirm');await expect(input).toHaveValue('12345678');network=false;}
 await page.evaluate(()=>{document.documentElement.style.scrollBehavior='auto';window.scrollTo({top:0,behavior:'instant'});});await expect.poll(()=>page.evaluate(()=>scrollY)).toBe(0);await page.screenshot({path:`artifacts/registration-email-confirmation/error-${lang}-${width}.png`});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 status=200;reply=width===390?{success:true,already_verified:true}:{success:true,email_verified:true};await submit.click();await expect(feedback).toContainText(lang==='en'?'Your email is verified':'మీ ఈమెయిల్ ధృవీకరించబడింది');await expect(input).toHaveCount(0);await expect(submit).toHaveCount(0);await page.evaluate(()=>{document.documentElement.style.scrollBehavior='auto';window.scrollTo({top:0,behavior:'instant'});});await expect.poll(()=>page.evaluate(()=>scrollY)).toBe(0);await page.screenshot({path:`artifacts/registration-email-confirmation/success-${lang}-${width}.png`});expect(alerts).toEqual([]);expect(errors).toEqual([]);expect(writes.every(p=>p==='/api/register'||p==='/api/auth/verify-email')).toBe(true);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});

test('email verification ignores edited-code response and prevents duplicate requests',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('tsap_lang','en'));let release:()=>void=()=>{},count=0;const pending=new Promise<void>(r=>release=r);
 await page.route('**/api/**',async r=>{const p=new URL(r.request().url()).pathname;
 if(p==='/api/register')return r.fulfill({status:201,json:registration});
 if(p==='/api/auth/verify-email'){count++;if(count===1)await pending;return r.fulfill({json:{success:true,email_verified:true}})}
 if(p==='/api/auth/capabilities')return r.fulfill({json:{password_login:true,login_identifier:'phone',phone_otp:false,email_recovery_configured:true,passkeys_configured:false,email_optional_at_registration:true}});
 return r.fulfill({json:{success:true,castes:['Kapu'],districts:['Hyderabad'],items:[]}});
 });
 await fill(page);await page.getByRole('button',{name:'Create my profile in 1 minute',exact:false}).click();const input=page.locator('#email-verify-code'),feedback=page.locator('#email-verification-feedback');await expect(input).toBeVisible();await input.fill('12345678');await input.press('Enter');await expect(page.getByRole('button',{name:'Checking…',exact:true})).toBeDisabled();await input.press('Enter');expect(count).toBe(1);await input.fill('87654321');release();await expect(page.getByRole('button',{name:'Verify',exact:true})).toBeEnabled();await expect(input).toHaveValue('87654321');await expect(feedback).toBeEmpty();await input.press('Enter');await expect(feedback).toContainText('Your email is verified');expect(count).toBe(2);
});
