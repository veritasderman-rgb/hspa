// Frontend logika stránky financovani.html.
// Zobrazuje: Sankey diagram finančních toků, časovou řadu výdajů ZP,
// indikátory domény Financování a publikované články s tématem financovani.
//
// Data: data/financing.json (kontrakt generovaný ingest/transform_financing.js).
// Při výpadku fetch padá zpět na FALLBACK konstanty na konci souboru.

import './analytics.js';
import { renderModuleNav, renderMastheadDate, escapeHtml, isArticleVisible } from './page-shared.js';
import { registerCzMap, applyChoropleth } from './cz-choropleth.js';

let FINANCING = null;

async function loadFinancing() {
  try {
    const res = await fetch('data/financing.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    FINANCING = await res.json();
  } catch (err) {
    console.warn('financing.json fallback (offline mode):', err.message);
    FINANCING = FALLBACK_FINANCING;
  }
  return FINANCING;
}

function pickSankey(year) {
  const s = FINANCING?.sankey ?? {};
  if (s[year]) return s[year];
  const keys = Object.keys(s).sort();
  return keys.length ? s[keys[keys.length - 1]] : null;
}

function fmtPct(n) {
  return Number(n).toFixed(1).replace('.', ',');
}

function renderFinancingSankey() {
  const container = document.getElementById('fnSankey');
  if (!container) return;
  const data = pickSankey('2023');
  if (!data) return;
  populateFallbackTable(data);

  const TOTAL = data.total_mld_kc ?? data.sources.reduce((a, x) => a + x.value_mld_kc, 0);
  const W = 900, H = 480, TOP = 36, NW = 12, GAP = 8;
  const UH = 432;
  const SCALE = (UH - 3 * GAP) / TOTAL;

  const sources = data.sources.map(s => ({ label: s.label, value: s.value_mld_kc, color: s.color }));
  const targets = data.targets.map(t => ({ label: t.label, value: t.value_mld_kc, pct: fmtPct(t.share_pct), color: t.color }));

  const SRC_X = 200, ZP_X = 440, TGT_X = 700;

  function placeNodes(nodes) {
    let y = TOP;
    return nodes.map((n, i) => {
      const h = Math.round(n.value * SCALE);
      const node = { ...n, y, h };
      y += h + (i < nodes.length - 1 ? GAP : 0);
      return node;
    });
  }

  const srcN = placeNodes(sources);
  const tgtN = placeNodes(targets);
  const zpH = Math.round(TOTAL * SCALE); // 408
  const zpY = TOP + Math.round((UH - zpH) / 2); // 48

  let zpLeft = zpY, zpRight = zpY;
  const srcLinks = srcN.map(n => {
    const l = { sx: SRC_X + NW, sy: n.y, sh: n.h, zx: ZP_X, zy: zpLeft, color: n.color };
    zpLeft += n.h;
    return l;
  });
  const tgtLinks = tgtN.map(n => {
    const l = { zx: ZP_X + NW, zy: zpRight, zh: n.h, tx: TGT_X, ty: n.y, color: n.color };
    zpRight += n.h;
    return l;
  });

  const cpxS = Math.round((SRC_X + NW + ZP_X) / 2); // 326
  const cpxT = Math.round((ZP_X + NW + TGT_X) / 2); // 576

  function band(x1, y1, h1, cpx, x2, y2, h2) {
    return `M${x1},${y1} C${cpx},${y1} ${cpx},${y2} ${x2},${y2} L${x2},${y2 + h2} C${cpx},${y2 + h2} ${cpx},${y1 + h1} ${x1},${y1 + h1}Z`;
  }

  function esc(v) {
    return String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function t(x, y, anchor, size, fill, weight, content) {
    const fw = weight ? ` font-weight="${weight}"` : '';
    return `<text x="${x}" y="${y}" text-anchor="${anchor}" font-size="${size}" fill="${fill}"${fw} font-family="Inter,sans-serif">${esc(content)}</text>`;
  }

  let s = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" `
        + `role="img" aria-hidden="true" style="width:100%;height:auto;display:block">`;

  // Column headers
  s += t(106, 20, 'middle', 10, '#6b6357', '600', 'Zdroje pojistného');
  s += t(446, 14, 'middle', 10, '#6b6357', '600', data.hub?.label ?? 'Systém ZP');
  s += t(446, 27, 'middle',  9, '#6b6357', null,  data.hub?.subtitle ?? `${TOTAL} mld Kč`);
  s += t(800, 20, 'middle', 10, '#6b6357', '600', 'Segmenty péče');

  // Link bands (drawn before nodes so nodes render on top)
  for (const l of srcLinks) {
    s += `<path d="${band(l.sx, l.sy, l.sh, cpxS, l.zx, l.zy, l.sh)}" fill="${l.color}" opacity="0.22"/>`;
  }
  for (const l of tgtLinks) {
    s += `<path d="${band(l.zx, l.zy, l.zh, cpxT, l.tx, l.ty, l.zh)}" fill="${l.color}" opacity="0.22"/>`;
  }

  // Node rects
  for (const n of srcN) {
    s += `<rect x="${SRC_X}" y="${n.y}" width="${NW}" height="${n.h}" rx="2" fill="${n.color}"/>`;
  }
  s += `<rect x="${ZP_X}" y="${zpY}" width="${NW}" height="${zpH}" rx="2" fill="${data.hub?.color ?? '#6b6357'}"/>`;
  for (const n of tgtN) {
    s += `<rect x="${TGT_X}" y="${n.y}" width="${NW}" height="${n.h}" rx="2" fill="${n.color}"/>`;
  }

  // Source labels (right-aligned, left of node)
  const SLBL = SRC_X - 8; // 192
  for (const n of srcN) {
    const cy = n.y + n.h / 2;
    if (n.h >= 30) {
      s += t(SLBL, cy - 7, 'end', 11, '#1f1a14', null, n.label);
      s += t(SLBL, cy + 7, 'end', 10, '#6b6357', null, `${n.value} mld Kč`);
    } else {
      s += t(SLBL, cy + 4, 'end', 10, '#1f1a14', null, `${n.label} · ${n.value} mld`);
    }
  }

  // Target labels (left-aligned, right of node)
  const TLBL = TGT_X + NW + 8; // 720
  for (const n of tgtN) {
    const cy = n.y + n.h / 2;
    if (n.h >= 30) {
      s += t(TLBL, cy - 7, 'start', 11, '#1f1a14', null, n.label);
      s += t(TLBL, cy + 7, 'start', 10, '#6b6357', null, `${n.value} mld · ${n.pct} %`);
    } else {
      s += t(TLBL, cy + 4, 'start', 10, '#1f1a14', null, `${n.label} · ${n.value} mld`);
    }
  }

  s += '</svg>';
  container.innerHTML = s;
}

function populateFallbackTable(sankeyData) {
  const tbody = document.getElementById('fnFallbackTbody');
  if (!tbody) return;
  const targets = sankeyData?.targets ?? [];
  const total = sankeyData?.total_mld_kc ?? targets.reduce((a, x) => a + x.value_mld_kc, 0) ?? 1;
  tbody.innerHTML = targets.map(d => `
    <tr>
      <td>${escapeHtml(d.label)}</td>
      <td class="av-num">${d.value_mld_kc}</td>
      <td class="av-num">${((d.value_mld_kc / total) * 100).toFixed(1)}&nbsp;%</td>
    </tr>`).join('');
}

// ── Časová řada (ČSÚ SHA 2011 + ZPP) ────────────────────────────────────────

function renderFinancingTrend() {
  const ctx = document.getElementById('fnTrendChart');
  if (!ctx || typeof Chart === 'undefined') return;
  const trend = FINANCING?.trend;
  if (!trend?.years?.length) return;

  const estimated = new Set(trend.estimated_years ?? []);
  const labels = trend.years.map(y => estimated.has(y) ? `${y}*` : String(y));
  const datasets = Object.entries(trend.segments).map(([, seg]) => ({
    label: seg.label,
    data: seg.values,
    backgroundColor: seg.color,
    stack: 's',
  }));

  new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          stacked: true,
          grid: { color: 'rgba(31,26,20,0.06)' },
          ticks: { font: { family: "'Inter', sans-serif", size: 12 }, color: '#1f1a14' },
        },
        y: {
          stacked: true,
          title: { display: true, text: 'mld Kč', font: { family: "'Inter', sans-serif", size: 11 }, color: '#6b6357' },
          grid: { color: 'rgba(31,26,20,0.06)' },
          ticks: { font: { family: "'Inter', sans-serif", size: 12 }, color: '#1f1a14' },
        },
      },
      plugins: {
        tooltip: {
          callbacks: {
            footer: (items) => `Celkem: ${items.reduce((s, i) => s + i.parsed.y, 0)} mld Kč`,
          },
        },
        legend: {
          position: 'bottom',
          labels: { font: { family: "'Inter', sans-serif", size: 12 }, boxWidth: 14, padding: 16, color: '#1f1a14' },
        },
      },
    },
  });
}

