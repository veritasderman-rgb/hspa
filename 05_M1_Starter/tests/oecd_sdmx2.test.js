// Testy parseru OECD SDMX-JSON 2.0 fetcheru (ingest/fetchers/oecd_sdmx2.js).
// Ověřuje extrakci ČR série + výpočet OECD průměru z dimensionAtObservation=AllDimensions.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseOecdSdmx2, buildOecdSdmx2Url } from '../ingest/fetchers/oecd_sdmx2.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

// --- Benchmark JEN ze 38 členských zemí OECD (decisions-log 2026-06-10 #2) ---
// Dataflows sdmx.oecd.org obsahují i partnerské/kandidátské země (BGR, ROU, HRV,
// PER…) a agregátní REF_AREA (OECD, EU27_2020). Ty NESMÍ vstupovat do „OECD
// průměru", jinak benchmark zkreslují. Tento test hlídá members-only invariant
// (po konsolidaci legacy oecd.js pod tento fetcher, U4).
function membersFixture() {
  // 5 členů (CZE + 4) → splní práh vals.length >= 5; 1 partner (BGR) a 1 agregát
  // (OECD) musí být vyloučeny.
  const rows = { CZE: 10, AUT: 20, DEU: 30, FRA: 40, ESP: 50, BGR: 1000, OECD: 999 };
  const refAreas = Object.keys(rows);
  const obs = {};
  refAreas.forEach((ra, i) => { obs[`${i}:0`] = [rows[ra]]; });
  return {
    data: {
      structures: [{
        dimensions: {
          observation: [
            { id: 'REF_AREA', values: refAreas.map(id => ({ id })) },
            { id: 'TIME_PERIOD', values: [{ id: '2023' }] },
          ],
        },
      }],
      dataSets: [{ observations: obs }],
    },
  };
}

test('parseOecdSdmx2: OECD průměr ignoruje partnerskou zemi (BGR) i agregát (OECD)', () => {
  const r = parseOecdSdmx2(membersFixture());
  assert.equal(r.cz.value, 10);
  // průměr JEN z 5 členů (10+20+30+40+50)/5 = 30; BGR (1000) a agregát OECD (999)
  // by ho vystřelily nahoru, kdyby se započítaly.
  assert.equal(r.benchmark.oecd, 30);
});

// --- Dávka G (2026-07-06): hip-fracture surgery ≤2 dny (DSD_HCQO@DF_AC) ---

test('mapping operace_zlomenina_kycle_48h: DF_AC, IHWTHIPS, věk 65+, OBS', () => {
  const MAP = JSON.parse(fs.readFileSync(
    path.join(__dirname, '..', 'ingest', 'mapping', 'oecd_sdmx2_codes.json'), 'utf8')).indicators;
  const m = MAP.operace_zlomenina_kycle_48h;
  assert.ok(m, 'mapping chybí');
  assert.equal(m.dataflow, 'DSD_HCQO@DF_AC');
  assert.equal(m.dims.MEASURE, 'IHWTHIPS');
  assert.equal(m.dims.UNIT_MEASURE, 'PT_SURG_HIPF');
  assert.equal(m.dims.AGE, 'Y_GE65');
  assert.equal(m.dims.SEX, '_T');
  assert.equal(m.dims.STATISTICAL_OPERATION, 'OBS');
});

test('parseOecdSdmx2: hip-fracture fixture (dims MEASURE/AGE/SEX/STAT_OP)', () => {
  // Malý DF_AC-like fixture: dims REF_AREA × MEASURE × AGE × SEX × STATISTICAL_OPERATION × TIME.
  const countries = ['CZE', 'AUT', 'DEU', 'FRA', 'ESP', 'ITA'];
  const times = ['2020', '2021'];
  const v2021 = { CZE: 79.2, AUT: 91.4, DEU: 93.8, FRA: 82, ESP: 57, ITA: 77 };
  const v2020 = { CZE: 79.4 };
  const obs = {};
  countries.forEach((c, ci) => times.forEach((t, ti) => {
    const map = t === '2021' ? v2021 : v2020;
    if (map[c] != null) obs[`${ci}:0:0:0:0:${ti}`] = [map[c]];
  }));
  const fx = { data: { structures: [{ dimensions: { observation: [
    { id: 'REF_AREA', values: countries.map(id => ({ id })) },
    { id: 'MEASURE', values: [{ id: 'IHWTHIPS' }] },
    { id: 'AGE', values: [{ id: 'Y_GE65' }] },
    { id: 'SEX', values: [{ id: '_T' }] },
    { id: 'STATISTICAL_OPERATION', values: [{ id: 'OBS' }] },
    { id: 'TIME_PERIOD', values: times.map(id => ({ id })) },
  ] } }], dataSets: [{ observations: obs }] } };
  const r = parseOecdSdmx2(fx, { dims: { MEASURE: 'IHWTHIPS', AGE: 'Y_GE65', SEX: '_T', STATISTICAL_OPERATION: 'OBS' } });
  assert.equal(r.cz.value, 79.2);
  assert.equal(r.cz.year, 2021);
  // průměr 6 členů (79.2+91.4+93.8+82+57+77)/6 = 80.066… → 80.1 (shoduje se s kartou)
  assert.equal(r.benchmark.oecd, 80.1);
});

