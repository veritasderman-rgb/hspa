// Srovnávač pojišťoven — kraj × ZP (balíček P3.2, PLAN-SROVNAVAC-POJISTOVEN.md § 0.3, § 2.4).
//
// Samostatný modul pro kontejner #zpKraje (modul 3). Líně načte
// data/pojistenci-d5-zp.json (až když je kontejner u viewportu) a vyrenderuje:
//   (a) dlaždicovou mapu krajů (src/cz-map.js) — podíl vybrané pojišťovny mezi
//       pojištěnci kraje, jedna sekvenční modrá rampa (pickColorNeutral),
//   (b) vedle ní „Těžiště kmene“ — seřazené bary: kolik % kmene pojišťovny žije
//       v kterém kraji (rankedBars ze zp-viz.js),
//   (c) <details> s vývojem podílu v kraji 2010–2025 (tabulka).
// Pojišťovna = „Moje pojišťovna“ (main[data-moje-zp], event zp:moje-change);
// bez výběru se ukáže VZP ČR + věta, ať si uživatel vybere nahoře. Lokální chipy
// přepínají jen tuto sekci (výběr nahoře se jimi nemění).
//
// Čisté funkce (testované bez DOM): krajLabel, nationalTotals, buildKrajDataset,
// sequentialRel, tezisteItems, evolutionRows, krajReadout. DOM část je dole.

import { escapeHtml, formatNumberCz } from './page-shared.js';
import { renderCzMap, pickColorNeutral } from './cz-map.js';
import { rankedBars, fmtValue, isNum } from './zp-viz.js';
import { ZP, ZP_BY_KOD, onThemeChange } from './zp-palette.js';
import { initZpInteract, MOJE_EVENT } from './zp-interact.js';

export const DATA_URL = 'data/pojistenci-d5-zp.json';
export const DEFAULT_KOD = '111';
export const SOURCE_TEXT = 'Zdroj: ÚZIS, Centrální registr pojištěnců (OIS 11-47), stav k 1. 1. daného roku. '
  + 'Podíl = pojištěnci vybrané pojišťovny / všichni pojištěnci v kraji; těžiště = rozložení kmene pojišťovny mezi kraji. '
  + 'Řazeno podle hodnoty, nejde o hodnocení pojišťoven.';
/** Rozsah „relativní odchylky“ pro pickColorNeutral: 2 % = první modrý krok, 14 % = nejtmavší krok, na němž pořád čte inkoust. */
export const RAMP_REL_MIN = 2;
export const RAMP_REL_MAX = 14;

const esc = escapeHtml;
const fmt = (v, dec = 1) => fmtValue(v, dec);
/** Podíl v %: pod 1 % na dvě desetinná místa (0,04 %), jinak na jedno. */
export function fmtShare(v) {
  if (!isNum(v)) return 'nedohledáno';
  return fmt(v, Math.abs(v) < 1 ? 2 : 1);
}
/** Text na dlaždici mapy: <0,1 pro zanedbatelný podíl, jinak jedno desetinné místo. */
export function tileValue(v) {
  if (!isNum(v)) return '—';
  if (v > 0 && v < 0.05) return '<0,1';
  return fmt(v, 1);
}
const fmtInt = (v) => (isNum(v) ? formatNumberCz(v, { minDecimals: 0, maxDecimals: 0 }) : 'nedohledáno');

// ---------------------------------------------------------------------------
// Čisté funkce
// ---------------------------------------------------------------------------

/** „Moravskoslezský“ → „Moravskoslezský kraj“, „Vysočina“ → „Kraj Vysočina“, „Praha“ beze změny. */
export function krajLabel(name) {
  const n = String(name ?? '').trim();
  if (!n) return '';
  if (n === 'Praha') return n;
  if (n === 'Vysočina') return 'Kraj Vysočina';
  return /kraj$/i.test(n) ? n : `${n} kraj`;
}

/** Poslední rok v datasetu (nejvyšší prvek d5.years). */
export function lastYear(d5) {
  const ys = (d5 && Array.isArray(d5.years) ? d5.years : []).filter(isNum);
  return ys.length ? Math.max(...ys) : null;
}

function cellOf(d5, code, rok) {
  const c = d5 && d5.data && d5.data[code] && d5.data[code][String(rok)];
  return c && typeof c === 'object' ? c : null;
}

function roundTo(v, dec) {
  const k = 10 ** dec;
  return Math.round(v * k) / k;
}