// ── Indikátory ─────────────────────────────────────────────────────────────

const SIGNAL_LABEL = { good: 'dobré', warn: 'sledovat', bad: 'problém', neutral: '—' };

async function loadIndicators() {
  const grid  = document.getElementById('fnIndicatorGrid');
  const empty = document.querySelector('.fn-indicators-empty');
  if (!grid) return;
  try {
    const res = await fetch('data/indicators.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const indicators = (data.indicators ?? []).filter(ind =>
      ind.domain === 'Financování zdravotnictví' || ind.domain === 'Financování'
    );
    if (!indicators.length) {
      if (empty) empty.classList.remove('hidden');
      return;
    }
    grid.innerHTML = indicators.map(ind => {
      const sig   = ind.signal ?? 'neutral';
      const val   = ind.value != null ? `${ind.value}${ind.unit ? ' ' + ind.unit : ''}` : '—';
      const bench = ind.benchmark?.oecd != null
        ? `OECD&nbsp;${ind.benchmark.oecd}${ind.unit ? ' ' + ind.unit : ''}`
        : '';
      return `
        <li class="fn-ind-card">
          <a class="fn-ind-link" href="indikator-${escapeHtml(ind.id)}.html">
            <div class="fn-ind-meta">
              <span class="fn-ind-area">${escapeHtml(ind.area ?? '')}</span>
              <span class="fn-ind-signal fn-sig-${sig}">${SIGNAL_LABEL[sig] ?? '—'}</span>
            </div>
            <h4 class="fn-ind-name">${escapeHtml(ind.name)}</h4>
            <div class="fn-ind-value">${escapeHtml(val)}</div>
            ${bench ? `<div class="fn-ind-bench">${bench}</div>` : ''}
            <span class="fn-ind-footer">${ind.year ?? ''} · ${escapeHtml(ind.source?.name ?? '')}</span>
          </a>
        </li>`;
    }).join('');
  } catch (err) {
    console.error('fn indicators load failed:', err);
    if (empty) empty.classList.remove('hidden');
  }
}

