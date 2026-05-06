// Testy ověřující, že nové datové extenze (HPV indikátor, krajské datasety,
// dlouhý explainer) jsou konzistentní s metodickými kartami a frontendem.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const indicators = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'indicators.json'), 'utf8'));
const regions = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'regions.json'), 'utf8'));
const explainers = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'explainers.json'), 'utf8'));

// ===== HPV indikátor =====

test('HPV: indikátor vakcinace_hpv_divky existuje v data/indicators.json', () => {
  const hpv = indicators.indicators.find(i => i.id === 'vakcinace_hpv_divky');
  assert.ok(hpv, 'vakcinace_hpv_divky musí být v indicators.json');
  assert.equal(hpv.area, 'Procesy');
  assert.equal(hpv.unit, '%');
  assert.equal(hpv.direction, 'higher_is_better');
  assert.ok(Array.isArray(hpv.trend) && hpv.trend.length >= 3);
});

test('HPV: metodická karta indicators/vakcinace_hpv_divky.json existuje a je validní', () => {
  const card = JSON.parse(fs.readFileSync(path.join(ROOT, 'indicators', 'vakcinace_hpv_divky.json'), 'utf8'));
  assert.equal(card.id, 'vakcinace_hpv_divky');
  assert.ok(card.definition?.length > 50);
  assert.ok(card.method_notes?.length > 50);
  assert.ok(card.data_source?.primary?.endpoint?.includes('ecdc'),
    'primární zdroj má být ECDC Vaccine Tracker');
  assert.ok(Array.isArray(card.stewards));
  assert.ok(card.stewards.includes('SZÚ'));
});

test('HPV: má krajský dataset v regions.json', () => {
  const ds = regions.datasets.find(d => d.indicator_id === 'vakcinace_hpv_divky');
  assert.ok(ds, 'krajský dataset pro HPV musí existovat');
  assert.equal(ds.regions.length, 14, '14 krajů NUTS-3');
  // Každý region musí mít code + name + value
  for (const r of ds.regions) {
    assert.ok(r.code?.startsWith('CZ0'));
    assert.ok(r.name?.length > 0);
    assert.equal(typeof r.value, 'number');
  }
});

// ===== Regiony — kompletní pokrytí =====

test('regions.json: každý dataset má 14 krajů s validními NUTS-3 kódy', () => {
  const validCodes = new Set([
    'CZ010', 'CZ020', 'CZ031', 'CZ032', 'CZ041', 'CZ042', 'CZ051',
    'CZ052', 'CZ053', 'CZ063', 'CZ064', 'CZ071', 'CZ072', 'CZ080',
  ]);
  for (const ds of regions.datasets) {
    assert.equal(ds.regions.length, 14, `${ds.id}: má ${ds.regions.length} krajů místo 14`);
    const codes = new Set(ds.regions.map(r => r.code));
    for (const c of validCodes) {
      assert.ok(codes.has(c), `${ds.id}: chybí kód ${c}`);
    }
  }
});

test('regions.json: indicator_id (pokud uveden) odkazuje na existující indikátor', () => {
  const indIds = new Set(indicators.indicators.map(i => i.id));
  for (const ds of regions.datasets) {
    if (ds.indicator_id) {
      assert.ok(indIds.has(ds.indicator_id),
        `regions.${ds.id}: indicator_id '${ds.indicator_id}' neexistuje v indicators.json`);
    }
  }
});

test('regions.json: alespoň 8 krajských datasetů (původní 5 + 7 nových)', () => {
  assert.ok(regions.datasets.length >= 8,
    `expected ≥8 datasets, got ${regions.datasets.length}`);
});

// ===== Nový explainer dostupnost_pravni_ramec =====

test('explainers.json: dostupnost_pravni_ramec existuje', () => {
  const e = explainers.explainers.find(x => x.id === 'dostupnost_pravni_ramec');
  assert.ok(e, 'explainer musí existovat');
  assert.equal(e.category, 'process');
});

test('explainers.json: dostupnost_pravni_ramec má dlouhý odborný obsah ≥4 A4 (≥1400 slov)', () => {
  const e = explainers.explainers.find(x => x.id === 'dostupnost_pravni_ramec');
  assert.ok(Array.isArray(e.long_form), 'musí mít long_form');
  let words = 0;
  for (const sec of e.long_form) {
    assert.ok(sec.heading?.length > 0);
    assert.ok(Array.isArray(sec.paragraphs));
    for (const p of sec.paragraphs) {
      words += p.split(/\s+/).filter(Boolean).length;
    }
  }
  assert.ok(words >= 1400, `slov: ${words} (čekáno ≥1400 = ~4 A4)`);
});

test('explainers.json: dostupnost_pravni_ramec linked_indicators existují', () => {
  const e = explainers.explainers.find(x => x.id === 'dostupnost_pravni_ramec');
  const indIds = new Set(indicators.indicators.map(i => i.id));
  for (const id of e.linked_indicators ?? []) {
    assert.ok(indIds.has(id),
      `dostupnost_pravni_ramec.linked_indicators: '${id}' neexistuje`);
  }
});

test('explainers.json: dostupnost_pravni_ramec má alespoň 4 absurdity_examples + ≥10 documents', () => {
  const e = explainers.explainers.find(x => x.id === 'dostupnost_pravni_ramec');
  assert.ok((e.absurdity_examples ?? []).length >= 4);
  assert.ok((e.documents ?? []).length >= 10);
  // Každá citace musí mít zdroj a URL
  for (const ex of e.absurdity_examples) {
    assert.ok(ex.source?.length > 5, 'absurdity má source');
    assert.ok(ex.url?.startsWith('http'), 'absurdity má URL');
    assert.ok(ex.quote?.length > 30, 'absurdity má citaci');
  }
});

test('explainers.json: dostupnost_pravni_ramec má timeline procesu s historií zákonů', () => {
  const e = explainers.explainers.find(x => x.id === 'dostupnost_pravni_ramec');
  assert.equal(e.process?.type, 'timeline');
  assert.ok((e.process?.steps ?? []).length >= 6);
});

// ===== Cross-konzistence: každý indikátor v indicators.json má kartu =====

test('Konzistence: každý indikátor má metodickou kartu (po přidání HPV)', () => {
  const cardFiles = fs.readdirSync(path.join(ROOT, 'indicators')).filter(f => f.endsWith('.json'));
  const cardIds = new Set(cardFiles.map(f => f.replace(/\.json$/, '')));
  for (const ind of indicators.indicators) {
    assert.ok(cardIds.has(ind.id),
      `indikátor '${ind.id}' nemá metodickou kartu indicators/${ind.id}.json`);
  }
});
