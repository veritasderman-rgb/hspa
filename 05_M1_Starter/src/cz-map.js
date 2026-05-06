// Schematická tile-cartogram mapa krajů ČR.
// 14 krajů reprezentováno hexagony rozmístěnými do přibližně geografické polohy.
// Hexagonový tile cartogram záměrně obětuje plošnou přesnost ve prospěch
// vizuální čitelnosti — každý kraj má identickou velikost, takže oko nepřitahují
// větší kraje. Standardní technika v dataviz (FT, NPR, Bloomberg).

// Souřadnice v hex-grid prostoru: (col, row), pak se převede na pixely.
// Layout je sestrojen tak, aby přibližně odpovídal geografii ČR
// (Praha uprostřed, Karlovarský/Plzeňský západně, Moravskoslezský východně).
const CZ_REGIONS_HEX = [
  { code: 'CZ041', name: 'Karlovarský',     short: 'KAR', col: 0, row: 1 },
  { code: 'CZ042', name: 'Ústecký',         short: 'ULK', col: 1, row: 0 },
  { code: 'CZ051', name: 'Liberecký',       short: 'LBK', col: 2, row: 0 },
  { code: 'CZ052', name: 'Královéhradecký', short: 'HKK', col: 3, row: 1 },
  { code: 'CZ053', name: 'Pardubický',      short: 'PAK', col: 3, row: 2 },
  { code: 'CZ032', name: 'Plzeňský',        short: 'PLK', col: 1, row: 2 },
  { code: 'CZ010', name: 'Praha',           short: 'PHA', col: 2, row: 1 },
  { code: 'CZ020', name: 'Středočeský',     short: 'STC', col: 2, row: 2 },
  { code: 'CZ031', name: 'Jihočeský',       short: 'JHC', col: 2, row: 3 },
  { code: 'CZ063', name: 'Vysočina',        short: 'VYS', col: 3, row: 3 },
  { code: 'CZ064', name: 'Jihomoravský',    short: 'JHM', col: 4, row: 3 },
  { code: 'CZ071', name: 'Olomoucký',       short: 'OLK', col: 4, row: 2 },
  { code: 'CZ072', name: 'Zlínský',         short: 'ZLK', col: 5, row: 3 },
  { code: 'CZ080', name: 'Moravskoslezský', short: 'MSK', col: 5, row: 1 },
];

const HEX_SIZE = 36; // poloměr hexagonu (px)
const HEX_W = Math.sqrt(3) * HEX_SIZE;
const HEX_H = 2 * HEX_SIZE;
const ROW_GAP = HEX_H * 0.75;
const PAD = 12;

function hexCenter(col, row) {
  // Pointy-top hexagon, sudé řady posunuté o polovinu
  const x = PAD + HEX_W * (col + (row % 2 === 0 ? 0 : 0.5)) + HEX_W / 2;
  const y = PAD + ROW_GAP * row + HEX_H / 2;
  return { x, y };
}

function hexPath(cx, cy) {
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i + Math.PI / 6; // pointy-top
    pts.push([cx + HEX_SIZE * Math.cos(a), cy + HEX_SIZE * Math.sin(a)]);
  }
  return 'M ' + pts.map(p => p.map(n => n.toFixed(2)).join(',')).join(' L ') + ' Z';
}

/**
 * Spočítá barvu pro region podle hodnoty a směru indikátoru.
 * Choropleth s 5 stupni intenzity — divergující škála kolem průměru ČR.
 */
function colorForValue(value, mean, direction) {
  if (value == null || mean == null) return '#E2E8F0';
  const diffPct = ((value - mean) / mean) * 100;
  const better = direction === 'higher_is_better'
    ? diffPct > 0
    : direction === 'lower_is_better'
    ? diffPct < 0
    : null;
  const absDiff = Math.abs(diffPct);
  if (better == null) {
    // context_dependent: jen šedá s intenzitou podle odchylky
    if (absDiff < 2) return '#CBD5E0';
    if (absDiff < 5) return '#A0AEC0';
    return '#718096';
  }
  if (better) {
    if (absDiff < 2) return '#C8E6C9';
    if (absDiff < 5) return '#A5D6A7';
    if (absDiff < 10) return '#66BB6A';
    return '#388E3C';
  } else {
    if (absDiff < 2) return '#FFE0B2';
    if (absDiff < 5) return '#FFB74D';
    if (absDiff < 10) return '#F57C00';
    return '#C62828';
  }
}

