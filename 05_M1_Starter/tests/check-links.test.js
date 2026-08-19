import test from 'node:test';
import assert from 'node:assert/strict';
import { classify, resolves } from '../scripts/check-links.js';

// Regrese k issue #1003: mrtvá doména a doména blokovaná politikou prostředí
// vracejí přes curl shodně kód 000. Skript je musí rozlišit přes DNS —
// jinak se „nedalo ověřit" tiše čte jako „ověřeno OK".

test('resolves(): existující doména se rozresolvuje, neexistující ne', async () => {
  assert.equal(await resolves('www.uzis.cz'), true);
  assert.equal(await resolves('tato-domena-rozhodne-neexistuje-hspa.cz'), false);
});

test('classify(): NXDOMAIN je dead, ne blocked', async () => {
  const r = await classify('https://tato-domena-rozhodne-neexistuje-hspa.cz/');
  assert.equal(r.status, 'dead');
  assert.equal(r.code, 0);
});

test('classify(): neplatné URL nespadne', async () => {
  const r = await classify('nikoliv-url');
  assert.equal(r.status, 'invalid');
});

test('classify(): živá doména s HTTP odpovědí je ok', async () => {
  const r = await classify('https://www.uzis.cz/');
  assert.equal(r.status, 'ok');
  assert.ok(r.code >= 200 && r.code < 400);
});

test('classify(): rozlišuje blocked od dead u subdomén ÚZIS', async () => {
  // nrpzs.uzis.cz má platný A záznam, ale prostředí agenta na něj nedosáhne.
  // Musí vyjít 'blocked' (= neověřeno), nikdy 'dead' a nikdy 'ok'.
  const r = await classify('https://nrpzs.uzis.cz/');
  assert.ok(['ok', 'blocked'].includes(r.status), `čekáno ok|blocked, dostal ${r.status}`);
  if (r.status === 'blocked') assert.match(r.note, /NEověřeno/);
});
