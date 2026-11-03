// Měsíční kmen pojišťoven odvozený z přerozdělení MZ (metodika § 4.3):
// ingest/transform_pojistovny_kmen_mesicni.js + data/pojistovny-kmen-mesicni.json
// + validátor (validateKmenMesicni) + UI (src/pojistovny-kmen-mesicni.js, pojistovny-kmen.html).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  sestavKmenMesicni, pocetPojistencu, indexRady, zmenaKmene, prestupyRady, mesiceZRoku, serializuj, run, KODY,
} from '../ingest/transform_pojistovny_kmen_mesicni.js';
import { validateAll, validateKmenMesicni, loadDatasets, OPTIONAL_FILES } from '../ingest/validate-pojistovny.js';
import {
  mesicLabel, mesicX, xLabel, buildMesicniSeries, mesicniVyber, rezimZUrl, prepinacHtml, grafMesicni, prestupyTabulka, prestupyHtml, veta, fmtZmena, fmtZmenaPct, renderKmenMesicni,
} from '../src/pojistovny-kmen-mesicni.js';
import { indexedLines } from '../src/zp-viz.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (...p) => JSON.parse(fs.readFileSync(path.join(ROOT, ...p), 'utf8'));
const readTxt = (...p) => fs.readFileSync(path.join(ROOT, ...p), 'utf8');
const A = read('ingest', 'manual', 'pojistovny', 'prerozdeleni-mz-pojistovna.json');
const B = read('ingest', 'manual', 'pojistovny', 'prerozdeleni-mz.json');
const P = read('data', 'pojistovny.json');
const K = read('data', 'pojistovny-kmen-mesicni.json');
const ZKR = Object.fromEntries(P.pojistovny.map((z) => [z.kod, z.zkratka]));
const copy = (o) => JSON.parse(JSON.stringify(o));
const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;

// ---------------------------------------------------------------- vstupy z PDF MZ

test('prerozdeleni-mz-pojistovna.json: roky 2022–2026, 7 ZP + celkem, 12 měsíců (2026 jen 10), zdroj s URL a datem ověření', () => {
  assert.ok(A.zdroj?.url && A.zdroj?.overeno && A.zdroj?.soubory?.length === 2);
  for (const rok of ['2022', '2023', '2024', '2025', '2026']) {
    const r = A.roky[rok];
    assert.ok(r, rok);
    const n = rok === '2026' ? 10 : 12;
    for (const k of [...KODY, 'celkem']) {
      assert.equal(r[k]?.length, n, `${rok}/${k}`);
      assert.ok(r[k].every((v) => Number.isInteger(v) && v > 100000 && v < 100000000), `${rok}/${k}: hodnoty mimo rozsah (tis. Kč)`);
    }
  }
  // hodnoty doložené z PDF MZ (prerozdelovani_pojistovna_vysledek_2024_12 / 2026_10)
  assert.equal(A.roky['2022']['111'][0], 22543309);
  assert.equal(A.roky['2024']['213'][9], 1199808, 'RBP 10/2024');
  assert.equal(A.roky['2026']['111'][5], 19614576, 'VZP 6/2026 (mimořádné přerozdělování k zaměstnaneckým ZP)');
});

test('prerozdeleni-mz.json: doplněné roky 2022 a 2026 (částky na pojištěnce), řada 2023–2025 beze změny', () => {
  assert.equal(B.roky['2022']['111'][0], 3822);
  assert.equal(B.roky['2026']['111'].length, 10);
  assert.equal(B.roky['2026']['111'][5], 3170);
  assert.equal(B.roky['2024']['111'][0], 4173);
  assert.equal(B.roky['2025']['209'][10], 2722);
});

test('prerozdeleni-mz-pojistovna.json: součet sedmi ZP = řádek „Celkem“ (±2 tis. Kč, zaokrouhlení v PDF)', () => {
  for (const [rok, r] of Object.entries(A.roky)) {
    r.celkem.forEach((c, i) => {
      const sum = KODY.reduce((a, k) => a + r[k][i], 0);
      assert.ok(Math.abs(sum - c) <= 2, `${rok}/${i + 1}: součet ${sum} ≠ celkem ${c}`);
    });
  }
});

