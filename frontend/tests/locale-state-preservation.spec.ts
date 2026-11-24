import {test,expect,type Page} from '@playwright/test';
import {localeHref} from './locale-href';
import fs from 'node:fs';
fs.mkdirSync('artifacts/locale-state',{recursive:true});
async function switchLanguage(page:Page,from:string){
 const url=page.url();await page.evaluate(()=>{(window as any).__localeStateDocument='kept'});
 await page.getByRole('button',{name:from==='te'?'Show in English':'తెలుగులో చూపించండి',exact:true}).first().click();
 await expect(page.locator('html')).toHaveAttribute('lang',from==='te'?'en-IN':'te-IN');
 expect(page.url()).toBe(url);expect(await page.evaluate(()=>(window as any).__localeStateDocument)).toBe('kept');
}
// Fill helper inserted from the existing bilingual synthetic registration fixture.
async function fill(page:Page,lang:string){
 await page.goto(localeHref('/register',lang));await page.getByRole('button',{name:/Bride|వధువు/}).click();await page.getByLabel(lang==='en'?'Full Name':'పూర్తి పేరు (Full Name)',{exact:false}).fill('Synthetic Capability Test');await page.locator('input[type=date]').fill('1998-01-01');await page.locator('#quick-religion').selectOption('Hindu');
 await page.getByRole('button',{name:/Select a community|కులం \/ సంఘం ఎంచుకోండి/}).click();await page.getByRole('button',{name:lang==='en'?'Kapu':'కాపు (Kapu)',exact:true}).click();await page.getByLabel(lang==='en'?'State':'రాష్ట్రం',{exact:true}).selectOption('TS');await page.getByRole('button',{name:/Select a district|జిల్లా ఎంచుకోండి/}).click();await page.getByRole('button',{name:/Hyderabad|హైదరాబాద్/}).click();
 await page.getByLabel(lang==='en'?'Mobile number (10 digits)':'10 అంకెల మొబైల్ (WhatsApp Number)',{exact:false}).fill('9000000001');await page.getByLabel(lang==='en'?'Password (minimum 6 characters)':'పాస్‌వర్డ్ (కనీసం 6 అక్షరాలు)',{exact:true}).fill('synthetic-test-only');
 await page.getByLabel(lang==='en'?'Choose a photo from your gallery':'గ్యాలరీ నుంచి ఫోటో ఎంచుకోండి',{exact:true}).setInputFiles('tests/fixtures/synthetic-profile.jpg');await page.getByRole('checkbox',{name:/I have permission to upload this photo|ఈ ఫోటోను అప్‌లోడ్ చేయడానికి నాకు అనుమతి ఉంది/}).check();await page.locator('#registration-consent').check();
 
}

