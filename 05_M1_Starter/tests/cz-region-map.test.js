// Testy renderování schematické tile-mapy krajů.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderRegionCartogram } from '../src/cz-region-map.js';

const SAMPLE = {
  id: 'foo',
  name: 'Test indikátor',
  unit: '%',
  year: 2024,
  country_avg: 50,
  direction: 'higher_is_better',
  regions: [
    { code: 'CZ010', name: 'Praha', value: 65 },
    { code: 'CZ020', name: 'Středočeský', value: 55 },
    { code: 'CZ031', name: 'Jihočeský', value: 50 },
    { code: 'CZ032', name: 'Plzeňský', value: 48 },
    { code: 'CZ041', name: 'Karlovarský', value: 38 },
    { code: 'CZ042', name: 'Ústecký', value: 42 },
    { code: 'CZ051', name: 'Liberecký', value: 47 },
    { code: 'CZ052', name: 'Královéhradecký', value: 51 },
    { code: 'CZ053', name: 'Pardubický', value: 50 },
    { code: 'CZ063', name: 'Vysočina', value: 49 },
    { code: 'CZ064', name: 'Jihomoravský', value: 56 },
    { code: 'CZ071', name: 'Olomoucký', value: 46 },
    { code: 'CZ072', name: 'Zlínský', value: 48 },
    { code: 'CZ080', name: 'Moravskoslezský', value: 42 },
  ],
};

test('renderRegionCartogram: vrací validní SVG s 14 dlaždicemi', () => {
  const html = renderRegionCartogram(SAMPLE);
  assert.ok(html.includes('<svg'), 'obsahuje SVG element');
  // Každý kraj by měl mít vlastní g.rmap-tile
  const matches = html.match(/class="rmap-tile"/g);
  assert.equal(matches?.length, 14, 'musí být přesně 14 dlaždic');
});

test('renderRegionCartogram: ukazuje název kraje a hodnotu', () => {
  const html = renderRegionCartogram(SAMPLE);
  assert.ok(html.includes('Praha'), 'Praha v SVG/tooltipu');
  assert.ok(html.includes('Karlovarský'), 'Karlovarský v SVG');
  assert.ok(html.includes('průměr ČR 50'), 'průměr ČR v hlavičce');
});

test('renderRegionCartogram: jednotka v hlavičce', () => {
  const html = renderRegionCartogram(SAMPLE);
  assert.ok(html.includes('%'));
});

test('renderRegionCartogram: lower_is_better invertuje legendu', () => {
  const html = renderRegionCartogram({ ...SAMPLE, direction: 'lower_is_better' });
  assert.ok(html.includes('Méně = lepší'));
});

test('renderRegionCartogram: higher_is_better v legendě', () => {
  const html = renderRegionCartogram(SAMPLE);
  assert.ok(html.includes('Více = lepší'));
});

test('renderRegionCartogram: bezpečně escapuje HTML v názvu', () => {
  const evil = {
    ...SAMPLE,
    name: '<script>alert(1)</script>',
  };
  const html = renderRegionCartogram(evil);
  assert.ok(!html.includes('<script>alert'), 'XSS payload musí být escapován');
  assert.ok(html.includes('&lt;script&gt;'), 'použít HTML entity');
});
