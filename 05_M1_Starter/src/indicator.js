// Detail stránka indikátoru — fetchne data podle ?id=,
// vykreslí trend, mapu krajů ČR a metodickou kartu.

import { renderModuleNav, escapeHtml } from './page-shared.js';
import { renderCzMap, computeRegionSignal } from './cz-map.js';

const DATA_URL = 'data/indicators.json';
const REGIONS_URL = 'data/regions.json';

let _trendChart = null;

function getId() {
  return new URLSearchParams(window.location.search).get('id');
}

async function fetchJson(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url} HTTP ${r.status}`);
  return r.json();
}

function fmtNum(v) {
  if (v == null) return '—';
  return v < 100 ? v.toFixed(1) : Math.round(v).toString();
}

function findRegionDataset(regionsData, indicatorId) {
  if (!regionsData?.datasets) return null;
  // Přesné ID
  let ds = regionsData.datasets.find(d => d.id === indicatorId);
  if (ds) return ds;
  // Substring match (např. nadeje_doziti_total → nadeje_doziti_men/_zeny)
  ds = regionsData.datasets.find(d => d.id?.startsWith(indicatorId.split('_').slice(0, 2).join('_')));
  if (ds) return ds;
  // Lekari/sestry sdílí "lekari_per_1000"
  return null;
}

function renderTrendChart(canvas, indicator) {
  if (!canvas || !Array.isArray(indicator.trend) || indicator.trend.length < 2) return;
  if (_trendChart) { _trendChart.destroy(); _trendChart = null; }

  const color = indicator.signal === 'good' ? '#38761D'
    : indicator.signal === 'warn' ? '#B45F06'
    : indicator.signal === 'bad' ? '#990000' : '#0B5394';

  const labels = indicator.trend.map(t => t.year);
  const datasets = [{
    label: 'ČR',
    data: indicator.trend.map(t => t.value),
    borderColor: color, backgroundColor: color + '22',
    fill: true, tension: 0.3, pointRadius: 4, pointHoverRadius: 6, borderWidth: 2.5,
  }];

  if (indicator.benchmark?.oecd != null) {
    datasets.push({
      label: 'OECD průměr',
      data: labels.map(() => indicator.benchmark.oecd),
      borderColor: '#4A90D9', backgroundColor: 'transparent',
      borderDash: [6, 3], borderWidth: 1.5, pointRadius: 0, fill: false,
    });
  }
  if (indicator.benchmark?.eu != null) {
    datasets.push({
      label: 'EU průměr',
      data: labels.map(() => indicator.benchmark.eu),
      borderColor: '#E69138', backgroundColor: 'transparent',
      borderDash: [3, 3], borderWidth: 1.5, pointRadius: 0, fill: false,
    });
  }

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // eslint-disable-next-line no-undef
  _trendChart = new Chart(canvas, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      animation: reduced ? { duration: 0 } : { duration: 500 },
      plugins: {
        legend: { display: datasets.length > 1, position: 'top', labels: { font: { size: 11 }, boxWidth: 16 } },
        tooltip: { displayColors: true, callbacks: { label: c => `${c.dataset.label}: ${c.parsed.y} ${indicator.unit}` } },
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 11 } } },
        y: { grid: { color: '#EDF2F7' }, ticks: { font: { size: 11 }, maxTicksLimit: 6 } },
      },
    },
  });
}

function renderRegionDetail(container, regionsDataset, code) {
  if (!regionsDataset) {
    container.innerHTML = '';
    return;
  }
  if (!code) {
    container.innerHTML = '<div class="id-region-detail-empty">Klikněte na kraj v mapě pro zobrazení detailu.</div>';
    return;
  }
  const region = regionsDataset.regions.find(r => r.code === code);
  if (!region) {
    container.innerHTML = '<div class="id-region-detail-empty">Pro tento kraj nejsou data k dispozici.</div>';
    return;
  }
  const diff = region.value - regionsDataset.country_avg;
  const diffPct = (diff / regionsDataset.country_avg) * 100;
  const betterHigher = regionsDataset.direction !== 'lower_is_better';
  const isGood = betterHigher ? diff > 0 : diff < 0;
  const cls = Math.abs(diffPct) < 1 ? '' : (isGood ? 'pos' : 'neg');
  const sign = diff > 0 ? '+' : '';
  container.innerHTML = `
    <div class="id-region-detail-card">
      <h3>${escapeHtml(region.name)}</h3>
      <div class="id-region-value">${fmtNum(region.value)} <span style="font-size:14px;color:var(--muted)">${escapeHtml(regionsDataset.unit)}</span></div>
      <div class="id-region-diff ${cls}">
        Odchylka od průměru ČR: ${sign}${diff.toFixed(1)} ${escapeHtml(regionsDataset.unit)}
        (${sign}${diffPct.toFixed(1)} %)
      </div>
    </div>
  `;
}

function renderRegionsTable(regionsDataset) {
  if (!regionsDataset) return '';
  const betterHigher = regionsDataset.direction !== 'lower_is_better';
  const sorted = [...regionsDataset.regions].sort((a, b) =>
    betterHigher ? b.value - a.value : a.value - b.value);

  const rows = sorted.map(r => {
    const diff = r.value - regionsDataset.country_avg;
    const sign = diff > 0 ? '+' : '';
    const diffCls = Math.abs(diff) < 0.05 ? '' : ((betterHigher ? diff > 0 : diff < 0) ? 'pos' : 'neg');
    return `<tr data-code="${escapeHtml(r.code)}">
      <td>${escapeHtml(r.name)}</td>
      <td>${fmtNum(r.value)}</td>
      <td class="diff ${diffCls}">${sign}${diff.toFixed(1)}</td>
    </tr>`;
  }).join('');

  return `
    <table class="regions-table">
      <thead><tr><th>Kraj</th><th>Hodnota (${escapeHtml(regionsDataset.unit)})</th><th>Δ od ČR</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

