// Frontend logika dashboardu Zdravé Česko.
// Načítá data z /data/indicators.json a renderuje karty.
// Žádné inline data — jediný zdroj pravdy je JSON file.

const DATA_URL = 'data/indicators.json';

let allIndicators = [];
let activeArea = 'all';
let activeSignal = 'all';
let searchQuery = '';

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

// ====== SCORECARD ======

function updateScorecard(indicators) {
  const counts = { good: 0, warn: 0, bad: 0, neutral: 0 };
  for (const ind of indicators) counts[ind.signal] = (counts[ind.signal] || 0) + 1;
  document.getElementById('countGood').textContent = counts.good;
  document.getElementById('countWarn').textContent = counts.warn;
  document.getElementById('countBad').textContent = counts.bad;
  document.getElementById('countNeutral').textContent = counts.neutral;
  document.getElementById('countTotal').textContent = indicators.length;
}

// ====== FILTERING ======

function getFiltered() {
  let result = allIndicators;
  if (activeArea !== 'all') result = result.filter(i => i.area === activeArea);
  if (activeSignal !== 'all') result = result.filter(i => i.signal === activeSignal);
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    result = result.filter(i =>
      i.name.toLowerCase().includes(q) ||
      i.domain.toLowerCase().includes(q) ||
      i.subdomain?.toLowerCase().includes(q)
    );
  }
  return result;
}

// ====== RENDERING ======

function renderGrid() {
  const grid = document.getElementById('indicatorGrid');
  const noResults = document.getElementById('noResults');
  grid.innerHTML = '';

  const filtered = getFiltered();

  // Scorecard vždy nad celou sadou (jen oblastní filtr)
  const forScorecard = activeArea === 'all'
    ? allIndicators
    : allIndicators.filter(i => i.area === activeArea);
  updateScorecard(forScorecard);

  const count = filtered.length;
  document.getElementById('gridBadge').textContent =
    `${count} indikátor${count === 1 ? '' : (count < 5 ? 'y' : 'ů')}`;
  document.getElementById('gridTitle').textContent =
    activeArea === 'all' ? 'Všechny indikátory' : `Oblast: ${activeArea}`;

  if (count === 0) {
    noResults.classList.remove('hidden');
    return;
  }
  noResults.classList.add('hidden');

  const charts = [];
  filtered.forEach((ind) => {
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

  // Render sparkliny po vložení do DOM
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

// ====== METODICKÁ KARTA (modal) ======

let benchmarkChartInstance = null;

async function openMethodCard(indicator) {
  const modal = document.getElementById('modalBackdrop');
  const content = document.getElementById('modalContent');
  content.innerHTML = '<p>Načítám metodickou kartu…</p>';
  modal.classList.remove('hidden');

  if (benchmarkChartInstance) {
    benchmarkChartInstance.destroy();
    benchmarkChartInstance = null;
  }

  try {
    const res = await fetch(indicator.method_card_url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const card = await res.json();

    const benchOECD = indicator.benchmark?.oecd ?? null;
    const benchEU = indicator.benchmark?.eu ?? null;
    const hasBenchmark = benchOECD != null || benchEU != null;

    const benchmarkSection = hasBenchmark ? `
      <h3 style="margin-top:22px; font-size:14px;">Srovnání s benchmarkem</h3>
      <div style="position:relative; height:90px; margin-top:8px;">
        <canvas id="benchmarkChart"></canvas>
      </div>
    ` : '';

    content.innerHTML = `
      <h2>${card.name}</h2>
      <div class="sub">${card.area} · ${card.domain} · ${card.subdomain || ''}</div>
      <dl>
        <dt>Definice</dt><dd>${card.definition}</dd>
        <dt>Jednotka</dt><dd>${card.unit}</dd>
        <dt>Směr</dt><dd>${card.direction}</dd>
        <dt>Frekvence</dt><dd>${card.frequency}</dd>
        <dt>Garanti</dt><dd>${(card.stewards || []).join(', ')}</dd>
        <dt>Prahy signálu</dt><dd>good ≥ +${card.signal_thresholds.good} %, warn ≥ −${card.signal_thresholds.warn} %</dd>
        <dt>Metodika</dt><dd>${card.method_notes}</dd>
        <dt>Omezení</dt><dd>${card.limitations}</dd>
      </dl>
      ${benchmarkSection}
      <h3 style="margin-top:18px; font-size:14px;">Zdroje dat</h3>
      <pre>${JSON.stringify(card.data_source, null, 2)}</pre>
    `;

    if (hasBenchmark) {
      renderBenchmarkChart(indicator);
    }
  } catch (err) {
    content.innerHTML = `<p>Nepodařilo se načíst metodickou kartu: ${err.message}</p>`;
  }
}

function renderBenchmarkChart(indicator) {
  const ctx = document.getElementById('benchmarkChart');
  if (!ctx) return;

  const labels = ['ČR'];
  const values = [indicator.value];
  const colors = ['#0B5394'];

  if (indicator.benchmark?.oecd != null) {
    labels.push('OECD průměr');
    values.push(indicator.benchmark.oecd);
    colors.push('#5A6770');
  }
  if (indicator.benchmark?.eu != null) {
    labels.push('EU průměr');
    values.push(indicator.benchmark.eu);
    colors.push('#B45F06');
  }

  // eslint-disable-next-line no-undef
  benchmarkChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: colors,
        borderRadius: 4,
        barThickness: 28,
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          displayColors: false,
          callbacks: {
            label: (ctx) => `${ctx.parsed.x} ${indicator.unit}`
          }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 10 }, color: '#888' } },
        y: { grid: { display: false }, ticks: { font: { size: 11 }, color: '#333' } }
      }
    }
  });
}

function closeModal() {
  document.getElementById('modalBackdrop').classList.add('hidden');
  if (benchmarkChartInstance) {
    benchmarkChartInstance.destroy();
    benchmarkChartInstance = null;
  }
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

  // Signal filter
  document.querySelectorAll('.sig-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.sig-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeSignal = btn.dataset.sig;
      renderGrid();
    });
  });

  // Search
  document.getElementById('searchInput').addEventListener('input', (e) => {
    searchQuery = e.target.value.trim();
    renderGrid();
  });

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
  wireUp();
  try {
    await loadData();
    renderGrid();
  } catch (err) {
    console.error('Initial load failed:', err);
  }
})();
