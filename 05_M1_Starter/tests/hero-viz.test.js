// Testy animované hero vizualizace (src/hero-viz.js) — křivka naděje dožití.
// Čistá funkce bez DOM.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildHeroViz } from '../src/hero-viz.js';

const LE = {
  id: 'nadeje_doziti_total', name: 'Naděje dožití při narození', value: 80.1, unit: 'let',
  year: 2024, signal: 'warn', direction: 'higher_is_better', benchmark: { eu: 81.5 },
  trend: [
    { year: 2020, value: 78.3 }, { year: 2021, value: 77.2 }, { year: 2022, value: 79 },
    { year: 2023, value: 79.8 }, { year: 2024, value: 80.1 },
  ],
};
const HLY = { id: 'nadeje_doziti_zdravi_65', value: 8, benchmark: { oecd: 10.2, eu: 10.3 } };

test('vykreslí SVG křivku s draw-in animací (pathLength) a koncovou hodnotou', () => {
  const h = buildHeroViz(LE, HLY);
  assert.match(h, /class="ed-hero-viz-card"/);
  assert.match(h, /<polyline class="hero-viz-line"[^>]*pathLength="1"/);
  assert.match(h, /Naděje dožití při narození · ČR/);
  assert.match(h, /80,1 let/);           // koncová hodnota
  assert.match(h, />2020</);             // první rok
  assert.match(h, />2024</);             // poslední rok
  assert.doesNotMatch(h, /undefined|NaN/);
});

test('referenční čára EU se vykreslí, když je benchmark', () => {
  const h = buildHeroViz(LE, HLY);
  assert.match(h, /class="hero-viz-ref"/);
  assert.match(h, /EU 81,5/);
});

test('popisek navazuje na headline (zdravé roky vs OECD)', () => {
  const h = buildHeroViz(LE, HLY);
  assert.match(h, /zdravých let/);
  assert.match(h, /8/);
  assert.match(h, /OECD 10,2/);
});

test('méně než 2 body trendu → prázdný výstup', () => {
  assert.equal(buildHeroViz({ ...LE, trend: [{ year: 2024, value: 80 }] }), '');
  assert.equal(buildHeroViz({ ...LE, trend: [] }), '');
  assert.equal(buildHeroViz(null), '');
});

test('název se XML-escapuje', () => {
  const h = buildHeroViz({ ...LE, name: 'A <b> & "c"' });
  assert.doesNotMatch(h, /<b>/);
  assert.match(h, /A &lt;b&gt; &amp;/);
});
