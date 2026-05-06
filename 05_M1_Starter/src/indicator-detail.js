// Detail indikátoru: ?id=<indicator_id>
// Načítá data/indicators.json, data/regions.json a indicators/<id>.json.
// Renderuje: hero s hodnotou + signálem, trend graf, choropleth mapu krajů,
// regionální tabulku, faktory, související strategie a explainery.

import { renderModuleNav, escapeHtml } from './page-shared.js';
import { renderCzMapSVG, renderCzMapLegend, regionList } from './cz-map.js';

const SIGNAL_LABEL = {
  good: 'Dobré',
  warn: 'Ke sledování',
  bad: 'Kritické',
  neutral: 'Bez benchmarku',
};

const DIRECTION_LABEL = {
  higher_is_better: '↑ vyšší = lepší',
  lower_is_better: '↓ nižší = lepší',
  context_dependent: '↔ kontextové',
};

let allIndicators = [];
let allRegions = null;
let allStrategies = [];
let allExplainers = [];

function findIndicator(id) {
  return allIndicators.find(i => i.id === id);
}

function findRegionalDataset(indicatorId) {
  if (!allRegions?.datasets) return null;
  return allRegions.datasets.find(ds => ds.id === indicatorId
    || ds.linked_indicator === indicatorId
    || ds.id === `${indicatorId}_kraje`);
}

function fmtNum(v, unit) {
  if (v == null) return '—';
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  return (Math.abs(n) < 100 ? n.toFixed(1) : Math.round(n).toString())
    + (unit ? ` ${unit}` : '');
}

function signalPill(signal) {
  return `<span class="signal-pill ${escapeHtml(signal ?? 'neutral')}">${escapeHtml(SIGNAL_LABEL[signal] ?? signal ?? '?')}</span>`;
}

function diffPctVsBenchmark(value, bench) {
  if (value == null || bench == null || bench === 0) return null;
  return ((value - bench) / bench) * 100;
}

function fmtPct(p) {
  if (p == null) return '—';
  const sign = p > 0 ? '+' : '';
  return `${sign}${p.toFixed(1)} %`;
}

function renderHero(ind, card) {
  const yoy = (() => {
    const t = ind.trend ?? [];
    if (t.length < 2) return null;
    const last = t[t.length - 1].value;
    const prev = t[t.length - 2].value;
    if (last == null || prev == null || prev === 0) return null;
    return ((last - prev) / prev) * 100;
  })();
  const yoyHTML = yoy != null
    ? `<div class="kpi-tile"><div class="kpi-num">${fmtPct(yoy)}</div><div class="kpi-label">Meziročně (${ind.trend.at(-2).year}→${ind.trend.at(-1).year})</div></div>`
    : '';
  const oecdDiff = diffPctVsBenchmark(ind.value, ind.benchmark?.oecd);
  const oecdHTML = ind.benchmark?.oecd != null
    ? `<div class="kpi-tile"><div class="kpi-num">${ind.benchmark.oecd}</div><div class="kpi-label">OECD průměr ${oecdDiff != null ? `(ČR ${fmtPct(oecdDiff)})` : ''}</div></div>`
    : '';
  const euHTML = ind.benchmark?.eu != null
    ? `<div class="kpi-tile"><div class="kpi-num">${ind.benchmark.eu}</div><div class="kpi-label">EU průměr</div></div>`
    : '';
  const bestHTML = ind.benchmark?.oecd_best != null
    ? `<div class="kpi-tile kpi-best"><div class="kpi-num">${ind.benchmark.oecd_best}</div><div class="kpi-label">Nejlepší v OECD</div></div>`
    : '';

  return `
    <header class="indicator-hero">
      <div class="indicator-hero-meta">
        <a class="back-link" href="index.html">← zpět na seznam indikátorů</a>
        <div class="ind-area-tag">${escapeHtml(ind.area)} · ${escapeHtml(ind.domain)}${ind.subdomain ? ' · ' + escapeHtml(ind.subdomain) : ''}</div>
      </div>
      <div class="indicator-hero-title">
        <h2>${escapeHtml(ind.name)}</h2>
        ${signalPill(ind.signal)}
      </div>
      ${card?.definition ? `<p class="indicator-hero-lead">${escapeHtml(card.definition)}</p>` : ''}
      <div class="indicator-kpis">
        <div class="kpi-tile kpi-main">
          <div class="kpi-num">${ind.value}</div>
          <div class="kpi-label">${escapeHtml(ind.unit ?? '')}${ind.year ? ` · ${ind.year}` : ''}</div>
        </div>
        ${oecdHTML}
        ${euHTML}
        ${bestHTML}
        ${yoyHTML}
      </div>
    </header>
  `;
}

