// Frontend modul pro kvalita-pece.html.
//
// Stránka má všechen content textově v HTML (žádný klíčový obsah se nevykresluje
// z JSON; data slouží primárně jako auditní zdroj + footer atribuce). JS modul
// jen:
//   1) Načte data/clinical-quality.json a vykreslí source-attribution footer
//   2) Vykreslí krajskou heatmapu „pending“ buněk (struktura pro Fázi 4)
//   3) Inicializuje sdílené stránkové komponenty (nav, masthead, AV animace)
//
// Pokud fetch selže (např. offline), stránka stále funguje — JS jen tiše
// přeskočí dynamickou část.

import './analytics.js';
import { renderModuleNav, renderMastheadDate, renderErrorState, escapeHtml } from './page-shared.js';
import { enhanceArticleVisuals } from './article-visuals.js';

const REGIONS = [
  'Praha', 'Středočeský', 'Jihočeský', 'Plzeňský', 'Karlovarský',
  'Ústecký', 'Liberecký', 'Královéhradecký', 'Pardubický',
  'Vysočina', 'Jihomoravský', 'Olomoucký', 'Zlínský', 'Moravskoslezský',
];

// 8 sloupců heatmapy — výběr klíčových PUK indikátorů s krajským rozpadem.
// Vazba na konkrétní indicator.id v clinical-quality.json.
// direction: 'lower_is_better' (mortality, fluorochinolony jako Watch) nebo
//            'higher_is_better' (Access penicilíny, trombolýza).
const HEATMAP_COLS = [
  { short: 'AWaRe CZ',      full: 'CZ-AWaRe Access podíl',                   indicator: 'aware_index_cz',                 direction: 'higher_is_better' },
  { short: 'AWaRe WHO',     full: 'WHO-AWaRe Access podíl',                  indicator: 'aware_index_who',                direction: 'higher_is_better' },
  { short: 'Makrolidy',     full: 'Podíl makrolidů z preskripce ATB',        indicator: 'preskripce_atb_makrolidy',       direction: 'lower_is_better' },
  { short: 'Fluoroch.',     full: 'Podíl fluorochinolonů z preskripce ATB',  indicator: 'preskripce_atb_fluorochinolony', direction: 'lower_is_better' },
  { short: 'Cefalospor.',   full: 'Podíl cefalosporinů z preskripce ATB',    indicator: 'preskripce_atb_cefalosporiny',   direction: 'lower_is_better' },
  { short: 'Chráně. AMP',   full: 'Chráněné AMP / AMP (kvalita preskripce)', indicator: 'preskripce_atb_chrane_amp_z_amp', direction: 'higher_is_better' },
  { short: 'Trombolýza',    full: 'Systémová trombolýza CMP (% využití)',    indicator: 'trombolyza_systemova_cmp',       direction: 'higher_is_better' },
  { short: 'Trombekt.',     full: 'Mechanická trombektomie CMP (% využití)', indicator: 'trombektomie_cmp',               direction: 'higher_is_better' },
];

/**
 * Vypočítá status buňky (good/warn/bad) podle odchylky od národního průměru.
 * @param {number} value
 * @param {number} national
 * @param {'higher_is_better'|'lower_is_better'} direction
 * @returns {'good'|'warn'|'bad'}
 */
function regionStatus(value, national, direction) {
  if (value == null || national == null) return 'neutral';
  const diff = value - national;
  const relDiff = diff / national;
  const better = direction === 'higher_is_better' ? relDiff > 0.05 : relDiff < -0.05;
  const worse = direction === 'higher_is_better' ? relDiff < -0.05 : relDiff > 0.05;
  if (better) return 'good';
  if (worse) return 'bad';
  return 'warn';
}

