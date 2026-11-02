// Srovnávač zdravotních pojišťoven — pracovní verze (pod heslem, noindex).
//
// Čte výhradně data/pojistovny*.json (frontend nezná zdroje):
//   data/pojistovny.json            kmen (CRP 2025 + řada 2010–2025), hospodaření 2024 (MZ+MF, VZ), 2025 (VZ), ZPP 2026, servis
//   data/pojistovny-aplikace.json   matice funkcí aplikací, uživatelé, rizikové skupiny, další zkoumání
//   data/pojistovny-prevence.json   nabídka podle oblastí, onko screening, duševní zdraví, struktura fondu prevence, odpovědi z VZ
//   data/pojistovny-otazky.json     sady otázek (kolo 1 fond prevence, kolo 2 rizikoví pojištěnci)
// Každý soubor je nepovinný: chybí-li, modul vypíše stav „data zatím nejsou k dispozici“ a zbytek stránky funguje.
//
// Tenhle soubor drží hero, modul 3 (kmen a hospodaření; P1.4 + P3.1 + P3.4) a init.
// Moduly 1, 2 a 4 renderuje src/pojistovny-prevence.js. Semafor, mapu kraj × ZP,
// síť odborností a tracker žádostí renderují samostatné moduly (#zpSemafor,
// #zpKraje, #zpSit, #zpZadosti).
//
// P1.6 (§ 2.8): srovnávač má přehled (pojistovny.html) a pět podstránek
// (pojistovny-kmen / -prevence / -aplikace / -gramotnost / -metodika.html).
// Tenhle orchestrátor běží na všech šesti: shell (src/pojistovny-shell.js)
// vykreslí hlavičku a zdroje, pak se podle kontejnerů na stránce rozhodne, která
// data načíst (jen potřebná) a které renderery zavolat. Chybějící kontejner =
// renderer nic nevykreslí (set() kontejner nenajde).
//
// Grafy kreslí primitivy src/zp-viz.js (čisté funkce → HTML string). Příprava
// vstupů je oddělená od renderu: heroTiles(), buildKmenCharts(), buildFinRows(),
// sortFinRows() a pickYoyMetric() jsou čisté a testuje je tests/pojistovny.test.js.
// Interakce (Moje pojišťovna, tooltip, animace) dodává src/zp-interact.js —
// initZpInteract() se volá po vyrenderování všech modulů (idempotentní).

import './analytics.js';
import { NA, esc, num, h, fmtKc, levelBadge, boolMark, dot, li, set, short, loadJson, miniIndexSvg } from './pojistovny-shared.js';
import { renderApps, renderPrevence, renderOtazky } from './pojistovny-prevence.js';
import { renderDotaznik, renderDotaznikAgregace } from './zp-dotaznik.js';
import { statTiles, rankedBars, segmentedBar, indexedLines, dumbbell, isNum, pct } from './zp-viz.js';
import { initZpInteract, MOJE_EVENT } from './zp-interact.js';
import { renderZpShell, legacyRedirect } from './pojistovny-shell.js';
import { renderPrehled } from './pojistovny-prehled.js';

// Re-export čistých funkcí kvůli tests/pojistovny.test.js.
export { fmtKc, levelBadge, miniIndexSvg };

const SRC_CRP = 'ÚZIS · CRP (OIS 11-47) · 2025';
const SRC_MZ = 'MZ ČR + MF · hodnocení systému v.z.p. · 2024';
const SRC_ZPP = 'PS ČR · zdravotně pojistné plány (tisk 280) · 2026';
export const STD_PENDING = 'standardizace čeká na nákladové indexy';

// ---------------------------------------------------------------- čisté funkce

/** Kladné saldo: zkratky pojišťoven s hospodářským výsledkem > 0 (pro popisek hero). */
export function kladneSaldo(d) {
  return (d?.pojistovny || []).filter((z) => isNum(h(z.hospodareni?.hospodarsky_vysledek_mld)) && h(z.hospodareni.hospodarsky_vysledek_mld) > 0)
    .map((z) => z.zkratka);
}

