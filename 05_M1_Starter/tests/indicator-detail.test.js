// Testy pro detailní stránku indikátoru — ověřuje, že vybrané indikátory
// mají atributy, které detail page očekává (signal, benchmark, trend),
// a že explainer dostupnost_pravni_ramec je dostatečně odborný.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

test('mortalita_kojenecka: existuje v indicators.json se správnými atributy', () => {
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'indicators.json'), 'utf8'));
  const ind = data.indicators.find(i => i.id === 'mortalita_kojenecka');
  assert.ok(ind, 'indikátor mortalita_kojenecka není v indicators.json');
  assert.equal(ind.area, 'Výsledky');
  assert.equal(ind.direction, 'lower_is_better');
  assert.ok(ind.benchmark?.oecd != null);
  assert.ok(Array.isArray(ind.trend) && ind.trend.length >= 2);
});

test('mortalita_kojenecka: má metodickou kartu', () => {
  const cardPath = path.join(ROOT, 'indicators', 'mortalita_kojenecka.json');
  assert.ok(fs.existsSync(cardPath), 'chybí metodická karta');
  const card = JSON.parse(fs.readFileSync(cardPath, 'utf8'));
  assert.ok(card.id === 'mortalita_kojenecka');
  assert.ok(card.definition && card.definition.length > 50, 'pole definition má být nontrivální');
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

test('explainers.json: dostupnost_pravni_ramec je odborný long-form explainer', () => {
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'explainers.json'), 'utf8'));
  const e = data.explainers.find(x => x.id === 'dostupnost_pravni_ramec');
  assert.ok(e, 'chybí explainer dostupnost_pravni_ramec');
  // Long-form má buď tldr_expert nebo long_form sections — připustíme oboje
  const expertText = e.tldr_expert ?? '';
  const sectionsText = Array.isArray(e.long_form?.sections)
    ? e.long_form.sections.map(s => s.body ?? '').join(' ')
    : '';
  assert.ok(expertText.length + sectionsText.length > 800,
    'dostupnost_pravni_ramec má být důkladný (≥ 800 znaků celkového odborného obsahu)');
});
