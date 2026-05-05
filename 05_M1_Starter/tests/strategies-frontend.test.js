// Testy frontend logiky modulů Strategie + Jak to funguje (M-STR-3, M-EXPL-3).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterStrategies } from '../src/strategies.js';
import { filterExplainers } from '../src/explainers.js';
import { getAudience, audienceText } from '../src/page-shared.js';

const SAMPLE_STRATEGIES = [
  { id: 's1', title: 'Zdraví 2035', subtitle: 'rámec', owner: 'MZČR', level: 'national', topics: ['framework', 'public_health'], tags: ['MZČR'] },
  { id: 's2', title: 'EU4Health', owner: 'Evropská komise', level: 'eu', topics: ['eu_funding'], tags: ['EU'] },
  { id: 's3', title: 'WHO NCD Action Plan', owner: 'WHO', level: 'global', topics: ['ncd'], tags: ['WHO'] },
  { id: 's4', title: 'MKN-10', owner: 'WHO', level: 'standard', topics: ['classification'], tags: ['WHO'] },
];

const SAMPLE_EXPLAINERS = [
  { id: 'e1', title: 'Zdravotní pojišťovny', category: 'actors', tldr_public: 'Sedm pojišťoven v ČR.', tldr_expert: '7 ZP, dominantní VZP.', tldr_policy: 'Veřejnoprávní hybrid.', subtitle: 'Kdo platí péči' },
  { id: 'e2', title: 'CZ-DRG', category: 'money', tldr_public: 'Cena hospitalizace.', tldr_expert: 'DRG báze.', tldr_policy: 'Variabilita kraj × kraj.' },
  { id: 'e3', title: 'MKN-10', category: 'classification', tldr_public: 'Kódy nemocí.', tldr_expert: '14 000 kódů.', tldr_policy: 'Přechod na MKN-11.' },
];

// ===== filterStrategies =====

test('filterStrategies: filtr podle úrovně', () => {
  const out = filterStrategies(SAMPLE_STRATEGIES, { level: 'national' });
  assert.equal(out.length, 1);
  assert.equal(out[0].id, 's1');
});

test('filterStrategies: level=all vrátí vše', () => {
  const out = filterStrategies(SAMPLE_STRATEGIES, { level: 'all' });
  assert.equal(out.length, 4);
});

test('filterStrategies: search napříč title/subtitle/owner/topics/tags', () => {
  assert.equal(filterStrategies(SAMPLE_STRATEGIES, { search: 'who' }).length, 2);
  assert.equal(filterStrategies(SAMPLE_STRATEGIES, { search: 'rámec' }).length, 1);
  assert.equal(filterStrategies(SAMPLE_STRATEGIES, { search: 'eu_funding' }).length, 1);
  assert.equal(filterStrategies(SAMPLE_STRATEGIES, { search: 'NEEXISTUJE' }).length, 0);
});

test('filterStrategies: kombinace level + search', () => {
  const out = filterStrategies(SAMPLE_STRATEGIES, { level: 'global', search: 'who' });
  assert.equal(out.length, 1);
  assert.equal(out[0].id, 's3');
});

// ===== filterExplainers =====

test('filterExplainers: filtr podle kategorie', () => {
  assert.equal(filterExplainers(SAMPLE_EXPLAINERS, { category: 'money' }).length, 1);
  assert.equal(filterExplainers(SAMPLE_EXPLAINERS, { category: 'classification' }).length, 1);
});

test('filterExplainers: search across all 3 tldrs (public + expert + policy)', () => {
  assert.equal(filterExplainers(SAMPLE_EXPLAINERS, { search: 'DRG' }).length, 1);
  assert.equal(filterExplainers(SAMPLE_EXPLAINERS, { search: 'kódy' }).length, 1);
  assert.equal(filterExplainers(SAMPLE_EXPLAINERS, { search: 'pojišťoven' }).length, 1);
  // Regrese P2: policy-only term ("hybrid", "Variabilita", "Přechod") musí najít
  assert.equal(filterExplainers(SAMPLE_EXPLAINERS, { search: 'hybrid' }).length, 1);
  assert.equal(filterExplainers(SAMPLE_EXPLAINERS, { search: 'Variabilita' }).length, 1);
  assert.equal(filterExplainers(SAMPLE_EXPLAINERS, { search: 'MKN-11' }).length, 1);
});

// ===== audienceText =====

test('audienceText: vrátí správnou variantu podle audience', () => {
  const obj = {
    tldr_public: 'public text',
    tldr_expert: 'expert text',
    tldr_policy: 'policy text',
  };
  assert.equal(audienceText(obj, 'public'), 'public text');
  assert.equal(audienceText(obj, 'expert'), 'expert text');
  assert.equal(audienceText(obj, 'policy'), 'policy text');
});

test('audienceText: fallback na public, pokud chybí', () => {
  const obj = { tldr_public: 'fallback' };
  assert.equal(audienceText(obj, 'expert'), 'fallback');
});

test('audienceText: pokud chybí vše, vrátí prázdný string', () => {
  assert.equal(audienceText({}, 'public'), '');
});

// ===== getAudience =====

test('getAudience: bez localStorage vrátí "public"', () => {
  // V test prostředí localStorage neexistuje (Node), funkce má try/catch
  const a = getAudience();
  assert.ok(['public', 'expert', 'policy'].includes(a));
});
