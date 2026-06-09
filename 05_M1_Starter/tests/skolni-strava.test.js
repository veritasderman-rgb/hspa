// Testy datového exportu data/skolni-strava.json (nový spotřební koš dle
// vyhlášky 310/2025 Sb.) a pure logiky widgetu „Sestav školní jídelníček“
// (src/recipe-tuner.js) — bez DOM. Koš se hodnotí jako PRŮMĚR přes jídelníček,
// ne na jeden pokrm.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { recipeGroupTotals, planAverages, pestrostCounts } from '../src/recipe-tuner.js';

const data = JSON.parse(readFileSync(new URL('../data/skolni-strava.json', import.meta.url), 'utf8'));
const byId = Object.fromEntries(data.recipes.map((r) => [r.id, r]));

const BASKET_GROUPS = ['maso', 'ryby', 'mleko', 'tuky', 'cukry', 'zelenina_ovoce', 'brambory', 'celozrnne', 'lusteniny'];
const AGES = ['2-3', '4-6', '7-10', '11-14', '15+'];
const validGroups = new Set(data.foodGroups.map((g) => g.key));
const validCats = new Set(Object.keys(data.categoryLabels));

// ===== struktura dat =====

test('basketLunchTargets má 9 skupin a 5 věkových kategorií', () => {
  for (const g of BASKET_GROUPS) {
    assert.ok(data.basketLunchTargets[g], `chybí skupina ${g}`);
    for (const age of AGES) assert.equal(typeof data.basketLunchTargets[g][age], 'number', `${g}/${age}`);
  }
});

test('tolerance a finanční normativy pokrývají skupiny/věky', () => {
  for (const g of BASKET_GROUPS) assert.ok(data.tolerances[g], `tolerance ${g}`);
  for (const age of AGES) {
    const n = data.financialNormativeLunch[age];
    assert.ok(n && n.min < n.max, `normativ ${age}`);
  }
});

test('každá ingredience receptu má známou skupinu a platnou kategorii', () => {
  assert.ok(data.recipes.length >= 10, 'málo receptů');
  for (const r of data.recipes) {
    assert.ok(validCats.has(r.category), `${r.id}: neznámá kategorie ${r.category}`);
    for (const ing of r.ingredients) {
      assert.ok(validGroups.has(ing.group), `${r.id}: neznámá skupina ${ing.group}`);
      assert.equal(typeof ing.grams, 'number');
    }
    for (const a of r.allergens || []) assert.ok(data.allergens[a], `${r.id}: alergen ${a}`);
  }
});

test('frequencyRules mají platné kategorie a planTargetDays je číslo', () => {
  assert.ok(data.frequencyRules.length >= 3);
  for (const rule of data.frequencyRules) {
    assert.ok(validCats.has(rule.category), `pravidlo: kategorie ${rule.category}`);
    assert.ok(rule.min != null || rule.max != null, 'pravidlo bez min i max');
  }
  assert.equal(typeof data.planTargetDays, 'number');
});

// ===== pure logika widgetu =====

function recipe(id) {
  const r = byId[id];
  assert.ok(r, `recept ${id} nenalezen`);
  return r;
}

test('recipeGroupTotals sčítá gramáže do skupin koše', () => {
  const t = recipeGroupTotals(recipe('spagety-bolognese-veg'), {});
  assert.ok(t.zelenina_ovoce >= 120, 'zelenina');
  assert.ok(t.celozrnne >= 15, 'celozrnné');
  assert.ok(t.lusteniny >= 8, 'luštěniny');
});

test('záměna bílé přílohy za celozrnnou přesune gramáž z ostatní do celozrnné', () => {
  const r = recipe('treska-smetanova');
  const base = recipeGroupTotals(r, {});
  const swapped = recipeGroupTotals(r, { swapWhole: true });
  assert.ok(base.ostatni > 0, 'recept má bílou přílohu');
  assert.equal(swapped.ostatni, 0);
  assert.equal(swapped.celozrnne, base.celozrnne + base.ostatni);
});

test('planAverages je průměr na oběd přes jídelníček', () => {
  const empty = planAverages([], byId, {});
  assert.equal(empty.maso, 0);
  // dvakrát stejný pokrm → průměr = jeden pokrm
  const single = recipeGroupTotals(recipe('losos-peceny'), {});
  const avg = planAverages(['losos-peceny', 'losos-peceny'], byId, {});
  for (const g of BASKET_GROUPS) assert.ok(Math.abs(avg[g] - single[g]) < 1e-9, `průměr ${g}`);
});

test('planAverages dvou různých pokrmů je aritmetický průměr', () => {
  const a = recipeGroupTotals(recipe('losos-peceny'), {});
  const b = recipeGroupTotals(recipe('spagety-bolognese-veg'), {});
  const avg = planAverages(['losos-peceny', 'spagety-bolognese-veg'], byId, {});
  assert.ok(Math.abs(avg.zelenina_ovoce - (a.zelenina_ovoce + b.zelenina_ovoce) / 2) < 1e-9);
});

test('pestrostCounts počítá kategorie, sladké a výskyt celozrnných/luštěnin', () => {
  const plan = ['losos-peceny', 'spagety-bolognese-veg', 'tvarohove-knedliky'];
  const c = pestrostCounts(plan, byId);
  assert.equal(c.total, 3);
  assert.equal(c.byCategory['ryba'], 1);
  assert.equal(c.byCategory['bezmase_zeleninove'], 1);
  assert.equal(c.sweet, 1);
  assert.ok(c.withLusteniny >= 1, 'luštěniny ve špagetách');
  assert.ok(c.withCelozrnne >= 1, 'celozrnné ve špagetách');
});
