// Srovnávač pojišťoven — přehled pojistovny.html jako „general view“ (balíček P1.6,
// PLAN-SROVNAVAC-POJISTOVEN.md § 2.8: hlavní stránka = přehled, hutný obsah na podstránkách).
//
// Přehled ukazuje: KPI dlaždice v hero, kartu vybrané pojišťovny (bez výběru sedm
// malých karet), jeden graf na téma v mřížce a rozcestník podstránek. Žádné tabulky
// ani dlouhé akordeony; každý graf je primitivum ze src/zp-viz.js (tabulkové dvojče
// v <details> je součást primitiva), marky nesou data-zp, takže je „Moje pojišťovna“
// zvýrazní. Pod grafem vede odkaz „Celé téma →“ na podstránku.
//
// Orchestruje src/pojistovny.js (renderPrehled). Vstupy z modulu 3 (heroTiles,
// buildKmenCharts) dostává jako argument, aby moduly neměly cyklický import.
//
// Výběr grafů (revize A0.1, druhá verze A1.2): tržní podíl (segmentovaný pruh), relativní saldo
// přerozdělení (stránka Peníze), náklady na pojištěnce (vykázáno → přepočteno) a rezervy 2026
// se zónou 3–4 %; kmenové grafy z buildKmenCharts, saldo z data/pojistovny-prerozdeleni.json.
// Provoz v % příjmů z přehledu odešel (rozptyl hodnot je malý), žije na stránce Peníze.
// Matice pokrytí VZ (48× ano) a funkce aplikací n/10 z přehledu odešly, nenesly informaci.
// Semafor = do prvních verdiktů jeden řádek „zatím nehodnoceno“. Index kmene 2010 = 100
// je jen na podstránce Kmen.
//
// Čisté funkce (testované bez DOM): aplikaceSkore, zpSouhrny, semaforRadekHtml,
// semaforMiniHtml, ovKartaHtml, ovMiniKartyHtml, temaKartyHtml, buildPrehled.

import { esc, fmtKc, dot, set } from './pojistovny-shared.js';
import { statTiles, rankedBars, segmentedBar, dumbbell, dotScore, isNum, fmtRozdil } from './zp-viz.js';
import { MOJE_EVENT, POROVNAT_EVENT } from './zp-interact.js';
import { ZP_BY_KOD } from './zp-palette.js';
import { semaforCell, iconHtml, semaforSummary, EMPTY_SENTENCE } from './pojistovny-semafor.js';
import { ZP_STRANKY, zpStrankaById } from './pojistovny-shell.js';
import { buildSaldoChart } from './pojistovny-penize.js';

const zkratkaOf = (kod, fallback) => ZP_BY_KOD[String(kod)]?.zkratka || fallback || String(kod);

/**
 * Funkce aplikací n/10: ano = 1, částečně = 0,5 (stejně jako dotMatrix).
 * Aplikace bez jediného známého údaje = null.
 * @returns {{items: Array<{kod,label,value,tip}>, max: number}}
 */
export function aplikaceSkore(a) {
  const funkce = Array.isArray(a?.funkce) ? a.funkce : [];
  const items = (a?.aplikace || []).map((x) => {
    const vals = funkce.map((f) => x.funkce?.[f.id]).map((v) => (v === true || v === false || v === 'partial' ? v : null));
    const sc = dotScore(vals);
    const label = zkratkaOf(x.kod, x.zp);
    const value = sc.known ? sc.yes : null;
    const tip = value == null
      ? `${label}: funkce aplikace nejsou známy`
      : `${label}: ${fmtKc(value, value % 1 ? 1 : 0)} z ${sc.known} známých funkcí${x.nazev ? ` · ${x.nazev}` : ''}`;
    return { kod: String(x.kod), label, value, tip };
  });
  return { items, max: funkce.length || 10 };
}

/** Souhrn jedné ZP pro kartu přehledu (kmen, podíl, věk, růst, rezerva, aplikace). */
export function zpSouhrny(d, a) {
  const apps = Object.fromEntries(aplikaceSkore(a).items.map((i) => [i.kod, i.value]));
  const appMax = Array.isArray(a?.funkce) && a.funkce.length ? a.funkce.length : 10;
  const hv = (x) => (x && typeof x === 'object' && 'hodnota' in x ? x.hodnota : x);
  return (d?.pojistovny || []).map((z) => ({
    kod: String(z.kod),
    zkratka: z.zkratka,
    nazev: z.nazev,
    pojistenci: isNum(z.crp?.pojistenci) ? z.crp.pojistenci : null,
    podil: isNum(z.crp?.podil_trhu_pct) ? z.crp.podil_trhu_pct : null,
    senior: isNum(z.crp?.podil_65plus_pct) ? z.crp.podil_65plus_pct : null,
    rust: isNum(z.crp?.rust_2015_2025_pct) ? z.crp.rust_2015_2025_pct : null,
    rezerva: isNum(hv(z.hospodareni?.zustatek_2026_pct_vydaju)) ? hv(z.hospodareni.zustatek_2026_pct_vydaju) : null,
    app: apps[String(z.kod)] ?? null,
    appMax,
  }));
}

