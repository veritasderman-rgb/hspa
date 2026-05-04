// Testy pro ČSÚ DataStat fetcher (M3).
// Pokrývají normalizaci JSON i CSV, primary→fallback flow a cache.

import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  normalizeDataStat,
  normalizeCsv,
  fetchDataset,
  fetchCsu,
} from '../ingest/fetchers/csu.js';
import { cachePath, ensureCacheDir } from '../ingest/lib/cache.js';

function cleanCsuCache() {
  ensureCacheDir();
  const dir = cachePath('.');
  for (const f of fs.readdirSync(dir)) {
    if (f.startsWith('csu_') && f.endsWith('.json')) {
      fs.unlinkSync(cachePath(f));
    }
  }
}

function jsonResponse(json, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() { return json; },
    async text() { return typeof json === 'string' ? json : JSON.stringify(json); },
  };
}

function textResponse(text, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() { throw new Error('not json'); },
    async text() { return text; },
  };
}

const FAKE_DS = {
  id: 'test_ds',
  name: 'Test dataset',
  primary: { kind: 'datastat', url: 'https://example.test/api/x' },
  fallback: {
    kind: 'csv',
    url: 'https://example.test/x.csv',
    mapping: { year: 'rok', region: 'uzemi_kod', sex: 'pohlavi_kod', value: 'hodnota' },
    filter: { sex: 'T', region: 'CZ0' },
  },
};

beforeEach(() => cleanCsuCache());

// ---------- normalizeDataStat ----------

test('normalizeDataStat: plochý array s českými klíči', () => {
  const raw = [
    { rok: 2023, uzemi_kod: 'CZ0', pohlavi_kod: 'T', hodnota: 79.5 },
    { rok: 2024, uzemi_kod: 'CZ0', pohlavi_kod: 'T', hodnota: 79.9 },
  ];
  const out = normalizeDataStat(raw);
  assert.equal(out.length, 2);
  assert.deepEqual(out[1], { year: 2024, region: 'CZ0', sex: 'T', age: null, value: 79.9 });
});

test('normalizeDataStat: obálka {data: [...]}', () => {
  const raw = { data: [{ rok: 2024, hodnota: 12.3 }] };
  const out = normalizeDataStat(raw);
  assert.equal(out.length, 1);
  assert.equal(out[0].value, 12.3);
});

test('normalizeDataStat: JSON-stat 2.0', () => {
  const raw = {
    id: ['cas', 'pohlavi'],
    size: [2, 2],
    dimension: {
      cas: { category: { index: { '2023': 0, '2024': 1 } } },
      pohlavi: { category: { index: { 'M': 0, 'Z': 1 } } },
    },
    value: [76.0, 82.0, 76.5, 82.5],
  };
  const out = normalizeDataStat(raw);
  assert.equal(out.length, 4);
  assert.deepEqual(out[0], { year: 2023, region: null, sex: 'M', age: null, value: 76.0 });
  assert.deepEqual(out[3], { year: 2024, region: null, sex: 'Z', age: null, value: 82.5 });
});

test('normalizeDataStat: prázdná data → []', () => {
  assert.deepEqual(normalizeDataStat(null), []);
  assert.deepEqual(normalizeDataStat({}), []);
});

// ---------- normalizeCsv ----------

test('normalizeCsv: respektuje filter', () => {
  const csv = [
    'rok,uzemi_kod,pohlavi_kod,hodnota',
    '2023,CZ0,T,79.5',
    '2023,CZ0,M,76.0',
    '2023,CZ010,T,80.5',
  ].join('\n');
  const out = normalizeCsv(csv, FAKE_DS.fallback);
  assert.equal(out.length, 1);
  assert.equal(out[0].value, 79.5);
});

test('normalizeCsv: vyfiltruje řádky s prázdnou hodnotou', () => {
  const csv = 'rok,uzemi_kod,pohlavi_kod,hodnota\n2023,CZ0,T,\n2024,CZ0,T,79.9';
  const out = normalizeCsv(csv, FAKE_DS.fallback);
  assert.equal(out.length, 1);
  assert.equal(out[0].year, 2024);
});

