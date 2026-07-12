// Testy datasetu data/barometr.json a validátoru ingest/validate-barometr.js.
// Enumy a invarianty vycházejí z docs/metodika-barometr.md (§3, §4, §7).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  validateBarometr,
  VALID_STAV,
  VALID_VERDIKT,
  VALID_DIRECTION_WANTED,
} from '../ingest/validate-barometr.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'barometr.json'), 'utf8'));
const indicators = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'indicators.json'), 'utf8'));
const legislativa = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'legislativa.json'), 'utf8'));

const indicatorIds = new Set(indicators.indicators.map(i => i.id));
const legislationIds = new Set([
  ...(legislativa.items ?? []).map(x => x.id),
  ...(legislativa.plan_items ?? []).map(x => x.id),
]);
const refs = { indicatorIds, legislationIds };

// --- Enumy odpovídají metodice (docs/metodika-barometr.md §7) ---

test('barometr: enumy stavů a verdiktů = kanonický výčet z metodiky', () => {
  assert.deepEqual(VALID_STAV, [
    'nema_meritelny_obsah',
    'ceka_na_data',
    'plni_se',
    'bez_pohybu',
    'opacny_smer',
    'splneno',
  ]);
  assert.deepEqual(VALID_VERDIKT, [
    'sedi_s_daty',
    'nesedi',
    'zavadejici_kontext',
    'neoveritelne',
  ]);
  assert.deepEqual(VALID_DIRECTION_WANTED, ['higher_is_better', 'lower_is_better']);
});

// --- Reálný dataset prochází validací ---

test('barometr: data/barometr.json je validní', () => {
  const errors = validateBarometr(data, refs);
  assert.deepEqual(errors, [], `neočekávané chyby:\n${errors.join('\n')}`);
});

test('barometr: obsahuje pilotní závazky (BAR3) a fixture výrok (do BAR4)', () => {
  // BAR3 nahradil fixture commitment pilotní sadou závazků z programového prohlášení
  assert.ok(data.commitments.length >= 8, 'pilotní sada má mít 8–12 závazků');
  assert.ok(data.commitments.every(c => !c.id.startsWith('fixture-')), 'fixture závazky nahrazeny reálnými');
  // Statement fixture zůstává, dokud ho BAR4 nenahradí pilotními výroky
  assert.ok(data.statements.length >= 1);
});

// --- Minimální platný fixture (in-memory) ---

function validBase() {
  return {
    version: '1.0',
    generated_at: '2026-07-09T00:00:00Z',
    meta: {
      source: { nazev: 'X', url: 'https://x', datum: '2025-01-01' },
      changelog: [{ datum: '2026-07-09', polozka: 'meta', zmena: 'init', duvod: 'init' }],
    },
    commitments: [{
      id: 'c1',
      citace_verbatim: 'doslovná citace',
      zdroj: { nazev: 'Z', url: 'https://z', datum: '2025-01-01' },
      oblast: 'Výsledky',
      interpretace: 'checkpoint',
      linked_indicators: [{ id: 'ind_a', baseline_value: 79.8, baseline_year: 2023, direction_wanted: 'higher_is_better' }],
      legislativa_ids: [],
      stav: 'ceka_na_data',
      stav_duvod: null,
      stav_od: '2026-07-09',
      historie: [],
    }],
    statements: [{
      id: 's1',
      vyrok_verbatim: 'doslovný výrok',
      kdo: 'Osoba',
      funkce: 'ministr',
      kdy: '2026-07-01',
      kde: { nazev: 'Zdroj', url: 'https://src' },
      verdikt: 'neoveritelne',
      verdikt_zduvodneni: 'chybí data k ústřednímu tvrzení',
      linked_indicators: [],
      zdroje: [],
    }],
  };
}

const REFS = { indicatorIds: new Set(['ind_a']), legislationIds: new Set(['leg_a']) };

test('validateBarometr: minimální platný dataset → 0 chyb', () => {
  assert.deepEqual(validateBarometr(validBase(), REFS), []);
});

test('validateBarometr: neplatný stav → chyba', () => {
  const d = validBase();
  d.commitments[0].stav = 'plni_se_hodne';
  const errs = validateBarometr(d, REFS);
  assert.ok(errs.some(e => /neplatný stav/.test(e)), errs.join('\n'));
});

test('validateBarometr: neplatný verdikt → chyba', () => {
  const d = validBase();
  d.statements[0].verdikt = 'lze';
  const errs = validateBarometr(d, REFS);
  assert.ok(errs.some(e => /neplatný verdikt/.test(e)), errs.join('\n'));
});

