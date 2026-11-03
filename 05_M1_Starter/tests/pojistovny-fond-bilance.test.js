// Testy datasetu data/pojistovny-fond-bilance.json (A7.1 c + A7.2): bilance fondu prevence z výročních zpráv.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateFondBilance, cislaNaRadku, VZ_DIR } from '../ingest/lib/validate-fond-bilance.js';
import { sestav, najdiTabulky, nactiTexty, run, serializuj, KODY, ROKY } from '../ingest/transform_pojistovny_fond_bilance.js';
import { validateAll, loadDatasets } from '../ingest/validate-pojistovny.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.join(here, '..', 'data', 'pojistovny-fond-bilance.json');
const real = () => JSON.parse(fs.readFileSync(DATA, 'utf8'));
const rady = () => JSON.parse(fs.readFileSync(path.join(here, '..', 'data', 'pojistovny-hospodareni-rady.json'), 'utf8'));
const lines = new Map();
const radek = (soubor, n) => {
  if (!lines.has(soubor)) lines.set(soubor, fs.readFileSync(path.join(VZ_DIR, soubor), 'utf8').split('\n'));
  return lines.get(soubor)[n - 1];
};
/** Všechny obálky {hodnota, soubor, radek} v datasetu s cestou. */
function obalky(B) {
  const out = [];
  const walk = (x, cesta) => {
    if (Array.isArray(x)) return;
    if (x && typeof x === 'object') {
      if ('hodnota' in x && 'soubor' in x && 'radek' in x) { out.push([cesta, x]); return; }
      for (const [k, v] of Object.entries(x)) walk(v, `${cesta}.${k}`);
    }
  };
  for (const p of B.pojistovny) walk(p.roky, p.kod);
  return out;
}

test('reálný soubor: validátor projde, sedm ZP, roky 2022–2025, kódy jsou řetězce', () => {
  const B = real();
  const v = validateFondBilance(B, { hospodareniRady: rady() });
  assert.deepEqual(v.errors, []);
  assert.deepEqual(B.pojistovny.map((p) => p.kod), KODY);
  assert.ok(B.pojistovny.every((p) => typeof p.kod === 'string' && p.zkratka));
  assert.deepEqual(B.roky, ROKY);
  assert.equal(B.version, '1.0');
  assert.match(B.stav_k, /^\d{4}-\d{2}-\d{2}$/);
  for (const p of B.pojistovny) assert.deepEqual(Object.keys(p.roky), ['2022', '2023', '2024', '2025']);
});

test('kontrolní hodnoty z výročních zpráv (tis. Kč): VoZP 2024, VZP 2024, ZPŠ 2023–2024', () => {
  const B = real();
  const y = (kod, rok) => B.pojistovny.find((p) => p.kod === kod).roky[String(rok)];
  const vozp = y('201', 2024);
  assert.equal(vozp.zustatek_pocatecni.hodnota, 5455);
  assert.equal(vozp.tvorba.celkem.hodnota, 180062);
  assert.equal(vozp.tvorba.ze_zf.hodnota, 51000);
  assert.equal(vozp.tvorba.pokuty_penale.hodnota, 129000);
  assert.equal(vozp.cerpani_celkem.hodnota, 181365);
  assert.equal(vozp.cerpani_programy.hodnota, 181184);
  assert.equal(vozp.zustatek_konecny.hodnota, 4152);
  assert.equal(vozp.bu_zustatek_pocatecni.hodnota, 20918);
  assert.equal(vozp.bu_zustatek_konecny.hodnota, 10673);
  assert.equal(vozp.zustatek_konecny.soubor, '201-2024.txt');
  const vzp = y('111', 2024);
  assert.equal(vzp.cerpani_programy.hodnota, 2079022);
  assert.equal(vzp.tvorba.celkem.hodnota, 1683015);
  assert.equal(vzp.tvorba.z_pf.hodnota, 800000);
  assert.equal(vzp.tvorba.ze_zf, null);
  assert.match(vzp.poznamky['tvorba.ze_zf'], /prázdný/);
  assert.equal(y('209', 2023).vyuziti.pocet_prispevku.hodnota, 76393);
  assert.equal(y('209', 2024).vyuziti.pocet_prispevku.hodnota, 85266);
  assert.equal(y('209', 2024).vyuziti.pocet_zadosti, null);
  assert.match(y('209', 2024).vyuziti.definice, /příspěvků.*Není to počet žádostí ani počet osob/);
  // roky bez VZ: jen zůstatky ze sousedních zpráv, ostatní null s důvodem
  const rbp24 = y('213', 2024);
  assert.equal(rbp24.tvorba.celkem, null);
  assert.equal(rbp24.zustatek_pocatecni.hodnota, 143709);
  assert.equal(rbp24.zustatek_konecny.hodnota, 157525);
  assert.match(rbp24.poznamky['tvorba.celkem'], /213-2024\.txt/);
  assert.equal(y('209', 2025).zustatek_konecny, null);
  assert.equal(y('201', 2022).zustatek_konecny.hodnota, 54696);
});

