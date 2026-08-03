// Generuje sekci "Příbuzné sekce" na stránkách clanek-*.html
// (article-page layout). Karty se sestavují z articles.json + themes.json +
// strategies.json + indicators.json metadat aktuálního článku.
//
// Idempotentní: pokud sekce už existuje (data-related-rendered atribut),
// nebo pokud nejsme na article-page, funkce tiše skončí.
//
// Vkládá se za </article> uvnitř <main> — vizuálně sjednoceno se sekcemi
// na ostatních hub stránkách (.related-section / .related-card-*).

const HUB_FALLBACK_CARDS = [
  {
    href: 'clanky.html',
    kicker: 'Analytické články · long-form',
    title: 'Hub článků',
    desc: 'Všechny publikované analýzy v jednom místě — co data o českém zdravotnictví skutečně říkají.'
  },
  {
    href: 'hspa-prehled.html',
    kicker: 'Datový rámec · 4 oblasti × 12 domén',
    title: 'HSPA přehled',
    desc: 'Indikátory zařazené ve čtyřech HSPA oblastech a dvanácti doménách.'
  },
  {
    href: 'prevence.html',
    kicker: 'Co s tím můžu dělat já',
    title: 'Prevence',
    desc: 'Vakcinace, screeningy a praktické kroky pro lepší roky ve zdraví.'
  }
];

function el(tag, className, html) {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (html != null) n.innerHTML = html;
  return n;
}

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);
}

function detectArticleSlug() {
  // file path: /clanek-foo.html → 'clanek-foo.html'.
  // Vercel cleanUrls:true servíruje live bez .html (/clanek-foo) — normalizuj
  // na tvar se .html, ať odpovídá slugům v articles.json.
  const last = (location.pathname || '').split('/').filter(Boolean).pop() || '';
  if (last.startsWith('clanek-')) {
    return last.endsWith('.html') ? last : `${last}.html`;
  }
  // fallback: <body data-article-slug>
  const ds = document.body?.dataset?.articleSlug;
  if (ds) return ds;
  return null;
}