async function init() {
  if (typeof window === 'undefined') return;
  renderModuleNav('kvalita-pece');
  renderMastheadDate();

  renderHeatmapSkeleton();
  enhanceArticleVisuals();

  try {
    const [dataRes, glossRes] = await Promise.allSettled([
      fetch('data/clinical-quality.json').then(r => { if (!r.ok) throw new Error('clinical-quality.json HTTP ' + r.status); return r.json(); }),
      fetch('data/clinical-glossary.json').then(r => r.ok ? r.json() : null),
    ]);
    if (dataRes.status !== 'fulfilled') throw dataRes.reason;
    const data = dataRes.value;
    const gloss = glossRes.status === 'fulfilled' ? glossRes.value : null;
    renderSourceFooter(data);
    renderHeroChips(data);
    annotateGeneratedAt(data);
    renderHeatmapData(data);
    renderIndicatorCatalog(data, gloss);
    if (gloss) initGlossaryDrawer(gloss);
  } catch (err) {
    console.warn('clinical-quality.json failed to load:', err);
    const slot = document.getElementById('cqSourceFooter');
    if (slot) slot.innerHTML = renderErrorState('Nepodařilo se načíst zdrojovou atribuci.', err);
  }
}

function renderHeatmapSkeleton() {
  const grid = document.getElementById('cqHeatmapGrid');
  if (!grid) return;

  const cells = [];
  // Header row: corner + 8 column labels
  cells.push('<div class="cq-heatmap-cell cq-heatmap-cell-col-label" aria-hidden="true"></div>');
  for (const col of HEATMAP_COLS) {
    cells.push(`<div class="cq-heatmap-cell cq-heatmap-cell-col-label" title="${escapeHtml(col.full)}" aria-label="${escapeHtml(col.full)} — PUK">${escapeHtml(col.short)}</div>`);
  }
  // 14 region rows × 8 cells "pending" (přepíše se renderHeatmapData)
  for (const region of REGIONS) {
    cells.push(`<div class="cq-heatmap-cell cq-heatmap-cell-row-label">${escapeHtml(region)}</div>`);
    for (let i = 0; i < HEATMAP_COLS.length; i++) {
      cells.push('<div class="cq-heatmap-cell" data-status="pending" aria-label="Načítám data…">—</div>');
    }
  }

  grid.innerHTML = cells.join('');
}

/**
 * Naplní heatmap reálnými hodnotami z clinical-quality.json — by_region mapa
 * + národní hodnota → status (good/warn/bad) podle direction.
 */
function renderHeatmapData(data) {
  const grid = document.getElementById('cqHeatmapGrid');
  if (!grid) return;
  const inds = data.indicators ?? [];

  // Map indicator.id → {value_national, by_region}
  const byId = new Map(inds.map(i => [i.id, i]));

  const cells = [];
  // Header row
  cells.push('<div class="cq-heatmap-cell cq-heatmap-cell-col-label" aria-hidden="true"></div>');
  for (const col of HEATMAP_COLS) {
    const ind = byId.get(col.indicator);
    const nat = ind?.value_national;
    const natLabel = nat != null ? `${formatNum(nat)} %` : '—';
    cells.push(`<div class="cq-heatmap-cell cq-heatmap-cell-col-label" title="${escapeHtml(col.full)} · národní průměr ${natLabel}" aria-label="${escapeHtml(col.full)} — národní průměr ${natLabel}">${escapeHtml(col.short)}<br><small style="font-weight:400;color:var(--ink-mut);">⌀ ${natLabel}</small></div>`);
  }

  // Region rows
  for (const region of REGIONS) {
    cells.push(`<div class="cq-heatmap-cell cq-heatmap-cell-row-label">${escapeHtml(region)}</div>`);
    for (const col of HEATMAP_COLS) {
      const ind = byId.get(col.indicator);
      const nat = ind?.value_national;
      const byReg = ind?.by_region ?? {};
      const val = byReg[region];
      if (val == null) {
        cells.push('<div class="cq-heatmap-cell" data-status="pending" aria-label="Chybí data">—</div>');
        continue;
      }
      const status = regionStatus(val, nat, col.direction);
      const dir = col.direction === 'higher_is_better' ? 'vyšší je lepší' : 'nižší je lepší';
      cells.push(`<div class="cq-heatmap-cell" data-status="${status}" title="${escapeHtml(region)} · ${escapeHtml(col.full)}: ${formatNum(val)} % (národ ${formatNum(nat)} %, ${dir})" aria-label="${escapeHtml(region)} ${escapeHtml(col.full)}: ${formatNum(val)} %">${formatNum(val)}</div>`);
    }
  }

  grid.innerHTML = cells.join('');
}

