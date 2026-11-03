// Testy balíčku A1.1: parsery Hodnocení MZ (ingest/lib/mz-hodnoceni.js), transform řad hospodaření a validátor.
// Parsery běží nad malými výřezy skutečných listů (tests/fixtures/mz-hodnoceni/*.json) a PDF textu (*.txt).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import {
  parseLinks, parseTab1, parseTab1a, parseTab1c, parseTab3Celkem, parseTab3c, parseTabZpRadek, parseTab7, parseTab4Vydaje, parseTab17, parseTab16, vyberTab16,
  rozdelCisla, findSheet, colLetter,
} from '../ingest/lib/mz-hodnoceni.js';
import { validateHospodareniRady } from '../ingest/lib/validate-hospodareni-rady.js';
import { run, sestavRady, serializuj, bezCasu } from '../ingest/transform_pojistovny_hospodareni_rady.js';
import { fetchMzHodnoceni } from '../ingest/fetchers/mz-hodnoceni.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const FX = path.join(here, 'fixtures', 'mz-hodnoceni');
const rows = (n) => JSON.parse(fs.readFileSync(path.join(FX, n), 'utf8')).rows;
const txt = (n) => fs.readFileSync(path.join(FX, n), 'utf8');
const REAL = path.join(here, '..', 'data', 'pojistovny-hospodareni-rady.json');
const real = () => JSON.parse(fs.readFileSync(REAL, 'utf8'));

test('parseLinks: vytáhne pdf a oba xlsx z HTML, bez duplicit, relativní URL zdomácní', () => {
  const l = parseLinks(txt('page-links.html'));
  assert.equal(l.length, 7);
  assert.deepEqual(l.map((x) => x.rok), [2023, 2023, 2023, 2024, 2024, 2024, 2025]);
  assert.deepEqual(l.slice(0, 3).map((x) => x.typ), ['pdf', 'xlsx-1', 'xlsx-3']);
  assert.equal(l[3].url, 'https://mzd.gov.cz/wp-content/uploads/2024/06/vz2024_hodnoceni.pdf');
  assert.equal(l[6].url, 'https://mzd.gov.cz/wp-content/uploads/2025/06/vz2025_hodnoceni.pdf');
});

test('findSheet a colLetter', () => {
  assert.equal(findSheet(['tab.č.1', 'tab.č.1a', 'tab. č. 1d'], 'Tab. č. 1d'), 'tab. č. 1d');
  assert.equal(findSheet(['tab.č.1', 'tab.č.1a'], 'tab. č.1'), 'tab.č.1');
  assert.equal(colLetter(0), 'A');
  assert.equal(colLetter(26), 'AA');
});

test('parseTab1 2024: VZP má kontrolní součty, řádek a sloupec', () => {
  const { polozky: p, chyby } = parseTab1(rows('tab1-2024.json'), { rok: 2024 });
  assert.deepEqual(chyby, []);
  assert.deepEqual(p.pojistenci_prumer['111'], { hodnota: 6150186, radek: 7, sloupec: 'D' });
  assert.equal(p.zamestnanci['111'].hodnota, 3554);
  assert.equal(p.prijmy_celkem['111'].hodnota, 297743818);
  assert.equal(p.pojistne_vybrane['111'].hodnota, 189756319);
  assert.equal(p.pojistne_po_prerozdeleni['111'].hodnota, 293134759);
  assert.equal(p.saldo_celkem['111'].hodnota, -6419891);
  assert.equal(p.zavazky_po_lhute['201'].hodnota, 602149);
  assert.equal(p.pohledavky_po_lhute['111'].hodnota, 11434467);
  assert.equal(p.pojistenci_prumer.cr.hodnota, 10844507);
  assert.equal(p.pojistenci_prumer.zzp.hodnota, 4694321);
  // Část B (druhý blok se stejnými kódy) se nezapočítá
  assert.equal(Object.keys(p.pojistenci_prumer).length, 9);
});

