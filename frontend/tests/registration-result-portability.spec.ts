import {localeHref} from "./locale-href";
import {test,expect,type Page} from '@playwright/test';
import fs from 'node:fs';
fs.mkdirSync('artifacts/registration-result-portability',{recursive:true});
async function fill(page:Page,lang:string){
 await page.goto(localeHref('/register',lang));await page.getByRole('button',{name:/Bride|వధువు/}).click();await page.getByLabel(lang==='en'?'Full Name':'పూర్తి పేరు (Full Name)',{exact:false}).fill('Synthetic Capability Test');await page.locator('input[type=date]').fill('1998-01-01');await page.locator('#quick-religion').selectOption('Hindu');
 await page.getByRole('button',{name:/Select a community|కులం \/ సంఘం ఎంచుకోండి/}).click();await page.getByRole('button',{name:lang==='en'?'Kapu':'కాపు (Kapu)',exact:true}).click();await page.getByLabel(lang==='en'?'State':'రాష్ట్రం',{exact:true}).selectOption('TS');await page.getByRole('button',{name:/Select a district|జిల్లా ఎంచుకోండి/}).click();await page.getByRole('button',{name:/Hyderabad|హైదరాబాద్/}).click();
 await page.getByLabel(lang==='en'?'Mobile number (10 digits)':'10 అంకెల మొబైల్ (WhatsApp Number)',{exact:false}).fill('9000000001');await page.getByLabel(lang==='en'?'Password (minimum 6 characters)':'పాస్‌వర్డ్ (కనీసం 6 అక్షరాలు)',{exact:true}).fill('synthetic-test-only');
 await page.getByLabel(lang==='en'?'Choose a photo from your gallery':'గ్యాలరీ నుంచి ఫోటో ఎంచుకోండి',{exact:true}).setInputFiles('tests/fixtures/synthetic-profile.jpg');await page.getByRole('checkbox',{name:/I have permission to upload this photo|ఈ ఫోటోను అప్‌లోడ్ చేయడానికి నాకు అనుమతి ఉంది/}).check();await page.locator('#registration-consent').check();
 
}

for(const {lang,width,photoStatus} of [...['en','te'].flatMap(lang=>[320,390,1280].map(width=>({lang,width,photoStatus:'pending'}))),...['approved','rejected','none'].map(photoStatus=>({lang:'te',width:390,photoStatus}))])test(`portable registration result ${lang} ${width} ${photoStatus}`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.addInitScript(l=>localStorage.setItem('tsap_lang',l),lang);const writes:string[]=[];
 await page.route('**/api/**',r=>{const p=new URL(r.request().url()).pathname;if(r.request().method()!=='GET')writes.push(p);
 if(p==='/api/register')return r.fulfill({status:201,json:{success:true,tsap_id:'FICTIONAL-RESULT',card_url:'',credits:4,phone_verified:false,is_approved:false,email_verify:{required:true,verified:false,sent:true},referral:{my_code:'FIXTURE',joined_with:{ok:true,bonus_credits:1}}}});
 if(p==='/api/photo/status/FICTIONAL-RESULT')return r.fulfill({json:{photo_url:'',photo_status:photoStatus,photo_reason:'',photo_reason_te:''}});
 if(p==='/api/auth/capabilities')return r.fulfill({json:{password_login:true,login_identifier:'phone',phone_otp:false,email_recovery_configured:true,passkeys_configured:true,email_optional_at_registration:true}});
 return r.fulfill({json:{success:true,castes:['Kapu'],districts:['Hyderabad'],items:[]}});
 });
 await fill(page,lang);await page.getByRole('button',{name:lang==='en'?'Create my profile in 1 minute':'1 నిమిషంలో నా ప్రొఫైల్ సృష్టించండి',exact:false}).click();await expect(page.getByRole('heading',{name:lang==='en'?'Registration Successful!':'నమోదు విజయవంతంగా పూర్తయింది!',exact:true})).toBeVisible();
 await expect(page.getByRole('heading',{name:photoStatus==='pending'?(lang==='en'?'Photo is waiting for staff review':'ఫోటో సిబ్బంది సమీక్షలో ఉంది'):photoStatus==='approved'?'ఫోటో సమీక్ష పూర్తయింది':photoStatus==='rejected'?'మరో ఫోటో అవసరం':'ప్రొఫైల్ ఫోటో జోడించండి',exact:true})).toBeVisible();
 const root=page.locator('.mv-register-workspace');const text=await root.innerText();expect(/\p{Extended_Pictographic}/u.test(text)).toBe(false);
 if(lang==='te'){for(const fragment of ['interest-request','cash','contact unlock','referrer','reward','Valid referral','Partner Preferences','My Profile','suitability','identity verification','privacy'])expect(text).not.toContain(fragment);for(const fact of ['+2','+1','₹50','₹99','S_99/S_199/S_299/S_499','మినహాయింపులు','సిబ్బంది సమీక్షించి','హామీ లేదు'])expect(text).toContain(fact);}if(lang==='te'&&['pending','approved'].includes(photoStatus))expect(text).toContain('గుర్తింపును');if(lang==='te')expect(text).toContain(photoStatus==='pending'?'గుర్తింపును ధృవీకరించదు':photoStatus==='approved'?'ఇతర వివరాలను ధృవీకరించదు':photoStatus==='rejected'?'ఒక్కరే కనిపించే':'గోప్యత ఎంపిక');expect(await root.locator('svg').count()).toBeGreaterThan(8);
 await expect(page.getByLabel(lang==='en'?'Your password':'మీ పాస్‌వర్డ్',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:lang==='en'?'Register Passkey':'పాస్‌కీ సెటప్ చేయండి',exact:true})).toBeDisabled();
 await expect(root).toContainText(lang==='en'?'4 interest requests':'4 పరిచయ అభ్యర్థనలు');await expect(root).toContainText(lang==='en'?'Review pending':'సమీక్ష కోసం వేచి ఉంది');await expect(root).toContainText(lang==='en'?'Phone not OTP verified':'ఫోన్ OTP ధృవీకరించబడలేదు');
 for(const path of ['/me','/matches','/referral','/biodata'])expect(await root.locator(`a[href="${localeHref(path,lang)}"]`).count()).toBeGreaterThan(0);
 expect(writes).toEqual(['/api/register']);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();await page.locator('h1').click();await page.evaluate(()=>window.scrollTo(0,0));await root.screenshot({path:`artifacts/registration-result-portability/result-${lang}-${width}-${photoStatus}.png`});
});
