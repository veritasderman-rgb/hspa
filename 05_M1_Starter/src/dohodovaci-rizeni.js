// Frontend logika pro dohodovaci-rizeni.html.
// Bez ?id= renderuje rozcestník (hero + mřížka 8+1 dimenzí + karty 44 sad),
// s ?id=<sada> renderuje detail jedné datové sady.
//
// Sady NEJSOU klasické HSPA indikátory — jde o provozní a ekonomická data
// dohodovacího řízení (zdroj: NZIP / ÚZIS ČR). Vlna 0: většina sad je "stub".

import './analytics.js';
import { renderModuleNav, renderMastheadDate, renderFooter, escapeHtml, renderErrorState } from './page-shared.js';

const DATA_URL = 'data/dohodovaci-rizeni.json';

const STATUS_LABEL = {
  ready: 'Zpracováno',
  external: 'Interaktivní atlas',
  stub: 'Připravujeme',
};

let _chart = null;

async function init() {
  if (typeof window === 'undefined') return;
  renderModuleNav('dohodovaci-rizeni');
  renderMastheadDate();
  renderFooter();

  const root = document.getElementById('drRoot');
  try {
    const data = await fetch(DATA_URL).then((r) => {
      if (!r.ok) throw new Error('dohodovaci-rizeni.json HTTP ' + r.status);
      return r.json();
    });
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view');
    const id = params.get('id');
    if (view === 'analyza') renderAnalysis(root, data);
    else if (id) renderDetail(root, data, id);
    else renderLanding(root, data);
  } catch (err) {
    console.error('dohodovaci-rizeni load failed:', err);
    root.innerHTML = renderErrorState('Nepodařilo se načíst datovou podporu dohodovacího řízení.', err);
  }
}

/* ======================= ROZCESTNÍK ======================= */