for(const lang of ['te','en'])test(`registration preserves typed fields File and result across language ${lang}`,async({page})=>{
 let submissions=0;const bodies:Buffer[]=[];const confirmed={tsap_id:'SYN-STATE',card_url:'',credits:4,phone_verified:false,is_approved:false,email_verify:{required:true,verified:false,sent:true}};
 await page.route('**/api/**',r=>{const p=new URL(r.request().url()).pathname;
  if(p==='/api/register'){submissions++;bodies.push(r.request().postDataBuffer()!);return r.fulfill({status:201,json:confirmed})}
  if(p==='/api/auth/capabilities')return r.fulfill({json:{password_login:true,phone_otp:false,passkeys_configured:true,email_optional_at_registration:true}});
  return r.fulfill({json:{success:true,castes:['Kapu'],districts:['Hyderabad'],items:[]}});
 });
 await page.setViewportSize({width:390,height:900});await fill(page,lang);
 const pw=page.locator('input[type=password]').first();await expect(pw).toHaveValue('synthetic-test-only');
 const preview=page.locator('img[src^="blob:"]').first();await expect(preview).toBeVisible();const photo=await preview.getAttribute('src');
 await switchLanguage(page,lang);const other=lang==='te'?'en':'te';
 await expect(page.getByLabel(other==='en'?'Full Name':'పూర్తి పేరు (Full Name)',{exact:false})).toHaveValue('Synthetic Capability Test');
 await expect(page.locator('input[type=password]').first()).toHaveValue('synthetic-test-only');await expect(preview).toHaveAttribute('src',photo!);await expect(page.getByText(other==='en'?'Selected, not approved.':'ఫోటో ఎంపికైంది; ఇంకా ఆమోదించబడలేదు.',{exact:false})).toBeVisible();await expect(page.locator('#registration-consent')).toBeChecked();
 await preview.scrollIntoViewIfNeeded();await page.screenshot({path:`artifacts/locale-state/selected-photo-${lang}.png`,animations:'disabled'});
 await page.getByRole('button',{name:other==='en'?'Create my profile in 1 minute':'1 నిమిషంలో నా ప్రొఫైల్ సృష్టించండి',exact:false}).click();
 await expect(page.getByRole('heading',{name:other==='en'?'Registration Successful!':'నమోదు విజయవంతంగా పూర్తయింది!',exact:true})).toBeVisible();
 expect(submissions).toBe(1);expect(bodies[0].includes(Buffer.from('name="photo_file"'))).toBe(true);expect(bodies[0].includes(Buffer.from([0xff,0xd8,0xff]))).toBe(true);
 const code=page.locator('#email-verify-code');await code.fill('12345678');await switchLanguage(page,other);await expect(code).toHaveValue('12345678');await expect(page.locator('.mv-register-workspace')).toContainText('SYN-STATE');expect(submissions).toBe(1);
 const storage=await page.evaluate(()=>JSON.stringify({...localStorage,...sessionStorage}));expect(storage).not.toContain('synthetic-test-only');expect(storage).not.toContain('data:image');expect(storage).not.toContain(photo!);
 await page.locator('.mv-register-workspace').screenshot({path:`artifacts/locale-state/registration-${lang}.png`,animations:'disabled'});
});
for(const lang of ['te','en'])test(`login typed phone password survive language ${lang}`,async({page})=>{
 let writes=0;await page.route('**/api/**',r=>{if(r.request().method()!=='GET')writes++;return r.fulfill({json:{password_login:true,phone_otp:false,email_recovery_configured:true,passkeys_configured:false}})});
 await page.goto(localeHref('/login',lang));await page.locator('#login-phone').fill('9000000001');await page.locator('#login-pw').fill('synthetic-test-only');await switchLanguage(page,lang);await expect(page.locator('#login-phone')).toHaveValue('9000000001');await expect(page.locator('#login-pw')).toHaveValue('synthetic-test-only');expect(writes).toBe(0);
 expect(await page.evaluate(()=>JSON.stringify({...localStorage,...sessionStorage}))).not.toContain('synthetic-test-only');
});

async function setupEditor(page:Page,lang='en',gender='Bride',score=84){let writes:any[]=[];let upload=false;let p:any={tsap_id:'SYN-EDITOR',full_name:'Synthetic Editor',gender,dob:'1998-01-01',height:`5'4"`,marital_status:'Pelli Kaledu',caste:'Kapu',education:'B.Tech / B.E.',job:'Engineer',state:'TS',district:'Hyderabad',photo_url:''};await page.addInitScript(l=>{localStorage.setItem('tsap_lang',l);localStorage.setItem('tsap_id','SYN-EDITOR');localStorage.setItem('tsap_token','synthetic-only')},lang);await page.route('**/api/**',async r=>{const u=new URL(r.request().url());if(u.pathname==='/api/profile/update'){const d=r.request().postDataJSON();writes.push(d);p={...p,...d};return r.fulfill({json:{success:true,completeness_score:96,missing_fields:['photo_url']}})}if(u.pathname==='/api/profile/SYN-EDITOR')return r.fulfill({json:{success:true,profile:p,completeness_score:upload?100:score,missing_fields:upload?[]:['education_detail','work_type','father_occupation','photo_url']}});if(u.pathname==='/api/photo/upload'){upload=true;return r.fulfill({json:{url:'/api/photos/synthetic.jpg',status:'pending'}})}if(u.pathname==='/api/photo/status/SYN-EDITOR')return r.fulfill({json:{photo_url:'',photo_status:upload?'pending':'none',photo_reason:'',photo_reason_te:''}});return r.fulfill({json:{success:true,authenticated:true,tsap_id:'SYN-EDITOR',items:[],profiles:[],total:0}})});await page.goto(localeHref('/me',lang));await page.getByRole('button',{name:lang==='en'?/Edit Profile/:/నా ప్రొఫైల్ సవరణ/}).click();await page.locator('#me-full_name').waitFor();return()=>writes;}