const aList = (arr) => (arr.length > 1 ? `${arr.slice(0, -1).join(', ')} a ${arr[arr.length - 1]}` : arr.join(''));

/**
 * Dlaždice hero ze system / system_crp (vstup pro statTiles). Žádné natvrdo psané
 * číslo: plán 2026 je v system.plan_2026_* (tisk 280). Fond prevence jen celkem,
 * bez přepočtu na pojištěnce (rozhodnutí PS 7. 10. 2026, plán § 1.1).
 * @param {{bezFondu?: boolean}} [opt]  bezFondu: jen tři dlaždice (přehled)
 */
export function heroTiles(d, { bezFondu = false } = {}) {
  const s = d?.system || {};
  const c = d?.system_crp || {};
  const kladne = kladneSaldo(d);
  const tiles = [
    { value: isNum(c.pojistenci_2025) ? c.pojistenci_2025 : null, unit: 'osob', label: `pojištěnců v CRP (${d?.rok_crp ?? 2025})`,
      meta: `7 pojišťoven · senioři 65+ tvoří ${fmtKc(c.podil_65plus_pct, 1)}\u00a0% kmene` },
    { value: isNum(s.vydaje_celkem_mld) ? s.vydaje_celkem_mld : null, decimals: 1, unit: 'mld Kč', label: `výdaje systému v.z.p. ${s.rok ?? ''}`.trim(),
      meta: isNum(s.plan_2026_vydaje_mld) ? `plán 2026: ${fmtKc(s.plan_2026_vydaje_mld, 1)}\u00a0mld (sněmovní tisk 280)` : '' },
    { value: isNum(s.saldo_mld) ? s.saldo_mld : null, decimals: 1, unit: 'mld Kč', label: `saldo systému ${s.rok ?? ''}`.trim(),
      meta: [kladne.length ? `kladně jen ${aList(kladne)}` : '', isNum(s.plan_2026_saldo_mld) ? `plán 2026 ${fmtKc(s.plan_2026_saldo_mld, 1)}\u00a0mld` : '']
        .filter(Boolean).join('; ') },
  ];
  if (!bezFondu) {
    tiles.push({ value: isNum(s.fond_prevence_naklady_celkem_mld) ? s.fond_prevence_naklady_celkem_mld : null, decimals: 2, unit: 'mld Kč',
      label: `fond prevence celkem ${s.rok ?? ''}`.trim(), meta: 'čerpání všech sedmi pojišťoven' });
  }
  return tiles;
}

/** Stav standardizace nákladů na pojištěnce: {dolozeno, hodnota, poznamka}. */
export function stdInfo(hosp) {
  const std = hosp?.naklady_na_pojistence_std_kc;
  if (std && std.stav === 'dolozeno' && isNum(std.hodnota)) return { dolozeno: true, hodnota: std.hodnota, poznamka: std.poznamka || '' };
  return { dolozeno: false, hodnota: null, poznamka: STD_PENDING };
}

const YOY_METRICS = [
  { key: 'prijmy_na_pojistence_kc', title: 'Příjmy na pojištěnce', unit: 'Kč' },
  { key: 'naklady_na_pojistence_kc', title: 'Náklady na zdravotní služby na pojištěnce', unit: 'Kč' },
];
// Kč fondu prevence na pojištěnce sem nepatří: PS 7. 10. 2026 ho odmítla jako ukazatel (plán § 1.1).

/**
 * Metrika pro srovnání 2024 → 2025: první z YOY_METRICS, kterou mají v obou
 * letech všechny pojišťovny s hospodareni_2025. Bez takové metriky null.
 */
export function pickYoyMetric(zps) {
  const with25 = (zps || []).filter((z) => z && z.hospodareni_2025 && typeof z.hospodareni_2025 === 'object'
    && Object.keys(z.hospodareni_2025).length);
  if (!with25.length) return null;
  return YOY_METRICS.find((m) => with25.every((z) => isNum(h(z.hospodareni?.[m.key])) && isNum(h(z.hospodareni_2025[m.key])))) || null;
}

