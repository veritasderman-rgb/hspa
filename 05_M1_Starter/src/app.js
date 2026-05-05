// Frontend logika dashboardu Zdravé Česko.
// Načítá data z /data/indicators.json a /data/regions.json.
// Žádné inline data — jediný zdroj pravdy jsou JSON soubory.

const DATA_URL = 'data/indicators.json';
const REGIONS_URL = 'data/regions.json';
const LS_KEY = 'hspa_indicators_cache';

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

// Trend šipka: porovná poslední dvě hodnoty trendu
function trendArrow(trend) {
  if (!Array.isArray(trend) || trend.length < 2) return '';
  const last = trend[trend.length - 1].value;
  const prev = trend[trend.length - 2].value;
  const diff = last - prev;
  if (Math.abs(diff) < 0.01) return '<span class="trend-arrow neutral" title="Beze změny">→</span>';
  return diff > 0
    ? `<span class="trend-arrow up" title="Rostoucí trend (+${diff.toFixed(1)})">↑</span>`
    : `<span class="trend-arrow down" title="Klesající trend (${diff.toFixed(1)})">↓</span>`;
}

// CSV export pro jeden indikátor
function exportCsv(ind) {
  const rows = [['rok', 'hodnota', 'jednotka']];
  (ind.trend || []).forEach(t => rows.push([t.year, t.value, ind.unit]));
  const csv = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${ind.id}.csv`;
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
    // Uložit do localStorage jako fallback
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ data, savedAt: new Date().toISOString() }));
    } catch (_) { /* ignoruj pokud je localStorage plný */ }
    document.getElementById('lastUpdated').textContent =
      `Aktualizováno ${fmtRelative(data.generated_at)}`;
    clearStatus();
    return data;
  } catch (err) {
    // Zkus localStorage fallback
    try {
      const cached = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
      if (cached?.data?.indicators) {
        allIndicators = cached.data.indicators;
        showStatus(
          `Nepodařilo se načíst aktuální data. Zobrazuji verzi uloženou ${fmtRelative(cached.savedAt)}.`,
          'warn'
        );
        document.getElementById('lastUpdated').textContent =
          `Offline cache (${fmtRelative(cached.savedAt)})`;
        return cached.data;
      }
    } catch (_) { /* cache nedostupná */ }
    showStatus(`Nepodařilo se načíst data: ${err.message}`, 'error');
    throw err;
  }
}

async function loadRegions() {
  try {
    const res = await fetch(REGIONS_URL);
    if (!res.ok) return null;
    return await res.json();
  } catch (_) {
    return null;
  }
}

// ====== FILTERING ======

function getFilteredIndicators() {
  let list = activeArea === 'all' ? allIndicators : allIndicators.filter(i => i.area === activeArea);
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    list = list.filter(i =>
      i.name.toLowerCase().includes(q) ||
      i.domain.toLowerCase().includes(q) ||
      i.subdomain?.toLowerCase().includes(q) ||
      i.area.toLowerCase().includes(q)
    );
  }
  return list;
}

// ====== RENDERING ======

function renderGrid() {
  const grid = document.getElementById('indicatorGrid');
  grid.innerHTML = '';
  const noResults = document.getElementById('noResults');
  const filtered = getFilteredIndicators();

  const count = filtered.length;
  document.getElementById('gridBadge').textContent =
    `${count} indikátor${count === 1 ? '' : (count < 5 ? 'y' : 'ů')}`;
  document.getElementById('gridTitle').textContent =
    searchQuery
      ? `Výsledky hledání: „${searchQuery}"`
      : activeArea === 'all' ? 'Všechny indikátory' : `Oblast: ${activeArea}`;

  if (count === 0) {
    noResults.classList.remove('hidden');
    return;
  }
  noResults.classList.add('hidden');

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

    const arrow = trendArrow(ind.trend);

    card.innerHTML = `
      <div class="area-tag">${ind.area} · ${ind.domain}</div>
      <div class="top">
        <h4>${ind.name}</h4>
        <div class="signal ${ind.signal}" title="Hodnocení: ${ind.signal}"></div>
      </div>
      <div class="value-row">
        <span class="big-value">${ind.value}</span>
        <span class="unit">${ind.unit}</span>
        ${arrow}
      </div>
      ${compareHTML}
      <div class="chart-wrap"><canvas id="${chartId}"></canvas></div>
      <div class="card-footer">
        <span class="source">Zdroj: ${ind.source.name}</span>
        <button class="btn-csv" data-id="${ind.id}" title="Stáhnout jako CSV">↓ CSV</button>
      </div>
    `;
    card.addEventListener('click', e => {
      if (e.target.classList.contains('btn-csv')) return;
      openMethodCard(ind);
    });
    card.querySelector('.btn-csv').addEventListener('click', e => {
      e.stopPropagation();
      exportCsv(ind);
    });
    grid.appendChild(card);

    if (Array.isArray(ind.trend) && ind.trend.length) {
      charts.push({ ind, chartId });
    }
  });

  // Render sparklines po vložení do DOM
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

