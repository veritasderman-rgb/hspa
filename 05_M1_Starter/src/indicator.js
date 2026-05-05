// Detail jednoho indikátoru — kombinuje indicators.json + regions.json + metodickou kartu.
// Renderuje: hlavičku, hlavní hodnotu, trend, benchmark, regionální mapu krajů, tabulku, kontext.
// Žádný vlastní fetch z externích API — vše čte ze stejných JSON souborů jako index.html.

const DATA_URL = 'data/indicators.json';
const REGIONS_URL = 'data/regions.json';
const EXPLAINERS_URL = 'data/explainers.json';
const STRATEGIES_URL = 'data/strategies.json';
const CONTEXT_URL = 'data/indicator-context.json';

// ====== TILE CARTOGRAM krajů ČR ======
// 14 krajů NUTS-3 uspořádaných do 7×5 mřížky tak, aby zhruba odpovídaly geografii.
// Každý kraj = obdélníkový "kachlík" (50×40 px). Inspirace: FT, Bloomberg, Healthy Belgium.
//
// Mřížka (col, row), levý horní roh = (0, 0):
//   Severozápad (KAR/ULK/LBC) ← → Severovýchod (KHK, MSK)
//   Jih (JHC, VYS, JHM, ZLK)
const REGION_TILES = [
  { code: 'CZ042', name: 'Ústecký',         abbr: 'ULK', col: 1, row: 0 },
  { code: 'CZ051', name: 'Liberecký',       abbr: 'LBC', col: 2, row: 0 },
  { code: 'CZ052', name: 'Královéhradecký', abbr: 'KHK', col: 3, row: 0 },
  { code: 'CZ041', name: 'Karlovarský',     abbr: 'KAR', col: 0, row: 1 },
  { code: 'CZ020', name: 'Středočeský',     abbr: 'STC', col: 2, row: 1 },
  { code: 'CZ053', name: 'Pardubický',      abbr: 'PAR', col: 3, row: 1 },
  { code: 'CZ080', name: 'Moravskoslezský', abbr: 'MSK', col: 5, row: 1 },
  { code: 'CZ032', name: 'Plzeňský',        abbr: 'PLK', col: 0, row: 2 },
  { code: 'CZ010', name: 'Praha',           abbr: 'PHA', col: 2, row: 2 },
  { code: 'CZ071', name: 'Olomoucký',       abbr: 'OLK', col: 4, row: 2 },
  { code: 'CZ031', name: 'Jihočeský',       abbr: 'JHC', col: 1, row: 3 },
  { code: 'CZ063', name: 'Vysočina',        abbr: 'VYS', col: 2, row: 3 },
  { code: 'CZ064', name: 'Jihomoravský',    abbr: 'JHM', col: 3, row: 3 },
  { code: 'CZ072', name: 'Zlínský',         abbr: 'ZLK', col: 4, row: 3 },
];

const TILE_W = 78;
const TILE_H = 56;
const TILE_GAP = 4;
const MAP_PAD = 8;
const MAP_COLS = 6;
const MAP_ROWS = 4;

// ====== UTIL ======

