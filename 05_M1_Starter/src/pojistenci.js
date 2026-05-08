// Atlas pojištěnců — animovaný dashboard struktury zdravotně pojištěné populace
// ČR 2010–2025 (data: ÚZIS · Centrální registr pojištěnců, NZIP — datová podpora
// dohodovacího řízení 2027, Dimenze 5).
//
// 5 propojených pohledů:
//   1) animovaná choropletní mapa krajů (slider + autoplay, 5 metrik)
//   2) populační pyramida (kraj filter + sleduje slider)
//   3) tržní podíly 7 zdravotních pojišťoven (stacked area, kraj-by-kraj)
//   4) bar-chart-race top 10 okresů (počet 80+, % 80+, % 65+) — M3
//   5) drill-down detail okresu (3 propojené grafy) — M3
//
// echarts je naloadováno globálně přes CDN <script> v pojistenci.html.

import './analytics.js';
import { renderModuleNav, renderMastheadDate } from './page-shared.js';

// Mapování CZ-NUTS3 kód → display name v geojson (sdíleno s kraje.js).
const KRAJ_NAME_BY_CODE = {
  'CZ010': 'Praha',
  'CZ020': 'Středočeský kraj',
  'CZ031': 'Jihočeský kraj',
  'CZ032': 'Plzeňský kraj',
  'CZ041': 'Karlovarský kraj',
  'CZ042': 'Ústecký kraj',
  'CZ051': 'Liberecký kraj',
  'CZ052': 'Královéhradecký kraj',
  'CZ053': 'Pardubický kraj',
  'CZ063': 'Vysočina',
  'CZ064': 'Jihomoravský kraj',
  'CZ071': 'Olomoucký kraj',
  'CZ072': 'Zlínský kraj',
  'CZ080': 'Moravskoslezský kraj',
};
const KRAJ_CODE_BY_NAME = Object.fromEntries(
  Object.entries(KRAJ_NAME_BY_CODE).map(([k, v]) => [v, k])
);

// Konfigurace 5 metrik mapy: rozsahy nastaveny pro stabilní barevnou škálu
// napříč všemi roky (jinak by autoplay každý rok přebarvoval podle aktuálního
// min/max a uživatel by neviděl skutečný posun).
const METRICS = {
  pct_65plus: {
    label: '% obyvatel 65+',
    unit: '%',
    min: 12, max: 25,
    scheme: 'aging',
    description: 'Podíl pojištěnců ve věku 65 a více let. Klíčový demografický indikátor stárnutí populace.',
  },
  pct_80plus: {
    label: '% obyvatel 80+',
    unit: '%',
    min: 3, max: 7,
    scheme: 'aging',
    description: 'Podíl pojištěnců ve věku 80+. Skupina s nejvyšší nákladovou náročností.',
  },
  median_age: {
    label: 'Medián věku',
    unit: ' let',
    min: 38, max: 47,
    scheme: 'aging',
    description: 'Hodnota věku, který rozděluje populaci na dvě stejně velké poloviny.',
  },
  dependency_old: {
    label: 'Index ekonomické závislosti (65+/(15–64))',
    unit: '%',
    min: 18, max: 45,
    scheme: 'aging',
    description: 'Počet osob 65+ na 100 osob v produktivním věku (15–64).',
  },
  vzp_share: {
    label: 'Tržní podíl VZP',
    unit: '%',
    min: 28, max: 80,
    scheme: 'context',
    description: 'Procento všech pojištěnců v kraji u VZP ČR (kód 111).',
  },
};

// Barevná paleta zdravotních pojišťoven pro stacked area chart.
// VZP záměrně červená (HSPA brand accent) — je dominantní hráč.
const ZP_COLORS = {
  '111': '#b8361e', // VZP
  '201': '#1F7A1F', // VoZP
  '205': '#2563EB', // ČPZP
  '207': '#D97706', // OZP
  '209': '#7C3AED', // ZPŠ
  '211': '#0891B2', // ZPMV
  '213': '#BE185D', // RBP
};

const PLAY_STEP_MS = 800;

