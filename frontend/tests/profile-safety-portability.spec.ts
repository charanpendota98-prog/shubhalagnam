import {test,expect} from '@playwright/test';
import fs from 'node:fs';
for(const lang of ['en','te'])for(const width of [320,390,1280])test(`profile safety SVG labels ${lang} ${width}`,async({page})=>{
 await page.setViewportSize({width,height:1000});
 await page.addInitScript(l=>localStorage.setItem('tsap_lang',l),lang);
 let saved=false;
 await page.route('**/api/**',async r=>{
  const path=new URL(r.request().url()).pathname;
  if(path==='/api/auth/verify')return r.fulfill({json:{valid:true,tsap_id:'FIXTURE_OWNER'}});
  if(path==='/api/search/FICTIONAL')return r.fulfill({json:{profile:{tsap_id:'FICTIONAL',full_name:'Fictional member with a longer displayed family name',gender:'Bride',age:29},quality:{}}});
  if(path.startsWith('/api/saved/'))return r.fulfill({json:{saved:saved?[{profile:{tsap_id:'FICTIONAL'}}]:[]}});
  if(path==='/api/save'){saved=r.request().postDataJSON().saved;return r.fulfill({json:{success:true,saved}})}
  return r.fulfill({json:{success:true,rows:[],total:0,items:[]}});
 });
 await page.goto('/search/FICTIONAL');
 const tools=page.locator('.profile-tools');
 const names=lang==='en'?['Shortlist','Block','Report','Safety tips']:['షార్ట్‌లిస్ట్','బ్లాక్ చేయండి','రిపోర్ట్ చేయండి','భద్రతా సూచనలు'];
 for(const name of names){const control=tools.getByRole(name===names[3]?'link':'button',{name,exact:true});await expect(control).toBeVisible();await expect(control).toBeEnabled();await expect(control.locator('svg')).toHaveCount(1);expect(await control.evaluate(el=>el.querySelector('svg')?.closest('[aria-hidden="true"]')!==null)).toBe(true);const box=await control.boundingBox();expect(box!.height).toBeGreaterThanOrEqual(44);}
 const adjacent=lang==='en'?[['link','HD Color Biodata JPG'],['button','Print Biodata'],['button','WhatsApp Proposal Share']]:[['link','HD కలర్ బయోడేటా JPG'],['button','ప్రింట్ బయోడేటా'],['button','వాట్సాప్ ప్రపోజల్ షేర్']];
 for(const [role,label] of adjacent){const control=tools.getByRole(role as 'link'|'button',{name:label,exact:true});await expect(control).toBeVisible();await expect(control.locator('svg[aria-hidden="true"]')).toHaveCount(1);}
 const shortlist=tools.getByRole('button',{name:names[0],exact:true});await shortlist.click();const selected=tools.getByRole('button',{name:lang==='en'?'In shortlist':'షార్ట్‌లిస్ట్‌లో ఉంది',exact:true});await expect(selected.locator('svg')).toHaveAttribute('fill','currentColor');await selected.focus();await page.keyboard.press('Tab');await expect(tools.getByRole('button',{name:lang==='en'?/WhatsApp Proposal Share$/:/వాట్సాప్ ప్రపోజల్ షేర్$/})).toBeFocused();
 await tools.getByRole('button',{name:names[1],exact:true}).click();await expect(page.getByRole('group',{name:lang==='en'?'Confirm block':'బ్లాక్ నిర్ధారణ',exact:true})).toBeVisible();await page.getByRole('button',{name:lang==='en'?'Cancel':'రద్దు',exact:true}).click();await expect(page.getByRole('group',{name:lang==='en'?'Confirm block':'బ్లాక్ నిర్ధారణ',exact:true})).toHaveCount(0);
 await tools.scrollIntoViewIfNeeded();const dir=process.env.PROFILE_SVG_ARTIFACTS||'artifacts/profile-safety-svg';fs.mkdirSync(dir,{recursive:true});await tools.screenshot({path:`${dir}/tools-${lang}-${width}.png`});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
