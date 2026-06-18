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
import { SITE_BASE, canonicalPath } from '../../scripts/generate-feed.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');
const ARTICLES_JSON = resolve(ROOT, 'data/articles.json');

const PUBLISHER = {
  '@type': 'Organization',
  name: 'HSPA Monitor',
  alternateName: 'Skóre zdravotnictví',
  url: `${SITE_BASE}/`,
  logo: {
    '@type': 'ImageObject',
    url: `${SITE_BASE}/assets/brand/og-default.png`,
  },
};
const AUTHOR = { '@type': 'Organization', name: 'HSPA Monitor', alternateName: 'Skóre zdravotnictví', url: `${SITE_BASE}/` };

function loadArticles() {
  return JSON.parse(readFileSync(ARTICLES_JSON, 'utf8')).articles ?? [];
}

/** Sestaví JSON-LD @graph (NewsArticle + BreadcrumbList) pro článek. */
export function buildArticleJsonLd(article) {
  const slug = article.slug;
  const base = slug.replace(/\.html$/, '');
  const url = `${SITE_BASE}/${base}`;
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
    author: AUTHOR,
    publisher: PUBLISHER,
    isAccessibleForFree: true,
  };
  if (section) newsArticle.articleSection = section;

  const breadcrumb = {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Domů', item: `${SITE_BASE}/` },
      { '@type': 'ListItem', position: 2, name: 'Články', item: `${SITE_BASE}/clanky` },
      { '@type': 'ListItem', position: 3, name: article.title, item: url },
    ],
  };

  return {
    '@context': 'https://schema.org',
    '@graph': [newsArticle, breadcrumb],
  };
}

/** Naformátuje ISO datum (YYYY-MM-DD) do české podoby „18. června 2026". */
export function formatCzechDate(iso) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat('cs-CZ', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  }).format(d);
}

/**
 * Sjednotí ve `html` viditelné datum vydání (`.article-meta-date`) a
 * `<meta property="article:published_time">` s `article.date`. Ručně psané
 * články mají datum napevno; při staged publikaci cronem (date = den
 * zveřejnění) by jinak zestaralo a rozešlo se s hub/feed. Čistá, idempotentní
 * funkce — pokud značky/datum chybí, vrátí HTML beze změny.
 */
export function applyPublishDate(html, article) {
  let out = html;
  if (article && article.date) {
    out = out.replace(
      /(<meta\s+property=["']article:published_time["']\s+content=["'])[^"']*(["'])/i,
      `$1${article.date}$2`,
    );
    const cz = formatCzechDate(article.date);
    if (cz) {
      out = out.replace(
        /(<span class="article-meta-date">)[^<]*(<\/span>)/,
        `$1${cz}$2`,
      );
    }
  }
  return out;
}

export function processArticle(article) {
  if (article.published === false) return { status: 'skip-draft' };

  const slug = article.slug;
  const htmlPath = resolve(ROOT, slug);
  if (!existsSync(htmlPath)) return { status: 'skip-no-html', slug };

  let html = readFileSync(htmlPath, 'utf8');
  // `article-page` jako class token — pokryje i varianty s víc třídami
  // (např. class="article-page article-page-manifest").
  if (!/class="[^"]*\barticle-page\b[^"]*"/.test(html)) return { status: 'skip-no-article', slug };

  const url = `${SITE_BASE}/${slug.replace(/\.html$/, "")}`;

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

  // Sjednoť viditelné datum vydání a article:published_time se skutečným dnem
  // publikace (article.date). Při staged publikaci cronem by napevno psané
  // datum jinak zestaralo a rozešlo se s datem v hub/feed.
  html = applyPublishDate(html, article);

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