function renderLanding(root, data) {
  document.title = 'Dohodovací řízení — datová podpora · HSPA Monitor';
  const ctx = data.negotiation_context || {};
  const sum = ctx.summary || {};
  const dims = data.dimensions || [];
  const datasets = data.datasets || [];
  const byId = new Map(datasets.map((d) => [d.id, d]));

  const heroHtml = `
    <section class="dr-hero" aria-labelledby="drHeroHead">
      <div class="dr-hero-content">
        <div class="ed-kicker">Datová podpora dohodovacího řízení</div>
        <h2 class="ed-hero-headline" id="drHeroHead">Na čem stojí vyjednávání o úhradách české zdravotní péče</h2>
        <p class="ed-hero-lead">${escapeHtml(ctx.lead || '')}</p>
        <p class="dr-hero-note">Tyto datové sady nejsou klasické HSPA indikátory výkonnosti — jde o provozní a ekonomická data, která dělají vyjednávání o úhradové vyhlášce průhledným a podloženým fakty.</p>
      </div>
      <aside class="dr-hero-stats" aria-label="Klíčová čísla">
        <div class="ed-stat ed-stat-static">
          <div class="ed-stat-num">${sum.datasets_total ?? datasets.length}</div>
          <div class="ed-stat-lbl">Datových sad ÚZIS</div>
          <div class="ed-stat-meta">Crawl portálu NZIP — datová podpora dohodovacího řízení ${escapeHtml(String(ctx.negotiation_year || ''))}</div>
        </div>
        <div class="ed-stat ed-stat-static">
          <div class="ed-stat-num">${sum.dimensions ?? 8}</div>
          <div class="ed-stat-lbl">Dimenzí datové podpory</div>
          <div class="ed-stat-meta">Od cen a personálu po lůžkovou a jednodenní péči</div>
        </div>
        <div class="ed-stat ed-stat-static">
          <div class="ed-stat-num">${sum.interactive_only ?? 0}</div>
          <div class="ed-stat-lbl">Interaktivních vizualizací</div>
          <div class="ed-stat-meta">Pohledy dostupné jen jako dashboard, bez staženého souboru</div>
        </div>
      </aside>
    </section>`;

  const dimsGridHtml = `
    <section class="dr-dims" aria-labelledby="drDimsHead">
      <div class="ed-kicker">Osm dimenzí + doplňkové registry</div>
      <h3 class="ed-dims-headline" id="drDimsHead">Z čeho se datová podpora skládá</h3>
      <div class="dr-dims-grid">
        ${dims
          .map((dim) => {
            const n = dim.dataset_ids.length;
            const inner = `
            <span class="dr-dim-num">${dim.number}</span>
            <span class="dr-dim-label">${escapeHtml(dim.label)}</span>
            <span class="dr-dim-count">${n} ${plural(n, 'sada', 'sady', 'sad')}</span>
            <span class="dr-dim-desc">${escapeHtml(dim.description)}</span>`;
            const style = `style="--dr-dim-color:${escapeHtml(dim.color)}"`;
            return n > 0
              ? `<a class="dr-dim-tile" href="#${escapeHtml(dim.id)}" ${style}>${inner}</a>`
              : `<div class="dr-dim-tile dr-dim-tile-empty" ${style}>${inner}</div>`;
          })
          .join('')}
      </div>
    </section>`;

  const sectionsHtml = dims
    .filter((dim) => dim.dataset_ids.length > 0)
    .map((dim) => {
      const cards = dim.dataset_ids
        .map((dsId) => byId.get(dsId))
        .filter(Boolean)
        .map((ds) => renderCard(ds))
        .join('');
      return `
        <section class="dr-dim-section" id="${escapeHtml(dim.id)}" aria-labelledby="${escapeHtml(dim.id)}-head">
          <div class="dr-dim-section-head" style="--dr-dim-color:${escapeHtml(dim.color)}">
            <span class="dr-dim-section-num">${dim.number}</span>
            <h3 id="${escapeHtml(dim.id)}-head">${escapeHtml(dim.label)}</h3>
            <span class="dr-dim-section-count">${dim.dataset_ids.length} ${plural(dim.dataset_ids.length, 'sada', 'sady', 'sad')}</span>
          </div>
          <p class="dr-dim-section-desc">${escapeHtml(dim.description)}</p>
          <div class="dr-card-grid">${cards}</div>
        </section>`;
    })
    .join('');

  const provenanceHtml = `
    <section class="dr-provenance" aria-labelledby="drProvHead">
      <div class="ed-kicker">Odkud data jsou</div>
      <h3 id="drProvHead">Provenience a kadence</h3>
      <div class="dr-prov-grid">
        <div>
          <h4>Zdroj</h4>
          <p>${escapeHtml(data.publisher || 'ÚZIS ČR / MZ ČR')} — portál
            <a href="${escapeHtml(data.root_url || 'https://www.nzip.cz/dohodovaci-rizeni')}" target="_blank" rel="noopener">NZIP · Dohodovací řízení ↗</a>.
            Každá sada je publikována jako datový souhrn (XLSX) na úrovni poskytovatelů.</p>
        </div>
        <div>
          <h4>Kadence</h4>
          <p>Aktualizace nepravidelná, dle ÚZIS — typicky 1–3 edice ročně na sadu. Časová řada vzniká uvnitř souboru nebo stohováním ročních edic.</p>
        </div>
        <div>
          <h4>Vymezení</h4>
          <p>Data jsou agregovaná, bez osobních údajů. Nejde o HSPA indikátory výkonnosti — viz <a href="index.html">Indikátory</a> a <a href="hspa-prehled.html">HSPA přehled</a>.</p>
        </div>
      </div>
    </section>`;

  const interactive = data.interactive_only || [];
  const interactiveHtml = interactive.length
    ? `<section class="dr-interactive" aria-labelledby="drIntHead">
        <div class="ed-kicker">Jen interaktivně</div>
        <h3 id="drIntHead">Vizualizace bez staženého souboru</h3>
        <p class="dr-dim-section-desc">${interactive.length} pohledů, které ÚZIS publikuje pouze jako interaktivní dashboard na NZIP.</p>
        <ul class="dr-interactive-list">
          ${interactive
            .map(
              (v) =>
                `<li><a href="${escapeHtml(v.nzip_page)}" target="_blank" rel="noopener">${escapeHtml(v.title)} ↗</a></li>`,
            )
            .join('')}
        </ul>
      </section>`
    : '';

  const analyzaCtaHtml = data.strategic_analysis
    ? `<a class="dr-analyza-cta" href="dohodovaci-rizeni.html?view=analyza">
        <div class="dr-analyza-cta-text">
          <span class="ed-kicker">Strategická analýza</span>
          <strong>${escapeHtml(data.strategic_analysis.title)}</strong>
          <span class="dr-analyza-cta-sub">SWOT, predikce a velká čísla — co data říkají o směřování českého zdravotnictví</span>
        </div>
        <span class="dr-analyza-cta-arrow" aria-hidden="true">→</span>
      </a>`
    : '';

  root.innerHTML =
    heroHtml + analyzaCtaHtml + dimsGridHtml + sectionsHtml + interactiveHtml + provenanceHtml;
}

/* ======================= STRATEGICKÁ ANALÝZA ======================= */

