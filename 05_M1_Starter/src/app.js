// Frontend logika dashboardu Zdravé Česko.
// Načítá data z data/indicators.json a renderuje karty.
// Žádné inline data — jediný zdroj pravdy je JSON file.

const DATA_URL = 'data/indicators.json';
const REGIONS_URL = 'data/regions.json';
const LS_KEY = 'zdrave_cesko_cache_v1';

let allIndicators = [];
let activeArea = 'all';
let searchQuery = '';

// Map of Chart.js instances keyed by indicator ID — prevents memory leaks on re-render.
const chartInstances = new Map();
let regionChartInstance = null;

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

// Returns year-on-year delta from the last two trend points, or null.
function calcDelta(trend) {
  if (!Array.isArray(trend) || trend.length < 2) return null;
  return trend[trend.length - 1].value - trend[trend.length - 2].value;
}

// ====== DATA LOADING ======

async function loadData(bustCache = false) {
  const url = bustCache ? `${DATA_URL}?t=${Date.now()}` : DATA_URL;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    allIndicators = data.indicators || [];
    document.getElementById('lastUpdated').textContent =
      `Aktualizováno ${fmtRelative(data.generated_at)}`;
    clearStatus();
    try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch (_) {}
    return data;
  } catch (err) {
    const cached = localStorage.getItem(LS_KEY);
    if (cached) {
      try {
        const data = JSON.parse(cached);
        allIndicators = data.indicators || [];
        document.getElementById('lastUpdated').textContent =
          `Cache ${fmtRelative(data.generated_at)}`;
        showStatus(`Nepodařilo se načíst data: ${err.message}. Zobrazuji cachovaná data.`, 'warn');
        return data;
      } catch (_) {}
    }
    showStatus(`Nepodařilo se načíst data: ${err.message}.`, 'error');
    throw err;
  }
}

// ====== CHART MANAGEMENT ======

function destroyAllIndicatorCharts() {
  chartInstances.forEach(inst => inst.destroy());
  chartInstances.clear();
}

// ====== FILTERING ======

function getFiltered() {
  let list = activeArea === 'all'
    ? allIndicators
    : allIndicators.filter(i => i.area === activeArea);
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    list = list.filter(i =>
      i.name.toLowerCase().includes(q) ||
      i.domain.toLowerCase().includes(q) ||
      (i.subdomain || '').toLowerCase().includes(q)
    );
  }
  return list;
}

// ====== RENDERING ======

