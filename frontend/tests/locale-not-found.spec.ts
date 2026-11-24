import {test,expect} from '@playwright/test';
for(const lang of ['te','en'])test(`unknown URL is a localized real 404 without JavaScript ${lang}`,async({browser,request})=>{
 const path=(lang==='en'?'/en':'')+'/FICTIONAL-UNKNOWN-404/deep';const response=await request.get(path);expect(response.status()).toBe(404);const html=await response.text();expect(html).toContain(`lang="${lang}-IN"`);expect(html).toMatch(/name="robots" content="[^"]*noindex/);expect(html).toContain(lang==='en'?'This page was not found (404)':'ఈ పేజీ దొరకలేదు (404)');
 const c=await browser.newContext({javaScriptEnabled:false});const p=await c.newPage();await p.goto(path);await expect(p.locator('h1')).toHaveText(lang==='en'?'This page was not found (404)':'ఈ పేజీ దొరకలేదు (404)');await expect(p.locator('.mv-missing-page a').first()).toHaveAttribute('href',lang==='en'?'/en':'/');await c.close();
});

test('404 status handling leaves service resources and real routes unchanged',async({request})=>{
 for(const path of ['/','/en','/login','/en/login','/robots.txt','/sitemap.xml','/manifest.webmanifest','/sw.js','/logo.png'])expect((await request.get(path)).status(),path).toBe(200);
 const old=await request.get('/remarriage',{maxRedirects:0});expect(old.status()).toBe(308);expect(old.headers().location).toContain('/second-marriage');
 for(const path of ['/en/FICTIONAL-MISSING.ext','/FICTIONAL-MISSING.ext'])expect((await request.get(path)).status(),path).toBe(404);
});
