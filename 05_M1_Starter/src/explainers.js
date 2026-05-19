// Frontend logika stránky jak-funguje.html.
// Načítá data/explainers.json + strategies.json (pro cross-link)
// a renderuje rozcestí podle kategorie nebo detail (z URL ?id=...).

import './analytics.js';
import { audienceText, renderModuleNav, renderMastheadDate, escapeHtml, loadGlossaryTerms, wrapAcronyms, renderInlineMarkdown, renderBlockMarkdown, isArticleVisible } from './page-shared.js';
import { buildIndex } from './strategy-links.js';
import { renderGantt, renderDrgCalculator, wireDrgCalculator, renderExplainerVisuals } from './explainer-policy-views.js';
import { initSchema } from './schema.js';

const CATEGORY_LABELS = {
  money: {
    label: 'Financování',
    desc: 'Mechanismy úhrad, dohodovací řízení, klasifikace pro výpočet cen',
    story: 'Cena hospitalizace v ČR nevzniká „na trhu". Vzniká výpočtem podle úhradové vyhlášky, klasifikace CZ-DRG a Seznamu zdravotních výkonů. Pokud se v médiích řeší „přefinancování" nebo „škrty", debata se vždy odehrává v jednom z těchto tří dokumentů. Když rozumíte mechanice, snadno odhalíte, který návrh na reformu má reálnou páku — a který je jen kosmetický.',
  },
  classification: {
    label: 'Klasifikace',
    desc: 'Diagnostické a výkonové číselníky, mezinárodní standardy',
    story: 'Aby se péče dala financovat a měřit, musí být standardně popsaná. Mezinárodní klasifikace nemocí (MKN-10) přiřazuje diagnózám kódy, které pak protékají celým systémem — od záznamu v dokumentaci, přes vykázání pojišťovně, až po statistiky úmrtnosti, které jdou do OECD. Změna jednoho kódu může přepočítat úhradu nebo přesměrovat statistiku.',
  },
  actors: {
    label: 'Aktéři systému',
    desc: 'Pojišťovny, regulátoři, profesní organizace',
    story: 'Když se ptáte „kdo to měl řešit?", odpověď v ČR často není jednoznačná. Stát (MZČR) nastavuje pravidla, kraje provozují své nemocnice, pojišťovny nakupují péči, profesní komory regulují kvalifikaci a SÚKL hlídá léky. Kompetence se překrývají. Kdo nese odpovědnost, když v Karlovarském kraji chybí pediatr? Tyto explainery mapují dělbu rolí mezi pěti hlavními aktéry.',
  },
  process: {
    label: 'Procesy',
    desc: 'Rozhodovací mechanismy a dokumentace',
    story: 'Z politického záměru se stane úhradový kód cestou přes několik institucí: parlament schválí zákon, ministerstvo vydá vyhlášku, dohodovací řízení dohodne tarify, pojišťovna upraví smlouvy s poskytovateli. Každý krok trvá měsíce a má vlastní logiku. Reforma „přes noc" je z tohoto pohledu málokdy realistická — ale strop pro reformu je vyšší, než se zdá.',
  },
  inspiration: {
    label: 'Inspirace ze světa',
    desc: 'Konkrétní příklady, kde jiné země dělají věci lépe a co se z toho dá adaptovat',
    story: 'HSPA filosofie říká: „Nejlepší v OECD jsou inspirace, ne soutěž." V této kategorii rozebíráme konkrétní mechanismy zemí, které v některém ukazateli vedou — kde se shoduje rozdíl s ČR a co konkrétně udělaly. Cílem není kopírovat, ale vidět, že lepší stav je možný a často není závislý na bohatství, ale na organizaci péče.',
  },
};

let allExplainers = [];
let allStrategies = [];
let allArticles = [];
let linkIndex = null;

/**
 * Mapování tagů článků na explainer kategorie. Články, jejichž tag je v této mapě,
 * se zobrazí jako chip-strip na konci příslušné category section v Jak funguje.
 * Klinické tagy (Kardio, Onkologie, Mortalita, ...) zde záměrně nejsou — ty popisují
 * zdravotní stav populace, ne mechaniku systému, a patří do Indikátorů jako cross-link.
 */
const ARTICLE_TAG_TO_CATEGORY = {
  'Financování': 'money',
  'Nemocniční péče': 'money',
  'Pracovní síla': 'actors',
  'Primární péče': 'actors',
  'Dostupnost péče': 'actors',
  'Bezpečnost péče': 'process',
  'Digitalizace': 'process',
};

