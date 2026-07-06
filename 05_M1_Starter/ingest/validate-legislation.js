// Validace data/legislativa.json (Legislativní radar — VeKLEP).
// Spouštěj v CI před deployem: node ingest/validate-legislation.js
// Součást `npm run validate:all`.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

export const REQUIRED = ['id', 'veklep_id', 'title', 'title_short', 'type', 'submitter', 'phase', 'veklep_status', 'veklep_url', 'annotation'];
export const VALID_TYPES = ['zakon', 'vyhlaska', 'narizeni_vlady'];
export const VALID_PHASES = ['pripominky', 'vyporadani', 'vlada', 'parlament', 'dokonceno'];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Validuje obsah datasetu legislativy. Vrací pole chybových hlášek
 * (prázdné = validní). Exportováno pro testy.
 *
 * @param {object} data — parsed data/legislativa.json
 * @param {{indicatorIds?: Set<string>, articleIds?: Set<string>}} refs — foreign keys pro cross-link kontrolu
 */
export function validateLegislation(data, refs = {}) {
  const errors = [];
  const { indicatorIds, articleIds } = refs;

  if (!data.version) errors.push('Missing version');
  if (!data.generated_at) errors.push('Missing generated_at');
  if (!Array.isArray(data.items)) {
    errors.push('items must be array');
    return errors;
  }

  const ids = new Set();
  const veklepIds = new Set();

  for (const [i, item] of data.items.entries()) {
    const tag = `legislation[${i}] (${item.id ?? '?'})`;
    for (const f of REQUIRED) {
      if (item[f] == null || item[f] === '') errors.push(`${tag}: missing required '${f}'`);
    }
    if (item.id) {
      if (ids.has(item.id)) errors.push(`${tag}: duplicate id`);
      ids.add(item.id);
    }
    if (item.veklep_id) {
      if (veklepIds.has(item.veklep_id)) errors.push(`${tag}: duplicate veklep_id`);
      veklepIds.add(item.veklep_id);
    }
    if (item.type && !VALID_TYPES.includes(item.type)) errors.push(`${tag}: invalid type '${item.type}'`);
    if (item.phase && !VALID_PHASES.includes(item.phase)) errors.push(`${tag}: invalid phase '${item.phase}'`);
    if (item.veklep_url && !/^https:\/\/odok\.cz\/portal\/veklep\//.test(item.veklep_url)) {
      errors.push(`${tag}: veklep_url musí mířit na https://odok.cz/portal/veklep/`);
    }
    for (const key of ['authorized', 'last_change', 'comments_until']) {
      const v = item.dates?.[key];
      if (v != null && !DATE_RE.test(v)) errors.push(`${tag}: dates.${key} '${v}' není YYYY-MM-DD`);
    }
    if (item.verified_at && !DATE_RE.test(item.verified_at)) {
      errors.push(`${tag}: verified_at '${item.verified_at}' není YYYY-MM-DD`);
    }
    if (item.linked_indicators != null) {
      if (!Array.isArray(item.linked_indicators)) errors.push(`${tag}: linked_indicators must be array`);
      else if (indicatorIds?.size) {
        for (const id of item.linked_indicators) {
          if (!indicatorIds.has(id)) errors.push(`${tag}: linked_indicator '${id}' nenalezen v data/indicators.json`);
        }
      }
    }
    if (item.linked_articles != null) {
      if (!Array.isArray(item.linked_articles)) errors.push(`${tag}: linked_articles must be array`);
      else if (articleIds?.size) {
        for (const id of item.linked_articles) {
          if (!articleIds.has(id)) errors.push(`${tag}: linked_article '${id}' nenalezen v data/articles.json`);
        }
      }
    }
  }

  return errors;
}

function main() {
  const file = path.join(ROOT, 'data', 'legislativa.json');
  if (!fs.existsSync(file)) {
    console.error('FAIL: data/legislativa.json not found');
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(file, 'utf8'));

  // Foreign keys: indikátory + články
  const indicatorIds = new Set();
  const indicatorsFile = path.join(ROOT, 'data', 'indicators.json');
  if (fs.existsSync(indicatorsFile)) {
    const inds = JSON.parse(fs.readFileSync(indicatorsFile, 'utf8'));
    for (const i of inds.indicators ?? []) indicatorIds.add(i.id);
  }
  const articleIds = new Set();
  const articlesFile = path.join(ROOT, 'data', 'articles.json');
  if (fs.existsSync(articlesFile)) {
    const arts = JSON.parse(fs.readFileSync(articlesFile, 'utf8'));
    for (const a of arts.articles ?? []) articleIds.add(a.id);
  }

  const errors = validateLegislation(data, { indicatorIds, articleIds });

  if (errors.length) {
    console.error(`FAIL: ${errors.length} validation error(s):`);
    errors.forEach(e => console.error('  -', e));
    process.exit(1);
  }
  console.log(`OK: validated ${data.items.length} legislation items.`);
}

// Spusť main jen při přímém volání (ne při importu z testů)
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
