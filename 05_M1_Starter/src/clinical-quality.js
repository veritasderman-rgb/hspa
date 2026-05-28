// Frontend modul pro kvalita-pece.html.
//
// Stránka má všechen content textově v HTML (žádný klíčový obsah se nevykresluje
// z JSON; data slouží primárně jako auditní zdroj + footer atribuce). JS modul
// jen:
//   1) Načte data/clinical-quality.json a vykreslí source-attribution footer
//   2) Vykreslí krajskou heatmapu „pending“ buněk (struktura pro Fázi 4)
//   3) Inicializuje sdílené stránkové komponenty (nav, masthead, AV animace)
//
// Pokud fetch selže (např. offline), stránka stále funguje — JS jen tiše
// přeskočí dynamickou část.

import './analytics.js';
import { renderModuleNav, renderMastheadDate, renderErrorState, escapeHtml } from './page-shared.js';
import { enhanceArticleVisuals } from './article-visuals.js';

const REGIONS = [
  'Praha', 'Středočeský', 'Jihočeský', 'Plzeňský', 'Karlovarský',
  'Ústecký', 'Liberecký', 'Královéhradecký', 'Pardubický',
  'Vysočina', 'Jihomoravský', 'Olomoucký', 'Zlínský', 'Moravskoslezský',
];

const HEATMAP_COLS = [
  { short: 'Sepse',       full: 'Pooperační sepse',                    source: 'puk' },
  { short: '30d AMI',     full: '30d mortalita AMI',                   source: 'puk' },
  { short: '30d CMP',     full: '30d mortalita CMP',                   source: 'puk' },
  { short: 'Trombekt.',   full: 'Trombektomie — % využití',            source: 'puk' },
  { short: 'AWaRe',       full: 'AWaRe preskripce praktici',           source: 'puk' },
  { short: '90d kolor.',  full: '90d mortalita resekce kolorekta',     source: 'puk' },
  { short: 'MDT plíce',   full: '% MDT projednání karcinom plic',      source: 'indiko' },
  { short: 'Diag. prsu',  full: 'Čas k diagnóze karcinom prsu',        source: 'indiko' },
];

async function init() {
  if (typeof window === 'undefined') return;
  renderModuleNav('kvalita-pece');
  renderMastheadDate();

  renderHeatmapSkeleton();
  enhanceArticleVisuals();

  try {
    const res = await fetch('data/clinical-quality.json');
    if (!res.ok) throw new Error('clinical-quality.json HTTP ' + res.status);
    const data = await res.json();
    renderSourceFooter(data);
    renderHeroChips(data);
    annotateGeneratedAt(data);
  } catch (err) {
    console.warn('clinical-quality.json failed to load:', err);
    const slot = document.getElementById('cqSourceFooter');
    if (slot) slot.innerHTML = renderErrorState('Nepodařilo se načíst zdrojovou atribuci.', err);
  }
}

function renderHeatmapSkeleton() {
  const grid = document.getElementById('cqHeatmapGrid');
  if (!grid) return;

  const cells = [];
  // Header row: corner + 8 column labels
  cells.push('<div class="cq-heatmap-cell cq-heatmap-cell-col-label" aria-hidden="true"></div>');
  for (const col of HEATMAP_COLS) {
    cells.push(`<div class="cq-heatmap-cell cq-heatmap-cell-col-label" title="${escapeHtml(col.full)}" aria-label="${escapeHtml(col.full)} — zdroj ${col.source.toUpperCase()}">${escapeHtml(col.short)}</div>`);
  }
  // 14 region rows × 8 cells "pending"
  for (const region of REGIONS) {
    cells.push(`<div class="cq-heatmap-cell cq-heatmap-cell-row-label">${escapeHtml(region)}</div>`);
    for (let i = 0; i < HEATMAP_COLS.length; i++) {
      cells.push('<div class="cq-heatmap-cell" data-status="pending" aria-label="Hodnota bude doplněna ve Fázi 4 (scraping PUK + INDIKO)">—</div>');
    }
  }

  grid.innerHTML = cells.join('');
}

function renderSourceFooter(data) {
  const slot = document.getElementById('cqSourceFooter');
  if (!slot) return;

  const attr = data.source_attribution ?? {};
  const sources = Object.entries(attr).map(([key, src]) => {
    const url = src.url ? `<a href="${escapeHtml(src.url)}" target="_blank" rel="noopener">${escapeHtml(src.url)}</a>` : '';
    const acq = src.data_acquisition ? `<div class="cq-source-acq"><strong>Akvizice:</strong> ${escapeHtml(src.data_acquisition)}</div>` : '';
    const license = src.license ? `<div class="cq-source-license"><strong>Licence:</strong> ${escapeHtml(src.license)}</div>` : '';
    const note = src.note ? `<p class="cq-source-note">${escapeHtml(src.note)}</p>` : '';
    return `
      <article class="cq-source-block" data-source="${escapeHtml(key)}">
        <h4>${escapeHtml(src.name ?? key)}</h4>
        <div class="cq-source-provider">${escapeHtml(src.provider ?? '')}</div>
        <div class="cq-source-url">${url}</div>
        ${acq}
        ${license}
        ${note}
      </article>`;
  }).join('');

  slot.innerHTML = `
    <h3 class="cq-source-h">Zdroje a licence</h3>
    <div class="cq-source-grid">${sources}</div>`;
}

function renderHeroChips(data) {
  const slot = document.getElementById('cqHeroChips');
  if (!slot) return;
  const keys = Object.keys(data.source_attribution ?? {});
  const labels = { puk: 'PUK (KZP)', indiko: 'INDIKO (ČVUT)', ahrq: 'AHRQ (USA)', oecd: 'OECD H@G 2025', uzis: 'ÚZIS NRH' };
  slot.innerHTML = keys.map(k => {
    const url = data.source_attribution[k]?.url ?? '#';
    return `<a class="cq-source-chip" data-source="${escapeHtml(k)}" href="${escapeHtml(url)}" target="_blank" rel="noopener">${escapeHtml(labels[k] ?? k)}</a>`;
  }).join('');
}

function annotateGeneratedAt(data) {
  const el = document.getElementById('cqGeneratedAt');
  if (!el || !data.generated_at) return;
  try {
    const d = new Date(data.generated_at);
    el.textContent = d.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' });
    el.setAttribute('datetime', data.generated_at);
  } catch {
    el.textContent = data.generated_at;
  }
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
}
