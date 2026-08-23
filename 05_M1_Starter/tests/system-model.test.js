// Testy datasetu data/system-model.json a pure helperů src/system-model.js.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { downstreamOf, edgesFor, layerNodes, splitLabel } from '../src/system-model.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const model = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'system-model.json'), 'utf8'));
const indicators = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'indicators.json'), 'utf8'));
const articles = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'articles.json'), 'utf8'));

test('system-model: validní obal a minimální rozsah', () => {
  assert.ok(model.version, 'chybí version');
  assert.ok(model.generated_at, 'chybí generated_at');
  assert.ok(Array.isArray(model.nodes) && model.nodes.length >= 20, `málo uzlů (${model.nodes?.length})`);
  assert.ok(Array.isArray(model.edges) && model.edges.length >= 30, `málo hran (${model.edges?.length})`);
});

test('system-model: uzly referencují existující indikátory a články', () => {
  const validInd = new Set(indicators.indicators.map(i => i.id));
  const validArt = new Set(articles.articles.map(a => a.slug));
  for (const n of model.nodes) {
    for (const id of n.indicators ?? []) {
      assert.ok(validInd.has(id), `node ${n.id}: indikátor '${id}' neexistuje`);
    }
    for (const slug of n.articles ?? []) {
      assert.ok(validArt.has(slug), `node ${n.id}: článek '${slug}' neexistuje`);
      assert.ok(fs.existsSync(path.join(ROOT, slug)), `node ${n.id}: soubor '${slug}' chybí`);
    }
    const evidence = (n.indicators ?? []).length + (n.articles ?? []).length;
    assert.ok(evidence > 0, `node ${n.id}: bez indikátoru i článku`);
  }
});

test('system-model: hrany spojují existující uzly, bez self-loops a duplicit', () => {
  const nodeIds = new Set(model.nodes.map(n => n.id));
  const seen = new Set();
  for (const e of model.edges) {
    assert.ok(nodeIds.has(e.from), `edge ${e.id}: from '${e.from}' není uzel`);
    assert.ok(nodeIds.has(e.to), `edge ${e.id}: to '${e.to}' není uzel`);
    assert.notEqual(e.from, e.to, `edge ${e.id}: self-loop`);
    const key = `${e.from}→${e.to}`;
    assert.ok(!seen.has(key), `duplicitní hrana ${key}`);
    seen.add(key);
  }
});

test('system-model: žádný osiřelý uzel', () => {
  const connected = new Set();
  for (const e of model.edges) { connected.add(e.from); connected.add(e.to); }
  for (const n of model.nodes) {
    assert.ok(connected.has(n.id), `node ${n.id}: bez jediné hrany`);
  }
});

test('system-model: každá páka ovlivňuje aspoň jeden výsledek (BFS downstream)', () => {
  const outcomeIds = new Set(model.nodes.filter(n => n.layer === 'Výsledky').map(n => n.id));
  for (const lever of model.nodes.filter(n => n.kind === 'lever')) {
    const ds = downstreamOf(lever.id, model.edges);
    const reachesOutcome = ds.nodes.some(id => outcomeIds.has(id));
    assert.ok(reachesOutcome, `páka ${lever.id} nedosáhne na žádný výsledek`);
  }
});

// --- pure helpery (in-memory fixtures) ---

const FIX_EDGES = [
  { id: 'ab', from: 'a', to: 'b' },
  { id: 'bc', from: 'b', to: 'c' },
  { id: 'bd', from: 'b', to: 'd' },
  { id: 'ca', from: 'c', to: 'a' }, // cyklus — BFS nesmí zacyklit
  { id: 'xz', from: 'x', to: 'z' },
];

test('downstreamOf: dosažitelné uzly + hrany, bez zacyklení', () => {
  const ds = downstreamOf('a', FIX_EDGES);
  assert.deepEqual([...ds.nodes].sort(), ['b', 'c', 'd']);
  assert.deepEqual([...ds.edges].sort(), ['ab', 'bc', 'bd', 'ca']);
  const dsLeaf = downstreamOf('d', FIX_EDGES);
  assert.equal(dsLeaf.nodes.length, 0);
});

