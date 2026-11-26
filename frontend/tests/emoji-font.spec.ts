import {test,expect} from '@playwright/test';
import fs from 'node:fs';

fs.mkdirSync('artifacts/emoji-font',{recursive:true});
for(const lang of ['en','te'])for(const width of [320,390,1280])test(`emoji fallback preserves creator options ${lang} ${width}`,async({page})=>{
 await page.setViewportSize({width,height:950});
 await page.route('**/api/**',r=>r.fulfill({json:{success:true,items:[]}}));
 await page.goto(`${lang==='en'?'/en':''}/referral/register`);
 await expect(page.getByRole('heading',{level:1})).toContainText('Manavivaha Creator Club');
 for(const label of lang==='en'?['Students','Homemakers','Working pros','Anyone with a phone']:['విద్యార్థులు','గృహిణులు','ఉద్యోగస్తులు','ఫోన్ ఉన్న ఎవరైనా'])await expect(page.getByText(label,{exact:true})).toBeVisible();
 const name=page.getByRole('textbox',{name:lang==='en'?'Your name':'మీ పేరు',exact:true});
 await name.fill('Fictional Font Test');
 await expect(name).toHaveValue('Fictional Font Test');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 // Force the shipped font for an isolated probe, independent of CI's native emoji fonts.
 await page.evaluate(()=>{const el=document.createElement('span');el.id='emoji-font-probe';el.style.fontFamily='"Manavivaha Emoji"';el.textContent='🤝 🧑‍🌾 🪷';document.body.append(el)});
 await page.evaluate(()=>document.fonts.load('24px "Manavivaha Emoji"','🤝🧑‍🌾🪷'));
 expect(await page.evaluate(()=>[...document.fonts].find(f=>f.family==='Manavivaha Emoji')?.status)).toBe('loaded');
 const cdp=await page.context().newCDPSession(page);await cdp.send('DOM.enable');await cdp.send('CSS.enable');
 const doc=await cdp.send('DOM.getDocument');const node=await cdp.send('DOM.querySelector',{nodeId:doc.root.nodeId,selector:'#emoji-font-probe'});
 const fonts=await cdp.send('CSS.getPlatformFontsForNode',{nodeId:node.nodeId});
 expect(fonts.fonts.some(f=>f.isCustomFont&&f.familyName==='Noto Color Emoji')).toBe(true);
 await page.locator('#emoji-font-probe').evaluate(e=>e.remove());
 await page.screenshot({path:`artifacts/emoji-font/${lang}-${width}.png`,fullPage:true});
});

test('failed emoji download keeps form text and controls usable',async({page})=>{
 await page.route('**/icons/fonts/*.woff2',r=>r.abort());
 await page.route('**/api/**',r=>r.fulfill({json:{success:true,items:[]}}));
 await page.goto('/en/referral/register');
 await expect(page.getByRole('heading',{level:1})).toContainText('Manavivaha Creator Club');
 const name=page.getByRole('textbox',{name:'Your name',exact:true});await name.fill('Fictional Failure');
 await expect(name).toHaveValue('Fictional Failure');
 await expect(page.getByRole('button',{name:/Create my Partner ID/})).toBeVisible();
 const fontStack=await page.getByRole('heading',{level:1}).evaluate(e=>getComputedStyle(e).fontFamily);
 expect(fontStack.indexOf('Noto Color Emoji')).toBeLessThan(fontStack.indexOf('Manavivaha Emoji'));
 expect(fontStack).toContain('sans-serif');
 // Font failure may leave decorative tofu on an emoji-less device, never invisible labels.
 await expect(page.getByText('Anyone with a phone',{exact:true})).toBeVisible();
});


test('available native-name emoji face wins without fallback download',async({page})=>{
 // Controlled native-face stand-in: proves stack precedence, not an OS-font claim.
 const bytes=fs.readFileSync('public/icons/fonts/manavivaha-emoji-v1.woff2').toString('base64');
 await page.addInitScript(async data=>{
  const raw=Uint8Array.from(atob(data),c=>c.charCodeAt(0));
  const face=new FontFace('Noto Color Emoji',raw);await face.load();document.fonts.add(face);
 },bytes);
 const requested:string[]=[];page.on('request',r=>{if(r.url().includes('/icons/fonts/'))requested.push(r.url())});
 await page.route('**/api/**',r=>r.fulfill({json:{success:true,items:[]}}));
 await page.goto('/en/referral/register');await page.evaluate(()=>document.fonts.ready);
 await expect(page.getByRole('heading',{level:1})).toContainText('Creator Club');
 expect(await page.evaluate(()=>[...document.fonts].find(f=>f.family==='Manavivaha Emoji')?.status)).toBe('unloaded');
 expect(requested).toHaveLength(0);
});
