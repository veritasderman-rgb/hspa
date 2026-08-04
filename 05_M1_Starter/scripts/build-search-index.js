// Build fulltextového indexu článků → data/search-index.json.
//
//   node scripts/build-search-index.js          # zapíše index
//   node scripts/build-search-index.js --dry    # jen statistika, nic nezapíše
//
// Proč: overlay vyhledávání i hub search hledaly jen v title/perex/tag —
// dotaz vyskytující se až v těle článku text nenašel (výňatkové hledání,
// ne fulltext). Tento skript při publikaci (workflow publish-articles.yml)
// vytáhne z každého publikovaného clanek-*.html CELÝ normalizovaný text
// a uloží ho do jednoho lazy-load JSON.
//
// Zásady:
//   - Jen publikované články s date <= dnešek (drafty a plánované texty
//     nesmí přes index uniknout před vydáním). Klientská 06:00 viditelnost
//     se řeší v search.js průnikem se seznamem viditelných článků.
//   - Text = obsah <article> bez <script>/<style>/<aside>, tagy pryč,
//     HTML entity dekódované, whitespace sbalený. Původní velikost písmen
//     (klient si lowercase verzi zderivuje jednou při načtení).
//   - Deterministický: pořadí = pořadí v articles.json.
//
// Odhad velikosti: ~200 článků × 8–15 kB ≈ 2–3 MB raw (gzip ~0,7–1 MB);
// fetchuje se lazy až při prvním hledání. Při 500+ článcích rozdělit na
// shardy po rocích (viz PLAN-PREHLEDNOST-OBJEVITELNOST.md §3c).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeGeneratedJson } from './lib/write-generated.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DRY = process.argv.includes('--dry');

const ENTITIES = {
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'",
  '&nbsp;': ' ', '&ndash;': '–', '&mdash;': '—', '&hellip;': '…',
  '&rarr;': '→', '&larr;': '←', '&shy;': '',
};

/**
 * Vytáhne normalizovaný čistý text z HTML článku.
 * @param {string} html — celý soubor clanek-*.html
 * @returns {string} text bez markupu, sbalený whitespace
 */
export function extractArticleText(html) {
  // Obsah <article> (long-form tělo); fallback <main>; jinak celé HTML
  const articleMatch = /<article[^>]*>([\s\S]*?)<\/article>/i.exec(html);
  const mainMatch = /<main[^>]*>([\s\S]*?)<\/main>/i.exec(html);
  let text = articleMatch?.[1] ?? mainMatch?.[1] ?? html;

  text = text
    // Neobsahové bloky pryč (skripty, styly, SVG data, interní poznámky)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    // Blokové tagy → mezera (ať se slova neslepí), pak všechny tagy pryč
    .replace(/<[^>]+>/g, ' ');

  for (const [ent, ch] of Object.entries(ENTITIES)) {
    text = text.split(ent).join(ch);
  }
  // Číselné entity
  text = text.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
  text = text.replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));

  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Sestaví index. Exportováno kvůli testům.
 * @param {{articles: Array}} articlesData
 * @param {(slug: string) => string|null} readHtml — vrací HTML souboru, nebo null
 * @param {Date} now
 */
export function buildSearchIndex(articlesData, readHtml, now = new Date()) {
  const today = now.toISOString().slice(0, 10);
  const entries = [];
  for (const a of articlesData.articles ?? []) {
    if (a.published === false) continue;
    if (a.date && a.date > today) continue; // plánovaný text neuniká předem
    const html = readHtml(a.slug);
    if (!html) continue;
    const text = extractArticleText(html);
    if (!text) continue;
    entries.push({ slug: a.slug, text });
  }
  return {
    version: '1.0',
    generated_at: now.toISOString(),
    count: entries.length,
    entries,
  };
}

function main() {
  const articlesData = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'articles.json'), 'utf8'));
  const index = buildSearchIndex(articlesData, (slug) => {
    const file = path.join(ROOT, slug);
    return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
  });

  const sizeKb = Math.round(JSON.stringify(index).length / 1024);
  console.log(`search-index: ${index.count} článků, ${sizeKb} kB raw`);

  if (!DRY) {
    const written = writeGeneratedJson(path.join(ROOT, 'data', 'search-index.json'), index);
    console.log(written ? 'data/search-index.json zapsáno.' : 'data/search-index.json beze změny.');
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
