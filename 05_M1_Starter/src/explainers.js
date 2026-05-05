// Frontend logika stránky jak-funguje.html.
// Načítá data/explainers.json + strategies.json (pro cross-link)
// a renderuje rozcestí podle kategorie nebo detail (z URL ?id=...).

import { wireAudienceSwitch, getAudience, audienceText, renderModuleNav, escapeHtml } from './page-shared.js';
import { buildIndex } from './strategy-links.js';
import { renderGantt, renderDrgCalculator, wireDrgCalculator } from './explainer-policy-views.js';

const CATEGORY_LABELS = {
  money: { label: 'Financování', desc: 'Mechanismy úhrad, dohodovací řízení, klasifikace pro výpočet cen' },
  classification: { label: 'Klasifikace', desc: 'Diagnostické a výkonové číselníky, mezinárodní standardy' },
  actors: { label: 'Aktéři systému', desc: 'Pojišťovny, regulátoři, profesní organizace' },
  process: { label: 'Procesy', desc: 'Rozhodovací mechanismy a dokumentace' },
};

let allExplainers = [];
let allStrategies = [];
let linkIndex = null;

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

  const order = ['money', 'classification', 'actors', 'process'];
  grid.innerHTML = order
    .filter(c => byCat[c]?.length)
    .map(cat => {
      const items = byCat[cat];
      const meta = CATEGORY_LABELS[cat] ?? { label: cat, desc: '' };
      return `
        <section class="cat-block cat-${cat}">
          <header class="cat-header">
            <h3>${meta.label}</h3>
            <span class="cat-desc">${escapeHtml(meta.desc)}</span>
          </header>
          <div class="explainer-cards">
            ${items.map(renderCard).join('')}
          </div>
        </section>
      `;
    }).join('');
}

function renderCard(e) {
  const tldr = audienceText(e);
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

  const tldr = audienceText(e);
  const audience = getAudience();
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
      <div class="audience-hint">Pohled <strong>${audienceLabel(audience)}</strong>:</div>
      <p>${escapeHtml(tldr)}</p>
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
        ${audience === 'policy' ? `
          <details class="gantt-details" open>
            <summary>Vizualizace časové osy</summary>
            ${renderGantt(e.process.steps)}
          </details>
        ` : ''}
      </section>
    ` : ''}

    ${audience === 'policy' && e.id === 'cz_drg' ? `
      <section class="detail-section drg-calc-section">
        <h3>Interaktivní kalkulátor odhadu úhrady</h3>
        <p class="section-note">Modelace vlivu hlavní diagnózy, závažnosti a kraje na výslednou úhradu. Hodnoty ilustrativní — neslouží jako simulátor reálných úhrad ZP.</p>
        ${renderDrgCalculator()}
      </section>
    ` : ''}

    ${(e.absurdity_examples ?? []).length ? `
      <section class="detail-section absurdity-section">
        <h3>Citace z primárních zdrojů</h3>
        ${e.absurdity_examples.map(ex => `
          <article class="absurdity-card">
            <h4>${escapeHtml(ex.title ?? 'Citace')}</h4>
            ${ex.quote ? `<blockquote>${escapeHtml(ex.quote)}</blockquote>` : ''}
            <p class="abs-context">${escapeHtml(ex.context ?? '')}</p>
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
            `<a class="chip" href="index.html?indicator=${encodeURIComponent(id)}">${escapeHtml(id)}</a>`
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
  if (audience === 'policy' && e.id === 'cz_drg') {
    wireDrgCalculator();
  }
}

function audienceLabel(a) {
  return ({ public: 'pro veřejnost', expert: 'pro odborníka', policy: 'pro tvůrce politik' })[a] ?? a;
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

  wireAudienceSwitch();
  renderModuleNav('explainers');

  document.addEventListener('audiencechange', () => {
    const id = new URLSearchParams(window.location.search).get('id');
    if (id) renderDetail(id);
    else renderList();
  });

  try {
    const [explsRes, stratsRes] = await Promise.all([
      fetch('data/explainers.json'),
      fetch('data/strategies.json').catch(() => null),
    ]);
    if (!explsRes.ok) throw new Error(`HTTP ${explsRes.status}`);
    const explsData = await explsRes.json();
    const stratsData = stratsRes?.ok ? await stratsRes.json() : { strategies: [] };

    allExplainers = explsData.explainers ?? [];
    allStrategies = stratsData.strategies ?? [];
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
