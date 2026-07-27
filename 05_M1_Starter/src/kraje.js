// Krajský pohled — interaktivní choropleth 14 NUTS-3 krajů ČR pomocí echarts.
// Načte data/regions.json (42 datasetů) + data/cz-regions.geojson (zjednodušené
// polygony) a vykreslí choropleth s color scale podle vybraného indikátoru.
//
// echarts je naloadovaný globálně přes <script> v kraje.html (self-hosted
// assets/vendor/echarts.min.js — bez závislosti na externím CDN).

import './analytics.js';
import { renderModuleNav, renderMastheadDate, escapeHtml } from './page-shared.js';
import {
  REGION_NAME_BY_CODE, registerCzMap, applyChoropleth, formatVal,
} from './cz-choropleth.js';

let allDatasets = [];
let allIndicators = [];
let chart = null;
let activeId = null;

async function init() {
  if (typeof window === 'undefined') return;
  renderModuleNav('kraje');
  renderMastheadDate();

  // echarts kreslí jen mapu — žebříček, selector a metadata fungují i bez ní.
  // Při výpadku knihovny tedy degradujeme jen mapové okno, ne celou stránku.
  const hasEcharts = typeof echarts !== 'undefined';
  if (!hasEcharts) {
    showError('Mapu se nepodařilo vykreslit (knihovna echarts není dostupná). Výběr indikátoru a žebříček krajů níže fungují normálně.');
  }

  try {
    const [regionsRes, indsRes, geoRes] = await Promise.all([
      fetch('data/regions.json').then(r => { if (!r.ok) throw new Error('regions.json HTTP ' + r.status); return r.json(); }),
      fetch('data/indicators.json').then(r => { if (!r.ok) throw new Error('indicators.json HTTP ' + r.status); return r.json(); }),
      fetch('data/cz-regions.geojson').then(r => { if (!r.ok) throw new Error('cz-regions.geojson HTTP ' + r.status); return r.json(); }),
    ]);

    allDatasets = (regionsRes.datasets || []).filter(d => d.regions && d.regions.length);
    allIndicators = indsRes.indicators || [];

    if (hasEcharts) {
      // Registrovat custom mapu v echarts
      registerCzMap(geoRes);

      // Init chart
      const mapEl = document.getElementById('krajeMap');
      if (mapEl) {
        chart = echarts.init(mapEl);
        window.addEventListener('resize', () => chart.resize());
        // Okresní drill-down: klik na kraj v mapě
        chart.on('click', params => {
          const code = params && params.data && params.data.code;
          if (code) showDrill(code);
        });
      }
    }

    // Drill-down: zavírací tlačítko
    const drillClose = document.getElementById('krajeDrillClose');
    if (drillClose) drillClose.addEventListener('click', hideDrill);

    // Naplnit selector + vybrat default
    populateSelector();
    const defaultId = readHashId() || (allDatasets[0] && (allDatasets[0].id || allDatasets[0].indicator_id));
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
      // Klíčem je unikátní d.id (fallback indicator_id) — regions.json může
      // obsahovat víc datasetů k témuž indikátoru a přes indicator_id by
      // selector u druhého z nich vždy zobrazil data prvního.
      html += `<option value="${escapeHtml(d.id || d.indicator_id)}">${escapeHtml(d.name || d.indicator_id)}</option>`;
    }
    html += '</optgroup>';
  }
  sel.innerHTML = html;
}

function findDataset(key) {
  // Preferuj unikátní id; hash se starým indicator_id (deep-linky) dál funguje.
  return allDatasets.find(x => x.id === key) || allDatasets.find(x => x.indicator_id === key) || null;
}

function selectDataset(key) {
  const d = findDataset(key);
  if (!d) {
    console.warn('Dataset not found:', key);
    return;
  }
  const datasetKey = d.id || d.indicator_id;
  activeId = datasetKey;
  const sel = document.getElementById('krajeSelect');
  if (sel && sel.value !== datasetKey) sel.value = datasetKey;

  // Update URL hash without reload
  if (location.hash !== `#id=${encodeURIComponent(datasetKey)}`) {
    history.replaceState(null, '', `#id=${encodeURIComponent(datasetKey)}`);
  }

  hideDrill();
  renderChart(d);
  renderMeta(d);
  renderRanking(d);
  renderFoot(d);
}

/* ── Okresní drill-down ──────────────────────────────────────────────────
   Datasety mohou nést volitelný blok `okresy` (viz
   scripts/fetch-okres-nadeje-doziti.mjs): { source, source_url, period,
   note, items: [{code, name, kraj, value}] }. Klik na kraj v mapě nebo
   v žebříčku otevře rozpad okresů daného kraje. Kde okresní data nejsou,
   panel se neukazuje (hint v meta řádku se zobrazuje jen když jsou). */

function activeDataset() {
  return findDataset(activeId);
}

function hideDrill() {
  const el = document.getElementById('krajeDrill');
  if (el) el.hidden = true;
}

