// Čtení schválených příspěvků z Notion fronty + aktualizace stavu.

import { resolveDataSourceId } from './client.js';
import { PROP, STATUS, NETWORK_KEY, plainText } from './schema.js';

/** Příspěvky se Status=Draft a Schválit=true — připravené k naplánování. */
export async function readApproved({ notion, databaseId }) {
  const dataSourceId = await resolveDataSourceId(notion, databaseId);
  const rows = [];
  let cursor;

  do {
    const res = await notion.dataSources.query({
      data_source_id: dataSourceId,
      start_cursor: cursor,
      filter: {
        and: [
          { property: PROP.status, select: { equals: STATUS.draft } },
          { property: PROP.approved, checkbox: { equals: true } },
        ],
      },
    });
    for (const page of res.results) {
      const p = page.properties;
      const networkLabel = p[PROP.network]?.select?.name ?? '';
      rows.push({
        pageId: page.id,
        articleId: plainText(p[PROP.articleId]),
        network: NETWORK_KEY[networkLabel] ?? networkLabel.toLowerCase(),
        networkLabel,
        text: plainText(p[PROP.text]),
        imageUrl: p[PROP.imageUrl]?.url ?? null,
        articleUrl: p[PROP.articleUrl]?.url ?? null,
        scheduledFor: p[PROP.scheduledFor]?.date?.start ?? null,
      });
    }
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);

  return rows;
}

/** Posune řádek na Status=Scheduled (volitelně doplní datum). */
export async function markScheduled(notion, pageId, scheduledFor = null) {
  const properties = { [PROP.status]: { select: { name: STATUS.scheduled } } };
  if (scheduledFor) properties[PROP.scheduledFor] = { date: { start: scheduledFor } };
  await notion.pages.update({ page_id: pageId, properties });
}

/** Označí řádek jako publikovaný. */
export async function markPublished(notion, pageId, publishedAt = new Date().toISOString()) {
  await notion.pages.update({
    page_id: pageId,
    properties: {
      [PROP.status]: { select: { name: STATUS.published } },
      [PROP.publishedAt]: { date: { start: publishedAt } },
    },
  });
}

/** Označí řádek jako selhaný a zapíše důvod. */
export async function markFailed(notion, pageId, errorMessage) {
  await notion.pages.update({
    page_id: pageId,
    properties: {
      [PROP.status]: { select: { name: STATUS.failed } },
      [PROP.error]: { rich_text: [{ text: { content: String(errorMessage).slice(0, 1900) } }] },
    },
  });
}
