import {test,expect,type Page} from '@playwright/test';
import fs from 'node:fs';test.setTimeout(20000);
fs.mkdirSync('artifacts/payment-panel',{recursive:true});
async function setup(page:Page,lang:string,mode='manual_upi'){
 await page.addInitScript(l=>{localStorage.setItem('tsap_lang',l);localStorage.setItem('tsap_id','SYNTHETIC-PAYMENT-TEST')},lang);
 await page.route('**/api/**',async r=>{const u=new URL(r.request().url());let json:any={success:true,items:[],bureau:[{code:'SYNTHETIC',price:999,profiles:25,validity_days:30,label:'Synthetic package',perks:[],perksTe:[]}]};
 if(u.pathname==='/api/pay/order')json={success:true,pay_order:{id:'synthetic-order',mode,final_amount:999,discount:0,key_id:'synthetic',rzp_order_id:'synthetic-provider-order',upi_id:'synthetic@example.invalid',qr_token:'synthetic',status:'created'}};
 if(u.pathname.startsWith('/api/pay/qr/'))return r.fulfill({status:404,body:''});
 return r.fulfill({json});});
 await page.goto('/bureau');await expect(page.getByText('Synthetic package',{exact:true})).toBeVisible();await page.getByRole('button',{name:/Pay ₹999/}).click();
}
for(const lang of ['en','te'])for(const width of [320,390,1280])test(`payment panel controls fit ${lang} ${width}`,async({page})=>{
 await page.setViewportSize({width,height:1000});await setup(page,lang);
 const offer=page.getByRole('textbox',{name:'Offer code',exact:true});await offer.fill('SYNTHETIC');expect((await offer.boundingBox())!.width).toBeGreaterThan(150);await expect(offer).toHaveValue('SYNTHETIC');
 await page.getByRole('button',{name:'Order →',exact:true}).click();const utr=page.getByRole('textbox',{name:'12-digit UTR',exact:true});await utr.fill('123456789012');expect((await utr.boundingBox())!.width).toBeGreaterThan(150);await expect(utr).toHaveValue('123456789012');await expect(page.getByRole('button',{name:lang==='te'?'సమర్పించు':'Submit UTR',exact:true})).toBeEnabled();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();await utr.locator('..').locator('..').screenshot({path:`artifacts/payment-panel/utr-${lang}-${width}.png`});
 await page.getByRole('button',{name:lang==='te'?'← Offer మార్చాలి':'← Change offer',exact:true}).click();await offer.locator('..').screenshot({path:`artifacts/payment-panel/offer-${lang}-${width}.png`});
});
for(const lang of ['en','te'])test(`checkout failure never asserts no debit ${lang}`,async({page})=>{
 await setup(page,lang,'razorpay');await page.evaluate(()=>{(window as any).Razorpay=class{callback:any;on(_event:string,callback:any){this.callback=callback}open(){this.callback({error:{description:'Synthetic failure'}})}}});
 await page.getByRole('button',{name:'Order →',exact:true}).click();await page.getByRole('button',{name:/Razorpay/}).click();
 await expect(page.getByText(lang==='te'?/మళ్లీ ప్రయత్నించే ముందు మీ బ్యాంక్ స్థితి చూడండి/:/Check your bank status before retrying/)).toBeVisible();await expect(page.locator('main')).not.toContainText('no money was debited');await expect(page.getByRole('button',{name:/Razorpay/})).toBeEnabled();
});
