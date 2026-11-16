import {test,expect} from '@playwright/test';
import fs from 'node:fs';
for(const lang of ['en','te'])for(const width of [320,390,1280])test(`cookie-only saved search ${lang} ${width}`,async({page})=>{
 fs.mkdirSync('artifacts/cookie-session',{recursive:true});
 await page.setViewportSize({width,height:900});
 await page.addInitScript(l=>{localStorage.setItem('tsap_lang',l);localStorage.setItem('tsap_id','UNVERIFIED_HINT')},lang);
 let valid=true;const owners:string[]=[];
 await page.route('**/api/**',r=>{const path=new URL(r.request().url()).pathname;
  if(path==='/api/auth/verify')return r.fulfill({status:valid?200:401,json:valid?{valid:true,tsap_id:'COOKIE_OWNER'}:{valid:false}});
  if(path.startsWith('/api/saved-searches/')||path.startsWith('/api/saved/')){owners.push(path);return r.fulfill({json:{searches:[],saved:[]}})}
  if(path==='/api/search')return r.fulfill({json:{rows:[],total:0,profiles:[]}});
  return r.fulfill({json:{success:true,items:[],profiles:[],rows:[],total:0}});
 });
 await page.goto('/matches?district=Hyderabad');
 const save=page.getByRole('button',{name:lang==='en'?'Save current search':'ప్రస్తుత శోధనను సేవ్ చేయండి',exact:true});
 // The owner comes from the server, never from the saved profile-id hint.
 await expect.poll(()=>owners.length).toBeGreaterThan(0);
 expect(owners.every(p=>p.endsWith('/COOKIE_OWNER'))).toBeTruthy();
 expect(await page.evaluate(()=>sessionStorage.getItem('tsap_token'))).toBeNull();
 await expect(save).toBeVisible();await expect(save).toBeEnabled();await save.scrollIntoViewIfNeeded();
 await page.screenshot({path:`artifacts/cookie-session/verified-${lang}-${width}.png`});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();
 valid=false;owners.length=0;await page.reload();
 await expect(save).toHaveCount(0);expect(owners).toEqual([]);
});
