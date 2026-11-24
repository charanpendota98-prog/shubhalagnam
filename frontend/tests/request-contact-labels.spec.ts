import {test,expect} from '@playwright/test';
import fs from 'node:fs';
fs.mkdirSync('artifacts/request-labels',{recursive:true});
for(const lang of ['en','te'])for(const width of [320,390,1280])test(`request contact/status labels ${lang} ${width}`,async({page})=>{
 await page.setViewportSize({width,height:900});
 await page.addInitScript(l=>{localStorage.setItem('tsap_lang',l);localStorage.setItem('tsap_id','UI_ONLY');localStorage.setItem('tsap_token','synthetic-only')},lang);
 const states=['pending','declined','expired','withdrawn','accepted'];
 await page.route('**/api/**',r=>{const path=new URL(r.request().url()).pathname;
  if(path==='/api/auth/verify')return r.fulfill({json:{valid:true,tsap_id:'UI_ONLY'}});
  if(path==='/api/interest/sent/UI_ONLY')return r.fulfill({json:{tsap_id:'UI_ONLY',pending:1,accepted:1,sent:states.map(status=>({request_id:'UI_'+status,from_id:'UI_ONLY',to_id:status==='accepted'?'ISOLATED-BRIDE':'UI_'+status,status,credit_refunded:['declined','expired','withdrawn'].includes(status),contact:status==='accepted'?'90••••••01':'SHOULD_NOT_RENDER',profile:{full_name:status==='accepted'?'Isolated Bride':'Synthetic '+status,age:28,district:'Hyderabad',state:'TS',caste:'Kapu'}}))}});
  return r.fulfill({json:{success:true,credits:3,received:[],sent:[],saved:[],templates:[],plans:[]}})
 });
 await page.goto('/requests');await page.getByRole('button',{name:lang==='en'?/Sent/:/పంపిన/}).click();
 await expect(page.getByText('SHOULD_NOT_RENDER',{exact:true})).toHaveCount(0);
 await expect(page.getByText(lang==='en'?'After acceptance':'ఆమోదం తర్వాత',{exact:true})).toHaveCount(4);
 await expect(page.getByText('90••••••01').first()).toBeVisible();await expect(page.getByRole('link',{name:lang==='en'?/View contact QR/:/Contact QR/})).toHaveCount(1);await expect(page.getByRole('link',{name:lang==='en'?/View contact QR/:/Contact QR/})).toHaveAttribute('href',/\?contact=qr$/);
 const accepted=page.locator('.mv-card').filter({has:page.getByText('Isolated Bride (28y)',{exact:true})});const name=accepted.getByText('Isolated Bride (28y)',{exact:true});expect(await name.evaluate(e=>e.getBoundingClientRect().width)).toBeGreaterThan(150);await expect(accepted.getByRole('link',{name:/Contact QR|contact QR/}).locator('svg')).toHaveCount(1);expect(await accepted.innerText()).not.toContain('📇');
 await expect(page.getByText(lang==='en'?'Withdrawn':'రద్దు చేయబడింది',{exact:true})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();
 await page.evaluate(()=>{(document.activeElement as HTMLElement)?.blur();window.scrollTo({top:0,behavior:'instant'})});await page.waitForTimeout(250);await page.screenshot({path:`artifacts/request-labels/${lang}-${width}.png`,fullPage:true});
});

const id='REQ-261124-abcdefghijklmnopabcdefghijklmnop';
for(const lang of ['en','te'])test(`long request IDs stay inside mobile cards ${lang}`,async({page})=>{
 await page.setViewportSize({width:320,height:920});await page.addInitScript(l=>{localStorage.setItem('tsap_lang',l);localStorage.setItem('tsap_id','UI_ONLY');sessionStorage.setItem('tsap_token','fictional-only')},lang);
 await page.route('**/api/**',r=>{const p=new URL(r.request().url()).pathname;if(p==='/api/auth/verify')return r.fulfill({json:{valid:true,tsap_id:'UI_ONLY'}});if(p==='/api/interest/inbox/UI_ONLY')return r.fulfill({json:{tsap_id:'UI_ONLY',pending:1,accepted:0,declined:0,expired:0,received:[{request_id:id,from_id:'FICTIONAL',to_id:'UI_ONLY',status:'pending',requester:{full_name:'Fictional Sender',age:28},actions:[]}]}});if(p==='/api/interest/send')return r.fulfill({json:{success:true,request_id:id,expires_in_days:7,credits_left:2}});return r.fulfill({json:{success:true,credits:3,received:[],sent:[],saved:[],templates:[],plans:[]}})});
 await page.goto('/requests');await page.getByRole('button',{name:lang==='en'?'Show in English':'తెలుగులో చూపించండి',exact:true}).first().click();const received=page.getByText(id,{exact:true});await expect(received).toBeVisible();expect(await received.evaluate(e=>getComputedStyle(e).wordBreak)).toBe('break-all');await received.scrollIntoViewIfNeeded();await page.waitForTimeout(700);fs.mkdirSync('/downloads/request-longids',{recursive:true});await page.screenshot({path:`/downloads/request-longids/received-${lang}-320.png`});
 await page.getByRole('button',{name:lang==='en'?'Send interest':'ఆసక్తి తెలపండి',exact:true}).first().click();await page.getByRole('textbox',{name:lang==='en'?'Recipient Profile ID':'ఆసక్తి తెలపాలనుకున్న ప్రొఫైల్ ID',exact:true}).fill('FICTIONAL');await page.getByRole('button',{name:lang==='en'?'Send interest':'ఆసక్తి తెలపండి',exact:true}).last().click();const sent=page.getByText(new RegExp(id+' '+(lang==='en'?'sent':'పంపించారు')));await expect(sent).toBeVisible();expect(await sent.evaluate(e=>getComputedStyle(e).wordBreak)).toBe('break-all');await sent.scrollIntoViewIfNeeded();await page.waitForTimeout(500);await page.screenshot({path:`/downloads/request-longids/sent-${lang}-320.png`});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
