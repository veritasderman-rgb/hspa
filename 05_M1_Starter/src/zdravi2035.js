// Plní se Zdraví 2035? — strategie rozložená po kapitolách a úkolech,
// každý provázaný s indikátory datového kontraktu.
//
// Data: data/zdravi2035-plneni.json (ručně kurátorovaný přepis dokumentu
// + redakční mapování, validuje ingest/validate-zdravi2035.js)
//     + data/indicators.json (živé hodnoty — tady se nic neduplikuje,
//       stránka ukazuje stejná čísla jako zbytek webu).
//
// Poctivost na prvním místě: badge primo/proxy/chybi u každého indikátoru
// dokumentu, „procesní úkol“ u dílčích cílů bez populačního indikátoru,
// hodnoty dokumentu doslova včetně podivností (viz metodika na stránce).

import './analytics.js';
import {
  renderModuleNav,
  renderMastheadDate,
  renderFooter,
  renderRelatedTools,
  escapeHtml,
  renderErrorState,
} from './page-shared.js';

const state = { plneni: null, indicators: new Map() };

// Hodnotící, ne poziční: „nad/pod benchmarkem“ by u ukazatelů, kde je
// méně lépe (kuřáctví, mortalita), tvrdilo opak dat. Signál z kontraktu
// už směr zohledňuje — popisek ho jen nesmí překroutit.
const SIGNAL_LABEL = {
  good: 'lepší než benchmark',
  warn: 'kolem benchmarku',
  bad: 'horší než benchmark',
  neutral: 'bez porovnání s benchmarkem',
};

const MATCH_BADGE = {
  primo: '<span class="z35-badge z35-badge-primo">měříme přímo</span>',
  proxy: '<span class="z35-badge z35-badge-proxy">proxy</span>',
  chybi: '<span class="z35-badge z35-badge-chybi">neměříme</span>',
};

async function loadJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return res.json();
}

function ind(id) {
  return state.indicators.get(id) ?? null;
}

function fmtValue(i) {
  if (!i || i.value == null) return '—';
  const v = typeof i.value === 'number'
    ? i.value.toLocaleString('cs-CZ', { maximumFractionDigits: 1 })
    : String(i.value);
  return `${v} ${i.unit ?? ''}`.trim();
}

function signalDot(i) {
  if (!i) return '';
  const s = i.signal ?? 'neutral';
  return `<span class="z35-dot z35-dot-${s}" title="${escapeHtml(SIGNAL_LABEL[s] ?? s)}" aria-label="${escapeHtml(SIGNAL_LABEL[s] ?? s)}"></span>`;
}

/** Odkazový čip indikátoru kontraktu se signálem a aktuální hodnotou. */
function indChip(id) {
  const i = ind(id);
  if (!i) return '';
  return `<a class="z35-chip" href="indikator-${encodeURIComponent(id)}.html"
    title="${escapeHtml(`${i.name} — ${fmtValue(i)} (${i.year ?? '?'}), ${SIGNAL_LABEL[i.signal] ?? ''}`)}">
    ${signalDot(i)}${escapeHtml(i.name)}</a>`;
}

/** Řádek mapování: naše hodnota + rok + badge shody. */
function mappingCell(mapping) {
  const badge = MATCH_BADGE[mapping?.match] ?? '';
  if (!mapping || mapping.match === 'chybi' || !mapping.indicator_id) {
    return `<td class="z35-nase">${badge}${mapping?.note ? `<span class="z35-map-note">${escapeHtml(mapping.note)}</span>` : ''}</td>`;
  }
  const i = ind(mapping.indicator_id);
  if (!i) return `<td class="z35-nase">${badge}</td>`;
  return `<td class="z35-nase">
    ${badge}
    <a class="z35-nase-val" href="indikator-${encodeURIComponent(mapping.indicator_id)}.html">
      ${signalDot(i)}${escapeHtml(fmtValue(i))} <span class="z35-rok">(${i.year ?? '?'})</span>
    </a>
    <span class="z35-nase-name">${escapeHtml(i.name)}</span>
    ${mapping.note ? `<span class="z35-map-note">${escapeHtml(mapping.note)}</span>` : ''}
  </td>`;
}

function baselineTarget(x) {
  const b = x.baseline?.value != null ? `${x.baseline.value}${x.baseline.year ? ` (${x.baseline.year})` : ''}` : '—';
  const t = x.target_2035?.value != null ? String(x.target_2035.value) : '—';
  return { b, t };
}

// ─────────────────────────────────────────────────────────────────────────
// Rámcové indikátory
// ─────────────────────────────────────────────────────────────────────────

