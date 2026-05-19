// Detailní stránka pro jednotlivý indikátor (indicator.html?id=<id>).
// Zobrazí: hero (hodnota, signál, benchmarky), velký trendový graf,
// regionální mapu (tile-map 14 krajů ČR) + tabulku, narativní bloky
// (determinanty, význam) z metodické karty a kompletní metodiku.

import './analytics.js';
import { renderModuleNav, renderMastheadDate, escapeHtml, isArticleVisible } from './page-shared.js';
import { renderCzMap } from './cz-map.js';

const DATA_URL = 'data/indicators.json';
const REGIONS_URL = 'data/regions.json';

const SIGNAL_LABELS = {
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

let _trendChart = null;

async function init() {
  if (typeof window === 'undefined') return;

  renderModuleNav('indicators');
  renderMastheadDate();

  const id = new URLSearchParams(window.location.search).get('id');
  if (!id) {
    showError('Chybí parametr <code>?id=&lt;id_indikátoru&gt;</code> v URL.');
    return;
  }

  try {
    const [indicatorsData, regionsData] = await Promise.all([
      fetch(DATA_URL).then(r => r.ok ? r.json() : Promise.reject(new Error(`indicators.json HTTP ${r.status}`))),
      fetch(REGIONS_URL).then(r => r.ok ? r.json() : { datasets: [] }).catch(() => ({ datasets: [] })),
    ]);

    const indicator = (indicatorsData.indicators ?? []).find(i => i.id === id);
    if (!indicator) {
      showError(`Indikátor <code>${escapeHtml(id)}</code> nebyl nalezen v <code>data/indicators.json</code>.`);
      return;
    }

    let card = null;
    if (indicator.method_card_url) {
      try {
        const res = await fetch(indicator.method_card_url);
        if (res.ok) card = await res.json();
      } catch { /* fallback bez karty */ }
    }

    const regionDataset = findRegionDataset(regionsData, indicator.id);

    renderDetail(indicator, card, regionDataset);
  } catch (err) {
    console.error(err);
    showError(`Nepodařilo se načíst data: ${escapeHtml(err.message)}.`);
  }
}

function findRegionDataset(regionsData, indicatorId) {
  const datasets = regionsData?.datasets ?? [];
  // Priorita: explicitní indicator_id (kanonické pojmenování v data/regions.json),
  // fallback na starší linked_indicator_id, pak id == indicatorId.
  return datasets.find(d => d.indicator_id === indicatorId)
      ?? datasets.find(d => d.linked_indicator_id === indicatorId)
      ?? datasets.find(d => d.id === indicatorId)
      ?? null;
}

function showError(html) {
  const root = document.getElementById('detailRoot');
  root.innerHTML = `
    <a class="back-link" href="index.html">← zpět na přehled indikátorů</a>
    <div class="status error">${html}</div>
  `;
}

function renderDetail(ind, card, regionDataset) {
  const root = document.getElementById('detailRoot');
  document.title = `${ind.name} · HSPA Monitor`;
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) {
    const oecd = ind.benchmark?.oecd != null ? ` OECD průměr: ${ind.benchmark.oecd} ${ind.unit}.` : '';
    metaDesc.content = `${ind.name} — ${ind.domain}. Hodnota: ${ind.value} ${ind.unit} (${ind.year}).${oecd} HSPA Monitor.`;
  }

  const benchmarkHTML = renderBenchmarks(ind);
  const yoy = computeYoy(ind);

  const subdomain = ind.subdomain ? ` · ${escapeHtml(ind.subdomain)}` : '';

  const verifText = {
    verified: 'Ověřeno',
    preliminary: 'Předběžné',
    illustrative: 'Ilustrativní',
  }[ind.verification_status] || '';
  const verifTitle = {
    verified: 'Data z primárního zdroje, max. 12 měsíců staré',
    preliminary: 'Data dostupná, metodika v revizi nebo zdroj není primární',
    illustrative: 'Hodnota pochází z odhadu — nepoužívat pro citace',
  }[ind.verification_status] || '';
  const verifBadge = ind.verification_status
    ? `<span class="verif-badge ${ind.verification_status === 'verified' ? 'verif-verified' : ind.verification_status === 'preliminary' ? 'verif-preliminary' : 'verif-illustrative'}" title="${verifTitle}">${verifText} <span class="verif-hint" aria-hidden="true">ⓘ</span></span>`
    : '';

  root.innerHTML = `
    <a class="back-link" href="index.html">← zpět na přehled indikátorů</a>

    <header class="ind-detail-header">
      <div class="ind-detail-area">${escapeHtml(ind.area)} · ${escapeHtml(ind.domain)}${subdomain}${verifBadge}</div>
      <h2>${escapeHtml(ind.name)}</h2>
      ${card?.definition ? `<p class="ind-detail-subtitle">${escapeHtml(card.definition)}</p>` : ''}
    </header>

    <section class="ind-hero">
      <div class="ind-hero-value">
        <div class="ind-hero-big">
          <span class="ind-hero-num">${formatValue(ind.value)}</span>
          <span class="ind-hero-unit">${escapeHtml(ind.unit)}</span>
        </div>
        <div class="ind-hero-meta">
          <span class="signal-pill ${ind.signal}">${SIGNAL_LABELS[ind.signal] ?? ind.signal}</span>
          ${ind.year ? `<span class="ind-hero-year">${ind.year}</span>` : ''}
          ${yoy ? `<span class="ind-hero-yoy ${yoy.cls}">${yoy.glyph} ${Math.abs(yoy.pct).toFixed(1)} % YoY</span>` : ''}
        </div>
      </div>
      <div class="ind-hero-bench">
        ${benchmarkHTML}
      </div>
    </section>

    ${card?.patient_story ? `
      <section class="ind-section ind-story-section">
        <h3>Proč na tom záleží</h3>
        <div class="ind-story">${formatNarrative(card.patient_story)}</div>
      </section>
    ` : ''}

    ${ind.trend?.length >= 2 ? `
      <section class="ind-section">
        <h3>Vývoj v čase</h3>
        <div class="ind-trend-chart-wrap"><canvas id="indTrendChart" aria-label="Graf vývoje hodnoty indikátoru v čase"></canvas></div>
      </section>
    ` : ''}

    ${regionDataset ? renderRegionalSection(regionDataset, ind) : renderRegionalPlaceholder()}

    ${card?.determinants ? `
      <section class="ind-section">
        <h3>Co tento indikátor ovlivňuje</h3>
        <div class="ind-narrative">${formatNarrative(card.determinants)}</div>
      </section>
    ` : ''}

    ${card?.importance ? `
      <section class="ind-section">
        <h3>V čem je indikátor zásadní</h3>
        <div class="ind-narrative">${formatNarrative(card.importance)}</div>
      </section>
    ` : ''}

    <section class="ind-section">
      <h3>Metodika a definice</h3>
      <dl class="ind-method-dl">
        <dt>Definice</dt><dd>${escapeHtml(card?.definition ?? '—')}</dd>
        <dt>Jednotka</dt><dd>${escapeHtml(card?.unit ?? ind.unit)}</dd>
        <dt>Směr (žádoucí trend)</dt><dd>${escapeHtml(DIRECTION_LABEL[card?.direction ?? ind.direction] ?? '—')}</dd>
        <dt>Frekvence aktualizace</dt><dd>${escapeHtml(card?.frequency ?? '—')}</dd>
        <dt>Garanti dat</dt><dd>${escapeHtml((card?.stewards || []).join(', ') || '—')}</dd>
        ${card?.signal_thresholds ? `<dt>Prahy signálu</dt><dd>good ≥ ${card.signal_thresholds.good} % rezerva, warn nad −${card.signal_thresholds.warn} %</dd>` : ''}
        ${card?.method_notes ? `<dt>Metodické poznámky</dt><dd>${escapeHtml(card.method_notes)}</dd>` : ''}
        ${card?.limitations ? `<dt>Omezení interpretace</dt><dd>${escapeHtml(card.limitations)}</dd>` : ''}
      </dl>
      ${card?.data_source ? `
        <h4 class="ind-method-sub">Zdroje dat</h4>
        ${renderDataSource(card.data_source)}
      ` : ''}
    </section>

    <section class="ind-section">
      <h3>Související obsah</h3>
      <div class="ind-related" id="indRelated">
        <p class="loading-msg">Načítám propojené strategie a vysvětlení…</p>
      </div>
    </section>

    <footer class="ind-detail-footer">
      <span>Zdroj hodnoty: <strong>${escapeHtml(ind.source?.name ?? '?')}</strong></span>
      ${ind.source?.url ? `<a href="${escapeHtml(ind.source.url)}" target="_blank" rel="noopener">primární zdroj ↗</a>` : ''}
      ${ind.source?.fetched_at ? `<span>Aktualizace: ${escapeHtml(ind.source.fetched_at.slice(0,10))}</span>` : ''}
      ${ind.source?.origin ? `<span class="origin-tag origin-${escapeHtml(ind.source.origin)}">${escapeHtml(ind.source.origin)}</span>` : ''}
      <a class="feedback-link" href="https://github.com/veritasderman-rgb/hspa/issues/new?title=Chyba+nebo+návrh:+${encodeURIComponent(ind.id)}" target="_blank" rel="noopener">Nahlásit chybu nebo návrh ↗</a>
    </footer>
  `;

  if (ind.trend?.length >= 2) {
    renderTrendChart(ind);
  }

  if (regionDataset) {
    wireRegionalSection(regionDataset, ind);
  }

  loadRelated(ind.id);
}

