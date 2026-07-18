// Testy sdílené karty indikátoru (src/indicator-card.js) — vizuál homepage
// recyklovaný na persona minihomepage. Čistá funkce, bez DOM.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { indicatorCardHtml } from '../src/indicator-card.js';

const IND = {
  id: 'mri_per_milion', name: 'MRI skenery', area: 'Struktury', domain: 'Zdravotnická technika',
  value: 12, unit: 'na mil. ob.', year: 2024, framework: 'hspa', signal: 'bad',
  direction: 'higher_is_better', benchmark: { oecd: 16, eu: 14.5 },
  trend: [{ year: 2022, value: 11.5 }, { year: 2023, value: 12 }, { year: 2024, value: 12 }],
  source: { name: 'ÚZIS · NZIS' },
};

test('karta má základní strukturu homepage (area-tag, hodnota, signál, detail)', () => {
  const h = indicatorCardHtml(IND);
  assert.match(h, /class="indicator-card"/);
  assert.match(h, /class="area-tag"/);
  assert.match(h, /Struktury · Zdravotnická technika/);
  assert.match(h, /class="big-value">12</);
  assert.match(h, /class="signal bad"/);
  assert.match(h, /href="indicator\.html\?id=mri_per_milion"/);
  assert.match(h, /Detail →/);
  assert.doesNotMatch(h, /undefined|\[object Object\]/);
});

test('benchmark bary se vykreslí, když existuje benchmark (ČR + OECD + EU)', () => {
  const h = indicatorCardHtml(IND);
  const bars = h.match(/class="bm-row"/g) ?? [];
  assert.equal(bars.length, 3, 'očekávány 3 bary: ČR, OECD, EU');
  assert.match(h, /class="bm-key">ČR</);
  assert.match(h, /Průměr OECD/);
});

test('bez benchmarku se bary nevykreslí', () => {
  const h = indicatorCardHtml({ ...IND, benchmark: {} });
  assert.doesNotMatch(h, /class="bm-row"/);
});

test('trendový graf (SVG) se vykreslí pro ≥2 body, jinak ne', () => {
  assert.match(indicatorCardHtml(IND), /class="card-chart-svg"/);
  assert.match(indicatorCardHtml(IND), /<polyline/);
  const noTrend = indicatorCardHtml({ ...IND, trend: [{ year: 2024, value: 12 }] });
  assert.doesNotMatch(noTrend, /card-chart-svg/);
});

test('monitoring framework dostane Monitoring badge', () => {
  assert.match(indicatorCardHtml({ ...IND, framework: 'monitoring' }), /Monitoring/);
});

test('chybějící hodnota → prázdná karta', () => {
  assert.equal(indicatorCardHtml({ ...IND, value: null }), '');
  assert.equal(indicatorCardHtml(null), '');
});

test('HTML se escapuje (žádná injekce z názvu)', () => {
  const h = indicatorCardHtml({ ...IND, name: '<img src=x onerror=alert(1)>' });
  assert.doesNotMatch(h, /<img src=x/);
  assert.match(h, /&lt;img/);
});
