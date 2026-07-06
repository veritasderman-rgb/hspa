// Testy legislativního radaru (U18): frontend filtr/řazení (src/legislativa.js),
// validátor (ingest/validate-legislation.js) a integrita data/legislativa.json.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { filterLegislation, sortLegislation, PHASE_LABELS, TYPE_LABELS, PHASE_ORDER } from '../src/legislativa.js';
import { validateLegislation, VALID_PHASES, VALID_TYPES, REQUIRED } from '../ingest/validate-legislation.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const SAMPLE = [
  { id: 'l1', title_short: 'Novela zákona o elektronizaci zdravotnictví', title: 'Návrh zákona…', annotation: 'Povinná e-Žádanka a EHDS.', submitter: 'Ministerstvo zdravotnictví', phase: 'pripominky', dates: { last_change: '2026-07-03' } },
  { id: 'l2', title_short: 'Úhradová vyhláška 2026', title: 'Vyhláška…', annotation: 'Hodnoty bodu pro rok 2026.', submitter: 'Ministerstvo zdravotnictví', phase: 'dokonceno', dates: { last_change: '2025-10-23' } },
  { id: 'l3', title_short: 'Novela zákona o návykových látkách', title: 'Návrh zákona…', annotation: 'Psychomodulační látky.', submitter: 'Ministerstvo zdravotnictví', phase: 'pripominky', dates: { last_change: '2026-06-30' } },
  { id: 'l4', title_short: 'Novela ochrany veřejného zdraví', title: 'Návrh zákona…', annotation: 'Pitná voda.', submitter: 'Ministerstvo zdravotnictví', phase: 'vlada', dates: { last_change: '2026-07-03' } },
];

// ===== filterLegislation =====

test('filterLegislation: filtr podle fáze', () => {
  const out = filterLegislation(SAMPLE, { phase: 'pripominky' });
  assert.equal(out.length, 2);
  assert.deepEqual(out.map(x => x.id).sort(), ['l1', 'l3']);
});

test('filterLegislation: phase=all (nebo neuvedeno) vrátí vše', () => {
  assert.equal(filterLegislation(SAMPLE, { phase: 'all' }).length, 4);
  assert.equal(filterLegislation(SAMPLE, {}).length, 4);
});

test('filterLegislation: fulltext přes title_short/annotation', () => {
  assert.equal(filterLegislation(SAMPLE, { search: 'e-žádanka' }).length, 1);
  assert.equal(filterLegislation(SAMPLE, { search: 'úhradová' }).length, 1);
  assert.equal(filterLegislation(SAMPLE, { search: 'NEEXISTUJE' }).length, 0);
});

test('filterLegislation: kombinace fáze + search', () => {
  const out = filterLegislation(SAMPLE, { phase: 'pripominky', search: 'návykových' });
  assert.equal(out.length, 1);
  assert.equal(out[0].id, 'l3');
});

// ===== sortLegislation =====

test('sortLegislation: rozjednané fáze před dokončenými, uvnitř fáze novější změna první', () => {
  const out = sortLegislation(SAMPLE);
  assert.deepEqual(out.map(x => x.id), ['l1', 'l3', 'l4', 'l2']);
});

test('sortLegislation: nemutuje vstupní pole', () => {
  const before = SAMPLE.map(x => x.id);
  sortLegislation(SAMPLE);
  assert.deepEqual(SAMPLE.map(x => x.id), before);
});

// ===== konzistence UI ↔ validátor =====

test('PHASE_LABELS pokrývá přesně VALID_PHASES validátoru', () => {
  assert.deepEqual(Object.keys(PHASE_LABELS).sort(), [...VALID_PHASES].sort());
  assert.deepEqual([...PHASE_ORDER].sort(), [...VALID_PHASES].sort());
});

test('TYPE_LABELS pokrývá přesně VALID_TYPES validátoru', () => {
  assert.deepEqual(Object.keys(TYPE_LABELS).sort(), [...VALID_TYPES].sort());
});

// ===== validateLegislation =====

function validItem(overrides = {}) {
  return {
    id: 'test-navrh',
    veklep_id: 'ALBSDTEST123',
    title: 'Návrh zákona, kterým se mění zákon č. 1/2000 Sb.',
    title_short: 'Testovací novela',
    type: 'zakon',
    submitter: 'Ministerstvo zdravotnictví',
    phase: 'pripominky',
    veklep_status: '2 - v připomínkovém řízení',
    veklep_url: 'https://odok.cz/portal/veklep/material/ALBSDTEST123/',
    annotation: 'Testovací anotace.',
    dates: { authorized: '2026-01-01', last_change: '2026-01-02', comments_until: null },
    linked_indicators: [],
    linked_articles: [],
    verified_at: '2026-07-06',
    ...overrides,
  };
}

