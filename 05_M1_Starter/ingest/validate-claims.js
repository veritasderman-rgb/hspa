// Validace data/claims.json (registr kvantitativních tvrzení, PLAN-CLAIMS.md).
// Spouštěj v CI před deployem: node ingest/validate-claims.js

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const REQUIRED = ['id', 'article', 'quote', 'metric', 'value', 'unit', 'location', 'relation', 'check'];
const VALID_LOCATIONS = ['prose', 'counter', 'databox', 'perex'];
const VALID_RELATIONS = ['exact', 'derived', 'related', 'external'];
const VALID_CHECKS = ['auto', 'manual', 'none'];

function validate() {
  const file = path.join(ROOT, 'data', 'claims.json');
  if (!fs.existsSync(file)) {
    console.error('FAIL: data/claims.json not found');
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const errors = [];

  if (!data.version) errors.push('Missing version');
  if (!data.generated_at) errors.push('Missing generated_at');
  if (!Array.isArray(data.claims)) errors.push('claims must be array');
  if (errors.length) {
    console.error(`FAIL: ${errors.length} validation error(s):`);
    errors.forEach(e => console.error('  -', e));
    process.exit(1);
  }

  const indicatorsFile = path.join(ROOT, 'data', 'indicators.json');
  const validIndicatorIds = new Set();
  if (fs.existsSync(indicatorsFile)) {
    const inds = JSON.parse(fs.readFileSync(indicatorsFile, 'utf8'));
    for (const i of inds.indicators ?? []) validIndicatorIds.add(i.id);
  }
  const articlesFile = path.join(ROOT, 'data', 'articles.json');
  const validArticleSlugs = new Set();
  if (fs.existsSync(articlesFile)) {
    const arts = JSON.parse(fs.readFileSync(articlesFile, 'utf8'));
    for (const a of arts.articles ?? []) validArticleSlugs.add(a.slug);
  }

  const ids = new Set();
  for (const [i, c] of data.claims.entries()) {
    const tag = `claim[${i}] (${c.id ?? '?'})`;
    for (const f of REQUIRED) {
      if (c[f] == null) errors.push(`${tag}: missing required '${f}'`);
    }
    if (c.id) {
      if (ids.has(c.id)) errors.push(`${tag}: duplicate id`);
      ids.add(c.id);
    }
    if (c.article) {
      if (validArticleSlugs.size && !validArticleSlugs.has(c.article)) {
        errors.push(`${tag}: article '${c.article}' nenalezen v data/articles.json`);
      }
      if (!fs.existsSync(path.join(ROOT, c.article))) {
        errors.push(`${tag}: soubor '${c.article}' neexistuje`);
      }
    }
    if (c.value != null && typeof c.value !== 'number') errors.push(`${tag}: value must be number`);
    if (c.quote && c.quote.length > 260) errors.push(`${tag}: quote přes 260 znaků`);
    if (c.location && !VALID_LOCATIONS.includes(c.location)) errors.push(`${tag}: invalid location '${c.location}'`);
    if (c.relation && !VALID_RELATIONS.includes(c.relation)) errors.push(`${tag}: invalid relation '${c.relation}'`);
    if (c.check && !VALID_CHECKS.includes(c.check)) errors.push(`${tag}: invalid check '${c.check}'`);
    if (c.indicator_id && validIndicatorIds.size && !validIndicatorIds.has(c.indicator_id)) {
      errors.push(`${tag}: indicator_id '${c.indicator_id}' nenalezen v data/indicators.json`);
    }
    // Invariant registru: strojová kontrola jen pro přímé citace hodnoty indikátoru.
    if (c.check === 'auto' && (c.relation !== 'exact' || !c.indicator_id)) {
      errors.push(`${tag}: check=auto vyžaduje relation=exact a indicator_id`);
    }
    if (c.tolerance_pct != null && (typeof c.tolerance_pct !== 'number' || c.tolerance_pct < 0 || c.tolerance_pct > 50)) {
      errors.push(`${tag}: tolerance_pct mimo rozsah 0–50`);
    }
    if (c.as_of != null && (!Number.isInteger(c.as_of) || c.as_of < 1900 || c.as_of > 2100)) {
      errors.push(`${tag}: as_of není smysluplný rok`);
    }
  }

  if (errors.length) {
    console.error(`FAIL: ${errors.length} validation error(s):`);
    errors.forEach(e => console.error('  -', e));
    process.exit(1);
  }
  const auto = data.claims.filter(c => c.check === 'auto').length;
  console.log(`OK: validated ${data.claims.length} claims (${auto} auto-checked).`);
}

validate();
