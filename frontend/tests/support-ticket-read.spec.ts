import { test, expect } from '@playwright/test';
import fs from 'node:fs';

for (const role of ['member', 'owner']) for (const lang of ['en', 'te']) for (const width of [320, 390, 1280]) {
  test(`support read states ${role} ${lang} ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 920 });
    await page.addInitScript(l => {
      localStorage.setItem('tsap_lang', l);
      localStorage.setItem('tsap_id', 'UI_ONLY');
    }, lang);
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(String(error)));
    let state = 'http', reads = 0;
    let releaseRead: (() => void) | undefined;
    const ticket = { ticket_id: 'TKT_FIXTURE', tsap_id: 'UI_ONLY', category: 'privacy_dpdp', subject: 'Fictional existing ticket', status: 'open', messages: [{ sender: 'member', text: 'Fictional support content' }] };
    await page.route('**/api/**', async route => {
      const path = new URL(route.request().url()).pathname;
      if (path === (role === 'member' ? '/api/support/tickets/UI_ONLY' : '/api/admin/support/tickets')) {
        reads++;
        if (state === 'delayed') await new Promise<void>(resolve => { releaseRead = resolve; });
        if (state === 'network') return route.abort('failed');
        if (state === 'http' || state === 'denied') return route.fulfill({ status: state === 'http' ? 503 : 403, json: { detail: 'Synthetic unavailable read' } });
        if (state === 'html') return route.fulfill({ contentType: 'text/html', body: '<h1>Synthetic proxy response</h1>' });
        if (state === 'malformed') return route.fulfill({ json: { success: true, tickets: {} } });
        if (state === 'bad-record') return route.fulfill({ json: { success: true, tickets: [{ ticket_id: 'TKT_BROKEN', messages: [null] }] } });
        if (state === 'false-success') return route.fulfill({ json: { success: false, tickets: [] } });
        return route.fulfill({ json: { success: true, tickets: state === 'empty' ? [] : [ticket] } });
      }
      if (path === '/api/control/me') return route.fulfill({ json: { role: 'owner', username: 'Fictional', csrf: 'fixture' } });
      if (path === '/api/control/analytics') return route.fulfill({ json: { role: 'owner', totals: {}, signups: { series: [] }, top_castes: [], top_states: [], top_districts: [] } });
      if (path === '/api/admin/identity/reconcile') return route.fulfill({ json: { success: true, json_count: 0, sql_count: 0, active_sessions: 0, missing_in_sql_count: 0, parity_ok: true } });
      if (path === '/api/auth/verify') return route.fulfill({ json: { success: true, valid: true, tsap_id: 'UI_ONLY' } });
      if (path === '/api/profile/UI_ONLY') return route.fulfill({ json: { tsap_id: 'UI_ONLY', full_name: 'Fictional member', credits: 3 } });
      return route.fulfill({ json: { success: true, items: [], tickets: [], appeals: [], appointments: [], refunds: [], holds: [], flags: {}, profiles: [], stories: [], sent: [], received: [], totals: {} } });
    });
    const open = async () => {
      await page.goto(role === 'member' ? '/me' : '/control', { waitUntil: 'domcontentloaded' });
      await page.getByRole('button', { name: role === 'member' ? (lang === 'en' ? 'Support' : 'సపోర్ట్ టికెట్లు') : (lang === 'en' ? '🧰 Data tools & daily matches' : '🧰 డేటా టూల్స్ & డైలీ మ్యాచ్‌లు'), exact: true }).click();
    };
    const errorText = role === 'member'
      ? (lang === 'en' ? 'Your tickets could not be loaded. This is not an empty result. Reload before submitting again.' : 'మీ టికెట్లు లోడ్ కాలేదు. ఇది ఖాళీ ఫలితం కాదు. మళ్లీ పంపే ముందు రీలోడ్ చేయండి.')
      : (lang === 'en' ? 'Support tickets could not be loaded. This is not an empty queue. Please retry.' : 'సపోర్ట్ టికెట్లు లోడ్ కాలేదు. ఇది ఖాళీ క్యూ కాదు. మళ్లీ ప్రయత్నించండి.');
    const emptyText = role === 'member'
      ? (lang === 'en' ? 'No support tickets in your account.' : 'మీ ఖాతాలో సపోర్ట్ టికెట్లు లేవు.')
      : (lang === 'en' ? 'No open support tickets ✅' : 'ఓపెన్ సపోర్ట్ టికెట్లు లేవు ✅');
    const retry = page.getByRole('button', { name: lang === 'en' ? 'Retry tickets' : 'టికెట్లు మళ్లీ లోడ్ చేయండి', exact: true });
    const send = page.getByRole('button', { name: lang === 'en' ? 'Submit Support Ticket' : 'టికెట్ పంపండి', exact: true });
    await open();
    for (const fault of ['http', 'network', 'denied', 'html', 'malformed', 'bad-record', 'false-success']) {
      if (fault !== 'http') { state = fault; await retry.click(); }
      await expect(page.getByRole('alert').filter({ hasText: errorText })).toBeVisible();
      await expect(page.getByText(emptyText, { exact: true })).toHaveCount(0);
      await expect(page.getByText('Fictional existing ticket', { exact: false })).toHaveCount(0);
      if (role === 'member') await expect(send).toBeDisabled();
    }
    fs.mkdirSync('artifacts/support-read', { recursive: true });
    await page.getByText(errorText, { exact: true }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: `artifacts/support-read/error-${role}-${lang}-${width}.png` });
    const subject = page.getByRole('textbox', { name: lang === 'en' ? 'Ticket subject' : 'టికెట్ విషయం', exact: true });
    const details = page.getByRole('textbox', { name: lang === 'en' ? 'Ticket details' : 'టికెట్ వివరాలు', exact: true });
    if (role === 'member') {
      await subject.fill('Unsaved support draft');
      await details.fill('Keep these unsaved support details during retry.');
    }
    const before = reads;
    state = 'delayed'; await retry.click();
    await expect(page.getByRole('status').filter({ hasText: role === 'member'
      ? (lang === 'en' ? 'Loading your tickets…' : 'మీ టికెట్లు లోడ్ అవుతున్నాయి…')
      : (lang === 'en' ? 'Loading support tickets…' : 'సపోర్ట్ టికెట్లు లోడ్ అవుతున్నాయి…') })).toBeVisible();
    await expect(page.getByText(emptyText, { exact: true })).toHaveCount(0);
    if (role === 'member') await expect(send).toBeDisabled();
    expect(releaseRead).toBeDefined();
    state = 'ok'; releaseRead!();
    await expect(page.getByText('Fictional existing ticket', { exact: false })).toBeVisible();
    await expect(retry).toHaveCount(0);
    expect(reads).toBe(before + 1);
    if (role === 'member') {
      await expect(send).toBeEnabled();
      await expect(subject).toHaveValue('Unsaved support draft');
      await expect(details).toHaveValue('Keep these unsaved support details during retry.');
    }
    state = 'network'; await open();
    await expect(page.getByText(errorText, { exact: true })).toBeVisible();
    await expect(page.getByText('Fictional existing ticket', { exact: false })).toHaveCount(0);
    state = 'empty'; await retry.click();
    await expect(page.getByText(emptyText, { exact: true })).toBeVisible();
    await expect(page.getByText(errorText, { exact: true })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    expect(errors).toEqual([]);
  });
}
