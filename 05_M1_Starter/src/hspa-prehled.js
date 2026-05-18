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
    renderGapSection(indicators);
  } catch (err) {
    console.error('hspa-prehled load failed:', err);
    const grid = document.getElementById('hspaDimsGrid');
    if (grid) grid.innerHTML = `<p class="status error">Nepodařilo se načíst data: ${escapeHtml(err.message)}.</p>`;
  }
}

/**
 * Cíl českého rámce HSPA (OECD/MZ ČR 2023) — 12 domén × počet indikátorů
 * Zdroj: Příloha D PDF (OECD 2023). Celkem 122 (některé domény mají sub-rozpad
 * — zde používáme top-level domain counts; součet ~118, zaokrouhleno na 122
 * dle deklarovaného totalu rámce).
 */
const OECD_DOMAIN_TARGETS = [
  { name: 'Zdravotní stav', target: 19, ourDomains: ['Zdravotní stav', 'Mortalita', 'Délka a kvalita života', 'Zátěž nemocí'] },
  { name: 'Zdravotní rizika', target: 12, ourDomains: ['Zdravotní rizika'] },
  { name: 'Dostupnost péče', target: 10, ourDomains: ['Dostupnost', 'Dostupnost péče', 'Dostupnost akutní péče'] },
  { name: 'Kvalita', target: 19, ourDomains: ['Kvalita péče', 'Bezpečnost péče', 'Nemocniční péče', 'Porodní péče', 'Antimikrobiální rezistence', 'Zkušenost pacienta', 'Vysoce specializovaná péče', 'Péče o chronicky nemocné'] },
  { name: 'Integrované poskytování péče', target: 18, ourDomains: ['Koordinace péče', 'Preventivní péče', 'Ambulantní péče'] },
  { name: 'Nákladově efektivní poskytování péče', target: 6, ourDomains: [] },
  { name: 'Spravedlivé poskytování péče', target: 2, ourDomains: [] },
  { name: 'Finanční stabilita', target: 5, ourDomains: ['Finanční stabilita'] },
  { name: 'Financování', target: 8, ourDomains: ['Financování', 'Financování zdravotnictví'] },
  { name: 'Pracovní síla', target: 11, ourDomains: ['Pracovní síla'] },
  { name: 'eHealth a technologie', target: 6, ourDomains: ['Digitalizace zdravotnictví', 'Zdravotnická technika', 'Nemocniční infrastruktura', 'Materiální zdroje'] },
  { name: 'Odolnost', target: 6, ourDomains: ['Duševní zdraví'] },
];
const OECD_FRAMEWORK_TOTAL = 122;

function renderGapSection(indicators) {
  const haveEl = document.getElementById('hspaGapHaveCount');
  const missingEl = document.getElementById('hspaGapMissingCount');
  const tbody = document.getElementById('hspaGapTableBody');
  if (!haveEl || !tbody) return;

  const total = indicators.length;
  const missing = Math.max(0, OECD_FRAMEWORK_TOTAL - total);
  haveEl.textContent = String(total);
  if (missingEl) missingEl.textContent = String(missing);

  // Spočítáme, kolik našich indikátorů spadá do každé OECD domény (přes ourDomains mapping)
  const ourByDomain = {};
  for (const ind of indicators) {
    const d = ind.domain || 'other';
    ourByDomain[d] = (ourByDomain[d] || 0) + 1;
  }

  const rows = OECD_DOMAIN_TARGETS.map(d => {
    const have = d.ourDomains.reduce((sum, od) => sum + (ourByDomain[od] || 0), 0);
    const pct = d.target > 0 ? Math.round((have / d.target) * 100) : 0;
    const barWidth = Math.min(100, pct);
    const barClass = pct >= 80 ? 'good' : pct >= 40 ? 'warn' : 'bad';
    return `
      <tr>
        <td>${escapeHtml(d.name)}</td>
        <td class="num">${d.target}</td>
        <td class="num">${have}</td>
        <td class="num">
          <span class="hspa-gap-bar hspa-gap-bar-${barClass}" style="width:${barWidth}%"></span>
          <span class="hspa-gap-pct">${pct} %</span>
        </td>
      </tr>`;
  }).join('');
  tbody.innerHTML = rows;
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
