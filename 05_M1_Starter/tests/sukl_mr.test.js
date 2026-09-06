// Testy pro SÚKL MR fetcher (výpadky léčiv).
// Pokrývají parseMrCsv, aggregateMr (dedup, filtrování aktivních výpadků,
// 30denní okno, top ATC) a fetchSuklMr s injektovaným fetch.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  parseMrCsv,
  aggregateMr,
  fetchSuklMr,
  feedLagDays,
  isUsableRawCache,
  isImplausibleJump,
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

test('aggregateMr: POSLEDNI_PLATNE_HLASENI=ANO má přednost před pozdějším datem (#1120)', () => {
  // Feed sám označuje platné hlášení; řádek ANO vyhrává i proti novějšímu datu.
  const rows = [
    { kod_sukl: '0001', nazev: 'X', atc: 'N02BE01', typ: 'P', datum_hlaseni: '2026-02-01', termin_obnoveni: '', nahrazujici_lp: '', posledni_platne: 'ANO' },
    { kod_sukl: '0001', nazev: 'X', atc: 'N02BE01', typ: 'O', datum_hlaseni: '2026-03-01', termin_obnoveni: '', nahrazujici_lp: '', posledni_platne: 'NE' },
  ];
  const agg = aggregateMr(rows, new Date('2026-05-01T00:00:00Z'));
  assert.equal(agg.active_disruptions, 1, 'platné hlášení (ANO) je přerušení → aktivní výpadek');
});

test('aggregateMr: deduplikace nezávisí na pořadí řádků v CSV (#1120)', () => {
  // Dva řádky na stejném maximálním datu s konfliktními typy — o výsledku
  // rozhoduje sloupec ANO, ne to, který řádek je v souboru dřív.
  const a = { kod_sukl: '0002', nazev: 'Y', atc: 'C09AA01', typ: 'P', datum_hlaseni: '2026-04-01', termin_obnoveni: '', nahrazujici_lp: '', posledni_platne: 'ANO' };
  const b = { kod_sukl: '0002', nazev: 'Y', atc: 'C09AA01', typ: 'O', datum_hlaseni: '2026-04-01', termin_obnoveni: '', nahrazujici_lp: '', posledni_platne: 'NE' };
  const agg1 = aggregateMr([a, b], new Date('2026-05-01T00:00:00Z'));
  const agg2 = aggregateMr([b, a], new Date('2026-05-01T00:00:00Z'));
  assert.equal(agg1.active_disruptions, agg2.active_disruptions);
  assert.equal(agg1.active_disruptions, 1, 'ANO řádek je přerušení → aktivní, bez ohledu na pořadí');
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
  assert.equal(agg.active_disruptions, 1, 'aktivní jen B (P s budoucím termínem); K se nepočítá');
  assert.equal(agg.discontinued_total, 1, 'K se eviduje zvlášť jako trvalé ukončení');
});

test('aggregateMr: K (ukončení) není aktivní výpadek — kumulativní stock se nezapočítá', () => {
  const rows = [
    { kod_sukl: '0001', nazev: 'STARY LP', atc: 'A02BC01', typ: 'K', datum_hlaseni: '2010-01-01', termin_obnoveni: '', nahrazujici_lp: '' },
    { kod_sukl: '0002', nazev: 'VYPADEK', atc: 'N02BE01', typ: 'P', datum_hlaseni: '2026-04-01', termin_obnoveni: '', nahrazujici_lp: '0099' },
  ];
  const agg = aggregateMr(rows, new Date('2026-05-01T00:00:00Z'));
  assert.equal(agg.active_disruptions, 1);
  assert.equal(agg.discontinued_total, 1);
  assert.equal(agg.active_with_substitute_pct, 100);
});

test('aggregateMr: 30denní okno spočítá nová přerušení P i obnovení O', () => {
  const now = new Date('2026-05-01T00:00:00Z');
  const rows = [
    { kod_sukl: '0001', nazev: 'A', atc: 'C', typ: 'P', datum_hlaseni: '2026-04-15', termin_obnoveni: '', nahrazujici_lp: '' },
    { kod_sukl: '0002', nazev: 'B', atc: 'C', typ: 'K', datum_hlaseni: '2026-04-20', termin_obnoveni: '', nahrazujici_lp: '' },
    { kod_sukl: '0003', nazev: 'C', atc: 'C', typ: 'O', datum_hlaseni: '2026-04-25', termin_obnoveni: '', nahrazujici_lp: '' },
    { kod_sukl: '0004', nazev: 'D', atc: 'C', typ: 'P', datum_hlaseni: '2025-01-01', termin_obnoveni: '', nahrazujici_lp: '' }, // mimo okno
  ];
  const agg = aggregateMr(rows, now);
  assert.equal(agg.new_disruptions_30d, 1, 'jen P; K je trvalé ukončení');
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
  assert.equal(agg.top_atc_groups[0].count, 2, 'K řádek se do ATC výpadků nepočítá');
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
  assert.equal(result.aggregated.active_disruptions, 1, 'jen P aktivní; K trvalé ukončení, O nikoli');
});

