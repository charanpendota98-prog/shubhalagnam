import {localeHref} from "./locale-href";
import {test,expect} from '@playwright/test';
import fs from 'node:fs';
const out=process.env.MV_QA_OUTPUT_DIR||'artifacts/current-wedding-hero';fs.mkdirSync(out,{recursive:true});
for(const lang of ['en','te'])for(const width of [320,390,1280])test(`current wedding hero ${lang} ${width}`,async({page})=>{
 await page.setViewportSize({width,height:960});await page.addInitScript(l=>localStorage.setItem('tsap_lang',l),lang);
 await page.route('**/api/**',r=>r.fulfill({json:{success:true,items:[],rows:[],stories:[],banners:[],ads:[],free_first:3}}));
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 for(const reduced of [false,true]){
  await page.emulateMedia({reducedMotion:reduced?'reduce':'no-preference'});await page.goto(localeHref('/',lang));
  await page.getByRole('button',{name:lang==='en'?'Show in English':'తెలుగులో చూపించండి',exact:true}).first().click();
  const hero=page.locator('.wedding-editorial'),title=hero.locator('h1');await expect(hero).toHaveCount(1);await expect(title).toHaveCount(1);await expect(title).toHaveText(lang==='en'?'Two hearts.One beautiful beginning.':'రెండు మనసులు.ఒక అందమైన ఆరంభం.');await expect(title).toBeVisible();await page.evaluate(()=>document.fonts.ready);
  for(const time of [0,200,600,1000]){
   await hero.evaluate((el,t)=>{for(const a of el.getAnimations({subtree:true})){a.pause();a.currentTime=t}},time);
   const geometry=await hero.evaluate(el=>{const title=el.querySelector('h1')!.getBoundingClientRect(),photo=el.querySelector('.wedding-motion__caption')!.getBoundingClientRect();return {overlap:Math.max(0,Math.min(title.right,photo.right)-Math.max(title.left,photo.left))*Math.max(0,Math.min(title.bottom,photo.bottom)-Math.max(title.top,photo.top)),overflow:document.documentElement.scrollWidth>innerWidth+1}});
   expect(geometry.overflow).toBe(false);if(geometry.overlap)await page.screenshot({path:`${out}/${lang}-${width}-overlap-${time}.png`,animations:'disabled'});expect(geometry.overlap).toBe(0);
  }
  await expect(hero.locator('a[href="/register"]')).toBeVisible();if(width>=768)await expect(hero.locator('a[href="/matches"]')).toBeVisible();else await expect(hero.locator('.home-search-card__submit')).toBeVisible();
  const scenes=hero.locator('.wedding-motion');await expect(scenes.locator('img')).toHaveCount(2);
  for(const img of await scenes.locator('img').all())expect(await img.getAttribute('alt')).toBeTruthy();
  if(reduced)await expect(scenes.locator('video')).toHaveCount(0);
  if(reduced)expect(await hero.evaluate(el=>el.getAnimations({subtree:true}).filter(a=>a.effect&&getComputedStyle((a.effect as KeyframeEffect).target as Element).animationName!=='none').length)).toBe(0);
  await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`${out}/${lang}-${width}-${reduced?'reduced':'motion'}.png`,animations:'disabled'});
 }
 expect(errors).toEqual([]);
});
