// Sériová navigace pro 9dílnou sérii „Jak (ne)reformovat komplexní systém".
//
// Vykresluje na stránkách clanek-*.html, které do série patří:
//   - kompaktní číslovaný pásek 1–9 hned pod hlavičkou článku (rychlá orientace)
//   - blok „předchozí / další díl" na konci článku
//
// Idempotentní: na ne-sériových stránkách (nebo při opakovaném volání) tiše
// skončí. Pořadí a čísla odpovídají samočíslování „díl N/9" uvnitř textů
// (registr viz PLAN-SERIE-REFORMA-KOMPLEXITA.md). Při změně série se edituje
// jen pole SERIES níže — propíše se do všech dílů automaticky.

const SERIES_TITLE = 'Jak (ne)reformovat komplexní systém';
const SERIES_HUB = 'clanky.html';

const SERIES = [
  { n: 1, slug: 'clanek-teorie-zmeny.html',              short: 'Teorie změny' },
  { n: 2, slug: 'clanek-rizeni-podle-vysledku.html',     short: 'Řízení podle výsledků' },
  { n: 3, slug: 'clanek-komplexita-reforem.html',        short: 'Komplexita a okno příležitosti' },
  { n: 4, slug: 'clanek-systemove-mapovani-paky.html',   short: 'Systémové mapování a páky' },
  { n: 5, slug: 'clanek-datova-patere-lock-in.html',     short: 'Datová páteř a lock-in' },
  { n: 6, slug: 'clanek-ukazatele-dashboard.html',       short: 'Ukazatele a dashboard' },
  { n: 7, slug: 'clanek-platit-za-vysledek-vbhc.html',   short: 'Platba za výsledek (VBHC)' },
  { n: 8, slug: 'clanek-governance-nezavislost.html',    short: 'Governance a nezávislost' },
  { n: 9, slug: 'clanek-posledni-mile-implementace.html', short: 'Poslední míle: implementace' },
];

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);
}

function detectArticleSlug() {
  const path = (location.pathname || '').split('/').filter(Boolean).pop() || '';
  if (path.startsWith('clanek-') && path.endsWith('.html')) return path;
  const ds = document.body?.dataset?.articleSlug;
  if (ds) return ds;
  return null;
}

/** Kompaktní číslovaný pásek 1–9 + název série. */
function buildTopStrip(idx) {
  const pills = SERIES.map(d => {
    const isCurrent = d.n === SERIES[idx].n;
    const aria = `Díl ${d.n}: ${escapeHtml(d.short)}`;
    if (isCurrent) {
      return `<span class="series-pill series-pill-current" aria-current="step" title="${aria}">${d.n}</span>`;
    }
    return `<a class="series-pill" href="${d.slug}" title="${aria}">${d.n}</a>`;
  }).join('');

  const nav = document.createElement('nav');
  nav.className = 'series-strip';
  nav.setAttribute('aria-label', `Série: ${SERIES_TITLE}`);
  nav.dataset.seriesRendered = '1';
  nav.innerHTML = `
    <a class="series-strip-label" href="${SERIES_HUB}">
      <span class="series-strip-kicker">Série · díl ${SERIES[idx].n} z ${SERIES.length}</span>
      <span class="series-strip-title">${escapeHtml(SERIES_TITLE)}</span>
    </a>
    <div class="series-pills" role="list">${pills}</div>`;
  return nav;
}

/** Blok „předchozí / další díl" na konec článku. */
function buildPrevNext(idx) {
  const prev = idx > 0 ? SERIES[idx - 1] : null;
  const next = idx < SERIES.length - 1 ? SERIES[idx + 1] : null;

  const card = (d, dir) => {
    if (!d) return `<span class="series-nav-card series-nav-card-empty" aria-hidden="true"></span>`;
    const label = dir === 'prev' ? '← Předchozí díl' : 'Další díl →';
    return `<a class="series-nav-card series-nav-card-${dir}" href="${d.slug}">
      <span class="series-nav-dir">${label}</span>
      <span class="series-nav-num">Díl ${d.n}</span>
      <span class="series-nav-title">${escapeHtml(d.short)}</span>
    </a>`;
  };

  const sec = document.createElement('nav');
  sec.className = 'series-prevnext';
  sec.setAttribute('aria-label', `Navigace série: ${SERIES_TITLE}`);
  sec.dataset.seriesRendered = '1';
  sec.innerHTML = `
    <a class="series-prevnext-hub" href="${SERIES_HUB}">
      <span class="series-prevnext-kicker">Série · ${escapeHtml(SERIES_TITLE)}</span>
      <span class="series-prevnext-all">Všech ${SERIES.length} dílů →</span>
    </a>
    <div class="series-nav-cards">${card(prev, 'prev')}${card(next, 'next')}</div>`;
  return sec;
}

/**
 * Vloží sériovou navigaci do aktuálního článku, pokud patří do série.
 * Idempotentní; volá se z clanky.js auto-bootstrapu.
 */
export function enhanceSeriesNav() {
  if (typeof document === 'undefined') return;
  const articleEl = document.querySelector('article.article-page');
  if (!articleEl) return;
  if (articleEl.querySelector('[data-series-rendered]')) return;

  const slug = detectArticleSlug();
  if (!slug) return;
  const idx = SERIES.findIndex(d => d.slug === slug);
  if (idx === -1) return; // článek není součástí série

  // Top: hned za hlavičkou článku (pod perexem/meta)
  const header = articleEl.querySelector('header.article-header');
  if (header) header.insertAdjacentElement('afterend', buildTopStrip(idx));

  // Bottom: na konec článku
  articleEl.appendChild(buildPrevNext(idx));
}
