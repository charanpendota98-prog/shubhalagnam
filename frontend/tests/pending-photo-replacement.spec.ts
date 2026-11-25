import {test,expect} from '@playwright/test';
import {localeHref} from './locale-href';
import fs from 'node:fs';
for(const lang of ['en','te'])for(const width of [320,1280])test(`pending photo replacement keeps review/private state ${lang} ${width}`,async({page})=>{
 await page.setViewportSize({width,height:960});await page.emulateMedia({reducedMotion:'reduce'});let uploads=0,fail=false;
 await page.addInitScript(l=>{localStorage.setItem('tsap_lang',l);localStorage.setItem('tsap_id','PENDING-ONLY');localStorage.setItem('tsap_token','fictional-only')},lang);
 await page.route('**/api/**',r=>{const path=new URL(r.request().url()).pathname;
 if(path==='/api/photo/status/PENDING-ONLY')return r.fulfill({json:{photo_url:'',photo_status:'pending',photo_reason:'',photo_reason_te:''}});
 if(path==='/api/profile/PENDING-ONLY')return r.fulfill({json:{success:true,profile:{tsap_id:'PENDING-ONLY',full_name:'Fictional Pending',gender:'Bride',dob:'1998-01-01',state:'TS',district:'Hyderabad'},completeness_score:80,missing_fields:[]}});
 if(path==='/api/photo/upload'){uploads++;return r.fulfill({status:fail?422:200,json:fail?{detail:{message_en:'Fictional upload rejected',message_telugu:'కల్పిత అప్‌లోడ్ తిరస్కరించబడింది'}}:{success:true,url:'/photos/fictional-pending.jpg',status:'pending'}})}
 return r.fulfill({json:{success:true,authenticated:true,valid:true,tsap_id:'PENDING-ONLY',items:[],profiles:[],total:0}})});
 await page.goto(localeHref('/me',lang));await page.getByRole('button',{name:lang==='en'?/Edit Profile/:/నా ప్రొఫైల్ సవరణ/}).click();await page.locator('#me-full_name').fill('Unsaved Fictional Name');
 const section=page.locator('section').filter({has:page.getByRole('heading',{name:lang==='en'?'Photo is waiting for staff review':'ఫోటో సిబ్బంది సమీక్షలో ఉంది',exact:true})}).last();
 const replace=section.getByRole('button',{name:lang==='en'?'Replace photo':'ఫోటో మార్చండి',exact:true});await expect(replace).toBeVisible();await expect(section.getByRole('button',{name:lang==='en'?'Refresh review status':'సమీక్ష స్థితిని మళ్లీ తనిఖీ చేయండి',exact:true})).toBeVisible();await expect(section).toContainText(lang==='en'?'It stays private until approval.':'ఆమోదం వచ్చే వరకు అది ఇతరులకు కనిపించదు.');
 const chooser=page.waitForEvent('filechooser');await replace.click();await(await chooser).setFiles('tests/fixtures/synthetic-profile.jpg');await expect.poll(()=>uploads).toBe(1);await expect(replace).toBeEnabled();await expect(page.locator('#me-full_name')).toHaveValue('Unsaved Fictional Name');await expect(section.getByRole('heading')).toHaveText(lang==='en'?'Photo is waiting for staff review':'ఫోటో సిబ్బంది సమీక్షలో ఉంది');
 fail=true;await section.locator('input[type=file]').setInputFiles('tests/fixtures/synthetic-profile.jpg');await expect.poll(()=>uploads).toBe(2);await expect(section.getByRole('alert')).toContainText(lang==='en'?'Fictional upload rejected':'కల్పిత అప్‌లోడ్ తిరస్కరించబడింది');await expect(replace).toBeEnabled();await expect(page.locator('#me-full_name')).toHaveValue('Unsaved Fictional Name');
 await section.scrollIntoViewIfNeeded();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);fs.mkdirSync('artifacts/pending-photo',{recursive:true});await section.screenshot({path:`artifacts/pending-photo/${lang}-${width}.png`});
});
