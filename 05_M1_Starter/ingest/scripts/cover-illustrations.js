// Knihovna programmaticky generovaných ilustrací pro article covers.
//
// Každá ilustrace je čistá SVG geometrie s 2-3 barvami (accent, ink, paper).
// Styl: line art / "modern editorial" — jako NYT op-ed nebo Stripe.
// Animace v SVG (mobile-only): draw-in cesty, fade-in vrstvy, pulse, float.
//
// Použití:
//   import { renderIllustration } from './cover-illustrations.js';
//   const svg = renderIllustration('divergence-chart', { accent, ink, paper, x, y, width, height, data });

const INK = '#1f1a14';
const PAPER = '#fbf8f1';

export const ILLUSTRATIONS = {
  'divergence-chart': renderDivergenceChart,
  'coin-stack': renderCoinStack,
  'shield-check': renderShieldCheck,
  'pulse-wave': renderPulseWave,
  'network-dots': renderNetworkDots,
  'building-blocks': renderBuildingBlocks,
  'circle-graph': renderCircleGraph,
  'arrow-trend': renderArrowTrend,
};

// Tag → default ilustrace fallback
export const TAG_ILLUSTRATIONS = {
  'Financování': 'divergence-chart',
  'Politika': 'building-blocks',
  'Legislativa': 'building-blocks',
  'Klinika': 'pulse-wave',
  'Prevence': 'shield-check',
  'Stav populace': 'arrow-trend',
  'Duševní zdraví': 'pulse-wave',
  'Dostupnost': 'network-dots',
  'Digitalizace': 'network-dots',
};

export function renderIllustration(type, opts) {
  const fn = ILLUSTRATIONS[type] || ILLUSTRATIONS['circle-graph'];
  return fn(opts);
}

// =====================================================================
//  DIVERGENCE CHART — pro deficit/nůžky/disparity články
//  Dvě křivky rostou z jednoho bodu, jedna rychleji
//  Mezera = "nůžky" / deficit
// =====================================================================

