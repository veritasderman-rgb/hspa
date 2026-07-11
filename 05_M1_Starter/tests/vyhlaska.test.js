// Úhradová vyhláška v2 — testy datového kontraktu (vyhlaska-hra.json,
// plná segmentace dle číselníku ZPP) + enginu (škálování na letošní objem,
// skupinová definitorika, eskalace).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  totalCost, avgGrowthPct, newShares, groupShare, moodFor, effectsFor, verdict, LUZKOVA_GROUP,
} from '../src/vyhlaska-engine.js';
import { validateVyhlaskaHra } from '../ingest/validate-vyhlaska-hra.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const doc = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'vyhlaska-hra.json'), 'utf8'));
const indicators = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'indicators.json'), 'utf8'));
const byId = new Map(indicators.indicators.map(i => [i.id, i]));
const SEG = doc.segments;
const SCALE = doc.current_total_mld / SEG.reduce((a, s) => a + s.baseline_mld, 0);
const flat = (pct) => Object.fromEntries(SEG.map(s => [s.id, pct]));

test('vyhlaska-hra.json prochází validátorem (zdroje, eskalace, efekty, presety)', () => {
  assert.equal(validateVyhlaskaHra(), true);
});

test('data: 17 segmentů dle číselníku ZPP, součet = 456,1 mld (NRHZS 2023)', () => {
  assert.equal(SEG.length, 17);
  const sum = SEG.reduce((a, s) => a + s.baseline_mld, 0);
  assert.ok(Math.abs(sum - 456.1) < 0.05, `součet ${sum.toFixed(2)}`);
  // lůžkový blok = 256,7 (musí sedět na publikovaný údaj segmentu 2)
  const luz = LUZKOVA_GROUP.reduce((a, id) => a + SEG.find(s => s.id === id).baseline_mld, 0);
  assert.ok(Math.abs(luz - 256.7) < 0.05, `lůžkový blok ${luz.toFixed(2)}`);
});

test('data: tři segmenty bez dohody v DR 2027 označeny dle reality', () => {
  assert.match(SEG.find(s => s.id === 'akutni_luzkova').real_2027, /bez dohody/);
  assert.match(SEG.find(s => s.id === 'nasledna_luzkova').real_2027, /bez dohody/);
  assert.match(SEG.find(s => s.id === 'ambulantni_specialiste').real_2027, /bez dohody/);
});

test('engine: totalCost škáluje na letošní objem (7 % všem ≈ 39,4 mld)', () => {
  const cost = totalCost(SEG, flat(7), SCALE);
  assert.ok(Math.abs(cost - 0.07 * doc.current_total_mld) < 0.05, `cost=${cost}`);
  assert.ok(cost <= doc.envelope.amount_mld, 'status quo se vejde do obálky');
});

test('engine: plné požadavky všech segmentů obálku přesahují (napětí hry)', () => {
  const demands = Object.fromEntries(SEG.map(s => [s.id, s.demand_pct]));
  assert.ok(totalCost(SEG, demands, SCALE) > doc.envelope.amount_mld, 'nelze uspokojit všechny');
});

test('engine: newShares/groupShare — plošný růst strukturu nemění, selektivní ano', () => {
  const luzFlat = groupShare(SEG, flat(8), LUZKOVA_GROUP);
  assert.ok(Math.abs(luzFlat - 56.3) < 0.1, `plošně → lůžkový blok 56,3 (má ${luzFlat})`);
  const sum = Object.values(newShares(SEG, flat(8))).reduce((a, x) => a + x.share_pct, 0);
  assert.ok(Math.abs(sum - 100) < 0.001, 'podíly se sčítají na 100');

  const reform = groupShare(SEG, { ...flat(8), akutni_luzkova: 4, prakticti: 14 }, LUZKOVA_GROUP);
  assert.ok(reform < 56.3, 'přibrzděné nemocnice → podíl lůžkového bloku klesá');
});

test('engine: moodFor — eskalační žebřík podle gapu vs. požadavek', () => {
  const akut = SEG.find(s => s.id === 'akutni_luzkova'); // demand 9
  assert.equal(moodFor(akut, 9), 'agree');
  assert.equal(moodFor(akut, 7.5), 'grudging');
  assert.equal(moodFor(akut, 5.5), 'no_deal');
  assert.equal(moodFor(akut, 3), 'protest');
});

test('engine: effectsFor — directional jen při nadprůměrném růstu, definitional skupinově', () => {
  const flat7 = effectsFor(SEG, flat(7), byId);
  const acscFlat = flat7.find(e => e.indicator === 'hospitalizace_acsc');
  assert.equal(acscFlat.active, false, 'plošný růst → žádné relativní posílení');
  const def = flat7.find(e => e.kind === 'definitional');
  assert.equal(def.active, true);
  assert.ok(Math.abs(def.after - 56.3) < 0.1, 'plošně → podíl lůžkového bloku beze změny');
  assert.ok(Math.abs(def.before - def.after) < 0.1);

  const reform = effectsFor(SEG, { ...flat(6), prakticti: 12, stomatologie: 12 }, byId);
  const acsc = reform.find(e => e.indicator === 'hospitalizace_acsc');
  assert.equal(acsc.active, true, 'praktici nadprůměrně → ACSC efekt aktivní');
  assert.equal(acsc.polarity, 'down');
  const zuby = reform.find(e => e.indicator === 'nesplnena_potreba_zubni_pece');
  assert.equal(zuby.active, true, 'stomatologie nadprůměrně → efekt aktivní');
});

test('engine: verdict — deficit, dohody a posun podílu lůžkového bloku', () => {
  const v = verdict(SEG, flat(10), doc.envelope.amount_mld, SCALE); // 56,3 mld > 40
  assert.equal(v.deficit, true, '10 % všem = deficit');
  const v2 = verdict(SEG, flat(7), doc.envelope.amount_mld, SCALE);
  assert.equal(v2.deficit, false);
  // dohody se počítají jen přes 15 vyjednávacích segmentů DR (centrová léčba
  // a zákonné položky mají dr_segment: false) — srovnatelné s realitou 12/15
  assert.equal(v2.segmentsTotal, 15);
  assert.equal(SEG.filter(s => s.dr_segment === false).length, 2);
  assert.ok(Math.abs(v2.luzkovaShareAfter - v2.luzkovaShareBefore) < 0.1, 'plošný růst podíl nemění');
  const reform = verdict(SEG, { ...flat(7), akutni_luzkova: 4, prakticti: 12 }, doc.envelope.amount_mld, SCALE);
  assert.ok(reform.luzkovaShareAfter < reform.luzkovaShareBefore, 'reformní vyhláška podíl lůžkového bloku snižuje');
});

test('data: presety pokrývají všechny segmenty a vejdou se do obálky (škálováno)', () => {
  for (const p of doc.presets) {
    assert.equal(Object.keys(p.alloc).length, SEG.length, `${p.id}: alokace pro všech 17`);
    const cost = totalCost(SEG, p.alloc, SCALE);
    assert.ok(cost <= doc.envelope.amount_mld + 0.05, `${p.id}: ${cost.toFixed(1)} ≤ ${doc.envelope.amount_mld}`);
  }
});

test('engine: avgGrowthPct — vážený průměr odpovídá plošné sazbě', () => {
  assert.ok(Math.abs(avgGrowthPct(SEG, flat(7)) - 7) < 0.001);
});
