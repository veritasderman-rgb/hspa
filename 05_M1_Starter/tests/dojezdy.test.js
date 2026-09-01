// Dojezdová analýza — jádro výpočtu nad syntetickými místy.

import test from 'node:test';
import assert from 'node:assert/strict';

import { buildDojezdy, SCENARIOS, DOJEZD_CATEGORIES, THRESHOLD_KM } from '../ingest/lib/dojezdy.js';

const NONSTOP = { kind: 'weekly', week: Object.fromEntries(
  ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun', 'holiday'].map(d => [d, [['00:00', '24:00']]])) };
const WEEKEND_NOON = { kind: 'weekly', week: { mon: [], tue: [], wed: [], thu: [], fri: [],
  sat: [['10:00', '16:00']], sun: [['10:00', '16:00']], holiday: [['10:00', '16:00']] } };

const PLACES = [
  { category: 'lps_dospeli', lat: 50.0, lon: 14.4, hours: NONSTOP },          // „Praha“, nonstop
  { category: 'lps_dospeli', lat: 49.2, lon: 16.6, hours: WEEKEND_NOON },     // „Brno“, jen víkendové poledne
  { category: 'lps_deti', lat: 50.0, lon: 14.4, hours: WEEKEND_NOON },
  { category: 'lps_dospeli', lat: 49.8, lon: 15.5, hours: null },             // bez hodin — nesmí se počítat
  { category: 'ambulance_denni', lat: 49.2, lon: 16.6, hours: NONSTOP },      // jiná kategorie — nesmí se počítat
];
// [name, lat, lon, okres]
const OBCE = [
  ['U Prahy', 50.05, 14.45, 'Praha-východ'],
  ['U Brna', 49.19, 16.61, 'Brno-venkov'],
];

test('dojezdy · otevřenost se vyhodnocuje pro každý scénář zvlášť', () => {
  const { summary } = buildDojezdy(PLACES, OBCE);
  // Nonstop pražská LPS je otevřená vždy; brněnská jen v sobotu v poledne.
  assert.equal(summary.national.streda_20.lps_dospeli.open, 1);
  assert.equal(summary.national.sobota_12.lps_dospeli.open, 2);
  assert.equal(summary.national.sobota_23.lps_dospeli.open, 1);
});

test('dojezdy · místo bez hodin ani cizí kategorie do sítě nepatří', () => {
  // Bez hodin nevíme, KDY slouží — a „nevíme“ nesmí vylepšit dojezd.
  // Denní ambulance není pohotovostní služba podle vyhlášky.
  const { summary } = buildDojezdy(PLACES, OBCE);
  assert.equal(summary.national.sobota_23.lps_dospeli.open, 1,
    'v noci smí být otevřená jen nonstop LPS');
});

test('dojezdy · vzdálenost k nejbližšímu otevřenému, ne k nejbližšímu vůbec', () => {
  const { perObec } = buildDojezdy(PLACES, OBCE);
  const uBrna = perObec.obce.find(o => o[0] === 'U Brna');
  const idx = (scId, cat) => SCENARIOS.findIndex(s => s.id === scId) * DOJEZD_CATEGORIES.length
    + DOJEZD_CATEGORIES.indexOf(cat);
  const dStreda = uBrna[2][idx('streda_20', 'lps_dospeli')] / 10;
  const dSobota = uBrna[2][idx('sobota_12', 'lps_dospeli')] / 10;
  // V sobotu v poledne má „U Brna“ otevřeno za rohem; ve středu večer musí
  // do Prahy — přes 150 km.
  assert.ok(dSobota < 3, `sobota: čekáno pár km, je ${dSobota}`);
  assert.ok(dStreda > 100, `středa: čekána cesta do Prahy, je ${dStreda}`);
});

test('dojezdy · okresní agregace nese medián, max i počet nad hranicí', () => {
  const { summary } = buildDojezdy(PLACES, OBCE);
  const brno = summary.okresy.find(o => o.okres === 'Brno-venkov');
  const cell = brno.stats['streda_20|lps_dospeli'];
  assert.ok(cell.median > 100);
  assert.ok(cell.max >= cell.median);
  assert.equal(cell.over20, 1);
  assert.equal(summary.threshold_km, THRESHOLD_KM);
});

test('dojezdy · referenční data nejsou státní svátky a jsou deterministická', () => {
  for (const sc of SCENARIOS) {
    assert.match(sc.at, /^2026-09-\d{2}T\d{2}:00:00$/);
  }
  // Dvakrát stejný vstup ⇒ bit po bitu stejný výstup (artefakt jde do gitu).
  const a = JSON.stringify(buildDojezdy(PLACES, OBCE));
  const b = JSON.stringify(buildDojezdy(PLACES, OBCE));
  assert.equal(a, b);
});
