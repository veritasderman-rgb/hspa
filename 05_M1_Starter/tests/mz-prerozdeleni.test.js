// Přerozdělení pojistného MZ (balíček A1.2): parser PDF tabulek, fetcher, transform, validátor.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseVyber, parseOdkazy, nejnovejsi, sloucitParsovane, zkontrolujSoucty, sestavVyberJson, rozdel, KODY,
} from '../ingest/lib/mz-prerozdeleni.js';
import { validatePrerozdeleni, TAB1_VYBER_TIS } from '../ingest/lib/validate-prerozdeleni.js';
import { sestavPrerozdeleni, run } from '../ingest/transform_pojistovny_prerozdeleni.js';
import { stahni, planStazeni } from '../ingest/fetchers/mz-prerozdeleni.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (...p) => JSON.parse(fs.readFileSync(path.join(ROOT, ...p), 'utf8'));
const FIX = fs.readFileSync(path.join(ROOT, 'tests', 'fixtures', 'mz-prerozdeleni', 'vyber-uryvek.txt'), 'utf8');
const VYBER = read('ingest', 'manual', 'pojistovny', 'prerozdeleni-mz-vyber.json');
const POJ = read('ingest', 'manual', 'pojistovny', 'prerozdeleni-mz-pojistovna.json');
const PD = read('data', 'pojistovny-prerozdeleni.json');
const copy = (o) => JSON.parse(JSON.stringify(o));
const ZKR = Object.fromEntries(read('data', 'pojistovny.json').pojistovny.map((z) => [z.kod, z.zkratka]));

// ------------------------------------------------------------------ parser

test('parseVyber: fixtura (VZP, ZPŠ, celkem × 2024 a 2026) – hodnoty z PDF MZ, 2026 jen 10 měsíců', () => {
  const p = parseVyber(FIX);
  assert.deepEqual(Object.keys(p.roky), ['2024', '2026']);
  assert.equal(p.roky['2024']['111'][0], 16775548, 'VZP 1/2024');
  assert.equal(p.celkem['2024'][0], 30526837, 'celkem 1/2024');
  assert.equal(p.roky['2024']['111'].length, 12);
  // úzké sloupce a trojciferné skupiny (nejednoznačné dělení bez polohy sloupců)
  assert.deepEqual(p.roky['2024']['209'], [545005, 468928, 418332, 407334, 441587, 676059, 656417, 444998, 475393, 440253, 452210, 449835]);
  // rok 2026: deset měsíců, zbytek null (nic se nedomýšlí)
  assert.equal(p.roky['2026']['111'].length, 12);
  assert.equal(p.roky['2026']['111'][9], 17354736);
  assert.deepEqual(p.roky['2026']['111'].slice(10), [null, null]);
  assert.deepEqual(p.celkem['2026'].slice(10), [null, null]);
  assert.equal(p.roky['2026']['209'][5], 810237);
  assert.deepEqual(p.zamestnanecke, {}, 'v úryvku řádek „Celkem zaměstnanecké“ není');
});

test('rozdel: číslo s jednou mezerou jako oddělovač tisíců se dělí podle polohy sloupce, ne podle mezer', () => {
  // „545 005 468 928“ jsou dvě čísla, ne jedno
  const tok = [{ txt: '545', end: 3 }, { txt: '005', end: 7 }, { txt: '468', end: 11 }, { txt: '928', end: 15 }];
  assert.deepEqual(rozdel(tok, [7, 15], 2).hodnoty, [545005, 468928]);
  assert.equal(rozdel(tok, [7, 15], 3), null, 'tři čísla z čtyř skupin po min. 2 skupinách nejdou');
});

test('parseVyber: chybí-li hlavička nebo řádky, nevrací nic; text mimo tabulku se ignoruje', () => {
  assert.deepEqual(parseVyber('nic\nVšeobecná zdravotní pojišťovna ČR (111) 1 000 2 000'), { roky: {}, celkem: {}, zamestnanecke: {} });
});

