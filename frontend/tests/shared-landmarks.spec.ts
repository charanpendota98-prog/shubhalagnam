import {localeHref} from "./locale-href";
import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs';import path from 'node:path';
const dir=path.resolve('artifacts/shared-landmarks');fs.mkdirSync(dir,{recursive:true});
for(const lang of ['en','te'])for(const width of [320,1280])for(const route of ['/compare','/lagna-patrika'])test(`one main ${route} ${lang} ${width}`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.addInitScript(l=>localStorage.setItem('tsap_lang',l),lang);await page.goto(localeHref(route,lang));await expect(page.locator('main')).toHaveCount(1);await expect(page.locator('h1').first()).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();const scan=await new AxeBuilder({page}).withRules(['landmark-one-main','landmark-main-is-top-level']).analyze();expect(scan.violations).toEqual([]);await page.screenshot({path:path.join(dir,`${route.slice(1)}-${lang}-${width}.png`)});
});
