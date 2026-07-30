// Testy pure logiky v src/article-visuals.js — bez DOM.
// DOM-dependent části (enhanceArticleVisuals, IntersectionObserver) testujeme
// nepřímo přes existenci a struktur HTML v cílových článcích (smoke test).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  barWidthPct,
  formatNumber,
  easeOutQuart,
  clampInt,
  trendGeometry,
} from '../src/article-visuals.js';

// ===== barWidthPct =====

test('barWidthPct: normální hodnota uvnitř rozsahu', () => {
  // Float arithmetic — porovnání na 6 desetinných míst.
  assert.ok(Math.abs(barWidthPct(50, 100) - 50) < 1e-9);
  assert.ok(Math.abs(barWidthPct(28, 100) - 28) < 1e-9);
  assert.ok(Math.abs(barWidthPct(4.4, 28) - (4.4 / 28) * 100) < 1e-9);
});

test('barWidthPct: hodnota = max → 100 %', () => {
  assert.equal(barWidthPct(100, 100), 100);
});

test('barWidthPct: hodnota větší než max → clamp na 100', () => {
  assert.equal(barWidthPct(200, 100), 100);
});

test('barWidthPct: záporná nebo nulová hodnota → 0', () => {
  assert.equal(barWidthPct(0, 100), 0);
  assert.equal(barWidthPct(-5, 100), 0);
});

test('barWidthPct: NaN / nevalidní vstup → 0', () => {
  assert.equal(barWidthPct(NaN, 100), 0);
  assert.equal(barWidthPct(50, 0), 0);
  assert.equal(barWidthPct(50, -10), 0);
  assert.equal(barWidthPct(undefined, 100), 0);
});

// ===== formatNumber =====

test('formatNumber: celé číslo bez desetin', () => {
  assert.equal(formatNumber(1500, 0), '1 500');
  assert.equal(formatNumber(154, 0), '154');
});

test('formatNumber: desetiny → čárka jako desetinný oddělovač', () => {
  assert.equal(formatNumber(154.6, 1), '154,6');
  assert.equal(formatNumber(28.45, 2), '28,45');
});

test('formatNumber: milionové hodnoty s mezerou jako tisíci', () => {
  assert.equal(formatNumber(154600, 0), '154 600');
});

test('formatNumber: NaN → pomlčka', () => {
  assert.equal(formatNumber(NaN, 0), '—');
  assert.equal(formatNumber(undefined, 0), '—');
});

// ===== easeOutQuart =====

test('easeOutQuart: t=0 → 0, t=1 → 1', () => {
  assert.equal(easeOutQuart(0), 0);
  assert.equal(easeOutQuart(1), 1);
});

test('easeOutQuart: monotónně rostoucí na intervalu [0, 1]', () => {
  let prev = -1;
  for (let i = 0; i <= 10; i++) {
    const v = easeOutQuart(i / 10);
    assert.ok(v >= prev, `easeOutQuart(${i / 10}) = ${v} musí být ≥ ${prev}`);
    prev = v;
  }
});

test('easeOutQuart: v polovině (t=0.5) je už nad 0.9 (typické pro ease-out)', () => {
  assert.ok(easeOutQuart(0.5) > 0.9);
});

// ===== clampInt =====

test('clampInt: hodnota uvnitř rozsahu', () => {
  assert.equal(clampInt(5, 0, 10, 99), 5);
});

test('clampInt: clamp pod minimum a nad maximum', () => {
  assert.equal(clampInt(-5, 0, 10, 99), 0);
  assert.equal(clampInt(50, 0, 10, 99), 10);
});

test('clampInt: nevalidní vstup → fallback', () => {
  assert.equal(clampInt(NaN, 0, 10, 99), 99);
  assert.equal(clampInt(undefined, 0, 10, 99), 99);
});

// ===== AV markup smoke test — alespoň jeden článek používá AV komponentu =====

test('AV markup: clanky.js importuje enhanceArticleVisuals (auto-bootstrap)', () => {
  const src = readFileSync(new URL('../src/clanky.js', import.meta.url), 'utf8');
  assert.ok(
    src.includes("import { enhanceArticleVisuals }"),
    'clanky.js musí importovat enhanceArticleVisuals'
  );
  assert.ok(
    src.includes('enhanceArticleVisuals('),
    'clanky.js musí spouštět enhanceArticleVisuals()'
  );
});

test('AV markup: design system má 6 zdokumentovaných komponent v docs/visual-components.md', () => {
  const doc = readFileSync(
    new URL('../../docs/visual-components.md', import.meta.url),
    'utf8'
  );
  ['.av-timeline', '.av-bar-compare', '.av-data-table', '.av-flow', '.av-counter', '.av-trend']
    .forEach(cls => {
      assert.ok(doc.includes(cls), `Dokumentace musí popisovat ${cls}`);
    });
});


// =====================================================================
//  .av-trend — pure geometrie (trendGeometry)
// =====================================================================

test('trendGeometry: osa X je úměrná roku, ne pořadí bodu', () => {
  // Nerovnoměrná řada 2000/2020/2024 — mezera 2000→2020 musí být 5× delší
  // než 2020→2024, jinak graf lže o čase.
  const g = trendGeometry([
    { year: 2000, value: 90 }, { year: 2020, value: 75 }, { year: 2024, value: 78 },
  ]);
  assert.ok(g);
  const [a, b, c] = g.dots;
  const gap1 = b.x - a.x;
  const gap2 = c.x - b.x;
  assert.ok(Math.abs(gap1 / gap2 - 5) < 0.05, `poměr mezer má být 5:1, je ${(gap1 / gap2).toFixed(2)}`);
});

test('trendGeometry: minIdx ukazuje na nejnižší hodnotu; vyšší hodnota má menší y (SVG roste dolů)', () => {
  const g = trendGeometry([
    { year: 2019, value: 79.1 }, { year: 2021, value: 72.4 }, { year: 2024, value: 75.1 },
  ]);
  assert.equal(g.minIdx, 1);
  const yByValue = Object.fromEntries(g.dots.map(d => [d.value, d.y]));
  assert.ok(yByValue[79.1] < yByValue[72.4], 'vyšší hodnota musí být výš (menší y)');
});

test('trendGeometry: řadí body podle roku a odmítá degenerované vstupy', () => {
  const g = trendGeometry([{ year: 2024, value: 75.1 }, { year: 2000, value: 90.6 }]);
  assert.equal(g.dots[0].year, 2000, 'body se řadí vzestupně podle roku');
  assert.equal(trendGeometry([]), null);
  assert.equal(trendGeometry([{ year: 2020, value: 1 }]), null, 'jeden bod není trend');
  assert.equal(trendGeometry([{ year: 2020, value: 1 }, { year: 2020, value: 2 }]), null, 'stejný rok nejde rozprostřít');
  assert.equal(trendGeometry([{ year: 2020, value: 1 }, { year: 2021, value: 2 }], { min: 5, max: 5 }), null, 'prázdný rozsah Y');
});

test('trendGeometry: explicitní min/max osy Y se respektuje; path začíná M a area se uzavírá Z', () => {
  const g = trendGeometry([{ year: 2020, value: 70 }, { year: 2024, value: 90 }], { min: 66, max: 96 });
  assert.equal(g.yMin, 66);
  assert.equal(g.yMax, 96);
  assert.match(g.path, /^M[\d.]+ [\d.]+ L/);
  assert.match(g.area, /Z$/);
});
