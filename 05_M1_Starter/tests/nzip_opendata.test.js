// Testy NZIP open-data fetcheru (ingest/fetchers/nzip_opendata.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { aggregateCsvStream } from '../ingest/fetchers/nzip_opendata.js';

function fakeFetchCsv(csv) {
  return async () => ({ ok: true, status: 200, body: Readable.from([csv]) });
}

test('aggregateCsvStream: microdata_ratio — podíl řádků s flagem za rok', async () => {
  const csv = [
    'id,rok,flag',
    '1,2023,1', '2,2023,0', '3,2023,1', '4,2023,1',  // 3/4 = 75 %
    '5,2022,1', '6,2022,0',                           // 1/2 = 50 %
  ].join('\n');
  const r = await aggregateCsvStream('x', {
    mode: 'microdata_ratio', year_col: 'rok', flag_col: 'flag', flag_value: '1', decimals: 1,
  }, { fetchImpl: fakeFetchCsv(csv) });
  assert.deepEqual(r.trend, [{ year: 2022, value: 50 }, { year: 2023, value: 75 }]);
  assert.deepEqual(r.cz, { value: 75, year: 2023 });
});

test('aggregateCsvStream: aggregate_ratio — num/denom za rok', async () => {
  const csv = ['rok,vys,pop', '2023,30,100', '2023,20,100', '2022,10,100'].join('\n');
  const r = await aggregateCsvStream('x', {
    mode: 'aggregate_ratio', year_col: 'rok', num_col: 'vys', denom_col: 'pop', decimals: 1,
  }, { fetchImpl: fakeFetchCsv(csv) });
  // 2023: (30+20)/(100+100)=25 %; 2022: 10/100=10 %
  assert.deepEqual(r.cz, { value: 25, year: 2023 });
});

test('aggregateCsvStream: aggregate_sum s filtrem', async () => {
  const csv = ['rok,typ,n', '2023,A,5', '2023,B,7', '2023,A,3'].join('\n');
  const r = await aggregateCsvStream('x', {
    mode: 'aggregate_sum', year_col: 'rok', value_col: 'n', filter_col: 'typ', filter_value: 'A', decimals: 0,
  }, { fetchImpl: fakeFetchCsv(csv) });
  assert.equal(r.cz.value, 8); // 5+3
});

test('aggregateCsvStream: microdata_coverage — 2letý interval s věkovým filtrem', async () => {
  const { aggregateCsvStream } = await import('../ingest/fetchers/nzip_opendata.js');
  const { Readable } = await import('node:stream');
  const fake = (csv) => async () => ({ ok: true, status: 200, body: Readable.from([csv]) });
  // osoba 1 (vek 30): prohlídka 2022 → pokrytá i 2023 (okno 2). osoba 2 (vek 40): jen 2023.
  // osoba 3 (vek 10): dítě, vyfiltrováno min_age 18.
  const csv = [
    'id_pacient,rok,vek,preventivni_prohlidka_PL',
    '1,2022,30,1', '1,2023,31,0',
    '2,2022,40,0', '2,2023,41,1',
    '3,2023,10,1',
  ].join('\n');
  const r = await aggregateCsvStream('x', {
    mode: 'microdata_coverage', year_col: 'rok', id_col: 'id_pacient', age_col: 'vek',
    min_age: 18, coverage_window: 2, flag_col: 'preventivni_prohlidka_PL', flag_value: '1', decimals: 1,
  }, { fetchImpl: fake(csv) });
  // 2023: přítomni 18+ = {1,2}; pokrytí: osoba1 (prohlídka 2022) ✓, osoba2 (2023) ✓ → 100 %
  assert.equal(r.cz.year, 2023);
  assert.equal(r.cz.value, 100);
  // 2022: přítomni {1,2}; pokrytí: osoba1 ✓ (2022), osoba2 ✗ → 50 %
  assert.deepEqual(r.trend.find(t => t.year === 2022), { year: 2022, value: 50 });
});

test('aggregateCsvStream: microdata_ratio respektuje min_age filtr', async () => {
  const { aggregateCsvStream } = await import('../ingest/fetchers/nzip_opendata.js');
  const { Readable } = await import('node:stream');
  const fake = (csv) => async () => ({ ok: true, status: 200, body: Readable.from([csv]) });
  const csv = ['rok,vek,flag', '2023,30,1', '2023,40,0', '2023,10,1'].join('\n'); // dítě vyfiltrováno
  const r = await aggregateCsvStream('x', {
    mode: 'microdata_ratio', year_col: 'rok', age_col: 'vek', min_age: 18, flag_col: 'flag', flag_value: '1', decimals: 1,
  }, { fetchImpl: fake(csv) });
  assert.equal(r.cz.value, 50); // 1 z 2 dospělých
});