const state = {
  krajData: null,
  zpData: null,
  okresData: null,
  geo: null,
  metric: 'pct_65plus',
  year: 2025,
  pyramidKraj: 'CZ010',
  zpKraj: 'CZ010',
  okres: 'CZ0100',
  charts: { map: null, pyramid: null, zp: null },
  isPlaying: false,
  playTimer: null,
};

async function init() {
  if (typeof window === 'undefined') return;
  renderModuleNav('pojistenci');
  renderMastheadDate();

  if (typeof echarts === 'undefined') {
    console.error('echarts CDN nedostupné');
    return;
  }

  try {
    const [krajData, zpData, okresData, geo] = await Promise.all([
      fetch('data/pojistenci-d5-kraj.json').then(r => { if (!r.ok) throw new Error('pojistenci-d5-kraj.json HTTP ' + r.status); return r.json(); }),
      fetch('data/pojistenci-d5-zp.json').then(r => { if (!r.ok) throw new Error('pojistenci-d5-zp.json HTTP ' + r.status); return r.json(); }),
      fetch('data/pojistenci-d5-okres.json').then(r => { if (!r.ok) throw new Error('pojistenci-d5-okres.json HTTP ' + r.status); return r.json(); }),
      fetch('data/cz-regions.geojson').then(r => { if (!r.ok) throw new Error('cz-regions.geojson HTTP ' + r.status); return r.json(); }),
    ]);

    state.krajData = krajData;
    state.zpData = zpData;
    state.okresData = okresData;
    state.geo = geo;
    state.year = krajData.years[krajData.years.length - 1];

    echarts.registerMap('cz-regions', geo);

    populatePyramidKrajSelect();
    populateZpKrajSelect();
    populateOkresSelect();

    // M2: aktivní vizualizace.
    initMap();
    initPyramid();
    initZp();

    // M3: zatím skeleton placeholdery (race + drill-down).
    showM3Placeholders();

    bindControls();

    window.addEventListener('resize', () => {
      state.charts.map?.resize();
      state.charts.pyramid?.resize();
      state.charts.zp?.resize();
    });
  } catch (err) {
    console.error('pojistenci load failed:', err);
    showFatalError(err);
  }
}

// ========== Selectory ==========

function populatePyramidKrajSelect() {
  const sel = document.getElementById('pojPyramidKraj');
  if (!sel || !state.krajData) return;
  sel.innerHTML = '';
  for (const k of state.krajData.krajs) {
    const opt = document.createElement('option');
    opt.value = k.code;
    opt.textContent = `${k.shortLabel} · ${KRAJ_NAME_BY_CODE[k.code] || k.name}`;
    if (k.code === state.pyramidKraj) opt.selected = true;
    sel.appendChild(opt);
  }
}

function populateZpKrajSelect() {
  const sel = document.getElementById('pojZpKraj');
  if (!sel || !state.zpData) return;
  sel.innerHTML = '';
  // Speciální entry "Celá ČR" jako agregát všech krajů.
  const optAll = document.createElement('option');
  optAll.value = '__CR__';
  optAll.textContent = 'Celá ČR (agregát)';
  sel.appendChild(optAll);
  for (const k of state.zpData.krajs) {
    const opt = document.createElement('option');
    opt.value = k.code;
    opt.textContent = `${k.shortLabel} · ${KRAJ_NAME_BY_CODE[k.code] || k.name}`;
    if (k.code === state.zpKraj) opt.selected = true;
    sel.appendChild(opt);
  }
}

function populateOkresSelect() {
  const sel = document.getElementById('pojOkres');
  if (!sel || !state.okresData) return;
  const sorted = [...state.okresData.okresy].sort((a, b) => {
    if (a.kraj !== b.kraj) return a.kraj.localeCompare(b.kraj);
    return a.name.localeCompare(b.name, 'cs');
  });
  for (const o of sorted) {
    const opt = document.createElement('option');
    opt.value = o.code;
    opt.textContent = `${o.name} (${o.kraj})`;
    if (o.code === state.okres) opt.selected = true;
    sel.appendChild(opt);
  }
}

// ========== View 1: animovaná choropletní mapa ==========

function initMap() {
  const el = document.getElementById('pojMap');
  if (!el) return;
  el.innerHTML = '';
  state.charts.map = echarts.init(el);
  renderMap();
}

