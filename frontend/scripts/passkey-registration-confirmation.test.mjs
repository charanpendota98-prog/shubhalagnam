import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import test from 'node:test';
const compile=name=>ts.transpileModule(fs.readFileSync(new URL(`../src/lib/${name}.ts`,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const ack={exports:{}};vm.runInNewContext(compile('auth-confirmation'),{exports:ack.exports,module:ack});
const validBegin={success:true,challenge_id:'fictional-challenge',options:{challenge:'YQ',user:{id:'YQ'}}};
async function run(beginStatus=200,finishStatus=200,body={success:true},beginBody=validBegin,cancel=false,abortBefore=false){
 let count=0,creates=0;const module={exports:{}};const bytes=new Uint8Array([97]).buffer;const requests=[];
 const responses=[{status:beginStatus,body:structuredClone(beginBody)},{status:finishStatus,body}];
 vm.runInNewContext(compile('webauthn-client'),{module,exports:module.exports,require:()=>ack.exports,console:{error(){}},Uint8Array,AbortController,window:{setTimeout,clearTimeout,atob:x=>Buffer.from(x,'base64').toString('binary'),btoa:x=>Buffer.from(x,'binary').toString('base64')},navigator:{credentials:{create:async()=>{creates++;return cancel?null:{id:'fictional',rawId:bytes,type:'public-key',response:{attestationObject:bytes,clientDataJSON:bytes}};}}},fetch:async(url,init)=>{if(init.signal?.aborted)throw new Error("Aborted");requests.push({url,init});const r=responses[count++];return{ok:r.status>=200&&r.status<300,status:r.status,json:async()=>r.body}}});
 const controller=new AbortController();if(abortBefore)controller.abort();
 const result=await module.exports.registerPasskey('FICTIONAL','','fixture-only',controller.signal);return{result,count,creates,requests};
}
for(const status of [201,202,204,400,401,403,409,500,503])test(`registration passkey rejects finish HTTP${status}`,async()=>assert.equal((await run(200,status)).result.success,false));
for(const body of [null,[],{},'success',{success:false},{success:'true'},{success:1},{success:true,error:'Rejected'},{success:true,detail:'Rejected'}])test(`registration passkey rejects malformed or contradictory finish ${JSON.stringify(body)}`,async()=>assert.equal((await run(200,200,body)).result.success,false));
for(const status of [201,202,204,400,401,500])test(`registration passkey stops on begin HTTP${status}`,async()=>{const r=await run(status);assert.equal(r.result.success,false);assert.equal(r.count,1);assert.equal(r.creates,0);});
for(const body of [null,[],{},'success',{...validBegin,success:false},{...validBegin,success:'true'},{...validBegin,challenge_id:''},{...validBegin,challenge_id:' '},{...validBegin,options:null},{...validBegin,options:[]},{...validBegin,options:{challenge:'',user:{id:'YQ'}}},{...validBegin,options:{challenge:'YQ',user:{id:''}}},{...validBegin,detail:'Rejected'}])test(`registration passkey stops on malformed begin ${JSON.stringify(body)}`,async()=>{const r=await run(200,200,{success:true},body);assert.equal(r.result.success,false);assert.equal(r.count,1);assert.equal(r.creates,0);});
test('registration passkey accepts exact backend completion and cookie session',async()=>{const r=await run();assert.equal(r.result.success,true);assert.equal(r.count,2);assert.equal(r.creates,1);assert.equal(r.requests[0].init.headers['X-Tsap-Token'],'');assert.equal(JSON.parse(r.requests[1].init.body).challenge_id,'fictional-challenge');});
test('cancelled credential creation cannot submit finish',async()=>{const r=await run(200,200,{success:true},validBegin,true);assert.equal(r.result.success,false);assert.equal(r.count,1);});

test('cancelled setup stops before a new network request',async()=>{const r=await run(200,200,{success:true},validBegin,false,true);assert.equal(r.result.success,false);assert.equal(r.count,0);assert.equal(r.creates,0);});
