import {localeHref} from "./locale-href";
import {test,expect} from '@playwright/test';

test('biodata does not guess religion or carry a prior profile',async({page},info)=>{
  await page.addInitScript(()=>localStorage.setItem('tsap_lang','en'));
  await page.route('**/api/**',route=>{
    if(route.request().method()!=='GET')return route.abort();
    const a=route.request().url().includes('/search/PROFILE_A');
    const b=route.request().url().includes('/search/PROFILE_B');
    return route.fulfill({json:a?{profile:{full_name:'ISOLATED PROFILE A',religion:'Hindu',gothram:'ISOLATED_A_GOTHRAM',caste:'ISOLATED_A_COMMUNITY'}}:b?{profile:{full_name:'ISOLATED PROFILE B'}}:{success:true,items:[]}});
  });
  await page.goto(localeHref('/biodata',"en"));
  const religion=page.locator('#biodata-religion'),canvas=page.locator('#biodata-canvas');
  const initial=await religion.inputValue();
  await religion.selectOption('Other');
  const otherHasHoroscope=/Gothram|Nakshatra|Moon sign|horoscope details/.test(await canvas.innerText());
  await page.locator('#biodata-profile-id').fill('PROFILE_A');
  await page.getByRole('button',{name:'Load details',exact:true}).click();
  await expect(canvas).toContainText('ISOLATED PROFILE A');
  await page.locator('#biodata-profile-id').fill('PROFILE_B');
  await page.getByRole('button',{name:'Load details',exact:true}).click();
  await expect(canvas).toContainText('ISOLATED PROFILE B');
  const missingImport=await religion.inputValue();
  await religion.selectOption('Hindu');
  const result={initial,otherHasHoroscope,missingImport,priorProfileLeaked:(await canvas.innerText()).includes('ISOLATED_A_')};
  await info.attach('diagnostic',{body:JSON.stringify(result,null,2),contentType:'application/json'});
  await page.screenshot({path:info.outputPath('diagnostic.png'),fullPage:true});
  expect(result).toEqual({initial:'',otherHasHoroscope:false,missingImport:'',priorProfileLeaked:false});
});