function getMetricValue(krajCode, year, metric) {
  if (metric === 'vzp_share') {
    const block = state.zpData.data[krajCode]?.[year];
    return block?.shares?.['111'] ?? null;
  }
  const block = state.krajData.data[krajCode]?.[year];
  return block?.[metric] ?? null;
}

function renderMap() {
  const chart = state.charts.map;
  if (!chart) return;
  const m = METRICS[state.metric];
  const year = state.year;

  const data = state.krajData.krajs.map(k => {
    const v = getMetricValue(k.code, year, state.metric);
    return {
      name: KRAJ_NAME_BY_CODE[k.code] || k.name,
      value: v,
      code: k.code,
      shortLabel: k.shortLabel,
    };
  });

  // Barevná škála: aging = červená/horké tóny pro vyšší hodnotu;
  // pro vzp_share = neutrální modrá-šedá-oranžová (kontextová).
  let inRange;
  if (m.scheme === 'aging') {
    // Inverzní: vyšší = problematičtější (více seniorů)
    inRange = { color: ['#E6F4EA', '#FFF7E0', '#FCE8E6', '#b8361e'] };
  } else {
    inRange = { color: ['#FFF4E6', '#FFE4C7', '#E2E8F0', '#C7D7E2', '#9AB5C9'] };
  }

  const option = {
    backgroundColor: 'transparent',
    animation: !prefersReducedMotion(),
    animationDuration: 400,
    animationDurationUpdate: 600,
    tooltip: {
      trigger: 'item',
      backgroundColor: '#1f1a14',
      borderWidth: 0,
      textStyle: { color: '#fffaf2', fontFamily: 'Inter, system-ui, sans-serif', fontSize: 13 },
      formatter: function (params) {
        const code = KRAJ_CODE_BY_NAME[params.name];
        if (!code) return params.name;
        const v = getMetricValue(code, year, state.metric);
        if (v == null) return `<strong>${escapeHtml(params.name)}</strong>`;
        const block = state.krajData.data[code][year];
        const total = block.total.toLocaleString('cs-CZ');
        return [
          `<strong>${escapeHtml(params.name)}</strong> · ${year}`,
          `${m.label}: <strong>${formatVal(v)}${m.unit}</strong>`,
          `<span style="opacity:0.7">Pojištěnců celkem: ${total}</span>`,
        ].join('<br/>');
      },
    },
    visualMap: {
      type: 'continuous',
      min: m.min,
      max: m.max,
      left: 16,
      bottom: 16,
      calculable: true,
      inRange,
      text: m.scheme === 'aging' ? ['více', 'méně'] : ['', ''],
      textStyle: { fontSize: 11, fontFamily: 'Inter, system-ui, sans-serif', color: '#1f1a14' },
      formatter: function (v) { return formatVal(v) + m.unit; },
    },
    title: {
      text: `${m.label} · ${year}`,
      subtext: m.description,
      left: 16,
      top: 12,
      textStyle: { fontFamily: 'Inter, system-ui, sans-serif', fontSize: 14, fontWeight: 600, color: '#1f1a14' },
      subtextStyle: { fontFamily: 'Inter, system-ui, sans-serif', fontSize: 11, color: '#5a5347' },
    },
    series: [{
      name: m.label,
      type: 'map',
      map: 'cz-regions',
      roam: false,
      data,
      universalTransition: false,
      label: {
        show: true,
        formatter: (p) => {
          const code = KRAJ_CODE_BY_NAME[p.name];
          const v = code ? getMetricValue(code, year, state.metric) : null;
          if (v == null) return '';
          return formatValShort(v);
        },
        fontSize: 10,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontWeight: 600,
        color: '#1f1a14',
      },
      itemStyle: { borderColor: '#1f1a14', borderWidth: 0.8 },
      emphasis: {
        itemStyle: { borderWidth: 2, borderColor: '#b8361e' },
        label: { color: '#b8361e' },
      },
    }],
  };

  chart.setOption(option, true);

  // Synchronizovat label nad sliderem.
  const yearLabel = document.getElementById('pojYearLabel');
  if (yearLabel) yearLabel.textContent = year;
}

// ========== View 2: populační pyramida ==========

