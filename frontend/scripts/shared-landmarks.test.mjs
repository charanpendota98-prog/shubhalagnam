import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const src=path.resolve('src');
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name)):[path.join(dir,e.name)]);}
test('the shared layout owns the single main landmark and skip target',()=>{
 const layout=fs.readFileSync(path.join(src,'app/layout.tsx'),'utf8');assert.match(layout,/<main id="main-content"/);
 for(const file of files(path.join(src,'app')).filter(x=>x.endsWith('.tsx')&&!x.endsWith('/layout.tsx'))){assert.doesNotMatch(fs.readFileSync(file,'utf8'),/<main(?:\s|>)/,file);}
});
test('brand link accessible name uses its bilingual visible text',()=>{
 const s=fs.readFileSync(path.join(src,'components/SiteHeader.tsx'),'utf8');const link=s.slice(s.indexOf('<Link href="/" className="flex items-center gap-2.5'),s.indexOf('{/* Desktop nav */}'));assert.ok(link.includes('brand-name-telugu'));assert.ok(link.includes('sr-only'));assert.ok(!link.includes('aria-label='));
});
test('terms renders configured email conditionally rather than an empty link',()=>{
 const s=fs.readFileSync(path.join(src,'app/terms/page-client.tsx'),'utf8');assert.ok(s.includes('SITE_CONFIG.owner.email ? ('));assert.ok(s.includes('Email contact is not configured'));
});
