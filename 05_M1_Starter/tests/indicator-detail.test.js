// Testy pure logiky pro detail indikátoru (indikator.html).
// Modul indicator-detail.js exportuje vybrané utility funkce.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  findRegionalDataset,
  findCrossLinks,
  fmtValue,
  INDICATOR_DRIVERS,
} from '../src/indicator-detail.js';

// ====== fmtValue ======

test('fmtValue: nullable returns dash', () => {
  assert.equal(fmtValue(null), '–');
  assert.equal(fmtValue(undefined), '–');
});

test('fmtValue: large numbers rounded to integer', () => {
  assert.equal(fmtValue(123.45), '123');
  assert.equal(fmtValue(220), '220');
});

test('fmtValue: medium numbers 1 decimal', () => {
  assert.equal(fmtValue(50.0), '50.0');
  assert.equal(fmtValue(14.55), '14.6');
});

test('fmtValue: small numbers 2 decimals', () => {
  assert.equal(fmtValue(4.123), '4.12');
  assert.equal(fmtValue(0.987), '0.99');
});

// ====== findRegionalDataset ======

test('findRegionalDataset: matches by indicator_id', () => {
  const regions = {
    datasets: [
      { id: 'foo_regions', indicator_id: 'foo' },
      { id: 'bar_regions', indicator_id: 'bar' },
    ],
  };
  assert.equal(findRegionalDataset(regions, 'foo').id, 'foo_regions');
  assert.equal(findRegionalDataset(regions, 'bar').id, 'bar_regions');
  assert.equal(findRegionalDataset(regions, 'missing'), null);
});

test('findRegionalDataset: handles missing data', () => {
  assert.equal(findRegionalDataset(null, 'x'), null);
  assert.equal(findRegionalDataset({}, 'x'), null);
  assert.equal(findRegionalDataset({ datasets: null }, 'x'), null);
});

// ====== findCrossLinks ======

test('findCrossLinks: returns linked strategies and explainers', () => {
  const strategies = [
    { id: 's1', linked_indicators: ['ind1', 'ind2'] },
    { id: 's2', linked_indicators: ['ind3'] },
  ];
  const explainers = [
    { id: 'e1', linked_indicators: ['ind1'] },
    { id: 'e2', linked_indicators: ['ind2', 'ind4'] },
  ];
  const out = findCrossLinks('ind1', strategies, explainers);
  assert.deepEqual(out.strategies.map(s => s.id), ['s1']);
  assert.deepEqual(out.explainers.map(e => e.id), ['e1']);
});

test('findCrossLinks: empty when nothing matches', () => {
  const out = findCrossLinks('orphan', [{ id: 's', linked_indicators: ['x'] }], []);
  assert.equal(out.strategies.length, 0);
  assert.equal(out.explainers.length, 0);
});

// ====== INDICATOR_DRIVERS curated content ======

test('INDICATOR_DRIVERS: HPV vakcinace má alespoň 3 ovlivňující faktory + importance', () => {
  const driver = INDICATOR_DRIVERS.vakcinace_hpv_divky;
  assert.ok(driver, 'driver pro vakcinace_hpv_divky musí existovat');
  assert.ok(Array.isArray(driver.factors));
  assert.ok(driver.factors.length >= 3);
  assert.ok(typeof driver.importance === 'string');
  assert.ok(driver.importance.length > 100, 'importance musí být věcný odstavec');
});

test('INDICATOR_DRIVERS: každý driver má strukturu factors[].name + .explanation', () => {
  for (const [id, drv] of Object.entries(INDICATOR_DRIVERS)) {
    assert.ok(drv.factors.length > 0, `${id} musí mít alespoň jeden factor`);
    for (const f of drv.factors) {
      assert.ok(f.name && f.explanation, `${id}: factor potřebuje name a explanation`);
    }
    assert.ok(drv.importance, `${id} musí mít importance`);
  }
});
