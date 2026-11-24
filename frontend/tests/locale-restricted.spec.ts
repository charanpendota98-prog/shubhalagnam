import {test,expect} from '@playwright/test';
import {localeHref} from './locale-href';
const paths=['/admin','/admin/photos','/control','/control/workspace','/control/login','/owner','/growth','/review/FICTIONAL-LOCALE-NONEXISTENT'];
for(const path of paths)test(`restricted auth parity ${path}`,async({browser,request})=>{
 const calls:string[][]=[];
 for(const lang of ['te','en']){
  const target=localeHref(path,lang);const raw=await(await request.get(target,{headers:{Cookie:'mv_control_session=FICTIONAL-SESSION-SECRET; tsap_id=PRIVATE-LOCALE-MEMBER; tsap_name=PRIVATE-LOCALE-MEMBER'}})).text();
  expect(raw).toContain(`lang="${lang}-IN"`);expect(raw).toMatch(/name="robots" content="[^"]*noindex/);
  // No seeded credentials or member state may become server-rendered private content.
  for(const marker of ['PRIVATE-LOCALE-MEMBER','fictional-locale@example.invalid','FICTIONAL-SESSION-SECRET'])expect(raw).not.toContain(marker);
  const c=await browser.newContext();await c.addInitScript(()=>{localStorage.setItem('tsap_id','PRIVATE-LOCALE-MEMBER');localStorage.setItem('tsap_name','PRIVATE-LOCALE-MEMBER');localStorage.setItem('tsap_lang','en');});
  const p=await c.newPage();const seen:string[]=[];
  await p.route('**/api/**',r=>{const url=new URL(r.request().url());seen.push(r.request().method()+' '+url.pathname);return r.fulfill({status:401,json:{detail:'Unauthorized'}})});
  await p.goto(target);await p.waitForLoadState('networkidle');expect(await p.locator('main').innerText()).not.toContain('fictional-locale@example.invalid');
  expect(seen.every(s=>s.startsWith('GET '))).toBeTruthy();
  if(['/admin','/control','/control/workspace'].includes(path))await expect(p).toHaveURL(new RegExp(localeHref('/control/login',lang)+'$'));
  calls.push([...new Set(seen)].sort());await c.close();
 }
 expect(calls[1]).toEqual(calls[0]);
});
test('restricted crawl policies cover both locale variants, never sitemap entries',async({request})=>{
 const robots=await(await request.get('/robots.txt')).text();const sitemap=await(await request.get('/sitemap.xml')).text();
 for(const root of ['/admin','/control','/owner','/growth','/review'])for(const lang of ['te','en']){const p=localeHref(root==='/review'?'/review/FICTIONAL':root,lang).replace('/FICTIONAL','');expect(robots).toContain('Disallow: '+p);expect(sitemap).not.toMatch(new RegExp('<loc>https://manavivaha.in'+p+'(?:/|<)'));}
});

for(const role of ['owner','worker','moderator','support','finance'])test(`restricted authorized role parity ${role}`,async({browser})=>{
 const results=[];
 for(const lang of ['te','en']){
  const c=await browser.newContext(),p=await c.newPage();let writes=0;const calls:string[]=[];
  await p.route('**/api/**',r=>{const path=new URL(r.request().url()).pathname;calls.push(path);if(r.request().method()!=='GET')writes++;return r.fulfill({json:path==='/api/control/me'?{role,username:'FICTIONAL-LOCALE-STAFF',csrf:'FICTIONAL-CSRF'}:path==='/api/control/analytics'?{role,totals:{profiles:0,pending:0,approved:0,rejected:0,with_photo:0,recorded_checks:0,males:0,females:0,open_reports:0,photos_pending:0,interests:0,posts:0},signups:{today:0,last_7d:0,series:[]},top_castes:[],top_states:[],top_districts:[]}:{success:true,items:[],queue:[],count:0,totals:{},growth:{},referrals:{},content:{},channels:{}}})});
  await p.goto(localeHref('/control',lang));await p.waitForLoadState('networkidle');
  results.push({calls:[...new Set(calls)].sort(),ownerRegion:await p.getByRole('region',{name:'Owner command center'}).count(),writes});await c.close();
 }
 expect(results[1]).toEqual(results[0]);expect(results[0].writes).toBe(0);expect(results[0].ownerRegion).toBe(role==='owner'?1:0);
});
