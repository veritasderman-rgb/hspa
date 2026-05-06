// Testy datového kontraktu pro nový indikátor kojenecka_umrtnost,
// rozšířená pole metodické karty (determinants/importance) a regionální dataset.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

test('kojenecka_umrtnost: existuje v indicators.json se správnými atributy', () => {
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'indicators.json'), 'utf8'));
  const ind = data.indicators.find(i => i.id === 'kojenecka_umrtnost');
  assert.ok(ind, 'indikátor kojenecka_umrtnost není v indicators.json');
  assert.equal(ind.area, 'Výsledky');
  assert.equal(ind.direction, 'lower_is_better');
  assert.equal(ind.signal, 'good');
  assert.ok(ind.benchmark?.oecd != null);
  assert.ok(Array.isArray(ind.trend) && ind.trend.length >= 2);
});

test('kojenecka_umrtnost: má metodickou kartu s rozšířenými poli', () => {
  const cardPath = path.join(ROOT, 'indicators', 'kojenecka_umrtnost.json');
  assert.ok(fs.existsSync(cardPath), 'chybí metodická karta');
  const card = JSON.parse(fs.readFileSync(cardPath, 'utf8'));
  assert.ok(card.determinants && card.determinants.length > 200, 'pole determinants má být nontrivální');
  assert.ok(card.importance && card.importance.length > 200, 'pole importance má být nontrivální');
  assert.ok(card.data_source?.regional, 'metodická karta má mít zdroj regionálních dat');
});

test('regions.json: dataset pro kojenecka_umrtnost se 14 kraji', () => {
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'regions.json'), 'utf8'));
  const ds = data.datasets.find(d => d.id === 'kojenecka_umrtnost' || d.linked_indicator_id === 'kojenecka_umrtnost');
  assert.ok(ds, 'chybí regionální dataset pro kojenecka_umrtnost');
  assert.equal(ds.regions.length, 14);
  assert.equal(ds.direction, 'lower_is_better');
  // Praha by měla být v zelené zóně (lepší než průměr)
  const praha = ds.regions.find(r => r.code === 'CZ010');
  assert.ok(praha.value <= ds.country_avg, 'Praha by měla mít hodnotu ≤ průměr');
});

test('regions.json: nové datasety pro cekaci_doba_kycel, kuractvi_denni, vakcinace_mmr_deti', () => {
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'regions.json'), 'utf8'));
  const ids = new Set(data.datasets.map(d => d.linked_indicator_id ?? d.id));
  for (const expected of ['cekaci_doba_kycel', 'kuractvi_denni', 'vakcinace_mmr_deti', 'kojenecka_umrtnost']) {
    assert.ok(ids.has(expected), `chybí regionální dataset propojený s ${expected}`);
  }
});

test('regions.json: každý dataset má 14 krajských záznamů s validními NUTS-3 kódy', () => {
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'regions.json'), 'utf8'));
  const validCodes = new Set([
    'CZ010', 'CZ020', 'CZ031', 'CZ032', 'CZ041', 'CZ042', 'CZ051',
    'CZ052', 'CZ053', 'CZ063', 'CZ064', 'CZ071', 'CZ072', 'CZ080'
  ]);
  for (const ds of data.datasets) {
    assert.equal(ds.regions.length, 14, `dataset ${ds.id}: očekáváno 14 krajů, je ${ds.regions.length}`);
    for (const r of ds.regions) {
      assert.ok(validCodes.has(r.code), `dataset ${ds.id}: neznámý NUTS-3 kód ${r.code}`);
      assert.equal(typeof r.value, 'number', `dataset ${ds.id}, kraj ${r.code}: hodnota není number`);
    }
  }
});

test('explainers.json: nový explainer dostupnost_pece je odborný a dobře propojený', () => {
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'explainers.json'), 'utf8'));
  const e = data.explainers.find(x => x.id === 'dostupnost_pece');
  assert.ok(e, 'chybí explainer dostupnost_pece');
  assert.equal(e.category, 'process');
  // Ověř délku odborného textu — má smysl jen pokud je odborný
  assert.ok(e.tldr_expert.length > 800, 'tldr_expert má být důkladný (> 800 znaků)');
  assert.ok(e.tldr_policy.length > 800, 'tldr_policy má být důkladný');
  assert.ok(Array.isArray(e.absurdity_examples) && e.absurdity_examples.length >= 3,
    'dostupnost_pece má mít ≥ 3 citace z primárních zdrojů');
  assert.ok(Array.isArray(e.documents) && e.documents.length >= 5,
    'dostupnost_pece má mít ≥ 5 odkazů na primární zdroje');
});