test('parseMrCsv: normalizuje slovní TYP_OZNAMENI a česká data (reálný formát feedu)', () => {
  const csv = [
    '"POSLEDNI_PLATNE_HLASENI";"KOD_SUKL";"NAZEV";"ATC";"TYP_OZNAMENI";"DATUM_HLASENI";"TERMIN_OBNOVENI"',
    '"ANO";"0000009";"ACYLCOFFIN";"N02BA51";"preruseni";"22.03.2026";"01.12.2026"',
    '"ANO";"0000010";"STARY";"A01AB03";"ukonceni";"05.01.2020";""',
    '"ANO";"0000011";"NOVY";"C09AA01";"zahajeni";"01.02.2026";""',
  ].join('\n');
  const out = parseMrCsv(csv);
  assert.equal(out[0].typ, 'P');
  assert.equal(out[0].datum_hlaseni, '2026-03-22');
  assert.equal(out[0].termin_obnoveni, '2026-12-01');
  assert.equal(out[1].typ, 'K');
  assert.equal(out[2].typ, 'U');
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

test('yearEndTrend: rekonstrukce aktivních přerušení k 31.12. z kumulativního feedu', async () => {
  const { yearEndTrend } = await import('../ingest/fetchers/sukl_mr.js');
  const rows = [
    // přerušen 2023, obnoven 2025 → aktivní jen na konci 2023 a 2024
    { kod_sukl: '01', typ: 'P', datum_hlaseni: '2023-05-01', termin_obnoveni: '' },
    { kod_sukl: '01', typ: 'O', datum_hlaseni: '2025-02-01', termin_obnoveni: '' },
    // přerušen 2024 dosud
    { kod_sukl: '02', typ: 'P', datum_hlaseni: '2024-08-01', termin_obnoveni: '' },
  ];
  const t = yearEndTrend(rows, 2022, 2025);
  assert.deepEqual(t, [
    { year: 2022, value: 0 },
    { year: 2023, value: 1 },
    { year: 2024, value: 2 },
    { year: 2025, value: 1 },
  ]);
});

// --- #1132: čerstvost dumpu, referenční datum a provenience cache ---

/**
 * Minimální ZIP se STORED (nekomprimovanými) položkami — unzipEntry čte
 * lokální hlavičky sekvenčně, takže central directory není potřeba.
 */
function storedZip(entries) {
  const parts = [];
  for (const [name, content] of entries) {
    const data = Buffer.from(content, 'latin1');
    const nameBuf = Buffer.from(name, 'utf8');
    const h = Buffer.alloc(30);
    h.writeUInt32LE(0x04034b50, 0);
    h.writeUInt16LE(20, 4);
    h.writeUInt16LE(0, 6);
    h.writeUInt16LE(0, 8);
    h.writeUInt32LE(0, 14);
    h.writeUInt32LE(data.length, 18);
    h.writeUInt32LE(data.length, 22);
    h.writeUInt16LE(nameBuf.length, 26);
    h.writeUInt16LE(0, 28);
    parts.push(h, nameBuf, data);
  }
  return Buffer.concat(parts);
}

function mrZip(platnost, csvRows) {
  return storedZip([
    ['mr_hlaseni.csv', [
      'POSLEDNI_PLATNE_HLASENI;KOD_SUKL;NAZEV;ATC;TYP_OZNAMENI;PLATNOST_OD;DATUM_HLASENI;NAHRAZUJICI_LP;DUVOD_PRERUSENI_UKONCENI;TERMIN_OBNOVENI',
      ...csvRows,
    ].join('\n')],
    ['mr_hlaseni_platnost.csv', `"PLATNOST"\n"${platnost}"\n`],
  ]);
}

function zipFetch(buf) {
  return async () => ({
    ok: true, status: 200,
    async arrayBuffer() { return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength); },
    async text() { return ''; },
    async json() { return null; },
  });
}

test('feedLagDays: spočítá, o kolik dní je dump pozadu', () => {
  assert.equal(feedLagDays('2026-08-07', new Date('2026-08-31T12:29:42Z')), 24);
  assert.equal(feedLagDays('2026-09-06', new Date('2026-09-06T09:20:00Z')), 0);
  assert.equal(feedLagDays('', new Date('2026-09-06T09:20:00Z')), null);
  assert.equal(feedLagDays(null, new Date('2026-09-06T09:20:00Z')), null);
});

test('isUsableRawCache: odmítne testovací fixturu, cizí endpoint i starý dump (#1132)', () => {
  const now = new Date('2026-09-06T09:00:00Z');
  const bigCsv = 'x'.repeat(200_000);
  const ok = { url: 'https://opendata.sukl.cz/soubory/MR/mr.zip', csv: bigCsv, feed_platnost: '2026-09-05' };
  assert.equal(isUsableRawCache(ok, { url: 'https://opendata.sukl.cz/soubory/MR/mr.zip', now }), true);
  // fixtura z unit testů (třířádkové CSV z example.test) — nesmí projít jako feed
  assert.equal(isUsableRawCache(
    { url: 'https://example.test/mr.csv', csv: 'KOD_SUKL;TYP_OZNAMENI\n0001;P' },
    { url: 'https://opendata.sukl.cz/soubory/MR/mr.zip', now },
  ), false);
  assert.equal(isUsableRawCache({ ...ok, feed_platnost: '2026-08-07' },
    { url: 'https://opendata.sukl.cz/soubory/MR/mr.zip', now }), false, 'dump 30 dní pozadu');
  assert.equal(isUsableRawCache({ ...ok, url: 'https://example.test/mr.csv' },
    { url: 'https://opendata.sukl.cz/soubory/MR/mr.zip', now }), false, 'jiný endpoint');
});

test('isImplausibleJump: skok, který za dané dny vzniknout nemohl (#1132)', () => {
  assert.equal(isImplausibleJump(1336, 1418, 7), true, '−82 za týden neprojde');
  assert.equal(isImplausibleJump(1418, 1376, 7), false, '+42 za týden je běžný pohyb');
  assert.equal(isImplausibleJump(1550, 1404, 90), false, 'kvartální posun projde');
  assert.equal(isImplausibleJump(1404, undefined, 7), false, 'bez minulého agregátu se nehlídá');
});

test('fetchSuklMr: zastaralý dump nepřepíše agregát (#1132)', async () => {
  const buf = mrZip('07.08.2026', [
    'ANO;0001;LP A;N02BE01;preruseni;01.08.2026;01.08.2026;;Výrobní důvody;31.08.2026',
  ]);
  const result = await fetchSuklMr({
    force: true,
    fetchImpl: zipFetch(buf),
    endpoint: 'https://example.test/mr.zip',
    now: new Date('2026-08-31T12:29:42Z'),
  });
  assert.equal(result.aggregated, null, 'starý dump se nesmí zaingestovat');
  assert.match(result.error, /PLATNOST/);
});

test('fetchSuklMr: agreguje proti PLATNOSTI dumpu, ne proti systémovému času (#1132)', async () => {
  // Hlášení s TERMIN_OBNOVENI 30. 9. — k platnosti dumpu (6. 9.) je výpadek
  // aktivní. Se systémovým časem 20. 10. by ho stará implementace „uzavřela“.
  const buf = mrZip('06.09.2026', [
    'ANO;0001;LP A;N02BE01;preruseni;01.08.2026;01.08.2026;;Výrobní důvody;30.09.2026',
    'ANO;0002;LP B;C09AA01;preruseni;01.08.2026;01.08.2026;;Výrobní důvody;',
  ]);
  const result = await fetchSuklMr({
    force: true,
    fetchImpl: zipFetch(buf),
    endpoint: 'https://example.test/mr.zip',
    now: new Date('2026-09-06T09:20:00Z'),
  });
  assert.equal(result.aggregated.active_disruptions, 2);

  const { readFileSync } = await import('node:fs');
  const { cachePath } = await import('../ingest/lib/cache.js');
  const agg = JSON.parse(readFileSync(cachePath('sukl_mr_aggregated.json'), 'utf8'));
  assert.equal(agg.feed_platnost, '2026-09-06');
  assert.equal(agg.reference_date, '2026-09-06');
  assert.ok(agg.fetched_at, 'fetched_at musí být v agregátu — transform.js ho čte odsud');
  assert.equal(agg.rows_parsed, 2);
});
