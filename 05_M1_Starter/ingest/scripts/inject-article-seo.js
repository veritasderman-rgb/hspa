// Vloží do <head> každé publikované clanek-*.html stránky SEO/GEO prvky, které
// se v ručně psaných článcích nedají snadno udržovat konzistentně:
//
//   - <link rel="canonical" href="ABSOLUTNÍ URL">
//   - <meta property="og:url" content="ABSOLUTNÍ URL">
//   - <script type="application/ld+json"> s @graph:
//       • NewsArticle (headline, description, datePublished/Modified, image,
//         author + publisher = HSPA Monitor, inLanguage, articleSection)
//       • BreadcrumbList (Domů → Články → titulek)
//
// Strukturovaná data jsou STATICKÁ v HTML (ne injektovaná JS za běhu), aby je
// viděly i ne-JS crawlery a AI odpovědní enginy (GEO). Vstup je `data/articles.json`
// — jediný zdroj pravdy o metadatech článku.
//
// Vlastnosti:
//   - Idempotentní — re-spuštění nevytvoří duplikáty (značka data-seo-injected)
//   - Bezpečné — upraví jen článek s .article-page; drafty (published:false) skipne
//
// Použití:
//   node ingest/scripts/inject-article-seo.js          — všechny publikované
//   node ingest/scripts/inject-article-seo.js <slug>   — jen jeden článek

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITE_BASE } from '../../scripts/generate-feed.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');
const ARTICLES_JSON = resolve(ROOT, 'data/articles.json');

const PUBLISHER = {
  '@type': 'Organization',
  name: 'HSPA Monitor',
  url: `${SITE_BASE}/`,
  logo: {
    '@type': 'ImageObject',
    url: `${SITE_BASE}/assets/brand/og-default.png`,
  },
};

function loadArticles() {
  return JSON.parse(readFileSync(ARTICLES_JSON, 'utf8')).articles ?? [];
}

/** Sestaví JSON-LD @graph (NewsArticle + BreadcrumbList) pro článek. */
export function buildArticleJsonLd(article) {
  const slug = article.slug;
  const base = slug.replace(/\.html$/, '');
  const url = `${SITE_BASE}/${slug}`;
  const image = `${SITE_BASE}/assets/covers/${base}.png`;
  const datePublished = article.date;
  const dateModified = article.audit?.last_reviewed || article.date;
  const section = article.tag || article.rubric || undefined;

  const newsArticle = {
    '@type': 'NewsArticle',
    '@id': `${url}#article`,
    headline: article.title,
    description: article.perex || undefined,
    inLanguage: 'cs-CZ',
    image: [image],
    url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    datePublished,
    dateModified,
    author: { '@type': 'Organization', name: 'HSPA Monitor', url: `${SITE_BASE}/` },
    publisher: PUBLISHER,
    isAccessibleForFree: true,
  };
  if (section) newsArticle.articleSection = section;

  const breadcrumb = {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Domů', item: `${SITE_BASE}/` },
      { '@type': 'ListItem', position: 2, name: 'Články', item: `${SITE_BASE}/clanky.html` },
      { '@type': 'ListItem', position: 3, name: article.title, item: url },
    ],
  };

  return {
    '@context': 'https://schema.org',
    '@graph': [newsArticle, breadcrumb],
  };
}

export function processArticle(article) {
  if (article.published === false) return { status: 'skip-draft' };

  const slug = article.slug;
  const htmlPath = resolve(ROOT, slug);
  if (!existsSync(htmlPath)) return { status: 'skip-no-html', slug };

  let html = readFileSync(htmlPath, 'utf8');
  if (!/class="article-page"/.test(html)) return { status: 'skip-no-article', slug };

  const url = `${SITE_BASE}/${slug}`;

  // Idempotence — odstraň předchozí injektáž (meta/link i JSON-LD blok).
  html = html.replace(/\n\s*<(?:link|meta)[^>]*data-seo-injected="1"[^>]*>/g, '');
  html = html.replace(/\n\s*<script type="application\/ld\+json" data-seo-injected="1">[\s\S]*?<\/script>/g, '');

  const jsonLd = JSON.stringify(buildArticleJsonLd(article), null, 2);
  const block = `
  <link rel="canonical" href="${url}" data-seo-injected="1">
  <meta property="og:url" content="${url}" data-seo-injected="1">
  <script type="application/ld+json" data-seo-injected="1">
${jsonLd}
  </script>`;

  html = html.replace('</head>', `${block}\n</head>`);
  writeFileSync(htmlPath, html);
  return { status: 'updated', slug };
}

function main() {
  const arg = process.argv[2];
  const articles = loadArticles();

  let toProcess = articles;
  if (arg) {
    const slug = arg.endsWith('.html') ? arg : `${arg}.html`;
    toProcess = articles.filter(a => a.slug === slug || a.id === arg);
    if (toProcess.length === 0) {
      console.error(`Article not found: ${arg}`);
      process.exit(1);
    }
  }

  const counts = {};
  for (const a of toProcess) {
    const r = processArticle(a);
    counts[r.status] = (counts[r.status] || 0) + 1;
    if (r.status === 'updated') console.log(`✓ ${r.slug}`);
  }
  console.log('\nSummary:');
  for (const [k, v] of Object.entries(counts)) {
    if (v > 0) console.log(`  ${k}: ${v}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
