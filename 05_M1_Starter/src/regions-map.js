// SVG hex tile-cartogram české republiky podle NUTS3 (14 krajů).
// Layout: ~3 řady, geografický offset zachován; každý kraj = jeden hex.
// Použití:
//   import { renderRegionsMap } from './regions-map.js';
//   renderRegionsMap(svgElement, dataset, { onHover, onClick, valueFormatter });
//   dataset = { id, name, unit, year, country_avg, direction, regions: [{ code, name, value }] }

// Pozice hexů v ose (col, row) — flat-top, axiální souřadnice s offset y.
// Geografická hrubá aproximace: západ ↔ východ (col), sever ↔ jih (row).
const REGIONS_LAYOUT = {
  // code:    {col, row,  short label,   uniční hex code zobrazení}
  CZ041: { col: 0, row: 1, short: 'KVK' }, // Karlovarský — daleký západ
  CZ042: { col: 1, row: 0, short: 'ULK' }, // Ústecký — sever
  CZ051: { col: 2, row: 0, short: 'LBK' }, // Liberecký — sever
  CZ052: { col: 3, row: 0, short: 'HKK' }, // Královéhradecký
  CZ032: { col: 0, row: 2, short: 'PLK' }, // Plzeňský
  CZ020: { col: 1, row: 1, short: 'STC' }, // Středočeský
  CZ010: { col: 2, row: 1, short: 'PHA' }, // Praha (vložená)
  CZ053: { col: 3, row: 1, short: 'PAK' }, // Pardubický
  CZ071: { col: 4, row: 1, short: 'OLK' }, // Olomoucký
  CZ080: { col: 5, row: 1, short: 'MSK' }, // Moravskoslezský
  CZ031: { col: 1, row: 2, short: 'JHC' }, // Jihočeský
  CZ063: { col: 2, row: 2, short: 'VYS' }, // Vysočina
  CZ064: { col: 3, row: 2, short: 'JHM' }, // Jihomoravský
  CZ072: { col: 4, row: 2, short: 'ZLK' }, // Zlínský
};

const HEX_SIZE = 38;       // poloměr hexu
const HEX_W = HEX_SIZE * 2;
const HEX_H = HEX_SIZE * Math.sqrt(3);
const COL_STEP = HEX_SIZE * 1.5;
const ROW_STEP = HEX_H;
const PADDING = 14;

function hexCenter(col, row) {
  // Flat-top hex grid, sudé sloupce nahoru, liché dolů (offset)
  const cx = PADDING + HEX_SIZE + col * COL_STEP;
  const cy = PADDING + HEX_H / 2 + row * ROW_STEP + (col % 2 === 1 ? HEX_H / 2 : 0);
  return { cx, cy };
}

function hexPath(cx, cy, size) {
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i;
    pts.push(`${(cx + size * Math.cos(a)).toFixed(1)},${(cy + size * Math.sin(a)).toFixed(1)}`);
  }
  return `M${pts.join(' L')} Z`;
}

// Barvení: kontinuální barva mezi neutrální a "výsledkem" pro daný kraj.
// Logika:
//   higher_is_better:  vyšší než průměr → zelená; nižší → červená
//   lower_is_better:   nižší než průměr → zelená; vyšší → červená
//   context_dependent: vždy modrá s intenzitou podle |odchylky|
function colorForValue(value, avg, direction) {
  const diff = (value - avg) / Math.abs(avg || 1); // relativní odchylka, 0..±n
  const mag = Math.min(1, Math.abs(diff) * 4); // násobíme aby barvy byly kontrastní

  if (direction === 'context_dependent') {
    return mixHex('#E2E8F0', '#0B5394', mag);
  }
  const isImprovement =
    (direction === 'higher_is_better' && value > avg) ||
    (direction === 'lower_is_better' && value < avg);
  const target = isImprovement ? '#38761D' : '#990000';
  return mixHex('#F7F9FB', target, Math.max(0.15, mag));
}

function mixHex(a, b, t) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const r = Math.round(((pa >> 16) & 0xff) * (1 - t) + ((pb >> 16) & 0xff) * t);
  const g = Math.round(((pa >> 8) & 0xff) * (1 - t) + ((pb >> 8) & 0xff) * t);
  const bl = Math.round((pa & 0xff) * (1 - t) + (pb & 0xff) * t);
  return `#${((r << 16) | (g << 8) | bl).toString(16).padStart(6, '0')}`;
}

function fmtVal(v, unit) {
  if (v == null || Number.isNaN(v)) return '—';
  const abs = Math.abs(v);
  let n;
  if (abs >= 1000) n = Math.round(v).toLocaleString('cs-CZ');
  else if (abs >= 100) n = Math.round(v).toString();
  else if (abs >= 10) n = v.toFixed(1);
  else n = v.toFixed(2);
  return unit ? `${n} ${unit}` : n;
}