function renderBenchmarks(ind) {
  const b = ind.benchmark || {};
  if (b.oecd == null && b.eu == null && b.oecd_best == null) {
    return `<p class="ind-no-bench">Pro tento indikátor nejsou k dispozici srovnatelné mezinárodní benchmarky.</p>`;
  }
  const rows = [];
  rows.push(benchRow('ČR', ind.value, ind.unit, ind.signal, true));
  if (b.oecd != null) rows.push(benchRow('OECD průměr', b.oecd, ind.unit, 'oecd'));
  if (b.eu != null) rows.push(benchRow('EU průměr', b.eu, ind.unit, 'eu'));
  if (b.oecd_best != null) rows.push(benchRow('Top OECD', b.oecd_best, ind.unit, 'best'));
  return `<table class="ind-bench-table">${rows.join('')}</table>`;
}

function benchRow(label, value, unit, kind, primary = false) {
  const cls = primary ? 'bench-primary' : '';
  return `
    <tr class="${cls}">
      <th>${escapeHtml(label)}</th>
      <td><strong>${formatValue(value)}</strong> <span class="ind-bench-unit">${escapeHtml(unit)}</span></td>
    </tr>
  `;
}

function formatValue(v) {
  if (v == null) return '—';
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  if (Math.abs(n) >= 100) return n.toFixed(0);
  if (Math.abs(n) >= 10) return n.toFixed(1);
  return n.toFixed(1);
}