// ── Články ─────────────────────────────────────────────────────────────────

function fmtDate(iso) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const m = ['ledna','února','března','dubna','května','června',
             'července','srpna','září','října','listopadu','prosince'];
  return `${d.getDate()}. ${m[d.getMonth()]} ${d.getFullYear()}`;
}

async function loadArticles() {
  const grid = document.getElementById('fnArticleGrid');
  if (!grid) return;
  try {
    const res = await fetch('data/articles.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const articles = (data.articles ?? [])
      .filter(a =>
        isArticleVisible(a) &&
        ((a.topics ?? []).includes('financovani') || (a.tag ?? '').includes('Financov'))
      )
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 6);

    if (!articles.length) {
      grid.innerHTML = '<li class="home-article-card"><p class="home-article-perex">Žádné publikované články.</p></li>';
      return;
    }
    grid.innerHTML = articles.map(a => `
      <li class="home-article-card">
        <a class="home-article-link" href="${escapeHtml(a.slug)}">
          <div class="home-article-meta">
            <span class="home-article-num">${escapeHtml(a.number ?? '')}</span>
            <span class="home-article-tag">${escapeHtml(a.tag ?? '')}</span>
            <span class="home-article-date">${fmtDate(a.date)}</span>
          </div>
          <h4 class="home-article-title">${escapeHtml(a.title ?? '')}</h4>
          <p class="home-article-perex">${escapeHtml(a.perex ?? '')}</p>
          <span class="home-article-cta">Číst článek →</span>
        </a>
      </li>`).join('');
  } catch (err) {
    console.error('fn articles load failed:', err);
    grid.innerHTML = '<li class="home-article-card"><p class="home-article-perex">Články se nepodařilo načíst.</p></li>';
  }
}

