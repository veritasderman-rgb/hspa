// Testy datového exportu data/skolni-strava.json (nový spotřební koš dle
// vyhlášky 310/2025 Sb.) a pure logiky widgetu „Vylaď školní oběd“
// (src/recipe-tuner.js) — bez DOM.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { groupTotals, principles } from '../src/recipe-tuner.js';

const data = JSON.parse(readFileSync(new URL('../data/skolni-strava.json', import.meta.url), 'utf8'));

const BASKET_GROUPS = ['maso', 'ryby', 'mleko', 'tuky', 'cukry', 'zelenina_ovoce', 'brambory', 'celozrnne', 'lusteniny'];
const AGES = ['2-3', '4-6', '7-10', '11-14', '15+'];
const validGroups = new Set(data.foodGroups.map((g) => g.key));
const defaultState = { vegAdd: 0, sugarAdd: 0, swapWhole: false, addLegumes: false, fried: false };

// ===== struktura dat =====

test('basketLunchTargets má 9 skupin a 5 věkových kategorií', () => {
  for (const g of BASKET_GROUPS) {
    assert.ok(data.basketLunchTargets[g], `chybí skupina ${g}`);
    for (const age of AGES) {
      assert.equal(typeof data.basketLunchTargets[g][age], 'number', `${g}/${age}`);
    }
  }
});

test('tolerance a finanční normativy pokrývají všechny skupiny/věky', () => {
  for (const g of BASKET_GROUPS) assert.ok(data.tolerances[g], `tolerance ${g}`);
  for (const age of AGES) {
    const n = data.financialNormativeLunch[age];
    assert.ok(n && n.min < n.max, `normativ ${age}`);
  }
});

test('každá ingredience receptu má známou potravinovou skupinu', () => {
  assert.ok(data.recipes.length >= 10, 'málo receptů');
  for (const r of data.recipes) {
    assert.ok(r.id && r.name && r.category, `neúplný recept ${r.id}`);
    for (const ing of r.ingredients) {
      assert.ok(validGroups.has(ing.group), `${r.id}: neznámá skupina ${ing.group}`);
      assert.equal(typeof ing.grams, 'number');
    }
    for (const a of r.allergens || []) {
      assert.ok(data.allergens[a], `${r.id}: alergen ${a} není v mapě`);
    }
  }
});

test('reformPrinciples obsahuje 6 principů', () => {
  assert.equal(data.reformPrinciples.length, 6);
});

// ===== pure logika widgetu =====

function recipe(id) {
  const r = data.recipes.find((x) => x.id === id);
  assert.ok(r, `recept ${id} nenalezen`);
  return r;
}

test('groupTotals sčítá gramáže do skupin koše', () => {
  const t = groupTotals(recipe('spagety-bolognese-veg'), defaultState);
  assert.ok(t.zelenina_ovoce >= 120, 'zelenina');
  assert.ok(t.celozrnne >= 15, 'celozrnné');
  assert.ok(t.lusteniny >= 8, 'luštěniny');
});

test('vegetariánské celozrnné jídlo splní všech 6 principů', () => {
  const r = recipe('spagety-bolognese-veg');
  const p = principles(r, groupTotals(r, defaultState), defaultState);
  const score = Object.values(p).filter(Boolean).length;
  assert.equal(score, 6);
});

test('záměna bílé přílohy za celozrnnou přesune gramáž z ostatní do celozrnné', () => {
  const r = recipe('treska-smetanova');
  const base = groupTotals(r, defaultState);
  const swapped = groupTotals(r, { ...defaultState, swapWhole: true });
  assert.ok(base.ostatni > 0, 'recept má bílou přílohu');
  assert.equal(swapped.ostatni, 0);
  assert.equal(swapped.celozrnne, base.celozrnne + base.ostatni);
});

test('přidaný cukr poruší princip „bez přidaného cukru“', () => {
  const r = recipe('kure-paprika');
  const sweet = { ...defaultState, sugarAdd: 10 };
  const p = principles(r, groupTotals(r, sweet), sweet);
  assert.equal(p.lowSugar, false);
});

test('smažení poruší princip „nesmažené“', () => {
  const r = recipe('kure-paprika');
  const fried = { ...defaultState, fried: true };
  const p = principles(r, groupTotals(r, fried), fried);
  assert.equal(p.notFried, false);
});

test('přidání luštěnin zvýší skupinu luštěnin o 20 g', () => {
  const r = recipe('kure-paprika');
  const base = groupTotals(r, defaultState);
  const withLegumes = groupTotals(r, { ...defaultState, addLegumes: true });
  assert.equal(withLegumes.lusteniny, base.lusteniny + 20);
});
