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

  // Preprocessing termů glosáře — seřazeno od nejdelších k nejkratším (kvůli překryvům)
  const glossKeys = gloss ? Object.keys(gloss.terms ?? {}).sort((a, b) => b.length - a.length) : [];

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
        const storyHtml = highlightGlossaryTerms(ind.patient_story, glossKeys);
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
function highlightGlossaryTerms(text, sortedKeys) {
  if (!text) return '';
  if (!sortedKeys || sortedKeys.length === 0) return escapeHtml(text);

  // Build single regex: word boundaries + alternation of all keys
  // Některé klíče obsahují speciální znaky (mezery, pomlčky, čísla) — escapeRegex potřeba
  const escaped = sortedKeys.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  // Bez \b protože některé termíny začínají číslem nebo mají speciální tvary
  const pattern = new RegExp(`(${escaped.join('|')})`, 'gi');
  const used = new Set();
  const parts = [];
  let lastIndex = 0;
  let m;
  while ((m = pattern.exec(text)) !== null) {
    const matched = m[1];
    const lower = matched.toLowerCase();
    // Najdi původní klíč (preserve case)
    const origKey = sortedKeys.find(k => k.toLowerCase() === lower);
    if (!origKey || used.has(origKey)) continue;
    used.add(origKey);
    // Append text before match
    parts.push(escapeHtml(text.slice(lastIndex, m.index)));
    // Append the highlighted button
    parts.push(`<button type="button" class="cq-gloss-term" data-term="${escapeHtml(origKey)}" aria-label="Vysvětlit: ${escapeHtml(origKey)}">${escapeHtml(matched)}</button>`);
    lastIndex = m.index + matched.length;
  }
  parts.push(escapeHtml(text.slice(lastIndex)));
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
