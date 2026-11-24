import {localeHref} from "./locale-href";
import {test,expect} from '@playwright/test';
import fs from 'node:fs';
const out=process.env.MV_QA_OUTPUT_DIR||'artifacts/profile-unavailable-heading';fs.mkdirSync(out,{recursive:true});
for(const lang of ['en','te'])for(const width of [320,390,1280])test(`unavailable profile heading ${lang} ${width}`,async({page})=>{
 await page.setViewportSize({width,height:920});await page.addInitScript(l=>localStorage.setItem('tsap_lang',l),lang);
 let status=404;let writes=0;
 await page.route('**/api/**',r=>{if(r.request().method()!=='GET')writes++;const path=new URL(r.request().url()).pathname;return path.startsWith('/api/search/')?r.fulfill({status,json:{detail:'Fictional unavailable profile'}}):r.fulfill({json:{valid:false,success:true,items:[]}})});
 for(const code of [404,503]){status=code;await page.goto(localeHref('/search/FICTIONAL-MISSING',lang));const h=page.locator('.mv-profile-workspace h1');await expect(h).toHaveCount(1);await expect(h).toBeVisible();expect(await h.evaluate(e=>parseFloat(getComputedStyle(e).fontSize))).toBe(16);await expect(h).toContainText(code===404?(lang==='te'?'దొరకలేదు':'not found'):'Fictional unavailable profile');await expect(page.locator(`.mv-profile-workspace a[href="${localeHref("/matches",lang)}"]`).last()).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();await page.screenshot({path:`${out}/${lang}-${width}-${code}.png`,animations:'disabled'});}
 expect(writes).toBe(0);
});
