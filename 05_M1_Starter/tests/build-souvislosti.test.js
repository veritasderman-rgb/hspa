// Testy Souvislosti engine (scripts/build-souvislosti.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSouvislosti } from '../scripts/build-souvislosti.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const NOW = new Date('2026-07-09T00:00:00Z');

// --- Malý deterministický fixture dataset (nezávislý na reálných datech) ---
function fixture() {
  return {
    indicators: {
      indicators: [
        { id: 'ind_a', name: 'Indikátor A' },
        { id: 'ind_b', name: 'Indikátor B' },
        { id: 'ind_orphan', name: 'Osiřelý indikátor' }, // bez jediné vazby
      ],
    },
    systemModel: {
      nodes: [
        { id: 'node_x', label: 'Uzel X', kind: 'lever', layer: 'Struktury', indicators: ['ind_a'] },
        { id: 'node_y', label: 'Uzel Y', kind: 'domain', layer: 'Výsledky', indicators: ['ind_b'] },
      ],
      edges: [
        { id: 'e1', from: 'node_x', to: 'node_y', polarity: 'plus', strength: 'strong', mechanism: 'X → Y' },
        { id: 'e_dead', from: 'node_x', to: 'node_missing', polarity: 'plus', mechanism: 'mrtvý cíl' },
      ],
    },
    legislativa: {
      items: [
        { id: 'leg1', title: 'Zákon 1', title_short: 'Z1', phase: 'pripominky', linked_indicators: ['ind_a', 'ind_unknown'] },
      ],
      plan_items: [
        { id: 'plan1', nazev: 'Plán 1', stav: 'vlada', plan_termin: '2026-04', radar_id: 'leg1' },
        { id: 'plan_dead', nazev: 'Plán bez radaru', radar_id: 'leg_missing' },
      ],
    },
    articles: {
      articles: [
        { id: 'art1', slug: 'clanek-art1.html', title: 'Článek 1', date: '2026-01-01', rubric: 'analyza', linked_indicators: ['ind_a'] },
        { id: 'draft1', slug: 'clanek-draft1.html', title: 'Draft', published: false, linked_indicators: ['ind_a'] },
        { id: 'art_unknown', slug: 'clanek-x.html', title: 'X', linked_indicators: ['ind_unknown'] },
      ],
    },
    claims: {
      claims: [
        { id: 'c1', article: 'clanek-art1.html', quote: 'A je 5', value: 5, unit: '%', as_of: 2024, relation: 'exact', indicator_id: 'ind_a' },
        { id: 'c_unknown', quote: 'x', indicator_id: 'ind_unknown' },
      ],
    },
    barometr: {
      commitments: [
        { id: 'cm1', stav: 'plni_se', oblast: 'Výsledky', linked_indicators: [{ id: 'ind_a', baseline_value: 1, baseline_year: 2024, direction_wanted: 'higher_is_better' }] },
      ],
      statements: [
        { id: 'st1', verdikt: 'sedi_s_daty', kdo: 'Ministr', funkce: 'ministr', linked_indicators: ['ind_a'] },
      ],
    },
  };
}

test('sběr všech pěti typů vazeb pro jeden indikátor', () => {
  const out = buildSouvislosti({ data: fixture(), now: NOW });
  const a = out.indicators.ind_a;
  assert.ok(a, 'ind_a má záznam');
  // (a) model
  assert.equal(a.model.node.id, 'node_x');
  assert.equal(a.model.outgoing.length, 1);
  assert.equal(a.model.outgoing[0].node_id, 'node_y');
  // (b) legislativa: item + plan (přes radar_id)
  assert.equal(a.legislativa.length, 2);
  assert.deepEqual(a.legislativa.map((l) => l.kind).sort(), ['plan', 'radar']);
  // (c) články: draft vyloučen
  assert.equal(a.articles.length, 1);
  assert.equal(a.articles[0].id, 'art1');
  // (d) claims
  assert.equal(a.claims.length, 1);
  assert.equal(a.claims[0].id, 'c1');
  assert.equal(a.claims[0].article_slug, 'clanek-art1.html');
  // (e) barometr
  assert.equal(a.barometr.commitments.length, 1);
  assert.equal(a.barometr.commitments[0].baseline_value, 1);
  assert.equal(a.barometr.statements.length, 1);
});

test('idempotence: dvě stavby se stejnými vstupy jsou identické', () => {
  const data = fixture();
  const a = buildSouvislosti({ data, now: NOW });
  const b = buildSouvislosti({ data: fixture(), now: NOW });
  assert.equal(JSON.stringify(a), JSON.stringify(b));
});

