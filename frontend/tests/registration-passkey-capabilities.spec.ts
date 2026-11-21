import {test,expect,type Page} from '@playwright/test';
import fs from 'node:fs';
fs.mkdirSync('artifacts/registration-passkey',{recursive:true});
async function register(page:Page,mode:'off'|'on'|'error'|'malformed'){
 await page.addInitScript(()=>localStorage.setItem('tsap_lang','en'));
 let passkeyWrites=0;
 await page.route('**/api/**',r=>{const path=new URL(r.request().url()).pathname;
  if(path==='/api/auth/capabilities')return r.fulfill({status:mode==='error'?503:200,json:mode==='malformed'?{success:true}:{password_login:true,login_identifier:'phone',phone_otp:false,email_recovery_configured:false,passkeys_configured:mode==='on',email_optional_at_registration:true}});
  if(path.includes('passkey')||path.includes('webauthn'))passkeyWrites++;
  if(path==='/api/register')return r.fulfill({json:{success:true,tsap_id:'SYN-GATE',card_url:'',phone_verified:false,is_approved:false,plan:'FREE',credits:3,email_verify:{required:false}}});
  return r.fulfill({json:{success:true,castes:['Kapu'],districts:['Hyderabad'],items:[]}});
 });
 await page.goto('/register');await page.getByRole('button',{name:/Bride/}).click();await page.getByLabel('Full Name',{exact:false}).fill('Synthetic Capability Test');await page.locator('input[type=date]').fill('1998-01-01');await page.locator('#quick-religion').selectOption('Hindu');
 await page.getByRole('button',{name:/Select a community/}).click();await page.getByRole('button',{name:'Kapu',exact:true}).click();await page.getByLabel('State',{exact:true}).selectOption('TS');await page.getByRole('button',{name:/Select a district/}).click();await page.getByRole('button',{name:'Hyderabad',exact:true}).click();
 await page.getByLabel('Mobile number (10 digits)',{exact:false}).fill('9000000001');await page.getByLabel('Password (minimum 6 characters)',{exact:true}).fill('synthetic-test-only');
 await page.getByLabel('Choose a photo from your gallery',{exact:true}).setInputFiles('tests/fixtures/synthetic-profile.jpg');await page.getByRole('checkbox',{name:/I have permission to upload this photo/}).check();await page.locator('#registration-consent').check();
 await page.getByRole('button',{name:'Create my profile in 1 minute',exact:false}).click();await expect(page.getByRole('heading',{name:'Registration Successful!',exact:true})).toBeVisible();return()=>passkeyWrites;
}
for(const mode of ['off','on','error','malformed'] as const)test(`registration passkey capability ${mode}`,async({page})=>{
 const writes=await register(page,mode);
 if(mode==='on'){await expect(page.getByRole('button',{name:'Register Passkey',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Register Passkey',exact:true})).toBeDisabled();}
 else{await expect(page.getByRole('button',{name:'Register Passkey',exact:true})).toHaveCount(0);await expect(page.getByTestId('registration-passkey-unavailable')).toContainText(mode==='off'?'not available right now':'could not be checked');await expect(page.getByPlaceholder('Your Password',{exact:true})).toHaveCount(0);}
 expect(writes()).toBe(0);
});
for(const width of [320,1280])test(`unsupported registration passkey pixels ${width}`,async({page})=>{
 await page.setViewportSize({width,height:900});await register(page,'off');const notice=page.getByTestId('registration-passkey-unavailable');await notice.scrollIntoViewIfNeeded();await page.screenshot({path:`artifacts/registration-passkey/unavailable-${width}.png`});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();
});
