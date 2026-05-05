// Frontend logika dashboardu Zdravé Česko.
// Načítá data z /data/indicators.json a renderuje karty.
// Žádné inline data — jediný zdroj pravdy je JSON file.

const DATA_URL = 'data/indicators.json';

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

function pluralInd(n) {
  if (n === 1) return 'indikátor';
  if (n < 5) return 'indikátory';
  return 'indikátorů';
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

// ====== KPI SUMMARY ======

function renderHeroSummary() {
  const counts = { good: 0, warn: 0, bad: 0, neutral: 0 };
  for (const ind of allIndicators) counts[ind.signal] = (counts[ind.signal] || 0) + 1;

  document.getElementById('heroTotal').textContent = allIndicators.length;
  document.getElementById('heroGood').textContent = counts.good;
  document.getElementById('heroWarn').textContent = counts.warn;
  document.getElementById('heroBad').textContent = counts.bad;
  document.getElementById('heroNeutral').textContent = counts.neutral;
}

// ====== CSV EXPORT ======

function exportCsv() {
  const visible = getFiltered();
  const header = ['id', 'name', 'area', 'domain', 'value', 'unit', 'year', 'signal', 'benchmark_oecd', 'benchmark_eu', 'source'];
  const rows = visible.map(i => [
    i.id, `"${i.name}"`, i.area, i.domain, i.value, i.unit, i.year, i.signal,
    i.benchmark?.oecd ?? '', i.benchmark?.eu ?? '',
    `"${i.source.name}"`
  ]);
  const csv = [header, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `zdrave-cesko-indikatory-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ====== FILTER ======

function getFiltered() {
  let list = activeArea === 'all'
    ? allIndicators
    : allIndicators.filter(i => i.area === activeArea);

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    list = list.filter(i =>
      i.name.toLowerCase().includes(q) ||
      i.domain.toLowerCase().includes(q) ||
      i.area.toLowerCase().includes(q) ||
      (i.subdomain || '').toLowerCase().includes(q)
    );
  }
  return list;
}

// ====== RENDERING ======

function renderGrid() {
  const grid = document.getElementById('indicatorGrid');
  const emptyState = document.getElementById('emptyState');
  grid.innerHTML = '';

  const filtered = getFiltered();

  document.getElementById('gridBadge').textContent =
    `${filtered.length} ${pluralInd(filtered.length)}`;
  document.getElementById('gridTitle').textContent =
    activeArea === 'all' ? 'Všechny indikátory' : `Oblast: ${activeArea}`;

  if (filtered.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }
  emptyState.classList.add('hidden');

  const charts = [];
  filtered.forEach((ind) => {
    const card = document.createElement('div');
    card.className = 'indicator-card';
    card.dataset.indicatorId = ind.id;
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `${ind.name} – ${ind.signal}`);

    const chartId = `chart-${ind.id}`;
    const benchmark = ind.benchmark?.oecd ?? ind.benchmark?.eu ?? null;
    const benchmarkLabel = ind.benchmark?.oecd != null ? 'OECD' : 'EU';
    const compareHTML = benchmark != null
      ? `<div class="compare">vs. ${benchmarkLabel} průměr: <strong>${benchmark}${ind.unit ? ' ' + ind.unit : ''}</strong></div>`
      : '';

    const signalLabels = { good: 'Dobré', warn: 'Varování', bad: 'Špatné', neutral: 'Neutrální' };

    card.innerHTML = `
      <div class="area-tag">${ind.area} · ${ind.domain}</div>
      <div class="top">
        <h4>${ind.name}</h4>
        <div class="signal ${ind.signal}" title="${signalLabels[ind.signal] || ind.signal}"></div>
      </div>
      <div class="value-row">
        <span class="big-value">${ind.value}</span>
        <span class="unit">${ind.unit}</span>
      </div>
      ${compareHTML}
      <div class="chart-wrap"><canvas id="${chartId}"></canvas></div>
      <div class="source">Zdroj: ${ind.source.name}</div>
    `;

    const open = () => openMethodCard(ind);
    card.addEventListener('click', open);
    card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
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

function directionLabel(d) {
  if (d === 'higher_is_better') return 'Vyšší = lepší';
  if (d === 'lower_is_better') return 'Nižší = lepší';
  return 'Kontextový';
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

    const ds = card.data_source || {};
    const sourceRows = Object.entries(ds)
      .map(([k, v]) => `<dt>${k}</dt><dd>${typeof v === 'object' ? JSON.stringify(v) : v}</dd>`)
      .join('');

    content.innerHTML = `
      <h2>${card.name}</h2>
      <div class="sub">${card.area} · ${card.domain}${card.subdomain ? ' · ' + card.subdomain : ''}</div>
      <dl>
        <dt>Definice</dt><dd>${card.definition}</dd>
        <dt>Jednotka</dt><dd>${card.unit}</dd>
        <dt>Směr</dt><dd>${directionLabel(card.direction)}</dd>
        <dt>Frekvence</dt><dd>${card.frequency}</dd>
        <dt>Garanti</dt><dd>${(card.stewards || []).join(', ')}</dd>
        <dt>Prahy signálu</dt>
        <dd>
          <div class="signal-badges">
            <span class="signal-pill good">good ≥ +${card.signal_thresholds?.good ?? '?'} %</span>
            <span class="signal-pill warn">warn ≥ −${card.signal_thresholds?.warn ?? '?'} %</span>
            <span class="signal-pill bad">bad &lt; −${card.signal_thresholds?.warn ?? '?'} %</span>
          </div>
        </dd>
        <dt>Metodika</dt><dd>${card.method_notes}</dd>
        <dt>Omezení</dt><dd>${card.limitations}</dd>
      </dl>
      <div class="data-source-box">
        <h4>Zdroje dat</h4>
        <dl>${sourceRows}</dl>
      </div>
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
      renderHeroSummary();
      renderGrid();
    } finally {
      btn.disabled = false;
      btn.textContent = '⟳ Načíst znovu';
    }
  });

  // Search input
  document.getElementById('searchInput').addEventListener('input', (e) => {
    searchQuery = e.target.value.trim();
    renderGrid();
  });

  // Export CSV
  document.getElementById('btnExport').addEventListener('click', exportCsv);

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
    renderHeroSummary();
    renderGrid();
  } catch (err) {
    console.error('Initial load failed:', err);
  }
})();
