import {localeHref} from "./locale-href";
import {test,expect} from '@playwright/test';
for(const lang of ['en','te'])for(const width of [320,390,1280])for(const ios of [false,true])test(`portable install guidance ${lang} ${width} ${ios?'ios':'browser'}`,async({page})=>{
 await page.setViewportSize({width,height:800});await page.addInitScript(({lang,ios})=>{localStorage.setItem('tsap_lang',lang);if(ios)Object.defineProperty(navigator,'userAgent',{get:()=> 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile Safari/604.1'});},{lang,ios});
 await page.route('**/api/**',r=>r.fulfill({json:{}}));await page.goto(localeHref('/',lang));await expect(page.getByRole('button',{name:lang==='en'?'Show in English':'తెలుగులో చూపించండి',exact:true})).toHaveAttribute('aria-pressed','true');
 const bar=page.getByTestId('pwa-install-bar');await expect.poll(async()=>{await page.evaluate(()=>window.dispatchEvent(new Event('tsap:install-show')));return bar.isVisible()}).toBe(true);
 await expect(bar).toContainText(lang==='en'?'Add Mana Vivaha to your home screen':'మన వివాహను హోమ్ స్క్రీన్‌కు జోడించండి');expect(await bar.innerText()).not.toMatch(/\p{Extended_Pictographic}/u);
 if(ios){await expect(bar).toContainText('Add to Home Screen');await expect(bar.getByRole('button')).toHaveCount(1);}else{await expect(bar).toContainText(lang==='en'?'Live matches and requests need internet.':'అభ్యర్థనల కోసం ఇంటర్నెట్ అవసరం.');await expect(bar.getByRole('button',{name:lang==='en'?'Install':'జోడించండి',exact:true})).toBeVisible();}
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);await page.waitForTimeout(500);await page.screenshot({animations:'disabled',path:`artifacts/pwa-guidance/${lang}-${width}-${ios?'ios':'browser'}.png`});await bar.getByRole('button',{name:lang==='en'?'Later':'తర్వాత',exact:true}).click();await expect(bar).toHaveCount(0);
});
