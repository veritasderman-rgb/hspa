// Frontend logika dashboardu Zdravé Česko.
// Načítá data z /data/indicators.json a renderuje karty nebo tabulku.
// Žádné inline data — jediný zdroj pravdy je JSON file.

const DATA_URL = 'data/indicators.json';

let allIndicators = [];
let activeArea = 'all';
let searchQuery = '';
let viewMode = 'card'; // 'card' | 'table'

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

const SIGNAL_LABELS = { good: 'Výborný', warn: 'Průměrný', bad: 'Problematický', neutral: 'Neutrální' };

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
  for (const ind of indicators) counts[ind.signal] = (counts[ind.signal] || 0) + 1;

  document.getElementById('scoreGood').textContent = counts.good;
  document.getElementById('scoreWarn').textContent = counts.warn;
  document.getElementById('scoreBad').textContent = counts.bad;

  const total = indicators.length;
  const index = total > 0 ? Math.round((counts.good / total) * 100) : 0;
  const indexEl = document.getElementById('scoreIndex');
  indexEl.textContent = `${index} %`;
  indexEl.className = 'scorecard-index-value ' + (index >= 50 ? 'good' : index >= 30 ? 'warn' : 'bad');
}

// ====== FILTERING ======

function getFiltered() {
  let list = activeArea === 'all' ? allIndicators : allIndicators.filter(i => i.area === activeArea);
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    list = list.filter(i =>
      i.name.toLowerCase().includes(q) ||
      i.domain.toLowerCase().includes(q) ||
      i.subdomain.toLowerCase().includes(q) ||
      i.area.toLowerCase().includes(q)
    );
  }
  return list;
}

// ====== RENDERING: CARDS ======

