// Sériová navigace pro 9dílnou sérii „Jak (ne)reformovat komplexní systém".
//
// Na stránkách clanek-*.html, které do série patří, vykreslí JEDNOTNÝ seznam
// všech dílů (s názvy) — hned pod hlavičkou článku a znovu na jeho konci.
// Aktuální díl je v obou seznamech zvýrazněn červenou tečkou „jste zde".
//
// Idempotentní: na ne-sériových stránkách (nebo při opakovaném volání) tiše
// skončí. Pořadí a čísla odpovídají samočíslování „díl N/9" uvnitř textů
// (registr viz PLAN-SERIE-REFORMA-KOMPLEXITA.md). Při změně série se edituje
// jen pole SERIES níže — propíše se do všech dílů automaticky.
//
// Respektuje viditelnost (isArticleVisible): díl, který ještě není publikovaný
// (published:false nebo datum v budoucnu), se vykreslí jako neaktivní
// („připravujeme"), nikdy ne jako živý odkaz na draft. Seznam tak zůstává
// konzistentní s hubem i v období, kdy série vychází po částech.

import { isArticleVisible } from './page-shared.js';

export const SERIES_TITLE = 'Jak (ne)reformovat komplexní systém';
const SERIES_HUB = 'clanky.html';

export const SERIES = [
  { n: 1, slug: 'clanek-teorie-zmeny.html',               short: 'Teorie změny a logický model' },
  { n: 2, slug: 'clanek-rizeni-podle-vysledku.html',      short: 'Řízení podle výsledků' },
  { n: 3, slug: 'clanek-komplexita-reforem.html',         short: 'Komplexita, chaos a okno příležitosti' },
  { n: 4, slug: 'clanek-systemove-mapovani-paky.html',    short: 'Systémové mapování a páky změny' },
  { n: 5, slug: 'clanek-datova-patere-lock-in.html',      short: 'Datová páteř, interoperabilita a lock-in' },
  { n: 6, slug: 'clanek-ukazatele-dashboard.html',        short: 'Ukazatele a dashboard, který vede k akci' },
  { n: 7, slug: 'clanek-platit-za-vysledek-vbhc.html',    short: 'Platit za výsledek (value-based healthcare)' },
  { n: 8, slug: 'clanek-governance-nezavislost.html',     short: 'Governance a nezávislost měřičů' },
  { n: 9, slug: 'clanek-posledni-mile-implementace.html', short: 'Poslední míle: implementace reforem' },
];

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);
}

function detectArticleSlug() {
  // Vercel servíruje s cleanUrls:true → live cesta je „/clanek-foo" bez .html;
  // lokálně (http-server) je „/clanek-foo.html". Normalizuj na tvar se .html,
  // ať odpovídá slugům v articles.json / registru SERIES.
  const last = (location.pathname || '').split('/').filter(Boolean).pop() || '';
  if (last.startsWith('clanek-')) {
    return last.endsWith('.html') ? last : `${last}.html`;
  }
  const ds = document.body?.dataset?.articleSlug;
  if (ds) return ds;
  return null;
}

/**
 * Sestaví seznam všech dílů série s úvodní větou. Aktuální díl je zvýrazněn
 * červenou tečkou „jste zde", publikované díly jsou odkazy, nepublikované
 * jako neaktivní „připravujeme". Stejný seznam se používá nahoře i dole.
 */
function buildSeriesList(idx, isVisible) {
  const items = SERIES.map((d, i) => {
    const isCurrent = i === idx;
    const title = escapeHtml(d.short);
    let body;
    if (isCurrent) {
      body = `<span class="series-toc-title series-toc-title-current">${title}</span>` +
             `<span class="series-toc-here"><span class="series-toc-dot" aria-hidden="true"></span>jste zde</span>`;
    } else if (isVisible(d)) {
      body = `<a class="series-toc-title" href="${d.slug}">${title}</a>`;
    } else {
      body = `<span class="series-toc-title series-toc-title-soon">${title}` +
             `<span class="series-toc-soon">připravujeme</span></span>`;
    }
    return `<li class="series-toc-item${isCurrent ? ' series-toc-item-current' : ''}"${isCurrent ? ' aria-current="step"' : ''}>` +
           `<span class="series-toc-num" aria-hidden="true">${d.n}</span>${body}</li>`;
  }).join('');

  const nav = document.createElement('nav');
  nav.className = 'series-toc';
  nav.dataset.seriesRendered = '1';
  nav.setAttribute('aria-label', `Série: ${SERIES_TITLE}`);
  nav.innerHTML =
    `<p class="series-toc-intro">Tento text je <strong>${SERIES[idx].n}. díl</strong> série ` +
    `<a class="series-toc-series-link" href="${SERIES_HUB}">„${escapeHtml(SERIES_TITLE)}"</a> — ` +
    `detailního průvodce reformou zdravotního systému v devíti dílech:</p>` +
    `<ol class="series-toc-list">${items}</ol>`;
  return nav;
}

/**
 * Sestaví predikát viditelnosti dílu z articles.json (isArticleVisible).
 * Aktuální díl je vždy viditelný (jsme na něm). Při selhání fetch vrací
 * „vše viditelné" — nav se nikdy kvůli síťové chybě nerozpadne.
 */
async function buildVisibilityPredicate(currentSlug) {
  try {
    const res = await fetch('data/articles.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw = await res.json();
    const arr = Array.isArray(raw) ? raw : (raw.articles || []);
    const bySlug = new Map(arr.map(a => [a.slug, a]));
    return (d) => d.slug === currentSlug || isArticleVisible(bySlug.get(d.slug));
  } catch {
    return () => true; // fallback: neblokuj navigaci kvůli chybě načtení
  }
}

/**
 * Vloží sériovou navigaci do aktuálního článku, pokud patří do série —
 * jednou pod hlavičku a jednou na konec. Idempotentní; volá se z clanky.js
 * auto-bootstrapu.
 */
export async function enhanceSeriesNav() {
  if (typeof document === 'undefined') return;
  const articleEl = document.querySelector('article.article-page');
  if (!articleEl) return;
  if (articleEl.querySelector('[data-series-rendered]')) return;

  const slug = detectArticleSlug();
  if (!slug) return;
  const idx = SERIES.findIndex(d => d.slug === slug);
  if (idx === -1) return; // článek není součástí série

  const isVisible = await buildVisibilityPredicate(slug);
  // Re-check idempotence po await (ochrana proti souběžnému volání)
  if (articleEl.querySelector('[data-series-rendered]')) return;

  // Nahoře: hned za hlavičkou článku (pod čarou pod perexem/meta)
  const header = articleEl.querySelector('header.article-header');
  if (header) header.insertAdjacentElement('afterend', buildSeriesList(idx, isVisible));

  // Dole: na konci článku — stejný seznam
  const bottom = buildSeriesList(idx, isVisible);
  bottom.classList.add('series-toc-bottom');
  articleEl.appendChild(bottom);
}