const DIRECTION_LABEL = {
  higher_is_better: '↑ vyšší = lepší',
  lower_is_better: '↓ nižší = lepší',
  context_dependent: '↔ kontextový',
};

function renderSourceList(card) {
  if (!card?.data_source) return '';
  const items = [];
  const ds = card.data_source;
  if (ds.primary) {
    const p = ds.primary;
    const label = p.dataset || p.endpoint || p.type;
    items.push(`<li>
      <a href="${escapeHtml(p.endpoint || p.url || '#')}" target="_blank" rel="noopener">
        Primární zdroj: ${escapeHtml(p.type)}${p.dataset ? ` · ${escapeHtml(p.dataset)}` : ''}
      </a>
      ${p.note ? `<span class="id-source-meta">${escapeHtml(p.note)}</span>` : ''}
    </li>`);
  }
  if (ds.fallback) {
    const f = ds.fallback;
    items.push(`<li>
      <a href="${escapeHtml(f.endpoint || f.url || '#')}" target="_blank" rel="noopener">
        Záložní zdroj: ${escapeHtml(f.type)}${f.dataset ? ` · ${escapeHtml(f.dataset)}` : ''}
      </a>
      ${f.note ? `<span class="id-source-meta">${escapeHtml(f.note)}</span>` : ''}
    </li>`);
  }
  return `<ul class="id-source-list">${items.join('')}</ul>`;
}

// Pro indikátory bez explicitních context_factors v metodické kartě
// poskytneme základní rámec převzatý z method_notes/limitations
function renderContextSection(card) {
  if (card?.context_factors?.length) {
    return `<ul>${card.context_factors.map(f => `<li>${escapeHtml(f)}</li>`).join('')}</ul>`;
  }
  if (card?.method_notes) {
    return `<p>${escapeHtml(card.method_notes)}</p>`;
  }
  return '<p class="id-section-note">Faktory ovlivňující tento indikátor nejsou v metodické kartě explicitně rozepsány. Viz definice a metoda výpočtu níže.</p>';
}

function renderWhyMatters(card) {
  if (card?.why_matters) {
    return `<p>${escapeHtml(card.why_matters)}</p>`;
  }
  if (card?.definition) {
    return `<p>${escapeHtml(card.definition)}</p>`;
  }
  return '';
}

async function loadCrossLinks(indicatorId) {
  try {
    const [s, e] = await Promise.all([
      fetch('data/strategies.json').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('data/explainers.json').then(r => r.ok ? r.json() : null).catch(() => null),
    ]);
    const strategies = (s?.strategies ?? []).filter(x => (x.linked_indicators ?? []).includes(indicatorId));
    const explainers = (e?.explainers ?? []).filter(x => (x.linked_indicators ?? []).includes(indicatorId));
    return { strategies, explainers };
  } catch {
    return { strategies: [], explainers: [] };
  }
}

