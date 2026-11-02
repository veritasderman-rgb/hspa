// Testy věkové a pohlavní standardizace srovnávače pojišťoven (P3.3):
//  - ingest/lib/standardizace.js (vzorec faktoru, placeholder váhy, mapování pásem)
//  - ingest/transform_pojistovny_crp.js (streamový parser CSV OIS 11-47 na syntetické fixture)
//  - ingest/transform_pojistovny_standardizace.js (obálky *_std_kc, idempotentní changelog)
//  - ingest/validate-pojistovny.js (přijme výstup, odhalí chyby)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import {
  primaStandardizace, standardizujHodnotu, faktoryProVsechny, rozvinVahy, podily, STAV_PLACEHOLDER,
} from '../ingest/lib/standardizace.js';
import {
  agregujCsv, sestavVystup, loadAgeGroups, parsePocet, metrikyStruktury, transformPojistovnyCrp, stredPasma,
} from '../ingest/transform_pojistovny_crp.js';
import { aplikujStandardizaci, serializuj } from '../ingest/transform_pojistovny_standardizace.js';
import { validateAll, loadDatasets } from '../ingest/validate-pojistovny.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FIXTURE = path.join(ROOT, 'tests', 'fixtures', 'ois-11-47-mini.csv');
const VAHY_2024 = path.join(ROOT, 'ingest', 'manual', 'pojistovny', 'nakladove-indexy-2024.json');
const clone = (o) => JSON.parse(JSON.stringify(o));

// ---------------------------------------------------------------- vzorec
test('standardizace: shodná struktura → faktor 1', () => {
  const s = { 'a:M': 100, 'a:F': 120, 'b:M': 30, 'b:F': 50 };
  const vahy = { 'a:M': 1, 'a:F': 0.9, 'b:M': 4, 'b:F': 3.5 };
  const r = primaStandardizace({ strukturaZp: s, strukturaCr: { ...s }, vahy });
  assert.ok(Math.abs(r.faktor - 1) < 1e-12);
  // stejné podíly v jiném měřítku dávají totéž
  const r2 = primaStandardizace({ strukturaZp: s, strukturaCr: Object.fromEntries(Object.entries(s).map(([k, v]) => [k, v * 37])), vahy });
  assert.ok(Math.abs(r2.faktor - 1) < 1e-12);
});

test('standardizace: starší kmen s rostoucími váhami → faktor < 1, náklady se sníží', () => {
  const vahy = { 'mlady:M': 1, 'mlady:F': 1, 'stary:M': 4, 'stary:F': 4 };
  const cr = { 'mlady:M': 400, 'mlady:F': 400, 'stary:M': 100, 'stary:F': 100 }; // 20 % starých
  const zp = { 'mlady:M': 350, 'mlady:F': 350, 'stary:M': 150, 'stary:F': 150 }; // 30 % starých
  const r = primaStandardizace({ strukturaZp: zp, strukturaCr: cr, vahy });
  // E_CR = 0,8·1 + 0,2·4 = 1,6; E_ZP = 0,7·1 + 0,3·4 = 1,9
  assert.ok(Math.abs(r.ocekavany_index_cr - 1.6) < 1e-12);
  assert.ok(Math.abs(r.ocekavany_index_zp - 1.9) < 1e-12);
  assert.ok(Math.abs(r.faktor - 1.6 / 1.9) < 1e-12);
  assert.ok(r.faktor < 1);
  assert.equal(standardizujHodnotu(47998, r.faktor), Math.round(47998 * 1.6 / 1.9));
  assert.ok(standardizujHodnotu(47998, r.faktor) < 47998);
  // mladší kmen → faktor > 1
  const r3 = primaStandardizace({ strukturaZp: { 'mlady:M': 450, 'mlady:F': 450, 'stary:M': 50, 'stary:F': 50 }, strukturaCr: cr, vahy });
  assert.ok(r3.faktor > 1);
});