/**
 * Součty za ČR pro jednu pojišťovnu a rok.
 * @returns {{count:number, total:number, share:number|null}}
 */
export function nationalTotals(d5, kod, rok) {
  let count = 0;
  let total = 0;
  for (const k of (d5 && d5.krajs) || []) {
    const c = cellOf(d5, k.code, rok);
    if (!c || !isNum(c.total) || !isNum(c.counts && c.counts[kod])) continue;
    count += c.counts[kod];
    total += c.total;
  }
  return { count, total, share: total > 0 ? (count / total) * 100 : null };
}

/**
 * Dataset pro renderCzMap: podíl pojišťovny `kod` mezi pojištěnci kraje v roce `rok`.
 * Kraj bez dat se vynechá (cz-map ho nakreslí jako prázdnou dlaždici).
 * direction = 'context_dependent': podíl pojišťovny není ani dobrý, ani špatný.
 */
export function buildKrajDataset(d5, kod, rok) {
  const regions = [];
  for (const k of (d5 && d5.krajs) || []) {
    const c = cellOf(d5, k.code, rok);
    if (!c || !isNum(c.total) || c.total <= 0 || !isNum(c.counts && c.counts[kod])) continue;
    regions.push({
      code: k.code,
      name: k.name,
      value: roundTo((c.counts[kod] / c.total) * 100, 2),
      count: c.counts[kod],
      total: c.total,
    });
  }
  const nat = nationalTotals(d5, kod, rok);
  return {
    regions,
    country_avg: nat.share == null ? 0 : roundTo(nat.share, 2),
    direction: 'context_dependent',
    unit: '% pojištěnců kraje',
    kod,
    rok,
  };
}

/**
 * Sekvenční rampa: nejnižší podíl → první modrý krok, nejvyšší → nejtmavší krok.
 * Vrací „relativní odchylku“ pro pickColorNeutral (kladná = modrý gradient).
 */
export function sequentialRel(value, min, max) {
  if (!isNum(value) || !isNum(min) || !isNum(max) || max <= min) return RAMP_REL_MIN;
  const t = Math.min(1, Math.max(0, (value - min) / (max - min)));
  return RAMP_REL_MIN + (RAMP_REL_MAX - RAMP_REL_MIN) * t;
}

/** Hook fillForRegion pro cz-map: barva dlaždice z pickColorNeutral přes sekvenční rampu. */
export function makeFill(dataset) {
  const vals = dataset.regions.map((r) => r.value).filter(isNum);
  const min = vals.length ? Math.min(...vals) : 0;
  const max = vals.length ? Math.max(...vals) : 0;
  return (region, _rel, dark) => pickColorNeutral(sequentialRel(region.value, min, max), dark);
}

/** Kraj s nejvyšším podílem (pro pomocné věty a testy). */
export function topRegion(dataset) {
  return dataset.regions.reduce((a, r) => (a == null || r.value > a.value ? r : a), null);
}

/**
 * Položky pro rankedBars: kolik % kmene pojišťovny `kod` žije v každém kraji.
 * Seřazeno sestupně; label = název kraje, key = kód kraje (data-key).
 */
export function tezisteItems(d5, kod, rok, zdroj = 'ÚZIS, CRP (OIS 11-47)') {
  const rows = [];
  let kmen = 0;
  let celkem = 0;
  for (const k of (d5 && d5.krajs) || []) {
    const c = cellOf(d5, k.code, rok);
    if (!c || !isNum(c.total) || !isNum(c.counts && c.counts[kod])) continue;
    rows.push({ k, count: c.counts[kod], total: c.total });
    kmen += c.counts[kod];
    celkem += c.total;
  }
  if (!(kmen > 0)) return [];
  return rows
    .map(({ k, count, total }) => {
      const value = roundTo((count / kmen) * 100, 2);
      const popShare = celkem > 0 ? (total / celkem) * 100 : null;
      const zkr = (ZP_BY_KOD[kod] && ZP_BY_KOD[kod].zkratka) || kod;
      return {
        key: k.code,
        label: k.name,
        value,
        rok,
        tip: `${krajLabel(k.name)}: ${fmtShare(value)} % kmene ${zkr} · ${fmtInt(count)} pojištěnců`
          + `${popShare == null ? '' : ` · kraj tvoří ${fmtShare(popShare)} % pojištěnců ČR`} · ${rok} · ${zdroj}`,
      };
    })
    .sort((a, b) => b.value - a.value);
}

