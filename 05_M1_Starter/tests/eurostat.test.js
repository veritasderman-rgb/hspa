// Testy pro Eurostat fetcher (M4).

import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { fetchEurostatIndicator, fetchEurostat, loadEurostatMapping } from '../ingest/fetchers/eurostat.js';
import { cachePath, ensureCacheDir } from '../ingest/lib/cache.js';

function cleanEurostatCache() {
  ensureCacheDir();
  const dir = cachePath('.');
  for (const f of fs.readdirSync(dir)) {
    if (f.startsWith('eurostat') && f.endsWith('.json')) fs.unlinkSync(cachePath(f));
  }
}

function jsonResponse(json) {
  return {
    ok: true, status: 200,
    async json() { return json; },
    async text() { return JSON.stringify(json); },
  };
}

function jsonStatFixture() {
  // 2 země × 3 roky, hodnoty v plochém poli (geo × time)
  return {
    id: ['geo', 'time'],
    size: [2, 3],
    dimension: {
      geo: { category: { index: { 'CZ': 0, 'EU27_2020': 1 } } },
      time: { category: { index: { '2022': 0, '2023': 1, '2024': 2 } } },
    },
    value: [8.2, 8.4, 8.5, 9.5, 9.7, 9.9],
  };
}

const MAPPING = {
  dataset: 'hlth_hlye', country_dim: 'geo',
  cz_code: 'CZ', eu_code: 'EU27_2020',
  filter_extra: { sex: 'T', age: 'Y65' },
};

beforeEach(() => cleanEurostatCache());

test('loadEurostatMapping: načte indikátory z mapping souboru', () => {
  const m = loadEurostatMapping();
  assert.ok(m.nadeje_doziti_zdravi_65);
});

test('fetchEurostatIndicator: extrahuje CZ a EU agregát, postaví trend', async () => {
  const fetchImpl = async (url) => {
    assert.ok(url.includes('hlth_hlye'));
    assert.ok(url.includes('geo=CZ'));
    assert.ok(url.includes('geo=EU27_2020'));
    assert.ok(url.includes('sex=T'));
    return jsonResponse(jsonStatFixture());
  };
  const r = await fetchEurostatIndicator('hly_65', MAPPING, { fetchImpl, sleepImpl: async () => {} });
  assert.deepEqual(r.cz, { year: 2024, value: 8.5 });
  assert.deepEqual(r.eu, { year: 2024, value: 9.9 });
  assert.equal(r.trend.length, 3);
  assert.deepEqual(r.trend[2], { year: 2024, value: 8.5 });
});

test('fetchEurostat: orchestrace + summary cache', async () => {
  const fetchImpl = async () => jsonResponse(jsonStatFixture());
  const summary = await fetchEurostat({
    fetchImpl, sleepImpl: async () => {},
    mapping: { a: MAPPING },
  });
  assert.ok(summary.benchmarks.a.cz);
  assert.ok(summary.benchmarks.a.eu);
  assert.ok(fs.existsSync(cachePath('eurostat.json')));
});

test('fetchEurostatIndicator: druhé volání trefí cache', async () => {
  let calls = 0;
  const fetchImpl = async () => { calls++; return jsonResponse(jsonStatFixture()); };
  await fetchEurostatIndicator('cache_test', MAPPING, { fetchImpl, sleepImpl: async () => {} });
  const second = await fetchEurostatIndicator('cache_test', MAPPING, { fetchImpl, sleepImpl: async () => {} });
  assert.equal(calls, 1);
  assert.equal(second.source, 'cache');
});
