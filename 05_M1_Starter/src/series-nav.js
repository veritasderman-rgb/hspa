// Sériová navigace článkových sérií (kolekcí s pořadím).
//
// Na stránkách clanek-*.html, které do série patří, vykreslí JEDNOTNÝ seznam
// všech dílů (s názvy) — hned pod hlavičkou článku a znovu na jeho konci.
// Aktuální díl je v obou seznamech zvýrazněn červenou tečkou „jste zde".
//
// Registr sérií žije v data/series.json (jediný zdroj pravdy — sdílený
// s rozcestníkem na hubu v src/clanky.js). Přidání série = přidat objekt
// do series.json; žádný kód se needituje. Referenční integritu slugů hlídá
// ingest/validate-articles.js.
//
// Idempotentní: na ne-sériových stránkách (nebo při opakovaném volání) tiše
// skončí. Respektuje viditelnost (isArticleVisible): díl, který ještě není
// publikovaný (published:false nebo datum v budoucnu), se vykreslí jako
// neaktivní („připravujeme"), nikdy ne jako živý odkaz na draft.

import { isArticleVisible } from './page-shared.js';

let _registryPromise = null;

/**
 * Načte registr sérií z data/series.json (cache na modul; jeden fetch na
 * stránku). Při chybě vrací prázdný seznam — navigace se prostě nevykreslí.
 *
 * @returns {Promise<Array<{id:string,title:string,hub:string,lead:string,parts:Array}>>}
 */
export function loadSeriesRegistry() {
  if (!_registryPromise) {
    _registryPromise = fetch('data/series.json')
      .then(r => r.ok ? r.json() : null)
      .then(d => Array.isArray(d?.series) ? d.series : [])
      .catch(() => []);
  }
  return _registryPromise;
}

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
function buildSeriesList(series, idx, isVisible) {
  const items = series.parts.map((d, i) => {
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
  nav.setAttribute('aria-label', `Série: ${series.title}`);
  nav.innerHTML =
    `<p class="series-toc-intro">Tento text je <strong>${series.parts[idx].n}. díl</strong> série ` +
    `<a class="series-toc-series-link" href="${series.hub}">„${escapeHtml(series.title)}"</a> — ` +
    `${escapeHtml(series.lead)}:</p>` +
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
  // Najdi sérii, do které článek patří (napříč registrem), a index dílu v ní.
  const registry = await loadSeriesRegistry();
  let series = null, idx = -1;
  for (const s of registry) {
    const i = (s.parts ?? []).findIndex(d => d.slug === slug);
    if (i !== -1) { series = s; idx = i; break; }
  }
  if (!series) return; // článek není součástí žádné série

  const isVisible = await buildVisibilityPredicate(slug);
  // Re-check idempotence po await (ochrana proti souběžnému volání)
  if (articleEl.querySelector('[data-series-rendered]')) return;

  // Nahoře: hned za hlavičkou článku (pod čarou pod perexem/meta)
  const header = articleEl.querySelector('header.article-header');
  if (header) header.insertAdjacentElement('afterend', buildSeriesList(series, idx, isVisible));

  // Dole: na konci článku — stejný seznam
  const bottom = buildSeriesList(series, idx, isVisible);
  bottom.classList.add('series-toc-bottom');
  articleEl.appendChild(bottom);
}
