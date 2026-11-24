import {test,expect} from '@playwright/test';
import fs from 'node:fs';
for(const lang of ['te','en'])for(const width of [320,390,1280])test(`elder note privacy warning ${lang} ${width}`,async({page})=>{
 await page.setViewportSize({width,height:920});await page.addInitScript(l=>localStorage.setItem('tsap_lang',l),lang);
 const posts:any[]=[],errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));let success=false;
 await page.route('**/api/**',r=>{
  const path=new URL(r.request().url()).pathname;
  if(r.request().method()!=='GET'){posts.push(r.request().postDataJSON());return r.fulfill({status:success?200:503,json:success?{success:true}:{detail:'Fixture not saved'}})}
  return r.fulfill({json:path.startsWith('/api/review-links/')?{success:true,label:'FICTIONAL LOCAL FIXTURE',views_remaining:7,expires_at:'2099-01-01T00:00:00Z',profile:{first_name:'Fictional Member',tsap_id:'FIXTURE-ONLY',photo_private:true}}:{success:true,items:[]}})
 });
 await page.goto('/review/FICTIONAL-LOCAL-ONLY');await expect(page.locator('h1')).toContainText('Fictional Member');
 const warning=page.locator('#elder-feedback-privacy');await expect(warning).toContainText(lang==='te'?'సేవ్ చేసే ముందు దాచబడవచ్చు':'may be hidden before saving');await expect(warning).toContainText(lang==='te'?'సంప్రదింపు వివరాలు రాయవద్దు':'Do not include contact details');
 for(const name of ['Reviewer name','Reviewer relation','Elder review note'])await expect(page.getByLabel(name,{exact:true})).toHaveAttribute('aria-describedby','elder-feedback-privacy');
 const send=page.getByRole('button',{name:lang==='te'?'అభిప్రాయం పంపండి':'Send Private Note',exact:true});await expect(send).toBeDisabled();
 await page.getByLabel('Reviewer name',{exact:true}).fill('Fictional Reviewer');await page.getByLabel('Elder review note',{exact:true}).fill('A fictional note for the profile owner.');await expect(send).toBeEnabled();
 await warning.scrollIntoViewIfNeeded();await page.evaluate(()=>document.fonts.ready);fs.mkdirSync('artifacts/elder-note-warning',{recursive:true});await page.screenshot({path:`artifacts/elder-note-warning/${lang}-${width}.png`});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();
 await send.click();await expect(page.locator('.mv-private-fallback [role=alert]')).toContainText('Fixture not saved');await expect(page.getByLabel('Elder review note',{exact:true})).toHaveValue('A fictional note for the profile owner.');await expect(warning).toBeVisible();success=true;await send.click();await expect(page.locator('.mv-private-fallback [role=status]')).toContainText(lang==='te'?'సేవ్':'saved');await expect(page.getByLabel('Elder review note',{exact:true})).toHaveValue('');expect(posts).toEqual(Array(2).fill({reviewer_name:'Fictional Reviewer',relation:'Family Elder',note:'A fictional note for the profile owner.'}));expect(errors).toEqual([]);
});
