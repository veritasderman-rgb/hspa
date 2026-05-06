// Testy pokročilých vizualizací (M-STR-4, M-EXPL-4) a NOR extractoru (M-NZIS-5).

import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildTimelineModel, buildResponsibilityMatrix } from '../src/strategy-policy-views.js';
import { buildGanttModel, calculateDrg } from '../src/explainer-policy-views.js';
import { extractFromNor } from '../ingest/transform.js';
import { cachePath, ensureCacheDir, writeCache } from '../ingest/lib/cache.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// =================================================================
// M-STR-4: Timeline & Responsibility matrix
// =================================================================

test('buildTimelineModel: spočte minYear/maxYear a seřadí podle úrovně', () => {
  const items = [
    { id: 'a', title: 'A', level: 'eu', status: 'active', horizon: { from: 2025, to: 2030 } },
    { id: 'b', title: 'B', level: 'national', status: 'active', horizon: { from: 2020, to: 2035 } },
    { id: 'c', title: 'C', level: 'global', status: 'active', horizon: { from: 2015, to: 2030 } },
  ];
  const m = buildTimelineModel(items, 2026);
  assert.equal(m.minYear, 2015);
  assert.equal(m.maxYear, 2035);
  // národní by měla být první (level order: national, sector, institution, eu, global, standard)
  assert.equal(m.items[0].id, 'b');
  assert.equal(m.items[1].id, 'a');
  assert.equal(m.items[2].id, 'c');
});

test('buildTimelineModel: ignoruje strategie bez horizon', () => {
  const items = [
    { id: 'a', title: 'A', level: 'eu', status: 'active', horizon: { from: 2025, to: 2030 } },
    { id: 'b', title: 'B', level: 'standard', status: 'active' /* no horizon */ },
  ];
  const m = buildTimelineModel(items);
  assert.equal(m.items.length, 1);
});

test('buildResponsibilityMatrix: identifikuje top instituce a role', () => {
  const items = [
    { id: 's1', title: 'A', owner: 'MZČR', co_owners: ['ÚZIS'] },
    { id: 's2', title: 'B', owner: 'MZČR', co_owners: [] },
    { id: 's3', title: 'C', owner: 'WHO', co_owners: ['ÚZIS'] },
  ];
  const m = buildResponsibilityMatrix(items, { topN: 5 });
  // MZČR (2×) > ÚZIS (2×) > WHO (1×) — pořadí top podle počtu
  assert.ok(m.institutions.includes('MZČR'));
  assert.ok(m.institutions.includes('ÚZIS'));
  assert.ok(m.institutions.includes('WHO'));
  assert.equal(m.rows.length, 3);
  // S1 má MZČR jako owner a ÚZIS jako co_owner
  const r1 = m.rows.find(r => r.strategy.id === 's1');
  assert.equal(r1.roles.get('MZČR'), 'owner');
  assert.equal(r1.roles.get('ÚZIS'), 'co_owner');
});

// =================================================================
// M-EXPL-4: Gantt + DRG kalkulátor
// =================================================================

test('buildGanttModel: doplní chybějící to z následujícího from', () => {
  const steps = [
    { phase: 'A', from: '2025-01-01' },
    { phase: 'B', from: '2025-02-01' },
    { phase: 'C', from: '2025-03-01', to: '2025-03-31' },
  ];
  const m = buildGanttModel(steps);
  assert.ok(m);
  assert.equal(m.items.length, 3);
  // A.to by mělo být B.from
  assert.equal(m.items[0].to.toISOString().slice(0, 10), '2025-02-01');
});

test('buildGanttModel: prázdný vstup → null', () => {
  assert.equal(buildGanttModel([]), null);
  assert.equal(buildGanttModel(null), null);
});

test('buildGanttModel: všechny from neplatné → null místo crash (codex P1)', () => {
  // Regrese codex P1: před fixem .filter(s => s.from) vyrobilo []
  // a sorted[0].from házelo TypeError při přístupu k .from undefined.
  assert.equal(buildGanttModel([{ phase: 'X', from: 'not-a-date' }]), null);
  assert.equal(buildGanttModel([
    { phase: 'A', from: 'invalid' },
    { phase: 'B' /* no from */ },
  ]), null);
});

test('buildGanttModel: poslední krok bez to dostane default 14 dnů', () => {
  const m = buildGanttModel([{ phase: 'X', from: '2025-01-01' }]);
  assert.ok(m);
  const days = (m.items[0].to - m.items[0].from) / 86400000;
  assert.ok(days >= 13 && days <= 15);
});

