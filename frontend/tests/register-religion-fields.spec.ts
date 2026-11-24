import {localeHref} from "./locale-href";
import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import {registrationReligionPayload} from '../src/lib/registration-religion';
const out=process.env.REGISTER_RELIGION_OUT||'artifacts/register-religion';fs.mkdirSync(out,{recursive:true});
const markers={birth_time:'12:34',gothram:'HINDU_DRAFT_REFERENCE',star:'Ashwini',rasi:'Mesha',moola_nakshatram:'Yes',dosham:'Draft reference'};
const draft=(religion:string)=>({full_name:'Fictional Review',gender:'Groom',dob:'1995-05-12',height:'5 ft 6 in (168 cm)',marital_status:'Pelli Kaledu',religion,caste:religion==='Hindu'?'Kapu':religion==='Muslim'?'Sunni':'Catholic',work_type:'Software / IT / Tech',education:'B.Tech / B.E.',job:'Software Engineer',salary:'Not applicable',state:'TS',district:'Hyderabad',phone:'9000000001',...markers});
async function intercept(page:any){await page.route('**/api/**',(r:any)=>r.request().method()==='GET'?r.fulfill({json:{success:true,items:[],castes:[],subcastes:[],districts:['Hyderabad'],password_login:true,phone_otp:false,passkeys_configured:false}}):r.abort());}
for(const religion of ['Hindu','Muslim','Christian',''])test(`outgoing religion payload ${religion||'neutral'} excludes only irrelevant draft references`,()=>{const source=draft(religion);const copy={...source};const payload=registrationReligionPayload(source);expect(source).toEqual(copy);expect(payload.full_name).toBe(source.full_name);expect(payload.caste).toBe(source.caste);for(const [key,value]of Object.entries(markers))expect(payload[key]).toBe(religion==='Hindu'?value:'');});
for(const lang of ['en','te'])for(const width of [320,390,1280]){
 test(`religion is first in quick and full registration ${lang} ${width}`,async({page})=>{
  await page.setViewportSize({width,height:1000});await page.addInitScript(l=>localStorage.setItem('tsap_lang',l),lang);await intercept(page);await page.goto(localeHref('/register',lang));
  for(const mode of ['quick','full']){
   if(mode==='full')await page.getByRole('button',{name:/5-step full registration|5-దశల పూర్తి నమోదు/}).click();
   const choice=page.locator('#'+mode+'-religion');await expect(choice).toHaveValue('');
   const order=await choice.evaluate(el=>{const root=el.closest('.mv-register-workspace')!;return [...root.querySelectorAll('input,select,button[aria-pressed]')].filter(e=>e.getClientRects().length).indexOf(el)});expect(order).toBe(0);
   await choice.scrollIntoViewIfNeeded();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await page.screenshot({animations:'disabled',path:`${out}/${lang}-${width}-${mode}-choice.png`});
  }
 });
 for(const faith of ['Hindu','Muslim','Christian'])test(`full community and astrology branch ${faith} ${lang} ${width}`,async({page})=>{
  await page.setViewportSize({width,height:1000});await page.addInitScript(({l,data})=>{localStorage.setItem('tsap_lang',l);localStorage.setItem('shubhalagnam_reg_draft_v6',JSON.stringify({step:2,data}));},{l:lang,data:draft(faith)});await intercept(page);await page.goto(localeHref('/register',lang));await page.getByRole('button',{name:lang==='en'?'Resume':'కొనసాగించండి',exact:true}).click();await page.getByRole('button',{name:/5-step full registration|5-దశల పూర్తి నమోదు/}).click();
  const heading=page.locator('.mv-register-step-header h2');await expect(heading).toContainText(faith==='Hindu'?(lang==='en'?'Caste & Astrology':'కులం & జ్యోతిషం'):(lang==='en'?'Community':'సంఘం'));
  await expect(page.getByLabel('Gothram',{exact:false})).toHaveCount(faith==='Hindu'?1:0);await expect(page.getByLabel(lang==='en'?'Nakshatram':'నక్షత్రం',{exact:true})).toHaveCount(faith==='Hindu'?1:0);await expect(page.getByLabel(lang==='en'?'Rasi':'రాశి',{exact:true})).toHaveCount(faith==='Hindu'?1:0);
  await heading.scrollIntoViewIfNeeded();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await page.screenshot({animations:'disabled',path:`${out}/${lang}-${width}-${faith}.png`});const panel=page.locator('.mv-register-step-header').locator('..');const box=await panel.boundingBox();await page.setViewportSize({width,height:Math.ceil(box!.height)+240});await panel.screenshot({animations:'disabled',path:`${out}/${lang}-${width}-${faith}-panel.png`});
  await page.setViewportSize({width,height:1000});await page.getByRole('button',{name:lang==='en'?'Next →':'ముందుకు →',exact:true}).click();await expect(heading).toContainText(lang==='en'?'Career & Education':'ఉద్యోగం & విద్య');
 });
}
test('switching religion retains editable Hindu draft but shows only selected controls',async({page})=>{
 await page.addInitScript(data=>{localStorage.setItem('tsap_lang','en');localStorage.setItem('shubhalagnam_reg_draft_v6',JSON.stringify({step:2,data}));},draft('Hindu'));await intercept(page);await page.goto('/register');await page.getByRole('button',{name:'Resume',exact:true}).click();
 await page.locator('#quick-religion').selectOption('Muslim');await page.getByRole('button',{name:/5-step full registration/}).click();await expect(page.getByLabel('Gothram',{exact:false})).toHaveCount(0);
 await page.getByRole('button',{name:/1-minute quick registration/,exact:false}).first().click();await page.locator('#quick-religion').selectOption('Hindu');await page.getByRole('button',{name:/5-step full registration/}).click();await expect(page.getByLabel('Gothram',{exact:false})).toHaveValue(markers.gothram);
});
for(const religion of ['Unknown','Other'])test(`unsupported resumed religion ${religion} needs an explicit supported choice`,async({page})=>{await page.addInitScript(data=>{localStorage.setItem('tsap_lang','en');localStorage.setItem('shubhalagnam_reg_draft_v6',JSON.stringify({step:1,data}));},draft(religion));await intercept(page);await page.goto('/register');await page.getByRole('button',{name:'Resume',exact:true}).click();await expect(page.locator('#quick-religion')).toHaveValue('');});
for(const faith of ['Hindu','Muslim','Christian'])test(`actual intercepted registration form data follows ${faith} branch`,async({page})=>{
 await page.addInitScript(data=>{localStorage.setItem('tsap_lang','en');localStorage.setItem('shubhalagnam_reg_draft_v6',JSON.stringify({step:2,data}));},draft(faith));let raw='';let otherWrites=0;
 await page.route('**/api/**',r=>{if(new URL(r.request().url()).pathname==='/api/register'){raw=r.request().postDataBuffer()?.toString()||'';return r.fulfill({status:400,json:{detail:'Isolated submission capture, no account created'}});}if(r.request().method()!=='GET')otherWrites++;return r.fulfill({json:{success:true,items:[],castes:[],subcastes:[],districts:['Hyderabad'],password_login:true,phone_otp:false,passkeys_configured:false}});});
 await page.goto('/register');await page.getByRole('button',{name:'Resume',exact:true}).click();await page.getByLabel('Password (minimum 6 characters)',{exact:true}).fill('synthetic-test-only');await page.getByLabel('Choose a photo from your gallery',{exact:true}).setInputFiles('tests/fixtures/synthetic-profile.jpg');await page.getByRole('checkbox',{name:/I have permission to upload this photo/}).check();await page.locator('#registration-consent').check();await page.getByRole('button',{name:'Create my profile in 1 minute',exact:false}).click();await expect.poll(()=>raw.length).toBeGreaterThan(0);
 const value=(key:string)=>raw.split(`name="${key}"\r\n\r\n`)[1]?.split('\r\n')[0];expect(value('religion')).toBe(faith);for(const[key,want]of Object.entries(markers))expect(value(key)).toBe(faith==='Hindu'?want:'');expect(otherWrites).toBe(0);expect(value('consent_confirmed')).toBe('true');expect(value('photo_consent_confirmed')).toBe('true');
});
