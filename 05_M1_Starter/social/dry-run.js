// Dry-run distribučního pipeline — detekce + generování shrnutí, zápis do
// social/out/. Nic neodesílá na sítě ani do Notionu.
//
// Použití:
//   node social/dry-run.js                      — první nový článek (vs. state)
//   node social/dry-run.js --article-id=<id>     — konkrétní viditelný článek
//   node social/dry-run.js --latest             — nejnovější viditelný článek
//
// Bez ANTHROPIC_API_KEY proběhne jen detekce (vypíše Article, negeneruje).

import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectNewArticles, listVisibleArticles } from './sources/article-detector.js';
import { generateAllSummaries } from './generators/summary-generator.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, 'out');

function pickArticle(args) {
  const idArg = [...args].find(a => a.startsWith('--article-id='));
  if (idArg) {
    const id = idArg.slice('--article-id='.length);
    const a = listVisibleArticles().find(x => x.id === id);
    if (!a) throw new Error(`Článek "${id}" nenalezen mezi viditelnými.`);
    return a;
  }
  if (args.has('--latest')) {
    const all = listVisibleArticles();
    if (!all.length) throw new Error('Žádné viditelné články.');
    return all.slice().sort((a, b) => String(b.date).localeCompare(String(a.date)))[0];
  }
  const fresh = detectNewArticles();
  if (!fresh.length) {
    throw new Error('Žádné nové články (vs. state). Použij --latest nebo --article-id=<id>.');
  }
  return fresh[0];
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const article = pickArticle(args);

  console.log(`Článek:  ${article.id}`);
  console.log(`Titulek: ${article.title}`);
  console.log(`URL:     ${article.url}`);
  console.log(`Data:    ${article.keyStats.length} keyStats · ${article.linkedIndicators.length} indikátorů · ${article.fullText.length} znaků textu\n`);

  if (!process.env.ANTHROPIC_API_KEY) {
    console.log('ANTHROPIC_API_KEY není nastaven — generování přeskočeno.');
    console.log('Nastav ho v .env.local nebo GitHub Secrets a spusť znovu.');
    return;
  }

  console.log('Generuji 4 verze přes Anthropic API…\n');
  const summaries = await generateAllSummaries(article);

  const dir = resolve(OUT_DIR, article.id);
  mkdirSync(dir, { recursive: true });

  let inTok = 0, cacheRead = 0, outTok = 0;
  for (const r of Object.values(summaries)) {
    writeFileSync(resolve(dir, `${r.network}.txt`), r.text + '\n');
    inTok += r.usage?.input_tokens ?? 0;
    cacheRead += r.usage?.cache_read_input_tokens ?? 0;
    outTok += r.usage?.output_tokens ?? 0;
    console.log(`${'─'.repeat(60)}\n${r.label}  (${r.text.length} znaků)\n${'─'.repeat(60)}\n${r.text}\n`);
  }

  writeFileSync(resolve(dir, 'meta.json'), JSON.stringify({
    article: { id: article.id, title: article.title, url: article.url },
    generated_at: new Date().toISOString(),
    networks: Object.fromEntries(Object.entries(summaries).map(([k, v]) => [k, { chars: v.text.length, usage: v.usage }])),
  }, null, 2) + '\n');

  console.log(`Zapsáno do social/out/${article.id}/`);
  console.log(`Tokeny: vstup ${inTok} · z cache ${cacheRead} · výstup ${outTok}`);
}

main().catch(err => { console.error('Chyba:', err.message); process.exit(1); });
