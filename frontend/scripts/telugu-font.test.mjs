import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import crypto from 'node:crypto';
const manifest=JSON.parse(fs.readFileSync('scripts/telugu/manifest.json','utf8'));
test('Telugu bytes license and every font-face range are pinned',()=>{
 const bytes=fs.readFileSync('public/icons/fonts/manavivaha-telugu-v1.woff2');assert.equal(bytes.length,manifest.bytes);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),manifest.output_sha256);
 assert.match(fs.readFileSync('public/icons/fonts/OFL-Noto-Telugu.txt','utf8'),/SIL OPEN FONT LICENSE Version 1.1/);
 const css=fs.readFileSync('src/app/telugu-font.css','utf8');const rules=[...css.matchAll(/@font-face\s*\{([^}]+)\}/g)].map(m=>m[1]);assert.equal(rules.length,1);
 for(const rule of rules){assert.match(rule,/font-family: 'Noto Sans Telugu';/);assert.match(rule,/font-display: swap;/);assert.match(rule,/font-weight: 100 900;/);assert.match(rule,/url\('\/icons\/fonts\/manavivaha-telugu-v1.woff2'\)/);const range=rule.match(/unicode-range:\s*([^;]+);/);assert.ok(range);const entries=range[1].split(',').map(x=>{assert.match(x,/^U\+[0-9A-F]+$/);return parseInt(x.slice(2),16)});assert.deepEqual(entries,manifest.css_codepoints);assert.ok(entries.every(x=>x>=0xc00&&x<=0xc7f||x===0x200c||x===0x200d));}
 assert.doesNotMatch(css,/preload|https:/);
});
test('Telugu font cache is versioned immutable and wins over generic cache',async()=>{const rules=await (await import('../next.config.mjs')).default.headers();const idx=rules.findIndex(r=>r.source==='/icons/fonts/manavivaha-telugu-v1.woff2');assert.ok(idx>rules.findIndex(r=>r.source.includes(':ext(')));assert.equal(rules.filter(r=>r.source==='/icons/fonts/manavivaha-telugu-v1.woff2').length,1);assert.deepEqual(rules[idx].headers,[{key:'Cache-Control',value:'public, max-age=31536000, immutable'}]);assert.ok(!rules.slice(idx+1).some(r=>r.source==='/(.*)'||r.source.includes(':ext(')));});
