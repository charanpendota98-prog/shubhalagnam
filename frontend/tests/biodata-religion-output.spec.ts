import {test,expect} from '@playwright/test';
import fs from 'node:fs';

for(const lang of ['en','te'])for(const width of [320,390,1280])for(const religion of ['Hindu','Muslim','Christian','Other']){
  test(`biodata explicit ${religion} preview and output ${lang} ${width}`,async({page},info)=>{
    const te=lang==='te';let writes=0;
    await page.setViewportSize({width,height:1000});
    await page.addInitScript(l=>{localStorage.setItem('tsap_lang',l);(window as any).__shares=[];window.open=(url)=>{(window as any).__shares.push(String(url));return null;};},lang);
    await page.route('**/api/**',route=>{if(route.request().method()!=='GET'){writes++;return route.abort();}return route.fulfill({json:{success:true,items:[]}});});
    await page.goto('/biodata');
    const choice=page.locator('#biodata-religion'),canvas=page.locator('#biodata-canvas');
    const jpg=page.getByRole('button',{name:te?'HD JPG డౌన్‌లోడ్ చేయండి':'Download HD JPG',exact:true});
    const share=page.getByRole('button',{name:te?'WhatsAppలో పంచుకోండి':'Share on WhatsApp',exact:true});
    await expect(choice).toHaveValue('');await expect(jpg).toBeDisabled();await expect(share).toBeDisabled();
    expect(await canvas.innerText()).not.toMatch(/Gothram|గోత్రం|Nakshatra|నక్షత్రం/);
    if(religion==='Hindu')await page.screenshot({path:info.outputPath('choice.png')});
    await choice.selectOption('Hindu');
    await page.getByRole('button',{name:te?'వివరాలను సవరించండి':'Edit details',exact:true}).click();
    await page.getByLabel(te?'పూర్తి పేరు':'Full name',{exact:true}).fill('ISOLATED BIODATA ONLY');
    await page.getByLabel(te?'గోత్రం':'Gothram',{exact:true}).fill('ISOLATED_HINDU_GOTHRAM');
    await choice.selectOption(religion);
    if(religion==='Muslim')await page.getByLabel(te?'ఫిర్కా / శాఖ':'Sect / maslak',{exact:true}).fill('ISOLATED_MUSLIM_SECT');
    if(religion==='Christian')await page.getByLabel(te?'చర్చి పేరు':'Church / parish',{exact:true}).fill('ISOLATED_CHRISTIAN_CHURCH');
    await expect(page.getByLabel(te?'గోత్రం':'Gothram',{exact:true})).toHaveCount(religion==='Hindu'?1:0);
    await page.getByRole('button',{name:te?'ప్రివ్యూ చూపించండి':'Preview',exact:true}).click();
    const text=await canvas.innerText();
    expect(text).not.toMatch(/\p{Extended_Pictographic}/u);
    const markers=['ISOLATED_HINDU_GOTHRAM','ISOLATED_MUSLIM_SECT','ISOLATED_CHRISTIAN_CHURCH'];
    for(let i=0;i<markers.length;i++)expect(text.includes(markers[i])).toBe(religion===['Hindu','Muslim','Christian'][i]);
    if(religion==='Other')expect(text).not.toMatch(/Gothram|గోత్రం|Nakshatra|నక్షత్రం|Moon sign|రాశి/);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();
    await canvas.screenshot({path:info.outputPath('canvas.png')});
    await share.click();
    const shared=await page.evaluate(()=>new URL((window as any).__shares.at(-1)).searchParams.get('text')||'');
    for(let i=0;i<markers.length;i++)expect(shared.includes(markers[i])).toBe(religion===['Hindu','Muslim','Christian'][i]);
    if(width===390){const [download]=await Promise.all([page.waitForEvent('download'),jpg.click()]);await download.saveAs(info.outputPath('export.jpg'));const url='data:image/jpeg;base64,'+fs.readFileSync(info.outputPath('export.jpg')).toString('base64');const size=await page.evaluate(async src=>{const image=new Image();image.src=src;await image.decode();return {width:image.width,height:image.height};},url);expect(size.width).toBe(2000);expect(size.height).toBeGreaterThan(1800);}
    expect(writes).toBe(0);
  });
}
