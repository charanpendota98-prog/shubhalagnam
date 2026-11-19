import {test,expect} from '@playwright/test';
import fs from 'node:fs';
for(const lang of ['en','te'])for(const width of [320,390,1280])test(`private photo consent uses API privacy signal ${lang} ${width}`,async({page})=>{
 await page.setViewportSize({width,height:920});await page.addInitScript(l=>{localStorage.setItem('tsap_lang',l);localStorage.setItem('tsap_id','WRONG_HINT')},lang);
 const posts:{path:string,body:Record<string,unknown>}[]=[];let failRequest=true;
 await page.route('**/api/**',async r=>{const path=new URL(r.request().url()).pathname;
  if(path==='/api/auth/verify')return r.fulfill({json:{valid:true,tsap_id:'COOKIE_OWNER'}});
  if(path.startsWith('/api/search/'))return r.fulfill({json:{profile:{tsap_id:path.split('/').pop(),full_name:'Fictional photo owner',age:29,gender:'Bride',photo_url:''},is_photo_blur:true,quality:{}}});
  if(path==='/api/interest/coach')return r.fulfill({json:{can_send:true,blockers:[],credits:3,what_owner_receives:[{en:'Fictional published profile card.',te:'కల్పిత ప్రొఫైల్ కార్డ్.'}],next_steps:[{step:'owner_decision',en:'Owner decides whether to accept.',te:'యజమాని నిర్ణయం తీసుకుంటారు.'}],suggested_notes:[],delivery_note_en:'Delivery is not guaranteed.',delivery_note_te:'డెలివరీ హామీ లేదు.'}});
  if(path.startsWith('/api/saved/'))return r.fulfill({json:{saved:[]}});
  if(path==='/api/photo/access/request'){posts.push({path,body:r.request().postDataJSON()});if(failRequest){failRequest=false;return r.abort()}return r.fulfill({json:{success:true,status:'pending'}})}
  if(path==='/api/photo/access/signed-url'){posts.push({path,body:r.request().postDataJSON()});return r.fulfill({json:{success:true,signed_url:'/photos/fictional-approved.png?access_token=isolated',expires_in_seconds:900}})}
  return r.fulfill({json:{success:true,rows:[],items:[],total:0}});
 });
 await page.route('**/photos/fictional-approved.png?*',r=>r.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=','base64')}));
 await page.goto('/search/FICTIONAL');await page.getByRole('button',{name:lang==='en'?'Show in English':'తెలుగులో చూపించండి',exact:true}).first().click();
 const request=page.getByRole('button',{name:lang==='en'?'Request Photo Access':'ఫోటో అనుమతి అడగండి',exact:true});await expect(request).toBeVisible();await page.getByLabel('Private photo request note',{exact:true}).fill('Fictional consent note');await request.click();await expect(page.getByRole('status').filter({hasText:lang==='en'?'Could not request photo access':'ఫోటో అభ్యర్థన పంపడం సాధ్యం కాలేదు'})).toBeVisible();await expect(request).toBeEnabled();await request.click();await expect(page.getByRole('status').filter({hasText:lang==='en'?'Private photo request sent':'ప్రైవేట్ ఫోటో అభ్యర్థన పంపబడింది'})).toBeVisible();
 expect(posts.slice(0,2).map(x=>x.body)).toEqual(Array(2).fill({viewer_id:'COOKIE_OWNER',owner_id:'FICTIONAL',note:'Fictional consent note'}));
 await page.getByRole('button',{name:lang==='en'?'View Approved Photo':'ఆమోదించిన ఫోటో చూడు',exact:true}).click();const img=page.getByRole('img',{name:'FICTIONAL approved photo',exact:true});await expect(img).toBeVisible();await expect.poll(()=>img.evaluate((el:HTMLImageElement)=>el.naturalWidth)).toBe(1);expect(posts[2].body).toEqual({viewer_id:'COOKIE_OWNER',owner_id:'FICTIONAL',ttl_seconds:900});await img.scrollIntoViewIfNeeded();fs.mkdirSync('artifacts/private-photo-consent',{recursive:true});await page.screenshot({path:`artifacts/private-photo-consent/${lang}-${width}.png`});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await page.getByRole('textbox',{name:lang==='en'?'Profile ID search':'Profile ID వెతకండి',exact:true}).fill('SECOND');await page.getByRole('button',{name:lang==='en'?'View':'చూడు',exact:true}).click();await expect(page.getByRole('img',{name:'FICTIONAL approved photo',exact:true})).toHaveCount(0);await expect(request).toBeVisible();await expect(page.getByLabel('Private photo request note',{exact:true})).toHaveValue('');
});