/** Vstupy pro grafy modulu 3: {nazev: {items|parts|series, opts}} (bez DOM). */
export function buildKmenCharts(d) {
  const zps = d?.pojistovny || [];
  const sys = d?.system || {};
  const crp = d?.system_crp || {};
  const base = (z) => ({ kod: z.kod, label: z.zkratka });

  const share = {
    parts: zps.map((z) => ({ ...base(z), value: z.crp?.podil_trhu_pct, rok: z.crp?.rok })),
    opts: { title: `Tržní podíl ${d?.rok_crp ?? 2025}`, sub: 'Podíl na všech pojištěncích ČR.', unit: '%', dec: 1, maxParts: 7, source: SRC_CRP },
  };

  const senior = {
    items: zps.map((z) => ({ ...base(z), value: z.crp?.podil_65plus_pct, rok: z.crp?.rok })),
    opts: { title: 'Podíl seniorů 65+ v kmeni', sub: 'Starší kmen = vyšší náklady; přerozdělení to má vyrovnávat.', unit: '%', dec: 1, source: SRC_CRP,
      ref: isNum(crp.podil_65plus_pct) ? { value: crp.podil_65plus_pct, label: 'průměr ČR', kind: 'line' } : null },
  };

  const nzs = {
    items: zps.map((z) => {
      const st = stdInfo(z.hospodareni);
      const note = st.dolozeno ? `standardizováno na věk a pohlaví ${fmtKc(st.hodnota)} Kč` : `nestandardizováno, ${STD_PENDING}`;
      return { ...base(z), value: h(z.hospodareni?.naklady_na_pojistence_kc), rok: 2024, note };
    }),
    opts: { title: 'Náklady na zdravotní služby na pojištěnce', sub: 'Kč za rok 2024, nestandardizováno na věk. Náklady (akruálně), ne hotovostní výdaje.', unit: 'Kč', dec: 0,
      source: SRC_MZ,
      ref: isNum(sys.naklady_zs_na_pojistence_kc) ? { value: sys.naklady_zs_na_pojistence_kc, label: 'průměr ČR', kind: 'line' } : null },
  };

  const zust = {
    items: zps.map((z) => {
      const v = h(z.hospodareni?.zustatek_2026_pct_vydaju);
      const zav = h(z.hospodareni?.zavazky_po_splatnosti_2026_plan_mil);
      const tip = `${z.zkratka}: ${isNum(v) ? fmtKc(v, 1) + ' % ročních výdajů' : 'nedohledáno'} · závazky po splatnosti ${isNum(zav) ? fmtKc(zav) + ' mil. Kč' : 'nedohledány'} · ZPP 2026`;
      return { ...base(z), value: v, tip };
    }),
    opts: { title: 'Rezervy na konci roku 2026', sub: 'Zůstatek na účtech v % ročních výdajů. Pod 3–4 % vznikají dluhy po splatnosti.', unit: '%', dec: 1, source: SRC_ZPP,
      ref: { value: 3.5, label: 'kritická hranice 3–4 %', kind: 'zone-below' } },
  };

  const provoz = {
    items: zps.map((z) => {
      const v = h(z.hospodareni?.provozni_naklady_pct);
      const lim = h(z.hospodareni?.provozni_limit_pct);
      const tip = `${z.zkratka}: ${isNum(v) ? fmtKc(v, 1) + ' % příjmů' : 'nedohledáno'} · ${isNum(lim) ? `limit ${fmtKc(lim, 2)} %` : 'limit nedohledán'} · 2024`;
      return { ...base(z), value: v, tip };
    }),
    opts: { title: 'Provoz v % příjmů', sub: 'Výdaje na vlastní činnost pojišťovny; limit podle vyhlášky 418/2003 Sb. v tooltipu.', unit: '%', dec: 1, source: SRC_MZ },
  };

  const trend = {
    series: zps.map((z) => ({ ...base(z), points: (z.crp?.pojistenci_trend || []).map((p) => ({ year: p.year, value: p.insured })) })),
    opts: { title: 'Kdo roste a kdo ztrácí — index 2010 = 100', sub: 'Počet pojištěnců každé pojišťovny vůči roku 2010. Skok VZP v roce 2023 = registrace ukrajinských uprchlíků.',
      base: 2010, source: 'ÚZIS · CRP (OIS 11-47) · 2010–2025' },
  };

  const growth = {
    items: zps.map((z) => ({ ...base(z), value: z.crp?.rust_2015_2025_pct, rok: '2015 → 2025' })),
    opts: { title: 'Změna kmene 2015 → 2025', sub: 'Změna počtu pojištěnců v %. Doleva od nuly = úbytek.', unit: '%', dec: 1, allowNegative: true, signed: true,
      source: 'ÚZIS · CRP (OIS 11-47) · 2015, 2025' },
  };

  const metric = pickYoyMetric(zps);
  const has25 = (z) => metric && z.hospodareni_2025 && isNum(h(z.hospodareni_2025[metric.key]));
  const missing = zps.filter((z) => !has25(z)).map((z) => z.zkratka);
  const s25 = (z) => z.hospodareni_2025 && typeof z.hospodareni_2025 === 'object' && Object.keys(z.hospodareni_2025).length;
  const vz25 = zps.filter(s25).map((z) => z.zkratka);
  const bez25 = zps.filter((z) => !s25(z)).map((z) => z.zkratka);
  const yoy = {
    metric,
    missing,
    // Bez metriky, kterou mají všechny dostupné VZ 2025, se graf nekreslí — jen věta.
    veta: metric ? '' : `Meziroční srovnání 2024 → 2025 doplníme, až budou výroční zprávy 2025 u všech pojišťoven (dnes ${aList(vz25) || 'žádná'}; ${aList(bez25)} chybí).`,
    items: metric ? zps.filter(has25).map((z) => ({ ...base(z), from: h(z.hospodareni[metric.key]), to: h(z.hospodareni_2025[metric.key]) })) : [],
    opts: {
      title: metric ? `${metric.title}: 2024 → 2025` : 'Hospodaření 2024 → 2025',
      sub: `${missing.length ? `${missing.join(', ')}: VZ 2025 nedohledána.` : 'Všech sedm pojišťoven.'}${metric ? ' Metrika, kterou mají všechny dostupné VZ 2025.' : ''}`,
      unit: metric?.unit || '', dec: 0, fromLabel: '2024', toLabel: '2025', source: 'MZ ČR + MF · hodnocení v.z.p. 2024 · výroční zprávy 2025',
    },
  };

  return { share, senior, nzs, zust, provoz, trend, growth, yoy };
}

