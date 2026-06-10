// Testy parseru OECD SDMX-JSON 2.0 fetcheru (ingest/fetchers/oecd_sdmx2.js).
// Ověřuje extrakci ČR série + výpočet OECD průměru z dimensionAtObservation=AllDimensions.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseOecdSdmx2, buildOecdSdmx2Url } from '../ingest/fetchers/oecd_sdmx2.js';

// Minimální SDMX-JSON 2.0 message: dims REF_AREA × MEASURE × UNIT × HEALTH_PROF × TIME.
// Klíč observace = ":"-separované indexy v pořadí dimenzí.
function fixture() {
  const countries = ['CZE', 'AUT', 'DEU', 'FRA', 'ESP', 'ITA'];
  const times = ['2022', '2023'];
  const obs = {};
  // 2023 hodnoty: CZE 16.4, ostatní 12,14,16,18,20 → průměr (16.4+12+14+16+18+20)/6 = 16.067 → 16.1
  const v2023 = { CZE: 16.4, AUT: 12, DEU: 14, FRA: 16, ESP: 18, ITA: 20 };
  const v2022 = { CZE: 16.0 };
  countries.forEach((c, ci) => {
    times.forEach((t, ti) => {
      const key = `${ci}:0:0:0:${ti}`;
      const map = t === '2023' ? v2023 : v2022;
      if (map[c] != null) obs[key] = [map[c]];
    });
  });
  return {
    data: {
      structures: [{
        dimensions: {
          observation: [
            { id: 'REF_AREA', values: countries.map(id => ({ id })) },
            { id: 'MEASURE', values: [{ id: 'HSG' }] },
            { id: 'UNIT_MEASURE', values: [{ id: '10P5HB' }] },
            { id: 'HEALTH_PROF', values: [{ id: 'PHYS' }] },
            { id: 'TIME_PERIOD', values: times.map(id => ({ id })) },
          ],
        },
      }],
      dataSets: [{ observations: obs }],
    },
  };
}

test('parseOecdSdmx2: vytáhne ČR poslední rok + trend', () => {
  const r = parseOecdSdmx2(fixture(), { dims: { MEASURE: 'HSG', UNIT_MEASURE: '10P5HB', HEALTH_PROF: 'PHYS' } });
  assert.equal(r.cz.value, 16.4);
  assert.equal(r.cz.year, 2023);
  assert.deepEqual(r.trend, [{ year: 2022, value: 16.0 }, { year: 2023, value: 16.4 }]);
});

test('parseOecdSdmx2: OECD průměr z jednotlivých zemí za poslední rok ČR', () => {
  const r = parseOecdSdmx2(fixture(), { dims: { MEASURE: 'HSG', UNIT_MEASURE: '10P5HB', HEALTH_PROF: 'PHYS' } });
  // (16.4+12+14+16+18+20)/6 = 16.0666… → zaokrouhleno na 1 desetinné = 16.1
  assert.equal(r.benchmark.oecd, 16.1);
});

test('parseOecdSdmx2: vrátí null bez dat pro ČR', () => {
  const r = parseOecdSdmx2(fixture(), { dims: { MEASURE: 'HSG', UNIT_MEASURE: '10P5HB', HEALTH_PROF: 'PHYS' }, refArea: 'POL' });
  assert.equal(r, null);
});

test('buildOecdSdmx2Url: nový sdmx.oecd.org endpoint s jsondata', () => {
  const url = buildOecdSdmx2Url({ agency: 'OECD.ELS.HD', dataflow: 'DSD_X@DF_Y', version: '1.0' }, { startPeriod: 2018 });
  assert.match(url, /^https:\/\/sdmx\.oecd\.org\/public\/rest\/data\/OECD\.ELS\.HD,DSD_X@DF_Y,1\.0\/all\?/);
  assert.match(url, /format=jsondata/);
  assert.match(url, /dimensionAtObservation=AllDimensions/);
  assert.match(url, /startPeriod=2018/);
});

test('parseOecdSdmx2: pole v dims = součet přes vyjmenované členy (DAY+HBOUT)', () => {
  const fx = {
    data: {
      structures: [{
        dimensions: {
          observation: [
            { id: 'REF_AREA', values: [{ id: 'CZE' }, { id: 'AUT' }] },
            { id: 'MODE_PROVISION', values: [{ id: 'DAY' }, { id: 'HBOUT' }, { id: 'HBEDT' }] },
            { id: 'TIME_PERIOD', values: [{ id: '2022' }] },
          ],
        },
      }],
      dataSets: [{ observations: {
        '0:0:0': [10.5],   // CZE DAY
        '0:1:0': [88.2],   // CZE HBOUT
        '0:2:0': [1.3],    // CZE HBEDT (nesmí se započítat)
        '1:0:0': [50],     // AUT DAY
        '1:1:0': [30],     // AUT HBOUT
      } }],
    },
  };
  const r = parseOecdSdmx2(fx, { dims: { MODE_PROVISION: ['DAY', 'HBOUT'] } });
  assert.equal(r.cz.value, 98.7);
  assert.equal(r.cz.year, 2022);
});

test('buildOecdSdmx2Url: mapping.key zúží dotaz místo /all', () => {
  const url = buildOecdSdmx2Url({ dataflow: 'DSD_SHA@DF_SHA', key: '.A.....HC6.....' }, { startPeriod: 2015 });
  assert.match(url, /DSD_SHA@DF_SHA,1\.0\/\.A\.\.\.\.\.HC6\.\.\.\.\.\?/);
});
