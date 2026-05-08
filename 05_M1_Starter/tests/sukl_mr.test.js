// Testy pro SÚKL MR fetcher (výpadky léčiv).
// Pokrývají parseMrCsv, aggregateMr (dedup, filtrování aktivních výpadků,
// 30denní okno, top ATC) a fetchSuklMr s injektovaným fetch.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  parseMrCsv,
  aggregateMr,
  fetchSuklMr,
  ATC_GROUPS,
} from '../ingest/fetchers/sukl_mr.js';

// --- parseMrCsv ---

test('parseMrCsv: minimální záznam s povinnými poli', () => {
  const csv = [
    'KOD_SUKL;NAZEV;DOPLNEK;ATC;TYP_OZNAMENI;PLATNOST_OD;DATUM_HLASENI;NAHRAZUJICI_LP;DUVOD_PRERUSENI_UKONCENI;TERMIN_OBNOVENI;POSLEDNI_PLATNE_HLASENI',
    '0123456;ASPIRIN;100MG TBL;N02BA01;P;2026-01-15;2026-01-15;0987654;Výrobní problém;2026-09-01;ANO',
    '0234567;PARALEN;500MG TBL;N02BE01;U;2026-02-01;2026-02-01;;;;ANO',
  ].join('\n');

  const out = parseMrCsv(csv);
  assert.equal(out.length, 2);
  assert.equal(out[0].kod_sukl, '0123456');
  assert.equal(out[0].nazev, 'ASPIRIN');
  assert.equal(out[0].atc, 'N02BA01');
  assert.equal(out[0].typ, 'P');
  assert.equal(out[0].nahrazujici_lp, '0987654');
  assert.equal(out[1].typ, 'U');
});

test('parseMrCsv: ignoruje řádky bez KOD_SUKL', () => {
  const csv = [
    'KOD_SUKL;NAZEV;TYP_OZNAMENI;DATUM_HLASENI',
    ';BEZ KÓDU;P;2026-01-01',
    '0111111;OK LP;P;2026-01-01',
  ].join('\n');
  const out = parseMrCsv(csv);
  assert.equal(out.length, 1);
  assert.equal(out[0].kod_sukl, '0111111');
});

test('parseMrCsv: trimuje a normalizuje case ATC + TYP', () => {
  const csv = [
    'KOD_SUKL;NAZEV;ATC;TYP_OZNAMENI;DATUM_HLASENI',
    '0123456; APPROX ;n02ba01;p;2026-01-15',
  ].join('\n');
  const out = parseMrCsv(csv);
  assert.equal(out[0].nazev, 'APPROX');
  assert.equal(out[0].atc, 'N02BA01');
  assert.equal(out[0].typ, 'P');
});

// --- aggregateMr ---

test('aggregateMr: deduplikace — pro KOD_SUKL bere nejnovější hlášení', () => {
  // Paralen má dvě hlášení: starší přerušení a novější obnovení → není aktivní.
  const rows = [
    { kod_sukl: '0001', nazev: 'PARALEN', atc: 'N02BE01', typ: 'P', datum_hlaseni: '2026-01-01', termin_obnoveni: '', nahrazujici_lp: '' },
    { kod_sukl: '0001', nazev: 'PARALEN', atc: 'N02BE01', typ: 'O', datum_hlaseni: '2026-03-01', termin_obnoveni: '', nahrazujici_lp: '' },
    // Aspirin má jen přerušení.
    { kod_sukl: '0002', nazev: 'ASPIRIN', atc: 'N02BA01', typ: 'P', datum_hlaseni: '2026-04-01', termin_obnoveni: '', nahrazujici_lp: '' },
  ];
  const agg = aggregateMr(rows, new Date('2026-05-01T00:00:00Z'));
  assert.equal(agg.total_unique_lp, 2);
  assert.equal(agg.active_disruptions, 1, 'aktivní pouze ASPIRIN, PARALEN obnoven');
});

test('aggregateMr: termín obnovení v minulosti = výpadek se uzavřel', () => {
  const rows = [
    // Tento výpadek by měl mít termín obnovení v minulosti, takže není aktivní.
    { kod_sukl: '0001', nazev: 'A', atc: 'C09AA01', typ: 'P', datum_hlaseni: '2025-06-01', termin_obnoveni: '2025-12-31', nahrazujici_lp: '' },
    // Tento je aktivní (termín v budoucnu).
    { kod_sukl: '0002', nazev: 'B', atc: 'C09AA02', typ: 'P', datum_hlaseni: '2026-04-01', termin_obnoveni: '2026-09-01', nahrazujici_lp: '' },
    // Tento je aktivní (prázdný termín).
    { kod_sukl: '0003', nazev: 'C', atc: 'J01CA04', typ: 'K', datum_hlaseni: '2026-04-01', termin_obnoveni: '', nahrazujici_lp: '0099' },
  ];
  const agg = aggregateMr(rows, new Date('2026-05-01T00:00:00Z'));
  assert.equal(agg.active_disruptions, 2);
  assert.equal(agg.active_with_substitute_pct, 50, '1 ze 2 má náhradu');
});