function formatNum(v) {
  if (v == null || !Number.isFinite(v)) return '—';
  return v.toFixed(v >= 10 ? 1 : 2).replace('.', ',');
}

/**
 * Vykreslí katalog indikátorů s rozklikávacími pacientskými příběhy.
 * Každý indikátor s patient_story se zobrazí jako <details>.
 * Seskupeno podle sekce: bezpečnost / akutní kardio / CMP / AMR / onko chirurgie / onko cesta.
 */
const SECTION_LABELS = {
  safety: { kicker: 'Bezpečnost pacientů', title: 'Pooperační sepse & PSI rámec' },
  acute_cardio: { kicker: 'Akutní kardiologická péče', title: 'Akutní infarkt myokardu' },
  stroke: { kicker: 'Akutní cerebrovaskulární péče', title: 'Cévní mozková příhoda' },
  amr: { kicker: 'Antimikrobiální rezistence', title: 'Antibiotická preskripce (AWaRe)' },
  onco_surgery: { kicker: 'Komplexní onkologická chirurgie', title: 'Resekce karcinomu (5 diagnóz)' },
  onco_path: { kicker: 'Cesta onkologického pacienta', title: 'INDIKO — fáze a koordinace' },
  chronic_care: { kicker: 'Chronická péče', title: 'Adherence k dlouhodobé léčbě' },
};

function renderIndicatorCatalog(data, gloss) {
  const slot = document.getElementById('cqIndicatorCatalog');
  if (!slot) return;

  const withStory = (data.indicators ?? []).filter(i => i.patient_story);
  if (withStory.length === 0) {
    slot.innerHTML = '';
    return;
  }

  const grouped = {};
  for (const ind of withStory) {
    const sec = ind.section ?? 'other';
    if (!grouped[sec]) grouped[sec] = [];
    grouped[sec].push(ind);
  }

  // Preprocessing termů glosáře — každý dostane matchMode podle jeho povahy.
  // Zkratky (UPPERCASE, <=4 znaky) → 'exact' (case-sensitive)
  // Termíny obsahující číslice nebo speciální znaky (např. PSI-13, ATC) → 'exact'
  // Slova → 'ci' (case-insensitive — match i na začátku věty)
  const glossTerms = gloss ? Object.entries(gloss.terms ?? {}).map(([key, entry]) => {
    const explicitMode = entry.matchMode;
    let mode = explicitMode;
    if (!mode) {
      const isAllCapsShort = /^[A-ZÁ-Ž][A-Z0-9Á-Ž\-]{1,5}$/.test(key);
      const containsDigit = /\d/.test(key);
      const containsSpecial = /[\-§/.()]/.test(key) && key.length <= 8;
      mode = (isAllCapsShort || containsDigit || containsSpecial) ? 'exact' : 'ci';
    }
    return { key, matchMode: mode };
  }) : [];

  const sectionOrder = ['safety', 'acute_cardio', 'stroke', 'amr', 'onco_surgery', 'onco_path', 'chronic_care'];
  const sectionsHtml = sectionOrder
    .filter(sec => grouped[sec])
    .map(sec => {
      const label = SECTION_LABELS[sec] ?? { kicker: sec, title: sec };
      const items = grouped[sec].map(ind => {
        const val = ind.value_national;
        const unit = ind.unit ?? '';
        const valueLabel = val != null ? `<span class="cq-catalog-value">${formatNum(val)} ${escapeHtml(unit)}</span>` : '';
        const yearLabel = ind.year ? `<span class="cq-catalog-year">${escapeHtml(String(ind.year))}</span>` : '';
        const sourceLabel = ind.primary_source ? `<span class="cq-catalog-source" data-source="${escapeHtml(ind.primary_source)}">${escapeHtml(ind.primary_source.toUpperCase())}</span>` : '';
        const link = ind.source_url ? `<a class="cq-catalog-link" href="${escapeHtml(ind.source_url)}" target="_blank" rel="noopener">primární zdroj ↗</a>` : '';
        const storyHtml = highlightGlossaryTerms(ind.patient_story, glossTerms);
        return `
          <details class="cq-catalog-item">
            <summary>
              <span class="cq-catalog-name">${escapeHtml(ind.name)}</span>
              <span class="cq-catalog-meta">${valueLabel}${yearLabel}${sourceLabel}</span>
            </summary>
            <div class="cq-catalog-body">
              <p>${storyHtml}</p>
              ${link ? `<p class="cq-catalog-link-row">${link}</p>` : ''}
            </div>
          </details>`;
      }).join('');
      return `
        <div class="cq-catalog-section">
          <div class="ed-kicker">${escapeHtml(label.kicker)}</div>
          <h4 class="cq-catalog-section-h">${escapeHtml(label.title)}</h4>
          <div class="cq-catalog-list">${items}</div>
        </div>`;
    }).join('');

  slot.innerHTML = sectionsHtml;
}

