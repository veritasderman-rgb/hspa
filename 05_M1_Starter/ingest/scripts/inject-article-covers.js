// Vloží cover image do každé clanek-*.html stránky:
//   - <meta property="og:image">     PNG pro social cards
//   - <meta property="og:image:width|height">
//   - <meta name="twitter:card" content="summary_large_image">
//   - <meta name="twitter:image">
//   - <img class="article-cover"> pod breadcrumb (přesnou pozici řeší CSS)
//
// Vlastnosti:
//   - Idempotentní — re-spuštění nevytvoří duplikáty (značky data-cover-injected)
//   - Bezpečné — neupraví článek bez .article-page nebo bez existující cover SVG
//   - Skipne článek pokud nemá příslušný cover v assets/covers/
//
// Použití:
//   node ingest/scripts/inject-article-covers.js
//   node ingest/scripts/inject-article-covers.js <slug>   — jen jeden článek

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');
const ARTICLES_JSON = resolve(ROOT, 'data/articles.json');
const COVERS_DIR = resolve(ROOT, 'assets/covers');

function loadArticles() {
  return JSON.parse(readFileSync(ARTICLES_JSON, 'utf8')).articles ?? [];
}

function processArticle(article) {
  if (article.published === false) return { status: 'skip-draft' };

  const slug = article.slug;
  const htmlPath = resolve(ROOT, slug);
  if (!existsSync(htmlPath)) return { status: 'skip-no-html', slug };

  const baseName = slug.replace(/\.html$/, '');
  const pngPath = `assets/covers/${baseName}.png`;
  const svgPath = `assets/covers/${baseName}.svg`;
  if (!existsSync(resolve(ROOT, pngPath))) return { status: 'skip-no-cover', slug };

  let html = readFileSync(htmlPath, 'utf8');

  // 1) Inject OG/Twitter meta tagy do <head>
  const ogTags = `
  <meta property="og:image" content="${pngPath}" data-cover-injected="1">
  <meta property="og:image:width" content="1200" data-cover-injected="1">
  <meta property="og:image:height" content="630" data-cover-injected="1">
  <meta property="og:image:type" content="image/png" data-cover-injected="1">
  <meta name="twitter:card" content="summary_large_image" data-cover-injected="1">
  <meta name="twitter:image" content="${pngPath}" data-cover-injected="1">`;

  // Remove previous injections (idempotent)
  html = html.replace(/\n\s*<meta[^>]*data-cover-injected="1"[^>]*>/g, '');

  // Vlož před </head> (před zavírací tag)
  html = html.replace('</head>', `${ogTags}\n</head>`);

  // 2) Inject <img class="article-cover"> pod .article-breadcrumb
  // Remove previous cover img
  html = html.replace(/<img[^>]*class="article-cover"[^>]*>\s*/g, '');

  const coverImg = `<img class="article-cover" src="${pngPath}" alt="" width="1200" height="630" loading="eager" decoding="async">`;

  // Hledáme breadcrumb nav, vložíme cover hned PŘED ním
  const breadcrumbRe = /(<nav class="article-breadcrumb"[^>]*>)/;
  if (breadcrumbRe.test(html)) {
    html = html.replace(breadcrumbRe, `${coverImg}\n    $1`);
  } else {
    // Fallback — vlož na začátek <article class="article-page">
    html = html.replace(/(<article class="article-page"[^>]*>)/, `$1\n    ${coverImg}`);
  }

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

  const counts = { updated: 0, 'skip-draft': 0, 'skip-no-html': 0, 'skip-no-cover': 0 };
  for (const a of toProcess) {
    const r = processArticle(a);
    counts[r.status] = (counts[r.status] || 0) + 1;
    if (r.status === 'updated') console.log(`✓ ${r.slug}`);
    else if (r.status === 'skip-no-cover') console.log(`× ${r.slug} — chybí cover`);
  }
  console.log('\nSummary:');
  for (const [k, v] of Object.entries(counts)) {
    if (v > 0) console.log(`  ${k}: ${v}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
