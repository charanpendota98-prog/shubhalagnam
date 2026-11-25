import {test,expect,type Page} from '@playwright/test';
import fs from 'node:fs';
fs.mkdirSync('artifacts/profile-completion-refresh',{recursive:true});
const owner='SYN-COMPLETION';
const valid={success:true,profile:{tsap_id:owner,full_name:'Fictional saved name'},completeness_score:42,missing_fields:['education']};
const updated={...valid,completeness_score:100,missing_fields:[]};
async function setup(page:Page,lang:string,mode:string){
 await page.addInitScript(()=>localStorage.setItem('tsap_id','SYN-COMPLETION'));
 let uploaded=false,refreshes=0,retry=false,uploads=0,writes=0;
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/**',r=>{const p=new URL(r.request().url()).pathname;
  if(p==='/api/auth/verify')return r.fulfill({json:{valid:true,tsap_id:owner}});
  if(p===`/api/profile/${owner}`){
   if(!uploaded)return r.fulfill({json:valid});refreshes++;
   if(retry)return r.fulfill({json:updated});
   if(mode==='network')return r.abort('failed');
   const invalid:any={
    'bad-missing':{...updated,missing_fields:{bad:true}},
    'bad-field':{...updated,missing_fields:[{}]},
    'wrong-owner':{...updated,profile:{tsap_id:'OTHER'}},
    'sparse':{success:true},'null':null,
    'false-success':{...updated,success:false},
    'score-string':{...updated,completeness_score:'100'},
    'score-range':{...updated,completeness_score:101},
    'http':updated,
   };
   return r.fulfill({status:mode==='http'?503:200,json:invalid[mode]});
  }
  if(p===`/api/photo/status/${owner}`)return r.fulfill({json:{photo_url:'',photo_status:uploaded?'pending':'none',photo_reason:'',photo_reason_te:''}});
  if(p==='/api/photo/upload'){uploaded=true;uploads++;return r.fulfill({json:{url:'',status:'pending'}});}
  if(r.request().method()!=='GET')writes++;
  return r.fulfill({json:{success:true,items:[],profiles:[],total:0}});
 });
 await page.goto(lang==='en'?'/en/me':'/me');
 await page.getByRole('button',{name:lang==='en'?/Edit Profile/:/నా ప్రొఫైల్ సవరణ/}).click();
 await page.locator('#me-full_name').fill('Unsaved Fictional Name');
 await page.getByLabel(lang==='en'?'Choose a replacement profile photo':'కొత్త ప్రొఫైల్ ఫోటో ఎంచుకోండి',{exact:true}).setInputFiles('tests/fixtures/synthetic-profile.jpg');
 await expect.poll(()=>refreshes).toBe(1);
 return {errors,recover:()=>{retry=true},counts:()=>({uploads,writes,refreshes})};
}
for(const lang of ['en','te'])for(const width of [320,1280])test(`invalid photo completion refresh is honest and retry keeps edits ${lang} ${width}`,async({page})=>{
 await page.setViewportSize({width,height:950});const state=await setup(page,lang,'bad-missing');
 const warning=page.getByRole('alert').filter({hasText:lang==='en'?'could not refresh profile completion':'పూర్తి స్థితిని మళ్లీ తనిఖీ చేయలేకపోయాం'});
 await expect(warning).toBeVisible();await expect(page.locator('#me-full_name')).toHaveValue('Unsaved Fictional Name');
 const heading=page.getByRole('heading',{name:lang==='en'?/Profile completion/:/ప్రొఫైల్ పూర్తి స్థితి/});await expect(heading).toContainText('42%');
 await warning.scrollIntoViewIfNeeded();await page.screenshot({path:`artifacts/profile-completion-refresh/${lang}-${width}-warning.png`});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 state.recover();await page.getByRole('button',{name:lang==='en'?'Retry profile completion':'పూర్తి స్థితిని మళ్లీ తనిఖీ చేయండి',exact:true}).click();
 await expect(heading).toContainText('100%');await expect(warning).toHaveCount(0);await expect(page.locator('#me-full_name')).toHaveValue('Unsaved Fictional Name');
 expect(state.counts()).toEqual({uploads:1,writes:0,refreshes:2});expect(state.errors).toEqual([]);
});
for(const mode of ['bad-field','wrong-owner','sparse','null','false-success','score-string','score-range','http','network'])test(`reject ${mode} photo completion without crash or false completion`,async({page})=>{
 const state=await setup(page,'en',mode);await expect(page.getByRole('alert').filter({hasText:'could not refresh profile completion'})).toBeVisible();
 await expect(page.locator('#me-full_name')).toHaveValue('Unsaved Fictional Name');await expect(page.getByRole('heading',{name:/Profile completion/})).toContainText('42%');
 expect(state.errors).toEqual([]);expect(state.counts()).toEqual({uploads:1,writes:0,refreshes:1});
});
