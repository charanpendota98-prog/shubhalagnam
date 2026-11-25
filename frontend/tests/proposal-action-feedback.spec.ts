import {localeHref} from "./locale-href";
import {test,expect,Page} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
async function setup(page:Page,lang:string,width:number,height=900){
 await page.setViewportSize({width,height});
 await page.addInitScript(l=>{localStorage.setItem('tsap_lang',l);const w=window as any;w.__copyMode='deny';w.__openMode='blocked';w.__copied=[];w.__opened=[];Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:(text:string)=>{w.__copied.push(text);return w.__copyMode==='deny'?Promise.reject(new Error('NotAllowedError')):w.__copyMode==='pending'?new Promise<void>(resolve=>w.__resolveCopy=resolve):Promise.resolve()}}});window.open=((url:string)=>{w.__opened.push(url);if(w.__openMode==='throw')throw new Error('Blocked');return w.__openMode==='blocked'?null:{closed:false}}) as any},lang);
 const writes:string[]=[];page.on('popup',()=>{throw new Error('Unexpected external popup')});
 await page.route('**/api/**',r=>{if(r.request().method()!=='GET')writes.push(r.request().url());return r.fulfill({json:r.request().url().includes('/api/search?')?{results:[{tsap_id:'TEST-FEEDBACK',full_name:'Fictional Feedback Candidate',age:28}],total:1,count:1,offset:0,limit:24}:{success:true,valid:false}})});
 await page.goto(localeHref('/matches',lang));await page.addStyleTag({content:'html,body{scroll-behavior:auto!important}'});const opener=page.locator('.matches-profile-card').getByRole('button',{name:lang==='en'?/Share on WhatsApp/:/WhatsApp షేర్|వాట్సాప్‌లో పంచుకోండి/});await opener.click();
 return {dialog:page.getByRole('dialog'),opener,writes};
}
for(const lang of ['en','te'])for(const width of [320,390,1280])test(`proposal action failure and retry ${lang} ${width}`,async({page})=>{
 const {dialog,opener,writes}=await setup(page,lang,width);const copy=()=>dialog.getByRole('button',{name:lang==='en'?/Copy Text/:/టెక్స్ట్ కాపీ చేయి/});const close=dialog.getByRole('button',{name:lang==='en'?'Close':'మూసివేయండి',exact:true});const send=dialog.getByRole('button',{name:lang==='en'?/Open in WhatsApp/:/వాట్సాప్‌లో తెరవండి/});
 await copy().click();await expect(dialog.getByRole('alert')).toContainText(lang==='en'?'Could not copy':'కాపీ కాలేదు');await expect(dialog.getByRole('button',{name:/Copied!/})).toHaveCount(0);await page.screenshot({path:`artifacts/proposal-feedback/copy-${lang}-${width}.png`});
 await page.evaluate(()=>{(window as any).__copyMode='success'});await copy().click();await expect(dialog.getByRole('button',{name:lang==='en'?/Copied!/:/కాపీ చేయబడింది/})).toBeVisible();await expect(dialog.getByRole('alert')).toHaveCount(0);expect(await page.evaluate(()=>(window as any).__copied.at(-1))).toContain('TEST-FEEDBACK');
 await send.click();await expect(dialog.getByRole('alert')).toContainText(lang==='en'?'WhatsApp did not open':'వాట్సాప్ తెరుచుకోలేదు');await page.screenshot({path:`artifacts/proposal-feedback/open-${lang}-${width}.png`});
 await page.evaluate(()=>{(window as any).__openMode='throw'});await send.click();await expect(dialog.getByRole('alert')).toBeVisible();await page.evaluate(()=>{(window as any).__openMode='success'});await send.click();await expect(dialog.getByRole('alert')).toHaveCount(0);expect(await page.evaluate(()=>(window as any).__opened.length)).toBe(3);
 await close.click();await opener.click();await expect(copy()).toBeVisible();await expect(dialog.getByRole('alert')).toHaveCount(0);expect(writes).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
for(const lang of ['en','te'])test(`late clipboard completion does not mark reopened proposal copied ${lang}`,async({page})=>{
 const {dialog,opener}=await setup(page,lang,390);await page.evaluate(()=>{(window as any).__copyMode='pending'});await dialog.getByRole('button',{name:lang==='en'?/Copy Text/:/టెక్స్ట్ కాపీ చేయి/}).click();await page.keyboard.press('Escape');await opener.click();await page.evaluate(()=>{(window as any).__resolveCopy()});await expect(dialog.getByRole('button',{name:lang==='en'?/Copy Text/:/టెక్స్ట్ కాపీ చేయి/})).toBeVisible();await expect(dialog.getByRole('alert')).toHaveCount(0);
});
test('feedback fits short phone and has no serious accessibility finding',async({page})=>{
 const {dialog}=await setup(page,'te',320,568);await dialog.getByRole('button',{name:/టెక్స్ట్ కాపీ చేయి/}).click();const alert=dialog.getByRole('alert');await expect(alert).toBeVisible();const send=dialog.getByRole('button',{name:/వాట్సాప్‌లో తెరవండి/});const box=(await send.boundingBox())!;expect(box.y+box.height).toBeLessThanOrEqual(569);expect((await alert.boundingBox())!.y).toBeGreaterThanOrEqual(0);await page.screenshot({path:'artifacts/proposal-feedback/short-te-320.png'});const a=await new AxeBuilder({page}).include('dialog').analyze();expect(a.violations.filter(v=>['serious','critical'].includes(v.impact||''))).toEqual([]);
});

test('an older clipboard completion cannot overwrite a newer failure',async({page})=>{
 const {dialog}=await setup(page,'en',390);const copy=dialog.getByRole('button',{name:/Copy Text/});await page.evaluate(()=>{(window as any).__copyMode='pending'});await copy.click();await page.evaluate(()=>{(window as any).__copyMode='deny'});await copy.click();await expect(dialog.getByRole('alert')).toContainText('Could not copy');await page.evaluate(()=>{(window as any).__resolveCopy()});await expect(copy).toBeVisible();await expect(dialog.getByRole('button',{name:/Copied!/})).toHaveCount(0);await expect(dialog.getByRole('alert')).toContainText('Could not copy');
});
