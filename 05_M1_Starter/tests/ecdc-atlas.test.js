// Test parseru ECDC Atlas měření (offline, na fixture odpovědi REST API).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseAtlasMeasureResults } from '../ingest/fetchers/ecdc_atlas.js';
import { extractFromEcdcAtlas } from '../ingest/transform.js';

// Zjednodušená odpověď GetMeasureResultsForTimeUnitAndGeoRegion (jako z API).
const FIXTURE = {
  RequestId: 'x',
  Version: 1,
  Results: [
    { TimeCode: '2022', YValue: 18.2379349, N: 3564, GeoCountry: 'CZ' },
    { TimeCode: '2023', YValue: 17.17665209, N: 3889, GeoCountry: 'CZ' },
    { TimeCode: '2024', YValue: 19.18931583, N: 4268, GeoCountry: 'CZ' },
    { TimeCode: '2021', YValue: 19.70006816, N: 2934, GeoCountry: 'CZ' },
  ],
};

test('parseAtlasMeasureResults: vybere nejnovější rok jako hlavní hodnotu', () => {
  const r = parseAtlasMeasureResults(FIXTURE);
  assert.equal(r.year, 2024);
  assert.equal(r.value, 19.2); // zaokrouhleno na 1 desetinné místo
  assert.equal(r.n, 4268);
});

test('parseAtlasMeasureResults: trend je seřazený vzestupně podle roku', () => {
  const r = parseAtlasMeasureResults(FIXTURE);
  const years = r.trend.map(t => t.year);
  assert.deepEqual(years, [...years].sort((a, b) => a - b));
  assert.deepEqual(r.trend[r.trend.length - 1], { year: 2024, value: 19.2 });
});

test('parseAtlasMeasureResults: prázdná/nevalidní odpověď → null', () => {
  assert.equal(parseAtlasMeasureResults(null), null);
  assert.equal(parseAtlasMeasureResults({}), null);
  assert.equal(parseAtlasMeasureResults({ Results: [{ TimeCode: 'x', YValue: null }] }), null);
});

test('extractFromEcdcAtlas: chybějící cache → null (neshodí transform)', () => {
  // Indikátor, který v ingest/cache nemá ecdc_atlas_ soubor.
  assert.equal(extractFromEcdcAtlas('neexistujici_indikator_xyz'), null);
});
