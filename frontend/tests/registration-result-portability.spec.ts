import {test,expect,type Page} from '@playwright/test';
import fs from 'node:fs';
fs.mkdirSync('artifacts/registration-result-portability',{recursive:true});
async function fill(page:Page){
 await page.goto('/register');await page.getByRole('button',{name:/Bride/}).click();await page.getByLabel('Full Name',{exact:false}).fill('Synthetic Capability Test');await page.locator('input[type=date]').fill('1998-01-01');await page.locator('#quick-religion').selectOption('Hindu');
 await page.getByRole('button',{name:/Select a community/}).click();await page.getByRole('button',{name:'Kapu',exact:true}).click();await page.getByLabel('State',{exact:true}).selectOption('TS');await page.getByRole('button',{name:/Select a district/}).click();await page.getByRole('button',{name:'Hyderabad',exact:true}).click();
 await page.getByLabel('Mobile number (10 digits)',{exact:false}).fill('9000000001');await page.getByLabel('Password (minimum 6 characters)',{exact:true}).fill('synthetic-test-only');
 await page.getByLabel('Choose a photo from your gallery',{exact:true}).setInputFiles('tests/fixtures/synthetic-profile.jpg');await page.getByRole('checkbox',{name:/I have permission to upload this photo/}).check();await page.locator('#registration-consent').check();
 
}
for(const lang of ['en','te'])for(const width of [320,390,1280])test(`portable registration result ${lang} ${width}`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.addInitScript(()=>localStorage.setItem('tsap_lang','en'));const writes:string[]=[];
 await page.route('**/api/**',r=>{const p=new URL(r.request().url()).pathname;if(r.request().method()!=='GET')writes.push(p);
 if(p==='/api/register')return r.fulfill({status:201,json:{success:true,tsap_id:'FICTIONAL-RESULT',card_url:'',credits:4,phone_verified:false,is_approved:false,email_verify:{required:true,verified:false,sent:true},referral:{my_code:'FIXTURE',joined_with:{ok:true,bonus_credits:1}}}});
 if(p==='/api/photo/status/FICTIONAL-RESULT')return r.fulfill({json:{photo_url:'',photo_status:'pending',photo_reason:'',photo_reason_te:''}});
 if(p==='/api/auth/capabilities')return r.fulfill({json:{password_login:true,login_identifier:'phone',phone_otp:false,email_recovery_configured:true,passkeys_configured:true,email_optional_at_registration:true}});
 return r.fulfill({json:{success:true,castes:['Kapu'],districts:['Hyderabad'],items:[]}});
 });
 await fill(page);await page.getByRole('button',{name:'Create my profile in 1 minute',exact:false}).click();await expect(page.getByRole('heading',{name:'Registration Successful!',exact:true})).toBeVisible();if(lang==='te')await page.getByRole('button',{name:'తెలుగులో చూపించండి',exact:true}).click();
 await expect(page.getByRole('heading',{name:lang==='en'?'Photo is waiting for staff review':'ఫోటో సిబ్బంది సమీక్షలో ఉంది',exact:true})).toBeVisible();
 const root=page.locator('.mv-register-workspace');const text=await root.innerText();expect(/\p{Extended_Pictographic}/u.test(text)).toBe(false);expect(await root.locator('svg').count()).toBeGreaterThan(8);
 await expect(page.getByLabel(lang==='en'?'Your password':'మీ పాస్‌వర్డ్',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:lang==='en'?'Register Passkey':'పాస్‌కీ సెటప్ చేయండి',exact:true})).toBeDisabled();
 await expect(root).toContainText(lang==='en'?'4 interest requests':'4 పరిచయ అభ్యర్థనలు');await expect(root).toContainText(lang==='en'?'Review pending':'సమీక్ష కోసం వేచి ఉంది');await expect(root).toContainText(lang==='en'?'Phone not OTP verified':'ఫోన్ OTP ధృవీకరించబడలేదు');
 for(const path of ['/me','/matches','/referral','/biodata'])expect(await root.locator(`a[href="${path}"]`).count()).toBeGreaterThan(0);
 expect(writes).toEqual(['/api/register']);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();await page.locator('h1').click();await page.evaluate(()=>window.scrollTo(0,0));await root.screenshot({path:`artifacts/registration-result-portability/result-${lang}-${width}.png`});
});