function renderAnalysis(root, data) {
  const a = data.strategic_analysis;
  if (!a) {
    root.innerHTML = renderErrorState('Strategická analýza není k dispozici.');
    return;
  }
  document.title = `${a.title} — Dohodovací řízení · HSPA Monitor`;

  const numbersHtml = a.key_numbers
    .map(
      (n) => `
      <div class="dr-bignum dr-bignum-${escapeHtml(n.tone || 'neutral')}">
        <div class="dr-bignum-value" data-target="${n.value}" data-prefix="${escapeHtml(n.prefix || '')}" data-suffix="${escapeHtml(n.suffix || '')}">0</div>
        <div class="dr-bignum-label">${escapeHtml(n.label)}</div>
        <div class="dr-bignum-plain">${escapeHtml(n.plain)}</div>
      </div>`,
    )
    .join('');

  const swotOrder = [
    ['strengths', 'Silné stránky'],
    ['weaknesses', 'Slabé stránky'],
    ['opportunities', 'Příležitosti'],
    ['threats', 'Hrozby'],
  ];
  const swotHtml = swotOrder
    .map(
      ([key, label]) => `
      <div class="dr-swot-quad dr-swot-${key}">
        <div class="dr-swot-head"><span class="dr-swot-letter">${escapeHtml(label[0])}</span><h4>${label}</h4></div>
        <ul>${(a.swot[key] || [])
          .map((it) => `<li class="dr-reveal"><strong>${escapeHtml(it.title)}</strong> — ${escapeHtml(it.detail)}</li>`)
          .join('')}</ul>
      </div>`,
    )
    .join('');

  const timelineHtml = (a.timeline.events || [])
    .map(
      (e) => `
      <li class="dr-tl-item dr-reveal dr-tl-${escapeHtml(e.tone || 'neutral')}">
        <span class="dr-tl-year">${e.year}</span>
        <div class="dr-tl-body"><strong>${escapeHtml(e.title)}</strong><span>${escapeHtml(e.detail)}</span></div>
      </li>`,
    )
    .join('');

  const recHtml = (a.recommendations || [])
    .map(
      (r, i) =>
        `<li class="dr-reveal"><span class="dr-rec-num">${i + 1}</span><div><strong>${escapeHtml(r.title)}</strong><p>${escapeHtml(r.detail)}</p></div></li>`,
    )
    .join('');

  const fc = a.forecast;
  const scRows = [fc.scenarios.optimistic, fc.scenarios.base, fc.scenarios.risk, fc.benchmark]
    .map(
      (s) => `<tr>
        <td><span class="dr-sc-dot" style="background:${escapeHtml(s.color)}"></span>${escapeHtml(s.label.replace(/\s*\([^)]*\)\s*/, ''))}</td>
        <td class="dr-sc-rate">${escapeHtml(s.rate)}</td>
        <td class="dr-sc-y2030"><strong>${formatValue(s.y2030)}</strong> mld.</td>
        <td class="dr-sc-assum">${escapeHtml(s.assumption)}</td>
      </tr>`,
    )
    .join('');
  const gapHtml = fc.gap_2030
    ? `<div class="dr-gap-callout dr-reveal">
        <div class="dr-bignum-value dr-gap-num" data-target="${fc.gap_2030.value}" data-prefix="~" data-suffix="${escapeHtml(fc.gap_2030.unit || '')}">0</div>
        <div class="dr-gap-text"><strong>${escapeHtml(fc.gap_2030.label)}</strong><p>${escapeHtml(fc.gap_2030.plain)}</p></div>
      </div>`
    : '';
  const forecastHtml = `
      <section class="dr-analyza-sec"><h3>${escapeHtml(fc.title)}</h3>
        <div class="dr-chart-wrap dr-chart-tall"><canvas id="drForecast" aria-label="Graf citlivostní predikce nákladů"></canvas></div>
        <p class="dr-analyza-note">${escapeHtml(fc.scenario_note)}</p>
        <table class="dr-sc-table">
          <thead><tr><th>Scénář</th><th>Tempo</th><th>Náklady 2030</th><th>Klíčový předpoklad</th></tr></thead>
          <tbody>${scRows}</tbody>
        </table>
        ${gapHtml}
        <p class="dr-analyza-takeaway">${escapeHtml(fc.takeaway)}</p>
      </section>`;

  const cg = a.cost_growth;
  const cgSegHtml = cg.segments
    .map(
      (s) => `<li class="dr-cg-seg dr-reveal">
        <span class="dr-cg-val dr-cg-${escapeHtml(s.type)}">${s.cagr > 0 ? '+' : ''}${formatValue(s.cagr)} %</span>
        <span class="dr-cg-text"><strong>${escapeHtml(s.label)}</strong> — ${escapeHtml(s.note)}</span>
      </li>`,
    )
    .join('');
  const costGrowthHtml = `
      <section class="dr-analyza-sec"><h3>${escapeHtml(cg.title)}</h3>
        <p class="dr-analyza-intro">${escapeHtml(cg.intro)}</p>
        <div class="dr-chart-wrap dr-chart-tall"><canvas id="drCagr" aria-label="Graf tempa růstu segmentů"></canvas></div>
        <p class="dr-analyza-note">${escapeHtml(cg.note)}</p>
        <ul class="dr-cg-list">${cgSegHtml}</ul>
        <p class="dr-analyza-takeaway">${escapeHtml(cg.takeaway)}</p>
      </section>`;

  const wf = a.workforce;
  const wfNumbersHtml = wf.key_numbers
    .map(
      (n) => `
      <div class="dr-bignum dr-bignum-${escapeHtml(n.tone || 'neutral')}">
        <div class="dr-bignum-value" data-target="${n.value}" data-prefix="${escapeHtml(n.prefix || '')}" data-suffix="${escapeHtml(n.suffix || '')}">0</div>
        <div class="dr-bignum-label">${escapeHtml(n.label)}</div>
        <div class="dr-bignum-plain">${escapeHtml(n.plain)}</div>
      </div>`,
    )
    .join('');
  const workforceHtml = `
      <section class="dr-analyza-sec"><h3>${escapeHtml(wf.title)}</h3>
        <p class="dr-analyza-intro">${escapeHtml(wf.intro)}</p>
        <h4 class="dr-analyza-subh">Demografický obraz</h4>
        <p class="dr-analyza-body">${escapeHtml(wf.demographic)}</p>
        <div class="dr-chart-wrap dr-chart-tall"><canvas id="drDocAge" aria-label="Graf věkové struktury lékařů"></canvas></div>
        <p class="dr-analyza-note">${escapeHtml(wf.age_chart.note)}</p>
        <h4 class="dr-analyza-subh">Odhad vývoje</h4>
        <p class="dr-analyza-body">${escapeHtml(wf.estimate)}</p>
        <div class="dr-chart-wrap dr-chart-tall"><canvas id="drRetire" aria-label="Graf odchodů lékařů do důchodu"></canvas></div>
        <p class="dr-analyza-note">${escapeHtml(wf.projection_chart.note)}</p>
        <div class="dr-bignum-grid">${wfNumbersHtml}</div>
        <p class="dr-method-note">${escapeHtml(wf.methodology)}</p>
      </section>`;

  root.innerHTML = `
    <article class="dr-analyza">
      <a class="dr-back" href="dohodovaci-rizeni.html">← Datová podpora dohodovacího řízení</a>
      <header class="dr-analyza-head">
        <div class="ed-kicker">Strategická analýza</div>
        <h2>${escapeHtml(a.title)}</h2>
        <p class="dr-analyza-sub">${escapeHtml(a.subtitle)}</p>
      </header>
      <p class="dr-analyza-thesis">${escapeHtml(a.thesis)}</p>

      <section class="dr-analyza-sec"><h3>Klíčová čísla</h3>
        <div class="dr-bignum-grid">${numbersHtml}</div>
      </section>

      <section class="dr-analyza-sec"><h3>${escapeHtml(a.cost_structure.title)}</h3>
        <p class="dr-analyza-note">${escapeHtml(a.cost_structure.note)}</p>
        <div class="dr-donut-wrap"><canvas id="drDonut" aria-label="Koláčový graf struktury nákladů"></canvas></div>
      </section>

      ${costGrowthHtml}

      <section class="dr-analyza-sec"><h3>SWOT analýza</h3>
        <div class="dr-swot-grid">${swotHtml}</div>
      </section>

      <section class="dr-analyza-sec"><h3>${escapeHtml(a.timeline.title)}</h3>
        <ul class="dr-timeline">${timelineHtml}</ul>
      </section>

      ${forecastHtml}

      ${workforceHtml}

      <section class="dr-analyza-sec"><h3>Doporučení</h3>
        <ol class="dr-rec-list">${recHtml}</ol>
      </section>

      <p class="dr-method-note">${escapeHtml(a.methodology)}</p>
    </article>`;

  drawDonut(a.cost_structure);
  drawCagr(a.cost_growth);
  drawForecast(a.forecast);
  drawAgeStructure(a.workforce.age_chart);
  drawRetirement(a.workforce.projection_chart);
  wireCounters();
  wireReveal();
}

