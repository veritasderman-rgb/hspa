// Frontend logika stránky prevence.html.
// Načítá data/prevention.json + indicators.json + strategies.json
// a renderuje list karet témat nebo detail jednoho tématu (z URL ?id=...).

import './analytics.js';
import { renderModuleNav, renderMastheadDate, escapeHtml, renderErrorState, isArticleVisible } from './page-shared.js';

// Indikátory zobrazené v hero stats
const HERO_INDICATOR_IDS = [
  'nadeje_doziti_zdravi_65',
  'kuractvi_denni',
  'obezita_prevalence',
  'pohybova_aktivita_dospeli',
];

let allThemes = [];
let allIndicators = [];
let allStrategies = [];
let allArticles = [];
let heroData = null;
let flowSteps = [];

// ─────────────────────────────────────────────
// Pomocné funkce
// ─────────────────────────────────────────────

function findIndicator(id) {
  return allIndicators.find(i => i.id === id) ?? null;
}

function findStrategy(id) {
  return allStrategies.find(s => s.id === id) ?? null;
}

function signalLabel(signal) {
  switch (signal) {
    case 'good':    return 'Dobře';
    case 'warn':    return 'Pozor';
    case 'bad':     return 'Problém';
    default:        return 'Sledováno';
  }
}

// ─────────────────────────────────────────────
// Hero
// ─────────────────────────────────────────────

function renderHero() {
  if (!heroData) return;

  const kickerEl = document.getElementById('prevKicker');
  const headlineEl = document.getElementById('prevHeroHeadline');
  const leadEl = document.getElementById('prevHeroLead');
  const statsEl = document.getElementById('prevHeroStats');

  if (kickerEl) kickerEl.textContent = heroData.kicker;
  if (headlineEl) headlineEl.textContent = heroData.headline;
  if (leadEl) leadEl.textContent = heroData.lead;

  if (!statsEl) return;

  const statHtml = HERO_INDICATOR_IDS
    .map(id => {
      const ind = findIndicator(id);
      if (!ind) return '';
      const benchmarkHtml = ind.benchmark?.oecd != null
        ? `<div class="ed-stat-meta">OECD průměr ${ind.benchmark.oecd} ${escapeHtml(ind.unit)}</div>`
        : '';
      const signalClass = ind.signal ? `signal-${ind.signal}` : '';
      return `
        <div class="ed-stat ed-stat-static ${signalClass}">
          <div class="ed-stat-num">${escapeHtml(String(ind.value))} <span class="ed-stat-unit">${escapeHtml(ind.unit)}</span></div>
          <div class="ed-stat-lbl">${escapeHtml(ind.name)}</div>
          ${benchmarkHtml}
        </div>
      `;
    })
    .join('');

  statsEl.innerHTML = statHtml;
}

// ─────────────────────────────────────────────
// Flow kroky
// ─────────────────────────────────────────────

function renderFlow() {
  const grid = document.getElementById('prevFlowGrid');
  if (!grid || !flowSteps.length) return;

  grid.innerHTML = flowSteps.map(step => `
    <div class="ed-flow-step">
      <div class="ed-flow-num">${escapeHtml(step.num)}</div>
      <div class="ed-flow-name">${escapeHtml(step.name)}</div>
      <div class="ed-flow-arrow" aria-hidden="true">${escapeHtml(step.arrow)}</div>
      <div class="ed-flow-desc">${escapeHtml(step.desc)}</div>
    </div>
  `).join('');
}

// ─────────────────────────────────────────────
// Grid karet témat
// ─────────────────────────────────────────────

function renderThemes() {
  const grid = document.getElementById('preventionGrid');
  if (!grid) return;

  grid.innerHTML = allThemes.map(theme => renderThemeCard(theme)).join('');
}

function renderThemeCard(theme) {
  const snippet = (theme.what_we_know ?? '').slice(0, 200);
  const indCount = (theme.hspa_indicators ?? []).length;
  const strCount = (theme.strategies ?? []).length;

  return `
    <a class="prevention-card" href="prevence.html?id=${encodeURIComponent(theme.id)}">
      <div class="prevention-card-daily">${escapeHtml(theme.daily_choice ?? '')}</div>
      <div class="prevention-card-title">${escapeHtml(theme.title)}</div>
      <div class="prevention-card-subtitle">${escapeHtml(theme.subtitle ?? '')}</div>
      <div class="prevention-card-snippet">${escapeHtml(snippet)}${theme.what_we_know?.length > 200 ? '…' : ''}</div>
      <div class="prevention-card-meta">${indCount} indikátor${indCount === 1 ? '' : (indCount < 5 ? 'y' : 'ů')} · ${strCount} strategi${strCount === 1 ? 'e' : (strCount < 5 ? 'e' : 'í')}</div>
    </a>
  `;
}

// ─────────────────────────────────────────────
// Detail tématu
// ─────────────────────────────────────────────

