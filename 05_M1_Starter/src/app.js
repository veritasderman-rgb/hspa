// Frontend logika dashboardu Zdravé Česko.
// Načítá data z /data/indicators.json a renderuje karty + scorecard + regiony.
// Žádné inline data — jediný zdroj pravdy je JSON file.

const DATA_URL = 'data/indicators.json';
const REGIONS_URL = 'data/regions.json';
const LS_KEY = 'zdrave-cesko/last-data';
const LS_FETCHED_KEY = 'zdrave-cesko/last-fetched-at';
const LS_THEME_KEY = 'zdrave-cesko/theme';
const STALE_HOURS = 26;

let allIndicators = [];
let activeArea = 'all';
let activeSearch = '';
let activeSort = 'default';
const chartInstances = new Map(); // id → Chart instance, kvůli destroy() proti memory leaku
let regionsChart = null;

// ====== UTIL ======

function fmtRelative(iso) {
  const d = new Date(iso);
  const now = new Date();
  const diffH = (now - d) / 3.6e6;
  if (diffH < 1) return 'před chvílí';
  if (diffH < 24) return `před ${Math.floor(diffH)} h`;
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function showStatus(msg, level = 'warn') {
  const el = document.getElementById('status');
  el.className = `status ${level}`;
  el.textContent = msg;
  el.classList.remove('hidden');
}
function clearStatus() {
  document.getElementById('status').classList.add('hidden');
}

function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

// ====== DATA LOADING ======

function applyData(data, { stale = false, source = 'live' } = {}) {
  allIndicators = data.indicators || [];
  const ageH = (Date.now() - new Date(data.generated_at).getTime()) / 3.6e6;
  const isStale = stale || ageH > STALE_HOURS;
  const label = source === 'cache'
    ? `Offline kopie · ${fmtRelative(data.generated_at)}`
    : `Aktualizováno ${fmtRelative(data.generated_at)}`;
  const el = document.getElementById('lastUpdated');
  el.textContent = label;
  el.classList.toggle('stale', isStale);
}

function saveToLocalStorage(data) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(data));
    localStorage.setItem(LS_FETCHED_KEY, new Date().toISOString());
  } catch { /* quota / private mode — ignoruj */ }
}

function loadFromLocalStorage() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

async function loadData(bustCache = false) {
  const url = bustCache ? `${DATA_URL}?t=${Date.now()}` : DATA_URL;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    applyData(data, { source: 'live' });
    saveToLocalStorage(data);
    clearStatus();
    return data;
  } catch (err) {
    const cached = loadFromLocalStorage();
    if (cached) {
      applyData(cached, { stale: true, source: 'cache' });
      showStatus(`Server nedostupný (${err.message}). Zobrazuji offline kopii z prohlížeče.`, 'warn');
      return cached;
    }
    showStatus(`Nepodařilo se načíst data: ${err.message}. Žádná offline kopie není k dispozici.`, 'error');
    throw err;
  }
}

// ====== FILTERING / SORTING ======

const SIGNAL_ORDER = { bad: 0, warn: 1, neutral: 2, good: 3 };

export function filterAndSort(indicators, { area, search, sort }) {
  let xs = indicators;
  if (area && area !== 'all') xs = xs.filter(i => i.area === area);
  if (search) {
    const q = search.toLowerCase();
    xs = xs.filter(i =>
      (i.name || '').toLowerCase().includes(q)
      || (i.domain || '').toLowerCase().includes(q)
      || (i.subdomain || '').toLowerCase().includes(q)
    );
  }
  if (sort === 'signal') {
    xs = [...xs].sort((a, b) => (SIGNAL_ORDER[a.signal] ?? 9) - (SIGNAL_ORDER[b.signal] ?? 9));
  } else if (sort === 'name') {
    xs = [...xs].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'cs'));
  } else if (sort === 'trend') {
    xs = [...xs].sort((a, b) => Math.abs(yoyPct(b)) - Math.abs(yoyPct(a)));
  }
  return xs;
}

// ====== TREND ARROWS ======

export function yoyPct(ind) {
  const t = ind?.trend;
  if (!Array.isArray(t) || t.length < 2) return 0;
  const last = t[t.length - 1]?.value;
  const prev = t[t.length - 2]?.value;
  if (last == null || prev == null || prev === 0) return 0;
  return ((last - prev) / prev) * 100;
}