test('parseTab1 2015: posunuté sloupce (sloupec ČKA, jiné pořadí ZPP) se najdou podle hlavičky', () => {
  const { polozky: p, chyby } = parseTab1(rows('tab1-2015.json'), { rok: 2015 });
  assert.deepEqual(chyby, []);
  assert.equal(p.pojistenci_prumer['111'].hodnota, 5932825);
  assert.equal(p.pojistenci_prumer['111'].sloupec, 'D');
  assert.equal(p.zamestnanci['111'].hodnota, 3557);
  assert.equal(p.pojistne_vybrane['111'].hodnota, 103149224);
  assert.equal(p.pojistne_po_prerozdeleni['111'].hodnota, 153427031);
  assert.equal(p.saldo_celkem['111'].hodnota, 1674399);
  assert.equal(p.pohledavky_po_lhute['111'].hodnota, 7381573);
});

test('parseTab1 vyhodí chybu bez hlavičky a hlásí rok, který v listu není', () => {
  assert.throws(() => parseTab1([[1, 2]], { rok: 2024 }), /Kód/);
  const { chyby } = parseTab1(rows('tab1-2024.json'), { rok: 2030 });
  assert.ok(chyby.length > 5);
});

test('parseTab1c: „vliv přerozdělování“ = po přerozdělení − vybrané (tab.č.1)', () => {
  for (const rok of [2015, 2024]) {
    const c = parseTab1c(rows(`tab1c-${rok}.json`), { rok });
    const { polozky: p } = parseTab1(rows(`tab1-${rok}.json`), { rok });
    for (const k of ['111', '201', '205', '207', '209', '211', '213', 'cr']) {
      assert.equal(c[k].hodnota, p.pojistne_po_prerozdeleni[k].hodnota - p.pojistne_vybrane[k].hodnota, `${rok} ${k}`);
    }
  }
  assert.equal(parseTab1c(rows('tab1c-2024.json'), { rok: 2024 })['111'].hodnota, 103378440);
});

test('parseTab1a, 1b, 1d', () => {
  const a = parseTab1a(rows('tab1a-2024.json'), { rok: 2024 });
  assert.equal(a.limit_tis['111'].hodnota, 8568966);
  assert.equal(a.prideleno_tis['111'].hodnota, 4002822);
  assert.equal(a.limit_tis.cr.hodnota, 14854621.438000001);
  assert.equal(parseTab1a(rows('tab1a-2015.json'), { rok: 2015 }).limit_tis['111'].hodnota, 4497853);
  const b = parseTabZpRadek(rows('tab1b-2024.json'), /^kz na bankovním účtu zfzp/i);
  assert.equal(b['111'].hodnota, 11121295); // první blok = rok 2024, ne 2023 (15 282 305)
  assert.equal(b.cr.hodnota, 15083862);
  assert.equal(parseTabZpRadek(rows('tab1b-2015.json'), /^kz na bankovním účtu zfzp/i)['111'].hodnota, 907532);
  const d = parseTabZpRadek(rows('tab1d-2024.json'), /^a\.\s*skutečné naplnění/i);
  assert.equal(d['111'].hodnota, 3911381);
  assert.equal(d['211'].hodnota, 811800);
});

test('parseTab3Celkem (3 a 3a) v obou rozloženích sloupců', () => {
  const t = parseTab3Celkem(rows('tab3-2024.json'), { rok: 2024 });
  assert.deepEqual(t['111'], { hodnota: 295195275, radek: 7, sloupec: 'F' });
  assert.equal(t.cr.hodnota, 504580699);
  assert.equal(t.zzp.hodnota, 209385424);
  assert.ok(Math.abs(parseTab3Celkem(rows('tab3a-2024.json'), { rok: 2024 })['111'].hodnota - 47997.78) < 0.01);
  const t15 = parseTab3Celkem(rows('tab3-2015.json'), { rok: 2015 }); // sloupec „m. j.“ posouvá bloky
  assert.equal(t15['111'].hodnota, 146854380);
  assert.equal(t15['201'].hodnota, 15170498);
});

