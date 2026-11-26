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
