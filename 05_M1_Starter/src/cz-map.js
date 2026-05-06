// Tile mapa krajů ČR (NUTS-3) — schematická 5×3 mřížka.
// Cíl: rychlá, srozumitelná vizualizace bez závislostí na externí GeoJSON
// nebo D3. Dodržuje HSPA paletu: gradient good (#38761D) → bad (#990000)
// podle směru indikátoru. Zachovává print-friendly vzhled.
//
// Použití:
//   import { renderCzMap } from './cz-map.js';
//   renderCzMap(container, dataset, { onSelect, activeCode });
//
// dataset = { name, unit, year, country_avg, direction, regions: [{code,name,value}] }

// Geografické rozložení krajů na 5×3 mřížce (col, row), 0-indexed.
// Schéma — sever je nahoře:
//
//        Ústí  Liberec  HK    Moravskoslezský
//   KVK  Praha Středoč. Pard. Olomouc
//   PL   JHČ   Vysočina JHM   Zlín
//
// Praha a Středočeský jsou rozděleny do dvou tiles (Praha jako enkláva).
const CZ_REGIONS_LAYOUT = [
  { code: 'CZ042', name: 'Ústecký',         short: 'ÚST', col: 1, row: 0 },
  { code: 'CZ051', name: 'Liberecký',       short: 'LBK', col: 2, row: 0 },
  { code: 'CZ052', name: 'Královéhradecký', short: 'HKK', col: 3, row: 0 },
  { code: 'CZ080', name: 'Moravskoslezský', short: 'MSK', col: 4, row: 0 },
  { code: 'CZ041', name: 'Karlovarský',     short: 'KVK', col: 0, row: 1 },
  { code: 'CZ010', name: 'Praha',           short: 'PHA', col: 1, row: 1 },
  { code: 'CZ020', name: 'Středočeský',     short: 'STČ', col: 2, row: 1 },
  { code: 'CZ053', name: 'Pardubický',      short: 'PAK', col: 3, row: 1 },
  { code: 'CZ071', name: 'Olomoucký',       short: 'OLK', col: 4, row: 1 },
  { code: 'CZ032', name: 'Plzeňský',        short: 'PLK', col: 0, row: 2 },
  { code: 'CZ031', name: 'Jihočeský',       short: 'JHČ', col: 1, row: 2 },
  { code: 'CZ063', name: 'Vysočina',        short: 'VYS', col: 2, row: 2 },
  { code: 'CZ064', name: 'Jihomoravský',    short: 'JHM', col: 3, row: 2 },
  { code: 'CZ072', name: 'Zlínský',         short: 'ZLK', col: 4, row: 2 },
];

const TILE_W = 86;
const TILE_H = 70;
const TILE_GAP = 6;
const PADDING = 12;

// Mapování signal → barva (HSPA paleta)
const SIGNAL_COLORS = {
  good: '#38761D',
  warn: '#B45F06',
  bad:  '#990000',
  neutral: '#5A6770',
};

/**
 * Vrátí signál pro krajskou hodnotu vůči průměru ČR.
 * Ne stejně jako transform.computeSignal — zde porovnáváme s průměrem ČR
 * (ne s OECD), použité prahy: ±5 % = warn, mimo = bad/good.
 */
export function computeRegionSignal(value, countryAvg, direction) {
  if (value == null || countryAvg == null) return 'neutral';
  if (direction === 'context_dependent') return 'neutral';
  const diff = ((value - countryAvg) / countryAvg) * 100;
  const adjusted = direction === 'higher_is_better' ? diff : -diff;
  if (adjusted >= 3) return 'good';
  if (adjusted <= -3) return 'bad';
  return 'warn';
}

function escape(s) {
  if (s == null) return '';
  return String(s).replace(/[&<>"']/g, c =>
    ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c]);
}

function fmt(value, unit) {
  if (value == null) return '—';
  const s = value < 100 ? value.toFixed(1) : Math.round(value).toString();
  return unit ? `${s} ${unit}` : s;
}

/**
 * Renderuje tile mapu do daného kontejneru.
 * @param {HTMLElement} container
 * @param {Object} dataset { name, unit, year, country_avg, direction, regions }
 * @param {Object} [options] { onSelect: (code) => void, activeCode: string, showLegend: boolean }
 */
