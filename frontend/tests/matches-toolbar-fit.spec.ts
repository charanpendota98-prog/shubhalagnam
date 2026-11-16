import {test,expect} from '@playwright/test';import fs from 'node:fs';
for(const lang of ['en','te'])for(const active of [false,true])test(`Matches toolbar fit ${lang} ${active?'active':'empty'}`,async({page})=>{
 fs.mkdirSync('artifacts/toolbar-fit',{recursive:true});await page.addInitScript(l=>localStorage.setItem('tsap_lang',l),lang);const queries:string[]=[];
 await page.route('**/api/**',r=>{if(r.request().url().includes('/api/search?'))queries.push(r.request().url());return r.fulfill({json:{success:true,rows:[],results:[],total:0}})});
 for(const width of [320,360,390,399,400,640,768,1024,1280]){
  await page.setViewportSize({width,height:900});await page.goto('/matches'+(active?'?district=Hyderabad&age_min=27&age_max=33':''),{waitUntil:'networkidle'});
  const controls=page.locator('.match-results-controls'),sort=controls.getByRole('combobox');
  for(const value of ['new','age','boosted']){await sort.selectOption(value);await expect(sort).toHaveValue(value);await expect.poll(()=>queries.some(q=>new URL(q).searchParams.get('sort')===value)).toBeTruthy();const fit=await sort.evaluate(e=>{const s=e as HTMLSelectElement,c=document.createElement('canvas').getContext('2d')!,style=getComputedStyle(s);c.font=style.font;return{required:c.measureText(s.selectedOptions[0].text).width+parseFloat(style.paddingLeft)+parseFloat(style.paddingRight)+28,available:s.clientWidth}});expect(fit.available,`${lang} ${width} ${value}`).toBeGreaterThanOrEqual(fit.required)}
  if(width<1024){const filter=controls.getByRole('button');await expect(filter).toBeVisible();const fit=await filter.evaluate(e=>({scroll:e.scrollWidth,client:e.clientWidth,white:getComputedStyle(e).whiteSpace}));expect(fit.scroll).toBeLessThanOrEqual(fit.client);expect(fit.white).toBe('nowrap');const label=await filter.locator('span').first().evaluate(e=>({height:e.getBoundingClientRect().height,line:parseFloat(getComputedStyle(e).lineHeight)}));expect(label.height).toBeLessThanOrEqual(label.line+1);await filter.click();const close=page.getByRole('button',{name:lang==='en'?'Close filter panel':'ఫిల్టర్ ప్యానెల్ మూసివేయండి',exact:true});await expect(close).toBeVisible();await close.click();await expect(close).toBeHidden()}
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();
  if([320,390,1280].includes(width)){await sort.selectOption('age');await expect(page.getByRole('heading',{name:lang==='en'?/0 matching profiles found/:/0 సరిపోలే ప్రొఫైల్స్ లభించాయి/})).toBeVisible();await controls.scrollIntoViewIfNeeded();await page.screenshot({path:`artifacts/toolbar-fit/${lang}-${active?'active':'empty'}-${width}.png`})}
 }
 expect(queries.some(q=>new URL(q).searchParams.get('sort')==='age')).toBeTruthy();
});
