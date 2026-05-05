// Test signal logiky a validace metodických karet.
// Spuštění: npm test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeSignal, loadMethodCards } from '../ingest/transform.js';

test('computeSignal: higher_is_better, hodnota výrazně lepší než benchmark → good', () => {
  // value 81, benchmark 75 → +8 % → good (threshold good=2)
  const s = computeSignal(81, 75, 'higher_is_better', { good: 2, warn: 5 });
  assert.equal(s, 'good');
});

test('computeSignal: higher_is_better, hodnota mírně horší než benchmark → warn', () => {
  // value 73, benchmark 75 → -2.67 % → warn
  const s = computeSignal(73, 75, 'higher_is_better', { good: 2, warn: 5 });
  assert.equal(s, 'warn');
});

test('computeSignal: higher_is_better, hodnota výrazně horší → bad', () => {
  // value 65, benchmark 75 → -13.3 % → bad
  const s = computeSignal(65, 75, 'higher_is_better', { good: 2, warn: 5 });
  assert.equal(s, 'bad');
});

test('computeSignal: lower_is_better, hodnota nižší → good', () => {
  // value 5.2, benchmark 6.5 → adjusted +20 % → good
  const s = computeSignal(5.2, 6.5, 'lower_is_better', { good: 2, warn: 5 });
  assert.equal(s, 'good');
});

test('computeSignal: lower_is_better, hodnota výrazně vyšší → bad', () => {
  // value 11.2, benchmark 7.7 → adjusted -45 % → bad
  const s = computeSignal(11.2, 7.7, 'lower_is_better', { good: 2, warn: 5 });
  assert.equal(s, 'bad');
});

test('computeSignal: chybějící benchmark → neutral', () => {
  const s = computeSignal(100, null, 'higher_is_better', { good: 2, warn: 5 });
  assert.equal(s, 'neutral');
});

test('computeSignal: context_dependent → neutral', () => {
  const s = computeSignal(8.5, 9.3, 'context_dependent', { good: 2, warn: 5 });
  assert.equal(s, 'neutral');
});

test('computeSignal: kojenecka umrtnost – lower_is_better, ČR výrazně pod OECD → good', () => {
  // ČR 2.5, OECD 4.1 → adjusted +39 % → good
  const s = computeSignal(2.5, 4.1, 'lower_is_better', { good: 2, warn: 10 });
  assert.equal(s, 'good');
});

test('computeSignal: vakcinace_chripka – higher_is_better, ČR 45 vs OECD 58 → bad', () => {
  // -22.4 % → bad
  const s = computeSignal(45.2, 58.0, 'higher_is_better', { good: 5, warn: 10 });
  assert.equal(s, 'bad');
});

test('computeSignal: ockovani_deti_mmr – higher_is_better, ČR 96.2 vs OECD 92.5 → good', () => {
  // +4 % → good
  const s = computeSignal(96.2, 92.5, 'higher_is_better', { good: 2, warn: 5 });
  assert.equal(s, 'good');
});

test('loadMethodCards: načte všech 25 metodických karet', () => {
  const cards = loadMethodCards();
  assert.equal(cards.length, 25);
  for (const c of cards) {
    assert.ok(c.id, `card missing id: ${JSON.stringify(c).slice(0, 80)}`);
    assert.ok(c.direction, `card ${c.id} missing direction`);
    assert.ok(c.signal_thresholds, `card ${c.id} missing signal_thresholds`);
    assert.ok(c.data_source, `card ${c.id} missing data_source`);
  }
});

test('Každý indikátor v data/indicators.json má odpovídající metodickou kartu', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const ROOT = path.resolve(__dirname, '..');

  const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'indicators.json'), 'utf8'));
  const cards = loadMethodCards();
  const cardIds = new Set(cards.map(c => c.id));

  assert.equal(data.indicators.length, 25, `expected 25 indicators, got ${data.indicators.length}`);

  for (const ind of data.indicators) {
    assert.ok(cardIds.has(ind.id), `indicator ${ind.id} has no method card`);
  }
});

test('Každý indikátor má povinná pole', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const ROOT = path.resolve(__dirname, '..');

  const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'indicators.json'), 'utf8'));
  const REQUIRED = ['id', 'name', 'area', 'domain', 'value', 'unit', 'year', 'signal', 'source', 'method_card_url'];
  const VALID_AREAS = ['Výsledky', 'Výstupy', 'Procesy', 'Struktury'];
  const VALID_SIGNALS = ['good', 'warn', 'bad', 'neutral'];

  for (const ind of data.indicators) {
    for (const field of REQUIRED) {
      assert.ok(ind[field] != null, `indicator ${ind.id}: missing '${field}'`);
    }
    assert.ok(VALID_AREAS.includes(ind.area), `indicator ${ind.id}: invalid area '${ind.area}'`);
    assert.ok(VALID_SIGNALS.includes(ind.signal), `indicator ${ind.id}: invalid signal '${ind.signal}'`);
  }
});

test('Všechny 4 oblasti HSPA jsou pokryty', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const ROOT = path.resolve(__dirname, '..');

  const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'indicators.json'), 'utf8'));
  const areas = new Set(data.indicators.map(i => i.area));
  for (const area of ['Výsledky', 'Výstupy', 'Procesy', 'Struktury']) {
    assert.ok(areas.has(area), `oblast '${area}' není pokryta žádným indikátorem`);
  }
});
