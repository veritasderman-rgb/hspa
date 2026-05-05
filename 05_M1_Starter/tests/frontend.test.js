// Testy frontendové logiky filtrace, řazení a trend šipek.
// Spouští čistou logiku z src/app.js bez DOM (modul exportuje pure funkce).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterAndSort, yoyPct, trendArrow } from '../src/app.js';

const SAMPLE = [
  { id: 'a', name: 'Alfa indikátor', area: 'Výsledky', domain: 'Stav', subdomain: 'X',
    signal: 'good', direction: 'higher_is_better',
    trend: [{ year: 2023, value: 78 }, { year: 2024, value: 80 }] },
  { id: 'b', name: 'Beta', area: 'Procesy', domain: 'Prevence', subdomain: 'Vakcinace',
    signal: 'bad', direction: 'higher_is_better',
    trend: [{ year: 2023, value: 22 }, { year: 2024, value: 22 }] },
  { id: 'c', name: 'Cetiri', area: 'Výstupy', domain: 'Kvalita', subdomain: 'X',
    signal: 'warn', direction: 'lower_is_better',
    trend: [{ year: 2023, value: 6.0 }, { year: 2024, value: 5.4 }] },
];

// ===== filterAndSort =====

test('filterAndSort: filter podle oblasti', () => {
  const out = filterAndSort(SAMPLE, { area: 'Procesy', search: '', sort: 'default' });
  assert.equal(out.length, 1);
  assert.equal(out[0].id, 'b');
});

test('filterAndSort: search napříč name/domain/subdomain (case-insensitive)', () => {
  assert.equal(filterAndSort(SAMPLE, { area: 'all', search: 'alfa', sort: 'default' }).length, 1);
  assert.equal(filterAndSort(SAMPLE, { area: 'all', search: 'PREVENCE', sort: 'default' }).length, 1);
  assert.equal(filterAndSort(SAMPLE, { area: 'all', search: 'vakcinace', sort: 'default' }).length, 1);
  assert.equal(filterAndSort(SAMPLE, { area: 'all', search: 'nenalezeno', sort: 'default' }).length, 0);
});

test('filterAndSort: sort=signal řadí kritické první', () => {
  const out = filterAndSort(SAMPLE, { area: 'all', search: '', sort: 'signal' });
  assert.deepEqual(out.map(i => i.id), ['b', 'c', 'a']);
});

test('filterAndSort: sort=name řadí česky', () => {
  const out = filterAndSort(SAMPLE, { area: 'all', search: '', sort: 'name' });
  assert.deepEqual(out.map(i => i.id), ['a', 'b', 'c']);
});

test('filterAndSort: sort=trend řadí podle |YoY %| sestupně', () => {
  const out = filterAndSort(SAMPLE, { area: 'all', search: '', sort: 'trend' });
  // a: +2.56, b: 0, c: -10
  assert.deepEqual(out.map(i => i.id), ['c', 'a', 'b']);
});

test('filterAndSort: kombinace area + search + sort', () => {
  const xs = [...SAMPLE, { ...SAMPLE[1], id: 'b2', name: 'Beta verze 2', signal: 'warn' }];
  const out = filterAndSort(xs, { area: 'Procesy', search: 'beta', sort: 'signal' });
  assert.equal(out.length, 2);
  assert.equal(out[0].id, 'b'); // bad první
  assert.equal(out[1].id, 'b2'); // warn druhý
});

// ===== yoyPct =====

test('yoyPct: počítá meziroční % změnu z posledních dvou bodů', () => {
  assert.ok(Math.abs(yoyPct(SAMPLE[0]) - 2.564) < 0.01);
  assert.equal(yoyPct(SAMPLE[1]), 0);
  assert.equal(yoyPct({ trend: [] }), 0);
  assert.equal(yoyPct({ trend: [{ year: 2024, value: 5 }] }), 0); // pouze 1 bod
  assert.equal(yoyPct({ trend: [{ year: 2023, value: 0 }, { year: 2024, value: 5 }] }), 0);
});

// ===== trendArrow =====

test('trendArrow: higher_is_better + růst → šipka nahoru, třída good', () => {
  const arr = trendArrow(SAMPLE[0]);
  assert.equal(arr.glyph, '↑');
  assert.equal(arr.cls, 'good');
});

test('trendArrow: lower_is_better + pokles → šipka dolů, třída good', () => {
  const arr = trendArrow(SAMPLE[2]);
  assert.equal(arr.glyph, '↓');
  assert.equal(arr.cls, 'good');
});

test('trendArrow: lower_is_better + růst → šipka nahoru, třída bad', () => {
  const ind = { direction: 'lower_is_better', trend: [{ year: 2023, value: 5 }, { year: 2024, value: 6 }] };
  const arr = trendArrow(ind);
  assert.equal(arr.glyph, '↑');
  assert.equal(arr.cls, 'bad');
});

test('trendArrow: stabilní (< 0.5 %) → šipka flat', () => {
  const ind = { direction: 'higher_is_better', trend: [{ year: 2023, value: 100 }, { year: 2024, value: 100.2 }] };
  assert.equal(trendArrow(ind).glyph, '→');
  assert.equal(trendArrow(ind).cls, 'flat');
});

test('trendArrow: context_dependent → třída flat bez ohledu na směr', () => {
  const ind = { direction: 'context_dependent', trend: [{ year: 2023, value: 8 }, { year: 2024, value: 9 }] };
  assert.equal(trendArrow(ind).cls, 'flat');
});