test('validateBarometr: prázdná citace_verbatim → chyba', () => {
  const d = validBase();
  d.commitments[0].citace_verbatim = '   ';
  const errs = validateBarometr(d, REFS);
  assert.ok(errs.some(e => /citace_verbatim nesmí být prázdná/.test(e)), errs.join('\n'));
});

test('validateBarometr: prázdný vyrok_verbatim → chyba', () => {
  const d = validBase();
  d.statements[0].vyrok_verbatim = '';
  const errs = validateBarometr(d, REFS);
  assert.ok(errs.some(e => /vyrok_verbatim nesmí být prázdný/.test(e)), errs.join('\n'));
});

test('validateBarometr: měřitelný závazek bez checkpointu → chyba', () => {
  const d = validBase();
  d.commitments[0].linked_indicators = [];
  d.commitments[0].legislativa_ids = [];
  d.commitments[0].stav = 'plni_se';
  d.commitments[0].stav_duvod = 'x';
  const errs = validateBarometr(d, REFS);
  assert.ok(errs.some(e => /vyžaduje aspoň jeden checkpoint/.test(e)), errs.join('\n'));
});

test('validateBarometr: nema_meritelny_obsah bez checkpointu je OK', () => {
  const d = validBase();
  d.commitments[0].linked_indicators = [];
  d.commitments[0].legislativa_ids = [];
  d.commitments[0].stav = 'nema_meritelny_obsah';
  d.commitments[0].stav_duvod = 'ze slibu nelze odvodit falzifikovatelný checkpoint';
  assert.deepEqual(validateBarometr(d, REFS), []);
});

test('validateBarometr: baseline chybí u linked_indicator → chyba', () => {
  const d = validBase();
  delete d.commitments[0].linked_indicators[0].baseline_value;
  const errs = validateBarometr(d, REFS);
  assert.ok(errs.some(e => /baseline_value musí být číslo/.test(e)), errs.join('\n'));
});

test('validateBarometr: FK indikátoru neexistuje → chyba', () => {
  const d = validBase();
  d.commitments[0].linked_indicators[0].id = 'neznamy_indikator';
  const errs = validateBarometr(d, REFS);
  assert.ok(errs.some(e => /nenalezen v data\/indicators\.json/.test(e)), errs.join('\n'));
});

test('validateBarometr: FK legislativy neexistuje → chyba', () => {
  const d = validBase();
  d.commitments[0].legislativa_ids = ['neznamy_predpis'];
  const errs = validateBarometr(d, REFS);
  assert.ok(errs.some(e => /nenalezen v data\/legislativa\.json/.test(e)), errs.join('\n'));
});

test('validateBarometr: stav_duvod povinný mimo ceka_na_data', () => {
  const d = validBase();
  d.commitments[0].stav = 'bez_pohybu';
  d.commitments[0].stav_duvod = null;
  const errs = validateBarometr(d, REFS);
  assert.ok(errs.some(e => /stav_duvod je povinný/.test(e)), errs.join('\n'));
});

test('validateBarometr: verdikt_zduvodneni povinné vždy', () => {
  const d = validBase();
  d.statements[0].verdikt_zduvodneni = '';
  const errs = validateBarometr(d, REFS);
  assert.ok(errs.some(e => /verdikt_zduvodneni je povinné/.test(e)), errs.join('\n'));
});

test('validateBarometr: statement bez kde.url → chyba', () => {
  const d = validBase();
  d.statements[0].kde = { nazev: 'X' };
  const errs = validateBarometr(d, REFS);
  assert.ok(errs.some(e => /kde\.url musí být neprázdný/.test(e)), errs.join('\n'));
});

test('validateBarometr: changelog položka bez důvodu → chyba', () => {
  const d = validBase();
  d.meta.changelog[0].duvod = '';
  const errs = validateBarometr(d, REFS);
  assert.ok(errs.some(e => /changelog.*chybí důvod/.test(e)), errs.join('\n'));
});

test('validateBarometr: historie položka bez data → chyba', () => {
  const d = validBase();
  d.commitments[0].historie = [{ stav_stary: 'ceka_na_data', stav_novy: 'plni_se', duvod: 'x' }];
  const errs = validateBarometr(d, REFS);
  assert.ok(errs.some(e => /historie.*není YYYY-MM-DD/.test(e)), errs.join('\n'));
});