export function trendArrow(ind) {
  const pct = yoyPct(ind);
  if (Math.abs(pct) < 0.5) return { glyph: '→', cls: 'flat', pct };
  const positive = pct > 0;
  // higher_is_better → růst je dobrý (zelená); lower_is_better → růst je špatný (červená)
  const indicatorDir = (ind?.direction
    ?? (ind?._direction)
    ?? 'context_dependent');
  let cls;
  if (indicatorDir === 'context_dependent') cls = 'flat';
  else {
    const isImprovement = (indicatorDir === 'higher_is_better' && positive)
      || (indicatorDir === 'lower_is_better' && !positive);
    cls = isImprovement ? 'good' : 'bad';
  }
  return { glyph: positive ? '↑' : '↓', cls, pct };
}

// ====== SCORECARD ======

function updateScorecard(visible) {
  const counts = { good: 0, warn: 0, bad: 0, neutral: 0 };
  for (const ind of visible) counts[ind.signal] = (counts[ind.signal] || 0) + 1;
  document.getElementById('scTotal').textContent = visible.length;
  document.getElementById('scGood').textContent = counts.good;
  document.getElementById('scWarn').textContent = counts.warn;
  document.getElementById('scBad').textContent = counts.bad;
  document.getElementById('scNeutral').textContent = counts.neutral;
}

// ====== RENDERING ======

function destroyAllCharts() {
  for (const ch of chartInstances.values()) ch.destroy();
  chartInstances.clear();
}

function renderGrid() {
  const grid = document.getElementById('indicatorGrid');
  destroyAllCharts();
  grid.innerHTML = '';
  const filtered = filterAndSort(allIndicators, { area: activeArea, search: activeSearch, sort: activeSort });

  document.getElementById('gridBadge').textContent =
    `${filtered.length} indikátor${filtered.length === 1 ? '' : (filtered.length < 5 ? 'y' : 'ů')}`;
  document.getElementById('gridTitle').textContent =
    activeArea === 'all' ? 'Všechny indikátory' : `Oblast: ${activeArea}`;
  document.getElementById('emptyState').classList.toggle('hidden', filtered.length > 0);

  updateScorecard(filtered);

  const charts = [];
  filtered.forEach((ind) => {
    const card = document.createElement('div');
    card.className = 'indicator-card';
    card.dataset.indicatorId = ind.id;
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `${ind.name}: ${ind.value} ${ind.unit}, signál ${ind.signal}`);

    const chartId = `chart-${ind.id}`;
    const benchmark = ind.benchmark?.oecd ?? ind.benchmark?.eu ?? null;
    const compareHTML = benchmark != null
      ? `<div class="compare">vs. OECD průměr: <strong>${benchmark}${ind.unit ? ' ' + ind.unit : ''}</strong></div>`
      : '';

    const arrow = trendArrow(ind);
    const arrowHTML = arrow.glyph === '→'
      ? `<span class="trend trend-${arrow.cls}" title="Stabilní">→</span>`
      : `<span class="trend trend-${arrow.cls}" title="Meziroční změna">${arrow.glyph} ${Math.abs(arrow.pct).toFixed(1)} %</span>`;

    card.innerHTML = `
      <div class="area-tag">${ind.area} · ${ind.domain}</div>
      <div class="top">
        <h4>${ind.name}</h4>
        <div class="signal ${ind.signal}" title="Hodnocení: ${ind.signal}"></div>
      </div>
      <div class="value-row">
        <span class="big-value">${ind.value}</span>
        <span class="unit">${ind.unit}</span>
        ${arrowHTML}
        ${ind.year ? `<span class="year-badge">${ind.year}</span>` : ''}
      </div>
      ${compareHTML}
      <div class="chart-wrap"><canvas id="${chartId}"></canvas></div>
      <div class="source">Zdroj: ${ind.source.name}</div>
    `;
    card.addEventListener('click', () => openMethodCard(ind));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openMethodCard(ind); }
    });
    grid.appendChild(card);

    if (Array.isArray(ind.trend) && ind.trend.length) charts.push({ ind, chartId });
  });

  // Render sparkliny po vložení do DOM
  setTimeout(() => {
    charts.forEach(({ ind, chartId }) => {
      const ctx = document.getElementById(chartId);
      if (!ctx) return;
      const color = ind.signal === 'good' ? '#38761D'
        : ind.signal === 'warn' ? '#B45F06'
        : ind.signal === 'bad' ? '#990000' : '#0B5394';
      // eslint-disable-next-line no-undef
      const ch = new Chart(ctx, {
        type: 'line',
        data: {
          labels: ind.trend.map(t => t.year),
          datasets: [{
            data: ind.trend.map(t => t.value),
            borderColor: color, backgroundColor: color + '22',
            fill: true, tension: 0.3,
            pointRadius: 2, pointHoverRadius: 4, borderWidth: 2,
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { displayColors: false } },
          scales: {
            x: { grid: { display: false }, ticks: { font: { size: 9 }, color: '#888' } },
            y: { grid: { display: false }, ticks: { font: { size: 9 }, color: '#888', maxTicksLimit: 3 } }
          }
        }
      });
      chartInstances.set(chartId, ch);
    });
  }, 50);
}