function renderGrid() {
  destroyAllIndicatorCharts();
  const grid = document.getElementById('indicatorGrid');
  grid.innerHTML = '';
  const filtered = getFiltered();

  const count = filtered.length;
  document.getElementById('gridBadge').textContent =
    `${count} indikátor${count === 1 ? '' : (count > 1 && count < 5 ? 'y' : 'ů')}`;
  document.getElementById('gridTitle').textContent =
    activeArea === 'all' ? 'Všechny indikátory' : `Oblast: ${activeArea}`;

  if (count === 0) {
    grid.innerHTML = '<p class="no-results">Žádné indikátory neodpovídají hledanému výrazu.</p>';
    return;
  }

  const chartsToCreate = [];

  filtered.forEach((ind) => {
    const card = document.createElement('div');
    card.className = 'indicator-card';
    card.dataset.indicatorId = ind.id;

    const chartId = `chart-${ind.id}`;
    const oecdBm = ind.benchmark?.oecd;
    const euBm = ind.benchmark?.eu;
    const benchmarkParts = [];
    if (oecdBm != null) benchmarkParts.push(`OECD: <strong>${oecdBm}${ind.unit ? ' ' + ind.unit : ''}</strong>`);
    if (euBm != null) benchmarkParts.push(`EU: <strong>${euBm}${ind.unit ? ' ' + ind.unit : ''}</strong>`);
    const compareHTML = benchmarkParts.length
      ? `<div class="compare">${benchmarkParts.join(' &nbsp;·&nbsp; ')}</div>`
      : '';

    const delta = calcDelta(ind.trend);
    let deltaHTML = '';
    if (delta != null) {
      const sign = delta >= 0 ? '+' : '';
      const isGood = (ind.direction === 'higher_is_better' && delta > 0) ||
                     (ind.direction === 'lower_is_better' && delta < 0);
      const isBad  = (ind.direction === 'higher_is_better' && delta < 0) ||
                     (ind.direction === 'lower_is_better' && delta > 0);
      const cls = isGood ? 'delta-good' : isBad ? 'delta-bad' : 'delta-neutral';
      deltaHTML = `<span class="delta ${cls}" title="Meziroční změna">${sign}${delta.toFixed(1)} ${ind.unit || ''}</span>`;
    }

    card.innerHTML = `
      <div class="area-tag">${ind.area} · ${ind.domain}</div>
      <div class="top">
        <h4>${ind.name}</h4>
        <div class="signal ${ind.signal}" title="Hodnocení: ${ind.signal}"></div>
      </div>
      <div class="value-row">
        <span class="big-value">${ind.value}</span>
        <span class="unit">${ind.unit}</span>
        ${deltaHTML}
      </div>
      ${compareHTML}
      <div class="chart-wrap"><canvas id="${chartId}"></canvas></div>
      <div class="source">Zdroj: ${ind.source.name}</div>
    `;
    card.addEventListener('click', () => openMethodCard(ind));
    grid.appendChild(card);

    if (Array.isArray(ind.trend) && ind.trend.length) {
      chartsToCreate.push({ ind, chartId });
    }
  });

  // Render sparklines after DOM insertion
  setTimeout(() => {
    chartsToCreate.forEach(({ ind, chartId }) => {
      const ctx = document.getElementById(chartId);
      if (!ctx) return;
      const color = ind.signal === 'good' ? '#38761D'
        : ind.signal === 'warn' ? '#B45F06'
        : ind.signal === 'bad' ? '#990000' : '#0B5394';
      // eslint-disable-next-line no-undef
      const instance = new Chart(ctx, {
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
      chartInstances.set(ind.id, instance);
    });
  }, 50);
}

// ====== CSV EXPORT ======

function exportCsv() {
  const filtered = getFiltered();
  const rows = [['ID', 'Název', 'Oblast', 'Doména', 'Subdoména', 'Hodnota', 'Jednotka', 'Rok', 'OECD průměr', 'EU průměr', 'Signal', 'Zdroj']];
  filtered.forEach(i => {
    rows.push([
      i.id, i.name, i.area, i.domain, i.subdomain ?? '',
      i.value, i.unit, i.year,
      i.benchmark?.oecd ?? '', i.benchmark?.eu ?? '',
      i.signal, i.source?.name ?? '',
    ]);
  });
  const csv = rows.map(r =>
    r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
  ).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `zdrave-cesko-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ====== REGIONAL VIEW ======

async function loadAndRenderRegions() {
  const section = document.getElementById('regionSection');
  try {
    const res = await fetch(REGIONS_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    section.classList.remove('hidden');
    document.getElementById('regionIndicatorName').textContent = data.indicator_name;
    document.getElementById('regionCountryAvg').textContent = `Průměr ČR: ${data.country_avg} let`;

    const sorted = [...data.regions].sort((a, b) => b.value - a.value);
    const canvas = document.getElementById('regionChart');

    if (regionChartInstance) { regionChartInstance.destroy(); regionChartInstance = null; }

    const colors = sorted.map(r =>
      r.value >= data.country_avg ? '#38761Dbb' : '#990000bb'
    );

    // eslint-disable-next-line no-undef
    regionChartInstance = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: sorted.map(r => r.name),
        datasets: [{
          label: data.indicator_name,
          data: sorted.map(r => r.value),
          backgroundColor: colors,
          borderColor: colors.map(c => c.slice(0, 7)),
          borderWidth: 1,
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: { label: ctx => `${ctx.parsed.x} let` },
          },
        },
        scales: {
          x: {
            min: 74,
            grid: { color: '#f0f4f8' },
            ticks: { font: { size: 11 } },
          },
          y: {
            grid: { display: false },
            ticks: { font: { size: 11 } },
          },
        },
      },
    });
  } catch (_) {
    section.classList.add('hidden');
  }
}

// ====== METODICKÁ KARTA (modal) ======

function renderDataSource(ds) {
  if (!ds) return '';
  const rows = [];
  if (ds.primary) {
    const p = ds.primary;
    const detail = [p.type, p.dataset].filter(Boolean).join(' / ');
    const link = p.endpoint
      ? `<br><a href="${p.endpoint}" target="_blank" rel="noopener">${p.endpoint}</a>`
      : '';
    rows.push(`<dt>Primární zdroj</dt><dd>${detail}${link}</dd>`);
  }
  if (ds.fallback) {
    const f = ds.fallback;
    const link = f.url
      ? `<br><a href="${f.url}" target="_blank" rel="noopener">${f.url}</a>`
      : '';
    rows.push(`<dt>Záložní zdroj</dt><dd>${f.type}${link}</dd>`);
  }
  return rows.length ? `<dl>${rows.join('')}</dl>` : '';
}

async function openMethodCard(indicator) {
  const modal = document.getElementById('modalBackdrop');
  const content = document.getElementById('modalContent');
  content.innerHTML = '<p>Načítám metodickou kartu…</p>';
  modal.classList.remove('hidden');

  try {
    const res = await fetch(indicator.method_card_url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const card = await res.json();

    const dirLabel = card.direction === 'higher_is_better' ? 'Vyšší = lepší'
      : card.direction === 'lower_is_better' ? 'Nižší = lepší'
      : 'Kontextové';

    const trendRows = Array.isArray(indicator.trend) && indicator.trend.length
      ? indicator.trend.map(t => `<tr><td>${t.year}</td><td>${t.value} ${card.unit || ''}</td></tr>`).join('')
      : '';

    content.innerHTML = `
      <h2>${card.name}</h2>
      <div class="sub">${card.area} · ${card.domain}${card.subdomain ? ' · ' + card.subdomain : ''}</div>
      <dl>
        <dt>Definice</dt><dd>${card.definition}</dd>
        <dt>Jednotka</dt><dd>${card.unit}</dd>
        <dt>Směr</dt><dd>${dirLabel}</dd>
        <dt>Frekvence</dt><dd>${card.frequency}</dd>
        <dt>Garanti</dt><dd>${(card.stewards || []).join(', ')}</dd>
        <dt>Prahy signálu</dt><dd>good ≥ +${card.signal_thresholds.good} % · bad &lt; −${card.signal_thresholds.warn} %</dd>
        <dt>Metodika</dt><dd>${card.method_notes}</dd>
        <dt>Omezení</dt><dd>${card.limitations}</dd>
      </dl>
      ${trendRows ? `
        <h3 class="modal-section-title">Trend</h3>
        <table class="trend-table">
          <thead><tr><th>Rok</th><th>Hodnota</th></tr></thead>
          <tbody>${trendRows}</tbody>
        </table>` : ''}
      <h3 class="modal-section-title">Datové zdroje</h3>
      ${renderDataSource(card.data_source)}
    `;
  } catch (err) {
    content.innerHTML = `<p class="status error">Nepodařilo se načíst metodickou kartu: ${err.message}</p>`;
  }
}

function closeModal() {
  document.getElementById('modalBackdrop').classList.add('hidden');
}

// ====== INTERAKCE ======

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

  // Search input
  document.getElementById('searchInput').addEventListener('input', (e) => {
    searchQuery = e.target.value.trim();
    renderGrid();
  });

  // CSV export
  document.getElementById('btnExportCsv').addEventListener('click', exportCsv);

  // Reload button
  document.getElementById('btnReload').addEventListener('click', async () => {
    const btn = document.getElementById('btnReload');
    btn.disabled = true;
    btn.textContent = 'Načítám…';
    try {
      await loadData(true);
      renderGrid();
      await loadAndRenderRegions();
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
  wireUp();
  try {
    await loadData();
  } catch (err) {
    console.error('Initial load failed:', err);
  }
  renderGrid();
  await loadAndRenderRegions();
})();