/** Sloupce zkrácené tabulky hospodaření (klíč, záhlaví, desetinná místa, inline bar). */
export const FIN_COLS = [
  { key: 'pojistenci', head: 'Pojištěnci', dec: 0 },
  { key: 'prijmy', head: 'Příjmy mld Kč', dec: 1 },
  { key: 'nzs', head: 'Náklady ZS mld Kč', dec: 1 },
  { key: 'npp', head: 'Náklady na pojištěnce Kč', dec: 0, bar: true },
  { key: 'provoz', head: 'Provoz % příjmů', dec: 1, bar: true },
  { key: 'saldo', head: 'Saldo mld Kč', dec: 1 },
];
/** Sloupce v rozbalovacím detailu „Další sloupce“. */
export const FIN_MORE_COLS = [
  { key: 'fond_mil', head: 'Fond prevence mil. Kč', dec: 0 },
  { key: 'fpp', head: 'Fond prevence na pojištěnce Kč', dec: 0 },
  { key: 'limit', head: 'Limit provozu %', dec: 2 },
  { key: 'zust25', head: 'Zůstatek BÚ 2025 mil. Kč', dec: 0 },
  { key: 'zust26', head: 'Zůstatek BÚ 2026 mil. Kč', dec: 0 },
  { key: 'rez26', head: 'Rezerva 2026 % výdajů', dec: 1 },
  { key: 'zav26', head: 'Závazky po splatnosti 2026 mil. Kč', dec: 0 },
];

