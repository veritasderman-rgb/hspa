// Frontend logika dashboardu Zdravé Česko.
// Načítá data z data/indicators.json a data/regions.json a renderuje karty.

const DATA_URL    = 'data/indicators.json';
const REGIONS_URL = 'data/regions.json';

let allIndicators = [];
let activeArea    = 'all';
let searchQuery   = '';
let regionChart   = null;

// ====== UTIL ======

function fmtRelative(iso) {
  const d = new Date(iso);
  const diffH = (Date.now() - d) / 3.6e6;
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
    return data;
  } catch (err) {
    showStatus(`Nepodařilo se načíst data: ${err.message}. Zobrazuji posledně známou verzi.`, 'error');
    throw err;
  }
}

// ====== SIGNAL SUMMARY TILES ======

function updateSummaryTiles(indicators) {
  const counts = { good: 0, warn: 0, bad: 0 };
  for (const ind of indicators) {
    if (counts[ind.signal] !== undefined) counts[ind.signal]++;
  }
  document.getElementById('stTotal').textContent = indicators.length;
  document.getElementById('stGood').textContent  = counts.good;
  document.getElementById('stWarn').textContent  = counts.warn;
  document.getElementById('stBad').textContent   = counts.bad;
}

// ====== FILTERING ======

function getFiltered() {
  let list = activeArea === 'all' ? allIndicators : allIndicators.filter(i => i.area === activeArea);
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

// ====== CSV EXPORT ======

function exportCsv(indicators) {
  const header = ['id', 'name', 'area', 'domain', 'subdomain', 'value', 'unit', 'year', 'signal', 'benchmark_oecd', 'benchmark_eu', 'source'];
  const rows = indicators.map(i => [
    i.id, `"${i.name}"`, i.area, i.domain, i.subdomain || '',
    i.value, i.unit, i.year, i.signal,
    i.benchmark?.oecd ?? '', i.benchmark?.eu ?? '',
    `"${i.source.name}"`
  ].join(','));
  const csv = [header.join(','), ...rows].join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `zdrave-cesko-indikatory-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ====== RENDERING ======

function renderGrid() {
  const filtered = getFiltered();
  const grid = document.getElementById('indicatorGrid');
  grid.innerHTML = '';

  const badge = document.getElementById('gridBadge');
  badge.textContent = `${filtered.length} indikátor${filtered.length === 1 ? '' : (filtered.length < 5 ? 'y' : 'ů')}`;
  document.getElementById('gridTitle').textContent =
    activeArea === 'all' ? 'Všechny indikátory' : `Oblast: ${activeArea}`;

  document.getElementById('noResults').classList.toggle('hidden', filtered.length > 0);
  updateSummaryTiles(filtered);

  const charts = [];
  filtered.forEach(ind => {
    const card = document.createElement('div');
    card.className = 'indicator-card';
    card.dataset.indicatorId = ind.id;

    const chartId = `chart-${ind.id}`;
    const benchmark = ind.benchmark?.oecd ?? ind.benchmark?.eu ?? null;
    const compareHTML = benchmark != null
      ? `<div class="compare">vs. OECD průměr: <strong>${benchmark}${ind.unit ? ' ' + ind.unit : ''}</strong></div>`
      : '';

    card.innerHTML = `
      <div class="area-tag">${ind.area} · ${ind.domain}</div>
      <div class="top">
        <h4>${ind.name}</h4>
        <div class="signal ${ind.signal}" title="Hodnocení: ${ind.signal}"></div>
      </div>
      <div class="value-row">
        <span class="big-value">${ind.value}</span>
        <span class="unit">${ind.unit}</span>
      </div>
      ${compareHTML}
      <div class="chart-wrap"><canvas id="${chartId}"></canvas></div>
      <div class="source">Zdroj: ${ind.source.name}</div>
    `;
    card.addEventListener('click', () => openMethodCard(ind));
    grid.appendChild(card);

    if (Array.isArray(ind.trend) && ind.trend.length) {
      charts.push({ ind, chartId });
    }
  });

  setTimeout(() => {
    charts.forEach(({ ind, chartId }) => {
      const ctx = document.getElementById(chartId);
      if (!ctx) return;
      const color = ind.signal === 'good' ? '#38761D'
        : ind.signal === 'warn' ? '#B45F06'
        : ind.signal === 'bad' ? '#990000' : '#0B5394';
      // eslint-disable-next-line no-undef
      new Chart(ctx, {
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
    });
  }, 50);
}

// ====== REGIONÁLNÍ PŘEHLED ======

async function loadRegions() {
  try {
    const res = await fetch(REGIONS_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    renderRegions(data);
  } catch (err) {
    document.getElementById('regionSection').style.display = 'none';
  }
}

function renderRegions(data) {
  const regions = [...data.regions].sort((a, b) => b.value - a.value);
  const countryAvg = data.country_avg;

  // Tabulka
  const tbody = document.getElementById('regionTableBody');
  tbody.innerHTML = '';
  const maxVal = Math.max(...regions.map(r => r.value));
  regions.forEach(r => {
    const tr = document.createElement('tr');
    if (r.value === maxVal) tr.className = 'region-highlight';
    tr.innerHTML = `
      <td>${r.name}</td>
      <td>${r.value.toFixed(1)} let</td>
      <td>${r.doctors_per_1000.toFixed(1)}</td>
    `;
    tbody.appendChild(tr);
  });

  // Graf
  const ctx = document.getElementById('regionChart');
  if (!ctx) return;
  if (regionChart) regionChart.destroy();

  const colors = regions.map(r =>
    r.value >= countryAvg ? 'rgba(56,118,29,0.75)' : 'rgba(153,0,0,0.6)'
  );

  // eslint-disable-next-line no-undef
  regionChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: regions.map(r => r.name),
      datasets: [{
        label: 'Naděje dožití (let)',
        data: regions.map(r => r.value),
        backgroundColor: colors,
        borderRadius: 4,
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.parsed.x.toFixed(1)} let`
          }
        },
        annotation: undefined,
      },
      scales: {
        x: {
          min: 74, grid: { color: '#eee' },
          ticks: { font: { size: 11 } },
          title: { display: true, text: 'Naděje dožití (let)', font: { size: 11 } }
        },
        y: { ticks: { font: { size: 11 } }, grid: { display: false } }
      }
    },
    plugins: [{
      // Vykreslí svislou čáru pro průměr ČR
      id: 'avgLine',
      afterDraw(chart) {
        const { ctx: c, chartArea, scales } = chart;
        const x = scales.x.getPixelForValue(countryAvg);
        c.save();
        c.beginPath();
        c.moveTo(x, chartArea.top);
        c.lineTo(x, chartArea.bottom);
        c.strokeStyle = '#0B5394';
        c.lineWidth = 1.5;
        c.setLineDash([4, 3]);
        c.stroke();
        c.fillStyle = '#0B5394';
        c.font = '10px sans-serif';
        c.fillText(`ČR průměr ${countryAvg}`, x + 4, chartArea.top + 12);
        c.restore();
      }
    }]
  });
}

