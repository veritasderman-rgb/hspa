// Testy pro SÚKL fetcher (M12 — lékárny).
// Pokrývají PSČ → kraj mapping, parsování CSV a agregaci.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  pscToKraj,
  parseLekarnyCsv,
  aggregateLekarny,
  PSC_KRAJ_MAP,
  DEFAULT_KRAJ_POPULACE,
  fetchSukl,
} from '../ingest/fetchers/sukl.js';

// --- pscToKraj ---

test('pscToKraj: Praha (10000-19999) → CZ010', () => {
  assert.equal(pscToKraj('120 00').code, 'CZ010');
  assert.equal(pscToKraj('19000').code, 'CZ010');
  assert.equal(pscToKraj(11000).code, 'CZ010');
});

test('pscToKraj: Brno-město (62000) → CZ064 (Jihomoravský)', () => {
  assert.equal(pscToKraj('62000').code, 'CZ064');
  assert.equal(pscToKraj('60200').code, 'CZ064');
});

test('pscToKraj: Karlovy Vary (36000) → CZ041', () => {
  assert.equal(pscToKraj('36001').code, 'CZ041');
});

test('pscToKraj: Ostrava (70000-72999) → CZ080', () => {
  assert.equal(pscToKraj('72400').code, 'CZ080');
  assert.equal(pscToKraj('70030').code, 'CZ080');
});

test('pscToKraj: nevalidní PSČ → null', () => {
  assert.equal(pscToKraj(null), null);
  assert.equal(pscToKraj(''), null);
  assert.equal(pscToKraj('abc'), null);
  assert.equal(pscToKraj('800 00'), null); // mimo rozsah ČR
  assert.equal(pscToKraj('00100'), null);
});

test('PSC_KRAJ_MAP pokrývá všech 14 krajů ČR', () => {
  const codes = new Set(PSC_KRAJ_MAP.map(e => e.code));
  assert.equal(codes.size, 14, `expected 14 unique kraj codes, got ${codes.size}`);
});

test('DEFAULT_KRAJ_POPULACE pokrývá všech 14 krajů a součet je ~10,7M', () => {
  const codes = Object.keys(DEFAULT_KRAJ_POPULACE);
  assert.equal(codes.length, 14);
  const total = Object.values(DEFAULT_KRAJ_POPULACE).reduce((s, n) => s + n, 0);
  assert.ok(total > 10_500_000 && total < 11_000_000, `expected ~10.7M, got ${total}`);
});

// --- parseLekarnyCsv ---

test('parseLekarnyCsv: minimální záznam', () => {
  const csv = [
    'NAZEV;KOD_PRACOVISTE;MESTO;ULICE;PSC;TYP_LEKARNY;ERP;POHOTOVOST',
    'Lékárna Test;ABC123;Praha 1;Václavské náměstí 1;110 00;V;1;ANO',
    'Lékárna Brno;XYZ987;Brno;Náměstí Svobody 5;602 00;V;1;NE',
  ].join('\n');
  const out = parseLekarnyCsv(csv);
  assert.equal(out.length, 2);
  assert.equal(out[0].nazev, 'Lékárna Test');
  assert.equal(out[0].psc, '110 00');
  assert.equal(out[0].erp, true);
  assert.equal(out[0].pohotovost, true);
  assert.equal(out[1].pohotovost, false);
});

test('parseLekarnyCsv: ignoruje řádky bez kódu pracoviště', () => {
  const csv = [
    'NAZEV;KOD_PRACOVISTE;MESTO;ULICE;PSC;TYP_LEKARNY;ERP;POHOTOVOST',
    'Bez kódu;;Praha;;110 00;V;1;NE',
    'S kódem;K1;Praha;;110 00;V;1;NE',
  ].join('\n');
  const out = parseLekarnyCsv(csv);
  assert.equal(out.length, 1);
  assert.equal(out[0].nazev, 'S kódem');
});

// --- aggregateLekarny ---

test('aggregateLekarny: spočítá hustotu pro 3 lékárny ve 2 krajích', () => {
  const lekarny = [
    { kod_pracoviste: 'A', psc: '110 00', erp: true, pohotovost: false },   // Praha
    { kod_pracoviste: 'B', psc: '602 00', erp: true, pohotovost: false },   // JM
    { kod_pracoviste: 'C', psc: '120 00', erp: false, pohotovost: true },   // Praha
  ];
  const pop = { 'CZ010': 1_000_000, 'CZ064': 1_000_000 };
  const agg = aggregateLekarny(lekarny, pop);

  assert.equal(agg.total, 3);
  assert.equal(agg.unknown_psc, 0);
  assert.equal(agg.pohotovost_count, 1);
  assert.equal(agg.erp_count, 2);

  const praha = agg.regions.find(r => r.code === 'CZ010');
  assert.equal(praha.count, 2);
  assert.equal(praha.density, 0.2); // 2 / 1 000 000 × 100 000 = 0.2

  const jm = agg.regions.find(r => r.code === 'CZ064');
  assert.equal(jm.count, 1);
  assert.equal(jm.density, 0.1);
});

test('aggregateLekarny: počítá unknown_psc pro PSČ mimo rozsah ČR', () => {
  const lekarny = [
    { kod_pracoviste: 'A', psc: '110 00', erp: true, pohotovost: false },
    { kod_pracoviste: 'B', psc: '99999', erp: false, pohotovost: false },   // mimo
    { kod_pracoviste: 'C', psc: '', erp: false, pohotovost: false },        // chybí
  ];
  const agg = aggregateLekarny(lekarny, { 'CZ010': 1_000_000 });
  assert.equal(agg.total, 3);
  assert.equal(agg.unknown_psc, 2);
  assert.equal(agg.regions.length, 1);
});

test('aggregateLekarny: prázdný vstup', () => {
  const agg = aggregateLekarny([], DEFAULT_KRAJ_POPULACE);
  assert.equal(agg.total, 0);
  assert.equal(agg.regions.length, 0);
  assert.equal(agg.country_avg_per_100k, 0);
});

// --- fetchSukl s injektovaným fetch ---

test('fetchSukl: úspěšný flow s injektovaným fetch vrací aggregated', async () => {
  const csv = [
    'NAZEV;KOD_PRACOVISTE;MESTO;ULICE;PSC;TYP_LEKARNY;ERP;POHOTOVOST',
    'Lékárna 1;K1;Praha;Ulice 1;110 00;V;1;NE',
    'Lékárna 2;K2;Brno;Ulice 2;602 00;V;1;NE',
  ].join('\n');

  let called = 0;
  const fakeFetch = async () => {
    called++;
    return {
      ok: true, status: 200,
      async json() { return null; },
      async text() { return csv; },
    };
  };

  const result = await fetchSukl({
    force: true,
    fetchImpl: fakeFetch,
    endpoint: 'https://example.test/lekarny.csv',
  });

  assert.ok(result.aggregated, 'aggregated should be present');
  assert.equal(result.aggregated.total, 2);
  assert.equal(result.aggregated.regions.length, 2);
  assert.equal(called, 1);
});

test('fetchSukl: při selhání všech endpointů vrátí null aggregated bez throw', async () => {
  const fakeFetch = async () => ({
    ok: false, status: 404, async text() { return ''; }, async json() { throw new Error(); },
  });
  const result = await fetchSukl({
    force: true,
    fetchImpl: fakeFetch,
    endpoint: 'https://example.test/missing.csv',
  });
  assert.equal(result.aggregated, null);
  assert.ok(result.error, 'error message expected');
});
