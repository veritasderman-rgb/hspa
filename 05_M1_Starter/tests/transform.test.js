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

test('loadMethodCards: načte všech 13 karet (10 původní + 3 Procesy)', () => {
  const cards = loadMethodCards();
  assert.equal(cards.length, 13);
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

  for (const ind of data.indicators) {
    assert.ok(cardIds.has(ind.id), `indicator ${ind.id} has no method card`);
  }
});

test('data/indicators.json obsahuje přesně 13 indikátorů', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const ROOT = path.resolve(__dirname, '..');
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'indicators.json'), 'utf8'));
  assert.equal(data.indicators.length, 13);
});

test('Oblast Procesy má alespoň 3 indikátory', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const ROOT = path.resolve(__dirname, '..');
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'indicators.json'), 'utf8'));
  const procesy = data.indicators.filter(i => i.area === 'Procesy');
  assert.ok(procesy.length >= 3, `Procesy has only ${procesy.length} indicator(s)`);
});

test('Každý indikátor má povinné pole year', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const ROOT = path.resolve(__dirname, '..');
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'indicators.json'), 'utf8'));
  for (const ind of data.indicators) {
    assert.ok(ind.year != null, `indicator ${ind.id} missing year`);
    assert.ok(typeof ind.year === 'number', `indicator ${ind.id} year is not a number`);
  }
});

test('computeSignal: lower_is_better, čekací doby — CZ lepší než OECD → good', () => {
  // CZ 65 dní, OECD 80 dní → adjusted +18.75 % → good (threshold good=10)
  const s = computeSignal(65, 80, 'lower_is_better', { good: 10, warn: 20 });
  assert.equal(s, 'good');
});

test('computeSignal: higher_is_better, koordinace péče — CZ horší → warn', () => {
  // CZ 68, OECD 74 → diff -8.1 % → warn (threshold good=5, warn=10)
  const s = computeSignal(68, 74, 'higher_is_better', { good: 5, warn: 10 });
  assert.equal(s, 'warn');
});
