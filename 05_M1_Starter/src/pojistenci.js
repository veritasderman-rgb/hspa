// Atlas pojištěnců — animovaný dashboard struktury zdravotně pojištěné populace
// ČR 2010–2025 (data: ÚZIS · Centrální registr pojištěnců, NZIP — datová podpora
// dohodovacího řízení 2027, Dimenze 5).
//
// 5 propojených pohledů:
//   1) animovaná choropletní mapa krajů (slider + autoplay, 5 metrik)
//   2) populační pyramida (kraj filter + sleduje slider)
//   3) tržní podíly 7 zdravotních pojišťoven (stacked area, kraj-by-kraj)
//   4) bar-chart-race top 10 okresů (počet 80+, % 80+, % 65+)
//   5) drill-down detail okresu (3 propojené grafy)
//
// echarts je naloadováno globálně přes CDN <script> v pojistenci.html.
//
// Status M1 (2026-05-08): skeleton — datová vrstva + nav + masthead. Plné
// vizualizace navazují v M2 (mapa, pyramida, ZP shares) a M3 (race, drill-down).

import './analytics.js';
import { renderModuleNav, renderMastheadDate } from './page-shared.js';

// Mapování CZ-NUTS3 kód → display name v geojson (přesná shoda s
// data/cz-regions.geojson properties.name; sdíleno s kraje.js).
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

const state = {
  krajData: null,
  zpData: null,
  okresData: null,
  geo: null,
  metric: 'pct_65plus',
  year: 2025,
  pyramidKraj: 'CZ010',
  zpKraj: 'CZ010',
  raceMetric: 'count_80plus',
  raceYear: 2025,
  okres: 'CZ0100',
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
    state.raceYear = state.year;

    echarts.registerMap('cz-regions', geo);

    // Skeleton M1: jen placeholder texty v cílových containerech.
    // M2 přidá renderery mapy, pyramidy a ZP shares; M3 race a drill-down.
    populatePyramidKrajSelect();
    populateZpKrajSelect();
    populateOkresSelect();
    showSkeletonPlaceholders();
  } catch (err) {
    console.error('pojistenci load failed:', err);
    showFatalError(err);
  }
}

function populatePyramidKrajSelect() {
  const sel = document.getElementById('pojPyramidKraj');
  if (!sel || !state.krajData) return;
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
  // Seřadit okresy podle kraj + name.
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

function showSkeletonPlaceholders() {
  const placeholder = (id, msg) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = `<div class="pojistenci-placeholder"><strong>Skeleton M1</strong><br>${msg}</div>`;
  };
  placeholder('pojMap', 'Mapa krajů s animací — implementace v M2.');
  placeholder('pojPyramid', 'Populační pyramida — implementace v M2.');
  placeholder('pojZpChart', 'Tržní podíly 7 ZP — implementace v M2.');
  placeholder('pojRace', 'Race chart top 10 okresů — implementace v M3.');
  placeholder('pojOkresTotal', 'Drill-down — celková populace (M3).');
  placeholder('pojOkresAge', 'Drill-down — věková struktura (M3).');
  placeholder('pojOkresCompare', 'Drill-down — srovnání (M3).');
}

function showFatalError(err) {
  const main = document.getElementById('content');
  if (!main) return;
  const div = document.createElement('div');
  div.className = 'pojistenci-fatal-error';
  div.innerHTML = `<strong>Atlas se nepodařilo načíst.</strong><br>${err.message || err}`;
  main.prepend(div);
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
}

// Export pro testy a M2/M3 modulární rozšíření.
export {
  init,
  state,
  KRAJ_NAME_BY_CODE,
};