test('zkontrolujSoucty: součet 7 ZP = celkem ±2 tis. Kč, jinak chyba; zaokrouhlení ±2 projde', () => {
  const r = { 2024: { celkem: [70], zamestnanecke: [60] } };
  KODY.forEach((k, i) => { r[2024][k] = [i === 0 ? 10 : 10]; });
  assert.deepEqual(zkontrolujSoucty(r), []);
  r[2024].celkem = [72];
  assert.deepEqual(zkontrolujSoucty(r), []);
  r[2024].celkem = [80];
  assert.match(zkontrolujSoucty(r)[0], /Σ 7 ZP 70 ≠ celkem 80/);
});

test('sloucitParsovane: překryv ze dvou souborů, rozdíl se hlásí, novější vyplní null', () => {
  const a = { roky: { 2024: { 111: [1, 2] } }, celkem: { 2024: [5, 6] }, zamestnanecke: {} };
  const b = { roky: { 2024: { 111: [1, 3] } }, celkem: { 2024: [5, 6] }, zamestnanecke: {} };
  assert.equal(sloucitParsovane([a, b]).rozdily.length, 1);
  const c = { roky: { 2024: { 111: [1, null] } }, celkem: { 2024: [5, 6] }, zamestnanecke: {} };
  assert.deepEqual(sloucitParsovane([a, c]).roky['2024']['111'], [1, 2]);
});

test('parseOdkazy a nejnovejsi: odkazy na PDF ze stránky MZ, nejnovější podle roku a měsíce', () => {
  const html = '<a href="https://mzd.gov.cz/wp-content/uploads/2014/11/prerozdelovani_pojistovna_vyber_2026_10.pdf">x</a>'
    + '<a href="/wp-content/uploads/2014/11/prerozdelovani_pojistovna_vyber_2024_12.pdf">y</a>'
    + '<a href="https://mzd.gov.cz/wp-content/uploads/2014/11/prerozdelovani_pojistovna_vysledek_2026_10.pdf">z</a>'
    + '<a href="https://mzd.gov.cz/wp-content/uploads/2014/11/prerozdelovani_pojistenec_vysledek_2026_10.pdf">pojištěnec se nebere</a>';
  const o = parseOdkazy(html);
  assert.equal(o.length, 3);
  assert.equal(nejnovejsi(o, 'vyber').soubor, 'prerozdelovani_pojistovna_vyber_2026_10.pdf');
  assert.equal(nejnovejsi(o, 'vysledek').url, 'https://mzd.gov.cz/wp-content/uploads/2014/11/prerozdelovani_pojistovna_vysledek_2026_10.pdf');
  assert.equal(nejnovejsi([], 'vyber'), null);
  const plan = planStazeni(o);
  assert.equal(plan.length, 5, 'pevné 2021_12 ×2, 2024_12 + nejnovější výběr a výsledek');
  assert.equal(new Set(plan.map((p) => p.soubor)).size, plan.length);
});

test('stahni: stránka → PDF → cache + manifest se sha256; druhý běh bere z cache; odpověď, která není PDF, spadne', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mzprer-'));
  const page = '<a href="prerozdelovani_pojistovna_vyber_2026_10.pdf"></a><a href="prerozdelovani_pojistovna_vysledek_2026_10.pdf"></a>';
  let volani = 0;
  const fetchImpl = async (url) => {
    volani++;
    if (url.endsWith('/')) return new Response(page, { status: 200 });
    return new Response(Buffer.from('%PDF-1.4 test ' + url), { status: 200 });
  };
  const log = () => {};
  const r = await stahni({ dir, fetchImpl, sleepImpl: async () => {}, pauseMs: 0, log });
  assert.equal(r.manifest.polozky.length, 5);
  assert.ok(r.manifest.polozky.every((p) => /^[0-9a-f]{64}$/.test(p.sha256) && p.velikost > 5));
  assert.ok(fs.existsSync(path.join(dir, 'manifest.json')));
  const prvni = volani;
  await stahni({ dir, fetchImpl, sleepImpl: async () => {}, pauseMs: 0, log });
  assert.equal(volani - prvni, 1, 'podruhé jen stránka MZ, PDF z cache');
  const dir2 = fs.mkdtempSync(path.join(os.tmpdir(), 'mzprer-'));
  await assert.rejects(stahni({ dir: dir2, sleepImpl: async () => {}, pauseMs: 0, log, fetchImpl: async (u) => new Response(u.endsWith('/') ? page : 'není pdf', { status: 200 }) }), /není PDF/);
  const dry = await stahni({ dir: dir2, dryRun: true, fetchImpl, sleepImpl: async () => {}, pauseMs: 0, log });
  assert.equal(dry.manifest, null);
});

