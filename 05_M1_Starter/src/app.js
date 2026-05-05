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

// Vypočte šipku trendu: ↑ zlepšení, ↓ zhoršení, → stabilní
function trendArrow(trend, direction) {
  if (!Array.isArray(trend) || trend.length < 2) return '';
  const last = trend[trend.length - 1].value;
  const prev = trend[trend.length - 2].value;
  const delta = last - prev;
  const relChange = Math.abs(delta) / (Math.abs(prev) || 1);
  if (relChange < 0.005) return '<span class="trend-arrow stable" title="Stabilní trend">→</span>';
  const improving = direction === 'lower_is_better' ? delta < 0 : delta > 0;
  return improving
    ? '<span class="trend-arrow improving" title="Zlepšující se trend">↑</span>'
    : '<span class="trend-arrow declining" title="Zhoršující se trend">↓</span>';
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

function renderScorecard(indicators) {
  const counts = { good: 0, warn: 0, bad: 0, neutral: 0 };
  for (const ind of indicators) counts[ind.signal] = (counts[ind.signal] || 0) + 1;

  const labels = { good: 'Dobré', warn: 'Varovné', bad: 'Kritické' };
  const icons  = { good: '✓', warn: '!', bad: '✕' };

  document.getElementById('scorecard').innerHTML = Object.entries(labels).map(([sig, label]) => `
    <div class="score-pill ${sig}">
      <span class="score-icon">${icons[sig]}</span>
      <span class="score-n">${counts[sig]}</span>
      <span class="score-label">${label}</span>
    </div>
  `).join('');
}

// ====== RENDERING ======

function getFiltered() {
  let list = activeArea === 'all' ? allIndicators : allIndicators.filter(i => i.area === activeArea);
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    list = list.filter(i =>
      i.name.toLowerCase().includes(q) ||
      i.area.toLowerCase().includes(q) ||
      i.domain.toLowerCase().includes(q)
    );
  }
  return list;
}

function renderGrid() {
  const filtered = getFiltered();
  const grid = document.getElementById('indicatorGrid');
  grid.innerHTML = '';

  const n = filtered.length;
  document.getElementById('gridBadge').textContent =
    `${n} indikátor${n === 1 ? '' : (n < 5 ? 'y' : 'ů')}`;
  document.getElementById('gridTitle').textContent =
    activeArea === 'all' ? 'Všechny indikátory' : `Oblast: ${activeArea}`;

  const desc = document.getElementById('searchDesc');
  if (searchQuery) {
    desc.textContent = `Výsledky pro „${searchQuery}"`;
    desc.style.display = 'inline';
  } else {
    desc.textContent = 'Filtrujte výběrem oblasti v navigaci výše';
    desc.style.display = '';
  }

  renderScorecard(filtered);

  const charts = [];
  filtered.forEach(ind => {
    const card = document.createElement('div');
    card.className = 'indicator-card';
    card.dataset.indicatorId = ind.id;

    const chartId = `chart-${ind.id}`;
    const benchmark = ind.benchmark?.oecd ?? ind.benchmark?.eu ?? null;
    const benchmarkLabel = ind.benchmark?.oecd != null ? 'OECD' : 'EU';
    const compareHTML = benchmark != null
      ? `<div class="compare">vs. ${benchmarkLabel} průměr: <strong>${benchmark}${ind.unit ? ' ' + ind.unit : ''}</strong></div>`
      : '';

    const arrow = trendArrow(ind.trend, ind.direction);

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
      <div class="source">Zdroj: ${ind.source?.name ?? '—'}</div>
    `;
    card.addEventListener('click', () => openMethodCard(ind));
    grid.appendChild(card);

    if (Array.isArray(ind.trend) && ind.trend.length) {
      charts.push({ ind, chartId });
    }
  });

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

function formatDataSource(ds) {
  if (!ds) return '<p>Zdroj dat neuveden.</p>';
  const rows = [];
  if (ds.primary) {
    const p = ds.primary;
    const link = p.endpoint ? ` · <a href="${p.endpoint}" target="_blank" rel="noopener">endpoint</a>` : '';
    const note = p.note ? `<br><small>${p.note}</small>` : '';
    rows.push(`<div class="ds-row"><span class="ds-label">Primární</span><span class="ds-val">${p.type}${link}${note}</span></div>`);
  }
  if (ds.fallback) {
    const f = ds.fallback;
    const link = f.url ? ` · <a href="${f.url}" target="_blank" rel="noopener">odkaz</a>` : '';
    rows.push(`<div class="ds-row"><span class="ds-label">Záložní</span><span class="ds-val">${f.type}${link}</span></div>`);
  }
  return rows.length ? rows.join('') : `<pre>${JSON.stringify(ds, null, 2)}</pre>`;
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

    const dirLabel = { higher_is_better: 'Vyšší = lepší', lower_is_better: 'Nižší = lepší', context_dependent: 'Kontextuální' };

    content.innerHTML = `
      <h2>${card.name}</h2>
      <div class="sub">${card.area} · ${card.domain}${card.subdomain ? ' · ' + card.subdomain : ''}</div>
      <dl>
        <dt>Definice</dt><dd>${card.definition}</dd>
        <dt>Jednotka</dt><dd>${card.unit}</dd>
        <dt>Směr</dt><dd>${dirLabel[card.direction] ?? card.direction}</dd>
        <dt>Frekvence</dt><dd>${card.frequency}</dd>
        <dt>Garanti</dt><dd>${(card.stewards || []).join(', ')}</dd>
        <dt>Prahy signálu</dt><dd>good ≥ +${card.signal_thresholds.good} % vs. benchmark · bad ≤ −${card.signal_thresholds.warn} %</dd>
        <dt>Metodika</dt><dd>${card.method_notes}</dd>
        <dt>Omezení</dt><dd>${card.limitations}</dd>
      </dl>
      <h3 class="ds-title">Zdroje dat</h3>
      <div class="ds-block">${formatDataSource(card.data_source)}</div>
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
  document.querySelectorAll('.audience-switch button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.audience-switch button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.body.dataset.audience = btn.dataset.aud;
    });
  });

  document.querySelectorAll('.dimnav button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.dimnav button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeArea = btn.dataset.area;
      renderGrid();
    });
  });

  document.getElementById('searchBox').addEventListener('input', (e) => {
    searchQuery = e.target.value.trim();
    renderGrid();
  });

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
