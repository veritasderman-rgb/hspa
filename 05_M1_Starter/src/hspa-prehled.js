// Frontend logika pro hspa-prehled.html.
// Načítá indicators.json a renderuje 4 areas s dílčím skóre.

import './analytics.js';
import { renderModuleNav, renderMastheadDate, escapeHtml } from './page-shared.js';

const AREA_DESCRIPTIONS = {
  'Výsledky': 'Žijeme déle — ale za průměrem OECD zaostáváme v kardiovaskulární úmrtnosti a zdravých letech života. Každý rok ztracený pod průměrem je měřitelný.',
  'Výstupy': 'Péče je dostupná, ale nerovnoměrně. Finanční bariéry rostou, čekací doby se liší kraj od kraje a pacientská zkušenost chybí v datech.',
  'Procesy': 'Screeningy zachytávají pozdě, proočkovanost klesá a primární péče koordinuje méně, než by mohla. Systém léčí dobře — ale mohl by víc předcházet.',
  'Struktury': 'Lékaři stárnou, sestry odcházejí a regionální nerovnosti v kapacitách se prohlubují. Infrastruktura je moderní — lidské zdroje jsou výzva.',
};

async function init() {
  if (typeof window === 'undefined') return;
  renderModuleNav('hspa-prehled');
  renderMastheadDate();

  try {
    const res = await fetch('data/indicators.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const indicators = data.indicators ?? [];
    renderAreas(indicators);
  } catch (err) {
    console.error('hspa-prehled load failed:', err);
    const grid = document.getElementById('edAreasGrid');
    if (grid) grid.innerHTML = `<p class="status error">Nepodařilo se načíst data: ${escapeHtml(err.message)}.</p>`;
  }
}

function renderAreas(indicators) {
  const grid = document.getElementById('edAreasGrid');
  if (!grid) return;

  const byArea = {};
  for (const ind of indicators) {
    if (!byArea[ind.area]) byArea[ind.area] = { total: 0, good: 0, warn: 0, bad: 0, neutral: 0 };
    byArea[ind.area].total++;
    byArea[ind.area][ind.signal] = (byArea[ind.area][ind.signal] || 0) + 1;
  }

  const ordered = ['Výsledky', 'Výstupy', 'Procesy', 'Struktury'];
  grid.innerHTML = ordered.map((area, i) => {
    const stats = byArea[area];
    if (!stats) return '';
    const scoreable = stats.good + stats.warn + stats.bad;
    const score = scoreable > 0 ? Math.round((stats.good * 100 + stats.warn * 50) / scoreable) : null;
    const num = String(i + 1).padStart(2, '0');
    const scoreHtml = score != null ? `${score}<span class="ed-area-score-unit">/100</span>` : '—';
    return `
      <a class="ed-area" href="index.html#area=${encodeURIComponent(area)}">
        <div class="ed-area-num">${num}</div>
        <div class="ed-area-name">${escapeHtml(area)}</div>
        <div class="ed-area-desc">${escapeHtml(AREA_DESCRIPTIONS[area] || '')}</div>
        <div class="ed-area-score">${scoreHtml}</div>
        <div class="ed-area-meta">${stats.total} ukazatelů · ${stats.good} dobré · ${stats.bad} kritické</div>
      </a>
    `;
  }).join('');
}

if (typeof window !== 'undefined') init();