test('sestavVyberJson: koncové null se ořežou (stejný tvar jako prerozdeleni-mz-pojistovna.json)', () => {
  const p = parseVyber(FIX);
  const j = sestavVyberJson({ vyber: sloucitParsovane([p]), soubory: ['x'], overeno: '2026-11-03' });
  assert.equal(j.roky['2026']['111'].length, 10);
  assert.equal(j.roky['2024']['111'].length, 12);
  assert.equal(j.zdroj.overeno, '2026-11-03');
});

// ------------------------------------------------------------------ data z PDF MZ

test('prerozdeleni-mz-vyber.json: 2019–2026, 7 ZP + celkem + zaměstnanecké, 12 měsíců (2026 jen 10), součty sedí', () => {
  assert.deepEqual(Object.keys(VYBER.roky), ['2019', '2020', '2021', '2022', '2023', '2024', '2025', '2026']);
  for (const [rok, r] of Object.entries(VYBER.roky)) {
    const n = rok === '2026' ? 10 : 12;
    for (const k of [...KODY, 'celkem', 'zamestnanecke']) assert.equal(r[k]?.length, n, `${rok}/${k}`);
    assert.ok(r['111'].every((v) => Number.isInteger(v) && v > 100000 && v < 100000000));
  }
  assert.deepEqual(zkontrolujSoucty(VYBER.roky), []);
  assert.equal(VYBER.roky['2024']['111'][0], 16775548);
  assert.equal(VYBER.roky['2024'].celkem[0], 30526837);
  assert.ok(VYBER.zdroj.url && VYBER.zdroj.overeno && VYBER.zdroj.soubory.length >= 3);
});

test('prerozdeleni-mz-vyber.json: doplněk „po přerozdělení“ 2019–2021 má sedící součty a navazuje na 2022', () => {
  const D = VYBER.doplnek_po_prerozdeleni;
  assert.deepEqual(Object.keys(D.roky), ['2019', '2020', '2021']);
  assert.deepEqual(zkontrolujSoucty(D.roky), []);
  assert.equal(D.roky['2019']['111'][0], 17215459);
  assert.ok(!('2019' in POJ.roky), 'prerozdeleni-mz-pojistovna.json zůstává 2022→ (měsíční kmen začíná 2022-01)');
});

// ------------------------------------------------------------------ transform

const ROKY_MALE = (n12, n3) => {
  const r = {};
  for (const [rok, n] of [['2023', n12], ['2024', n3]]) {
    r[rok] = {};
    KODY.forEach((k, i) => { r[rok][k] = Array.from({ length: n }, () => 100000 * (i + 1)); });
    r[rok].celkem = Array.from({ length: n }, () => 100000 * 28);
  }
  return r;
};
const malyVstup = () => {
  const roky = ROKY_MALE(12, 3);
  const po = copy(roky);
  for (const rok of Object.keys(po)) for (const k of KODY) po[rok][k] = po[rok][k].map((v, i) => (k === '111' ? v + 50000 : k === '201' ? v - 10000 : v));
  for (const rok of Object.keys(po)) po[rok].celkem = po[rok].celkem.map((v) => v + 40000);
  return { vyber: { roky, zdroj: { url: 'u', soubory: [], overeno: '2026-11-03' } }, pojistovna: { roky: po, zdroj: { url: 'u', soubory: [], overeno: '2026-11-03' } } };
};

