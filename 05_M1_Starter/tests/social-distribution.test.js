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
  oversizedTweets,
  TWEET_LIMIT,
  NETWORKS,
} from '../social/generators/summary-generator.js';
import { richText } from '../social/notion/schema.js';
import { buildMakePayload } from '../social/publisher/webhook-publisher.js';

test('isArticleVisible: published=false je vždy skrytý', () => {
  assert.equal(isArticleVisible({ published: false, date: '2020-01-01' }), false);
});

// `now` se zadává jako absolutní okamžik (UTC, sufix Z), aby byl test
// deterministický nezávisle na časové zóně hostu. Květen = CEST (UTC+2).
test('isArticleVisible: datum v budoucnu je skryté', () => {
  assert.equal(isArticleVisible({ date: '2026-05-25' }, new Date('2026-05-20T10:00:00Z')), false);
});

test('isArticleVisible: datum v minulosti je viditelné', () => {
  assert.equal(isArticleVisible({ date: '2026-05-10' }, new Date('2026-05-20T10:00:00Z')), true);
});

test('isArticleVisible: dnešní datum se zobrazí až po 06:00 času Europe/Prague', () => {
  // 03:30 UTC = 05:30 v Praze (CEST) → ještě skrytý
  assert.equal(isArticleVisible({ date: '2026-05-20' }, new Date('2026-05-20T03:30:00Z')), false);
  // 04:30 UTC = 06:30 v Praze (CEST) → viditelný
  assert.equal(isArticleVisible({ date: '2026-05-20' }, new Date('2026-05-20T04:30:00Z')), true);
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

test('oversizedTweets: označí tweety přes 280 znaků', () => {
  assert.deepEqual(oversizedTweets(['krátký tweet', 'taky krátký']), []);
  const warnings = oversizedTweets(['ok', 'x'.repeat(TWEET_LIMIT + 20)]);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /tweet 2\/2/);
  assert.match(warnings[0], new RegExp(`${TWEET_LIMIT + 20} znaků`));
});

test('richText: rozdělí text nad 2000 znaků na bloky', () => {
  const r = richText('a'.repeat(4500));
  assert.equal(r.length, 3);
  assert.equal(r[0].text.content.length, 2000);
  assert.equal(r[2].text.content.length, 500);
});

test('richText: prázdný vstup vrátí jeden prázdný blok', () => {
  assert.deepEqual(richText(''), [{ text: { content: '' } }]);
});

test('buildMakePayload: poskládá posts podle sítí včetně vlákna X', () => {
  const p = buildMakePayload('art-1', [
    { network: 'facebook', text: 'fb', imageUrl: 'u1', articleUrl: 'a' },
    { network: 'x', text: 'x1', imageUrl: null, articleUrl: 'a', thread: ['t1', 't2'] },
  ]);
  assert.equal(p.articleId, 'art-1');
  assert.equal(p.posts.facebook.text, 'fb');
  assert.deepEqual(p.posts.x.thread, ['t1', 't2']);
  assert.equal(p.posts.facebook.thread, undefined);
});

test('NETWORKS: definuje právě 4 sítě s neprázdným zadáním', () => {
  assert.deepEqual(Object.keys(NETWORKS).sort(), ['facebook', 'instagram', 'linkedin', 'x']);
  for (const net of Object.values(NETWORKS)) {
    assert.ok(net.taskSpec.length > 0, `${net.key} má taskSpec`);
  }
});
