// Srovnávač pojišťoven — profil jedné pojišťovny pojistovna.html?zp=111 (balíček A2.3,
// PLAN-SROVNAVAC-ANALYTIK.md § 3).
//
// Jedna stránka, všechny hodnoty jedné pojišťovny: hlavička, klíčová čísla s průměrem sedmi pojišťoven
// či ČR, mini-grafy řad a části témat (kmen, peníze, prevence, aplikace a servis, instituce) s odkazem
// „Celé téma →“. Žádná logika grafů se tu neduplikuje: profil jen skládá `build*` funkce modulů
// pojistovny-penize.js, pojistovny-instituce.js, pojistovny-prevence.js a pojistovny-indikatory.js
// a primitiva src/zp-viz.js. Neplatné nebo chybějící `?zp=` = rozcestník sedmi pojišťoven.
//
// Profil NENÍ téma srovnávače (není v záložkách ZP_STRANKY); orchestruje ho src/pojistovny.js
// (renderProfil) jako ostatní stránky. Výběr „Moje pojišťovna“ profil za čtenáře nenastavuje, jen
// nabízí tlačítko, které klikne na chip.
//
// „Porovnat s“ (A4.2): `?zp=111&porovnat=205` (nebo výběr z localStorage) přidá klíčovým číslům řádek
// „ČPZP: … · rozdíl …“ (porovnatZUrl, porovnejDlazdice); změna chipu překreslí jen dlaždice.
//
// Čisté funkce (testované bez DOM): zpZUrl, profilTiles, porovnejDlazdice, buildKmenKarta, aplikaceKarta, stiznostiKarta,
// fondKarta, profilHtml, rozcestnikHtml, profilTitle. DOM část: renderProfil.

import { esc, fmtKc, dot, set, NA } from './pojistovny-shared.js';
import { statTiles, indexedLines, segmentedBar, dotMatrix, isNum, fmtRozdil, fmtValue } from './zp-viz.js';
import { MOJE_EVENT, POROVNAT_EVENT, porovnatZUrl, readPorovnat } from './zp-interact.js';
import { ZP_BY_KOD, zpColor } from './zp-palette.js';
import {
  buildRadyKarta, buildSegmentyKarta, buildSaldoKarta, statniKarta, crHodnota,
} from './pojistovny-penize.js';
import { organyKarta, programyKarta, dostupnostKarta } from './pojistovny-instituce.js';
import { buildFondParts, buildAppMatrix } from './pojistovny-prevence.js';
import { buildStiznosti } from './pojistovny-indikatory.js';
import { zpSouhrny, ovMiniKartyHtml } from './pojistovny-prehled.js';

const zpList = (X) => (Array.isArray(X?.pojistovny) ? X.pojistovny : []);
const val = (env) => (env && typeof env === 'object' && 'hodnota' in env ? env.hodnota : env);
const NEDOHLEDANO = (txt) => `<p class="zpc-na">${esc(txt)}</p>`;
const fmtN = (v) => (isNum(v) ? fmtKc(Math.round(v)) : null);
const avg = (arr) => { const a = arr.filter(isNum); return a.length ? a.reduce((x, y) => x + y, 0) / a.length : null; };

/** Kód pojišťovny z URL (`?zp=111`); neznámý nebo chybějící = null. */
export function zpZUrl(search) {
  let kod = null;
  try { kod = new URLSearchParams(String(search ?? '')).get('zp'); } catch (_) { kod = null; }
  return kod && ZP_BY_KOD[kod] ? kod : null;
}

/** Titulek stránky: „VZP ČR — profil pojišťovny · Srovnávač pojišťoven“. */
export function profilTitle(kod) {
  const z = ZP_BY_KOD[kod];
  return z ? `${z.zkratka} — profil pojišťovny · Srovnávač pojišťoven, pracovní verze · HSPA Monitor` : 'Profil pojišťovny — Srovnávač pojišťoven, pracovní verze · HSPA Monitor';
}

