// Kalkulačka „Kdo se o nás postará v roce 2035“ (kalkulacka-pece-2035.html).
//
// Renderovací vrstva. Model je v src/ltc-engine.js (čistý, testovaný proti
// tabulkám studie), parametry v data/ltc-scenare.json (každý s citací).
// Stránka nic neposílá; nastavení se drží v URL hashi, aby šlo sdílet.

import './analytics.js';
import { renderModuleNav, renderMastheadDate, renderFooter, renderRelatedTools, escapeHtml, renderErrorState } from './page-shared.js';
import { paramsFromData, simulate, baseline, year2024, roundThousands } from './ltc-engine.js';

const state = { data: null, P: null, inputs: null, base: null, y2024: null };

const SERIES = [
  { key: 'res', label: 'Pobytové služby', cls: 'ltc-seg-res' },
  { key: 'ter', label: 'Terénní služby', cls: 'ltc-seg-ter' },
  { key: 'inf', label: 'Rodiny (neformální péče)', cls: 'ltc-seg-inf' },
];

// ── formát ────────────────────────────────────────────────────────────────

const fmtInt = new Intl.NumberFormat('cs-CZ', { maximumFractionDigits: 0 });
const fmtMld = new Intl.NumberFormat('cs-CZ', { maximumFractionDigits: 0 });

/** „88 tis.“ — výstupy nejsou přesnější než tisíce. */
function tis(n) {
  return `${fmtInt.format(Math.round(n / 1000))} tis.`;
}
function mld(n) {
  return `${fmtMld.format(Math.round(n))} mld. Kč`;
}
function pct(n) {
  return `${Math.round(n * 100)} %`;
}

// ── stav z URL ────────────────────────────────────────────────────────────