function renderTrendSection(ind) {
  if (!Array.isArray(ind.trend) || ind.trend.length < 2) return '';
  return `
    <section class="detail-section trend-section">
      <h3>Vývoj v čase</h3>
      <div class="ind-chart-wrap"><canvas id="trendCanvas"></canvas></div>
    </section>
  `;
}

function renderTrendChart(ind) {
  const canvas = document.getElementById('trendCanvas');
  if (!canvas) return;
  const trend = ind.trend ?? [];
  if (trend.length < 2) return;

  const color = ind.signal === 'good' ? '#38761D'
    : ind.signal === 'warn' ? '#B45F06'
    : ind.signal === 'bad' ? '#990000' : '#0B5394';

  const labels = trend.map(t => t.year);
  const datasets = [{
    label: 'ČR',
    data: trend.map(t => t.value),
    borderColor: color, backgroundColor: color + '22',
    fill: true, tension: 0.3, pointRadius: 4, pointHoverRadius: 6, borderWidth: 2.5,
  }];

  if (ind.benchmark?.oecd != null) {
    datasets.push({
      label: 'OECD průměr',
      data: labels.map(() => ind.benchmark.oecd),
      borderColor: '#4A90D9', backgroundColor: 'transparent',
      borderDash: [6, 3], borderWidth: 1.5, pointRadius: 0, fill: false,
    });
  }
  if (ind.benchmark?.eu != null) {
    datasets.push({
      label: 'EU průměr',
      data: labels.map(() => ind.benchmark.eu),
      borderColor: '#E69138', backgroundColor: 'transparent',
      borderDash: [3, 3], borderWidth: 1.5, pointRadius: 0, fill: false,
    });
  }
  if (ind.benchmark?.oecd_best != null) {
    datasets.push({
      label: 'Nejlepší v OECD',
      data: labels.map(() => ind.benchmark.oecd_best),
      borderColor: '#16A34A', backgroundColor: 'transparent',
      borderDash: [2, 2], borderWidth: 1, pointRadius: 0, fill: false,
    });
  }

  // eslint-disable-next-line no-undef
  new Chart(canvas, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: datasets.length > 1, position: 'top', labels: { font: { size: 12 }, boxWidth: 18 } },
        tooltip: { displayColors: true },
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 11 } } },
        y: { grid: { color: '#EDF2F7' }, ticks: { font: { size: 11 }, maxTicksLimit: 6 } },
      },
    },
  });
}

function renderRegionsSection(ind, ds) {
  if (!ds) {
    return `
      <section class="detail-section regions-section-block">
        <h3>Regionální rozpad</h3>
        <p class="region-empty">Krajská data pro tento indikátor zatím nejsou v <code>data/regions.json</code>. Po doplnění se zde zobrazí choropleth mapa, sloupcový graf a tabulka.</p>
      </section>
    `;
  }
  const direction = ds.direction ?? ind.direction ?? 'higher_is_better';
  const sortedRegions = [...ds.regions].sort((a, b) => direction === 'lower_is_better'
    ? a.value - b.value
    : b.value - a.value);
  const allRegionsList = regionList();

  return `
    <section class="detail-section regions-section-block">
      <h3>Regionální rozpad — ${escapeHtml(ds.name ?? ind.name)}</h3>
      <p class="region-meta">Průměr ČR <strong>${ds.country_avg} ${escapeHtml(ds.unit ?? ind.unit ?? '')}</strong> · rok ${ds.year ?? ind.year ?? '?'} · ${ds.regions.length} z ${allRegionsList.length} krajů</p>
      <div class="region-grid">
        <div class="cz-map-wrap">
          ${renderCzMapSVG(ds, { ariaTitle: `Mapa krajů: ${ds.name ?? ind.name}` })}
          ${renderCzMapLegend(direction)}
        </div>
        <div class="region-table-wrap">
          <table class="regions-table" id="regionsTable">
            <thead><tr><th>Kraj</th><th>${escapeHtml(ds.unit ?? '')}</th><th>Δ ČR</th></tr></thead>
            <tbody>${sortedRegions.map(r => {
              const diff = (r.value - ds.country_avg);
              const better = direction === 'lower_is_better' ? diff < 0 : diff > 0;
              const cls = Math.abs(diff) < 0.05 ? '' : (better ? 'pos' : 'neg');
              return `<tr><td>${escapeHtml(r.name)}</td><td>${fmtNum(r.value)}</td><td class="diff ${cls}">${diff > 0 ? '+' : ''}${diff.toFixed(1)}</td></tr>`;
            }).join('')}</tbody>
          </table>
        </div>
      </div>
      <div class="ind-bar-wrap"><canvas id="regionsBarCanvas"></canvas></div>
    </section>
  `;
}

