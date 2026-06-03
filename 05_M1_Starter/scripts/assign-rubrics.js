#!/usr/bin/env node
// assign-rubrics.js — F1 seeder pro redesign sekce Články.
//
// Přiřadí každému článku v data/articles.json pole `rubric` = id jedné z 8
// rubrik (data/rubrics.json). Rubrika = primární tematické zařazení, páteř
// nového UX hubu clanky.html. Pole `topics` zůstává beze změny (sekundární tagy).
//
// Heuristika:
//   1. Kandidáti = topics namapované na kanonické rubriky (kanonické topics
//      1:1, ostatní přes SINGLETON_MAP).
//   2. Vybere se kandidát s nejvyšší prioritou (RUBRIC_PRIORITY).
//   3. Článek bez topics → SLUG_SEED (ruční seed pro 10 článků bez tagů).
//   4. Nic z výše → fallback 'populace' + varování.
//
// Idempotentní: článek, který už `rubric` má, se NEpřepíše (pokud není --force).
// Redakce dolaďuje přímo editací `rubric` v articles.json — `rubric` je zdroj
// pravdy, skript je jen seeder.
//
// Použití:
//   node scripts/assign-rubrics.js          # zapíše do articles.json (jen chybějící)
//   node scripts/assign-rubrics.js --dry    # jen report, nezapisuje
//   node scripts/assign-rubrics.js --force  # přepíše i existující rubric

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const DRY = process.argv.includes('--dry');
const FORCE = process.argv.includes('--force');

// Mapování ne-kanonických (singleton) topics → kanonická rubrika.
const SINGLETON_MAP = {
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

// Priorita při více kandidátech (specifické obory vyhrávají nad širokými rámci).
const RUBRIC_PRIORITY = [
  'dusevni-zdravi',
  'digitalizace',
  'prevence',
  'financovani',
  'legislativa',
  'dostupnost',
  'klinika',
  'populace',
];

// Seed pro články bez topics (redakce může později přepsat editací articles.json).
const SLUG_SEED = {
  'clanek-onkologicky-koordinator-2026.html': 'klinika',
  'clanek-polypragmazie-senioru.html': 'klinika',
  'clanek-reforma-dlouhodobe-pece-2026.html': 'dostupnost',
  'clanek-centralizace-chirurgie-2027.html': 'dostupnost',
  'clanek-vzacna-onemocneni-strategie-2035.html': 'klinika',
  'clanek-reforma-primarni-pece-2027.html': 'dostupnost',
  'clanek-ai-act-zdravotnictvi-srpen-2026.html': 'digitalizace',
  'clanek-platba-statu-statni-pojistenci.html': 'financovani',
  'clanek-transplantace-darcovstvi-organu.html': 'klinika',
  'clanek-socialne-zdravotni-pomezi-2026.html': 'dostupnost',
};

function pickRubric(article, validIds) {
  // Kandidáti z topics
  const candidates = new Set();
  for (const t of article.topics ?? []) {
    if (validIds.has(t)) candidates.add(t);
    else if (SINGLETON_MAP[t]) candidates.add(SINGLETON_MAP[t]);
  }
  if (candidates.size) {
    for (const r of RUBRIC_PRIORITY) {
      if (candidates.has(r)) return { rubric: r, source: 'topics', ambiguous: candidates.size > 1 };
    }
  }
  if (SLUG_SEED[article.slug]) {
    return { rubric: SLUG_SEED[article.slug], source: 'slug-seed', ambiguous: false };
  }
  return { rubric: 'populace', source: 'fallback', ambiguous: false };
}

function main() {
  const rubricsFile = path.join(ROOT, 'data', 'rubrics.json');
  const articlesFile = path.join(ROOT, 'data', 'articles.json');

  const rubrics = JSON.parse(fs.readFileSync(rubricsFile, 'utf8')).rubrics;
  const validIds = new Set(rubrics.map(r => r.id));

  const data = JSON.parse(fs.readFileSync(articlesFile, 'utf8'));
  const articles = data.articles ?? [];

  let assigned = 0;
  let kept = 0;
  const ambiguous = [];
  const fallbacks = [];
  const dist = {};

  for (const a of articles) {
    if (a.rubric && validIds.has(a.rubric) && !FORCE) {
      kept++;
      dist[a.rubric] = (dist[a.rubric] || 0) + 1;
      continue;
    }
    const { rubric, source, ambiguous: amb } = pickRubric(a, validIds);
    a.rubric = rubric;
    assigned++;
    dist[rubric] = (dist[rubric] || 0) + 1;
    if (amb) ambiguous.push(`${a.slug} → ${rubric}  (topics: ${(a.topics || []).join(', ')})`);
    if (source === 'fallback') fallbacks.push(a.slug);
  }

  // Report
  console.log(`Rubriky: ${rubrics.length} | Články: ${articles.length}`);
  console.log(`Přiřazeno: ${assigned} | ponecháno (už mělo rubric): ${kept}`);
  console.log('\nDistribuce:');
  for (const r of rubrics) {
    console.log(`  ${String(dist[r.id] || 0).padStart(3)}  ${r.id}`);
  }
  if (ambiguous.length) {
    console.log(`\n⚠ Víceznačné (${ambiguous.length}) — redakce může upravit rubric v articles.json:`);
    for (const x of ambiguous) console.log('  · ' + x);
  }
  if (fallbacks.length) {
    console.log(`\n⚠ Fallback na 'populace' (${fallbacks.length}) — bez topics i bez slug-seedu:`);
    for (const x of fallbacks) console.log('  · ' + x);
  }

  if (DRY) {
    console.log('\n[--dry] articles.json nezměněn.');
    return;
  }
  fs.writeFileSync(articlesFile, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log('\n✓ Zapsáno do data/articles.json');
}

main();
