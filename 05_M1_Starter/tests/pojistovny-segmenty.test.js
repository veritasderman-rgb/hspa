// Testy balíčku A1.4: struktura nákladů podle segmentů (parser Tabulky č. 3/3a, slovník segmentů, validátor, transform).
// Parsery běží nad malými výřezy skutečných listů (tests/fixtures/mz-hodnoceni/segmenty-*.json).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { parseTab3Segmenty } from '../ingest/lib/mz-hodnoceni.js';
import { validateSegmenty, urovenV } from '../ingest/lib/validate-segmenty.js';
import { run, priradId, normText, nazevRadku, slug, skupinaId, CACHE_DIR, bezCasu } from '../ingest/transform_pojistovny_segmenty.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const FX = path.join(here, 'fixtures', 'mz-hodnoceni');
const rows = (n) => JSON.parse(fs.readFileSync(path.join(FX, n), 'utf8')).rows;
const DATA = path.join(here, '..', 'data');
const real = () => JSON.parse(fs.readFileSync(path.join(DATA, 'pojistovny-segmenty.json'), 'utf8'));
const rady = () => JSON.parse(fs.readFileSync(path.join(DATA, 'pojistovny-hospodareni-rady.json'), 'utf8'));
const maCache = fs.existsSync(path.join(CACHE_DIR, 'manifest.json'));

test('parseTab3Segmenty 2024: řádky I., 1, 1.1, 1.2, dvě ZP, skutečnost a ZPP s polohou v listu', () => {
  const t = parseTab3Segmenty(rows('segmenty-2024-vyrez.json'), { rok: 2024 });
  assert.deepEqual(t.radky.map((r) => r.kod), ['I.', '1', '1.1', '1.2']);
  assert.deepEqual(Object.keys(t.radky[0].hodnoty), ['111', '201']);
  const celkem = t.radky[0].hodnoty['111'];
  assert.deepEqual(celkem.skut, { hodnota: 295195275, radek: 7, sloupec: 'F' });
  assert.deepEqual(celkem.zpp, { hodnota: 291058000, radek: 7, sloupec: 'E' });
  const amb = t.radky[1];
  assert.equal(amb.radek, 8); // výřez vynechává řádek „v tom:“, v celém listu je to řádek 9
  assert.equal(amb.hodnoty['111'].skut.hodnota, 80154583);
  assert.equal(t.radky[2].hodnoty['111'].skut.hodnota, 10602959);
  assert.equal(t.radky[2].hodnoty['201'].skut.sloupec, 'K');
});

test('parseTab3Segmenty 2015: sloupec „m. j.“ posune bloky, bere se rok 2015 a ne předchozí rok', () => {
  const t = parseTab3Segmenty(rows('segmenty-2015-vyrez.json'), { rok: 2015 });
  assert.deepEqual(t.radky.map((r) => r.kod), ['I.', '1', '1.1', '1.2']);
  assert.deepEqual(t.radky[0].hodnoty['111'].skut, { hodnota: 146854380, radek: 7, sloupec: 'G' });
  assert.equal(t.radky[0].hodnoty['111'].zpp.hodnota, 146009000);
  assert.equal(t.radky[0].hodnoty['201'].skut.hodnota, 15170498);
  assert.throws(() => parseTab3Segmenty(rows('segmenty-2015-vyrez.json').slice(0, 3), { rok: 2015 }), /hlavička/);
});

test('parseTab3Segmenty: Tabulka č. 3a (Kč na pojištěnce) má stejné řádky', () => {
  const a = parseTab3Segmenty(rows('segmenty-2024-vyrez.json'), { rok: 2024 });
  const b = parseTab3Segmenty(rows('segmenty-2024-3a-vyrez.json'), { rok: 2024 });
  assert.deepEqual(b.radky.map((r) => [r.kod, r.radek]), a.radky.map((r) => [r.kod, r.radek]));
  assert.ok(Math.abs(b.radky[0].hodnoty['111'].skut.hodnota - 47997.78) < 0.01);
});