/**
 * Najde v textu pacientského příběhu termíny z glosáře a obalí je do
 * <button class="cq-gloss-term" data-term="...">. Drawer se otevře po kliknutí.
 *
 * Jen první výskyt každého termínu se zvýrazní (žádný šum z opakování).
 * Word boundary matching (nezachytí "AMI" uvnitř "AMIno"). HTML-escape probíhá per-chunk.
 */
function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Najde v textu pacientského příběhu termíny z glosáře a obalí je do
 * <button class="cq-gloss-term">. Klík otevře slide-out drawer.
 *
 * Klíčové vlastnosti:
 *  - Word boundary respektující diakritiku — `(?<!\p{L})...(?!\p{L})` s `u` flagem.
 *    Žádný false-positive jako "IC" uvnitř "penicilin" nebo "praktického".
 *  - Per-term matchMode: 'exact' (case-sensitive — pro zkratky AMI/PCI/IC) nebo
 *    'ci' (case-insensitive — pro slova „sepse", „trombolýza" na začátku věty).
 *    Default 'ci' pro zpětnou kompatibilitu.
 *  - Pouze první výskyt každého termínu — žádný šum z opakování.
 *
 * @param {string} text
 * @param {Array<{key: string, matchMode: 'exact'|'ci'}>} terms
 * @returns {string} HTML escaped + buttons
 */