// ====== METODICKÁ KARTA (modal) ======

async function openMethodCard(indicator) {
  const modal   = document.getElementById('modalBackdrop');
  const content = document.getElementById('modalContent');
  content.innerHTML = '<p>Načítám metodickou kartu…</p>';
  modal.classList.remove('hidden');

  try {
    const res = await fetch(indicator.method_card_url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const card = await res.json();

    const src = card.data_source || {};
    const primarySrc = src.primary
      ? `<div class="modal-source-card"><strong>Primární zdroj</strong>${src.primary.type}${src.primary.note ? '<br><small>' + src.primary.note + '</small>' : ''}</div>`
      : '';
    const fallbackSrc = src.fallback
      ? `<div class="modal-source-card"><strong>Záložní zdroj</strong>${src.fallback.type}${src.fallback.code ? ' · kód: ' + src.fallback.code : ''}</div>`
      : '';

    content.innerHTML = `
      <h2>${card.name}</h2>
      <div class="sub">${card.area} · ${card.domain}${card.subdomain ? ' · ' + card.subdomain : ''}</div>
      <dl>
        <dt>Definice</dt><dd>${card.definition}</dd>
        <dt>Jednotka</dt><dd>${card.unit}</dd>
        <dt>Směr</dt><dd>${card.direction === 'higher_is_better' ? 'Vyšší je lepší' : card.direction === 'lower_is_better' ? 'Nižší je lepší' : 'Závisí na kontextu'}</dd>
        <dt>Frekvence</dt><dd>${card.frequency}</dd>
        <dt>Garanti</dt><dd>${(card.stewards || []).join(', ')}</dd>
        <dt>Prahy signálu</dt><dd>Dobré ≥ +${card.signal_thresholds.good} % oproti benchmarku · Problematické ≤ −${card.signal_thresholds.warn} %</dd>
        <dt>Metodika</dt><dd>${card.method_notes}</dd>
        <dt>Omezení</dt><dd>${card.limitations}</dd>
      </dl>
      <h3 style="margin-top:18px; font-size:14px;">Zdroje dat</h3>
      <div class="modal-source-grid">${primarySrc}${fallbackSrc}</div>
    `;
  } catch (err) {
    content.innerHTML = `<p>Nepodařilo se načíst metodickou kartu: ${err.message}</p>`;
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

  // Search
  const searchInput = document.getElementById('searchInput');
  searchInput.addEventListener('input', () => {
    searchQuery = searchInput.value.trim();
    renderGrid();
  });

  // CSV export
  document.getElementById('btnExport').addEventListener('click', () => {
    exportCsv(getFiltered());
  });

  // Reload
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
  wireUp();
  try {
    await loadData();
    renderGrid();
    await loadRegions();
  } catch (err) {
    console.error('Initial load failed:', err);
  }
})();
