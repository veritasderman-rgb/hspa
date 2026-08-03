// Fulltextový index vyhledávání (scripts/build-search-index.js) a jeho
// napojení na overlay search (src/search.js). Hlídá past z review plánu:
// index musí obsahovat CELÝ text článku, ne výňatek — dotaz vyskytující se
// až na konci textu musí být dohledatelný.
import test from 'node:test';
import assert from 'node:assert/strict';
import { extractArticleText, buildSearchIndex } from '../scripts/build-search-index.js';
import { buildIndex, searchIndex } from '../src/search.js';

test('extractArticleText: tagy, skripty i entity pryč, text kompletní', () => {
  const html = `<html><body><main><article class="article-page">
    <script>var x = 'NEINDEXOVAT';</script>
    <style>.a { color: red; }</style>
    <h1>Titulek &amp; podtitulek</h1>
    <p>První odstavec o&nbsp;prevenci.</p>
    <svg><text>svg-balast</text></svg>
    <!-- interní poznámka -->
    <p>Úplně poslední věta obsahuje slovo kolonoskopie.</p>
  </article></main></body></html>`;
  const text = extractArticleText(html);
  assert.ok(text.includes('Titulek & podtitulek'));
  assert.ok(text.includes('prevenci'));
  assert.ok(text.includes('kolonoskopie'), 'text z konce článku musí být v indexu');
  assert.ok(!text.includes('NEINDEXOVAT'), 'skripty se neindexují');
  assert.ok(!text.includes('svg-balast'), 'svg se neindexuje');
  assert.ok(!text.includes('interní poznámka'), 'HTML komentáře se neindexují');
  assert.ok(!/<[a-z]/.test(text), 'žádné zbylé tagy');
});

test('buildSearchIndex: drafty a plánované články do indexu neuniknou', () => {
  const now = new Date('2026-08-03T12:00:00Z');
  const data = {
    articles: [
      { slug: 'clanek-a.html', published: true, date: '2026-08-01' },
      { slug: 'clanek-draft.html', published: false, date: '2026-08-01' },
      { slug: 'clanek-budouci.html', published: true, date: '2026-08-04' },
      { slug: 'clanek-chybi.html', published: true, date: '2026-08-01' },
    ],
  };
  const htmlBySlug = {
    'clanek-a.html': '<article><p>obsah A</p></article>',
    'clanek-draft.html': '<article><p>tajný draft</p></article>',
    'clanek-budouci.html': '<article><p>embargovaný text</p></article>',
    // clanek-chybi.html schválně nemá soubor
  };
  const index = buildSearchIndex(data, s => htmlBySlug[s] ?? null, now);
  assert.deepEqual(index.entries.map(e => e.slug), ['clanek-a.html']);
  assert.equal(index.count, 1);
});

test('searchIndex: fulltext dohledá článek, jehož metadata token neobsahují', () => {
  const idx = buildIndex({
    articles: [
      { slug: 'clanek-x.html', title: 'O prevenci', perex: 'Perex bez vzácného slova.', tag: 'Prevence', topics: [] },
    ],
  });
  // Bez fulltextu: nic
  assert.equal(searchIndex('polypragmazie', idx).length, 0);
  // S fulltextem: nalezeno přes tělo článku
  const ft = new Map([['clanek-x.html', 'dlouhý text článku … polypragmazie u seniorů …']]);
  const hits = searchIndex('polypragmazie', idx, ft);
  assert.equal(hits.length, 1);
  assert.equal(hits[0].id, 'clanek-x.html');
});

test('searchIndex: metadata match má vyšší skóre než čistý fulltext match', () => {
  const idx = buildIndex({
    articles: [
      { slug: 'clanek-meta.html', title: 'Screening kolorektálního karcinomu', perex: '', tag: '', topics: [] },
      { slug: 'clanek-ft.html', title: 'Jiné téma', perex: '', tag: '', topics: [] },
    ],
  });
  const ft = new Map([['clanek-ft.html', 'text zmiňující screening jen v těle']]);
  const hits = searchIndex('screening', idx, ft);
  assert.equal(hits.length, 2);
  assert.equal(hits[0].id, 'clanek-meta.html', 'title match (+20) > fulltext match (+3)');
});
