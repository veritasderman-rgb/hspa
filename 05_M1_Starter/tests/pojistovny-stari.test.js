// Testy „Stáří dat na jednom místě“ (src/pojistovny-stari.js): registr řádků čte roky a data za běhu
// z datasetů, které stránka načítá; řádek bez datasetu se vynechá; míchání dvou roků téže veličiny
// dává varování; věta „Data: …“ a sbalený blok nad patičkou Zdroje na každé podstránce.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  stariRadky, stariVarovani, stariVeta, stariVetaHtml, stariDatHtml, renderStariDat,
  STARI_REGISTR, STARI_DOPLNEK, ZP_DATASETY,
} from '../src/pojistovny-stari.js';
import { stariDatHtml as stariZShellu, ZP_STRANKY } from '../src/pojistovny-shell.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const json = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'data', f), 'utf8'));
const DS = {
  pojistovny: json('pojistovny.json'),
  prevence: json('pojistovny-prevence.json'),
  aplikace: json('pojistovny-aplikace.json'),
  otazky: json('pojistovny-otazky.json'),
  sit: json('pojistovny-sit.json'),
  stiznosti: json('pojistovny-stiznosti.json'),
  opendata: json('pojistovny-opendata.json'),
  vek: json('pojistovny-vek.json'),
};
// stránka Peníze (A1.6): tři nové datasety
const DS_PENIZE = {
  ...DS,
  prerozdeleni: json('pojistovny-prerozdeleni.json'),
  hospodareniRady: json('pojistovny-hospodareni-rady.json'),
  segmenty: json('pojistovny-segmenty.json'),
};
const copy = (o) => JSON.parse(JSON.stringify(o));
const count = (s, re) => (s.match(re) || []).length;
const radek = (strana, id, ds = DS) => stariRadky(ds, strana).find((r) => r.id === id);

test('registr: každý dataset má URL, každý řádek stránku z ZP_STRANKY, shell funkci re-exportuje', () => {
  for (const r of STARI_REGISTR) {
    assert.ok(ZP_DATASETY[r.dataset], r.id);
    assert.ok(r.stranky.every((s) => ZP_STRANKY.some((x) => x.id === s)), `${r.id}: stranky`);
    assert.ok(fs.existsSync(path.join(ROOT, ZP_DATASETY[r.dataset])), ZP_DATASETY[r.dataset]);
  }
  assert.equal(stariZShellu, stariDatHtml);
  for (const [strana, names] of Object.entries(STARI_DOPLNEK)) {
    assert.ok(ZP_STRANKY.some((x) => x.id === strana), strana);
    for (const n of names) assert.ok(ZP_DATASETY[n], n);
  }
});

test('řádky: roky a data se čtou z datasetů (žádné natvrdo), stav obsahuje datum sestavení', () => {
  assert.equal(radek('kmen', 'crp').kDatu, String(DS.pojistovny.rok_crp));
  assert.equal(radek('kmen', 'hosp').kDatu, String(DS.pojistovny.rok_hospodareni));
  assert.match(radek('kmen', 'crp').stav, /pracovní návrh · soubor sestaven 2\. 11\. 2026/);
  assert.match(radek('kmen', 'hosp25').stav, /u 3 ze 7 pojišťoven \(VZP ČR, VoZP, OZP\)/);
  assert.equal(radek('kmen', 'sit').kDatu, '31. 12. 2024', 'ref_datum jako české datum');
  assert.equal(radek('kmen', 'zpp').kDatu, '2026 (plán)');
  assert.equal(radek('prevence', 'prevence').kDatu, '2024 (OZP 2025, ZPŠ 2020)');
  assert.match(radek('prevence', 'prevence').stav, /rešerše webů 2\. 11\. 2026/);
  assert.equal(radek('aplikace', 'aplikace').kDatu, '2024–2026');
  assert.equal(radek('gramotnost', 'otazky').kDatu, '2. 11. 2026');
  assert.match(radek('gramotnost', 'otazky').stav, /^verze /);
  assert.match(radek('aplikace', 'stiznosti').kDatu, /^stav k 2\. 11\. 2026 \(VZ 20\d\d–20\d\d\)$/);
  assert.equal(radek('aplikace', 'opendata').kDatu, 'stav k 2. 11. 2026');
  // změna v datech = změna v řádku
  const d2 = copy(DS);
  d2.pojistovny.rok_crp = 2026;
  d2.pojistovny.rok_hospodareni = 2025;
  assert.equal(radek('kmen', 'crp', d2).kDatu, '2026');
  assert.equal(radek('kmen', 'hosp', d2).kratce, 'MZ 2025');
  d2.prevence.pojistovny.forEach((z) => { z.rok_vz = 2025; z.reserse.datum = '2026-10-14'; });
  assert.equal(radek('prevence', 'prevence', d2).kDatu, '2025');
  assert.match(radek('prevence', 'prevence', d2).stav, /rešerše webů 14\. 10\. 2026/);
  d2.prevence.pojistovny[0].reserse.datum = '2026-10-20';
  assert.match(radek('prevence', 'prevence', d2).stav, /rešerše webů 14\. 10\. 2026 až 20\. 10\. 2026/);
  d2.sit.ref_datum = '2025-06-30';
  d2.sit.rok = 2025;
  assert.equal(radek('kmen', 'sit', d2).kDatu, '30. 6. 2025');
  assert.equal(radek('kmen', 'sit', d2).kratce, 'NRPZS 2025');
});

