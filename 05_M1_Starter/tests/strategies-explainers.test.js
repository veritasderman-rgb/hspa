// Testy datového kontraktu pro strategies.json + explainers.json + cross-link helper.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildIndex } from '../src/strategy-links.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ===== data/strategies.json =====

test('strategies.json: validní JSON, ≥30 záznamů, povinná pole', () => {
  const raw = fs.readFileSync(path.join(ROOT, 'data', 'strategies.json'), 'utf8');
  const data = JSON.parse(raw);
  assert.ok(data.version);
  assert.ok(Array.isArray(data.strategies));
  assert.ok(data.strategies.length >= 30, `expected ≥30 strategies, got ${data.strategies.length}`);

  for (const s of data.strategies) {
    for (const f of ['id', 'title', 'level', 'scope', 'status', 'owner']) {
      assert.ok(s[f] != null, `strategy ${s.id ?? '?'}: missing ${f}`);
    }
  }
});

test('strategies.json: pokrytí všech úrovní (national, eu, global, institution, standard)', () => {
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'strategies.json'), 'utf8'));
  const levels = new Set(data.strategies.map(s => s.level));
  for (const expected of ['national', 'eu', 'global', 'institution', 'standard']) {
    assert.ok(levels.has(expected), `chybí strategie úrovně ${expected}`);
  }
});

test('strategies.json: linked_indicators referencují existující indikátory', () => {
  const strats = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'strategies.json'), 'utf8'));
  const inds = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'indicators.json'), 'utf8'));
  const validIds = new Set(inds.indicators.map(i => i.id));

  for (const s of strats.strategies) {
    for (const id of s.linked_indicators ?? []) {
      assert.ok(validIds.has(id), `strategy ${s.id}: linked_indicator '${id}' neexistuje`);
    }
  }
});

test('strategies.json: related_strategies tvoří validní vnitřní cykly', () => {
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'strategies.json'), 'utf8'));
  const ids = new Set(data.strategies.map(s => s.id));
  for (const s of data.strategies) {
    for (const rid of s.related_strategies ?? []) {
      assert.ok(ids.has(rid), `strategy ${s.id}: related_strategy '${rid}' neexistuje`);
    }
  }
});

// ===== data/explainers.json =====

test('explainers.json: validní JSON, ≥5 záznamů, povinná pole', () => {
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'explainers.json'), 'utf8'));
  assert.ok(Array.isArray(data.explainers));
  assert.ok(data.explainers.length >= 5,
    `expected ≥5 explainers, got ${data.explainers.length}`);

  for (const e of data.explainers) {
    for (const f of ['id', 'title', 'category', 'tldr_public', 'tldr_expert', 'tldr_policy']) {
      assert.ok(e[f] != null, `explainer ${e.id ?? '?'}: missing ${f}`);
    }
  }
});

test('explainers.json: 4 kategorie (money, classification, actors, process)', () => {
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'explainers.json'), 'utf8'));
  const cats = new Set(data.explainers.map(e => e.category));
  // Aspoň 3 z 4 kategorií zastoupené
  const allowed = ['money', 'classification', 'actors', 'process'];
  for (const c of cats) {
    assert.ok(allowed.includes(c), `invalid category '${c}'`);
  }
  assert.ok(cats.size >= 3, `expected ≥3 distinct categories, got ${cats.size}`);
});

test('explainers.json: každý explainer má ≥1 absurdity_example', () => {
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'explainers.json'), 'utf8'));
  for (const e of data.explainers) {
    assert.ok(Array.isArray(e.absurdity_examples), `${e.id}: absurdity_examples not array`);
    assert.ok(e.absurdity_examples.length >= 1, `${e.id}: needs ≥1 absurdity example`);
    for (const ex of e.absurdity_examples) {
      assert.ok(ex.context, `${e.id}: absurdity_example missing context`);
      assert.ok(ex.source || ex.url, `${e.id}: absurdity_example missing source AND url`);
    }
  }
});

// ===== Cross-link helper =====

test('buildIndex: byIndicator vrátí strategie + explainery odkazující daný indikátor', () => {
  const strategies = [
    { id: 's1', linked_indicators: ['nadeje_doziti_total', 'kuractvi_denni'] },
    { id: 's2', linked_indicators: ['kuractvi_denni'] },
    { id: 's3', linked_indicators: [] },
  ];
  const explainers = [
    { id: 'e1', linked_indicators: ['nadeje_doziti_total'] },
  ];
  const idx = buildIndex(strategies, explainers);

  const r1 = idx.byIndicator('nadeje_doziti_total');
  assert.equal(r1.strategies.length, 1);
  assert.equal(r1.strategies[0].id, 's1');
  assert.equal(r1.explainers.length, 1);
  assert.equal(r1.explainers[0].id, 'e1');

  const r2 = idx.byIndicator('kuractvi_denni');
  assert.equal(r2.strategies.length, 2);
  assert.equal(r2.explainers.length, 0);

  const r3 = idx.byIndicator('neexistujici');
  assert.deepEqual(r3, { strategies: [], explainers: [] });
});

test('buildIndex: explainersForStrategy najde přímé i tranzitivní vazby', () => {
  const strategies = [
    { id: 's1', linked_indicators: ['ind_a'] },
  ];
  const explainers = [
    { id: 'e1', linked_strategies: ['s1'] }, // přímá vazba
    { id: 'e2', linked_indicators: ['ind_a'] }, // tranzitivní přes indikátor
    { id: 'e3', linked_indicators: ['ind_x'] }, // bez vazby
  ];
  const idx = buildIndex(strategies, explainers);
  const out = idx.explainersForStrategy('s1');
  const ids = out.map(e => e.id).sort();
  assert.deepEqual(ids, ['e1', 'e2']);
});

test('buildIndex: strategiesForExplainer najde přímé i tranzitivní vazby', () => {
  const strategies = [
    { id: 's1', linked_indicators: ['ind_a'] },
    { id: 's2', linked_indicators: ['ind_b'] },
  ];
  const explainers = [
    { id: 'e1', linked_strategies: ['s1'], linked_indicators: ['ind_b'] },
  ];
  const idx = buildIndex(strategies, explainers);
  const out = idx.strategiesForExplainer('e1');
  const ids = out.map(s => s.id).sort();
  assert.deepEqual(ids, ['s1', 's2']);
});

test('Real data: každý explainer má aspoň 1 propojenou strategii nebo indikátor', () => {
  const strategies = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'strategies.json'), 'utf8')).strategies;
  const explainers = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'explainers.json'), 'utf8')).explainers;
  const idx = buildIndex(strategies, explainers);

  for (const e of explainers) {
    const linked = idx.strategiesForExplainer(e.id);
    assert.ok(linked.length > 0, `explainer ${e.id} nemá žádnou propojenou strategii`);
  }
});
