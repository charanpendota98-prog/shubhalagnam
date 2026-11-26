import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import http from 'node:http';
let catalogue:http.Server;
test.beforeAll(async()=>{catalogue=http.createServer((_req,res)=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify({success:true,plans:[{code:'FREE',price:0,profiles:3,label:'Free',telugu:'ఉచితం'},{code:'STARTER',price:99,profiles:5,label:'Starter',telugu:'ఐదు అభ్యర్థనలు'}],addons:[],offers:[],banners:[],mode:'unconfigured'}))});await new Promise<void>((resolve,reject)=>{catalogue.once('error',reject);catalogue.listen(8000,'127.0.0.1',resolve)})});
test.afterAll(async()=>{if(catalogue?.listening)await new Promise<void>((resolve,reject)=>catalogue.close(e=>e?reject(e):resolve()))});
import fixtures from './fixtures/profile-update-errors.json';
fs.mkdirSync('artifacts/api-error-callers',{recursive:true});
const owner='FICTIONAL-LOCALE';
const row={tsap_id:'TEST-CARD',full_name:'Fictional Card Candidate',age:28,caste:'Reddy',district:'Hyderabad'};
for(const lang of ['en','te'])for(const caller of ['pricing','matches','streak'])test(`shared API error locale ${caller} ${lang}`,async({page})=>{
 await page.setViewportSize({width:320,height:950});await page.addInitScript(({owner})=>localStorage.setItem('tsap_id',owner),{owner});
 const writes:string[]=[];await page.route('**/api/**',r=>{
  const p=new URL(r.request().url()).pathname;
  if(r.request().method()!=='GET'){writes.push(p);return r.fulfill({status:400,json:{detail:fixtures.persist503.detail}});}
  if(p==='/api/promo/apply')return r.fulfill({status:400,json:{detail:fixtures.persist503.detail}});
  if(p==='/api/auth/verify')return r.fulfill({json:{valid:true,tsap_id:owner}});
  if(p==='/api/pay/config')return r.fulfill({json:{success:true,mode:'manual_upi'}});
  if(p==='/api/search')return r.fulfill({json:{results:[row],total:1,count:1,offset:0,limit:24}});
  if(p.startsWith('/api/saved/'))return r.fulfill({json:{saved:[]}});
  if(p.startsWith('/api/streak/'))return r.fulfill({json:{success:true,tsap_id:owner,count:2,best:4,next_bonus:1,claimed_today:false}});
  return r.fulfill({json:{success:true,items:[],searches:[]}});
 });
 const prefix=lang==='en'?'/en':'';let feedback;
 if(caller==='pricing'){
  await page.goto(prefix+'/pricing');await page.getByRole('button',{name:lang==='te'?/₹99 చెల్లించండి/:/Pay ₹99/}).first().click();
  await page.getByRole('textbox',{name:lang==='te'?'ఆఫర్ కోడ్':'Offer code',exact:true}).fill('FICTIONAL');
  await page.getByRole('button',{name:lang==='te'?'తనిఖీ చేయండి':'Check',exact:true}).click();
  feedback=page.getByText(lang==='te'?'చెల్లుబాటు అయ్యే ఆఫర్ కోడ్ కాదు.':fixtures.persist503.detail,{exact:true});
 }else if(caller==='matches'){
  await page.goto(prefix+'/matches');await page.locator('.matches-profile-card').getByRole('button',{name:lang==='te'?'ఎంపికల జాబితాలో చేర్చండి':'Shortlist profile',exact:true}).click();
  feedback=page.getByText(lang==='te'?'సేవలో సమస్య ఏర్పడింది. మళ్లీ ప్రయత్నించండి.':fixtures.persist503.detail,{exact:true});
 }else{
  await page.goto(prefix+'/me');await page.locator('.account-secondary-nav summary').click();await page.getByRole('button',{name:lang==='te'?'స్ట్రీక్':'Streak',exact:true}).click();
  await page.getByRole('button',{name:lang==='te'?'రోజువారీ బోనస్ పొందండి':'Claim daily bonus',exact:true}).click();
  feedback=page.getByText(lang==='te'?'సేవలో సమస్య ఏర్పడింది. మళ్లీ ప్రయత్నించండి.':fixtures.persist503.detail,{exact:true});
 }
 await expect(feedback).toBeVisible();if(lang==='te')await expect(page.locator('main')).not.toContainText(fixtures.persist503.detail);
 await feedback.scrollIntoViewIfNeeded();await page.screenshot({path:`artifacts/api-error-callers/${caller}-${lang}-320.png`});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 expect(writes).toEqual(caller==='pricing'?[]:[caller==='matches'?'/api/save':'/api/streak/claim']);
});
