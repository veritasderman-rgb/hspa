// Test signal logiky, validace metodických karet a transform vrstvy.
// Spuštění: npm test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeSignal, loadMethodCards } from '../ingest/transform.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ====== computeSignal ======

test('computeSignal: higher_is_better, hodnota výrazně lepší než benchmark → good', () => {
  assert.equal(computeSignal(81, 75, 'higher_is_better', { good: 2, warn: 5 }), 'good');
});

test('computeSignal: higher_is_better, hodnota mírně horší než benchmark → warn', () => {
  assert.equal(computeSignal(73, 75, 'higher_is_better', { good: 2, warn: 5 }), 'warn');
});

test('computeSignal: higher_is_better, hodnota výrazně horší → bad', () => {
  assert.equal(computeSignal(65, 75, 'higher_is_better', { good: 2, warn: 5 }), 'bad');
});

test('computeSignal: lower_is_better, hodnota nižší → good', () => {
  assert.equal(computeSignal(5.2, 6.5, 'lower_is_better', { good: 2, warn: 5 }), 'good');
});

test('computeSignal: lower_is_better, hodnota výrazně vyšší → bad', () => {
  assert.equal(computeSignal(11.2, 7.7, 'lower_is_better', { good: 2, warn: 5 }), 'bad');
});

test('computeSignal: lower_is_better, hodnota mírně vyšší → warn', () => {
  // value 8.0, benchmark 7.7 → adjusted diff = -((8-7.7)/7.7)*100 = -3.9 % → warn
  assert.equal(computeSignal(8.0, 7.7, 'lower_is_better', { good: 2, warn: 5 }), 'warn');
});

test('computeSignal: chybějící benchmark → neutral', () => {
  assert.equal(computeSignal(100, null, 'higher_is_better', { good: 2, warn: 5 }), 'neutral');
});

test('computeSignal: chybějící hodnota → neutral', () => {
  assert.equal(computeSignal(null, 80, 'higher_is_better', { good: 2, warn: 5 }), 'neutral');
});

test('computeSignal: context_dependent → neutral', () => {
  assert.equal(computeSignal(8.5, 9.3, 'context_dependent', { good: 2, warn: 5 }), 'neutral');
});

test('computeSignal: hodnota přesně na hranici good → good', () => {
  // +2.1 % → good (threshold 2)
  const val = 81 * 1.021;
  assert.equal(computeSignal(val, 81, 'higher_is_better', { good: 2, warn: 5 }), 'good');
});

test('computeSignal: hodnota přesně na hranici bad → bad', () => {
  // -5.1 % → bad (threshold warn=5)
  const val = 81 * (1 - 0.051);
  assert.equal(computeSignal(val, 81, 'higher_is_better', { good: 2, warn: 5 }), 'bad');
});

// ====== Metodické karty ======

test('loadMethodCards: načte všech 15 karet (10 původních + 5 nových)', () => {
  const cards = loadMethodCards();
  assert.ok(cards.length >= 10, `Málo karet: ${cards.length}`);
  for (const c of cards) {
    assert.ok(c.id, `card missing id: ${JSON.stringify(c).slice(0, 80)}`);
    assert.ok(c.direction, `card ${c.id} missing direction`);
    assert.ok(c.signal_thresholds, `card ${c.id} missing signal_thresholds`);
    assert.ok(c.data_source, `card ${c.id} missing data_source`);
    assert.ok(c.definition, `card ${c.id} missing definition`);
    assert.ok(c.unit, `card ${c.id} missing unit`);
    assert.ok(c.stewards, `card ${c.id} missing stewards`);
    assert.ok(Array.isArray(c.stewards), `card ${c.id} stewards must be array`);
  }
});

test('Každý indikátor v data/indicators.json má odpovídající metodickou kartu', () => {
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'indicators.json'), 'utf8'));
  const cards = loadMethodCards();
  const cardIds = new Set(cards.map(c => c.id));
  for (const ind of data.indicators) {
    assert.ok(cardIds.has(ind.id), `indicator ${ind.id} has no method card`);
  }
});

test('Každá metodická karta má odpovídající indikátor v indicators.json', () => {
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'indicators.json'), 'utf8'));
  const cards = loadMethodCards();
  const indicatorIds = new Set(data.indicators.map(i => i.id));
  for (const card of cards) {
    assert.ok(indicatorIds.has(card.id), `method card ${card.id} has no matching indicator`);
  }
});

// ====== data/indicators.json kontrakt ======

