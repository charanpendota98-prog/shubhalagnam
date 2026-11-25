import {localeHref} from "./locale-href";
import {test,expect} from '@playwright/test';
import fs from 'node:fs';
const out=process.env.REGISTER_PORTABLE_OUT||'artifacts/register-portability';fs.mkdirSync(out,{recursive:true});
const draft={gender:'Bride',full_name:'Fictional Review',religion:'Hindu',dob:'1998-01-01',height:'5 ft 6 in (168 cm)',marital_status:'Pelli Kaledu',caste:'Kapu',education:'B.Tech / B.E.',job:'Software Engineer',work_type:'Software / IT / Tech',salary:'Not applicable',state:'TS',district:'Hyderabad',phone:'9000000001'};
async function portable(root:any){const content=await root.evaluate((el:HTMLElement)=>[el.innerText,...Array.from(el.querySelectorAll('input')).map((e:any)=>e.placeholder),...Array.from(el.querySelectorAll('option')).map(e=>e.textContent)].join('\n'));expect(content).not.toMatch(/\p{Extended_Pictographic}/u);expect(content).not.toContain('\uFE0F');expect(await root.locator('svg[aria-hidden=true]').count()).toBeGreaterThan(2);}
for(const lang of ['en','te'])for(const width of [320,390,1280])test(`portable registration form all steps ${lang} ${width}`,async({page})=>{
 await page.setViewportSize({width,height:1000});await page.addInitScript(l=>{localStorage.setItem('tsap_lang',l);const seed=sessionStorage.getItem('test_registration_portability_seed');if(seed)localStorage.setItem('shubhalagnam_reg_draft_v6',seed);},lang);let writes=0;
 await page.route('**/api/**',r=>{if(r.request().method()!=='GET'){writes++;return r.abort();}return r.fulfill({json:{success:true,items:[],castes:[],districts:['Hyderabad'],password_login:true,phone_otp:false,passkeys_configured:false}});});
 await page.goto(localeHref('/register',lang));const root=page.locator('.mv-register-workspace');await expect(page.locator('#quick-religion')).toBeVisible();await portable(root);
 const bride=page.getByRole('button',{name:lang==='en'?'Bride':'వధువు',exact:true});await expect(bride).toHaveAccessibleName(lang==='en'?'Bride':'వధువు');await bride.click();await expect(bride).toHaveAttribute('aria-pressed','true');expect(await bride.locator('svg').count()).toBe(1);
 await page.screenshot({animations:'disabled',path:`${out}/${lang}-${width}-quick-top.png`});
 await page.getByRole('button',{name:lang==='en'?'Create my profile in 1 minute':'1 నిమిషంలో నా ప్రొఫైల్ సృష్టించండి',exact:false}).click();await portable(root);
 for(const step of [1,2,3,4,5]){
  await page.evaluate(({step,data})=>sessionStorage.setItem('test_registration_portability_seed',JSON.stringify({step,data})),{step,data:draft});await page.reload();await page.getByRole('button',{name:lang==='en'?'Resume':'కొనసాగించండి',exact:true}).click();await page.getByRole('button',{name:/5-step full registration|5-దశల పూర్తి నమోదు/}).click();const heading=page.locator('.mv-register-step-header h2');await expect(heading).toContainText(lang==='en'?`Step ${step} of 5`:`దశ ${step} / 5`);await portable(root);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await heading.scrollIntoViewIfNeeded();await page.screenshot({animations:'disabled',path:`${out}/${lang}-${width}-step${step}.png`});
 }
 const photo=page.getByRole('heading',{name:lang==='en'?'Profile photo required':'ప్రొఫైల్ ఫోటో తప్పనిసరి',exact:false});await photo.scrollIntoViewIfNeeded();await page.screenshot({animations:'disabled',path:`${out}/${lang}-${width}-photo.png`});
 const camera=page.getByRole('button',{name:lang==='en'?'Use camera':'కెమెరా',exact:true});const chooser=page.waitForEvent('filechooser');await camera.click();await(await chooser).setFiles([]);expect(writes).toBe(0);
});