function initPyramid() {
  const el = document.getElementById('pojPyramid');
  if (!el) return;
  el.innerHTML = '';
  state.charts.pyramid = echarts.init(el);
  renderPyramid();
}

function renderPyramid() {
  const chart = state.charts.pyramid;
  if (!chart || !state.krajData) return;
  const krajCode = state.pyramidKraj;
  const year = state.year;
  const block = state.krajData.data[krajCode]?.[year];
  if (!block) return;

  const ageGroups = state.krajData.age_groups;
  const labels = ageGroups.map(g => g.label);
  // M musí jít doleva (záporná hodnota), Z doprava (kladná).
  const m = ageGroups.map(g => -(block.byAgeSex[`${g.key}:M`] || 0));
  const z = ageGroups.map(g => block.byAgeSex[`${g.key}:Z`] || 0);
  const maxAbs = Math.max(...m.map(Math.abs), ...z);

  // Synchronizovat label.
  const yLabel = document.getElementById('pojPyramidYearLabel');
  if (yLabel) yLabel.textContent = year;

  const krajName = KRAJ_NAME_BY_CODE[krajCode] || krajCode;

  const option = {
    backgroundColor: 'transparent',
    animation: !prefersReducedMotion(),
    animationDuration: 600,
    animationDurationUpdate: 600,
    title: {
      text: `${krajName} · ${year}`,
      subtext: `${block.total.toLocaleString('cs-CZ')} pojištěnců · medián věku ${block.median_age} let · 65+ ${block.pct_65plus} % · 80+ ${block.pct_80plus} %`,
      left: 'center',
      top: 8,
      textStyle: { fontFamily: 'Inter, system-ui, sans-serif', fontSize: 14, fontWeight: 600, color: '#1f1a14' },
      subtextStyle: { fontFamily: 'Inter, system-ui, sans-serif', fontSize: 11, color: '#5a5347' },
    },
    grid: { left: 110, right: 30, top: 70, bottom: 36 },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: '#1f1a14',
      borderWidth: 0,
      textStyle: { color: '#fffaf2', fontFamily: 'Inter, system-ui, sans-serif', fontSize: 12 },
      formatter: (params) => {
        if (!params.length) return '';
        const idx = params[0].dataIndex;
        const ageLabel = labels[idx];
        const muzi = Math.abs(m[idx]);
        const zeny = z[idx];
        return [
          `<strong>${escapeHtml(ageLabel)} let</strong>`,
          `Muži: ${muzi.toLocaleString('cs-CZ')}`,
          `Ženy: ${zeny.toLocaleString('cs-CZ')}`,
          `Celkem: ${(muzi + zeny).toLocaleString('cs-CZ')}`,
        ].join('<br/>');
      },
    },
    legend: {
      data: ['Muži', 'Ženy'],
      bottom: 6,
      textStyle: { fontFamily: 'Inter, system-ui, sans-serif', fontSize: 12 },
    },
    xAxis: {
      type: 'value',
      min: -maxAbs * 1.05,
      max: maxAbs * 1.05,
      axisLabel: {
        formatter: (v) => Math.abs(v).toLocaleString('cs-CZ'),
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 11,
      },
      splitLine: { lineStyle: { color: '#e8e2d4', type: 'dashed' } },
    },
    yAxis: {
      type: 'category',
      data: labels,
      axisLabel: {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 11,
        color: '#1f1a14',
      },
      axisTick: { show: false },
    },
    series: [
      {
        name: 'Muži',
        type: 'bar',
        stack: 'pyramid',
        data: m,
        itemStyle: { color: '#2563EB' },
        emphasis: { itemStyle: { color: '#1d4ed8' } },
      },
      {
        name: 'Ženy',
        type: 'bar',
        stack: 'pyramid',
        data: z,
        itemStyle: { color: '#b8361e' },
        emphasis: { itemStyle: { color: '#9b2a17' } },
      },
    ],
  };

  chart.setOption(option, true);
}

// ========== View 3: tržní podíly ZP ==========

function initZp() {
  const el = document.getElementById('pojZpChart');
  if (!el) return;
  el.innerHTML = '';
  state.charts.zp = echarts.init(el);
  renderZp();
}