// ---------------------------------------------------------------- klíčová čísla

/** Popis metody přepočtu nákladů podle stavu obálky *_std_kc (shodně s Kmenem). */
const STD_SLOVO = { 'index-prerozdeleni': 'přepočteno na index přerozdělení', dolozeno: 'standardizováno na věk a pohlaví' };

/**
 * Dlaždice klíčových čísel jedné pojišťovny; meta nese průměr sedmi pojišťoven nebo ČR.
 * @param {string} kod
 * @param {{P: object, PR?: object|null, R?: object|null}} data
 */
export function profilTiles(kod, { P, PR = null, R = null } = {}, porovnat = null) {
  const zps = zpList(P);
  const z = zps.find((x) => String(x.kod) === String(kod));
  if (!z) return [];
  const c = z.crp || {};
  const hs = z.hospodareni || {};
  const sys = P?.system || {};
  const scr = P?.system_crp || {};
  const pm = (v, dec, unit) => (isNum(v) ? `${fmtKc(v, dec)}${unit ? ` ${unit}` : ''}` : 'nedohledáno');
  const tiles = [];

  tiles.push({ value: isNum(c.pojistenci) ? c.pojistenci / 1e6 : null, decimals: 2, unit: 'mil.', label: `pojištěnců (CRP ${c.rok ?? P?.rok_crp ?? '?'})`,
    meta: `průměr sedmi pojišťoven: ${pm(isNum(scr.pojistenci_2025) && zps.length ? scr.pojistenci_2025 / zps.length / 1e6 : null, 2, 'mil.')}` });
  tiles.push({ value: isNum(c.podil_trhu_pct) ? c.podil_trhu_pct : null, decimals: 1, unit: '%', label: 'podíl na trhu',
    meta: `průměr sedmi pojišťoven: ${pm(zps.length ? 100 / zps.length : null, 1, '%')}` });
  tiles.push({ value: isNum(c.podil_65plus_pct) ? c.podil_65plus_pct : null, decimals: 1, unit: '%', label: 'senioři 65+ v kmeni',
    meta: `ČR: ${pm(scr.podil_65plus_pct, 1, '%')}` });

  const st = R ? statniKarta(R, kod) : null;
  const crSt = st ? crHodnota(R, 'statni_pojistenci_pct', st.rok) : null;
  tiles.push({ value: st ? st.hodnota : null, decimals: 1, unit: '%', label: `státní pojištěnci${st ? ` (${st.rok})` : ''}`,
    meta: crSt ? `${crSt.odvozeno ? 'průměr sedmi pojišťoven' : 'ČR'}: ${pm(crSt.value, 1, '%')}` : 'MZ údaj nedohledán' });

  const npp = val(hs.naklady_na_pojistence_kc);
  tiles.push({ value: isNum(npp) ? npp : null, decimals: 0, unit: 'Kč', label: `náklady na pojištěnce ${hs.rok ?? P?.rok_hospodareni ?? '?'}, vykázané`,
    meta: `ČR: ${pm(sys.naklady_zs_na_pojistence_kc, 0, 'Kč')}` });
  const std = hs.naklady_na_pojistence_std_kc;
  const stdOk = std && STD_SLOVO[std.stav] && isNum(std.hodnota);
  tiles.push({ value: stdOk ? std.hodnota : null, decimals: 0, unit: 'Kč', label: 'náklady na pojištěnce, přepočtené',
    meta: stdOk ? `${STD_SLOVO[std.stav]}; není to věková standardizace` : 'standardizace čeká na nákladové indexy' });

  const sa = PR ? buildSaldoKarta(PR, kod) : null;
  tiles.push({ value: sa ? sa.mld : null, decimals: 1, unit: 'mld Kč', label: `relativní saldo přerozdělení${sa ? ` ${sa.rok}` : ''}`,
    meta: sa ? `${sa.pct != null ? `${sa.pct > 0 ? '+' : sa.pct < 0 ? '−' : ''}${fmtKc(Math.abs(sa.pct), 1)} % vybraného pojistného; ` : ''}součet sedmi pojišťoven je nula` : 'nedohledáno' });

  const prov = val(hs.provozni_naklady_pct);
  tiles.push({ value: isNum(prov) ? prov : null, decimals: 1, unit: '%', label: 'výdaje na provoz, % příjmů',
    meta: `průměr sedmi pojišťoven: ${pm(avg(zps.map((x) => val(x.hospodareni?.provozni_naklady_pct))), 1, '%')}` });
  const rez = val(hs.zustatek_2026_pct_vydaju);
  tiles.push({ value: isNum(rez) ? rez : null, decimals: 1, unit: '%', label: 'rezerva na konci roku 2026, % výdajů',
    meta: `průměr sedmi pojišťoven: ${pm(avg(zps.map((x) => val(x.hospodareni?.zustatek_2026_pct_vydaju))), 1, '%')}; kritické pásmo 3–4 %` });
  if (porovnat && String(porovnat) !== String(kod) && ZP_BY_KOD[porovnat]) {
    return porovnejDlazdice(tiles, profilTiles(porovnat, { P, PR, R }), porovnat);
  }
  return tiles;
}

