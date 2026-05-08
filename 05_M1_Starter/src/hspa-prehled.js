// Frontend logika pro hspa-prehled.html.
// Načítá indicators.json + dimensions.json a renderuje 6 HSPA dimenzí
// s dílčími skóre, popisem a počtem indikátorů.

import './analytics.js';
import { renderModuleNav, renderMastheadDate, escapeHtml } from './page-shared.js';

async function init() {
  if (typeof window === 'undefined') return;
  renderModuleNav('hspa-prehled');
  renderMastheadDate();

  try {
    const [indRes, dimRes] = await Promise.all([
      fetch('data/indicators.json').then(r => { if (!r.ok) throw new Error('indicators.json HTTP ' + r.status); return r.json(); }),
      fetch('data/dimensions.json').then(r => { if (!r.ok) throw new Error('dimensions.json HTTP ' + r.status); return r.json(); }),
    ]);
    const indicators = indRes.indicators ?? [];
    const dimensions = dimRes.dimensions ?? [];
    renderDimensions(indicators, dimensions);
  } catch (err) {
    console.error('hspa-prehled load failed:', err);
    const grid = document.getElementById('hspaDimsGrid');
    if (grid) grid.innerHTML = `<p class="status error">Nepodařilo se načíst data: ${escapeHtml(err.message)}.</p>`;
  }
}

function renderDimensions(indicators, dimensions) {
  const grid = document.getElementById('hspaDimsGrid');
  if (!grid) return;

  const byDim = {};
  for (const ind of indicators) {
    const d = ind.dimension || 'other';
    if (!byDim[d]) byDim[d] = { total: 0, good: 0, warn: 0, bad: 0 };
    byDim[d].total++;
    byDim[d][ind.signal] = (byDim[d][ind.signal] || 0) + 1;
  }

  grid.innerHTML = dimensions.map((d, i) => {
    const stats = byDim[d.id] || { total: 0, good: 0, warn: 0, bad: 0 };
    const scoreable = (stats.good || 0) + (stats.warn || 0) + (stats.bad || 0);
    const score = scoreable > 0 ? Math.round((stats.good * 100 + stats.warn * 50) / scoreable) : null;
    const num = String(i + 1).padStart(2, '0');
    return `
      <article class="hspa-dim-card" style="--dim-color:${d.color}">
        <div class="hspa-dim-card-num">${num}</div>
        <h4 class="hspa-dim-card-title">${escapeHtml(d.label)}</h4>
        <p class="hspa-dim-card-desc">${escapeHtml(d.description)}</p>
        <div class="hspa-dim-card-foot">
          <div class="hspa-dim-card-score">${score != null ? score : '—'}<span class="hspa-dim-card-score-unit">/100</span></div>
          <div class="hspa-dim-card-meta">${stats.total} ukazatel${stats.total === 1 ? '' : (stats.total < 5 ? 'y' : 'ů')} · ${stats.good} dobré · ${stats.bad} kritické</div>
        </div>
        <a class="hspa-dim-card-link" href="index.html#dim=${encodeURIComponent(d.id)}">Otevřít ukazatele →</a>
      </article>
    `;
  }).join('');
}

if (typeof window !== 'undefined') init();