test('standardizace: placeholder váhy (vše 1) → faktor přesně 1 pro libovolnou strukturu', () => {
  const vahy = { 'a:M': 1, 'a:F': 1, 'b:M': 1, 'b:F': 1 };
  const r = primaStandardizace({ strukturaZp: { 'a:M': 1, 'a:F': 2, 'b:M': 90, 'b:F': 7 }, strukturaCr: { 'a:M': 50, 'a:F': 50, 'b:M': 1, 'b:F': 1 }, vahy });
  assert.equal(r.faktor, 1);
  assert.equal(standardizujHodnotu(338, r.faktor), 338);
  assert.equal(standardizujHodnotu(null, 1), null);
  assert.throws(() => standardizujHodnotu(1, 0));
});

test('standardizace: rozvinVahy mapuje 19 pásem CSV na 18 skupin přerozdělení', () => {
  const def = JSON.parse(fs.readFileSync(VAHY_2024, 'utf8'));
  assert.equal(def.stav, STAV_PLACEHOLDER);
  assert.equal(def.skupiny_prerozdeleni.length, 18);
  assert.equal(Object.keys(def.vahy).length, 36);
  const pasma = loadAgeGroups().map((g) => g.key);
  assert.equal(pasma.length, 19);
  assert.deepEqual(Object.keys(def.mapovani_pasem).sort(), [...pasma].sort());
  const w = rozvinVahy(def, pasma, ['M', 'F']);
  assert.equal(Object.keys(w).length, 38);
  // 0 a 1–4 sdílejí váhu skupiny 0–4
  const testDef = { vahy: { ...def.vahy, '0-4:F': 3.8 }, mapovani_pasem: def.mapovani_pasem };
  const w2 = rozvinVahy(testDef, pasma, ['M', 'F']);
  assert.equal(w2['0:F'], 3.8);
  assert.equal(w2['1-4:F'], 3.8);
  assert.throws(() => rozvinVahy({ vahy: {} }, ['0'], ['M']), /chybí kladná váha/);
  assert.throws(() => podily({ x: 0 }), /prázdná struktura/);
});

// ---------------------------------------------------------------- CSV parser
test('transform_pojistovny_crp: streamový parser na syntetickém CSV → správné součty', async () => {
  const ag = loadAgeGroups();
  const a = await agregujCsv(FIXTURE, ag);
  assert.deepEqual(a.roky, [2024, 2025]);
  assert.equal(a.rows, 20 - 1); // 20 datových řádků, 1 s neznámou ZP 999
  assert.equal(a.skipped, 1);
  assert.equal(parsePocet('4 288'), 4288);
  assert.equal(parsePocet('4 288'), 4288);

  const out = sestavVystup(a, ag, { generatedAt: '2026-11-02T00:00:00Z', soubor: 'ois-11-47-mini.csv' });
  assert.equal(out.rok, 2025, 'výchozí = nejnovější rok');
  assert.equal(out.pasma.length, 19);
  assert.deepEqual(out.pohlavi, ['M', 'F']);
  const vzp = out.pojistovny.find((z) => z.kod === '111');
  // součet přes okresy; 2024 se nezapočítá; Z → F
  assert.equal(vzp.struktura['0:M'], 1100);
  assert.equal(vzp.struktura['0:F'], 900);
  assert.equal(vzp.struktura['65-69:F'], 2000);
  assert.equal(vzp.struktura['85+:M'], 250);
  assert.equal(vzp.celkem, 7250);
  assert.equal(vzp.podil_65plus_pct, Math.round(10000 * 3250 / 7250) / 100);
  const celkemZp = { 111: 7250, 201: 500, 205: 1250, 207: 300, 209: 120, 211: 1000, 213: 150 };
  for (const z of out.pojistovny) assert.equal(z.celkem, celkemZp[z.kod], `celkem ${z.kod}`);
  assert.equal(out.cr.celkem, 10570);
  assert.equal(out.cr.struktura['0:M'], 1100);
  assert.equal(out.cr.struktura['65-69:M'], 250);
  // průměrný věk ze středů: 40–44 → 42,5; 15–19 → 17,5; 85+ → 90
  assert.equal(out.pojistovny.find((z) => z.kod === '207').prumerny_vek_odhad, 42.5);
  assert.equal(out.pojistovny.find((z) => z.kod === '213').prumerny_vek_odhad, 17.5);
  assert.equal(stredPasma(ag[ag.length - 1], true), 90);
  assert.equal(stredPasma(ag[0], false), 0.5);
  assert.equal(metrikyStruktury({ '85+:F': 10 }, ag).prumerny_vek_odhad, 90);

  // explicitní rok
  const o24 = (() => { try { return sestavVystup(a, ag, { rok: 2024 }); } catch (e) { return e; } })();
  assert.ok(o24 instanceof Error, '2024 ve fixture nemá všech 7 ZP → chyba');
  assert.throws(() => sestavVystup(a, ag, { rok: 2019 }), /neobsahuje rok 2019/);

  // validátor přijme výstup (jen chyby týkající se pojistovny-vek.json)
  const { errors } = validateAll({ vek: out });
  assert.deepEqual(errors.filter((e) => e.startsWith('pojistovny-vek.json')), []);
});

