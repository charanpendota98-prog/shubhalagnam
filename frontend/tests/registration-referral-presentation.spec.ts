import {localeHref} from "./locale-href";
import {test,expect} from '@playwright/test';
import fs from 'node:fs';
fs.mkdirSync('artifacts/registration-referral-presentation',{recursive:true});
for(const lang of ['en','te'])for(const width of [320,390,1280])test(`referral presentation exact credits and long name ${lang} ${width}`,async({page})=>{
 await page.setViewportSize({width,height:1000});await page.addInitScript(l=>{localStorage.setItem('tsap_lang',l);sessionStorage.setItem('tsap_click_fired','1');},lang);
 let credits=2;let long=false;let writes=0;
 await page.route('**/api/**',r=>{if(r.request().method()!=='GET')writes++;
 if(r.request().url().includes('/api/referral/validate/'))return r.fulfill({json:{success:true,ok:true,valid_code:true,code:'MVREFTEST',referrer_name:long?'F'.repeat(200):'Fixture Referrer',bonus_credits:credits}});
 return r.fulfill({json:{success:true,castes:['Kapu'],items:[]}});});
 await page.goto(localeHref('/register?ref=MVREFTEST',lang));const banner=page.getByTestId('registration-referral-banner');await expect(banner).toContainText('Fixture Referrer');
 await expect(banner).toContainText(lang==='en'?'Eligible for +2':'అదనపు పరిచయ అభ్యర్థనలకు అర్హత');
 await expect(banner).toContainText(lang==='en'?'not cash':'నగదు కావు');await expect(banner.locator('svg')).toHaveCount(1);await expect(banner.locator('svg')).toHaveAttribute('aria-hidden','true');await expect(banner).not.toContainText('🎁');
 if(lang==='te')expect(await banner.innerText()).not.toMatch(/referral|attachment|interest|request|credit|cash|contact|unlock|valid/i);
 await banner.screenshot({path:`artifacts/registration-referral-presentation/positive-${lang}-${width}.png`});
 credits=0;await page.reload();await expect(banner).toContainText(lang==='en'?'Bonus request credits: 0':'అదనపు పరిచయ అభ్యర్థనలు: 0');await expect(banner).not.toContainText('+1');await expect(banner).not.toContainText('Eligible for');await banner.screenshot({path:`artifacts/registration-referral-presentation/zero-${lang}-${width}.png`});
 long=true;credits=2;await page.reload();await expect(banner).toContainText('F'.repeat(200));expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await banner.screenshot({path:`artifacts/registration-referral-presentation/long-${lang}-${width}.png`});expect(writes).toBe(0);
});