function validDataset(items) {
  return { version: '1.0', generated_at: '2026-07-06T00:00:00Z', items };
}

test('validateLegislation: validní dataset projde bez chyb', () => {
  assert.deepEqual(validateLegislation(validDataset([validItem()])), []);
});

test('validateLegislation: chybějící povinná pole', () => {
  const item = validItem();
  delete item.annotation;
  delete item.veklep_url;
  const errors = validateLegislation(validDataset([item]));
  assert.ok(errors.some(e => e.includes("missing required 'annotation'")));
  assert.ok(errors.some(e => e.includes("missing required 'veklep_url'")));
});

test('validateLegislation: nevalidní phase a type', () => {
  const errors = validateLegislation(validDataset([
    validItem({ phase: 'snemovna' }),
    validItem({ id: 'x2', veklep_id: 'V2', type: 'smernice' }),
  ]));
  assert.ok(errors.some(e => e.includes("invalid phase 'snemovna'")));
  assert.ok(errors.some(e => e.includes("invalid type 'smernice'")));
});

test('validateLegislation: duplicitní id a veklep_id', () => {
  const errors = validateLegislation(validDataset([validItem(), validItem()]));
  assert.ok(errors.some(e => e.includes('duplicate id')));
  assert.ok(errors.some(e => e.includes('duplicate veklep_id')));
});

test('validateLegislation: veklep_url mimo odok.cz selže', () => {
  const errors = validateLegislation(validDataset([validItem({ veklep_url: 'https://example.com/navrh' })]));
  assert.ok(errors.some(e => e.includes('veklep_url')));
});

test('validateLegislation: špatný formát data', () => {
  const errors = validateLegislation(validDataset([validItem({ dates: { last_change: '3. 7. 2026' } })]));
  assert.ok(errors.some(e => e.includes('dates.last_change')));
});

test('validateLegislation: FK kontrola linked_indicators + linked_articles', () => {
  const refs = { indicatorIds: new Set(['ehealth_adoption']), articleIds: new Set(['ehealth']) };
  const okItem = validItem({ linked_indicators: ['ehealth_adoption'], linked_articles: ['ehealth'] });
  assert.deepEqual(validateLegislation(validDataset([okItem]), refs), []);

  const badItem = validItem({ linked_indicators: ['neexistuje'], linked_articles: ['neexistuje'] });
  const errors = validateLegislation(validDataset([badItem]), refs);
  assert.ok(errors.some(e => e.includes("linked_indicator 'neexistuje'")));
  assert.ok(errors.some(e => e.includes("linked_article 'neexistuje'")));
});

test('validateLegislation: chybějící version/generated_at/items', () => {
  const errors = validateLegislation({});
  assert.ok(errors.some(e => e.includes('version')));
  assert.ok(errors.some(e => e.includes('generated_at')));
  assert.ok(errors.some(e => e.includes('items')));
});

// ===== integrita reálného datasetu =====

test('data/legislativa.json: parsuje se a projde validátorem včetně FK', () => {
  const data = JSON.parse(readFileSync(resolve(ROOT, 'data', 'legislativa.json'), 'utf8'));
  const indicatorIds = new Set(
    JSON.parse(readFileSync(resolve(ROOT, 'data', 'indicators.json'), 'utf8')).indicators.map(i => i.id)
  );
  const articleIds = new Set(
    JSON.parse(readFileSync(resolve(ROOT, 'data', 'articles.json'), 'utf8')).articles.map(a => a.id)
  );
  const errors = validateLegislation(data, { indicatorIds, articleIds });
  assert.deepEqual(errors, []);
  assert.ok(data.items.length >= 10, `radar má mít aspoň 10 úvodních záznamů (má ${data.items.length})`);
});

test('data/legislativa.json: každý záznam má neprázdnou anotaci a VeKLEP odkaz s PID', () => {
  const data = JSON.parse(readFileSync(resolve(ROOT, 'data', 'legislativa.json'), 'utf8'));
  for (const item of data.items) {
    assert.ok(item.annotation.length > 40, `${item.id}: anotace je podezřele krátká`);
    assert.ok(item.veklep_url.includes(item.veklep_id), `${item.id}: veklep_url neobsahuje veklep_id`);
  }
});

test('legislativa.html: stránka odkazuje na src/legislativa.js a má právě jeden hero <h1>', () => {
  const html = readFileSync(resolve(ROOT, 'legislativa.html'), 'utf8');
  assert.ok(html.includes('src/legislativa.js'));
  assert.equal((html.match(/<h1\b/g) || []).length, 1);
  assert.ok(/class="ed-hero-headline"/.test(html));
});
