// Dataset smluvních programů pro poskytovatele: validní, 7 ZP, rozbitá kopie selže.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateSmluvniProgramy, KODY } from '../ingest/lib/validate-smluvni-programy.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.join(__dirname, '..', 'data', 'pojistovny-smluvni-programy.json');
const load = () => JSON.parse(fs.readFileSync(FILE, 'utf8'));

test('smluvní programy: soubor je validní JSON a má 7 pojišťoven v pořadí kódů', () => {
  const S = load();
  assert.deepEqual(S.pojistovny.map((z) => z.kod), KODY);
  assert.equal(S.pojistovny.length, 7);
});

test('smluvní programy: validátor nehlásí chyby', () => {
  const { errors } = validateSmluvniProgramy(load());
  assert.deepEqual(errors, []);
});

test('smluvní programy: každý program má https url, citaci a datum ověření', () => {
  for (const z of load().pojistovny) {
    for (const p of z.programy) {
      assert.match(p.url, /^https:\/\//, p.id);
      assert.ok(p.citace && p.citace.length <= 200, p.id);
      assert.match(p.overeno, /^\d{4}-\d{2}-\d{2}$/, p.id);
    }
  }
});

test('smluvní programy: rozbitá kopie (program bez url) selže', () => {
  const S = load();
  delete S.pojistovny[0].programy[0].url;
  const { errors } = validateSmluvniProgramy(S);
  assert.ok(errors.some((e) => e.includes('url')));
});

test('smluvní programy: neplatný segment, duplicitní id a ZP bez programů bez nenalezeno selžou', () => {
  const S = load();
  S.pojistovny[0].programy[0].segment = 'xx';
  S.pojistovny[0].programy[1].id = S.pojistovny[0].programy[0].id;
  S.pojistovny[1].programy = [];
  S.pojistovny[1].nenalezeno = null;
  const { errors } = validateSmluvniProgramy(S);
  assert.ok(errors.some((e) => e.includes('segment')));
  assert.ok(errors.some((e) => e.includes('duplicitní')));
  assert.ok(errors.some((e) => e.includes('nenalezeno')));
});

test('smluvní programy: ZP bez programů s doloženým nenalezeno projde', () => {
  const S = load();
  S.pojistovny[1].programy = [];
  S.pojistovny[1].nenalezeno = { popis: 'hledáno na webu', url: ['https://www.vozp.cz/'], overeno: '2026-11-03' };
  assert.deepEqual(validateSmluvniProgramy(S).errors, []);
});