// ── av-counter animace ─────────────────────────────────────────────────────

function initCounters() {
  const counters = document.querySelectorAll('.av-counter:not([data-av-done])');
  if (!counters.length) return;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting || entry.target.dataset.avDone) return;
      entry.target.dataset.avDone = '1';
      const el       = entry.target;
      const target   = parseFloat(el.dataset.value ?? '0');
      const duration = parseInt(el.dataset.duration ?? '1200', 10);
      const decimals = parseInt(el.dataset.decimals ?? '0', 10);
      const start    = performance.now();
      const run = (now) => {
        const t = Math.min((now - start) / duration, 1);
        const ease = 1 - Math.pow(1 - t, 3);
        el.textContent = (target * ease).toFixed(decimals).replace('.', ',');
        if (t < 1) requestAnimationFrame(run);
        else el.textContent = target.toFixed(decimals).replace('.', ',');
      };
      requestAnimationFrame(run);
    });
  }, { threshold: 0.3 });
  counters.forEach(el => observer.observe(el));
}

// ── Init ───────────────────────────────────────────────────────────────────

async function init() {
  renderModuleNav('financovani');
  renderMastheadDate();
  initCounters();

  await loadFinancing();

  try { renderFinancingSankey(); } catch (err) { console.error('sankey failed:', err); }
  try { renderFinancingTrend(); }  catch (err) { console.error('trend failed:', err);  }

  await Promise.allSettled([
    loadIndicators(),
    loadArticles(),
    renderRegionMap(),
    renderPayersComparison(),
  ]);
}

// ── F5: Porovnání 7 ZP ──────────────────────────────────────────────────────

const PAYER_LABELS = {
  '111': 'VZP',  '201': 'VoZP', '205': 'ČPZP', '207': 'OZP',
  '209': 'ZPŠ',  '211': 'ZPMV', '213': 'RBP',
};

const PAYER_SEGMENT_COLORS = {
  luzkova:      '#B45F06',
  ambulantni:   '#38761D',
  stomatologie: '#A99577',
  leky:         '#0B5394',
  prostredky:   '#7A6A4F',
  lazne:        '#C3A580',
  doprava_zzs:  '#5F7A8B',
  ostatni:      '#7A7070',
};

const PAYER_SEGMENT_LABELS = {
  luzkova:      'Lůžková',
  ambulantni:   'Ambulantní',
  stomatologie: 'Stomatologie',
  leky:         'Léky',
  prostredky:   'ZP',
  lazne:        'Lázně',
  doprava_zzs:  'Doprava/ZZS',
  ostatni:      'Ostatní',
};

