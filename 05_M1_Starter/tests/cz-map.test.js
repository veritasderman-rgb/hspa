// Testy čisté logiky tile mapy krajů ČR (src/cz-map.js).
// Pokrývá computeRegionSignal a CZ_REGIONS layout.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeRegionSignal, CZ_REGIONS } from '../src/cz-map.js';

test('CZ_REGIONS: obsahuje všech 14 NUTS-3 krajů ČR', () => {
  assert.equal(CZ_REGIONS.length, 14);
  const codes = CZ_REGIONS.map(r => r.code);
  for (const expected of [
    'CZ010', 'CZ020', 'CZ031', 'CZ032', 'CZ041', 'CZ042', 'CZ051',
    'CZ052', 'CZ053', 'CZ063', 'CZ064', 'CZ071', 'CZ072', 'CZ080',
  ]) {
    assert.ok(codes.includes(expected), `chybí kraj ${expected}`);
  }
});

test('CZ_REGIONS: každý kraj má unikátní (col,row) pozici v 5×3 mřížce', () => {
  const positions = new Set();
  for (const r of CZ_REGIONS) {
    const key = `${r.col},${r.row}`;
    assert.ok(!positions.has(key), `duplicitní pozice ${key} u ${r.code}`);
    positions.add(key);
    assert.ok(r.col >= 0 && r.col <= 4, `${r.code}: col mimo rozsah`);
    assert.ok(r.row >= 0 && r.row <= 2, `${r.code}: row mimo rozsah`);
  }
});

test('computeRegionSignal: higher_is_better, nadprůměr → good', () => {
  // 80 vs 75 → +6.67 % → good (threshold ≥3 %)
  assert.equal(computeRegionSignal(80, 75, 'higher_is_better'), 'good');
});

test('computeRegionSignal: higher_is_better, podprůměr → bad', () => {
  // 70 vs 75 → -6.67 % → bad
  assert.equal(computeRegionSignal(70, 75, 'higher_is_better'), 'bad');
});

test('computeRegionSignal: lower_is_better, nižší = lepší → good', () => {
  // 5 vs 6 → -16.7 %, ale lower_is_better → adjusted +16.7 % → good
  assert.equal(computeRegionSignal(5, 6, 'lower_is_better'), 'good');
});

test('computeRegionSignal: lower_is_better, vyšší = horší → bad', () => {
  // 7 vs 6 → +16.7 %, lower_is_better → adjusted -16.7 % → bad
  assert.equal(computeRegionSignal(7, 6, 'lower_is_better'), 'bad');
});

test('computeRegionSignal: v pásmu ±3 % → warn', () => {
  // 76 vs 75 → +1.33 % → warn (mezi -3 a +3)
  assert.equal(computeRegionSignal(76, 75, 'higher_is_better'), 'warn');
  assert.equal(computeRegionSignal(74, 75, 'higher_is_better'), 'warn');
});

test('computeRegionSignal: chybějící hodnota nebo benchmark → neutral', () => {
  assert.equal(computeRegionSignal(null, 75, 'higher_is_better'), 'neutral');
  assert.equal(computeRegionSignal(80, null, 'higher_is_better'), 'neutral');
});

test('computeRegionSignal: context_dependent → vždy neutral', () => {
  assert.equal(computeRegionSignal(80, 75, 'context_dependent'), 'neutral');
});
