// Simulátor pák — testy datového kontraktu (levers.json) + výpočetního enginu.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyElasticity, round, simulateLever, leverActive } from '../src/levers-engine.js';
import { czNum, favorability } from '../src/simulator.js';
import { validateLevers } from '../ingest/validate-levers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const levers = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'levers.json'), 'utf8')).levers;
const indicators = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'indicators.json'), 'utf8'));
const byId = new Map(indicators.indicators.map(i => [i.id, i]));

test('levers.json prochází validátorem (schema + zdroje + existující indikátory)', () => {
  assert.equal(validateLevers(), true);
});

test('engine: elasticita — tabáková daň +25 % ceny na kouření mladistvých', () => {
  // current 14 %, coef −0,4 %/% → +25 % ceny → 14 × (1 − 0,10) = 12,6
  assert.equal(round(applyElasticity(14, -0.4, 25), 2), 12.6);
});

test('engine: elasticita — ošetřovatelský poměr −1 pacient na sestru', () => {
  // current 9,9 %, coef −7 %/pacient → −1 → 9,9 × 0,93 = 9,21
  assert.equal(round(applyElasticity(9.9, -7, 1), 2), 9.21);
});

test('engine: nulový posun páky = žádná změna hodnoty', () => {
  assert.equal(applyElasticity(50, -0.4, 0), 50);
  assert.equal(leverActive({ control: { type: 'slider' } }, 0), false);
  assert.equal(leverActive({ control: { type: 'toggle' } }, 1), true);
});

test('engine: directional efekt vrací polaritu jen když je páka aktivní', () => {
  const cukr = levers.find(l => l.id === 'dan_z_cukru');
  const offRes = simulateLever(cukr, 0, byId);
  const onRes = simulateLever(cukr, 1, byId);
  assert.equal(offRes[0].polarity, null, 'vypnuto → bez polarity');
  assert.equal(onRes[0].polarity, 'down', 'zapnuto → posouvá dolů');
  assert.equal(onRes[0].strength, 'medium');
  // directional nemění číselnou hodnotu
  assert.equal(onRes[0].before, onRes[0].after);
});

test('engine: elasticity efekt počítá before→after z aktuální hodnoty indikátoru', () => {
  const tabak = levers.find(l => l.id === 'tabakova_dan');
  const res = simulateLever(tabak, 25, byId)[0];
  assert.equal(res.kind, 'elasticity');
  assert.ok(res.after < res.before, 'kouření mladistvých klesá');
  assert.equal(res.polarity, 'down');
});

test('UI: czNum formátuje česky (desetinná čárka, prázdné pro null)', () => {
  assert.equal(czNum(12.6), '12,6');
  assert.equal(czNum(592), '592');
  assert.equal(czNum(null), '—');
  assert.equal(czNum(Infinity), '—');
});

test('UI: favorability podle směru indikátoru', () => {
  assert.equal(favorability('down', 'lower_is_better'), 'good');
  assert.equal(favorability('up', 'lower_is_better'), 'bad');
  assert.equal(favorability('up', 'higher_is_better'), 'good');
  assert.equal(favorability('down', 'higher_is_better'), 'bad');
  assert.equal(favorability('down', 'context_dependent'), null);
  assert.equal(favorability(null, 'lower_is_better'), null);
});