async function loadPojistenciByZp(year) {
  try {
    const res = await fetch('data/pojistenci-d5-zp.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const totals = {};
    const y = String(year);
    for (const kraj of Object.keys(data.data ?? {})) {
      const rec = data.data[kraj][y];
      if (!rec?.counts) continue;
      for (const [zp, n] of Object.entries(rec.counts)) {
        totals[zp] = (totals[zp] || 0) + n;
      }
    }
    return totals;
  } catch (err) {
    console.warn('pojistenci-d5-zp.json load failed:', err.message);
    return null;
  }
}

async function renderPayersComparison() {
  const ctx = document.getElementById('fnPayersChart');
  const tbody = document.getElementById('fnPayersTbody');
  if (!ctx || typeof Chart === 'undefined') return;
  if (!FINANCING?.by_payer) return;

  const year = 2024;
  const byPayer = FINANCING.by_payer;
  const payerCodes = Object.keys(byPayer).filter(c => byPayer[c][year]).sort();
  if (!payerCodes.length) return;

  const pojistenci = await loadPojistenciByZp(year);

  // Pro každou ZP spočti per-pojistence hodnotu per segment.
  const segmentKeys = Object.keys(PAYER_SEGMENT_LABELS);
  const labels = payerCodes.map(c => PAYER_LABELS[c] ?? c);
  const datasets = segmentKeys.map(seg => ({
    label: PAYER_SEGMENT_LABELS[seg],
    data: payerCodes.map(c => {
      const segments = byPayer[c][year].segments ?? {};
      const tisKc = segments[seg] ?? 0;
      const n = pojistenci?.[c] ?? 1;
      return n > 0 ? (tisKc * 1000 / n) : 0;
    }),
    backgroundColor: PAYER_SEGMENT_COLORS[seg],
    stack: 's',
  }));

  new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { stacked: true, grid: { color: 'rgba(31,26,20,0.06)' } },
        y: {
          stacked: true,
          title: { display: true, text: 'Kč/pojištěnce/rok', font: { size: 11 }, color: '#6b6357' },
          grid: { color: 'rgba(31,26,20,0.06)' },
          ticks: {
            callback: (v) => v.toLocaleString('cs-CZ'),
          },
        },
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: (c) => `${c.dataset.label}: ${Math.round(c.parsed.y).toLocaleString('cs-CZ')} Kč/poj.`,
            footer: (items) => `Celkem: ${Math.round(items.reduce((s, i) => s + i.parsed.y, 0)).toLocaleString('cs-CZ')} Kč/poj.`,
          },
        },
        legend: {
          position: 'bottom',
          labels: { font: { size: 11 }, boxWidth: 12, padding: 10 },
        },
      },
    },
  });

  // Tabulka
  if (tbody) {
    const rows = payerCodes.map(c => {
      const segments = byPayer[c][year].segments ?? {};
      const totalTisKc = Object.values(segments).reduce((a, v) => a + v, 0);
      const n = pojistenci?.[c] ?? null;
      const perPoj = n ? Math.round(totalTisKc * 1000 / n) : null;
      return { code: c, label: PAYER_LABELS[c] ?? c, total_mld: totalTisKc / 1e6, pojistenci: n, perPoj };
    });
    const avgPerPoj = rows.filter(r => r.perPoj).reduce((a, r) => a + r.perPoj * r.pojistenci, 0)
      / rows.filter(r => r.perPoj).reduce((a, r) => a + r.pojistenci, 0);
    tbody.innerHTML = rows.map(r => {
      const diff = r.perPoj ? ((r.perPoj - avgPerPoj) / avgPerPoj * 100) : null;
      const sign = diff != null && diff >= 0 ? '+' : '';
      return `<tr>
        <td>${escapeHtml(r.label)} (${escapeHtml(r.code)})</td>
        <td class="av-num">${r.pojistenci ? r.pojistenci.toLocaleString('cs-CZ') : '—'}</td>
        <td class="av-num">${r.total_mld.toFixed(1).replace('.', ',')}</td>
        <td class="av-num">${r.perPoj ? r.perPoj.toLocaleString('cs-CZ') : '—'}</td>
        <td class="av-num">${diff != null ? `${sign}${diff.toFixed(1)} %` : '—'}</td>
      </tr>`;
    }).join('');
  }
}

// ── Choropleth krajů (F3a — proxy data) ─────────────────────────────────────

