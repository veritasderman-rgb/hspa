// Doháněč — testy výpočetního enginu (src/dohanec-engine.js), viz PLAN-DIAGNOZA.md §B.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dohanec, sestavRadu, prumerneTempo, czCislo, ROK_STROP } from '../src/dohanec-engine.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const indicators = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'indicators.json'), 'utf8'));
const byId = new Map(indicators.indicators.map((i) => [i.id, i]));

/** Pomocník: syntetický indikátor s rozumnými defaulty. */
function synteticky(prepis = {}) {
  return {
    id: 'test_indikator',
    value: 81,
    year: 2023,
    unit: 'let',
    direction: 'higher_is_better',
    benchmark: { oecd: 85, eu: 84 },
    trend: [
      { year: 2020, value: 78 },
      { year: 2021, value: 79 },
      { year: 2022, value: 80 },
    ],
    ...prepis,
  };
}

// ---------------------------------------------------------------------------
// catches_up
// ---------------------------------------------------------------------------

test('catches_up: ručně spočtený rok protnutí', () => {
  // Řada 2020:78 … 2022:80 + aktuální 2023:81 → tempo (81−78)/3 = 1,0/rok.
  // gap = 81 − 85 = −4 → protnutí 2023 + ceil(4/1) = 2027.
  const r = dohanec(synteticky());
  assert.equal(r.status, 'catches_up');
  assert.equal(r.year, 2027);
  assert.equal(r.rate, 1);
  assert.equal(r.gap, -4);
  assert.match(r.note, /2027/);
  assert.match(r.note, /konstant/i, 'note zmiňuje konstantní benchmark');
  assert.match(r.note, /extrapolace/i, 'note zmiňuje modelovou extrapolaci');
});

test('catches_up: lower_is_better s klesajícím trendem', () => {
  // Řada 2020:120 … 2023:105 → tempo −5/rok; gap = 105 − 100 = +5 → 2023 + 1 = 2024.
  const r = dohanec(synteticky({
    direction: 'lower_is_better',
    value: 105,
    year: 2023,
    benchmark: { oecd: 100 },
    trend: [
      { year: 2020, value: 120 },
      { year: 2021, value: 115 },
      { year: 2022, value: 110 },
    ],
  }));
  assert.equal(r.status, 'catches_up');
  assert.equal(r.year, 2024);
  assert.equal(r.rate, -5);
  assert.equal(r.gap, 5);
});

// ---------------------------------------------------------------------------
// diverging
// ---------------------------------------------------------------------------

test('diverging: tempo jde od benchmarku (vzdalujeme se)', () => {
  // lower_is_better, ale hodnota roste: 110 → 125, oecd 100.
  const r = dohanec(synteticky({
    direction: 'lower_is_better',
    value: 125,
    year: 2023,
    benchmark: { oecd: 100 },
    trend: [
      { year: 2020, value: 110 },
      { year: 2021, value: 115 },
      { year: 2022, value: 120 },
    ],
  }));
  assert.equal(r.status, 'diverging');
  assert.equal(r.year, null);
  assert.equal(r.rate, 5);
  assert.equal(r.gap, 25);
  assert.match(r.note, /vzdalujeme/i);
  assert.match(r.note, /nedoženeme/i);
  assert.match(r.note, /konstant/i);
});

test('diverging: stagnace (tempo ~0) se rozliší od vzdalování', () => {
  const r = dohanec(synteticky({
    value: 78,
    year: 2023,
    trend: [
      { year: 2020, value: 78 },
      { year: 2021, value: 78 },
      { year: 2022, value: 78 },
    ],
  }));
  assert.equal(r.status, 'diverging');
  assert.equal(r.year, null);
  assert.equal(r.rate, 0);
  assert.match(r.note, /stagnujeme/i);
  assert.doesNotMatch(r.note, /vzdalujeme/i);
});

test('diverging: protnutí po roce 2100 = prakticky nikdy', () => {
  // Tempo +0,01/rok, gap −89,97 → protnutí ~ rok 11020 → diverging.
  const r = dohanec(synteticky({
    value: 10.03,
    year: 2023,
    benchmark: { oecd: 100 },
    trend: [
      { year: 2020, value: 10 },
      { year: 2021, value: 10.01 },
      { year: 2022, value: 10.02 },
    ],
  }));
  assert.equal(r.status, 'diverging');
  assert.equal(r.year, null);
  assert.match(r.note, /prakticky nikdy/i);
  assert.match(r.note, new RegExp(String(ROK_STROP)));
});

// ---------------------------------------------------------------------------
// already_better
// ---------------------------------------------------------------------------

test('already_better: ČR na správné straně benchmarku (oba směry)', () => {
  const vyssi = dohanec(synteticky({ value: 90, year: 2023, benchmark: { oecd: 85 } }));
  assert.equal(vyssi.status, 'already_better');
  assert.equal(vyssi.year, null);
  assert.equal(vyssi.gap, 5);
  assert.match(vyssi.note, /lepší straně/i);
  assert.match(vyssi.note, /konstant/i);

  const nizsi = dohanec(synteticky({
    direction: 'lower_is_better',
    value: 95,
    year: 2023,
    benchmark: { oecd: 100 },
    trend: [
      { year: 2020, value: 110 },
      { year: 2021, value: 105 },
      { year: 2022, value: 99 },
    ],
  }));
  assert.equal(nizsi.status, 'already_better');
  assert.equal(nizsi.gap, -5);
});