export function renderCzMap(container, dataset, options = {}) {
  if (!container || !dataset || !Array.isArray(dataset.regions)) {
    if (container) container.innerHTML = '<p class="cz-map-empty">Mapa: data nejsou k dispozici.</p>';
    return;
  }
  const { onSelect, activeCode, showLegend = true } = options;
  const direction = dataset.direction ?? 'context_dependent';
  const countryAvg = dataset.country_avg;

  // Index hodnot podle kódu
  const valuesByCode = new Map();
  for (const r of dataset.regions) valuesByCode.set(r.code, r);

  const cols = 5, rows = 3;
  const w = PADDING * 2 + cols * TILE_W + (cols - 1) * TILE_GAP;
  const h = PADDING * 2 + rows * TILE_H + (rows - 1) * TILE_GAP;

  let svg = `<svg class="cz-map" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Mapa krajů ČR — ${escape(dataset.name)}">`;
  svg += `<title>${escape(dataset.name)}</title>`;

  for (const layout of CZ_REGIONS_LAYOUT) {
    const x = PADDING + layout.col * (TILE_W + TILE_GAP);
    const y = PADDING + layout.row * (TILE_H + TILE_GAP);
    const region = valuesByCode.get(layout.code);
    const value = region?.value ?? null;
    const sig = computeRegionSignal(value, countryAvg, direction);
    const color = value == null ? '#EDF2F7' : SIGNAL_COLORS[sig];
    const textColor = value == null ? '#94A3B8' : '#FFFFFF';
    const isActive = activeCode === layout.code;
    const stroke = isActive ? '#0B5394' : '#FFFFFF';
    const strokeW = isActive ? 3 : 1.5;
    const cursor = onSelect ? 'pointer' : 'default';

    const ariaLabel = value != null
      ? `${layout.name}: ${fmt(value, dataset.unit)}`
      : `${layout.name}: data nejsou k dispozici`;

    svg += `
      <g class="cz-map-tile${isActive ? ' active' : ''}" data-code="${layout.code}"
         tabindex="0" role="button" aria-label="${escape(ariaLabel)}"
         style="cursor:${cursor}">
        <rect x="${x}" y="${y}" width="${TILE_W}" height="${TILE_H}" rx="8" ry="8"
              fill="${color}" stroke="${stroke}" stroke-width="${strokeW}"></rect>
        <text x="${x + TILE_W/2}" y="${y + 22}" text-anchor="middle"
              font-size="11" font-weight="700" fill="${textColor}"
              font-family="'Segoe UI', system-ui, sans-serif">${escape(layout.short)}</text>
        <text x="${x + TILE_W/2}" y="${y + 42}" text-anchor="middle"
              font-size="16" font-weight="700" fill="${textColor}"
              font-family="'Segoe UI', system-ui, sans-serif">${value != null ? (value < 100 ? value.toFixed(1) : Math.round(value)) : '—'}</text>
        <text x="${x + TILE_W/2}" y="${y + 58}" text-anchor="middle"
              font-size="9" fill="${textColor}" opacity="0.85"
              font-family="'Segoe UI', system-ui, sans-serif">${escape(layout.name.length > 13 ? layout.short : layout.name)}</text>
      </g>`;
  }

  svg += '</svg>';

  let legendHTML = '';
  if (showLegend) {
    const betterHigher = direction !== 'lower_is_better';
    const goodLabel = betterHigher ? `Lépe než ČR (${fmt(countryAvg, dataset.unit)})` : `Lépe než ČR (${fmt(countryAvg, dataset.unit)})`;
    const badLabel = betterHigher ? 'Hůře než ČR' : 'Hůře než ČR';
    legendHTML = `
      <div class="cz-map-legend">
        <span class="cz-map-legend-item"><i style="background:${SIGNAL_COLORS.good}"></i>${escape(goodLabel)}</span>
        <span class="cz-map-legend-item"><i style="background:${SIGNAL_COLORS.warn}"></i>V pásmu ±3 %</span>
        <span class="cz-map-legend-item"><i style="background:${SIGNAL_COLORS.bad}"></i>${escape(badLabel)}</span>
        <span class="cz-map-note">Klik na kraj zobrazí detail.</span>
      </div>`;
  }

  container.innerHTML = `<div class="cz-map-wrap">${svg}${legendHTML}</div>`;

  if (onSelect) {
    container.querySelectorAll('.cz-map-tile').forEach(tile => {
      const code = tile.dataset.code;
      tile.addEventListener('click', () => onSelect(code));
      tile.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(code);
        }
      });
    });
  }
}

export const CZ_REGIONS = CZ_REGIONS_LAYOUT;
