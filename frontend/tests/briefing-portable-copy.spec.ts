import {localeHref} from "./locale-href";
import {test,expect} from '@playwright/test';
import fs from 'node:fs';
const owner='TEST-BRIEFING';
for(const lang of ['en','te'])for(const width of [320,390,1280])for(const populated of [false,true])test(`briefing portable copy ${lang} ${width} ${populated}`,async({page})=>{
 await page.setViewportSize({width,height:920});await page.addInitScript(({lang,owner})=>{localStorage.setItem('tsap_lang',lang);localStorage.setItem('tsap_id',owner)},{lang,owner});let writes=0,reads=0;
 await page.route('**/api/**',r=>{const p=new URL(r.request().url()).pathname;if(!['GET','HEAD'].includes(r.request().method()))writes++;
 if(p==='/api/auth/verify')return r.fulfill({json:{valid:true,tsap_id:owner}});
 if(p.includes('/assistant/briefing/')){reads++;return r.fulfill({json:{success:true,tsap_id:owner,summary_telugu:`పరిశీలించడానికి ${populated?1:0} ప్రొఫైళ్లు`,summary_en:`${populated?1:0} profiles to review`,mutual:{interests_received:populated?2:0,profile_views:populated?3:0},nudge:{percent:65,verdict_telugu:'ప్రొఫైల్‌లో ఇంకా నింపాల్సిన వివరాలను పరిశీలించండి.',verdict_en:'Review the suggested fields.'},matches:populated?[{tsap_id:'TEST-CANDIDATE',profile:{full_name:'Fictional profile',age:26,district:'Hyderabad'},is_new:true,observations:[]}]:[],tips:[{priority:1,telugu:'ఫోటో జోడించాలా వద్దా అనేది మీ ఇష్టం.',en:'Adding a photo is optional.',cta:'/me'}]}})}return r.fulfill({json:{success:true,items:[]}})});
 await page.goto(localeHref('/me',lang));await page.locator('.account-activity summary').click();
 const heading=page.getByRole('heading',{name:lang==='en'?'Profiles to review':'పరిశీలించడానికి ప్రొఫైళ్లు',exact:true});await expect(heading).toBeVisible();const panel=heading.locator('xpath=ancestor::section[1]');
 await expect(panel.getByText(lang==='en'?`${populated?1:0} profiles to review`:`పరిశీలించడానికి ${populated?1:0} ప్రొఫైళ్లు`,{exact:true})).toBeVisible();
 expect(await panel.innerText()).not.toMatch(/\p{Extended_Pictographic}/u);
 if(lang==='te')expect((await panel.innerText()).replaceAll('Fictional profile','').replaceAll('Hyderabad','')).not.toMatch(/\b(activity|profiles|interests|profile|views|results|interest)\b/i);
 expect(await heading.locator('svg[aria-hidden=true]').count()).toBe(1);
 if(populated){await expect(panel.locator('a[href="/search/TEST-CANDIDATE"]')).toBeVisible();await expect(panel.locator('a[href="/requests"]')).toBeVisible();}
 const beforeRefresh=reads;const refresh=panel.getByRole('button',{name:lang==='en'?'Refresh match briefing':'రిఫ్రెష్ చేయండి',exact:true});await refresh.focus();await page.keyboard.press('Enter');await expect.poll(()=>reads).toBeGreaterThan(beforeRefresh);expect(writes).toBe(0);
 await heading.scrollIntoViewIfNeeded();fs.mkdirSync('artifacts/briefing-portable-copy',{recursive:true});await page.setViewportSize({width,height:1600});await panel.screenshot({path:`artifacts/briefing-portable-copy/${lang}-${width}-${populated?'populated':'empty'}.png`});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
