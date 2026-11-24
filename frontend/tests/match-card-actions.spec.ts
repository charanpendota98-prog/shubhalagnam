import {localeHref} from "./locale-href";
import {test,expect} from '@playwright/test';
const row={tsap_id:'TEST-CARD',full_name:'Fictional Card Candidate',age:28,caste:'Reddy',district:'Hyderabad'};
const search={results:[row],total:1,count:1,offset:0,limit:24};
for(const lang of ['en','te'])for(const width of [320,390,1280])test(`visible portable card actions ${lang} ${width}`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.addInitScript(l=>localStorage.setItem('tsap_lang',l),lang);const posts:string[]=[];
 await page.route('**/api/**',r=>{if(r.request().method()!=='GET')posts.push(r.request().url());return r.fulfill({json:r.request().url().includes('/api/search?')?search:{success:true}})});
 await page.goto(localeHref('/matches',lang));const card=page.locator('.matches-profile-card');await expect(card).toBeVisible();await expect(card).toContainText(lang==='en'?'Photo not shown':'ఫోటో కనిపించదు');await expect(card).not.toContainText('Photo Lock');
 const actions=card.locator('.mv-btn');await expect(actions).toHaveCount(4);
 for(const a of await actions.all()){await expect(a.locator('svg')).toHaveCount(1);const text=a.locator('span').last();await expect(text).toBeVisible();expect((await text.innerText()).trim().length).toBeGreaterThan(1);expect(await text.evaluate(e=>getComputedStyle(e).clip==='auto'&&e.getBoundingClientRect().width>10)).toBeTruthy()}
 await expect(card.locator('a[href="/search/TEST-CARD"]')).toHaveCount(2);await expect(card.locator('a[href="/biodata?id=TEST-CARD"]')).toHaveCount(1);
 const save=card.getByRole('button',{name:lang==='en'?'Log in to save this profile':'ఎంపికల జాబితాలో చేర్చడానికి ప్రవేశించండి',exact:true});await expect(save.locator('svg')).toHaveCount(1);await expect(save).toHaveAttribute('aria-pressed','false');
 const share=card.getByRole('button',{name:lang==='en'?'Share on WhatsApp, profile details':'వాట్సాప్‌లో పంచుకోండి, సంబంధం వివరాలు',exact:true});expect(await share.getAttribute('aria-label')).toContain((await share.innerText()).trim());await page.addStyleTag({content:'html,body{scroll-behavior:auto!important}'});await card.evaluate(e=>e.scrollIntoView({block:'start',behavior:'instant'}));await card.screenshot({path:`artifacts/match-card-actions/actions-${lang}-${width}.png`});await share.click();await expect(page.getByRole('dialog',{name:lang==='en'?'Share WhatsApp Proposal':'వాట్సాప్‌లో పంచుకోండి',exact:true})).toBeVisible();expect(posts).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();
});
for(const lang of ['en','te'])test(`shortlist icon and action track confirmed state ${lang}`,async({page})=>{
 let saved=false;const writes:any[]=[];await page.addInitScript(l=>{localStorage.setItem('tsap_lang',l);localStorage.setItem('tsap_id','COOKIE-OWNER')},lang);
 await page.route('**/api/**',r=>{const p=new URL(r.request().url()).pathname;if(p==='/api/auth/verify')return r.fulfill({json:{valid:true,tsap_id:'COOKIE-OWNER'}});if(p==='/api/save'){const b=r.request().postDataJSON();writes.push(b);saved=b.saved;return r.fulfill({json:{success:true,saved}})}if(p.startsWith('/api/saved/'))return r.fulfill({json:{saved:saved?[{profile:row}]:[]}});return r.fulfill({json:p==='/api/search'?search:{success:true,items:[],searches:[]}})});
 await page.goto(localeHref('/matches',lang));const card=page.locator('.matches-profile-card');const add=()=>card.getByRole('button',{name:lang==='en'?'Shortlist profile':'ఎంపికల జాబితాలో చేర్చండి',exact:true});await expect(add()).toBeEnabled();await expect(add().locator('svg')).toHaveAttribute('fill','none');await add().click();const remove=card.getByRole('button',{name:lang==='en'?'Remove from shortlist':'ఎంపికల జాబితా నుండి తొలగించండి',exact:true});await expect(remove).toHaveAttribute('aria-pressed','true');await expect(remove.locator('svg')).toHaveAttribute('fill','currentColor');await remove.click();await expect(add()).toHaveAttribute('aria-pressed','false');expect(writes.map(w=>[w.tsap_id,w.target_id,w.saved])).toEqual([['COOKIE-OWNER','TEST-CARD',true],['COOKIE-OWNER','TEST-CARD',false]]);
});

test('keyboard opens share without sending',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('tsap_lang','en'));
 await page.route('**/api/**',r=>r.fulfill({json:r.request().url().includes('/api/search?')?search:{success:true}}));
 await page.goto('/matches');const share=page.locator('.matches-profile-card').getByRole('button',{name:'Share on WhatsApp, profile details',exact:true});await share.focus();await expect(share).toBeFocused();await page.keyboard.press('Enter');await expect(page.getByText('Share WhatsApp Proposal',{exact:true})).toBeVisible();
});