async function renderRegionMap() {
  const container = document.getElementById('fnRegionMap');
  if (!container) return;
  if (typeof echarts === 'undefined') {
    console.warn('echarts not loaded — region map skipped');
    return;
  }
  let geo, fin;
  try {
    [geo, fin] = await Promise.all([
      fetch('data/cz-regions.geojson').then(r => r.json()),
      fetch('data/financing-regions.json').then(r => r.json()),
    ]);
  } catch (err) {
    console.error('region map fetch failed:', err);
    return;
  }
  if (!registerCzMap(geo)) return;

  const chart = echarts.init(container);
  applyChoropleth(chart, {
    regions: fin.regions,
    country_avg: fin.country_avg,
    unit: fin.unit,
    direction: fin.direction ?? 'context_dependent',
    name: 'Výdaje ZP na pojištěnce',
  });
  window.addEventListener('resize', () => chart.resize());

  populateRegionTable(fin);
}

function populateRegionTable(fin) {
  const tbody = document.getElementById('fnRegionTbody');
  if (!tbody) return;
  const sorted = [...fin.regions].sort((a, b) => b.value - a.value);
  tbody.innerHTML = sorted.map(r => {
    const diff = ((r.value - fin.country_avg) / fin.country_avg) * 100;
    const sign = diff >= 0 ? '+' : '';
    return `<tr>
      <td>${escapeHtml(r.name)}</td>
      <td class="av-num">${r.value.toLocaleString('cs-CZ')}</td>
      <td class="av-num">${sign}${diff.toFixed(1)}&nbsp;%</td>
      <td class="av-num">${r.pojistenci.toLocaleString('cs-CZ')}</td>
    </tr>`;
  }).join('');
}

if (typeof window !== 'undefined') init();

// ── Fallback (offline / fetch failure) ──────────────────────────────────────
// Drží stejné hodnoty jako default seed v ingest/transform_financing.js,
// aby stránka fungovala i bez data/financing.json (např. file:// otevření).

const FALLBACK_FINANCING = {
  version: 'fallback',
  sankey: {
    '2023': {
      total_mld_kc: 459,
      hub: { id: 'zp', label: 'Systém ZP', subtitle: '7 pojišťoven · 459 mld Kč', color: '#6b6357' },
      sources: [
        { id: 'zamestnanci',    label: 'Zaměstnanci a zaměstnavatelé', value_mld_kc: 269, color: '#4a6fa5' },
        { id: 'stat',           label: 'Stát (státní pojištěnci)',     value_mld_kc: 155, color: '#7a6a9c' },
        { id: 'osvc',           label: 'OSVČ',                          value_mld_kc:  25, color: '#5a8a6a' },
        { id: 'ostatni_platci', label: 'Ostatní plátci',                value_mld_kc:  10, color: '#8a8070' },
      ],
      targets: [
        { id: 'luzkova',    label: 'Lůžková péče',    value_mld_kc: 257, share_pct: 55.9, color: '#B45F06' },
        { id: 'ambulantni', label: 'Ambulantní péče', value_mld_kc: 131, share_pct: 28.5, color: '#38761D' },
        { id: 'leky',       label: 'Léky (recept)',   value_mld_kc:  46, share_pct: 10.0, color: '#0B5394' },
        { id: 'ostatni',    label: 'Ostatní péče',    value_mld_kc:  25, share_pct:  5.4, color: '#7A7070' },
      ],
    },
  },
  trend: {
    years: [2018, 2019, 2020, 2021, 2022, 2023, 2024],
    estimated_years: [2024],
    segments: {
      luzkova:    { label: 'Lůžková péče',                                values: [189, 203, 210, 224, 233, 257, 284], color: '#B45F06' },
      ambulantni: { label: 'Ambulantní péče',                             values: [ 92,  98, 103, 111, 116, 131, 145], color: '#38761D' },
      leky:       { label: 'Léky (recept)',                               values: [ 34,  37,  38,  40,  42,  46,  51], color: '#0B5394' },
      ostatni:    { label: 'Zdravotnické prostředky, lázně, ostatní',     values: [ 29,  30,  29,  29,  25,  25,  27], color: '#999999' },
    },
  },
};