function renderDivergenceChart({ accent, x, y, width, height, data = {} }) {
  // SVG souřadnice: chart oblast ohraničená padding
  const pad = 30;
  const cx = x + pad;
  const cy = y + pad;
  const cw = width - pad * 2;
  const ch = height - pad * 2;

  // Bod původu (vlevo dole)
  const x0 = cx;
  const y0 = cy + ch * 0.78;

  // Křivka 1 (rychlejší růst — výdaje, accent color)
  const x1End = cx + cw * 0.95;
  const y1End = cy + ch * 0.08;
  const curve1 = `M ${x0} ${y0}
                  C ${x0 + cw * 0.3} ${y0},
                    ${cx + cw * 0.5} ${cy + ch * 0.45},
                    ${x1End} ${y1End}`;

  // Křivka 2 (pomalejší — příjmy, šedá)
  const y2End = cy + ch * 0.32;
  const curve2 = `M ${x0} ${y0}
                  C ${x0 + cw * 0.35} ${y0 - ch * 0.05},
                    ${cx + cw * 0.6} ${cy + ch * 0.55},
                    ${x1End} ${y2End}`;

  // Fill area mezi křivkami = deficit gap
  const fillPath = `M ${x0} ${y0}
                    C ${x0 + cw * 0.3} ${y0}, ${cx + cw * 0.5} ${cy + ch * 0.45}, ${x1End} ${y1End}
                    L ${x1End} ${y2End}
                    C ${cx + cw * 0.6} ${cy + ch * 0.55}, ${x0 + cw * 0.35} ${y0 - ch * 0.05}, ${x0} ${y0}
                    Z`;

  // Pozadí (mřížka subtle)
  const grid = [];
  for (let i = 1; i < 4; i++) {
    const gy = cy + (ch * i) / 4;
    grid.push(`<line x1="${cx}" y1="${gy}" x2="${cx + cw}" y2="${gy}" stroke="${INK}" stroke-opacity="0.05"/>`);
  }

  // Labels (volitelně z data)
  const label1 = data.label1 || 'Výdaje';
  const label1Val = data.value1 || '+6,4 %';
  const label2 = data.label2 || 'Příjmy';
  const label2Val = data.value2 || '+5,5 %';

  return `<g class="illu illu-divergence">
    <!-- Backdrop -->
    <rect x="${cx}" y="${cy}" width="${cw}" height="${ch}" fill="${accent}" fill-opacity="0.04" rx="6"/>
    ${grid.join('')}

    <!-- Gap fill (deficit zone) -->
    <path class="illu-gap" d="${fillPath}" fill="${accent}" fill-opacity="0.18"/>

    <!-- Línie 2 (pomalejší, šedá, kreslí se první) -->
    <path class="illu-line illu-line-2" d="${curve2}"
          fill="none" stroke="${INK}" stroke-opacity="0.55"
          stroke-width="3" stroke-linecap="round"/>

    <!-- Línie 1 (rychlejší, accent, kreslí se druhá) -->
    <path class="illu-line illu-line-1" d="${curve1}"
          fill="none" stroke="${accent}" stroke-width="5" stroke-linecap="round"/>

    <!-- End-point dots -->
    <circle class="illu-dot illu-dot-1" cx="${x1End}" cy="${y1End}" r="7" fill="${accent}"/>
    <circle class="illu-dot illu-dot-2" cx="${x1End}" cy="${y2End}" r="6" fill="${INK}" opacity="0.6"/>

    <!-- Inline labels u koncových bodů -->
    <g class="illu-label-grp illu-label-grp-1">
      <text x="${x1End - 12}" y="${y1End - 14}" text-anchor="end"
            font-family="'Inter', sans-serif" font-size="14" font-weight="700" fill="${accent}">
        ${escapeXml(label1)} ${escapeXml(label1Val)}
      </text>
    </g>
    <g class="illu-label-grp illu-label-grp-2">
      <text x="${x1End - 12}" y="${y2End + 24}" text-anchor="end"
            font-family="'Inter', sans-serif" font-size="13" font-weight="600" fill="${INK}" opacity="0.7">
        ${escapeXml(label2)} ${escapeXml(label2Val)}
      </text>
    </g>

    <!-- Annotation šipka pro "nůžky" -->
    <g class="illu-gap-label">
      <line x1="${cx + cw * 0.5}" y1="${cy + ch * 0.5}" x2="${cx + cw * 0.5}" y2="${cy + ch * 0.6}"
            stroke="${accent}" stroke-width="1.5" stroke-dasharray="3 3" opacity="0.6"/>
      <text x="${cx + cw * 0.5}" y="${cy + ch * 0.75}" text-anchor="middle"
            font-family="'Inter', sans-serif" font-size="11" font-weight="700"
            letter-spacing="0.12em" text-transform="uppercase" fill="${accent}" opacity="0.85">
        nůžky
      </text>
    </g>
  </g>`;
}

// =====================================================================
//  COIN STACK — pro obecné finance/budget články
// =====================================================================

function renderCoinStack({ accent, x, y, width, height }) {
  const centerX = x + width / 2;
  const centerY = y + height / 2;
  const coinR = Math.min(width, height) * 0.22;
  const coinH = coinR * 0.32; // elipsa height ratio
  const stackHeight = coinR * 1.8;

  // Stack 1 (vyšší)
  const s1cx = centerX - coinR * 1.4;
  const coins1 = [];
  for (let i = 0; i < 7; i++) {
    const cyi = centerY + stackHeight / 2 - i * coinH * 0.5;
    const opacity = 0.6 + i * 0.05;
    coins1.push(`
      <ellipse class="illu-coin illu-coin-${i}" cx="${s1cx}" cy="${cyi}" rx="${coinR}" ry="${coinH}"
               fill="${accent}" fill-opacity="${opacity}" stroke="${accent}" stroke-width="1.5"/>`);
  }

  // Stack 2 (nižší)
  const s2cx = centerX + coinR * 1.4;
  const coins2 = [];
  for (let i = 0; i < 4; i++) {
    const cyi = centerY + stackHeight / 2 - i * coinH * 0.5;
    const opacity = 0.4 + i * 0.05;
    coins2.push(`
      <ellipse class="illu-coin illu-coin-${i + 10}" cx="${s2cx}" cy="${cyi}" rx="${coinR}" ry="${coinH}"
               fill="${INK}" fill-opacity="${opacity * 0.5}" stroke="${INK}" stroke-width="1.5"/>`);
  }

  // Top "coin" with symbol
  const topY1 = centerY + stackHeight / 2 - 7 * coinH * 0.5;

  return `<g class="illu illu-coins">
    ${coins1.join('')}
    ${coins2.join('')}
    <!-- Symbol "Kč" on top coin -->
    <text x="${s1cx}" y="${topY1 + 4}" text-anchor="middle"
          font-family="'Source Serif 4', Georgia, serif" font-size="20" font-weight="700"
          fill="${PAPER}">Kč</text>
  </g>`;
}