function renderCrossLinks({ strategies, explainers }) {
  if (!strategies.length && !explainers.length) return '';
  let html = '<section class="id-section"><h2>Souvislosti</h2>';
  if (explainers.length) {
    html += '<p style="margin-bottom:6px"><strong>Vysvětlující materiály:</strong></p><div class="chip-row" style="margin-bottom:14px">';
    html += explainers.map(e =>
      `<a class="chip chip-explainer" href="jak-funguje.html?id=${encodeURIComponent(e.id)}">${escapeHtml(e.title)}</a>`
    ).join('');
    html += '</div>';
  }
  if (strategies.length) {
    html += '<p style="margin-bottom:6px"><strong>Strategie a předpisy:</strong></p><div class="chip-row">';
    html += strategies.map(s =>
      `<a class="chip chip-strategy" href="strategie.html?id=${encodeURIComponent(s.id)}">${escapeHtml(s.title)}</a>`
    ).join('');
    html += '</div>';
  }
  html += '</section>';
  return html;
}

async function init() {
  if (typeof window === 'undefined') return;
  renderModuleNav('indicators');

  const id = getId();
  const root = document.getElementById('detailRoot');

  if (!id) {
    root.innerHTML = `
      <a class="back-link" href="index.html">← Zpět na seznam indikátorů</a>
      <p>Chybí parametr <code>?id=</code>. Vyberte indikátor v <a href="index.html">přehledu</a>.</p>`;
    return;
  }

  let indicators, regionsData, card;
  try {
    [indicators, regionsData] = await Promise.all([
      fetchJson(DATA_URL),
      fetchJson(REGIONS_URL).catch(() => ({ datasets: [] })),
    ]);
  } catch (err) {
    root.innerHTML = `<p class="status error">Nepodařilo se načíst data: ${escapeHtml(err.message)}.</p>`;
    return;
  }

  const indicator = (indicators.indicators ?? []).find(i => i.id === id);
  if (!indicator) {
    root.innerHTML = `
      <a class="back-link" href="index.html">← Zpět na seznam indikátorů</a>
      <p>Indikátor <code>${escapeHtml(id)}</code> nebyl nalezen.</p>`;
    return;
  }

  // Načti metodickou kartu (volitelné — pokud chybí, použijeme jen base)
  try {
    card = await fetchJson(indicator.method_card_url);
  } catch {
    card = null;
  }

  const regionsDataset = findRegionDataset(regionsData, id);
  const crossLinks = await loadCrossLinks(id);

  // Update topbar / title
  document.title = `${indicator.name} · Zdravé Česko`;
  const topSub = document.getElementById('topbarSub');
  if (topSub) topSub.textContent = indicator.name;

  // Render hlavička + struktura
  root.innerHTML = `
    <a class="back-link" href="index.html">← Zpět na seznam indikátorů</a>

    <header class="id-header">
      <div>
        <div class="id-header-meta">
          <span class="area-tag">${escapeHtml(indicator.area)}</span>
          <span class="domain-tag">· ${escapeHtml(indicator.domain)}${indicator.subdomain ? ' · ' + escapeHtml(indicator.subdomain) : ''}</span>
        </div>
        <h1>${escapeHtml(indicator.name)}</h1>
        <p class="id-sub">${escapeHtml(card?.definition ?? indicator.name)}</p>
      </div>
      <div class="id-bigvalue">
        <span class="id-value">${escapeHtml(String(indicator.value))}</span><span class="id-unit">${escapeHtml(indicator.unit)}</span>
        <span class="id-year">Aktuální rok: ${escapeHtml(String(indicator.year ?? '—'))}</span>
        <span class="signal-pill ${indicator.signal}">${indicator.signal}</span>
      </div>
    </header>

    <div class="id-grid">
      <div class="id-grid-block">
        <h2>Vývoj v čase</h2>
        <div class="id-trend-chart-wrap"><canvas id="idTrendChart"></canvas></div>
      </div>
      <div class="id-grid-block">
        <h2>Srovnání</h2>
        <dl class="id-benchmarks">
          <div class="id-benchmark-item">
            <dt>ČR</dt>
            <dd style="color:var(--primary-dark)">${escapeHtml(String(indicator.value))} ${escapeHtml(indicator.unit)}</dd>
          </div>
          ${indicator.benchmark?.oecd != null ? `
          <div class="id-benchmark-item">
            <dt>OECD</dt>
            <dd>${indicator.benchmark.oecd} ${escapeHtml(indicator.unit)}</dd>
          </div>` : ''}
          ${indicator.benchmark?.eu != null ? `
          <div class="id-benchmark-item">
            <dt>EU</dt>
            <dd>${indicator.benchmark.eu} ${escapeHtml(indicator.unit)}</dd>
          </div>` : ''}
          ${indicator.benchmark?.oecd_best != null ? `
          <div class="id-benchmark-item">
            <dt>Top OECD</dt>
            <dd style="color:var(--good)">${indicator.benchmark.oecd_best} ${escapeHtml(indicator.unit)}</dd>
          </div>` : ''}
        </dl>
        <p class="id-section-note" style="margin-top:14px">
          Směr: ${escapeHtml(DIRECTION_LABEL[indicator.direction] ?? '—')} ·
          Frekvence: ${escapeHtml(card?.frequency ?? '—')} ·
          Zdroj: ${escapeHtml(indicator.source.name)}
        </p>
      </div>
    </div>

    ${regionsDataset ? `
    <section class="id-section">
      <h2>Regionální rozpad — 14 krajů ČR</h2>
      <p class="id-section-note" style="margin-bottom:14px">
        Krajský průměr ČR: <strong>${fmtNum(regionsDataset.country_avg)} ${escapeHtml(regionsDataset.unit)}</strong>
        (rok ${escapeHtml(String(regionsDataset.year))}). Klik na kraj zobrazí detail.
      </p>
      <div class="id-regions">
        <div>
          <div id="czMapContainer"></div>
          <div id="regionDetail" style="margin-top:14px"></div>
        </div>
        <div class="regions-table-wrap" id="regionsTableWrap">
          ${renderRegionsTable(regionsDataset)}
        </div>
      </div>
    </section>
    ` : `
    <section class="id-section">
      <h2>Regionální rozpad</h2>
      <p class="id-section-note">Krajský rozpad pro tento indikátor není zatím dostupný v <code>data/regions.json</code>. Pracujeme na rozšíření.</p>
    </section>
    `}

    <section class="id-section">
      <h2>Co tento indikátor ovlivňuje</h2>
      ${renderContextSection(card)}
    </section>

    <section class="id-section">
      <h2>Proč je zásadní</h2>
      ${renderWhyMatters(card)}
      ${card?.limitations ? `<p class="id-section-note"><strong>Omezení interpretace:</strong> ${escapeHtml(card.limitations)}</p>` : ''}
    </section>

    ${crossLinks.strategies.length || crossLinks.explainers.length ? renderCrossLinks(crossLinks) : ''}

    <section class="id-section">
      <h2>Primární zdroje</h2>
      ${card ? renderSourceList(card) : `<p>Zdroj: ${escapeHtml(indicator.source.name)} (<a href="${escapeHtml(indicator.source.url)}" target="_blank" rel="noopener">odkaz</a>)</p>`}
      ${card?.method_notes ? `<p class="id-section-note" style="margin-top:14px"><strong>Metoda:</strong> ${escapeHtml(card.method_notes)}</p>` : ''}
    </section>
  `;

  // Render trend chart
  renderTrendChart(document.getElementById('idTrendChart'), indicator);

  // Render mapy + region detail
  if (regionsDataset) {
    const mapContainer = document.getElementById('czMapContainer');
    const detailContainer = document.getElementById('regionDetail');
    let activeCode = null;

    const onSelect = (code) => {
      activeCode = (activeCode === code) ? null : code;
      renderCzMap(mapContainer, regionsDataset, { onSelect, activeCode });
      renderRegionDetail(detailContainer, regionsDataset, activeCode);
      // Highlight v tabulce
      document.querySelectorAll('#regionsTableWrap tbody tr').forEach(tr => {
        tr.style.background = tr.dataset.code === activeCode ? '#FFF8E1' : '';
      });
    };

    renderCzMap(mapContainer, regionsDataset, { onSelect, activeCode });
    renderRegionDetail(detailContainer, regionsDataset, null);

    // Klik v tabulce vyvolá taky highlight
    document.querySelectorAll('#regionsTableWrap tbody tr').forEach(tr => {
      tr.style.cursor = 'pointer';
      tr.addEventListener('click', () => onSelect(tr.dataset.code));
    });
  }
}

if (typeof window !== 'undefined') init();