// ---------------------------------------------------------------------------
// insufficient_data — každý chybějící vstup zvlášť
// ---------------------------------------------------------------------------

test('insufficient_data: chybí benchmark.oecd', () => {
  const bezBenchmarku = dohanec(synteticky({ benchmark: undefined }));
  assert.equal(bezBenchmarku.status, 'insufficient_data');
  assert.equal(bezBenchmarku.year, null);
  assert.equal(bezBenchmarku.rate, null);
  assert.equal(bezBenchmarku.gap, null);
  assert.match(bezBenchmarku.note, /benchmark OECD/i);

  const jenEu = dohanec(synteticky({ benchmark: { eu: 84 } }));
  assert.equal(jenEu.status, 'insufficient_data');
});

test('insufficient_data: direction context_dependent nebo chybí', () => {
  const kontext = dohanec(synteticky({ direction: 'context_dependent' }));
  assert.equal(kontext.status, 'insufficient_data');
  assert.match(kontext.note, /kontext/i);

  const bezSmeru = dohanec(synteticky({ direction: undefined }));
  assert.equal(bezSmeru.status, 'insufficient_data');
  assert.match(bezSmeru.note, /směr/i);
});

test('insufficient_data: trend má méně než 3 body / chybí', () => {
  const kratky = dohanec(synteticky({
    trend: [{ year: 2021, value: 79 }, { year: 2022, value: 80 }],
  }));
  assert.equal(kratky.status, 'insufficient_data');
  assert.match(kratky.note, /3 body/i);

  assert.equal(dohanec(synteticky({ trend: [] })).status, 'insufficient_data');
  assert.equal(dohanec(synteticky({ trend: undefined })).status, 'insufficient_data');
});

test('insufficient_data: chybí value nebo year', () => {
  assert.equal(dohanec(synteticky({ value: undefined })).status, 'insufficient_data');
  assert.equal(dohanec(synteticky({ value: NaN })).status, 'insufficient_data');
  assert.equal(dohanec(synteticky({ year: undefined })).status, 'insufficient_data');
  assert.equal(dohanec(null).status, 'insufficient_data');
});

test('insufficient_data: nulové rozpětí let (ošetření dělení nulou)', () => {
  const r = dohanec(synteticky({
    value: 80,
    year: 2020,
    trend: [
      { year: 2020, value: 78 },
      { year: 2020, value: 79 },
      { year: 2020, value: 80 },
    ],
  }));
  assert.equal(r.status, 'insufficient_data');
  assert.match(r.note, /tempo/i);
});

// ---------------------------------------------------------------------------
// pomocné funkce
// ---------------------------------------------------------------------------

test('sestavRadu: aktuální bod se přidá jen když je novější než trend', () => {
  const sNovym = sestavRadu(synteticky()); // year 2023 > poslední trend 2022
  assert.equal(sNovym.length, 4);
  assert.deepEqual(sNovym[3], { year: 2023, value: 81 });

  const bezNoveho = sestavRadu(synteticky({ year: 2022, value: 80 }));
  assert.equal(bezNoveho.length, 3, 'duplicitní rok se nepřidává');
});

test('prumerneTempo: lineární průměr a ošetření krajních případů', () => {
  assert.equal(prumerneTempo([{ year: 2020, value: 10 }, { year: 2024, value: 18 }]), 2);
  assert.equal(prumerneTempo([{ year: 2020, value: 10 }]), null);
  assert.equal(prumerneTempo([{ year: 2020, value: 10 }, { year: 2020, value: 12 }]), null);
});

test('czCislo: české formátování (desetinná čárka)', () => {
  assert.equal(czCislo(-17.5), '-17,5');
  assert.equal(czCislo(1), '1');
  assert.equal(czCislo(null), '—');
});

// ---------------------------------------------------------------------------
// reálné indikátory z data/indicators.json
// ---------------------------------------------------------------------------

const VALIDNI_STATUSY = ['catches_up', 'diverging', 'already_better', 'insufficient_data'];

test('reálný indikátor: nadeje_doziti_total vrací validní a konzistentní výsledek', () => {
  const ind = byId.get('nadeje_doziti_total');
  assert.ok(ind, 'indikátor existuje v datovém kontraktu');
  const r = dohanec(ind);
  assert.ok(VALIDNI_STATUSY.includes(r.status));
  assert.equal(typeof r.note, 'string');
  assert.ok(r.note.length > 0);
  // V datech chybí benchmark.oecd (jen eu) → Doháněč to musí poctivě přiznat.
  if (!Number.isFinite(ind.benchmark?.oecd)) {
    assert.equal(r.status, 'insufficient_data');
    assert.equal(r.year, null);
  }
});

test('reálný indikátor: hospitalizace_acsc vrací validní status a konzistentní znaménka', () => {
  const ind = byId.get('hospitalizace_acsc');
  assert.ok(ind, 'indikátor existuje v datovém kontraktu');
  const r = dohanec(ind);
  assert.ok(VALIDNI_STATUSY.includes(r.status));
  // lower_is_better, hodnota nad OECD → gap kladný; trend klesá → rate záporný.
  assert.ok(r.gap > 0, 'ČR je nad průměrem OECD (gap > 0)');
  assert.ok(r.rate < 0, 'hospitalizace klesají (rate < 0)');
  assert.equal(r.status, 'catches_up', 'klesající trend k benchmarku = doháníme');
  assert.ok(Number.isInteger(r.year) && r.year > ind.year && r.year <= 2100,
    'rok protnutí je celé číslo v rozumném rozsahu');
});