test('slovník segmentů: stejné id napříč ročníky přes jinak formulovaný popisek, slug je stabilní', () => {
  const r15 = priradId(parseTab3Segmenty(rows('segmenty-2015-vyrez.json'), { rok: 2015 }).radky, 2015);
  const r24 = priradId(parseTab3Segmenty(rows('segmenty-2024-vyrez.json'), { rok: 2024 }).radky, 2024);
  assert.deepEqual(r15.chyby, []);
  assert.deepEqual(r24.chyby, []);
  assert.deepEqual(r15.radky.map((r) => r.id), ['amb_celkem', 'amb_stomatologie', 'amb_pl_pldd']);
  assert.deepEqual(r24.radky.map((r) => r.id), ['amb_celkem', 'amb_stomatologie', 'amb_pl_pldd']);
  assert.deepEqual(r24.radky.map((r) => r.uroven), [1, 2, 2]);
  // slug nezávisí na „v tom:“, velikosti písmen, diakritice a mezerách
  assert.equal(slug('v tom: Skupina praktických  lékařů'), slug('skupina praktických lékařů'));
  assert.equal(slug('Ošetřovatelská lůžka (OD 00005)'), 'osetrovatelska_luzka_od_00005');
  assert.equal(nazevRadku('v tom:  skupina   praktických lékařů 1)'), 'Skupina praktických lékařů');
  assert.equal(normText('Z toho: Léčivé přípravky'), 'lecive pripravky');
});

test('slovník segmentů: neznámý řádek a duplicita jsou chyba, ne tiché zařazení; nadřazený řádek rozlišuje stejné popisky', () => {
  const base = [{ kod: '1', text: 'na ambulantní péči celkem (poskytovatelé …)', radek: 9, hodnoty: {} }];
  const neznamy = priradId([...base, { kod: '1.99', text: 'úplně nový řádek MZ', radek: 10, hodnoty: {} }], 2030);
  assert.equal(neznamy.chyby.length, 1);
  assert.match(neznamy.chyby[0], /2030.*1\.99.*nesedí/);
  const leky = priradId([
    { kod: '6', text: 'na léky vydané na recepty celkem:', radek: 1, hodnoty: {} },
    { kod: '6.1', text: 'předepsané u poskytovatelů ambulantní péče (samostatní ambulantní PZS)', radek: 2, hodnoty: {} },
    { kod: '7', text: 'na zdravotnické prostředky vydané na poukazy celkem', radek: 3, hodnoty: {} },
    { kod: '7.1', text: 'předepsané u poskytovatelů ambulantní péče (samostatní ambulantní PZS)', radek: 4, hodnoty: {} },
  ], 2024);
  assert.deepEqual(leky.chyby, []);
  assert.deepEqual(leky.radky.map((r) => r.id), ['leky_celkem', 'leky_amb', 'zp_celkem', 'zp_amb']);
  assert.deepEqual(['leky_amb', 'zp_amb', 'amb_celkem', 'luz_olu', 'lazne'].map(skupinaId), ['leky', 'ostatni', 'ambulantni', 'luzkova', 'ostatni']);
});

test('validateSegmenty: reálný data/pojistovny-segmenty.json je v pořádku a kontroly skutečně běží', () => {
  const S = real();
  const v = validateSegmenty(S, { hospodareniRady: rady() });
  assert.deepEqual(v.errors, []);
  assert.equal(v.checks.soucty_urovne1, 80); // 8 subjektů (7 ZP + CR) × 10 ročníků
  assert.equal(v.checks.shoda_s_hospodarenim, 80);
  assert.ok(v.checks.na_pojistence > 500);
  assert.deepEqual(S.roky, [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024]);
  assert.deepEqual(S.pojistovny.map((p) => p.kod), ['111', '201', '205', '207', '209', '211', '213']);
});

test('reálná data: kontrolní hodnoty VZP 2024 (PDF Tab. 10) a obálky nesou polohu v listu', () => {
  const S = real();
  const vzp = S.pojistovny.find((p) => p.kod === '111');
  const y = vzp.rady['2024'];
  assert.equal(Math.round(y.amb_celkem.tis_kc / 1000), 80155);
  assert.equal(Math.round(y.luz_celkem.tis_kc / 1000), 169961);
  assert.equal(Math.round(vzp.celkem['2024'].tis_kc / 1000), 295195);
  assert.equal(y.amb_celkem.radek, 9);
  assert.deepEqual(Object.keys(y.amb_celkem), ['tis_kc', 'na_pojistence_kc', 'zpp_tis_kc', 'radek']);
  assert.match(S.zdroje['2024'].url, /vz2024_hodnoceni_tab_3-3a-3b-3c\.xlsx$/);
  assert.equal(S.zdroje['2024'].list_3a, 'Tabulka č. 3a');
  assert.ok(Object.values(vzp.rady['2021']).every((o) => o === null || Number.isInteger(o.tis_kc)));
  assert.ok(fs.statSync(path.join(DATA, 'pojistovny-segmenty.json')).size <= 450 * 1024);
  assert.ok(y.amb_celkem.na_pojistence_kc > 13000 && y.amb_celkem.na_pojistence_kc < 13100);
  // segment, který v ročníku není, je null a má záznam v chybi[]
  assert.equal(vzp.rady['2024'].amb_hemodialyza !== null, true);
  assert.equal(vzp.rady['2015'].amb_hemodialyza, null);
  assert.ok(S.chybi.some((c) => c.segment === 'amb_hemodialyza' && c.roky.includes(2015) && c.kody === 'vsechny'));
  // úroveň ozdraven se změnila (samostatný řádek → podřádek lázní)
  const oz = S.segmenty.find((s) => s.id === 'ozdravovny');
  assert.equal(urovenV(oz, 2020), 1);
  assert.equal(urovenV(oz, 2024), 2);
});

