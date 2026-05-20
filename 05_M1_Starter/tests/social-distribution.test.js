// Testy distribučního systému pro sociální sítě (detektor + generátor).
// Pokrývá čistou logiku — nevolá Anthropic API.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isArticleVisible,
  extractKeyStats,
  extractFullText,
} from '../social/sources/article-detector.js';
import {
  buildArticleContext,
  splitThread,
  NETWORKS,
} from '../social/generators/summary-generator.js';

test('isArticleVisible: published=false je vždy skrytý', () => {
  assert.equal(isArticleVisible({ published: false, date: '2020-01-01' }), false);
});

test('isArticleVisible: datum v budoucnu je skryté', () => {
  const now = new Date('2026-05-20T12:00:00');
  assert.equal(isArticleVisible({ date: '2026-05-25' }, now), false);
});

test('isArticleVisible: datum v minulosti je viditelné', () => {
  const now = new Date('2026-05-20T12:00:00');
  assert.equal(isArticleVisible({ date: '2026-05-10' }, now), true);
});

test('isArticleVisible: dnešní datum se zobrazí až po 06:00', () => {
  assert.equal(isArticleVisible({ date: '2026-05-20' }, new Date('2026-05-20T05:30:00')), false);
  assert.equal(isArticleVisible({ date: '2026-05-20' }, new Date('2026-05-20T06:30:00')), true);
});

test('extractKeyStats: vytáhne av-counter + label + foot', () => {
  const html = `
    <div class="av-counter-block">
      <span class="av-counter" data-value="11.2" data-suffix=" %">11,2 %</span>
      <span class="av-counter-label">inhospitalní mortalita po CMP</span>
      <span class="av-counter-foot">ČR, 2024</span>
    </div>`;
  const stats = extractKeyStats(html);
  assert.equal(stats.length, 1);
  assert.equal(stats[0].value, '11.2');
  assert.equal(stats[0].display, '11,2 %');
  assert.equal(stats[0].label, 'inhospitalní mortalita po CMP');
  assert.equal(stats[0].foot, 'ČR, 2024');
});

test('extractFullText: odstraní značky a vrátí obsah <article>', () => {
  const html = `<head><title>X</title></head><body>
    <article class="article-page"><p>Věta jedna.</p><p>Věta dvě.</p></article></body>`;
  const text = extractFullText(html);
  assert.match(text, /Věta jedna\. Věta dvě\./);
  assert.doesNotMatch(text, /<p>/);
});

test('splitThread: rozdělí vlákno X na oddělovači ---', () => {
  assert.deepEqual(splitThread('první tweet\n---\ndruhý tweet'), ['první tweet', 'druhý tweet']);
  assert.deepEqual(splitThread('jeden samostatný tweet'), ['jeden samostatný tweet']);
});

test('buildArticleContext: obsahuje titulek, perex i klíčové statistiky', () => {
  const ctx = buildArticleContext({
    title: 'Testovací titulek',
    perex: 'Testovací perex.',
    url: 'https://skorezdravotnictvi.cz/clanek-test',
    keyStats: [{ display: '73 %', label: 'spokojenost', foot: null }],
    linkedIndicators: [],
    fullText: 'Plný text článku.',
  });
  assert.match(ctx, /Testovací titulek/);
  assert.match(ctx, /Testovací perex/);
  assert.match(ctx, /73 % — spokojenost/);
  assert.match(ctx, /Plný text článku/);
});

test('NETWORKS: definuje právě 4 sítě s neprázdným zadáním', () => {
  assert.deepEqual(Object.keys(NETWORKS).sort(), ['facebook', 'instagram', 'linkedin', 'x']);
  for (const net of Object.values(NETWORKS)) {
    assert.ok(net.taskSpec.length > 0, `${net.key} má taskSpec`);
  }
});
