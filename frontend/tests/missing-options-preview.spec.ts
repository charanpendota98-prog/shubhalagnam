import {localeHref} from "./locale-href";
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
const out = 'artifacts/mv-missing-options';
fs.mkdirSync(out, { recursive: true });
const profile = { tsap_id: 'DEMO-OPT-A', full_name: 'Sample member', age: 28, height: "5'4\"", gender: 'Bride', religion: 'Hindu', caste: 'Reddy', education: 'B.Tech', job: 'Software', district: 'Hyderabad', state: 'TS', marital_status: 'Pelli Kaledu', salary: '10 LPA', has_photo: false };
for (const lang of ['en', 'te'])
  for (const width of [320, 390, 1280])
    test(`extra options work ${lang} ${width}`, async ({ page }) => {
      const errors: string[] = [];
      const writes: string[] = [];
      const outside: string[] = [];
      const queries: string[] = [];
      page.on('pageerror', (e) => errors.push(String(e)));
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript((l) => localStorage.setItem('tsap_lang', l), lang);
      await page.route('**/*', (r) => {
        const u = new URL(r.request().url());
        if (u.hostname !== '127.0.0.1' && u.hostname !== 'localhost') { outside.push(u.href); return r.abort(); }
        if (!u.pathname.startsWith('/api/')) return r.continue();
        if (r.request().method() !== 'GET') { writes.push(r.request().method() + u.pathname); return r.fulfill({ json: {} }); }
        if (u.pathname === '/api/search') {
          queries.push(u.search);
          const note = u.searchParams.get('skip_same_gothram') ? { requested: true, applied: false, reason: 'own_gothram_missing' } : { requested: false, applied: false, reason: '' };
          return r.fulfill({ json: { total: 1, count: 1, results: [profile], gothram_exclusion: note } });
        }
        return r.fulfill({ json: { success: true, items: [], profiles: [], total: 0 } });
      });
      await page.goto(localeHref('/matches',lang));
      await expect(page.locator('.matches-profile-card')).toHaveCount(1);
      const mobile = width < 1024;
      if (mobile) await page.getByRole('button', { name: lang === 'te' ? /🌪️ ఫిల్టర్లు/ : /🌪️ Filters/ }).click();
      const L = (en: string, te: string) => (lang === 'te' ? te : en);
      const scope = mobile ? page.locator('div.fixed').filter({ has: page.getByRole('button', { name: /Apply filters|ఫిల్టర్లు వర్తింపజేయండి/ }) }).last() : page;
      if (mobile) await scope.getByRole('button', { name: L('Place', 'Place'), exact: true }).click();
      await scope.getByLabel(L('City or town', 'నగరం / ఊరు'),{exact:true}).or(scope.getByLabel(L('City', 'నగరం'),{exact:true})).first().fill('Pune');
      await scope.getByLabel(L('Country', 'దేశం'),{exact:true}).first().fill('India');
      if (mobile) await scope.getByRole('button', { name: L('Basics', 'ప్రాథమిక'), exact: true }).click();
      await scope.getByLabel(L('Mother tongue', 'మాతృభాష')).first().selectOption('Hindi');
      await scope.getByLabel(L('Family type', 'కుటుంబ రకం')).first().selectOption('Joint');
      await scope.getByLabel(L('Profile completeness', 'ప్రొఫైల్ పూర్తి శాతం')).first().selectOption('70');
      const ver = scope.getByLabel(mobile ? L('Verification record on file', 'నమోదైన ధృవీకరణ రికార్డు') : L('Verification badge', 'ధృవీకరణ స్థాయి')).first();
      await ver.selectOption('photo,id');
      await scope.getByRole('checkbox', { name: L('Hide profiles I have already viewed', 'నేను ఇప్పటికే చూసిన ప్రొఫైల్‌లను దాచండి') }).check();
      await scope.getByRole('checkbox', { name: L('Hide profiles I have a request with', 'నాతో రిక్వెస్ట్ ఉన్న ప్రొఫైల్‌లను దాచండి') }).check();
      await page.screenshot({ path: `${out}/${lang}-${width}-options.png` });
      if (mobile) await scope.getByRole('button', { name: L('Astrology', 'జ్యోతిషం'), exact: true }).click();
      await scope.getByRole('checkbox', { name: L('Skip profiles with the same gothram as mine', 'నా గోత్రంతో సమానమైన ప్రొఫైల్‌లను తప్పించండి') }).check();
      await page.screenshot({ path: `${out}/${lang}-${width}-gothram.png` });
      if (mobile) await page.getByRole('button', { name: /Apply filters|ఫిల్టర్లు వర్తింపజేయండి/ }).click();
      await expect.poll(() => queries.at(-1) || '').toContain('skip_same_gothram=true');
      const q = new URLSearchParams(queries.at(-1));
      expect(q.get('city')).toBe('Pune');
      expect(q.get('country')).toBe('India');
      expect(q.get('mother_tongue')).toBe('Hindi');
      expect(q.get('family_type')).toBe('Joint');
      expect(q.get('min_completeness')).toBe('70');
      expect(q.get('verification_level')).toBe('photo,id');
      expect(q.get('exclude_viewed')).toBe('true');
      expect(q.get('exclude_interested')).toBe('true');
      await expect(page.getByRole('status').filter({ hasText: L('no gothram filled in', 'గోత్రం నమోదు కాలేదు') })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
      await page.screenshot({ path: `${out}/${lang}-${width}-result.png` });
      expect(errors).toEqual([]);
      expect(writes).toEqual([]);
      expect(outside).toEqual([]);
    });
