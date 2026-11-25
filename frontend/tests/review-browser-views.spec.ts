import {test, expect} from '@playwright/test';
import {localeHref} from './locale-href';
import fs from 'node:fs';
for (const lang of ['te','en']) for (const width of [320,1280]) test(`distinct browser review copy ${lang} ${width}`, async ({page}) => {
  await page.setViewportSize({width,height:920});
  let reads=0;
  await page.route('**/api/**', async r => {
    if(new URL(r.request().url()).pathname.startsWith('/api/review-links/')) {
      reads++;
      await new Promise(resolve=>setTimeout(resolve,150));
      return r.fulfill({json:{success:true,label:'Fictional Family',views_remaining:0,expires_at:'2099-01-01',profile:{first_name:'Fictional Member',tsap_id:'FIXTURE-BROWSER',photo_private:true}}});
    }
    return r.fulfill({json:{success:true,items:[]}});
  });
  await page.goto(localeHref('/review/FICTIONAL-BROWSER-ONLY',lang));
  await expect(page.locator('h1')).toContainText('Fictional Member');
  await expect(page.locator('.mv-private-fallback')).toContainText(lang==='te'?'కొత్త బ్రౌజర్లకు మిగిలిన వీక్షణలు: 0':'New browser views remaining: 0');
  await expect(page.locator('.mv-private-fallback')).toContainText(lang==='te'?'కుకీలు తొలగిస్తే':'Clearing cookies or using another browser counts as a new view.');
  expect(reads).toBe(1);
  await page.reload(); await expect(page.locator('h1')).toContainText('Fictional Member'); expect(reads).toBe(2);
  await page.evaluate(()=>document.fonts.ready);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();
  fs.mkdirSync('artifacts/review-browser-views',{recursive:true});
  await page.screenshot({path:`artifacts/review-browser-views/${lang}-${width}.png`});
});
for(const lang of ['te','en']) test(`review browser retry ${lang}`,async({page})=>{
  let reads=0;
  await page.route('**/api/**',r=>{
    if(new URL(r.request().url()).pathname.startsWith('/api/review-links/')){reads++;return r.fulfill(reads===1?{status:503,json:{success:false}}:{json:{success:true,views_remaining:0,profile:{first_name:'Fictional Retry',tsap_id:'FIXTURE',photo_private:true}}})}
    return r.fulfill({json:{success:true,items:[]}});
  });
  await page.goto(localeHref('/review/FICTIONAL-RETRY-ONLY',lang));
  await expect(page.locator('.mv-private-fallback')).toContainText(lang==='te'?'కుకీలు తొలగిస్తే':'Clearing cookies');
  await page.getByRole('button',{name:lang==='te'?'మళ్లీ ప్రయత్నించండి':'Try again',exact:true}).click();
  await expect(page.locator('h1')).toContainText('Fictional Retry');expect(reads).toBe(2);
});
for(const lang of ['te','en'])test(`owner can revoke browser capped link ${lang}`,async({page})=>{
  await page.setViewportSize({width:320,height:920});
  await page.addInitScript(()=>localStorage.setItem('tsap_id','FICTIONAL-OWNER'));
  let revokes=0;
  await page.route('**/api/**',r=>{
    const p=new URL(r.request().url()).pathname;
    if(p==='/api/auth/verify')return r.fulfill({json:{valid:true,tsap_id:'FICTIONAL-OWNER'}});
    if(p.endsWith('/revoke')){revokes++;return r.fulfill({json:{success:true}})}
    if(p.endsWith('/review-links'))return r.fulfill({json:{success:true,links:[{link_id:'FICTIONAL-CAPPED',label:'Fictional Capped Link',status:revokes?'revoked':'active',view_count:1,max_views:1,view_limit_reached:true,feedback:[]}]}});
    return r.fulfill({json:{success:true,items:[]}});
  });
  await page.goto(localeHref('/me',lang));
  await page.locator('.account-secondary-nav summary').click();
  await page.getByRole('button',{name:lang==='en'?'Devices & Elder Links':'పరికరాలు & పెద్దల లింక్‌లు',exact:true}).click();
  const panel=page.locator('#account-task-panel');
  await expect(panel).toContainText(lang==='en'?'New browser limit reached':'కొత్త బ్రౌజర్ల పరిమితి చేరింది');
  await expect(panel).toContainText(lang==='en'?'With cookies enabled':'కుకీలు ఆన్‌లో ఉంటే');
  await panel.screenshot({path:`artifacts/review-browser-views/owner-${lang}-320.png`});
  await panel.getByRole('button',{name:lang==='en'?'Revoke Link':'వెంటనే రద్దు చేయి',exact:true}).click();
  await expect(panel.getByRole('button',{name:lang==='en'?'Revoke Link':'వెంటనే రద్దు చేయి',exact:true})).toHaveCount(0);expect(revokes).toBe(1);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();
});