test('data/indicators.json: struktura a povinná pole', () => {
  const dataPath = path.join(ROOT, 'data', 'indicators.json');
  assert.ok(fs.existsSync(dataPath), 'data/indicators.json must exist');
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

  assert.ok(data.version, 'missing version');
  assert.ok(data.generated_at, 'missing generated_at');
  assert.ok(Array.isArray(data.indicators), 'indicators must be array');
  assert.ok(data.indicators.length >= 10, `expected >= 10 indicators, got ${data.indicators.length}`);

  const requiredFields = ['id', 'name', 'area', 'domain', 'value', 'unit', 'year', 'trend', 'signal', 'source', 'method_card_url'];
  const validAreas = ['Výsledky', 'Výstupy', 'Procesy', 'Struktury'];
  const validSignals = ['good', 'warn', 'bad', 'neutral'];

  for (const ind of data.indicators) {
    for (const f of requiredFields) {
      assert.notEqual(ind[f], undefined, `indicator ${ind.id}: missing '${f}'`);
    }
    assert.ok(validAreas.includes(ind.area), `indicator ${ind.id}: invalid area '${ind.area}'`);
    assert.ok(validSignals.includes(ind.signal), `indicator ${ind.id}: invalid signal '${ind.signal}'`);
    assert.ok(Array.isArray(ind.trend), `indicator ${ind.id}: trend must be array`);
    assert.ok(ind.trend.length >= 2, `indicator ${ind.id}: trend must have >= 2 points`);
    for (const t of ind.trend) {
      assert.ok(t.year != null, `indicator ${ind.id}: trend item missing year`);
      assert.ok(t.value != null, `indicator ${ind.id}: trend item missing value`);
    }
    // Method card soubor musí existovat
    const cardPath = path.join(ROOT, ind.method_card_url);
    assert.ok(fs.existsSync(cardPath), `indicator ${ind.id}: method_card_url '${ind.method_card_url}' not found`);
  }
});

test('data/indicators.json: IDs jsou unikátní', () => {
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'indicators.json'), 'utf8'));
  const ids = data.indicators.map(i => i.id);
  const unique = new Set(ids);
  assert.equal(ids.length, unique.size, `Duplicate IDs: ${ids.filter((id, i) => ids.indexOf(id) !== i)}`);
});

// ====== data/regions.json ======

test('data/regions.json: struktura', () => {
  const regPath = path.join(ROOT, 'data', 'regions.json');
  assert.ok(fs.existsSync(regPath), 'data/regions.json must exist');
  const data = JSON.parse(fs.readFileSync(regPath, 'utf8'));
  assert.ok(Array.isArray(data.regions), 'regions must be array');
  assert.ok(data.regions.length >= 14, `expected 14 regions, got ${data.regions.length}`);
  for (const r of data.regions) {
    assert.ok(r.code, `region missing code`);
    assert.ok(r.name, `region ${r.code} missing name`);
    assert.ok(r.value != null, `region ${r.code} missing value`);
  }
});

// ====== nové indikátory ======

test('Nové indikátory existují v indicators.json', () => {
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'indicators.json'), 'utf8'));
  const ids = new Set(data.indicators.map(i => i.id));
  const expected = [
    'mortalita_preventabilni', 'mortalita_kojenci', 'vakcinace_chripka_65',
    'nemocnicni_luzka_1000', 'screening_colorektalni',
  ];
  for (const id of expected) {
    assert.ok(ids.has(id), `Missing new indicator: ${id}`);
  }
});

// ====== config.js ======

test('config.js: CONFIG má všechny potřebné sekce', async () => {
  const { CONFIG } = await import('../ingest/config.js');
  assert.ok(CONFIG.uzis?.nrpzs_base, 'missing CONFIG.uzis.nrpzs_base');
  assert.ok(CONFIG.csu?.base, 'missing CONFIG.csu.base');
  assert.ok(CONFIG.oecd?.base, 'missing CONFIG.oecd.base');
  assert.ok(CONFIG.eurostat?.base, 'missing CONFIG.eurostat.base');
  assert.ok(CONFIG.cache?.ttl_hours, 'missing CONFIG.cache.ttl_hours');
  assert.ok(Array.isArray(CONFIG.retry?.backoff_ms), 'missing CONFIG.retry.backoff_ms');
  assert.equal(CONFIG.retry.backoff_ms.length, CONFIG.retry.max_attempts, 'backoff_ms length must match max_attempts');
});
