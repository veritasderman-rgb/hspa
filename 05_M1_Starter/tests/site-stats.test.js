// Testy centrálního výpočtu site-wide statistik.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeScore,
  computeSignalBreakdown,
  getSiteStats,
  applyDataStats,
} from '../src/site-stats.js';

const SAMPLE = [
  { id: 'a', signal: 'good', verification_status: 'verified', framework: 'hspa' },
  { id: 'b', signal: 'good', verification_status: 'verified', framework: 'hspa' },
  { id: 'c', signal: 'warn', verification_status: 'preliminary', framework: 'hspa' },
  { id: 'd', signal: 'bad', verification_status: 'verified', framework: 'hspa' },
  { id: 'e', signal: 'neutral', verification_status: 'verified', framework: 'hspa' },
  { id: 'f', signal: 'good', verification_status: 'illustrative', framework: 'monitoring' },
  { id: 'g', signal: 'warn', verification_status: 'verified', framework: 'monitoring' },
];

// ===== computeScore =====

test('computeScore: ignoruje neutral a illustrative', () => {
  // scoreable: a(good=100), b(good=100), c(warn=50), d(bad=0), g(warn=50)
  // f je illustrative → vyloučeno; e je neutral → vyloučeno
  // sum = 300, count = 5 → 60
  assert.equal(computeScore(SAMPLE), 60);
});

test('computeScore: null pokud žádný scoreable', () => {
  assert.equal(computeScore([
    { signal: 'neutral', verification_status: 'verified' },
    { signal: 'good', verification_status: 'illustrative' },
  ]), null);
});

test('computeScore: funguje i bez verification_status (legacy data)', () => {
  // Plán explicitně počítá z čistého signálu, bez verification_status filtru.
  // Pro produkční data bez verification fieldu nesmí vracet null.
  const xs = [
    { signal: 'good' },
    { signal: 'warn' },
    { signal: 'bad' },
    { signal: 'neutral' },
  ];
  // 3 scoreable: 100+50+0 = 150 / 3 = 50
  assert.equal(computeScore(xs), 50);
});

test('computeScore: null na prázdný/invalidní vstup', () => {
  assert.equal(computeScore([]), null);
  assert.equal(computeScore(null), null);
  assert.equal(computeScore(undefined), null);
});

test('computeScore: round na celé číslo', () => {
  // 3× good (300) + 1× warn (50) + 1× bad (0) = 350 / 5 = 70
  const xs = [
    { signal: 'good', verification_status: 'verified' },
    { signal: 'good', verification_status: 'verified' },
    { signal: 'good', verification_status: 'verified' },
    { signal: 'warn', verification_status: 'verified' },
    { signal: 'bad', verification_status: 'verified' },
  ];
  assert.equal(computeScore(xs), 70);
});

// ===== computeSignalBreakdown =====

test('computeSignalBreakdown: korektní rozpad', () => {
  const out = computeSignalBreakdown(SAMPLE);
  assert.equal(out.good, 3);  // a, b, f
  assert.equal(out.warn, 2);  // c, g
  assert.equal(out.bad, 1);   // d
  assert.equal(out.neutral, 1); // e
  assert.equal(out.scoreable, 5); // bez f (illustrative); a, b, c, d, g jsou všechny započteny
});

// ===== getSiteStats =====

test('getSiteStats: spojuje indikátory a články', () => {
  const articles = [
    { slug: 'a.html', published: true, linked_indicators: ['a', 'b'] },
    { slug: 'b.html', published: true, linked_indicators: ['b', 'c'] },
    { slug: 'c.html', published: false, linked_indicators: ['d'] },
  ];
  const stats = getSiteStats({ indicators: SAMPLE, articles });
  assert.equal(stats.totalIndicators, 7);
  assert.equal(stats.hspaCount, 5);
  assert.equal(stats.monitoringCount, 2);
  assert.equal(stats.frameworkTotal, 122);
  assert.equal(stats.hspaGap, 117); // 122 - 5
  assert.equal(stats.score, 60);
  assert.equal(stats.oecdScore, 71);
  assert.equal(stats.articleCount, 2); // jen published
  assert.equal(stats.referencedIndicatorCount, 3); // a, b, c (unikáty z published článků)
});

test('getSiteStats: defaultní hodnoty bez argumentů', () => {
  const stats = getSiteStats();
  assert.equal(stats.totalIndicators, 0);
  assert.equal(stats.hspaCount, 0);
  assert.equal(stats.score, null);
  assert.equal(stats.frameworkTotal, 122);
  assert.equal(stats.articleCount, 0);
});

// ===== applyDataStats (DOM-less environment skip) =====

test('applyDataStats: no-op v non-browser prostředí', () => {
  // Bez window/document by funkce neměla nic dělat — žádná chyba.
  assert.doesNotThrow(() => applyDataStats({ score: 60 }));
});

test('applyDataStats: doplní hodnoty do DOM podle [data-stat]', () => {
  // Lehký fake DOM pro test — nahrazuje globální document
  const elements = [];
  const fakeEl = (key, classes = []) => ({
    _key: key,
    _text: null,
    _attrs: {},
    _dataset: {},
    classList: { contains: c => classes.includes(c) },
    set textContent(v) { this._text = v; },
    get textContent() { return this._text; },
    setAttribute(k, v) { this._attrs[k] = v; },
    getAttribute(k) { return k === 'data-stat' ? this._key : this._attrs[k]; },
    get dataset() { return this._dataset; },
  });
  const fake = {
    querySelectorAll(sel) {
      assert.equal(sel, '[data-stat]');
      return elements;
    },
  };
  elements.push(fakeEl('totalIndicators'));
  elements.push(fakeEl('score', ['av-counter']));
  elements.push(fakeEl('unknownKey'));

  // Inject fake document
  const origDoc = globalThis.document;
  globalThis.document = fake;
  try {
    applyDataStats({
      totalIndicators: 80, score: 64,
      scoreGood: 11, scoreWarn: 12, scoreBad: 34, scoreNeutral: 23, scoreScoreable: 57,
    }, fake);
    assert.equal(elements[0]._text, '80');
    assert.equal(elements[1]._text, '64');
    assert.equal(elements[1]._dataset.value, '64'); // av-counter má data-value
    assert.ok(elements[1]._attrs.title?.includes('Průměr')); // breakdown tooltip
    assert.equal(elements[2]._text, null); // unknownKey ignorován
  } finally {
    if (origDoc === undefined) delete globalThis.document; else globalThis.document = origDoc;
  }
});
