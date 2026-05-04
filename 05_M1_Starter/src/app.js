// Frontend logika dashboardu Zdravé Česko.
// Načítá data z /data/indicators.json a renderuje karty.
// Žádné inline data — jediný zdroj pravdy je JSON file.

const DATA_URL = 'data/indicators.json';
const LS_KEY = 'zdrave_cesko_cache';

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

function signalLabel(s) {
  return s === 'good' ? 'Dobré' : s === 'warn' ? 'Sledované' : s === 'bad' ? 'Kritické' : 'Neutral';
}

function pctDelta(value, benchmark) {
  if (benchmark == null || benchmark === 0) return null;
  return ((value - benchmark) / benchmark * 100).toFixed(1);
}

// ====== LOCALSTORAGE CACHE ======

function saveToCache(data) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ ts: Date.now(), data }));
  } catch {}
}

function loadFromCache() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const { data } = JSON.parse(raw);
    return data;
  } catch {
    return null;
  }
}

// ====== DATA LOADING ======

async function loadData(bustCache = false) {
  const url = bustCache ? `${DATA_URL}?t=${Date.now()}` : DATA_URL;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    allIndicators = data.indicators || [];
    saveToCache(data);
    document.getElementById('lastUpdated').textContent =
      `Aktualizováno ${fmtRelative(data.generated_at)}`;
    clearStatus();
    return data;
  } catch (err) {
    const cached = loadFromCache();
    if (cached) {
      allIndicators = cached.indicators || [];
      document.getElementById('lastUpdated').textContent =
        `⚠ Offline – cache z ${fmtRelative(cached.generated_at)}`;
      showStatus(`Nepodařilo se načíst živá data (${err.message}). Zobrazuji uloženou verzi.`, 'warn');
      return cached;
    }
    showStatus(`Nepodařilo se načíst data: ${err.message}`, 'error');
    throw err;
  }
}

// ====== SIGNAL SUMMARY ======

function renderSummary(indicators) {
  const counts = { good: 0, warn: 0, bad: 0, neutral: 0 };
  indicators.forEach(i => { counts[i.signal] = (counts[i.signal] || 0) + 1; });
  const total = indicators.length;

  document.getElementById('summaryGood').textContent = counts.good;
  document.getElementById('summaryWarn').textContent = counts.warn;
  document.getElementById('summaryBad').textContent = counts.bad;
  document.getElementById('summaryTotal').textContent = total;

  // Progress bar šířky
  ['good','warn','bad'].forEach(s => {
    const bar = document.getElementById(`bar-${s}`);
    if (bar) bar.style.width = total > 0 ? `${(counts[s]/total*100).toFixed(1)}%` : '0%';
  });
}

// ====== CSV EXPORT ======