/**
 * K dlaždicím jedné pojišťovny přidá řádek `cmp` s hodnotou druhé a rozdílem (pojišťovna − druhá) ve stejné
 * jednotce; rozdíl jen tam, kde jsou obě hodnoty čísla (procentní řady = procentní body).
 * @param {Array} tiles  dlaždice profilu
 * @param {Array} other  dlaždice druhé pojišťovny (stejné pořadí)
 * @param {string} kodOther
 */
export function porovnejDlazdice(tiles, other, kodOther) {
  const zkr = ZP_BY_KOD[kodOther]?.zkratka || String(kodOther);
  return tiles.map((t, i) => {
    const o = other[i];
    if (!o) return t;
    const dec = Number.isInteger(t.decimals) ? t.decimals : 0;
    const unit = t.unit || '';
    const text = isNum(o.value) ? `${fmtValue(o.value, dec)}${unit ? ` ${unit}` : ''}` : 'nedohledáno';
    const diffUnit = unit === '%' ? 'p. b.' : unit;
    return { ...t, cmp: { kod: kodOther, label: zkr, text, diff: fmtRozdil(t.value, o.value, dec, diffUnit) } };
  });
}

// ---------------------------------------------------------------- mini-grafy a části témat

/** Kmen 2010–2025 jedné pojišťovny a součet sedmi pojišťoven (index 2010 = 100). */
export function buildKmenKarta(P, kod) {
  const zps = zpList(P);
  const z = zps.find((x) => String(x.kod) === String(kod));
  const tr = (z?.crp?.pojistenci_trend || []).map((p) => ({ year: p.year, value: p.insured })).filter((p) => isNum(p.value));
  if (tr.length < 2) return null;
  const byYear = new Map();
  for (const x of zps) for (const p of x.crp?.pojistenci_trend || []) byYear.set(p.year, (byYear.get(p.year) || 0) + (isNum(p.insured) ? p.insured : 0));
  const cr = tr.map((p) => ({ year: p.year, value: byYear.get(p.year) ?? null }));
  const rok0 = tr[0].year;
  return {
    series: [{ kod: z.kod, label: z.zkratka, points: tr }, { key: 'cr', label: 'sedm pojišťoven', points: cr }],
    opts: { title: `Kmen: ${z.zkratka} a součet sedmi pojišťoven ${rok0}–${tr[tr.length - 1].year}`, sub: `Počet pojištěnců, index ${rok0} = 100.`, base: rok0, source: 'ÚZIS · CRP (OIS 11-47)' },
  };
}

