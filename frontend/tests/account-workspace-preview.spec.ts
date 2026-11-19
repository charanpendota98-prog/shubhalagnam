import {test,expect} from '@playwright/test';import fs from 'node:fs';
const out='/downloads/mv-account-working-review';fs.mkdirSync(out,{recursive:true});
const before=process.env.ACCOUNT_BASELINE==='1';
for(const lang of ['te','en'])for(const width of [320,390,1280])test(`account workspace ${lang} ${width}`,async({page})=>{
 await page.setViewportSize({width,height:920});const errors:string[]=[];page.on('pageerror',e=>errors.push(String(e)));await page.addInitScript(l=>{localStorage.setItem('tsap_lang',l);localStorage.setItem('tsap_id','UI_ONLY')},lang);let writes=0;
 await page.route('**/api/**',r=>{if(r.request().method()!=='GET')writes++;const p=new URL(r.request().url()).pathname;
 if(p==='/api/auth/verify')return r.fulfill({json:{valid:true,success:true,tsap_id:'UI_ONLY'}});
 if(p==='/api/profile/UI_ONLY')return r.fulfill({json:{success:true,profile:{tsap_id:'UI_ONLY',full_name:'Fictional Review',gender:'Groom',height:"5'8\"",dob:'1998-01-01',state:'TS',district:'Hyderabad',education:'B.Tech / B.E.',marital_status:'Pelli Kaledu',job:'Engineer',photo_url:''},completeness_score:60,missing_fields:['photo_url']}});
 if(p==='/api/profile/preferences')return r.fulfill({json:{preferences:{age_min:24,age_max:32,height_min:'',height_max:'',castes:[],districts:[],jobs:[],educations:[],marital_statuses:[],caste_no_bar:true},preview_matches:[],matching_count:0}});
 return r.fulfill({json:{success:true,total:0,rows:[],items:[],sessions:[],links:[],saved:[],searches:[],incoming:[],outgoing:[],received:[],sent:[],totals:{},counts:{},sections:{},preferences:{},appointments:[],refunds:[]}})
 });
 await page.goto('/me');await expect(page.getByRole('button',{name:lang==='te'?'💾 నా ప్రాధాన్యతలను సేవ్ చేయండి':'💾 Save preferences',exact:true})).toBeVisible();await page.screenshot({path:`${out}/${lang}-${width}-${before?'before':'after'}.png`});
 if(before)return;
 const nav=page.locator('.account-primary-nav');await expect(nav.getByRole('button')).toHaveCount(7);await expect(page.locator('h1')).toHaveCount(1);
 for(const btn of await nav.getByRole('button').all()){const b=await btn.boundingBox();expect(b!.width).toBeGreaterThanOrEqual(44);expect(b!.height).toBeGreaterThanOrEqual(44);expect(await btn.evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBeTruthy()}
 await page.locator('.account-secondary-nav summary').click();const all=page.locator('.account-primary-nav button,.account-secondary-nav button');await expect(all).toHaveCount(14);for(const b of await all.all()){await b.click();await expect(b).toHaveAttribute('aria-current','page');await expect(page.locator('#account-task-panel')).toBeVisible()}
 await page.getByRole('button',{name:lang==='te'?/నా ప్రొఫైల్ సవరణ/:/Edit Profile/}).click();await expect(page.locator('#me-full_name')).toHaveValue('Fictional Review');await page.locator('.account-secondary-nav').evaluate(e=>(e as HTMLDetailsElement).open=false);await page.locator('#account-task-panel').evaluate(e=>e.scrollIntoView({block:'start',behavior:'instant'}));await page.evaluate(()=>scrollBy(0,-78));await page.locator('#me-full_name').evaluate(e=>e.scrollIntoView({block:'start',behavior:'instant'}));await page.evaluate(()=>scrollBy(0,-140));await page.screenshot({path:`${out}/${lang}-${width}-edit.png`});
 await page.getByRole('button',{name:lang==='te'?'🔒 గోప్యత & డేటా ఎక్స్‌పోర్ట్':'🔒 Privacy & Export',exact:true}).click();await expect(page.getByRole('button',{name:lang==='te'?'📥 నా ఖాతా డేటా డౌన్‌లోడ్ (JSON)':'📥 Download My Data (JSON)',exact:true})).toBeVisible();await page.locator('.account-secondary-nav').evaluate(e=>(e as HTMLDetailsElement).open=false);await page.locator('#account-task-panel').evaluate(e=>e.scrollIntoView({block:'start',behavior:'instant'}));await page.evaluate(()=>scrollBy(0,-78));await page.screenshot({path:`${out}/${lang}-${width}-privacy.png`});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();expect(writes).toBe(0);expect(errors).toEqual([]);
});