test('validateSegmenty: rozbitá kopie vrací chyby (součet, shoda s hospodařením, enum, chybějící ZP, null bez chybi)', () => {
  const H = rady();
  const kopie = () => structuredClone(real());

  let S = kopie();
  S.pojistovny[0].rady['2024'].amb_celkem.tis_kc *= 1.02; // úroveň 1 → součet přestane sedět
  let v = validateSegmenty(S, { hospodareniRady: H });
  assert.ok(v.errors.some((e) => /111\[2024\].*součet řádků úrovně 1/.test(e)), v.errors.join('\n'));

  S = kopie();
  const c = S.pojistovny[1].celkem['2022'];
  c.tis_kc *= 1.003; // 0,3 %: součty v toleranci 0,5 %, ale shoda s naklady_zs_mld (0,1 %) padá
  v = validateSegmenty(S, { hospodareniRady: H });
  assert.ok(v.errors.some((e) => /201\[2022\].*naklady_zs_mld/.test(e)), v.errors.join('\n'));
  assert.ok(!v.errors.some((e) => /201\[2022\].*součet/.test(e)));

  S = kopie();
  S.segmenty[0].skupina = 'nemocnice';
  v = validateSegmenty(S, { hospodareniRady: H });
  assert.ok(v.errors.some((e) => /skupina „nemocnice“/.test(e)));

  S = kopie();
  S.pojistovny.pop();
  v = validateSegmenty(S, { hospodareniRady: H });
  assert.ok(v.errors.some((e) => /pojistovny: očekáváno/.test(e)));

  S = kopie();
  S.pojistovny[2].rady['2020'].amb_stomatologie = null;
  v = validateSegmenty(S, { hospodareniRady: H });
  assert.ok(v.errors.some((e) => /205\.rady\[2020\]\[amb_stomatologie\]: null bez záznamu v chybi/.test(e)));

  S = kopie();
  delete S.zdroje['2018'];
  v = validateSegmenty(S, { hospodareniRady: H });
  assert.ok(v.errors.some((e) => /zdroje\[2018\]: chybí url/.test(e)), v.errors.join('\n'));

  S = kopie();
  S.roky = [2015, 2016, 2018];
  v = validateSegmenty(S, { hospodareniRady: H });
  assert.ok(v.errors.some((e) => /roky: řada není vzestupná/.test(e)));
});

test('validateSegmenty: na_pojistence × pojištěnci mimo ±1 % je jen varování', () => {
  const S = real();
  S.pojistovny[0].rady['2024'].amb_celkem.na_pojistence_kc *= 1.05;
  const v = validateSegmenty(S, { hospodareniRady: rady() });
  assert.deepEqual(v.errors, []);
  assert.ok(v.warnings.some((w) => /111\.rady\[2024\]\[amb_celkem\].*na_pojistence_kc/.test(w)));
});

test('transform: výstup z cache je shodný s commitnutým souborem a běh je idempotentní', { skip: !maCache && 'chybí ingest/cache/mz-hodnoceni (npm: node ingest/fetchers/mz-hodnoceni.js)' }, () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'segmenty-'));
  const out = path.join(tmp, 'pojistovny-segmenty.json');
  try {
    const a = run({ out });
    assert.deepEqual(a.errors, []);
    assert.equal(a.zmeneno, true);
    const zapsano = JSON.parse(fs.readFileSync(out, 'utf8'));
    const b = run({ out });
    assert.equal(b.zmeneno, false);
    assert.equal(b.data.generated_at, zapsano.generated_at);
    assert.equal(fs.readFileSync(out, 'utf8').includes(zapsano.generated_at), true);
    // shoda s commitnutým souborem bez časových razítek: v CI je cache čerstvě stažená, takže stazeno_at se liší
    assert.deepEqual(bezCasu(zapsano), bezCasu(real()));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