function drawDonut(cs) {
  const canvas = document.getElementById('drDonut');
  if (!canvas || typeof window.Chart === 'undefined') return;
  const paper = (getComputedStyle(document.documentElement).getPropertyValue('--paper') || '#fbf8f1').trim();
  new window.Chart(canvas.getContext('2d'), {
    type: 'doughnut',
    data: {
      labels: cs.items.map((i) => i.name),
      datasets: [{
        data: cs.items.map((i) => i.value),
        backgroundColor: cs.items.map((i) => i.color),
        borderColor: paper,
        borderWidth: 2,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '58%',
      animation: reduceMotion() ? false : { animateRotate: true, duration: 1000 },
      plugins: {
        legend: { position: 'right' },
        tooltip: { callbacks: { label: (c) => `${c.label}: ${formatValue(c.parsed)} ${cs.unit}` } },
      },
    },
  });
}

function drawForecast(fc) {
  const canvas = document.getElementById('drForecast');
  if (!canvas || typeof window.Chart === 'undefined') return;
  const sc = fc.scenarios;
  const datasets = [
    { label: 'Skutečnost', data: fc.history, borderColor: '#0b5394', backgroundColor: 'transparent', borderWidth: 3, pointRadius: 3, tension: 0.2 },
    { label: sc.risk.label, data: sc.risk.values, borderColor: sc.risk.color, backgroundColor: 'transparent', borderWidth: 1.5, borderDash: [3, 3], pointRadius: 0, tension: 0.2 },
    { label: sc.optimistic.label, data: sc.optimistic.values, borderColor: sc.optimistic.color, backgroundColor: 'rgba(120,120,120,0.12)', borderWidth: 1.5, borderDash: [3, 3], pointRadius: 0, tension: 0.2, fill: '-1' },
    { label: sc.base.label, data: sc.base.values, borderColor: sc.base.color, backgroundColor: 'transparent', borderWidth: 2.5, borderDash: [6, 4], pointRadius: 3, tension: 0.2 },
    { label: fc.benchmark.label, data: fc.benchmark.values, borderColor: fc.benchmark.color, backgroundColor: 'transparent', borderWidth: 2, borderDash: [2, 2], pointRadius: 0, tension: 0.2 },
  ];
  if (_chart) _chart.destroy();
  _chart = new window.Chart(canvas.getContext('2d'), {
    type: 'line',
    data: { labels: fc.labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: reduceMotion() ? false : { duration: 1100 },
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'bottom' },
        tooltip: { callbacks: { label: (c) => c.parsed.y == null ? null : `${c.dataset.label}: ${formatValue(c.parsed.y)} ${fc.unit}` } },
      },
      scales: { y: { beginAtZero: true, title: { display: true, text: fc.unit } } },
    },
  });
}

