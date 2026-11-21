import {test,expect,type Page} from '@playwright/test';
import fs from 'node:fs';
const cases=JSON.parse(fs.readFileSync('tests/fixtures/photo-face-errors.json','utf8'));
fs.mkdirSync('artifacts/photo-face',{recursive:true});
async function fill(page:Page){
 await page.goto('/register');await page.getByRole('button',{name:/Bride/}).click();await page.getByLabel('Full Name',{exact:false}).fill('Synthetic Capability Test');await page.locator('input[type=date]').fill('1998-01-01');await page.locator('#quick-religion').selectOption('Hindu');
 await page.getByRole('button',{name:/Select a community/}).click();await page.getByRole('button',{name:'Kapu',exact:true}).click();await page.getByLabel('State',{exact:true}).selectOption('TS');await page.getByRole('button',{name:/Select a district/}).click();await page.getByRole('button',{name:'Hyderabad',exact:true}).click();
 await page.getByLabel('Mobile number (10 digits)',{exact:false}).fill('9000000001');await page.getByLabel('Password (minimum 6 characters)',{exact:true}).fill('synthetic-test-only');
 await page.getByLabel('Choose a photo from your gallery',{exact:true}).setInputFiles('tests/fixtures/synthetic-profile.jpg');await page.getByRole('checkbox',{name:/I have permission to upload this photo/}).check();await page.locator('#registration-consent').check();
 
}

for(const lang of ['en','te'])for(const width of [320,390,1280])test(`face rejection retains photo and form ${lang} ${width}`,async({page})=>{
 await page.setViewportSize({width,height:1000});await page.addInitScript(()=>localStorage.setItem('tsap_lang','en'));
 let body=cases.NO_FACE,status=422,writes=0;await page.route('**/api/**',r=>{const p=new URL(r.request().url()).pathname;if(p==='/api/register')return r.fulfill({status,json:body});if(r.request().method()!=='GET'){writes++;return r.abort()};return r.fulfill({json:p==='/api/auth/capabilities'?{password_login:true,phone_otp:false,passkeys_configured:false}:{success:true,castes:['Kapu'],districts:['Hyderabad'],items:[]}})});
 await fill(page);await expect(page.getByText('Selected, not approved.',{exact:false})).toBeVisible();if(lang==='te')await page.getByRole('button',{name:'తెలుగులో చూపించండి',exact:true}).click();const submit=page.getByRole('button',{name:lang==='en'?'Create my profile in 1 minute':'1 నిమిషంలో నా ప్రొఫైల్ సృష్టించండి',exact:false});
 for(const reason of ['NO_FACE','MULTIPLE_FACES','FACE_CHECK_UNAVAILABLE']){body=cases[reason];status=reason==='FACE_CHECK_UNAVAILABLE'?503:422;await submit.click();const warning=page.getByText(body.detail[lang],{exact:false});await expect(warning).toBeVisible();await expect(page.getByRole('heading',{name:lang==='en'?'Registration Successful!':'నమోదు విజయవంతంగా పూర్తయింది!',exact:true})).toHaveCount(0);await expect.poll(()=>page.evaluate(()=>!!localStorage.getItem('shubhalagnam_reg_draft_v6')),{timeout:3000}).toBe(true);await expect(page.getByLabel(lang==='en'?'Full Name':'పూర్తి పేరు (Full Name)',{exact:false})).toHaveValue('Synthetic Capability Test');await expect(page.getByRole('img',{name:lang==='en'?'Profile photo preview':'ప్రొఫైల్ ఫోటో preview',exact:true}).first()).toBeVisible();if(reason==='NO_FACE'){await warning.scrollIntoViewIfNeeded();await page.waitForTimeout(500);await page.screenshot({path:`artifacts/photo-face/${lang}-${width}.png`});}}
 expect(writes).toBe(0);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