for(const lang of ['en','te']){
  test(`biodata known and unknown imported faiths remain explicit ${lang}`,async({page},info)=>{
    await page.addInitScript(l=>localStorage.setItem('tsap_lang',l),lang);
    const cases=[undefined,null,'','unlisted faith',42,' Hindu ','muslim','CHRISTIAN','Other'];
    await page.route('**/api/**',route=>{
      if(route.request().method()!=='GET')return route.abort();
      const match=route.request().url().match(/\/search\/CASE_(\d+)/);
      return route.fulfill({json:match?{profile:{full_name:'ISOLATED IMPORT '+match[1],religion:cases[Number(match[1])],caste:'SUPPLIED COMMUNITY'}}:{success:true,items:[]}});
    });
    await page.goto(localeHref('/biodata',lang));
    const load=page.getByRole('button',{name:lang==='te'?'వివరాలు నింపండి':'Load details',exact:true});
    for(let i=0;i<cases.length;i++){
      await page.locator('#biodata-profile-id').fill('CASE_'+i);await load.click();
      await expect(page.locator('#biodata-canvas')).toContainText('ISOLATED IMPORT '+i);
      const expected=i<5?'':['Hindu','Muslim','Christian','Other'][i-5];
      await expect(page.locator('#biodata-religion')).toHaveValue(expected);
      const jpg=page.getByRole('button',{name:lang==='te'?'HD JPG డౌన్‌లోడ్ చేయండి':'Download HD JPG',exact:true});
      if(expected)await expect(jpg).toBeEnabled();else await expect(jpg).toBeDisabled();
      if(!expected){await page.locator('#biodata-religion').selectOption('Hindu');await expect(page.locator('#biodata-canvas')).toContainText('SUPPLIED COMMUNITY');}
    }
    await page.screenshot({path:info.outputPath('imports.png')});
  });

  test(`biodata replaces manual context and keeps link provenance ${lang}`,async({page},info)=>{
    const te=lang==='te';await page.addInitScript(l=>localStorage.setItem('tsap_lang',l),lang);
    await page.route('**/api/**',route=>{
      if(route.request().method()!=='GET')return route.abort();
      const a=route.request().url().includes('/search/PROFILE_A'),b=route.request().url().includes('/search/PROFILE_B');
      if(route.request().url().includes('/search/FAIL'))return route.fulfill({status:404,json:{message_en:'No profile',message_te:'ప్రొఫైల్ లేదు'}});
      return route.fulfill({json:a?{profile:{full_name:'ISOLATED A',religion:'Christian'}}:b?{profile:{full_name:'ISOLATED B',religion:'Muslim'}}:{success:true,items:[]}});
    });
    await page.goto(localeHref('/biodata?id=PROFILE_A',lang));const canvas=page.locator('#biodata-canvas');
    await expect(canvas).toContainText('ISOLATED A');
    await page.getByRole('button',{name:te?'వివరాలను సవరించండి':'Edit details',exact:true}).click();
    await page.getByLabel(te?'చర్చి పేరు':'Church / parish',{exact:true}).fill('ISOLATED_A_CHURCH');
    await page.getByLabel(te?'సంప్రదింపు ఫోన్ నంబర్':'Contact phone number',{exact:true}).fill('0000000000');
    await page.getByLabel(te?'తండ్రి పేరు / వృత్తి':"Father's name / occupation",{exact:true}).fill('ISOLATED_A_PARENT');
    await page.locator('#biodata-profile-id').fill('PROFILE_B');
    await expect(canvas).toContainText('ID: PROFILE_A');await expect(canvas).not.toContainText('ID: PROFILE_B');
    await page.getByRole('button',{name:te?'వివరాలు నింపండి':'Load details',exact:true}).click();
    await expect(canvas).toContainText('ISOLATED B');await expect(canvas).toContainText('ID: PROFILE_B');
    await expect(page.getByLabel(te?'సంప్రదింపు ఫోన్ నంబర్':'Contact phone number',{exact:true})).toHaveValue('');
    await expect(page.getByLabel(te?'తండ్రి పేరు / వృత్తి':"Father's name / occupation",{exact:true})).toHaveValue('');
    await page.locator('#biodata-religion').selectOption('Christian');
    await expect(page.getByLabel(te?'చర్చి పేరు':'Church / parish',{exact:true})).toHaveValue('');
    await page.locator('#biodata-profile-id').fill('FAIL');await page.getByRole('button',{name:te?'వివరాలు నింపండి':'Load details',exact:true}).click();
    await expect(page.getByRole('status')).toContainText(te?'ప్రొఫైల్ లేదు':'No profile');
    await expect(canvas).toContainText('ISOLATED B');await expect(canvas).toContainText('ID: PROFILE_B');
    await expect(canvas).not.toContainText('ISOLATED_A_');await expect(canvas).not.toContainText('/search/FAIL');
    await page.screenshot({path:info.outputPath('provenance.png')});
  });

  test(`biodata ignores an outdated lookup after a different import ${lang}`,async({page})=>{
    const te=lang==='te';await page.addInitScript(l=>localStorage.setItem('tsap_lang',l),lang);
    let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve;});
    await page.route('**/api/**',async route=>{
      if(route.request().method()!=='GET')return route.abort();
      const url=route.request().url();
      if(url.includes('/search/SLOW')){await gate;return route.fulfill({json:{profile:{full_name:'OUTDATED ISOLATED',religion:'Hindu',gothram:'OUTDATED_GOTHRAM'}}});}
      return route.fulfill({json:url.includes('/search/CURRENT')?{profile:{full_name:'CURRENT ISOLATED',religion:'Muslim'}}:{success:true,items:[]}});
    });
    await page.goto(localeHref('/biodata',lang));const load=page.getByRole('button',{name:te?'వివరాలు నింపండి':'Load details',exact:true});
    await page.locator('#biodata-profile-id').fill('SLOW');const request=page.waitForRequest('**/api/search/SLOW');await load.click();await request;
    await page.locator('#biodata-profile-id').fill('CURRENT');await load.click();
    const canvas=page.locator('#biodata-canvas');await expect(canvas).toContainText('CURRENT ISOLATED');
    const response=page.waitForResponse('**/api/search/SLOW');release();await response;await page.waitForLoadState('networkidle');
    await expect(canvas).toContainText('CURRENT ISOLATED');await expect(canvas).toContainText('ID: CURRENT');await expect(canvas).not.toContainText('OUTDATED');
    await expect(page.locator('#biodata-religion')).toHaveValue('Muslim');await expect(load).toBeEnabled();
  });
}