/**
 * Vykreslí hex tile mapu krajů. Vrací HTML string.
 *
 * @param {Object} dataset - { unit, country_avg, direction, regions: [{code, value, name}] }
 * @param {Object} opts - { onClickHandlerName, ariaTitle }
 */
export function renderCzMapSVG(dataset, opts = {}) {
  const valuesByCode = new Map((dataset.regions ?? []).map(r => [r.code, r]));
  const mean = dataset.country_avg;
  const direction = dataset.direction ?? 'higher_is_better';
  const unit = dataset.unit ?? '';

  const cells = CZ_REGIONS_HEX.map(r => {
    const data = valuesByCode.get(r.code);
    const value = data?.value ?? null;
    const fill = colorForValue(value, mean, direction);
    const { x: cx, y: cy } = hexCenter(r.col, r.row);
    const valueStr = value != null
      ? (value < 100 ? value.toFixed(1) : Math.round(value).toString())
      : '—';
    const tooltip = value != null
      ? `${r.name}: ${valueStr} ${unit}`
      : `${r.name}: data nedostupná`;
    return `
      <g class="cz-region" data-code="${r.code}" data-name="${r.name}" data-value="${value ?? ''}">
        <title>${tooltip}</title>
        <path d="${hexPath(cx, cy)}" fill="${fill}" stroke="#FFFFFF" stroke-width="2" />
        <text x="${cx}" y="${cy - 4}" text-anchor="middle" class="cz-region-label">${r.short}</text>
        <text x="${cx}" y="${cy + 12}" text-anchor="middle" class="cz-region-value">${valueStr}</text>
      </g>`;
  }).join('');

  // Vypočítat viewport
  const cols = Math.max(...CZ_REGIONS_HEX.map(r => r.col)) + 1;
  const rows = Math.max(...CZ_REGIONS_HEX.map(r => r.row)) + 1;
  const w = PAD * 2 + HEX_W * (cols + 0.5) + HEX_W / 2;
  const h = PAD * 2 + ROW_GAP * (rows - 1) + HEX_H;

  return `
    <svg class="cz-map" viewBox="0 0 ${w.toFixed(0)} ${h.toFixed(0)}" role="img"
         aria-label="${opts.ariaTitle ?? 'Mapa krajů ČR — choropleth'}">
      ${cells}
    </svg>
  `;
}

/**
 * Vrátí pole regionů v stejném pořadí jako mapa (pro propojení s tabulkou).
 */
export function regionList() {
  return CZ_REGIONS_HEX.map(r => ({ code: r.code, name: r.name, short: r.short }));
}

/**
 * Vrátí legendu pro choropleth — barevnou škálu s popisky.
 */
export function renderCzMapLegend(direction) {
  if (direction === 'context_dependent') {
    return `
      <div class="cz-legend">
        <span class="cz-legend-label">Odchylka od průměru ČR:</span>
        <span class="cz-legend-step" style="background:#CBD5E0">&lt; 2 %</span>
        <span class="cz-legend-step" style="background:#A0AEC0">2–5 %</span>
        <span class="cz-legend-step" style="background:#718096">&gt; 5 %</span>
      </div>`;
  }
  const better = direction === 'higher_is_better' ? 'více = lépe' : 'méně = lépe';
  return `
    <div class="cz-legend">
      <span class="cz-legend-label">Odchylka od průměru ČR (${better}):</span>
      <span class="cz-legend-step" style="background:#388E3C">+10 %+</span>
      <span class="cz-legend-step" style="background:#66BB6A">+5–10 %</span>
      <span class="cz-legend-step" style="background:#A5D6A7">+2–5 %</span>
      <span class="cz-legend-step" style="background:#C8E6C9">±2 %</span>
      <span class="cz-legend-step" style="background:#FFE0B2">−2–5 %</span>
      <span class="cz-legend-step" style="background:#FFB74D">−5–10 %</span>
      <span class="cz-legend-step" style="background:#C62828">−10 %+</span>
    </div>`;
}
