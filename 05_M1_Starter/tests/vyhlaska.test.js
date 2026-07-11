// Úhradová vyhláška — testy datového kontraktu (vyhlaska-hra.json) + enginu.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  totalCost, avgGrowthPct, newShares, moodFor, effectsFor, verdict,
} from '../src/vyhlaska-engine.js';
import { validateVyhlaskaHra } from '../ingest/validate-vyhlaska-hra.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const doc = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'vyhlaska-hra.json'), 'utf8'));
const indicators = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'indicators.json'), 'utf8'));
const byId = new Map(indicators.indicators.map(i => [i.id, i]));
const SEG = doc.segments;
const flat = (pct) => Object.fromEntries(SEG.map(s => [s.id, pct]));

test('vyhlaska-hra.json prochází validátorem (zdroje, eskalace, efekty, presety)', () => {
  assert.equal(validateVyhlaskaHra(), true);
});

test('engine: totalCost — plošných 8,5 % stojí ~39 mld (459 × 0,085)', () => {
  const cost = totalCost(SEG, flat(8.5));
  assert.ok(Math.abs(cost - 39.0) < 0.1, `cost=${cost}`);
  assert.ok(cost <= doc.envelope.amount_mld, 'status quo se vejde do obálky');
});

test('engine: plné požadavky všech segmentů obálku přesahují (napětí hry)', () => {
  const demands = Object.fromEntries(SEG.map(s => [s.id, s.demand_pct]));
  assert.ok(totalCost(SEG, demands) > doc.envelope.amount_mld, 'nelze uspokojit všechny');
});

test('engine: newShares — plošný růst strukturu nemění, selektivní ano', () => {
  const same = newShares(SEG, flat(8));
  assert.ok(Math.abs(same.luzkova.share_pct - 55.9) < 0.05, 'plošně → podíl lůžkové stejný');
  const sum = Object.values(same).reduce((a, x) => a + x.share_pct, 0);
  assert.ok(Math.abs(sum - 100) < 0.001, 'podíly se sčítají na 100');

  const reform = newShares(SEG, { ...flat(8), luzkova: 4, ambulantni: 14 });
  assert.ok(reform.luzkova.share_pct < 55.9, 'přibrzděná lůžková → podíl klesá');
  assert.ok(reform.ambulantni.share_pct > 28.5, 'posílené ambulance → podíl roste');
});

test('engine: moodFor — eskalační žebřík podle gapu vs. požadavek', () => {
  const luz = SEG.find(s => s.id === 'luzkova'); // demand 10
  assert.equal(moodFor(luz, 10), 'agree');
  assert.equal(moodFor(luz, 8.5), 'grudging');
  assert.equal(moodFor(luz, 6.5), 'no_deal');
  assert.equal(moodFor(luz, 3), 'protest');
});

test('engine: effectsFor — directional jen při nadprůměrném růstu, definitional vždy', () => {
  const flat8 = effectsFor(SEG, flat(8), byId);
  const acscFlat = flat8.find(e => e.indicator === 'hospitalizace_acsc');
  assert.equal(acscFlat.active, false, 'plošný růst → žádné relativní posílení');
  const defFlat = flat8.find(e => e.kind === 'definitional');
  assert.equal(defFlat.active, true);
  assert.ok(Math.abs(defFlat.after - 55.9) < 0.05, 'plošně → podíl lůžkové beze změny');

  const reform = effectsFor(SEG, { ...flat(6), ambulantni: 13, stomatologie: 14 }, byId);
  const acsc = reform.find(e => e.indicator === 'hospitalizace_acsc');
  assert.equal(acsc.active, true);
  assert.equal(acsc.polarity, 'down');
  const zuby = reform.find(e => e.indicator === 'nesplnena_potreba_zubni_pece');
  assert.equal(zuby.active, true, 'stomatologie nadprůměrně → efekt aktivní');
});

test('engine: verdict — deficit, dohody a posun podílu lůžkové', () => {
  const v = verdict(SEG, flat(10), doc.envelope.amount_mld); // 45,9 mld > 40
  assert.equal(v.deficit, true, '10 % všem = deficit');
  const v2 = verdict(SEG, flat(8.5), doc.envelope.amount_mld);
  assert.equal(v2.deficit, false);
  assert.ok(v2.deals >= 2, 'plošných 8,5 % uspokojí aspoň levné segmenty (ostatni d5, leky d7, prostredky d7)');
  assert.equal(v2.luzkovaShareAfter, 55.9, 'plošný růst podíl lůžkové nemění');
  const reform = verdict(SEG, { ...flat(8), luzkova: 4, ambulantni: 14 }, doc.envelope.amount_mld);
  assert.ok(reform.luzkovaShareAfter < reform.luzkovaShareBefore, 'reformní vyhláška podíl lůžkové snižuje');
});

test('data: presety se vejdou do obálky a odkazují jen na existující segmenty', () => {
  for (const p of doc.presets) {
    const cost = totalCost(SEG, p.alloc);
    assert.ok(cost <= doc.envelope.amount_mld + 0.05, `${p.id}: ${cost.toFixed(1)} ≤ ${doc.envelope.amount_mld}`);
    for (const id of Object.keys(p.alloc)) {
      assert.ok(SEG.some(s => s.id === id), `${p.id}: segment ${id} existuje`);
    }
  }
});
