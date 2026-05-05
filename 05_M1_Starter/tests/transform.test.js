// Test signal logiky a validace metodických karet.
// Spuštění: npm test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  computeSignal,
  loadMethodCards,
  buildIndicator,
  extractBenchmark,
  transform,
} from '../ingest/transform.js';
import { cachePath, ensureCacheDir, writeCache } from '../ingest/lib/cache.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

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

test('loadMethodCards: načte všech 10 vzorových karet', () => {
  const cards = loadMethodCards();
  assert.equal(cards.length, 10);
  for (const c of cards) {
    assert.ok(c.id, `card missing id: ${JSON.stringify(c).slice(0, 80)}`);
    assert.ok(c.direction, `card ${c.id} missing direction`);
    assert.ok(c.signal_thresholds, `card ${c.id} missing signal_thresholds`);
    assert.ok(c.data_source, `card ${c.id} missing data_source`);
  }
});

test('Každý indikátor v data/indicators.json má odpovídající metodickou kartu', async () => {
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'indicators.json'), 'utf8'));
  const cards = loadMethodCards();
  const cardIds = new Set(cards.map(c => c.id));

  for (const ind of data.indicators) {
    assert.ok(cardIds.has(ind.id), `indicator ${ind.id} has no method card`);
  }
});

// ===== M5: extractBenchmark =====

test('extractBenchmark: použije OECD ze summary, doplní EU ze seed', () => {
  const oecd = { benchmarks: { foo: { oecd: { value: 81.1, year: 2024 } } } };
  const eurostat = { benchmarks: {} };
  const seed = { benchmark: { oecd: 80.0, eu: 80.5 } };
  const out = extractBenchmark('foo', oecd, eurostat, seed);
  assert.equal(out.oecd, 81.1);
  assert.equal(out.eu, 80.5); // ze seedu
});

test('extractBenchmark: bez summary fallbackuje na seed', () => {
  const out = extractBenchmark('foo', null, null, { benchmark: { oecd: 75, eu: 76 } });
  assert.deepEqual(out, { oecd: 75, eu: 76 });
});

// ===== M5: buildIndicator – seed fallback =====

test('buildIndicator: bez cache použije seed value/trend a spočte signal', () => {
  const card = {
    id: 'test_ind',
    name: 'Test',
    area: 'Výsledky',
    domain: 'Zdravotní stav',
    subdomain: 'X',
    unit: 'let',
    direction: 'higher_is_better',
    signal_thresholds: { good: 2, warn: 5 },
    data_source: { primary: { type: 'csu_datastat' } },
    _method_card_path: 'indicators/test_ind.json',
  };
  const seed = {
    value: 80, year: 2024,
    trend: [{ year: 2023, value: 79 }, { year: 2024, value: 80 }],
    benchmark: { oecd: 81, eu: 80 },
    source: { fetched_at: '2026-01-01T00:00:00Z' },
  };
  const out = buildIndicator(card, { seed });
  assert.equal(out.value, 80);
  assert.equal(out.year, 2024);
  assert.deepEqual(out.benchmark, { oecd: 81, eu: 80 });
  assert.equal(out.signal, 'warn'); // 80 vs 81 → -1.2 % → warn
  assert.equal(out.source.origin, 'seed');
});

// ===== M5: buildIndicator – cache override =====

test('buildIndicator: ČSÚ cache přepíše seed value', () => {
  ensureCacheDir();
  writeCache('csu_csu_test.json', {
    id: 'csu_test',
    fetched_at: '2026-05-01T00:00:00Z',
    observations: [
      { year: 2023, region: 'CZ0', sex: 'T', value: 79.5 },
      { year: 2024, region: 'CZ0', sex: 'T', value: 79.9 },
    ],
  });
  try {
    const card = {
      id: 'csu_test',
      name: 'Test', area: 'Výsledky', domain: 'X', subdomain: 'Y',
      unit: 'let', direction: 'higher_is_better',
      signal_thresholds: { good: 2, warn: 5 },
      data_source: { primary: { type: 'csu_datastat' } },
    };
    const seed = { value: 70, trend: [], benchmark: { oecd: 80 } };
    const out = buildIndicator(card, { seed });
    assert.equal(out.value, 79.9);
    assert.equal(out.year, 2024);
    assert.equal(out.trend.length, 2);
    assert.equal(out.source.origin, 'live');
    assert.equal(out.signal, 'warn'); // 79.9 vs 80 → -0.125 %
  } finally {
    fs.unlinkSync(cachePath('csu_csu_test.json'));
  }
});