test('transform_pojistovny_crp: chybějící CSV → přeskočí bez zápisu (exit 0)', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hspa-crp-'));
  const outPath = path.join(tmp, 'pojistovny-vek.json');
  const logs = [];
  const r = await transformPojistovnyCrp({ csvPath: path.join(tmp, 'neni.csv'), outPath, log: (m) => logs.push(m) });
  assert.equal(r.skipped, true);
  assert.equal(fs.existsSync(outPath), false);
  assert.match(logs[0], /přeskakuji/);
  // s fixture zapíše a podruhé nic nemění
  const r1 = await transformPojistovnyCrp({ csvPath: FIXTURE, outPath, log: () => {} });
  assert.equal(r1.changed, true);
  const before = fs.readFileSync(outPath, 'utf8');
  const r2 = await transformPojistovnyCrp({ csvPath: FIXTURE, outPath, log: () => {} });
  assert.equal(r2.changed, false);
  assert.equal(fs.readFileSync(outPath, 'utf8'), before);
  fs.rmSync(tmp, { recursive: true, force: true });
});

// ---------------------------------------------------------------- transform standardizace + validátor
test('transform_pojistovny_standardizace: placeholder → std = nestandardizovaná, changelog jednou', () => {
  const sets = loadDatasets();
  const P = sets.pojistovny;
  const vek = sets.vek;
  if (!vek) return; // data/pojistovny-vek.json není (CI bez CSV) — nic k ověření
  const def = JSON.parse(fs.readFileSync(VAHY_2024, 'utf8'));
  // vyčistit případné starší výsledky
  const base = clone(P);
  for (const z of base.pojistovny) { delete z.hospodareni.naklady_na_pojistence_std_kc; delete z.hospodareni.fond_prevence_na_pojistence_std_kc; }
  base.changelog = (base.changelog ?? []).filter((c) => !/P3\.3/.test(c.zmena));

  const r1 = aplikujStandardizaci(base, vek, def, { dnes: '2026-11-02' });
  for (const z of r1.data.pojistovny) {
    const h = z.hospodareni;
    assert.equal(h.naklady_na_pojistence_std_kc.hodnota, h.naklady_na_pojistence_kc.hodnota);
    assert.equal(h.fond_prevence_na_pojistence_std_kc.hodnota, h.fond_prevence_na_pojistence_kc.hodnota);
    assert.equal(h.naklady_na_pojistence_std_kc.faktor, 1);
    assert.equal(h.naklady_na_pojistence_std_kc.stav, 'placeholder-bez-vah');
    assert.match(h.naklady_na_pojistence_std_kc.poznamka, /faktor 1,000.*nestandardizovan/);
    assert.match(h.naklady_na_pojistence_std_kc.zdroj, /^výpočet: /);
    assert.match(h.fond_prevence_na_pojistence_std_kc.poznamka, /aproximace/);
  }
  const n1 = r1.data.changelog.length;
  assert.equal(n1, base.changelog.length + 1);
  const r2 = aplikujStandardizaci(r1.data, vek, def, { dnes: '2026-11-02' });
  assert.equal(r2.data.changelog.length, n1, 'druhý běh nepřidá changelog');
  assert.equal(r2.zmeneno, false);
  assert.equal(serializuj(r2.data), serializuj(r1.data));

  const { errors } = validateAll({ ...sets, pojistovny: r1.data });
  assert.deepEqual(errors, []);
});

