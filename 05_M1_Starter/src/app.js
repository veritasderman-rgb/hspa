// Frontend logika dashboardu Zdravé Česko.
// Načítá data z /data/indicators.json a renderuje karty.
// Žádné inline data — jediný zdroj pravdy je JSON file.

const DATA_URL = 'data/indicators.json';
const REGIONS_URL = 'data/regions.json';

let allIndicators = [];
let activeArea = 'all';
let searchQuery = '';
let sortMode = 'default';

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

// Vrátí objekt { arrow, cls, pct } pro poslední rok vs předchozí
function calcTrend(ind) {
  if (!Array.isArray(ind.trend) || ind.trend.length < 2) return null;
  const sorted = [...ind.trend].sort((a, b) => a.year - b.year);
  const last = sorted[sorted.length - 1].value;
  const prev = sorted[sorted.length - 2].value;
  if (prev === 0) return null;
  const pct = ((last - prev) / Math.abs(prev)) * 100;
  const isGoodUp = ind.direction !== 'lower_is_better';
  if (Math.abs(pct) < 0.05) return { arrow: '→', cls: 'flat', pct: 0 };
  if (pct > 0) return { arrow: '↑', cls: isGoodUp ? 'up' : 'down', pct };
  return { arrow: '↓', cls: isGoodUp ? 'down' : 'up', pct };
}

const SIGNAL_ORDER = { good: 0, warn: 1, bad: 2, neutral: 3 };

function applyFiltersAndSort(indicators) {
  let list = indicators;
  if (activeArea !== 'all') list = list.filter(i => i.area === activeArea);
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    list = list.filter(i =>
      i.name.toLowerCase().includes(q) ||
      (i.domain || '').toLowerCase().includes(q) ||
      (i.subdomain || '').toLowerCase().includes(q)
    );
  }
  if (sortMode === 'signal') {
    list = [...list].sort((a, b) => (SIGNAL_ORDER[a.signal] ?? 9) - (SIGNAL_ORDER[b.signal] ?? 9));
  } else if (sortMode === 'name') {
    list = [...list].sort((a, b) => a.name.localeCompare(b.name, 'cs'));
  } else if (sortMode === 'trend') {
    list = [...list].sort((a, b) => {
      const ta = calcTrend(a);
      const tb = calcTrend(b);
      return (tb?.pct ?? 0) - (ta?.pct ?? 0);
    });
  }
  return list;
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
  indicators.forEach(i => { if (counts[i.signal] !== undefined) counts[i.signal]++; });
  document.getElementById('scoreGood').textContent = counts.good;
  document.getElementById('scoreWarn').textContent = counts.warn;
  document.getElementById('scoreBad').textContent = counts.bad;
  document.getElementById('scoreNeutral').textContent = counts.neutral;
  const total = indicators.length;
  const pct = total ? Math.round((counts.good / total) * 100) : 0;
  document.getElementById('scoreBar').style.width = `${pct}%`;
  document.getElementById('scoreBar').title = `${pct} % indikátorů v zelené zóně`;
}

// ====== RENDERING ======