test('parseOecdSdmx2: pod prahem 5 členů se benchmark nepočítá', () => {
  // Jen 4 členské země → nedůvěryhodný průměr → benchmark prázdný.
  const rows = { CZE: 10, AUT: 20, DEU: 30, FRA: 40 };
  const refAreas = Object.keys(rows);
  const obs = {};
  refAreas.forEach((ra, i) => { obs[`${i}:0`] = [rows[ra]]; });
  const fx = {
    data: {
      structures: [{
        dimensions: {
          observation: [
            { id: 'REF_AREA', values: refAreas.map(id => ({ id })) },
            { id: 'TIME_PERIOD', values: [{ id: '2023' }] },
          ],
        },
      }],
      dataSets: [{ observations: obs }],
    },
  };
  const r = parseOecdSdmx2(fx);
  assert.equal(r.cz.value, 10);
  assert.equal(r.benchmark.oecd, undefined);
});

test('fetchOecdSdmx2Indicator posílá Accept-Language — bez ní OECD vrací HTTP 500 "languageTag1"', async () => {
  const { fetchOecdSdmx2Indicator } = await import('../ingest/fetchers/oecd_sdmx2.js');
  const seen = [];
  // Server, který věrně napodobuje chování sdmx.oecd.org: chybí-li
  // Accept-Language, odpoví 500 s tělem "languageTag1" (ověřeno živě
  // 2026-07-29 na všech 12 mapovaných dataflow). Právě tenhle stav
  // tiše shazoval OECD indikátory na origin: seed.
  const fetchImpl = async (url, opts = {}) => {
    const headers = opts.headers ?? {};
    seen.push(headers);
    const lang = headers['Accept-Language'] ?? headers['accept-language'];
    if (!lang) {
      return { ok: false, status: 500, headers: new Map(), text: async () => 'languageTag1' };
    }
    return {
      ok: true,
      status: 200,
      headers: new Map(),
      json: async () => ({
        data: {
          structures: [{
            dimensions: {
              observation: [
                { id: 'REF_AREA', values: [{ id: 'CZE' }, { id: 'AUT' }, { id: 'DEU' }, { id: 'FRA' }, { id: 'ITA' }, { id: 'POL' }] },
                { id: 'TIME_PERIOD', values: [{ id: '2023' }] },
              ],
            },
          }],
          dataSets: [{ observations: { '0:0': [10], '1:0': [20], '2:0': [30], '3:0': [40], '4:0': [50], '5:0': [60] } }],
        },
      }),
      text: async () => '',
    };
  };

  const mapping = { agency: 'OECD.ELS.HD', dataflow: 'DSD_TEST@DF_TEST', version: '1.0', dims: {} };
  const out = await fetchOecdSdmx2Indicator('test_indicator', mapping, { fetchImpl });

  assert.equal(out.cz.value, 10, 'hodnota ČR se má vyparsovat');
  assert.ok(seen.length > 0, 'fetch musí proběhnout');
  for (const h of seen) {
    const lang = h['Accept-Language'] ?? h['accept-language'];
    assert.ok(lang, 'každý požadavek na OECD musí nést Accept-Language, jinak server vrací 500');
  }
});

test('fetchHttp2 normalizuje názvy hlaviček na lowercase (HTTP/2 zakazuje velká písmena)', async () => {
  // Regrese: fallback na HTTP/2 dostával { Accept-Language: 'en' } s velkým
  // písmenem a node http2 by na tom spadl dřív, než odešle požadavek.
  const src = await import('node:fs').then(fs =>
    fs.readFileSync(new URL('../ingest/lib/http.js', import.meta.url), 'utf8'));
  assert.match(src, /toLowerCase\(\)/, 'fetchHttp2 musí názvy hlaviček normalizovat');
});