function renderCards(filtered) {
  const grid = document.getElementById('indicatorGrid');
  grid.innerHTML = '';
  const charts = [];

  filtered.forEach((ind) => {
    const card = document.createElement('div');
    card.className = 'indicator-card';
    card.dataset.indicatorId = ind.id;
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `${ind.name}: ${ind.value} ${ind.unit}`);

    const chartId = `chart-${ind.id}`;
    const benchmark = ind.benchmark?.oecd ?? ind.benchmark?.eu ?? null;
    const compareHTML = benchmark != null
      ? `<div class="compare">vs. OECD průměr: <strong>${benchmark}${ind.unit ? ' ' + ind.unit : ''}</strong></div>`
      : '';

    card.innerHTML = `
      <div class="area-tag">${ind.area} · ${ind.domain}</div>
      <div class="top">
        <h4>${ind.name}</h4>
        <div class="signal ${ind.signal}" title="${SIGNAL_LABELS[ind.signal] || ind.signal}"></div>
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
    card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') openMethodCard(ind); });
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

// ====== RENDERING: TABLE ======

function renderTable(filtered) {
  const tbody = document.getElementById('tableBody');
  tbody.innerHTML = '';

  filtered.forEach((ind) => {
    const benchmark = ind.benchmark?.oecd ?? ind.benchmark?.eu ?? '–';
    const tr = document.createElement('tr');
    tr.style.cursor = 'pointer';
    tr.setAttribute('tabindex', '0');
    tr.setAttribute('aria-label', `Otevřít metodickou kartu pro ${ind.name}`);
    tr.innerHTML = `
      <td><strong>${ind.name}</strong><br><small>${ind.domain} · ${ind.subdomain}</small></td>
      <td><span class="area-tag-inline">${ind.area}</span></td>
      <td class="num">${ind.value} <small>${ind.unit}</small></td>
      <td class="num">${benchmark !== '–' ? benchmark + ' ' + ind.unit : '–'}</td>
      <td class="num">${ind.year}</td>
      <td><span class="signal-pill ${ind.signal}">${SIGNAL_LABELS[ind.signal] || ind.signal}</span></td>
      <td><a href="${ind.source.url}" target="_blank" rel="noopener">${ind.source.name}</a></td>
    `;
    tr.addEventListener('click', () => openMethodCard(ind));
    tr.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') openMethodCard(ind); });
    tbody.appendChild(tr);
  });
}

// ====== MAIN RENDER ======

function renderGrid() {
  const filtered = getFiltered();
  const count = filtered.length;

  document.getElementById('gridBadge').textContent =
    `${count} indikátor${count === 1 ? '' : (count < 5 ? 'y' : 'ů')}`;
  document.getElementById('gridTitle').textContent =
    activeArea === 'all' ? 'Všechny indikátory' : `Oblast: ${activeArea}`;

  const noResults = document.getElementById('noResults');
  noResults.classList.toggle('hidden', count > 0);

  updateScorecard(filtered);

  if (viewMode === 'card') {
    document.getElementById('indicatorGrid').classList.remove('hidden');
    document.getElementById('indicatorTable').classList.add('hidden');
    renderCards(filtered);
  } else {
    document.getElementById('indicatorGrid').classList.add('hidden');
    document.getElementById('indicatorTable').classList.remove('hidden');
    renderTable(filtered);
  }
}

// ====== METODICKÁ KARTA (modal) ======

async function openMethodCard(indicator) {
  const modal = document.getElementById('modalBackdrop');
  const content = document.getElementById('modalContent');
  content.innerHTML = '<p>Načítám metodickou kartu…</p>';
  modal.classList.remove('hidden');
  document.getElementById('modalClose').focus();

  try {
    const res = await fetch(indicator.method_card_url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const card = await res.json();

    const dsRows = Object.entries(card.data_source || {}).map(([key, val]) => `
      <tr><td><em>${key}</em></td><td><code>${val.type || ''}</code> ${val.dataset ? '· ' + val.dataset : ''}</td></tr>
    `).join('');

    content.innerHTML = `
      <h2 id="modalTitle">${card.name}</h2>
      <div class="sub">${card.area} · ${card.domain} · ${card.subdomain || ''}</div>
      <dl>
        <dt>Definice</dt><dd>${card.definition}</dd>
        <dt>Jednotka</dt><dd>${card.unit}</dd>
        <dt>Směr</dt><dd>${card.direction === 'higher_is_better' ? '↑ Vyšší je lepší' : card.direction === 'lower_is_better' ? '↓ Nižší je lepší' : 'Kontextový'}</dd>
        <dt>Frekvence</dt><dd>${card.frequency}</dd>
        <dt>Garanti</dt><dd>${(card.stewards || []).join(', ')}</dd>
        <dt>Prahy signálu</dt><dd>good ≥ +${card.signal_thresholds?.good ?? '?'} %, bad ≤ −${card.signal_thresholds?.warn ?? '?'} % vs. benchmark</dd>
        <dt>Metodika</dt><dd>${card.method_notes}</dd>
        <dt>Omezení</dt><dd>${card.limitations}</dd>
      </dl>
      <h3 style="margin-top:18px;font-size:14px;">Zdroje dat</h3>
      <table class="ds-table"><tbody>${dsRows}</tbody></table>
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
      document.querySelectorAll('.audience-switch button').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-pressed', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
      document.body.dataset.audience = btn.dataset.aud;
    });
  });

  // Area filter
  document.querySelectorAll('.dimnav button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.dimnav button').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-pressed', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
      activeArea = btn.dataset.area;
      renderGrid();
    });
  });

  // Search
  document.getElementById('searchInput').addEventListener('input', (e) => {
    searchQuery = e.target.value.trim();
    renderGrid();
  });

  // View toggle
  document.getElementById('btnCardView').addEventListener('click', () => {
    viewMode = 'card';
    document.getElementById('btnCardView').classList.add('active');
    document.getElementById('btnCardView').setAttribute('aria-pressed', 'true');
    document.getElementById('btnTableView').classList.remove('active');
    document.getElementById('btnTableView').setAttribute('aria-pressed', 'false');
    renderGrid();
  });
  document.getElementById('btnTableView').addEventListener('click', () => {
    viewMode = 'table';
    document.getElementById('btnTableView').classList.add('active');
    document.getElementById('btnTableView').setAttribute('aria-pressed', 'true');
    document.getElementById('btnCardView').classList.remove('active');
    document.getElementById('btnCardView').setAttribute('aria-pressed', 'false');
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
