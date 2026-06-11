// Testy prerenderu homepage (scripts/prerender-homepage.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildHomeArticlesHtml } from '../scripts/prerender-homepage.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const arts = [
  { slug: 'clanek-a.html', number: '10', tag: 'Prevence', date: '2026-06-01', title: 'Á <b>', perex: 'P & Q' },
  { slug: 'clanek-b.html', number: '11', tag: 'Reforma', date: '2026-06-09', title: 'B', perex: 'b' },
  { slug: 'clanek-c.html', number: '12', tag: 'Data', date: '2026-06-05', title: 'C', perex: 'c' },
  { slug: 'clanek-d.html', number: '13', tag: 'X', date: '2026-06-08', title: 'D', perex: 'd' },
  { slug: 'clanek-future.html', number: '14', tag: 'X', date: '2027-01-01', title: 'F', perex: 'f' },
  { slug: 'clanek-manifest.html', number: '1', tag: 'M', date: '2026-06-09', title: 'M', perex: 'm', kind: 'manifest' },
];

test('buildHomeArticlesHtml: 3 nejnovější, nejnovější první, manifest a budoucí ven', () => {
  const html = buildHomeArticlesHtml(arts, '2026-06-10');
  const cards = html.match(/home-article-card/g) || [];
  assert.equal(cards.length, 3);
  // pořadí podle data: b(09) > d(08) > c(05)
  const order = [...html.matchAll(/href="(clanek-[a-z]+\.html)"/g)].map(m => m[1]);
  assert.deepEqual(order, ['clanek-b.html', 'clanek-d.html', 'clanek-c.html']);
  assert.ok(!html.includes('clanek-future'), 'budoucí ven');
  assert.ok(!html.includes('clanek-manifest'), 'manifest ven');
});

test('buildHomeArticlesHtml: escapuje HTML v titulku/perexu', () => {
  const html = buildHomeArticlesHtml([arts[0]], '2026-06-10');
  assert.ok(html.includes('Á &lt;b&gt;'), 'titulek escapován');
  assert.ok(html.includes('P &amp; Q'), 'perex escapován');
});

test('index.html má zapečené statické články v #homeArticlesGrid', () => {
  const html = readFileSync(resolve(ROOT, 'index.html'), 'utf8');
  const m = html.match(/<ol class="home-articles-grid" id="homeArticlesGrid">([\s\S]*?)<\/ol>/);
  assert.ok(m, '#homeArticlesGrid existuje');
  assert.ok((m[1].match(/home-article-card/g) || []).length >= 1, 'obsahuje statické karty');
});
