// Sdílený renderer stránek „Plní se …?" — strategie rozložená po kapitolách
// a úkolech, každý provázaný s indikátory datového kontraktu.
//
// Používají ho zdravi-2035.html (přes src/zdravi2035.js) a stránky
// plneni-*.html (přes src/plneni-page.js). Data: jeden kurátorovaný soubor
// data/*plneni*.json na strategii (validuje ingest/validate-plneni.js)
// + data/indicators.json (živé hodnoty — nic se neduplikuje, stránka
// ukazuje stejná čísla jako zbytek webu).
//
// Poctivost na prvním místě: badge primo/proxy/chybi u každého indikátoru
// dokumentu, „procesní úkol" u dílčích cílů bez populačního indikátoru,
// hodnoty dokumentu doslova včetně podivností (viz metodika na stránkách).
//
// CSS třídy zůstávají .z35-* (vznikly pro Zdraví 2035, sdílí je všechny
// stránky plnění — nepřejmenovávat, ušetří to duplicitní blok stylů).

import {
  renderModuleNav,
  renderMastheadDate,
  renderFooter,
  renderRelatedTools,
  escapeHtml,
  renderErrorState,
} from './page-shared.js';
import {
  evaluateDocIndicator,
  aggregateScore,
  VERDICT_LABEL,
  BUCKET_ORDER,
} from './plneni-eval.js';

const state = { plneni: null, indicators: new Map(), targetLabel: 'Cíl', score: null };

// Hodnotící, ne poziční: „nad/pod benchmarkem" by u ukazatelů, kde je
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
  return `${v} ${i.unit ?? ''}`.trim();
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

/**
 * Sparkline z trendu kontraktu (dekorativní — čísla jsou v textu vedle).
 * 2px linka v tlumeném inkoustu, poslední bod v signální barvě.
 */
