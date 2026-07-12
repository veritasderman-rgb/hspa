// Osobní zdravotní kompas — testy datového kontraktu (personal-checks.json)
// + čistého enginu (filtrace podle profilu, krajský kontext).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkApplies, applicableChecks, regionStat } from '../src/kompas-engine.js';
import { validatePersonalChecks } from '../ingest/validate-personal-checks.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const checks = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'personal-checks.json'), 'utf8')).checks;
const regions = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'regions.json'), 'utf8'));
const byId = (id) => checks.find(c => c.id === id);

test('personal-checks.json prochází validátorem (schema + zdroje + odkazy)', () => {
  assert.equal(validatePersonalChecks(), true);
});

test('engine: checkApplies — věkový rozsah', () => {
  const mamo = byId('screening_mamograf'); // female 45+
  assert.equal(checkApplies(mamo, { age: 40, sex: 'female' }), false, 'pod 45 se netýká');
  assert.equal(checkApplies(mamo, { age: 50, sex: 'female' }), true, 'nad 45 se týká');
});

test('engine: checkApplies — pohlaví', () => {
  const gyn = byId('prohlidka_gynekologicka'); // female
  assert.equal(checkApplies(gyn, { age: 30, sex: 'male' }), false);
  assert.equal(checkApplies(gyn, { age: 30, sex: 'female' }), true);
});

test('engine: checkApplies — horní hranice a risk gate (kouření)', () => {
  const plice = byId('screening_plice'); // all, 55–74, requires smoking
  assert.equal(checkApplies(plice, { age: 60, smoking: false }), false, 'nekuřák → ne');
  assert.equal(checkApplies(plice, { age: 60, smoking: true }), true, 'kuřák v rozsahu → ano');
  assert.equal(checkApplies(plice, { age: 80, smoking: true }), false, 'nad 74 → ne');
});

test('engine: applicableChecks — 30letá žena vs. 68letý muž-kuřák', () => {
  const zena30 = applicableChecks(checks, { age: 30, sex: 'female', smoking: false }).map(c => c.id);
  assert.ok(zena30.includes('prohlidka_gynekologicka'));
  assert.ok(zena30.includes('screening_cervix'));
  assert.ok(!zena30.includes('screening_mamograf'), 've 30 ještě ne mamograf');
  assert.ok(!zena30.includes('ockovani_chripka'), 've 30 ne hrazená chřipka 65+');

  const muz68 = applicableChecks(checks, { age: 68, sex: 'male', smoking: true }).map(c => c.id);
  assert.ok(muz68.includes('ockovani_chripka'), '68 → chřipka');
  assert.ok(muz68.includes('screening_kolorektum'), '68 → kolorektum');
  assert.ok(muz68.includes('screening_plice'), '68 kuřák → plíce');
  assert.ok(!muz68.includes('prohlidka_gynekologicka'), 'muž → ne gynekologie');

  // kategorie: první je prohlídka, poslední očkování
  const sorted = applicableChecks(checks, { age: 68, sex: 'male', smoking: true });
  assert.equal(sorted[0].category, 'prohlidka');
  assert.equal(sorted[sorted.length - 1].category, 'ockovani');
});

test('engine: regionStat — pořadí a strana průměru', () => {
  const ds = regions.datasets.find(d => d.id === 'screening_mamografie_kraje');
  const praha = regionStat(ds, 'CZ010'); // 65,2 %, higher_is_better, avg 60,5
  assert.ok(praha, 'Praha má statistiku');
  assert.equal(praha.better, true, 'Praha nad průměrem = příznivé');
  assert.ok(praha.rank >= 1 && praha.rank <= praha.of);
  assert.equal(praha.of, ds.regions.filter(r => Number.isFinite(r.value)).length);

  const usti = regionStat(ds, 'CZ042'); // 51,4 % pod průměrem
  assert.equal(usti.better, false, 'Ústecký pod průměrem = nepříznivé');

  assert.equal(regionStat(ds, 'NONEXISTENT'), null);
  assert.equal(regionStat(null, 'CZ010'), null);
});