test('transform (malý vstup): rozdíl = po − vybráno, roční součty v mld., neúplný rok null, bez platby státu saldo null', () => {
  const d = sestavPrerozdeleni({ ...malyVstup(), zkratky: ZKR });
  assert.equal(d.mesice.length, 15);
  assert.equal(d.mesice[12], '2024-01');
  assert.equal(d.posledni_mesic, '2024-03');
  const z = d.pojistovny[0];
  assert.equal(z.kod, '111');
  assert.equal(z.zkratka, 'VZP ČR');
  assert.equal(z.rozdil[0], 50000);
  assert.equal(z.rocne['2023'].vybrano_mld, 1.2);       // 12 × 100 000 tis. Kč
  assert.equal(z.rocne['2023'].po_prerozdeleni_mld, 1.8);
  assert.equal(z.rocne['2023'].rozdil_mld, 0.6);
  assert.equal(z.rocne['2023'].mesicu, 12);
  assert.equal(z.rocne['2024'].mesicu, 3);
  assert.equal(z.rocne['2024'].vybrano_mld, null);
  assert.equal(z.rocne['2024'].rozdil_mld, null);
  assert.equal(d.posledni_rok_rocni, 2023);
  assert.deepEqual(validatePrerozdeleni(d, { tab1VyberTis: {} }).errors, []);
});

test('transform: relativní saldo = po − vybráno × (Σ po / Σ vybráno); Σ přes 7 ZP = 0; měsíční rozdil_relativni', () => {
  const d = sestavPrerozdeleni({ ...malyVstup(), zkratky: ZKR });
  // 2023: Σ vybráno = 28 × 100 000 × 12 = 33 600 000 tis.; Σ po = Σ vybráno + (50 000 − 10 000) × 12 = 34 080 000 → koef 1,0142857…
  // (celkem v malém vstupu nemá vliv: počítá se ze 7 ZP)
  const k = 34080000 / 33600000;
  const vzp = d.pojistovny[0].rocne['2023'];
  assert.equal(vzp.saldo_relativni_mld, Math.round(((150000 * 12 - 100000 * 12 * k) / 1e6) * 1e4) / 1e4);
  assert.equal(vzp.saldo_relativni_pct_vybraneho, Math.round((vzp.saldo_relativni_mld / vzp.vybrano_mld) * 1e4) / 1e2);
  const s = d.pojistovny.reduce((a, z) => a + z.rocne['2023'].saldo_relativni_mld, 0);
  assert.ok(Math.abs(s) <= 0.001, String(s));
  for (let i = 0; i < d.mesice.length; i++) {
    assert.ok(Math.abs(d.pojistovny.reduce((a, z) => a + z.rozdil_relativni[i], 0)) <= 2);
  }
  assert.equal(d.pojistovny[0].rozdil_relativni[0], Math.round((150000 - 100000 * k) * 10) / 10);
  assert.equal(vzp.saldo_relativni_na_pojistence_kc, null, 'bez počtu pojištěnců null');
  assert.ok(!('saldo_ciste_mld' in vzp) && !('platba_statu_mld' in vzp));
  assert.equal(d.pojistovny[0].rocne['2024'].saldo_relativni_mld, null, 'neúplný rok');
  assert.equal(d.pojistovny[0].rozdil_relativni[13] !== null, true, 'měsíce neúplného roku mají měsíční hodnotu');
});

test('transform: A1.1 slouží jen pro pojistenci_prumer; relativní saldo na pojištěnce', () => {
  const v = malyVstup();
  const rady = { pojistovny: KODY.map((k, i) => ({ kod: k, rady: {
    platba_statu_mld: { 2023: { hodnota: 0.4 } },
    pojistenci_prumer: { 2023: { hodnota: 1000000 * (i + 1) } },
  } })) };
  const d = sestavPrerozdeleni({ ...v, zkratky: ZKR, rady });
  const r = d.pojistovny[0].rocne['2023'];
  assert.equal(r.pojistenci_prumer, 1000000);
  assert.equal(r.pojistenci_zdroj, 'hospodareni-rady');
  assert.equal(r.saldo_relativni_na_pojistence_kc, Math.round((r.saldo_relativni_mld * 1e9) / 1000000));
  assert.equal(r.rozdil_na_pojistence_kc, 600);
  assert.ok(!JSON.stringify(d).includes('platba_statu_mld'));
});