function sparklineHtml(i) {
  const pts = [...(i.trend ?? [])];
  if (i.year != null && i.value != null && !pts.some(p => p.year === i.year)) {
    pts.push({ year: i.year, value: i.value });
  }
  const clean = pts.filter(p => p.year != null && typeof p.value === 'number')
    .sort((a, b) => a.year - b.year);
  if (clean.length < 3) return '';
  const W = 64, H = 20, PAD = 3;
  const ys = clean.map(p => p.value);
  const min = Math.min(...ys), max = Math.max(...ys);
  const spanY = max - min || 1;
  // x podle roku, ne indexu — nepravidelné řady (2013, 2015, 2022) by jinak
  // kreslily dvouletou a sedmiletou mezeru stejně široké a lhaly o tempu.
  const minYear = clean[0].year, maxYear = clean[clean.length - 1].year;
  const spanX = maxYear - minYear || 1;
  const x = (yr) => PAD + ((yr - minYear) / spanX) * (W - 2 * PAD);
  const y = (v) => H - PAD - ((v - min) / spanY) * (H - 2 * PAD);
  const path = clean.map(p => `${x(p.year).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const last = clean[clean.length - 1];
  const sig = i.signal ?? 'neutral';
  return `<svg class="z35-spark" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true">
    <polyline points="${path}" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
    <circle class="z35-spark-dot z35-spark-${sig}" cx="${x(last.year).toFixed(1)}" cy="${y(last.value).toFixed(1)}" r="2.6"/>
  </svg>`;
}

/** Textový verdikt — vždy slova, nikdy jen barva (CVD). */
function verdictChip(bucket, traj) {
  const label = VERDICT_LABEL[bucket] ?? bucket;
  const pct = traj?.progressPct;
  const extra = bucket === 'na-ceste' && pct != null ? ` (${pct} % cesty)`
    : bucket === 'opacny-smer' && pct != null ? '' : '';
  return `<span class="z35-verdict z35-verdict-${bucket}">${escapeHtml(label + extra)}</span>`;
}

/**
 * Trajektorie výchozí stav → cíl: kde jsme dnes. Jen primo + číselně
 * srovnatelné; pozice ≠ predikce. Směr „méně je cíl" řeší normalizace
 * v computeTrajectory (cíl je vždy vpravo).
 */
function meterHtml(traj, di) {
  if (!traj || traj.progressPct == null) return '';
  const p = Math.max(0, Math.min(1, traj.progressPct / 100));
  const cls = traj.status === 'opacny-smer' ? 'bad' : traj.status === 'beze-zmeny' ? 'warn' : 'good';
  const b = di.baseline?.value ?? '—';
  const tg = (di.target_2035 ?? di.target)?.value ?? '—';
  return `<span class="z35-meter" role="img" aria-label="${escapeHtml(`Pozice mezi výchozím stavem (${b}) a cílem (${tg}): ${traj.progressPct} % cesty`)}">
    <span class="z35-meter-track"><span class="z35-meter-fill z35-meter-${cls}" style="width:${(p * 100).toFixed(0)}%"></span></span>
    <span class="z35-meter-ends" aria-hidden="true"><span>${escapeHtml(String(b))}</span><span>cíl ${escapeHtml(String(tg))}</span></span>
  </span>`;
}

/** Řádek mapování: naše hodnota + trend + verdikt + badge shody. */
function mappingCell(mapping, di) {
  const badge = MATCH_BADGE[mapping?.match] ?? '';
  if (!mapping || mapping.match === 'chybi' || !mapping.indicator_id) {
    return `<td class="z35-nase">${badge}${mapping?.note ? `<span class="z35-map-note">${escapeHtml(mapping.note)}</span>` : ''}</td>`;
  }
  const i = ind(mapping.indicator_id);
  if (!i) return `<td class="z35-nase">${badge}</td>`;
  // Vyhodnocení: trajektorie jen u primo s číselně srovnatelnými hodnotami;
  // proxy dostane trend vlastního indikátoru, ale nikdy pozici vůči cíli.
  let verdictHtml = '';
  let meter = '';
  if (di) {
    const ev = evaluateDocIndicator(di, i);
    if (ev.trajectory && ev.trajectory.progressPct != null && ev.bucket !== 'sledujeme') {
      meter = meterHtml(ev.trajectory, di);
      verdictHtml = verdictChip(ev.bucket, ev.trajectory);
    } else if (mapping.match === 'primo' && ev.trajectory?.reason) {
      verdictHtml = `<span class="z35-verdict z35-verdict-nelze" title="${escapeHtml(ev.trajectory.reason)}">${escapeHtml(VERDICT_LABEL.nelze)}</span>`;
    }
  }
  return `<td class="z35-nase">
    <span class="z35-nase-top">${badge}${verdictHtml}</span>
    <a class="z35-nase-val" href="indikator-${encodeURIComponent(mapping.indicator_id)}.html">
      ${signalDot(i)}${escapeHtml(fmtValue(i))} <span class="z35-rok">(${i.year ?? '?'})</span>${sparklineHtml(i)}
    </a>
    <span class="z35-nase-name">${escapeHtml(i.name)}</span>
    ${meter}
    ${mapping.note ? `<span class="z35-map-note">${escapeHtml(mapping.note)}</span>` : ''}
  </td>`;
}

// Zdraví 2035 používá klíč target_2035, novější soubory obecné target
// (s volitelným rokem). Čteme obojí, ať jde o jeden renderer.
function targetOf(x) {
  return x.target_2035 ?? x.target ?? null;
}

function baselineTarget(x) {
  const b = x.baseline?.value != null ? `${x.baseline.value}${x.baseline.year ? ` (${x.baseline.year})` : ''}` : '—';
  const tg = targetOf(x);
  const t = tg?.value != null ? `${tg.value}${tg.year && !state.targetLabelHasYear ? ` (${tg.year})` : ''}` : '—';
  return { b, t };
}

// ─────────────────────────────────────────────────────────────────────────
// Rámcové indikátory
// ─────────────────────────────────────────────────────────────────────────

function tableHead() {
  return `<thead><tr>
    <th scope="col">Indikátor dokumentu</th>
    <th scope="col">Výchozí stav</th>
    <th scope="col">${escapeHtml(state.targetLabel)}</th>
    <th scope="col">Jak to měříme my (aktuálně)</th>
  </tr></thead>`;
}

function renderRamec() {
  const host = document.getElementById('z35RamecTable');
  if (!host) return;
  const rams = state.plneni.ramcove_indikatory ?? [];
  if (!rams.length) { host.hidden = true; return; }
  const rows = rams.map(r => {
    const { b, t } = baselineTarget(r);
    return `
      <tr>
        <th scope="row">${escapeHtml(r.name)}${r.note ? `<span class="z35-map-note">${escapeHtml(r.note)}</span>` : ''}</th>
        <td>${escapeHtml(b)}</td>
        <td>${escapeHtml(t)}</td>
        ${mappingCell(r.mapping, r)}
      </tr>`;
  }).join('');
  host.innerHTML = `
    <table class="poh-table z35-table">
      ${tableHead()}
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
    const levelBadge = d.level
      ? `<span class="z35-level z35-level-${d.level}">${d.level === 'dopad' ? 'dopad' : 'výstup'}</span>`
      : '';
    return `
      <tr>
        <th scope="row">
          ${levelBadge}
          ${escapeHtml(d.name)}
          ${d.note ? `<span class="z35-map-note">${escapeHtml(d.note)}</span>` : ''}
        </th>
        <td>${escapeHtml(b)}</td>
        <td>${escapeHtml(t)}</td>
        ${mappingCell(d.mapping, d)}
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
      ${d.kriterium ? `<p class="z35-dc-note"><strong>Kritérium plnění dle dokumentu:</strong> ${escapeHtml(d.kriterium)}</p>` : ''}
      ${d.gestor || d.termin ? `<p class="z35-dc-note">${d.gestor ? `<strong>Gestor:</strong> ${escapeHtml(d.gestor)}` : ''}${d.gestor && d.termin ? ' · ' : ''}${d.termin ? `<strong>Termín:</strong> ${escapeHtml(d.termin)}` : ''}</p>` : ''}
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
        : null;
      const facts = [];
      if (sc.garant) facts.push(`<strong>Garant:</strong> ${escapeHtml(sc.garant)}`);
      if (naklady) facts.push(`<strong>Předpokládané náklady:</strong> ${escapeHtml(naklady)}`);

      const local = state.score?.perSc.get(sc.sc);
      const miniChips = local ? BUCKET_ORDER
        .filter(b => local[b] > 0 && b !== 'sledujeme' && b !== 'nemerime')
        .map(b => `<span class="z35-mini z35-mini-${BUCKET_META[b].cls}">${local[b]} ${VERDICT_LABEL[b === 'splneno' ? 'splneno' : b]}</span>`)
        .join('') : '';
      parts.push(`
        <details class="z35-sc" id="sc-${escapeHtml(String(sc.sc).replaceAll('.', '-'))}">
          <summary class="z35-sc-summary">
            <span class="z35-sc-num">${escapeHtml(String(sc.sc))}</span>
            <span class="z35-sc-title">${escapeHtml(sc.title)}</span>
            <span class="z35-sc-meta">
              ${miniChips}
              ${st.total ? `indikátory dokumentu: sledujeme ${st.covered} z ${st.total}` : 'bez indikátorů dokumentu'}
              · úkoly: ${st.dcTotal ? `${st.dcTotal} (${st.dcTotal - st.proces} měřitelných, ${st.proces} procesních)` : 'viz poznámka'}
            </span>
          </summary>
          <div class="z35-sc-body">
            ${facts.length ? `<p class="z35-sc-facts">${facts.join(' · ')}</p>` : ''}

            ${(sc.doc_indicators ?? []).length ? `
              <h4 class="z35-h4">Čím dokument měří plnění</h4>
              <div class="poh-table-wrap">
                <table class="poh-table z35-table">
                  ${tableHead()}
                  <tbody>${docIndicatorRows(sc)}</tbody>
                </table>
              </div>` : ''}

            ${(sc.dilci_cile ?? []).length ? `
              <h4 class="z35-h4">Dílčí cíle a jejich indikátory</h4>
              <ol class="z35-dc-list">${sc.dilci_cile.map(dilciCilHtml).join('')}</ol>` : ''}
            ${sc.dilci_cile_note ? `<p class="z35-dc-note">${escapeHtml(sc.dilci_cile_note)}</p>` : ''}

            ${sc.hodnoceni ? `
              <h4 class="z35-h4">Oficiální hodnocení plnění</h4>
              <blockquote class="z35-hodnoceni">
                <p>${escapeHtml(sc.hodnoceni.text)}</p>
                <footer>${escapeHtml(sc.hodnoceni.zdroj)}</footer>
              </blockquote>` : ''}

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
// Scoreboard — vyhodnocení v kostce
// ─────────────────────────────────────────────────────────────────────────

// Barvy nesou stav, ale nikdy samy: každý segment i řádek legendy má text
// s počtem (statusové barvy webu jsou pro barvoslepé čtenáře nerozlišitelné,
// „na cestě" proto navíc nese šrafuru jako sekundární kanál).
const BUCKET_META = {
  splneno: { cls: 'splneno', legend: 'cíl už splněn' },
  'na-ceste': { cls: 'na-ceste', legend: 'míří k cíli' },
  'beze-zmeny': { cls: 'beze-zmeny', legend: 'zatím beze změny' },
  'opacny-smer': { cls: 'opacny-smer', legend: 'vzdaluje se od cíle' },
  sledujeme: { cls: 'sledujeme', legend: 'sledujeme, ale číselně nesrovnatelné (proxy, složené hodnoty)' },
  nemerime: { cls: 'nemerime', legend: 'nikdo veřejně neměří' },
};

function stackHtml(counts, total, ariaPrefix) {
  if (!total) return '';
  const segs = BUCKET_ORDER.filter(b => counts[b] > 0).map(b => {
    const w = (counts[b] / total) * 100;
    return `<span class="z35-seg z35-seg-${BUCKET_META[b].cls}" style="flex-grow:${counts[b]}" title="${escapeHtml(`${BUCKET_META[b].legend}: ${counts[b]}`)}">${w >= 7 ? counts[b] : ''}</span>`;
  }).join('');
  const desc = BUCKET_ORDER.filter(b => counts[b] > 0).map(b => `${counts[b]} ${BUCKET_META[b].legend}`).join(', ');
  return `<div class="z35-stack" role="img" aria-label="${escapeHtml(`${ariaPrefix}: ${desc}`)}">${segs}</div>`;
}

function renderScoreboard() {
  const host = document.getElementById('z35Score');
  if (!host || !state.score) return;
  const { counts, total } = state.score;
  if (!total) {
    // dokument nemá vlastní indikátory (např. AP NAP měří aktivity kritérii)
    const box = host.closest('.z35-scorebox');
    if (box) box.hidden = true; else host.hidden = true;
    return;
  }
  const measurable = counts.splneno + counts['na-ceste'] + counts['beze-zmeny'] + counts['opacny-smer'];
  const positive = counts.splneno + counts['na-ceste'];

  const legend = BUCKET_ORDER.filter(b => counts[b] > 0).map(b => `
    <li><span class="z35-seg-swatch z35-seg-${BUCKET_META[b].cls}" aria-hidden="true"></span>
      <strong>${counts[b]}</strong> ${escapeHtml(BUCKET_META[b].legend)}</li>`).join('');

  // Dílčí cíle: měřitelné vs. procesní (druhý, tenčí pruh)
  const dcs = (state.plneni.cile ?? []).flatMap(c => c.dilci_cile ?? []);
  const proces = dcs.filter(d => d.mereni === 'proces').length;
  const dcStack = dcs.length ? `
    <p class="z35-score-sub">…a z <strong>${dcs.length}</strong> dílčích cílů má <strong>${dcs.length - proces}</strong> populační indikátor;
    <strong>${proces}</strong> jsou procesní kroky, jejichž splnění na zdraví populace vidět nebude.</p>
    <div class="z35-stack z35-stack-thin" role="img" aria-label="${escapeHtml(`Dílčí cíle: ${dcs.length - proces} s populačním indikátorem, ${proces} procesních`)}">
      <span class="z35-seg z35-seg-mereni" style="flex-grow:${dcs.length - proces}" title="s populačním indikátorem"></span>
      <span class="z35-seg z35-seg-proces" style="flex-grow:${proces}" title="procesní"></span>
    </div>
    <ul class="z35-stack-legend"><li><span class="z35-seg-swatch z35-seg-mereni" aria-hidden="true"></span><strong>${dcs.length - proces}</strong> s populačním indikátorem</li>
    <li><span class="z35-seg-swatch z35-seg-proces" aria-hidden="true"></span><strong>${proces}</strong> procesních</li></ul>` : '';

  host.innerHTML = `
    <p class="z35-score-lead">Z <strong>${total}</strong> indikátorů, kterými dokument sám měří své plnění,
    umíme <strong>${measurable}</strong> číselně vyhodnotit proti jeho výchozím stavům a cílům —
    a <strong>${positive}</strong> z nich k cíli míří, nebo ho už splnilo.
    <span class="z35-score-note">Pozice na trajektorii ≠ predikce: říká, kde jsme dnes, ne jestli tempo do cílového roku vydrží.</span></p>
    ${stackHtml(counts, total, 'Vyhodnocení indikátorů dokumentu')}
    <ul class="z35-stack-legend">${legend}</ul>
    ${dcStack}`;
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
  const indPart = dis.length
    ? `Dokument se zavázal k <strong>${dis.length}</strong> vlastním indikátorům — náš kontrakt
      jich přímo nebo přes proxy sleduje <strong>${covered}</strong>. `
    : '';
  host.innerHTML = `${indPart}Ze <strong>${dcs.length}</strong> dílčích cílů
    má <strong>${dcs.length - proces}</strong> populační indikátor; <strong>${proces}</strong> jsou procesní kroky,
    které na zdraví populace vidět nebudou.`;
}

function docLinkHtml(doc) {
  if (!doc) return '';
  const meta = [];
  if (doc.approved) meta.push(`schváleno ${doc.approved}`);
  if (doc.approval) meta.push(doc.approval);
  return `<a href="${escapeHtml(doc.url)}" target="_blank" rel="noopener">${escapeHtml(doc.title)}</a>
    (PDF${meta.length ? ', ' + escapeHtml(meta.join(', ')) : ''})`;
}

function renderDocLinks() {
  const host = document.getElementById('z35DocLinks');
  const doc = state.plneni.document;
  if (!host || !doc) return;
  const parts = [`Zdroj: ${docLinkHtml(doc)}`];
  if (state.plneni.document_b) parts.push(docLinkHtml(state.plneni.document_b));
  if (doc.web) parts.push(`<a href="${escapeHtml(doc.web)}" target="_blank" rel="noopener">web dokumentu</a>`);
  parts.push(`záznam v našem <a href="strategie.html?id=${encodeURIComponent(state.plneni.strategy_id)}">přehledu strategií</a>`);
  host.innerHTML = `${parts.join(' · ')}. Struktura přepsána ${escapeHtml(state.plneni.extracted_at)}.`;
}

// ─────────────────────────────────────────────────────────────────────────
// Start
// ─────────────────────────────────────────────────────────────────────────

/**
 * @param {object} cfg
 * @param {string} cfg.dataPath   cesta k plneni JSON (např. 'data/plneni-onko-2030.json')
 * @param {string} cfg.toolsKey   klíč pro renderRelatedTools
 * @param {string} cfg.targetLabel popisek cílového sloupce (např. 'Cíl 2030')
 */
export async function initPlneni(cfg) {
  if (typeof window === 'undefined') return;
  renderModuleNav();
  renderMastheadDate();
  renderFooter();
  renderRelatedTools(cfg.toolsKey ?? 'zdravi2035');
  state.targetLabel = cfg.targetLabel ?? 'Cíl';

  try {
    const [plneni, indicators] = await Promise.all([
      loadJson(cfg.dataPath),
      loadJson('data/indicators.json'),
    ]);
    state.plneni = plneni;
    state.indicators = new Map(indicators.indicators.map(i => [i.id, i]));
    state.score = aggregateScore(plneni, state.indicators);
  } catch (err) {
    const host = document.getElementById('z35Cile');
    if (host) host.innerHTML = renderErrorState('Data o plnění strategie se nepodařilo načíst.', err);
    return;
  }

  renderHeroStats();
  renderScoreboard();
  renderRamec();
  renderCile();
  renderDocLinks();
}