function drawCagr(cg) {
  const canvas = document.getElementById('drCagr');
  if (!canvas || typeof window.Chart === 'undefined') return;
  const segs = [...cg.segments].sort((a, b) => b.cagr - a.cagr);
  const colors = segs.map((s) => (s.type === 'cost' ? '#b8361e' : s.cagr < 0 ? '#6b6357' : '#1f7a4d'));
  new window.Chart(canvas.getContext('2d'), {
    type: 'bar',
    data: {
      labels: segs.map((s) => s.label),
      datasets: [{ label: 'Roční tempo růstu', data: segs.map((s) => s.cagr), backgroundColor: colors }],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      animation: reduceMotion() ? false : { duration: 900 },
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (c) => `${c.parsed.x > 0 ? '+' : ''}${c.parsed.x} %/rok` } },
      },
      scales: { x: { title: { display: true, text: '% ročně (CAGR 2019–2024)' } } },
    },
  });
}

function drawAgeStructure(ac) {
  const canvas = document.getElementById('drDocAge');
  if (!canvas || typeof window.Chart === 'undefined') return;
  const colors = ac.doctors.map((_, i) =>
    i >= ac.retire_from_index ? '#b8361e' : i === ac.warn_index ? '#a05a08' : '#0b5394',
  );
  new window.Chart(canvas.getContext('2d'), {
    type: 'bar',
    data: { labels: ac.age_bands, datasets: [{ label: ac.unit || 'lékařů', data: ac.doctors, backgroundColor: colors }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: reduceMotion() ? false : { duration: 900 },
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (c) => `${c.parsed.y.toLocaleString('cs-CZ')} lékařů` } },
      },
      scales: { y: { beginAtZero: true, title: { display: true, text: 'počet lékařů' } } },
    },
  });
}

function drawRetirement(pc) {
  const canvas = document.getElementById('drRetire');
  if (!canvas || typeof window.Chart === 'undefined') return;
  new window.Chart(canvas.getContext('2d'), {
    data: {
      labels: pc.labels,
      datasets: [
        { type: 'bar', label: 'Dosáhnou 65 let v daném roce', data: pc.per_year, backgroundColor: '#a05a08', yAxisID: 'y' },
        { type: 'line', label: 'Kumulativně', data: pc.cumulative, borderColor: '#b8361e', backgroundColor: 'transparent', borderWidth: 2.5, pointRadius: 3, tension: 0.2, yAxisID: 'y1' },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: reduceMotion() ? false : { duration: 1000 },
      interaction: { mode: 'index', intersect: false },
      plugins: { legend: { position: 'bottom' } },
      scales: {
        y: { beginAtZero: true, position: 'left', title: { display: true, text: 'za rok' } },
        y1: { beginAtZero: true, position: 'right', title: { display: true, text: 'kumulativně' }, grid: { drawOnChartArea: false } },
      },
    },
  });
}

function animateCount(el) {
  const target = parseFloat(el.dataset.target);
  const prefix = el.dataset.prefix || '';
  const suffix = el.dataset.suffix || '';
  const fmt = (v) => prefix + Math.round(v).toLocaleString('cs-CZ') + suffix;
  if (reduceMotion()) {
    el.textContent = fmt(target);
    return;
  }
  const dur = 1100;
  let start = null;
  function step(ts) {
    if (!start) start = ts;
    const p = Math.min((ts - start) / dur, 1);
    el.textContent = fmt(target * (1 - Math.pow(1 - p, 3)));
    if (p < 1) requestAnimationFrame(step);
    else el.textContent = fmt(target);
  }
  requestAnimationFrame(step);
}

function wireCounters() {
  const els = [...document.querySelectorAll('.dr-bignum-value')];
  if (!('IntersectionObserver' in window)) {
    els.forEach(animateCount);
    return;
  }
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        animateCount(e.target);
        io.unobserve(e.target);
      }
    }
  }, { threshold: 0.4 });
  els.forEach((el) => io.observe(el));
}

