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
 for(const cp of manifest.codepoints)assert.ok(css.includes('U+'+cp.toString(16).toUpperCase()));
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
 for(const file of ['src/app/globals.css','tailwind.config.mjs']){
  const stacks=fs.readFileSync(file,'utf8');
  assert.doesNotMatch(stacks,/Apple Color Emoji|Segoe UI Emoji|Noto Color Emoji/);
 }
});
