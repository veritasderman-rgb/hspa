// Krajský pohled — interaktivní choropleth 14 NUTS-3 krajů ČR pomocí echarts.
// Načte data/regions.json (37 datasetů) + data/cz-regions.geojson (zjednodušené
// polygony) a vykreslí choropleth s color scale podle vybraného indikátoru.
//
// echarts je naloadovaný globálně přes CDN <script> v kraje.html.

import './analytics.js';
import { renderModuleNav, renderMastheadDate, escapeHtml } from './page-shared.js';

const REGION_NAME_BY_CODE = {
  'CZ010': 'Praha',
  'CZ020': 'Středočeský',
  'CZ031': 'Jihočeský',
  'CZ032': 'Plzeňský',
  'CZ041': 'Karlovarský',
  'CZ042': 'Ústecký',
  'CZ051': 'Liberecký',
  'CZ052': 'Královéhradecký',
  'CZ053': 'Pardubický',
  'CZ063': 'Vysočina',
  'CZ064': 'Jihomoravský',
  'CZ071': 'Olomoucký',
  'CZ072': 'Zlínský',
  'CZ080': 'Moravskoslezský',
};

let allDatasets = [];
let allIndicators = [];
let chart = null;
let activeId = null;

async function init() {
  if (typeof window === 'undefined') return;
  renderModuleNav('kraje');
  renderMastheadDate();

  if (typeof echarts === 'undefined') {
    showError('Knihovna echarts se nepodařilo načíst (CDN). Zkuste obnovit stránku.');
    return;
  }

  try {
    const [regionsRes, indsRes, geoRes] = await Promise.all([
      fetch('data/regions.json').then(r => { if (!r.ok) throw new Error('regions.json HTTP ' + r.status); return r.json(); }),
      fetch('data/indicators.json').then(r => { if (!r.ok) throw new Error('indicators.json HTTP ' + r.status); return r.json(); }),
      fetch('data/cz-regions.geojson').then(r => { if (!r.ok) throw new Error('cz-regions.geojson HTTP ' + r.status); return r.json(); }),
    ]);

    allDatasets = (regionsRes.datasets || []).filter(d => d.regions && d.regions.length);
    allIndicators = indsRes.indicators || [];

    // Registrovat custom mapu v echarts
    echarts.registerMap('cz-regions', geoRes);

    // Init chart
    const mapEl = document.getElementById('krajeMap');
    if (!mapEl) return;
    chart = echarts.init(mapEl);
    window.addEventListener('resize', () => chart.resize());

    // Naplnit selector + vybrat default
    populateSelector();
    const defaultId = readHashId() || (allDatasets[0] && allDatasets[0].indicator_id);
    if (defaultId) selectDataset(defaultId);

    // Wire selector
    const sel = document.getElementById('krajeSelect');
    if (sel) {
      sel.addEventListener('change', () => selectDataset(sel.value));
    }

    // Hashchange (back/forward navigation)
    window.addEventListener('hashchange', () => {
      const id = readHashId();
      if (id && id !== activeId) selectDataset(id);
    });
  } catch (err) {
    console.error('kraje load failed:', err);
    showError('Nepodařilo se načíst data: ' + err.message);
  }
}