test('řádky: stránka dostane jen řádky svých datasetů; co stránka nenačítá, se vynechá', () => {
  const ids = (s, ds = DS) => stariRadky(ds, s).map((r) => r.id);
  assert.deepEqual(ids('prehled'), ['crp', 'hosp', 'zpp', 'prevence', 'aplikace']);
  assert.deepEqual(ids('kmen'), ['crp', 'hosp', 'hosp25', 'zpp', 'sit']);
  assert.deepEqual(ids('prevence'), ['prevence']);
  assert.deepEqual(ids('aplikace'), ['aplikace', 'stiznosti', 'opendata']);
  assert.deepEqual(ids('gramotnost'), ['aplikace', 'otazky']);
  assert.deepEqual(ids('metodika'), ['otazky']);
  assert.deepEqual(ids('indikatory'), []);
  // dataset nenačten (null/undefined) → řádek mizí
  assert.deepEqual(ids('kmen', { pojistovny: DS.pojistovny }), ['crp', 'hosp', 'hosp25', 'zpp']);
  assert.deepEqual(ids('prehled', { pojistovny: DS.pojistovny, prevence: null }), ['crp', 'hosp', 'zpp']);
  assert.deepEqual(ids('prevence', {}), []);
  // věkovou strukturu zatím nenačítá žádná stránka; bez `strana` ale funkce řádek umí
  for (const s of ZP_STRANKY) assert.ok(!ids(s.id).includes('vek'), s.id);
  assert.equal(stariRadky({ vek: DS.vek }).find((r) => r.id === 'vek').kDatu, String(DS.vek.rok));
  // chybný/prázdný dataset nespadne
  assert.deepEqual(stariRadky(null, 'kmen'), []);
  assert.deepEqual(stariRadky({ pojistovny: {}, prevence: { pojistovny: [] }, aplikace: {}, sit: {} }, null), []);
});

test('věta „Data: …“ pod nadpisem: zkratka + rok z téhož registru', () => {
  assert.equal(stariVeta(stariRadky(DS, 'kmen')), 'Data: CRP 2025 · MZ 2024 · VZ 2025 · ZPP 2026 · NRPZS 2024');
  assert.equal(stariVeta(stariRadky(DS, 'prevence')), 'Data: VZ 2024 (OZP 2025, ZPŠ 2020)');
  assert.match(stariVeta(stariRadky(DS, 'prehled')), /^Data: CRP 2025 · MZ 2024 · ZPP 2026 · VZ 2024 /);
  assert.equal(stariVeta([]), '');
  assert.equal(stariVetaHtml([]), '');
  assert.equal(stariVetaHtml(stariRadky(DS, 'aplikace')), '<p class="zpc-stari">Data: aplikace 2024–2026 · stížnosti k 2. 11. 2026 · open data k 2. 11. 2026</p>');
  // každá podstránka má větu, kromě Indikátorů (inventář bez vlastních dat, A0.5)
  for (const s of ZP_STRANKY.filter((x) => x.id !== 'indikatory')) assert.match(stariVeta(stariRadky(DS_PENIZE, s.id)), /^Data: \S/, s.id);
  assert.equal(stariVeta(stariRadky(DS, 'indikatory')), '');
});

