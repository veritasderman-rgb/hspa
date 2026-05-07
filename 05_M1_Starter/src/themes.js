// Frontend logika stránky tematicke-linie.html.
// Načítá data/themes.json + indicators.json + strategies.json + explainers.json
// a renderuje list karet témat nebo detail jednoho tématu (z URL ?id=...).

import './analytics.js';
import { renderModuleNav, renderMastheadDate, escapeHtml } from './page-shared.js';

let allThemes = [];
let allIndicators = [];
let allStrategies = [];
let allExplainers = [];

function findIndicator(id) {
  return allIndicators.find(i => i.id === id) ?? null;
}
function findStrategy(id) {
  return allStrategies.find(s => s.id === id) ?? null;
}
function findExplainer(id) {
  return allExplainers.find(e => e.id === id) ?? null;
}

export function filterThemes(themes, { search = '' } = {}) {
  const q = search.trim().toLowerCase();
  if (!q) return themes;
  return themes.filter(t =>
    t.title.toLowerCase().includes(q) ||
    t.headline.toLowerCase().includes(q) ||
    t.lead.toLowerCase().includes(q) ||
    t.indicator_ids.some(id => id.toLowerCase().includes(q)) ||
    t.strategy_ids.some(id => id.toLowerCase().includes(q)) ||
    t.explainer_ids.some(id => id.toLowerCase().includes(q))
  );
}

// ─────────────────────────────────────────────
// Signal badge helpers
// ─────────────────────────────────────────────

const SIGNAL_LABEL = { good: 'dobré', warn: 'pozor', bad: 'kritické', neutral: 'neutrální' };

function signalPill(signal) {
  return `<span class="signal-pill ${escapeHtml(signal)}">${escapeHtml(SIGNAL_LABEL[signal] || signal)}</span>`;
}

function fmtValue(v, unit) {
  if (v == null) return '—';
  const num = typeof v === 'number' ? (Number.isInteger(v) ? v.toString() : v.toFixed(1)) : v;
  return unit ? `${num} ${escapeHtml(unit)}` : num;
}

// ─────────────────────────────────────────────
// List view
// ─────────────────────────────────────────────

function renderList() {
  const container = document.getElementById('themeList');
  if (!container) return;

  container.innerHTML = allThemes.map((theme, i) => {
    const indicatorCount = theme.indicator_ids.length;
    const stratCount = theme.strategy_ids.length;
    const explCount = theme.explainer_ids.length;
    const num = String(i + 1).padStart(2, '0');

    const signals = theme.indicator_ids
      .map(id => findIndicator(id))
      .filter(Boolean)
      .reduce((acc, ind) => {
        acc[ind.signal] = (acc[ind.signal] || 0) + 1;
        return acc;
      }, {});

    const badCount = signals.bad || 0;
    const goodCount = signals.good || 0;

    return `<a class="theme-card" href="?id=${escapeHtml(theme.id)}" data-id="${escapeHtml(theme.id)}">
      <div class="theme-card-num">${num}</div>
      <div class="theme-card-body">
        <div class="theme-card-kicker">${escapeHtml(theme.kicker)}</div>
        <h3 class="theme-card-title">${escapeHtml(theme.title)}</h3>
        <p class="theme-card-headline">${escapeHtml(theme.headline)}</p>
        <p class="theme-card-lead">${escapeHtml(theme.lead)}</p>
        <div class="theme-card-meta">
          <span class="theme-meta-item">${indicatorCount} indikátorů</span>
          <span class="theme-meta-item">${stratCount} strategií</span>
          ${explCount > 0 ? `<span class="theme-meta-item">${explCount} vysvětlení</span>` : ''}
          ${badCount > 0 ? `<span class="theme-meta-bad">${badCount} kritických</span>` : ''}
          ${goodCount > 0 ? `<span class="theme-meta-good">${goodCount} dobrých</span>` : ''}
        </div>
      </div>
      <div class="theme-card-arrow" aria-hidden="true">→</div>
    </a>`;
  }).join('');

  container.querySelectorAll('.theme-card').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      const id = el.dataset.id;
      showDetail(id);
    });
  });
}

// ─────────────────────────────────────────────
// Detail view
// ─────────────────────────────────────────────

function renderIndicatorRow(ind) {
  if (!ind) return '';
  const benchOecd = ind.benchmark?.oecd != null ? `OECD: ${ind.benchmark.oecd} ${escapeHtml(ind.unit || '')}` : '';
  return `<a class="theme-ind-row" href="indicator.html?id=${escapeHtml(ind.id)}">
    <div class="theme-ind-signal">${signalPill(ind.signal)}</div>
    <div class="theme-ind-name">${escapeHtml(ind.name)}</div>
    <div class="theme-ind-value">${fmtValue(ind.value, ind.unit)} <span class="theme-ind-year">(${ind.year ?? '?'})</span></div>
    ${benchOecd ? `<div class="theme-ind-bench">${escapeHtml(benchOecd)}</div>` : '<div></div>'}
  </a>`;
}

function renderStrategyCard(s) {
  if (!s) return '';
  return `<a class="theme-strat-card" href="strategie.html?id=${escapeHtml(s.id)}">
    <div class="theme-strat-title">${escapeHtml(s.title)}</div>
    ${s.subtitle ? `<div class="theme-strat-sub">${escapeHtml(s.subtitle)}</div>` : ''}
    <div class="theme-strat-owner">${escapeHtml(s.owner || '')}</div>
  </a>`;
}

