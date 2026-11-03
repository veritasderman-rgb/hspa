// Data o dostupnosti péče po pojišťovnách (balíčky A3.1 + A3.3, PLAN-SROVNAVAC-ANALYTIK.md):
// data/pojistovny-dostupnost.json, jeho validátor, ověření citací proti textům VZ
// a otázky o dostupnosti, které se pojišťovnám posílají v prvním kole (sada dostupnost-prechody).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateDostupnost, KODY_ZP, SLOUPCE } from '../ingest/lib/validate-dostupnost.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'data', f), 'utf8'));
const D = readJson('pojistovny-dostupnost.json');
const clone = () => JSON.parse(JSON.stringify(D));
const norm = (s) => String(s).replace(/\s+/g, ' ').trim();

test('dostupnost: soubor je validní, 7 ZP × 5 sloupců', () => {
  const r = validateDostupnost(D);
  assert.deepEqual(r.errors, []);
  assert.deepEqual(D.pojistovny.map((p) => p.kod), KODY_ZP);
  for (const p of D.pojistovny) for (const c of SLOUPCE) assert.ok(['ano', 'castecne', 'ne'].includes(p[c].stav), `${p.kod}.${c}`);
});

test('dostupnost: rozbité kopie validátor odmítne', () => {
  const fails = (mut, re) => {
    const d = clone();
    mut(d);
    const r = validateDostupnost(d);
    assert.ok(r.errors.some((e) => re.test(e)), `čekal jsem chybu ${re}, dostal ${JSON.stringify(r.errors)}`);
  };
  fails((d) => { d.pojistovny.pop(); }, /musí být 7 pojišťoven/);
  fails((d) => { delete d.pojistovny[0].par16; }, /chybí buňka/);
  fails((d) => { d.pojistovny[0].cekaci_doby.stav = 'asi'; }, /stav/);
  fails((d) => { const c = d.pojistovny[0].sit_nedostatkove; c.url = null; c.soubor = null; c.radek = null; }, /vyžaduje url nebo soubor/);
  fails((d) => { d.pojistovny[0].sit_nedostatkove.citace = null; }, /vyžaduje citaci/);
  fails((d) => { d.pojistovny[0].sit_nedostatkove.citace = 'x'.repeat(201); }, /citace/);
  fails((d) => { d.pojistovny[0].zajisteni_pece.overeno = '3.11.2026'; }, /overeno/);
  fails((d) => { d.pojistovny[0].sit_nedostatkove.url = 'http://vzp.cz'; }, /https/);
  fails((d) => { d.pojistovny[1].kod = '111'; }, /duplicitní/);
  fails((d) => { d.sloupce.pop(); }, /sloupce/);
});

test('dostupnost: stav ne a null nevyžadují zdroj, null je jen varování', () => {
  const d = clone();
  d.pojistovny[0].par16 = { stav: null };
  const r = validateDostupnost(d);
  assert.deepEqual(r.errors, []);
  assert.ok(r.warnings.length >= 1);
});

test('dostupnost: citace ze souborů VZ jsou doslovně na uvedeném řádku (±0)', () => {
  let n = 0;
  for (const p of D.pojistovny) {
    for (const col of SLOUPCE) {
      const c = p[col];
      if (!c.soubor) continue;
      const lines = fs.readFileSync(path.join(ROOT, 'ingest', 'manual', 'pojistovny', 'vz-text', c.soubor), 'utf8').split('\n');
      assert.ok(norm(lines[c.radek - 1] ?? '').includes(norm(c.citace)), `${p.kod}.${col}: citace není na řádku ${c.radek} souboru ${c.soubor}`);
      n++;
    }
  }
  assert.ok(n >= 12, `ověřeno ${n} citací`);
});

test('dostupnost: čísla v poli co sedí s inventářem stížností a bez odhadů (ano má zdroj)', () => {
  const S = readJson('pojistovny-stiznosti.json');
  const zp = (k) => S.pojistovny.find((x) => x.kod === k);
  assert.equal(zp('111').roky.find((r) => r.rok === 2023).podani_dostupnost, 46945);
  assert.match(D.pojistovny[0].zajisteni_pece.co, /46 945/);
  assert.equal(zp('205').roky.find((r) => r.rok === 2025).podani_dostupnost, 6590);
  assert.match(D.pojistovny.find((p) => p.kod === '205').zajisteni_pece.citace, /6 590/);
  assert.equal(zp('211').roky.find((r) => r.rok === 2025).podani_dostupnost, 672);
  assert.equal(zp('213').roky.find((r) => r.rok === 2025).podani_dostupnost, 6049);
  assert.match(D.pojistovny.find((p) => p.kod === '213').zajisteni_pece.co, /4 623/);
});

test('dostupnost: _doc odkazuje na indikátor cekaci_doba_kycel, který v datech existuje', () => {
  assert.match(D._doc, /cekaci_doba_kycel/);
  const ind = readJson('indicators.json').indicators.find((i) => i.id === 'cekaci_doba_kycel');
  assert.ok(ind, 'indikátor cekaci_doba_kycel existuje');
});

test('dostupnost: otázky o § 16, zajištění péče, čekacích dobách a přestupech jsou v sadě pro kolo 1', () => {
  const Q = readJson('pojistovny-otazky.json');
  const sada = Q.sady.find((s) => s.id === 'dostupnost-prechody');
  assert.ok(sada, 'sada dostupnost-prechody existuje');
  assert.equal(sada.kanal, 'dopis+web');
  const ids = sada.otazky.map((q) => q.id);
  for (const id of ['par16', 'zajisteni-pece', 'cekaci-doby', 'prechody']) assert.ok(ids.includes(id), `chybí otázka ${id}`);
  assert.match(sada.otazky.find((q) => q.id === 'par16').text, /§ 16 zákona č\. 48\/1997 Sb\./);
  assert.match(sada.otazky.find((q) => q.id === 'prechody').text, /1\. 1\. a k 1\. 7\./);
});