/** Řádek aplikace jedné pojišťovny jako dotMatrix (jeden řádek). */
export function aplikaceKarta(A, kod) {
  if (!A) return NEDOHLEDANO('Data o aplikacích zatím nejsou k dispozici.');
  const m = buildAppMatrix(A);
  const rows = m.rows.filter((r) => String(r.kod) === String(kod));
  if (!rows.length) return NEDOHLEDANO('Aplikace této pojišťovny není v datech.');
  return dotMatrix(rows, m.cols, m.cell, {
    title: 'Funkce aplikace', sub: 'Plné kolečko = funkce je dostupná, poloviční = částečně.',
    score: false, source: (A.zdroje || []).map((x) => x.nazev).join('; '), rowHeader: 'Pojišťovna · aplikace',
  });
}

/** Podání k dostupnosti a stížnosti podle § 16a jedné pojišťovny (výroční zprávy). */
export function stiznostiKarta(ST, P, kod) {
  if (!ST || !Array.isArray(ST.pojistovny)) return NEDOHLEDANO('Data o stížnostech zatím nejsou k dispozici.');
  const { roky, rows } = buildStiznosti(ST, P);
  const r = rows.find((x) => x.kod === String(kod));
  if (!r || !r._r) return NEDOHLEDANO('Výroční zprávy této pojišťovny v datech o stížnostech nejsou (nedohledáno).');
  const head = roky.map((y) => `<th scope="col">${esc(y)}</th>`).join('');
  const podani = roky.map((y) => { const x = r.byRok[y]; return `<td>${x ? (x.podani_dostupnost != null ? fmtN(x.podani_dostupnost) : '<span class="zpc-na" title="výroční zpráva počet neuvádí">neuvádí</span>') : NA}</td>`; }).join('');
  const s16 = r.s16a.map((v) => `<td>${v == null ? NA : esc(v)}</td>`).join('');
  return '<div class="zpc-tbl" role="region" tabindex="0" aria-label="Podání k dostupnosti a stížnosti podle § 16a (tabulka, posuvná)"><table>'
    + `<thead><tr><th scope="col" class="zpc-txt"></th>${head}</tr></thead><tbody>`
    + `<tr><th scope="row" class="zpc-txt">Podání k dostupnosti péče</th>${podani}</tr>`
    + `<tr><th scope="row" class="zpc-txt">Stížnosti podle § 16a</th>${s16}</tr></tbody></table></div>`
    + `<p class="zpc-note">${esc(r.definice)}${/[.!?]$/.test(r.definice) ? '' : '.'} Každá pojišťovna počítá něco jiného, čísla se nesrovnávají v žebříčku.</p>`;
}

/** Struktura čerpání fondu prevence jedné pojišťovny (segmentedBar); bez dat věta. */
export function fondKarta(PV, kod) {
  const z = zpList(PV).find((x) => String(x.kod) === String(kod));
  if (!z) return NEDOHLEDANO('Data o prevenci zatím nejsou k dispozici.');
  const d = buildFondParts(z);
  if (!d) return NEDOHLEDANO(`${z.zkratka}: struktura fondu prevence není v dostupných dokumentech.`);
  return segmentedBar(d.parts, {
    title: `Struktura čerpání fondu prevence (${d.jednotka}, ${d.rok ?? ''})`,
    sub: 'Pět největších položek a zbytek jako „Ostatní“.', maxParts: 6, source: `${z.zkratka} · výroční zpráva · ${z.rok_vz}`,
  }) + (d.notes.length ? `<p class="zpc-cap">${esc(d.notes.join(' '))}</p>` : '');
}

// ---------------------------------------------------------------- stránka

const wrapFig = (html) => (html ? `<div class="zpc-chart">${html}</div>` : '');
const sekce = (id, nadpis, telo, odkazy) => `<section class="zpc-prof-sec" id="${id}" aria-labelledby="${id}-h">`
  + `<h3 class="section-title zpc-h3" id="${id}-h"><span>${esc(nadpis)}</span></h3>${telo}`
  + `<p class="zpc-prof-more">${odkazy.map((o) => `<a class="zpc-ov-more" href="${esc(o.href)}">${esc(o.label)}<span aria-hidden="true"> →</span></a>`).join('')}</p></section>`;