function exportCsv(indicators) {
  const header = ['id','name','area','domain','value','unit','year','signal','oecd_benchmark','eu_benchmark','source'].join(';');
  const rows = indicators.map(i => [
    i.id, i.name, i.area, i.domain,
    i.value, i.unit, i.year, i.signal,
    i.benchmark?.oecd ?? '', i.benchmark?.eu ?? '',
    i.source?.name ?? ''
  ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(';'));

  const csv = '﻿' + [header, ...rows].join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `zdrave_cesko_indikatory_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ====== FILTERING & SORTING ======

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

  if (sortMode === 'signal') {
    const order = { bad: 0, warn: 1, good: 2, neutral: 3 };
    list = [...list].sort((a, b) => (order[a.signal] ?? 3) - (order[b.signal] ?? 3));
  } else if (sortMode === 'name') {
    list = [...list].sort((a, b) => a.name.localeCompare(b.name, 'cs'));
  } else if (sortMode === 'area') {
    list = [...list].sort((a, b) => a.area.localeCompare(b.area, 'cs'));
  }

  return list;
}

// ====== RENDERING ======

function renderGrid() {
  const grid = document.getElementById('indicatorGrid');
  grid.innerHTML = '';
  const filtered = getFiltered();

  document.getElementById('gridBadge').textContent =
    `${filtered.length} indikátor${filtered.length === 1 ? '' : (filtered.length < 5 ? 'y' : 'ů')}`;
  document.getElementById('gridTitle').textContent =
    activeArea === 'all' ? 'Všechny indikátory' : `Oblast: ${activeArea}`;

  renderSummary(filtered);

  if (filtered.length === 0) {
    grid.innerHTML = '<p class="no-results">Žádné indikátory neodpovídají filtru.</p>';
    return;
  }

  const charts = [];
  filtered.forEach(ind => {
    const card = document.createElement('div');
    card.className = 'indicator-card';
    card.dataset.indicatorId = ind.id;
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `Indikátor: ${ind.name}, hodnota ${ind.value} ${ind.unit}`);

    const chartId = `chart-${ind.id}`;
    const benchmark = ind.benchmark?.oecd ?? ind.benchmark?.eu ?? null;
    const delta = pctDelta(ind.value, benchmark);
    const deltaHTML = delta != null ? buildDeltaBadge(delta, ind) : '';

    const compareHTML = benchmark != null
      ? `<div class="compare">vs. OECD průměr: <strong>${benchmark}${ind.unit ? ' ' + ind.unit : ''}</strong>${deltaHTML}</div>`
      : '';

    card.innerHTML = `
      <div class="area-tag">${ind.area} · ${ind.domain}</div>
      <div class="top">
        <h4>${ind.name}</h4>
        <div class="signal ${ind.signal}" title="${signalLabel(ind.signal)}"></div>
      </div>
      <div class="value-row">
        <span class="big-value">${ind.value}</span>
        <span class="unit">${ind.unit}</span>
        <span class="year-tag">${ind.year}</span>
      </div>
      ${compareHTML}
      <div class="chart-wrap"><canvas id="${chartId}"></canvas></div>
      <div class="source">Zdroj: ${ind.source.name}</div>
    `;
    card.addEventListener('click', () => openMethodCard(ind));
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openMethodCard(ind); } });
    grid.appendChild(card);

    if (Array.isArray(ind.trend) && ind.trend.length) {
      charts.push({ ind, chartId, benchmark });
    }
  });

  setTimeout(() => {
    charts.forEach(({ ind, chartId, benchmark }) => {
      const ctx = document.getElementById(chartId);
      if (!ctx) return;
      const color = ind.signal === 'good' ? '#38761D'
        : ind.signal === 'warn' ? '#B45F06'
        : ind.signal === 'bad' ? '#990000' : '#0B5394';

      const datasets = [{
        data: ind.trend.map(t => t.value),
        borderColor: color, backgroundColor: color + '22',
        fill: true, tension: 0.3,
        pointRadius: 2, pointHoverRadius: 4, borderWidth: 2,
        label: 'ČR',
      }];

      if (benchmark != null) {
        datasets.push({
          data: ind.trend.map(() => benchmark),
          borderColor: '#9B9B9B', borderDash: [4, 3],
          backgroundColor: 'transparent',
          pointRadius: 0, borderWidth: 1.5,
          label: 'OECD',
        });
      }

      // eslint-disable-next-line no-undef
      new Chart(ctx, {
        type: 'line',
        data: { labels: ind.trend.map(t => t.year), datasets },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { display: benchmark != null, position: 'bottom', labels: { boxWidth: 12, font: { size: 9 }, color: '#888' } },
            tooltip: { displayColors: false },
          },
          scales: {
            x: { grid: { display: false }, ticks: { font: { size: 9 }, color: '#888' } },
            y: { grid: { display: false }, ticks: { font: { size: 9 }, color: '#888', maxTicksLimit: 3 } }
          }
        }
      });
    });
  }, 50);
}

function buildDeltaBadge(delta, ind) {
  const num = parseFloat(delta);
  const isGood = (ind.signal === 'good');
  const cls = num > 0 ? 'delta-pos' : num < 0 ? 'delta-neg' : 'delta-zero';
  const sign = num > 0 ? '+' : '';
  return `<span class="delta-badge ${cls}">${sign}${delta} %</span>`;
}

// ====== METODICKÁ KARTA (modal) ======

async function openMethodCard(indicator) {
  const modal = document.getElementById('modalBackdrop');
  const content = document.getElementById('modalContent');
  content.innerHTML = '<p class="loading-text">Načítám metodickou kartu…</p>';
  modal.classList.remove('hidden');
  // Focus trap
  document.getElementById('modalClose').focus();

  try {
    const res = await fetch(indicator.method_card_url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const card = await res.json();

    const benchmark = indicator.benchmark?.oecd ?? indicator.benchmark?.eu ?? null;
    const delta = pctDelta(indicator.value, benchmark);
    const deltaStr = delta != null ? ` (${delta > 0 ? '+' : ''}${delta} % vs. OECD)` : '';

    const sourceRows = Object.entries(card.data_source || {}).map(([key, val]) => {
      const desc = val.type ? `<strong>${val.type}</strong>` : '';
      const note = val.note ? ` — ${val.note}` : '';
      const code = val.code ? ` · kód: <code>${val.code}</code>` : '';
      return `<tr><td class="ds-key">${key}</td><td>${desc}${code}${note}</td></tr>`;
    }).join('');

    content.innerHTML = `
      <h2>${card.name}</h2>
      <div class="sub">${card.area} · ${card.domain}${card.subdomain ? ' · ' + card.subdomain : ''}</div>

      <div class="modal-value-row">
        <span class="modal-big-value">${indicator.value} ${indicator.unit}</span>
        <span class="signal ${indicator.signal}" title="${signalLabel(indicator.signal)}"></span>
        <span class="modal-delta">${deltaStr}</span>
      </div>

      <dl>
        <dt>Definice</dt><dd>${card.definition}</dd>
        <dt>Jednotka</dt><dd>${card.unit}</dd>
        <dt>Směr</dt><dd>${card.direction === 'higher_is_better' ? '↑ vyšší = lepší' : card.direction === 'lower_is_better' ? '↓ nižší = lepší' : 'kontextové'}</dd>
        <dt>Frekvence</dt><dd>${card.frequency}</dd>
        <dt>Garanti</dt><dd>${(card.stewards || []).join(', ')}</dd>
        <dt>Prahy signálu</dt><dd>good ≥ +${card.signal_thresholds.good} % vs. OECD · bad ≤ −${card.signal_thresholds.warn} %</dd>
        <dt>Metodika</dt><dd>${card.method_notes}</dd>
        <dt>Omezení</dt><dd>${card.limitations}</dd>
      </dl>

      <h3 class="modal-section-title">Zdroje dat</h3>
      <table class="ds-table">
        <thead><tr><th>Vrstva</th><th>Specifikace</th></tr></thead>
        <tbody>${sourceRows}</tbody>
      </table>
    `;
  } catch (err) {
    content.innerHTML = `<p class="error-text">Nepodařilo se načíst metodickou kartu: ${err.message}</p>`;
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
  document.getElementById('searchInput').addEventListener('input', e => {
    searchQuery = e.target.value.trim();
    renderGrid();
  });

  // Sort
  document.getElementById('sortSelect').addEventListener('change', e => {
    sortMode = e.target.value;
    renderGrid();
  });

  // CSV export
  document.getElementById('btnExportCsv').addEventListener('click', () => {
    exportCsv(getFiltered());
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
