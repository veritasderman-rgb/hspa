// Stránka detailu jedné rubriky (rubrika.html?id=<rubric>).
// Hlavička rubriky (kicker/headline/lead + barva) + chronologický seznam
// všech jejích publikovaných článků. Rubriky jsou páteř sekce Články (F1/F2),
// tato stránka je jejich „landing" (F3).

import './analytics.js';
import {
  renderModuleNav, renderMastheadDate, renderFooter, injectScrollToTop,
  isArticleVisible, escapeHtml as esc,
} from './page-shared.js';

function formatCzDate(iso) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const months = ['ledna', 'února', 'března', 'dubna', 'května', 'června',
    'července', 'srpna', 'září', 'října', 'listopadu', 'prosince'];
  return `${d.getDate()}. ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function sortNewestFirst(articles) {
  return [...articles].sort((a, b) => {
    const da = new Date(a.date).getTime();
    const db = new Date(b.date).getTime();
    if (db !== da) return db - da;
    if (a.number === 'M') return -1;
    if (b.number === 'M') return 1;
    return parseInt(b.number, 10) - parseInt(a.number, 10);
  });
}

function renderItem(a) {
  const coverSrc = a.slug ? `assets/covers/${a.slug.replace(/\.html$/, '.png')}` : '';
  const coverHtml = coverSrc
    ? `<img class="article-list-cover" src="${esc(coverSrc)}" alt="" loading="lazy" decoding="async" onerror="this.closest('.article-list-item').classList.add('article-list-item-no-cover'); this.remove();">`
    : '';
  return `
    <li class="article-list-item">
      <a href="${esc(a.slug)}" class="article-list-link">
        ${coverHtml}
        <div class="article-list-body">
          <div class="article-list-meta">
            <span class="article-list-num">${esc(a.number)}</span>
            <span class="article-list-tag">${esc(a.tag)}</span>
            <span class="article-list-date">${formatCzDate(a.date)}</span>
          </div>
          <h4 class="article-list-title">${esc(a.title)}</h4>
          <p class="article-list-perex">${esc(a.perex ?? '')}</p>
          <span class="article-list-cta">Číst článek →</span>
        </div>
      </a>
    </li>`;
}

function renderNotFound(view) {
  view.innerHTML = `
    <section class="ed-hero">
      <div class="ed-hero-content">
        <div class="ed-kicker">Rubrika nenalezena</div>
        <h2 class="ed-hero-headline">Tuto rubriku neznáme.</h2>
        <p class="ed-hero-lead">Vyberte rubriku v <a href="clanky.html">přehledu článků</a>.</p>
      </div>
    </section>`;
}

async function init() {
  renderModuleNav('articles');
  renderMastheadDate();
  renderFooter();
  injectScrollToTop();

  const view = document.getElementById('rubricView');
  if (!view) return;

  const id = new URLSearchParams(location.search).get('id');
  if (!id) { renderNotFound(view); return; }

  let rubrics = [], articles = [];
  try {
    const [rData, aData] = await Promise.all([
      fetch('data/rubrics.json').then(r => r.json()),
      fetch('data/articles.json').then(r => r.json()),
    ]);
    rubrics = rData.rubrics ?? [];
    articles = aData.articles ?? [];
  } catch {
    view.innerHTML = '<p class="article-list-loading">Nepodařilo se načíst data rubriky.</p>';
    return;
  }

  const rubric = rubrics.find(r => r.id === id);
  if (!rubric) { renderNotFound(view); return; }

  document.title = `${rubric.label} · Rubriky · HSPA Monitor`;

  // SEO: každá rubrika je vlastní landing page s vlastní canonical URL
  // a popisem (dřív canonical ukazovala na clanky.html a rubriky se
  // neindexovaly — při 20–50 článcích na rubriku je vlastní vstup na místě).
  const canonicalHref = `https://skorezdravotnictvi.cz/rubrika?id=${encodeURIComponent(rubric.id)}`;
  let canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.setAttribute('rel', 'canonical');
    document.head.appendChild(canonical);
  }
  canonical.setAttribute('href', canonicalHref);
  document.querySelector('meta[name="description"]')?.setAttribute('content',
    `${rubric.label}: ${rubric.lead}`);

  const items = sortNewestFirst(articles.filter(a => a.rubric === id && isArticleVisible(a)));
  const essentials = items.filter(a => a.pinned_essential === true).slice(0, 3);

  view.innerHTML = `
    <section class="ed-hero hub-rubric-${esc(rubric.color)}" aria-labelledby="rubricHeadline" style="border-left-width:4px;border-left-style:solid;padding-left:20px;">
      <div class="ed-hero-content">
        <div class="ed-kicker hub-rubric-kicker">${esc(rubric.kicker)}</div>
        <h2 class="ed-hero-headline" id="rubricHeadline">${esc(rubric.headline)}</h2>
        <p class="ed-hero-lead">${esc(rubric.lead)}</p>
      </div>
      <aside class="ed-hero-stats" aria-label="Přehled rubriky">
        <div class="ed-stat ed-stat-static">
          <div class="ed-stat-num">${items.length} <span class="ed-stat-unit">čl.</span></div>
          <div class="ed-stat-lbl">Článků v rubrice ${esc(rubric.label)}</div>
          <div class="ed-stat-meta">Chronologicky od nejnovějšího</div>
        </div>
      </aside>
    </section>

    ${essentials.length ? `
    <section class="article-list-section" aria-labelledby="rubricEssentialsH">
      <div class="ed-kicker">Pro orientaci</div>
      <h3 class="hub-section-h" id="rubricEssentialsH">Začněte tady</h3>
      <ol class="article-list">${essentials.map(renderItem).join('')}</ol>
    </section>` : ''}

    <section class="article-list-section" aria-labelledby="rubricListH">
      <h3 class="hub-section-h" id="rubricListH">Všechny články v rubrice</h3>
      ${items.length
        ? `<ol class="article-list">${items.map(renderItem).join('')}</ol>`
        : '<p class="article-list-empty">V této rubrice zatím není žádný publikovaný článek.</p>'}
    </section>`;
}

if (typeof window !== 'undefined') init();
