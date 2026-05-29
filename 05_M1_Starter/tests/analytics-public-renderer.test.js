// Testy pro src/analytics-public.js — pure helpers (bez DOM rendereru).

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { isPlaceholder, fmtNum, fmtSeconds } from '../src/analytics-public.js';

test('isPlaceholder — true pro seed status', () => {
  assert.equal(isPlaceholder({ status: 'seed', top_indicators: [], top_articles: [], top_glossary_terms: [] }), true);
});

test('isPlaceholder — true pro prázdná data bez status', () => {
  assert.equal(isPlaceholder({ top_indicators: [], top_articles: [], top_glossary_terms: [] }), true);
});

test('isPlaceholder — false pro plná data', () => {
  assert.equal(isPlaceholder({
    top_indicators: [{ id: 'foo', clicks: 100 }],
    top_articles: [],
    top_glossary_terms: [],
  }), false);
});

test('isPlaceholder — false pro null/undefined', () => {
  assert.equal(isPlaceholder(null), true);
  assert.equal(isPlaceholder(undefined), true);
});

test('fmtNum — formátuje čísla českou lokalizací', () => {
  // Czech uses non-breaking space for thousands
  const r = fmtNum(1234);
  assert.ok(r === '1 234' || r === '1 234', `Got: ${r}`);
});

test('fmtNum — vrací — pro non-finite', () => {
  assert.equal(fmtNum(NaN), '—');
  assert.equal(fmtNum(Infinity), '—');
  assert.equal(fmtNum(null), '—');
  assert.equal(fmtNum(undefined), '—');
});

test('fmtNum — zaokrouhluje', () => {
  const r = fmtNum(1234.7);
  assert.ok(r.endsWith('235'), `Got: ${r}`);
});

test('fmtSeconds — < 60 s', () => {
  assert.equal(fmtSeconds(45), '45 s');
  assert.equal(fmtSeconds(1), '1 s');
});

test('fmtSeconds — > 60 s', () => {
  assert.equal(fmtSeconds(125), '2 m 5 s');
  assert.equal(fmtSeconds(60), '1 m 0 s');
});

test('fmtSeconds — — pro 0/negativní/NaN', () => {
  assert.equal(fmtSeconds(0), '—');
  assert.equal(fmtSeconds(-5), '—');
  assert.equal(fmtSeconds(NaN), '—');
});