test('varování: míchají se dva roky téže veličiny (náklady 2024 a 2025; VZ o prevenci 2020/2024/2025)', () => {
  const kmen = stariVarovani(stariRadky(DS, 'kmen'));
  assert.equal(kmen.length, 1);
  assert.match(kmen[0], /^Příjmy, náklady a hospodářský výsledek jsou na této stránce z více let \(2024 a 2025\): MZ 2024 · VZ 2025\./);
  assert.match(kmen[0], /porovnávejte jen v rámci jednoho roku/);
  const prev = stariVarovani(stariRadky(DS, 'prevence'));
  assert.equal(prev.length, 1);
  assert.match(prev[0], /Odpovědi z výročních zpráv o prevenci .* \(2020, 2024 a 2025\): VZ 2024 \(OZP 2025, ZPŠ 2020\)/);
  // různé veličiny (kmen 2025 × hospodaření 2024) varování nevyvolají
  assert.deepEqual(stariVarovani(stariRadky(DS, 'kmen').filter((r) => ['crp', 'hosp', 'zpp'].includes(r.id))), []);
  assert.deepEqual(stariVarovani(stariRadky(DS, 'aplikace')), []);
  assert.deepEqual(stariVarovani(stariRadky(DS, 'indikatory')), []);
  // stejný rok všude = bez varování
  const d2 = copy(DS);
  d2.prevence.pojistovny.forEach((z) => { z.rok_vz = 2024; });
  d2.pojistovny.pojistovny.forEach((z) => { z.hospodareni_2025 = null; });
  assert.deepEqual(stariVarovani(stariRadky(d2, 'prevence')), []);
  assert.deepEqual(stariVarovani(stariRadky(d2, 'kmen')), []);
  assert.deepEqual(stariVarovani(null), []);
});