test('bilance: konečný = počáteční + tvorba − čerpání ±1 tis. Kč všude, kde jsou všechny čtyři; zůstatky navazují mezi roky', () => {
  const B = real();
  let kompletni = 0;
  for (const p of B.pojistovny) {
    for (const rok of B.roky) {
      const r = p.roky[String(rok)];
      const [po, tv, ce, ko] = [r.zustatek_pocatecni, r.tvorba.celkem, r.cerpani_celkem, r.zustatek_konecny].map((c) => c?.hodnota);
      if ([po, tv, ce, ko].every(Number.isFinite)) {
        kompletni++;
        assert.ok(Math.abs(po + tv - ce - ko) <= 1, `${p.kod} ${rok}`);
        const o = r.tvorba.ostatni;
        assert.ok(Math.abs((r.tvorba.ze_zf?.hodnota ?? 0) + (r.tvorba.pokuty_penale?.hodnota ?? 0) + o.hodnota - tv) <= 1, `${p.kod} ${rok} tvorba`);
        assert.equal(o.odvozeno, true);
      }
    }
    for (const rok of [2022, 2023, 2024]) {
      for (const k of ['zustatek', 'bu_zustatek']) {
        const a = p.roky[String(rok)][`${k}_konecny`]?.hodnota; const b = p.roky[String(rok + 1)][`${k}_pocatecni`]?.hodnota;
        if (Number.isFinite(a) && Number.isFinite(b)) assert.ok(Math.abs(a - b) <= 1, `${p.kod} ${k} ${rok}→${rok + 1}: ${a} vs ${b}`);
      }
    }
  }
  assert.ok(kompletni >= 18, `úplná bilance je u ${kompletni} z 21 dostupných ZP × rok`); // 7 ZP × 3 roky mínus RBP 2024 a ZPŠ 2025 = 19
});

test('strojová kontrola citací: každý řádek `radek` v přepisu VZ obsahuje číslo z `hodnota` (kromě odvozených)', () => {
  const B = real();
  const vsechny = obalky(B);
  assert.ok(vsechny.length > 200, `obálek: ${vsechny.length}`);
  let kontrolovano = 0;
  for (const [cesta, c] of vsechny) {
    assert.ok(Number.isInteger(c.radek) && c.radek > 0, cesta);
    assert.ok(fs.existsSync(path.join(VZ_DIR, c.soubor)), `${cesta}: soubor ${c.soubor}`);
    if (c.odvozeno) continue;
    const text = radek(c.soubor, c.radek);
    assert.ok(text !== undefined, `${cesta}: řádek ${c.radek} v ${c.soubor} neexistuje`);
    assert.ok(cislaNaRadku(text).includes(c.hodnota), `${cesta}: řádek ${c.soubor}:${c.radek} neobsahuje ${c.hodnota}: „${text.trim().slice(0, 120)}“`);
    // citace je text toho řádku
    assert.equal(c.citace, text.replace(/\s+/g, ' ').trim().slice(0, 220), `${cesta}: citace neodpovídá řádku`);
    kontrolovano++;
  }
  assert.ok(kontrolovano > 180);
});

test('počty využití (A7.2): jen u ZPŠ, každý s řádkem VZ a definicí; ostatní ZP null s důvodem', () => {
  const B = real();
  const s = [];
  for (const p of B.pojistovny) for (const rok of B.roky) {
    const v = p.roky[String(rok)].vyuziti;
    for (const k of ['pocet_prispevku', 'pocet_zadosti', 'pocet_osob']) if (v[k] != null) s.push([p.kod, rok, k, v[k].hodnota, v[k].soubor, v[k].radek]);
    if (POCTY_NULL(v)) assert.ok(p.roky[String(rok)].poznamky.vyuziti, `${p.kod} ${rok}: důvod`);
    else assert.ok(v.definice.length > 40);
  }
  assert.deepEqual(s, [['209', 2023, 'pocet_prispevku', 76393, '209-2023.txt', 1073], ['209', 2024, 'pocet_prispevku', 85266, '209-2024.txt', 1016]]);
  assert.match(radek('209-2024.txt', 1016), /85 266 příspěvků/);
});
const POCTY_NULL = (v) => v.pocet_prispevku == null && v.pocet_zadosti == null && v.pocet_osob == null;