/** Řádky tabulky hospodaření: [{kod, zkratka, v: {klíč: číslo|null}}]. */
export function buildFinRows(d) {
  return (d?.pojistovny || []).map((z) => {
    const x = z.hospodareni || {};
    const n = (k) => { const v = h(x[k]); return isNum(v) ? v : null; };
    return {
      kod: z.kod,
      zkratka: z.zkratka,
      v: {
        pojistenci: n('pocet_pojistencu'), prijmy: n('prijmy_celkem_mld'), nzs: n('naklady_zdravotni_sluzby_mld'),
        npp: n('naklady_na_pojistence_kc'), fpp: n('fond_prevence_na_pojistence_kc'), provoz: n('provozni_naklady_pct'),
        saldo: n('hospodarsky_vysledek_mld'), fond_mil: n('fond_prevence_naklady_mil'), limit: n('provozni_limit_pct'),
        zust25: n('zustatek_bu_2025_oček_mil'), zust26: n('zustatek_bu_2026_plan_mil'), rez26: n('zustatek_2026_pct_vydaju'),
        zav26: n('zavazky_po_splatnosti_2026_plan_mil'),
      },
    };
  });
}

/** Seřadí řádky podle klíče; null vždy na konec; stabilní; vstup nemění. */
export function sortFinRows(rows, key, dir = 'desc') {
  const sign = dir === 'asc' ? 1 : -1;
  return (rows || []).map((r, i) => ({ r, i, v: r?.v?.[key] ?? r?.[key] ?? null }))
    .sort((a, b) => {
      const na = !isNum(a.v);
      const nb = !isNum(b.v);
      if (na && nb) return a.i - b.i;
      if (na) return 1;
      if (nb) return -1;
      return sign * (a.v - b.v) || a.i - b.i;
    })
    .map((x) => x.r);
}

// ---------------------------------------------------------------- hero
function renderHero(d) {
  if (!d) return;
  set('zpHeroStats', statTiles(heroTiles(d), { title: 'Klíčová čísla systému' }));
}

// ---------------------------------------------------------------- modul 3: kmen a hospodaření
function cardHtml(z) {
  const c = z.crp || {}, hs = z.hospodareni || {}, p = z.prevence || {}, s = z.servis || {};
  const top = c.top_kraje?.[0];
  const g = c.rust_2015_2025_pct;
  const st = stdInfo(hs);
  const yr = (v) => (v != null && p.rok_udaju && p.rok_udaju !== 2024 ? `<small class="zpc-na"> (${p.rok_udaju})</small>` : '');
  const row = (dt, dd) => `<div><dt>${dt}</dt><dd>${dd}</dd></div>`;
  const nppDd = `${num(h(hs.naklady_na_pojistence_kc))} Kč`
    + (st.dolozeno ? '' : ` <small class="zpc-std" title="Standardizace na věk a pohlaví (metodika § 4.1): ${STD_PENDING}.">nestandardizováno</small>`);
  const mini = miniIndexSvg((c.pojistenci_trend || []).map((t) => ({ year: t.year, value: t.insured })), { label: z.zkratka });
  return `<article class="zpc-card" id="zp-${esc(z.kod)}" data-zp="${esc(z.kod)}" style="--c:var(--zp-${esc(z.kod)})">
      <header><span class="zpc-kod">${esc(z.kod)}</span><h3>${esc(z.zkratka)}</h3><span class="zpc-full">${esc(z.nazev)}</span></header>
      <div class="zpc-kpi"><b>${fmtKc(c.pojistenci / 1e6, 2)} mil.</b><span>pojištěnců ${esc(c.rok ?? 2025)} · ${fmtKc(c.podil_trhu_pct, 1)} % trhu</span>
        <div class="zpc-mini-wrap">${mini}<span class="zpc-mini-cap">kmen, 2010 = 100</span></div></div>
      <dl>
        ${row('Senioři 65+', `${fmtKc(c.podil_65plus_pct, 1)} %`)}
        ${row('Kmen 2015 → 2025', isNum(g) ? `${g > 0 ? '+' : g < 0 ? '−' : ''}${fmtKc(Math.abs(g), 1)} %` : NA)}
        ${row('Náklady na pojištěnce 2024', nppDd)}
        ${st.dolozeno ? row('Náklady na pojištěnce (standardizováno)', `${fmtKc(st.hodnota)} Kč`) : ''}
        ${row('Rezerva konec 2026', `${num(h(hs.zustatek_2026_pct_vydaju), 1)} % výdajů`)}
      </dl>
      <details class="zpc-card-more"><summary>Další údaje</summary><dl>
        ${row('Děti 0–14', `${fmtKc(c.podil_0_14_pct, 1)} %`)}
        ${row('Těžiště', top ? `${esc(top.nazev || '')} (${fmtKc(top.pct_kmene, 0)} % kmene)` : NA)}
        ${row('Fond prevence 2024', `${num(h(hs.fond_prevence_naklady_mil))} mil. Kč`)}
        ${row('Max. příspěvek dospělý / dítě', `${num(p.max_prispevek_dospely_kc)}${yr(p.max_prispevek_dospely_kc)} / ${num(p.max_prispevek_dite_kc)}${yr(p.max_prispevek_dite_kc)} Kč`)}
        ${row('Aplikace', esc(short(s.mobilni_aplikace, 28)) || NA)}
        ${row('Saldo 2024', `${num(h(hs.hospodarsky_vysledek_mld), 1)} mld Kč`)}
      </dl></details></article>`;
}

