import {localeHref} from "./locale-href";
import {test,expect} from '@playwright/test';
for(const lang of ['en','te'])for(const width of [320,390,1280])test(`recovery password length feedback ${lang} ${width}`,async({page})=>{
 await page.setViewportSize({width,height:850});await page.addInitScript(l=>localStorage.setItem('tsap_lang',l),lang);
 const writes:string[]=[];
 await page.route('**/api/**',r=>{
  const u=new URL(r.request().url());if(r.request().method()!=='GET')writes.push(u.pathname);
  if(u.pathname==='/api/auth/capabilities')return r.fulfill({json:{password_login:true,login_identifier:'phone',phone_otp:false,email_recovery_configured:true,passkeys_configured:false,email_optional_at_registration:true}});
  if(u.pathname==='/api/auth/forgot-email')return r.fulfill({json:{success:true,message_en:'Fictional recovery requested.',message_telugu:'కల్పిత రికవరీ అభ్యర్థన.'}});
  if(u.pathname==='/api/auth/reset-email')return r.fulfill({status:400,json:{detail:'Fictional reset rejected. No account was changed.'}});
  return r.fulfill({json:{}});
 });
 await page.goto(localeHref('/login',lang));await page.getByRole('button',{name:lang==='en'?'Forgot password?':'పాస్‌వర్డ్ మర్చిపోయారా?',exact:true}).click();await page.locator('#f-phone').fill('fictional-recovery@example.invalid');await page.getByRole('button',{name:lang==='en'?/Email me a reset code/:/ఈమెయిల్ రీసెట్ కోడ్ పంపు/}).click();await page.locator('#f-otp').fill('12345678');
 for(const length of [7,73]){
  await page.locator('#f-newpw').fill('x'.repeat(length));await page.locator('#f-confirmpw').fill('x'.repeat(length));await page.getByRole('button',{name:lang==='en'?/Reset Password & Login/:/పాస్‌వర్డ్ రీసెట్ చేసి లాగిన్ అవ్వండి/}).click();
  const expected=process.env.PROOF_STAGE==='before'&&lang==='en'?'New password must be at least 6 characters':lang==='en'?'New password must be 8-72 characters':'కొత్త పాస్‌వర్డ్ 8-72 అక్షరాలు ఉండాలి';await expect(page.locator('[role=status][aria-live=polite]')).toContainText(expected);expect(writes).toEqual(['/api/auth/forgot-email']);
  await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:`artifacts/recovery-length/${process.env.PROOF_STAGE||'after'}-${lang}-${width}-${length}.png`,fullPage:true});expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
 }
 if(process.env.PROOF_STAGE==='before')return;
 for(const length of [8,72]){await page.locator('#f-newpw').fill('x'.repeat(length));await page.locator('#f-confirmpw').fill('x'.repeat(length));await page.getByRole('button',{name:lang==='en'?/Reset Password & Login/:/పాస్‌వర్డ్ రీసెట్ చేసి లాగిన్ అవ్వండి/}).click();await expect(page.locator('[role=status][aria-live=polite]')).toContainText(lang==='en'?'Fictional reset rejected.':'సేవలో సమస్య ఏర్పడింది. మళ్లీ ప్రయత్నించండి.');if(lang==='te')await expect(page.locator('[role=status][aria-live=polite]')).not.toContainText('Fictional reset rejected.');}
 expect(writes).toEqual(['/api/auth/forgot-email','/api/auth/reset-email','/api/auth/reset-email']);
});