function wireReveal() {
  const els = [...document.querySelectorAll('.dr-reveal')];
  if (reduceMotion() || !('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('dr-revealed'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        e.target.classList.add('dr-revealed');
        io.unobserve(e.target);
      }
    }
  }, { threshold: 0.15 });
  els.forEach((el) => io.observe(el));
}

function renderCard(ds) {
  const headline = ds.headline
    ? `<div class="dr-card-headline"><span class="dr-card-value">${formatValue(ds.headline.value)}</span>
         <span class="dr-card-unit">${escapeHtml(ds.headline.unit || '')}</span></div>
       <div class="dr-card-headline-lbl">${escapeHtml(ds.headline.label || '')}${
        ds.headline.year ? ' · ' + ds.headline.year : ''
      }</div>`
    : `<div class="dr-card-headline-lbl dr-card-headline-empty">${escapeHtml(ds.reference_period || 'Referenční období dle edice')}</div>`;
  return `
    <a class="dr-card dr-card-${escapeHtml(ds.status)}" href="dohodovaci-rizeni.html?id=${encodeURIComponent(ds.id)}">
      <div class="dr-card-top">
        <span class="dr-card-ois">${escapeHtml(ds.ois_code)}</span>
        <span class="dr-card-status dr-status-${escapeHtml(ds.status)}">${escapeHtml(STATUS_LABEL[ds.status] || ds.status)}</span>
      </div>
      <h4 class="dr-card-title">${escapeHtml(ds.title)}</h4>
      ${headline}
      <span class="dr-card-cta">Detail sady →</span>
    </a>`;
}

/* ======================= DETAIL SADY ======================= */

function renderDetail(root, data, id) {
  const ds = (data.datasets || []).find((d) => d.id === id);
  if (!ds) {
    root.innerHTML = renderErrorState(`Datová sada „${escapeHtml(id)}" nebyla nalezena.`);
    return;
  }
  const dim = (data.dimensions || []).find((d) => d.id === ds.dimension);
  document.title = `${ds.title} — Dohodovací řízení · HSPA Monitor`;

  const headline = ds.headline
    ? `<div class="dr-detail-hero">
         <span class="dr-detail-value">${formatValue(ds.headline.value)}</span>
         <span class="dr-detail-unit">${escapeHtml(ds.headline.unit || '')}</span>
         <span class="dr-detail-hero-lbl">${escapeHtml(ds.headline.label || '')}${
        ds.headline.year ? ' · ' + ds.headline.year : ''
      }</span>
       </div>`
    : '';

  const roleHtml = ds.role_in_negotiation
    ? `<div class="dr-detail-block"><h3>Role v dohodovacím řízení</h3><p>${escapeHtml(ds.role_in_negotiation)}</p></div>`
    : '';
  const saysHtml = ds.what_it_says
    ? `<div class="dr-detail-block"><h3>Co data říkají</h3><p>${escapeHtml(ds.what_it_says)}</p></div>`
    : '';

  const vizHtml = renderViz(ds);

  const intlHtml = renderInternational(ds.international);

  const externalHtml =
    ds.status === 'external'
      ? `<div class="dr-detail-block dr-detail-external">
           <h3>Interaktivní atlas</h3>
           <p>Tato sada je zpracována jako samostatný interaktivní atlas s animovanou mapou, populační pyramidou a race-chartem.</p>
           <a class="dr-btn" href="${escapeHtml(ds.external_page || 'pojistenci.html')}">Otevřít interaktivní atlas →</a>
         </div>`
      : '';

  const stubHtml =
    ds.status === 'stub'
      ? `<div class="dr-detail-block dr-detail-stub">
           <h3>Připravujeme</h3>
           <p>Tato datová sada zatím čeká na zpracování (fetch, transform, mezinárodní srovnání a redakční text) v rámci vlny dimenze „${escapeHtml(
             dim ? dim.label : '',
           )}". Mezitím je dostupný originální datový souhrn na NZIP.</p>
         </div>`
      : '';

  const sourceHtml = `
    <div class="dr-detail-block dr-detail-source">
      <h3>Zdroj a metodika</h3>
      <dl class="dr-source-dl">
        <dt>Kód sady</dt><dd>${escapeHtml(ds.ois_code)}</dd>
        <dt>Referenční období</dt><dd>${escapeHtml(ds.reference_period || '—')}</dd>
        <dt>Kadence</dt><dd>${escapeHtml(ds.cadence || '—')}</dd>
        <dt>Edice</dt><dd>${escapeHtml((ds.editions || []).join(', ') || '—')}</dd>
        <dt>Vydavatel</dt><dd>${escapeHtml(ds.source?.publisher || 'ÚZIS ČR')}</dd>
      </dl>
      <p class="dr-source-links">
        <a href="${escapeHtml(ds.nzip_page)}" target="_blank" rel="noopener">Stránka sady na NZIP ↗</a>
        ${ds.source?.latest_file ? ` · <a href="${escapeHtml(ds.source.latest_file)}" target="_blank" rel="noopener">Nejnovější datový soubor (XLSX) ↗</a>` : ''}
        ${ds.metodika_pdf ? ` · <a href="${escapeHtml(ds.metodika_pdf)}" target="_blank" rel="noopener">Metodický popis (PDF) ↗</a>` : ''}
      </p>
    </div>`;

  root.innerHTML = `
    <article class="dr-detail">
      <a class="dr-back" href="dohodovaci-rizeni.html">← Všechny datové sady</a>
      <div class="dr-detail-head">
        <span class="dr-detail-dim"${dim ? ` style="--dr-dim-color:${escapeHtml(dim.color)}"` : ''}>
          ${dim ? escapeHtml('Dimenze ' + dim.number + ' · ' + dim.label) : ''}
        </span>
        <h2>${escapeHtml(ds.title)}</h2>
      </div>
      ${headline}
      ${roleHtml}
      ${saysHtml}
      ${vizHtml}
      ${intlHtml}
      ${externalHtml}
      ${stubHtml}
      ${sourceHtml}
    </article>`;

  wireViz(ds);
}

