// Renderování choropletu krajů ČR jako schematické "tile map".
// Každý kraj reprezentuje obdélník v 7×4 mřížce s relativní geografickou
// polohou. Tile-map je vědomá metodologická volba: oproti přesné kartografii
// dává všem krajům stejnou vizuální váhu (není zkreslena rozlohou)
// a je dobře čitelná i na malých displejích.
//
// NUTS-3 kódy: CZ010 Praha, CZ020 Středočeský, CZ031 Jihočeský, CZ032 Plzeňský,
// CZ041 Karlovarský, CZ042 Ústecký, CZ051 Liberecký, CZ052 Královéhradecký,
// CZ053 Pardubický, CZ063 Vysočina, CZ064 Jihomoravský, CZ071 Olomoucký,
// CZ072 Zlínský, CZ080 Moravskoslezský.

const REGION_TILES = [
  // [code, col, row, shortLabel]
  ['CZ051', 3, 0, 'LBK'], // Liberecký
  ['CZ052', 4, 0, 'HKK'], // Královéhradecký
  ['CZ041', 1, 1, 'KVK'], // Karlovarský
  ['CZ042', 2, 1, 'ULK'], // Ústecký
  ['CZ010', 3, 1, 'PHA'], // Praha
  ['CZ020', 4, 1, 'STC'], // Středočeský
  ['CZ053', 5, 1, 'PAK'], // Pardubický
  ['CZ071', 6, 1, 'OLK'], // Olomoucký
  ['CZ080', 7, 1, 'MSK'], // Moravskoslezský
  ['CZ032', 1, 2, 'PLK'], // Plzeňský
  ['CZ063', 5, 2, 'VYS'], // Vysočina
  ['CZ072', 6, 2, 'ZLK'], // Zlínský
  ['CZ031', 2, 3, 'JHC'], // Jihočeský
  ['CZ064', 4, 3, 'JHM'], // Jihomoravský
];

const TILE_W = 90;
const TILE_H = 64;
const PAD = 6;
const COLS = 8;
const ROWS = 4;

/**
 * Vytvoří inline SVG s tile-mapou krajů.
 * @param {HTMLElement} host  Cílový element, do kterého se vloží SVG.
 * @param {Object} dataset    { regions: [{code,name,value}], country_avg, direction, unit }
 * @param {Object} hooks      { onRegionHover(code), onRegionLeave(code) }
 */
