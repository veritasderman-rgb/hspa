// Pokročilé vizualizace pro audience „policy" v stránce strategie.html (M-STR-4):
//   1. Timeline všech aktivních strategií (Gantt-like)
//   2. Responsibility matrix (instituce × strategie × role)

import { escapeHtml } from './page-shared.js';

// ===== Timeline =====

/**
 * Postaví Gantt timeline ze strategií, které mají horizon.from a/nebo horizon.to.
 * @param {object[]} strategies
 * @returns {{ minYear: number, maxYear: number, items: object[] }}
 */
export function buildTimelineModel(strategies, refYear = new Date().getFullYear()) {
  const items = strategies
    .filter(s => s.horizon && (s.horizon.from || s.horizon.to))
    .map(s => ({
      id: s.id,
      title: s.title,
      level: s.level,
      status: s.status,
      from: s.horizon.from ?? refYear,
      to: s.horizon.to ?? refYear + 5,
    }));

  const allYears = items.flatMap(i => [i.from, i.to]).filter(Number.isFinite);
  const minYear = Math.min(...allYears, refYear - 5);
  const maxYear = Math.max(...allYears, refYear + 5);

  // Seřaď podle úrovně, pak from
  const levelOrder = { national: 0, sector: 1, institution: 2, eu: 3, global: 4, standard: 5 };
  items.sort((a, b) => (levelOrder[a.level] ?? 99) - (levelOrder[b.level] ?? 99) || a.from - b.from);

  return { minYear, maxYear, items, refYear };
}

export function renderTimeline(strategies) {
  const model = buildTimelineModel(strategies);
  const span = model.maxYear - model.minYear;
  if (span <= 0) return '<p>Žádné strategie s časovým horizontem.</p>';

  const decadeLabels = [];
  for (let y = Math.ceil(model.minYear / 5) * 5; y <= model.maxYear; y += 5) {
    decadeLabels.push({ year: y, pct: ((y - model.minYear) / span) * 100 });
  }

  const refLinePct = ((model.refYear - model.minYear) / span) * 100;

  const rows = model.items.map(item => {
    const left = ((item.from - model.minYear) / span) * 100;
    const width = ((item.to - item.from) / span) * 100;
    return `
      <a class="ts-row" href="strategie.html?id=${encodeURIComponent(item.id)}" title="${escapeHtml(item.title)} (${item.from}–${item.to})">
        <span class="ts-label">${escapeHtml(item.title)}</span>
        <span class="ts-track">
          <span class="ts-bar ts-${item.level} st-${item.status}" style="left: ${left}%; width: ${Math.max(width, 1)}%"></span>
        </span>
      </a>
    `;
  }).join('');

  return `
    <div class="timeline-wrap">
      <div class="ts-header">
        <span class="ts-label-spacer"></span>
        <span class="ts-axis">
          ${decadeLabels.map(d => `<span class="ts-tick" style="left: ${d.pct}%">${d.year}</span>`).join('')}
          <span class="ts-now" style="left: ${refLinePct}%" title="Dnes (${model.refYear})"></span>
        </span>
      </div>
      <div class="ts-rows">${rows}</div>
      <div class="ts-legend">
        <span><i class="ts-bar ts-national"></i> Národní ČR</span>
        <span><i class="ts-bar ts-sector"></i> Sektorové</span>
        <span><i class="ts-bar ts-eu"></i> EU</span>
        <span><i class="ts-bar ts-global"></i> WHO/OECD</span>
        <span><i class="ts-now"></i> Dnes (${model.refYear})</span>
      </div>
    </div>
  `;
}

// ===== Responsibility matrix =====

/**
 * Vytvoří matici instituce × strategie z polí owner + co_owners.
 * @returns {{ institutions: string[], rows: Array<{strategy: object, roles: Map<string, 'owner'|'co_owner'>}> }}
 */
export function buildResponsibilityMatrix(strategies, opts = {}) {
  const { topN = 16 } = opts;
  const institutionCounts = new Map();
  for (const s of strategies) {
    if (s.owner) institutionCounts.set(s.owner, (institutionCounts.get(s.owner) ?? 0) + 1);
    for (const co of s.co_owners ?? []) institutionCounts.set(co, (institutionCounts.get(co) ?? 0) + 1);
  }
  const institutions = [...institutionCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([name]) => name);

  const rows = strategies
    .filter(s => s.owner || (s.co_owners ?? []).length)
    .filter(s => institutions.includes(s.owner) || (s.co_owners ?? []).some(co => institutions.includes(co)))
    .map(s => {
      const roles = new Map();
      if (s.owner) roles.set(s.owner, 'owner');
      for (const co of s.co_owners ?? []) {
        if (!roles.has(co)) roles.set(co, 'co_owner');
      }
      return { strategy: s, roles };
    });

  return { institutions, rows };
}

export function renderResponsibilityMatrix(strategies) {
  const { institutions, rows } = buildResponsibilityMatrix(strategies);
  if (!rows.length) return '<p>Žádné strategie s vyplněnými garanty.</p>';

  const head = `
    <thead>
      <tr>
        <th class="rm-strategy-col">Strategie</th>
        ${institutions.map(i => `<th class="rm-inst-col"><span>${escapeHtml(i)}</span></th>`).join('')}
      </tr>
    </thead>
  `;

  const body = `
    <tbody>
      ${rows.map(({ strategy, roles }) => `
        <tr>
          <td class="rm-strategy-cell">
            <a href="strategie.html?id=${encodeURIComponent(strategy.id)}">${escapeHtml(strategy.title)}</a>
          </td>
          ${institutions.map(i => {
            const r = roles.get(i);
            if (r === 'owner') return `<td class="rm-cell rm-owner" title="Vlastník (garant)">●</td>`;
            if (r === 'co_owner') return `<td class="rm-cell rm-co" title="Spolu-garant">○</td>`;
            return `<td class="rm-cell"></td>`;
          }).join('')}
        </tr>
      `).join('')}
    </tbody>
  `;

  return `
    <div class="rm-wrap">
      <table class="responsibility-matrix">${head}${body}</table>
      <div class="rm-legend">
        <span>● Vlastník (garant)</span>
        <span>○ Spolu-garant</span>
      </div>
    </div>
  `;
}
