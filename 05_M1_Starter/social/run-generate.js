// Orchestrátor generování — týdenní běh (neděle).
//
// Detekuje nové publikované články → vygeneruje 4 shrnutí + 4 grafiky →
// zapíše drafty do Notion fronty → označí články jako zpracované.
//
// Grafika se ukládá do assets/social/<id>/ (workflow ji commitne; Vercel
// pak servíruje veřejné URL). Vyžaduje ANTHROPIC_API_KEY, NOTION_API_KEY,
// NOTION_DATABASE_ID.
//
// Spuštění:  node social/run-generate.js [--limit=N]

import { resolve } from 'node:path';
import { SITE, ROOT, env } from './config.js';
import { detectNewArticles, markProcessed } from './sources/article-detector.js';
import { generateAllSummaries } from './generators/summary-generator.js';
import { generateImages } from './generators/image-generator.js';
import { notionClient } from './notion/client.js';
import { writeDrafts } from './notion/queue-writer.js';

const MAX_PER_RUN = 12;   // pojistka proti dávkovému přetečení

function imageUrl(articleId, network) {
  return `${SITE}/assets/social/${articleId}/${network}.png`;
}

export async function runGenerate({ limit = MAX_PER_RUN } = {}) {
  for (const key of ['anthropicKey', 'notionKey', 'notionDatabaseId']) {
    if (!env[key]) throw new Error(`Chybí konfigurace: ${key} (GitHub Secret / .env.local).`);
  }

  const fresh = detectNewArticles().slice(0, limit);
  if (fresh.length === 0) {
    console.log('Žádné nové články k distribuci.');
    return { processed: [], failed: [] };
  }
  console.log(`Nových článků: ${fresh.length}`);

  const notion = notionClient();
  const processed = [];
  const failed = [];

  for (const article of fresh) {
    try {
      console.log(`\n→ ${article.id}`);
      const summaries = await generateAllSummaries(article);
      console.log(`  shrnutí: ${Object.keys(summaries).join(', ')}`);

      generateImages(article, { outDir: resolve(ROOT, 'assets/social', article.id) });
      const imageUrls = Object.fromEntries(
        ['facebook', 'instagram', 'linkedin', 'x'].map(n => [n, imageUrl(article.id, n)])
      );
      console.log('  grafika: 4 PNG → assets/social/' + article.id + '/');

      const rows = await writeDrafts({ notion, databaseId: env.notionDatabaseId, article, summaries, imageUrls });
      console.log(`  Notion: ${rows.length} draftů zapsáno`);

      markProcessed([article.id]);
      processed.push(article.id);
    } catch (err) {
      console.error(`  CHYBA u ${article.id}: ${err.message}`);
      failed.push({ id: article.id, error: err.message });
    }
  }

  console.log(`\nHotovo — zpracováno ${processed.length}, selhalo ${failed.length}.`);
  return { processed, failed };
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  const limitArg = process.argv.find(a => a.startsWith('--limit='));
  const limit = limitArg ? Number(limitArg.split('=')[1]) : MAX_PER_RUN;
  runGenerate({ limit }).catch(err => { console.error('Chyba:', err.message); process.exit(1); });
}
