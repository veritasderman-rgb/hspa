// Týdenní reporting — souhrn stavu fronty za posledních 7 dní.
//
// Spočítá příspěvky podle stavu a vypíše selhání s důvodem. Výstup jde
// na stdout (workflow ho zachytí do shrnutí běhu).
//
// Vyžaduje NOTION_API_KEY, NOTION_DATABASE_ID.
//
// Spuštění:  node social/reporting/weekly-report.js [--days=7]

import { resolve } from 'node:path';
import { env } from '../config.js';
import { notionClient, resolveDataSourceId } from '../notion/client.js';
import { PROP, STATUS, plainText } from '../notion/schema.js';

export async function weeklyReport({ notion, databaseId, days = 7 }) {
  const dataSourceId = await resolveDataSourceId(notion, databaseId);
  const since = new Date(Date.now() - days * 86400_000).toISOString();

  const counts = { Draft: 0, Approved: 0, Scheduled: 0, Published: 0, Failed: 0 };
  const failures = [];
  let cursor;

  do {
    const res = await notion.dataSources.query({
      data_source_id: dataSourceId,
      start_cursor: cursor,
      filter: { timestamp: 'created_time', created_time: { on_or_after: since } },
    });
    for (const page of res.results) {
      const p = page.properties;
      const status = p[PROP.status]?.select?.name ?? 'Draft';
      if (status in counts) counts[status]++;
      if (status === STATUS.failed) {
        failures.push({
          articleId: plainText(p[PROP.articleId]),
          network: p[PROP.network]?.select?.name ?? '?',
          error: plainText(p[PROP.error]),
        });
      }
    }
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);

  return { days, counts, failures };
}

export function formatReport({ days, counts, failures }) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const lines = [
    `HSPA · Distribuce na sociální sítě — souhrn za ${days} dní`,
    '',
    `Příspěvků celkem: ${total}`,
    `  publikováno: ${counts.Published}`,
    `  naplánováno: ${counts.Scheduled}`,
    `  schváleno (čeká): ${counts.Approved}`,
    `  drafty (neschváleno): ${counts.Draft}`,
    `  selhalo: ${counts.Failed}`,
  ];
  if (failures.length) {
    lines.push('', 'Selhání:');
    for (const f of failures) lines.push(`  ✗ ${f.articleId} · ${f.network} — ${f.error || 'bez popisu'}`);
  }
  return lines.join('\n');
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  if (!env.notionKey || !env.notionDatabaseId) {
    console.error('Vyžaduje NOTION_API_KEY a NOTION_DATABASE_ID.');
    process.exit(1);
  }
  const daysArg = process.argv.find(a => a.startsWith('--days='));
  const days = daysArg ? Number(daysArg.split('=')[1]) : 7;
  try {
    const report = await weeklyReport({ notion: notionClient(), databaseId: env.notionDatabaseId, days });
    console.log(formatReport(report));
  } catch (err) {
    console.error('Chyba:', err.message);
    process.exit(1);
  }
}