const NA_SPAN = '<span class="zpc-na">nedohledáno</span>';
const v1 = (v, dec, unit) => (isNum(v) ? `${fmtKc(v, dec)}${unit ? ` ${unit}` : ''}` : NA_SPAN);
const signed = (v) => (isNum(v) ? `${v > 0 ? '+' : v < 0 ? '−' : ''}${fmtKc(Math.abs(v), 1)} %` : NA_SPAN);
const mil = (n) => (isNum(n) ? `${fmtKc(n / 1e6, 2)} mil.` : NA_SPAN);

/** Řádky karty (bez součtu funkcí aplikace: součet „kdo umí víc“ nic neříká): popisek, formátovaná hodnota a rozdíl (moje − porovnat) v jednotce řádku; rozdíl jen u čísel. */
const KARTA_RADKY = [
  { dt: 'Pojištěnců (CRP 2025)', dd: (s) => mil(s.pojistenci), diff: (a, b) => (isNum(a.pojistenci) && isNum(b.pojistenci) ? fmtRozdil(a.pojistenci / 1e6, b.pojistenci / 1e6, 2, 'mil.') : null) },
  { dt: 'Podíl na trhu', dd: (s) => v1(s.podil, 1, '%'), diff: (a, b) => fmtRozdil(a.podil, b.podil, 1, 'p. b.') },
  { dt: 'Senioři 65+', dd: (s) => v1(s.senior, 1, '%'), diff: (a, b) => fmtRozdil(a.senior, b.senior, 1, 'p. b.') },
  { dt: 'Kmen 2015 → 2025', dd: (s) => signed(s.rust), diff: (a, b) => fmtRozdil(a.rust, b.rust, 1, 'p. b.') },
  { dt: 'Rezerva konec 2026', dd: (s) => (isNum(s.rezerva) ? `${fmtKc(s.rezerva, 1)} % výdajů` : NA_SPAN), diff: (a, b) => fmtRozdil(a.rezerva, b.rezerva, 1, 'p. b.') },
];

const kartaRow = (dt, dd) => `<div><dt>${dt}</dt><dd>${dd}</dd></div>`;

/**
 * Karta vybrané pojišťovny. S druhým argumentem (A4.2 „Porovnat s“) dvě `<dl>` vedle sebe
 * (moje · porovnat) a třetí sloupec s rozdílem „moje − porovnat“ u číselných řádků.
 * @param {object|null} s   souhrn „moje“ pojišťovny (zpSouhrny)
 * @param {object|null} [s2] souhrn pojišťovny „Porovnat s“; stejná jako s = bez porovnání
 */
export function ovKartaHtml(s, s2 = null) {
  if (!s) return '';
  if (s2 && String(s2.kod) !== String(s.kod)) return ovKartaPorovnaniHtml(s, s2);
  return `<article class="zpc-ov-karta" data-zp="${esc(s.kod)}" aria-labelledby="zpOvKartaH">`
    + `<header>${dot(s.kod)}`
    + `<h2 id="zpOvKartaH">${esc(s.zkratka)}</h2><span class="zpc-full">${esc(s.nazev || '')} · kód ${esc(s.kod)}</span></header>`
    + '<dl>'
    + KARTA_RADKY.map((r) => kartaRow(r.dt, r.dd(s))).join('')
    + '</dl>'
    + `<p class="zpc-ov-karta-more"><a href="pojistovna.html?zp=${esc(s.kod)}">Profil ${esc(s.zkratka)} →</a> · `
    + `<a href="pojistovny-kmen.html#zp-${esc(s.kod)}">Karta v tématu Kmen a hospodaření →</a></p>`
    + '</article>';
}

