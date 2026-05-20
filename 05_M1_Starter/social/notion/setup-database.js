// Jednorázový setup — vytvoří v Notionu databázi "Social Posts Queue".
//
// Příprava (Fáze 0):
//   1. V Notionu vytvoř interní integraci → zkopíruj NOTION_API_KEY
//   2. Vytvoř prázdnou stránku, kam databáze patří, a sdílej ji s integrací
//   3. Zkopíruj ID té stránky (32 znaků z URL)
//
// Spuštění:
//   NOTION_API_KEY=… node social/notion/setup-database.js <parent-page-id>
//
// Výstup: ID databáze → vlož do GitHub Secret NOTION_DATABASE_ID.

import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { notionClient } from './client.js';
import { DB_TITLE, databaseProperties } from './schema.js';

/** Vytvoří databázi fronty pod danou stránkou. Vrací { databaseId, dataSourceId }. */
export async function createQueueDatabase(notion, parentPageId) {
  const db = await notion.databases.create({
    parent: { type: 'page_id', page_id: parentPageId },
    title: [{ text: { content: DB_TITLE } }],
    initial_data_source: { properties: databaseProperties() },
  });
  return { databaseId: db.id, dataSourceId: db.data_sources?.[0]?.id ?? null };
}

// --- CLI -------------------------------------------------------------------

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  const parentPageId = process.argv[2];
  if (!parentPageId) {
    console.error('Použití: NOTION_API_KEY=… node social/notion/setup-database.js <parent-page-id>');
    process.exit(1);
  }
  try {
    const { databaseId, dataSourceId } = await createQueueDatabase(notionClient(), parentPageId);
    console.log('Databáze vytvořena.');
    console.log(`  NOTION_DATABASE_ID = ${databaseId}`);
    console.log(`  (data source ${dataSourceId})`);
    console.log('\nVlož NOTION_DATABASE_ID do GitHub Secrets.');
  } catch (err) {
    console.error('Chyba:', err.message);
    process.exit(1);
  }
}