test('calculateDrg: AIM bez komplikací, Praha → odhad ~ 84 600 Kč', () => {
  const r = calculateDrg({ mkn10: 'I21', severity: 'none', region: 'CZ010' });
  assert.equal(r.ok, true);
  assert.equal(r.prefix, 'I21');
  assert.equal(r.baseRw, 1.8);
  assert.equal(r.sevMultiplier, 1.0);
  assert.equal(r.regionName, 'Praha');
  // 1.8 × 47000 = 84 600
  assert.equal(r.cost, 84600);
});

test('calculateDrg: MCC zvedne úhradu na ~2.8× base', () => {
  const r = calculateDrg({ mkn10: 'I21', severity: 'mcc', region: 'CZ010' });
  // 1.8 × 2.8 × 47000 = 236 880
  assert.equal(r.finalRw, 5.04);
  assert.equal(r.cost, 236880);
});

test('calculateDrg: Karlovarský má levnější base rate než Praha (~26%)', () => {
  const praha = calculateDrg({ mkn10: 'I21', severity: 'none', region: 'CZ010' });
  const kv = calculateDrg({ mkn10: 'I21', severity: 'none', region: 'CZ041' });
  assert.ok(praha.cost > kv.cost);
  const ratio = praha.cost / kv.cost;
  assert.ok(ratio >= 1.2 && ratio <= 1.5, `expected 1.2-1.5×, got ${ratio.toFixed(2)}`);
});

test('calculateDrg: neznámý MKN-10 prefix vrátí ok=false s důvodem', () => {
  const r = calculateDrg({ mkn10: 'Z99', severity: 'none', region: 'CZ010' });
  assert.equal(r.ok, false);
  assert.ok(r.reason.includes('Z99'));
});

test('calculateDrg: chybějící mkn10 → null', () => {
  assert.equal(calculateDrg({ mkn10: '', severity: 'none', region: 'CZ010' }), null);
});

// =================================================================
// M-NZIS-5: NOR extractor
// =================================================================

beforeEach(() => {
  const f = cachePath('uzis_nor_incidence.json');
  if (fs.existsSync(f)) fs.unlinkSync(f);
});

test('extractFromNor: filtr MKN-10 prefix C18 vrátí jen kolorektální', () => {
  ensureCacheDir();
  writeCache('uzis_nor_incidence.json', {
    columns: ['rok', 'diagnoza', 'pohlavi', 'incidence'],
    records: [
      { rok: '2023', diagnoza: 'C18', pohlavi: 'T', incidence: '73.5' },
      { rok: '2023', diagnoza: 'C50', pohlavi: 'F', incidence: '145.0' },
      { rok: '2022', diagnoza: 'C18', pohlavi: 'T', incidence: '73.8' },
    ],
  });
  try {
    const out = extractFromNor('incidence_kolorektalni');
    assert.ok(out);
    assert.equal(out.year, 2023);
    assert.equal(out.value, 73.5);
    assert.equal(out.trend.length, 2); // C50 vyfiltrován
  } finally {
    fs.unlinkSync(cachePath('uzis_nor_incidence.json'));
  }
});

test('extractFromNor: bez cache → null', () => {
  assert.equal(extractFromNor('incidence_kolorektalni'), null);
});

test('extractFromNor: sex_filter bez sex sloupce v cache → null (codex P2)', () => {
  // Regrese codex P2: incidence_prsu má filter.sex='F' v metodické kartě.
  // Pokud cache nemá sloupec pohlaví, dříve se filtr tiše ignoroval a
  // hodnoty se agregovaly napříč všemi řádky → systematické vychýlení
  // (žensky kontextovaný jmenovatel × všechna data včetně mužů).
  ensureCacheDir();
  writeCache('uzis_nor_incidence.json', {
    columns: ['rok', 'diagnoza', 'incidence'], // chybí 'pohlavi'
    records: [
      { rok: '2023', diagnoza: 'C50', incidence: '145' },
      { rok: '2023', diagnoza: 'C50', incidence: '150' }, // bez sex info
    ],
  });
  try {
    // incidence_prsu vyžaduje sex='F' — bez sloupce nelze filtrovat → null
    assert.equal(extractFromNor('incidence_prsu'), null);
  } finally {
    fs.unlinkSync(cachePath('uzis_nor_incidence.json'));
  }
});

test('extractFromNor: neznámý indicator id → null', () => {
  assert.equal(extractFromNor('neexistuje'), null);
});

test('Real data: data/indicators.json obsahuje ≥42 indikátorů (40 + 2 NOR + nově přidávané)', () => {
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'indicators.json'), 'utf8'));
  assert.ok(data.indicators.length >= 42, `expected ≥42, got ${data.indicators.length}`);
  const ids = new Set(data.indicators.map(i => i.id));
  assert.ok(ids.has('incidence_kolorektalni'));
  assert.ok(ids.has('incidence_prsu'));
  assert.ok(ids.has('kojenecka_umrtnost'), 'kojenecka_umrtnost přidán v iteraci 2026-05-06');
});

