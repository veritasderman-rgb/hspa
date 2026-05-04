// Testy pro JSON-stat 2.0 parser (sdílený mezi ČSÚ a Eurostat).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isJsonStat, parseJsonStat, pickLatestByYear, extractYear } from '../ingest/lib/jsonstat.js';

test('isJsonStat: rozezná dataset 2.0', () => {
  assert.equal(isJsonStat({ id: ['a'], size: [1], dimension: {}, value: [1] }), true);
  assert.equal(isJsonStat({ dataset: { id: ['a'], size: [1], dimension: {}, value: [1] } }), true);
  assert.equal(isJsonStat({}), false);
  assert.equal(isJsonStat(null), false);
});

test('parseJsonStat: 2D dataset s array values', () => {
  const ds = {
    id: ['geo', 'time'],
    size: [2, 3],
    dimension: {
      geo: { category: { index: { 'CZ': 0, 'EU27_2020': 1 } } },
      time: { category: { index: { '2022': 0, '2023': 1, '2024': 2 } } },
    },
    value: [
      8.4, 8.5, 8.6,   // CZ × 2022/2023/2024
      9.5, 9.6, 9.7,   // EU × 2022/2023/2024
    ],
  };
  const out = parseJsonStat(ds);
  assert.equal(out.length, 6);
  assert.deepEqual(out[0], { geo: 'CZ', time: '2022', value: 8.4 });
  assert.deepEqual(out[5], { geo: 'EU27_2020', time: '2024', value: 9.7 });
});

test('parseJsonStat: chybějící hodnoty (null) přeskočí', () => {
  const ds = {
    id: ['time'],
    size: [3],
    dimension: { time: { category: { index: { '2022': 0, '2023': 1, '2024': 2 } } } },
    value: [10, null, 12],
  };
  const out = parseJsonStat(ds);
  assert.equal(out.length, 2);
  assert.deepEqual(out.map(o => o.time), ['2022', '2024']);
});

test('parseJsonStat: respektuje dataset wrapper', () => {
  const wrapped = {
    dataset: {
      id: ['time'],
      size: [1],
      dimension: { time: { category: { index: { '2024': 0 } } } },
      value: [42],
    },
  };
  const out = parseJsonStat(wrapped);
  assert.deepEqual(out, [{ time: '2024', value: 42 }]);
});

test('parseJsonStat: prázdný/neplatný vstup → []', () => {
  assert.deepEqual(parseJsonStat(null), []);
  assert.deepEqual(parseJsonStat({}), []);
  assert.deepEqual(parseJsonStat({ id: [], size: [] }), []);
});

test('pickLatestByYear: bere nejnovější rok', () => {
  const obs = [
    { time: '2020', value: 1 },
    { time: '2024', value: 5 },
    { time: '2022', value: 3 },
  ];
  assert.deepEqual(pickLatestByYear(obs), { time: '2024', value: 5 });
});

test('extractYear: zkusí time/cas/rok/year', () => {
  assert.equal(extractYear({ time: '2024' }), 2024);
  assert.equal(extractYear({ cas: 2023 }), 2023);
  assert.equal(extractYear({ rok: '2022' }), 2022);
  assert.equal(extractYear({}), -Infinity);
});
