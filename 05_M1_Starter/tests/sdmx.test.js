// Testy pro SDMX-JSON parser (OECD legacy stats.oecd.org formát).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSdmxJson, average } from '../ingest/lib/sdmx.js';

const FIXTURE = {
  structure: {
    dimensions: {
      series: [
        { id: 'COU', keyPosition: 0, values: [{ id: 'CZE' }, { id: 'OECD' }, { id: 'DEU' }] },
        { id: 'VAR', keyPosition: 1, values: [{ id: 'EVIETOTLPOPYRSCSU' }] },
      ],
      observation: [
        { id: 'TIME_PERIOD', values: [{ id: '2022' }, { id: '2023' }, { id: '2024' }] },
      ],
    },
  },
  dataSets: [
    {
      series: {
        '0:0': { observations: { '0': [79.5], '1': [79.6], '2': [79.9] } }, // CZE
        '1:0': { observations: { '0': [81.1], '1': [81.2], '2': [81.3] } }, // OECD
        '2:0': { observations: { '0': [80.5], '2': [80.8] } },              // DEU (chybí 2023)
      },
    },
  ],
};

test('parseSdmxJson: vrátí všechny observace s tagy a year', () => {
  const out = parseSdmxJson(FIXTURE);
  assert.equal(out.length, 8);
  const cze = out.filter(o => o.COU === 'CZE');
  assert.equal(cze.length, 3);
  const cze2024 = cze.find(o => o.time === '2024');
  assert.deepEqual(cze2024, {
    COU: 'CZE', VAR: 'EVIETOTLPOPYRSCSU',
    TIME_PERIOD: '2024', time: '2024', value: 79.9,
  });
});

test('parseSdmxJson: prázdná odpověď → []', () => {
  assert.deepEqual(parseSdmxJson({}), []);
  assert.deepEqual(parseSdmxJson({ dataSets: [] }), []);
});

test('average: ignoruje null/NaN', () => {
  assert.equal(average([1, 2, 3]), 2);
  assert.equal(average([1, null, 3]), 2);
  assert.equal(average([null, undefined, NaN]), null);
  assert.equal(average([]), null);
});