test('parseTab3c: fond prevence celkem a na pojištěnce', () => {
  const c = parseTab3c(rows('tab3c-2024.json'), { rok: 2024 });
  assert.equal(c.celkem['111'].hodnota, 2079022);
  assert.equal(c.celkem.cr.hodnota, 3553125.82163);
  assert.ok(Math.abs(c.na_pojistence['111'].hodnota - 338.04) < 0.01);
  assert.ok(Math.abs(c.na_pojistence.zzp.hodnota - 314.02) < 0.01);
  assert.equal(Object.keys(c.celkem).length, 9);
  assert.equal(parseTab3c(rows('tab3c-2015.json'), { rok: 2015 }).celkem['111'].hodnota, 343852.87199);
});

test('rozdelCisla: víceznačné řádky mají mezi kandidáty správný rozklad', () => {
  const k = rozdelCisla('  3 426 321     376 584 743 197          419 229 79 048 760 042 248 310', 7, { maxDigits: 7 });
  assert.ok(k.some((v) => v.join() === [3426321, 376584, 743197, 419229, 79048, 760042, 248310].join()));
  assert.deepEqual(rozdelCisla('1 730   1 818', 2), [[1730, 1818]]);
});

test('parseTab7 2024: kontrolní součty (VZP státní 3 426 321, zaměstnanci 3 554)', () => {
  const t = parseTab7(txt('pdf-tab7-2024.txt'));
  assert.equal(t.pojistenci['111'], 6150186);
  assert.equal(t.statni['111'], 3426321);
  assert.equal(t.statni['209'], 79048);
  assert.equal(t.statni['211'], 760042);
  assert.equal(t.statni['213'], 248310);
  assert.equal(t.zamestnanci['111'], 3554);
  assert.equal(t.pojistencu_na_zamestnance['111'], 1730);
  assert.equal(t.statni_pct_mz['111'], 55.7);
});

test('parseTab7 2018 (podíl na celá %, popisek zalomený) a 2019; ročník bez tabulky = null', () => {
  const t18 = parseTab7(txt('pdf-tab7-2018.txt'));
  assert.equal(t18.statni['111'], 3354173);
  assert.equal(t18.zamestnanci['213'], 227);
  assert.equal(parseTab7(txt('pdf-tab7-2019.txt')).statni['111'], 3343848);
  assert.equal(parseTab7(txt('pdf-bez-tabulek-2016.txt')), null);
});

test('parseTab4Vydaje: výdaje na vlastní činnost a podíl (2018 zalomený popisek, 2021, 2024)', () => {
  const a = parseTab4Vydaje(txt('pdf-tab4-2024.txt'));
  assert.equal(a.vlastni_cinnost_mil['111'], 5768);
  assert.equal(a.vydaje_celkem_mil['111'], 304164);
  assert.equal(a.podil_pct['209'], 2.5);
  assert.equal(parseTab4Vydaje(txt('pdf-tab4-2018.txt')).vlastni_cinnost_mil['111'], 3868);
  assert.equal(parseTab4Vydaje(txt('pdf-tab4-2021.txt')).podil_pct['111'], 1.9);
  assert.equal(parseTab4Vydaje(txt('pdf-bez-tabulek-2016.txt')), null);
});

const poradi = (o) => ['111', '201', '205', '207', '209', '211', '213'].map((k) => o[k]);

