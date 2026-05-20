// Schéma fronty "Social Posts Queue" v Notionu + pomocné funkce.

export const DB_TITLE = 'HSPA · Social Posts Queue';

// Názvy properties (jeden zdroj pravdy pro writer i reader).
export const PROP = {
  name: 'Příspěvek',          // title
  articleId: 'Article ID',
  network: 'Síť',
  status: 'Status',
  approved: 'Schválit',
  scheduledFor: 'Naplánováno na',
  text: 'Text příspěvku',
  imageUrl: 'Obrázek (URL)',
  articleUrl: 'Odkaz na článek',
  publishedAt: 'Publikováno',
  error: 'Chyba',
};

export const STATUS = {
  draft: 'Draft', approved: 'Approved', scheduled: 'Scheduled',
  published: 'Published', failed: 'Failed',
};

export const NETWORK_LABEL = {
  facebook: 'Facebook', instagram: 'Instagram', linkedin: 'LinkedIn', x: 'X',
};
// Zpětné mapování label → klíč.
export const NETWORK_KEY = Object.fromEntries(
  Object.entries(NETWORK_LABEL).map(([k, v]) => [v, k])
);

/** Definice properties pro vytvoření data source (setup-database.js). */
export function databaseProperties() {
  return {
    [PROP.name]: { title: {} },
    [PROP.articleId]: { rich_text: {} },
    [PROP.network]: { select: { options: [
      { name: 'Facebook', color: 'blue' },
      { name: 'Instagram', color: 'pink' },
      { name: 'LinkedIn', color: 'blue' },
      { name: 'X', color: 'default' },
    ] } },
    [PROP.status]: { select: { options: [
      { name: 'Draft', color: 'gray' },
      { name: 'Approved', color: 'green' },
      { name: 'Scheduled', color: 'yellow' },
      { name: 'Published', color: 'blue' },
      { name: 'Failed', color: 'red' },
    ] } },
    [PROP.approved]: { checkbox: {} },
    [PROP.scheduledFor]: { date: {} },
    [PROP.text]: { rich_text: {} },
    [PROP.imageUrl]: { url: {} },
    [PROP.articleUrl]: { url: {} },
    [PROP.publishedAt]: { date: {} },
    [PROP.error]: { rich_text: {} },
  };
}

/** Rozdělí text na rich_text objekty po max. 2000 znacích (limit Notionu). */
export function richText(s) {
  const out = [];
  let rest = String(s ?? '');
  while (rest.length > 2000) {
    out.push({ text: { content: rest.slice(0, 2000) } });
    rest = rest.slice(2000);
  }
  if (rest || out.length === 0) out.push({ text: { content: rest } });
  return out;
}

/** Spojí rich_text property zpět na čistý text. */
export function plainText(prop) {
  return (prop?.rich_text ?? []).map(t => t.plain_text ?? '').join('');
}
