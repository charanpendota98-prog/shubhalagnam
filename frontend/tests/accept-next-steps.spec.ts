import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs';
fs.mkdirSync('artifacts/accept-next-steps',{recursive:true});
const row=(status:string,own:'to'|'from')=>({request_id:'UI_'+status,from_id:own==='from'?'UI_ONLY':'UI_OTHER',to_id:own==='to'?'UI_ONLY':'UI_OTHER',status,credit_refunded:false});
for(const lang of ['en','te'])for(const width of [320,390,1280])for(const withAccepted of [true,false])test(`accepted next-steps card ${lang} ${width} accepted=${withAccepted}`,async({page})=>{
 await page.setViewportSize({width,height:900});
 await page.addInitScript(l=>{localStorage.setItem('tsap_lang',l);localStorage.setItem('tsap_id','UI_ONLY');localStorage.setItem('tsap_token','synthetic-only')},lang);
 const status=withAccepted?'accepted':'pending';
 await page.route('**/api/**',r=>{const path=new URL(r.request().url()).pathname;
  if(path==='/api/auth/verify')return r.fulfill({json:{valid:true,tsap_id:'UI_ONLY'}});
  if(path==='/api/interest/inbox/UI_ONLY')return r.fulfill({json:{tsap_id:'UI_ONLY',pending:withAccepted?0:1,accepted:withAccepted?1:0,declined:0,expired:0,received:[{...row(status,'to'),requester_phone:withAccepted?'90••••••01':undefined}]}});
  if(path==='/api/interest/sent/UI_ONLY')return r.fulfill({json:{tsap_id:'UI_ONLY',pending:withAccepted?0:1,accepted:withAccepted?1:0,sent:[{...row(status,'from'),contact:withAccepted?'90••••••01':undefined}]}});
  return r.fulfill({json:{success:true,credits:3,received:[],sent:[],saved:[],templates:[],plans:[]}})
 });
 await page.goto('/requests');
 const card=page.getByTestId('accepted-next-steps');
 for(const tab of [lang==='en'?/Received|Inbox/:/వచ్చిన/,lang==='en'?/Sent/:/పంపిన/]){
  await page.getByRole('button',{name:tab}).first().click();
  if(withAccepted){
   await expect(card).toBeVisible();await expect(card.getByRole('heading')).toHaveText(lang==='en'?'Next steps after acceptance':'అంగీకారం తర్వాత తదుపరి దశలు');
   await expect(card.getByRole('listitem')).toHaveCount(3);
   await expect(card.getByRole('link')).toHaveAttribute('href','/safety');
   await expect(card.getByText(/\d{6,}/)).toHaveCount(0);
   if(lang==='te')await expect(card).not.toContainText(/Never send|Report anyone/);
   const ax=await new AxeBuilder({page}).include('[data-testid="accepted-next-steps"]').withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();
   expect(ax.violations.filter(v=>v.impact==='serious'||v.impact==='critical').map(v=>v.id)).toEqual([]);
   if(lang==='te')await expect(card).toContainText('ఈ సైట్‌లోని ఫారమ్‌లో');else await expect(card).toContainText('verification form');
   const box=await card.boundingBox();expect(box!.width).toBeLessThanOrEqual(width);
  }else await expect(card).toHaveCount(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();
 }
 await page.evaluate(()=>{(document.activeElement as HTMLElement)?.blur();window.scrollTo({top:0,behavior:'instant'})});await page.waitForTimeout(250);
 await page.screenshot({path:`artifacts/accept-next-steps/${lang}-${width}-${withAccepted?'accepted':'pending'}.png`,fullPage:true});
});
