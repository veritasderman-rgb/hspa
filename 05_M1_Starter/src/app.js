// Frontend logika dashboardu Zdravé Česko.
// Načítá data z /data/indicators.json a renderuje karty.
// Žádné inline data — jediný zdroj pravdy je JSON file.

const DATA_URL = 'data/indicators.json';
const REGIONS_URL = 'data/regions.json';

let allIndicators = [];
let activeArea = 'all';
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

/** Vrátí ↑ ↓ nebo → podle posledních dvou hodnot trendu. */
function trendArrow(trend) {
  if (!Array.isArray(trend) || trend.length < 2) return '';
  const last = trend[trend.length - 1].value;
  const prev = trend[trend.length - 2].value;
  if (last > prev) return '↑';
  if (last < prev) return '↓';
  return '→';
}

/** CSS třída šipky podle směru a signálu indikátoru. */
function arrowClass(trend, signal, direction) {
  const arrow = trendArrow(trend);
  if (!arrow || arrow === '→') return 'arrow-neutral';
  const up = arrow === '↑';
  const good = direction === 'lower_is_better' ? !up : up;
  if (signal === 'neutral') return 'arrow-neutral';
  return good ? 'arrow-good' : 'arrow-bad';
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

// ====== SUMMARY BAR ======

function renderSummary(indicators) {
  const counts = { good: 0, warn: 0, bad: 0, neutral: 0 };
  for (const ind of indicators) counts[ind.signal] = (counts[ind.signal] || 0) + 1;
  const total = indicators.length;
  const bar = document.getElementById('summaryBar');
  bar.innerHTML = `
    <span class="sum-label">Celkem ${total} indikátorů:</span>
    <span class="sum-chip good" title="Dobré">
      <span class="sum-dot good"></span>${counts.good} dobrých
    </span>
    <span class="sum-chip warn" title="Varování">
      <span class="sum-dot warn"></span>${counts.warn} varování
    </span>
    <span class="sum-chip bad" title="Špatné">
      <span class="sum-dot bad"></span>${counts.bad} špatných
    </span>
    ${counts.neutral ? `<span class="sum-chip neutral" title="Kontextový">
      <span class="sum-dot neutral"></span>${counts.neutral} kontextových
    </span>` : ''}
  `;
}

// ====== RENDERING ======

function filterIndicators() {
  let filtered = activeArea === 'all'
    ? allIndicators
    : allIndicators.filter(i => i.area === activeArea);
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(i =>
      i.name.toLowerCase().includes(q) ||
      i.domain.toLowerCase().includes(q) ||
      i.subdomain.toLowerCase().includes(q) ||
      i.area.toLowerCase().includes(q)
    );
  }
  return filtered;
}