test('parseTab17 2024: kontrolní hodnoty (zdravotní programy VZP 1 782, ostatní, jiné zdroje VoZP)', () => {
  const t = parseTab17(txt('pdf-tab16-17-2024.txt'), { rok: 2024 });
  assert.deepEqual(poradi(t.programy), [1782, 176, 401, 240, 15, 437, 35]);
  assert.deepEqual(poradi(t.pobyty), [0, 4, 3, 1, 2, 17, 16]);
  assert.deepEqual(poradi(t.ostatni), [297, 1, 0, 0, 41, 0, 66]);
  assert.deepEqual(poradi(t.jine_zdroje), [null, 19, null, null, null, null, null]);
  assert.deepEqual(poradi(t.celkem), [2079, 200, 404, 241, 58, 454, 117]);
});

test('parseTab17 2019 (čísla na 1. řádku popisku) a 2022 (čísla na 2. řádku; popisek zalomený jinak)', () => {
  const t19 = parseTab17(txt('pdf-tab16-17-2019.txt'), { rok: 2019 });
  assert.deepEqual(poradi(t19.programy), [388, 104, 264, 127, 12, 181, 39]);
  assert.deepEqual(poradi(t19.pobyty), [44, 3, 10, 6, 2, 20, 7]);
  assert.deepEqual(poradi(t19.ostatni), [113, 0, null, 0, 17, null, 35]);
  assert.deepEqual(poradi(t19.celkem), [545, 119, 274, 133, 30, 201, 81]);
  const t22 = parseTab17(txt('pdf-tab16-17-2022.txt'), { rok: 2022 });
  assert.deepEqual(poradi(t22.programy), [475, 148, 325, 178, 9, 341, 27]);
  assert.deepEqual(poradi(t22.pobyty), [0, 3, 2, 6, 2, 16, 6]);
  assert.deepEqual(poradi(t22.ostatni), [683, 56, 108, 48, 35, 0, 80]);
  assert.equal(t22.jine_zdroje['201'], 19);
  assert.deepEqual(poradi(t22.celkem), [1158, 225, 435, 232, 46, 357, 113]);
  // Σ složek = celkem (±1) v každém výřezu
  for (const [soubor, rok] of [['2019', 2019], ['2022', 2022], ['2024', 2024], ['2018', 2018]]) {
    const t = parseTab17(txt(`pdf-tab16-17-${soubor}.txt`), { rok });
    for (const k of ['111', '201', '205', '207', '209', '211', '213']) {
      const s = ['programy', 'pobyty', 'ostatni', 'jine_zdroje'].reduce((a, id) => a + (t[id][k] ?? 0), 0);
      assert.ok(Math.abs(s - t.celkem[k]) <= 1, `${rok} ${k}: ${s} vs ${t.celkem[k]}`);
    }
  }
});

test('parseTab17: špatný rok, ročník bez tabulky a text bez ní = null', () => {
  assert.equal(parseTab17(txt('pdf-tab16-17-2024.txt'), { rok: 2023 }), null);
  assert.equal(parseTab17(txt('pdf-tab8-2015.txt'), { rok: 2015 }), null);
  assert.equal(parseTab17(txt('pdf-bez-tabulek-2016.txt'), { rok: 2016 }), null);
});

test('parseTab16: šestiletá okna ČR, sloupec ZPP, tis. Kč z 2015 (úzké sloupce s jednou mezerou)', () => {
  const a = parseTab16(txt('pdf-tab16-17-2024.txt'));
  assert.deepEqual(Object.keys(a.roky).map(Number), [2019, 2020, 2021, 2022, 2023, 2024]);
  assert.deepEqual(a.roky[2021], { programy: 1226, pobyty: 29, ostatni: 967, jine_zdroje: 16, celkem: 2238 });
  assert.equal(a.roky[2024].celkem, 3553);
  assert.equal(a.zpp.rok, 2024);
  assert.equal(a.zpp.programy, 2431);
  const b = parseTab16(txt('pdf-tab16-17-2019.txt'));
  assert.equal(b.roky[2015].programy, 580);
  assert.equal(b.roky[2019].ostatni, 165);
  const c = parseTab16(txt('pdf-tab8-2015.txt'));
  assert.equal(c.jednotka, 'tis');
  assert.equal(c.zpp, null);
  assert.deepEqual(c.roky[2015], { programy: 580.341, pobyty: 103.629, ostatni: 88.976, jine_zdroje: 9.725, celkem: 782.671 });
  assert.equal(c.roky[2013].celkem, 1161.291);
  assert.equal(parseTab16(txt('pdf-bez-tabulek-2016.txt')), null);
});