function readHashId() {
  const m = (location.hash || '').match(/id=([^&]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

function showError(msg) {
  const mapEl = document.getElementById('krajeMap');
  if (mapEl) mapEl.innerHTML = `<p class="status error">${escapeHtml(msg)}</p>`;
}

function populateSelector() {
  const sel = document.getElementById('krajeSelect');
  if (!sel) return;

  // Seskupit datasety podle area indikátoru pro lepší orientaci
  const byArea = { 'Výsledky': [], 'Výstupy': [], 'Procesy': [], 'Struktury': [], 'Ostatní': [] };
  for (const d of allDatasets) {
    const ind = allIndicators.find(i => i.id === d.indicator_id);
    const area = (ind && ind.area) || 'Ostatní';
    (byArea[area] || byArea['Ostatní']).push({ ...d, _ind: ind });
  }

  let html = '';
  for (const [area, list] of Object.entries(byArea)) {
    if (!list.length) continue;
    html += `<optgroup label="${escapeHtml(area)}">`;
    list.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'cs'));
    for (const d of list) {
      html += `<option value="${escapeHtml(d.indicator_id)}">${escapeHtml(d.name || d.indicator_id)}</option>`;
    }
    html += '</optgroup>';
  }
  sel.innerHTML = html;
}

function selectDataset(indicatorId) {
  const d = allDatasets.find(x => x.indicator_id === indicatorId);
  if (!d) {
    console.warn('Dataset not found:', indicatorId);
    return;
  }
  activeId = indicatorId;
  const sel = document.getElementById('krajeSelect');
  if (sel && sel.value !== indicatorId) sel.value = indicatorId;

  // Update URL hash without reload
  if (location.hash !== `#id=${encodeURIComponent(indicatorId)}`) {
    history.replaceState(null, '', `#id=${encodeURIComponent(indicatorId)}`);
  }

  renderChart(d);
  renderMeta(d);
  renderRanking(d);
  renderFoot(d);
}

function renderChart(dataset) {
  if (!chart) return;
  const direction = dataset.direction || 'higher_is_better';
  const isContextDependent = direction === 'context_dependent';
  const betterHigher = direction !== 'lower_is_better';

  // Připravit data pro echarts: [{ name: regionName, value }]
  const data = (dataset.regions || []).map(r => ({
    name: REGION_NAME_BY_CODE[r.code] || r.name || r.code,
    value: r.value,
    code: r.code,
  }));

  const values = data.map(x => x.value).filter(v => Number.isFinite(v));
  if (!values.length) return;
  const min = Math.min(...values);
  const max = Math.max(...values);

  // Visual map color scheme: zelená→červená podle direction
  // Pokud higher_is_better: max=zelená, min=červená
  // Pokud lower_is_better:  min=zelená, max=červená
  // Pokud context_dependent: modrá-šedá-oranžová neutrální
  const inRange = isContextDependent
    ? { color: ['#FFF4E6', '#E2E8F0', '#E0E7FF'] }
    : betterHigher
      ? { color: ['#FCE8E6', '#FFF7E0', '#E6F4EA', '#1F7A1F'] }
      : { color: ['#1F7A1F', '#E6F4EA', '#FFF7E0', '#FCE8E6'] };

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      formatter: function (params) {
        const r = (dataset.regions || []).find(x => REGION_NAME_BY_CODE[x.code] === params.name);
        if (!r) return params.name;
        const avg = dataset.country_avg;
        const diff = avg != null && avg !== 0 ? ((r.value - avg) / avg) * 100 : null;
        const diffStr = diff != null ? `<br/>${diff >= 0 ? '+' : ''}${diff.toFixed(1)} % od průměru ČR` : '';
        return `<strong>${escapeHtml(params.name)}</strong><br/>` +
               `${formatVal(r.value)} ${escapeHtml(dataset.unit || '')}` +
               diffStr;
      },
    },
    visualMap: {
      type: 'continuous',
      min,
      max,
      left: 'left',
      bottom: 12,
      calculable: true,
      inRange,
      text: betterHigher ? ['lépe', 'hůře'] : ['hůře', 'lépe'],
      textStyle: { fontSize: 11, fontFamily: 'Inter, system-ui, sans-serif' },
      formatter: function (v) { return formatVal(v) + ' ' + (dataset.unit || ''); },
    },
    series: [{
      name: dataset.name || dataset.indicator_id,
      type: 'map',
      map: 'cz-regions',
      roam: false,
      label: {
        show: true,
        formatter: function (params) {
          const r = (dataset.regions || []).find(x => REGION_NAME_BY_CODE[x.code] === params.name);
          if (!r) return '';
          return formatValShort(r.value);
        },
        fontSize: 10,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontWeight: 600,
        color: '#1f1a14',
      },
      itemStyle: {
        borderColor: '#1f1a14',
        borderWidth: 0.8,
      },
      emphasis: {
        itemStyle: { borderWidth: 2, borderColor: '#b8361e' },
        label: { color: '#b8361e' },
      },
      data,
    }],
  };

  chart.setOption(option, true);
}

function renderMeta(dataset) {
  const el = document.getElementById('krajeMeta');
  if (!el) return;
  const ind = allIndicators.find(i => i.id === dataset.indicator_id);
  const area = ind ? `${ind.area} · ${ind.domain}` : '';
  const year = dataset.year ? ` · ${dataset.year}` : '';
  const fw = ind && ind.framework === 'monitoring' ? ' · <span class="fw-badge fw-monitoring">Monitoring</span>' : '';
  el.innerHTML = `<span class="kraje-meta-area">${escapeHtml(area)}${escapeHtml(year)}</span>${fw}`;
}

function renderRanking(dataset) {
  const list = document.getElementById('krajeRank');
  if (!list) return;
  const direction = dataset.direction || 'higher_is_better';
  const betterHigher = direction !== 'lower_is_better';
  const isContextDependent = direction === 'context_dependent';
  const avg = dataset.country_avg;

  const sorted = [...(dataset.regions || [])].sort((a, b) =>
    betterHigher ? b.value - a.value : a.value - b.value
  );

  list.innerHTML = sorted.map((r, idx) => {
    const diff = avg != null && avg !== 0 ? ((r.value - avg) / avg) * 100 : null;
    const tone = isContextDependent ? 'neutral' : (
      idx < 3 ? 'good' : (idx >= sorted.length - 3 ? 'bad' : 'mid')
    );
    return `
      <li class="kraje-rank-row kraje-rank-${tone}">
        <span class="kraje-rank-pos">${idx + 1}.</span>
        <span class="kraje-rank-name">${escapeHtml(REGION_NAME_BY_CODE[r.code] || r.name || r.code)}</span>
        <span class="kraje-rank-val">${formatVal(r.value)} ${escapeHtml(dataset.unit || '')}</span>
        <span class="kraje-rank-diff">${diff != null ? `${diff >= 0 ? '+' : ''}${diff.toFixed(1)} %` : ''}</span>
      </li>
    `;
  }).join('');
}

function renderFoot(dataset) {
  const el = document.getElementById('krajeFootText');
  if (!el) return;
  const ind = allIndicators.find(i => i.id === dataset.indicator_id);
  const sourceName = (dataset.source && dataset.source.name) || (ind && ind.source && ind.source.name) || '';
  const detailLink = ind ? ` · <a href="indicator.html?id=${encodeURIComponent(ind.id)}">Detail indikátoru →</a>` : '';
  el.innerHTML = `<strong>Průměr ČR:</strong> ${formatVal(dataset.country_avg)} ${escapeHtml(dataset.unit || '')} · <strong>Zdroj:</strong> ${escapeHtml(sourceName || '—')}${detailLink}`;
}

function formatVal(v) {
  if (v == null) return '—';
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  if (Math.abs(n) >= 100) return n.toFixed(0);
  if (Math.abs(n) >= 10) return n.toFixed(1);
  return n.toFixed(2);
}

function formatValShort(v) {
  if (v == null) return '—';
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  if (Math.abs(n) >= 100) return n.toFixed(0);
  return n.toFixed(1);
}

if (typeof window !== 'undefined') init();