function renderRamec() {
  const host = document.getElementById('z35RamecTable');
  if (!host) return;
  const rows = state.plneni.ramcove_indikatory.map(r => {
    const { b, t } = baselineTarget(r);
    return `
      <tr>
        <th scope="row">${escapeHtml(r.name)}${r.note ? `<span class="z35-map-note">${escapeHtml(r.note)}</span>` : ''}</th>
        <td>${escapeHtml(b)}</td>
        <td>${escapeHtml(t)}</td>
        ${mappingCell(r.mapping)}
      </tr>`;
  }).join('');
  host.innerHTML = `
    <table class="poh-table z35-table">
      <thead><tr>
        <th scope="col">Indikátor dokumentu</th>
        <th scope="col">Výchozí stav</th>
        <th scope="col">Cíl 2035</th>
        <th scope="col">Jak to měříme my (aktuálně)</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

// ─────────────────────────────────────────────────────────────────────────
// Specifické cíle
// ─────────────────────────────────────────────────────────────────────────

function scStats(sc) {
  const dis = sc.doc_indicators ?? [];
  const covered = dis.filter(d => d.mapping?.match !== 'chybi').length;
  const dcs = sc.dilci_cile ?? [];
  const withInd = dcs.filter(d => (d.indikatory ?? []).length || (d.mereni !== 'proces' && d.note)).length;
  const proces = dcs.filter(d => d.mereni === 'proces').length;
  return { covered, total: dis.length, withInd, proces, dcTotal: dcs.length };
}

function docIndicatorRows(sc) {
  return (sc.doc_indicators ?? []).map(d => {
    const { b, t } = baselineTarget(d);
    return `
      <tr>
        <th scope="row">
          <span class="z35-level z35-level-${d.level}">${d.level === 'dopad' ? 'dopad' : 'výstup'}</span>
          ${escapeHtml(d.name)}
          ${d.note ? `<span class="z35-map-note">${escapeHtml(d.note)}</span>` : ''}
        </th>
        <td>${escapeHtml(b)}</td>
        <td>${escapeHtml(t)}</td>
        ${mappingCell(d.mapping)}
      </tr>`;
  }).join('');
}

function dilciCilHtml(d) {
  const chips = (d.indikatory ?? []).map(indChip).join('');
  const badge = d.mereni === 'proces'
    ? '<span class="z35-badge z35-badge-proces">procesní úkol</span>'
    : d.mereni === 'primo'
      ? '<span class="z35-badge z35-badge-primo">měříme přímo</span>'
      : '<span class="z35-badge z35-badge-proxy">proxy</span>';
  return `
    <li class="z35-dc">
      <div class="z35-dc-head">
        <span class="z35-dc-num">${escapeHtml(d.num)}</span>
        <span class="z35-dc-text">${escapeHtml(d.text)}</span>
        ${badge}
      </div>
      ${chips ? `<div class="z35-chip-row">${chips}</div>` : ''}
      ${d.note ? `<p class="z35-dc-note">${escapeHtml(d.note)}</p>` : ''}
    </li>`;
}

function renderCile() {
  const host = document.getElementById('z35Cile');
  if (!host) return;
  const goals = state.plneni.strategic_goals;
  const parts = [];

  for (const goal of goals) {
    parts.push(`<h3 class="z35-goal-h"><span class="z35-goal-num">${escapeHtml(goal.num)}</span> ${escapeHtml(goal.title)}</h3>`);
    for (const sc of state.plneni.cile.filter(c => c.goal === goal.id)) {
      const st = scStats(sc);
      const naklady = sc.naklady_mil_czk != null
        ? (sc.naklady_mil_czk >= 1000
          ? `${(sc.naklady_mil_czk / 1000).toLocaleString('cs-CZ', { maximumFractionDigits: 1 })} mld Kč`
          : `${sc.naklady_mil_czk.toLocaleString('cs-CZ')} mil. Kč`)
        : 'neuvedeny';

      parts.push(`
        <details class="z35-sc" id="sc-${escapeHtml(sc.sc.replace('.', '-'))}">
          <summary class="z35-sc-summary">
            <span class="z35-sc-num">${escapeHtml(sc.sc)}</span>
            <span class="z35-sc-title">${escapeHtml(sc.title)}</span>
            <span class="z35-sc-meta">
              ${st.total ? `indikátory dokumentu: sledujeme ${st.covered} z ${st.total}` : 'bez indikátorů dokumentu'}
              · úkoly: ${st.dcTotal ? `${st.dcTotal} (${st.dcTotal - st.proces} měřitelných, ${st.proces} procesních)` : 'viz poznámka'}
            </span>
          </summary>
          <div class="z35-sc-body">
            <p class="z35-sc-facts">
              <strong>Garant:</strong> ${escapeHtml(sc.garant ?? 'neuveden')} ·
              <strong>Předpokládané náklady:</strong> ${escapeHtml(naklady)}
            </p>

            ${(sc.doc_indicators ?? []).length ? `
              <h4 class="z35-h4">Čím dokument měří plnění</h4>
              <div class="poh-table-wrap">
                <table class="poh-table z35-table">
                  <thead><tr>
                    <th scope="col">Indikátor dokumentu</th>
                    <th scope="col">Výchozí stav</th>
                    <th scope="col">Cíl 2035</th>
                    <th scope="col">Jak to měříme my (aktuálně)</th>
                  </tr></thead>
                  <tbody>${docIndicatorRows(sc)}</tbody>
                </table>
              </div>` : ''}

            ${(sc.dilci_cile ?? []).length ? `
              <h4 class="z35-h4">Dílčí cíle a jejich indikátory</h4>
              <ol class="z35-dc-list">${sc.dilci_cile.map(dilciCilHtml).join('')}</ol>` : ''}
            ${sc.dilci_cile_note ? `<p class="z35-dc-note">${escapeHtml(sc.dilci_cile_note)}</p>` : ''}

            ${(sc.kontext_indikatory ?? []).length ? `
              <h4 class="z35-h4">Další kontext z našeho kontraktu</h4>
              <div class="z35-chip-row">${sc.kontext_indikatory.map(indChip).join('')}</div>` : ''}

            ${sc.poznamka ? `<p class="z35-sc-poznamka">${escapeHtml(sc.poznamka)}</p>` : ''}
          </div>
        </details>`);
    }
  }
  host.innerHTML = parts.join('');
}

// ─────────────────────────────────────────────────────────────────────────
// Souhrn v hero
// ─────────────────────────────────────────────────────────────────────────

function renderHeroStats() {
  const host = document.getElementById('z35HeroStats');
  if (!host) return;
  const cile = state.plneni.cile;
  const dis = cile.flatMap(s => s.doc_indicators ?? []);
  const covered = dis.filter(d => d.mapping?.match !== 'chybi').length;
  const dcs = cile.flatMap(s => s.dilci_cile ?? []);
  const proces = dcs.filter(d => d.mereni === 'proces').length;
  host.innerHTML = `Dokument se zavázal k <strong>${dis.length}</strong> vlastním indikátorům — náš kontrakt
    jich přímo nebo přes proxy sleduje <strong>${covered}</strong>. Ze <strong>${dcs.length}</strong> dílčích cílů
    má <strong>${dcs.length - proces}</strong> populační indikátor; <strong>${proces}</strong> jsou procesní kroky,
    které na zdraví populace vidět nebudou.`;
}

function renderDocLinks() {
  const host = document.getElementById('z35DocLinks');
  const doc = state.plneni.document;
  if (!host || !doc) return;
  host.innerHTML = `Zdroj: <a href="${escapeHtml(doc.url)}" target="_blank" rel="noopener">${escapeHtml(doc.title)}</a>
    (PDF, schváleno ${escapeHtml(doc.approved)}, ${escapeHtml(doc.approval)}) ·
    <a href="${escapeHtml(doc.web)}" target="_blank" rel="noopener">web Zdraví 2035</a> ·
    záznam v našem <a href="strategie.html?id=${encodeURIComponent(state.plneni.strategy_id)}">přehledu strategií</a>.
    Struktura přepsána ${escapeHtml(state.plneni.extracted_at)}.`;
}

// ─────────────────────────────────────────────────────────────────────────
// Start
// ─────────────────────────────────────────────────────────────────────────

async function init() {
  if (typeof window === 'undefined') return;
  renderModuleNav();
  renderMastheadDate();
  renderFooter();
  renderRelatedTools('zdravi2035');

  try {
    const [plneni, indicators] = await Promise.all([
      loadJson('data/zdravi2035-plneni.json'),
      loadJson('data/indicators.json'),
    ]);
    state.plneni = plneni;
    state.indicators = new Map(indicators.indicators.map(i => [i.id, i]));
  } catch (err) {
    const host = document.getElementById('z35Cile');
    if (host) host.innerHTML = renderErrorState('Data o plnění strategie se nepodařilo načíst.', err);
    return;
  }

  renderHeroStats();
  renderRamec();
  renderCile();
  renderDocLinks();
}

init();