/**
 * Řádky pro tabulku vývoje podílu v kraji: pro každý kraj podíl `kod` v každém roce
 * a změna první → poslední rok v procentních bodech.
 */
export function evolutionRows(d5, kod) {
  const years = (d5 && Array.isArray(d5.years) ? d5.years : []).slice();
  return ((d5 && d5.krajs) || []).map((k) => {
    const values = years.map((y) => {
      const c = cellOf(d5, k.code, y);
      if (!c || !isNum(c.total) || c.total <= 0 || !isNum(c.counts && c.counts[kod])) return null;
      return roundTo((c.counts[kod] / c.total) * 100, 2);
    });
    const first = values.find(isNum);
    const last = [...values].reverse().find(isNum);
    return {
      code: k.code,
      name: k.name,
      values,
      delta: isNum(first) && isNum(last) ? roundTo(last - first, 2) : null,
    };
  });
}

/** Věta pod mapou při najetí na kraj: „Kraj · podíl ZP · počet pojištěnců“. */
export function krajReadout(region, zkratka, avg) {
  if (!region) return '';
  const diff = isNum(avg) ? region.value - avg : null;
  const diffTxt = diff == null ? '' : ` (${diff >= 0 ? '+' : '−'}${fmt(Math.abs(diff), 1)} p. b. oproti ČR)`;
  return `${krajLabel(region.name)} · ${zkratka}: ${fmtShare(region.value)} % pojištěnců kraje${diffTxt} · ${fmtInt(region.count)} pojištěnců`;
}

/** Věta o tom, která pojišťovna se zobrazuje a proč. */
export function stateSentence({ kod, moje, local }) {
  const zkr = (ZP_BY_KOD[kod] && ZP_BY_KOD[kod].zkratka) || kod;
  if (local && local === kod && local !== moje) return `Zobrazena je ${zkr} (přepnuto jen v této sekci).`;
  if (moje && moje === kod) return `Zobrazena je vaše pojišťovna: ${zkr}. Jinou můžete přepnout jen v této sekci.`;
  return `Zobrazena je ${zkr} (výchozí). Vyberte svou pojišťovnu nahoře, nebo ji přepněte jen tady.`;
}

/** Pojišťovna zobrazená v sekci: lokální volba > Moje pojišťovna > výchozí VZP. */
export function resolveKod({ local, moje }, valid = ZP.map((z) => z.kod)) {
  if (local && valid.includes(local)) return local;
  if (moje && valid.includes(moje)) return moje;
  return DEFAULT_KOD;
}

// ---------------------------------------------------------------------------
// HTML (čisté stringy)
// ---------------------------------------------------------------------------

export function chipsHtml(kod) {
  return ZP.map((z) => `<button type="button" class="zpk-chip" data-kod="${esc(z.kod)}" aria-pressed="${z.kod === kod ? 'true' : 'false'}" title="${esc(z.nazev)}">`
    + `<span class="zpk-dot" style="--c:var(${esc(z.token)})" aria-hidden="true"></span><span>${esc(z.zkratka)}</span></button>`).join('');
}

export function evolutionTableHtml(d5, kod) {
  const years = d5.years || [];
  const rows = evolutionRows(d5, kod);
  const zkr = (ZP_BY_KOD[kod] && ZP_BY_KOD[kod].zkratka) || kod;
  const head = `<tr><th scope="col">Kraj</th>${years.map((y) => `<th scope="col">${esc(y)}</th>`).join('')}<th scope="col">Změna (p. b.)</th></tr>`;
  const body = rows.map((r) => `<tr><th scope="row">${esc(r.name)}</th>${r.values.map((v) => `<td>${esc(fmtShare(v))}</td>`).join('')}`
    + `<td class="zpk-delta">${r.delta == null ? 'nedohledáno' : esc(`${r.delta > 0 ? '+' : r.delta < 0 ? '−' : ''}${fmt(Math.abs(r.delta), 1)}`)}</td></tr>`).join('');
  return `<div class="zpk-scroll" tabindex="0" role="region" aria-label="${esc(`Podíl ${zkr} mezi pojištěnci kraje, ${years[0]}–${years[years.length - 1]} (tabulka, posuvná)`)}">`
    + `<table class="zpk-evo"><caption class="zpk-sr">Podíl ${esc(zkr)} mezi pojištěnci kraje v %, podle roku</caption><thead>${head}</thead><tbody>${body}</tbody></table></div>`;
}

