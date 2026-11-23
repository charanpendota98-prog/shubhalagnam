import {test,expect} from '@playwright/test';
import fs from 'node:fs';
fs.mkdirSync('artifacts/request-labels',{recursive:true});
for(const lang of ['en','te'])for(const width of [320,390,1280])test(`request contact/status labels ${lang} ${width}`,async({page})=>{
 await page.setViewportSize({width,height:900});
 await page.addInitScript(l=>{localStorage.setItem('tsap_lang',l);localStorage.setItem('tsap_id','UI_ONLY');localStorage.setItem('tsap_token','synthetic-only')},lang);
 const states=['pending','declined','expired','withdrawn','accepted'];
 await page.route('**/api/**',r=>{const path=new URL(r.request().url()).pathname;
  if(path==='/api/auth/verify')return r.fulfill({json:{valid:true,tsap_id:'UI_ONLY'}});
  if(path==='/api/interest/sent/UI_ONLY')return r.fulfill({json:{tsap_id:'UI_ONLY',pending:1,accepted:1,sent:states.map(status=>({request_id:'UI_'+status,from_id:'UI_ONLY',to_id:'UI_'+status,status,credit_refunded:['declined','expired','withdrawn'].includes(status),contact:status==='accepted'?'90••••••01':'SHOULD_NOT_RENDER',profile:{full_name:'Synthetic '+status,age:28}}))}});
  return r.fulfill({json:{success:true,credits:3,received:[],sent:[],saved:[],templates:[],plans:[]}})
 });
 await page.goto('/requests');await page.getByRole('button',{name:lang==='en'?/Sent/:/పంపిన/}).click();
 await expect(page.getByText('SHOULD_NOT_RENDER',{exact:true})).toHaveCount(0);
 await expect(page.getByText(lang==='en'?'After acceptance':'ఆమోదం తర్వాత',{exact:true})).toHaveCount(4);
 await expect(page.getByText('90••••••01').first()).toBeVisible();await expect(page.getByRole('link',{name:lang==='en'?/View contact QR/:/Contact QR/})).toHaveCount(1);
 await expect(page.getByText(lang==='en'?'Withdrawn':'రద్దు చేయబడింది',{exact:true})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();
 await page.evaluate(()=>{(document.activeElement as HTMLElement)?.blur();window.scrollTo({top:0,behavior:'instant'})});await page.waitForTimeout(250);await page.screenshot({path:`artifacts/request-labels/${lang}-${width}.png`,fullPage:true});
});
