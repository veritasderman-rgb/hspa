// Diagnóza (diagnoza.html) — syntéza celého webu: každý indikátor dostane
// „spis případu“ — od symptomu (Měření + Doháněč: kdy doženeme OECD) přes
// příčiny (Model systému), léčbu (Simulátor pák), účet (Úhradová vyhláška)
// a politické sliby (Barometr) až po osobní akci (Kompas/Prevence) a další
// čtení (články). Nula nových dat — jen propojení existujících datasetů.
//
// ?id=<indicator_id> → spis; bez id / neznámé id → rozcestník indikátorů
// se spisem (řazeno sestupně podle počtu vazeb).
//
// Data: data/diagnoza-index.json (kontrakt A, build:diagnoza),
//       data/indicators.json, data/articles.json (viditelnost článků).
// Doháněč: src/dohanec-engine.js (kontrakt B) — modelová extrapolace při
// konstantním benchmarku, NE predikce. Viz PLAN-DIAGNOZA.md.

import './analytics.js';
import { renderModuleNav, renderMastheadDate, escapeHtml, renderErrorState, isArticleVisible } from './page-shared.js';
import { dohanec } from './dohanec-engine.js';

let INDEX = {};             // diagnoza-index.json → mapa <indicator_id> → vazby
let INDICATORS = new Map(); // id → indikátor z datového kontraktu
let ARTICLES = new Map();   // slug → článek z articles.json

const SIGNAL_LABELS = {
  good: 'Dobré',
  warn: 'Ke sledování',
  bad: 'Kritické',
  neutral: 'Bez benchmarku',
};
const NODE_KIND_LABELS = { lever: 'páka', flow: 'tok', outcome: 'výsledek' };
const LEVER_KIND_LABELS = { elasticity: 'odhad čísla', directional: 'jen směr' };
const BAROMETR_STAV_LABELS = {
  plni_se: 'plní se',
  bez_pohybu: 'bez pohybu',
  opacny_smer: 'opačný směr',
};

// ---------------------------------------------------------------------------
// Pure helpery (formát, počty vazeb)
// ---------------------------------------------------------------------------

/** České formátování čísla (desetinná čárka, max 2 místa). */
function czNum(v, d = 2) {
  if (v == null || !Number.isFinite(v)) return '—';
  const r = Math.round(v * 10 ** d) / 10 ** d;
  return r.toLocaleString('cs-CZ', { maximumFractionDigits: d });
}

/** Počet vazeb záznamu v indexu (pro řazení rozcestníku). */
function linkCount(entry) {
  let n = 0;
  for (const key of ['articles', 'levers', 'vyhlaska', 'barometr', 'kompas', 'prevence', 'system_nodes']) {
    n += Array.isArray(entry?.[key]) ? entry[key].length : 0;
  }
  if (entry?.region_dataset) n += 1;
  return n;
}

/** Česká plurálová koncovka pro „vazba“. */
function vazbyWord(n) {
  if (n === 1) return 'vazba';
  if (n >= 2 && n <= 4) return 'vazby';
  return 'vazeb';
}

/** Signal → CSS class (barva tokenem --good/--warn/--bad/--ink-mut). */
function signalClass(signal) {
  return ['good', 'warn', 'bad'].includes(signal) ? `dg-signal-${signal}` : 'dg-signal-neutral';
}

// ---------------------------------------------------------------------------
// Sparkline — jednoduché inline SVG z trend[] (+ aktuální hodnota)
// ---------------------------------------------------------------------------