/** Programy pro poskytovatele jedné pojišťovny ve sbaleném bloku (u VZP je jich deset). */
function programyBlok(SP, kod) {
  const z = zpList(SP).find((x) => String(x.kod) === String(kod));
  if (!z) return programyKarta(SP, kod);
  return `<details class="zpc-acc"><summary>Programy a odkazy<span class="zpc-n"> · ${(z.programy || []).length}</span></summary><div class="zpc-acc-body">${programyKarta(SP, kod)}</div></details>`
    + '<p class="zpc-note">Existence programu není jeho účinek; hodnocení kvality vzniká až v semaforu po právu pojišťovny na odpověď.</p>';
}

/** Hlavička profilu: tečka a zkratka, název, identifikace, tlačítko „Nastavit jako moji pojišťovnu“. */
export function hlavickaHtml(kod, { P = null, I = null } = {}) {
  const zp = ZP_BY_KOD[kod];
  const iz = zpList(I).find((x) => String(x.kod) === String(kod)) || null;
  const pz = zpList(P).find((x) => String(x.kod) === String(kod)) || null;
  const web = iz?.weby?.hlavni || pz?.web || null;
  const row = (dt, dd) => `<div><dt>${dt}</dt><dd>${dd}</dd></div>`;
  const puvod = { statni: 'státní', resortni: 'resortní', podnikova: 'podniková', oborova: 'oborová' }[iz?.vznik?.puvod] || iz?.vznik?.puvod || '';
  const slouceni = iz?.vznik?.sloucene?.length ? `, po sloučení ${iz.vznik.sloucene.length === 1 ? 'jedné pojišťovny' : `${iz.vznik.sloucene.length} pojišťoven`}` : '';
  return `<header class="zpc-prof-head" data-zp="${esc(kod)}" style="--c:${zpColor(kod)}">`
    + `<div class="zpc-prof-id">${dot(kod)}<p class="zpc-prof-nazev">${esc(iz?.nazev || pz?.nazev || zp.nazev)}</p></div>`
    + '<dl class="zpc-prof-dl">'
    + row('Kód', esc(kod))
    + row('IČO', iz?.ico ? esc(iz.ico) : NA)
    + row('Web', web ? `<a href="${esc(web)}" rel="noopener">${esc(String(web).replace(/^https?:\/\/(www\.)?/, ''))}</a>` : NA)
    + row('Zákon', iz?.zakon?.cislo ? esc(iz.zakon.cislo) : NA)
    + row('Vznik', iz?.vznik?.rok ? `${esc(iz.vznik.rok)}, ${esc(puvod)}${esc(slouceni)}` : NA)
    + row('Členství', iz?.clenstvi?.length ? esc(iz.clenstvi.map((c) => c.nazev.replace(/,\s*z\.s\.$/, '')).join(', ')) : NA)
    + '</dl>'
    + `<p class="zpc-prof-akce"><button type="button" class="zpc-chip zpc-prof-moje" data-prof-moje="${esc(kod)}">Nastavit jako moji pojišťovnu</button></p></header>`;
}

/** Klíčová čísla profilu v obalu, který při změně „Porovnat s“ překreslíme samostatně. */
export function tilesHtml(kod, data = {}, porovnat = null) {
  const zp = ZP_BY_KOD[kod];
  const { P, PR = null, R = null } = data;
  if (!zp || !P) return '';
  const cmp = porovnat && String(porovnat) !== String(kod) && ZP_BY_KOD[porovnat] ? porovnat : null;
  return `<div data-prof-tiles${cmp ? ` data-porovnat="${esc(cmp)}"` : ''}>${statTiles(profilTiles(kod, { P, PR, R }, cmp), { title: `Klíčová čísla: ${zp.zkratka}${cmp ? ` a ${ZP_BY_KOD[cmp].zkratka}` : ''}` })}</div>`;
}