test('validateBarometr: duplicitní id závazku → chyba', () => {
  const d = validBase();
  d.commitments.push({ ...d.commitments[0] });
  const errs = validateBarometr(d, REFS);
  assert.ok(errs.some(e => /duplicate id/.test(e)), errs.join('\n'));
});

// ============================================================
// Frontend logika stránky Barometr (src/barometr.js) — BAR8
// Čistá logika bez DOM (init() se v node nespustí — guard typeof window).
// ============================================================

import {
  STAV_LABELS,
  VERDIKT_LABELS,
  DIRECTION_WANTED_LABELS,
  computeCurrentValue,
  computeProgress,
  computeStavStats,
  filterCommitments,
  formatSignedDelta,
} from '../src/barometr.js';

test('barometr UI: STAV_LABELS pokrývá přesně kanonický enum stavů', () => {
  assert.deepEqual(new Set(Object.keys(STAV_LABELS)), new Set(VALID_STAV));
  for (const v of Object.values(STAV_LABELS)) {
    assert.ok(v.label && v.cls, 'každý stav má label i badge třídu');
  }
});

test('barometr UI: VERDIKT_LABELS pokrývá přesně kanonický enum verdiktů', () => {
  assert.deepEqual(new Set(Object.keys(VERDIKT_LABELS)), new Set(VALID_VERDIKT));
});

test('barometr UI: DIRECTION_WANTED_LABELS pokrývá oba směry', () => {
  assert.deepEqual(new Set(Object.keys(DIRECTION_WANTED_LABELS)), new Set(VALID_DIRECTION_WANTED));
});

test('computeCurrentValue: bere poslední bod řady trend', () => {
  const ind = { value: 80.1, year: 2024, trend: [{ year: 2022, value: 79 }, { year: 2024, value: 80.1 }, { year: 2023, value: 79.8 }] };
  assert.deepEqual(computeCurrentValue(ind), { value: 80.1, year: 2024 });
});

test('computeCurrentValue: fallback na headline value bez trendu', () => {
  assert.deepEqual(computeCurrentValue({ value: 5, year: 2025 }), { value: 5, year: 2025 });
  assert.equal(computeCurrentValue(null), null);
  assert.equal(computeCurrentValue({}), null);
});

test('computeProgress: higher_is_better — růst je pokrok', () => {
  const p = computeProgress(79.8, 80.1, 'higher_is_better');
  assert.equal(p.dir, 'up');
  assert.ok(p.progress > 0);
  assert.ok(Math.abs(p.delta - 0.3) < 1e-9);
});

test('computeProgress: lower_is_better — pokles je pokrok', () => {
  const p = computeProgress(10, 8, 'lower_is_better');
  assert.equal(p.dir, 'down');
  assert.ok(p.progress > 0, 'pokles při lower_is_better = kladný pokrok');
  assert.ok(p.delta < 0);
});

test('computeProgress: beze změny → flat', () => {
  assert.equal(computeProgress(5, 5, 'higher_is_better').dir, 'flat');
  assert.equal(computeProgress(5, 'x', 'higher_is_better'), null);
});

test('computeStavStats: počítá závazky podle stavu', () => {
  const s = computeStavStats([
    { stav: 'plni_se' }, { stav: 'plni_se' }, { stav: 'opacny_smer' }, { stav: 'ceka_na_data' },
  ]);
  assert.equal(s.total, 4);
  assert.equal(s.plni_se, 2);
  assert.equal(s.opacny_smer, 1);
  assert.equal(s.ceka_na_data, 1);
  assert.equal(s.splneno, 0);
});

test('computeStavStats: prázdný / nevalidní vstup → nuly', () => {
  const s = computeStavStats(null);
  assert.equal(s.total, 0);
  assert.equal(s.plni_se, 0);
});

test('filterCommitments: filtruje podle stavu, all vrací vše', () => {
  const xs = [{ stav: 'plni_se' }, { stav: 'bez_pohybu' }, { stav: 'plni_se' }];
  assert.equal(filterCommitments(xs, 'all').length, 3);
  assert.equal(filterCommitments(xs, 'plni_se').length, 2);
  assert.equal(filterCommitments(xs, 'opacny_smer').length, 0);
});

test('formatSignedDelta: šipka a znaménko', () => {
  assert.match(formatSignedDelta(0.3), /▲/);
  assert.match(formatSignedDelta(0.3), /\+/);
  assert.match(formatSignedDelta(-2), /▼/);
  assert.equal(formatSignedDelta('x'), '');
});