test('žádné mrtvé cizí klíče: neznámé cíle se přeskočí', () => {
  const out = buildSouvislosti({ data: fixture(), now: NOW });
  // ind_unknown není v indicators.json → nesmí být v mapě
  assert.equal(out.indicators.ind_unknown, undefined);
  // hrana na node_missing se do incoming/outgoing nedostala
  const y = out.indicators.ind_b;
  assert.ok(y.model.incoming.every((e) => e.node_id !== 'node_missing'));
  // plan_dead s neexistujícím radar_id nikam nepřidal
  const allLeg = Object.values(out.indicators).flatMap((i) => i.legislativa);
  assert.ok(allLeg.every((l) => l.id !== 'plan_dead'));
});

test('indikátor bez jediné vazby se do mapy nedostane', () => {
  const out = buildSouvislosti({ data: fixture(), now: NOW });
  assert.equal(out.indicators.ind_orphan, undefined);
  assert.equal(out.counts.indicators_total, 3);
  assert.equal(out.counts.indicators_with_links, 2);
});

test('pořadí klíčů kopíruje pořadí indikátorů (determinismus)', () => {
  const out = buildSouvislosti({ data: fixture(), now: NOW });
  assert.deepEqual(Object.keys(out.indicators), ['ind_a', 'ind_b']);
});

test('graceful: chybějící barometr.json engine nerozbije', () => {
  const data = fixture();
  const out = buildSouvislosti({ data: { ...data, barometr: null }, now: NOW });
  assert.equal(out.counts.sources.barometr, false);
  assert.equal(out.indicators.ind_a.barometr.commitments.length, 0);
  assert.equal(out.indicators.ind_a.barometr.statements.length, 0);
  // ostatní vazby zůstávají
  assert.ok(out.indicators.ind_a.articles.length >= 1);
});

test('graceful: úplně prázdné vstupy → prázdná mapa, žádná výjimka', () => {
  const out = buildSouvislosti({
    data: { indicators: { indicators: [] }, systemModel: {}, legislativa: {}, articles: {}, claims: {}, barometr: null },
    now: NOW,
  });
  assert.deepEqual(out.indicators, {});
  assert.equal(out.counts.indicators_with_links, 0);
});

test('statements přijímají linked_indicators jako string i objekt', () => {
  const data = fixture();
  data.barometr.statements[0].linked_indicators = [{ id: 'ind_a' }]; // objektová varianta
  const out = buildSouvislosti({ data, now: NOW });
  assert.equal(out.indicators.ind_a.barometr.statements.length, 1);
});

// --- Integrace proti reálným datům v repu ---
test('reálný build: bez mrtvých FK a validní JSON', () => {
  const out = buildSouvislosti({ now: NOW });
  const indIds = new Set(JSON.parse(readFileSync(resolve(ROOT, 'data/indicators.json'), 'utf8')).indicators.map((i) => i.id));
  const articles = JSON.parse(readFileSync(resolve(ROOT, 'data/articles.json'), 'utf8')).articles;
  const artByRef = new Set();
  for (const a of articles) { if (a.id) artByRef.add(a.id); if (a.slug) artByRef.add(a.slug); }
  const legIds = new Set(JSON.parse(readFileSync(resolve(ROOT, 'data/legislativa.json'), 'utf8')).items.map((i) => i.id));
  const planIds = new Set(JSON.parse(readFileSync(resolve(ROOT, 'data/legislativa.json'), 'utf8')).plan_items.map((i) => i.id));

  for (const [iid, entry] of Object.entries(out.indicators)) {
    assert.ok(indIds.has(iid), `klíč ${iid} je známý indikátor`);
    for (const art of entry.articles) {
      assert.ok(art.id == null || artByRef.has(art.id), `článek ${art.id} existuje`);
      assert.notEqual(art.published, false); // žádné drafty
    }
    for (const leg of entry.legislativa) {
      const ok = leg.kind === 'plan' ? planIds.has(leg.id) : legIds.has(leg.id);
      assert.ok(ok, `legislativa ${leg.id} (${leg.kind}) existuje`);
    }
  }
  assert.ok(out.counts.indicators_with_links > 0, 'reálná data mají vazby');
});

test('vygenerovaný data/souvislosti.json je platný JSON s očekávanou strukturou', () => {
  const disk = JSON.parse(readFileSync(resolve(ROOT, 'data/souvislosti.json'), 'utf8'));
  assert.equal(disk.version, '1.0');
  assert.ok(disk.indicators && typeof disk.indicators === 'object');
  assert.ok(disk.counts && typeof disk.counts.indicators_with_links === 'number');
});
