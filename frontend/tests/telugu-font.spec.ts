import {test,expect} from '@playwright/test';import fs from 'node:fs';
const asset='/icons/fonts/manavivaha-telugu-v1.woff2';
fs.mkdirSync('artifacts/telugu-font',{recursive:true});
for(const lang of ['en','te'])for(const width of [320,390,1280])test(`Telugu font fit ${lang} ${width}`,async({page})=>{
 await page.setViewportSize({width,height:950});await page.route('**/api/**',r=>r.fulfill({json:{success:true,items:[]}}));await page.goto(`${lang==='en'?'/en':''}/referral/register`);await page.evaluate(()=>document.fonts.ready);
 const field=page.getByRole('textbox',{name:lang==='en'?'Your name':'మీ పేరు',exact:true});await field.fill('Fictional Telugu Font');await expect(field).toHaveValue('Fictional Telugu Font');
 for(const text of lang==='en'?['Students','Homemakers','Working pros','Anyone with a phone']:['విద్యార్థులు','గృహిణులు','ఉద్యోగస్తులు','ఫోన్ ఉన్న ఎవరైనా'])await expect(page.getByText(text,{exact:true})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
 await page.evaluate(()=>{const e=document.createElement('span');e.id='telugu-proof';e.textContent='తెలుగు క్షేత్రం శ్రద్ధ';e.style.fontFamily='"Noto Sans Telugu"';document.body.append(e)});
 await page.locator('#telugu-proof').scrollIntoViewIfNeeded();await page.evaluate(()=>document.fonts.load('16px "Noto Sans Telugu"','తెలుగు'));await page.locator('#telugu-proof').evaluate(e=>e.getBoundingClientRect());
 const cdp=await page.context().newCDPSession(page);await cdp.send('DOM.enable');await cdp.send('CSS.enable');const doc=await cdp.send('DOM.getDocument');const node=await cdp.send('DOM.querySelector',{nodeId:doc.root.nodeId,selector:'#telugu-proof'});const fonts=await cdp.send('CSS.getPlatformFontsForNode',{nodeId:node.nodeId});expect(fonts.fonts.some(f=>f.isCustomFont&&f.familyName==='Noto Sans Telugu')).toBe(true);await page.locator('#telugu-proof').evaluate(e=>e.remove());
 await page.evaluate(()=>{document.documentElement.style.scrollBehavior='auto';window.scrollTo(0,0)});await expect.poll(()=>page.evaluate(()=>window.scrollY)).toBe(0);await page.screenshot({path:`artifacts/telugu-font/${lang}-${width}.png`});
});
test('slow Telugu font never hides English text and failure leaves controls usable',async({page})=>{
 let release!:()=>void;const held=new Promise<void>(r=>release=r);let requested=false;
 await page.route('**/api/**',r=>r.fulfill({json:{success:true,items:[]}}));await page.route('**'+asset,async r=>{requested=true;await held;await r.abort()});
 await page.goto('/en/referral/register',{waitUntil:'domcontentloaded'});await expect.poll(()=>requested).toBe(true);
 await expect(page.getByRole('heading',{level:1})).toBeVisible();await expect(page.getByText('Students',{exact:true})).toBeVisible();
 // Chromium's text-paint event must happen while the font is still held.
 await expect.poll(()=>page.evaluate(()=>performance.getEntriesByName('first-contentful-paint').length)).toBe(1);
 const capture=await (await page.context().newCDPSession(page)).send('Page.captureScreenshot',{format:'png'});fs.writeFileSync('artifacts/telugu-font/english-font-pending.png',Buffer.from(capture.data,'base64'));release();await page.evaluate(()=>document.fonts.ready);
 const name=page.getByRole('textbox',{name:'Your name',exact:true});await name.fill('Fictional Font Failure');await expect(name).toHaveValue('Fictional Font Failure');await expect(page.getByRole('button',{name:/Create my Partner ID/})).toBeVisible();
});
test('English logo and footer share one cached Telugu font body across navigation',async({page})=>{
 // No request interception here: Playwright routing disables the HTTP cache.
 await page.goto('/en/login');await page.evaluate(()=>document.fonts.ready);
 const first=await page.evaluate(a=>performance.getEntriesByType('resource').filter(e=>e.name.endsWith(a)).map(e=>{const r=e as PerformanceResourceTiming;return{body:r.encodedBodySize,transfer:r.transferSize}}),asset);expect(first).toHaveLength(1);expect(first[0].body).toBe(120204);expect(first[0].transfer).toBeGreaterThan(0);
 await page.goto('/en/safety');await page.evaluate(()=>document.fonts.ready);
 const second=await page.evaluate(a=>performance.getEntriesByType('resource').filter(e=>e.name.endsWith(a)).map(e=>({transfer:(e as PerformanceResourceTiming).transferSize})),asset);expect(second).toHaveLength(1);expect(second[0].transfer).toBe(0);
});
test('Latin-only render never requests Telugu font',async({page})=>{
 const requests:string[]=[];page.on('request',r=>{if(r.url().endsWith(asset))requests.push(r.url())});await page.route('**/telugu-text-only',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><main>ABC xyz 0123456789 ©</main>'}));await page.goto('/telugu-text-only');await page.addStyleTag({content:fs.readFileSync('src/app/telugu-font.css','utf8')+'body{font-family:"Noto Sans Telugu",sans-serif}'});await page.evaluate(()=>document.fonts.ready);await page.locator('main').screenshot({path:'artifacts/telugu-font/latin-only.png'});expect(requests).toEqual([]);
});
