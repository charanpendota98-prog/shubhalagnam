import {localeHref} from "./locale-href";
import {test,expect} from '@playwright/test';
import fs from 'node:fs';
const out='artifacts/mv-private-offline-review';fs.mkdirSync(out,{recursive:true});
for(const lang of ['te','en'])for(const width of [320,390,1280])test(`private fallback ${lang} ${width}`,async({page})=>{
 await page.setViewportSize({width,height:950});await page.emulateMedia({reducedMotion:'reduce'});await page.addInitScript(l=>localStorage.setItem('tsap_lang',l),lang);
 let mode='ok',feedback='http',reads=0;const posts:any[]=[],errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/**',async r=>{const p=new URL(r.request().url()).pathname;const reply=(json:any,status=200)=>r.fulfill({json,status});if(r.request().method()!=='GET'){posts.push({path:p,body:r.request().postDataJSON()});if(p.endsWith('/feedback'))return feedback==='network'?r.abort():feedback==='ok'?reply({success:true,status:'saved'}):reply({detail:'FICTIONAL REJECTED, NOT SAVED'},400);return reply({success:false},503)}
 if(p.startsWith('/api/review-links/')){reads++;if(mode==='network')return r.abort();if(mode==='missing')return reply({detail:'Expired fictional token'},404);if(mode==='malformed')return reply({success:true});return reply({success:true,label:'FICTIONAL FAMILY REVIEW ONLY',views_remaining:7,expires_at:'2099-01-01T00:00:00Z',profile:{first_name:'FICTIONAL MEMBER FOR LAYOUT',tsap_id:'FICTIONAL-ONLY',age:29,height:'5 ft 8 in',marital_status:'Never Married',religion:'Fictional fixture',education:'FICTIONAL EDUCATION FOR WRAPPING TEST',education_detail:'Not a real member',job:'Fictional occupation',district:'Hyderabad',state:'Telangana',country:'India',photo_private:true,about_myself:'Fictional summary for local layout testing only. No real person is represented.',disclaimer_te:'పరీక్ష కోసం మాత్రమే. నిజమైన సభ్యుడు కాదు.',disclaimer_en:'Fictional local fixture. Not a real member.'}})}return reply({success:true,items:[]})});
 const shot=async(name:string,focus?:string)=>{if(focus)await page.locator(focus).first().scrollIntoViewIfNeeded();else await page.evaluate(()=>scrollTo(0,0));await page.evaluate(()=>document.fonts.ready);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();await page.screenshot({path:`${out}/${lang}-${width}-${name}.png`,animations:'disabled'});await page.screenshot({path:`${out}/${lang}-${width}-${name}-full.png`,fullPage:true,animations:'disabled'})};
 const open=async()=>{await page.goto(localeHref('/review/FICTIONAL-NOT-A-REAL-TOKEN',lang));await page.waitForLoadState('networkidle');await expect(page.locator('h1:visible')).toHaveCount(1);await expect(page.locator('.route-context')).toHaveCount(0)};
 await open();await expect(page.locator('h1')).toContainText('FICTIONAL');await expect(page.locator('.mv-private-fallback img')).toHaveCount(0);await shot('review-summary');await shot('review-details','dl');
 // Toggle both ways while the private form is dirty. No reload, extra read,
 // or accidental feedback submit may discard or duplicate the visitor's work.
 await page.getByLabel('Reviewer name',{exact:true}).fill('Unsaved Fictional Reviewer');
 await page.getByLabel('Elder review note',{exact:true}).fill('Unsaved fictional note.');
 const before=reads,originalUrl=page.url();
 await page.evaluate(()=>{(window as any).__privateReviewDocument='kept'});
 for(const next of [lang==='te'?'en':'te',lang]){
  await page.getByRole('button',{name:next==='en'?'Show in English':'తెలుగులో చూపించండి',exact:true}).click();
  await expect(page.locator('html')).toHaveAttribute('lang',`${next}-IN`);
  await expect(page.getByLabel('Reviewer name',{exact:true})).toHaveValue('Unsaved Fictional Reviewer');
  await expect(page.getByLabel('Elder review note',{exact:true})).toHaveValue('Unsaved fictional note.');
  expect(page.url()).toBe(originalUrl);expect(await page.evaluate(()=>(window as any).__privateReviewDocument)).toBe('kept');
  expect(reads).toBe(before);expect(posts).toHaveLength(0);
 }
 await page.getByLabel('Reviewer name',{exact:true}).fill('');await page.getByLabel('Elder review note',{exact:true}).fill('');
 const send=page.getByRole('button',{name:lang==='te'?'అభిప్రాయం పంపండి':'Send Private Note',exact:true});await expect(send).toBeDisabled();await page.getByLabel('Reviewer name',{exact:true}).fill('Fictional Reviewer');await page.getByLabel('Elder review note',{exact:true}).fill('Fictional note, not a real opinion.');await shot('review-form','textarea');await send.click();await expect(page.locator('.mv-private-fallback [role=alert]')).toContainText('FICTIONAL REJECTED');await expect(page.getByLabel('Elder review note',{exact:true})).toHaveValue('Fictional note, not a real opinion.');await shot('review-feedback-error','[role=alert]');feedback='network';await send.click();await expect(page.locator('.mv-private-fallback [role=alert]')).toContainText(lang==='te'?'నిర్ధారించలేకపోయాం':'Could not confirm');feedback='ok';await send.click();await expect(page.locator('.mv-private-fallback [role=status]')).toContainText(lang==='te'?'సేవ్':'saved');await expect(page.getByLabel('Elder review note',{exact:true})).toHaveValue('');await shot('review-feedback-saved','[role=status]');
 mode='network';await open();await expect(page.locator('h1')).not.toContainText('FICTIONAL');await expect(page.locator('.mv-private-fallback [role=alert]')).toContainText(lang==='te'?'నిర్ధారించలేకపోయాం':'could not be checked');await shot('review-network-error');mode='ok';await page.getByRole('button',{name:lang==='te'?'మళ్లీ ప్రయత్నించండి':'Try again',exact:true}).click();await expect(page.locator('h1')).toContainText('FICTIONAL');mode='malformed';await open();await expect(page.locator('.mv-private-fallback [role=alert]')).toBeVisible();mode='missing';await open();await expect(page.locator('.mv-private-fallback [role=alert]')).toContainText(lang==='te'?'view limit':'view limit');await shot('review-unavailable');
 await page.goto(localeHref('/offline',lang));await expect(page.locator('h1:visible')).toHaveCount(1);await expect(page.locator('.route-context')).toHaveCount(0);await shot('offline');await expect(page.getByRole('link',{name:lang==='te'?'హోమ్‌కు వెళ్ళండి':'Go home',exact:true})).toHaveAttribute('href',localeHref("/",lang));await expect(page.getByRole('link',{name:lang==='te'?'సంబంధాలు చూడండి':'See matches',exact:true})).toHaveAttribute('href',localeHref("/matches",lang));expect(errors).toEqual([]);expect(posts).toHaveLength(3);expect(posts.every(x=>x.path==='/api/review-links/FICTIONAL-NOT-A-REAL-TOKEN/feedback')).toBeTruthy();expect(posts[0].body).toEqual({reviewer_name:'Fictional Reviewer',relation:'Family Elder',note:'Fictional note, not a real opinion.'});
});
for(const lang of ['te','en'])test(`service worker offers localized cached offline fallback without private API cache ${lang}`,async({page,context})=>{
 await page.route('**/api/**',r=>r.fulfill({json:{success:true,items:[]}}));
 await page.goto(localeHref('/offline',lang));
 await page.evaluate(async()=>{await navigator.serviceWorker.register('/sw.js');await navigator.serviceWorker.ready});
 await expect.poll(()=>page.evaluate(()=>!!navigator.serviceWorker.controller)).toBeTruthy();
 await expect.poll(()=>page.evaluate(async offline=>!!(await caches.match(offline)),localeHref('/offline',lang))).toBeTruthy();
 await page.reload();await page.waitForLoadState('networkidle');
 try{
  await context.setOffline(true);
  // Unknown paths must retain their intended prefix; localeHref only maps known routes.
  await page.goto(`${lang==='en'?'/en':''}/preview-never-cached-page`);
  await expect(page.locator('h1')).toContainText(lang==='te'?'ఇంటర్నెట్':"Looks like there's no internet");
  await expect(page.locator('html')).toHaveAttribute('lang',`${lang}-IN`);
  await expect(page.getByRole('link',{name:lang==='te'?'హోమ్‌కు వెళ్ళండి':'Go home',exact:true})).toHaveAttribute('href',localeHref('/',lang));
  await page.screenshot({path:`${out}/service-worker-offline-fallback-${lang}.png`,fullPage:true});
  const keys=await page.evaluate(async()=>{const keys:string[]=[];for(const n of await caches.keys())keys.push(...(await(await caches.open(n)).keys()).map(r=>r.url));return keys});
  expect(keys.some(x=>/^\/(?:en\/)?(?:api|review|me|photos|voice|cards)(?:\/|$)/.test(new URL(x).pathname))).toBeFalsy();
 }finally{await context.setOffline(false)}
});
