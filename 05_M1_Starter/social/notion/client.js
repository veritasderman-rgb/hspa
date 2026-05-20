// Notion klient + rozlišení data source ID.
//
// @notionhq/client v5 pracuje s modelem "data sources": databáze je
// kontejner, řádky se zakládají a dotazují přes data source.

import { Client } from '@notionhq/client';
import { env } from '../config.js';

/** Vytvoří Notion klienta. Vyhodí chybu, pokud chybí NOTION_API_KEY. */
export function notionClient() {
  if (!env.notionKey) {
    throw new Error('NOTION_API_KEY není nastaven (GitHub Secret nebo .env.local).');
  }
  return new Client({ auth: env.notionKey });
}

/** Z ID databáze získá ID jejího (prvního) data source. */
export async function resolveDataSourceId(notion, databaseId) {
  const db = await notion.databases.retrieve({ database_id: databaseId });
  const id = db.data_sources?.[0]?.id;
  if (!id) throw new Error(`Databáze ${databaseId} nemá žádný data source.`);
  return id;
}
