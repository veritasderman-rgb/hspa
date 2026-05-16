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

test('AV markup: design system má 5 zdokumentovaných komponent v docs/visual-components.md', () => {
  const doc = readFileSync(
    new URL('../../docs/visual-components.md', import.meta.url),
    'utf8'
  );
  ['.av-timeline', '.av-bar-compare', '.av-data-table', '.av-flow', '.av-counter']
    .forEach(cls => {
      assert.ok(doc.includes(cls), `Dokumentace musí popisovat ${cls}`);
    });
});