test('aggregateMr: 30denní okno spočítá nová hlášení P/K i obnovení O', () => {
  const now = new Date('2026-05-01T00:00:00Z');
  const rows = [
    { kod_sukl: '0001', nazev: 'A', atc: 'C', typ: 'P', datum_hlaseni: '2026-04-15', termin_obnoveni: '', nahrazujici_lp: '' },
    { kod_sukl: '0002', nazev: 'B', atc: 'C', typ: 'K', datum_hlaseni: '2026-04-20', termin_obnoveni: '', nahrazujici_lp: '' },
    { kod_sukl: '0003', nazev: 'C', atc: 'C', typ: 'O', datum_hlaseni: '2026-04-25', termin_obnoveni: '', nahrazujici_lp: '' },
    { kod_sukl: '0004', nazev: 'D', atc: 'C', typ: 'P', datum_hlaseni: '2025-01-01', termin_obnoveni: '', nahrazujici_lp: '' }, // mimo okno
  ];
  const agg = aggregateMr(rows, now);
  assert.equal(agg.new_disruptions_30d, 2);
  assert.equal(agg.resolutions_30d, 1);
});

test('aggregateMr: top ATC seskupuje podle 1. písmena', () => {
  const rows = [
    { kod_sukl: '01', nazev: 'A', atc: 'N02BE01', typ: 'P', datum_hlaseni: '2026-04-01', termin_obnoveni: '', nahrazujici_lp: '' },
    { kod_sukl: '02', nazev: 'B', atc: 'N05AB02', typ: 'P', datum_hlaseni: '2026-04-02', termin_obnoveni: '', nahrazujici_lp: '' },
    { kod_sukl: '03', nazev: 'C', atc: 'N06AA09', typ: 'K', datum_hlaseni: '2026-04-03', termin_obnoveni: '', nahrazujici_lp: '' },
    { kod_sukl: '04', nazev: 'D', atc: 'C09AA01', typ: 'P', datum_hlaseni: '2026-04-04', termin_obnoveni: '', nahrazujici_lp: '' },
  ];
  const agg = aggregateMr(rows, new Date('2026-05-01T00:00:00Z'));
  assert.equal(agg.top_atc_groups[0].atc, 'N');
  assert.equal(agg.top_atc_groups[0].count, 3);
  assert.equal(agg.top_atc_groups[0].label, ATC_GROUPS.N);
});

test('aggregateMr: prázdný vstup', () => {
  const agg = aggregateMr([], new Date('2026-05-01T00:00:00Z'));
  assert.equal(agg.total_unique_lp, 0);
  assert.equal(agg.active_disruptions, 0);
  assert.equal(agg.active_share_pct, 0);
  assert.equal(agg.active_with_substitute_pct, 0);
  assert.deepEqual(agg.top_atc_groups, []);
});

test('aggregateMr: sample je omezen na 20 záznamů', () => {
  const rows = [];
  for (let i = 0; i < 50; i++) {
    rows.push({
      kod_sukl: String(1000 + i),
      nazev: `LP ${i}`,
      atc: 'C',
      typ: 'P',
      datum_hlaseni: '2026-04-01',
      termin_obnoveni: '',
      nahrazujici_lp: '',
    });
  }
  const agg = aggregateMr(rows, new Date('2026-05-01T00:00:00Z'));
  assert.equal(agg.active_disruptions, 50);
  assert.equal(agg.sample.length, 20);
});

// --- ATC_GROUPS sanity ---

test('ATC_GROUPS pokrývá hlavní WHO ATC třídy A–V', () => {
  for (const letter of ['A', 'B', 'C', 'D', 'G', 'H', 'J', 'L', 'M', 'N', 'P', 'R', 'S', 'V']) {
    assert.ok(ATC_GROUPS[letter], `chybí popisek pro ATC třídu ${letter}`);
  }
});

// --- fetchSuklMr s injektovaným fetch ---

test('fetchSuklMr: úspěšný flow vrací aggregated', async () => {
  const csv = [
    'KOD_SUKL;NAZEV;ATC;TYP_OZNAMENI;DATUM_HLASENI;TERMIN_OBNOVENI;NAHRAZUJICI_LP',
    '0001;LP A;N02BE01;P;2026-04-01;;0099',
    '0002;LP B;C09AA01;K;2026-04-02;;',
    '0003;LP C;J01CA04;O;2026-04-03;;',
  ].join('\n');

  const fakeFetch = async () => ({
    ok: true, status: 200,
    async text() { return csv; },
    async json() { return null; },
  });

  const result = await fetchSuklMr({
    force: true,
    fetchImpl: fakeFetch,
    endpoint: 'https://example.test/mr.csv',
  });

  assert.ok(result.aggregated, 'aggregated should be present');
  assert.equal(result.aggregated.total_unique_lp, 3);
  assert.equal(result.aggregated.active_disruptions, 2, 'P + K aktivní, O nikoli');
});

test('fetchSuklMr: při selhání všech endpointů vrátí null bez throw', async () => {
  const fakeFetch = async () => ({
    ok: false, status: 404,
    async text() { return ''; },
    async json() { throw new Error(); },
  });
  const result = await fetchSuklMr({
    force: true,
    fetchImpl: fakeFetch,
    endpoint: 'https://example.test/missing.csv',
  });
  assert.equal(result.aggregated, null);
  assert.ok(result.error, 'error message expected');
});
