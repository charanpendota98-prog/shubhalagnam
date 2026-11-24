import {localeHref} from "./locale-href";
import {test,expect,type Page} from '@playwright/test';
import fs from 'node:fs';
import {registrationConfirmation} from '../src/lib/registration-response';
fs.mkdirSync('artifacts/registration-confirmation',{recursive:true});
async function fill(page:Page,lang:string){
 await page.goto(localeHref('/register',lang));await page.getByRole('button',{name:/Bride|వధువు/}).click();await page.getByLabel(lang==='en'?'Full Name':'పూర్తి పేరు (Full Name)',{exact:false}).fill('Synthetic Capability Test');await page.locator('input[type=date]').fill('1998-01-01');await page.locator('#quick-religion').selectOption('Hindu');
 await page.getByRole('button',{name:/Select a community|కులం \/ సంఘం ఎంచుకోండి/}).click();await page.getByRole('button',{name:lang==='en'?'Kapu':'కాపు (Kapu)',exact:true}).click();await page.getByLabel(lang==='en'?'State':'రాష్ట్రం',{exact:true}).selectOption('TS');await page.getByRole('button',{name:/Select a district|జిల్లా ఎంచుకోండి/}).click();await page.getByRole('button',{name:/Hyderabad|హైదరాబాద్/}).click();
 await page.getByLabel(lang==='en'?'Mobile number (10 digits)':'10 అంకెల మొబైల్ (WhatsApp Number)',{exact:false}).fill('9000000001');await page.getByLabel(lang==='en'?'Password (minimum 6 characters)':'పాస్‌వర్డ్ (కనీసం 6 అక్షరాలు)',{exact:true}).fill('synthetic-test-only');
 await page.getByLabel(lang==='en'?'Choose a photo from your gallery':'గ్యాలరీ నుంచి ఫోటో ఎంచుకోండి',{exact:true}).setInputFiles('tests/fixtures/synthetic-profile.jpg');await page.getByRole('checkbox',{name:/I have permission to upload this photo|ఈ ఫోటోను అప్‌లోడ్ చేయడానికి నాకు అనుమతి ఉంది/}).check();await page.locator('#registration-consent').check();
 
}

const confirmed={tsap_id:'MV1001',card_url:'',credits:4,phone_verified:false,is_approved:false,email_verify:{required:false}};

