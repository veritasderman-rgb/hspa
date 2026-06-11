// Prerender nejnovějších článků do statického HTML homepage (#homeArticlesGrid).
//
// Proč: hlavní obsah homepage (seznam článků) plní app.js za běhu → ne-JS
// crawlery a AI enginy viděly prázdnou kostru. Tady do index.html zapečeme
// statický seznam 3 nejnovějších článků. app.js ho při načtení přepíše
// (`grid.innerHTML = …`), takže pro uživatele je výsledek stejný a nedochází
// k duplicitě — jen crawler navíc dostane obsah bez JS (GEO).
//
// Markup zrcadlí render v src/app.js (renderHomeArticles), ať je shodný i před
// hydratací. Regeneruje se cronem po publikaci/refreshi dat.
//
// Použití: node scripts/prerender-homepage.js [--dry]

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { visibleArticles } from './generate-feed.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DRY = process.argv.includes('--dry');
const COUNT = 3;
const MONTHS = ['ledna', 'února', 'března', 'dubna', 'května', 'června',
  'července', 'srpna', 'září', 'října', 'listopadu', 'prosince'];

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function fmtDate(iso) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return `${d.getDate()}. ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function buildHomeArticlesHtml(articles, today) {
  const picks = visibleArticles(articles, today)
    .filter(a => a.kind !== 'manifest')
    .sort((a, b) => (b.date.localeCompare(a.date)) || (parseInt(b.number, 10) - parseInt(a.number, 10)))
    .slice(0, COUNT);
  return picks.map(a => `
      <li class="home-article-card">
        <a class="home-article-link" href="${esc(a.slug)}">
          <div class="home-article-meta">
            <span class="home-article-num">${esc(a.number)}</span>
            <span class="home-article-tag">${esc(a.tag)}</span>
            <span class="home-article-date">${esc(fmtDate(a.date))}</span>
          </div>
          <h4 class="home-article-title">${esc(a.title)}</h4>
          <p class="home-article-perex">${esc(a.perex)}</p>
          <span class="home-article-cta">Číst článek →</span>
        </a>
      </li>`).join('') + '\n    ';
}

function main() {
  const articles = JSON.parse(readFileSync(resolve(ROOT, 'data/articles.json'), 'utf8')).articles ?? [];
  const today = new Date().toISOString().slice(0, 10);
  const inner = buildHomeArticlesHtml(articles, today);

  const indexPath = resolve(ROOT, 'index.html');
  let html = readFileSync(indexPath, 'utf8');
  const re = /(<ol class="home-articles-grid" id="homeArticlesGrid">)[\s\S]*?(<\/ol>)/;
  if (!re.test(html)) {
    console.error('index.html: #homeArticlesGrid nenalezen — přeskakuji.');
    process.exit(1);
  }
  const out = html.replace(re, `$1${inner}$2`);
  if (out === html) {
    console.log('homepage: beze změny.');
    return;
  }
  if (!DRY) writeFileSync(indexPath, out);
  const n = (inner.match(/home-article-card/g) || []).length;
  console.log(`index.html: zapečeno ${n} článků do #homeArticlesGrid`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