test('transform: pojistenci_prumer bez A1.1 z měsíčního kmene (průměr 12 měsíců), jinak null', () => {
  const v = malyVstup();
  const mesice = Array.from({ length: 12 }, (_, i) => `2023-${String(i + 1).padStart(2, '0')}`);
  const kmen = { mesice, pojistovny: KODY.map((k) => ({ kod: k, pocty: new Array(12).fill(k === '111' ? 6000000 : 700000) })) };
  const d = sestavPrerozdeleni({ ...v, zkratky: ZKR, kmen });
  assert.equal(d.pojistovny[0].rocne['2023'].pojistenci_prumer, 6000000);
  assert.equal(d.pojistovny[0].rocne['2023'].pojistenci_zdroj, 'kmen-mesicni');
  assert.equal(d.pojistovny[0].rocne['2023'].rozdil_na_pojistence_kc, 100);   // 0,6 mld / 6 mil.
  assert.equal(d.pojistovny[0].rocne['2024'].pojistenci_prumer, null);
});

test('transform: chybějící měsíc ve výsledku po přerozdělení → null v řadě i v roce, rozdíl null', () => {
  const v = malyVstup();
  v.pojistovna.roky['2023']['111'][4] = null;
  const d = sestavPrerozdeleni({ ...v, zkratky: ZKR });
  assert.equal(d.pojistovny[0].po_prerozdeleni[4], null);
  assert.equal(d.pojistovny[0].rozdil[4], null);
  assert.equal(d.pojistovny[0].rocne['2023'].rozdil_mld, null);
  assert.equal(d.pojistovny[1].rocne['2023'].rozdil_mld, -0.12);
});

// ------------------------------------------------------------------ reálný výstup a validátor

test('data/pojistovny-prerozdeleni.json: 2019-01 až poslední zveřejněný měsíc, 7 ZP, validátor bez chyb', () => {
  assert.equal(PD.mesice[0], '2019-01');
  assert.equal(PD.mesice.length, 94);
  assert.equal(PD.posledni_mesic, '2026-10');
  assert.equal(PD.posledni_rok_rocni, 2025);
  assert.equal(PD.pojistovny.length, 7);
  const v = validatePrerozdeleni(PD);
  assert.deepEqual(v.errors, []);
  // známé varování: výběr 2024 vs Tab. 1 MZ (jiné vymezení, ~0,6 %)
  for (const w of v.warnings.filter((x) => /^výběr 2024/.test(x))) assert.match(w, /^výběr 2024: Σ 7 ZP 340\.615 mld/);
});

test('data: VZP 2024 – výběr, po přerozdělení a rozdíl; Σ rozdílů 2024 = „vliv přerozdělování“ tab. 1c MZ (155,55 mld)', () => {
  const vzp = PD.pojistovny[0].rocne['2024'];
  assert.equal(vzp.vybrano_mld, 188.541);
  assert.equal(vzp.po_prerozdeleni_mld, 291.914);
  assert.equal(vzp.rozdil_mld, 103.373);
  assert.ok(vzp.rozdil_mld > 0);
  // Tab. 1c Hodnocení MZ 2024 (tis. Kč): VZP 103 378 440, Σ ZP 155 552 676
  assert.ok(Math.abs(vzp.rozdil_mld - 103.37844) < 0.01);
  assert.ok(Math.abs(PD.celkem.rocne['2024'].rozdil_mld - 155.552676) < 0.05);
  // Σ výběru 2024 ≈ Tab. 1 MZ ±1 % (±0,5 % je cíl; skutečný rozdíl viz varování validátoru)
  const sum = PD.pojistovny.reduce((a, z) => a + z.rocne['2024'].vybrano_mld, 0);
  assert.ok(Math.abs(sum * 1e6 / TAB1_VYBER_TIS[2024] - 1) < 0.01);
});

test('data: roční součty = součet měsíců, neúplný rok 2026 má roční null a mesicu 10, celkem = řádek MZ', () => {
  for (const z of [...PD.pojistovny, PD.celkem]) {
    const idx = PD.mesice.map((m, i) => (m.startsWith('2022') ? i : -1)).filter((i) => i >= 0);
    const s = idx.reduce((a, i) => a + z.vybrano[i], 0) / 1e6;
    assert.ok(Math.abs(z.rocne['2022'].vybrano_mld - s) < 0.0006);
    assert.equal(z.rocne['2026'].mesicu, 10);
    assert.equal(z.rocne['2026'].vybrano_mld, null);
    assert.equal(z.rocne['2019'].mesicu, 12);
  }
  assert.equal(PD.celkem.vybrano[0], VYBER.roky['2019'].celkem[0]);
});