export function renderRegionsMap(svg, dataset, opts = {}) {
  const { onHover, onClick, valueFormatter } = opts;
  if (!svg || !dataset) return;

  const direction = dataset.direction ?? 'higher_is_better';
  const avg = dataset.country_avg ?? 0;

  // Výpočet rozsahu pro extrémní hodnoty
  const values = dataset.regions.map(r => r.value).filter(v => v != null);
  const minV = Math.min(...values);
  const maxV = Math.max(...values);

  // Stanovení velikosti SVG
  let maxX = 0, maxY = 0;
  for (const code of Object.keys(REGIONS_LAYOUT)) {
    const { col, row } = REGIONS_LAYOUT[code];
    const { cx, cy } = hexCenter(col, row);
    if (cx + HEX_SIZE > maxX) maxX = cx + HEX_SIZE;
    if (cy + HEX_SIZE > maxY) maxY = cy + HEX_SIZE;
  }
  const W = Math.ceil(maxX + PADDING);
  const H = Math.ceil(maxY + PADDING);

  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label',
    `Mapa krajů: ${dataset.name}. Průměr ČR ${fmtVal(avg, dataset.unit)} v roce ${dataset.year}.`);
  svg.innerHTML = '';

  // Tooltip element (sdílený, jeden na mapu)
  const tooltip = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  tooltip.setAttribute('class', 'rmap-tooltip');
  tooltip.setAttribute('pointer-events', 'none');
  tooltip.style.opacity = '0';

  const fmt = valueFormatter || ((v) => fmtVal(v, dataset.unit));

  for (const region of dataset.regions) {
    const layout = REGIONS_LAYOUT[region.code];
    if (!layout) continue;
    const { cx, cy } = hexCenter(layout.col, layout.row);
    const fill = colorForValue(region.value, avg, direction);
    const isExtremeBest =
      (direction === 'higher_is_better' && region.value === maxV) ||
      (direction === 'lower_is_better' && region.value === minV);
    const isExtremeWorst =
      (direction === 'higher_is_better' && region.value === minV) ||
      (direction === 'lower_is_better' && region.value === maxV);

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'rmap-hex');
    g.setAttribute('tabindex', '0');
    g.setAttribute('role', 'button');
    g.setAttribute('aria-label',
      `${region.name}: ${fmt(region.value)}, odchylka od průměru ČR ${(region.value - avg >= 0 ? '+' : '')}${(region.value - avg).toFixed(1)}.`);
    g.dataset.code = region.code;

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', hexPath(cx, cy, HEX_SIZE));
    path.setAttribute('fill', fill);
    path.setAttribute('stroke', isExtremeBest ? '#38761D' : isExtremeWorst ? '#990000' : '#FFFFFF');
    path.setAttribute('stroke-width', isExtremeBest || isExtremeWorst ? 2.5 : 1.5);
    g.appendChild(path);

    const labelTop = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    labelTop.setAttribute('x', cx);
    labelTop.setAttribute('y', cy - 5);
    labelTop.setAttribute('text-anchor', 'middle');
    labelTop.setAttribute('class', 'rmap-label');
    labelTop.textContent = layout.short;
    g.appendChild(labelTop);

    const labelVal = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    labelVal.setAttribute('x', cx);
    labelVal.setAttribute('y', cy + 12);
    labelVal.setAttribute('text-anchor', 'middle');
    labelVal.setAttribute('class', 'rmap-value');
    labelVal.textContent = fmtVal(region.value, '').trim();
    g.appendChild(labelVal);

    g.addEventListener('mouseenter', () => {
      g.classList.add('rmap-hex-active');
      showTooltip(tooltip, cx, cy - HEX_SIZE - 6, region, dataset, fmt);
      if (onHover) onHover(region);
    });
    g.addEventListener('mouseleave', () => {
      g.classList.remove('rmap-hex-active');
      tooltip.style.opacity = '0';
    });
    g.addEventListener('focus', () => {
      g.classList.add('rmap-hex-active');
      showTooltip(tooltip, cx, cy - HEX_SIZE - 6, region, dataset, fmt);
    });
    g.addEventListener('blur', () => {
      g.classList.remove('rmap-hex-active');
      tooltip.style.opacity = '0';
    });
    if (onClick) {
      g.addEventListener('click', () => onClick(region));
      g.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(region); }
      });
    }
    svg.appendChild(g);
  }

  svg.appendChild(tooltip);
}

function showTooltip(tooltip, x, y, region, dataset, fmt) {
  tooltip.innerHTML = '';
  const padX = 8, padY = 6;
  const titleStr = region.name;
  const valStr = fmt(region.value);
  const diff = region.value - dataset.country_avg;
  const diffStr = `${diff >= 0 ? '+' : ''}${diff.toFixed(1)} oproti ČR`;

  const lines = [titleStr, valStr, diffStr];
  const lineH = 14;
  const w = Math.max(...lines.map(l => l.length * 6.5)) + padX * 2;
  const h = lines.length * lineH + padY * 2;
  const tx = Math.max(4, x - w / 2);
  const ty = y - h - 4;

  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rect.setAttribute('x', tx);
  rect.setAttribute('y', ty);
  rect.setAttribute('width', w);
  rect.setAttribute('height', h);
  rect.setAttribute('rx', 4);
  rect.setAttribute('class', 'rmap-tooltip-bg');
  tooltip.appendChild(rect);

  lines.forEach((line, i) => {
    const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    t.setAttribute('x', tx + padX);
    t.setAttribute('y', ty + padY + (i + 1) * lineH - 3);
    t.setAttribute('class', i === 0 ? 'rmap-tooltip-title' : 'rmap-tooltip-line');
    t.textContent = line;
    tooltip.appendChild(t);
  });

  tooltip.style.opacity = '1';
}

// Pomocný formátovač shodný s ostatními kartami
export { fmtVal };
