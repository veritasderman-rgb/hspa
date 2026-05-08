// Testy transformace ÚZIS Centrálního registru pojištěnců (D5) na 3 datové
// kostky (kraj, ZP, okres) — ingest/transform_pojistenci_d5.js.
//
// Testují:
//  - správné parsování CSV (16 let, 7 ZP, 77 okresů, 19 věkových skupin)
//  - LAU → NUTS-3 mapping (včetně datové chyby CZ063 → CZ064 pro Brno-venkov)
//  - výpočet metrik (% 65+, % 80+, median age, dependency)
//  - konzistenci agregace: kraj total = sum(ZP counts) = sum(okresy v kraji total)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STARTER_ROOT = path.resolve(__dirname, '..');

const KRAJ_PATH = path.join(STARTER_ROOT, 'data', 'pojistenci-d5-kraj.json');
const ZP_PATH = path.join(STARTER_ROOT, 'data', 'pojistenci-d5-zp.json');
const OKRES_PATH = path.join(STARTER_ROOT, 'data', 'pojistenci-d5-okres.json');
const MAPPING_PATH = path.join(STARTER_ROOT, 'ingest', 'mapping', 'lau_to_nuts3.json');

let kraj, zp, okres, mapping;

test('pojistenci D5: data soubory jsou k dispozici a načítají se', async () => {
  kraj = JSON.parse(await fs.readFile(KRAJ_PATH, 'utf8'));
  zp = JSON.parse(await fs.readFile(ZP_PATH, 'utf8'));
  okres = JSON.parse(await fs.readFile(OKRES_PATH, 'utf8'));
  mapping = JSON.parse(await fs.readFile(MAPPING_PATH, 'utf8'));
  assert.equal(kraj.version, '1.0');
  assert.equal(zp.version, '1.0');
  assert.equal(okres.version, '1.0');
});

test('pojistenci D5: kraj.json — 16 let (2010–2025) a 14 krajů', () => {
  assert.equal(kraj.years.length, 16);
  assert.equal(kraj.years[0], 2010);
  assert.equal(kraj.years[15], 2025);
  assert.equal(kraj.krajs.length, 14);
});

test('pojistenci D5: kraj.json — 19 věkových skupin a 2 pohlaví', () => {
  assert.equal(kraj.age_groups.length, 19);
  assert.deepEqual(kraj.sexes, ['M', 'Z']);
  assert.equal(kraj.age_groups[0].key, '0');
  assert.equal(kraj.age_groups[18].key, '85+');
});

test('pojistenci D5: kraj.json — všechny krajské bloky mají 16 let', () => {
  for (const k of kraj.krajs) {
    const block = kraj.data[k.code];
    assert.ok(block, `chybí blok pro ${k.code}`);
    for (const y of kraj.years) {
      assert.ok(block[y], `chybí ${k.code} rok ${y}`);
      assert.equal(typeof block[y].total, 'number');
      assert.ok(block[y].total > 0);
    }
  }
});

test('pojistenci D5: kraj.json — metriky jsou v rozumných mezích', () => {
  for (const k of kraj.krajs) {
    for (const y of kraj.years) {
      const m = kraj.data[k.code][y];
      assert.ok(m.pct_65plus >= 10 && m.pct_65plus <= 30, `${k.code}/${y} pct_65plus mimo: ${m.pct_65plus}`);
      assert.ok(m.pct_80plus >= 1 && m.pct_80plus <= 10, `${k.code}/${y} pct_80plus mimo: ${m.pct_80plus}`);
      assert.ok(m.median_age >= 35 && m.median_age <= 50, `${k.code}/${y} median_age mimo: ${m.median_age}`);
      assert.ok(m.dependency_old > 0 && m.dependency_old < 60, `${k.code}/${y} dep_old mimo: ${m.dependency_old}`);
    }
  }
});

test('pojistenci D5: kraj.json — populace ČR roste mezi 2010 a 2025', () => {
  let total2010 = 0, total2025 = 0;
  for (const k of kraj.krajs) {
    total2010 += kraj.data[k.code]['2010'].total;
    total2025 += kraj.data[k.code]['2025'].total;
  }
  assert.ok(total2010 > 10_000_000, `2010 populace pojištěnců = ${total2010}`);
  assert.ok(total2025 > 10_000_000, `2025 populace pojištěnců = ${total2025}`);
  assert.ok(total2025 >= total2010, 'celková populace 2025 by neměla klesnout pod 2010');
});