test('vyberTab16: v PDF 2018 jsou sloupce „2018“ a „ZPP“ zaměněné → použije se ten, který sedí na Tab. 17', () => {
  const t16 = parseTab16(txt('pdf-tab16-17-2018.txt'));
  const t17 = parseTab17(txt('pdf-tab16-17-2018.txt'), { rok: 2018 });
  assert.equal(t16.roky[2018].programy, 914);
  const v = vyberTab16(t16, 2018, t17);
  assert.equal(v.hodnoty.programy, 876);
  assert.equal(v.hodnoty.celkem, 1093);
  assert.match(v.poznamka, /zaměněny/);
  // ostatní ročníky se nemění
  const t16b = parseTab16(txt('pdf-tab16-17-2024.txt'));
  const v24 = vyberTab16(t16b, 2024, parseTab17(txt('pdf-tab16-17-2024.txt'), { rok: 2024 }));
  assert.equal(v24.hodnoty.programy, 3085);
  assert.equal(v24.poznamka, null);
  assert.equal(vyberTab16(t16b, 2015, null), null);
});

test('data: řady fondu prevence z Tab. 17 bez null 2018–2024 u 7 ZP, 2015–2017 null s důvodem v chybi[]', () => {
  const R = real();
  for (const id of ['fond_prevence_programy_mil', 'fond_prevence_pobyty_mil', 'fond_prevence_ostatni_mil', 'fond_prevence_celkem_t17_mil', 'fond_prevence_programy_na_pojistence_kc', 'fond_prevence_ostatni_podil_pct']) {
    for (const p of R.pojistovny) {
      for (const rok of [2018, 2019, 2020, 2021, 2022, 2023, 2024]) assert.ok(p.rady[id][String(rok)], `${p.kod} ${id} ${rok}`);
      for (const rok of [2015, 2016, 2017]) assert.equal(p.rady[id][String(rok)], null, `${p.kod} ${id} ${rok}`);
    }
    for (const rok of R.roky) assert.ok(R.cr.rady[id][String(rok)] || (rok < 2018 && id.includes('na_pojistence')) || rok >= 2015, `cr ${id} ${rok}`);
    assert.ok(R.chybi.some((c) => c.ukazatel === id && c.roky.join() === '2015,2016,2017' && /Tab\. 17 v Hodnocení za rok 2015/.test(c.duvod)), `chybi ${id}`);
  }
  // jiné zdroje jen VoZP
  for (const p of R.pojistovny) {
    for (const rok of [2018, 2024]) assert.equal(p.rady.fond_prevence_jine_zdroje_mil[String(rok)] !== null, p.kod === '201', `${p.kod} jine ${rok}`);
  }
  assert.ok(R.chybi.some((c) => c.ukazatel === 'fond_prevence_jine_zdroje_mil' && Array.isArray(c.kody) && c.kody.length === 6 && !c.kody.includes('201')));
  // kontrolní hodnoty 2024: zdravotní programy na pojištěnce
  const na = (kod) => Math.round(R.pojistovny.find((p) => p.kod === kod).rady.fond_prevence_programy_na_pojistence_kc['2024'].hodnota);
  assert.deepEqual(['111', '201', '205', '207', '209', '211', '213'].map(na), [290, 250, 306, 316, 105, 323, 82]);
  // ČR 2015–2024 z Tab. 16 (všech 10 let) a covid 2021–22 v podílu ostatních činností
  for (const rok of R.roky) assert.ok(R.cr.rady.fond_prevence_ostatni_mil[String(rok)], `cr ostatní ${rok}`);
  assert.equal(R.cr.rady.fond_prevence_ostatni_mil['2021'].hodnota, 967);
  assert.ok(R.cr.rady.fond_prevence_ostatni_podil_pct['2021'].hodnota > 40);
  assert.match(R.cr.rady.fond_prevence_programy_mil['2018'].poznamka, /zaměněny/);
  assert.ok(Object.keys(R.jednotky).includes('fond_prevence_programy_na_pojistence_kc'));
  assert.match(R._doc, /fond_prevence_programy_na_pojistence_kc/);
});

