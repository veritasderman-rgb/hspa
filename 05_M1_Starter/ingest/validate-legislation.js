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

// ===== Legislativní plán MZ (plan_meta + plan_items) =====
export const REQUIRED_PLAN_META = ['usneseni', 'schvaleno', 'zdroj_nazev', 'zdroj_url'];
export const REQUIRED_PLAN_ITEM = ['id', 'nazev', 'popis', 'typ', 'plan_termin', 'stav'];
export const VALID_PLAN_TYPES = ['ustavni_zakon', 'vecny_zamer', 'zakon', 'novela_zakona', 'narizeni_vlady', 'novela_narizeni', 'vyhlaska', 'novela_vyhlasky'];
export const VALID_PLAN_STAV = ['nezahajeno', 'pripominkove_rizeni', 'vlada', 'parlament', 'sbirka', 'stazeno'];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const VEKLEP_URL_RE = /^https:\/\/odok\.cz\/portal\/veklep\//;

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
    if (item.veklep_url && !VEKLEP_URL_RE.test(item.veklep_url)) {
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

  // Legislativní plán MZ — validuj jen pokud je v datasetu přítomen.
  // `ids` je po smyčce kompletní sada id položek radaru (FK cíl pro radar_id).
  if (data.plan_meta != null || data.plan_items != null) {
    validatePlan(data, ids, errors);
  }

  return errors;
}

/**
 * Validuje sekci legislativního plánu MZ (plan_meta + plan_items).
 * Chyby přidává do sdíleného pole `errors`.
 *
 * @param {object} data — parsed dataset (očekává plan_meta a plan_items)
 * @param {Set<string>} radarIds — id všech položek radaru (data.items) pro FK radar_id
 * @param {string[]} errors — akumulátor chybových hlášek
 */
export function validatePlan(data, radarIds, errors) {
  // --- plan_meta ---
  if (data.plan_meta == null) {
    errors.push('plan_meta chybí, ačkoli plan_items je přítomen');
  } else {
    for (const f of REQUIRED_PLAN_META) {
      if (data.plan_meta[f] == null || data.plan_meta[f] === '') {
        errors.push(`plan_meta: missing required '${f}'`);
      }
    }
    if (data.plan_meta.schvaleno && !DATE_RE.test(data.plan_meta.schvaleno)) {
      errors.push(`plan_meta: schvaleno '${data.plan_meta.schvaleno}' není YYYY-MM-DD`);
    }
    if (data.plan_meta.zdroj_url && !/^https:\/\/(www\.)?vlada\.gov\.cz\//.test(data.plan_meta.zdroj_url)) {
      errors.push('plan_meta: zdroj_url musí mířit na https://vlada.gov.cz/');
    }
  }

  // --- plan_items ---
  if (!Array.isArray(data.plan_items)) {
    errors.push('plan_items must be array');
    return;
  }

  const planIds = new Set();
  for (const [i, item] of data.plan_items.entries()) {
    const tag = `plan_items[${i}] (${item.id ?? '?'})`;

    for (const f of REQUIRED_PLAN_ITEM) {
      if (item[f] == null || item[f] === '') errors.push(`${tag}: missing required '${f}'`);
    }

    if (item.id) {
      if (planIds.has(item.id)) errors.push(`${tag}: duplicate id`);
      planIds.add(item.id);
    }

    if (item.typ && !VALID_PLAN_TYPES.includes(item.typ)) errors.push(`${tag}: invalid typ '${item.typ}'`);
    if (item.stav && !VALID_PLAN_STAV.includes(item.stav)) errors.push(`${tag}: invalid stav '${item.stav}'`);

    if (item.plan_termin != null && item.plan_termin !== '' && !MONTH_RE.test(item.plan_termin)) {
      errors.push(`${tag}: plan_termin '${item.plan_termin}' není YYYY-MM`);
    }

    if (item.ria !== undefined && item.ria !== null && typeof item.ria !== 'boolean') {
      errors.push(`${tag}: ria musí být boolean nebo null`);
    }

    // veklep_url podmíněně povinné: jakmile položka opustí stav 'nezahajeno',
    // existuje k ní materiál ve VeKLEP a musí mít odkaz.
    if (item.stav && item.stav !== 'nezahajeno' && (item.veklep_url == null || item.veklep_url === '')) {
      errors.push(`${tag}: veklep_url je povinné, když stav != 'nezahajeno'`);
    }
    if (item.veklep_url != null && item.veklep_url !== '' && !VEKLEP_URL_RE.test(item.veklep_url)) {
      errors.push(`${tag}: veklep_url musí mířit na https://odok.cz/portal/veklep/`);
    }

    // FK: radar_id (pokud vyplněné) musí odkazovat na id položky radaru v témže souboru.
    if (item.radar_id != null && item.radar_id !== '') {
      if (!radarIds.has(item.radar_id)) {
        errors.push(`${tag}: radar_id '${item.radar_id}' nenalezen mezi položkami radaru (data.items)`);
      }
    }

    // zdroje (pokud přítomné) — pole objektů { nazev, url }.
    if (item.zdroje != null) {
      if (!Array.isArray(item.zdroje)) {
        errors.push(`${tag}: zdroje must be array`);
      } else {
        for (const [j, z] of item.zdroje.entries()) {
          if (!z || typeof z !== 'object') {
            errors.push(`${tag}: zdroje[${j}] musí být objekt`);
            continue;
          }
          if (!z.nazev) errors.push(`${tag}: zdroje[${j}] chybí 'nazev'`);
          if (!z.url) errors.push(`${tag}: zdroje[${j}] chybí 'url'`);
          else if (!/^https?:\/\//.test(z.url)) errors.push(`${tag}: zdroje[${j}] 'url' musí být http(s)`);
        }
      }
    }
  }
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
  const planCount = Array.isArray(data.plan_items) ? data.plan_items.length : 0;
  console.log(`OK: validated ${data.items.length} legislation items + ${planCount} plan items.`);
}

// Spusť main jen při přímém volání (ne při importu z testů)
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