// =====================================================================
//  SHIELD-CHECK — pro prevenci, ochranu zdraví
// =====================================================================

function renderShieldCheck({ accent, x, y, width, height }) {
  const cx = x + width / 2;
  const cy = y + height / 2;
  const r = Math.min(width, height) * 0.4;

  // Shield path (heraldic)
  const shieldPath = `
    M ${cx} ${cy - r}
    L ${cx + r * 0.85} ${cy - r * 0.7}
    L ${cx + r * 0.85} ${cy + r * 0.1}
    C ${cx + r * 0.85} ${cy + r * 0.55},
      ${cx + r * 0.5} ${cy + r * 0.85},
      ${cx} ${cy + r}
    C ${cx - r * 0.5} ${cy + r * 0.85},
      ${cx - r * 0.85} ${cy + r * 0.55},
      ${cx - r * 0.85} ${cy + r * 0.1}
    L ${cx - r * 0.85} ${cy - r * 0.7}
    Z`;

  // Check mark uvnitř
  const checkPath = `
    M ${cx - r * 0.32} ${cy + r * 0.05}
    L ${cx - r * 0.05} ${cy + r * 0.32}
    L ${cx + r * 0.38} ${cy - r * 0.22}`;

  return `<g class="illu illu-shield">
    <!-- Vnější shield outline -->
    <path class="illu-shield-bg" d="${shieldPath}"
          fill="${accent}" fill-opacity="0.1"
          stroke="${accent}" stroke-width="4" stroke-linejoin="round"/>
    <!-- Inner accent line -->
    <path d="${shieldPath}"
          fill="none" stroke="${accent}" stroke-width="1.5" stroke-opacity="0.4"
          stroke-linejoin="round"
          transform="scale(0.88) translate(${cx * 0.13} ${cy * 0.13})"/>
    <!-- Check mark -->
    <path class="illu-check" d="${checkPath}"
          fill="none" stroke="${accent}" stroke-width="6"
          stroke-linecap="round" stroke-linejoin="round"/>
  </g>`;
}

// =====================================================================
//  PULSE WAVE — EKG-style, klinika/duševní zdraví
// =====================================================================

function renderPulseWave({ accent, x, y, width, height }) {
  const cx = x + 20;
  const cy = y + height / 2;
  const cw = width - 40;
  const ampl = height * 0.18;

  // Klidové linky + pulse uprostřed
  const seg = cw / 8;
  const pulsePath = `
    M ${cx} ${cy}
    L ${cx + seg * 2} ${cy}
    L ${cx + seg * 2.5} ${cy - ampl * 0.3}
    L ${cx + seg * 3} ${cy + ampl * 0.2}
    L ${cx + seg * 3.3} ${cy - ampl * 1.4}
    L ${cx + seg * 3.6} ${cy + ampl * 0.6}
    L ${cx + seg * 4} ${cy - ampl * 0.2}
    L ${cx + seg * 4.5} ${cy}
    L ${cx + cw} ${cy}`;

  // Echo (předchozí pulse, slabší)
  const echoOffset = -seg * 3.5;
  const echoPath = `
    M ${cx} ${cy}
    L ${cx + seg * 2 + echoOffset} ${cy}
    L ${cx + seg * 2.5 + echoOffset} ${cy - ampl * 0.3}
    L ${cx + seg * 3 + echoOffset} ${cy + ampl * 0.2}
    L ${cx + seg * 3.3 + echoOffset} ${cy - ampl * 1.4}
    L ${cx + seg * 3.6 + echoOffset} ${cy + ampl * 0.6}
    L ${cx + seg * 4 + echoOffset} ${cy - ampl * 0.2}
    L ${cx + seg * 4.5 + echoOffset} ${cy}`;

  // Grid pozadí
  const grid = [];
  for (let i = 0; i < 5; i++) {
    const gy = cy - ampl * 1.8 + (ampl * 3.6 * i) / 4;
    grid.push(`<line x1="${cx}" y1="${gy}" x2="${cx + cw}" y2="${gy}" stroke="${accent}" stroke-opacity="0.07"/>`);
  }
  for (let i = 0; i < 9; i++) {
    const gx = cx + (cw * i) / 8;
    grid.push(`<line x1="${gx}" y1="${cy - ampl * 1.8}" x2="${gx}" y2="${cy + ampl * 1.8}" stroke="${accent}" stroke-opacity="0.07"/>`);
  }

  return `<g class="illu illu-pulse">
    ${grid.join('')}
    <!-- Echo (slabý dřívější pulse) -->
    <path d="${echoPath}" fill="none" stroke="${accent}" stroke-opacity="0.25" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <!-- Hlavní pulse -->
    <path class="illu-pulse-line" d="${pulsePath}"
          fill="none" stroke="${accent}" stroke-width="3.5"
          stroke-linecap="round" stroke-linejoin="round"/>
    <!-- Pulse dot na peaku -->
    <circle class="illu-pulse-peak" cx="${cx + seg * 3.3}" cy="${cy - ampl * 1.4}" r="7" fill="${accent}"/>
  </g>`;
}

