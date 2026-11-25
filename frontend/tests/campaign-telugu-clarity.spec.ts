import {localeHref} from "./locale-href";
import {test,expect} from '@playwright/test';
import fs from 'node:fs';fs.mkdirSync('artifacts/campaign-telugu-clarity',{recursive:true});
const id='ABCDEFGHIJKLMNOPQRSTUVWX';
for(const width of [320,390,1280])test(`Telugu campaign instructions and controls ${width}`,async({page})=>{
 await page.setViewportSize({width,height:3600});await page.addInitScript(()=>localStorage.setItem('tsap_lang','te'));let posts=0;
 await page.route('**/api/**',r=>{const p=new URL(r.request().url()).pathname;if(r.request().method()!=='GET')posts++;return r.fulfill({json:p.endsWith('/campaigns')?{success:true,campaigns:[{id,name:'Fictional campaign',channel:'youtube',status:'active',link:`https://manavivaha.in/r/FICTION166?campaign=${id}`,clicks:4,registrations:2,eligible_rewards:0,recorded_earnings_inr:0,disclosure_en:'Ad / referral link.',disclosure_te:'ప్రకటన. ఈ లింక్ ద్వారా నమోదైతే నాకు బహుమతి రావచ్చు.'}]}:p==='/api/referral/UI166'?{ok:true,code:'FICTION166',link:'https://manavivaha.in/r/FICTION166',stats:{wallet:0},tier:{key:'BRONZE'},commission_rules:{min_payout:50}}:{success:true,payouts:[],leaderboard:[]}})});
 await page.goto(localeHref('/referral?id=UI166',"te"));const region=page.getByRole('region',{name:'Creator campaigns'});await expect(region.getByRole('heading',{name:'మీ వీడియోలు మరియు ప్రచారాలు'})).toBeVisible();
 for(const name of ['తాజా వివరాలు చూడండి','ప్రచార లింక్ సృష్టించండి','తాత్కాలికంగా ఆపండి','శాశ్వతంగా నిలిపివేయండి','ప్రకటన గుర్తింపు మరియు లింక్ కాపీ'])await expect(region.getByRole('button',{name,exact:true})).toBeVisible();
 await expect(region.getByLabel('ప్రచారం పేరు',{exact:true})).toBeVisible();await expect(region.getByRole('combobox',{name:/ప్రచార మాధ్యమం/})).toBeVisible();await expect(region.getByText('youtube · అమలులో ఉంది',{exact:true})).toBeVisible();
 await region.getByText('ప్రచార లింక్ క్యూఆర్ చూడండి',{exact:true}).click();await expect(region.getByRole('img',{name:'ఈ ప్రచార నమోదు లింక్ కోసం క్యూఆర్'})).toBeVisible();await region.getByText('ప్రకటన గుర్తింపు సూచన మరియు నమూనా',{exact:true}).click();
 await expect(region).not.toContainText(/Refresh చేయండి|Campaign పేరు|అర్హమైన rewards|Disclosure నియమం|Pause చేయండి|unique వ్యక్తులు/);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(posts).toBe(0);
 await region.screenshot({path:`artifacts/campaign-telugu-clarity/full-${width}.png`});
});
