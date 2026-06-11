// Testy SEO/JSON-LD injektoru (ingest/scripts/inject-article-seo.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildArticleJsonLd } from '../ingest/scripts/inject-article-seo.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://hspa-cesko.cz';

const article = {
  slug: 'clanek-test.html',
  title: 'Testovací titulek <s háčky>',
  perex: 'Perex & shrnutí.',
  date: '2026-06-01',
  tag: 'Prevence',
  audit: { last_reviewed: '2026-06-09' },
};

test('buildArticleJsonLd: NewsArticle s povinnými poli a absolutními URL', () => {
  const ld = buildArticleJsonLd(article);
  assert.equal(ld['@context'], 'https://schema.org');
  const news = ld['@graph'].find(n => n['@type'] === 'NewsArticle');
  assert.ok(news, 'graf obsahuje NewsArticle');
  assert.equal(news.headline, article.title);
  assert.equal(news.description, article.perex);
  assert.equal(news.url, `${SITE}/clanek-test.html`);
  assert.deepEqual(news.image, [`${SITE}/assets/covers/clanek-test.png`]);
  assert.equal(news.datePublished, '2026-06-01');
  assert.equal(news.dateModified, '2026-06-09', 'dateModified z audit.last_reviewed');
  assert.equal(news.articleSection, 'Prevence');
  assert.equal(news.publisher.name, 'HSPA Monitor');
  assert.equal(news.inLanguage, 'cs-CZ');
});

test('buildArticleJsonLd: BreadcrumbList Domů → Články → titulek', () => {
  const ld = buildArticleJsonLd(article);
  const bc = ld['@graph'].find(n => n['@type'] === 'BreadcrumbList');
  assert.ok(bc, 'graf obsahuje BreadcrumbList');
  assert.deepEqual(bc.itemListElement.map(i => i.position), [1, 2, 3]);
  assert.equal(bc.itemListElement[0].item, `${SITE}/`);
  assert.equal(bc.itemListElement[1].item, `${SITE}/clanky.html`);
  assert.equal(bc.itemListElement[2].item, `${SITE}/clanek-test.html`);
});

test('buildArticleJsonLd: dateModified spadne na date, když chybí audit', () => {
  const ld = buildArticleJsonLd({ ...article, audit: undefined });
  const news = ld['@graph'].find(n => n['@type'] === 'NewsArticle');
  assert.equal(news.dateModified, article.date);
});

test('buildArticleJsonLd: výstup je serializovatelný do validního JSON', () => {
  const json = JSON.stringify(buildArticleJsonLd(article));
  assert.doesNotThrow(() => JSON.parse(json));
});

// Smoke test: každý injektovaný JSON-LD v reálných clanek-*.html je platný JSON.
test('injektovaný JSON-LD ve všech článcích je validní JSON', () => {
  const files = readdirSync(ROOT).filter(f => /^clanek-.*\.html$/.test(f));
  const re = /<script type="application\/ld\+json" data-seo-injected="1">\s*([\s\S]*?)<\/script>/;
  let checked = 0;
  for (const f of files) {
    const html = readFileSync(resolve(ROOT, f), 'utf8');
    const m = html.match(re);
    if (!m) continue;
    assert.doesNotThrow(() => JSON.parse(m[1]), `nevalidní JSON-LD v ${f}`);
    checked++;
  }
  assert.ok(checked > 50, `očekáván JSON-LD ve většině článků (nalezeno ${checked})`);
});
