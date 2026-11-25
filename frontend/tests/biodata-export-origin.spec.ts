import {localeHref} from "./locale-href";
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
for (const width of [390,1280]) test(`biodata JPG frame starts at document origin ${width}`,async({page})=>{
 await page.setViewportSize({width,height:900});
 await page.addInitScript(()=>localStorage.setItem('tsap_lang','te'));
 await page.route('**/api/**',r=>r.request().method()==='GET'?r.fulfill({json:{success:true,items:[]}}):r.abort());
 await page.goto(localeHref('/biodata',"te"));await page.locator('#biodata-religion').selectOption('Hindu');
 await page.getByRole('button',{name:'వివరాలను సవరించండి',exact:true}).click();
 await page.getByLabel('పూర్తి పేరు',{exact:true}).fill('నమూనా మాత్రమే');
 await page.getByRole('button',{name:'ప్రివ్యూ చూపించండి',exact:true}).click();
 const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'HD JPG డౌన్‌లోడ్ చేయండి',exact:true}).click()]);
 const path=await download.path();expect(path).toBeTruthy();
 const url='data:image/jpeg;base64,'+fs.readFileSync(path!).toString('base64');
 const frame=await page.evaluate(async src=>{
  const im=new Image();im.src=src;await im.decode();const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const ctx=c.getContext('2d')!;ctx.drawImage(im,0,0);
  const row=ctx.getImageData(0,Math.floor(im.height*.4),im.width,1).data;const xs=[];
  for(let x=0;x<im.width;x++){const i=x*4;if(row[i]>55&&row[i]<180&&row[i]>row[i+1]*1.8&&row[i]>row[i+2]*1.25)xs.push(x);}
  return {width:im.width,first:Math.min(...xs),last:Math.max(...xs)};
 },url);
 expect(frame.width).toBe(2000);expect(frame.first).toBeLessThan(15);expect(frame.last).toBeGreaterThan(frame.width-15);
});
