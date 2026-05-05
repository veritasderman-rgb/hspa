// Frontend logika dashboardu Zdravé Česko.
// Načítá data z /data/indicators.json a renderuje karty.
// Žádné inline data — jediný zdroj pravdy je JSON file.

const DATA_URL = 'data/indicators.json';

let allIndicators = [];
let activeArea = 'all';
let searchQuery = '';
const chartInstances = new Map(); // id → Chart instance, pro správný destroy

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

// ====== STATS BAR ======

function renderStatsBar(indicators) {
  const counts = { good: 0, warn: 0, bad: 0, neutral: 0 };
  indicators.forEach(i => { if (counts[i.signal] != null) counts[i.signal]++; });
  const total = indicators.length;
  const bar = document.getElementById('statsBar');
  bar.innerHTML = `
    <span class="stat-item good"><span class="stat-dot good"></span>${counts.good} dobré</span>
    <span class="stat-item warn"><span class="stat-dot warn"></span>${counts.warn} sledované</span>
    <span class="stat-item bad"><span class="stat-dot bad"></span>${counts.bad} kritické</span>
    <span class="stat-total">${total} celkem</span>
  `;
}

// ====== RENDERING ======

function getFilteredIndicators() {
  let list = activeArea === 'all' ? allIndicators : allIndicators.filter(i => i.area === activeArea);
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    list = list.filter(i =>
      i.name.toLowerCase().includes(q) ||
      i.domain.toLowerCase().includes(q) ||
      i.subdomain?.toLowerCase().includes(q)
    );
  }
  return list;
}

function destroyCharts() {
  chartInstances.forEach(chart => chart.destroy());
  chartInstances.clear();
}

function renderGrid() {
  destroyCharts();
  const grid = document.getElementById('indicatorGrid');
  grid.innerHTML = '';
  const filtered = getFilteredIndicators();

  renderStatsBar(filtered);

  const count = filtered.length;
  const suffix = count === 1 ? '' : count < 5 ? 'y' : 'ů';
  document.getElementById('gridBadge').textContent = `${count} indikátor${suffix}`;
  document.getElementById('gridTitle').textContent =
    activeArea === 'all' ? 'Všechny indikátory' : `Oblast: ${activeArea}`;

  if (count === 0) {
    grid.innerHTML = '<p class="no-results">Žádné indikátory neodpovídají hledání.</p>';
    return;
  }

  const pendingCharts = [];
  filtered.forEach(ind => {
    const card = document.createElement('div');
    card.className = 'indicator-card';
    card.dataset.indicatorId = ind.id;
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `${ind.name}: ${ind.value} ${ind.unit}`);

    const chartId = `chart-${ind.id}`;
    const benchmark = ind.benchmark?.oecd ?? ind.benchmark?.eu ?? null;
    const benchmarkLabel = ind.benchmark?.oecd != null ? 'OECD' : 'EU';
    const compareHTML = benchmark != null
      ? `<div class="compare">vs. ${benchmarkLabel} průměr: <strong>${benchmark}${ind.unit ? ' ' + ind.unit : ''}</strong></div>`
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
        <span class="year-badge">${ind.year}</span>
      </div>
      ${compareHTML}
      <div class="chart-wrap"><canvas id="${chartId}"></canvas></div>
      <div class="source">Zdroj: ${ind.source.name}</div>
    `;

    const open = () => openMethodCard(ind);
    card.addEventListener('click', open);
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
    grid.appendChild(card);

    if (Array.isArray(ind.trend) && ind.trend.length) {
      pendingCharts.push({ ind, chartId });
    }
  });

  // Render sparklines po vložení do DOM
  setTimeout(() => {
    pendingCharts.forEach(({ ind, chartId }) => {
      const ctx = document.getElementById(chartId);
      if (!ctx) return;
      const color = ind.signal === 'good' ? '#38761D'
        : ind.signal === 'warn' ? '#B45F06'
        : ind.signal === 'bad' ? '#990000' : '#0B5394';
      // eslint-disable-next-line no-undef
      const chart = new Chart(ctx, {
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
      chartInstances.set(ind.id, chart);
    });
  }, 50);
}

// ====== METODICKÁ KARTA (modal) ======

function renderDataSource(ds) {
  if (!ds || typeof ds !== 'object') return '';
  const rows = Object.entries(ds).map(([key, val]) => {
    if (val && typeof val === 'object') {
      const inner = Object.entries(val)
        .map(([k, v]) => `<span class="ds-key">${k}:</span> ${JSON.stringify(v)}`)
        .join(' · ');
      return `<div class="ds-row"><strong>${key}:</strong> ${inner}</div>`;
    }
    return `<div class="ds-row"><strong>${key}:</strong> ${val}</div>`;
  });
  return `<div class="data-source-block">${rows.join('')}</div>`;
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

    const signalMap = { good: 'dobré', warn: 'sledované', bad: 'kritické', neutral: 'neutrální' };

    content.innerHTML = `
      <h2>${card.name}</h2>
      <div class="sub">${card.area} · ${card.domain} · ${card.subdomain || ''}</div>
      <dl>
        <dt>Definice</dt><dd>${card.definition}</dd>
        <dt>Jednotka</dt><dd>${card.unit}</dd>
        <dt>Směr</dt><dd>${card.direction === 'higher_is_better' ? '↑ více = lépe' : card.direction === 'lower_is_better' ? '↓ méně = lépe' : 'závisí na kontextu'}</dd>
        <dt>Frekvence</dt><dd>${card.frequency}</dd>
        <dt>Garanti</dt><dd>${(card.stewards || []).join(', ')}</dd>
        <dt>Prahy signálu</dt><dd>dobré ≥ +${card.signal_thresholds.good} % od benchmarku · kritické ≥ −${card.signal_thresholds.warn} %</dd>
        <dt>Metodika</dt><dd>${card.method_notes}</dd>
        <dt>Omezení</dt><dd>${card.limitations}</dd>
      </dl>
      <h3 class="modal-section-title">Zdroje dat</h3>
      ${renderDataSource(card.data_source)}
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

  // Search input
  document.getElementById('searchInput').addEventListener('input', e => {
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
