// Orchestrátor publikace — týdenní běh (pondělí).
//
// Přečte z Notion fronty schválené příspěvky (Status=Draft, Schválit=true),
// seskupí je po článku, odešle na Make.com webhook a posune řádky na
// Status=Scheduled (resp. Failed). Termín publikace řídí pole
// "Naplánováno na" nastavené redakcí při schvalování.
//
// Vyžaduje NOTION_API_KEY, NOTION_DATABASE_ID, MAKE_WEBHOOK_URL.
//
// Spuštění:  node social/run-publish.js

import { resolve } from 'node:path';
import { env } from './config.js';
import { notionClient } from './notion/client.js';
import { readApproved, markScheduled, markFailed } from './notion/queue-reader.js';
import { buildMakePayload, sendToMake } from './publisher/webhook-publisher.js';

export async function runPublish() {
  for (const key of ['notionKey', 'notionDatabaseId', 'makeWebhookUrl']) {
    if (!env[key]) throw new Error(`Chybí konfigurace: ${key} (GitHub Secret / .env.local).`);
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

  const scheduled = [];
  const failed = [];

  for (const [articleId, articleRows] of byArticle) {
    const scheduleAt = articleRows.find(r => r.scheduledFor)?.scheduledFor ?? null;
    const payload = buildMakePayload(articleId, articleRows, { scheduleAt });
    try {
      await sendToMake(payload);
      for (const row of articleRows) await markScheduled(notion, row.pageId, scheduleAt);
      scheduled.push(articleId);
      console.log(`  ✓ ${articleId} → Make.com (${articleRows.length} sítí)`);
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
