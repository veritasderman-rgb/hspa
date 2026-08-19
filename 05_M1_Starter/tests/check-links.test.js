import test from 'node:test';
import assert from 'node:assert/strict';
import { classify, FATAL } from '../scripts/check-links.js';

// Regrese k issue #1003: mrtvá doména a doména blokovaná politikou prostředí
// vracejí přes curl shodně kód 000. Skript je musí rozlišit přes DNS — jinak
// se „nedalo ověřit" tiše čte jako „ověřeno OK".
//
// Testy jsou ZÁMĚRNĚ bez sítě: HTTP i DNS se injektují. Test suite běží
// v CI (deploy-check.yml) a nesmí padat na cizím výpadku nebo na tom, že
// runner nemá ven. Živý sken se dělá přes `npm run check:links`.

const http = code => async () => code;
const dnsFake = res => async () => res;

test('2xx je ok', async () => {
  assert.equal((await classify('https://a.cz/', { http: http(200) })).status, 'ok');
});

test('401/403 je ok — bot-block, doména žije', async () => {
  for (const c of [401, 403]) {
    const r = await classify('https://a.cz/', { http: http(c) });
    assert.equal(r.status, 'ok', `kód ${c}`);
  }
});

test('404 a 410 jsou http_err a jsou fatální', async () => {
  for (const c of [404, 410]) {
    const r = await classify('https://a.cz/', { http: http(c) });
    assert.equal(r.status, 'http_err');
    assert.ok(FATAL.has(r.status));
  }
});

test('429 NENÍ rozbitý odkaz — jen jsme přiškrceni', async () => {
  const r = await classify('https://a.cz/', { http: http(429) });
  assert.equal(r.status, 'rate_limited');
  assert.ok(!FATAL.has(r.status), '429 nesmí shazovat běh');
});

test('5xx je server_err, ne rozbitý odkaz', async () => {
  const r = await classify('https://a.cz/', { http: http(503) });
  assert.equal(r.status, 'server_err');
  assert.ok(!FATAL.has(r.status));
});

test('neobvyklý kód (451) se nezařadí mezi rozbité', async () => {
  const r = await classify('https://a.cz/', { http: http(451) });
  assert.equal(r.status, 'other');
  assert.ok(!FATAL.has(r.status));
});

test('kód 0 + ENOTFOUND = dead (fatální)', async () => {
  const r = await classify('https://a.cz/', { http: http(0), dnsLookup: dnsFake('no') });
  assert.equal(r.status, 'dead');
  assert.ok(FATAL.has(r.status));
});

test('kód 0 + živé DNS = blocked, NIKDY dead', async () => {
  const r = await classify('https://nrpzs.uzis.cz/', { http: http(0), dnsLookup: dnsFake('yes') });
  assert.equal(r.status, 'blocked');
  assert.match(r.note, /NEověřeno/);
  assert.ok(!FATAL.has(r.status), 'blokovaný odkaz není chyba obsahu');
});

test('kód 0 + přechodné selhání DNS = unknown, ne dead', async () => {
  // EAI_AGAIN: resolver zlobí. Tvrdit „doména neexistuje" by bylo nepravdivé.
  const r = await classify('https://a.cz/', { http: http(0), dnsLookup: dnsFake('unknown') });
  assert.equal(r.status, 'unknown');
  assert.ok(!FATAL.has(r.status));
});

test('neplatné URL nespadne', async () => {
  assert.equal((await classify('nikoliv-url')).status, 'invalid');
});

test('fatální jsou pouze http_err a dead', () => {
  assert.deepEqual([...FATAL].sort(), ['dead', 'http_err']);
});