function renderGrid() {
  const grid = document.getElementById('indicatorGrid');
  grid.innerHTML = '';
  const filtered = applyFiltersAndSort(allIndicators);

  document.getElementById('gridBadge').textContent =
    `${filtered.length} indikátor${filtered.length === 1 ? '' : (filtered.length < 5 ? 'y' : 'ů')}`;
  document.getElementById('gridTitle').textContent =
    activeArea === 'all' ? 'Všechny indikátory' : `Oblast: ${activeArea}`;

  updateScorecard(filtered);

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

    const trendInfo = calcTrend(ind);
    const trendHTML = trendInfo
      ? `<span class="trend-arrow ${trendInfo.cls}" title="Meziroční změna">
           ${trendInfo.arrow} ${Math.abs(trendInfo.pct).toFixed(1)} %
         </span>`
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
        ${trendHTML}
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

// ====== REGIONÁLNÍ PŘEHLED ======

let regionSortCol = 'value';
let regionSortAsc = false;

async function loadAndRenderRegions() {
  try {
    const res = await fetch(REGIONS_URL);
    if (!res.ok) return;
    const data = await res.json();
    renderRegionTable(data.regions, data.country_avg, data.indicator_name);
  } catch {
    document.getElementById('regionGrid').textContent = 'Data regionů nedostupná.';
  }
}

function renderRegionTable(regions, countryAvg, label) {
  const sorted = [...regions].sort((a, b) =>
    regionSortAsc ? a[regionSortCol] - b[regionSortCol] : b[regionSortCol] - a[regionSortCol]
  );
  const maxVal = Math.max(...regions.map(r => r.value));
  const minVal = Math.min(...regions.map(r => r.value));
  const range = maxVal - minVal || 1;

  const grid = document.getElementById('regionGrid');
  grid.innerHTML = `
    <table class="region-table" aria-label="Regionální přehled: ${label}">
      <thead>
        <tr>
          <th data-col="name" style="width:180px">Kraj ▲▼</th>
          <th data-col="value">Hodnota (let)</th>
          <th class="region-bar-cell">Relativní hodnota</th>
          <th data-col="doctors_per_1000">Lékaři / 1 000 ob.</th>
          <th>Rozdíl od průměru ČR</th>
        </tr>
      </thead>
      <tbody>
        ${sorted.map(r => {
          const diff = (r.value - countryAvg).toFixed(1);
          const diffCls = r.value >= countryAvg ? 'pos' : 'neg';
          const barPct = Math.round(((r.value - minVal) / range) * 100);
          return `<tr>
            <td><strong>${r.name}</strong></td>
            <td>${r.value}</td>
            <td class="region-bar-cell">
              <div class="region-bar-track">
                <div class="region-bar-fill" style="width:${barPct}%"></div>
              </div>
            </td>
            <td>${r.doctors_per_1000}</td>
            <td class="region-diff ${diffCls}">${diff >= 0 ? '+' : ''}${diff}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
  `;

  // Sortovatelné hlavičky
  grid.querySelectorAll('th[data-col]').forEach(th => {
    th.style.cursor = 'pointer';
    th.addEventListener('click', () => {
      const col = th.dataset.col;
      if (regionSortCol === col) regionSortAsc = !regionSortAsc;
      else { regionSortCol = col; regionSortAsc = col === 'name'; }
      renderRegionTable(regions, countryAvg, label);
    });
  });
}

// ====== METODICKÁ KARTA (modal) ======

async function openMethodCard(indicator) {
  const modal = document.getElementById('modalBackdrop');
  const content = document.getElementById('modalContent');
  content.innerHTML = '<p>Načítám metodickou kartu…</p>';
  modal.classList.remove('hidden');

  try {
    const res = await fetch(indicator.method_card_url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const card = await res.json();

    content.innerHTML = `
      <h2>${card.name}</h2>
      <div class="sub">${card.area} · ${card.domain} · ${card.subdomain || ''}</div>
      <dl>
        <dt>Definice</dt><dd>${card.definition}</dd>
        <dt>Jednotka</dt><dd>${card.unit}</dd>
        <dt>Směr</dt><dd>${card.direction}</dd>
        <dt>Frekvence</dt><dd>${card.frequency}</dd>
        <dt>Garanti</dt><dd>${(card.stewards || []).join(', ')}</dd>
        <dt>Prahy signálu</dt><dd>good ≥ ${card.signal_thresholds.good} %, warn ≥ −${card.signal_thresholds.warn} %</dd>
        <dt>Metodika</dt><dd>${card.method_notes}</dd>
        <dt>Omezení</dt><dd>${card.limitations}</dd>
      </dl>
      <h3 style="margin-top:18px; font-size:14px;">Zdroje dat</h3>
      <pre>${JSON.stringify(card.data_source, null, 2)}</pre>
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
  document.getElementById('searchInput').addEventListener('input', (e) => {
    searchQuery = e.target.value.trim();
    renderGrid();
  });

  // Sort
  document.getElementById('sortSelect').addEventListener('change', (e) => {
    sortMode = e.target.value;
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
    await loadAndRenderRegions();
  } catch (err) {
    console.error('Initial load failed:', err);
  }
})();