function sparklineSvg(ind) {
  const pts = (ind.trend ?? [])
    .filter(p => Number.isFinite(p?.year) && Number.isFinite(p?.value))
    .map(p => ({ year: p.year, value: p.value }));
  if (Number.isFinite(ind.year) && Number.isFinite(ind.value) && !pts.some(p => p.year === ind.year)) {
    pts.push({ year: ind.year, value: ind.value });
  }
  pts.sort((a, b) => a.year - b.year);
  if (pts.length < 2) return '';

  const w = 280;
  const h = 64;
  const pad = 6;
  const xs = pts.map(p => p.year);
  const ys = pts.map(p => p.value);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const px = (yr) => (maxX === minX ? w / 2 : pad + ((yr - minX) / (maxX - minX)) * (w - 2 * pad));
  const py = (v) => (maxY === minY ? h / 2 : (h - pad) - ((v - minY) / (maxY - minY)) * (h - 2 * pad));

  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${px(p.year).toFixed(1)},${py(p.value).toFixed(1)}`).join(' ');
  const last = pts[pts.length - 1];
  const unit = ind.unit ? ` ${ind.unit}` : '';
  const label = `Vývoj ${minX}–${maxX}: z ${czNum(pts[0].value)}${unit} na ${czNum(last.value)}${unit}`;

  return `
    <svg class="dg-spark ${signalClass(ind.signal)}" viewBox="0 0 ${w} ${h}"
         role="img" aria-label="${escapeHtml(label)}" preserveAspectRatio="none">
      <path d="${d}" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
      <circle cx="${px(last.year).toFixed(1)}" cy="${py(last.value).toFixed(1)}" r="3.5" fill="currentColor"/>
    </svg>`;
}

// ---------------------------------------------------------------------------
// Render — spis (sekce)
// ---------------------------------------------------------------------------

/** Číslovaná sekce spisu; prázdné body se vůbec nerenderují (viz volající). */
function sectionHtml(id, num, title, bodyHtml) {
  return `
    <section class="dg-section" aria-labelledby="dg-h-${escapeHtml(id)}">
      <h2 class="dg-h" id="dg-h-${escapeHtml(id)}">
        <span class="dg-h-num" aria-hidden="true">${escapeHtml(num)}</span>${escapeHtml(title)}
      </h2>
      ${bodyHtml}
    </section>`;
}

function heroHtml(ind, doha) {
  const unit = ind.unit ? ` ${escapeHtml(ind.unit)}` : '';
  const valueTxt = ind.value != null ? `${czNum(ind.value)}${unit}` : '—';
  const yearTxt = ind.year != null ? ` (${escapeHtml(String(ind.year))})` : '';
  // Benchmark v hero: OECD, s fallbackem na EU (dle dohanec.benchmark_source)
  const benchEu = doha.benchmark_source === 'eu';
  const benchVal = benchEu ? ind.benchmark?.eu : ind.benchmark?.oecd;
  const benchName = benchEu ? 'EU průměr' : 'OECD průměr';
  const benchTxt = benchVal != null ? `<span class="dg-hero-bench">${benchName}: ${czNum(benchVal)}${unit}</span>` : '';

  const catchesUp = doha.status === 'catches_up' && doha.year != null;
  const big = catchesUp ? String(doha.year) : (doha.note || '—');
  const subNote = catchesUp && doha.note ? `<p class="dg-dohanec-note">${escapeHtml(doha.note)}</p>` : '';
  const dohanecLabel = benchEu ? 'Doháněč — kdy doženeme průměr EU?' : 'Doháněč — kdy doženeme průměr OECD?';

  return `
    <section class="ed-hero dg-hero" aria-labelledby="dgTitle">
      <p class="ed-kicker">DIAGNÓZA · SPIS PŘÍPADU</p>
      <h1 id="dgTitle">${escapeHtml(ind.name)}</h1>
      <p class="dg-hero-meta">
        <span class="dg-hero-value ${signalClass(ind.signal)}">${valueTxt}</span>
        <span class="dg-hero-year">${yearTxt}</span>
        ${benchTxt}
      </p>
      <div class="dg-dohanec">
        <p class="dg-dohanec-label">${dohanecLabel}</p>
        <p class="dg-dohanec-big${catchesUp ? '' : ' dg-dohanec-big-text'}">${escapeHtml(big)}</p>
        ${subNote}
        <p class="dg-dohanec-disclaimer" role="note">Modelová extrapolace při konstantním benchmarku, ne predikce.</p>
      </div>
    </section>`;
}

function mereniHtml(ind, entry, doha) {
  const unit = ind.unit ? ` ${escapeHtml(ind.unit)}` : '';
  const stats = [];
  stats.push(`
    <div class="dg-stat">
      <span class="dg-stat-lbl">Česko${ind.year != null ? ` · ${escapeHtml(String(ind.year))}` : ''}</span>
      <span class="dg-stat-val ${signalClass(ind.signal)}">${ind.value != null ? `${czNum(ind.value)}${unit}` : '—'}</span>
      <span class="dg-pill ${signalClass(ind.signal)}">${escapeHtml(SIGNAL_LABELS[ind.signal] ?? ind.signal ?? '—')}</span>
    </div>`);
  if (ind.benchmark?.oecd != null) {
    stats.push(`
      <div class="dg-stat">
        <span class="dg-stat-lbl">Průměr OECD</span>
        <span class="dg-stat-val">${czNum(ind.benchmark.oecd)}${unit}</span>
      </div>`);
  }
  if (ind.benchmark?.eu != null) {
    stats.push(`
      <div class="dg-stat">
        <span class="dg-stat-lbl">Průměr EU</span>
        <span class="dg-stat-val">${czNum(ind.benchmark.eu)}${unit}</span>
      </div>`);
  }
  if (doha.gap != null) {
    // gap je počítán vůči benchmarku, který Doháněč skutečně použil (OECD/EU)
    const gapBench = doha.benchmark_source === 'eu' ? 'EU' : 'OECD';
    stats.push(`
      <div class="dg-stat">
        <span class="dg-stat-lbl">Rozdíl vs. ${gapBench}</span>
        <span class="dg-stat-val">${doha.gap > 0 ? '+' : ''}${czNum(doha.gap)}${unit}</span>
      </div>`);
  }

  const spark = sparklineSvg(ind);
  const sparkHtml = spark ? `
    <div class="dg-spark-wrap">
      ${spark}
      <p class="dg-spark-caption">Trend${doha.rate != null ? ` · průměrné tempo ${doha.rate > 0 ? '+' : ''}${czNum(doha.rate)}${unit}/rok` : ''}</p>
    </div>` : '';

  const links = [`<a href="indicator.html?id=${encodeURIComponent(ind.id)}">Detail indikátoru →</a>`];
  // deep-link na mapu tohoto indikátoru — kraje.js čte hash #id=<indicator_id>
  if (entry.region_dataset) links.push(`<a href="kraje.html#id=${encodeURIComponent(ind.id)}">Krajský pohled →</a>`);

  return `
    <div class="dg-measure">
      <div class="dg-measure-grid">${stats.join('')}</div>
      ${sparkHtml}
      <p class="dg-links">${links.join(' ')}</p>
    </div>`;
}

function procHtml(nodes) {
  const cards = nodes.map(n => `
    <a class="dg-card" href="model-systemu.html">
      <span class="dg-card-kind">${escapeHtml(NODE_KIND_LABELS[n.kind] ?? n.kind ?? '')}</span>
      <span class="dg-card-title">${escapeHtml(n.label)}</span>
    </a>`).join('');
  return `
    <p class="dg-section-lead">Co v kauzální mapě systému na tento indikátor působí.</p>
    <div class="dg-cards">${cards}</div>
    <p class="dg-links"><a href="model-systemu.html">Otevřít Model systému →</a></p>`;
}

function lecbaHtml(levers) {
  const cards = levers.map(l => `
    <a class="dg-card" href="simulator.html">
      <span class="dg-card-kind">${escapeHtml(LEVER_KIND_LABELS[l.kind] ?? l.kind ?? '')}</span>
      <span class="dg-card-title">${escapeHtml(l.label)}</span>
    </a>`).join('');
  return `
    <p class="dg-section-lead">Páky, které podle citované evidence s indikátorem pohnou — vyzkoušejte si je v Simulátoru.</p>
    <div class="dg-cards">${cards}</div>
    <p class="dg-links"><a href="simulator.html">Otevřít Simulátor pák →</a></p>`;
}

function penizeHtml(segments) {
  const items = segments.map(s => `
    <li class="dg-list-item"><a href="vyhlaska.html">${escapeHtml(s.label)}</a></li>`).join('');
  return `
    <p class="dg-section-lead">Segmenty úhradové vyhlášky, jejichž posílení má na indikátor doložený efekt.</p>
    <ul class="dg-list">${items}</ul>
    <p class="dg-links"><a href="vyhlaska.html">Zahrát si na ministra →</a>
    <a href="hra.html">Celá kampaň Tři židle →</a></p>`;
}

function slibyHtml(items) {
  const rows = items.map(b => {
    const stav = b.stav ?? '';
    const tone = stav === 'plni_se' ? 'dg-signal-good' : stav === 'opacny_smer' ? 'dg-signal-bad' : 'dg-signal-neutral';
    const stavLabel = BAROMETR_STAV_LABELS[stav] ?? String(stav).replace(/_/g, ' ');
    return `
      <li class="dg-list-item dg-slib">
        <a href="barometr.html">${escapeHtml(b.titulek)}</a>
        <span class="dg-pill ${tone}">${escapeHtml(stavLabel)}</span>
      </li>`;
  }).join('');
  return `
    <p class="dg-section-lead">Politické sliby navázané na tento indikátor a jak se plní.</p>
    <ul class="dg-list">${rows}</ul>
    <p class="dg-links"><a href="barometr.html">Celý Barometr slibů →</a></p>`;
}

function jaHtml(kompas, prevence) {
  const blocks = [];
  if (kompas.length) {
    blocks.push(`
      <div class="dg-ja-block">
        <h3 class="dg-h3">Osobní kompas</h3>
        <ul class="dg-list">
          ${kompas.map(k => `<li class="dg-list-item"><a href="kompas.html">${escapeHtml(k.label)}</a></li>`).join('')}
        </ul>
      </div>`);
  }
  if (prevence.length) {
    blocks.push(`
      <div class="dg-ja-block">
        <h3 class="dg-h3">Prevence</h3>
        <ul class="dg-list">
          ${prevence.map(t => `<li class="dg-list-item"><a href="prevence.html">${escapeHtml(t.title)}</a></li>`).join('')}
        </ul>
      </div>`);
  }
  return `
    <p class="dg-section-lead">Co pro tento indikátor můžete udělat sami — osobní kroky a prevence.</p>
    <div class="dg-ja">${blocks.join('')}</div>`;
}

function cistDalHtml(articles) {
  const items = articles.map(a => `
    <li class="dg-list-item"><a href="${escapeHtml(a.slug)}">${escapeHtml(a.title)}</a></li>`).join('');
  return `
    <p class="dg-section-lead">Články redakce, které se indikátoru věnují do hloubky.</p>
    <ul class="dg-list">${items}</ul>`;
}

function renderSpis(host, id) {
  const ind = INDICATORS.get(id);
  const entry = INDEX[id];

  let doha;
  try {
    doha = dohanec(ind);
  } catch (err) {
    console.error('dohanec selhal', err);
    doha = { status: 'insufficient_data', year: null, rate: null, gap: null, note: 'Tempo dohánění nelze z dostupných dat spočítat.' };
  }

  // Viditelné články: index nese jen slug+title, viditelnost řeší articles.json
  const visibleArticles = (entry.articles ?? [])
    .map(a => ({ ref: a, art: ARTICLES.get(a.slug) }))
    .filter(({ art }) => art && isArticleVisible(art))
    .map(({ ref, art }) => ({ slug: ref.slug, title: art.title || ref.title }));

  // Sekce spisu — prázdné se vůbec nerenderují, číslování je průběžné
  const sections = [];
  let n = 0;
  const num = () => String(++n).padStart(2, '0');

  sections.push(sectionHtml('mereni', num(), 'Měření', mereniHtml(ind, entry, doha)));
  if (entry.system_nodes?.length) sections.push(sectionHtml('proc', num(), 'Proč', procHtml(entry.system_nodes)));
  if (entry.levers?.length) sections.push(sectionHtml('lecba', num(), 'Léčba', lecbaHtml(entry.levers)));
  if (entry.vyhlaska?.length) sections.push(sectionHtml('penize', num(), 'Peníze', penizeHtml(entry.vyhlaska)));
  if (entry.barometr?.length) sections.push(sectionHtml('sliby', num(), 'Sliby', slibyHtml(entry.barometr)));
  if (entry.kompas?.length || entry.prevence?.length) {
    sections.push(sectionHtml('ja', num(), 'Co můžu já', jaHtml(entry.kompas ?? [], entry.prevence ?? [])));
  }
  if (visibleArticles.length) sections.push(sectionHtml('cist-dal', num(), 'Číst dál', cistDalHtml(visibleArticles)));

  document.title = `Diagnóza: ${ind.name} · HSPA Monitor`;
  host.innerHTML = heroHtml(ind, doha) + `<div class="dg-spis">${sections.join('')}</div>`;
}

// ---------------------------------------------------------------------------
// Render — rozcestník
// ---------------------------------------------------------------------------

function renderRozcestnik(host, unknownId) {
  const entries = Object.entries(INDEX)
    .map(([id, entry]) => ({
      id,
      name: INDICATORS.get(id)?.name || id,
      count: linkCount(entry),
    }))
    .sort((a, b) => (b.count - a.count) || a.name.localeCompare(b.name, 'cs'));

  const unknownNote = unknownId
    ? `<p class="dg-unknown" role="note">Indikátor <code>${escapeHtml(unknownId)}</code> nemá založený spis — vyberte si z rozcestníku níže.</p>`
    : '';

  const rows = entries.map(e => `
    <li class="dg-index-item">
      <a class="dg-index-link" href="diagnoza.html?id=${encodeURIComponent(e.id)}">${escapeHtml(e.name)}</a>
      <span class="dg-index-count">${e.count.toLocaleString('cs-CZ')} ${vazbyWord(e.count)}</span>
    </li>`).join('');

  host.innerHTML = `
    <section class="ed-hero dg-hero" aria-labelledby="dgTitle">
      <p class="ed-kicker">DIAGNÓZA · SPISY PŘÍPADŮ</p>
      <h1 id="dgTitle">Diagnóza českého zdravotnictví</h1>
      <p class="ed-lead">
        Každý indikátor jako <strong>spis případu</strong>: od symptomu
        (měření a Doháněč — kdy při současném tempu doženeme průměr OECD)
        přes příčiny v modelu systému, léčbu pákami a peníze v úhradové
        vyhlášce až po politické sliby a to, co můžete udělat sami.
        Žádná nová čísla — jen propojení všeho, co už na webu je.
      </p>
      ${unknownNote}
    </section>
    <section class="dg-section" aria-labelledby="dg-h-index">
      <h2 class="dg-h" id="dg-h-index">Indikátory se spisem</h2>
      <p class="dg-section-lead">Řazeno podle počtu vazeb napříč moduly webu — čím víc vazeb, tím bohatší spis.</p>
      <ol class="dg-index">${rows}</ol>
    </section>`;
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

async function init() {
  renderModuleNav('indicators');
  renderMastheadDate();

  const host = document.getElementById('dgApp');
  if (!host) return;

  try {
    const [indexDoc, indsDoc, artsDoc] = await Promise.all([
      fetch('data/diagnoza-index.json').then(r => r.json()),
      fetch('data/indicators.json').then(r => r.json()),
      fetch('data/articles.json').then(r => r.json()),
    ]);
    INDEX = indexDoc.indicators ?? {};
    INDICATORS = new Map((indsDoc.indicators ?? []).map(i => [i.id, i]));
    ARTICLES = new Map((artsDoc.articles ?? []).map(a => [a.slug, a]));

    const id = new URLSearchParams(window.location.search).get('id');
    if (id && INDEX[id] && INDICATORS.has(id)) {
      renderSpis(host, id);
    } else {
      renderRozcestnik(host, id);
    }
  } catch (err) {
    host.innerHTML = renderErrorState('Diagnózu se nepodařilo načíst.', err);
    console.error(err);
  }
}

if (typeof window !== 'undefined') init();