test('data: relativní saldo 2024 – VZP kladné, Σ 7 ZP = 0 (±0,001 mld.), Σ měsíčních = 0 (±2 tis. Kč)', () => {
  const vzp = PD.pojistovny[0].rocne['2024'];
  assert.ok(vzp.saldo_relativni_mld > 0);
  const roky = [...new Set(PD.mesice.map((m) => m.slice(0, 4)))].filter((y) => y !== '2026');
  for (const y of roky) {
    const s = PD.pojistovny.reduce((a, z) => a + z.rocne[y].saldo_relativni_mld, 0);
    assert.ok(Math.abs(s) <= 0.001, `${y}: ${s}`);
  }
  PD.mesice.forEach((_, i) => assert.ok(Math.abs(PD.pojistovny.reduce((a, z) => a + z.rozdil_relativni[i], 0)) <= 2));
  assert.equal(PD.pojistovny[0].rocne['2026'].saldo_relativni_mld, null);
  assert.ok(!JSON.stringify(PD).includes('saldo_ciste') && !JSON.stringify(PD).includes('platba_statu_mld'));
});

test('validatePrerozdeleni: rozbitá kopie – součet ZP, vybrano ≤ 0, rozdíl, měsíce, saldo bez platby, neúplný rok', () => {
  const chyby = (fn) => { const c = copy(PD); fn(c); return validatePrerozdeleni(c).errors.join(' | '); };
  assert.match(chyby((p) => { p.pojistovny[0].vybrano[10] += 5000; }), /Σ 7 ZP/);
  assert.match(chyby((p) => { p.pojistovny[1].vybrano[3] = 0; }), /není > 0/);
  assert.match(chyby((p) => { p.pojistovny[2].rozdil[5] += 1; }), /rozdil/);
  assert.match(chyby((p) => { p.mesice.splice(5, 1); }), /mezera|délka/);
  assert.match(chyby((p) => { p.pojistovny[0].rocne['2024'].saldo_relativni_mld += 0.01; }), /Σ saldo_relativni_mld 2024/);
  assert.match(chyby((p) => { p.pojistovny[0].rozdil_relativni[7] += 10; }), /Σ rozdil_relativni 2019-08/);
  assert.match(chyby((p) => { p.pojistovny[0].rocne['2024'].saldo_relativni_pct_vybraneho += 1; }), /saldo_relativni_pct_vybraneho nesedí/);
  assert.match(chyby((p) => { p.pojistovny[0].rocne['2026'].vybrano_mld = 5; }), /neúplný rok/);
  assert.match(chyby((p) => { p.pojistovny[0].rocne['2023'].vybrano_mld += 1; }), /vybrano_mld/);
  assert.match(chyby((p) => { p.pojistovny.pop(); }), /pojistovny: očekáváno/);
  assert.match(chyby((p) => { p.posledni_rok_rocni = 2024; }), /posledni_rok_rocni/);
});

// ------------------------------------------------------------------ idempotence

test('transform je idempotentní: dvakrát stejný výstup, běh nad stejnými vstupy nic nepřepisuje', () => {
  const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'prer-')), 'out.json');
  const a = run({ out: tmp });
  assert.equal(a.zmeneno, true);
  const text1 = fs.readFileSync(tmp, 'utf8');
  const b = run({ out: tmp });
  assert.equal(b.zmeneno, false);
  assert.equal(fs.readFileSync(tmp, 'utf8'), text1);
  assert.equal(b.data.generated_at, a.data.generated_at);
  // měsíční řady v repu = výstup ze vstupů z PDF (drift test; roční saldo závisí na volitelném A1.1)
  const repo = PD;
  assert.deepEqual(repo.mesice, a.data.mesice);
  assert.deepEqual(repo.pojistovny.map((z) => [z.vybrano, z.po_prerozdeleni, z.rozdil]), a.data.pojistovny.map((z) => [z.vybrano, z.po_prerozdeleni, z.rozdil]));
});
