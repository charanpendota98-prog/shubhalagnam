import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';

// Render the real shared boundary in isolation. Invalid API data must now stay
// inside its own panel, so it is no longer a legitimate way to crash this page.
function boundaryMarkup(lang:string){
 const source=fs.readFileSync(path.resolve('src/app/error.tsx'),'utf8');
 const code=ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;
 const mod={exports:{} as any};
 vm.runInNewContext(code,{module:mod,exports:mod.exports,require:(id:string)=>{
  if(id==='@/lib/lang')return {useLang:()=>({lang})};
  if(id==='@/lib/site-config')return {SITE_CONFIG:{supportLink:''}};
  if(id==='next/link')return {__esModule:true,default:({children,...props}:any)=>React.createElement('a',props,children)};
  return require(id);
 }});
 return renderToStaticMarkup(React.createElement(mod.exports.default,{error:new Error('Isolated fictional error'),reset:()=>{}}));
}
for(const lang of ['en','te'])for(const width of [320,390,1280]){
 test(`malformed saved data stays in panel ${lang} ${width}`,async({page})=>{
  await page.setViewportSize({width,height:920});
  await page.addInitScript(l=>{localStorage.setItem('tsap_id','TEST-ERROR');localStorage.setItem('tsap_lang',l)},lang);
  await page.route('**/api/**',r=>{const p=new URL(r.request().url()).pathname;
   if(p==='/api/auth/verify')return r.fulfill({json:{valid:true,tsap_id:'TEST-ERROR'}});
   if(p.includes('/saved/'))return r.fulfill({json:{tsap_id:'TEST-ERROR',count:1,saved:[{profile:{tsap_id:'TEST-CANDIDATE',full_name:{invalid:true}}}]}});
   return r.fulfill({json:{success:true,credits:3,plans:[],templates:[]}});
  });
  await page.goto('/requests');
  await page.locator('.requests-nav').getByRole('button',{name:lang==='te'?/^దాచుకున్న/:/^Saved/}).click();
  const panel=page.locator('#requests-task-panel');
  await expect(panel.getByRole('alert')).toBeVisible();
  await expect(panel.getByRole('button',{name:lang==='en'?'Retry':'మళ్లీ ప్రయత్నించండి',exact:true})).toBeVisible();
  await expect(page.getByRole('heading',{name:lang==='en'?'Something went wrong':'సమస్య వచ్చింది',exact:true})).toHaveCount(0);
  await expect(page.locator('.requests-nav')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 });
 test(`isolated shared error rendered controls ${lang} ${width}`,async({page})=>{
  await page.setViewportSize({width,height:920});
  await page.goto('/login');
  // Keep the real app styles, replace only the test document body with the
  // server-rendered real boundary. This does not test React reset/hydration.
  const html=boundaryMarkup(lang);
  const styles=await page.locator('link[rel=stylesheet],style').evaluateAll(nodes=>nodes.map(node=>node.outerHTML).join(''));
  await page.setContent(`<html lang="${lang}"><head><base href="${page.url()}">${styles}</head><body>${html}</body></html>`);
  await expect(page.getByRole('heading',{name:lang==='en'?'Something went wrong':'సమస్య వచ్చింది',exact:true})).toBeVisible();
  const retry=page.getByRole('button',{name:lang==='en'?'Retry':'మళ్లీ ప్రయత్నించండి',exact:true});
  const home=page.getByRole('link',{name:lang==='en'?'Home':'హోమ్',exact:true});
  await expect(retry.locator('svg')).toHaveCount(1);await expect(home.locator('svg')).toHaveCount(1);
  await expect(home).toHaveAttribute('href','/');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  fs.mkdirSync('artifacts/requests-error-portability',{recursive:true});
  await page.screenshot({path:`artifacts/requests-error-portability/${lang}-${width}.png`});
  await home.click();await expect(page).toHaveURL(/\/$/);
 });
}
