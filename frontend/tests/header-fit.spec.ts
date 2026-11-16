import {test,expect} from '@playwright/test';
import fs from 'node:fs';
for(const lang of ['en','te'])for(const authenticated of [false,true])test(`header non-overlap ${lang} ${authenticated?'member':'guest'}`,async({page})=>{
 fs.mkdirSync('artifacts/header-fit',{recursive:true});await page.addInitScript(l=>localStorage.setItem('tsap_lang',l),lang);
 await page.route('**/api/**',r=>r.fulfill({json:new URL(r.request().url()).pathname==='/api/auth/verify'?{valid:authenticated,tsap_id:authenticated?'LONG_MEMBER1234567890123':''}:{success:true,rows:[],profiles:[],total:0,searches:[],saved:[]}}));
 for(const width of [320,390,640,768,1024,1279,1280,1365,1366,1440,1536]){
  await page.setViewportSize({width,height:900});await page.goto('/matches',{waitUntil:'networkidle'});
  const header=page.locator('header.brand-header'),nav=header.getByRole('navigation'),menu=header.getByRole('button',{name:lang==='en'?'Menu':'మెనూ',exact:true});
  const geometry=await header.evaluate(h=>{const brand=h.querySelector('a[href="/"]')!,word=brand.querySelector('.brand-name')!,last=brand.querySelector('.brand-name-accent')!;const b=brand.getBoundingClientRect(),w=word.getBoundingClientRect(),l=last.getBoundingClientRect();const siblings=Array.from(brand.parentElement!.children).filter(e=>e!==brand&&getComputedStyle(e).display!=='none').map(e=>e.getBoundingClientRect().left);return{brandRight:b.right,wordRight:w.right,paintRight:l.right,nextLeft:Math.min(...siblings),overflow:document.documentElement.scrollWidth>innerWidth}});
  expect(geometry.wordRight,`word ${width}`).toBeLessThanOrEqual(geometry.nextLeft);expect(geometry.paintRight,`paint ${width}`).toBeLessThanOrEqual(geometry.nextLeft);expect(geometry.overflow).toBeFalsy();
  if(width<1366){await expect(nav).toBeHidden();await expect(menu).toBeVisible();const target=await menu.boundingBox();expect(target!.width).toBeGreaterThanOrEqual(44);expect(target!.height).toBeGreaterThanOrEqual(44);await menu.click();await expect(menu).toHaveAttribute('aria-expanded','true');await expect(page.locator('#mobile-menu')).toBeVisible();await menu.click();await expect(menu).toHaveAttribute('aria-expanded','false');await expect(page.locator('#mobile-menu')).toBeHidden()}else{await expect(nav).toBeVisible();await expect(menu).toBeHidden()}
  if([320,1280,1366].includes(width))await page.screenshot({path:`artifacts/header-fit/${lang}-${authenticated?'member':'guest'}-${width}.png`});
 }
});
