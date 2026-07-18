// Detailní stránka pro jednotlivý indikátor (indicator.html?id=<id>).
// Zobrazí: hero (hodnota, signál, benchmarky), velký trendový graf,
// regionální mapu (tile-map 14 krajů ČR) + tabulku, narativní bloky
// (determinanty, význam) z metodické karty a kompletní metodiku.

import './analytics.js';
import { renderModuleNav, renderMastheadDate, escapeHtml, isArticleVisible, resolveVerificationStatus, verifBadgeHtml, formatNumberCz } from './page-shared.js';
import { renderCzMap } from './cz-map.js';
import { buildTakeaway, sparklineSvg, formatValue, computeYoy } from './indicator-takeaway.js';

// Zpětná kompatibilita: buildTakeaway se přesunul do indicator-takeaway.js,
// ale historicky ho importují testy z tohoto modulu — re-export zachováme.
export { buildTakeaway } from './indicator-takeaway.js';

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
  const takeaway = buildTakeaway(ind);
  const spark = sparklineSvg(ind.trend, ind.signal);

  const subdomain = ind.subdomain ? ` · ${escapeHtml(ind.subdomain)}` : '';

  // Verifikační odznak — jednotná logika sdílená s přehledem (page-shared.js):
  // explicitní status z dat, jinak odvození z původu hodnoty (seed → ilustrativní,
  // live → předběžné). Tím se odznak zobrazí i u indikátorů bez ručního statusu.
  const verifBadge = verifBadgeHtml(ind);

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
          ${yoy ? `<span class="ind-hero-yoy ${yoy.cls}">${yoy.glyph} ${formatNumberCz(Math.abs(yoy.pct), { minDecimals: 1, maxDecimals: 1 })} % YoY</span>` : ''}
          ${spark ? `<span class="ind-hero-spark-wrap" title="Trend za sledované období">${spark}</span>` : ''}
        </div>
      </div>
      <div class="ind-hero-bench">
        ${benchmarkHTML}
      </div>
    </section>

    ${takeaway.text ? `
      <div class="ind-takeaway ind-takeaway-${takeaway.tone}">
        <span class="ind-takeaway-icon" aria-hidden="true">➜</span>
        <p class="ind-takeaway-text">${escapeHtml(takeaway.text)}</p>
      </div>
    ` : ''}

    ${ind.deep_dive ? `
      <a class="ind-deepdive-cta" href="${escapeHtml(ind.deep_dive.url)}">
        <span class="ind-deepdive-cta-icon" aria-hidden="true">⊞</span>
        <span class="ind-deepdive-cta-body">
          <span class="ind-deepdive-cta-title">${escapeHtml(ind.deep_dive.title)}</span>
          <span class="ind-deepdive-cta-desc">${escapeHtml(ind.deep_dive.desc)}</span>
        </span>
        <span class="ind-deepdive-cta-arrow" aria-hidden="true">→</span>
      </a>
    ` : ''}

    <a class="ind-deepdive-cta" href="diagnoza.html?id=${encodeURIComponent(ind.id)}">
      <span class="ind-deepdive-cta-icon" aria-hidden="true">🗂</span>
      <span class="ind-deepdive-cta-body">
        <span class="ind-deepdive-cta-title">Otevřít spis Diagnózy</span>
        <span class="ind-deepdive-cta-desc">Kompletní spis případu: příčiny, páky, peníze, politické sliby a co můžete udělat vy.</span>
      </span>
      <span class="ind-deepdive-cta-arrow" aria-hidden="true">→</span>
    </a>

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

    <section class="ind-section suv-section" id="suvSection" hidden aria-labelledby="suvHeading">
      <h3 id="suvHeading">Souvislosti</h3>
      <div id="suvBody"></div>
    </section>

    <footer class="ind-detail-footer">
      <span>Zdroj hodnoty: <strong>${escapeHtml(ind.source?.name ?? '?')}</strong></span>
      ${ind.source?.url ? `<a href="${escapeHtml(ind.source.url)}" target="_blank" rel="noopener">primární zdroj ↗</a>` : ''}
      ${ind.source?.fetched_at ? `<span>Aktualizace: ${escapeHtml(ind.source.fetched_at.slice(0,10))}</span>` : ''}
      ${ind.verified_at ? `<span>Ověřeno proti primárnímu zdroji: ${escapeHtml(ind.verified_at)}</span>` : ''}
      ${ind.source?.origin ? `<span class="origin-tag origin-${escapeHtml(ind.source.origin)}">${escapeHtml(ind.source.origin)}</span>` : ''}
      <a class="feedback-link" href="https://github.com/veritasderman-rgb/hspa/issues/new?title=Chyba+nebo+návrh:+${encodeURIComponent(ind.id)}" target="_blank" rel="noopener">Nahlásit chybu nebo návrh ↗</a>
      <button type="button" class="embed-share-btn" data-embed-id="${escapeHtml(ind.id)}">Vložit kartu na web ↗</button>
    </footer>
    <div class="embed-share-panel" id="embedSharePanel" hidden>
      <p>Zkopírujte kód a vložte do svého webu (responzivní iframe):</p>
      <textarea readonly id="embedSnippet" rows="3" aria-label="HTML kód pro vložení"></textarea>
      <button type="button" class="embed-copy-btn" id="embedCopyBtn">Kopírovat</button>
      <iframe class="embed-preview" id="embedPreview" title="Náhled vložené karty" loading="lazy"></iframe>
    </div>
  `;

  if (ind.trend?.length >= 2) {
    // Graf nesmí shodit zbytek detailu — selhání (chybějící CDN knihovna,
    // chyba renderingu) degraduje na SVG fallback, data zůstávají viditelná.
    try {
      renderTrendChart(ind);
    } catch (err) {
      console.error('trend chart failed:', err);
      renderTrendFallback(ind);
    }
  }

  wireEmbedShare(ind.id);

  if (regionDataset) {
    wireRegionalSection(regionDataset, ind);
  }

  loadRelated(ind.id);
  loadSouvislosti(ind.id);
}

// ── Souvislosti — sdílená vrstva (data/souvislosti.json, build-time graf) ──

const SUV_STAV_LABEL = {
  nema_meritelny_obsah: 'Nemá měřitelný obsah',
  ceka_na_data: 'Čeká na data',
  plni_se: 'Plní se',
  bez_pohybu: 'Bez pohybu',
  opacny_smer: 'Opačný směr',
  splneno: 'Splněno',
};
const SUV_POLARITY = { plus: '↑ posiluje', minus: '↓ tlumí' };

/**
 * Čisté sestavení HTML bloku Souvislosti z bucketu souvislosti.json.
 * Vrací '' pokud bucket nenese žádnou zobrazitelnou vazbu (sekce se skryje).
 * Články záměrně nevykresluje — ty pokrývá „Související obsah" výše.
 */
export function souvislostiHtml(bucket) {
  if (!bucket) return '';
  const parts = [];

  const model = bucket.model;
  if (model?.node || model?.incoming?.length || model?.outgoing?.length) {
    const rows = [];
    if (model.node) {
      rows.push(`<p class="suv-node">V kauzální mapě systému patří k: <strong>${escapeHtml(model.node.label)}</strong> <span class="suv-tag">${escapeHtml(model.node.layer ?? '')}</span></p>`);
    }
    const edgeList = (edges, heading) => {
      if (!edges?.length) return '';
      const lis = edges.map(e =>
        `<li title="${escapeHtml(e.mechanism ?? '')}"><span class="suv-pol suv-pol-${escapeHtml(e.polarity ?? 'plus')}">${SUV_POLARITY[e.polarity] ?? '→'}</span> ${escapeHtml(e.label)}</li>`
      ).join('');
      return `<h4>${heading}</h4><ul class="suv-list">${lis}</ul>`;
    };
    rows.push(edgeList(model.incoming, 'Co na něj působí'));
    rows.push(edgeList(model.outgoing, 'Na co má vliv'));
    rows.push(`<p class="suv-more"><a href="model-systemu.html">Otevřít kauzální mapu systému →</a></p>`);
    parts.push(`<div class="suv-group">${rows.join('')}</div>`);
  }

  if (bucket.legislativa?.length) {
    const lis = bucket.legislativa.map(l =>
      `<li>${escapeHtml(l.title ?? l.nazev ?? l.id)} <span class="suv-tag">${escapeHtml(l.phase ?? l.stav ?? '')}</span></li>`
    ).join('');
    parts.push(`<div class="suv-group"><h4>Legislativa v běhu</h4><ul class="suv-list">${lis}</ul><p class="suv-more"><a href="legislativa.html">Legislativní radar →</a></p></div>`);
  }

  const bar = bucket.barometr;
  if (bar?.commitments?.length || bar?.statements?.length) {
    const lis = (bar.commitments ?? []).map(c =>
      `<li>Závazek vlády (${escapeHtml(c.oblast ?? '')}) <span class="suv-tag suv-stav-${escapeHtml(c.stav ?? '')}">${SUV_STAV_LABEL[c.stav] ?? escapeHtml(c.stav ?? '')}</span></li>`
    ).join('');
    const stCount = (bar.statements ?? []).length;
    const stLine = stCount ? `<p class="suv-note">${stCount}× výrok v Ověřovně se opírá o tento indikátor.</p>` : '';
    parts.push(`<div class="suv-group"><h4>Sliby a výroky, které na něj míří</h4>${lis ? `<ul class="suv-list">${lis}</ul>` : ''}${stLine}<p class="suv-more"><a href="barometr.html">Barometr politických prohlášení →</a></p></div>`);
  }

  return parts.filter(Boolean).join('');
}

/** Načte data/souvislosti.json a vykreslí sekci; bez vazeb zůstává skrytá. */
async function loadSouvislosti(id) {
  try {
    const res = await fetch('data/souvislosti.json');
    if (!res.ok) return;
    const data = await res.json();
    const bucket = data?.indicators?.[id];
    const html = souvislostiHtml(bucket);
    if (!html) return;
    const section = document.getElementById('suvSection');
    const body = document.getElementById('suvBody');
    if (!section || !body) return;
    body.innerHTML = html;
    section.hidden = false;
  } catch { /* souvislosti jsou doplněk — selhání nesmí shodit detail */ }
}

/**
 * Obsluha tlačítka „Vložit kartu na web" — sestaví iframe snippet,
 * naplní náhled a zařídí kopírování do schránky.
 */
function wireEmbedShare(id) {
  const btn = document.querySelector('.embed-share-btn');
  const panel = document.getElementById('embedSharePanel');
  if (!btn || !panel) return;
  const embedUrl = `${location.origin}/embed.html?id=${encodeURIComponent(id)}`;
  const snippet = `<iframe src="${embedUrl}" width="380" height="220" style="border:0;max-width:100%" loading="lazy" title="HSPA Monitor — ${escapeHtml(id)}"></iframe>`;

  btn.addEventListener('click', () => {
    const willShow = panel.hidden;
    panel.hidden = !willShow;
    if (willShow) {
      const ta = document.getElementById('embedSnippet');
      const preview = document.getElementById('embedPreview');
      if (ta) ta.value = snippet;
      if (preview && !preview.src) {
        preview.src = embedUrl;
        preview.width = 380;
        preview.height = 220;
      }
    }
  });

  const copyBtn = document.getElementById('embedCopyBtn');
  copyBtn?.addEventListener('click', async () => {
    const ta = document.getElementById('embedSnippet');
    if (!ta) return;
    try {
      await navigator.clipboard.writeText(ta.value);
      copyBtn.textContent = 'Zkopírováno ✓';
      setTimeout(() => { copyBtn.textContent = 'Kopírovat'; }, 2000);
    } catch {
      ta.select();
    }
  });
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

function renderTrendChart(ind) {
  const canvas = document.getElementById('indTrendChart');
  if (!canvas) return;
  if (typeof Chart === 'undefined') {
    renderTrendFallback(ind);
    return;
  }
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

/**
 * Záložní vykreslení trendu bez Chart.js — inline SVG křivka + tabulka hodnot.
 * Detail indikátoru musí zůstat informačně plnohodnotný i bez CDN knihovny.
 */
function renderTrendFallback(ind) {
  const wrap = document.querySelector('.ind-trend-chart-wrap');
  if (!wrap) return;
  const trend = (ind.trend || []).filter(t => Number.isFinite(Number(t.value)));
  if (trend.length < 2) return;

  const color = ind.signal === 'good' ? '#38761D'
    : ind.signal === 'warn' ? '#B45F06'
    : ind.signal === 'bad' ? '#990000' : '#0B5394';
  const W = 640, H = 200, PAD = 10;
  const vals = trend.map(t => Number(t.value));
  const min = Math.min(...vals), max = Math.max(...vals);
  const span = max - min || 1;
  const pts = trend.map((t, i) => {
    const x = PAD + (i / (trend.length - 1)) * (W - 2 * PAD);
    const y = H - PAD - ((Number(t.value) - min) / span) * (H - 2 * PAD);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  const rows = trend.map(t =>
    `<tr><th scope="row">${escapeHtml(String(t.year))}</th><td>${formatValue(t.value)}</td></tr>`
  ).join('');

  wrap.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" class="ind-trend-svg-fallback" role="img"
         aria-label="Vývoj hodnoty ${escapeHtml(String(trend[0].year))}–${escapeHtml(String(trend[trend.length - 1].year))}">
      <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2.5"
                stroke-linejoin="round" stroke-linecap="round"/>
    </svg>
    <table class="ind-trend-fallback-table">
      <caption class="sr-only">Hodnoty indikátoru po letech</caption>
      <thead><tr><th scope="col">Rok</th><th scope="col">${escapeHtml(ind.unit ?? 'Hodnota')}</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p class="ind-trend-fallback-note">Interaktivní graf se nepodařilo načíst — hodnoty výše jsou kompletní.</p>
  `;
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
