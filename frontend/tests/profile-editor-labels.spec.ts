import {localeHref} from "./locale-href";
import {test,expect,type Page} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs';

// Fictional signed-in editor only. Every API is intercepted; no real token or writes.
async function setup(page:Page,lang:string){
 const writes:string[]=[];
 const profile={tsap_id:'SYN-EDITOR',full_name:'Synthetic Editor',gender:'Bride',dob:'1998-01-01',height:`5'4"`,marital_status:'Pelli Kaledu',caste:'Kapu',education:'B.Tech / B.E.',job:'Engineer',state:'TS',district:'Hyderabad',photo_url:''};
 await page.addInitScript(language=>{localStorage.setItem('tsap_lang',language);localStorage.setItem('tsap_id','SYN-EDITOR')},lang);
 await page.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  if(route.request().method()!=='GET'){writes.push(path);return route.fulfill({status:405,json:{success:false}})}
  if(path==='/api/profile/SYN-EDITOR')return route.fulfill({json:{success:true,profile,completeness_score:84,missing_fields:['education_detail','work_type','father_occupation','photo_url']}});
  if(path==='/api/photo/status/SYN-EDITOR')return route.fulfill({json:{photo_url:'',photo_status:'none',photo_reason:'',photo_reason_te:''}});
  return route.fulfill({json:{success:true,authenticated:true,tsap_id:'SYN-EDITOR',items:[],profiles:[],total:0}});
 });
 await page.goto(localeHref('/me',lang));
 await page.getByRole('button',{name:lang==='en'?/Edit Profile/:/నా ప్రొఫైల్ సవరణ/}).click();
 await expect(page.locator('#me-full_name')).toBeVisible();
 return writes;
}
fs.mkdirSync('artifacts/profile-editor-labels',{recursive:true});
for(const lang of ['en','te'])for(const width of [320,390,1280])test(`profile editor labels and axe ${lang} ${width}`,async({page})=>{
 await page.setViewportSize({width,height:900});
 const writes=await setup(page,lang);
 const controls=page.locator('form input[id^="me-"],form select[id^="me-"],form textarea[id^="me-"]');
 expect(await controls.count()).toBe(32);
 const labels=await controls.evaluateAll(es=>es.map(e=>({id:e.id,labels:Array.from((e as HTMLInputElement).labels||[]).map(l=>({for:l.htmlFor,text:l.textContent?.trim()}))})));
 for(const control of labels){
  expect(control.labels,`One visible label for ${control.id}`).toHaveLength(1);
  expect(control.labels[0].for).toBe(control.id);
  expect(control.labels[0].text).toBeTruthy();
  await expect(page.locator(`label[for="${control.id}"]`)).toBeVisible();
 }
 // A real label click must focus its control, not just expose an ARIA name.
 await page.locator('label[for="me-full_name"]').click();
 await expect(page.locator('#me-full_name')).toBeFocused();
 await page.locator('label[for="me-height"]').click();
 await expect(page.locator('#me-height')).toBeFocused();
 const results=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();
 const blocking=results.violations.filter(v=>v.impact==='serious'||v.impact==='critical').map(v=>({id:v.id,impact:v.impact,targets:v.nodes.map(n=>n.target)}));
 expect(blocking,JSON.stringify(blocking)).toEqual([]);
 expect(writes).toEqual([]);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();
 await page.locator('#me-full_name').scrollIntoViewIfNeeded();
 await page.screenshot({path:`artifacts/profile-editor-labels/${lang}-${width}.png`,fullPage:true});
});