/**
 * Odstraní markdown markery (**, *, _, `) z textu — pro krátké preview, kde HTML
 * formátování nepoužíváme. Zachovává obsah, jen uklízí značky.
 */
function stripMarkdown(s) {
  if (s == null) return '';
  return String(s)
    .replace(/\*\*([^*\n]+?)\*\*/g, '$1')
    .replace(/__([^_\n]+?)__/g, '$1')
    .replace(/(^|\s)\*([^*\n]+?)\*(?=$|[\s.,;:!?)\]])/g, '$1$2')
    .replace(/(^|\s)_([^_\n]+?)_(?=$|[\s.,;:!?)\]])/g, '$1$2')
    .replace(/`([^`]+?)`/g, '$1');
}

export function filterExplainers(items, { category, search }) {
  let xs = items;
  if (category && category !== 'all') xs = xs.filter(e => e.category === category);
  if (search) {
    const q = search.toLowerCase();
    xs = xs.filter(e =>
      (e.title || '').toLowerCase().includes(q)
      || (e.subtitle || '').toLowerCase().includes(q)
      || (e.tldr_public || '').toLowerCase().includes(q)
      || (e.tldr_expert || '').toLowerCase().includes(q)
      || (e.tldr_policy || '').toLowerCase().includes(q)
    );
  }
  return xs;
}

let activeCategory = 'all';
let activeSearch = '';

function renderList() {
  const grid = document.getElementById('explainerGrid');
  const empty = document.getElementById('emptyState');
  const filtered = filterExplainers(allExplainers, { category: activeCategory, search: activeSearch });

  document.getElementById('countBadge').textContent =
    `${filtered.length} téma${filtered.length === 1 ? '' : (filtered.length < 5 ? 'ta' : 't')}`;

  if (!filtered.length) {
    grid.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  // Seskupení podle kategorie
  const byCat = {};
  for (const e of filtered) (byCat[e.category] ??= []).push(e);

  const order = ['money', 'classification', 'actors', 'process', 'inspiration'];
  grid.innerHTML = order
    .filter(c => byCat[c]?.length)
    .map((cat, idx) => {
      const items = byCat[cat];
      const meta = CATEGORY_LABELS[cat] ?? { label: cat, desc: '', story: '' };
      const num = String(idx + 1).padStart(2, '0');
      const storyHtml = meta.story
        ? `<p class="cat-story">${escapeHtml(meta.story)}</p>`
        : '';
      const relatedArticles = allArticles
        .filter(a => ARTICLE_TAG_TO_CATEGORY[a.tag] === cat)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const articlesHtml = relatedArticles.length
        ? `<div class="cat-articles" aria-label="Související články">
             <div class="cat-articles-label">Z článků k tématu</div>
             <ul class="cat-articles-list">
               ${relatedArticles.map(a => `
                 <li>
                   <a class="cat-article-chip" href="${escapeHtml(a.slug)}">
                     <span class="cat-article-chip-tag">${escapeHtml(a.tag)}</span>
                     <span class="cat-article-chip-title">${escapeHtml(a.title)}</span>
                   </a>
                 </li>
               `).join('')}
             </ul>
           </div>`
        : '';
      return `
        <section class="cat-block cat-${cat}" id="cat-${cat}">
          <header class="cat-header">
            <div class="cat-header-row">
              <span class="cat-num">${num}</span>
              <h3>${meta.label}</h3>
              <span class="cat-count">${items.length} ${items.length === 1 ? 'téma' : (items.length < 5 ? 'témata' : 'témat')}</span>
            </div>
            <span class="cat-desc">${escapeHtml(meta.desc)}</span>
            ${storyHtml}
          </header>
          <div class="explainer-cards">
            ${items.map(renderCard).join('')}
          </div>
          ${articlesHtml}
        </section>
      `;
    }).join('');

  grid.innerHTML += `
    <section class="cat-block schema-promo-block">
      <a class="schema-promo-link" href="#schema">
        <div class="schema-promo-inner">
          <div class="schema-promo-label">Vizuální přehled</div>
          <h3 class="schema-promo-title">Schéma zdravotního systému ČR →</h3>
          <p class="schema-promo-desc">Kdo jsou klíčoví aktéři, jak mezi nimi tečou peníze, regulace a data — interaktivní diagram s odkazem na relevantní explainéry.</p>
        </div>
      </a>
    </section>
  `;
}

function renderCard(e) {
  const tldr = stripMarkdown(audienceText(e));
  const absurditiesCount = (e.absurdity_examples ?? []).length;
  return `
    <a class="explainer-card" href="jak-funguje.html?id=${encodeURIComponent(e.id)}">
      <h4>${escapeHtml(e.title)}</h4>
      ${e.subtitle ? `<div class="card-sub">${escapeHtml(e.subtitle)}</div>` : ''}
      <p class="card-tldr">${escapeHtml(tldr.slice(0, 240))}${tldr.length > 240 ? '…' : ''}</p>
      <div class="card-footer">
        ${absurditiesCount > 0
          ? `<span class="absurdity-counter" title="Citace z primárních zdrojů">${absurditiesCount}× citace</span>`
          : ''}
        ${(e.linked_indicators ?? []).length
          ? `<span>${e.linked_indicators.length} indikátor${e.linked_indicators.length === 1 ? '' : 'ů'}</span>` : ''}
      </div>
    </a>
  `;
}

function renderDetail(id) {
  const e = allExplainers.find(x => x.id === id);
  const detail = document.getElementById('detailView');
  const list = document.getElementById('listView');
  if (!e) {
    detail.innerHTML = `<p>Vysvětlení <code>${escapeHtml(id)}</code> nenalezeno. <a href="jak-funguje.html">Zpět na seznam</a>.</p>`;
    detail.classList.remove('hidden');
    list.classList.add('hidden');
    return;
  }

  list.classList.add('hidden');
  detail.classList.remove('hidden');

  document.title = `${e.title} · Jak funguje · HSPA Monitor`;
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.content = `${e.title}${e.subtitle ? ' — ' + e.subtitle : ''}. ${stripMarkdown(audienceText(e)).slice(0, 160)}`;

  const tldr = audienceText(e);
  const meta = CATEGORY_LABELS[e.category] ?? { label: e.category, desc: '' };

  // Cross-link
  const relatedStrategies = linkIndex?.strategiesForExplainer(e.id) ?? [];

  detail.innerHTML = `
    <a class="back-link" href="jak-funguje.html">← zpět na rozcestí</a>
    <header class="detail-header">
      <div class="detail-meta">
        <span class="cat-badge cat-${e.category}">${escapeHtml(meta.label)}</span>
      </div>
      <h2>${escapeHtml(e.title)}</h2>
      ${e.subtitle ? `<p class="detail-subtitle">${escapeHtml(e.subtitle)}</p>` : ''}
    </header>

    <section class="detail-tldr">
      ${renderBlockMarkdown(tldr)}
    </section>

    ${(e.key_facts ?? []).length ? `
      <section class="detail-section">
        <h3>Klíčová fakta</h3>
        <dl class="key-facts">
          ${e.key_facts.map(f => `
            <div class="kf-row">
              <dt>${escapeHtml(f.label)}</dt>
              <dd>${escapeHtml(f.value)}</dd>
            </div>
          `).join('')}
        </dl>
      </section>
    ` : ''}

    ${e.process?.steps?.length ? `
      <section class="detail-section">
        <h3>Časová osa procesu</h3>
        <ol class="process-timeline">
          ${e.process.steps.map(step => `
            <li>
              <div class="ts-phase">${escapeHtml(step.phase)}</div>
              <div class="ts-dates">
                ${escapeHtml(step.from ?? '')}${step.to ? ` – ${escapeHtml(step.to)}` : ''}
              </div>
            </li>
          `).join('')}
        </ol>
        <details class="gantt-details" open>
          <summary>Vizualizace časové osy (Gantt)</summary>
          ${renderGantt(e.process.steps)}
        </details>
      </section>
    ` : ''}

    ${e.id === 'cz_drg' ? `
      <section class="detail-section drg-calc-section">
        <h3>Interaktivní kalkulátor odhadu úhrady</h3>
        <p class="section-note">Modelace vlivu hlavní diagnózy, závažnosti a kraje na výslednou úhradu. Hodnoty ilustrativní — neslouží jako simulátor reálných úhrad ZP.</p>
        ${renderDrgCalculator()}
      </section>
    ` : ''}

    ${renderExplainerVisuals(e)}

    ${(e.absurdity_examples ?? []).length ? `
      <section class="detail-section absurdity-section">
        <h3>Citace z primárních zdrojů</h3>
        ${e.absurdity_examples.map(ex => `
          <article class="absurdity-card">
            <h4>${renderInlineMarkdown(ex.title ?? 'Citace')}</h4>
            ${ex.quote ? `<blockquote>${renderInlineMarkdown(ex.quote)}</blockquote>` : ''}
            <div class="abs-context">${renderBlockMarkdown(ex.context ?? '')}</div>
            <footer class="abs-source">
              ${ex.source ? `${escapeHtml(ex.source)}` : ''}
              ${ex.date ? ` · ${escapeHtml(ex.date)}` : ''}
              ${ex.url ? ` · <a href="${escapeHtml(ex.url)}" target="_blank" rel="noopener">primární zdroj ↗</a>` : ''}
            </footer>
          </article>
        `).join('')}
      </section>
    ` : ''}

    ${(e.linked_indicators ?? []).length ? `
      <section class="detail-section">
        <h3>Související indikátory</h3>
        <div class="chip-row">
          ${e.linked_indicators.map(id =>
            `<a class="chip" href="indicator.html?id=${encodeURIComponent(id)}">${escapeHtml(id)}</a>`
          ).join('')}
        </div>
      </section>
    ` : ''}

    ${relatedStrategies.length ? `
      <section class="detail-section">
        <h3>Související strategie</h3>
        <div class="chip-row">
          ${relatedStrategies.map(s =>
            `<a class="chip chip-strategy" href="strategie.html?id=${encodeURIComponent(s.id)}">${escapeHtml(s.title)}</a>`
          ).join('')}
        </div>
      </section>
    ` : ''}

    ${(e.documents ?? []).length ? `
      <section class="detail-section">
        <h3>Primární zdroje</h3>
        <ul class="docs-list">
          ${e.documents.map(d => `
            <li><a href="${escapeHtml(d.url)}" target="_blank" rel="noopener">${escapeHtml(d.title)}</a></li>
          `).join('')}
        </ul>
      </section>
    ` : ''}

    <footer class="detail-footer">
      <span>Ověřeno: ${escapeHtml(e.verified_at ?? '?')}</span>
      ${e.verification_status ? `<span class="verification-badge ${e.verification_status}">${escapeHtml(e.verification_status)}</span>` : ''}
    </footer>
  `;

  // Wire-up dynamic widgets (DRG kalkulátor)
  if (e.id === 'cz_drg') {
    wireDrgCalculator();
  }

  // Wrap acronyms in the tldr paragraphs after rendering
  loadGlossaryTerms().then(terms => {
    if (!terms.length) return;
    const tldrEl = detail.querySelector('.detail-tldr');
    if (tldrEl) tldrEl.innerHTML = wrapAcronyms(renderBlockMarkdown(audienceText(e)), terms);
  });
}

function wireFilters() {
  document.querySelectorAll('.cat-nav button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.cat-nav button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeCategory = btn.dataset.category;
      renderList();
    });
  });

  const search = document.getElementById('searchBox');
  if (search) {
    let t;
    search.addEventListener('input', () => {
      clearTimeout(t);
      t = setTimeout(() => {
        activeSearch = search.value.trim();
        renderList();
      }, 200);
    });
  }
}

async function init() {
  if (typeof window === 'undefined') return;

  renderModuleNav('explainers');
  renderMastheadDate();
  initSchema();

  try {
    const [explsRes, stratsRes, articlesRes] = await Promise.all([
      fetch('data/explainers.json'),
      fetch('data/strategies.json').catch(() => null),
      fetch('data/articles.json').catch(() => null),
    ]);
    if (!explsRes.ok) throw new Error(`HTTP ${explsRes.status}`);
    const explsData = await explsRes.json();
    const stratsData = stratsRes?.ok ? await stratsRes.json() : { strategies: [] };
    const articlesData = articlesRes?.ok ? await articlesRes.json() : { articles: [] };

    allExplainers = explsData.explainers ?? [];
    allStrategies = stratsData.strategies ?? [];
    allArticles = (articlesData.articles ?? [])
      .filter(a => a.kind !== 'manifest')
      .filter(a => isArticleVisible(a));
    linkIndex = buildIndex(allStrategies, allExplainers);

    wireFilters();

    const id = new URLSearchParams(window.location.search).get('id');
    if (id) renderDetail(id);
    else renderList();
  } catch (err) {
    console.error('explainers load failed:', err);
    document.getElementById('listView').innerHTML =
      `<p class="status error">Nepodařilo se načíst data: ${escapeHtml(err.message)}.</p>`;
  }
}

if (typeof window !== 'undefined') init();
