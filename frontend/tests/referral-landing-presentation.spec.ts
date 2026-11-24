import {localeHref} from "./locale-href";
import {test,expect} from '@playwright/test';
for(const lang of ['en','te'])for(const width of [320,390,1280])test(`referral entry portable clear presentation ${lang} ${width}`,async({page})=>{
 await page.setViewportSize({width,height:950});await page.addInitScript(l=>localStorage.setItem('tsap_lang',l),lang);
 await page.clock.install();
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 let state='loading';let release:()=>void=()=>{};let loaded=new Promise<void>(r=>{release=r});
 await page.route('**/api/**',async r=>{if(r.request().url().includes('/api/referral/click/')){await loaded;return r.fulfill({json:state==='invalid'?{success:true,valid_code:false}:state==='failure'?{success:false}:{success:true,valid_code:true,referrer_name:'Fictional Referrer',bonus_credits:2}})}return r.fulfill({json:{success:true}})});
 const workspace=page.locator('.mv-partner-workspace:visible');
 await page.goto(localeHref('/r/TESTCODE',lang));await expect(workspace.getByRole('status')).toBeVisible();await expect(workspace.locator('svg')).toHaveCount(1);await expect(workspace.getByRole('heading')).toHaveText(lang==='te'?'ఆహ్వాన సంకేతం':'Referral code');
 state='failure';release();await expect(workspace.getByRole('alert')).toBeVisible();await expect(workspace.locator('svg.lucide-triangle-alert')).toHaveCount(1);await expect(workspace.getByRole('link')).toHaveAttribute('href','/register');
 await page.screenshot({path:`artifacts/referral-presentation/error-${lang}-${width}.png`});
 state='invalid';await workspace.getByRole('button').click();await expect(workspace.getByRole('heading')).toContainText(lang==='te'?'దొరకలేదు':'not found');await expect(workspace).not.toContainText('letter case');await expect(workspace.getByRole('link')).toHaveAttribute('href','/register');await page.screenshot({path:`artifacts/referral-presentation/invalid-${lang}-${width}.png`});
 state='valid';await page.goto(localeHref('/r/TESTCODE?inv=INVITE01&campaign=AAAAAAAAAAAAAAAAAAAAAAAA',lang));await expect(workspace.getByRole('heading')).toContainText('Fictional Referrer');await expect(workspace.locator('svg')).toHaveCount(5);await expect(workspace.getByRole('listitem')).toHaveCount(4);
 await expect(workspace.getByRole('link')).toHaveAttribute('href','/register?ref=TESTCODE&inv=INVITE01&campaign=AAAAAAAAAAAAAAAAAAAAAAAA');
 const text=await workspace.innerText();expect(text).not.toMatch(/\p{Extended_Pictographic}/u);if(lang==='te'){expect(text).not.toMatch(/Register|Code|FREE|requests|Approval|Private|automatic|account|friend|credit/)}
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await page.screenshot({path:`artifacts/referral-presentation/valid-${lang}-${width}.png`});
 if(width===320){await page.setViewportSize({width,height:640});const link=workspace.getByRole('link');await link.scrollIntoViewIfNeeded();await expect(link).toBeInViewport();const box=await link.boundingBox();expect(box).not.toBeNull();if(box)expect(await link.evaluate((el,p)=>el.contains(document.elementFromPoint(p.x,p.y)),{x:box.x+box.width/2,y:box.y+box.height/2})).toBe(true);await page.screenshot({path:`artifacts/referral-presentation/short-${lang}-${width}.png`})}
 await page.clock.runFor(1800);await expect(page).toHaveURL(/\/register\?ref=TESTCODE&inv=INVITE01&campaign=AAAAAAAAAAAAAAAAAAAAAAAA$/,{timeout:8000});expect(errors).toEqual([]);
});