test('validátor: fond prevence — Σ složek ≠ celkem Tab. 17 a programy > celkem jsou chyby, rozdíl proti Tab. 3c je WARN', () => {
  const base = real();
  const kopie = (fn) => { const R = structuredClone(base); fn(R); return validateHospodareniRady(R); };
  assert.ok(kopie((R) => { R.pojistovny[0].rady.fond_prevence_ostatni_mil['2024'].hodnota += 5; }).errors.some((e) => /ostatní .* ≠ celkem Tab\. 17/.test(e)));
  assert.ok(kopie((R) => { R.pojistovny[2].rady.fond_prevence_programy_mil['2022'].hodnota += 50; R.pojistovny[2].rady.fond_prevence_celkem_t17_mil['2022'].hodnota += 50; }).errors.length === 0);
  assert.ok(kopie((R) => { R.pojistovny[0].rady.fond_prevence_programy_mil['2024'].hodnota = 3000; }).errors.some((e) => /programy_mil\[2024\]|≠ celkem Tab\. 17/.test(e)));
  const w = kopie((R) => { R.pojistovny[1].rady.fond_prevence_mil['2024'].hodnota += 4; });
  assert.deepEqual(w.errors.filter((e) => /fond_prevence/.test(e)), []);
  assert.ok(w.warnings.some((x) => /Tabulka č\. 3c/.test(x)));
});

// ---------------------------------------------------------------------------------- transform + validátor

test('data/pojistovny-hospodareni-rady.json: validátor projde, VZP 2024 sedí', () => {
  const R = real();
  const v = validateHospodareniRady(R);
  assert.deepEqual(v.errors, []);
  const vzp = R.pojistovny.find((p) => p.kod === '111').rady;
  assert.equal(vzp.pojistenci_prumer['2024'].hodnota, 6150186);
  assert.equal(vzp.statni_pojistenci['2024'].hodnota, 3426321);
  assert.equal(vzp.zamestnanci['2024'].hodnota, 3554);
  assert.ok(Math.abs(vzp.naklady_zs_mld['2024'].hodnota - 295.195275) < 1e-6);
  assert.ok(Math.abs(vzp.vliv_prerozdeleni_mld['2024'].hodnota - 103.37844) < 1e-6);
  assert.equal(R.pojistovny.every((p) => p.rady.platba_statu_mld === undefined), true);
  assert.deepEqual(R.roky, [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024]);
});

test('12 základních řad nemá null (10 let × 7 ZP), každá hodnota nese list, řádek a https zdroj', () => {
  const R = real();
  for (const id of ['pojistenci_prumer', 'zamestnanci', 'prijmy_celkem_mld', 'pojistne_po_prerozdeleni_mld', 'vliv_prerozdeleni_mld', 'naklady_zs_mld',
    'naklady_na_pojistence_kc', 'zustatek_bu_zfzp_mld', 'rezervni_fond_mld', 'hospodarsky_vysledek_mld', 'pohledavky_po_lhute_mil', 'zavazky_po_lhute_mil']) {
    for (const p of R.pojistovny) for (const rok of R.roky) {
      const c = p.rady[id][String(rok)];
      assert.ok(c, `${p.kod} ${id} ${rok}`);
      assert.ok(c.radek > 0 && c.sloupec && c.list && c.zdroj.startsWith('https://'));
    }
  }
  // PDF řady: 2018+ vyplněné, 2015–2017 null a vyjmenované v chybi[]
  const s = R.pojistovny[0].rady.statni_pojistenci;
  assert.equal(s['2017'], null);
  assert.ok(s['2018']);
  assert.ok(R.chybi.some((c) => c.ukazatel === 'statni_pojistenci' && c.roky.join() === '2015,2016,2017'));
});