/* ---- vizualizace detailu: line / pyramida / tabulka období ---- */

function renderViz(ds) {
  if (ds.status !== 'ready') return '';
  const note = ds.method_note
    ? `<p class="dr-method-note">${escapeHtml(ds.method_note)}</p>`
    : '';
  if (Array.isArray(ds.series) && ds.series.length) {
    return `<div class="dr-detail-block"><h3>Časová řada</h3>
      <div class="dr-chart-wrap"><canvas id="drChart" aria-label="Graf časové řady"></canvas></div>${note}</div>`;
  }
  if (ds.pyramid) {
    return `<div class="dr-detail-block"><h3>Věková pyramida pracovníků</h3>
      <div class="dr-chart-wrap dr-chart-tall"><canvas id="drChart" aria-label="Věková pyramida"></canvas></div>${note}</div>`;
  }
  if (ds.ranked && Array.isArray(ds.ranked.items) && ds.ranked.items.length) {
    return `<div class="dr-detail-block"><h3>${escapeHtml(ds.ranked.label || 'Žebříček')}</h3>
      <div class="dr-chart-wrap dr-chart-tall"><canvas id="drChart" aria-label="Žebříčkový graf"></canvas></div>${note}</div>`;
  }
  if (Array.isArray(ds.series_periods) && ds.series_periods.length) {
    return `<div class="dr-detail-block"><h3>Srovnání období</h3>
      ${renderPeriodsTable(ds.series_periods)}${note}</div>`;
  }
  return '';
}

function wireViz(ds) {
  if (ds.status !== 'ready') return;
  if (Array.isArray(ds.series) && ds.series.length) drawLineChart(ds);
  else if (ds.pyramid) drawPyramid(ds);
  else if (ds.ranked && Array.isArray(ds.ranked.items) && ds.ranked.items.length) drawRankedBars(ds);
}

function renderPeriodsTable(groups) {
  const periods = groups[0]?.points.map((p) => p.period) || [];
  const head = periods.map((p) => `<th>${escapeHtml(p)}</th>`).join('');
  const rows = groups
    .map((g) => {
      const cells = g.points
        .map((p) => `<td><strong>${formatValue(p.value)}</strong></td>`)
        .join('');
      return `<tr><th class="dr-periods-rowhead">${escapeHtml(g.label)}</th>${cells}</tr>`;
    })
    .join('');
  const unit = groups[0]?.unit ? ` <span class="dr-periods-unit">(${escapeHtml(groups[0].unit)})</span>` : '';
  return `<table class="dr-periods-table"><thead><tr><th>Skupina${unit}</th>${head}</tr></thead><tbody>${rows}</tbody></table>`;
}