function renderDetail(id) {
  const theme = allThemes.find(t => t.id === id);
  const detail = document.getElementById('detailView');
  const list = document.getElementById('listView');

  if (!theme) {
    if (detail) {
      detail.innerHTML = `
        <p>Téma <code>${escapeHtml(id)}</code> nenalezeno.
        <a href="prevence.html">Zpět na přehled</a>.</p>
      `;
      detail.classList.remove('hidden');
    }
    if (list) list.classList.add('hidden');
    return;
  }

  if (list) list.classList.add('hidden');
  if (detail) detail.classList.remove('hidden');

  // Indikátory
  const indChips = (theme.hspa_indicators ?? [])
    .map(iid => {
      const ind = findIndicator(iid);
      const label = ind ? ind.name : iid;
      return `<a class="chip" href="indicator.html?id=${encodeURIComponent(iid)}">${escapeHtml(label)}</a>`;
    })
    .join('');

  // Strategie
  const strChips = (theme.strategies ?? [])
    .map(sid => {
      const str = findStrategy(sid);
      const label = str ? str.title : sid;
      return `<a class="chip chip-strategy" href="strategie.html?id=${encodeURIComponent(sid)}">${escapeHtml(label)}</a>`;
    })
    .join('');

  // Akce (try_this_week)
  const actionsHtml = (theme.try_this_week ?? [])
    .map((step, i) => `
      <div class="prevention-action">
        <div class="prevention-action-num">${String(i + 1).padStart(2, '0')}</div>
        <div>${escapeHtml(step)}</div>
      </div>
    `)
    .join('');

  // Páky systému
  const leversHtml = (theme.system_levers ?? [])
    .map(lever => `<li>${escapeHtml(lever)}</li>`)
    .join('');

  // Zdroje
  const sourcesHtml = (theme.sources ?? [])
    .map(s => `
      <li>
        <a href="${escapeHtml(s.url)}" target="_blank" rel="noopener">${escapeHtml(s.title)}</a>
        ${s.accessed_at ? `<span class="ed-stat-meta"> · přístup ${escapeHtml(s.accessed_at)}</span>` : ''}
      </li>
    `)
    .join('');

  detail.innerHTML = `
    <a class="back-link" href="prevence.html">← zpět na přehled</a>

    <div class="prevention-detail">
      <section class="ed-hero" aria-labelledby="detailHeadline">
        <div class="ed-hero-content">
          <div class="ed-kicker">Prevence · ${escapeHtml(theme.title)}</div>
          <h2 class="ed-hero-headline" id="detailHeadline">${escapeHtml(theme.subtitle ?? theme.title)}</h2>
          <p class="ed-hero-lead">${escapeHtml(theme.what_we_know ?? '')}</p>
        </div>
      </section>

      <section class="detail-section">
        <div class="ed-kicker">Vyzkoušejte tento týden</div>
        <div class="prevention-actions">
          ${actionsHtml}
        </div>
      </section>

      ${indChips ? `
        <section class="detail-section">
          <h3>Klíčové ukazatele HSPA</h3>
          <p class="section-note">Tato témata jsou v HSPA monitoru sledována prostřednictvím následujících indikátorů:</p>
          <div class="chip-row">${indChips}</div>
        </section>
      ` : ''}

      ${strChips ? `
        <section class="detail-section">
          <h3>Související strategie</h3>
          <div class="chip-row">${strChips}</div>
        </section>
      ` : ''}

      ${(() => {
        const relatedArticles = allArticles.filter(ar => (ar.linked_prevention_themes ?? []).includes(theme.id));
        if (!relatedArticles.length) return '';
        const items = relatedArticles.map(ar => `
          <li class="prev-article-item">
            <a class="prev-article-link" href="${escapeHtml(ar.slug)}">
              <span class="prev-article-tag">${escapeHtml(ar.tag ?? 'Článek')}</span>
              <span class="prev-article-title">${escapeHtml(ar.title)}</span>
              ${ar.perex ? `<span class="prev-article-perex">${escapeHtml(ar.perex)}</span>` : ''}
            </a>
          </li>
        `).join('');
        return `
          <section class="detail-section">
            <h3>Související články</h3>
            <p class="section-note">Delší analytické texty z HSPA Monitoru, které se k tomuto tématu přímo vztahují:</p>
            <ul class="prev-article-list">${items}</ul>
          </section>
        `;
      })()}

      ${leversHtml ? `
        <section class="detail-section">
          <h3>Co může změnit systém</h3>
          <p class="section-note">Osobní odpovědnost nestačí bez prostředí, které zdravou volbu usnadní:</p>
          <ul class="docs-list">${leversHtml}</ul>
        </section>
      ` : ''}

      ${sourcesHtml ? `
        <section class="detail-section">
          <h3>Zdroje</h3>
          <ul class="prevention-source-list">${sourcesHtml}</ul>
        </section>
      ` : ''}

      ${theme.caveat ? `
        <div class="prevention-caveat">
          <strong>Kdy řešit s lékařem:</strong> ${escapeHtml(theme.caveat)}
        </div>
      ` : ''}
    </div>
  `;
}

// ─────────────────────────────────────────────
// List view
// ─────────────────────────────────────────────

function renderList() {
  renderHero();
  renderFlow();
  renderThemes();
}

// ─────────────────────────────────────────────
// Inicializace
// ─────────────────────────────────────────────

async function init() {
  if (typeof window === 'undefined') return;

  renderModuleNav('prevention');
  renderMastheadDate();

  try {
    const [prev, ind, str, art] = await Promise.all([
      fetch('data/prevention.json').then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); }),
      fetch('data/indicators.json').then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); }),
      fetch('data/strategies.json').then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); }),
      fetch('data/articles.json').then(r => r.ok ? r.json() : { articles: [] }).catch(() => ({ articles: [] })),
    ]);

    heroData = prev.hero;
    flowSteps = prev.flow_steps ?? [];
    allThemes = prev.themes ?? [];
    allIndicators = ind.indicators ?? [];
    allStrategies = str.strategies ?? [];
    allArticles = (art.articles ?? []).filter(a => isArticleVisible(a));

    const id = new URLSearchParams(window.location.search).get('id');
    if (id) renderDetail(id);
    else renderList();
  } catch (err) {
    console.error('prevention load failed:', err);
    const listView = document.getElementById('listView');
    if (listView) listView.innerHTML = renderErrorState('Nepodařilo se načíst data prevence.', err);
  }
}

if (typeof window !== 'undefined') init();