async function loadJson(path) {
  try {
    const res = await fetch(path);
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}

/**
 * Věcná příbuznost dvou článků. Dřívější výběr přes překryv `topics`
 * (8 hrubých hodnot) byl při 200+ článcích skoro náhodný — desítky článků
 * sdílejí totéž topic. Skóre staví na sémantické síti korpusu:
 *
 *   překryv linked_indicators … ×3 za každý společný indikátor (nejjemnější signál)
 *   shodný tag (řízený slovník) … +2
 *   shodná rubrika              … +1
 *
 * Tie-break: novější datum, pak slug (determinismus).
 * Vstupní `allArticles` už musí být přefiltrované na viditelné články —
 * scorer je čistá funkce bez závislosti na čase (testovatelnost).
 *
 * @param {Object} article — aktuální článek (záznam z articles.json)
 * @param {Array}  allArticles — kandidáti (viditelné články)
 * @param {number} max
 * @returns {Array} nejpříbuznější články, seřazené sestupně
 */
export function pickRelatedByAffinity(article, allArticles, max = 4) {
  const myInds = new Set(article.linked_indicators ?? []);
  const scored = [];
  for (const a of allArticles) {
    if (a.slug === article.slug) continue;
    let score = 0;
    for (const id of a.linked_indicators ?? []) {
      if (myInds.has(id)) score += 3;
    }
    if (article.tag && a.tag === article.tag) score += 2;
    if (article.rubric && a.rubric === article.rubric) score += 1;
    if (score > 0) scored.push({ a, score });
  }
  scored.sort((x, y) =>
    y.score - x.score
    || String(y.a.date ?? '').localeCompare(String(x.a.date ?? ''))
    || String(x.a.slug ?? '').localeCompare(String(y.a.slug ?? ''))
  );
  return scored.slice(0, max).map(x => x.a);
}

function findTheme(linkedIndicators, themesData) {
  if (!Array.isArray(themesData?.themes)) return null;
  for (const theme of themesData.themes) {
    const linked = theme.linked_indicators || theme.indicator_ids || [];
    if (linked.some(id => linkedIndicators.includes(id))) return theme;
  }
  return null;
}

function findStrategy(linkedIndicators, strategiesData) {
  if (!Array.isArray(strategiesData?.strategies)) return null;
  for (const strategy of strategiesData.strategies) {
    const linked = strategy.linked_indicators || [];
    if (linked.some(id => linkedIndicators.includes(id))) {
      return strategy;
    }
  }
  return null;
}

function findIndicator(indicatorId, indicatorsData) {
  if (!Array.isArray(indicatorsData?.indicators)) return null;
  return indicatorsData.indicators.find(i => i.id === indicatorId) || null;
}

function findRubric(rubricId, rubricsData) {
  if (!Array.isArray(rubricsData?.rubrics)) return null;
  return rubricsData.rubrics.find(r => r.id === rubricId) || null;
}

function buildCards(article, articlesData, themesData, strategiesData, indicatorsData, rubricsData) {
  const cards = [];
  const linkedIndicators = article.linked_indicators || [];
  const linkedPrevention = article.linked_prevention_themes || [];

  // 0) Rubrika článku — landing s ostatními texty stejné rubriky
  const rubric = findRubric(article.rubric, rubricsData);
  if (rubric) {
    cards.push({
      href: `rubrika.html?id=${encodeURIComponent(rubric.id)}`,
      kicker: `Rubrika · ${rubric.label}`,
      title: rubric.headline,
      desc: rubric.lead,
    });
  }

  // 1) Hlavní indikátor — detail
  if (linkedIndicators.length > 0) {
    const ind = findIndicator(linkedIndicators[0], indicatorsData);
    if (ind) {
      cards.push({
        href: `indikator-${encodeURIComponent(ind.id)}.html`,
        kicker: 'Detail indikátoru',
        title: ind.name,
        desc: `${ind.area ?? ''}${ind.domain ? ' · ' + ind.domain : ''} — časová řada, srovnání a metodická poznámka.`
      });
    }
  }

  // 2) Tematická linie
  const theme = findTheme(linkedIndicators, themesData);
  if (theme) {
    cards.push({
      href: `tematicke-linie.html?theme=${encodeURIComponent(theme.id || theme.slug || '')}`,
      kicker: 'Tematická linie',
      title: theme.title || theme.name,
      desc: theme.tldr_public || theme.lead || theme.description || 'Indikátory, články a strategie propojené do jednoho narativu.'
    });
  }

  // 3) Související strategie (max 1)
  const strategy = findStrategy(linkedIndicators, strategiesData);
  if (strategy) {
    cards.push({
      href: `strategie.html?id=${encodeURIComponent(strategy.id)}`,
      kicker: 'Strategický dokument',
      title: strategy.title,
      desc: strategy.tldr_public || strategy.subtitle || 'Národní/mezinárodní strategie navázaná na téma tohoto článku.'
    });
  }

  // 4) Prevence (pokud má článek linked_prevention_themes)
  if (linkedPrevention.length > 0) {
    cards.push({
      href: `prevence.html#${encodeURIComponent(linkedPrevention[0])}`,
      kicker: 'Co s tím můžu dělat já',
      title: 'Prevence',
      desc: 'Konkrétní kroky a doporučení k tématu článku — vakcinace, screeningy, životní styl.'
    });
  }

  // 5) Související články mají vlastní viditelný blok (renderSuggestSection)
  //    — v Příbuzných sekcích by je duplikoval.

  // 6) Vždy hub jako poslední fallback
  cards.push({
    href: 'clanky.html',
    kicker: 'Všechny články',
    title: 'Hub článků',
    desc: 'Vrať se do přehledu všech 65 publikovaných textů a procházej podle témat.'
  });

  // Dedup podle href (zachovej první výskyt) + max 6 karet
  const seen = new Set();
  const dedup = [];
  for (const c of cards) {
    if (seen.has(c.href)) continue;
    seen.add(c.href);
    dedup.push(c);
    if (dedup.length >= 6) break;
  }
  return dedup;
}

/**
 * Blok „Související články" — 3–4 věcně nejbližší texty (pickRelatedByAffinity)
 * s perexem, vykreslený hned za článkem (před Příbuznými sekcemi).
 */
function renderSuggestSection(articles) {
  const section = el('section', 'section article-suggest-section');
  section.setAttribute('aria-labelledby', 'articleSuggestHeading');
  section.dataset.suggestRendered = '1';
  section.appendChild(el('div', 'section-title',
    '<h3 id="articleSuggestHeading">Související články</h3>'
  ));
  const grid = el('ol', 'article-suggest-grid');
  for (const a of articles) {
    const li = document.createElement('li');
    const perex = a.perex
      ? (a.perex.length > 180 ? a.perex.slice(0, 177).trimEnd() + '…' : a.perex)
      : '';
    let dateStr = '';
    if (a.date) {
      const d = new Date(a.date + 'T12:00:00');
      if (!Number.isNaN(d.getTime())) {
        dateStr = d.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' });
      }
    }
    li.innerHTML = `
      <a class="article-suggest-card" href="${escapeHtml(a.slug)}">
        <span class="article-suggest-meta">
          <span class="article-suggest-tag">${escapeHtml(a.tag || 'Článek')}</span>
          ${dateStr ? `<span class="article-suggest-date">${escapeHtml(dateStr)}</span>` : ''}
        </span>
        <h4 class="article-suggest-title">${escapeHtml(a.title || '')}</h4>
        ${perex ? `<p class="article-suggest-perex">${escapeHtml(perex)}</p>` : ''}
        <span class="article-suggest-cta" aria-hidden="true">Číst článek →</span>
      </a>`;
    grid.appendChild(li);
  }
  section.appendChild(grid);
  return section;
}

function renderSection(cards) {
  const section = el('section', 'section related-section');
  section.setAttribute('aria-labelledby', 'articleRelatedHeading');
  section.dataset.relatedRendered = '1';
  const title = el('div', 'section-title',
    '<h3 id="articleRelatedHeading">Příbuzné sekce</h3>'
  );
  section.appendChild(title);
  const grid = el('div', 'related-grid');
  for (const card of cards) {
    const a = document.createElement('a');
    a.className = 'related-card';
    a.href = card.href;
    a.innerHTML = `
      <div class="related-card-kicker">${escapeHtml(card.kicker)}</div>
      <h4 class="related-card-title">${escapeHtml(card.title)}</h4>
      <p class="related-card-desc">${escapeHtml(card.desc)}</p>
      <span class="related-card-arrow" aria-hidden="true">→</span>
    `;
    grid.appendChild(a);
  }
  section.appendChild(grid);
  return section;
}

export async function enhanceArticleRelated() {
  if (typeof document === 'undefined') return;
  const articleEl = document.querySelector('article.article-page');
  if (!articleEl) return;
  const main = articleEl.closest('main');
  if (!main) return;
  if (main.querySelector('section.related-section[data-related-rendered]')) return;

  const slug = detectArticleSlug();

  const [articlesData, themesData, strategiesData, indicatorsData, rubricsData] = await Promise.all([
    loadJson('data/articles.json'),
    loadJson('data/themes.json'),
    loadJson('data/strategies.json'),
    loadJson('data/indicators.json'),
    loadJson('data/rubrics.json')
  ]);

  const articlesList = articlesData?.articles || [];
  const article = slug ? articlesList.find(a => a.slug === slug) : null;

  let cards;
  if (article) {
    cards = buildCards(article, articlesData, themesData, strategiesData, indicatorsData, rubricsData);
  } else {
    cards = HUB_FALLBACK_CARDS;
  }

  const section = renderSection(cards);
  main.insertBefore(section, articleEl.nextSibling);

  // „Související články" — před Příbuzné sekce, jen když má co ukázat.
  if (article && !main.querySelector('.article-suggest-section')) {
    const { isArticleVisible } = await import('./page-shared.js');
    const visible = articlesList.filter(a => isArticleVisible(a));
    const suggested = pickRelatedByAffinity(article, visible, 4);
    if (suggested.length >= 2) {
      main.insertBefore(renderSuggestSection(suggested), section);
    }
  }
}