function showDrill(krajCode) {
  const d = activeDataset();
  const panel = document.getElementById('krajeDrill');
  if (!d || !panel) return;
  const ok = d.okresy;
  if (!ok || !Array.isArray(ok.items)) return; // ukazatel bez okresního rozpadu

  const items = ok.items.filter(o => o.kraj === krajCode);
  if (!items.length) return;

  const direction = d.direction || 'higher_is_better';
  const betterHigher = direction !== 'lower_is_better';
  const isContextDependent = direction === 'context_dependent';
  items.sort((a, b) => (betterHigher ? b.value - a.value : a.value - b.value));

  const krajName = REGION_NAME_BY_CODE[krajCode] || krajCode;
  const krajRow = (d.regions || []).find(r => r.code === krajCode);
  const values = items.map(o => o.value);
  const mn = Math.min(...values), mx = Math.max(...values);
  const span = mx - mn || 1;

  const h = document.getElementById('krajeDrillH');
  if (h) h.textContent = `${krajName} po okresech — ${d.name || d.indicator_id}`;

  const list = document.getElementById('krajeDrillList');
  if (list) {
    list.innerHTML = items.map((o, idx) => {
      const pct = 18 + Math.round(((o.value - mn) / span) * 82); // 18–100 % šířky
      const tone = isContextDependent ? 'neutral'
        : (idx === 0 ? 'good' : (idx === items.length - 1 && items.length > 1 ? 'bad' : 'mid'));
      return `
        <li class="kraje-drill-row kraje-drill-${tone}">
          <span class="kraje-drill-name">${escapeHtml(o.name)}</span>
          <span class="kraje-drill-bar-wrap"><i class="kraje-drill-bar" style="width:${pct}%"></i></span>
          <span class="kraje-drill-val">${formatVal(o.value)} ${escapeHtml(d.unit || '')}</span>
        </li>`;
    }).join('');
  }

  const note = document.getElementById('krajeDrillNote');
  if (note) {
    const krajStr = krajRow ? `Kraj celkem: ${formatVal(krajRow.value)} ${d.unit || ''} · ` : '';
    const avgStr = d.country_avg != null ? `Průměr ČR: ${formatVal(d.country_avg)} ${d.unit || ''} · ` : '';
    const srcLink = ok.source_url
      ? `<a href="${escapeHtml(ok.source_url)}" target="_blank" rel="noopener">${escapeHtml(ok.source || 'zdroj')} ↗</a>`
      : escapeHtml(ok.source || '');
    note.innerHTML = `${escapeHtml(krajStr)}${escapeHtml(avgStr)}Zdroj okresních dat: ${srcLink}`
      + (ok.note ? `<br>${escapeHtml(ok.note)}` : '');
  }

  panel.hidden = false;
  panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function renderChart(dataset) {
  if (!chart) return;
  applyChoropleth(chart, {
    regions: dataset.regions,
    country_avg: dataset.country_avg,
    unit: dataset.unit,
    direction: dataset.direction,
    name: dataset.name || dataset.indicator_id,
  });
}

function renderMeta(dataset) {
  const el = document.getElementById('krajeMeta');
  if (!el) return;
  const ind = allIndicators.find(i => i.id === dataset.indicator_id);
  const area = ind ? `${ind.area} · ${ind.domain}` : '';
  const year = dataset.year ? ` · ${dataset.year}` : '';
  const fw = ind && ind.framework === 'monitoring' ? ' · <span class="fw-badge fw-monitoring">Monitoring</span>' : '';
  const drill = dataset.okresy && Array.isArray(dataset.okresy.items)
    ? ' · <span class="kraje-meta-drill">okresní detail — klikněte na kraj</span>' : '';
  el.innerHTML = `<span class="kraje-meta-area">${escapeHtml(area)}${escapeHtml(year)}</span>${fw}${drill}`;
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

  const hasDrill = dataset.okresy && Array.isArray(dataset.okresy.items);
  list.innerHTML = sorted.map((r, idx) => {
    const diff = avg != null && avg !== 0 ? ((r.value - avg) / avg) * 100 : null;
    const tone = isContextDependent ? 'neutral' : (
      idx < 3 ? 'good' : (idx >= sorted.length - 3 ? 'bad' : 'mid')
    );
    const drillAttrs = hasDrill
      ? ` data-region-code="${escapeHtml(r.code)}" tabindex="0" role="button" aria-label="Otevřít okresní detail: ${escapeHtml(REGION_NAME_BY_CODE[r.code] || r.code)}"`
      : '';
    return `
      <li class="kraje-rank-row kraje-rank-${tone}${hasDrill ? ' kraje-rank-clickable' : ''}"${drillAttrs}>
        <span class="kraje-rank-pos">${idx + 1}.</span>
        <span class="kraje-rank-name">${escapeHtml(REGION_NAME_BY_CODE[r.code] || r.name || r.code)}</span>
        <span class="kraje-rank-val">${formatVal(r.value)} ${escapeHtml(dataset.unit || '')}</span>
        <span class="kraje-rank-diff">${diff != null ? `${diff >= 0 ? '+' : '−'}${Math.abs(diff).toLocaleString('cs-CZ', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %` : ''}</span>
      </li>
    `;
  }).join('');

  if (hasDrill) {
    list.querySelectorAll('[data-region-code]').forEach(row => {
      const open = () => showDrill(row.dataset.regionCode);
      row.addEventListener('click', open);
      row.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
      });
    });
  }
}

function renderFoot(dataset) {
  const el = document.getElementById('krajeFootText');
  if (!el) return;
  const ind = allIndicators.find(i => i.id === dataset.indicator_id);
  const sourceName = (dataset.source && dataset.source.name) || (ind && ind.source && ind.source.name) || '';
  const detailLink = ind ? ` · <a href="indikator-${encodeURIComponent(ind.id)}.html">Detail indikátoru →</a>` : '';
  el.innerHTML = `<strong>Průměr ČR:</strong> ${formatVal(dataset.country_avg)} ${escapeHtml(dataset.unit || '')} · <strong>Zdroj:</strong> ${escapeHtml(sourceName || '—')}${detailLink}`;
}

if (typeof window !== 'undefined') init();