const invalid = [
 {success:false,detail:'Fictional unconfirmed response'}, {}, [], 'unreadable',
 {...confirmed,tsap_id:''}, {...confirmed,tsap_id:42}, {...confirmed,tsap_id:'../wrong'},
 {...confirmed,credits:'4'}, {...confirmed,credits:-1}, {...confirmed,credits:1.5},
 {...confirmed,phone_verified:'false'}, {...confirmed,is_approved:'false'},
 {...confirmed,card_url:'https://example.invalid/not-a-card'}, {...confirmed,card_url:'/cards/OTHER.png'},
 {...confirmed,auth_token:42}, {...confirmed,email_verify:{required:'false'}},
 {...confirmed,referral:{joined_with:{ok:'false',bonus_credits:1}}},
 {...confirmed,referral:{joined_with:{ok:true,bonus_credits:'1'}}},
 {...confirmed,success:false}, {...confirmed,detail:'Contradictory error'},
];
for(const lang of ['en','te'])for(const width of [320,390,1280])test(`unconfirmed registration preserves form and retry key ${lang} ${width}`,async({page})=>{
 await page.setViewportSize({width,height:1000});await page.addInitScript(l=>localStorage.setItem('tsap_lang',l),lang);
 let response:any=invalid[0],status=200;const keys:string[]=[];let otherWrites=0;
 await page.route('**/api/**',async r=>{const p=new URL(r.request().url()).pathname;
  if(p==='/api/register'){const raw=r.request().postDataBuffer()?.toString()||'';keys.push(raw.match(/name="registration_key"\r\n\r\n([^\r]+)/)?.[1]||'');return status===204?r.fulfill({status:204,body:''}):r.fulfill({status,json:response});}
  if(r.request().method()!=='GET')otherWrites++;
  if(p==='/api/auth/capabilities')return r.fulfill({json:{password_login:true,login_identifier:'phone',phone_otp:false,email_recovery_configured:false,passkeys_configured:false,email_optional_at_registration:true}});
  return r.fulfill({json:{success:true,castes:['Kapu'],districts:['Hyderabad'],items:[]}});
 });
 await fill(page,lang);await expect.poll(()=>page.evaluate(()=>!!localStorage.getItem('shubhalagnam_reg_draft_v6'))).toBe(true);
 const submit=page.getByRole('button',{name:lang==='en'?'Create my profile in 1 minute':'1 నిమిషంలో నా ప్రొఫైల్ సృష్టించండి',exact:false});
 // One full rejection matrix on laptop, plus both language/phone layouts and safe retry in every case.
 const responses=lang==='en'&&width===1280?invalid:invalid.slice(0,2);
 for(response of responses){await submit.click();await expect(page.getByText(lang==='en'?'We could not confirm registration.': 'నమోదు పూర్తయిందని నిర్ధారించలేకపోయాం.',{exact:false})).toBeVisible();await expect(page.getByRole('heading',{name:lang==='en'?'Registration Successful!':'నమోదు విజయవంతంగా పూర్తయింది!',exact:true})).toHaveCount(0);expect(await page.evaluate(()=>!!localStorage.getItem('shubhalagnam_reg_draft_v6'))).toBe(true);}
 const warning=page.getByText(lang==='en'?'We could not confirm registration.':'నమోదు పూర్తయిందని నిర్ధారించలేకపోయాం.',{exact:false});await warning.scrollIntoViewIfNeeded();await page.screenshot({path:`artifacts/registration-confirmation/after-error-${lang}-${width}.png`});
 if(lang==='en'&&width===1280){for(const code of [202,204]){status=code;response=code===204?undefined:confirmed;await submit.click();await expect(warning).toBeVisible();expect(await page.evaluate(()=>!!sessionStorage.getItem('shubhalagnam_registration_request_v1'))).toBe(true);}}
 status=201;response={...confirmed,referral:{joined_with:{ok:true,reason:'recovered_registration'}}};await submit.click();await expect(page.getByRole('heading',{name:lang==='en'?'Registration Successful!':'నమోదు విజయవంతంగా పూర్తయింది!',exact:true})).toBeVisible();await expect(page.locator('.mv-register-workspace')).toContainText('MV1001');await expect(page.locator('.mv-register-workspace')).toContainText(lang==='en'?'4 interest requests':'4 పరిచయ అభ్యర్థనలు');await expect(page.locator('.mv-register-workspace')).not.toContainText(lang==='en'?'Referral bonus activated!':'రిఫరల్ బోనస్ యాక్టివేట్ అయ్యింది!');
 expect(keys.every(k=>k.length>=16&&k===keys[0])).toBe(true);expect(keys.length).toBe(responses.length+1+(lang==='en'&&width===1280?2:0));expect(await page.evaluate(()=>({draft:localStorage.getItem('shubhalagnam_reg_draft_v6'),key:sessionStorage.getItem('shubhalagnam_registration_request_v1')}))).toEqual({draft:null,key:null});
 // Capture the result panel itself. A viewport scrollY assertion races browser scroll anchoring after the long form is replaced.
 await page.locator('.mv-register-workspace').screenshot({path:`artifacts/registration-confirmation/after-success-${lang}-${width}.png`,animations:'disabled'});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await page.waitForTimeout(900);expect(await page.evaluate(()=>localStorage.getItem('shubhalagnam_reg_draft_v6'))).toBeNull();expect(otherWrites).toBe(0);
});

for(const [n,value] of invalid.entries())test(`registration response rejects malformed shape ${n}`,()=>{expect(registrationConfirmation(value)).toBeNull()});
for(const bonus of [0,1,2])test(`registration response preserves exact bonus ${bonus}`,()=>{const input={...confirmed,referral:{joined_with:{ok:true,bonus_credits:bonus}}};expect(registrationConfirmation(input)).toEqual(input)});
test('response permits the backend recovery contract without a fabricated success flag or bonus',()=>{expect(registrationConfirmation({...confirmed,referral:{joined_with:{ok:true,reason:'recovered_registration'}}})).not.toBeNull()});

test('actual backend response model defaults satisfy confirmation',()=>{const value=JSON.parse(fs.readFileSync('tests/fixtures/registration-model-response.json','utf8'));expect(registrationConfirmation(value)).toEqual(value)});
