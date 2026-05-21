// Frontend logika stránky kolonoskopie.html.
// Načítá data/kolonoskopie.json (agregát 6 otevřených datasetů Národního
// programu screeningu kolorektálního karcinomu) a vykresluje kompletní
// vizualizaci: pokrytí, TOKS, kolonoskopie, pozitivitu, návaznost a čekací doby.

import './analytics.js';
import { renderModuleNav, renderMastheadDate, escapeHtml, renderErrorState } from './page-shared.js';
import { REGION_NAME_BY_CODE, registerCzMap, buildChoroplethOption } from './cz-choropleth.js';

let DATA = null;
const charts = {};   // canvasId → Chart instance
const maps = {};     // hostId → echarts instance

// ─────────────────────────────────────────────
// Paleta a popisky
// ─────────────────────────────────────────────

const C = {
  ink: '#1f1a14', red: '#b8361e', good: '#2f6b1f', warn: '#a05a08',
  blue: '#3a6ea5', plum: '#6b3f6b', neutral: '#8a8174',
};
const GRID = 'rgba(31,26,20,0.10)';
const AGE_COLORS = [
  '#3a6ea5', '#4f9d8c', '#79a23c', '#c9a227',
  '#d77a2b', '#b8361e', '#9c3b6b', '#5a4a8a',
];
const GENDER = {
  M: { color: '#3a6ea5', label: 'Muži' },
  Z: { color: '#b8361e', label: 'Ženy' },
};

// ─────────────────────────────────────────────
// Formátování
// ─────────────────────────────────────────────

function fmtInt(n) {
  if (n == null || !Number.isFinite(+n)) return '—';
  return Math.round(+n).toLocaleString('cs-CZ');
}
function fmtNum(n, d = 1) {
  if (n == null || !Number.isFinite(+n)) return '—';
  return (+n).toLocaleString('cs-CZ', { minimumFractionDigits: d, maximumFractionDigits: d });
}
function regionName(code) {
  return REGION_NAME_BY_CODE[code] || code;
}

// ─────────────────────────────────────────────
// Mapy krajů (echarts choropleth — sdílené UX s krajským přehledem)
// ─────────────────────────────────────────────

function drawMap(hostId, dataset) {
  const el = document.getElementById(hostId);
  if (!el || typeof echarts === 'undefined') return;
  let inst = maps[hostId];
  if (!inst) {
    inst = echarts.init(el);
    maps[hostId] = inst;
  }
  inst.setOption(buildChoroplethOption(dataset), true);
}

// ─────────────────────────────────────────────
// Chart.js pomocné
// ─────────────────────────────────────────────

function drawChart(canvasId, config) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || typeof Chart === 'undefined') return;
  if (charts[canvasId]) charts[canvasId].destroy();
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  config.options = config.options || {};
  config.options.responsive = true;
  config.options.maintainAspectRatio = false;
  config.options.animation = reduceMotion ? { duration: 0 } : (config.options.animation ?? { duration: 500 });
  charts[canvasId] = new Chart(canvas, config);
}

function lineScales(yLabel, opts = {}) {
  return {
    x: { grid: { display: false }, ticks: { font: { size: 11 } } },
    y: {
      beginAtZero: opts.beginAtZero ?? true,
      grid: { color: GRID },
      ticks: { font: { size: 11 }, callback: opts.yTick },
      title: yLabel ? { display: true, text: yLabel, font: { size: 11 } } : undefined,
    },
  };
}

function baseLineOptions(yLabel, opts = {}) {
  return {
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { position: 'top', labels: { font: { size: 11 }, boxWidth: 16, usePointStyle: true } },
      tooltip: { callbacks: opts.tooltip },
    },
    scales: lineScales(yLabel, opts),
  };
}

// ─────────────────────────────────────────────
// Sekce s časovým trendem (pokrytí / TOKS / kolonoskopie / pozitivita)
// ─────────────────────────────────────────────