test('edgesFor: rozdělí incoming/outgoing', () => {
  const { incoming, outgoing } = edgesFor('b', FIX_EDGES);
  assert.deepEqual(incoming.map(e => e.id), ['ab']);
  assert.deepEqual(outgoing.map(e => e.id).sort(), ['bc', 'bd']);
});

test('layerNodes: filtruje podle vrstvy', () => {
  const nodes = [
    { id: 'a', layer: 'Struktury' },
    { id: 'b', layer: 'Výsledky' },
    { id: 'c', layer: 'Struktury' },
  ];
  assert.deepEqual(layerNodes('Struktury', nodes).map(n => n.id), ['a', 'c']);
});

test('splitLabel: krátký label 1 řádek, dlouhý 2 vyvážené řádky', () => {
  assert.deepEqual(splitLabel('Prevence'), ['Prevence']);
  const two = splitLabel('Prevence a screeningy');
  assert.equal(two.length, 2);
  assert.equal(two.join(' '), 'Prevence a screeningy');
});

// --- Tři židle: perspektivy rolí + konfliktní hrany (PLAN-TRI-ZIDLE.md) ---
import { PERSPECTIVE_ROLES, perspectiveFor, fogNodesFor, conflictEdges } from '../src/system-model.js';

test('perspektivy: každý uzel nese pohled všech tří rolí s validní visibility', () => {
  for (const n of model.nodes) {
    for (const role of PERSPECTIVE_ROLES) {
      const p = perspectiveFor(n, role);
      assert.ok(p, `node ${n.id}: chybí perspektiva ${role}`);
      assert.ok(['clear', 'fog'].includes(p.visibility), `node ${n.id}/${role}: visibility '${p.visibility}'`);
      assert.ok(p.alt_label?.length > 2, `node ${n.id}/${role}: alt_label`);
      assert.ok(p.note?.length > 20, `node ${n.id}/${role}: note příliš krátká`);
    }
  }
});

test('perspektivy: každá role má i mlhu, i jasno (jinak přepínač nic neukáže)', () => {
  for (const role of PERSPECTIVE_ROLES) {
    const fog = fogNodesFor(role, model.nodes);
    assert.ok(fog.length >= 3, `${role}: příliš málo fog uzlů (${fog.length})`);
    assert.ok(fog.length <= model.nodes.length - 3, `${role}: skoro vše v mlze`);
  }
});

test('perspektivy: výsledková vrstva je pointa — z žádné židle není celá jasně vidět', () => {
  const outcomes = model.nodes.filter(n => n.layer === 'Výsledky');
  for (const role of PERSPECTIVE_ROLES) {
    const fogged = outcomes.filter(n => perspectiveFor(n, role).visibility === 'fog');
    assert.ok(fogged.length >= 1, `${role}: vidí celou výsledkovou vrstvu — pointa mlhy se ztrácí`);
  }
});

test('konflikty: označené hrany existují, mají poznámku a je jich rozumně', () => {
  const conflicts = conflictEdges(model.edges);
  assert.ok(conflicts.length >= 4 && conflicts.length <= 12, `počet konfliktů ${conflicts.length}`);
  for (const e of conflicts) {
    assert.ok(e.conflict_note?.length > 30, `${e.id}: conflict_note chybí/krátká`);
  }
});

test('rozhoduje: páky nesou „kdo o tom rozhoduje" a interní odkazy existují', () => {
  const levers = model.nodes.filter(n => n.kind === 'lever');
  const sRozhoduje = levers.filter(n => n.rozhoduje?.length);
  assert.ok(sRozhoduje.length >= 10, `podezřele málo pák s polem rozhoduje (${sRozhoduje.length}/${levers.length})`);
  for (const n of model.nodes) {
    for (const r of n.rozhoduje ?? []) {
      assert.ok(r.kdo, `${n.id}: rozhoduje bez kdo`);
      if (r.url && !/^https?:/.test(r.url)) {
        const file = r.url.split('?')[0];
        assert.ok(fs.existsSync(path.join(ROOT, file)), `${n.id}: cíl ${file} v repu není`);
      }
    }
  }
});