test('buildIndicator: OECD cache poskytne value i benchmark', () => {
  ensureCacheDir();
  writeCache('oecd_oecd_test.json', {
    indicator_id: 'oecd_test',
    fetched_at: '2026-05-01T00:00:00Z',
    cz: { year: 2024, value: 75 },
    oecd: { year: 2024, value: 64, computed: false },
    trend: [{ year: 2023, value: 74 }, { year: 2024, value: 75 }],
  });
  writeCache('oecd_benchmarks.json', {
    benchmarks: { oecd_test: { cz: { year: 2024, value: 75 }, oecd: { year: 2024, value: 64 } } },
  });
  try {
    const card = {
      id: 'oecd_test',
      name: 'Test', area: 'Výstupy', domain: 'X', subdomain: 'Y',
      unit: '%', direction: 'higher_is_better',
      signal_thresholds: { good: 2, warn: 5 },
      data_source: { primary: { type: 'oecd' } },
    };
    const out = buildIndicator(card, {
      seed: null,
      oecdSummary: JSON.parse(fs.readFileSync(cachePath('oecd_benchmarks.json'), 'utf8')),
    });
    assert.equal(out.value, 75);
    assert.equal(out.benchmark.oecd, 64);
    assert.equal(out.signal, 'good'); // 75 vs 64 → +17 %
  } finally {
    fs.unlinkSync(cachePath('oecd_oecd_test.json'));
    fs.unlinkSync(cachePath('oecd_benchmarks.json'));
  }
});

// ===== Regrese P1: zero-valued live observations se zachovají =====

test('extractFromOecd: hodnota 0 NENÍ považována za chybějící', () => {
  ensureCacheDir();
  writeCache('oecd_zero_test.json', {
    indicator_id: 'zero_test',
    fetched_at: '2026-05-01T00:00:00Z',
    cz: { year: 2024, value: 0 },
    trend: [{ year: 2023, value: 0.1 }, { year: 2024, value: 0 }],
  });
  try {
    const { extractFromOecd } = require('../ingest/transform.js');
    // ESM dynamic import via static binding při startu testu — použij přímo
    // import nahoře pokud by require nešel, ale node:test ESM zvládne require pro JSON.
  } catch { /* ignore — fallback níže */ }

  // Použij stávající importovaný modul
  const card = {
    id: 'zero_test',
    name: 'Zero', area: 'Výsledky', domain: 'X', subdomain: 'Y',
    unit: 'počet', direction: 'lower_is_better',
    signal_thresholds: { good: 2, warn: 5 },
    data_source: { primary: { type: 'oecd' } },
  };
  try {
    const out = buildIndicator(card, { seed: { value: 5, trend: [] } });
    assert.equal(out.value, 0, 'hodnota 0 musí být zachována, ne přepsána seed');
    assert.equal(out.source.origin, 'live');
    assert.equal(out.year, 2024);
  } finally {
    fs.unlinkSync(cachePath('oecd_zero_test.json'));
  }
});

// ===== Regrese P2: source label sleduje skutečný zdroj při fallbacku =====

test('buildIndicator: fallback z primary nrc_nrhosp na OECD označí source jako OECD', () => {
  ensureCacheDir();
  writeCache('oecd_nrc_test.json', {
    indicator_id: 'nrc_test',
    fetched_at: '2026-05-01T00:00:00Z',
    cz: { year: 2024, value: 5.2 },
    trend: [{ year: 2024, value: 5.2 }],
  });
  try {
    const card = {
      id: 'nrc_test',
      name: 'Mortalita test', area: 'Výstupy', domain: 'Kvalita péče', subdomain: 'X',
      unit: '%', direction: 'lower_is_better',
      signal_thresholds: { good: 2, warn: 5 },
      data_source: {
        primary: { type: 'nrc_nrhosp' },
        fallback: { type: 'oecd' },
      },
    };
    const out = buildIndicator(card, { seed: { value: 99, trend: [], benchmark: { oecd: 6 } } });
    assert.equal(out.value, 5.2);
    assert.equal(out.source.name, 'OECD Health Statistics', 'source label musí odrážet skutečný zdroj (OECD), ne primary nrc_nrhosp');
    assert.equal(out.source.fetched_at, '2026-05-01T00:00:00Z');
    assert.equal(out.source.origin, 'live');
  } finally {
    fs.unlinkSync(cachePath('oecd_nrc_test.json'));
  }
});

// ===== M5: transform end-to-end =====

test('transform: vyrobí validní data/indicators.json se všemi poli', async () => {
  const tmpFile = path.join(ROOT, 'data', 'indicators.test.json');
  const out = await transform({ outFile: tmpFile });
  try {
    assert.ok(out.version);
    assert.ok(out.generated_at);
    assert.equal(out.indicators.length, 10);
    for (const ind of out.indicators) {
      for (const f of ['id', 'name', 'area', 'value', 'unit', 'signal', 'trend', 'benchmark', 'source']) {
        assert.ok(ind[f] != null, `${ind.id}: missing ${f}`);
      }
      assert.ok(['good', 'warn', 'bad', 'neutral'].includes(ind.signal));
    }
  } finally {
    if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
  }
});
