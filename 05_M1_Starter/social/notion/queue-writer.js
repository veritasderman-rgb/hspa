// Zápis vygenerovaných příspěvků do Notion fronty jako Draft řádky.
//
// Každý článek → 4 řádky (jeden na síť), Status=Draft, Schválit=false.
// Redakce v Notionu zaškrtne "Schválit"; queue-reader.js je pak vyzvedne.

import { resolveDataSourceId } from './client.js';
import { PROP, STATUS, NETWORK_LABEL, richText } from './schema.js';

/**
 * @param {object}  opts
 * @param {Client}  opts.notion
 * @param {string}  opts.databaseId
 * @param {object}  opts.article      — Article (id, title, url)
 * @param {object}  opts.summaries    — { facebook:{text}, instagram:{text}, … }
 * @param {object} [opts.imageUrls]   — { facebook:'https://…', … } veřejné URL
 * @param {string} [opts.scheduledFor]— 'YYYY-MM-DD'
 * @returns {Promise<Array<{network:string,pageId:string}>>}
 */
export async function writeDrafts({ notion, databaseId, article, summaries, imageUrls = {}, scheduledFor = null }) {
  const dataSourceId = await resolveDataSourceId(notion, databaseId);
  const created = [];

  for (const [network, summary] of Object.entries(summaries)) {
    const props = {
      [PROP.name]: { title: richText(`${article.title} — ${NETWORK_LABEL[network] ?? network}`) },
      [PROP.articleId]: { rich_text: richText(article.id) },
      [PROP.network]: { select: { name: NETWORK_LABEL[network] ?? network } },
      [PROP.status]: { select: { name: STATUS.draft } },
      [PROP.approved]: { checkbox: false },
      [PROP.text]: { rich_text: richText(summary.text ?? '') },
      [PROP.articleUrl]: { url: article.url || null },
    };
    if (imageUrls[network]) props[PROP.imageUrl] = { url: imageUrls[network] };
    if (scheduledFor) props[PROP.scheduledFor] = { date: { start: scheduledFor } };

    const page = await notion.pages.create({
      parent: { type: 'data_source_id', data_source_id: dataSourceId },
      properties: props,
    });
    created.push({ network, pageId: page.id });
  }
  return created;
}