// =====================================================================
//  NETWORK DOTS — digitalizace, dostupnost
// =====================================================================

function renderNetworkDots({ accent, x, y, width, height }) {
  const cx = x + width / 2;
  const cy = y + height / 2;
  const r = Math.min(width, height) * 0.42;

  // Central hub
  const hub = { x: cx, y: cy };
  // 6 nodes po obvodu
  const nodes = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2;
    nodes.push({
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    });
  }

  // Spojnice hub → nodes
  const lines = nodes.map((n, i) =>
    `<line class="illu-net-line illu-net-line-${i}" x1="${hub.x}" y1="${hub.y}" x2="${n.x}" y2="${n.y}"
           stroke="${accent}" stroke-width="2" stroke-opacity="0.5"/>`
  ).join('');

  // Volitelné cross-connections (každý druhý)
  const cross = [];
  for (let i = 0; i < 6; i++) {
    const next = (i + 2) % 6;
    cross.push(`<line x1="${nodes[i].x}" y1="${nodes[i].y}" x2="${nodes[next].x}" y2="${nodes[next].y}"
                      stroke="${INK}" stroke-width="1" stroke-opacity="0.15"/>`);
  }

  // Nodes
  const nodeSvg = nodes.map((n, i) =>
    `<circle class="illu-net-node illu-net-node-${i}" cx="${n.x}" cy="${n.y}" r="12" fill="${PAPER}" stroke="${accent}" stroke-width="3"/>`
  ).join('');

  return `<g class="illu illu-network">
    ${cross.join('')}
    ${lines}
    ${nodeSvg}
    <!-- Hub (centrální velký bod) -->
    <circle class="illu-net-hub" cx="${hub.x}" cy="${hub.y}" r="22" fill="${accent}"/>
    <circle cx="${hub.x}" cy="${hub.y}" r="10" fill="${PAPER}"/>
    <circle cx="${hub.x}" cy="${hub.y}" r="5" fill="${accent}"/>
  </g>`;
}

// =====================================================================
//  BUILDING BLOCKS — legislativa, politika (instituce)
// =====================================================================