// ====== REGIONS ======

let regionsData = null;
let activeRegionDataset = null;

async function loadAndRenderRegions() {
  try {
    const res = await fetch(REGIONS_URL);
    if (!res.ok) return;
    const data = await res.json();

    // Podpora obou formátů: v1 (single dataset) i v2 (multi-dataset)
    if (data.datasets) {
      regionsData = data;
      populateRegionSelector(data.datasets);
      renderRegionDataset(data.datasets[0]);
    } else {
      // Legacy v1
      renderRegionsLegacy(data);
    }
  } catch { /* regiony jsou volitelné — bez nich dashboard funguje */ }
}

function populateRegionSelector(datasets) {
  const sel = document.getElementById('regionsSelect');
  if (!sel) return;
  sel.innerHTML = '';
  datasets.forEach((ds, i) => {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = ds.name;
    sel.appendChild(opt);
  });
  sel.addEventListener('change', () => {
    const ds = regionsData.datasets[parseInt(sel.value, 10)];
    if (ds) renderRegionDataset(ds);
  });
}

function renderRegionDataset(ds) {
  activeRegionDataset = ds;
  document.getElementById('regionsBadge').textContent =
    `${ds.regions.length} krajů · průměr ČR ${ds.country_avg} ${ds.unit} (${ds.year})`;

  const header = document.getElementById('regionsTableValueHeader');
  if (header) header.textContent = `${ds.name} (${ds.unit})`;

  const tbody = document.querySelector('#regionsTable tbody');
  tbody.innerHTML = '';
  const betterHigher = ds.direction !== 'lower_is_better';
  const sorted = [...ds.regions].sort((a, b) => betterHigher ? b.value - a.value : a.value - b.value);

  for (const r of sorted) {
    const diff = (r.value - ds.country_avg).toFixed(1);
    const diffCls = (betterHigher ? diff > 0 : diff < 0) ? 'pos' : diff == 0 ? '' : 'neg';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${r.name}</td>
      <td>${r.value.toFixed(r.value < 100 ? 1 : 0)}</td>
      <td class="diff ${diffCls}">${diff > 0 ? '+' : ''}${diff}</td>
    `;
    tbody.appendChild(tr);
  }

  const ctx = document.getElementById('regionsChart');
  if (!ctx) return;
  if (regionsChart) regionsChart.destroy();
  // eslint-disable-next-line no-undef
  regionsChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: sorted.map(r => r.name),
      datasets: [{
        data: sorted.map(r => r.value),
        backgroundColor: sorted.map(r => {
          const aboveAvg = r.value >= ds.country_avg;
          const isGood = betterHigher ? aboveAvg : !aboveAvg;
          return isGood ? '#38761D' : '#B45F06';
        }),
        borderWidth: 0,
      }],
    },
    options: {
      indexAxis: 'y',
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (c) => `${c.parsed.x.toFixed(c.parsed.x < 100 ? 1 : 0)} ${ds.unit}` } },
      },
      scales: {
        x: {
          min: Math.min(...sorted.map(r => r.value)) * (betterHigher ? 0.97 : 0.97),
          max: Math.max(...sorted.map(r => r.value)) * 1.03,
        },
        y: { ticks: { font: { size: 11 } } },
      },
    },
  });
}

function renderRegionsLegacy(data) {
  document.getElementById('regionsBadge').textContent =
    `${data.regions.length} krajů · průměr ČR ${data.country_avg} let`;
  const tbody = document.querySelector('#regionsTable tbody');
  tbody.innerHTML = '';
  const sorted = [...data.regions].sort((a, b) => b.value - a.value);
  for (const r of sorted) {
    const diff = (r.value - data.country_avg).toFixed(1);
    const diffCls = diff > 0 ? 'pos' : diff < 0 ? 'neg' : '';
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${r.name}</td><td>${r.value.toFixed(1)}</td>
      <td class="diff ${diffCls}">${diff > 0 ? '+' : ''}${diff}</td>`;
    tbody.appendChild(tr);
  }
  const ctx = document.getElementById('regionsChart');
  if (!ctx) return;
  if (regionsChart) regionsChart.destroy();
  // eslint-disable-next-line no-undef
  regionsChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: sorted.map(r => r.name),
      datasets: [{ data: sorted.map(r => r.value),
        backgroundColor: sorted.map(r => r.value >= data.country_avg ? '#38761D' : '#B45F06'),
        borderWidth: 0 }],
    },
    options: {
      indexAxis: 'y', responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { x: { min: Math.min(...sorted.map(r=>r.value))-1, max: Math.max(...sorted.map(r=>r.value))+1 },
                y: { ticks: { font: { size: 11 } } } },
    },
  });
}

