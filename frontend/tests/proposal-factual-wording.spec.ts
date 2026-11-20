import {test,expect} from '@playwright/test';
for(const lang of ['en','te'])for(const width of [320,1280])test(`proposal links and absent gender stay factual ${lang} ${width}`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.addInitScript(l=>localStorage.setItem('tsap_lang',l),lang);const writes:string[]=[];
 await page.route('**/api/**',r=>{if(r.request().method()!=='GET')writes.push(r.request().url());return r.fulfill({json:r.request().url().includes('/api/search?')?{results:[{tsap_id:'TEST-FACTUAL',full_name:'Fictional Proposal',age:28}],total:1,count:1,offset:0,limit:24}:{success:true}})});
 await page.goto('/matches');await page.addStyleTag({content:'html,body{scroll-behavior:auto!important}'});await page.locator('.matches-profile-card').getByRole('button',{name:lang==='en'?/Share on WhatsApp/:/WhatsApp షేర్|వాట్సాప్‌లో పంచుకోండి/}).click();const d=page.getByRole('dialog');const preview=d.locator('pre');await expect(d.getByRole('button',{name:lang==='en'?'Close':'మూసివేయండి',exact:true})).toBeInViewport();
 await expect(preview).toContainText('TEST-FACTUAL');await expect(preview).not.toContainText(/వరుడు|అబ్బాయి|వధువు|అమ్మాయి|సరితూగే|full profile and photo|ప్రొఫైల్ వివరాలు & ఫోటో|HD కలర్/);
 await expect(preview).toContainText(lang==='te'?'పూర్తి ప్రొఫైల్ వివరాల లింక్:':'View the full profile:');await expect(preview).toContainText(lang==='te'?'బయోడేటా రూపొందించడానికి లింక్:':'Create a shareable biodata:');
 await expect(preview).toContainText('/search/TEST-FACTUAL');await expect(preview).toContainText('/biodata?id=TEST-FACTUAL');await page.screenshot({path:`artifacts/proposal-factual/${lang}-${width}.png`});expect(writes).toEqual([]);
});
