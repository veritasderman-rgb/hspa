// Frontend logika dashboardu Zdravé Česko.
// Načítá data z /data/indicators.json a renderuje karty.
// Žádné inline data — jediný zdroj pravdy je JSON file.

const DATA_URL = 'data/indicators.json';
const LS_KEY = 'zdrave_cesko_cache';

let allIndicators = [];
let activeArea = 'all';
let activeAudience = 'public';

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

// Formátuje delta CZ vs OECD jako ±X.X (jednotka)
function fmtDelta(value, benchmark, unit, direction) {
  if (benchmark == null || value == null) return null;
  const raw = value - benchmark;
  const sign = raw >= 0 ? '+' : '';
  const better = direction === 'lower_is_better' ? raw <= 0 : raw >= 0;
  return { text: `${sign}${raw.toFixed(1)} ${unit}`, better };
}

// ====== LOCALSTORAGE FALLBACK ======

function saveToLocalStorage(data) {
  try {
    // Ukládáme jen agregovaná data, ne PII
    localStorage.setItem(LS_KEY, JSON.stringify({
      saved_at: new Date().toISOString(),
      generated_at: data.generated_at,
      indicators: data.indicators,
    }));
  } catch { /* quota exceeded nebo soukromý mód */ }
}

function loadFromLocalStorage() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
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
    saveToLocalStorage(data);
    clearStatus();
    return data;
  } catch (err) {
    // Zkus localStorage fallback
    const cached = loadFromLocalStorage();
    if (cached) {
      allIndicators = cached.indicators || [];
      showStatus(
        `Nepodařilo se načíst data: ${err.message}. Zobrazuji uloženou verzi z ${fmtRelative(cached.saved_at)}.`,
        'warn'
      );
      document.getElementById('lastUpdated').textContent =
        `Uloženo ${fmtRelative(cached.saved_at)} (offline)`;
      return cached;
    }
    showStatus(`Nepodařilo se načíst data: ${err.message}. Žádná offline kopie není k dispozici.`, 'error');
    throw err;
  }
}

// ====== CSV EXPORT ======

function buildCsv(indicator) {
  const rows = [['Rok', 'Hodnota', `Benchmark OECD (${indicator.unit})`]];
  const benchmark = indicator.benchmark?.oecd ?? '';
  for (const t of (indicator.trend ?? [])) {
    rows.push([t.year, t.value, benchmark]);
  }
  return rows.map(r => r.join(',')).join('\n');
}

function downloadCsv(indicator) {
  const csv = buildCsv(indicator);
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${indicator.id}_trend.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ====== RENDERING ======

function renderGrid(area = 'all') {
  const grid = document.getElementById('indicatorGrid');
  grid.innerHTML = '';
  const filtered = area === 'all'
    ? allIndicators
    : allIndicators.filter(i => i.area === area);

  const count = filtered.length;
  document.getElementById('gridBadge').textContent =
    `${count} indikátor${count === 1 ? '' : (count < 5 ? 'y' : 'ů')}`;
  document.getElementById('gridTitle').textContent =
    area === 'all' ? 'Všechny indikátory' : `Oblast: ${area}`;

  const charts = [];
  filtered.forEach((ind) => {
    const card = document.createElement('article');
    card.className = 'indicator-card';
    card.dataset.indicatorId = ind.id;
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `${ind.name}: ${ind.value} ${ind.unit}. Klikněte pro metodickou kartu.`);

    const chartId = `chart-${ind.id}`;
    const benchmark = ind.benchmark?.oecd ?? ind.benchmark?.eu ?? null;

    // Delta chip
    const delta = fmtDelta(ind.value, ind.benchmark?.oecd, ind.unit, getDirection(ind.id));
    const deltaHTML = delta
      ? `<span class="delta-chip ${delta.better ? 'delta-good' : 'delta-bad'}" title="Rozdíl oproti OECD průměru">${delta.text} vs. OECD</span>`
      : '';

    const compareHTML = benchmark != null
      ? `<div class="compare">OECD průměr: <strong>${benchmark}${ind.unit ? ' ' + ind.unit : ''}</strong>${deltaHTML}</div>`
      : '';

    // Year badge
    const yearBadge = ind.year ? `<span class="year-badge">${ind.year}</span>` : '';

    card.innerHTML = `
      <div class="area-tag">${ind.area} · ${ind.domain}</div>
      <div class="top">
        <h4>${ind.name}</h4>
        <div class="signal ${ind.signal}" title="Hodnocení: ${signalLabel(ind.signal)}" aria-label="Hodnocení: ${signalLabel(ind.signal)}"></div>
      </div>
      <div class="value-row">
        <span class="big-value">${ind.value}</span>
        <span class="unit">${ind.unit}</span>
        ${yearBadge}
      </div>
      ${compareHTML}
      <div class="chart-wrap"><canvas id="${chartId}" role="img" aria-label="Trend ${ind.name}"></canvas></div>
      <div class="card-footer">
        <span class="source">Zdroj: ${ind.source.name}</span>
        <button class="btn-csv" data-id="${ind.id}" aria-label="Stáhnout CSV trend ${ind.name}" title="Stáhnout trend jako CSV">↓ CSV</button>
      </div>
    `;

    card.addEventListener('click', (e) => {
      if (e.target.classList.contains('btn-csv')) return;
      openMethodCard(ind);
    });
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openMethodCard(ind); }
    });
    card.querySelector('.btn-csv').addEventListener('click', (e) => {
      e.stopPropagation();
      downloadCsv(ind);
    });

    grid.appendChild(card);

    if (Array.isArray(ind.trend) && ind.trend.length) {
      charts.push({ ind, chartId });
    }
  });

  setTimeout(() => renderCharts(charts), 50);
}

