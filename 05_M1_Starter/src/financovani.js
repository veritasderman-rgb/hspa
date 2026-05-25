// Frontend logika stránky financovani.html.
// Zobrazuje: Sankey diagram finančních toků, časovou řadu výdajů ZP,
// indikátory domény Financování a publikované články s tématem financovani.

import './analytics.js';
import { renderModuleNav, renderMastheadDate, escapeHtml, isArticleVisible } from './page-shared.js';

// ── Sankey data (ZPP 2023, SHA 2011 — statická MVP data) ─────────────────────
// Zdroj: ZPP 2024 (7 ZP), ČSÚ Zdravotnické účty 2023, clanek-platba-statu-statni-pojistenci.html
// Hodnoty v mld Kč, zaokrouhleno; zdroje × výdaje jsou symetricky 459 mld.
// Malé výdajové segmenty (prostředky 11, lázně/stomato 10, doprava/ZZS 4) jsou sloučeny do "Ostatní péče".

const SANKEY_FLOWS = [
  { from: 'Zaměstnanci a zaměstnavatelé', to: 'Systém ZP', flow: 269 },
  { from: 'Stát (státní pojištěnci)',     to: 'Systém ZP', flow: 155 },
  { from: 'OSVČ',                         to: 'Systém ZP', flow: 25  },
  { from: 'Ostatní plátci',               to: 'Systém ZP', flow: 10  },
  { from: 'Systém ZP', to: 'Lůžková péče',    flow: 257 },
  { from: 'Systém ZP', to: 'Ambulantní péče', flow: 131 },
  { from: 'Systém ZP', to: 'Léky (recept)',   flow:  46 },
  { from: 'Systém ZP', to: 'Ostatní péče',    flow:  25 },
];

function renderFinancingSankey() {
  const container = document.getElementById('fnSankey');
  if (!container) return;
  populateFallbackTable();

  const W = 900, H = 480, TOP = 36, NW = 12, GAP = 8, TOTAL = 459;
  const UH = 432; // H - TOP - 12
  const SCALE = (UH - 3 * GAP) / TOTAL; // 408/459

  const sources = [
    { label: 'Zaměstnanci a zaměstnavatelé', value: 269, color: '#4a6fa5' },
    { label: 'Stát (státní pojištěnci)',      value: 155, color: '#7a6a9c' },
    { label: 'OSVČ',                          value:  25, color: '#5a8a6a' },
    { label: 'Ostatní plátci',                value:  10, color: '#8a8070' },
  ];
  const targets = [
    { label: 'Lůžková péče',    value: 257, pct: '55,9', color: '#B45F06' },
    { label: 'Ambulantní péče', value: 131, pct: '28,5', color: '#38761D' },
    { label: 'Léky (recept)',   value:  46, pct: '10,0', color: '#0B5394' },
    { label: 'Ostatní péče',    value:  25, pct: ' 5,4', color: '#7A7070' },
  ];

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
  s += t(446, 14, 'middle', 10, '#6b6357', '600', 'Systém ZP');
  s += t(446, 27, 'middle',  9, '#6b6357', null,  '7 pojišťoven · 459 mld Kč');
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
  s += `<rect x="${ZP_X}" y="${zpY}" width="${NW}" height="${zpH}" rx="2" fill="#6b6357"/>`;
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

function populateFallbackTable() {
  const tbody = document.getElementById('fnFallbackTbody');
  if (!tbody) return;
  const TOTAL = 459;
  const outputFlows = SANKEY_FLOWS.filter(d => d.from === 'Systém ZP');
  tbody.innerHTML = outputFlows.map(d => `
    <tr>
      <td>${escapeHtml(d.to)}</td>
      <td class="av-num">${d.flow}</td>
      <td class="av-num">${((d.flow / TOTAL) * 100).toFixed(1)}&nbsp;%</td>
    </tr>`).join('');
}

// ── Časová řada (ČSÚ SHA 2011 + ZPP, přibližné hodnoty) ─────────────────────

const TREND_YEARS   = ['2018', '2019', '2020', '2021', '2022', '2023', '2024*'];
const TREND_LUZKOVA = [  189,   203,   210,   224,   233,   257,   284 ];
const TREND_AMBUL   = [   92,    98,   103,   111,   116,   131,   145 ];
const TREND_LEKY    = [   34,    37,    38,    40,    42,    46,    51 ];
const TREND_OSTATNI = [   29,    30,    29,    29,    25,    25,    27 ];

function renderFinancingTrend() {
  const ctx = document.getElementById('fnTrendChart');
  if (!ctx || typeof Chart === 'undefined') return;
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: TREND_YEARS,
      datasets: [
        { label: 'Lůžková péče',            data: TREND_LUZKOVA, backgroundColor: '#B45F06', stack: 's' },
        { label: 'Ambulantní péče',          data: TREND_AMBUL,   backgroundColor: '#38761D', stack: 's' },
        { label: 'Léky (recept)',            data: TREND_LEKY,    backgroundColor: '#0B5394', stack: 's' },
        { label: 'Zdravotnické prostředky, lázně, ostatní', data: TREND_OSTATNI, backgroundColor: '#999', stack: 's' },
      ],
    },
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
          <a class="fn-ind-link" href="indicator.html?id=${escapeHtml(ind.id)}">
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

  try { renderFinancingSankey(); } catch (err) { console.error('sankey failed:', err); }
  try { renderFinancingTrend(); }  catch (err) { console.error('trend failed:', err);  }

  await Promise.allSettled([loadIndicators(), loadArticles()]);
}

if (typeof window !== 'undefined') init();
