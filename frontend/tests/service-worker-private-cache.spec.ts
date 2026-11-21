import { test, expect } from '@playwright/test';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

test('actual worker purges old private bytes and never replays guarded media', async ({ page, context }) => {
 const worker = fs.readFileSync(path.join(process.cwd(), 'public/sw.js'));
 const server = http.createServer((request, response) => {
  const url = new URL(request.url || '/', 'http://fixture.invalid');
  if (url.pathname === '/sw.js') { response.setHeader('Content-Type', 'application/javascript'); response.end(worker); return; }
  if (url.pathname === '/icons/redirect.png') { response.writeHead(302, { Location: '/promo/private.png' }); response.end(); return; }
  if (url.pathname === '/icons/error.png') { response.writeHead(503); response.end('FICTIONAL ERROR'); return; }
  if (/^\/(voice|photos|cards|api)\//.test(url.pathname) || url.pathname === '/me' || url.pathname === '/promo/private.png') {
   response.setHeader('Cache-Control', 'private, no-store'); response.end('FICTIONAL PRIVATE BYTES'); return;
  }
  response.setHeader('Content-Type', url.pathname.startsWith('/icons/') ? 'image/png' : 'text/html');
  response.end(url.pathname === '/offline' ? '<!doctype html><h1>Fictional offline shell</h1>' : '<!doctype html><h1>Fictional public shell</h1>');
 });
 await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
 const address = server.address(); if (!address || typeof address === 'string') throw new Error('Fixture server did not start');
 const base = `http://127.0.0.1:${address.port}`;
 try {
  await page.goto(base);
  await page.evaluate(async () => {
   await (await caches.open('mv-v7-2026-09-round9')).put('/voice/fictional-old.mp3', new Response('FICTIONAL LEGACY PRIVATE BYTES'));
   await (await caches.open('unrelated-cache')).put('/fixture', new Response('FICTIONAL UNRELATED'));
   await navigator.serviceWorker.register('/sw.js'); await navigator.serviceWorker.ready;
   if (!navigator.serviceWorker.controller) await new Promise(resolve => navigator.serviceWorker.addEventListener('controllerchange', resolve, {once: true}));
  });
  const cacheNames = await page.evaluate(() => caches.keys());
  expect(cacheNames).not.toContain('mv-v7-2026-09-round9'); expect(cacheNames).toContain('unrelated-cache');
  const guarded = ['/voice/fictional.mp3', '/photos/fictional.jpg', '/cards/fictional.png', '/api/private', '/me', '/promo/private.png'];
  for (const route of guarded) {
   const result = await page.evaluate(async route => { const r = await fetch(route); return { body: await r.text(), stored: !!await caches.match(route) }; }, route);
   expect(result).toEqual({body: 'FICTIONAL PRIVATE BYTES', stored: false});
  }
  for (const route of ['/icons/error.png', '/icons/redirect.png']) {
   await page.evaluate(route => fetch(route).then(r => r.text()), route);
   expect(await page.evaluate(async route => !!await caches.match(route), route)).toBe(false);
  }
  await page.evaluate(() => fetch('/icons/fixture.png').then(r => r.text()));
  expect(await page.evaluate(async () => !!await caches.match('/icons/fixture.png'))).toBe(true);
  await expect.poll(() => page.evaluate(async () => !!await caches.match('/offline'))).toBe(true);
  await context.setOffline(true);
  for (const route of guarded) expect(await page.evaluate(async route => { try { await fetch(route); return false; } catch { return true; } }, route)).toBe(true);
  await page.goto(base + '/never-cached-account-page');
  await expect(page.locator('h1')).toHaveText('Fictional offline shell');
  expect(await page.evaluate(async () => (await fetch('/icons/fixture.png')).ok)).toBe(true);
  expect(await page.evaluate(async () => { try { await fetch('/icons/never-cached.js'); return false; } catch { return true; } })).toBe(true);
 } finally { await context.setOffline(false); await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
});
