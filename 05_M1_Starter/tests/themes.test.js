// Testy pro tematické linie (data/themes.json + src/themes.js filterThemes).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { filterThemes } from '../src/themes.js';

const THEMES_DATA = JSON.parse(readFileSync(new URL('../data/themes.json', import.meta.url)));
const themes = THEMES_DATA.themes;

// ===== data/themes.json struktura =====

test('themes.json: obsahuje alespoň 4 témata', () => {
  assert.ok(themes.length >= 4, `Očekáváno >= 4, dostáno ${themes.length}`);
});

test('themes.json: každé téma má povinná pole', () => {
  const required = ['id', 'title', 'kicker', 'headline', 'lead', 'indicator_ids', 'strategy_ids', 'explainer_ids'];
  for (const t of themes) {
    for (const field of required) {
      assert.ok(t[field] !== undefined && t[field] !== null, `Téma ${t.id} chybí pole '${field}'`);
    }
    assert.ok(Array.isArray(t.indicator_ids), `${t.id}: indicator_ids musí být pole`);
    assert.ok(Array.isArray(t.strategy_ids), `${t.id}: strategy_ids musí být pole`);
    assert.ok(Array.isArray(t.explainer_ids), `${t.id}: explainer_ids musí být pole`);
    assert.ok(t.indicator_ids.length >= 3, `${t.id}: musí mít alespoň 3 indikátory`);
  }
});

test('themes.json: unikátní ID', () => {
  const ids = themes.map(t => t.id);
  const unique = new Set(ids);
  assert.equal(unique.size, ids.length, 'Témata mají duplicitní ID');
});

// ===== filterThemes =====

const SAMPLE = [
  { id: 'theme1', title: 'Žít déle ve zdraví', headline: 'Kardiovaskulární rizika', lead: 'Prevence a alkohol.', indicator_ids: ['a', 'b'], strategy_ids: ['s1'], explainer_ids: [] },
  { id: 'theme2', title: 'Najít nemoc dřív', headline: 'Screeningové programy', lead: 'Kolorektální karcinom.', indicator_ids: ['c'], strategy_ids: [], explainer_ids: ['e1'] },
  { id: 'theme3', title: 'Dostat péči včas', headline: 'Čekací doby', lead: 'Regionální dostupnost.', indicator_ids: ['d', 'e'], strategy_ids: ['s2'], explainer_ids: [] },
];

test('filterThemes: prázdný search vrátí vše', () => {
  assert.equal(filterThemes(SAMPLE, {}).length, 3);
  assert.equal(filterThemes(SAMPLE, { search: '' }).length, 3);
});

test('filterThemes: hledání v title', () => {
  const r = filterThemes(SAMPLE, { search: 'screening' });
  assert.equal(r.length, 1);
  assert.equal(r[0].id, 'theme2');
});

test('filterThemes: hledání v headline', () => {
  const r = filterThemes(SAMPLE, { search: 'čekací' });
  assert.equal(r.length, 1);
  assert.equal(r[0].id, 'theme3');
});

test('filterThemes: hledání v lead', () => {
  const r = filterThemes(SAMPLE, { search: 'alkohol' });
  assert.equal(r.length, 1);
  assert.equal(r[0].id, 'theme1');
});

test('filterThemes: hledání v indicator_ids', () => {
  const r = filterThemes(SAMPLE, { search: 'e1' });
  assert.equal(r.length, 1);
  assert.equal(r[0].id, 'theme2');
});

test('filterThemes: case-insensitive', () => {
  assert.equal(filterThemes(SAMPLE, { search: 'SCREENING' }).length, 1);
  assert.equal(filterThemes(SAMPLE, { search: 'Screening' }).length, 1);
});

test('filterThemes: neexistující výraz vrátí prázdné pole', () => {
  assert.equal(filterThemes(SAMPLE, { search: 'NEEXISTUJE_XYZ' }).length, 0);
});
