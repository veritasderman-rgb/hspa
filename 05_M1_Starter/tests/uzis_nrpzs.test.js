// Testy pro ÚZIS NRPZS fetcher.
// Pokrývají: agregaci, happy path s mock fetchem, retry s exponential backoff,
// neretriabilní 4xx, cache TTL.
//
// Spuštění: npm test

import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  aggregateProviders,
  extractKraj,
  extractObory,
  fetchNrpzs,
} from '../ingest/fetchers/uzis_nrpzs.js';
import { fetchWithRetry, HttpError } from '../ingest/lib/http.js';
import { cachePath, ensureCacheDir } from '../ingest/lib/cache.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function cleanCache() {
  ensureCacheDir();
  for (const name of ['nrpzs_raw.json', 'nrpzs_aggregated.json']) {
    const p = cachePath(name);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
}

function mockResponse({ status = 200, json } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() { return json; },
    async text() { return JSON.stringify(json); },
  };
}

beforeEach(() => cleanCache());

// ---------- Agregace ----------

test('extractKraj: rozumí různým variantám pojmenování', () => {
  assert.deepEqual(extractKraj({ kraj_nazev: 'Praha', kraj_kod: 'CZ010' }),
    { code: 'CZ010', name: 'Praha' });
  assert.deepEqual(extractKraj({ kraj: { nazev: 'Brno', kod: 'CZ064' } }),
    { code: 'CZ064', name: 'Brno' });
  assert.deepEqual(extractKraj({}), { code: null, name: null });
});

test('extractObory: vrací unikátní seznam, fallback "nezarazeno"', () => {
  assert.deepEqual(extractObory({ obory: ['Kardiologie', 'Kardiologie', 'Neurologie'] }),
    ['Kardiologie', 'Neurologie']);
  assert.deepEqual(extractObory({ oddeleni: [{ obor: 'Chirurgie' }, { obor: 'Chirurgie' }] }),
    ['Chirurgie']);
  assert.deepEqual(extractObory({}), ['nezarazeno']);
});

test('aggregateProviders: spočítá kraje, obory a pivot kraj×obor', () => {
  const items = [
    { kraj_nazev: 'Praha', obory: ['Kardiologie'] },
    { kraj_nazev: 'Praha', obory: ['Neurologie', 'Kardiologie'] },
    { kraj_nazev: 'Brno', obory: ['Kardiologie'] },
    { obory: ['Chirurgie'] }, // bez kraje
  ];
  const agg = aggregateProviders(items);
  assert.equal(agg.total, 4);
  assert.equal(agg.by_kraj['Praha'], 2);
  assert.equal(agg.by_kraj['Brno'], 1);
  assert.equal(agg.by_kraj['neznámý'], 1);
  assert.equal(agg.unknown_kraj, 1);
  assert.equal(agg.by_obor['Kardiologie'], 3);
  assert.equal(agg.by_obor['Neurologie'], 1);
  assert.equal(agg.by_kraj_obor['Praha']['Kardiologie'], 2);
  assert.equal(agg.by_kraj_obor['Praha']['Neurologie'], 1);
});

// ---------- Happy path ----------

test('fetchNrpzs: happy path stáhne, agreguje a zapíše cache', async () => {
  const items = [
    { kraj_nazev: 'Praha', obory: ['Kardiologie'] },
    { kraj_nazev: 'Brno', obory: ['Neurologie'] },
  ];
  let calls = 0;
  const fetchImpl = async (_url, _opts) => {
    calls++;
    return mockResponse({ status: 200, json: items });
  };

  const result = await fetchNrpzs({ fetchImpl });
  assert.equal(calls, 1);
  assert.equal(result.fromCache, false);
  assert.equal(result.aggregated.total, 2);
  assert.ok(fs.existsSync(cachePath('nrpzs_raw.json')));
  assert.ok(fs.existsSync(cachePath('nrpzs_aggregated.json')));

  const onDisk = JSON.parse(fs.readFileSync(cachePath('nrpzs_aggregated.json'), 'utf8'));
  assert.equal(onDisk.by_kraj['Praha'], 1);
  assert.ok(onDisk.generated_at);
});

test('fetchNrpzs: druhé volání použije čerstvý cache, fetch se nezavolá', async () => {
  const items = [{ kraj_nazev: 'Praha', obory: ['Kardiologie'] }];
  let calls = 0;
  const fetchImpl = async () => { calls++; return mockResponse({ status: 200, json: items }); };

  await fetchNrpzs({ fetchImpl });
  const second = await fetchNrpzs({ fetchImpl });
  assert.equal(calls, 1);
  assert.equal(second.fromCache, true);
});

test('fetchNrpzs: force=true ignoruje cache a fetchne znovu', async () => {
  const items = [{ kraj_nazev: 'Praha', obory: ['Kardiologie'] }];
  let calls = 0;
  const fetchImpl = async () => { calls++; return mockResponse({ status: 200, json: items }); };

  await fetchNrpzs({ fetchImpl });
  await fetchNrpzs({ fetchImpl, force: true });
  assert.equal(calls, 2);
});

// ---------- Retry ----------

test('fetchWithRetry: retry při 503 a uspěje na 3. pokus', async () => {
  const responses = [
    mockResponse({ status: 503 }),
    mockResponse({ status: 503 }),
    mockResponse({ status: 200, json: { ok: true } }),
  ];
  let i = 0;
  const fetchImpl = async () => responses[i++];
  const sleeps = [];
  const sleepImpl = async (ms) => { sleeps.push(ms); };

  const data = await fetchWithRetry('https://example.test/x', { fetchImpl, sleepImpl });
  assert.deepEqual(data, { ok: true });
  assert.equal(i, 3);
  assert.deepEqual(sleeps, [2000, 4000]); // 2 backoffy mezi 3 pokusy
});

test('fetchWithRetry: 404 se nezkouší znovu', async () => {
  let i = 0;
  const fetchImpl = async () => { i++; return mockResponse({ status: 404, json: {} }); };

  await assert.rejects(
    () => fetchWithRetry('https://example.test/x', { fetchImpl, sleepImpl: async () => {} }),
    err => err instanceof HttpError && err.status === 404
  );
  assert.equal(i, 1);
});

test('fetchWithRetry: po max_attempts selhání hodí HttpError', async () => {
  const fetchImpl = async () => mockResponse({ status: 500 });
  await assert.rejects(
    () => fetchWithRetry('https://example.test/x', { fetchImpl, sleepImpl: async () => {} }),
    err => err instanceof HttpError && err.status === 500 && err.attempts === 3
  );
});