function computeYoy(ind) {
  const t = ind.trend;
  if (!Array.isArray(t) || t.length < 2) return null;
  const last = t[t.length - 1]?.value;
  const prev = t[t.length - 2]?.value;
  if (last == null || prev == null || prev === 0) return null;
  const pct = (last - prev) / prev * 100;
  if (Math.abs(pct) < 0.5) return { glyph: '→', cls: 'flat', pct };
  const positive = pct > 0;
  const dir = ind.direction ?? 'context_dependent';
  let cls = 'flat';
  if (dir !== 'context_dependent') {
    const isImprovement = (dir === 'higher_is_better' && positive) || (dir === 'lower_is_better' && !positive);
    cls = isImprovement ? 'good' : 'bad';
  }
  return { glyph: positive ? '↑' : '↓', cls, pct };
}

function renderTrendChart(ind) {
  const canvas = document.getElementById('indTrendChart');
  if (!canvas) return;
  const trend = ind.trend || [];
  const labels = trend.map(t => t.year);
  const color = ind.signal === 'good' ? '#38761D'
    : ind.signal === 'warn' ? '#B45F06'
    : ind.signal === 'bad' ? '#990000' : '#0B5394';

  const datasets = [{
    label: 'ČR',
    data: trend.map(t => t.value),
    borderColor: color, backgroundColor: color + '22',
    fill: true, tension: 0.3,
    pointRadius: 4, pointHoverRadius: 6, borderWidth: 2.5,
  }];

  if (ind.benchmark?.oecd != null) {
    datasets.push({
      label: 'OECD průměr',
      data: labels.map(() => ind.benchmark.oecd),
      borderColor: '#4A90D9', borderDash: [6, 3],
      borderWidth: 1.5, pointRadius: 0, fill: false, backgroundColor: 'transparent',
    });
  }
  if (ind.benchmark?.eu != null) {
    datasets.push({
      label: 'EU průměr',
      data: labels.map(() => ind.benchmark.eu),
      borderColor: '#E69138', borderDash: [3, 3],
      borderWidth: 1.5, pointRadius: 0, fill: false, backgroundColor: 'transparent',
    });
  }
  if (ind.benchmark?.oecd_best != null) {
    datasets.push({
      label: 'Top OECD',
      data: labels.map(() => ind.benchmark.oecd_best),
      borderColor: '#16A34A', borderDash: [2, 4],
      borderWidth: 1.5, pointRadius: 0, fill: false, backgroundColor: 'transparent',
    });
  }

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // eslint-disable-next-line no-undef
  _trendChart = new Chart(canvas, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      animation: reduceMotion ? { duration: 0 } : { duration: 600 },
      plugins: {
        legend: { position: 'top', labels: { font: { size: 12 }, boxWidth: 18 } },
        tooltip: { displayColors: true },
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 12 } } },
        y: { grid: { color: '#EDF2F7' }, ticks: { font: { size: 12 } } },
      },
    },
  });
}