export function renderCzMap(host, dataset, hooks = {}) {
  const widthPx = COLS * (TILE_W + PAD);
  const heightPx = ROWS * (TILE_H + PAD);
  const byCode = new Map(dataset.regions.map(r => [r.code, r]));
  const betterHigher = dataset.direction !== 'lower_is_better';
  const avg = dataset.country_avg;

  // Spočti relativní deviation pro fill barvu
  const tiles = REGION_TILES.map(([code, col, row, lbl]) => {
    const r = byCode.get(code);
    if (!r) return { code, col, row, lbl, missing: true };
    const diff = r.value - avg;
    const relPct = avg !== 0 ? (diff / avg) * 100 : 0;
    return { code, col, row, lbl, region: r, diff, relPct };
  });

  const svgChildren = tiles.map(t => {
    const x = t.col * (TILE_W + PAD) + PAD;
    const y = t.row * (TILE_H + PAD) + PAD;
    if (t.missing) {
      return `
        <g class="cz-tile cz-tile-missing" data-region-code="${t.code}">
          <rect x="${x}" y="${y}" width="${TILE_W}" height="${TILE_H}" rx="6" />
          <text x="${x + TILE_W/2}" y="${y + TILE_H/2 + 4}" text-anchor="middle" class="cz-tile-lbl">${t.lbl}</text>
        </g>`;
    }
    const fill = pickColor(t.relPct, betterHigher);
    const valueText = formatValueShort(t.region.value);
    const titleText = `${t.region.name}: ${t.region.value} ${escapeXml(dataset.unit)} (${t.relPct >= 0 ? '+' : ''}${t.relPct.toFixed(1)} % od průměru ČR)`;
    return `
      <g class="cz-tile" data-region-code="${t.code}" tabindex="0" role="button"
         aria-label="${escapeXml(titleText)}">
        <title>${escapeXml(titleText)}</title>
        <rect x="${x}" y="${y}" width="${TILE_W}" height="${TILE_H}" rx="6" fill="${fill}" />
        <text x="${x + TILE_W/2}" y="${y + 22}" text-anchor="middle" class="cz-tile-lbl">${t.lbl}</text>
        <text x="${x + TILE_W/2}" y="${y + 46}" text-anchor="middle" class="cz-tile-val">${valueText}</text>
      </g>
    `;
  }).join('');

  host.innerHTML = `
    <svg viewBox="0 0 ${widthPx} ${heightPx}" preserveAspectRatio="xMidYMid meet"
         class="cz-map-svg" role="img" aria-label="Choropletní mapa 14 krajů ČR">
      ${svgChildren}
    </svg>
    <div class="cz-map-tooltip" id="czMapTooltip" role="status" aria-live="polite"></div>
  `;

  const tooltip = host.querySelector('#czMapTooltip');
  const svg = host.querySelector('svg');

  svg.querySelectorAll('.cz-tile').forEach(node => {
    const code = node.dataset.regionCode;
    const region = byCode.get(code);
    node.addEventListener('mouseenter', () => {
      node.classList.add('region-hover');
      if (region && tooltip) {
        const rel = ((region.value - avg) / (avg || 1) * 100).toFixed(1);
        tooltip.innerHTML = `<strong>${escapeXml(region.name)}</strong>: ${region.value} ${escapeXml(dataset.unit)} (${rel >= 0 ? '+' : ''}${rel} %)`;
        tooltip.classList.add('visible');
      }
      hooks.onRegionHover?.(code);
    });
    node.addEventListener('mouseleave', () => {
      node.classList.remove('region-hover');
      tooltip?.classList.remove('visible');
      hooks.onRegionLeave?.(code);
    });
    node.addEventListener('focus', () => {
      node.classList.add('region-hover');
      hooks.onRegionHover?.(code);
    });
    node.addEventListener('blur', () => {
      node.classList.remove('region-hover');
      hooks.onRegionLeave?.(code);
    });
  });
}

/**
 * Vrátí barvu obdélníku v dichromatickém schématu (good/bad) s neutrální zónou
 * blízko průměru (±2 %).
 * @param {number} relPct  hodnota minus průměr v procentech
 * @param {boolean} betterHigher  true pokud direction = higher_is_better
 */
export function pickColor(relPct, betterHigher) {
  const positive = relPct > 0;
  const isGood = betterHigher ? positive : !positive;
  const mag = Math.min(Math.abs(relPct) / 20, 1); // saturate at 20 %
  if (Math.abs(relPct) < 2) return '#E2E8F0'; // neutrální zóna
  if (isGood) {
    return blend('#E6F4EA', '#1F7A1F', mag);
  } else {
    return blend('#FCE8E6', '#990000', mag);
  }
}

function blend(hexA, hexB, t) {
  const a = hex2rgb(hexA), b = hex2rgb(hexB);
  const r = Math.round(a.r + (b.r - a.r) * t);
  const g = Math.round(a.g + (b.g - a.g) * t);
  const bl = Math.round(a.b + (b.b - a.b) * t);
  return `rgb(${r},${g},${bl})`;
}
function hex2rgb(h) {
  const s = h.replace('#', '');
  return { r: parseInt(s.slice(0,2), 16), g: parseInt(s.slice(2,4), 16), b: parseInt(s.slice(4,6), 16) };
}

function formatValueShort(v) {
  if (v == null) return '—';
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  if (Math.abs(n) >= 100) return n.toFixed(0);
  if (Math.abs(n) >= 10) return n.toFixed(1);
  return n.toFixed(1);
}

function escapeXml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
