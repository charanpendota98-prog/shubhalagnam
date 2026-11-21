import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source = fs.readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');
const origin = 'https://fixture.invalid';
function fixture() {
  const listeners = {}, buckets = new Map();
  const caches = {
    async keys() { return [...buckets.keys()]; },
    async delete(name) { return buckets.delete(name); },
    async open(name) {
      if (!buckets.has(name)) buckets.set(name, new Map());
      const values = buckets.get(name);
      const key = r => typeof r === 'string' ? r : r.url;
      return {
        async put(r, response) { values.set(key(r), response.clone()); },
        async match(r) { return values.get(key(r))?.clone(); },
        async keys() { return [...values.keys()].map(url => new Request(url)); },
        async delete(r) { return values.delete(key(r)); },
      };
    },
  };
  const context = vm.createContext({ URL, Request, Response, Set, Promise, caches,
    fetch: async () => { throw new Error('Fictional network unavailable'); },
    self: { location: { origin }, clients: { claim: async () => {} }, skipWaiting: async () => {},
      addEventListener: (name, fn) => { listeners[name] = fn; } },
  });
  vm.runInContext(source + '\nthis.policy = {mayStore, VERSION};', context);
  return { ...context.policy, caches, listeners };
}
const req = (path, extra = {}) => ({ url: origin + path, method: 'GET', mode: 'cors', ...extra });
for (const path of ['/voice/fixture.mp3', '/photos/fixture.jpg', '/cards/fixture.png', '/api/private', '/api', '/review/FICTIONAL', '/me', '/requests', '/search/FICTIONAL', '/docs', '/openapi.json', '/matches?_rsc=fixture']) {
  test(`does not store protected or non-shell route ${path}`, () => {
    const f = fixture(); assert.equal(f.mayStore(req(path), new Response('fictional bytes')), false);
    let intercepted = false; f.listeners.fetch({ request: req(path), respondWith: () => { intercepted = true; } });
    assert.equal(intercepted, false);
  });
}
for (const policy of ['private, no-store', 'no-store', 'max-age=0, private', 'PRIVATE="fixture"']) {
  test(`honors response cache policy ${policy}`, () => assert.equal(fixture().mayStore(req('/matches'), new Response('fixture', { headers: { 'Cache-Control': policy } })), false));
}
for (const path of ['/', '/matches', '/register', '/offline', '/icons/icon-192.png', '/_next/static/chunk.js', '/editorial/fixture.webp', '/promo/fixture.jpg']) {
  test(`allows successful public shell or static asset ${path}`, () => assert.equal(fixture().mayStore(req(path), new Response('fixture')), true));
}
test('does not cache errors, cross-origin requests or writes', () => {
  const f = fixture();
  assert.equal(f.mayStore(req('/offline'), new Response('fixture', { status: 503 })), false);
  assert.equal(f.mayStore(req('/offline', { url: 'https://other.invalid/offline' }), new Response('fixture')), false);
  assert.equal(f.mayStore(req('/offline', { method: 'POST' }), new Response('fixture')), false);
});
test('activation removes legacy member bytes and current invalid entries, but preserves unrelated caches', async () => {
  const f = fixture();
  await (await f.caches.open('mv-v7-2026-09-round9')).put(req('/voice/fixture.mp3'), new Response('fictional private bytes'));
  const current = await f.caches.open(f.VERSION);
  await current.put(req('/voice/fixture.mp3'), new Response('fictional private bytes'));
  await current.put(req('/matches'), new Response('fixture', { headers: { 'Cache-Control': 'private, no-store' } }));
  await current.put(req('/offline'), new Response('public offline shell'));
  await (await f.caches.open('unrelated-cache')).put(req('/fixture'), new Response('unrelated'));
  let done; f.listeners.activate({ waitUntil: p => { done = p; } }); await done;
  assert.deepEqual(await f.caches.keys(), [f.VERSION, 'unrelated-cache']);
  assert.equal(await current.match(req('/voice/fixture.mp3')), undefined);
  assert.equal(await current.match(req('/matches')), undefined);
  assert.equal(await (await current.match(req('/offline'))).text(), 'public offline shell');
});
test('offline navigation uses only managed safe shell, never an unrelated cached member page', async () => {
  const f = fixture();
  await (await f.caches.open('unrelated-cache')).put(req('/me'), new Response('fictional private account'));
  await (await f.caches.open(f.VERSION)).put(req('/offline'), new Response('public offline shell'));
  let response; f.listeners.fetch({ request: req('/me', { mode: 'navigate' }), respondWith: p => { response = p; } });
  assert.equal(await (await response).text(), 'public offline shell');
});
test('missing static asset does not receive an HTML offline page', async () => {
  const f = fixture(); let response;
  f.listeners.fetch({ request: req('/_next/static/missing.js'), respondWith: p => { response = p; } });
  await assert.rejects(response, /Fictional network unavailable/);
});