function renderRegionalSection(ds, ind) {
  return `
    <section class="ind-section ind-region-section">
      <h3>Regionální rozpad — 14 krajů ČR</h3>
      <p class="ind-region-note">
        Hodnoty: <strong>${escapeHtml(ds.name)}</strong> · jednotka <strong>${escapeHtml(ds.unit)}</strong> ·
        rok ${escapeHtml(String(ds.year))} · průměr ČR <strong>${formatValue(ds.country_avg)}</strong> ${escapeHtml(ds.unit)}
        ${ds.note ? `<br><em>${escapeHtml(ds.note)}</em>` : ''}
      </p>
      <div class="ind-map-grid">
        <div class="ind-map-wrap">
          <div id="czRegionMap" class="cz-map-host" aria-label="Mapa krajů ČR — barva podle hodnoty indikátoru"></div>
          <div class="ind-map-legend" id="czMapLegend"></div>
        </div>
        <div class="ind-map-table-wrap">
          <table class="regions-table" id="indRegionsTable">
            <thead>
              <tr>
                <th>Kraj</th>
                <th>${escapeHtml(ds.name)}</th>
                <th>Δ od průměru ČR</th>
              </tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>
      </div>
    </section>
  `;
}

function renderRegionalPlaceholder() {
  return `
    <section class="ind-section ind-region-section">
      <h3>Regionální rozpad</h3>
      <p class="ind-no-region">
        Pro tento indikátor nejsou v <code>data/regions.json</code> aktuálně k dispozici krajská data.
        Po dodání ÚZIS / ČSÚ podkladů zde bude mapa 14 krajů ČR a srovnávací tabulka.
      </p>
    </section>
  `;
}

