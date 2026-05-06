// Schematická choropletní "tile-mapa" 14 krajů ČR.
// Každý kraj = jeden obdélník v 7×4 mřížce, umístěný přibližně podle
// reálné geografické polohy. Není to topograficky přesná mapa, ale
// kartogram (ekvivalent dlaždicových map jaké používá Healthy Belgium nebo
// 538 — všechny regiony mají stejnou plochu, takže menší a větší kraje
// nejsou opticky podhodnoceny).
//
// Renderuje vlastní SVG s tooltipy a klikatelnými dlaždicemi.

import { escapeHtml } from './page-shared.js';

// (col, row) v 7×4 mřížce; řádek 0 = sever, sloupec 0 = západ.
// Praha se kreslí ve vlastním řádku 1, Středočeský ji obklopuje v řádcích 1+2.
const REGION_LAYOUT = [
  // Severní řada
  { code: 'CZ041', name: 'Karlovarský',     short: 'KVK', col: 0, row: 1, x: 0, y: 1 },
  { code: 'CZ042', name: 'Ústecký',         short: 'USK', col: 1, row: 0, x: 1, y: 0 },
  { code: 'CZ051', name: 'Liberecký',       short: 'LBK', col: 2, row: 0, x: 2, y: 0 },
  { code: 'CZ052', name: 'Královéhradecký', short: 'HKK', col: 3, row: 0, x: 3, y: 0 },
  { code: 'CZ053', name: 'Pardubický',      short: 'PAK', col: 4, row: 1, x: 4, y: 1 },
  { code: 'CZ071', name: 'Olomoucký',       short: 'OLK', col: 5, row: 0, x: 5, y: 0 },
  { code: 'CZ080', name: 'Moravskoslezský', short: 'MSK', col: 6, row: 0, x: 6, y: 0 },
  // Středová řada
  { code: 'CZ032', name: 'Plzeňský',        short: 'PLK', col: 1, row: 2, x: 1, y: 2 },
  { code: 'CZ020', name: 'Středočeský',     short: 'STC', col: 2, row: 1, x: 2, y: 1 },
  { code: 'CZ010', name: 'Praha',           short: 'PHA', col: 2, row: 2, x: 2, y: 2 },
  { code: 'CZ063', name: 'Vysočina',        short: 'VYS', col: 3, row: 2, x: 3, y: 2 },
  { code: 'CZ072', name: 'Zlínský',         short: 'ZLK', col: 5, row: 2, x: 5, y: 2 },
  // Jižní řada
  { code: 'CZ031', name: 'Jihočeský',       short: 'JHC', col: 1, row: 3, x: 1, y: 3 },
  { code: 'CZ064', name: 'Jihomoravský',    short: 'JHM', col: 4, row: 3, x: 4, y: 3 },
];

const COLS = 7;
const ROWS = 4;
const CELL = 78;       // velikost dlaždice v px
const GAP = 6;
const PADDING = 12;

function colorScaleHex(value, min, max, direction) {
  if (value == null || min == null || max == null || max === min) return '#CBD5E0';
  let t = (value - min) / (max - min);
  if (direction === 'lower_is_better') t = 1 - t;
  // Sequential color scale (good = green, bad = red)
  // Zelená #38761D → žlutooranžová #B45F06 → červená #990000
  if (t > 0.66) return '#38761D';
  if (t > 0.33) return '#7CA34A';
  if (t > 0.15) return '#D6A93D';
  if (t > 0.05) return '#B45F06';
  return '#990000';
}

/**
 * Render schematic SVG cartogram of CZ regions.
 * @param {object} dataset { regions: [{code, name, value}], country_avg, unit, direction, year }
 * @returns {string} SVG markup
 */
