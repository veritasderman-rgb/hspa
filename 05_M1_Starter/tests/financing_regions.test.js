// Testy pro data/financing-regions.json + transform_financing_regions.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { calcKrajIndex, buildRegions } from '../ingest/transform_financing_regions.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const REGIONS = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'financing-regions.json'), 'utf8'));

const NUTS3_CODES = [
  'CZ010', 'CZ020', 'CZ031', 'CZ032', 'CZ041', 'CZ042', 'CZ051',
  'CZ052', 'CZ053', 'CZ063', 'CZ064', 'CZ071', 'CZ072', 'CZ080',
];

test('data/financing-regions.json — všech 14 krajů NUTS-3 přítomno', () => {
  assert.equal(REGIONS.regions.length, 14);
  const codes = REGIONS.regions.map(r => r.code).sort();
  assert.deepEqual(codes, [...NUTS3_CODES].sort());
});

test('data/financing-regions.json — všechny value > 0 a pojistenci > 0', () => {
  for (const r of REGIONS.regions) {
    assert.ok(r.value > 0, `${r.code}: value`);
    assert.ok(r.pojistenci > 0, `${r.code}: pojistenci`);
  }
});

test('data/financing-regions.json — vážený průměr odpovídá country_avg ±5 %', () => {
  const totalPoj = REGIONS.regions.reduce((a, r) => a + r.pojistenci, 0);
  const weighted = REGIONS.regions.reduce((a, r) => a + r.value * r.pojistenci, 0) / totalPoj;
  const diffPct = Math.abs(weighted - REGIONS.country_avg) / REGIONS.country_avg * 100;
  assert.ok(diffPct < 5, `vážený průměr ${weighted.toFixed(0)} vs. country_avg ${REGIONS.country_avg}, odchylka ${diffPct.toFixed(2)} %`);
});

test('data/financing-regions.json — country_avg = 42 226 (synchronizováno s financing.json)', () => {
  assert.equal(REGIONS.country_avg, 42226);
});

test('calcKrajIndex — Praha dostane bonus za centra', () => {
  const stats = { pct_65plus: 20, pct_80plus: 5 };
  const pragueIdx = calcKrajIndex(stats, 'CZ010');
  const otherIdx = calcKrajIndex(stats, 'CZ020');
  assert.ok(pragueIdx > otherIdx, 'Praha musí mít vyšší index');
  assert.ok(Math.abs(pragueIdx - otherIdx - 0.06) < 1e-9, 'rozdíl = 6 % bonus');
});

test('calcKrajIndex — vyšší pct_65plus = vyšší index', () => {
  const young = calcKrajIndex({ pct_65plus: 15, pct_80plus: 3 }, 'CZ053');
  const old   = calcKrajIndex({ pct_65plus: 25, pct_80plus: 8 }, 'CZ053');
  assert.ok(old > young, 'starší populace musí mít vyšší index');
});

test('buildRegions — funguje s inline daty', () => {
  const fin = { headline_stats: { per_pojistence_kc: { value: 40000, year: 2023 } } };
  const poj = {
    krajs: [{ code: 'CZ010', name: 'Praha' }, { code: 'CZ020', name: 'SČ' }],
    data: {
      CZ010: { '2023': { total: 1300000, pct_65plus: 20, pct_80plus: 5 } },
      CZ020: { '2023': { total: 1450000, pct_65plus: 19, pct_80plus: 4 } },
    },
  };
  const out = buildRegions({ financing: fin, pojistenci: poj });
  assert.equal(out.regions.length, 2);
  assert.equal(out.country_avg, 40000);
  assert.ok(out.regions[0].value > 0);
});