test('žádná jména osob: tituly a oslovení nejsou v citacích, poznámkách ani definicích', () => {
  const t = fs.readFileSync(DATA, 'utf8');
  assert.equal(/\b(Ing\.|MUDr\.|Mgr\.|JUDr\.|RNDr\.|Bc\.|PhDr\.|prof\.|paní|pan[ae]?)\s/.test(t), false);
});

test('rozbitá kopie: každé porušení pravidla dá chybu', () => {
  const base = real();
  const kopie = (fn, opt = {}) => { const B = structuredClone(base); fn(B); return validateFondBilance(B, { hospodareniRady: rady(), ...opt }); };
  const vozp = (B) => B.pojistovny.find((p) => p.kod === '201').roky['2024'];
  assert.ok(kopie((B) => { vozp(B).zustatek_konecny.hodnota += 5; }).errors.some((e) => /konečný zůstatek .* ≠ počáteční/.test(e)));
  assert.ok(kopie((B) => { vozp(B).zustatek_konecny.hodnota += 1; }).errors.length === 0, 'rozdíl 1 tis. Kč je v toleranci');
  assert.ok(kopie((B) => { vozp(B).cerpani_celkem.soubor = '201-2099.txt'; }).errors.some((e) => /201-2099\.txt neexistuje/.test(e)));
  assert.ok(kopie((B) => { vozp(B).cerpani_celkem.soubor = '../x.txt'; }).errors.some((e) => /tvar <kod>-<rok>\.txt/.test(e)));
  assert.ok(kopie((B) => { vozp(B).cerpani_celkem.radek = 'a'; }).errors.some((e) => /radek: celé číslo/.test(e)));
  assert.ok(kopie((B) => { vozp(B).cerpani_celkem.radek = 999999; }).errors.some((e) => /za koncem souboru/.test(e)));
  assert.ok(kopie((B) => { vozp(B).cerpani_celkem.hodnota = '181365'; }).errors.some((e) => /hodnota: musí být číslo/.test(e)));
  assert.ok(kopie((B) => { vozp(B).tvorba.ostatni.hodnota += 50; }).errors.some((e) => /ze_zf \+ pokuty_penale \+ ostatni/.test(e)));
  assert.ok(kopie((B) => { vozp(B).cerpani_programy.hodnota = 999999; }).errors.some((e) => /čerpání programů .* > čerpání celkem/.test(e)));
  assert.ok(kopie((B) => { delete vozp(B).zustatek_konecny; }).errors.some((e) => /zustatek_konecny: chybí/.test(e)));
  assert.ok(kopie((B) => { vozp(B).zustatek_konecny = null; }).errors.some((e) => /poznamky\.zustatek_konecny: pole je null, chybí důvod/.test(e)));
  assert.ok(kopie((B) => { vozp(B).vyuziti.pocet_prispevku = { hodnota: 5, soubor: '201-2024.txt', radek: 3 }; }).errors.some((e) => /definice: povinná/.test(e)));
  assert.ok(kopie((B) => { vozp(B).poznamky.vyuziti = 'VZ uvádí paní Nováková'; }).errors.some((e) => /titulů osob/.test(e)));
  assert.ok(kopie((B) => { B.pojistovny.pop(); }).errors.some((e) => /pojistovny: očekáváno/.test(e)));
  assert.ok(kopie((B) => { B.pojistovny[0].kod = 111; }).errors.some((e) => /kod: musí být řetězec/.test(e)));
  assert.ok(kopie((B) => { delete B.stav_k; }).errors.some((e) => /missing 'stav_k'/.test(e)));
  assert.ok(validateFondBilance(null).errors.length > 0);
  assert.deepEqual(kopie(() => {}).errors, []);
});

