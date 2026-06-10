// Testy RSS generátoru (scripts/generate-feed.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildRss, visibleArticles, SITE_BASE } from '../scripts/generate-feed.js';

const arts = [
  { slug: 'clanek-a.html', title: 'Á <test>', perex: 'P & Q', date: '2026-06-01', tag: 'Prevence' },
  { slug: 'clanek-b.html', title: 'B', date: '2026-06-09' },
  { slug: 'clanek-draft.html', title: 'Draft', date: '2026-06-01', published: false },
  { slug: 'clanek-future.html', title: 'Budoucí', date: '2027-01-01' },
];

test('visibleArticles: drafty a budoucí data ven, řazení nejnovější první', () => {
  const v = visibleArticles(arts, '2026-06-10');
  assert.deepEqual(v.map(a => a.slug), ['clanek-b.html', 'clanek-a.html']);
});

test('buildRss: validní struktura, escapování, absolutní URL', () => {
  const xml = buildRss(arts, { today: '2026-06-10', now: new Date('2026-06-10T06:00:00Z') });
  assert.match(xml, /<rss version="2.0"/);
  assert.match(xml, /Á &lt;test&gt;/);
  assert.match(xml, /P &amp; Q/);
  assert.ok(xml.includes(`${SITE_BASE}/clanek-a.html`));
  assert.ok(!xml.includes('clanek-draft'), 'draft nesmí být ve feedu');
  assert.ok(!xml.includes('clanek-future'), 'budoucí článek nesmí být ve feedu');
  assert.equal((xml.match(/<item>/g) ?? []).length, 2);
});