// cfg: { key, ds, valueKey, unit, suffix, decimals, mapDirection, isPercent }
function setupTrendSection(cfg) {
  const { key, ds, valueKey, unit, decimals, mapDirection } = cfg;
  const years = ds.national.map(r => r.year);

  // -- graf (přepínač dimenzí) --
  function renderChart(dim) {
    let datasets;
    if (dim === 'gender') {
      datasets = ['Z', 'M'].map(g => ({
        label: GENDER[g].label,
        data: ds.by_gender[g].map(r => r[valueKey]),
        borderColor: GENDER[g].color,
        backgroundColor: GENDER[g].color + '22',
        tension: 0.3, borderWidth: 2.5, pointRadius: 2, pointHoverRadius: 5, fill: false,
      }));
    } else if (dim === 'age') {
      datasets = Object.keys(ds.by_age).map((ageName, i) => ({
        label: ageName,
        data: ds.by_age[ageName].map(r => r[valueKey]),
        borderColor: AGE_COLORS[i % AGE_COLORS.length],
        backgroundColor: 'transparent',
        tension: 0.3, borderWidth: 2, pointRadius: 1.5, pointHoverRadius: 4, fill: false,
      }));
    } else {
      datasets = [{
        label: 'Celá ČR',
        data: ds.national.map(r => r[valueKey]),
        borderColor: C.red, backgroundColor: C.red + '1f',
        tension: 0.3, borderWidth: 2.8, pointRadius: 3, pointHoverRadius: 6, fill: true,
      }];
    }
    drawChart(`${key}Chart`, {
      type: 'line',
      data: { labels: years, datasets },
      options: baseLineOptions(unit, {
        yTick: (v) => fmtNum(v, valueKey === 'count' ? 0 : 0),
        tooltip: {
          label: (ctx) => `${ctx.dataset.label}: ${valueKey === 'count'
            ? fmtInt(ctx.parsed.y)
            : fmtNum(ctx.parsed.y, decimals)}${cfg.isPercent ? ' %' : (unit ? ' ' + unit : '')}`,
        },
      }),
    });
  }
  wireToggle(`${key}Dim`, renderChart);
  renderChart('total');

  // -- mapa krajů + tabulka okresů (přepínač roku) --
  const yearSel = document.getElementById(`${key}Year`);
  fillYearSelect(yearSel, years, years.at(-1));

  function renderMap(year) {
    const natRow = ds.national.find(r => r.year === year);
    const countryAvg = natRow ? natRow[valueKey] : 0;
    const regions = [];
    for (const code of Object.keys(ds.by_region)) {
      const row = ds.by_region[code].find(r => r.year === year);
      if (row && REGION_NAME_BY_CODE[code]) {
        regions.push({ code, name: regionName(code), value: row[valueKey] });
      }
    }
    drawMap(`${key}Map`, {
      regions, country_avg: countryAvg, unit: cfg.isPercent ? '%' : (unit || ''),
      direction: mapDirection,
    });
  }
  yearSel?.addEventListener('change', () => renderMap(+yearSel.value));
  renderMap(years.at(-1));

  // tabulka okresů — vždy za poslední uzavřený rok (districts_latest)
  const yLabel = document.getElementById(`${key}DistrictYear`);
  if (yLabel) yLabel.textContent = `(${ds.latest_year})`;
  renderDistrictTable(`${key}DistrictTable`, ds.districts_latest, cfg);
}

function renderDistrictTable(hostId, districts, cfg) {
  const cols = [
    { key: 'name', label: 'Okres', type: 'text' },
    { key: 'region', label: 'Kraj', type: 'text', get: (r) => regionName(r.region_code) },
  ];
  if (cfg.valueKey === 'count') {
    cols.push({ key: 'count', label: 'Počet', type: 'num', fmt: fmtInt });
  } else if (cfg.key === 'coverage') {
    cols.push({ key: 'examined', label: 'Vyšetřeno', type: 'num', fmt: fmtInt });
    cols.push({ key: 'population', label: 'Cílová pop.', type: 'num', fmt: fmtInt });
    cols.push({ key: 'rate', label: 'Pokrytí %', type: 'num', fmt: (v) => fmtNum(v, 1) });
  } else if (cfg.key === 'positivity') {
    cols.push({ key: 'examined', label: 'Testů', type: 'num', fmt: fmtInt });
    cols.push({ key: 'positive', label: 'Pozitivních', type: 'num', fmt: fmtInt });
    cols.push({ key: 'rate', label: 'Pozitivita %', type: 'num', fmt: (v) => fmtNum(v, 2) });
  }
  sortableTable(hostId, cols, districts, cols.length - 1, 'desc');
}