test('validátor: rozbitá kopie vrací chyby', () => {
  const base = real();
  const kopie = (fn) => { const R = structuredClone(base); fn(R); return validateHospodareniRady(R).errors; };
  assert.ok(kopie((R) => { R.pojistovny[0].rady.pojistenci_prumer['2024'].hodnota *= 1.02; }).some((e) => /součet pojistenci_prumer\[2024\]|pojistovny\.json/.test(e)));
  assert.ok(kopie((R) => { R.pojistovny[1].rady.naklady_zs_mld['2020'] = null; }).some((e) => /nesmí být null/.test(e)));
  assert.ok(kopie((R) => { R.pojistovny[0].rady.statni_pojistenci_pct['2024'].hodnota = 85; }).some((e) => /40–70/.test(e)));
  assert.ok(kopie((R) => { R.pojistovny[0].rady.provozni_naklady_pct['2024'].hodnota = 9; }).some((e) => /0,5–5/.test(e)));
  assert.ok(kopie((R) => { R.pojistovny.pop(); }).some((e) => /pojistovny: očekáváno/.test(e)));
  assert.ok(kopie((R) => { R.roky = [2015, 2017]; }).some((e) => /vzestupná/.test(e)));
  assert.ok(kopie((R) => { R.pojistovny[0].rady.vliv_prerozdeleni_mld['2024'].hodnota += 1; }).some((e) => /vliv_prerozdeleni/.test(e)));
  assert.ok(kopie((R) => { R.pojistovny[0].rady.prijmy_celkem_mld['2024'].zdroj = 'http://x'; }).some((e) => /https/.test(e)));
});

test('sestavRady na fixturách (2015 + 2024) dává stejné hodnoty jako reálný soubor', () => {
  const R = real();
  const bundles = [2015, 2024].map((rok) => {
    const t1 = parseTab1(rows(`tab1-${rok}.json`), { rok });
    return {
      rok, tab1: t1.polozky, tab1a: parseTab1a(rows(`tab1a-${rok}.json`), { rok }),
      zustatek: parseTabZpRadek(rows(`tab1b-${rok}.json`), /^kz na bankovním účtu zfzp/i), tab1c: parseTab1c(rows(`tab1c-${rok}.json`), { rok }),
      rezervni: parseTabZpRadek(rows(`tab1d-${rok}.json`), /^a\.\s*skutečné naplnění/i),
      tab3: parseTab3Celkem(rows(`tab3-${rok}.json`), { rok }), tab3a: parseTab3Celkem(rows(`tab3a-${rok}.json`), { rok }), tab3c: parseTab3c(rows(`tab3c-${rok}.json`), { rok }),
      tab7: rok === 2024 ? parseTab7(txt('pdf-tab7-2024.txt')) : null, tab4: rok === 2024 ? parseTab4Vydaje(txt('pdf-tab4-2024.txt')) : null,
      tab17: rok === 2024 ? parseTab17(txt('pdf-tab16-17-2024.txt'), { rok }) : null,
      tab16: parseTab16(txt(rok === 2024 ? 'pdf-tab16-17-2024.txt' : 'pdf-tab8-2015.txt')),
    };
  });
  const soubory = Object.fromEntries([2015, 2024].map((r) => [r, Object.fromEntries(['pdf', 'xlsx-1', 'xlsx-3'].map((t) => [t, { url: `https://x.test/${r}/${t}` }]))]));
  const D = sestavRady({ bundles, soubory, zkratky: {} });
  assert.deepEqual(D.roky, [2015, 2024]);
  for (const p of D.pojistovny) {
    const rp = R.pojistovny.find((x) => x.kod === p.kod);
    for (const id of Object.keys(p.rady)) {
      for (const rok of ['2015', '2024']) {
        assert.equal(p.rady[id][rok]?.hodnota ?? null, rp.rady[id][rok]?.hodnota ?? null, `${p.kod} ${id} ${rok}`);
      }
    }
  }
  assert.equal(D.pojistovny[0].rady.pojistenci_prumer['2024'].zdroj, 'https://x.test/2024/xlsx-1');
});

