import {test,expect} from '@playwright/test';
import fs from 'node:fs';
fs.mkdirSync('artifacts/match-read-integrity',{recursive:true});
const profile = (id='TEST-SEARCH-ONE') => ({tsap_id:id,full_name:'Fictional Search Candidate',age:28,caste:'Reddy',district:'Hyderabad'});
const valid = (rows:any[]=[],total=rows.length,offset=0) => ({results:rows,total,count:rows.length,offset,limit:24,gothram_exclusion:{requested:false,applied:false,reason:''}});
const cases:any[]=[
 ['missing array',{total:0}],['text success',{...valid(),success:'false'}],['invented filter reason',{...valid(),gothram_exclusion:{requested:true,applied:false,reason:''}}],['unsuccessful',{...valid(),success:false}],['negative total',{...valid(),total:-7}],['string total',{...valid(),total:'0'}],['fraction total',{...valid(),total:0.5}],['missing total',{results:[]}],['unproven empty',valid([],2)],['count mismatch',{...valid([profile()]),count:0}],['offset mismatch',{...valid(),offset:24}],['limit mismatch',{...valid(),limit:25}],['missing ID',valid([{full_name:'Unidentified'}])],['duplicate IDs',valid([profile(),profile()])],['null profile',valid([null])],['object name',valid([{...profile(),full_name:{wrong:true}}])],['object age',valid([{...profile(),age:{wrong:true}}])],['invalid verification',valid([{...profile(),is_verified:'false'}])],['object photo',valid([{...profile(),photo_url:{bad:true}}])],['invalid observation',valid([{...profile(),observations:[{}]}])],['invalid preference',valid([{...profile(),preference_checks:[null]}])],['object contact',valid([{...profile(),phone_masked:{bad:true}}])],['unknown personal filter',{...valid(),gothram_exclusion:{requested:'false',applied:false,reason:''}}],['more rows than total',{...valid([profile()]),total:0}],
];
async function setup(page:any,lang:string,width:number,reply:(url:URL)=>any){
 await page.setViewportSize({width,height:900});await page.addInitScript((l:string)=>localStorage.setItem('tsap_lang',l),lang);
 await page.route('**/api/**',async(r:any)=>r.fulfill({json:r.request().url().includes('/api/search?')?await reply(new URL(r.request().url())):{success:true}}));
 await page.goto('/matches');
}
for(const [name,data] of cases)test(`reject ${name}`,async({page})=>{
 await setup(page,'en',390,()=>data);
 await expect(page.getByRole('heading',{name:'We couldn\'t load profiles',exact:true})).toBeVisible();
 await expect(page.getByRole('heading',{name:'No profiles match your filters yet'})).toHaveCount(0);
 await expect(page.locator('h2[aria-live]')).not.toContainText('matching profiles found');
});
for(const lang of ['en','te'])for(const width of [320,390,1280])test(`retry valid empty and populated ${lang} ${width}`,async({page})=>{
 let mode='invalid';
 // Search hydration/debounce may issue another read while an error screenshot is
 // being captured. Keep those reads invalid until a real Retry click occurs.
 // A mutable fixture switched before click could remove the button by itself.
 await page.addInitScript(()=>{
  (window as any).__matchRetryClicks=0;
  document.addEventListener('click',e=>{
   if((e.target as Element).closest('[role="alert"] button'))(window as any).__matchRetryClicks++;
  },true);
 });
 await setup(page,lang,width,async()=>mode==='empty'?valid():await page.evaluate(()=>(window as any).__matchRetryClicks)>0?valid([profile()]):{success:true});
 const retry=()=>page.getByRole('button',{name:lang==='te'?'మళ్లీ ప్రయత్నించండి':'Try again',exact:true});
 await expect(retry()).toBeVisible();await page.screenshot({path:`artifacts/match-read-integrity/error-${lang}-${width}.png`});
 await retry().click();expect(await page.evaluate(()=>(window as any).__matchRetryClicks)).toBe(1);await expect(page.getByRole('link',{name:/Fictional.*TEST-SEARCH-ONE/})).toBeVisible();
 await expect(page.locator('h2[aria-live]')).toContainText('1');await page.screenshot({path:`artifacts/match-read-integrity/valid-${lang}-${width}.png`});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();
 // A reload with a real empty result must still be distinct from failure.
 mode='empty';await page.reload();await expect(page.locator('h2[aria-live]')).toContainText('0');await expect(page.getByRole('heading',{name:lang==='te'?'మీ ఫిల్టర్లకు సరిపోయే ప్రొఫైల్స్ ప్రస్తుతం లేవు':'No profiles match your filters yet'})).toBeVisible();
});
test('bad append preserves prior cards and retries requested offset',async({page})=>{
 let fail=true;const offsets:number[]=[];const rows=Array.from({length:24},(_,i)=>profile(`TEST-SEARCH-${i}`));
 await setup(page,'en',390,url=>{const offset=Number(url.searchParams.get('offset'));offsets.push(offset);return offset===0?valid(rows,25):fail?{total:25}:valid([profile('TEST-SEARCH-LAST')],25,24)});
 await expect(page.getByRole('button',{name:'Load 1 more profiles',exact:true})).toBeVisible();await page.getByRole('button',{name:'Load 1 more profiles',exact:true}).click();
 await expect(page.getByText('More profiles could not be loaded.',{exact:true})).toBeVisible();await expect(page.getByRole('link',{name:/Fictional.*TEST-SEARCH-0\)/})).toBeVisible();
 fail=false;await page.getByRole('button',{name:'Retry loading more',exact:true}).click();await expect(page.getByRole('link',{name:/TEST-SEARCH-LAST/}).first()).toBeVisible();await expect(page.locator('h2[aria-live]')).toContainText('25');expect(offsets.slice(-2)).toEqual([24,24]);
});
test('pending results stay unknown and an older filter response cannot replace the new search',async({page})=>{
 let first:any;let requests=0;
 await page.setViewportSize({width:1280,height:900});await page.addInitScript(()=>localStorage.setItem('tsap_lang','en'));
 await page.route('**/api/**',async r=>{if(!r.request().url().includes('/api/search?'))return r.fulfill({json:{success:true}});requests++;if(requests===1){first=r;return;}return r.fulfill({json:valid([profile('TEST-NEW-SEARCH')])});});
 await page.goto('/matches');await expect.poll(()=>requests).toBe(1);await expect(page.locator('h2[aria-live]')).toContainText('Searching');await expect(page.getByRole('heading',{name:'No profiles match your filters yet'})).toHaveCount(0);
 await page.locator('select').filter({has:page.locator('option[value="boosted"]')}).selectOption('age');await expect(page.getByRole('link',{name:/TEST-NEW-SEARCH/}).first()).toBeVisible();
 await first.fulfill({json:valid([profile('TEST-OLD-SEARCH')])}).catch(()=>{});
 await expect(page.getByRole('link',{name:/TEST-OLD-SEARCH/})).toHaveCount(0);await expect(page.getByRole('link',{name:/TEST-NEW-SEARCH/}).first()).toBeVisible();
});

for (const lang of ['en','te']) test(`missing facts do not invent state or remarriage ${lang}`,async({page})=>{
 await setup(page,lang,390,()=>valid([{tsap_id:'TEST-MISSING-FACTS',full_name:'Fictional Missing Facts',marital_status:'—',caste:'—',education:'-',job:'Not provided',state:'',salary:'—',district:'N/A',age:28}]));
 await expect(page.getByRole('link',{name:/TEST-MISSING-FACTS/}).first()).toBeVisible();
 const card=page.locator('.matches-profile-card');await expect(card).not.toContainText(/2nd Marriage|2వ వివాహం|Telangana|తెలంగాణ|Not provided|N\/A/);await expect(card.locator('p')).not.toHaveText(/^\s*[—•-]+\s*$/);
 await page.screenshot({path:`artifacts/match-read-integrity/missing-facts-${lang}.png`});
});