// =================================================================
// M-NZIS-4: NRHZS screening (kolorektální + mamografický)
// =================================================================

import { extractFromNrhzsScreening } from '../ingest/transform.js';

beforeEach(() => {
  for (const name of ['uzis_nrhzs_screening_kolorektal.json', 'uzis_nrhzs_screening_mamograf.json']) {
    const p = cachePath(name);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
});

test('extractFromNrhzsScreening: kolorektální pokrytí (% z populace)', () => {
  ensureCacheDir();
  // Reálný formát z NRHZS otevřených dat
  writeCache('uzis_nrhzs_screening_kolorektal.json', {
    columns: ['rok', 'pohlavi', 'vek_kod', 'okres_lau_kod', 'kraj_nuts_kod', 'pocet_vysetrenych', 'populace'],
    records: [
      { rok: '2023', pohlavi: 'T', vek_kod: '50-54', okres_lau_kod: 'CZ010', kraj_nuts_kod: 'CZ010', pocet_vysetrenych: '50000', populace: '200000' },
      { rok: '2023', pohlavi: 'T', vek_kod: '55+', okres_lau_kod: 'CZ010', kraj_nuts_kod: 'CZ010', pocet_vysetrenych: '70000', populace: '300000' },
      { rok: '2024', pohlavi: 'T', vek_kod: '50-54', okres_lau_kod: 'CZ010', kraj_nuts_kod: 'CZ010', pocet_vysetrenych: '60000', populace: '200000' },
      { rok: '2024', pohlavi: 'T', vek_kod: '55+', okres_lau_kod: 'CZ010', kraj_nuts_kod: 'CZ010', pocet_vysetrenych: '80000', populace: '300000' },
    ],
  });
  try {
    const out = extractFromNrhzsScreening('screening_kolorektalni');
    assert.ok(out, 'extract returned null');
    // 2024: (60k+80k)/(200k+300k) = 140k/500k = 28 %
    assert.equal(out.value, 28);
    assert.equal(out.year, 2024);
    assert.equal(out.trend.length, 2);
    // 2023: (50k+70k)/(200k+300k) = 120k/500k = 24 %
    assert.equal(out.trend[0].value, 24);
  } finally {
    fs.unlinkSync(cachePath('uzis_nrhzs_screening_kolorektal.json'));
  }
});

test('extractFromNrhzsScreening: mamografie — sex_filter F bez populace vrátí absolutní počet', () => {
  ensureCacheDir();
  writeCache('uzis_nrhzs_screening_mamograf.json', {
    columns: ['rok', 'pohlavi', 'vek_kod', 'okres_lau_kod', 'kraj_nuts_kod', 'pocet_vysetreni'],
    records: [
      { rok: '2024', pohlavi: 'F', vek_kod: '45-49', okres_lau_kod: 'CZ010', kraj_nuts_kod: 'CZ010', pocet_vysetreni: '30000' },
      { rok: '2024', pohlavi: 'F', vek_kod: '50-54', okres_lau_kod: 'CZ010', kraj_nuts_kod: 'CZ010', pocet_vysetreni: '40000' },
      { rok: '2024', pohlavi: 'M', vek_kod: '50-54', okres_lau_kod: 'CZ010', kraj_nuts_kod: 'CZ010', pocet_vysetreni: '5' },  // šum (muži v mamografickém datasetu by neměli být — pojistka)
    ],
  });
  try {
    const out = extractFromNrhzsScreening('screening_mamograficky');
    assert.ok(out);
    // Filtruje 'F': 30k+40k = 70k, ignoruje 'M' šum
    assert.equal(out.value, 70000);
    assert.equal(out.year, 2024);
  } finally {
    fs.unlinkSync(cachePath('uzis_nrhzs_screening_mamograf.json'));
  }
});

test('extractFromNrhzsScreening: bez cache → null (fallback na seed)', () => {
  assert.equal(extractFromNrhzsScreening('screening_kolorektalni'), null);
});

test('extractFromNrhzsScreening: sex_filter bez sex sloupce v cache → null (P2 guard)', () => {
  ensureCacheDir();
  writeCache('uzis_nrhzs_screening_mamograf.json', {
    columns: ['rok', 'vek_kod', 'pocet_vysetreni'], // chybí pohlavi
    records: [{ rok: '2024', vek_kod: '50-54', pocet_vysetreni: '70000' }],
  });
  try {
    // screening_mamograficky má sex_filter='F' — guard zabraní biased agregaci
    assert.equal(extractFromNrhzsScreening('screening_mamograficky'), null);
  } finally {
    fs.unlinkSync(cachePath('uzis_nrhzs_screening_mamograf.json'));
  }
});
