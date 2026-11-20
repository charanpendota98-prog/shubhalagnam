import {test,expect,type Page} from '@playwright/test';
import fs from 'node:fs';test.setTimeout(20000);
fs.mkdirSync('artifacts/payment-panel',{recursive:true});
async function setup(page:Page,lang:string,mode='manual_upi'){
 await page.addInitScript(l=>{localStorage.setItem('tsap_lang',l);localStorage.setItem('tsap_id','SYNTHETIC-PAYMENT-TEST')},lang);
 await page.route('**/api/**',async r=>{const u=new URL(r.request().url());let json:any={success:true,items:[],bureau:[{code:'SYNTHETIC',price:999,profiles:25,validity_days:30,label:'Synthetic package',perks:[],perksTe:[]}]};
 if(u.pathname==='/api/pay/config')json={success:true,mode};
 if(u.pathname==='/api/pay/order')json={success:true,pay_order:{id:'synthetic-order',mode,final_amount:999,discount:0,key_id:'synthetic',rzp_order_id:'synthetic-provider-order',upi_id:'synthetic@example.invalid',qr_token:'synthetic',status:'created'}};
 if(u.pathname.startsWith('/api/pay/qr/'))return r.fulfill({status:404,body:''});
 return r.fulfill({json});});
 await page.goto('/bureau');await expect(page.getByText('Synthetic package',{exact:true})).toBeVisible();await page.getByRole('button',{name:lang==='te'?/₹999 చెల్లించండి/:/Pay ₹999/}).click();
}
for(const lang of ['en','te'])for(const width of [320,390,1280])test(`payment panel controls fit ${lang} ${width}`,async({page})=>{
 await page.setViewportSize({width,height:1000});await setup(page,lang);
 const offer=page.getByRole('textbox',{name:lang==='te'?'ఆఫర్ కోడ్':'Offer code',exact:true});await offer.fill('SYNTHETIC');expect((await offer.boundingBox())!.width).toBeGreaterThan(150);await expect(offer).toHaveValue('SYNTHETIC');
 expect((await page.getByRole('button',{name:lang==='te'?'తనిఖీ చేయండి':'Check',exact:true}).boundingBox())!.width).toBeGreaterThan(150);await page.getByRole('button',{name:lang==='te'?'ఆర్డర్ సృష్టించండి →':'Order →',exact:true}).click();const utr=page.getByRole('textbox',{name:lang==='te'?'12 అంకెల UTR':'12-digit UTR',exact:true});await utr.fill('123456789012');expect((await utr.boundingBox())!.width).toBeGreaterThan(150);await expect(utr).toHaveValue('123456789012');await expect(page.getByRole('button',{name:lang==='te'?'సమర్పించు':'Submit UTR',exact:true})).toBeEnabled();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();await utr.locator('..').locator('..').screenshot({path:`artifacts/payment-panel/utr-${lang}-${width}.png`});
 await page.getByRole('button',{name:lang==='te'?'← ఆఫర్ మార్చండి':'← Change offer',exact:true}).click();await offer.locator('..').screenshot({path:`artifacts/payment-panel/offer-${lang}-${width}.png`});
});
for(const lang of ['en','te'])test(`checkout failure never asserts no debit ${lang}`,async({page})=>{
 await setup(page,lang,'razorpay');await page.evaluate(()=>{(window as any).Razorpay=class{callback:any;on(_event:string,callback:any){this.callback=callback}open(){this.callback({error:{description:'Synthetic failure'}})}}});
 await page.getByRole('button',{name:lang==='te'?'ఆర్డర్ సృష్టించండి →':'Order →',exact:true}).click();await page.getByRole('button',{name:/Razorpay/}).click();
 await expect(page.getByText(lang==='te'?/మళ్లీ ప్రయత్నించే ముందు మీ బ్యాంక్ స్థితి చూడండి/:/Check your bank status before retrying/)).toBeVisible();await expect(page.locator('main')).not.toContainText('no money was debited');await expect(page.getByRole('button',{name:/Razorpay/})).toBeEnabled();
});

test('payment availability states: unavailable shows no Pay button and loading/error never guess', async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem('tsap_lang', 'en'); localStorage.setItem('tsap_id', 'SYNTHETIC-PAYMENT-TEST'); });
  let configMode: 'fail' | 'unconfigured' = 'fail';
  let orderCalls = 0;
  await page.route('**/api/**', async (r) => {
    const u = new URL(r.request().url());
    if (u.pathname === '/api/pay/order') { orderCalls++; return r.fulfill({ status: 400, json: { detail: 'unavailable' } }); }
    if (u.pathname === '/api/pay/config') return configMode === 'fail' ? r.abort() : r.fulfill({ json: { success: true, mode: 'unconfigured' } });
    return r.fulfill({ json: { success: true, items: [], bureau: [{ code: 'SYNTHETIC', price: 999, profiles: 25, validity_days: 30, label: 'Synthetic package', perks: [], perksTe: [] }] } });
  });
  await page.goto('/bureau');
  await expect(page.getByText('We could not check whether payment is open.')).toBeVisible();
  await expect(page.getByRole('button', { name: /Pay ₹999/ })).toHaveCount(0);
  configMode = 'unconfigured';
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByText(/Payments are not open yet/)).toBeVisible();
  await expect(page.getByRole('button', { name: /Pay ₹999/ })).toHaveCount(0);
  expect(orderCalls).toBe(0);
});