test('transform je idempotentní (stejný vstup = soubor beze změny, generated_at se nemění)', (t) => {
  const cacheDir = path.join(here, '..', 'ingest', 'cache', 'mz-hodnoceni');
  if (!fs.existsSync(path.join(cacheDir, 'manifest.json'))) { t.skip('cache Hodnocení MZ není stažená (node ingest/fetchers/mz-hodnoceni.js)'); return; }
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'hosp-rady-')), 'out.json');
  const r1 = run({ out });
  assert.deepEqual(r1.errors, []);
  assert.equal(r1.zmeneno, true);
  const a = fs.readFileSync(out, 'utf8');
  const r2 = run({ out });
  assert.equal(r2.zmeneno, false);
  assert.equal(fs.readFileSync(out, 'utf8'), a);
  // a shoduje se s commitnutým souborem bez časových razítek (v CI je cache čerstvě stažená, stazeno_at se liší)
  assert.deepEqual(bezCasu(JSON.parse(a)), bezCasu(real()));
  assert.equal(serializuj(JSON.parse(a)), a);
});

test('fetcher --dry-run: z HTML sestaví seznam souborů a nic nestahuje ani nezapisuje', async () => {
  const html = txt('page-links.html');
  let volani = 0;
  const fetchImpl = async () => { volani++; return { ok: true, status: 200, text: async () => html }; };
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mzh-'));
  const m = await fetchMzHodnoceni({ dryRun: true, fetchImpl, sleepImpl: async () => {}, pauseMs: 0, cacheRoot: tmp, log: () => {} });
  assert.equal(volani, 1);
  assert.equal(m.polozky.length, 7);
  assert.ok(m.polozky.every((p) => p.poznamka === 'dry-run'));
  assert.deepEqual(fs.readdirSync(tmp), []);
});

test('bezCasu: odstraní generated_at a stazeno_at v libovolné hloubce, vstup nemění', () => {
  const vstup = {
    version: '1.0', generated_at: '2026-11-03T06:00:00Z',
    zdroje: [{ url: 'a', stazeno_at: '2026-11-03T05:59:00Z', soubory: [{ n: 1, stazeno_at: 'x' }] }],
    rady: { x: { hodnota: 1, meta: { generated_at: 'y' } } },
  };
  const kopie = structuredClone(vstup);
  const a = bezCasu(vstup);
  const b = bezCasu({ ...structuredClone(vstup), generated_at: 'jindy',
    zdroje: [{ url: 'a', stazeno_at: 'jindy', soubory: [{ n: 1, stazeno_at: 'jindy' }] }] });
  assert.equal(JSON.stringify(a), JSON.stringify(b), 'dva běhy lišící se jen razítky jsou shodné');
  assert.equal(JSON.stringify(a).includes('stazeno_at'), false);
  assert.equal(JSON.stringify(a).includes('generated_at'), false);
  assert.equal(a.rady.x.hodnota, 1, 'věcná data zůstávají');
  assert.deepEqual(vstup, kopie, 'původní objekt se nemění');
  const c = bezCasu({ ...structuredClone(vstup), rady: { x: { hodnota: 2 } } });
  assert.notEqual(JSON.stringify(a), JSON.stringify(c), 'věcná změna se pozná');
});
