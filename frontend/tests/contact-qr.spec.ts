import {test,expect} from '@playwright/test';
const TOKEN='FIXTURE_opaque_token_0123456789abcdef';
for(const width of [390,1280])test(`contact QR dialog issues a token for the verified owner and shows no number ${width}`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.addInitScript(()=>localStorage.setItem('tsap_lang','en'));
 const posts:{path:string,body:any}[]=[];
 await page.route('**/api/**',r=>{const path=new URL(r.request().url()).pathname;
  if(path==='/api/auth/verify')return r.fulfill({json:{valid:true,tsap_id:'COOKIE_OWNER'}});
  if(path.startsWith('/api/search/'))return r.fulfill({json:{profile:{tsap_id:path.split('/').pop(),full_name:'Fictional member',age:29,gender:'Bride'},quality:{}}});
  if(path.startsWith('/api/saved/'))return r.fulfill({json:{saved:[]}});
  if(path==='/api/unlock'){posts.push({path,body:r.request().postDataJSON()});return r.fulfill({json:{success:true,phone_masked:'91••••••99'}})}
  if(path==='/api/contact/token'){posts.push({path,body:r.request().postDataJSON()});return r.fulfill({json:{ok:true,token:TOKEN,expires_in:300}})}
  return r.fulfill({json:{success:true,rows:[],total:0,items:[]}})});
 await page.goto('/search/FICTIONAL');
 await page.getByRole('button',{name:'📞 Contact after acceptance',exact:true}).click();
 await page.getByRole('button',{name:'📇 View contact QR',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'Contact QR'});await expect(dialog).toBeVisible();await expect(dialog.locator('svg').first()).toBeVisible();
 expect(posts.filter(x=>x.path==='/api/contact/token').length).toBe(1);
 const tokenPost=posts.find(x=>x.path==='/api/contact/token')!;expect(tokenPost.body.viewer_id).toBe('COOKIE_OWNER');expect(tokenPost.body.target_id).toBe('FICTIONAL');
 await expect(page.getByText(/\d{10}/)).toHaveCount(0);await expect(dialog).not.toContainText(TOKEN);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();
});
for(const lang of ['en','te'])test(`contact resolve page redeems the fragment token once and shows no number ${lang}`,async({page})=>{
 await page.addInitScript(l=>localStorage.setItem('tsap_lang',l),lang);const urls:string[]=[];
 await page.route('**/api/**',r=>{const u=new URL(r.request().url());if(u.pathname==='/api/auth/verify')return r.fulfill({json:{valid:true,tsap_id:'COOKIE_OWNER'}});
  if(u.pathname.startsWith('/api/contact/resolve/')){urls.push(r.request().url());return r.fulfill({json:{ok:true,wa_link:'https://wa.me/919000000099',phone_masked:'91••••••99'}})}
  return r.fulfill({json:{success:true}})});
 await page.goto('/contact/resolve#t='+TOKEN);
 const wa=page.getByRole('link',{name:lang==='en'?/Open WhatsApp/:/WhatsApp/});await expect(wa).toBeVisible();await expect(wa).toHaveAttribute('href','https://wa.me/919000000099');
 await expect(page.getByText('91••••••99')).toBeVisible();await expect(page.getByText('9000000099')).toHaveCount(0);
 expect(urls.length).toBe(1);expect(new URL(urls[0]).pathname).toBe('/api/contact/resolve/'+TOKEN);expect(new URL(urls[0]).search).toBe('');
 expect(page.url()).not.toContain(TOKEN);
});
test('contact resolve page with an invalid token shows a refusal and no link',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('tsap_lang','en'));
 await page.route('**/api/**',r=>{const u=new URL(r.request().url());if(u.pathname==='/api/auth/verify')return r.fulfill({json:{valid:true,tsap_id:'COOKIE_OWNER'}});
  if(u.pathname.startsWith('/api/contact/resolve/'))return r.fulfill({status:410,json:{detail:{reason:'already_used',en:'This contact QR was already used. Create a fresh one from the profile.',te:'ఈ కాంటాక్ట్ QR ఇప్పటికే వాడబడింది.'}}});
  return r.fulfill({json:{success:true}})});
 await page.goto('/contact/resolve#t=USED_TOKEN');
 await expect(page.getByText(/already used|no longer valid/i).first()).toBeVisible();await expect(page.getByRole('link',{name:/WhatsApp/})).toHaveCount(0);
 await page.goto('/contact/resolve');await expect(page.getByText(/incomplete/i)).toBeVisible();
});