// ─────────────────────────────────────────────
// Řaditelná tabulka
// ─────────────────────────────────────────────

function sortableTable(hostId, columns, rows, defaultIdx, defaultDir) {
  const host = document.getElementById(hostId);
  if (!host) return;
  let sortIdx = defaultIdx;
  let sortDir = defaultDir;

  const cellVal = (row, col) => (col.get ? col.get(row) : row[col.key]);

  function render() {
    const col = columns[sortIdx];
    const sorted = [...rows].sort((a, b) => {
      let va = cellVal(a, col), vb = cellVal(b, col);
      if (col.type === 'num') {
        va = va == null ? -Infinity : +va;
        vb = vb == null ? -Infinity : +vb;
        return sortDir === 'asc' ? va - vb : vb - va;
      }
      va = String(va ?? ''); vb = String(vb ?? '');
      return sortDir === 'asc' ? va.localeCompare(vb, 'cs') : vb.localeCompare(va, 'cs');
    });
    const head = columns.map((c, i) => {
      const arrow = i === sortIdx ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '';
      return `<th class="${c.type === 'num' ? 'krk-num' : ''}" data-idx="${i}" tabindex="0"
        role="button" aria-label="Seřadit podle ${escapeHtml(c.label)}">${escapeHtml(c.label)}${arrow}</th>`;
    }).join('');
    const body = sorted.map(row => `<tr>${columns.map(c => {
      const raw = cellVal(row, c);
      const txt = c.fmt ? c.fmt(raw) : (raw == null ? '—' : String(raw));
      return `<td class="${c.type === 'num' ? 'krk-num' : ''}">${escapeHtml(txt)}</td>`;
    }).join('')}</tr>`).join('');
    host.innerHTML = `<table class="krk-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;

    host.querySelectorAll('th').forEach(th => {
      const handler = () => {
        const idx = +th.dataset.idx;
        if (idx === sortIdx) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
        else { sortIdx = idx; sortDir = columns[idx].type === 'num' ? 'desc' : 'asc'; }
        render();
      };
      th.addEventListener('click', handler);
      th.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handler(); }
      });
    });
  }
  render();
}

// ─────────────────────────────────────────────
// Společné UI prvky
// ─────────────────────────────────────────────

function wireToggle(toggleId, onChange) {
  const group = document.getElementById(toggleId);
  if (!group) return;
  group.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      group.querySelectorAll('button').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      onChange(btn.dataset.dim);
    });
  });
}

function fillYearSelect(sel, years, selected) {
  if (!sel) return;
  sel.innerHTML = years.map(y => `<option value="${y}">${y}</option>`).join('');
  sel.value = String(selected);
}

// ─────────────────────────────────────────────
// Hero statistiky
// ─────────────────────────────────────────────

function renderHero() {
  const host = document.getElementById('krkHeroStats');
  if (!host) return;
  const cov = DATA.coverage.national.at(-1);
  const fobt = DATA.fobt.national.at(-1);
  const colo = DATA.colonoscopy.national.at(-1);
  const pos = DATA.positivity.national.at(-1);
  const fup = DATA.followup.national.at(-1);
  const wq = DATA.waiting.national_quarterly.filter(q => q.year === DATA.waiting.latest_year);
  const waitAvg = wq.length ? wq.reduce((s, q) => s + q.days, 0) / wq.length : null;

  const stats = [
    { n: fmtNum(cov.rate, 1), u: '%', l: 'Pokrytí cílové populace', y: cov.year },
    { n: fmtInt(fobt.count), u: 'testů', l: 'Provedených testů TOKS', y: fobt.year },
    { n: fmtInt(colo.count), u: 'výkonů', l: 'Screeningových kolonoskopií', y: colo.year },
    { n: fmtNum(pos.rate, 1), u: '%', l: 'Pozitivních výsledků TOKS', y: pos.year },
    { n: fmtNum(fup.compliance, 1), u: '%', l: 'Návaznost na kolonoskopii', y: fup.year },
    { n: fmtInt(waitAvg), u: 'dní', l: 'Průměrná čekací doba', y: DATA.waiting.latest_year },
  ];
  host.innerHTML = stats.map(s => `
    <div class="ed-stat ed-stat-static">
      <div class="ed-stat-num">${escapeHtml(s.n)} <span class="ed-stat-unit">${escapeHtml(s.u)}</span></div>
      <div class="ed-stat-lbl">${escapeHtml(s.l)}</div>
      <div class="ed-stat-meta">Rok ${escapeHtml(String(s.y))}</div>
    </div>`).join('');
}

// ─────────────────────────────────────────────
// Cesta pacienta (pathway)
// ─────────────────────────────────────────────

function renderPathway() {
  const host = document.getElementById('krkPathway');
  if (!host) return;
  const fobt = DATA.fobt.national.at(-1);
  const pos = DATA.positivity.national.at(-1);
  const fup = DATA.followup.national.at(-1);
  const colo = DATA.colonoscopy.national.at(-1);
  const yr = fobt.year;

  host.innerHTML = `
    <div class="krk-pw-branch">
      <div class="krk-pw-branch-label">Větev TOKS — test stolice</div>
      <div class="krk-pw-flow">
        <div class="krk-pw-step">
          <div class="krk-pw-num">${fmtInt(fobt.count)}</div>
          <div class="krk-pw-name">Provedených testů TOKS</div>
          <div class="krk-pw-note">neinvazivní test na skryté krvácení</div>
        </div>
        <div class="krk-pw-arrow" aria-hidden="true">→</div>
        <div class="krk-pw-step">
          <div class="krk-pw-num">${fmtInt(pos.positive)}</div>
          <div class="krk-pw-name">Pozitivních výsledků</div>
          <div class="krk-pw-note">${fmtNum(pos.rate, 1)} % testů — indikace ke kolonoskopii</div>
        </div>
        <div class="krk-pw-arrow" aria-hidden="true">→</div>
        <div class="krk-pw-step krk-pw-step-end">
          <div class="krk-pw-num">${fmtNum(fup.compliance, 1)} %</div>
          <div class="krk-pw-name">Podstoupí návaznou kolonoskopii</div>
          <div class="krk-pw-note">${fmtInt(fup.colonoscopies)} z ${fmtInt(fup.positive_toks)} pozitivních</div>
        </div>
      </div>
    </div>
    <div class="krk-pw-branch">
      <div class="krk-pw-branch-label">Větev primární kolonoskopie</div>
      <div class="krk-pw-flow">
        <div class="krk-pw-step krk-pw-step-end">
          <div class="krk-pw-num">${fmtInt(colo.count)}</div>
          <div class="krk-pw-name">Primárních screeningových kolonoskopií</div>
          <div class="krk-pw-note">volba pacienta od 50 let bez předchozího TOKS</div>
        </div>
      </div>
    </div>
    <p class="krk-pw-foot">Hodnoty za rok ${yr} (poslední uzavřený rok dat).</p>
  `;
}

// ─────────────────────────────────────────────
// Sekce návaznosti (PPS-02-05)
// ─────────────────────────────────────────────

function renderFollowup() {
  const fup = DATA.followup;

  // -- funnel poslední rok --
  const last = fup.national.at(-1);
  const missing = last.positive_toks - last.colonoscopies;
  const missPct = last.positive_toks > 0 ? (missing / last.positive_toks) * 100 : 0;
  const funnel = document.getElementById('followupFunnel');
  if (funnel) {
    funnel.innerHTML = `
      <div class="krk-funnel-head">Návaznost v roce ${last.year}</div>
      <div class="krk-funnel-row">
        <div class="krk-funnel-bar" style="width:100%;background:${C.blue}">
          <span class="krk-funnel-label">Pozitivní TOKS</span>
          <span class="krk-funnel-val">${fmtInt(last.positive_toks)}</span>
        </div>
      </div>
      <div class="krk-funnel-row">
        <div class="krk-funnel-bar" style="width:${last.compliance}%;background:${C.good}">
          <span class="krk-funnel-label">Provedená návazná kolonoskopie</span>
          <span class="krk-funnel-val">${fmtInt(last.colonoscopies)} · ${fmtNum(last.compliance, 1)} %</span>
        </div>
      </div>
      <div class="krk-funnel-row">
        <div class="krk-funnel-bar krk-funnel-bar-loss" style="width:${missPct}%">
          <span class="krk-funnel-label">Bez návazné kolonoskopie</span>
          <span class="krk-funnel-val">${fmtInt(missing)} · ${fmtNum(missPct, 1)} %</span>
        </div>
      </div>
      <p class="krk-funnel-note">
        V roce ${last.year} nepodstoupilo návaznou kolonoskopii <strong>${fmtInt(missing)} lidí</strong>
        s pozitivním testem TOKS — promarněná příležitost k včasnému záchytu nádoru.
      </p>`;
  }

  // -- graf compliance --
  const years = fup.national.map(r => r.year);
  function renderComplianceChart(dim) {
    let datasets;
    if (dim === 'gender') {
      datasets = ['Z', 'M'].map(g => ({
        label: GENDER[g].label,
        data: fup.by_gender[g].map(r => r.compliance),
        borderColor: GENDER[g].color, backgroundColor: 'transparent',
        tension: 0.3, borderWidth: 2.5, pointRadius: 2, pointHoverRadius: 5, fill: false,
      }));
    } else if (dim === 'age') {
      datasets = Object.keys(fup.by_age).map((ageName, i) => ({
        label: ageName,
        data: fup.by_age[ageName].map(r => r.compliance),
        borderColor: AGE_COLORS[i % AGE_COLORS.length], backgroundColor: 'transparent',
        tension: 0.3, borderWidth: 2, pointRadius: 1.5, pointHoverRadius: 4, fill: false,
      }));
    } else {
      datasets = [{
        label: 'Celá ČR',
        data: fup.national.map(r => r.compliance),
        borderColor: C.good, backgroundColor: C.good + '1f',
        tension: 0.3, borderWidth: 2.8, pointRadius: 3, pointHoverRadius: 6, fill: true,
      }];
    }
    drawChart('followupChart', {
      type: 'line',
      data: { labels: years, datasets },
      options: baseLineOptions('% návaznosti', {
        beginAtZero: false,
        yTick: (v) => v + ' %',
        tooltip: { label: (ctx) => `${ctx.dataset.label}: ${fmtNum(ctx.parsed.y, 1)} %` },
      }),
    });
  }
  wireToggle('followupDim', renderComplianceChart);
  renderComplianceChart('total');

  // -- mapa krajů --
  const yearSel = document.getElementById('followupYear');
  fillYearSelect(yearSel, years, years.at(-1));
  function renderMap(year) {
    const natRow = fup.national.find(r => r.year === year);
    const regions = [];
    for (const code of Object.keys(fup.by_region)) {
      const row = fup.by_region[code].find(r => r.year === year);
      if (row && REGION_NAME_BY_CODE[code]) {
        regions.push({ code, name: regionName(code), value: row.compliance });
      }
    }
    drawMap('followupMap', {
      regions, country_avg: natRow ? natRow.compliance : 0,
      unit: '%', direction: 'higher_is_better',
    });
  }
  yearSel?.addEventListener('change', () => renderMap(+yearSel.value));
  renderMap(years.at(-1));

  // -- tabulka krajů (poslední rok, vč. mean_weeks) --
  const ryLabel = document.getElementById('followupRegionYear');
  if (ryLabel) ryLabel.textContent = `(${fup.latest_year})`;
  sortableTable('followupRegionTable', [
    { key: 'name', label: 'Kraj', type: 'text' },
    { key: 'positive_toks', label: 'Pozitivní TOKS', type: 'num', fmt: fmtInt },
    { key: 'colonoscopies', label: 'Kolonoskopií', type: 'num', fmt: fmtInt },
    { key: 'compliance', label: 'Návaznost %', type: 'num', fmt: (v) => fmtNum(v, 1) },
    { key: 'mean_weeks', label: 'Ø týdnů', type: 'num', fmt: (v) => fmtNum(v, 1) },
  ], fup.regions_latest, 3, 'desc');

  // -- histogram čekání --
  const histSel = document.getElementById('histYear');
  if (histSel) {
    const opts = ['<option value="all">Všechny roky</option>']
      .concat(Object.keys(fup.weeks_histogram_by_year).sort()
        .map(y => `<option value="${y}">${y}</option>`));
    histSel.innerHTML = opts.join('');
    histSel.value = 'all';
    histSel.addEventListener('change', () => renderHistogram(histSel.value));
  }
  renderHistogram('all');
}

function renderHistogram(yearKey) {
  const fup = DATA.followup;
  const hist = yearKey === 'all'
    ? fup.weeks_histogram
    : (fup.weeks_histogram_by_year[yearKey] || []);
  const labels = hist.map(h => h.weeks);
  const total = hist.reduce((s, h) => s + h.count, 0);

  // statistiky
  const statsEl = document.getElementById('histStats');
  if (statsEl) {
    if (yearKey === 'all') {
      const s = fup.weeks_stats;
      statsEl.textContent = `Ø ${fmtNum(s.mean, 1)} týdne · medián ${s.median} · 90. percentil ${s.p90} týdnů · n = ${fmtInt(s.count)}`;
    } else {
      let cum = 0, target = total / 2, median = null, sum = 0;
      for (const h of hist) {
        sum += h.weeks * h.count;
        cum += h.count;
        if (median == null && cum >= target) median = h.weeks;
      }
      statsEl.textContent = `Ø ${fmtNum(total ? sum / total : 0, 1)} týdne · medián ${median ?? '—'} · n = ${fmtInt(total)}`;
    }
  }

  drawChart('histChart', {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Počet kolonoskopií',
        data: hist.map(h => h.count),
        backgroundColor: hist.map(h => h.weeks <= 4 ? C.good : h.weeks <= 12 ? C.warn : C.red),
        borderWidth: 0,
      }],
    },
    options: {
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (items) => `${items[0].label} týdnů po pozitivním TOKS`,
            label: (ctx) => {
              const pct = total ? (ctx.parsed.y / total * 100) : 0;
              return `${fmtInt(ctx.parsed.y)} kolonoskopií (${fmtNum(pct, 1)} %)`;
            },
          },
        },
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 10 } },
             title: { display: true, text: 'Týdnů mezi pozitivním TOKS a kolonoskopií', font: { size: 11 } } },
        y: { beginAtZero: true, grid: { color: GRID }, ticks: { font: { size: 11 } } },
      },
    },
  });
}

// ─────────────────────────────────────────────
// Sekce čekací doby (PPS-02-07)
// ─────────────────────────────────────────────

function renderWaiting() {
  const w = DATA.waiting;
  const labels = w.national_quarterly.map(q => `${q.year} ${q.quarter}`);

  drawChart('waitingChart', {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Průměr ČR (dní)',
        data: w.national_quarterly.map(q => q.days),
        borderColor: C.red, backgroundColor: C.red + '1f',
        tension: 0.25, borderWidth: 2.8, pointRadius: 3, pointHoverRadius: 6, fill: true,
      }],
    },
    options: baseLineOptions('dní', {
      tooltip: { label: (ctx) => `${fmtInt(ctx.parsed.y)} dní` },
    }),
  });

  const years = [...new Set(w.national_quarterly.map(q => q.year))].sort();
  const yearSel = document.getElementById('waitingYear');
  fillYearSelect(yearSel, years, years.at(-1));

  function avgForYear(arr, year) {
    const rows = arr.filter(q => q.year === year);
    return rows.length ? rows.reduce((s, q) => s + q.days, 0) / rows.length : null;
  }

  function renderMap(year) {
    const countryAvg = avgForYear(w.national_quarterly, year);
    const regions = [];
    for (const code of Object.keys(w.by_region)) {
      if (!REGION_NAME_BY_CODE[code]) continue;
      const avg = avgForYear(w.by_region[code], year);
      if (avg != null) {
        regions.push({ code, name: regionName(code), value: Math.round(avg) });
      }
    }
    drawMap('waitingMap', {
      regions, country_avg: countryAvg || 0, unit: 'dní', direction: 'lower_is_better',
    });
  }
  yearSel?.addEventListener('change', () => renderMap(+yearSel.value));
  renderMap(years.at(-1));

  // tabulka okresů — districts_latest je za poslední uzavřený rok
  const yLabel = document.getElementById('waitingDistrictYear');
  if (yLabel) yLabel.textContent = `(${w.latest_year})`;
  sortableTable('waitingDistrictTable', [
    { key: 'name', label: 'Okres', type: 'text' },
    { key: 'region', label: 'Kraj', type: 'text', get: (r) => regionName(r.region_code) },
    { key: 'days', label: 'Ø dní', type: 'num', fmt: fmtInt },
  ], w.districts_latest, 2, 'desc');
}

// ─────────────────────────────────────────────
// Metodika a zdroje
// ─────────────────────────────────────────────

function renderMethod() {
  const list = document.getElementById('krkSourceList');
  if (list) {
    list.innerHTML = DATA.source.datasets.map(d => `
      <li class="krk-source-item">
        <a href="${escapeHtml(d.page)}" target="_blank" rel="noopener">
          <strong>${escapeHtml(d.code)}</strong> — ${escapeHtml(d.name)}
        </a>
        <span class="krk-source-meta">${escapeHtml(d.period)} · <a href="${escapeHtml(d.url)}" target="_blank" rel="noopener">stáhnout data ↗</a></span>
      </li>`).join('');
  }
  const gen = document.getElementById('krkGenerated');
  if (gen) {
    const dt = new Date(DATA.generated_at);
    gen.textContent = `Datová sada sestavena ${dt.toLocaleDateString('cs-CZ')} · zdroj: ${DATA.source.publisher} · portál NZIP.`;
  }
}

// ─────────────────────────────────────────────
// Inicializace
// ─────────────────────────────────────────────

async function init() {
  if (typeof window === 'undefined') return;
  renderModuleNav();
  renderMastheadDate();

  try {
    const [res, geoRes] = await Promise.all([
      fetch('data/kolonoskopie.json'),
      fetch('data/cz-regions.geojson').catch(() => null),
    ]);
    if (!res.ok) throw new Error(`kolonoskopie.json HTTP ${res.status}`);
    DATA = await res.json();
    if (geoRes && geoRes.ok) registerCzMap(await geoRes.json());

    renderHero();
    renderPathway();

    setupTrendSection({
      key: 'coverage', ds: DATA.coverage, valueKey: 'rate', unit: '%',
      decimals: 1, isPercent: true, mapDirection: 'higher_is_better',
    });
    setupTrendSection({
      key: 'fobt', ds: DATA.fobt, valueKey: 'count', unit: 'testů',
      decimals: 0, isPercent: false, mapDirection: 'context_dependent',
    });
    setupTrendSection({
      key: 'colonoscopy', ds: DATA.colonoscopy, valueKey: 'count', unit: 'kolonoskopií',
      decimals: 0, isPercent: false, mapDirection: 'context_dependent',
    });
    setupTrendSection({
      key: 'positivity', ds: DATA.positivity, valueKey: 'rate', unit: '%',
      decimals: 2, isPercent: true, mapDirection: 'context_dependent',
    });

    renderFollowup();
    renderWaiting();
    renderMethod();

    window.addEventListener('resize', () => {
      for (const m of Object.values(maps)) m.resize();
    });
  } catch (err) {
    console.error('kolonoskopie load failed:', err);
    const host = document.getElementById('krkError');
    if (host) host.innerHTML = renderErrorState('Nepodařilo se načíst data kolorektálního screeningu.', err);
  }
}

if (typeof window !== 'undefined') init();