function renderGrid() {
  const grid = document.getElementById('indicatorGrid');
  grid.innerHTML = '';
  const noRes = document.getElementById('noResults');
  const filtered = filterIndicators();

  const suffix = filtered.length === 1 ? '' : filtered.length < 5 ? 'y' : 'ů';
  document.getElementById('gridBadge').textContent = `${filtered.length} indikátor${suffix}`;
  document.getElementById('gridTitle').textContent =
    activeArea === 'all' ? 'Všechny indikátory' : `Oblast: ${activeArea}`;

  if (filtered.length === 0) {
    noRes.classList.remove('hidden');
    return;
  }
  noRes.classList.add('hidden');

  const charts = [];
  filtered.forEach((ind) => {
    const card = document.createElement('div');
    card.className = 'indicator-card';
    card.dataset.indicatorId = ind.id;

    const chartId = `chart-${ind.id}`;
    const benchmark = ind.benchmark?.oecd ?? ind.benchmark?.eu ?? null;
    const benchLabel = ind.benchmark?.oecd != null ? 'OECD' : 'EU';
    const compareHTML = benchmark != null
      ? `<div class="compare">vs. ${benchLabel} průměr: <strong>${benchmark}${ind.unit ? ' ' + ind.unit : ''}</strong></div>`
      : '';

    const arrow = trendArrow(ind.trend);
    const aClass = arrowClass(ind.trend, ind.signal, ind.direction);

    card.innerHTML = `
      <div class="area-tag">${ind.area} · ${ind.domain}</div>
      <div class="top">
        <h4>${ind.name}</h4>
        <div class="signal ${ind.signal}" title="Hodnocení: ${ind.signal}"></div>
      </div>
      <div class="value-row">
        <span class="big-value">${ind.value}</span>
        <span class="unit">${ind.unit}</span>
        ${arrow ? `<span class="trend-arrow ${aClass}" title="Trend">${arrow}</span>` : ''}
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
        : ind.signal === 'bad' ? '#990000' : '#5A6770';
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

function formatDataSource(ds) {
  if (!ds || typeof ds !== 'object') return '<em>Není k dispozici</em>';
  const rows = [];
  const primary = ds.primary || ds;
  if (primary.type) rows.push(`<dt>Typ</dt><dd>${primary.type}</dd>`);
  if (primary.endpoint) rows.push(`<dt>Endpoint</dt><dd><code>${primary.endpoint}</code></dd>`);
  if (primary.code) rows.push(`<dt>Kód</dt><dd>${primary.code}</dd>`);
  if (primary.dataset) rows.push(`<dt>Dataset</dt><dd>${primary.dataset}</dd>`);
  if (primary.note) rows.push(`<dt>Poznámka</dt><dd>${primary.note}</dd>`);
  if (ds.fallback) {
    rows.push(`<dt>Záloha</dt><dd>${ds.fallback.type || ''}${ds.fallback.note ? ' — ' + ds.fallback.note : ''}</dd>`);
  }
  return `<dl class="source-dl">${rows.join('')}</dl>`;
}

async function openMethodCard(indicator) {
  const modal = document.getElementById('modalBackdrop');
  const content = document.getElementById('modalContent');
  content.innerHTML = '<p>Načítám metodickou kartu…</p>';
  modal.classList.remove('hidden');
  document.getElementById('modal').focus();

  try {
    const res = await fetch(indicator.method_card_url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const card = await res.json();

    const dirLabel = { higher_is_better: 'Vyšší = lepší', lower_is_better: 'Nižší = lepší', context_dependent: 'Kontextový' };
    const arrow = trendArrow(indicator.trend);
    const aClass = arrowClass(indicator.trend, indicator.signal, card.direction);

    content.innerHTML = `
      <h2 id="modalTitle">${card.name}</h2>
      <div class="sub">${card.area} · ${card.domain}${card.subdomain ? ' · ' + card.subdomain : ''}</div>
      <div class="modal-value-row">
        <span class="modal-value">${indicator.value}</span>
        <span class="modal-unit">${card.unit}</span>
        ${arrow ? `<span class="trend-arrow ${aClass}" style="font-size:22px">${arrow}</span>` : ''}
        <span class="signal ${indicator.signal}" style="width:16px;height:16px;margin-left:6px;" title="${indicator.signal}"></span>
      </div>
      <dl class="modal-dl">
        <dt>Definice</dt><dd>${card.definition}</dd>
        <dt>Jednotka</dt><dd>${card.unit}</dd>
        <dt>Směr</dt><dd>${dirLabel[card.direction] || card.direction}</dd>
        <dt>Frekvence</dt><dd>${card.frequency}</dd>
        <dt>Garanti</dt><dd>${(card.stewards || []).join(', ')}</dd>
        <dt>Prahy signálu</dt><dd>dobré ≥ +${card.signal_thresholds.good} %, varování ≥ −${card.signal_thresholds.warn} %</dd>
        <dt>Metodika</dt><dd>${card.method_notes}</dd>
        <dt>Omezení</dt><dd>${card.limitations}</dd>
      </dl>
      <h3 class="modal-section-head">Zdroj dat</h3>
      ${formatDataSource(card.data_source)}
    `;
  } catch (err) {
    content.innerHTML = `<p class="status error">Nepodařilo se načíst metodickou kartu: ${err.message}</p>`;
  }
}

function closeModal() {
  document.getElementById('modalBackdrop').classList.add('hidden');
}

// ====== REGIONY ======

async function loadRegions() {
  try {
    const res = await fetch(REGIONS_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    return null;
  }
}

function renderRegions(data) {
  if (!data) {
    document.getElementById('regionSection').style.display = 'none';
    return;
  }
  document.getElementById('regionDesc').textContent = data.indicator_name;
  const tbody = document.getElementById('regionTbody');
  tbody.innerHTML = '';

  const sorted = [...data.regions].sort((a, b) => b.value - a.value);
  const avg = data.country_avg;

  sorted.forEach((r, idx) => {
    const diff = r.value - avg;
    const diffStr = (diff >= 0 ? '+' : '') + diff.toFixed(1);
    const diffClass = diff >= 0 ? 'diff-pos' : 'diff-neg';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span class="rank">${idx + 1}</span> ${r.name}</td>
      <td class="num"><strong>${r.value}</strong></td>
      <td class="num">${r.doctors_per_1000}</td>
      <td><span class="diff ${diffClass}">${diffStr}</span>
          <span class="mini-bar"><span style="width:${Math.min(Math.abs(diff) * 10, 100)}%;background:${diff >= 0 ? 'var(--good)' : 'var(--bad)'}"></span></span>
      </td>
    `;
    tbody.appendChild(tr);
  });
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

  // Vyhledávání
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
      renderSummary(allIndicators);
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
    const [, regions] = await Promise.all([loadData(), loadRegions()]);
    renderSummary(allIndicators);
    renderGrid();
    renderRegions(regions);
  } catch (err) {
    console.error('Initial load failed:', err);
  }
})();
