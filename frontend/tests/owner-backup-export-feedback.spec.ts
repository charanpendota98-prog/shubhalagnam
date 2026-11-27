import {test,expect} from '@playwright/test';
import {localeHref} from './locale-href';
import fs from 'node:fs';

fs.mkdirSync('artifacts/owner-backup-export',{recursive:true});
for(const lang of ['en','te'])for(const mode of ['http','network','success'])test(`owner backup export feedback ${lang} ${mode}`,async({page})=>{
 await page.setViewportSize({width:320,height:950});
 const paths:string[]=[];const writes:string[]=[];
 await page.route('**/api/**',route=>{
  const path=new URL(route.request().url()).pathname;paths.push(path);
  if(route.request().method()!=='GET'){writes.push(path);return route.fulfill({status:405,json:{success:false}})}
  if(path==='/api/control/me')return route.fulfill({json:{role:'owner',username:'FICTIONAL-OWNER'}});
  if(path==='/api/owner/summary')return route.fulfill({json:{success:true,revenue:{collected:0},users:{total:0}}});
  if(path==='/api/admin/backup/export'){
   if(mode==='network')return route.abort('failed');
   if(mode==='http')return route.fulfill({status:503,body:'FICTIONAL-PRIVATE-BACKEND-ERROR'});
   return route.fulfill({contentType:'application/zip',body:Buffer.from('FICTIONAL-EXPORT-NOT-REAL-DATA')});
  }
  return route.fulfill({json:{success:true}});
 });
 await page.goto(localeHref('/owner',lang));
 const button=page.getByRole('button',{name:lang==='en'?'⬇️ Download backup':'⬇️ బ్యాకప్ download',exact:true});
 await expect(button).toBeVisible();
 const downloadPromise=mode==='success'?page.waitForEvent('download',{timeout:15000}):null;
 await button.click();
 const expected=mode==='http'?(lang==='te'?'బ్యాకప్ తీసుకోలేకపోయాం. మళ్లీ ప్రయత్నించండి.':'Backup could not be downloaded. Retry.')
  :mode==='network'?(lang==='te'?'నెట్‌వర్క్ సమస్య వల్ల బ్యాకప్ తీసుకోలేకపోయాం. మళ్లీ ప్రయత్నించండి.':'A network problem prevented the backup download. Retry.')
  :(lang==='te'?'బ్యాకప్ డౌన్‌లోడ్ ప్రారంభించాం. ఫైల్ సేవ్ అయిందో చూసి, భద్రంగా ఉంచండి.':'Backup download started. Check that the file was saved and keep it safe.');
 const status=page.getByText(expected,{exact:true});await expect(status).toHaveText(expected);
 await expect(button).toBeEnabled();expect(paths.filter(p=>p==='/api/admin/backup/export')).toHaveLength(1);
 expect(writes).toEqual([]);await expect(page.locator('main')).not.toContainText('FICTIONAL-PRIVATE-BACKEND-ERROR');
 if(downloadPromise){const download=await downloadPromise;expect(download.suggestedFilename()).toBe('mana-vivaha-backup.zip')}
 await status.scrollIntoViewIfNeeded();await page.screenshot({path:`artifacts/owner-backup-export/${lang}-${mode}.png`});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
