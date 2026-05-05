// Frontend logika dashboardu Zdravé Česko.
// Načítá data z /data/indicators.json a renderuje karty.
// Žádné inline data — jediný zdroj pravdy je JSON file.

const DATA_URL = 'data/indicators.json';
const LS_KEY = 'zdrave_cesko_indicators_cache';

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

function exportCsv(indicator) {
  if (!Array.isArray(indicator.trend) || !indicator.trend.length) return;
  const header = 'rok,hodnota,jednotka\n';
  const rows = indicator.trend.map(t => `${t.year},${t.value},${indicator.unit}`).join('\n');
  const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${indicator.id}_trend.csv`;
  a.click();
  URL.revokeObjectURL(url);
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
    // Uložit do localStorage jako fallback pro příští offline load
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(data));
    } catch (_) { /* ignore quota errors */ }
    clearStatus();
    return data;
  } catch (err) {
    // Zkusit localStorage fallback
    const cached = loadFromCache();
    if (cached) {
      allIndicators = cached.indicators || [];
      document.getElementById('lastUpdated').textContent =
        `Záloha z ${fmtRelative(cached.generated_at)}`;
      showStatus(`Nepodařilo se načíst čerstvá data (${err.message}). Zobrazuji uloženou zálohu.`, 'warn');
      return cached;
    }
    showStatus(`Nepodařilo se načíst data: ${err.message}`, 'error');
    throw err;
  }
}

function loadFromCache() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

// ====== SUMMARY BAR ======

function renderSummaryBar() {
  const bar = document.getElementById('summaryBar');
  if (!allIndicators.length) { bar.innerHTML = ''; return; }

  const counts = { good: 0, warn: 0, bad: 0, neutral: 0 };
  for (const ind of allIndicators) counts[ind.signal] = (counts[ind.signal] || 0) + 1;

  const labels = {
    good: { label: 'Lepší než OECD', color: 'var(--good)' },
    warn: { label: 'Srovnatelné', color: 'var(--warn)' },
    bad: { label: 'Horší než OECD', color: 'var(--bad)' },
    neutral: { label: 'Bez benchmarku', color: 'var(--neutral)' },
  };

  bar.innerHTML = Object.entries(labels)
    .filter(([k]) => counts[k] > 0)
    .map(([k, { label, color }]) => `
      <div class="summary-chip" title="${label}">
        <span class="dot" style="background:${color}"></span>
        <span class="count" style="color:${color}">${counts[k]}</span>
        <span class="label">${label}</span>
      </div>
    `).join('');
}

// ====== RENDERING ======

function getFiltered() {
  let list = activeArea === 'all'
    ? allIndicators
    : allIndicators.filter(i => i.area === activeArea);

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    list = list.filter(i =>
      i.name.toLowerCase().includes(q) ||
      i.domain.toLowerCase().includes(q) ||
      (i.subdomain || '').toLowerCase().includes(q) ||
      i.area.toLowerCase().includes(q)
    );
  }
  return list;
}

function renderGrid() {
  const grid = document.getElementById('indicatorGrid');
  const noResults = document.getElementById('noResults');
  grid.innerHTML = '';

  const filtered = getFiltered();

  const count = filtered.length;
  document.getElementById('gridBadge').textContent =
    `${count} indikátor${count === 1 ? '' : (count >= 2 && count <= 4 ? 'y' : 'ů')}`;
  document.getElementById('gridTitle').textContent =
    activeArea === 'all' ? 'Všechny indikátory' : `Oblast: ${activeArea}`;

  if (!count) {
    noResults.classList.remove('hidden');
    return;
  }
  noResults.classList.add('hidden');

  const charts = [];
  filtered.forEach((ind) => {
    const card = document.createElement('div');
    card.className = 'indicator-card';
    card.dataset.indicatorId = ind.id;
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `${ind.name}: ${ind.value} ${ind.unit}. Klikněte pro metodickou kartu.`);

    const chartId = `chart-${ind.id}`;
    const benchmark = ind.benchmark?.oecd ?? ind.benchmark?.eu ?? null;
    const benchmarkLabel = ind.benchmark?.oecd != null ? 'OECD' : (ind.benchmark?.eu != null ? 'EU' : null);
    const compareHTML = benchmark != null
      ? `<div class="compare">vs. ${benchmarkLabel} průměr: <strong>${benchmark}${ind.unit ? ' ' + ind.unit : ''}</strong></div>`
      : '';

    const hasTrend = Array.isArray(ind.trend) && ind.trend.length;

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
      ${hasTrend ? `<div class="chart-wrap"><canvas id="${chartId}" aria-hidden="true"></canvas></div>` : ''}
      <div class="card-footer">
        <span class="source">Zdroj: <a href="${ind.source.url}" target="_blank" rel="noopener" onclick="event.stopPropagation()">${ind.source.name}</a></span>
        ${hasTrend ? `<button class="btn-csv" title="Stáhnout trendy jako CSV" aria-label="Stáhnout ${ind.name} jako CSV" data-id="${ind.id}">↓ CSV</button>` : ''}
      </div>
    `;

    card.addEventListener('click', () => openMethodCard(ind));
    card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') openMethodCard(ind); });
    grid.appendChild(card);

    if (hasTrend) charts.push({ ind, chartId });
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

function fmtDataSource(source) {
  if (!source || typeof source !== 'object') return String(source);

  function flatRows(obj, prefix = '') {
    const rows = [];
    for (const [k, v] of Object.entries(obj)) {
      const label = prefix ? `${prefix}.${k}` : k;
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        rows.push(...flatRows(v, label));
      } else {
        rows.push([label, Array.isArray(v) ? v.join(', ') : String(v)]);
      }
    }
    return rows;
  }

  const rows = flatRows(source);
  return `<table class="modal-source-table">${rows.map(([k, v]) =>
    `<tr><td>${k}</td><td>${v}</td></tr>`
  ).join('')}</table>`;
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

    const signalLabel = { good: 'Lepší než OECD', warn: 'Srovnatelné', bad: 'Horší než OECD', neutral: '–' };

    content.innerHTML = `
      <h2>${card.name}</h2>
      <div class="sub">${card.area ?? indicator.area} · ${card.domain} · ${card.subdomain || ''}</div>
      <dl>
        <dt>Definice</dt><dd>${card.definition}</dd>
        <dt>Jednotka</dt><dd>${card.unit}</dd>
        <dt>Směr</dt><dd>${card.direction === 'higher_is_better' ? 'Vyšší = lepší' : card.direction === 'lower_is_better' ? 'Nižší = lepší' : card.direction}</dd>
        <dt>Frekvence</dt><dd>${card.frequency}</dd>
        <dt>Garanti</dt><dd>${(card.stewards || []).join(', ')}</dd>
        <dt>Prahy signálu</dt><dd>
          <span class="signal good" style="display:inline-block;vertical-align:middle;margin-right:4px"></span>good ≥ +${card.signal_thresholds.good} % ·
          <span class="signal bad" style="display:inline-block;vertical-align:middle;margin:0 4px"></span>bad &lt; −${card.signal_thresholds.warn} %
        </dd>
        <dt>Metodika</dt><dd>${card.method_notes}</dd>
        <dt>Omezení</dt><dd>${card.limitations}</dd>
      </dl>
      <h3 style="margin-top:18px; font-size:14px;">Datové zdroje</h3>
      ${fmtDataSource(card.data_source)}
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

  // Reload button
  document.getElementById('btnReload').addEventListener('click', async () => {
    const btn = document.getElementById('btnReload');
    btn.disabled = true;
    btn.textContent = 'Načítám…';
    try {
      await loadData(true);
      renderSummaryBar();
      renderGrid();
    } finally {
      btn.disabled = false;
      btn.textContent = '⟳ Načíst znovu';
    }
  });

  // Search
  document.getElementById('searchInput').addEventListener('input', (e) => {
    searchQuery = e.target.value.trim();
    renderGrid();
  });

  // CSV export (delegace na grid)
  document.getElementById('indicatorGrid').addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-csv');
    if (!btn) return;
    e.stopPropagation();
    const ind = allIndicators.find(i => i.id === btn.dataset.id);
    if (ind) exportCsv(ind);
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
    renderSummaryBar();
    renderGrid();
  } catch (err) {
    console.error('Initial load failed:', err);
  }
})();