/** Legenda rampy: 5 vzorků od nejnižšího po nejvyšší podíl. */
export function legendHtml(dataset, dark) {
  const vals = dataset.regions.map((r) => r.value).filter(isNum);
  if (!vals.length) return '';
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const swatches = [0, 0.25, 0.5, 0.75, 1].map((t) => {
    const rel = RAMP_REL_MIN + (RAMP_REL_MAX - RAMP_REL_MIN) * t;
    return `<i class="zpk-sw" style="--c:${esc(pickColorNeutral(rel, dark))}" aria-hidden="true"></i>`;
  }).join('');
  return `<span class="zpk-lg-end">nejnižší ${esc(fmtShare(min))} %</span><span class="zpk-ramp">${swatches}</span><span class="zpk-lg-end">nejvyšší ${esc(fmtShare(max))} %</span>`;
}

// ---------------------------------------------------------------------------
// DOM část
// ---------------------------------------------------------------------------

function isDark(doc) {
  return doc.documentElement.getAttribute('data-theme') === 'dark';
}

function mojeFromDom(doc) {
  const main = doc.querySelector('main');
  const v = main && main.getAttribute('data-moje-zp');
  return v && ZP_BY_KOD[v] ? v : null;
}

/**
 * Připojí sekci do #zpKraje. Vrací funkci pro odpojení (testy, HMR).
 * Fetch a render proběhnou až při přiblížení kontejneru k viewportu.
 */
