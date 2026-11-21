import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import test from 'node:test';

const compile = name => ts.transpileModule(fs.readFileSync(new URL(`../src/lib/${name}.ts`, import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const confirmation={exports:{}};
vm.runInNewContext(compile('auth-confirmation'),{exports:confirmation.exports,module:confirmation});
async function run(beginStatus=200,finishStatus=200,body={success:true,tsap_id:'FICTIONAL-PASSKEY',auth_token:''},beginBody={success:true,options:{challenge:'YQ'},challenge_id:'fictional-challenge'}) {
 let calls=0,credentials=0;
 const module={exports:{}};
 const queue=[{status:beginStatus,body:beginBody},{status:finishStatus,body}];
 const bytes=new Uint8Array([97]).buffer;
 const context={exports:module.exports,module,require:()=>confirmation.exports,console:{error(){}},Uint8Array,AbortController,
  window:{setTimeout,clearTimeout,atob:x=>Buffer.from(x,'base64').toString('binary'),btoa:x=>Buffer.from(x,'binary').toString('base64')},
  navigator:{credentials:{get:async()=>{credentials++;return {id:'fictional-credential',rawId:bytes,type:'public-key',response:{authenticatorData:bytes,clientDataJSON:bytes,signature:bytes,userHandle:null}};}}},
  fetch:async()=>{const x=queue[calls++];return {ok:x.status>=200&&x.status<300,status:x.status,json:async()=>x.body};}};
 vm.runInNewContext(compile('webauthn-client'),context);
 const result=await module.exports.loginPasskey();return {result,calls,credentials};
}
for(const status of [202,204,400,401,403,500,503])test(`passkey login rejects finish HTTP${status} with apparent success`,async()=>{
 const {result}=await run(200,status);assert.equal(result.success,false);assert.equal(result.tsap_id,undefined);
});
for(const body of [null,[],{},{success:'true',tsap_id:'FICTIONAL',auth_token:''},{success:true,tsap_id:'FICTIONAL',auth_token:'',has_account:false},{success:true,tsap_id:' FICTIONAL',auth_token:''},{success:true,tsap_id:'FICTIONAL'},{success:true,tsap_id:5,auth_token:''},{success:false,tsap_id:'FICTIONAL',auth_token:''}])test(`passkey login rejects malformed finish ${JSON.stringify(body)}`,async()=>{
 const {result}=await run(200,200,body);assert.equal(result.success,false);assert.equal(result.tsap_id,undefined);
});
for(const status of [202,204,400,503])test(`passkey login stops before credential request on begin HTTP${status}`,async()=>{
 const {result,calls,credentials}=await run(status);assert.equal(result.success,false);assert.equal(calls,1);assert.equal(credentials,0);
});
for(const body of [null,[],{success:false,options:{challenge:'YQ'},challenge_id:'fixture'},{success:true,options:{challenge:'YQ'},challenge_id:''}])test(`passkey login stops on invalid begin ${JSON.stringify(body)}`,async()=>{
 const {result,calls,credentials}=await run(200,200,undefined,body);assert.equal(result.success,false);assert.equal(calls,1);assert.equal(credentials,0);
});
test('passkey login supports confirmed cookie-session response',async()=>{
 const {result,calls,credentials}=await run();assert.equal(result.success,true);assert.equal(result.tsap_id,'FICTIONAL-PASSKEY');assert.equal(result.auth_token,'');assert.equal(calls,2);assert.equal(credentials,1);
});