// ---------- fetchDataset: primary success ----------

test('fetchDataset: primary úspěch zapíše cache zdroj=datastat', async () => {
  const fetchImpl = async () => jsonResponse([{ rok: 2024, uzemi_kod: 'CZ0', pohlavi_kod: 'T', hodnota: 79.9 }]);
  const result = await fetchDataset(FAKE_DS, { fetchImpl, sleepImpl: async () => {} });
  assert.equal(result.source, 'datastat');
  assert.equal(result.observations.length, 1);
  const cached = JSON.parse(fs.readFileSync(cachePath('csu_test_ds.json'), 'utf8'));
  assert.equal(cached.source, 'datastat');
});

// ---------- fetchDataset: primary fail → fallback ----------

test('fetchDataset: 500 na primary spustí CSV fallback', async () => {
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(url);
    if (url.includes('/api/')) return jsonResponse({}, 500);
    return textResponse('rok,uzemi_kod,pohlavi_kod,hodnota\n2024,CZ0,T,79.9');
  };
  const result = await fetchDataset(FAKE_DS, { fetchImpl, sleepImpl: async () => {} });
  assert.equal(result.source, 'csv');
  assert.equal(result.observations.length, 1);
  assert.equal(result.observations[0].value, 79.9);
  // primary se zkouší 3× (retry), pak fallback 1×
  assert.equal(calls.filter(u => u.includes('/api/')).length, 3);
  assert.equal(calls.filter(u => u.endsWith('.csv')).length, 1);
});

test('fetchDataset: prázdná primary odpověď → fallback', async () => {
  const fetchImpl = async (url) => {
    if (url.includes('/api/')) return jsonResponse({ data: [] });
    return textResponse('rok,uzemi_kod,pohlavi_kod,hodnota\n2024,CZ0,T,79.9');
  };
  const result = await fetchDataset(FAKE_DS, { fetchImpl, sleepImpl: async () => {} });
  assert.equal(result.source, 'csv');
});

// ---------- fetchDataset: cache ----------

test('fetchDataset: druhé volání použije cache', async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls++;
    return jsonResponse([{ rok: 2024, uzemi_kod: 'CZ0', pohlavi_kod: 'T', hodnota: 79.9 }]);
  };
  await fetchDataset(FAKE_DS, { fetchImpl, sleepImpl: async () => {} });
  const second = await fetchDataset(FAKE_DS, { fetchImpl, sleepImpl: async () => {} });
  assert.equal(calls, 1);
  assert.equal(second.source, 'cache');
});

// ---------- fetchCsu: orchestrace ----------

test('fetchCsu: uloží souhrn s počty, latest a poznamená failures', async () => {
  const datasets = [
    { ...FAKE_DS, id: 'good_ds' },
    { ...FAKE_DS, id: 'bad_ds', fallback: null }, // selže celé
  ];
  const fetchImpl = async (url) => {
    if (url.includes('good_ds') || url === FAKE_DS.primary.url && datasets[0].primary.url === url) {
      return jsonResponse([{ rok: 2024, uzemi_kod: 'CZ0', pohlavi_kod: 'T', hodnota: 80 }]);
    }
    return jsonResponse({}, 500);
  };
  // Musíme dát unique URLs aby fetchImpl rozlišil
  datasets[0].primary = { ...datasets[0].primary, url: 'https://example.test/api/good_ds' };
  datasets[1].primary = { ...datasets[1].primary, url: 'https://example.test/api/bad_ds' };

  const summary = await fetchCsu({ fetchImpl, datasets, sleepImpl: async () => {} });
  assert.ok(summary.datasets['good_ds']);
  assert.equal(summary.datasets['good_ds'].source, 'datastat');
  assert.equal(summary.datasets['good_ds'].latest.value, 80);
  assert.equal(summary.failures.length, 1);
  assert.equal(summary.failures[0].id, 'bad_ds');

  const onDisk = JSON.parse(fs.readFileSync(cachePath('csu_demografie.json'), 'utf8'));
  assert.ok(onDisk.generated_at);
  assert.ok(onDisk.datasets['good_ds']);
});