// ---------------------------------------------------------------- čisté funkce transformu

test('pocetPojistencu: částka na pojišťovnu × 1000 / částka na pojištěnce; neplatný vstup = null', () => {
  assert.equal(pocetPojistencu(22543309, 3822), Math.round((22543309 * 1000) / 3822));
  assert.equal(pocetPojistencu(1000, 1), 1000000);
  for (const [a, b] of [[null, 3800], [1000, null], [0, 3800], [1000, 0], [-5, 3800], [NaN, 3800], ['1', 3800]]) assert.equal(pocetPojistencu(a, b), null, `${a}/${b}`);
});

test('indexRady, zmenaKmene a prestupyRady: základ = 100, rozdíl a % jen při platných hodnotách', () => {
  assert.deepEqual(indexRady([200, 210, null, 190]), [100, 105, null, 95]);
  assert.deepEqual(indexRady([null, 5]), [null, null], 'bez základu nejde index spočítat');
  assert.deepEqual(zmenaKmene(1000, 1010), { pred: 1000, po: 1010, zmena: 10, zmena_pct: 1 });
  assert.deepEqual(zmenaKmene(null, 1010), { pred: null, po: 1010, zmena: null, zmena_pct: null });
  const mes = mesiceZRoku({ 2022: { 111: new Array(12).fill(1) }, 2023: { 111: new Array(12).fill(1) } });
  assert.equal(mes.length, 24);
  assert.equal(mes[12], '2023-01');
  const poc = mes.map((_, i) => 1000 + i);
  const pr = prestupyRady(mes, poc);
  // 2022: jen 1. 7. (prosinec 2021 chybí); 2023: 1. 1. i 1. 7.
  assert.deepEqual(pr.map((c) => `${c.rok} ${c.termin}`), ['2022 1. 7.', '2023 1. 1.', '2023 1. 7.']);
  assert.equal(pr[1].z, '2022-12');
  assert.equal(pr[1].na, '2023-01');
  assert.equal(pr[1].zmena, 1);
});

test('sestavKmenMesicni: čistá funkce, nemění vstup, null v řadě se nedomýšlí', () => {
  const a0 = JSON.stringify(A); const b0 = JSON.stringify(B);
  const d = sestavKmenMesicni(A, B, ZKR);
  assert.equal(JSON.stringify(A), a0);
  assert.equal(JSON.stringify(B), b0);
  assert.equal(d.mesice.length, 58);
  assert.equal(d.mesice[0], '2022-01');
  assert.equal(d.mesice[57], '2026-10');
  assert.equal(d.pojistovny.length, 7);
  assert.equal(d.pojistovny[0].pocty[0], Math.round((A.roky['2022']['111'][0] * 1000) / B.roky['2022']['111'][0]));
  assert.equal(d.pojistovny[0].index_2022_01[0], 100);
  // chybějící měsíc (null) → null počet, null index, přestupy přes něj jsou null
  const A2 = copy(A); A2.roky['2025']['201'][5] = null;
  const d2 = sestavKmenMesicni(A2, B, ZKR);
  const vozp = d2.pojistovny.find((z) => z.kod === '201');
  const i = d2.mesice.indexOf('2025-06');
  assert.equal(vozp.pocty[i], null);
  assert.equal(vozp.index_2022_01[i], null);
  const pr = d2.prestupy.pojistovny.find((p) => p.kod === '201').zmeny.find((c) => c.rok === 2025 && c.termin === '1. 7.');
  assert.equal(pr.zmena, null);
  assert.equal(pr.zmena_pct, null);
  // chybějící měsíc v prerozdeleni-mz.json = chyba, ne tiché doplnění
  const B3 = copy(B); B3.roky['2026']['111'] = B3.roky['2026']['111'].slice(0, 9);
  assert.throws(() => sestavKmenMesicni(A, B3, ZKR), /chybí/);
  const A4 = copy(A); delete A4.roky['2024']['205'];
  assert.throws(() => sestavKmenMesicni(A4, B, ZKR), /2024\/205/);
});

