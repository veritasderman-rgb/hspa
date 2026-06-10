// Orchestrátor publikace — týdenní běh (pondělí).
//
// Přečte z Notion fronty schválené příspěvky (Status=Draft, Schválit=true),
// seskupí je po článku a vloží je přímo do Buffer fronty (každá síť do svého
// kanálu). Buffer je pak publikuje podle svého rozvrhu, nebo v čas zadaný
// v poli „Naplánováno na" (scheduled_at). Řádky se posunou na
// Status=Scheduled (resp. Failed).
//
// Vyžaduje: NOTION_API_KEY, NOTION_DATABASE_ID, BUFFER_ACCESS_TOKEN a aspoň
// jeden BUFFER_PROFILE_<SÍŤ> (FACEBOOK/INSTAGRAM/LINKEDIN/X).
//
// Spuštění:  node social/run-publish.js

import { resolve } from 'node:path';
import { env, SITE } from './config.js';
import { notionClient } from './notion/client.js';
import { readApproved, markScheduled, markFailed } from './notion/queue-reader.js';
import { publishArticleToBuffer, bufferProfileMap } from './publisher/buffer-publisher.js';

export async function runPublish() {
  for (const key of ['notionKey', 'notionDatabaseId', 'bufferAccessToken']) {
    if (!env[key]) throw new Error(`Chybí konfigurace: ${key} (GitHub Secret / .env.local).`);
  }
  const profiles = bufferProfileMap();
  if (Object.keys(profiles).length === 0) {
    throw new Error('Není nastaven žádný BUFFER_PROFILE_<SÍŤ> (FACEBOOK/INSTAGRAM/…).');
  }

  const notion = notionClient();
  const rows = await readApproved({ notion, databaseId: env.notionDatabaseId });
  if (rows.length === 0) {
    console.log('Žádné schválené příspěvky ve frontě.');
    return { scheduled: [], failed: [] };
  }

  // Seskup řádky podle článku.
  const byArticle = new Map();
  for (const row of rows) {
    if (!byArticle.has(row.articleId)) byArticle.set(row.articleId, []);
    byArticle.get(row.articleId).push(row);
  }
  console.log(`Schváleno ${rows.length} příspěvků z ${byArticle.size} článků.`);
  console.log(`Buffer kanály: ${Object.keys(profiles).join(', ')}`);

  const scheduled = [];
  const failed = [];

  for (const [articleId, articleRows] of byArticle) {
    const scheduleAt = articleRows.find(r => r.scheduledFor)?.scheduledFor ?? null;
    try {
      const { sent, skipped } = await publishArticleToBuffer(articleRows, { scheduleAt, site: SITE, profiles });
      // Na Scheduled posuneme jen řádky, které se reálně do Bufferu dostaly.
      const sentNetworks = new Set(sent.map(s => s.network));
      for (const row of articleRows) {
        if (sentNetworks.has(row.network)) await markScheduled(notion, row.pageId, scheduleAt);
        else await markFailed(notion, row.pageId, 'Buffer: kanál bez profile_id (přeskočeno)');
      }
      scheduled.push(articleId);
      const skipNote = skipped.length ? ` (přeskočeno: ${skipped.map(s => s.network).join(', ')})` : '';
      console.log(`  ✓ ${articleId} → Buffer (${sent.length} kanálů)${skipNote}`);
    } catch (err) {
      for (const row of articleRows) await markFailed(notion, row.pageId, err.message);
      failed.push({ id: articleId, error: err.message });
      console.error(`  ✗ ${articleId}: ${err.message}`);
    }
  }

  console.log(`\nHotovo — naplánováno ${scheduled.length}, selhalo ${failed.length}.`);
  return { scheduled, failed };
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  runPublish().catch(err => { console.error('Chyba:', err.message); process.exit(1); });
}