// ====== CSV EXPORT ======

function csvEscape(v) {
  const s = String(v ?? '');
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function exportVisibleCsv() {
  const visible = filterAndSort(allIndicators, { area: activeArea, search: activeSearch, sort: activeSort });
  const header = ['id', 'name', 'area', 'domain', 'subdomain', 'value', 'unit', 'year', 'signal', 'oecd', 'eu', 'source'];
  const rows = visible.map(i => [
    i.id, i.name, i.area, i.domain, i.subdomain, i.value, i.unit, i.year, i.signal,
    i.benchmark?.oecd ?? '', i.benchmark?.eu ?? '', i.source?.name ?? '',
  ]);
  const csv = '﻿' + [header, ...rows].map(r => r.map(csvEscape).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `zdrave_cesko_indikatory_${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportTrendCsv(indicator) {
  const rows = [['year', 'value', 'unit']];
  for (const t of indicator.trend ?? []) rows.push([t.year, t.value, indicator.unit]);
  const csv = '﻿' + rows.map(r => r.map(csvEscape).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${indicator.id}_trend.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ====== METODICKÁ KARTA (modal) ======

const DIRECTION_LABEL = {
  higher_is_better: '↑ vyšší = lepší',
  lower_is_better: '↓ nižší = lepší',
  context_dependent: '↔ kontextové',
};

function renderDataSource(ds) {
  if (!ds || typeof ds !== 'object') return '<em>Neuvedeno</em>';
  const parts = [];
  if (ds.primary) parts.push(`<div class="ds-block"><h4>Primární</h4>${renderSourceObj(ds.primary)}</div>`);
  if (ds.fallback) parts.push(`<div class="ds-block"><h4>Záložní</h4>${renderSourceObj(ds.fallback)}</div>`);
  return parts.join('') || '<em>Neuvedeno</em>';
}

function renderSourceObj(o) {
  const pairs = Object.entries(o).filter(([k]) => k !== 'note');
  const noteHTML = o.note ? `<p class="ds-note">${o.note}</p>` : '';
  const tableHTML = pairs.length
    ? `<table class="ds-table">${pairs.map(([k, v]) =>
        `<tr><th>${k}</th><td>${typeof v === 'object' ? JSON.stringify(v) : String(v)}</td></tr>`
      ).join('')}</table>`
    : '';
  return tableHTML + noteHTML;
}

function renderModalContent(card, indicator) {
  return `
    <h2>${card.name}</h2>
    <div class="sub">${card.area} · ${card.domain}${card.subdomain ? ' · ' + card.subdomain : ''}</div>
    <div class="modal-summary">
      <span class="signal-pill ${indicator.signal}">${indicator.signal}</span>
      <span><strong>${indicator.value}</strong> ${indicator.unit} (${indicator.year ?? '?'})</span>
      ${indicator.benchmark?.oecd != null ? `<span>OECD: <strong>${indicator.benchmark.oecd}</strong></span>` : ''}
      ${indicator.benchmark?.eu != null ? `<span>EU: <strong>${indicator.benchmark.eu}</strong></span>` : ''}
    </div>
    <dl>
      <dt>Definice</dt><dd>${card.definition ?? '—'}</dd>
      <dt>Jednotka</dt><dd>${card.unit ?? indicator.unit}</dd>
      <dt>Směr</dt><dd>${DIRECTION_LABEL[card.direction] ?? card.direction ?? '—'}</dd>
      <dt>Frekvence</dt><dd>${card.frequency ?? '—'}</dd>
      <dt>Garanti</dt><dd>${(card.stewards || []).join(', ') || '—'}</dd>
      ${card.signal_thresholds ? `<dt>Prahy signálu</dt><dd>good ≥ ${card.signal_thresholds.good} %, warn nad −${card.signal_thresholds.warn} %</dd>` : ''}
      ${card.method_notes ? `<dt>Metodika</dt><dd>${card.method_notes}</dd>` : ''}
      ${card.limitations ? `<dt>Omezení</dt><dd>${card.limitations}</dd>` : ''}
    </dl>
    ${card.data_source ? `<h3 class="ds-heading">Zdroje dat</h3>${renderDataSource(card.data_source)}` : ''}
    <div class="modal-cross-links" id="modalCrossLinks"></div>
    <div class="modal-actions">
      <button class="btn-csv" id="btnCsvExport" data-id="${indicator.id}">Stáhnout CSV (trend)</button>
    </div>
  `;
}

// Cross-link cache pro modal
let _crossLinksCache = null;
async function loadCrossLinks() {
  if (_crossLinksCache) return _crossLinksCache;
  try {
    const [s, e] = await Promise.all([
      fetch('data/strategies.json').then(r => r.ok ? r.json() : { strategies: [] }).catch(() => ({ strategies: [] })),
      fetch('data/explainers.json').then(r => r.ok ? r.json() : { explainers: [] }).catch(() => ({ explainers: [] })),
    ]);
    _crossLinksCache = { strategies: s.strategies ?? [], explainers: e.explainers ?? [] };
  } catch {
    _crossLinksCache = { strategies: [], explainers: [] };
  }
  return _crossLinksCache;
}

async function renderModalCrossLinks(indicatorId) {
  const target = document.getElementById('modalCrossLinks');
  if (!target) return;
  const { strategies, explainers } = await loadCrossLinks();
  const linkedStrategies = strategies.filter(s => (s.linked_indicators ?? []).includes(indicatorId));
  const linkedExplainers = explainers.filter(e => (e.linked_indicators ?? []).includes(indicatorId));
  if (!linkedStrategies.length && !linkedExplainers.length) return;

  let html = '';
  if (linkedStrategies.length) {
    html += `<h3 class="ds-heading">Souvisí se strategiemi</h3><div class="chip-row">`;
    html += linkedStrategies.slice(0, 6).map(s =>
      `<a class="chip chip-strategy" href="strategie.html?id=${encodeURIComponent(s.id)}">${escapeText(s.title)}</a>`
    ).join('');
    html += `</div>`;
  }
  if (linkedExplainers.length) {
    html += `<h3 class="ds-heading" style="margin-top:14px">Vysvětlení</h3><div class="chip-row">`;
    html += linkedExplainers.map(e =>
      `<a class="chip chip-explainer" href="jak-funguje.html?id=${encodeURIComponent(e.id)}">${escapeText(e.title)}</a>`
    ).join('');
    html += `</div>`;
  }
  target.innerHTML = html;
}

function escapeText(s) {
  if (s == null) return '';
  return String(s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function renderFallbackCard(indicator) {
  return {
    name: indicator.name,
    area: indicator.area,
    domain: indicator.domain,
    subdomain: indicator.subdomain,
    definition: '—',
    unit: indicator.unit,
    direction: indicator.direction ?? 'context_dependent',
    frequency: '—',
    stewards: [],
    signal_thresholds: null,
    method_notes: null,
    limitations: null,
    data_source: indicator.source ? { primary: { type: indicator.source.name, note: indicator.source.url ?? '' } } : null,
  };
}

async function openMethodCard(indicator) {
  const modal = document.getElementById('modalBackdrop');
  const content = document.getElementById('modalContent');
  content.innerHTML = '<p>Načítám metodickou kartu…</p>';
  modal.classList.remove('hidden');
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');

  let card;
  try {
    const res = await fetch(indicator.method_card_url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    card = await res.json();
  } catch {
    card = renderFallbackCard(indicator);
    const notice = document.createElement('p');
    notice.className = 'card-notice';
    notice.textContent = 'Detailní metodická karta není dostupná. Zobrazuji základní data indikátoru.';
    content.innerHTML = '';
    content.appendChild(notice);
    content.insertAdjacentHTML('beforeend', renderModalContent(card, indicator));
    const csvBtn = document.getElementById('btnCsvExport');
    if (csvBtn) csvBtn.addEventListener('click', () => exportTrendCsv(indicator));
    renderModalCrossLinks(indicator.id);
    return;
  }

  content.innerHTML = renderModalContent(card, indicator);
  const csvBtn = document.getElementById('btnCsvExport');
  if (csvBtn) csvBtn.addEventListener('click', () => exportTrendCsv(indicator));
  renderModalCrossLinks(indicator.id);
}

function closeModal() {
  document.getElementById('modalBackdrop').classList.add('hidden');
}

// ====== INTERAKCE ======

// ====== DARK MODE ======

function initTheme() {
  const saved = localStorage.getItem(LS_THEME_KEY);
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = saved ?? (prefersDark ? 'dark' : 'light');
  applyTheme(theme);
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const btn = document.getElementById('btnTheme');
  if (btn) btn.textContent = theme === 'dark' ? '☀' : '🌙';
  try { localStorage.setItem(LS_THEME_KEY, theme); } catch { /* ignore */ }
}

function toggleTheme() {
  const current = document.documentElement.dataset.theme ?? 'light';
  applyTheme(current === 'dark' ? 'light' : 'dark');
}

function wireUp() {
  // Audience switch
  document.querySelectorAll('.audience-switch button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.audience-switch button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.body.dataset.audience = btn.dataset.aud;
    });
  });

  // Area filter
  document.querySelectorAll('.dimnav button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.dimnav button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeArea = btn.dataset.area;
      renderGrid();
    });
  });

  // Search
  const searchInput = document.getElementById('searchBox');
  if (searchInput) {
    const onSearch = debounce(() => { activeSearch = searchInput.value.trim(); renderGrid(); }, 200);
    searchInput.addEventListener('input', onSearch);
  }

  // Sort
  const sortSel = document.getElementById('sortSelect');
  if (sortSel) sortSel.addEventListener('change', () => { activeSort = sortSel.value; renderGrid(); });

  // CSV export-all
  const btnCsv = document.getElementById('btnExportCsv');
  if (btnCsv) btnCsv.addEventListener('click', exportVisibleCsv);

  // Dark mode toggle
  const btnTheme = document.getElementById('btnTheme');
  if (btnTheme) btnTheme.addEventListener('click', toggleTheme);

  // Reload button
  document.getElementById('btnReload').addEventListener('click', async () => {
    const btn = document.getElementById('btnReload');
    btn.disabled = true;
    btn.textContent = 'Načítám…';
    try {
      await loadData(true);
      renderGrid();
    } finally {
      btn.disabled = false;
      btn.textContent = '⟳ Načíst znovu';
    }
  });

  // Modal close
  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('modalBackdrop').addEventListener('click', (e) => {
    if (e.target.id === 'modalBackdrop') closeModal();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
}

// ====== INIT ======

(async () => {
  if (typeof window === 'undefined') return; // skip in node test environment
  initTheme();
  wireUp();
  try {
    await loadData();
    renderGrid();
    loadAndRenderRegions();
  } catch (err) {
    console.error('Initial load failed:', err);
  }
})();
