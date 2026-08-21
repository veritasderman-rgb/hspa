// FÁZE 1 — síť: bipartitní graf osoba↔skupina, projekce skupina–skupina
// (váha = sdílení členové), centrality osob (degree + betweenness přes
// Brandesův algoritmus na bipartitním grafu).
// Vstup: source/ppo_clenove.csv  ·  Výstup: out/sit.json
// Spuštění: node ingest/ppo/build-sit.js

import { readCsv, writeOut, classifyAffiliation } from './lib.js';

const clenove = readCsv('ppo_clenove.csv');

// Afiliace na osobu → příznak úředníka ministerstva (pro filtr žebříčků)
const affByPerson = new Map();
for (const c of clenove) {
  const pid = 'p' + c.person_id;
  affByPerson.set(pid, (affByPerson.get(pid) || '') + ' ; ' + (c.affiliation || ''));
}
const isUrednik = pid => {
  const cat = classifyAffiliation(affByPerson.get(pid) || '');
  return cat === 'mz_urednik' || cat === 'jine_ministerstvo';
};

// uzly: 'p123' osoba, 'g45' skupina
const adj = new Map();
const names = new Map();
const addEdge = (a, b) => {
  if (!adj.has(a)) adj.set(a, new Set());
  if (!adj.has(b)) adj.set(b, new Set());
  adj.get(a).add(b); adj.get(b).add(a);
};
for (const c of clenove) {
  if (c.role === 'Hosté') continue; // hosté nejsou vazba
  const p = 'p' + c.person_id, g = 'g' + c.group_id;
  addEdge(p, g);
  names.set(p, c.person_name); names.set(g, c.group_name);
}

/* ---- projekce skupina–skupina: sdílení členové ---- */
const shared = new Map(); // 'g1|g2' -> Set(person)
for (const [node, nbrs] of adj) {
  if (!node.startsWith('p')) continue;
  const gs = [...nbrs].sort();
  for (let i = 0; i < gs.length; i++)
    for (let j = i + 1; j < gs.length; j++) {
      const key = gs[i] + '|' + gs[j];
      if (!shared.has(key)) shared.set(key, []);
      shared.get(key).push(node);
    }
}

/* ---- Brandes betweenness na bipartitním grafu ---- */
const nodes = [...adj.keys()];
const bc = new Map(nodes.map(n => [n, 0]));
for (const s of nodes) {
  const stack = [], pred = new Map(), sigma = new Map(), dist = new Map();
  for (const v of nodes) { pred.set(v, []); sigma.set(v, 0); dist.set(v, -1); }
  sigma.set(s, 1); dist.set(s, 0);
  const queue = [s];
  while (queue.length) {
    const v = queue.shift(); stack.push(v);
    for (const w of adj.get(v)) {
      if (dist.get(w) < 0) { dist.set(w, dist.get(v) + 1); queue.push(w); }
      if (dist.get(w) === dist.get(v) + 1) {
        sigma.set(w, sigma.get(w) + sigma.get(v));
        pred.get(w).push(v);
      }
    }
  }
  const delta = new Map(nodes.map(n => [n, 0]));
  while (stack.length) {
    const w = stack.pop();
    for (const v of pred.get(w))
      delta.set(v, delta.get(v) + (sigma.get(v) / sigma.get(w)) * (1 + delta.get(w)));
    if (w !== s) bc.set(w, bc.get(w) + delta.get(w));
  }
}
const maxBc = Math.max(...[...bc.entries()].filter(([n]) => n.startsWith('p')).map(([, v]) => v)) || 1;

/* ---- výstup ---- */
const skupinyNodes = nodes.filter(n => n.startsWith('g')).map(n => ({
  id: Number(n.slice(1)), typ: 'skupina', nazev: names.get(n),
  stupen: adj.get(n).size,
}));
const osobyNodes = nodes.filter(n => n.startsWith('p')).map(n => ({
  id: Number(n.slice(1)), typ: 'osoba', jmeno: names.get(n),
  stupen: adj.get(n).size,
  betweenness: Math.round((bc.get(n) / maxBc) * 1000) / 1000,
  urednik_ministerstva: isUrednik(n),
})).sort((a, b) => b.betweenness - a.betweenness);

const hrany = [...shared.entries()].map(([key, people]) => {
  const [a, b] = key.split('|');
  return { a: Number(a.slice(1)), b: Number(b.slice(1)),
           vaha: people.length,
           osoby: people.slice(0, 12).map(p => Number(p.slice(1))) };
}).sort((x, y) => y.vaha - x.vaha);

writeOut('sit.json', {
  version: '1.0',
  pozn: 'Hosté vynecháni. betweenness normalizovaná na max=1 (bipartitní graf).',
  skupiny: skupinyNodes,
  osoby_top: osobyNodes.slice(0, 200),
  hrany_skupina_skupina: hrany,
});
console.log(`uzly: ${skupinyNodes.length} skupin + ${osobyNodes.length} osob; hran g–g: ${hrany.length}`);
console.log('TOP betweenness:', osobyNodes.slice(0, 5).map(o => `${o.jmeno} (${o.betweenness})`).join(' | '));