export function renderRegionCartogram(dataset) {
  const { regions, country_avg, unit, direction, year, name } = dataset;
  const valuesByCode = new Map(regions.map(r => [r.code, r.value]));
  const values = regions.map(r => r.value);
  const min = Math.min(...values);
  const max = Math.max(...values);

  const svgWidth = COLS * (CELL + GAP) + PADDING * 2;
  const svgHeight = ROWS * (CELL + GAP) + PADDING * 2 + 40; // místo na legendu

  const tiles = REGION_LAYOUT.map(r => {
    const value = valuesByCode.get(r.code);
    const fill = colorScaleHex(value, min, max, direction);
    const x = PADDING + r.x * (CELL + GAP);
    const y = PADDING + r.y * (CELL + GAP);
    const valueLabel = value != null ? formatValue(value) : '–';
    const ariaLabel = `${r.name}: ${valueLabel} ${unit}`;
    const cz = country_avg;
    const diff = cz != null && value != null ? value - cz : null;
    const diffStr = diff != null
      ? `${diff >= 0 ? '+' : ''}${formatValue(diff)} oproti průměru ČR`
      : '';
    return `
      <g class="rmap-tile" data-code="${r.code}" data-name="${escapeHtml(r.name)}" data-value="${value ?? ''}" data-unit="${escapeHtml(unit)}" data-diff="${diffStr}" tabindex="0" role="button" aria-label="${escapeHtml(ariaLabel)}">
        <rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="6" ry="6" fill="${fill}" stroke="#fff" stroke-width="2"/>
        <text x="${x + CELL/2}" y="${y + 22}" text-anchor="middle" fill="#fff" font-size="11" font-weight="700" letter-spacing="0.04em">${r.short}</text>
        <text x="${x + CELL/2}" y="${y + 46}" text-anchor="middle" fill="#fff" font-size="20" font-weight="700">${valueLabel}</text>
        <text x="${x + CELL/2}" y="${y + 64}" text-anchor="middle" fill="#fff" font-size="9" opacity="0.85">${escapeHtml(unit)}</text>
      </g>
    `;
  }).join('');

  // Legenda — gradient pruh s extrémy
  const legendY = svgHeight - 30;
  const legendW = 220;
  const legendX = PADDING;
  const legendTitle = direction === 'lower_is_better'
    ? 'Méně = lepší'
    : 'Více = lepší';
  const legend = `
    <defs>
      <linearGradient id="rmap-legend-grad" x1="0%" x2="100%">
        ${direction === 'lower_is_better'
          ? '<stop offset="0%" stop-color="#38761D"/><stop offset="50%" stop-color="#D6A93D"/><stop offset="100%" stop-color="#990000"/>'
          : '<stop offset="0%" stop-color="#990000"/><stop offset="50%" stop-color="#D6A93D"/><stop offset="100%" stop-color="#38761D"/>'}
      </linearGradient>
    </defs>
    <g class="rmap-legend">
      <text x="${legendX}" y="${legendY - 4}" font-size="10" fill="#4E6273">${legendTitle} · ${escapeHtml(unit)}</text>
      <rect x="${legendX}" y="${legendY}" width="${legendW}" height="10" fill="url(#rmap-legend-grad)" rx="3"/>
      <text x="${legendX}" y="${legendY + 24}" font-size="10" fill="#1F2D3A">${formatValue(min)}</text>
      <text x="${legendX + legendW}" y="${legendY + 24}" font-size="10" fill="#1F2D3A" text-anchor="end">${formatValue(max)}</text>
    </g>
  `;

  return `
    <div class="rmap-wrap">
      <div class="rmap-header">
        <div>
          <div class="rmap-title">${escapeHtml(name)}</div>
          <div class="rmap-meta">14 krajů (NUTS-3) · průměr ČR ${formatValue(country_avg)} ${escapeHtml(unit)} · rok ${year ?? '?'}</div>
        </div>
      </div>
      <svg viewBox="0 0 ${svgWidth} ${svgHeight}" class="rmap-svg" role="img" aria-label="Schematická mapa 14 krajů ČR — ${escapeHtml(name)}">
        ${tiles}
        ${legend}
      </svg>
      <div class="rmap-tooltip" id="rmapTooltip" role="status" aria-live="polite"></div>
      <p class="rmap-note">Schematický kartogram (tile-map) — všechny kraje mají stejnou plochu, aby velikost neovlivňovala vnímání hodnoty. Geografická poloha dlaždice odpovídá přibližné poloze sídla kraje.</p>
    </div>
  `;
}

function formatValue(v) {
  if (v == null) return '–';
  if (Math.abs(v) >= 100) return Math.round(v).toString();
  if (Math.abs(v) >= 10) return v.toFixed(1);
  return v.toFixed(2);
}

/**
 * Po vykreslení připoj tooltip handlery.
 */
export function wireRegionCartogram(rootEl) {
  if (!rootEl) return;
  const tooltip = rootEl.querySelector('#rmapTooltip');
  if (!tooltip) return;
  const tiles = rootEl.querySelectorAll('.rmap-tile');

  function show(tile) {
    const name = tile.dataset.name;
    const value = tile.dataset.value;
    const unit = tile.dataset.unit;
    const diff = tile.dataset.diff;
    tooltip.innerHTML = `
      <strong>${escapeHtml(name)}</strong>
      <span class="rmap-tt-value">${value} ${escapeHtml(unit)}</span>
      ${diff ? `<span class="rmap-tt-diff">${escapeHtml(diff)}</span>` : ''}
    `;
    tooltip.classList.add('visible');
  }

  function hide() {
    tooltip.classList.remove('visible');
  }

  tiles.forEach(t => {
    t.addEventListener('mouseenter', () => show(t));
    t.addEventListener('focus', () => show(t));
    t.addEventListener('mouseleave', hide);
    t.addEventListener('blur', hide);
  });
}