function wireRegionalSection(ds, ind) {
  // Mapa
  const host = document.getElementById('czRegionMap');
  if (host) {
    renderCzMap(host, ds, {
      onRegionHover: (code) => highlightTableRow(code, true),
      onRegionLeave: (code) => highlightTableRow(code, false),
    });
  }

  // Legenda
  const legend = document.getElementById('czMapLegend');
  if (legend) {
    if (ds.direction === 'context_dependent') {
      legend.innerHTML = `
        <span class="cml-item"><i class="cml-sw cml-ctx-above"></i> nad průměrem ČR</span>
        <span class="cml-item"><i class="cml-sw cml-ctx-below"></i> pod průměrem ČR</span>
        <span class="cml-item"><i class="cml-sw cml-mid"></i> ±2 % od průměru</span>
        <span class="cml-item cml-ctx-note">Indikátor je kontextový — odchylka neznamená automaticky lepší/horší výkon.</span>
      `;
    } else {
      legend.innerHTML = `
        <span class="cml-item"><i class="cml-sw cml-good"></i> lepší než průměr ČR</span>
        <span class="cml-item"><i class="cml-sw cml-bad"></i> horší než průměr ČR</span>
        <span class="cml-item"><i class="cml-sw cml-mid"></i> ±2 % od průměru</span>
      `;
    }
  }

  // Tabulka
  const tbody = document.querySelector('#indRegionsTable tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  const betterHigher = ds.direction !== 'lower_is_better';
  const sorted = [...ds.regions].sort((a, b) => betterHigher ? b.value - a.value : a.value - b.value);
  for (const r of sorted) {
    const diff = (r.value - ds.country_avg);
    const diffStr = (diff > 0 ? '+' : '') + diff.toFixed(diff < 1 ? 2 : 1);
    const diffCls = (betterHigher ? diff > 0 : diff < 0) ? 'pos' : (diff === 0 ? '' : 'neg');
    const tr = document.createElement('tr');
    tr.dataset.regionCode = r.code;
    tr.innerHTML = `
      <td>${escapeHtml(r.name)}</td>
      <td>${formatValue(r.value)}</td>
      <td class="diff ${diffCls}">${diffStr}</td>
    `;
    tr.addEventListener('mouseenter', () => highlightMapRegion(r.code, true));
    tr.addEventListener('mouseleave', () => highlightMapRegion(r.code, false));
    tbody.appendChild(tr);
  }
}

function highlightTableRow(code, on) {
  const row = document.querySelector(`#indRegionsTable tbody tr[data-region-code="${code}"]`);
  if (row) row.classList.toggle('row-hover', on);
}

function highlightMapRegion(code, on) {
  const el = document.querySelector(`#czRegionMap [data-region-code="${code}"]`);
  if (el) el.classList.toggle('region-hover', on);
}

function renderDataSource(ds) {
  if (!ds || typeof ds !== 'object') return '<em>Neuvedeno</em>';
  const parts = [];
  if (ds.primary) parts.push(`<div class="ds-block"><h4>Primární zdroj</h4>${renderSourceObj(ds.primary)}</div>`);
  if (ds.fallback) parts.push(`<div class="ds-block"><h4>Záložní zdroj</h4>${renderSourceObj(ds.fallback)}</div>`);
  if (ds.regional) parts.push(`<div class="ds-block"><h4>Regionální data</h4>${renderSourceObj(ds.regional)}</div>`);
  return parts.join('') || '<em>Neuvedeno</em>';
}

function renderSourceObj(o) {
  const pairs = Object.entries(o).filter(([k]) => k !== 'note');
  const noteHTML = o.note ? `<p class="ds-note">${escapeHtml(o.note)}</p>` : '';
  const tableHTML = pairs.length
    ? `<table class="ds-table">${pairs.map(([k, v]) =>
        `<tr><th>${escapeHtml(k)}</th><td>${typeof v === 'object' ? escapeHtml(JSON.stringify(v)) : escapeHtml(String(v))}</td></tr>`
      ).join('')}</table>`
    : '';
  return tableHTML + noteHTML;
}

async function loadRelated(indicatorId) {
  const target = document.getElementById('indRelated');
  if (!target) return;
  try {
    const [s, e, a] = await Promise.all([
      fetch('data/strategies.json').then(r => r.ok ? r.json() : { strategies: [] }).catch(() => ({ strategies: [] })),
      fetch('data/explainers.json').then(r => r.ok ? r.json() : { explainers: [] }).catch(() => ({ explainers: [] })),
      fetch('data/articles.json').then(r => r.ok ? r.json() : { articles: [] }).catch(() => ({ articles: [] })),
    ]);
    const strategies = s.strategies ?? [];
    const explainers = e.explainers ?? [];
    const articles = (a.articles ?? []).filter(ar => isArticleVisible(ar));
    const relatedStrategies = strategies.filter(s => (s.linked_indicators ?? []).includes(indicatorId));
    const relatedExplainers = explainers.filter(e => (e.linked_indicators ?? []).includes(indicatorId));
    const relatedArticles = articles.filter(ar => (ar.linked_indicators ?? []).includes(indicatorId));

    if (!relatedStrategies.length && !relatedExplainers.length && !relatedArticles.length) {
      target.innerHTML = `<p class="ind-no-related">Pro tento indikátor zatím nejsou v naší databázi explicitně propojené strategie, vysvětlení ani články.</p>`;
      return;
    }

    let html = '';
    if (relatedArticles.length) {
      html += `<h4 class="ind-related-heading">Články (${relatedArticles.length})</h4>`;
      html += `<ul class="ind-related-list ind-related-articles">`;
      html += relatedArticles.map(ar => `
        <li><a href="${escapeHtml(ar.slug)}"><strong>${escapeHtml(ar.title)}</strong></a>
        ${ar.perex ? `<span class="ind-related-sub">${escapeHtml(ar.perex)}</span>` : ''}</li>
      `).join('');
      html += `</ul>`;
    }
    if (relatedStrategies.length) {
      html += `<h4 class="ind-related-heading">Strategie a politiky (${relatedStrategies.length})</h4>`;
      html += `<ul class="ind-related-list">`;
      html += relatedStrategies.map(s => `
        <li><a href="strategie.html?id=${encodeURIComponent(s.id)}"><strong>${escapeHtml(s.title)}</strong></a>
        ${s.subtitle ? `<span class="ind-related-sub">${escapeHtml(s.subtitle)}</span>` : ''}</li>
      `).join('');
      html += `</ul>`;
    }
    if (relatedExplainers.length) {
      html += `<h4 class="ind-related-heading">Vysvětlení a kontext (${relatedExplainers.length})</h4>`;
      html += `<ul class="ind-related-list">`;
      html += relatedExplainers.map(e => `
        <li><a href="jak-funguje.html?id=${encodeURIComponent(e.id)}"><strong>${escapeHtml(e.title)}</strong></a>
        ${e.subtitle ? `<span class="ind-related-sub">${escapeHtml(e.subtitle)}</span>` : ''}</li>
      `).join('');
      html += `</ul>`;
    }
    target.innerHTML = html;
  } catch {
    target.innerHTML = `<p class="ind-no-related">Propojený obsah se nepodařilo načíst.</p>`;
  }
}

function formatNarrative(text) {
  if (!text) return '';
  // Markdown-light: paragraphs separated by blank lines; **bold** → <strong>
  const safe = escapeHtml(text);
  const withBold = safe.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  return withBold.split(/\n\s*\n/).map(p => `<p>${p.trim()}</p>`).join('');
}

if (typeof window !== 'undefined') init();