export function bootKraje(doc = globalThis.document, win = globalThis.window) {
  const host = doc && doc.getElementById('zpKraje');
  if (!host || host.dataset.zpkInit === '1') return () => {};
  host.dataset.zpkInit = '1';
  host.classList.add('zpk');
  host.innerHTML = '<h3 class="section-title"><span>Kde pojišťovna sedí</span></h3>'
    + '<p class="zpk-loading" role="status">Načítám rozložení pojištěnců podle krajů…</p>';

  const state = { d5: null, moje: mojeFromDom(doc), local: null, dataset: null, started: false };
  const cleanups = [];

  const onMoje = (e) => {
    const k = e && e.detail && e.detail.kod;
    state.moje = k && ZP_BY_KOD[k] ? k : null;
    state.local = null;
    if (state.d5) draw();
  };
  doc.addEventListener(MOJE_EVENT, onMoje);
  cleanups.push(() => doc.removeEventListener(MOJE_EVENT, onMoje));

  async function load() {
    if (state.started) return;
    state.started = true;
    let d5 = null;
    try {
      const r = await fetch(DATA_URL);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      d5 = await r.json();
    } catch (err) {
      console.warn('pojistovny-kraje:', err.message);
    }
    if (!d5 || !d5.data || !lastYear(d5)) {
      host.innerHTML = '<h3 class="section-title"><span>Kde pojišťovna sedí</span></h3>'
        + '<p class="zpc-note">Rozložení pojištěnců podle krajů se nepodařilo načíst. Zkuste stránku obnovit.</p>';
      return;
    }
    state.d5 = d5;
    state.moje = mojeFromDom(doc) || state.moje;
    scaffold();
    draw();
  }

  let mapHost = null;
  let tezHost = null;
  let readout = null;
  let legend = null;
  let chips = null;
  let stateEl = null;
  let evoHost = null;

  function scaffold() {
    host.innerHTML = '<h3 class="section-title"><span>Kde pojišťovna sedí</span></h3>'
      + '<p class="zpk-lead">Mapa ukazuje, jak velkou část pojištěnců v každém kraji tvoří vybraná pojišťovna. Vedle je vidět, ve kterých krajích žije její kmen.</p>'
      + '<p class="zpk-state"></p>'
      + '<div class="zpk-chips" role="group" aria-label="Pojišťovna zobrazená v této sekci"></div>'
      + '<div class="zpk-body">'
      + '<figure class="zpk-mapfig"><figcaption class="zpk-cap"><span class="zpk-title"></span><span class="zpk-sub"></span></figcaption>'
      + '<div class="zpk-map"></div><div class="zpk-legend"></div><p class="zpk-readout" role="status" aria-live="polite"></p></figure>'
      + '<div class="zpk-tez"></div>'
      + '</div>'
      + '<details class="zpc-acc zpk-evo-acc"><summary></summary><div class="zpc-acc-body zpk-evo-body"></div></details>'
      + `<p class="zpc-cap zpk-src">${esc(SOURCE_TEXT)}</p>`;
    mapHost = host.querySelector('.zpk-map');
    tezHost = host.querySelector('.zpk-tez');
    readout = host.querySelector('.zpk-readout');
    legend = host.querySelector('.zpk-legend');
    chips = host.querySelector('.zpk-chips');
    stateEl = host.querySelector('.zpk-state');
    evoHost = host.querySelector('.zpk-evo-body');

    chips.addEventListener('click', (e) => {
      const b = e.target.closest ? e.target.closest('button[data-kod]') : null;
      if (!b || !chips.contains(b)) return;
      state.local = b.getAttribute('data-kod');
      draw();
      const again = chips.querySelector(`button[data-kod="${state.local}"]`);
      if (again) again.focus();
    });
    cleanups.push(onThemeChange(() => { if (state.dataset) { drawLegend(); } }));
  }

  function currentKod() {
    return resolveKod({ local: state.local, moje: state.moje });
  }

  function drawLegend() {
    legend.innerHTML = legendHtml(state.dataset, isDark(doc));
  }

  function defaultReadout() {
    const zkr = ZP_BY_KOD[state.dataset.kod].zkratka;
    const nat = nationalTotals(state.d5, state.dataset.kod, state.dataset.rok);
    return `ČR celkem: ${zkr} má ${fmt(nat.share, 1)} % pojištěnců (${fmtInt(nat.count)}). Najeďte na kraj nebo ho vyberte tabulátorem.`;
  }

  function draw() {
    if (!state.d5 || !mapHost) return;
    const kod = currentKod();
    const z = ZP_BY_KOD[kod];
    const rok = lastYear(state.d5);
    const dataset = buildKrajDataset(state.d5, kod, rok);
    state.dataset = dataset;

    host.setAttribute('data-zp', kod);
    stateEl.textContent = stateSentence({ kod, moje: state.moje, local: state.local });
    chips.innerHTML = chipsHtml(kod);
    host.querySelector('.zpk-title').textContent = `Podíl ${z.zkratka} mezi pojištěnci kraje, ${rok}`;
    host.querySelector('.zpk-sub').textContent = 'Čím sytější modrá, tím větší podíl pojišťovny v kraji.';

    const fill = makeFill(dataset);
    const link = (code, on) => {
      const row = tezHost.querySelector(`.zpv-row[data-key="${code}"]`);
      if (row) row.classList.toggle('is-linked', on);
    };
    renderCzMap(mapHost, dataset, {
      fillForRegion: fill,
      titleForRegion: (r) => krajReadout(r, z.zkratka, dataset.country_avg),
      valueText: (r) => tileValue(r.value),
      onRegionHover: (code) => {
        const r = dataset.regions.find((x) => x.code === code);
        readout.textContent = r ? krajReadout(r, z.zkratka, dataset.country_avg) : '';
        link(code, true);
      },
      onRegionLeave: (code) => {
        readout.textContent = defaultReadout();
        link(code, false);
      },
    });
    drawLegend();
    readout.textContent = defaultReadout();

    tezHost.innerHTML = rankedBars(tezisteItems(state.d5, kod, rok), {
      title: `Těžiště kmene: ${z.zkratka}`,
      sub: `% pojištěnců ${z.zkratka} podle kraje, ${rok}`,
      unit: '%',
      dec: tezisteItems(state.d5, kod, rok).some((i) => i.value < 0.1) ? 2 : 1,
      source: 'ÚZIS, CRP (OIS 11-47)',
    });

    const years = state.d5.years || [];
    host.querySelector('.zpk-evo-acc summary').textContent = `Vývoj podílu v kraji ${years[0]}–${years[years.length - 1]} · ${(state.d5.krajs || []).length} krajů`;
    evoHost.innerHTML = evolutionTableHtml(state.d5, kod);

    try { initZpInteract(doc); } catch (_) { /* interakce jsou vylepšení, ne nutnost */ }
  }

  // ---- líné načtení ----
  const W = win || globalThis;
  if (W && typeof W.IntersectionObserver === 'function') {
    const io = new W.IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { io.disconnect(); load(); }
    }, { rootMargin: '400px 0px' });
    io.observe(host);
    cleanups.push(() => io.disconnect());
  } else if (W && typeof W.requestIdleCallback === 'function') {
    W.requestIdleCallback(() => load());
  } else {
    setTimeout(() => load(), 200);
  }

  return () => { cleanups.forEach((fn) => { try { fn(); } catch (_) { /* ignore */ } }); };
}

if (typeof document !== 'undefined' && document.getElementById('zpKraje')) {
  const boot = () => { bootKraje(document, window); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
}