test('data/pojistovny-kmen-mesicni.json je aktuální výstup transformu (idempotence, beze změny souboru)', () => {
  const d = sestavKmenMesicni(A, B, ZKR);
  const { generated_at, ...ulozene } = K;
  assert.ok(generated_at);
  assert.deepEqual(ulozene, JSON.parse(JSON.stringify({ version: d.version, ...d })), 'dataset je zastaralý: spusť node ingest/transform_pojistovny_kmen_mesicni.js');
  // druhý běh nad stejným vstupem soubor nezmění ani neotevře generated_at
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kmen-mesicni-'));
  const out = path.join(tmp, 'k.json');
  const r1 = run({ out });
  assert.equal(r1.zmeneno, true);
  const txt1 = fs.readFileSync(out, 'utf8');
  const r2 = run({ out });
  assert.equal(r2.zmeneno, false);
  assert.equal(fs.readFileSync(out, 'utf8'), txt1);
  assert.equal(txt1, serializuj(JSON.parse(txt1)), 'serializace je stabilní');
  fs.rmSync(tmp, { recursive: true, force: true });
});

// ---------------------------------------------------------------- kontrola proti jiným zdrojům

test('kontrola proti MZ: průměr 12 měsíců 2024 ≈ průměrný počet pojištěnců podle MZ (±0,5 %, ve skutečnosti do 0,1 %)', () => {
  const i0 = K.mesice.indexOf('2024-01');
  assert.equal(i0, 24);
  let nejhorsi = 0;
  for (const z of P.pojistovny) {
    const ref = z.hospodareni.pocet_pojistencu.hodnota;
    const mine = K.pojistovny.find((x) => x.kod === z.kod).pocty.slice(i0, i0 + 12);
    assert.equal(mine.length, 12);
    const odchylka = Math.abs(avg(mine) / ref - 1);
    nejhorsi = Math.max(nejhorsi, odchylka);
    assert.ok(odchylka <= 0.005, `${z.zkratka}: průměr 2024 ${Math.round(avg(mine))} vs MZ ${ref} (${(odchylka * 100).toFixed(2)} %)`);
  }
  assert.ok(nejhorsi <= 0.001, `věta v UI slibuje „méně než 0,1 %“, nejhorší odchylka ${(nejhorsi * 100).toFixed(3)} %`);
  // VZP: 6 150 186 podle MZ
  assert.equal(P.pojistovny.find((z) => z.kod === '111').hospodareni.pocet_pojistencu.hodnota, 6150186);
});

test('kontrola proti CRP: stav 12/2025 ≈ CRP 2025 (±1,5 %; šest ZP do 1 %, VoZP těsně nad 1 %)', () => {
  const i = K.mesice.indexOf('2025-12');
  const odch = {};
  for (const z of P.pojistovny) {
    const mine = K.pojistovny.find((x) => x.kod === z.kod).pocty[i];
    odch[z.kod] = Math.abs(mine / z.crp.pojistenci - 1);
    assert.ok(odch[z.kod] <= 0.015, `${z.zkratka}: 12/2025 ${mine} vs CRP ${z.crp.pojistenci} (${(odch[z.kod] * 100).toFixed(2)} %)`);
  }
  assert.equal(Object.values(odch).filter((v) => v > 0.01).length, 1, 'právě jedna ZP (VoZP) je nad 1 %');
  assert.ok(odch['201'] > 0.01 && odch['201'] <= 0.015);
  // celkem za všechny ZP
  const crpCelkem = P.pojistovny.reduce((a, z) => a + z.crp.pojistenci, 0);
  assert.ok(Math.abs(K.celkem.pocty[i] / crpCelkem - 1) <= 0.01, 'celkem 12/2025 do 1 % od součtu CRP');
});

test('celkem ≈ součet sedmi ZP v každém měsíci (±0,2 %)', () => {
  K.celkem.pocty.forEach((c, i) => {
    const sum = K.pojistovny.reduce((a, z) => a + z.pocty[i], 0);
    assert.ok(Math.abs(sum / c - 1) <= 0.002, `${K.mesice[i]}: ${sum} vs ${c}`);
  });
});

