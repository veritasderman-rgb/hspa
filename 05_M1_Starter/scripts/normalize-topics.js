#!/usr/bin/env node
// normalize-topics.js — F4 úklidu taxonomie sekce Články.
//
// Sjednotí pole `topics` v data/articles.json do kanonické sady 8 tagů
// (shodných s rubrikami / TOPIC_LABELS). Long-tail singletony a nejednotná
// diakritika (`kardiovaskulární`, `úhradová politika`, `kvalita péče`…) se
// mapují přes TOPIC_NORMALIZE; výsledek se deduplikuje a doplní o rubriku
// článku (aby každý článek měl aspoň tag své rubriky).
//
// Idempotentní. Použití:
//   node scripts/normalize-topics.js --dry   # report bez zápisu
//   node scripts/normalize-topics.js         # zapíše do articles.json

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DRY = process.argv.includes('--dry');

const CANONICAL = new Set([
  'prevence', 'legislativa', 'financovani', 'dostupnost',
  'klinika', 'populace', 'dusevni-zdravi', 'digitalizace',
]);

// Long-tail / nekanonické topics → kanonický tag (zarovnáno s SINGLETON_MAP
// v assign-rubrics.js, aby topics i rubric vyprávěly stejnou taxonomii).
const TOPIC_NORMALIZE = {
  'kvalita': 'klinika',
  'kvalita péče': 'klinika',
  'reforma': 'legislativa',
  'nemocnicni-pece': 'dostupnost',
  'ekvita': 'dostupnost',
  'paliativni-pece': 'klinika',
  'hospitalizace': 'klinika',
  'rizikove-chovani': 'prevence',
  'porodnictvi': 'klinika',
  'perinatalni': 'klinika',
  'infrastruktura': 'dostupnost',
  'efektivita': 'financovani',
  'drg': 'financovani',
  'úhradová politika': 'financovani',
  'adolescenti': 'dusevni-zdravi',
  'zavislosti': 'dusevni-zdravi',
  'seniori': 'populace',
  'vakcinace': 'prevence',
  'kardiovaskulární': 'populace',
  'záchranná péče': 'dostupnost',
  'chronická nemoc': 'populace',
};

function normalize(topic) {
  if (CANONICAL.has(topic)) return topic;
  return TOPIC_NORMALIZE[topic] ?? null; // null = neznámý, vypadne
}

function main() {
  const file = path.join(ROOT, 'data', 'articles.json');
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const articles = data.articles ?? [];

  let changed = 0;
  const unknown = new Set();

  for (const a of articles) {
    const before = JSON.stringify(a.topics ?? []);
    const out = [];
    const seen = new Set();
    for (const t of a.topics ?? []) {
      const n = normalize(t);
      if (n === null) { unknown.add(t); continue; }
      if (!seen.has(n)) { seen.add(n); out.push(n); }
    }
    // Doplň rubriku jako tag (na konec), pokud chybí
    if (a.rubric && CANONICAL.has(a.rubric) && !seen.has(a.rubric)) {
      out.push(a.rubric);
    }
    a.topics = out;
    if (JSON.stringify(out) !== before) changed++;
  }

  console.log(`Články: ${articles.length} | změněno topics: ${changed}`);
  const dist = {};
  articles.forEach(a => (a.topics ?? []).forEach(t => { dist[t] = (dist[t] || 0) + 1; }));
  console.log('Kanonická distribuce topics:');
  for (const t of CANONICAL) console.log(`  ${String(dist[t] || 0).padStart(3)}  ${t}`);
  if (unknown.size) {
    console.log(`\n⚠ Neznámé topics vypuštěny (doplň do TOPIC_NORMALIZE): ${[...unknown].join(', ')}`);
  }

  if (DRY) { console.log('\n[--dry] articles.json nezměněn.'); return; }
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log('\n✓ Zapsáno do data/articles.json');
}

main();