// ====== REGIONÁLNÍ TABULKA ======

function renderRegions(regions) {
  if (!regions?.regions?.length) {
    document.getElementById('regionSection').style.display = 'none';
    return;
  }
  const avg = regions.country_avg;
  const body = document.getElementById('regionTableBody');
  body.innerHTML = '';

  const sorted = [...regions.regions].sort((a, b) => b.value - a.value);
  sorted.forEach(r => {
    const diff = r.value - avg;
    const sign = diff >= 0 ? '+' : '';
    const cls = diff >= 0.5 ? 'bar-good' : diff <= -0.5 ? 'bar-bad' : 'bar-neutral';
    const barW = Math.min(100, Math.abs(diff) / 3 * 100);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${r.name}</strong></td>
      <td>${r.value.toFixed(1)}</td>
      <td>${r.doctors_per_1000?.toFixed(1) ?? '–'}</td>
      <td>
        <div class="bar-wrap">
          <div class="bar ${cls}" style="width:${barW.toFixed(0)}%"></div>
          <span class="bar-label ${cls}">${sign}${diff.toFixed(1)}</span>
        </div>
      </td>
    `;
    body.appendChild(tr);
  });
}

// ====== METODICKÁ KARTA (modal) ======

async function openMethodCard(indicator) {
  const modal = document.getElementById('modalBackdrop');
  const content = document.getElementById('modalContent');
  content.innerHTML = '<p>Načítám metodickou kartu…</p>';
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');

  try {
    const res = await fetch(indicator.method_card_url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const card = await res.json();

    const signalLabel = { good: '✅ Dobré', warn: '⚠️ Pozor', bad: '❌ Špatné', neutral: '– Neutrální' };

    content.innerHTML = `
      <h2>${card.name}</h2>
      <div class="sub">${card.area} · ${card.domain} · ${card.subdomain || ''}</div>
      <dl>
        <dt>Definice</dt><dd>${card.definition}</dd>
        <dt>Jednotka</dt><dd>${card.unit}</dd>
        <dt>Směr</dt><dd>${card.direction === 'higher_is_better' ? '↑ Vyšší = lepší' : card.direction === 'lower_is_better' ? '↓ Nižší = lepší' : 'Kontext'}</dd>
        <dt>Frekvence</dt><dd>${card.frequency}</dd>
        <dt>Garanti</dt><dd>${(card.stewards || []).join(', ')}</dd>
        <dt>Prahy signálu</dt><dd>✅ &gt;+${card.signal_thresholds.good} % od OECD · ❌ &lt;−${card.signal_thresholds.warn} %</dd>
        <dt>Metodika</dt><dd>${card.method_notes}</dd>
        <dt>Omezení</dt><dd>${card.limitations}</dd>
      </dl>
      <h3 style="margin-top:18px; font-size:14px;">Primární zdroj dat</h3>
      <pre>${JSON.stringify(card.data_source?.primary ?? card.data_source, null, 2)}</pre>
    `;
  } catch (err) {
    content.innerHTML = `<p>Nepodařilo se načíst metodickou kartu: ${err.message}</p>`;
  }
}

function closeModal() {
  const modal = document.getElementById('modalBackdrop');
  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden', 'true');
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
  const searchInput = document.getElementById('searchInput');
  const searchClear = document.getElementById('searchClear');
  searchInput.addEventListener('input', () => {
    searchQuery = searchInput.value.trim();
    searchClear.classList.toggle('hidden', !searchQuery);
    renderGrid();
  });
  searchClear.addEventListener('click', () => {
    searchInput.value = '';
    searchQuery = '';
    searchClear.classList.add('hidden');
    renderGrid();
    searchInput.focus();
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
    const regions = await loadRegions();
    renderRegions(regions);
  } catch (err) {
    console.error('Initial load failed:', err);
    renderGrid();
  }
})();