test('data: žádný chybějící měsíc, index 1/2022 = 100, přestupy jsou rozdíl dvou měsíců', () => {
  for (const z of K.pojistovny) {
    assert.equal(z.pocty.length, K.mesice.length);
    assert.ok(z.pocty.every((v) => Number.isInteger(v) && v > 100000), z.kod);
    assert.equal(z.index_2022_01[0], 100);
  }
  const v = K.prestupy.pojistovny.find((p) => p.kod === '201').zmeny.find((c) => c.rok === 2025 && c.termin === '1. 7.');
  assert.equal(v.pred, 697730);
  assert.equal(v.po, 692500);
  assert.equal(v.zmena, -5230);
  assert.equal(v.zmena_pct, -0.75);
  // čtyři leden- a pět červenec- přestupů na ZP: 1. 1. 2023–2026, 1. 7. 2022–2026
  for (const p of K.prestupy.pojistovny) assert.equal(p.zmeny.length, 9, p.kod);
});

// ---------------------------------------------------------------- validátor

test('validátor: OPTIONAL_FILES má kmenMesicni, loadDatasets ho načte a validateAll projde bez chyb', () => {
  assert.equal(OPTIONAL_FILES.kmenMesicni, 'pojistovny-kmen-mesicni.json');
  const ds = loadDatasets();
  assert.ok(ds.kmenMesicni);
  const r = validateAll(ds);
  assert.deepEqual(r.errors, []);
  // dataset je volitelný: bez něj validace běží dál
  const bez = { ...ds }; delete bez.kmenMesicni;
  assert.deepEqual(validateAll(bez).errors, []);
});

test('validátor: odmítne špatný počet ZP, nestejné délky, nekladné číslo, mezery v měsících, rozbitý index a celkem', () => {
  assert.deepEqual(validateKmenMesicni(K, P).errors, []);
  const chyby = (mut) => { const k = copy(K); mut(k); return validateKmenMesicni(k, P).errors; };
  assert.ok(chyby((k) => k.pojistovny.pop()).some((e) => /očekáváno 7/.test(e)));
  assert.ok(chyby((k) => k.pojistovny[0].pocty.pop()).some((e) => /délka/.test(e)));
  assert.ok(chyby((k) => { k.pojistovny[1].pocty[3] = -5; }).some((e) => /kladné číslo/.test(e)));
  assert.ok(chyby((k) => { k.pojistovny[1].pocty[3] = 0; }).some((e) => /kladné číslo/.test(e)));
  assert.ok(chyby((k) => k.mesice.splice(5, 1)).length > 0, 'mezera v měsících');
  assert.ok(chyby((k) => { k.pojistovny[0].pocty[10] += 400000; }).some((e) => /index_2022_01|celkem|průměr/.test(e)));
  assert.ok(chyby((k) => { k.pojistovny[2].index_2022_01[7] = 150; }).some((e) => /index_2022_01/.test(e)));
  assert.ok(chyby((k) => { k.celkem.pocty[20] = Math.round(k.celkem.pocty[20] * 1.01); }).some((e) => /součet ZP/.test(e)));
  assert.ok(chyby((k) => { k.prestupy.pojistovny[0].zmeny[2].zmena += 1; }).some((e) => /zmena/.test(e)));
  assert.ok(chyby((k) => { k.pojistovny[0].kod = '999'; }).some((e) => /neznámý kód/.test(e)));
  assert.ok(chyby((k) => { k.pojistovny[1].kod = '111'; }).some((e) => /duplicitní/.test(e)));
  assert.ok(chyby((k) => { delete k.zdroj.url; }).some((e) => /zdroj\.url/.test(e)));
  // průměr 2024 proti pojistovny.json: posun o ~1 % všech měsíců 2024 u VZP
  assert.ok(chyby((k) => { for (let i = 24; i < 36; i++) { k.pojistovny[0].pocty[i] = Math.round(k.pojistovny[0].pocty[i] * 1.01); } }).some((e) => /průměr 2024/.test(e)));
  // null = nedohledáno: varování, ne chyba
  const kn = copy(K); kn.pojistovny[0].pocty[5] = null; kn.pojistovny[0].index_2022_01[5] = null;
  const rn = validateKmenMesicni(kn, P);
  assert.ok(rn.warnings.some((w) => /nedohledáno/.test(w)));
  assert.equal(validateKmenMesicni(null, P).errors.length, 1);
});