function aggregateZpForCR() {
  // Sečte counts napříč všemi kraji a přepočítá podíly.
  const years = state.zpData.years;
  const insurers = state.zpData.insurers;
  const result = {};
  for (const y of years) {
    const counts = {};
    let total = 0;
    for (const ins of insurers) counts[ins.code] = 0;
    for (const k of state.zpData.krajs) {
      const block = state.zpData.data[k.code][y];
      for (const ins of insurers) {
        counts[ins.code] += block.counts[ins.code] || 0;
      }
      total += block.total;
    }
    const shares = {};
    for (const ins of insurers) {
      shares[ins.code] = total > 0 ? Math.round(1000 * counts[ins.code] / total) / 10 : null;
    }
    result[y] = { counts, shares, total };
  }
  return result;
}

function renderZp() {
  const chart = state.charts.zp;
  if (!chart || !state.zpData) return;
  const krajCode = state.zpKraj;
  const years = state.zpData.years;
  const insurers = state.zpData.insurers;

  const blockByYear = krajCode === '__CR__'
    ? aggregateZpForCR()
    : state.zpData.data[krajCode];

  const series = insurers.map((ins) => ({
    name: `${ins.code} ${ins.name}`,
    type: 'line',
    stack: 'shares',
    smooth: 0.3,
    symbol: 'none',
    lineStyle: { width: 0 },
    areaStyle: { color: ZP_COLORS[ins.code], opacity: 0.92 },
    emphasis: { focus: 'series' },
    data: years.map(y => blockByYear[y]?.shares?.[ins.code] ?? 0),
  }));

  const krajLabel = krajCode === '__CR__'
    ? 'Celá ČR (agregát všech krajů)'
    : (KRAJ_NAME_BY_CODE[krajCode] || krajCode);

  const option = {
    backgroundColor: 'transparent',
    animation: !prefersReducedMotion(),
    animationDuration: 500,
    title: {
      text: `Tržní podíly zdravotních pojišťoven · ${krajLabel}`,
      subtext: 'Pohled na vývoj 2010–2025; 100 % stacked area',
      left: 16,
      top: 8,
      textStyle: { fontFamily: 'Inter, system-ui, sans-serif', fontSize: 14, fontWeight: 600, color: '#1f1a14' },
      subtextStyle: { fontFamily: 'Inter, system-ui, sans-serif', fontSize: 11, color: '#5a5347' },
    },
    grid: { left: 50, right: 18, top: 70, bottom: 60 },
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1f1a14',
      borderWidth: 0,
      textStyle: { color: '#fffaf2', fontFamily: 'Inter, system-ui, sans-serif', fontSize: 12 },
      formatter: (params) => {
        if (!params.length) return '';
        const year = params[0].axisValue;
        const items = params
          .slice()
          .sort((a, b) => b.value - a.value)
          .map(p => {
            const sw = `<span style="display:inline-block;width:8px;height:8px;background:${p.color};margin-right:6px;"></span>`;
            return `${sw}${escapeHtml(p.seriesName)}: <strong>${(p.value || 0).toFixed(1)} %</strong>`;
          });
        return `<strong>${year}</strong><br/>${items.join('<br/>')}`;
      },
    },
    legend: {
      data: series.map(s => s.name),
      bottom: 6,
      type: 'scroll',
      textStyle: { fontFamily: 'Inter, system-ui, sans-serif', fontSize: 11 },
    },
    xAxis: {
      type: 'category',
      data: years,
      boundaryGap: false,
      axisLabel: { fontFamily: 'Inter, system-ui, sans-serif', fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 100,
      axisLabel: { formatter: '{value} %', fontFamily: 'Inter, system-ui, sans-serif', fontSize: 11 },
      splitLine: { lineStyle: { color: '#e8e2d4', type: 'dashed' } },
    },
    series,
  };

  chart.setOption(option, true);
}

// ========== Skeleton placeholdery pro M3 (race + drill-down) ==========

function showM3Placeholders() {
  const placeholder = (id, msg) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = `<div class="pojistenci-placeholder"><strong>Skeleton M3</strong><br>${msg}</div>`;
  };
  placeholder('pojRace', 'Bar-chart-race top 10 okresů — implementace v M3.');
  placeholder('pojOkresTotal', 'Drill-down — celková populace (M3).');
  placeholder('pojOkresAge', 'Drill-down — věková struktura (M3).');
  placeholder('pojOkresCompare', 'Drill-down — srovnání (M3).');
}

