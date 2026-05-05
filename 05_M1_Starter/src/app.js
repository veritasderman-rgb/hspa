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

// ====== SIGNAL SUMMARY ======

function updateSignalSummary(indicators) {
  const counts = { good: 0, warn: 0, bad: 0 };
  indicators.forEach(i => { if (counts[i.signal] !== undefined) counts[i.signal]++; });
  document.getElementById('countGood').textContent = counts.good;
  document.getElementById('countWarn').textContent = counts.warn;
  document.getElementById('countBad').textContent = counts.bad;
}

// ====== SEARCH HIGHLIGHT ======

function highlight(text, query) {
  if (!query) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return String(text).replace(new RegExp(`(${escaped})`, 'gi'), '<mark>$1</mark>');
}

// ====== RENDERING ======

function renderGrid(area = 'all', query = '') {
  const grid = document.getElementById('indicatorGrid');
  grid.innerHTML = '';

  let filtered = area === 'all'
    ? allIndicators
    : allIndicators.filter(i => i.area === area);

  if (query) {
    const q = query.toLowerCase();
    filtered = filtered.filter(i =>
      i.name.toLowerCase().includes(q) ||
      (i.domain || '').toLowerCase().includes(q) ||
      (i.subdomain || '').toLowerCase().includes(q) ||
      (i.source?.name || '').toLowerCase().includes(q)
    );
  }

  const count = filtered.length;
  document.getElementById('gridBadge').textContent =
    `${count} indikátor${count === 1 ? '' : (count < 5 ? 'y' : 'ů')}`;
  document.getElementById('gridTitle').textContent =
    area === 'all' ? 'Všechny indikátory' : `Oblast: ${area}`;

  const noResults = document.getElementById('noResults');
  if (count === 0) {
    noResults.classList.remove('hidden');
    return;
  }
  noResults.classList.add('hidden');

  // Aktualizace summary jen při zobrazení všech (bez filtru oblasti)
  if (area === 'all' && !query) updateSignalSummary(allIndicators);

  const charts = [];
  filtered.forEach((ind) => {
    const card = document.createElement('div');
    card.className = 'indicator-card';
    card.dataset.indicatorId = ind.id;

    const chartId = `chart-${ind.id}`;
    const benchmark = ind.benchmark?.oecd ?? ind.benchmark?.eu ?? null;
    const benchmarkLabel = ind.benchmark?.oecd != null ? 'OECD' : 'EU';
    const compareHTML = benchmark != null
      ? `<div class="compare">vs. ${benchmarkLabel} průměr: <strong>${benchmark}${ind.unit ? ' ' + ind.unit : ''}</strong></div>`
      : '';

    const nameHtml = highlight(ind.name, query);
    const domainHtml = highlight(`${ind.area} · ${ind.domain}`, query);

    card.innerHTML = `
      <div class="area-tag">${domainHtml}</div>
      <div class="top">
        <h4>${nameHtml}</h4>
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

async function openMethodCard(indicator) {
  const modal = document.getElementById('modalBackdrop');
  const content = document.getElementById('modalContent');
  content.innerHTML = '<p>Načítám metodickou kartu…</p>';
  modal.classList.remove('hidden');

  try {
    const res = await fetch(indicator.method_card_url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const card = await res.json();

    const dirLabel = card.direction === 'lower_is_better' ? 'nižší = lepší' :
                     card.direction === 'higher_is_better' ? 'vyšší = lepší' : card.direction;
    const freqLabel = { yearly: 'Roční', every_2_years: 'Každé 2 roky',
                        every_4_years: 'Každé 4 roky', every_5_years: 'Každých 5 let' };
    const primarySrc = card.data_source?.primary;
    const srcText = primarySrc ? `${primarySrc.type}${primarySrc.code ? ' · ' + primarySrc.code : ''}` : '–';

    content.innerHTML = `
      <h2>${card.name}</h2>
      <div class="sub">${card.area} · ${card.domain}${card.subdomain ? ' · ' + card.subdomain : ''}</div>
      <dl>
        <dt>Definice</dt><dd>${card.definition}</dd>
        <dt>Jednotka</dt><dd>${card.unit}</dd>
        <dt>Směr</dt><dd>${dirLabel}</dd>
        <dt>Frekvence</dt><dd>${freqLabel[card.frequency] || card.frequency}</dd>
        <dt>Garanti</dt><dd>${(card.stewards || []).join(', ')}</dd>
        <dt>Metodika</dt><dd>${card.method_notes}</dd>
        <dt>Omezení</dt><dd>${card.limitations}</dd>
        <dt>Primární zdroj</dt><dd>${srcText}${primarySrc?.note ? '<br><small style="color:var(--muted)">' + primarySrc.note + '</small>' : ''}</dd>
      </dl>
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
      renderGrid(activeArea, searchQuery);
    });
  });

  // Search input
  const searchInput = document.getElementById('searchInput');
  const searchClear = document.getElementById('searchClear');
  let searchTimer;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      searchQuery = searchInput.value.trim();
      searchClear.classList.toggle('hidden', !searchQuery);
      renderGrid(activeArea, searchQuery);
    }, 200);
  });
  searchClear.addEventListener('click', () => {
    searchInput.value = '';
    searchQuery = '';
    searchClear.classList.add('hidden');
    renderGrid(activeArea, '');
    searchInput.focus();
  });

  // Reload button
  document.getElementById('btnReload').addEventListener('click', async () => {
    const btn = document.getElementById('btnReload');
    btn.disabled = true;
    btn.textContent = 'Načítám…';
    try {
      await loadData(true);
      renderGrid(activeArea, searchQuery);
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
    updateSignalSummary(allIndicators);
    renderGrid('all');
  } catch (err) {
    console.error('Initial load failed:', err);
  }
})();