function reduceMotion() {
  return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function drawLineChart(ds) {
  const canvas = document.getElementById('drChart');
  if (!canvas || typeof window.Chart === 'undefined') return;
  const palette = ['#b8361e', '#0b5394', '#1f7a4d', '#a05a08', '#7c3a8d'];
  const years = ds.series[0]?.points.map((p) => p.year) || [];
  const datasets = ds.series.map((s, i) => ({
    label: s.label,
    data: s.points.map((p) => p.value),
    borderColor: palette[i % palette.length],
    backgroundColor: 'transparent',
    borderWidth: 2,
    pointRadius: 2,
    tension: 0.25,
  }));
  if (_chart) _chart.destroy();
  _chart = new window.Chart(canvas.getContext('2d'), {
    type: 'line',
    data: { labels: years, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: reduceMotion() ? false : { duration: 900 },
      interaction: { mode: 'index', intersect: false },
      plugins: { legend: { position: 'bottom' } },
      scales: { y: { beginAtZero: true, title: { display: true, text: ds.series[0]?.unit || '' } } },
    },
  });
}

function drawPyramid(ds) {
  const canvas = document.getElementById('drChart');
  if (!canvas || typeof window.Chart === 'undefined') return;
  const p = ds.pyramid;
  if (_chart) _chart.destroy();
  _chart = new window.Chart(canvas.getContext('2d'), {
    type: 'bar',
    data: {
      labels: p.age_bands,
      datasets: [
        {
          label: 'Muži',
          data: p.muzi.map((b) => -Math.abs(b.value)),
          backgroundColor: '#0b5394',
        },
        {
          label: 'Ženy',
          data: p.zeny.map((b) => b.value),
          backgroundColor: '#b8361e',
        },
      ],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      animation: reduceMotion() ? false : { duration: 800 },
      scales: {
        x: {
          stacked: true,
          ticks: { callback: (v) => Math.abs(v).toLocaleString('cs-CZ') },
          title: { display: true, text: 'Počet pracovníků' },
        },
        y: { stacked: true, title: { display: true, text: 'Věková kategorie' } },
      },
      plugins: {
        legend: { position: 'bottom' },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${Math.abs(ctx.parsed.x).toLocaleString('cs-CZ')}`,
          },
        },
      },
    },
  });
}

function renderInternational(intl) {
  if (!intl) return '';
  if (intl.available === false) {
    return `<div class="dr-detail-block"><h3>Mezinárodní srovnání</h3>
      <p class="dr-intl-none">${escapeHtml(intl.note || 'Přímé mezinárodní srovnání pro tuto sadu není k dispozici.')}</p></div>`;
  }
  if (intl.status === 'pending') {
    return `<div class="dr-detail-block"><h3>Mezinárodní srovnání</h3>
      <p class="dr-intl-pending">${escapeHtml(intl.note || 'Mezinárodní srovnání se připravuje.')}</p>
      ${intl.comparator ? `<p class="dr-intl-comparator">Plánovaný srovnávací zdroj: ${escapeHtml(intl.comparator)}</p>` : ''}</div>`;
  }
  const rows = [
    ['ČR', intl.cz],
    ['OECD průměr', intl.oecd],
    ['EU průměr', intl.eu],
  ]
    .filter(([, v]) => v != null)
    .map(
      ([label, v]) =>
        `<tr><th>${escapeHtml(label)}</th><td><strong>${formatValue(v)}</strong> ${escapeHtml(intl.unit || '')}</td></tr>`,
    )
    .join('');
  return `<div class="dr-detail-block"><h3>Mezinárodní srovnání</h3>
    <table class="dr-intl-table">${rows}</table>
    ${intl.explanation ? `<p class="dr-intl-explain">${escapeHtml(intl.explanation)}</p>` : ''}
    ${intl.source?.name ? `<p class="dr-intl-src">Zdroj srovnání: ${escapeHtml(intl.source.name)}</p>` : ''}</div>`;
}

function drawRankedBars(ds) {
  const canvas = document.getElementById('drChart');
  if (!canvas || typeof window.Chart === 'undefined') return;
  const items = ds.ranked.items;
  if (_chart) _chart.destroy();
  _chart = new window.Chart(canvas.getContext('2d'), {
    type: 'bar',
    data: {
      labels: items.map((it) => it.name),
      datasets: [
        {
          label: ds.ranked.unit || '',
          data: items.map((it) => it.value),
          backgroundColor: '#a05a08',
        },
      ],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      animation: reduceMotion() ? false : { duration: 800 },
      plugins: { legend: { display: false } },
      scales: {
        x: { beginAtZero: true, title: { display: true, text: ds.ranked.unit || '' } },
      },
    },
  });
}

/* ======================= POMOCNÉ ======================= */

function formatValue(v) {
  if (v == null) return '—';
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  if (Math.abs(n) >= 1000) return n.toLocaleString('cs-CZ', { maximumFractionDigits: 0 });
  if (Math.abs(n) >= 10) return n.toLocaleString('cs-CZ', { maximumFractionDigits: 1 });
  return n.toLocaleString('cs-CZ', { maximumFractionDigits: 2 });
}

function plural(n, one, few, many) {
  if (n === 1) return one;
  if (n >= 2 && n <= 4) return few;
  return many;
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
}

export { formatValue, plural };