function ovKartaPorovnaniHtml(s, s2) {
  const col = (x, nadpis) => `<div class="zpc-ov-col"><h3 class="zpc-ov-col-h">${dot(x.kod)}${esc(x.zkratka)}<span class="zpc-ov-col-role"> · ${nadpis}</span></h3>`
    + `<dl data-zp="${esc(x.kod)}">${KARTA_RADKY.map((r) => kartaRow(r.dt, r.dd(x))).join('')}</dl></div>`;
  const diffCol = '<div class="zpc-ov-col zpc-ov-col--diff"><h3 class="zpc-ov-col-h">Rozdíl<span class="zpc-ov-col-role"> · moje − porovnat</span></h3>'
    + `<dl class="zpc-ov-diff">${KARTA_RADKY.map((r) => {
      const d = r.diff(s, s2);
      return kartaRow(r.dt, d ? `<span class="zpc-ov-diff-v">${esc(d)}</span>` : '<span class="zpc-na" title="rozdíl nelze spočítat">—</span>');
    }).join('')}</dl></div>`;
  return `<article class="zpc-ov-karta zpc-ov-karta--cmp" data-zp="${esc(s.kod)}" data-zp-porovnat="${esc(s2.kod)}" aria-labelledby="zpOvKartaH">`
    + `<header>${dot(s.kod)}<h2 id="zpOvKartaH">${esc(s.zkratka)} <span class="zpc-vs">vs.</span> ${esc(s2.zkratka)}</h2>`
    + '<span class="zpc-full">Moje pojišťovna a pojišťovna, se kterou ji porovnáváte</span></header>'
    + `<div class="zpc-ov-cmp">${col(s, 'moje')}${col(s2, 'porovnat s')}${diffCol}</div>`
    + `<p class="zpc-ov-karta-more"><a href="pojistovna.html?zp=${esc(s.kod)}&amp;porovnat=${esc(s2.kod)}">Profil ${esc(s.zkratka)} s porovnáním →</a> · `
    + `<a href="pojistovna.html?zp=${esc(s2.kod)}">Profil ${esc(s2.zkratka)} →</a> · `
    + `<a href="pojistovny-kmen.html#zp-${esc(s.kod)}">Karta v tématu Kmen a hospodaření →</a></p>`
    + '</article>';
}

/**
 * Sedm malých karet (bez výběru): tlačítka, klepnutí = výběr „Moje pojišťovna“. S `href` (funkce kód → adresa)
 * jsou to odkazy (rozcestník profilů pojistovna.html).
 */
export function ovMiniKartyHtml(list, { href = null } = {}) {
  const items = (list || []).map((s) => {
    const inner = `<span class="zpc-ov-mini-h">${dot(s.kod)}<b>${esc(s.zkratka)}</b></span>`
      + `<span class="zpc-ov-mini-v">${mil(s.pojistenci)} · ${v1(s.podil, 1, '%')}</span>`;
    return typeof href === 'function'
      ? `<li><a class="zpc-ov-mini" href="${esc(href(s.kod))}" title="Profil ${esc(s.zkratka)}">${inner}</a></li>`
      : `<li><button type="button" class="zpc-ov-mini" data-ov-zp="${esc(s.kod)}" title="Vybrat ${esc(s.zkratka)} jako moji pojišťovnu">${inner}</button></li>`;
  }).join('');
  const aria = typeof href === 'function' ? 'Sedm pojišťoven: profil (odkaz)' : 'Sedm pojišťoven: kmen a podíl na trhu (klepnutím vyberete svou)';
  return `<ul class="zpc-ov-minis" aria-label="${aria}">${items}</ul>`;
}

const OBLAST_KRATKE = {
  prevence: 'Prevence', dostupnost: 'Dostupn.', sit: 'Síť', kvalita: 'Kvalita', servis: 'Servis', hospodareni: 'Hospod.',
};

