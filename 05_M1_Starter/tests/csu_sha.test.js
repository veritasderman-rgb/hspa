// Testy pro ČSÚ SHA 2011 fetcher (F2a).

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { extractYearlyAggregates, CSU_SHA_DATASETS } from '../ingest/fetchers/csu_sha.js';

test('CSU_SHA_DATASETS — obsahuje aspoň jednu edici', () => {
  assert.ok(CSU_SHA_DATASETS.length >= 1);
  for (const ds of CSU_SHA_DATASETS) {
    assert.match(ds.code, /^260005-\d+$/);
    assert.match(ds.xlsx_url, /^https?:\/\//);
    assert.ok(Array.isArray(ds.year_range) && ds.year_range.length === 2);
  }
});

test('extractYearlyAggregates — najde rok ve hlavičce a vrátí mapping', () => {
  const rows = [
    ['Kategorie', 2020, 2021, 2022, 2023],
    ['HF.1.1 Státní rozpočet', 12.5, 13.1, 14.0, 15.8],
    ['HF.1.2.1 Veřejné zdravotní pojištění', 320.1, 360.5, 400.2, 459.0],
    [null, null, null, null, null],
    ['Celkem', 332.6, 373.6, 414.2, 474.8],
  ];
  const agg = extractYearlyAggregates(rows);
  assert.deepEqual(agg.years, [2020, 2021, 2022, 2023]);
  assert.equal(agg.rows.length, 3);
  assert.equal(agg.rows[1].category, 'HF.1.2.1 Veřejné zdravotní pojištění');
  assert.equal(agg.rows[1].values[2023], 459.0);
});

test('extractYearlyAggregates — prázdná data vrací prázdný výsledek', () => {
  const agg = extractYearlyAggregates([['Bez roků', 'foo', 'bar']]);
  assert.deepEqual(agg.years, []);
  assert.deepEqual(agg.rows, []);
});

test('extractYearlyAggregates — mustContain filtr', () => {
  const rows = [
    ['Foo', 'A', 'B'],
    ['Kategorie', 2020, 2021],
    ['HC.1', 1, 2],
  ];
  const agg = extractYearlyAggregates(rows, { mustContain: ['Kategorie'] });
  assert.deepEqual(agg.years, [2020, 2021]);
  assert.equal(agg.rows.length, 1);
});
