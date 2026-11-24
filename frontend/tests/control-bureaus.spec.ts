import {localeHref} from "./locale-href";
import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs";
import path from "node:path";
const evidence=path.join(process.cwd(),"artifacts","control-bureaus");fs.mkdirSync(evidence,{recursive:true});
async function fixture(page:Page, role="owner",lang="en",empty=false) {
 let status=200,requests=0;const seen:string[]=[];
 await page.addInitScript(l=>localStorage.setItem("tsap_lang",l),lang);
 await page.route('**/api/**',async route=>{
  const u=new URL(route.request().url());let json:any={success:true};
  if(u.pathname==='/api/control/me')json={role,username:'synthetic-owner',csrf:'synthetic-only'};
  if(u.pathname==='/api/control/analytics')json={role,totals:{profiles:0,pending:0,approved:0,rejected:0,with_photo:0,recorded_checks:0,males:0,females:0,open_reports:0,photos_pending:0,interests:0,posts:0},signups:{today:0,last_7d:0,series:[]},top_castes:[],top_states:[],top_districts:[]};
  if(u.pathname==='/api/control/bureaus'){
   requests++;seen.push(u.search);const q=u.searchParams.get('q');const pg=Number(u.searchParams.get('page')||1);
   json={success:true,totals:{bureaus:21,active_seats:13,revoked_seats:2,consented_clients:43},items:empty||q==='missing'?[]:[{bureau_id:'BUR-SYN001',business_name:pg===2?'Second page bureau':'Synthetic Telugu wedding bureau with a very long business name',district:'Hyderabad',created_at:'2026-11-15T09:00:00+00:00',active_seats:3,revoked_seats:1,consented_clients:7}],matched:q==='missing'?0:21,page:pg,pages:q==='missing'?1:2,as_of:'2026-11-15T09:00:00+00:00'};
   return route.fulfill({status,json:status===200?json:{detail:'Unavailable'}});
  }
  return route.fulfill({json});
 });return {status:(s:number)=>{status=s;},requests:()=>requests,seen};
}
async function open(page:Page,lang='en') {await page.goto(localeHref('/control',lang));await page.getByRole('button',{name:lang==='en'?'🏢 Bureaus':'🏢 బ్యూరోలు',exact:true}).click();return page.getByRole('region',{name:'Bureau operations'});}
for(const lang of ['en','te'])for(const width of [320,390,1280])test(`bureau owner ${lang} ${width} layout and axe`,async({page})=>{
 await page.setViewportSize({width,height:900});await fixture(page,'owner',lang);const region=await open(page,lang);await expect(region.locator('article')).toHaveCount(1);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();const scan=await new AxeBuilder({page}).include('section[aria-label="Bureau operations"]').analyze();expect(scan.violations).toEqual([]);
 await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:path.join(evidence,`${lang}-${width}.png`),fullPage:true});
});
test('search, pagination, unavailable, auth-clear and retry',async({page})=>{
 const f=await fixture(page);const region=await open(page);await expect(region.locator('article')).toHaveCount(1);await region.getByRole('button',{name:'Next page',exact:true}).click();await expect(region.getByRole('heading',{name:'Second page bureau'})).toBeVisible();expect(f.seen.some(q=>q.includes('page=2'))).toBeTruthy();
 await region.getByLabel('Bureau name, ID or district').fill('missing');await region.getByRole('button',{name:'Search bureaus',exact:true}).click();await expect(region.getByText('No bureaus match this search.')).toBeVisible();expect(f.seen.at(-1)).toContain('page=1');
 f.status(503);await region.getByRole('button',{name:'Refresh bureaus'}).click();await expect(region.getByRole('alert')).toContainText('could not be loaded');await expect(region.locator('dl')).toHaveCount(0);
 f.status(200);await region.getByRole('button',{name:'Refresh bureaus'}).click();await expect(region.getByText('No bureaus match this search.')).toBeVisible();
 f.status(401);await region.getByRole('button',{name:'Refresh bureaus'}).click();await expect(region.getByRole('link',{name:'Sign in',exact:true})).toBeVisible();await expect(region.locator('dl')).toHaveCount(0);
});
for(const role of ['worker','moderator','support','finance'])test(`${role} has no bureau tab and sends no bureau request`,async({page})=>{const f=await fixture(page,role);await page.goto(localeHref('/control',"en"));await expect(page.getByRole('button',{name:/Overview/})).toBeVisible();await expect(page.getByRole('button',{name:'🏢 Bureaus',exact:true})).toHaveCount(0);expect(f.requests()).toBe(0);});
test('true empty state is not an error',async({page})=>{await fixture(page,'owner','en',true);const region=await open(page);await expect(region.getByText('No bureau workspaces have been created yet.')).toBeVisible();await expect(region.getByRole('alert')).toHaveCount(0);});