function renderExplainerCard(e) {
  if (!e) return '';
  return `<a class="theme-expl-card" href="jak-funguje.html?id=${escapeHtml(e.id)}">
    <div class="theme-expl-title">${escapeHtml(e.title)}</div>
    ${e.subtitle ? `<div class="theme-expl-sub">${escapeHtml(e.subtitle)}</div>` : ''}
  </a>`;
}

function showDetail(id, pushHistory = true) {
  const theme = allThemes.find(t => t.id === id);
  if (!theme) return;

  if (pushHistory) history.pushState(null, '', `?id=${encodeURIComponent(id)}`);
  document.title = `${theme.title} · Tematické linie · HSPA Monitor`;

  const listView = document.getElementById('listView');
  const detailView = document.getElementById('detailView');
  if (listView) listView.classList.add('hidden');
  if (!detailView) return;
  detailView.classList.remove('hidden');

  const indicators = theme.indicator_ids.map(findIndicator).filter(Boolean);
  const strategies = theme.strategy_ids.map(findStrategy).filter(Boolean);
  const explainers = theme.explainer_ids.map(findExplainer).filter(Boolean);

  const signals = indicators.reduce((acc, i) => {
    acc[i.signal] = (acc[i.signal] || 0) + 1;
    return acc;
  }, {});

  detailView.innerHTML = `
    <div class="theme-detail-header">
      <button class="theme-back-btn" id="themeBackBtn">← Všechny linie</button>
    </div>

    <section class="ed-hero" aria-labelledby="themeDetailHeadline">
      <div class="ed-hero-content">
        <div class="ed-kicker">${escapeHtml(theme.kicker)}</div>
        <h2 class="ed-hero-headline" id="themeDetailHeadline">${escapeHtml(theme.headline)}</h2>
        <p class="ed-hero-lead">${escapeHtml(theme.lead)}</p>
      </div>
      <aside class="ed-hero-stats" aria-label="Přehled linky">
        <div class="ed-stat ed-stat-static">
          <div class="ed-stat-num">${indicators.length} <span class="ed-stat-unit">ind.</span></div>
          <div class="ed-stat-lbl">Sledovaných indikátorů</div>
          <div class="ed-stat-meta">${signals.good || 0} dobré · ${signals.bad || 0} kritické</div>
        </div>
        <div class="ed-stat ed-stat-static">
          <div class="ed-stat-num">${strategies.length} <span class="ed-stat-unit">str.</span></div>
          <div class="ed-stat-lbl">Relevantních strategií</div>
          <div class="ed-stat-meta">Národní, sektorové, EU</div>
        </div>
      </aside>
    </section>

    <div class="theme-detail-body">

      <section class="theme-section" aria-labelledby="themeIndHeadline">
        <h3 class="theme-section-title" id="themeIndHeadline">Indikátory v této linii</h3>
        <div class="theme-ind-grid">
          ${indicators.map(renderIndicatorRow).join('')}
        </div>
      </section>

      ${strategies.length > 0 ? `
      <section class="theme-section" aria-labelledby="themeStratHeadline">
        <h3 class="theme-section-title" id="themeStratHeadline">Relevantní strategie</h3>
        <div class="theme-strat-grid">
          ${strategies.map(renderStrategyCard).join('')}
        </div>
      </section>` : ''}

      ${explainers.length > 0 ? `
      <section class="theme-section" aria-labelledby="themeExplHeadline">
        <h3 class="theme-section-title" id="themeExplHeadline">Jak to funguje</h3>
        <div class="theme-expl-grid">
          ${explainers.map(renderExplainerCard).join('')}
        </div>
      </section>` : ''}

    </div>
  `;

  document.getElementById('themeBackBtn')?.addEventListener('click', () => {
    history.back();
  });

  detailView.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ─────────────────────────────────────────────
// Bootstrap
// ─────────────────────────────────────────────

async function init() {
  renderModuleNav('themes');
  renderMastheadDate();

  try {
    const [themesData, indData, stratData, explData] = await Promise.all([
      fetch('data/themes.json').then(r => r.json()),
      fetch('data/indicators.json').then(r => r.json()),
      fetch('data/strategies.json').then(r => r.ok ? r.json() : { strategies: [] }).catch(() => ({ strategies: [] })),
      fetch('data/explainers.json').then(r => r.ok ? r.json() : { explainers: [] }).catch(() => ({ explainers: [] })),
    ]);
    allThemes = themesData.themes ?? [];
    allIndicators = indData.indicators ?? [];
    allStrategies = stratData.strategies ?? [];
    allExplainers = explData.explainers ?? [];
  } catch {
    document.getElementById('themeList').innerHTML = '<p class="empty-state">Nepodařilo se načíst data.</p>';
    return;
  }

  const params = new URLSearchParams(location.search);
  const idParam = params.get('id');
  if (idParam && allThemes.find(t => t.id === idParam)) {
    renderList();
    showDetail(idParam, false);
  } else {
    renderList();
  }

  window.addEventListener('popstate', () => {
    const p = new URLSearchParams(location.search);
    const id = p.get('id');
    if (id) {
      showDetail(id, false);
    } else {
      document.getElementById('detailView')?.classList.add('hidden');
      document.getElementById('detailView').innerHTML = '';
      document.getElementById('listView')?.classList.remove('hidden');
      document.title = 'Tematické linie · HSPA Monitor';
    }
  });
}

if (typeof window !== 'undefined') init();