// ---------------------------------------------------------------- UI

test('stránka pojistovny-kmen.html: kontejnery zpKmenMesicni a zpKmenPrestupy pod „Vývoj kmene“, nadpis podsekce', () => {
  const html = readTxt('pojistovny-kmen.html');
  assert.match(html, /id="zpKmenMesicni"/);
  assert.match(html, /id="zpKmenPrestupy"/);
  assert.match(html, /Kmen měsíc po měsíci \(přerozdělení MZ\)/);
  assert.ok(html.indexOf('Vývoj kmene 2010–2025') < html.indexOf('id="zpKmenMesicni"'), 'podsekce je pod Vývojem kmene');
  assert.ok(html.indexOf('id="zpKmenMesicni"') < html.indexOf('Věk kmene a náklady na péči'));
  // data se načítají jen na stránce, která má kontejnery
  const js = readTxt('src', 'pojistovny.js');
  assert.match(js, /kmenMesicni: \['zpKmenMesicni', 'zpKmenPrestupy'\]/);
  assert.match(js, /has\(POTREBA\.kmenMesicni\) \? loadJson\('data\/pojistovny-kmen-mesicni\.json'\)/);
  // ostatní podstránky kontejnery nemají
  for (const f of ['pojistovny.html', 'pojistovny-prevence.html', 'pojistovny-aplikace.html', 'pojistovny-gramotnost.html', 'pojistovny-metodika.html', 'pojistovny-indikatory.html']) {
    assert.doesNotMatch(readTxt(f), /zpKmenMesicni/, f);
  }
});

test('mesicLabel, mesicX, xLabel: zápis 1/2022, zlomek roku a zpět', () => {
  assert.equal(mesicLabel('2022-01'), '1/2022');
  assert.equal(mesicLabel('2026-10'), '10/2026');
  assert.equal(mesicLabel(null), '');
  assert.ok(mesicX('2022-07') > mesicX('2022-06'));
  assert.equal(mesicX('2022-01'), 2022);
  assert.ok(Number.isNaN(mesicX('bla')));
  for (const m of ['2022-01', '2022-07', '2023-12', '2026-10']) assert.equal(xLabel(mesicX(m)), mesicLabel(m), m);
});

