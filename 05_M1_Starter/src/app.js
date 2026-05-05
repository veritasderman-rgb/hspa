// Frontend logika dashboardu Zdravé Česko.
// Načítá data z /data/indicators.json a renderuje karty.
// Žádné inline data — jediný zdroj pravdy je JSON file.

const DATA_URL = 'data/indicators.json';

let allIndicators = [];
let activeArea = 'all';
let searchTerm = '';

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

function trendDir(trend) {
  if (!Array.isArray(trend) || trend.length < 2) return '';
  const first = trend[0].value;
  const last = trend[trend.length - 1].value;
  const pct = ((last - first) / Math.abs(first)) * 100;
  if (pct > 2) return '<span class="trend-arrow up" title="Rostoucí trend">↗</span>';
  if (pct < -2) return '<span class="trend-arrow down" title="Klesající trend">↘</span>';
  return '<span class="trend-arrow flat" title="Stabilní trend">→</span>';
}

function pluralInd(n) {
  if (n === 1) return 'indikátor';
  if (n < 5) return 'indikátory';
  return 'indikátorů';
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
  const c = { good: 0, warn: 0, bad: 0, neutral: 0 };
  for (const ind of indicators) c[ind.signal] = (c[ind.signal] || 0) + 1;
  const neutral = c.neutral ? `<div class="sc-item neutral"><span class="sc-dot"></span><strong>${c.neutral}</strong> neutrální</div>` : '';
  document.getElementById('scorecard').innerHTML = `
    <div class="sc-item good"><span class="sc-dot"></span><strong>${c.good}</strong> dobrých</div>
    <div class="sc-item warn"><span class="sc-dot"></span><strong>${c.warn}</strong> sledovat</div>
    <div class="sc-item bad"><span class="sc-dot"></span><strong>${c.bad}</strong> problém</div>
    ${neutral}
    <div class="sc-legend">Hodnocení vůči OECD/EU průměru</div>
  `;
}

// ====== RENDERING ======

function renderGrid(area = 'all') {
  const grid = document.getElementById('indicatorGrid');
  grid.innerHTML = '';

  const areaFiltered = area === 'all'
    ? allIndicators
    : allIndicators.filter(i => i.area === area);

  renderScorecard(areaFiltered);

  const q = searchTerm.toLowerCase();
  const filtered = q
    ? areaFiltered.filter(i =>
        i.name.toLowerCase().includes(q) ||
        i.domain.toLowerCase().includes(q) ||
        (i.subdomain || '').toLowerCase().includes(q)
      )
    : areaFiltered;

  document.getElementById('gridBadge').textContent =
    `${filtered.length} ${pluralInd(filtered.length)}`;
  document.getElementById('gridTitle').textContent =
    area === 'all' ? 'Všechny indikátory' : `Oblast: ${area}`;

  if (filtered.length === 0) {
    grid.innerHTML = '<p class="no-results">Žádné indikátory neodpovídají hledání.</p>';
    return;
  }

  const charts = [];
  filtered.forEach((ind) => {
    const card = document.createElement('div');
    card.className = 'indicator-card';
    card.dataset.indicatorId = ind.id;
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `${ind.name}: ${ind.value} ${ind.unit}. Klikněte pro metodickou kartu.`);

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
        ${trendDir(ind.trend)}
      </div>
      ${compareHTML}
      <div class="chart-wrap"><canvas id="${chartId}"></canvas></div>
      <div class="source">Zdroj: ${ind.source.name}</div>
    `;

    card.addEventListener('click', () => openMethodCard(ind));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openMethodCard(ind);
      }
    });
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

function renderDataSource(ds) {
  if (!ds) return '<em>Zdroj dat není uveden.</em>';
  const rows = [];
  if (ds.primary) {
    const p = ds.primary;
    let s = `<strong>Primární:</strong> ${p.type || ''}`;
    if (p.dataset) s += ` / ${p.dataset}`;
    const href = p.endpoint?.startsWith('http') ? p.endpoint : p.url?.startsWith('http') ? p.url : null;
    if (href) s += ` · <a href="${href}" target="_blank" rel="noopener">odkaz</a>`;
    rows.push(s);
  }
  if (ds.fallback) {
    const f = ds.fallback;
    let s = `<strong>Záloha:</strong> ${f.type || ''}`;
    if (f.url?.startsWith('http')) s += ` · <a href="${f.url}" target="_blank" rel="noopener">odkaz</a>`;
    rows.push(s);
  }
  return rows.map(r => `<p>${r}</p>`).join('');
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
      <h3 class="ds-heading">Zdroje dat</h3>
      <div class="ds-section">${renderDataSource(card.data_source)}</div>
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
      renderGrid(activeArea);
    });
  });

  // Search
  document.getElementById('searchInput').addEventListener('input', (e) => {
    searchTerm = e.target.value.trim();
    renderGrid(activeArea);
  });

  // Reload button
  document.getElementById('btnReload').addEventListener('click', async () => {
    const btn = document.getElementById('btnReload');
    btn.disabled = true;
    btn.textContent = 'Načítám…';
    try {
      await loadData(true);
      renderGrid(activeArea);
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
    renderGrid('all');
  } catch (err) {
    console.error('Initial load failed:', err);
  }
})();
