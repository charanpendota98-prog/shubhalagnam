import {test,expect,type Page} from '@playwright/test';
async function register(page:Page,mode:'off'|'on'|'error'|'malformed', outcome:'success'|'http'|'network'='success'){
 await page.addInitScript(()=>localStorage.setItem('tsap_lang','en'));
 let passkeyWrites=0;
 await page.route('**/api/**',r=>{const path=new URL(r.request().url()).pathname;
  if(path==='/api/auth/capabilities')return r.fulfill({status:mode==='error'?503:200,json:mode==='malformed'?{success:true}:{password_login:true,login_identifier:'phone',phone_otp:false,email_recovery_configured:false,passkeys_configured:mode==='on',email_optional_at_registration:true}});
  if(path.includes('passkey')||path.includes('webauthn'))passkeyWrites++;
  if(path==='/api/register'&&outcome==='network')return r.abort();
  if(path==='/api/register'&&outcome==='http')return r.fulfill({status:503,json:{message_en:'Fixture registration failed'}});
  if(path==='/api/register')return r.fulfill({json:{success:true,tsap_id:'SYN-GATE',card_url:'',phone_verified:false,is_approved:false,plan:'FREE',credits:3,email_verify:{required:false}}});
  return r.fulfill({json:{success:true,castes:['Kapu'],districts:['Hyderabad'],items:[]}});
 });
 await page.goto('/register');await page.getByRole('button',{name:/Bride/}).click();await page.getByLabel('Full Name',{exact:false}).fill('Synthetic Capability Test');await page.locator('input[type=date]').fill('1998-01-01');await page.locator('#quick-religion').selectOption('Hindu');
 await page.getByRole('button',{name:/Select a community/}).click();await page.getByRole('button',{name:'Kapu',exact:true}).click();await page.getByLabel('State',{exact:true}).selectOption('TS');await page.getByRole('button',{name:/Select a district/}).click();await page.getByRole('button',{name:'Hyderabad',exact:true}).click();
 await page.getByLabel('Mobile number (10 digits)',{exact:false}).fill('9000000001');await page.getByLabel('Password (minimum 6 characters)',{exact:true}).fill('synthetic-test-only');
 await page.getByLabel('Choose a photo from your gallery',{exact:true}).setInputFiles('tests/fixtures/synthetic-profile.jpg');await page.getByRole('checkbox',{name:/I have permission to upload this photo/}).check();await page.locator('#registration-consent').check();
 await page.getByRole('button',{name:'Create my profile in 1 minute',exact:false}).click();if(outcome==='success')await expect(page.getByRole('heading',{name:'Registration Successful!',exact:true})).toBeVisible();else await expect(page.getByText('Please review the following details:',{exact:true})).toBeVisible();return()=>passkeyWrites;
}

for(const outcome of ['success','http','network'] as const)for(const width of [320,1280])test(`registration outcome ${outcome} ${width}`,async({page})=>{await page.setViewportSize({width,height:1000});const writes=await register(page,'off',outcome);if(outcome!=='success'){await expect(page.getByLabel('Full Name',{exact:false})).toHaveValue('Synthetic Capability Test');await expect(page.getByRole('checkbox',{name:/I have permission to upload this photo/})).toBeChecked();await expect(page.locator('#registration-consent')).toBeChecked();await expect(page.getByRole('button',{name:'Create my profile in 1 minute',exact:false})).toBeEnabled();await expect(page.getByRole('heading',{name:'Registration Successful!',exact:true})).toHaveCount(0);}else{await expect(page.getByText('Profile ID: SYN-GATE • Submitted for review',{exact:false})).toBeVisible();expect(await page.evaluate(()=>localStorage.getItem('shubhalagnam_reg_draft_v6'))).toBeNull();}await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));await expect.poll(()=>page.evaluate(()=>scrollY)).toBe(0);await page.screenshot({animations:'disabled',path:`/downloads/mv-register-working-review/en-${width}-${outcome}.png`});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();expect(writes()).toBe(0)});