/**
 * Celé tělo profilu jedné pojišťovny jako HTML (bez DOM).
 * @param {string} kod
 * @param {{P, A?, PV?, PR?, R?, S?, I?, SP?, D?, ST?}} data  P = data/pojistovny.json (povinné); ostatní nepovinné
 */
export function profilHtml(kod, data = {}, porovnat = null) {
  const { P, A = null, PV = null, PR = null, R = null, S = null, I = null, SP = null, D = null, ST = null } = data;
  const zp = ZP_BY_KOD[kod];
  if (!zp || !P) return NEDOHLEDANO('Základní dataset srovnávače se nepodařilo načíst.');
  const tiles = tilesHtml(kod, data, porovnat);

  const kmen = buildKmenKarta(P, kod);
  const kmenS = sekce('prof-kmen', 'Kmen', tiles + (kmen ? wrapFig(indexedLines(kmen.series, kmen.opts)) : NEDOHLEDANO('Vývoj kmene nedohledán.')),
    [{ href: `pojistovny-kmen.html#zp-${kod}`, label: 'Celé téma: Kmen a hospodaření' }]);

  const nakl = R ? buildRadyKarta(R, 'naklady_na_pojistence_kc', kod) : null;
  const seg = S ? buildSegmentyKarta(S, kod) : null;
  const penizeS = sekce('prof-penize', 'Peníze',
    `<div class="zpc-charts">${nakl ? wrapFig(indexedLines(nakl.series, nakl.opts)) : NEDOHLEDANO('Řada nákladů na pojištěnce nedohledána.')}`
    + `${seg ? wrapFig(segmentedBar(seg.parts, seg.opts)) : NEDOHLEDANO('Náklady podle segmentů nedohledány.')}</div>`,
    [{ href: 'pojistovny-penize.html', label: 'Celé téma: Peníze' }]);

  const prevS = sekce('prof-prevence', 'Prevence', fondKarta(PV, kod),
    [{ href: 'pojistovny-prevence.html', label: 'Celé téma: Prevence' }]);

  const appS = sekce('prof-aplikace', 'Aplikace a servis', aplikaceKarta(A, kod) + stiznostiKarta(ST, P, kod),
    [{ href: 'pojistovny-aplikace.html', label: 'Celé téma: Aplikace a servis' }]);

  const instS = sekce('prof-instituce', 'Instituce',
    `<h4 class="zpc-inst-h4">Orgány a dohled</h4>${organyKarta(I, kod)}`
    + `<h4 class="zpc-inst-h4">Smluvní programy pro poskytovatele</h4>${programyBlok(SP, kod)}`
    + `<h4 class="zpc-inst-h4">Dostupnost péče</h4>${dostupnostKarta(D, kod)}`
    + `<h4 class="zpc-inst-h4">Síť smluvních odborností</h4><p class="zpc-note">Podíl evidovaných míst poskytování, na nichž má ${esc(zp.zkratka)} smluvní zařízení, je jen horní odhad; srovnání sedmi pojišťoven a omezení metody jsou na stránce Instituce.</p>`,
    [{ href: 'pojistovny-instituce.html', label: 'Celé téma: Instituce' }, { href: 'pojistovny-instituce.html#sit-odbornosti', label: 'Síť odborností' }]);

  return hlavickaHtml(kod, { P, I }) + kmenS + penizeS + prevS + appS + instS;
}

/** Rozcestník sedmi pojišťoven (neplatné nebo chybějící `?zp=`). */
export function rozcestnikHtml(P, A = null) {
  const souhrny = zpSouhrny(P, A);
  if (!souhrny.length) return NEDOHLEDANO('Základní dataset srovnávače se nepodařilo načíst.');
  return `<p class="zpc-lead">Vyberte pojišťovnu. Profil sdružuje na jedné stránce její kmen, peníze, prevenci, aplikaci, orgány a dostupnost a vždy vede na celé téma.</p>`
    + ovMiniKartyHtml(souhrny, { href: (k) => `pojistovna.html?zp=${k}` });
}

