// Dataset instituce zdravotních pojišťoven (A2.1): data/pojistovny-instituce.json + ingest/lib/validate-instituce.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateInstituce, KODY } from '../ingest/lib/validate-instituce.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILE = path.join(ROOT, 'data', 'pojistovny-instituce.json');
const I = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const clone = () => JSON.parse(JSON.stringify(I));

test('instituce: dataset prochází validátorem bez chyb', () => {
  const { errors } = validateInstituce(I);
  assert.deepEqual(errors, []);
});

test('instituce: 7 pojišťoven se správnými kódy a stav_k je datum', () => {
  assert.equal(I.pojistovny.length, 7);
  assert.deepEqual(I.pojistovny.map((p) => p.kod).sort(), [...KODY].sort());
  assert.match(I.stav_k, /^\d{4}-\d{2}-\d{2}$/);
});

test('instituce: VZP podle zákona 551/1991, zaměstnanecké podle 280/1992', () => {
  for (const p of I.pojistovny) {
    assert.equal(p.zakon.cislo, p.kod === '111' ? '551/1991 Sb.' : '280/1992 Sb.', p.kod);
  }
});

test('instituce: počty členů rad odpovídají zákonu (VZP 30 + 13, zaměstnanecké 15 + 9) a součty obsazení sedí', () => {
  for (const p of I.pojistovny) {
    const vzp = p.kod === '111';
    const { spravni_rada: sr, dozorci_rada: dr } = p.organy;
    assert.equal(sr.pocet, vzp ? 30 : 15, `${p.kod} SR`);
    assert.equal(dr.pocet, vzp ? 13 : 9, `${p.kod} DR`);
    for (const r of [sr, dr]) assert.equal(r.obsazeni.reduce((s, o) => s + o.pocet, 0), r.pocet, p.kod);
  }
  const vzp = I.pojistovny.find((p) => p.kod === '111');
  assert.ok(vzp.organy.spravni_rada.obsazeni.some((o) => o.kdo === 'Poslanecká sněmovna' && o.pocet === 20));
});

test('instituce: žádná pole s osobními údaji (jmeno, prijmeni, osoby) nikde v souboru', () => {
  const klice = new Set();
  (function walk(o) {
    if (Array.isArray(o)) o.forEach(walk);
    else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) { klice.add(k.toLowerCase()); walk(v); }
  })(I);
  for (const zakazany of ['jmeno', 'prijmeni', 'osoby', 'osoba']) assert.ok(!klice.has(zakazany), `klíč ${zakazany} nesmí být v datasetu`);
  const text = fs.readFileSync(FILE, 'utf8');
  assert.doesNotMatch(text, /"(jmeno|prijmeni|osoby)"\s*:/);
});

test('instituce: chybějící hodnoty jsou null a mají záznam v chybi[]', () => {
  assert.ok(Array.isArray(I.chybi) && I.chybi.length > 0);
  const ceoNull = I.pojistovny.filter((p) => p.organy.reditel.ve_funkci_od === null).map((p) => p.kod);
  if (ceoNull.length) assert.ok(I.chybi.some((c) => c.pole === 'organy.reditel.ve_funkci_od'), 'null ve_funkci_od musí být v chybi[]');
});

test('instituce: validátor odmítne kopii s rozbitým součtem obsazení', () => {
  const X = clone();
  X.pojistovny[1].organy.spravni_rada.obsazeni[0].pocet += 1;
  const { errors } = validateInstituce(X);
  assert.ok(errors.some((e) => /součet obsazeni/.test(e)), errors.join('\n'));
});

test('instituce: validátor odmítne špatný zákon, špatný původ, chybějící zdroj a klíč s osobními údaji', () => {
  let X = clone();
  X.pojistovny[0].zakon.cislo = '280/1992 Sb.';
  assert.ok(validateInstituce(X).errors.some((e) => /VZP se řídí/.test(e)));
  X = clone();
  X.pojistovny[2].vznik.puvod = 'soukroma';
  assert.ok(validateInstituce(X).errors.some((e) => /puvod/.test(e)));
  X = clone();
  delete X.pojistovny[3].organy.dozorci_rada.zdroj;
  assert.ok(validateInstituce(X).errors.some((e) => /zdroj chybí/.test(e)));
  X = clone();
  X.pojistovny[4].organy.reditel.jmeno = 'x';
  assert.ok(validateInstituce(X).errors.some((e) => /osobními údaji/.test(e)));
  X = clone();
  X.stav_k = '3. 11. 2026';
  assert.ok(validateInstituce(X).errors.some((e) => /stav_k/.test(e)));
  X = clone();
  X.pojistovny.pop();
  assert.ok(validateInstituce(X).errors.some((e) => /7 záznamů/.test(e)));
});

test('instituce: limit provozu je u všech sedmi vyplněn a v rozumném rozmezí 2,9–3,1 %', () => {
  for (const p of I.pojistovny) {
    assert.equal(typeof p.provozni_limit_pct.hodnota, 'number', p.kod);
    assert.ok(p.provozni_limit_pct.hodnota >= 2.9 && p.provozni_limit_pct.hodnota <= 3.1, p.kod);
  }
});

test('instituce: vznik.datum_typ je z enumu a validátor špatný typ odmítne', () => {
  for (const p of I.pojistovny) assert.ok([null, 'zapis_or', 'zrizovaci_listina', 'rozhodnuti_mpsv', 'zakon'].includes(p.vznik.datum_typ), p.kod);
  const X = clone();
  X.pojistovny[2].vznik.datum_typ = 'jiny';
  assert.ok(validateInstituce(X).errors.some((e) => /datum_typ/.test(e)));
});