function finTable(rows, cols, { label, sortable }) {
  const max = Object.fromEntries(cols.filter((c) => c.bar).map((c) => [c.key, Math.max(0, ...rows.map((r) => r.v[c.key]).filter(isNum))]));
  const head = cols.map((c) => (sortable
    ? `<th scope="col" aria-sort="none"><button type="button" class="zpc-sort" data-key="${c.key}">${esc(c.head)}<span class="zpc-sort-ic" aria-hidden="true"></span></button></th>`
    : `<th scope="col">${esc(c.head)}</th>`)).join('');
  const body = rows.map((r) => `<tr data-zp="${esc(r.kod)}"><th scope="row">${dot(r.kod)}${esc(r.zkratka)}</th>${cols.map((c) => {
    const v = r.v[c.key];
    const bar = c.bar && isNum(v) ? `<span class="zpc-ibar" aria-hidden="true"><i style="--w:${pct(v, max[c.key])}"></i></span>` : '';
    return `<td${c.bar ? ' class="zpc-barcell"' : ''}>${bar}<span class="zpc-num">${num(v, c.dec)}</span></td>`;
  }).join('')}</tr>`).join('');
  return `<div class="zpc-tbl" role="region" tabindex="0" aria-label="${esc(label)}"><table><thead><tr><th scope="col">Pojišťovna</th>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}

let finRows = [];
function renderFin(d) {
  finRows = buildFinRows(d);
  set('zpTableFin', finTable(finRows, FIN_COLS, { label: 'Hospodaření pojišťoven 2024 (tabulka, řaditelná, posuvná)', sortable: true })
    + `<details class="zpc-acc zpc-acc--tbl"><summary>Další sloupce · ${FIN_MORE_COLS.length}</summary>`
    + finTable(finRows, FIN_MORE_COLS, { label: 'Hospodaření: zůstatky, limity a rezervy (tabulka, posuvná)', sortable: false }) + '</details>');
  const box = document.getElementById('zpTableFin');
  if (!box || box.dataset.sortInit === '1') return;
  box.dataset.sortInit = '1';
  box.addEventListener('click', (e) => {
    const btn = e.target.closest ? e.target.closest('button.zpc-sort') : null;
    if (!btn) return;
    const th = btn.closest('th');
    const table = btn.closest('table');
    const dir = th.getAttribute('aria-sort') === 'descending' ? 'asc' : 'desc';
    const order = sortFinRows(finRows, btn.dataset.key, dir).map((r) => r.kod);
    const tbody = table.tBodies[0];
    const byKod = Object.fromEntries(Array.from(tbody.rows).map((tr) => [tr.getAttribute('data-zp'), tr]));
    order.forEach((k) => byKod[k] && tbody.appendChild(byKod[k]));
    table.querySelectorAll('thead th[aria-sort]').forEach((x) => x.setAttribute('aria-sort', 'none'));
    th.setAttribute('aria-sort', dir === 'asc' ? 'ascending' : 'descending');
  });
}

function renderKmen(d) {
  if (!d) { set('zpCards', '<p class="zpc-na">Základní dataset chybí.</p>'); return; }
  const zps = d.pojistovny || [];
  const ch = buildKmenCharts(d);
  set('zpChartShare', segmentedBar(ch.share.parts, ch.share.opts));
  set('zpCards', zps.map(cardHtml).join(''));
  set('zpChartTrend', indexedLines(ch.trend.series, ch.trend.opts));
  set('zpChartGrowth', rankedBars(ch.growth.items, ch.growth.opts));
  set('zpChart65', rankedBars(ch.senior.items, ch.senior.opts));
  set('zpChartNzs', rankedBars(ch.nzs.items, ch.nzs.opts));
  renderFin(d);
  set('zpChartZust', rankedBars(ch.zust.items, ch.zust.opts));
  set('zpChartProvoz', rankedBars(ch.provoz.items, ch.provoz.opts));
  set('zpChartYoy', ch.yoy.metric ? dumbbell(ch.yoy.items, ch.yoy.opts) : `<p class="zpc-note">${esc(ch.yoy.veta)}</p>`);
  set('zpTablePrev', `<table><thead><tr><th>Pojišťovna</th><th class="zpc-txt">Aplikace</th><th>Pobočky</th><th>Online přepážka</th><th class="zpc-txt">Bonusový program</th><th class="zpc-txt">Pro zaměstnavatele</th></tr></thead><tbody>` +
    zps.map((z) => { const s = z.servis || {}, p = z.prevence || {}; const b = p.bonusovy_program || {}, e = p.programy_pro_zamestnavatele || {}; return `<tr data-zp="${esc(z.kod)}"><th scope="row">${dot(z.kod)}${esc(z.zkratka)}</th><td class="zpc-txt">${esc(s.mobilni_aplikace || '') || NA}</td><td>${num(s.pocet_pobocek)}${s.pocet_pobocek_poznamka ? `<small>${esc(short(s.pocet_pobocek_poznamka, 90))}</small>` : ''}</td><td>${boolMark(s.online_prepazka)}</td><td class="zpc-txt">${b.nazev ? esc(short(b.nazev, 110)) : b.existuje === null ? '<span class="zpc-na">nenalezen</span>' : NA}</td><td class="zpc-txt">${e.nazev ? esc(short(e.nazev, 90)) : e.existuje === null ? '<span class="zpc-na">nenalezen</span>' : NA}</td></tr>`; }).join('') + '</tbody></table>');
  const notes = zps.flatMap((z) => (z.poznamky || []).map((n) => `<li><b>${esc(z.zkratka)}</b> — ${esc(n)}</li>`));
  set('zpNotes', notes.join('') || '<li class="zpc-na">—</li>');
  set('zpNotesN', String(notes.length));
  set('zpChybi', li(d.chybi));
  set('zpChybiN', String((d.chybi || []).length));
}

// Výběr „Moje pojišťovna“ v kartách: vybraná karta se zvýrazní a rozbalí detail.
// Na mobilu (karty jako vodorovný pás) se detail nerozbaluje — natáhl by celý
// pás —, jen se pás posune na vybranou kartu (bez posunu stránky).
function syncCards(kod) {
  const box = document.getElementById('zpCards');
  if (!box) return;
  let carousel = false;
  try { carousel = window.matchMedia('(max-width: 640px)').matches; } catch (_) { /* bez matchMedia = desktop */ }
  box.querySelectorAll('.zpc-card[data-zp]').forEach((card) => {
    const on = !!kod && card.getAttribute('data-zp') === kod;
    card.classList.toggle('is-moje', on);
    const more = card.querySelector('details.zpc-card-more');
    if (on && carousel) box.scrollTo({ left: card.offsetLeft - box.offsetLeft, behavior: 'auto' });
    if (!more) return;
    if (on && !carousel) { more.open = true; more.dataset.autoOpen = '1'; } else if (!on && more.dataset.autoOpen === '1') { more.open = false; delete more.dataset.autoOpen; }
  });
}

// ---------------------------------------------------------------- dotazník (P2.4)
// Formulář se vyrenderuje ze sady v pojistovny-otazky.json. Adresný odkaz
// pojistovny-gramotnost.html?dotaznik=<sada>&token=<token> přepne sadu a doplní
// token (starý odkaz na pojistovny.html přesměruje legacyRedirect v shellu).
function renderDotazniky(otazky, agregaty) {
  const box = document.getElementById('zpDotaznik');
  if (!box || !otazky) return;
  const params = new URLSearchParams(location.search);
  const sady = otazky.sady || [];
  const urlSada = sady.find((s) => s.id === params.get('dotaznik'));
  const sada = urlSada || sady.find((s) => s.id === box.dataset.sada);
  if (!sada) return;
  renderDotaznik(box, sada, { token: urlSada ? params.get('token') : null });
  const aggBox = document.getElementById('zpDotaznikAgregace');
  if (aggBox && agregaty) renderDotaznikAgregace(aggBox, agregaty, sada);
  if (urlSada) box.scrollIntoView({ block: 'start' });
}

// ---------------------------------------------------------------- init

/** Které datasety stránka potřebuje — podle kontejnerů, které na ní jsou. */
export const POTREBA = {
  aplikace: ['zpPrehled', 'zpAppMatrix', 'zpRizikove', 'zpDalsi'],
  prevence: ['zpPrehled', 'zpPrevMatrix', 'zpFpStruktura', 'zpOdpovediMatrix'],
  otazky: ['zpOtazky', 'zpDotaznik'],
  agregaty: ['zpDotaznikAgregace'],
};

async function init() {
  const doc = document;
  const has = (ids) => ids.some((id) => doc.getElementById(id));
  if (has(['zpPrehled'])) {
    const to = legacyRedirect(location.search, location.hash);
    if (to) { location.replace(to); return; }
  }
  const shell = renderZpShell();
  const skip = Promise.resolve(null);
  const [d, a, p, o, agg] = await Promise.all([
    loadJson('data/pojistovny.json'),
    has(POTREBA.aplikace) ? loadJson('data/pojistovny-aplikace.json') : skip,
    has(POTREBA.prevence) ? loadJson('data/pojistovny-prevence.json') : skip,
    has(POTREBA.otazky) ? loadJson('data/pojistovny-otazky.json') : skip,
    has(POTREBA.agregaty) ? loadJson('data/pojistovny-dotaznik-agregaty.json') : skip,
  ]);
  if (has(['zpPrehled'])) {
    renderPrehled({ d, a, p, tiles: d ? heroTiles(d, { bezFondu: true }) : null, kmen: d ? buildKmenCharts(d) : null });
  } else {
    renderHero(d);
  }
  if (has(['zpAppMatrix', 'zpRizikove', 'zpDalsi'])) renderApps(a);
  if (has(['zpPrevMatrix', 'zpFpStruktura', 'zpMereni'])) renderPrevence(p, d);
  if (has(['zpCards', 'zpChartShare', 'zpTableFin'])) renderKmen(d);
  if (has(POTREBA.otazky)) { renderOtazky(o); renderDotazniky(o, agg); }
  doc.addEventListener(MOJE_EVENT, (e) => syncCards(e.detail?.kod ?? null));
  await initZpInteract(doc);
  syncCards(doc.querySelector('main')?.getAttribute('data-moje-zp') || null);
  await shell;
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
}
