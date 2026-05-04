// Testy pro OECD fetcher (M4).

import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { fetchOecdIndicator, fetchOecd, loadOecdMapping } from '../ingest/fetchers/oecd.js';
import { cachePath, ensureCacheDir } from '../ingest/lib/cache.js';

function cleanOecdCache() {
  ensureCacheDir();
  const dir = cachePath('.');
  for (const f of fs.readdirSync(dir)) {
    if (f.startsWith('oecd_') && f.endsWith('.json')) fs.unlinkSync(cachePath(f));
  }
  if (fs.existsSync(cachePath('oecd_benchmarks.json'))) fs.unlinkSync(cachePath('oecd_benchmarks.json'));
}

function jsonResponse(json, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() { return json; },
    async text() { return JSON.stringify(json); },
  };
}

function makeSdmxFixture({ withOecd = true }) {
  const series = {
    '0:0': { observations: { '0': [79.5], '1': [79.9] } }, // CZE
  };
  const seriesDims = [
    { id: 'COU', keyPosition: 0, values: [{ id: 'CZE' }, { id: 'DEU' }, { id: 'AUT' }] },
    { id: 'VAR', keyPosition: 1, values: [{ id: 'V1' }] },
  ];
  if (withOecd) {
    seriesDims[0].values.push({ id: 'OECD' });
    series['3:0'] = { observations: { '0': [81.1], '1': [81.3] } };
  }
  // přidej dvě další země pro výpočet průměru
  series['1:0'] = { observations: { '0': [80.0], '1': [80.5] } }; // DEU
  series['2:0'] = { observations: { '0': [82.0], '1': [82.4] } }; // AUT

  return {
    structure: {
      dimensions: {
        series: seriesDims,
        observation: [{ id: 'TIME_PERIOD', values: [{ id: '2023' }, { id: '2024' }] }],
      },
    },
    dataSets: [{ series }],
  };
}

const MAPPING = {
  dataset: 'HEALTH_STAT', var: 'V1', filter: '.V1',
  country_dim: 'COU', cz_code: 'CZE', oecd_code: 'OECD',
};

beforeEach(() => cleanOecdCache());

test('loadOecdMapping: načte aspoň 5 indikátorů z mapping souboru', () => {
  const m = loadOecdMapping();
  assert.ok(Object.keys(m).length >= 5);
  assert.ok(m.nadeje_doziti_total);
});

test('fetchOecdIndicator: extrahuje CZ a OECD, když je OECD agregát v datech', async () => {
  const fetchImpl = async () => jsonResponse(makeSdmxFixture({ withOecd: true }));
  const r = await fetchOecdIndicator('test_id', MAPPING, { fetchImpl, sleepImpl: async () => {} });
  assert.deepEqual(r.cz, { year: 2024, value: 79.9 });
  assert.equal(r.oecd.value, 81.3);
  assert.equal(r.oecd.computed, false);
  assert.equal(r.trend.length, 2);
  assert.deepEqual(r.trend, [{ year: 2023, value: 79.5 }, { year: 2024, value: 79.9 }]);
});

test('fetchOecdIndicator: pokud chybí OECD agregát, vypočte aritmetický průměr', async () => {
  const fetchImpl = async () => jsonResponse(makeSdmxFixture({ withOecd: false }));
  const r = await fetchOecdIndicator('test_id', MAPPING, { fetchImpl, sleepImpl: async () => {} });
  assert.deepEqual(r.cz, { year: 2024, value: 79.9 });
  // Average DEU+AUT = (80.5 + 82.4)/2 = 81.45
  assert.equal(r.oecd.computed, true);
  assert.equal(r.oecd.year, 2024);
  assert.ok(Math.abs(r.oecd.value - 81.45) < 0.001);
});

test('fetchOecdIndicator: ČR není v průměru (self-exclude)', async () => {
  // pouze CZE v datech → průměr by byl null
  const fixture = {
    structure: {
      dimensions: {
        series: [
          { id: 'COU', keyPosition: 0, values: [{ id: 'CZE' }] },
          { id: 'VAR', keyPosition: 1, values: [{ id: 'V1' }] },
        ],
        observation: [{ id: 'TIME_PERIOD', values: [{ id: '2024' }] }],
      },
    },
    dataSets: [{ series: { '0:0': { observations: { '0': [79.9] } } } }],
  };
  const fetchImpl = async () => jsonResponse(fixture);
  const r = await fetchOecdIndicator('only_cz', MAPPING, { fetchImpl, sleepImpl: async () => {} });
  assert.equal(r.cz.value, 79.9);
  assert.equal(r.oecd, null);
});

test('fetchOecd: orchestrace přes mapping s 2 indikátory', async () => {
  const fetchImpl = async () => jsonResponse(makeSdmxFixture({ withOecd: true }));
  const summary = await fetchOecd({
    fetchImpl, sleepImpl: async () => {},
    mapping: { a: MAPPING, b: { ...MAPPING, var: 'V2', filter: '.V2' } },
  });
  assert.equal(Object.keys(summary.benchmarks).length, 2);
  assert.ok(summary.benchmarks.a.cz);
  assert.ok(summary.benchmarks.b.oecd);
  assert.ok(fs.existsSync(cachePath('oecd_benchmarks.json')));
});

test('fetchOecdIndicator: druhé volání trefí cache', async () => {
  let calls = 0;
  const fetchImpl = async () => { calls++; return jsonResponse(makeSdmxFixture({ withOecd: true })); };
  await fetchOecdIndicator('cache_test', MAPPING, { fetchImpl, sleepImpl: async () => {} });
  const second = await fetchOecdIndicator('cache_test', MAPPING, { fetchImpl, sleepImpl: async () => {} });
  assert.equal(calls, 1);
  assert.equal(second.source, 'cache');
});