async function setupPayment(page:Page,lang:string,mode='manual_upi'){
 await page.addInitScript(l=>{localStorage.setItem('tsap_lang',l);localStorage.setItem('tsap_id','SYNTHETIC-PAYMENT-TEST')},lang);
 await page.route('**/api/**',async r=>{const u=new URL(r.request().url());let json:any={success:true,items:[],bureau:[{code:'SYNTHETIC',price:999,profiles:25,validity_days:30,label:'Synthetic package',perks:[],perksTe:[]}]};
 if(u.pathname==='/api/pay/config')json={success:true,mode};
 if(u.pathname==='/api/pay/order')json={success:true,pay_order:{id:'synthetic-order',mode,final_amount:999,discount:0,key_id:'synthetic',rzp_order_id:'synthetic-provider-order',upi_id:'synthetic@example.invalid',qr_token:'synthetic',status:'created'}};
 if(u.pathname.startsWith('/api/pay/qr/'))return r.fulfill({status:404,body:''});
 return r.fulfill({json});});
 await page.goto(localeHref('/bureau',lang));await expect(page.getByText('Synthetic package',{exact:true})).toBeVisible();await page.getByRole('button',{name:lang==='te'?/₹999 చెల్లించండి/:/Pay ₹999/}).click();
}

for(const lang of ['te','en'])test(`profile unsaved edit and photo upload survive language ${lang}`,async({page})=>{
 const writes=await setupEditor(page,lang);await page.locator('#me-full_name').fill('Unsaved Synthetic Edit');
 await page.getByLabel(lang==='en'?'Choose a replacement profile photo':'కొత్త ప్రొఫైల్ ఫోటో ఎంచుకోండి',{exact:true}).setInputFiles('tests/fixtures/synthetic-profile.jpg');
 await expect(page.getByRole('heading',{name:lang==='en'?/Profile completion/:/ప్రొఫైల్ పూర్తి స్థితి/})).toContainText('100%');
 await switchLanguage(page,lang);await expect(page.locator('#me-full_name')).toHaveValue('Unsaved Synthetic Edit');expect(writes()).toHaveLength(0);
 await page.locator('form button[type=submit]').last().click();await expect.poll(()=>writes().length).toBe(1);expect(writes()[0].full_name).toBe('Unsaved Synthetic Edit');
 await page.screenshot({path:`artifacts/locale-state/editor-${lang}.png`,animations:'disabled'});
});
for(const lang of ['te','en'])test(`payment offer order and UTR survive language without duplicate order ${lang}`,async({page})=>{
 let orderCalls=0;page.on('request',r=>{if(new URL(r.url()).pathname==='/api/pay/order')orderCalls++});
 await setupPayment(page,lang);await page.getByRole('textbox',{name:lang==='te'?'ఆఫర్ కోడ్':'Offer code',exact:true}).fill('SYNTHETIC');
 await switchLanguage(page,lang);const other=lang==='te'?'en':'te';
 await expect(page.getByRole('textbox',{name:other==='te'?'ఆఫర్ కోడ్':'Offer code',exact:true})).toHaveValue('SYNTHETIC');expect(orderCalls).toBe(0);
 await page.getByRole('button',{name:other==='te'?'ఆర్డర్ సృష్టించండి →':'Order →',exact:true}).click();
 await page.getByRole('textbox',{name:other==='te'?'12 అంకెల UTR':'12-digit UTR',exact:true}).fill('123456789012');expect(orderCalls).toBe(1);
 await switchLanguage(page,other);await expect(page.getByRole('textbox',{name:lang==='te'?'12 అంకెల UTR':'12-digit UTR',exact:true})).toHaveValue('123456789012');expect(orderCalls).toBe(1);
 await page.screenshot({path:`artifacts/locale-state/payment-${lang}.png`,animations:'disabled'});
});

