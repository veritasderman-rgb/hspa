// Frontend logika stránky legislativa.html (Legislativní radar — VeKLEP).
// Načítá data/legislativa.json + data/articles.json (pro názvy propojených
// článků) a renderuje tabulku návrhů s filtrem podle fáze legislativního
// procesu a fulltextovým hledáním. Vzor: src/strategies.js.

import './analytics.js';
import { renderModuleNav, renderMastheadDate, escapeHtml, renderErrorState } from './page-shared.js';

export const PHASE_LABELS = {
  pripominky: { label: 'V připomínkovém řízení', cls: 'leg-ph-pripominky' },
  vyporadani: { label: 'Vypořádání připomínek', cls: 'leg-ph-vyporadani' },
  vlada: { label: 'Na jednání vlády', cls: 'leg-ph-vlada' },
  parlament: { label: 'V Parlamentu', cls: 'leg-ph-parlament' },
  dokonceno: { label: 'Proces dokončen', cls: 'leg-ph-dokonceno' },
};

export const TYPE_LABELS = {
  zakon: 'Návrh zákona',
  vyhlaska: 'Návrh vyhlášky',
  narizeni_vlady: 'Nařízení vlády',
};

// Pořadí fází v tabulce = postup legislativního procesu.
export const PHASE_ORDER = ['pripominky', 'vyporadani', 'vlada', 'parlament', 'dokonceno'];

let allItems = [];
let articlesById = new Map();
let activePhase = 'all';
let activeSearch = '';

/** Filtr podle fáze + fulltext přes title/title_short/annotation/submitter. */
export function filterLegislation(items, { phase, search } = {}) {
  let xs = items;
  if (phase && phase !== 'all') xs = xs.filter(it => it.phase === phase);
  if (search) {
    const q = search.toLowerCase();
    xs = xs.filter(it =>
      (it.title || '').toLowerCase().includes(q)
      || (it.title_short || '').toLowerCase().includes(q)
      || (it.annotation || '').toLowerCase().includes(q)
      || (it.submitter || '').toLowerCase().includes(q)
    );
  }
  return xs;
}

/** Seřazení: rozjednané fáze nahoře (podle PHASE_ORDER), uvnitř fáze podle poslední změny. */
export function sortLegislation(items) {
  return [...items].sort((a, b) => {
    const pa = PHASE_ORDER.indexOf(a.phase);
    const pb = PHASE_ORDER.indexOf(b.phase);
    if (pa !== pb) return pa - pb;
    return String(b.dates?.last_change ?? '').localeCompare(String(a.dates?.last_change ?? ''));
  });
}

function formatDate(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${Number(d)}. ${Number(m)}. ${y}`;
}

function renderLinks(item) {
  const chips = [];
  for (const id of item.linked_indicators ?? []) {
    chips.push(`<a class="chip" href="indikator-${encodeURIComponent(id)}.html">${escapeHtml(id)}</a>`);
  }
  for (const id of item.linked_articles ?? []) {
    const art = articlesById.get(id);
    if (!art) continue;
    const label = art.title?.length > 60 ? `${art.title.slice(0, 57)}…` : (art.title ?? id);
    chips.push(`<a class="chip chip-strategy" href="${escapeHtml(art.slug)}">${escapeHtml(label)}</a>`);
  }
  return chips.length ? `<div class="chip-row leg-links">${chips.join('')}</div>` : '';
}

function renderRow(item) {
  const phase = PHASE_LABELS[item.phase] ?? { label: item.phase, cls: '' };
  const comments = item.phase === 'pripominky' && item.dates?.comments_until
    ? `<div class="leg-deadline">Připomínky do ${escapeHtml(formatDate(item.dates.comments_until))}</div>`
    : '';
  return `
    <tr class="leg-row">
      <td class="leg-cell-title">
        <span class="leg-type">${escapeHtml(TYPE_LABELS[item.type] ?? item.type)}</span>
        <strong class="leg-title">${escapeHtml(item.title_short)}</strong>
        <p class="leg-annotation">${escapeHtml(item.annotation)}</p>
        ${renderLinks(item)}
      </td>
      <td class="leg-cell-phase">
        <span class="leg-phase-pill ${phase.cls}">${escapeHtml(phase.label)}</span>
        <div class="leg-status" title="Stav materiálu ve VeKLEP">${escapeHtml(item.veklep_status ?? '')}</div>
        ${comments}
      </td>
      <td class="leg-cell-date">${escapeHtml(formatDate(item.dates?.last_change))}</td>
      <td class="leg-cell-link">
        <a href="${escapeHtml(item.veklep_url)}" target="_blank" rel="noopener" title="${escapeHtml(item.title)}">VeKLEP ↗</a>
      </td>
    </tr>
  `;
}

function renderTable() {
  const wrap = document.getElementById('legTableWrap');
  const empty = document.getElementById('emptyState');
  const filtered = sortLegislation(filterLegislation(allItems, { phase: activePhase, search: activeSearch }));

  const badge = document.getElementById('countBadge');
  if (badge) {
    badge.textContent = `${filtered.length} návrh${filtered.length === 1 ? '' : (filtered.length < 5 ? 'y' : 'ů')}`;
  }

  if (!filtered.length) {
    wrap.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  wrap.innerHTML = `
    <table class="leg-table">
      <thead>
        <tr>
          <th scope="col">Návrh předpisu</th>
          <th scope="col">Fáze procesu</th>
          <th scope="col">Poslední změna</th>
          <th scope="col">Zdroj</th>
        </tr>
      </thead>
      <tbody>
        ${filtered.map(renderRow).join('')}
      </tbody>
    </table>
  `;
}

function renderStats() {
  const el = (id) => document.getElementById(id);
  const inProgress = allItems.filter(it => it.phase !== 'dokonceno').length;
  const inComments = allItems.filter(it => it.phase === 'pripominky').length;
  if (el('statTotal')) el('statTotal').textContent = String(allItems.length);
  if (el('statInProgress')) el('statInProgress').textContent = String(inProgress);
  if (el('statComments')) el('statComments').textContent = String(inComments);
}

function wireFilters() {
  document.querySelectorAll('.level-nav button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.level-nav button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activePhase = btn.dataset.phase;
      renderTable();
    });
  });

  const search = document.getElementById('searchBox');
  if (search) {
    let t;
    search.addEventListener('input', () => {
      clearTimeout(t);
      t = setTimeout(() => {
        activeSearch = search.value.trim();
        renderTable();
      }, 200);
    });
  }
}

async function init() {
  if (typeof window === 'undefined') return;

  renderModuleNav('legislativa');
  renderMastheadDate();

  try {
    const [legRes, artsRes] = await Promise.all([
      fetch('data/legislativa.json'),
      fetch('data/articles.json').catch(() => null),
    ]);
    if (!legRes.ok) throw new Error(`HTTP ${legRes.status}`);
    const legData = await legRes.json();
    const artsData = artsRes?.ok ? await artsRes.json() : { articles: [] };

    allItems = legData.items ?? [];
    articlesById = new Map((artsData.articles ?? []).map(a => [a.id, a]));

    renderStats();
    wireFilters();
    renderTable();
  } catch (err) {
    console.error('legislativa load failed:', err);
    document.getElementById('listView').innerHTML = renderErrorState('Nepodařilo se načíst legislativní radar.', err);
  }
}

if (typeof window !== 'undefined') init();