function signalLabel(signal) {
  return { good: 'Dobré', warn: 'Varování', bad: 'Problematické', neutral: 'Neutrální' }[signal] ?? signal;
}

function getDirection(indicatorId) {
  // Zjednodušená mapa — v M5+ bude načítáno z metodické karty
  const lowerBetter = ['mortalita_30d_ami', 'mortalita_30d_cmp', 'pm25_expozice',
    'kuractvi_denni', 'mortalita_preventabilni', 'mortalita_kojenci'];
  return lowerBetter.includes(indicatorId) ? 'lower_is_better' : 'higher_is_better';
}

function renderCharts(charts) {
  charts.forEach(({ ind, chartId }) => {
    const ctx = document.getElementById(chartId);
    if (!ctx) return;
    const color = ind.signal === 'good' ? '#38761D'
      : ind.signal === 'warn' ? '#B45F06'
      : ind.signal === 'bad' ? '#990000' : '#0B5394';

    const benchmark = ind.benchmark?.oecd ?? ind.benchmark?.eu ?? null;
    const datasets = [{
      data: ind.trend.map(t => t.value),
      borderColor: color,
      backgroundColor: color + '22',
      fill: true,
      tension: 0.3,
      pointRadius: 2,
      pointHoverRadius: 4,
      borderWidth: 2,
      label: 'ČR',
    }];

    // OECD referenční linie
    if (benchmark != null) {
      datasets.push({
        data: ind.trend.map(() => benchmark),
        borderColor: '#888',
        borderDash: [4, 3],
        borderWidth: 1.5,
        pointRadius: 0,
        fill: false,
        tension: 0,
        label: 'OECD',
      });
    }

    // eslint-disable-next-line no-undef
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: ind.trend.map(t => t.year),
        datasets,
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: benchmark != null, position: 'bottom',
            labels: { boxWidth: 12, font: { size: 9 }, color: '#888' } },
          tooltip: {
            displayColors: true,
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y} ${ind.unit}`,
            },
          },
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 9 }, color: '#888' } },
          y: { grid: { display: false }, ticks: { font: { size: 9 }, color: '#888', maxTicksLimit: 3 } },
        },
      },
    });
  });
}

// ====== METODICKÁ KARTA (modal) ======

async function openMethodCard(indicator) {
  const modal = document.getElementById('modalBackdrop');
  const content = document.getElementById('modalContent');
  content.innerHTML = '<p>Načítám metodickou kartu…</p>';
  modal.classList.remove('hidden');
  modal.querySelector('.modal').focus();

  try {
    const res = await fetch(indicator.method_card_url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const card = await res.json();

    const dirLabel = { higher_is_better: 'Vyšší je lepší ↑', lower_is_better: 'Nižší je lepší ↓',
      context_dependent: 'Závisí na kontextu' }[card.direction] ?? card.direction;

    content.innerHTML = `
      <h2>${card.name}</h2>
      <div class="sub">${card.area} · ${card.domain} · ${card.subdomain || ''}</div>
      <dl>
        <dt>Definice</dt><dd>${card.definition}</dd>
        <dt>Jednotka</dt><dd>${card.unit}</dd>
        <dt>Směr</dt><dd>${dirLabel}</dd>
        <dt>Frekvence</dt><dd>${card.frequency}</dd>
        <dt>Garanti</dt><dd>${(card.stewards || []).join(', ')}</dd>
        <dt>Prahy signálu</dt><dd>Dobrý ≥ +${card.signal_thresholds?.good ?? '?'} %, Varování ≥ −${card.signal_thresholds?.warn ?? '?'} % vs. OECD</dd>
        <dt>Metodika</dt><dd>${card.method_notes}</dd>
        <dt>Omezení</dt><dd>${card.limitations}</dd>
      </dl>
      <h3 class="modal-section-title">Primární zdroj dat</h3>
      <pre>${JSON.stringify(card.data_source?.primary ?? card.data_source, null, 2)}</pre>
      <button class="btn-csv-modal" data-id="${indicator.id}">↓ Stáhnout trend jako CSV</button>
    `;
    content.querySelector('.btn-csv-modal').addEventListener('click', () => downloadCsv(indicator));
  } catch (err) {
    content.innerHTML = `<p class="error-msg">Nepodařilo se načíst metodickou kartu: ${err.message}</p>`;
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
      activeAudience = btn.dataset.aud;
      document.body.dataset.audience = btn.dataset.aud;
    });
  });

  // Area filter
  document.querySelectorAll('.dimnav button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.dimnav button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeArea = btn.dataset.area;
      renderGrid(activeArea);
    });
  });

  // Reload button
  document.getElementById('btnReload').addEventListener('click', async () => {
    const btn = document.getElementById('btnReload');
    btn.disabled = true;
    btn.textContent = 'Načítám…';
    try {
      await loadData(true);
      renderGrid(activeArea);
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

// ====== REGIONÁLNÍ SROVNÁNÍ ======

let regionData = null;
let activeRegionMetric = 'value';
let regionChartInstance = null;

async function loadRegions() {
  try {
    const res = await fetch('data/regions.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    regionData = await res.json();
  } catch (err) {
    console.warn('[regions] Failed to load:', err.message);
  }
}

function renderRegionChart(metric = 'value') {
  if (!regionData) return;
  const regions = [...regionData.regions].sort((a, b) => (b[metric] ?? 0) - (a[metric] ?? 0));
  const labels = regions.map(r => r.name);
  const values = regions.map(r => r[metric] ?? 0);
  const countryAvg = metric === 'value' ? regionData.country_avg : null;

  const metricLabel = metric === 'value' ? regionData.indicator_name : 'Lékaři / 1 000 obyvatel';
  document.getElementById('regionDesc').textContent = metricLabel;

  const colors = values.map(v => {
    if (countryAvg == null) return '#0B5394';
    return v >= countryAvg ? '#38761D' : v >= countryAvg - 1 ? '#B45F06' : '#990000';
  });

  const ctx = document.getElementById('regionChart');
  if (regionChartInstance) { regionChartInstance.destroy(); regionChartInstance = null; }

  const datasets = [{
    data: values,
    backgroundColor: colors.map(c => c + 'CC'),
    borderColor: colors,
    borderWidth: 1,
    borderRadius: 4,
    label: metricLabel,
  }];

  if (countryAvg != null) {
    datasets.push({
      type: 'line',
      data: values.map(() => countryAvg),
      borderColor: '#888',
      borderDash: [5, 4],
      borderWidth: 1.5,
      pointRadius: 0,
      fill: false,
      label: 'Průměr ČR',
    });
  }

  // eslint-disable-next-line no-undef
  regionChartInstance = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: countryAvg != null, position: 'top',
          labels: { boxWidth: 14, font: { size: 11 } } },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.x}`,
          },
        },
      },
      scales: {
        x: { grid: { color: '#eee' }, ticks: { font: { size: 10 } } },
        y: { grid: { display: false }, ticks: { font: { size: 11 }, color: '#333' } },
      },
    },
  });
}

function wireUpRegions() {
  document.querySelectorAll('.region-tabs button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.region-tabs button').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      activeRegionMetric = btn.dataset.metric;
      renderRegionChart(activeRegionMetric);
    });
  });
}

// ====== INIT ======

(async () => {
  wireUp();
  wireUpRegions();
  try {
    const [data] = await Promise.all([loadData(), loadRegions()]);
    void data;
    renderGrid('all');
    renderRegionChart(activeRegionMetric);
  } catch (err) {
    console.error('Initial load failed:', err);
    // Zkus alespoň regiony
    renderRegionChart(activeRegionMetric);
  }
})();
