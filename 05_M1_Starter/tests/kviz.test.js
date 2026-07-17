// Kvíz — testy enginu (kviz-engine.js): způsobilost indikátorů, generování
// otázek se seedovaným rng (determinismus), vyhodnocení odpovědí, verdikty.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  eligibleFor,
  buildQuestions,
  evaluateAnswer,
  scoreVerdict,
  sliderMax,
  sliderStep,
  GUESS_TOLERANCE_PCT,
} from '../src/kviz-engine.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const INDICATORS = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'data', 'indicators.json'), 'utf8')
).indicators;

/** Deterministický rng (mulberry32) — testy nesmí záviset na Math.random. */
function seedRng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test('eligibleFor: vs_oecd vyžaduje benchmark a aspoň 5% rozdíl', () => {
  const zivy = { source: { origin: 'live' } };
  const blizko = { id: 'a', name: 'A', unit: '%', value: 100, benchmark: { oecd: 102 }, ...zivy };
  const daleko = { id: 'b', name: 'B', unit: '%', value: 100, benchmark: { oecd: 80 }, ...zivy };
  const bezBench = { id: 'c', name: 'C', unit: '%', value: 50, ...zivy };
  const seed = { id: 'd', name: 'D', unit: '%', value: 100, benchmark: { oecd: 80 }, source: { origin: 'seed' } };
  const ids = eligibleFor([blizko, daleko, bezBench, seed], 'vs_oecd').map((i) => i.id);
  assert.deepEqual(ids, ['b'], 'projde jen ŽIVÝ indikátor s dostatečným rozdílem (seed vyřazen)');
});

test('eligibleFor: direction přijímá jen jednoznačný směr', () => {
  const zivy = { source: { origin: 'live' } };
  const vic = { id: 'a', name: 'A', unit: '%', value: 1, direction: 'higher_is_better', ...zivy };
  const min = { id: 'b', name: 'B', unit: '%', value: 1, direction: 'lower_is_better', ...zivy };
  const ctx = { id: 'c', name: 'C', unit: '%', value: 1, direction: 'context_dependent', ...zivy };
  assert.deepEqual(eligibleFor([vic, min, ctx], 'direction').map((i) => i.id), ['a', 'b']);
});

test('sliderMax/sliderStep: hezké meze (1/2/5 × 10^n) a rozumný krok', () => {
  assert.equal(sliderMax(79.9, 81.1), 200, '2×81,1 → nahoru na 200');
  assert.equal(sliderMax(9.5, 6.9), 20, '2×9,5 → 20');
  assert.equal(sliderMax(0.37, 1), 2, '2×1 → 2');
  assert.ok(sliderStep(2) <= 0.1 + 1e-9);
  assert.equal(sliderStep(200), 1);
});

test('buildQuestions: deterministické se seedem, mix typů, bez duplicit', () => {
  const q1 = buildQuestions(INDICATORS, { count: 10, rng: seedRng(42) });
  const q2 = buildQuestions(INDICATORS, { count: 10, rng: seedRng(42) });
  assert.equal(q1.length, 10);
  assert.deepEqual(q1.map((q) => q.id), q2.map((q) => q.id), 'stejný seed → stejné otázky');
  assert.equal(new Set(q1.map((q) => q.id)).size, 10, 'každý indikátor max 1×');
  const typy = new Set(q1.map((q) => q.type));
  assert.ok(typy.size >= 2, 'sada míchá aspoň 2 typy otázek');
  for (const q of q1) {
    assert.ok(q.name && q.unit, `${q.id}: název + jednotka`);
    assert.ok(Number.isFinite(q.value), `${q.id}: hodnota`);
    if (q.type === 'guess') {
      assert.ok(q.max > q.value, `${q.id}: posuvník pokryje hodnotu`);
      assert.ok(q.step > 0);
    } else {
      assert.equal(typeof q.correct, 'boolean', `${q.id}: correct je boolean`);
    }
  }
});

test('buildQuestions: correct u vs_oecd odpovídá datům (spot-check nad reálným kontraktem)', () => {
  const otazky = buildQuestions(INDICATORS, { count: 30, rng: seedRng(7) })
    .filter((q) => q.type === 'vs_oecd');
  assert.ok(otazky.length >= 3);
  for (const q of otazky) {
    assert.equal(q.correct, q.value > q.oecd, `${q.id}: correct = value > oecd`);
  }
});

test('evaluateAnswer: vs_oecd/direction porovnává boolean, guess toleruje ±25 %', () => {
  const vs = { type: 'vs_oecd', correct: true };
  assert.equal(evaluateAnswer(vs, true).correct, true);
  assert.equal(evaluateAnswer(vs, false).correct, false);

  const g = { type: 'guess', value: 100, tolerancePct: GUESS_TOLERANCE_PCT };
  assert.equal(evaluateAnswer(g, 120).correct, true, '20 % vedle je v toleranci');
  assert.equal(evaluateAnswer(g, 130).correct, false, '30 % vedle už ne');
  assert.ok(Math.abs(evaluateAnswer(g, 120).deltaPct - 20) < 1e-9);
  assert.equal(evaluateAnswer(g, NaN).correct, false);
});

test('scoreVerdict: 5 pásem, krajní hodnoty', () => {
  assert.equal(scoreVerdict(10, 10).tier, 5);
  assert.equal(scoreVerdict(7, 10).tier, 4);
  assert.equal(scoreVerdict(5, 10).tier, 3);
  assert.equal(scoreVerdict(3, 10).tier, 2);
  assert.equal(scoreVerdict(0, 10).tier, 1);
  assert.ok(scoreVerdict(0, 0).tier >= 1, 'prázdný kvíz nespadne');
});

test('reálná data: pool je dost velký na 10 otázek bez opakování', () => {
  for (const type of ['vs_oecd', 'guess', 'direction']) {
    assert.ok(eligibleFor(INDICATORS, type).length >= 10, `${type}: aspoň 10 kandidátů`);
  }
});