/** Miniatura semaforu 7 × 6: stav ikonou (+ text pro čtečku), prázdný = „zatím nehodnoceno“. */
export function semaforMiniHtml(d) {
  const oblasti = Array.isArray(d?.oblasti) ? d.oblasti : [];
  const zps = Array.isArray(d?.pojistovny) ? d.pojistovny : [];
  if (!oblasti.length || !zps.length) return '<p class="zpc-na">Semafor se nepodařilo načíst.</p>';
  const sum = semaforSummary(d);
  const stavy = d.stavy_semaforu || {};
  const head = `<tr><th scope="col">Pojišťovna</th>${oblasti.map((o) => `<th scope="col" title="${esc(o.nazev)}"><span aria-hidden="true">${esc(OBLAST_KRATKE[o.id] || o.nazev)}</span><span class="sr-only">${esc(o.nazev)}</span></th>`).join('')}</tr>`;
  const body = zps.map((z) => `<tr data-zp="${esc(z.kod)}"><th scope="row">${dot(z.kod)}${esc(z.zkratka)}</th>${oblasti.map((o) => {
    const cell = semaforCell(z.semafor?.[o.id]?.stav, stavy);
    return `<td data-stav="${esc(cell.key)}" title="${esc(`${z.zkratka} · ${o.nazev}: ${cell.label}`)}">${iconHtml(cell)}<span class="sr-only">${esc(cell.label)}</span></td>`;
  }).join('')}</tr>`).join('');
  const intro = sum.hodnoceno === 0
    ? `<p class="zpc-ov-sem-intro"><b>Zatím nehodnoceno.</b> ${esc(EMPTY_SENTENCE)}</p>`
    : `<p class="zpc-ov-sem-intro">Hodnoceno ${sum.hodnoceno} z ${sum.total} polí.</p>`;
  return `<figure class="zpv zpc-ov-sem"><figcaption class="zpv-cap"><span class="zpv-title">Semafor metodiky</span>`
    + `<span class="zpv-sub">Sedm pojišťoven × šest oblastí, čtyři stavy. Verdikt píše člověk, po právu na odpověď.</span></figcaption>`
    + intro
    + `<div class="zpv-scroll" tabindex="0" role="region" aria-label="Semafor metodiky, miniatura 7 × 6">`
    + `<table class="zpc-ov-semtab"><caption class="sr-only">Stav hodnocení sedmi pojišťoven v šesti oblastech</caption><thead>${head}</thead><tbody>${body}</tbody></table></div></figure>`;
}

/**
 * Semafor na přehledu: do prvních verdiktů jeden řádek „zatím nehodnoceno“ s odkazem
 * na metodiku; jakmile je hodnocené aspoň jedno pole, miniatura 7 × 6.
 */
export function semaforRadekHtml(d) {
  const sum = semaforSummary(d || {});
  const met = zpStrankaById('metodika');
  if (sum.total && sum.hodnoceno > 0) return semaforMiniHtml(d);
  const ic = iconHtml(semaforCell(null, d?.stavy_semaforu));
  return `<p class="zpc-ov-semline">${ic}<span><b>Semafor: zatím nehodnoceno.</b> ${esc(EMPTY_SENTENCE)} `
    + `<a href="${esc(met.href)}">Jak bude hodnocení vznikat →</a></span></p>`;
}

/**
 * Rozcestník podstránek jedné skupiny. `pojistenci` = velké karty (kicker, název, věta, „co tam
 * najdu“); `redakce` = menší karty bez věty (kicker, název, „co tam najdu“) pro samostatný řádek
 * „Pro redakci a data“. Přehled sám se do rozcestníku nedává.
 */
export function temaKartyHtml(skupina = 'pojistenci', stranky = ZP_STRANKY) {
  const mini = skupina === 'redakce';
  return stranky.filter((s) => s.id !== 'prehled' && s.skupina === skupina).map((s) => `<li><a class="zpc-tema-card${mini ? ' zpc-tema-card--mini' : ''}" href="${esc(s.href)}">`
    + `<span class="zpc-tema-kicker">${esc(s.kicker || '')}</span>`
    + `<span class="zpc-tema-title">${esc(s.label)}<span aria-hidden="true">\u00a0→</span></span>`
    + (mini ? '' : `<span class="zpc-tema-veta">${esc(s.veta || '')}</span>`)
    + `<span class="zpc-tema-co">${esc(s.co || '')}</span></a></li>`).join('');
}

function tile(figureHtml, temaId, kotva = '') {
  const s = zpStrankaById(temaId);
  const more = s ? `<a class="zpc-ov-more" href="${esc(s.href)}${kotva ? `#${esc(kotva)}` : ''}">Celé téma<span class="sr-only">: ${esc(s.label)}</span><span aria-hidden="true"> →</span></a>` : '';
  return `<div class="zpc-ov-tile" data-tema="${esc(temaId)}">${figureHtml}${more}</div>`;
}

/**
 * Vstupy přehledu → HTML jednotlivých kontejnerů (bez DOM).
 * @param {{d, a, p, tiles?: Array, kmen?: object, prerozdeleni?: object}} x  kmen = buildKmenCharts(d), tiles = heroTiles(d),
 *   prerozdeleni = data/pojistovny-prerozdeleni.json (bez něj se graf salda vynechá)
 * @returns {{hero: string, grafy: string, semafor: string, temata: string, temataRedakce: string, souhrny: Array}}
 */
