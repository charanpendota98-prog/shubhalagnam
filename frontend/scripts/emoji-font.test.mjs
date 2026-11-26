import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';

const manifest=JSON.parse(fs.readFileSync('scripts/emoji/manifest.json','utf8'));
test('emoji subset bytes, license and text ranges remain bounded',()=>{
 const bytes=fs.readFileSync('public/icons/fonts/manavivaha-emoji-v1.woff2');
 assert.equal(bytes.length,manifest.bytes);
 assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),manifest.output_sha256);
 assert.match(fs.readFileSync('public/icons/fonts/OFL-Noto-Emoji.txt','utf8'),/SIL OPEN FONT LICENSE Version 1.1/);
 assert.ok(manifest.codepoints.every(c=>c>127&&!(c>=0xc00&&c<=0xc7f)));
 const css=fs.readFileSync('src/app/emoji-font.css','utf8');
 assert.match(css,/tech\(color-COLRv1\)/);
 assert.match(css,/font-display: swap/);
 const rules=[...css.matchAll(/@font-face\s*\{([^}]+)\}/g)].map(m=>m[1]);
 assert.equal(rules.length,4);
 for(const family of ['Manavivaha Emoji','Manavivaha Native Apple','Manavivaha Native Segoe','Manavivaha Native Noto']){
  const matches=rules.filter(rule=>rule.includes(`font-family: '${family}';`));assert.equal(matches.length,1,family);
  const match=matches[0].match(/unicode-range:\s*([^;]+);/);assert.ok(match,family+' range missing');
  const entries=match[1].split(',').map(x=>{assert.match(x,/^U\+[0-9A-F]+$/);return parseInt(x.slice(2),16)});
  assert.deepEqual(entries,manifest.codepoints,family+' exact range');
 }
 assert.ok(!css.includes('https:'));
});
test('native emoji local aliases cannot claim Latin digits spaces or Telugu',()=>{
 const css=fs.readFileSync('src/app/emoji-font.css','utf8');
 for(const name of ['Apple','Segoe','Noto']){
  const rule=css.split(`font-family: 'Manavivaha Native ${name}';`)[1]?.split('}')[0];
  assert.ok(rule);assert.match(rule,/src: local\('/);assert.match(rule,/unicode-range:/);
  const ranges=rule.split('unicode-range: ')[1].split(';')[0].split(',').map(x=>parseInt(x.slice(2),16));
  assert.deepEqual(ranges,manifest.codepoints);
 }
 for(const file of ['src/app/globals.css','tailwind.config.mjs','src/app/(telugu)/search/[id]/ProfileView.tsx']){
  const stacks=fs.readFileSync(file,'utf8');
  assert.doesNotMatch(stacks,/Apple Color Emoji|Segoe UI Emoji|Noto Color Emoji/);
 }
});

test('versioned font asset keeps immutable one-year cache rule',async()=>{
 const config=(await import('../next.config.mjs')).default;
 const rules=await config.headers();
 const matched=rules.filter(r=>r.source==='/icons/fonts/manavivaha-emoji-v1.woff2');
 assert.equal(matched.length,1);
 assert.ok(matched[0].headers.some(h=>h.key==='Cache-Control'&&h.value==='public, max-age=31536000, immutable'));
 assert.equal(rules.at(-1),matched[0]);
});