function renderBuildingBlocks({ accent, x, y, width, height }) {
  const cx = x + width / 2;
  const baseY = y + height * 0.78;
  const blockW = Math.min(width, height) * 0.18;

  // Pyramida ze 3 řad bloků (instituce → vyhlášky → praxe)
  const rows = [
    { count: 1, w: blockW * 1.4, h: blockW * 0.6, accent: true },
    { count: 2, w: blockW, h: blockW * 0.55, accent: false },
    { count: 3, w: blockW * 0.85, h: blockW * 0.5, accent: false },
  ];

  let cy = baseY;
  let blocksSvg = '';

  for (let row = rows.length - 1; row >= 0; row--) {
    const r = rows[row];
    cy -= r.h + 4;
    const totalW = r.count * r.w + (r.count - 1) * 4;
    const startX = cx - totalW / 2;
    for (let i = 0; i < r.count; i++) {
      const bx = startX + i * (r.w + 4);
      const color = r.accent ? accent : INK;
      const op = r.accent ? 1 : 0.5 - row * 0.05;
      blocksSvg += `<rect class="illu-block illu-block-${row}-${i}"
                          x="${bx}" y="${cy}" width="${r.w}" height="${r.h}"
                          fill="${color}" fill-opacity="${op}" rx="3"/>`;
    }
  }

  // Bázová linie (země)
  blocksSvg += `<line x1="${x + 20}" y1="${baseY + 2}" x2="${x + width - 20}" y2="${baseY + 2}"
                      stroke="${INK}" stroke-width="2" stroke-opacity="0.3"/>`;

  return `<g class="illu illu-blocks">${blocksSvg}</g>`;
}

// =====================================================================
//  CIRCLE GRAPH — generic fallback (concentric)
// =====================================================================

function renderCircleGraph({ accent, x, y, width, height }) {
  const cx = x + width / 2;
  const cy = y + height / 2;
  const r = Math.min(width, height) * 0.4;

  const circles = [];
  for (let i = 0; i < 5; i++) {
    const ri = r - i * (r / 6);
    const op = 0.15 + i * 0.12;
    circles.push(`<circle class="illu-ring illu-ring-${i}" cx="${cx}" cy="${cy}" r="${ri}"
                           fill="none" stroke="${accent}" stroke-width="2" stroke-opacity="${op}"/>`);
  }
  // Central dot
  circles.push(`<circle cx="${cx}" cy="${cy}" r="8" fill="${accent}"/>`);

  return `<g class="illu illu-circles">${circles.join('')}</g>`;
}

// =====================================================================
//  ARROW TREND — populace, demografie, trendy
// =====================================================================

function renderArrowTrend({ accent, x, y, width, height }) {
  const cx = x + 30;
  const cy = y + height / 2;
  const cw = width - 60;
  const ch = height * 0.6;

  // Trend čára (rostoucí oblouk)
  const trendPath = `
    M ${cx} ${cy + ch / 2}
    Q ${cx + cw * 0.3} ${cy + ch / 2 - 10},
      ${cx + cw * 0.5} ${cy}
    T ${cx + cw} ${cy - ch / 2}`;

  // Arrow head
  const arrowSize = 18;
  const ax = cx + cw;
  const ay = cy - ch / 2;
  const arrowPath = `
    M ${ax} ${ay}
    L ${ax - arrowSize} ${ay - arrowSize / 2}
    M ${ax} ${ay}
    L ${ax - arrowSize} ${ay + arrowSize / 2}`;

  // Vertical reference lines (3 milestones)
  const ms = [];
  for (let i = 1; i <= 3; i++) {
    const mx = cx + (cw * i) / 4;
    const my = cy + ch / 2 - (ch * i) / 4;
    ms.push(`
      <line x1="${mx}" y1="${cy + ch / 2}" x2="${mx}" y2="${my}"
            stroke="${INK}" stroke-width="1" stroke-opacity="0.15" stroke-dasharray="2 3"/>
      <circle class="illu-trend-dot illu-trend-dot-${i}" cx="${mx}" cy="${my}" r="6"
              fill="${PAPER}" stroke="${accent}" stroke-width="2.5"/>`);
  }

  return `<g class="illu illu-arrow">
    <!-- Baseline -->
    <line x1="${cx}" y1="${cy + ch / 2}" x2="${cx + cw}" y2="${cy + ch / 2}"
          stroke="${INK}" stroke-width="1.5" stroke-opacity="0.3"/>
    <!-- Trend curve -->
    <path class="illu-trend-line" d="${trendPath}"
          fill="none" stroke="${accent}" stroke-width="5" stroke-linecap="round"/>
    <!-- Milestones -->
    ${ms.join('')}
    <!-- Arrow head -->
    <path class="illu-trend-arrow" d="${arrowPath}"
          fill="none" stroke="${accent}" stroke-width="5" stroke-linecap="round"/>
  </g>`;
}

function escapeXml(s) {
  return String(s ?? '').replace(/[<>&"']/g, c => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;',
  }[c]));
}