function highlightGlossaryTerms(text, terms) {
  if (!text) return '';
  if (!terms || terms.length === 0) return escapeHtml(text);

  // Seřaď klíče desc by length (longest first) — řeší překryvy jako "AMI" vs "AMI 30d"
  const sorted = [...terms].sort((a, b) => b.key.length - a.key.length);
  const exactKeys = sorted.filter(t => t.matchMode === 'exact').map(t => t.key);
  const ciKeys = sorted.filter(t => t.matchMode !== 'exact').map(t => t.key);

  // Build patterny s Unicode word-boundaries:
  //   (?<![\p{L}\p{N}])   = před: NIC, nebo non-letter/non-digit
  //   (?![\p{L}\p{N}])    = za: NIC, nebo non-letter/non-digit
  // `u` flag potřebný pro \p{L}.
  const buildPattern = (keys, flags) =>
    keys.length === 0 ? null
      : new RegExp(`(?<![\\p{L}\\p{N}])(${keys.map(escapeRegex).join('|')})(?![\\p{L}\\p{N}])`, flags);

  const exactPattern = buildPattern(exactKeys, 'gu');
  const ciPattern = buildPattern(ciKeys, 'giu');

  // Najdi VŠECHNY matches z obou patternů, seřaď podle pozice
  const findMatches = (pattern, mode) => {
    if (!pattern) return [];
    const out = [];
    let m;
    while ((m = pattern.exec(text)) !== null) {
      out.push({ start: m.index, end: m.index + m[1].length, matched: m[1], mode });
    }
    return out;
  };
  const allMatches = [...findMatches(exactPattern, 'exact'), ...findMatches(ciPattern, 'ci')]
    .sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start));

  // Resolve překryvy (delší vyhrává) + first-occurrence rule
  const used = new Set();
  const accepted = [];
  let cursor = 0;
  for (const m of allMatches) {
    if (m.start < cursor) continue; // překryv — předchozí match už zabral pozici
    // Najdi původní termín podle key (case-aware pro exact, case-insensitive pro ci)
    const lower = m.matched.toLowerCase();
    const origTerm = m.mode === 'exact'
      ? terms.find(t => t.matchMode === 'exact' && t.key === m.matched)
      : terms.find(t => t.matchMode !== 'exact' && t.key.toLowerCase() === lower);
    if (!origTerm) continue;
    if (used.has(origTerm.key)) continue;
    used.add(origTerm.key);
    accepted.push({ ...m, key: origTerm.key });
    cursor = m.end;
  }

  // Build output
  const parts = [];
  let last = 0;
  for (const a of accepted) {
    parts.push(escapeHtml(text.slice(last, a.start)));
    parts.push(`<button type="button" class="cq-gloss-term" data-term="${escapeHtml(a.key)}" aria-label="Vysvětlit: ${escapeHtml(a.key)}">${escapeHtml(a.matched)}</button>`);
    last = a.end;
  }
  parts.push(escapeHtml(text.slice(last)));
  return parts.join('');
}

/**
 * Inicializuje slide-out drawer pro vysvětlení glosářových termínů.
 * Drawer se vykreslí jednou na konec body. Klik na .cq-gloss-term ho otevře
 * s odpovídající definicí. Esc nebo backdrop click ho zavře.
 */
function initGlossaryDrawer(gloss) {
  if (typeof document === 'undefined') return;
  if (document.getElementById('cqGlossDrawer')) return; // idempotent

  const backdrop = document.createElement('div');
  backdrop.id = 'cqGlossBackdrop';
  backdrop.className = 'cq-gloss-backdrop';
  backdrop.setAttribute('aria-hidden', 'true');
  document.body.appendChild(backdrop);

  const drawer = document.createElement('aside');
  drawer.id = 'cqGlossDrawer';
  drawer.className = 'cq-gloss-drawer';
  drawer.setAttribute('role', 'dialog');
  drawer.setAttribute('aria-modal', 'true');
  drawer.setAttribute('aria-hidden', 'true');
  drawer.setAttribute('aria-labelledby', 'cqGlossDrawerName');
  drawer.innerHTML = `
    <header class="cq-gloss-drawer-head">
      <div class="ed-kicker">Vysvětlení pojmu</div>
      <button type="button" class="cq-gloss-drawer-close" aria-label="Zavřít vysvětlení">×</button>
    </header>
    <div class="cq-gloss-drawer-body">
      <h3 id="cqGlossDrawerName" class="cq-gloss-drawer-name"></h3>
      <p class="cq-gloss-drawer-short"></p>
      <p class="cq-gloss-drawer-context"></p>
    </div>
    <footer class="cq-gloss-drawer-foot">
      <p class="cq-gloss-drawer-note">Slovník je laický průvodce odbornými pojmy. Plné odborné definice najdete v <a href="glosar.html">Glosáři HSPA Monitoru</a>.</p>
    </footer>`;
  document.body.appendChild(drawer);

  const nameEl = drawer.querySelector('.cq-gloss-drawer-name');
  const shortEl = drawer.querySelector('.cq-gloss-drawer-short');
  const contextEl = drawer.querySelector('.cq-gloss-drawer-context');
  const closeBtn = drawer.querySelector('.cq-gloss-drawer-close');

  const open = (termKey) => {
    const entry = gloss.terms?.[termKey];
    if (!entry) return;
    nameEl.textContent = entry.name ?? termKey;
    shortEl.textContent = entry.short ?? '';
    if (entry.context) {
      contextEl.textContent = `Kontext: ${entry.context}`;
      contextEl.style.display = '';
    } else {
      contextEl.style.display = 'none';
    }
    drawer.classList.add('cq-gloss-drawer-open');
    drawer.setAttribute('aria-hidden', 'false');
    backdrop.classList.add('cq-gloss-backdrop-open');
    backdrop.setAttribute('aria-hidden', 'false');
    document.body.classList.add('cq-gloss-drawer-locked');
    setTimeout(() => closeBtn.focus(), 80);
  };
  const close = () => {
    drawer.classList.remove('cq-gloss-drawer-open');
    drawer.setAttribute('aria-hidden', 'true');
    backdrop.classList.remove('cq-gloss-backdrop-open');
    backdrop.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('cq-gloss-drawer-locked');
  };

  closeBtn.addEventListener('click', close);
  backdrop.addEventListener('click', close);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawer.classList.contains('cq-gloss-drawer-open')) close();
  });
  // Delegated click na všechny .cq-gloss-term tlačítka
  document.addEventListener('click', (e) => {
    const btn = e.target.closest?.('.cq-gloss-term');
    if (btn && btn.dataset.term) {
      e.preventDefault();
      open(btn.dataset.term);
    }
  });
}