test('blok: sbalený <details> s tabulkou dataset · k datu/rok · zdroj · stav a varováním', () => {
  const html = stariDatHtml(DS, { strana: 'kmen' });
  assert.match(html, /^<details class="zpc-acc zpc-stari-acc"><summary>Stáří dat na této stránce<span class="zpc-n"> · 5 · míchají se roky<\/span><\/summary>/);
  assert.doesNotMatch(html, /<details[^>]* open/);
  assert.equal(count(html, /<tr data-stari="/g), 5);
  for (const h of ['Dataset', 'K datu / rok', 'Zdroj', 'Stav']) assert.match(html, new RegExp(`<th scope="col" class="zpc-txt">${h}</th>`));
  assert.match(html, /<p class="zpc-stari-warn" role="note"><b>Pozor, míchají se roky\.<\/b> Příjmy, náklady/);
  assert.match(html, /role="region" tabindex="0" aria-label="Stáří dat na této stránce \(tabulka, posuvná\)"/);
  assert.match(html, /<tr data-stari="sit"><th scope="row" class="zpc-txt">Síť smluvních odborností<\/th><td class="zpc-txt">31\. 12\. 2024<\/td>/);
  // stránka bez míchání roků: bez varování i bez poznámky v summary
  const apl = stariDatHtml(DS, { strana: 'aplikace' });
  assert.match(apl, /<span class="zpc-n"> · 3<\/span>/);
  assert.doesNotMatch(apl, /zpc-stari-warn|míchají/);
  // bez řádků nic
  assert.equal(stariDatHtml({}, { strana: 'kmen' }), '');
  assert.equal(stariDatHtml(null), '');
  // escapování hodnot z dat
  const d3 = copy(DS);
  d3.pojistovny.pojistovny[0].zkratka = '<img src=x>';
  d3.pojistovny.pojistovny.forEach((z) => { z.hospodareni_2025 = { x: { rok: 2025 } }; });
  assert.doesNotMatch(stariDatHtml(d3, { strana: 'kmen' }), /<img/);
});

test('DOM: věta jde pod .zpc-mod-head (na přehledu do hero), blok před #zpZdroje; přerenderování nezdvojí', async () => {
  const mk = () => {
    const ins = [];
    const mod = { insertAdjacentHTML: (pos, h) => ins.push(['head', pos, h]) };
    const hero = { insertAdjacentHTML: (pos, h) => ins.push(['hero', pos, h]) };
    const wrap = { id: 'zpStari', className: '', innerHTML: '' };
    const foot = { parentNode: { insertBefore: (n, ref) => { ins.push(['wrap', n.id, ref === foot]); } } };
    let created = null;
    let old = null;
    const doc = {
      getElementById: (id) => (id === 'zpZdroje' ? foot : id === 'zpStari' ? created : id === 'zpShell' ? { dataset: { aktivni: 'prevence' } } : null),
      querySelector: (s) => (s === 'p.zpc-stari' ? old : s === '.zpc-mod-head' ? mod : s === '.ed-hero-content' ? hero : null),
      createElement: () => { created = wrap; return wrap; },
    };
    return { doc, ins, wrap, setOld: (o) => { old = o; } };
  };
  const a = mk();
  const out = await renderStariDat({ datasety: DS, doc: a.doc });
  assert.equal(out.radky.length, 1);
  assert.equal(out.varovani.length, 1);
  assert.deepEqual(a.ins[0], ['head', 'afterend', '<p class="zpc-stari">Data: VZ 2024 (OZP 2025, ZPŠ 2020)</p>']);
  assert.deepEqual(a.ins[1], ['wrap', 'zpStari', true]);
  assert.match(a.wrap.innerHTML, /^<details class="zpc-acc zpc-stari-acc">/);
  assert.equal(a.wrap.className, 'zpc-stari-wrap');
  // existující věta se odstraní (nezdvojí se)
  const b = mk();
  let removed = false;
  b.setOld({ remove: () => { removed = true; } });
  await renderStariDat({ datasety: DS, strana: 'prevence', doc: b.doc });
  assert.ok(removed);
  // bez dokumentu nic
  assert.deepEqual(await renderStariDat({ datasety: DS, doc: null }), { radky: [], varovani: [] });
});

test('init: orchestrátor volá renderStariDat s načtenými datasety; CSS tříd je dost', () => {
  const src = fs.readFileSync(path.join(ROOT, 'src', 'pojistovny.js'), 'utf8');
  assert.match(src, /import \{ renderStariDat \} from '\.\/pojistovny-stari\.js'/);
  assert.match(src, /renderStariDat\(\{ datasety: \{ pojistovny: d, prevence: p, aplikace: a, otazky: o, prerozdeleni: pr, hospodareniRady: rady, segmenty: seg \} \}\)/);
  const css = fs.readFileSync(path.join(ROOT, 'src', 'styles.css'), 'utf8');
  for (const c of ['.zpc-stari{', '.zpc-stari-wrap{', '.zpc-stari-warn{', '.zpc-stari-acc']) assert.ok(css.includes(c), c);
  // všech sedm stránek má kontejner #zpZdroje, před který se blok vkládá
  for (const s of ZP_STRANKY) {
    const html = fs.readFileSync(path.join(ROOT, s.href), 'utf8');
    assert.match(html, /id="zpZdroje"/, s.href);
  }
});

test('Peníze (A1.6): řádky hospodareniRady, prerozdeleni a segmenty se čtou z datasetů; přerozdělení i na přehledu', () => {
  const pen = stariRadky(DS_PENIZE, 'penize');
  assert.deepEqual(pen.map((r) => r.id), ['hospodareniRady', 'prerozdeleni', 'segmenty']);
  assert.equal(pen[0].kDatu, '2015–2024');
  assert.equal(pen[0].kratce, 'MZ 2015–2024');
  assert.match(pen[1].kDatu, /^1\/2019–\d{1,2}\/20\d\d$/);
  assert.match(pen[1].stav, /roční saldo za 20\d\d/);
  assert.equal(pen[2].kDatu, '2015–2024');
  assert.ok(radek('prehled', 'prerozdeleni', DS_PENIZE));
  assert.ok(radek('kmen', 'hospodareniRady', DS_PENIZE), 'státní pojištěnci v kartě Kmene');
  // bez datasetu se řádek vynechá; roky řad se nemíchají s hospodařením 2024 (bez varování)
  assert.equal(stariRadky(DS, 'penize').length, 0);
  assert.deepEqual(stariVarovani(stariRadky(DS_PENIZE, 'penize')), []);
  assert.equal(stariRadky({ ...DS_PENIZE, segmenty: null }, 'penize').length, 2);
  for (const n of ['hospodareniRady', 'prerozdeleni', 'segmenty']) assert.ok(fs.existsSync(path.join(ROOT, ZP_DATASETY[n])), n);
});