test('buildMesicniSeries: 7 sérií po 58 bodech, kód = data-zp, značky osy po lednech', () => {
  const ch = buildMesicniSeries(K);
  assert.equal(ch.series.length, 7);
  assert.ok(ch.series.every((s) => s.points.length === 58 && s.kod && s.label));
  assert.equal(ch.opts.base, 2022);
  assert.deepEqual(ch.opts.xTicks.map((t) => t.label), ['2022', '2023', '2024', '2025', '2026']);
  const html = indexedLines(ch.series, ch.opts);
  assert.equal((html.match(/class="zpv-series"/g) || []).length, 7);
  for (const kod of KODY) assert.ok(html.includes(`data-zp="${kod}"`), `chybí data-zp ${kod}`);
  assert.match(html, /1\/2022 = 100/);
  assert.match(html, /<th scope="col">Měsíc<\/th>/);
  assert.match(html, /10\/2026/, 'konec řady je popsán měsícem');
  assert.doesNotMatch(html, /undefined|NaN|\[object/);
  assert.doesNotMatch(html, /2022\.\d{2,}/, 'zlomky roku neuniknou do popisků');
});

test('indexedLines: výchozí chování (roční osa) beze změny; xTicks s krajními značkami se zarovnají', () => {
  const s = [{ kod: '111', label: 'VZP ČR', points: [{ year: 2010, value: 10 }, { year: 2011, value: 11 }, { year: 2012, value: 12 }] }];
  const h = indexedLines(s, { base: 2010 });
  assert.match(h, /<th scope="col">Rok<\/th>/);
  assert.match(h, /text-anchor="start">2010</);
  assert.match(h, /text-anchor="end">2012</);
  assert.match(h, /2010 = 100/);
});

test('prestupyTabulka: poslední dva roky = 1. 1. 2025, 1. 7. 2025, 1. 1. 2026, 1. 7. 2026; pevné pořadí podle kódu', () => {
  const t = prestupyTabulka(K, 2);
  assert.deepEqual(t.cols.map((c) => `${c.termin} ${c.rok}`), ['1. 1. 2025', '1. 7. 2025', '1. 1. 2026', '1. 7. 2026']);
  assert.deepEqual(t.radky.map((r) => r.kod), KODY);
  assert.ok(t.radky.every((r) => r.bunky.length === 4 && r.bunky.every((b) => b && Number.isInteger(b.zmena))));
  assert.equal(t.celkem.length, 4);
  assert.equal(prestupyTabulka(K, 1).cols.length, 2);
  assert.deepEqual(prestupyTabulka({}, 2).cols, []);
});

test('prestupyHtml: tabulka s řádky data-zp, bez „undefined“, minus typografický, bez řazení a hodnocení', () => {
  const html = prestupyHtml(K, 2);
  assert.match(html, /<table>/);
  for (const kod of KODY) assert.ok(html.includes(`<tr data-zp="${kod}">`), kod);
  assert.match(html, /1\. 1\. 2025/);
  assert.match(html, /1\. 7\. 2026/);
  assert.match(html, /Celkem 7 pojišťoven/);
  assert.match(html, /−5 230|−5 230/, 'VoZP 1. 7. 2025');
  assert.doesNotMatch(html, /undefined|NaN|\[object/);
  assert.doesNotMatch(html, /aria-sort|zpc-sort/, 'tabulka se neřadí podle hodnoty');
  assert.match(html, /nejde o hodnocení/);
  assert.match(prestupyHtml({}, 2), /nedohledáno/);
});

test('fmtZmena a fmtZmenaPct: znaménka, tisíce, null = nedohledáno', () => {
  assert.equal(fmtZmena(11830), '+11 830');
  assert.equal(fmtZmena(-4953), '−4 953');
  assert.equal(fmtZmena(0), '±0');
  assert.equal(fmtZmena(null), 'nedohledáno');
  assert.equal(fmtZmenaPct(0.19), '+0,19 %');
  assert.equal(fmtZmenaPct(-0.72), '−0,72 %');
  assert.equal(fmtZmenaPct(null), '');
});

test('věta pod grafem: odvozeno podílem dvou částek MZ, přestupní termíny 1. 1. a 1. 7., ne hodnocení', () => {
  const v = veta(K);
  assert.match(v, /odvozené podílem dvou částek/);
  assert.match(v, /MZ je takto přímo nezveřejňuje/);
  assert.match(v, /přestupním termínům 1\. 1\. a 1\. 7\./);
  assert.match(v, /nejde o hodnocení/);
  assert.match(v, /1\/2022 až 10\/2026/);
  assert.match(v, /65\/2022 Sb\./, 'skok VZP v dubnu 2022 má uvedený důvod (lex Ukrajina)');
  assert.match(v, /neprodloužily/, 'pokles v dubnu 2023 má uvedený důvod');
  assert.doesNotMatch(v, /undefined/);
});

test('mesicniVyber: bez VZP = 6 pojišťoven, od 2023 začíná 2023-01 a pocty jsou ořezané, vse i neznámý režim vrací vstup', () => {
  assert.equal(mesicniVyber(K, 'vse'), K);
  assert.equal(mesicniVyber(K, 'nesmysl'), K);
  assert.equal(mesicniVyber(K, undefined), K);
  const bez = mesicniVyber(K, 'bez-vzp');
  assert.equal(bez.pojistovny.length, 6);
  assert.ok(bez.pojistovny.every((z) => z.kod !== '111'));
  assert.equal(bez.mesice.length, K.mesice.length, 'měsíce zůstávají');
  assert.equal(K.pojistovny.length, 7, 'vstup se nemění');
  const od = mesicniVyber(K, 'od-2023');
  assert.equal(od.mesice[0], '2023-01');
  assert.equal(od.mesice.at(-1), K.mesice.at(-1));
  assert.equal(od.pojistovny.length, 7);
  assert.ok(od.pojistovny.every((z) => z.pocty.length === od.mesice.length));
  const v = od.pojistovny.find((z) => z.kod === '111');
  assert.equal(v.pocty[0], K.pojistovny.find((z) => z.kod === '111').pocty[K.mesice.indexOf('2023-01')]);
  // index se přepočítá na první zobrazený měsíc (= 100)
  const ch = buildMesicniSeries(od);
  assert.ok(ch.series.every((s) => s.points.length === od.mesice.length));
  assert.match(ch.opts.sub, /1\/2023 \(= 100\)/);
  const graf = indexedLines(ch.series, ch.opts);
  assert.match(graf, /100/);
  // bez dat nepadá
  assert.equal(mesicniVyber(null, 'bez-vzp'), null);
  assert.equal(mesicniVyber({ mesice: ['2022-01'], pojistovny: [{ kod: '201', pocty: [5] }] }, 'od-2023').mesice.length, 0);
});

test('přepínač rozsahu: radiogroup, výchozí vse, stav z URL, graf pro režim', () => {
  assert.equal(rezimZUrl(''), 'vse');
  assert.equal(rezimZUrl('?kmen=bez-vzp'), 'bez-vzp');
  assert.equal(rezimZUrl('?kmen=od-2023&x=1'), 'od-2023');
  assert.equal(rezimZUrl('?kmen=hmm'), 'vse');
  assert.equal(rezimZUrl(undefined), 'vse');
  const html = prepinacHtml('vse');
  assert.match(html, /<div class="zpc-switch" role="radiogroup" aria-label="Rozsah grafu">/);
  assert.equal((html.match(/role="radio"/g) || []).length, 3);
  assert.match(html, /aria-checked="true" tabindex="0" data-rezim="vse"/);
  assert.equal((html.match(/aria-checked="false"/g) || []).length, 2);
  assert.match(prepinacHtml('bez-vzp'), /aria-checked="true"[^>]*data-rezim="bez-vzp"/);
  assert.equal((grafMesicni(K, 'bez-vzp').match(/data-zp="111"/g) || []).length, 0, 'VZP v grafu není');
  assert.ok((grafMesicni(K, 'vse').match(/data-zp="111"/g) || []).length > 0);
  const src = readTxt('src', 'pojistovny-kmen-mesicni.js');
  assert.match(src, /history\.replaceState/);
  assert.match(src, /initZpInteract/);
});

test('CSS: .zpc-switch má vybraný stav, min. výšku 32 px a nic neanimuje při prefers-reduced-motion', () => {
  const css = readTxt('src', 'styles.css');
  assert.match(css, /\.zpc-switch button\[aria-checked="true"\]/);
  assert.match(css, /\.zpc-switch button\{min-height:32px/);
  const m = css.match(/@media \(prefers-reduced-motion: no-preference\)\{\.zpc-switch button\{transition[^}]*\}\}/);
  assert.ok(m, 'transition jen v no-preference');
});

test('renderKmenMesicni: bez DOM nespadne; s fake DOM vyplní oba kontejnery, chybějící dataset = nedohledáno', () => {
  const els = { zpKmenMesicni: { innerHTML: '' }, zpKmenPrestupy: { innerHTML: '' } };
  const old = globalThis.document;
  globalThis.document = { getElementById: (id) => els[id] || null };
  try {
    renderKmenMesicni(K);
    assert.match(els.zpKmenMesicni.innerHTML, /class="zpv zpv-figure zpv-lines/);
    assert.match(els.zpKmenMesicni.innerHTML, /odvozené podílem dvou částek/);
    assert.match(els.zpKmenPrestupy.innerHTML, /<table>/);
    for (const id of Object.keys(els)) assert.doesNotMatch(els[id].innerHTML, /undefined|NaN|\[object/, id);
    renderKmenMesicni(null);
    assert.match(els.zpKmenMesicni.innerHTML, /nedohledáno/);
    assert.equal(els.zpKmenPrestupy.innerHTML, '');
  } finally { globalThis.document = old; }
});

test('modul UI: escapování přes escapeHtml, žádné pevné barvy', () => {
  const src = readTxt('src', 'pojistovny-kmen-mesicni.js');
  assert.match(src, /escapeHtml/);
  assert.ok(!/#[0-9a-fA-F]{6}\b/.test(src));
});