function renderSourceFooter(data) {
  const slot = document.getElementById('cqSourceFooter');
  if (!slot) return;

  const attr = data.source_attribution ?? {};
  const sources = Object.entries(attr).map(([key, src]) => {
    const url = src.url ? `<a href="${escapeHtml(src.url)}" target="_blank" rel="noopener">${escapeHtml(src.url)}</a>` : '';
    const acq = src.data_acquisition ? `<div class="cq-source-acq"><strong>Akvizice:</strong> ${escapeHtml(src.data_acquisition)}</div>` : '';
    const license = src.license ? `<div class="cq-source-license"><strong>Licence:</strong> ${escapeHtml(src.license)}</div>` : '';
    const note = src.note ? `<p class="cq-source-note">${escapeHtml(src.note)}</p>` : '';
    return `
      <article class="cq-source-block" data-source="${escapeHtml(key)}">
        <h4>${escapeHtml(src.name ?? key)}</h4>
        <div class="cq-source-provider">${escapeHtml(src.provider ?? '')}</div>
        <div class="cq-source-url">${url}</div>
        ${acq}
        ${license}
        ${note}
      </article>`;
  }).join('');

  slot.innerHTML = `
    <h3 class="cq-source-h">Zdroje a licence</h3>
    <div class="cq-source-grid">${sources}</div>`;
}

function renderHeroChips(data) {
  const slot = document.getElementById('cqHeroChips');
  if (!slot) return;
  const keys = Object.keys(data.source_attribution ?? {});
  const labels = { puk: 'PUK (KZP)', indiko: 'INDIKO (ČVUT)', ahrq: 'AHRQ (USA)', oecd: 'OECD H@G 2025', uzis: 'ÚZIS NRH' };
  slot.innerHTML = keys.map(k => {
    const url = data.source_attribution[k]?.url ?? '#';
    return `<a class="cq-source-chip" data-source="${escapeHtml(k)}" href="${escapeHtml(url)}" target="_blank" rel="noopener">${escapeHtml(labels[k] ?? k)}</a>`;
  }).join('');
}

function annotateGeneratedAt(data) {
  const el = document.getElementById('cqGeneratedAt');
  if (!el || !data.generated_at) return;
  try {
    const d = new Date(data.generated_at);
    el.textContent = d.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' });
    el.setAttribute('datetime', data.generated_at);
  } catch {
    el.textContent = data.generated_at;
  }
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
}
