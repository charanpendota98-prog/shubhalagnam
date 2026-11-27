import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {isExplicitTrue} from '../src/lib/explicit-truth.mjs';
test('legacy profile flags only accept explicit true values',()=>{for(const value of [true,1,'true',' TRUE ','yes','on','Y','1'])assert.equal(isExplicitTrue(value),true,String(value));for(const value of [false,0,'false','no','off','N','0','',null,undefined,2,{},[],['yes'],'<img src=x onerror=alert(1)>'])assert.equal(isExplicitTrue(value),false,String(value));});
test('both NRI badge consumers use the same parser',()=>{for(const [file,name] of [['src/components/TopPicks.tsx','r'],['src/app/(telugu)/search/[id]/ProfileView.tsx','profile']]){const source=fs.readFileSync(file,'utf8');assert.ok(source.includes(`isExplicitTrue(${name}.is_nri) ?`));assert.ok(!source.includes(`{${name}.is_nri ?`));}});

// Compare the literal accepted-value vector from the actual Python function.
// AST extraction avoids importing backend web dependencies into the frontend job.
import {spawnSync} from 'node:child_process';
test('Python and JS truth sets are equal for transport-distinguishable JSON values',()=>{
 const values=[true,false,1,0,2,-1,null,{},[],['yes'],'true','TRUE','True','yes','YES','on','On','y','Y','1','false','no','off','n','0','', 'ＴＲＵＥ', 'truе'];
 const whitespace=[...Array(0x3001).keys()].filter(n=>(n>=9&&n<=13)||(n>=28&&n<=32)||[0x85,0xa0,0x1680,0x2028,0x2029,0x202f,0x205f,0x3000,0xfeff].includes(n)||(n>=0x2000&&n<=0x200a));
 for(const cp of whitespace)for(const word of ['true','Y','1','false'])values.push(String.fromCodePoint(cp)+word+String.fromCodePoint(cp));
 const code=`import ast,json,sys
from pathlib import Path
tree=ast.parse(Path('../backend/hardening.py').read_text())
fn=next(n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name=='is_explicit_true')
ns={'Any':object}
exec(compile(ast.Module(body=[fn],type_ignores=[]),'<actual-python-reader>','exec'),ns)
print(json.dumps([ns['is_explicit_true'](v) for v in json.load(sys.stdin)]))`;
 const result=spawnSync('python3',['-c',code],{input:JSON.stringify(values),encoding:'utf8'});
 assert.equal(result.status,0,result.stderr);assert.deepEqual(values.map(isExplicitTrue),JSON.parse(result.stdout));
 // JS loses the lexical distinction: raw stored floats must be normalized by API.
 assert.equal(JSON.parse('1.0'),JSON.parse('1'));
 const api=fs.readFileSync('../backend/main.py','utf8');
 for(const assignment of ['pub["is_nri"] = _is_nri(user)','row["is_nri"] = _is_nri(u)','r["is_nri"] = _is_nri(prof)','"is_nri": _is_nri(prof)'])assert.ok(api.includes(assignment));
});