function escapeText(s) {
  if (s == null) return '';
  return String(s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function getQueryId() {
  const params = new URLSearchParams(location.search);
  return params.get('id');
}

function showStatus(msg, level = 'warn') {
  const el = document.getElementById('status');
  el.className = `status ${level}`;
  el.textContent = msg;
  el.classList.remove('hidden');
}

const DIRECTION_LABEL = {
  higher_is_better: '↑ vyšší = lepší',
  lower_is_better: '↓ nižší = lepší',
  context_dependent: '↔ kontextové',
};

const SIGNAL_LABEL = {
  good: 'Dobré',
  warn: 'Ke sledování',
  bad: 'Kritické',
  neutral: 'Bez benchmarku',
};

function signalColor(signal) {
  return signal === 'good' ? '#38761D'
    : signal === 'warn' ? '#B45F06'
    : signal === 'bad' ? '#990000' : '#5A6770';
}

// ====== DATA LOADING ======

async function loadAll() {
  const [indicatorsRes, regionsRes, contextRes, explainersRes, strategiesRes] = await Promise.allSettled([
    fetch(DATA_URL).then(r => r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`)),
    fetch(REGIONS_URL).then(r => r.ok ? r.json() : null),
    fetch(CONTEXT_URL).then(r => r.ok ? r.json() : { contexts: {} }),
    fetch(EXPLAINERS_URL).then(r => r.ok ? r.json() : { explainers: [] }),
    fetch(STRATEGIES_URL).then(r => r.ok ? r.json() : { strategies: [] }),
  ]);
  return {
    indicators: indicatorsRes.status === 'fulfilled' ? indicatorsRes.value : null,
    regions: regionsRes.status === 'fulfilled' ? regionsRes.value : null,
    context: contextRes.status === 'fulfilled' ? contextRes.value : { contexts: {} },
    explainers: explainersRes.status === 'fulfilled' ? explainersRes.value : { explainers: [] },
    strategies: strategiesRes.status === 'fulfilled' ? strategiesRes.value : { strategies: [] },
  };
}

async function loadMethodCard(indicator) {
  if (!indicator?.method_card_url) return null;
  try {
    const res = await fetch(indicator.method_card_url);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function findRegionDataset(regions, indicatorId) {
  if (!regions?.datasets) return null;
  return regions.datasets.find(d => d.id === indicatorId) || null;
}

// ====== RENDER: hlavička + hodnota ======

function renderHero(indicator, card) {
  const arrow = yoyArrow(indicator);
  const benchHTML = renderBenchmarkRow(indicator);
  return `
    <header class="indicator-hero">
      <nav class="breadcrumb" aria-label="Drobečková navigace">
        <a href="index.html">Indikátory</a>
        <span aria-hidden="true">›</span>
        <span>${escapeText(indicator.area)}</span>
        <span aria-hidden="true">›</span>
        <span>${escapeText(indicator.domain)}</span>
        ${indicator.subdomain ? `<span aria-hidden="true">›</span><span>${escapeText(indicator.subdomain)}</span>` : ''}
      </nav>
      <h2 id="indicatorName">${escapeText(indicator.name)}</h2>
      <p class="indicator-lead">${escapeText(card?.definition ?? '—')}</p>
      <div class="hero-summary">
        <div class="hero-value">
          <span class="signal-pill ${indicator.signal}">${SIGNAL_LABEL[indicator.signal] ?? indicator.signal}</span>
          <span class="hero-bigval">${indicator.value}</span>
          <span class="hero-unit">${escapeText(indicator.unit)}</span>
          ${indicator.year ? `<span class="hero-year">${indicator.year}</span>` : ''}
          ${arrow}
        </div>
        ${benchHTML}
      </div>
    </header>
  `;
}

function yoyArrow(ind) {
  const t = ind?.trend;
  if (!Array.isArray(t) || t.length < 2) return '';
  const last = t[t.length - 1]?.value;
  const prev = t[t.length - 2]?.value;
  if (last == null || prev == null || prev === 0) return '';
  const pct = ((last - prev) / prev) * 100;
  if (Math.abs(pct) < 0.5) return `<span class="trend trend-flat" title="Stabilní">→ ${pct.toFixed(1)} %</span>`;
  const positive = pct > 0;
  const dir = ind.direction || 'context_dependent';
  let cls = 'flat';
  if (dir !== 'context_dependent') {
    const isImprovement = (dir === 'higher_is_better' && positive)
      || (dir === 'lower_is_better' && !positive);
    cls = isImprovement ? 'good' : 'bad';
  }
  return `<span class="trend trend-${cls}" title="Meziroční změna">${positive ? '↑' : '↓'} ${Math.abs(pct).toFixed(1)} %</span>`;
}

function renderBenchmarkRow(ind) {
  const cz = ind.value;
  const oecd = ind.benchmark?.oecd;
  const eu = ind.benchmark?.eu;
  const best = ind.benchmark?.oecd_best;
  if (oecd == null && eu == null && best == null) return '';
  const items = [];
  if (oecd != null) items.push(['Průměr OECD', oecd, gapPct(cz, oecd, ind.direction)]);
  if (eu != null) items.push(['Průměr EU', eu, gapPct(cz, eu, ind.direction)]);
  if (best != null) items.push(['Nejlepší v OECD', best, gapPct(cz, best, ind.direction)]);
  return `
    <div class="hero-benchmarks">
      ${items.map(([lbl, v, gap]) => `
        <div class="hero-bench">
          <span class="hero-bench-lbl">${lbl}</span>
          <span class="hero-bench-val">${v} ${escapeText(ind.unit)}</span>
          ${gap ? `<span class="hero-bench-gap ${gap.cls}">${gap.txt}</span>` : ''}
        </div>
      `).join('')}
    </div>
  `;
}

function gapPct(cz, ref, direction) {
  if (cz == null || ref == null || ref === 0) return null;
  const diff = ((cz - ref) / ref) * 100;
  let cls = 'flat';
  if (direction === 'higher_is_better') cls = diff > 0 ? 'good' : 'bad';
  else if (direction === 'lower_is_better') cls = diff < 0 ? 'good' : 'bad';
  const arrow = diff > 0 ? '+' : '';
  return { cls, txt: `ČR ${arrow}${diff.toFixed(1)} %` };
}

// ====== RENDER: trend chart ======

function renderTrendSection(indicator) {
  if (!Array.isArray(indicator.trend) || indicator.trend.length < 2) return '';
  return `
    <section class="detail-section">
      <h3>Vývoj v čase</h3>
      <p class="section-desc">${indicator.trend.length} hodnot, obdobie ${indicator.trend[0].year}–${indicator.trend[indicator.trend.length - 1].year}. Plné body = roční hodnoty ČR; přerušované linie = průměry OECD a EU (pokud jsou k dispozici).</p>
      <div class="trend-chart-wrap"><canvas id="trendCanvas" aria-label="Časová řada indikátoru"></canvas></div>
    </section>
  `;
}

function paintTrendChart(indicator) {
  const canvas = document.getElementById('trendCanvas');
  if (!canvas) return;
  const trend = indicator.trend || [];
  const labels = trend.map(t => t.year);
  const color = signalColor(indicator.signal);
  const datasets = [{
    label: 'ČR',
    data: trend.map(t => t.value),
    borderColor: color, backgroundColor: color + '22',
    fill: true, tension: 0.3, pointRadius: 4, pointHoverRadius: 6, borderWidth: 2.5,
  }];
  if (indicator.benchmark?.oecd != null) {
    datasets.push({
      label: 'OECD průměr',
      data: labels.map(() => indicator.benchmark.oecd),
      borderColor: '#4A90D9', backgroundColor: 'transparent',
      borderDash: [6, 3], borderWidth: 1.5, pointRadius: 0, fill: false,
    });
  }
  if (indicator.benchmark?.eu != null) {
    datasets.push({
      label: 'EU průměr',
      data: labels.map(() => indicator.benchmark.eu),
      borderColor: '#E69138', backgroundColor: 'transparent',
      borderDash: [3, 3], borderWidth: 1.5, pointRadius: 0, fill: false,
    });
  }
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // eslint-disable-next-line no-undef
  new Chart(canvas, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      animation: reduced ? { duration: 0 } : { duration: 500 },
      plugins: {
        legend: { display: datasets.length > 1, position: 'top', labels: { font: { size: 12 }, boxWidth: 16 } },
        tooltip: { displayColors: true },
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 11 } } },
        y: {
          grid: { color: '#EDF2F7' },
          ticks: { font: { size: 11 }, maxTicksLimit: 6 },
          title: { display: true, text: indicator.unit, font: { size: 11 } },
        },
      },
    },
  });
}

// ====== RENDER: regionální mapa + tabulka ======

function renderRegionsSection(dataset, indicator) {
  if (!dataset) {
    return `
      <section class="detail-section">
        <h3>Regionální rozpad po krajích</h3>
        <p class="empty-state">
          Pro tento indikátor zatím nemáme k dispozici regionální data po krajích NUTS-3.
          ÚZIS ani ČSÚ ho nepublikují v krajském členění, nebo by velikost vzorku v jednotlivém kraji byla pod prahem statistické spolehlivosti.
        </p>
      </section>
    `;
  }
  const direction = dataset.direction || indicator.direction || 'higher_is_better';
  return `
    <section class="detail-section regions-detail-section">
      <h3>Regionální rozpad po krajích</h3>
      <p class="section-desc">
        14 krajů NUTS-3 ČR. Průměr ČR <strong>${dataset.country_avg} ${escapeText(dataset.unit)}</strong> (${dataset.year}).
        Barva ukazuje vzdálenost od průměru — zelená = lepší než celostátní průměr, červená = horší.
        ${dataset._note ? `<br><em>${escapeText(dataset._note)}</em>` : ''}
      </p>
      <div class="regions-map-wrap">
        <div class="regions-map" id="regionsMap" role="img" aria-label="Mapa krajů s hodnotou indikátoru po krajích">
          ${renderTileMap(dataset, direction)}
        </div>
        <div class="regions-map-legend">
          <span class="legend-title">Vůči průměru ČR (${dataset.country_avg} ${escapeText(dataset.unit)})</span>
          <div class="legend-scale">
            <span class="legend-step legend-step-bad"></span>
            <span class="legend-step legend-step-warn"></span>
            <span class="legend-step legend-step-mid"></span>
            <span class="legend-step legend-step-warn-better"></span>
            <span class="legend-step legend-step-good"></span>
          </div>
          <div class="legend-labels">
            <span>${direction === 'lower_is_better' ? 'horší (vyšší)' : 'horší (nižší)'}</span>
            <span>průměr</span>
            <span>${direction === 'lower_is_better' ? 'lepší (nižší)' : 'lepší (vyšší)'}</span>
          </div>
          <p class="legend-note">
            Tile-cartogram: každý kraj je jeden kachlík v přibližné geografické pozici. Volba zjednodušené geometrie je záměrná — chrání před optickou dezinterpretací malých krajů (Liberecký, Karlovarský) v choropletní mapě a kompenzuje je vizuálně stejnou plochou.
          </p>
        </div>
      </div>
      <div class="regions-table-wrap detail-table-wrap">
        ${renderRegionsTable(dataset, direction)}
      </div>
    </section>
  `;
}

function colorForRegion(value, avg, direction) {
  if (avg === 0 || value == null) return '#CBD5E0';
  const diff = ((value - avg) / Math.abs(avg)) * 100;
  // diff > 0 = vyšší než průměr; "lepší" závisí na direction
  const better = direction === 'lower_is_better' ? -diff : diff;
  // -8 % a horší = bad, -2 až -8 = warn, -2 až 2 = neutral, 2 až 8 = warn-good, > 8 = good
  if (better < -8) return '#990000';
  if (better < -2) return '#B45F06';
  if (better < 2) return '#94A3B8';
  if (better < 8) return '#7EA53A';
  return '#38761D';
}

function renderTileMap(dataset, direction) {
  const w = MAP_COLS * (TILE_W + TILE_GAP) + MAP_PAD * 2;
  const h = MAP_ROWS * (TILE_H + TILE_GAP) + MAP_PAD * 2;
  const byCode = new Map(dataset.regions.map(r => [r.code, r]));
  const tiles = REGION_TILES.map(t => {
    const r = byCode.get(t.code);
    const value = r?.value;
    const fill = value != null ? colorForRegion(value, dataset.country_avg, direction) : '#E2E8F0';
    const x = MAP_PAD + t.col * (TILE_W + TILE_GAP);
    const y = MAP_PAD + t.row * (TILE_H + TILE_GAP);
    const valueLabel = value != null ? formatValue(value) : '—';
    const fmtUnit = dataset.unit;
    const title = `${t.name}: ${valueLabel} ${fmtUnit}`;
    const textColor = '#FFFFFF';
    return `
      <g class="tile" data-code="${t.code}" tabindex="0" role="button" aria-label="${escapeText(title)}">
        <title>${escapeText(title)}</title>
        <rect x="${x}" y="${y}" width="${TILE_W}" height="${TILE_H}" rx="6" ry="6"
              fill="${fill}" stroke="rgba(0,0,0,0.18)" stroke-width="1"></rect>
        <text x="${x + TILE_W / 2}" y="${y + 18}" text-anchor="middle"
              fill="${textColor}" font-size="11" font-weight="700"
              style="text-shadow: 0 1px 2px rgba(0,0,0,0.4)">${escapeText(t.abbr)}</text>
        <text x="${x + TILE_W / 2}" y="${y + 38}" text-anchor="middle"
              fill="${textColor}" font-size="14" font-weight="700"
              style="text-shadow: 0 1px 2px rgba(0,0,0,0.4)">${escapeText(valueLabel)}</text>
      </g>
    `;
  }).join('');
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet" class="tile-map">${tiles}</svg>`;
}

function formatValue(v) {
  if (v == null) return '—';
  if (Math.abs(v) >= 100) return Math.round(v).toString();
  if (Math.abs(v) >= 10) return v.toFixed(1);
  return v.toFixed(1);
}

function renderRegionsTable(dataset, direction) {
  const better = direction !== 'lower_is_better';
  const sorted = [...dataset.regions].sort((a, b) => better ? b.value - a.value : a.value - b.value);
  const rows = sorted.map(r => {
    const diff = (r.value - dataset.country_avg).toFixed(1);
    const isBetter = better ? r.value > dataset.country_avg : r.value < dataset.country_avg;
    const cls = r.value === dataset.country_avg ? '' : (isBetter ? 'pos' : 'neg');
    return `<tr>
      <td>${escapeText(r.name)}</td>
      <td>${formatValue(r.value)}</td>
      <td class="diff ${cls}">${diff > 0 ? '+' : ''}${diff}</td>
    </tr>`;
  }).join('');
  return `
    <table class="regions-table" aria-label="Hodnoty po krajích">
      <thead><tr>
        <th>Kraj</th>
        <th>${escapeText(dataset.name)} (${escapeText(dataset.unit)})</th>
        <th>Δ od průměru ČR</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

// ====== RENDER: kontext (co ovlivňuje + proč na něm záleží) ======

function renderContextSection(indicator, context) {
  const ctx = context?.contexts?.[indicator.id] || {};
  const why = ctx.why_matters || ctx.why || defaultWhy(indicator);
  const drivers = ctx.drivers || defaultDrivers(indicator);
  const policy = ctx.policy || null;
  const moreReading = ctx.more_reading || [];
  return `
    <section class="detail-section">
      <h3>Co indikátor ovlivňuje</h3>
      <div class="ctx-grid">
        <div class="ctx-block">
          <h4>Proč na něm záleží</h4>
          <p>${why}</p>
        </div>
        <div class="ctx-block">
          <h4>Hlavní determinanty</h4>
          <ul class="ctx-list">
            ${drivers.map(d => `<li><strong>${escapeText(d.label)}</strong>${d.text ? ' — ' + escapeText(d.text) : ''}</li>`).join('')}
          </ul>
        </div>
        ${policy ? `<div class="ctx-block ctx-block-wide"><h4>Politiky a aktéři</h4><p>${policy}</p></div>` : ''}
      </div>
      ${moreReading.length ? `
        <div class="ctx-reading">
          <h4>Další zdroje</h4>
          <ul>${moreReading.map(r => `<li><a href="${escapeText(r.url)}" target="_blank" rel="noopener">${escapeText(r.title)}</a>${r.note ? ' — ' + escapeText(r.note) : ''}</li>`).join('')}</ul>
        </div>` : ''}
    </section>
  `;
}

function defaultWhy(indicator) {
  return `Indikátor patří do oblasti <strong>${escapeText(indicator.area)}</strong> a domény <strong>${escapeText(indicator.domain)}</strong>. Sleduje se v rámci HSPA jako jeden z měřitelných výstupů zdravotního systému; mezinárodní benchmark (OECD/EU) umožňuje srovnání s ostatními evropskými systémy.`;
}

function defaultDrivers(indicator) {
  // Generická záloha pokud nemáme kontextový záznam
  if (indicator.area === 'Výsledky') return [
    { label: 'Životní styl populace', text: 'kuřáctví, alkohol, výživa, pohyb.' },
    { label: 'Sociální determinanty zdraví', text: 'vzdělání, příjem, zaměstnanost, bydlení.' },
    { label: 'Kvalita zdravotní péče', text: 'účinnost, bezpečnost, koordinace, návaznost.' },
  ];
  if (indicator.area === 'Procesy') return [
    { label: 'Klinické postupy a doporučené postupy', text: 'rychlost adopce best-practice, lokální variabilita.' },
    { label: 'Organizace péče', text: 'multidisciplinární týmy, návaznost mezi primární a specializovanou péčí.' },
    { label: 'Motivace plátce', text: 'výkonové vs. paušální úhrady, bonifikace za kvalitu (P4P).' },
  ];
  if (indicator.area === 'Výstupy') return [
    { label: 'Geografická dostupnost', text: 'síť poskytovatelů, dojezdová doba, místní dostupnost.' },
    { label: 'Časová dostupnost', text: 'čekací doby, ordinační hodiny, pohotovost.' },
    { label: 'Finanční dostupnost', text: 'míra spoluúčasti pacienta, doplatky.' },
  ];
  return [
    { label: 'Kapacita systému', text: 'počet pracovníků, lůžek, přístrojů.' },
    { label: 'Financování', text: 'rozpočet v.z.p., úhradová vyhláška, alokace investic.' },
    { label: 'Lidské zdroje', text: 'počet absolventů, věková struktura, geografická distribuce.' },
  ];
}

// ====== RENDER: metoda + zdroj + crosslink ======

function renderMethodSection(indicator, card) {
  if (!card) return '';
  return `
    <section class="detail-section">
      <h3>Metodika a zdroj dat</h3>
      <dl class="method-dl">
        ${card.definition ? `<dt>Definice</dt><dd>${escapeText(card.definition)}</dd>` : ''}
        <dt>Jednotka</dt><dd>${escapeText(card.unit ?? indicator.unit)}</dd>
        <dt>Směr</dt><dd>${DIRECTION_LABEL[card.direction] ?? card.direction ?? '—'}</dd>
        <dt>Frekvence</dt><dd>${escapeText(card.frequency ?? '—')}</dd>
        <dt>Garanti dat</dt><dd>${escapeText((card.stewards || []).join(', ') || '—')}</dd>
        ${card.signal_thresholds ? `<dt>Prahy signálu</dt><dd>good ≥ +${card.signal_thresholds.good} % vs benchmark, warn nad −${card.signal_thresholds.warn} %</dd>` : ''}
        ${card.method_notes ? `<dt>Metodika</dt><dd>${escapeText(card.method_notes)}</dd>` : ''}
        ${card.limitations ? `<dt>Omezení</dt><dd>${escapeText(card.limitations)}</dd>` : ''}
      </dl>
      ${card.data_source ? `<div class="ds-source-block">${renderDataSource(card.data_source)}</div>` : ''}
    </section>
  `;
}

function renderDataSource(ds) {
  if (!ds || typeof ds !== 'object') return '';
  const parts = [];
  if (ds.primary) parts.push(`<div class="ds-block"><h4>Primární zdroj</h4>${renderSourceObj(ds.primary)}</div>`);
  if (ds.fallback) parts.push(`<div class="ds-block"><h4>Záložní zdroj</h4>${renderSourceObj(ds.fallback)}</div>`);
  return parts.join('');
}

function renderSourceObj(o) {
  const pairs = Object.entries(o).filter(([k]) => k !== 'note' && k !== '_note');
  const note = o.note || o._note;
  const tableHTML = pairs.length
    ? `<table class="ds-table">${pairs.map(([k, v]) =>
        `<tr><th>${escapeText(k)}</th><td>${escapeText(typeof v === 'object' ? JSON.stringify(v) : String(v))}</td></tr>`
      ).join('')}</table>`
    : '';
  return tableHTML + (note ? `<p class="ds-note">${escapeText(note)}</p>` : '');
}

function renderCrossLinks(indicator, explainers, strategies) {
  const linkedExplainers = (explainers?.explainers || []).filter(e =>
    (e.linked_indicators || []).includes(indicator.id));
  const linkedStrategies = (strategies?.strategies || []).filter(s =>
    (s.linked_indicators || []).includes(indicator.id));
  if (!linkedExplainers.length && !linkedStrategies.length) return '';
  return `
    <section class="detail-section">
      <h3>Související obsah</h3>
      ${linkedStrategies.length ? `
        <h4 class="ds-heading">Strategie</h4>
        <div class="chip-row">
          ${linkedStrategies.map(s => `<a class="chip chip-strategy" href="strategie.html?id=${encodeURIComponent(s.id)}">${escapeText(s.title)}</a>`).join('')}
        </div>` : ''}
      ${linkedExplainers.length ? `
        <h4 class="ds-heading" style="margin-top:14px">Vysvětlení v "Jak to funguje"</h4>
        <div class="chip-row">
          ${linkedExplainers.map(e => `<a class="chip chip-explainer" href="jak-funguje.html?id=${encodeURIComponent(e.id)}">${escapeText(e.title)}</a>`).join('')}
        </div>` : ''}
    </section>
  `;
}

// ====== INIT ======

(async () => {
  if (typeof window === 'undefined') return;
  const id = getQueryId();
  const detail = document.getElementById('detail');
  if (!id) {
    detail.innerHTML = `
      <div class="empty-state">
        Stránka detailu očekává parametr <code>?id=…</code> v URL.
        <a href="index.html">Zpět na přehled</a>.
      </div>`;
    return;
  }

  let bundle;
  try {
    bundle = await loadAll();
  } catch (err) {
    detail.innerHTML = `<div class="empty-state">Nepodařilo se načíst data: ${escapeText(err.message || err)}.</div>`;
    return;
  }
  const indicator = bundle.indicators?.indicators?.find(i => i.id === id);
  if (!indicator) {
    detail.innerHTML = `
      <div class="empty-state">
        Indikátor <code>${escapeText(id)}</code> nebyl nalezen.
        <a href="index.html">Zpět na přehled</a>.
      </div>`;
    return;
  }

  document.getElementById('pageTitle').textContent = `${indicator.name} · Zdravé Česko`;
  const card = await loadMethodCard(indicator);
  const dataset = findRegionDataset(bundle.regions, indicator.id);

  detail.innerHTML = `
    ${renderHero(indicator, card)}
    ${renderTrendSection(indicator)}
    ${renderRegionsSection(dataset, indicator)}
    ${renderContextSection(indicator, bundle.context)}
    ${renderMethodSection(indicator, card)}
    ${renderCrossLinks(indicator, bundle.explainers, bundle.strategies)}
  `;

  paintTrendChart(indicator);
})();