test('WARN: neúplná bilance a čerpání programů vs. Tab. 3c ±2 %', () => {
  const base = real();
  const kopie = (fn) => { const B = structuredClone(base); fn(B); return validateFondBilance(B, { hospodareniRady: rady() }); };
  const zp = (B, kod, rok) => B.pojistovny.find((p) => p.kod === kod).roky[String(rok)];
  const w1 = kopie((B) => { const r = zp(B, '205', 2024); r.zustatek_pocatecni = null; r.poznamky.zustatek_pocatecni = 'test'; });
  assert.deepEqual(w1.errors, []);
  assert.ok(w1.warnings.some((w) => /ZP 205\[2024\]: neúplná bilance \(chybí zustatek_pocatecni\)/.test(w)));
  const w2 = kopie((B) => { zp(B, '111', 2024).cerpani_programy.hodnota += 100000; zp(B, '111', 2024).cerpani_celkem.hodnota += 100000; zp(B, '111', 2024).zustatek_konecny.hodnota -= 100000; });
  assert.ok(w2.warnings.some((w) => /ZP 111\[2024\].*Tab\. 3c/.test(w)));
  // reálná data: jediná odchylka je VoZP (Tab. 3c zahrnuje jiné zdroje než fond)
  const w3 = validateFondBilance(base, { hospodareniRady: rady() }).warnings;
  assert.deepEqual(w3.map((w) => /^ZP (\d{3})\[(\d{4})\]: čerpání programů/.exec(w)?.slice(1).join('/')), ['201/2023', '201/2024']);
  // bez dat MZ se Tab. 3c nekontroluje
  assert.deepEqual(validateFondBilance(base).warnings, []);
});

test('validate-pojistovny zná dataset fondBilance a nejhorší případ nezastaví zbytek validace', () => {
  const sets = loadDatasets();
  assert.ok(sets.fondBilance, 'loadDatasets načte data/pojistovny-fond-bilance.json');
  const r = validateAll(sets);
  assert.deepEqual(r.errors, []);
  const rozbite = structuredClone(sets);
  rozbite.fondBilance.pojistovny[0].roky['2024'].zustatek_konecny.hodnota += 1000;
  assert.ok(validateAll(rozbite).errors.some((e) => /konečný zůstatek/.test(e)));
});

test('parser najdiTabulky: obě tabulky šablony MZ, sloupec Skutečnost, římské a číslované řádky', () => {
  const t = najdiTabulky(fs.readFileSync(path.join(VZ_DIR, '201-2024.txt'), 'utf8'));
  assert.equal(t.A.I.hodnota, 5455);
  assert.equal(t.A.II.hodnota, 180062);
  assert.equal(t.A['1.2.1'].hodnota, 51000);
  assert.equal(t.A['III.1'].hodnota, 181184);
  assert.equal(t.A.IV.hodnota, 4152);
  assert.equal(t.B.I.hodnota, 20918);
  assert.equal(t.B.IV.hodnota, 10673);
  assert.equal(t.A.IV.radek, 2717);
  // rozložení se zalomeným popiskem (ZPŠ): číslo II. na samostatném řádku, hodnoty na následujícím
  const z = najdiTabulky(fs.readFileSync(path.join(VZ_DIR, '209-2024.txt'), 'utf8'));
  assert.equal(z.A.II.hodnota, 48620);
  assert.equal(z.A.IV.hodnota, 59143);
  assert.equal(z.B.IV.hodnota, 61289);
});

test('cislaNaRadku: české tisíce, tečky u narativu, desetinná čárka', () => {
  assert.deepEqual(cislaNaRadku('  I.  Počáteční zůstatek k 1. 1.  112 473  111 988  99,6'), [1, 1, 112473, 111988, 99.6]);
  assert.ok(cislaNaRadku('Konečný zůstatek Fprev k 31. 12. 2024 činil 4.152 tis. Kč.').includes(4152));
});

test('transform je idempotentní a shoduje se s commitnutým souborem (bez generated_at)', () => {
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'fond-bilance-')), 'out.json');
  const r1 = run({ out });
  assert.equal(r1.zmeneno, true);
  const a = fs.readFileSync(out, 'utf8');
  const r2 = run({ out });
  assert.equal(r2.zmeneno, false);
  assert.equal(fs.readFileSync(out, 'utf8'), a, 'druhý běh nemění soubor ani generated_at');
  const bez = (o) => { const c = structuredClone(o); delete c.generated_at; return c; };
  assert.deepEqual(bez(JSON.parse(a)), bez(real()));
  assert.equal(serializuj(real()), fs.readFileSync(DATA, 'utf8'), 'commitnutý soubor je ve formátu serializuj()');
  assert.deepEqual(bez(sestav(nactiTexty())), bez(real()));
});