for(const lang of ['te','en'])test(`contact modal payment language never resets order or repeats consent check ${lang}`,async({page})=>{
 let unlocks=0,orders=0;await page.addInitScript(()=>localStorage.setItem('tsap_id','SYN-STATE'));
 await page.route('**/api/**',r=>{const p=new URL(r.request().url()).pathname;
  if(p==='/api/search')return r.fulfill({json:{results:[{tsap_id:'SYN-TARGET',full_name:'Synthetic Target',age:28,caste:'Kapu',district:'Hyderabad'}],total:1,count:1,offset:0,limit:24}});
  if(p==='/api/unlock'){unlocks++;return r.fulfill({json:{success:false,reason:'consent_required'}})}
  if(p==='/api/pay/order'){orders++;return r.fulfill({json:{success:true,pay_order:{id:'SYN-ORDER',mode:'manual_upi',final_amount:99,upi_id:'synthetic@example.invalid',qr_token:'synthetic',status:'created'}}})}
  if(p.startsWith('/api/pay/qr/'))return r.fulfill({status:404,body:''});
  return r.fulfill({json:{success:true,valid:true,tsap_id:'SYN-STATE',items:[],saved:[],searches:[],plans:[],mode:'manual_upi'}});
 });
 await page.goto(localeHref('/matches',lang));await page.locator('.matches-profile-card').getByRole('button',{name:lang==='en'?'Contact':'సంప్రదించండి',exact:true}).click();
 await expect.poll(()=>unlocks).toBe(1);
 await page.locator('input[placeholder]').last().fill('SYNTHETIC');
 // The modal covers the header. Dispatch the same toggle click without closing the workflow.
 await page.getByRole('button',{name:lang==='te'?'Show in English':'తెలుగులో చూపించండి',exact:true}).first().dispatchEvent('click');
 await expect(page.locator('html')).toHaveAttribute('lang',lang==='te'?'en-IN':'te-IN');expect(unlocks).toBe(1);
 const other=lang==='te'?'en':'te';await page.getByRole('button',{name:other==='en'?/Pay ₹99/:/₹99/}).last().click();
 await expect(page.getByText(/SYN-ORDER/)).toBeVisible();await page.getByPlaceholder('12-digit UTR',{exact:true}).fill('123456789012');
 await page.getByRole('button',{name:other==='te'?'Show in English':'తెలుగులో చూపించండి',exact:true}).first().dispatchEvent('click');
 await expect(page.locator('html')).toHaveAttribute('lang',lang+'-IN');await expect(page.getByPlaceholder('12-digit UTR',{exact:true})).toHaveValue('123456789012');await expect(page.getByText(/SYN-ORDER/)).toBeVisible();expect(orders).toBe(1);expect(unlocks).toBe(1);
});

test('legacy English hint preserves typed state instead of reloading a workflow',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('tsap_lang','en'));await page.route('**/api/**',r=>r.fulfill({json:{password_login:true,phone_otp:false,passkeys_configured:false}}));
 await page.goto('/login');await page.locator('#login-phone').fill('9000000001');await page.locator('#login-pw').fill('synthetic-test-only');const url=page.url();await page.evaluate(()=>{(window as any).__hintSame=true});await page.getByRole('link',{name:'View in English',exact:true}).click();await expect(page.locator('html')).toHaveAttribute('lang','en-IN');await expect(page.locator('#login-pw')).toHaveValue('synthetic-test-only');await expect(page.locator('#login-phone')).toHaveValue('9000000001');expect(page.url()).toBe(url);expect(await page.evaluate(()=>(window as any).__hintSame)).toBe(true);
});
for(const lang of ['te','en'])test(`home search filters survive language ${lang}`,async({page})=>{
 await page.route('**/api/**',r=>r.fulfill({json:{success:true,items:[],profiles:[],total:0}}));await page.goto(localeHref('/',lang));const age=page.getByRole('combobox',{name:'Min Age',exact:true});await age.selectOption('26');await switchLanguage(page,lang);await expect(age).toHaveValue('26');await expect(page.locator('header a.header-home')).toHaveAttribute('href',lang==='te'?'/en':'/');
});
