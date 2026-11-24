import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
const source=fs.readFileSync(new URL('../src/lib/language-bootstrap.ts',import.meta.url),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;
const {LANGUAGE_BOOTSTRAP,LANGUAGE_GATE_CSS}=await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
function run(cookie='',saved=null,deny=false){const root={dataset:{},lang:''};const timers=[];vm.runInNewContext(LANGUAGE_BOOTSTRAP,{document:{cookie,documentElement:root},localStorage:{getItem(){if(deny)throw Error('blocked');return saved}},setTimeout(fn,delay){timers.push({fn,delay})}});return{root,timers}}
test('no choice and invalid language keep Telugu without a gate',()=>{for(const value of [null,'bad','EN','en; injected=yes']){const {root,timers}=run('',value);assert.equal(root.lang,'te-IN');assert.equal(root.dataset.langPending,undefined);assert.equal(timers.length,0)}});
test('validated cookie wins, legacy localStorage migrates, storage denial is safe',()=>{assert.equal(run('x=1; tsap_lang=en; y=2','te').root.lang,'en-IN');assert.equal(run('tsap_lang=te','en').root.lang,'te-IN');assert.equal(run('tsap_lang=invalid','en').root.lang,'en-IN');assert.equal(run('','en').root.lang,'en-IN');assert.equal(run('',null,true).root.lang,'te-IN');assert.equal(run('tsap_lang=en',null,true).root.lang,'en-IN')});
test('English gate fails open at 400ms without layout removal',()=>{const {root,timers}=run('tsap_lang=en');assert.equal(root.dataset.langPending,'en');assert.equal(timers.length,1);assert.equal(timers[0].delay,400);timers[0].fn();assert.equal(root.dataset.langPending,undefined);assert.match(LANGUAGE_GATE_CSS,/visibility:hidden/);assert.doesNotMatch(LANGUAGE_GATE_CSS,/display:none/)});
