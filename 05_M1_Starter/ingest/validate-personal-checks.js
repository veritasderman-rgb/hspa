// Validátor data/personal-checks.json — kontrakt pro Osobní zdravotní kompas.
// Spouští se v npm run validate:all. Kontroluje schema, zdroje a integritu
// odkazů na regions.json (region_dataset) a indicators.json (related_indicator).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const VALID_CATEGORY = new Set(['prohlidka', 'screening', 'ockovani']);
const VALID_SEX = new Set(['all', 'female', 'male']);
const VALID_RISK = new Set([null, 'smoking']);

export function validatePersonalChecks() {
  const errors = [];
  const doc = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'personal-checks.json'), 'utf8'));
  const regions = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'regions.json'), 'utf8'));
  const indicators = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'indicators.json'), 'utf8'));
  const datasetIds = new Set((regions.datasets || []).map(d => d.id));
  const indIds = new Set(indicators.indicators.map(i => i.id));

  if (!Array.isArray(doc.checks) || doc.checks.length === 0) {
    errors.push('personal-checks.json: chybí neprázdné pole "checks"');
    return report(errors);
  }

  const seen = new Set();
  for (const c of doc.checks) {
    const tag = `check ${c.id ?? '?'}`;
    if (!c.id) errors.push(`${tag}: chybí id`);
    if (c.id && seen.has(c.id)) errors.push(`${tag}: duplicitní id`);
    if (c.id) seen.add(c.id);
    if (!c.label) errors.push(`${tag}: chybí label`);
    if (!VALID_CATEGORY.has(c.category)) errors.push(`${tag}: category musí být prohlidka|screening|ockovani (má '${c.category}')`);
    if (!VALID_SEX.has(c.sex)) errors.push(`${tag}: sex musí být all|female|male (má '${c.sex}')`);

    if (!Number.isFinite(c.age_min)) errors.push(`${tag}: age_min musí být číslo`);
    if (c.age_max !== null && !Number.isFinite(c.age_max)) errors.push(`${tag}: age_max musí být null nebo číslo`);
    if (Number.isFinite(c.age_min) && Number.isFinite(c.age_max) && c.age_max != null && c.age_max < c.age_min) {
      errors.push(`${tag}: age_max < age_min`);
    }

    const risk = c.requires_risk ?? null;
    if (!VALID_RISK.has(risk)) errors.push(`${tag}: requires_risk musí být null nebo "smoking" (má '${c.requires_risk}')`);

    if (!c.interval) errors.push(`${tag}: chybí interval`);
    if (!c.recommendation) errors.push(`${tag}: chybí recommendation`);
    if (!c.source || !c.source.name) errors.push(`${tag}: chybí source.name (každý check musí být doložen)`);

    if (c.region_dataset && !datasetIds.has(c.region_dataset)) {
      errors.push(`${tag}: region_dataset '${c.region_dataset}' neexistuje v regions.json`);
    }
    if (c.related_indicator && !indIds.has(c.related_indicator)) {
      errors.push(`${tag}: related_indicator '${c.related_indicator}' neexistuje v indicators.json`);
    }
    if (c.related_articles && !Array.isArray(c.related_articles)) {
      errors.push(`${tag}: related_articles musí být pole`);
    }
  }
  return report(errors);
}

function report(errors) {
  if (errors.length) {
    console.error(`FAIL: personal-checks.json — ${errors.length} chyb:`);
    errors.forEach(e => console.error('  - ' + e));
    return false;
  }
  console.log('OK: validated personal-checks.json — checky, zdroje i odkazy v pořádku.');
  return true;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exit(validatePersonalChecks() ? 0 : 1);
}