function renderRegionsBarChart(ds, ind) {
  const canvas = document.getElementById('regionsBarCanvas');
  if (!canvas) return;
  const direction = ds.direction ?? ind.direction ?? 'higher_is_better';
  const sorted = [...ds.regions].sort((a, b) => direction === 'lower_is_better'
    ? a.value - b.value
    : b.value - a.value);
  const colors = sorted.map(r => {
    const aboveAvg = r.value >= ds.country_avg;
    const better = direction === 'higher_is_better' ? aboveAvg
      : direction === 'lower_is_better' ? !aboveAvg
      : null;
    if (better == null) return '#5A6770';
    return better ? '#38761D' : '#B45F06';
  });

  // eslint-disable-next-line no-undef
  new Chart(canvas, {
    type: 'bar',
    data: {
      labels: sorted.map(r => r.name),
      datasets: [{
        data: sorted.map(r => r.value),
        backgroundColor: colors,
        borderWidth: 0,
      }],
    },
    options: {
      indexAxis: 'y',
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          min: Math.min(...sorted.map(r => r.value)) * 0.97,
          max: Math.max(...sorted.map(r => r.value)) * 1.03,
        },
        y: { ticks: { font: { size: 12 } } },
      },
    },
  });
}

function renderFactorsSection(card) {
  if (!card?.factors && !card?.importance) return '';
  return `
    <section class="detail-section factors-section">
      ${card.importance ? `
        <h3>Proč je tento indikátor zásadní</h3>
        <div class="prose">${card.importance}</div>
      ` : ''}
      ${Array.isArray(card.factors) && card.factors.length ? `
        <h3>Co indikátor ovlivňuje</h3>
        <ul class="factors-list">
          ${card.factors.map(f => `
            <li>
              <strong>${escapeHtml(f.label ?? f.name ?? '')}.</strong>
              ${escapeHtml(f.description ?? '')}
            </li>
          `).join('')}
        </ul>
      ` : ''}
    </section>
  `;
}

function renderMethodSection(card, ind) {
  if (!card) return '';
  return `
    <section class="detail-section">
      <h3>Metodika a zdroj dat</h3>
      <dl class="method-dl">
        ${card.definition ? `<dt>Definice</dt><dd>${escapeHtml(card.definition)}</dd>` : ''}
        <dt>Jednotka</dt><dd>${escapeHtml(card.unit ?? ind.unit ?? '—')}</dd>
        <dt>Směr</dt><dd>${escapeHtml(DIRECTION_LABEL[card.direction] ?? card.direction ?? '—')}</dd>
        <dt>Frekvence</dt><dd>${escapeHtml(card.frequency ?? '—')}</dd>
        <dt>Garanti</dt><dd>${escapeHtml((card.stewards ?? []).join(', ') || '—')}</dd>
        ${card.signal_thresholds ? `<dt>Prahy signálu</dt><dd>good ≥ ${card.signal_thresholds.good} %, warn nad −${card.signal_thresholds.warn} %</dd>` : ''}
        ${card.method_notes ? `<dt>Metodika</dt><dd>${escapeHtml(card.method_notes)}</dd>` : ''}
        ${card.limitations ? `<dt>Omezení</dt><dd>${escapeHtml(card.limitations)}</dd>` : ''}
      </dl>
      ${card.data_source ? renderDataSource(card.data_source) : ''}
    </section>
  `;
}

function renderDataSource(ds) {
  if (!ds || typeof ds !== 'object') return '';
  const parts = [];
  if (ds.primary) parts.push(`<div class="ds-block"><h4>Primární zdroj</h4>${renderSourceObj(ds.primary)}</div>`);
  if (ds.fallback) parts.push(`<div class="ds-block"><h4>Záložní zdroj</h4>${renderSourceObj(ds.fallback)}</div>`);
  return parts.length ? `<div class="ds-blocks">${parts.join('')}</div>` : '';
}