export function buildPrehled({ d, a, p, tiles, kmen, prerozdeleni }) {
  // Mřížka 2 × 2: podíl | saldo přerozdělení, náklady | rezervy (na mobilu pod sebe). Všechny čtyři grafy
  // nesou informaci s rozptylem; matice pokrytí VZ a funkce aplikací n/10 byly vyměněny (A0.1)
  // a žijí na podstránkách Prevence a Aplikace a servis.
  // Semafor jde mimo mřížku (#zpOvSemafor), do prvních verdiktů je to jeden řádek.
  const grafy = [];
  if (kmen?.share) {
    grafy.push(tile(segmentedBar(kmen.share.parts, { ...kmen.share.opts, sub: 'Podíl na všech pojištěncích ČR.' }), 'kmen'));
  }
  if (prerozdeleni) {
    const saldo = buildSaldoChart(prerozdeleni);
    grafy.push(tile(rankedBars(saldo.items, saldo.opts), 'penize'));
  }
  if (kmen?.nzs) {
    grafy.push(tile(kmen.nzs.std ? dumbbell(kmen.nzs.dbItems, kmen.nzs.dbOpts) : rankedBars(kmen.nzs.items, kmen.nzs.opts), 'kmen', 'zpChartNzs'));
  }
  if (kmen?.zust) grafy.push(tile(rankedBars(kmen.zust.items, kmen.zust.opts), 'penize', 'hospodareni-2024'));
  return {
    hero: tiles ? statTiles(tiles, { title: 'Klíčová čísla systému' }) : '',
    grafy: grafy.join(''),
    semafor: d ? semaforRadekHtml(d) : '',
    temata: temaKartyHtml('pojistenci'),
    temataRedakce: temaKartyHtml('redakce'),
    souhrny: zpSouhrny(d, a),
  };
}

// ---------------------------------------------------------------- DOM

function mojeKod(doc) {
  const k = doc.querySelector('main')?.getAttribute('data-moje-zp');
  return k && ZP_BY_KOD[k] ? k : null;
}

function porovnatKod(doc) {
  const k = doc.querySelector('main')?.getAttribute('data-porovnat-zp');
  return k && ZP_BY_KOD[k] ? k : null;
}

function paintKarta(doc, souhrny) {
  const host = doc.getElementById('zpOvKarta');
  if (!host) return;
  const kod = mojeKod(doc);
  const s = kod ? souhrny.find((x) => x.kod === kod) : null;
  const por = porovnatKod(doc);
  const s2 = s && por && por !== kod ? souhrny.find((x) => x.kod === por) : null;
  host.innerHTML = s ? ovKartaHtml(s, s2) : ovMiniKartyHtml(souhrny);
  host.classList.toggle('is-vybrano', !!s);
}

/**
 * Vykreslí přehled do #zpHeroStats, #zpOvKarta, #zpOvGrafy, #zpOvSemafor, #zpOvTemata
 * a #zpOvTemataRedakce.
 * Kartu překresluje při změně „Moje pojišťovna“.
 */
export function renderPrehled({ d, a, p, tiles, kmen, prerozdeleni }, doc = globalThis.document) {
  if (!doc) return;
  const out = buildPrehled({ d, a, p, tiles, kmen, prerozdeleni });
  set('zpHeroStats', out.hero);
  set('zpOvGrafy', out.grafy || '<p class="zpc-na">Data srovnávače se nepodařilo načíst.</p>');
  set('zpOvSemafor', out.semafor);
  set('zpOvTemata', out.temata);
  set('zpOvTemataRedakce', out.temataRedakce);
  const host = doc.getElementById('zpOvKarta');
  if (!host) return;
  paintKarta(doc, out.souhrny);
  if (host.dataset.ovInit === '1') return;
  host.dataset.ovInit = '1';
  doc.addEventListener(MOJE_EVENT, () => paintKarta(doc, out.souhrny));
  doc.addEventListener(POROVNAT_EVENT, () => paintKarta(doc, out.souhrny));
  host.addEventListener('click', (e) => {
    const b = e.target.closest ? e.target.closest('button[data-ov-zp]') : null;
    if (!b) return;
    // Výběr jde přes chip „Moje pojišťovna“ (jediný zapisovatel do localStorage).
    doc.querySelector(`#zpMojeZp .zpi-chip[data-zp="${b.getAttribute('data-ov-zp')}"]`)?.click();
  });
}