// ========== Ovládání: slider, autoplay, selecty ==========

function bindControls() {
  const metricSel = document.getElementById('pojMetric');
  if (metricSel) {
    metricSel.addEventListener('change', () => {
      state.metric = metricSel.value;
      renderMap();
    });
  }

  const yearSlider = document.getElementById('pojYear');
  if (yearSlider) {
    const years = state.krajData.years;
    yearSlider.min = years[0];
    yearSlider.max = years[years.length - 1];
    yearSlider.value = state.year;
    yearSlider.addEventListener('input', () => {
      const y = parseInt(yearSlider.value, 10);
      if (Number.isFinite(y)) {
        state.year = y;
        renderMap();
        renderPyramid();
      }
    });
  }

  const playBtn = document.getElementById('pojPlay');
  if (playBtn) {
    playBtn.addEventListener('click', togglePlay);
  }

  const pyrSel = document.getElementById('pojPyramidKraj');
  if (pyrSel) {
    pyrSel.addEventListener('change', () => {
      state.pyramidKraj = pyrSel.value;
      renderPyramid();
    });
  }

  const zpSel = document.getElementById('pojZpKraj');
  if (zpSel) {
    zpSel.addEventListener('change', () => {
      state.zpKraj = zpSel.value;
      renderZp();
    });
  }
}

function togglePlay() {
  if (state.isPlaying) cancelPlay();
  else startPlay();
}

function startPlay() {
  if (prefersReducedMotion()) {
    // Skok rovnou na konec (2025) namísto animace.
    setYear(state.krajData.years[state.krajData.years.length - 1]);
    return;
  }
  state.isPlaying = true;
  const btn = document.getElementById('pojPlay');
  if (btn) {
    btn.classList.add('is-playing');
    btn.setAttribute('aria-pressed', 'true');
    const lbl = btn.querySelector('.pojistenci-play-label');
    if (lbl) lbl.textContent = 'Pauza';
  }
  // Restart od počátečního roku, aby uživatel viděl celou animaci.
  const years = state.krajData.years;
  let i = years.indexOf(state.year);
  if (i < 0 || i === years.length - 1) i = -1;
  state.playTimer = setInterval(() => {
    i++;
    if (i >= years.length) {
      cancelPlay();
      return;
    }
    setYear(years[i]);
  }, PLAY_STEP_MS);
}

function cancelPlay() {
  state.isPlaying = false;
  if (state.playTimer) {
    clearInterval(state.playTimer);
    state.playTimer = null;
  }
  const btn = document.getElementById('pojPlay');
  if (btn) {
    btn.classList.remove('is-playing');
    btn.setAttribute('aria-pressed', 'false');
    const lbl = btn.querySelector('.pojistenci-play-label');
    if (lbl) lbl.textContent = 'Přehrát';
  }
}

function setYear(year) {
  state.year = year;
  const yearSlider = document.getElementById('pojYear');
  if (yearSlider) yearSlider.value = year;
  renderMap();
  renderPyramid();
}

// ========== Pomocné funkce ==========

function formatVal(v) {
  if (v == null || !Number.isFinite(v)) return '—';
  return Number(v).toLocaleString('cs-CZ', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function formatValShort(v) {
  if (v == null || !Number.isFinite(v)) return '';
  if (Math.abs(v) >= 100) return Math.round(v).toString();
  return Number(v).toFixed(1);
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (ch) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
  ));
}

function prefersReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function showFatalError(err) {
  const main = document.getElementById('content');
  if (!main) return;
  const div = document.createElement('div');
  div.className = 'pojistenci-fatal-error';
  div.innerHTML = `<strong>Atlas se nepodařilo načíst.</strong><br>${escapeHtml(err?.message || String(err))}`;
  main.prepend(div);
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
}

// Exports for tests / M3 modular extension.
export {
  init,
  state,
  KRAJ_NAME_BY_CODE,
  KRAJ_CODE_BY_NAME,
  METRICS,
  ZP_COLORS,
  aggregateZpForCR,
};