test('transform_pojistovny_standardizace: doložené rostoucí váhy → VZP (nejstarší kmen) faktor < 1', () => {
  const sets = loadDatasets();
  if (!sets.vek) return;
  const def = JSON.parse(fs.readFileSync(VAHY_2024, 'utf8'));
  // SYNTETICKÉ váhy jen pro test monotonie (rostou s věkem) — nejde o nákladové indexy
  const testDef = { ...clone(def), stav: 'dolozeno', zdroj: { nazev: 'test' } };
  def.skupiny_prerozdeleni.forEach((s, i) => { testDef.vahy[`${s}:M`] = 1 + i * 0.2; testDef.vahy[`${s}:F`] = 1 + i * 0.2; });
  const f = faktoryProVsechny(sets.vek, testDef);
  assert.ok(f['111'].faktor < 1, `VZP ${f['111'].faktor}`);
  assert.ok(f['205'].faktor > 1, `ČPZP ${f['205'].faktor}`);
  const r = aplikujStandardizaci(sets.pojistovny, sets.vek, testDef, { dnes: '2026-11-02' });
  const vzp = r.data.pojistovny.find((z) => z.kod === '111').hospodareni;
  assert.ok(vzp.naklady_na_pojistence_std_kc.hodnota < vzp.naklady_na_pojistence_kc.hodnota);
  assert.deepEqual(validateAll({ ...sets, pojistovny: r.data }).errors, []);
});

test('validate-pojistovny: odhalí vadný faktor, stav a nesoulad struktury', () => {
  const sets = loadDatasets();
  if (!sets.vek) return;
  const bad = clone(sets);
  const h = bad.pojistovny.pojistovny[0].hospodareni;
  if (h.naklady_na_pojistence_std_kc) {
    h.naklady_na_pojistence_std_kc.faktor = 3;
    h.naklady_na_pojistence_std_kc.stav = 'odhad';
  }
  bad.vek.pojistovny[1].struktura['0:M'] += 100000;
  bad.vek.pojistovny.pop();
  const { errors } = validateAll(bad);
  if (h.naklady_na_pojistence_std_kc) {
    assert.ok(errors.some((e) => /faktor: musí být číslo 0,5–2/.test(e)));
    assert.ok(errors.some((e) => /\.stav: 'odhad'/.test(e)));
  }
  assert.ok(errors.some((e) => /součet struktury .* ≠ celkem/.test(e)));
  assert.ok(errors.some((e) => /pojistovny očekáváno 7, nalezeno 6/.test(e)));
  assert.ok(errors.some((e) => /ČR celkem .* ≠ součet ZP/.test(e)));
});

test('data/pojistovny-vek.json: malý agregát a soulad s crp blokem (±0,2 p. b.)', () => {
  const p = path.join(ROOT, 'data', 'pojistovny-vek.json');
  if (!fs.existsSync(p)) return;
  assert.ok(fs.statSync(p).size < 50 * 1024, 'pojistovny-vek.json má být < 50 kB');
  const vek = JSON.parse(fs.readFileSync(p, 'utf8'));
  const P = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'pojistovny.json'), 'utf8'));
  assert.equal(vek.pojistovny.length, 7);
  for (const z of vek.pojistovny) {
    const ref = P.pojistovny.find((x) => x.kod === z.kod).crp;
    assert.ok(Math.abs(ref.podil_65plus_pct - z.podil_65plus_pct) <= 0.2, z.kod);
    assert.equal(z.celkem, ref.pojistenci, `kmen ${z.kod}`);
  }
  assert.equal(vek.cr.celkem, P.system_crp.pojistenci_2025);
});
