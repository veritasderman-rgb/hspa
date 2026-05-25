// Frontend logika stránky financovani.html.
// Zobrazuje: Sankey diagram finančních toků, časovou řadu výdajů ZP,
// indikátory domény Financování a publikované články s tématem financovani.

import './analytics.js';
import { renderModuleNav, renderMastheadDate, escapeHtml, isArticleVisible } from './page-shared.js';

// ── Sankey data (ZPP 2023, SHA 2011 — statická MVP data) ─────────────────────
// Zdroj: ZPP 2024 (7 ZP), ČSÚ Zdravotnické účty 2023, clanek-platba-statu-statni-pojistenci.html
// Hodnoty v mld Kč, zaokrouhleno; zdroje × výdaje jsou symetricky 459 mld.

const SANKEY_FLOWS = [
  // Zdroje → Systém ZP
  { from: 'Zaměstnanci a zaměstnavatelé', to: 'Systém ZP', flow: 269 },
  { from: 'Stát (státní pojištěnci)',     to: 'Systém ZP', flow: 155 },
  { from: 'OSVČ',                         to: 'Systém ZP', flow: 25  },
  { from: 'Ostatní plátci',               to: 'Systém ZP', flow: 10  },
  // Systém ZP → Segmenty péče (dle NRHZS 2023; odpovídá donut na homepage)
  { from: 'Systém ZP', to: 'Lůžková péče',              flow: 257 },
  { from: 'Systém ZP', to: 'Ambulantní péče',           flow: 131 },
  { from: 'Systém ZP', to: 'Léky (recept)',              flow: 46  },
  { from: 'Systém ZP', to: 'Zdravotnické prostředky',   flow: 11  },
  { from: 'Systém ZP', to: 'Lázně a stomatologie',      flow: 10  },
  { from: 'Systém ZP', to: 'Doprava, ZZS, ostatní',     flow: 4   },
];

const SANKEY_COLORS = {
  'Zaměstnanci a zaměstnavatelé': '#4a6fa5',
  'Stát (státní pojištěnci)':     '#7a6a9c',
  'OSVČ':                          '#5a8a6a',
  'Ostatní plátci':                '#8a8070',
  'Systém ZP':                     '#6b6357',
  'Lůžková péče':                  '#B45F06',
  'Ambulantní péče':               '#38761D',
  'Léky (recept)':                 '#0B5394',
  'Zdravotnické prostředky':       '#7A6A4F',
  'Lázně a stomatologie':          '#A99577',
  'Doprava, ZZS, ostatní':         '#5F7A8B',
};

function renderFinancingSankey() {
  const ctx = document.getElementById('fnSankey');
  if (!ctx) return;

  // Ověř, že Chart.js i chartjs-chart-sankey jsou načteny
  if (typeof Chart === 'undefined') {
    showSankeyFallback();
    return;
  }
  let hasSankey = false;
  try { Chart.registry.getController('sankey'); hasSankey = true; } catch { /* not registered */ }
  if (!hasSankey) {
    showSankeyFallback();
    return;
  }

  // Naplň fallback tabulku vždy
  populateFallbackTable();

  new Chart(ctx, {
    type: 'sankey',
    data: {
      datasets: [{
        data: SANKEY_FLOWS,
        colorFrom: (c) => SANKEY_COLORS[SANKEY_FLOWS[c.dataIndex]?.from] ?? '#aaa',
        colorTo:   (c) => SANKEY_COLORS[SANKEY_FLOWS[c.dataIndex]?.to]   ?? '#aaa',
        colorMode: 'gradient',
        borderWidth: 0,
        nodePadding: 12,
        nodeWidth: 10,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (c) => {
              const d = SANKEY_FLOWS[c.dataIndex];
              if (d) return `${d.from} → ${d.to}: ${d.flow} mld Kč`;
              return '';
            },
          },
        },
      },
    },
  });
}

function showSankeyFallback() {
  const wrap = document.getElementById('fnSankey')?.closest('.fn-sankey-wrap');
  if (!wrap) return;
  const fallback = wrap.querySelector('.fn-sankey-fallback');
  if (fallback) fallback.open = true;
  const canvas = document.getElementById('fnSankey');
  if (canvas) canvas.style.display = 'none';
  populateFallbackTable();
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