// ---------------------------------------------------------------- DOM

const mojeKod = (doc) => {
  const k = doc?.querySelector?.('main')?.getAttribute?.('data-moje-zp');
  return k && ZP_BY_KOD[k] ? k : null;
};

function syncTlacitko(doc, kod) {
  const b = doc.querySelector('[data-prof-moje]');
  if (!b) return;
  const moje = mojeKod(doc) === kod;
  b.disabled = moje;
  b.setAttribute('aria-pressed', moje ? 'true' : 'false');
  b.textContent = moje ? 'Toto je vaše pojišťovna' : 'Nastavit jako moji pojišťovnu';
}

/**
 * Pojišťovna „Porovnat s“ pro profil: `?porovnat=` v URL má přednost, pak stav stránky (main[data-porovnat-zp]),
 * pak localStorage. Totožná s profilovanou pojišťovnou nebo neplatná = null.
 */
export function porovnatProProfil(kod, { search = '', attr = null, storage } = {}) {
  const kandidat = porovnatZUrl(search) || (attr && ZP_BY_KOD[attr] ? attr : null) || (storage !== undefined ? readPorovnat(storage) : null);
  return kandidat && kandidat !== kod ? kandidat : null;
}

/**
 * Vykreslí profil (nebo rozcestník) do #zpProfil, nastaví nadpis a titulek stránky.
 * @param {{kod?: string|null, data: object}} x  kod z `zpZUrl(location.search)`
 */
export function renderProfil({ kod = null, data = {} } = {}, doc = globalThis.document) {
  if (!doc) return;
  const platny = kod && ZP_BY_KOD[kod] ? kod : null;
  const h1 = doc.getElementById('zpProfilHead');
  if (h1) h1.textContent = platny ? `${ZP_BY_KOD[platny].zkratka} — profil pojišťovny` : 'Profil pojišťovny';
  try { doc.title = profilTitle(platny); } catch (_) { /* titulek je vylepšení */ }
  let storage;
  try { storage = globalThis.localStorage || null; } catch (_) { storage = null; }
  const stavPorovnat = () => porovnatProProfil(platny, {
    search: globalThis.location ? globalThis.location.search : '',
    attr: doc.querySelector?.('main')?.getAttribute?.('data-porovnat-zp') || null,
    storage,
  });
  set('zpProfil', platny ? profilHtml(platny, data, stavPorovnat()) : rozcestnikHtml(data.P, data.A));
  if (!platny) return;
  syncTlacitko(doc, platny);
  const host = doc.getElementById('zpProfil');
  if (host && host.dataset.profInit !== '1') {
    host.dataset.profInit = '1';
    host.addEventListener('click', (e) => {
      const b = e.target.closest ? e.target.closest('button[data-prof-moje]') : null;
      if (!b) return;
      // Výběr jde přes chip „Moje pojišťovna“ (jediný zapisovatel do localStorage).
      doc.querySelector(`#zpMojeZp .zpi-chip[data-zp="${b.getAttribute('data-prof-moje')}"]`)?.click();
    });
    doc.addEventListener(MOJE_EVENT, () => syncTlacitko(doc, platny));
    // Změna „Porovnat s“ překreslí jen klíčová čísla (rozbalené bloky zůstanou)
    doc.addEventListener(POROVNAT_EVENT, (e) => {
      const box = host.querySelector('[data-prof-tiles]');
      if (!box) return;
      const por = e.detail && e.detail.kod && e.detail.kod !== platny ? e.detail.kod : null;
      const novy = tilesHtml(platny, data, por);
      if (!novy) return;
      box.outerHTML = novy;
    });
  }
}
