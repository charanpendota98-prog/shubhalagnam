import {test,expect} from '@playwright/test';
import fs from 'node:fs';

// Legacy stored text is untrusted even after new-write sanitization is fixed.
// The six newly sanitized text fields are not displayed by ProfileView/print.
// These tests cover only existing printed-field escapes, not their output escaping.
// Every API is intercepted. No real profile, mutation or production token is used.
const id='FICTIONAL-SINK-AUDIT';
const attack='<img src=x onerror="window.__profileXss=1"><script>window.__profileXss=1</script>';
const profile={tsap_id:id,full_name:'Fictional Audit',gender:'Bride',age:29,
 height:attack,caste:attack,sub_caste:attack,gothram:attack,star:attack,rasi:attack,
 education:attack,education_detail:attack,job:attack,company:attack,salary:attack,
 district:attack,state:'TS',marital_status:attack,family_type:attack,family_status:attack,
 dosham:attack,diet:attack,profile_for:attack,about_myself:attack,
 is_nri:true,country:attack};
fs.mkdirSync('artifacts/profile-input-sinks',{recursive:true});
for(const lang of ['en','te'])test(`legacy profile markup stays inert in view and print ${lang}`,async({page})=>{
 await page.setViewportSize({width:390,height:950});
 await page.addInitScript(()=>{localStorage.setItem('tsap_id','FICTIONAL-OWNER');(window as any).__profileXss=0});
 const writes:string[]=[];
 await page.route('**/api/**',route=>{
  const path=new URL(route.request().url()).pathname;
  if(route.request().method()!=='GET'){writes.push(path);return route.fulfill({json:{success:true}});}
  if(path==='/api/auth/verify')return route.fulfill({json:{valid:true,tsap_id:'FICTIONAL-OWNER'}});
  if(path===`/api/search/${id}`)return route.fulfill({json:{profile,quality:{percent:42}}});
  if(path.startsWith('/api/saved/'))return route.fulfill({json:{saved:[]}});
  return route.fulfill({json:{success:true,items:[],rows:[],has_voice:false}});
 });
 await page.goto((lang==='en'?'/en':'')+`/search/${id}`);
 await expect(page.getByRole('heading',{name:'Fictional',exact:true})).toBeVisible();
 const badge=page.locator('span').filter({hasText:/^✈️ NRI/});await expect(badge).toHaveCount(1);await expect(badge).toContainText('<img');await expect(badge.locator('img,script,[onerror]')).toHaveCount(0);
 expect(await page.evaluate(()=>(window as any).__profileXss)).toBe(0);
 await expect(page.locator('main img[src="x"],main script:not([type="application/ld+json"])')).toHaveCount(0);
 // Capture the real print document before browser printing can close its window.
 await page.evaluate(()=>{
  (window as any).__printedHtml='';
  window.open=()=>({document:{write:(html:string)=>{(window as any).__printedHtml=html},close:()=>{}}} as unknown as Window);
 });
 await page.getByRole('button',{name:lang==='en'?'Print Biodata':'ప్రింట్ బయోడేటా',exact:true}).click();
 const html=await page.evaluate(()=>(window as any).__printedHtml as string);
 expect(html).toContain('&lt;img');expect(html).not.toContain('<img src=x');
 // Parse the real output before rendering a print-preview screenshot.
 const parsed=await page.evaluate(html=>{
  const doc=new DOMParser().parseFromString(html,'text/html');
  return {images:doc.querySelectorAll('img').length,scripts:Array.from(doc.scripts).map(s=>s.textContent),handlers:doc.querySelectorAll('[onerror],[onload],[onclick]').length};
 },html);
 expect(html).not.toContain('💍');
 expect(parsed.images).toBe(0);expect(parsed.handlers).toBe(0);
 expect(parsed.scripts).toEqual(['window.onload = function() { window.print(); };']);
 const printPage=await page.context().newPage();
 await printPage.route('**/*',route=>route.abort());
 await printPage.setContent(html.replace('<script>window.onload = function() { window.print(); };</script>',''));
 await printPage.screenshot({path:`artifacts/profile-input-sinks/print-${lang}.png`,fullPage:true});
 await printPage.close();expect(writes).toEqual(['/api/view']);
 expect(await page.evaluate(()=>(window as any).__profileXss)).toBe(0);
});

// Hostile legacy flags must not select a badge after the profile has rendered.
for(const lang of ['en','te'])test(`hostile legacy is_nri is never interpolated ${lang}`,async({page})=>{
 await page.addInitScript(()=>{(window as any).__profileXss=0});
 await page.route('**/api/**',r=>r.fulfill({json:new URL(r.request().url()).pathname===`/api/search/${id}`?{profile:{...profile,is_nri:attack,country:'USA'}}:{success:true,items:[],valid:false}}));
 await page.goto((lang==='en'?'/en':'')+`/search/${id}`);
 await expect(page.getByRole('heading',{name:'Fictional',exact:true})).toBeVisible();
 const badge=page.locator('span').filter({hasText:/^✈️ NRI/});await expect(badge).toHaveCount(0);
 expect(await page.evaluate(()=>(window as any).__profileXss)).toBe(0);
});

for(const lang of ['en','te'])test(`legacy NRI boolean spellings classify correctly ${lang}`,async({page})=>{
 let flag:unknown=false;
 await page.route('**/api/**',r=>r.fulfill({json:new URL(r.request().url()).pathname===`/api/search/${id}`?{profile:{...profile,is_nri:flag,country:'USA'}}:{success:true,items:[],valid:false}}));
 for(const [value,show] of [[false,false],['false',false],['no',false],['off',false],['0',false],[{},false],[true,true],['YES',true],[' on ',true],['1',true]] as const){
  flag=value;await page.goto((lang==='en'?'/en':'')+`/search/${id}`);await expect(page.getByRole('heading',{name:'Fictional',exact:true})).toBeVisible();
  await expect(page.locator('span').filter({hasText:/^✈️ NRI/})).toHaveCount(show?1:0);
 }
});