function readHash() {
  const h = new URLSearchParams(location.hash.replace(/^#/, ''));
  const s = state.data.sliders;
  const num = (k, fallback) => {
    const v = Number(h.get(k));
    return Number.isFinite(v) && h.has(k) ? v : fallback;
  };
  return {
    beds: clamp(num('luzka', s.beds.default), s.beds.min, s.beds.max),
    fte: clamp(num('pecovatele', s.fte.default), s.fte.min, s.fte.max),
    divertShare: clamp(num('teren', s.divertShare.default), s.divertShare.min, s.divertShare.max),
  };
}

function writeHash() {
  const { beds, fte, divertShare } = state.inputs;
  const h = new URLSearchParams({ luzka: String(beds), pecovatele: String(fte), teren: String(divertShare) });
  history.replaceState(null, '', `#${h}`);
}

function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }

// ── ovládání ──────────────────────────────────────────────────────────────

const SLIDERS = [
  {
    id: 'beds', key: 'beds', label: 'Lůžka v pobytových službách', unit: 'lůžek',
    desc: 'Domovy pro seniory, domovy se zvláštním režimem a ostatní pobytové služby. Dnes 76 tisíc; podle demografie by jich v roce 2035 bylo potřeba 111 tisíc.',
    format: v => `${fmtInt.format(v)} lůžek`,
  },
  {
    id: 'fte', key: 'fte', label: 'Pečovatelé v terénních službách', unit: 'úvazků',
    desc: 'Plné úvazky v pečovatelské a ambulantní službě. Dnes 34 tisíc; základní scénář počítá s 55 tisíci.',
    format: v => `${fmtInt.format(v)} úvazků`,
  },
  {
    id: 'divertShare', key: 'divertShare', label: 'Kolik lidí bez lůžka zvládne terén', unit: '%',
    desc: 'Podíl seniorů, kteří by potřebovali pobytovou péči, ale místo ní dostanou terénní. Studie: nejvýš 40 % — zbytek má příliš vysokou závislost.',
    format: v => pct(v),
  },
];

function renderSliders() {
  const host = document.getElementById('ltcSliders');
  const s = state.data.sliders;
  host.innerHTML = SLIDERS.map(sl => {
    const cfg = s[sl.key];
    const v = state.inputs[sl.key];
    return `
      <div class="ltc-lever">
        <label class="ltc-lever-label" for="ltc-${sl.id}">${escapeHtml(sl.label)}</label>
        <p class="ltc-lever-desc" id="ltc-${sl.id}-desc">${escapeHtml(sl.desc)}</p>
        <div class="ltc-lever-control">
          <input class="ltc-slider" type="range" id="ltc-${sl.id}" name="${sl.id}"
                 min="${cfg.min}" max="${cfg.max}" step="${cfg.step}" value="${v}"
                 aria-describedby="ltc-${sl.id}-desc" aria-valuetext="${escapeHtml(sl.format(v))}">
          <output class="ltc-lever-value" for="ltc-${sl.id}" id="ltc-${sl.id}-out">${escapeHtml(sl.format(v))}</output>
        </div>
        <div class="ltc-lever-scale" aria-hidden="true"><span>${escapeHtml(sl.format(cfg.min))}</span><span>${escapeHtml(sl.format(cfg.max))}</span></div>
      </div>`;
  }).join('');

  for (const sl of SLIDERS) {
    const el = document.getElementById(`ltc-${sl.id}`);
    el.addEventListener('input', () => {
      state.inputs[sl.key] = Number(el.value);
      el.setAttribute('aria-valuetext', sl.format(state.inputs[sl.key]));
      document.getElementById(`ltc-${sl.id}-out`).textContent = sl.format(state.inputs[sl.key]);
      markPreset();
      writeHash();
      renderResults();
    });
  }
}

function renderPresets() {
  const host = document.getElementById('ltcPresets');
  host.innerHTML = state.data.scenarios.map(sc => `
    <button type="button" class="ltc-preset" data-preset="${escapeHtml(sc.id)}" aria-pressed="false" title="${escapeHtml(sc.short)}">
      ${escapeHtml(sc.label)}
    </button>`).join('');
  host.querySelectorAll('[data-preset]').forEach(btn => {
    btn.addEventListener('click', () => {
      const sc = state.data.scenarios.find(x => x.id === btn.dataset.preset);
      if (!sc) return;
      state.inputs = { ...sc.inputs };
      syncSliders();
      writeHash();
      renderResults();
    });
  });
  markPreset();
}

/** Zvýrazní tlačítko scénáře, jehož vstupy právě platí (nebo žádné). */
function markPreset() {
  document.querySelectorAll('[data-preset]').forEach(btn => {
    const sc = state.data.scenarios.find(x => x.id === btn.dataset.preset);
    const on = sc && ['beds', 'fte', 'divertShare'].every(k => Math.abs(sc.inputs[k] - state.inputs[k]) < 1e-9);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.classList.toggle('is-on', Boolean(on));
  });
}

function syncSliders() {
  for (const sl of SLIDERS) {
    const el = document.getElementById(`ltc-${sl.id}`);
    if (!el) continue;
    el.value = String(state.inputs[sl.key]);
    el.setAttribute('aria-valuetext', sl.format(state.inputs[sl.key]));
    document.getElementById(`ltc-${sl.id}-out`).textContent = sl.format(state.inputs[sl.key]);
  }
  markPreset();
}

// ── výsledky ──────────────────────────────────────────────────────────────

/** Vstupy odpovídají základnímu scénáři (preset „zs“)? Jen tehdy smí shrnutí říkat „Základní scénář“. */
function isBaseInputs(inputs) {
  const zs = (state.data?.scenarios || []).find(sc => sc.id === 'zs')?.inputs;
  if (!zs) return false;
  return Math.round(inputs.beds) === Math.round(zs.beds)
    && Math.round(inputs.fte) === Math.round(zs.fte)
    && Math.abs(inputs.divertShare - zs.divertShare) < 1e-9;
}

function renderResults() {
  const r = simulate(state.inputs, state.P);
  const b = state.base;
  const y = state.y2024;

  // Shrnutí jednou větou — to nejdůležitější, co model říká.
  const summary = document.getElementById('ltcSummary');
  const short = roundThousands(r.residential.shortfall);
  const added = roundThousands(r.neformalni.added);
  const addedFte = roundThousands(r.neformalni.addedFte);
  const extra = roundThousands(r.residential.extra);
  let text;
  if (short > 0) {
    text = `Při ${fmtInt.format(r.inputs.beds)} lůžkách a ${fmtInt.format(r.inputs.fte)} pečovatelích zůstane v roce 2035 <strong>${tis(short)} seniorů</strong>, kteří by potřebovali pobytovou péči, bez místa. `
      + (roundThousands(r.terenni.diverted) > 0 ? `${tis(roundThousands(r.terenni.diverted))} z nich zvládnou terénní služby, ` : '')
      + `<strong>${tis(added)} připadne rodinám</strong> — nad rámec základního scénáře odpracují ekvivalent <strong>${tis(addedFte)} plných úvazků</strong>.`;
  } else if (extra > 0) {
    text = `Při ${fmtInt.format(r.inputs.beds)} lůžkách pohltí pobytové služby i část péče, kterou by jinak nesly terénní služby a rodiny: <strong>${tis(roundThousands(r.residential.served))} klientů</strong> ročně. Rodiny pečují o ${tis(roundThousands(r.neformalni.persons))} seniorů — o ${tis(roundThousands(b.neformalni.persons - r.neformalni.persons))} méně než v základním scénáři.`;
  } else if (isBaseInputs(r.inputs)) {
    text = `Základní scénář: všechny typy péče rostou podle demografie. V roce 2035 bude <strong>${tis(roundThousands(r.residential.served))}</strong> klientů v pobytových službách, <strong>${tis(roundThousands(r.terenni.served))}</strong> v terénních a <strong>${tis(roundThousands(r.neformalni.persons))}</strong> v péči rodin — ty odpracují ekvivalent <strong>${tis(roundThousands(r.neformalni.fte))} plných úvazků</strong>.`;
  } else {
    text = `Při ${fmtInt.format(r.inputs.beds)} lůžkách a ${fmtInt.format(r.inputs.fte)} pečovatelích pokryjí pobytové služby poptávku: v roce 2035 bude <strong>${tis(roundThousands(r.residential.served))}</strong> klientů v pobytových službách, <strong>${tis(roundThousands(r.terenni.served))}</strong> v terénních a <strong>${tis(roundThousands(r.neformalni.persons))}</strong> v péči rodin — ty odpracují ekvivalent <strong>${tis(roundThousands(r.neformalni.fte))} plných úvazků</strong>.`;
  }
  if (r.terenni.shortfall > 500) {
    text += ` Terénním službám navíc chybí pečovatelé pro <strong>${tis(roundThousands(r.terenni.shortfall))} klientů</strong> základního scénáře — i ti zůstávají na rodinách.`;
  }
  summary.innerHTML = text;

  // KPI dlaždice
  const kpis = document.getElementById('ltcKpis');
  const costDelta = r.costs.total - b.costs.total;
  kpis.innerHTML = `
    <div class="ltc-kpi${short > 0 ? ' ltc-kpi-bad' : ''}">
      <span class="ltc-kpi-value">${tis(short)}</span>
      <span class="ltc-kpi-label">seniorů bez pobytového místa</span>
      <span class="ltc-kpi-foot">z těch, kdo by ho podle demografie potřebovali (135 tis.)</span>
    </div>
    <div class="ltc-kpi${added > 0 ? ' ltc-kpi-bad' : ''}">
      <span class="ltc-kpi-value">${tis(roundThousands(r.neformalni.fte))}</span>
      <span class="ltc-kpi-label">plných úvazků odpracují rodiny</span>
      <span class="ltc-kpi-foot">${added > 0 ? `o ${tis(addedFte)} víc než v základním scénáři` : 'dnes 97 tis., základní scénář 136 tis.'}</span>
    </div>
    <div class="ltc-kpi">
      <span class="ltc-kpi-value">${mld(r.costs.total)}</span>
      <span class="ltc-kpi-label">roční náklad systému (2035)</span>
      <span class="ltc-kpi-foot">${Math.abs(costDelta) >= 1 ? `${costDelta > 0 ? '+' : '−'}${mld(Math.abs(costDelta))} proti základnímu scénáři` : 'stejně jako základní scénář'} · dnes ${mld(y.costs.total)}</span>
    </div>
    <div class="ltc-kpi">
      <span class="ltc-kpi-value">${mld(r.investmentMld)}</span>
      <span class="ltc-kpi-label">investice do nových lůžek</span>
      <span class="ltc-kpi-foot">${fmtInt.format(Math.max(0, r.inputs.beds - state.P.beds2024))} lůžek × 2 mil. Kč nad stav roku 2024</span>
    </div>`;

  // Skládané pruhy: osoby a náklady
  const rows = [
    { label: '2024', res: y.residential.served, ter: y.terenni.served, inf: y.neformalni.persons, cres: y.costs.res, cter: y.costs.ter, cinf: y.costs.inf },
    { label: '2035 · základní scénář', res: b.residential.served, ter: b.terenni.served, inf: b.neformalni.persons, cres: b.costs.res, cter: b.costs.ter, cinf: b.costs.inf },
    { label: '2035 · vaše nastavení', res: r.residential.served, ter: r.terenni.served, inf: r.neformalni.persons, cres: r.costs.res, cter: r.costs.ter, cinf: r.costs.inf, mine: true },
  ];
  renderBars('ltcBarsPersons', rows, ['res', 'ter', 'inf'], v => tis(roundThousands(v)), 'osob');
  renderBars('ltcBarsCost', rows, ['cres', 'cter', 'cinf'], v => `${fmtMld.format(Math.round(v))}`, 'mld. Kč');
  document.getElementById('ltcLegend').innerHTML = SERIES.map(s =>
    `<span class="ltc-legend-item"><i class="ltc-swatch ${s.cls}"></i>${escapeHtml(s.label)}</span>`).join('');

  renderTable(r, b, y);
}

/**
 * Tři skládané vodorovné pruhy se společnou osou. Segmenty nesou přímé popisky,
 * když se do nich vejdou; identita je v legendě i v tabulce, ne jen v barvě.
 */
function renderBars(hostId, rows, keys, fmt, unit) {
  const host = document.getElementById(hostId);
  const max = Math.max(...rows.map(r => keys.reduce((n, k) => n + r[k], 0)));
  host.innerHTML = rows.map(row => {
    const total = keys.reduce((n, k) => n + row[k], 0);
    const parts = keys.map((k, i) => {
      const w = max ? (row[k] / max) * 100 : 0;
      const label = fmt(row[k]);
      return `<span class="ltc-seg ${SERIES[i].cls}" style="width:${w.toFixed(2)}%" title="${escapeHtml(SERIES[i].label)}: ${escapeHtml(label)} ${escapeHtml(unit)}">${w >= 9 ? `<span class="ltc-seg-label">${escapeHtml(label)}</span>` : ''}</span>`;
    }).join('');
    const aria = `${row.label}: ${keys.map((k, i) => `${SERIES[i].label} ${fmt(row[k])}`).join(', ')}, celkem ${fmt(total)} ${unit}`;
    return `
      <div class="ltc-bar-row${row.mine ? ' ltc-bar-row-mine' : ''}">
        <span class="ltc-bar-label">${escapeHtml(row.label)}</span>
        <span class="ltc-bar" role="img" aria-label="${escapeHtml(aria)}">${parts}</span>
        <span class="ltc-bar-total">${escapeHtml(fmt(total))}<small> ${escapeHtml(unit)}</small></span>
      </div>`;
  }).join('');
}

function renderTable(r, b, y) {
  const t = document.getElementById('ltcTable');
  const line = (label, a, bb, c, f = v => fmtInt.format(Math.round(v))) => `
    <tr><th scope="row">${escapeHtml(label)}</th><td class="poh-num">${f(a)}</td><td class="poh-num">${f(bb)}</td><td class="poh-num">${f(c)}</td></tr>`;
  const money = v => fmtMld.format(Math.round(v * 10) / 10);
  t.innerHTML = `
    <caption class="sr-only">Výsledky modelu: rok 2024, základní scénář 2035 a vaše nastavení</caption>
    <thead><tr><th scope="col">Ukazatel</th><th scope="col" class="poh-num">2024</th><th scope="col" class="poh-num">2035 základní</th><th scope="col" class="poh-num">2035 vaše</th></tr></thead>
    <tbody>
      ${line('Lůžka v pobytových službách', state.P.beds2024, b.inputs.beds, r.inputs.beds)}
      ${line('Klienti pobytových služeb (za rok)', y.residential.served, b.residential.served, r.residential.served)}
      ${line('— z toho domovy se zvláštním režimem', y.residential.byType.dzr, b.residential.byType.dzr, r.residential.byType.dzr)}
      ${line('Senioři bez pobytového místa', 0, b.residential.shortfall, r.residential.shortfall)}
      ${line('Pečovatelé v terénu (úvazky)', state.P.fte2024, b.inputs.fte, r.inputs.fte)}
      ${line('Klienti terénních služeb', y.terenni.served, b.terenni.served, r.terenni.served)}
      ${line('— z toho místo pobytové péče', 0, b.terenni.diverted, r.terenni.diverted)}
      ${line('Osoby v péči rodin', y.neformalni.persons, b.neformalni.persons, r.neformalni.persons)}
      ${line('Pečující dny rodin (mil.)', y.neformalni.days / 1e6, b.neformalni.days / 1e6, r.neformalni.days / 1e6, v => fmtMld.format(Math.round(v * 10) / 10))}
      ${line('Ekvivalent plných úvazků rodin', y.neformalni.fte, b.neformalni.fte, r.neformalni.fte)}
      ${line('Náklad pobytových služeb (mld. Kč)', y.costs.res, b.costs.res, r.costs.res, money)}
      ${line('Náklad terénních služeb (mld. Kč)', y.costs.ter, b.costs.ter, r.costs.ter, money)}
      ${line('Příspěvek na péči v rodinách (mld. Kč)', y.costs.inf, b.costs.inf, r.costs.inf, money)}
      ${line('Roční náklad systému (mld. Kč)', y.costs.total, b.costs.total, r.costs.total, money)}
      ${line('Investice do nových lůžek (mld. Kč)', 0, b.investmentMld, r.investmentMld, money)}
    </tbody>`;
}

// ── metodika: parametry s citacemi ────────────────────────────────────────

function renderSources() {
  const host = document.getElementById('ltcSources');
  const d = state.data;
  const items = [
    ['Výchozí stav 2024 — pobytové služby', d.baseline_2024.residential],
    ['Výchozí stav 2024 — terénní služby', d.baseline_2024.terenni],
    ['Výchozí stav 2024 — neformální péče', d.baseline_2024.neformalni],
    ['Základní scénář 2035 — pobytové služby', d.base_2035.residential],
    ['Základní scénář 2035 — terénní služby', d.base_2035.terenni],
    ['Základní scénář 2035 — neformální péče', d.base_2035.neformalni],
    ['Jednotkové náklady 2035', { quote: d.base_2035.quote_unit_costs, page: d.base_2035.page_unit_costs }],
    ['Celková potřeba péče 2035', { quote: d.base_2035.quote_total_need, page: d.base_2035.page_total_need }],
    ['Kolik lidí bez lůžka zvládne terén', { quote: d.model.divert_share_quote, page: d.model.divert_share_page }],
    ['Pečující dny na úvazek', { quote: d.model.days_per_fte_quote, page: d.model.days_per_fte_page }],
    ['Cena nového lůžka', { quote: d.model.investment_quote, page: d.model.investment_page }],
  ];
  host.innerHTML = items.map(([label, it]) => `
    <li><strong>${escapeHtml(label)}</strong> — <q>${escapeHtml(it.quote)}</q> <span class="ltc-src-page">(s. ${escapeHtml(String(it.page))})</span></li>`).join('')
    + `<li><strong>Zdroj všech parametrů:</strong> <a href="${escapeHtml(d.source.url)}" target="_blank" rel="noopener">${escapeHtml(d.source.name)} ↗</a>. ${escapeHtml(d.source.caveat)} Ověřeno ${escapeHtml(d.verified_at)}.</li>`;
}

// ── start ─────────────────────────────────────────────────────────────────

async function init() {
  if (typeof window === 'undefined') return;
  renderModuleNav();
  renderMastheadDate();
  renderFooter();
  renderRelatedTools('kalkulacka-pece');
  try {
    const res = await fetch('data/ltc-scenare.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    state.data = await res.json();
  } catch (err) {
    const host = document.getElementById('ltcSummary') || document.querySelector('main');
    if (host) host.innerHTML = renderErrorState('Parametry kalkulačky se nepodařilo načíst.', err);
    return;
  }
  state.P = paramsFromData(state.data);
  state.base = baseline(state.P);
  state.y2024 = year2024(state.P);
  state.inputs = readHash();

  renderPresets();
  renderSliders();
  renderSources();
  renderResults();

  document.getElementById('ltcReset')?.addEventListener('click', (e) => {
    e.preventDefault();
    const zs = state.data.scenarios.find(x => x.id === 'zs');
    state.inputs = { ...zs.inputs };
    syncSliders();
    writeHash();
    renderResults();
  });
  window.addEventListener('hashchange', () => {
    state.inputs = readHash();
    syncSliders();
    renderResults();
  });
}

init();
