import {localeHref} from "./locale-href";
import {test,expect} from '@playwright/test';
import fs from 'node:fs';
const owner='TEST-ACTIVITY';
function activity(empty=false){return {tsap_id:owner,sent:{total:empty?0:4,pending:empty?0:1,accepted:empty?0:1,declined:empty?0:1,expired:empty?0:1},received:{total:empty?0:2,pending:empty?0:1,accepted:empty?0:1},responded:empty?0:2,response_rate_percent:empty?0:50,median_response_hours:empty?null:12,oldest_pending_hours:empty?null:24,sample_size:empty?0:4,small_sample:true,note_en:'Counts come from this account only. This is not a forecast.',note_te:'ఈ లెక్కలు ఈ ఖాతాకు మాత్రమే. ఇది భవిష్యత్తు అంచనా కాదు.'};}
async function setup(page:any,lang='en',payload:any=activity(),mode='ok'){
 await page.addInitScript(({lang,owner}:any)=>{localStorage.setItem('tsap_lang',lang);localStorage.setItem('tsap_id',owner)},{lang,owner});
 let attempts=0,writes=0,recovered=false;let release!:()=>void;const delayed=new Promise<void>(resolve=>release=resolve);
 await page.route('**/api/**',async(r:any)=>{const path=new URL(r.request().url()).pathname;if(!['GET','HEAD'].includes(r.request().method()))writes++;
 if(path==='/api/auth/verify')return r.fulfill({json:{valid:true,tsap_id:owner}});
 if(path.endsWith('/activity')){attempts++;if(!recovered&&mode==='network')return r.abort('failed');if(!recovered&&mode==='delay')await delayed;return r.fulfill({status:!recovered&&mode==='http'?503:200,json:recovered?activity():payload});}
 return r.fulfill({json:{success:true,items:[]}})});
 await page.goto(localeHref('/me',lang)); await page.locator('.account-activity summary').click();
 return {section:page.getByRole('region',{name:lang==='en'?'Your activity':'మీ కార్యకలాపాలు',exact:true}),attempts:()=>attempts,writes:()=>writes,recover:()=>{recovered=true;release()}};
}
for(const lang of ['en','te'])for(const width of [320,390,1280])test(`activity failure retry ${lang} ${width}`,async({page})=>{
 await page.setViewportSize({width,height:920});const {section,attempts,writes,recover}=await setup(page,lang,{},'http');
 await expect(section.getByRole('alert')).toBeVisible();await expect(section.getByText('Sent 0')).toHaveCount(0);
 const retry=section.getByRole('button',{name:lang==='en'?'Retry activity':'కార్యకలాపాల వివరాలు మళ్లీ తెప్పించండి',exact:true});await retry.scrollIntoViewIfNeeded();
 fs.mkdirSync('artifacts/member-activity-read',{recursive:true});await page.screenshot({path:`artifacts/member-activity-read/error-${lang}-${width}.png`});recover();await retry.focus();await page.keyboard.press('Enter');
 await expect(section.getByRole('alert')).toHaveCount(0);await expect(section.getByText('50%',{exact:true})).toBeVisible();await expect(section.locator('svg')).toHaveCount(1);
 await expect(section).not.toContainText('📊');expect(attempts()).toBeGreaterThanOrEqual(2);expect(writes()).toBe(0);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await section.scrollIntoViewIfNeeded();await page.screenshot({path:`artifacts/member-activity-read/ready-${lang}-${width}.png`});
});
for(const mode of ['network','sparse','owner','string-count','negative','fraction','bad-total','bad-rate','bad-hours','no-note','empty','delay'])test(`activity payload ${mode}`,async({page})=>{
 let d:any=activity();if(mode==='sparse')d={};if(mode==='owner')d.tsap_id='OTHER';if(mode==='string-count')d.sent.pending='1';if(mode==='negative')d.sent.pending=-1;if(mode==='fraction')d.sample_size=1.5;if(mode==='bad-total')d.sent.total=1;if(mode==='bad-rate')d.response_rate_percent=99;if(mode==='bad-hours')d.median_response_hours='12';if(mode==='no-note')delete d.note_te;if(mode==='empty')d=activity(true);
 const {section,writes,recover}=await setup(page,'en',d,mode);
 if(mode==='empty'){await expect(section.getByText('Sent 0 · Received 0',{exact:true})).toBeVisible();await expect(section.getByText('0%',{exact:true})).toBeVisible();}
 else if(mode==='delay'){await expect(section.getByRole('status')).toBeVisible();await expect(section.getByText('Sent 0')).toHaveCount(0);recover();await expect(section.getByText('50%',{exact:true})).toBeVisible();}
 else{await expect(section.getByRole('alert')).toBeVisible();await expect(section.getByText('50%',{exact:true})).toHaveCount(0);recover();await section.getByRole('button',{name:'Retry activity',exact:true}).click();await expect(section.getByText('50%',{exact:true})).toBeVisible();}
 expect(writes()).toBe(0);
});