function renderSourceObj(o) {
  const pairs = Object.entries(o).filter(([k]) => k !== 'note');
  const noteHTML = o.note ? `<p class="ds-note">${escapeHtml(o.note)}</p>` : '';
  const tableHTML = pairs.length
    ? `<table class="ds-table">${pairs.map(([k, v]) =>
        `<tr><th>${escapeHtml(k)}</th><td>${escapeHtml(typeof v === 'object' ? JSON.stringify(v) : String(v))}</td></tr>`
      ).join('')}</table>`
    : '';
  return tableHTML + noteHTML;
}

function renderCrossLinks(indicatorId) {
  const linkedStrategies = allStrategies.filter(s => (s.linked_indicators ?? []).includes(indicatorId));
  const linkedExplainers = allExplainers.filter(e => (e.linked_indicators ?? []).includes(indicatorId));
  if (!linkedStrategies.length && !linkedExplainers.length) return '';

  let html = '<section class="detail-section">';
  if (linkedStrategies.length) {
    html += `<h3>Související strategie</h3><div class="chip-row">`;
    html += linkedStrategies.slice(0, 8).map(s =>
      `<a class="chip chip-strategy" href="strategie.html?id=${encodeURIComponent(s.id)}">${escapeHtml(s.title)}</a>`
    ).join('');
    html += `</div>`;
  }
  if (linkedExplainers.length) {
    html += `<h3 style="margin-top:18px">Vysvětlení</h3><div class="chip-row">`;
    html += linkedExplainers.map(e =>
      `<a class="chip chip-explainer" href="jak-funguje.html?id=${encodeURIComponent(e.id)}">${escapeHtml(e.title)}</a>`
    ).join('');
    html += `</div>`;
  }
  html += '</section>';
  return html;
}

function renderError(message) {
  return `
    <section class="detail-section">
      <a class="back-link" href="index.html">← zpět na seznam indikátorů</a>
      <h2 style="margin-top:18px">Detail nelze zobrazit</h2>
      <p>${escapeHtml(message)}</p>
    </section>
  `;
}

async function loadCard(ind) {
  if (!ind?.method_card_url) return null;
  try {
    const res = await fetch(ind.method_card_url);
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

async function init() {
  if (typeof window === 'undefined') return;
  renderModuleNav('indicators');

  const id = new URLSearchParams(window.location.search).get('id');
  const detail = document.getElementById('detailView');

  if (!id) {
    detail.innerHTML = renderError('Nebyl předán parametr ?id=… s identifikátorem indikátoru.');
    return;
  }

  try {
    const [indRes, regRes, stratsRes, explsRes] = await Promise.all([
      fetch('data/indicators.json'),
      fetch('data/regions.json').catch(() => null),
      fetch('data/strategies.json').catch(() => null),
      fetch('data/explainers.json').catch(() => null),
    ]);

    if (!indRes.ok) throw new Error(`indicators.json HTTP ${indRes.status}`);
    const indData = await indRes.json();
    allIndicators = indData.indicators ?? [];
    allRegions = regRes?.ok ? await regRes.json() : null;
    const stratsData = stratsRes?.ok ? await stratsRes.json() : { strategies: [] };
    const explsData = explsRes?.ok ? await explsRes.json() : { explainers: [] };
    allStrategies = stratsData.strategies ?? [];
    allExplainers = explsData.explainers ?? [];

    const ind = findIndicator(id);
    if (!ind) {
      detail.innerHTML = renderError(`Indikátor "${id}" nenalezen v indicators.json.`);
      return;
    }

    document.title = `${ind.name} · Zdravé Česko`;
    const sub = document.getElementById('indSubtitle');
    if (sub) sub.textContent = ind.name;

    const card = await loadCard(ind);
    const ds = findRegionalDataset(id);

    detail.innerHTML = `
      ${renderHero(ind, card)}
      ${renderFactorsSection(card)}
      ${renderTrendSection(ind)}
      ${renderRegionsSection(ind, ds)}
      ${renderMethodSection(card, ind)}
      ${renderCrossLinks(id)}
    `;

    renderTrendChart(ind);
    if (ds) renderRegionsBarChart(ds, ind);
  } catch (err) {
    console.error('indicator-detail load failed:', err);
    detail.innerHTML = renderError(`Nepodařilo se načíst data: ${err.message}`);
  }
}

if (typeof window !== 'undefined') init();

// Exporty pro testy
export { findIndicator, findRegionalDataset, fmtNum, diffPctVsBenchmark };