test('pojistenci D5: kraj.json — Karlovarský kraj má největší nárůst pct_65plus', () => {
  const deltas = kraj.krajs.map(k => ({
    code: k.code,
    delta: kraj.data[k.code]['2025'].pct_65plus - kraj.data[k.code]['2010'].pct_65plus,
  }));
  deltas.sort((a, b) => b.delta - a.delta);
  assert.equal(deltas[0].code, 'CZ041', `očekáván Karlovarský (CZ041), nalezen ${deltas[0].code}`);
  assert.ok(deltas[0].delta > 7, `KVK delta = ${deltas[0].delta}`);
});

test('pojistenci D5: zp.json — všechny tržní podíly sčítají na ~100', () => {
  for (const k of zp.krajs) {
    for (const y of zp.years) {
      const shares = zp.data[k.code][y].shares;
      const sum = Object.values(shares).reduce((a, b) => a + (b || 0), 0);
      assert.ok(Math.abs(sum - 100) < 1, `${k.code}/${y} sum shares = ${sum}`);
    }
  }
});

test('pojistenci D5: zp.json — všechny segmenty mají 7 pojišťoven', () => {
  assert.equal(zp.insurers.length, 7);
  const codes = zp.insurers.map(i => i.code).sort();
  assert.deepEqual(codes, ['111', '201', '205', '207', '209', '211', '213']);
});

test('pojistenci D5: zp.json — VZP klesá v Moravskoslezském kraji 2010 → 2025', () => {
  const a = zp.data['CZ080']['2010'].shares['111'];
  const b = zp.data['CZ080']['2025'].shares['111'];
  assert.ok(a > b, `VZP MSK 2010=${a} → 2025=${b}`);
  assert.ok(a - b > 5, `pokles VZP v MSK má být > 5 p.b., naměřeno ${(a - b).toFixed(1)}`);
});

test('pojistenci D5: okres.json — 77 okresů × 16 let = 1232 záznamů', () => {
  assert.equal(okres.okresy.length, 77);
  let count = 0;
  for (const o of okres.okresy) {
    for (const y of okres.years) {
      if (okres.data[o.code] && okres.data[o.code][y]) count++;
    }
  }
  assert.equal(count, 77 * 16, `očekáváno ${77 * 16} záznamů, naměřeno ${count}`);
});

test('pojistenci D5: okres.json — Brno-venkov je správně mapován pod CZ063 → CZ064 (Jihomoravský)', () => {
  // V CSV má Brno-venkov chybný kód CZ063 (5 znaků); mapping ho přesměruje na CZ064.
  const bv = okres.okresy.find(o => o.name === 'Brno-venkov');
  assert.ok(bv, 'Brno-venkov chybí v okresech');
  assert.equal(bv.kraj, 'CZ064', 'Brno-venkov musí patřit do CZ064 (Jihomoravský)');
});

test('pojistenci D5: konzistence — součet okresů v kraji = total kraje (kontrola pro PHA a JHM)', () => {
  // Praha má jen 1 okres CZ0100.
  for (const y of kraj.years) {
    const krajTotal = kraj.data['CZ010'][y].total;
    const okresTotal = okres.data['CZ0100'][y].total;
    assert.equal(krajTotal, okresTotal, `Praha ${y}: kraj total ${krajTotal} vs okres total ${okresTotal}`);
  }
  // Jihomoravský: součet 7 okresů (Blansko, Brno-město, Brno-venkov, Břeclav, Hodonín, Vyškov, Znojmo).
  const jhmOkresy = okres.okresy.filter(o => o.kraj === 'CZ064').map(o => o.code);
  assert.equal(jhmOkresy.length, 7);
  for (const y of [2010, 2018, 2025]) {
    const krajTotal = kraj.data['CZ064'][y].total;
    const sumOkresy = jhmOkresy.reduce((s, c) => s + okres.data[c][y].total, 0);
    assert.equal(krajTotal, sumOkresy, `JHM ${y}: kraj ${krajTotal} vs sum ${sumOkresy}`);
  }
});

test('pojistenci D5: konzistence — sum(ZP counts) v kraji = total kraje (kontrola pro PHA)', () => {
  for (const y of kraj.years) {
    const krajTotal = kraj.data['CZ010'][y].total;
    const sumZp = Object.values(zp.data['CZ010'][y].counts).reduce((a, b) => a + b, 0);
    assert.equal(krajTotal, sumZp, `PHA ${y}: kraj ${krajTotal} vs sum ZP ${sumZp}`);
  }
});

test('pojistenci D5: mapping — všechny okresy v mapping mají platný kraj', () => {
  const krajCodes = new Set(Object.keys(mapping.krajs));
  for (const [code, info] of Object.entries(mapping.okresy)) {
    assert.ok(krajCodes.has(info.kraj), `okres ${code} má neznámý kraj ${info.kraj}`);
  }
});
